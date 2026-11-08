"""Build source adapters from discovered public career-source configuration."""
from __future__ import annotations

from .greenhouse import GreenhouseAdapter
from .lever import LeverAdapter
from .smartrecruiters import SmartRecruitersAdapter
from .source_discovery import DiscoveredSource
from .workday import WorkdayAdapter


def build_adapter(
    source: DiscoveredSource,
    company_name: str,
    *,
    fetch_details: bool = True,
):
    cfg = source.config

    if source.family == "greenhouse":
        return GreenhouseAdapter(
            board_token=cfg["board_token"],
            company_name=company_name,
        )

    if source.family == "lever":
        return LeverAdapter(
            site=cfg["site"],
            company_name=company_name,
            region=cfg.get("region", "global"),
        )

    if source.family == "smartrecruiters":
        return SmartRecruitersAdapter(
            company_identifier=cfg["company_identifier"],
            company_name=company_name,
            fetch_details=fetch_details,
        )

    if source.family == "workday":
        return WorkdayAdapter(
            host=cfg["host"],
            tenant=cfg["tenant"],
            site=cfg["site"],
            company_name=company_name,
            fetch_details=fetch_details,
        )

    raise ValueError(f"No reusable adapter for source family: {source.family}")
