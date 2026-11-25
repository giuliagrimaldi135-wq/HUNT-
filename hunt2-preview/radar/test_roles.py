"""Role family and seniority from real multilingual job titles (25/11/2026 radar)."""
import re
import unittest
from pathlib import Path

import refresh

ROLE_CASES = {
    "Retail & Retail Operations": [
        "Client Advisor (Vancouver Holt Renfrew)", "Sales Associate - Part-Time",
        "Conseiller de Vente H/F - CDD - Galeries Lafayette Nice Massena",
        "Prodavač/ka - DPP", "Addetta vendite - Milano", "Commessa part time",
        "Store Manager - Harvey Nichols - Edinburgh", "Client Advisor/ Stylist - Belmont Outlet",
        "Sales Supervisor, Full-Time - Houston Galleria", "Verkäufer (m/w/d) Outlet Metzingen"],
    "Merchandising": ["Merchandising Intern (6 months)", "Director, Merchandising - Dresses"],
    "Visual Merchandising": ["VISUAL MERCHANDISER", "Visual Merchandising Manager Enschede"],
    "Buying": ["Purchasing Assistant", "[Fashion] - Acheteur.se Matières Premières H/F - CDI",
               "Associate Buyer, Underwear - Calvin Klein", "Stage Ufficio Acquisti"],
    "Planning & Allocation": ["Regional Planner", "Manager, Commercial Planning"],
    "E-commerce & Digital": ["Site Merchandising Associate", "PRADA Manager Ecommerce Performance"],
    "HR & Talent": ["HR Assistant - intern", "Recruiting Coordinator, Palo Alto",
                    "Gestionnaire Ressources Humaines", "Stage Risorse Umane"],
    "Finance & Legal": ["International Tax Manager", "Lead Accountant, Inventory",
                        "Internal Audit Internship", "Senior Legal Counsel - Privacy"],
    "Technology": ["Senior Fullstack Engineer", "Cyber Security Specialist", "IT Operations Manager",
                   "Senior Solution Architect", "VERSACE IT Infrastructure Specialist"],
    "Production & Sourcing": ["Sourcing Manager, Kids & Baby", "Quality Laboratory Internship",
                              "Modellista abbigliamento donna", "Horloger Analyste"],
    "Product Management & Development": ["Product Development Manager", "Stage Sviluppo Prodotto Calzature"],
    "CRM & Clienteling": ["CRM Manager", "Customer Service Advisor (English Speaker)"],
    "PR, Communications & Events": ["Image Events Intern", "Press Manager", "Digital Content Intern"],
    "Marketing & Brand": ["Brand Management Trainee (6 to 12 months)", "Trade Marketing Specialist"],
    "Data & Analytics": ["Data Engineer", "Head of Business Intelligence"],
    "Design & Creative": ["Graphic Design Intern", "Senior Designer RTW"],
    "Facilities & Store Development": ["Director of Facilities", "CDI - Store Planning Manager H/F",
                                       "Technicien de Maintenance H/F CDI"],
    "Wholesale & Commercial": ["Account Manager - New Business", "Showroom Dresser"],
    "Supply Chain & Logistics": ["Warehouse Associate", "Magazziniere - Max Mara - Milano via Orefici"],
}

LEVEL_CASES = {
    "internship": ["CAMPAIGN MANAGER (Praktikum) (W/M/X)", "Stage Compliance di Prodotto",
                   "Prácticas Marketing Madrid", "Merchandising Intern (6 months)", "Tirocinio HR"],
    "trainee": ["Contrat en alternance - Assistant RH", "Apprendista commessa", "HR Trainee (m/w/d)"],
    "head_director": ["Head of UX/UI (H/F/X)", "Directrice de boutique"],
    "senior_manager": ["Senior Finance Analyst"],
    "manager": ["Store Manager", "PT Floor Leader - Valencia"],
    "assistant": ["Purchasing Assistant", "Assistente di direzione"],
    "junior": ["Sourcing Associate (Fresh Graduate)", "Junior Buyer"],
    "unspecified": ["Client Advisor", "Sales Associate - Part-Time"],
}


class RoleFamilies(unittest.TestCase):
    def test_real_titles(self):
        for family, titles in ROLE_CASES.items():
            for title in titles:
                with self.subTest(title=title):
                    self.assertEqual(refresh.role_family(title), family)

    def test_unknown_stays_empty(self):
        for title in ("Producer", "Supervisor (Concession)", "", None):
            self.assertEqual(refresh.role_family(title), "")

    def test_families_match_the_page_filter(self):
        js = (Path(refresh.__file__).parent / "personal-radar-policy.mjs").read_text(encoding="utf-8")
        page = set(re.findall(r'"([^"]+)"', js[js.index("FAMILIES"):js.index("];")]))
        used = {fam for _, fam in refresh.ROLE_SPECS}
        self.assertLessEqual(used, page)


class Levels(unittest.TestCase):
    def test_real_titles(self):
        for level, titles in LEVEL_CASES.items():
            for title in titles:
                with self.subTest(title=title):
                    self.assertEqual(refresh.seniority(title), level)


class ExistingJobsAreReclassified(unittest.TestCase):
    def test_refresh_applies_current_rules_to_old_records(self):
        import json
        from unittest import mock
        old = {"jobs": [
            {"id": "a", "brand": "X", "title": "Prácticas Marketing Madrid", "role": "", "level": "unspecified",
             "url": "https://jobs.example.com/a", "first_seen_at": "2026-11-24T00:00:00Z",
             "last_verified_at": "2026-11-24T00:00:00Z"},
            {"id": "b", "brand": "X", "title": "Producer", "role": "Design & Creative", "level": "junior",
             "url": "https://jobs.example.com/b", "first_seen_at": "2026-11-24T00:00:00Z",
             "last_verified_at": "2026-11-24T00:00:00Z"}]}
        cfg = {"boards": [{"family": "ats_lever", "board": "mulberry", "brand": "Mulberry"}]}
        files = {}

        def read_text(path, **kw):
            return json.dumps(cfg if path.name == "boards.json" else old)
        import datetime as dt
        fixed = dt.datetime(2026, 11, 25, 18, 0, tzinfo=dt.timezone.utc)
        with mock.patch.object(refresh, "get_json", return_value=[]), \
             mock.patch.object(refresh, "now", return_value=fixed), \
             mock.patch.object(Path, "read_text", read_text), \
             mock.patch.object(Path, "write_text", lambda self, t, **k: files.__setitem__(self.name, t)), \
             mock.patch.object(Path, "replace", lambda self, target: None):
            refresh.refresh()
        jobs = {j["id"]: j for j in json.loads(files["jobs.json.tmp"])["jobs"]}
        self.assertEqual((jobs["a"]["role"], jobs["a"]["level"]), ("Marketing & Brand", "internship"))
        self.assertEqual((jobs["b"]["role"], jobs["b"]["level"]), ("Design & Creative", "junior"))


if __name__ == "__main__":
    unittest.main()
