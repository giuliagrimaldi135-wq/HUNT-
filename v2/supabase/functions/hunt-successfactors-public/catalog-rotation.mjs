// Each career category has its own cursor, preventing cross-category skips.
export function selectCatalogRotation(config,maxPages=2){
 const urls=(Array.isArray(config?.catalog_urls)?config.catalog_urls:[])
  .filter(x=>typeof x==="string"&&x.startsWith("https://")).slice(0,30);
 if(!urls.length)return {pages:[],nextRotation:0};
 const raw=Number(config?.catalog_rotation);
 const first=Number.isInteger(raw)&&raw>=0?raw%urls.length:0;
 const count=Math.min(Math.max(1,maxPages),urls.length);
 const perCategory=config?.catalog_cursors||{};
 const pages=Array.from({length:count},(_,i)=>{
  const index=(first+i)%urls.length;
  const rawCursor=Number(perCategory[index]??(urls.length===1?config?.catalog_cursor:0));
  const cursor=Number.isInteger(rawCursor)&&rawCursor>=0?rawCursor:0;
  return {index,url:urls[index],cursor};
 });
 return {pages,nextRotation:(first+count)%urls.length};
}
export function advanceCatalogCursors(config,pages,observations,nextRotation){
 const cursors={...(config?.catalog_cursors||{})};
 for(const page of pages){
  const o=observations[page.index];
  if(!o||!Number.isInteger(o.total)||o.total<0)continue;
  const start=page.cursor>=o.total?0:page.cursor;
  const processed=Math.min(Math.max(0,o.selected||0),Math.max(0,o.total-start));
  cursors[page.index]=o.total>0&&start+processed<o.total?start+processed:0;
 }
 return {...config,catalog_rotation:nextRotation,catalog_cursors:cursors,catalog_cursor:0};
}
