import { dialogueText } from '../dialogues/DialogueText.js';

export const LOCATION_PANEL = {
  GOLD: 0xd4af37, GOLD_DIM: 0x8a6d1f, BG: 0x201409,
  TEXT: '#f4ecd8', NAME: '#ffd86b', TOPIC: '#ffd86b',
  TOPIC_USED: '#7a7160', TOPIC_ACCENT: '#ffe9a8', LEAVE: '#d4af37',
  AMBER: '#ffc66d', RED: '#ff7a6b', GREEN: '#85d4a4'
};
const P = LOCATION_PANEL;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export function goldPlate(g, x, y, w, h, alpha = .92) {
  g.fillStyle(0x000000, .35).fillRect(x + 4, y + 5, w, h);
  g.fillStyle(P.BG, alpha).fillRect(x, y, w, h);
  g.lineStyle(3, P.GOLD, 1).strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  g.lineStyle(1, P.GOLD_DIM, .9).strokeRect(x + 6, y + 6, w - 12, h - 12);
}

// One renderer for face-to-face conversations. Existing shop/loft API is retained.
export class LocationDialoguePanel {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = { depth: 700, menuWidth: 205,
      leaveLabel: dialogueText('ui/LocationDialoguePanel.js', 't_fc6e4a408d56be9670c1'),
      onLeave: null, modal: false, keyboard: false, lockTopicsUntilRead: false,
      onAdvance: null, onTextComplete: null, onPageChange: null, onMenuPageChange: null,
      ...options };
    this.destroyed = false;
    this.fullText = '';
    this.footerValue = '';
    this.footerColor = P.AMBER;
    this.textPage = 0;
    this.choicePage = 0;
    this.textPages = [];
    this.topics = [];
    this.pageTopics = [];
    this.topicObjects = [];
    this.portraitObjects = [];
    this.speaker = { name: '', portrait: null };
    this.stampData = null;
    this.stamp = null;
    this.typewriter = null;
    this.isTyping = false;
    this.pageRead = false;
    this.resize = () => this.relayout();
    this.shutdown = () => this.destroy();
    this.keyHandler = event => this.onKeyDown(event);
    this.build();
    scene.scale.on('resize', this.resize);
    scene.events.once('shutdown', this.shutdown);
    scene.events.once('destroy', this.shutdown);
    if (this.options.keyboard) scene.input.keyboard?.on('keydown', this.keyHandler);
  }
  get isOpen() { return !this.destroyed && Boolean(this.root?.active); }
  makeText(x, y, value, size = 18, color = P.TEXT, pixel = false) {
    const text = this.scene.add.text(x, y, value, {
      fontFamily: pixel ? 'PressStart2P' : 'SpecialElite', fontSize: `${size}px`,
      color, lineSpacing: pixel ? 3 : 6
    });
    this.root.add(text);
    return text;
  }
  build() {
    const s = this.scene;
    this.root = s.add.container(0, 0).setDepth(this.options.depth).setScrollFactor(0);
    this.overlay = s.add.rectangle(0, 0, 1, 1, 0x000000, 0).setOrigin(0);
    this.root.add(this.overlay);
    if (this.options.modal) {
      this.overlay.setInteractive().on('pointerdown', (_p, _x, _y, event) => event?.stopPropagation());
    }
    this.background = s.add.rectangle(0, 0, 1, 1, P.BG, .96).setOrigin(0).setInteractive();
    this.background.on('pointerdown', (_p, _x, _y, event) => {
      event?.stopPropagation(); this.advance();
    });
    this.border = s.add.graphics();
    this.portraitFrame = s.add.graphics();
    this.root.add([this.background, this.border, this.portraitFrame]);
    this.text = this.makeText(0, 0, '', 22);
    this.footer = this.makeText(0, 0, '', 13, P.AMBER, true).setVisible(false);
    this.previousText = this.makeText(0, 0, '<', 18, P.LEAVE);
    this.pageLabel = this.makeText(0, 0, '', 15, P.LEAVE);
    this.nextText = this.makeText(0, 0, '>', 18, P.LEAVE);
    this.previousText.setInteractive({ useHandCursor: true }).on('pointerdown', (_p, _x, _y, e) => {
      e?.stopPropagation(); this.setTextPage(this.textPage - 1);
    });
    this.nextText.setInteractive({ useHandCursor: true }).on('pointerdown', (_p, _x, _y, e) => {
      e?.stopPropagation(); this.advance();
    });
    this.leaveButton = this.makeText(0, 0, this.options.leaveLabel, 18, P.LEAVE);
    this.leaveButton.setInteractive({ useHandCursor: true });
    this.leaveButton.on('pointerover', () => this.leaveButton?.setColor('#ffffff'));
    this.leaveButton.on('pointerout', () => this.leaveButton?.setColor(P.LEAVE));
    this.leaveButton.on('pointerdown', (_p, _x, _y, e) => {
      e?.stopPropagation(); if (this.isOpen) this.options.onLeave?.();
    });
    this.relayout();
  }
  relayout() {
    if (!this.isOpen) return;
    const oldOffset = this.textPages[this.textPage]?.start || 0;
    const { width: w, height: h } = this.scene.scale;
    const small = w < 700;
    const ph = Math.min(h, small ? 340 : 232), y = h - ph;
    const pad = small ? 14 : 18;
    const portrait = small ? Math.min(64, w * .17) : Math.min(190, w * .17, ph - 42);
    const menu = Math.min(this.options.menuWidth, small ? Math.max(116, w * .35) : w * .28);
    const divider = w - menu - 20;
    const textX = pad + portrait + (small ? 12 : 30);
    const textEndX = divider;
    this.layout = { width: w, height: h, panelHeight: ph, panelY: y,
      portraitSize: portrait, portraitX: pad, portraitY: y + 12,
      centerX: pad + portrait / 2, centerY: y + 12 + portrait / 2,
      textX, textEndX, menuWidth: menu, menuX: divider + 16,
      textWidth: Math.max(16, textEndX - textX - 16), font: small ? 17 : 22 };
    this.overlay.setSize(w, h);
    this.background.setPosition(0, y).setSize(w, ph);
    this.border.clear();
    this.border.lineStyle(4, P.GOLD, 1).strokeRect(6, y + 6, Math.max(1, w - 12), Math.max(1, ph - 12));
    this.border.lineStyle(1, P.GOLD_DIM, .9).strokeRect(12, y + 12, Math.max(1, w - 24), Math.max(1, ph - 24));
    this.border.lineBetween(divider, y + 16, divider, h - 16);
    this.portraitFrame.clear().fillStyle(0x0b0805, 1).fillRect(pad, y + 12, portrait, portrait);
    this.portraitFrame.lineStyle(2, P.GOLD_DIM, 1).strokeRect(pad, y + 12, portrait, portrait);
    this.text.setPosition(textX, y + 26).setFontSize(this.layout.font)
      .setWordWrapWidth(this.layout.textWidth, true).setScale(1);
    this.footer.setPosition(textX, h - 72).setFontSize(small ? 9 : 11)
      .setWordWrapWidth(this.layout.textWidth, true);
    this.previousText.setPosition(textX, h - 37);
    this.pageLabel.setPosition(textX + 28, h - 37);
    this.nextText.setPosition(divider - 24, h - 37);
    this.leaveButton.setPosition(divider + 16, h - 37).setFontSize(small ? 16 : 18);
    this.leaveButton.setText(this.options.leaveLabel);
    this.leaveButton.setScale(Math.min(1, Math.max(1, menu - 18) / Math.max(1, this.leaveButton.width)));
    this.renderSpeaker();
    this.repaginate(oldOffset);
    this.renderPage(true);
    this.renderTopics();
  }
  repaginate(offset = 0) {
    const L = this.layout;
    const footerReserve = this.footerValue ? 45 : 0;
    this.dialogueMaxHeight = Math.max(L.font + 6, L.panelHeight - 80 - footerReserve);
    const tokens = this.fullText.match(/\S+\s*/g) || [''];
    this.textPages = [];
    let start = 0, charOffset = 0;
    while (start < tokens.length) {
      let low = start + 1, high = tokens.length, best = start + 1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        this.text.setText(tokens.slice(start, mid).join('').trim());
        if (this.text.height <= this.dialogueMaxHeight) { best = mid; low = mid + 1; }
        else high = mid - 1;
      }
      const raw = tokens.slice(start, best).join('');
      this.textPages.push({ text: raw.trim(), start: charOffset, end: charOffset + raw.length });
      start = best; charOffset += raw.length;
    }
    const match = this.textPages.findIndex((p, index) => offset >= p.start &&
      (offset < p.end || index === this.textPages.length - 1));
    this.textPage = match < 0 ? 0 : match;
  }
  setText(value, { footer = '', footerColor = P.AMBER, instant = false } = {}) {
    if (!this.isOpen) return;
    this.stopTypewriter();
    this.fullText = String(value ?? '');
    this.footerValue = String(footer ?? '');
    this.footerColor = footerColor;
    this.footer.setText(this.footerValue).setColor(footerColor).setVisible(Boolean(this.footerValue));
    this.textPage = 0;
    this.repaginate(0);
    this.renderPage(instant);
  }
  setFooter(value, color = P.AMBER) {
    if (!this.isOpen) return;
    const offset = this.textPages[this.textPage]?.start || 0;
    this.footerValue = String(value ?? ''); this.footerColor = color;
    this.footer.setText(this.footerValue).setColor(color).setVisible(Boolean(this.footerValue));
    this.repaginate(offset); this.renderPage(true);
  }
  renderPage(instant = false) {
    if (!this.isOpen) return;
    this.stopTypewriter();
    this.pageRead = false;
    this.pageText = this.text.getWrappedText(this.textPages[this.textPage]?.text || '').join('\n');
    this.text.setText(this.pageText);
    if (this.text.height > this.dialogueMaxHeight) this.text.setScale(this.dialogueMaxHeight / this.text.height);
    else this.text.setScale(1);
    this.updatePager();
    if (instant || this.pageText.length < 2) { this.finishPage(); return; }
    this.text.setText(''); this.isTyping = true;
    this.renderTopics();
    let index = 0;
    this.typewriter = this.scene.time.addEvent({ delay: 54, loop: true, callback: () => {
      if (!this.isOpen) { this.stopTypewriter(); return; }
      index = Math.min(index + 3, this.pageText.length);
      this.text.setText(this.pageText.slice(0, index));
      if (index >= this.pageText.length) this.finishPage();
    } });
  }
  finishPage() {
    if (!this.isOpen) return;
    this.stopTypewriter();
    this.text.setText(this.pageText || '');
    const notify = !this.pageRead;
    this.pageRead = true;
    this.updatePager(); this.renderTopics();
    if (notify) this.options.onTextComplete?.({ lastPage: this.textPage === this.textPages.length - 1,
      page: this.textPage, total: this.textPages.length });
  }
  stopTypewriter() { this.typewriter?.remove(false); this.typewriter = null; this.isTyping = false; }
  completeTypewriter() { this.finishPage(); }
  advance() {
    if (!this.isOpen) return false;
    if (this.isTyping) { this.completeTypewriter(); return true; }
    if (this.textPage < this.textPages.length - 1) { this.setTextPage(this.textPage + 1); return true; }
    this.options.onAdvance?.();
    return false;
  }
  setTextPage(index) {
    if (!this.isOpen || index < 0 || index >= this.textPages.length) return;
    this.textPage = index; this.renderPage(); this.options.onPageChange?.(index);
  }
  updatePager() {
    if (!this.isOpen) return;
    this.previousText.setVisible(this.textPage > 0);
    this.pageLabel.setText(this.textPages.length > 1 ? `${this.textPage + 1}/${this.textPages.length}` : '');
    this.nextText.setVisible(this.textPage < this.textPages.length - 1);
  }
  clearPortrait() {
    for (const object of this.portraitObjects) { this.scene.tweens.killTweensOf(object); object.destroy(); }
    this.portraitObjects = [];
    this.nameText?.destroy(); this.nameText = null;
    this.clearStamp();
  }
  setSpeaker({ name = '', portrait = null } = {}) {
    if (!this.isOpen) return;
    const signature = JSON.stringify({ name, portrait });
    if (signature === this.speakerSignature) return;
    this.speakerSignature = signature;
    this.stampData = null;
    this.speaker = { name, portrait };
    this.renderSpeaker();
  }
  renderSpeaker() {
    if (!this.isOpen) return;
    const savedStamp = this.stampData;
    this.clearPortrait();
    const s = this.scene, L = this.layout, p = this.speaker.portrait;
    const inner = Math.max(1, L.portraitSize - 12);
    let keys = p?.kind === 'crop' ? p.keys || [p.key] : [];
    keys = keys.filter(key => key && s.textures.exists(key));
    if (keys.length) {
      const frame = s.textures.getFrame(keys[0]);
      const tw = frame.realWidth || frame.width, th = frame.realHeight || frame.height;
      const side = clamp((p.sideFrac ?? .3) * th, 1, Math.min(tw, th));
      const x = clamp((p.cx ?? .5) * tw - side / 2, 0, tw - side);
      const y = clamp((p.cy ?? .5) * th - side / 2, 0, th - side);
      for (const key of keys) this.portraitObjects.push(s.add.image(L.centerX, L.centerY, key)
        .setOrigin((x + side / 2) / tw, (y + side / 2) / th).setScale(inner / side).setCrop(x, y, side, side));
    } else {
      const requested = p?.kind === 'texture' ? p.key : null;
      const key = requested && s.textures.exists(requested) ? requested :
        p?.kind !== 'emoji' && s.textures.exists('portrait_fallback') ? 'portrait_fallback' : null;
      if (key) {
        const image = s.add.image(L.centerX, L.centerY, key);
        const fw = image.frame.realWidth || image.frame.width, fh = image.frame.realHeight || image.frame.height;
        image.setScale(inner / Math.max(1, fw, fh));
        this.portraitObjects.push(image);
      } else this.portraitObjects.push(s.add.text(L.centerX, L.centerY, p?.text || '?', {
        fontFamily: 'PressStart2P', fontSize: `${Math.max(14, inner * .4)}px`, color: P.NAME
      }).setOrigin(.5));
    }
    this.nameText = s.add.text(L.centerX, L.portraitY + L.portraitSize + 5, this.speaker.name, {
      fontFamily: 'PressStart2P', fontSize: L.width < 700 ? '8px' : '10px', color: P.NAME,
      align: 'center', wordWrap: { width: L.portraitSize + 10 }
    }).setOrigin(.5, 0);
    const available = Math.max(20, L.height - this.nameText.y - 8);
    if (this.nameText.height > available) this.nameText.setScale(available / this.nameText.height);
    this.root.add([...this.portraitObjects, this.nameText]);
    if (savedStamp) this.setStamp(savedStamp.text, { ...savedStamp.options, slam: false });
  }
  setStamp(text, options = {}) {
    if (!this.isOpen) return;
    this.clearStamp();
    if (text == null || text === '') return;
    this.stampData = { text, options };
    const { slam = false, color = P.GREEN, colorInt = 0x85d4a4 } = options;
    const L = this.layout, s = this.scene;
    const label = s.add.text(0, 0, text, { fontFamily: 'PressStart2P', fontSize: '10px', color }).setOrigin(.5);
    const w = Math.min(L.portraitSize, label.width + 20), h = label.height + 16;
    if (label.width > w - 12) label.setScale((w - 12) / label.width);
    const g = s.add.graphics();
    g.fillStyle(0x0b0805, .8).fillRect(-w / 2, -h / 2, w, h);
    g.lineStyle(2, colorInt, 1).strokeRect(-w / 2, -h / 2, w, h);
    this.stamp = s.add.container(L.centerX, L.portraitY + L.portraitSize - 20, [g, label]).setAngle(-9);
    this.root.add(this.stamp);
    if (slam) {
      this.stamp.setScale(2).setAlpha(0);
      s.tweens.add({ targets: this.stamp, scale: 1, alpha: 1, duration: 180, ease: 'Cubic.easeIn' });
    }
  }
  clearStamp() {
    if (this.stamp) { this.scene.tweens.killTweensOf(this.stamp); this.stamp.destroy(); }
    this.stamp = null; this.stampData = null;
  }
  setTopics(topics = [], { preservePage = false } = {}) {
    if (!this.isOpen) return;
    this.topics = topics;
    if (!preservePage) this.choicePage = 0;
    this.renderTopics();
  }
  topicsLocked() {
    return this.options.lockTopicsUntilRead && (this.isTyping || this.textPage < this.textPages.length - 1);
  }
  clearTopics() {
    for (const object of this.topicObjects) { this.scene.tweens.killTweensOf(object); object.destroy(); }
    this.topicObjects = []; this.pageTopics = [];
  }
  renderTopics() {
    if (!this.isOpen || !this.layout) return;
    this.clearTopics();
    const L = this.layout, s = this.scene, width = Math.max(20, L.menuWidth - 22);
    const available = Math.max(24, L.panelHeight - 108), groups = [[]];
    let used = 0;
    for (const topic of this.topics) {
      let size = L.width < 700 ? 15 : 18;
      const measure = s.add.text(0, 0, String(topic.label ?? ''), {
        fontFamily: 'SpecialElite', fontSize: `${size}px`, lineSpacing: 3, wordWrap: { width }
      });
      while (measure.height + 8 > available && size > 11) measure.setFontSize(--size);
      const height = Math.min(available, Math.max(26, measure.height + 8));
      measure.destroy();
      if (groups.at(-1).length && used + height > available) { groups.push([]); used = 0; }
      groups.at(-1).push({ topic, height, size }); used += height;
    }
    this.choicePage = clamp(this.choicePage, 0, groups.length - 1);
    let y = L.panelY + 21;
    const locked = this.topicsLocked();
    for (const { topic, height, size } of groups[this.choicePage]) {
      const disabled = locked || topic.state === 'disabled';
      const color = disabled || topic.state === 'used' ? P.TOPIC_USED : topic.state === 'accent' ? P.TOPIC_ACCENT : P.TOPIC;
      const label = this.makeText(L.menuX, y, String(topic.label ?? ''), size, color).setWordWrapWidth(width);
      if (label.height > height - 4) label.setScale((height - 4) / label.height);
      if (!disabled) {
        label.setInteractive({ useHandCursor: true });
        label.on('pointerover', () => label.setColor('#ffffff'));
        label.on('pointerout', () => label.setColor(color));
        label.on('pointerdown', (_p, _x, _y, event) => {
          event?.stopPropagation(); if (this.isOpen && !this.topicsLocked()) topic.onSelect?.(topic);
        });
      }
      this.topicObjects.push(label); this.pageTopics.push(topic); y += height;
    }
    if (groups.length > 1) {
      const prev = this.makeText(L.menuX, L.height - 70, '<', 18, P.LEAVE);
      const counter = this.makeText(L.menuX + 25, L.height - 70, `${this.choicePage + 1}/${groups.length}`, 14, P.LEAVE);
      const next = this.makeText(L.width - 36, L.height - 70, '>', 18, P.LEAVE);
      const change = delta => {
        this.choicePage = (this.choicePage + delta + groups.length) % groups.length;
        this.renderTopics(); this.options.onMenuPageChange?.(this.choicePage);
      };
      prev.setInteractive({ useHandCursor: true }).on('pointerdown', (_p, _x, _y, e) => { e?.stopPropagation(); change(-1); });
      next.setInteractive({ useHandCursor: true }).on('pointerdown', (_p, _x, _y, e) => { e?.stopPropagation(); change(1); });
      this.topicObjects.push(prev, counter, next);
    }
  }
  triggerTopic(index) {
    const topic = this.topics[index];
    if (this.isOpen && !this.topicsLocked() && topic && topic.state !== 'disabled') topic.onSelect?.(topic);
  }
  createLeaveButton() { if (this.isOpen) this.leaveButton.setText(this.options.leaveLabel); }
  onKeyDown(event) {
    if (!this.isOpen || event.repeat) return;
    const target = event.target;
    if (event.ctrlKey || event.metaKey || event.altKey || target?.isContentEditable ||
      ['INPUT','TEXTAREA','SELECT'].includes(target?.tagName)) return;
    if (event.code === 'Escape') { event.preventDefault(); this.options.onLeave?.(); return; }
    if (['Space','Enter','NumpadEnter'].includes(event.code)) { event.preventDefault(); this.advance(); return; }
    const match = /^(?:Digit|Numpad)([1-9])$/.exec(event.code);
    if (!match) return;
    event.preventDefault();
    if (this.isTyping) { this.completeTypewriter(); return; }
    const topic = this.pageTopics[Number(match[1]) - 1];
    if (topic && topic.state !== 'disabled' && !this.topicsLocked()) topic.onSelect?.(topic);
  }
  destroy() {
    if (this.destroyed) return;
    this.stopTypewriter();
    this.scene.scale.off('resize', this.resize);
    this.scene.events.off('shutdown', this.shutdown);
    this.scene.events.off('destroy', this.shutdown);
    this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.clearTopics(); this.clearPortrait();
    this.destroyed = true;
    this.scene.tweens.killTweensOf(this.root);
    this.root?.destroy(true); this.root = null;
  }
}
