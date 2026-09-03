// scenes/LoadingOverlayScene.js
// Tiny always-resident scene (Tier 0) shown briefly whenever SceneLoader
// has to fetch a chunk that takes longer than ~150ms (slow connection,
// big CSI mini-game bundle, etc). Keeps the "Indiana Jones" parchment vibe.

export class LoadingOverlayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoadingOverlayScene' });
  }

  create() {
    const { width, height } = this.scale;

    this.container = this.add.container(0, 0).setDepth(9999);

    const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.55)
      .setOrigin(0, 0);

    const label = this.add.text(width / 2, height / 2 + 40, 'DIGGING THROUGH THE ARCHIVES...', {
      fontFamily: '"PressStart2P"',
      fontSize: '18px',
      color: '#f4e1b8'
    }).setOrigin(0.5);

    const icon = this.add.text(width / 2, height / 2 - 20, '⌛', {
      fontSize: '48px'
    }).setOrigin(0.5);

    this.container.add([backdrop, label, icon]);
    this._icon = icon;

    this.tweens.add({
      targets: icon,
      angle: 360,
      duration: 900,
      repeat: -1,
      ease: 'Linear'
    });
  }

  shutdown() {
    this.tweens.killTweensOf(this._icon);
  }
}