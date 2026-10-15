import { getEnergyManager } from '../managers/EnergyManager.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { OfficeSaveUI } from '../ui/OfficeSaveUI.js';
import { gameState } from '../GameData.js';
import { audioManager } from '../managers/AudioManager.js';

export class HotelScene extends BaseScene {
  constructor() {
    super({ key: 'HotelScene' });

    this.returnScene = 'CrimeCityScene';
    this.returnData = {};

    this.DEBUG_HOTSPOTS = true;

    this.boundCleanupScene = this.cleanupScene.bind(this);
    this.boundWakeOrResume = this.onWakeOrResume.bind(this);
    this.boundSleep = this.onSleep.bind(this);

    this.hudWaitCancels = new Set();

    this.resetHotelState();
  }

  resetHotelState() {
    this.timeManager = null;

    this.isLeaving = false;
    this.isSleeping = false;
    this.isSleepMenuOpen = false;
    this.uiLocked = false;

    this.isSettingUpHud = false;
    this.isOpeningTv = false;
    this.isTransitioning = false;

    this.saveUI = null;
    this.hotspots = [];

    this.sleepMenu = null;
    this.sleepMenuBlocker = null;
    this.hoverHint = null;

    this.debugGraphics = null;
    this.debugTexts = [];
  }

  init(data = {}) {
    this.returnScene = data.returnScene || 'CrimeCityScene';

    this.returnData =
      data.returnData && typeof data.returnData === 'object'
        ? { ...data.returnData }
        : {};

    this.cancelHudWaits();
    this.resetHotelState();
  }

  create() {
    super.create();

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundCleanupScene,
    );

    this.events.on(
      Phaser.Scenes.Events.WAKE,
      this.boundWakeOrResume,
    );

    this.events.on(
      Phaser.Scenes.Events.RESUME,
      this.boundWakeOrResume,
    );

    this.events.on(
      Phaser.Scenes.Events.SLEEP,
      this.boundSleep,
    );

    const { width, height } = this.scale;

    audioManager.init(this);

