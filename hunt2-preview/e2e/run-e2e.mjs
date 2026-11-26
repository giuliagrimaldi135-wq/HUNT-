#!/usr/bin/env node
// End-to-end check of the official HUNT (hunt2-preview) with an account.
//
//   Rehearsal on fake data (no network, no Supabase):
//     node hunt2-preview/e2e/run-e2e.mjs --mode=fake
//   Real check after the Supabase unlock, READ-ONLY (login, every section,
//   one dossier; it never saves, applies, hides, uploads or deletes anything):
//     HUNT_E2E_EMAIL=... HUNT_E2E_PASSWORD=... node hunt2-preview/e2e/run-e2e.mjs --mode=live
//   Options: --base=<url of hunt2-preview/>  --out=<folder for screenshots and report>
//
// Credentials come only from environment variables and are never printed or saved.
import {createServer} from "node:http";
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {extname,join,normalize,resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const {chromium}=require("playwright");
const HERE=dirname(fileURLToPath(import.meta.url));
const REPO=resolve(HERE,"..","..");
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,"").split("=")).map(([k,v])=>[k,v??"1"]));
const MODE=args.mode||"fake";
const OUT=resolve(args.out||join(process.cwd(),"hunt-e2e-report"));
if(!["fake","live"].includes(MODE)){console.error("Use --mode=fake or --mode=live");process.exit(2)}

const DAY=86400000,iso=ms=>new Date(ms).toISOString(),now=Date.now();
export function seedData(){
 const user="11111111-1111-4111-8111-111111111111";
 const company={id:"c1",name:"Prada Group",careers_url:"https://jobs.pradagroup.com/"};
 const description="The Merchandising Intern supports the Eyewear merchandising team in Milan. Responsibilities: analyse sell-out and stock data, prepare assortment proposals for each collection, update line sheets and coordinate with product development. Requirements: university degree in economics or fashion management, advanced Excel, fluent English and Italian, strong attention to detail.";
 const job=(id,title,role,city,days)=>({id,company_id:"c1",canonical_title:title,role_family:role,seniority:"internship",city,remote_mode:"onsite",
  vacancy_confidence:0.95,confidence_label:"VERIFIED ACTIVE",last_verified_at:iso(now-3600000),published_at:iso(now-days*DAY),first_seen_at:iso(now-days*DAY),
  primary_apply_url:`https://jobs.pradagroup.com/job/Milano/${id}`,state:"active_verified",description,metadata:{public_ats:"ats_successfactors"},companies:company});
 const jobs=[job("j1","Eyewear Collection Merchandising Intern","Merchandising","Milano",1),
  job("j2","Buying Intern - Womenswear","Buying","Milano",3),job("j3","Merchandising Planning Intern","Merchandising","Milano",6)];
 return {
  auth_users:[{id:user,email:"giulia.prova@example.test",password:"prova-e2e-123"}],
  profiles:[{user_id:user,first_name:"Giulia",last_name:"Prova",display_name:"Giulia Prova",seniority:"internship",onboarding_completed:true}],
  career_preferences:[{user_id:user,primary_role_families:["Merchandising","Buying"],secondary_role_families:[],preferred_locations:["Milano"],relocation_locations:["Parigi"],employment_types:["internship"],preferences:{radar_scope:"smart"}}],
  user_personalization:[{user_id:user,interest_areas:["product_assortment"],next_experience_drivers:["skills"],company_preference:"both",avoid_role_traits:[],completed:true}],
  user_cvs:[{id:"cv1",user_id:user,name:"CV Merchandising",storage_path:user+"/cv1.pdf",target_role_families:["Merchandising"],is_default:true,active:true,created_at:iso(now-10*DAY),updated_at:iso(now-10*DAY),
   parsed_profile:{raw_text:"Giulia Prova. Laurea in Economia e Management della Moda. Stage in merchandising presso un brand di accessori: analisi sell-out, Excel avanzato, inglese fluente.",profile_confirmed_by_user:true,
    experience:[{role:"Merchandising Intern",company:"Brand accessori",bullets:["Analisi sell-out settimanale","Aggiornamento line sheet"]}],education:[{degree:"Laurea in Economia e Management della Moda"}],tools:["Excel avanzato"],languages:["Italiano madrelingua","Inglese fluente"]}}],
  jobs,
  user_job_matches:jobs.map((j,i)=>({id:"m"+i,user_id:user,job_id:j.id,match_score:86-i*4,priority_score:90-i*5,reasons:["Area professionale scelta","Città scelta"],gaps:[],jobs:j})),
  applications:[],user_job_feedback:[],user_job_dossiers:[],repost_events:[],user_news_reads:[],user_outreach_drafts:[],
  company_signals:[{id:"s1",company_id:"c1",signal_type:"news",title:"Prada Group pubblica i risultati del trimestre",summary:"Comunicato ufficiale.",source_name:"Prada Group",source_url:"https://www.pradagroup.com/",published_at:iso(now-2*DAY),detected_at:iso(now-2*DAY),relevance_score:0.8,companies:{name:"Prada Group"}}],
  world_news_items:[{id:"n1",theme:"industry",title:"Il lusso in Europa a fine 2026",summary:"Analisi di mercato.",url:"https://example.org/news/1",published_at:iso(now-DAY),detected_at:iso(now-DAY),relevance_score:0.7,evidence:{},world_news_sources:{publisher:"Testata di prova",region:"europe",language:"it"}}]
 };
}

