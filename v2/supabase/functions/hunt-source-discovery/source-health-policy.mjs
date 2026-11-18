// Bounded, automatic recovery: don't hammer a broken source every few minutes.
export function sourceRetryDelayMinutes(failures){
 const n=Math.max(0,Number(failures)||0);
 if(n>=10)return 1440;
 if(n>=6)return 360;
 if(n>=3)return 90;
 return 0;
}
export function shouldScanSource(source, nowMs=Date.now()){
 const delay=sourceRetryDelayMinutes(source?.consecutive_failures);
 if(!delay)return true;
 const last=Date.parse(source?.last_scan_at||"");
 return !Number.isFinite(last)||nowMs-last>=delay*60000;
}

/**
 * One career host can expose many category pages or brands. Spread a scan
 * across independent hosts rather than repeatedly probing one failing portal.
 * A skipped host stays eligible next invocation; nothing is disabled/deleted.
 */
export function chooseCareerScanBatch(sources,max=18,perHost=2,nowMs=Date.now()){
 const dueSources=[],domainCounts=new Map();
 let backoffSkipped=0,domainDeferred=0;
 for(const source of sources||[]){
  if(!shouldScanSource(source,nowMs)){backoffSkipped++;continue;}
  let host;
  try{host=new URL(String(source.base_url)).hostname.toLowerCase().replace(/^www\./,"")}
  catch{host="invalid:"+String(source.id||"unknown")}
  const count=domainCounts.get(host)||0;
  if(count>=perHost){domainDeferred++;continue;}
  if(dueSources.length>=max)break;
  domainCounts.set(host,count+1);
  dueSources.push(source);
 }
 return {dueSources,backoffSkipped,domainDeferred};
}
