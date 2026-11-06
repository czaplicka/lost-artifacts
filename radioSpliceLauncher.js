import { RadioSpliceScene } from './scenes/RadioSpliceScene.js';
import { getRadioSpliceStory } from './radioSpliceService.js';
export function openRadioSplice(game=window.game,{preview=true,returnSceneKey=null,onFinished=null}={}){
 if(!game?.scene?.keys)throw new Error('The game is not running.');if(!preview&&!getRadioSpliceStory().eligible)return false;
 const parent=returnSceneKey||['ArchiveScene','AgencyStorageScene','MediumOfficeScene','OfficeScene','DetectiveOfficeScene'].find(k=>game.scene.isActive(k));if(!parent||!game.scene.isActive(parent))throw new Error('Open the archive or an office first.');if(!preview&&parent!=='ArchiveScene')throw new Error('Request the radio transcript from Drebin in the archive.');
 const key='RadioSpliceScene';if(game.scene.isActive(key)||game.scene.isPaused(key)||game.scene.isSleeping(key))return false;if(!game.scene.keys[key])game.scene.add(key,RadioSpliceScene,false);game.scene.start(key,{preview,returnSceneKey:parent,onFinished});game.scene.bringToTop(key);return true;
}
