import { MainStoryManager as Story } from './managers/MainStoryManager.js';
import { selectHollyResume,validateHollyResume } from './scenes/pi-office/HollyCaseResumeModel.js';
export function getHollyResumeEntry(){return selectHollyResume(f=>Story.hasFlag(f),Story.hasReachedStage('completed'));}
export async function openHollyCaseFromOffice(game,{onFinished=null,isCurrent=()=>true,importer=path=>import(path)}={}){
 const parent='DetectiveOfficeScene';const current=()=>Boolean(isCurrent()&&game?.scene?.isActive?.(parent));
 const error=(code,message)=>({opened:false,code,message});
 if(!current())return error('inactive_office','Open the PI office before resuming this enquiry.');
 const entry=getHollyResumeEntry();if(!entry)return error('not_unlocked','Complete the microfilm comparison to unlock the Warsaw lead.');if(entry.blocked)return error('legacy_closed',entry.message);
 const sameRoute=()=>{const now=getHollyResumeEntry();return current()&&now?.id===entry.id&&now?.ending===entry.ending&&!now?.blocked;};
 let module;try{module=await importer(entry.service);}catch(cause){console.error('[Holly case] Service load:',entry.service,cause);return error('service_load',`Could not load ${entry.service.slice(2)}. Check that the earlier story packs are installed.`);}
 if(!sameRoute())return error('stale_request','The office or case progress changed. Open the case file again.');
 if(typeof module?.[entry.getter]!=='function')return error('service_api',`The installed ${entry.service.slice(2)} does not provide ${entry.getter}.`);
 let state;try{state=module[entry.getter]();}catch(cause){console.error('[Holly case] State read:',cause);return error('state_read','The stage state could not be read. Nothing was changed.');}
 const warning=validateHollyResume(entry,state,f=>Story.hasFlag(f),Story.hasReachedStage('completed'));if(warning)return error('state_mismatch',warning);
 let launcher;try{launcher=await importer(entry.launcher);}catch(cause){console.error('[Holly case] Launcher load:',entry.launcher,cause);return error('launcher_load',`Could not load ${entry.launcher.slice(2)}. Check that the earlier story packs are installed.`);}
 if(!sameRoute())return error('stale_request','The office or case progress changed. Open the case file again.');
 let latest;try{latest=module[entry.getter]();}catch(cause){return error('state_read','The stage state could not be read. Nothing was changed.');}
 const latestWarning=validateHollyResume(entry,latest,f=>Story.hasFlag(f),Story.hasReachedStage('completed'));if(latestWarning)return error('state_mismatch',latestWarning);
 if(typeof launcher?.[entry.open]!=='function')return error('launcher_api',`The installed ${entry.launcher.slice(2)} does not provide ${entry.open}.`);
 try{const opened=launcher[entry.open](game,{preview:false,returnSceneKey:parent,onFinished});return opened?{opened:true,entry,message:''}:error('not_opened','This stage is already open or no longer available.');}catch(cause){console.error('[Holly case] Stage launch:',cause);return error('launch_failed','The case stage could not be opened.');}
}
