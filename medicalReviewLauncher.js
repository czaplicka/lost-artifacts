import { MedicalReviewScene } from './scenes/MedicalReviewScene.js';
import { getMedicalReviewStory } from './medicalReviewService.js';
export function openMedicalReview(game=window.game,{preview=true,returnSceneKey=null,onFinished=null}={}){
  if(!game?.scene?.keys)throw new Error('The game is not running.');if(!preview&&!getMedicalReviewStory().eligible)return false;
  const parent=returnSceneKey||['MediumOfficeScene','OfficeScene','AgencyStorageScene','DetectiveOfficeScene'].find(key=>game.scene.isActive(key));
  if(!parent||!game.scene.isActive(parent))throw new Error('Open an agency office or your PI office first.');
  if(!preview&&parent!=='MediumOfficeScene')throw new Error('Enter the medical office from the upper floor.');
  const key='MedicalReviewScene';if(game.scene.isActive(key)||game.scene.isPaused(key)||game.scene.isSleeping(key))return false;
  if(!game.scene.keys[key])game.scene.add(key,MedicalReviewScene,false);game.scene.start(key,{preview,returnSceneKey:parent,onFinished});game.scene.bringToTop(key);return true;
}
