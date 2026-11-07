import { MainStoryManager } from './managers/MainStoryManager.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';
import { MARGE_TRUST_KEY,validateMargeTrustData,readMargeTrust,beginMargeTrust,acknowledgeMargeTrustIntro,chooseMargeTrustReply,acknowledgeMargeTrustResponse,margeTrustAccess } from './margeTrustModel.js';
export const margeTrustData=validateMargeTrustData(await loadJson('./assets/data/margeTrust.json',import.meta.url));
export function getMargeTrustState(){return readMargeTrust(MainStoryManager.getSideClue(MARGE_TRUST_KEY));}
function source(){const raw=MainStoryManager.getSideClue('gordon_ethics_v1');if(raw==null)return null;if(raw.version!==1)throw Error('Invalid Gordon ethics version.');return raw.source??null;}
function planStart(){return beginMargeTrust(margeTrustData,MainStoryManager.getSideClue(MARGE_TRUST_KEY),source(),{interviewCompleted:MainStoryManager.hasFlag('gordon_first_interview_completed'),helpCompleted:MainStoryManager.hasFlag('marge_helpful_conversation_completed')});}
function commit(result){
 if(!result.ok)return result;
 const previous=MainStoryManager.getSideClue(MARGE_TRUST_KEY);
 if(JSON.stringify(previous)!==JSON.stringify(result.state)){
  try{MainStoryManager.setSideClue(MARGE_TRUST_KEY,result.state);}
  catch(error){if(JSON.stringify(MainStoryManager.getSideClue(MARGE_TRUST_KEY))!==JSON.stringify(result.state))throw error;console.error('[Marge trust] State committed, notification failed:',error);}
 }
 let saved=false;try{saved=saveGameState()===true;}catch(error){console.error('[Marge trust] Saving failed:',error);}
 return{...result,saved};
}
export function startMargeTrustFollowup(){return commit(planStart());}
export function completeMargeTrustIntro(){return commit(acknowledgeMargeTrustIntro(MainStoryManager.getSideClue(MARGE_TRUST_KEY)));}
export function selectMargeTrustReply(id){return commit(chooseMargeTrustReply(MainStoryManager.getSideClue(MARGE_TRUST_KEY),id));}
export function completeMargeTrustResponse(){return commit(acknowledgeMargeTrustResponse(MainStoryManager.getSideClue(MARGE_TRUST_KEY)));}
export function getMargeTrustAccess(){const current=getMargeTrustState();if(current)return margeTrustAccess(current);const planned=planStart();return margeTrustAccess(planned.ok?planned.state:null);}
export function requestMargeInformalRecap(){
 const state=getMargeTrustState();if(!state||state.stage!=='completed')return{ok:false,reason:'followup_pending',lines:[]};
 const access=margeTrustAccess(state),config=state.snapshot;
 return access.informalRecapAllowed?{ok:true,lines:structuredClone(config.recap.lines)}:{ok:false,reason:'formal_only',lines:structuredClone(config.recap.denied)};
}
