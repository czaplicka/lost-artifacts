export class CrimeLabAssistantDialog {
  constructor(scene) {
    this.scene = scene;
    this.container = this.overlay = this.panel = this.speakerText = this.bodyText = this.hintText = null;
    this.choiceObjects = [];
    this.dialogue = null; this.currentNodeId = null; this.onClose = null; this.isClosing = false;
    this.extension = null;
    this.choicePage = 0;
    this.boundEscape = this.close.bind(this);
  }

  isOpen() { return Boolean(this.container && this.container.active && this.container.scene); }

  open({ dialogue, startNodeId = null, onClose = null } = {}) {
    if (this.isOpen() || !this.scene || !dialogue?.nodes) return false;
    const start = startNodeId || dialogue.defaultNodeId;
    if (!start || !dialogue.nodes[start]) {
      console.warn('[CrimeLabAssistantDialog] Missing dialogue start node.', { startNodeId: start, dialogueId: dialogue.id });
      return false;
    }
    // Dialogue extensions must never mutate the JSON object held in Phaser's cache.
    this.dialogue = { ...dialogue, nodes: Object.fromEntries(Object.entries(dialogue.nodes).map(([id, node]) => [
      id, { ...node, choices: Array.isArray(node.choices) ? node.choices.map(choice => ({ ...choice })) : [] }
    ])) };
    this.currentNodeId = start; this.choicePage = 0;
    this.onClose = typeof onClose === 'function' ? onClose : null; this.isClosing = false;
    this.createPanel(); this.renderCurrentNode(); return true;
  }

  createPanel() {
    const { width, height } = this.scene.scale;
    const panelWidth = Math.min(Math.max(330, width - 32), 940);
    const panelHeight = Math.min(Math.max(300, Math.floor(height * 0.68)), height - 28);
    const x = width / 2, y = height / 2;
    this.overlay = this.scene.add.rectangle(x, y, width, height, 0x000000, 0.5)
      .setOrigin(0.5).setScrollFactor(0).setDepth(2999).setInteractive({ useHandCursor: false });
    this.panel = this.scene.add.rectangle(x, y, panelWidth, panelHeight, 0x07111b, 0.98)
      .setStrokeStyle(3, 0x39ff14, 0.9).setScrollFactor(0).setDepth(3000);
    this.speakerText = this.scene.add.text(x - panelWidth / 2 + 22, y - panelHeight / 2 + 18, '', {
      fontFamily: 'PressStart2P', fontSize: '10px', color: '#39ff14'
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(3002);
    this.bodyText = this.scene.add.text(x - panelWidth / 2 + 22, y - panelHeight / 2 + 50, '', {
      fontFamily: 'SpecialElite', fontSize: '20px', color: '#fff4c7',
      wordWrap: { width: panelWidth - 44, useAdvancedWrap: true }, lineSpacing: 6
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(3002);
    this.hintText = this.scene.add.text(x + panelWidth / 2 - 18, y + panelHeight / 2 - 16, '[ ESC: CLOSE ]', {
      fontFamily: 'PressStart2P', fontSize: '8px', color: '#ffcc00'
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(3002);
    this.container = this.scene.add.container(0, 0, [this.panel, this.speakerText, this.bodyText, this.hintText])
      .setDepth(3000).setAlpha(0).setScale(0.97);
    this.scene.input.keyboard?.on('keydown-ESC', this.boundEscape);
    this.scene.tweens.add({ targets: [this.overlay, this.container], alpha: 1, duration: 160, ease: 'Sine.easeOut' });
    this.scene.tweens.add({ targets: this.container, scaleX: 1, scaleY: 1, duration: 180, ease: 'Back.easeOut' });
  }

  renderCurrentNode() {
    const node = this.dialogue?.nodes?.[this.currentNodeId];
    if (!node || !this.isOpen()) { this.close(); return; }
    this.clearChoices();
    this.speakerText?.setText(node.speaker || 'LAB ASSISTANT').setColor(node.color || '#39ff14');
    this.bodyText?.setText(this.resolveNodeText(node));
    const base = Array.isArray(node.choices) ? node.choices : [];
    const choices = this.extension?.augmentChoices ? this.extension.augmentChoices(this, base) : base;
    this.createChoices(choices);
  }
  resolveNodeText(node) {
    const base = String(node.text || '').trim();
    if (!node.dynamic) return base;
    const dynamic = this.resolveDynamicText(node.dynamic);
    return dynamic ? base ? `${base}\n\n${dynamic}` : dynamic : base;
  }
  resolveDynamicText(key) {
    if (key === 'assistant_results') return this.getAssistantResultsText();
    if (key === 'remaining_work') return this.getRemainingWorkText();
    return '';
  }
  getAssistantResultsText() {
    const summaries = this.scene?.getAssistantResultSummaries?.() || [];
    if (!summaries.length) return 'No analyses were pre-processed for this case. The machines are all yours.';
    return summaries.map(summary => `• ${summary.label}: ${summary.text}`).join('\n\n');
  }
  getRemainingWorkText() {
    const remaining = this.scene?.getRemainingAnalysisCount?.() ?? 0;
    if (remaining <= 0) return 'All required analyses are complete. The forensic profile is ready for the Crime Board.';
    if (remaining === 1) return 'One analysis remains. It is waiting at the active workstation.';
    return `${remaining} analyses remain. Follow the station labels, and do not let the centrifuge hear you doubt it.`;
  }

  createChoices(choices) {
    if (!this.scene || !this.panel || !this.bodyText) return;
    const { width, height } = this.scene.scale;
    const panelWidth = this.panel.width, panelHeight = this.panel.height;
    const x = width / 2 - panelWidth / 2 + 22;
    const top = height / 2 - panelHeight / 2;
    const bottom = height / 2 + panelHeight / 2 - 54;
    this.bodyText.setFontSize(20);
    while (this.bodyText.height > panelHeight - 165 && parseInt(this.bodyText.style.fontSize, 10) > 13) {
      this.bodyText.setFontSize(parseInt(this.bodyText.style.fontSize, 10) - 1);
    }
    const start = Math.max(top + 130, this.bodyText.y + this.bodyText.height + 14);
    const choiceHeight = 44, gap = 8;
    const perPage = Math.max(1, Math.min(4, Math.floor((bottom - start + gap) / (choiceHeight + gap))));
    const pages = Math.max(1, Math.ceil(choices.length / perPage));
    this.choicePage = Math.min(Math.max(0, this.choicePage), pages - 1);
    const visible = choices.slice(this.choicePage * perPage, (this.choicePage + 1) * perPage);
    visible.forEach((choice, index) => {
      const y = start + index * (choiceHeight + gap), w = panelWidth - 44;
      const bg = this.scene.add.rectangle(x, y, w, choiceHeight, 0x102632, 0.95)
        .setOrigin(0, 0).setStrokeStyle(1, 0x7df9ff, 0.7).setScrollFactor(0).setDepth(3003)
        .setInteractive({ useHandCursor: true });
      const label = this.scene.add.text(x + 16, y + choiceHeight / 2, `> ${choice.text || 'Continue'}`, {
        fontFamily: 'PressStart2P', fontSize: '11px', color: '#fff4c7',
        wordWrap: { width: w - 32, useAdvancedWrap: true }
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(3004);
      while (label.height > choiceHeight - 6 && parseInt(label.style.fontSize, 10) > 8) label.setFontSize(parseInt(label.style.fontSize, 10) - 1);
      bg.on('pointerover', () => { bg.setFillStyle(0x1d4552, 1); bg.setStrokeStyle(2, 0x39ff14, 1); label.setColor('#39ff14'); });
      bg.on('pointerout', () => { bg.setFillStyle(0x102632, 0.95); bg.setStrokeStyle(1, 0x7df9ff, 0.7); label.setColor('#fff4c7'); });
      bg.on('pointerdown', () => this.choose(choice));
      this.choiceObjects.push(bg, label);
    });
    if (pages > 1) {
      const y = height / 2 + panelHeight / 2 - 24;
      const pager = (px, text, delta, enabled) => {
        const label = this.scene.add.text(px, y, text, {
          fontFamily: 'SpecialElite', fontSize: '18px', color: enabled ? '#7df9ff' : '#555555'
        }).setOrigin(0, 0.5).setDepth(3004).setScrollFactor(0);
        if (enabled) label.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          this.choicePage += delta; this.renderCurrentNode();
        });
        this.choiceObjects.push(label);
      };
      pager(x, '< Previous', -1, this.choicePage > 0);
      pager(x + 140, `${this.choicePage + 1}/${pages}`, 0, false);
      pager(x + 210, 'Next >', 1, this.choicePage < pages - 1);
    }
  }

  choose(choice = {}) {
    if (!this.isOpen() || this.isClosing) return;
    if (this.extension?.handleChoice?.(choice, this) === true) return;
    if (choice.action === 'close') { this.close(); return; }
    if (choice.next && this.dialogue?.nodes?.[choice.next]) {
      this.currentNodeId = choice.next; this.choicePage = 0; this.renderCurrentNode(); return;
    }
    console.warn('[CrimeLabAssistantDialog] Choice has no valid next node or action.', choice);
  }
  clearChoices() {
    this.choiceObjects.forEach(object => { object?.removeAllListeners?.(); object?.destroy?.(); });
    this.choiceObjects = [];
  }
  close() {
    if (this.isClosing) return;
    if (!this.container?.scene) { this.finishClose(); return; }
    this.isClosing = true; this.removeInputListeners(); this.clearChoices();
    const callback = this.onClose; this.onClose = null;
    const finish = () => {
      this.container?.destroy?.(true); this.overlay?.destroy?.();
      this.container = this.overlay = this.panel = this.speakerText = this.bodyText = this.hintText = null;
      this.dialogue = null; this.currentNodeId = null; this.isClosing = false; this.choicePage = 0;
      callback?.();
    };
    if (!this.scene?.tweens) { finish(); return; }
    this.scene.tweens.add({ targets: [this.overlay, this.container], alpha: 0, duration: 120, ease: 'Sine.easeIn', onComplete: finish });
  }
  finishClose() {
    const callback = this.onClose; this.onClose = null;
    this.removeInputListeners(); this.clearChoices();
    this.container?.destroy?.(true); this.overlay?.destroy?.();
    this.container = this.overlay = this.panel = this.speakerText = this.bodyText = this.hintText = null;
    this.dialogue = null; this.currentNodeId = null; this.isClosing = false; this.choicePage = 0;
    callback?.();
  }
  removeInputListeners() { this.scene?.input?.keyboard?.off?.('keydown-ESC', this.boundEscape); }
  destroy() {
    this.removeInputListeners(); this.clearChoices();
    this.container?.destroy?.(true); this.overlay?.destroy?.();
    this.container = this.overlay = this.panel = this.speakerText = this.bodyText = this.hintText = null;
    this.dialogue = null; this.currentNodeId = null; this.onClose = null; this.isClosing = false;
    this.extension = null; this.choicePage = 0; this.scene = null;
  }
}
