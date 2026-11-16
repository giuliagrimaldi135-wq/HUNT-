import test from "node:test";
import assert from "node:assert/strict";
import {extractDirectoryWebsite,websiteBackfillEligible} from "./website-extraction.mjs";
test("finds known brand website explicitly linked from directory profile",()=>{
 const html='<html><h1>Vero Moda</h1><p>Website: <a href="https://www.veromoda.com/en/">veromoda.com</a></p></html>';
 assert.equal(extractDirectoryWebsite(html,"Vero Moda"),"https://www.veromoda.com/");
});
test("supports longer multiword fashion brand domain",()=>{
 assert.equal(extractDirectoryWebsite('<a href="https://www.onitsukatiger.com/">Visit</a>',"Onitsuka Tiger"),"https://www.onitsukatiger.com/");
});
test("never promotes directory, social, or unrelated lookalike website",()=>{
 const page='<a href="https://www.linkedin.com/company/vero-moda">LinkedIn</a><a href="https://veromoda-scam.example.com">Not official</a>';
 assert.equal(extractDirectoryWebsite(page,"Vero Moda"),null);
});
test("only backfills stored directory profiles with a retry window",()=>{
 const c={slug:"vero-moda",discovery_source:"fashionunited_public_brand_directory",metadata:{website_backfill:{attempted_at:"2026-11-16T09:00:00Z"}}};
 assert.equal(websiteBackfillEligible(c,Date.parse("2026-11-16T16:00:00Z")),false);
 assert.equal(websiteBackfillEligible(c,Date.parse("2026-11-17T10:00:00Z")),true);
 assert.equal(websiteBackfillEligible({...c,website_url:"https://veromoda.com"},Date.parse("2026-11-17T10:00:00Z")),false);
});

test("accepts legacy HTTP directory links only as unverified HTTPS candidates",()=>{
 const html='<div>Website: <a href="http://www.veromoda.com">veromoda.com</a></div>';
 assert.equal(extractDirectoryWebsite(html,"Vero Moda"),"https://www.veromoda.com/");
});
