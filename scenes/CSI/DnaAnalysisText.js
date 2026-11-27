import { loadJson } from '../../config/loadJson.js';
let strings=Object.create(null);
try{
 const data=await loadJson('../../assets/data/dialogue/dnaAnalysis.json',import.meta.url);
 const required=['openVial','vialOpened','missTube','sampleReadyPcr','runPcr','sample','controlXX','controlXY','sampleLoaded','drawSampleFirst','missWell','alreadyLoaded','sampleReadyGel','runGel','uvHint','uvTitle','uvInstructions','closeUv','compare','classify'];
 if(data?.version!==1||!data.strings||required.some(key=>typeof data.strings[key]!=='string'||!data.strings[key].trim()))throw Error('Invalid DNA analysis text catalogue.');
 strings=Object.freeze({...data.strings});
}catch(error){console.error('[DnaAnalysisText] Catalogue unavailable:',error);}
export function dnaText(key){return strings[key]??`[dna:${key}]`;}
