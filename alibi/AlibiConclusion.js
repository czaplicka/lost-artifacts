import { gameState } from '../GameData.js';
import { getCaseSuspects } from '../suspects/CaseSuspects.js';
import { saveGameState } from '../gameStatePersistence.js';
import { progressionManager } from '../managers/ProgressionManager.js';
import { allWitnessesVisited, NO_ALIBI_LIAR } from './AlibiEncounterSetup.js';
import { getStoredAlibiSubject, validAlibiTimeline, orderedAlibiTimeline, assessAlibiConclusion } from './AlibiConclusionEvidence.js';
export { getAlibiEvidenceDossier, getAlibiCourtRecord } from './AlibiConclusionEvidence.js';
const FINAL=new Set(['confirmed','contradicted']);
function context(caseKey,suspectId){return {data:getStoredAlibiSubject(caseKey,suspectId),suspect:getCaseSuspects(gameState).find(s=>s.id===suspectId)};}
function publicResult(filed){return {status:filed.status,choice:filed.choice,timelineIds:Array.isArray(filed.timelineIds)?[...filed.timelineIds]:[],locked:true,
  evidenceStatus:filed.evidenceStatus||'legacy_unverified'};}
export function getFiledAlibiConclusion(caseKey,suspectId){
  const {data,suspect}=context(caseKey,suspectId),filed=data?.playerConclusion;
  if(filed?.locked===true&&FINAL.has(filed.status))return publicResult(filed);
  if(FINAL.has(suspect?.deductionState?.alibiStatus))return {status:suspect.deductionState.alibiStatus,locked:true,
    choice:gameState.alibiAccusations?.[caseKey]?.[suspectId]||null,timelineIds:[],evidenceStatus:'legacy_unverified'};
  return null;
}
function grantCompletion(caseKey){
  const subjects=gameState.caseData?.alibiCases?.[caseKey]?.suspects;
  if(!Array.isArray(subjects)||!subjects.length||new Set(subjects.map(s=>s.suspectId)).size!==subjects.length||
    subjects.some(s=>typeof s.suspectId!=='string'||!s.suspectId.trim()||!allWitnessesVisited(caseKey,s.suspectId)||
      !s.playerConclusion?.locked||!FINAL.has(s.playerConclusion.status)||!validAlibiTimeline(s,s.playerConclusion.timelineIds)))
    return {success:false,reason:'alibi_stage_not_finished'};
  if(!['string','number'].includes(typeof caseKey)||(typeof caseKey==='number'&&!Number.isFinite(caseKey)))return {success:false,reason:'missing_case_key'};
  const scope=String(caseKey).trim();if(!scope||scope==='default_case'||scope.length>400)return {success:false,reason:'missing_case_key'};
  try{return progressionManager.grantReward('alibi_completed',scope,'Alibi investigation completed');}
  catch(error){console.error('[AlibiConclusion] XP failed',error);return {success:false,reason:'progression_error'};}
}
export function fileAlibiConclusion(caseKey,suspectId,timelineIds,choice,options={}){
  options=options&&typeof options==='object'?options:{};
  const previous=getFiledAlibiConclusion(caseKey,suspectId);
  if(previous)return {accepted:true,alreadyFiled:true,...previous};
  const {data,suspect}=context(caseKey,suspectId);
  if(!data||!suspect||!Array.isArray(data.witnesses)||data.witnesses.length!==3||new Set(data.witnesses.map(w=>w?.npcId)).size!==3||!allWitnessesVisited(caseKey,suspectId))return {accepted:false,message:'Record all three witness visits before filing.'};
  if(!validAlibiTimeline(data,timelineIds))return {accepted:false,message:'Place each of this subject\'s three cards exactly once.'};
  if(choice!==NO_ALIBI_LIAR&&!data.witnesses.some(w=>w.npcId===choice))return {accepted:false,message:'Select a witness or the no-liar conclusion.'};
  const assessment=assessAlibiConclusion(caseKey,suspectId,timelineIds,choice,options);
  if(!assessment.documented&&options.allowRisky!==true)return {accepted:false,requiresRiskConfirmation:true,
    message:'This conclusion is not fully documented. Confirm explicitly to file it as a risky claim.',riskReasons:[...assessment.reasons]};
  const status=choice===NO_ALIBI_LIAR?'confirmed':'contradicted';
  const timelineCorrect=orderedAlibiTimeline(data,timelineIds);
  const conclusionCorrect=choice===NO_ALIBI_LIAR?data.alibiType==='confirmed':data.witnesses.some(w=>w.npcId===choice&&w.isLiar===true);
  const filed={version:2,locked:true,status,choice,timelineIds:[...timelineIds],filedAt:new Date().toISOString(),
    evidenceStatus:assessment.documented?'documented':'risky',
    evidence:{sources:structuredClone(assessment.sources),comparison:structuredClone(assessment.comparison),
      confirmation:structuredClone(assessment.confirmation),retraction:assessment.retraction||null,
      crimeWindow:structuredClone(data.crimeWindow),riskAccepted:!assessment.documented,riskReasons:[...assessment.reasons],
      timeline:timelineIds.map(id=>{const card=data.boardCards.find(c=>c.id===id),w=data.witnesses.find(w=>w.timelineCard?.id===id);
        const known=assessment.sources.some(r=>r.npcId===w?.npcId);
        return {id,role:card.role||w?.role||'Witness',minute:known&&Number.isInteger(card.minute)?card.minute:null,detailsKnown:known};})},
    evaluation:{timelineCorrect,conclusionCorrect,evidenceSupported:assessment.documented&&timelineCorrect&&conclusionCorrect,
      correct:timelineCorrect&&conclusionCorrect}};
  const oldFiled=data.playerConclusion===undefined?undefined:structuredClone(data.playerConclusion);
  const oldAccusations=gameState.alibiAccusations===undefined?undefined:structuredClone(gameState.alibiAccusations),oldDeduction=suspect.deductionState?structuredClone(suspect.deductionState):undefined;
  data.playerConclusion=filed;gameState.alibiAccusations??={};gameState.alibiAccusations[caseKey]??={};
  const oldChoice=gameState.alibiAccusations[caseKey][suspectId];gameState.alibiAccusations[caseKey][suspectId]=choice;
  suspect.deductionState??={};suspect.deductionState.alibiStatus=status;suspect.deductionState.alibiEvidenceStatus=filed.evidenceStatus;
  // Persist the claim before granting any completion reward.
  try{if(saveGameState()===false)throw new Error('Save rejected');}
  catch(error){if(oldFiled===undefined)delete data.playerConclusion;else data.playerConclusion=oldFiled;
    if(oldDeduction===undefined)delete suspect.deductionState;else suspect.deductionState=oldDeduction;
    if(oldAccusations===undefined)delete gameState.alibiAccusations;
    else gameState.alibiAccusations=oldAccusations;
    console.error('[AlibiConclusion] Filing save failed',error);return {accepted:false,message:'The conclusion could not be saved. Please try again.'};}
  const xpResult=grantCompletion(caseKey);let rewardSaved=true;
  try{if(saveGameState()===false)rewardSaved=false;}catch(error){rewardSaved=false;console.error('[AlibiConclusion] Reward save failed',error);}
  return {accepted:true,alreadyFiled:false,...publicResult(filed),xpResult,rewardSaved};
}
