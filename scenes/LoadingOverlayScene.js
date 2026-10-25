export class LoadingOverlayScene extends Phaser.Scene {
  constructor() { super({ key: 'LoadingOverlayScene' }); }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.8)
      .setOrigin(0).setInteractive();
    this.label = this.add.text(width / 2, height / 2 - 50,
      'DIGGING THROUGH THE ARCHIVES...', {
        fontFamily: 'PressStart2P', fontSize: '18px', color: '#f4e1b8', align: 'center'
      }).setOrigin(0.5);
    this.status = this.add.text(width / 2, height / 2 + 15, '', {
      fontFamily: 'SpecialElite', fontSize: '24px', color: '#f4e1b8'
    }).setOrigin(0.5);
    const w = Math.min(700, width * 0.6);
    this.add.rectangle(width / 2, height / 2 + 75, w, 24, 0x29231c)
      .setStrokeStyle(2, 0xc9aa70);
    this.bar = this.add.rectangle((width - w) / 2 + 3, height / 2 + 75, 0, 18, 0xc9aa70)
      .setOrigin(0, 0.5);
    const update = ({ value = 0, label = '' } = {}) => {
      this.bar.width = (w - 6) * Phaser.Math.Clamp(value, 0, 1);
      this.status.setText(`${label} ${Math.round(value * 100)}%`);
    };
    update(this.game.assets?.progress);
    this.game.events.on('asset-progress', update);
    this.scene.bringToTop();
    this.events.once('shutdown', () => this.game.events.off('asset-progress', update));
  }
}
