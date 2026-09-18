export class CrimeLabAssistantDialog {
  constructor(scene) {
    this.scene = scene;

    this.container = null;
    this.overlay = null;
    this.panel = null;
    this.speakerText = null;
    this.bodyText = null;
    this.choiceObjects = [];
    this.hintText = null;

    this.dialogue = null;
    this.currentNodeId = null;
    this.onClose = null;
    this.isClosing = false;

    this.boundEscape = this.close.bind(this);
  }

  isOpen() {
    return Boolean(
      this.container &&
      this.container.active &&
      this.container.scene
    );
  }

  open({
    dialogue,
    startNodeId = null,
    onClose = null
  } = {}) {
    if (this.isOpen() || !this.scene || !dialogue?.nodes) {
      return false;
    }

    const resolvedStartNodeId =
      startNodeId ||
      dialogue.defaultNodeId;

    if (!resolvedStartNodeId || !dialogue.nodes[resolvedStartNodeId]) {
      console.warn(
        '[CrimeLabAssistantDialog] Missing dialogue start node.',
        {
          startNodeId: resolvedStartNodeId,
          dialogueId: dialogue.id
        }
      );

      return false;
    }

    this.dialogue = dialogue;
    this.currentNodeId = resolvedStartNodeId;
    this.onClose =
      typeof onClose === 'function'
        ? onClose
        : null;
    this.isClosing = false;

    this.createPanel();
    this.renderCurrentNode();

    return true;
  }

  createPanel() {
    const { width, height } = this.scene.scale;

    const panelWidth = Math.min(
      Math.max(330, width - 32),
      940
    );

    const panelHeight = Math.min(
      Math.max(300, Math.floor(height * 0.58)),
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
        0.5
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2999)
      .setInteractive({ useHandCursor: false });

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
      .setDepth(3000);

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
        panelY - panelHeight / 2 + 50,
        '',
        {
          fontFamily: 'SpecialElite',
          fontSize: '20px',
          color: '#fff4c7',
          wordWrap: {
            width: panelWidth - 44,
            useAdvancedWrap: true
          },
          lineSpacing: 6
        }
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(3002);

    this.hintText = this.scene.add
      .text(
        panelX + panelWidth / 2 - 18,
        panelY + panelHeight / 2 - 16,
        '[ ESC: CLOSE ]',
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
        this.hintText
      ])
      .setDepth(3000)
      .setAlpha(0)
      .setScale(0.97);

    this.scene.input.keyboard.on(
      'keydown-ESC',
      this.boundEscape
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

  renderCurrentNode() {
    const node = this.dialogue?.nodes?.[this.currentNodeId];

    if (!node || !this.isOpen()) {
      this.close();
      return;
    }

    this.clearChoices();

    this.speakerText
      ?.setText(node.speaker || 'LAB ASSISTANT')
      .setColor(node.color || '#39ff14');

    this.bodyText?.setText(this.resolveNodeText(node));

    const choices = Array.isArray(node.choices)
      ? node.choices
      : [];

    this.createChoices(choices);
  }

  resolveNodeText(node) {
    const baseText = String(node.text || '').trim();

    if (!node.dynamic) {
      return baseText;
    }

    const dynamicText = this.resolveDynamicText(node.dynamic);

    if (!dynamicText) {
      return baseText;
    }

    return baseText
      ? `${baseText}\n\n${dynamicText}`
      : dynamicText;
  }

  resolveDynamicText(dynamicKey) {
    if (dynamicKey === 'assistant_results') {
      return this.getAssistantResultsText();
    }

    if (dynamicKey === 'remaining_work') {
      return this.getRemainingWorkText();
    }

    return '';
  }

  getAssistantResultsText() {
    const summaries = this.scene?.getAssistantResultSummaries?.() || [];

    if (summaries.length === 0) {
      return 'No analyses were pre-processed for this case. The machines are all yours.';
    }

    return summaries
      .map((summary) => {
        return `• ${summary.label}: ${summary.text}`;
      })
      .join('\n\n');
  }

  getRemainingWorkText() {
    const remaining =
      this.scene?.getRemainingAnalysisCount?.() ?? 0;

    if (remaining <= 0) {
      return 'All required analyses are complete. The forensic profile is ready for the Crime Board.';
    }

    if (remaining === 1) {
      return 'One analysis remains. It is waiting at the active workstation.';
    }

    return `${remaining} analyses remain. Follow the station labels, and do not let the centrifuge hear you doubt it.`;
  }

  createChoices(choices) {
    if (!this.scene || !this.panel || !this.bodyText) {
      return;
    }

    const { width, height } = this.scene.scale;
    const panelWidth = this.panel.width;
    const panelHeight = this.panel.height;
    const panelX = width / 2;
    const panelY = height / 2;

    const choiceStartX = panelX - panelWidth / 2 + 22;
    const choiceStartY = Math.max(
      panelY - panelHeight / 2 + 150,
      this.bodyText.y + this.bodyText.height + 18
    );

    const choiceWidth = panelWidth - 44;
    const choiceHeight = 34;
    const choiceGap = 8;
    const availableBottom = panelY + panelHeight / 2 - 40;

    choices.slice(0, 4).forEach((choice, index) => {
      const y = choiceStartY + index * (choiceHeight + choiceGap);

      if (y + choiceHeight > availableBottom) {
        return;
      }

      const background = this.scene.add
        .rectangle(
          choiceStartX,
          y,
          choiceWidth,
          choiceHeight,
          0x102632,
          0.95
        )
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x7df9ff, 0.7)
        .setScrollFactor(0)
        .setDepth(3003)
        .setInteractive({ useHandCursor: true });

      const label = this.scene.add
        .text(
          choiceStartX + 12,
          y + choiceHeight / 2,
          `> ${choice.text || 'Continue'}`,
          {
            fontFamily: 'PressStart2P',
            fontSize: '8px',
            color: '#fff4c7',
            wordWrap: {
              width: choiceWidth - 24,
              useAdvancedWrap: true
            }
          }
        )
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(3004);

      background.on('pointerover', () => {
        background.setFillStyle(0x1d4552, 1);
        background.setStrokeStyle(2, 0x39ff14, 1);
        label.setColor('#39ff14');
      });

      background.on('pointerout', () => {
        background.setFillStyle(0x102632, 0.95);
        background.setStrokeStyle(1, 0x7df9ff, 0.7);
        label.setColor('#fff4c7');
      });

      background.on('pointerdown', () => {
        this.choose(choice);
      });

      this.choiceObjects.push(background, label);
    });
  }

  choose(choice = {}) {
    if (!this.isOpen() || this.isClosing) {
      return;
    }

    if (choice.action === 'close') {
      this.close();
      return;
    }

    if (choice.next && this.dialogue?.nodes?.[choice.next]) {
      this.currentNodeId = choice.next;
      this.renderCurrentNode();
      return;
    }

    console.warn(
      '[CrimeLabAssistantDialog] Choice has no valid next node or action.',
      choice
    );
  }

  clearChoices() {
    this.choiceObjects.forEach((object) => {
      object?.removeAllListeners?.();
      object?.destroy?.();
    });

    this.choiceObjects = [];
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
    this.clearChoices();

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
      this.hintText = null;
      this.dialogue = null;
      this.currentNodeId = null;
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
    this.clearChoices();

    this.container?.destroy?.(true);
    this.overlay?.destroy?.();

    this.container = null;
    this.overlay = null;
    this.panel = null;
    this.speakerText = null;
    this.bodyText = null;
    this.hintText = null;
    this.dialogue = null;
    this.currentNodeId = null;
    this.isClosing = false;

    callback?.();
  }

  removeInputListeners() {
    this.scene?.input?.keyboard?.off?.(
      'keydown-ESC',
      this.boundEscape
    );
  }

  destroy() {
    this.removeInputListeners();
    this.clearChoices();

    this.container?.destroy?.(true);
    this.overlay?.destroy?.();

    this.container = null;
    this.overlay = null;
    this.panel = null;
    this.speakerText = null;
    this.bodyText = null;
    this.hintText = null;
    this.dialogue = null;
    this.currentNodeId = null;
    this.onClose = null;
    this.isClosing = false;
    this.scene = null;
  }
}