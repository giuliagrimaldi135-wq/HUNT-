from ingestion.source_registry import detect_source_family


def test_workday_detection():
    assert detect_source_family("https://company.wd3.myworkdayjobs.com/jobs").key == "workday"


def test_successfactors_detection():
    assert detect_source_family("https://career5.successfactors.eu/career").key == "successfactors"


def test_greenhouse_detection():
    assert detect_source_family("https://boards.greenhouse.io/example").key == "greenhouse"


def test_job_board_detection():
    assert detect_source_family("https://www.linkedin.com/jobs/view/123").key == "job_board"


def test_custom_official_hint():
    result = detect_source_family("https://brand.com/careers", official_hint=True)
    assert result.key == "custom_official"
    assert result.default_trust >= 90
