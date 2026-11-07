import { HollyFinaleScene } from './scenes/HollyFinaleScene.js';
import { getHollyFinale } from './hollyFinaleService.js';
export function openHollyFinale(game=window.game,{preview=true,returnSceneKey='JohnConfrontationScene',onFinished=null}={}){
 if(!game?.scene?.keys)throw new Error('The game is not running.');if(!preview&&!getHollyFinale().eligible)return false;
 if(!['JohnConfrontationScene','DetectiveOfficeScene'].includes(returnSceneKey)||!game.scene.isActive(returnSceneKey))throw new Error('Open the confrontation summary or PI office first.');
 const key='HollyFinaleScene';if(game.scene.isActive(key)||game.scene.isPaused(key)||game.scene.isSleeping(key))return false;if(!game.scene.keys[key])game.scene.add(key,HollyFinaleScene,false);game.scene.start(key,{preview,returnSceneKey,onFinished});game.scene.bringToTop(key);return true;
}
