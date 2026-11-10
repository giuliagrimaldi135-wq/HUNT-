import {test} from "node:test";
import assert from "node:assert/strict";
import {buildOutreachLeads,attachBrandNews,enrichOutreachLeads,chooseOutreachCv,describeOutreachCv,composeOutreachEmail,renderOutreachCards,renderOutreachFolder,analyzeOutreachCv,renderOutreachCvInsight,safeLink,emailAddress} from "../outreach-intelligence.js";
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
 assert.match(renderOutreachCards(a,{}),/Apri analisi/);
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
 assert.match(folder,/Perché contattare/);
 assert.match(folder,/Dove contattare il brand/);
 assert.match(folder,/non HR/);
 assert.match(folder,/HUNT non invia email automaticamente/);
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

test("World Radar adds only exact-brand recent news and never manufactures a new lead",()=>{
 const lead=buildOutreachLeads([sample],[],Date.parse("2026-11-10"))[0];
 const articles=[
  {title:"Label X presenta una nuova collezione",summary:"Label X a Milano",published_at:"2026-11-01",url:"https://example.org/collection"},
  {title:"Label XYZ assume un nuovo manager",summary:"Label XYZ",published_at:"2026-11-02",url:"https://example.org/unrelated"},
  {title:"Label X, la storia del brand",summary:"Label X",published_at:"2025-01-01",url:"https://example.org/stale"},
  {title:"Label X annuncia store",summary:"Label X",published_at:"2026-11-01",url:"javascript:alert(1)"}
 ];
 const withNews=attachBrandNews([lead],articles,Date.parse("2026-11-10"));
 assert.equal(withNews.length,1);
 assert.equal(withNews[0].news.length,1);
 assert.match(renderOutreachFolder(withNews[0]),/NOTIZIE E FONTI/);
 assert.match(renderOutreachFolder(withNews[0]),/nuova collezione/);
});


test("A merchandising-oriented spontaneous contact recommends specialist CV over principal generic CV",()=>{
 const lead=buildOutreachLeads([sample],[],Date.parse("2026-11-10"))[0];
 const cvs=[{id:"a",name:"fashion management",is_default:true},{id:"b",name:"Merchandising"}];
 assert.equal(chooseOutreachCv(cvs,lead.area).id,"b");
 const html=renderOutreachFolder(lead,{cvs});
 assert.match(html,/HUNT sceglierebbe <strong>Merchandising/);
 assert.match(html,/<option value="b" selected>/);
});

test("Official social profiles are linked as sources, not presented as scanned posts",()=>{
 const lead=buildOutreachLeads([sample],[],Date.parse("2026-11-10"))[0];
 const richer=enrichOutreachLeads([lead],{"label-x":{
  company_url:"https://label-x.example",
  official_profiles:[{platform:"Instagram",url:"https://www.instagram.com/labelx",source_url:"https://label-x.example",status:"link dal sito ufficiale"},
   {platform:"TikTok",url:"https://www.tiktok.com/@labelx",source_url:"https://label-x.example",status:"link dal sito ufficiale"}],
  articles:[{title:"New flagship",publisher:"Fashion Press",date:"2026-09-25",url:"https://example.org/flagship"}],
  email_hook:"Ho seguito l’apertura del nuovo negozio milanese.",
  message_angle:"La nuova presenza retail rende rilevanti assortimenti e merchandising."
 }})[0];
 const html=renderOutreachFolder(richer);
 assert.match(html,/Instagram/);
 assert.match(html,/TikTok/);
 assert.match(html,/link dal sito ufficiale/);
 assert.match(html,/non post acquisiti automaticamente/);
 assert.match(html,/Fashion Press/);
 assert.match(composeOutreachEmail(richer).body,/Ho seguito l’apertura del nuovo negozio/);
 assert.doesNotMatch(html,/post Instagram acquisiti|post TikTok acquisiti/);
});

