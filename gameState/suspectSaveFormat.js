// compact-suspect-save-v1
import { cloneGameData } from './dataUtils.js';
export const SUSPECT_SAVE_ALIASES=new Set(['suspects','suspectList']);
function selectList(state){
  const lists=[state?.caseSuspects,state?.suspects,state?.suspectList];
  return lists.find(value=>Array.isArray(value)&&value.length)||lists.find(Array.isArray)||[];
}
const validId=value=>(typeof value==='string'&&value.length>0)||(typeof value==='number'&&Number.isFinite(value));
export function serializeCaseSuspects(state){
  const suspects=cloneGameData(selectList(state));
  const current=cloneGameData(state?.currentThief);
  if(!Array.isArray(suspects))throw Error('Cannot serialize the canonical suspect list.');
  if(!current||!validId(current.id))return suspects;
  const currentJson=JSON.stringify(current);
  for(const suspect of suspects){
    const hidden=suspect?.hiddenCaseData,profile=hidden?.realThiefProfile;
    if(!profile||!validId(profile.id)||profile.id!==current.id||Object.hasOwn(hidden,'realThiefProfileRef'))continue;
    // Only deduplicate identical data; retain divergent or legacy profile snapshots.
    if(hidden.realThiefId!=null&&hidden.realThiefId!==current.id)continue;
    if(JSON.stringify(profile)!==currentJson)continue;
    hidden.realThiefProfileRef={source:'currentThief',id:current.id};
    delete hidden.realThiefProfile;
  }
  return suspects;
}
export function restoreCaseSuspectProfiles(state){
  for(const suspect of selectList(state)){
    const hidden=suspect?.hiddenCaseData,reference=hidden?.realThiefProfileRef;
    if(!reference||reference.source!=='currentThief')continue;
    if(hidden.realThiefProfile!==undefined)throw Error('A saved thief profile contains both an inline profile and a reference.');
    const current=state.currentThief;
    if(!validId(reference.id)||!current||current.id!==reference.id||
      (hidden.realThiefId!=null&&hidden.realThiefId!==reference.id)){
      throw Error('A saved thief profile reference cannot be resolved.');
    }
    hidden.realThiefProfile=cloneGameData(current);
    delete hidden.realThiefProfileRef;
  }
  return state;
}
