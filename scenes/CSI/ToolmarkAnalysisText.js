import { loadJson } from '../../config/loadJson.js';
let strings=Object.create(null);
try{
 const data=await loadJson('../../assets/data/dialogue/toolmarkAnalysis.json',import.meta.url);
 if(data?.version!==1||!data.strings||['exit','invalidSample','ambidextrousSample'].some(key=>typeof data.strings[key]!=='string'||!data.strings[key].trim()))throw Error('Invalid focus analysis text catalogue.');
 strings=Object.freeze({...data.strings});
}catch(error){console.error('[ToolmarkAnalysisText] Catalogue unavailable:',error);}
export function toolmarkText(key){return strings[key]??`[toolmark:${key}]`;}
