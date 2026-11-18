// CourtScene / EnterChaseScene compatibility facade.
import * as legacy from './courtRapportLegacy.js';
import { buildCourtFacts as buildBaseFacts } from './courtLogic.js';
import { readTheory,theoryCaseKey,getTheoryCards,getActualIdentityIds,getUsedSkillIds,normalizeSkillId } from '../crimeBoard/CaseTheoryModel.js';
import { getOpportunityFacts,evaluateOpportunity } from './OpportunityRules.js';
import { getBoardEvidenceRecord } from '../crimeBoard/BoardEvidenceModel.js';
import { getApartmentIdentityContext,getKnownApartmentIdentityClues } from '../scenes/apartament/ApartmentIdentityEvidence.js';
import { getMotiveById } from '../motiveService.js';
import { getEffectiveStats } from '../ui/characterCreation/CharacterCreationData.js';
import { assessSubmission } from './CaseTheorySubmission.js';
import { FINAL_COURT_CONFIG,assembleFinalCourtFacts } from './FinalCaseCourt.js';
import { attachAlibiCourtAssessment,createAlibiCourtRecord,answerAlibiCourtQuestion,advanceAlibiCourt,validAlibiCourt } from './AlibiCourtEvidence.js';
export const COURT_CONFIG=FINAL_COURT_CONFIG;
const list=v=>Array.isArray(v)?v:[];
const sameId=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
const hasText=v=>typeof v==='string'&&v.trim().length>0;
const inScope=(v,state)=>!!v&&(v.caseId==null||sameId(v.caseId,state.currentCaseId))&&(v.campaignId==null||v.campaignId===state._createdAt);
const FIELDS=['identity','motive','means','opportunity'];
const LABELS={identity:'Identity',motive:'Motive',means:'Means',opportunity:'Opportunity'};
function buildEvidenceSolution(state,motive,actualIds,usedSkills,opportunity){
 const claims=list(state.reconstructedHeist?.claims),skillObjects={};
 for(const claim of claims){const id=normalizeSkillId(claim?.thiefSkill);if(!id||claim?.solutionItemId==null)continue;skillObjects[id]=[...new Set([...list(skillObjects[id]),String(claim.solutionItemId)])];}
 const finalIds=new Set(list(motive?.escapeInvestigation?.clueStages).filter(s=>s?.boardAnswerUnlocked===true&&s.evidenceId!=null).map(s=>String(s.evidenceId)));
 const collectedIds=list(state.cluesCollected).filter(c=>c?.type==='motive'&&inScope(c,state)&&hasText(c.text)&&finalIds.has(String(c.id))).map(c=>String(c.id));
 const reportIds=Object.values(state.caseData?.motiveWitnessReports||{}).filter(r=>r?.version===1&&sameId(r.caseId,state.currentCaseId)&&r.campaignId===state._createdAt&&r.motiveId===motive?.id&&hasText(r.text)&&finalIds.has(String(r.evidenceId))).map(r=>String(r.evidenceId));
 return {identityIds:actualIds,motiveAnswerId:motive?.crimeBoard?.answerId||null,motiveEvidenceIds:[...new Set([...collectedIds,...reportIds])],usedSkills,skillObjects,opportunity,
  securityObjectIds:claims.filter(c=>c?.solutionItemId!=null&&['beat_security','disable_system','create_blind_spot'].includes(c.questionId)).map(c=>String(c.solutionItemId))};
}
export function applyCourtEvidenceAssessment(facts,assessment){
 const a=facts?.caseAssessment;if(!a||!Array.isArray(a.failures))throw new Error('Cannot validate court evidence: the case assessment is missing.');
 if(!Array.isArray(assessment)||assessment.length!==FIELDS.length||FIELDS.some(f=>assessment.filter(r=>r?.field===f).length!==1))throw new Error('Cannot validate court evidence: an assessment of all four pillars is required.');
 const statuses=new Set(['supported','contradicted','inconclusive']);for(const row of assessment)if(!statuses.has(row.answerStatus)||!statuses.has(row.evidenceStatus))throw new Error('Cannot validate court evidence: invalid assessment status.');
 const failures=a.failures.map(f=>({...f})),add=(key,message)=>{if(!failures.some(f=>f.key===key))failures.push({key,message});};
 for(const row of assessment){const label=LABELS[row.field];
  if(row.answerStatus!=='supported')add(`semantic_answer_${row.field}`,row.answerStatus==='contradicted'?`${label}: the filed conclusion contradicts the case evidence.`:`${label}: the filed conclusion has not been established.`);
  if(row.evidenceStatus!=='supported')add(`references_${row.field}`,row.evidenceStatus==='contradicted'?`${label}: the attached evidence does not support the filed conclusion.`:`${label}: the attached evidence is insufficient to establish the conclusion.`);
 }
 return {...facts,caseAssessment:{...a,evidenceAssessmentVersion:1,evidenceAssessment:assessment.map(row=>({field:row.field,answerStatus:row.answerStatus,evidenceStatus:row.evidenceStatus,evidenceLabels:[...list(row.evidenceLabels)]})),failures}};
}
export function buildCourtFacts(state,suspectId){
 const baseFacts=buildBaseFacts(state,suspectId),theory=readTheory(state),identityContext=getApartmentIdentityContext(state);
 const selectedMotive=getMotiveById(theory.sections.motive.answerId),motive=getMotiveById(state.caseData?.motiveId);
 const stats=getEffectiveStats({profile:state.detectiveProfile||'analyst',stats:state.detectiveStats||{}}),actualIds=getActualIdentityIds(state),usedSkills=getUsedSkillIds(state),opportunity=getOpportunityFacts(state),cards=getTheoryCards(state);
 const facts=assembleFinalCourtFacts(state,suspectId,{baseFacts,theory,theoryKey:theoryCaseKey(state),actualIds,
  actualDatabaseId:identityContext?.actualId??state.actualCriminalId??state.currentThiefId??state.currentThief?.id,usedSkills,
  opportunityStatus:evaluateOpportunity(opportunity,theory.sections.opportunity.answerId),motive,
  motiveLabel:selectedMotive?.crimeBoard?.label||theory.sections.motive.answerId.replace(/_/g,' '),boardRecord:getBoardEvidenceRecord(state),identityContext,identityClues:getKnownApartmentIdentityClues(state),cards,rapport:stats.rapport});
 const assessment=assessSubmission({suspectId,theory:facts.finalTheory,cards:list(cards).filter(c=>c&&inScope(c,state)),solution:buildEvidenceSolution(state,motive,actualIds,usedSkills,opportunity)});
 return attachAlibiCourtAssessment(applyCourtEvidenceAssessment(facts,assessment),state,{theoryKey:theoryCaseKey(state),aliasId:identityContext?.caseId,actualIds});
}
export function createCourtRecord(facts){if(facts?.courtMode==='case-theory-v3')return createAlibiCourtRecord(facts);if(facts?.courtMode!==undefined)throw new Error('Unsupported saved court mode.');return legacy.createCourtRecord(facts);}
export function answerCourtQuestion(record,index){return record?.version===3?answerAlibiCourtQuestion(record,index):legacy.answerCourtQuestion(record,index);}
export function advanceCourt(record){return record?.version===3?advanceAlibiCourt(record):legacy.advanceCourt(record);}
export function validCourt(record,state,suspectId=null){return record?.version===3?validAlibiCourt(record,state,suspectId):legacy.validCourt(record,state,suspectId);}
