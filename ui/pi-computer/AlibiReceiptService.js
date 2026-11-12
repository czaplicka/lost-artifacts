import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { COPPER_EMAIL } from './AlibiDialogueData.js';

export const COPPER_DRAFT='alibi_copper_request_draft';
export const COPPER_SENT='alibi_copper_request_sent';
export const COPPER_REPLY='alibi_copper_receipt';
export const RECEIPT_DELAY_MS=10000;
const KEY='piAlibiReceiptRequestV2',DRAFT_KEY='piAlibiReceiptForwardV1';
const SEARCH='borrowed_alibi',QUEST='pi_stolen_alibi';
const known=state=>state.piKeywordSearch?.cases?.[SEARCH]?.known || [];
const flags=state=>state.piPhoneInvestigations?.cases?.[SEARCH]?.flags || [];

export function hasArthurAuthorisation(state=gameState) {
  return state.piBorrowedAlibi?.sent===true && state.piBorrowedAlibi?.replyReceived!==false && known(state).includes('consent');
}
export function receiptRequestState(state=gameState) {return state[KEY] || null;}
export function receiptAlreadyObtained(state=gameState) {return flags(state).includes('receipt_received');}
function validForward(message) {
  return message?.id==='alibi_arthur_reply' && typeof message.body==='string' &&
    /permission to release my receipt/i.test(message.body);
}
export function forwardedArthurMessage(state=gameState) {
  const message=state[DRAFT_KEY]?.message;
  return validForward(message) ? message : null;
}
export function forwardArthurAuthorisation(message,state=gameState,save=requestAutosave) {
  if(state.piQuests?.quests?.[QUEST]?.status!=='active')return {ok:false,message:'This case is not active.'};
  if(state[KEY]?.status==='pending'||receiptAlreadyObtained(state))return {ok:false,message:'This request has already been sent.'};
  if(!hasArthurAuthorisation(state))return {ok:false,message:'Read Arthur’s reply and collect his written permission first.'};
  if(!validForward(message))return {ok:false,message:'Arthur’s original permission email is not available.'};
  state[DRAFT_KEY]={version:1,message:{id:message.id,from:String(message.from||'Arthur Finch via Box 17'),
    subject:String(message.subject||'Re: Someone has been using my alibi'),body:message.body}};
  save();return {ok:true,message:'Arthur’s original email has been added to the request.'};
}
export function removeArthurForward(state=gameState,save=requestAutosave) {
  if(state[KEY]?.status==='pending')return false;
  state[DRAFT_KEY]=null;save();return true;
}
export function receiptRequestBody(authorised,forwarded=null) {
  const intro='Hello,\n\nPlease send me a copy of Arthur Finch’s receipt for Tuesday evening at The Copper Spoon, including the recorded order, guest count and transaction times.';
  if(!authorised||!validForward(forwarded))return intro+'\n\nThank you,\nPrivate Investigator';
  return intro+'\n\nI am forwarding his original email below, including his written permission to release the receipt.\n\nThank you,\nPrivate Investigator'+
    '\n\n----- FORWARDED MESSAGE -----\nFrom: '+forwarded.from+'\nSubject: '+forwarded.subject+'\n\n'+forwarded.body+'\n\n----- END OF FORWARDED MESSAGE -----';
}
export function sendReceiptRequest(state=gameState,now=Date.now(),save=requestAutosave) {
  if(state.piQuests?.quests?.[QUEST]?.status!=='active')return {ok:false,message:'This case is not active.'};
  if(!known(state).includes('copper_email'))return {ok:false,message:'Save the restaurant’s receipts email from its contact page.'};
  if(receiptAlreadyObtained(state))return {ok:false,message:'The receipt has already been supplied. Open the existing reply in Mail.'};
  if(state[KEY]?.status==='pending')return {ok:false,message:'Your request has already been sent. Wait for the restaurant’s reply.'};
  const forwarded=forwardedArthurMessage(state);
  if(!hasArthurAuthorisation(state)||!forwarded)return {ok:false,message:'Forward Arthur’s original permission email before sending the request.'};
  const attempt=(Number(state[KEY]?.attempt)||0)+1;
  state[KEY]={version:2,status:'pending',attempt,authorised:true,sentAt:now,dueAt:now+RECEIPT_DELAY_MS,
    forwardedMessage:{...forwarded},body:receiptRequestBody(true,forwarded)};
  save();return {ok:true,message:'Receipt request sent with Arthur’s permission email.'};
}
export function deliverReceiptReply(state=gameState,now=Date.now(),save=requestAutosave) {
  const record=state[KEY];
  if(!record||record.status!=='pending'||!Number.isFinite(record.dueAt)||now<record.dueAt)return false;
  if(state.piQuests?.quests?.[QUEST]?.status!=='active')return false;
  state[KEY]={...record,status:record.authorised?'received':'needs_permission',receivedAt:now};
  if(record.authorised){
    const old=state.piPhoneInvestigations||{},progress=old.cases?.[SEARCH]||{flags:[],completedTopics:[],transcripts:[]};
    state.piPhoneInvestigations={...old,version:1,cases:{...(old.cases||{}),[SEARCH]:{...progress,
      flags:[...new Set([...(progress.flags||[]),'receipt_received'])]}}};
  }
  save();return true;
}
export function restaurantMessages(state=gameState) {
  const record=state[KEY],active=state.piQuests?.quests?.[QUEST]?.status==='active';
  if(!state.piQuests?.quests?.[QUEST])return [];
  const result=[],forwarded=forwardedArthurMessage(state);
  if(record?.status==='needs_permission')result.push({id:'alibi_copper_permission_needed',from:'The Copper Spoon — Manager',
    subject:'Re: Receipt request — authorisation required',date:'Reply to your request',mailDeliveryDueAt:record.dueAt,
    body:'We received your request, but it does not include Arthur Finch’s written permission. Please forward his authorisation in this thread. No customer record is attached.\n\nManager, The Copper Spoon'});
  if(active&&known(state).includes('copper_email')&&!receiptAlreadyObtained(state)&&record?.status!=='pending')result.push({
    id:COPPER_DRAFT,from:`You → ${COPPER_EMAIL}`,subject:'Draft: Arthur Finch — Tuesday receipt request',date:'Draft',
    body:receiptRequestBody(hasArthurAuthorisation(state),forwarded)});
  if(record)result.push({id:COPPER_SENT,from:`You → ${COPPER_EMAIL}`,subject:'Sent: Arthur Finch — Tuesday receipt request',date:'Sent',body:record.body});
  if(record?.status==='received')result.unshift({id:COPPER_REPLY,from:'The Copper Spoon — Manager',
    subject:'Re: Authorised copy — Arthur Finch’s Tuesday receipt',date:'Reply to your request',mailDeliveryDueAt:record.dueAt,
    body:'Arthur Finch’s authorisation has been checked. Here is the requested copy.\n\nTHE COPPER SPOON\nReceipt CS-TUE-061\nTuesday evening\nTable 6 — one guest\nOpened 19:04 | Paid 19:48\n\nCheese sandwich ........ $8.00\nSparkling water ....... $3.00\nTOTAL ................ $11.00\n\nDining-room cover record: one guest; no additional covers opened at this table during the visit.\n\nService note: kitchen failure. No hot food served throughout Tuesday evening.\n\nCopy supplied with the customer’s permission.\nManager, The Copper Spoon'});
  return result;
}
