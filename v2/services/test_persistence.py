from unittest.mock import Mock

from ingestion.source_discovery import discover_source
from persistence.market_store import MarketStore
from persistence.supabase_rest import SupabaseWorkerClient


def fake_response(payload):
    response = Mock()
    response.content = b"[]" if payload == [] else b"x"
    response.json.return_value = payload
    response.raise_for_status.return_value = None
    return response


def test_secret_key_goes_in_apikey_header_not_bearer():
    client = SupabaseWorkerClient(
        url="https://example.supabase.co",
        secret_key="sb_secret_test",
    )
    assert client.session.headers["apikey"] == "sb_secret_test"
    assert "Authorization" not in client.session.headers


def test_upsert_uses_merge_duplicates():
    client = SupabaseWorkerClient(
        url="https://example.supabase.co",
        secret_key="sb_secret_test",
    )
    client.session.post = Mock(return_value=fake_response([{"id": "1"}]))

    rows = client.upsert(
        "source_candidates",
        {"source_url": "https://example.com/careers"},
        on_conflict="source_url",
    )

    assert rows == [{"id": "1"}]
    kwargs = client.session.post.call_args.kwargs
    assert kwargs["params"]["on_conflict"] == "source_url"
    assert "resolution=merge-duplicates" in kwargs["headers"]["Prefer"]


def test_market_store_saves_discovered_config():
    client = Mock()
    client.upsert.return_value = [{"id": "candidate-1"}]
    store = MarketStore(client)
    source = discover_source(
        "https://brand.wd5.myworkdayjobs.com/en-US/Careers"
    )

    saved = store.save_source_candidate(
        source,
        company_name_hint="Brand",
        discovered_from="web_discovery",
    )

    assert saved["id"] == "candidate-1"
    payload = client.upsert.call_args.args[1]
    assert payload["source_family"] == "workday"
    assert payload["metadata"]["config"]["tenant"] == "brand"
