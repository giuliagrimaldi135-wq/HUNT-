export function scanHealth(listed,checked,failures,previousFailures=0) {
 const missing=!(Number.isFinite(listed)&&listed>=0&&Number.isFinite(checked)&&checked>=0);
 const error=missing||!Number.isFinite(failures)||failures>0;
 const empty=listed===0||checked===0;
 const status=error?"degraded":empty?"reachable_no_listings":"healthy";
 return {
  status,
  failures:status==="degraded"?Math.min(999,Math.max(0,previousFailures)+1):0,
  successful:status==="healthy"
 };
}
