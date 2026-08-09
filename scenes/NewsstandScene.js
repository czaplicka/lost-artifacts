import { BaseScene } from './BaseScene.js';
export class NewsstandScene extends BaseScene {
  constructor() {
    super({ key: 'NewsstandScene' });

    this.cityId = 'paris';

    // Tło
    this.bgImage = null;
    this.bgVideo = null;

    // Overlay tylko dla komiksów
    this.overlayRoot = null;
    this.overlayBlocker = null;
    this.comixContainer = null;
    this.comixImage = null;
    this.comixCloseBtn = null;

    this.isAnimatingOverlay = false;
    this.currentMode = 'none';
  }

  init(data = {}) {
    this.cityId =
      data.cityId ||
      this.registry.get('currentCity') ||
      this.registry.get('currentCityId') ||
      'paris';

    console.log('[NewsstandScene] init:', {
      receivedCityId: data.cityId,
      registryCurrentCity: this.registry.get('currentCity'),
      registryCurrentCityId: this.registry.get('currentCityId'),
      finalCityId: this.cityId
    });
  }

  create() {
        super.create();
    const { width, height } = this.scale;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    const hud = this.scene.get('NewsHud');

    if (hud) {
      hud.events.emit('setNewspaperVisible', false);
      hud.events.emit('setTvVisible', false);
    }

    // Tło – obrazek
    this.bgImage = this.add.image(width / 2, height / 2, 'newsstand_bg')
      .setDepth(0)
      .setOrigin(0.5, 0.5);

    // Tło – video, początkowo niewidoczne
    this.bgVideo = this.add.video(width / 2, height / 2, 'newsstand_video')
      .setDepth(0)
      .setVisible(false)
      .setOrigin(0.5, 0.5);

    this.bgVideo.once('textureready', () => {
      this.resizeVideoCover(this.bgVideo);
    });

    this.bgVideo.once('playing', () => {
      this.resizeVideoCover(this.bgVideo);
    });

    // Przyciemnienie całej sceny Newsstand.
    // Jest interaktywne, ale hotspoty mają większy depth, więc nadal działają.
    this.add.rectangle(0, 0, width, height, 0x000000, 0.42)
      .setOrigin(0, 0)
      .setDepth(1)
      .setInteractive();

    // Wideo po 10 sekundach, następnie powrót do obrazka.
    this.time.delayedCall(10000, () => {
      if (this.scene.isActive('NewsstandScene')) {
        this.switchToVideoBackground();
      }
    });

    this.createPaperHotspots();
    this.createComixHotspots();
    this.createSceneCloseButton();
    this.createComixOverlay();

    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.overlayRoot?.visible) {
        this.closeComixOverlay();
      } else {
        this.closeScene();
      }
    });
  }

  // ── CITY ───────────────────────────────────────────

  getActiveCityId() {
    /*
     * currentCity jest pierwsze celowo:
     * OfficeScene ustawia currentCity = 'hq'.
     * currentCityId może chwilowo nadal zawierać stare miasto.
     */
    return (
      this.registry.get('currentCity') ||
      this.registry.get('currentCityId') ||
      this.cityId ||
      'paris'
    );
  }

  // ── BACKGROUND ─────────────────────────────────────

  switchToVideoBackground() {
    if (!this.bgVideo || !this.bgImage) return;

    this.bgImage.setVisible(false);

    this.bgVideo
      .setVisible(true)
      .setLoop(false)
      .setMute(true);

    this.resizeVideoCover(this.bgVideo);
    this.bgVideo.play();

    this.bgVideo.once(Phaser.GameObjects.Events.COMPLETE, () => {
      if (this.scene.isActive('NewsstandScene')) {
        this.switchToImageBackground();
      }
    });
  }

  switchToImageBackground() {
    if (this.bgVideo) {
      this.bgVideo.stop();
      this.bgVideo.setVisible(false);
    }

    if (this.bgImage) {
      this.bgImage.setVisible(true);
    }
  }

  resizeVideoCover(video) {
    if (!video || !video.scene) return;

    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;

    const videoWidth = video.video?.videoWidth || video.width || 1;
    const videoHeight = video.video?.videoHeight || video.height || 1;

    const scale = Math.max(
      gameWidth / videoWidth,
      gameHeight / videoHeight
    );

    video
      .setPosition(gameWidth / 2, gameHeight / 2)
      .setScale(scale);
  }

  // ── PAPER LAUNCHER ─────────────────────────────────

  createPaperHotspots() {
    const hotspots = [
      {
        id: 'daily',
        x: 510,
        y: 710,
        width: 460,
        height: 230,
        type: 'daily',
        jsonKey: 'newspapers_daily',
        backgroundKey: 'paper_daily_bg'
      },
      //{
       // id: 'time',
       // x: 1000,
       // y: 710,
      //  width: 200,
       // height: 230,
       // type: 'time',
       // jsonKey: 'newspapers_time',
       // backgroundKey: 'paper_time_bg'
    //  },
    //  {
     //   id: 'tabloid',
     //   x: 1250,
     //   y: 710,
     //   width: 220,
     //   height: 230,
     //   type: 'tabloid',
     //   jsonKey: 'newspapers_tabloid',
     //   backgroundKey: 'paper_tabloid_bg'
    //  }
    ];

    hotspots.forEach((spot) => {
      const zone = this.add.zone(spot.x, spot.y, spot.width, spot.height)
        .setOrigin(0, 0)
        .setDepth(10)
        .setInteractive({ useHandCursor: true });

      zone.on('pointerup', () => {
        if (this.isAnimatingOverlay) return;

        const activeCityId = this.getActiveCityId();

        this.cityId = activeCityId;

        console.log('[NewsstandScene] opening newspaper:', {
          activeCityId,
          registryCurrentCity: this.registry.get('currentCity'),
          registryCurrentCityId: this.registry.get('currentCityId'),
          newspaperType: spot.type,
          jsonKey: spot.jsonKey
        });

        // Nie zostawiamy starego overlayu nad nową gazetą.
        if (this.scene.isActive('NewspaperOverlayScene')) {
          this.scene.stop('NewspaperOverlayScene');
        }

        this.scene.launch('NewspaperOverlayScene', {
          cityId: activeCityId,
          type: spot.type,
          jsonKey: spot.jsonKey,
          backgroundKey: spot.backgroundKey
        });
      });
    });
  }

  // ── COMIX OVERLAY ──────────────────────────────────

  createComixHotspots() {
    const hotspots = [
      {
        id: 'comix_1',
        x: 1500,
        y: 710,
        width: 250,
        height: 230,
        textureKey: 'comix1'
      }
    ];

    hotspots.forEach((spot) => {
      const zone = this.add.zone(spot.x, spot.y, spot.width, spot.height)
        .setOrigin(0, 0)
        .setDepth(12)
        .setInteractive({ useHandCursor: true });

      zone.on('pointerup', () => {
        if (this.isAnimatingOverlay) return;

        this.openComixOverlay(spot.textureKey);
      });
    });
  }

  createComixOverlay() {
    const { width, height } = this.scale;

    this.overlayRoot = this.add.container(0, 0)
      .setDepth(200)
      .setVisible(false)
      .setAlpha(0);

    this.overlayBlocker = this.add.rectangle(0, 0, width, height, 0x000000, 0.72)
      .setOrigin(0, 0)
      .setInteractive();

    this.overlayBlocker.on('pointerup', () => {
      if (!this.isAnimatingOverlay) {
        this.closeComixOverlay();
      }
    });

    this.comixContainer = this.add.container(width / 2, height / 2);
    this.comixContainer.setAlpha(0);
    this.comixContainer.setScale(0.9);

    this.comixImage = this.add.image(0, 0, 'comix1')
      .setOrigin(0.5, 0.5);

    this.comixCloseBtn = this.add.text(460, -330, 'X', {
      fontFamily: 'PressStart2P',
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#111111',
      padding: { x: 8, y: 6 }
    })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    this.comixCloseBtn.on('pointerup', () => {
      if (!this.isAnimatingOverlay) {
        this.closeComixOverlay();
      }
    });

    this.comixContainer.add([
      this.comixImage,
      this.comixCloseBtn
    ]);

    this.overlayRoot.add([
      this.overlayBlocker,
      this.comixContainer
    ]);
  }

  openComixOverlay(textureKey) {
    if (!this.overlayRoot || !this.comixImage) return;

    this.currentMode = 'comix';
    this.isAnimatingOverlay = true;

    this.comixImage.setTexture(textureKey);

    this.overlayRoot
      .setVisible(true)
      .setAlpha(0);

    this.comixContainer
      .setAlpha(0)
      .setScale(0.9)
      .setAngle(0)
      .setPosition(this.scale.width / 2, this.scale.height / 2 + 12);

    this.tweens.add({
      targets: this.overlayRoot,
      alpha: 1,
      duration: 140,
      ease: 'Quad.Out'
    });

    this.tweens.add({
      targets: this.comixContainer,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      y: this.scale.height / 2,
      duration: 200,
      ease: 'Back.Out',
      onComplete: () => {
        this.isAnimatingOverlay = false;
      }
    });
  }

  closeComixOverlay(onClosed) {
    if (!this.overlayRoot?.visible || this.isAnimatingOverlay) return;

    this.isAnimatingOverlay = true;

    this.tweens.add({
      targets: this.overlayRoot,
      alpha: 0,
      duration: 140,
      ease: 'Quad.Out'
    });

    this.tweens.add({
      targets: this.comixContainer,
      alpha: 0,
      scaleX: 0.86,
      scaleY: 0.86,
      y: this.scale.height / 2 + 18,
      angle: 1.5,
      duration: 180,
      ease: 'Quad.In',
      onComplete: () => {
        this.overlayRoot.setVisible(false);

        this.comixContainer
          .setAlpha(0)
          .setAngle(0)
          .setPosition(this.scale.width / 2, this.scale.height / 2);

        this.currentMode = 'none';
        this.isAnimatingOverlay = false;

        if (onClosed) {
          onClosed();
        }
      }
    });
  }

  // ── SCENE CLOSE ────────────────────────────────────

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
      if (this.overlayRoot?.visible) {
        this.closeComixOverlay(() => this.closeScene());
      } else {
        this.closeScene();
      }
    });
  }

  closeScene() {
    if (this.isAnimatingOverlay) return;

    this.scene.stop();
  }

  handleShutdown() {
    if (this.bgVideo?.isPlaying()) {
      this.bgVideo.stop();
    }

    if (this.scene.isActive('NewspaperOverlayScene')) {
      this.scene.stop('NewspaperOverlayScene');
    }

    const hud = this.scene.get('NewsHud');

    if (hud) {
      hud.events.emit('setNewspaperVisible', true);
      hud.events.emit('setTvVisible', true);
    }

    this.isAnimatingOverlay = false;
    this.currentMode = 'none';
  }
}