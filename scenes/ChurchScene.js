// =============================================================================
// ChurchScene.js - interior of St. John Church (home town).
// Fully procedural (no image assets): ChurchArt.js paints the nave into a canvas
// texture, everything alive (priest, pigeon, candles, lanterns, dust) is Phaser.
// Hotspots are clickable things with jokes; the priest has a small dialogue tree.
// =============================================================================
import { BaseScene } from './BaseScene.js';
import { HomeTownDialogue } from '../ui/HomeTownDialogue.js';
import { moneyManager, ECONOMY_CATEGORY } from '../managers/MoneyManager.js';
import * as Art from './church/ChurchArt.js';
import { TEXT, PRIEST } from './church/ChurchText.js';

const KEY = 'ChurchScene';
let instances = 0;
// Survives scene restarts during one session (not saved to disk on purpose).
const memory = { visits: 0, donated: 0, candles: 0, counters: {} };

export class ChurchScene extends BaseScene {
  constructor() { super({ key: KEY }); }

  init() {
    this.uid = ++instances;
    this.disposed = false; this.leaving = false; this.modal = false;
    this.textureKeys = new Set(); this.hotspots = []; this.flames = []; this.statusTimer = null;
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
    this.events.once('shutdown', this.disposeChurch, this);
    this.events.once('destroy', this.disposeChurch, this);
    this.layout();
    if (memory.visits === 1) this.time.delayedCall(500, () => this.say('The pigeon in the rafters has noticed you. Act natural.'));
  }

  // ---------------------------------------------------------------- textures
  bake(name, w, h, draw) {
    const key = `church${this.uid}_${name}`;
    if (this.textures.exists(key)) return key;
    const tex = this.textures.createCanvas(key, w, h);
    draw(tex.getContext()); tex.refresh(); this.textureKeys.add(key);
    return key;
  }
  buildTextures() {
    this.tex = {
      bg: this.bake('bg', Art.ART_W, Art.ART_H, ctx => Art.paintChurchInterior(ctx)),
      priest: this.bake('priest', Art.PRIEST_SIZE.w, Art.PRIEST_SIZE.h, ctx => Art.paintPriest(ctx)),
      portrait: this.bake('portrait', 180, 180, ctx => Art.paintPriestPortrait(ctx, 180)),
      pigeon: this.bake('pigeon', Art.PIGEON_SIZE.w, Art.PIGEON_SIZE.h, ctx => Art.paintPigeon(ctx)),
      glow: this.bake('glow', 128, 128, ctx => Art.paintGlow(ctx, 128)),
      flame: this.bake('flame', Art.FLAME_SIZE.w, Art.FLAME_SIZE.h, ctx => Art.paintFlame(ctx, Art.FLAME_SIZE.w, Art.FLAME_SIZE.h))
    };
  }

