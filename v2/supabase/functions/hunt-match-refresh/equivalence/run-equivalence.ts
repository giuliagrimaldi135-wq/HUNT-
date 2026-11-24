// Runs the matcher handler over a deterministic scenario on the in-memory mock.
// Usage: deno run --allow-env --allow-read --import-map=import_map.json run-equivalence.ts <index.ts> <mode>
//   mode = "incremental" (default calls) | "full" (forces {full:true}) | "legacy" (no RPCs, plain calls)
// Prints JSON {steps:[{name,snapshot,stats}]}. Compared by equivalence.test.ts.
import {db} from "./mock-supabase.ts";

const [impl,mode]=Deno.args;
let handler:any=null;
Object.defineProperty(Deno,"serve",{value:(h:any)=>{handler=h;return {}},configurable:true,writable:true});
Deno.env.set("SUPABASE_URL","http://mock.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY","mock");
await import(impl);
if(!handler)throw Error("handler not captured");

const BASE=Date.parse("2026-11-24T10:00:00Z");
let offset=0;
Date.now=()=>BASE+offset;
const iso=(daysAgo:number)=>new Date(BASE+offset-daysAgo*86400000).toISOString();
const sha=async(s:string)=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,"0")).join("");

const pad=(s:string)=>s+" "+"Il ruolo opera nel team centrale della maison con responsabilità condivise tra ufficio prodotto e rete retail, in stretto contatto con i colleghi internazionali. ".repeat(3);
const U1="00000000-0000-4000-8000-000000000001",U2="00000000-0000-4000-8000-000000000002";
const C1="10000000-0000-4000-8000-000000000001",C2="10000000-0000-4000-8000-000000000002",KER="10000000-0000-4000-8000-000000000003";
let n=0;
const id=()=>"20000000-0000-4000-8000-"+String(++n).padStart(12,"0");
function job(o:any){
  return {id:id(),company_id:C1,requisition_id:null,primary_apply_url:"https://jobs.example.com/"+n,canonical_title:"Merchandising Intern",
    role_family:null,seniority:null,employment_type:"internship",city:"Milan",remote_mode:"onsite",
    description:pad("Support assortment planning, collection review, sell-out and KPI analysis, stock reports."),
    published_at:iso(3),first_seen_at:iso(3),last_verified_at:iso(0.2),vacancy_confidence:90,state:"active_verified",metadata:{},...o};
}
function seed(){
  n=0;
  const jobs=[
    job({}),
    job({canonical_title:"Buying Intern",description:pad("Work with buyers on open to buy, supplier orders, product assortment and budget.")}),
    job({canonical_title:"Merchandise Planning Intern",city:"Milano",description:pad("Forecast, budget, stock allocation, inventory and sales plan analysis.")}),
    job({canonical_title:"HR Intern",description:pad("Talent acquisition support, onboarding, people processes.")}),
    job({canonical_title:"HR Intern",city:"Paris",company_id:C2,description:pad("Recruiting, employer branding, talent programs.")}),
    job({canonical_title:"Senior Merchandising Manager",description:pad("Lead the merchandising team. At least 8 years of experience.")}),
    job({canonical_title:"E-commerce Assistant",description:pad("Site merchandising, PDP and PLP, conversion and online sales KPI.")}),
    job({canonical_title:"Retail Operations Intern",description:pad("Store operations processes, store network reporting, KPI scorecard.")}),
    job({canonical_title:"Buying Assistant",description:pad("Buying support. Minimum 3 years of experience in buying.")}),
    job({canonical_title:"Merchandising Intern",description:"Too short to evaluate."}),
    job({canonical_title:"Sales Associate",description:pad("Client advisor in boutique, sales associate duties.")}),
    // Duplicate requisition: same company + requisition id.
    job({canonical_title:"Product Development Intern",requisition_id:"REQ-77",first_seen_at:iso(4),published_at:iso(4),description:pad("Product development, samples, prototype, materials.")}),
    job({canonical_title:"Product Development Intern",requisition_id:"REQ-77",first_seen_at:iso(2),published_at:iso(2),description:pad("Product development, samples, prototype, materials, fitting.")}),
    // Kering localized pair with identical description.
    job({company_id:KER,canonical_title:"Merchandising Intern",primary_apply_url:"https://www.kering.com/it/talenti/offerte-di-lavoro/europe/merch-intern-milan-123/",requisition_id:"K-1",description:pad("Kering assortment, collection, sell-out analysis.")}),
    job({company_id:KER,canonical_title:"Merchandising Intern",primary_apply_url:"https://www.kering.com/fr/talent/offres-d-emploi/europe/merch-intern-milan-123/",description:pad("Kering assortment, collection, sell-out analysis.")}),
    // Lever posting created long ago but first seen recently.
    job({canonical_title:"Merchandising Intern",metadata:{provider_creation_at:"2026-09-01T00:00:00.000Z",other:"keep"}}),
    job({canonical_title:"Planning Assistant",city:"London",description:pad("Allocation, forecast and stock analysis.")}),
    job({canonical_title:"Visual Merchandising Intern",description:pad("Window displays and store layout.")}),
    job({canonical_title:"Merchandising Intern",state:"stale_possible"}),
    job({canonical_title:"Merchandising Intern",published_at:iso(30),first_seen_at:iso(30)}),
    // Fractional age: crosses a day boundary during the incremental-only step.
    job({canonical_title:"Assortment Merchandising Intern",published_at:iso(2.8),first_seen_at:iso(2.8),description:pad("Assortment, collection, product mix and sell-out KPI analysis.")}),
  ];
  db.tables={
    internal_runtime_secrets:[{name:"hunt_cron_token",secret_hash:""}],
    jobs,
    career_preferences:[
      {user_id:U1,primary_role_families:["Merchandising","Buying"],preferred_locations:["Milano"],relocation_locations:[],employment_types:["internship"],preferences:{radar_scope:"smart"}},
      {user_id:U2,primary_role_families:["HR & Talent"],preferred_locations:["Milan","Paris"],relocation_locations:[],employment_types:[],preferences:{}}
    ],
    profiles:[{user_id:U1,seniority:"internship",onboarding_completed:true},{user_id:U2,seniority:"entry_level",onboarding_completed:true}],
    user_personalization:[{user_id:U1,interest_areas:["product_assortment","numbers_performance"],avoid_role_traits:["store_sales"]},{user_id:U2,interest_areas:[],avoid_role_traits:[]}],
    user_cvs:[{id:"30000000-0000-4000-8000-000000000001",user_id:U1,parsed_profile:{profile_confirmed_by_user:true,relevant_years_experience:1,experience:[{role:"Showroom assistant",company:"Brand",evidence:["Order entry and assortment review in showroom","KPI sell-out reports"]}],projects:[{name:"Merchandising mix thesis",evidence:["Merchandising mix and capsule analysis"]}],tools:["Excel"]},is_default:true,active:true,target_role_families:["Merchandising"],updated_at:"2026-11-01T00:00:00Z"}],
    user_job_matches:[]
  };
  db.state=null;
}
const find=(title:string,extra:(j:any)=>boolean=()=>true)=>db.tables.jobs.find((j:any)=>j.canonical_title===title&&extra(j));

