import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { FLAVOUR } from '../../config/RoadTripTowns.js';
import { BASE_SPEED, pick, clamp, poly } from './DriveShared.js';

const text = key => __dialogueText('scenes/DriveScene.js', key);
const smooth = (a, b, rate, dt) =>
  a + (b - a) * (1 - Math.exp(-rate * dt));

export const DriveCockpit = {
  buildDash() {
    const { W, H, U, dashTop: top } = this;

    this._cockpitMotion = {
      previousSpeed: 0,
      acceleration: 0,
      lean: 0,
      pitch: 0,
      needle: 0,
      phase: 0
    };

    const dashKey = `drv_dash_v2_${Math.round(W)}x${Math.round(H)}`;

    this.gen(dashKey, Math.round(W), Math.round(H), g => {
      g.fillStyle(0x101015);
      g.fillRect(0, 0, W, H * 0.085);
      g.fillStyle(0x353039);
      g.fillRect(0, H * 0.085, W, H * 0.006);

      g.fillStyle(0x111116);
      poly(g, [
        [0, 0], [W * 0.19, 0],
        [W * 0.075, top + H * 0.01],
        [0, top + H * 0.06]
      ]);
      poly(g, [
        [W, 0], [W * 0.86, 0],
        [W * 0.95, top], [W, top + H * 0.05]
      ]);

      g.lineStyle(Math.max(1, 3 * U), 0x4b4140);
      g.lineBetween(
        W * 0.19, 0,
        W * 0.075, top + H * 0.01
      );
      g.lineBetween(W * 0.86, 0, W * 0.95, top);

      g.fillStyle(0xffffff, 0.025);
      poly(g, [
        [W * 0.27, H * 0.09],
        [W * 0.43, H * 0.09],
        [W * 0.31, top],
        [W * 0.15, top]
      ]);

      g.fillStyle(0x141217);
      g.fillRect(
        W * 0.665, H * 0.085,
        W * 0.02, H * 0.03
      );
      g.fillRoundedRect(
        W * 0.56, H * 0.105,
        W * 0.22, H * 0.075, 10 * U
      );
      g.fillStyle(0x273139);
      g.fillRoundedRect(
        W * 0.568, H * 0.113,
        W * 0.204, H * 0.059, 6 * U
      );
      g.fillStyle(0xffffff, 0.045);
      g.fillRect(
        W * 0.58, H * 0.12,
        W * 0.18, H * 0.012
      );

      g.fillStyle(0x241e20);
      poly(g, [
        [0, top + H * 0.06],
        [W * 0.075, top + H * 0.01],
        [W * 0.35, top - H * 0.005],
        [W * 0.65, top - H * 0.012],
        [W * 0.95, top],
        [W, top + H * 0.05], [W, H], [0, H]
      ]);

      g.fillStyle(0x17151a);
      g.fillRect(0, H * 0.84, W, H * 0.16);

      g.lineStyle(Math.max(1, 3 * U), 0x695046);
      g.lineBetween(
        W * 0.075, top + H * 0.01,
        W * 0.35, top - H * 0.005
      );
      g.lineBetween(
        W * 0.35, top - H * 0.005,
        W * 0.65, top - H * 0.012
      );
      g.lineBetween(
        W * 0.65, top - H * 0.012,
        W * 0.95, top
      );

      g.fillStyle(0x090c10);
      g.fillRoundedRect(
        W * 0.265, top + H * 0.005,
        W * 0.28, H * 0.15, 12 * U
      );
      g.lineStyle(Math.max(1, 2 * U), 0x67584b);
      g.strokeRoundedRect(
        W * 0.265, top + H * 0.005,
        W * 0.28, H * 0.15, 12 * U
      );

      for (const gx of [W * 0.33, W * 0.48]) {
        const gy = top + H * 0.07;
        const radius = H * 0.05;

        g.fillStyle(0x141c23);
        g.fillCircle(gx, gy, radius);
        g.lineStyle(Math.max(1, 2 * U), 0xa18f70);
        g.strokeCircle(gx, gy, radius);

        for (let i = 0; i <= 10; i++) {
          const angle = Phaser.Math.DegToRad(135 + 27 * i);
          const major = i % 2 === 0;

          g.lineStyle(
            Math.max(1, (major ? 2 : 1) * U),
            i >= 9 ? 0xe68162 : 0xc7cab5
          );
          g.lineBetween(
            gx + Math.cos(angle) * radius * (major ? 0.72 : 0.82),
            gy + Math.sin(angle) * radius * (major ? 0.72 : 0.82),
            gx + Math.cos(angle) * radius * 0.93,
            gy + Math.sin(angle) * radius * 0.93
          );
        }
      }

      const ix = W * 0.595;
      const iy = top + H * 0.012;
      const iw = W * 0.175;
      const ih = H * 0.2;

      g.fillStyle(0x0c0d10);
      g.fillRoundedRect(ix, iy, iw, ih, 8 * U);
      g.lineStyle(Math.max(1, 2 * U), 0x67584b);
      g.strokeRoundedRect(ix, iy, iw, ih, 8 * U);

      g.fillStyle(0x101e18);
      g.fillRoundedRect(
        ix + 8 * U, iy + 8 * U,
        iw - 16 * U, ih * 0.67, 4 * U
      );

      for (let i = 0; i < 6; i++) {
        g.fillStyle(0x373332);
        g.fillRoundedRect(
          ix + 12 * U + i * ((iw - 24 * U) / 6),
          iy + ih * 0.79,
          (iw - 24 * U) / 6 - 4 * U,
          ih * 0.12, 2 * U
        );
      }

      g.fillStyle(0x18171b);
      g.fillRoundedRect(
        W * 0.8, H * 0.86,
        W * 0.03, H * 0.14, 8 * U
      );
      g.fillStyle(0x49403c);
      g.fillCircle(W * 0.815, H * 0.86, W * 0.022);
    });

    this.add.image(0, 0, dashKey)
      .setOrigin(0).setDepth(210);

    this.gaugeGfx = this.add.graphics().setDepth(212);

    const label = (x, y, value, size, color) =>
      this.add.text(x, y, value, {
        fontFamily: 'PressStart2P',
        fontSize: this.px(size),
        color,
        align: 'center'
      }).setOrigin(0.5).setDepth(213);

    this.speedText = label(
      W * 0.405, top + H * 0.06, '0', 23, '#f5e6bb'
    );

    label(
      W * 0.405, top + H * 0.092,
      'KM/H', 8, '#a59c83'
    );
    label(
      W * 0.33, top + H * 0.132,
      'SPEED', 8, '#a59c83'
    );
    label(
      W * 0.48, top + H * 0.132,
      'TRIP', 8, '#a59c83'
    );

    const ix = W * 0.595 + 16 * U;
    const iy = top + H * 0.012 + 16 * U;
    const iw = W * 0.175 - 32 * U;

    this.rKm = this.add.text(ix, iy, '', {
      fontFamily: 'PressStart2P',
      fontSize: this.px(21),
      color: '#b6e8ac'
    }).setDepth(213);

    this.rStation = this.add.text(ix, iy + 39 * U, '', {
      fontFamily: 'PressStart2P',
      fontSize: this.px(9),
      color: '#e9d27a',
      wordWrap: { width: iw }
    }).setDepth(213);

    this.rLine = this.add.text(ix, iy + 62 * U, '', {
      fontFamily: 'SpecialElite',
      fontSize: this.px(15),
      color: '#a9c8a4',
      wordWrap: { width: iw }
    }).setDepth(213);

    this.updateStation(false);

    this.radioZone = this.add.zone(
      W * 0.6825, top + H * 0.112,
      W * 0.175, H * 0.2
    ).setDepth(217).setInteractive({ useHandCursor: true });

    this.radioZone.on('pointerdown', () => {
      if (this.state !== 'driving') return;
      this.uiHeld = true;
      this.updateStation(true);
    });

    this.dice = this.add.container(
      W * 0.675, H * 0.115
    ).setDepth(209).setScale(U);

    const rope = this.add.graphics();
    rope.lineStyle(3, 0xc6c0ad);
    rope.lineBetween(0, 0, -26, 105);
    rope.lineBetween(0, 0, 22, 128);

    this.dice.add([
      rope,
      this.add.image(-30, 140, 'drv_die')
        .setScale(1.15).setAngle(-12),
      this.add.image(26, 160, 'drv_die')
        .setScale(1).setAngle(14)
    ]);

    const dinoScale = (H * 0.11) / 130;

    this.dinoBaseY = top + H * 0.012;

    this.dino = this.add.image(
      W * 0.52, this.dinoBaseY, 'drv_dino'
    ).setOrigin(0.5, 1)
      .setScale(dinoScale)
      .setDepth(214)
      .setInteractive({ useHandCursor: true });

    this.dino.on('pointerdown', () => {
      if (this.state !== 'driving') return;

      this.uiHeld = true;
      this.say(pick(FLAVOUR.dinoClick), 2400, true);

      this.removeTrackedTween(this.dinoSquash);
      this.dino.setScale(dinoScale);

      this.dinoSquash = this.createTrackedTween({
        targets: this.dino,
        scaleY: dinoScale * 1.15,
        scaleX: dinoScale * 0.92,
        duration: 90,
        yoyo: true
      });
    });

    this.wheel = this.add.image(
      W * 0.4, H * 1.04, `drv_wheel_${this.wheelR}`
    ).setDepth(220);

    this.buildAutopilotButton();
  },

  buildAutopilotButton() {
    const { W, H, U, dashTop } = this;
    const x = W * 0.875;
    const y = dashTop + H * 0.115;
    const w = W * 0.1;
    const h = H * 0.075;

    this.autoGfx = this.add.graphics().setDepth(215);
    this.autoGfx.fillStyle(0x24252b);
    this.autoGfx.fillRoundedRect(
      x - w / 2, y - h / 2, w, h, 5 * U
    );
    this.autoGfx.lineStyle(Math.max(1, 2 * U), 0xb39b64);
    this.autoGfx.strokeRoundedRect(
      x - w / 2, y - h / 2, w, h, 5 * U
    );

    this.autoText = this.add.text(
      x, y, text('t_ecb1d5dcf3d13e4f3454'), {
        fontFamily: 'PressStart2P',
        fontSize: this.px(11),
        color: '#d4af37',
        align: 'center',
        lineSpacing: 6 * U
      }
    ).setOrigin(0.5).setDepth(216);

    this.autoGfx.setAlpha(0.3);
    this.autoText.setAlpha(0.3);

    this.autoZone = this.add.zone(x, y, w, h).setDepth(217);

    this.time.delayedCall(2000, () => {
      if (!this.autoZone?.scene || this._cleanupDone) return;

      this.autoGfx.setAlpha(1);
      this.autoText.setAlpha(1);
      this.autoZone.setInteractive({ useHandCursor: true });

      this.autoZone.on('pointerdown', () => {
        if (this.state !== 'driving') return;
        this.uiHeld = true;
        this.autopilot();
      });

      this.autoZone.on('pointerover', () => {
        if (this.state !== 'driving') return;
        this.say(text('t_eff86d8f257880ce4016'), 3200, true);
      });
    });
  },

  buildHud() {
    const { W, H, U } = this;

    this.hudBar = this.add.graphics().setDepth(230);

    this.add.text(
      W * 0.23, H * 0.03, this.fromTown.short, {
        fontFamily: 'PressStart2P',
        fontSize: this.px(13),
        color: '#f4e7c1'
      }
    ).setOrigin(0, 0.5).setDepth(231);

    this.add.text(
      W * 0.77, H * 0.03, this.town.short, {
        fontFamily: 'PressStart2P',
        fontSize: this.px(13),
        color: '#d4af37'
      }
    ).setOrigin(1, 0.5).setDepth(231);

    this.statsText = this.add.text(W / 2, H * 0.066, '', {
      fontFamily: 'PressStart2P',
      fontSize: this.px(11),
      color: '#afa891'
    }).setOrigin(0.5).setDepth(231);

    this.refreshStats();

    this.introText = this.add.text(
      W / 2, H * 0.22,
      'W / UP: GAS   S / DOWN / SPACE: BRAKE\n' +
      'A / D OR LEFT / RIGHT: STEER\n' +
      'MOUSE: HOLD AND DRAG TO STEER', {
        fontFamily: 'SpecialElite',
        fontSize: this.px(24),
        color: '#f4e7c1',
        backgroundColor: '#1a1618',
        align: 'center',
        lineSpacing: 5 * U,
        padding: { x: 18 * U, y: 12 * U },
        wordWrap: { width: W * 0.72 }
      }
    ).setOrigin(0.5).setDepth(240);

    this.createTrackedTween({
      targets: this.introText,
      alpha: 0,
      delay: 6500,
      duration: 800
    });
  },

  refreshStats() {
    const s = this.stats;

    this.statsText?.setText(
      `${text('t_b15a09a918a712a6fdb5')}${s.coffees}` +
      `${text('t_4dabc8fc0998bd184e87')}${s.coins}` +
      `${text('t_49f970bc616a0d881cc5')}${s.hits}` +
      `${text('t_acf6f855220fa82df1dd')}${s.fines}`
    );
  },

  drawHudBar(progress) {
    const { W, H, U } = this;
    const g = this.hudBar;
    const x0 = W * 0.4;
    const x1 = W * 0.6;
    const y = H * 0.03;

    g.clear();
    g.fillStyle(0x393335);
    g.fillRect(x0, y - 3 * U, x1 - x0, 6 * U);
    g.fillStyle(0xc1a360);
    g.fillRect(
      x0, y - 3 * U, (x1 - x0) * progress, 6 * U
    );

    const cx = x0 + (x1 - x0) * progress;

    g.fillStyle(0xf4e7c1);
    g.fillTriangle(
      cx, y - 10 * U,
      cx - 6 * U, y - 2 * U,
      cx + 6 * U, y - 2 * U
    );
  },

  clearDriveBubble() {
    const timer = this._bubbleTimer;
    this._bubbleTimer = null;
    timer?.remove(false);

    const bubble = this.bubble;
    this.bubble = null;
    this.bubbleUntil = 0;

    if (bubble) {
      this.killTrackedTweensOf(bubble);
      if (bubble.scene) bubble.destroy(true);
    }
  },

  say(message, ms = 2800, force = false) {
    if (
      this._cleanupDone ||
      this._destroyCleanupDone ||
      !this.dino?.scene
    ) return;

    if (!this.ready && !force) return;
    if (this.bubbleUntil > this.clock && !force) return;

    this.clearDriveBubble();

    const { W, H, U } = this;
    const pad = 14 * U;

    const t = this.add.text(0, 0, message, {
      fontFamily: 'SpecialElite',
      fontSize: this.px(22),
      color: '#2a1d12',
      align: 'center',
      wordWrap: { width: W * 0.3 }
    }).setOrigin(0.5, 1);

    const w = t.width + pad * 2;
    const h = t.height + pad * 2;

    const g = this.add.graphics();
    g.fillStyle(0xf6ecc8);
    g.fillRoundedRect(-w / 2, -h, w, h, 8 * U);
    g.lineStyle(Math.max(1, 3 * U), 0x3b2d20);
    g.strokeRoundedRect(-w / 2, -h, w, h, 8 * U);
    g.fillStyle(0xf6ecc8);
    g.fillTriangle(-10 * U, 0, 10 * U, 0, 0, 16 * U);

    t.setPosition(0, -pad);

    const x = clamp(this.dino.x, w / 2 + 10, W - w / 2 - 10);
    const y = this.dashTop - H * 0.02;

    const bubble = this.add.container(x, y, [g, t])
      .setDepth(300).setAlpha(0);

    this.bubble = bubble;
    this.bubbleUntil = this.clock + ms / 1000;

    this.createTrackedTween({
      targets: bubble,
      alpha: 1,
      duration: 120
    });

    this._bubbleTimer = this.time.delayedCall(ms, () => {
      if (
        this._cleanupDone ||
        this.bubble !== bubble ||
        !bubble.scene
      ) return;

      this._bubbleTimer = null;
      this.killTrackedTweensOf(bubble);

      this.createTrackedTween({
        targets: bubble,
        alpha: 0,
        duration: 250,
        onComplete: () => {
          if (this.bubble !== bubble) return;
          this.bubble = null;
          this.bubbleUntil = 0;
          if (bubble.scene) bubble.destroy(true);
        }
      });
    });
  },

  floatText(message, color = '#ffd84d') {
    const t = this.add.text(
      this.W / 2, this.dashTop - this.H * 0.08, message, {
        fontFamily: 'PressStart2P',
        fontSize: this.px(20),
        color,
        stroke: '#000000',
        strokeThickness: Math.max(1, 4 * this.U)
      }
    ).setOrigin(0.5).setDepth(260);

    this.createTrackedTween({
      targets: t,
      y: t.y - 70 * this.U,
      alpha: 0,
      duration: 900,
      onComplete: () => {
        if (t.scene) t.destroy();
      }
    });
  },

  updateStation(next) {
    if (next) {
      this.stationIndex =
        (this.stationIndex + 1) % FLAVOUR.radio.length;

      this.killTrackedTweensOf(this.rStation);
      this.killTrackedTweensOf(this.rLine);

      this.createTrackedTween({
        targets: [this.rStation, this.rLine],
        alpha: { from: 0.2, to: 1 },
        duration: 260
      });
    }

    const station = FLAVOUR.radio[this.stationIndex];

    this.rStation.setText(station.name);
    this.rLine.setText(station.line);
  },

  updateDashboard(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;

    const { W, H, U, dashTop: top } = this;
    const motion = this._cockpitMotion;
    const speed = Math.max(0, this.speed);

    const moving = clamp(speed / (BASE_SPEED * 0.25), 0, 1);
    const normalizedSpeed = clamp(
      speed / (BASE_SPEED * 1.5), 0, 1
    );
    const progress = clamp(this.pos / Math.max(1, this.L), 0, 1);

    const acceleration = clamp(
      (speed - motion.previousSpeed) / dt / BASE_SPEED,
      -1.5,
      0.8
    );

    motion.previousSpeed = speed;
    motion.acceleration = smooth(
      motion.acceleration, acceleration, 7, dt
    );

    motion.lean = smooth(
      motion.lean,
      -this.steerVel * normalizedSpeed,
      6,
      dt
    );

    motion.pitch = smooth(
      motion.pitch,
      motion.acceleration,
      5,
      dt
    );

    motion.needle = smooth(
      motion.needle, normalizedSpeed, 10, dt
    );

    motion.phase += dt * (5 + normalizedSpeed * 15);

    const roughness = clamp(
      (Math.abs(this.playerX) - 0.98) / 0.25, 0, 1
    ) * moving;

    const vibration = (
      Math.sin(motion.phase) * 0.6 +
      Math.sin(motion.phase * 1.73) * 0.3
    ) * normalizedSpeed;

    this.wheel.rotation = this.steerVel * 0.6;
    this.wheel.x = W * 0.4 + motion.lean * 3 * U;
    this.wheel.y = H * 1.04 +
      motion.pitch * 4 * U +
      vibration * U +
      Math.sin(motion.phase * 2.1) * roughness * 1.5 * U;

    this.dice.rotation =
      motion.lean * 0.2 +
      motion.pitch * 0.07 +
      Math.sin(this.clock * 2.7) * 0.025 * moving +
      Math.sin(motion.phase * 1.2) * roughness * 0.025;

    this.dino.rotation =
      motion.lean * 0.08 +
      motion.pitch * 0.055;

    if (!this.isTweenPlaying(this.dinoBounce)) {
      this.dino.y = this.dinoBaseY +
        vibration * 1.2 * U +
        motion.pitch * 3 * U +
        Math.sin(motion.phase * 2.5) * roughness * 2 * U;
    }

    const g = this.gaugeGfx;
    g.clear();

    const needle = (cx, cy, radius, value) => {
      const angle = Phaser.Math.DegToRad(
        135 + 270 * clamp(value, 0, 1)
      );

      g.lineStyle(Math.max(1, 3 * U), 0xf0a273);
      g.lineBetween(
        cx, cy,
        cx + Math.cos(angle) * radius,
        cy + Math.sin(angle) * radius
      );
      g.fillStyle(0xd4c6a3);
      g.fillCircle(cx, cy, radius * 0.13);
    };

    const gy = top + H * 0.07;
    const radius = H * 0.05 * 0.8;

    needle(W * 0.33, gy, radius, motion.needle);
    needle(W * 0.48, gy, radius, progress);

    this.drawHudBar(progress);

    this.uiTick += dt;

    if (this.uiTick >= 0.1) {
      this.uiTick = 0;

      this.speedText.setText(String(Math.round(speed * 0.55)));

      this.speedText.setColor(
        this.clock < this.coffeeUntil && speed > 0
          ? '#b6e8ac'
          : '#f5e6bb'
      );

      const remaining = Math.max(
        0, (1 - progress) * this.quote.km
      );

      this.rKm.setText(
        `${remaining.toFixed(1)}${text('t_7474ac0c56a5235015a8')}`
      );
    }
  }
};