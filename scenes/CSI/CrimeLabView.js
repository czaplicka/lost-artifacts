export class CrimeLabView {
  constructor(scene, options = {}) {
    this.scene = scene;

    this.backgrounds = {};
    this.currentView = options.initialView || 'lab_intro';

    this.onViewChanged =
      typeof options.onViewChanged === 'function'
        ? options.onViewChanged
        : null;

    this.backgroundKeys = {
      lab_intro: options.introBackgroundKey || 'crimelab_point',
      lab_a: 'crimelab_left',
      lab_b: 'crimelab_center',
      lab_c: 'crimelab_right'
    };

    this.fallbackColors = {
      lab_intro: 0x07111b,
      lab_a: 0x0b1c28,
      lab_b: 0x102632,
      lab_c: 0x142e37
    };
  }

  create(gameWidth, gameHeight) {
    if (!this.scene) {
      return;
    }

    this.destroyBackgrounds();

    this.scene.cameras.main.setBackgroundColor('#07111b');

    Object.entries(this.backgroundKeys).forEach(
      ([viewKey, textureKey]) => {
        const background = this.createRoomBackground(
          viewKey,
          textureKey,
          gameWidth,
          gameHeight
        );

        this.backgrounds[viewKey] = background;
      }
    );

    this.showView(this.currentView, false);
  }

  createRoomBackground(
    viewKey,
    textureKey,
    gameWidth,
    gameHeight
  ) {
    const scene = this.scene;

    if (scene.textures.exists(textureKey)) {
      return scene.add
        .image(0, 0, textureKey)
        .setOrigin(0, 0)
        .setDisplaySize(gameWidth, gameHeight)
        .setScrollFactor(0)
        .setDepth(-100)
        .setVisible(false);
    }

    return scene.add
      .rectangle(
        0,
        0,
        gameWidth,
        gameHeight,
        this.fallbackColors[viewKey] || 0x07111b
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-100)
      .setVisible(false);
  }

  showView(viewKey, notify = true) {
    if (!this.backgrounds[viewKey]) {
      console.warn(
        `[CrimeLabView] Unknown or unavailable view: "${viewKey}".`
      );

      return false;
    }

    this.currentView = viewKey;

    Object.entries(this.backgrounds).forEach(
      ([key, background]) => {
        background?.setVisible(key === viewKey);
      }
    );

    if (notify && this.onViewChanged) {
      this.onViewChanged(viewKey);
    }

    return true;
  }

  getCurrentView() {
    return this.currentView;
  }

  getBackground(viewKey) {
    return this.backgrounds[viewKey] || null;
  }

  destroyBackgrounds() {
    const uniqueBackgrounds = new Set(
      Object.values(this.backgrounds)
    );

    uniqueBackgrounds.forEach((background) => {
      background?.destroy?.();
    });

    this.backgrounds = {};
  }

  destroy() {
    this.destroyBackgrounds();

    this.onViewChanged = null;
    this.scene = null;
  }
}