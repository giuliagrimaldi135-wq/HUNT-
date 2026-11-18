import test from "node:test";
import assert from "node:assert/strict";
import {extractStructuredVacancyLinks as links} from "./source-jsonld-links.mjs";
const base="https://jobs.fashionbrand.com/careers";
const html=(x)=>'<html><script type="application/ld+json">'+JSON.stringify(x)+'</script></html>';
test("discover genuine linked JobPosting URLs from JSON-LD @graph",()=>{
 const data={"@context":"https://schema.org","@graph":[
  {"@type":"Organization","name":"Fashion Brand","url":"https://jobs.fashionbrand.com/jobs/"},
  {"@type":"JobPosting","title":"Retail Merchandising Intern","url":"https://jobs.fashionbrand.com/jobs/retail-merchandising-intern-123"},
  {"@type":["Thing","JobPosting"],"title":"Junior Buying Assistant","url":"https://jobs.fashionbrand.com/jobs/junior-buying-456"}
 ]};
 assert.deepEqual(links(html(data),base).map(x=>x.title),["Retail Merchandising Intern","Junior Buying Assistant"]);
});
test("reject marketing pages, navigation, external unknown hosts and JS template URLs",()=>{
 const raw={"@graph":[
  {"@type":"Organization","name":"Fashion Brand","url":"https://jobs.fashionbrand.com/jobs/careers"},
  {"@type":"JobPosting","title":"Send us a CV","url":"https://jobs.fashionbrand.com/jobs/send-cv"},
  {"@type":"JobPosting","title":"Fashion Intern","url":"https://random.example/jobs/fashion-intern"},
  {"@type":"JobPosting","title":"Fashion Intern","url":"javascript:alert(1)"},
  {"@type":"JobPosting","title":"Retail Intern","url":"https://jobs.fashionbrand.com/job/%7B%7BjobId%7D%7D"}
 ]};
 assert.deepEqual(links(html(raw),base),[]);
});
test("deduplicate URL, respect limits and tolerate malformed JSON-LD",()=>{
 const job={"@type":"https://schema.org/JobPosting","title":"Junior Product Analyst","url":"https://jobs.fashionbrand.com/jobs/junior-product-analyst"};
 assert.equal(links(html({"@graph":[job,job,job]}),base).length,1);
 assert.equal(links(html({"@graph":[job,job,job]}),base,0).length,0);
 assert.deepEqual(links(html({"@type":"WebPage","url":"https://jobs.fashionbrand.com/jobs/"}),base),[]);
 assert.deepEqual(links("<html><script type='application/ld+json'>not-json</script></html>",base),[]);
});
test("ATS posting URLs require normal candidate validity",()=>{
 const url="https://jobs.smartrecruiters.com/Brand/744000148741549-stylist";
 const x=links(html({"@type":"JobPosting","title":"Retail Planning Intern","url":url}),base);
 assert.equal(x.length,1); assert.equal(x[0].url,url);
});
