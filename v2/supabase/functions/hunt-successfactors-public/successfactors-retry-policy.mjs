// Respect transient HTTP 503, 429 and timeouts on the employer's
// SuccessFactors site. A previously collected vacancy stays in the database
// while the scanner waits for its next permitted attempt.
export function successFactorsCooldownMinutes(failureCount){
 const n=Math.max(0,Number(failureCount)||0);
 if(n>=10)return 360;
 if(n>=5)return 180;
 if(n>=3)return 90;
 if(n===2)return 45;
 if(n===1)return 20;
 return 0;
}
export function shouldProbeSuccessFactors(source,nowMs=Date.now()){
 const cooldown=successFactorsCooldownMinutes(source?.consecutive_failures);
 if(!cooldown)return true;
 const checked=Date.parse(String(source?.last_scan_at||""));
 return !Number.isFinite(checked)||nowMs-checked>=cooldown*60000;
}
