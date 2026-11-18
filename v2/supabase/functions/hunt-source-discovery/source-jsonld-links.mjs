import {safeVacancyCandidate} from "./candidate-integrity.mjs";

// Only extract real schema.org JobPosting URLs; the detail page still needs
// independent official-date/description validation before recommendation.
export function extractStructuredVacancyLinks(html,base,max=80){
 const found=new Map(),budget={visited:0};
 const add=(posting)=>{
  const title=String(posting.title||posting.name||"");
  const rawURL=typeof posting.url==="string"?posting.url:
    (typeof posting.mainEntityOfPage==="string"?posting.mainEntityOfPage:
      posting.mainEntityOfPage?.["@id"]);
  if(typeof rawURL!=="string")return;
  const candidate=safeVacancyCandidate(rawURL,title,base);
  if(candidate&&!found.has(candidate.url))found.set(candidate.url,candidate.title);
 };
 const walk=(node,depth=0)=>{
  if(depth>10||budget.visited++>1800||found.size>=max||!node)return;
  if(Array.isArray(node)){for(const item of node)walk(item,depth+1);return;}
  if(typeof node!=="object")return;
  const types=Array.isArray(node["@type"])?node["@type"]:[node["@type"]];
  if(types.some(t=>typeof t==="string"&&/(?:^|[/#])JobPosting$/i.test(t)))add(node);
  for(const value of Object.values(node)){
   if(typeof value==="object"&&value!==null)walk(value,depth+1);
  }
 };
 for(const match of String(html||"").matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  if(found.size>=max)break;
  const raw=match[1].trim();
  if(raw.length>1500000)continue;
  try{walk(JSON.parse(raw.replace(/^\uFEFF/,"")));}catch{}
 }
 return [...found.entries()].slice(0,max).map(([url,title])=>({url,title}));
}
