import test from "node:test";
import assert from "node:assert/strict";
import {seniorityOverrideFromTitle as senior} from "./seniority-guard.mjs";
test("senior without minimum years is not junior",()=>{
 for(const t of ["KERING EYEWEAR Senior HR Business Partner","GUCCI Senior HR Controller","Senior Human Resources Partner","Director of HR"])
  assert.equal(senior(t),"senior_manager",t);
});
test("genuine internships and entry roles remain eligible",()=>{
 for(const t of ["HR & Office Manager internship","Human Resources Coordinator","Retail Merchandising Intern","Junior Buying Assistant"])
  assert.equal(senior(t),null,t);
});
