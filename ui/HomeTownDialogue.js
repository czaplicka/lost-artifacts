import { LocationDialoguePanel } from './LocationDialoguePanel.js';

class HomeTownBubblePanel extends LocationDialoguePanel {
  constructor(scene, options) {
    super(scene, options);
    this.clearPortrait();
    this.nameText = this.makeText(0, 0, '', 10, '#ffd86b', true);
    this.bubble = scene.add.graphics();
    this.choiceFrames = scene.add.graphics();
    this.root.addAt(this.bubble, this.root.getIndex(this.text));
    this.root.addAt(this.choiceFrames, this.root.getIndex(this.text));
    this.bubbleStyleReady = true;
    this.relayout();
  }
  renderSpeaker() {
    if (!this.bubbleStyleReady) { super.renderSpeaker(); return; }
    if (!this.isOpen) return;
    const L = this.layout;
    this.nameText.setText(this.speaker.name || '').setPosition(L.textX, L.panelY + 22)
      .setFontSize(L.width < 700 ? 8 : 10).setWordWrapWidth(L.textWidth, true);
  }
  relayout() {
    if (!this.bubbleStyleReady) { super.relayout(); return; }
    if (!this.isOpen) return;
    const offset = this.textPages[this.textPage]?.start || 0;
    const { width: w, height: h } = this.scene.scale;
    const small = w < 700, ph = Math.min(h, small ? 340 : 272), y = h - ph;
    const pad = small ? 18 : 26;
    const menu = Math.min(this.options.menuWidth, small ? Math.max(116, w * .35) : w * .28);
    const divider = w - menu - 20, textX = pad + 10;
    this.layout = { width: w, height: h, panelHeight: ph, panelY: y,
      portraitSize: 0, portraitX: pad, portraitY: y + 12, centerX: pad, centerY: y + 12,
      textX, textEndX: divider, menuWidth: menu, menuX: divider + 16,
      textWidth: Math.max(16, (divider - textX - 24) * .88), font: small ? 17 : 22 };
    this.overlay.setSize(w, h);
    this.background.setPosition(0, y).setSize(w, ph);
    this.border.clear().lineStyle(4, 0xd4af37, 1)
      .strokeRect(6, y + 6, Math.max(1, w - 12), Math.max(1, ph - 12))
      .lineStyle(1, 0x8a6d1f, .9)
      .strokeRect(12, y + 12, Math.max(1, w - 24), Math.max(1, ph - 24));
    this.border.lineBetween(divider, y + 16, divider, h - 16);
    this.portraitFrame.clear().setVisible(false);
    this.text.setPosition(textX, y + 58).setFontSize(this.layout.font)
      .setWordWrapWidth(this.layout.textWidth, true).setScale(1);
    this.footer.setPosition(textX, h - 72).setFontSize(small ? 9 : 11)
      .setWordWrapWidth(this.layout.textWidth, true);
    this.previousText.setPosition(textX, h - 37);
    this.pageLabel.setPosition(textX + 28, h - 37);
    this.nextText.setPosition(divider - 24, h - 37);
    this.leaveButton.setPosition(divider + 16, h - 37).setFontSize(small ? 16 : 18)
      .setText(this.options.leaveLabel);
    this.leaveButton.setScale(Math.min(1, Math.max(1, menu - 18) / Math.max(1, this.leaveButton.width)));
    this.renderSpeaker(); this.repaginate(offset); this.renderPage(true); this.renderTopics();
  }
  repaginate(offset = 0) {
    if (!this.bubbleStyleReady) { super.repaginate(offset); return; }
    const height = this.layout.panelHeight;
    this.layout.panelHeight = height - 42;
    try { super.repaginate(offset); } finally { this.layout.panelHeight = height; }
  }
  renderPage(instant = false) {
    if (this.bubbleStyleReady && this.isOpen) {
      const L = this.layout;
      this.bubble.clear().fillStyle(0x2a2012, 1)
        .fillRoundedRect(L.textX - 10, L.panelY + 48, L.textWidth + 20, Math.max(1, L.panelHeight - 102), 8)
        .lineStyle(1, 0xb58a42, 1)
        .strokeRoundedRect(L.textX - 10, L.panelY + 48, L.textWidth + 20, Math.max(1, L.panelHeight - 102), 8);
      this.text.setColor('#f3e7c4');
    }
    super.renderPage(instant);
  }
  clearTopics() {
    this.choiceFrames?.clear();
    super.clearTopics();
  }
  renderTopics() {
    super.renderTopics();
    if (!this.bubbleStyleReady || !this.isOpen) return;
    this.choiceFrames.clear();
    this.pageTopics.forEach((topic, index) => {
      const label = this.topicObjects[index];
      if (!label) return;
      const muted = this.topicsLocked() || topic.state === 'used' || topic.state === 'disabled';
      const x = label.x - 5, y = label.y - 2;
      const width = Math.min(this.layout.menuWidth - 12, Math.max(20, label.displayWidth + 10));
      const height = label.displayHeight + 4;
      this.choiceFrames.fillStyle(muted ? 0x242821 : 0x263729, 1)
        .fillRoundedRect(x, y, width, height, 4)
        .lineStyle(1, muted ? 0x53604e : 0x88b589, 1)
        .strokeRoundedRect(x, y, width, height, 4);
    });
  }
}

