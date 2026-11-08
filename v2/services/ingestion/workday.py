"""Workday public career-site JSON adapter.

Workday does not document this as a public jobs API. This adapter only reads
the JSON backend used by a configured public career site. Source owners must
be verified and robots/terms constraints should be checked before enabling
recurring monitoring.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import re
from typing import Iterable

import requests
from bs4 import BeautifulSoup

from .base import SourceAdapter
from .models import RawJob


POSTED_RE = re.compile(r"Posted\s+(\d+)\s+(Day|Days|Hour|Hours)\s+Ago", re.I)


class WorkdayAdapter(SourceAdapter):
    source_type = "workday"

    def __init__(
        self,
        host: str,
        tenant: str,
        site: str,
        company_name: str,
        timeout: int = 20,
        fetch_details: bool = True,
        max_jobs: int = 1000,
    ):
        self.host = host.strip().strip("/")
        self.tenant = tenant.strip().strip("/")
        self.site = site.strip().strip("/")
        self.company_name = company_name
        self.timeout = timeout
        self.fetch_details = fetch_details
        self.max_jobs = max_jobs
        self.source_name = f"Workday / {company_name}"

    @property
    def endpoint(self) -> str:
        return f"https://{self.host}/wday/cxs/{self.tenant}/{self.site}/jobs"

    def _posted_at(self, label: str | None):
        if not label:
            return None
        if label.lower() in {"posted today", "today"}:
            return datetime.now(timezone.utc)
        match = POSTED_RE.search(label)
        if not match:
            return None
        amount = int(match.group(1))
        unit = match.group(2).lower()
        delta = timedelta(hours=amount) if unit.startswith("hour") else timedelta(days=amount)
        return datetime.now(timezone.utc) - delta

    def _detail(self, external_path: str) -> dict:
        url = (
            f"https://{self.host}/wday/cxs/{self.tenant}/{self.site}"
            f"{external_path}"
        )
        response = requests.get(
            url,
            headers={"Accept": "application/json"},
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.json()

    @staticmethod
    def _detail_description(detail: dict) -> str | None:
        info = detail.get("jobPostingInfo") or detail
        raw = info.get("jobDescription")
        if not raw:
            return None
        return BeautifulSoup(raw, "html.parser").get_text(" ", strip=True)

    def _parse_job(self, item: dict) -> RawJob:
        external_path = item.get("externalPath") or ""
        detail = self._detail(external_path) if self.fetch_details and external_path else {}
        info = detail.get("jobPostingInfo") or detail

        title = info.get("title") or item.get("title") or ""
        location = (
            info.get("location")
            or info.get("locationsText")
            or item.get("locationsText")
        )
        req_id = info.get("jobReqId")
        external_url = info.get("externalUrl")

        listing_url = external_url
        if not listing_url and external_path:
            listing_url = f"https://{self.host}/{self.site}{external_path}"

        bullet_fields = item.get("bulletFields") or []
        if not req_id and bullet_fields:
            req_id = str(bullet_fields[0])

        return RawJob(
            source_name=self.source_name,
            source_type=self.source_type,
            company_name=self.company_name,
            title=title.strip(),
            listing_url=listing_url or self.endpoint,
            apply_url=external_url or listing_url,
            external_job_id=external_path or None,
            requisition_id=req_id,
            location=location,
            description=self._detail_description(detail) if detail else None,
            published_at=self._posted_at(item.get("postedOn")),
            raw={"list": item, "detail": detail} if detail else item,
        )

    def discover(self) -> Iterable[RawJob]:
        offset = 0
        limit = 20
        output: list[RawJob] = []

        while offset < self.max_jobs:
            response = requests.post(
                self.endpoint,
                json={
                    "appliedFacets": {},
                    "limit": limit,
                    "offset": offset,
                    "searchText": "",
                },
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                timeout=self.timeout,
            )
            response.raise_for_status()
            payload = response.json()
            postings = payload.get("jobPostings") or []

            output.extend(
                self._parse_job(item)
                for item in postings
                if item.get("title")
            )

            total = int(payload.get("total") or 0)
            offset += len(postings)
            if not postings or offset >= total:
                break

        return output

    def healthcheck(self) -> tuple[bool, str]:
        try:
            response = requests.post(
                self.endpoint,
                json={
                    "appliedFacets": {},
                    "limit": 20,
                    "offset": 0,
                    "searchText": "",
                },
                headers={"Content-Type": "application/json"},
                timeout=self.timeout,
            )
            if response.status_code != 200:
                return False, f"http_{response.status_code}"
            payload = response.json()
            if "jobPostings" not in payload:
                return False, "unexpected_payload"
            return True, f"jobs={payload.get('total', len(payload['jobPostings']))}"
        except Exception as exc:
            return False, type(exc).__name__
