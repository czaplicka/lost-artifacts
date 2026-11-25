import { loadJson } from '../../config/loadJson.js';
let strings=Object.create(null);
try{
  const data=await loadJson('../../assets/data/dialogue/hairAnalysis.json',import.meta.url);
  const required=['strandPickedUp','strandPlaced','missedBag','missedSlide','reagentApplied','missedReagent','referenceSamples','inspectFirst','closeMicroscope','compareSamples'];
  if(data?.version!==1||!data.strings||typeof data.strings!=='object'||Array.isArray(data.strings)||required.some(key=>typeof data.strings[key]!=='string'||!data.strings[key].trim()))throw Error('Invalid hair analysis text catalogue.');
  strings=Object.freeze({...data.strings});
}catch(error){console.error('[HairAnalysisText] Catalogue unavailable:',error);}
export function hairText(key){return strings[key]??`[hair:${key}]`;}
