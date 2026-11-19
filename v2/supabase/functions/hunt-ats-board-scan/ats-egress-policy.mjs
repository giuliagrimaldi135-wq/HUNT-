// Keep fast discovery of brand-new ATS postings without rewriting stable
// already-verified records on each five-minute catalog scan.
export const RECHECK_AFTER_MS = 6*60*60*1000; // daily repeated updates reduced ~72x
export function needsATSVerification(link,nowMs=Date.now(),maxAgeMs=RECHECK_AFTER_MS){
 if(!link||link.active===false||!link.job_id)return true;
 const verified=Date.parse(String(link.last_verified_at||""));
 if(!Number.isFinite(verified)||verified>nowMs+60000)return true;
 return nowMs-verified>=maxAgeMs;
}
export function selectATSCatalogSlice(entries=[],cursor=0,pageSize=20,priorityCount=4){
 if(!Array.isArray(entries)||!entries.length)return {selected:[],nextCursor:0,wrapped:true};
 const page=Math.max(1,Math.min(50,Number(pageSize)||20));
 const head=Math.max(0,Math.min(page-1,Number(priorityCount)||4,entries.length));
 const rotation=Math.min(page-head,entries.length);
 const start=Math.max(0,Math.floor(Number(cursor)||0))%entries.length;
 const selected=[],seen=new Set();
 for(const item of entries.slice(0,head)){const key=String(item?.url||item?.id||"");if(key&&!seen.has(key)){selected.push(item);seen.add(key)}}
 for(let i=0;i<rotation;i++){
  const item=entries[(start+i)%entries.length],key=String(item?.url||item?.id||"");
  if(key&&!seen.has(key)){selected.push(item);seen.add(key)}
 }
 const wrapped=start+rotation>=entries.length;
 return {selected,nextCursor:wrapped?0:start+rotation,wrapped};
}
