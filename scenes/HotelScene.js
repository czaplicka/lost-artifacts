import { getEnergyManager } from '../../managers/EnergyManager.js';
import { gameState } from '../../GameData.js';
import { EventBus } from '../../EventBus.js';

import {
  flushAutosave,
  requestAutosave
} from '../../gameStatePersistence.js';

const SLEEP_RECOVERY = Object.freeze({
  1: 6,
  2: 14,
  3: 21,
  4: 28,
  5: 35,
  6: 42,
  7: 49,
  8: 56
});

const SLEEP_HOURS = Object.freeze(
  Object.keys(SLEEP_RECOVERY).map(Number)
);

const COLORS = {
  wood: 0x21170f,
  dark: 0x110d09,
  brass: 0xb58a42,
  brassLight: 0xe5c47c,
  paper: 0xeee0bd,
  paperHover: 0xfff0c9,
  ink: '#33271b',
  muted: '#7a674c',
  cream: '#f3e7c9',
  green: 0x74ad78
};

function isValidSleepDuration(value) {
  return Number.isInteger(value) &&
    Object.hasOwn(SLEEP_RECOVERY, value);
}

export class HotelSleep {
  constructor(scene) {
    this.scene = scene;

    this.menu = null;
    this.menuBlocker = null;
    this.closingMenus = new Set();

    this.pendingHours = null;
    this.hollyResolving = false;
    this.sleepCompleted = false;
    this.ownsManualSleep = false;

    this.resumeHandler = null;
    this.fadeHandler = null;

    this.previewText = null;
    this.previewFill = null;
    this.previewBarWidth = 0;

    this.resizeHandler = () => {
      if (this.menu && this.scene.isSleepMenuOpen) {
        this.renderMenu();
      }
    };

    scene.scale.on('resize', this.resizeHandler);
  }

  isAlive() {
    return !this.scene._cleanupDone &&
      this.scene.sys.isActive();
  }

  getRecovery(hours) {
    const duration = Number(hours);

    if (!isValidSleepDuration(duration)) return 0;

    const energy = getEnergyManager();

    const configured = Number(
      this.scene.hotelConfig?.recoveryMultiplier ?? 1
    );

    const multiplier = Number.isFinite(configured) && configured > 0
      ? configured
      : 1;

    let amount = SLEEP_RECOVERY[duration] * multiplier;

    if (energy.difficulty === 'rookie') {
      amount *= 1.15;
    }

    return Math.ceil(amount);
  }

  getActualRecovery(hours) {
    const energy = getEnergyManager();

    const missing = Math.max(
      0,
      energy.getMaxEnergy() - energy.getCurrentEnergy()
    );

    return Math.min(missing, this.getRecovery(hours));
  }

  addText(container, x, y, text, {
    pixel = false,
    size = 18,
    color = COLORS.cream,
    width,
    originX = 0.5,
    originY = 0
  } = {}) {
    const style = {
      fontFamily: pixel ? 'PressStart2P' : 'SpecialElite',
      fontSize: `${size}px`,
      color,
      align: originX === 0 ? 'left' : 'center'
    };

    if (width) {
      style.wordWrap = { width };
    }

    const object = this.scene.add
      .text(x, y, text, style)
      .setOrigin(originX, originY);

    container.add(object);

    return object;
  }

  openMenu() {
    const scene = this.scene;

    if (
      scene.isHotelInteractionBlocked() ||
      !scene.hotelConfig ||
      this.menu ||
      this.closingMenus.size
    ) {
      return;
    }

    scene.isSleepMenuOpen = true;
    scene.hideHoverHint();
    scene.hotspotUI?.setLocked(true);

    this.menu = scene.add.container(0, 0).setDepth(400);

    this.renderMenu();

    this.menu.setAlpha(0);

    scene.createTrackedTween({
      targets: this.menu,
      alpha: 1,
      duration: 180,
      ease: 'Quad.Out'
    });
  }

  renderMenu() {
    if (!this.menu || !this.isAlive()) return;

    const scene = this.scene;
    const { width, height } = scene.scale;
    const portrait = width < 620 && height > width;

    this.menu.removeAll(true);
    this.clearPreviewReferences();

    this.menuBlocker = scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.78)
      .setOrigin(0)
      .setInteractive();

