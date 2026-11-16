// Source identity must come from an official per-job ATS identifier,
// never a generic careers homepage or a merely similar title.
export function isRealCareerPosting(title) {
 const t=String(title||"").trim();
 if(t.length<4||t.length>200)return false;
 if(/^\s*(?:template store|test job|test vacancy|placeholder job|sample vacancy)\b/i.test(t))return false;
 if(/\[(?:inserire|insert|brand|citt[aà]\/luogo|to be filled|company name)\b[^\]]*\]/i.test(t))return false;
 if(/\{\{[^}]+\}\}|<[^>]+>|%7b%7b/i.test(t))return false;
 return !/^(?:all jobs|view all positions|job search|careers homepage)$/i.test(t);
}
export function trustedSmartRecruitersIdentity(source,item) {
 if(source?.source_family!=="ats_smartrecruiters")return null;
 const board=String(source?.config?.board||"").trim();
 const id=String(item?.id||"").trim();
 if(!/^[a-z0-9_-]{2,90}$/i.test(board)||!/^\d{8,25}$/.test(id))return null;
 try{
  const url=new URL(String(item?.url||""));
  if(url.protocol!=="https:"||url.hostname!=="jobs.smartrecruiters.com"||url.username||url.password)return null;
  const path=url.pathname.split("/").filter(Boolean);
  if(path.length<2||path[0].toLowerCase()!==board.toLowerCase())return null;
  if(path[1]!==id&&!path[1].startsWith(id+"-"))return null;
  return {board,id,postingsUrlPrefix:"https://jobs.smartrecruiters.com/"+board+"/"};
 }catch{return null}
}
export function isEligibleForStaleTransition(lastSeenAt, nowMs=Date.now()) {
 const ts=Date.parse(String(lastSeenAt||""));
 // Never close a public role on a brief ATS outage or one missed rotation.
 return Number.isFinite(ts)&&ts<=nowMs-72*3600000;
}
