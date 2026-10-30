import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';

import {
  moneyManager,
  MONEY_SOURCE,
  ECONOMY_CATEGORY
} from '../managers/MoneyManager.js';

import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';

import {
  NEWSSTAND_CONFIG,
  normalizeNewsstandCityId,
  isEditableTarget
} from '../config/newsstandConfig.js';

import {
  NewsstandBackground
} from '../systems/newsstand/NewsstandBackground.js';

import {
  NewsstandHotspots
} from '../systems/newsstand/NewsstandHotspots.js';

import {
  NewsstandComix
} from '../systems/newsstand/NewsstandComix.js';

export class NewsstandScene extends BaseScene {
  constructor() {
    super({ key: 'NewsstandScene' });

    this.handleResize = this.handleResize.bind(this);
    this.handleEscape = this.handleEscape.bind(this);
    this.handleShutdown = this.handleShutdown.bind(this);
  }

  init(data = {}) {
    this.cityId = normalizeNewsstandCityId(
      data.cityId ||
      gameState.currentCityId ||
      this.registry.get('currentCityId') ||
      this.registry.get('currentCity') ||
      'paris'
    );

    this.isOpeningNewspaper = false;
    this.isShuttingDown = false;
    this.sceneRunToken = {};

    this.background = null;
    this.hotspots = null;
    this.comix = null;
    this.closeButton = null;
  }

  preload() {}

  create() {
    super.create();

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

    this.background = new NewsstandBackground(
      this,
      () => this.hotspots?.resize()
    );

    this.background.create();

    this.comix = new NewsstandComix(this);
    this.comix.create();

    this.hotspots = new NewsstandHotspots(
      this,
      this.background
    );

    this.hotspots.create();

    this.createCloseButton();
  }

  getActiveCityId() {
    return normalizeNewsstandCityId(
      gameState.currentCityId ||
      this.cityId ||
      this.registry.get('currentCityId') ||
      this.registry.get('currentCity') ||
      'paris'
    );
  }

  isPurchaseBlocked() {
    return (
      this.isShuttingDown ||
      this.hotspots?.debugMode ||
      this.isOpeningNewspaper ||
      this.comix?.isOpen ||
      this.comix?.isAnimating ||
      this.scene.isActive('NewspaperOverlayScene')
    );
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

    return (
      `${safeCityId}:` +
      `${this.getCurrentGameDay()}:` +
      safeNewspaperId
    );
  }

  ensureNewspaperAccessState() {
    const key = NEWSSTAND_CONFIG.newspaperAccessKey;

    if (
      !gameState[key] ||
      typeof gameState[key] !== 'object' ||
      Array.isArray(gameState[key])
    ) {
      gameState[key] = {};
    }

    return gameState[key];
  }

  hasNewspaperAccessForToday(cityId, newspaperId) {
    const purchases = this.ensureNewspaperAccessState();

    const key = this.getNewspaperPurchaseKey(
      cityId,
      newspaperId
    );

    return purchases[key] === true;
  }

  markNewspaperAccessForToday(cityId, newspaperId) {
    const purchases = this.ensureNewspaperAccessState();

    const key = this.getNewspaperPurchaseKey(
      cityId,
      newspaperId
    );

    purchases[key] = true;
    requestAutosave();

    return key;
  }

  checkNewspaperAssets(config, cityId) {
    const jsonKey = `newspaper_${config.type}_${cityId}`;
    const json = this.cache.json.get(jsonKey);

    const backgroundExists =
      this.textures.exists(config.backgroundKey);

    let dataValid = Boolean(
      json &&
      typeof json === 'object' &&
      !Array.isArray(json)
    );

    if (dataValid) {
      dataValid = config.type === 'time'
        ? (
            Array.isArray(json.coverLines) &&
            json.coverLines.length > 0 &&
            json.coverLines.every(
              line => typeof line === 'string'
            )
          )
        : Array.isArray(json.articles);
    }

    if (!dataValid || !backgroundExists) {
      console.error(
        '[NewsstandScene] Newspaper unavailable:',
        {
          cityId,
          type: config.type,
          jsonKey,
          jsonExists: Boolean(json),
          dataValid,
          backgroundKey: config.backgroundKey,
          backgroundExists
        }
      );

      this.showPurchaseErrorMessage([
        'ISSUE UNAVAILABLE!',
        '',
        `${config.label} — ${cityId}`,
        'The vendor cannot find a readable copy.',
        'You have not been charged.',
        '',
        'Click to close.'
      ].join('\n'));

      return null;
    }

    return jsonKey;
  }

