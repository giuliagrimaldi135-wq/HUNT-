import json, hashlib, re
from pathlib import Path
from datetime import datetime, timezone
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
load = lambda p, d: json.loads((ROOT / p).read_text()) if (ROOT / p).exists() else d
dump = lambda p, x: (ROOT / p).write_text(json.dumps(x, ensure_ascii=False, indent=2))

brands = load("config/brands.json", [])
profile = load("config/profile.json", {})
old = load("data/jobs.json", [])
history = load("data/history.json", {})
now_dt = datetime.now(timezone.utc)
now = now_dt.isoformat()

JUNIOR = ["intern", "internship", "stage", "junior", "assistant", "graduate", "trainee"]
HARD_SENIOR = ["senior", "manager", "director", "head of", "head ", "lead ", "principal", "owner", "chief"]
SALES_ONLY = ["sales assistant", "client advisor", "style advisor", "sales associate", "store assistant"]
IRRELEVANT = ["compliance", "security", "internal audit", "controlling", "non-merchandise"]
CORE_PATTERNS = [r"\bmerchand\w*",r"\bbuying\b",r"\bbuyer\b",r"\bretail planning\b",r"\bplanning\b",r"\ballocation\b",r"\bwholesale\b",r"\bproduct development\b",r"\bomnichannel\b",r"\be-?commerce\b",r"\bbusiness analyst\b",r"\bbusiness intelligence\b",r"\btrade marketing\b",r"\bretail performance\b"]
ADJACENT_PATTERNS = [r"\bbrand management\b",r"\bbrand strategy\b",r"\bretail operations\b",r"\bcommercial\b",r"\bdigital marketing\b"]
SKILLS = [x.lower() for x in profile.get("skills", [])]
ITALY = ["milano","milan","italy","italia","firenze","florence","roma","rome","scandicci"]
FOREIGN = ["united states","switzerland","france","germany","spain","united kingdom","china","japan","korea","uae","dubai"]

session = requests.Session()
session.headers.update({"User-Agent":"Mozilla/5.0 HUNT-Radar/1.2 (+public career monitoring)"})

def clean(s): return re.sub(r"\s+"," ",s or "").strip()
def has_any_pattern(text,pats): return any(re.search(p,text,flags=re.I) for p in pats)
def canonical_key(url,brand,title): return hashlib.sha1((url or f"{brand}|{title}").split("#")[0].strip().lower().encode()).hexdigest()[:20]

def role_family(title):
    t=title.lower()
    if "merchand" in t:return "Merchandising"
    if re.search(r"\bbuying\b|\bbuyer\b",t):return "Buying"
    if "planning" in t or "allocation" in t:return "Planning/Allocation"
    if "product development" in t:return "Product"
    if "wholesale" in t:return "Wholesale"
    if any(x in t for x in ["omnichannel","e-commerce","ecommerce","business analyst","business intelligence","trade marketing","retail performance"]):return "Brand/Business"
    return "Adjacent"

def parse_posted_date(text):
    if not text:return None
    m=re.search(r"Pubblicato\s+il\s+(\d{1,2})/(\d{1,2})/(\d{4})",text,re.I)
    if m:
        d,mo,y=map(int,m.groups())
        try:return datetime(y,mo,d,tzinfo=timezone.utc).isoformat()
        except:pass
    m=re.search(r"\b(20\d{2})-(\d{2})-(\d{2})\b",text)
    if m:
        y,mo,d=map(int,m.groups())
        try:return datetime(y,mo,d,tzinfo=timezone.utc).isoformat()
        except:pass
    for m in re.finditer(r"\b(\d{1,2})/(\d{1,2})/(20\d{2})\b",text):
        a,b,y=map(int,m.groups())
        try:
            if a>12:d,mo=a,b
            elif b>12:mo,d=a,b
            else:continue
            return datetime(y,mo,d,tzinfo=timezone.utc).isoformat()
        except:pass
    return None

