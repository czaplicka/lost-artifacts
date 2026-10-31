import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { getPIQuest } from './PIQuestManager.js';
import { getDeadMailProgress, recordDeadMailFact } from './DeadMailManager.js';
import { discoverSearchKeywords, getSearchProgress } from '../ui/pi-computer/ComputerSearch.js';

export const DEAD_MAIL_MESSAGE = 'dead_mail_florence_intro';
export const DEAD_MAIL_SEARCH = 'dead_mail';
export const DEAD_MAIL_QUEST = 'pi_dead_mail_preview';
export const DEAD_MAIL_PHOTO_DETAILS = {
  angel: { keywordId:'damaged_angel', fragments:['The angel has a ',{text:'damaged wing',keywordId:'damaged_angel'},'. A distinctive landmark.'] },
  plot: { keywordId:'plot_114', fragments:['The marker reads ',{text:'Plot 114',keywordId:'plot_114'},', Florence Finch. The stated death is tomorrow.'] },
  label: { keywordId:'gate_b', fragments:['Shipping instruction: ',{text:'Service gate B',keywordId:'gate_b'},'. This is not the main entrance.'] }
};
const searchDefinition = {
  id: DEAD_MAIL_SEARCH, title:'Dead Mail', clouds:[{id:'cemetery',title:'Blackthorn Cemetery'}],
  keywords:[
    {id:'damaged_angel',label:'Damaged angel wing',cloudId:'cemetery'},
    {id:'plot_114',label:'Plot 114',cloudId:'cemetery'},
    {id:'gate_b',label:'Service gate B',cloudId:'cemetery'}
  ], initialKeywords:[],
  pages:[{id:'blackthorn_visitors',title:'Blackthorn Cemetery — visitor information',brand:'Blackthorn Cemetery',
    blocks:[['The West Garden uses service gate B. Plot 114 is near the damaged angel monument. Administrative enquiries can be made at the cemetery office.']],links:[]}],
  recipes:[
    {terms:['damaged_angel','gate_b'],pageId:'blackthorn_visitors'},
    {terms:['plot_114','gate_b'],pageId:'blackthorn_visitors'}
  ]
};
export function hasDeadMailCorrespondence() {
  const q=getPIQuest(DEAD_MAIL_QUEST);
  return q?.metadata?.contentId==='dead_mail' && ['active','completed'].includes(q.status);
}
export function isDeadMailMessage(message) { return message?.id===DEAD_MAIL_MESSAGE && hasDeadMailCorrespondence(); }
export function getDeadMailMessages() {
  if(!hasDeadMailCorrespondence())return [];
  return [{id:DEAD_MAIL_MESSAGE,from:'Florence Finch',subject:'Dead Mail — apparently, I am unavailable',
    date:'Case correspondence',threadId:DEAD_MAIL_QUEST,
    attachments:[{id:'dead_mail_delivery_photo',type:'image',name:'delivery_photo.webp',imageKey:'dead_mail_delivery_photo'}],
    body:'Detective,\n\nThank you for accepting my case.\n\nYesterday a courier sent me a delivery confirmation. The parcel was addressed to me. The delivery address was Blackthorn Cemetery.\n\nI went there. There is a marker with my name, my correct date of birth, and tomorrow’s date as the day I die.\n\nI would like this corrected before it becomes accurate.\n\nI have attached their delivery photograph. Inspect it first; I can then meet you to explain what happened. I remain mobile.\n\nFlorence Finch\n\nATTACHMENT: delivery_photo.webp'}];
}
export function markDeadMailMessageRead(id) {
  if(id!==DEAD_MAIL_MESSAGE||!hasDeadMailCorrespondence())return false;
  const p=getDeadMailProgress();if(p.mailRead===true)return false;
  gameState.deadMailPreview={...p,mailRead:true};requestAutosave();return true;
}
export function inspectDeadMailPhoto(id) {
  if(!hasDeadMailCorrespondence()||!Object.hasOwn(DEAD_MAIL_PHOTO_DETAILS,id))return false;
  const p=getDeadMailProgress(),inspected=Array.isArray(p.photoInspected)?p.photoInspected:[];
  if(p.selectedPhotoDetail===id&&inspected.includes(id))return true;
  gameState.deadMailPreview={...p,selectedPhotoDetail:id,photoInspected:[...new Set([...inspected,id])]};
  requestAutosave();return true;
}
export function collectDeadMailPhoto(id) {
  if(!hasDeadMailCorrespondence()||!Object.hasOwn(DEAD_MAIL_PHOTO_DETAILS,id))return false;
  const p=getDeadMailProgress();
  if(!p.photoInspected?.includes(id)&&!p.clues.includes(id))return false;
  recordDeadMailFact(id);
  const keyword=DEAD_MAIL_PHOTO_DETAILS[id].keywordId;
  if(!getSearchProgress().cases[DEAD_MAIL_SEARCH]?.known?.includes(keyword))discoverSearchKeywords(DEAD_MAIL_SEARCH,[keyword]);
  return true;
}
export function ensureDeadMailSearchDefinition(search) {
  if(!hasDeadMailCorrespondence()||!Array.isArray(search?.data?.cases))return false;
  let changed=false;
  if(!search.data.cases.some(c=>c.id===DEAD_MAIL_SEARCH)){
    search.data={...search.data,cases:[...search.data.cases,JSON.parse(JSON.stringify(searchDefinition))]};changed=true;
  }
  // Older saves already contain photograph clues; restore their notebook tags without resetting anything.
  const missing=getDeadMailProgress().clues.filter(id=>Object.hasOwn(DEAD_MAIL_PHOTO_DETAILS,id))
    .map(id=>DEAD_MAIL_PHOTO_DETAILS[id].keywordId)
    .filter(id=>!getSearchProgress().cases[DEAD_MAIL_SEARCH]?.known?.includes(id));
  if(missing.length)discoverSearchKeywords(DEAD_MAIL_SEARCH,missing);
  return changed;
}
export function deadMailFieldReady() {
  if(!hasDeadMailCorrespondence())return false;
  const p=getDeadMailProgress();return p.clues.length===3;
}
