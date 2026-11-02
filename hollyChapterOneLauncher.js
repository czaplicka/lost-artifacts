import { HollyChapterOneFinaleScene } from './scenes/HollyChapterOneFinaleScene.js';
import { getHollyChapterOneState } from './hollyChapterOneService.js';

export function openHollyChapterOneFinale(game = window.game, { preview = true, returnSceneKey = null, onFinished = null } = {}) {
  if (!game?.scene?.keys) throw new Error('The game is not running.');
  if (!preview && !getHollyChapterOneState().canContact) return false;
  const parent = returnSceneKey || ['AgencyStorageScene','ArchiveScene','DetectiveOfficeScene']
    .find(key=>game.scene.isActive(key));
  if (!parent || !game.scene.isActive(parent)) throw new Error('Open storage, the archive or your PI office first.');
  const key='HollyChapterOneFinaleScene';
  if(game.scene.isActive(key)||game.scene.isPaused(key)||game.scene.isSleeping(key))return false;
  if(!game.scene.keys[key])game.scene.add(key,HollyChapterOneFinaleScene,false);
  game.scene.start(key,{preview,returnSceneKey:parent,onFinished});game.scene.bringToTop(key);return true;
}
