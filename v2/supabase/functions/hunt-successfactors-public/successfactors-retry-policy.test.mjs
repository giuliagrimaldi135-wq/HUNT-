import test from "node:test";
import assert from "node:assert/strict";
import {successFactorsCooldownMinutes,shouldProbeSuccessFactors} from "./successfactors-retry-policy.mjs";
test("healthy sites continue on normal scan interval",()=>assert.equal(successFactorsCooldownMinutes(0),0));
test("consecutive 503 errors slow down automatically without permanent disabling",()=>{
 assert.deepEqual([1,2,3,5,10].map(successFactorsCooldownMinutes),[20,45,90,180,360]);
});
test("Prada with 2 successive HTTP 503 responses is not retried 10 minutes later",()=>{
 const site={consecutive_failures:2,last_scan_at:"2026-11-17T12:14:00Z"};
 assert.equal(shouldProbeSuccessFactors(site,Date.parse("2026-11-17T12:24:00Z")),false);
 assert.equal(shouldProbeSuccessFactors(site,Date.parse("2026-11-17T12:59:00Z")),true);
});
test("missing last timestamp permits recovery, not permanent quarantine",()=>assert.equal(
 shouldProbeSuccessFactors({consecutive_failures:100,last_scan_at:null}),true));
