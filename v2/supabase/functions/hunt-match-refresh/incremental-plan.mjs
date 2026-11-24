// Incremental CV/job matching plan (egress protection without losing precision).
//
// The hourly matcher used to download the full description and metadata of
// every fresh vacancy on every run. This module decides, from light columns and
// a database-side description digest, which vacancies really need a new
// evaluation. Anything uncertain falls back to a FULL evaluation.
//
// A vacancy is re-evaluated when:
//  - it is new to the actionable set (new, re-verified, back to active);
//  - its description digest, title, family, seniority, location, remote mode,
//    requisition/apply URL or stored hard requirements changed;
//  - the stored recommendations differ from what the last evaluation produced
//    (for example a row was removed by the SQL cleanup and the job came back).
// Every user and every vacancy is evaluated again (FULL mode) when:
//  - any CV, CV parsed profile, preference, personalization or seniority changed;
//  - a user was added or removed;
//  - the matching engine version changed;
//  - no valid state exists, the digest RPC is unavailable, or the last full
//    evaluation is older than FULL_REFRESH_MS (a daily safety net).
// Time-dependent priority (posting age, vacancy confidence) is recomputed for
// every stored recommendation on every run without reading descriptions.

import {vacancyIdentity,strongOfficialBoardIdentity,officialKeringLocaleIdentity,isFreshActionable} from "./recommendation-guard.mjs";

export const STATE_FORMAT=1;
export const FULL_REFRESH_MS=24*3600000;
const DAY=86400000;

// Same formula previously inline in index.ts. Kept here so the cheap
// priority-only refresh and the full evaluation can never diverge.
export function priorityScore(score,vacancyConfidence,publishedAt,nowMs=Date.now()){
  const age=Math.max(0,Math.floor((nowMs-new Date(publishedAt).getTime())/DAY));
  const fresh=Math.max(20,100-age*4);
  return Math.min(100,Math.round(score*.7+(vacancyConfidence||70)*.2+fresh*.1));
}

// Deterministic JSON: object keys sorted, so equal content gives equal hashes.
export function stableStringify(value){
  if(value===undefined)return "null";
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return "["+value.map(stableStringify).join(",")+"]";
  return "{"+Object.keys(value).sort().filter(k=>value[k]!==undefined)
    .map(k=>JSON.stringify(k)+":"+stableStringify(value[k])).join(",")+"}";
}

export async function shortHash(text){
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(text)));
  return [...new Uint8Array(bytes)].slice(0,10).map(x=>x.toString(16).padStart(2,"0")).join("");
}

// Columns needed for freshness, deduplication, priority and fingerprints.
// No description and only two small metadata keys.
export const LIGHT_JOB_COLUMNS=[
  "id","company_id","requisition_id","primary_apply_url","canonical_title","role_family",
  "seniority","employment_type","city","remote_mode","published_at","first_seen_at",
  "last_verified_at","vacancy_confidence","state",
  "provider_creation_at:metadata->>provider_creation_at",
  "hard_requirements:metadata->hard_requirements"
].join(",");
export const FULL_JOB_COLUMNS="id,company_id,requisition_id,primary_apply_url,canonical_title,role_family,seniority,employment_type,city,remote_mode,description,published_at,first_seen_at,last_verified_at,vacancy_confidence,state,metadata";

// Shape a light row like a full row for the existing guards. `metadata` here
// is a PARTIAL view and must never be written back to the database.
export function lightJob(row){
  const metadata={};
  if(row.provider_creation_at!==null&&row.provider_creation_at!==undefined)metadata.provider_creation_at=row.provider_creation_at;
  if(row.hard_requirements!==null&&row.hard_requirements!==undefined)metadata.hard_requirements=row.hard_requirements;
  const {provider_creation_at,hard_requirements,...rest}=row;
  return {...rest,metadata,__light:true};
}

// Everything (except time and volatile verification timestamps) that the
// evaluation of one vacancy depends on.
export async function jobFingerprint(job,descriptionMd5){
  const hr=job.metadata?.hard_requirements||null;
  return shortHash(stableStringify({
    d:descriptionMd5||"",t:job.canonical_title||"",f:job.role_family||null,s:job.seniority||null,
    c:job.city||null,r:job.remote_mode||null,e:job.employment_type||null,co:job.company_id||null,
    q:job.requisition_id||null,u:job.primary_apply_url||null,
    hr:hr?{v:hr.analyzer_version||null,y:hr.min_years_experience??null,l:hr.required_languages||[],s:hr.specialist_signals||[]}:null
  }));
}

// Everything the evaluation reads about one user.
export async function userFingerprint(input){
  const cvs=[...(input.cvs||[])].sort((a,b)=>String(a.id||a.updated_at||"").localeCompare(String(b.id||b.updated_at||"")));
  return shortHash(stableStringify({
    pref:input.pref||null,seniority:input.profile?.seniority??null,
    interests:input.personal?.interest_areas||null,avoid:input.personal?.avoid_role_traits||null,
    cvs:cvs.map(cv=>({id:cv.id||null,p:cv.parsed_profile||null,d:!!cv.is_default,a:cv.active!==false,t:cv.target_role_families||null,u:cv.updated_at||null}))
  }));
}

