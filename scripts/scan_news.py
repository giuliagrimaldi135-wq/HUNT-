import json,hashlib,urllib.parse
from pathlib import Path
from datetime import datetime,timezone
import feedparser,requests
ROOT=Path(__file__).resolve().parents[1]
def load(p,d):return json.loads((ROOT/p).read_text()) if (ROOT/p).exists() else d
def dump(p,x):(ROOT/p).write_text(json.dumps(x,ensure_ascii=False,indent=2))
now=datetime.now(timezone.utc)
if not (now.minute<7 or 30<=now.minute<37):print("Skipping news scan this cycle");raise SystemExit(0)
brands=load("config/brands.json",[]);signals=load("data/signals.json",[]);known={x.get("key") for x in signals};keywords={"store_opening":["new store","flagship","opening","apertura","nuovo negozio","showroom"],"expansion":["expansion","expanding","espansione","growth","crescita","investment","investimento"],"category_launch":["launch","new category","footwear","accessories","lancio"],"hiring_velocity":["hiring","recruiting","assume","assunzioni","team expansion"],"management_change":["appoints","appointed","new director","new ceo","nomina","direttore"]}
for b in brands:
 name=b["name"];q=f'"{name}" (opening OR expansion OR hiring OR showroom OR flagship OR launch)';url="https://news.google.com/rss/search?q="+urllib.parse.quote(q)+"&hl=it&gl=IT&ceid=IT:it"
 try:
  feed=feedparser.parse(requests.get(url,timeout=18,headers={"User-Agent":"HUNT/1.0"}).content)
  for e in feed.entries[:8]:
   text=(e.get("title","")+" "+e.get("summary","")).lower();stype=None
   for typ,words in keywords.items():
    if any(w in text for w in words):stype=typ;break
   if not stype:continue
   k=hashlib.sha1((name+"|"+e.get("link","")).encode()).hexdigest()[:20]
   if k in known:continue
   score=72+(8 if stype in ("store_opening","expansion","hiring_velocity") else 0)+(8 if any(x in text for x in ["milano","milan","italy","italia"]) else 0)
   signals.append({"key":k,"brand":name,"headline":e.get("title","Public signal"),"signal_type":stype,"score":min(score,95),"confidence":"public-news signal","reason":"Segnale pubblico collegato a crescita, hiring o sviluppo del brand. Da verificare prima di una candidatura spontanea.","detected_at":now.isoformat(),"url":e.get("link")});known.add(k)
 except Exception as ex:print("news error",name,str(ex)[:100])
dump("data/signals.json",sorted(signals,key=lambda x:x.get("detected_at",""),reverse=True)[:250]);print("News signals:",len(signals))