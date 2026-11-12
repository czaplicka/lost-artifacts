import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { isReportSubmitted } from '../archiveReportService.js';
import { getThirdMissionStory } from '../thirdMissionStoryService.js';
import { getFourthMissionStory } from '../fourthMissionStoryService.js';
import { getChapterTwoOpening } from '../chapterTwoOpeningService.js';
import { getWorldNpcReaction, markWorldNpcReaction } from '../systems/WorldNpcReactionModel.js';

const installed=new WeakMap();

function heard(state,reaction){
  try{
    if(markWorldNpcReaction(state,reaction.npcId,reaction.eventId)&&state.caseFailed!==true)requestAutosave();
  }catch(error){console.error('[WorldNPC] Could not record reaction:',error);}
}
function reactionFor(state,npcId,options){
  try{return getWorldNpcReaction(state,npcId,options);}
  catch(error){console.error('[WorldNPC] Reaction unavailable:',error);return null;}
}
function installArchive(scene,restorers){
  if(typeof scene.openConversation!=='function')return;
  const original=scene.openConversation;
  const wrapped=function(entry,onClose,...args){
    const state=this.gameState||gameState;
    const eligible=!this._archiveDisposed&&!this._cleanupDone&&this.sys.isActive()&&isReportSubmitted(state);
    const reaction=eligible?reactionFor(state,'archivist_drebin',{caseId:state.currentCaseId}):null;
    if(!reaction||!Array.isArray(entry?.lines))return original.call(this,entry,onClose,...args);
    const next={...entry,lines:[...reaction.lines,...entry.lines]};
    return original.call(this,next,function(...closeArgs){
      heard(state,reaction);
      return typeof onClose==='function'?onClose.apply(this,closeArgs):undefined;
    },...args);
  };
  scene.openConversation=wrapped;
  restorers.push(()=>{if(scene.openConversation===wrapped)scene.openConversation=original;});
}
function alexCanComment(scene,state){
  if(scene._storageDisposed||scene._cleanupDone||!scene.sys.isActive()||scene.isLeaving||
    scene._preparing||scene._finishing||scene._timelineOpen||scene._conversationOpen)return false;
  if(!scene.manualTemplate?.id||!scene.hasInventoryItem(scene.manualTemplate.id))return false;
  const opening=getChapterTwoOpening();
  const fourth=getFourthMissionStory(state);
  const third=getThirdMissionStory(state);
  // Mandatory story accounts and manual delivery always retain priority.
  return !opening.needsAlex&&!fourth.needsAccount&&!third.needsAlex;
}
function installAlex(scene,restorers){
  if(typeof scene.startConversation!=='function')return;
  const original=scene.startConversation;
  const wrapped=function(...args){
    const state=this.gameState||gameState;
    let reaction=null;
    try{if(alexCanComment(this,state))reaction=reactionFor(state,'alex_murphy');}
    catch(error){console.error('[WorldNPC] Alex reaction unavailable:',error);}
    const dialog=this.storageDialog;
    if(!reaction||!dialog||dialog.destroyed||dialog.isOpen||typeof dialog.open!=='function')return original.apply(this,args);
    const rawOpen=dialog.open;
    const owner=this,token=this._storageRunToken;
    let injected=false;
    const decoratedOpen=function(payload,options,...rest){
      if(injected||!Array.isArray(payload?.lines))return rawOpen.call(this,payload,options,...rest);
      injected=true;
      const close=options?.onClose;
      const nextPayload={...payload,lines:[...reaction.lines,...payload.lines]};
      const nextOptions={...(options||{}),onClose:function(...closeArgs){
        if(owner.isCurrent(token)&&owner._conversationOpen&&!owner.isLeaving)heard(state,reaction);
        return typeof close==='function'?close.apply(this,closeArgs):undefined;
      }};
      return rawOpen.call(this,nextPayload,nextOptions,...rest);
    };
    dialog.open=decoratedOpen;
    try{return original.apply(this,args);}
    finally{if(dialog.open===decoratedOpen)dialog.open=rawOpen;}
  };
  scene.startConversation=wrapped;
  restorers.push(()=>{if(scene.startConversation===wrapped)scene.startConversation=original;});
}
export function installWorldNpcReactions(game){
  const keys=game?.scene?.keys||{};
  for(const key of ['ArchiveScene','AgencyStorageScene']){
    const scene=keys[key];
    if(!scene||scene._cleanupDone||installed.has(scene))continue;
    const restorers=[];
    if(key==='ArchiveScene')installArchive(scene,restorers);
    else installAlex(scene,restorers);
    if(!restorers.length)continue;
    let dead=false;
    const destroy=()=>{
      if(dead)return;dead=true;
      scene.events.off('shutdown',destroy);scene.events.off('destroy',destroy);
      for(const restore of restorers.reverse())restore();
      installed.delete(scene);
    };
    installed.set(scene,{destroy});
    scene.events.once('shutdown',destroy);scene.events.once('destroy',destroy);
  }
}