const steps:[string,()=>void][]=[
  ["initial",()=>{}],
  ["no_change",()=>{}],
  ["no_change_again",()=>{}],
  ["job_description_requires_5_years",()=>{find("Buying Intern").description=pad("Buying support. At least 5 years of experience in buying.")}],
  ["job_title_changed",()=>{find("E-commerce Assistant").canonical_title="E-commerce Merchandising Assistant"}],
  ["preferences_add_paris",()=>{db.tables.career_preferences[0].preferred_locations=["Milano","Paris"]}],
  ["cv_profile_updated",()=>{db.tables.user_cvs[0].parsed_profile.experience[0].evidence.push("Open to buy budget tracking");db.tables.user_cvs[0].updated_at="2026-11-24T09:00:00Z"}],
  ["new_cv_uploaded",()=>{db.tables.user_cvs.push({id:"30000000-0000-4000-8000-000000000002",user_id:U2,parsed_profile:{profile_confirmed_by_user:true,relevant_years_experience:0,experience:[{role:"HR intern",company:"X",evidence:["Recruiting screening"]}]},is_default:true,active:true,target_role_families:["HR & Talent"],updated_at:"2026-11-24T09:30:00Z"})}],
  ["new_job_published",()=>{db.tables.jobs.push(job({canonical_title:"Merchandising Analyst Intern",description:pad("Assortment, product mix, sell-out KPI and stock analysis.")}))}],
  ["time_passes_2_days",()=>{offset+=2*86400000;for(const j of db.tables.jobs)if(j.state==="active_verified")j.last_verified_at=iso(0.1)}],
  ["match_row_removed_externally",()=>{db.tables.user_job_matches.splice(0,1)}],
  ["job_becomes_stale",()=>{find("Merchandising Intern",(j:any)=>j.company_id===C1&&!j.metadata.provider_creation_at&&j.state==="active_verified"&&j.description.length>250).state="stale_possible"}],
  ["stale_job_back_active",()=>{const j=db.tables.jobs.find((x:any)=>x.state==="stale_possible"&&x.description.includes("Support assortment")&&x.published_at>iso(20));j.state="active_verified";j.last_verified_at=iso(0)}],
  ["vacancy_confidence_drops",()=>{for(const j of db.tables.jobs)if(j.canonical_title==="Merchandise Planning Intern")j.vacancy_confidence=60}],
  ["avoid_trait_added",()=>{db.tables.user_personalization[1].avoid_role_traits=["backoffice_admin","technical_it"]}],
  ["duplicate_description_edit",()=>{find("Product Development Intern",(j:any)=>j.first_seen_at===j.published_at&&j.description.includes("fitting")).description=pad("Product development, samples, prototype, materials, fitting, technical specification.")}],
  ["user_removed_preferences_radar_focused",()=>{db.tables.career_preferences[0].preferences={radar_scope:"focused"}}],
  ["final_no_change",()=>{}],
  ["time_passes_10_hours_priority_only",()=>{offset+=10*3600000;for(const j of db.tables.jobs)if(j.state==="active_verified")j.last_verified_at=iso(0.05)}],
];

