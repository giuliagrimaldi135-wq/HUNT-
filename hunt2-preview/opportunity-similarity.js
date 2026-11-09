/* HUNT: similarity is not the personal suitability score.
 * Avoid offering unrelated roles simply because the same user matched both. */
const clean=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
const family=s=>clean(s).replace(/\band\b|\be\b|\&/g," ").trim();
const junior=s=>/\b(intern|internship|stage|stag|trainee|apprentice|junior|assistant|entry level|graduate)\b/i.test(s||"");
const senior=s=>/\b(senior|manager|head|director|lead|principal|chief|vp|vice president)\b/i.test(s||"");
const stop=new Set(["intern","internship","stage","stag","junior","trainee","assistant","graduate","fashion","luxury","and","the","for","of","with","in","at","to","retail","entry","level"]);
const tokens=s=>new Set(clean(s).split(" ").filter(x=>x.length>3&&!stop.has(x)));
const intent=s=>{const t=clean(s);return [
 /merchandis|assortment|assortimento/.test(t)?"merchandising":null,
 /allocat|allocazion/.test(t)?"allocation":null,
 /planning|pianific|forecast/.test(t)?"planning":null,
 /buying|buyer|acquist/.test(t)?"buying":null,
 /wholesale|showroom/.test(t)?"wholesale":null,
 /ecommerce|e commerce|digital/.test(t)?"ecommerce":null,
 /product develop|sviluppo prodott/.test(t)?"product-development":null,
 /retail operations|store operations/.test(t)?"retail-operations":null,
 ].filter(Boolean)};
export function similarityAssessment(reference,other){
 if(!reference||!other||reference.id===other.id)return {similar:false,reason:"same_or_missing"};
 const a=family(reference.role_family),b=family(other.role_family);
 if(!a||!b||a!==b)return {similar:false,reason:"different_role_family"};
 const aSenior=senior(reference.canonical_title)||senior(reference.seniority)&&!junior(reference.canonical_title);
 const bSenior=senior(other.canonical_title)||senior(other.seniority)&&!junior(other.canonical_title);
 if(aSenior!==bSenior)return {similar:false,reason:"seniority_mismatch"};
 if(bSenior&&/manager|head|director|senior/.test(other.canonical_title||"")&&
    !/manager|head|director|senior/.test(reference.canonical_title||""))return {similar:false,reason:"seniority_mismatch"};
 const aTags=intent((reference.canonical_title||"")+" "+a),bTags=intent((other.canonical_title||"")+" "+b);
 const commonTags=aTags.filter(t=>bTags.includes(t));
 const at=tokens(reference.canonical_title),bt=tokens(other.canonical_title);
 const overlap=[...at].filter(x=>bt.has(x)).length;
 // One shared broad family is not enough. Require concrete common subject.
 const similar=commonTags.length>0&&(commonTags.length>=2||overlap>=1);
 return {similar,reason:similar?"same_specialization":"insufficient_role_overlap",score:commonTags.length*10+overlap*4};
}
export function findSimilarOpportunities(reference,rows,limit=4){
 return (Array.isArray(rows)?rows:[])
  .map(row=>({row,assessment:similarityAssessment(reference,row)}))
  .filter(x=>x.assessment.similar)
  .sort((a,b)=>b.assessment.score-a.assessment.score||
    (Number(b.row.match_score)||0)-(Number(a.row.match_score)||0))
  .slice(0,limit).map(x=>({...x.row,similarity_reason:x.assessment.reason,similarity_score:x.assessment.score}));
}
