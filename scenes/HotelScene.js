import { getEnergyManager } from '../managers/EnergyManager.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { OfficeSaveUI } from '../ui/OfficeSaveUI.js';
import { gameState } from '../GameData.js';
import { audioManager } from '../managers/AudioManager.js';
import {
  flushAutosave,
  requestAutosave
} from '../gameStatePersistence.js';

import {
  moneyManager,
  MONEY_SOURCE,
  HOTEL_OPTIONS
} from '../managers/MoneyManager.js';

import { HOTEL_CONFIG } from '../config/hotelConfig.js';
import { HotelHud } from './hotel/HotelHud.js';
import { HotelHotspots } from './hotel/HotelHotspots.js';
import { HotelSleep } from './hotel/HotelSleep.js';

const CITY_ALIASES = {
  new_york: 'new_york_city',
  newyorkcity: 'new_york_city',
  new_dehli: 'new_delhi',
  newdelhi: 'new_delhi',
  kotte: 'kotto',
  sri_jayawardenepura_kotte: 'kotto'
};

function normalizeCityId(value) {
  const id = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  return CITY_ALIASES[id] || id;
}

export class HotelScene extends BaseScene {
  constructor() {
    super({ key: 'HotelScene' });

    this.returnScene = 'CrimeCityScene';
    this.returnData = {};
    this.DEBUG_HOTSPOTS = false;

    this.boundCleanupScene = this.cleanupScene.bind(this);
    this.boundWakeOrResume = this.onWakeOrResume.bind(this);
    this.boundSleep = this.onSleep.bind(this);
    this.boundHollySleepFinished =
      this.onHollySleepFinished.bind(this);

    this.hud = null;
    this.hotspotUI = null;
    this.sleepCtl = null;

    this.resetHotelState();
  }

  resetHotelState() {
    this.timeManager = null;
    this.isLeaving = false;
    this.isSleeping = false;
    this.isSleepMenuOpen = false;
    this.uiLocked = false;
    this.isOpeningTv = false;
    this.isTransitioning = false;

    this.saveUI = null;
    this.hotelId = null;
    this.hotelConfig = null;
    this.hotelChoice = null;
    this.hotelChoiceMessage = null;
    this.isChoosingHotel = false;
    this.isBookingHotel = false;
    this.roomBackground = null;
    this.roomTitle = null;
    this.roomSubtitle = null;
  }

  init(data = {}) {
    this.hud?.cancelWaits();
    this.resetHotelState();

    this.DEBUG_HOTSPOTS = false;
    this.returnScene = data.returnScene || 'CrimeCityScene';

    this.returnData =
      data.returnData && typeof data.returnData === 'object'
        ? { ...data.returnData }
        : {};

    this.cityId = normalizeCityId(
      data.cityId ||
      this.returnData.cityId ||
      gameState.currentCityId ||
      gameState.crimeCityId ||
      gameState.currentMission?.city
    );

    if (this.cityId) {
      this.returnData.cityId = this.cityId;
    }
  }

  create() {
    super.create();

    this.hud = new HotelHud(this);
    this.sleepCtl = new HotelSleep(this);

    this.hotspotUI = new HotelHotspots(this, {
      sleep: () => this.sleepCtl.openMenu(),
      tv: () => { void this.openHotelTv(); },
      crimeBoard: () => { void this.openCrimeBoard(); },
      leave: () => { void this.leaveHotel(); }
    });

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundCleanupScene
    );

    this.events.on(
      Phaser.Scenes.Events.WAKE,
      this.boundWakeOrResume
    );

    this.events.on(
      Phaser.Scenes.Events.RESUME,
      this.boundWakeOrResume
    );

    this.events.on(
      Phaser.Scenes.Events.SLEEP,
      this.boundSleep
    );

    EventBus.on(
      'hollySleepFinished',
      this.boundHollySleepFinished,
      this
    );

    audioManager.init(this);

    const { width, height } = this.scale;

