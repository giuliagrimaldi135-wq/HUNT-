"""Tests for the official public career feed reader (RSS 2.0 / Atom)."""
import io
import json
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

import refresh

RL = {"family": "feed_public", "brand": "Ralph Lauren",
      "feed_url": "https://careers.ralphlauren.com/en_US/CareersCorporate/SearchJobsCorporate/intern/feed",
      "link_hosts": ["careers.ralphlauren.com"]}

RSS = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Jobs</title>
<item><title>Merchandising Intern &amp; Buying</title>
  <link>https://careers.ralphlauren.com/en_US/CareersCorporate/JobDetail/Merch-Intern/111?utm_source=rss</link>
  <pubDate>Mon, 23 Nov 2026 10:00:00 GMT</pubDate>
  <location>Milan, Italy</location></item>
<item><title>Wholesale Internship</title>
  <guid isPermaLink="true">https://careers.ralphlauren.com/en_US/CareersCorporate/JobDetail/Wholesale/222</guid></item>
<item><title>Phishing copy</title><link>https://evil.example.com/job/1</link></item>
<item><title>Insecure link job</title><link>http://careers.ralphlauren.com/job/3</link></item>
<item><title>Merchandising Intern &amp; Buying</title>
  <link>https://careers.ralphlauren.com/en_US/CareersCorporate/JobDetail/Merch-Intern/111</link></item>
</channel></rss>"""

ATOM = b"""<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>Jobs</title>
<entry><title>Retail Design Intern</title>
  <link rel="alternate" href="https://careers.ralphlauren.com/job/444"/>
  <updated>2026-11-24T08:00:00Z</updated></entry>
<entry><title>PR &amp; Events Intern</title>
  <link href="https://careers.ralphlauren.com/job/555"/>
  <published>2026-11-20T09:00:00Z</published></entry>
