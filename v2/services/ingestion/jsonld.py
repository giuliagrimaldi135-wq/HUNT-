"""Parse schema.org JobPosting JSON-LD from public official career pages."""
from __future__ import annotations

import html as html_lib
import json
from datetime import datetime
from typing import Any

from bs4 import BeautifulSoup

from .models import RawJob


def _walk_json(value: Any):
    if isinstance(value, dict):
        yield value
        graph = value.get("@graph")
        if isinstance(graph, list):
            for item in graph:
                yield from _walk_json(item)
    elif isinstance(value, list):
        for item in value:
            yield from _walk_json(item)


def _is_job_posting(obj: dict[str, Any]) -> bool:
    typ = obj.get("@type")
    if isinstance(typ, list):
        return "JobPosting" in typ
    return typ == "JobPosting"


def _text(value: Any) -> str | None:
    if value is None:
        return None
    return str(value).strip() or None


def _location(job: dict[str, Any]) -> str | None:
    locations = job.get("jobLocation")
    if not locations:
        return None
    if not isinstance(locations, list):
        locations = [locations]

    chunks = []
    for loc in locations:
        if not isinstance(loc, dict):
            continue
        address = loc.get("address") or {}
        if isinstance(address, str):
            chunks.append(address)
            continue
        if not isinstance(address, dict):
            continue
        parts = [
            address.get("addressLocality"),
            address.get("addressRegion"),
            address.get("addressCountry"),
        ]
        rendered = ", ".join(str(x).strip() for x in parts if x)
        if rendered:
            chunks.append(rendered)
    return " / ".join(chunks) or None


def _identifier(job: dict[str, Any]) -> str | None:
    value = job.get("identifier")
    if isinstance(value, dict):
        return _text(value.get("value") or value.get("name"))
    return _text(value)


def _company(job: dict[str, Any], fallback: str | None) -> str:
    org = job.get("hiringOrganization")
    if isinstance(org, dict):
        name = _text(org.get("name"))
        if name:
            return name
    return fallback or "Unknown company"


def _parse_date(value: Any) -> datetime | None:
    text = _text(value)
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None


def _clean_description(value: Any) -> str | None:
    text = _text(value)
    if not text:
        return None
    soup = BeautifulSoup(html_lib.unescape(text), "html.parser")
    return " ".join(soup.get_text(" ", strip=True).split())


def parse_jsonld_job_postings(
    html: str,
    page_url: str,
    source_name: str,
    company_fallback: str | None = None,
) -> list[RawJob]:
    soup = BeautifulSoup(html, "html.parser")
    jobs: list[RawJob] = []

    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        raw = script.string or script.get_text()
        if not raw or not raw.strip():
            continue
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            continue

        for obj in _walk_json(payload):
            if not _is_job_posting(obj):
                continue

            title = _text(obj.get("title"))
            if not title:
                continue

            listing_url = _text(obj.get("url")) or page_url
            req_id = _identifier(obj)

            jobs.append(
                RawJob(
                    source_name=source_name,
                    source_type="official_jsonld",
                    company_name=_company(obj, company_fallback),
                    title=title,
                    listing_url=listing_url,
                    apply_url=listing_url,
                    external_job_id=req_id,
                    requisition_id=req_id,
                    location=_location(obj),
                    description=_clean_description(obj.get("description")),
                    published_at=_parse_date(obj.get("datePosted")),
                    raw=obj,
                )
            )

    return jobs
