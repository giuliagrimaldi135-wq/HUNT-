"""Minimal server-only Supabase Data API client for HUNT workers.

Uses the 2026 publishable/secret-key model. The secret key is read only from
environment variables and is never logged or returned.
"""
from __future__ import annotations

import os
from typing import Any

import requests


class SupabaseWorkerClient:
    def __init__(
        self,
        url: str | None = None,
        secret_key: str | None = None,
        timeout: int = 30,
    ):
        self.url = (url or os.getenv("SUPABASE_URL") or "").rstrip("/")
        self.secret_key = secret_key or os.getenv("SUPABASE_SECRET_KEY") or ""
        self.timeout = timeout

        if not self.url or not self.secret_key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SECRET_KEY are required for persistence."
            )

        self.session = requests.Session()
        self.session.headers.update({
            "apikey": self.secret_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        })

    def _table_url(self, table: str) -> str:
        if not table.replace("_", "").isalnum():
            raise ValueError("Invalid table name.")
        return f"{self.url}/rest/v1/{table}"

    def insert(self, table: str, rows: dict | list[dict]) -> list[dict]:
        response = self.session.post(
            self._table_url(table),
            json=rows,
            headers={"Prefer": "return=representation"},
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.json() if response.content else []

    def upsert(
        self,
        table: str,
        rows: dict | list[dict],
        *,
        on_conflict: str | None = None,
    ) -> list[dict]:
        params: dict[str, str] = {}
        if on_conflict:
            params["on_conflict"] = on_conflict

        response = self.session.post(
            self._table_url(table),
            params=params,
            json=rows,
            headers={
                "Prefer": "resolution=merge-duplicates,return=representation"
            },
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.json() if response.content else []

    def patch(
        self,
        table: str,
        filters: dict[str, str],
        values: dict[str, Any],
    ) -> list[dict]:
        params = {key: f"eq.{value}" for key, value in filters.items()}
        response = self.session.patch(
            self._table_url(table),
            params=params,
            json=values,
            headers={"Prefer": "return=representation"},
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.json() if response.content else []
