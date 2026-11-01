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
jobs=load("data/jobs.json",[])
old_signals=load("data/signals.json",[])

HEADERS={"User-Agent":"Mozilla/5.0 HUNT-Fashion-Intel/2.0"}
SIGNAL_DAYS=45
FASHION_DAYS=21
TARGET_TERMS=["milano","milan","firenze","florence","scandicci","roma","rome","london","londra","switzerland","svizzera","zurich","zürich","geneva","genève","lugano","basel","lausanne"]
FASHION_CONTEXT=["fashion","moda","luxury","lusso","retail","boutique","store","brand","collection","collezione","showroom","designer","merchandising","footwear","accessories","apparel","creative director","wholesale","e-commerce","ecommerce"]
keywords={
    "store_opening":["new store","flagship","opening","apertura","nuovo negozio","showroom","boutique","new boutique"],
    "expansion":["expansion","expanding","espansione","growth","crescita","investment","investimento","new market","acquisition","acquisizione"],
    "category_launch":["launch","new category","footwear","accessories","lancio","debut","capsule","collaboration","collaborazione"],
    "hiring_velocity":["hiring","recruiting","assume","assunzioni","team expansion","recruitment","new hires"],
    "management_change":["appoints","appointed","new director","new ceo","nomina","direttore","creative director","chief executive"],
    "financial_momentum":["revenue","sales growth","ricavi","fatturato","profit","utile","results","earnings"],
    "social_signal":["instagram","tiktok","social campaign","viral","creator","influencer","social media","followers"]
}

def parse_dt(v):
    if not v:return None
    try:return datetime.fromisoformat(v.replace("Z","+00:00"))
    except:return None

def age_days(v):
    dt=parse_dt(v)
    return 9999 if not dt else (now-dt).total_seconds()/86400

def rss_search(query,limit=10):
    url="https://news.google.com/rss/search?q="+urllib.parse.quote(query)+"&hl=it&gl=IT&ceid=IT:it"
    try:
        raw=requests.get(url,timeout=14,headers=HEADERS).content
        return feedparser.parse(raw).entries[:limit]
    except Exception:return []

def classify(text):
    t=text.lower()
    for typ,words in keywords.items():
        if any(w in t for w in words):return typ
    return "industry_news"

def source_name(entry):
    src=entry.get("source")
    if isinstance(src,dict):return src.get("title") or "News"
    title=entry.get("title","")
    return title.rsplit(" - ",1)[-1] if " - " in title else "News"

def published_iso(entry):
    try:
        from email.utils import parsedate_to_datetime
        p=entry.get("published")
        if p:
            dt=parsedate_to_datetime(p)
            if dt.tzinfo is None:dt=dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc).isoformat()
    except Exception:pass
    return None

def clean_html(s):return re.sub("<[^>]+>"," ",s or "")

def norm(s):return re.sub(r"[^a-z0-9]+"," ",(s or "").lower()).strip()

def interview_takeaway(text,typ):
    if typ=="store_opening":return "Segnale concreto di investimento retail: può anticipare crescita di team, assortimento, operations e merchandising."
    if typ=="expansion":return "Segnale di crescita del brand o ingresso in nuovi mercati: utile per capire priorità commerciali e possibili nuove assunzioni."
    if typ=="hiring_velocity":return "Il brand sta rafforzando il team: può esserci spazio anche prima che venga pubblicata la vacancy perfetta."
    if typ=="management_change":return "Un cambio di leadership può anticipare nuove priorità, team e progetti nei mesi successivi."
    if typ=="financial_momentum":return "Performance e investimenti possono tradursi in budget, espansione e nuove funzioni da rafforzare."
    if typ=="category_launch":return "Una nuova categoria può richiedere più lavoro su assortment, buying, merchandising, pricing e go-to-market."
    if typ=="social_signal":return "Un aumento di attenzione social/campaign può segnalare una fase di lancio o accelerazione da incrociare con retail e hiring."
    return "Notizia utile per capire direzione, priorità e momento del brand prima di un colloquio o outreach."

