import {
 THEORY_FIELDS,normalizeTheory,normalizeSkillId,theoryCaseKey,readTheory,
 getTheoryReadiness,getTheoryCards,getActualIdentityIds,getUsedSkillIds
} from '../crimeBoard/CaseTheoryModel.js';
import { getMotiveById } from '../motiveService.js';
import { getOpportunityFacts,evaluateOpportunity } from './OpportunityRules.js';
const clone=value=>JSON.parse(JSON.stringify(value));
const arr=value=>Array.isArray(value)?value:[];
const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
const has=(card,tag)=>arr(card.tags).includes(tag);
const equivalent=(a,b,ids)=>same(a,b)||(ids.includes(String(a))&&ids.includes(String(b)));
function alibiKey(state){
 const m=state.currentMission||{},city=state.alibiInvestigation?.cityId||state.caseSuspectCityId||state.crimeCityId||state.crimeCity||m.city||'unknown_city';
 return String(m.id||m.caseId||`${city}_${m.artifact||'default'}`);
}
export function addTrialEvidence(input,state){
 const data=clone(input),old=new Map(arr(data.items).map(card=>[card.id,card]));
 data.items=arr(data.items).filter(card=>card.createdByPlayer||!has(card,'trial-evidence'));
 let index=0;
 const put=(id,label,body,tags,extra={})=>{
  const card={id,type:'evidence',label,body,tag:'Recorded investigation evidence',
   x:1100+(index%2)*230,y:580+Math.floor(index++/2)*210,z:7,rotation:-1.2,pinned:false,
   fields:[],tags:['trial-evidence',...tags],discovered:true,createdByPlayer:false,editableByPlayer:false,...extra};
  const prior=old.get(id);if(prior)for(const key of ['x','y','z','rotation','pinned'])if(prior[key]!==undefined)card[key]=prior[key];
  data.items.push(card);
 };
 for(const clue of arr(state.cluesCollected)){
  if(clue?.type!=='motive'||!clue.id)continue;
  if(clue.caseId!=null&&!same(clue.caseId,state.currentCaseId))continue;
  put(`agency-motive-${encodeURIComponent(clue.id)}`,clue.label||'Recorded motive lead',
   clue.text||`A witness report was recorded: ${clue.label||'Motive lead'}.`,['motive-evidence'],
   {clueId:clue.id,fields:[{key:'Source',value:clue.npcId||'Recorded investigation'}]});
 }
 const key=alibiKey(state),alibis=arr(state.caseData?.alibiCases?.[key]?.suspects);
 const people=[...arr(state.caseSuspects),...arr(state.suspects),...arr(state.suspectList)];
 const encounters=arr(state.crimeCityEncounterState?.[key]);
 for(const alibi of alibis){
  const person=people.find(p=>same(p?.id,alibi.suspectId));
  const name=person?.publicProfile?.displayName||person?.name||alibi.suspectName||'Suspect';
  for(const witness of arr(alibi.witnesses)){
   if(!encounters.some(e=>same(e.npcId,witness.npcId)&&e.interviewed===true&&e.dialogueCompleted===true))continue;
   if(typeof witness.statement!=='string'||!witness.statement.trim())continue;
   put(`agency-witness-${encodeURIComponent(key)}-${encodeURIComponent(witness.npcId)}`,
    `${witness.role||'Witness'} — ${name}`,witness.statement,['alibi-evidence','witness-statement'],
    {suspectId:alibi.suspectId,clueId:witness.npcId});
  }
  const filed=alibi.playerConclusion;
  if(filed?.locked===true&&['confirmed','contradicted'].includes(filed.status)){
   put(`agency-alibi-${encodeURIComponent(key)}-${encodeURIComponent(alibi.suspectId)}`,
    `Alibi report — ${name}`,`Your filed assessment: alibi ${filed.status}. This is your assessment, not automatic confirmation of its correctness.`,
    ['alibi-evidence','filed-alibi'],{suspectId:alibi.suspectId,alibiStatus:filed.status,clueId:`filed-alibi-${alibi.suspectId}`});
  }
 }
 const valid=new Set(data.items.map(c=>c.id));data.links=arr(data.links).filter(l=>valid.has(l.from)&&valid.has(l.to));
 return data;
}
export function assessSubmission(submission){
 const theory=normalizeTheory(submission.theory),solution=submission.solution||{};
 const ids=arr(solution.identityIds),cards=new Map(arr(submission.cards).map(card=>[card.id,card]));
 const status=value=>value==null?'inconclusive':value?'supported':'contradicted';
 const results=[];
 for(const [field,label]of THEORY_FIELDS){
  const section=theory.sections[field];
  const attached=section.evidenceIds.map(id=>cards.get(id)).filter(Boolean);
  const sourced=attached.filter(card=>!card.createdByPlayer&&card.discovered!==false);
  let answer=null,evidence=null;
  if(field==='identity'){
   if(ids.length)answer=ids.includes(String(section.answerId))&&equivalent(section.answerId,submission.suspectId,ids);
   evidence=sourced.some(c=>c.suspectId!=null&&equivalent(c.suspectId,section.answerId,ids)&&!has(c,'unknown'));
  }else if(field==='motive'){
   if(typeof solution.motiveAnswerId==='string'&&solution.motiveAnswerId)answer=section.answerId===solution.motiveAnswerId;
   evidence=sourced.some(c=>has(c,'motive-evidence')&&arr(solution.motiveEvidenceIds).includes(c.clueId));
  }else if(field==='means'){
   if(Array.isArray(solution.usedSkills))answer=JSON.stringify([...section.skillIds].sort())===JSON.stringify([...solution.usedSkills].sort());
   evidence=section.skillIds.every(id=>sourced.some(c=>
    (has(c,'hypothesis-skill')&&has(c,'skill-confirmed')&&normalizeSkillId(String(c.label||'').replace(/\s*\?$/,''))===id)||
    (c.sourceObjectId&&arr(solution.skillObjects?.[id]).includes(String(c.sourceObjectId))&&!has(c,'skill-uncertain'))));
  }else if(field==='opportunity'){
   const verdict=evaluateOpportunity(solution.opportunity,section.answerId);
   answer=verdict==='inconclusive'?null:verdict==='supported';
   if(section.answerId==='false_alibi')evidence=sourced.some(c=>has(c,'filed-alibi')&&c.alibiStatus==='contradicted'&&equivalent(c.suspectId,theory.sections.identity.answerId,ids));
   else if(section.answerId==='security_gap')evidence=sourced.some(c=>arr(solution.securityObjectIds).includes(String(c.sourceObjectId||c.clueId))&&
    !has(c,'skill-uncertain')&&!has(c,'reconstruction-uncertain'));
   else if(answer!=null)evidence=sourced.some(c=>arr(c.opportunityAnswerIds).includes(section.answerId));
  }
  if(attached.some(c=>c.isRedHerring===true))evidence=false;
  results.push({field,label,answerStatus:status(answer),evidenceStatus:status(evidence),
   answerLabel:submission.answerLabels?.[field]||label,
   evidenceLabels:attached.map(c=>c.label||'Attached document')});
 }
 return results;
}
export function isFatalSubmission(submission){
 return assessSubmission(submission).some(row=>row.answerStatus==='contradicted'||row.evidenceStatus==='contradicted');
}
export function validSubmission(submission,state,suspectId=null){
 try{
  if(submission?.version!==3||!same(submission.caseId,state.currentCaseId)||
   submission.campaignId!==state._createdAt||submission.suspectId==null||
   (suspectId!=null&&!same(submission.suspectId,suspectId))||
   !Array.isArray(submission.cards)||!submission.solution||!submission.answerLabels)return false;
  const cards=submission.cards;if(new Set(cards.map(c=>c.id)).size!==cards.length)return false;
  if(!getTheoryReadiness(state,submission.theory,cards).complete)return false;
  return JSON.stringify(submission.assessment)===JSON.stringify(assessSubmission(submission));
 }catch{return false;}
}
export function getSubmittedTheory(state,suspectId=null){
 const value=state.caseData?.submittedCaseTheory;
 return validSubmission(value,state,suspectId)?clone(value):null;
}
export function prepareTheorySubmission(state,suspectId){
 if(suspectId==null)throw new Error('Select a suspect before submitting the theory.');
 const previous=state.caseData?.submittedCaseTheory;
 if(previous?.version===3){
  if(!validSubmission(previous,state,suspectId))throw new Error('The submitted theory belongs to another suspect or is inconsistent. It was not overwritten.');
  return clone(previous);
 }
 if(previous && (!same(previous.caseId,state.currentCaseId)||previous.campaignId!==state._createdAt||!same(previous.suspectId,suspectId)))
  throw new Error('The existing submitted theory does not match this arrest.');
 const raw=previous?.theory||readTheory(state);
 const board=addTrialEvidence({items:getTheoryCards(state),links:[]},state);
 // Persist actually discovered additions so the player can attach them on the board.
 const readiness=getTheoryReadiness(state,raw,board.items);
 if(!readiness.complete)throw new Error('CASE THEORY INCOMPLETE\n'+readiness.missing.join('\n'));
 const motive=getMotiveById(state.caseData?.motiveId),identityIds=getActualIdentityIds(state);
 const usedSkills=getUsedSkillIds(state),claims=arr(state.reconstructedHeist?.claims),skillObjects={};
 for(const claim of claims){
  const id=normalizeSkillId(claim?.thiefSkill);if(!id||!claim.solutionItemId)continue;
  skillObjects[id]=[...(skillObjects[id]||[]),String(claim.solutionItemId)];
 }
 const theory=readiness.theory;theory.caseId=state.currentCaseId;theory.campaignId=state._createdAt;
 const selected=new Set(THEORY_FIELDS.flatMap(([field])=>theory.sections[field].evidenceIds));
 const identityCard=board.items.find(c=>same(c.suspectId,theory.sections.identity.answerId)&&!has(c,'unknown'));
 const submission={version:3,caseId:state.currentCaseId,campaignId:state._createdAt,
  workspaceKey:theoryCaseKey(state),suspectId,theory:clone(theory),
  cards:clone(board.items.filter(c=>selected.has(c.id))),
  solution:{identityIds,motiveAnswerId:motive?.crimeBoard?.answerId||null,
   motiveEvidenceIds:arr(motive?.escapeInvestigation?.clueStages).map(s=>s.evidenceId),
   usedSkills,skillObjects,opportunity:getOpportunityFacts(state),
   securityObjectIds:claims.filter(c=>['beat_security','disable_system','create_blind_spot'].includes(c.questionId)).map(c=>String(c.solutionItemId))},
  answerLabels:{identity:identityCard?.label||'Selected identity',
   motive:theory.sections.motive.answerId===motive?.crimeBoard?.answerId?motive.crimeBoard.label:theory.sections.motive.answerId.replaceAll('_',' '),
   means:theory.sections.means.skillIds.join(', '),
   opportunity:theory.sections.opportunity.answerId.replaceAll('_',' ')},
  submittedAt:previous?.submittedAt||new Date().toISOString(),migratedFromLegacy:Boolean(previous)};
 submission.assessment=assessSubmission(submission);
 const caseData={...(state.caseData||{}),submittedCaseTheory:clone(submission)};
 if(typeof state.updateState==='function')state.updateState({caseData});else state.caseData=caseData;
 return submission;
}
