import {test} from "node:test";import assert from "node:assert/strict";
import {scoreCvForJob,chooseRelevantCv} from "../cv-ranking.js";
const main={id:"main",is_default:true,parsed_profile:{profile_confirmed_by_user:true,experience:[{role:"Showroom assistant",evidence:["Entered orders and greeted clients"]}],projects:[]}};
const second={id:"second",is_default:false,parsed_profile:{profile_confirmed_by_user:true,projects:[{name:"Gucci",evidence:["Merchandising mix and assortment planning"]}]}};
test("Automatically choose specialist secondary CV for specialist role, without manual tagging",()=>{
 const cv=chooseRelevantCv([main,second],{canonical_title:"Retail Merchandising Intern",role_family:"Merchandising"});
 assert.equal(cv.id,"second");
});
test("Prioritise confirmed evidence over unverified keyword-rich OCR",()=>{
 const unverified={id:"unverified",is_default:false,parsed_profile:{draft_profile:{projects:[{evidence:["Merchandising mix assortment fashion merchandising"]}]}}};
 const chosen=chooseRelevantCv([main,unverified],{canonical_title:"Retail Merchandising Intern",role_family:"Merchandising"});
 assert.equal(chosen.id,"main");
});
test("Do not override automatic superior match with unrelated stale saved recommendation",()=>{
 const selected=chooseRelevantCv([main,second],{canonical_title:"Retail Merchandising Intern",role_family:"Merchandising"},"main");
 assert.equal(selected.id,"second");
});
