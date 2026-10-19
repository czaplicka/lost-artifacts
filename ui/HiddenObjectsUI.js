import { hintManager } from '../managers/HintManager.js';
import { getEnergyManager } from '../managers/EnergyManager.js';
import { EventBus } from '../EventBus.js';
import { saveGameState } from '../gameStatePersistence.js';

const HINT_OPTIONS = {
  cut_corners: {
    label: 'CUT CORNERS',
    description:
      'Skip the evidence-handling checklist.\n' +
      'Faster now. Awkward in court.',
    energy: 5,
    minutes: 10,
    moralLabel: 'Procedural misconduct'
  },

  squad_help: {
    label: 'ASK SQUAD FOR HELP',
    description:
      'Request a documented second sweep.\n' +
      'More eyes. More paperwork.',
    energy: 10,
    minutes: 30,
    moralLabel: 'Documented assistance'
  }
};

export class HiddenObjectsUI {
  constructor(scene) {
    this.scene = scene;

    this.timerText = null;
    this.scoreText = null;
    this.missesText = null;
    this.listText = null;
    this.messageText = null;
    this.backBtn = null;
    this.hintBtn = null;

    this.resultOverlay = null;
    this.resultContainer = null;

    this.hintModal = null;
    this.hintModalMessage = null;
    this.hintMarker = null;
    this.hintMarkerTimer = null;

    this.hintModalOpen = false;
    this.hintBusy = false;
    this.isReturningToCity = false;
    this.destroyed = false;

    this.lockState = null;
    this.sleepWaitEvent = null;
    this.ownedObjects = [];

    this.boundRefreshHintButton =
      this.refreshHintButton.bind(this);

    this.boundDestroy = this.destroy.bind(this);
  }

  own(object) {
    this.ownedObjects.push(object);
    return object;
  }

  createSidebarUI() {
    this.destroyed = false;
    this.isReturningToCity = false;

    const { width, height } = this.scene.scale;
    const sidebarWidth = this.scene.sidebarWidth;

    this.own(
      this.scene.add
        .rectangle(
          0, 0, sidebarWidth, height,
          0x111111, 0.94
        )
        .setOrigin(0, 0)
        .setDepth(1000)
    );

    this.own(
      this.scene.add
        .rectangle(
          18, 18,
          sidebarWidth - 36,
          height - 36,
          0x1b1b1f,
          0.96
        )
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0xc8a75a, 0.45)
        .setDepth(1000)
    );

    this.own(
      this.scene.add
        .text(34, 34, this.scene.title, {
          fontFamily: 'SpecialElite, Arial',
          fontSize: '26px',
          color: '#ffffff',
          wordWrap: {
            width: sidebarWidth - 90
          }
        })
        .setDepth(1001)
    );

    this.timerText = this.own(
      this.scene.add
        .text(
          34,
          88,
          `Time: ${this.scene.formatTime(this.scene.timeLeft)}`,
          {
            fontFamily: 'Arial',
            fontSize: '22px',
            color: '#ffd966'
          }
        )
        .setDepth(1001)
    );

    this.scoreText = this.own(
      this.scene.add
        .text(220, 88, `Score: ${this.scene.score}`, {
          fontFamily: 'Arial',
          fontSize: '22px',
          color: '#7CFC00'
        })
        .setDepth(1001)
    );

    this.missesText = this.own(
      this.scene.add
        .text(
          34,
          114,
          `Misses: ${this.scene.incorrectClicks}`,
          {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ff8a8a'
          }
        )
        .setDepth(1001)
    );

    this.own(
      this.scene.add
        .text(34, 142, 'Find these objects:', {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: '#ffffff',
          fontStyle: 'bold'
        })
        .setDepth(1001)
    );

    this.listText = this.own(
      this.scene.add
        .text(34, 170, this.buildListText(), {
          fontFamily: 'Arial',
          fontSize: '18px',
          color: '#f2f2f2',
          lineSpacing: 8,
          wordWrap: {
            width: sidebarWidth - 68
          }
        })
        .setDepth(1001)
    );

