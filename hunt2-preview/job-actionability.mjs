// Use the ORIGINAL publication date (or first discovery if unknown).
// A fresh verification is evidence that a job is still available, not a new posting.
export function isActionablePreviewJob(job,cutoffMs,nowMs=Date.now()){
 if(!job||!["active_verified","active_likely"].includes(job.state))return false;
 const posted=Date.parse(job.published_at||job.first_seen_at||"");
 const verified=Date.parse(job.last_verified_at||"");
 if(!Number.isFinite(posted)||posted<cutoffMs||posted>nowMs+86400000)return false;
 if(!Number.isFinite(verified)||verified<nowMs-7*86400000||verified>nowMs+86400000)return false;
 if(job.metadata?.quality_quarantine)return false;
 const title=String(job.canonical_title||"");
 if(/^\s*TEMPLATE STORE\b/i.test(title)||/\[INSERIRE\b/i.test(title))return false;
 return true;
}
