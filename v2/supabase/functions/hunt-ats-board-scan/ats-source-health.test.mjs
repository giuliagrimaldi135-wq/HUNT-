import test from "node:test";
import assert from "node:assert/strict";
import {atsBackoffMinutes,shouldProbeATS,atsScanStatus} from "./ats-source-health.mjs";
test("repeated Frette errors trigger bounded progressive retry, not a rapid failure storm",()=>{
 assert.equal(atsBackoffMinutes(0),0);
 assert.equal(atsBackoffMinutes(3),15);
 assert.equal(atsBackoffMinutes(6),60);
 assert.equal(atsBackoffMinutes(11),180);
});
test("healthy boards keep scanning while degraded boards cool down",()=>{
 const now=Date.parse("2026-11-16T18:00:00Z");
 assert.equal(shouldProbeATS({consecutive_failures:11,last_scan_at:"2026-11-16T17:32:00Z"},now),false);
 assert.equal(shouldProbeATS({consecutive_failures:0,last_scan_at:"2026-11-16T17:59:00Z"},now),true);
 assert.equal(shouldProbeATS({consecutive_failures:11,last_scan_at:"2026-11-16T14:59:00Z"},now),true);
});
test("HTTP success without any valid vacancy is not mistaken for full source health",()=>{
 assert.equal(atsScanStatus(0,0),"reachable_no_listings");
 assert.equal(atsScanStatus(15,12),"healthy");
 assert.equal(atsScanStatus(15,0),"degraded");
 assert.equal(atsScanStatus(100,80,true),"degraded");
});
