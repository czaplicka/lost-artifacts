import { getEnergyManager } from '../EnergyManager.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { OfficeSaveUI } from '../OfficeSaveUI.js';
import { gameState } from '../GameData.js';
import { ensureHud } from '../hudHelpers.js';

export class HotelScene extends BaseScene {
  constructor() {
    super({ key: 'HotelScene' });

    this.timeManager = null;

    this.returnScene = 'CrimeCityScene';
    this.returnData = {};

    this.isLeaving = false;
    this.isSleeping = false;
    this.isSleepMenuOpen = false;
    this.uiLocked = false;

    this.saveUI = null;
    this.hotspots = [];

    this.sleepMenu = null;
    this.sleepMenuBlocker = null;

    this.hoverHint = null;

    this.DEBUG_HOTSPOTS = true;
    this.debugGraphics = null;
    this.debugTexts = [];
  }

  init(data = {}) {
    this.returnScene = data.returnScene || 'CrimeCityScene';
    this.returnData = data.returnData || {};

    this.isLeaving = false;
    this.isSleeping = false;
    this.isSleepMenuOpen = false;
    this.uiLocked = false;
  }

  create() {
    super.create();

    this.ensurePlayerHud();

    const { width, height } = this.scale;
    const hud = this.scene.get('PlayerHudScene');

    this.timeManager = hud?.timeManager || null;

    this.createBackground(width, height);
    this.createHotelHeader(width);
    this.createHoverHint(width);
    this.createHotspots(width, height);
    this.createLeaveHint(width, height);

    this.createSaveControls();
    this.showNewsHud();

    this.monologue.startIdle('idle.hotel');
    this.createOptionalDebug();

    this.input.keyboard.on(
      'keydown-ESC',
      this.handleEscape,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanupScene,
      this
    );
  }

  ensurePlayerHud() {
    ensureHud(this, { throwOnMissing: false });

    const hudKey = 'PlayerHudScene';

    if (this.scene.isActive(hudKey)) {
      this.scene.bringToTop(hudKey);
      return;
    }

    if (this.scene.isSleeping(hudKey)) {
      this.scene.wake(hudKey);
      this.scene.bringToTop(hudKey);
      return;
    }

    this.scene.launch(hudKey);
    this.scene.bringToTop(hudKey);
  }

  createBackground(width, height) {
    this.add
      .image(0, 0, 'hotel')
      .setOrigin(0, 0)
      .setDisplaySize(width, height)
      .setDepth(0);

    this.add
      .rectangle(0, 0, width, height, 0x000000, 0.18)
      .setOrigin(0, 0)
      .setDepth(1);
  }

