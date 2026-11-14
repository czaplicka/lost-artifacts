export const DEAD_MEN_WORLD_CASE='pi_dead_men_calling';
export const DEAD_MAIL_WORLD_CASE='pi_dead_mail_preview';
export const DEAD_WORLD_CASES=new Set([DEAD_MEN_WORLD_CASE,DEAD_MAIL_WORLD_CASE]);
const safeTitle=(value,fallback)=>typeof value==='string'&&value.trim()&&!/[_/\\]/.test(value)?value.trim():fallback;
function candidate(state,caseId,title,completedAt,now,source,extra={}){
 const at=Date.parse(completedAt);
 return{
  id:JSON.stringify(['pi_terminal',String(state._createdAt),caseId]),
  campaignId:state._createdAt,caseId,kind:'pi_case_completed',system:'pi',visibility:'private',
  createdAt:Number.isFinite(at)?at:now,caseTitle:title,endingId:null,
  completedAt:Number.isFinite(at)?completedAt:null,source,...extra
 };
}
export function deadCasesWorldOutcomes(state,now=Date.now()){
 if(state._createdAt==null)return[];
 const events=[];
 const quest=state.piQuests?.quests?.[DEAD_MEN_WORLD_CASE];
 const settlement=state.piDeadMenCallingFinale?.settlement;
 if(quest?.status==='completed'&&settlement?.phase==='completed'&&settlement.paid===true&&
   settlement.xp?.applied===true&&typeof settlement.id==='string'&&settlement.id&&
   quest.resolution?.settlementId===settlement.id){
  events.push(candidate(state,DEAD_MEN_WORLD_CASE,safeTitle(quest.title,'Dead Men Calling'),settlement.completedAt,now,
   'piDeadMenCallingFinale.settlement',{
    settlementId:settlement.id,outcomeCode:'verified_calls_report'
   }));
 }
 const finale=state.deadMailPreview?.finale;
 if(state.deadMailPreview?.version===1&&finale?.version===1&&finale.completed===true&&
   finale.stage==='epilogue'&&finale.xp?.applied===true){
  const contract=state.piQuests?.quests?.[DEAD_MAIL_WORLD_CASE];
  events.push(candidate(state,DEAD_MAIL_WORLD_CASE,safeTitle(contract?.title,'Dead Mail'),finale.completedAt,now,
   'deadMailPreview.finale',{
    settlementId:null,outcomeCode:'available_finale_completed',contentScope:'development_preview'
   }));
 }
 return events;
}
export function deadCaseWorldText(event){
 if(event.caseId===DEAD_MEN_WORLD_CASE&&event.source==='piDeadMenCallingFinale.settlement'&&event.outcomeCode==='verified_calls_report'){
  return 'The confirmed report explains the three calls using the recorded admission, original-file comparison and authorised dispatch records. The separate accounting question remains unresolved. This office notice records no arrest, conviction or finding of an accounting offence.';
 }
 if(event.caseId===DEAD_MAIL_WORLD_CASE&&event.source==='deadMailPreview.finale'&&event.outcomeCode==='available_finale_completed'){
  return 'The available Dead Mail finale has been completed and the final report submitted. This private notice records no court verdict and does not release client material. Any souvenir still waiting to be collected remains handled by the original reward screen.';
 }
 return 'The case is marked completed in an older record. Detailed findings were not verified by this world-event entry. Consult the original report.';
}
