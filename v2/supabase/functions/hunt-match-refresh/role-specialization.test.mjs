import test from "node:test";
import assert from "node:assert/strict";
import {supplierRiskNeedsExplicitInterest,fashionSourcingEvidence} from "./role-specialization.mjs";
test("procurement Supplier Risk Analyst is not generic fashion product sourcing",()=>{
 assert.equal(supplierRiskNeedsExplicitInterest("KERING Direct Procurement Supplier Risk Analyst - #1",["product_assortment","numbers_performance","organization_operations"]),true);
 assert.deepEqual(fashionSourcingEvidence("Supplier Risk Analyst","Risk mitigation, due diligence and audit reporting.",["product_assortment"]),[]);
});
test("explicit supplier risk interest is respected",()=>{
 assert.equal(supplierRiskNeedsExplicitInterest("Supplier Risk Analyst",["risk_management"]),false);
 assert.equal(supplierRiskNeedsExplicitInterest("Procurement Compliance Specialist",["compliance_audit"]),false);
});
test("real product and sourcing roles retain their professional evidence",()=>{
 const title="Junior Materials Sourcing Assistant";
 const body="Coordinate manufacturing suppliers and purchase orders, fabrics, collection samples and prototype development.";
 assert.equal(supplierRiskNeedsExplicitInterest(title,[]),false);
 assert.deepEqual(fashionSourcingEvidence(title,body,["product_assortment"]),["sourcing_operations","sourcing_product"]);
});
test("generic procurement job without explicit risk is not automatically blocked",()=>{
 assert.equal(supplierRiskNeedsExplicitInterest("Leather Goods Direct Procurement Manager",[]),false);
});
