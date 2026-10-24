export class HiddenObjectsResultOverlay {
  constructor(scene) {
    this.scene = scene;

    this.resultOverlay = null;
    this.resultContainer = null;
    this.autoReturnEvent = null;

    this.isReturning = false;
    this.version = 0;

    this.returnButton = null;
    this.returnButtonText = null;
    this.statusText = null;
  }

  canUseOverlay(version = this.version) {
    const scene = this.scene;

    return Boolean(
      version === this.version &&
      !scene._cleanupDone &&
      !scene.isShuttingDownHiddenObjects &&
      scene.sys?.isActive() &&
      this.resultContainer?.active
    );
  }

  showSuccessOverlay() {
    this.showResult(true);
  }

  showFailureOverlay() {
    this.showResult(false);
  }

  showResult(success) {
    this.destroy();

    const scene = this.scene;

    if (
      scene._cleanupDone ||
      scene.isShuttingDownHiddenObjects
    ) {
      return;
    }

    this.isReturning = false;

    const version = this.version;
    const { width, height } = scene.scale;

    const availableWidth = Math.max(
      1,
      width - scene.sidebarWidth
    );

    const panelWidth = 700;
    const panelHeight = 490;

    const centerX =
      scene.sidebarWidth + availableWidth / 2;

    const centerY = height / 2;

    const panelScale = Math.min(
      1,
      Math.max(1, availableWidth - 24) / panelWidth,
      Math.max(1, height - 24) / panelHeight
    );

    const finalScore = scene.score;
    const timeBonus = scene.timeLeft * 2;

    const borderColor = success ? 0xd4af37 : 0xa44a4a;
    const panelColor = success ? 0x181511 : 0x1c1212;

    const buttonColor = success ? 0x8b6b2f : 0x6b2a2a;
    const buttonHoverColor = success ? 0xa07a34 : 0x823333;

    this.resultOverlay = scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.72)
      .setOrigin(0)
      .setDepth(3000)
      .setAlpha(0)
      .setInteractive();

    this.resultContainer = scene.add
      .container(centerX, centerY)
      .setDepth(3001)
      .setScale(panelScale)
      .setAlpha(0);

    const panel = scene.add
      .rectangle(
        0,
        0,
        panelWidth,
        panelHeight,
        panelColor,
        0.98
      )
      .setStrokeStyle(3, borderColor, 0.95);

    const title = scene.add
      .text(
        0,
        -190,
        success
          ? 'Crime Scene Complete'
          : 'Crime Scene Lost',
        {
          fontFamily: 'SpecialElite',
          fontSize: '36px',
          color: success ? '#f8e7b9' : '#ffb3b3',
          align: 'center'
        }
      )
      .setOrigin(0.5);

    const subtitle = scene.add
      .text(
        0,
        -140,
        success
          ? 'The forensic sweep is finished.'
          : 'Time ran out before the search was complete.',
        {
          fontFamily: 'SpecialElite',
          fontSize: '22px',
          color: '#f2f2f2',
          align: 'center',
          wordWrap: { width: panelWidth - 80 }
        }
      )
      .setOrigin(0.5);

    const statLines = [
      `Objects found: ${scene.foundItems.size}/${scene.activeItems.length}`,
      `Misses: ${scene.incorrectClicks}`,
      `Time left: ${scene.formatTime(scene.timeLeft)}`
    ];

    if (success) {
      statLines.push(`Time bonus: +${timeBonus}`);
    }

    statLines.push(`Final score: ${finalScore}`);

    const stats = scene.add
      .text(0, -25, statLines.join('\n'), {
        fontFamily: 'SpecialElite',
        fontSize: '25px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 8
      })
      .setOrigin(0.5);

    const note = scene.add
      .text(
        0,
        90,
        success
          ? 'Evidence logged. Return to the city and continue the investigation.'
          : 'The evidence trail went cold. Return to the city to continue.',
        {
          fontFamily: 'SpecialElite',
          fontSize: '20px',
          color: '#d8d8d8',
          align: 'center',
          wordWrap: { width: panelWidth - 80 }
        }
      )
      .setOrigin(0.5);

    this.statusText = scene.add
      .text(
        0,
        145,
        success
          ? ''
          : 'Returning to the city in 3 seconds...',
        {
          fontFamily: 'SpecialElite',
          fontSize: '18px',
          color: '#f1d9a1',
          align: 'center',
          wordWrap: { width: panelWidth - 60 }
        }
      )
      .setOrigin(0.5);

    this.returnButton = scene.add
      .rectangle(0, 200, 290, 54, buttonColor, 1)
      .setStrokeStyle(2, borderColor, 0.95)
      .setInteractive({ useHandCursor: true });

    this.returnButtonText = scene.add
      .text(
        0,
        200,
        success ? 'Continue' : 'Return now',
        {
          fontFamily: 'PressStart2P',
          fontSize: '15px',
          color: '#fff7dc'
        }
      )
      .setOrigin(0.5);

    const button = this.returnButton;

    button.on('pointerover', () => {
      if (
        this.canUseOverlay(version) &&
        !this.isReturning
      ) {
        button.setFillStyle(buttonHoverColor, 1);
      }
    });

    button.on('pointerout', () => {
      if (button.active) {
        button.setFillStyle(buttonColor, 1);
      }
    });

    button.on('pointerdown', (pointer) => {
      if (
        pointer?.event?.button !== undefined &&
        pointer.event.button !== 0
      ) {
        return;
      }

      if (
        !this.canUseOverlay(version) ||
        this.isReturning
      ) {
        return;
      }

      if (success) {
        scene.playSfx('correct', { volume: 0.35 });
      }

      void this.returnToCity(
        success,
        finalScore,
        !success
      );
    });

    this.resultContainer.add([
      panel,
      title,
      subtitle,
      stats,
      note,
      this.statusText,
      this.returnButton,
      this.returnButtonText
    ]);

    this.animateIn(centerY, success ? 320 : 280);

    if (!success) {
      this.autoReturnEvent = scene.time.delayedCall(
        3000,
        () => {
          if (!this.canUseOverlay(version)) return;

          this.autoReturnEvent = null;

          void this.returnToCity(
            false,
            finalScore,
            true
          );
        }
      );
    }
  }

  animateIn(centerY, duration) {
    if (!this.canUseOverlay()) return;

    this.scene.createTrackedTween({
      targets: this.resultOverlay,
      alpha: 1,
      duration: 220,
      ease: 'Power2'
    });

    this.scene.createTrackedTween({
      targets: this.resultContainer,
      alpha: 1,
      y: centerY - 8,
      duration,
      ease: 'Back.Out'
    });
  }

  setReturnBusy(busy) {
    if (this.returnButton?.active) {
      this.returnButton.setAlpha(busy ? 0.55 : 1);

      if (this.returnButton.input) {
        this.returnButton.input.enabled = !busy;
      }
    }

    if (this.returnButtonText?.active) {
      this.returnButtonText.setText(
        busy ? 'Returning...' : 'Try again'
      );
    }
  }

  async returnToCity(success, score, timedOut = false) {
    if (
      !this.canUseOverlay() ||
      this.isReturning ||
      this.scene.isReturning
    ) {
      return false;
    }

    const version = this.version;
    const scene = this.scene;

    this.isReturning = true;
    this.stopAutoReturn();
    this.setReturnBusy(true);

    this.statusText?.setText('Opening the city map...');

    const showSuspectTutorial = Boolean(
      success &&
      scene.returnScene === 'CrimeCityScene'
    );

    try {
      const moved = await scene.returnToSafeScene({
        ...scene.returnData,
        hiddenObjectsSuccess: success,
        hiddenObjectsTimedOut: timedOut,
        hiddenObjectsScore: score,
        incorrectClicks: scene.incorrectClicks,
        foundItems: Array.from(scene.foundItems),
        sceneId: scene.sceneId,
        showSuspectTutorial
      });

      if (!this.canUseOverlay(version)) {
        return Boolean(moved);
      }

      if (!moved) {
        this.recoverReturn(
          'The city map could not be opened. Please try again.'
        );
        return false;
      }

      return true;
    } catch (error) {
      if (this.canUseOverlay(version)) {
        console.error(
          '[HiddenObjectsResultOverlay] Return failed:',
          error
        );

        this.recoverReturn(
          'The city map could not be opened. Please try again.'
        );
      }

      return false;
    }
  }

  recoverReturn(message) {
    this.isReturning = false;

    // SceneFlow ustawia tę blokadę przed wywołaniem goto().
    this.scene.isReturning = false;

    this.setReturnBusy(false);

    if (this.statusText?.active) {
      this.statusText.setText(message);
    }
  }

  stopAutoReturn() {
    this.autoReturnEvent?.remove(false);
    this.autoReturnEvent = null;
  }

  destroy() {
    this.version += 1;
    this.stopAutoReturn();

    const scene = this.scene;
    const container = this.resultContainer;
    const overlay = this.resultOverlay;

    this.resultContainer = null;
    this.resultOverlay = null;
    this.returnButton = null;
    this.returnButtonText = null;
    this.statusText = null;
    this.isReturning = false;

    if (container) {
      scene.killTrackedTweensOf(container);
      container.destroy(true);
    }

    if (overlay) {
      scene.killTrackedTweensOf(overlay);
      overlay.destroy();
    }
  }
}