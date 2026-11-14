import { HomeCityRendererCore } from './HomeCityRendererCore.js';
import { HW, HH, WORLD_W, WORLD_H, FONT_UI, DIRS, STREET_TEXTS } from './HomeCityConfig.js';
import { css, mix, hash, rect, circle, ellipse } from './HomeCityDrawing.js';

export class HomeCityGround extends HomeCityRendererCore {
  drawGround() {
    const s = this.scene, cw = 825, ch = 1000;
    for (let cy = 0; cy < WORLD_H; cy += ch) for (let cx = 0; cx < WORLD_W; cx += cw) {
      const key = this.bake(`ground_${cx}_${cy}`, cw, ch, ctx => this.paintGround(ctx, cx, cy, cw, ch), cx, cy);
      if (key) s.add.image(cx, cy, key).setOrigin(0, 0).setDepth(-1000);
    }
    this.routeGraphics = s.add.graphics().setDepth(-350);
    this.afterFonts(() => { for (const job of STREET_TEXTS) this.bakeFlatText(job); });
  }
  paintGround(ctx, cx, cy, cw, ch) {
    const s = this.scene, o = this.origin, R = 9;
    ctx.beginPath(); ctx.rect(cx, cy, cw, ch); ctx.clip();
    rect(ctx, cx, cy, cw, ch, '#141a12');
    ctx.save(); ctx.transform(HW, HH, -HW, HH, o.x, o.y);
    for (let y = -R; y < s.rows + R; y++) for (let x = -R; x < s.cols + R; x++) {
      const px = o.x + (x - y) * HW, py = o.y + (x + y) * HH;
      if (px + HW < cx || px - HW > cx + cw || py + HH < cy || py - HH > cy + ch) continue;
      this.paintTile(ctx, x, y);
    }
    this.paintDecals(ctx);
    ctx.restore();
  }
  texFill(ctx, key, x, y, rep = 4) {
    if (!this.has(key)) return false;
    const img = this.scene.textures.get(key).getSourceImage(), w = img.width, h = img.height;
    ctx.drawImage(img, (((x % rep) + rep) % rep) * (w / rep), (((y % rep) + rep) % rep) * (h / rep), w / rep, h / rep, x - 0.51, y - 0.51, 1.02, 1.02);
    return true;
  }
  paintTile(ctx, x, y) {
    const k = this.kind(x, y), n = hash(x, y), d = this.outsideDist(x, y);
    const fill = c => rect(ctx, x - 0.51, y - 0.51, 1.02, 1.02, c);
    const spot = (u, v, r, c, a = 1) => rect(ctx, x - 0.5 + u - r, y - 0.5 + v - r, r * 2, r * 2, css(c, a));
    const stroke = (a, b, c, d2, color, w) => { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x - 0.5 + a, y - 0.5 + b); ctx.lineTo(x - 0.5 + c, y - 0.5 + d2); ctx.stroke(); };
    if (k === 'road') {
      if (!this.texFill(ctx, 'hc_tex_road', x, y)) fill(mix(0x4a4f4b, 0x5c615a, n));
      if (hash(x, y, 2) > 0.78) rect(ctx, x - 0.4 + hash(x, y, 8) * 0.3, y - 0.4 + hash(y, x, 9) * 0.3, 0.35, 0.28, 'rgba(20,22,20,.16)');
      if (hash(x, y, 5) > 0.8) { const a = hash(x, y, 6), b = hash(x, y, 7); stroke(a, 0.05, a + 0.2, 0.4, 'rgba(18,20,18,.5)', 0.012); stroke(a + 0.2, 0.4, b, 0.95, 'rgba(18,20,18,.5)', 0.012); }
      for (let i = 0; i < 5; i++) spot(hash(x, i, 3), hash(i, y, 4), 0.012, 0xa4a89c, 0.35);
    } else if (k === 'walk') {
      const isPath = this.paths.has(this.scene.cellKey(x, y)) && !this.isSidewalk(x, y);
      if (!this.texFill(ctx, 'hc_tex_sidewalk', x, y)) fill(mix(0x9d937b, 0xb3a98f, n));
      if (isPath) {
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const v = hash(x * 3 + c, y * 3 + r, 1); rect(ctx, x - 0.5 + c / 3 + 0.02, y - 0.5 + r / 3 + 0.02, 0.29, 0.29, v > 0.65 ? 0xb8ad93 : v > 0.3 ? 0xaca187 : 0x9b917a); }
      } else {
        for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) rect(ctx, x - 0.5 + c / 2, y - 0.5 + r / 2, 0.5, 0.5, css(0xffffff, hash(x * 2 + c, y * 2 + r, 2) * 0.09));
        ctx.strokeStyle = 'rgba(70,60,45,.26)'; ctx.lineWidth = 0.016; ctx.strokeRect(x - 0.5, y - 0.5, 1, 1);
        stroke(0.5, 0, 0.5, 1, 'rgba(70,60,45,.2)', 0.012); stroke(0, 0.5, 1, 0.5, 'rgba(70,60,45,.2)', 0.012);
      }
      if (hash(x, y, 11) > 0.96) spot(hash(x, y, 12), hash(y, x, 13), 0.025, 0x4b3f3a, 0.55);
      if (hash(x, y, 14) > 0.9) spot(hash(x, y, 15), hash(y, x, 16), 0.022, [0xc9822f, 0xd8b04a, 0x8a5a2b][Math.floor(hash(x, y, 17) * 3)], 0.8);
    } else if (k === 'plaza') {
      if (!this.texFill(ctx, 'hc_tex_plaza', x, y)) {
        fill(0x8f846c);
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const v = hash(x * 4 + c, y * 4 + r, 1); rect(ctx, x - 0.5 + c / 4 + 0.012, y - 0.5 + r / 4 + 0.012, 0.226, 0.226, v > 0.66 ? 0xb9ae94 : v > 0.33 ? 0xada28a : 0x9f9580); }
      }
    } else {
      if (!this.texFill(ctx, 'hc_tex_grass', x, y)) fill(mix(0x62724c, 0x80905f, hash(Math.floor(x / 2), Math.floor(y / 2), 3) * 0.6 + n * 0.4));
      ctx.lineWidth = 0.016;
      for (let i = 0; i < 9; i++) {
        const u = hash(x, y, i + 10), v = hash(y, x, i + 20), dk = hash(x + i, y, 30) > 0.5;
        stroke(u, v, u - 0.07, v - 0.07 + (hash(i, x, 4) - 0.5) * 0.04, css(dk ? 0x4d5d3c : 0x93a86c, 0.75), 0.016);
      }
      if (k === 'grass' && hash(x, y, 7) > 0.88) { const c = [0xe8d27a, 0xe58aa0, 0xf2f2e6, 0x9ab8e6][Math.floor(hash(x, y, 8) * 4)]; spot(hash(x, y, 9), hash(y, x, 9), 0.022, c); spot(hash(x, y, 9) + 0.05, hash(y, x, 9) + 0.03, 0.018, c); }
      if (hash(x, y, 18) > 0.93) spot(hash(x, y, 19), hash(y, x, 19), 0.03, 0x8f8f86, 0.8);
    }
    if (d) fill(css(0x060906, Math.min(0.82, 0.17 * d)));
  }
  paintDecals(ctx) {
    const s = this.scene, o = this.origin;
    const strip = (x, y, dx, dy, w, c) => {
      const px = dx === 1 ? x + 0.5 - w : dx === -1 ? x - 0.5 : x - 0.5, py = dy === 1 ? y + 0.5 - w : dy === -1 ? y - 0.5 : y - 0.5;
      rect(ctx, px, py, dx ? w : 1, dy ? w : 1, c);
      rect(ctx, dx === 1 ? x + 0.5 : dx === -1 ? x - 0.5 - 0.08 : x - 0.5, dy === 1 ? y + 0.5 : dy === -1 ? y - 0.5 - 0.08 : y - 0.5, dx ? 0.08 : 1, dy ? 0.08 : 1, 'rgba(10,12,10,.22)');
    };
    for (let y = 0; y < s.rows; y++) for (let x = 0; x < s.cols; x++) {
      const k = this.kind(x, y); if (k !== 'walk' && k !== 'plaza') continue;
      for (const [dx, dy] of DIRS) { const nk = this.kind(x + dx, y + dy); if ((k === 'walk' && nk === 'road') || (k === 'plaza' && nk !== 'plaza')) strip(x, y, dx, dy, k === 'plaza' ? 0.14 : 0.1, k === 'plaza' ? 0xc8bda2 : 0xd6cdb4); }
    }
    ctx.lineCap = 'butt';
    const dash = (u1, v1, u2, v2, c, w) => { ctx.setLineDash([0.42, 0.5]); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(u1, v1); ctx.lineTo(u2, v2); ctx.stroke(); ctx.setLineDash([]); };
    const solid = (u1, v1, u2, v2, c, w) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(u1, v1); ctx.lineTo(u2, v2); ctx.stroke(); };
    const Y = 'rgba(224,186,70,.75)', W = 'rgba(232,228,212,.7)';
    for (const x of [10, 1.5]) for (const [a, b] of [[-9, 6.4], [12.6, 16.4], [20.6, 31]]) dash(x, a, x, b, Y, 0.05);
    for (const [a, b] of [[-9, 0.4], [3.7, 7.3], [18, 34]]) { solid(a, 9.45, b, 9.45, Y, 0.035); solid(a, 9.56, b, 9.56, Y, 0.035); }
    for (const [a, b] of [[-9, 0.4], [3.7, 7.3], [12.7, 34]]) dash(a, 18.5, b, 18.5, W, 0.045);
    const zebraV = (u0, u1, v) => { for (let u = u0; u < u1 - 0.1; u += 0.5) rect(ctx, u, v - 0.38, 0.26, 0.76, W); };
    const zebraU = (v0, v1, u) => { for (let v = v0; v < v1 - 0.1; v += 0.5) rect(ctx, u - 0.38, v, 0.76, 0.26, W); };
    for (const v of [7, 12, 17, 20]) { zebraV(8.6, 11.4, v); zebraV(0.6, 2.4, v); }
    for (const u of [3, 8, 12, 18]) zebraU(7.6, 11.4, u);
    for (const u of [3, 8, 12]) zebraU(17.6, 19.4, u);
    for (const [u, v] of [[10, 4], [10, 15], [5, 10], [21, 9.2]]) {
      circle(ctx, u, v, 0.21, 0x2b2e2b); circle(ctx, u, v, 0.17, 0x474b47);
      solid(u - 0.15, v, u + 0.15, v, 'rgba(20,22,20,.8)', 0.02); solid(u, v - 0.15, u, v + 0.15, 'rgba(20,22,20,.8)', 0.02);
    }
    for (const [u, v, r] of [[9.2, 14, 0.5], [20, 10.8, 0.6], [6.4, 8.8, 0.4], [10.4, 2, 0.45]]) {
      ellipse(ctx, u, v, r, r * 0.7, 'rgba(120,152,176,.3)', 0.6); ellipse(ctx, u - r * 0.2, v - r * 0.2, r * 0.4, r * 0.22, 'rgba(225,238,246,.3)', 0.6);
    }
    ctx.strokeStyle = 'rgba(70,62,50,.5)'; ctx.lineWidth = 0.13; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(15, 9.5, 1.05, 0, Math.PI * 2); ctx.stroke(); solid(15.75, 10.25, 16.55, 11.05, 'rgba(70,62,50,.5)', 0.2);
    ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.beginPath(); ctx.arc(15, 9.5, 1.0, 0, Math.PI * 2); ctx.fill();
    ctx.lineCap = 'butt';
  }
  bakeFlatText(job) {
    const s = this.scene, c = this.pt(job.u, job.v), o = this.origin;
    const key = this.bake(`txt_${job.t.replace(/\W/g, '')}`, 560, 300, ctx => {
      ctx.save(); ctx.transform(HW, HH, -HW, HH, o.x, o.y); ctx.translate(job.u, job.v);
      if (job.rot === 'v') ctx.rotate(-Math.PI / 2);
      ctx.scale(1 / 64, 1 / 64); ctx.font = `${job.size}px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(232,224,190,.5)'; ctx.fillText(job.t, 0, 0); ctx.restore();
    }, c.x - 280, c.y - 150);
    if (key) s.add.image(c.x - 280, c.y - 150, key).setOrigin(0, 0).setDepth(-900);
  }

  // ---------------------------------------------------------- buildings ---
}