test("Brand-specific editorial brief replaces generic dashboard empty-news cards",()=>{
 const lead=buildOutreachLeads([sample],[],Date.parse("2026-11-10"))[0];
 const html=renderOutreachFolder(lead);
 assert.match(html,/Perché contattare/);
 assert.match(html,/Scheda candidatura/);
 assert.match(html,/Email pronta da personalizzare/);
 assert.match(html,/NOTIZIE E FONTI/);
 assert.doesNotMatch(html,/Non risultano altri articoli recenti|Nessun altro segnale recente|News del brand da conoscere/);
});

test("Original approved folder labels stay clear and message angle is explicit",()=>{
 const lead=buildOutreachLeads([sample],[],Date.parse("2026-11-10"))[0];
 const enhanced=enrichOutreachLeads([lead],{"label-x":{message_angle:"Il nuovo negozio richiede una gestione attenta degli assortimenti."}})[0];
 const html=renderOutreachFolder(enhanced);
 assert.match(html,/Perché contattare/);
 assert.match(html,/Scheda candidatura/);
 assert.match(html,/PERCHÉ PUÒ ESSERE INTERESSANTE/);
 assert.match(html,/Email pronta da personalizzare/);
 assert.match(html,/Dove contattare il brand/);
 assert.match(html,/NOTIZIE E FONTI/);
});


test("Fresh company-profile verification cannot make an old store opening look recent",()=>{
 const item={...sample,key:"old-store",brand:"OldStore",signals:[
  {date:"2026-04-30",type:"first_permanent_store",description:"Inaugurazione del negozio",url:"https://example.org/store"},
  {date:"2026-11-09",type:"company_profile_verification",description:"Profilo LinkedIn aziendale verificato",url:"https://www.linkedin.com/company/oldstore"}
 ]};
 const leads=buildOutreachLeads([item],[],Date.parse("2026-11-10"));
 assert.equal(leads.length,1);
 assert.equal(leads[0].dated,false);
 assert.match(renderOutreachCards(leads),/DAL MONDO DEL BRAND/);
});

