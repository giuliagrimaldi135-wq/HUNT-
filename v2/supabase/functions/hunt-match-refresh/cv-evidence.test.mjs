import test from "node:test";
import assert from "node:assert/strict";
import {chooseRelevantCvProfile} from "./cv-evidence.mjs";
const cv=(evidence,projects=[],is_default=false)=>({is_default,parsed_profile:{profile_confirmed_by_user:true,experience:[{company:"Showroom",evidence}],projects:projects.map(([name,evidence])=>({name,evidence})),tools:[]}});
test("does not use an unconfirmed uploaded CV",()=>{assert.deepEqual(chooseRelevantCvProfile([{parsed_profile:{experience:[{company:"X",evidence:["buying budget"]}]}}],"Buying","buyer"),{})});
test("two CVs mentioning showroom differ by distinct documented projects",()=>{
 const generic=cv(["Client reception and showroom orders"],[],true);
 const specific=cv(["Client reception and showroom orders"],[["Gucci study",["Product assortment and merchandising mix","KPI sales analysis and capsule collection"]]]);
 assert.equal(chooseRelevantCvProfile([generic,specific],"Merchandising","Assortment planning and KPI performance"),specific.parsed_profile);
});
test("tie goes to confirmed main version, never file name",()=>{
 const preferred=cv(["Showroom"],[],true),other=cv(["Showroom"],[],false);
 assert.equal(chooseRelevantCvProfile([other,preferred],"Merchandising","retail"),preferred.parsed_profile);
});
test("no free points for repeated identical evidence from one source",()=>{
 const repeated=cv(["Showroom","Showroom","Showroom"]);
 const wide=cv(["Showroom"],[["Buying assignment",["Buying budget and assortment"]]]);
 assert.equal(chooseRelevantCvProfile([repeated,wide],"Buying","Buying budget and assortment"),wide.parsed_profile);
});
