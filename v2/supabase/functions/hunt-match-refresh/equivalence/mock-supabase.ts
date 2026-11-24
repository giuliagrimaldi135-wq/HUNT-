// In-memory stand-in for the small part of supabase-js used by hunt-match-refresh.
// Used only by the equivalence test; never deployed.
import {createHash} from "node:crypto";

export const db:any={tables:{},rpcLog:[],requests:[],state:null};

function parseSelect(cols:string){
  return cols.split(",").map(c=>c.trim()).filter(Boolean).map(c=>{
    const [alias,expr]=c.includes(":")?c.split(":"):[null,c];
    const text=expr.includes("->>");
    const [col,key]=expr.split(/->>|->/);
    return {name:alias||col,col,key:key||null,text};
  });
}
function project(row:any,cols:string){
  if(cols==="*")return structuredClone(row);
  const out:any={};
  for(const c of parseSelect(cols)){
    let v=row[c.col];
    if(c.key!==null){v=v&&typeof v==="object"?v[c.key]:null;if(v===undefined)v=null;if(c.text&&v!==null&&typeof v==="object")v=JSON.stringify(v)}
    out[c.name]=v===undefined?null:structuredClone(v);
  }
  return out;
}

class Query{
  table:string;op="select";cols="*";filters:((r:any)=>boolean)[]=[];lim=Infinity;payload:any=null;one=false;maybe=false;onConflict="";
  constructor(t:string){this.table=t}
  select(c="*"){this.cols=c;return this}
  eq(c:string,v:any){this.filters.push(r=>r[c]===v);return this}
  neq(c:string,v:any){this.filters.push(r=>r[c]!==v);return this}
  in(c:string,v:any[]){const s=new Set(v.map(String));this.filters.push(r=>s.has(String(r[c])));return this}
  gte(c:string,v:any){this.filters.push(r=>r[c]!==null&&r[c]!==undefined&&String(r[c])>=String(v));return this}
  // The matcher's freshness .or() is re-checked in JS by isFreshActionable; keep all rows.
  or(_:string){return this}
  order(){return this}
  limit(n:number){this.lim=n;return this}
  maybeSingle(){this.maybe=true;return this}
  single(){this.one=true;return this}
  update(p:any){this.op="update";this.payload=p;return this}
  delete(){this.op="delete";return this}
  upsert(rows:any[],o:any){this.op="upsert";this.payload=rows;this.onConflict=o?.onConflict||"";return this}
  then(res:any,rej:any){try{res(this.run())}catch(e){rej(e)}}
  run(){
    const rows=(db.tables[this.table]||=[]);
    db.requests.push({table:this.table,op:this.op,cols:this.cols});
    const hit=rows.filter((r:any)=>this.filters.every(f=>f(r)));
    if(this.op==="update"){for(const r of hit)Object.assign(r,structuredClone(this.payload));return {data:null,error:null}}
    if(this.op==="delete"){db.tables[this.table]=rows.filter((r:any)=>!hit.includes(r));return {data:null,error:null}}
    if(this.op==="upsert"){
      const keys=this.onConflict.split(",");
      for(const p of this.payload){
        const ex=rows.find((r:any)=>keys.every(k=>String(r[k])===String(p[k])));
        if(ex)Object.assign(ex,structuredClone(p));else rows.push(structuredClone(p));
      }
      return {data:null,error:null};
    }
    const data=hit.slice(0,this.lim).map((r:any)=>project(r,this.cols));
    if(this.maybe||this.one)return {data:data[0]??null,error:null};
    return {data,error:null};
  }
}

export function createClient(){
  return {
    from:(t:string)=>new Query(t),
    rpc:async(name:string,args:any)=>{
      db.rpcLog.push(name);
      if(!db.rpcEnabled)return {data:null,error:{code:"PGRST202",message:"not found"}};
      if(name==="hunt_job_description_digests"){
        const ids=new Set((args.p_job_ids||[]).map(String));
        return {data:(db.tables.jobs||[]).filter((j:any)=>ids.has(String(j.id)))
          .map((j:any)=>({id:j.id,description_md5:createHash("md5").update(j.description??"").digest("hex")})),error:null};
      }
      if(name==="hunt_match_change_token"){
        // Mirrors public.hunt_match_change_token() in the migration.
        const now=Date.now(),DAY=86400000,cut=now-20*DAY,ver=now-7*DAY;
        const t=(v:any)=>v?Date.parse(v):NaN;
        const md5=(x:string)=>createHash("md5").update(x).digest("hex");
        const jobs=(db.tables.jobs||[]).filter((j:any)=>["active_verified","active_likely"].includes(j.state)&&
          (t(j.published_at)>=cut||(j.published_at==null&&t(j.first_seen_at)>=cut))&&t(j.last_verified_at)>=ver)
          .sort((a:any,b:any)=>a.id.localeCompare(b.id))
          .map((j:any)=>md5(JSON.stringify([j.id,md5(j.description??""),j.canonical_title,j.role_family,j.seniority,j.employment_type,j.city,j.remote_mode,j.company_id,j.requisition_id,j.primary_apply_url,j.state,j.vacancy_confidence,j.published_at,j.first_seen_at,j.metadata?.provider_creation_at??null,j.metadata?.hard_requirements??null,Math.floor((now-t(j.published_at??j.first_seen_at))/DAY)])));
        const rows=(table:string,f:(r:any)=>boolean=()=>true)=>JSON.stringify((db.tables[table]||[]).filter(f));
        return {data:md5(JSON.stringify([jobs,rows("career_preferences"),rows("profiles"),rows("user_personalization"),rows("user_cvs",(c:any)=>c.active),
          JSON.stringify((db.tables.user_job_matches||[]).map((m:any)=>[m.user_id,m.job_id,m.match_score,m.priority_score,m.reasons,m.gaps,m.model_version]).sort())])),error:null};
      }
      if(name==="hunt_match_refresh_state_get")return {data:db.state?structuredClone(db.state):null,error:null};
      if(name==="hunt_match_refresh_state_put"){db.state=structuredClone(args.p_state);return {data:null,error:null}}
      return {data:null,error:{message:"unknown rpc"}};
    }
  };
}
