import {test} from "node:test";import assert from "node:assert/strict";
import {mountCvManager} from "../cv-profile.js";
const rows=[
 {id:"main",name:"Merchandising",is_default:true,storage_path:"fake.pdf",parsed_profile:{
  profile_verified_from_user_history:true,raw_text:"A complete private curriculum text was read by HUNT. ".repeat(3),
  experience:[{company:"Marina Rinaldi",role:"Showroom Intern",evidence:[
   "Client welcome and garment presentation during sales campaign",
   "Order taking through Max Mara application using product codes",
   "Order entry and client minimum-budget support",
   "Autonomy with clients during peak traffic"
  ]}],projects:[{name:"Gucci",evidence:["Merchandising mix"]}],education:[],tools:["Excel","PowerPoint"],languages:[]
 }},
 {id:"other",name:"Fashion Management",is_default:false,storage_path:"second.pdf",parsed_profile:{
  raw_text:"Professional profile section. ".repeat(6),draft_profile:{experience:[],projects:[],education:[],tools:["Excel (avanzato)"],languages:[]}
 }}
];
test("Profile displays principal/secondary/delete, Italian evidence and hides manual role assignment",async()=>{
 const root={innerHTML:"",querySelector:()=>null,onclick:null};
 const chain={select(){return this},eq(){return this},order(){return Promise.resolve({data:rows,error:null})}};
 const supabase={from(name){assert.equal(name,"user_cvs");return chain}};
 await mountCvManager(root,{supabase,user:{id:"test-user"},refresh:async()=>{},roleFamilies:["Merchandising"]});
 assert.match(root.innerHTML,/Rendi principale/);
 assert.match(root.innerHTML,/Rendi secondario/);
 assert.match(root.innerHTML,/Elimina/);
 assert.match(root.innerHTML,/Accoglienza clienti e presentazione dei capi/);
 assert.match(root.innerHTML,/Raccolta degli ordini tramite l'applicazione Max Mara/);
 assert.doesNotMatch(root.innerHTML,/Anni pertinenti|Salva destinazioni CV|data-cv-action="read"/);
 assert.match(root.innerHTML,/Competenze e strumenti/);
});
