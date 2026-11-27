import { BaseScene } from '../BaseScene.js';
import { SHOEPRINT_TEXT as TEXT } from './ShoeprintText.js';
import { createForensicExitButton } from './BaseForensicMinigame.js';

const FONT_PIXEL = 'PressStart2P';
const FONT_TYPE = 'SpecialElite';
const FIELD = 'shoe_size_category';
const PROFILES = Object.freeze({
  small: Object.freeze({ size: 38, sole: 'RUBBER', wear: 'right_toe', value: 'small' }),
  medium: Object.freeze({ size: 41, sole: 'VIBRAM', wear: 'left_heel', value: 'medium' }),
  large: Object.freeze({ size: 44, sole: 'LUGGED', wear: 'outer_edge', value: 'large' })
});
const VALUES = Object.freeze(Object.keys(PROFILES));
const PAL = {
  bgTop: 0x13262c, bgBottom: 0x070d10, tile: 0x1d3a42,
  panel: 0x0a1519, panelEdge: 0x2f6b5c, green: 0x39ff88,
  amber: 0xffc247, red: 0xff4d5e, text: 0xd7efe3, dim: 0x6f9a8a,
  plaster: 0xd8cbae, plasterDark: 0xbba982, plasterLight: 0xf2e8cf,
  plasterShadow: 0x8c7c5c, plasterTread: 0x6a5a3c
};
const OUTLINE = [[0,0],[.02,.42],[.06,.66],[.14,.88],[.26,1],[.40,.93],
  [.55,.72],[.68,.66],[.80,.74],[.90,.76],[.96,.62],[.99,.40],[1,0]];
