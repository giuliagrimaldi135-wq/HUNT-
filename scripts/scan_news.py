import json, hashlib, urllib.parse, re
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
import feedparser, requests

ROOT=Path(__file__).resolve().parents[1]
def load(p,d):
    return json.loads((ROOT/p).read_text()) if (ROOT/p).exists() else d
def dump(p,x):
    (ROOT/p).write_text(json.dumps(x,ensure_ascii=False,indent=2))

now=datetime.now(timezone.utc)
brands=load("config/brands.json",[])
signals=load("data/signals.json",[])
known={x.get("key") for x in signals}
keywords={
    "store_opening":["new store","flagship","opening","apertura","nuovo negozio","showroom","boutique"],
    "expansion":["expansion","expanding","espansione","growth","crescita","investment","investimento","new market"],
    "category_launch":["launch","new category","footwear","accessories","lancio","debut"],
    "hiring_velocity":["hiring","recruiting","assume","assunzioni","team expansion","recruitment"],
    "management_change":["appoints","appointed","new director","new ceo","nomina","direttore","creative director"],
    "financial_momentum":["revenue","sales growth","ricavi","fatturato","profit","utile","results"]
}

HEADERS={"User-Agent":"Mozilla/5.0 HUNT-Fashion-Intel/1.0"}

def rss_search(query, limit=6):
    url="https://news.google.com/rss/search?q="+urllib.parse.quote(query)+"&hl=it&gl=IT&ceid=IT:it"
    try:
        raw=requests.get(url,timeout=14,headers=HEADERS).content
        feed=feedparser.parse(raw)
        return feed.entries[:limit]
    except Exception:
        return []

def classify(text):
    t=text.lower()
    for typ,words in keywords.items():
        if any(w in t for w in words):
            return typ
    return "industry_news"

def source_name(entry):
    src=entry.get("source")
    if isinstance(src,dict):
        return src.get("title") or "News"
    title=entry.get("title","")
    if " - " in title:
        return title.rsplit(" - ",1)[-1]
    return "News"

def published_iso(entry):
    try:
        from email.utils import parsedate_to_datetime
        p=entry.get("published")
        if p:
            dt=parsedate_to_datetime(p)
            if dt.tzinfo is None: dt=dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc).isoformat()
    except Exception:
        pass
    return now.isoformat()

def interview_takeaway(text,typ):
    t=text.lower()
    if typ=="store_opening":
        return "Da colloquio: segnala investimento nel retail fisico e possibile crescita di team, assortimento e operations."
    if typ=="expansion":
        return "Da colloquio: utile per parlare di crescita del brand, nuovi mercati e priorità commerciali."
    if typ=="hiring_velocity":
        return "Da colloquio: il brand sta mostrando segnali di rafforzamento organizzativo o commerciale."
    if typ=="management_change":
        return "Da colloquio: può indicare un cambio di direzione strategica, creativa o commerciale."
    if typ=="financial_momentum":
        return "Da colloquio: utile per collegare performance del brand, domanda e decisioni di merchandising."
    if typ=="category_launch":
        return "Da colloquio: nuova categoria o lancio = possibile impatto su assortimento, pricing e canali."
    if any(x in t for x in ["fashion week","settimana della moda","runway","sfilata"]):
        return "Da colloquio: utile per contestualizzare direzione creativa, trend e posizionamento del brand."
    return "Da colloquio: tieni a mente il fatto e collegalo a retail, prodotto, cliente o crescita del brand."

def brand_signal(b):
    name=b["name"]
    q=f'"{name}" (opening OR expansion OR hiring OR showroom OR flagship OR launch OR appoints OR revenue OR sales)'
    entries=rss_search(q,5)
    out=[]
    for e in entries:
        text=(e.get("title","")+" "+re.sub("<[^>]+>"," ",e.get("summary",""))).strip()
        stype=classify(text)
        k=hashlib.sha1((name+"|"+e.get("link","")).encode()).hexdigest()[:20]
        score=70
        if stype in ("store_opening","expansion","hiring_velocity","management_change"): score+=10
        if any(x in text.lower() for x in ["milano","milan","italy","italia"]): score+=8
        out.append({
            "key":k,"brand":name,"headline":e.get("title","Public signal"),
            "signal_type":stype,"score":min(score,95),"confidence":"public-news signal",
            "reason":interview_takeaway(text,stype),"detected_at":now.isoformat(),
            "published_at":published_iso(e),"source":source_name(e),"url":e.get("link")
        })
    return out

# Run brand intelligence only twice per hour to stay lightweight.
if now.minute<7 or 30<=now.minute<37:
    watch=brands[:67]
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs=[ex.submit(brand_signal,b) for b in watch]
        for fut in as_completed(futs):
            try:
                for s in fut.result():
                    if s["key"] not in known:
                        signals.append(s);known.add(s["key"])
            except Exception:
                pass

# Fashion Now: broader industry briefing, refreshed on each news cycle.
news_queries=[
    '"fashion luxury" Milan Italy',
    '"moda lusso" Milano retail',
    '"Milan Fashion Week" luxury',
    '"luxury" Italy retail opening',
    '"fashion" Italy earnings luxury',
]
fashion=[]
seen_links=set()
for q in news_queries:
    for e in rss_search(q,7):
        link=e.get("link","")
        if not link or link in seen_links: continue
        seen_links.add(link)
        title=e.get("title","").strip()
        summary=re.sub("<[^>]+>"," ",e.get("summary",""))
        text=title+" "+summary
        typ=classify(text)
        fashion.append({
            "key":hashlib.sha1(link.encode()).hexdigest()[:20],
            "headline":title,
            "source":source_name(e),
            "published_at":published_iso(e),
            "topic":typ,
            "why_it_matters":interview_takeaway(text,typ),
            "url":link
        })

fashion=sorted(fashion,key=lambda x:x.get("published_at",""),reverse=True)[:30]
signals=sorted(signals,key=lambda x:x.get("published_at") or x.get("detected_at",""),reverse=True)[:350]
dump("data/signals.json",signals)
dump("data/fashion_news.json",fashion)
print("Signals:",len(signals),"Fashion Now:",len(fashion))
