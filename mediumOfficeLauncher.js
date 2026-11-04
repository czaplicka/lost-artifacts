import { MediumOfficeFloorScene } from './scenes/MediumOfficeFloorScene.js';
import { gameState } from './GameData.js';
import { canAccessUpperOffice } from './scenes/office/OfficeElevatorAccess.js';

export function openMediumOffice(game=window.game,{allowLockedForTesting=false}={}) {
  if(!game?.scene?.keys)throw new Error('The game is not running.');
  if(!game.scene.isActive('OfficeScene'))throw new Error('Open the lower agency office first.');
  const local=['localhost','127.0.0.1'].includes(window.location.hostname);
  if(!canAccessUpperOffice(gameState)&&!(allowLockedForTesting&&local))throw new Error('Medium office requires four solved cases.');
  const key='MediumOfficeScene';
  if(game.scene.isActive(key)||game.scene.isPaused(key)||game.scene.isSleeping(key))return false;
  if(game.scene.keys[key]&&!(game.scene.keys[key] instanceof MediumOfficeFloorScene))game.scene.remove(key);
  if(!game.scene.keys[key])game.scene.add(key,MediumOfficeFloorScene,false);
  game.scene.keys.OfficeScene.scene.start(key,{gameState,returnSceneKey:'OfficeScene',allowLockedForTesting});return true;
}
