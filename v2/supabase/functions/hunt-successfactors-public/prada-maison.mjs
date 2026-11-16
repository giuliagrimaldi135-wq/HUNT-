// Official Prada Group SuccessFactors careers host covers several Maisons.
// Explicit employer branding wins; ambiguous corporate roles stay at group level.
export function resolvePradaMaison(jobTitle,companyRows){
 const title=String(jobTitle||"").trim();
 const entries=[
  {slug:"miu-miu",pattern:/\bmiu[\s-]+miu\b/i},
  {slug:"churchs",pattern:/\bchurch['’]?s\b/i},
  {slug:"versace",pattern:/\bversace\b/i},
  {slug:"prada",pattern:/^prada\b(?![\s-]+group\b)/i}
 ];
 const hits=entries.filter(e=>e.pattern.test(title));
 if(hits.length!==1)return null;
 return (companyRows||[]).find(c=>c.slug===hits[0].slug)?.id||null;
}
