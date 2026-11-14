import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
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
  if(state.piQuests?.quests?.[QUEST]?.status!=='active')return {ok:false,message:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_f8f967eb8946af9baad4")};
  if(state[KEY]?.status==='pending'||receiptAlreadyObtained(state))return {ok:false,message:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_b57518b61c5198b60aa9")};
  if(!hasArthurAuthorisation(state))return {ok:false,message:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_fbfa0fa487154cf45c03")};
  if(!validForward(message))return {ok:false,message:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_012babdc0ef53d649900")};
  state[DRAFT_KEY]={version:1,message:{id:message.id,from:String(message.from||__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_178bf8d7d14682ceb2df")),
    subject:String(message.subject||__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_59fd9fdf8f7cdc3b8386")),body:message.body}};
  save();return {ok:true,message:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_4d9b2a621b6ba283d28a")};
}
export function removeArthurForward(state=gameState,save=requestAutosave) {
  if(state[KEY]?.status==='pending')return false;
  state[DRAFT_KEY]=null;save();return true;
}
export function receiptRequestBody(authorised,forwarded=null) {
  const intro=__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_772513834f4ef1ef4cdb");
  if(!authorised||!validForward(forwarded))return intro+__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_bd16b8c97da3f7221331");
  return intro+__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_8e79a2063bcede0dbe88")+
    __dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_cdb105997407512628c3")+forwarded.from+__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_ad49478e66537118f7c2")+forwarded.subject+'\n\n'+forwarded.body+__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_2304557d7d2da8fd0b00");
}
export function sendReceiptRequest(state=gameState,now=Date.now(),save=requestAutosave) {
  if(state.piQuests?.quests?.[QUEST]?.status!=='active')return {ok:false,message:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_f8f967eb8946af9baad4")};
  if(!known(state).includes('copper_email'))return {ok:false,message:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_fe35ba711e8f5e6a66ba")};
  if(receiptAlreadyObtained(state))return {ok:false,message:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_f8ffab9aebf630a3f5c1")};
  if(state[KEY]?.status==='pending')return {ok:false,message:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_cec6452c6b0d40caefcd")};
  const forwarded=forwardedArthurMessage(state);
  if(!hasArthurAuthorisation(state)||!forwarded)return {ok:false,message:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_dcf7857794fb0e8f3e54")};
  const attempt=(Number(state[KEY]?.attempt)||0)+1;
  state[KEY]={version:2,status:'pending',attempt,authorised:true,sentAt:now,dueAt:now+RECEIPT_DELAY_MS,
    forwardedMessage:{...forwarded},body:receiptRequestBody(true,forwarded)};
  save();return {ok:true,message:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_1742f10df37b0e7e31d7")};
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
  if(record?.status==='needs_permission')result.push({id:'alibi_copper_permission_needed',from:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_7568bf152928ba221688"),
    subject:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_f8629a751fdd10f24e3a"),date:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_9652157c5b2f72ab5382"),mailDeliveryDueAt:record.dueAt,
    body:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_460c2358ae70a4b61cc0")});
  if(active&&known(state).includes('copper_email')&&!receiptAlreadyObtained(state)&&record?.status!=='pending')result.push({
    id:COPPER_DRAFT,from:`${__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_a6cd4a7f9ea8eb99f4a2")}${COPPER_EMAIL}`,subject:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_269656f11b99de51827f"),date:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_ebf12ef47cf575b3ba9a"),
    body:receiptRequestBody(hasArthurAuthorisation(state),forwarded)});
  if(record)result.push({id:COPPER_SENT,from:`${__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_a6cd4a7f9ea8eb99f4a2")}${COPPER_EMAIL}`,subject:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_495b3c44299f2ebc3560"),date:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_c16bc82bf1f04ede04d1"),body:record.body});
  if(record?.status==='received')result.unshift({id:COPPER_REPLY,from:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_7568bf152928ba221688"),
    subject:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_8a6da88b50e88aa9dc9d"),date:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_9652157c5b2f72ab5382"),mailDeliveryDueAt:record.dueAt,
    body:__dialogueText("ui/pi-computer/AlibiReceiptService.js", "t_09e8c593354a7cd9b132")});
  return result;
}
