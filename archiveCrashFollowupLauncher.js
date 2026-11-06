import { ArchiveCrashFollowupScene } from './scenes/ArchiveCrashFollowupScene.js';
import { getCrashFollowupStory } from './archiveCrashFollowupService.js';
export function openArchiveCrashFollowup(game=window.game,{preview=true,onFinished=null}={}){
  if(!game?.scene?.keys)throw new Error('The game is not running.');
  const parent=['ArchiveScene','MediumOfficeScene','OfficeScene'].find(key=>game.scene.isActive(key));
  if(!parent)throw new Error('Open the archive or an agency office first.');
  if(!preview&&(parent!=='ArchiveScene'||!getCrashFollowupStory().eligible))throw new Error('Request the follow-up from Drebin after confronting Gordon.');
  const key='ArchiveCrashFollowupScene';if(game.scene.isActive(key)||game.scene.isPaused(key)||game.scene.isSleeping(key))return false;
  if(!game.scene.keys[key])game.scene.add(key,ArchiveCrashFollowupScene,false);
  game.scene.start(key,{preview,returnSceneKey:parent,onFinished});game.scene.bringToTop(key);return true;
}
