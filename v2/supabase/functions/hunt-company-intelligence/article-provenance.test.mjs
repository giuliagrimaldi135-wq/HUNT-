import test from "node:test";
import assert from "node:assert/strict";
import {publishedDateInArticleURL as pathDate,belongsToNamedCompany as belongs} from "./article-provenance.mjs";
test("dated ASICS press URLs reveal May/June dates, never today's crawl date",()=>{
 assert.equal(pathDate("https://corp.asics.com/en/press/article/2026-05-22_cdp-supplier-engagement",Date.parse("2026-11-17")), "2026-05-22T00:00:00.000Z");
 assert.equal(pathDate("https://corp.asics.com/en/press/article/2026-06-02-avc_kenzen",Date.parse("2026-11-17")), "2026-06-02T00:00:00.000Z");
});
test("invalid dates and undated slugs do not create artificial publication facts",()=>{
 assert.equal(pathDate("https://corp.asics.com/en/press/article/2026-02-31_invalid"),null);
 assert.equal(pathDate("https://corp.asics.com/en/press/article/some-press-release"),null);
});
test("ASICS generic corporate news cannot pretend to be Onitsuka Tiger news",()=>{
 assert.equal(belongs("ASICS Launches JETRAY ELITE Soccer Shoe","A new ASICS product","Onitsuka Tiger","https://corp.asics.com/en/press","https://www.onitsukatiger.com/"),false);
 assert.equal(belongs("Onitsuka Tiger opens new flagship in Milan","","Onitsuka Tiger","https://corp.asics.com/en/press","https://www.onitsukatiger.com/"),true);
});
test("actual house domains and genuinely scoped articles still qualify",()=>{
 assert.equal(belongs("Autumn collection unveiled","","La DoubleJ","https://www.ladoublej.com/blog","https://www.ladoublej.com/"),true);
 assert.equal(belongs("Prada Group 9M results","","Prada Group","https://www.pradagroup.com/en/news-media/","https://www.pradagroup.com"),true);
});
