import { gameState } from '../GameData.js';
import { requestAutosave, saveGameState } from '../gameStatePersistence.js';
import { moneyManager, ECONOMY_CATEGORY } from './MoneyManager.js';
import { getPIQuest } from './PIQuestManager.js';
import { addPIEvidence } from './PIInvestigationManager.js';
import { DEAD_MEN_QUEST, getDeadMenProgress } from './DeadMenCallingService.js';

const KEY='piDeadMenCallingFinale', REVIEW='dead_men_final_review', REPORT='dead_men_final_report_draft';
const clone=v=>JSON.parse(JSON.stringify(v));
let busy=false;
const contacts={
 '619':{id:'dead_men_margaret',number:'619',name:'Margaret Vale'},
 '620':{id:'dead_men_leo',number:'620',name:'Leo Mercer'},
 '621':{id:'dead_men_colin',number:'621',name:'Colin Ward'}
};
const confrontation=[
 {speaker:'You',text:'You said you received invoices only. Manifest MV-14 and acknowledgement MV-14-D2 record delivery to you of the archive containing the voice recordings. How do you explain that?'},
 {speaker:'Colin Ward',text:'I received the recordings. I should not have denied it.'},
 {speaker:'You',text:'Your Friday email also asks for Edward’s original reconciliation sheet. Did you make the three calls to Margaret?'},
 {speaker:'Colin Ward',text:'Yes. I assembled the messages from Edward’s old recordings and sent them through my business voice-message relay. Monday, Tuesday and Wednesday. I set all three for 20:14.'},
 {speaker:'You',text:'Why use Edward’s voice?'},
 {speaker:'Colin Ward',text:'Margaret had ignored my request for the original sheet. Edward’s annotations raised questions about my expense claim. I wanted the sheet out of her hands before anyone checked it. I thought his voice would make her listen.'},
 {speaker:'You',text:'That is your account. It does not settle where the $2,400 went. Will you supply the project and authorise release of the relay dispatch records?'},
 {speaker:'Colin Ward',text:'Yes. I will send the editing project and authorise the relay provider to release the relevant dispatch records to you. Keep the unrelated client details out of it.'},
 {speaker:'You',text:'Preserve the files and originals. Do not contact Margaret about the folder again. I will have the recordings and dispatch evidence checked before reporting.'},
 {speaker:'Colin Ward',text:'Understood. I suppose “creative communications” will not look good on the invoice.'}
];
const consentInterview=[
 {speaker:'You',text:'Colin admits assembling and sending the messages. I am seeking corroboration rather than relying on his statement alone.'},
 {speaker:'Margaret Vale',text:'Good. He has already supplied one version of events too many.'},
 {speaker:'You',text:'May Leo Mercer compare your original recent recordings with Edward’s archive and the project Colin supplied? He needs the actual files, not these transcripts.'},
 {speaker:'Margaret Vale',text:'Yes. I have sent written permission and copies of the preserved original recordings to Leo. I will retain my originals and the papers.'},
 {speaker:'You',text:'The voice-message relay is supplying the authorised dispatch records. I will include only the relevant entries in your report.'},
 {speaker:'Margaret Vale',text:'Thank you. Please establish who called me. The accounts can be checked separately. I hired a detective, not a haunted calculator.'}
];
const verificationInterview=[
 {speaker:'Leo Mercer',text:'I have Margaret’s written permission and the original recent recording files, the older archive, and Colin’s supplied editing project.'},
 {speaker:'You',text:'What does the comparison establish?'},
 {speaker:'Leo Mercer',text:'The project’s selected voice segments correspond to the old recordings, and its three exports match the three recent messages. The repeated background comes from the recorder test. My written report lists the source segments and compared exports.'},
 {speaker:'You',text:'Does an audio match alone tell us who sent them?'},
 {speaker:'Leo Mercer',text:'No. It corroborates assembly from the supplied sources. Identity and dispatch require the separate relay records and the recorded statement.'},
 {speaker:'You',text:'And the company payment?'},
 {speaker:'Leo Mercer',text:'Outside my analysis. Audio restoration is not a qualification in accountancy, however many invoices I send.'},
 {speaker:'You',text:'Please preserve your working copies and provide the report. I will distinguish the supported telephone findings from the unresolved accounting query.'}
];
const relay={id:'dead_men_relay_records',subject:'Authorised relay dispatch records — three messages',body:'VOICE-MESSAGE RELAY — AUTHORISED DISPATCH EXTRACT\nSource: relay provider, released under Colin Ward’s written account-holder authorisation\nAccount holder: Colin Ward / Ward Consulting\nRecipient: Margaret Vale’s line, verified against the number supplied by the client\n\nMonday — 20:14 — file CW-MON — delivered\nTuesday — 20:14 — file CW-TUE — delivered\nWednesday — 20:14 — file CW-WED — delivered\n\nEach attached dispatch receipt identifies the retained audio payload for that entry. The delivered payloads are the three files submitted for Leo Mercer’s comparison. Unrelated recipient and client records are omitted.\n\nThese records corroborate dispatch from Colin’s business relay account. Read them together with the compared audio and Colin’s recorded admission; account ownership alone is not a universal proof of who operated an account.'};
const project={id:'dead_men_edit_project',subject:'Colin’s supplied project — source and export manifest',body:'SUPPLIED EDITING PROJECT — MANIFEST\nSource: Colin Ward, provided after confrontation\n\nSources referenced:\nArchive A — blue-folder voicemail\nArchive B — office recorder test\nArchive C — anniversary message\n\nExports supplied:\nCW-MON — Monday message\nCW-TUE — Tuesday message\nCW-WED — Wednesday message\n\nColin identifies this as the project he used. The supplied manifest is not independent proof by itself. Compare the exports with the client’s original recent recordings and the dispatch payloads.'};
const technical={id:'dead_men_audio_report',subject:'Mercer Audio — original-file comparison report',body:'ORIGINAL-FILE COMPARISON — MERCER AUDIO\nAnalyst: Leo Mercer\nAuthority: Margaret Vale’s written permission\n\nMaterials compared: client-preserved recent voicemail files; archive MV-14; Colin Ward’s supplied editing project and exports; authorised relay payloads CW-MON/CW-TUE/CW-WED.\n\nFindings:\n1. The project selects spoken segments from Archives A and C.\n2. The repeated background is drawn from the office recorder test, Archive B.\n3. The three supplied exports correspond to the client’s three recent messages and to the retained relay payloads.\n\nThis corroborates assembly and the connection between exported messages and dispatch records. It is not a determination of an accounting offence, a conviction, or proof that no additional copies exist.\n\nMaterials and working copies retained for the client’s further enquiries.'};
const questions=[
 {id:'caller',prompt:'Who is supported as the maker and sender of these three messages, and by what combination of evidence?',options:[['Colin: admission + records',true],['Margaret: voice alone',false],['Leo: archive access',false]],feedback:'Use Colin’s recorded admission together with the original-file comparison and authorised dispatch records, not access alone.'},
 {id:'method',prompt:'How were the messages made?',options:[['Edward spoke live',false],['Edited old recordings',true],['A caller was identified by a tram',false]],feedback:'The audio report connects the exported messages to segments from Archives A/C and background from B.'},
 {id:'motive',prompt:'What motive can you report without inventing an accounting verdict?',options:[['Proven theft of $2,400',false],['Anniversary surprise',false],['Recover the annotated sheet',true]],feedback:'Colin says he wanted the original sheet removed before scrutiny of his claim. The payment’s ultimate destination remains unresolved.'}
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
function note(id,label,text,meta='Source: case records'){addPIEvidence(DEAD_MEN_QUEST,{id,label,text,metaText:meta,color:'yellow'});}
function sync(){
 const s=state();if(!getPIQuest(DEAD_MEN_QUEST))return;
 if(s.confronted)note('dead_men_confrontation','Colin: recorded admission',transcript(confrontation),'Source: completed confrontation — admission to be corroborated');
 if(s.consent)note('dead_men_audio_consent','Margaret: permission for original-audio comparison',transcript(consentInterview),'Source: completed client interview');
 if(s.verified)note('dead_men_verification_call','Leo: original-file comparison',transcript(verificationInterview),'Source: completed analyst interview');
 for(const m of [relay,project,...(s.verified?[technical]:[])])if(s.confronted&&s.read.includes(m.id))note(m.id,m.subject,m.body);
}
function reviewBody(){
 const s=state();if(s.reconstructed)return 'RECONSTRUCTION RECORDED\n\nColin admits assembling and sending the messages. The compared original audio and authorised dispatch records corroborate his account. He says he wanted the annotated sheet before his expense claim was checked.\n\nThis does not establish an accounting offence.\n\nOpen Final report — Dead Men Calling to review the report and choose whether to send it.';
 if(!ready())return 'FINAL RECONSTRUCTION\n\nComplete the confrontation, Margaret’s audio permission and Leo’s comparison call. Open the relay records, supplied project and audio report before answering.';
 return `FINAL RECONSTRUCTION — ${s.answers.length+1}/${questions.length}\n\n${current().prompt}\n\nChoose with NEXT OPTION, then CHECK ANSWER.`;
}
function reportText(){return 'Margaret,\n\nThe three recent messages were assembled and sent by Colin Ward. After being confronted with the archive records, he admitted using Edward’s older recordings and his business voice-message relay.\n\nLeo Mercer’s original-file comparison connects the editing project and exports to your preserved voicemail recordings and to the authorised relay payloads. The provider’s records document the three corresponding dispatches from Colin’s account at 20:14 on Monday, Tuesday and Wednesday. These findings corroborate the recorded admission.\n\nThe voice segments came from Archives A and C, with the repeated background from the recorder test in Archive B. The messages do not require Edward to have spoken after his death.\n\nColin says he wanted Edward’s original annotated reconciliation sheet removed before questions about CW-41 / TR-884 were checked. His earlier request supports his interest in that document. The retained bank excerpt confirms a debit, not where the money ultimately went. I make no finding of theft or other accounting offence.\n\nKeep the original recordings, documents and the supplied records. They can support any further action you choose. This report closes my enquiry into these three calls; it is not an arrest, conviction or resolution of the company accounts.\n\nPrivate Investigator';}
function preview(){
 const q=getPIQuest(DEAD_MEN_QUEST);if(!q||!Number.isInteger(q.reward)||q.reward<0)return null;
 return {report:reportText(),fee:q.reward};
}
function mail(id,from,subject,body,date='Dead Men Calling — final enquiries'){return {id,from,subject,body,date};}
function ownMail(){
 const s=state(),q=getPIQuest(DEAD_MEN_QUEST);
 if(!q||(!unlocked()&&!s.confronted&&!s.settlement))return [];
 const items=[];
 if(q.status==='active')items.push(mail('dead_men_confront_next','Your case notes','Confront Colin — call 621','The folder review is complete. Call Colin on 621 again and put the archive manifest and delivery acknowledgement to him. Record his explanation and seek corroboration.'));
 if(s.confronted)items.unshift(
  mail('dead_men_admission_copy','Your telephone transcript','Colin’s admission — corroboration required',transcript(confrontation)),
  mail('dead_men_audio_next','Your case notes','Original audio — obtain Margaret’s permission','Colin has authorised release of the relay records and supplied an editing project. Call Margaret on 619 for permission to compare her original recent recordings. Then call Leo on 620.'),
  mail(relay.id,'Relay provider — authorised extract',relay.subject,relay.body),
  mail(project.id,'Colin Ward — supplied material',project.subject,project.body)
 );
 if(s.consent)items.unshift(mail('dead_men_consent_copy','Margaret Vale','Written permission — original recording comparison','I authorise Leo Mercer to compare my preserved recent voicemail recordings with the older archive and the supplied project and relay payloads. I have provided copies of the original recent files and retained my originals. — Margaret Vale\n\nCall Leo on 620 to obtain his findings.'));
 if(s.verified)items.unshift(mail(REVIEW,'Your investigation notebook','Reconstruct Dead Men Calling',reviewBody()),mail(technical.id,'Mercer Audio',technical.subject,technical.body));
 if(s.reconstructed&&!s.settlement?.phase?.includes('completed')){
  const p=s.settlement?.preview||preview();
  if(p)items.unshift(mail(REPORT,'Your case file','Final report — Dead Men Calling',p.report+`\n\nCONTRACT FEE: $${p.fee}\n\nReview the report, then choose PREPARE SEND. The fee is credited only when you confirm sending the report.`));
 }
 if(s.settlement?.phase==='completed')items.unshift(
  mail('dead_men_report_reply','Margaret Vale','Re: Dead Men Calling — case closed','Detective,\n\nThank you for giving me an explanation supported by records. I have paid the agreed fee. The accounts will go to an accountant.\n\nI will keep the originals. I have also changed my voicemail greeting. It now asks the living to leave a message and everyone else to stop wasting my time.\n\nMargaret Vale','Case closed'),
  mail('dead_men_report_sent','You → Margaret Vale','Sent: Dead Men Calling — final report',s.settlement.preview.report,'Case closed')
 );
 return items;
}
function markRead(id){if(!ownMail().some(m=>m.id===id))return;const s=state();if(!s.read.includes(id))save({read:[...s.read,id]});sync();}
function check(id,index){
 const q=current();if(!ready()||!q||q.id!==id)return {ok:false,message:'Complete the evidence checks first.'};
 if(!q.options[index]?.[1])return {ok:false,message:q.feedback};
 save({answers:[...state().answers,q.id]});sync();
 if(state().reconstructed)note('dead_men_final_reconstruction','Reconstruction: the three calls','Colin’s recorded admission is corroborated by the compared original recordings, supplied exports and authorised relay records. His stated purpose was to recover the annotated sheet before scrutiny. The company payment remains an unresolved accounting query.','Source: player’s completed reconstruction');
 return {ok:true,message:state().reconstructed?'Reconstruction recorded. Review your final report.':'Conclusion supported. Continue.'};
}
function paid(id){return (gameState.moneyLog||[]).some(t=>t.type==='income'&&t.source==='cash'&&t.metadata?.deadMenSettlementId===id);}
function closeCase(settlement){
 const qs=gameState.piQuests,q=qs?.quests?.[DEAD_MEN_QUEST];if(!q)throw Error('Contract missing.');
 const resolution={summary:'Colin’s assembled messages and dispatch were established; company accounts remain unresolved.',reward:settlement.preview.fee,paid:true,settlementId:settlement.id};
 gameState.piQuests={...qs,quests:{...qs.quests,[DEAD_MEN_QUEST]:{...q,status:'completed',completedAt:settlement.completedAt,objectives:(q.objectives||[]).map(o=>({...o,completed:true})),resolution}}};
 note('dead_men_final_report','Final report — Dead Men Calling',settlement.preview.report,'Report sent to Margaret Vale');
 const inv=gameState.piInvestigations,c=inv?.cases?.[DEAD_MEN_QUEST];
 if(c)gameState.piInvestigations={...inv,cases:{...inv.cases,[DEAD_MEN_QUEST]:{...c,status:'completed',resolution:clone(resolution)}}};
}
function finish(expectedToken){
 if(busy)return {ok:false,message:'Processing the report.'};
 const s=state(),q=getPIQuest(DEAD_MEN_QUEST);
 if(s.settlement?.phase==='completed'||(q?.status==='completed'&&!s.settlement))return {ok:false,message:'The case has already been closed.'};
 if(!q)return {ok:false,message:'The contract is missing.'};
 if(!s.settlement&&(!ready()||!s.reconstructed))return {ok:false,message:'Complete the reconstruction first.'};
 const p=s.settlement?.preview||preview();
 if(!p||JSON.stringify(p)!==expectedToken)return {ok:false,message:'Report or payment changed. Review it again.'};
 busy=true;
 try{
  let pending=s.settlement||{id:`${DEAD_MEN_QUEST}:${q.acceptedAt||'legacy-contract'}`,phase:'settling',preview:clone(p),paid:false};
  save({settlement:pending});
  if(!pending.paid&&!paid(pending.id)&&p.fee>0){
   const before=moneyManager.getState();
   try{moneyManager.addCash(p.fee,{category:ECONOMY_CATEGORY.SIDE_CASE,description:'PI case closed: Dead Men Calling',missionId:DEAD_MEN_QUEST,metadata:{deadMenSettlementId:pending.id,questId:DEAD_MEN_QUEST}});}
   catch(error){if(!paid(pending.id)){gameState.cash=before.cash;gameState.moneyLog=clone(before.moneyLog);throw error;}}
  }
  pending={...pending,paid:true};save({settlement:pending});
  const completed={...pending,phase:'completed',completedAt:new Date().toISOString()};
  closeCase(completed);save({settlement:completed});
  let saved=false;try{saved=saveGameState()===true;}catch(error){}
  return {ok:true,message:saved?`Case closed. Received $${p.fee}.`:'Case closed. Saving failed — save your game before leaving.'};
 }catch(error){requestAutosave();return {ok:false,message:'Settlement interrupted. Retry the same report; a recorded payment will not repeat.'};}
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
   paged(content+'\n\nSelected answer: '+q.options[choice][0]+(feedback?'\n\n'+feedback:''),x,y,w,Math.max(24,h-42));
   ui.drawing.button(x,y+h-32,'NEXT OPTION',()=>{if(ui.app!=='mail'||ui.selectedId!==REVIEW)return;choice=(choice+1)%q.options.length;feedback='';ui.bodyPage=0;ui.render();});
   ui.drawing.button(x+Math.max(150,Math.floor(w/2)),y+h-32,'CHECK ANSWER',()=>{if(ui.app!=='mail'||ui.selectedId!==REVIEW)return;const r=check(q.id,choice);feedback=r.message;ui.notice=r.message;ui.bodyPage=0;ui.render();});
   return;
  }
  if(ui.app==='mail'&&ui.selectedId===REPORT&&state().reconstructed&&active()){
   const p=state().settlement?.preview||preview();if(!p)return paged(content,x,y,w,h);
   const token=JSON.stringify(p),armed=confirmation===token;
   paged(content+(armed?'\n\nCONFIRMATION: Send this exact report to Margaret and credit the displayed contract fee?':''),x,y,w,Math.max(24,h-42));
   ui.drawing.button(x,y+h-32,armed?'CONFIRM SEND':'PREPARE SEND',()=>{
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
 if(number==='621')return {contact:contacts[number],lines:confrontation,flag:'confronted',message:'Admission recorded. Seek Margaret’s audio permission on 619.'};
 if(number==='619'&&s.confronted)return {contact:contacts[number],lines:consentInterview,flag:'consent',message:'Permission recorded. Call Leo on 620 for his comparison.'};
 if(number==='620'&&s.confronted&&s.consent)return {contact:contacts[number],lines:verificationInterview,flag:'verified',message:'Analyst report received. Complete your final reconstruction.'};
 return null;
}
export function installDeadMenFinalePhone(phone){
 if(phone.deadMenFinaleInstalled)return;phone.deadMenFinaleInstalled=true;let pending=null;
 const start=phone.startCall.bind(phone);phone.startCall=()=>{
  const r=route(phone.number);if(!r)return start();const number=phone.number;
  phone.cancelActivity();phone.state='ringing';phone.status='Ringing...';phone.render();phone.startRing();
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