    this.createBackground(width, height);
    this.createHotelHeader(width);
    this.createLeaveHint(width, height);
    this.createSaveControls();

    if (this.input.keyboard) {
      this.trackInputEvent(
        this.input.keyboard,
        'keydown-ESC',
        this.handleEscape
      );
    }

    const booking = this.getCurrentBooking();

    if (booking && HOTEL_CONFIG[booking.hotelId]) {
      this.activateHotel(booking.hotelId);
    } else {
      this.openHotelChoice();
    }

    this.events.once(
      Phaser.Scenes.Events.POST_UPDATE,
      this.onHotelFirstUpdate,
      this
    );
  }

  getHotelDay() {
    const value = Number(
      gameState.currentDay ?? gameState.day ?? 1
    );

    return Number.isFinite(value)
      ? Math.max(1, Math.floor(value))
      : 1;
  }

  getCurrentBooking() {
    const booking = gameState.hotelBookings?.[this.cityId];

    return booking?.day === this.getHotelDay()
      ? booking
      : null;
  }

  onHotelFirstUpdate() {
    if (this._cleanupDone || !this.sys.isActive()) return;

    this.startHotelIdleMonologue();
    void this.hud.setup();
  }

  startHotelIdleMonologue() {
    if (
      this._cleanupDone ||
      !this.sys.isActive() ||
      this.isChoosingHotel
    ) {
      return;
    }

    this.monologue?.startIdle?.('idle.hotel');
  }

  createBackground(width, height) {
    this.roomBackground = this.add
      .image(0, 0, 'hotel')
      .setOrigin(0)
      .setDisplaySize(width, height)
      .setDepth(0);

    this.add
      .rectangle(0, 0, width, height, 0x000000, 0.18)
      .setOrigin(0)
      .setDepth(1);
  }

  createHotelHeader(width) {
    this.roomTitle = this.add
      .text(width / 2, 46, 'HOTEL ROOM', {
        fontFamily: 'PressStart2P',
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.roomSubtitle = this.add
      .text(
        width / 2,
        84,
        'Sleep is cheaper than therapy. Usually.',
        {
          fontFamily: 'SpecialElite',
          fontSize: '20px',
          color: '#f1e6b8',
          align: 'center',
          stroke: '#000000',
          strokeThickness: 4
        }
      )
      .setOrigin(0.5)
      .setDepth(5);
  }

  createLeaveHint(width, height) {
    this.add
      .text(
        width / 2,
        height - 76,
        '[ ESC TO LEAVE ]',
        {
          fontFamily: 'PressStart2P',
          fontSize: '12px',
          color: '#dddddd',
          align: 'center',
          backgroundColor: '#111111aa',
          padding: { x: 14, y: 10 }
        }
      )
      .setOrigin(0.5)
      .setDepth(10);
  }

  openHotelChoice() {
    this.isChoosingHotel = true;
    this.applyLock(true);

    const { width, height } = this.scale;
    const root = this.add.container(0, 0).setDepth(400);
    this.hotelChoice = root;

    const blocker = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.8)
      .setOrigin(0)
      .setInteractive();

    const panelW = 1000;
    const panelH = 530;
    const scale = Math.max(
      0.01,
      Math.min(1, (width - 32) / panelW, (height - 32) / panelH)
    );

    const content = this.add.container(
      (width - panelW * scale) / 2,
      (height - panelH * scale) / 2
    ).setScale(scale);

    root.add([blocker, content]);

    content.add(
      this.add
        .rectangle(0, 0, panelW, panelH, 0x17110e, 1)
        .setOrigin(0)
        .setStrokeStyle(3, 0xd4af37)
    );

    content.add(
      this.add.text(
        panelW / 2,
        34,
        'CHOOSE YOUR HOTEL',
        {
          fontFamily: 'PressStart2P',
          fontSize: '20px',
          color: '#f6dc8c'
        }
      ).setOrigin(0.5)
    );

    content.add(
      this.add.text(
        panelW / 2,
        78,
        'One charge per city per day. Mark Agency picks up the bill.',
        {
          fontFamily: 'SpecialElite',
          fontSize: '21px',
          color: '#f1e6b8'
        }
      ).setOrigin(0.5)
    );

    const balance = moneyManager.getBalance(MONEY_SOURCE.AGENCY);

    content.add(
      this.add.text(
        panelW / 2,
        114,
        `AGENCY BUDGET: $${balance}`,
        {
          fontFamily: 'PressStart2P',
          fontSize: '14px',
          color: '#ffe066'
        }
      ).setOrigin(0.5)
    );

    Object.values(HOTEL_CONFIG).forEach((config, index) => {
      const option = HOTEL_OPTIONS[config.optionId];
      const affordable = balance >= option.cost;
      const x = 25 + index * 325;

      const card = this.add
        .rectangle(x, 155, 300, 260, 0x29211d, 1)
        .setOrigin(0)
        .setStrokeStyle(2, affordable ? 0xd4af37 : 0x665e50);

      if (affordable && this.cityId) {
        card.setInteractive({ useHandCursor: true });

        card.on('pointerover', () => {
          card.setFillStyle(0x59422f);
        });

        card.on('pointerout', () => {
          card.setFillStyle(0x29211d);
        });

        card.on('pointerdown', () => {
          this.bookHotel(config.id);
        });
      }

      content.add(card);

      const addText = (y, text, size, color) => {
        content.add(
          this.add.text(x + 150, y, text, {
            fontFamily: 'SpecialElite',
            fontSize: `${size}px`,
            color,
            align: 'center',
            wordWrap: { width: 270 }
          }).setOrigin(0.5, 0)
        );
      };

      addText(175, config.tierLabel, 22, '#ffe066');
      addText(210, option.label, 24, '#ffffff');
      addText(250, `$${option.cost} / day`, 24, '#f6dc8c');

      addText(
        290,
        `${Math.round(config.recoveryMultiplier * 100)}% sleep recovery`,
        20,
        '#f1e6b8'
      );

      addText(324, config.description, 18, '#cdbf9b');

      addText(
        380,
        affordable ? 'CHECK IN' : 'INSUFFICIENT AGENCY FUNDS',
        17,
        affordable ? '#b5ed9d' : '#e89585'
      );
    });

    this.hotelChoiceMessage = this.add.text(
      panelW / 2,
      433,
      this.cityId ? '' : 'Missing city ID. Hotel booking is unavailable.',
      {
        fontFamily: 'SpecialElite',
        fontSize: '19px',
        color: '#ffb6a6',
        align: 'center',
        wordWrap: { width: panelW - 50 }
      }
    ).setOrigin(0.5, 0);

    const cancel = this.add.text(
      panelW / 2,
      490,
      '[ RETURN TO CITY ]',
      {
        fontFamily: 'PressStart2P',
        fontSize: '13px',
        color: '#f6dc8c'
      }
    ).setOrigin(0.5).setInteractive({ useHandCursor: true });

    cancel.on('pointerdown', () => {
      void this.leaveHotel();
    });

    content.add([this.hotelChoiceMessage, cancel]);
  }

  bookHotel(hotelId) {
    if (
      this.isBookingHotel ||
      this.isLeaving ||
      this._cleanupDone ||
      !this.cityId
    ) {
      return;
    }

    const config = HOTEL_CONFIG[hotelId];
    if (!config) return;

    this.isBookingHotel = true;

    try {
      // Nie pobieramy drugi raz opłaty za aktywną rezerwację.
      const existing = this.getCurrentBooking();

      if (existing && HOTEL_CONFIG[existing.hotelId]) {
        this.activateHotel(existing.hotelId);
        return;
      }

      const option = {
        ...HOTEL_OPTIONS[config.optionId],
        source: MONEY_SOURCE.AGENCY
      };

      const purchase = moneyManager.buyHotel(option, {
        cityId: this.cityId,
        description: `Hotel check-in: ${option.label}`
      });

      if (!purchase.ok) {
        this.hotelChoiceMessage?.setText(
          'Not enough agency funds. The minibar remains a distant dream.'
        );
        return;
      }

      gameState.hotelBookings ??= {};

      gameState.hotelBookings[this.cityId] = {
        day: this.getHotelDay(),
        hotelId,
        optionId: option.id,
        cost: option.cost,
        source: MONEY_SOURCE.AGENCY,
        transactionId: purchase.transaction?.id || null
      };

      requestAutosave();

      this.activateHotel(hotelId);
    } catch (error) {
      console.error('[HotelScene] Hotel check-in failed:', error);

      this.hotelChoiceMessage?.setText(
        'Check-in failed. Please check the console before trying again.'
      );
    } finally {
      this.isBookingHotel = false;
    }
  }

  activateHotel(hotelId) {
    const config = HOTEL_CONFIG[hotelId];
    if (!config) return;

    this.hotelId = hotelId;
    this.hotelConfig = config;

    this.hotelChoice?.destroy(true);
    this.hotelChoice = null;
    this.hotelChoiceMessage = null;
    this.isChoosingHotel = false;

    const background = this.textures.exists(config.backgroundKey)
      ? config.backgroundKey
      : 'hotel';

    this.roomBackground.setTexture(background);
    this.roomBackground.setDisplaySize(
      this.scale.width,
      this.scale.height
    );

    this.roomTitle.setText(config.label);
    this.roomSubtitle.setText(config.description);

    this.hotspotUI.create(
      this.scale.width,
      this.scale.height,
      config
    );

    this.applyLock(false);
    this.startHotelIdleMonologue();
  }

  hideHoverHint() {
    this.hotspotUI?.hideHint();
  }

  isHotelInteractionBlocked() {
    return (
      this.isLeaving ||
      this.isSleeping ||
      this.isSleepMenuOpen ||
      this.isChoosingHotel ||
      this.uiLocked ||
      this._cleanupDone
    );
  }

  applyLock(locked) {
    this.uiLocked = locked;
    this.hotspotUI?.setLocked(locked);
  }

  async openHotelTv() {
    if (this.isHotelInteractionBlocked() || this.isOpeningTv) return;

    this.isOpeningTv = true;

    try {
      const sceneKey = 'TvBroadcastScene';

      if (this.isSceneActive(sceneKey)) {
        this.stopSceneIfActive(sceneKey);

        const newsHud = this.getRegisteredScene('NewsHud');
        newsHud?.events?.emit('setNewspaperVisible', true);
        newsHud?.events?.emit('setTvVisible', true);
        return;
      }

      const mission = gameState.currentMission || {};

      const status = await this.toggleOverlay(sceneKey, {
        returnSceneKey: 'HotelScene',
        mission,
        gameState,
        reporterName: 'Colette Duvall',
        stationName:
          `${gameState.currentCity || mission.city || 'Local'} Night Report`
      });

      if (this._cleanupDone || status !== 'opened') return;

      const newsHud = this.getRegisteredScene('NewsHud');
      newsHud?.events?.emit('setNewspaperVisible', false);
      newsHud?.events?.emit('setTvVisible', false);

      this.bringSceneToTopIfActive('NewsHud');
    } catch (error) {
      if (!this._cleanupDone) {
        console.error('[HotelScene] Could not open hotel TV:', error);
      }
    } finally {
      this.isOpeningTv = false;
    }
  }

  async openCrimeBoard() {
    if (this.isHotelInteractionBlocked()) return false;

    let hud = this.getPlayerHudScene();

    if (!hud?.isHudReady || !hud?.crimeBoardUI) {
      try {
        hud = await this.hud.ensurePlayerHud();
      } catch (error) {
        console.error('[HotelScene] Could not restore HUD:', error);
        return false;
      }
    }

    if (this._cleanupDone || !this.sys.isActive()) return false;

    if (!hud?.crimeBoardUI) {
      console.warn('[HotelScene] Crime Board is unavailable.');
      return false;
    }

    this.hud.setContext(hud);
    hud.closeAllUIPanels();

    return hud.openCrimeBoard() || false;
  }

  createSaveControls() {
    try {
      this.saveUI = new OfficeSaveUI(this, {
        locationType: 'hotel',
        locationCode: 'hotel_room',
        cityCode: this.cityId || null
      });

      this.saveUI.createButton();
    } catch (error) {
      console.error('[HotelScene] Save controls failed:', error);
      this.saveUI = null;
    }
  }

  restoreAfterFailedExit() {
    if (this._cleanupDone || !this.sys.isActive()) return;

    getEnergyManager().cancelManualSleep();

    this.isLeaving = false;
    this.isSleeping = false;
    this.isTransitioning = false;

    this.sleepCtl?.clearPending();

    this.applyLock(this.isChoosingHotel);
    this.cameras.main.fadeIn(220, 0, 0, 0);
  }

  onHollySleepFinished(payload = {}) {
    this.sleepCtl?.onHollyFinished(payload);
  }

  handleEscape() {
    if (this._cleanupDone) return;

    if (this.hotspotUI?.debugMode) {
      this.hotspotUI.setDebug(false);
      return;
    }

    if (this.isChoosingHotel) {
      void this.leaveHotel();
      return;
    }

    if (this.uiLocked) return;

    if (this.isSleepMenuOpen) {
      this.sleepCtl.closeMenu();
      return;
    }

    void this.leaveHotel();
  }

  async leaveHotel() {
    if (this.isLeaving || this.isSleeping || this._cleanupDone) {
      return false;
    }

    this.isLeaving = true;
    this.isTransitioning = true;

    this.applyLock(true);
    this.hideHoverHint();
    flushAutosave();

    try {
      const moved = await this.goto(
        this.returnScene,
        this.returnData
      );

      if (!moved) this.restoreAfterFailedExit();

      return moved;
    } catch (error) {
      if (!this._cleanupDone) {
        console.error('[HotelScene] Could not leave hotel:', error);
        this.restoreAfterFailedExit();
      }

      return false;
    }
  }

  onWakeOrResume() {
    if (this._cleanupDone) return;

    this.isOpeningTv = false;

    if (
      !this.isLeaving &&
      !this.isSleeping &&
      !this.isSleepMenuOpen
    ) {
      this.applyLock(this.isChoosingHotel);
    }

    this.events.off(
      Phaser.Scenes.Events.POST_UPDATE,
      this.onHotelFirstUpdate,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.POST_UPDATE,
      this.onHotelFirstUpdate,
      this
    );
  }

  onSleep() {
    flushAutosave();
    this.hideHoverHint();
    this.hud?.cancelWaits();
  }

  cleanupScene() {
    flushAutosave();

    EventBus.off(
      'hollySleepFinished',
      this.boundHollySleepFinished,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.POST_UPDATE,
      this.onHotelFirstUpdate,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.WAKE,
      this.boundWakeOrResume
    );

    this.events.off(
      Phaser.Scenes.Events.RESUME,
      this.boundWakeOrResume
    );

    this.events.off(
      Phaser.Scenes.Events.SLEEP,
      this.boundSleep
    );

    this.hud?.destroy();
    this.hud = null;

    this.sleepCtl?.destroy();
    this.sleepCtl = null;

    this.hotspotUI?.destroy();
    this.hotspotUI = null;

    this.saveUI?.destroy();
    this.saveUI = null;

    this.hotelChoice?.destroy(true);
    this.hotelChoice = null;

    this.timeManager = null;
    this.uiLocked = false;
    this.isSleepMenuOpen = false;
    this.isChoosingHotel = false;
    this.isOpeningTv = false;
    this.isTransitioning = false;
  }
}