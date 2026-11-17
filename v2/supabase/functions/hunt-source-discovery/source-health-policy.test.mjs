import test from "node:test";
import assert from "node:assert/strict";
import {sourceRetryDelayMinutes,shouldScanSource} from "./source-health-policy.mjs";
test("quickly rechecks single transient errors",()=>assert.equal(sourceRetryDelayMinutes(1),0));
test("increasing failures receive bounded adaptive retry windows",()=>{
 assert.equal(sourceRetryDelayMinutes(3),90);
 assert.equal(sourceRetryDelayMinutes(6),360);
 assert.equal(sourceRetryDelayMinutes(12),1440);
});
test("degraded sources retry again after cooldown automatically",()=>{
 const source={consecutive_failures:6,last_scan_at:"2026-11-16T14:00:00Z"};
 assert.equal(shouldScanSource(source,Date.parse("2026-11-16T17:59:00Z")),false);
 assert.equal(shouldScanSource(source,Date.parse("2026-11-16T20:00:00Z")),true);
});
test("never keeps sources in permanent quarantine",()=>assert.equal(shouldScanSource({consecutive_failures:99,last_scan_at:null}),true));
