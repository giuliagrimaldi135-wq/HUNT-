"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function currentUser() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");
  return { supabase, userId };
}

async function setApplication(jobId: string, status: "preparing" | "applied") {
  const { supabase, userId } = await currentUser();
  const { data: job } = await supabase.from("jobs").select("company_id").eq("id", jobId).maybeSingle();
  if (!job) return;

  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("user_id", userId)
    .eq("job_id", jobId)
    .maybeSingle();

  const now = new Date().toISOString();
  const payload = {
    user_id: userId,
    job_id: jobId,
    company_id: job.company_id,
    status,
    applied_at: status === "applied" ? now : null,
    updated_at: now,
  };

  if (existing) {
    await supabase.from("applications").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("applications").insert(payload);
  }

  await supabase.from("user_job_feedback").insert({
    user_id: userId,
    job_id: jobId,
    feedback_type: status === "applied" ? "apply" : "save",
    details: { source: "opportunity_action" },
  });

  revalidatePath("/opportunities");
  revalidatePath("/applications");
  redirect("/applications");
}

export async function prepareApplication(formData: FormData) {
  await setApplication(String(formData.get("job_id") || ""), "preparing");
}

export async function markApplied(formData: FormData) {
  await setApplication(String(formData.get("job_id") || ""), "applied");
}

export async function ignoreOpportunity(formData: FormData) {
  const { supabase, userId } = await currentUser();
  const jobId = String(formData.get("job_id") || "");
  if (!jobId) return;

  await supabase.from("user_job_feedback").insert({
    user_id: userId,
    job_id: jobId,
    feedback_type: "hide",
    details: { source: "opportunity_action" },
  });

  revalidatePath("/opportunities");
  redirect("/opportunities");
}
