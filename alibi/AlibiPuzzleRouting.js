export function selectAlibiCandidates(state,caseKey){
 const people=state.caseSuspects||state.suspects||state.suspectList||[];if(state.suspectExclusionState?.[caseKey]?.finished!==true)return [];
 const investigation=state.alibiInvestigation;
 if(investigation?.unlocked===true&&String(investigation.caseKey)===String(caseKey)&&Array.isArray(investigation.suspectIds)){
  const ids=investigation.suspectIds;if(new Set(ids).size!==ids.length)return [];const selected=ids.map(id=>people.find(p=>p.id===id));return selected.some(p=>!p)?[]:selected;
 }
 const excluded=new Set(state.suspectExclusionState[caseKey].manualExclusionIds||[]);
 return people.filter(p=>p?.id&&!excluded.has(p.id)&&(p.deductionState?.eliminated!==true||p.deductionState?.alibiStatus==='confirmed'));
}
export function hasLegacyAlibiProgress(state,caseKey){
 const entry=state.caseData?.alibiCases?.[caseKey];if(entry?.cooperation&&Object.keys(entry.cooperation).length)return true;
 if(entry?.suspects?.some(p=>p.playerConclusion?.locked))return true;
 if(Object.keys(state.alibiAccusations?.[caseKey]||{}).length||Object.keys(state.alibiAccusationDrafts?.[caseKey]||{}).length)return true;
 return !!state.crimeCityEncounterState?.[caseKey]?.some(e=>e.interviewed||e.dialogueCompleted||e.visited);
}
export function usePuzzleAlibi(state,caseKey){if(!caseKey)return false;if(state.caseData?.alibiPuzzles?.[caseKey])return true;return !hasLegacyAlibiProgress(state,caseKey)&&[3,5].includes(selectAlibiCandidates(state,caseKey).length);}
