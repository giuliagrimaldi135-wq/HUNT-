import test from "node:test";
import assert from "node:assert/strict";
import {linkedCareerTarget as target,acceptedCareerResponse as accepts,verifiedBrandCareerPage as verified,isCareerIntent as career} from "./careers-link-policy.mjs";
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

test("register only verified same-domain HTML careers destinations",()=>{
 const html="<html><head><title>Careers at Alaïa</title></head><body><h1>Open positions</h1></body></html>";
 assert.equal(verified("https://careers.maison-alaia.com/","https://careers.maison-alaia.com/",root,"text/html",html),"https://careers.maison-alaia.com/");
 assert.equal(verified("https://www.maison-alaia.com/pages/careers","https://www.maison-alaia.com/pages/careers",root,"text/html",html),"https://www.maison-alaia.com/pages/careers");
});
test("rejects redirects outside the brand, home pages, and JSON",()=>{
 const home="<html><title>Maison Alaïa Online Store</title><a href='/careers'>Careers</a></html>";
 const linked="https://www.maison-alaia.com/pages/careers";
 assert.equal(verified(linked,"https://careers.unknown-vendor.com/jobs",root,"text/html","<title>Careers</title>"),null);
 assert.equal(verified(linked,root,root,"text/html",home),null);
 assert.equal(verified(linked,linked,root,"application/json",'{"jobs":[]}'),null);
 assert.equal(verified("https://127.0.0.1/jobs","https://127.0.0.1/jobs",root,"text/html","<title>Careers</title>"),null);
});

test("worldwide second-level country-code domains cannot impersonate siblings",()=>{
 const examples=[
  ["brand.co.za","other.co.za"],
  ["brand.com.mx","other.com.mx"],
  ["brand.co.kr","other.co.kr"],
  ["brand.com.ar","other.com.ar"],
  ["brand.co.id","other.co.id"]
 ];
 for(const [ours,theirs] of examples){
  const website="https://"+ours+"/";
  assert.equal(target("https://careers."+ours+"/jobs","Careers",website,website),"https://careers."+ours+"/jobs");
  assert.equal(target("https://careers."+theirs+"/jobs","Careers",website,website),null);
  assert.equal(accepts("https://careers."+theirs+"/jobs",website,[]),false);
 }
 assert.equal(target("https://co.za/jobs","Careers","https://brand.co.za/","https://brand.co.za/"),null);
});

test("multilingual official careers links from world fashion brand websites",()=>{
 const root="https://www.label.com/";
 const examples=[
  ["/karriere","Karriere"],["/recrutement","Nous rejoindre"],
  ["/trabaja-con-nosotros","Empleo"],["/carreiras","Trabalhe conosco"],
  ["/vacatures","Werken bij"],["/kariera","Oferty pracy"],
  ["/recruiting","採用情報"],["/hire","招聘"],["/team","채용 공고"]
 ];
 for(const [href,label] of examples){
  assert.equal(career(label),true,label);
  assert.equal(target(href,label,root,root),"https://www.label.com"+href);
  assert.equal(verified("https://www.label.com"+href,"https://www.label.com"+href,root,"text/html","<title>"+label+"</title>"),"https://www.label.com"+href);
 }
});
test("multilingual hints never override official-domain and content-type safety",()=>{
 const root="https://brand.com/";
 assert.equal(target("https://jobs.otherbrand.com/","採用",root,root),null);
 assert.equal(verified("https://brand.com/karriere","https://jobs.otherbrand.com/",root,"text/html","<h1>Karriere</h1>"),null);
 assert.equal(verified("https://brand.com/vacatures","https://brand.com/vacatures",root,"application/json","<title>Vacatures</title>"),null);
 assert.equal(career("New winter handbags"),false);
});
