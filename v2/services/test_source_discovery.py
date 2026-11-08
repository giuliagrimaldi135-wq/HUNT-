from ingestion.source_discovery import discover_source
from ingestion.smartrecruiters import SmartRecruitersAdapter
from ingestion.workday import WorkdayAdapter


def test_discover_workday_config():
    result = discover_source(
        "https://acme.wd5.myworkdayjobs.com/en-US/External_Careers"
    )
    assert result.family == "workday"
    assert result.config["tenant"] == "acme"
    assert result.config["site"] == "External_Careers"
    assert result.config["host"] == "acme.wd5.myworkdayjobs.com"


def test_discover_smartrecruiters_company():
    result = discover_source(
        "https://careers.smartrecruiters.com/ExampleFashion"
    )
    assert result.family == "smartrecruiters"
    assert result.config["company_identifier"] == "ExampleFashion"


def test_discover_greenhouse_token():
    result = discover_source("https://boards.greenhouse.io/examplebrand")
    assert result.family == "greenhouse"
    assert result.config["board_token"] == "examplebrand"


def test_discover_lever_site():
    result = discover_source("https://jobs.lever.co/examplebrand")
    assert result.family == "lever"
    assert result.config["site"] == "examplebrand"


def test_smartrecruiters_parse_fixture_without_network_detail():
    adapter = SmartRecruitersAdapter(
        "example",
        "Example",
        fetch_details=False,
    )
    job = adapter._parse_job({
        "id": "123",
        "name": "Buying Intern",
        "refNumber": "REF-12",
        "releasedDate": "2026-11-08T10:00:00Z",
        "company": {"name": "Example Fashion"},
        "location": {"city": "Milano", "country": "it"},
        "postingUrl": "https://jobs.smartrecruiters.com/example/123",
    })
    assert job.title == "Buying Intern"
    assert job.requisition_id == "REF-12"
    assert job.location == "Milano, it"


def test_workday_parse_fixture_without_detail():
    adapter = WorkdayAdapter(
        host="example.wd5.myworkdayjobs.com",
        tenant="example",
        site="Careers",
        company_name="Example",
        fetch_details=False,
    )
    job = adapter._parse_job({
        "title": "Retail Merchandising Intern",
        "externalPath": "/job/Milan/Role_R123",
        "locationsText": "Milan, Italy",
        "postedOn": "Posted 2 Days Ago",
        "bulletFields": ["R123"],
    })
    assert job.title == "Retail Merchandising Intern"
    assert job.requisition_id == "R123"
    assert job.location == "Milan, Italy"