def brand_signal(b):
    name=b["name"]
    q=f'"{name}" fashion (opening OR expansion OR hiring OR showroom OR flagship OR launch OR appoints OR revenue OR sales OR Instagram OR TikTok) when:{SIGNAL_DAYS}d'
    out=[]
    for e in rss_search(q,6):
        published=published_iso(e)
        if not published or age_days(published)>SIGNAL_DAYS:continue
        text=(e.get("title","")+" "+clean_html(e.get("summary",""))).strip()
        nt=norm(text); nn=norm(name)
        tokens=[x for x in nn.split() if len(x)>2]
        if tokens and not all(t in nt for t in tokens[:2]):continue
        if not any(x in text.lower() for x in FASHION_CONTEXT):continue
        typ=classify(text)
        score=68
        if typ in ("store_opening","expansion","hiring_velocity","management_change"):score+=12
        if typ in ("category_launch","financial_momentum","social_signal"):score+=7
        if any(x in text.lower() for x in TARGET_TERMS):score+=10
        link=e.get("link","")
        if not link:continue
        out.append({"key":hashlib.sha1((name+"|"+link).encode()).hexdigest()[:20],"brand":name,"headline":e.get("title","Public signal"),"signal_type":typ,"score":min(score,96),"confidence":"public-signal correlation","reason":interview_takeaway(text,typ),"detected_at":now.isoformat(),"published_at":published,"source":source_name(e),"url":link})
    return out

# Drop stale legacy signals first.
signals=[s for s in old_signals if age_days(s.get("published_at") or s.get("detected_at"))<=SIGNAL_DAYS]
known={x.get("key") for x in signals}

