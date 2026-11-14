import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';

export const DEAD_MEN_ART_CASE='pi_dead_men_calling'; 
const DEFAULTS={
 colin:{key:'dead_men_colin',url:'assets/side_quests/Dead-men/Colin.webp'},
 blueFolder:{key:'dead_men_blue_file',url:'assets/side_quests/Dead-men/blue_file.webp'},
 recorder:{key:'dead_men_recorder',url:'assets/side_quests/Dead-men/recorder.webp'},
 couplePhoto:{key:'dead_men_margaret_edward',url:'assets/side_quests/Dead-men/Margaret_Edwarda.webp'}
};
export function getDeadMenArtwork(scene=null){
 const cached=scene?.cache?.json?.get('piCases')?.cases?.find(c=>c.id===DEAD_MEN_ART_CASE)?.metadata?.artwork;
 const stored=gameState.piQuests?.quests?.[DEAD_MEN_ART_CASE]?.metadata?.artwork;
 const result={};
 for(const [role,fallback] of Object.entries(DEFAULTS)){
  const candidate=cached?.[role]||stored?.[role];
  result[role]=candidate&&typeof candidate.key==='string'&&/^[a-zA-Z0-9_-]+$/.test(candidate.key)&&typeof candidate.url==='string'&&/^assets\/side_quests\/Dead-men\/[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$/i.test(candidate.url)
   ?{key:candidate.key,url:candidate.url}:{...fallback};
 }
 return result;
}
export function getDeadMenArtVisibility(){
 if(!gameState.piQuests?.quests?.[DEAD_MEN_ART_CASE])return new Set();
 const progress=gameState.piDeadMenCalling||{},read=Array.isArray(progress.read)?progress.read:[],followup=gameState.piDeadMenCallingFollowup||{};
 const roles=new Set();
 if(read.includes('dead_men_client_mail'))roles.add('couplePhoto');
 if(progress.interviewCompleted||read.some(id=>/^dead_men_recording_[123]$/.test(id)))roles.add('recorder');
 if(progress.accessInterviewCompleted||progress.technicianCompleted||followup.colinInterview)roles.add('colin');
 if(followup.folderInterview)roles.add('blueFolder');
 return roles;
}
export function deadMenArtRoleForMail(id){
 if(typeof id!=='string'||!gameState.piQuests?.quests?.[DEAD_MEN_ART_CASE])return null;
 const roles=getDeadMenArtVisibility();
 if(id==='dead_men_client_mail')return 'couplePhoto';
 if(!id.startsWith('dead_men_'))return null;
 if((id.includes('colin')||id==='dead_men_admission_copy')&&roles.has('colin'))return 'colin';
 if(id.startsWith('dead_men_folder_')&&roles.has('blueFolder'))return 'blueFolder';
 if((id.includes('recording')||id.includes('archive')||id.includes('audio')||id.includes('edit_project')||id==='dead_men_private_continuation')&&roles.has('recorder'))return 'recorder';
 if((id.includes('report')||id==='dead_men_client_wishes'||id==='dead_men_consent_copy')&&roles.has('couplePhoto'))return 'couplePhoto';
 return null;
}
export function syncDeadMenArtwork(scene=null){
 const state=gameState.piInvestigations,investigation=state?.cases?.[DEAD_MEN_ART_CASE];
 if(!investigation?.board)return false;
 const assets=getDeadMenArtwork(scene),roles=getDeadMenArtVisibility();
 const specs={
 couplePhoto:{label:__dialogueText("managers/DeadMenArtwork.js", "t_da93720b22e177da1120"),caption:__dialogueText("managers/DeadMenArtwork.js", "t_5dbb114112d7d809b914"),text:__dialogueText("managers/DeadMenArtwork.js", "t_2c02df0cc04fefdff9cf")},
 recorder:{label:__dialogueText("managers/DeadMenArtwork.js", "t_0adbb47b7c6c967e444b"),caption:__dialogueText("managers/DeadMenArtwork.js", "t_57ab6d6c9fcbcf1523f7"),text:__dialogueText("managers/DeadMenArtwork.js", "t_7fa7857465284567a279")},
 colin:{label:__dialogueText("managers/DeadMenArtwork.js", "t_b7e5ae2ffc6f69bea5b4"),caption:__dialogueText("managers/DeadMenArtwork.js", "t_6c0833de946d98c589fb"),text:__dialogueText("managers/DeadMenArtwork.js", "t_b94c2d0c3034fab5943e")},
 blueFolder:{label:__dialogueText("managers/DeadMenArtwork.js", "t_400b60153e1809fa50a3"),caption:__dialogueText("managers/DeadMenArtwork.js", "t_4a623c10763e1101b4d6"),text:__dialogueText("managers/DeadMenArtwork.js", "t_69feb0ad8afd8ec2091b")}
 };
 const oldItems=Array.isArray(investigation.board.items)?investigation.board.items:[],items=oldItems.slice();let changed=false;
 for(const role of roles){
  const spec=specs[role],asset=assets[role],id='dead_men_art_'+role;
  const generated={id,type:'photo',label:spec.label,image:asset.url,caption:spec.caption,text:spec.text,metaText:__dialogueText("managers/DeadMenArtwork.js", "t_71f2bceb431db9fbc6f8"),discovered:true,createdByPlayer:false,editableByPlayer:false};
  const index=items.findIndex(i=>i.id===id);
  if(index<0){const n=items.length;items.push({x:100+(n%4)*270,y:100+Math.floor(n/4)*230,...generated});changed=true;}
  else if(items[index].createdByPlayer===false&&items[index].editableByPlayer===false){
   const next={...items[index],...generated};if(JSON.stringify(next)!==JSON.stringify(items[index])){items[index]=next;changed=true;}
  }
 }
 if(!changed)return false;
 gameState.piInvestigations={...state,cases:{...state.cases,[DEAD_MEN_ART_CASE]:{...investigation,board:{...investigation.board,items}}}};
 requestAutosave();return true;
}
