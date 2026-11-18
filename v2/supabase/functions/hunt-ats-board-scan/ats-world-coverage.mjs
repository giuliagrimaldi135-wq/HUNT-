// Public Lever postings API supports skip/limit. Use bounded pages so even
// large fashion groups are eventually covered without huge responses.
export const LEVER_PAGE_LIMIT=120;
export function safeCatalogOffset(value){
 const n=Number(value);
 return Number.isFinite(n)&&n>=0?Math.min(50000,Math.floor(n)):0;
}
export function leverPageUrl(board,offset=0){
 if(!/^[a-z0-9_-]{2,90}$/i.test(String(board)))throw Error("Invalid Lever board");
 return "https://api.lever.co/v0/postings/"+encodeURIComponent(board)
   +"?mode=json&limit="+LEVER_PAGE_LIMIT+"&skip="+safeCatalogOffset(offset);
}
export function leverNextPageOffset(offset,receivedCount,completedRotation){
 if(!completedRotation)return safeCatalogOffset(offset);
 return Number(receivedCount)>=LEVER_PAGE_LIMIT
   ?safeCatalogOffset(offset)+Number(receivedCount):0;
}
export function leverCatalogComplete(offset,receivedCount){
 return safeCatalogOffset(offset)===0&&Number(receivedCount)<LEVER_PAGE_LIMIT;
}
// An ATS's official country field is authoritative only when it is ISO alpha-2.
export function providerCountryCode(value){
 if(typeof value!=="string")return null;
 const v=value.trim().toUpperCase();
 return /^[A-Z]{2}$/.test(v)?v:null;
}
// A valid 0-posting or 0-eligible-posting response is not a parser failure.
export function successfulATSParserFlag(){return true;}
