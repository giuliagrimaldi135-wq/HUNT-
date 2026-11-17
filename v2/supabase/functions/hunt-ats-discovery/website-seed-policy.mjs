// A recorded company website is ONLY a discovery lead: it is not proof
// that a careers page, ATS board, or any individual vacancy is official.
export function safeCompanyWebsiteURL(raw) {
 try{
  const u=new URL(String(raw||"").trim());
  if(u.protocol!=="https:"||u.username||u.password||u.port)return null;
  const host=u.hostname.toLowerCase();
  if(host==="localhost"||host.endsWith(".local")||host.endsWith(".internal")||
     !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)||host.includes("..")||
     /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host))return null;
  if(u.href.length>500)return null;
  // Don't ingest third-party query strings or deep links as the primary site.
  return u.origin+"/";
 }catch{return null}
}
export function findMissingWebsiteLeads(companies,sources,max=12){
 const byCompany=new Map();
 for(const s of sources||[]){
  if(!s.company_id)continue;
  const entry=byCompany.get(s.company_id)||{candidate:false,covered:false};
  if(s.source_type==="brand_website_candidate")entry.candidate=true;
  if(s.active&&s.official&&["ats","career_page","public_ats_board"].includes(s.source_type))
   entry.covered=true;
  byCompany.set(s.company_id,entry);
 }
 const seeds=[];
 for(const c of companies||[]){
  if(seeds.length>=max)break;
  if(!c?.id||!c?.monitored)continue;
  const website=safeCompanyWebsiteURL(c.website_url);
  const state=byCompany.get(c.id);
  if(!website||state?.candidate||state?.covered)continue;
  seeds.push({company_id:c.id,source_type:"brand_website_candidate",source_family:"custom",
   name:String(c.name||"Brand")+" · website discovery only",base_url:website,
   official:false,trust_level:45,active:true,health_status:"unknown",
   config:{},metadata:{discovery:"company_website_lead",not_a_verified_careers_page:true}});
 }
 return seeds;
}
