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
 assert.match(result.text,/Nel progetto Gucci/);
 assert.match(result.text,/Showroom Example/);
 assert.doesNotMatch(result.text,/\b(30%|raddoppiato|increased sales|leadership|C1|Excel avanzato)\b/i);
 assert.ok(result.evidence.some(e=>e.origin==="Gucci academic project"));
});
test("English version is professional and uses sourced evidence",()=>{
 const result=generateEditorialLetter({...candidate,language:"en",highlights:merch});
 assert.ok(result?.text.startsWith("Dear Recruitment Team,"));
 assert.match(result.text,/assortment/);
 assert.match(result.text,/Gucci project/);
 assert.doesNotMatch(result.text,/Mi candido|Gentile|Cordiali saluti/);
});
test("Two different vacancies produce genuinely different letters and selected projects",()=>{
 const merchLetter=generateEditorialLetter({...candidate,language:"it",highlights:merch});
 const wholesaleLetter=generateEditorialLetter({...candidate,language:"it",role:"Wholesale Intern",highlights:wholesale});
 assert.notEqual(merchLetter.text,wholesaleLetter.text);
 assert.match(wholesaleLetter.text,/ordini|wholesale/i);
 assert.match(wholesaleLetter.text,/Showroom Example/);
 assert.doesNotMatch(wholesaleLetter.text,/Gucci project|progetto Gucci/);
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

test("Evidence wording never expands order-taking into order entry",()=>{
 const result=generateEditorialLetter({
  ...candidate,language:"it",role:"Wholesale Intern",highlights:wholesale,
  experiences:[{company:"Campaign House",evidence:["Took customer orders during a sales campaign"]}],projects:[]
 });
 assert.ok(result?.text);
 assert.match(result.text,/raccolta degli ordini/);
 assert.doesNotMatch(result.text,/inserimento degli ordini/);
});
test("Planning evidence alone does not fabricate budget management",()=>{
 const result=generateEditorialLetter({
  ...candidate,language:"it",role:"Planning Assistant",
  highlights:[["planning and forecasting","pianificazione e forecasting"]],
  experiences:[{company:"Planning Example",evidence:["Planning and forecasting support"]}],projects:[]
 });
 assert.ok(result?.text);
 assert.match(result.text,/pianificazione/i);
 assert.doesNotMatch(result.text,/budget minimi|gestione budget|pianificazione di prodotto e budget/i);
});
test("Client analysis is not misrepresented as face-to-face retail experience",()=>{
 const result=generateEditorialLetter({
  ...candidate,language:"en",role:"Retail Operations",
  highlights:[["store network coordination","coordinamento operativo della rete retail"]],
  experiences:[{company:"Research Lab",evidence:["Client segmentation analysis"]}],projects:[]
 });
 assert.equal(result,null);
});

test("Editorial output never includes common generated grammar mistakes",()=>{
 const it=generateEditorialLetter({...candidate,language:"it",highlights:merch});
 const en=generateEditorialLetter({...candidate,language:"en",highlights:merch});
 assert.ok(it?.text&&en?.text);
 assert.doesNotMatch(it.text,/su l['’]|legate a selezione|academic project/i);
 assert.doesNotMatch(en.text,/worked on working|assortment work and merchandising-mix work/i);
 assert.ok(it.text.split(" ").length<180);
 assert.ok(en.text.split(" ").length<180);
});

test("A verified application creates a substantial professional draft, not two generic lines",()=>{
 const candidateWithEducation={...candidate,education:[{program:"Fashion Management",school:"Istituto Marangoni Milano"}]};
 for(const language of ["it","en"]){
  const letter=generateEditorialLetter({...candidateWithEducation,language,highlights:merch});
  assert.ok(letter?.text);
  const words=letter.text.trim().split(/\s+/).length;
  assert.ok(words>=135,"The letter should have substantive paragraphs; got "+words+" words in "+language);
  assert.ok(words<=240,"Keep it to a professional one-page letter");
  assert.ok(letter.text.split(/\n\n/).length>=6,"Include opening, motivation, academic and professional evidence, closing");
  assert.match(letter.text,/Marangoni/);
  assert.match(letter.text,/Gucci/);
  assert.match(letter.text,/Showroom Example/);
  assert.doesNotMatch(letter.text,/\b(100%|50% growth|managed a team|led a department)\b/i);
 }
});
