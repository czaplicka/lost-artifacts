import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { moneyManager, MONEY_SOURCE, ECONOMY_CATEGORY } from '../MoneyManager.js';
import { gameState } from '../GameData.js';

const NEWSPAPER_PRICE = 5;
const COMIX_PRICE = 1;

export class NewsstandScene extends BaseScene {
  constructor() {
    super({ key: 'NewsstandScene' });
    this.cityId = 'paris';
    this.bgImage = null;
    this.bgVideo = null;
    this.sceneDim = null;
    this.overlayRoot = null;
    this.overlayBlocker = null;
    this.comixContainer = null;
    this.comixImage = null;
    this.comixCloseBtn = null;
    this.isAnimatingOverlay = false;
    this.currentMode = 'none';
    this.handleResize = this.handleResize.bind(this);
    this.handleEscape = this.handleEscape.bind(this);
  }

init(data = {}) {
  this.cityId =
    data.cityId ||
    gameState.currentCityId ||
    this.registry.get('currentCityId') ||
    this.registry.get('currentCity') ||
    'paris';

  console.log('[NewsstandScene] Opened in city:', {
    receivedCityId: data.cityId,
    gameStateCityId: gameState.currentCityId,
    registryCityId: this.registry.get('currentCityId'),
    resolvedCityId: this.cityId
  });
}

  create() {
    super.create();
    const { width, height } = this.scale;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.scale.on('resize', this.handleResize);
    this.input.keyboard?.on('keydown-ESC', this.handleEscape);

    const hud = this.scene.get('NewsHud');
    hud?.events.emit('setNewspaperVisible', false);
    hud?.events.emit('setTvVisible', false);

    this.bgImage = this.add.image(width / 2, height / 2, 'newsstand_bg').setDepth(0).setOrigin(0.5);
    this.bgVideo = this.add.video(width / 2, height / 2, 'newsstand_video').setDepth(0).setVisible(false).setOrigin(0.5);
    this.bgVideo.once('textureready', () => this.resizeVideoCover(this.bgVideo));
    this.bgVideo.once('playing', () => this.resizeVideoCover(this.bgVideo));
    this.sceneDim = this.add.rectangle(0, 0, width, height, 0x000000, 0.42).setOrigin(0, 0).setDepth(1).setInteractive();

    this.time.delayedCall(10000, () => {
      if (this.scene.isActive('NewsstandScene')) this.switchToVideoBackground();
    });

    this.createPaperHotspots();
    this.createComixHotspots();
    this.createSceneCloseButton();
    this.createComixOverlay();
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
    if (!this.bgVideo || !this.bgImage) return;
    this.bgImage.setVisible(false);
    this.bgVideo.setVisible(true).setLoop(false).setMute(true);
    this.resizeVideoCover(this.bgVideo);
    this.bgVideo.play();
    this.bgVideo.once(Phaser.GameObjects.Events.COMPLETE, () => {
      if (this.scene.isActive('NewsstandScene')) this.switchToImageBackground();
    });
  }

  switchToImageBackground() {
    this.bgVideo?.stop();
    this.bgVideo?.setVisible(false);
    this.bgImage?.setVisible(true);
  }

  resizeVideoCover(video) {
    if (!video?.scene) return;
    const videoWidth = video.video?.videoWidth || video.width || 1;
    const videoHeight = video.video?.videoHeight || video.height || 1;
    const scale = Math.max(this.scale.width / videoWidth, this.scale.height / videoHeight);
    video.setPosition(this.scale.width / 2, this.scale.height / 2).setScale(scale);
  }