function snapshot(){
  const matches=db.tables.user_job_matches.map((m:any)=>({u:m.user_id,j:m.job_id,s:m.match_score,p:m.priority_score,r:m.reasons,g:m.gaps,v:m.model_version}))
    .sort((a:any,b:any)=>(a.u+a.j).localeCompare(b.u+b.j));
  const jobs=db.tables.jobs.map((j:any)=>{const hr=j.metadata?.hard_requirements;return {id:j.id,f:j.role_family,s:j.seniority,other:j.metadata?.other??null,hr:hr?{y:hr.min_years_experience,l:hr.required_languages,sp:hr.specialist_signals,v:hr.analyzer_version}:null}})
    .sort((a:any,b:any)=>a.id.localeCompare(b.id));
  return {matches,jobs};
}

seed();
db.tables.internal_runtime_secrets[0].secret_hash=await sha("token");
db.rpcEnabled=mode!=="legacy";
const out:any[]=[];
for(const [name,mutate] of steps){
  mutate();
  db.requests=[];
  const res=await handler(new Request("http://mock.local/",{method:"POST",headers:{"x-hunt-cron":"token","content-type":"application/json"},body:JSON.stringify(mode==="full"?{full:true}:{})}));
  const body=await res.json();
  const descriptionRows=db.requests.filter((r:any)=>r.table==="jobs"&&r.op==="select"&&(r.cols==="*"||/(^|,)description(,|$)/.test(r.cols))).length;
  out.push({name,status:res.status,body,descriptionSelects:descriptionRows,snapshot:snapshot()});
}
console.log(JSON.stringify({steps:out}));
