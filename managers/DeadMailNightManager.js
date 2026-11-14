import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { addPIEvidence, registerPICase } from './PIInvestigationManager.js';
import { isDeadMailPreviewEnabled, getDeadMailProgress, DEAD_MAIL_PREVIEW_CASE } from './DeadMailManager.js';
import { NIGHT_EVENTS, NIGHT_FACTS, NIGHT_DEDUCTIONS, COURIER_TOPICS } from '../assets/data/deadMailNightData.js';

const defaults=()=>({version:1,stage:'setup',camera:'main',recorder:'main',observer:'gate',
  started:false,eventIndex:-1,facts:[],topics:[],verified:false,compared:false,deductions:[],complete:false,attempts:0});
const unique=a=>[...new Set(Array.isArray(a)?a.filter(v=>typeof v==='string'):[])];
export function canStartDeadMailNight(){return isDeadMailPreviewEnabled()&&getDeadMailProgress().dayComplete===true;}
export function getDeadMailNightProgress(){
  const raw=gameState.deadMailPreview?.night;
  if(!raw||raw.version!==1||typeof raw!=='object'||Array.isArray(raw))return defaults();
  return {...defaults(),...raw,facts:unique(raw.facts).filter(id=>Object.hasOwn(NIGHT_FACTS,id)),
    topics:unique(raw.topics).filter(id=>COURIER_TOPICS.some(t=>t[0]===id)),
    deductions:unique(raw.deductions).filter(id=>NIGHT_DEDUCTIONS.some(d=>d.id===id))};
}
function commit(s){gameState.deadMailPreview={...gameState.deadMailPreview,night:s};requestAutosave();return s;}
function note(id,label,text,source){return addPIEvidence(DEAD_MAIL_PREVIEW_CASE,{
  id:`dead-mail-night-${id}`,label,text,metaText:source,color:'blue',pinned:true});}
