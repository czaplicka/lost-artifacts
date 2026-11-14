import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
// =============================================================================
// HomeCityExtras.js - second art pass for the Old Quarter.
// Sits between HomeCityAmbient and HomeCityRenderer (class chain), so none of the
// older modules need to change. Adds:
//   * new props: statue, signpost, cart, phonebooth, clock  (registered into PROP_ART)
//   * moving traffic (taxi + post van) with honking
//   * speech bubbles: pedestrians, dog, roof cat, traffic
//   * roof cat, falling autumn leaves, manhole steam, flocks of birds
//   * labels lifted above tall roof gear (antennas, flags, loft)
// Real art can still replace every prop through hc_prop_<kind>.
// =============================================================================
import { HomeCityAmbient } from './HomeCityAmbient.js';
import { PROP_ART, drawCar } from './HomeCityPropArt.js';
import { WALKERS, FONT_UI, HW, HH } from './HomeCityConfig.js';
import { css, dark, hash, pp, poly, rect, circle, ellipse, line, hgrad, shadow, S, isoBox } from './HomeCityDrawing.js';

const LABEL_LIFT = { 'pi-office': 70, 'spy-shop': 62, tavern: 36, 'police-station': 44, 'your-home': 56 };
const SIGN_BOARDS = [
  { y: -140, dir: -1, text: __dialogueText("scenes/homeCity/HomeCityExtras.js", "t_f99419d296900dce0711"), c: 0x6b4a2f }, { y: -114, dir: 1, text: __dialogueText("scenes/homeCity/HomeCityExtras.js", "t_162bb3fee49d38655809"), c: 0x2f5a4a },
  { y: -88, dir: -1, text: __dialogueText("scenes/homeCity/HomeCityExtras.js", "t_450cde2ef8d100697033"), c: 0x2f4a6b }, { y: -62, dir: 1, text: __dialogueText("scenes/homeCity/HomeCityExtras.js", "t_ff10a7186aff87fc1a1f"), c: 0x5a2f3a }
];
const BUBBLES = {
  ped0: [__dialogueText("scenes/homeCity/HomeCityExtras.js", "t_5b266269adba248a8dc4"), __dialogueText("scenes/homeCity/HomeCityExtras.js", "t_7f531918a30fefcf5de4"), __dialogueText("scenes/homeCity/HomeCityExtras.js", "t_0d28c20513765a3bda6b")],
  ped1: [__dialogueText("scenes/homeCity/HomeCityExtras.js", "t_8758b6c0fac642e97e18"), __dialogueText("scenes/homeCity/HomeCityExtras.js", "t_5a15b299dbe6cb25b0b4"), __dialogueText("scenes/homeCity/HomeCityExtras.js", "t_a93d3d47b40f5b4520ad")],
  ped2: [__dialogueText("scenes/homeCity/HomeCityExtras.js", "t_21d4572d86d781b3e3f8"), __dialogueText("scenes/homeCity/HomeCityExtras.js", "t_fa9d005d1cc9bb6e6dda"), __dialogueText("scenes/homeCity/HomeCityExtras.js", "t_f6582769664c57c17e24")],
  dog: [__dialogueText("scenes/homeCity/HomeCityExtras.js", "t_538981c1a6ed81a52655"), __dialogueText("scenes/homeCity/HomeCityExtras.js", "t_49ec9225f60301ade88b")],
  taxi: [__dialogueText("scenes/homeCity/HomeCityExtras.js", "t_431b649bf45eedaa490b"), __dialogueText("scenes/homeCity/HomeCityExtras.js", "t_78c39fdb1478fe0827ee"), __dialogueText("scenes/homeCity/HomeCityExtras.js", "t_84c4660ba7facdde2397")],
  van: [__dialogueText("scenes/homeCity/HomeCityExtras.js", "t_7ddb6534347eccb4cbf5"), __dialogueText("scenes/homeCity/HomeCityExtras.js", "t_4f365662dd998bf6857a")],
  cat: [__dialogueText("scenes/homeCity/HomeCityExtras.js", "t_cd95a9813832102cf65a"), __dialogueText("scenes/homeCity/HomeCityExtras.js", "t_9352681e08e6ad784cca")]
};

