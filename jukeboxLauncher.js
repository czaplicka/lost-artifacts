import { JukeboxScene } from './scenes/JukeboxScene.js';

export function openJukebox(game = window.game) {
  if (!game?.scene?.keys) throw new Error('The game is not running.');
  const key = 'JukeboxScene';
  if (game.scene.isActive(key)) { game.scene.bringToTop(key); return false; }
  if (!game.scene.keys[key]) game.scene.add(key, JukeboxScene, false);
  game.scene.start(key);
  game.scene.bringToTop(key);
  return true;
}
