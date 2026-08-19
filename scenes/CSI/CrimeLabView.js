export class CrimeLabView {
  constructor(scene) {
    this.scene = scene;
    this.backgrounds = {};
    this.currentView = 'lab_b';
  }

  createBackgrounds(gameWidth, gameHeight) {
    const scene = this.scene;

    scene.cameras.main.setBackgroundColor('#07111b');

    const fallback = scene.add
      .rectangle(0, 0, gameWidth, gameHeight, 0x07111b)
      .setOrigin(0, 0)
      .setDepth(-100);

    const leftBg = scene.textures.exists('crimelab_left')
      ? scene.add.image(0, 0, 'crimelab_left').setOrigin(0, 0)
      : fallback;

    const centerBg = scene.textures.exists('crimelab_center')
      ? scene.add.image(0, 0, 'crimelab_center').setOrigin(0, 0)
      : null;

    const rightBg = scene.textures.exists('crimelab_right')
      ? scene.add.image(0, 0, 'crimelab_right').setOrigin(0, 0)
      : null;

    [leftBg, centerBg, rightBg]
      .filter(Boolean)
      .forEach((background) => {
        background
          .setDisplaySize(gameWidth, gameHeight)
          .setScrollFactor(0)
          .setDepth(-100)
          .setVisible(false);
      });

    this.backgrounds = {
      lab_a: leftBg,
      lab_b: centerBg || leftBg,
      lab_c: rightBg || leftBg,
    };
  }

  showView(viewKey) {
    this.currentView = viewKey;

    Object.entries(this.backgrounds).forEach(([key, background]) => {
      background?.setVisible(key === viewKey);
    });
  }

  destroy() {
    const backgrounds = new Set(Object.values(this.backgrounds));

    backgrounds.forEach((background) => {
      background?.destroy();
    });

    this.backgrounds = {};
    this.scene = null;
  }
}