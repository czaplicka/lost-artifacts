import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { moneyManager, MONEY_SOURCE, ECONOMY_CATEGORY } from '../managers/MoneyManager.js';
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';

const NEWSPAPER_PRICE = 5;
const COMIX_PRICE = 1;
const DAILY_NEWSPAPER_ACCESS_KEY = 'dailyNewspaperAccess';
const VIDEO_URL = 'assets/video/newsstand.mp4';
const VIDEO_DELAY_MS = 10000;
const VIDEO_CHECK_DELAY_MS = 5000;
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
// 1 means the background is never reduced below its native pixel dimensions.
const MIN_BACKGROUND_SCALE = 1;

export class NewsstandScene extends BaseScene {
  constructor() {
    super({ key: 'NewsstandScene' });
    this.cityId = 'paris';
    this.handleResize = this.handleResize.bind(this);
    this.handleEscape = this.handleEscape.bind(this);
    this.handleShutdown = this.handleShutdown.bind(this);
    this.retryVideoFromPointer = this.retryVideoFromPointer.bind(this);
  }

  init(data = {}) {
    this.cityId = data.cityId || gameState.currentCityId ||
      this.registry.get('currentCityId') || this.registry.get('currentCity') || 'paris';
    this.isAnimatingOverlay = false;
    this.isOpeningNewspaper = false;
    this.currentMode = 'none';
    this.bgImage = this.bgVideo = this.sceneDim = null;
    this.videoTimer = this.videoCheckTimer = null;
    this.videoRequested = this.videoVisible = this.videoFinished = false;
    this.overlayRoot = this.overlayBlocker = this.comixContainer = null;
    this.comixImage = this.comixCloseBtn = null;
    this.hotspotEntries = [];
    this.backgroundTransform = null;
    this.missingBackgroundText = null;
  }

  preload() {}