def extract_years_required(text):
    if not text:return None
    t=text.lower();vals=[]
    pats=[
        r"(?:at least|minimum(?: of)?|min\.?)[^\d]{0,20}(\d+)\+?\s*(?:years?|anni)",
        r"(\d+)\+?\s*(?:years?|anni)\s+(?:of\s+)?(?:relevant\s+|working\s+|professional\s+)?experience",
        r"(\d+)\s*[-–]\s*(\d+)\s*(?:years?|anni)\s+(?:of\s+)?(?:relevant\s+|working\s+|professional\s+)?experience",
        r"(?:experience|esperienza)[^\d]{0,25}(\d+)\+?\s*(?:years?|anni)"
    ]
    for p in pats:
        for m in re.finditer(p,t,re.I):
            try:vals.append(int(m.group(1)))
            except:pass
    return max(vals) if vals else None

def is_direct_job_url(url):
    if not url:return False
    u=url.lower()
    if "kering.com" in u:return "/offerte-di-lavoro/" in u and "/europe/" in u and not u.rstrip("/").endswith("/europe")
    if "zegnagroup.com" in u:return "job-details" in u and "jobid=" in u
    if "pradagroup.com" in u:return "job" in u and not u.rstrip("/").endswith("job-opportunities")
    return True

def detail_metadata(url,card_context):
    try:
        r=session.get(url,timeout=16,allow_redirects=True);r.raise_for_status();final_url=r.url
        if not is_direct_job_url(final_url):return None
        soup=BeautifulSoup(r.text,"html.parser");text=clean(soup.get_text(" ",strip=True))
        meta={"url":final_url,"published_at":parse_posted_date(card_context) or parse_posted_date(text[:2500]),"years_required":extract_years_required(text),"text":text[:12000],"location":None}
        low=text[:1400].lower()
        if any(x in low for x in FOREIGN) and not any(x in low for x in ITALY):meta["location"]="FOREIGN"
        elif "milano" in low or "milan" in low:meta["location"]="Milano"
        elif "italy" in low or "italia" in low:meta["location"]="Italy"
        return meta
    except:return None

def score_job(title,detail_text,location_ok):
    t=title.lower();c=(detail_text or "").lower()
    if len(title)<8 or t in {"brands","careers","jobs","opportunities"}:return None
    if any(x in t for x in IRRELEVANT):return None
    if any(x in t for x in SALES_ONLY) and "merchand" not in t and "operations" not in t:return None
    if any(x in t for x in HARD_SENIOR) and not any(x in t for x in JUNIOR):return None
    core=has_any_pattern(t,CORE_PATTERNS);adjacent=has_any_pattern(t,ADJACENT_PATTERNS);junior=any(x in t for x in JUNIOR)
    if not core and not (adjacent and junior):return None
    score=24;reasons=[]
    if core:score+=34;reasons.append("Ruolo coerente dal titolo")
    elif adjacent:score+=22;reasons.append("Ruolo adiacente coerente")
    if junior:score+=18;reasons.append("Seniority junior/intern")
    if location_ok:score+=14;reasons.append("Italia/Milano coerente")
    skill_hits=[s for s in SKILLS if s in c]
    if skill_hits:score+=min(10,2*len(skill_hits));reasons.append("Competenze: "+", ".join(skill_hits[:4]))
    fam=role_family(title)
    if fam in {"Merchandising","Buying","Planning/Allocation","Product","Wholesale"}:score+=4
    return max(0,min(100,score)),reasons,fam

