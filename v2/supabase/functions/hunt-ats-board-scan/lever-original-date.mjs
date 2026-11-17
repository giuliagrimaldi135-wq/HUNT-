// Lever public Postings API provides createdAt (posting creation), NOT a
// guaranteed publication date. Keep published_at null when only this exists.
// The creation date is a conservative upper bound on possible freshness:
// a posting created >20 days ago cannot be represented as newly created just
// because HUNT started observing it today.
export function leverPostingCreatedAtISO(value,nowMs=Date.now()){
 if(value===null||value===undefined)return null;
 const raw=String(value).trim();
 if(!/^\d{13}$/.test(raw))return null;
 const ms=Number(raw);
 if(!Number.isSafeInteger(ms)||ms<Date.parse("2010-01-01T00:00:00Z")||ms>nowMs+86400000)return null;
 return new Date(ms).toISOString();
}
