import test from "node:test";
import assert from "node:assert/strict";
import {explicitOfficialCountry,jobPostingCountryCode} from "./official-location-country.mjs";
const place=country=>({address:country?{addressCountry:country}:{addressLocality:"Paris"}});
const job=location=>({jobLocation:location});
test("read country from official schema.org PostalAddress",()=>{
 assert.equal(jobPostingCountryCode(job(place("IT"))),"IT");
 assert.equal(jobPostingCountryCode(job(place({name:"France"}))),"FR");
 assert.equal(jobPostingCountryCode(job(place("United States"))),"US");
});
test("never guess from city, multiple countries or untrusted regions",()=>{
 assert.equal(jobPostingCountryCode(job(place(null))),null);
 assert.equal(jobPostingCountryCode(job([place("Italy"),place("Spain")])),null);
 assert.equal(jobPostingCountryCode(job([place("Italy"),place(null)])),null);
 assert.equal(jobPostingCountryCode(job([place("Italy"),place("IT")])),"IT");
 assert.equal(jobPostingCountryCode({applicantLocationRequirements:place("UK")}),null);
});
test("accept only plausible explicit country values",()=>{
 assert.equal(explicitOfficialCountry("es"),"ES");
 assert.equal(explicitOfficialCountry("UK"),"GB");
 for(const x of ["EU","ZZ","Paris","London","",undefined,{}])assert.equal(explicitOfficialCountry(x),null);
});
