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
    caseTitle:'Return to Sender',endingId:record.ending,
    settlementId:POSTAL_WORLD_CASE_ID+':reward:v1',
    completedAt:Number.isFinite(completed)?record.rewardAt:null,
    source:'postOffice.returnCase',rewardReceiptVersion:1
  };
}
export function postalWorldOutcomeText(event){
  if(event.endingId==='private'){
    return 'The sealed letter was left with the authorised correspondence service. You kept the recipient’s requested new name out of the report to the sender. No identity details are included in this office notice.';
  }
  if(event.endingId==='disclose'){
    return 'The sealed letter was left with the authorised correspondence service. Your report to the sender included the recipient’s new name despite the request to keep it private. This was disclosure to the sender, not a public press release. No identity details are repeated in this office notice.';
  }
  return 'The postal case is closed. Consult the original case record for its outcome.';
}
