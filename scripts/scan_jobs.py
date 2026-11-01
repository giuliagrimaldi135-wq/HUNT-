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
now = datetime.now(timezone.utc).isoformat()

JUNIOR = ["intern", "internship", "stage", "junior", "assistant", "graduate", "trainee"]
SENIOR = ["manager", "director", "head", "lead", "senior", "owner"]
SALES_ONLY = ["sales assistant", "client advisor", "style advisor", "sales associate", "store assistant"]
IRRELEVANT = ["compliance", "security", "internal audit", "controlling", "non-merchandise"]

CORE_PATTERNS = [
    r"\bmerchand\w*",
    r"\bbuying\b", r"\bbuyer\b",
    r"\bretail planning\b", r"\bplanning\b",
    r"\ballocation\b",
    r"\bwholesale\b",
    r"\bproduct development\b",
    r"\bomnichannel\b",
    r"\be-?commerce\b",
    r"\bbusiness analyst\b",
    r"\bbusiness intelligence\b",
    r"\btrade marketing\b",
]
ADJACENT_PATTERNS = [
    r"\bbrand management\b", r"\bbrand strategy\b",
    r"\bretail operations\b", r"\bcommercial\b",
    r"\bdigital marketing\b", r"\bretail performance\b",
]
SKILLS = [x.lower() for x in profile.get("skills", [])]
ITALY = ["milano", "milan", "italy", "italia", "firenze", "florence", "roma", "rome"]
FOREIGN = ["united states", "switzerland", "france", "germany", "spain", "uk", "united kingdom", "china", "japan", "korea", "uae", "dubai"]

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
    if "omnichannel" in t or "e-commerce" in t or "ecommerce" in t or "business analyst" in t or "business intelligence" in t or "trade marketing" in t: return "Brand/Business"
    return "Adjacent"

def explicit_location(title, context, scope):
    tl = title.lower()
    cl = context.lower()
    for foreign in FOREIGN:
        if foreign in tl:
            return None, False
    if any(x in tl for x in ITALY):
        city = "Milano" if ("milano" in tl or "milan" in tl) else "Italy"
        return city, True
    if scope.lower() == "italy":
        return "Italy", True
    # For mixed-location sources, trust context only when it is short/local to the job card.
    if len(context) < 350 and any(x in cl for x in ITALY) and not any(x in cl for x in FOREIGN):
        return ("Milano" if ("milano" in cl or "milan" in cl) else "Italy"), True
    return "Location to verify", False

def score_job(title, context, scope):
    t = title.lower()
    c = context.lower()
    if len(title) < 8 or title.lower() in {"brands", "careers", "jobs", "opportunities"}:
        return None
    if any(x in t for x in IRRELEVANT):
        return None
    if any(x in t for x in SALES_ONLY) and "merchand" not in t and "operations" not in t:
        return None

    core = has_any_pattern(t, CORE_PATTERNS)
    adjacent = has_any_pattern(t, ADJACENT_PATTERNS)
    junior = any(x in t for x in JUNIOR)
    if not core and not (adjacent and junior):
        return None

    location, location_ok = explicit_location(title, context, scope)
    if location is None:
        return None

    score = 24
    reasons = []
    if core:
        score += 34
        reasons.append("Ruolo coerente dal titolo")
    elif adjacent:
        score += 22
        reasons.append("Ruolo adiacente coerente")

    if junior:
        score += 18
        reasons.append("Seniority junior/intern")
    if any(x in t for x in SENIOR):
        score -= 28
        reasons.append("Seniority probabilmente troppo alta")

    if location_ok:
        score += 14
        reasons.append("Italia/Milano coerente")
    else:
        score -= 8
        reasons.append("Location da verificare")

    skill_hits = [s for s in SKILLS if s in c]
    if skill_hits:
        score += min(10, 2 * len(skill_hits))
        reasons.append("Competenze: " + ", ".join(skill_hits[:4]))

    family = role_family(title)
    if family in {"Merchandising", "Buying", "Planning/Allocation", "Product", "Wholesale"}:
        score += 4

    return max(0, min(100, score)), reasons, location, family

session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0 HUNT-Radar/1.1 (+public career monitoring)"})
found = []
status = {}
seen_urls = set()

for b in brands:
    if not b.get("enabled") or not b.get("url"):
        continue
    try:
        r = session.get(b["url"], timeout=18)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        candidates = []

        for el in soup.find_all(["a", "h1", "h2", "h3", "h4", "li"]):
            title = clean(el.get_text(" ", strip=True))
            if not title or len(title) > 170:
                continue
            if not (has_any_pattern(title, CORE_PATTERNS + ADJACENT_PATTERNS) or any(x in title.lower() for x in JUNIOR)):
                continue

            link = el.get("href") if el.name == "a" else None
            if not link:
                a = el.find("a", href=True)
                link = a.get("href") if a else None
            if link:
                link = requests.compat.urljoin(b["url"], link)
            else:
                continue

            # Prefer local card text; never use the whole page as scoring context.
            parent = el.parent
            context = clean(parent.get_text(" ", strip=True) if parent else title)[:320]
            candidates.append((title, context, link))

        local_seen = set()
        for title, context, url in candidates:
            url_base = url.split("?")[0]
            if url_base in local_seen or url_base in seen_urls:
                continue
            local_seen.add(url_base)

            scored = score_job(title, context, b.get("location_scope", "Mixed"))
            if not scored:
                continue
            score, reasons, location, family = scored
            if score < 55:
                continue

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

found = sorted(found, key=lambda x: (x["score"], x["first_seen_at"]), reverse=True)[:400]
old_urls = {x.get("url", "").split("?")[0] for x in old}
alerts = [x for x in found if x["url"].split("?")[0] not in old_urls and x["score"] >= 80]

dump("data/jobs.json", found)
dump("data/new_alerts.json", alerts)
dump("data/source_status.json", {"generated_at": now, "sources": status})

signals = load("data/signals.json", [])
today = now[:10]
for b in brands:
    if not b.get("enabled"):
        continue
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
