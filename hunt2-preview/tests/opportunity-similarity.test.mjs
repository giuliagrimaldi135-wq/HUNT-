import {test} from "node:test";import assert from "node:assert/strict";
import {similarityAssessment,findSimilarOpportunities} from "../opportunity-similarity.js";
const target={id:"a",canonical_title:"Retail Merchandising Intern",role_family:"Merchandising",seniority:"internship"};
test("Do not offer buying, facilities or senior jobs as similar to junior merchandising",()=>{
 const choices=[
  {id:"b",canonical_title:"Retail Merchandising Internship",role_family:"Merchandising",seniority:"internship",match_score:71},
  {id:"c",canonical_title:"Senior Merchandising Manager",role_family:"Merchandising",seniority:"senior_manager",match_score:98},
  {id:"d",canonical_title:"Junior Buying Assistant",role_family:"Buying",seniority:"assistant",match_score:95},
  {id:"e",canonical_title:"Facility Manager",role_family:"Retail & Retail Operations",seniority:"manager",match_score:99},
  {id:"f",canonical_title:"Wholesale Intern",role_family:"Merchandising",seniority:"internship",match_score:99},
 ];
 const result=findSimilarOpportunities(target,choices);
 assert.deepEqual(result.map(x=>x.id),["b"]);
 assert.equal(similarityAssessment(target,choices[1]).reason,"seniority_mismatch");
});
test("Do not label offers as similar just because they have a high personal match",()=>{
 assert.equal(similarityAssessment(target,{id:"b",canonical_title:"Marketing Intern",role_family:"Merchandising",match_score:100}).similar,false);
});
