import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { getTownNpcReaction, markTownNpcReaction } from '../systems/WorldTownReactionModel.js';

const installed=new WeakMap();
const TOPIC='Seen the latest case news?';
const active=scene=>Boolean(scene&&!scene.disposed&&!scene._cleanupDone&&scene.ready&&!scene.navigating&&!scene.debugMode&&scene.sys?.isActive?.());

function reactionFor(npcId){
  try{return getTownNpcReaction(gameState,npcId);}
  catch(error){console.error('[WorldTownNPC] Reaction unavailable:',error);return null;}
}
function completedText(scene,eventId){
  const dialog=scene.dialogue;
  return Boolean(dialog&&!dialog.destroyed&&dialog.data?.worldReactionEventId===eventId&&
    dialog.typing===false&&Array.isArray(dialog.pages)&&dialog.pages.length&&dialog.textPage===dialog.pages.length-1);
}
function showReaction(scene,npcId,token){
  if(!active(scene)||scene.token!==token||scene.activeNpcId!==npcId||!scene.isNpcPresent(npcId))return;
  const npc=scene.textData?.npcs?.[npcId],reaction=reactionFor(npcId);
  if(!npc||!reaction){scene.talk(npcId);return;}
  const back=()=>{
    if(!active(scene)||scene.token!==token||scene.activeNpcId!==npcId)return;
    if(completedText(scene,reaction.eventId)){
      try{
        if(markTownNpcReaction(gameState,npcId,reaction.eventId)&&gameState.caseFailed!==true)requestAutosave();
      }catch(error){console.error('[WorldTownNPC] Could not record reaction:',error);}
    }
    scene.talk(npcId);
  };
  scene.show(npc.name,reaction.text,[[scene.text('somethingElse'),back]]);
  if(scene.dialogue?.data)scene.dialogue.data.worldReactionEventId=reaction.eventId;
}

export function installWorldTownReactions(game){
  const scene=game?.scene?.keys?.TavernScene;
  if(!scene||scene._cleanupDone)return null;
  if(installed.has(scene))return installed.get(scene);
  if(typeof scene.talk!=='function'||typeof scene.show!=='function')return null;
  const original=scene.talk;
  let dead=false;
  const wrapped=function(npcId,...args){
    if(dead||!active(this)||!this.isNpcPresent(npcId)||!this.textData?.npcs?.[npcId]||!reactionFor(npcId)){
      return original.call(this,npcId,...args);
    }
    const token=this.token,rawShow=this.show;
    let injected=false;
    const decoratedShow=function(title,text,choices,...rest){
      if(injected||this.activeNpcId!==npcId||title!==this.textData.npcs[npcId].name||!Array.isArray(choices)){
        return rawShow.call(this,title,text,choices,...rest);
      }
      injected=true;
      const topic=[TOPIC,()=>showReaction(this,npcId,token)];
      return rawShow.call(this,title,text,[topic,...choices],...rest);
    };
    this.show=decoratedShow;
    try{return original.call(this,npcId,...args);}
    finally{if(this.show===decoratedShow)this.show=rawShow;}
  };
  scene.talk=wrapped;
  const destroy=()=>{
    if(dead)return;dead=true;
    if(scene.talk===wrapped)scene.talk=original;
    scene.events.off('shutdown',destroy);scene.events.off('destroy',destroy);
    installed.delete(scene);
  };
  const api={destroy};installed.set(scene,api);
  scene.events.once('shutdown',destroy);scene.events.once('destroy',destroy);
  return api;
}