    this.createBackground(width, height);
    this.createHotelHeader(width);
    this.createHoverHint(width);
    this.createHotspots(width, height);
    this.createLeaveHint(width, height);
    this.createSaveControls();
    this.createOptionalDebug();

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-ESC',
      this.handleEscape,
    );

    // Nie konfigurujemy HUD-u wewnątrz create().
    // Pierwszy POST_UPDATE następuje, gdy hotel już działa.
    this.events.once(
      Phaser.Scenes.Events.POST_UPDATE,
      this.onHotelFirstUpdate,
      this,
    );
  }

  onHotelFirstUpdate() {
    if (this._cleanupDone || !this.sys.isActive()) {
      return;
    }

    console.log('[HotelScene] First update — configuring HUD.');

    this.startHotelIdleMonologue();
    void this.setupHudScenes();
  }

  startHotelIdleMonologue() {
    if (this._cleanupDone || !this.sys.isActive()) {
      return;
    }

    this.monologue?.startIdle?.('idle.hotel');
  }

  setHotelHudContext(playerHud = null) {
    const hud = playerHud || this.getPlayerHudScene();

    if (!hud?.isHudReady) {
      return false;
    }

    hud.setCurrentGameplayScene('HotelScene');

    return true;
  }

  cancelHudWaits() {
    if (!this.hudWaitCancels) {
      this.hudWaitCancels = new Set();
      return;
    }

    [...this.hudWaitCancels].forEach((cancel) => cancel());
    this.hudWaitCancels.clear();
  }

  waitForOverlayReady(sceneKey, timeoutMs = 5000) {
    if (this._cleanupDone || !this.sys.isActive()) {
      return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
      let finished = false;
      let timeoutId = null;

      const removeListeners = () => {
        this.events.off(
          Phaser.Scenes.Events.POST_UPDATE,
          checkReady,
        );

        this.hudWaitCancels.delete(cancel);

        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      const finish = (overlay) => {
        if (finished) {
          return;
        }

        finished = true;
        removeListeners();
        resolve(overlay);
      };

      const cancel = () => finish(null);

      const checkReady = () => {
        if (this._cleanupDone || !this.sys.isActive()) {
          finish(null);
          return;
        }

        const overlay = this.getRegisteredScene(sceneKey);

        if (!overlay || !this.isSceneActive(sceneKey)) {
          return;
        }

        if (
          sceneKey === 'PlayerHudScene'
          && !overlay.isHudReady
        ) {
          return;
        }

        finish(overlay);
      };

      this.hudWaitCancels.add(cancel);

      this.events.on(
        Phaser.Scenes.Events.POST_UPDATE,
        checkReady,
      );

      timeoutId = window.setTimeout(() => {
        if (finished) {
          return;
        }

        finished = true;
        removeListeners();

        reject(
          new Error(
            `[HotelScene] "${sceneKey}" was not ready ` +
            `within ${timeoutMs} ms.`,
          ),
        );
      }, timeoutMs);

      checkReady();
    });
  }

  async ensureReadyOverlay(sceneKey, data = {}) {
    await this.ensureOverlayScene(sceneKey, data);

    if (this._cleanupDone || !this.sys.isActive()) {
      return null;
    }

    return this.waitForOverlayReady(sceneKey);
  }

  async ensurePlayerHud() {
    const playerHud = await this.ensureReadyOverlay(
      'PlayerHudScene',
    );

    if (playerHud) {
      this.bringSceneToTopIfActive('PlayerHudScene');
    }

    return playerHud;
  }

  async setupHudScenes() {
    if (
      this.isSettingUpHud
      || this._cleanupDone
      || !this.sys.isActive()
    ) {
      return;
    }

    this.isSettingUpHud = true;

    try {
      // Dolne menu przywracamy jako pierwsze.
      const playerHud = await this.ensurePlayerHud();

      if (this._cleanupDone || !this.sys.isActive()) {
        return;
      }

      if (!playerHud) {
        console.warn(
          '[HotelScene] PlayerHudScene could not be restored.',
        );
        return;
      }

      this.setHotelHudContext(playerHud);

      playerHud.closeAllUIPanels?.();
      playerHud.refreshNotebook?.();
      playerHud.refreshUI?.();

      this.timeManager = playerHud.timeManager || null;

      console.log('[HotelScene] Bottom HUD ready:', {
        ready: playerHud.isHudReady,
        active: this.isSceneActive('PlayerHudScene'),
        visible: playerHud.sys.settings.visible,
        context: playerHud.currentGameplaySceneKey,
      });

      const uiScene = await this.ensureReadyOverlay('UIScene');

      if (this._cleanupDone || !this.sys.isActive()) {
        return;
      }

      if (uiScene) {
        this.game.events.emit('setHudVisible', true);
        EventBus.emit('showHUD');

        uiScene.refreshScoreHud?.();
        uiScene.refreshMoneyHud?.();
        uiScene.updateEnergy?.();

        uiScene.updateTime?.({
          day: gameState.currentDay || gameState.day || 1,
          hour: gameState.currentHour ?? gameState.hour ?? 8,
          minute:
            gameState.currentMinute
            ?? gameState.minute
            ?? 0,
          partOfDay:
            gameState.currentPartOfDay
            || gameState.partOfDay
            || 'Morning',
        });
      }

      await this.showNewsHud();

      if (this._cleanupDone || !this.sys.isActive()) {
        return;
      }

      this.setHotelHudContext(playerHud);
      this.bringSceneToTopIfActive('PlayerHudScene');
    } catch (error) {
      if (!this._cleanupDone) {
        console.error(
          '[HotelScene] Failed to configure HUD scenes:',
          error,
        );
      }
    } finally {
      this.isSettingUpHud = false;
    }
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
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.add
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
          strokeThickness: 4,
        },
      )
      .setOrigin(0.5)
      .setDepth(5);
  }

  createHoverHint(width) {
    this.hoverHint = this.add
      .text(width / 2, 122, '', {
        fontFamily: 'SpecialElite',
        fontSize: '19px',
        color: '#ffe066',
        backgroundColor: '#111111cc',
        padding: {
          left: 12,
          right: 12,
          top: 7,
          bottom: 7,
        },
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setVisible(false);
  }

  createLeaveHint(width, height) {
    this.add
      .text(width / 2, height - 76, '[ ESC TO LEAVE ]', {
        fontFamily: 'PressStart2P',
        fontSize: '12px',
        color: '#dddddd',
        align: 'center',
        backgroundColor: '#111111aa',
        padding: { x: 14, y: 10 },
      })
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
        action: () => this.openSleepMenu(),
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
        action: () => {
          void this.openHotelTv();
        },
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
        action: () => {
          void this.openCrimeBoard();
        },
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
        action: () => {
          void this.leaveHotel();
        },
      },
    ];

    hotspotData.forEach((data) => {
      const zone = this.add
        .zone(data.x, data.y, data.width, data.height)
        .setOrigin(0, 0)
        .setDepth(4)
        .setInteractive({
          useHandCursor: true,
          cursor: 'pointer',
        });

      zone.hotspotData = data;

      zone.on('pointerover', () => {
        if (this.isHotelInteractionBlocked()) {
          return;
        }

        this.showHoverHint(data.hoverText);
        this.sayHotelMonologue(data);
      });

      zone.on('pointerout', () => {
        this.hideHoverHint();
      });

      zone.on('pointerdown', () => {
        if (this.isHotelInteractionBlocked()) {
          return;
        }

        this.hideHoverHint();

        try {
          data.action?.();
        } catch (error) {
          console.error(
            `[HotelScene] Hotel hotspot failed: ${data.id}`,
            error,
          );
        }
      });

      this.hotspots.push(zone);
    });
  }

  isHotelInteractionBlocked() {
    return (
      this.isLeaving
      || this.isSleeping
      || this.isSleepMenuOpen
      || this.uiLocked
      || this._cleanupDone
    );
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
        data.height,
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
            bottom: 2,
          },
        })
        .setDepth(999);

      this.debugTexts.push(label);
    });
  }

  showHoverHint(text) {
    if (!this.hoverHint?.active || !text || this._cleanupDone) {
      return;
    }

    this.hoverHint.setText(text).setVisible(true);
  }

  hideHoverHint() {
    this.hoverHint?.setVisible(false);
  }

  sayHotelMonologue(data) {
    if (!data || this._cleanupDone) {
      return;
    }

    if (this.monologue?.sayRandom && data.monologueKey) {
      this.monologue.sayRandom(data.monologueKey, {
        cooldownKey: `hotel-hover:${data.id}`,
        cooldownMs: 2500,
        queue: false,
      });
      return;
    }

    if (this.monologue?.say && data.fallbackMonologue) {
      this.monologue.say(data.fallbackMonologue, {
        cooldownKey: `hotel-hover-fallback:${data.id}`,
        cooldownMs: 2500,
        queue: false,
      });
    }
  }

  openSleepMenu() {
    if (this.isHotelInteractionBlocked()) {
      return;
    }

    this.isSleepMenuOpen = true;
    this.hideHoverHint();

    const { width, height } = this.scale;
    const panelWidth = Math.min(760, width * 0.75);

    this.sleepMenu = this.add.container(0, 0).setDepth(200);

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
        0.98,
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
          align: 'center',
        },
      )
      .setOrigin(0.5);

    const subtitle = this.add
      .text(
        width / 2,
        height / 2 - 90,
        'The mattress has no questions. Unlike the case.',
        {
          fontFamily: 'SpecialElite',
          fontSize: '20px',
          color: '#f1e6b8',
          align: 'center',
        },
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
          padding: { x: 10, y: 8 },
        },
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    closeButton.on('pointerdown', () => {
      this.closeSleepMenu();
    });

    this.sleepMenu.add([
      this.sleepMenuBlocker,
      panel,
      title,
      subtitle,
      closeButton,
    ]);

    this.createSleepOption(
      width / 2 - 210,
      height / 2 + 36,
      '2 HOURS',
      '+40 ENERGY',
      2,
    );

    this.createSleepOption(
      width / 2,
      height / 2 + 36,
      '4 HOURS',
      '+60 ENERGY',
      4,
    );

    this.createSleepOption(
      width / 2 + 210,
      height / 2 + 36,
      '8 HOURS',
      '+100 ENERGY',
      8,
    );

    this.sleepMenu.setAlpha(0);

    this.createTrackedTween({
      targets: this.sleepMenu,
      alpha: 1,
      duration: 180,
      ease: 'Quad.Out',
    });
  }

  createSleepOption(x, y, title, description, hours) {
    if (!this.sleepMenu?.active) {
      return;
    }

    const button = this.add
      .rectangle(x, y, 170, 106, 0x29211d, 1)
      .setStrokeStyle(2, 0xf1e6b8)
      .setInteractive({ useHandCursor: true });

    const titleText = this.add
      .text(x, y - 20, title, {
        fontFamily: 'PressStart2P',
        fontSize: '11px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    const descriptionText = this.add
      .text(x, y + 18, description, {
        fontFamily: 'SpecialElite',
        fontSize: '19px',
        color: '#ffe066',
        align: 'center',
      })
      .setOrigin(0.5);

    button.on('pointerover', () => {
      if (this.isSleeping || this.isLeaving) {
        return;
      }

      button.setFillStyle(0x59422f, 1);
      titleText.setColor('#ffe066');
    });

    button.on('pointerout', () => {
      button.setFillStyle(0x29211d, 1);
      titleText.setColor('#ffffff');
    });

    button.on('pointerdown', () => {
      if (
        this.isSleeping
        || this.isLeaving
        || this._cleanupDone
      ) {
        return;
      }

      this.destroySleepMenu();
      this.doSleep(hours);
    });

    this.sleepMenu.add([
      button,
      titleText,
      descriptionText,
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

    this.killTrackedTweensOf(menu);

    this.createTrackedTween({
      targets: menu,
      alpha: 0,
      duration: 120,
      ease: 'Quad.In',
      onComplete: () => {
        if (menu?.active) {
          menu.destroy(true);
        }
      },
    });
  }

  destroySleepMenu() {
    this.isSleepMenuOpen = false;

    if (this.sleepMenu) {
      this.killTrackedTweensOf(this.sleepMenu);

      if (this.sleepMenu.active) {
        this.sleepMenu.destroy(true);
      }

      this.sleepMenu = null;
    }

    this.sleepMenuBlocker = null;
  }

  async openHotelTv() {
    if (
      this.isHotelInteractionBlocked()
      || this.isOpeningTv
    ) {
      return;
    }

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
        stationName: `${
          gameState.currentCity || mission.city || 'Local'
        } Night Report`,
      });

      if (this._cleanupDone || status !== 'opened') {
        return;
      }

      const newsHud = this.getRegisteredScene('NewsHud');

      newsHud?.events?.emit('setNewspaperVisible', false);
      newsHud?.events?.emit('setTvVisible', false);

      this.bringSceneToTopIfActive('NewsHud');
    } catch (error) {
      if (!this._cleanupDone) {
        console.error(
          '[HotelScene] Could not open hotel TV:',
          error,
        );
      }
    } finally {
      this.isOpeningTv = false;
    }
  }

  async openCrimeBoard() {
    if (this.isHotelInteractionBlocked()) {
      return false;
    }

    let hud = this.getPlayerHudScene();

    if (!hud?.isHudReady || !hud?.crimeBoardUI) {
      try {
        hud = await this.ensurePlayerHud();
      } catch (error) {
        console.error(
          '[HotelScene] Could not restore HUD for Crime Board:',
          error,
        );
        return false;
      }
    }

    if (this._cleanupDone || !this.sys.isActive()) {
      return false;
    }

    if (!hud?.crimeBoardUI) {
      console.warn(
        '[HotelScene] Crime Board is unavailable.',
        {
          hudFound: Boolean(hud),
          hudReady: hud?.isHudReady,
          hudActive: this.isSceneActive('PlayerHudScene'),
        },
      );
      return false;
    }

    this.setHotelHudContext(hud);
    hud.closeAllUIPanels();

    const opened = hud.openCrimeBoard() || false;

    console.log('[HotelScene] Crime Board open result:', {
      opened,
      hudContext: hud.currentGameplaySceneKey,
      hudActive: this.isSceneActive('PlayerHudScene'),
    });

    return opened;
  }

  async showNewsHud() {
    if (this._cleanupDone || !this.sys.isActive()) {
      return false;
    }

    const newsHud = await this.ensureReadyOverlay('NewsHud');

    if (this._cleanupDone || !this.sys.isActive()) {
      return false;
    }

    if (!newsHud) {
      console.warn('[HotelScene] NewsHud could not be opened.');
      return false;
    }

    newsHud.events?.emit('setNewspaperVisible', true);
    newsHud.events?.emit('setTvVisible', true);

    this.bringSceneToTopIfActive('NewsHud');

    return true;
  }

  applyLock(locked) {
    this.uiLocked = locked;

    this.hotspots.forEach((hotspot) => {
      if (!hotspot?.scene || !hotspot.active) {
        return;
      }

      if (locked) {
        hotspot.disableInteractive();
        return;
      }

      if (
        !this.isLeaving
        && !this.isSleeping
        && !this.isSleepMenuOpen
      ) {
        hotspot.setInteractive({
          useHandCursor: true,
          cursor: 'pointer',
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
          gameState.currentCityId
          || this.returnData.cityId
          || null,
      });

      this.saveUI.createButton();
    } catch (error) {
      console.error(
        '[HotelScene] Failed to initialize save controls:',
        error,
      );

      this.saveUI = null;
    }
  }

  restoreAfterFailedExit() {
    if (this._cleanupDone || !this.sys.isActive()) {
      return;
    }

    this.isLeaving = false;
    this.isSleeping = false;
    this.isTransitioning = false;

    this.applyLock(false);
    this.cameras.main.fadeIn(220, 0, 0, 0);
  }

  doSleep(hours) {
    if (
      this.isLeaving
      || this.isSleeping
      || this._cleanupDone
    ) {
      return;
    }

    this.isSleeping = true;
    this.isLeaving = true;
    this.isTransitioning = true;

    this.applyLock(true);

    try {
      const energyManager = getEnergyManager();
      const result = energyManager.sleep(hours);

      console.log('[HotelScene] Sleep completed:', {
        hours,
        result,
      });
    } catch (error) {
      console.error(
        '[HotelScene] Energy restoration failed:',
        error,
      );
    }

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        if (this._cleanupDone || !this.sys.isActive()) {
          return;
        }

        if (this.timeManager?.handleAdvanceTime) {
          this.timeManager.handleAdvanceTime(hours, 0);
        } else {
          EventBus.emit('advanceTime', hours, 0);
        }

        void this.goto(this.returnScene, this.returnData)
          .then((moved) => {
            if (!moved) {
              this.restoreAfterFailedExit();
            }
          })
          .catch((error) => {
            if (!this._cleanupDone) {
              console.error(
                '[HotelScene] Could not return after sleep:',
                error,
              );
              this.restoreAfterFailedExit();
            }
          });
      },
    );

    this.cameras.main.fadeOut(700, 0, 0, 0);
  }

  handleEscape() {
    if (this.uiLocked || this._cleanupDone) {
      return;
    }

    if (this.isSleepMenuOpen) {
      this.closeSleepMenu();
      return;
    }

    void this.leaveHotel();
  }

  async leaveHotel() {
    if (
      this.isLeaving
      || this.isSleeping
      || this._cleanupDone
    ) {
      return false;
    }

    this.isLeaving = true;
    this.isTransitioning = true;

    this.applyLock(true);
    this.hideHoverHint();

    try {
      const moved = await this.goto(
        this.returnScene,
        this.returnData,
      );

      if (!moved) {
        this.restoreAfterFailedExit();
      }

      return moved;
    } catch (error) {
      if (!this._cleanupDone) {
        console.error(
          '[HotelScene] Could not leave hotel:',
          error,
        );

        this.restoreAfterFailedExit();
      }

      return false;
    }
  }

  onWakeOrResume() {
    if (this._cleanupDone) {
      return;
    }

    this.isOpeningTv = false;

    if (
      !this.isLeaving
      && !this.isSleeping
      && !this.isSleepMenuOpen
    ) {
      this.applyLock(false);
    }

    this.events.off(
      Phaser.Scenes.Events.POST_UPDATE,
      this.onHotelFirstUpdate,
      this,
    );

    this.events.once(
      Phaser.Scenes.Events.POST_UPDATE,
      this.onHotelFirstUpdate,
      this,
    );
  }

  onSleep() {
    this.hideHoverHint();
    this.cancelHudWaits();
  }

  cleanupScene() {
    this.cancelHudWaits();

    this.events.off(
      Phaser.Scenes.Events.POST_UPDATE,
      this.onHotelFirstUpdate,
      this,
    );

    this.events.off(
      Phaser.Scenes.Events.WAKE,
      this.boundWakeOrResume,
    );

    this.events.off(
      Phaser.Scenes.Events.RESUME,
      this.boundWakeOrResume,
    );

    this.events.off(
      Phaser.Scenes.Events.SLEEP,
      this.boundSleep,
    );

    this.destroySleepMenu();

    this.saveUI?.destroy();
    this.saveUI = null;

    this.hotspots.forEach((hotspot) => {
      hotspot?.removeAllListeners?.();

      if (hotspot?.active) {
        hotspot.destroy();
      }
    });

    this.hotspots = [];

    this.debugGraphics?.destroy();
    this.debugGraphics = null;

    this.debugTexts.forEach((text) => {
      if (text?.active) {
        text.destroy();
      }
    });

    this.debugTexts = [];

    if (this.hoverHint?.active) {
      this.hoverHint.destroy();
    }

    this.hoverHint = null;
    this.timeManager = null;

    this.uiLocked = false;
    this.isSleepMenuOpen = false;
    this.isOpeningTv = false;
    this.isSettingUpHud = false;
    this.isTransitioning = false;
  }
}