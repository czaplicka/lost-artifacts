// Compatibility facade used by CourtScene and EnterChaseScene.
import * as legacy from './courtRapportLegacy.js';
import { buildCourtFacts as buildBaseFacts } from './courtLogic.js';
import { readTheory,theoryCaseKey,getTheoryCards,getActualIdentityIds,getUsedSkillIds } from '../crimeBoard/CaseTheoryModel.js';
import { getOpportunityFacts,evaluateOpportunity } from './OpportunityRules.js';
import { getBoardEvidenceRecord } from '../crimeBoard/BoardEvidenceModel.js';
import { getApartmentIdentityContext,getKnownApartmentIdentityClues } from '../scenes/apartament/ApartmentIdentityEvidence.js';
import { getMotiveById } from '../motiveService.js';
import { getEffectiveStats } from '../ui/characterCreation/CharacterCreationData.js';
import { FINAL_COURT_CONFIG,assembleFinalCourtFacts,createFinalCourtRecord,answerFinalCourtQuestion,advanceFinalCourt,validFinalCourt } from './FinalCaseCourt.js';
export const COURT_CONFIG=FINAL_COURT_CONFIG;
export function buildCourtFacts(state,suspectId){
 const baseFacts=buildBaseFacts(state,suspectId),theory=readTheory(state),identityContext=getApartmentIdentityContext(state);
 const selectedMotive=getMotiveById(theory.sections.motive.answerId);
 const stats=getEffectiveStats({profile:state.detectiveProfile||'analyst',stats:state.detectiveStats||{}});
 return assembleFinalCourtFacts(state,suspectId,{baseFacts,theory,theoryKey:theoryCaseKey(state),
  actualIds:getActualIdentityIds(state),actualDatabaseId:identityContext?.actualId??state.actualCriminalId??state.currentThiefId??state.currentThief?.id,
  usedSkills:getUsedSkillIds(state),opportunityStatus:evaluateOpportunity(getOpportunityFacts(state),theory.sections.opportunity.answerId),
  motive:getMotiveById(state.caseData?.motiveId),motiveLabel:selectedMotive?.crimeBoard?.label||theory.sections.motive.answerId.replace(/_/g,' '),
  boardRecord:getBoardEvidenceRecord(state),identityContext,identityClues:getKnownApartmentIdentityClues(state),cards:getTheoryCards(state),rapport:stats.rapport});
}
export function createCourtRecord(facts){
 if(facts?.courtMode==='case-theory-v3')return createFinalCourtRecord(facts);
 if(facts?.courtMode!==undefined)throw new Error('Unsupported saved court mode.');
 return legacy.createCourtRecord(facts);
}
export function answerCourtQuestion(record,index){return record?.version===3?answerFinalCourtQuestion(record,index):legacy.answerCourtQuestion(record,index);}
export function advanceCourt(record){return record?.version===3?advanceFinalCourt(record):legacy.advanceCourt(record);}
export function validCourt(record,state,suspectId=null){return record?.version===3?validFinalCourt(record,state,suspectId):legacy.validCourt(record,state,suspectId);}