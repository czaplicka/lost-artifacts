import {
  dialogueText as __dialogueText
} from '../../dialogues/DialogueText.js';

import {
  FLAVOUR,
  OBSTACLES
} from '../../config/RoadTripTowns.js';

import {
  Z0,
  ROAD_HALF,
  DRAW_DIST,
  COIN_VALUE,
  rand,
  pick,
  clamp
} from './DriveShared.js';

const ROAD_STYLE = Object.freeze({
  grassBandLength: 38,
  asphaltBandLength: 18,
  dashPeriod: 28,
  dashLength: 12,
  shoulderBandLength: 14,
  postSpacing: 72
});

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

    const {
      W,
      H,
      horizonY: hz,
      step,
      rowCount: n,
      biome: B
    } = this;

    const span = H - hz;

    g.clear();
    g.fillStyle(B.grassA, 1);
    g.fillRect(0, hz, W, span);

    let dx = 0;
    let x = 0;

    for (let i = n - 1; i >= 0; i--) {
      const y = hz + i * step;
      const u = Math.max(
        0.02,
        (i * step + step * 0.5) / span
      );

      const wz = this.pos + Z0 / u;

      dx += this.curveAt(wz) * this.curveK;
      x += dx;

      const hw = u * W * ROAD_HALF;
      const cx = W * 0.5 + x - this.playerX * hw;
      const rowHeight = step + 1;

      this.rowCx[i] = cx;

      const detail = clamp((u - 0.035) / 0.16, 0, 1);

      const grassBand = u > 0.055
        ? Math.floor(wz / ROAD_STYLE.grassBandLength) & 1
        : 0;

      if (grassBand) {
        g.fillStyle(B.grassB, detail * 0.6);
        g.fillRect(0, y, W, rowHeight);
      }

      // Narrow gravel shoulder between asphalt and terrain.
      const gravel = hw * 0.085;

      g.fillStyle(B.rumbleB, 0.45);
      g.fillRect(
        cx - hw - gravel,
        y,
        hw * 2 + gravel * 2,
        rowHeight
      );

      const asphaltBand = u > 0.055
        ? Math.floor(wz / ROAD_STYLE.asphaltBandLength) & 1
        : 0;

      g.fillStyle(asphaltBand ? B.roadA : B.roadB, 1);
      g.fillRect(cx - hw, y, hw * 2, rowHeight);

      // Subtle tyre-worn strips, fixed to the road surface.
      if (u > 0.065) {
        g.fillStyle(0x000000, 0.045 * detail);

        const trackWidth = hw * 0.115;

        for (const offset of [-0.68, -0.3, 0.3, 0.68]) {
          g.fillRect(
            cx + hw * offset - trackWidth / 2,
            y,
            trackWidth,
            rowHeight
          );
        }
      }

      if (u > 0.05) {
        const edgeWidth = Math.max(1, hw * 0.016);
        const edgeX = hw * 0.92;

        g.fillStyle(B.line, 0.45 + detail * 0.55);

        g.fillRect(
          cx - edgeX - edgeWidth / 2,
          y,
          edgeWidth,
          rowHeight
        );

        g.fillRect(
          cx + edgeX - edgeWidth / 2,
          y,
          edgeWidth,
          rowHeight
        );

        const dashPhase =
          ((wz % ROAD_STYLE.dashPeriod) +
            ROAD_STYLE.dashPeriod) %
          ROAD_STYLE.dashPeriod;

        if (dashPhase < ROAD_STYLE.dashLength) {
          const centerWidth = Math.max(1, hw * 0.022);

          g.fillStyle(B.line, 0.5 + detail * 0.5);
          g.fillRect(
            cx - centerWidth / 2,
            y,
            centerWidth,
            rowHeight
          );
        }

        // Small outer edge accents, not a broad racing kerb.
        const shoulderBand =
          Math.floor(wz / ROAD_STYLE.shoulderBandLength) & 1;

        if (shoulderBand && u > 0.09) {
          const accentWidth = Math.max(1, hw * 0.018);

          g.fillStyle(B.rumbleA, 0.65 * detail);
          g.fillRect(
            cx - hw - accentWidth,
            y,
            accentWidth,
            rowHeight
          );
          g.fillRect(
            cx + hw,
            y,
            accentWidth,
            rowHeight
          );
        }
      }
    }

    this.drawRoadsidePosts();
  },

  drawRoadsidePosts() {
    const {
      W,
      H,
      horizonY: hz,
      rowCount: n,
      step
    } = this;

    const g = this.roadGfx;
    const span = H - hz;

    const spacing = ROAD_STYLE.postSpacing;
    const minDistance = Math.max(35, this.cullDz);

    const first = Math.ceil(
      (this.pos + minDistance) / spacing
    ) * spacing;

    const far = Math.min(
      this.pos + DRAW_DIST,
      this.L - 100
    );

    const last = Math.floor(far / spacing) * spacing;

    // Paint distant posts first.
    for (let z = last; z >= first; z -= spacing) {
      const dz = z - this.pos;
      const u = Z0 / dz;

      if (u < 0.035) continue;

      const y = hz + u * span;

      const index = clamp(
        Math.floor((y - hz) / step),
        0,
        n - 1
      );

      const cx = this.rowCx[index];
      const hw = u * W * ROAD_HALF;

      const fogStrength = this.weather === 'fog' ? 5 : 13;
      const alpha = clamp((u - 0.03) * fogStrength, 0, 1);

      if (alpha <= 0.01) continue;

      const height = Math.max(2, u * H * 0.19);
      const width = Math.max(1, u * W * 0.009);

      for (const side of [-1, 1]) {
        const px = cx + side * hw * 1.2;

        if (px < -width || px > W + width) continue;

        g.fillStyle(0x000000, alpha * 0.16);
        g.fillRect(
          px - width,
          y - 1,
          width * 2.8,
          Math.max(1, height * 0.06)
        );

        g.fillStyle(0xe3dfc8, alpha);
        g.fillRect(
          px - width / 2,
          y - height,
          width,
          height
        );

        g.fillStyle(0x252932, alpha);
        g.fillRect(
          px - width / 2,
          y - height * 0.84,
          width,
          height * 0.28
        );

        g.fillStyle(
          side < 0 ? 0xf0d9a0 : 0xdf795c,
          alpha
        );

        g.fillRect(
          px - width * 0.3,
          y - height * 0.79,
          width * 0.6,
          height * 0.12
        );
      }
    }
  },

  addObject(def) {
    const o = {
      kind: 'decor',
      x: 0,
      z: 0,
      s: 1,
      r: 0,
      vx: 0,
      done: false,
      sprite: null,
      flip: false,
      def: null,
      ...def
    };

    if (!o.sprite) {
      o.sprite = this.add.image(0, 0, o.key)
        .setOrigin(0.5, 1)
        .setVisible(false);

      o.sprite.setFlipX(Boolean(o.flip));
    } else {
      o.sprite.setVisible(false);
    }

    this.objects.push(o);
    return o;
  },

  makeBoard(message) {
    const c = this.add.container(0, 0);
    const g = this.add.graphics();

    g.fillStyle(0x3b2d20, 1);
    g.fillRect(-120, -70, 14, 70);
    g.fillRect(106, -70, 14, 70);

    g.fillStyle(0xf1e4bd, 1);
    g.fillRect(-180, -230, 360, 165);

    g.lineStyle(8, 0x3b2d20, 1);
    g.strokeRect(-180, -230, 360, 165);

    const t = this.add.text(0, -148, message, {
      fontFamily: 'PressStart2P',
      fontSize: '15px',
      color: '#2a1d12',
      align: 'center',
      wordWrap: { width: 330 },
      lineSpacing: 6
    }).setOrigin(0.5);

    c.add([g, t]);
    return c;
  },

  makeGate(message) {
    const { W, H } = this;
    const c = this.add.container(0, 0);
    const g = this.add.graphics();

    g.fillStyle(0x2b2118, 1);
    g.fillRect(
      -W * 0.52, -H * 0.5,
      W * 0.06, H * 0.5
    );
    g.fillRect(
      W * 0.46, -H * 0.5,
      W * 0.06, H * 0.5
    );

    g.fillStyle(0x3b2d20, 1);
    g.fillRect(
      -W * 0.54, -H * 0.58,
      W * 1.08, H * 0.14
    );

    g.lineStyle(5, 0xd4af37, 1);
    g.strokeRect(
      -W * 0.54, -H * 0.58,
      W * 1.08, H * 0.14
    );

    const t = this.add.text(
      0,
      -H * 0.51,
      message,
      {
        fontFamily: 'PressStart2P',
        fontSize: `${Math.round(H * 0.03)}px`,
        color: '#f4e7c1',
        align: 'center',
        wordWrap: { width: W },
        lineSpacing: 10
      }
    ).setOrigin(0.5);

    c.add([g, t]);
    return c;
  },

  spawnAhead() {
    const horizon = this.pos + DRAW_DIST;
    const L = this.L;

    while (
      this.nextDecorZ < horizon &&
      this.nextDecorZ < L - 60
    ) {
      this.spawnDecor(this.nextDecorZ);
      this.nextDecorZ += rand(55, 110);
    }

    if (!this.startSignSpawned) {
      this.startSignSpawned = true;

      this.addObject({
        kind: 'billboard',
        z: 160,
        x: -1.9,
        s: 2.2,
        sprite: this.makeBoard(this.fromTown.leaving)
      });
    }

    while (
      this.nextBillboardZ < horizon &&
      this.nextBillboardZ < L - 400
    ) {
      const pool = [
        ...FLAVOUR.billboards,
        ...(this.town.signs || [])
      ];

      this.addObject({
        kind: 'billboard',
        z: this.nextBillboardZ,
        x: pick([-1, 1]) * rand(1.8, 2.2),
        s: 2.2,
        sprite: this.makeBoard(pick(pool))
      });

      this.nextBillboardZ += rand(650, 1000);
    }

    while (
      this.nextObstacleZ < horizon &&
      this.nextObstacleZ < L - 350
    ) {
      this.spawnEvent(this.nextObstacleZ);
      this.nextObstacleZ += rand(300, 520);
    }

    while (
      this.nextCamZ < horizon &&
      this.nextCamZ < L - 500
    ) {
      this.addObject({
        kind: 'cam',
        key: 'drv_cam',
        z: this.nextCamZ,
        x: pick([-1, 1]) * 1.55,
        s: 2.6
      });

      this.nextCamZ += rand(1300, 2100);
    }

    if (!this.gateSpawned && L < horizon) {
      this.gateSpawned = true;

      this.gate = this.addObject({
        kind: 'gate',
        z: L,
        x: 0,
        s: 1,
        sprite: this.makeGate(this.town.gate)
      });
    }
  },

  spawnDecor(z) {
    for (const side of [-1, 1]) {
      if (Math.random() < 0.3) continue;

      const [key, s] = pick(this.biome.decor);

      this.addObject({
        kind: 'decor',
        key,
        z: z + rand(-12, 12),
        x: side * (1.45 + rand(0, 1.9)),
        s,
        flip: Math.random() < 0.5
      });
    }
  },

  spawnEvent(z) {
    const roll = Math.random();

    if (roll < 0.55) {
      const pool = OBSTACLES.filter(
        o =>
          o.biomes.includes('all') ||
          o.biomes.includes(this.biome.id)
      );

      const lanes = [-0.62, -0.2, 0.2, 0.62];

      const first = this.spawnObstacle(
        pick(pool),
        z,
        pick(lanes)
      );

      if (Math.random() < 0.3 && first) {
        const other = Math.sign(first.x)
          ? -Math.sign(first.x)
          : 1;

        this.spawnObstacle(
          pick(pool),
          z + rand(-20, 20),
          other * pick([0.55, 0.65])
        );
      }
    } else if (roll < 0.8) {
      this.addObject({
        kind: 'pickup',
        type: 'coffee',
        key: 'drv_coffee',
        z,
        x: pick([-0.65, -0.2, 0.2, 0.65]),
        s: 2.7,
        r: 0.34
      });
    } else {
      const lane = pick([-0.6, -0.2, 0.2, 0.6]);
      const count = 3 + Math.floor(Math.random() * 3);

      for (let i = 0; i < count; i++) {
        this.addObject({
          kind: 'pickup',
          type: 'coin',
          key: 'drv_coin',
          z: z + i * 26,
          x: lane,
          s: 2.1,
          r: 0.34
        });
      }
    }
  },

  spawnObstacle(def, z, x) {
    const o = this.addObject({
      kind: 'obstacle',
      key: def.key,
      z,
      x,
      s: def.s,
      r: def.r,
      def
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
    const {
      W,
      H,
      horizonY: hz,
      step,
      rowCount: n
    } = this;

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

      const u = o.kind === 'gate'
        ? Math.min(1, Z0 / dz)
        : Z0 / dz;

      const y = hz + u * span;

      const idx = clamp(
        Math.floor((y - hz) / step),
        0,
        n - 1
      );

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

      if (
        !o.done &&
        dz <= this.hitDz &&
        this.state === 'driving'
      ) {
        o.done = true;

        const lat = Math.abs(o.x - this.playerX);

        if (
          o.kind === 'obstacle' &&
          lat < o.r &&
          this.invuln <= 0
        ) {
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

    this.floatText(
      __dialogueText(
        'scenes/DriveScene.js',
        't_38ab3e1e1401a1c43009'
      ),
      '#ff6b5a'
    );

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
      onComplete: () => {
        if (sprite.scene) sprite.destroy();
      }
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

      this.floatText(
        __dialogueText(
          'scenes/DriveScene.js',
          't_a7f35f3fb892dd17776e'
        ),
        '#8cff9a'
      );

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
      onComplete: () => {
        if (sprite.scene) sprite.destroy();
      }
    });
  }
};