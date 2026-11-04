import { MargeHRFloorScene } from './scenes/MargeHRFloorScene.js';
import { gameState } from './GameData.js';

export function openMargeHR(game=window.game,{preview=true,returnSceneKey=null,onFinished=null}={}) {
  if(!game?.scene?.keys)throw new Error('The game is not running.');
  const parent=returnSceneKey||['MediumOfficeScene','OfficeScene','ArchiveScene','DetectiveOfficeScene'].find(key=>game.scene.isActive(key));
  if(!parent||!game.scene.isActive(parent))throw new Error('Open an office first.');
  if(!preview&&(parent!=='MediumOfficeScene'||Number(gameState.casesSolved||0)<4))
    throw new Error('HR is on the upper floor. Use the elevator after four solved cases.');
  const key='MargeHRScene';
  if(game.scene.isActive(key)||game.scene.isPaused(key)||game.scene.isSleeping(key))return false;
  if(game.scene.keys[key]&&!(game.scene.keys[key] instanceof MargeHRFloorScene))game.scene.remove(key);
  if(!game.scene.keys[key])game.scene.add(key,MargeHRFloorScene,false);
  game.scene.start(key,{preview,returnSceneKey:parent,onFinished});game.scene.bringToTop(key);return true;
}
