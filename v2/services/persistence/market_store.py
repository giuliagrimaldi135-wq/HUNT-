"""Persistence helpers for HUNT's global market engine."""
from __future__ import annotations

from datetime import datetime, timezone

from ingestion.source_discovery import DiscoveredSource
from intelligence.source_health import SourceHealthResult, SourceSnapshot

from .supabase_rest import SupabaseWorkerClient


class MarketStore:
    def __init__(self, client: SupabaseWorkerClient):
        self.client = client

    def save_source_candidate(
        self,
        source: DiscoveredSource,
        *,
        company_name_hint: str | None = None,
        discovered_from: str | None = None,
    ):
        now = datetime.now(timezone.utc).isoformat()
        rows = self.client.upsert(
            "source_candidates",
            {
                "company_name_hint": company_name_hint,
                "source_url": source.source_url,
                "source_family": source.family,
                "confidence": source.confidence,
                "reason": source.reason,
                "status": "discovered",
                "discovered_from": discovered_from,
                "last_seen_at": now,
                "metadata": {"config": source.config},
            },
            on_conflict="source_url",
        )
        return rows[0] if rows else None

    def record_scan_run(
        self,
        source_id: str,
        snapshot: SourceSnapshot,
        health: SourceHealthResult,
        *,
        previous_count: int | None = None,
        error_code: str | None = None,
    ):
        rows = self.client.insert(
            "source_scan_runs",
            {
                "source_id": source_id,
                "finished_at": datetime.now(timezone.utc).isoformat(),
                "request_ok": snapshot.request_ok,
                "parser_ok": snapshot.parser_ok,
                "extracted_jobs": snapshot.extracted_jobs,
                "prior_extracted_jobs": previous_count,
                "health_status": health.status,
                "allow_mass_close": health.allow_mass_close,
                "error_code": error_code,
            },
        )
        return rows[0] if rows else None
