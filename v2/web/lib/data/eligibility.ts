export type FeedVacancy = {
 state?: string|null;
 published_at?: string|null;
 first_seen_at?: string|null;
 last_verified_at?: string|null;
 description?: string|null;
 metadata?: Record<string, unknown>|null;
 canonical_title?: string|null;
};
export function isEligibleFeedVacancy(job: FeedVacancy|null|undefined, nowMs=Date.now()): boolean {
 if(!job||!["active_verified","active_likely"].includes(job.state||""))return false;
 const cutoff=nowMs-20*86400000;
 const posted=Date.parse(job.published_at||job.first_seen_at||"");
 const verified=Date.parse(job.last_verified_at||"");
 if(!Number.isFinite(posted)||posted<cutoff||posted>nowMs+86400000)return false;
 if(!Number.isFinite(verified)||verified<nowMs-7*86400000||verified>nowMs+86400000)return false;
 if(typeof job.description!=="string"||job.description.trim().length<250)return false;
 const created=job.metadata?.provider_creation_at;
 if(created){
   const original=Date.parse(String(created));
   if(!Number.isFinite(original)||original<cutoff||original>nowMs+86400000)return false;
 }
 if(job.metadata?.quality_quarantine)return false;
 const title=job.canonical_title||"";
 if(/^\s*TEMPLATE STORE\b|\[(?:INSERIRE|INSERT)\b|\{\{[^}]+\}\}/i.test(title))return false;
 return true;
}
