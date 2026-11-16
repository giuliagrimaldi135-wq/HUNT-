import test from "node:test";
import assert from "node:assert/strict";
import {selectCatalogRotation,advanceCatalogCursors} from "./catalog-rotation.mjs";
const urls=Array.from({length:8},(_,i)=>`https://jobs.pradagroup.com/go/CATEGORY${i}/4639${i}01/`);
test("cycles through all eight official sections over four runs",()=>{
 let cfg={catalog_urls:urls};
 const seen=[];
 for(let run=0;run<4;run++){
  const next=selectCatalogRotation(cfg);
  seen.push(...next.pages.map(p=>p.index));
  cfg=advanceCatalogCursors(cfg,next.pages,Object.fromEntries(next.pages.map(p=>[p.index,{total:5,selected:5}])),next.nextRotation);
 }
 assert.deepEqual(seen,[0,1,2,3,4,5,6,7]);
});
test("independent per-category cursors do not skip a job in second catalog",()=>{
 const cfg={catalog_urls:urls,catalog_rotation:0,catalog_cursors:{0:5,1:0}};
 const p=selectCatalogRotation(cfg);
 assert.deepEqual(p.pages.map(x=>x.cursor),[5,0]);
 const next=advanceCatalogCursors(cfg,p.pages,{0:{total:6,selected:1},1:{total:9,selected:5}},p.nextRotation);
 assert.equal(next.catalog_cursors[0],0);
 assert.equal(next.catalog_cursors[1],5);
});
test("empty sources and one-category legacy scanners behave safely",()=>{
 assert.equal(selectCatalogRotation({catalog_urls:[]}).pages.length,0);
 const p=selectCatalogRotation({catalog_urls:[urls[0]],catalog_cursor:3});
 assert.equal(p.pages.length,1);assert.equal(p.pages[0].cursor,3);
});
test("a cursor from a shortened category resets cleanly",()=>{
 const cfg={catalog_urls:urls,catalog_cursors:{0:20}};
 const p=selectCatalogRotation(cfg);
 const o=advanceCatalogCursors(cfg,p.pages,{0:{total:4,selected:4}},p.nextRotation);
 assert.equal(o.catalog_cursors[0],0);
});
