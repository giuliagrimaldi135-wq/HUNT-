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
    "store_opening":["new store","new flagship","store opening","opening store","apertura","nuovo negozio","new boutique","inaugura","apre ","riapre","debutta nel retail"],
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

JOB_POST_TERMS=["sales assistant","client advisor","sales associate","retail assistant","merchandising intern","planning intern","internship","stage ","vacancy","job offer","job opportunity","apply now","candidati","posizione aperta","offerta di lavoro"]
AUTOMOTIVE_TERMS=["diesel engine","gasolio","motore diesel","audi","bmw","q5","suv","automotive","car ","auto ","fuel","benzina","emissioni"]
FASHION_DISAMBIG=["fashion","moda","denim","apparel","collection","collezione","retail","store","boutique","otb","runway","designer"]

def looks_like_job_post(text,source=""):
    t=(text+" "+source).lower()
    return any(x in t for x in JOB_POST_TERMS)

def brand_context_ok(name,text):
    t=text.lower()
    if name.lower()=="diesel" and any(x in t for x in AUTOMOTIVE_TERMS):
        return any(x in t for x in FASHION_DISAMBIG)
    return True

def market_reason(topic):
    return {
      "energy":"Energia e logistica incidono sui costi operativi e sui margini: in merchandising/buying aiutano a leggere pricing, budget e pressione sui markdown.",
      "consumer":"Domanda e fiducia dei consumatori influenzano sell-through, stock, assortimento e velocità di riordino: è utile per ragionare sui KPI retail.",
      "currency":"EUR/CHF/GBP possono cambiare tourist spending, pricing relativo e performance tra Milano, Svizzera e Londra.",
      "luxury_market":"La crescita o il rallentamento del luxury influenza budget, aperture, hiring e livello di selettività dei brand.",
      "sourcing":"Materie prime e sourcing impattano costo prodotto, margine, timing e scelte di assortimento.",
      "trade":"Tariffe e commercio internazionale possono cambiare costi, mercati prioritari e distribuzione wholesale."
    }.get(topic,"Segnale macro utile per capire domanda, margini, retail e hiring nel fashion/luxury.")

def rss_search(query,limit=10):
    url="https://news.google.com/rss/search?q="+urllib.parse.quote(query)+"&hl=it&gl=IT&ceid=IT:it"
    try:
        raw=requests.get(url,timeout=14,headers=HEADERS).content
        return feedparser.parse(raw).entries[:limit]
    except Exception:return []

def classify(text):
    t=text.lower()
    opening_actions=["opens","opening","apre ","inaugura","riapre","debutta nel retail","new store","new flagship","nuovo negozio","new boutique"]
    retail_places=["store","flagship","boutique","showroom","retail","negozio"]
    if any(a in t for a in opening_actions) and any(p in t for p in retail_places):
        return "store_opening"
    for typ,words in keywords.items():
        if typ=="store_opening":continue
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
    t=text.lower()
    if typ=="store_opening":
        return "Il brand sta aprendo, riaprendo o facendo debuttare uno spazio retail. Per te conta perché un'apertura richiede lavoro su assortimento, stock, merchandising, visual e operations e può creare bisogno di nuove persone."
    if typ=="expansion":
        return "Il brand sta crescendo, investendo o entrando in nuovi mercati. Per te conta perché la crescita può aumentare budget, team, wholesale, retail e bisogno di profili junior."
    if typ=="hiring_velocity":
        return "Ci sono segnali di rafforzamento del team. Per te significa che può essere utile candidarti anche prima che venga pubblicata la vacancy perfetta."
    if typ=="management_change":
        return "È cambiata una figura di leadership. Per te conta perché nuova leadership spesso porta nuove priorità, categorie, progetti e talvolta nuove assunzioni."
    if typ=="financial_momentum":
        return "Il brand sta comunicando risultati, ricavi o investimenti. Per te conta perché performance e budget possono incidere su aperture, assortimenti, retail e hiring."
    if typ=="category_launch":
        return "Il brand sta lanciando una nuova categoria, capsule o collaborazione. Per te conta perché aumenta il lavoro su assortment, pricing, buying, merchandising e go-to-market."
    if typ=="social_signal":
        return "Il brand sta avendo un movimento social rilevante. Da solo non basta per candidarsi: HUNT lo usa solo se può essere collegato a prodotto, retail, lancio o crescita."
    return "Questa notizia aiuta a capire cosa sta facendo il brand adesso. È utile soprattutto per arrivare a un colloquio o a una candidatura con un riferimento concreto, non con motivazioni generiche."

def brand_signal(b):
    name=b["name"]
    q=f'"{name}" fashion (opening OR expansion OR hiring OR showroom OR flagship OR launch OR appoints OR revenue OR sales OR Instagram OR TikTok) when:{SIGNAL_DAYS}d'
    out=[]
    for e in rss_search(q,6):
        published=published_iso(e)
        if not published or age_days(published)>SIGNAL_DAYS:continue
        text=(e.get("title","")+" "+clean_html(e.get("summary",""))).strip()
        src=source_name(e)
        if looks_like_job_post(e.get("title",""),src):continue
        if not brand_context_ok(name,text):continue
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
for s0 in signals:
    txt=(s0.get("headline") or "")
    s0["signal_type"]=classify(txt)
    s0["reason"]=interview_takeaway(txt,s0["signal_type"])
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
        src=source_name(e)
        if looks_like_job_post(title,src):continue
        if not any(x in text.lower() for x in FASHION_CONTEXT):continue
        typ=classify(text)
        fashion.append({"key":hashlib.sha1(link.encode()).hexdigest()[:20],"headline":title,"source":source_name(e),"published_at":published,"topic":typ,"why_it_matters":interview_takeaway(text,typ),"url":link})

