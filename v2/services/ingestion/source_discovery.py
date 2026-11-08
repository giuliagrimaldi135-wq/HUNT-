"""Infer reusable ATS adapter configuration from public career URLs."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from urllib.parse import urlsplit

from .source_registry import detect_source_family


LOCALE_RE = re.compile(r"^[a-z]{2}(?:-[A-Z]{2})?$")


@dataclass(frozen=True)
class DiscoveredSource:
    family: str
    source_url: str
    config: dict[str, str] = field(default_factory=dict)
    confidence: int = 0
    reason: str = ""


def _parts(url: str) -> tuple[str, list[str]]:
    parsed = urlsplit(url.strip())
    host = (parsed.hostname or "").lower()
    path = [x for x in parsed.path.split("/") if x]
    return host, path


def discover_source(url: str) -> DiscoveredSource:
    family = detect_source_family(url)
    host, path = _parts(url)

    if family.key == "workday":
        tenant = host.split(".")[0] if host else ""
        clean_path = [p for p in path if not LOCALE_RE.match(p)]
        site = clean_path[0] if clean_path else ""
        if tenant and site:
            return DiscoveredSource(
                family="workday",
                source_url=url,
                config={"host": host, "tenant": tenant, "site": site},
                confidence=98,
                reason="Parsed Workday tenant, host and public career-site name.",
            )

    if family.key == "smartrecruiters":
        company = ""
        if "careers.smartrecruiters.com" in host and path:
            company = path[0]
        elif "jobs.smartrecruiters.com" in host and path:
            company = path[0]
        if company:
            return DiscoveredSource(
                family="smartrecruiters",
                source_url=url,
                config={"company_identifier": company},
                confidence=98,
                reason="Parsed SmartRecruiters public company identifier.",
            )

    if family.key == "greenhouse":
        token = ""
        if path:
            token = path[0]
        if token:
            return DiscoveredSource(
                family="greenhouse",
                source_url=url,
                config={"board_token": token},
                confidence=95,
                reason="Parsed Greenhouse public board token.",
            )

    if family.key == "lever":
        site = path[0] if path else ""
        if site:
            region = "eu" if host.startswith("jobs.eu.") or host.startswith("api.eu.") else "global"
            return DiscoveredSource(
                family="lever",
                source_url=url,
                config={"site": site, "region": region},
                confidence=95,
                reason="Parsed Lever public site identifier.",
            )

    if family.key == "custom_official":
        return DiscoveredSource(
            family="custom_official",
            source_url=url,
            config={"url": url},
            confidence=70,
            reason="Official URL hint requires custom parser or JSON-LD discovery.",
        )

    return DiscoveredSource(
        family=family.key,
        source_url=url,
        config={},
        confidence=30,
        reason="No reusable structured-source configuration could be inferred.",
    )
