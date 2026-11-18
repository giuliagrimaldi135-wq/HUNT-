import test from "node:test";
import assert from "node:assert/strict";
import {explicitOfficialCountry,jobPostingCountryCode} from "./official-location-country.mjs";
test("read country from official schema.org PostalAddress",()=>{
 const x={"@type":"JobPosting",jobLocation:{"@type":"Place",address:{"@type":"PostalAddress",addressLocality:"Milano",addressCountry:"IT"}}};
 assert.equal(jobPostingCountryCode(x),"IT");
 assert.equal(jobPostingCountryCode({jobLocation:{address:{addressCountry:{name:"France"}}}),"FR");
 assert.equal(jobPostingCountryCode({jobLocation:{address:{addressCountry:"United States"}}}),"US");
});
test("never guess from city, multiple countries or untrusted regions",()=>{
 assert.equal(jobPostingCountryCode({jobLocation:{address:{addressLocality:"Paris"}}}),null);
 assert.equal(jobPostingCountryCode({jobLocation:[{address:{addressCountry:"Italy"}},{address:{addressCountry:"Spain"}}]}),null);
 assert.equal(jobPostingCountryCode({jobLocation:[{address:{addressCountry:"Italy"}},{address:{addressLocality:"Paris"}}]}),null);
 assert.equal(jobPostingCountryCode({jobLocation:[{address:{addressCountry:"Italy"}},{address:{addressCountry:"IT"}}]}),"IT");
 assert.equal(jobPostingCountryCode({applicantLocationRequirements:{address:{addressCountry:"UK"}}}),null);
});
test("accept only plausible explicit country values",()=>{
 assert.equal(explicitOfficialCountry("es"),"ES");
 assert.equal(explicitOfficialCountry("UK"),"GB");
 for(const x of ["EU","ZZ","Paris","London","",undefined,{}])assert.equal(explicitOfficialCountry(x),null);
});
