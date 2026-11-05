import { gameState } from '../GameData.js';
import { requestAutosave, saveGameState } from '../gameStatePersistence.js';
import { inventoryManager } from './InventoryManager.js';
import { checkAndAwardAchievements } from './AchievementManager.js';
import { addPIEvidence, registerPICase } from './PIInvestigationManager.js';
import { isDeadMailPreviewEnabled, DEAD_MAIL_PREVIEW_CASE } from './DeadMailManager.js';
import { getDeadMailNightProgress, canStartDeadMailNight } from './DeadMailNightManager.js';
import { OPERATION_EVENTS, FINAL_FACTS, REPORT_FIELDS, DEAD_MAIL_REWARD, PHONE_MESSAGES } from '../assets/data/deadMailFinaleData.js';

const defaults=()=>({version:1,stage:'plan',mark:'none',coverage:'main',intervention:'costume',started:false,eventIndex:-1,
 facts:[],report:{},completed:false,rewardClaimed:false,heardMessages:[],attempts:0});
const unique=a=>[...new Set(Array.isArray(a)?a.filter(v=>typeof v==='string'):[])];
export function canStartDeadMailFinale(){return canStartDeadMailNight()&&getDeadMailNightProgress().complete===true;}
export function getDeadMailFinale(){
 const s=gameState.deadMailPreview?.finale;
 if(!s||s.version!==1||typeof s!=='object'||Array.isArray(s))return defaults();
 const report={};for(const d of REPORT_FIELDS){const v=s.report?.[d.id];if(Number.isInteger(v)&&v>=0&&v<d.options.length)report[d.id]=v;}
 return {...defaults(),...s,report,facts:unique(s.facts).filter(id=>Object.hasOwn(FINAL_FACTS,id)),
 heardMessages:Array.isArray(s.heardMessages)?[...new Set(s.heardMessages.filter(i=>Number.isInteger(i)&&i>=0&&i<PHONE_MESSAGES.length))]:[]};
}
function commit(s){gameState.deadMailPreview={...gameState.deadMailPreview,finale:s};requestAutosave();return s;}
function note(id,label,text,source='Dead Mail / finale'){
 return addPIEvidence(DEAD_MAIL_PREVIEW_CASE,{id:`dead-mail-finale-${id}`,label,text,metaText:source,color:'yellow',pinned:true});
}
function discover(ids){
 const s=getDeadMailFinale(),added=ids.filter(id=>Object.hasOwn(FINAL_FACTS,id)&&!s.facts.includes(id));if(!added.length)return;
 for(const id of added){const[label,text,source]=FINAL_FACTS[id];note(id,label,text,source);}
 commit({...s,facts:[...s.facts,...added]});
}
export function beginDeadMailFinale(){
 if(!canStartDeadMailFinale())throw new Error('Complete the local night-shift preview first.');
 registerPICase({id:DEAD_MAIL_PREVIEW_CASE,kind:'side',requiresBoard:true,title:'Dead Mail [DEVELOPMENT PREVIEW]',initialItems:[],initialLinks:[]});
 return commit(getDeadMailFinale());
}
export function setDeadMailFinaleStage(stage){
 if(!canStartDeadMailFinale())return false;const s=getDeadMailFinale();
 const allowed=(stage==='plan'&&!s.started)||(stage==='operation'&&s.started)||
 (stage==='records'&&s.eventIndex===OPERATION_EVENTS.length-1)||
 (stage==='report'&&Object.keys(FINAL_FACTS).every(id=>s.facts.includes(id)))||
 (stage==='epilogue'&&s.completed);
 if(!allowed)return false;commit({...s,stage});return true;
}
export function chooseDeadMailPlan(field,value){
 if(!canStartDeadMailFinale())return false;const s=getDeadMailFinale();if(s.started)return false;
 const options={mark:['none','recorded'],coverage:['main','continuous'],intervention:['costume','handover','documented']};
 if(!Object.hasOwn(options,field)||!options[field].includes(value))return false;
 commit({...s,[field]:value});return true;
}
export function checkDeadMailPlan(){
 const s=getDeadMailFinale();
 if(s.mark!=='recorded')return {ok:false,message:'Record DM-114, its seal and its contents with the courier team before delivery. An ordinary unrecorded box cannot be reliably tracked through the operation.'};
 if(s.coverage!=='continuous')return {ok:false,message:'Keep a continuous view of the handover and shed approach. A costume-contest photograph will not connect a face to the parcel.'};
 if(s.intervention!=='documented')return {ok:false,message:'In this scripted operation, the officers need the collector’s identity and parcel handling documented. A cloak or handover alone does not establish the entire earlier scheme.'};
 return {ok:true,message:'Plan approved in the story by the courier and police team. Record preparation, maintain continuity, document identity and handling. This is a fictional operation, not a real service call.'};
}
export function startDeadMailOperation(){
 if(!canStartDeadMailFinale())return {ok:false};const s=getDeadMailFinale();if(s.started)return {ok:false,message:'The operation has already begun.'};
 const result=checkDeadMailPlan();if(!result.ok)return result;
 commit({...s,started:true,stage:'operation'});return {ok:true};
}
export function advanceDeadMailOperation(){
 if(!canStartDeadMailFinale())return {ok:false};const s=getDeadMailFinale();
 if(!s.started||s.eventIndex>=OPERATION_EVENTS.length-1)return {ok:false};
 const i=s.eventIndex+1;commit({...s,eventIndex:i});discover(OPERATION_EVENTS[i].facts);return {ok:true,event:OPERATION_EVENTS[i]};
}
export function readDeadMailDisclosure(id){
 if(!canStartDeadMailFinale()||getDeadMailFinale().eventIndex!==OPERATION_EVENTS.length-1||!['orders','resale','marker'].includes(id))return false;
 discover([id]);return true;
}
export function chooseDeadMailReport(field,answer){
 if(!canStartDeadMailFinale())return false;const s=getDeadMailFinale();
 if(s.completed||!Object.keys(FINAL_FACTS).every(id=>s.facts.includes(id)))return false;
 const d=REPORT_FIELDS.find(d=>d.id===field);if(!d||!Number.isInteger(answer)||answer<0||answer>=d.options.length)return false;
 commit({...s,report:{...s.report,[field]:answer}});return true;
}
function closeBoard(){
 const state=gameState.piInvestigations,c=state?.cases?.[DEAD_MAIL_PREVIEW_CASE];if(!c)return;
 gameState.piInvestigations={...state,cases:{...state.cases,[DEAD_MAIL_PREVIEW_CASE]:{...c,status:'completed'}}};
}
export function submitDeadMailReport(){
 if(!canStartDeadMailFinale())return {ok:false};let s=getDeadMailFinale();
 if(s.completed)return {ok:true,alreadyCompleted:true,message:'This case is already closed. Rewards will not duplicate.'};
 if(!Object.keys(FINAL_FACTS).every(id=>s.facts.includes(id)))return {ok:false,message:'Collect the operation and disclosure records first.'};
 if(!REPORT_FIELDS.every(d=>s.report[d.id]===d.answer)){
  commit({...s,attempts:s.attempts+1});return {ok:false,message:'The report is not fully supported. Check identity, method, financial motive and the link to earlier orders. No reward has been granted.'};
 }
 const report=REPORT_FIELDS.map(d=>`${d.title}\n${d.options[s.report[d.id]]}`).join('\n\n');
 note('report','Final report / Return to Sender',report,'Case completed / development preview');
 commit({...s,completed:true,completedAt:new Date().toISOString(),stage:'epilogue'});closeBoard();
 let achievementError=null;try{checkAndAwardAchievements();}catch(e){achievementError=String(e);console.error('[Dead Mail] Achievement notification failed:',e);}
 let saved=false;try{saved=saveGameState()===true;}catch(e){console.error('[Dead Mail] Save failed:',e);}
 return {ok:true,saved,achievementError,message:achievementError?'Case closed. Use SAVE AGAIN to retry achievement notifications and saving.':saved?'Case closed. Return to Sender unlocked; your souvenir phone is ready to claim.':'Case closed, but saving failed. Use SAVE AGAIN before leaving.'};
}
export function claimDeadMailReward(){
 if(!canStartDeadMailFinale()||!getDeadMailFinale().completed)return {ok:false,message:'Finish the report first.'};
 const s=getDeadMailFinale();
 if(s.rewardClaimed)return {ok:true,alreadyClaimed:true,message:'The Last Ringtone has already been claimed. No duplicate item was added.'};
 let added=inventoryManager.hasItem(DEAD_MAIL_REWARD.id);
 if(!added){
  try{added=inventoryManager.addItem(JSON.parse(JSON.stringify(DEAD_MAIL_REWARD)))===true;}
  catch(e){added=inventoryManager.hasItem(DEAD_MAIL_REWARD.id);console.error('[Dead Mail] Inventory notification failed:',e);}
 }
 if(!added)return {ok:false,pending:true,message:'Inventory full or unavailable. The phone remains waiting here. Make room and claim it later.'};
 commit({...s,rewardClaimed:true});
 let saved=false;try{saved=saveGameState()===true;}catch(e){console.error('[Dead Mail] Reward save failed:',e);}
 return {ok:true,saved,message:saved?'The Last Ringtone added to inventory. Its messages remain replayable here.':'Phone added, but saving failed. Use SAVE AGAIN before leaving.'};
}
export function playDeadMailMessage(index){
 if(!canStartDeadMailFinale()||!getDeadMailFinale().completed||!Number.isInteger(index)||index<0||index>=PHONE_MESSAGES.length)return null;
 const s=getDeadMailFinale();if(!s.heardMessages.includes(index))commit({...s,heardMessages:[...s.heardMessages,index]});
 return PHONE_MESSAGES[index];
}
export function saveDeadMailFinale(){
 if(!canStartDeadMailFinale())return false;
 try{if(getDeadMailFinale().completed)checkAndAwardAchievements();return saveGameState()===true;}
 catch(e){console.error('[Dead Mail] Save retry failed:',e);return false;}
}
