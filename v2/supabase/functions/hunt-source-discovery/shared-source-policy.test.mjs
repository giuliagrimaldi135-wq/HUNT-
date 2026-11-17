import test from "node:test";
import assert from "node:assert/strict";
import {normalizedCareerURL,selectUniqueCareerSources} from "./shared-source-policy.mjs";
test("one OTB internship board is scanned once across Marni, Diesel, Jil Sander",()=>{
 const sources=[
  {id:"marni",base_url:"https://careers.otb.net/go/Internship/8575402/",consecutive_failures:12},
  {id:"diesel",base_url:"https://careers.otb.net/go/Internship/8575402",consecutive_failures:2},
  {id:"jil",base_url:"https://careers.otb.net/go/Internship/8575402/",consecutive_failures:7},
  {id:"valentino",base_url:"https://jobs.valentino.com/go/INTERNSHIP/5411201/",consecutive_failures:0}
 ];
 assert.deepEqual(selectUniqueCareerSources(sources).map(x=>x.id),["diesel","valentino"]);
});
test("preserves meaningful query filters across official sources",()=>{
 assert.notEqual(normalizedCareerURL("https://example.com/jobs?brand=Marni"),normalizedCareerURL("https://example.com/jobs?brand=Diesel"));
});
test("rejects credential-injected, non-HTTPS or malformed sources",()=>{
 assert.equal(normalizedCareerURL("http://example.com/jobs"),null);
 assert.equal(normalizedCareerURL("https://u:p@example.com/jobs"),null);
 assert.equal(normalizedCareerURL("not an url"),null);
});
