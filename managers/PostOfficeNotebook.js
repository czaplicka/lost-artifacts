import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import {gameState} from '../GameData.js';
import {requestAutosave} from '../gameStatePersistence.js';
export const POSTAL_NOTEBOOK_CASE='pi_return_to_sender';
const words=[
  ['assignment',__dialogueText("managers/PostOfficeNotebook.js", "t_1e0ef9766aae406056f4")],['seal',__dialogueText("managers/PostOfficeNotebook.js", "t_197adeba070406063ca7")],
  ['envelope',__dialogueText("managers/PostOfficeNotebook.js", "t_c4503b12ceaf3f70f2c3")],['trail',__dialogueText("managers/PostOfficeNotebook.js", "t_d18f644292807615888f")],
  ['card',__dialogueText("managers/PostOfficeNotebook.js", "t_7ae7dd025ce22626e2ca")],['clock',__dialogueText("managers/PostOfficeNotebook.js", "t_b14e972fa9a09f7aa7e3")],
  ['notice',__dialogueText("managers/PostOfficeNotebook.js", "t_b6f842e216b27b850a44")],['ellis',__dialogueText("managers/PostOfficeNotebook.js", "t_839de913e279b15ef429")],
  ['alias',__dialogueText("managers/PostOfficeNotebook.js", "t_6093894c1618710ce1d6")],['identity',__dialogueText("managers/PostOfficeNotebook.js", "t_4016cf89c61321d4e475")],
  ['message',__dialogueText("managers/PostOfficeNotebook.js", "t_db66234b74bd83afcc92")],['waiting',__dialogueText("managers/PostOfficeNotebook.js", "t_a25bb5d1defad2938a7f")],
  ['reply',__dialogueText("managers/PostOfficeNotebook.js", "t_909fa46b2bd0635b6f47")],['privacy',__dialogueText("managers/PostOfficeNotebook.js", "t_29c71b81c22db5f6c40b")],
  ['delivery',__dialogueText("managers/PostOfficeNotebook.js", "t_385ddd91bf6cd14c0d61")],['closed',__dialogueText("managers/PostOfficeNotebook.js", "t_0057d83cb0fada88d37a")],
  ['private',__dialogueText("managers/PostOfficeNotebook.js", "t_20b24bddfe4d3b679fbe")],['disclosed',__dialogueText("managers/PostOfficeNotebook.js", "t_9c828356d0400dbd3e73")]
].map(([id,label])=>({id,label,cloudId:'postal',aliases:[label]}));
export function syncPostalNotebook(){
  const s=gameState.postOffice,record=s?.returnCase;
  if(!record||record.stage==='new')return false;
  const known=new Set(['assignment','seal']);
  const views=s.evidenceViews||{};
  if(views.envelope?.includes('name'))known.add('envelope');
  if(views.envelope?.some(id=>['trail','office'].includes(id)))known.add('trail');
  if(views.card?.includes('authorisation'))known.add('card');
  if(views.card?.includes('watch'))known.add('clock');
  if(views.notice?.includes('identity')){known.add('notice');known.add('ellis');}
  if(views.notice?.includes('contact'))known.add('alias');
  for(const clue of record.clues||[]){
    if(clue==='envelope'){known.add('envelope');known.add('trail');}
    if(clue==='card'){known.add('card');known.add('clock');}
    if(clue==='notice'){known.add('notice');known.add('ellis');known.add('alias');}
  }
  if(['identified','waiting','reply','completed'].includes(record.stage))known.add('identity');
  if(['waiting','reply','completed'].includes(record.stage))known.add('message');
  if(record.stage==='waiting')known.add('waiting');
  if(['reply','completed'].includes(record.stage))for(const id of ['reply','privacy','delivery'])known.add(id);
  if(record.stage==='completed'){known.add('closed');if(record.ending==='private')known.add('private');if(record.ending==='disclose')known.add('disclosed');}
  const previous=gameState.piKeywordSearch;
  const base=previous?.version===1&&previous.cases&&!Array.isArray(previous.cases)?previous:{version:1,selectedCaseId:null,cases:{}};
  const progress=base.cases[POSTAL_NOTEBOOK_CASE]||{known:[],history:[]};
  const merged=[...new Set([...(progress.known||[]),...known])];
  if(Array.isArray(progress.known)&&merged.length===progress.known.length)return false;
  gameState.piKeywordSearch={...base,cases:{...base.cases,[POSTAL_NOTEBOOK_CASE]:{...progress,known:merged}}};
  requestAutosave();return true;
}
export function ensurePostalNotebookDefinition(data){
  if(!Array.isArray(data?.cases))return data;
  const current=data.cases.find(entry=>entry.id===POSTAL_NOTEBOOK_CASE);
  const definition={id:POSTAL_NOTEBOOK_CASE,title:__dialogueText("managers/PostOfficeNotebook.js", "t_6e6e82ddd9c9f0af1dde"),clouds:[{id:'postal',title:__dialogueText("managers/PostOfficeNotebook.js", "t_620a597cd8e1abb75463")}],keywords:words.map(word=>({...word,aliases:[...word.aliases]})),initialKeywords:[],pages:[],recipes:[]};
  if(!current)data.cases.push(definition);
  else{
    current.title=definition.title;
    current.clouds=Array.isArray(current.clouds)?current.clouds:[];
    if(!current.clouds.some(c=>c.id==='postal'))current.clouds.push(definition.clouds[0]);
    current.keywords=Array.isArray(current.keywords)?current.keywords:[];
    for(const keyword of definition.keywords)if(!current.keywords.some(k=>k.id===keyword.id))current.keywords.push(keyword);
  }
  syncPostalNotebook();return data;
}
