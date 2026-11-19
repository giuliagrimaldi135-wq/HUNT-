#!/usr/bin/env python3
"""Update HUNT's PUBLIC read-only emergency radar directly from official ATS.
No Supabase, auth tokens, CVs, applications, user profiles or paid services.
GitHub Actions periodically runs this script and publishes jobs.json.
"""
from __future__ import annotations
import datetime as dt
import hashlib
import html
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
DAY = dt.timedelta(days=1)
UTC = dt.timezone.utc
now = lambda: dt.datetime.now(UTC)
UTC_ISO = lambda d: d.astimezone(UTC).isoformat().replace("+00:00", "Z")
USER_AGENT = "HUNT-Public-Radar/1.0 (independent read-only career links; GitHub Actions)"
MAX_RESPONSE_BYTES = 7_000_000
MAX_PAGES = 3
MAX_JOBS = 2500


def parse_date(value):
    """Accept explicit ATS date, but never guess a published date."""
    if value is None or value == "":
        return None
    try:
        if isinstance(value, (float, int)) and not isinstance(value, bool):
            num = float(value)
            if num > 1e11:
                num /= 1000
            if num < 1262304000:
                return None
            when = dt.datetime.fromtimestamp(num, UTC)
        else:
            txt = str(value).strip()
            if not re.match(r"^\d{4}-\d\d-\d\d(?:[T ])?", txt):
                return None
            when = dt.datetime.fromisoformat(txt.replace("Z", "+00:00"))
            when = when.replace(tzinfo=when.tzinfo or UTC).astimezone(UTC)
        if dt.datetime(2010, 1, 1, tzinfo=UTC) <= when <= now() + DAY:
            return UTC_ISO(when)
    except (ValueError, OverflowError, OSError):
        pass
    return None


def public_url(value):
    try:
        url = urllib.parse.urlsplit(str(value or ""))
        if (url.scheme.lower() != "https" or not url.hostname or
                url.username or url.password or len(str(value)) > 1200):
            return None
        if not re.fullmatch(r"[a-z0-9.-]+\.[a-z]{2,}", url.hostname, re.I):
            return None
        safe_q = urllib.parse.parse_qsl(url.query, keep_blank_values=True)
        safe_q = [(k, v) for k, v in safe_q if not k.lower().startswith("utm_")
                  and k.lower() not in ("fbclid", "gclid")]
        return urllib.parse.urlunsplit((url.scheme, url.netloc,
                    url.path.rstrip("/") or "/", urllib.parse.urlencode(safe_q), ""))
    except (ValueError, TypeError):
        return None


def clean(txt, limit=200):
    raw = re.sub(r"<[^>]{0,600}>", " ", str(txt or ""))
    return html.unescape(re.sub(r"\s+", " ", raw)).strip()[:limit]


def role_family(title):
    t = title.lower()
    specs = [
        (r"visual merchandis", "Visual Merchandising"),
        (r"\b(?:hr|recruit|human resources|talent acquisition|people partner)\b", "HR & Talent"),
        (r"\b(?:buying|buyer|purchasing)\b", "Buying"),
        (r"\b(?:planning|allocation|forecast|inventory|demand planner)\b", "Planning & Allocation"),
        (r"e-?commerce|digital merchandis|site merchandis", "E-commerce & Digital"),
        (r"merchandis", "Merchandising"),
        (r"\b(?:wholesale|commercial operations)\b", "Wholesale & Commercial"),
        (r"\b(?:supply chain|logistics|warehouse|transport)\b", "Supply Chain & Logistics"),
        (r"retail operations|retail excellence|retail performance|store operations", "Retail & Retail Operations"),
        (r"\b(?:product development|product manager|collection development)\b", "Product Management & Development"),
        (r"\b(?:crm|clienteling)\b", "CRM & Clienteling"),
        (r"pr|communications|public relations|events", "PR, Communications & Events"),
        (r"\b(?:finance|accountant|accounting|controller|legal)\b", "Finance & Legal"),
        (r"\b(?:marketing|brand management)\b", "Marketing & Brand"),
        (r"\b(?:data|analyst|analytics|business intelligence)\b", "Data & Analytics"),
        (r"\b(?:design|creative)\b", "Design & Creative"),
        (r"\b(?:retail|boutique|store)\b", "Retail & Retail Operations"),
    ]
    for pattern, fam in specs:
        if re.search(pattern, t):
            return fam
    return ""


