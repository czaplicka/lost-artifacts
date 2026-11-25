import { loadJson } from '../../config/loadJson.js';
let catalogue=Object.create(null);
let loaded=false;
try {
  const data=await loadJson('../../assets/data/dialogue/materialAnalysis.json',import.meta.url);
  if(!data||typeof data!=='object'||Array.isArray(data)||data.version!==1||!data.strings||typeof data.strings!=='object'||Array.isArray(data.strings))throw Error('Invalid material analysis text catalogue.');
  const required=['introLoaded','introSequence','introMemory','briefingTitle','briefingBody','startButton','resultLine','reportLine','reportJoke','speedBonus','clueReady','errorTitle','missingProfile','unsupportedProfile','conflictingProfile','invalidConfiguration','catalogueUnavailable','returnToLab'];
  for(const key of required)if(typeof data.strings[key]!=='string'||!data.strings[key].trim())throw Error('Missing material analysis text: '+key);
  catalogue=Object.freeze({...data.strings});loaded=true;
} catch(error) {
  console.error('[MaterialAnalysisText] Catalogue unavailable:',error);
}
export const MATERIAL_TEXTS_READY=loaded;
export function materialText(key,values={}) {
  const template=catalogue[key];
  if(typeof template!=='string')return `[material:${key}]`;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g,(match,name)=>Object.prototype.hasOwnProperty.call(values,name)?String(values[name]):match);
}