test("Switching between two confirmed CVs changes subject, project evidence and motivation",()=>{
 const lead=buildOutreachLeads([sample],[],Date.parse("2026-11-10"))[0];
 const cvs=[
  {id:"one",name:"fashion management",is_default:true,parsed_profile:{
   profile_confirmed_by_user:true,education:[{program:"Fashion Management",school:"Scuola Test"}],
   experience:[{company:"Studio Uno",role:"Showroom Intern"}],projects:[{name:"Brand strategy"}]}},
  {id:"two",name:"Merchandising",is_default:false,parsed_profile:{
   profile_confirmed_by_user:true,education:[{program:"Fashion Management",school:"Scuola Test"}],
   experience:[{company:"Studio Uno",role:"Showroom Intern"}],
   projects:[{name:"Assortment Gucci",evidence:["Buying plan"]}],tools:["Excel (avanzato)"]}}
 ];
 const user={display_name:"Utente Esempio"},personalization={interest_areas:["Retail Merchandising"],communication_style:"naturale"};
 const a=composeOutreachEmail(lead,cvs[0],user,personalization);
 const b=composeOutreachEmail(lead,cvs[1],user,personalization);
 assert.equal(a.verifiedCv,true);
 assert.equal(b.verifiedCv,true);
 assert.doesNotMatch(a.subject,/Merchandising e Retail Planning/);
 assert.match(b.subject,/Merchandising e Retail Planning/);
 assert.doesNotMatch(a.body,/Assortment Gucci/);
 assert.match(b.body,/Assortment Gucci/);
 assert.doesNotMatch(b.body,/Tra gli strumenti|Excel \(avanzato\)/);
 assert.match(b.body,/Utente Esempio/);
 assert.match(describeOutreachCv(cvs[1],lead.area).text,/Email adattata alle informazioni confermate/);
 const html=renderOutreachFolder(lead,{cvs,cvId:"two",person:user,preferences:personalization});
 assert.match(html,/<option value="two" selected>/);
 assert.match(html,/id="outCvReason"/);
 assert.match(html,/Assortment Gucci/);
});
test("Each user receives their own confirmed CV facts and signature without cross-user leakage",()=>{
 const lead=buildOutreachLeads([sample],[],Date.parse("2026-11-10"))[0];
 const first={id:"1",name:"Merchandising",parsed_profile:{profile_confirmed_by_user:true,experience:[{company:"Azienda Alfa"}]}};
 const second={id:"2",name:"Merchandising",parsed_profile:{profile_confirmed_by_user:true,experience:[{company:"Azienda Beta"}]}};
 const a=composeOutreachEmail(lead,first,{display_name:"Utente Alfa"});
 const b=composeOutreachEmail(lead,second,{display_name:"Utente Beta"});
 assert.match(a.body,/Azienda Alfa/);
 assert.doesNotMatch(a.body,/Azienda Beta|Utente Beta/);
 assert.match(b.body,/Azienda Beta/);
 assert.doesNotMatch(b.body,/Azienda Alfa|Utente Alfa/);
});
test("Real editorial articles are visible as brand news, without empty placeholders",()=>{
 const lead=buildOutreachLeads([sample],[],Date.parse("2026-11-10"))[0];
 const withPress=enrichOutreachLeads([lead],{"label-x":{articles:[{
  title:"Label X apre un nuovo store a Milano",publisher:"Stampa Moda",date:"2026-10-20",url:"https://example.org/new-store"
 }]}})[0];
 const html=renderOutreachFolder(withPress);
 assert.match(html,/News & fonti/);
 assert.match(html,/Stampa Moda/);
 assert.match(html,/brandGlobalNewsList/);
 assert.ok(html.indexOf("brandGlobalNewsList")>html.indexOf("outLetter"));
 const without=renderOutreachFolder(lead);
 assert.doesNotMatch(without,/Nessuna news|non risultano altri articoli|outNewsPreview/);
});

test("Opportunity-style outreach dossier has the right reading order and source filters at the end",()=>{
 const lead=buildOutreachLeads([sample],[],Date.parse("2026-11-10"))[0];
 const enhanced=enrichOutreachLeads([lead],{"label-x":{outreach_story:"Il brand ha aperto il primo negozio.",outreach_relevance:"Una candidatura commerciale può avere senso.",outreach_caution:"Nessuna assunzione verificata.",articles:[{title:"Il primo negozio",publisher:"Stampa Moda",date:"2026-10-02",url:"https://example.org/store-story"}]}})[0];
 const html=renderOutreachFolder(enhanced);
 assert.match(html,/outBrandHero/);
 assert.match(html,/class="outSectionNav"/);
 assert.match(html,/brandGlobalNewsList/);
 assert.match(html,/brandNewsItem/);
 assert.match(html,/data-outreach-news-filter="press"/);
 assert.match(html,/data-outreach-news-filter="radar"/);
 assert.ok(html.indexOf('id="outNews"')>html.indexOf('id="outLetter"'));
 assert.ok(html.indexOf('id="outNews"')>html.indexOf('outV3Contact'));
 assert.match(html,/Il brand ha aperto il primo negozio/);
 assert.equal(enhanced.outreachCaution,"Nessuna assunzione verificata.");
 assert.doesNotMatch(html,/Nessuna assunzione verificata/);
});

test("Three tabs are exclusive panels: brand visible, candidate and news hidden",()=>{
 const lead=buildOutreachLeads([sample],[],Date.parse("2026-11-10"))[0];
 const html=renderOutreachFolder(lead);
 assert.match(html,/role="tablist"/);
 assert.match(html,/id="outReason" role="tabpanel"[^>]*data-outreach-panel="reason"/);
 assert.match(html,/id="outApplication" role="tabpanel"[^>]*data-outreach-panel="application" hidden/);
 assert.match(html,/id="outNews" role="tabpanel"[^>]*data-outreach-panel="news" hidden/);
 assert.match(html,/Scheda candidatura/);
 assert.match(html,/Dove contattare il brand/);
 assert.ok(html.indexOf('id="outNews"')>html.indexOf('id="outApplication"'));
});

