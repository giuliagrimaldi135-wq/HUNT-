import test from "node:test";
import assert from "node:assert/strict";
import {LEVER_PAGE_LIMIT,leverPageUrl,leverNextPageOffset,leverCatalogComplete,providerCountryCode,successfulATSParserFlag} from "./ats-world-coverage.mjs";

test("Lever API pagination reaches postings beyond initial 250",()=>{
 assert.equal(LEVER_PAGE_LIMIT,120);
 assert.equal(leverPageUrl("veepee",0),"https://api.lever.co/v0/postings/veepee?mode=json&limit=120&skip=0");
 assert.equal(leverNextPageOffset(0,120,false),0);
 assert.equal(leverNextPageOffset(0,120,true),120);
 assert.equal(leverNextPageOffset(120,120,true),240);
 assert.equal(leverNextPageOffset(240,71,true),0);
});
test("never mark an incomplete page as full-board vacancy closure evidence",()=>{
 assert.equal(leverCatalogComplete(0,75),true);
 assert.equal(leverCatalogComplete(0,120),false);
 assert.equal(leverCatalogComplete(120,12),false);
 assert.equal(leverCatalogComplete(240,0),false);
});
test("valid source country must be an explicit two-letter code",()=>{
 assert.equal(providerCountryCode("gb"),"GB");
 assert.equal(providerCountryCode(" US "),"US");
 for(const v of ["Italy","Milan","","EU",null,{},["IT"],"U5"])assert.equal(providerCountryCode(v),v==="EU"?"EU":null);
});
test("parser success is independent of zero accepted postings",()=>{
 assert.equal(successfulATSParserFlag(),true);
});
