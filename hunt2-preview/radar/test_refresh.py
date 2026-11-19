import datetime as dt
import unittest
import refresh

class PublicRadarSafety(unittest.TestCase):
    def setUp(self):
        self.now=dt.datetime(2026,11,19,15,30,tzinfo=dt.timezone.utc)

    def test_only_https_and_no_javascript_urls(self):
        self.assertIsNone(refresh.public_url("javascript:alert(1)"))
        self.assertIsNone(refresh.public_url("http://jobs.lever.co/company/job"))
        self.assertEqual(refresh.public_url("https://jobs.lever.co/mulberry/job?utm_source=x"),
                         "https://jobs.lever.co/mulberry/job")

    def test_unknown_publication_does_not_become_a_fake_date(self):
        b={"family":"ats_lever","board":"mulberry","brand":"Mulberry"}
        rows=refresh.parse_jobs(b,[{"text":"Merchandising Internship",
          "hostedUrl":"https://jobs.lever.co/mulberry/00000001","createdAt":1795110000000,
          "categories":{"location":"London"}}])
        self.assertEqual(rows[0]["published_at"],None)
        item=refresh.public_job(rows[0],b,None,self.now)
        self.assertEqual(item["published_at"],None)
        self.assertEqual(item["first_seen_at"],"2026-11-19T15:30:00Z")

    def test_explicit_smartrecruiters_release_date(self):
        b={"family":"ats_smartrecruiters","board":"Frette","brand":"Frette"}
        rows=refresh.parse_jobs(b,{"content":[{
            "id":"123456789","name":"HR Internship",
            "postingUrl":"https://jobs.smartrecruiters.com/Frette/123456789",
            "releasedDate":"2026-11-18T09:00:00Z",
            "location":{"city":"Milano","region":"Lombardia"}
        }]})
        self.assertEqual(rows[0]["published_at"],"2026-11-18T09:00:00Z")
        self.assertEqual(rows[0]["city"],"Milano, Lombardia")

    def test_no_senior_titles_as_junior(self):
        self.assertEqual(refresh.seniority("Senior HR Business Partner"),"senior_manager")
        self.assertEqual(refresh.seniority("Retail Manager"),"manager")
        self.assertEqual(refresh.seniority("Junior Merchandising Intern"),"internship")
        self.assertEqual(refresh.seniority("Merchandising Specialist"),"unspecified")

    def test_discard_explicitly_old_published_job(self):
        b={"family":"ats_workable","board":"printfresh","brand":"Printfresh"}
        old={"title":"Buying Internship","city":"Milano",
             "url":"https://apply.workable.com/printfresh/j/1/",
             "published_at":"2026-09-01T00:00:00Z"}
        self.assertIsNone(refresh.public_job(old,b,None,self.now))

    def test_no_user_data_in_public_item(self):
        b={"family":"ats_greenhouse","board":"quince","brand":"Quince"}
        item=refresh.public_job({"title":"Buying Assistant","city":"London",
                 "url":"https://job-boards.greenhouse.io/quince/jobs/123","published_at":None},
                 b,None,self.now)
        for forbidden in ("user_id","email","cv","application_status","match_score"):
            self.assertNotIn(forbidden,item)
        self.assertEqual(item["brand"],"Quince")

if __name__=="__main__":
    unittest.main()