test("Brand overview uses editorial evidence and interpretation, not the previous green summary box",()=>{
 const lead=buildOutreachLeads([sample],[],Date.parse("2026-11-10"))[0];
 const detailed=enrichOutreachLeads([lead],{"label-x":{
  outreach_story:"Il brand ha aperto un negozio documentato.",
  outreach_relevance:"Un contatto junior nel merchandising può essere pertinente.",
  outreach_caution:"Non è un annuncio di assunzione."
 }})[0];
 const html=renderOutreachFolder(detailed);
 assert.match(html,/outBrandInsightGrid/);
 assert.match(html,/outSignalNarrative/);
 assert.match(html,/outEditorialInterpretation/);
 assert.match(html,/IL MOVIMENTO DOCUMENTATO/);
 assert.match(html,/PERCHÉ PUÒ ESSERE INTERESSANTE/);
 assert.doesNotMatch(html,/outV3Relevance/);
});
test("Candidate section is only full-width CV selector, without redundant area and message-angle fields",()=>{
 const lead=buildOutreachLeads([sample],[],Date.parse("2026-11-10"))[0];
 const html=renderOutreachFolder(lead,{cvs:[{id:"x",name:"fashion management",is_default:true}]});
 assert.match(html,/outCandidateDecision/);
 assert.match(html,/Curriculum per questo brand/);
 assert.match(html,/HUNT sceglierebbe/);
 assert.doesNotMatch(html,/ANGOLO DEL MESSAGGIO|outPrepareColumns|<span class="outMiniTitle">AREA<\/span>/);
});
test("Brand strategy project is never inserted as irrelevant filler in merchandising outreach",()=>{
 const lead=buildOutreachLeads([sample],[],Date.parse("2026-11-10"))[0];
 const cv={id:"brand",name:"fashion management",parsed_profile:{
  profile_confirmed_by_user:true,
  education:[{program:"Fashion Management",school:"Istituto Marangoni"}],
  experience:[{company:"Marina Rinaldi",role:"Showroom Intern"}],
  projects:[{name:"Valentino - Brand strategy",evidence:["Brand strategy"]}]
 }};
 const email=composeOutreachEmail(lead,cv,{display_name:"Candidata"});
 assert.match(email.body,/Marina Rinaldi/);
 assert.doesNotMatch(email.body,/Valentino|Ho sviluppato inoltre un progetto dedicato|lavorando su strategia di brand/);
});

test("Sourced commercial context remains but unresolved flagship warning is not shown to candidates",()=>{
 const lead=buildOutreachLeads([sample],[],Date.parse("2026-11-10"))[0];
 const checked=enrichOutreachLeads([lead],{"label-x":{
   outreach_story:"Nuova collezione presentata a Milano.",
   outreach_relevance:"Un contatto in merchandising può essere pertinente.",
   outreach_caution:"Progetto flagship non verificato: non mostrare come evento avvenuto."
 }})[0];
 const html=renderOutreachFolder(checked);
 assert.match(html,/Nuova collezione presentata a Milano/);
 assert.doesNotMatch(html,/Progetto flagship non verificato/);
 assert.match(html,/outEditorialInterpretation/);
});
test("Application preserves priority and candidacy status, with a full-width CV section and no repeated area",()=>{
 const lead=buildOutreachLeads([sample],[],Date.parse("2026-11-10"))[0];
 const html=renderOutreachFolder(lead,{draft:{status:"preparing",subject:"Oggetto",email_body:"Testo"},cvs:[{id:"cv1",name:"Merchandising",is_default:true}]});
 assert.match(html,/outCandidateDecision/);
 assert.match(html,/CONTATTO MIRATO/);
 assert.match(html,/In preparazione/);
 assert.match(html,/outCandidateDecision/);
 assert.doesNotMatch(html,/ANGOLO DEL MESSAGGIO|<span class="outMiniTitle">AREA/);
});
test("Luxury brand discovery feed uses concise verified headlines instead of repeating the full analysis",()=>{
 const lead=buildOutreachLeads([sample],[],Date.parse("2026-11-10"))[0];
 const enrich=enrichOutreachLeads([lead],{"label-x":{
  preview_title:"Nuova apertura · Retail",
  preview_summary:"Una novità commerciale documentata.",
  outreach_story:"Una lunghissima analisi del contesto commerciale non deve apparire nella lista."
 }})[0];
 const html=renderOutreachCards([enrich]);
 assert.match(html,/outEditorialRow/);
 assert.match(html,/Nuova apertura · Retail/);
 assert.match(html,/Una novità commerciale documentata/);
 assert.match(html,/Apri analisi/);
 assert.doesNotMatch(html,/Una lunghissima analisi/);
});

