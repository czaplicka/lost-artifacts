import { JohnPrimaryRecordsScene } from './scenes/JohnPrimaryRecordsScene.js';
import { getJohnPrimaryRecords } from './johnPrimaryRecordsService.js';
export function openJohnPrimaryRecords(game=window.game,{preview=true,returnSceneKey='JohnAccountReviewScene',onFinished=null}={}){
 if(!game?.scene?.keys)throw new Error('The game is not running.');if(!preview&&!getJohnPrimaryRecords().eligible)return false;
 if(!['JohnAccountReviewScene','DetectiveOfficeScene'].includes(returnSceneKey)||!game.scene.isActive(returnSceneKey))throw new Error('Open the independent review or PI office first.');
 const key='JohnPrimaryRecordsScene';if(game.scene.isActive(key)||game.scene.isPaused(key)||game.scene.isSleeping(key))return false;if(!game.scene.keys[key])game.scene.add(key,JohnPrimaryRecordsScene,false);game.scene.start(key,{preview,returnSceneKey,onFinished});game.scene.bringToTop(key);return true;
}