// Jobs that share any deduplication identity with another fresh job. Only
// these need their description to choose the canonical record exactly as before.
export function duplicateCandidateIds(rows,cutoffMs,nowMs=Date.now()){
  const groups=new Map();
  const add=(key,id)=>{if(!key)return;const k=String(key);if(!groups.has(k))groups.set(k,new Set());groups.get(k).add(id)};
  for(const job of rows){
    if(!isFreshActionable(job,cutoffMs,nowMs))continue;
    add("v:"+vacancyIdentity(job),job.id);
    const board=strongOfficialBoardIdentity(job);
    if(board)add("s:"+board,job.id);
    const kering=officialKeringLocaleIdentity(job);
    if(kering)add("k:"+kering,job.id);
  }
  const out=new Set();
  for(const ids of groups.values())if(ids.size>1)for(const id of ids)out.add(id);
  return out;
}

export function validState(state,engineVersion){
  return Boolean(state&&typeof state==="object"&&state.format===STATE_FORMAT&&
    state.engine===engineVersion&&state.jobs&&typeof state.jobs==="object"&&
    state.users&&typeof state.users==="object"&&Array.isArray(state.matches)&&
    Number.isFinite(Date.parse(state.full_at||"")));
}

function sameUsers(a,b){
  const ka=Object.keys(a||{}),kb=Object.keys(b||{});
  return ka.length===kb.length&&ka.every(k=>b[k]===a[k]);
}

// Decide FULL vs INCREMENTAL and which vacancy ids to evaluate.
export function planEvaluation({state,engineVersion,nowMs=Date.now(),uniqueJobIds,jobFps,userFps,storedMatchKeys,digestsAvailable,forceFull=false,fullRefreshMs=FULL_REFRESH_MS}){
  const all=new Set(uniqueJobIds.map(String));
  const full=(reason)=>({mode:"full",reason,evaluate:all,reasons:null});
  if(forceFull)return full("requested");
  if(!digestsAvailable)return full("digest_unavailable");
  if(!validState(state,engineVersion))return full("no_valid_state");
  if(nowMs-Date.parse(state.full_at)>=fullRefreshMs)return full("daily_safety_refresh");
  if(!sameUsers(state.users,userFps))return full("user_inputs_changed");
  const expected=new Map();
  for(const key of state.matches){const job=String(key).split("|")[1];if(!expected.has(job))expected.set(job,new Set());expected.get(job).add(String(key))}
  const actual=new Map();
  for(const key of storedMatchKeys){const job=String(key).split("|")[1];if(!actual.has(job))actual.set(job,new Set());actual.get(job).add(String(key))}
  const evaluate=new Set();
  const reasons={new_or_returning:0,content_changed:0,recommendations_diverged:0};
  for(const id of all){
    if(!(id in state.jobs)){evaluate.add(id);reasons.new_or_returning++;continue}
    if(state.jobs[id]!==jobFps.get(id)){evaluate.add(id);reasons.content_changed++;continue}
    const e=expected.get(id)||new Set(),a=actual.get(id)||new Set();
    if(e.size!==a.size||[...e].some(k=>!a.has(k))){evaluate.add(id);reasons.recommendations_diverged++}
  }
  return {mode:"incremental",reason:"unchanged_users",evaluate,reasons};
}

// State persisted after a fully successful run. Jobs that left the actionable
// set are dropped, so a returning vacancy is always evaluated again.
// Skip the whole run only when the database-side digest of ALL matcher inputs
// equals the digest stored at the start of the last successful run, and the
// daily full evaluation is not due. The stored token is the one read BEFORE
// that run's reads, so our own writes cause one more (cheap) pass, never a miss.
export function canSkipRun({state,engineVersion,token,nowMs=Date.now(),forceFull=false,fullRefreshMs=FULL_REFRESH_MS}){
  if(forceFull||!token||!validState(state,engineVersion))return false;
  if(typeof state.token!=="string"||state.token!==token)return false;
  return nowMs-Date.parse(state.full_at)<fullRefreshMs;
}

export function nextState({previous,mode,engineVersion,nowMs=Date.now(),uniqueJobIds,jobFps,userFps,evaluated,matchedKeys,token}){
  const keep=validState(previous,engineVersion)&&mode!=="full";
  const jobs={},matches=new Set();
  for(const id of uniqueJobIds.map(String)){
    if(evaluated.has(id)||!keep)jobs[id]=jobFps.get(id);
    else jobs[id]=previous.jobs[id];
  }
  if(keep)for(const key of previous.matches){const job=String(key).split("|")[1];if(job in jobs&&!evaluated.has(job))matches.add(String(key))}
  for(const key of matchedKeys)if(String(key).split("|")[1] in jobs)matches.add(String(key));
  return {
    format:STATE_FORMAT,engine:engineVersion,
    full_at:mode==="full"?new Date(nowMs).toISOString():previous.full_at,
    updated_at:new Date(nowMs).toISOString(),token:token??null,
    users:{...userFps},jobs,matches:[...matches].sort()
  };
}
