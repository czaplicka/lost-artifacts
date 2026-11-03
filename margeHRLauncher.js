import { MargeHRScene } from './scenes/MargeHRScene.js';
import { getMargeBirthdayState } from './margeBirthdayService.js';

export function openMargeHR(game=window.game,{preview=true,onFinished=null}={}) {
  if(!game?.scene?.keys)throw new Error('The game is not running.');
  const returnSceneKey=['OfficeScene','ArchiveScene','DetectiveOfficeScene'].find(key=>game.scene.isActive(key));
  if(!returnSceneKey)throw new Error('Open the agency office, archive or PI office first.');
  if(!preview&&!getMargeBirthdayState().unlocked)throw new Error('Discuss the insurance comparison with Frank first.');
  const key='MargeHRScene';if(game.scene.isActive(key)||game.scene.isPaused(key)||game.scene.isSleeping(key))return false;
  if(!game.scene.keys[key])game.scene.add(key,MargeHRScene,false);
  game.scene.start(key,{preview,returnSceneKey,onFinished});game.scene.bringToTop(key);return true;
}
