import { ShreddedReportScene } from './scenes/ShreddedReportScene.js';

export function openShreddedReport(game = window.game, { preview = true, onFinished = null } = {}) {
  if (!game?.scene?.keys) throw new Error('The game is not running.');
  if (!game.scene.isActive('ArchiveScene')) throw new Error('Open the archive first.');
  const key = 'ShreddedReportScene';
  if (game.scene.isActive(key)) return false;
  if (!game.scene.keys[key]) game.scene.add(key, ShreddedReportScene, false);
  game.scene.start(key, { preview, returnSceneKey: 'ArchiveScene', onFinished });
  game.scene.bringToTop(key);
  return true;
}
