const ids = state => [...new Set([
  state.actualCriminalId, state.currentThiefId, state.currentThief?.id,
  state.trueThiefCaseSuspectId,state.realThiefSuspectId,
  state.caseData?.trueThiefCaseSuspectId,state.caseData?.realThiefSuspectId,
  state.currentThiefCaseSuspectId,state.currentThief?.caseSuspectId
].filter(value=>value!=null).map(String))];
export function getOpportunityFacts(state) {
  const explicit=state.caseData?.caseTheorySolution?.opportunityIds;
  const allowed=new Set(['work_access','unobserved_interval','false_alibi','borrowed_access','security_gap','public_access']);
  if(Array.isArray(explicit) && explicit.length && explicit.every(id=>allowed.has(id))) return {
    exhaustive:true,supported:[...new Set(explicit.filter(x=>typeof x==='string'))],contradicted:[]
  };
  const supported=new Set(),contradicted=new Set();
  const claims=Array.isArray(state.reconstructedHeist?.claims)?state.reconstructedHeist.claims:[];
  if(claims.some(claim=>['beat_security','disable_system','create_blind_spot'].includes(claim?.questionId)))supported.add('security_gap');
  const mission=state.currentMission || {};
  const city=state.alibiInvestigation?.cityId || state.caseSuspectCityId || state.crimeCityId || state.crimeCity || mission.city || 'unknown_city';
  const key=String(mission.id || mission.caseId || `${city}_${mission.artifact || 'default'}`);
  const actual=new Set(ids(state));
  const canonical=state.caseData?.alibiCases?.[key]?.suspects?.filter(entry=>actual.has(String(entry?.suspectId))) || [];
  if(canonical.length===1) {
    const alibi=canonical[0];
    if(alibi.alibiType==='contradicted' && alibi.witnesses?.some(w=>w.isLiar===true))supported.add('false_alibi');
    if(alibi.alibiType==='confirmed')contradicted.add('false_alibi');
  }
  return {exhaustive:false,supported:[...supported].sort(),contradicted:[...contradicted].sort()};
}
export function evaluateOpportunity(facts,answerId) {
  if(facts?.supported?.includes(answerId))return 'supported';
  if(facts?.contradicted?.includes(answerId) || facts?.exhaustive===true)return 'contradicted';
  return 'inconclusive';
}