const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".webmanifest":"application/manifest+json"};
async function serveRepo(){
 const server=createServer(async(req,res)=>{
  try{
   const path=normalize(decodeURIComponent(new URL(req.url,"http://x").pathname)).replace(/^([/\\])+/,"");
   let file=join(REPO,path);
   if(!file.startsWith(REPO)){res.writeHead(403).end();return}
   if(file.endsWith("/")||!extname(file))file=join(file,"index.html");
   const body=await readFile(file);
   res.writeHead(200,{"content-type":MIME[extname(file)]||"application/octet-stream"}).end(body);
  }catch{res.writeHead(404).end()}
 });
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 return {server,base:`http://127.0.0.1:${server.address().port}/hunt2-preview/`};
}

const results=[];
let shot=0;
async function step(page,name,fn){
 const started=Date.now();
 try{await fn();results.push({name,ok:true,ms:Date.now()-started});console.log("  ✓ "+name)}
 catch(e){
  const file=join(OUT,`fail-${++shot}.png`);
  await page.screenshot({path:file,fullPage:true}).catch(()=>{});
  results.push({name,ok:false,error:String(e?.message||e).split("\n")[0],screenshot:file});
  console.log("  ✗ "+name+" — "+String(e?.message||e).split("\n")[0]);
 }
}
async function healthy(page,errors,label){
 await page.waitForTimeout(400);
 const bad=await page.$$eval(".msg.bad, .folderError, .worldReadError:not([hidden])",els=>els.filter(e=>e.offsetParent!==null).map(e=>e.textContent.trim().slice(0,160)));
 if(bad.length)throw new Error(label+": messaggio di errore visibile «"+bad[0]+"»");
 if(errors.length)throw new Error(label+": errore JavaScript «"+errors.splice(0).join(" | ").slice(0,200)+"»");
 const wide=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
 if(wide)throw new Error(label+": la pagina scorre in orizzontale");
}
async function openView(page,mobile,view){
 const nav=mobile?".mobileNav":".nav";
 const before=await page.textContent(".main h1").catch(()=>"");
 await page.click(`${nav} [data-view="${view}"]`);
 await page.waitForFunction(b=>{const h=document.querySelector(".main h1");return h&&h.textContent!==b},before,{timeout:20000}).catch(()=>{});
 await page.waitForSelector(".main h1",{timeout:20000});
}

async function memberJourney(browser,base,{email,password,mobile,label,expectJobs}){
 const context=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1366,height:900}});
 await prepare(context);
 const page=await context.newPage();
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 console.log(`\n${label}`);
 await step(page,"Pagina di accesso",async()=>{await page.goto(base,{waitUntil:"domcontentloaded"});await page.waitForSelector("#authForm",{timeout:20000})});
 await step(page,"Accesso con l'account",async()=>{
  await page.fill("#email",email);await page.fill("#password",password);await page.click("#loginBtn");
  await page.waitForSelector(".shell .main h1, #onboarding, #personalizationForm, .msg.bad",{timeout:30000});
  if(await page.$(".authWrap .msg.bad"))throw new Error("accesso rifiutato: "+(await page.textContent(".authWrap .msg.bad")).trim().slice(0,160));
  if(!await page.$(".shell"))throw new Error("l'account non ha completato onboarding o personalizzazione");
 });
 if(!await page.$(".shell")){await context.close();return}
 await step(page,"Opportunità",async()=>{
  await page.waitForSelector(".opportunitiesPage",{timeout:30000});
  await healthy(page,errors,"Opportunità");
  const cards=await page.$$eval(".opportunityList .jobCard",x=>x.length);
  results.at(-1).detail=cards+" posizioni";
  if(expectJobs&&!cards)throw new Error("nessuna posizione nel feed");
 });
 if(await page.$("[data-open-dossier]")){
  await step(page,"Dossier della prima posizione",async()=>{
   await page.click("[data-open-dossier]");
   await page.waitForSelector(".folderHero, .folderError",{timeout:45000});
   await healthy(page,errors,"Dossier");
   await page.goBack();await page.waitForSelector(".opportunitiesPage",{timeout:30000});
  });
 }else results.push({name:"Dossier della prima posizione",ok:true,skipped:true,detail:"nessun dossier apribile (manca il CV o il feed è vuoto)"});
 for(const [view,name] of [["outreach","Brand da contattare"],["radar","Fashion News"],["applications","Candidature"],["profile","Profilo e CV"]]){
  await step(page,name,async()=>{await openView(page,mobile,view);await healthy(page,errors,name)});
 }
 await step(page,"Uscita",async()=>{
  await openView(page,mobile,"profile");await page.click("#logoutBtn");await page.waitForSelector("#authForm",{timeout:15000});
 });
 await context.close();
}

