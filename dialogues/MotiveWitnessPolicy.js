import { getMotiveById,getWitnessClue,getClueText } from '../motiveService.js';
import { getPursuitCityContext,normalizePursuitCityId } from '../managers/PursuitCityContext.js';
const SAME=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
const QUESTIONS={
 maid:{label:'Anything unusual?',question:'Did you notice anything unusual while servicing their room?'},
 bankier:{label:'The transaction?',question:'Was there anything unusual about their transaction or requests?'},
 knajpa:{label:'Any trouble?',question:'Did you hear anything unusual while they were here?'},
 parkingowy:{label:'At the car park?',question:'Did you notice anything unusual while they were at the car park?'},
 police:{label:'Any local reports?',question:'Did this visitor make a report or come to your attention here?'},
 bum:{label:'What did you see?',question:'Did you see or hear anything unusual when they passed through?'},
 fence:{label:'What was the deal?',question:'What exactly did they ask you to arrange?'},
 stewardessa:{label:'During the flight?',question:'Did they say or do anything unusual during your contact with them?'}
};
export function motiveTopicMeta(npcId){return QUESTIONS[npcId]?{...QUESTIONS[npcId]}:null;}
const keyOf=(cityId,npcId)=>`${encodeURIComponent(cityId)}:${encodeURIComponent(npcId)}`;
function currentContext(state,cityId,npcId){
 const city=normalizePursuitCityId(cityId),context=getPursuitCityContext(state,city);
 if(!city||!QUESTIONS[npcId]||!state.caseData?.motiveId||state.currentCaseId==null||
  context.isCrimeCity||!context.isOnEscapeRoute||!context.isCorrectCity||context.isFutureRouteCity)return null;
 return {city,motiveId:state.caseData.motiveId,done:Array.isArray(state.caseData.motiveStagesDone)?state.caseData.motiveStagesDone:[]};
}
export function getMotiveWitnessStatement(state,cityId,npcId){
 const ctx=currentContext(state,cityId,npcId);if(!ctx)return null;
 const old=state.caseData.motiveWitnessReports?.[keyOf(ctx.city,npcId)];
 if(old){
  if(old.version!==1||!SAME(old.caseId,state.currentCaseId)||old.campaignId!==state._createdAt||
   old.motiveId!==ctx.motiveId||old.cityId!==ctx.city||old.npcId!==npcId||!ctx.done.includes(old.evidenceId))return null;
  const motive=getMotiveById(ctx.motiveId),stage=motive?.escapeInvestigation?.clueStages?.find(s=>s.evidenceId===old.evidenceId);
  const witness=stage?.npcWitnesses?.find(w=>w.npcId===npcId&&w.clueKey===old.clueKey);
  if(!witness||typeof old.text!=='string'||!old.text.trim())return null;
  return {stage,clueKey:old.clueKey,text:old.text,cityId:ctx.city,npcId,cached:true};
 }
 const hit=getWitnessClue(ctx.motiveId,npcId,ctx.done);if(!hit)return null;
 const text=getClueText(ctx.motiveId,npcId,hit.clueKey);
 if(typeof text!=='string'||!text.trim())return null;
 return {...hit,text:text.trim(),cityId:ctx.city,npcId,cached:false};
}
export function recordMotiveWitnessStatement(state,cityId,npcId,cleanText=value=>value){
 const hit=getMotiveWitnessStatement(state,cityId,npcId);if(!hit)return null;
 if(hit.cached)return hit;
 const text=cleanText(hit.text);if(typeof text!=='string'||!text.trim())return null;
 const clue={type:'motive',id:hit.stage.evidenceId,label:hit.stage.label,text,
  npcId,sourceCityId:hit.cityId,caseId:state.currentCaseId,motiveStrength:hit.stage.motiveStrength};
 const existing=(Array.isArray(state.cluesCollected)?state.cluesCollected:[]).find(c=>c?.id===clue.id);
 if(existing)return null; // Do not consume an inconsistent or already-filed legacy stage.
 if(typeof state.addClue!=='function'||state.addClue(clue)===false)return null;
 const report={version:1,caseId:state.currentCaseId,campaignId:state._createdAt,
  motiveId:state.caseData.motiveId,cityId:hit.cityId,npcId,evidenceId:hit.stage.evidenceId,
  clueKey:hit.clueKey,text,recordedAt:new Date().toISOString()};
 const caseData={...state.caseData,
  motiveStagesDone:[...new Set([...(state.caseData.motiveStagesDone||[]),hit.stage.evidenceId])],
  motiveBoardUnlocked:state.caseData.motiveBoardUnlocked===true||hit.stage.boardAnswerUnlocked===true,
  motiveWitnessReports:{...(state.caseData.motiveWitnessReports||{}),[keyOf(hit.cityId,npcId)]:report}};
 if(typeof state.updateState==='function')state.updateState({caseData});else state.caseData=caseData;
 return {...hit,text,cached:false};
}
