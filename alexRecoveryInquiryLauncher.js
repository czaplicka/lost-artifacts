import { AlexRecoveryInquiryScene } from './scenes/AlexRecoveryInquiryScene.js';
import { getAlexRecoveryStory } from './alexRecoveryInquiryService.js';
export function openAlexRecoveryInquiry(game=window.game,{preview=true,onFinished=null}={}){
  if(!game?.scene?.keys)throw new Error('The game is not running.');
  const parent=['AgencyStorageScene','MediumOfficeScene','OfficeScene'].find(key=>game.scene.isActive(key));
  if(!parent)throw new Error('Open Storage or an agency office first.');
  if(!preview&&(parent!=='AgencyStorageScene'||!getAlexRecoveryStory().eligible))throw new Error('Complete mission eight and verify the archive follow-up, then speak to Alex in Storage.');
  const key='AlexRecoveryInquiryScene';if(game.scene.isActive(key)||game.scene.isPaused(key)||game.scene.isSleeping(key))return false;
  if(!game.scene.keys[key])game.scene.add(key,AlexRecoveryInquiryScene,false);
  game.scene.start(key,{preview,returnSceneKey:parent,onFinished});game.scene.bringToTop(key);return true;
}
