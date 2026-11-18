// Preferences-only exploration is not a CV match. These checks deliberately
// exclude senior/management roles even if the source incorrectly tagged entry_level.
export function requiresSeniorExperience(title="",level=""){
 const t=String(title).toLowerCase();
 if(/\b(senior|sr\.?|principal|director|head of|chief|vice president|vp|lead|manager|responsabile)\b/i.test(t) &&
   !/\b(internship|intern|stage|tirocinio|graduate trainee)\b/i.test(t))return true;
 return ["manager","senior_manager","head_director","mid_level"].includes(String(level));
}
export function safeWithoutCvJob(job,primaryRoles=[],userSeniority="entry_level"){
 if(!job||!Array.isArray(primaryRoles)||!primaryRoles.includes(job.role_family))return false;
 if(requiresSeniorExperience(job.canonical_title,job.seniority))return false;
 const years=Number(job.metadata?.hard_requirements?.min_years_experience);
 if(job.metadata?.hard_requirements?.min_years_experience!==null &&
    job.metadata?.hard_requirements?.min_years_experience!==undefined &&
    Number.isFinite(years)&&years>=2)return false;
 const level=String(job.seniority||"");
 if(!["internship","trainee","assistant","entry_level","junior"].includes(level))return false;
 if(userSeniority==="internship"&&level==="junior"&&
   !/\b(junior|assistant|trainee|graduate)\b/i.test(job.canonical_title||""))return false;
 if(String(job.description||"").trim().length<250)return false;
 return /^https:\/\/[^/\s]+/i.test(String(job.primary_apply_url||""));
}
// Career goals are user-declared. Curated global brand leads are not personally
// relevant unless the area is explicitly in the member's professional targets.
const areaKeys={
 "Merchandising":/\bmerchandis(?:e|ing)?\b/i,
 "Buying":/\bbuy(?:er|ing)?\b/i,
 "Planning & Allocation":/\b(planning|allocation)\b/i,
 "Retail & Retail Operations":/\bretail\b|\bstore operations\b/i,
 "E-commerce & Digital":/\be-?commerce\b|\bdigital\b/i,
 "Product Management & Development":/\bproduct\b|\bprodotto\b/i,
 "Production & Sourcing":/\bproduction\b|\bsourcing\b|\bmanufacturing\b/i,
 "Wholesale & Commercial":/\bwholesale\b|\bcommercial\b/i,
 "Marketing & Brand":/\bmarketing\b|\bbrand management\b/i,
 "PR, Communications & Events":/\b(pr|communication|events?|press)\b/i,
 "CRM & Clienteling":/\bcrm\b|\bclienteling\b/i,
 "Visual Merchandising":/\bvisual merchandis/i,
 "Supply Chain & Logistics":/\b(supply chain|logistic)\b/i,
 "Design & Creative":/\b(design|creative)\b/i,
 "Data & Analytics":/\b(data|analytics|business intelligence)\b/i,
 "Strategy & Project Management":/\b(strategy|project management)\b/i,
 "HR & Talent":/\b(hr|human resources|people operations|talent|recruiting)\b/i,
 "Finance & Legal":/\b(finance|legal|accounting)\b/i,
 "Sustainability":/\b(sustainab|esg)\b/i,
 "Technology":/\b(technology|software|engineering)\b/i
};
export function outreachLeadForTargets(lead,primaryRoles=[]){
 if(!lead||!primaryRoles?.length)return false;
 const area=String(lead.area||"");
 if(!area||/^(da valutare|general|unknown)/i.test(area))return false;
 return primaryRoles.some(role=>areaKeys[role]?.test(area)===true);
}
export function filterOutreachForMember(leads=[],primaryRoles=[]){
 return (Array.isArray(leads)?leads:[]).filter(lead=>outreachLeadForTargets(lead,primaryRoles));
}
