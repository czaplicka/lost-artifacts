// =============================================================================
// LombardScene.js - interior of Honest Ziggy's Pawn (home town).
// Fully procedural (LombardArt.js bakes the shop into a canvas texture).
// Ziggy runs a tiny pawn deal (pocket watch: +$15 now, $20 to redeem), the rest
// of the shop is clickable junk with jokes. Cash goes through moneyManager.
// =============================================================================
import { BaseScene } from './BaseScene.js';
import { HomeTownDialogue } from '../ui/HomeTownDialogue.js';
import { moneyManager, ECONOMY_CATEGORY } from '../managers/MoneyManager.js';
import * as Art from './lombard/LombardArt.js';
import { TEXT, BROKER } from './lombard/LombardText.js';

const KEY = 'LombardScene';
let instances = 0;
// Survives scene restarts during one session (not saved to disk on purpose).
const memory = { visits: 0, watchPawned: false, counters: {} };

export class LombardScene extends BaseScene {
  constructor() { super({ key: KEY }); }

  init() {
    this.uid = ++instances;
    this.disposed = false; this.leaving = false; this.modal = false;
    this.textureKeys = new Set(); this.hotspots = []; this.statusTimer = null;
    this.dialogue = null; this.stage = null; this.fit = { s: 1, x: 0, y: 0 };
  }

  create() {
    super.create();
    this.registry.set('currentSceneKey', KEY);
    this.cameras.main.setBackgroundColor('#0d0b10');
    memory.visits += 1;
    this.stage = this.add.container(0, 0);
    this.dialogue = new HomeTownDialogue(this, () => { this.modal = false; });
    this.buildTextures();
    this.buildWorld();
    this.buildHotspots();
    this.buildInterface();
    this.trackInputEvent(this.scale, 'resize', this.layout);
    if (this.input.keyboard) this.trackInputEvent(this.input.keyboard, 'keydown', this.onKey);
    this.events.once('shutdown', this.disposeShop, this);
    this.events.once('destroy', this.disposeShop, this);
    this.layout();
    if (memory.visits === 1) this.time.delayedCall(500, () => this.say("Ziggy has already counted what's in your pockets. Twice."));
  }

  // ---------------------------------------------------------------- textures
  bake(name, w, h, draw) {
    const key = `lombard${this.uid}_${name}`;
    if (this.textures.exists(key)) return key;
    const tex = this.textures.createCanvas(key, w, h);
    draw(tex.getContext()); tex.refresh(); this.textureKeys.add(key);
    return key;
  }
  buildTextures() {
    this.tex = {
      bg: this.bake('bg', Art.ART_W, Art.ART_H, ctx => Art.paintLombardInterior(ctx)),
      ziggy: this.bake('ziggy', Art.ZIGGY_SIZE.w, Art.ZIGGY_SIZE.h, ctx => Art.paintZiggy(ctx)),
      cage: this.bake('cage', Art.CAGE.w, Art.CAGE.h, ctx => Art.paintCage(ctx)),
      portrait: this.bake('portrait', 180, 180, ctx => Art.paintZiggyPortrait(ctx, 180)),
      glow: this.bake('glow', 128, 128, ctx => Art.paintGlow(ctx, 128))
    };
  }