function discover(ids){
  let s=getDeadMailNightProgress();
  const added=ids.filter(id=>Object.hasOwn(NIGHT_FACTS,id)&&!s.facts.includes(id));
  if(!added.length)return;
  for(const id of added){const [label,text,source]=NIGHT_FACTS[id];note(id,label,text,source);}
  commit({...s,facts:[...s.facts,...added]});
}
export function beginDeadMailNight(){
  if(!canStartDeadMailNight())throw new Error('Complete the local day-shift preview first. No paid ownership is verified.');
  registerPICase({id:DEAD_MAIL_PREVIEW_CASE,kind:'side',requiresBoard:true,title:__dialogueText("managers/DeadMailNightManager.js", "t_5ee92a6a27737a6acdc5"),initialItems:[],initialLinks:[]});
  return commit(getDeadMailNightProgress());
}
export function setDeadMailNightStage(stage){
  if(!canStartDeadMailNight())return false;
  const s=getDeadMailNightProgress();
  const allowed=(stage==='setup'&&!s.started)||(stage==='watch'&&s.started)||
    (stage==='courier'&&s.eventIndex===NIGHT_EVENTS.length-1)||
    (stage==='review'&&s.verified&&s.compared)|| (stage==='end'&&s.complete);
  if(!allowed)return false;commit({...s,stage});return true;
}
export function placeDeadMailEquipment(slot,place){
  if(!canStartDeadMailNight())return false;
  const s=getDeadMailNightProgress();
  if(s.started||!['camera','recorder','observer'].includes(slot)||!['gate','chapel','main'].includes(place))return false;
  commit({...s,[slot]:place});return true;
}
export function checkDeadMailCoverage(){
  const s=getDeadMailNightProgress();
  if(s.camera!=='gate')return {ok:false,message:__dialogueText("managers/DeadMailNightManager.js", "t_758b753ea03cfe7e0835")};
  if(s.observer!=='chapel')return {ok:false,message:__dialogueText("managers/DeadMailNightManager.js", "t_b655eaeb15f312980145")};
  if(s.recorder!=='chapel')return {ok:false,message:__dialogueText("managers/DeadMailNightManager.js", "t_eda82625b741031dce2e")};
  return {ok:true,message:__dialogueText("managers/DeadMailNightManager.js", "t_1266f60aa54038279def")};
}
export function startDeadMailWatch(){
  if(!canStartDeadMailNight())return {ok:false};
  const s=getDeadMailNightProgress();if(s.started)return {ok:false,message:__dialogueText("managers/DeadMailNightManager.js", "t_71d19815fa10738aee25")};
  const coverage=checkDeadMailCoverage();if(!coverage.ok)return coverage;
  commit({...s,started:true,stage:'watch'});return {ok:true};
}
export function advanceDeadMailWatch(){
  if(!canStartDeadMailNight())return {ok:false};
  const s=getDeadMailNightProgress();
  if(!s.started||s.eventIndex>=NIGHT_EVENTS.length-1)return {ok:false};
  const i=s.eventIndex+1;commit({...s,eventIndex:i});discover(NIGHT_EVENTS[i].facts);
  return {ok:true,event:NIGHT_EVENTS[i]};
}
function metCourier(){return canStartDeadMailNight()&&getDeadMailNightProgress().eventIndex===NIGHT_EVENTS.length-1;}
export function askDeadMailCourier(id){
  if(!metCourier())return {ok:false};
  const topic=COURIER_TOPICS.find(t=>t[0]===id);if(!topic)return {ok:false};
  const s=getDeadMailNightProgress();if(!s.topics.includes(id))commit({...s,topics:[...s.topics,id]});
  if(id==='identity')discover(['courierStory']);
  return {ok:true,message:topic[2]};
}
export function verifyDeadMailCourier(method){
  if(!metCourier()||!getDeadMailNightProgress().topics.includes('identity'))return {ok:false};
  if(method!=='directory')return {ok:false,message:__dialogueText("managers/DeadMailNightManager.js", "t_72927ceb477b9f4435ff")};
  commit({...getDeadMailNightProgress(),verified:true});discover(['courierVerified']);
  return {ok:true,message:__dialogueText("managers/DeadMailNightManager.js", "t_e89558fd6a0157be3062")};
}
export function compareDeadMailCourierSheet(answer){
  if(!metCourier())return {ok:false};
  const s=getDeadMailNightProgress();
  if(!s.verified||!s.topics.includes('records'))return {ok:false,message:__dialogueText("managers/DeadMailNightManager.js", "t_52ed55a52254e338b2d0")};
  if(answer!=='route'){
    commit({...s,attempts:s.attempts+1});
    return {ok:false,message:__dialogueText("managers/DeadMailNightManager.js", "t_96bf4436184cc64aeda9")};
  }
  commit({...s,compared:true});discover(['courierSheet']);
  return {ok:true,message:__dialogueText("managers/DeadMailNightManager.js", "t_419a1a8846e7a76f789b")};
}
export function solveDeadMailNightDeduction(id,answer){
  if(!canStartDeadMailNight())return {ok:false};
  const s=getDeadMailNightProgress();
  if(!s.verified||!s.compared||!s.facts.includes('gatePhoto')||!s.facts.includes('chapelWitness'))return {ok:false};
  const d=NIGHT_DEDUCTIONS.find(x=>x.id===id);if(!d)return {ok:false};
  if(answer!==d.answer){commit({...s,attempts:s.attempts+1});return {ok:false,message:d.explanation};}
  if(!s.deductions.includes(id)){
    note(`deduction-${id}`,d.question,d.options[d.answer],__dialogueText("managers/DeadMailNightManager.js", "t_97cef8ec2d1132ce0fe8"));
    commit({...s,deductions:[...s.deductions,id]});
  }
  return {ok:true,message:d.explanation};
}
export function finishDeadMailNight(){
  if(!canStartDeadMailNight())return false;
  const s=getDeadMailNightProgress();
  if(!s.verified||!s.compared||!NIGHT_DEDUCTIONS.every(d=>s.deductions.includes(d.id)))return false;
  note('operation-plan',__dialogueText("managers/DeadMailNightManager.js", "t_7c5f02df7ea3c49574c2"),__dialogueText("managers/DeadMailNightManager.js", "t_c2c0e6068d02ebd5c0a0"),__dialogueText("managers/DeadMailNightManager.js", "t_5ee826e13f2cc0981fa3"));
  commit({...s,complete:true,stage:'end'});return true;
}
