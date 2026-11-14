import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { deadMenTopicTranscript } from './DeadMenPhoneTopics.js';
import { gameState } from '../GameData.js';
import { requestAutosave, saveGameState } from '../gameStatePersistence.js';
import { moneyManager, ECONOMY_CATEGORY } from './MoneyManager.js';
import { getPIQuest } from './PIQuestManager.js';
import { addPIEvidence } from './PIInvestigationManager.js';
import { DEAD_MEN_QUEST, getDeadMenProgress } from './DeadMenCallingService.js';
import { progressionManager } from './ProgressionManager.js';

const KEY='piDeadMenCallingFinale', REVIEW='dead_men_final_review', REPORT='dead_men_final_report_draft';
const clone=v=>JSON.parse(JSON.stringify(v));
const XP_REWARD_ID='pi_case_large';
function xpEventId(){return JSON.stringify(['reward',XP_REWARD_ID,DEAD_MEN_QUEST]);}
let busy=false;
const contacts={
 '619':{id:'dead_men_margaret',number:'619',name:__dialogueText("managers/DeadMenCallingFinale.js", "t_e3683593d8ba71a5c369")},
 '620':{id:'dead_men_leo',number:'620',name:__dialogueText("managers/DeadMenCallingFinale.js", "t_9b91e7842e8557c83048")},
 '621':{id:'dead_men_colin',number:'621',name:__dialogueText("managers/DeadMenCallingFinale.js", "t_b7e5ae2ffc6f69bea5b4")}
};
const confrontation=[
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_85e7e0e4a4bb64f37d11")},
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_b7e5ae2ffc6f69bea5b4"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_3cfb7d30d7b4f7de9d9e")},
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_fca19b342771180a0a82")},
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_b7e5ae2ffc6f69bea5b4"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_4d6ce163c271fee5d7ca")},
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_918eec7b7a9783af80f6")},
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_b7e5ae2ffc6f69bea5b4"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_04c4e8183ad28e8d49ee")},
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_484e10515981d4f8ca37")},
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_b7e5ae2ffc6f69bea5b4"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_e0f62fb8c5937ead8c0d")},
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_4b8765672029c33c83b5")},
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_b7e5ae2ffc6f69bea5b4"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_e3d1254a0339998cbfe8")}
];
const consentInterview=[
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_6f74948345653d836231")},
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_e3683593d8ba71a5c369"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_954fe37c246e5614cc64")},
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_c59ab481df39d833db48")},
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_e3683593d8ba71a5c369"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_e75ad077df181017447b")},
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_75bbdcdb28f72f8b6a42")},
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_e3683593d8ba71a5c369"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_e1704b9a48edfef19ad2")}
];
const verificationInterview=[
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_9b91e7842e8557c83048"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_8b3497eb51bdcbfe0d58")},
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_fe29d23dd43da8b1888f")},
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_9b91e7842e8557c83048"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_806cad8b38b16a64d569")},
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_e1579994b4fd963a6e02")},
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_9b91e7842e8557c83048"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_9b4f6514cdb8cf3efecc")},
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_3e042edf620a3a80ea05")},
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_9b91e7842e8557c83048"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_f33144f86c225282f9dc")},
 {speaker:__dialogueText("managers/DeadMenCallingFinale.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFinale.js", "t_2fd54092ccb8a30c11d0")}
];
const relay={id:'dead_men_relay_records',subject:__dialogueText("managers/DeadMenCallingFinale.js", "t_75aaf5bf740337b2726d"),body:__dialogueText("managers/DeadMenCallingFinale.js", "t_0f4cd81bda9350195c47")};
const project={id:'dead_men_edit_project',subject:__dialogueText("managers/DeadMenCallingFinale.js", "t_d7be0ef5dee5ea96d5f3"),body:__dialogueText("managers/DeadMenCallingFinale.js", "t_470fe20e0b279539cf4e")};
const technical={id:'dead_men_audio_report',subject:__dialogueText("managers/DeadMenCallingFinale.js", "t_7f70a64a4960258308da"),body:__dialogueText("managers/DeadMenCallingFinale.js", "t_b4b880d102316fef9623")};
const questions=[
 {id:'caller',prompt:__dialogueText("managers/DeadMenCallingFinale.js", "t_d29843852906321216c2"),options:[[__dialogueText("managers/DeadMenCallingFinale.js", "t_8e90c181884c5d45f38d"),true],[__dialogueText("managers/DeadMenCallingFinale.js", "t_9c2071c32ba1eefdd099"),false],[__dialogueText("managers/DeadMenCallingFinale.js", "t_8a73b08cf8e514828d04"),false]],feedback:__dialogueText("managers/DeadMenCallingFinale.js", "t_5d20ec8fdf910157d176")},
 {id:'method',prompt:__dialogueText("managers/DeadMenCallingFinale.js", "t_4d7875a48437510650fb"),options:[[__dialogueText("managers/DeadMenCallingFinale.js", "t_3a687c56530064bd39e8"),false],[__dialogueText("managers/DeadMenCallingFinale.js", "t_44e3bc973d66de11a32e"),true],[__dialogueText("managers/DeadMenCallingFinale.js", "t_c4daa53d26e0f777403e"),false]],feedback:__dialogueText("managers/DeadMenCallingFinale.js", "t_4f70902153f26fc60bbb")},
 {id:'motive',prompt:__dialogueText("managers/DeadMenCallingFinale.js", "t_1092e8b2d810c8dd552b"),options:[[__dialogueText("managers/DeadMenCallingFinale.js", "t_73e78b5fcd36b41bb605"),false],[__dialogueText("managers/DeadMenCallingFinale.js", "t_77f67785f848c29dbe1b"),false],[__dialogueText("managers/DeadMenCallingFinale.js", "t_7bfc946141036845ac22"),true]],feedback:__dialogueText("managers/DeadMenCallingFinale.js", "t_5aadcd637e3e028235d7")}
];
function state(){
 const raw=gameState[KEY],s=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const answers=questions.filter(q=>Array.isArray(s.answers)&&s.answers.includes(q.id)).map(q=>q.id);
 return {...s,version:1,confronted:s.confronted===true,consent:s.consent===true,verified:s.verified===true,read:Array.isArray(s.read)?[...new Set(s.read.filter(id=>typeof id==='string'))]:[],answers,reconstructed:questions.every(q=>answers.includes(q.id)),settlement:s.settlement||null};
}
function save(patch){gameState[KEY]={...state(),...patch,version:1};requestAutosave();}
function active(){return getPIQuest(DEAD_MEN_QUEST)?.status==='active';}
function unlocked(){return active()&&getDeadMenProgress().accessReviewed===true&&['colin_denial','folder_interest','folder_limit'].every(id=>(gameState.piDeadMenCallingFollowup?.answers||[]).includes(id));}
function ready(){const s=state();return unlocked()&&s.confronted&&s.consent&&s.verified&&[relay,project,technical].every(m=>s.read.includes(m.id));}
function current(){return questions.find(q=>!state().answers.includes(q.id))||null;}
function transcript(lines){return lines.map(l=>`${l.speaker}: ${l.text}`).join('\n\n');}
function note(id,label,text,meta=__dialogueText("managers/DeadMenCallingFinale.js", "t_1cdc1d293e12530ca34a")){addPIEvidence(DEAD_MEN_QUEST,{id,label,text,metaText:meta,color:'yellow'});}
function sync(){
 const s=state();if(!getPIQuest(DEAD_MEN_QUEST))return;
 if(s.confronted)note('dead_men_confrontation',__dialogueText("managers/DeadMenCallingFinale.js", "t_24237c817ce90d54b564"),(deadMenTopicTranscript('colin_confrontation') || transcript(confrontation)),__dialogueText("managers/DeadMenCallingFinale.js", "t_1ef9612cceb5cb0c8f05"));
 if(s.consent)note('dead_men_audio_consent',__dialogueText("managers/DeadMenCallingFinale.js", "t_37d63d3ede2b97ec7c6b"),(deadMenTopicTranscript('margaret_consent') || transcript(consentInterview)),__dialogueText("managers/DeadMenCallingFinale.js", "t_4e3c38678b2f03373d65"));
 if(s.verified)note('dead_men_verification_call',__dialogueText("managers/DeadMenCallingFinale.js", "t_0bcf429e68061ed30642"),(deadMenTopicTranscript('leo_verification') || transcript(verificationInterview)),__dialogueText("managers/DeadMenCallingFinale.js", "t_c558293c72996eb5e04a"));
 for(const m of [relay,project,...(s.verified?[technical]:[])])if(s.confronted&&s.read.includes(m.id))note(m.id,m.subject,m.body);
}
function reviewBody(){
 const s=state();if(s.reconstructed)return __dialogueText("managers/DeadMenCallingFinale.js", "t_02047413cf818ef7563a");
 if(!ready())return __dialogueText("managers/DeadMenCallingFinale.js", "t_0295ea48a3117352212c");
 return `${__dialogueText("managers/DeadMenCallingFinale.js", "t_675a21179629d2b1e2b0")}${s.answers.length+1}${__dialogueText("managers/DeadMenCallingFinale.js", "t_8a5edab282632443219e")}${questions.length}${__dialogueText("managers/DeadMenCallingFinale.js", "t_75a11da44c802486bc6f")}${current().prompt}${__dialogueText("managers/DeadMenCallingFinale.js", "t_c07d70efd514c338a800")}`;
}
function reportText(){return __dialogueText("managers/DeadMenCallingFinale.js", "t_9e1541c12850a742a332");}
function preview(){
 const q=getPIQuest(DEAD_MEN_QUEST);if(!q||!Number.isInteger(q.reward)||q.reward<0)return null;
 return {report:reportText(),fee:q.reward};
}
function mail(id,from,subject,body,date=__dialogueText("managers/DeadMenCallingFinale.js", "t_092cc4b9bf02604ee9d3")){return {id,from,subject,body,date};}
function ownMail(){
 const s=state(),q=getPIQuest(DEAD_MEN_QUEST);
 if(!q||(!unlocked()&&!s.confronted&&!s.settlement))return [];
 const items=[];
 if(q.status==='active')items.push(mail('dead_men_confront_next',__dialogueText("managers/DeadMenCallingFinale.js", "t_c8bd0e9ce96dc602d59e"),__dialogueText("managers/DeadMenCallingFinale.js", "t_65d2aba16706772d715d"),__dialogueText("managers/DeadMenCallingFinale.js", "t_33702ce862f204fb476d")));
 if(s.confronted)items.unshift(
  mail('dead_men_admission_copy',__dialogueText("managers/DeadMenCallingFinale.js", "t_8aa2f38d4bd552719548"),__dialogueText("managers/DeadMenCallingFinale.js", "t_30db92d02a05621cc04e"),(deadMenTopicTranscript('colin_confrontation') || transcript(confrontation))),
  mail('dead_men_audio_next',__dialogueText("managers/DeadMenCallingFinale.js", "t_c8bd0e9ce96dc602d59e"),__dialogueText("managers/DeadMenCallingFinale.js", "t_2d56e3410e03e6bec8b4"),__dialogueText("managers/DeadMenCallingFinale.js", "t_3143fa8a605187b7b709")),
  mail(relay.id,__dialogueText("managers/DeadMenCallingFinale.js", "t_5c1c8597a9962f4908b5"),relay.subject,relay.body),
  mail(project.id,__dialogueText("managers/DeadMenCallingFinale.js", "t_838faf083da12a2aa83a"),project.subject,project.body)
 );
 if(s.consent)items.unshift(mail('dead_men_consent_copy',__dialogueText("managers/DeadMenCallingFinale.js", "t_e3683593d8ba71a5c369"),__dialogueText("managers/DeadMenCallingFinale.js", "t_d8b57249e662a46287d5"),__dialogueText("managers/DeadMenCallingFinale.js", "t_97bba089cc953a423a0e")));
 if(s.verified)items.unshift(mail(REVIEW,__dialogueText("managers/DeadMenCallingFinale.js", "t_246d256c733195b4c2b3"),__dialogueText("managers/DeadMenCallingFinale.js", "t_a6b0b2b22cc68b70c0ac"),reviewBody()),mail(technical.id,__dialogueText("managers/DeadMenCallingFinale.js", "t_8a7ff0de2b27eedb3405"),technical.subject,technical.body));
 if(s.reconstructed&&!s.settlement?.phase?.includes('completed')){
  const p=s.settlement?.preview||preview();
  if(p)items.unshift(mail(REPORT,__dialogueText("managers/DeadMenCallingFinale.js", "t_38f1c9e43abf2377f354"),__dialogueText("managers/DeadMenCallingFinale.js", "t_ce02ce16346ae602c210"),p.report+`${__dialogueText("managers/DeadMenCallingFinale.js", "t_cb7c85e1974fadacad57")}${p.fee}${__dialogueText("managers/DeadMenCallingFinale.js", "t_0e575d0eaecdb12aa6be")}`));
 }
 if(s.settlement?.phase==='completed')items.unshift(
  mail('dead_men_report_reply',__dialogueText("managers/DeadMenCallingFinale.js", "t_e3683593d8ba71a5c369"),__dialogueText("managers/DeadMenCallingFinale.js", "t_c7a7a5f2941a02a89c94"),__dialogueText("managers/DeadMenCallingFinale.js", "t_db42baf971312f248c0c"),__dialogueText("managers/DeadMenCallingFinale.js", "t_aa56ad4b2d1623d94be8")),
  mail('dead_men_report_sent',__dialogueText("managers/DeadMenCallingFinale.js", "t_36e093f31c204d28988a"),__dialogueText("managers/DeadMenCallingFinale.js", "t_7b94bd5e960f249095b5"),s.settlement.preview.report,__dialogueText("managers/DeadMenCallingFinale.js", "t_aa56ad4b2d1623d94be8"))
 );
 return items;
}
function markRead(id){if(!ownMail().some(m=>m.id===id))return;const s=state();if(!s.read.includes(id))save({read:[...s.read,id]});sync();}
function check(id,index){
 const q=current();if(!ready()||!q||q.id!==id)return {ok:false,message:__dialogueText("managers/DeadMenCallingFinale.js", "t_d9205e01a1864a550024")};
 if(!q.options[index]?.[1])return {ok:false,message:q.feedback};
 save({answers:[...state().answers,q.id]});sync();
 if(state().reconstructed)note('dead_men_final_reconstruction',__dialogueText("managers/DeadMenCallingFinale.js", "t_397e19f0013890c51b7f"),__dialogueText("managers/DeadMenCallingFinale.js", "t_908bc87951c60cd05611"),__dialogueText("managers/DeadMenCallingFinale.js", "t_52bd2558c8745b19012a"));
 return {ok:true,message:state().reconstructed?__dialogueText("managers/DeadMenCallingFinale.js", "t_acee2a460c6b40cc5443"):__dialogueText("managers/DeadMenCallingFinale.js", "t_99544d74343b1c95c754")};
}
function paid(id){return (gameState.moneyLog||[]).some(t=>t.type==='income'&&t.source==='cash'&&t.metadata?.deadMenSettlementId===id);}
function settleDeadMenXP(pending){
 if(pending.phase!=='settling'||pending.paid!==true||!getPIQuest(DEAD_MEN_QUEST))throw Error('The report is not ready for XP settlement.');
 const eventId=xpEventId();
 let result;
 try{
  result=progressionManager.grantReward(XP_REWARD_ID,DEAD_MEN_QUEST,__dialogueText("managers/DeadMenCallingFinale.js", "t_e6cf4bd0bcc905333996"));
 }catch(error){
  if(!progressionManager.hasReward(eventId))throw error;
  console.error('[DeadMenCallingFinale] XP notification failed after commit:',error);
  result={success:false,reason:'already_granted'};
 }
 if(!result.success&&result.reason!=='already_granted')throw Error(`XP settlement failed: ${result.reason||'unknown_error'}`);
 if(!progressionManager.hasReward(eventId))throw Error('The XP reward was not recorded.');
 return {result,record:{eventId,rewardId:XP_REWARD_ID,scopeId:DEAD_MEN_QUEST,applied:true}};
}
function closeCase(settlement){
 const qs=gameState.piQuests,q=qs?.quests?.[DEAD_MEN_QUEST];if(!q)throw Error('Contract missing.');
 const resolution={summary:__dialogueText("managers/DeadMenCallingFinale.js", "t_36b21dc09d19273505a2"),reward:settlement.preview.fee,paid:true,settlementId:settlement.id,xp:clone(settlement.xp)};
 gameState.piQuests={...qs,quests:{...qs.quests,[DEAD_MEN_QUEST]:{...q,status:'completed',completedAt:settlement.completedAt,objectives:(q.objectives||[]).map(o=>({...o,completed:true})),resolution}}};
 note('dead_men_final_report',__dialogueText("managers/DeadMenCallingFinale.js", "t_ce02ce16346ae602c210"),settlement.preview.report,__dialogueText("managers/DeadMenCallingFinale.js", "t_7767712676047e1dbbb1"));
 const inv=gameState.piInvestigations,c=inv?.cases?.[DEAD_MEN_QUEST];
 if(c)gameState.piInvestigations={...inv,cases:{...inv.cases,[DEAD_MEN_QUEST]:{...c,status:'completed',resolution:clone(resolution)}}};
}
function finish(expectedToken){
 if(busy)return {ok:false,message:__dialogueText("managers/DeadMenCallingFinale.js", "t_e30f35d1e012c01fb9b0")};
 const s=state(),q=getPIQuest(DEAD_MEN_QUEST);
 if(s.settlement?.phase==='completed'||(q?.status==='completed'&&!s.settlement))return {ok:false,message:__dialogueText("managers/DeadMenCallingFinale.js", "t_5f75bdcb38c34d25e40b")};
 if(!q)return {ok:false,message:__dialogueText("managers/DeadMenCallingFinale.js", "t_98841ecd1a26cddb2366")};
 if(!s.settlement&&(!ready()||!s.reconstructed))return {ok:false,message:__dialogueText("managers/DeadMenCallingFinale.js", "t_029a381a9a498f89ab5f")};
 const p=s.settlement?.preview||preview();
 if(!p||JSON.stringify(p)!==expectedToken)return {ok:false,message:__dialogueText("managers/DeadMenCallingFinale.js", "t_da4bd681c918025d67c9")};
 busy=true;
 try{
  let pending=s.settlement||{id:`${DEAD_MEN_QUEST}:${q.acceptedAt||'legacy-contract'}`,phase:'settling',preview:clone(p),paid:false};
  save({settlement:pending});
  if(!pending.paid&&!paid(pending.id)&&p.fee>0){
   const before=moneyManager.getState();
   try{moneyManager.addCash(p.fee,{category:ECONOMY_CATEGORY.SIDE_CASE,description:__dialogueText("managers/DeadMenCallingFinale.js", "t_9a017832ab250e548d16"),missionId:DEAD_MEN_QUEST,metadata:{deadMenSettlementId:pending.id,questId:DEAD_MEN_QUEST}});}
   catch(error){if(!paid(pending.id)){gameState.cash=before.cash;gameState.moneyLog=clone(before.moneyLog);throw error;}}
  }
  pending={...pending,paid:true,lastError:null};save({settlement:pending});
  let xpSettlement;
  try{
   xpSettlement=settleDeadMenXP(pending);
   pending={...pending,xp:xpSettlement.record,lastError:null};
   save({settlement:pending});
  }catch(error){
   console.error('[DeadMenCallingFinale] XP settlement failed:',error);
   save({settlement:{...pending,lastError:__dialogueText("managers/DeadMenCallingFinale.js", "t_0e2b19ae49054d281c3b")}});
   return {ok:false,message:__dialogueText("managers/DeadMenCallingFinale.js", "t_910d6ffa82d25f3db7bd")};
  }
  const completed={...pending,phase:'completed',completedAt:new Date().toISOString(),lastError:null};
  closeCase(completed);save({settlement:completed});
  let saved=false;
  try{saved=saveGameState()===true;}
  catch(error){console.error('[DeadMenCallingFinale] Save failed:',error);}
  const xpGranted=xpSettlement.result.success?xpSettlement.result.grantedXP:0;
  return {ok:true,saved,xpGranted,message:saved?`${__dialogueText("managers/DeadMenCallingFinale.js", "t_56e84f304751a9d98a80")}${p.fee}${__dialogueText("managers/DeadMenCallingFinale.js", "t_cdb4ee2aea69cc6a8333")}`+(xpGranted>0?`${__dialogueText("managers/DeadMenCallingFinale.js", "t_c13f23cc27f966a4eadf")}${xpGranted}${__dialogueText("managers/DeadMenCallingFinale.js", "t_a73feda6e2f76a6b740b")}`:''):__dialogueText("managers/DeadMenCallingFinale.js", "t_798b9ea756e8ee489e04")};
 }catch(error){
  console.error('[DeadMenCallingFinale] Settlement interrupted:',error);
  requestAutosave();
  return {ok:false,message:__dialogueText("managers/DeadMenCallingFinale.js", "t_8e849dc8a42c88739b70")};
 }
 finally{busy=false;}
}
export function installDeadMenFinaleMail(ui){
 const docs=ui.documents;if(docs.deadMenFinaleInstalled)return;docs.deadMenFinaleInstalled=true;
 const get=docs.getMail.bind(docs);docs.getMail=()=>{const own=ownMail(),ids=new Set(own.map(m=>m.id));return [...own,...get().filter(m=>!ids.has(m.id))];};
 const paged=docs.renderPagedText.bind(docs);let key='',choice=0,feedback='',confirmation=null;
 docs.renderPagedText=(content,x,y,w,h)=>{
  if(ui.app==='mail'&&ui.selectedId===REVIEW&&ready()&&!state().reconstructed){
   confirmation=null;const q=current();if(!q)return paged(content,x,y,w,h);
   if(key!==q.id){key=q.id;choice=0;feedback='';ui.bodyPage=0;}
   paged(content+__dialogueText("managers/DeadMenCallingFinale.js", "t_1344275fa1f473c7e1a9")+q.options[choice][0]+(feedback?'\n\n'+feedback:''),x,y,w,Math.max(24,h-42));
   ui.drawing.button(x,y+h-32,__dialogueText("managers/DeadMenCallingFinale.js", "t_e69aac4a34cce29af6bc"),()=>{if(ui.app!=='mail'||ui.selectedId!==REVIEW)return;choice=(choice+1)%q.options.length;feedback='';ui.bodyPage=0;ui.render();});
   ui.drawing.button(x+Math.max(150,Math.floor(w/2)),y+h-32,__dialogueText("managers/DeadMenCallingFinale.js", "t_1bdb867eafc7fdd5df9b"),()=>{if(ui.app!=='mail'||ui.selectedId!==REVIEW)return;const r=check(q.id,choice);feedback=r.message;ui.notice=r.message;ui.bodyPage=0;ui.render();});
   return;
  }
  if(ui.app==='mail'&&ui.selectedId===REPORT&&state().reconstructed&&active()){
   const p=state().settlement?.preview||preview();if(!p)return paged(content,x,y,w,h);
   const token=JSON.stringify(p),armed=confirmation===token;
   paged(content+(armed?__dialogueText("managers/DeadMenCallingFinale.js", "t_cf313e768b45e544a32e"):''),x,y,w,Math.max(24,h-42));
   ui.drawing.button(x,y+h-32,armed?__dialogueText("managers/DeadMenCallingFinale.js", "t_ffb5da4d490b7803ce95"):__dialogueText("managers/DeadMenCallingFinale.js", "t_b9433b1b448012d19d68"),()=>{
    if(ui.app!=='mail'||ui.selectedId!==REPORT)return;
    if(!armed){confirmation=token;ui.bodyPage=0;ui.render();return;}
    const r=finish(token);confirmation=null;ui.notice=r.message;ui.bodyPage=0;
    if(r.ok){ui.selectedId='dead_men_report_reply';ui.listPage=0;}
    ui.render();
   });
   if(armed)ui.drawing.button(x+Math.max(150,Math.floor(w/2)),y+h-32,'CANCEL',()=>{confirmation=null;ui.render();});
   return;
  }
  confirmation=null;return paged(content,x,y,w,h);
 };
 const render=docs.render.bind(docs);docs.render=()=>{render();if(ui.app==='mail')markRead(ui.selectedId);sync();};
}
function route(number){
 if(!unlocked())return null;const s=state();
 if(number==='621')return {contact:contacts[number],lines:confrontation,flag:'confronted',message:__dialogueText("managers/DeadMenCallingFinale.js", "t_2601c7429859e31202c4")};
 if(number==='619'&&s.confronted)return {contact:contacts[number],lines:consentInterview,flag:'consent',message:__dialogueText("managers/DeadMenCallingFinale.js", "t_f91a8eac6c051e8aad56")};
 if(number==='620'&&s.confronted&&s.consent)return {contact:contacts[number],lines:verificationInterview,flag:'verified',message:__dialogueText("managers/DeadMenCallingFinale.js", "t_7cceafa8427c3c8b6355")};
 return null;
}
export function installDeadMenFinalePhone(phone){
 if(phone.deadMenFinaleInstalled)return;phone.deadMenFinaleInstalled=true;let pending=null;
 const start=phone.startCall.bind(phone);phone.startCall=()=>{
  const r=route(phone.number);if(!r)return start();const number=phone.number;
  phone.cancelActivity();phone.state='ringing';phone.status=__dialogueText("managers/DeadMenCallingFinale.js", "t_f402468f7b8874bf7b48");phone.render();phone.startRing();
  phone.later(3000,()=>{if(phone.isOpen&&!phone.destroyed&&phone.state==='ringing'&&phone.number===number&&route(number))phone.connect(r.contact);});
 };
 const connect=phone.connect.bind(phone);phone.connect=contact=>{
  pending=null;const r=route(contact.number);if(!r||r.contact.id!==contact.id)return connect(contact);
  phone.investigation?.resetCall?.();phone.cancelActivity();pending=r;phone.state='connected';phone.contactName=contact.name;
  phone.lines=clone(r.lines);phone.lineIndex=0;phone.callStart=phone.scene.time.now;phone.clearLog();phone.showDialogueLine();
 };
 const next=phone.nextLine.bind(phone);phone.nextLine=()=>{
  if(!pending)return next();if(phone.state!=='connected'||phone.directoryOpen)return;
  if(phone.typingItem){phone.finishTyping(phone.typingItem);return;}
  if(phone.lineIndex<phone.lines.length-1){phone.lineIndex++;phone.showDialogueLine();return;}
  const r=pending;pending=null;if(unlocked()){save({[r.flag]:true});sync();}phone.finishCall(r.message);
 };
 const hang=phone.hangUp.bind(phone);phone.hangUp=()=>{pending=null;hang();};
 const finishCall=phone.finishCall.bind(phone);phone.finishCall=m=>{pending=null;finishCall(m);};
 const close=phone.close?.bind(phone);if(close)phone.close=()=>{pending=null;close();};
}