const BRONZE = 0x6f8f7c;
Object.assign(PROP_ART, {
  statue: { w: 130, h: 200, ax: 65, ay: 178, draw(ctx) {
    shadow(ctx, 44, 13);
    isoBox(ctx, 0, 0, 0.36, 0.36, 0, 14, 0xa59f8e, 0x948e7d, 0x726d5d, 0x3a372f);
    isoBox(ctx, 0, 0, 0.28, 0.28, 14, 50, 0xb1ab9a, 0x9d9786, 0x7b7665, 0x3a372f);
    isoBox(ctx, 0, 0, 0.33, 0.33, 50, 57, 0xbab4a3, 0xa5a090, 0x84806e, 0x3a372f);
    poly(ctx, [S(0, 0, -0.18, 0.28, 26), S(0, 0, 0.18, 0.28, 26), S(0, 0, 0.18, 0.28, 40), S(0, 0, -0.18, 0.28, 40)], 0xc7a24a, 0x6b5520);
    ctx.save(); ctx.translate(0, -57);
    line(ctx, -6, -4, -6, 12, 0xc7a24a, 2); line(ctx, 6, -4, 6, 12, 0xc7a24a, 2);
    poly(ctx, pp([-22, -34], [-42, -16], [-24, -20]), dark(BRONZE, 0.25));
    ellipse(ctx, 0, -30, 24, 17, BRONZE); ellipse(ctx, -3, -30, 16, 9, dark(BRONZE, 0.15));
    poly(ctx, pp([-14, -16], [14, -16], [18, -2], [-18, -2]), 0x5c7a69);
    circle(ctx, 18, -50, 10, BRONZE); poly(ctx, pp([27, -50], [38, -46], [27, -44]), 0xc7a24a); circle(ctx, 22, -53, 1.8, 0x10201a);
    ellipse(ctx, 18, -58, 16, 4, 0x4d6a5c); rect(ctx, 10, -72, 16, 13, 0x4d6a5c); rect(ctx, 10, -64, 16, 3, 0x34493f);
    line(ctx, -20, -30, -34, -46, 0x4d6a5c, 3); ctx.strokeStyle = css(0xc7a24a); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-39, -52, 8, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 6; i++) rect(ctx, -16 + hash(i, 1, 3) * 34, -42 + hash(i, 2, 3) * 20, 3, 2, __dialogueText("scenes/homeCity/HomeCityExtras.js", "t_6dada1b487bba0b1c33d"));
    ctx.restore();
  } },
  signpost: { w: 150, h: 190, ax: 75, ay: 176, draw(ctx) {
    shadow(ctx, 22, 7); ctx.fillStyle = hgrad(ctx, -4, 4, [[0, 0x3a2d22], [0.5, 0x6b5440], [1, 0x2c2218]]); ctx.fillRect(-4, -150, 8, 150);
    circle(ctx, 0, -154, 5, 0xc7a24a);
    for (const b of SIGN_BOARDS) {
      const d = b.dir, h = 21, pts = d > 0 ? pp([-8, b.y], [50, b.y], [64, b.y + h / 2], [50, b.y + h], [-8, b.y + h]) : pp([8, b.y], [-50, b.y], [-64, b.y + h / 2], [-50, b.y + h], [8, b.y + h]);
      poly(ctx, pts, b.c, dark(b.c, 0.5), 1.5); line(ctx, d > 0 ? -6 : 6, b.y + 2, d > 0 ? 48 : -48, b.y + 2, __dialogueText("scenes/homeCity/HomeCityExtras.js", "t_ae7f66dc0e0b56eeeb80"), 1.5);
    }
  } },
  cart: { w: 150, h: 190, ax: 75, ay: 168, draw(ctx) {
    shadow(ctx, 50, 14);
    for (const x of [-30, 30]) { circle(ctx, x, -12, 12, 0x17191b); circle(ctx, x, -12, 5, 0x9aa0a0); }
    isoBox(ctx, 0, 0, 0.36, 0.26, 12, 46, 0xd0453b, 0xb7342d, 0x8a2622, 0x3a1210);
    isoBox(ctx, 0, 0, 0.39, 0.29, 46, 51, 0xf1e6c8, 0xe0d4b2, 0xbfb391, 0x6f6648);
    poly(ctx, [S(0, 0, -0.26, 0.26, 20), S(0, 0, 0.26, 0.26, 20), S(0, 0, 0.26, 0.26, 40), S(0, 0, -0.26, 0.26, 40)], 0xf2c14e, null);
    for (let i = 0; i < 3; i++) { const a = S(0, 0, -0.18 + i * 0.18, 0.27, 30); ellipse(ctx, a.x, a.y, 9, 3.5, 0xb5532c); ellipse(ctx, a.x, a.y - 1, 9, 2.4, 0xd8803c); line(ctx, a.x - 7, a.y - 1, a.x + 7, a.y - 1, 0xe0c64a, 1.5); }
    ellipse(ctx, -14, -56, 11, 5, 0x9aa0a0); rect(ctx, -25, -66, 22, 10, 0x80878a); ellipse(ctx, -14, -66, 11, 4, 0xaab0b2);
    line(ctx, 14, -50, 14, -118, 0x4a3b2c, 3);
    for (let i = 0; i < 8; i++) {
      const a0 = (i * Math.PI) / 8, a1 = ((i + 1) * Math.PI) / 8, c = i % 2 ? 0xf1e6c8 : 0xc43a32;
      poly(ctx, pp([14, -132], [14 + Math.cos(a0) * 62, -108 + Math.sin(a0) * 14], [14 + Math.cos(a1) * 62, -108 + Math.sin(a1) * 14]), c, dark(c, 0.35));
    }
    circle(ctx, 14, -134, 3, 0xc7a24a);
  } },
  phonebooth: { w: 90, h: 170, ax: 45, ay: 150, draw(ctx) {
    const R = 0xb8302a; shadow(ctx, 24, 8);
    isoBox(ctx, 0, 0, 0.22, 0.22, 0, 84, 0xc9453d, R, dark(R, 0.3), 0x4a1512);
    for (let r = 0; r < 3; r++) {
      const z0 = 14 + r * 20, z1 = z0 + 16;
      poly(ctx, [S(0, 0, -0.15, 0.22, z0), S(0, 0, 0.15, 0.22, z0), S(0, 0, 0.15, 0.22, z1), S(0, 0, -0.15, 0.22, z1)], 0xf3d99a, 0x4a1512);
      poly(ctx, [S(0, 0, 0.22, -0.15, z0), S(0, 0, 0.22, 0.15, z0), S(0, 0, 0.22, 0.15, z1), S(0, 0, 0.22, -0.15, z1)], 0xd9bd7e, 0x4a1512);
    }
    poly(ctx, [S(0, 0, -0.17, 0.22, 74), S(0, 0, 0.17, 0.22, 74), S(0, 0, 0.17, 0.22, 81), S(0, 0, -0.17, 0.22, 81)], 0xf1ead2, null);
    isoBox(ctx, 0, 0, 0.25, 0.25, 84, 90, 0xd35a50, 0xa82b25, 0x7d201c, 0x4a1512);
  } },
  clock: { w: 110, h: 230, ax: 55, ay: 210, draw(ctx) {
    shadow(ctx, 24, 8); isoBox(ctx, 0, 0, 0.16, 0.16, 0, 12, 0x59615a, 0x434b44, 0x30372f);
    ctx.fillStyle = hgrad(ctx, -5, 5, [[0, 0x2a3a30], [0.5, 0x4f6a58], [1, 0x1f2c24]]); ctx.fillRect(-5, -168, 10, 160);
    circle(ctx, 0, -184, 27, 0x2e352f); circle(ctx, 0, -184, 22, 0xf1ead2);
    for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; line(ctx, Math.sin(a) * 17, -184 - Math.cos(a) * 17, Math.sin(a) * 20, -184 - Math.cos(a) * 20, 0x2b2418, 1.5); }
    line(ctx, 0, -184, -9.5, -189.5, 0x2b2418, 2.5); line(ctx, 0, -184, 14, -192, 0x2b2418, 1.8); circle(ctx, 0, -184, 2, 0xb7342d);
    poly(ctx, pp([-14, -208], [0, -222], [14, -208]), 0x2e352f); circle(ctx, 0, -224, 3, 0xc7a24a);
  } }
});

