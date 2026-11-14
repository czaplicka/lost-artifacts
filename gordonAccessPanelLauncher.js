import { dialogueText as __dialogueText } from "./dialogues/DialogueText.js";
import { openAlarmPanel } from './alarmPanelLauncher.js';
import { GordonSearchScene } from './scenes/GordonSearchScene.js';
import { MainStoryManager } from './managers/MainStoryManager.js';
import { getCompletedAgencyCaseCount } from './archiveMissingReportService.js';
function validate(game,preview){
  if(!game?.scene?.keys)throw new Error('The game is not running.');
  const parent=['MediumOfficeScene','OfficeScene'].find(key=>game.scene.isActive(key));if(!parent)throw new Error('Open an agency office first.');
  if(!preview&&(parent!=='MediumOfficeScene'||getCompletedAgencyCaseCount()<7||!MainStoryManager.hasFlag('gordon_dismissal_heard')))
    throw new Error('Complete mission seven and Gordon\'s first meeting, then use the upper floor.');return parent;
}
export function openGordonSearch(game=window.game,{preview=false,previewConfrontation=false,onFinished=null}={}){
  const parent=validate(game,preview);
  if(!preview&&!MainStoryManager.hasFlag('gordon_door_access_bypassed'))throw new Error('Bypass the door first.');
  const key='GordonSearchScene';if(game.scene.isActive(key)||game.scene.isPaused(key)||game.scene.isSleeping(key))return false;
  if(!game.scene.keys[key])game.scene.add(key,GordonSearchScene,false);
  game.scene.start(key,{preview,previewConfrontation:preview&&previewConfrontation,returnSceneKey:parent,onFinished});game.scene.bringToTop(key);return true;
}
export function openGordonAccessPanel(game=window.game,{preview=true,onFinished=null}={}){
  const parent=validate(game,preview);
  if(!preview&&MainStoryManager.hasFlag('gordon_door_access_bypassed'))return openGordonSearch(game,{preview:false,onFinished});
  let reported=false;const finish=result=>{if(reported)return;reported=true;onFinished?.(result);};
  return openAlarmPanel(game,{mode:'gordon_door',contextId:'gordon_door',preview,returnSceneKey:parent,onFinished:result=>{
    if(preview||!result.completed){finish(result);return;}
    game.events.once(Phaser.Core.Events.POST_STEP,()=>{
      if(!game.scene.isActive(parent)){finish(result);return;}
      try{
        const opened=openGordonSearch(game,{preview:false,onFinished:roomResult=>finish({...roomResult,panelCompleted:true})});
        if(!opened)throw new Error('The search scene is already open.');
      }catch(error){console.error('[Gordon access]',error);finish({...result,error:error.message});game.scene.keys[parent]?.showOfficeStatusMessage?.(__dialogueText("gordonAccessPanelLauncher.js", "t_39b478be8cd494e83ec2"));}
    });
  }});
}
