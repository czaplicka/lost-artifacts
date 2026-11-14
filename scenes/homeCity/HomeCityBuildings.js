import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { HomeCityGround } from './HomeCityGround.js';
import { HW, HH, FONT_UI, BUILDING_SPRITE_TWEAKS, PALETTES } from './HomeCityConfig.js';
import { css, mix, light, dark, hash, pp, pathOf, poly, rect, circle, ellipse, line, vgrad, yRange, S, isoBox, blob } from './HomeCityDrawing.js';

export class HomeCityBuildings extends HomeCityGround {
  drawBuildings() {
    const s = this.scene;
    this.hl = s.add.graphics().setDepth(9000);
    for (const b of s.buildings) {
      const art = { label: null, marker: null, plaque: null, hull: null, height: 120 };
      this.buildingArt.set(b.id, art);
      if (b.id === 'cemetery') this.drawCemetery(b, art); else this.drawHouse(b, art);
      this.makeLabel(b, art);
    }
  }
  hookBuilding(obj, id, localPts) {
    obj.setInteractive(new Phaser.Geom.Polygon(localPts), Phaser.Geom.Polygon.Contains).setData('buildingId', id);
    if (obj.input) obj.input.cursor = 'pointer';
    obj.on('pointerover', () => this.setHover(id)); obj.on('pointerout', () => this.setHover(null));
  }
  placeSprite(b, art, key) {
    const s = this.scene, cfg = BUILDING_SPRITE_TWEAKS[b.id] || {}, right = b.x + b.w - 1, front = b.y + b.h - 1;
    const c = this.pt(right + 0.5, front + 0.5, 0), sc = cfg.scale || 1;
    const img = s.add.image(c.x + (cfg.dx || 0), c.y + (cfg.dy || 0), key).setOrigin(0.5, 1).setScale(sc).setDepth((b.x + b.y) * 100 + 50);
    art.height = cfg.height || art.height;
    const H = art.height;
    art.hull = [this.pt(b.x - 0.5, b.y - 0.5, H), this.pt(right + 0.5, b.y - 0.5, H), this.pt(right + 0.5, b.y - 0.5, 0), this.pt(right + 0.5, front + 0.5, 0), this.pt(b.x - 0.5, front + 0.5, 0), this.pt(b.x - 0.5, front + 0.5, H)];
    const tlx = img.x - img.displayWidth * 0.5, tly = img.y - img.displayHeight;
    this.hookBuilding(img, b.id, art.hull.map(q => ({ x: (q.x - tlx) / sc, y: (q.y - tly) / sc })));
  }
  bakeShadow(b) {
    const right = b.x + b.w - 1, front = b.y + b.h - 1;
    const pts = [this.pt(b.x - 0.3, b.y - 0.2), this.pt(right + 1.4, b.y - 0.05), this.pt(right + 1.4, front + 1.0), this.pt(b.x - 0.3, front + 1.0)];
    const xs = pts.map(q => q.x), ys = pts.map(q => q.y), left = Math.min(...xs) - 4, top = Math.min(...ys) - 4;
    const key = this.bake(`shadow_${b.id}`, Math.max(...xs) - left + 4, Math.max(...ys) - top + 4, ctx => poly(ctx, pts, __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_9b5ff363cca973f18ba2"), null), left, top);
    if (key) this.scene.add.image(left, top, key).setOrigin(0, 0).setDepth(-700);
  }
  drawHouse(b, art) {
    const s = this.scene, p = PALETTES[b.id], right = b.x + b.w - 1, front = b.y + b.h - 1, H = p.height;
    art.height = H;
    art.hull = [this.pt(b.x - 0.5, b.y - 0.5, H), this.pt(right + 0.5, b.y - 0.5, H), this.pt(right + 0.5, b.y - 0.5, 0), this.pt(right + 0.5, front + 0.5, 0), this.pt(b.x - 0.5, front + 0.5, 0), this.pt(b.x - 0.5, front + 0.5, H)];
    this.bakeShadow(b);
    const spriteKey = `hc_bld_${b.id}`;
    if (this.has(spriteKey)) { this.placeSprite(b, art, spriteKey); return; }
    for (let y = b.y; y <= front; y++) for (let x = b.x; x <= right; x++) {
      const t = this.bakeTile(b, p, x, y); if (!t.key) continue;
      const img = s.add.image(t.left, t.top, t.key).setOrigin(0, 0).setDepth((x + y) * 100);
      const roof = s.diamond(x, y, H), base = s.diamond(x, y);
      this.hookBuilding(img, b.id, [roof[0], roof[1], base[1], base[2], base[3], roof[3]].map(q => ({ x: q.x - t.left, y: q.y - t.top })));
    }
    this.afterFonts(() => this.bakeBanner(b, p.sign, 100, 2.2));
    this.registerBlade(b, p);
  }
  registerBlade(b, p) {
    const right = b.x + b.w - 1, front = b.y + b.h - 1, a = this.pt(right + 0.5, front + 0.5, 84);
    if (p.blade === 'eye') this.lights.push({ x: a.x + 34, y: a.y + 36, r: 0.8, a: 0.35, c: 0xffc866 });
  }
  bakeTile(b, p, x, y) {
    const right = b.x + b.w - 1, front = b.y + b.h - 1, H = p.height, c = this.scene.project(x, y);
    const feats = (p.features || []).filter(f => b.x + f.t[0] === x && b.y + f.t[1] === y);
    const padX = x === right || y === front || feats.length ? 64 : 10, padTop = feats.length ? 130 : 12, padBot = 26;
    const left = c.x - HW - padX, top = c.y - HH - H - padTop, w = 2 * (HW + padX), h = HH + H + padTop + HH + padBot;
    const key = this.bake(`b_${b.id}_${x}_${y}`, w, h, ctx => this.paintTile2(ctx, b, p, x, y, feats), left, top);
    return { key, left, top };
  }
  paintTile2(ctx, b, p, x, y, feats) {
    const right = b.x + b.w - 1, front = b.y + b.h - 1, H = p.height;
    if (x === right) this.rightFace(ctx, b, p, y, right + 0.5);
    if (y === front) this.frontFace(ctx, b, p, x, front + 0.5);
    this.roofTile(ctx, b, p, x, y, front, right, H);
    for (const f of feats) this.feature(ctx, f, x, y, H);
    if (x === right && y === front) this.cornerSign(ctx, p, right + 0.5, front + 0.5);
  }
  wallTexture(ctx, axis, fixed, u1, u2, H, style, seed) {
    const Pz = (u, z) => this.P(axis, u, fixed, z);
    if (style === 'brick' || style === 'stone') {
      const rowH = style === 'brick' ? 8 : 15, step = style === 'brick' ? 0.22 : 0.5; let r = 0;
      for (let z = rowH; z < H; z += rowH, r++) {
        const a = Pz(u1, z), c = Pz(u2, z); line(ctx, a.x, a.y, c.x, c.y, __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_72f258962abffbdcc517"));
        for (let k = 0; ; k++) {
          const u = u1 + step * (k + (r % 2) * 0.5); if (u >= u2 - 0.01) break; if (u <= u1 + 0.01) continue;
          const a2 = Pz(u, z), b2 = Pz(u, z - rowH); line(ctx, a2.x, a2.y, b2.x, b2.y, __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_ba0610c7eabce7933177"));
        }
        if (style === 'stone' && hash(r, seed, 3) > 0.6) { const q = this.faceP(axis, fixed, u1 + 0.1, u1 + 0.1 + step, z - rowH, z); poly(ctx, q, __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_5704ef9ed39c9a05a9fc"), null); }
      }
    } else if (style === 'boards') {
      for (let z = 6; z < H; z += 7) { const a = Pz(u1, z), c = Pz(u2, z); line(ctx, a.x, a.y, c.x, c.y, __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_18a22573f70f00ec829e")); line(ctx, a.x, a.y + 1, c.x, c.y + 1, __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_0d923d38199dd90d27e8")); }
    } else {
      for (let i = 0; i < 30; i++) { const a = Pz(u1 + hash(seed, i, 1) * (u2 - u1), hash(i, seed, 2) * H); rect(ctx, a.x, a.y, 2, 2, hash(i, seed, 3) > 0.5 ? __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_c201d2dab2c4e2b059b2") : __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_990c3b7dbbd07278e753")); }
      const st = this.faceP(axis, fixed, u1 + 0.3, u1 + 0.38, H - 30, H - 14); poly(ctx, st, __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_bae00db0cd2abbf352cd"), null);
    }
  }
  wall(ctx, axis, fixed, u1, u2, H, base, p, seed) {
    const pts = this.faceP(axis, fixed, u1, u2, 0, H); poly(ctx, pts, base);
    ctx.save(); pathOf(ctx, pts); ctx.clip(); this.wallTexture(ctx, axis, fixed, u1, u2, H, p.style, seed);
    const [y0, y1] = yRange(pts), x0 = Math.min(...pts.map(q => q.x));
    ctx.fillStyle = vgrad(ctx, y0, y1, [[0, __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_0d923d38199dd90d27e8")], [0.6, 'rgba(0,0,0,0)'], [1, __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_51112248272bba36b1eb")]]); ctx.fillRect(x0 - 2, y0 - 2, 140, y1 - y0 + 4);
    ctx.restore();
  }
  cornice(ctx, axis, fixed, u1, u2, H, p) {
    this.face(ctx, axis, fixed, u1, u2, H - 26, H - 14, __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_819b024f9d1d0b2ce5ec"), null);
    this.face(ctx, axis, fixed + 0.07, u1 - 0.03, u2 + 0.03, H - 14, H - 3, p.trim); this.face(ctx, axis, fixed + 0.07, u1 - 0.03, u2 + 0.03, H - 3, H, light(p.trim, 0.3));
  }
  window(ctx, axis, fixed, u, low, w, h, p, o = {}) {
    const F = (a, c, l, hh, color, st = null) => this.face(ctx, axis, fixed, a, c, l, hh, color, st), hw = w / 2;
    F(u - hw - 0.04, u + hw + 0.04, low - 4, low + h + 4, p.trim);
    const pts = this.faceP(axis, fixed, u - hw, u + hw, low, low + h), [y0, y1] = yRange(pts);
    poly(ctx, pts, o.lit ? vgrad(ctx, y0, y1, [[0, 0xf6dc9a], [1, 0xc58f4b]]) : vgrad(ctx, y0, y1, [[0, light(p.glass, 0.28)], [1, dark(p.glass, 0.25)]]), null);
    if (o.blinds) for (let z = low + h - 5; z > low + 4; z -= 6) F(u - hw, u + hw, z, z + 2.5, __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_5c8fbab7172bea4b3a00"));
    poly(ctx, [this.P(axis, u - hw * 0.2, fixed, low + h), this.P(axis, u + hw * 0.15, fixed, low + h), this.P(axis, u - hw * 0.35, fixed, low), this.P(axis, u - hw * 0.7, fixed, low)], __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_b34d3e791125aeebc60a"), null);
    F(u - 0.017, u + 0.017, low, low + h, p.trim); F(u - hw, u + hw, low + h * 0.48, low + h * 0.48 + 3, p.trim);
    F(u - hw - 0.07, u + hw + 0.07, low - 7, low - 3, light(p.trim, 0.2)); F(u - hw - 0.07, u + hw + 0.07, low - 12, low - 7, __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_819b024f9d1d0b2ce5ec"));
    if (o.shutters) { F(u - hw - 0.2, u - hw - 0.05, low - 2, low + h + 2, o.shutters); F(u + hw + 0.05, u + hw + 0.2, low - 2, low + h + 2, o.shutters); }
    if (o.box) {
      this.face(ctx, axis, fixed + 0.04, u - hw - 0.04, u + hw + 0.04, low - 14, low - 6, 0x6d4f35);
      for (let i = 0; i <= 5; i++) { const q = this.P(axis, u - hw + (i * w) / 5, fixed + 0.04, low - 12); circle(ctx, q.x, q.y - 3, 4, i % 2 ? 0x4d7a45 : 0x3c6638); if (i % 2) circle(ctx, q.x, q.y - 7, 2, 0xd9627d); }
    }
    if (o.lit) { const c = this.P(axis, u, fixed, low + h / 2); this.lights.push({ x: c.x, y: c.y, r: 0.55, a: 0.2, c: 0xffc866 }); }
  }
  awning(ctx, axis, fixed, u1, u2, zTop, p) {
    const n = 6, out = 0.34, [c1, c2] = p.awning, A = (u, f, z) => this.P(axis, u, f, z);
    this.face(ctx, axis, fixed, u1, u2, zTop - 32, zTop - 15, __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_8e71d5d639eb26975bf6"), null);
    for (let i = 0; i < n; i++) {
      const a = u1 + ((u2 - u1) * i) / n, c = u1 + ((u2 - u1) * (i + 1)) / n, color = i % 2 ? c2 : c1;
      poly(ctx, [A(a, fixed, zTop), A(c, fixed, zTop), A(c, fixed + out, zTop - 15), A(a, fixed + out, zTop - 15)], color);
      poly(ctx, [A(a, fixed + out, zTop - 15), A(c, fixed + out, zTop - 15), A(c, fixed + out, zTop - 21), A(a, fixed + out, zTop - 21)], dark(color, 0.2), null);
    }
  }
  door(ctx, b, p, x, fy) {
    const F = (...a) => this.face(ctx, 'x', fy, ...a), P3 = (u, f, z) => this.pt(u, f, z);
    F(x - 0.3, x + 0.3, 0, 68, p.trim); F(x - 0.23, x + 0.23, 0, 64, dark(p.door, 0.35), null); F(x - 0.21, x + 0.21, 0, 62, p.door, null);
    F(x - 0.16, x - 0.02, 6, 30, dark(p.door, 0.25), null); F(x + 0.02, x + 0.16, 6, 30, dark(p.door, 0.25), null);
    const gp = this.faceP('x', fy, x - 0.16, x + 0.16, 36, 58), [y0, y1] = yRange(gp);
    poly(ctx, gp, vgrad(ctx, y0, y1, [[0, light(p.glass, 0.35)], [1, dark(p.glass, 0.1)]]), null); F(x - 0.006, x + 0.006, 36, 58, p.trim, null);
    const k = P3(x + 0.13, fy, 30); circle(ctx, k.x, k.y, 2.2, p.accent); F(x - 0.46, x + 0.46, 70, 78, p.accent);
    poly(ctx, [P3(x - 0.34, fy, 5), P3(x + 0.34, fy, 5), P3(x + 0.34, fy + 0.3, 5), P3(x - 0.34, fy + 0.3, 5)], 0xcdbc98, 0xa89774);
    this.face(ctx, 'x', fy + 0.3, x - 0.34, x + 0.34, 0, 5, 0x9a8b6c);
    poly(ctx, [P3(x - 0.2, fy + 0.05, 5), P3(x + 0.2, fy + 0.05, 5), P3(x + 0.2, fy + 0.24, 5), P3(x - 0.2, fy + 0.24, 5)], 0x6b3f33, null);
    const l = this.pt(x, fy, 36); this.lights.push({ x: l.x, y: l.y, r: 0.45, a: 0.12, c: 0xffd9a0 });
  }
  frontFace(ctx, b, p, x, fy) {
    const H = p.height, F = (...a) => this.face(ctx, 'x', fy, ...a);
    this.wall(ctx, 'x', fy, x - 0.5, x + 0.5, H, p.wall, p, x * 7 + b.y);
    F(x - 0.5, x + 0.5, 0, 14, dark(p.wall, 0.42)); this.cornice(ctx, 'x', fy, x - 0.5, x + 0.5, H, p);
    if (p.pilasters) { F(x - 0.56, x - 0.44, 0, H - 14, light(p.wall, 0.22)); if (x === b.x + b.w - 1) F(x + 0.44, x + 0.56, 0, H - 14, light(p.wall, 0.22)); }
    if (x === b.door.x) this.door(ctx, b, p, x, fy);
    else {
      const lit = hash(x, b.y, b.id.length) < p.lit;
      if (p.shop) { this.window(ctx, 'x', fy, x, 20, 0.78, 46, p, { lit }); this.awning(ctx, 'x', fy, x - 0.5, x + 0.5, 76, p); }
      else this.window(ctx, 'x', fy, x, 38, 0.5, 36, p, { lit, blinds: p.blinds && lit, shutters: p.shutters });
    }
    if (H > 140) this.window(ctx, 'x', fy, x, 106, 0.44, 18, p, { lit: hash(x, 3, b.x) < p.lit });
  }
  rightFace(ctx, b, p, y, fx) {
    const H = p.height, F = (...a) => this.face(ctx, 'y', fx, ...a);
    this.wall(ctx, 'y', fx, y - 0.5, y + 0.5, H, p.shade, p, y * 11 + b.x);
    F(y - 0.5, y + 0.5, 0, 14, dark(p.wall, 0.55)); this.cornice(ctx, 'y', fx, y - 0.5, y + 0.5, H, p);
    if (p.pilasters) F(y - 0.56, y - 0.44, 0, H - 14, light(p.shade, 0.15));
    this.window(ctx, 'y', fx, y, 38, 0.52, 36, p, { lit: hash(y, b.x, 5) < p.lit, shutters: p.shutters, blinds: p.blinds });
    if (H > 140) this.window(ctx, 'y', fx, y, 106, 0.44, 18, p, { lit: hash(y, 7, b.x) < p.lit });
  }
  roofTile(ctx, b, p, x, y, front, right, H) {
    const roof = this.scene.diamond(x, y, H);
    poly(ctx, roof, p.roof);
    for (let i = 0; i < 14; i++) { const q = this.pt(x - 0.45 + hash(x, i, 1) * 0.9, y - 0.45 + hash(i, y, 2) * 0.9, H); rect(ctx, q.x, q.y, 2, 1.5, hash(i, x, 3) > 0.5 ? __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_57c94231f5cb903f903e") : __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_51112248272bba36b1eb")); }
    if (y === b.y) this.face(ctx, 'x', b.y - 0.5, x - 0.5, x + 0.5, H, H + 9, dark(p.trim, 0.3));
    if (x === b.x) this.face(ctx, 'y', b.x - 0.5, y - 0.5, y + 0.5, H, H + 9, dark(p.trim, 0.45));
    if (y === front) { this.face(ctx, 'x', front + 0.5, x - 0.5, x + 0.5, H, H + 9, p.trim); this.face(ctx, 'x', front + 0.53, x - 0.5, x + 0.5, H + 9, H + 11, light(p.trim, 0.3)); }
    if (x === right) { this.face(ctx, 'y', right + 0.5, y - 0.5, y + 0.5, H, H + 9, dark(p.trim, 0.12)); this.face(ctx, 'y', right + 0.53, y - 0.5, y + 0.5, H + 9, H + 11, p.trim); }
  }
  feature(ctx, f, x, y, H) {
    const c = this.pt(x, y, H), cx = c.x + (f.dx || 0), cy = c.y + (f.dy || 0);
    switch (f.k) {
      case 'chimney':
        isoBox(ctx, cx, cy, 0.2, 0.2, 0, 44, 0x3a2d28, 0x9a5b45, 0x764536, 0x2d231f);
        for (let z = 8; z < 44; z += 8) { const a = S(cx, cy, -0.2, 0.2, z), b = S(cx, cy, 0.2, 0.2, z); line(ctx, a.x, a.y, b.x, b.y, __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_22ba49161c00126178a4")); }
        isoBox(ctx, cx, cy, 0.25, 0.25, 44, 50, 0x4a3b34, 0x6d5648, 0x544036);
        if (f.smoke) this.smokeSpots.push({ x: cx, y: cy - 56 });
        break;
      case 'vent': isoBox(ctx, cx, cy, 0.13, 0.13, 0, 12, 0x8e9690, 0x6f7873, 0x59615c, 0x3b423e); isoBox(ctx, cx, cy, 0.18, 0.18, 12, 16, 0x9aa29c, 0x7c847f, 0x666e69); break;
      case 'antenna':
        line(ctx, cx, cy, cx, cy - 92, 0x2d3430, 2);
        for (const [z, w] of [[88, 14], [76, 18], [64, 12]]) line(ctx, cx - w, cy - z, cx + w, cy - z, 0x2d3430, 2);
        line(ctx, cx, cy - 70, cx - 30, cy + 8, __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_64a6e02b61649594768d")); line(ctx, cx, cy - 70, cx + 30, cy + 8, __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_64a6e02b61649594768d")); circle(ctx, cx, cy - 94, 2.5, 0xe0463c);
        break;
      case 'dish':
        line(ctx, cx, cy, cx, cy - 30, 0x59615c, 4);
        ctx.save(); ctx.translate(cx, cy - 44); ctx.rotate(-0.5); ellipse(ctx, 0, 0, 30, 20, 0x5a6661); ellipse(ctx, 3, -1, 26, 16, 0xd6ddd6); ellipse(ctx, 5, -1, 18, 10, 0xaab5ae); ctx.restore();
        line(ctx, cx + 6, cy - 46, cx + 22, cy - 64, 0x3b423e, 2); circle(ctx, cx + 23, cy - 65, 3, 0xe0463c);
        break;
      case 'flag':
        line(ctx, cx, cy, cx, cy - 98, 0xcfcfbf, 3); poly(ctx, pp([cx, cy - 96], [cx + 38, cy - 91], [cx + 32, cy - 82], [cx + 40, cy - 72], [cx, cy - 77]), 0x2f4a82); circle(ctx, cx + 14, cy - 85, 3, 0xf2e6b0);
        break;
      case 'beacon':
        isoBox(ctx, cx, cy, 0.16, 0.16, 0, 8, 0x59616a, 0x454c55, 0x343a42); blob(ctx, cx, cy - 14, 9, 0x2f68c4); blob(ctx, cx - 3, cy - 17, 3, 0xbcd8ff);
        this.lights.push({ x: cx, y: cy - 14, r: 0.9, a: 0.4, c: 0x5c9bff, blink: true });
        break;
      case 'loft': {
        isoBox(ctx, cx, cy, 0.42, 0.34, 0, 36, 0x9c7a55, 0x8a6a49, 0x6b5039, 0x3d2d20);
        for (let z = 7; z < 36; z += 7) { const a = S(cx, cy, -0.42, 0.34, z), b = S(cx, cy, 0.42, 0.34, z); line(ctx, a.x, a.y, b.x, b.y, __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_22ba49161c00126178a4")); }
        for (const u of [-0.24, 0, 0.24]) { const q = S(cx, cy, u, 0.34, 14); rect(ctx, q.x - 4, q.y - 10, 8, 11, 0x201710); }
        const r0 = S(cx, cy, -0.36, 0.44, 8), r1 = S(cx, cy, 0.36, 0.44, 8); line(ctx, r0.x, r0.y, r1.x, r1.y, 0x4a3828, 3);
        const apex = S(cx, cy, 0, 0, 64), A = (u, v) => S(cx, cy, u, v, 36);
        poly(ctx, [A(-0.52, 0.42), A(0.52, 0.42), apex], 0x7a3b32, 0x3d1c18); poly(ctx, [A(0.52, -0.42), A(0.52, 0.42), apex], 0x5d2c26, 0x3d1c18);
        line(ctx, apex.x, apex.y, apex.x, apex.y - 14, 0x2d2723, 2); poly(ctx, pp([apex.x, apex.y - 14], [apex.x + 9, apex.y - 11], [apex.x, apex.y - 8]), 0x2d2723);
        this.perches.push({ x: cx + 38, y: cy + 12 - 36 }, { x: cx - 30, y: cy + 22 - 30 });
        break;
      }
    }
  }
  cornerSign(ctx, p, fx, fy) {
    const a = this.pt(fx, fy, 84), tip = { x: a.x + 40, y: a.y + 16 };
    line(ctx, a.x, a.y, tip.x, tip.y, 0x2a2f2b, 3); line(ctx, a.x, a.y + 16, a.x + 24, a.y + 14, 0x2a2f2b, 2);
    line(ctx, tip.x - 14, tip.y, tip.x - 14, tip.y + 10, 0x2a2f2b, 1.5); line(ctx, tip.x + 2, tip.y + 1, tip.x + 2, tip.y + 10, 0x2a2f2b, 1.5);
    const px = tip.x - 20, py = tip.y + 10;
    rect(ctx, px - 1, py - 1, 40, 38, 0x20241f); rect(ctx, px, py, 38, 36, mix(p.glass, 0x2a2018, 0.5)); ctx.strokeStyle = css(p.accent); ctx.lineWidth = 1.5; ctx.strokeRect(px + 2, py + 2, 34, 32);
    this.icon(ctx, p.blade, px + 19, py + 18);
  }
  icon(ctx, kind, x, y) {
    ctx.save(); ctx.translate(x, y);
    if (kind === 'eye') {
      ctx.fillStyle = css(0xf4ecd2); ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(0, -13, 14, 0); ctx.quadraticCurveTo(0, 13, -14, 0); ctx.fill();
      circle(ctx, 0, 0, 6, 0x2f6f78); circle(ctx, 0, 0, 3, 0x10181a); circle(ctx, -1.5, -1.5, 1.2, 0xffffff);
    } else if (kind === 'lens') {
      ctx.strokeStyle = css(0xddd28e); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-3, -3, 9, 0, Math.PI * 2); ctx.stroke(); line(ctx, 4, 4, 12, 12, 0xddd28e, 4); circle(ctx, -6, -6, 2, 0xffffff);
    } else if (kind === 'mug') {
      rect(ctx, -9, -8, 15, 17, 0xe7b85c); rect(ctx, -9, -8, 15, 4, 0xfff3d0); circle(ctx, -6, -9, 3, 0xfff3d0); circle(ctx, 1, -10, 3.5, 0xfff3d0);
      ctx.strokeStyle = css(0xe7b85c); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(8, 0, 5, -1.4, 1.4); ctx.stroke();
    } else if (kind === 'badge') {
      ctx.fillStyle = css(0xe0c070); ctx.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 6 : 13, a = -Math.PI / 2 + (i * Math.PI) / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill(); circle(ctx, 0, 0, 4, 0x2f4a82);
    } else {
      ellipse(ctx, 0, 2, 10, 7, 0xcfd3d6); circle(ctx, 9, -3, 5, 0xb7bcc0); poly(ctx, pp([13, -3], [18, -1], [13, -1]), 0xe0983c); poly(ctx, pp([-9, 0], [-17, 6], [-9, 6]), 0xa9aeb3); circle(ctx, 10, -4, 1, 0x101010);
    }
    ctx.restore();
  }
  bakeBanner(b, text, zTop, widthCells) {
    const s = this.scene, front = b.y + b.h - 1, fy = front + 0.5, u0 = b.door.x - widthCells / 2, A = this.pt(u0, fy + 0.03, zTop);
    const wpx = widthCells * HW, w = Math.ceil(wpx + 30), h = Math.ceil(wpx * 0.5 + 52), left = A.x - 12, top = A.y - 12;
    const key = this.bake(`banner_${b.id}`, w, h, ctx => {
      ctx.save(); ctx.translate(A.x, A.y); ctx.transform(1, 0.5, 0, 1, 0, 0);
      rect(ctx, 1, 3, wpx, 20, __dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_78eab87e6186882af78f")); rect(ctx, 0, 0, wpx, 20, 0x2e231b); ctx.strokeStyle = css(0xd7b16b); ctx.lineWidth = 1.5; ctx.strokeRect(1.5, 1.5, wpx - 3, 17);
      let size = 13; ctx.font = `${size}${__dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_2e0dd9220c0e7b7f0e34")}${FONT_UI}`;
      while (ctx.measureText(text).width > wpx - 16 && size > 8) { size -= 1; ctx.font = `${size}${__dialogueText("scenes/homeCity/HomeCityBuildings.js", "t_2e0dd9220c0e7b7f0e34")}${FONT_UI}`; }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = css(0xf1e2b6); ctx.fillText(text, wpx / 2, 11); ctx.restore();
    }, left, top);
    if (key) s.add.image(left, top, key).setOrigin(0, 0).setDepth((b.door.x + front) * 100 + 100.5);
  }
  makeLabel(b, art) {
    const s = this.scene, H = art.height + 24, c = this.pt(b.x + (b.w - 1) / 2, b.y + (b.h - 1) / 2, b.id === 'cemetery' ? 118 : H);
    art.plaque = s.add.graphics().setDepth(9999);
    art.label = s.add.text(c.x, c.y, b.name, { fontFamily: FONT_UI, fontSize: '22px', color: '#f6e7c1', padding: { x: 14, y: 8 } })
      .setOrigin(0.5).setDepth(10000).setInteractive({ useHandCursor: true }).setData('buildingId', b.id);
    art.label.on('pointerover', () => this.setHover(b.id)); art.label.on('pointerout', () => this.setHover(null));
    const door = this.pt(b.door.x, b.door.y);
    art.marker = s.add.ellipse(door.x, door.y, 56, 26, 0xe1c383, 0.45).setStrokeStyle(2, 0xf5dfa6, 0.5).setDepth(-400);
    this.paintLabel(b.id);
  }
  paintLabel(id) {
    const art = this.buildingArt.get(id); if (!art?.label?.active) return;
    const on = id === this.selectedId || id === this.hoverId, t = art.label, w = t.width, h = t.height, x = t.x - w / 2, y = t.y - h / 2, g = art.plaque;
    t.setColor(on ? '#fff0c4' : '#f6e7c1');
    g.clear(); g.fillStyle(0x000000, 0.28).fillRoundedRect(x + 3, y + 4, w, h, 8);
    g.fillStyle(on ? 0x6a5430 : 0x2b312b, 0.95).fillRoundedRect(x, y, w, h, 8); g.lineStyle(2, on ? 0xffd277 : 0xb89a58, 1).strokeRoundedRect(x, y, w, h, 8);
    g.fillStyle(on ? 0x6a5430 : 0x2b312b, 0.95).fillTriangle(t.x - 8, y + h - 1, t.x + 8, y + h - 1, t.x, y + h + 9);
    art.marker.setFillStyle(on ? 0xffdb80 : 0xe1c383, on ? 0.9 : 0.45);
  }
  refreshHull() {
    const g = this.hl; if (!g?.active) return; g.clear();
    for (const [id, strong] of [[this.hoverId, false], [this.selectedId, true]]) {
      const art = id ? this.buildingArt.get(id) : null; if (!art?.hull) continue;
      g.lineStyle(strong ? 9 : 6, 0xffd98a, strong ? 0.22 : 0.16).strokePoints(art.hull, true);
      g.lineStyle(3, 0xffe9b0, strong ? 0.95 : 0.7).strokePoints(art.hull, true);
    }
  }
  setHover(id) {
    if (this.destroyed || this.hoverId === id) return;
    const old = this.hoverId; this.hoverId = id;
    if (old) this.paintLabel(old); if (id) this.paintLabel(id); this.refreshHull();
  }
  selectBuilding(id = null) {
    this.selectedId = id; for (const key of this.buildingArt.keys()) this.paintLabel(key); this.refreshHull();
  }

  // ----------------------------------------------------------- cemetery ---
}
