import test from "node:test";
import assert from "node:assert/strict";
import {reviewStatus,invalidVacancyStatus,reviewFailureReason} from "./review-status.mjs";
const statuses=new Set(["discovered","parsing","promoted","skipped_old","needs_review","rejected"]);
test("terminal invalid candidates use only schema-approved statuses",()=>{
 assert.equal(invalidVacancyStatus(),"rejected");
 assert.ok(statuses.has(invalidVacancyStatus()));
});
test("two failed official-data retries are bounded and rejected with reason",()=>{
 assert.equal(reviewStatus(1),"needs_review");
 assert.equal(reviewStatus(2),"rejected");
 assert.ok(statuses.has(reviewStatus(2)));
 assert.equal(reviewFailureReason(2),"review_exhausted_missing_official_job_facts");
});
