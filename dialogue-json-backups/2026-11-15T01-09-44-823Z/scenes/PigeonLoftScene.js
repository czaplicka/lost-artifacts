import { BaseScene } from './BaseScene.js';
import { getPigeonLoft, feedPigeon, renamePigeon, sendPigeon, collectPigeonFind, buyPigeonPerch } from '../managers/PigeonManager.js';
import { moneyManager, MONEY_SOURCE } from '../managers/MoneyManager.js';
import { PIGEON_FINDS, PIGEON_COLLECTIONS } from '../config/pigeonConfig.js';
import { PIGEON_HOTSPOTS } from '../config/pigeonHotspots.js';
import { LocationDialoguePanel, LOCATION_PANEL, goldPlate } from '../ui/LocationDialoguePanel.js';

const W = 1280, H = 720, ORDER = [3, 2, 1];
const ASSETS = ['attic', 'cage1', 'cage2', 'cage3', 'p1', 'p1b', 'p2', 'p2b', 'p3', 'p3b',
  'food_empty', 'food_full', 'food', 'collection_cabinet'];
const LOCAL = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const P = LOCATION_PANEL;
const FONT = { body: 'SpecialElite, monospace', pixel: 'PressStart2P, monospace' };

// Okno na poddaszu i smuga światła (ułamki ramki obrazu) - tylko do efektów w tle
const BEAM = [[0.15, 0.62], [0.34, 0.62], [0.74, 0.99], [0.40, 0.99]];
const BEAM_CENTER = [[0.245, 0.62], [0.57, 0.99]];
const WINDOW_FLY = { x0: 0.13, x1: 0.34, y: 0.44 };

