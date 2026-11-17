
import { createClient } from "npm:@supabase/supabase-js@2";
import { shouldTransitionFromConfirmedRemoval } from "./monitor-policy.mjs";

type Job = {
  id: string;
  canonical_title: string;
  requisition_id: string | null;
  primary_apply_url: string | null;
  vacancy_confidence: number | null;
  state: string;
  published_at: string | null;
  last_verified_at: string | null;
};

const encoder = new TextEncoder();

async function sha256Hex(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function extractDatePosted(html: string) {
  const match = html.match(/["']datePosted["']\s*:\s*["']([^"']+)["']/i);
  if (!match) return null;
  const date = new Date(match[1]);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function titleTokens(title: string) {
  const stop = new Set(["intern", "internship", "assistant", "the", "and", "for", "with"]);
  return title.toLowerCase()
    .replace(/[^a-z0-9à-ž]+/gi, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !stop.has(token));
}

function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  let key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      key = parsed.default || Object.values(parsed)[0] || key;
    } catch {}
  }
  if (!url || !key) throw new Error("Missing Supabase admin environment");
  return createClient(url, String(key), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

Deno.serve(async (req: Request) => {
  const admin = getAdminClient();

  const supplied = req.headers.get("x-hunt-cron") || "";
  const { data: secretRow, error: secretError } = await admin
    .from("internal_runtime_secrets")
    .select("secret_hash")
    .eq("name", "hunt_cron_token")
    .single();

  if (secretError || !secretRow) {
    return new Response(JSON.stringify({ error: "runtime secret unavailable" }), { status: 500 });
  }

  const suppliedHash = await sha256Hex(supplied);
  if (!supplied || !safeEqual(suppliedHash, secretRow.secret_hash)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const { data: jobs, error: jobsError } = await admin
    .from("jobs")
    .select("id,canonical_title,requisition_id,primary_apply_url,vacancy_confidence,state,published_at,last_verified_at")
    .in("state", ["active_verified", "active_likely", "stale_possible"])
    .not("primary_apply_url", "is", null)
    .order("last_verified_at", { ascending: true, nullsFirst: true })
    .limit(50);

  if (jobsError) {
    return new Response(JSON.stringify({ error: jobsError.message }), { status: 500 });
  }

  const summary = { checked: 0, verified: 0, misses: 0, degraded: 0, stale: 0 };

  for (const job of (jobs || []) as Job[]) {
    summary.checked += 1;

    const { data: links } = await admin
      .from("job_sources")
      .select("id,source_id,active")
      .eq("job_id", job.id)
      .order("last_verified_at", { ascending: false, nullsFirst: false })
      .limit(1);

    const link = links?.[0] || null;
    let source: any = null;
    if (link?.source_id) {
      const { data } = await admin
        .from("sources")
        .select("id,official")
        .eq("id", link.source_id)
        .single();
      source = data;
    }

    const observedAt = new Date().toISOString();
    let status: number | null = null;

    try {
      const response = await fetch(job.primary_apply_url!, {
        redirect: "follow",
        signal: AbortSignal.timeout(9000),
        headers: {
          "user-agent": "Mozilla/5.0 HUNT Vacancy Monitor/1.0",
          "accept": "text/html,application/xhtml+xml,application/json",
        },
      });

      status = response.status;
      // Job-level reachability must NEVER change health of an entire ATS source.
      // Only the dedicated source / ATS scanners own sources.health_status.
      const rawBody = response.ok ? await response.text() : "";
      const body = rawBody.toLowerCase();
      const pageDatePosted = rawBody ? extractDatePosted(rawBody) : null;
      const tokens = titleTokens(job.canonical_title);
      const matchedTokens = tokens.filter((token) => body.includes(token)).length;
      const tokenThreshold = Math.min(2, Math.max(1, tokens.length));
      const reqMatch = Boolean(job.requisition_id && body.includes(job.requisition_id.toLowerCase()));
      const listingPresent = response.ok && (reqMatch || matchedTokens >= tokenThreshold);

      await admin.from("job_observations").insert({
        job_id: job.id,
        job_source_id: link?.id || null,
        observed_at: observedAt,
        listing_present: listingPresent,
        apply_works: response.ok,
        http_status: response.status,
        title: job.canonical_title,
        raw: {
          monitor: "hunt-vacancy-monitor-v1",
          final_url: response.url,
          matched_title_tokens: matchedTokens,
          token_threshold: tokenThreshold,
          requisition_match: reqMatch,
        },
      });

      if (listingPresent) {
        const official = Boolean(source?.official);
        const floor = official ? 95 : 78;

        const originalPublished = job.published_at ? new Date(job.published_at) : null;
        const observedPublished = pageDatePosted ? new Date(pageDatePosted) : null;
        const newerByDays = originalPublished && observedPublished
          ? Math.floor((observedPublished.getTime() - originalPublished.getTime()) / 86400000)
          : 0;

        if (newerByDays >= 3) {
          const { data: recentRepost } = await admin
            .from("repost_events")
            .select("id")
            .eq("job_id", job.id)
            .gte("detected_at", new Date(Date.now() - 7 * 86400000).toISOString())
            .limit(1)
            .maybeSingle();

          if (!recentRepost) {
            await admin.from("repost_events").insert({
              job_id: job.id,
              prior_job_source_id: link?.id || null,
              new_job_source_id: link?.id || null,
              requisition_id_changed: false,
              reason: "Same vacancy now exposes a newer datePosted; treated as repost, not a new job.",
              evidence: {
                original_published_at: job.published_at,
                observed_date_posted: pageDatePosted,
                days_after_original: newerByDays,
                url: job.primary_apply_url,
              },
            });
          }
        }

        if (job.state === "stale_possible") {
          const { data: recentReturn } = await admin
            .from("repost_events")
            .select("id")
            .eq("job_id", job.id)
            .gte("detected_at", new Date(Date.now() - 7 * 86400000).toISOString())
            .limit(1)
            .maybeSingle();

          if (!recentReturn) {
            await admin.from("repost_events").insert({
              job_id: job.id,
              prior_job_source_id: link?.id || null,
              new_job_source_id: link?.id || null,
              requisition_id_changed: false,
              reason: "Vacancy became visible again after a stale period.",
              evidence: {
                original_published_at: job.published_at,
                observed_date_posted: pageDatePosted,
                url: job.primary_apply_url,
              },
            });
          }
        }
        await admin.from("jobs").update({
          state: official ? "active_verified" : "active_likely",
          vacancy_confidence: Math.max(job.vacancy_confidence || 0, floor),
          confidence_label: official ? "VERIFIED ACTIVE" : "LIKELY ACTIVE",
          last_seen_at: observedAt,
          last_verified_at: observedAt,
          updated_at: observedAt,
        }).eq("id", job.id);

        if (link?.id) {
          await admin.from("job_sources").update({
            active: true,
            last_seen_at: observedAt,
            last_verified_at: observedAt,
          }).eq("id", link.id);
        }

        summary.verified += 1;
      } else {
        summary.misses += 1;

        // SPA/login/CAPTCHA/temporary HTML can omit title text while a vacancy
        // remains live. Only repeated explicit 404/410 responses justify staleness.
        const { data: priorMissing, error: missError } = await admin
          .from("job_observations")
          .select("observed_at,http_status")
          .eq("job_id", job.id)
          .in("http_status", [404, 410])
          .lt("observed_at", observedAt)
          .order("observed_at", { ascending: false })
          .limit(1);
        if (missError) { summary.degraded += 1; continue; }
        if (shouldTransitionFromConfirmedRemoval({
          status: response.status, priorMissingAt: priorMissing?.[0]?.observed_at,
          observedAt, previousState: job.state
        })) {
          await admin.from("jobs").update({
            state: "stale_possible",
            vacancy_confidence: Math.max((job.vacancy_confidence || 50) - 15, 25),
            confidence_label: "STALE / NEEDS RECHECK",
            updated_at: observedAt,
          }).eq("id", job.id);
          summary.stale += 1;
        }
      }
    } catch (error) {
      summary.degraded += 1;
      await admin.from("job_observations").insert({
        job_id: job.id,
        job_source_id: link?.id || null,
        observed_at: observedAt,
        listing_present: null,
        apply_works: null,
        http_status: status,
        title: job.canonical_title,
        raw: {
          monitor: "hunt-vacancy-monitor-v1",
          error: error instanceof Error ? error.message : String(error),
          preserved_state: true,
        },
      });

    }
  }

  return new Response(JSON.stringify({ ok: true, ...summary }), {
    headers: { "content-type": "application/json" },
  });
});
