"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authenticatedContext } from "@/lib/data/current-user";

function requestedJob(formData:FormData):string {
 const id=String(formData.get("job_id")||"");
 if(!/^[0-9a-f-]{36}$/i.test(id))redirect("/opportunities");
 return id;
}

async function ownMatchedJob(jobId:string){
 const {supabase,userId}=await authenticatedContext();
 const {data:match,error}=await supabase.from("user_job_matches")
  .select("job_id").eq("user_id",userId).eq("job_id",jobId).maybeSingle();
 if(error||!match)redirect("/opportunities");
 return {supabase,userId};
}

export async function saveOpportunity(formData:FormData){
 const jobId=requestedJob(formData);
 const {supabase,userId}=await ownMatchedJob(jobId);
 const {data:prior,error:readError}=await supabase.from("user_job_feedback")
  .select("id").eq("user_id",userId).eq("job_id",jobId)
  .eq("feedback_type","save").limit(1).maybeSingle();
 if(readError)redirect("/opportunities");
 if(!prior){
  const {error}=await supabase.from("user_job_feedback").insert({
   user_id:userId,job_id:jobId,feedback_type:"save",details:{origin:"web-user-action"}
  });
  if(error)redirect("/opportunities");
 }
 revalidatePath("/opportunities");
 redirect("/opportunities/"+jobId);
}

export async function hideOpportunity(formData:FormData){
 const jobId=requestedJob(formData);
 const {supabase,userId}=await ownMatchedJob(jobId);
 const {data:prior,error:readError}=await supabase.from("user_job_feedback")
  .select("id").eq("user_id",userId).eq("job_id",jobId)
  .eq("feedback_type","hide").limit(1).maybeSingle();
 if(readError)redirect("/opportunities");
 if(!prior){
  const {error}=await supabase.from("user_job_feedback").insert({
   user_id:userId,job_id:jobId,feedback_type:"hide",details:{origin:"web-user-action"}
  });
  if(error)redirect("/opportunities");
 }
 revalidatePath("/opportunities");
 revalidatePath("/");
 redirect("/opportunities");
}

export async function prepareApplication(formData:FormData){
 const jobId=requestedJob(formData);
 const {supabase,userId}=await ownMatchedJob(jobId);
 const {data:prior,error:existingError}=await supabase.from("applications")
  .select("id").eq("user_id",userId).eq("job_id",jobId).limit(1).maybeSingle();
 if(existingError)redirect("/opportunities");
 if(prior)redirect("/applications/"+prior.id);

 const {data:job,error:jobError}=await supabase.from("jobs")
  .select("company_id,state").eq("id",jobId).maybeSingle();
 if(jobError||!job||!["active_verified","active_likely"].includes(job.state))
   redirect("/opportunities");
 const {data:created,error}=await supabase.from("applications").insert({
  user_id:userId,job_id:jobId,company_id:job.company_id,status:"preparing"
 }).select("id").single();
 if(error||!created)redirect("/opportunities");
 revalidatePath("/applications");
 redirect("/applications/"+created.id);
}
