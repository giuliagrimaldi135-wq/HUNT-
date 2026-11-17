// Vacancy monitoring is evidence about a single posting, never the health
// of a board. An unparseable HTTP 200 is not evidence that a job disappeared.
export function shouldTransitionFromConfirmedRemoval(input) {
  const {status,priorMissingAt,observedAt,previousState}=input||{};
  if(previousState==="stale_possible")return false;
  if(status!==404&&status!==410)return false;
  const earlier=Date.parse(String(priorMissingAt||""));
  const current=Date.parse(String(observedAt||""));
  return Number.isFinite(earlier)&&Number.isFinite(current)
    &&current-earlier>=30*60000&&current-earlier<=14*86400000;
}
