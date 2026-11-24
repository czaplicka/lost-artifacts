import { HomeTownDialogue } from './HomeTownDialogue.js';

// Dotychczasowe kolory sklepu; niezależne od starego renderera rozmów.
export const SPY_SHOP_PANEL_COLORS = Object.freeze({
  TEXT: '#f4ecd8', TOPIC_USED: '#7a7160', AMBER: '#ffc66d',
  GREEN: '#85d4a4', RED: '#ff7a6b'
});

// Adapter API sklepu. Tekst, dymki, strony i odpowiedzi rysuje HomeTownDialogue.
// Dodatki sklepu to wyłącznie miniatura produktu/sprzedawcy i stempel.
export class SpyShopDialogue {
  constructor(scene, { leaveLabel = 'Leave', onLeave = () => {} } = {}) {
    this.scene = scene;
    this.leaveLabel = leaveLabel;
    this.onLeave = onLeave;
    this.destroyed = false;
    this.speaker = { name: '', portrait: null };
    this.text = '';
    this.footer = '';
    this.footerColor = SPY_SHOP_PANEL_COLORS.AMBER;
    this.topics = [];
    this.revision = 0;
    this.stampData = null;
    this.stamp = null;
    this.stampTween = null;
    this.preview = null;
    this.shared = new HomeTownDialogue(scene, () => {
      if (!this.destroyed) this.onLeave?.();
    });
    this.dispose = () => this.destroy();
    scene.events.once('shutdown', this.dispose);
    scene.events.once('destroy', this.dispose);
  }
  get isOpen() { return !this.destroyed; }
  get root() { return this.shared.root; }
  get isTyping() { return this.shared.typing; }
  setSpeaker(speaker = {}) { this.speaker = { ...speaker }; }
  setText(value, { footer = '', footerColor = SPY_SHOP_PANEL_COLORS.AMBER, instant = false } = {}) {
    if (this.destroyed) return;
    this.text = String(value ?? '');
    this.footer = String(footer ?? '');
    this.footerColor = footerColor;
    this.render();
    if (instant) this.shared.stop();
  }
  choices() {
    const revision = this.revision;
    return this.topics.map((topic, index) => ({
      id: topic.id || `spy_shop_topic:${index}`,
      label: topic.label,
      state: topic.state === 'accent' ? 'normal' : topic.state || 'normal',
      disabled: topic.state === 'disabled', scoreTrust: false,
      action: () => {
        if (revision !== this.revision || this.destroyed) return;
        this.triggerTopic(index);
        // O użyciu tematu decyduje askedTopics sceny, nie historia guzików Buy/Yes.
        this.shared.seen.clear();
      }
    }));
  }
  render() {
    if (this.destroyed) return;
    this.clearExtras();
    this.revision++;
    this.shared.seen.clear();
    this.shared.show({
      title: this.speaker.name, text: this.text, role: this.footer,
      messages: [{ speaker: 'npc', text: this.text }],
      nodeId: 'spy_shop', showTrust: false, scoreTrust: false, depth: 700,
      choices: this.choices(),
      onDraw: () => this.decorate()
    });
  }
  setTopics(topics = []) {
    if (this.destroyed) return;
    this.topics = topics;
    this.revision++;
    this.shared.seen.clear();
    if (!this.shared.data) return;
    this.shared.data.choices = this.choices();
    this.shared.updateTopics();
  }
  setFooter(value, color = SPY_SHOP_PANEL_COLORS.AMBER) {
    if (this.destroyed) return;
    this.footer = String(value ?? '');
    this.footerColor = color;
    if (this.shared.data) this.shared.data.role = this.footer;
    this.drawFooter();
  }
  drawFooter() {
    const panel = this.shared.panel;
    if (!panel) return;
    panel.roleText.setText(this.footer).setColor(this.footerColor);
    panel._fitWidth(panel.roleText, panel.L.lw, 14 * panel.L.s, 8 * panel.L.s);
  }
  triggerTopic(index) {
    const topic = this.topics[index];
    if (this.destroyed || !this.scene.canInteract() || !topic || topic.state === 'disabled') return;
    topic.onSelect?.(topic);
  }
  advance() { if (!this.destroyed && !this.scene.buying) this.shared.advance(); }
  decorate() {
    if (this.destroyed || !this.shared.panel) return;
    this.clearExtras();
    const panel = this.shared.panel;
    // Jak wcześniej: można klikać inne towary w gablocie przy otwartym panelu.
    if (panel.blocker?.input) panel.blocker.input.enabled = false;
    panel.byeBtn.text.setText(this.leaveLabel);
    // Nie usuwamy potwierdzenia zakupu przed sprawdzeniem scene.buying.
    panel.onLeave = () => { if (!this.destroyed && !this.scene.buying) this.onLeave?.(); };
    panel._handleKey = event => this.handleKey(event);
    this.drawFooter();
    this.drawPreview();
    this.drawStamp(false);
  }
  handleKey(event) {
    if (this.destroyed || this.scene.disposed || this.scene.navigating || this.scene.buying ||
      event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
    const key = event.key;
    if (key === 'Escape' || event.code === 'Escape') {
      if (this.scene.pendingPurchase) this.scene.showItem(this.scene.pendingPurchase.index);
      else this.scene.closeDialogue();
      return;
    }
    if (key === '0') { this.onLeave?.(); return; }
    const match = /^(?:Digit|Numpad)([1-9])$/.exec(event.code || '') || /^([1-9])$/.exec(key || '');
    if (match) { this.triggerTopic(Number(match[1]) - 1); return; }
    if (['ArrowLeft', 'ArrowRight'].includes(key) && this.scene.dialogueMode === 'item' && !this.scene.pendingPurchase) {
      this.scene.showItem(this.scene.currentProductIndex + (key === 'ArrowLeft' ? -1 : 1));
      return;
    }
    if (key === ' ' || key === 'Enter') this.advance();
    else if (key === 'ArrowLeft') this.shared.panel?.previousPage();
    else if (key === 'ArrowRight') this.advance();
    else if (key === 'ArrowUp' || key === 'ArrowDown') this.shared.panel?._scrollBy(key === 'ArrowUp' ? -1 : 1);
  }
  drawPreview() {
    const panel = this.shared.panel;
    const portrait = this.speaker.portrait;
    if (!panel || !portrait) return;
    const { L } = panel;
    // Nad panelem, aby miniatura nie zabierała miejsca tekstowi i odpowiedziom.
    const side = Math.max(1, Math.min(148 * L.s, L.py - 20 * L.s, L.lw));
    const x = L.lx + side / 2, y = L.py - 12 * L.s - side / 2;
    this.preview = this.scene.add.container(x, y);
    panel.root.add(this.preview);
    this.previewSide = side;
    const bg = this.scene.add.rectangle(0, 0, side, side, 0x0b0805, .95)
      .setStrokeStyle(Math.max(1, 2 * L.s), 0x8a6d1f);
    this.preview.add(bg);
    const inner = Math.max(1, side - 12 * L.s);
    if (portrait.key && this.scene.textures.exists(portrait.key)) {
      const image = this.scene.add.image(0, 0, portrait.key);
      const frame = image.frame;
      const w = frame.realWidth || frame.width, h = frame.realHeight || frame.height;
      if (portrait.kind === 'crop') {
        const cropSide = Math.max(1, Math.min((portrait.sideFrac ?? .3) * h, w, h));
        const cx = Math.max(0, Math.min(w - cropSide, (portrait.cx ?? .5) * w - cropSide / 2));
        const cy = Math.max(0, Math.min(h - cropSide, (portrait.cy ?? .5) * h - cropSide / 2));
        image.setOrigin((cx + cropSide / 2) / w, (cy + cropSide / 2) / h)
          .setScale(inner / cropSide).setCrop(cx, cy, cropSide, cropSide);
      } else image.setScale(inner / Math.max(1, w, h));
      this.preview.add(image);
    } else {
      this.preview.add(this.scene.add.text(0, 0, portrait.text || '?', {
        fontFamily: 'SpecialElite', fontSize: `${Math.max(12, inner * .45)}px`, color: '#ffd86b'
      }).setOrigin(.5));
    }
  }
  setStamp(text, options = {}) {
    if (this.destroyed) return;
    this.stampData = text ? { text, options } : null;
    this.clearStamp();
    this.drawStamp(options.slam === true);
  }
  drawStamp(slam) {
    const panel = this.shared.panel;
    if (!panel || !this.preview || !this.stampData) return;
    const { text, options } = this.stampData;
    const { s } = panel.L;
    const label = this.scene.add.text(0, 0, text, {
      fontFamily: 'PressStart2P', fontSize: `${10 * s}px`, color: options.color || '#85d4a4'
    }).setOrigin(.5);
    const width = Math.min(this.previewSide, label.width + 20 * s), height = label.height + 16 * s;
    if (label.width > width - 12 * s) label.setScale(Math.max(.01, (width - 12 * s) / label.width));
    const border = this.scene.add.rectangle(0, 0, width, height, 0x0b0805, .9)
      .setStrokeStyle(Math.max(1, 2 * s), options.colorInt || 0x85d4a4);
    this.stamp = this.scene.add.container(0, this.previewSide / 2 - height / 2, [border, label]).setAngle(-9);
    this.preview.add(this.stamp);
    if (slam) {
      this.stamp.setScale(2).setAlpha(0);
      this.stampTween = this.scene.tweens.add({ targets: this.stamp, scale: 1, alpha: 1,
        duration: 180, ease: 'Cubic.easeIn' });
    }
  }
  clearStamp() {
    if (this.stamp) {
      this.scene.tweens.killTweensOf(this.stamp);
      this.stamp.destroy();
    }
    this.stamp = null;
    this.stampTween = null;
  }
  clearExtras() {
    this.clearStamp();
    this.preview?.destroy(true);
    this.preview = null;
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.revision++;
    this.clearExtras();
    this.shared.destroy();
    this.scene.events.off('shutdown', this.dispose);
    this.scene.events.off('destroy', this.dispose);
    this.onLeave = null;
    this.topics = [];
  }
}
