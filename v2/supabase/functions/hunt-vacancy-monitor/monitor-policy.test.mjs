import test from "node:test";
import assert from "node:assert/strict";
import {shouldTransitionFromConfirmedRemoval as stale} from "./monitor-policy.mjs";
const at="2026-11-17T11:00:00Z";
test("200 HTML lacking job title cannot mark an official posting stale",()=>{
 assert.equal(stale({status:200,priorMissingAt:"2026-11-17T10:00:00Z",observedAt:at,previousState:"active_verified"}),false);
});
test("a single 404 is insufficient and two immediate checks are insufficient",()=>{
 assert.equal(stale({status:404,observedAt:at,previousState:"active_verified"}),false);
 assert.equal(stale({status:404,priorMissingAt:"2026-11-17T10:50:00Z",observedAt:at,previousState:"active_verified"}),false);
});
test("two independently timed definitive 404/410 support stale status",()=>{
 assert.equal(stale({status:404,priorMissingAt:"2026-11-17T10:00:00Z",observedAt:at,previousState:"active_verified"}),true);
 assert.equal(stale({status:410,priorMissingAt:"2026-11-17T10:00:00Z",observedAt:at,previousState:"active_likely"}),true);
});
test("do not repeat transitions or use month-old unverified status",()=>{
 assert.equal(stale({status:410,priorMissingAt:"2026-11-17T10:00:00Z",observedAt:at,previousState:"stale_possible"}),false);
 assert.equal(stale({status:404,priorMissingAt:"2026-10-17T10:00:00Z",observedAt:at,previousState:"active_verified"}),false);
});
