// Probe explicitly linked recruitment pages only when they are hosted on the
// brand's own registrable domain. This includes careers.brand.com but avoids
// untrusted external redirects and third-party marketing/tracking destinations.
const suffixes=new Set(["co.uk","org.uk","com.au","com.br","com.hk","co.nz","co.jp","com.sg","com.tr","co.in"]);
function rootDomain(host) {
 const parts=host.toLowerCase().replace(/\.$/,"").split(".");
 if(parts.length<2||parts.some(x=>!x||!/^[a-z0-9-]+$/.test(x)))return null;
 const tail=parts.slice(-2).join(".");
 return parts.slice(-(suffixes.has(tail)?3:2)).join(".");
}
function publicUrl(input,base) {
 try{
  const u=new URL(input,base);
  if(u.protocol!=="https:"||u.username||u.password||u.port||u.href.length>650)return null;
  const host=u.hostname.toLowerCase();
  if(host==="localhost"||host.endsWith(".local")||host.endsWith(".internal")
     ||/^\d+\.\d+\.\d+\.\d+$/.test(host)||!rootDomain(host))return null;
  return u;
 }catch{return null}
}
export function linkedCareerTarget(href,label,brandUrl,pageUrl) {
 const target=publicUrl(href,pageUrl),brand=publicUrl(brandUrl);
 if(!target||!brand||rootDomain(target.hostname)!==rootDomain(brand.hostname))return null;
 const text=String(label||"").replace(/<[^>]*>/g," ").toLowerCase();
 const reference=(target.pathname+" "+text).toLowerCase();
 if(!/careers?|jobs|join[- ]?(?:us|our team)|lavora con noi|offerte di lavoro|work with us|opportunit|recruiting|vacancies|open positions/.test(reference))return null;
 if(/unsubscribe|privacy|newsletter|cookie|login|sign.in|register/.test(reference))return null;
 if(target.origin===brand.origin&&target.pathname==="/")return null;
 // A separate official jobs subdomain can have its listing at root.
 if(target.pathname==="/"&&!/^(jobs|careers|recruitment|recruiting)\./i.test(target.hostname))return null;
 target.hash="";
 return target.href;
}
export function acceptedCareerResponse(finalUrl,brandUrl,atsHosts=[]) {
 const target=publicUrl(finalUrl),brand=publicUrl(brandUrl);
 if(!target||!brand)return false;
 return rootDomain(target.hostname)===rootDomain(brand.hostname)
   ||atsHosts.some(h=>h===target.hostname);
}
