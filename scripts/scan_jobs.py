import json,hashlib,re
from pathlib import Path
from datetime import datetime,timezone
import requests
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
load=lambda p,d: json.loads((ROOT/p).read_text()) if (ROOT/p).exists() else d
dump=lambda p,x: (ROOT/p).write_text(json.dumps(x,ensure_ascii=False,indent=2))
brands=load("config/brands.json",[]);profile=load("config/profile.json",{});old=load("data/jobs.json",[]);history=load("data/history.json",{});now=datetime.now(timezone.utc).isoformat()
TARGET=[x.lower() for x in profile["target_roles"]];JUNIOR=[x.lower() for x in profile["junior_terms"]];AVOID=[x.lower() for x in profile["avoid_titles"]];SKILLS=[x.lower() for x in profile["skills"]];LOC=[x.lower() for x in profile["preferred_locations"]]
def clean(s):return re.sub(r"\s+"," ",s or "").strip()
def key_for(brand,title,url):return hashlib.sha1(f"{brand}|{title}|{url}".lower().encode()).hexdigest()[:20]
def score_job(title,context,location_scope):
 text=f"{title} {context}".lower();score=28;reasons=[];role_hits=[t for t in TARGET if t in text]
 if role_hits:score+=min(30,14+4*len(role_hits));reasons.append("Ruolo coerente: "+", ".join(role_hits[:4]))
 if any(t in text for t in JUNIOR):score+=18;reasons.append("Seniority junior/intern")
 if any(t in text for t in LOC) or location_scope.lower()=="italy":score+=12;reasons.append("Italia/Milano coerente")
 skill_hits=[t for t in SKILLS if t in text]
 if skill_hits:score+=min(12,3*len(skill_hits));reasons.append("Competenze: "+", ".join(skill_hits[:4]))
 if any(t in title.lower() for t in AVOID) and not any(x in text for x in ["merchand","planning","allocation","operations"]):score-=45;reasons.append("Ruolo prevalentemente sales")
 return max(0,min(100,score)),reasons
def role_family(title):
 t=title.lower()
 for family,terms in [("Merchandising",["merchand"]),("Buying",["buy","buyer"]),("Planning/Allocation",["planning","allocation"]),("Product",["product"]),("Wholesale",["wholesale"]),("Brand/Business",["brand","business","omnichannel","e-commerce"])]:
  if any(x in t for x in terms):return family
 return "Adjacent"
session=requests.Session();session.headers.update({"User-Agent":"Mozilla/5.0 HUNT-Radar/1.0 (+public career monitoring)"});found=[];status={}
for b in brands:
 if not b.get("enabled") or not b.get("url"):continue
 try:
  r=session.get(b["url"],timeout=22);r.raise_for_status();soup=BeautifulSoup(r.text,"html.parser");candidates=[]
  for el in soup.find_all(["a","h1","h2","h3","h4","li"]):
   title=clean(el.get_text(" ",strip=True))
   if not title or len(title)<5 or len(title)>170:continue
   low=title.lower()
   if not any(k in low for k in TARGET+JUNIOR):continue
   parent=el.parent;context=clean(parent.get_text(" ",strip=True) if parent else title)[:700];link=el.get("href") if el.name=="a" else None
   if not link:
    a=el.find("a",href=True);link=a.get("href") if a else None
   link=requests.compat.urljoin(b["url"],link) if link else b["url"];candidates.append((title,context,link))
  seen_local=set()
  for title,context,url in candidates:
   fingerprint=(title.lower(),url)
   if fingerprint in seen_local:continue
   seen_local.add(fingerprint);score,reasons=score_job(title,context,b.get("location_scope","Mixed"))
   if score<50:continue
   location="Italy" if b.get("location_scope")=="Italy" else ("Milano" if "milano" in context.lower() or "milan" in context.lower() else "Location to verify");k=key_for(b["name"],title,url);prev=next((x for x in old if x.get("key")==k),None)
   found.append({"key":k,"brand":b["name"],"title":title,"location":location,"score":score,"reasons":reasons,"role_family":role_family(title),"recommended_cv":"fashion_mgmt" if role_family(title)=="Brand/Business" else "merch_buying","url":url,"source_name":b["name"]+" careers","provider":"career_page","first_seen_at":prev.get("first_seen_at") if prev else now,"last_seen_at":now})
  status[b["id"]]={"ok":True,"http":r.status_code,"items":sum(1 for x in found if x["brand"]==b["name"]),"checked_at":now}
 except Exception as e:status[b["id"]]={"ok":False,"error":str(e)[:160],"checked_at":now}
current_keys={x["key"] for x in found}
for x in old:
 if x.get("key") not in current_keys:
  try:
   age=(datetime.now(timezone.utc)-datetime.fromisoformat(x["last_seen_at"])).days
   if age<14:found.append(x)
  except:pass
found=sorted(found,key=lambda x:(x["score"],x["first_seen_at"]),reverse=True)[:400];old_keys={x.get("key") for x in old};alerts=[x for x in found if x["key"] not in old_keys and x["score"]>=80]
dump("data/jobs.json",found);dump("data/new_alerts.json",alerts);dump("data/source_status.json",{"generated_at":now,"sources":status})
signals=load("data/signals.json",[]);today=now[:10]
for b in brands:
 if not b.get("enabled"):continue
 count=sum(1 for x in found if x["brand"]==b["name"]);bh=history.setdefault(b["id"],{});prev=bh.get("last_count")
 if isinstance(prev,int) and count-prev>=3:
  sk=key_for(b["name"],f"hiring acceleration {today}",str(count))
  if not any(s.get("key")==sk for s in signals):signals.append({"key":sk,"brand":b["name"],"headline":f"Hiring acceleration: +{count-prev} relevant roles","signal_type":"hiring_velocity","score":82,"confidence":"rule-based","reason":"Il numero di ruoli rilevanti è cresciuto rapidamente rispetto alla scansione precedente.","detected_at":now,"url":b.get("url")})
 bh.update({"last_count":count,"updated_at":now})
dump("data/history.json",history);dump("data/signals.json",signals[-200:]);print(f"HUNT scan: {len(found)} jobs, {len(alerts)} new high alerts, {sum(1 for x in status.values() if x.get('ok'))} sources online")