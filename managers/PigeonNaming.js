import { dialogueText } from '../dialogues/DialogueText.js';
import { gameState } from '../GameData.js';
import { requestAutosave, flushAutosave } from '../gameStatePersistence.js';
import { PIGEON_CONFIG } from '../config/pigeonConfig.js';
import { getPigeonLoft, renamePigeon } from './PigeonManager.js';
import { pigeonNamingText as t } from '../dialogues/PigeonNamingText.js';

export const PIGEON_NAME_LIMIT = PIGEON_CONFIG.maxNameLength;

export function pigeonNeedsName(bird){
  if(!bird||bird.nameChosenByPlayer===true)return false;
  if(bird.nameChosenByPlayer===false)return true;
  const index=Number(/^pigeon_(\d+)$/.exec(bird.id)?.[1]||0);
  const defaults=new Set(['',t('unnamed')]);
  if(index===1)defaults.add(PIGEON_CONFIG.firstName);
  if(index>0)defaults.add(dialogueText('managers/PigeonManager.js','t_2b60ac66d5d909dc9c3b')+index);
  // Legacy non-default names are treated as already chosen; never overwrite them.
  return defaults.has(bird.name);
}

export function validatePigeonName(value){
  if(typeof value!=='string')return {ok:false,message:t('empty')};
  const name=value.replace(/[\x00-\x1f\x7f]/g,'').trim();
  if(!name)return {ok:false,message:t('empty')};
  if(name.length>PIGEON_NAME_LIMIT)return {ok:false,message:t('tooLong',{max:PIGEON_NAME_LIMIT})};
  return {ok:true,name};
}

export function confirmPigeonName(id,value){
  const checked=validatePigeonName(value);
  if(!checked.ok)return checked;
  const bird=getPigeonLoft().birds.find(entry=>entry.id===id);
  if(!bird||bird.status==='flying')return {ok:false,message:t('unavailable')};
  const result=renamePigeon(id,checked.name);
  if(!result?.ok)return result||{ok:false,message:t('failed')};
  const loft=gameState.pigeonLoft;
  if(!loft?.birds?.some(entry=>entry.id===id))return {ok:false,message:t('failed')};
  gameState.pigeonLoft={...loft,birds:loft.birds.map(entry=>entry.id===id?
    {...entry,nameChosenByPlayer:true}:entry)};
  requestAutosave();flushAutosave();
  return {ok:true,name:checked.name};
}
