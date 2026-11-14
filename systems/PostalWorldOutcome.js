import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
export const POSTAL_WORLD_CASE_ID='pi_return_to_sender';

// Canonical source: PostOfficeManager.RETURN_CASE and PostalCaseSupport receipt.
export function postalWorldOutcome(state,now=Date.now()){
  if(state._createdAt==null||state.postOffice?.version!==1)return null;
  const record=state.postOffice.returnCase;
  if(!record||record.stage!=='completed'||record.rewardVersion!==1||
    !['private','disclose'].includes(record.ending))return null;
  const completed=Date.parse(record.rewardAt);
  return{
    id:JSON.stringify(['pi_terminal',String(state._createdAt),POSTAL_WORLD_CASE_ID]),
    campaignId:state._createdAt,caseId:POSTAL_WORLD_CASE_ID,
    kind:'pi_case_completed',system:'pi',visibility:'private',
    createdAt:Number.isFinite(completed)?completed:now,
    caseTitle:__dialogueText("systems/PostalWorldOutcome.js", "t_6e6e82ddd9c9f0af1dde"),endingId:record.ending,
    settlementId:POSTAL_WORLD_CASE_ID+':reward:v1',
    completedAt:Number.isFinite(completed)?record.rewardAt:null,
    source:__dialogueText("systems/PostalWorldOutcome.js", "t_290511b7de457b74dd26"),rewardReceiptVersion:1
  };
}
export function postalWorldOutcomeText(event){
  if(event.endingId==='private'){
    return __dialogueText("systems/PostalWorldOutcome.js", "t_3a5381e073add212e49e");
  }
  if(event.endingId==='disclose'){
    return __dialogueText("systems/PostalWorldOutcome.js", "t_fdf14a6f130867edd439");
  }
  return __dialogueText("systems/PostalWorldOutcome.js", "t_fe8b5849dd89dcad3815");
}
