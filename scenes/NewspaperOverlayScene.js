import { NewspaperLayout } from '../ui/NewspaperUI.js';

export class NewspaperOverlayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'NewspaperOverlayScene' });

    this.cityId = 'warsaw';
    this.type = 'daily';
    this.backgroundKey = null;
    this.jsonKey = null;

    this.root = null;
    this.dim = null;
    this.paper = null;
    this.paperBg = null;
    this.closeBtn = null;
    this.contentLayer = null;
    this.layoutRenderer = null;

    this.isAnimating = false;
  }

  init(data) {
    this.cityId = data?.cityId || 'warsaw';
    this.type = data?.type || 'daily';
    this.backgroundKey = data?.backgroundKey || null;
    this.jsonKey = data?.jsonKey || null;
  }

  create() {
    const { width, height } = this.scale;

    this.layoutRenderer = new NewspaperLayout(this);

    this.root = this.add.container(0, 0).setDepth(5000);
    this.dim = this.add.rectangle(0, 0, width, height, 0x000000, 0.72)
      .setOrigin(0, 0)
      .setInteractive();

    this.paper = this.add.container(width / 2, height / 2);
    this.paper.setAlpha(0);
    this.paper.setScale(0.94);

    this.paperBg = this.add.image(0, 0, this.backgroundKey || 'paper_placeholder_1920');
    this.contentLayer = this.add.container(-960, -540);

this.closeBtn = this.add.text(920, -520, 'X', {
  fontFamily: 'PressStart2P',
  fontSize: '18px',
  color: '#ffffff',
  backgroundColor: '#111111',
  padding: { x: 12, y: 10 }
})
  .setOrigin(1, 0) // prawy górny róg tekstu
  .setInteractive({ useHandCursor: true });

    this.closeBtn.on('pointerup', () => {
      if (!this.isAnimating) {
        this.closeOverlay();
      }
    });

    this.dim.on('pointerup', () => {
      if (!this.isAnimating) {
        this.closeOverlay();
      }
    });

    this.paper.add([this.paperBg, this.contentLayer, this.closeBtn]);
    this.root.add([this.dim, this.paper]);

    this.renderCityContent();
    this.openOverlay();

    this.input.keyboard?.on('keydown-ESC', () => {
      if (!this.isAnimating) {
        this.closeOverlay();
      }
    });
  }

  renderCityContent() {
    this.contentLayer.removeAll(true);

    const json = this.cache.json.get(this.jsonKey);
    const cityData = this.resolveCityData(json, this.cityId, this.type);

    this.layoutRenderer.render(this.contentLayer, {
      type: this.type,
      data: cityData
    });
  }

  resolveCityData(json, cityId, type) {
    if (!json?.cities?.[cityId]) {
      throw new Error(`Missing city "${cityId}" in JSON "${this.jsonKey}"`);
    }

    if (type === 'time') {
      return {
        title: json.title || 'Time',
        coverLines: json.cities[cityId].coverLines || []
      };
    }

    return json.cities[cityId];
  }

  playRustle(volume = 0.22) {
    if (!this.sound) return;
    if (!this.cache.audio?.exists || !this.cache.audio.exists('paper_rustle')) return;

    this.sound.play('paper_rustle', {
      volume,
      rate: Phaser.Math.FloatBetween(0.97, 1.03),
      detune: Phaser.Math.Between(-25, 25)
    });
  }

  openOverlay() {
    this.isAnimating = true;
    this.playRustle(0.24);

    this.dim.setAlpha(0);
    this.paper.setAlpha(0);
    this.paper.setScale(0.95);
    this.paper.y += 20;

    this.tweens.add({
      targets: this.dim,
      alpha: 1,
      duration: 140,
      ease: 'Quad.Out'
    });

    this.tweens.add({
      targets: this.paper,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      y: this.scale.height / 2,
      duration: 240,
      ease: 'Back.Out',
      onComplete: () => {
        this.isAnimating = false;
      }
    });
  }

  closeOverlay() {
    this.isAnimating = true;
    this.playRustle(0.18);

    this.tweens.add({
      targets: this.dim,
      alpha: 0,
      duration: 120,
      ease: 'Quad.Out'
    });

    this.tweens.add({
      targets: this.paper,
      alpha: 0,
      scaleX: 0.96,
      scaleY: 0.96,
      y: this.scale.height / 2 + 24,
      duration: 170,
      ease: 'Quad.In',
      onComplete: () => {
        this.isAnimating = false;
        this.scene.stop();
      }
    });
  }
}