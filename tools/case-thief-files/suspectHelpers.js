import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { gameState } from '../GameData.js';
import { shuffle } from './suspectGeneratorUtils.js';
import { getExistingCaseSuspects,resolveCaseThiefIdentity } from './CaseThiefIdentity.js';
export function getCaseThiefSuspectId(state=gameState,allSuspects=getExistingCaseSuspects(state)){
  return resolveCaseThiefIdentity(state,allSuspects).id;
}
function validId(id){return typeof id==='string'&&id.trim().length>0;}
function isValidSuspect(person){return person&&typeof person==='object'&&validId(person.id);}
function assertLineupCondition(condition,message){if(condition)return;const error=Error(`[suspectHelpers] ${message}`);error.code='INVALID_SUSPECT_LINEUP';throw error;}
const t=key=>__dialogueText('suspects/suspectHelpers.js',key);
// Omitted thiefId resolves a CASE identity. Explicit thiefId must use the same
// namespace as allSuspects; the existing Wanted Database finale relies on this.
export function getRandomSuspectLineup(allSuspects=[],thiefId=undefined,lineupSize=5){
  assertLineupCondition(Array.isArray(allSuspects),t('t_5826780b37804660dcb6'));
  assertLineupCondition(Number.isInteger(lineupSize)&&lineupSize>=2,t('t_e23521133532036e5914'));
  if(thiefId===undefined)thiefId=getCaseThiefSuspectId(gameState,allSuspects);
  assertLineupCondition(validId(thiefId),t('t_1196dc32bcfd6b92fcff'));
  const people=allSuspects.filter(isValidSuspect);
  assertLineupCondition(new Set(people.map(p=>p.id)).size===people.length,'The lineup pool contains duplicate suspect IDs.');
  assertLineupCondition(people.length>=lineupSize,`${t('t_7fe0149529d0312f492e')}${lineupSize}${t('t_bc3d70c98fb201e048d8')}`);
  const real=people.find(p=>p.id===thiefId);
  // Keep private culprit IDs out of automatic diagnostic output.
  assertLineupCondition(Boolean(real),'The resolved suspect is not present in the lineup pool.');
  const decoys=people.filter(p=>p.id!==thiefId);
  assertLineupCondition(decoys.length>=lineupSize-1,`${t('t_7fe0149529d0312f492e')}${lineupSize-1}${t('t_6c58469b988b9a3c4cad')}`);
  return shuffle([real,...shuffle(decoys).slice(0,lineupSize-1)]);
}
export function isCorrectSuspectChoice(selectedSuspectId,thiefId=undefined){
  if(!validId(selectedSuspectId))return false;
  if(thiefId===undefined){
    const resolution=resolveCaseThiefIdentity(gameState);
    if(!resolution.id){const error=Error('Cannot assess the selection: the case culprit identity is missing or ambiguous.');error.code='CASE_THIEF_ID_UNRESOLVED';error.reason=resolution.status;throw error;}
    thiefId=resolution.id;
  }
  return validId(thiefId)&&selectedSuspectId===thiefId;
}
export function getSuspectImageKey(suspect){
  if(!suspect||typeof suspect!=='object')return null;
  return suspect.suspectImageKey||suspect.publicProfile?.suspectImageKey||suspect.publicProfile?.imageKey||suspect.publicProfile?.portraitKey||suspect.image||suspect.portraitKey||null;
}
export function getSuspectById(allSuspects=[],suspectId=null){if(!Array.isArray(allSuspects)||!suspectId)return null;return allSuspects.find(s=>s?.id===suspectId)||null;}
// Explicit diagnostic API only: this function does not log anything itself.
export function getSuspectLineupDebugData(allSuspects=getExistingCaseSuspects(gameState)){
  const caseThiefId=getCaseThiefSuspectId(gameState,allSuspects);
  return Array.isArray(allSuspects)?allSuspects.map(s=>({id:s?.id||null,name:s?.name||null,isRealThief:s?.isRealThief===true,isCaseThief:caseThiefId!==null&&s?.id===caseThiefId,eliminated:s?.deductionState?.eliminated===true,imageKey:getSuspectImageKey(s)})):[];
}