    this.menuBlocker.on('pointerdown', () => this.closeMenu());
    this.menu.add(this.menuBlocker);

    const panelW = portrait ? 430 : 840;
    const panelH = portrait ? 850 : 566;

    const scale = Math.max(
      0.01,
      Math.min(
        1,
        (width - 24) / panelW,
        (height - 24) / panelH
      )
    );

    const content = scene.add.container(
      (width - panelW * scale) / 2,
      (height - panelH * scale) / 2
    ).setScale(scale);

    this.menu.add(content);

    const shadow = scene.add
      .rectangle(7, 9, panelW, panelH, 0x000000, 0.5)
      .setOrigin(0);

    const panel = scene.add
      .rectangle(0, 0, panelW, panelH, COLORS.wood)
      .setOrigin(0)
      .setStrokeStyle(3, COLORS.brass)
      .setInteractive();

    panel.on('pointerdown', (_pointer, _x, _y, event) => {
      event?.stopPropagation();
    });

    const innerFrame = scene.add
      .rectangle(10, 10, panelW - 20, panelH - 20)
      .setOrigin(0)
      .setFillStyle(COLORS.wood, 0)
      .setStrokeStyle(1, COLORS.brass, 0.45);

    content.add([shadow, panel, innerFrame]);

    for (const x of [19, panelW - 19]) {
      for (const y of [19, panelH - 19]) {
        content.add(
          scene.add.circle(x, y, 3, COLORS.brassLight)
        );
      }
    }

    const plaqueW = portrait ? 310 : 430;

    content.add(
      scene.add
        .rectangle(
          panelW / 2,
          54,
          plaqueW,
          49,
          COLORS.dark
        )
        .setStrokeStyle(1, COLORS.brass)
    );

    this.addText(
      content,
      panelW / 2,
      47,
      'DO NOT DISTURB',
      {
        pixel: true,
        size: portrait ? 14 : 17,
        color: '#e5c47c'
      }
    );

    this.addText(
      content,
      panelW / 2,
      91,
      scene.hotelConfig.label,
      {
        size: 21,
        width: panelW - 80
      }
    );

    this.addText(
      content,
      panelW / 2,
      124,
      'Room paid. Rest is on the house.',
      {
        size: 17,
        color: '#c6b28b',
        width: panelW - 50
      }
    );

    this.addText(
      content,
      panelW / 2,
      161,
      'CHOOSE YOUR REST',
      {
        pixel: true,
        size: 12,
        color: '#e5c47c'
      }
    );

    const columns = portrait ? 2 : 4;
    const cardW = portrait ? 180 : 184;
    const cardH = 104;
    const gapX = 14;
    const gapY = 15;

    const gridW = columns * cardW + (columns - 1) * gapX;
    const startX = (panelW - gridW) / 2 + cardW / 2;
    const startY = 248;

    SLEEP_HOURS.forEach((hours, index) => {
      this.createOption(
        content,
        startX + (index % columns) * (cardW + gapX),
        startY + Math.floor(index / columns) * (cardH + gapY),
        hours,
        cardW,
        cardH
      );
    });

    const rows = Math.ceil(SLEEP_HOURS.length / columns);
    const gridBottom =
      startY +
      (rows - 1) * (cardH + gapY) +
      cardH / 2;

    const previewY = gridBottom + 22;

    content.add(
      scene.add
        .rectangle(
          26,
          previewY,
          panelW - 52,
          72,
          COLORS.dark
        )
        .setOrigin(0)
        .setStrokeStyle(1, COLORS.brass, 0.45)
    );

    this.previewText = this.addText(
      content,
      panelW / 2,
      previewY + 12,
      '',
      {
        size: 18,
        color: COLORS.cream,
        width: panelW - 72
      }
    );

    this.previewBarWidth = panelW - 100;

    content.add(
      scene.add
        .rectangle(
          50,
          previewY + 46,
          this.previewBarWidth,
          9,
          0x342c20
        )
        .setOrigin(0)
    );

    this.previewFill = scene.add
      .rectangle(
        50,
        previewY + 46,
        this.previewBarWidth,
        9,
        COLORS.green
      )
      .setOrigin(0);

    content.add(this.previewFill);

    this.updatePreview();

    this.addText(
      content,
      panelW / 2,
      previewY + 86,
      'The thief does not take a nap.',
      {
        size: 17,
        color: '#c6b28b',
        width: panelW - 50
      }
    );