  createPriceLabel(spot) {
    return this.add.text(spot.x + spot.width / 2, spot.y + spot.height + 10, spot.priceLabel, {
      fontFamily: 'Press Start 2P',
      fontSize: '12px',
      color: '#f6dc8c',
      backgroundColor: '#1a1111',
      padding: { x: 8, y: 6 },
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5, 0).setDepth(spot.labelDepth);
  }

  createPaperHotspots() {
    const hotspots = [{
      id: 'daily', x: 510, y: 710, width: 460, height: 230,
      type: 'daily', jsonKey: 'newspapers_daily', backgroundKey: 'paper_daily_bg',
      price: NEWSPAPER_PRICE, priceLabel: 'DAILY PAPER — $5', labelDepth: 11
    }];

    hotspots.forEach((spot) => {
      this.add.zone(spot.x, spot.y, spot.width, spot.height).setOrigin(0, 0).setDepth(10)
        .setInteractive({ useHandCursor: true }).on('pointerup', () => this.buyAndOpenNewspaper(spot));
      this.createPriceLabel(spot);
    });
  }

  buyAndOpenNewspaper(spot) {
    if (this.isAnimatingOverlay) return;
    const cityId = this.getActiveCityId();
    const purchase = moneyManager.spend(spot.price, {
      source: MONEY_SOURCE.CASH,
      category: ECONOMY_CATEGORY.NEWSPAPER,
      description: `Bought ${spot.type} newspaper in ${cityId}`,
      metadata: { cityId, newspaperId: spot.id, newspaperType: spot.type }
    });
    if (!purchase.ok) return this.showNotEnoughMoneyMessage('NEWSPAPER', purchase.required, purchase.available);
    this.cityId = cityId;
    if (this.scene.isActive('NewspaperOverlayScene')) this.scene.stop('NewspaperOverlayScene');
    this.scene.launch('NewspaperOverlayScene', {
      cityId,
      type: spot.type,
      jsonKey: spot.jsonKey,
      backgroundKey: spot.backgroundKey,
      purchaseId: purchase.transaction.id
    });
  }

  createComixHotspots() {
    const hotspots = [{
      id: 'comix_1', x: 1500, y: 710, width: 250, height: 230,
      textureKey: 'comix1', price: COMIX_PRICE, priceLabel: 'COMIX — $1', labelDepth: 13
    }];

    hotspots.forEach((spot) => {
      this.add.zone(spot.x, spot.y, spot.width, spot.height).setOrigin(0, 0).setDepth(12)
        .setInteractive({ useHandCursor: true }).on('pointerup', () => this.buyAndOpenComix(spot));
      this.createPriceLabel(spot);
    });
  }

  buyAndOpenComix(spot) {
    if (this.isAnimatingOverlay) return;
    const cityId = this.getActiveCityId();
    const purchase = moneyManager.spend(spot.price, {
      source: MONEY_SOURCE.CASH,
      category: ECONOMY_CATEGORY.ITEM,
      description: `Bought ${spot.id} in ${cityId}`,
      metadata: { cityId, comixId: spot.id, textureKey: spot.textureKey }
    });
    if (!purchase.ok) return this.showNotEnoughMoneyMessage('COMIX', purchase.required, purchase.available);
    this.openComixOverlay(spot.textureKey);
  }

  showNotEnoughMoneyMessage(itemName, required, available) {
    const message = this.add.text(this.scale.width / 2, this.scale.height / 2,
      `NO CASH!\n\n${itemName}: $${required}\nYou have: $${available}\n\nThe vendor says:\n"Come back when your pockets make noise."`,
      { fontFamily: 'Special Elite', fontSize: '28px', color: '#f7e6b5', backgroundColor: '#1d1511', align: 'center', padding: { x: 28, y: 24 }, stroke: '#000000', strokeThickness: 5 })
      .setOrigin(0.5).setDepth(500).setAlpha(0).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: message, alpha: 1, duration: 120, ease: 'Quad.Out' });
    message.once('pointerup', () => this.tweens.add({ targets: message, alpha: 0, duration: 120, ease: 'Quad.In', onComplete: () => message.destroy() }));
  }

  createComixOverlay() {
    const { width, height } = this.scale;
    this.overlayRoot = this.add.container(0, 0).setDepth(200).setVisible(false).setAlpha(0);
    this.overlayBlocker = this.add.rectangle(0, 0, width, height, 0x000000, 0.72).setOrigin(0, 0).setInteractive();
    this.overlayBlocker.on('pointerup', () => this.closeComixOverlay());
    this.comixContainer = this.add.container(width / 2, height / 2).setAlpha(0).setScale(0.9);
    this.comixImage = this.add.image(0, 0, 'comix1').setOrigin(0.5);
    this.comixCloseBtn = this.add.text(0, 0, 'X', {
      fontFamily: 'Press Start 2P', fontSize: '12px', color: '#ffffff', backgroundColor: '#111111', padding: { x: 8, y: 6 }
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.comixCloseBtn.on('pointerup', () => this.closeComixOverlay());
    this.comixContainer.add([this.comixImage, this.comixCloseBtn]);
    this.overlayRoot.add([this.overlayBlocker, this.comixContainer]);
    this.layoutComixOverlay();
  }

  layoutComixOverlay() {
    if (!this.comixImage || !this.comixCloseBtn) return;
    const textureWidth = this.comixImage.width || 1;
    const textureHeight = this.comixImage.height || 1;
    const imageScale = Math.min((this.scale.width * 0.84) / textureWidth, (this.scale.height * 0.82) / textureHeight, 1);
    const displayWidth = textureWidth * imageScale;
    const displayHeight = textureHeight * imageScale;
    this.comixImage.setDisplaySize(displayWidth, displayHeight);
    this.comixCloseBtn.setPosition(displayWidth / 2 - 12, -displayHeight / 2 + 12);
    this.comixContainer?.setPosition(this.scale.width / 2, this.scale.height / 2);
  }

  openComixOverlay(textureKey) {
    if (!this.overlayRoot || !this.comixImage || this.isAnimatingOverlay) return;
    this.currentMode = 'comix';
    this.isAnimatingOverlay = true;
    this.comixImage.setTexture(textureKey);
    this.layoutComixOverlay();
    EventBus.emit('hideHUD');
    this.overlayRoot.setVisible(true).setAlpha(0);
    this.comixContainer.setAlpha(0).setScale(0.9).setAngle(0).setPosition(this.scale.width / 2, this.scale.height / 2 + 12);
    this.tweens.add({ targets: this.overlayRoot, alpha: 1, duration: 140, ease: 'Quad.Out' });
    this.tweens.add({ targets: this.comixContainer, alpha: 1, scaleX: 1, scaleY: 1, y: this.scale.height / 2, duration: 200, ease: 'Back.Out', onComplete: () => { this.isAnimatingOverlay = false; } });
  }

  closeComixOverlay(onClosed) {
    if (!this.overlayRoot?.visible || this.isAnimatingOverlay) return;
    this.isAnimatingOverlay = true;
    this.tweens.add({ targets: this.overlayRoot, alpha: 0, duration: 140, ease: 'Quad.Out' });
    this.tweens.add({ targets: this.comixContainer, alpha: 0, scaleX: 0.86, scaleY: 0.86, y: this.scale.height / 2 + 18, angle: 1.5, duration: 180, ease: 'Quad.In', onComplete: () => {
      this.overlayRoot.setVisible(false);
      this.comixContainer.setAlpha(0).setAngle(0).setPosition(this.scale.width / 2, this.scale.height / 2);
      this.currentMode = 'none';
      this.isAnimatingOverlay = false;
      EventBus.emit('showHUD');
      onClosed?.();
    } });
  }

  createSceneCloseButton() {
    const button = this.add.text(28, 20, 'X', {
      fontFamily: 'Press Start 2P', fontSize: '16px', color: '#ffffff', backgroundColor: '#111111', padding: { x: 10, y: 8 }
    }).setOrigin(0, 0).setDepth(30).setInteractive({ useHandCursor: true });
    button.on('pointerup', () => this.overlayRoot?.visible ? this.closeComixOverlay(() => this.closeScene()) : this.closeScene());
  }

  handleEscape() {
    if (this.overlayRoot?.visible) this.closeComixOverlay();
    else this.closeScene();
  }

  handleResize() {
    const { width, height } = this.scale;
    this.bgImage?.setPosition(width / 2, height / 2);
    this.resizeVideoCover(this.bgVideo);
    this.sceneDim?.setSize(width, height);
    this.overlayBlocker?.setSize(width, height);
    this.layoutComixOverlay();
  }

  closeScene() {
    if (!this.isAnimatingOverlay) this.scene.stop();
  }

  handleShutdown() {
    this.bgVideo?.stop();
    this.scale.off('resize', this.handleResize);
    this.input.keyboard?.off('keydown-ESC', this.handleEscape);
    if (this.scene.isActive('NewspaperOverlayScene')) this.scene.stop('NewspaperOverlayScene');
    const hud = this.scene.get('NewsHud');
    hud?.events.emit('setNewspaperVisible', true);
    hud?.events.emit('setTvVisible', true);
    EventBus.emit('showHUD');
    this.isAnimatingOverlay = false;
    this.currentMode = 'none';
  }
}