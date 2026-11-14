import { dialogueText as __dialogueText } from "./dialogues/DialogueText.js";
import { MainStoryManager as Story } from './managers/MainStoryManager.js';
import { selectHollyResume,validateHollyResume } from './scenes/pi-office/HollyCaseResumeModel.js';
export function getHollyResumeEntry(){return selectHollyResume(f=>Story.hasFlag(f),Story.hasReachedStage('completed'));}
export async function openHollyCaseFromOffice(game,{onFinished=null,isCurrent=()=>true,importer=path=>import(path)}={}){
 const parent='DetectiveOfficeScene';const current=()=>Boolean(isCurrent()&&game?.scene?.isActive?.(parent));
 const error=(code,message)=>({opened:false,code,message});
 if(!current())return error('inactive_office',__dialogueText("hollyCaseHubService.js", "t_73a01f06730cdf164090"));
 const entry=getHollyResumeEntry();if(!entry)return error('not_unlocked',__dialogueText("hollyCaseHubService.js", "t_6147e78af9d4b010fe54"));if(entry.blocked)return error('legacy_closed',entry.message);
 const sameRoute=()=>{const now=getHollyResumeEntry();return current()&&now?.id===entry.id&&now?.ending===entry.ending&&!now?.blocked;};
 let module;try{module=await importer(entry.service);}catch(cause){console.error('[Holly case] Service load:',entry.service,cause);return error('service_load',`${__dialogueText("hollyCaseHubService.js", "t_f10ce971f188a51de4e6")}${entry.service.slice(2)}${__dialogueText("hollyCaseHubService.js", "t_2d167f6e575b371e181d")}`);}
 if(!sameRoute())return error('stale_request',__dialogueText("hollyCaseHubService.js", "t_1a421f815ec3d5bc7626"));
 if(typeof module?.[entry.getter]!=='function')return error('service_api',`${__dialogueText("hollyCaseHubService.js", "t_09656dc7a905fa1b6a6e")}${entry.service.slice(2)}${__dialogueText("hollyCaseHubService.js", "t_fddbb5fac357b46376df")}${entry.getter}${__dialogueText("hollyCaseHubService.js", "t_cdb4ee2aea69cc6a8333")}`);
 let state;try{state=module[entry.getter]();}catch(cause){console.error('[Holly case] State read:',cause);return error('state_read',__dialogueText("hollyCaseHubService.js", "t_49ef01f1b038725c5af8"));}
 const warning=validateHollyResume(entry,state,f=>Story.hasFlag(f),Story.hasReachedStage('completed'));if(warning)return error('state_mismatch',warning);
 let launcher;try{launcher=await importer(entry.launcher);}catch(cause){console.error('[Holly case] Launcher load:',entry.launcher,cause);return error('launcher_load',`${__dialogueText("hollyCaseHubService.js", "t_f10ce971f188a51de4e6")}${entry.launcher.slice(2)}${__dialogueText("hollyCaseHubService.js", "t_2d167f6e575b371e181d")}`);}
 if(!sameRoute())return error('stale_request',__dialogueText("hollyCaseHubService.js", "t_1a421f815ec3d5bc7626"));
 let latest;try{latest=module[entry.getter]();}catch(cause){return error('state_read',__dialogueText("hollyCaseHubService.js", "t_49ef01f1b038725c5af8"));}
 const latestWarning=validateHollyResume(entry,latest,f=>Story.hasFlag(f),Story.hasReachedStage('completed'));if(latestWarning)return error('state_mismatch',latestWarning);
 if(typeof launcher?.[entry.open]!=='function')return error('launcher_api',`${__dialogueText("hollyCaseHubService.js", "t_09656dc7a905fa1b6a6e")}${entry.launcher.slice(2)}${__dialogueText("hollyCaseHubService.js", "t_fddbb5fac357b46376df")}${entry.open}${__dialogueText("hollyCaseHubService.js", "t_cdb4ee2aea69cc6a8333")}`);
 try{const opened=launcher[entry.open](game,{preview:false,returnSceneKey:parent,onFinished});return opened?{opened:true,entry,message:''}:error('not_opened',__dialogueText("hollyCaseHubService.js", "t_9bc430c98aa1f48f8dd3"));}catch(cause){console.error('[Holly case] Stage launch:',cause);return error('launch_failed',__dialogueText("hollyCaseHubService.js", "t_1509025adcb0441b3e1b"));}
}