fashion=sorted(fashion,key=lambda x:x.get("published_at",""),reverse=True)[:80]
signals=sorted(signals,key=lambda x:x.get("published_at") or x.get("detected_at",""),reverse=True)[:400]

MARKET_DAYS=10
market_specs=[
 ("luxury_market",f'"luxury goods" market sales growth decline Europe Italy when:{MARKET_DAYS}d'),
 ("luxury_market",f'"luxury sector" demand fashion Europe China Italy when:{MARKET_DAYS}d'),
 ("energy",f'energy prices (fashion OR textile OR retail OR logistics) Italy Europe when:{MARKET_DAYS}d'),
 ("consumer",f'consumer spending luxury fashion Italy Europe when:{MARKET_DAYS}d'),
 ("consumer",f'consumer confidence retail fashion Italy when:{MARKET_DAYS}d'),
 ("currency",f'(EUR OR CHF OR GBP) luxury fashion tourism retail Europe when:{MARKET_DAYS}d'),
 ("sourcing",f'(leather OR textile OR cotton OR wool) prices fashion Europe when:{MARKET_DAYS}d'),
 ("trade",f'(tariffs OR trade) fashion luxury Europe when:{MARKET_DAYS}d')
]
market=[];market_seen=set()
for topic,q in market_specs:
    for e in rss_search(q,7):
        link=e.get("link","");published=published_iso(e);title=e.get("title","").strip()
        if not link or link in market_seen or not published or age_days(published)>MARKET_DAYS:continue
        if looks_like_job_post(title,source_name(e)):continue
        market_seen.add(link)
        market.append({"key":hashlib.sha1(("market|"+link).encode()).hexdigest()[:20],"headline":title,"source":source_name(e),"published_at":published,"topic":topic,"why_it_matters":market_reason(topic),"url":link})
market=sorted(market,key=lambda x:x.get("published_at",""),reverse=True)[:40]

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
    target_hits=sum(1 for s in ss if any(x in (s.get("headline") or "").lower() for x in TARGET_TERMS))
    strong_types={"store_opening","expansion","hiring_velocity"}
    if len(types)<2 and not (types & strong_types and target_hits>0):continue
    location_bonus=min(24,target_hits*12)
    if len(types)==1 and "store_opening" in types and target_hits:location_bonus=24
    score=22+sum(weights.get(t,0) for t in types)+location_bonus
    open_roles=job_counts.get(b["name"],0)
    # Spontaneous outreach is only useful when there is no direct vacancy to apply to.
    if open_roles:continue
    # Keep this section focused on independent/emerging brands rather than large maisons.
    if b.get("tier")!="emerging" and b.get("enabled",False):continue
    score=min(score,97)
    if score<65:continue
    labels=[]
    maplbl={"store_opening":"Apertura/store","expansion":"Espansione/investimenti","hiring_velocity":"Hiring in crescita","management_change":"Nuova leadership","category_launch":"Nuova categoria/lancio","financial_momentum":"Momentum business","social_signal":"Buzz social","industry_news":"News di settore"}
    for t in sorted(types,key=lambda t:weights.get(t,0),reverse=True):
        labels.append(maplbl.get(t,t))
    action="Candidatura spontanea"
    top=sorted(ss,key=lambda x:x.get("score",0),reverse=True)[0]
    why=f"{b['name']} mostra {len(types)} segnali diversi nello stesso periodo" + (" nelle località che ti interessano." if target_hits else ".") + " La combinazione è abbastanza forte da giustificare un outreach mirato."
    spontaneous.append({"key":hashlib.sha1(("spont|"+b["id"]+"|"+now.strftime("%Y-%m")).encode()).hexdigest()[:20],"brand":b["name"],"score":score,"action":action,"why_now":why,"reasons":labels[:5],"signal_count":len(ss),"open_roles":open_roles,"url":top.get("url"),"updated_at":now.isoformat()})

spontaneous=sorted(spontaneous,key=lambda x:x["score"],reverse=True)[:25]

# Fresh high-value items eligible for push notifications.
new_intel=[s for s in signals if age_days(s.get("published_at"))<=7 and s.get("score",0)>=84 and s.get("signal_type") in {"store_opening","expansion","hiring_velocity","management_change","social_signal"}]
new_spont=[x for x in spontaneous if x.get("score",0)>=75]
new_fashion=[x for x in fashion if age_days(x.get("published_at"))<=2 and x.get("topic") in {"store_opening","expansion","management_change","financial_momentum","category_launch","social_signal"}]
new_market=[x for x in market if age_days(x.get("published_at"))<=2][:6]

dump("data/signals.json",signals)
dump("data/fashion_news.json",fashion)
dump("data/market_pulse.json",market)
dump("data/spontaneous.json",spontaneous)
dump("data/new_intelligence_alerts.json",new_intel)
dump("data/new_spontaneous_alerts.json",new_spont)
dump("data/new_fashion_alerts.json",new_fashion)
dump("data/new_market_alerts.json",new_market)
print("Signals:",len(signals),"Fashion Now:",len(fashion),"Market:",len(market),"Spontaneous:",len(spontaneous),"Push intel:",len(new_intel),"Push fashion:",len(new_fashion))
