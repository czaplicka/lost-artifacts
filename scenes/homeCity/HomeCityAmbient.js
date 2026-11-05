import { HomeCityProps } from './HomeCityProps.js';
import { FONT_PX, WALKERS } from './HomeCityConfig.js';
import { pp, poly, rect, circle, ellipse, line, shadow } from './HomeCityDrawing.js';
import { drawPerson, PEOPLE } from './HomeCityPropArt.js';

export class HomeCityAmbient extends HomeCityProps {
  drawAmbient() {
    const s = this.scene, B = Phaser.BlendModes.ADD;
    const glow = this.bake('glow', 128, 128, ctx => {
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    });
    for (const L of this.lights) {
      const img = s.add.image(L.x, L.y, glow).setBlendMode(B).setTint(L.c).setAlpha(L.a).setScale(L.sx ?? L.r * 1.4, L.sy ?? L.r * 1.4).setDepth(L.ground ? -300 : 9000);
      if (L.flicker || L.blink) s.tweens.add({ targets: img, alpha: { from: L.a * (L.blink ? 0.2 : 0.8), to: L.a * 1.15 }, duration: L.blink ? 500 : 900 + Math.random() * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 800 });
    }
    const vk = this.bake('vignette', 480, 270, ctx => {
      const g = ctx.createRadialGradient(240, 135, 40, 240, 135, 300); g.addColorStop(0, 'rgba(255,190,110,.06)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(8,10,8,.62)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 270);
    });
    s.add.image(s.scale.width / 2, s.scale.height / 2, vk).setScrollFactor(0).setDisplaySize(s.scale.width, s.scale.height).setDepth(15000);
    // smoke
    const smoke = this.bake('smoke', 64, 64, ctx => {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(225,225,220,.8)'); g.addColorStop(1, 'rgba(225,225,220,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    });
    for (const sp of this.smokeSpots) s.add.particles(sp.x, sp.y, smoke, { lifespan: 2800, speedY: { min: -30, max: -18 }, speedX: { min: 5, max: 14 }, scale: { start: 0.3, end: 1.1 }, alpha: { start: 0.4, end: 0 }, frequency: 650, quantity: 1 }).setDepth(8900);
    // people, dog, pigeons
    PEOPLE.forEach((o, i) => this.bakeSprite(`ped${i}`, 60, 110, 30, 100, ctx => drawPerson(ctx, o)));
    this.bakeSprite('dog', 70, 50, 35, 44, ctx => {
      shadow(ctx, 18, 5); for (const x of [-11, -6, 8, 13]) rect(ctx, x, -12, 3.5, 12, 0x6e4a2c); ellipse(ctx, 0, -17, 16, 8, 0x8a5e37); circle(ctx, 17, -24, 7, 0x8a5e37);
      rect(ctx, 20, -25, 8, 5, 0x6e4a2c); circle(ctx, 27, -24, 2, 0x111111); poly(ctx, pp([12, -30], [17, -33], [17, -27]), 0x5a3a20); rect(ctx, 12, -20, 8, 2.5, 0xb7342d); line(ctx, -15, -20, -22, -30, 0x8a5e37, 3);
    });
    const pk = this.bakeSprite('pigeon', 40, 36, 20, 33, ctx => {
      line(ctx, -2, -8, -2, 0, 0xd0803a, 1.5); line(ctx, 3, -8, 3, 0, 0xd0803a, 1.5); poly(ctx, pp([-9, -14], [-17, -10], [-9, -8]), 0x6f767c); ellipse(ctx, 0, -14, 10, 7, 0x8d949b); ellipse(ctx, -2, -14, 7, 4, 0x6b7279);
      circle(ctx, 7, -20, 5, 0x4a6a74); circle(ctx, 10, -23, 4, 0x6b7d84); poly(ctx, pp([13, -23], [17, -22], [13, -21]), 0xe0983c); circle(ctx, 11, -24, 0.9, 0x101010);
    });
    for (const w of WALKERS) {
      const key = `hc${this.uid}_${w.tex}`, a = this.anchors.get(key); if (!a) continue;
      const sp = s.add.image(0, 0, key).setOrigin(...a);
      this.walkers.push({ sp, route: w.route, speed: w.speed, i: 1, cx: w.route[0][0], cy: w.route[0][1], wait: 0, dir: 1, ph: Math.random() * 6 });
      this.placeWalker(this.walkers[this.walkers.length - 1], 0, 0);
    }
    this.pigeonKey = pk;
    for (const [cx, cy] of [[14.2, 9], [15.4, 10.6], [16.6, 9.2], [14.4, 11], [15.8, 8.4], [16.8, 10.8]]) this.makePigeon(cx, cy);
    const home = s.buildings.find(b => b.id === 'your-home');
    if (home) for (let i = 0; i < 2; i++) { const q = this.makePigeon(16.2 + i * 1.2, 17.3); }
    this.prompt = s.add.text(0, 0, 'ENTER', { fontFamily: FONT_PX, fontSize: '12px', color: '#ffe19b', backgroundColor: '#2b312b', padding: { x: 8, y: 6 } }).setOrigin(0.5).setDepth(10001).setVisible(false);
  }
  makePigeon(cx, cy) {
    const home = this.pt(cx, cy), sp = this.scene.add.image(home.x, home.y, this.pigeonKey).setOrigin(...this.anchors.get(this.pigeonKey)).setDepth((cx + cy) * 100 + 1.2);
    const q = { sp, home, cx, cy, state: 'idle', t: Math.random() * 6, timer: 0, from: null, to: null, dur: 1, el: 0, returning: false };
    this.pigeons.push(q); return q;
  }
  flyTo(q, target, returning) {
    q.from = { x: q.sp.x, y: q.sp.y }; q.to = target; q.returning = returning; q.el = 0;
    q.dur = 0.4 + Math.hypot(target.x - q.from.x, target.y - q.from.y) / 320; q.state = 'fly'; q.sp.setDepth(8500);
  }
  placeWalker(w, time, moving) {
    const p = this.pt(w.cx, w.cy), ph = time * 0.012 * w.speed + w.ph;
    w.sp.setPosition(p.x, p.y - (moving ? Math.abs(Math.sin(ph)) * 3 : 0)).setDepth((w.cx + w.cy) * 100 + 1.5).setScale(w.dir, 1).setAngle(moving ? Math.sin(ph) * 3 : 0);
  }
  update(time, delta, st = {}) {
    if (this.destroyed || !this.scene) return;
    const dt = Math.min(delta, 100) / 1000, cell = st.cell;
    for (const w of this.walkers) {
      if (!w.sp.active) continue;
      if (w.wait > 0) { w.wait -= dt; this.placeWalker(w, time, 0); continue; }
      const tgt = w.route[w.i], dx = tgt[0] - w.cx, dy = tgt[1] - w.cy, dist = Math.hypot(dx, dy), step = w.speed * dt;
      if (dist <= step) { w.cx = tgt[0]; w.cy = tgt[1]; w.wait = tgt[2] || 0; w.i = (w.i + 1) % w.route.length; }
      else { w.cx += (dx / dist) * step; w.cy += (dy / dist) * step; if (Math.abs(dx - dy) > 0.01) w.dir = dx - dy > 0 ? 1 : -1; }
      this.placeWalker(w, time, 1);
    }
    for (const q of this.pigeons) {
      if (!q.sp.active) continue;
      const d = cell ? Math.hypot(cell.x - q.cx, cell.y - q.cy) : 99;
      if (q.state === 'idle') {
        q.t += dt; q.sp.setAngle(-Math.max(0, Math.sin(q.t * 5 + q.cx * 3)) * 14).setPosition(q.home.x, q.home.y);
        if (d < 2.3 && this.perches.length) this.flyTo(q, this.perches[Math.floor(Math.random() * this.perches.length)], false);
      } else if (q.state === 'fly') {
        q.el += dt; const k = Math.min(1, q.el / q.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        q.sp.setPosition(q.from.x + (q.to.x - q.from.x) * e, q.from.y + (q.to.y - q.from.y) * e - Math.sin(Math.PI * k) * 70).setAngle(0)
          .setScale(q.to.x < q.from.x ? -1 : 1, 0.85 + 0.25 * Math.sin(time * 0.04));
        if (k >= 1) { q.state = q.returning ? 'idle' : 'perch'; q.timer = 3 + Math.random() * 4; q.sp.setScale(1, 1).setDepth(q.returning ? (q.cx + q.cy) * 100 + 1.2 : 8000); }
      } else if (q.timer -= dt, q.timer <= 0 && d > 3.2) this.flyTo(q, q.home, true);
    }
    if (this.ghost?.sp.active) this.ghost.sp.setPosition(this.ghost.x + Math.sin(time * 0.0006) * 36, this.ghost.y - 8 + Math.sin(time * 0.002) * 6).setAlpha(0.28 + 0.12 * Math.sin(time * 0.0017));
    const pr = this.prompt;
    if (pr?.active) {
      const near = st.idle && cell ? this.scene.buildings.find(b => Math.abs(b.door.x - cell.x) + Math.abs(b.door.y - cell.y) <= 1) : null;
      if (near) { const p = this.pt(near.door.x, near.door.y); pr.setPosition(p.x, p.y - 140 + Math.sin(time * 0.006) * 4).setVisible(true); } else pr.setVisible(false);
    }
  }

  // ------------------------------------------------------------- route ---
}
