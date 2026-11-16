// Retry failing ATS endpoints more slowly, without postponing healthy boards.
export function atsBackoffMinutes(failures){
 const n=Math.max(0,Number(failures)||0);
 if(n>=10)return 180;
 if(n>=6)return 60;
 if(n>=3)return 15;
 return 0;
}
export function shouldProbeATS(source,nowMs=Date.now()){
 const delay=atsBackoffMinutes(source?.consecutive_failures);
 if(delay===0)return true;
 const last=Date.parse(String(source?.last_scan_at||""));
 return !Number.isFinite(last)||nowMs-last>=delay*60000;
}
export function atsScanStatus(fetched,accepted,requestFailed=false){
 if(requestFailed)return "degraded";
 if(fetched===0)return "reachable_no_listings";
 if(accepted===0)return "degraded";
 return "healthy";
}
