import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import {
  moneyManager,
  MONEY_SOURCE,
  ECONOMY_CATEGORY
} from '../managers/MoneyManager.js';
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';

const NEWSPAPER_PRICE = 5;
const COMIX_PRICE = 1;
const DAILY_NEWSPAPER_ACCESS_KEY = 'dailyNewspaperAccess';

const VIDEO_KEY = 'newsstand_video';
const VIDEO_URL = 'assets/video/newsstand.mp4';
const VIDEO_DELAY_MS = 10000;

export class NewsstandScene extends BaseScene {
  constructor() {
    super({ key: 'NewsstandScene' });

    this.cityId = 'paris';

    this.bgImage = null;
    this.bgVideo = null;
    this.sceneDim = null;
    this.videoTimer = null;

    this.overlayRoot = null;
    this.overlayBlocker = null;
    this.comixContainer = null;
    this.comixImage = null;
    this.comixCloseBtn = null;

    this.isAnimatingOverlay = false;
    this.isOpeningNewspaper = false;
    this.currentMode = 'none';

    this.handleResize = this.handleResize.bind(this);
    this.handleEscape = this.handleEscape.bind(this);
    this.handleShutdown = this.handleShutdown.bind(this);
  }

  init(data = {}) {
    this.cityId =
      data.cityId ||
      gameState.currentCityId ||
      this.registry.get('currentCityId') ||
      this.registry.get('currentCity') ||
      'paris';

    this.isAnimatingOverlay = false;
    this.isOpeningNewspaper = false;
    this.currentMode = 'none';

    this.bgImage = null;
    this.bgVideo = null;
    this.sceneDim = null;
    this.videoTimer = null;

    this.overlayRoot = null;
    this.overlayBlocker = null;
    this.comixContainer = null;
    this.comixImage = null;
    this.comixCloseBtn = null;
  }

  preload() {
    if (this.cache.video.exists(VIDEO_KEY)) {
      return;
    }

    const [major = 3, minor = 0] = String(Phaser.VERSION)
      .split('.')
      .map(Number);

    const modernVideoLoader =
      major > 3 || (major === 3 && minor >= 60);

    if (modernVideoLoader) {
      this.load.video(VIDEO_KEY, VIDEO_URL, false);
    } else {
      this.load.video(
        VIDEO_KEY,
        VIDEO_URL,
        'loadeddata',
        false,
        true
      );
    }
  }

  create() {
    super.create();

    const { width, height } = this.scale;

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.handleShutdown
    );

    this.scale.on('resize', this.handleResize);

    if (this.input.keyboard) {
      this.trackInputEvent(
        this.input.keyboard,
        'keydown-ESC',
        this.handleEscape
      );
    }

    EventBus.emit('hideHUD');

    this.createBackground(width, height);
    this.createSceneDim(width, height);

    this.createPaperHotspots();
    this.createComixHotspots();
    this.createSceneCloseButton();
    this.createComixOverlay();

