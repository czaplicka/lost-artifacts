const OPPORTUNITY_IDS=new Set(['work_access','unobserved_interval','false_alibi','borrowed_access','security_gap','public_access']);
const SECURITY_QUESTIONS=new Set(['beat_security','disable_system','create_blind_spot']);
const list=x=>Array.isArray(x)?x:[],sameId=(a,b)=>a!=null&&b!=null&&String(a)===String(b),own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
function getActualIdentityIds(state){
 const canonical=[state.actualCriminalId,state.currentThiefId,state.currentThief?.id].filter(x=>x!=null).map(String);if(new Set(canonical).size>1)return [];
 return [...new Set([...canonical,state.trueThiefCaseSuspectId,state.realThiefSuspectId,state.caseData?.trueThiefCaseSuspectId,state.caseData?.realThiefSuspectId,state.currentThiefCaseSuspectId,state.currentThief?.caseSuspectId].filter(x=>x!=null).map(String))];
}
function getTheoryCaseKey(state){const m=state.currentMission||{};return String(m.id??m.caseId??m.caseIndex??`${state.caseSuspectCityId??state.crimeCityId??state.crimeCity??m.city??'unknown'}_${m.artifactKey??m.artifact??'default'}`);}
function belongsToCurrentCase(record,state){return !!record&&typeof record==='object'&&(record.caseId==null||sameId(record.caseId,state.currentCaseId))&&(record.campaignId==null||record.campaignId===state._createdAt);}
function isPuzzleCase(state,key){return own(state.caseData?.alibiPuzzles,key)||own(state.caseData?.alibiPuzzleConclusions,key);}
function getCulpritAlibi(state){
 const ids=new Set(getActualIdentityIds(state));if(!ids.size)return null;
 const key=getTheoryCaseKey(state);if(isPuzzleCase(state,key))return null;
 const investigation=state.caseData?.alibiCases?.[key];if(!belongsToCurrentCase(investigation,state))return null;
 const matches=list(investigation.suspects).filter(s=>ids.has(String(s?.suspectId)));return matches.length===1?matches[0]:null;
}
function hasCorrectFiledConclusion(subject,state){
 const c=subject?.playerConclusion;if(c?.locked!==true||!belongsToCurrentCase(c,state)||c.evaluation?.conclusionCorrect===false)return false;
 if(subject.alibiType==='confirmed')return c.choice==='__no_liar__';
 if(subject.alibiType!=='contradicted'||c.choice==null||c.choice==='__no_liar__')return false;
 return list(subject.witnesses).some(w=>w?.isLiar===true&&sameId(w.npcId,c.choice));
}
function getExplicitSolution(state){const raw=state.caseData?.caseTheorySolution?.opportunityIds;return Array.isArray(raw)&&raw.length>0&&raw.every(id=>OPPORTUNITY_IDS.has(id))?[...new Set(raw)]:null;}
export function getOpportunityFacts(state={}){
 const explicit=getExplicitSolution(state),supported=new Set(),contradicted=new Set();
 if(explicit){for(const id of explicit)supported.add(id);for(const id of OPPORTUNITY_IDS)if(!supported.has(id))contradicted.add(id);}
 else if(list(state.reconstructedHeist?.claims).some(c=>SECURITY_QUESTIONS.has(c?.questionId)))supported.add('security_gap');
 supported.delete('false_alibi');
 const culprit=getCulpritAlibi(state);
 if(culprit?.alibiType==='confirmed')contradicted.add('false_alibi');
 else if(culprit?.alibiType==='contradicted'&&hasCorrectFiledConclusion(culprit,state)&&(!explicit||explicit.includes('false_alibi'))){supported.add('false_alibi');contradicted.delete('false_alibi');}
 return {exhaustive:false,supported:[...supported].sort(),contradicted:[...contradicted].sort()};
}
export function evaluateOpportunity(facts,answerId){
 if(!OPPORTUNITY_IDS.has(answerId))return 'contradicted';if(list(facts?.contradicted).includes(answerId))return 'contradicted';if(list(facts?.supported).includes(answerId))return 'supported';return facts?.exhaustive===true?'contradicted':'inconclusive';
}
// Diagnostic only: neither changes the case nor invents evidence.
export function auditOpportunityState(state={}){
 const facts=getOpportunityFacts(state),claims=list(state.reconstructedHeist?.claims),key=getTheoryCaseKey(state),warnings=[];
 if(!facts.supported.length)warnings.push('No opportunity answer is currently supported by these rules.');
 const ids=claims.filter(c=>SECURITY_QUESTIONS.has(c?.questionId)&&c.solutionItemId!=null).map(c=>String(c.solutionItemId));
 if(facts.supported.includes('security_gap')&&!ids.length)warnings.push('Security gap is supported, but no security solution item is recorded.');
 if(isPuzzleCase(state,key)&&getExplicitSolution(state)?.includes('false_alibi'))warnings.push('Explicit solution includes false_alibi, but this case uses the puzzle alibi path.');
 return {caseKey:key,puzzlePath:isPuzzleCase(state,key),facts,securityObjectIds:[...new Set(ids)],warnings};
}
