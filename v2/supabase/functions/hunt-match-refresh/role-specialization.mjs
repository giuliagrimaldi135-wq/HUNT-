// Distinguish fashion product/supplier operations from specialist regulatory
// and supplier-risk analysis. A broad "Production & Sourcing" preference alone
// does not establish interest or prior evidence for risk/compliance positions.
export function supplierRiskNeedsExplicitInterest(title,interests=[]){
 const role=String(title||"").toLowerCase();
 const supplierRisk=/(?:supplier|vendor|procurement|sourcing).{0,40}\b(?:risk|compliance|due diligence)\b|\b(?:supplier|vendor)\s+risk\s+analyst\b/.test(role);
 if(!supplierRisk)return false;
 const chosen=new Set(Array.isArray(interests)?interests:[]);
 return !chosen.has("supplier_risk")&&!chosen.has("risk_management")&&!chosen.has("compliance_audit");
}
export function fashionSourcingEvidence(title,description,interests=[]){
 const content=(String(title||"")+" "+String(description||"")).toLowerCase();
 const chosen=new Set(Array.isArray(interests)?interests:[]);
 const out=[];
 if(/\b(?:supplier sourcing|product sourcing|material sourcing|manufacturing|production planning|production coordination|supply base|vendor management|purchase orders?|supplier relationship|fabric sourcing|quality control)\b/.test(content))
   out.push("sourcing_operations");
 if(chosen.has("product_assortment")&&
   /\b(?:fabric|textile|garment|leather goods|collection|product development|prototype|sample development|material development|ready.to.wear|sneakers|footwear)\b/.test(content))
   out.push("sourcing_product");
 return out;
}
