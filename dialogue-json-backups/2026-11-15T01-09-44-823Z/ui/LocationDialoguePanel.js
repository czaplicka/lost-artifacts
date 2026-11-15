// ui/LocationDialoguePanel.js
// Wspólny panel dialogowy w stylu LocationScene: dolny pasek, portret po lewej,
// tekst z efektem maszyny do pisania, menu tematów po prawej, "Leave" na dole.
// Użycie: sklep agencji, dom / gołębnik, mieszkania i każda scena z rozmową.

export const LOCATION_PANEL = {
  GOLD: 0xd4af37,
  GOLD_DIM: 0x8a6d1f,
  BG: 0x201409,
  TEXT: '#f4ecd8',
  NAME: '#ffd86b',
  TOPIC: '#ffd86b',
  TOPIC_USED: '#7a7160',
  TOPIC_ACCENT: '#ffe9a8',
  LEAVE: '#d4af37',
  AMBER: '#ffc66d',
  RED: '#ff7a6b',
  GREEN: '#85d4a4'
};

const P = LOCATION_PANEL;

// Złota podwójna ramka na brązowym tle - ten sam wygląd co panel rozmów.
export function goldPlate(g, x, y, w, h, alpha = 0.92) {
  g.fillStyle(0x000000, 0.35); g.fillRect(x + 4, y + 5, w, h);
  g.fillStyle(P.BG, alpha); g.fillRect(x, y, w, h);
  g.lineStyle(3, P.GOLD, 1); g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  g.lineStyle(1, P.GOLD_DIM, 0.9); g.strokeRect(x + 6, y + 6, w - 12, h - 12);
}

