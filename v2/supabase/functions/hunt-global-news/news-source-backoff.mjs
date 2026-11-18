// Conservative retry policy: preserve source records and cached articles.
// A persistently invalid RSS URL is probed weekly rather than daily.
export function newsRetryDelayMinutes(source) {
 const failures=Math.max(0,Number(source?.consecutive_failures)||0);
 const error=String(source?.last_error||"");
 const throttle=/\b(?:HTTP\s*429|rate.limit|too many requests)\b/i.test(error);
 if(throttle)return failures>=10?1440:failures>=4?720:failures>=2?360:180;
 const persistent=/\bHTTP\s*(?:403|404|410)\b|No RSS or Atom document/i.test(error);
 if(persistent&&failures>=10)return 10080; // once a week; self-heals if URL recovers
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
function sourceHost(source){
 try{return new URL(String(source?.feed_url||"")).hostname.toLowerCase().replace(/^www\./,"")||"unknown"}catch{return "unknown"}
}
export function chooseDueNewsSources(sources,max=12,nowMs=Date.now()){
 const eligible=(sources||[]).filter(x=>shouldScanNewsSource(x,nowMs));
 const due=[], hostCounts=new Map();
 for(const candidate of eligible){
  if(due.length>=max)break;
  const host=sourceHost(candidate);
  const count=hostCounts.get(host)||0;
  // Keep one upstream domain from monopolizing each scheduled batch.
  if(count>=2)continue;
  due.push(candidate);
  hostCounts.set(host,count+1);
 }
 return {due,backoffSkipped:(sources||[]).length-eligible.length,
  hostLimitedSkipped:eligible.length-due.length};
}
