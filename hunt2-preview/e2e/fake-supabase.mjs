// In-memory stand-in for @supabase/supabase-js, used ONLY by the end-to-end
// rehearsal (run-e2e.mjs --mode=fake). The test browser serves this file in
// place of the CDN module, so the real HUNT code runs unchanged against seed
// data. It never talks to the network and is never loaded by the real site.
const DB_KEY="__hunt_fake_db";
const SESSION_KEY="__hunt_fake_session";
const store=globalThis.localStorage;

function load(){
 const saved=store.getItem(DB_KEY);
 if(saved)return JSON.parse(saved);
 const seed=globalThis.__HUNT_FAKE_SEED__;
 if(!seed)throw new Error("fake-supabase: no seed data");
 store.setItem(DB_KEY,JSON.stringify(seed));
 return JSON.parse(JSON.stringify(seed));
}
function save(db){store.setItem(DB_KEY,JSON.stringify(db))}
const uuid=()=>globalThis.crypto.randomUUID();
const log=(...a)=>{(globalThis.__HUNT_FAKE_LOG__||(globalThis.__HUNT_FAKE_LOG__=[])).push(a.join(" "))};

function query(table){
 const st={op:"select",payload:null,options:{},filters:[],order:null,limit:null,single:null,head:false,count:false,returning:false};
 const plain=f=>!String(f).includes(".");
 const api={
  select(_cols,opts={}){if(st.op!=="select")st.returning=true;if(opts.head)st.head=true;if(opts.count)st.count=true;return proxy},
  insert(p){st.op="insert";st.payload=p;return proxy},
  upsert(p,opts={}){st.op="upsert";st.payload=p;st.options=opts;return proxy},
  update(p){st.op="update";st.payload=p;return proxy},
  delete(){st.op="delete";return proxy},
  eq(f,v){if(plain(f))st.filters.push(r=>r[f]===v);return proxy},
  neq(f,v){if(plain(f))st.filters.push(r=>r[f]!==v);return proxy},
  in(f,vs){if(plain(f))st.filters.push(r=>vs.includes(r[f]));return proxy},
  gte(f,v){if(plain(f))st.filters.push(r=>r[f]!=null&&(typeof v==="number"?r[f]>=v:String(r[f])>=String(v)));return proxy},
  lte(f,v){if(plain(f))st.filters.push(r=>r[f]!=null&&(typeof v==="number"?r[f]<=v:String(r[f])<=String(v)));return proxy},
  not(f,op,v){if(plain(f)&&op==="is"&&v===null)st.filters.push(r=>r[f]!=null);return proxy},
  order(f,o={}){st.order=[f,o.ascending!==false];return proxy},
  limit(n){st.limit=n;return proxy},
  maybeSingle(){st.single="maybe";return proxy},
  single(){st.single="one";return proxy},
  then(ok,ko){return Promise.resolve().then(run).then(ok,ko)}
 };
 // Filters the fake does not model (or, ilike, range…) are accepted and ignored.
 const proxy=new Proxy(api,{get(t,k){return k in t?t[k]:(...a)=>{log("ignored",table,String(k));return proxy}}});
 function run(){
  const db=load();
  const rows=db[table]||(db[table]=[]);
  const match=r=>st.filters.every(f=>f(r));
  const now=new Date().toISOString();
  if(st.op==="insert"||st.op==="upsert"){
   const items=(Array.isArray(st.payload)?st.payload:[st.payload]).map(x=>({...x}));
   const keys=st.options.onConflict?st.options.onConflict.split(","):["user_id"];
   const out=[];
   for(const item of items){
    const existing=st.op==="upsert"?rows.find(r=>keys.every(k=>r[k]!==undefined&&r[k]===item[k])):null;
    if(existing){if(!st.options.ignoreDuplicates)Object.assign(existing,item);out.push(existing)}
    else{const row={id:uuid(),created_at:now,...item};rows.push(row);out.push(row)}
   }
   save(db);
   return finish(out);
  }
  if(st.op==="update"){
   const hit=rows.filter(match);hit.forEach(r=>Object.assign(r,st.payload));save(db);return finish(hit);
  }
  if(st.op==="delete"){
   const hit=rows.filter(match);db[table]=rows.filter(r=>!match(r));save(db);return finish(hit);
  }
  let out=rows.filter(match);
  if(st.order){const [f,asc]=st.order;out=[...out].sort((a,b)=>(a[f]>b[f]?1:a[f]<b[f]?-1:0)*(asc?1:-1))}
  if(st.head)return {data:null,count:out.length,error:null};
  if(st.limit!=null)out=out.slice(0,st.limit);
  return finish(out);
 }
 function finish(out){
  const data=JSON.parse(JSON.stringify(out));
  if(st.single==="maybe")return {data:data[0]||null,error:null};
  if(st.single==="one")return data.length?{data:data[0],error:null}:{data:null,error:{message:"No rows found",code:"PGRST116"}};
  if(st.op!=="select"&&!st.returning)return {data:null,error:null};
  return {data,error:null,count:st.count?data.length:null};
 }
 return proxy;
}

export function createClient(){
 const session=()=>{const s=store.getItem(SESSION_KEY);return s?JSON.parse(s):null};
 const start=user=>{const s={access_token:"fake",user};store.setItem(SESSION_KEY,JSON.stringify(s));return s};
 return {
  auth:{
   async getSession(){return {data:{session:session()},error:null}},
   onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},
   async signInWithPassword({email,password}){
    const user=(load().auth_users||[]).find(u=>u.email===email&&u.password===password);
    if(!user)return {data:{},error:{message:"Invalid login credentials",status:400}};
    return {data:{session:start({id:user.id,email})},error:null};
   },
   async signUp({email,password}){
    const db=load();
    if((db.auth_users||[]).some(u=>u.email===email))return {data:{},error:{message:"User already registered",status:400}};
    const user={id:uuid(),email,password};
    (db.auth_users||(db.auth_users=[])).push(user);save(db);
    return {data:{session:start({id:user.id,email})},error:null};
   },
   async signOut(){store.removeItem(SESSION_KEY);return {error:null}}
  },
  from:query,
  rpc:async(name)=>{log("rpc",name);return {data:null,error:null}},
  functions:{invoke:async(name)=>{log("invoke",name);return {data:null,error:{message:"Funzione non disponibile nella prova"}}}},
  storage:{from(){return {
   async upload(path){return {data:{path},error:null}},
   async download(){return {data:new Blob(["Curriculum di prova"],{type:"text/plain"}),error:null}},
   async remove(){return {data:[],error:null}}
  }}}
 };
}
