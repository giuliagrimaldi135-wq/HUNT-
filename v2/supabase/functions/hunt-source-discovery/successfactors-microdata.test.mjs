import test from "node:test";
import assert from "node:assert/strict";
import {parseOfficialPostedDate,extractOfficialJobTitle,extractOfficialJobDescription} from "./successfactors-microdata.mjs";
const employerText="Supporting merchandising planning, sell-through reporting, seasonal buying, product assortment and KPI performance analysis. ".repeat(10);
const sample="<html><div itemscope itemtype='http://schema.org/JobPosting'><meta itemprop=\"datePosted\" content=\"Sat Nov 14 02:00:00 UTC 2026\"><h1><span lang='en' itemprop=\"title\" class='role'>Europe Junior Buyer</span></h1><span itemprop=\"description\" class='rtltextaligneligible'><span class='jobdescription'><div><p>"+employerText+"</p><span>Coordinate retail teams and suppliers.</span></div></span></span></div></html>";
test("reads public SuccessFactors UTC posting date without inventing a new date",()=>{
 assert.equal(parseOfficialPostedDate("Sat Nov 14 02:00:00 UTC 2026",Date.parse("2026-11-16T10:00:00Z")),"2026-11-14T02:00:00.000Z");
});
test("accepts ISO dates too; never accepts narrative or future dates",()=>{
 assert.equal(parseOfficialPostedDate("2026-11-10",Date.parse("2026-11-16T10:00:00Z")),"2026-11-10T00:00:00.000Z");
 assert.equal(parseOfficialPostedDate("just posted yesterday"),null);
 assert.equal(parseOfficialPostedDate("2027-01-10",Date.parse("2026-11-16T10:00:00Z")),null);
});
test("extracts the actual title and long job description from nested HTML microdata",()=>{
 assert.equal(extractOfficialJobTitle(sample),"Europe Junior Buyer");
 const details=extractOfficialJobDescription(sample);
 assert.ok(details.includes("seasonal buying"));
 assert.ok(details.includes("Coordinate retail teams"));
 assert.ok(!details.includes("Sat Nov 14"));
});
test("does not promote pages without substantive employer responsibilities",()=>{
 assert.equal(extractOfficialJobDescription('<span itemprop="description">Apply now</span>'),"");
 assert.equal(extractOfficialJobTitle('<h1>All jobs</h1>'),"");
});
test("microdata parser ignores unrelated page footer and nested markup",()=>{
 const page=sample+"<footer>"+("Fashion brand navigation ".repeat(80))+"</footer>";
 assert.ok(!extractOfficialJobDescription(page).includes("Fashion brand navigation"));
});
