import test from "node:test";
import assert from "node:assert/strict";
import {isLvmhJobDetailUrl,lvmhPublishedDateFromOfficialPage} from "./lvmh-job-policy.mjs";
test("accepts exact official LVMH job detail references in EN and IT",()=>{
 for(const url of ["https://www.lvmh.com/en/join-us/our-job-offers/PCD22439",
  "https://www.lvmh.com/it/opportunita-di-lavoro/le-nostre-posizioni/CDC15429",
  "https://www.lvmh.com/join-us/our-job-offers/299623"])
  assert.equal(isLvmhJobDetailUrl(url),true,url);
});
test("never mistakes search pages or untrusted sites for vacancies",()=>{
 for(const url of ["https://www.lvmh.com/en/join-us/our-job-offers",
  "https://www.lvmh.com/en/join-us/our-job-offers?functionFilter=Merchandising",
  "https://evil.example/en/join-us/our-job-offers/PCD22439",
  "http://www.lvmh.com/en/join-us/our-job-offers/PCD22439",
  "https://www.lvmh.com/en/join-us/our-job-offers/fake"])assert.equal(isLvmhJobDetailUrl(url),false,url);
});
test("only accepts displayed official publication dates; no first-seen substitution",()=>{
 const now=Date.parse("2026-11-19T12:00:00Z");
 assert.equal(lvmhPublishedDateFromOfficialPage("<p>Published on 11.18.2026</p>",now),"2026-11-18T00:00:00.000Z");
 assert.equal(lvmhPublishedDateFromOfficialPage("<span>Pubblicato il 11.17.2026</span>",now),"2026-11-17T00:00:00.000Z");
 assert.equal(lvmhPublishedDateFromOfficialPage("Latest offers today",now),null);
 assert.equal(lvmhPublishedDateFromOfficialPage("Published on 12.18.2026",now),null);
 assert.equal(lvmhPublishedDateFromOfficialPage("Published on 02.30.2026",now),null);
});
