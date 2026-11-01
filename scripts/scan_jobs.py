import json, hashlib, re
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
load = lambda p, d: json.loads((ROOT / p).read_text()) if (ROOT / p).exists() else d
dump = lambda p, x: (ROOT / p).write_text(json.dumps(x, ensure_ascii=False, indent=2))

brands = load("config/brands.json", [])
profile = load("config/profile.json", {})
old = load("data/jobs.json", [])
history = load("data/history.json", {})
now = datetime.now(timezone.utc).isoformat()

JUNIOR = ["intern", "internship", "stage", "junior", "assistant", "graduate", "trainee", "student"]
SENIOR_TITLE = ["senior", "manager", "director", "head", "lead", "principal", "owner"]
SALES_ONLY = ["sales assistant", "client advisor", "style advisor", "sales associate", "store assistant"]
IRRELEVANT = ["compliance", "security", "internal audit", "controlling", "non-merchandise"]

CORE_PATTERNS = [
    r"\bmerchand\w*", r"\bbuying\b", r"\bbuyer\b", r"\bretail planning\b",
    r"\bplanning\b", r"\ballocation\b", r"\bwholesale\b", r"\bproduct development\b",
    r"\bomnichannel\b", r"\be-?commerce\b", r"\bbusiness analyst\b",
    r"\bbusiness intelligence\b", r"\btrade marketing\b"
]
ADJACENT_PATTERNS = [
    r"\bbrand management\b", r"\bbrand strategy\b", r"\bretail operations\b",
    r"\bcommercial\b", r"\bdigital marketing\b", r"\bretail performance\b"
]
SKILLS = [x.lower() for x in profile.get("skills", [])]
ITALY = ["milano", "milan", "italy", "italia", "firenze", "florence", "roma", "rome", "scandicci"]
FOREIGN = ["united states", "switzerland", "france", "germany", "spain", "united kingdom", "china", "japan", "korea", "uae", "dubai"]

def clean(s):
    return re.sub(r"\s+", " ", s or "").strip()

def has_any_pattern(text, pats):
    return any(re.search(p, text, flags=re.I) for p in pats)

def canonical_key(url, brand, title):
    raw = (url or f"{brand}|{title}").split("?")[0].strip().lower()
    return hashlib.sha1(raw.encode()).hexdigest()[:20]

def role_family(title):
    t = title.lower()
    if "merchand" in t: return "Merchandising"
    if re.search(r"\bbuying\b|\bbuyer\b", t): return "Buying"
    if "planning" in t or "allocation" in t: return "Planning/Allocation"
    if "product development" in t: return "Product"
    if "wholesale" in t: return "Wholesale"
    if any(x in t for x in ["omnichannel", "e-commerce", "ecommerce", "business analyst", "business intelligence", "trade marketing"]): return "Brand/Business"
    return "Adjacent"

