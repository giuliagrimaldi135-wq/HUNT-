"""Tests for the official sitemap + JSON-LD JobPosting reader (e.g. PVH)."""
import datetime as dt
import io
import json
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

import refresh

REAL_FETCH = refresh.fetch  # setUp replaces refresh.fetch with a fake

NOW = dt.datetime(2026, 11, 24, 18, 0, tzinfo=dt.timezone.utc)
PVH = {"family": "sitemap_jsonld", "brand": "PVH",
       "sitemap_urls": ["https://careers.pvh.com/us/en/sitemap_index.xml"],
       "link_hosts": ["careers.pvh.com"],
       "job_url_regex": r"^https://careers\.pvh\.com/us/en/job/[A-Za-z0-9]+/",
       "brands_from_hiring_org": ["Calvin Klein", "Tommy Hilfiger"],
       "max_pages_per_run": 10}
BASE = "https://careers.pvh.com/us/en/job/"

INDEX = b"""<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<sitemap><loc>https://careers.pvh.com/us/en/sitemap1.xml</loc></sitemap>
<sitemap><loc>https://evil.example.com/sitemap.xml</loc></sitemap>
</sitemapindex>"""

URLSET = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://careers.pvh.com/us/en</loc></url>
<url><loc>https://careers.pvh.com/us/en/job/R1/Merchandising-Intern</loc><lastmod>2026-11-24</lastmod></url>
<url><loc>https://careers.pvh.com/us/en/job/R2/Sales-Associate-Part-Time</loc></url>
<url><loc>https://careers.pvh.com/us/en/job/R3/Prodavač-Zagreb</loc></url>
<url><loc>https://careers.pvh.com/us/en/job/R4/Closed-Buyer</loc></url>
<url><loc>https://careers.pvh.com/us/en/job/R5/Old-Planner</loc></url>
<url><loc>https://other.example.com/us/en/job/R9/Fake</loc></url>
</urlset>""".encode("utf-8")


def page(title, date, city="Milano", region="Lombardia", country="Italy", org="Calvin Klein", extra=None):
    posting = {"@context": "http://schema.org", "@type": "JobPosting", "title": title,
               "datePosted": date, "hiringOrganization": {"@type": "Organization", "name": org},
               "jobLocation": {"@type": "Place", "address": {"@type": "PostalAddress",
                               "addressLocality": city, "addressRegion": region,
                               "addressCountry": country}}}
    posting.update(extra or {})
    other = {"@context": "https://schema.org", "@type": "WebPage", "datePublished": "2026-01-01"}
    return ("<html><head><script type=\"application/ld+json\">" + json.dumps(other) +
            "</script><script type=\"application/ld+json\">" + json.dumps(posting) +
            "</script></head><body>job</body></html>").encode()


PAGES = {
    "https://careers.pvh.com/us/en/sitemap_index.xml": INDEX,
    "https://careers.pvh.com/us/en/sitemap1.xml": URLSET,
    BASE + "R1/Merchandising-Intern": page("Merchandising Intern &amp; Buying", "2026-11-23"),
    BASE + "R2/Sales-Associate-Part-Time": page("Sales Associate - Part-Time", "2026-11-22",
                                                 "Edinburgh", "Indiana", "United States of America",
                                                 "Tommy Hilfiger"),
    BASE + "R3/Prodava%C4%8D-Zagreb": page("Prodavač/-ica Tommy Hilfiger Zagreb", "2026-11-21",
                                           "Zagreb", "", "Croatia", "Tommy Hilfiger"),
    BASE + "R5/Old-Planner": page("Planner, Calvin Klein", "2026-09-01"),
}


def fake_fetch(url, accept, max_bytes=None):
    if url == BASE + "R4/Closed-Buyer":
        raise urllib.error.HTTPError(url, 410, "Gone", {}, None)
    if url not in PAGES:
        raise AssertionError("unexpected fetch " + url)
    return PAGES[url]


class SitemapJsonLd(unittest.TestCase):
    def setUp(self):
        patches = [mock.patch.object(refresh, "fetch", side_effect=fake_fetch),
                   mock.patch.object(refresh, "now", return_value=NOW),
                   mock.patch.object(refresh.time, "sleep")]
        for patcher in patches:
            patcher.start()
            self.addCleanup(patcher.stop)

    def test_sitemap_lists_only_official_job_urls_and_encodes_accents(self):
        urls = refresh.sitemap_job_urls(PVH)
        self.assertEqual(len(urls), 5)
        self.assertIn(BASE + "R3/Prodava%C4%8D-Zagreb", urls)
        self.assertFalse(any("example.com" in u for u in urls))

    def test_scan_extracts_postings_and_classifies_pages(self):
        state = {}
        entries, gone, opened = refresh.scan_sitemap_board(PVH, state, NOW)
        self.assertEqual(opened, 5)
        by = {e["url"]: e for e in entries}
        intern = by[BASE + "R1/Merchandising-Intern"]
        self.assertEqual(intern["title"], "Merchandising Intern & Buying")
        self.assertEqual(intern["published_at"], "2026-11-23T00:00:00Z")
        self.assertEqual((intern["city"], intern["country"], intern["brand"]),
                         ("Milano, Lombardia", "IT", "Calvin Klein"))
        us = by[BASE + "R2/Sales-Associate-Part-Time"]
        self.assertEqual((us["city"], us["country"], us["brand"]),
                         ("Edinburgh, Indiana", "US", "Tommy Hilfiger"))
        self.assertEqual(by[BASE + "R3/Prodava%C4%8D-Zagreb"]["country"], "HR")
        self.assertEqual(gone, [BASE + "R4/Closed-Buyer"])
        self.assertEqual(state[BASE + "R4/Closed-Buyer"]["status"], "gone")
        self.assertEqual(state[BASE + "R5/Old-Planner"]["status"], "too_old")
        self.assertNotIn(BASE + "R5/Old-Planner", by)

    def test_second_run_does_not_reopen_recent_pages(self):
        state = {}
        refresh.scan_sitemap_board(PVH, state, NOW)
        _, _, opened = refresh.scan_sitemap_board(PVH, state, NOW + dt.timedelta(hours=6))
        self.assertEqual(opened, 0)
        # After 2 days valid pages are re-verified; after 7 days old ones are rechecked.
        later = refresh.pick_pages(list(state), state, NOW + dt.timedelta(days=3), 50)
        self.assertEqual(len(later), 3)
        later = refresh.pick_pages(list(state), state, NOW + dt.timedelta(days=8), 50)
        self.assertEqual(len(later), 4)
        later = refresh.pick_pages(list(state), state, NOW + dt.timedelta(days=31), 50)
        self.assertEqual(len(later), 5)

    def test_page_budget_and_priority(self):
        urls = [BASE + "R2/Sales-Associate-Part-Time", BASE + "R7/Store-Cashier",
                BASE + "R1/Merchandising-Intern", BASE + "R8/Buyer-Calvin-Klein"]
        self.assertEqual(refresh.pick_pages(urls, {}, NOW, 2),
                         [BASE + "R1/Merchandising-Intern", BASE + "R8/Buyer-Calvin-Klein"])
        self.assertEqual(refresh.pick_pages(urls, {}, NOW, 0), [])

    def test_urls_dropped_from_sitemap_are_forgotten(self):
        state = {BASE + "R0/Removed": {"status": "ok", "checked_at": "2026-11-23T00:00:00Z"}}
        refresh.scan_sitemap_board(PVH, state, NOW)
        self.assertNotIn(BASE + "R0/Removed", state)

    def test_expired_valid_through_and_missing_posting(self):
        expired = page("Buyer Calvin Klein", "2026-11-20", extra={"validThrough": "2026-11-01"})
        self.assertIsNone(refresh.posting_entry(
            PVH, BASE + "X", refresh.job_posting_from_html(expired)))
        self.assertIsNone(refresh.job_posting_from_html(b"<html>no data</html>"))
        self.assertIsNone(refresh.job_posting_from_html(
            b'<script type="application/ld+json">{broken</script>'))

    def test_brand_from_workday_url_when_employer_is_the_group(self):
        board = {"brand": "Tapestry", "brands_from_hiring_org": ["Coach", "Kate Spade", "Stuart Weitzman"]}
        url = ("https://tapestry.wd108.myworkdayjobs.com/Tapestry_Careers/job/"
               "Charlotte-North-Carolina-USA-Southpark---Coach/Temporary-Sales-Support-Associate_JR15825")
        html = page("Temporary Sales Support Associate", "2026-11-23", "Southpark", "",
                    "United States of America", "Tapestry, Inc.")
        entry = refresh.posting_entry(board, url, refresh.job_posting_from_html(html))
        self.assertEqual((entry["brand"], entry["country"]), ("Coach", "US"))
        other = refresh.posting_entry(board, url.replace("---Coach", "---Corporate"),
                                      refresh.job_posting_from_html(html))
        self.assertEqual(other["brand"], "Tapestry")  # never guessed
        # A word inside another word is not a brand match ("Coaching").
        coaching = refresh.posting_entry(board, url.replace("---Coach", "---Coaching-Center"),
                                         refresh.job_posting_from_html(html))
        self.assertEqual(coaching["brand"], "Tapestry")

    def test_successfactors_microdata_posting(self):
        html = ("<html><div class=\"jobDisplayShell\" itemscope=\"itemscope\" "
                "itemtype=\"http://schema.org/JobPosting\">"
                "<span itemprop=\"jobLocation\" itemscope itemtype=\"http://schema.org/Place\">"
                "<span itemprop=\"address\" itemscope itemtype=\"http://schema.org/PostalAddress\">"
                "<meta itemprop=\"streetAddress\" content=\"Milano, IT\">"
                "<meta itemprop=\"datePosted\" content=\"Mon Nov 16 02:00:00 UTC 2026\">"
                "<meta itemprop=\"validThrough\" content=\"Sun Dec 20 00:00:00 UTC 2026\">"
                "<meta itemprop=\"hiringOrganization\" content=\"Prada Group\">"
                "<span lang=\"en-US\" itemprop=\"title\" class=\"x\">MIU MIU VIP Intern &amp; Events\n</span>"
                "</div></html>")
        board = {"brand": "Prada Group", "brands_from_hiring_org": ["Miu Miu", "Versace", "Prada"]}
        url = "https://jobs.pradagroup.com/job/Milano-MIU-MIU-VIP-Intern/1375244933"
        posting = refresh.job_posting_from_html(html)
        entry = refresh.posting_entry(board, url, posting)
        self.assertEqual(entry["title"], "MIU MIU VIP Intern & Events")
        self.assertEqual((entry["city"], entry["country"], entry["brand"]), ("Milano", "IT", "Miu Miu"))
        self.assertEqual(entry["published_at"], "2026-11-16T02:00:00Z")
        # The group name alone never decides the brand.
        neutral = html.replace("MIU MIU VIP Intern", "Finance Controller")
        entry = refresh.posting_entry(board, "https://jobs.pradagroup.com/job/Milano-Finance/1",
                                      refresh.job_posting_from_html(neutral))
        self.assertEqual(entry["brand"], "Prada Group")
        # Expired validThrough is discarded; unknown date format stays unknown.
        expired = html.replace("Sun Dec 20 00:00:00 UTC 2026", "Sun Nov 01 00:00:00 UTC 2026")
        self.assertIsNone(refresh.posting_entry(board, url, refresh.job_posting_from_html(expired)))
        self.assertIsNone(refresh.java_date("next monday"))
        # Second shape: separate locality, region and country.
        split = html.replace('<meta itemprop="streetAddress" content="Milano, IT">',
                             '<meta itemprop="addressLocality" content="Aventura">'
                             '<meta itemprop="addressRegion" content="FL">'
                             '<meta itemprop="addressCountry" content="US">')
        self.assertNotEqual(split, html)
        entry = refresh.posting_entry(board, url, refresh.job_posting_from_html(split))
        self.assertEqual((entry["city"], entry["country"]), ("Aventura, FL", "US"))
        self.assertIsNone(refresh.job_posting_from_html("<div itemprop=\"title\">No schema</div>"))

    def test_language_duplicates_and_placeholder_fields(self):
        sitemap = b"""<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://jobs.monclergroup.com/jobs/34711?lang=en-gb</loc></url>
        <url><loc>https://jobs.monclergroup.com/jobs/34711?lang=it-it</loc></url>
        <url><loc>https://jobs.monclergroup.com/jobs/34722?lang=en-us</loc></url></urlset>"""
        board = {"brand": "Moncler Group", "sitemap_urls": ["https://jobs.monclergroup.com/sitemap.xml"],
                 "link_hosts": ["jobs.monclergroup.com"],
                 "job_url_regex": r"^https://jobs\.monclergroup\.com/jobs/\d+",
                 "dedupe_regex": r"/jobs/(\d+)", "brands_from_hiring_org": ["Stone Island", "Moncler"]}
        with mock.patch.object(refresh, "fetch", return_value=sitemap):
            urls = refresh.sitemap_job_urls(board)
        self.assertEqual(urls, ["https://jobs.monclergroup.com/jobs/34711?lang=en-gb",
                                "https://jobs.monclergroup.com/jobs/34722?lang=en-us"])
        html = page("E-Tailer Marketing Intern", "2026-11-20", "Milan", "UNAVAILABLE", "IT",
                    "Moncler S.p.A.")
        entry = refresh.posting_entry(board, urls[0], refresh.job_posting_from_html(html))
        self.assertEqual((entry["city"], entry["country"], entry["brand"]), ("Milan", "IT", "Moncler"))

    def test_escaped_jsonld_type_and_more_placeholders(self):
        html = page("Digital & Media Trainee", "2026-11-20", "Milano", "Not", "Italy",
                    "Cartier").replace(b'type="application/ld+json"', b'type="application/ld&#x2B;json"')
        posting = refresh.job_posting_from_html(html)
        self.assertIsNotNone(posting)
        board = {"brand": "Richemont", "brands_from_hiring_org": ["Montblanc", "Cartier"]}
        entry = refresh.posting_entry(board, "https://careers.richemont.com/en/jobs/jr1/x", posting)
        self.assertEqual((entry["city"], entry["country"], entry["brand"]), ("Milano", "IT", "Cartier"))

    def test_stale_lastmod_is_skipped_only_when_enabled(self):
        sitemap = b"""<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://careers.richemont.com/en/jobs/jr1/old/</loc><lastmod>2026-02-19T00:00:00Z</lastmod></url>
        <url><loc>https://careers.richemont.com/en/jobs/jr2/new/</loc><lastmod>2026-11-20T00:00:00Z</lastmod></url>
        <url><loc>https://careers.richemont.com/en/jobs/jr3/nodate/</loc></url></urlset>"""
        board = {"brand": "Richemont", "sitemap_urls": ["https://careers.richemont.com/sitemap.xml"],
                 "link_hosts": ["careers.richemont.com"],
                 "job_url_regex": r"^https://careers\.richemont\.com/en/jobs/jr\d+/"}
        with mock.patch.object(refresh, "fetch", return_value=sitemap):
            self.assertEqual(len(refresh.sitemap_job_urls(board)), 3)
            urls = refresh.sitemap_job_urls(dict(board, skip_stale_lastmod=True))
        self.assertEqual(urls, ["https://careers.richemont.com/en/jobs/jr2/new",
                                "https://careers.richemont.com/en/jobs/jr3/nodate"])

    def test_rss_listing_with_location_filter(self):
        feed = b"""<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>
        <item><title>Tech (McDonough, GA, US, 30253)</title><link>https://careers.essilorluxottica.com/job/McDonough-Tech/1455724833/</link><g:location>McDonough, GA, US, 30253</g:location></item>
        <item><title>Marketing Internship (Milano, IT, 20123)</title><link>https://careers.essilorluxottica.com/job/Milano-Retail-Italia-Marketing-Internship/1415428533/</link><g:location>Milano, IT, 20123</g:location></item>
        <item><title>PLM Internship (Agordo, IT)</title><link>https://careers.essilorluxottica.com/job/Agordo-PLM-Internship/1415600633/</link><g:location>Agordo, IT</g:location></item>
        <item><title>Phishing</title><link>https://evil.example.com/job/Milano-X/1/</link><g:location>Milano, IT</g:location></item>
        </channel></rss>"""
        board = {"brand": "EssilorLuxottica", "sitemap_urls": ["https://careers.essilorluxottica.com/sitemap.xml"],
                 "link_hosts": ["careers.essilorluxottica.com"], "listing_format": "rss",
                 "location_regex": r"(^|, )IT(,|$)", "max_listing_bytes": 40000000,
                 "job_url_regex": r"^https://careers\.essilorluxottica\.com/job/[^/]+/\d+$"}
        calls = []

        def fake(url, accept, max_bytes=None):
            calls.append(max_bytes)
            return feed
        with mock.patch.object(refresh, "fetch", side_effect=fake):
            urls = refresh.sitemap_job_urls(board)
        self.assertEqual(urls, ["https://careers.essilorluxottica.com/job/Milano-Retail-Italia-Marketing-Internship/1415428533",
                                "https://careers.essilorluxottica.com/job/Agordo-PLM-Internship/1415600633"])
        self.assertEqual(calls, [40000000])
        with mock.patch.object(refresh, "fetch", return_value=b"<urlset/>"):
            with self.assertRaises(ValueError):
                refresh.sitemap_job_urls(board)

    def test_listing_size_limit_has_a_hard_ceiling(self):
        resp = mock.MagicMock()
        resp.__enter__.return_value = resp
        resp.status, resp.headers = 200, {}
        resp.read.side_effect = lambda n: b"x" * min(n, 100)
        with mock.patch("urllib.request.urlopen", return_value=resp), \
             mock.patch.object(refresh, "MAX_RESPONSE_BYTES", 10), \
             mock.patch.object(refresh, "MAX_LISTING_BYTES", 50):
            with self.assertRaises(RuntimeError):      # default limit (10) exceeded
                REAL_FETCH("https://x.example.com/a", "text/xml")
            with self.assertRaises(RuntimeError):      # board asks 10.000, capped at 50
                REAL_FETCH("https://x.example.com/a", "text/xml", 10_000)
            resp.read.side_effect = lambda n: b"x" * min(n, 40)
            self.assertEqual(len(REAL_FETCH("https://x.example.com/a", "text/xml", 45)), 40)

    def test_group_name_never_decides_the_brand(self):
        board = {"brand": "Hugo Boss", "group_names": ["HUGO BOSS AG", "HUGO BOSS"],
                 "brands_from_hiring_org": ["BOSS", "HUGO"]}
        def entry(title, url):
            html = page(title, "2026-11-20", "Metzingen", "", "DE", "HUGO BOSS AG")
            return refresh.posting_entry(board, url, refresh.job_posting_from_html(html))
        base = "https://careers.hugoboss.com/global/en/job/1/"
        self.assertEqual(entry("Ausbildung Koch (m/w/d)", base + "Ausbildung-Koch")["brand"], "Hugo Boss")
        self.assertEqual(entry("HUGO BOSS Finance Intern", base + "Finance-Intern")["brand"], "Hugo Boss")
        self.assertEqual(entry("Internship Design BOSS Menswear", base + "Design")["brand"], "BOSS")
        self.assertEqual(entry("Key Holder", base + "Part-Time-Key-Holder-HUGO-Outlet")["brand"], "HUGO")

    def test_unknown_date_stays_unknown(self):
        html = page("Merchandising Intern", None)
        entry = refresh.posting_entry(PVH, BASE + "R1/x", refresh.job_posting_from_html(html))
        self.assertIsNone(entry["published_at"])

    def test_anti_bot_challenge_stops_the_board(self):
        def challenged(url, accept, max_bytes=None):
            if "sitemap" in url:
                return fake_fetch(url, accept)
            raise refresh.AntiBotChallenge("AWS WAF challenge")
        with mock.patch.object(refresh, "fetch", side_effect=challenged):
            with self.assertRaises(refresh.AntiBotChallenge):
                refresh.scan_sitemap_board(PVH, {}, NOW)

    def test_repeated_errors_stop_politely(self):
        calls = []

        def broken(url, accept, max_bytes=None):
            if "sitemap" in url:
                return fake_fetch(url, accept)
            calls.append(url)
            raise urllib.error.URLError("timeout")
        many = dict(PVH)
        with mock.patch.object(refresh, "fetch", side_effect=broken), \
             mock.patch.object(refresh, "MAX_CONSECUTIVE_PAGE_ERRORS", 3):
            entries, _, _ = refresh.scan_sitemap_board(many, {}, NOW)
        self.assertEqual(len(calls), 3)
        self.assertEqual(entries, [])

    def test_sitemap_must_be_on_declared_host(self):
        with self.assertRaises(ValueError):
            refresh.sitemap_job_urls(dict(PVH, sitemap_urls=["https://evil.example.com/s.xml"]))

    def test_country_codes(self):
        self.assertEqual(refresh.country_code("United States of America"), "US")
        self.assertEqual(refresh.country_code("Türkiye"), "TR")
        self.assertEqual(refresh.country_code("Hong Kong SAR"), "HK")
        self.assertEqual(refresh.country_code("it"), "IT")
        self.assertEqual(refresh.country_code("Atlantis"), "")

    def test_full_refresh_publishes_and_removes_closed_jobs(self):
        cfg = {"boards": [PVH]}
        closed = BASE + "R4/Closed-Buyer"
        old_jobs = {"jobs": [{"id": "x", "brand": "PVH", "title": "Buyer", "url": closed,
                              "published_at": "2026-11-20T00:00:00Z",
                              "first_seen_at": "2026-11-20T00:00:00Z",
                              "last_verified_at": "2026-11-23T00:00:00Z"}]}
        files = {}

        def read_text(path, **kw):
            if path.name == "boards.json":
                return json.dumps(cfg)
            if path.name == "jobs.json":
                return json.dumps(old_jobs)
            raise OSError("no state yet")

        def write_text(path, text, **kw):
            files[path.name] = text

        with mock.patch.object(Path, "read_text", read_text), \
             mock.patch.object(Path, "write_text", write_text), \
             mock.patch.object(Path, "replace", lambda self, target: None):
            refresh.refresh()
        out = json.loads(files["jobs.json.tmp"])
        urls = {j["url"] for j in out["jobs"]}
        self.assertNotIn(closed, urls)
        self.assertEqual(len(urls), 3)
        self.assertTrue(all(j["origin"] == "official_jobposting" for j in out["jobs"]))
        self.assertEqual({j["brand"] for j in out["jobs"]}, {"Calvin Klein", "Tommy Hilfiger"})
        state = json.loads(files["sitemap-state.json.tmp"])
        self.assertEqual(state["PVH"][closed]["status"], "gone")


class BoardsConfigSitemap(unittest.TestCase):
    def test_configured_sitemap_boards_are_safe(self):
        cfg = json.loads((Path(refresh.__file__).parent / "boards.json").read_text(encoding="utf-8"))
        boards = [b for b in cfg["boards"] if b["family"] == refresh.SITEMAP_FAMILY]
        self.assertTrue(boards)
        for board in boards:
            self.assertEqual(refresh.pages(board), [])
            for url in board["sitemap_urls"]:
                self.assertTrue(refresh._on_hosts(refresh.public_url(url), board))
            self.assertLessEqual(board.get("max_pages_per_run", 0), 150)


if __name__ == "__main__":
    unittest.main()
