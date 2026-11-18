// Probe explicitly linked recruitment pages only when they are hosted on the
// brand's own registrable domain. This includes careers.brand.com but avoids
// untrusted external redirects and third-party marketing/tracking destinations.
const suffixes=new Set(["co.uk","org.uk","com.au","com.br","com.hk","co.nz","co.jp","com.sg","com.tr","co.in"]);
function rootDomain(host) {
 const parts=host.toLowerCase().replace(/\.$/,"").split(".");
 if(parts.length<2||parts.some(x=>!x||!/^[a-z0-9-]+$/.test(x)))return null;
 const tail=parts.slice(-2).join(".");
 // Treat reserved second-level labels under any country-code TLD as public
 // suffixes. "brand.co.za" and "other.co.za" must NEVER share a root.
 const genericSecondLevel=/^(?:co|com|org|net|gov|edu|ac|ne|ltd|mil)$/i;
 const countryCodeTld=parts[parts.length-1].length===2;
 const depth=(suffixes.has(tail)||(countryCodeTld&&genericSecondLevel.test(parts[parts.length-2])))?3:2;
 if(parts.length<depth)return null;
 return parts.slice(-depth).join(".");
}
// Multilingual evidence from a link label, URL path or careers page title.
// Recognition alone never creates an individual job: an official URL must
// still pass HTTPS, same-brand origin and HTML-response validation.
const CAREER_TERMS=/(?:careers?|jobs?|join[- ]?(?:us|our[ -]?team)|lavora[ -]?con[ -]?noi|offerte[ -]?di[ -]?lavoro|posizioni[ -]?aperte|work[ -]?with[ -]?us|opportunit|recruit(?:ment|ing)?|vacanc|open[ -]?positions|carri[eèé]res?|recrutement|nous[ -]?rejoindre|offres?[ -]?d['’ ]emploi|karriere|stellenangebote|arbeiten[ -]?bei[ -]?uns|empleo|trabaja[ -]?con[ -]?nosotros|ofertas?[ -]?de[ -]?trabajo|carreras|carreiras?|trabalhe[ -]?conosco|vagas|vacatures?|werken[ -]?bij|karriär|lediga[ -]?jobb|kariera|oferty[ -]?pracy|kariyer|iş[ -]?ilanları|採用|求人|キャリア|招聘|招贤纳士|채용|커리어)/iu;
export function isCareerIntent(text) {
 return CAREER_TERMS.test(String(text||"").toLowerCase());
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
 if(!isCareerIntent(reference))return null;
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

/**
 * Only a real, linked HTML careers page under the same brand domain is
 * promoted to a monitored careers source. Do not treat a generic home page,
 * an external redirect, or arbitrary text mentioning 'jobs' as a listing.
 */
export function verifiedBrandCareerPage(linkedUrl,finalUrl,brandUrl,contentType,html){
 const linked=publicUrl(linkedUrl),final=publicUrl(finalUrl),brand=publicUrl(brandUrl);
 if(!linked||!final||!brand)return null;
 if(rootDomain(linked.hostname)!==rootDomain(brand.hostname))return null;
 if(!acceptedCareerResponse(finalUrl,brandUrl,[]))return null;
 if(!String(contentType||"").toLowerCase().includes("text/html"))return null;
 const path=(final.hostname+" "+final.pathname).toLowerCase();
 const heading=(String(html||"").match(/<(?:title|h1)\b[^>]*>([\s\S]*?)<\/(?:title|h1)>/i)?.[1]||"")
    .replace(/<[^>]+>/g," ").toLowerCase();
 if(!isCareerIntent(path)&&!isCareerIntent(heading))return null;
 if(final.pathname==="/"&&!/^(jobs|careers|recruitment|recruiting)\./i.test(final.hostname))return null;
 final.hash="";
 return final.href;
}