found=[];status={};seen_urls=set()
for b in brands:
    if not b.get("enabled") or not b.get("url"):continue
    try:
        r=session.get(b["url"],timeout=18);r.raise_for_status();soup=BeautifulSoup(r.text,"html.parser");candidates=[]
        for el in soup.find_all(["a","h1","h2","h3","h4","li"]):
            title=clean(el.get_text(" ",strip=True))
            if not title or len(title)>170:continue
            if not (has_any_pattern(title,CORE_PATTERNS+ADJACENT_PATTERNS) or any(x in title.lower() for x in JUNIOR)):continue
            link=el.get("href") if el.name=="a" else None
            if not link:
                a=el.find("a",href=True);link=a.get("href") if a else None
            if not link:continue
            link=requests.compat.urljoin(b["url"],link)
            context=title;parent=el.parent
            for _ in range(3):
                if parent is None:break
                cc=clean(parent.get_text(" ",strip=True))
                if 20<=len(cc)<=700:context=cc
                parent=parent.parent
            candidates.append((title,context,link))
        local_seen=set()
        for title,context,url in candidates:
            ub=url.split("#")[0]
            if ub in local_seen or ub in seen_urls:continue
            local_seen.add(ub)
            meta=detail_metadata(url,context)
            if not meta or meta.get("location")=="FOREIGN":continue
            years=meta.get("years_required");junior_by_title=any(x in title.lower() for x in JUNIOR)
            if years is not None and years>=3:continue
            junior_fit = junior_by_title and (years is None or years <= 1)
            location=meta.get("location") or ("Italy" if b.get("location_scope","").lower()=="italy" else "Location to verify")
            location_ok=location in {"Milano","Italy"}
            scored=score_job(title,meta.get("text",""),location_ok)
            if not scored:continue
            score,reasons,family=scored
            if score<55:continue
            if years is not None:
                reasons.append(f"Esperienza richiesta rilevata: {years}+ anni")
                if years >= 2:
                    score = min(score - 30, 64)
                    reasons.append("Fuori dal profilo junior prioritario")
            if not junior_fit and not junior_by_title:
                score = min(score, 72)
            if score < 55:
                continue
            final_url=meta["url"];seen_urls.add(final_url.split("#")[0]);k=canonical_key(final_url,b["name"],title)
            prev=next((x for x in old if x.get("url","").split("#")[0]==final_url.split("#")[0] or x.get("key")==k),None)
            found.append({"key":k,"brand":b["name"],"title":title,"location":location,"score":score,"reasons":reasons,"role_family":family,"recommended_cv":"fashion_mgmt" if family=="Brand/Business" else "merch_buying","url":final_url,"source_name":b["name"]+" careers","provider":"career_page","published_at":meta.get("published_at"),"years_required":years,"junior_fit":junior_fit,"first_seen_at":prev.get("first_seen_at") if prev else now,"last_seen_at":now})
        status[b["id"]]={"ok":True,"http":r.status_code,"items":sum(1 for x in found if x["source_name"]==b["name"]+" careers"),"checked_at":now}
    except Exception as e:status[b["id"]]={"ok":False,"error":str(e)[:160],"checked_at":now}

found=sorted(found,key=lambda x:(x["score"],x.get("published_at") or x["first_seen_at"]),reverse=True)[:400]
old_urls={x.get("url","").split("#")[0] for x in old}
def fresh_enough(job):
    p=job.get("published_at")
    if not p:return False
    try:return (now_dt-datetime.fromisoformat(p)).total_seconds()/86400<=7
    except:return False
alerts=[x for x in found if x["url"].split("#")[0] not in old_urls and x["score"]>=85 and x.get("junior_fit") and fresh_enough(x)]
dump("data/jobs.json",found);dump("data/new_alerts.json",alerts);dump("data/source_status.json",{"generated_at":now,"sources":status})

signals=load("data/signals.json",[]);today=now[:10]
for b in brands:
    if not b.get("enabled"):continue
    count=sum(1 for x in found if x["source_name"]==b["name"]+" careers");bh=history.setdefault(b["id"],{});prev=bh.get("last_count")
    if isinstance(prev,int) and count-prev>=3:
        sk=hashlib.sha1(f"{b['name']}|hiring acceleration|{today}".encode()).hexdigest()[:20]
        if not any(s.get("key")==sk for s in signals):signals.append({"key":sk,"brand":b["name"],"headline":f"Hiring acceleration: +{count-prev} relevant roles","signal_type":"hiring_velocity","score":82,"confidence":"rule-based","reason":"Il numero di ruoli rilevanti è cresciuto rapidamente rispetto alla scansione precedente.","detected_at":now,"url":b.get("url")})
    bh.update({"last_count":count,"updated_at":now})
dump("data/history.json",history);dump("data/signals.json",signals[-200:]);print(f"HUNT scan: {len(found)} relevant jobs, {len(alerts)} fresh high alerts, {sum(1 for x in status.values() if x.get('ok'))} sources online")
