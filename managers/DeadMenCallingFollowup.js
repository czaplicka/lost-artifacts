import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { getPIQuest } from './PIQuestManager.js';
import { addPIEvidence } from './PIInvestigationManager.js';
import { DEAD_MEN_QUEST, getDeadMenProgress } from './DeadMenCallingService.js';

const KEY='piDeadMenCallingFollowup', REVIEW='dead_men_folder_review';
const clone=v=>JSON.parse(JSON.stringify(v));
const MARGARET={id:'dead_men_margaret',name:'Margaret Vale',number:'619',listed:true,status:'available',dialogueId:null};
const COLIN={id:'dead_men_colin',name:'Colin Ward',number:'621',listed:true,status:'available',dialogueId:null};
const folderInterview=[
 {speaker:'You',text:'The records confirm a copy went to Colin. That is access, not proof he made the calls. What is actually in the blue folder?'},
 {speaker:'Margaret Vale',text:'I checked the study. Invoice, invoice, a truly aggressive quantity of takeaway menus. Then a reconciliation sheet Edward prepared for the company.'},
 {speaker:'You',text:'Does it mention Colin?'},
 {speaker:'Margaret Vale',text:'It records an unexplained company payment against his expense claim. There is also a request asking him for the original supplier invoice. I will send scans, including the bank entry.'},
 {speaker:'You',text:'Keep the originals. A question in Edward’s notes is not a finding of theft. Has anyone asked you for these papers?'},
 {speaker:'Margaret Vale',text:'Colin emailed me before the recent calls. He wanted Edward’s original reconciliation sheet. He said he was tidying the company records. I am forwarding that email too.'},
 {speaker:'You',text:'May I contact him about the archive and those records?'},
 {speaker:'Margaret Vale',text:'Yes. His business number is 621. He may answer “Ward Consulting”. It is still Colin, only more expensive.'},
 {speaker:'You',text:'Thank you. I will compare his explanation with the documents, not assume that a disputed payment identifies a caller.'}
];
const colinInterview=[
 {speaker:'Colin Ward',text:'Ward Consulting. Clear answers, flexible invoicing.'},
 {speaker:'You',text:'I am investigating calls to Margaret Vale. I also need to ask about Edward’s archive and your request for the blue-folder papers.'},
 {speaker:'Colin Ward',text:'I asked for the original reconciliation sheet to finish the company accounts. Nothing unusual.'},
 {speaker:'You',text:'Did you receive Edward’s voice recordings from Mercer Audio?'},
 {speaker:'Colin Ward',text:'No. My copy contained invoices only. No voicemail files, no recorder test. I never received any voice recordings.'},
 {speaker:'You',text:'What can you tell me about expense claim CW-41 and payment TR-884?'},
 {speaker:'Colin Ward',text:'A supplier payment, as far as I remember. I would need to find the original invoice. I cannot give you more detail today.'},
 {speaker:'You',text:'Do you still have the material Mercer supplied?'},
 {speaker:'Colin Ward',text:'I keep business records. I do not see what that has to do with someone’s telephone.'},
 {speaker:'You',text:'Please preserve the archive and the relevant correspondence. I am recording your account as a statement to be checked.'},
 {speaker:'Colin Ward',text:'Of course. I have nothing to hide. Except client rates. Those are deeply personal.'}
];
const papers=[
 {id:'dead_men_folder_sheet',subject:'Blue folder — Edward’s reconciliation sheet',body:'SCAN TRANSCRIPTION — ORIGINAL RETAINED BY MARGARET\nSource: blue folder in Edward Vale’s study\n\nRECONCILIATION QUERY\nExpense claim: CW-41\nSubmitted by: Colin Ward\nLinked bank payment: TR-884\nAmount: $2,400\nDescription supplied with claim: supplier services\n\nEdward’s note: “Original supplier invoice not supplied. Ask Colin to explain the payment and provide the original document. Do not close the reconciliation until checked.”\n\nThis records an unresolved accounting query. It does not establish who received the money or prove theft.'},
 {id:'dead_men_folder_bank',subject:'Blue folder — company bank entry TR-884',body:'SCAN TRANSCRIPTION — COMPANY BANK ENTRY\nSource: paper retained in Edward’s blue folder\n\nReference: TR-884\nDebit: $2,400\nStatement description: services / CW-41\n\nThe excerpt confirms a company debit matching the amount and reference on the reconciliation sheet. The retained excerpt does not identify the beneficial owner of the receiving account.\n\nA bank debit is not, by itself, evidence that Colin stole money or placed the recent calls.'},
 {id:'dead_men_colin_request',subject:'Forwarded original — Colin’s request for the sheet',body:'FORWARDED ORIGINAL EMAIL\nSource: Margaret Vale’s retained correspondence\nSender: Colin Ward\nRecipient: Margaret Vale\nSent: Friday before the three recent calls\n\nMargaret,\n\nPlease let me have Edward’s original reconciliation sheet from the blue folder. I need to resolve CW-41 / TR-884 and finish the old company records. A copy will not do; please send the original with the annotations.\n\nColin\n\nThis request predates Monday’s recent voicemail. It shows interest in the original sheet, not proof that Colin made a call or committed an accounting offence.'}
];
const questions=[
 {id:'colin_denial',prompt:'Which part of Colin’s telephone statement conflicts with the Mercer records?\n\nCompare his account with manifest MV-14 and delivery acknowledgement MV-14-D2.',options:[['He received no voice files',true],['He knows Margaret',false],['He runs a business',false]],feedback:'Colin said his copy contained invoices only. The manifest lists the old recordings, and the acknowledgement records that archive delivered to him.'},
 {id:'folder_interest',prompt:'Which record establishes Colin’s interest in the original reconciliation sheet before the recent calls?',options:[['The bank entry alone',false],['Colin’s Friday email',true],['Edward’s voice alone',false]],feedback:'The forwarded Friday email names CW-41 / TR-884 and asks for the annotated original. The bank entry does not record who wanted the sheet.'},
 {id:'folder_limit',prompt:'What is the strongest supported finding?\n\nA. Colin is proved to have stolen $2,400.\nB. Colin had source access, gave an inconsistent account and wanted the original sheet; the caller is not yet proved.\nC. Edward survived.',options:[['A: Theft proved',false],['B: Leads, not proof',true],['C: Edward survived',false]],feedback:'The documents establish access, a contradiction and interest in the sheet. They do not identify the account owner or independently prove who made the calls.'}
];
function state(){
 const raw=gameState[KEY],s=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const answers=questions.filter(q=>Array.isArray(s.answers)&&s.answers.includes(q.id)).map(q=>q.id);
 return {...s,version:1,folderInterview:s.folderInterview===true,colinInterview:s.colinInterview===true,read:Array.isArray(s.read)?[...new Set(s.read.filter(id=>typeof id==='string'))]:[],answers,reviewed:questions.every(q=>answers.includes(q.id))};
}
function save(patch){gameState[KEY]={...state(),...patch,version:1};requestAutosave();}
function active(){return getPIQuest(DEAD_MEN_QUEST)?.status==='active';}
function unlocked(){return active()&&getDeadMenProgress().accessReviewed===true;}
function ready(){const s=state();return unlocked()&&s.folderInterview&&s.colinInterview&&papers.every(m=>s.read.includes(m.id));}
function current(){return questions.find(q=>!state().answers.includes(q.id))||null;}
function reviewBody(){
 const s=state();
 if(s.reviewed)return 'REVIEW RECORDED\n\nColin’s denial of receiving voice recordings conflicts with the authorised transfer records. His Friday email shows he wanted the original reconciliation sheet before the recent calls.\n\nThe sheet records an unresolved payment query. The bank excerpt confirms a debit, not theft or the caller’s identity.\n\nNEXT: Put the documentary contradiction to Colin and seek corroboration of who actually made the calls.\n\nNo final report, arrest or payment is available yet.';
 if(!ready())return 'BLUE FOLDER REVIEW\n\nComplete the call to Colin on 621 and open all three folder documents.\n\nStill to read:\n'+papers.filter(m=>!s.read.includes(m.id)).map(m=>'• '+m.subject).join('\n');
 return `BLUE FOLDER REVIEW — ${s.answers.length+1}/${questions.length}\n\n${current().prompt}\n\nUse NEXT OPTION and CHECK ANSWER. Refer to the Mercer documents and Colin’s interview when needed.`;
}
function mail(id,from,subject,body){return {id,from,subject,body,date:'Dead Men Calling — follow-up'};}
function ownMail(){
 const s=state();if(!getPIQuest(DEAD_MEN_QUEST)||(!getDeadMenProgress().accessReviewed&&!s.folderInterview))return [];
 const items=[mail('dead_men_folder_next','Your case notes','The blue folder — call Margaret', 'The access review is recorded. Call Margaret on 619 again to ask about the blue folder and obtain Colin’s business contact. Access alone is not enough to identify a caller.')];
 if(s.folderInterview)items.unshift(
  mail(REVIEW,'Your investigation notebook','Review Colin’s account and the blue folder',reviewBody()),
  mail('dead_men_folder_cover','Margaret Vale','Blue-folder scans and Colin’s number', 'Detective,\n\nI have supplied three documents: Edward’s reconciliation sheet, the bank entry and Colin’s earlier email asking for the original sheet. I have kept the originals.\n\nColin Ward’s business number is 621. Ask him about the archive and CW-41 / TR-884.\n\nThe accounts were not my responsibility. I can tell you where I found the papers, not what happened to the payment.\n\nMargaret Vale'),
  ...papers.map(m=>mail(m.id,'Margaret Vale — supplied document',m.subject,m.body))
 );
 if(s.colinInterview)items.unshift(mail('dead_men_colin_statement','Your telephone transcript','Colin Ward — account to verify',transcript(colinInterview)));
 if(s.reviewed)items.unshift(mail('dead_men_contradiction_lead','Your case notes','Next: challenge the documented contradiction','The folder review is complete. Colin’s statement about receiving no voice recordings conflicts with the archive delivery records.\n\nThis is a reason to challenge his account, not a substitute for proving who made the calls.\n\nThe confrontation and corroboration will be added in the next stage.'));
 return items;
}
function transcript(lines){return lines.map(l=>`${l.speaker}: ${l.text}`).join('\n\n');}
function note(id,label,text,meta){addPIEvidence(DEAD_MEN_QUEST,{id,label,text,metaText:meta,color:'yellow'});}
function sync(){
 const s=state();if(!getPIQuest(DEAD_MEN_QUEST))return;
 if(s.folderInterview){
  note('dead_men_folder_interview','Margaret: the blue folder',transcript(folderInterview),'Source: completed follow-up interview');
  note('dead_men_colin_contact','Colin Ward — 621','Margaret supplied Colin’s business number: 621. Ask him about the archive and the original reconciliation sheet.','Source: client contact information');
  for(const m of papers)if(s.read.includes(m.id))note(m.id,m.subject,m.body,'Source: client-supplied document transcription');
 }
 if(s.colinInterview)note('dead_men_colin_statement','Colin’s account — not verified',transcript(colinInterview),'Source: completed telephone interview');
 if(s.reviewed)note('dead_men_folder_findings','Colin: access, contradiction and document interest','Colin denied receiving voice recordings. Mercer’s manifest and delivery acknowledgement conflict with that statement. His earlier email requests the annotated original of the reconciliation sheet. The documents do not establish who made the calls or prove theft. Seek corroboration.','Source: player’s completed document review');
}
function markRead(id){if(!ownMail().some(m=>m.id===id))return;const s=state();if(!s.read.includes(id))save({read:[...s.read,id]});sync();}
function check(id,index){
 const q=current();if(!ready()||!q||q.id!==id)return {ok:false,message:'Complete the interviews and read the documents first.'};
 if(!q.options[index]?.[1])return {ok:false,message:q.feedback};
 save({answers:[...state().answers,q.id]});sync();return {ok:true,message:state().reviewed?'Review recorded. New lead on your board.':'Evidence matched. Continue.'};
}
export function installDeadMenFollowupMail(ui){
 const docs=ui.documents;if(docs.deadMenFollowupInstalled)return;docs.deadMenFollowupInstalled=true;
 const get=docs.getMail.bind(docs);docs.getMail=()=>{const own=ownMail(),ids=new Set(own.map(m=>m.id));return [...own,...get().filter(m=>!ids.has(m.id))];};
 const paged=docs.renderPagedText.bind(docs);let selectedKey='',choice=0,feedback='';
 docs.renderPagedText=(content,x,y,w,h)=>{
  if(ui.app!=='mail'||ui.selectedId!==REVIEW||!ready()||state().reviewed)return paged(content,x,y,w,h);
  const q=current();if(!q)return paged(content,x,y,w,h);
  if(selectedKey!==q.id){selectedKey=q.id;choice=0;feedback='';ui.bodyPage=0;}
  paged(content+'\n\nSelected answer: '+q.options[choice][0]+(feedback?'\n\n'+feedback:''),x,y,w,Math.max(24,h-42));
  ui.drawing.button(x,y+h-32,'NEXT OPTION',()=>{if(ui.app!=='mail'||ui.selectedId!==REVIEW)return;choice=(choice+1)%q.options.length;feedback='';ui.bodyPage=0;ui.render();});
  ui.drawing.button(x+Math.max(150,Math.floor(w/2)),y+h-32,'CHECK ANSWER',()=>{if(ui.app!=='mail'||ui.selectedId!==REVIEW)return;const result=check(q.id,choice);feedback=result.message;ui.notice=result.message;ui.bodyPage=0;ui.render();});
 };
 const render=docs.render.bind(docs);docs.render=()=>{render();if(ui.app==='mail')markRead(ui.selectedId);sync();};
}
function route(number){
 if(!unlocked())return null;
 if(number==='619')return {contact:MARGARET,lines:folderInterview,flag:'folderInterview',message:'Folder documents received. Call Colin Ward on 621.'};
 if(number==='621'&&state().folderInterview)return {contact:COLIN,lines:colinInterview,flag:'colinInterview',message:'Colin’s statement saved. Compare it with the documents.'};
 return null;
}
export function installDeadMenFollowupPhone(phone){
 if(phone.deadMenFollowupInstalled)return;phone.deadMenFollowupInstalled=true;let currentRoute=null;
 const start=phone.startCall.bind(phone);phone.startCall=()=>{
  const r=route(phone.number);if(!r)return start();const number=phone.number;
  phone.cancelActivity();phone.state='ringing';phone.status='Ringing...';phone.render();phone.startRing();
  phone.later(3000,()=>{if(phone.isOpen&&!phone.destroyed&&phone.state==='ringing'&&phone.number===number&&route(number))phone.connect(r.contact);});
 };
 const connect=phone.connect.bind(phone);phone.connect=contact=>{
  currentRoute=null;const r=route(contact.number);if(!r||r.contact.id!==contact.id)return connect(contact);
  phone.investigation?.resetCall?.();phone.cancelActivity();currentRoute=r;phone.state='connected';phone.contactName=contact.name;
  phone.lines=clone(r.lines);phone.lineIndex=0;phone.callStart=phone.scene.time.now;phone.clearLog();phone.showDialogueLine();
 };
 const next=phone.nextLine.bind(phone);phone.nextLine=()=>{
  if(!currentRoute)return next();if(phone.state!=='connected'||phone.directoryOpen)return;
  if(phone.typingItem){phone.finishTyping(phone.typingItem);return;}
  if(phone.lineIndex<phone.lines.length-1){phone.lineIndex++;phone.showDialogueLine();return;}
  const r=currentRoute;currentRoute=null;if(unlocked()){save({[r.flag]:true});sync();}phone.finishCall(r.message);
 };
 const hang=phone.hangUp.bind(phone);phone.hangUp=()=>{currentRoute=null;hang();};
 const finish=phone.finishCall.bind(phone);phone.finishCall=m=>{currentRoute=null;finish(m);};
 const close=phone.close?.bind(phone);if(close)phone.close=()=>{currentRoute=null;close();};
}
