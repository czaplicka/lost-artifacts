import { MicrofilmScene } from './scenes/MicrofilmScene.js';
import { getMicrofilmStory } from './johnMicrofilmService.js';
export function openJohnMicrofilm(game=window.game,{preview=true,mode='compare',returnSceneKey=null,onFinished=null}={}){
 if(!game?.scene?.keys)throw new Error('The game is not running.');if(!['receive','compare'].includes(mode))throw new Error('Invalid microfilm mode.');const story=getMicrofilmStory();if(!preview&&(!story.eligible||(mode==='compare'&&!story.copyReceived)))return false;
 const parent=returnSceneKey||['AgencyStorageScene','ArchiveScene','OfficeScene','MediumOfficeScene','DetectiveOfficeScene'].find(k=>game.scene.isActive(k));if(!parent||!game.scene.isActive(parent))throw new Error('Open Storage, the archive or an office first.');if(!preview&&parent!==(mode==='receive'?'AgencyStorageScene':'ArchiveScene'))throw new Error('Collect the reel in Storage and compare it in the archive.');
 const key='MicrofilmScene';if(game.scene.isActive(key)||game.scene.isPaused(key)||game.scene.isSleeping(key))return false;if(!game.scene.keys[key])game.scene.add(key,MicrofilmScene,false);game.scene.start(key,{preview,mode,returnSceneKey:parent,onFinished});game.scene.bringToTop(key);return true;
}
