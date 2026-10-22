import { getEnergyManager } from '../../managers/EnergyManager.js';
import { gameState } from '../../GameData.js';
import { EventBus } from '../../EventBus.js';
import {
  flushAutosave,
  requestAutosave
} from '../../gameStatePersistence.js';

const SLEEP_RECOVERY = {
  2: 40,
  4: 60,
  8: 100
};

export class HotelSleep {
  constructor(scene) {
    this.scene = scene;

    this.menu = null;
    this.closingMenus = new Set();
    this.menuBlocker = null;

    this.pendingHours = null;
    this.hollyResolving = false;
    this.sleepCompleted = false;
    this.ownsManualSleep = false;

    this.resumeHandler = null;
    this.fadeHandler = null;
  }

  isAlive() {
    return (
      !this.scene._cleanupDone &&
      this.scene.sys.isActive()
    );
  }

  getRecovery(hours) {
    const energy = getEnergyManager();

    let amount =
      SLEEP_RECOVERY[hours] *
      (this.scene.hotelConfig?.recoveryMultiplier ?? 1);

    if (energy.difficulty === 'rookie') {
      amount *= 1.15;
    }

    return Math.ceil(amount);
  }

  openMenu() {
    const scene = this.scene;

    if (
      scene.isHotelInteractionBlocked() ||
      !scene.hotelConfig
    ) {
      return;
    }

    scene.isSleepMenuOpen = true;
    scene.hideHoverHint();
    scene.hotspotUI?.setLocked(true);

    const { width, height } = scene.scale;

    this.menu = scene.add.container(0, 0).setDepth(400);

    this.menuBlocker = scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.7)
      .setOrigin(0)
      .setInteractive();

    this.menuBlocker.on('pointerdown', () => this.closeMenu());
    this.menu.add(this.menuBlocker);

    const panelW = 760;
    const panelH = 350;

    const scale = Math.max(
      0.01,
      Math.min(1, (width - 32) / panelW, (height - 32) / panelH)
    );

    const content = scene.add.container(
      (width - panelW * scale) / 2,
      (height - panelH * scale) / 2
    ).setScale(scale);

    this.menu.add(content);

    const panel = scene.add
      .rectangle(0, 0, panelW, panelH, 0x17110e, 0.98)
      .setOrigin(0)
      .setStrokeStyle(4, 0xd4af37)
      .setInteractive();

    panel.on('pointerdown', (_pointer, _x, _y, event) => {
      event.stopPropagation();
    });

    content.add(panel);

    content.add(
      scene.add.text(
        panelW / 2,
        44,
        'HOW LONG DO YOU SLEEP?',
        {
          fontFamily: 'PressStart2P',
          fontSize: '16px',
          color: '#f6dc8c'
        }
      ).setOrigin(0.5)
    );

    content.add(
      scene.add.text(
        panelW / 2,
        88,
        `${scene.hotelConfig.label} — room already paid`,
        {
          fontFamily: 'SpecialElite',
          fontSize: '21px',
          color: '#f1e6b8'
        }
      ).setOrigin(0.5)
    );

    [2, 4, 8].forEach((hours, index) => {
      this.createOption(
        content,
        170 + index * 210,
        210,
        hours
      );
    });