  create() {
    super.create();
    const { width, height } = this.scale;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown);
    this.scale.on('resize', this.handleResize);
    if (this.input.keyboard) {
      this.trackInputEvent(this.input.keyboard, 'keydown-ESC', this.handleEscape);
    }
    this.input.on('pointerdown', this.retryVideoFromPointer);
    EventBus.emit('hideHUD');
    this.createBackground(width, height);
    this.createSceneDim(width, height);
    this.createPaperHotspots();
    this.createComixHotspots();
    this.createSceneCloseButton();
    this.createComixOverlay();
    this.videoTimer = this.time.delayedCall(VIDEO_DELAY_MS, () => {
      this.videoTimer = null;
      if (this.sys.isActive()) this.switchToVideoBackground();
    });
  }

  createBackground(width, height) {
    if (this.textures.exists('newsstand_bg')) {
      this.bgImage = this.add.image(width / 2, height / 2, 'newsstand_bg')
        .setDepth(0).setOrigin(0.5);
      this.resizeImageCover(this.bgImage);
    } else {
      console.error('[NewsstandScene] Missing texture: newsstand_bg.');
      this.bgImage = this.add.rectangle(width / 2, height / 2, width, height, 0x211815, 1)
        .setDepth(0);
      this.missingBackgroundText = this.add.text(width / 2, height / 2,
        'NEWSSTAND BACKGROUND MISSING\n\nnewsstand_bg', {
          fontFamily: 'SpecialElite', fontSize: '28px', color: '#f7e6b5', align: 'center'
        }).setOrigin(0.5).setDepth(100);
      this.setBackgroundTransform(DESIGN_WIDTH, DESIGN_HEIGHT);
    }
    this.bgVideo = this.add.video(width / 2, height / 2)
      .setDepth(0.5).setOrigin(0.5).setVisible(false);
    const events = Phaser.GameObjects.Events;
    const revealVideo = () => {
      if (!this.sys.isActive() || !this.videoRequested || this.videoFinished || !this.bgVideo?.scene) return;
      const element = this.bgVideo.video;
      if (!element || element.readyState < 2 || !element.videoWidth || !element.videoHeight) return;
      this.resizeVideoCover(this.bgVideo);
      this.bgVideo.setVisible(true);
      this.bgImage?.setVisible(false);
      this.videoVisible = true;
      this.setBackgroundTransform(element.videoWidth, element.videoHeight);
      this.layoutHotspots();
      this.videoCheckTimer?.remove(false);
      this.videoCheckTimer = null;
    };
    this.bgVideo.on(events.VIDEO_PLAY || 'play', revealVideo);
    this.bgVideo.on(events.VIDEO_CREATED || 'created', revealVideo);
    this.bgVideo.on(events.VIDEO_TEXTURE || 'textureready', revealVideo);
    this.bgVideo.on(events.VIDEO_PLAYING || 'playing', () => {
      if (this.bgVideo?.frameReady) revealVideo();
    });
    this.bgVideo.on(events.VIDEO_COMPLETE || 'complete', () => {
      this.videoFinished = true;
      this.switchToImageBackground();
    });
    this.bgVideo.on(events.VIDEO_LOCKED || 'locked', () => {
      console.warn('[NewsstandScene] Video blocked by browser. Click inside the game to retry.');
      this.logVideoStatus();
    });
    this.bgVideo.on(events.VIDEO_UNLOCKED || 'unlocked', () => {
      console.info('[NewsstandScene] Video unlocked.');
    });
    for (const eventName of [events.VIDEO_UNSUPPORTED || 'unsupported', events.VIDEO_ERROR || 'error']) {
      this.bgVideo.on(eventName, error => {
        console.error('[NewsstandScene] Video unavailable.', error);
        this.logVideoStatus();
        this.videoFinished = true;
        this.switchToImageBackground();
      });
    }
    try {
      this.bgVideo.loadURL(VIDEO_URL, true);
      this.bgVideo.setMute(true);
      this.bgVideo.setLoop(false);
    } catch (error) {
      console.error('[NewsstandScene] Video setup failed.', error);
      this.videoFinished = true;
      this.switchToImageBackground();
    }
  }

  createSceneDim(width, height) {
    this.sceneDim = this.add.rectangle(0, 0, width, height, 0x000000, 0.42)
      .setOrigin(0, 0).setDepth(1).setInteractive();
  }

  switchToVideoBackground() {
    if (!this.bgVideo?.scene || this.videoFinished) return;
    this.videoRequested = true;
    try {
      const element = this.bgVideo.video;
      if (element) {
        element.muted = true;
        element.defaultMuted = true;
        element.playsInline = true;
        element.setAttribute('playsinline', '');
        element.setAttribute('webkit-playsinline', '');
      }
      this.bgVideo.setMute(true).setLoop(false);
      this.resizeVideoCover(this.bgVideo);
      this.bgVideo.play(false);
      this.videoCheckTimer?.remove(false);
      this.videoCheckTimer = this.time.delayedCall(VIDEO_CHECK_DELAY_MS, () => {
        this.videoCheckTimer = null;
        if (this.sys.isActive() && !this.videoVisible && !this.videoFinished) {
          console.warn('[NewsstandScene] Video has not become visible.');
          this.logVideoStatus();
        }
      });
    } catch (error) {
      console.error('[NewsstandScene] Could not start video.', error);
      this.logVideoStatus();
      this.switchToImageBackground();
    }
  }

  retryVideoFromPointer() {
    if (!this.videoRequested || this.videoVisible || this.videoFinished || !this.bgVideo?.scene) return;
    if (this.bgVideo.touchLocked) this.bgVideo.play(false);
  }

  logVideoStatus() {
    const element = this.bgVideo?.video;
    console.info('[NewsstandScene] Video status:', {
      sceneActive: this.sys.isActive(), scenePaused: this.sys.isPaused(),
      requested: this.videoRequested, visible: this.videoVisible, finished: this.videoFinished,
      currentSrc: element?.currentSrc || element?.src || null,
      readyState: element?.readyState, networkState: element?.networkState,
      currentTime: element?.currentTime, duration: element?.duration,
      paused: element?.paused, ended: element?.ended, muted: element?.muted,
      videoWidth: element?.videoWidth, videoHeight: element?.videoHeight,
      frameReady: this.bgVideo?.frameReady, touchLocked: this.bgVideo?.touchLocked,
      mediaErrorCode: element?.error?.code, mediaErrorMessage: element?.error?.message
    });
  }

  switchToImageBackground() {
    this.videoCheckTimer?.remove(false);
    this.videoCheckTimer = null;
    this.bgVideo?.stop();
    this.bgVideo?.setVisible(false);
    this.bgImage?.setVisible(true);
    this.videoVisible = false;
    if (this.bgImage?.texture) {
      this.resizeImageCover(this.bgImage);
    } else {
      this.setBackgroundTransform(DESIGN_WIDTH, DESIGN_HEIGHT);
    }
    this.layoutHotspots();
  }

  getCoverTransform(sourceWidth, sourceHeight) {
    const scale = Math.max(MIN_BACKGROUND_SCALE,
      this.scale.width / sourceWidth, this.scale.height / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    return {
      scale, width, height,
      x: (this.scale.width - width) / 2,
      y: (this.scale.height - height) / 2
    };
  }

  setBackgroundTransform(sourceWidth, sourceHeight) {
    this.backgroundTransform = this.getCoverTransform(sourceWidth, sourceHeight);
  }

  resizeImageCover(image) {
    if (!image?.scene || !image.width || !image.height) return;
    if (!image.texture) {
      image.setPosition(this.scale.width / 2, this.scale.height / 2)
        .setDisplaySize(this.scale.width, this.scale.height);
      return;
    }
    const transform = this.getCoverTransform(image.width, image.height);
    image.setPosition(this.scale.width / 2, this.scale.height / 2).setScale(transform.scale);
    if (!this.videoVisible) this.backgroundTransform = transform;
  }

  resizeVideoCover(video) {
    if (!video?.scene) return;
    const width = video.video?.videoWidth || video.width;
    const height = video.video?.videoHeight || video.height;
    if (!width || !height) return;
    const transform = this.getCoverTransform(width, height);
    video.setPosition(this.scale.width / 2, this.scale.height / 2).setScale(transform.scale);
    if (this.videoVisible) this.backgroundTransform = transform;
  }

  getActiveCityId() {
    return gameState.currentCityId || this.cityId || this.registry.get('currentCityId') ||
      this.registry.get('currentCity') || 'paris';
  }

  getScaledHotspot(spot) {
    const transform = this.backgroundTransform || this.getCoverTransform(DESIGN_WIDTH, DESIGN_HEIGHT);
    const sx = transform.width / DESIGN_WIDTH;
    const sy = transform.height / DESIGN_HEIGHT;
    return { ...spot,
      x: transform.x + spot.x * sx,
      y: transform.y + spot.y * sy,
      width: spot.width * sx, height: spot.height * sy
    };
  }

  createPriceLabel(spot) {
    return this.add.text(spot.x + spot.width / 2, spot.y + spot.height + 10, spot.priceLabel, {
      fontFamily: 'PressStart2P', fontSize: '12px', color: '#f6dc8c',
      backgroundColor: '#1a1111', padding: { x: 8, y: 6 }, stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5, 0).setDepth(spot.labelDepth);
  }

  addPurchaseHotspot(rawSpot, depth, callback) {
    const spot = this.getScaledHotspot(rawSpot);
    const zone = this.add.zone(spot.x, spot.y, spot.width, spot.height)
      .setOrigin(0, 0).setDepth(depth).setInteractive({ useHandCursor: true });
    zone.on('pointerup', callback);
    const label = this.createPriceLabel(spot);
    this.hotspotEntries.push({ rawSpot, zone, label });
  }

  layoutHotspots() {
    for (const { rawSpot, zone, label } of this.hotspotEntries || []) {
      const spot = this.getScaledHotspot(rawSpot);
      zone.setPosition(spot.x, spot.y).setSize(spot.width, spot.height);
      zone.input?.hitArea?.setTo(0, 0, spot.width, spot.height);
      label.setPosition(spot.x + spot.width / 2, spot.y + spot.height + 10);
    }
  }

  createPaperHotspots() {
    const spot = {
      id: 'daily', x: 510, y: 710, width: 460, height: 230,
      type: 'daily', jsonKey: 'newspapers_daily', backgroundKey: 'paper_daily_bg',
      price: NEWSPAPER_PRICE, priceLabel: 'DAILY PAPER — $5', labelDepth: 11
    };
    this.addPurchaseHotspot(spot, 10, () => { void this.buyAndOpenNewspaper(spot); });
  }

  getCurrentGameDay() {
    return Math.max(1, Number(gameState.currentDay ?? gameState.day ??
      this.registry.get('currentDay') ?? this.registry.get('day') ?? 1) || 1);
  }

  getNewspaperPurchaseKey(cityId, newspaperId) {
    const safeCityId = String(cityId || 'unknown_city').trim().toLowerCase().replace(/\s+/g, '_');
    const safeNewspaperId = String(newspaperId || 'daily').trim().toLowerCase().replace(/\s+/g, '_');
    return `${safeCityId}:${this.getCurrentGameDay()}:${safeNewspaperId}`;
  }

  ensureDailyNewspaperAccessState() {
    if (!gameState[DAILY_NEWSPAPER_ACCESS_KEY] ||
      typeof gameState[DAILY_NEWSPAPER_ACCESS_KEY] !== 'object' ||
      Array.isArray(gameState[DAILY_NEWSPAPER_ACCESS_KEY])) {
      gameState[DAILY_NEWSPAPER_ACCESS_KEY] = {};
    }
    return gameState[DAILY_NEWSPAPER_ACCESS_KEY];
  }

  hasNewspaperAccessForToday(cityId, newspaperId) {
    return this.ensureDailyNewspaperAccessState()[this.getNewspaperPurchaseKey(cityId, newspaperId)] === true;
  }

  markNewspaperAccessForToday(cityId, newspaperId) {
    const purchases = this.ensureDailyNewspaperAccessState();
    const key = this.getNewspaperPurchaseKey(cityId, newspaperId);
    purchases[key] = true;
    requestAutosave();
    return key;
  }

  async buyAndOpenNewspaper(spot) {
    if (this.isAnimatingOverlay || this.isOpeningNewspaper || this.currentMode !== 'none') return;
    this.isOpeningNewspaper = true;
    try {
      const cityId = this.getActiveCityId();
      const alreadyPaidToday = this.hasNewspaperAccessForToday(cityId, spot.id);
      let purchaseId = null;
      if (!alreadyPaidToday) {
        const purchase = moneyManager.spend(spot.price, {
          source: MONEY_SOURCE.CASH, category: ECONOMY_CATEGORY.NEWSPAPER,
          description: `Bought ${spot.type} newspaper in ${cityId} on investigation day ${this.getCurrentGameDay()}`,
          metadata: { cityId, newspaperId: spot.id, newspaperType: spot.type, gameDay: this.getCurrentGameDay() }
        });
        if (!purchase.ok) {
          this.showNotEnoughMoneyMessage('NEWSPAPER', purchase.required, purchase.available);
          return;
        }
        purchaseId = purchase.transaction?.id || null;
        this.markNewspaperAccessForToday(cityId, spot.id);
      }
      this.cityId = cityId;
      this.stopSceneIfActive('NewspaperOverlayScene');
      const opened = await this.launchOverlay('NewspaperOverlayScene', {
        cityId, type: spot.type, jsonKey: spot.jsonKey, backgroundKey: spot.backgroundKey,
        purchaseId, alreadyPaidToday, sourceScene: 'NewsstandScene'
      });
      if (!opened && this.sys.isActive()) this.showPurchaseErrorMessage();
    } catch (error) {
      console.error('[NewsstandScene] Newspaper purchase/open failed:', error);
      if (this.sys.isActive()) this.showPurchaseErrorMessage();
    } finally {
      this.isOpeningNewspaper = false;
    }
  }

  createComixHotspots() {
    const spot = { id: 'comix_1', x: 1500, y: 710, width: 250, height: 230,
      textureKey: 'comix1', price: COMIX_PRICE, priceLabel: 'COMIX — $1', labelDepth: 13 };
    this.addPurchaseHotspot(spot, 12, () => this.buyAndOpenComix(spot));
  }

  buyAndOpenComix(spot) {
    if (this.isAnimatingOverlay || this.isOpeningNewspaper || this.currentMode !== 'none') return;
    if (!this.textures.exists(spot.textureKey)) {
      console.error(`[NewsstandScene] Missing comix texture: ${spot.textureKey}`);
      this.showPurchaseErrorMessage('COMIX UNAVAILABLE!\n\nThe vendor misplaced this issue.\nYou have not been charged.');
      return;
    }
    const cityId = this.getActiveCityId();
    const purchase = moneyManager.spend(spot.price, {
      source: MONEY_SOURCE.CASH, category: ECONOMY_CATEGORY.ITEM,
      description: `Bought ${spot.id} in ${cityId}`,
      metadata: { cityId, comixId: spot.id, textureKey: spot.textureKey }
    });
    if (!purchase.ok) {
      this.showNotEnoughMoneyMessage('COMIX', purchase.required, purchase.available);
      return;
    }
    this.openComixOverlay(spot.textureKey);
  }

  showNotEnoughMoneyMessage(itemName, required, available) {
    const message = this.add.text(this.scale.width / 2, this.scale.height / 2, [
      'NO CASH!', '', `${itemName}: $${required}`, `You have: $${available}`, '',
      'The vendor says:', '"Come back when your pockets make noise."'
    ].join('\n'), {
      fontFamily: 'SpecialElite', fontSize: '28px', color: '#f7e6b5', backgroundColor: '#1d1511',
      align: 'center', padding: { x: 28, y: 24 }, stroke: '#000000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(500).setAlpha(0).setInteractive({ useHandCursor: true });
    this.addTrackedTween(this.tweens.add({ targets: message, alpha: 1, duration: 120, ease: 'Quad.Out' }));
    message.once('pointerup', () => {
      this.addTrackedTween(this.tweens.add({ targets: message, alpha: 0, duration: 120,
        ease: 'Quad.In', onComplete: () => message.destroy() }));
    });
  }

  showPurchaseErrorMessage(text = null) {
    const message = this.add.text(this.scale.width / 2, this.scale.height / 2, text || [
      'THE PRESS STOPPED!', '', 'The newspaper could not be opened.',
      'If already paid, today’s access remains available.', '', 'Close this message and try again.'
    ].join('\n'), {
      fontFamily: 'SpecialElite', fontSize: '26px', color: '#ffd966', backgroundColor: '#2b1711',
      align: 'center', padding: { x: 26, y: 22 }, stroke: '#000000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(501).setInteractive({ useHandCursor: true });
    message.once('pointerup', () => message.destroy());
  }

  createComixOverlay() {
    const { width, height } = this.scale;
    this.overlayRoot = this.add.container(0, 0).setDepth(200).setVisible(false).setAlpha(0);
    this.overlayBlocker = this.add.rectangle(0, 0, width, height, 0x000000, 0.72)
      .setOrigin(0, 0).setInteractive();
    this.overlayBlocker.on('pointerup', () => this.closeComixOverlay());
    this.comixContainer = this.add.container(width / 2, height / 2).setAlpha(0).setScale(0.9);
    this.comixImage = this.textures.exists('comix1')
      ? this.add.image(0, 0, 'comix1').setOrigin(0.5)
      : this.add.rectangle(0, 0, 500, 650, 0x35241c, 1).setStrokeStyle(4, 0xf6dc8c);
    this.comixCloseBtn = this.add.text(0, 0, 'X', {
      fontFamily: 'PressStart2P', fontSize: '12px', color: '#ffffff', backgroundColor: '#111111',
      padding: { x: 8, y: 6 }
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.comixCloseBtn.on('pointerup', () => this.closeComixOverlay());
    this.comixContainer.add([this.comixImage, this.comixCloseBtn]);
    this.overlayRoot.add([this.overlayBlocker, this.comixContainer]);
    this.layoutComixOverlay();
  }

  layoutComixOverlay() {
    if (!this.comixImage || !this.comixCloseBtn) return;
    const w = this.comixImage.width || 1, h = this.comixImage.height || 1;
    const scale = Math.min(this.scale.width * 0.84 / w, this.scale.height * 0.82 / h, 1);
    const displayWidth = w * scale, displayHeight = h * scale;
    this.comixImage.setDisplaySize(displayWidth, displayHeight);
    this.comixCloseBtn.setPosition(displayWidth / 2 - 12, -displayHeight / 2 + 12);
    this.comixContainer?.setPosition(this.scale.width / 2, this.scale.height / 2);
  }

  openComixOverlay(textureKey) {
    if (!this.overlayRoot || !this.comixImage || this.isAnimatingOverlay || this.currentMode !== 'none') return;
    this.currentMode = 'comix';
    this.isAnimatingOverlay = true;
    if (this.comixImage.setTexture) this.comixImage.setTexture(textureKey);
    this.layoutComixOverlay();
    this.overlayRoot.setVisible(true).setAlpha(0);
    this.comixContainer.setAlpha(0).setScale(0.9).setAngle(0)
      .setPosition(this.scale.width / 2, this.scale.height / 2 + 12);
    this.addTrackedTween(this.tweens.add({ targets: this.overlayRoot,
      alpha: 1, duration: 140, ease: 'Quad.Out' }));
    this.addTrackedTween(this.tweens.add({ targets: this.comixContainer,
      alpha: 1, scaleX: 1, scaleY: 1, y: this.scale.height / 2,
      duration: 200, ease: 'Back.Out', onComplete: () => { this.isAnimatingOverlay = false; } }));
  }

  closeComixOverlay(onClosed) {
    if (!this.overlayRoot?.visible || this.isAnimatingOverlay) return;
    this.isAnimatingOverlay = true;
    this.addTrackedTween(this.tweens.add({ targets: this.overlayRoot,
      alpha: 0, duration: 140, ease: 'Quad.Out' }));
    this.addTrackedTween(this.tweens.add({ targets: this.comixContainer,
      alpha: 0, scaleX: 0.86, scaleY: 0.86, y: this.scale.height / 2 + 18,
      angle: 1.5, duration: 180, ease: 'Quad.In', onComplete: () => {
        this.overlayRoot?.setVisible(false);
        this.comixContainer?.setAlpha(0).setAngle(0)
          .setPosition(this.scale.width / 2, this.scale.height / 2);
        this.currentMode = 'none';
        this.isAnimatingOverlay = false;
        onClosed?.();
      } }));
  }

  createSceneCloseButton() {
    const button = this.add.text(28, 20, 'X', {
      fontFamily: 'PressStart2P', fontSize: '16px', color: '#ffffff',
      backgroundColor: '#111111', padding: { x: 10, y: 8 }
    }).setOrigin(0, 0).setDepth(30).setInteractive({ useHandCursor: true });
    button.on('pointerup', () => {
      if (this.overlayRoot?.visible) {
        this.closeComixOverlay(() => this.closeScene());
        return;
      }
      this.closeScene();
    });
  }

  handleEscape() {
    if (this.overlayRoot?.visible) { this.closeComixOverlay(); return; }
    this.closeScene();
  }

  handleResize() {
    const { width, height } = this.scale;
    this.resizeImageCover(this.bgImage);
    this.resizeVideoCover(this.bgVideo);
    this.sceneDim?.setSize(width, height);
    this.sceneDim?.input?.hitArea?.setTo(0, 0, width, height);
    this.overlayBlocker?.setSize(width, height);
    this.overlayBlocker?.input?.hitArea?.setTo(0, 0, width, height);
    this.missingBackgroundText?.setPosition(width / 2, height / 2);
    this.layoutHotspots();
    this.layoutComixOverlay();
  }

  closeScene() {
    if (this.isAnimatingOverlay || this.isOpeningNewspaper) return;
    this.scene.stop();
  }

  handleShutdown() {
    this.videoTimer?.remove(false);
    this.videoCheckTimer?.remove(false);
    this.videoTimer = this.videoCheckTimer = null;
    this.input.off('pointerdown', this.retryVideoFromPointer);
    this.bgVideo?.removeAllListeners();
    this.bgVideo?.stop();
    this.scale.off('resize', this.handleResize);
    this.stopSceneIfActive('NewspaperOverlayScene');
    EventBus.emit('showHUD');
    this.isAnimatingOverlay = this.isOpeningNewspaper = false;
    this.currentMode = 'none';
    this.videoRequested = this.videoVisible = this.videoFinished = false;
    this.bgImage = this.bgVideo = this.sceneDim = null;
    this.overlayRoot = this.overlayBlocker = this.comixContainer = null;
    this.comixImage = this.comixCloseBtn = null;
    this.hotspotEntries = [];
    this.backgroundTransform = null;
    this.missingBackgroundText = null;
  }
}