import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { W, H, ORDER, LOCAL, P, FONT, BEAM, BEAM_CENTER, WINDOW_FLY, LINES, pick, timeText, goldPlate } from './PigeonLoftData.js';
import { getPigeonLoft } from '../../managers/PigeonManager.js';
import { PIGEON_COLLECTIONS } from '../../config/pigeonConfig.js';
import { addExitImageButton } from '../../ui/ExitImageButton.js';

export const pigeonLoftView = {
  frame() {
    if (!this.textures.exists('attic')) return { x: 0, y: 0, w: W, h: H };
    const source = this.textures.get('attic').getSourceImage(), scale = Math.min(W / source.width, H / source.height);
    return { x: (W - source.width * scale) / 2, y: (H - source.height * scale) / 2, w: source.width * scale, h: source.height * scale };
  },
  art(key) {
    if (!this.textures.exists(key)) return null;
    const f = this.artFrame, image = this.add.image(f.x, f.y, key).setOrigin(0).setDisplaySize(f.w, f.h);
    this.layer.add(image); return image;
  },
  artPigeon(key, phase) {
    if (!this.textures.exists(key)) return null;
    const f = this.artFrame, b = this.alphaBounds(key);
    const px = b ? b.x : 0.5, py = b ? b.y + b.h / 2 : 1;
    const image = this.add.image(f.x + px * f.w, f.y + py * f.h, key).setOrigin(px, py).setDisplaySize(f.w, f.h);
    this.layer.add(image); this.animTargets.push(image);
    const base = image.scaleY;
    this.tweens.add({ targets: image, scaleY: { from: base, to: base * 1.03 }, duration: 1100 + phase * 140,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: phase * 230 });
    return image;
  },
  floatArt(key, phase) {
    const image = this.art(key); if (!image) return;
    this.animTargets.push(image);
    this.tweens.add({ targets: image, y: image.y - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: phase * 170 });
  },
  toScreen(x, y) { return { x: this.layer.x + x * this.fit, y: this.layer.y + y * this.fit }; },
  alphaBounds(key) {
    if (this.boundsCache.has(key)) return this.boundsCache.get(key);
    let bounds = null;
    try {
      if (!this.textures.exists(key)) return null;
      const image = this.textures.get(key).getSourceImage(), canvas = document.createElement('canvas');
      canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        if (data[(y * canvas.width + x) * 4 + 3] <= 16) continue;
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      if (maxX >= minX && maxY >= minY && (maxX - minX < canvas.width * 0.95 || maxY - minY < canvas.height * 0.95)) {
        bounds = { x: (minX + maxX + 1) / (2 * canvas.width), y: (minY + maxY + 1) / (2 * canvas.height),
          w: (maxX - minX + 1) / canvas.width, h: (maxY - minY + 1) / canvas.height };
      }
    } catch (error) { console.warn('[PigeonLoft] Configured hotspot:', key, error); }
    this.boundsCache.set(key, bounds); return bounds;
  },
  resolveConfig(cfg) {
    if (cfg.auto === false) return;
    const key = cfg.id === 'feeder' ? 'food_empty' : cfg.id === 'cabinet' ? 'collection_cabinet' : cfg.id;
    const bounds = this.alphaBounds(key); if (!bounds) return;
    const f = this.artFrame;
    Object.assign(cfg, { x: f.x + bounds.x * f.w, y: f.y + bounds.y * f.h,
      w: Math.max(14, bounds.w * f.w), h: Math.max(14, bounds.h * f.h) });
  },
  signature(state) {
    return JSON.stringify({ perches: state.perches, feed: state.feed, collection: state.collection,
      birds: state.birds.map(b => [b.id, b.name, b.status, b.fed, b.flights]) });
  },
  killFx() {
    if (this.animTargets.length) this.tweens.killTweensOf(this.animTargets);
    this.animTargets = []; this.flyEvent?.remove(false); this.flyEvent = null;
    this.beamGfx = null; this.fxGfx = null;
  },
  renderLoft() {
    if (this._cleanupDone) return;
    this.killFx();
    this.layer?.destroy(true); this.hud?.destroy(true); this.modalLayer?.destroy(true);
    this.hotspots = []; this.modalLayer = null; this.debugText = null;
    const sw = this.scale.width, sh = this.scale.height;
    this.fit = Math.min(sw / W, sh / H);
    this.layer = this.add.container((sw - W * this.fit) / 2, (sh - H * this.fit) / 2).setScale(this.fit).setDepth(0);
    this.hud = this.add.container(0, 0).setDepth(100);
    this.artFrame = this.frame(); this.art('attic');
    try { this.state = getPigeonLoft(); }
    catch (error) {
      this.makeExitButton(this.hud, 24, 20);
      this.showToast(error.message, __dialogueText("scenes/PigeonLoftScene.js", "t_ca00fccfb408989eddc4")); return;
    }
    this.buildAtmosphere();
    this.state.slots.forEach((slot, i) => {
      if (!slot.owned) return;
      this.art(`cage${slot.slot}`);
      if (slot.bird && slot.bird.status !== 'flying') this.artPigeon(`p${slot.slot}`, i);
      if (slot.bird?.status === 'ready') this.floatArt(`p${slot.slot}b`, i);
    });
    this.art(this.state.feederFull ? 'food_full' : 'food_empty'); this.art('food'); this.art('collection_cabinet');
    this.configs.forEach(cfg => { this.resolveConfig(cfg); this.createHotspot(cfg); });
    this.buildVignette(sw, sh); this.buildHud();
    if (this.state.birds.some(b => b.status === 'flying')) {
      this.flyEvent = this.time.addEvent({ delay: 7000, loop: true, callback: () => this.spawnFlyer() });
    }
    if (this.modal) this.renderModal();
    if (this.debugMode) this.drawEditorHelp();
    this.refreshDialogueUi();
    this.signatureValue = this.signature(this.state);
  },
  buildVignette(sw, sh) {
    const key = 'pigeon_vignette';
    if (!this.textures.exists(key)) {
      const w = 960, h = 540, tex = this.textures.createCanvas(key, w, h);
      if (tex) {
        const ctx = tex.getContext(), g = ctx.createRadialGradient(w / 2, h * 0.5, h * 0.38, w / 2, h * 0.5, w * 0.62);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, __dialogueText("scenes/PigeonLoftScene.js", "t_e187e6f435ee8cb65c59"));
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); tex.refresh();
      }
    }
    if (this.textures.exists(key)) this.hud.add(this.add.image(sw / 2, sh / 2, key).setDisplaySize(sw, sh));
  },
  buildAtmosphere() {
    this.beamGfx = this.add.graphics(); this.fxGfx = this.add.graphics();
    this.layer.add([this.beamGfx, this.fxGfx]);
  },
  onFxUpdate(time) {
    if (this.leaving || this.debugMode || !this.beamGfx?.active || !this.fxGfx?.active || !this.artFrame) return;
    const f = this.artFrame, t = time / 1000, pulse = 0.5 + 0.5 * Math.sin(t * 0.6);
    const pt = ([fx, fy]) => ({ x: f.x + fx * f.w, y: f.y + fy * f.h });
    this.beamGfx.clear().fillStyle(0xfff0c4, 0.045 + 0.03 * pulse).fillPoints(BEAM.map(pt), true);
    const g = this.fxGfx; g.clear();
    const [c0, c1] = BEAM_CENTER;
    for (let i = 0; i < 26; i++) {
      const p = ((i * 0.381966) + t * (0.012 + (i % 4) * 0.004)) % 1;
      const half = 0.07 + 0.05 * p, offset = (((i * 0.618034) % 1) - 0.5) * 2 * half;
      const cx = c0[0] + (c1[0] - c0[0]) * p + offset, cy = c0[1] + (c1[1] - c0[1]) * p + Math.sin(t * 0.4 + i) * 0.004;
      const q = pt([cx, cy]);
      g.fillStyle(0xfff4cf, Math.sin(p * Math.PI) * 0.4); g.fillCircle(q.x, q.y, 1.1 + (i % 3) * 0.35);
    }
  },
  spawnFlyer() {
    if (!this.layer?.active || this.leaving || !this.artFrame) return;
    const f = this.artFrame, bird = this.add.graphics();
    bird.lineStyle(3, 0x1d2230, 0.85); bird.lineBetween(-14, -7, 0, 0); bird.lineBetween(0, 0, 14, -7);
    bird.setPosition(f.x + WINDOW_FLY.x0 * f.w, f.y + (WINDOW_FLY.y + 0.06) * f.h);
    this.layer.add(bird); this.animTargets.push(bird);
    this.tweens.add({ targets: bird, scaleY: { from: 1, to: -0.4 }, duration: 170, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: bird, x: f.x + WINDOW_FLY.x1 * f.w, y: f.y + (WINDOW_FLY.y - 0.05) * f.h, alpha: { from: 1, to: 0.2 },
      duration: 2600, ease: 'Sine.easeInOut', onComplete: () => { this.tweens.killTweensOf(bird); if (bird.active) bird.destroy(); } });
  },
  makeButton(parent, x, y, label, callback, { size = 13, enabled = true } = {}) {
    const c = this.add.container(x, y), g = this.add.graphics();
    const t = this.add.text(0, 0, label, { fontFamily: FONT.pixel, fontSize: `${size}px`, color: enabled ? P.LEAVE : P.TOPIC_USED }).setOrigin(0, 0.5);
    const padX = 20, padY = 13, w = Math.round(t.width + padX * 2), h = Math.round(t.height + padY * 2);
    t.setPosition(padX, h / 2 + 1);
    const draw = hover => {
      if (!g.active) return;
      g.clear(); goldPlate(g, 0, 0, w, h, hover ? 1 : 0.92);
      if (hover && enabled) { g.fillStyle(0xd4af37, 0.12); g.fillRect(3, 3, w - 6, h - 6); }
    };
    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: enabled });
    hit.on('pointerover', () => { draw(true); if (enabled && t.active) t.setColor('#ffffff'); });
    hit.on('pointerout', () => { draw(false); if (t.active) t.setColor(enabled ? P.LEAVE : P.TOPIC_USED); });
    hit.on('pointerdown', () => { if (enabled && !this.leaving && !this.debugMode) callback(); });
    draw(false); c.add([g, t, hit]); c.btnWidth = w; c.btnHeight = h; parent.add(c); return c;
  },
  makeExitButton(parent, x, y) {
    const h = 42, w = Math.round(h * 2.5), c = this.add.container(x, y);
    const button = addExitImageButton(this, { x: 0, y: 0, width: w, depth: 0, onClick: () => {
      if (!this.leaving && !this.debugMode) void this.exitLoft();
    } });
    c.add(button); c.btnWidth = w; c.btnHeight = h; parent.add(c); return c;
  },
  buildHud() {
    const hud = this.hud, state = this.state;
    let x = 24;
    const place = (c, gap = 14) => { x += c.btnWidth + gap; };
    place(this.makeExitButton(hud, x, 20));
    const total = PIGEON_COLLECTIONS.reduce((n, set) => n + set.ids.length, 0);
    const found = PIGEON_COLLECTIONS.reduce((n, set) => n + set.ids.filter(id => (state.collection[id] || 0) > 0).length, 0);
    place(this.makeButton(hud, x, 20, `${__dialogueText("scenes/PigeonLoftScene.js", "t_de2d9df75819aa9efa80")}${found}${__dialogueText("scenes/PigeonLoftScene.js", "t_8a5edab282632443219e")}${total}`, () => this.openModal('collection')));

    // licznik karmy
    const feedLabel = `${__dialogueText("scenes/PigeonLoftScene.js", "t_ff2abf88c8f032b40d5b")}${state.feed}`;
    const ft = this.add.text(0, 0, feedLabel, { fontFamily: FONT.pixel, fontSize: '13px', color: state.feed > 0 ? P.AMBER : P.RED }).setOrigin(0, 0.5);
    const fw = Math.round(ft.width + 40), fh = Math.round(ft.height + 26), fc = this.add.container(x, 20), fg = this.add.graphics();
    goldPlate(fg, 0, 0, fw, fh); ft.setPosition(20, fh / 2 + 1); fc.add([fg, ft]); hud.add(fc); x += fw + 14;

    if (state.nextPerchPrice != null) {
      this.makeButton(hud, x, 20, `${__dialogueText("scenes/PigeonLoftScene.js", "t_45727c37386e5876754c")}${ORDER[state.perches]}${__dialogueText("scenes/PigeonLoftScene.js", "t_5b0995f7cd4f0d4a376c")}${state.nextPerchPrice}`, () => this.openPerchDialogue());
    }

    // lista gołębi z kolorową diodą statusu
    state.birds.forEach((bird, index) => {
      const displayName = this.naming.displayName(bird);
      const label = displayName.length > 15 ? `${displayName.slice(0, 14)}…` : displayName;
      const word = bird.status === 'ready' ? 'READY' : bird.status === 'flying' ? 'AWAY' : bird.fed ? 'FED' : 'HUNGRY';
      const color = bird.status === 'ready' ? 0x85d4a4 : bird.status === 'flying' ? 0x7a7160 : bird.fed ? 0xffc66d : 0xff7a6b;
      const tx = 24 + index * 252, ty = 92, tw = 238, th = 50;
      const c = this.add.container(tx, ty), g = this.add.graphics();
      const selected = this.dialogueCtx?.type === 'bird' && this.dialogueCtx.slot === bird.slot;
      const draw = hover => { if (!g.active) return; g.clear(); goldPlate(g, 0, 0, tw, th, hover || selected ? 1 : 0.92);
        if (hover || selected) { g.fillStyle(0xd4af37, selected ? 0.16 : 0.1); g.fillRect(3, 3, tw - 6, th - 6); } };
      const dot = this.add.circle(24, th / 2, 6, color, 1);
      if (bird.status === 'ready') this.tweens.add({ targets: dot, alpha: { from: 1, to: 0.25 }, duration: 500, yoyo: true, repeat: -1 });
      const name = this.add.text(42, th / 2 - 9, label, { fontFamily: FONT.body, fontSize: '19px', color: P.TEXT }).setOrigin(0, 0.5);
      const status = this.add.text(42, th / 2 + 12, word, { fontFamily: FONT.pixel, fontSize: '8px', color: P.TOPIC_USED }).setOrigin(0, 0.5);
      if (name.width > tw - 56) name.setScale((tw - 56) / name.width);
      const hit = this.add.rectangle(tw / 2, th / 2, tw, th, 0x000000, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => draw(true)); hit.on('pointerout', () => draw(false));
      hit.on('pointerdown', () => { if (!this.leaving && !this.debugMode) this.openBirdDialogue(bird.slot); });
      draw(false); c.add([g, dot, name, status, hit]); hud.add(c);
    });
  },
  createTip() {
    const container = this.add.container(0, 0).setDepth(300).setVisible(false);
    const g = this.add.graphics(), text = this.add.text(0, 0, '', { fontFamily: FONT.body, fontSize: '19px', color: P.TEXT });
    container.add([g, text]); this.tip = { container, g, text };
  },
  showTip(label, sx, sy) {
    const t = this.tip; if (!t?.container?.active) return;
    t.text.setText(this.naming.tipLabel(label));
    const w = Math.round(t.text.width + 32), h = Math.round(t.text.height + 20);
    t.g.clear(); goldPlate(t.g, 0, 0, w, h, 0.95); t.text.setPosition(16, 10);
    const { width, height } = this.scale;
    t.container.setPosition(Math.max(8, Math.min(sx - w / 2, width - w - 8)), Math.max(8, Math.min(sy - h, height - h - 8))).setVisible(true);
  },
  hideTip() { this.tip?.container?.setVisible(false); },
  showToast(message, kind = 'info') {
    this.toastTimer?.remove(false); this.toastTimer = null;
    if (this.toast?.active) { this.tweens.killTweensOf(this.toast); this.toast.destroy(); }
    this.toast = null; if (!message || this._cleanupDone) return;
    const sw = this.scale.width, Wd = Math.min(620, sw - 80);
    const accent = kind === 'success' ? 0x85d4a4 : kind === 'error' ? 0xff7a6b : 0xd4af37;
    const text = this.add.text(30, 18, message, { fontFamily: FONT.body, fontSize: '20px', color: P.TEXT, wordWrap: { width: Wd - 56 } });
    const h = Math.round(text.height + 36), g = this.add.graphics();
    goldPlate(g, 0, 0, Wd, h, 0.96); g.fillStyle(accent, 1); g.fillRect(8, 8, 5, h - 16);
    const c = this.add.container(sw / 2 - Wd / 2, -h - 10, [g, text]).setDepth(600);
    this.toast = c;
    this.tweens.add({ targets: c, y: 160, duration: 260, ease: 'Back.easeOut' });
    this.toastTimer = this.time.delayedCall(4200, () => {
      if (!c.active || this.toast !== c) return;
      this.tweens.add({ targets: c, y: -h - 10, alpha: 0, duration: 240, ease: 'Cubic.easeIn',
        onComplete: () => { if (c.active) c.destroy(); if (this.toast === c) this.toast = null; } });
    });
  },
  feedback(message, kind = 'info') { this.say(message, kind); },
  say(message, kind = 'info') {
    if (!message) return;
    if (this.dialogue?.isOpen) this.dialogueSay(message); else this.showToast(message, kind);
  },
  hotspotEnabled(cfg) {
    if (this.debugMode) return true;
    const match = cfg.id.match(/^(cage|p)([123])(b?)$/); if (!match) return true;
    const slot = this.state.slots.find(s => s.slot === Number(match[2]));
    if (match[1] === 'cage') return Boolean(slot?.owned);
    return Boolean(slot?.bird && slot.bird.status !== 'flying' && (!match[3] || slot.bird.status === 'ready'));
  },
  createHotspot(cfg) {
    const zone = this.add.zone(cfg.x, cfg.y, cfg.w, cfg.h).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.layer.add(zone); const outline = this.add.graphics(); this.layer.add(outline);
    const hs = { cfg, zone, outline }; this.hotspots.push(hs);
    if (!this.hotspotEnabled(cfg)) zone.disableInteractive();
    zone.on('pointerover', () => {
      if (this.modal || this.leaving || this.debugMode) return;
      let label = cfg.label;
      if (cfg.id === 'feeder') label = "Pour grain";
      const match = cfg.id.match(/^p([123])$/), bird = match ? this.state.slots.find(s => s.slot === Number(match[1]))?.bird : null;
      if (bird) label = `${bird.name}${"  (click to talk)"}`;
      const at = this.toScreen(cfg.x, cfg.y - cfg.h / 2 - 6);
      this.showTip(label, at.x, at.y);
    });
    zone.on('pointerout', () => this.hideTip());
    zone.on('pointerdown', () => {
      if (this.leaving || this.modal) return;
      if (this.debugMode) { this.selectedIndex = this.configs.indexOf(cfg); this.drawAllHotspots(); return; }
      this.activate(cfg.id);
    });
    zone.on('drag', pointer => {
      if (!this.debugMode || this.modal) return;
      const point = this.layer.getLocalPoint(pointer.x, pointer.y);
      cfg.x = Math.round(point.x); cfg.y = Math.round(point.y); cfg.auto = false;
      this.selectedIndex = this.configs.indexOf(cfg); this.syncHotspot(hs); this.drawAllHotspots();
    });
    this.input.setDraggable(zone, this.debugMode); this.drawHotspot(hs);
  },
  drawHotspot(hs) {
    hs.outline.clear();
    if (!this.debugMode) return;
    const c = hs.cfg;
    hs.outline.lineStyle(2, this.configs[this.selectedIndex] === c ? 0xff44ff : 0x00ff88, 1)
      .strokeRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
  },
  syncHotspot(hs) {
    const c = hs.cfg; hs.zone.setPosition(c.x, c.y).setSize(c.w, c.h);
    hs.zone.input.hitArea.setTo(0, 0, c.w, c.h); this.drawHotspot(hs);
  },
  drawAllHotspots() { this.hotspots.forEach(h => this.drawHotspot(h)); this.debugText?.setText(this.editorText()); }
};
