import unittest
from radar_persist_policy import materially_changed


class RadarCommitPolicyTests(unittest.TestCase):
    def test_timestamp_only_updates_are_not_material(self):
        old = {
            "generated_at": "2026-11-18T08:00:00Z",
            "sources": {"brand": {"checked_at": "2026-11-18T08:00:00Z",
                                  "ok": True, "items": 2}},
            "jobs": [{"key": "x", "first_seen_at": "2026-11-18T07:00:00Z",
                      "last_seen_at": "2026-11-18T08:00:00Z"}],
        }
        new = {
            "generated_at": "2026-11-18T08:05:00Z",
            "sources": {"brand": {"checked_at": "2026-11-18T08:05:00Z",
                                  "ok": True, "items": 2}},
            "jobs": [{"key": "x", "first_seen_at": "2026-11-18T07:00:00Z",
                      "last_seen_at": "2026-11-18T08:05:00Z"}],
        }
        self.assertFalse(materially_changed(old, new))

    def test_new_job_and_source_health_change_require_publish(self):
        self.assertTrue(materially_changed([{"key": "x"}], [{"key": "x"}, {"key": "y"}]))
        self.assertTrue(materially_changed({"ok": True}, {"ok": False}))
        self.assertTrue(materially_changed({"items": 2}, {"items": 3}))

    def test_true_publication_date_and_first_seen_remain_material(self):
        self.assertTrue(materially_changed({"published_at": "2026-11-17"}, {"published_at": "2026-11-18"}))
        self.assertTrue(materially_changed({"first_seen_at": "a"}, {"first_seen_at": "b"}))


if __name__ == "__main__":
    unittest.main()
