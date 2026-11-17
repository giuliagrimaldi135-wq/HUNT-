import test from "node:test";
import assert from "node:assert/strict";
import {leverPostingCreatedAtISO as leverDate} from "./lever-original-date.mjs";
const now=Date.parse("2026-11-17T15:00:00Z");
test("official Lever createdAt is milliseconds, never seconds",()=>{
 assert.equal(leverDate(1791808237234,now),"2026-10-12T12:30:37.234Z");
 assert.equal(leverDate("1794907706870",now),"2026-11-17T09:28:26.870Z");
});
test("never use fake or future timestamps as original dates",()=>{
 for(const s of ["1791808237", "not-a-date","0",null,undefined,"1791808237234zzz",9999999999999])assert.equal(leverDate(s,now),null,String(s));
});
