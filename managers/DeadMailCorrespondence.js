import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { getPIQuest } from './PIQuestManager.js';
import { getDeadMailProgress, recordDeadMailFact } from './DeadMailManager.js';
import { discoverSearchKeywords, getSearchProgress } from '../ui/pi-computer/ComputerSearch.js';

export const DEAD_MAIL_MESSAGE = 'dead_mail_florence_intro';
export const DEAD_MAIL_SEARCH = 'dead_mail';
export const DEAD_MAIL_QUEST = 'pi_dead_mail_preview';
export const DEAD_MAIL_PHOTO_DETAILS = {
  angel: { keywordId:'damaged_angel', fragments:[__dialogueText("managers/DeadMailCorrespondence.js", "t_e362982799c3edb5affa"),{text:__dialogueText("managers/DeadMailCorrespondence.js", "t_6859ac7646434f4d7af0"),keywordId:'damaged_angel'},__dialogueText("managers/DeadMailCorrespondence.js", "t_75cbf8e2a0890a5fbc75")] },
  plot: { keywordId:'plot_114', fragments:[__dialogueText("managers/DeadMailCorrespondence.js", "t_9a042997bd828cd87c7e"),{text:__dialogueText("managers/DeadMailCorrespondence.js", "t_66fb0fd16270835b6426"),keywordId:'plot_114'},__dialogueText("managers/DeadMailCorrespondence.js", "t_2ed9137c1fac04081fb9")] },
  label: { keywordId:'gate_b', fragments:[__dialogueText("managers/DeadMailCorrespondence.js", "t_76ac4b026173e3cf495b"),{text:__dialogueText("managers/DeadMailCorrespondence.js", "t_76e90b8e2ab6a213454b"),keywordId:'gate_b'},__dialogueText("managers/DeadMailCorrespondence.js", "t_b46c8c1f4e7c0bea1542")] }
};
const searchDefinition = {
  id: DEAD_MAIL_SEARCH, title:__dialogueText("managers/DeadMailCorrespondence.js", "t_16abdc3e0b396e03e229"), clouds:[{id:'cemetery',title:__dialogueText("managers/DeadMailCorrespondence.js", "t_fcd5ad393af860802561")}],
  keywords:[
    {id:'damaged_angel',label:__dialogueText("managers/DeadMailCorrespondence.js", "t_c9a0cf022d1ae58679ec"),cloudId:'cemetery'},
    {id:'plot_114',label:__dialogueText("managers/DeadMailCorrespondence.js", "t_66fb0fd16270835b6426"),cloudId:'cemetery'},
    {id:'gate_b',label:__dialogueText("managers/DeadMailCorrespondence.js", "t_76e90b8e2ab6a213454b"),cloudId:'cemetery'}
  ], initialKeywords:[],
  pages:[{id:'blackthorn_visitors',title:__dialogueText("managers/DeadMailCorrespondence.js", "t_c903f65e265cda782dd9"),brand:__dialogueText("managers/DeadMailCorrespondence.js", "t_fcd5ad393af860802561"),
    blocks:[[__dialogueText("managers/DeadMailCorrespondence.js", "t_c16d6de15d441b00c564")]],links:[]}],
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
  return [{id:DEAD_MAIL_MESSAGE,from:__dialogueText("managers/DeadMailCorrespondence.js", "t_e014da3e60b6cc508835"),subject:__dialogueText("managers/DeadMailCorrespondence.js", "t_d80fc74378493d32e991"),
    date:__dialogueText("managers/DeadMailCorrespondence.js", "t_9a264749f9d43669aac5"),threadId:DEAD_MAIL_QUEST,
    attachments:[{id:'dead_mail_delivery_photo',type:'image',name:'delivery_photo.webp',imageKey:'dead_mail_delivery_photo'}],
    body: [
      __dialogueText("managers/DeadMailCorrespondence.js", "t_0c1aba307a089de58a42"),
      __dialogueText("managers/DeadMailCorrespondence.js", "t_e1efb7573d6afdd3af1e"),
      __dialogueText("managers/DeadMailCorrespondence.js", "t_211b20291a8ca14302bd"),
      __dialogueText("managers/DeadMailCorrespondence.js", "t_e6eff9d1df365d35118b"),
      __dialogueText("managers/DeadMailCorrespondence.js", "t_3666aadb910fe4a58a6a"),
      __dialogueText("managers/DeadMailCorrespondence.js", "t_b732e56d6b0f7def2efa"),
      __dialogueText("managers/DeadMailCorrespondence.js", "t_8f8b5ba14270cd132d23"),
      __dialogueText("managers/DeadMailCorrespondence.js", "t_87ea2f9c062e3cab6603"),
      __dialogueText("managers/DeadMailCorrespondence.js", "t_e014da3e60b6cc508835"),
      __dialogueText("managers/DeadMailCorrespondence.js", "t_e57e172497e379987fb5")
    ].join(__dialogueText("managers/DeadMailCorrespondence.js", "t_75a11da44c802486bc6f"))}];
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