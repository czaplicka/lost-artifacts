import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { registerPICase, addPIEvidence } from './PIInvestigationManager.js';
import { STAFF, FACTS, DEDUCTIONS } from '../assets/data/deadMailChapterTwo.js';

// Keep the existing ID and export names to preserve saves and chapter imports.
export const DEAD_MAIL_PREVIEW_CASE = 'pi_dead_mail_preview';
export function isDeadMailPreviewEnabled() {
  const quest = gameState.piQuests?.quests?.[DEAD_MAIL_PREVIEW_CASE];
  if (quest?.metadata?.contentId === 'dead_mail' && ['active','completed'].includes(quest.status)) return true;
  return typeof window !== 'undefined' &&
    ['localhost','127.0.0.1','[::1]'].includes(window.location.hostname) &&
    new URLSearchParams(window.location.search).get('devDeadMail') === '1';
}
const initial = () => ({version:1,stage:'mail',clues:[],questions:[],attempts:0,chapterComplete:false,
  cemeteryFacts:[],staffTopics:[],deductions:[],dayComplete:false});
const unique = a => [...new Set(Array.isArray(a)?a.filter(x=>typeof x==='string'):[])];
export function getDeadMailProgress(){
  const s=gameState.deadMailPreview;
  if(!s||s.version!==1||typeof s!=='object'||Array.isArray(s))return initial();
  return {...initial(),...s,clues:unique(s.clues).filter(x=>['plot','angel','label'].includes(x)),
    questions:unique(s.questions).filter(x=>['pulse','order','work'].includes(x)),
    cemeteryFacts:unique(s.cemeteryFacts).filter(x=>Object.hasOwn(FACTS,x)),
    staffTopics:unique(s.staffTopics),deductions:unique(s.deductions).filter(x=>DEDUCTIONS.some(d=>d.id===x))};
}
function commit(s){gameState.deadMailPreview=s;requestAutosave();return s;}
function note(id,label,text,metaText=__dialogueText("managers/DeadMailManager.js", "t_16abdc3e0b396e03e229"),color='blue'){
  return addPIEvidence(DEAD_MAIL_PREVIEW_CASE,{id:`dead-mail-${id}`,label,text,metaText,color,pinned:true});
}
export function beginDeadMailPreview(){
  if(!isDeadMailPreviewEnabled())throw new Error('Accept Dead Mail in the office Classifieds first.');
  registerPICase({id:DEAD_MAIL_PREVIEW_CASE,kind:'side',requiresBoard:true,title:__dialogueText("managers/DeadMailManager.js", "t_16abdc3e0b396e03e229"),initialItems:[],initialLinks:[]});
  return commit(getDeadMailProgress());
}
export function canUseDeadMailStage(stage,s=getDeadMailProgress()){
  if(['mail','photo'].includes(stage))return true;
  if(stage==='client')return s.clues.length===3;
  if(stage==='map')return s.questions.length===3&&s.clues.length===3;
  if(['arrival','cemetery','staff'].includes(stage))return s.chapterComplete===true;
  if(stage==='records')return s.chapterComplete===true&&s.cemeteryFacts.includes('admin');
  if(stage==='deduction')return s.chapterComplete===true&&Object.keys(FACTS).every(id=>s.cemeteryFacts.includes(id));
  if(stage==='nightLead')return s.dayComplete===true;
  return false;
}
export function setDeadMailStage(stage){
  if(!isDeadMailPreviewEnabled()||!canUseDeadMailStage(stage))return false;
  commit({...getDeadMailProgress(),stage});return true;
}
const chapterOne={
  plot:[__dialogueText("managers/DeadMailManager.js", "t_66fb0fd16270835b6426"),__dialogueText("managers/DeadMailManager.js", "t_37f24b67326583b1c9f5")],
  angel:[__dialogueText("managers/DeadMailManager.js", "t_99b148b9e3178d793e94"),__dialogueText("managers/DeadMailManager.js", "t_48d77377be7144f9828f")],
  label:[__dialogueText("managers/DeadMailManager.js", "t_6d140c2d564f9d1ffc76"),__dialogueText("managers/DeadMailManager.js", "t_eeed95ab59559660ac90")],
  pulse:[__dialogueText("managers/DeadMailManager.js", "t_1de5da00a9bf59a3d3b8"),__dialogueText("managers/DeadMailManager.js", "t_878dffb9f968e163560d")],
  order:[__dialogueText("managers/DeadMailManager.js", "t_de77f0edf74d83adb1f0"),__dialogueText("managers/DeadMailManager.js", "t_63c4c1301fe78697cf0e")],
  work:[__dialogueText("managers/DeadMailManager.js", "t_17300a19505644254b4c"),__dialogueText("managers/DeadMailManager.js", "t_8d726d2ab6f44d526358")]
};
export function recordDeadMailFact(id){
  if(!isDeadMailPreviewEnabled()||!Object.hasOwn(chapterOne,id))return false;
  const s=getDeadMailProgress(),field=['plot','angel','label'].includes(id)?'clues':'questions';
  if(field==='questions'&&s.clues.length<3)return false;
  if(s[field].includes(id))return false;
  const [label,text]=chapterOne[id];note(id,label,text);
  commit({...s,[field]:[...s[field],id]});return true;
}
export function chooseDeadMailSector(sector){
  if(!isDeadMailPreviewEnabled()||!canUseDeadMailStage('map'))return {ok:false};
  const s=getDeadMailProgress();
  if(sector!=='west'){
    commit({...s,attempts:s.attempts+1});
    return {ok:false,message:__dialogueText("managers/DeadMailManager.js", "t_a9756c194b8b5b54e7a4")};
  }
  note('location',__dialogueText("managers/DeadMailManager.js", "t_bb8005b00e0c17256221"),__dialogueText("managers/DeadMailManager.js", "t_ea564e9d70e812ebcef2"));
  commit({...s,stage:'arrival',chapterComplete:true});return {ok:true};
}
function addCemeteryFact(id){
  const s=getDeadMailProgress();if(s.cemeteryFacts.includes(id))return false;
  const [label,text,source]=FACTS[id];note(id,label,text,source);
  commit({...s,cemeteryFacts:[...s.cemeteryFacts,id]});return true;
}
export function inspectDeadMailObject(id){
  if(!isDeadMailPreviewEnabled()||!getDeadMailProgress().chapterComplete)return false;
  if(!['marker','carton','lock'].includes(id))return false;
  return addCemeteryFact(id);
}
export function talkDeadMailStaff(person,topic){
  if(!isDeadMailPreviewEnabled()||!getDeadMailProgress().chapterComplete||!Object.hasOwn(STAFF,person))return {ok:false};
  const npc=STAFF[person],entry=npc.topics.find(t=>t[0]===topic);if(!entry)return {ok:false};
  const s=getDeadMailProgress(),key=`${person}:${topic}`;
  if(!s.staffTopics.includes(key))commit({...s,staffTopics:[...s.staffTopics,key]});
  if(npc.topics.every(t=>getDeadMailProgress().staffTopics.includes(`${person}:${t[0]}`)))addCemeteryFact(person);
  return {ok:true,message:entry[2]};
}
export function inspectDeadMailDocument(id){
  if(!isDeadMailPreviewEnabled()||!canUseDeadMailStage('records')||!['register','gateLog','manifest'].includes(id))return false;
  return addCemeteryFact(id);
}
export function compareDeadMailRecipients(answer){
  if(!isDeadMailPreviewEnabled()||!canUseDeadMailStage('records'))return {ok:false};
  const s=getDeadMailProgress();
  if(!['register','gateLog','manifest'].every(id=>s.cemeteryFacts.includes(id)))return {ok:false,message:__dialogueText("managers/DeadMailManager.js", "t_eb7fda386555a3db2a4b")};
  if(answer!=='three'){
    commit({...s,attempts:s.attempts+1});
    return {ok:false,message:__dialogueText("managers/DeadMailManager.js", "t_62227e3d19a3769d02f0")};
  }
  addCemeteryFact('recipients');return {ok:true,message:__dialogueText("managers/DeadMailManager.js", "t_50d9a39a2195111c33f1")};
}
export function solveDeadMailDeduction(id,answer){
  if(!isDeadMailPreviewEnabled()||!canUseDeadMailStage('deduction'))return {ok:false};
  const d=DEDUCTIONS.find(x=>x.id===id);if(!d)return {ok:false};
  const s=getDeadMailProgress();
  if(answer!==d.answer){commit({...s,attempts:s.attempts+1});return {ok:false,message:d.explanation};}
  if(!s.deductions.includes(id)){
    note(`deduction-${id}`,d.question,d.options[d.answer],__dialogueText("managers/DeadMailManager.js", "t_ed83ff68be977a7d4631"),'yellow');
    commit({...s,deductions:[...s.deductions,id]});
  }
  return {ok:true,message:d.explanation};
}
export function finishDeadMailDay(){
  if(!isDeadMailPreviewEnabled()||!canUseDeadMailStage('deduction'))return false;
  const s=getDeadMailProgress();if(!DEDUCTIONS.every(d=>s.deductions.includes(d.id)))return false;
  note('night-plan',__dialogueText("managers/DeadMailManager.js", "t_701054472d2796e14c9c"),__dialogueText("managers/DeadMailManager.js", "t_0bae0901080b6eb00fc0"),__dialogueText("managers/DeadMailManager.js", "t_897850e6d57e93fdee40"),'yellow');
  commit({...s,stage:'nightLead',dayComplete:true});return true;
}