def seniority(title):
    t = title.lower()
    if re.search(r"\b(intern|internship|stage|stagiaire|tirocinio)\b", t):
        return "internship"
    if re.search(r"\b(trainee|apprentice|graduate program)\b", t):
        return "trainee"
    if re.search(r"\b(head of|director|chief|vice president)\b", t):
        return "head_director"
    if re.search(r"\b(senior|principal|sr\.)\b", t):
        return "senior_manager"
    if re.search(r"\b(manager|lead|responsabile)\b", t):
        return "manager"
    if re.search(r"\b(assistant|assistente)\b", t):
        return "assistant"
    if re.search(r"\b(junior|jr\.?)\b", t):
        return "junior"
    return "unspecified"  # Never claim entry-level on title alone.


def get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT,
                        "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=19) as resp:
        if resp.status != 200:
            raise RuntimeError(f"HTTP {resp.status}")
        content = resp.read(MAX_RESPONSE_BYTES + 1)
        if len(content) > MAX_RESPONSE_BYTES:
            raise RuntimeError("ATS response exceeds download limit")
        return json.loads(content)


def pages(board):
    family, ident = board["family"], board["board"]
    if not re.fullmatch(r"[a-zA-Z0-9_-]{2,90}", ident):
        raise ValueError("Invalid board identifier")
    if family == "ats_greenhouse":
        return [f"https://boards-api.greenhouse.io/v1/boards/{ident}/jobs?content=true"]
    if family == "ats_ashby":
        return [f"https://api.ashbyhq.com/posting-api/job-board/{ident}"]
    if family == "ats_workable":
        return [f"https://www.workable.com/api/accounts/{ident}?details=true"]
    if family == "ats_lever":
        return [f"https://api.lever.co/v0/postings/{ident}?mode=json&limit=100&skip={i*100}"
                for i in range(MAX_PAGES)]
    if family == "ats_smartrecruiters":
        return [f"https://api.smartrecruiters.com/v1/companies/{ident}/postings?limit=100&offset={i*100}"
                for i in range(MAX_PAGES)]
    raise ValueError("Not an approved public ATS family")


def parse_jobs(board, payload):
    family = board["family"]
    if family == "ats_greenhouse":
        entries = payload.get("jobs") if isinstance(payload, dict) else None
    elif family == "ats_ashby":
        entries = payload.get("jobs") if isinstance(payload, dict) else None
    elif family == "ats_workable":
        entries = payload.get("jobs") if isinstance(payload, dict) else None
    elif family == "ats_smartrecruiters":
        entries = payload.get("content") if isinstance(payload, dict) else None
    elif family == "ats_lever":
        entries = payload
    else:
        raise ValueError("Unknown ATS family")
    if not isinstance(entries, list):
        raise ValueError("Unexpected official ATS response format")
    output = []
    for item in entries:
        if not isinstance(item, dict):
            continue
        try:
            if family == "ats_greenhouse":
                title = item.get("title")
                location = (item.get("location") or {}).get("name")
                url = item.get("absolute_url")
                posted = item.get("first_published") or None
            elif family == "ats_ashby":
                if item.get("isListed") is False:
                    continue
                title = item.get("title")
                location = item.get("location")
                url = item.get("jobUrl") or item.get("applyUrl")
                posted = item.get("publishedAt") or None
            elif family == "ats_workable":
                title = item.get("title")
                location = ", ".join(str(v) for v in
                                     (item.get("city"), item.get("state"), item.get("country")) if v)
                url = item.get("url") or item.get("application_url") or item.get("shortlink")
                posted = item.get("published_on")
            elif family == "ats_smartrecruiters":
                title = item.get("name")
                loc = item.get("location") or {}
                location = ", ".join(str(v) for v in (loc.get("city"),loc.get("region")) if v)
                url = item.get("postingUrl") or item.get("applyUrl")
                posted = item.get("releasedDate")
            else:
                title = item.get("text")
                location = (item.get("categories") or {}).get("location")
                url = item.get("hostedUrl") or item.get("applyUrl")
                posted = None  # Lever createdAt is NOT necessarily publication.
            title = clean(title, 165)
            url = public_url(url)
            if not title or len(title) < 6 or not url:
                continue
            if not location:
                location = "Remote" if item.get("isRemote") else ""
            output.append({"title":title,"city":clean(location,115),
                           "url":url,"published_at":parse_date(posted)})
        except (TypeError, KeyError, AttributeError):
            continue
    return output


