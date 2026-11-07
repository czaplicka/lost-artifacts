import { JohnAccountReviewScene } from './scenes/JohnAccountReviewScene.js';
import { getJohnAccountReview } from './johnAccountReviewService.js';
export function openJohnAccountReview(game=window.game,{preview=true,returnSceneKey='WarsawMeetingScene',onFinished=null}={}){
 if(!game?.scene?.keys)throw new Error('The game is not running.');if(!preview&&!getJohnAccountReview().eligible)return false;if(!game.scene.isActive(returnSceneKey))throw new Error('Open the Warsaw meeting or PI office first.');if(!['WarsawMeetingScene','DetectiveOfficeScene'].includes(returnSceneKey))throw new Error('Invalid review parent.');
 const key='JohnAccountReviewScene';if(game.scene.isActive(key)||game.scene.isPaused(key)||game.scene.isSleeping(key))return false;if(!game.scene.keys[key])game.scene.add(key,JohnAccountReviewScene,false);game.scene.start(key,{preview,returnSceneKey,onFinished});game.scene.bringToTop(key);return true;
}
