"""SmartRecruiters public Posting API adapter."""
from __future__ import annotations

from datetime import datetime
from typing import Iterable

import requests
from bs4 import BeautifulSoup

from .base import SourceAdapter
from .models import RawJob


class SmartRecruitersAdapter(SourceAdapter):
    source_type = "smartrecruiters"

    def __init__(
        self,
        company_identifier: str,
        company_name: str,
        timeout: int = 20,
        fetch_details: bool = True,
    ):
        self.company_identifier = company_identifier.strip().strip("/")
        self.company_name = company_name
        self.timeout = timeout
        self.fetch_details = fetch_details
        self.source_name = f"SmartRecruiters / {company_name}"

    @property
    def endpoint(self) -> str:
        return (
            "https://api.smartrecruiters.com/v1/companies/"
            f"{self.company_identifier}/postings"
        )

    def _parse_date(self, value):
        if not value:
            return None
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            return None

    @staticmethod
    def _location(value) -> str | None:
        if not isinstance(value, dict):
            return None
        parts = [
            value.get("city"),
            value.get("region"),
            value.get("country"),
        ]
        rendered = ", ".join(str(x).strip() for x in parts if x)
        return rendered or None

    @staticmethod
    def _description(detail: dict) -> str | None:
        sections = ((detail.get("jobAd") or {}).get("sections") or {})
        chunks = []
        for key in (
            "companyDescription",
            "jobDescription",
            "qualifications",
            "additionalInformation",
        ):
            section = sections.get(key) or {}
            text = section.get("text")
            if text:
                chunks.append(BeautifulSoup(text, "html.parser").get_text(" ", strip=True))
        return " ".join(chunks) or None

    def _get_detail(self, posting_id: str) -> dict:
        response = requests.get(
            f"{self.endpoint}/{posting_id}",
            headers={"Accept": "application/json; charset=utf-8"},
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.json()

    def _parse_job(self, job: dict) -> RawJob:
        posting_id = str(job.get("id") or job.get("uuid") or "")
        detail = self._get_detail(posting_id) if self.fetch_details and posting_id else job

        company = detail.get("company") or job.get("company") or {}
        title = detail.get("name") or job.get("name") or ""
        posting_url = detail.get("postingUrl") or job.get("postingUrl")
        if not posting_url and posting_id:
            posting_url = (
                f"https://jobs.smartrecruiters.com/{self.company_identifier}/{posting_id}"
            )

        return RawJob(
            source_name=self.source_name,
            source_type=self.source_type,
            company_name=company.get("name") or self.company_name,
            title=title.strip(),
            listing_url=posting_url or self.endpoint,
            apply_url=detail.get("applyUrl") or posting_url,
            external_job_id=posting_id or None,
            requisition_id=detail.get("refNumber") or job.get("refNumber"),
            location=self._location(detail.get("location") or job.get("location")),
            description=self._description(detail) if self.fetch_details else None,
            published_at=self._parse_date(
                detail.get("releasedDate") or job.get("releasedDate")
            ),
            raw=detail,
        )

    def discover(self) -> Iterable[RawJob]:
        offset = 0
        limit = 100
        output: list[RawJob] = []

        while True:
            response = requests.get(
                self.endpoint,
                params={
                    "limit": limit,
                    "offset": offset,
                    "destination": "PUBLIC",
                },
                headers={"Accept": "application/json; charset=utf-8"},
                timeout=self.timeout,
            )
            response.raise_for_status()
            payload = response.json()
            content = payload.get("content") or []
            output.extend(
                self._parse_job(job)
                for job in content
                if job.get("name")
            )

            total = int(payload.get("totalFound") or 0)
            offset += len(content)
            if not content or offset >= total:
                break

        return output

    def healthcheck(self) -> tuple[bool, str]:
        try:
            response = requests.get(
                self.endpoint,
                params={"limit": 1, "offset": 0, "destination": "PUBLIC"},
                timeout=self.timeout,
            )
            if response.status_code != 200:
                return False, f"http_{response.status_code}"
            payload = response.json()
            if "content" not in payload:
                return False, "unexpected_payload"
            return True, f"jobs={payload.get('totalFound', len(payload['content']))}"
        except Exception as exc:
            return False, type(exc).__name__
