// A shared group careers URL is one physical endpoint, regardless of how
// many sibling brands link to it. A failing endpoint must not be bypassed by
// probing its duplicate records every five minutes.
export function normalizedCareerURL(value) {
 try {
  const url=new URL(String(value||""));
  if(url.protocol!=="https:"||url.username||url.password)return null;
  const pathname=url.pathname.replace(/\/+$/,"")||"/";
  // Query parameters can be real career filters; preserve them.
  return url.hostname.toLowerCase()+pathname+url.search;
 } catch{return null}
}
export function selectUniqueCareerSources(sources) {
 const groups=new Map();
 for(const source of sources||[]) {
  const url=normalizedCareerURL(source.base_url);
  if(!url)continue;
  const current=groups.get(url);
  if(!current)groups.set(url,source);
  else if((Number(source.consecutive_failures)||0)<(Number(current.consecutive_failures)||0))
    groups.set(url,source);
 }
 // Stable order preserves original scan rotation between distinct URLs.
 return [...groups.values()];
}