    const close = scene.add.text(panelW - 30, 25, 'X', {
      fontFamily: 'PressStart2P',
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#3b1111',
      padding: { x: 10, y: 8 }
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    close.on('pointerdown', () => this.closeMenu());
    content.add(close);

    this.menu.setAlpha(0);

    scene.createTrackedTween({
      targets: this.menu,
      alpha: 1,
      duration: 180,
      ease: 'Quad.Out'
    });
  }

  createOption(container, x, y, hours) {
    const scene = this.scene;

    const button = scene.add
      .rectangle(x, y, 170, 106, 0x29211d, 1)
      .setStrokeStyle(2, 0xf1e6b8)
      .setInteractive({ useHandCursor: true });

    const title = scene.add.text(
      x,
      y - 20,
      `${hours} HOURS`,
      {
        fontFamily: 'PressStart2P',
        fontSize: '11px',
        color: '#ffffff'
      }
    ).setOrigin(0.5);

    const description = scene.add.text(
      x,
      y + 18,
      `+${this.getRecovery(hours)} ENERGY`,
      {
        fontFamily: 'SpecialElite',
        fontSize: '19px',
        color: '#ffe066'
      }
    ).setOrigin(0.5);

    button.on('pointerover', () => {
      button.setFillStyle(0x59422f);
      title.setColor('#ffe066');
    });

    button.on('pointerout', () => {
      button.setFillStyle(0x29211d);
      title.setColor('#ffffff');
    });

    button.on('pointerdown', () => {
      if (
        scene.isSleeping ||
        scene.isLeaving ||
        scene._cleanupDone
      ) {
        return;
      }

      this.destroyMenu();
      this.doSleep(hours);
    });

    container.add([button, title, description]);
  }

  closeMenu() {
    const scene = this.scene;

    if (!scene.isSleepMenuOpen || !this.menu) return;

    scene.isSleepMenuOpen = false;

    const menu = this.menu;

    this.menu = null;
    this.menuBlocker = null;
    this.closingMenus.add(menu);

    scene.killTrackedTweensOf(menu);
    scene.hotspotUI?.setLocked(scene.uiLocked);

    scene.createTrackedTween({
      targets: menu,
      alpha: 0,
      duration: 120,
      ease: 'Quad.In',
      onComplete: () => {
        this.closingMenus.delete(menu);

        if (menu.active) menu.destroy(true);
      }
    });
  }

  destroyMenu() {
    const scene = this.scene;
    scene.isSleepMenuOpen = false;

    if (this.menu) {
      scene.killTrackedTweensOf(this.menu);
      this.menu.destroy(true);
      this.menu = null;
    }

    this.menuBlocker = null;
  }

  doSleep(hours) {
    if (!Object.hasOwn(SLEEP_RECOVERY, hours)) return;

    const scene = this.scene;

    if (
      scene.isLeaving ||
      scene.isSleeping ||
      scene._cleanupDone
    ) {
      return;
    }

    this.pendingHours = hours;
    this.sleepCompleted = false;

    this.begin(hours);
  }

  begin(hours) {
    const scene = this.scene;

    if (
      scene.isLeaving ||
      scene.isSleeping ||
      scene._cleanupDone
    ) {
      return;
    }

    scene.isSleeping = true;
    scene.isLeaving = true;
    scene.isTransitioning = true;

    scene.applyLock(true);
    scene.hideHoverHint();

    const result = getEnergyManager().startManualSleep(hours);

    if (!result?.success) {
      console.warn('[HotelScene] Could not start sleep:', result);

      this.pendingHours = null;
      scene.restoreAfterFailedExit();
      return;
    }

    this.ownsManualSleep = true;

    const state = gameState.getState
      ? gameState.getState()
      : gameState;

    const shouldShowHolly =
      state.hollyIntroPending === true &&
      state.hollyIntroSeen !== true;

    if (shouldShowHolly) {
      void this.startHollyIntro(hours);
    } else {
      this.finish(hours);
    }
  }

  async startHollyIntro(hours) {
    const scene = this.scene;

    try {
      const opened = await scene.launchOverlay('HollyIntroScene', {
        returnScene: 'HotelScene',
        returnData: { sleepHours: hours }
      });

      if (!this.isAlive()) return;

      if (!opened) {
        this.finish(hours);
        return;
      }

      scene.bringSceneToTopIfActive('HollyIntroScene');
      scene.scene.pause();
    } catch (error) {
      console.error('[HotelScene] Holly intro failed:', error);

      if (this.isAlive()) this.finish(hours);
    }
  }

  onHollyFinished(payload = {}) {
    const scene = this.scene;

    if (
      scene._cleanupDone ||
      this.hollyResolving ||
      !this.ownsManualSleep ||
      this.sleepCompleted
    ) {
      return;
    }

    this.hollyResolving = true;

    const requested = Number(
      payload.sleepHours || this.pendingHours || 8
    );

    const hours = Object.hasOwn(SLEEP_RECOVERY, requested)
      ? requested
      : this.pendingHours || 8;

    this.resumeHandler = () => {
      this.resumeHandler = null;
      this.hollyResolving = false;
      this.finish(hours);
    };

    scene.events.once(
      Phaser.Scenes.Events.RESUME,
      this.resumeHandler
    );

    if (scene.isSceneRunning('HollyIntroScene')) {
      scene.scene.stop('HollyIntroScene');
    }

    scene.scene.resume();
  }

  finish(hours) {
    const scene = this.scene;

    if (
      !this.isAlive() ||
      !this.ownsManualSleep ||
      this.sleepCompleted
    ) {
      return;
    }

    const sleepHours = Number(hours || this.pendingHours || 8);
    if (!Object.hasOwn(SLEEP_RECOVERY, sleepHours)) return;

    const energy = getEnergyManager();
    const recovery = this.getRecovery(sleepHours);

    try {
      // recoverCustom jest blokowane podczas snu.
      energy.cancelManualSleep();

      const result = energy.recoverCustom(
        recovery,
        `Hotel sleep (${sleepHours}h, ${scene.hotelId}): +${recovery}`,
        {
          recoveryType: 'sleep',
          recoverySubtype: `hotel_${scene.hotelId}`
        }
      );

      if (!result.success && result.reason !== 'energy_full') {
        throw new Error(
          `Hotel energy recovery failed: ${result.reason}`
        );
      }

      // Oznaczamy zakończenie przed zdarzeniami zewnętrznymi.
      this.sleepCompleted = true;
      this.ownsManualSleep = false;

      EventBus.emit('advanceTime', sleepHours, 0);

      EventBus.emit('manualSleepFinished', {
        sleepHours,
        recovered: result.success ? result.amount : 0,
        energy: energy.getCurrentEnergy()
      });

      requestAutosave();
      flushAutosave();
    } catch (error) {
      console.error('[HotelScene] Sleep completion failed:', error);

      this.pendingHours = null;
      scene.restoreAfterFailedExit();
      return;
    }

    this.fadeHandler = () => {
      this.fadeHandler = null;

      if (!this.isAlive()) return;

      this.pendingHours = null;

      void this.returnAfterSleep(sleepHours);
    };

    scene.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      this.fadeHandler
    );

    scene.cameras.main.fadeOut(700, 0, 0, 0);
  }