</feed>"""


class FakeResponse(io.BytesIO):
    def __init__(self, body, status=200, headers=None):
        super().__init__(body)
        self.status = status
        self.headers = headers or {}

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class PublicFeedReader(unittest.TestCase):
    def test_rss_items_are_parsed_and_filtered(self):
        rows = refresh.parse_feed(RL, RSS)
        self.assertEqual([r["title"] for r in rows],
                         ["Merchandising Intern & Buying", "Wholesale Internship"])
        self.assertEqual(rows[0]["url"],
                         "https://careers.ralphlauren.com/en_US/CareersCorporate/JobDetail/Merch-Intern/111")
        self.assertEqual(rows[0]["published_at"], "2026-11-23T10:00:00Z")
        self.assertEqual(rows[0]["city"], "Milan, Italy")
        # No pubDate -> date stays unknown, never invented.
        self.assertIsNone(rows[1]["published_at"])

    def test_atom_updated_is_not_a_publication_date(self):
        rows = refresh.parse_feed(RL, ATOM)
        self.assertEqual(len(rows), 2)
        self.assertIsNone(rows[0]["published_at"])
        self.assertEqual(rows[1]["published_at"], "2026-11-20T09:00:00Z")

    def test_feed_job_is_labelled_as_official_feed(self):
        row = refresh.parse_feed(RL, RSS)[0]
        item = refresh.public_job(row, RL, None, refresh.now())
        self.assertEqual(item["origin"], "official_feed")
        self.assertEqual(item["ats"], "feed_public")
        self.assertEqual(item["level"], "internship")
        for forbidden in ("user_id", "email", "cv", "match_score"):
            self.assertNotIn(forbidden, item)

    def test_dtd_and_entities_are_refused(self):
        bomb = b'<?xml version="1.0"?><!DOCTYPE r [<!ENTITY a "aaaa">]><rss><channel/></rss>'
        with self.assertRaises(ValueError):
            refresh.parse_feed(RL, bomb)

    def test_non_feed_documents_are_refused(self):
        with self.assertRaises(ValueError):
            refresh.parse_feed(RL, b"<html><body>Just a moment...</body></html>")
        with self.assertRaises(ValueError):
            refresh.parse_feed(RL, b"not xml at all")

    def test_feed_url_must_be_https_on_declared_host(self):
        self.assertEqual(refresh.pages(RL), [RL["feed_url"]])
        for bad in ("http://careers.ralphlauren.com/feed", "https://other.example.com/feed"):
            with self.assertRaises(ValueError):
                refresh.pages(dict(RL, feed_url=bad))

    def test_rfc822_and_bad_dates(self):
        self.assertEqual(refresh.rss_date("Mon, 23 Nov 2026 11:00:00 +0100"), "2026-11-23T10:00:00Z")
        self.assertIsNone(refresh.rss_date("yesterday"))
        self.assertIsNone(refresh.rss_date("Mon, 23 Nov 2099 10:00:00 GMT"))  # future
        self.assertIsNone(refresh.rss_date(""))


class AntiBotChallengeIsNeverBypassed(unittest.TestCase):
    def test_aws_waf_202_is_reported_not_retried(self):
        resp = FakeResponse(b"", 202, {"x-amzn-waf-action": "challenge"})
        with mock.patch("urllib.request.urlopen", return_value=resp) as op:
            with self.assertRaises(refresh.AntiBotChallenge):
                refresh.fetch(RL["feed_url"], refresh.FEED_ACCEPT)
        self.assertEqual(op.call_count, 1)

    def test_cloudflare_403_challenge(self):
        err = urllib.error.HTTPError("https://www.capriholdings.com/careers/", 403, "Forbidden",
                                     {"cf-mitigated": "challenge"}, None)
        with mock.patch("urllib.request.urlopen", side_effect=err):
            with self.assertRaises(refresh.AntiBotChallenge):
                refresh.fetch("https://www.capriholdings.com/careers/", "text/html")

    def test_plain_404_is_a_normal_error(self):
        err = urllib.error.HTTPError("https://x.example.com", 404, "Not Found", {}, None)
        with mock.patch("urllib.request.urlopen", side_effect=err):
            with self.assertRaises(urllib.error.HTTPError):
                refresh.fetch("https://x.example.com/feed", refresh.FEED_ACCEPT)


class BoardsConfig(unittest.TestCase):
    def test_configured_feeds_are_valid_and_disabled_ones_documented(self):
        cfg = json.loads((Path(refresh.__file__).parent / "boards.json").read_text(encoding="utf-8"))
        feeds = [b for b in cfg["boards"] if b["family"] == refresh.FEED_FAMILY]
        self.assertTrue(feeds)
        for board in feeds:
            refresh.pages(board)  # raises if URL/host invalid
            if board.get("enabled") is False:
                self.assertTrue(board.get("disabled_reason"))

    def test_disabled_board_is_never_fetched(self):
        cfg = {"boards": [dict(RL, enabled=False, disabled_reason="test"),
                          {"family": "ats_lever", "board": "mulberry", "brand": "Mulberry"}]}
        lever = [{"text": "Merchandising Internship", "hostedUrl": "https://jobs.lever.co/mulberry/1",
                  "categories": {"location": "London"}}]
        calls = []

        def fake_get_json(url):
            calls.append(url)
            return lever

        tmp = Path(self.id().replace(".", "_"))
        written = {}
        with mock.patch.object(refresh, "get_json", side_effect=fake_get_json), \
             mock.patch.object(refresh, "fetch", side_effect=AssertionError("disabled feed fetched")), \
             mock.patch.object(refresh, "HERE", tmp), \
             mock.patch.object(Path, "read_text", lambda self, **k: json.dumps(
                 cfg if self.name == "boards.json" else {"jobs": []})), \
             mock.patch.object(Path, "write_text", lambda self, t, **k: written.__setitem__("out", t)), \
             mock.patch.object(Path, "replace", lambda self, target: None):
            refresh.refresh()
        out = json.loads(written["out"])
        self.assertEqual(out["sources_checked"], 1)
        self.assertEqual(len(out["jobs"]), 1)
        self.assertTrue(all("lever" in c for c in calls))


if __name__ == "__main__":
    unittest.main()
