import { authenticatedContext,publicHttpsUrl,textList } from "@/lib/data/current-user";

export type UserDossier = {
 recommendedCvId:string|null;whyYou:string|null;whyNow:string|null;
 cvReason:string|null;positioningAngle:string|null;
 gaps:string[];emphasize:string[];subject:string|null;message:string|null;
 contactUrl:string|null;
};

export async function getOwnDossier(jobId:string):Promise<UserDossier|null>{
 if(!/^[0-9a-f-]{36}$/i.test(jobId))return null;
 const {supabase,userId}=await authenticatedContext();
 const {data,error}=await supabase.from("user_job_dossiers")
  .select("recommended_cv_id,why_you,why_now,cv_reason,positioning_angle,gaps,what_to_emphasize,ready_to_send_subject,ready_to_send_message,contact_route")
  .eq("user_id",userId).eq("job_id",jobId).maybeSingle();
 if(error||!data)return null;
 let contactUrl:string|null=null;
 if(data.contact_route&&typeof data.contact_route==="object"&&!Array.isArray(data.contact_route)){
  const obj=data.contact_route as Record<string,unknown>;
  contactUrl=publicHttpsUrl(obj.official_url||obj.careers_url||obj.url);
 }
 return {
  recommendedCvId:data.recommended_cv_id,whyYou:data.why_you,whyNow:data.why_now,
  cvReason:data.cv_reason,positioningAngle:data.positioning_angle,
  gaps:textList(data.gaps),emphasize:textList(data.what_to_emphasize),
  subject:data.ready_to_send_subject,message:data.ready_to_send_message,
  contactUrl
 };
}
