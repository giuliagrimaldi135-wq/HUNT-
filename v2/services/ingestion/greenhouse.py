"""Greenhouse public Job Board adapter."""
from __future__ import annotations

from datetime import datetime
from typing import Iterable

import requests

from .base import SourceAdapter
from .models import RawJob


class GreenhouseAdapter(SourceAdapter):
    source_type = "greenhouse"

    def __init__(self, board_token: str, company_name: str, timeout: int = 20):
        self.board_token = board_token.strip().strip("/")
        self.company_name = company_name
        self.timeout = timeout
        self.source_name = f"Greenhouse / {company_name}"

    @property
    def endpoint(self) -> str:
        return f"https://boards-api.greenhouse.io/v1/boards/{self.board_token}/jobs?content=true"

    def _parse_date(self, value):
        if not value:
            return None
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            return None

    def _parse_job(self, job: dict) -> RawJob:
        location = None
        if isinstance(job.get("location"), dict):
            location = job["location"].get("name")

        return RawJob(
            source_name=self.source_name,
            source_type=self.source_type,
            company_name=self.company_name,
            title=(job.get("title") or "").strip(),
            listing_url=job.get("absolute_url") or "",
            apply_url=job.get("absolute_url") or "",
            external_job_id=str(job.get("id")) if job.get("id") is not None else None,
            requisition_id=(
                str(job.get("internal_job_id"))
                if job.get("internal_job_id") is not None
                else None
            ),
            location=location,
            description=job.get("content"),
            published_at=self._parse_date(job.get("updated_at")),
            raw=job,
        )

    def discover(self) -> Iterable[RawJob]:
        response = requests.get(self.endpoint, timeout=self.timeout)
        response.raise_for_status()
        payload = response.json()
        jobs = payload.get("jobs", [])
        return [self._parse_job(job) for job in jobs if job.get("title")]

    def healthcheck(self) -> tuple[bool, str]:
        try:
            response = requests.get(self.endpoint, timeout=self.timeout)
            if response.status_code != 200:
                return False, f"http_{response.status_code}"
            payload = response.json()
            if "jobs" not in payload:
                return False, "missing_jobs_key"
            return True, f"jobs={len(payload.get('jobs', []))}"
        except Exception as exc:
            return False, type(exc).__name__
