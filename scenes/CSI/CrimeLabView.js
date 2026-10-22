export class CrimeLabView {
  constructor(scene, options = {}) {
    this.scene = scene;
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

    this.background = null;
    this.backgroundKind = null;
    this.backgrounds = {};

    this.gameWidth = 0;
    this.gameHeight = 0;
  }

  create(gameWidth, gameHeight) {
    if (!this.scene) {
      return;
    }

    this.destroyBackgrounds();

    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;

    this.scene.cameras.main.setBackgroundColor('#07111b');
    this.showView(this.currentView, false);
  }

  createRoomBackground(
    viewKey,
    textureKey,
    gameWidth,
    gameHeight
  ) {
    if (this.scene.textures.exists(textureKey)) {
      return this.scene.add
        .image(0, 0, textureKey)
        .setOrigin(0, 0)
        .setDisplaySize(gameWidth, gameHeight)
        .setScrollFactor(0)
        .setDepth(-100);
    }

    return this.scene.add
      .rectangle(
        0,
        0,
        gameWidth,
        gameHeight,
        this.fallbackColors[viewKey] || 0x07111b
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-100);
  }

  showView(viewKey, notify = true) {
    if (
      !this.scene ||
      !Object.prototype.hasOwnProperty.call(
        this.backgroundKeys,
        viewKey
      )
    ) {
      console.warn(
        `[CrimeLabView] Unknown or unavailable view: "${viewKey}".`
      );

      return false;
    }

    const textureKey = this.backgroundKeys[viewKey];
    const hasTexture = this.scene.textures.exists(textureKey);
    const kind = hasTexture ? 'image' : 'rectangle';

    if (
      !this.background ||
      this.backgroundKind !== kind
    ) {
      this.destroyBackgrounds();

      this.background = this.createRoomBackground(
        viewKey,
        textureKey,
        this.gameWidth,
        this.gameHeight
      );

      this.backgroundKind = kind;
    } else if (hasTexture) {
      this.background
        .setTexture(textureKey)
        .setDisplaySize(this.gameWidth, this.gameHeight);
    } else {
      this.background.setFillStyle(
        this.fallbackColors[viewKey] || 0x07111b
      );
    }

    this.background.setVisible(true);
    this.currentView = viewKey;
    this.backgrounds = {
      [viewKey]: this.background
    };

    if (notify) {
      this.onViewChanged?.(viewKey);
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
    this.background?.destroy?.();

    this.background = null;
    this.backgroundKind = null;
    this.backgrounds = {};
  }

  destroy() {
    this.destroyBackgrounds();
    this.onViewChanged = null;
    this.scene = null;
  }
}