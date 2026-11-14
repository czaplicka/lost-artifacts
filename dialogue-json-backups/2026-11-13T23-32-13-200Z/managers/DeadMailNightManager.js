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
  registerPICase({id:DEAD_MAIL_PREVIEW_CASE,kind:'side',requiresBoard:true,title:'Dead Mail [DEVELOPMENT PREVIEW]',initialItems:[],initialLinks:[]});
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
  if(s.camera!=='gate')return {ok:false,message:'The camera needs a clear view of the parcel handover at gate B. A picture of the costume contest will not establish collection.'};
  if(s.observer!=='chapel')return {ok:false,message:'The chapel is outside the gate camera’s view. Place yourself there so a second figure can be observed independently.'};
  if(s.recorder!=='chapel')return {ok:false,message:'The reported bell is at the chapel. Place the recorder there. Recording the crowd only gives you expensive booing.'};
  return {ok:true,message:'Gate camera, chapel recorder and chapel observation point. Clocks will be synchronised before the watch. Coverage rehearsal does not advance time.'};
}
export function startDeadMailWatch(){
  if(!canStartDeadMailNight())return {ok:false};
  const s=getDeadMailNightProgress();if(s.started)return {ok:false,message:'The watch has already begun. Review the timeline; it cannot be rewound.'};
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
  if(method!=='directory')return {ok:false,message:'A costume, badge or number supplied only by the witness is not independent verification. Use the duty-desk number from the courier directory.'};
  commit({...getDeadMailNightProgress(),verified:true});discover(['courierVerified']);
  return {ok:true,message:'SCRIPTED DUTY-DESK CALL: “Ward, PC-041. Assigned to Blackthorn consignments.” Employment and assignment confirmed, not every claim.'};
}
export function compareDeadMailCourierSheet(answer){
  if(!metCourier())return {ok:false};
  const s=getDeadMailNightProgress();
  if(!s.verified||!s.topics.includes('records'))return {ok:false,message:'Verify Tessa and ask to see her records first.'};
  if(answer!=='route'){
    commit({...s,attempts:s.attempts+1});
    return {ok:false,message:'The sheets match recipient names, dates and plots. Neither sheet identifies the hooded collector or provides purchaser payment details.'};
  }
  commit({...s,compared:true});discover(['courierSheet']);
  return {ok:true,message:'Names, dates and plots match the cemetery copy. The route is corroborated; the collector is still unidentified.'};
}
export function solveDeadMailNightDeduction(id,answer){
  if(!canStartDeadMailNight())return {ok:false};
  const s=getDeadMailNightProgress();
  if(!s.verified||!s.compared||!s.facts.includes('gatePhoto')||!s.facts.includes('chapelWitness'))return {ok:false};
  const d=NIGHT_DEDUCTIONS.find(x=>x.id===id);if(!d)return {ok:false};
  if(answer!==d.answer){commit({...s,attempts:s.attempts+1});return {ok:false,message:d.explanation};}
  if(!s.deductions.includes(id)){
    note(`deduction-${id}`,d.question,d.options[d.answer],'Night investigation / deduction');
    commit({...s,deductions:[...s.deductions,id]});
  }
  return {ok:true,message:d.explanation};
}
export function finishDeadMailNight(){
  if(!canStartDeadMailNight())return false;
  const s=getDeadMailNightProgress();
  if(!s.verified||!s.compared||!NIGHT_DEDUCTIONS.every(d=>s.deductions.includes(d.id)))return false;
  note('operation-plan','A controlled delivery, not an accusation','Coordinate a marked parcel with the courier and police, document its collection and preserve evidence. The collector has not yet been identified.','Next operation / development preview');
  commit({...s,complete:true,stage:'end'});return true;
}
