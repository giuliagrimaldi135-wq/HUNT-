// Bounded, automatic recovery: don't hammer a broken source every few minutes.
export function sourceRetryDelayMinutes(failures){
 const n=Math.max(0,Number(failures)||0);
 if(n>=10)return 180;
 if(n>=6)return 60;
 if(n>=3)return 15;
 return 0;
}
export function shouldScanSource(source, nowMs=Date.now()){
 const delay=sourceRetryDelayMinutes(source?.consecutive_failures);
 if(!delay)return true;
 const last=Date.parse(source?.last_scan_at||"");
 return !Number.isFinite(last)||nowMs-last>=delay*60000;
}