async function newMemberJourney(browser,base){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await prepare(context);
 const page=await context.newPage();
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 console.log("\nNuova iscritta (telefono, dati finti)");
 await step(page,"Iscrizione",async()=>{
  await page.goto(base,{waitUntil:"domcontentloaded"});await page.waitForSelector("#authForm");
  await page.fill("#email","nuova.iscritta@example.test");await page.fill("#password","prova-e2e-456");await page.click("#signupBtn");
  await page.waitForSelector("#onboarding",{timeout:20000});
 });
 await step(page,"Onboarding senza CV",async()=>{
  await page.fill('input[name="first_name"]',"Anna");await page.fill('input[name="last_name"]',"Prova");
  await page.check('input[name="primary"][value="Merchandising"]');
  await page.fill("#preferredCity","Milano");await page.press("#preferredCity","Enter");
  await page.click('#onboarding [type="submit"]');
  await page.waitForSelector("#personalizationForm",{timeout:20000});await healthy(page,errors,"Onboarding");
 });
 await step(page,"Personalizzazione",async()=>{
  await page.check('input[name="interest_area"] >> nth=0');await page.check('input[name="next_driver"] >> nth=0');
  await page.click('#personalizationForm [type="submit"]');
  await page.waitForSelector(".shell .main h1",{timeout:20000});await healthy(page,errors,"Primo accesso");
 });
 await step(page,"Feed senza CV",async()=>{
  await page.waitForSelector(".opportunitiesPage",{timeout:20000});await healthy(page,errors,"Feed senza CV");
  const cards=await page.$$eval(".opportunityList .jobCard",x=>x.length);
  results.at(-1).detail=cards+" posizioni da esplorare";
  if(!cards)throw new Error("una nuova iscritta senza CV non vede posizioni reali della sua area");
  if(await page.$(".opportunityList .matchPill:text-matches('%')"))throw new Error("senza CV compare una percentuale di compatibilità");
 });
 await context.close();
}

let prepare=async()=>{};
async function main(){
 await mkdir(OUT,{recursive:true});
 const browser=await chromium.launch();
 let server=null,base=args.base||"https://giuliagrimaldi135-wq.github.io/HUNT-/hunt2-preview/";
 try{
  if(MODE==="fake"){
   const served=await serveRepo();server=served.server;base=served.base;
   const fake=await readFile(join(HERE,"fake-supabase.mjs"),"utf8");
   const seed=seedData();
   prepare=async context=>{
    await context.route("https://cdn.jsdelivr.net/npm/@supabase/**",route=>route.fulfill({contentType:"text/javascript",body:fake}));
    await context.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
    await context.addInitScript(s=>{globalThis.__HUNT_FAKE_SEED__=s},seed);
   };
   await memberJourney(browser,base,{email:"giulia.prova@example.test",password:"prova-e2e-123",mobile:false,label:"Iscritta con CV (computer, dati finti)",expectJobs:true});
   await memberJourney(browser,base,{email:"giulia.prova@example.test",password:"prova-e2e-123",mobile:true,label:"Iscritta con CV (telefono, dati finti)",expectJobs:true});
   await newMemberJourney(browser,base);
  }else{
   const email=process.env.HUNT_E2E_EMAIL,password=process.env.HUNT_E2E_PASSWORD;
   if(!email||!password){console.error("Set HUNT_E2E_EMAIL and HUNT_E2E_PASSWORD (a test account).");process.exit(2)}
   await memberJourney(browser,base,{email,password,mobile:false,label:"Account reale (computer, sola lettura)",expectJobs:false});
   await memberJourney(browser,base,{email,password,mobile:true,label:"Account reale (telefono, sola lettura)",expectJobs:false});
  }
 }finally{await browser.close();server?.close()}
 const failed=results.filter(r=>!r.ok);
 await writeFile(join(OUT,"report.json"),JSON.stringify({mode:MODE,base:MODE==="fake"?"local":base,at:new Date().toISOString(),results},null,1));
 console.log(`\n${results.length-failed.length}/${results.length} controlli riusciti · report: ${join(OUT,"report.json")}`);
 process.exit(failed.length?1:0);
}
if(process.argv[1]===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e);process.exit(1)});
