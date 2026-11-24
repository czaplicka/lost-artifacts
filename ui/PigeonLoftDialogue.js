import { HomeTownDialogue } from './HomeTownDialogue.js';

// Zachowuje API sceny; jedynym rendererem rozmów pozostaje HomeTownDialogue.
export class PigeonLoftDialogue {
  constructor(scene, { leaveLabel = 'Leave', onLeave = () => {} } = {}) {
    this.scene = scene;
    this.leaveLabel = leaveLabel;
    this.onLeave = onLeave;
    this.destroyed = false;
    this.speaker = {};
    this.topics = [];
    this.text = '';
    this.footer = '';
    this.footerColor = '#ffc66d';
    this.revision = 0;
    this.preview = null;
    this.shared = new HomeTownDialogue(scene, () => { if (!this.destroyed) this.onLeave?.(); });
    this.dispose = () => this.destroy();
    scene.events.once('shutdown', this.dispose);
    scene.events.once('destroy', this.dispose);
  }
  get isOpen() { return !this.destroyed; }
  get root() { return this.shared.root; }
  setSpeaker(speaker = {}) {
    this.speaker = { ...speaker };
    if (this.shared.data) this.shared.data.title = speaker.name;
    const panel = this.shared.panel;
    if (panel) {
      panel.nameText.setText(String(speaker.name ?? '').toUpperCase());
      this.shared.refreshTrust();
      this.drawPreview();
    }
  }
  setText(text, { footer = '', footerColor = '#ffc66d' } = {}) {
    if (this.destroyed) return;
    this.text = String(text ?? ''); this.footer = String(footer ?? ''); this.footerColor = footerColor;
    this.revision++;
    this.shared.seen.clear();
    this.shared.show({ title: this.speaker.name, role: this.footer, text: this.text,
      messages: [{ speaker: 'npc', text: this.text }], choices: this.choices(),
      nodeId: 'pigeon_loft', showTrust: false, scoreTrust: false, depth: 700,
      onDraw: () => this.decorate() });
  }
  choices() {
    const revision = this.revision;
    return this.topics.map((topic, index) => ({ id: topic.id || `pigeon_topic:${index}`,
      label: topic.label, disabled: topic.state === 'disabled', scoreTrust: false,
      state: topic.state === 'accent' ? 'normal' : topic.state || 'normal',
      action: () => {
        if (this.destroyed || revision !== this.revision) return;
        this.triggerTopic(index); this.shared.seen.clear();
      }
    }));
  }
  setTopics(topics = []) {
    if (this.destroyed) return;
    this.topics = topics; this.revision++; this.shared.seen.clear();
    if (this.shared.data) { this.shared.data.choices = this.choices(); this.shared.updateTopics(); }
  }
  setFooter(text, color = '#ffc66d') {
    this.footer = String(text ?? ''); this.footerColor = color;
    if (this.shared.data) this.shared.data.role = this.footer;
    this.drawFooter();
  }
  drawFooter() {
    const panel = this.shared.panel; if (!panel) return;
    panel.roleText.setText(this.footer).setColor(this.footerColor);
    panel._fitWidth(panel.roleText, panel.L.lw, 14 * panel.L.s, 8 * panel.L.s);
  }
  setStamp() {} // Dawna scena wywoływała jedynie setStamp(null) dla grzędy.
  triggerTopic(index) {
    const s = this.scene, topic = this.topics[index];
    if (this.destroyed || s.leaving || s._cleanupDone || s.modal || s.pigeonNameEditor ||
      s.debugMode || !topic || topic.state === 'disabled') return;
    topic.onSelect?.(topic);
  }
  decorate() {
    const panel = this.shared.panel; if (!panel || this.destroyed) return;
    if (panel.blocker?.input) panel.blocker.input.enabled = false;
    panel.byeBtn.text.setText(this.leaveLabel);
    panel.onLeave = () => { if (!this.destroyed) this.onLeave?.(); };
    panel._handleKey = event => this.handleKey(event);
    this.drawFooter(); this.drawPreview();
  }
  handleKey(event) {
    const s = this.scene;
    if (this.destroyed || s.pigeonNameEditor || s.leaving || s._cleanupDone || event.repeat ||
      event.ctrlKey || event.metaKey || event.altKey || event.target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
    if (event.key === 'Escape' || event.key === '0') { this.onLeave?.(); return; }
    const match = /^(?:Digit|Numpad)([1-9])$/.exec(event.code || '') || /^([1-9])$/.exec(event.key || '');
    if (match) { this.triggerTopic(Number(match[1]) - 1); return; }
    if ([' ', 'Enter', 'ArrowRight'].includes(event.key)) this.shared.advance();
    else if (event.key === 'ArrowLeft') this.shared.panel?.previousPage();
    else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') this.shared.panel?._scrollBy(event.key === 'ArrowUp' ? -1 : 1);
    else if (event.code === 'KeyD') s.onKey(event, true);
  }
  drawPreview() {
    this.preview?.destroy(true); this.preview = null;
    const panel = this.shared.panel, p = this.speaker.portrait; if (!panel || !p) return;
    const L = panel.L, side = Math.max(1, Math.min(148 * L.s, L.py - 20 * L.s, L.lw));
    this.preview = this.scene.add.container(L.lx + side / 2, L.py - 12 * L.s - side / 2);
    panel.root.add(this.preview);
    this.preview.add(this.scene.add.rectangle(0, 0, side, side, 0x0b0805, .95)
      .setStrokeStyle(Math.max(1, 2 * L.s), 0x8a6d1f));
    const keys = (p.keys || [p.key]).filter(key => key && this.scene.textures.exists(key));
    if (!keys.length) {
      this.preview.add(this.scene.add.text(0, 0, p.text || '?', {
        fontFamily: 'SpecialElite', fontSize: `${24 * L.s}px`, color: '#ffd86b'
      }).setOrigin(.5)); return;
    }
    // Wszystkie przezroczyste warstwy dostają ten sam kadr z obrazu bazowego.
    const first = this.scene.textures.getFrame(keys[0]);
    const w = first.realWidth || first.width, h = first.realHeight || first.height;
    const crop = Math.max(1, Math.min((p.sideFrac ?? .3) * h, w, h));
    const x = Math.max(0, Math.min(w - crop, (p.cx ?? .5) * w - crop / 2));
    const y = Math.max(0, Math.min(h - crop, (p.cy ?? .5) * h - crop / 2));
    for (const key of keys) {
      this.preview.add(this.scene.add.image(0, 0, key)
        .setOrigin((x + crop / 2) / w, (y + crop / 2) / h)
        .setScale(Math.max(1, side - 12 * L.s) / crop).setCrop(x, y, crop, crop));
    }
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true; this.revision++;
    this.preview?.destroy(true); this.preview = null;
    this.shared.destroy();
    this.scene.events.off('shutdown', this.dispose);
    this.scene.events.off('destroy', this.dispose);
    this.onLeave = null; this.topics = [];
  }
}