function bakeCatShapes(h) {
  h.bakeSprite('cat', 60, 70, 30, 66, ctx => {
    ellipse(ctx, 0, -18, 14, 18, 0x2d2a2b); circle(ctx, 0, -42, 11, 0x2d2a2b); poly(ctx, pp([-10, -48], [-8, -62], [-2, -52]), 0x2d2a2b); poly(ctx, pp([10, -48], [8, -62], [2, -52]), 0x2d2a2b);
    ellipse(ctx, -4, -43, 2.6, 3.6, 0xe0d23c); ellipse(ctx, 4, -43, 2.6, 3.6, 0xe0d23c); rect(ctx, -4.7, -45, 1.4, 4, 0x111111); rect(ctx, 3.3, -45, 1.4, 4, 0x111111);
    poly(ctx, pp([-1.5, -38], [1.5, -38], [0, -36]), 0xd98a8a); rect(ctx, -8, -3, 6, 4, 0x2d2a2b); rect(ctx, 2, -3, 6, 4, 0x2d2a2b); circle(ctx, 0, -20, 5, 0x6b6563);
  });
  h.bakeSprite('cattail', 40, 50, 6, 44, ctx => { ctx.strokeStyle = css(0x2d2a2b); ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(16, -4, 14, -26); ctx.stroke(); });
}

