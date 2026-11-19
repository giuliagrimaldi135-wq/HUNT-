// Compare semantic job analysis; a new scan timestamp alone is NOT a change.
export function analysisNeedsWrite(job,family,seniority,analysis){
  if(job.role_family!==family||job.seniority!==seniority)return true;
  const saved=job.metadata?.hard_requirements;
  if(!saved||saved.analyzer_version!=="eligibility-v2")return true;
  return saved.min_years_experience!==analysis.min_years_experience||
    JSON.stringify(saved.required_languages||[])!==JSON.stringify(analysis.required_languages||[])||
    JSON.stringify(saved.specialist_signals||[])!==JSON.stringify(analysis.specialist_signals||[]);
}
export function matchNeedsWrite(previous,computed,nowMs=Date.now()){
  if(!previous)return true;
  if(previous.model_version!==computed.model_version||
     Number(previous.match_score)!==Number(computed.match_score)||
     Number(previous.priority_score)!==Number(computed.priority_score)||
     JSON.stringify(previous.reasons||[])!==JSON.stringify(computed.reasons||[])||
     JSON.stringify(previous.gaps||[])!==JSON.stringify(computed.gaps||[]))return true;
  const when=Date.parse(previous.calculated_at||"");
  return !Number.isFinite(when)||when<nowMs-24*3600000;
}
export function existingRecommendationKey(userId,jobId){
  return String(userId)+"|"+String(jobId);
}