  // ------------------------------------------------------------------- world
  buildWorld() {
    const add = o => { this.stage.add(o); return o; };
    add(this.add.image(0, 0, this.tex.bg).setOrigin(0));

    // warm glow around the lanterns
    for (const p of Art.lanternGlowPoints()) {
      const g = add(this.add.image(p.x, p.y, this.tex.glow).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffc866).setScale(p.s * 3.2).setAlpha(0.45));
      this.createTrackedTween({ targets: g, alpha: { from: 0.32, to: 0.52 }, duration: 900 + Math.random() * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 700 });
    }
    // light on the altar
    add(this.add.image(960, 560, this.tex.glow).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd9a0).setScale(3.2, 1.6).setAlpha(0.28));

    // donation plaque text
    const dp = Art.DONATION_PLAQUE;
    add(this.add.text(dp.x + dp.w / 2, dp.y + dp.h / 2, 'DONATE', { fontFamily: 'SpecialElite, monospace', fontSize: '17px', color: '#3a2a0a' }).setOrigin(0.5));

    // hymn board (right of the great window)
    const board = add(this.add.graphics());
    board.fillStyle(0x2a1a0e, 1).fillRect(1100, 330, 96, 124).lineStyle(3, 0xc9a24a, 1).strokeRect(1100, 330, 96, 124);
    for (let i = 0; i < 4; i++) board.fillStyle(0xf1ead2, 1).fillRect(1114 + (i % 2) * 40, 346 + Math.floor(i / 2) * 50, 32, 38);
    [['12', 1114, 346], ['12', 1154, 346], ['404', 1114, 396], ['7', 1154, 396]].forEach(([t, x, y]) =>
      add(this.add.text(x + 16, y + 19, t, { fontFamily: 'PressStart2P, monospace', fontSize: t.length > 2 ? '10px' : '13px', color: '#2a1a0e' }).setOrigin(0.5)));

    // dust motes in the light
    try {
      const dust = this.add.particles(0, 0, this.tex.glow, { x: { min: 320, max: 1600 }, y: { min: 140, max: 860 }, lifespan: 7000, speedY: { min: -9, max: -2 }, speedX: { min: -5, max: 5 },
        scale: { start: 0.035, end: 0.02 }, alpha: { start: 0, end: 0.55, ease: 'Sine.easeOut' }, frequency: 260, blendMode: 'ADD' });
      add(dust);
    } catch (error) { console.debug('[ChurchScene] Dust unavailable:', error); }

    // candles
    for (let i = 0; i < memory.candles; i++) this.addFlame(i, false);

    // bell rope (swings from the ceiling)
    this.rope = add(this.add.container(1700, 0));
    const rg = this.add.graphics(); this.rope.add(rg);
    rg.lineStyle(7, 0xb89a68, 1).lineBetween(0, 0, 0, 340);
    for (let i = 0; i < 6; i++) rg.fillStyle(i % 2 ? 0xb8302a : 0xf1ead2, 1).fillRoundedRect(-11, 330 + i * 12, 22, 12, 4);
    rg.fillStyle(0xb89a68, 1).fillRect(-5, 402, 10, 14);

    // pigeon on a rib of the vault
    this.pigeon = add(this.add.image(1290, 192, this.tex.pigeon).setOrigin(0.5, 0.92).setScale(0.8));
    this.createTrackedTween({ targets: this.pigeon, angle: { from: -3, to: 3 }, y: '+=2', duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Father Crumb behind the altar steps
    this.priest = add(this.add.image(960, 650, this.tex.priest).setOrigin(0.5, 418 / Art.PRIEST_SIZE.h).setScale(0.56));
    this.createTrackedTween({ targets: this.priest, scaleY: { from: 0.56, to: 0.567 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.createTrackedTween({ targets: this.priest, angle: { from: -0.8, to: 0.8 }, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  addFlame(index, announce = true) {
    const spot = Art.CANDLE_SPOTS[index]; if (!spot) return false;
    const y = spot.y - 30;
    const glow = this.add.image(spot.x, y - 18, this.tex.glow).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffb050).setScale(0.9).setAlpha(0.5);
    const flame = this.add.image(spot.x, y, this.tex.flame).setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD);
    this.stage.add([glow, flame]); this.flames.push(flame, glow);
    this.createTrackedTween({ targets: flame, scaleY: { from: 0.85, to: 1.15 }, scaleX: { from: 1.05, to: 0.9 }, duration: 140 + Math.random() * 160, yoyo: true, repeat: -1, delay: Math.random() * 200 });
    this.createTrackedTween({ targets: glow, alpha: { from: 0.35, to: 0.6 }, duration: 300 + Math.random() * 300, yoyo: true, repeat: -1 });
    if (announce) this.createTrackedTween({ targets: flame, alpha: { from: 0, to: 1 }, duration: 400 });
    return true;
  }

  // ---------------------------------------------------------------- hotspots
  buildHotspots() {
    const T = TEXT;
    const defs = [
      { id: 'pews-l', label: 'Pews', x: 600, y: 890, w: 330, h: 210, act: () => this.quip('pews', 'PEWS') },
      { id: 'pews-r', label: 'Pews', x: 1280, y: 930, w: 300, h: 170, act: () => this.quip('pews', 'PEWS') },
      { id: 'window', label: 'Stained glass', x: 960, y: 240, w: 240, h: 330, act: () => this.quip('window', 'ST. JOHN') },
      { id: 'altar', label: 'Altar', x: 960, y: 610, w: 190, h: 80, act: () => this.quip('altar', 'ALTAR') },
      { id: 'hymns', label: 'Hymn board', x: 1148, y: 392, w: 110, h: 140, act: () => this.quip('hymns', 'HYMN BOARD') },
      { id: 'organ', label: 'Organ', x: 545, y: 500, w: 330, h: 700, act: () => this.quip('organ', 'ORGAN') },
      { id: 'confessional', label: 'Confessional', x: 1372, y: 510, w: 320, h: 690, act: () => this.confessional() },
      { id: 'donations', label: 'Donation box', x: 300, y: 790, w: 230, h: 430, act: () => this.donationBox() },
      { id: 'candles', label: 'Votive candles', x: 1625, y: 905, w: 290, h: 270, act: () => this.candleStand() },
      { id: 'rope', label: 'Bell rope', x: 1700, y: 330, w: 80, h: 200, act: () => this.pullRope() },
      { id: 'pigeon', label: 'Pigeon', x: 1290, y: 180, w: 120, h: 110, act: () => this.pigeonQuip() },
      { id: 'priest', label: 'Father Crumb', x: 960, y: 535, w: 150, h: 250, act: () => this.talkPriest() },
      { id: 'exit', label: T.exitLabel, x: 960, y: 1035, w: 560, h: 90, act: () => void this.leave() }
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
  pigeonQuip() {
    this.quip('pigeon', 'PIGEON');
    // a feather drifts down
    const f = this.add.ellipse(this.pigeon.x, this.pigeon.y, 8, 22, 0xe8e8e8).setAngle(30); this.stage.add(f);
    this.createTrackedTween({ targets: f, y: f.y + 300, x: f.x - 70, angle: 220, alpha: 0, duration: 2400, ease: 'Sine.easeInOut', onComplete: () => f.destroy() });
  }
  pullRope() {
    this.cameras.main.shake(260, 0.004);
    this.createTrackedTween({ targets: this.rope, angle: { from: 0, to: 4 }, duration: 160, yoyo: true, repeat: 3, ease: 'Sine.easeInOut', onComplete: () => this.rope?.setAngle(0) });
    this.createTrackedTween({ targets: this.pigeon, y: this.pigeon.y - 28, duration: 120, yoyo: true });
    this.quip('bell', 'BELL ROPE');
  }

  talkPriest(menu = false) {
    const T = TEXT, C = T.priestChoices;
    const back = () => this.talkPriest(true);
    const more = label => [label, back];
    this.show(PRIEST, menu ? T.priestMenu : T.priestGreeting, [
      [C.about, () => this.show(PRIEST, T.about, [[T.aboutChoices.incident, () => this.show(PRIEST, T.incident, [more('Wow. Anyway.')], true)], more('Interesting.')], true)],
      [C.gossip, () => this.show(PRIEST, T.gossip, [more('Noted. Not noted.')], true)],
      [C.bless, () => this.show(PRIEST, T.bless, [more('Thank you, Father.')], true)],
      [C.advice, () => this.show(PRIEST, T.advice, [more('Check Tuesday. Got it.')], true)],
      [C.bye, () => this.show(PRIEST, T.priestBye, [], true)]
    ], true);
  }

  confessional() {
    const C = TEXT.confessional;
    this.show('CONFESSIONAL', C.intro, [
      [C.confess, () => this.show('CONFESSIONAL', C.confessions[this.next('confess') % C.confessions.length], [[C.confess, () => this.confessional()], [C.leave, () => this.closePanel()]])],
      [C.eavesdrop, () => this.show('CONFESSIONAL', C.eavesdropText, [[C.leave, () => this.closePanel()]])],
      [C.leave, () => this.closePanel()]
    ]);
  }

  tryPay(amount, description) {
    try {
      const result = moneyManager.spend(amount, { category: ECONOMY_CATEGORY.ITEM, description });
      return result?.ok === true;
    } catch (error) { console.warn('[ChurchScene] Payment failed:', error); return false; }
  }
  balanceNote() { try { return `\n\n(Cash: $${moneyManager.getBalance()})`; } catch { return ''; } }

  donationBox() {
    const D = TEXT.donation;
    const choices = D.amounts.map(a => [`Donate $${a}`, () => {
      if (this.tryPay(a, 'Donation to St. John Church')) {
        memory.donated += a;
        this.show('DONATION BOX', D.thanks[this.next('donate') % D.thanks.length] + this.balanceNote(), [['Donate again', () => this.donationBox()], [D.leave, () => this.closePanel()]]);
      } else this.show('DONATION BOX', D.broke + this.balanceNote(), [[D.leave, () => this.closePanel()]]);
    }]);
    choices.push([D.leave, () => this.closePanel()]);
    this.show('DONATION BOX', D.intro + (memory.donated ? `\n\nYou have donated $${memory.donated} so far. The box remembers.` : ''), choices);
  }

  candleStand() {
    const C = TEXT.candles;
    const choices = [[C.light, () => {
      if (memory.candles >= Art.CANDLE_SPOTS.length) { this.show('CANDLES', C.full, [[C.leave, () => this.closePanel()]]); return; }
      if (!this.tryPay(2, 'Votive candle at St. John Church')) { this.show('CANDLES', C.broke + this.balanceNote(), [[C.leave, () => this.closePanel()]]); return; }
      this.addFlame(memory.candles); memory.candles += 1;
      this.show('CANDLES', C.lit[this.next('candle') % C.lit.length] + this.balanceNote(), [[C.light, () => this.candleStand()], [C.leave, () => this.closePanel()]]);
    }], [C.leave, () => this.closePanel()]];
    this.show('CANDLES', C.intro, choices);
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
      const moved = await this.goto('HomeCityScene', { entryPoint: 'church', fromScene: KEY });
      if (moved === false && !this.disposed) { this.leaving = false; this.say('The door is stuck. Divine intervention, probably.'); }
    } catch (error) {
      console.error('[ChurchScene] Exit failed:', error);
      if (!this.disposed) { this.leaving = false; this.say('The door is stuck. Divine intervention, probably.'); }
    }
  }

  disposeChurch() {
    if (this.disposed) return;
    this.disposed = true;
    this.statusTimer?.remove(false); this.statusTimer = null;
    this.dialogue?.destroy(); this.dialogue = null;
    const textures = this.textures, keys = [...this.textureKeys];   // removed late: objects are still being destroyed
    setTimeout(() => { try { for (const k of keys) if (textures.exists(k)) textures.remove(k); } catch { /* game destroyed */ } }, 80);
    this.textureKeys.clear(); this.hotspots = []; this.flames = [];
    this.events.off('shutdown', this.disposeChurch, this); this.events.off('destroy', this.disposeChurch, this);
  }
}