export class HomeCityExtras extends HomeCityAmbient {
  constructor(scene) { super(scene); this.vehicles = []; this.flocks = []; this.bubble = null; this.bubbleUntil = 0; this.bubbleFor = null; this.now = 0; this.nextFlock = 7000; this.cat = null; }

  makeLabel(b, art) {
    super.makeLabel(b, art);
    const lift = LABEL_LIFT[b.id];
    if (lift && art.label?.active) { art.label.y -= lift; this.paintLabel(b.id); }
  }
  drawProps() {
    super.drawProps();
    for (const p of this.scene.props) {
      const c = this.pt(p.x, p.y);
      if (p.kind === 'statue') this.perches.push({ x: c.x + 14, y: c.y - 128 }, { x: c.x - 16, y: c.y - 118 });
      if (p.kind === 'clock') this.perches.push({ x: c.x, y: c.y - 212 });
      if (p.kind === 'signpost') this.perches.push({ x: c.x + 34, y: c.y - 86 });
      if (p.kind === 'phonebooth') this.perches.push({ x: c.x, y: c.y - 92 });
    }
  }
  drawAmbient() {
    super.drawAmbient();
    this.drawExtras();
  }
  drawExtras() {
    const s = this.scene, uid = this.uid;
    this.bubble = s.add.text(0, 0, '', { fontFamily: FONT_UI, fontSize: '18px', color: '#2b2418', backgroundColor: '#f6ecd0', padding: { x: 10, y: 6 }, align: 'center', wordWrap: { width: 280 } })
      .setOrigin(0.5, 1).setDepth(10050).setVisible(false);
    // vehicles ---------------------------------------------------------------
    const taxi = this.bakeSprite('taxi_x', 300, 170, 150, 118, ctx => { drawCar(ctx, 'x', 0xe0b020); rect(ctx, -16, -62, 16, 7, 0xfff3c0); for (let i = 0; i < 8; i++) rect(ctx, -40 + i * 7, -26 - i * 3.5 * 0, 4, 3, i % 2 ? 0x1a1a1a : 0xf5f0dc); });
    const van = this.bakeSprite('van_y', 300, 170, 150, 118, ctx => drawCar(ctx, 'y', 0x3a5c8c));
    if (taxi) this.vehicles.push({ id: 'taxi', sp: s.add.image(0, 0, taxi).setOrigin(...this.anchors.get(taxi)).setVisible(false), axis: 'x', lane: 19, pos: -6, min: -6, max: 31, speed: 4.6, wait: 3, honkAt: 0 });
    if (van) this.vehicles.push({ id: 'van', sp: s.add.image(0, 0, van).setOrigin(...this.anchors.get(van)).setVisible(false), axis: 'y', lane: 9.6, pos: -6, min: -6, max: 27, speed: 4, wait: 11, honkAt: 0 });
    // cat on the PI Office parapet ------------------------------------------
    bakeCatShapes(this);
    const pi = s.buildings.find(b => b.id === 'pi-office'), ck = `hc${uid}_cat`, tk = `hc${uid}_cattail`;
    if (pi && this.anchors.has(ck)) {
      const front = pi.y + pi.h - 1, p = this.pt(pi.x + 1.15, front + 0.5, 153), depth = (pi.x + 1 + front) * 100 + 60;
      const sp = s.add.image(p.x, p.y, ck).setOrigin(...this.anchors.get(ck)).setDepth(depth);
      const tail = s.add.image(p.x + 11, p.y - 2, tk).setOrigin(...this.anchors.get(tk)).setDepth(depth + 0.1);
      this.cat = { sp, tail, cx: pi.x + 1, cy: front, sayAt: 4000 };
    }
    // leaves, steam ----------------------------------------------------------
    const leaf = this.bake('leaf', 12, 8, ctx => { ellipse(ctx, 6, 4, 5, 3, 0xffffff); line(ctx, 1, 4, 11, 4, __dialogueText("scenes/homeCity/HomeCityExtras.js", "t_849be53e783796fe4e8e"), 1); });
    let trees = 0;
    for (const p of s.props) {
      if (p.kind !== 'tree' || p.variant !== 2 || trees >= 5 || !leaf) continue;
      const c = this.pt(p.x, p.y); trees++;
      s.add.particles(c.x, c.y - 150, leaf, { emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-46, -20, 92, 30) }, lifespan: 4300, speedY: { min: 22, max: 40 }, speedX: { min: -12, max: 14 },
        rotate: { start: 0, end: 360 }, scale: { start: 0.9, end: 0.7 }, alpha: { start: 1, end: 0 }, tint: [0xd18a34, 0xc0742c, 0xe5a246, 0x8a4a22], frequency: 1500, quantity: 1 }).setDepth((p.x + p.y) * 100 + 4);
    }
    if (this.keys.has(`hc${uid}_smoke`)) for (const [u, v] of [[10, 4], [5, 10]]) {
      const c = this.pt(u, v);
      s.add.particles(c.x, c.y, `hc${uid}_smoke`, { lifespan: 2200, speedY: { min: -28, max: -16 }, speedX: { min: -5, max: 5 }, scale: { start: 0.12, end: 0.55 }, alpha: { start: 0.28, end: 0 }, frequency: 320 }).setDepth((u + v) * 100 + 2);
    }
    // birds ------------------------------------------------------------------
    this.birdKey = this.bake('bird', 28, 14, ctx => { ctx.strokeStyle = css(0x161a18); ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(2, 9); ctx.quadraticCurveTo(8, 1, 14, 8); ctx.quadraticCurveTo(20, 1, 26, 9); ctx.stroke(); });
    // sign text needs the fonts to be loaded --------------------------------
    this.afterFonts(() => this.bakeSignText());
  }
  bakeSignText() {
    const s = this.scene; if (!s) return;
    s.props.forEach((p, i) => {
      if (p.kind !== 'signpost' || this.has('hc_prop_signpost')) return;
      const a = PROP_ART.signpost, c = this.pt(p.x, p.y);
      const key = this.bake(`signtext${i}`, a.w, a.h, ctx => {
        ctx.font = `${__dialogueText("scenes/homeCity/HomeCityExtras.js", "t_aea790759be5a7c00f67")}${FONT_UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = css(0xf6e7c1);
        for (const b of SIGN_BOARDS) ctx.fillText(b.text, b.dir > 0 ? 20 : -20, b.y + 11);
      }, -a.ax, -a.ay);
      if (key) s.add.image(c.x, c.y, key).setOrigin(a.ax / a.w, a.ay / a.h).setDepth((p.x + p.y) * 100 + 1.2);
    });
  }
  speak(sp, text, off, ms = 3000) {
    if (!this.bubble?.active || this.bubbleUntil > this.now || !sp?.active) return false;
    this.bubble.setText(text).setVisible(true); this.bubbleFor = { sp, off }; this.bubbleUntil = this.now + ms;
    this.bubble.setPosition(sp.x, sp.y - off); return true;
  }
  update(time, delta, st = {}) {
    super.update(time, delta, st);
    if (this.destroyed || !this.scene) return;
    const dt = Math.min(delta, 100) / 1000, cell = st.cell; this.now = time;
    this.walkers.forEach((w, i) => {
      const id = WALKERS[i]?.tex; if (!id || !cell || !w.sp.active) return;
      w.sayAt ??= time + 3000 + Math.random() * 6000;
      if (time > w.sayAt && Math.hypot(cell.x - w.cx, cell.y - w.cy) < 2.8) {
        const l = BUBBLES[id]; if (l && this.speak(w.sp, l[Math.floor(Math.random() * l.length)], id === 'dog' ? 56 : 108)) w.sayAt = time + 15000 + Math.random() * 9000;
      }
    });
    for (const v of this.vehicles) {
      if (v.wait > 0) { v.wait -= dt; v.sp.setVisible(false); continue; }
      v.pos += v.speed * dt; if (v.pos > v.max) { v.pos = v.min; v.wait = 7 + Math.random() * 11; v.sp.setVisible(false); continue; }
      const cx = v.axis === 'x' ? v.pos : v.lane, cy = v.axis === 'x' ? v.lane : v.pos, p = this.pt(cx, cy);
      v.sp.setVisible(true).setPosition(p.x, p.y - Math.abs(Math.sin(time * 0.03)) * 1.2).setDepth((cx + cy) * 100 + 1.5);
      if (cell && time > v.honkAt && Math.hypot(cell.x - cx, cell.y - cy) < 2.2) { const l = BUBBLES[v.id]; if (this.speak(v.sp, l[Math.floor(Math.random() * l.length)], 100, 1800)) v.honkAt = time + 9000; }
    }
    const cat = this.cat;
    if (cat?.sp.active) {
      cat.tail.setAngle(Math.sin(time * 0.003) * 16); cat.sp.setScale(1, 1 + Math.sin(time * 0.0025) * 0.015);
      if (cell && time > cat.sayAt && Math.hypot(cell.x - cat.cx, cell.y - cat.cy) < 3.2) { const l = BUBBLES.cat; if (this.speak(cat.sp, l[Math.floor(Math.random() * l.length)], 74)) cat.sayAt = time + 20000; }
    }
    if (this.bubble?.active && this.bubble.visible !== false) {
      if (this.now > this.bubbleUntil || !this.bubbleFor?.sp.active) this.bubble.setVisible(false);
      else this.bubble.setPosition(this.bubbleFor.sp.x, this.bubbleFor.sp.y - this.bubbleFor.off);
    }
    const cam = this.scene.cameras?.main;
    if (this.birdKey && time > this.nextFlock) {
      this.nextFlock = time + 26000 + Math.random() * 24000;
      const x0 = (cam?.scrollX ?? 600) - 120, y0 = (cam?.scrollY ?? 300) + 60 + Math.random() * 260, n = 3 + Math.floor(Math.random() * 3);
      const birds = Array.from({ length: n }, (_, i) => ({ sp: this.scene.add.image(x0 - i * 34, y0 + (i % 2) * 16, this.birdKey).setDepth(9500), dx: -i * 34, dy: (i % 2) * 16 - 4 * i, ph: Math.random() * 6 }));
      this.flocks.push({ birds, x: x0, y: y0, until: x0 + 2300 });
    }
    for (let f = this.flocks.length - 1; f >= 0; f--) {
      const fl = this.flocks[f]; fl.x += 230 * dt; fl.y -= 12 * dt;
      for (const b of fl.birds) b.sp.setPosition(fl.x + b.dx, fl.y + b.dy).setScale(1, 0.35 + 0.65 * Math.abs(Math.sin(time * 0.012 + b.ph)));
      if (fl.x > fl.until) { fl.birds.forEach(b => b.sp.destroy()); this.flocks.splice(f, 1); }
    }
  }
}
