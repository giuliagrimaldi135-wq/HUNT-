// Global fashion RSS scans must respect upstream throttling. HTTP 429 is a
// request to slow down, not evidence that cached news became invalid.
export function newsRetryDelayMinutes(source) {
 const failures=Math.max(0,Number(source?.consecutive_failures)||0);
 const throttle=/\b(?:HTTP\s*429|rate.limit|too many requests)\b/i.test(String(source?.last_error||""));
 if(throttle)return failures>=4?720:failures>=2?360:180;
 if(failures>=10)return 1440;
 if(failures>=6)return 360;
 if(failures>=3)return 90;
 return 0;
}
export function shouldScanNewsSource(source,nowMs=Date.now()){
 const delay=newsRetryDelayMinutes(source);
 if(!delay)return true;
 const last=Date.parse(String(source?.last_scan_at||""));
 return !Number.isFinite(last)||nowMs-last>=delay*60000;
}
export function chooseDueNewsSources(sources,max=12,nowMs=Date.now()){
 const eligible=(sources||[]).filter(x=>shouldScanNewsSource(x,nowMs));
 return {due:eligible.slice(0,max),
  backoffSkipped:(sources||[]).length-eligible.length};
}