    this.videoTimer = this.time.delayedCall(
      VIDEO_DELAY_MS,
      () => {
        this.videoTimer = null;

        if (this.sys.isActive()) {
          this.switchToVideoBackground();
        }
      }
    );
  }

  createBackground(width, height) {
    if (this.textures.exists('newsstand_bg')) {
      this.bgImage = this.add
        .image(width / 2, height / 2, 'newsstand_bg')
        .setDepth(0)
        .setOrigin(0.5);

      this.resizeImageCover(this.bgImage);
    } else {
      console.error(
        '[NewsstandScene] Missing texture: newsstand_bg.'
      );

      this.add
        .rectangle(
          width / 2,
          height / 2,
          width,
          height,
          0x211815,
          1
        )
        .setDepth(0);

      this.add
        .text(
          width / 2,
          height / 2,
          [
            'NEWSSTAND BACKGROUND MISSING',
            '',
            'Expected texture key:',
            'newsstand_bg'
          ].join('\n'),
          {
            fontFamily: 'SpecialElite',
            fontSize: '28px',
            color: '#f7e6b5',
            align: 'center'
          }
        )
        .setOrigin(0.5)
        .setDepth(100);
    }

    if (!this.cache.video.exists(VIDEO_KEY)) {
      console.warn(
        '[NewsstandScene] Video unavailable. ' +
        'Background will remain static.'
      );
      return;
    }

    this.bgVideo = this.add
      .video(width / 2, height / 2, VIDEO_KEY)
      .setDepth(0)
      .setVisible(false)
      .setOrigin(0.5)
      .setLoop(false)
      .setMute(true);

    this.bgVideo.on('textureready', () => {
      this.resizeVideoCover(this.bgVideo);
    });

    this.bgVideo.on('playing', () => {
      if (!this.sys.isActive() || !this.bgVideo?.scene) {
        return;
      }

      this.resizeVideoCover(this.bgVideo);
      this.bgVideo.setVisible(true);
      this.bgImage?.setVisible(false);
    });

    this.bgVideo.on('complete', () => {
      if (this.sys.isActive()) {
        this.switchToImageBackground();
      }
    });

    this.bgVideo.on('error', () => {
      this.switchToImageBackground();
    });
  }

  createSceneDim(width, height) {
    this.sceneDim = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.42)
      .setOrigin(0, 0)
      .setDepth(1)
      .setInteractive();
  }

  getActiveCityId() {
    return (
      gameState.currentCityId ||
      this.cityId ||
      this.registry.get('currentCityId') ||
      this.registry.get('currentCity') ||
      'paris'
    );
  }

  switchToVideoBackground() {
    if (!this.bgVideo?.scene || !this.bgImage?.scene) {
      return;
    }

    this.bgVideo
      .setLoop(false)
      .setMute(true);

    this.resizeVideoCover(this.bgVideo);

    try {
      this.bgVideo.play();
    } catch (error) {
      console.warn(
        '[NewsstandScene] Could not play background video:',
        error
      );

      this.switchToImageBackground();
    }
  }

  switchToImageBackground() {
    this.bgVideo?.stop();
    this.bgVideo?.setVisible(false);
    this.bgImage?.setVisible(true);
  }

  resizeImageCover(image) {
    if (!image?.scene || !image.width || !image.height) {
      return;
    }

    const scale = Math.max(
      this.scale.width / image.width,
      this.scale.height / image.height
    );

    image
      .setPosition(this.scale.width / 2, this.scale.height / 2)
      .setScale(scale);
  }

  resizeVideoCover(video) {
    if (!video?.scene) {
      return;
    }

    const videoWidth =
      video.video?.videoWidth ||
      video.width;

    const videoHeight =
      video.video?.videoHeight ||
      video.height;

    if (!videoWidth || !videoHeight) {
      return;
    }

    const scale = Math.max(
      this.scale.width / videoWidth,
      this.scale.height / videoHeight
    );

    video
      .setPosition(this.scale.width / 2, this.scale.height / 2)
      .setScale(scale);
  }

  getHotspotScale() {
    return Math.min(
      this.scale.width / 1920,
      this.scale.height / 1080
    );
  }

  getScaledHotspot(spot) {
    const scale = this.getHotspotScale();

    return {
      ...spot,
      x: spot.x * scale,
      y: spot.y * scale,
      width: spot.width * scale,
      height: spot.height * scale
    };
  }

  createPriceLabel(spot) {
    return this.add
      .text(
        spot.x + spot.width / 2,
        spot.y + spot.height + 10,
        spot.priceLabel,
        {
          fontFamily: 'PressStart2P',
          fontSize: '12px',
          color: '#f6dc8c',
          backgroundColor: '#1a1111',
          padding: { x: 8, y: 6 },
          stroke: '#000000',
          strokeThickness: 3
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(spot.labelDepth);
  }

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
        backgroundKey: 'paper_daily_bg',
        price: NEWSPAPER_PRICE,
        priceLabel: 'DAILY PAPER — $5',
        labelDepth: 11
      }
    ];

    hotspots.forEach(rawSpot => {
      const spot = this.getScaledHotspot(rawSpot);

      this.add
        .zone(spot.x, spot.y, spot.width, spot.height)
        .setOrigin(0, 0)
        .setDepth(10)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          void this.buyAndOpenNewspaper(rawSpot);
        });

      this.createPriceLabel(spot);
    });
  }

  getCurrentGameDay() {
    return Math.max(
      1,
      Number(
        gameState.currentDay ??
        gameState.day ??
        this.registry.get('currentDay') ??
        this.registry.get('day') ??
        1
      ) || 1
    );
  }

  getNewspaperPurchaseKey(cityId, newspaperId) {
    const safeCityId = String(cityId || 'unknown_city')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');

    const safeNewspaperId = String(newspaperId || 'daily')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');

    return `${safeCityId}:${this.getCurrentGameDay()}:${safeNewspaperId}`;
  }

  ensureDailyNewspaperAccessState() {
    if (
      !gameState[DAILY_NEWSPAPER_ACCESS_KEY] ||
      typeof gameState[DAILY_NEWSPAPER_ACCESS_KEY] !== 'object' ||
      Array.isArray(gameState[DAILY_NEWSPAPER_ACCESS_KEY])
    ) {
      gameState[DAILY_NEWSPAPER_ACCESS_KEY] = {};
    }

    return gameState[DAILY_NEWSPAPER_ACCESS_KEY];
  }

  hasNewspaperAccessForToday(cityId, newspaperId) {
    const purchases = this.ensureDailyNewspaperAccessState();

    return purchases[
      this.getNewspaperPurchaseKey(cityId, newspaperId)
    ] === true;
  }

  markNewspaperAccessForToday(cityId, newspaperId) {
    const purchases = this.ensureDailyNewspaperAccessState();

    const purchaseKey = this.getNewspaperPurchaseKey(
      cityId,
      newspaperId
    );

    purchases[purchaseKey] = true;

    requestAutosave();

    return purchaseKey;
  }

  async buyAndOpenNewspaper(spot) {
    if (
      this.isAnimatingOverlay ||
      this.isOpeningNewspaper ||
      this.currentMode !== 'none'
    ) {
      return;
    }

    this.isOpeningNewspaper = true;

    try {
      const cityId = this.getActiveCityId();

      const alreadyPaidToday =
        this.hasNewspaperAccessForToday(cityId, spot.id);

      let purchaseId = null;

      if (!alreadyPaidToday) {
        const purchase = moneyManager.spend(spot.price, {
          source: MONEY_SOURCE.CASH,
          category: ECONOMY_CATEGORY.NEWSPAPER,
          description:
            `Bought ${spot.type} newspaper in ${cityId} ` +
            `on investigation day ${this.getCurrentGameDay()}`,
          metadata: {
            cityId,
            newspaperId: spot.id,
            newspaperType: spot.type,
            gameDay: this.getCurrentGameDay()
          }
        });

        if (!purchase.ok) {
          this.showNotEnoughMoneyMessage(
            'NEWSPAPER',
            purchase.required,
            purchase.available
          );
          return;
        }

        purchaseId = purchase.transaction?.id || null;

        this.markNewspaperAccessForToday(cityId, spot.id);
      }

      this.cityId = cityId;

      this.stopSceneIfActive('NewspaperOverlayScene');

      const opened = await this.launchOverlay(
        'NewspaperOverlayScene',
        {
          cityId,
          type: spot.type,
          jsonKey: spot.jsonKey,
          backgroundKey: spot.backgroundKey,
          purchaseId,
          alreadyPaidToday,
          sourceScene: 'NewsstandScene'
        }
      );

      if (!opened && this.sys.isActive()) {
        console.error(
          '[NewsstandScene] Could not open NewspaperOverlayScene.'
        );

        this.showPurchaseErrorMessage();
      }
    } catch (error) {
      console.error(
        '[NewsstandScene] Newspaper purchase/open failed:',
        error
      );

      if (this.sys.isActive()) {
        this.showPurchaseErrorMessage();
      }
    } finally {
      this.isOpeningNewspaper = false;
    }
  }

  createComixHotspots() {
    const hotspots = [
      {
        id: 'comix_1',
        x: 1500,
        y: 710,
        width: 250,
        height: 230,
        textureKey: 'comix1',
        price: COMIX_PRICE,
        priceLabel: 'COMIX — $1',
        labelDepth: 13
      }
    ];

    hotspots.forEach(rawSpot => {
      const spot = this.getScaledHotspot(rawSpot);

      this.add
        .zone(spot.x, spot.y, spot.width, spot.height)
        .setOrigin(0, 0)
        .setDepth(12)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          this.buyAndOpenComix(rawSpot);
        });

      this.createPriceLabel(spot);
    });
  }

  buyAndOpenComix(spot) {
    if (
      this.isAnimatingOverlay ||
      this.isOpeningNewspaper ||
      this.currentMode !== 'none'
    ) {
      return;
    }

    if (!this.textures.exists(spot.textureKey)) {
      console.error(
        `[NewsstandScene] Missing comix texture: ${spot.textureKey}`
      );

      this.showPurchaseErrorMessage(
        [
          'COMIX UNAVAILABLE!',
          '',
          'The vendor misplaced this issue.',
          'You have not been charged.'
        ].join('\n')
      );
      return;
    }

    const cityId = this.getActiveCityId();

    const purchase = moneyManager.spend(spot.price, {
      source: MONEY_SOURCE.CASH,
      category: ECONOMY_CATEGORY.ITEM,
      description: `Bought ${spot.id} in ${cityId}`,
      metadata: {
        cityId,
        comixId: spot.id,
        textureKey: spot.textureKey
      }
    });

    if (!purchase.ok) {
      this.showNotEnoughMoneyMessage(
        'COMIX',
        purchase.required,
        purchase.available
      );
      return;
    }

    this.openComixOverlay(spot.textureKey);
  }

  showNotEnoughMoneyMessage(itemName, required, available) {
    const message = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2,
        [
          'NO CASH!',
          '',
          `${itemName}: $${required}`,
          `You have: $${available}`,
          '',
          'The vendor says:',
          '"Come back when your pockets make noise."'
        ].join('\n'),
        {
          fontFamily: 'SpecialElite',
          fontSize: '28px',
          color: '#f7e6b5',
          backgroundColor: '#1d1511',
          align: 'center',
          padding: { x: 28, y: 24 },
          stroke: '#000000',
          strokeThickness: 5
        }
      )
      .setOrigin(0.5)
      .setDepth(500)
      .setAlpha(0)
      .setInteractive({ useHandCursor: true });

    this.addTrackedTween(
      this.tweens.add({
        targets: message,
        alpha: 1,
        duration: 120,
        ease: 'Quad.Out'
      })
    );

    message.once('pointerup', () => {
      this.addTrackedTween(
        this.tweens.add({
          targets: message,
          alpha: 0,
          duration: 120,
          ease: 'Quad.In',
          onComplete: () => message.destroy()
        })
      );
    });
  }

  showPurchaseErrorMessage(text = null) {
    const message = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2,
        text || [
          'THE PRESS STOPPED!',
          '',
          'The newspaper could not be opened.',
          'If already paid, today’s access remains available.',
          '',
          'Close this message and try again.'
        ].join('\n'),
        {
          fontFamily: 'SpecialElite',
          fontSize: '26px',
          color: '#ffd966',
          backgroundColor: '#2b1711',
          align: 'center',
          padding: { x: 26, y: 22 },
          stroke: '#000000',
          strokeThickness: 5
        }
      )
      .setOrigin(0.5)
      .setDepth(501)
      .setInteractive({ useHandCursor: true });

    message.once('pointerup', () => {
      message.destroy();
    });
  }

  createComixOverlay() {
    const { width, height } = this.scale;

    this.overlayRoot = this.add
      .container(0, 0)
      .setDepth(200)
      .setVisible(false)
      .setAlpha(0);

    this.overlayBlocker = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.72)
      .setOrigin(0, 0)
      .setInteractive();

    this.overlayBlocker.on('pointerup', () => {
      this.closeComixOverlay();
    });

    this.comixContainer = this.add
      .container(width / 2, height / 2)
      .setAlpha(0)
      .setScale(0.9);

    if (this.textures.exists('comix1')) {
      this.comixImage = this.add
        .image(0, 0, 'comix1')
        .setOrigin(0.5);
    } else {
      this.comixImage = this.add
        .rectangle(0, 0, 500, 650, 0x35241c, 1)
        .setStrokeStyle(4, 0xf6dc8c);
    }

    this.comixCloseBtn = this.add
      .text(0, 0, 'X', {
        fontFamily: 'PressStart2P',
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#111111',
        padding: { x: 8, y: 6 }
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    this.comixCloseBtn.on('pointerup', () => {
      this.closeComixOverlay();
    });

    this.comixContainer.add([
      this.comixImage,
      this.comixCloseBtn
    ]);

    this.overlayRoot.add([
      this.overlayBlocker,
      this.comixContainer
    ]);

    this.layoutComixOverlay();
  }

  layoutComixOverlay() {
    if (!this.comixImage || !this.comixCloseBtn) {
      return;
    }

    const textureWidth = this.comixImage.width || 1;
    const textureHeight = this.comixImage.height || 1;

    const imageScale = Math.min(
      (this.scale.width * 0.84) / textureWidth,
      (this.scale.height * 0.82) / textureHeight,
      1
    );

    const displayWidth = textureWidth * imageScale;
    const displayHeight = textureHeight * imageScale;

    this.comixImage.setDisplaySize(
      displayWidth,
      displayHeight
    );

    this.comixCloseBtn.setPosition(
      displayWidth / 2 - 12,
      -displayHeight / 2 + 12
    );

    this.comixContainer?.setPosition(
      this.scale.width / 2,
      this.scale.height / 2
    );
  }

  openComixOverlay(textureKey) {
    if (
      !this.overlayRoot ||
      !this.comixImage ||
      this.isAnimatingOverlay ||
      this.currentMode !== 'none'
    ) {
      return;
    }

    this.currentMode = 'comix';
    this.isAnimatingOverlay = true;

    if (this.comixImage.setTexture) {
      this.comixImage.setTexture(textureKey);
    }

    this.layoutComixOverlay();

    this.overlayRoot
      .setVisible(true)
      .setAlpha(0);

    this.comixContainer
      .setAlpha(0)
      .setScale(0.9)
      .setAngle(0)
      .setPosition(
        this.scale.width / 2,
        this.scale.height / 2 + 12
      );

    this.addTrackedTween(
      this.tweens.add({
        targets: this.overlayRoot,
        alpha: 1,
        duration: 140,
        ease: 'Quad.Out'
      })
    );

    this.addTrackedTween(
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
      })
    );
  }

  closeComixOverlay(onClosed) {
    if (
      !this.overlayRoot?.visible ||
      this.isAnimatingOverlay
    ) {
      return;
    }

    this.isAnimatingOverlay = true;

    this.addTrackedTween(
      this.tweens.add({
        targets: this.overlayRoot,
        alpha: 0,
        duration: 140,
        ease: 'Quad.Out'
      })
    );

    this.addTrackedTween(
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
          this.overlayRoot?.setVisible(false);

          this.comixContainer
            ?.setAlpha(0)
            .setAngle(0)
            .setPosition(
              this.scale.width / 2,
              this.scale.height / 2
            );

          this.currentMode = 'none';
          this.isAnimatingOverlay = false;

          onClosed?.();
        }
      })
    );
  }

  createSceneCloseButton() {
    const button = this.add
      .text(28, 20, 'X', {
        fontFamily: 'PressStart2P',
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#111111',
        padding: { x: 10, y: 8 }
      })
      .setOrigin(0, 0)
      .setDepth(30)
      .setInteractive({ useHandCursor: true });

    button.on('pointerup', () => {
      if (this.overlayRoot?.visible) {
        this.closeComixOverlay(() => {
          this.closeScene();
        });
        return;
      }

      this.closeScene();
    });
  }

  handleEscape() {
    if (this.overlayRoot?.visible) {
      this.closeComixOverlay();
      return;
    }

    this.closeScene();
  }

  handleResize() {
    const { width, height } = this.scale;

    this.resizeImageCover(this.bgImage);
    this.resizeVideoCover(this.bgVideo);

    this.sceneDim?.setSize(width, height);
    this.overlayBlocker?.setSize(width, height);

    this.layoutComixOverlay();
  }

  closeScene() {
    if (
      this.isAnimatingOverlay ||
      this.isOpeningNewspaper
    ) {
      return;
    }

    this.scene.stop();
  }

  handleShutdown() {
    this.videoTimer?.remove(false);
    this.videoTimer = null;

    this.bgVideo?.stop();
    this.bgVideo?.removeAllListeners();

    this.scale.off('resize', this.handleResize);

    this.stopSceneIfActive('NewspaperOverlayScene');

    EventBus.emit('showHUD');

    this.isAnimatingOverlay = false;
    this.isOpeningNewspaper = false;
    this.currentMode = 'none';

    this.bgImage = null;
    this.bgVideo = null;
    this.sceneDim = null;

    this.overlayRoot = null;
    this.overlayBlocker = null;
    this.comixContainer = null;
    this.comixImage = null;
    this.comixCloseBtn = null;
  }
}