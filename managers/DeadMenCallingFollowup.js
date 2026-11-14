import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { deadMenTopicTranscript } from './DeadMenPhoneTopics.js';
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { getPIQuest } from './PIQuestManager.js';
import { addPIEvidence } from './PIInvestigationManager.js';
import { DEAD_MEN_QUEST, getDeadMenProgress } from './DeadMenCallingService.js';

const KEY='piDeadMenCallingFollowup', REVIEW='dead_men_folder_review';
const clone=v=>JSON.parse(JSON.stringify(v));
const MARGARET={id:'dead_men_margaret',name:__dialogueText("managers/DeadMenCallingFollowup.js", "t_e3683593d8ba71a5c369"),number:'619',listed:true,status:'available',dialogueId:null};
const COLIN={id:'dead_men_colin',name:__dialogueText("managers/DeadMenCallingFollowup.js", "t_b7e5ae2ffc6f69bea5b4"),number:'621',listed:true,status:'available',dialogueId:null};
const folderInterview=[
 {speaker:__dialogueText("managers/DeadMenCallingFollowup.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFollowup.js", "t_ddb6b3e272d219c776a6")},
 {speaker:__dialogueText("managers/DeadMenCallingFollowup.js", "t_e3683593d8ba71a5c369"),text:__dialogueText("managers/DeadMenCallingFollowup.js", "t_194f2c82d1c85486cbb5")},
 {speaker:__dialogueText("managers/DeadMenCallingFollowup.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFollowup.js", "t_4cc7e6fef64e17476a7a")},
 {speaker:__dialogueText("managers/DeadMenCallingFollowup.js", "t_e3683593d8ba71a5c369"),text:__dialogueText("managers/DeadMenCallingFollowup.js", "t_50e006b46ecafdca6f7d")},
 {speaker:__dialogueText("managers/DeadMenCallingFollowup.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFollowup.js", "t_9fc161b4ca65fa9ed586")},
 {speaker:__dialogueText("managers/DeadMenCallingFollowup.js", "t_e3683593d8ba71a5c369"),text:__dialogueText("managers/DeadMenCallingFollowup.js", "t_326719a9c43817fb87d2")},
 {speaker:__dialogueText("managers/DeadMenCallingFollowup.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFollowup.js", "t_66c1d87b9ce75c5b2a4c")},
 {speaker:__dialogueText("managers/DeadMenCallingFollowup.js", "t_e3683593d8ba71a5c369"),text:__dialogueText("managers/DeadMenCallingFollowup.js", "t_37e5773cc3553a54458f")},
 {speaker:__dialogueText("managers/DeadMenCallingFollowup.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFollowup.js", "t_91b9e99b232c54313aa9")}
];
const colinInterview=[
 {speaker:__dialogueText("managers/DeadMenCallingFollowup.js", "t_b7e5ae2ffc6f69bea5b4"),text:__dialogueText("managers/DeadMenCallingFollowup.js", "t_8cfc084730be7f544a1e")},
 {speaker:__dialogueText("managers/DeadMenCallingFollowup.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFollowup.js", "t_4baaa1bd5716c92319f7")},
 {speaker:__dialogueText("managers/DeadMenCallingFollowup.js", "t_b7e5ae2ffc6f69bea5b4"),text:__dialogueText("managers/DeadMenCallingFollowup.js", "t_9f62a8d5da765b804524")},
 {speaker:__dialogueText("managers/DeadMenCallingFollowup.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFollowup.js", "t_743b543cf0a421c570dd")},
 {speaker:__dialogueText("managers/DeadMenCallingFollowup.js", "t_b7e5ae2ffc6f69bea5b4"),text:__dialogueText("managers/DeadMenCallingFollowup.js", "t_6568d7526b3f6bf099d7")},
 {speaker:__dialogueText("managers/DeadMenCallingFollowup.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFollowup.js", "t_476fde4a85a9732d5d20")},
 {speaker:__dialogueText("managers/DeadMenCallingFollowup.js", "t_b7e5ae2ffc6f69bea5b4"),text:__dialogueText("managers/DeadMenCallingFollowup.js", "t_bc202d21123af22e056b")},
 {speaker:__dialogueText("managers/DeadMenCallingFollowup.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFollowup.js", "t_126489ac6e4d84e101fa")},
 {speaker:__dialogueText("managers/DeadMenCallingFollowup.js", "t_b7e5ae2ffc6f69bea5b4"),text:__dialogueText("managers/DeadMenCallingFollowup.js", "t_fd096a0263b8bb212f5e")},
 {speaker:__dialogueText("managers/DeadMenCallingFollowup.js", "t_08b041935798fbf6fd6f"),text:__dialogueText("managers/DeadMenCallingFollowup.js", "t_712f4738c9d7ba41c07f")},
 {speaker:__dialogueText("managers/DeadMenCallingFollowup.js", "t_b7e5ae2ffc6f69bea5b4"),text:__dialogueText("managers/DeadMenCallingFollowup.js", "t_ab2dd21542d0dd5188e6")}
];
const papers=[
 {id:'dead_men_folder_sheet',subject:__dialogueText("managers/DeadMenCallingFollowup.js", "t_effbb3ffa9b0d996f69b"),body:__dialogueText("managers/DeadMenCallingFollowup.js", "t_31d67c3d47dfb3a37e25")},
 {id:'dead_men_folder_bank',subject:__dialogueText("managers/DeadMenCallingFollowup.js", "t_4d90a11db78aaf5aac08"),body:__dialogueText("managers/DeadMenCallingFollowup.js", "t_e2b60e47e25169863774")},
 {id:'dead_men_colin_request',subject:__dialogueText("managers/DeadMenCallingFollowup.js", "t_058a16d5503288911a81"),body:__dialogueText("managers/DeadMenCallingFollowup.js", "t_435e41e42a6c7d2129e3")}
];
const questions=[
 {id:'colin_denial',prompt:__dialogueText("managers/DeadMenCallingFollowup.js", "t_710d2fb30006c62739f9"),options:[[__dialogueText("managers/DeadMenCallingFollowup.js", "t_6d8ae609cca1233f63d9"),true],[__dialogueText("managers/DeadMenCallingFollowup.js", "t_a97f1db17bd012f769ff"),false],[__dialogueText("managers/DeadMenCallingFollowup.js", "t_93ea893f0290d0deb3fe"),false]],feedback:__dialogueText("managers/DeadMenCallingFollowup.js", "t_55f3e62b027460014954")},
 {id:'folder_interest',prompt:__dialogueText("managers/DeadMenCallingFollowup.js", "t_6fa0d014b1a68687b5d5"),options:[[__dialogueText("managers/DeadMenCallingFollowup.js", "t_f842c66c0d4e701824bb"),false],[__dialogueText("managers/DeadMenCallingFollowup.js", "t_b07e21a00f800bd4dfd5"),true],[__dialogueText("managers/DeadMenCallingFollowup.js", "t_23820c17149b973292c3"),false]],feedback:__dialogueText("managers/DeadMenCallingFollowup.js", "t_d08980fd17eaef28e72e")},
 {id:'folder_limit',prompt:__dialogueText("managers/DeadMenCallingFollowup.js", "t_92b994b3c98465ab8124"),options:[[__dialogueText("managers/DeadMenCallingFollowup.js", "t_e3e9e9591cf5d563621c"),false],[__dialogueText("managers/DeadMenCallingFollowup.js", "t_d066693c380ad7bc7fdc"),true],[__dialogueText("managers/DeadMenCallingFollowup.js", "t_f9b58369c97359129ef4"),false]],feedback:__dialogueText("managers/DeadMenCallingFollowup.js", "t_f853a9e4f52deba2a30d")}
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
 if(s.reviewed)return __dialogueText("managers/DeadMenCallingFollowup.js", "t_6a03fa6f5d6b92b6ebd3");
 if(!ready())return __dialogueText("managers/DeadMenCallingFollowup.js", "t_649446dce6757bb2490f")+papers.filter(m=>!s.read.includes(m.id)).map(m=>'• '+m.subject).join('\n');
 return `${__dialogueText("managers/DeadMenCallingFollowup.js", "t_1a760298cc1f04bacae2")}${s.answers.length+1}${__dialogueText("managers/DeadMenCallingFollowup.js", "t_8a5edab282632443219e")}${questions.length}${__dialogueText("managers/DeadMenCallingFollowup.js", "t_75a11da44c802486bc6f")}${current().prompt}${__dialogueText("managers/DeadMenCallingFollowup.js", "t_92813312818441a3f90e")}`;
}
function mail(id,from,subject,body){return {id,from,subject,body,date:__dialogueText("managers/DeadMenCallingFollowup.js", "t_7a5a670df89c5716190d")};}
function ownMail(){
 const s=state();if(!getPIQuest(DEAD_MEN_QUEST)||(!getDeadMenProgress().accessReviewed&&!s.folderInterview))return [];
 const items=[mail('dead_men_folder_next',__dialogueText("managers/DeadMenCallingFollowup.js", "t_c8bd0e9ce96dc602d59e"),__dialogueText("managers/DeadMenCallingFollowup.js", "t_39f37bcddfb4e7195339"), __dialogueText("managers/DeadMenCallingFollowup.js", "t_30a6bc382c325cd40193"))];
 if(s.folderInterview)items.unshift(
  mail(REVIEW,__dialogueText("managers/DeadMenCallingFollowup.js", "t_246d256c733195b4c2b3"),__dialogueText("managers/DeadMenCallingFollowup.js", "t_6140fb3347bccfabd792"),reviewBody()),
  mail('dead_men_folder_cover',__dialogueText("managers/DeadMenCallingFollowup.js", "t_e3683593d8ba71a5c369"),__dialogueText("managers/DeadMenCallingFollowup.js", "t_f8b00fd9a9a27fee6617"), __dialogueText("managers/DeadMenCallingFollowup.js", "t_4a59b8438edaf4c9eeb0")),
  ...papers.map(m=>mail(m.id,__dialogueText("managers/DeadMenCallingFollowup.js", "t_354bc8e888bacd85aa74"),m.subject,m.body))
 );
 if(s.colinInterview)items.unshift(mail('dead_men_colin_statement',__dialogueText("managers/DeadMenCallingFollowup.js", "t_8aa2f38d4bd552719548"),__dialogueText("managers/DeadMenCallingFollowup.js", "t_850fecd6a4a60e66041b"),(deadMenTopicTranscript('colin_initial') || transcript(colinInterview))));
 if(s.reviewed)items.unshift(mail('dead_men_contradiction_lead',__dialogueText("managers/DeadMenCallingFollowup.js", "t_c8bd0e9ce96dc602d59e"),__dialogueText("managers/DeadMenCallingFollowup.js", "t_f68ad2b258fe22032407"),__dialogueText("managers/DeadMenCallingFollowup.js", "t_8252642a3b5eb6a5075d")));
 return items;
}
function transcript(lines){return lines.map(l=>`${l.speaker}: ${l.text}`).join('\n\n');}
function note(id,label,text,meta){addPIEvidence(DEAD_MEN_QUEST,{id,label,text,metaText:meta,color:'yellow'});}
function sync(){
 const s=state();if(!getPIQuest(DEAD_MEN_QUEST))return;
 if(s.folderInterview){
  note('dead_men_folder_interview',__dialogueText("managers/DeadMenCallingFollowup.js", "t_cd4a71c65472bf0d48b1"),(deadMenTopicTranscript('margaret_folder') || transcript(folderInterview)),__dialogueText("managers/DeadMenCallingFollowup.js", "t_ab89f825bf761a296c65"));
  note('dead_men_colin_contact',__dialogueText("managers/DeadMenCallingFollowup.js", "t_b7e5ae2ffc6f69bea5b4"),__dialogueText("managers/DeadMenCallingFollowup.js", "t_f75646effba06baa593d"),__dialogueText("managers/DeadMenCallingFollowup.js", "t_1186779f6df8af147d29"));
  for(const m of papers)if(s.read.includes(m.id))note(m.id,m.subject,m.body,__dialogueText("managers/DeadMenCallingFollowup.js", "t_d70acc32c60f4eeb3b53"));
 }
 if(s.colinInterview)note('dead_men_colin_statement',__dialogueText("managers/DeadMenCallingFollowup.js", "t_be84d35b0fcc28372563"),(deadMenTopicTranscript('colin_initial') || transcript(colinInterview)),__dialogueText("managers/DeadMenCallingFollowup.js", "t_aeb345dd503c04564c55"));
 if(s.reviewed)note('dead_men_folder_findings',__dialogueText("managers/DeadMenCallingFollowup.js", "t_237fec51c016645f8c5c"),__dialogueText("managers/DeadMenCallingFollowup.js", "t_946dbce71edfd2c8e76f"),__dialogueText("managers/DeadMenCallingFollowup.js", "t_02ff5745b5e99cdd11cf"));
}
function markRead(id){if(!ownMail().some(m=>m.id===id))return;const s=state();if(!s.read.includes(id))save({read:[...s.read,id]});sync();}
function check(id,index){
 const q=current();if(!ready()||!q||q.id!==id)return {ok:false,message:__dialogueText("managers/DeadMenCallingFollowup.js", "t_8f03c1a43f65cfc7c6c6")};
 if(!q.options[index]?.[1])return {ok:false,message:q.feedback};
 save({answers:[...state().answers,q.id]});sync();return {ok:true,message:state().reviewed?__dialogueText("managers/DeadMenCallingFollowup.js", "t_fa83ffaad84134de4dcd"):__dialogueText("managers/DeadMenCallingFollowup.js", "t_5016ad967c6a1a6662c0")};
}
export function installDeadMenFollowupMail(ui){
 const docs=ui.documents;if(docs.deadMenFollowupInstalled)return;docs.deadMenFollowupInstalled=true;
 const get=docs.getMail.bind(docs);docs.getMail=()=>{const own=ownMail(),ids=new Set(own.map(m=>m.id));return [...own,...get().filter(m=>!ids.has(m.id))];};
 const paged=docs.renderPagedText.bind(docs);let selectedKey='',choice=0,feedback='';
 docs.renderPagedText=(content,x,y,w,h)=>{
  if(ui.app!=='mail'||ui.selectedId!==REVIEW||!ready()||state().reviewed)return paged(content,x,y,w,h);
  const q=current();if(!q)return paged(content,x,y,w,h);
  if(selectedKey!==q.id){selectedKey=q.id;choice=0;feedback='';ui.bodyPage=0;}
  paged(content+__dialogueText("managers/DeadMenCallingFollowup.js", "t_1344275fa1f473c7e1a9")+q.options[choice][0]+(feedback?'\n\n'+feedback:''),x,y,w,Math.max(24,h-42));
  ui.drawing.button(x,y+h-32,__dialogueText("managers/DeadMenCallingFollowup.js", "t_e69aac4a34cce29af6bc"),()=>{if(ui.app!=='mail'||ui.selectedId!==REVIEW)return;choice=(choice+1)%q.options.length;feedback='';ui.bodyPage=0;ui.render();});
  ui.drawing.button(x+Math.max(150,Math.floor(w/2)),y+h-32,__dialogueText("managers/DeadMenCallingFollowup.js", "t_1bdb867eafc7fdd5df9b"),()=>{if(ui.app!=='mail'||ui.selectedId!==REVIEW)return;const result=check(q.id,choice);feedback=result.message;ui.notice=result.message;ui.bodyPage=0;ui.render();});
 };
 const render=docs.render.bind(docs);docs.render=()=>{render();if(ui.app==='mail')markRead(ui.selectedId);sync();};
}
function route(number){
 if(!unlocked())return null;
 if(number==='619')return {contact:MARGARET,lines:folderInterview,flag:'folderInterview',message:__dialogueText("managers/DeadMenCallingFollowup.js", "t_37ed958c18fb511bba82")};
 if(number==='621'&&state().folderInterview)return {contact:COLIN,lines:colinInterview,flag:'colinInterview',message:__dialogueText("managers/DeadMenCallingFollowup.js", "t_67b8ac208dbfa20ac81d")};
 return null;
}
export function installDeadMenFollowupPhone(phone){
 if(phone.deadMenFollowupInstalled)return;phone.deadMenFollowupInstalled=true;let currentRoute=null;
 const start=phone.startCall.bind(phone);phone.startCall=()=>{
  const r=route(phone.number);if(!r)return start();const number=phone.number;
  phone.cancelActivity();phone.state='ringing';phone.status=__dialogueText("managers/DeadMenCallingFollowup.js", "t_f402468f7b8874bf7b48");phone.render();phone.startRing();
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