// Existing Home Town scenes retain the same public API and choice callbacks.
export class HomeTownDialogue {
  constructor(scene, onClose = () => {}) {
    this.scene = scene; this.onClose = onClose;
    this.root = null; this.panel = null; this.data = null;
    this.seen = new Set(); this.destroyed = false; this.choosing = false;
    this.dispose = () => this.destroy();
    scene.events.once('shutdown', this.dispose);
    scene.events.once('destroy', this.dispose);
  }
  get typing() { return Boolean(this.panel?.isTyping); }
  get textPage() { return this.panel?.textPage || 0; }
  get menuPage() { return this.panel?.choicePage || 0; }
  get body() { return this.panel?.text || null; }
  get footer() { return this.panel?.footer || null; }
  get pages() { return this.panel?.textPages.map(page => page.text) || []; }
  get pageText() { return this.panel?.pageText || ''; }
  stop() { this.panel?.stopTypewriter(); }
  clear() { this.panel?.destroy(); this.panel = null; this.root = null; }
  show(data) {
    if (this.destroyed) return null;
    this.clear();
    this.data = { title: '', text: '', choices: [], ...data };
    this.panel = new HomeTownBubblePanel(this.scene, {
      depth: 5000, modal: true, keyboard: true, onLeave: () => this.close()
    });
    this.root = this.panel.root;
    const portrait = typeof this.data.portrait === 'string'
      ? { kind: 'texture', key: this.data.portrait } : this.data.portrait || null;
    this.panel.setSpeaker({ name: this.data.title, portrait });
    this.panel.setText(this.data.text);
    this.updateTopics();
    return this.root;
  }
  updateTopics() {
    this.panel?.setTopics(this.data.choices.map(([label, action]) => {
      const id = `${this.data.title}|${label}`;
      return { id, label, state: this.seen.has(id) ? 'used' : 'normal', onSelect: () => {
        if (this.choosing || this.destroyed || !this.panel?.isOpen) return;
        this.seen.add(id); this.choosing = true;
        try { action(); } finally { this.choosing = false; }
        if (this.panel?.isOpen) this.updateTopics();
      } };
    }), { preservePage: true });
  }
  draw() { this.panel?.relayout(); }
  type() { this.panel?.renderPage(); }
  advance() { this.panel?.advance(); }
  close(notify = true) { this.clear(); this.data = null; if (notify) this.onClose(); }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true; this.close(false);
    this.scene.events.off('shutdown', this.dispose);
    this.scene.events.off('destroy', this.dispose);
  }
}