  async returnAfterSleep(hours) {
    const scene = this.scene;

    try {
      const moved = await scene.goto(scene.returnScene, {
        ...scene.returnData,
        wokeUp: true,
        sleptHours: hours
      });

      if (!moved) scene.restoreAfterFailedExit();
    } catch (error) {
      if (!scene._cleanupDone) {
        console.error('[HotelScene] Return after sleep failed:', error);
        scene.restoreAfterFailedExit();
      }
    }
  }

  clearPending() {
    if (this.ownsManualSleep) {
      getEnergyManager().cancelManualSleep();
    }

    this.ownsManualSleep = false;
    this.pendingHours = null;
  }

  destroy() {
    this.destroyMenu();

    for (const menu of this.closingMenus) {
      this.scene.killTrackedTweensOf(menu);

      if (menu.active) menu.destroy(true);
    }

    this.closingMenus.clear();

    if (this.resumeHandler) {
      this.scene.events.off(
        Phaser.Scenes.Events.RESUME,
        this.resumeHandler
      );

      this.resumeHandler = null;
    }

    if (this.fadeHandler) {
      this.scene.cameras.main.off(
        Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
        this.fadeHandler
      );

      this.fadeHandler = null;
    }

    this.clearPending();
    this.hollyResolving = false;
  }
}