    this.hintBtn = this.own(
      this.scene.add
        .text(34, 0, 'HINT', {
          fontFamily: 'PressStart2P, Arial',
          fontSize: '14px',
          color: '#fff2c4',
          backgroundColor: '#604b29',
          padding: {
            left: 18,
            right: 18,
            top: 16,
            bottom: 16
          }
        })
        .setInteractive({ useHandCursor: true })
        .setDepth(1001)
    );

    this.hintBtn.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
        this.openHintModal();
      }
    );

    this.hintBtn.on('pointerover', () => {
      if (!this.hintBusy && !this.hintModalOpen) {
        this.hintBtn.setBackgroundColor('#806338');
      }
    });

    this.hintBtn.on('pointerout', () => {
      this.hintBtn?.setBackgroundColor('#604b29');
    });

    this.messageText = this.own(
      this.scene.add
        .text(34, height - 170, '', {
          fontFamily: 'Arial',
          fontSize: '18px',
          color: '#ffd966',
          wordWrap: {
            width: sidebarWidth - 68
          },
          lineSpacing: 6
        })
        .setDepth(1001)
    );

    this.positionHintButton();
    this.createBackButton(width);
    this.refreshHintButton();

    EventBus.on(
      'hints:changed',
      this.boundRefreshHintButton
    );

    this.scene.events.once(
      'shutdown',
      this.boundDestroy
    );
  }

  createBackButton(width) {
    if (this.scene.textures.exists('back')) {
      this.backBtn = this.own(
        this.scene.add
          .image(width - 125, 46, 'back')
          .setDisplaySize(190, 60)
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .setDepth(1001)
      );
    } else {
      this.backBtn = this.own(
        this.scene.add
          .text(width - 125, 46, 'RETURN TO CITY', {
            fontFamily: 'PressStart2P, Arial',
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: '#222222',
            padding: {
              left: 16,
              right: 16,
              top: 12,
              bottom: 12
            }
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .setDepth(1001)
      );
    }

    const baseScaleX = this.backBtn.scaleX;
    const baseScaleY = this.backBtn.scaleY;

    const animate = (factor) => {
      if (!this.backBtn?.active) {
        return;
      }

      this.scene.tweens.killTweensOf(this.backBtn);

      this.scene.tweens.add({
        targets: this.backBtn,
        scaleX: baseScaleX * factor,
        scaleY: baseScaleY * factor,
        duration: 100,
        ease: 'Power1'
      });
    };

    this.backBtn.on('pointerover', () => animate(1.05));
    this.backBtn.on('pointerout', () => animate(1));

    this.backBtn.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();

        if (
          this.isReturningToCity ||
          this.hintModalOpen ||
          this.hintBusy
        ) {
          return;
        }

        this.isReturningToCity = true;

        this.scene.tweens.killTweensOf(this.backBtn);
        this.backBtn.disableInteractive();

        this.scene.abandonGame();
      }
    );
  }

  positionHintButton() {
    if (!this.hintBtn || !this.listText) {
      return;
    }

    this.hintBtn.setY(
      this.listText.y + this.listText.height + 24
    );

    if (this.messageText) {
      this.messageText.setY(
        Math.max(
          this.scene.scale.height - 170,
          this.hintBtn.y + this.hintBtn.height + 20
        )
      );
    }
  }

  buildListText() {
    return this.scene.activeItems
      .map((item) => {
        const found = this.scene.foundItems.has(item.id);
        return `${found ? '✓' : '•'} ${item.item}`;
      })
      .join('\n');
  }

  refreshList() {
    this.listText?.setText(this.buildListText());
    this.positionHintButton();

    if (
      this.hintMarker &&
      this.scene.foundItems.has(this.hintMarker.itemId)
    ) {
      this.clearHintMarker();
    }
  }

  refreshHintButton(summary = null) {
    if (!this.hintBtn?.active || this.destroyed) {
      return;
    }

    const count =
      summary?.available ??
      hintManager.getAvailableCount();

    this.hintBtn.setText(`HINT (${count})`);
  }

  updateTimer(timeLeft) {
    this.timerText?.setText(
      `Time: ${this.scene.formatTime(timeLeft)}`
    );
  }

  updateScoreAndMisses(score, misses) {
    this.scoreText?.setText(`Score: ${score}`);
    this.missesText?.setText(`Misses: ${misses}`);
  }

  showMessage(text, color = '#ffd966') {
    if (!this.messageText?.active) {
      return;
    }

    this.scene.tweens.killTweensOf(this.messageText);

    this.messageText
      .setText(text)
      .setColor(color)
      .setAlpha(1);

    this.scene.tweens.add({
      targets: this.messageText,
      alpha: 0,
      duration: 2200,
      delay: 1000,
      ease: 'Linear'
    });
  }

  canUseHints() {
    return (
      !this.destroyed &&
      !this.scene._cleanupDone &&
      !this.scene.isSceneFinished &&
      !this.scene.isReturning &&
      !this.scene.isShuttingDownHiddenObjects &&
      !this.isReturningToCity
    );
  }

  getRemainingZones() {
    return this.scene.hiddenZones.filter((zone) => {
      const id = zone?.getData?.('id');

      return (
        zone?.active &&
        id &&
        !zone.getData('found') &&
        !this.scene.foundItems.has(id)
      );
    });
  }

  lockGameplay() {
    if (this.lockState) {
      return;
    }

    const timer = this.scene.timerEvent;

    const objects = [
      ...this.scene.hiddenZones,
      this.backBtn,
      this.hintBtn
    ].filter((object) => object?.active && object.input);

    this.lockState = {
      timer,
      timerWasPaused: timer?.paused ?? false,
      topOnly: this.scene.input.topOnly,
      objects: objects.map((object) => ({
        object,
        enabled: object.input.enabled
      }))
    };

    if (timer) {
      timer.paused = true;
    }

    for (const entry of this.lockState.objects) {
      entry.object.input.enabled = false;
    }

    this.scene.input.setTopOnly(true);
  }

  unlockGameplay() {
    const state = this.lockState;
    this.lockState = null;

    if (!state) {
      return;
    }

    if (
      this.scene.input &&
      typeof state.topOnly === 'boolean'
    ) {
      this.scene.input.setTopOnly(state.topOnly);
    }

    if (!this.canUseHints()) {
      return;
    }

    if (
      state.timer &&
      this.scene.timerEvent === state.timer
    ) {
      state.timer.paused = state.timerWasPaused;
    }

    for (const entry of state.objects) {
      if (entry.object?.active && entry.object.input) {
        entry.object.input.enabled = entry.enabled;
      }
    }
  }

  openHintModal() {
    if (
      !this.canUseHints() ||
      this.hintModalOpen ||
      this.hintBusy
    ) {
      return;
    }

    const energyManager =
      this.scene.energyManager || getEnergyManager();

    if (
      energyManager.isForcedSleepActive() ||
      energyManager.isManualSleepActive()
    ) {
      this.showMessage(
        'Even excellent eyesight requires being awake.',
        '#ffb3b3'
      );

      return;
    }

    if (!this.getRemainingZones().length) {
      this.showMessage('Nothing left to find.');
      return;
    }

    this.lockGameplay();
    this.hintModalOpen = true;

    const { width, height } = this.scene.scale;
    const panelWidth = Math.min(700, width - 32);
    const panelHeight = 590;

    this.hintModal = this.scene.add
      .container(width / 2, height / 2)
      .setDepth(2500);

    const blocker = this.scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.78)
      .setInteractive();

    blocker.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
      }
    );

    const panel = this.scene.add
      .rectangle(
        0, 0,
        panelWidth, panelHeight,
        0x1c1915, 1
      )
      .setStrokeStyle(2, 0xc8a75a, 0.95);

    const title = this.scene.add
      .text(0, -250, 'A LITTLE HELP?', {
        fontFamily: 'SpecialElite, Arial',
        fontSize: '32px',
        color: '#f8e7b9',
        align: 'center'
      })
      .setOrigin(0.5);

    const available = hintManager.getAvailableCount();

    const subtitle = this.scene.add
      .text(
        0,
        -205,
        `Free hints available: ${available}`,
        {
          fontFamily: 'SpecialElite, Arial',
          fontSize: '20px',
          color: '#ded6c3'
        }
      )
      .setOrigin(0.5);

    this.hintModal.add([
      blocker,
      panel,
      title,
      subtitle
    ]);

    this.addHintOption({
      y: -140,
      width: panelWidth - 56,
      label: 'USE FREE HINT',
      details: 'One hint from your personal supply.',
      enabled: available > 0,
      callback: () => this.applyHint('free_hint')
    });

    for (const [index, method] of [
      'cut_corners',
      'squad_help'
    ].entries()) {
      const option = HINT_OPTIONS[method];

      const affordability =
        energyManager.canAfford(option.energy);

      this.addHintOption({
        y: -35 + index * 105,
        width: panelWidth - 56,
        label: option.label,
        details:
          `${option.description}\n` +
          `${option.energy} energy · ` +
          `${option.minutes} min · ` +
          option.moralLabel +
          (affordability.ok ? '' : ' · Not enough energy'),
        enabled: affordability.ok,
        callback: () => this.applyHint(method)
      });
    }

    this.hintModalMessage = this.scene.add
      .text(0, 158, '', {
        fontFamily: 'SpecialElite, Arial',
        fontSize: '17px',
        color: '#ffb3b3',
        align: 'center',
        wordWrap: {
          width: panelWidth - 70
        }
      })
      .setOrigin(0.5);

    this.hintModal.add(this.hintModalMessage);

    const cancel = this.scene.add
      .text(0, 240, 'KEEP LOOKING', {
        fontFamily: 'PressStart2P, Arial',
        fontSize: '12px',
        color: '#f8e7b9',
        backgroundColor: '#39332a',
        padding: {
          left: 20,
          right: 20,
          top: 16,
          bottom: 16
        }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    cancel.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();

        if (!this.hintBusy) {
          this.closeHintModal();
        }
      }
    );

    this.hintModal.add(cancel);

    const modalScale = Math.min(
      1,
      (height - 24) / panelHeight
    );

    // Tło pozostaje na cały ekran również przy skalowaniu panelu.
    blocker.setSize(
      width / modalScale,
      height / modalScale
    );

    this.hintModal.setScale(modalScale);
  }

  addHintOption({
    y,
    width,
    label,
    details,
    enabled,
    callback
  }) {
    const background = this.scene.add
      .rectangle(
        0, y, width, 92,
        enabled ? 0x493b27 : 0x292722,
        1
      )
      .setStrokeStyle(
        1,
        enabled ? 0xc8a75a : 0x666052,
        0.8
      )
      .setInteractive({
        useHandCursor: enabled
      });

    const heading = this.scene.add
      .text(0, y - 26, label, {
        fontFamily: 'PressStart2P, Arial',
        fontSize: '11px',
        color: enabled ? '#fff2c4' : '#918b7c'
      })
      .setOrigin(0.5);

    const body = this.scene.add
      .text(0, y + 13, details, {
        fontFamily: 'SpecialElite, Arial',
        fontSize: '16px',
        color: enabled ? '#e4ddcf' : '#918b7c',
        align: 'center',
        wordWrap: {
          width: width - 24
        },
        lineSpacing: 2
      })
      .setOrigin(0.5);

    background.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();

        if (
          enabled &&
          !this.hintBusy &&
          this.canUseHints()
        ) {
          callback();
        }
      }
    );

    background.on('pointerover', () => {
      if (enabled && !this.hintBusy) {
        background.setFillStyle(0x665032);
      }
    });

    background.on('pointerout', () => {
      background.setFillStyle(
        enabled ? 0x493b27 : 0x292722
      );
    });

    this.hintModal.add([
      background,
      heading,
      body
    ]);
  }

  applyHint(method) {
    if (
      !this.hintModalOpen ||
      this.hintBusy ||
      !this.canUseHints()
    ) {
      return;
    }

    const zones = this.getRemainingZones();

    if (!zones.length) {
      this.closeHintModal();
      return;
    }

    this.hintBusy = true;

    const target = zones[
      Math.floor(Math.random() * zones.length)
    ];

    const context = {
      sceneId: this.scene.sceneId,
      itemId: target.getData('id')
    };

    const energyManager =
      this.scene.energyManager || getEnergyManager();

    let result;

    if (method === 'free_hint') {
      result = hintManager.useFreeHint(context);
    } else {
      const option = HINT_OPTIONS[method];

      if (!option) {
        this.failHint('Unknown hint option.');
        return;
      }

      const affordability =
        energyManager.canAfford(option.energy);

      if (!affordability.ok) {
        this.failHint(
          energyManager.getInsufficientEnergyMessage(
            option.energy
          )
        );

        return;
      }

      const payment = energyManager.consumeCustom(
        option.energy,
        `Hidden-object hint (${method}): -${option.energy}`,
        {
          requireFullAmount: true,
          activityType: 'hidden_object_hint'
        }
      );

      if (!payment.success) {
        this.failHint(
          payment.message ||
          'Unable to pay for this hint.'
        );

        return;
      }

      result = hintManager.recordPaidHint(
        method,
        context,
        {
          energy: option.energy,
          minutes: option.minutes,
          cash: 0
        }
      );

      EventBus.emit(
        'advanceTime',
        0,
        option.minutes
      );

      // Zapis również po przesunięciu zegara.
      saveGameState();
    }

    if (!result?.success) {
      this.failHint(
        'No free hints left. Choose another option.'
      );

      return;
    }

    this.removeHintModal();

    if (!this.canUseHints()) {
      this.hintBusy = false;
      this.unlockGameplay();
      return;
    }

    const finishHint = () => {
      this.sleepWaitEvent = null;

      if (!this.canUseHints()) {
        this.hintBusy = false;
        this.unlockGameplay();
        return;
      }

      this.hintBusy = false;
      this.unlockGameplay();
      this.highlightZone(target);

      this.showMessage(
        'Your eyes may want to investigate that glow.',
        '#f8e7b9'
      );

      if (result.saved === false) {
        this.showMessage(
          'Hint used, but autosave failed. ' +
          'Progress may not survive reloading.',
          '#ffb3b3'
        );
      }
    };

    // Jeżeli koszt wyzerował energię, czekamy na koniec snu.
    if (energyManager.isForcedSleepActive()) {
      this.sleepWaitEvent = this.scene.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
          if (!this.canUseHints()) {
            this.sleepWaitEvent?.remove(false);
            this.sleepWaitEvent = null;
            this.hintBusy = false;
            this.unlockGameplay();
            return;
          }

          if (!energyManager.isForcedSleepActive()) {
            this.sleepWaitEvent?.remove(false);
            finishHint();
          }
        }
      });
    } else {
      finishHint();
    }
  }

  failHint(message) {
    this.hintBusy = false;
    this.hintModalMessage?.setText(message);
  }

  removeHintModal() {
    this.hintModal?.destroy();
    this.hintModal = null;
    this.hintModalMessage = null;
    this.hintModalOpen = false;
  }

  closeHintModal() {
    this.removeHintModal();
    this.hintBusy = false;
    this.unlockGameplay();
    this.refreshHintButton();
  }

  highlightZone(zone) {
    this.clearHintMarker();

    if (
      !zone?.active ||
      zone.getData('found') ||
      !this.canUseHints()
    ) {
      return;
    }

    const marker = this.scene.add
      .rectangle(
        zone.x,
        zone.y,
        zone.width + 20,
        zone.height + 20,
        0xffd966,
        0.12
      )
      .setStrokeStyle(3, 0xffd966, 1)
      .setDepth(900);

    marker.itemId = zone.getData('id');
    this.hintMarker = marker;

    this.scene.tweens.add({
      targets: marker,
      alpha: 0.25,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 450,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    this.hintMarkerTimer = this.scene.time.delayedCall(
      3600,
      () => this.clearHintMarker()
    );
  }

  clearHintMarker() {
    this.hintMarkerTimer?.remove(false);
    this.hintMarkerTimer = null;

    if (this.hintMarker) {
      this.scene.tweens.killTweensOf(this.hintMarker);
      this.hintMarker.destroy();
      this.hintMarker = null;
    }
  }

  showSuccessOverlay() {
    this.showResultOverlay(true);
  }

  showFailureOverlay() {
    this.showResultOverlay(false);
  }

  showResultOverlay(success) {
    this.closeHintModal();
    this.clearHintMarker();

    this.hintBtn?.disableInteractive();

    this.resultOverlay?.destroy();
    this.resultContainer?.destroy();

    const { width, height } = this.scene.scale;

    const panelWidth = success ? 700 : 680;
    const panelHeight = success ? 420 : 340;

    const centerX =
      this.scene.sidebarWidth +
      (width - this.scene.sidebarWidth) / 2;

    const centerY = height / 2;
    const finalScore = this.scene.score;

    this.resultOverlay = this.scene.add
      .rectangle(
        0, 0, width, height,
        0x000000, success ? 0.72 : 0.68
      )
      .setOrigin(0, 0)
      .setDepth(3000)
      .setAlpha(0)
      .setInteractive();

    this.resultOverlay.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
      }
    );

    this.resultContainer = this.scene.add
      .container(centerX, centerY)
      .setDepth(3001)
      .setAlpha(0);

    const panel = this.scene.add
      .rectangle(
        0, 0,
        panelWidth, panelHeight,
        success ? 0x181511 : 0x1c1212,
        0.98
      )
      .setStrokeStyle(
        3,
        success ? 0xd4af37 : 0xa44a4a,
        0.95
      );

    const title = this.scene.add
      .text(
        0,
        success ? -155 : -95,
        success
          ? 'Crime Scene Complete'
          : 'Crime Scene Lost',
        {
          fontFamily: 'SpecialElite, Arial',
          fontSize: success ? '38px' : '36px',
          color: success ? '#f8e7b9' : '#ffb3b3',
          align: 'center'
        }
      )
      .setOrigin(0.5);

    this.resultContainer.add([panel, title]);

    if (success) {
      const subtitle = this.scene.add
        .text(
          0,
          -104,
          'The forensic sweep is finished.',
          {
            fontFamily: 'SpecialElite, Arial',
            fontSize: '22px',
            color: '#f2f2f2',
            align: 'center'
          }
        )
        .setOrigin(0.5);

      const stats = this.scene.add
        .text(
          0,
          -5,
          [
            `Objects found: ${this.scene.foundItems.size}/${this.scene.activeItems.length}`,
            `Misses: ${this.scene.incorrectClicks}`,
            `Time left: ${this.scene.formatTime(this.scene.timeLeft)}`,
            `Time bonus: +${this.scene.timeLeft * 2}`,
            `Final score: ${finalScore}`
          ].join('\n'),
          {
            fontFamily: 'SpecialElite, Arial',
            fontSize: '24px',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 10
          }
        )
        .setOrigin(0.5);

      const note = this.scene.add
        .text(
          0,
          112,
          'Evidence logged. Return to the city ' +
          'and continue the investigation.',
          {
            fontFamily: 'SpecialElite, Arial',
            fontSize: '19px',
            color: '#d8d8d8',
            align: 'center',
            wordWrap: {
              width: panelWidth - 100
            }
          }
        )
        .setOrigin(0.5);

      this.resultContainer.add([
        subtitle,
        stats,
        note
      ]);
    } else {
      const body = this.scene.add
        .text(
          0,
          -10,
          [
            'You ran out of time before the scene was fully processed.',
            '',
            `Objects found: ${this.scene.foundItems.size}/${this.scene.activeItems.length}`,
            `Misses: ${this.scene.incorrectClicks}`,
            `Score: ${finalScore}`
          ].join('\n'),
          {
            fontFamily: 'SpecialElite, Arial',
            fontSize: '22px',
            color: '#f4f4f4',
            align: 'center',
            lineSpacing: 8,
            wordWrap: {
              width: panelWidth - 100
            }
          }
        )
        .setOrigin(0.5);

      this.resultContainer.add(body);
    }

    const buttonY = success ? 175 : 112;

    const button = this.scene.add
      .rectangle(
        0,
        buttonY,
        success ? 430 : 410,
        success ? 64 : 62,
        success ? 0x8b6b2f : 0x6b2a2a,
        1
      )
      .setStrokeStyle(
        3,
        success ? 0xf0d48a : 0xd88b8b,
        0.95
      )
      .setInteractive({ useHandCursor: true });

    const label = this.scene.add
      .text(0, buttonY, 'RETURN TO CRIME CITY', {
        fontFamily: 'PressStart2P, Arial',
        fontSize: '14px',
        color: success ? '#fff7dc' : '#fff1f1'
      })
      .setOrigin(0.5);

    let returning = false;

    button.on('pointerover', () => {
      button.setFillStyle(
        success ? 0xa07a34 : 0x823333
      );
    });

    button.on('pointerout', () => {
      button.setFillStyle(
        success ? 0x8b6b2f : 0x6b2a2a
      );
    });

    button.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();

        if (returning) {
          return;
        }

        returning = true;
        button.disableInteractive();

        if (success) {
          this.scene.playSfx('correct', {
            volume: 0.35
          });
        }

        this.scene.restoreSourceScene();

        this.scene.returnToSafeScene({
          ...this.scene.returnData,
          hiddenObjectsSuccess: success,
          hiddenObjectsScore: finalScore,
          incorrectClicks: this.scene.incorrectClicks,
          foundItems: Array.from(this.scene.foundItems),
          sceneId: this.scene.sceneId
        });
      }
    );

    this.resultContainer.add([button, label]);

    this.scene.tweens.add({
      targets: this.resultOverlay,
      alpha: 1,
      duration: success ? 250 : 220,
      ease: 'Power2'
    });

    this.scene.tweens.add({
      targets: this.resultContainer,
      alpha: 1,
      y: centerY - 8,
      duration: success ? 320 : 280,
      ease: 'Back.Out'
    });
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;

    EventBus.off(
      'hints:changed',
      this.boundRefreshHintButton
    );

    this.scene.events.off(
      'shutdown',
      this.boundDestroy
    );

    this.sleepWaitEvent?.remove(false);
    this.sleepWaitEvent = null;

    this.removeHintModal();
    this.clearHintMarker();
    this.unlockGameplay();

    this.hintBusy = false;

    for (const object of this.ownedObjects) {
      if (object?.active) {
        this.scene.tweens.killTweensOf(object);
        object.destroy();
      }
    }

    this.ownedObjects = [];

    this.resultOverlay?.destroy();
    this.resultContainer?.destroy();

    this.resultOverlay = null;
    this.resultContainer = null;

    this.timerText = null;
    this.scoreText = null;
    this.missesText = null;
    this.listText = null;
    this.messageText = null;
    this.backBtn = null;
    this.hintBtn = null;
  }
}