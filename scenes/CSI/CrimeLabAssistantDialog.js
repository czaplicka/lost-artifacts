export class CrimeLabAssistantDialog {
  constructor(scene) {
    this.scene = scene;

    this.container = null;
    this.overlay = null;
    this.panel = null;
    this.speakerText = null;
    this.bodyText = null;
    this.promptText = null;

    this.steps = [];
    this.stepIndex = 0;
    this.onClose = null;
    this.isClosing = false;

    this.boundAdvance = this.advance.bind(this);
    this.boundClose = this.close.bind(this);
  }

  isOpen() {
    return Boolean(
      this.container &&
      this.container.active &&
      this.container.scene
    );
  }

  show({ steps = [], onClose = null } = {}) {
    if (
      this.isOpen() ||
      !this.scene ||
      !Array.isArray(steps)
    ) {
      return false;
    }

    this.steps = this.normalizeSteps(steps);

    if (this.steps.length === 0) {
      return false;
    }

    this.stepIndex = 0;
    this.isClosing = false;
    this.onClose =
      typeof onClose === 'function'
        ? onClose
        : null;

    this.createPanel();
    this.renderStep();

    return true;
  }

  normalizeSteps(steps) {
    return steps
      .map((step) => {
        if (typeof step === 'string') {
          return {
            speaker: 'LAB ASSISTANT',
            color: '#39ff14',
            text: step
          };
        }

        return {
          speaker: step?.speaker || 'LAB ASSISTANT',
          color: step?.color || '#39ff14',
          text: String(step?.text || '').trim()
        };
      })
      .filter((step) => step.text.length > 0);
  }

  createPanel() {
    const { width, height } = this.scene.scale;

    const panelWidth = Math.min(
      Math.max(320, width - 32),
      940
    );

    const panelHeight = Math.min(
      Math.max(250, Math.floor(height * 0.48)),
      height - 28
    );

    const panelX = width / 2;
    const panelY = height / 2;

    this.overlay = this.scene.add
      .rectangle(
        width / 2,
        height / 2,
        width,
        height,
        0x000000,
        0.48
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2999)
      .setInteractive({ useHandCursor: true });

    this.panel = this.scene.add
      .rectangle(
        panelX,
        panelY,
        panelWidth,
        panelHeight,
        0x07111b,
        0.98
      )
      .setStrokeStyle(3, 0x39ff14, 0.9)
      .setScrollFactor(0)
      .setDepth(3000)
      .setInteractive({ useHandCursor: true });

    this.speakerText = this.scene.add
      .text(
        panelX - panelWidth / 2 + 22,
        panelY - panelHeight / 2 + 18,
        '',
        {
          fontFamily: 'PressStart2P',
          fontSize: '10px',
          color: '#39ff14'
        }
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(3002);

    this.bodyText = this.scene.add
      .text(
        panelX - panelWidth / 2 + 22,
        panelY - panelHeight / 2 + 52,
        '',
        {
          fontFamily: 'SpecialElite',
          fontSize: '20px',
          color: '#fff4c7',
          wordWrap: {
            width: panelWidth - 44,
            useAdvancedWrap: true
          },
          lineSpacing: 7
        }
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(3002);

    this.promptText = this.scene.add
      .text(
        panelX + panelWidth / 2 - 18,
        panelY + panelHeight / 2 - 16,
        '',
        {
          fontFamily: 'PressStart2P',
          fontSize: '8px',
          color: '#ffcc00'
        }
      )
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(3002);

    this.container = this.scene.add
      .container(0, 0, [
        this.panel,
        this.speakerText,
        this.bodyText,
        this.promptText
      ])
      .setDepth(3000)
      .setAlpha(0)
      .setScale(0.97);

    this.panel.on('pointerdown', this.boundAdvance);
    this.overlay.on('pointerdown', this.boundAdvance);

    this.scene.input.keyboard.on(
      'keydown-SPACE',
      this.boundAdvance
    );

    this.scene.input.keyboard.on(
      'keydown-ENTER',
      this.boundAdvance
    );

    this.scene.input.keyboard.on(
      'keydown-ESC',
      this.boundClose
    );

    this.scene.tweens.add({
      targets: [this.overlay, this.container],
      alpha: 1,
      duration: 160,
      ease: 'Sine.easeOut'
    });

    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1,
      scaleY: 1,
      duration: 180,
      ease: 'Back.easeOut'
    });
  }

  renderStep() {
    const step = this.steps[this.stepIndex];

    if (!step || !this.isOpen()) {
      this.close();
      return;
    }

    this.speakerText
      ?.setText(step.speaker)
      .setColor(step.color);

    this.bodyText?.setText(step.text);

    const isLastStep =
      this.stepIndex >= this.steps.length - 1;

    this.promptText?.setText(
      isLastStep
        ? '[ CLOSE ]'
        : '[ CLICK / ENTER ]'
    );
  }

  advance() {
    if (!this.isOpen() || this.isClosing) {
      return;
    }

    const isLastStep =
      this.stepIndex >= this.steps.length - 1;

    if (isLastStep) {
      this.close();
      return;
    }

    this.stepIndex += 1;
    this.renderStep();
  }

  close() {
    if (this.isClosing) {
      return;
    }

    if (!this.container?.scene) {
      this.finishClose();
      return;
    }

    this.isClosing = true;
    this.removeInputListeners();

    const callback = this.onClose;
    this.onClose = null;

    const finish = () => {
      this.container?.destroy?.(true);
      this.overlay?.destroy?.();

      this.container = null;
      this.overlay = null;
      this.panel = null;
      this.speakerText = null;
      this.bodyText = null;
      this.promptText = null;
      this.steps = [];
      this.stepIndex = 0;
      this.isClosing = false;

      callback?.();
    };

    if (!this.scene?.tweens) {
      finish();
      return;
    }

    this.scene.tweens.add({
      targets: [this.overlay, this.container],
      alpha: 0,
      duration: 120,
      ease: 'Sine.easeIn',
      onComplete: finish
    });
  }

  finishClose() {
    const callback = this.onClose;
    this.onClose = null;

    this.removeInputListeners();

    this.container?.destroy?.(true);
    this.overlay?.destroy?.();

    this.container = null;
    this.overlay = null;
    this.panel = null;
    this.speakerText = null;
    this.bodyText = null;
    this.promptText = null;
    this.steps = [];
    this.stepIndex = 0;
    this.isClosing = false;

    callback?.();
  }

  removeInputListeners() {
    this.panel?.off?.('pointerdown', this.boundAdvance);
    this.overlay?.off?.('pointerdown', this.boundAdvance);

    this.scene?.input?.keyboard?.off?.(
      'keydown-SPACE',
      this.boundAdvance
    );

    this.scene?.input?.keyboard?.off?.(
      'keydown-ENTER',
      this.boundAdvance
    );

    this.scene?.input?.keyboard?.off?.(
      'keydown-ESC',
      this.boundClose
    );
  }

  destroy() {
    this.removeInputListeners();

    this.container?.destroy?.(true);
    this.overlay?.destroy?.();

    this.container = null;
    this.overlay = null;
    this.panel = null;
    this.speakerText = null;
    this.bodyText = null;
    this.promptText = null;
    this.steps = [];
    this.stepIndex = 0;
    this.onClose = null;
    this.isClosing = false;
    this.scene = null;
  }
}