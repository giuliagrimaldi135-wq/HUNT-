import { opportunities as demo } from "@/lib/demo";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type Opportunity = (typeof demo)[number] & {
  reasons?: string[];
  gaps?: string[];
  applyUrl?: string;
  description?: string;
  official?: boolean;
  state?: string;
  publishedAt?: string;
};

function ageLabel(value?: string) {
  if (!value) return "Data non verificata";
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
  if (days === 0) return "Pubblicata oggi";
  if (days === 1) return "Pubblicata ieri";
  return `Pubblicata ${days} giorni fa`;
}

function cityAllowed(city: string | null, remoteMode: string | null, cities: string[]) {
  if (remoteMode === "remote") return true;
  if (!cities.length) return true;
  if (!city) return false;
  const value = city.toLowerCase();
  return cities.some((x) => value.includes(x) || x.includes(value));
}

function mapOpportunity(row: any): Opportunity {
  const job = row.jobs || row.job;
  return {
    id: String(job.id),
    brand: job.companies?.name || "Brand",
    title: job.canonical_title,
    location: job.city || "Da verificare",
    match: row.match_score ?? 0,
    confidence: job.vacancy_confidence ?? 0,
    priority: row.priority_score ?? 0,
    freshness: ageLabel(job.published_at),
    role: job.role_family || "Other",
    source: job.confidence_label || "HUNT",
    why: Array.isArray(row.reasons) && row.reasons.length
      ? row.reasons[0]
      : "Motivazione personalizzata disponibile nel dossier.",
    reasons: Array.isArray(row.reasons) ? row.reasons : [],
    gaps: Array.isArray(row.gaps) ? row.gaps : [],
    applyUrl: job.primary_apply_url || undefined,
    description: job.description || undefined,
    official: Array.isArray(job.job_sources)
      ? job.job_sources.some((source: any) => source.sources?.official)
      : false,
    state: job.state || undefined,
    publishedAt: job.published_at || undefined,
  };
}

export async function getOpportunities(): Promise<Opportunity[]> {
  if (!isSupabaseConfigured()) return demo;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return demo;

  const [{ data: pref }, { data: hidden }, { data: applications }, { data, error }] = await Promise.all([
    supabase
      .from("career_preferences")
      .select("preferred_locations,relocation_locations,preferences")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("user_job_feedback")
      .select("job_id")
      .eq("user_id", userId)
      .eq("feedback_type", "hide"),
    supabase
      .from("applications")
      .select("job_id")
      .eq("user_id", userId),
    supabase
      .from("user_job_matches")
      .select("match_score,priority_score,reasons,gaps,jobs(id,canonical_title,role_family,city,remote_mode,vacancy_confidence,confidence_label,last_verified_at,published_at,primary_apply_url,state,description,companies(name),job_sources(sources(official)))")
      .eq("user_id", userId)
      .order("priority_score", { ascending: false })
      .limit(100),
  ]);

  if (error || !data) return demo;

  const excluded = new Set([
    ...(hidden || []).map((x: any) => x.job_id),
    ...(applications || []).map((x: any) => x.job_id).filter(Boolean),
  ]);
  const cities = [
    ...(pref?.preferred_locations || []),
    ...(pref?.relocation_locations || []),
  ].map((x: unknown) => String(x).toLowerCase());
  const radar = String(pref?.preferences?.radar_scope || "smart");
  const minMatch = radar === "explore" ? 60 : radar === "focused" ? 75 : 70;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 20);
  cutoff.setHours(0, 0, 0, 0);

  return data
    .filter((row: any) => {
      const job = row.jobs;
      if (!job || excluded.has(job.id) || row.match_score < minMatch) return false;
      if (!job.published_at || new Date(job.published_at) < cutoff) return false;
      return cityAllowed(job.city, job.remote_mode, cities);
    })
    .map(mapOpportunity);
}

export async function getOpportunity(id: string): Promise<Opportunity | undefined> {
  if (!isSupabaseConfigured()) return demo.find((job) => job.id === id);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return undefined;

  const [{ data: match }, { data: job }] = await Promise.all([
    supabase
      .from("user_job_matches")
      .select("match_score,priority_score,reasons,gaps")
      .eq("user_id", userId)
      .eq("job_id", id)
      .maybeSingle(),
    supabase
      .from("jobs")
      .select("id,canonical_title,role_family,city,remote_mode,vacancy_confidence,confidence_label,last_verified_at,published_at,primary_apply_url,state,description,companies(name),job_sources(sources(official))")
      .eq("id", id)
      .maybeSingle(),
  ]);

  if (!job) return undefined;
  return mapOpportunity({ ...(match || { match_score: 0, priority_score: 0, reasons: [], gaps: [] }), job });
}