  createHotelHeader(width) {
    this.add
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

    this.add
      .text(
        width / 2,
        84,
        'Sleep is cheaper than therapy. Usually.',
        {
          fontFamily: 'Special Elite',
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

  createHoverHint(width) {
    this.hoverHint = this.add
      .text(width / 2, 122, '', {
        fontFamily: 'Special Elite',
        fontSize: '19px',
        color: '#ffe066',
        backgroundColor: '#111111cc',
        padding: {
          left: 12,
          right: 12,
          top: 7,
          bottom: 7
        }
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setVisible(false);
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
          padding: {
            x: 14,
            y: 10
          }
        }
      )
      .setOrigin(0.5)
      .setDepth(10);
  }

  createHotspots(width, height) {
    const hotspotData = [
      {
        id: 'bed',
        x: width * 0.31,
        y: height * 0.47,
        width: width * 0.45,
        height: height * 0.39,
        hoverText: 'Bed — sleep and restore energy',
        monologueKey: 'inspect.hotelBed',
        fallbackMonologue:
          'A bed. A promising development in any investigation.',
        action: () => this.openSleepMenu()
      },
      {
        id: 'hotel-tv',
        x: width * 0.83,
        y: height * 0.31,
        width: width * 0.17,
        height: height * 0.28,
        hoverText: 'Television — local news',
        monologueKey: 'inspect.hotelTv',
        fallbackMonologue:
          'The television is on. Somewhere, a reporter is overreacting.',
        action: () => this.openHotelTv()
      },
      {
        id: 'hotel-desk',
        x: 0,
        y: height * 0.69,
        width: width * 0.28,
        height: height * 0.29,
        hoverText: 'Desk — review the crime board',
        monologueKey: 'inspect.hotelDesk',
        fallbackMonologue:
          'A desk. Finally, a horizontal surface for evidence and regret.',
        action: () => this.openCrimeBoard()
      },
      {
        id: 'hotel-window-exit',
        x: width * 0.08,
        y: height * 0.19,
        width: width * 0.20,
        height: height * 0.34,
        hoverText: 'Window — return to the city',
        monologueKey: 'inspect.hotelWindow',
        fallbackMonologue:
          'The city is out there, full of clues and people pretending not to be suspicious.',
        action: () => this.leaveHotel()
      }
    ];

    hotspotData.forEach((data) => {
      const zone = this.add
        .zone(data.x, data.y, data.width, data.height)
        .setOrigin(0, 0)
        .setDepth(4)
        .setInteractive({
          useHandCursor: true,
          cursor: 'pointer'
        });

      zone.hotspotData = data;

      zone.on('pointerover', () => {
        if (
          this.isLeaving ||
          this.isSleepMenuOpen ||
          this.uiLocked
        ) {
          return;
        }

        this.showHoverHint(data.hoverText);
        this.sayHotelMonologue(data);
      });

      zone.on('pointerout', () => {
        this.hideHoverHint();
      });

      zone.on('pointerdown', () => {
        if (
          this.isLeaving ||
          this.isSleepMenuOpen ||
          this.uiLocked
        ) {
          return;
        }

        this.hideHoverHint();

        try {
          data.action();
        } catch (error) {
          console.error(
            `[HotelScene] Hotel hotspot failed: ${data.id}`,
            error
          );
        }
      });

      this.hotspots.push(zone);
    });
  }

  createOptionalDebug() {
    if (!this.DEBUG_HOTSPOTS) {
      return;
    }

    this.debugGraphics = this.add.graphics();
    this.debugGraphics.lineStyle(2, 0x00ffcc, 0.95);

    this.hotspots.forEach((zone) => {
      const data = zone.hotspotData;

      if (!data) {
        return;
      }

      this.debugGraphics.strokeRect(
        data.x,
        data.y,
        data.width,
        data.height
      );

      const label = this.add
        .text(data.x + 8, data.y + 8, data.id, {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#00ffcc',
          backgroundColor: '#000000',
          padding: {
            left: 4,
            right: 4,
            top: 2,
            bottom: 2
          }
        })
        .setDepth(999);

      this.debugTexts.push(label);
    });
  }

  showHoverHint(text) {
    if (!this.hoverHint || !text) {
      return;
    }

    this.hoverHint.setText(text);
    this.hoverHint.setVisible(true);
  }

  hideHoverHint() {
    this.hoverHint?.setVisible(false);
  }

  sayHotelMonologue(data) {
    if (!data) {
      return;
    }

    if (this.monologue?.sayRandom && data.monologueKey) {
      this.monologue.sayRandom(data.monologueKey, {
        cooldownKey: `hotel-hover:${data.id}`,
        cooldownMs: 2500,
        queue: false
      });

      return;
    }

    if (this.monologue?.say && data.fallbackMonologue) {
      this.monologue.say(data.fallbackMonologue, {
        cooldownKey: `hotel-hover-fallback:${data.id}`,
        cooldownMs: 2500,
        queue: false
      });
    }
  }

  openSleepMenu() {
    if (
      this.isLeaving ||
      this.isSleeping ||
      this.isSleepMenuOpen ||
      this.uiLocked
    ) {
      return;
    }

    this.isSleepMenuOpen = true;
    this.hideHoverHint();

    const { width, height } = this.scale;
    const panelWidth = Math.min(760, width * 0.75);

    this.sleepMenu = this.add
      .container(0, 0)
      .setDepth(200);

    this.sleepMenuBlocker = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.70)
      .setOrigin(0, 0)
      .setInteractive();

    this.sleepMenuBlocker.on('pointerdown', () => {
      this.closeSleepMenu();
    });

    const panel = this.add
      .rectangle(
        width / 2,
        height / 2,
        panelWidth,
        350,
        0x17110e,
        0.98
      )
      .setStrokeStyle(4, 0xd4af37);

    const title = this.add
      .text(
        width / 2,
        height / 2 - 128,
        'HOW LONG DO YOU SLEEP?',
        {
          fontFamily: 'PressStart2P',
          fontSize: '16px',
          color: '#f6dc8c',
          align: 'center'
        }
      )
      .setOrigin(0.5);

    const subtitle = this.add
      .text(
        width / 2,
        height / 2 - 90,
        'The mattress has no questions. Unlike the case.',
        {
          fontFamily: 'Special Elite',
          fontSize: '20px',
          color: '#f1e6b8',
          align: 'center'
        }
      )
      .setOrigin(0.5);

    const closeButton = this.add
      .text(
        width / 2 + panelWidth / 2 - 32,
        height / 2 - 145,
        'X',
        {
          fontFamily: 'PressStart2P',
          fontSize: '14px',
          color: '#ffffff',
          backgroundColor: '#3b1111',
          padding: {
            x: 10,
            y: 8
          }
        }
      )
      .setOrigin(0.5)
      .setInteractive({
        useHandCursor: true
      });

    closeButton.on('pointerdown', () => {
      this.closeSleepMenu();
    });

    this.sleepMenu.add([
      this.sleepMenuBlocker,
      panel,
      title,
      subtitle,
      closeButton
    ]);

    this.createSleepOption(
      width / 2 - 210,
      height / 2 + 36,
      '2 HOURS',
      '+40 ENERGY',
      2
    );

    this.createSleepOption(
      width / 2,
      height / 2 + 36,
      '4 HOURS',
      '+60 ENERGY',
      4
    );

    this.createSleepOption(
      width / 2 + 210,
      height / 2 + 36,
      '8 HOURS',
      '+100 ENERGY',
      8
    );

    this.sleepMenu.setAlpha(0);

    this.tweens.add({
      targets: this.sleepMenu,
      alpha: 1,
      duration: 180,
      ease: 'Quad.Out'
    });
  }

  createSleepOption(x, y, title, description, hours) {
    const button = this.add
      .rectangle(x, y, 170, 106, 0x29211d, 1)
      .setStrokeStyle(2, 0xf1e6b8)
      .setInteractive({
        useHandCursor: true
      });

    const titleText = this.add
      .text(x, y - 20, title, {
        fontFamily: 'PressStart2P',
        fontSize: '11px',
        color: '#ffffff',
        align: 'center'
      })
      .setOrigin(0.5);

    const descriptionText = this.add
      .text(x, y + 18, description, {
        fontFamily: 'Special Elite',
        fontSize: '19px',
        color: '#ffe066',
        align: 'center'
      })
      .setOrigin(0.5);

    button.on('pointerover', () => {
      button.setFillStyle(0x59422f, 1);
      titleText.setColor('#ffe066');
    });

    button.on('pointerout', () => {
      button.setFillStyle(0x29211d, 1);
      titleText.setColor('#ffffff');
    });

    button.on('pointerdown', () => {
      this.destroySleepMenu();
      this.doSleep(hours);
    });

    this.sleepMenu.add([
      button,
      titleText,
      descriptionText
    ]);
  }

  closeSleepMenu() {
    if (!this.isSleepMenuOpen || !this.sleepMenu) {
      return;
    }

    this.isSleepMenuOpen = false;

    const menu = this.sleepMenu;

    this.sleepMenu = null;
    this.sleepMenuBlocker = null;

    this.tweens.add({
      targets: menu,
      alpha: 0,
      duration: 120,
      ease: 'Quad.In',
      onComplete: () => {
        menu.destroy(true);
      }
    });
  }

  destroySleepMenu() {
    this.isSleepMenuOpen = false;

    if (this.sleepMenu) {
      this.sleepMenu.destroy(true);
      this.sleepMenu = null;
    }

    this.sleepMenuBlocker = null;
  }

  openHotelTv() {
    if (
      this.isLeaving ||
      this.isSleeping ||
      this.uiLocked
    ) {
      return;
    }

    const isOpen = this.scene.isActive('TvBroadcastScene');

    if (isOpen) {
      this.scene.stop('TvBroadcastScene');
      return;
    }

    const mission = gameState.currentMission || {};
    const newsHud = this.scene.get('NewsHud');

    newsHud?.events.emit('setNewspaperVisible', false);
    newsHud?.events.emit('setTvVisible', false);

    this.scene.launch('TvBroadcastScene', {
      returnSceneKey: 'HotelScene',
      mission,
      gameState,
      reporterName: 'Colette Duvall',
      stationName: `${
        gameState.currentCity ||
        mission.city ||
        'Local'
      } Night Report`
    });

    this.scene.bringToTop('NewsHud');
  }

  openCrimeBoard() {
    if (
      this.isLeaving ||
      this.isSleeping ||
      this.uiLocked
    ) {
      return;
    }

    const hud = this.scene.get('PlayerHudScene');

    if (!hud?.crimeBoardUI) {
      console.warn(
        '[HotelScene] Crime board is unavailable: PlayerHudScene or crimeBoardUI missing.'
      );
      return;
    }

    hud.closeAllUIPanels?.();
    hud.crimeBoardUI.open(gameState);
  }

  showNewsHud() {
    if (!this.scene.isActive('NewsHud')) {
      this.scene.launch('NewsHud');
    }

    const newsHud = this.scene.get('NewsHud');

    newsHud?.events.emit('setNewspaperVisible', true);
    newsHud?.events.emit('setTvVisible', true);

    this.scene.bringToTop('NewsHud');
  }

  applyLock(locked) {
    this.uiLocked = locked;

    this.hotspots.forEach((hotspot) => {
      if (!hotspot?.scene) {
        return;
      }

      if (locked) {
        hotspot.disableInteractive();
      } else if (!this.isLeaving && !this.isSleeping) {
        hotspot.setInteractive({
          useHandCursor: true,
          cursor: 'pointer'
        });
      }
    });

    if (locked) {
      this.hideHoverHint();
    }
  }

  createSaveControls() {
    try {
      this.saveUI = new OfficeSaveUI(this, {
        locationType: 'hotel',
        locationCode: 'hotel_room',
        cityCode:
          gameState.currentCityId ||
          this.returnData.cityId ||
          null
      });

      this.saveUI.createButton();
    } catch (error) {
      console.error(
        '[HotelScene] Failed to initialize hotel save controls:',
        error
      );

      this.saveUI = null;
    }
  }

  doSleep(hours) {
    if (this.isLeaving || this.isSleeping) {
      return;
    }

    this.isSleeping = true;
    this.isLeaving = true;

    const energyManager = getEnergyManager();
    const result = energyManager.sleep(hours);

    console.log('[HotelScene] Sleep completed:', {
      hours,
      result
    });

    this.cameras.main.fadeOut(700, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (this.timeManager) {
        this.timeManager.handleAdvanceTime(hours, 0);
      } else {
        EventBus.emit('advanceTime', hours, 0);
      }

      this.goto(
        this.returnScene,
        this.returnData
      );
    });
  }

  handleEscape() {
    if (this.uiLocked) {
      return;
    }

    if (this.isSleepMenuOpen) {
      this.closeSleepMenu();
      return;
    }

    this.leaveHotel();
  }

  leaveHotel() {
    if (this.isLeaving || this.isSleeping) {
      return;
    }

    this.isLeaving = true;

    this.goto(
      this.returnScene,
      this.returnData
    );
  }

  cleanupScene() {
    this.input.keyboard?.off(
      'keydown-ESC',
      this.handleEscape,
      this
    );

    this.saveUI?.destroy();
    this.saveUI = null;

    this.destroySleepMenu();

    this.hotspots.forEach((hotspot) => {
      hotspot?.removeAllListeners();
      hotspot?.destroy();
    });

    this.hotspots = [];

    this.debugGraphics?.destroy();
    this.debugGraphics = null;

    this.debugTexts.forEach((text) => {
      text?.destroy();
    });

    this.debugTexts = [];

    this.hoverHint?.destroy();
    this.hoverHint = null;

    this.uiLocked = false;
    this.isSleepMenuOpen = false;
  }
}