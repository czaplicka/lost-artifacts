import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { HomeCityBuildings } from './HomeCityBuildings.js';
import { css, light, dark, hash, pp, poly, rect, circle, ellipse, line, shadow } from './HomeCityDrawing.js';

export class HomeCityCemetery extends HomeCityBuildings {
  drawCemetery(b, art) {
    const s = this.scene, left = b.x - 0.5, right = b.x + b.w - 0.5, back = b.y - 0.5, front = b.y + b.h - 0.5;
    art.height = 100;
    const hull = [this.pt(left, back, 100), this.pt(right, back, 100), this.pt(right, front, 0), this.pt(b.door.x, front + 0.45, 0), this.pt(left, front, 0)];
    art.hull = hull;
    const spriteKey = 'hc_bld_cemetery';
    if (this.has(spriteKey)) { this.placeSprite(b, art, spriteKey); return; }
    // ground + path
    const minX = this.pt(left, front).x - 40, minY = this.pt(left, back, 40).y - 30, maxX = this.pt(right, back).x + 40, maxY = this.pt(right, front).y + 50;
    const gk = this.bake('cem_ground', maxX - minX, maxY - minY, ctx => {
      poly(ctx, [this.pt(left, back), this.pt(right, back), this.pt(right, front), this.pt(left, front)], 0x4d5d45);
      for (let i = 0; i < 90; i++) { const q = this.pt(left + hash(i, 1, 51) * (right - left), back + hash(i, 2, 52) * (front - back)); rect(ctx, q.x, q.y, 3, 2, hash(i, 3, 53) > 0.5 ? __dialogueText("scenes/homeCity/HomeCityCemetery.js", "t_2f1c151f56910f36f927") : __dialogueText("scenes/homeCity/HomeCityCemetery.js", "t_c196f8b3a722d0b7c3ec")); }
      poly(ctx, [this.pt(b.door.x - 0.25, back + 0.4), this.pt(b.door.x + 0.25, back + 0.4), this.pt(b.door.x + 0.25, front + 0.45), this.pt(b.door.x - 0.25, front + 0.45)], 0xa29679);
      for (let i = 0; i < 24; i++) { const q = this.pt(b.door.x - 0.2 + hash(i, 4, 54) * 0.4, back + 0.5 + (i / 24) * (front - back)); rect(ctx, q.x, q.y, 5, 2, hash(i, 5, 55) > 0.5 ? __dialogueText("scenes/homeCity/HomeCityCemetery.js", "t_82e16a994350237520ec") : __dialogueText("scenes/homeCity/HomeCityCemetery.js", "t_18a22573f70f00ec829e")); }
    }, minX, minY);
    if (gk) s.add.image(minX, minY, gk).setOrigin(0, 0).setDepth(-690);
    const fence = (axis, fixed, a, c, depth, name, pillarEnd) => {
      const pts = this.faceP(axis, fixed, a, c, 0, 100), xs = pts.map(q => q.x), ys = pts.map(q => q.y), l = Math.min(...xs) - 12, t = Math.min(...ys) - 12;
      const key = this.bake(`cem_${name}`, Math.max(...xs) - l + 12, Math.max(...ys) - t + 12, ctx => {
        this.face(ctx, axis, fixed, a, c, 0, 13, 0x757a6b);
        for (const z of [31, 58]) this.face(ctx, axis, fixed, a, c, z, z + 4, 0x333c39);
        for (let u = a + 0.1; u <= c + 0.001; u += 0.2) { this.face(ctx, axis, fixed, u - 0.018, u + 0.018, 13, 79, 0x303b37); poly(ctx, [this.P(axis, u - 0.035, fixed, 79), this.P(axis, u + 0.035, fixed, 79), this.P(axis, u, fixed, 90)], 0x303b37); }
        this.face(ctx, axis, fixed, a - 0.055, a + 0.055, 0, 91, 0x7c8170); if (pillarEnd) this.face(ctx, axis, fixed, c - 0.055, c + 0.055, 0, 91, 0x7c8170);
      }, l, t);
      if (key) s.add.image(l, t, key).setOrigin(0, 0).setDepth(depth);
    };
    for (let x = b.x; x < b.x + b.w; x++) {
      fence('x', back, x - 0.5, x + 0.5, (x + back) * 100, `back${x}`, x === b.x + b.w - 1);
      if (x === b.door.x) this.bakeGate(b, front); else fence('x', front, x - 0.5, x + 0.5, (x + front) * 100 + 10, `front${x}`, x === b.x + b.w - 1);
    }
    for (let y = b.y; y < b.y + b.h; y++) {
      fence('y', left, y - 0.5, y + 0.5, (left + y) * 100, `left${y}`, y === b.y + b.h - 1);
      fence('y', right, y - 0.5, y + 0.5, (right + y) * 100 + 10, `right${y}`, y === b.y + b.h - 1);
    }
    // graves
    [[0.45, 0.8], [1.6, 0.8], [2.8, 0.8], [0.45, 2.15], [1.6, 2.15], [2.8, 2.15]].forEach(([dx, dy], i) => {
      const gx = b.x + dx, gy = b.y + dy, key = this.bakeSprite(`grave${i}`, 80, 90, 40, 74, ctx => this.drawGrave(ctx, i));
      s.add.image(...Object.values(this.pt(gx, gy)), key).setOrigin(...this.anchors.get(key)).setDepth((gx + gy) * 100 + 5);
    });
    const tk = this.bakeSprite('deadtree', 180, 240, 90, 228, ctx => this.drawDeadTree(ctx));
    const tp = this.pt(b.x + 3.2, b.y + 3.1); s.add.image(tp.x, tp.y, tk).setOrigin(...this.anchors.get(tk)).setDepth((b.x + 3.2 + b.y + 3.1) * 100 + 6);
    const gh = this.bakeSprite('ghost', 60, 80, 30, 70, ctx => {
      ctx.fillStyle = __dialogueText("scenes/homeCity/HomeCityCemetery.js", "t_c325349dc7b78b4e2c99"); ctx.beginPath(); ctx.moveTo(-18, 0); ctx.quadraticCurveTo(-22, -52, 0, -56); ctx.quadraticCurveTo(22, -52, 18, 0);
      ctx.lineTo(10, -8); ctx.lineTo(3, 0); ctx.lineTo(-4, -8); ctx.lineTo(-11, 0); ctx.closePath(); ctx.fill(); circle(ctx, -6, -34, 3, 0x1a1f2a); circle(ctx, 6, -34, 3, 0x1a1f2a); ellipse(ctx, 0, -25, 3, 4, 0x1a1f2a);
    });
    const gp = this.pt(b.x + 2.2, b.y + 1.5, 0);
    this.ghost = { sp: s.add.image(gp.x, gp.y, gh).setOrigin(...this.anchors.get(gh)).setDepth(7000).setAlpha(0.35), x: gp.x, y: gp.y };
    const zone = s.add.zone(Math.min(...hull.map(q => q.x)), Math.min(...hull.map(q => q.y)), 1, 1).setOrigin(0, 0).setDepth(9998);
    const zx = Math.min(...hull.map(q => q.x)), zy = Math.min(...hull.map(q => q.y)), zw = Math.max(...hull.map(q => q.x)) - zx, zh = Math.max(...hull.map(q => q.y)) - zy;
    zone.setSize(zw, zh); this.hookBuilding(zone, b.id, hull.map(q => ({ x: q.x - zx, y: q.y - zy })));
    this.afterFonts(() => this.bakeBanner(b, __dialogueText("scenes/homeCity/HomeCityCemetery.js", "t_bc208c51e3a36a63d0d9"), 150, 2.4));
  }
  bakeGate(b, front) {
    const s = this.scene, x = b.door.x, pts = this.faceP('x', front, x - 0.6, x + 0.6, 0, 125), xs = pts.map(q => q.x), ys = pts.map(q => q.y), l = Math.min(...xs) - 12, t = Math.min(...ys) - 12;
    const key = this.bake('cem_gate', Math.max(...xs) - l + 12, Math.max(...ys) - t + 12, ctx => {
      const F = (...a) => this.face(ctx, 'x', front, ...a);
      for (const u of [x - 0.52, x + 0.52]) F(u - 0.1, u + 0.1, 0, 113, 0x858a78);
      for (let u = x - 0.4; u <= x + 0.41; u += 0.16) { F(u - 0.025, u + 0.025, 3, 84, 0x303a35); poly(ctx, [this.P('x', u - 0.04, front, 84), this.P('x', u + 0.04, front, 84), this.P('x', u, front, 94)], 0x303a35); }
      F(x - 0.43, x + 0.43, 39, 44, 0x404a40); F(x - 0.43, x + 0.43, 82, 87, 0x404a40); F(x - 0.54, x + 0.54, 111, 120, 0x3e4a3b);
      for (const u of [x - 0.52, x + 0.52]) { const c = this.P('x', u, front, 122); circle(ctx, c.x, c.y, 5, 0x6f7a68); }
    }, l, t);
    if (key) s.add.image(l, t, key).setOrigin(0, 0).setDepth((x + front) * 100 + 25);
  }
  drawGrave(ctx, i) {
    shadow(ctx, 22, 8, 0.3); ellipse(ctx, 0, -2, 24, 7, 0x47543f);
    const stone = [0x8e9585, 0x7f8778, 0x9aa090][i % 3], dk = dark(stone, 0.25);
    if (i % 3 === 0) { rect(ctx, -14, -46, 28, 44, stone); ctx.fillStyle = css(stone); ctx.beginPath(); ctx.arc(0, -46, 14, Math.PI, 0); ctx.fill(); rect(ctx, 8, -42, 6, 40, dk); line(ctx, -6, -34, 7, -34, dk, 2); line(ctx, -5, -26, 6, -26, dk, 2); }
    else if (i % 3 === 1) { rect(ctx, -5, -64, 10, 62, stone); rect(ctx, -18, -50, 36, 9, stone); rect(ctx, 3, -62, 3, 60, dk); rect(ctx, -18, -44, 36, 3, dk); }
    else { poly(ctx, pp([-12, -2], [12, -2], [8, -58], [-8, -58]), stone); rect(ctx, 6, -56, 5, 52, dk); poly(ctx, pp([-8, -58], [8, -58], [0, -70]), light(stone, 0.1)); }
    for (let k = 0; k < 5; k++) rect(ctx, -12 + hash(k, i, 1) * 24, -40 + hash(i, k, 2) * 36, 3, 2, __dialogueText("scenes/homeCity/HomeCityCemetery.js", "t_58bdf216b5cbd8aef2c3"));
  }
  drawDeadTree(ctx) {
    shadow(ctx, 36, 10); poly(ctx, pp([-9, 0], [9, 0], [5, -90], [-4, -90]), 0x3e342d);
    for (const [x1, y1, x2, y2, w] of [[0, -80, -34, -128, 6], [0, -90, 30, -138, 6], [-20, -104, -50, -112, 3], [18, -112, 48, -118, 3], [-30, -118, -34, -150, 3], [28, -126, 34, -160, 3], [0, -90, 4, -168, 5]]) line(ctx, x1, y1, x2, y2, 0x3e342d, w);
  }

  // -------------------------------------------------------------- props ---
}