const LINES = {
  hungry: ['stares at the feeder. Then at you. Then at the feeder.', 'is hungry and has decided it is your fault.',
    'taps the sill. Politely. For now.'],
  fed: ['is fed, fluffed and ready for a flight. Pigeons work on commission.', 'looks well fed and mildly smug.',
    'has finished the grain and is now available for crime.'],
  ready: ['has landed with a look of total innocence. Something is definitely in its beak.',
    'is back. It will not say where it was. Pigeons do not do interviews.']
};
const pick = list => list[Math.floor(Math.random() * list.length)];
const timeText = bird => {
  const minutes = Math.max(1, Math.ceil((bird.remainingMs || 0) / 60000)), hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}min` : `${minutes} min`;
};

export function choosePigeonFeedingTarget(state, selectedSlot) {
  const candidates = (state.slots || []).filter(s => s.owned &&
    (!s.bird || (s.bird.status === 'home' && !s.bird.fed)));
  return candidates.find(s => s.slot === selectedSlot) ||
    candidates.find(s => !s.bird) || candidates[0] || null;
}

export class PigeonLoftScene extends BaseScene {
  constructor() { super({ key: 'PigeonLoftScene' }); }

  preload() {
    for (const key of ASSETS) if (!this.textures.exists(key)) this.load.image(key, `assets/pi/home/${key}.webp`);
  }

  // ===========================================================================
  // CREATE
  // ===========================================================================
  create() {
    super.create(); this.registry.set('currentSceneKey', 'PigeonLoftScene');
    Object.assign(this, { leaving: false, modal: null, selectedSlot: 3, debugMode: false,
      selectedIndex: 0, hotspots: [], boundsCache: new Map(), signatureValue: '',
      nameDraft: '', nameInput: null, keyboardBeforeName: null,
      dialogue: null, dialogueCtx: null, lastText: '', toast: null, toastTimer: null,
      layer: null, hud: null, modalLayer: null, tip: null, fit: 1,
      animTargets: [], flyEvent: null, beamGfx: null, fxGfx: null });
    this.configs = PIGEON_HOTSPOTS.map(c => ({ ...c }));
    this.input.setTopOnly(true); this.cameras.main.setBackgroundColor('#151920');
    this.hideAgencyHud(); this.createTip(); this.renderLoft();
    this.trackInputEvent(this.scale, 'resize', this.onResize);
    if (this.input.keyboard) this.trackInputEvent(this.input.keyboard, 'keydown', this.onKey);
    this.tick = this.time.addEvent({ delay: 500, loop: true, callback: () => { this.hideAgencyHud(); this.refreshState(); } });
    this.events.on('update', this.onFxUpdate, this);
    this.events.once('shutdown', () => {
      this.detachNameInput(); this.tick?.remove(false); this.toastTimer?.remove(false);
      this.events.off('update', this.onFxUpdate, this);
      this.killFx(); this.dialogue?.destroy(); this.dialogue = null;
      this.toast?.destroy(); this.tip?.container?.destroy(); this.tip = null;
      this.layer?.destroy(true); this.layer = null; this.hud?.destroy(true); this.hud = null;
      this.modalLayer?.destroy(true); this.modalLayer = null;
    });
    this.events.once('destroy', () => this.detachNameInput());
  }

  hideAgencyHud() {
    for (const key of ['PlayerHudScene', 'UIScene', 'NewsHud']) {
      const hud = this.getRegisteredScene(key); if (!hud) continue;
      hud.closeAllUIPanels?.(); hud.closeMenu?.(true); hud.setHudVisible?.(false);
      if (this.isSceneActive(key)) this.sleepSceneIfActive(key);
      this.scene.setVisible(false, key);
    }
  }

  onResize() {
    this.renderLoft();
    if (this.dialogueCtx) {   // panel jest zbudowany pod rozmiar ekranu - odtwórz go po zmianie rozmiaru
      const ctx = { ...this.dialogueCtx }, text = this.lastText;
      this.dialogue?.destroy(); this.dialogue = null; this.dialogueCtx = null;
      if (ctx.type === 'bird') this.openBirdDialogue(ctx.slot, { text });
      else if (ctx.type === 'perch') this.openPerchDialogue({ text });
    }
  }

  // ===========================================================================
  // UKŁAD (obraz w współrzędnych 1280x720, interfejs w pikselach ekranu)
  // ===========================================================================
  frame() {
    if (!this.textures.exists('attic')) return { x: 0, y: 0, w: W, h: H };
    const source = this.textures.get('attic').getSourceImage(), scale = Math.min(W / source.width, H / source.height);
    return { x: (W - source.width * scale) / 2, y: (H - source.height * scale) / 2, w: source.width * scale, h: source.height * scale };
  }
  art(key) {
    if (!this.textures.exists(key)) return null;
    const f = this.artFrame, image = this.add.image(f.x, f.y, key).setOrigin(0).setDisplaySize(f.w, f.h);
    this.layer.add(image); return image;
  }
  // gołąb "oddycha": obrót wokół dolnej krawędzi sylwetki
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
  }
  floatArt(key, phase) {
    const image = this.art(key); if (!image) return;
    this.animTargets.push(image);
    this.tweens.add({ targets: image, y: image.y - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: phase * 170 });
  }
  toScreen(x, y) { return { x: this.layer.x + x * this.fit, y: this.layer.y + y * this.fit }; }

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
  }
  resolveConfig(cfg) {
    if (cfg.auto === false) return;
    const key = cfg.id === 'feeder' ? 'food_empty' : cfg.id === 'cabinet' ? 'collection_cabinet' : cfg.id;
    const bounds = this.alphaBounds(key); if (!bounds) return;
    const f = this.artFrame;
    Object.assign(cfg, { x: f.x + bounds.x * f.w, y: f.y + bounds.y * f.h,
      w: Math.max(14, bounds.w * f.w), h: Math.max(14, bounds.h * f.h) });
  }
  signature(state) {
    return JSON.stringify({ perches: state.perches, feed: state.feed, collection: state.collection,
      birds: state.birds.map(b => [b.id, b.name, b.status, b.fed, b.flights]) });
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================
  killFx() {
    if (this.animTargets.length) this.tweens.killTweensOf(this.animTargets);
    this.animTargets = []; this.flyEvent?.remove(false); this.flyEvent = null;
    this.beamGfx = null; this.fxGfx = null;
  }

  renderLoft() {
    if (this._cleanupDone) return;
    this.detachNameInput(); this.killFx();
    this.layer?.destroy(true); this.hud?.destroy(true); this.modalLayer?.destroy(true);
    this.hotspots = []; this.modalLayer = null; this.debugText = null;
    const sw = this.scale.width, sh = this.scale.height;
    this.fit = Math.min(sw / W, sh / H);
    this.layer = this.add.container((sw - W * this.fit) / 2, (sh - H * this.fit) / 2).setScale(this.fit).setDepth(0);
    this.hud = this.add.container(0, 0).setDepth(100);
    this.artFrame = this.frame(); this.art('attic');
    try { this.state = getPigeonLoft(); }
    catch (error) {
      this.makeButton(this.hud, 24, 20, 'EXIT', () => { void this.exitLoft(); });
      this.showToast(error.message, 'error'); return;
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
  }

  buildVignette(sw, sh) {
    const key = 'pigeon_vignette';
    if (!this.textures.exists(key)) {
      const w = 960, h = 540, tex = this.textures.createCanvas(key, w, h);
      if (tex) {
        const ctx = tex.getContext(), g = ctx.createRadialGradient(w / 2, h * 0.5, h * 0.38, w / 2, h * 0.5, w * 0.62);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,6,2,0.55)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); tex.refresh();
      }
    }
    if (this.textures.exists(key)) this.hud.add(this.add.image(sw / 2, sh / 2, key).setDisplaySize(sw, sh));
  }

  // --- efekty tła: smuga światła z okna, pyłki, ptak przelatujący za oknem ---
  buildAtmosphere() {
    this.beamGfx = this.add.graphics(); this.fxGfx = this.add.graphics();
    this.layer.add([this.beamGfx, this.fxGfx]);
  }
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
  }
  spawnFlyer() {
    if (!this.layer?.active || this.leaving || !this.artFrame) return;
    const f = this.artFrame, bird = this.add.graphics();
    bird.lineStyle(3, 0x1d2230, 0.85); bird.lineBetween(-14, -7, 0, 0); bird.lineBetween(0, 0, 14, -7);
    bird.setPosition(f.x + WINDOW_FLY.x0 * f.w, f.y + (WINDOW_FLY.y + 0.06) * f.h);
    this.layer.add(bird); this.animTargets.push(bird);
    this.tweens.add({ targets: bird, scaleY: { from: 1, to: -0.4 }, duration: 170, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: bird, x: f.x + WINDOW_FLY.x1 * f.w, y: f.y + (WINDOW_FLY.y - 0.05) * f.h, alpha: { from: 1, to: 0.2 },
      duration: 2600, ease: 'Sine.easeInOut', onComplete: () => { this.tweens.killTweensOf(bird); if (bird.active) bird.destroy(); } });
  }

  // ===========================================================================
  // INTERFEJS: przyciski, pasek górny, lista gołębi
  // ===========================================================================
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
  }

  buildHud() {
    const hud = this.hud, state = this.state;
    let x = 24;
    const place = (c, gap = 14) => { x += c.btnWidth + gap; };
    place(this.makeButton(hud, x, 20, 'EXIT', () => { void this.exitLoft(); }));
    const total = PIGEON_COLLECTIONS.reduce((n, set) => n + set.ids.length, 0);
    const found = PIGEON_COLLECTIONS.reduce((n, set) => n + set.ids.filter(id => (state.collection[id] || 0) > 0).length, 0);
    place(this.makeButton(hud, x, 20, `COLLECTION ${found}/${total}`, () => this.openModal('collection')));

    // licznik karmy
    const feedLabel = `GRAIN  x${state.feed}`;
    const ft = this.add.text(0, 0, feedLabel, { fontFamily: FONT.pixel, fontSize: '13px', color: state.feed > 0 ? P.AMBER : P.RED }).setOrigin(0, 0.5);
    const fw = Math.round(ft.width + 40), fh = Math.round(ft.height + 26), fc = this.add.container(x, 20), fg = this.add.graphics();
    goldPlate(fg, 0, 0, fw, fh); ft.setPosition(20, fh / 2 + 1); fc.add([fg, ft]); hud.add(fc); x += fw + 14;

    if (state.nextPerchPrice != null) {
      this.makeButton(hud, x, 20, `NEW PERCH #${ORDER[state.perches]}  $${state.nextPerchPrice}`, () => this.openPerchDialogue());
    }

    // lista gołębi z kolorową diodą statusu
    state.birds.forEach((bird, index) => {
      const label = bird.name.length > 15 ? `${bird.name.slice(0, 14)}…` : bird.name;
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
  }

  // ===========================================================================
  // PODPOWIEDŹ NAD HOTSPOTEM + POWIADOMIENIE (toast)
  // ===========================================================================
  createTip() {
    const container = this.add.container(0, 0).setDepth(300).setVisible(false);
    const g = this.add.graphics(), text = this.add.text(0, 0, '', { fontFamily: FONT.body, fontSize: '19px', color: P.TEXT });
    container.add([g, text]); this.tip = { container, g, text };
  }
  showTip(label, sx, sy) {
    const t = this.tip; if (!t?.container?.active) return;
    t.text.setText(label);
    const w = Math.round(t.text.width + 32), h = Math.round(t.text.height + 20);
    t.g.clear(); goldPlate(t.g, 0, 0, w, h, 0.95); t.text.setPosition(16, 10);
    const { width, height } = this.scale;
    t.container.setPosition(Math.max(8, Math.min(sx - w / 2, width - w - 8)), Math.max(8, Math.min(sy - h, height - h - 8))).setVisible(true);
  }
  hideTip() { this.tip?.container?.setVisible(false); }

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
  }
  feedback(message, kind = 'info') { this.say(message, kind); }
  say(message, kind = 'info') {
    if (!message) return;
    if (this.dialogue?.isOpen) this.dialogueSay(message); else this.showToast(message, kind);
  }

  // ===========================================================================
  // HOTSPOTY (bez podświetleń w grze - tylko podpowiedź; ramki wyłącznie w edytorze)
  // ===========================================================================
  hotspotEnabled(cfg) {
    if (this.debugMode) return true;
    const match = cfg.id.match(/^(cage|p)([123])(b?)$/); if (!match) return true;
    const slot = this.state.slots.find(s => s.slot === Number(match[2]));
    if (match[1] === 'cage') return Boolean(slot?.owned);
    return Boolean(slot?.bird && slot.bird.status !== 'flying' && (!match[3] || slot.bird.status === 'ready'));
  }
  createHotspot(cfg) {
    const zone = this.add.zone(cfg.x, cfg.y, cfg.w, cfg.h).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.layer.add(zone); const outline = this.add.graphics(); this.layer.add(outline);
    const hs = { cfg, zone, outline }; this.hotspots.push(hs);
    if (!this.hotspotEnabled(cfg)) zone.disableInteractive();
    zone.on('pointerover', () => {
      if (this.modal || this.leaving || this.debugMode) return;
      let label = cfg.label;
      if (cfg.id === 'feeder') label = 'Pour grain';
      const match = cfg.id.match(/^p([123])$/), bird = match ? this.state.slots.find(s => s.slot === Number(match[1]))?.bird : null;
      if (bird) label = `${bird.name}  (click to talk)`;
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
  }
  drawHotspot(hs) {
    hs.outline.clear();
    if (!this.debugMode) return;
    const c = hs.cfg;
    hs.outline.lineStyle(2, this.configs[this.selectedIndex] === c ? 0xff44ff : 0x00ff88, 1)
      .strokeRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
  }
  syncHotspot(hs) {
    const c = hs.cfg; hs.zone.setPosition(c.x, c.y).setSize(c.w, c.h);
    hs.zone.input.hitArea.setTo(0, 0, c.w, c.h); this.drawHotspot(hs);
  }
  drawAllHotspots() { this.hotspots.forEach(h => this.drawHotspot(h)); this.debugText?.setText(this.editorText()); }

  pourGrain() {
    if (this.leaving || this.debugMode) return;
    let state; try { state = getPigeonLoft(); } catch (error) { this.feedback(error.message, 'error'); return; }
    if (state.feed < 1) { this.feedback('The grain sack is empty. Pigeon feed is sold at the agency shop. Payment in advance.', 'error'); return; }
    const target = choosePigeonFeedingTarget(state, this.selectedSlot);
    if (!target) {
      const ready = state.birds.find(b => b.status === 'ready');
      const fed = state.birds.find(b => b.status === 'home' && b.fed);
      this.feedback(ready ? `${ready.name} is back and wants to hand something over before eating.`
        : fed ? `${fed.name} is already full. Overfeeding a pigeon is how legends start.`
        : 'There is nobody to feed. The pigeons are out working.'); return;
    }
    this.selectedSlot = target.slot;
    this.action(() => feedPigeon(target.slot));
  }

  activate(id) {
    this.hideTip();
    if (id === 'cabinet') { this.openModal('collection'); return; }
    if (id === 'food') { this.feedback(`Pigeon feed: ${this.state.feed} portions. Handle with dignity.`); return; }
    if (id === 'feeder') { this.pourGrain(); return; }
    const match = id.match(/^(cage|p)([123])(b?)$/); if (!match) return;
    this.selectedSlot = Number(match[2]); const bird = this.state.slots.find(s => s.slot === this.selectedSlot)?.bird;
    if (match[3] && bird) this.action(() => collectPigeonFind(bird.id));
    else if (bird) this.openBirdDialogue(bird.slot);
    else this.feedback('An empty perch. Somewhere out there a pigeon is making a very poor life choice.');
  }

  // ===========================================================================
  // DIALOG (ten sam panel co w LocationScene i sklepie agencji)
  // ===========================================================================
  ensureDialogue() {
    if (this.dialogue?.isOpen) return this.dialogue;
    this.dialogue = new LocationDialoguePanel(this, {
      depth: 700, menuWidth: 300, leaveLabel: 'Step back', onLeave: () => this.closeDialogue()
    });
    return this.dialogue;
  }
  closeDialogue() {
    const had = Boolean(this.dialogue || this.dialogueCtx);
    this.dialogue?.destroy(); this.dialogue = null; this.dialogueCtx = null; this.lastText = '';
    if (had && this.layer?.active && !this._cleanupDone && this.state) this.renderLoft();   // zdejmij zaznaczenie z listy gołębi
  }

  birdOf(slot) { return this.state?.slots?.find(s => s.slot === slot)?.bird || null; }

  pigeonPortrait(bird) {
    const slot = bird.slot, pKey = `p${slot}`, bKey = `p${slot}b`;
    const keys = ['attic'];
    if (bird.status !== 'flying') keys.push(pKey);
    if (bird.status === 'ready') keys.push(bKey);
    const boxes = [this.alphaBounds(pKey), bird.status === 'ready' ? this.alphaBounds(bKey) : null].filter(Boolean);
    const frame = this.textures.exists('attic') ? this.textures.getFrame('attic') : null;
    const ratio = frame ? (frame.realWidth || frame.width) / (frame.realHeight || frame.height) : 16 / 9;
    if (!boxes.length) return { kind: 'crop', keys, cx: 0.2, cy: 0.55, sideFrac: 0.4 };
    const x0 = Math.min(...boxes.map(b => b.x - b.w / 2)), x1 = Math.max(...boxes.map(b => b.x + b.w / 2));
    const y0 = Math.min(...boxes.map(b => b.y - b.h / 2)), y1 = Math.max(...boxes.map(b => b.y + b.h / 2));
    return { kind: 'crop', keys, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, sideFrac: Math.max((x1 - x0) * ratio, y1 - y0) * 1.5 };
  }

  birdLine(bird) {
    if (bird.status === 'ready') return `${bird.name} ${pick(LINES.ready)}${bird.find?.name ? ` Today's find: ${bird.find.name}.` : ''}`;
    if (bird.status === 'home') return `${bird.name} ${pick(bird.fed ? LINES.fed : LINES.hungry)}`;
    return `${bird.name} is out on a job. Back in ${timeText(bird)}. Do not wait up.`;
  }
  birdFooter(bird) {
    const flights = Number.isFinite(bird.flights) ? `  -  FLIGHTS: ${bird.flights}` : '';
    if (bird.status === 'ready') return { text: `READY TO COLLECT${flights}`, color: P.GREEN };
    if (bird.status === 'flying') return { text: `AWAY  -  BACK IN ${timeText(bird)}`, color: P.TOPIC_USED };
    return bird.fed ? { text: `FED${flights}`, color: P.AMBER } : { text: `HUNGRY${flights}`, color: P.RED };
  }

  openBirdDialogue(slot, { text = null } = {}) {
    if (this.leaving || this.debugMode || !this.state) return;
    const bird = this.birdOf(slot);
    if (!bird) { this.feedback('That perch is empty.'); return; }
    this.selectedSlot = slot; this.hideTip(); this.ensureDialogue();
    this.dialogueCtx = { type: 'bird', slot, sig: '' };
    this.applyBirdDialogue(true, text);
    this.renderLoft();   // podświetl wybranego w liście
  }

  applyBirdDialogue(full, text = null) {
    const d = this.dialogue, ctx = this.dialogueCtx, bird = ctx ? this.birdOf(ctx.slot) : null;
    if (!d?.isOpen || !bird) { if (ctx && !bird) this.closeDialogue(); return; }
    const sig = `${bird.id}|${bird.status}|${bird.name}`;
    if (full || ctx.sig !== sig) { d.setSpeaker({ name: bird.name, portrait: this.pigeonPortrait(bird) }); ctx.sig = sig; }
    const footer = this.birdFooter(bird);
    if (full || text !== null) {
      this.lastText = text ?? this.birdLine(bird);
      d.setText(this.lastText, { footer: footer.text, footerColor: footer.color });
    } else d.setFooter(footer.text, footer.color);
    d.setTopics(this.birdTopics(bird));
  }

  birdTopics(bird) {
    const state = this.state, feed = state.feed, topics = [];
    if (bird.status === 'ready') topics.push({ id: 'collect', label: 'Collect the find', state: 'accent', onSelect: () => this.action(() => collectPigeonFind(bird.id)) });
    else if (bird.status === 'home' && bird.fed) topics.push({ id: 'send', label: 'Send it out', state: 'accent', onSelect: () => this.action(() => sendPigeon(bird.id)) });
    else if (bird.status === 'home') topics.push({ id: 'feed', label: `Feed it  (grain: ${feed})`, state: feed > 0 ? 'accent' : 'disabled', onSelect: () => this.feedBird(bird) });
    else topics.push({ id: 'away', label: `Out flying  (${timeText(bird)})`, state: 'disabled',
      onSelect: () => this.dialogueSay(`${bird.name} is busy being a professional. Back in ${timeText(bird)}.`) });
    topics.push({ id: 'rename', label: 'Rename', state: 'normal', onSelect: () => { this.nameDraft = bird.name; this.openModal('rename'); } });
    if (state.birds.length > 1) {
      const list = state.birds, i = list.findIndex(b => b.id === bird.id);
      topics.push({ id: 'next', label: 'Next pigeon', state: 'normal', onSelect: () => this.openBirdDialogue(list[(i + 1) % list.length].slot) });
      topics.push({ id: 'prev', label: 'Previous pigeon', state: 'normal', onSelect: () => this.openBirdDialogue(list[(i - 1 + list.length) % list.length].slot) });
    }
    topics.push({ id: 'collection', label: 'Collection', state: 'normal', onSelect: () => this.openModal('collection') });
    return topics;
  }

  feedBird(bird) {
    if (this.state.feed < 1) { this.dialogueSay('The grain sack is empty. Pigeon feed is sold at the agency shop. Payment in advance.'); return; }
    this.action(() => feedPigeon(bird.slot));
  }

  // --- nowy żerdź -----------------------------------------------------------
  openPerchDialogue({ text = null } = {}) {
    if (this.leaving || this.debugMode || !this.state || this.state.nextPerchPrice == null) return;
    this.hideTip(); this.ensureDialogue(); this.dialogueCtx = { type: 'perch' };
    const no = ORDER[this.state.perches], price = this.state.nextPerchPrice, d = this.dialogue;
    const cash = moneyManager.getBalance(MONEY_SOURCE.CASH), frame = this.textures.exists('attic') ? this.textures.getFrame('attic') : null;
    const ratio = frame ? (frame.realWidth || frame.width) / (frame.realHeight || frame.height) : 16 / 9;
    const box = this.alphaBounds(`cage${no}`);
    d.setSpeaker({ name: `PERCH #${no}`, portrait: { kind: 'crop', keys: ['attic', `cage${no}`],
      cx: box?.x ?? 0.85, cy: box?.y ?? 0.75, sideFrac: box ? Math.max(box.w * ratio, box.h) * 1.4 : 0.4 } });
    d.setStamp(null);
    this.lastText = text ?? `A fresh perch for pigeon #${no}: $${price}. Pigeons pay no rent, but their lawyers do.`;
    d.setText(this.lastText, { footer: `$${price}  -  CASH $${cash}`, footerColor: cash >= price ? P.AMBER : P.RED });
    d.setTopics([
      { id: 'buy', label: `Buy the perch  ($${price})`, state: cash >= price ? 'accent' : 'disabled', onSelect: () => this.action(() => buyPigeonPerch()) },
      { id: 'later', label: 'Maybe later', state: 'normal', onSelect: () => this.closeDialogue() },
      { id: 'collection', label: 'Collection', state: 'normal', onSelect: () => this.openModal('collection') }
    ]);
  }

  dialogueSay(message) {
    const d = this.dialogue;
    if (!d?.isOpen) { this.showToast(message); return; }
    this.lastText = message;
    let footer = null;
    if (this.dialogueCtx?.type === 'bird') { const bird = this.birdOf(this.dialogueCtx.slot); if (bird) footer = this.birdFooter(bird); }
    d.setText(message, footer ? { footer: footer.text, footerColor: footer.color } : {});
  }

  // po zmianie stanu: odśwież menu i stopkę (bez ponownego pisania tekstu)
  refreshDialogueUi() {
    if (!this.dialogue?.isOpen || !this.dialogueCtx) return;
    if (this.dialogueCtx.type === 'bird') this.applyBirdDialogue(false);
  }

  action(callback) {
    let result; try { result = callback(); } catch (error) { result = { ok: false, message: error.message }; }
    const ctx = this.dialogueCtx;
    if (result.ok && this.modal && this.modal !== 'collection') this.modal = null;
    if (result.ok && ctx?.type === 'perch') { this.closeDialogue(); this.showToast(result.message || '', 'success'); return result; }
    this.renderLoft();
    this.say(result.message || '', result.ok ? 'success' : 'error');
    return result;
  }

  // ===========================================================================
  // OKNA MODALNE: kolekcja i zmiana imienia
  // ===========================================================================
  openModal(kind) { this.hideTip(); this.closeDialogue(); this.modal = kind; this.renderLoft(); }
  closeModal() { this.detachNameInput(); this.modal = null; this.renderLoft(); }

  renderModal() {
    this.modalLayer = this.add.container(0, 0).setDepth(800);
    const { width, height } = this.scale;
    this.modalLayer.add(this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setInteractive());
    if (this.modal === 'rename') this.renderRename(); else this.renderCollection();
  }

  renderRename() {
    const { width: sw, height: sh } = this.scale, MW = 760, MH = 330, x = Math.round((sw - MW) / 2), y = Math.round((sh - MH) / 2);
    const g = this.add.graphics(); goldPlate(g, x, y, MW, MH, 0.98);
    const title = this.add.text(x + 34, y + 30, 'RENAME PIGEON', { fontFamily: FONT.pixel, fontSize: '16px', color: '#d4af37' });
    const hint = this.add.text(x + 34, y + 70, 'Max 24 characters. The pigeon will not answer to it anyway.',
      { fontFamily: FONT.body, fontSize: '19px', color: P.TEXT, wordWrap: { width: MW - 68 } });
    this.modalLayer.add([g, title, hint]);
    this.makeButton(this.modalLayer, x + 34, y + MH - 78, 'SAVE', () => this.saveName(), { size: 14 });
    this.makeButton(this.modalLayer, x + 190, y + MH - 78, 'CANCEL', () => this.cancelRename(), { size: 14 });
    this.mountNameInput(x + 34, y + 130, MW - 68, 56);
  }

  mountNameInput(x, y, w, h) {
    const rect = this.game.canvas.getBoundingClientRect();
    const sx = rect.width / this.scale.width, sy = rect.height / this.scale.height;
    const input = document.createElement('input'); input.type = 'text'; input.maxLength = 24; input.value = this.nameDraft;
    input.setAttribute('aria-label', 'Pigeon name'); input.autocomplete = 'off'; input.spellcheck = false;
    Object.assign(input.style, { position: 'fixed', zIndex: '10000', boxSizing: 'border-box',
      left: `${rect.left + x * sx}px`, top: `${rect.top + y * sy}px`,
      width: `${w * sx}px`, height: `${h * sy}px`, fontFamily: 'SpecialElite, monospace',
      fontSize: `${Math.max(16, 26 * sx)}px`, background: '#2a1c0c', color: '#f4ecd8',
      border: '2px solid #d4af37', borderRadius: '0', padding: '4px 14px', outline: 'none' });
    input.addEventListener('input', () => { this.nameDraft = input.value; });
    input.addEventListener('keydown', event => {
      event.stopPropagation(); if (event.isComposing) return;
      if (event.key === 'Enter') { event.preventDefault(); this.saveName(); }
      else if (event.key === 'Escape') { event.preventDefault(); this.cancelRename(); }
    });
    document.body.appendChild(input); this.nameInput = input;
    if (this.input.keyboard) { this.keyboardBeforeName = this.input.keyboard.enabled; this.input.keyboard.enabled = false; }
    input.focus({ preventScroll: true }); input.select();
  }
  detachNameInput() {
    if (this.nameInput) { this.nameDraft = this.nameInput.value; this.nameInput.remove(); this.nameInput = null; }
    if (this.keyboardBeforeName !== null && this.keyboardBeforeName !== undefined && this.input?.keyboard) this.input.keyboard.enabled = this.keyboardBeforeName;
    this.keyboardBeforeName = null;
  }
  saveName() {
    if (this.modal !== 'rename' || this.leaving) return;
    const value = this.nameInput?.value ?? this.nameDraft, bird = this.state.slots.find(s => s.slot === this.selectedSlot)?.bird;
    if (!bird) { this.closeModal(); return; }
    this.nameDraft = value;
    let result; try { result = renamePigeon(bird.id, value); } catch (error) { result = { ok: false, message: error.message }; }
    if (result.ok) { this.modal = null; this.renderLoft(); this.openBirdDialogue(this.selectedSlot, { text: result.message || null }); }
    else { this.renderLoft(); this.showToast(result.message || 'That name did not work.', 'error'); }
  }
  cancelRename() { this.detachNameInput(); this.modal = null; this.renderLoft(); this.openBirdDialogue(this.selectedSlot); }

  // --- kolekcja: półki z kartami znalezisk ---
  renderCollection() {
    const { width: sw, height: sh } = this.scale;
    const X = Math.round(sw * 0.06), Y = Math.round(sh * 0.09), WW = Math.round(sw * 0.88), HH = Math.round(sh * 0.82);
    const m = this.modalLayer, g = this.add.graphics(); goldPlate(g, X, Y, WW, HH, 0.98); m.add(g);
    m.add(this.add.text(X + 36, Y + 32, 'PIGEON COLLECTION', { fontFamily: FONT.pixel, fontSize: '18px', color: '#d4af37' }));
    const close = this.makeButton(m, 0, Y + 18, 'CLOSE', () => this.closeModal(), { size: 12 });
    close.setX(X + WW - 36 - close.btnWidth);

    const rows = PIGEON_COLLECTIONS.length, top = Y + 96, rowH = Math.floor((HH - 96 - 90) / Math.max(1, rows));
    PIGEON_COLLECTIONS.forEach((set, row) => {
      const ry = top + row * rowH, known = set.ids.filter(id => (this.state.collection[id] || 0) > 0).length;
      const complete = known === set.ids.length;
      m.add(this.add.text(X + 36, ry, `${set.name}   ${known}/${set.ids.length}${complete ? '   COMPLETE' : ''}`,
        { fontFamily: FONT.pixel, fontSize: '14px', color: complete ? P.GREEN : '#ffd86b' }));
      const gap = 24, cardW = Math.floor((WW - 72 - gap * (set.ids.length - 1)) / set.ids.length), cardH = Math.min(190, rowH - 70);
      const cy = ry + 36, shelf = this.add.graphics();
      shelf.fillStyle(0x3b2512, 1); shelf.fillRect(X + 28, cy + cardH, WW - 56, 14);
      shelf.fillStyle(0x6a4524, 1); shelf.fillRect(X + 28, cy + cardH, WW - 56, 4);
      m.add(shelf);
      set.ids.forEach((id, col) => this.collectionCard(m, id, X + 36 + col * (cardW + gap), cy, cardW, cardH));
    });
    m.add(this.add.text(X + 36, Y + HH - 56, `Junk thrown away: ${this.state.junkDiscarded}. The pigeons are not offended. Much.`,
      { fontFamily: FONT.body, fontSize: '19px', color: P.TOPIC_USED }));
  }

  collectionCard(parent, id, x, y, w, h) {
    const find = PIGEON_FINDS.find(f => f.id === id), n = this.state.collection[id] || 0, known = n > 0;
    const g = this.add.graphics();
    g.fillStyle(0x0b0805, 0.92); g.fillRect(x, y, w, h);
    g.lineStyle(2, known ? 0xd4af37 : 0x5a4a22, 1); g.strokeRect(x + 1, y + 1, w - 2, h - 2);
    g.fillStyle(known ? 0x2a1c0c : 0x120d07, 1); g.fillRect(x + 14, y + 14, 112, h - 28);
    this.drawFindIcon(g, id, x + 70, y + h / 2, 42, known);
    parent.add(g);
    if (!known) parent.add(this.add.text(x + 70, y + h / 2, '?', { fontFamily: FONT.pixel, fontSize: '34px', color: '#5a4a22' }).setOrigin(0.5));
    const tx = x + 144, tw = w - 144 - 16;
    parent.add(this.add.text(tx, y + 18, known ? (find?.name ?? id) : '???', { fontFamily: FONT.body, fontSize: '22px', color: known ? P.TEXT : P.TOPIC_USED, wordWrap: { width: tw } }));
    parent.add(this.add.text(tx, y + 58, known ? (find?.description || '') : 'Not found yet. Keep feeding the pigeons.',
      { fontFamily: FONT.body, fontSize: '16px', color: known ? '#b8bdbb' : P.TOPIC_USED, wordWrap: { width: tw }, lineSpacing: 3 }));
    if (known) parent.add(this.add.text(x + w - 16, y + h - 14, `x${n}`, { fontFamily: FONT.pixel, fontSize: '12px', color: P.AMBER }).setOrigin(1, 1));
  }

  // proste, rysowane kodem ikony: kapsle i guziki
  drawFindIcon(g, id, cx, cy, r, known) {
    if (!known) { g.fillStyle(0x1b140b, 1); g.fillCircle(cx, cy, r); return; }
    const caps = { cap_fizz: 0xe8892b, cap_coo: 0x4fb3a8, cap_noir: 0x34343e };
    const buttons = { button_gold: 0xd4af37, button_blue: 0x3d6fd1, button_anchor: 0x1f2f4f };
    if (caps[id] !== undefined) {
      g.fillStyle(caps[id], 1); g.fillCircle(cx, cy, r);
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; g.fillCircle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.13); }
      g.fillStyle(0x000000, 0.25); g.fillCircle(cx, cy, r * 0.68);
      g.fillStyle(0xffffff, 0.35); g.fillCircle(cx - r * 0.3, cy - r * 0.3, r * 0.14);
    } else if (buttons[id] !== undefined) {
      g.fillStyle(buttons[id], 1); g.fillCircle(cx, cy, r);
      g.lineStyle(3, 0xffffff, 0.35); g.strokeCircle(cx, cy, r * 0.78);
      if (id === 'button_anchor') {
        g.lineStyle(3, 0xcfe0f5, 1); g.strokeCircle(cx, cy - r * 0.42, r * 0.14);
        g.lineBetween(cx, cy - r * 0.28, cx, cy + r * 0.45); g.lineBetween(cx - r * 0.25, cy - r * 0.08, cx + r * 0.25, cy - r * 0.08);
        g.lineBetween(cx - r * 0.42, cy + r * 0.18, cx, cy + r * 0.45); g.lineBetween(cx + r * 0.42, cy + r * 0.18, cx, cy + r * 0.45);
      } else {
        g.fillStyle(0x000000, 0.45);
        for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.fillCircle(cx + dx * r * 0.22, cy + dy * r * 0.22, r * 0.09);
      }
    } else { g.fillStyle(0x8a6d1f, 1); g.fillCircle(cx, cy, r * 0.8); }
  }

  // ===========================================================================
  // ODŚWIEŻANIE STANU
  // ===========================================================================
  refreshState() {
    if (!this.layer || this._cleanupDone || this.debugMode) return;
    let state; try { state = getPigeonLoft(); } catch { return; }
    if (this.signature(state) !== this.signatureValue) {
      if (this.modal === 'rename') { this.state = state; return; }
      this.renderLoft(); return;
    }
    // odliczanie czasu lotu w stopce panelu
    if (this.dialogue?.isOpen && this.dialogueCtx?.type === 'bird') {
      const bird = state.slots.find(s => s.slot === this.dialogueCtx.slot)?.bird;
      if (bird?.status === 'flying') { this.state = state; const f = this.birdFooter(bird); this.dialogue.setFooter(f.text, f.color); }
    }
  }

  // ===========================================================================
  // EDYTOR HOTSPOTÓW (lokalnie, klawisz D) - bez zmian funkcjonalnych
  // ===========================================================================
  editorText() {
    const c = this.configs[this.selectedIndex];
    return `EDITOR: ${c?.id} | x:${Math.round(c?.x || 0)} y:${Math.round(c?.y || 0)} w:${Math.round(c?.w || 0)} h:${Math.round(c?.h || 0)}\n` +
      'Drag / arrows: move | Shift + arrows: resize | Alt: 1px | Tab: next | C: export | D / Esc: close';
  }
  drawEditorHelp() {
    this.debugText = this.add.text(24, 160, this.editorText(), { fontFamily: FONT.body, fontSize: '18px', color: '#a5ffd4',
      backgroundColor: '#201409', padding: { x: 10, y: 8 }, wordWrap: { width: 1100 } }).setDepth(120);
    this.hud.add(this.debugText);
  }

  onKey(event) {
    if (event.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
    if (event.code === 'Escape') {
      if (this.modal === 'rename') this.cancelRename(); else if (this.modal) this.closeModal();
      else if (this.dialogue) this.closeDialogue();
      else if (this.debugMode) { this.debugMode = false; this.renderLoft(); } return;
    }
    if (this.dialogue?.isOpen && !this.modal && !this.debugMode) {
      const m = /^(Digit|Numpad)([1-9])$/.exec(event.code);
      if (m) { event.preventDefault(); this.dialogue.triggerTopic(Number(m[2]) - 1); return; }
    }
    if (!LOCAL || event.ctrlKey || event.metaKey || this.leaving || this.modal === 'rename') return;
    if (event.code === 'KeyD' && !event.repeat) {
      this.debugMode = !this.debugMode; this.modal = null; if (this.debugMode) this.closeDialogue(); this.renderLoft(); return;
    }
    if (!this.debugMode) return;
    if (event.code === 'KeyC' && !event.repeat) {
      console.log('COPY INTO config/pigeonHotspots.js:');
      console.log('export const PIGEON_HOTSPOTS = ' + JSON.stringify(this.configs.map(c => ({ ...c, auto: false })), null, 2) + ';'); return;
    }
    if (event.code === 'Tab') {
      event.preventDefault(); this.selectedIndex = (this.selectedIndex + (event.shiftKey ? -1 : 1) + this.configs.length) % this.configs.length;
      this.drawAllHotspots(); return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) return;
    event.preventDefault(); const c = this.configs[this.selectedIndex], step = event.altKey ? 1 : 5;
    const horizontal = ['ArrowLeft', 'ArrowRight'].includes(event.code), direction = ['ArrowLeft', 'ArrowUp'].includes(event.code) ? -1 : 1;
    const key = event.shiftKey ? (horizontal ? 'w' : 'h') : (horizontal ? 'x' : 'y');
    c[key] += direction * step; c.w = Math.max(10, c.w); c.h = Math.max(10, c.h); c.auto = false;
    const hs = this.hotspots.find(h => h.cfg === c); if (hs) this.syncHotspot(hs); this.drawAllHotspots();
  }

  async exitLoft() {
    if (this.leaving || this.debugMode) return;
    this.detachNameInput(); this.leaving = true;
    this.dialogue?.destroy(); this.dialogue = null; this.dialogueCtx = null; this.hideTip();
    const moved = await this.goto('HomeCityScene', { entryPoint: 'your-home' });
    if (moved === false && !this._cleanupDone) { this.leaving = false; this.showToast('The street could not be opened. Try again in a moment.', 'error'); }
  }
}