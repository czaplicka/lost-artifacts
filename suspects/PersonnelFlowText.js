import { loadJson } from '../config/loadJson.js';
let pending=null;
const required=['correspondenceHeader','correctedShortlist','unknownPerson','staffMember','submissionReset'];
export function loadPersonnelFlowTexts(){
  if(!pending)pending=loadJson('../assets/data/personnelFlow.json',import.meta.url).then(data=>{
    for(const key of required)if(typeof data?.[key]!=='string'||!data[key].trim())throw Error(`Personnel flow text is missing: ${key}`);
    return Object.freeze({...data});
  }).catch(error=>{pending=null;throw error;});
  return pending;
}
