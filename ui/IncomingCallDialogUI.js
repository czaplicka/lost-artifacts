// Conversation view for incoming mobile calls only. Independent of live DialogUI.
export class IncomingCallDialogUI {
  constructor(scene) {
    this.scene = scene;
    this.destroyed = false;
    this.isOpen = false;
    this.lines = [];
    this.pages = [];
    this.page = 0;
    this.timer = null;
    this.isTyping = false;
    this.onClose = null;
    this.overlay = scene.add.rectangle(0, 0, 1, 1, 0x000000, .75)
      .setOrigin(.5).setDepth(4000).setVisible(false).setInteractive();
    this.container = scene.add.container(0, 0).setDepth(4001).setVisible(false);
    this.background = scene.add.graphics();
    this.bubble = scene.add.graphics();
    this.speakerText = scene.add.text(0, 0, '', { fontFamily: 'PressStart2P', fontSize: '14px', color: '#f0c75e' });
    this.bodyText = scene.add.text(0, 0, '', { fontFamily: 'SpecialElite', fontSize: '22px',
      color: '#f3e7c4', lineSpacing: 7 });
    this.hint = scene.add.text(0, 0, '', { fontFamily: 'SpecialElite', fontSize: '16px', color: '#d4af37' });
    this.counter = scene.add.text(0, 0, '', { fontFamily: 'SpecialElite', fontSize: '15px', color: '#b5a585' }).setOrigin(1, 0);
    this.container.add([this.background, this.bubble, this.speakerText, this.bodyText, this.hint, this.counter]);
    this.overlay.on('pointerdown', (_p, _x, _y, event) => { event?.stopPropagation(); this.advance(); });
    this.resize = () => this.layout();
    this.shutdown = () => this.destroy();
    scene.scale.on('resize', this.resize);
    scene.events.once('shutdown', this.shutdown);
    scene.events.once('destroy', this.shutdown);
  }
  open(entry = {}, options = {}) {
    if (this.destroyed) return false;
    this.stopTypewriter();
    this.lines = (Array.isArray(entry.lines) ? entry.lines : []).map(line => String(line ?? ''));
    this.speakerText.setText(entry.speaker || 'INCOMING CALL');
    this.page = 0;
    this.onClose = typeof options.onClose === 'function' ? options.onClose : null;
    this.isOpen = true;
    this.overlay.setVisible(true);
    this.container.setVisible(true);
    this.layout(false);
    this.showPage();
    return true;
  }
  layout(preserve = true) {
    if (this.destroyed) return;
    const old = this.pages[this.page];
    const offset = preserve && old ? old.start : 0;
    const { width, height } = this.scene.scale;
    const w = Math.max(1, Math.min(900, width - 24));
    const h = Math.max(1, Math.min(330, height - 24));
    const pad = Math.min(24, Math.max(8, w * .04));
    const font = width < 550 || height < 350 ? 17 : 22;
    this.overlay.setPosition(width / 2, height / 2).setSize(width, height);
    this.container.setPosition(width / 2, height / 2);
    this.background.clear().fillStyle(0x17110a, .98).fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    this.background.lineStyle(3, 0xd4af37, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    this.background.lineStyle(1, 0x7d6620, 1)
      .strokeRoundedRect(-w / 2 + 6, -h / 2 + 6, Math.max(1, w - 12), Math.max(1, h - 12), 6);
    this.speakerText.setPosition(-w / 2 + pad, -h / 2 + pad)
      .setFontSize(width < 550 ? 10 : 14).setWordWrapWidth(Math.max(1, w - pad * 2));
    const top = -h / 2 + pad + this.speakerText.height + 20;
    const maxHeight = Math.max(font + 7, h / 2 - pad - 35 - top);
    const bubbleWidth = Math.max(1, (w - pad * 2) * .88);
    const innerPad = Math.min(14, Math.max(2, bubbleWidth * .04));
    const bubbleX = -w / 2 + pad;
    this.bubble.clear().fillStyle(0x2a2012, 1)
      .fillRoundedRect(bubbleX, top - 8, bubbleWidth, maxHeight + 16, 8)
      .lineStyle(1, 0xb58a42, 1)
      .strokeRoundedRect(bubbleX, top - 8, bubbleWidth, maxHeight + 16, 8);
    this.bodyText.setPosition(bubbleX + innerPad, top).setFontSize(font)
      .setWordWrapWidth(Math.max(1, bubbleWidth - innerPad * 2));
    this.hint.setPosition(-w / 2 + pad, h / 2 - pad - 18).setFontSize(width < 550 ? 13 : 16);
    this.counter.setPosition(w / 2 - pad, h / 2 - pad - 18);
    this.pages = [];
    let absolute = 0;
    for (const line of this.lines) {
      const tokens = line.match(/\S+\s*/g) || [''];
      let start = 0;
      while (start < tokens.length) {
        let low = start + 1, high = tokens.length, best = start + 1;
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          this.bodyText.setText(tokens.slice(start, mid).join('').trim());
          if (this.bodyText.height <= maxHeight) { best = mid; low = mid + 1; }
          else high = mid - 1;
        }
        const raw = tokens.slice(start, best).join('');
        this.pages.push({ text: raw.trim(), start: absolute, end: absolute + raw.length });
        absolute += raw.length;
        start = best;
      }
      absolute++;
    }
    if (!this.pages.length) this.pages.push({ text: '', start: 0, end: 0 });
    if (preserve) {
      const index = this.pages.findIndex(page => offset >= page.start && offset <= page.end);
      this.page = index >= 0 ? index : Math.min(this.page, this.pages.length - 1);
      if (this.isOpen) this.showPage(true);
    }
  }
  showPage(instant = false) {
    if (!this.isOpen || this.destroyed) return;
    this.stopTypewriter();
    this.fullText = this.bodyText.getWrappedText(this.pages[this.page]?.text || '').join('\n');
    this.counter.setText(`${this.page + 1}/${this.pages.length}`);
    this.hint.setText(this.page === this.pages.length - 1 ? 'Click to finish call' : 'Click to continue');
    if (instant || !this.fullText) { this.bodyText.setText(this.fullText); return; }
    this.bodyText.setText('');
    this.isTyping = true;
    this.hint.setText('Click to show text');
    let index = 0;
    this.timer = this.scene.time.addEvent({ delay: 22, loop: true, callback: () => {
      if (!this.isOpen || this.destroyed) { this.stopTypewriter(); return; }
      index = Math.min(index + 1, this.fullText.length);
      this.bodyText.setText(this.fullText.slice(0, index));
      if (index === this.fullText.length) this.skipTypewriter();
    } });
  }
  stopTypewriter() { this.timer?.remove(false); this.timer = null; this.isTyping = false; }
  skipTypewriter() {
    this.stopTypewriter();
    this.bodyText.setText(this.fullText || '');
    this.hint.setText(this.page === this.pages.length - 1 ? 'Click to finish call' : 'Click to continue');
  }
  advance() {
    if (!this.isOpen || this.destroyed) return;
    if (this.isTyping) { this.skipTypewriter(); return; }
    if (this.page < this.pages.length - 1) { this.page++; this.showPage(); }
    else this.close();
  }
  close() {
    if (!this.isOpen || this.destroyed) return;
    this.stopTypewriter();
    this.isOpen = false;
    this.overlay.setVisible(false);
    this.container.setVisible(false);
    const callback = this.onClose;
    this.onClose = null;
    callback?.();
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.isOpen = false;
    this.onClose = null;
    this.stopTypewriter();
    this.scene.scale.off('resize', this.resize);
    this.scene.events.off('shutdown', this.shutdown);
    this.scene.events.off('destroy', this.shutdown);
    this.container.destroy(true);
    this.overlay.destroy();
  }
}
