import { RedactedReportScene } from './scenes/RedactedReportScene.js';
import { MainStoryManager } from './managers/MainStoryManager.js';

export function openRedactedReport(game = window.game, { preview = true, onFinished = null } = {}) {
  if (!game?.scene?.keys) throw new Error('The game is not running.');
  if (!game.scene.isActive('ArchiveScene')) throw new Error('Open the archive first.');
  if (!preview && !MainStoryManager.hasFlag('shredded_report_reconstructed')) {
    throw new Error('Reconstruct the shredded report first.');
  }
  const key = 'RedactedReportScene';
  if (game.scene.isActive(key)) return false;
  if (!game.scene.keys[key]) game.scene.add(key, RedactedReportScene, false);
  game.scene.start(key, { preview, returnSceneKey: 'ArchiveScene', onFinished });
  game.scene.bringToTop(key);
  return true;
}
