import test from "node:test";
import assert from "node:assert/strict";
import {analysisNeedsWrite,matchNeedsWrite,existingRecommendationKey} from "./match-write-policy.mjs";
test("no repeat PATCH when only timestamp changes",()=>{
 const analysis={min_years_experience:0,required_languages:["english"],specialist_signals:[]};
 const job={role_family:"Merchandising",seniority:"internship",metadata:{hard_requirements:{...analysis,analyzed_at:"yesterday",analyzer_version:"eligibility-v2"}}};
 assert.equal(analysisNeedsWrite(job,"Merchandising","internship",analysis),false);
 assert.equal(analysisNeedsWrite(job,"Buying","internship",analysis),true);
 assert.equal(analysisNeedsWrite(job,"Merchandising","manager",analysis),true);
 assert.equal(analysisNeedsWrite(job,"Merchandising","internship",{...analysis,required_languages:["french"]}),true);
});
test("skip unchanged recommendation UPSERT but refresh daily and changed CV evidence",()=>{
 const now=Date.now();
 const previous={user_id:"u",job_id:"j",match_score:75,priority_score:83,reasons:["Direct target"],gaps:[],model_version:"eligibility-v2",calculated_at:new Date(now-60*60000).toISOString()};
 const computed={...previous};
 assert.equal(matchNeedsWrite(previous,computed,now),false);
 assert.equal(matchNeedsWrite(null,computed,now),true);
 assert.equal(matchNeedsWrite(previous,{...computed,reasons:["Verified CV evidence"]},now),true);
 assert.equal(matchNeedsWrite({...previous,calculated_at:new Date(now-25*3600000).toISOString()},computed,now),true);
 assert.equal(existingRecommendationKey("user","job"),"user|job");
});
