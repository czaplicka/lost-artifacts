import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { THEORY_FIELDS,normalizeTheory,normalizeSkillId,theoryCaseKey,readTheory,getTheoryReadiness,getTheoryCards,getActualIdentityIds,getUsedSkillIds } from '../crimeBoard/CaseTheoryModel.js';
import {getMotiveById} from '../motiveService.js';
import {getOpportunityFacts,evaluateOpportunity} from './OpportunityRules.js';
import {readPuzzleConclusion,hasPuzzleRecord} from '../alibi/AlibiPuzzleCompletion.js';
import {addPuzzleEvidence} from '../alibi/AlibiPuzzleEvidenceProjection.js';
const FILE='systems/CaseTheorySubmission.js',text=key=>__dialogueText(FILE,key),clone=value=>JSON.parse(JSON.stringify(value));
const arr=x=>Array.isArray(x)?x:[],same=(a,b)=>a!=null&&b!=null&&String(a)===String(b),has=(c,t)=>arr(c?.tags).includes(t),nonempty=x=>typeof x==='string'&&x.trim().length>0;
const strings=values=>[...new Set(arr(values).filter(x=>x!=null).map(String))];
const equivalent=(a,b,ids)=>a!=null&&b!=null&&(same(a,b)||ids.includes(String(a))&&ids.includes(String(b)));
const inScope=(v,s)=>!!v&&(v.caseId==null||same(v.caseId,s.currentCaseId))&&(v.campaignId==null||v.campaignId===s._createdAt);
function conclusionCorrect(subject,state){
 const filed=subject?.playerConclusion;if(filed?.locked!==true||!inScope(filed,state)||filed.evaluation?.conclusionCorrect===false)return false;
 if(subject.alibiType==='confirmed')return filed.choice==='__no_liar__';
 return subject.alibiType==='contradicted'&&filed.choice!=='__no_liar__'&&arr(subject.witnesses).some(w=>w?.isLiar===true&&same(w.npcId,filed.choice));
}
export function addTrialEvidence(input,state){
 const data=clone(input||{}),previous=new Map(arr(data.items).filter(Boolean).map(c=>[c.id,c]));
 data.items=arr(data.items).filter(c=>c&&(c.createdByPlayer||!has(c,'trial-evidence')));let index=0;
 const put=(id,label,body,tags,extra={})=>{
  const card={id,type:'evidence',label,body,tag:text('t_71a4dbb8919b90dd2187'),x:1100+(index%2)*230,y:580+Math.floor(index++/2)*210,z:7,rotation:-1.2,pinned:false,fields:[],tags:['trial-evidence',...tags],discovered:true,createdByPlayer:false,editableByPlayer:false,...extra,caseId:state.currentCaseId,campaignId:state._createdAt};
  const old=previous.get(id);if(old&&!old.createdByPlayer)for(const k of ['x','y','z','rotation','pinned'])if(old[k]!==undefined)card[k]=old[k];
  const pos=data.items.findIndex(c=>c.id===id);if(pos>=0){if(!data.items[pos].createdByPlayer)data.items[pos]=card;}else data.items.push(card);
 };
 for(const clue of arr(state.cluesCollected)){
  if(clue?.type!=='motive'||clue.id==null||!inScope(clue,state)||!nonempty(clue.text))continue;
  put(`agency-motive-${encodeURIComponent(clue.id)}`,clue.label||text('t_eaec6ca7694d36fa9a99'),clue.text,['motive-evidence'],{clueId:clue.id,fields:[{key:'Source',value:clue.npcId||text('t_06149ba4730bc7d4973b')}]});
 }
 const key=theoryCaseKey(state),puzzlePresent=hasPuzzleRecord(state,key),puzzle=readPuzzleConclusion(state,{caseKey:key,activeCaseKey:key});
 const investigation=state.caseData?.alibiCases?.[key],alibis=!puzzlePresent&&inScope(investigation,state)?arr(investigation.suspects):[];
 const people=[...arr(state.caseSuspects),...arr(state.suspects),...arr(state.suspectList)],encounters=arr(state.crimeCityEncounterState?.[key]).filter(e=>inScope(e,state));
 for(const alibi of alibis){
  if(!inScope(alibi,state)||alibi.suspectId==null)continue;
  const person=people.find(p=>same(p?.id,alibi.suspectId)),name=person?.publicProfile?.displayName||person?.name||alibi.suspectName||text('t_f5ebb28614ebb0ee63cb');
  for(const witness of arr(alibi.witnesses)){
   if(!witness||witness.npcId==null||!nonempty(witness.statement))continue;
   if(!encounters.some(e=>same(e.npcId,witness.npcId)&&e.interviewed===true&&e.dialogueCompleted===true))continue;
   put(`agency-witness-${encodeURIComponent(key)}-${encodeURIComponent(witness.npcId)}`,`${witness.role||text('t_5464a8914419f3a1a237')} — ${name}`,witness.statement,['alibi-evidence','witness-statement'],{suspectId:alibi.suspectId,clueId:witness.npcId});
  }
  const filed=alibi.playerConclusion;
  if(filed?.locked===true&&inScope(filed,state)&&['confirmed','contradicted'].includes(filed.status))put(`agency-alibi-${encodeURIComponent(key)}-${encodeURIComponent(alibi.suspectId)}`,`${text('t_9595f25d96469fbfed58')}${name}`,`${text('t_2bb78b9a20efd50fd4bf')}${filed.status}${text('t_b3d24121d6b898783085')}`,['alibi-evidence','filed-alibi'],{suspectId:alibi.suspectId,alibiStatus:filed.status,alibiVerified:conclusionCorrect(alibi,state)&&filed.status===alibi.alibiType,clueId:`filed-alibi-${alibi.suspectId}`});
 }
 let result=addPuzzleEvidence(data,state,null);
 if(puzzle){
  // Feed previous generated cards back only to preserve layout. The projector
  // discards their contents and rebuilds facts from the validated conclusion.
  const seeds=[...previous.values()].filter(c=>!c.createdByPlayer&&has(c,'puzzle-alibi')&&!result.items.some(i=>i.id===c.id));
  result=addPuzzleEvidence({...result,links:data.links,items:[...result.items,...seeds]},state,puzzle);
 }
 const validIds=new Set(result.items.map(c=>c.id));result.links=arr(data.links).filter(l=>l&&validIds.has(l.from)&&validIds.has(l.to));return result;
}
export function assessSubmission(submission){
 const theory=normalizeTheory(submission?.theory),solution=submission?.solution||{},ids=strings(solution.identityIds);
 const cardList=arr(submission?.cards).filter(c=>c&&typeof c.id==='string'),cards=new Map(cardList.map(c=>[c.id,c]));
 const duplicateIds=new Set(cardList.filter((c,i)=>cardList.findIndex(o=>o.id===c.id)!==i).map(c=>c.id)),status=v=>v==null?'inconclusive':v?'supported':'contradicted';
 return THEORY_FIELDS.map(([field,label])=>{
  const section=theory.sections[field],referenceIds=arr(section.evidenceIds),attached=referenceIds.map(id=>cards.get(id)).filter(Boolean);
  const sourced=attached.filter(c=>!c.createdByPlayer&&c.discovered!==false&&(submission.caseId==null||c.caseId==null||same(c.caseId,submission.caseId))&&(submission.campaignId==null||c.campaignId==null||c.campaignId===submission.campaignId));
  let answer=null,evidence=null;
  if(field==='identity'){
   if(ids.length)answer=ids.includes(String(section.answerId))&&equivalent(section.answerId,submission.suspectId,ids);
   evidence=sourced.some(c=>c.suspectId!=null&&equivalent(c.suspectId,section.answerId,ids)&&!has(c,'unknown'));
  }else if(field==='motive'){
   if(nonempty(solution.motiveAnswerId))answer=section.answerId===solution.motiveAnswerId;
   evidence=sourced.some(c=>has(c,'motive-evidence')&&strings(solution.motiveEvidenceIds).includes(String(c.clueId)));
  }else if(field==='means'){
   const chosen=[...new Set(arr(section.skillIds).map(normalizeSkillId).filter(Boolean))].sort(),expected=Array.isArray(solution.usedSkills)?[...new Set(solution.usedSkills.map(normalizeSkillId).filter(Boolean))].sort():null;
   if(expected)answer=expected.length>0&&chosen.length>0&&JSON.stringify(chosen)===JSON.stringify(expected);
   evidence=chosen.length>0&&chosen.every(id=>sourced.some(c=>has(c,'hypothesis-skill')&&has(c,'skill-confirmed')&&!has(c,'skill-uncertain')&&normalizeSkillId(String(c.label||'').replace(/\s*\?$/,''))===id||c.sourceObjectId!=null&&strings(solution.skillObjects?.[id]).includes(String(c.sourceObjectId))&&!has(c,'skill-uncertain')&&!has(c,'reconstruction-uncertain')));
  }else if(field==='opportunity'){
   const verdict=evaluateOpportunity(solution.opportunity,section.answerId);answer=verdict==='inconclusive'?null:verdict==='supported';
   if(section.answerId==='false_alibi')evidence=sourced.some(c=>has(c,'filed-alibi')&&c.alibiStatus==='contradicted'&&c.alibiVerified===true&&equivalent(c.suspectId,theory.sections.identity.answerId,ids));
   else if(section.answerId==='security_gap')evidence=sourced.some(c=>strings(solution.securityObjectIds).includes(String(c.sourceObjectId??c.clueId))&&!has(c,'skill-uncertain')&&!has(c,'reconstruction-uncertain'));
   else if(answer!=null)evidence=sourced.some(c=>arr(c.opportunityAnswerIds).includes(section.answerId));
  }
  if(!referenceIds.length||attached.length!==referenceIds.length||sourced.length!==attached.length||referenceIds.some(id=>duplicateIds.has(id))||attached.some(c=>c.isRedHerring===true))evidence=false;
  return {field,label,answerStatus:status(answer),evidenceStatus:status(evidence),answerLabel:submission.answerLabels?.[field]||label,evidenceLabels:attached.map(c=>c.label||text('t_e1a5b05ffd1d4a86ab57'))};
 });
}
export function isFatalSubmission(submission){return assessSubmission(submission).some(r=>r.answerStatus==='contradicted'||r.evidenceStatus==='contradicted');}
export function validSubmission(submission,state,suspectId=null){
 try{
  if(submission?.version!==3||!same(submission.caseId,state.currentCaseId)||submission.campaignId!==state._createdAt||submission.suspectId==null||suspectId!=null&&!same(submission.suspectId,suspectId)||!Array.isArray(submission.cards)||!submission.solution||!submission.answerLabels)return false;
  if(submission.cards.some(c=>!c||typeof c.id!=='string'||!inScope(c,state))||new Set(submission.cards.map(c=>c.id)).size!==submission.cards.length)return false;
  return JSON.stringify(submission.assessment)===JSON.stringify(assessSubmission(submission));
 }catch{return false;}
}
export function getSubmittedTheory(state,suspectId=null){const value=state.caseData?.submittedCaseTheory;return validSubmission(value,state,suspectId)?clone(value):null;}
export function prepareTheorySubmission(state,suspectId){
 if(suspectId==null)throw Error('Select a suspect before submitting the theory.');
 const previous=state.caseData?.submittedCaseTheory;
 if(previous?.version===3){if(!validSubmission(previous,state,suspectId))throw Error('The submitted theory belongs to another suspect, uses older evidence rules or is inconsistent. It was not overwritten. Load a save from before submitting the theory.');return clone(previous);}
 if(previous&&(!same(previous.caseId,state.currentCaseId)||previous.campaignId!==state._createdAt||!same(previous.suspectId,suspectId)))throw Error('The existing submitted theory does not match this arrest.');
 const raw=previous?.theory||readTheory(state),board=addTrialEvidence({items:getTheoryCards(state),links:[]},state),readiness=getTheoryReadiness(state,raw,board.items),motive=getMotiveById(state.caseData?.motiveId),identityIds=getActualIdentityIds(state),usedSkills=getUsedSkillIds(state),claims=arr(state.reconstructedHeist?.claims),skillObjects={};
 for(const claim of claims){const id=normalizeSkillId(claim?.thiefSkill);if(!id||claim?.solutionItemId==null)continue;skillObjects[id]=[...new Set([...arr(skillObjects[id]),String(claim.solutionItemId)])];}
 const theory=readiness.theory;theory.caseId=state.currentCaseId;theory.campaignId=state._createdAt;
 const selected=new Set(THEORY_FIELDS.flatMap(([field])=>theory.sections[field].evidenceIds)),identityCard=board.items.find(c=>same(c.suspectId,theory.sections.identity.answerId)&&!has(c,'unknown'));
 const finalIds=new Set(arr(motive?.escapeInvestigation?.clueStages).filter(s=>s?.boardAnswerUnlocked===true).map(s=>String(s.evidenceId)));
 const motiveEvidenceIds=arr(state.cluesCollected).filter(c=>c?.type==='motive'&&inScope(c,state)&&nonempty(c.text)&&finalIds.has(String(c.id))).map(c=>String(c.id));
 const submission={version:3,caseId:state.currentCaseId,campaignId:state._createdAt,workspaceKey:theoryCaseKey(state),suspectId,theory:clone(theory),cards:clone(board.items.filter(c=>selected.has(c.id))),solution:{identityIds,motiveAnswerId:motive?.crimeBoard?.answerId||null,motiveEvidenceIds:[...new Set(motiveEvidenceIds)],usedSkills,skillObjects,opportunity:getOpportunityFacts(state),securityObjectIds:claims.filter(c=>c?.solutionItemId!=null&&['beat_security','disable_system','create_blind_spot'].includes(c.questionId)).map(c=>String(c.solutionItemId))},answerLabels:{identity:identityCard?.label||text('t_4bf8456b297fe93a1c10'),motive:theory.sections.motive.answerId===motive?.crimeBoard?.answerId?motive.crimeBoard.label:theory.sections.motive.answerId.replaceAll('_',' '),means:theory.sections.means.skillIds.join(', '),opportunity:theory.sections.opportunity.answerId.replaceAll('_',' ')},submittedAt:previous?.submittedAt||new Date().toISOString(),migratedFromLegacy:Boolean(previous)};
 submission.assessment=assessSubmission(submission);const caseData={...(state.caseData||{}),submittedCaseTheory:clone(submission)};
 if(typeof state.updateState==='function')state.updateState({caseData});else state.caseData=caseData;return submission;
}