def public_job(entry,board,existing,current):
    first = existing.get("first_seen_at") if existing else UTC_ISO(current)
    date = entry.get("published_at") or (existing.get("published_at") if existing else None)
    stamp = parse_date(date or first)
    if not stamp or dt.datetime.fromisoformat(stamp.replace("Z","+00:00")) < current - DAY * 20:
        return None
    title = entry["title"]
    url = entry["url"]
    return {
        "id":existing.get("id") if existing else hashlib.sha256(url.encode()).hexdigest()[:20],
        "brand":(existing.get("brand") if existing else None) or board["brand"],
        "title":title,
        "role":role_family(title) or (existing.get("role") if existing else ""),
        "level":seniority(title) if seniority(title)!="unspecified" else
            (existing.get("level") if existing else "unspecified"),
        "city":entry["city"] or (existing.get("city") if existing else ""),
        "country":(existing.get("country") if existing else ""),
        "published_at":date,
        "first_seen_at":first,
        "last_verified_at":UTC_ISO(current),
        "url":url,
        "ats":board["family"],
        "origin":"official_ats"
    }


def refresh():
    file = HERE / "jobs.json"
    configs = json.loads((HERE / "boards.json").read_text(encoding="utf-8"))
    old = json.loads(file.read_text(encoding="utf-8"))
    current = now()
    by_url = {public_url(j.get("url")):j for j in old.get("jobs",[])
              if public_url(j.get("url")) and isinstance(j,dict)}
    checked = successful = discovered = refreshed = 0
    errors = []
    for board in configs["boards"]:
        checked += 1
        all_entries = []
        succeeded = False
        try:
            for num,url in enumerate(pages(board)):
                response = get_json(url)
                entries = parse_jobs(board,response)
                all_entries.extend(entries)
                succeeded = True
                # Don't fetch later pages if a page is not full.
                if board["family"] not in ("ats_lever","ats_smartrecruiters") or len(entries)<100:
                    break
            if not succeeded:
                continue
            successful += 1
            for entry in all_entries:
                prior = by_url.get(entry["url"])
                updated = public_job(entry,board,prior,current)
                if not updated:
                    continue
                if prior:
                    refreshed += 1
                else:
                    discovered += 1
                by_url[entry["url"]] = updated
            print(f"{board['brand']}: {len(all_entries)} official listings checked")
        except (ValueError,TypeError,urllib.error.URLError,TimeoutError,
                json.JSONDecodeError,RuntimeError) as exc:
            errors.append(f"{board['brand']}: {type(exc).__name__}")
            print("SOURCE ERROR: "+errors[-1],file=sys.stderr)
    if not successful:
        raise RuntimeError("No public ATS succeeded; preserve previous snapshot unchanged")
    jobs = []
    for job in by_url.values():
        if not isinstance(job,dict):
            continue
        stamp = parse_date(job.get("published_at") or job.get("first_seen_at"))
        verified = parse_date(job.get("last_verified_at"))
        if not stamp or not verified or not public_url(job.get("url")):
            continue
        if dt.datetime.fromisoformat(stamp.replace("Z","+00:00")) < current-DAY*20:
            continue
        if dt.datetime.fromisoformat(verified.replace("Z","+00:00")) < current-DAY*7:
            continue
        jobs.append(job)
    jobs.sort(key=lambda j:j.get("published_at") or j.get("first_seen_at") or "",reverse=True)
    jobs = jobs[:MAX_JOBS]
    result = {
        "format":1,"generated_at":UTC_ISO(current),"last_ats_scan_at":UTC_ISO(current),
        "source":"public_ats_plus_expiring_snapshot",
        "coverage_note":"Controllo GitHub di un elenco limitato di board ATS ufficiali; non copertura mondiale.",
        "sources_checked":checked,"sources_successful":successful,
        "sources_failed":errors,"jobs":jobs
    }
    out = json.dumps(result,ensure_ascii=False,separators=(",",":"))+"\n"
    temp = file.with_suffix(".json.tmp")
    temp.write_text(out,encoding="utf-8")
    temp.replace(file)
    print(f"Public radar: {len(jobs)} listed | {successful}/{checked} boards | "
          f"{discovered} new | {refreshed} reverified, no Supabase API calls.")


if __name__ == "__main__":
    refresh()