test("User-confirmed experience and project evidence determine CV recommendation beyond filename",()=>{
 const lead=buildOutreachLeads([sample],[],Date.parse("2026-11-10"))[0];
 const first={id:"generic",name:"fashion management",is_default:true,parsed_profile:{
  profile_confirmed_by_user:true,experience:[{company:"Azienda Uno",role:"Brand assistant",evidence:["Assistenza agli eventi"]}],
  projects:[{name:"Valentino Brand Strategy",evidence:["Analisi del posizionamento"]}]}};
 const specialist={id:"specific",name:"Merchandising",parsed_profile:{
  profile_confirmed_by_user:true,
  experience:[{company:"Azienda Due",role:"Showroom Intern",evidence:["Gestione ordini durante campagna vendite"]}],
  projects:[{name:"Gucci",evidence:["Pianificazione assortimenti e buying plan"]}]}};
 const picked=chooseOutreachCv([first,specialist],lead.area,lead);
 assert.equal(picked.id,"specific");
 const report=analyzeOutreachCv(lead,specialist);
 assert.ok(report.highlights.length>=2);
 assert.match(renderOutreachCvInsight(lead,specialist),/Gestione ordini durante campagna vendite/);
 assert.match(renderOutreachCvInsight(lead,specialist),/Pianificazione assortimenti e buying plan/);
 const html=renderOutreachFolder(lead,{cvs:[first,specialist]});
 assert.match(html,/<option value="specific" selected>/);
 assert.match(html,/outCvEvidence/);
 assert.match(html,/DAL TUO CV CONFERMATO/);
});
test("Unverified CVs do not surface names or invented evidence in the comparison",()=>{
 const lead=buildOutreachLeads([sample],[],Date.parse("2026-11-10"))[0];
 const unconfirmed={id:"bad",name:"Merchandising",parsed_profile:{experience:[
  {company:"Unverified Famous Studio",evidence:["I raised revenue by 800%"]}]}};
 const analysis=analyzeOutreachCv(lead,unconfirmed);
 assert.equal(analysis.confirmed,false);
 const html=renderOutreachCvInsight(lead,unconfirmed);
 assert.doesNotMatch(html,/Unverified Famous Studio|800%/);
 assert.match(html,/Conferma le informazioni/);
});
test("Brand discovery list has a distinct compact, source-linked editorial presentation",()=>{
 const lead=buildOutreachLeads([sample],[],Date.parse("2026-11-10"))[0];
 const html=renderOutreachCards([lead]);
 assert.match(html,/outResultsV6/);
 assert.match(html,/outEditorialRow/);
 assert.match(html,/DAL MONDO DEL BRAND/);
 assert.match(html,/https:\/\/example.org\/real-story/);
 assert.doesNotMatch(html,/Dossier disponibile|outLeadV5|Apri il dossier/);
});
