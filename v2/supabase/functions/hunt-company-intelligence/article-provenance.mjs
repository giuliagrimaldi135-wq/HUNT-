// Company Signals are specific to the named fashion house, not every story
// posted by a parent group. A publication date in an article slug is strong
// evidence, while "updated today" on a group homepage is not.
const compact=x=>String(x||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
export function publishedDateInArticleURL(raw,nowMs=Date.now()) {
 try {
  const path=new URL(String(raw)).pathname;
  const m=path.match(/(?:^|\/)(20\d{2})-(\d{2})-(\d{2})(?=[/_-]|$)/);
  if(!m)return null;
  const iso=m[1]+"-"+m[2]+"-"+m[3];
  const t=Date.parse(iso+"T00:00:00Z");
  if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==iso
      ||t>nowMs+86400000||t<Date.parse("2010-01-01"))return null;
  return new Date(t).toISOString();
 }catch{return null}
}
function originHost(input){
 try {
  const u=new URL(input);
  return u.protocol==="https:"?u.hostname.toLowerCase().replace(/^www\./,""):null;
 }catch{return null}
}
function commonSite(a,b){
 if(!a||!b)return false;
 const main=h=>h.split(".").slice(-2).join(".");
 return main(a)===main(b);
}
export function belongsToNamedCompany(articleTitle,description,company,sourceURL,companyWebsiteURL){
 const name=compact(company);
 if(name.length<4)return false;
 const hay=compact(articleTitle+" "+String(description||""));
 // For title/body, the full house name must appear, not a parent-group synonym.
 if(hay.includes(name))return true;
 const site=originHost(companyWebsiteURL),source=originHost(sourceURL);
 // An original story on the house's own site is allowed even when it
 // doesn't repeat the brand name in every headline.
 if(site&&source&&commonSite(site,source))return true;
 // A group URL (e.g. corp.asics.com) is NOT automatically an Onitsuka
 // Tiger article. Keep group news with the actual group brand instead.
 return false;
}
