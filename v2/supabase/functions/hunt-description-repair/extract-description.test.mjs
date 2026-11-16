import test from "node:test";
import assert from "node:assert/strict";
import {extractOfficialDescription} from "./extract-description.mjs";
const text="You will support merchandising planning and analyze product assortment performance. ".repeat(9);
test("reads substantiated structured job description tied to target role",()=>{
 const html='<script type="application/ld+json">'+JSON.stringify({"@type":"JobPosting",title:"Retail Merchandising Intern",identifier:{value:"JR123"},description:"<p>"+text+"</p>"})+"</script>";
 const r=extractOfficialDescription(html,"Retail Merchandising Intern","JR123");
 assert.equal(r?.method,"jobposting_jsonld");assert.ok(r.description.includes("product assortment"));
});
test("rejects another vacancy description from a listing page",()=>{
 const html='<script type="application/ld+json">'+JSON.stringify({"@type":"JobPosting",title:"Software Engineer",description:text})+"</script>";
 assert.equal(extractOfficialDescription(html,"Retail Merchandising Intern"),null);
});
test("only uses a targeted job section on page with a matching title",()=>{
 const html="<h1>Retail Merchandising Intern</h1><main class='job-description'><h2>Responsibilities</h2><p>"+text+"</p></main>";
 const r=extractOfficialDescription(html,"Retail Merchandising Intern");assert.equal(r?.method,"verified_job_section");
});
test("rejects entire navigation text and a job page with no explicit job section",()=>{
 const html="<h1>Retail Merchandising Intern</h1><main><nav>"+("Shop Bags Accessories Store Locator ".repeat(30))+"</nav></main>";
 assert.equal(extractOfficialDescription(html,"Retail Merchandising Intern"),null);
});
test("does not hallucinate details when only headline is available",()=>{
 assert.equal(extractOfficialDescription("<h1>Buying Intern</h1>","Buying Intern"),null);
});

test("removes sharing/navigation and group footer from verified employer job article",()=>{
 const body="Key Responsibilities. "+("Manage assortment planning, reporting and coordination of sales performance. ".repeat(10));
 const html="<h1>Retail Merchandising Intern</h1><main class='job-description'>Open sharing options . Apply Now . Reference code: JR123. "+body+" Learn more . Richemont is the owner of prestigious Maisons.</main>";
 const found=extractOfficialDescription(html,"Retail Merchandising Intern","JR123");
 assert.equal(found?.method,"verified_job_section");
 assert.ok(found.description.startsWith("Key Responsibilities"));
 assert.ok(!found.description.includes("Open sharing options"));
 assert.ok(!found.description.includes("Richemont is the owner of prestigious Maisons"));
});