# Rotate one third of the brand universe every 5 minutes: all brands are covered every 15 minutes.
slot=(now.minute//5)%3
watch=[b for i,b in enumerate(brands) if i%3==slot]
with ThreadPoolExecutor(max_workers=10) as ex:
    futs=[ex.submit(brand_signal,b) for b in watch]
    for fut in as_completed(futs):
        try:
            for s in fut.result():
                if s["key"] not in known:
                    signals.append(s);known.add(s["key"])
        except Exception:pass

news_queries=[
    f'"fashion luxury" (Milan OR Milano OR Italy OR Italia) when:{FASHION_DAYS}d',
    f'"luxury retail" (Milan OR Milano OR Italy) when:{FASHION_DAYS}d',
    f'"fashion" "new store" (Milan OR Milano OR London OR Switzerland OR Rome OR Florence) when:{FASHION_DAYS}d',
    f'"fashion" hiring luxury (Italy OR Milan OR London OR Switzerland) when:{FASHION_DAYS}d',
    f'"luxury" "creative director" appoints when:{FASHION_DAYS}d',
    f'"fashion luxury" earnings results when:{FASHION_DAYS}d',
    f'"Milan Fashion Week" luxury when:{FASHION_DAYS}d',
    f'"fashion brand" acquisition investment when:{FASHION_DAYS}d',
    f'"luxury" showroom Milan when:{FASHION_DAYS}d',
    f'"fashion wholesale" Italy luxury when:{FASHION_DAYS}d',
    f'"luxury brand" expansion Europe when:{FASHION_DAYS}d',
    f'"fashion" Instagram TikTok luxury brand when:{FASHION_DAYS}d',
    f'"moda lusso" Milano apertura when:{FASHION_DAYS}d',
    f'"moda" nomina direttore creativo when:{FASHION_DAYS}d',
    f'"luxury fashion" business strategy when:{FASHION_DAYS}d',
    f'"fashion retail" Europe openings when:{FASHION_DAYS}d',
    f'"luxury fashion" mergers acquisitions when:{FASHION_DAYS}d',
    f'"fashion ecommerce" luxury growth when:{FASHION_DAYS}d',
    f'"fashion brand" collaboration launch when:{FASHION_DAYS}d',
    f'"fashion luxury" wholesale showroom when:{FASHION_DAYS}d'
]
fashion=[];seen_links=set()
for q in news_queries:
    for e in rss_search(q,10):
        link=e.get("link","")
        published=published_iso(e)
        if not link or link in seen_links or not published or age_days(published)>FASHION_DAYS:continue
        seen_links.add(link)
        title=e.get("title","").strip()
        summary=clean_html(e.get("summary",""))
        text=title+" "+summary
        if not any(x in text.lower() for x in FASHION_CONTEXT):continue
        typ=classify(text)
        fashion.append({"key":hashlib.sha1(link.encode()).hexdigest()[:20],"headline":title,"source":source_name(e),"published_at":published,"topic":typ,"why_it_matters":interview_takeaway(text,typ),"url":link})

fashion=sorted(fashion,key=lambda x:x.get("published_at",""),reverse=True)[:80]
signals=sorted(signals,key=lambda x:x.get("published_at") or x.get("detected_at",""),reverse=True)[:400]

# Correlate recent signals into spontaneous-application suggestions.
weights={"store_opening":32,"expansion":26,"hiring_velocity":30,"management_change":18,"category_launch":18,"financial_momentum":12,"social_signal":10,"industry_news":5}
by_brand={}
for s in signals:
    if age_days(s.get("published_at") or s.get("detected_at"))>30:continue
    by_brand.setdefault(s.get("brand"),[]).append(s)
job_counts={}
for j in jobs:job_counts[j.get("brand")]=job_counts.get(j.get("brand"),0)+1
spontaneous=[]
for b in brands:
    ss=by_brand.get(b["name"],[])
    if not ss:continue
    types={s.get("signal_type") for s in ss}
    score=22+sum(weights.get(t,0) for t in types)
    target_hits=sum(1 for s in ss if any(x in (s.get("headline") or "").lower() for x in TARGET_TERMS))
    score+=min(16,target_hits*8)
    open_roles=job_counts.get(b["name"],0)
    if open_roles:score+=8
    score=min(score,97)
    if score<55:continue
    labels=[]
    maplbl={"store_opening":"Apertura/store","expansion":"Espansione/investimenti","hiring_velocity":"Hiring in crescita","management_change":"Nuova leadership","category_launch":"Nuova categoria/lancio","financial_momentum":"Momentum business","social_signal":"Buzz social","industry_news":"News di settore"}
    for t in sorted(types,key=lambda t:weights.get(t,0),reverse=True):
        labels.append(maplbl.get(t,t))
    if open_roles:labels.append(f"{open_roles} ruolo/i HUNT già rilevato/i")
    action="Candidatura spontanea" if open_roles==0 else "Outreach mirato"
    top=sorted(ss,key=lambda x:x.get("score",0),reverse=True)[0]
    why=f"{b['name']} mostra {len(types)} segnali diversi nello stesso periodo. HUNT li considera più interessanti insieme che presi singolarmente."
    spontaneous.append({"key":hashlib.sha1(("spont|"+b["id"]+"|"+now.strftime("%Y-%m")).encode()).hexdigest()[:20],"brand":b["name"],"score":score,"action":action,"why_now":why,"reasons":labels[:5],"signal_count":len(ss),"open_roles":open_roles,"url":top.get("url"),"updated_at":now.isoformat()})

spontaneous=sorted(spontaneous,key=lambda x:x["score"],reverse=True)[:25]

# Fresh high-value items eligible for push notifications.
new_intel=[s for s in signals if age_days(s.get("published_at"))<=7 and s.get("score",0)>=84 and s.get("signal_type") in {"store_opening","expansion","hiring_velocity","management_change","social_signal"}]
new_spont=[x for x in spontaneous if x.get("score",0)>=80]
new_fashion=[x for x in fashion if age_days(x.get("published_at"))<=2 and x.get("topic") in {"store_opening","expansion","management_change","financial_momentum","category_launch","social_signal"}]

dump("data/signals.json",signals)
dump("data/fashion_news.json",fashion)
dump("data/spontaneous.json",spontaneous)
dump("data/new_intelligence_alerts.json",new_intel)
dump("data/new_spontaneous_alerts.json",new_spont)
dump("data/new_fashion_alerts.json",new_fashion)
print("Signals:",len(signals),"Fashion Now:",len(fashion),"Spontaneous:",len(spontaneous),"Push intel:",len(new_intel),"Push fashion:",len(new_fashion))
