// Invariant: the incremental matcher must leave exactly the same
// recommendations and job analysis as a forced FULL evaluation, step by step,
// across CV, preference, job, time, duplicate and external-deletion changes.
// Run: deno test --allow-run --allow-env --allow-read equivalence/equivalence.test.ts
import {assert,assertEquals} from "jsr:@std/assert@1";

const here=new URL(".",import.meta.url).pathname;
async function scenario(mode:string){
  const out=await new Deno.Command(Deno.execPath(),{
    args:["run","-q","--allow-env","--allow-read","--import-map="+here+"import_map.json",here+"run-equivalence.ts",here+"../index.ts",mode],
    stdout:"piped",stderr:"piped"
  }).output();
  if(!out.success)throw Error(new TextDecoder().decode(out.stderr));
  return JSON.parse(new TextDecoder().decode(out.stdout)).steps;
}

Deno.test("incremental matching equals full evaluation at every step",async()=>{
  const [inc,full]=await Promise.all([scenario("incremental"),scenario("full")]);
  assertEquals(inc.length,full.length);
  for(let i=0;i<inc.length;i++){
    assertEquals(inc[i].status,200,inc[i].name);
    assertEquals(inc[i].snapshot,full[i].snapshot,"step "+inc[i].name);
  }
  const byName=Object.fromEntries(inc.map((s:any)=>[s.name,s.body]));
  // Unchanged data must not re-read every description.
  assertEquals(byName.no_change.mode,"incremental");
  assertEquals(byName.no_change.jobsEvaluated,0);
  assert(byName.no_change.descriptionsRead<byName.initial.descriptionsRead/2);
  // Nothing changed since the last pass: the run ends after the digest check.
  assertEquals(byName.no_change_again.mode,"skipped");
  assert(byName.no_change_again.readBytesEstimate<byName.no_change.readBytesEstimate/5);
  // Changes must be detected.
  assertEquals(byName.job_description_requires_5_years.jobsEvaluated,1);
  assertEquals(byName.preferences_add_paris.mode,"full");
  assertEquals(byName.cv_profile_updated.mode,"full");
  assertEquals(byName.new_cv_uploaded.mode,"full");
  assertEquals(byName.avoid_trait_added.mode,"full");
  assertEquals(byName.new_job_published.jobsEvaluated,1);
  assertEquals(byName.match_row_removed_externally.jobsEvaluated,1);
  assertEquals(byName.stale_job_back_active.jobsEvaluated,1);
  assertEquals(byName.time_passes_2_days.modeReason,"daily_safety_refresh");
  assertEquals(byName.time_passes_10_hours_priority_only.mode,"incremental");
  // Every full-mode step still reads everything, like the previous matcher.
  for(const s of full)assertEquals(s.body.mode,"full");
});

Deno.test("without the new database functions the matcher behaves as before (always full)",async()=>{
  const legacy=await scenario("legacy");
  for(const s of legacy){
    assertEquals(s.status,200,s.name);
    assertEquals(s.body.mode,"full");
    assertEquals(s.body.stateSaved,false);
  }
});
