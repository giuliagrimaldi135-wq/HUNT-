// LVMH published detail URLs contain a verified requisition reference, whereas
// the parent search URL only lists many jobs and is never a vacancy itself.
export function isLvmhJobDetailUrl(raw){
 try {
  const u=new URL(String(raw||""));
  if(u.protocol!=="https:"||!["www.lvmh.com","lvmh.com"].includes(u.hostname.toLowerCase()))return false;
  const path=u.pathname.toLowerCase();
  return /^\/(?:en\/join-us\/our-job-offers|join-us\/our-job-offers|it\/opportunita-di-lavoro\/le-nostre-posizioni)\/(?:[a-z]{1,12}\d{4,}|\d{5,})\/?$/.test(path);
 }catch{return false}
}
export function lvmhPublishedDateFromOfficialPage(html,nowMs=Date.now()){
 const text=String(html||"").slice(0,1800000).replace(/<[^>]{0,500}>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/\s+/g," ");
 const m=text.match(/\b(?:Published on|Pubblicato il)\s+(\d{1,2})\.(\d{1,2})\.(20\d{2})\b/i);
 if(!m)return null;
 const month=Number(m[1]),day=Number(m[2]),year=Number(m[3]);
 const ms=Date.UTC(year,month-1,day);
 const d=new Date(ms);
 if(d.getUTCFullYear()!==year||d.getUTCMonth()!==month-1||d.getUTCDate()!==day
  ||ms>nowMs+86400000||ms<Date.UTC(2010,0,1))return null;
 return d.toISOString();
}
