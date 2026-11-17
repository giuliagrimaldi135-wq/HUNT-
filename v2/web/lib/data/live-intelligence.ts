import { authenticatedContext, publicHttpsUrl } from "@/lib/data/current-user";

export type LiveIntelligence = {
 id: string; type: "Azienda" | "Mercato"; brand: string;
 title: string; summary: string; source: string; url: string;
 publishedAt: string; score: number | null;
};

export async function getLiveIntelligence(): Promise<{items:LiveIntelligence[];failed:boolean}> {
 const {supabase}=await authenticatedContext();
 const now=new Date(),since=new Date(now.getTime()-30*86400000).toISOString();
 const [signals,news]=await Promise.all([
  supabase.from("company_signals")
   .select("id,title,summary,source_name,source_url,published_at,relevance_score,companies(name)")
   .gte("published_at",since).lte("published_at",now.toISOString())
   .order("published_at",{ascending:false}).limit(30),
  supabase.from("world_news_items")
   .select("id,title,summary,url,theme,relevance_score,published_at,world_news_sources(publisher)")
   .gte("published_at",since).lte("published_at",now.toISOString())
   .gte("relevance_score",60)
   .order("published_at",{ascending:false}).limit(70)
 ]);
 if(signals.error)console.error("HUNT intelligence: official company signals unavailable",signals.error.code);
 if(news.error)console.error("HUNT intelligence: live news unavailable",news.error.code);
 const corporate:LiveIntelligence[]=(signals.data||[]).flatMap(x=>{
  const url=publicHttpsUrl(x.source_url);
  return url&&x.published_at?[{
   id:x.id,type:"Azienda" as const,brand:x.companies?.name||"Brand",
   title:x.title,summary:x.summary||"",source:x.source_name,
   url,publishedAt:x.published_at,score:x.relevance_score
  }]:[];
 });
 const world:LiveIntelligence[]=(news.data||[]).flatMap(x=>{
  const url=publicHttpsUrl(x.url);
  if(!url||!x.published_at||!x.title||x.title.length<12)return [];
  return [{
   id:x.id,type:"Mercato" as const,brand:x.theme||"Fashion & Luxury",
   title:x.title,summary:x.summary||"",
   source:x.world_news_sources?.publisher||"Fonte pubblica",
   url,publishedAt:x.published_at,score:x.relevance_score
  }];
 });
 const unique=new Map<string,LiveIntelligence>();
 for(const item of [...corporate,...world].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))){
  const key=item.url.split("?")[0].replace(/\/$/,"").toLowerCase();
  if(!unique.has(key))unique.set(key,item);
 }
 return {items:[...unique.values()].slice(0,40),failed:!!signals.error||!!news.error};
}
