import { JohnIncidentFilesScene } from './scenes/JohnIncidentFilesScene.js';
import { getJohnIncidentFiles } from './johnIncidentFilesService.js';
export function openJohnIncidentFiles(game=window.game,{preview=true,returnSceneKey='JohnPrimaryRecordsScene',onFinished=null}={}){
 if(!game?.scene?.keys)throw new Error('The game is not running.');if(!preview&&!getJohnIncidentFiles().eligible)return false;
 if(!['JohnPrimaryRecordsScene','DetectiveOfficeScene'].includes(returnSceneKey)||!game.scene.isActive(returnSceneKey))throw new Error('Open the primary records or PI office first.');
 const key='JohnIncidentFilesScene';if(game.scene.isActive(key)||game.scene.isPaused(key)||game.scene.isSleeping(key))return false;if(!game.scene.keys[key])game.scene.add(key,JohnIncidentFilesScene,false);game.scene.start(key,{preview,returnSceneKey,onFinished});game.scene.bringToTop(key);return true;
}
