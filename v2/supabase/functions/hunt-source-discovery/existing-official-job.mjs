// Only reuse a published, already verified company vacancy with the exact
// official detail URL. Unknown employer posting dates remain explicitly unknown;
// first_seen_at is only an observation-date fallback, never a fake datePosted.
export function eligibleAlreadyVerifiedJob(job,candidateUrl,nowMs=Date.now()) {
 if(!job||job.state!=="active_verified"||job.primary_apply_url!==candidateUrl)return false;
 const verified=Date.parse(job.last_verified_at||"");
 const posted=Date.parse(job.published_at||job.first_seen_at||"");
 if(!Number.isFinite(verified)||verified<nowMs-7*86400000||verified>nowMs+86400000)return false;
 if(!Number.isFinite(posted)||posted<nowMs-20*86400000||posted>nowMs+86400000)return false;
 if(String(job.description||"").trim().length<250)return false;
 return true;
}
export function postedWithinTwentyDays(raw,nowMs=Date.now()){
 const posted=Date.parse(String(raw||""));
 return Number.isFinite(posted)&&posted<=nowMs&&posted>=nowMs-20*86400000;
}
