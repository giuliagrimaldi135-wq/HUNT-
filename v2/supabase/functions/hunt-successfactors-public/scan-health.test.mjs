import test from "node:test";
import assert from "node:assert/strict";
import {scanHealth} from "./scan-health.mjs";
test("Prada scanner recording six real jobs and no failures reports healthy",()=>{
 assert.deepEqual(scanHealth(6,5,0,0),{status:"healthy",failures:0,successful:true});
});
test("one partial error leaves source degraded with a retry signal",()=>{
 assert.deepEqual(scanHealth(6,4,1,2),{status:"degraded",failures:3,successful:false});
});
test("zero job details does not masquerade as healthy",()=>{
 assert.equal(scanHealth(6,0,0,0).status,"reachable_no_listings");
 assert.equal(scanHealth(0,0,0,0).successful,false);
});
