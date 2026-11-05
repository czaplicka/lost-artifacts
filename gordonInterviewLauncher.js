import { GordonInterviewScene } from './scenes/GordonInterviewScene.js';
import { getGordonInterviewState } from './gordonInterviewService.js';
import { MainStoryManager } from './managers/MainStoryManager.js';
import { getCompletedAgencyCaseCount } from './archiveMissingReportService.js';
import { openGordonAccessPanel } from './gordonAccessPanelLauncher.js';

export function openGordonInterview(game=window.game,{preview=true,returnSceneKey=null,onFinished=null}={}){
  if(!game?.scene?.keys)throw new Error('The game is not running.');
  const parent=returnSceneKey||['MediumOfficeScene','OfficeScene'].find(key=>game.scene.isActive(key));
  if(!parent||!game.scene.isActive(parent))throw new Error('Open the agency office first.');
  if(!preview&&(parent!=='MediumOfficeScene'||!getGordonInterviewState().unlocked))throw new Error('Speak to Marge after mission six and enter from the upper floor.');
  if(!preview&&getCompletedAgencyCaseCount()>=7&&MainStoryManager.hasFlag('gordon_dismissal_heard'))
    return openGordonAccessPanel(game,{preview:false,onFinished});
  const key='GordonInterviewScene';if(game.scene.isActive(key)||game.scene.isPaused(key)||game.scene.isSleeping(key))return false;
  if(!game.scene.keys[key])game.scene.add(key,GordonInterviewScene,false);
  game.scene.start(key,{preview,returnSceneKey:parent,onFinished});game.scene.bringToTop(key);return true;
}
