import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { isEligibleFeedVacancy } from "@/lib/data/eligibility";
import { publicHttpsUrl, textList } from "@/lib/data/current-user";

export type Opportunity = {
 id: string; brand: string; title: string; location: string;
 match: number; confidence: number; priority: number;
 freshness: string; role: string; source: string; why: string;
 reasons: string[]; gaps: string[]; description: string;
 applyUrl: string | null; publishedAt: string | null;
 firstSeenAt: string; lastVerifiedAt: string | null;
};

export async function getOpportunities(): Promise<Opportunity[]> {
 // Never serve fictional vacancies, even in development builds.
 if (!isSupabaseConfigured()) return [];

 const supabase = await createClient();
 const { data: claims } = await supabase.auth.getClaims();
 const userId = claims?.claims?.sub;
 if (!userId) return [];

 const [matches,feedback] = await Promise.all([
  supabase.from("user_job_matches")
   .select("match_score,priority_score,reasons,gaps,jobs(id,canonical_title,role_family,city,description,primary_apply_url,vacancy_confidence,confidence_label,last_verified_at,published_at,first_seen_at,state,metadata,companies(name))")
   .eq("user_id",userId)
   .order("priority_score",{ascending:false}).limit(80),
  supabase.from("user_job_feedback")
   .select("job_id").eq("user_id",userId)
   .in("feedback_type",["hide","not_interested"]).limit(1000)
 ]);
 if(matches.error || feedback.error){
  console.error("HUNT: unable to retrieve authenticated feed",matches.error?.code||feedback.error?.code);
  return [];
 }
 const hidden=new Set((feedback.data||[]).map(x=>x.job_id));
 return (matches.data||[])
  .filter((row:any)=>row.jobs&&!hidden.has(row.jobs.id)&&isEligibleFeedVacancy(row.jobs))
  .map((row:any)=>{
   const job=row.jobs;
   const reasons=textList(row.reasons);
   return {
    id:String(job.id),
    brand:job.companies?.name||"Brand",
    title:String(job.canonical_title),
    location:job.city||"Località da verificare",
    match:row.match_score??0,
    confidence:job.vacancy_confidence??0,
    priority:row.priority_score??0,
    freshness:job.published_at&&new Date(job.published_at).toDateString()===new Date().toDateString()?"Nuova":"Verificata",
    role:job.role_family||"Altro",
    source:job.confidence_label||"Fonte da verificare",
    why:reasons.length?reasons.join(". "):"Motivazione del match in aggiornamento",
    reasons,
    gaps:textList(row.gaps),
    description:String(job.description||""),
    applyUrl:publicHttpsUrl(job.primary_apply_url),
    publishedAt:job.published_at||null,
    firstSeenAt:job.first_seen_at,
    lastVerifiedAt:job.last_verified_at||null
   };
  });
}

export async function getOpportunity(id:string): Promise<Opportunity|undefined> {
 if(!/^[0-9a-f-]{36}$/i.test(id))return undefined;
 const feed=await getOpportunities();
 return feed.find(job=>job.id===id);
}
