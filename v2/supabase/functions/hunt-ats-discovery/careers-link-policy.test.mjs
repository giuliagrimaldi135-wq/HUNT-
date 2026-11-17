import test from "node:test";
import assert from "node:assert/strict";
import {linkedCareerTarget as target,acceptedCareerResponse as accepts} from "./careers-link-policy.mjs";
const root="https://www.maison-alaia.com/";
test("official brand job subdomain is traversed even if it is a different origin",()=>{
 assert.equal(target("https://careers.maison-alaia.com/","Opportunities",root,root),"https://careers.maison-alaia.com/");
 assert.equal(target("/pages/careers","Join our team",root,root),"https://www.maison-alaia.com/pages/careers");
});
test("safe same-registrable-domain logic supports co.uk, not arbitrary sites",()=>{
 assert.equal(target("https://careers.brand.co.uk/","Careers","https://brand.co.uk/","https://brand.co.uk/"),"https://careers.brand.co.uk/");
 assert.equal(target("https://jobs.other.co.uk/","Careers","https://brand.co.uk/","https://brand.co.uk/"),null);
 assert.equal(target("https://careers.other.com/","Join us",root,root),null);
});
test("no unsafe internal, non-HTTPS, credential or third-party career pages",()=>{
 for(const url of ["http://careers.maison-alaia.com/","https://admin:secret@careers.maison-alaia.com/","https://127.0.0.1/jobs","https://localhost/jobs"])
 assert.equal(target(url,"Careers",root,root),null,url);
});
test("external redirects must reach a supported ATS host, never arbitrary origin",()=>{
 assert.equal(accepts("https://jobs.lever.co/brand","https://brand.com",["jobs.lever.co"]),true);
 assert.equal(accepts("https://careers.brand.com/jobs","https://brand.com",[]),true);
 assert.equal(accepts("https://bad.example/jobs","https://brand.com",[]),false);
 assert.equal(accepts("http://jobs.lever.co/brand","https://brand.com",["jobs.lever.co"]),false);
});