  async buyAndOpenNewspaper(config) {
    if (this.isPurchaseBlocked()) return;

    this.isOpeningNewspaper = true;

    const runToken = this.sceneRunToken;

    try {
      const cityId = this.getActiveCityId();

      const jsonKey = this.checkNewspaperAssets(
        config,
        cityId
      );

      if (!jsonKey) return;

      const alreadyPaidToday =
        this.hasNewspaperAccessForToday(
          cityId,
          config.id
        );

      let purchaseId = null;

      if (!alreadyPaidToday) {
        const purchase = moneyManager.spend(
          config.price,
          {
            source: MONEY_SOURCE.CASH,
            category: ECONOMY_CATEGORY.NEWSPAPER,

            description:
              `Bought ${config.type} newspaper ` +
              `in ${cityId} on investigation day ` +
              this.getCurrentGameDay(),

            metadata: {
              cityId,
              newspaperId: config.id,
              newspaperType: config.type,
              gameDay: this.getCurrentGameDay()
            }
          }
        );

        if (!purchase.ok) {
          this.showNotEnoughMoneyMessage(
            config.label,
            purchase.required,
            purchase.available
          );

          return;
        }

        purchaseId = purchase.transaction?.id || null;

        this.markNewspaperAccessForToday(
          cityId,
          config.id
        );
      }

      this.cityId = cityId;

      this.stopSceneIfActive('NewspaperOverlayScene');

      const opened = await this.launchOverlay(
        'NewspaperOverlayScene',
        {
          cityId,
          type: config.type,
          jsonKey,
          backgroundKey: config.backgroundKey,
          purchaseId,
          alreadyPaidToday,
          sourceScene: 'NewsstandScene'
        }
      );

      if (
        !opened &&
        this.sceneRunToken === runToken &&
        this.sys.isActive()
      ) {
        this.showPurchaseErrorMessage();
      }
    } catch (error) {
      console.error(
        '[NewsstandScene] Newspaper purchase/open failed:',
        error
      );

      if (
        this.sceneRunToken === runToken &&
        this.sys.isActive()
      ) {
        this.showPurchaseErrorMessage();
      }
    } finally {
      if (this.sceneRunToken === runToken) {
        this.isOpeningNewspaper = false;
      }
    }
  }

  buyAndOpenComix(config) {
    if (this.isPurchaseBlocked()) return;

    if (!this.textures.exists(config.textureKey)) {
      console.error(
        '[NewsstandScene] Missing comix texture:',
        config.textureKey
      );

      this.showPurchaseErrorMessage(
        'COMIX UNAVAILABLE!\n\n' +
        'The vendor misplaced this issue.\n' +
        'You have not been charged.'
      );

      return;
    }

    const cityId = this.getActiveCityId();

    const purchase = moneyManager.spend(
      config.price,
      {
        source: MONEY_SOURCE.CASH,
        category: ECONOMY_CATEGORY.ITEM,

        description: `Bought ${config.id} in ${cityId}`,

        metadata: {
          cityId,
          comixId: config.id,
          textureKey: config.textureKey
        }
      }
    );

    if (!purchase.ok) {
      this.showNotEnoughMoneyMessage(
        config.label,
        purchase.required,
        purchase.available
      );

      return;
    }

    this.comix.open(config.textureKey);
  }

  createMessage(text, options = {}) {
    const message = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2,
        text,
        {
          fontFamily: 'SpecialElite',
          fontSize: `${options.fontSize || 26}px`,
          color: options.color || '#ffd966',
          backgroundColor: options.backgroundColor || '#2b1711',
          align: 'center',
          padding: { x: 26, y: 22 },
          stroke: '#000000',
          strokeThickness: 5,
          wordWrap: {
            width: Math.max(100, this.scale.width - 100)
          }
        }
      )
      .setOrigin(0.5)
      .setDepth(501)
      .setInteractive({ useHandCursor: true });

    if (options.animate) {
      message.setAlpha(0);

      this.addTrackedTween(
        this.tweens.add({
          targets: message,
          alpha: 1,
          duration: 120,
          ease: 'Quad.Out'
        })
      );
    }

    message.once('pointerup', () => {
      if (!options.animate) {
        message.destroy();
        return;
      }

      this.tweens.killTweensOf(message);

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

    return message;
  }

  showNotEnoughMoneyMessage(itemName, required, available) {
    this.createMessage(
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
        fontSize: 28,
        color: '#f7e6b5',
        backgroundColor: '#1d1511',
        animate: true
      }
    );
  }

  showPurchaseErrorMessage(text = null) {
    this.createMessage(
      text || [
        'THE PRESS STOPPED!',
        '',
        'The newspaper could not be opened.',
        'If already paid, today’s access remains available.',
        '',
        'Close this message and try again.'
      ].join('\n')
    );
  }

  createCloseButton() {
    this.closeButton = this.add
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

    this.closeButton.on('pointerup', () => {
      if (this.comix?.isOpen) {
        this.comix.close(() => this.closeScene());
        return;
      }

      this.closeScene();
    });
  }

  handleEscape(event) {
    if (isEditableTarget(event)) return;

    if (this.scene.isActive('NewspaperOverlayScene')) {
      return;
    }

    if (this.hotspots?.debugMode) {
      this.hotspots.setDebugMode(false);
      return;
    }

    if (this.comix?.isOpen) {
      this.comix.close();
      return;
    }

    this.closeScene();
  }

  handleResize() {
    this.background?.resize();
    this.hotspots?.resize();
    this.comix?.resize();
  }

  closeScene() {
    if (
      this.isOpeningNewspaper ||
      this.comix?.isAnimating ||
      this.isShuttingDown
    ) {
      return;
    }

    this.hotspots?.setDebugMode(false);
    this.scene.stop();
  }

  handleShutdown() {
    if (this.isShuttingDown) return;

    this.isShuttingDown = true;
    this.sceneRunToken = null;

    this.scale.off('resize', this.handleResize);

    this.stopSceneIfActive('NewspaperOverlayScene');

    this.hotspots?.destroy();
    this.comix?.destroy();
    this.background?.destroy();

    this.hotspots = null;
    this.comix = null;
    this.background = null;
    this.closeButton = null;

    this.isOpeningNewspaper = false;

    EventBus.emit('showHUD');
  }
}