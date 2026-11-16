const FAMILIES={
 "Merchandising":[/merchandising mix|product mix|assortimento|assortment|product assortment/i,/sell.?in|sell.?out|kpi|sales analysis|retail performance/i,/capsule|collection planning|collezion/i,/showroom/i],
 "Buying":[/open.to.buy|\botb\b|buying budget/i,/buyer|buying|supplier|vendor/i,/assortiment|assortment|product selection/i,/ordini|orders|showroom/i],
 "Planning & Allocation":[/allocation|allocazione|stock allocation/i,/forecast|planning|pianificazion/i,/budget|\bkpi\b|sales analysis|performance/i,/inventory|stock|assortment/i],
 "E-commerce & Digital":[/e.commerce|ecommerce|e.shop/i,/conversion|digital sales|online sales/i,/product assortment|assortimento|site merchandising/i,/analytics|performance|\bkpi\b/i],
 "Retail & Retail Operations":[/store operations|retail operations|retail network/i,/\bkpi\b|performance|stock|processes/i,/showroom|clienti|customers/i,/order entry|ordini|orders/i]
};
function evidenceFacts(profile) {
 const rows=[];
 for(const e of profile?.experience||[]){
   for(const fact of e.evidence||[])if(typeof fact==="string"&&fact.trim())rows.push({text:fact,source:"experience:"+String(e.company||e.role||"")});
 }
 for(const p of profile?.projects||[]){
   for(const fact of p.evidence||[])if(typeof fact==="string"&&fact.trim())rows.push({text:fact,source:"project:"+String(p.name||"")});
 }
 for(const tool of profile?.tools||[])if(typeof tool==="string"&&tool.trim())rows.push({text:tool,source:"tool"});
 return rows;
}
export function chooseRelevantCvProfile(versions,family,description) {
 const verified=(versions||[]).filter(v=>v?.parsed_profile?.profile_confirmed_by_user||v?.parsed_profile?.profile_verified_from_user_history);
 if(!verified.length)return {};
 const patterns=FAMILIES[family]||[];
 const needs=new Set(String(description||"").toLowerCase().match(/\b[a-z]{5,}\b/g)||[]);
 const ranked=verified.map(v=>{
   const facts=evidenceFacts(v.parsed_profile);
   // Repeated showroom phrases must not inflate the score across different CVs.
   const domainCoverage=patterns.reduce((sum,re,index)=>{
     const matched=facts.some(f=>re.test(f.text));
     return sum+(matched?(index===0?17:index===1?12:index===2?9:4):0);
   },0);
   const relatedFacts=facts.filter(f=>patterns.some(re=>re.test(f.text)));
   const distinctOrigins=new Set(relatedFacts.map(f=>f.source)).size;
   const lexical=new Set();
   for(const fact of relatedFacts)for(const w of fact.text.toLowerCase().match(/\b[a-z]{5,}\b/g)||[])
     if(needs.has(w)&&!["about","their","these","other","roles","skills","years","work","experience"].includes(w))lexical.add(w);
   const score=domainCoverage+Math.min(distinctOrigins,3)*3+Math.min(lexical.size,7)*2+(v.is_default?1:0);
   return {profile:v.parsed_profile,score,default:!!v.is_default};
 });
 ranked.sort((a,b)=>b.score-a.score||Number(b.default)-Number(a.default));
 return ranked[0].profile;
}
