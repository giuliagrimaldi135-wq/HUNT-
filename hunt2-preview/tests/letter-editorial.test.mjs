import { test } from "node:test";
import assert from "node:assert/strict";
import { generateEditorialLetter } from "../../v2/supabase/functions/hunt-application-dossier/letter-editorial.js";

const candidate={
 verified:true,name:"Test Candidate",company:"Example Fashion",role:"Retail Merchandising Intern",
 experiences:[
  {company:"Showroom Example",evidence:["Welcomed clients and presented garments","Entered sales campaign orders using product codes"]},
  {company:"Warehouse Example",evidence:["Stock allocation and inventory management"]}
 ],
 projects:[
  {name:"Gucci academic project",evidence:["Merchandising mix and assortment","Capsule collection planning and product costing"]},
  {name:"Alaia academic project",evidence:["Retail assortment, OTB and KPI analysis"]}
 ]
};
const merch=[["assortment and product selection","selezione di prodotto e assortimento"],["commercial performance and sell-through analysis","analisi vendite e performance"]];
const wholesale=[["wholesale and order management","gestione ordini e processi wholesale"]];

test("Italian merchandising letter uses actual vacancy duties and relevant CV examples",()=>{
 const result=generateEditorialLetter({...candidate,language:"it",highlights:merch});
 assert.ok(result?.text);
 assert.match(result.text,/Example Fashion/);
 assert.match(result.text,/Retail Merchandising Intern/);
 assert.match(result.text,/assortimento/i);
 assert.match(result.text,/Gucci academic project/);
 assert.match(result.text,/Showroom Example/);
 assert.doesNotMatch(result.text,/\b(30%|raddoppiato|increased sales|leadership|C1|Excel avanzato)\b/i);
 assert.ok(result.evidence.some(e=>e.origin==="Gucci academic project"));
});
test("English version is professional and uses sourced evidence",()=>{
 const result=generateEditorialLetter({...candidate,language:"en",highlights:merch});
 assert.ok(result?.text.startsWith("Dear Recruitment Team,"));
 assert.match(result.text,/assortment/);
 assert.match(result.text,/Gucci academic project/);
 assert.doesNotMatch(result.text,/Mi candido|Gentile|Cordiali saluti/);
});
test("Two different vacancies produce genuinely different letters and selected projects",()=>{
 const merchLetter=generateEditorialLetter({...candidate,language:"it",highlights:merch});
 const wholesaleLetter=generateEditorialLetter({...candidate,language:"it",role:"Wholesale Intern",highlights:wholesale});
 assert.notEqual(merchLetter.text,wholesaleLetter.text);
 assert.match(wholesaleLetter.text,/ordini|wholesale/i);
 assert.match(wholesaleLetter.text,/Showroom Example/);
 assert.doesNotMatch(wholesaleLetter.text,/Gucci academic project/);
});
test("No letter without user-confirmed CV or real vacancy responsibilities",()=>{
 assert.equal(generateEditorialLetter({...candidate,verified:false,language:"it",highlights:merch}),null);
 assert.equal(generateEditorialLetter({...candidate,language:"it",highlights:[]}),null);
 assert.equal(generateEditorialLetter({...candidate,language:"it",highlights:wholesale,experiences:[],projects:[]}),null);
});
test("No unrelated generic placement becomes proof of a specialist role",()=>{
 const result=generateEditorialLetter({...candidate,experiences:[{company:"Generic Office",evidence:["Answered phone calls"]}],projects:[],highlights:merch,language:"en"});
 assert.equal(result,null);
});