export class LocationDialoguePanel {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} options
   *   depth, menuWidth, leaveLabel, onLeave
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = { depth: 700, menuWidth: 205, leaveLabel: 'Leave', onLeave: null, ...options };
    this.destroyed = false;
    this.typewriter = null;
    this.isTyping = false;
    this.fullText = '';
    this.topics = [];
    this.topicObjects = [];
    this.portraitObjects = [];
    this.stamp = null;
    this.nameText = null;
    this.firstSpeaker = true;
    this.build();
  }

  // ---------------------------------------------------------------------------
  build() {
    const s = this.scene, o = this.options;
    const { width, height } = s.scale;
    const panelHeight = 232, panelY = height - panelHeight, portraitSize = 190;
    const portraitX = 18, portraitY = panelY + 12;
    const centerX = portraitX + portraitSize / 2, centerY = portraitY + portraitSize / 2;
    const textX = portraitX + portraitSize + 30;
    const menuWidth = o.menuWidth, textEndX = width - menuWidth - 20;
    this.layout = { width, height, panelHeight, panelY, portraitSize, portraitX, portraitY,
      centerX, centerY, textX, menuWidth, textEndX };

    const root = s.add.container(0, 0).setDepth(o.depth);
    this.root = root;

    // tło (blokuje kliknięcia w scenę pod spodem)
    this.background = s.add.rectangle(0, panelY, width, panelHeight, P.BG, 0.92).setOrigin(0).setInteractive();

    // złote ramki jak w LocationScene
    this.border = s.add.graphics();
    this.border.lineStyle(4, P.GOLD, 1);
    this.border.strokeRect(6, panelY + 6, width - 12, panelHeight - 12);
    this.border.lineStyle(1, P.GOLD_DIM, 0.9);
    this.border.strokeRect(12, panelY + 12, width - 24, panelHeight - 24);
    this.border.lineStyle(1, P.GOLD_DIM, 0.6);
    this.border.lineBetween(textEndX, panelY + 16, textEndX, panelY + panelHeight - 16);

    // ramka portretu
    this.portraitFrame = s.add.graphics();
    this.portraitFrame.fillStyle(0x0b0805, 1);
    this.portraitFrame.fillRect(portraitX, portraitY, portraitSize, portraitSize);
    this.portraitFrame.lineStyle(2, P.GOLD_DIM, 1);
    this.portraitFrame.strokeRect(portraitX, portraitY, portraitSize, portraitSize);

    // tekst rozmowy (klik = dokończ pisanie)
    this.text = s.add.text(textX, panelY + 26, '', {
      fontFamily: 'SpecialElite', fontSize: '22px', color: P.TEXT, lineSpacing: 6,
      wordWrap: { width: Math.max(80, textEndX - textX - 20) }
    }).setInteractive();
    this.text.on('pointerdown', () => { if (this.isTyping) this.completeTypewriter(); });
    this.dialogueMaxHeight = panelHeight - 52;

    // linia statusu (cena, saldo) pod tekstem
    this.footer = s.add.text(textX, panelY + panelHeight - 46, '', {
      fontFamily: 'PressStart2P', fontSize: '13px', color: P.AMBER,
      wordWrap: { width: Math.max(80, textEndX - textX - 20) }
    }).setVisible(false);

    this.leaveButton = null;
    root.add([this.background, this.border, this.portraitFrame, this.text, this.footer]);
    this.createLeaveButton();

    root.setAlpha(0).setY(36);
    s.tweens.add({ targets: root, y: 0, alpha: 1, duration: 220, ease: 'Cubic.easeOut' });
  }

  get isOpen() { return !this.destroyed && Boolean(this.root?.active); }

  // ---------------------------------------------------------------------------
  // PORTRET + NAZWA
  // ---------------------------------------------------------------------------
  clearPortrait() {
    for (const object of this.portraitObjects) {
      if (!object) continue;
      this.scene.tweens.killTweensOf(object);
      object.destroy();
    }
    this.portraitObjects = [];
    this.nameText?.destroy(); this.nameText = null;
    this.clearStamp();
  }

  /**
   * portrait:
   *  { kind: 'crop', key, cx, cy, sideFrac }  kadr z tekstury (cx, cy = środek 0..1, sideFrac = bok / wysokość tekstury)
   *  { kind: 'texture', key }                  cały obraz (jak portret NPC w LocationScene)
   *  { kind: 'emoji', text }                   awaryjnie, gdy brak tekstury
   */
  setSpeaker({ name = '', portrait = null } = {}) {
    if (!this.isOpen) return;
    this.clearPortrait();
    const s = this.scene, L = this.layout, inner = L.portraitSize - 12;
    let visual = null, extras = [];

    const cropKeys = (portrait?.kind === 'crop' ? (portrait.keys ?? [portrait.key]) : []).filter(k => k && s.textures.exists(k));
    if (cropKeys.length) {
      // kadr z jednej lub kilku warstw o tym samym rozmiarze (np. tło + gołąb)
      const frame = s.textures.getFrame(cropKeys[0]);
      const tw = frame.realWidth || frame.width, th = frame.realHeight || frame.height;
      const side = Math.min(Math.max(8, portrait.sideFrac * th), tw, th);
      const x0 = Phaser.Math.Clamp(portrait.cx * tw - side / 2, 0, tw - side);
      const y0 = Phaser.Math.Clamp(portrait.cy * th - side / 2, 0, th - side);
      const layers = cropKeys.map(k => s.add.image(L.centerX, L.centerY, k)
        .setOrigin((x0 + side / 2) / tw, (y0 + side / 2) / th)
        .setScale(inner / side)
        .setCrop(x0, y0, side, side));
      visual = layers[0]; extras = layers.slice(1);
    } else if (portrait?.kind === 'texture' && s.textures.exists(portrait.key)) {
      visual = s.add.image(L.centerX, L.centerY, portrait.key);
      const frame = visual.frame, fw = frame.realWidth || frame.width, fh = frame.realHeight || frame.height;
      if (fw > 0 && fh > 0) visual.setScale(Math.min(inner / fw, inner / fh));
      else visual.setDisplaySize(inner, inner);
    } else {
      visual = s.add.text(L.centerX, L.centerY, portrait?.text || '?', {
        fontFamily: 'PressStart2P', fontSize: '72px', color: '#d4af37'
      }).setOrigin(0.5);
    }
    this.portraitObjects.push(visual, ...extras);

    this.nameText = s.add.text(L.centerX, L.portraitY + L.portraitSize + 8, name, {
      fontFamily: 'PressStart2P', fontSize: '12px', color: P.NAME,
      align: 'center', wordWrap: { width: L.portraitSize + 20 }
    }).setOrigin(0.5, 0);
    this.root.add([...this.portraitObjects, this.nameText]);

    // wejście portretu jak w LocationScene (pierwszy raz) / szybkie wygaszenie (kolejne)
    const visuals = this.portraitObjects.filter(o => o !== this.nameText);
    visuals.forEach(o => { o.alpha = 0; });
    if (this.firstSpeaker) {
      visuals.forEach(o => { o.x = L.centerX - 90; });
      s.tweens.add({ targets: visuals, x: L.centerX, alpha: 1, duration: 480, delay: 120, ease: 'Back.Out' });
      this.nameText.alpha = 0;
      s.tweens.add({ targets: this.nameText, alpha: 1, duration: 260, delay: 480 });
      this.firstSpeaker = false;
    } else {
      s.tweens.add({ targets: visuals, alpha: 1, duration: 160 });
    }
  }

  // pieczątka na portrecie (np. OWNED, PAID)
  setStamp(text, { slam = false, color = P.GREEN, colorInt = 0x85d4a4 } = {}) {
    if (!this.isOpen) return;
    this.clearStamp();
    const s = this.scene, L = this.layout;
    const label = s.add.text(0, 1, text, { fontFamily: 'PressStart2P', fontSize: '12px', color }).setOrigin(0.5);
    const w = label.width + 26, h = label.height + 18;
    const g = s.add.graphics();
    g.fillStyle(0x0b0805, 0.78); g.fillRect(-w / 2, -h / 2, w, h);
    g.lineStyle(3, colorInt, 1); g.strokeRect(-w / 2, -h / 2, w, h);
    g.lineStyle(1, colorInt, 0.7); g.strokeRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
    const stamp = s.add.container(L.centerX, L.portraitY + L.portraitSize - 38, [g, label]).setAngle(-9);
    this.root.add(stamp);
    this.stamp = stamp;
    if (slam) {
      stamp.setScale(2.6).setAlpha(0);
      s.tweens.add({ targets: stamp, scale: 1, alpha: 1, duration: 180, ease: 'Cubic.easeIn',
        onComplete: () => { if (stamp.active) s.cameras.main.shake(100, 0.002); } });
    } else {
      stamp.setAlpha(0.92);
    }
  }

  clearStamp() {
    if (this.stamp) { this.scene.tweens.killTweensOf(this.stamp); this.stamp.destroy(); }
    this.stamp = null;
  }

  // ---------------------------------------------------------------------------
  // TEKST (maszyna do pisania jak w LocationScene)
  // ---------------------------------------------------------------------------
  setText(value, { footer = '', footerColor = P.AMBER } = {}) {
    if (!this.isOpen) return;
    this.stopTypewriter();
    this.fullText = String(value ?? '');
    this.setFooter(footer, footerColor);
    const maxHeight = footer ? this.layout.panelHeight - 96 : this.layout.panelHeight - 52;
    this.text.setFontSize(22).setText(this.fullText);
    while (this.text.height > maxHeight && parseInt(this.text.style.fontSize, 10) > 13) {
      this.text.setFontSize(parseInt(this.text.style.fontSize, 10) - 1);
    }
    this.text.setText('');
    if (!this.fullText.length) return;
    let index = 0;
    this.isTyping = true;
    this.typewriter = this.scene.time.addEvent({ delay: 54, loop: true, callback: () => {
      if (!this.isOpen) { this.stopTypewriter(); return; }
      index = Math.min(index + 3, this.fullText.length);
      this.text.setText(this.fullText.slice(0, index));
      if (index >= this.fullText.length) this.stopTypewriter();
    } });
  }

  setFooter(value, color = P.AMBER) {
    if (!this.isOpen) return;
    this.footer.setText(value || '').setColor(color).setVisible(Boolean(value));
  }

  stopTypewriter() {
    this.typewriter?.remove(false);
    this.typewriter = null;
    this.isTyping = false;
  }

  completeTypewriter() {
    this.stopTypewriter();
    if (this.isOpen) this.text.setText(this.fullText);
  }

  // ---------------------------------------------------------------------------
  // MENU TEMATÓW + LEAVE
  // topics: [{ id, label, state: 'normal' | 'used' | 'disabled' | 'accent', onSelect }]
  // ---------------------------------------------------------------------------
  setTopics(topics = []) {
    if (!this.isOpen) return;
    const s = this.scene, L = this.layout;
    for (const item of this.topicObjects) { s.tweens.killTweensOf(item); item.destroy(); }
    this.topicObjects = [];
    this.topics = topics;

    const menuX = L.width - L.menuWidth + 10;
    const top = L.panelY + 21;
    const step = Math.min(29, (L.panelHeight - 78) / Math.max(1, topics.length));
    const colorFor = state => state === 'used' || state === 'disabled' ? P.TOPIC_USED
      : state === 'accent' ? P.TOPIC_ACCENT : P.TOPIC;

    topics.forEach((topic, index) => {
      const base = colorFor(topic.state);
      const button = s.add.text(menuX, top + index * step, topic.label, {
        fontFamily: 'SpecialElite', fontSize: `${Math.min(18, Math.max(11, step - 4))}px`, color: base
      }).setInteractive({ useHandCursor: true });
      if (button.width > L.menuWidth - 22) button.setScale((L.menuWidth - 22) / button.width);
      button.on('pointerover', () => button.setColor('#ffffff'));
      button.on('pointerout', () => button.setColor(base));
      button.on('pointerdown', () => { if (this.isOpen) topic.onSelect?.(topic); });
      this.root.add(button);
      this.topicObjects.push(button);
    });
  }

  triggerTopic(index) {
    const topic = this.topics[index];
    if (this.isOpen && topic) topic.onSelect?.(topic);
  }

  createLeaveButton() {
    const s = this.scene, L = this.layout;
    this.leaveButton?.destroy();
    const menuX = L.width - L.menuWidth + 10;
    this.leaveButton = s.add.text(menuX, L.panelY + L.panelHeight - 34, this.options.leaveLabel, {
      fontFamily: 'SpecialElite', fontSize: '18px', color: P.LEAVE
    }).setInteractive({ useHandCursor: true });
    this.leaveButton.on('pointerover', () => this.leaveButton?.setColor('#ffffff'));
    this.leaveButton.on('pointerout', () => this.leaveButton?.setColor(P.LEAVE));
    this.leaveButton.on('pointerdown', () => { if (this.isOpen) this.options.onLeave?.(); });
    this.root.add(this.leaveButton);
  }

  // ---------------------------------------------------------------------------
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopTypewriter();
    const s = this.scene;
    if (s?.tweens) {
      for (const object of [this.root, this.stamp, this.nameText, ...this.portraitObjects, ...this.topicObjects]) {
        if (object) s.tweens.killTweensOf(object);
      }
    }
    this.root?.destroy();
    this.root = null; this.text = null; this.footer = null; this.leaveButton = null;
    this.nameText = null; this.stamp = null; this.portraitObjects = []; this.topicObjects = []; this.topics = [];
  }
}