const PATTERNS = { RUBBER: 'ribs', VIBRAM: 'studs', LUGGED: 'blocks' };
const css = n => `#${n.toString(16).padStart(6, '0')}`;
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const record = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const normalize = v => typeof v === 'string' ? v.trim().toLowerCase() : null;
function t(key, vars = {}) {
  const template = TEXT[key];
  if (typeof template !== 'string') throw Error(`Missing shoeprint text: ${key}`);
  return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
}
function label(group, key) {
  const value = TEXT[group]?.[key];
  if (typeof value !== 'string' || !value.trim()) throw Error(`Missing shoeprint label: ${group}/${key}`);
  return value;
}
function mix(a, b, k) {
  return [16, 8, 0].reduce((n, shift) => n | (Math.round(
    ((a >> shift) & 255) + (((b >> shift) & 255) - ((a >> shift) & 255)) * k
  ) << shift), 0);
}
function halfWidthAt(t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < OUTLINE.length; i++) {
    const [b, wb] = OUTLINE[i], [a, wa] = OUTLINE[i - 1];
    if (t <= b) return wa + (wb - wa) * (t - a) / (b - a);
  }
  return 0;
}
function line(g, x1, y1, x2, y2) {
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
}
function drawSole(g, cx, top, length, sole, wear, style) {
  const pattern = PATTERNS[sole];
  if (!pattern || !['right_toe', 'left_heel', 'outer_edge'].includes(wear)) {
    throw Error('Invalid sole geometry identifier.');
  }
  const half = length * .19, hw = t => halfWidthAt(t) * half;
  const outline = (dx = 0, dy = 0) => {
    g.beginPath();
    for (let i = 0; i <= 60; i++) {
      const t = i / 60, x = cx - hw(t) + dx, y = top + t * length + dy;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    for (let i = 60; i >= 0; i--) {
      const t = i / 60; g.lineTo(cx + hw(t) + dx, top + t * length + dy);
    }
    g.closePath();
  };
  if (style.emboss) {
    g.fillStyle(style.shadow, 1); outline(2, 2); g.fillPath();
    g.fillStyle(style.light, 1); outline(-2, -2); g.fillPath();
  }
  g.fillStyle(style.base, 1); outline(); g.fillPath();
  g.fillStyle(style.tread, 1);
  g.lineStyle(Math.max(2, length * .011), style.tread, 1);
  const step = pattern === 'ribs' ? .05 : pattern === 'studs' ? .055 : .095;
  for (const [start, end] of [[.07,.50],[.69,.94]]) {
    let row = 0;
    for (let t = start; t <= end; t += step, row++) {
      const y = top + t * length, w = hw(t) * .84;
      if (pattern === 'ribs') {
        const d = length * .016;
        g.beginPath(); g.moveTo(cx - w, y + d); g.lineTo(cx, y - d);
        g.lineTo(cx + w, y + d); g.strokePath();
      } else if (pattern === 'studs') {
        const stepX = half * .38, b = length * .013, offset = (row % 2) * stepX * .5;
        for (let k = -4; k <= 4; k++) {
          const x = cx + k * stepX + offset;
          if (Math.abs(x - cx) + b <= w) g.fillRect(x - b, y - b, b * 2, b * 2);
        }
      } else {
        const bw = half * .44, bh = length * .05;
        for (const dx of row % 2 ? [-.62 * half, 0, .62 * half] : [-.32 * half, .32 * half]) {
          if (Math.abs(dx) + bw / 2 <= w) g.fillRect(cx + dx - bw / 2, y - bh / 2, bw, bh);
        }
      }
    }
  }
  g.lineStyle(Math.max(1, length * .006), style.tread, .7);
  line(g, cx - hw(.655) * .9, top + .655 * length, cx + hw(.655) * .9, top + .655 * length);
  g.fillStyle(style.base, 1);
  if (wear === 'right_toe') {
    g.fillEllipse(cx + half * .42, top + length * .15, half * .8, length * .10);
  } else if (wear === 'left_heel') {
    g.fillEllipse(cx - half * .30, top + length * .84, half * .72, length * .11);
  } else {
    g.beginPath();
    for (let i = 0; i <= 23; i++) {
      const t = .28 + i * .02, x = cx + hw(t) - 1, y = top + t * length;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    for (let i = 23; i >= 0; i--) {
      const t = .28 + i * .02; g.lineTo(cx + hw(t) - half * .26, top + t * length);
    }
    g.closePath(); g.fillPath();
  }
  g.lineStyle(2, style.outline, 1); outline(); g.strokePath();
}

export class ShoeprintScene extends BaseScene {
  constructor() {
    super('ShoeprintScene');
    this._shoeprintSession = 0;
    this._shoeprintDisposed = true;
    this._pendingShoeprint = new Set();
    this._shoeprintTweens = new Set();
  }

  init(data = {}) {
    this._shoeprintSession++;
    this._shoeprintDisposed = true;
    this._pendingShoeprint = new Set();
    this._shoeprintTweens = new Set();
    this.evidence = {}; this.evidenceType = FIELD; this.correctValue = null;
    this.stationId = 'trace_0'; this.cityId = null; this.caseKey = null;
    this.clue = null; this.inputError = null; this.runtimeError = false;
    this.onComplete = null; this.onAbort = null;
    this.score = 100; this.mistakes = 0; this.startedAt = 0;
    this.timerStarted = false; this.finishedSeconds = null;
    this.finished = false; this.returningToLab = false; this.busy = false;
    this.introDone = false; this.cast = null; this.entries = []; this.cards = [];
    this.logRows = null; this.typeEvent = null; this.clockEvent = null;
    this._cancelTyping = null; this.lastQuip = -1; this.addButton = null;
    this.hudScore = null; this.hudErr = null; this.hudTime = null;
    this.castArea = null; this.castStampPos = null;
    try {
      if (!record(data)) throw Error('Scene data must be an object.');
      for (const key of ['evidence', 'evidenceConfig']) {
        if (own(data, key) && !record(data[key])) throw Error(`Invalid ${key}.`);
      }
      const sources = [data, data.evidence, data.evidenceConfig].filter(record);
      const incoming = { ...(data.evidenceConfig || {}), ...(data.evidence || {}) };
      this.stationId = data.stationId ?? incoming.stationId ?? 'trace_0';
      this.cityId = data.cityId ?? incoming.cityId ?? null;
      this.caseKey = data.caseKey ?? incoming.caseKey ?? null;
      this.onComplete = typeof data.onComplete === 'function' ? data.onComplete : null;
      this.onAbort = typeof data.onAbort === 'function' ? data.onAbort : null;
      if (!['trace_0', 'trace_1'].includes(this.stationId)) throw Error('Invalid station.');
      for (const source of sources) {
        for (const key of ['attribute', 'evidenceType', 'field', 'forensicField']) {
          if (own(source, key) && source[key] !== FIELD) throw Error(`Invalid ${key}.`);
        }
        for (const key of ['stationId', 'caseKey', 'cityId']) {
          if (source[key] != null && this[key] != null && String(source[key]) !== String(this[key])) {
            throw Error(`Conflicting ${key}.`);
          }
        }
      }
      const candidates = [];
      for (const source of sources) {
        for (const key of ['correctValue', 'thief_value', 'value', 'normalizedValue']) {
          if (!own(source, key)) continue;
          const value = normalize(source[key]);
          if (!VALUES.includes(value)) throw Error(`Invalid footwear value in ${key}.`);
          candidates.push(value);
        }
      }
      if (!candidates.length || new Set(candidates).size !== 1) throw Error('Missing or conflicting footwear values.');
      const value = candidates[0];
      for (const source of sources) {
        if (!own(source, 'allowedValues')) continue;
        const allowed = source.allowedValues;
        if (!Array.isArray(allowed) || !allowed.length || allowed.some(v => !VALUES.includes(normalize(v))) ||
            !allowed.some(v => normalize(v) === value)) throw Error('Invalid allowedValues.');
      }
      this.correctValue = value;
      this.score = Number.isFinite(data.startScore) ? Math.max(0, Math.min(120, data.startScore)) : 100;
      const clueText = data.clueText ?? incoming.clueText ?? t('clue', { value: label('categoryLabels', value) });
      if (typeof clueText !== 'string' || !clueText.trim()) throw Error('Invalid clue text.');
      const profile = PROFILES[value];
      this.evidence = {
        id: 'museum_windowsill_shoeprint', slot: 'trace', source: 'footwear_cast',
        label: t('evidenceLabel'), ...incoming,
        stationId: this.stationId, caseKey: this.caseKey,
        attribute: FIELD, evidenceType: FIELD, field: FIELD, forensicField: FIELD,
        correctValue: value, thief_value: value, value, normalizedValue: value,
        clueText, allowedValues: incoming.allowedValues ? [...incoming.allowedValues] : [...VALUES]
      };
      this.clue = {
        id: this.evidence.id, type: data.clueType ?? incoming.clueType ?? 'trace', text: clueText,
        facts: { shoeSizeCategory: value, size: profile.size, sole: profile.sole, wear: profile.wear }
      };
      if (!Array.isArray(TEXT.quips) || !TEXT.quips.length) throw Error('Missing quips.');
      for (const p of Object.values(PROFILES)) {
        label('wearLabels', p.wear); label('soleLabels', p.sole); label('categoryLabels', p.value);
      }
    } catch (error) {
      this.inputError = error;
      this.correctValue = null; this.clue = null;
      console.error('[ShoeprintScene] Evidence rejected; no result will be recorded.', error);
    }
  }

  create() {
    super.create();
    this._shoeprintDisposed = false;
    this.u = this.scale.height / 720;
    this.layout = this.computeLayout();
    this.buildBackdrop(); this.buildHeader(); this.buildExit();
    if (this.inputError) { this.showError('invalidBody'); return; }
    try {
      this.buildPuzzle(); this.buildCastPanel(); this.buildCards();
      this.buildReadout(); this.buildOverlay(); this.updateHud();
      void this.showIntro().catch(error => this.failAnalysis(error));
    } catch (error) { this.failAnalysis(error); }
  }

  alive(session = this._shoeprintSession) {
    return !this._shoeprintDisposed && !this._cleanupDone && !this.returningToLab && session === this._shoeprintSession;
  }
  px(n) { return `${Math.max(6, Math.round(n * this.u))}px`; }
  text(x, y, value, size = 18, color = PAL.text, pixel = false, depth = 3) {
    return this.add.text(x, y, String(value), {
      fontFamily: pixel ? FONT_PIXEL : FONT_TYPE, fontSize: this.px(size), color: css(color)
    }).setDepth(depth);
  }
  computeLayout() {
    const W = this.scale.width, H = this.scale.height, pad = W * .04;
    const castW = W * .32, gap = W * .015, cardsX = pad + castW + W * .04;
    return { W, H, pad, castW, gap, cardsX, cardW: (W - pad - cardsX - 2 * gap) / 3,
      top: H * .18, panelH: H * .58, pxPerCm: H * .0125, readoutY: H * .80, readoutH: H * .16 };
  }
  drawPanel(g, x, y, w, h, edge) {
    g.fillStyle(PAL.panel, .9); g.fillRect(x, y, w, h);
    g.lineStyle(2, edge, 1); g.strokeRect(x, y, w, h);
    const s = 5 * this.u; g.fillStyle(edge, 1);
    for (const [cx, cy] of [[x-2,y-2],[x+w-s+2,y-2],[x-2,y+h-s+2],[x+w-s+2,y+h-s+2]]) g.fillRect(cx, cy, s, s);
  }

  animate(config) {
    const tween = this.createTrackedTween(config);
    if (!tween) throw Error('Cannot create shoeprint tween.');
    this._shoeprintTweens.add(tween);
    const release = () => {
      this._shoeprintTweens.delete(tween);
      tween.off('complete', release); tween.off('stop', release); tween.off('remove', release);
    };
    tween.once('complete', release); tween.once('stop', release); tween.once('remove', release);
    return tween;
  }
  stopOwnTweensOf(target) {
    for (const tween of [...this._shoeprintTweens]) {
      if (tween.targets?.includes(target)) {
        this._shoeprintTweens.delete(tween); this.removeTrackedTween(tween);
      }
    }
  }
  buildExit() {
    this.exitButton = createForensicExitButton(this, () => this.abortMinigame());
    this.trackInputEvent(this.input.keyboard, 'keydown-ESC', this.abortMinigame, this);
  }
  showError(key) {
    const { W, H } = this.layout;
    this.add.rectangle(W/2, H*.47, W*.84, H*.5, PAL.panel, .98)
      .setStrokeStyle(2, PAL.red).setDepth(800);
    this.text(W/2, H*.34, t('invalidTitle'), 16, PAL.red, true, 801).setOrigin(.5);
    this.text(W/2, H*.48, t(key), 22, PAL.text, false, 801)
      .setOrigin(.5).setWordWrapWidth(W*.72).setAlign('center');
  }
  failAnalysis(error) {
    if (!this.alive() || this.runtimeError) return;
    this.runtimeError = true; this.finished = false; this.introDone = false;
    this.busy = false; this.clockEvent?.remove(false); this.clockEvent = null;
    for (const cancel of [...this._pendingShoeprint]) cancel();
    console.error('[ShoeprintScene] Analysis failed; no result recorded.', error);
    this.showError('runtimeError');
  }

  buildPuzzle() {
    const correct = PROFILES[this.correctValue];
    if (!correct) throw Error('No valid shoeprint profile.');
    const wrong = Phaser.Utils.Array.Shuffle(Object.values(PROFILES).filter(p => p.value !== correct.value));
    this.cast = { size: correct.size, sole: correct.sole, wear: correct.wear };
    this.entries = Phaser.Utils.Array.Shuffle([
      { ...correct },
      { ...wrong[0], sole: correct.sole },
      { ...wrong[1], wear: correct.wear }
    ]);
    this.entries.forEach((entry, i) => {
      const shared = ['size', 'sole', 'wear'].filter(key => entry[key] === this.cast[key]).length;
      entry.ok = shared === 3;
      if (entry.ok !== (entry.value === this.correctValue) || (!entry.ok && shared !== 1)) {
        throw Error('Ambiguous footwear puzzle.');
      }
      entry.id = t('bootId', { id: String(1138 + i * 911).padStart(4, '0') });
    });
    if (this.entries.filter(e => e.ok).length !== 1) throw Error('Puzzle requires exactly one match.');
  }
  buildBackdrop() {
    const { W, H } = this.layout, u = this.u, g = this.add.graphics().setDepth(0);
    for (let i = 0; i < 36; i++) {
      g.fillStyle(mix(PAL.bgTop, PAL.bgBottom, i/35), 1); g.fillRect(0, H/36*i, W, H/36+1);
    }
    g.lineStyle(1, PAL.tile, .35);
    for (let y = H*.1; y < H; y += 48*u) line(g, 0, y, W, y);
    for (let x = 0; x < W; x += 64*u) line(g, x, H*.1, x, H);
  }
  buildHeader() {
    const { W, H, pad } = this.layout;
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x050c0e, .96); g.fillRect(0, 0, W, H*.095);
    g.fillStyle(PAL.green, .8); g.fillRect(0, H*.095, W, 2*this.u);
    const title = this.text(pad, H*.0475, t('header'), 14, PAL.green, true).setOrigin(0,.5);
    const titleMax = W-pad-64; // keep clear of the shared X exit button
    if (title.width > titleMax-pad) title.setScale((titleMax-pad)/title.width);
    this.hudScore = this.text(pad, H*.13, '', 11, PAL.text, true).setOrigin(0,.5);
    this.hudErr = this.text(W*.35, H*.13, '', 11, PAL.text, true).setOrigin(0,.5);
    this.hudTime = this.text(W*.54, H*.13, '', 11, PAL.text, true).setOrigin(0,.5);
  }
  buildCastPanel() {
    const { pad, top, panelH, castW, pxPerCm } = this.layout, u = this.u;
    this.drawPanel(this.add.graphics().setDepth(1), pad, top, castW, panelH, PAL.panelEdge);
    this.text(pad+14*u, top+12*u, t('castTitle'), 9, PAL.amber, true);
    const sx = pad+14*u, sy = top+36*u, sw = castW-28*u, sh = panelH-134*u;
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(PAL.plasterShadow); g.fillRoundedRect(sx+4*u, sy+5*u, sw, sh, 10*u);
    g.fillStyle(PAL.plaster); g.fillRoundedRect(sx, sy, sw, sh, 10*u);
    g.fillStyle(PAL.plasterDark, .55);
    for (let i = 0; i < 90; i++) g.fillRect(sx+Math.random()*sw, sy+Math.random()*sh, 2*u, u);
    const bottom = sy+sh-16*u, rx = sx+8*u, rw = 16*u;
    const scale = Math.min(pxPerCm, (sh-24*u)/30);
    g.fillStyle(0xcfcab4); g.fillRect(rx, bottom-30*scale, rw, 30*scale);
    g.lineStyle(1, 0x4a4636);
    for (let cm = 0; cm <= 30; cm++) {
      const y = bottom-cm*scale;
      line(g, rx+rw, y, rx+rw-rw*(cm%5 ? .45 : .85), y);
      if (cm && cm%5 === 0) this.text(rx+rw+4*u, y, cm, 11, 0x4a4636).setOrigin(0,.5);
    }
    const cx = rx+rw+(sx+sw-rx-rw)/2, length = this.cast.size*(2/3)*scale;
    drawSole(g, cx, bottom-length, length, this.cast.sole, this.cast.wear, {
      base: PAL.plasterDark, tread: PAL.plasterTread, outline: 0x7d6d4e,
      emboss: true, light: PAL.plasterLight, shadow: PAL.plasterShadow
    });
    this.castArea = { x: sx, y: sy, w: sw, h: sh };
    this.castStampPos = { x: cx, y: sy+sh/2 };
    for (const [i, key] of ['size','sole','wear'].entries()) {
      const y = sy+sh+10*u+i*24*u;
      this.text(pad+16*u, y, t(key), 18, PAL.dim);
      this.text(pad+100*u, y, this.trait(this.cast, key), 18);
    }
  }
  trait(entry, key) {
    return key === 'size' ? String(entry.size) : label(key === 'wear' ? 'wearLabels' : 'soleLabels', entry[key]);
  }
  buildCards() {
    const { cardsX, cardW, gap, top, panelH, pxPerCm } = this.layout, u = this.u;
    const headH = 30*u, areaH = panelH-headH-88*u;
    this.cards = this.entries.map((entry, i) => {
      const x = cardsX+i*(cardW+gap), container = this.add.container(x, top).setDepth(5);
      const frame = this.add.graphics(); this.drawPanel(frame, 0, 0, cardW, panelH, PAL.panelEdge);
      frame.fillStyle(0x0f2a22); frame.fillRect(2, 2, cardW-4, headH-2);
      frame.lineStyle(1, PAL.green, .1);
      for (let gx = 20*u; gx < cardW; gx += 20*u) line(frame, gx, headH, gx, headH+areaH);
      for (let gy = headH+20*u; gy < headH+areaH; gy += 20*u) line(frame, 0, gy, cardW, gy);
      const soleG = this.add.graphics();
      const length = Math.min(entry.size*(2/3)*pxPerCm*.75, areaH-16*u);
      drawSole(soleG, cardW/2, headH+(areaH-length)/2, length, entry.sole, entry.wear,
        { base: 0x0f2a22, tread: PAL.green, outline: PAL.green });
      const header = this.text(cardW/2, headH/2, entry.id, 10, PAL.green, true).setOrigin(.5);
      const lines = {};
      ['size','sole','wear'].forEach((key, row) => {
        lines[key] = this.text(14*u, headH+areaH+10*u+row*24*u, t('traitLine',{trait:t(key),value:this.trait(entry,key)}), 17)
          .setWordWrapWidth(cardW-20*u);
      });
      const glow = this.add.graphics(); glow.lineStyle(3*u, PAL.amber); glow.strokeRect(0,0,cardW,panelH); glow.setAlpha(0);
      const hit = this.add.zone(0,0,cardW,panelH).setOrigin(0).setInteractive({ useHandCursor: true });
      container.add([frame, soleG, header, ...Object.values(lines), glow, hit]);
      const card = { entry, container, baseX:x, baseY:top, glow, lines, hit, w:cardW, h:panelH,
        area: { x, y:top+headH, w:cardW, h:areaH }, disabled:false };
      hit.on('pointerover', () => {
        if (!this.canPick(card)) return;
        glow.setAlpha(1); this.stopOwnTweensOf(container);
        this.animate({ targets:container, y:top-6*u, duration:100 });
      });
      hit.on('pointerout', () => {
        if (!this.alive() || card.disabled || this.finished || this.busy) return;
        glow.setAlpha(0); this.stopOwnTweensOf(container);
        this.animate({ targets:container, y:top, duration:100 });
      });
      hit.on('pointerdown', () => { void this.guessEntry(card).catch(error => this.failAnalysis(error)); });
      return card;
    });
  }
  buildReadout() {
    const { W, pad, readoutY:y, readoutH:h } = this.layout, u = this.u;
    this.drawPanel(this.add.graphics().setDepth(10), pad, y, W-pad*2, h, PAL.green);
    this.logRows = [.4,.55,.75,1].map((a,i) => this.text(pad+16*u, y+8*u+i*(h-16*u)/4, '', 18, PAL.text, false, 11)
      .setAlpha(a));
  }
  buildOverlay() {
    const { W,H,pad,top,panelH,castW } = this.layout, u = this.u;
    const x = pad+castW/2, y0 = H*.16, y1 = top+panelH, w = castW*.5;
    const cone = this.add.graphics().setDepth(4); cone.fillStyle(0xfff4c8,.07);
    cone.fillTriangle(x-14*u,y0,x+14*u,y0,x+w,y1); cone.fillTriangle(x-14*u,y0,x+w,y1,x-w,y1);
    this.animate({ targets:cone, alpha:.55, duration:1400, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    const vig = this.add.graphics().setDepth(58);
    for (let i=0;i<10;i++) { vig.lineStyle(14*u,0,.05); vig.strokeRect(i*10*u,i*10*u,W-i*20*u,H-i*20*u); }
    const scan = this.add.graphics().setDepth(60); scan.lineStyle(1,0,.08);
    for (let y=0;y<H;y+=4) line(scan,0,y,W,y);
  }

  say(value, color = css(PAL.text), charDelay = 14) {
    this._cancelTyping?.();
    if (!this.alive() || !this.logRows?.length) return Promise.resolve(false);
    const session = this._shoeprintSession, text = String(value ?? ''), rows = this.logRows;
    for (let i=0;i<rows.length-1;i++) { rows[i].setText(rows[i+1].text); rows[i].setColor(rows[i+1].style.color); }
    const row = rows[rows.length-1]; row.setText('').setColor(color);
    if (!text.length || charDelay <= 0) { row.setText(text); return Promise.resolve(true); }
    return new Promise(resolve => {
      let settled = false, timer = null, n = 0;
      const finish = ok => {
        if (settled) return;
        settled = true; timer?.remove(false);
        this._pendingShoeprint.delete(cancel);
        if (this._cancelTyping === cancel) { this._cancelTyping = null; this.typeEvent = null; }
        resolve(ok);
      };
      const cancel = () => finish(false);
      this._cancelTyping = cancel; this._pendingShoeprint.add(cancel);
      try {
        timer = this.time.addEvent({ delay:charDelay, repeat:text.length-1, callback:() => {
          if (!this.alive(session)) { finish(false); return; }
          n++;
          row.setText(n >= text.length ? text : text.slice(0,n)+t('cursor'));
          if (n >= text.length) finish(true);
        }});
        this.typeEvent = timer;
      } catch (error) { finish(false); throw error; }
    });
  }
  sweep(area, color, duration) {
    if (!this.alive() || !area) return Promise.resolve(false);
    return new Promise((resolve, reject) => {
      let settled=false, tween=null, beam=null, halo=null;
      const finish = ok => {
        if (settled) return;
        settled=true; this._pendingShoeprint.delete(cancel);
        if (tween) {
          tween.off('stop', cancel); tween.off('remove', cancel);
          this._shoeprintTweens.delete(tween);
          this.removeTrackedTween(tween);
        }
        beam?.destroy(); halo?.destroy(); resolve(ok);
      };
      const cancel = () => finish(false);
      this._pendingShoeprint.add(cancel);
      try {
        beam=this.add.rectangle(area.x,area.y,area.w,3*this.u,color,.9).setOrigin(0,.5).setDepth(20);
        halo=this.add.rectangle(area.x,area.y,area.w,18*this.u,color,.18).setOrigin(0,.5).setDepth(19);
        tween=this.animate({ targets:[beam,halo], y:area.y+area.h, duration, ease:'Sine.easeInOut', onComplete:()=>finish(true) });
        tween.once('stop',cancel); tween.once('remove',cancel);
      } catch (error) { cancel(); reject(error); }
    });
  }
  updateHud() {
    if (!this.alive() || !this.hudScore) return;
    const seconds=this.getSecondsElapsed();
    this.hudScore.setText(t('score',{score:this.score}));
    this.hudErr.setText(t('errors',{count:this.mistakes})).setColor(css(this.mistakes ? PAL.red : PAL.text));
    this.hudTime.setText(t('time',{seconds:String(seconds).padStart(2,'0')}))
      .setColor(css(this.timerStarted && seconds <= 15 ? PAL.green : this.timerStarted && seconds <= 30 ? PAL.amber : PAL.text));
  }
  async showIntro() {
    const session=this._shoeprintSession;
    try {
      for (const [key,vars,color] of [
        ['intro',{},PAL.text], ['notes',{size:this.cast.size,sole:this.trait(this.cast,'sole'),wear:this.trait(this.cast,'wear')},PAL.amber],
        ['instructions',{},PAL.text]
      ]) {
        if (!await this.say(t(key,vars),css(color),10) || !this.alive(session)) return;
      }
    } finally {
      if (this.alive(session) && !this.runtimeError && !this.inputError) {
        this.introDone=true; this.timerStarted=true; this.startedAt=this.time.now;
        this.clockEvent=this.time.addEvent({delay:250,loop:true,callback:()=>this.updateHud()});
      }
    }
  }
  canPick(card) {
    return this.alive() && this.introDone && !this.busy && !this.finished && !this.runtimeError && !this.inputError && !card.disabled;
  }
  async guessEntry(card) {
    if (!this.canPick(card)) return;
    const session=this._shoeprintSession;
    this.busy=true; this.stopOwnTweensOf(card.container); card.container.y=card.baseY; card.glow.setAlpha(1);
    try {
      const e=card.entry;
      const results=await Promise.all([
        this.say(t('checking',{id:e.id,size:e.size,sole:this.trait(e,'sole'),wear:this.trait(e,'wear')}),css(PAL.text),8),
        this.sweep(this.castArea,PAL.amber,1100),this.sweep(card.area,PAL.green,1100)
      ]);
      if (!this.alive(session)) return;
      if (!results.every(Boolean)) { card.glow.setAlpha(0); return; }
      if (e.ok) await this.handleCorrectEntry(card,session); else await this.handleWrongEntry(card,session);
    } finally { if (this.alive(session)) this.busy=false; }
  }
  stamp(x,y,key,color,size,angle) {
    const stamp=this.text(x,y,t(key),size,color,true,30).setOrigin(.5).setAngle(angle).setScale(2.4).setAlpha(0);
    stamp.setStroke('#000000',Math.round(4*this.u));
    this.animate({targets:stamp,scale:1,alpha:1,duration:220,ease:'Back.easeOut'});
    return stamp;
  }
  async handleCorrectEntry(card,session) {
    if (!this.alive(session)) return;
    this.finishedSeconds=this.getSecondsElapsed(); this.finished=true;
    this.clockEvent?.remove(false); this.clockEvent=null;
    const bonus=this.getTimeBonus(); this.score=Math.min(120,this.score+bonus); this.updateHud();
    Object.values(card.lines).forEach(row=>row.setColor(css(PAL.green)));
    card.glow.clear(); card.glow.lineStyle(4*this.u,PAL.green); card.glow.strokeRect(0,0,card.w,card.h); card.glow.setAlpha(1);
    this.animate({targets:card.glow,alpha:.35,duration:500,yoyo:true,repeat:-1});
    for (const other of this.cards) if (other!==card) this.animate({targets:other.container,alpha:.35,duration:300});
    this.stamp(this.castStampPos.x,this.castStampPos.y,'match',PAL.green,22,-12);
    this.stamp(card.area.x+card.area.w/2,card.area.y+card.area.h/2,'match',PAL.green,16,10);
    this.showAddButton(session);
    const messages=[['fullMatch',{},PAL.amber],['category',{value:label('categoryLabels',this.correctValue)},PAL.text]];
    if (bonus>0) messages.push(['bonus',{bonus},PAL.amber]);
    messages.push(['ready',{},PAL.green]);
    for (const [key,vars,color] of messages) {
      if (!await this.say(t(key,vars),css(color),10) || !this.alive(session)) return;
    }
  }
  async handleWrongEntry(card,session) {
    if (!this.alive(session)) return;
    this.mistakes++; this.score=Math.max(0,this.score-15); this.updateHud();
    const mismatched=[];
    for (const key of ['size','sole','wear']) {
      const same=card.entry[key]===this.cast[key];
      card.lines[key].setColor(css(same ? PAL.green : PAL.red));
      if (!same) mismatched.push(t(key));
    }
    card.disabled=true; card.hit.disableInteractive(); card.glow.setAlpha(0);
    this.stamp(card.area.x+card.area.w/2,card.area.y+card.area.h/2,'reject',PAL.red,16,-10);
    this.animate({targets:card.container,x:card.baseX+6*this.u,duration:50,yoyo:true,repeat:3,
      onComplete:()=>{if(this.alive(session)) card.container.x=card.baseX;}});
    this.animate({targets:card.container,alpha:.55,duration:400});
    let q=Phaser.Math.Between(0,TEXT.quips.length-1);
    if(q===this.lastQuip) q=(q+1)%TEXT.quips.length;
    this.lastQuip=q;
    if (!await this.say(t('mismatch',{traits:mismatched.join(t('separator'))}),css(PAL.red),10) || !this.alive(session)) return;
    await this.say(t('quip',{text:TEXT.quips[q]}),css(PAL.text),10);
  }
  showAddButton(session) {
    if (!this.alive(session) || this.addButton) return;
    const {W,pad,readoutY,readoutH}=this.layout, u=this.u;
    const bw=W*.2,bh=readoutH*.62,x=W-pad-bw-16*u,y=readoutY+(readoutH-bh)/2;
    const container=this.add.container(x,y).setDepth(70),g=this.add.graphics();
    const paint=fill=>{g.clear();g.fillStyle(fill);g.fillRect(0,0,bw,bh);g.lineStyle(3*u,PAL.green);g.strokeRect(0,0,bw,bh);};
    paint(0x0f3a25);
    const caption=this.text(bw/2,bh/2,t('add'),11,PAL.green,true).setOrigin(.5).setAlign('center');
    const hit=this.add.zone(0,0,bw,bh).setOrigin(0).setInteractive({useHandCursor:true});
    hit.on('pointerover',()=>{paint(0x1b6b43);caption.setColor('#ffffff');});
    hit.on('pointerout',()=>{paint(0x0f3a25);caption.setColor(css(PAL.green));});
    hit.on('pointerdown',()=>{if(this.alive(session)) this.returnResultToCrimeLab();});
    container.add([g,caption,hit]); this.addButton=container;
    // Keep the readout clear of the case-file button.
    for (const row of this.logRows) { row.setWordWrapWidth(x-row.x-20*u); row.setFontSize(this.px(14)); }
    this.animate({targets:caption,alpha:.6,duration:600,yoyo:true,repeat:-1});
  }
  getSecondsElapsed() {
    if (this.finishedSeconds !== null) return this.finishedSeconds;
    return this.timerStarted ? Math.max(0,Math.floor((this.time.now-this.startedAt)/1000)) : 0;
  }
  getTimeBonus() { const s=this.getSecondsElapsed(); return s<=15 ? 20 : s<=30 ? 10 : 0; }
  notifySafely(name,payload) {
    try { this.events.emit(name,payload); } catch(error) { console.error('[ShoeprintScene] Listener failed:',name,error); }
  }
  invokeSafely(callback,payload) {
    try { callback?.(payload); } catch(error) { console.error('[ShoeprintScene] Result callback failed:',error); }
  }
  closeWithPayload(payload,callback) {
    const session=this._shoeprintSession, scenePlugin=this.scene;
    this.returningToLab=true; this.busy=false;
    const envelope={schemaVersion:1,aborted:payload.aborted,completed:payload.completed,payload};
    try {
      this.invokeSafely(callback,payload);
      if (!payload.aborted) this.notifySafely('minigame-complete',payload);
      this.notifySafely('minigame-closed',envelope);
    } finally {
      if(this._shoeprintSession===session) scenePlugin.stop();
    }
  }
  abortMinigame() {
    if (!this.alive()) return;
    const payload={aborted:true,completed:false,stationId:this.stationId,cityId:this.cityId,caseKey:this.caseKey,
      evidenceType:FIELD,score:this.score,mistakes:this.mistakes,secondsElapsed:this.getSecondsElapsed()};
    // Cancellation deliberately contains no answer, clue or evidence configuration.
    this.closeWithPayload(payload,this.onAbort);
  }
  returnResultToCrimeLab() {
    if (!this.alive() || !this.finished || this.inputError || this.runtimeError || !VALUES.includes(this.correctValue)) return;
    const evidence={...this.evidence,allowedValues:[...this.evidence.allowedValues]};
    const payload={
      aborted:false,completed:true,stationId:this.stationId,cityId:this.cityId,caseKey:this.caseKey,
      evidenceId:evidence.id,evidenceType:FIELD,attribute:FIELD,field:FIELD,forensicField:FIELD,
      value:this.correctValue,correctValue:this.correctValue,selectedValue:this.correctValue,
      source:evidence.source,label:evidence.label,clueType:this.clue.type,clueText:evidence.clueText,
      evidence,evidenceConfig:{...evidence,allowedValues:[...evidence.allowedValues]},
      score:this.score,mistakes:this.mistakes,secondsElapsed:this.getSecondsElapsed(),
      clue:{...this.clue,facts:{...this.clue.facts}}
    };
    this.closeWithPayload(payload,this.onComplete);
  }
  cleanup() {
    if (this._shoeprintDisposed) { super.cleanup(); return; }
    this._shoeprintDisposed=true; this._shoeprintSession++; this.returningToLab=true; this.busy=false;
    for (const cancel of [...this._pendingShoeprint]) {
      try {cancel();} catch(error) {console.warn('[ShoeprintScene] Cancellation failed.',error);}
    }
    this._pendingShoeprint.clear(); this._cancelTyping=null;
    this.typeEvent?.remove(false); this.clockEvent?.remove(false);
    this.typeEvent=null; this.clockEvent=null;
    try {
      for (const tween of [...this._shoeprintTweens]) this.removeTrackedTween(tween);
      this._shoeprintTweens.clear();
    } finally {
      super.cleanup();
      this.cast=null; this.entries=[]; this.cards=[]; this.logRows=null;
      this.hudScore=null; this.hudErr=null; this.hudTime=null;
      this.castArea=null; this.castStampPos=null; this.addButton=null; this.exitButton=null;
      this.onComplete=null; this.onAbort=null;
    }
  }
}
