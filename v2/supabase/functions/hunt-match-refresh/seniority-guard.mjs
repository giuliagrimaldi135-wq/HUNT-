// A published title that explicitly says Senior must not silently become
// entry-level just because no quantified minimum years are in the description.
export function seniorityOverrideFromTitle(title){
 const t=String(title||"").toLowerCase();
 if(/\b(internship|intern|stage|tirocinio|graduate trainee)\b/.test(t))return null;
 if(/\b(senior|sr\.?|principal|director|head of|chief|vice president|vp)\b/.test(t))return "senior_manager";
 return null;
}
