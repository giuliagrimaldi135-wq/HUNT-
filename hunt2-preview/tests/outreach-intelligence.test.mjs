import {test} from "node:test";
import assert from "node:assert/strict";
import {buildOutreachLeads,composeOutreachEmail,renderOutreachCards,renderOutreachFolder,safeLink,emailAddress} from "../outreach-intelligence.js";
const sample={
 key:"label-x",brand:"Label X",score:95,area:"Retail Merchandising",
 why_now:"Il brand ha annunciato un nuovo negozio a Milano.",
 source_url:"https://example.org/real-story",contact:"info@label-x.example",
 contact_source_url:"https://label-x.example/pages/contacts",
 signals:[{date:"2026-09-21",type:"first_permanent_store",description:"Nuovo negozio aperto a Milano",url:"https://example.org/real-story"}],
 updated_at:"2026-11-09T08:30:00Z"
};
test("Only sourced, relevant outreach signals enter the feed",()=>{
 const a=buildOutreachLeads([sample,{...sample,key:"unsourced",brand:"Unsourced",source_url:"",signals:[]},{...sample,key:"unrelated",brand:"Unrelated",signals:[{date:"2026-10-09",type:"sustainability",description:"Award",url:"https://example.org/award"}]}],[],Date.parse("2026-11-10"));
 assert.equal(a.length,1);
 assert.equal(a[0].brand,"Label X");
 assert.equal(a[0].contactEmail,"info@label-x.example");
 assert.match(renderOutreachCards(a,{}),/Apri folder/);
 assert.doesNotMatch(renderOutreachCards(a,{}),/95% match/);
});
test("Social URLs are not proof of an integrated feed; unrelated corporation news does not create recommendations",()=>{
 const signals=[
  {id:"1",signal_type:"retail_expansion",title:"Flagship in Milan",published_at:"2026-11-05",source_url:"https://example.org/news",companies:{name:"Big Group",is_independent:false,size_band:"large"}},
  {id:"2",signal_type:"retail_expansion",title:"New small label shop",published_at:"2026-11-05",source_url:"https://example.org/small-shop",companies:{name:"Small Label",is_independent:true,size_band:"small"}}
 ];
 const a=buildOutreachLeads([],signals,Date.parse("2026-11-10"));
 assert.equal(a.length,1);
 assert.equal(a[0].brand,"Small Label");
 assert.equal(a[0].contactEmail,"");
});
test("No fabricated recruitment contact or CV experience from unconfirmed extraction",()=>{
 const a=buildOutreachLeads([sample],[],Date.parse("2026-11-10"))[0];
 const cv={parsed_profile:{raw_text:"Worked at FamousBrand",experience:[{company:"FamousBrand"}],education:[{school:"Famous School",program:"Fashion"}]}};
 const draft=composeOutreachEmail(a,cv,{display_name:"Test User"});
 assert.doesNotMatch(draft.body,/FamousBrand|Famous School/);
 assert.match(draft.body,/Test User/);
 const folder=renderOutreachFolder(a,{cvs:[{id:"1",name:"General CV",is_default:true,parsed_profile:cv.parsed_profile}],person:{display_name:"Test User"}});
 assert.match(folder,/Email pronta da personalizzare/);
 assert.match(folder,/Perché candidarti adesso/);
 assert.match(folder,/Dove contattare il brand/);
 assert.match(folder,/Contatto pubblico generale, non identificato come recruiting/);
 assert.match(folder,/HUNT non spedisce email automaticamente/);
});
test("Confirmed CV evidence may appear in email without inventing achievements",()=>{
 const a=buildOutreachLeads([sample],[],Date.parse("2026-11-10"))[0];
 const cv={parsed_profile:{profile_confirmed_by_user:true,experience:[{company:"Studio Uno"}],education:[{school:"College Uno",program:"Fashion Management"}]}};
 const draft=composeOutreachEmail(a,cv,{display_name:"Test User"});
 assert.match(draft.body,/Studio Uno/);
 assert.match(draft.body,/College Uno/);
 assert.doesNotMatch(draft.body,/ho aumentato le vendite|anni di esperienza/i);
});
test("All external links require http(s) and data is escaped before insertion",()=>{
 assert.equal(safeLink("javascript:alert(1)"),"");
 assert.equal(emailAddress("please contact me on LinkedIn"),"");
 const evil={...sample,brand:'<img src=x onerror="alert(1)">',contact:"info@label-x.example",source_url:"javascript:alert(1)"};
 assert.equal(buildOutreachLeads([evil]).length,0);
 const a=buildOutreachLeads([{...sample,brand:'<img src=x onerror="alert(1)">'}],[],Date.parse("2026-11-10"))[0];
 const html=renderOutreachFolder(a);
 assert.doesNotMatch(html,/<img src=x/);
 assert.match(html,/&lt;img src=x/);
});
