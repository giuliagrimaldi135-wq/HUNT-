from ingestion.jsonld import parse_jsonld_job_postings


def test_parse_jobposting_jsonld():
    html = """
    <html><head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": "Retail Merchandising Intern",
        "description": "<p>Support product selection and sales analysis.</p>",
        "datePosted": "2026-11-05",
        "identifier": {"@type": "PropertyValue", "value": "21280"},
        "hiringOrganization": {"@type": "Organization", "name": "Prada Group"},
        "jobLocation": {
          "@type": "Place",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Milano",
            "addressCountry": "IT"
          }
        },
        "url": "https://example.com/job/21280"
      }
      </script>
    </head></html>
    """
    jobs = parse_jsonld_job_postings(html, "https://example.com/careers", "Official")
    assert len(jobs) == 1
    assert jobs[0].company_name == "Prada Group"
    assert jobs[0].title == "Retail Merchandising Intern"
    assert jobs[0].requisition_id == "21280"
    assert "Milano" in jobs[0].location
    assert jobs[0].description == "Support product selection and sales analysis."
