// =============================================================================
// ShootingRangeRound.js - the actual shooting: targets, aiming, hits, HUD.
// Mixed into ShootingRangeScene.prototype. All objects created here are put in
// this.roundObjects (or this.targets) and destroyed by clearRound().
// =============================================================================
import { W, H, FONT, ROUND, IMAGES, LANES, SHELF, BOOTH_TOP, TARGETS, POINTS, HINT } from './ShootingRangeData.js';
import { playRangeSound } from './ShootingRangeAudio.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pickWeighted = list => {
  let roll = Math.random() * list.reduce((s, [, w]) => s + w, 0);
  for (const [item, w] of list) { roll -= w; if (roll <= 0) return item; }
  return list[0][0];
};
const GUN_X = W - 40, GUN_Y = H + 24;           // revolver sprite origin (1,1)
const MUZZLE = { x: 45 - IMAGES.revolver.w, y: 15 - IMAGES.revolver.h };   // barrel tip in revolver.webp

export const shootingRangeRound = {
  startRound() {
    this.clearLobby(); this.clearResults(); this.clearRound();
    this.mode = 'round';
    Object.assign(this, {
      roundObjects: [], targets: [], score: 0, shots: 0, hits: 0, bulls: 0, civilians: 0,
      timeLeft: ROUND.seconds * 1000, elapsed: 0, ammo: ROUND.cylinder, reloading: false,
      spawnIn: 600, recoil: 0, aim: { x: W / 2, y: H / 2 }
    });
    const keep = o => { this.roundObjects.push(o); return o; };
    keep(this.add.image(0, 0, IMAGES.lanes.key).setOrigin(0).setDisplaySize(W, H).setDepth(0));

    keep(this.add.rectangle(0, 0, W, 84, 0x0d0b09, 0.62).setOrigin(0).setDepth(150));
    const label = (x, txt, origin) => keep(this.add.text(x, 42, txt, { fontFamily: FONT.pixel, fontSize: '24px', color: '#f2e6b0' }).setOrigin(origin, 0.5).setDepth(151));
    this.scoreText = label(40, '', 0);
    this.timeText = label(W / 2, '', 0.5);
    this.bestText = label(W - 40, `BEST ${this.stats().bestScore}`, 1);
    keep(this.add.text(W / 2, H - 22, HINT, { fontFamily: FONT.body, fontSize: '22px', color: '#e8dcc0' }).setOrigin(0.5, 1).setDepth(151).setAlpha(0.8));

    this.bulletIcons = [];
    for (let i = 0; i < ROUND.cylinder; i++) {
      this.bulletIcons.push(keep(this.add.image(200 + i * 34, 1000, IMAGES.bullet.key).setDepth(151)));
    }
    this.reloadText = keep(this.add.text(200 + ROUND.cylinder * 34 + 20, 1000, '', { fontFamily: FONT.pixel, fontSize: '18px', color: '#f2b84a' }).setOrigin(0, 0.5).setDepth(151));

    this.revolver = keep(this.add.image(GUN_X, GUN_Y, IMAGES.revolver.key).setOrigin(1, 1).setDepth(100));
    this.flash = keep(this.add.star(0, 0, 9, 16, 46, 0xffe38a).setDepth(101).setVisible(false));
    this.crosshair = keep(this.add.image(W / 2, H / 2, IMAGES.crosshair.key).setDepth(200));
    this.input.setDefaultCursor('none');
    this.refreshRoundHud();
  },

  clearRound() {
    for (const t of this.targets || []) t.c.destroy();
    for (const o of this.roundObjects || []) o.destroy();
    this.targets = []; this.roundObjects = []; this.revolver = null; this.crosshair = null;
    this.reloadTimer?.remove(false); this.reloadTimer = null;
    this.input?.setDefaultCursor('default');
  },

  refreshRoundHud() {
    if (this.mode !== 'round') return;
    this.scoreText.setText(`SCORE ${this.score}`);
    const s = Math.ceil(this.timeLeft / 1000);
    this.timeText.setText(`TIME ${s}`).setColor(s <= 10 ? '#ff7b5c' : '#f2e6b0');
    this.bulletIcons.forEach((b, i) => b.setAlpha(i < this.ammo ? 1 : 0.18));
    this.reloadText.setText(this.reloading ? 'RELOADING...' : this.ammo === 0 ? 'RELOAD! (R)' : '');
  },

  // ---------------------------------------------------------------- update --
  updateRound(time, delta) {
    this.timeLeft -= delta; this.elapsed += delta;
    if (this.timeLeft <= 0) { this.timeLeft = 0; this.refreshRoundHud(); this.finishRound(); return; }
    const progress = this.elapsed / (ROUND.seconds * 1000);

    this.spawnIn -= delta;
    const cap = Math.min(ROUND.maxTargets, 2 + Math.floor(progress * 3));
    if (this.spawnIn <= 0 && this.targets.filter(t => t.alive).length < cap) {
      this.spawnTarget(progress); this.spawnIn = rand(900, 1500) * (1 - progress * 0.45);
    }

    for (const t of this.targets) {
      if (!t.alive || t.state === 'falling') continue;
      if (t.vx) {
        t.c.x += t.vx * delta / 1000;
        if ((t.vx > 0 && t.c.x >= t.lane.maxX) || (t.vx < 0 && t.c.x <= t.lane.minX)) this.dropTarget(t);
      } else if (t.state === 'up') {
        t.hold -= delta; if (t.hold <= 0) this.dropTarget(t);
      }
    }
    this.targets = this.targets.filter(t => t.c.active);

    // aim: pointer + a gentle hand sway + recoil kick
    const p = this.input.activePointer;
    this.aim.x = Phaser.Math.Clamp(p.x, 0, W); this.aim.y = Phaser.Math.Clamp(p.y, 0, H);
    this.recoil *= Math.pow(0.0015, delta / 1000);
    const sx = Math.sin(time / 640) * 4 + Math.sin(time / 230) * 1.5, sy = Math.cos(time / 820) * 3.5;
    this.crosshair.setPosition(this.aim.x + sx, this.aim.y + sy - this.recoil);
    this.revolver.setPosition(GUN_X + (this.aim.x - W / 2) * 0.22, GUN_Y + (this.aim.y - H / 2) * 0.12 + this.recoil * 0.9);
    this.revolver.setRotation((this.aim.x - W / 2) * 0.00012 - this.recoil * 0.004);
    this.refreshRoundHud();
  },

  // ---------------------------------------------------------------- targets --
  spawnTarget(progress) {
    const hasBottle = this.targets.some(t => t.alive && t.type === 'bottle');
    const type = pickWeighted(Object.entries(TARGETS).filter(([k]) => !(k === 'bottle' && hasBottle)).map(([k, d]) => [k, d.weight]));
    const variants = TARGETS[type].variants, def = variants[Math.floor(Math.random() * variants.length)], spec = IMAGES[def.image];
    let lane, x, vx = 0;
    if (type === 'bottle') {
      lane = SHELF; x = rand(SHELF.minX, SHELF.maxX);
    } else {
      lane = LANES[Math.floor(Math.random() * LANES.length)];
      if (type === 'bullseye') {
        const dir = Math.random() < 0.5 ? 1 : -1; x = dir > 0 ? lane.minX : lane.maxX;
        vx = dir * rand(150, 250) * (0.55 + lane.scale * 0.5) * (1 + progress * 0.6);
      } else {
        for (let i = 0; i < 6; i++) {
          x = rand(lane.minX, lane.maxX);
          if (!this.targets.some(t => t.alive && t.lane === lane && Math.abs(t.c.x - x) < 230 * lane.scale)) break;
        }
      }
    }
    const c = this.add.container(x, lane.y).setDepth(lane.depth + Math.random());
    const img = this.add.image(0, 0, spec.key).setOrigin(0.5, 1);
    c.add(img);
    const t = { type, def, spec, lane, c, vx, alive: true, state: 'rising', flip: 0,
      hold: (type === 'bottle' ? 2600 : (rand(1500, 2300) - progress * 700) * (def.hold ?? 1)) };
    this.applyFlip(t);
    this.tweens.add({ targets: t, flip: 1, duration: 170, ease: 'Back.Out', onUpdate: () => this.applyFlip(t),
      onComplete: () => { if (t.alive) t.state = 'up'; } });
    this.targets.push(t);
  },

  applyFlip(t) { if (t.c.active) t.c.setScale(t.lane.scale, t.lane.scale * Math.max(0.02, t.flip)); },

  dropTarget(t, delay = 0) {
    if (!t.alive || t.state === 'falling') return;
    t.state = 'falling';
    this.tweens.add({ targets: t, flip: 0, delay, duration: 160, ease: 'Quad.In', onUpdate: () => this.applyFlip(t),
      onComplete: () => { t.alive = false; t.c.destroy(); } });
  },

  // ---------------------------------------------------------------- shooting --
  shoot() {
    if (this.mode !== 'round') return;
    if (this.reloading) { playRangeSound(this, 'empty'); return; }
    if (this.ammo <= 0) { playRangeSound(this, 'empty'); this.reload(); return; }
    const x = this.crosshair.x, y = this.crosshair.y;
    this.ammo -= 1; this.shots += 1; this.recoil = 34;
    playRangeSound(this, 'shot');
    this.cameras.main.shake(70, 0.0035);
    const tip = { x: this.revolver.x + MUZZLE.x, y: this.revolver.y + MUZZLE.y };
    this.flash.setPosition(tip.x, tip.y).setRotation(Math.random() * Math.PI).setVisible(true);
    this.time.delayedCall(55, () => this.flash?.active && this.flash.setVisible(false));

    const result = this.hitTest(x, y);
    if (!result) this.missMark(x, y);
    else this.scoreHit(result, x, y);
    if (this.ammo === 0) this.time.delayedCall(250, () => this.mode === 'round' && !this.reloading && this.ammo === 0 && this.reload());
    this.refreshRoundHud();
  },

  reload() {
    if (this.mode !== 'round' || this.reloading || this.ammo === ROUND.cylinder) return;
    this.reloading = true; playRangeSound(this, 'reload'); this.refreshRoundHud();
    this.reloadTimer = this.time.delayedCall(ROUND.reloadMs, () => {
      this.reloadTimer = null; if (this.mode !== 'round') return;
      this.reloading = false; this.ammo = ROUND.cylinder; this.refreshRoundHud();
    });
  },

  hitTest(x, y) {
    const live = this.targets.filter(t => t.alive && t.state !== 'falling' && t.flip > 0.7).sort((a, b) => b.c.depth - a.c.depth);
    for (const t of live) {
      const sx = t.c.scaleX, sy = t.c.scaleY;
      const lx = (x - t.c.x) / sx + t.spec.w / 2, ly = (y - t.c.y) / sy + t.spec.h;
      if (lx < 0 || ly < 0 || lx > t.spec.w || ly > t.spec.h) continue;
      const d = t.def;
      if (d.ring) {
        const r = Math.hypot(lx - d.ring.x, ly - d.ring.y) / d.ring.r;
        if (r <= d.ring.bull) return { t, lx, ly, zone: 'bull' };
        if (r <= d.ring.inner) return { t, lx, ly, zone: 'inner' };
        if (r <= 1) return { t, lx, ly, zone: 'outer' };
        const b = d.board;                                             // the square board around the rings
        if (lx >= b.x && lx <= b.x + b.w && ly >= b.y && ly <= b.y + b.h) return { t, lx, ly, zone: 'paper' };
        continue;
      }
      const inHead = d.head && Math.hypot(lx - d.head.x, ly - d.head.y) <= d.head.r;
      const b = d.body, inBody = b && lx >= b.x && lx <= b.x + b.w && ly >= b.y && ly <= b.y + b.h;
      if (t.type === 'civilian' && (inHead || inBody)) return { t, lx, ly, zone: 'civilian' };
      if (t.type === 'bottle' && inBody) return { t, lx, ly, zone: 'bottle' };
      if (inHead) return { t, lx, ly, zone: 'head' };
      if (inBody) return { t, lx, ly, zone: 'chest' };
    }
    return null;
  },

  scoreHit({ t, lx, ly, zone }, x, y) {
    const hole = () => {
      const h = this.add.image(lx - t.spec.w / 2, ly - t.spec.h, IMAGES.hole.key).setScale(0.55 / t.lane.scale);
      t.c.add(h);
    };
    if (zone === 'paper') { hole(); this.floatText(x, y, 'paper', '#d8ccb0'); return; }
    const pts = zone === 'bull' ? POINTS.bull : zone === 'inner' ? POINTS.inner : zone === 'outer' ? POINTS.outer
      : zone === 'head' ? POINTS.head : zone === 'chest' ? POINTS.chest : zone === 'bottle' ? POINTS.bottle : POINTS.civilian;
    this.score += pts;
    const labels = { bull: 'BULLSEYE!', head: 'HEADSHOT!', bottle: 'SMASH!', civilian: 'CIVILIAN!' };
    if (zone === 'civilian') {
      this.civilians += 1; playRangeSound(this, 'buzz'); this.cameras.main.flash(160, 140, 30, 20);
    } else {
      this.hits += 1; if (zone === 'bull') this.bulls += 1;
      if (zone === 'bull' || zone === 'head') playRangeSound(this, 'ding');
    }
    this.floatText(x, y, `${pts > 0 ? '+' : ''}${pts}${labels[zone] ? `  ${labels[zone]}` : ''}`, pts > 0 ? (pts >= 10 ? '#ffd45a' : '#f2e6b0') : '#ff6a50');
    if (zone === 'bottle') { this.shatter(t); return; }
    hole(); this.dropTarget(t, 220);
  },

  shatter(t) {
    playRangeSound(this, 'glass');
    const cx = t.c.x, cy = t.c.y - t.spec.h * t.lane.scale * 0.5;
    for (let i = 0; i < 14; i++) {
      const s = this.add.rectangle(cx, cy, rand(4, 10), rand(6, 16), Math.random() < 0.8 ? 0x4f8f4f : 0xe9dfc0).setDepth(t.c.depth + 1).setRotation(rand(0, 3));
      this.roundObjects.push(s);
      this.tweens.add({ targets: s, x: cx + rand(-110, 110), y: cy + rand(30, 120), angle: rand(-360, 360), alpha: 0,
        duration: rand(450, 750), ease: 'Quad.Out', onComplete: () => s.destroy() });
    }
    t.alive = false; t.c.destroy();
  },

  missMark(x, y) {
    if (y > BOOTH_TOP) return;                            // hit the booth - nothing to see
    const h = this.add.image(x, y, IMAGES.hole.key).setDepth(4).setScale(0.5);
    const puff = this.add.circle(x, y, 6, 0xcbbfa6, 0.7).setDepth(4);
    this.roundObjects.push(h, puff);
    this.tweens.add({ targets: puff, radius: 26, alpha: 0, duration: 380, onComplete: () => puff.destroy() });
    this.tweens.add({ targets: h, alpha: 0, delay: 2600, duration: 800, onComplete: () => h.destroy() });
  },

  floatText(x, y, text, color) {
    const t = this.add.text(x, y - 30, text, { fontFamily: FONT.pixel, fontSize: '20px', color, stroke: '#140f0b', strokeThickness: 6 })
      .setOrigin(0.5).setDepth(160);
    this.roundObjects.push(t);
    this.tweens.add({ targets: t, y: y - 100, alpha: 0, duration: 900, ease: 'Quad.Out', onComplete: () => t.destroy() });
  }
};
