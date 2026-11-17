import { authenticatedContext, publicHttpsUrl, textList } from "@/lib/data/current-user";

export type DirectRecommendation = {
 id: string; brand: string; area: string; score: number | null;
 whyNow: string; contactUrl: string | null; contactLabel: string;
};

function candidateLink(input: unknown): string | null {
 if (!input || typeof input !== "object" || Array.isArray(input)) return null;
 const obj = input as Record<string, unknown>;
 return publicHttpsUrl(obj.official_url || obj.careers_url || obj.url || obj.website);
}

export async function getDirectRecommendations(): Promise<DirectRecommendation[]> {
 const {supabase,userId}=await authenticatedContext();
 const {data,error}=await supabase.from("outreach_candidates")
  .select("id,score,why_now,recommended_area,contact_route,status,companies(name,website_url)")
  .eq("user_id",userId).order("score",{ascending:false}).limit(40);
 if(error){ console.error("HUNT direct: cannot load own outreach",error.code); return []; }
 return (data||[]).filter(x=>
  !["ignored","dismissed","rejected"].includes(String(x.status||"").toLowerCase())
  && String(x.why_now||"").trim().length>=25
 ).map(x=>{
  const contactUrl=candidateLink(x.contact_route);
  return {
   id:String(x.id),brand:x.companies?.name||"Brand",
   area:x.recommended_area||"Area da definire",
   score:typeof x.score==="number"?x.score:null,
   whyNow:String(x.why_now),
   contactUrl,
   contactLabel:contactUrl?"Canale pubblico indicato nella fonte":"Contatto specifico non ancora verificato"
  };
 });
}

export type ApplicationRow = {
 id: string; brand: string; role: string; status: string;
 notes: string | null; appliedAt: string | null; nextActionAt: string | null;
 jobId: string | null;
};

export async function getOwnApplications(): Promise<ApplicationRow[]> {
 const {supabase,userId}=await authenticatedContext();
 const {data,error}=await supabase.from("applications")
  .select("id,job_id,status,notes,applied_at,next_action_at,companies(name),jobs(canonical_title)")
  .eq("user_id",userId).order("updated_at",{ascending:false}).limit(120);
 if(error){console.error("HUNT applications: own rows unavailable",error.code);return [];}
 return (data||[]).map(x=>({
  id:x.id,brand:x.companies?.name||"Brand da verificare",
  role:x.jobs?.canonical_title||"Candidatura spontanea",
  status:x.status,
  notes:x.notes,
  appliedAt:x.applied_at,
  nextActionAt:x.next_action_at,
  jobId:x.job_id
 }));
}

export async function getOwnApplication(id: string): Promise<ApplicationRow | null> {
 if(!/^[0-9a-f-]{36}$/i.test(id)) return null;
 const {supabase,userId}=await authenticatedContext();
 const {data,error}=await supabase.from("applications")
  .select("id,job_id,status,notes,applied_at,next_action_at,companies(name),jobs(canonical_title)")
  .eq("id",id).eq("user_id",userId).maybeSingle();
 if(error||!data)return null;
 return {
  id:data.id,brand:data.companies?.name||"Brand da verificare",
  role:data.jobs?.canonical_title||"Candidatura spontanea",
  status:data.status,notes:data.notes,appliedAt:data.applied_at,
  nextActionAt:data.next_action_at,jobId:data.job_id
 };
}

export type ProfileState = {
 currentTitle: string | null; seniority: string | null;
 cvs: {id:string;name:string;active:boolean;isDefault:boolean;roles:string[]}[];
 primaryRoles:string[];secondaryRoles:string[];excludedRoles:string[];
 preferredLocations:string[];relocationLocations:string[];
};

export async function getOwnProfile(): Promise<ProfileState> {
 const {supabase,userId}=await authenticatedContext();
 const [profile,prefs,cvs]=await Promise.all([
  supabase.from("profiles").select("current_title,seniority").eq("user_id",userId).maybeSingle(),
  supabase.from("career_preferences").select("primary_role_families,secondary_role_families,excluded_role_families,preferred_locations,relocation_locations").eq("user_id",userId).maybeSingle(),
  supabase.from("user_cvs").select("id,name,active,is_default,target_role_families").eq("user_id",userId).order("updated_at",{ascending:false}).limit(50)
 ]);
 if(profile.error||prefs.error||cvs.error)
   console.error("HUNT profile: one or more own tables unavailable");
 return {
  currentTitle:profile.data?.current_title||null,seniority:profile.data?.seniority||null,
  cvs:(cvs.data||[]).map(x=>({id:x.id,name:x.name,active:x.active,isDefault:x.is_default,roles:textList(x.target_role_families)})),
  primaryRoles:textList(prefs.data?.primary_role_families),
  secondaryRoles:textList(prefs.data?.secondary_role_families),
  excludedRoles:textList(prefs.data?.excluded_role_families),
  preferredLocations:textList(prefs.data?.preferred_locations),
  relocationLocations:textList(prefs.data?.relocation_locations)
 };
}
