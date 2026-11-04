import {
  getEnergyManager
} from '../../managers/EnergyManager.js';

import { gameState } from '../../GameData.js';
import { EventBus } from '../../EventBus.js';

import {
  flushAutosave,
  requestAutosave
} from '../../gameStatePersistence.js';

const SLEEP_RECOVERY = Object.freeze({
  1: 7,
  2: 15,
  3: 24,
  4: 34,
  5: 45,
  6: 57,
  7: 70,
  8: 84
});

const SLEEP_HOURS = Object.freeze(
  Object.keys(SLEEP_RECOVERY).map(Number)
);

function isValidSleepDuration(value) {
  return (
    Number.isInteger(value) &&
    Object.hasOwn(SLEEP_RECOVERY, value)
  );
}

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
    const duration = Number(hours);

    if (!isValidSleepDuration(duration)) {
      return 0;
    }

    const energy = getEnergyManager();

    const configuredMultiplier = Number(
      this.scene.hotelConfig?.recoveryMultiplier ?? 1
    );

    const hotelMultiplier =
      Number.isFinite(configuredMultiplier) &&
      configuredMultiplier > 0
        ? configuredMultiplier
        : 1;

    let amount =
      SLEEP_RECOVERY[duration] * hotelMultiplier;

    if (energy.difficulty === 'rookie') {
      amount *= 1.15;
    }

    return Math.ceil(amount);
  }

  getActualRecovery(hours) {
    const energy = getEnergyManager();

    const missingEnergy = Math.max(
      0,
      energy.getMaxEnergy() -
      energy.getCurrentEnergy()
    );

    return Math.min(
      missingEnergy,
      this.getRecovery(hours)
    );
  }

  openMenu() {
    const scene = this.scene;

    if (
      scene.isHotelInteractionBlocked() ||
      !scene.hotelConfig ||
      this.menu
    ) {
      return;
    }

    scene.isSleepMenuOpen = true;
    scene.hideHoverHint();
    scene.hotspotUI?.setLocked(true);

    const { width, height } = scene.scale;
    const energy = getEnergyManager();

    this.menu = scene.add
      .container(0, 0)
      .setDepth(400);

    this.menuBlocker = scene.add
      .rectangle(
        0,
        0,
        width,
        height,
        0x000000,
        0.7
      )
      .setOrigin(0)
      .setInteractive();

    this.menuBlocker.on(
      'pointerdown',
      () => this.closeMenu()
    );

    this.menu.add(this.menuBlocker);

    const panelW = 820;
    const panelH = 430;

    const scale = Math.max(
      0.01,
      Math.min(
        1,
        (width - 32) / panelW,
        (height - 32) / panelH
      )
    );

    const content = scene.add
      .container(
        (width - panelW * scale) / 2,
        (height - panelH * scale) / 2
      )
      .setScale(scale);

    this.menu.add(content);

    const panel = scene.add
      .rectangle(
        0,
        0,
        panelW,
        panelH,
        0x17110e,
        0.98
      )
      .setOrigin(0)
      .setStrokeStyle(4, 0xd4af37)
      .setInteractive();

    panel.on(
      'pointerdown',
      (_pointer, _x, _y, event) => {
        event?.stopPropagation();
      }
    );

    content.add(panel);

    content.add(
      scene.add.text(
        panelW / 2,
        42,
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
        82,
        `${scene.hotelConfig.label} — room already paid`,
        {
          fontFamily: 'SpecialElite',
          fontSize: '21px',
          color: '#f1e6b8'
        }
      ).setOrigin(0.5)
    );

    content.add(
      scene.add.text(
        panelW / 2,
        113,
        (
          `ENERGY: ${energy.getCurrentEnergy()}` +
          ` / ${energy.getMaxEnergy()}`
        ),
        {
          fontFamily: 'SpecialElite',
          fontSize: '18px',
          color: '#c4b895'
        }
      ).setOrigin(0.5)
    );

    const columns = 4;
    const spacingX = 190;
    const spacingY = 112;
    const startX = 125;
    const startY = 192;

    SLEEP_HOURS.forEach((hours, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);

      this.createOption(
        content,
        startX + column * spacingX,
        startY + row * spacingY,
        hours
      );
    });

    content.add(
      scene.add.text(
        panelW / 2,
        386,
        'Longer sleep pays off. The thief does not take a nap.',
        {
          fontFamily: 'SpecialElite',
          fontSize: '18px',
          color: '#c4b895',
          align: 'center'
        }
      ).setOrigin(0.5)
    );

    const close = scene.add.text(
      panelW - 30,
      25,
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

    close.on(
      'pointerdown',
      () => this.closeMenu()
    );

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

    const potentialRecovery = this.getRecovery(hours);
    const actualRecovery = this.getActualRecovery(hours);

    const button = scene.add
      .rectangle(
        x,
        y,
        170,
        94,
        0x29211d,
        1
      )
      .setStrokeStyle(2, 0xf1e6b8)
      .setInteractive({
        useHandCursor: true
      });

    const title = scene.add.text(
      x,
      y - 25,
      `${hours} ${hours === 1 ? 'HOUR' : 'HOURS'}`,
      {
        fontFamily: 'PressStart2P',
        fontSize: '11px',
        color: '#ffffff'
      }
    ).setOrigin(0.5);

    const description = scene.add.text(
      x,
      y + 2,
      `+${actualRecovery} ENERGY`,
      {
        fontFamily: 'SpecialElite',
        fontSize: '19px',
        color:
          actualRecovery > 0
            ? '#ffe066'
            : '#b8ad97'
      }
    ).setOrigin(0.5);

    const detail = scene.add.text(
      x,
      y + 28,
      actualRecovery < potentialRecovery
        ? `Up to +${potentialRecovery}; capped`
        : `${(potentialRecovery / hours).toFixed(1)} per hour`,
      {
        fontFamily: 'SpecialElite',
        fontSize: '13px',
        color: '#c4b895'
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

    container.add([
      button,
      title,
      description,
      detail
    ]);
  }

  closeMenu() {
    const scene = this.scene;

    if (
      !scene.isSleepMenuOpen ||
      !this.menu
    ) {
      return;
    }

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

        if (menu.active) {
          menu.destroy(true);
        }
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
    const duration = Number(hours);

    if (!isValidSleepDuration(duration)) {
      return;
    }

    const scene = this.scene;

    if (
      scene.isLeaving ||
      scene.isSleeping ||
      scene._cleanupDone
    ) {
      return;
    }

    this.pendingHours = duration;
    this.sleepCompleted = false;

    this.begin(duration);
  }

  begin(hours) {
    const scene = this.scene;

    if (
      !isValidSleepDuration(hours) ||
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

    const result =
      getEnergyManager().startManualSleep(hours);

    if (!result?.success) {
      console.warn(
        '[HotelScene] Could not start sleep:',
        result
      );

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
      const opened = await scene.launchOverlay(
        'HollyIntroScene',
        {
          returnScene: 'HotelScene',
          returnData: {
            sleepHours: hours
          }
        }
      );

      if (!this.isAlive()) return;

      if (!opened) {
        this.finish(hours);
        return;
      }

      scene.bringSceneToTopIfActive(
        'HollyIntroScene'
      );

      scene.scene.pause();
    } catch (error) {
      console.error(
        '[HotelScene] Holly intro failed:',
        error
      );

      if (this.isAlive()) {
        this.finish(hours);
      }
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

    const pending = Number(this.pendingHours);

    const requested = Number(
      payload.sleepHours ??
      this.pendingHours ??
      8
    );

    const hours = isValidSleepDuration(pending)
      ? pending
      : isValidSleepDuration(requested)
        ? requested
        : 8;

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

    const sleepHours = Number(
      hours ?? this.pendingHours ?? 8
    );

    if (!isValidSleepDuration(sleepHours)) {
      return;
    }

    const energy = getEnergyManager();
    const recovery = this.getRecovery(sleepHours);

    try {
      // Recovery requires releasing the manual sleep lock.
      energy.cancelManualSleep();

      const result = energy.recoverCustom(
        recovery,
        (
          `Hotel sleep (${sleepHours}h, ` +
          `${scene.hotelId}): +${recovery}`
        ),
        {
          recoveryType: 'sleep',
          recoverySubtype: `hotel_${scene.hotelId}`
        }
      );

      if (
        !result.success &&
        result.reason !== 'energy_full'
      ) {
        throw new Error(
          `Hotel energy recovery failed: ${result.reason}`
        );
      }

      this.sleepCompleted = true;
      this.ownsManualSleep = false;

      EventBus.emit(
        'advanceTime',
        sleepHours,
        0
      );

      EventBus.emit('manualSleepFinished', {
        sleepHours,
        recovered: result.success ? result.amount : 0,
        energy: energy.getCurrentEnergy()
      });

      requestAutosave();
      flushAutosave();
    } catch (error) {
      console.error(
        '[HotelScene] Sleep completion failed:',
        error
      );

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

    scene.cameras.main.fadeOut(
      700,
      0,
      0,
      0
    );
  }

  async returnAfterSleep(hours) {
    const scene = this.scene;

    try {
      const moved = await scene.goto(
        scene.returnScene,
        {
          ...scene.returnData,
          wokeUp: true,
          sleptHours: hours
        }
      );

      if (!moved) {
        scene.restoreAfterFailedExit();
      }
    } catch (error) {
      if (!scene._cleanupDone) {
        console.error(
          '[HotelScene] Return after sleep failed:',
          error
        );

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

      if (menu.active) {
        menu.destroy(true);
      }
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