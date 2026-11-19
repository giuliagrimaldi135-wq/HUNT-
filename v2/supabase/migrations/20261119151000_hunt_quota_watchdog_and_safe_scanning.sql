-- HUNT quota circuit breaker: Supabase's Free API returned HTTP 402 while
-- pg_cron continued to report success because it only queued HTTP requests.
-- Keep DB-only audits / stale recommendation cleanup active. Network scanners
-- automatically pause on 402 and can resume after TWO successful 30-min probes.
CREATE SCHEMA IF NOT EXISTS hunt_ops;
REVOKE ALL ON SCHEMA hunt_ops FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS hunt_ops.quota_control (
  singleton smallint PRIMARY KEY DEFAULT 1 CHECK(singleton=1),
  suspended boolean NOT NULL DEFAULT true,
  last_probe_id bigint,
  processed_probe_id bigint,
  last_http_status int,
  consecutive_successes int NOT NULL DEFAULT 0,
  checked_at timestamptz,
  suspended_at timestamptz DEFAULT now(),
  resumed_at timestamptz
);
REVOKE ALL ON hunt_ops.quota_control FROM PUBLIC, anon, authenticated;
INSERT INTO hunt_ops.quota_control(singleton,suspended,suspended_at)
VALUES(1,true,now()) ON CONFLICT(singleton) DO NOTHING;

CREATE OR REPLACE FUNCTION hunt_ops.quota_watchdog()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public, hunt_ops, cron, net
AS $fn$
DECLARE
 st hunt_ops.quota_control%ROWTYPE;
 http_status integer;
 recent_402 boolean;
 task record;
 next_schedule text;
 new_probe bigint;
BEGIN
 SELECT * INTO st FROM hunt_ops.quota_control WHERE singleton=1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'HUNT quota state missing'; END IF;

 -- Only a response to our *own* probe can re-enable scans.
 IF st.last_probe_id IS NOT NULL
   AND st.last_probe_id IS DISTINCT FROM st.processed_probe_id THEN
   SELECT status_code INTO http_status
   FROM net._http_response WHERE id=st.last_probe_id;
   IF FOUND THEN
     st.processed_probe_id := st.last_probe_id;
     st.last_http_status := http_status;
     IF http_status BETWEEN 200 AND 299 THEN
       st.consecutive_successes := LEAST(st.consecutive_successes+1,3);
     ELSE
       st.consecutive_successes := 0;
     END IF;
   END IF;
 END IF;

 -- A 402 observed from any previous network cron call is stronger evidence
 -- of ongoing quota restriction than an isolated health endpoint response.
 SELECT EXISTS(
    SELECT 1 FROM net._http_response
    WHERE created>now()-interval '40 minutes' AND status_code=402
 ) INTO recent_402;

 IF recent_402 THEN
   st.consecutive_successes:=0;
   IF NOT st.suspended THEN
     FOR task IN
       SELECT jobid FROM cron.job
       WHERE jobname LIKE 'hunt-%'
         AND command LIKE '%functions/v1/%' AND active=true
     LOOP
       PERFORM cron.alter_job(job_id:=task.jobid,active:=false);
     END LOOP;
     st.suspended:=true;
     st.suspended_at:=now();
   END IF;
 ELSIF st.suspended AND st.consecutive_successes>=2 THEN
   -- Reduced, staggered scan cadence: official ATS every five minutes,
   -- broad discovery and news less frequently, hourly CV matching.
   FOR task IN
     SELECT jobid,jobname FROM cron.job
     WHERE jobname LIKE 'hunt-%' AND command LIKE '%functions/v1/%'
   LOOP
     next_schedule:=CASE task.jobname
          WHEN 'hunt-ats-board-scan-5m' THEN '0,5,10,15,20,25,30,35,40,45,50,55 * * * *'
          WHEN 'hunt-ats-discovery-15m' THEN '11,41 * * * *'
          WHEN 'hunt-brand-website-repair-30m' THEN '36 */2 * * *'
          WHEN 'hunt-company-intelligence-5m' THEN '14 * * * *'
          WHEN 'hunt-description-repair-30m' THEN '35 * * * *'
          WHEN 'hunt-fashion-brand-discovery-30m' THEN '38 */2 * * *'
          WHEN 'hunt-global-news-5m' THEN '12,42 * * * *'
          WHEN 'hunt-intelligence-source-discovery-15m' THEN '25 */2 * * *'
          WHEN 'hunt-match-refresh-5m' THEN '43 * * * *'
          WHEN 'hunt-news-source-sync-5m' THEN '22 * * * *'
          WHEN 'hunt-source-discovery-5m' THEN '6,26,46 * * * *'
          WHEN 'hunt-successfactors-public-10m' THEN '4,19,34,49 * * * *'
          WHEN 'hunt-vacancy-monitor-10m' THEN '17,47 * * * *'
          ELSE NULL
        END;
     -- Do not silently turn on newly created unreviewed automations.
     IF next_schedule IS NOT NULL THEN
       PERFORM cron.alter_job(
         job_id:=task.jobid,schedule:=next_schedule,active:=true
       );
     END IF;
   END LOOP;
   st.suspended:=false;
   st.resumed_at:=now();
 END IF;

 -- Public Supabase JWKS endpoint: no user data, API secret or login required.
 -- Under the observed exceed_egress_quota condition it returns 402, not 200.
 new_probe:=net.http_get(
   url:='https://dfiokxjfgqoboxckcuut.supabase.co/auth/v1/.well-known/jwks.json',
   timeout_milliseconds:=8000
 );
 st.last_probe_id:=new_probe;
 st.checked_at:=now();
 UPDATE hunt_ops.quota_control SET
   suspended=st.suspended,
   last_probe_id=st.last_probe_id,
   processed_probe_id=st.processed_probe_id,
   last_http_status=st.last_http_status,
   consecutive_successes=st.consecutive_successes,
   checked_at=st.checked_at,
   suspended_at=st.suspended_at,
   resumed_at=st.resumed_at
 WHERE singleton=1;
END;
$fn$;
REVOKE ALL ON FUNCTION hunt_ops.quota_watchdog() FROM PUBLIC,anon,authenticated;

-- Immediately stop the 13 repeatedly blocked background network jobs.
DO $stop$
DECLARE task record;
BEGIN
 FOR task IN SELECT jobid FROM cron.job
   WHERE jobname LIKE 'hunt-%' AND command LIKE '%functions/v1/%'
 LOOP PERFORM cron.alter_job(job_id:=task.jobid,active:=false); END LOOP;
END $stop$;

-- Health check 2x/hour; both probe and recovery are fully autonomous.
SELECT cron.schedule('hunt-quota-watchdog-30m',
  '9,39 * * * *',
  'SELECT hunt_ops.quota_watchdog();');
