import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
  events.push(candidate(state,DEAD_MEN_WORLD_CASE,safeTitle(quest.title,__dialogueText("systems/DeadCasesWorldOutcomes.js", "t_dac63505a911d97e2036")),settlement.completedAt,now,
   __dialogueText("systems/DeadCasesWorldOutcomes.js", "t_221749c1d98b5e6902a9"),{
    settlementId:settlement.id,outcomeCode:'verified_calls_report'
   }));
 }
 const finale=state.deadMailPreview?.finale;
 if(state.deadMailPreview?.version===1&&finale?.version===1&&finale.completed===true&&
   finale.stage==='epilogue'&&finale.xp?.applied===true){
  const contract=state.piQuests?.quests?.[DEAD_MAIL_WORLD_CASE];
  events.push(candidate(state,DEAD_MAIL_WORLD_CASE,safeTitle(contract?.title,__dialogueText("systems/DeadCasesWorldOutcomes.js", "t_16abdc3e0b396e03e229")),finale.completedAt,now,
   __dialogueText("systems/DeadCasesWorldOutcomes.js", "t_bc2553071cb109d342d1"),{
    settlementId:null,outcomeCode:'available_finale_completed',contentScope:'development_preview'
   }));
 }
 return events;
}
export function deadCaseWorldText(event){
 if(event.caseId===DEAD_MEN_WORLD_CASE&&event.source===__dialogueText("systems/DeadCasesWorldOutcomes.js", "t_221749c1d98b5e6902a9")&&event.outcomeCode==='verified_calls_report'){
  return __dialogueText("systems/DeadCasesWorldOutcomes.js", "t_fa716cf93182dde26241");
 }
 if(event.caseId===DEAD_MAIL_WORLD_CASE&&event.source===__dialogueText("systems/DeadCasesWorldOutcomes.js", "t_bc2553071cb109d342d1")&&event.outcomeCode==='available_finale_completed'){
  return __dialogueText("systems/DeadCasesWorldOutcomes.js", "t_b5e3183439d060bf31aa");
 }
 return __dialogueText("systems/DeadCasesWorldOutcomes.js", "t_80ab6a4bdc00fda0b31b");
}