  // ------------------------------------------------------------------- world
  buildWorld() {
    const add = o => { this.stage.add(o); return o; };
    add(this.add.image(0, 0, this.tex.bg).setOrigin(0));

    // warm light: hanging lamp over the counter, glow on the glass case, shine on the gold balls
    add(this.add.image(960, 330, this.tex.glow).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd28a).setScale(9, 5).setAlpha(0.2));
    add(this.add.image(465, 735, this.tex.glow).setBlendMode(Phaser.BlendModes.ADD).setTint(0xa8e8ff).setScale(3.2, 1).setAlpha(0.2));
    const balls = add(this.add.image(960, 140, this.tex.glow).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffc866).setScale(4.5, 3.2).setAlpha(0.22));
    this.createTrackedTween({ targets: balls, alpha: { from: 0.15, to: 0.3 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // notice board text
    add(this.add.text(1585, 205, TEXT.notice, { fontFamily: 'SpecialElite, monospace', fontSize: '25px', color: '#3a2a14', align: 'center', lineSpacing: 6 }).setOrigin(0.5));

    // neon OPEN sign (flickers, the N is dying)
    const neon = add(this.add.text(540, 150, 'OPEN', { fontFamily: 'PressStart2P, monospace', fontSize: '40px', color: '#ff5a5a', stroke: '#ff2a2a', strokeThickness: 2 }).setOrigin(0.5));
    neon.setShadow(0, 0, '#ff2a2a', 22, true, true);
    this.createTrackedTween({ targets: neon, alpha: { from: 1, to: 0.78 }, duration: 160, yoyo: true, repeat: -1, hold: 900, repeatDelay: 700 });
    const dying = add(this.add.rectangle(540 + 20, 150, 40, 44, 0x0d0b10, 1).setAlpha(0));
    this.createTrackedTween({ targets: dying, alpha: { from: 0, to: 0.85 }, duration: 70, yoyo: true, repeat: -1, hold: 90, repeatDelay: 2300 });

    // dust in the lamp light
    try {
      add(this.add.particles(0, 0, this.tex.glow, { x: { min: 400, max: 1500 }, y: { min: 160, max: 760 }, lifespan: 7000, speedY: { min: -8, max: -2 }, speedX: { min: -5, max: 5 },
        scale: { start: 0.03, end: 0.018 }, alpha: { start: 0, end: 0.5, ease: 'Sine.easeOut' }, frequency: 300, blendMode: 'ADD' }));
    } catch (error) { console.debug('[LombardScene] Dust unavailable:', error); }

    // Ziggy behind the cage
    this.ziggy = add(this.add.image(960, 780, this.tex.ziggy).setOrigin(0.5, 1));
    this.createTrackedTween({ targets: this.ziggy, y: 783, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.createTrackedTween({ targets: this.ziggy, angle: { from: -0.7, to: 0.7 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    add(this.add.image(Art.CAGE.x, Art.CAGE.y, this.tex.cage).setOrigin(0));
  }

  // ---------------------------------------------------------------- hotspots
  buildHotspots() {
    const q = (id, title) => () => this.quip(id, title);
    const defs = [
      { id: 'sign', label: 'Three golden balls', x: 960, y: 140, w: 260, h: 230, act: q('sign', 'THE SIGN') },
      { id: 'neon', label: 'Neon sign', x: 540, y: 150, w: 220, h: 80, act: q('neon', 'NEON') },
      { id: 'notice', label: 'Notice board', x: 1585, y: 205, w: 290, h: 150, act: q('notice', 'NOTICE') },
      { id: 'trumpet', label: 'Trumpet', x: 440, y: 275, w: 170, h: 110, act: q('trumpet', 'TRUMPET') },
      { id: 'clock', label: 'Clock', x: 600, y: 280, w: 110, h: 110, act: q('clocks', 'CLOCKS') },
      { id: 'fish', label: 'Stuffed fish', x: 800, y: 265, w: 150, h: 100, act: q('fish', 'SIR REGINALD') },
      { id: 'globe', label: 'Globe', x: 1030, y: 270, w: 100, h: 110, act: q('globe', 'GLOBE') },
      { id: 'helmet', label: 'Helmet', x: 1220, y: 280, w: 100, h: 100, act: q('helmet', 'HELMET') },
      { id: 'camera', label: 'Camera', x: 1400, y: 285, w: 120, h: 90, act: q('camera', 'CAMERA') },
      { id: 'typewriter', label: 'Typewriter', x: 400, y: 465, w: 140, h: 110, act: q('typewriter', 'TYPEWRITER') },
      { id: 'tv', label: 'TV', x: 585, y: 450, w: 140, h: 130, act: q('tv', 'TV') },
      { id: 'boombox', label: 'Boombox', x: 800, y: 480, w: 150, h: 70, act: q('boombox', 'BOOMBOX') },
      { id: 'teddy', label: 'Teddy bear', x: 1200, y: 455, w: 110, h: 110, act: q('teddy', 'TEDDY') },
      { id: 'microwave', label: 'Microwave', x: 1400, y: 485, w: 140, h: 75, act: q('microwave', 'MICROWAVE') },
      { id: 'sax', label: 'Saxophone', x: 1400, y: 630, w: 100, h: 130, act: q('sax', 'SAXOPHONE') },
      { id: 'grandfather', label: 'Grandfather clock', x: 185, y: 550, w: 160, h: 520, act: q('clocks', 'CLOCKS') },
      { id: 'safe', label: 'Safe', x: 1795, y: 685, w: 190, h: 250, act: q('safe', 'THE SAFE') },
      { id: 'case', label: 'Glass case', x: 465, y: 735, w: 340, h: 110, act: q('case', 'GLASS CASE') },
      { id: 'bell', label: 'Service bell', x: 1420, y: 688, w: 70, h: 44, act: () => this.ringBell() },
      { id: 'ziggy', label: BROKER, x: 960, y: 640, w: 270, h: 300, act: () => this.talkBroker() },
      { id: 'exit', label: TEXT.exitLabel, x: 960, y: 1045, w: 560, h: 70, act: () => void this.leave() }
    ];
    for (const d of defs) this.addHotspot(d);
  }
  addHotspot(def) {
    const zone = this.add.zone(def.x, def.y, def.w, def.h).setInteractive({ useHandCursor: true });
    const box = this.add.rectangle(def.x, def.y, def.w, def.h, 0xffd27d, 0.08).setStrokeStyle(3, 0xffd277, 0.85).setVisible(false);
    const label = this.add.text(def.x, Math.max(26, def.y - def.h / 2 - 8), def.label, { fontFamily: 'SpecialElite, monospace', fontSize: '28px', color: '#ffe3a4', backgroundColor: '#18201c', padding: { x: 10, y: 6 } })
      .setOrigin(0.5, 1).setVisible(false).setDepth(50);
    this.stage.add([box, zone, label]);
    zone.on('pointerover', () => { if (this.canAct()) { box.setVisible(true); label.setVisible(true); } });
    zone.on('pointerout', () => { box.setVisible(false); label.setVisible(false); });
    zone.on('pointerdown', () => { if (!this.canAct()) return; box.setVisible(false); label.setVisible(false); def.act(); });
    this.hotspots.push({ def, zone, box, label });
  }
  canAct() { return !this.disposed && !this.leaving && !this.modal; }

  // --------------------------------------------------------------- interface
  buildInterface() {
    const font = { fontFamily: 'PressStart2P, monospace', fontSize: '16px', color: '#ffe19b', padding: { x: 16, y: 11 } };
    this.titleText = this.add.text(20, 16, TEXT.title, font).setDepth(20000);
    this.hintText = this.add.text(20, 70, TEXT.hint, { fontFamily: 'SpecialElite, monospace', fontSize: '22px', color: '#f4e4c0', padding: { x: 14, y: 8 }, wordWrap: { width: 620 } }).setDepth(20000);
    this.backText = this.add.text(0, 16, TEXT.back, font).setOrigin(1, 0).setDepth(20000).setInteractive({ useHandCursor: true });
    this.backText.on('pointerdown', () => { if (!this.modal) void this.leave(); });
    this.panel = this.add.graphics().setDepth(19990);
  }
  paintPanels() {
    const g = this.panel; if (!g?.active) return; g.clear();
    for (const t of [this.titleText, this.hintText, this.backText]) {
      const x = t.x - t.width * t.originX, y = t.y - t.height * t.originY;
      g.fillStyle(0x000000, 0.3).fillRoundedRect(x + 3, y + 4, t.width, t.height, 8);
      g.fillStyle(0x262b26, 0.92).fillRoundedRect(x, y, t.width, t.height, 8);
      g.lineStyle(2, 0xb89a58, 1).strokeRoundedRect(x, y, t.width, t.height, 8);
    }
  }
  layout() {
    if (this.disposed || !this.stage) return;
    const { width: w, height: h } = this.scale;
    const s = Math.min(w / Art.ART_W, h / Art.ART_H);
    this.fit = { s, x: (w - Art.ART_W * s) / 2, y: (h - Art.ART_H * s) / 2 };
    this.stage.setPosition(this.fit.x, this.fit.y).setScale(s);
    this.backText.setX(w - 20); this.hintText.setWordWrapWidth(Math.max(200, Math.min(620, w - 40)));
    this.paintPanels();
  }
  say(text) {
    if (this.disposed || !this.hintText?.active) return;
    this.statusTimer?.remove(false); this.hintText.setText(text); this.paintPanels();
    this.statusTimer = this.time.delayedCall(6000, () => { if (!this.disposed && this.hintText?.active) { this.hintText.setText(TEXT.hint); this.paintPanels(); } this.statusTimer = null; });
  }

  // ---------------------------------------------------------------- dialogue
  show(title, text, choices = [], portrait = false) {
    if (this.disposed || this.leaving) return;
    this.modal = true;
    for (const h of this.hotspots) { h.box.setVisible(false); h.label.setVisible(false); }
    this.dialogue.show({ title, text, choices, portrait: portrait ? this.tex.portrait : null });
  }
  closePanel() { this.dialogue?.close(false); this.modal = false; }
  next(id) { const n = memory.counters[id] ?? 0; memory.counters[id] = n + 1; return n; }
  quip(id, title) { const list = TEXT.quips[id]; this.show(title, list[this.next(id) % list.length]); }
  balanceNote() { try { return `\n\n(Cash: $${moneyManager.getBalance()})`; } catch { return ''; } }
  ringBell() {
    this.createTrackedTween({ targets: this.ziggy, y: this.ziggy.y - 16, duration: 90, yoyo: true });
    this.cameras.main.shake(120, 0.002);
    this.quip('bell', 'SERVICE BELL');
  }

  // Ziggy: the pawn deal and a bit of fence wisdom.
  talkBroker(menu = false) {
    const T = TEXT, C = T.choices, again = label => [label, () => this.talkBroker(true)];
    this.show(BROKER, menu ? T.menu : T.greeting, [
      [C.pawn, () => this.pawnMenu()],
      [C.buy, () => this.show(BROKER, T.buy, [again('I see.')], true)],
      [C.stolen, () => this.show(BROKER, T.stolen, [again('Noted. Written down.')], true)],
      [C.bye, () => this.show(BROKER, T.bye, [], true)]
    ], true);
  }
  pawnMenu() {
    const T = TEXT, P = T.pawnChoices, back = () => this.pawnMenu(), main = () => this.talkBroker(true);
    const choices = [];
    if (!memory.watchPawned) choices.push([P.watch, () => this.show(BROKER, T.watchOffer, [
      [T.watchDeal, () => this.pawnWatch()], [T.watchNoDeal, () => this.show(BROKER, T.watchNoDealReply, [['Back', back]], true)]], true)]);
    else choices.push([P.redeem, () => this.redeemWatch()]);
    choices.push([P.pigeon, () => this.show(BROKER, T.pigeon, [['Back', back]], true)]);
    choices.push([P.dignity, () => this.show(BROKER, T.dignity, [['Back', back]], true)]);
    choices.push([P.back, main]);
    this.show(BROKER, T.pawnMenu, choices, true);
  }
  pawnWatch() {
    try { moneyManager.refund(15, { category: ECONOMY_CATEGORY.ITEM, description: "Pocket watch pawned at Ziggy's" }); }
    catch (error) { console.warn('[LombardScene] Pawn payout failed:', error); this.show(BROKER, TEXT.noWatch, [['Back', () => this.pawnMenu()]], true); return; }
    memory.watchPawned = true;
    this.show(BROKER, TEXT.watchPawned + this.balanceNote(), [['Anything else?', () => this.talkBroker(true)]], true);
  }
  redeemWatch() {
    let paid = false;
    try { paid = moneyManager.spend(20, { category: ECONOMY_CATEGORY.ITEM, description: "Pocket watch redeemed at Ziggy's" })?.ok === true; }
    catch (error) { console.warn('[LombardScene] Redeem failed:', error); }
    if (paid) { memory.watchPawned = false; this.show(BROKER, TEXT.redeemOk + this.balanceNote(), [['Anything else?', () => this.talkBroker(true)]], true); }
    else this.show(BROKER, TEXT.redeemBroke + this.balanceNote(), [['Back', () => this.pawnMenu()]], true);
  }

  // ------------------------------------------------------------------- input
  onKey(event) {
    if (this.disposed || this.leaving || event.repeat) return;
    if (event.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
    if (event.code !== 'Escape') return;
    event.preventDefault();
    if (this.modal) this.closePanel(); else void this.leave();
  }

  async leave() {
    if (this.leaving || this.disposed) return;
    this.leaving = true; this.closePanel();
    try {
      const moved = await this.goto('HomeCityScene', { entryPoint: 'pawn-shop', fromScene: KEY });
      if (moved === false && !this.disposed) { this.leaving = false; this.say('The door is stuck. Ziggy says it is a "security feature".'); }
    } catch (error) {
      console.error('[LombardScene] Exit failed:', error);
      if (!this.disposed) { this.leaving = false; this.say('The door is stuck. Ziggy says it is a "security feature".'); }
    }
  }

  disposeShop() {
    if (this.disposed) return;
    this.disposed = true;
    this.statusTimer?.remove(false); this.statusTimer = null;
    this.dialogue?.destroy(); this.dialogue = null;
    const textures = this.textures, keys = [...this.textureKeys];   // removed late: objects are still being destroyed
    setTimeout(() => { try { for (const k of keys) if (textures.exists(k)) textures.remove(k); } catch { /* game destroyed */ } }, 80);
    this.textureKeys.clear(); this.hotspots = [];
    this.events.off('shutdown', this.disposeShop, this); this.events.off('destroy', this.disposeShop, this);
  }
}