def flatten_jsonld(obj):
    if isinstance(obj, dict):
        yield obj
        for v in obj.values():
            yield from flatten_jsonld(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from flatten_jsonld(v)

def parse_date(value):
    if not value: return None
    s = clean(str(value))
    m = re.search(r"(20\d{2})[-/](\d{1,2})[-/](\d{1,2})", s)
    if m:
        y, mo, d = m.groups()
        return f"{int(y):04d}-{int(mo):02d}-{int(d):02d}"
    m = re.search(r"(\d{1,2})/(\d{1,2})/(20\d{2})", s)
    if m:
        d, mo, y = m.groups()
        return f"{int(y):04d}-{int(mo):02d}-{int(d):02d}"
    return None

def extract_experience_years(text):
    t = text.lower()
    vals = []
    for a, b in re.findall(r"(\d+)\s*[-–]\s*(\d+)\s*(?:years?|anni)", t):
        vals.append(int(a))
    for n in re.findall(r"(\d+)\s*\+?\s*(?:years?|anni)(?:\s+of)?\s+(?:working\s+)?experience", t):
        vals.append(int(n))
    for n in re.findall(r"(?:minimum|min\.?|at least|almeno)\s+(\d+)\s*(?:years?|anni)", t):
        vals.append(int(n))
    return min(vals) if vals else None

def fetch_detail(url, title):
    detail = {
        "direct_url_verified": False,
        "published_at": None,
        "apply_url": None,
        "experience_min_years": None,
        "detail_text": ""
    }
    try:
        r = session.get(url, timeout=16)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        text = clean(soup.get_text(" ", strip=True))[:12000]
        detail["detail_text"] = text
        detail["direct_url_verified"] = (len(title) > 8 and title.lower()[:40] in text.lower()) or ("job" in url.lower() or "offerte-di-lavoro" in url.lower())

        for s in soup.find_all("script", attrs={"type": re.compile("ld\+json", re.I)}):
            try:
                payload = json.loads(s.string or s.get_text())
                for node in flatten_jsonld(payload):
                    if str(node.get("@type", "")).lower() == "jobposting":
                        detail["published_at"] = parse_date(node.get("datePosted")) or detail["published_at"]
                        u = node.get("url")
                        if u and isinstance(u, str):
                            detail["direct_url_verified"] = True
            except Exception:
                pass

        if not detail["published_at"]:
            # Kering and many career pages show dd/mm/yyyy near the title.
            m = re.search(r"(?<!\d)(\d{1,2}/\d{1,2}/20\d{2})(?!\d)", text[:1800])
            if m:
                detail["published_at"] = parse_date(m.group(1))

        detail["experience_min_years"] = extract_experience_years(text)

        for a in soup.find_all("a", href=True):
            label = clean(a.get_text(" ", strip=True)).lower()
            if label in {"apply", "applica", "applicare", "candidati", "candidati ora", "apply now"} or label.startswith("apply "):
                href = urljoin(url, a.get("href"))
                if href and href != url:
                    detail["apply_url"] = href
                    break
    except Exception:
        pass
    return detail

def explicit_location(title, detail_text, scope):
    tl = title.lower()
    dl = detail_text.lower()
    if any(x in tl for x in FOREIGN): return None, False
    if any(x in dl[:2500] for x in FOREIGN) and not any(x in dl[:1200] for x in ITALY):
        return None, False
    if any(x in tl for x in ITALY) or "milano - italy" in dl[:2500]:
        return "Milano" if ("milano" in tl or "milan" in tl or "milano - italy" in dl[:2500]) else "Italy", True
    if scope.lower() == "italy": return "Italy", True
    if any(x in dl[:2500] for x in ITALY):
        return "Milano" if ("milano" in dl[:2500] or "milan" in dl[:2500]) else "Italy", True
    return "Location to verify", False

def score_job(title, detail, scope):
    t = title.lower()
    detail_text = detail.get("detail_text", "")
    c = detail_text.lower()
    if len(title) < 8 or t in {"brands", "careers", "jobs", "opportunities"}: return None
    if any(x in t for x in IRRELEVANT): return None
    if any(x in t for x in SALES_ONLY) and "merchand" not in t and "operations" not in t: return None
    if any(x in t for x in SENIOR_TITLE): return None

    core = has_any_pattern(t, CORE_PATTERNS)
    adjacent = has_any_pattern(t, ADJACENT_PATTERNS)
    junior = any(x in t for x in JUNIOR) or any(x in c[:1800] for x in ["student (fixed term)", "trainee", "internship", "stage"])
    if not core and not (adjacent and junior): return None

    exp = detail.get("experience_min_years")
    if exp is not None and exp >= 2 and not junior:
        return None

    location, location_ok = explicit_location(title, detail_text, scope)
    if location is None: return None

    score = 22
    reasons = []
    if core:
        score += 34
        reasons.append("Ruolo coerente dal titolo")
    elif adjacent:
        score += 20
        reasons.append("Ruolo adiacente coerente")
    if junior:
        score += 20
        reasons.append("Seniority junior/intern")
    else:
        score -= 8
        reasons.append("Seniority non esplicitamente junior")

    if location_ok:
        score += 14
        reasons.append("Italia/Milano coerente")
    else:
        score -= 12
        reasons.append("Location da verificare")

    if exp is not None:
        if exp == 0:
            reasons.append("Nessuna esperienza minima rilevata")
        elif exp == 1:
            score -= 4
            reasons.append("Richiede circa 1 anno di esperienza")
        else:
            score -= 25
            reasons.append(f"Richiede almeno {exp} anni")

    skill_hits = [s for s in SKILLS if s in c]
    if skill_hits:
        score += min(10, 2 * len(skill_hits))
        reasons.append("Competenze: " + ", ".join(skill_hits[:4]))

    family = role_family(title)
    if family in {"Merchandising", "Buying", "Planning/Allocation", "Product", "Wholesale"}: score += 4

    return max(0, min(100, score)), reasons, location, family, junior

session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0 HUNT-Radar/1.2 (+public career monitoring)"})
found = []
status = {}
seen_urls = set()

for b in brands:
    if not b.get("enabled") or not b.get("url"): continue
    try:
        r = session.get(b["url"], timeout=18)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        candidates = []

        for el in soup.find_all(["a", "h1", "h2", "h3", "h4", "li"]):
            title = clean(el.get_text(" ", strip=True))
            if not title or len(title) > 170: continue
            if not (has_any_pattern(title, CORE_PATTERNS + ADJACENT_PATTERNS) or any(x in title.lower() for x in JUNIOR)): continue

            link = el.get("href") if el.name == "a" else None
            if not link:
                a = el.find("a", href=True)
                link = a.get("href") if a else None
            if not link: continue
            link = urljoin(b["url"], link)
            candidates.append((title, link))

        local_seen = set()
        for title, url in candidates:
            url_base = url.split("?")[0]
            if url_base in local_seen or url_base in seen_urls: continue
            local_seen.add(url_base)

            # Do not treat a generic careers/listing page as a vacancy.
            if url_base.rstrip("/") == b["url"].split("?")[0].rstrip("/"): continue

            detail = fetch_detail(url, title)
            if not detail["direct_url_verified"]: continue

            scored = score_job(title, detail, b.get("location_scope", "Mixed"))
            if not scored: continue
            score, reasons, location, family, junior_fit = scored
            if score < 55: continue

            seen_urls.add(url_base)
            k = canonical_key(url, b["name"], title)
            prev = next((x for x in old if x.get("key") == k or x.get("url", "").split("?")[0] == url_base), None)

            found.append({
                "key": k,
                "brand": b["name"],
                "title": title,
                "location": location,
                "score": score,
                "reasons": reasons,
                "role_family": family,
                "recommended_cv": "fashion_mgmt" if family == "Brand/Business" else "merch_buying",
                "url": url,
                "apply_url": detail.get("apply_url"),
                "direct_url_verified": detail.get("direct_url_verified", False),
                "published_at": detail.get("published_at"),
                "experience_min_years": detail.get("experience_min_years"),
                "junior_fit": junior_fit,
                "source_name": b["name"] + " careers",
                "provider": "career_page",
                "first_seen_at": prev.get("first_seen_at") if prev else now,
                "last_seen_at": now
            })

        status[b["id"]] = {
            "ok": True, "http": r.status_code,
            "items": sum(1 for x in found if x["source_name"] == b["name"] + " careers"),
            "checked_at": now
        }
    except Exception as e:
        status[b["id"]] = {"ok": False, "error": str(e)[:160], "checked_at": now}

found = sorted(found, key=lambda x: (x["score"], x.get("published_at") or "0000-00-00"), reverse=True)[:400]
old_urls = {x.get("url", "").split("?")[0] for x in old}

def is_recently_published(job, days=7):
    p = job.get("published_at")
    if not p: return False
    try:
        age = (datetime.now(timezone.utc).date() - datetime.fromisoformat(p).date()).days
        return 0 <= age <= days
    except Exception:
        return False

alerts = [
    x for x in found
    if x["url"].split("?")[0] not in old_urls
    and x["score"] >= 80
    and x.get("junior_fit")
    and is_recently_published(x, 7)
]

dump("data/jobs.json", found)
dump("data/new_alerts.json", alerts)
dump("data/source_status.json", {"generated_at": now, "sources": status})

signals = load("data/signals.json", [])
today = now[:10]
for b in brands:
    if not b.get("enabled"): continue
    count = sum(1 for x in found if x["source_name"] == b["name"] + " careers")
    bh = history.setdefault(b["id"], {})
    prev = bh.get("last_count")
    if isinstance(prev, int) and count - prev >= 3:
        sk = hashlib.sha1(f"{b['name']}|hiring acceleration|{today}".encode()).hexdigest()[:20]
        if not any(s.get("key") == sk for s in signals):
            signals.append({
                "key": sk, "brand": b["name"],
                "headline": f"Hiring acceleration: +{count-prev} relevant roles",
                "signal_type": "hiring_velocity", "score": 82,
                "confidence": "rule-based",
                "reason": "Il numero di ruoli rilevanti è cresciuto rapidamente rispetto alla scansione precedente.",
                "detected_at": now, "url": b.get("url")
            })
    bh.update({"last_count": count, "updated_at": now})

dump("data/history.json", history)
dump("data/signals.json", signals[-200:])
print(f"HUNT scan: {len(found)} relevant jobs, {len(alerts)} new high alerts, {sum(1 for x in status.values() if x.get('ok'))} sources online")
