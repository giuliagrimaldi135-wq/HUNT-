import test from "node:test";
import assert from "node:assert/strict";
import {safeCompanyWebsiteURL,findMissingWebsiteLeads} from "./website-seed-policy.mjs";
test("only HTTPS public brand homepages qualify; never upgrade to official",()=>{
 assert.equal(safeCompanyWebsiteURL("https://www.maison-alaia.com/careers?foo=bar"),"https://www.maison-alaia.com/");
 for(const x of ["http://brand.com","https://localhost/","https://127.0.0.1/","https://foo.local/","https://user:pass@brand.com/","https://brand.com:8443/"]){
  assert.equal(safeCompanyWebsiteURL(x),null,x);
 }
});
test("missing Alaia and Antonioli are discoverable without duplicating recorded group careers",()=>{
 const companies=[
  {id:"1",name:"Alaïa",monitored:true,website_url:"https://www.maison-alaia.com"},
  {id:"2",name:"Antonioli",monitored:true,website_url:"https://www.antonioli.eu"},
  {id:"3",name:"Prada",monitored:true,website_url:"https://prada.com"},
  {id:"4",name:"Repeat",monitored:true,website_url:"https://repeat.com"}
 ];
 const sources=[
  {company_id:"3",source_type:"ats",active:true,official:true},
  {company_id:"4",source_type:"brand_website_candidate",active:false,official:false}
 ];
 const seeds=findMissingWebsiteLeads(companies,sources);
 assert.deepEqual(seeds.map(x=>x.company_id),["1","2"]);
 assert.ok(seeds.every(x=>x.official===false && x.metadata.not_a_verified_careers_page===true && x.trust_level<=55));
});
test("strict discovery budget avoids runaway external probing",()=>{
 const list=Array.from({length:32},(_,i)=>({id:String(i),monitored:true,name:"Brand "+i,website_url:"https://brand"+i+".com"}));
 assert.equal(findMissingWebsiteLeads(list,[],12).length,12);
});
