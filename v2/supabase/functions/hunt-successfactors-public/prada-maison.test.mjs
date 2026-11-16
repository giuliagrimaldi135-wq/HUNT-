import test from "node:test";
import assert from "node:assert/strict";
import {resolvePradaMaison} from "./prada-maison.mjs";
const companies=[{slug:"prada",id:"p"},{slug:"miu-miu",id:"m"},{slug:"churchs",id:"c"},{slug:"versace",id:"v"},{slug:"prada-group",id:"g"}];
test("explicit Prada, Miu Miu, Church's and Versace titles select actual Maison",()=>{
 assert.equal(resolvePradaMaison("PRADA Retail Training Intern",companies),"p");
 assert.equal(resolvePradaMaison("MIU MIU Communication Intern",companies),"m");
 assert.equal(resolvePradaMaison("ASSISTANT E-COMMERCE MANAGER, MIU MIU",companies),"m");
 assert.equal(resolvePradaMaison("CHURCH'S Client Advisor Regent Street",companies),"c");
 assert.equal(resolvePradaMaison("Retail Manager Versace",companies),"v");
});
test("ambiguous corporate roles remain at group, never invent Maison",()=>{
 assert.equal(resolvePradaMaison("Distribution Planner",companies),null);
 assert.equal(resolvePradaMaison("Prada Group Financial Controller",companies),null);
 assert.equal(resolvePradaMaison("PRADA and MIU MIU Buyer",companies),null);
});
test("missing brand registry row remains at source employer, no invented IDs",()=>{
 assert.equal(resolvePradaMaison("MIU MIU Communication Intern",companies.filter(c=>c.slug!=="miu-miu")),null);
});
