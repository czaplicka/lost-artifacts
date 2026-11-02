import { OfficeDustScene } from './scenes/OfficeDustScene.js';
import { MainStoryManager } from './managers/MainStoryManager.js';

export function openOfficeDust(game=window.game,{preview=true,onFinished=null}={}) {
  if(!game?.scene?.keys)throw new Error('The game is not running.');
  const returnSceneKey=['OfficeScene','DetectiveOfficeScene'].find(key=>game.scene.isActive(key));
  if(!returnSceneKey)throw new Error('Open the agency office or the PI office first.');
  if(!preview&&(!MainStoryManager.hasFlag('holly_chapter_two_unlocked')||!MainStoryManager.hasFlag('chapter_two_alex_followup_heard')))
    throw new Error('Finish chapter I and the chapter II conversation with Alex first.');
  const key='OfficeDustScene';if(game.scene.isActive(key))return false;
  if(!game.scene.keys[key])game.scene.add(key,OfficeDustScene,false);
  game.scene.start(key,{preview,returnSceneKey,onFinished});game.scene.bringToTop(key);return true;
}
