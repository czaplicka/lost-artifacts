import { JohnConfrontationScene } from './scenes/JohnConfrontationScene.js';
import { getJohnConfrontation } from './johnConfrontationService.js';
export function openJohnConfrontation(game=window.game,{preview=true,returnSceneKey='JohnIncidentFilesScene',onFinished=null}={}){
 if(!game?.scene?.keys)throw new Error('The game is not running.');if(!preview&&!getJohnConfrontation().eligible)return false;
 if(!['JohnIncidentFilesScene','DetectiveOfficeScene'].includes(returnSceneKey)||!game.scene.isActive(returnSceneKey))throw new Error('Open the incident findings or PI office first.');
 const key='JohnConfrontationScene';if(game.scene.isActive(key)||game.scene.isPaused(key)||game.scene.isSleeping(key))return false;if(!game.scene.keys[key])game.scene.add(key,JohnConfrontationScene,false);game.scene.start(key,{preview,returnSceneKey,onFinished});game.scene.bringToTop(key);return true;
}
