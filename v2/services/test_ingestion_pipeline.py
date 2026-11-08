from ingestion.adapter_factory import build_adapter
from ingestion.models import RawJob
from ingestion.pipeline import canonicalize_and_group
from ingestion.source_discovery import discover_source
from ingestion.workday import WorkdayAdapter
from ingestion.smartrecruiters import SmartRecruitersAdapter


def test_factory_builds_workday():
    source = discover_source(
        "https://brand.wd5.myworkdayjobs.com/en-US/Careers"
    )
    adapter = build_adapter(source, "Brand", fetch_details=False)
    assert isinstance(adapter, WorkdayAdapter)


def test_factory_builds_smartrecruiters():
    source = discover_source(
        "https://careers.smartrecruiters.com/Brand"
    )
    adapter = build_adapter(source, "Brand", fetch_details=False)
    assert isinstance(adapter, SmartRecruitersAdapter)


def test_pipeline_groups_same_requisition():
    rows = [
        RawJob(
            source_name="Official",
            source_type="official",
            company_name="Brand",
            title="Retail Merchandising Intern",
            listing_url="https://brand.com/jobs/1",
            requisition_id="R1",
            location="Milano",
        ),
        RawJob(
            source_name="Board",
            source_type="job_board",
            company_name="Brand",
            title="Retail Merchandising Intern",
            listing_url="https://board.com/jobs/99",
            requisition_id="R1",
            location="Milan",
        ),
    ]
    result = canonicalize_and_group(rows)
    assert len(result.canonical_jobs) == 2
    assert result.duplicate_groups == [[0, 1]]


def test_pipeline_keeps_different_requisitions_separate():
    rows = [
        RawJob(
            source_name="Official",
            source_type="official",
            company_name="Brand",
            title="Buying Intern",
            listing_url="https://brand.com/jobs/1",
            requisition_id="R1",
            location="Milano",
        ),
        RawJob(
            source_name="Official",
            source_type="official",
            company_name="Brand",
            title="Buying Intern",
            listing_url="https://brand.com/jobs/2",
            requisition_id="R2",
            location="Milano",
        ),
    ]
    result = canonicalize_and_group(rows)
    assert result.duplicate_groups == [[0], [1]]
