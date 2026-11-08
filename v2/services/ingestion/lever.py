"""Lever public Postings API adapter."""
from __future__ import annotations

from typing import Iterable

import requests

from .base import SourceAdapter
from .models import RawJob


class LeverAdapter(SourceAdapter):
    source_type = "lever"

    def __init__(
        self,
        site: str,
        company_name: str,
        region: str = "global",
        timeout: int = 20,
    ):
        self.site = site.strip().strip("/")
        self.company_name = company_name
        self.region = region
        self.timeout = timeout
        self.source_name = f"Lever / {company_name}"

    @property
    def api_host(self) -> str:
        return "api.eu.lever.co" if self.region == "eu" else "api.lever.co"

    @property
    def endpoint(self) -> str:
        return f"https://{self.api_host}/v0/postings/{self.site}?mode=json"

    def _parse_job(self, job: dict) -> RawJob:
        categories = job.get("categories") or {}
        description = (
            job.get("descriptionPlain")
            or job.get("description")
            or job.get("openingPlain")
            or job.get("opening")
        )

        return RawJob(
            source_name=self.source_name,
            source_type=self.source_type,
            company_name=self.company_name,
            title=(job.get("text") or "").strip(),
            listing_url=job.get("hostedUrl") or "",
            apply_url=job.get("applyUrl") or job.get("hostedUrl") or "",
            external_job_id=str(job.get("id")) if job.get("id") is not None else None,
            requisition_id=None,
            location=categories.get("location"),
            description=description,
            raw=job,
        )

    def discover(self) -> Iterable[RawJob]:
        response = requests.get(
            self.endpoint,
            headers={"Accept": "application/json"},
            timeout=self.timeout,
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, list):
            raise ValueError("Lever postings payload must be a list.")
        return [self._parse_job(job) for job in payload if job.get("text")]

    def healthcheck(self) -> tuple[bool, str]:
        try:
            response = requests.get(
                self.endpoint,
                headers={"Accept": "application/json"},
                timeout=self.timeout,
            )
            if response.status_code != 200:
                return False, f"http_{response.status_code}"
            payload = response.json()
            if not isinstance(payload, list):
                return False, "unexpected_payload"
            return True, f"jobs={len(payload)}"
        except Exception as exc:
            return False, type(exc).__name__
