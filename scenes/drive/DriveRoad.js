import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { FLAVOUR, OBSTACLES } from '../../config/RoadTripTowns.js';
import { Z0, ROAD_HALF, DRAW_DIST, COIN_VALUE, rand, pick, clamp } from './DriveShared.js';

export const DriveRoad = {
  curveAt(d) {
    const L = this.L;

    const fade =
      clamp((d - 250) / 400, 0, 1) *
      clamp((L - d + 100) / 500, 0, 1);

    const c =
      Math.sin(d * 0.0011 + this.seed) * 0.9 +
      Math.sin(d * 0.0029 + this.seed * 2.1) * 0.5;

    return c * this.biome.curve * fade;
  },

  drawRoad() {
    const g = this.roadGfx;
    const { W, H, horizonY: hz, step, rowCount: n, biome: B } = this;
    const span = H - hz;

    g.clear();
    g.fillStyle(B.grassA, 1);
    g.fillRect(0, hz, W, span);

    let dx = 0;
    let x = 0;

    for (let i = n - 1; i >= 0; i--) {
      const y = hz + i * step;
      const u = Math.max(0.02, (i * step + step * 0.5) / span);
      const wz = this.pos + Z0 / u;

      dx += this.curveAt(wz) * this.curveK;
      x += dx;

      const hw = u * W * ROAD_HALF;
      const cx = W * 0.5 + x - this.playerX * hw;

      this.rowCx[i] = cx;

      const band = u > 0.07 ? (Math.floor(wz / 60) & 1) : 0;

      if (band) {
        g.fillStyle(B.grassB, 1);
        g.fillRect(0, y, W, step + 1);
      }

      const rw = hw * 0.09;

      g.fillStyle(band ? B.rumbleA : B.rumbleB, 1);
      g.fillRect(cx - hw - rw, y, rw, step + 1);
      g.fillRect(cx + hw, y, rw, step + 1);

      g.fillStyle(band ? B.roadA : B.roadB, 1);
      g.fillRect(cx - hw, y, hw * 2, step + 1);

      if (u > 0.05) {
        const lw = Math.max(1, hw * 0.025);

        g.fillStyle(B.line, 1);
        g.fillRect(cx - hw * 0.92 - lw / 2, y, lw, step + 1);
        g.fillRect(cx + hw * 0.92 - lw / 2, y, lw, step + 1);

        if (band) {
          g.fillRect(cx - lw / 2, y, lw, step + 1);
        }
      }
    }
  },

  addObject(def) {
    const o = {
      kind: 'decor', x: 0, z: 0, s: 1, r: 0, vx: 0,
      done: false, sprite: null, flip: false, def: null,
      ...def
    };

    if (!o.sprite) {
      o.sprite = this.add.image(0, 0, o.key).setOrigin(0.5, 1).setVisible(false);
      o.sprite.setFlipX(Boolean(o.flip));
    } else {
      o.sprite.setVisible(false);
    }

    this.objects.push(o);
    return o;
  },

  makeBoard(text) {
    const c = this.add.container(0, 0);
    const g = this.add.graphics();

    g.fillStyle(0x3b2d20, 1);
    g.fillRect(-120, -70, 14, 70); g.fillRect(106, -70, 14, 70);
    g.fillStyle(0xf1e4bd, 1); g.fillRect(-180, -230, 360, 165);
    g.lineStyle(8, 0x3b2d20, 1); g.strokeRect(-180, -230, 360, 165);

    const t = this.add.text(0, -148, text, {
      fontFamily: 'PressStart2P', fontSize: '15px', color: '#2a1d12',
      align: 'center', wordWrap: { width: 330 }, lineSpacing: 6
    }).setOrigin(0.5);

    c.add([g, t]);
    return c;
  },

  makeGate(text) {
    const { W, H } = this;
    const c = this.add.container(0, 0);
    const g = this.add.graphics();

    g.fillStyle(0x2b2118, 1);
    g.fillRect(-W * 0.52, -H * 0.5, W * 0.06, H * 0.5);
    g.fillRect(W * 0.46, -H * 0.5, W * 0.06, H * 0.5);
    g.fillStyle(0x3b2d20, 1);
    g.fillRect(-W * 0.54, -H * 0.58, W * 1.08, H * 0.14);
    g.lineStyle(5, 0xd4af37, 1);
    g.strokeRect(-W * 0.54, -H * 0.58, W * 1.08, H * 0.14);

    const t = this.add.text(0, -H * 0.51, text, {
      fontFamily: 'PressStart2P', fontSize: `${Math.round(H * 0.03)}px`,
      color: '#f4e7c1', align: 'center', wordWrap: { width: W }, lineSpacing: 10
    }).setOrigin(0.5);

    c.add([g, t]);
    return c;
  },

  spawnAhead() {
    const horizon = this.pos + DRAW_DIST;
    const L = this.L;

    while (this.nextDecorZ < horizon && this.nextDecorZ < L - 60) {
      this.spawnDecor(this.nextDecorZ);
      this.nextDecorZ += rand(55, 110);
    }

    if (!this.startSignSpawned) {
      this.startSignSpawned = true;

      this.addObject({
        kind: 'billboard', z: 160, x: -1.9, s: 2.2,
        sprite: this.makeBoard(this.fromTown.leaving)
      });
    }

    while (this.nextBillboardZ < horizon && this.nextBillboardZ < L - 400) {
      const pool = [...FLAVOUR.billboards, ...(this.town.signs || [])];

      this.addObject({
        kind: 'billboard',
        z: this.nextBillboardZ,
        x: pick([-1, 1]) * rand(1.8, 2.2),
        s: 2.2,
        sprite: this.makeBoard(pick(pool))
      });

      this.nextBillboardZ += rand(650, 1000);
    }

    while (this.nextObstacleZ < horizon && this.nextObstacleZ < L - 350) {
      this.spawnEvent(this.nextObstacleZ);
      this.nextObstacleZ += rand(300, 520);
    }

    while (this.nextCamZ < horizon && this.nextCamZ < L - 500) {
      this.addObject({
        kind: 'cam', key: 'drv_cam', z: this.nextCamZ,
        x: pick([-1, 1]) * 1.55, s: 2.6
      });

      this.nextCamZ += rand(1300, 2100);
    }

    if (!this.gateSpawned && L < horizon) {
      this.gateSpawned = true;

      this.gate = this.addObject({
        kind: 'gate', z: L, x: 0, s: 1,
        sprite: this.makeGate(this.town.gate)
      });
    }
  },

  spawnDecor(z) {
    for (const side of [-1, 1]) {
      if (Math.random() < 0.3) {
        continue;
      }

      const [key, s] = pick(this.biome.decor);

      this.addObject({
        kind: 'decor', key, z: z + rand(-12, 12),
        x: side * (1.45 + rand(0, 1.9)), s,
        flip: Math.random() < 0.5
      });
    }
  },

  spawnEvent(z) {
    const roll = Math.random();

    if (roll < 0.55) {
      const pool = OBSTACLES.filter(
        o => o.biomes.includes('all') || o.biomes.includes(this.biome.id)
      );

      const lanes = [-0.62, -0.2, 0.2, 0.62];
      const first = this.spawnObstacle(pick(pool), z, pick(lanes));

      if (Math.random() < 0.3 && first) {
        const other = Math.sign(first.x) ? -Math.sign(first.x) : 1;
        this.spawnObstacle(pick(pool), z + rand(-20, 20), other * pick([0.55, 0.65]));
      }
    } else if (roll < 0.8) {
      this.addObject({
        kind: 'pickup', type: 'coffee', key: 'drv_coffee',
        z, x: pick([-0.65, -0.2, 0.2, 0.65]), s: 2.7, r: 0.34
      });
    } else {
      const lane = pick([-0.6, -0.2, 0.2, 0.6]);
      const count = 3 + Math.floor(Math.random() * 3);

      for (let i = 0; i < count; i++) {
        this.addObject({
          kind: 'pickup', type: 'coin', key: 'drv_coin',
          z: z + i * 26, x: lane, s: 2.1, r: 0.34
        });
      }
    }
  },

  spawnObstacle(def, z, x) {
    const o = this.addObject({
      kind: 'obstacle', key: def.key, z, x, s: def.s, r: def.r, def
    });

    if (def.vx > 0) {
      const side = Math.random() < 0.5 ? -1 : 1;
      o.x = side * 1.15;
      o.vx = -side * def.vx;
      o.sprite.setFlipX(o.vx < 0);
    }

    return o;
  },

  removeObject(index) {
    const o = this.objects[index];

    if (o?.sprite?.scene) {
      o.sprite.destroy();
    }

    this.objects.splice(index, 1);
  },

  updateObjects(dt) {
    const { W, H, horizonY: hz, step, rowCount: n } = this;
    const span = H - hz;

    for (let k = this.objects.length - 1; k >= 0; k--) {
      const o = this.objects[k];

      if (!o.sprite || !o.sprite.scene) {
        this.objects.splice(k, 1);
        continue;
      }

      const dz = o.z - this.pos;

      if (o.kind !== 'gate' && dz < this.cullDz) {
        this.removeObject(k);
        continue;
      }

      if (dz > DRAW_DIST + 200) {
        o.sprite.setVisible(false);
        continue;
      }

      if (o.vx && dz < 650) {
        o.x += o.vx * dt;
      }

      if (o.kind === 'gate' && dz <= 0) {
        o.sprite.setVisible(false);
        continue;
      }
      const u = o.kind === 'gate' ? Math.min(1, Z0 / dz) : Z0 / dz;
      const y = hz + u * span;
      const idx = clamp(Math.floor((y - hz) / step), 0, n - 1);
      const hw = u * W * ROAD_HALF;
      const sx = this.rowCx[idx] + o.x * hw;

      const fogMul = this.weather === 'fog' ? 4 : 12;
      const alpha = clamp((u - 0.02) * fogMul, 0, 1);

      o.sprite.setVisible(alpha > 0.02);
      o.sprite.setPosition(sx, y);
      o.sprite.setDepth(20 + u * 100);
      o.sprite.setAlpha(alpha);

      if (o.kind === 'gate') {
        o.sprite.setScale(u);
      } else {
        o.sprite.setScale(u * this.sx * o.s);
      }

      if (!o.done && dz <= this.hitDz && this.state === 'driving') {
        o.done = true;
        const lat = Math.abs(o.x - this.playerX);

        if (o.kind === 'obstacle' && lat < o.r && this.invuln <= 0) {
          this.onHit(o);
        } else if (o.kind === 'pickup' && lat < o.r) {
          this.onPickup(o, k);
        } else if (o.kind === 'cam') {
          this.onCam();
        }
      }
    }
  },

  onHit(o) {
    this.stats.hits += 1;
    this.invuln = 0.8;
    this.speedMul *= 0.3;

    this.cameras.main.shake(260, 0.012);
    this.cameras.main.flash(160, 255, 70, 40);

    this.say(pick(o.def.hitLines), 3200, true);
    this.floatText(__dialogueText("scenes/DriveScene.js", "t_38ab3e1e1401a1c43009"), '#ff6b5a');
    this.refreshStats();

    const sprite = o.sprite;
    o.sprite = null;

    this.createTrackedTween({
      targets: sprite,
      y: sprite.y - 160 * this.U,
      x: sprite.x + rand(-200, 200) * this.U,
      angle: rand(-420, 420),
      alpha: 0,
      duration: 700,
      onComplete: () => sprite.scene && sprite.destroy()
    });

    this.removeTrackedTween(this.dinoBounce);
    this.dino.y = this.dinoBaseY;
    this.dinoBounce = this.createTrackedTween({
      targets: this.dino,
      y: this.dinoBaseY - 26 * this.U,
      duration: 110,
      yoyo: true
    });
  },

  onPickup(o) {
    const sprite = o.sprite;
    o.sprite = null;

    if (o.type === 'coffee') {
      this.stats.coffees += 1;
      this.coffeeUntil = this.clock + 2.5;
      this.floatText(__dialogueText("scenes/DriveScene.js", "t_a7f35f3fb892dd17776e"), '#8cff9a');
      this.say(pick(FLAVOUR.dinoCoffee), 2400);
    } else {
      this.stats.coins += COIN_VALUE;
      this.floatText(`+$${COIN_VALUE}`);

      if (this.stats.coins === COIN_VALUE) {
        this.say(pick(FLAVOUR.dinoCoin), 2200);
      }
    }

    this.refreshStats();

    this.createTrackedTween({
      targets: sprite,
      y: sprite.y - 90 * this.U,
      scale: sprite.scale * 1.6,
      alpha: 0,
      duration: 260,
      onComplete: () => sprite.scene && sprite.destroy()
    });
  }
};
