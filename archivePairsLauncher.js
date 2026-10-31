import { ArchiveIndexPuzzleScene } from './scenes/ArchiveIndexPuzzleScene.js';

export function openArchivePairs(game = window.game, { preview = true, onFinished = null } = {}) {
  if (!game?.scene?.keys) throw new Error('The game is not running.');
  if (!game.scene.isActive('ArchiveScene')) throw new Error('Open the archive first.');
  const key = 'ArchiveIndexPuzzleScene';
  if (game.scene.isActive(key)) return false;
  if (!game.scene.keys[key]) game.scene.add(key, ArchiveIndexPuzzleScene, false);
  game.scene.start(key, { preview, manageBackground: true, returnSceneKey: 'ArchiveScene', onFinished });
  game.scene.bringToTop(key);
  return true;
}