    const close = this.addText(
      content,
      panelW - 27,
      25,
      'X',
      {
        pixel: true,
        size: 12,
        color: '#e5c47c',
        originY: 0.5
      }
    );

    close.setPadding(9);
    close.setInteractive({ useHandCursor: true });

    close.on('pointerdown', (_pointer, _x, _y, event) => {
      event?.stopPropagation();
      this.closeMenu();
    });
  }

  updatePreview(hours = null) {
    if (!this.previewText || !this.previewFill) return;

    const energy = getEnergyManager();
    const current = energy.getCurrentEnergy();
    const maximum = energy.getMaxEnergy();

    const recovery = hours === null
      ? 0
      : this.getActualRecovery(hours);

    const after = Math.min(maximum, current + recovery);

    this.previewText.setText(
      hours === null
        ? `ENERGY: ${current} / ${maximum}`
        : `${hours}h rest: ${current} -> ${after} / ${maximum}`
    );

    this.previewFill.setDisplaySize(
      this.previewBarWidth * Phaser.Math.Clamp(
        after / Math.max(1, maximum),
        0,
        1
      ),
      9
    );
  }

  createOption(container, x, y, hours, width = 184, height = 104) {
    const scene = this.scene;
    const potential = this.getRecovery(hours);
    const actual = this.getActualRecovery(hours);

    const shadow = scene.add
      .rectangle(x + 3, y + 4, width, height, 0x000000, 0.35);

    const button = scene.add
      .rectangle(x, y, width, height, COLORS.paper)
      .setStrokeStyle(1, COLORS.brass)
      .setInteractive({ useHandCursor: true });

    container.add([shadow, button]);

    this.addText(
      container,
      x,
      y - 35,
      `${hours} ${hours === 1 ? 'HOUR' : 'HOURS'}`,
      {
        pixel: true,
        size: 11,
        color: COLORS.ink
      }
    );

    this.addText(
      container,
      x,
      y - 7,
      `+${actual} ENERGY`,
      {
        size: 23,
        color: actual > 0 ? '#355638' : COLORS.muted
      }
    );

    this.addText(
      container,
      x,
      y + 24,
      actual < potential
        ? `Up to +${potential}; energy cap`
        : 'Click to sleep',
      {
        size: 14,
        color: COLORS.muted,
        width: width - 12
      }
    );

    button.on('pointerover', () => {
      button
        .setFillStyle(COLORS.paperHover)
        .setStrokeStyle(2, COLORS.brassLight);

      this.updatePreview(hours);
    });

    button.on('pointerout', () => {
      button
        .setFillStyle(COLORS.paper)
        .setStrokeStyle(1, COLORS.brass);

      this.updatePreview();
    });

    button.on('pointerdown', (_pointer, _x, _y, event) => {
      event?.stopPropagation();

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
  }

  clearPreviewReferences() {
    this.previewText = null;
    this.previewFill = null;
    this.previewBarWidth = 0;
  }

  closeMenu() {
    const scene = this.scene;

    if (!scene.isSleepMenuOpen || !this.menu) return;

    const menu = this.menu;

    scene.isSleepMenuOpen = false;

    this.menu = null;
    this.menuBlocker = null;
    this.clearPreviewReferences();

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
    this.clearPreviewReferences();
  }

  doSleep(hours) {
    const duration = Number(hours);
    const scene = this.scene;

    if (
      !isValidSleepDuration(duration) ||
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
      const opened = await scene.launchOverlay(
        'HollyIntroScene',
        {
          returnScene: 'HotelScene',
          returnData: { sleepHours: hours }
        }
      );

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

    const pending = Number(this.pendingHours);

    const requested = Number(
      payload.sleepHours ?? this.pendingHours ?? 8
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

    const sleepHours = Number(hours ?? this.pendingHours ?? 8);

    if (!isValidSleepDuration(sleepHours)) return;

    const energy = getEnergyManager();
    const recovery = this.getRecovery(sleepHours);

    try {
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
      const moved = await scene.goto(
        scene.returnScene,
        {
          ...scene.returnData,
          wokeUp: true,
          sleptHours: hours
        }
      );

      if (!moved) scene.restoreAfterFailedExit();
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
    this.scene.scale.off('resize', this.resizeHandler);

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