import test from "node:test";
import assert from "node:assert/strict";
import {serviceErrorMessage,radarFreshness} from "./service-health.mjs";
test("quota restriction explains that login credentials are not the cause",()=>{
 assert.match(serviceErrorMessage({status:402,message:"Service for this project is restricted due to the following violations: exceed_egress_quota"}),/Non devi registrarti di nuovo/);
 assert.match(serviceErrorMessage({message:"exceed_egress_quota"}),/limite tecnico/);
 assert.equal(serviceErrorMessage({message:"Invalid login credentials"}),"Invalid login credentials");
});
test("radar stale status relies on actual verification time, not cron schedule",()=>{
 const now=Date.parse("2026-11-19T15:00:00Z");
 assert.equal(radarFreshness("2026-11-19T14:50:00Z",now).stale,false);
 assert.equal(radarFreshness("2026-11-18T22:13:00Z",now).stale,true);
 assert.equal(radarFreshness(null,now).stale,true);
});
