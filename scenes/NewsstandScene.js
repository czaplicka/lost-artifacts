export class NewsstandScene extends Phaser.Scene {
  constructor() {
    super({ key: 'NewsstandScene' });

    this.cityId = 'paris';

    this.overlayRoot = null;
    this.overlayBlocker = null;
    this.paperContainer = null;
    this.paperBg = null;
    this.paperTitle = null;
    this.paperSubtitle = null;
    this.paperBody = null;
    this.paperCloseBtn = null;

    this.isAnimatingOverlay = false;
    this.currentArticle = null;

    this.currentMode = 'paper';
    this.currentJsonKey = null;
    this.currentBackgroundKey = null;
  }

  init(data) {
    this.cityId = data?.cityId || this.registry.get('currentCity') || 'paris';
  }

  create() {
    const { width, height } = this.scale;
    this.scene.get('NewsHud').events.emit('setNewspaperVisible', false);

    this.add.rectangle(0, 0, width, height, 0x000000, 0.42)
      .setOrigin(0, 0)
      .setInteractive();

    this.add.image(width / 2, height / 2, 'newsstand_bg')
      .setDepth(1);

    this.createPaperHotspots();
    this.createComixHotspots();
    this.createSceneCloseButton();
    this.createOverlay();

    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.overlayRoot?.visible) {
        this.closeOverlay();
      } else {
        this.closeScene();
      }
    });
  }

  createPaperHotspots() {
  const hotspots = [
    {
      id: 'daily',
      x: 510,
      y: 710,
      width: 460,
      height: 230,
      jsonKey: 'newspapers_daily',
      backgroundKey: 'paper_daily_bg'
    },
    {
      id: 'time',
      x: 1000,
      y: 710,
      width: 200,
      height: 230,
      jsonKey: 'newspapers_time',
      backgroundKey: 'paper_time_bg'
    },
    {
      id: 'tabloid',
      x: 1250,
      y: 710,
      width: 220,
      height: 230,
      jsonKey: 'newspapers_tabloid',
      backgroundKey: 'paper_tabloid_bg'
    }
  ];

  hotspots.forEach((spot) => {
    const zone = this.add.zone(spot.x, spot.y, spot.width, spot.height)
      .setOrigin(0, 0)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });

    zone.on('pointerup', () => {
      if (this.isAnimatingOverlay) return;
      this.openPaperOverlay(spot.jsonKey, spot.backgroundKey);
    });
  });
}

  createComixHotspots() {
  const hotspots = [
    {
      id: 'comix_1',
      x: 1500,
      y: 710,
      width: 250,
      height: 230
    },
  ];

  hotspots.forEach((spot) => {
    const zone = this.add.zone(spot.x, spot.y, spot.width, spot.height)
      .setOrigin(0, 0)
      .setDepth(12)
      .setInteractive({ useHandCursor: true });

    zone.on('pointerup', () => {
      if (this.isAnimatingOverlay) return;
      const textureKey = Phaser.Utils.Array.GetRandom(['comix1']);
      this.openComixOverlay(textureKey);
    });
  });
}

  createSceneCloseButton() {
    const btn = this.add.text(this.scale.width - 28, 20, 'X', {
      fontFamily: 'PressStart2P',
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#111111',
      padding: { x: 10, y: 8 }
    })
      .setOrigin(1, 0)
      .setDepth(30)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerup', () => {
      if (this.overlayRoot.visible) {
        this.closeOverlay(() => this.closeScene());
      } else {
        this.closeScene();
      }
    });
  }

  createOverlay() {
    const { width, height } = this.scale;

    this.overlayRoot = this.add.container(0, 0)
      .setDepth(200)
      .setVisible(false)
      .setAlpha(0);

    this.overlayBlocker = this.add.rectangle(0, 0, width, height, 0x000000, 0.72)
      .setOrigin(0, 0)
      .setInteractive();

    this.overlayBlocker.on('pointerup', () => {
      if (!this.isAnimatingOverlay) this.closeOverlay();
    });

    this.paperContainer = this.add.container(width / 2, height / 2 + 12);
    this.paperContainer.setScale(0.82, 0.82);
    this.paperContainer.setAlpha(0);

    this.paperBg = this.add.image(0, 0, 'paper_daily_bg');

    this.paperTitle = this.add.text(0, -250, '', {
      fontFamily: 'SpecialElite',
      fontSize: '30px',
      color: '#2a1d12',
      align: 'center'
    }).setOrigin(0.5, 0);

    this.paperSubtitle = this.add.text(0, -208, '', {
      fontFamily: 'SpecialElite',
      fontSize: '18px',
      color: '#5a4737',
      align: 'center'
    }).setOrigin(0.5, 0);

    this.paperBody = this.add.text(-320, -150, '', {
      fontFamily: 'SpecialElite',
      fontSize: '22px',
      color: '#2a1d12',
      wordWrap: { width: 640 },
      lineSpacing: 10,
      align: 'left'
    }).setOrigin(0, 0);

    this.paperCloseBtn = this.add.text(width * 0.72, height * 0.72, 'Xx', {
      fontFamily: 'PressStart2P',
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#111111',
      padding: { x: 8, y: 6 }
    })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    this.paperCloseBtn.on('pointerup', () => {
      if (!this.isAnimatingOverlay) this.closeOverlay();
    });

    this.paperContainer.add([
      this.paperBg,
      this.paperTitle,
      this.paperSubtitle,
      this.paperBody,
      this.paperCloseBtn
    ]);

    this.overlayRoot.add([this.overlayBlocker, this.paperContainer]);
  }

  openPaperOverlay(jsonKey, backgroundKey) {
    this.currentMode = 'paper';
    this.currentJsonKey = jsonKey;
    this.currentBackgroundKey = backgroundKey;

    const json = this.cache.json.get(jsonKey);
    const cityData = this.resolveCityPaperData(json, this.cityId);

    if (!cityData) return;

    this.playRustle(0.24);
    this.paperBg.setTexture(backgroundKey);

    this.paperTitle.setVisible(true);
    this.paperSubtitle.setVisible(true);
    this.paperBody.setVisible(true);
    this.paperCloseBtn.setVisible(true);

    this.paperTitle.setStyle({
      fontFamily: 'SpecialElite',
      fontSize: '30px',
      color: '#2a1d12',
      align: 'center'
    });

    this.paperSubtitle.setStyle({
      fontFamily: 'SpecialElite',
      fontSize: '18px',
      color: '#5a4737',
      align: 'center'
    });

    this.paperBody.setStyle({
      fontFamily: 'SpecialElite',
      fontSize: '22px',
      color: '#2a1d12',
      wordWrap: { width: 640 },
      lineSpacing: 10,
      align: 'left'
    });

    this.paperTitle.setText(cityData.title || '');
    this.paperSubtitle.setText(cityData.subtitle || '');
    this.paperBody.setText((cityData.articles || []).map(article =>
      `${article.headline}\n${article.body}`
    ).join('\n\n'));

    this.openOverlayBase();
  }

  openComixOverlay(textureKey) {
    this.currentMode = 'comix';
    this.currentJsonKey = null;
    this.currentBackgroundKey = textureKey;

    this.playRustle(0.24);
    this.paperBg.setTexture(textureKey);

    this.paperTitle.setVisible(false);
    this.paperSubtitle.setVisible(false);
    this.paperBody.setVisible(false);
    this.paperCloseBtn.setVisible(true);

    this.openOverlayBase(0.9);
  }

  resolveCityPaperData(json, cityId) {
    if (!json?.cities) {
      console.warn('[NewsstandScene] Missing JSON or cities block');
      return null;
    }

    return json.cities[cityId] || json.cities.global || null;
  }

  openOverlayBase(startScale = 0.82) {
    this.isAnimatingOverlay = true;

    this.overlayRoot.setVisible(true);
    this.overlayRoot.setAlpha(0);

    this.paperContainer.setAlpha(0);
    this.paperContainer.setScale(startScale, startScale);
    this.paperContainer.y = this.scale.height / 2 + 12;
    this.paperContainer.angle = -2.2;

    this.tweens.add({
      targets: this.overlayRoot,
      alpha: 1,
      duration: 140,
      ease: 'Quad.Out'
    });

    this.tweens.add({
      targets: this.paperContainer,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      y: this.scale.height / 2,
      angle: 0,
      duration: 260,
      ease: 'Back.Out',
      onComplete: () => {
        this.isAnimatingOverlay = false;
      }
    });
  }

  playRustle(volume = 0.28) {
    if (!this.sound) return;
    if (!this.cache.audio?.exists || !this.cache.audio.exists('paper_rustle')) return;

    this.sound.play('paper_rustle', {
      volume,
      rate: Phaser.Math.FloatBetween(0.96, 1.04),
      detune: Phaser.Math.Between(-40, 35)
    });
  }

  closeOverlay(onClosed) {
    if (!this.overlayRoot.visible || this.isAnimatingOverlay) return;

    this.isAnimatingOverlay = true;

    this.tweens.add({
      targets: this.overlayRoot,
      alpha: 0,
      duration: 140,
      ease: 'Quad.Out'
    });

    this.tweens.add({
      targets: this.paperContainer,
      alpha: 0,
      scaleX: 0.86,
      scaleY: 0.86,
      y: this.scale.height / 2 + 18,
      angle: 1.5,
      duration: 180,
      ease: 'Quad.In',
      onComplete: () => {
        this.overlayRoot.setVisible(false);
        this.paperContainer.setAngle(0);
        this.paperContainer.y = this.scale.height / 2;
        this.isAnimatingOverlay = false;
        this.currentArticle = null;

        if (onClosed) onClosed();
      }
    });
  }

  closeScene() {
    const hud = this.scene.get('NewsHud');
  if (hud) {
    hud.events.emit('setNewspaperVisible', true);
  }
    this.scene.stop();
  }
}