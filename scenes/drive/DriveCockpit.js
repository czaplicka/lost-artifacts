import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { FLAVOUR } from '../../config/RoadTripTowns.js';
import { BASE_SPEED, pick, clamp, poly } from './DriveShared.js';

export const DriveCockpit = {
  buildDash() {
    const { W, H, U, dashTop: top } = this;

    const dashKey = `drv_dash_${Math.round(W)}x${Math.round(H)}`;

    this.gen(dashKey, Math.round(W), Math.round(H), g => {
      // roof liner
      g.fillStyle(0x0c0c0e, 1); g.fillRect(0, 0, W, H * 0.085);
      g.fillStyle(0x1b1b20, 1); g.fillRect(0, H * 0.085, W, H * 0.008);

      // A-pillars
      g.fillStyle(0x0a0a0c, 1);
      poly(g, [[0, 0], [W * 0.19, 0], [W * 0.075, top + H * 0.01], [0, top + H * 0.06]]);
      poly(g, [[W, 0], [W * 0.86, 0], [W * 0.95, top], [W, top + H * 0.05]]);
      g.lineStyle(3, 0x1d1e24, 1);
      g.lineBetween(W * 0.19, 0, W * 0.075, top + H * 0.01);
      g.lineBetween(W * 0.86, 0, W * 0.95, top);

      // glass glare
      g.fillStyle(0xffffff, 0.035);
      poly(g, [[W * 0.27, H * 0.09], [W * 0.43, H * 0.09], [W * 0.31, top], [W * 0.15, top]]);

      // rear-view mirror
      g.fillStyle(0x0e0e10, 1); g.fillRect(W * 0.665, H * 0.085, W * 0.02, H * 0.03);
      g.fillStyle(0x121316, 1); g.fillRoundedRect(W * 0.56, H * 0.105, W * 0.22, H * 0.075, 14);
      g.fillStyle(0x20262c, 1); g.fillRoundedRect(W * 0.568, H * 0.113, W * 0.204, H * 0.059, 10);
      g.fillStyle(0xffffff, 0.06); g.fillRect(W * 0.58, H * 0.12, W * 0.18, H * 0.012);

      // dash surface
      g.fillStyle(0x121317, 1);
      poly(g, [
        [0, top + H * 0.06], [W * 0.075, top + H * 0.01], [W * 0.35, top - H * 0.005],
        [W * 0.65, top - H * 0.012], [W * 0.95, top], [W, top + H * 0.05], [W, H], [0, H]
      ]);
      g.lineStyle(3, 0x2b2e36, 1);
      g.lineBetween(W * 0.075, top + H * 0.01, W * 0.35, top - H * 0.005);
      g.lineBetween(W * 0.35, top - H * 0.005, W * 0.65, top - H * 0.012);
      g.lineBetween(W * 0.65, top - H * 0.012, W * 0.95, top);

      // instrument cluster
      const cx0 = W * 0.27, cy0 = top + H * 0.012, cw = W * 0.27, ch = H * 0.115;
      g.fillStyle(0x08080a, 1); g.fillRoundedRect(cx0, cy0, cw, ch, 18);
      g.lineStyle(3, 0x24262c, 1); g.strokeRoundedRect(cx0, cy0, cw, ch, 18);

      for (const gx of [W * 0.33, W * 0.48]) {
        const gy = top + H * 0.07, gr = H * 0.05;
        g.fillStyle(0x1a1d24, 1); g.fillCircle(gx, gy, gr);
        g.lineStyle(3, 0x9aa6b2, 1); g.strokeCircle(gx, gy, gr);

        for (let k = 0; k <= 10; k++) {
          const a = Phaser.Math.DegToRad(135 + 27 * k);
          g.lineStyle(k >= 9 ? 3 : 2, k >= 9 ? 0xff5a3c : 0xcfd6dd, 1);
          g.lineBetween(
            gx + Math.cos(a) * gr * 0.78, gy + Math.sin(a) * gr * 0.78,
            gx + Math.cos(a) * gr * 0.94, gy + Math.sin(a) * gr * 0.94
          );
        }
      }

      // infotainment
      const ix = W * 0.595, iy = top + H * 0.012, iw = W * 0.175, ih = H * 0.2;
      g.fillStyle(0x08080a, 1); g.fillRoundedRect(ix, iy, iw, ih, 14);
      g.lineStyle(3, 0x24262c, 1); g.strokeRoundedRect(ix, iy, iw, ih, 14);
      g.fillStyle(0x0f1a14, 1); g.fillRoundedRect(ix + 10, iy + 10, iw - 20, ih * 0.58, 8);
      g.lineStyle(2, 0x1f3a2a, 1); g.strokeRoundedRect(ix + 10, iy + 10, iw - 20, ih * 0.58, 8);

      g.fillStyle(0x1d1f25, 1);
      for (let k = 0; k < 6; k++) {
        g.fillRoundedRect(ix + 14 + k * ((iw - 28) / 6), iy + ih * 0.75, (iw - 28) / 6 - 6, ih * 0.14, 4);
      }

      g.fillStyle(0x2d6cdf, 1); g.fillCircle(ix - 10, iy + ih * 0.5, 20 * U);
      g.fillStyle(0xd93a3a, 1); g.fillCircle(ix + iw + 10, iy + ih * 0.5, 20 * U);
      g.fillStyle(0x15161a, 1);
      g.fillCircle(ix - 10, iy + ih * 0.5, 12 * U); g.fillCircle(ix + iw + 10, iy + ih * 0.5, 12 * U);

      // gear stick
      g.fillStyle(0x0b0b0d, 1);
      g.fillRoundedRect(W * 0.8, H * 0.86, W * 0.03, H * 0.14, 10);
      g.fillStyle(0x1b1b20, 1); g.fillCircle(W * 0.815, H * 0.86, W * 0.022);
    });

    this.add.image(0, 0, dashKey).setOrigin(0, 0).setDepth(210);

    // gauge needles + digital speed
    this.gaugeGfx = this.add.graphics().setDepth(212);

    this.speedText = this.add.text(W * 0.405, top + H * 0.062, __dialogueText("scenes/DriveScene.js", "t_5feceb66ffc86f38d952"), {
      fontFamily: 'PressStart2P', fontSize: this.px(20), color: '#cfe8ff'
    }).setOrigin(0.5).setDepth(213);

    this.add.text(W * 0.405, top + H * 0.092, __dialogueText("scenes/DriveScene.js", "t_3a8e2546d8152f9f6c50"), {
      fontFamily: 'PressStart2P', fontSize: this.px(9), color: '#7d8fa3'
    }).setOrigin(0.5).setDepth(213);

    // infotainment texts
    const ix = W * 0.595 + 18, iy = top + H * 0.012 + 16, iw = W * 0.175 - 36;

    this.rKm = this.add.text(ix, iy, '', {
      fontFamily: 'PressStart2P', fontSize: this.px(24), color: '#7dff9a'
    }).setDepth(213);

    this.rStation = this.add.text(ix, iy + 42 * U, '', {
      fontFamily: 'PressStart2P', fontSize: this.px(10), color: '#e9d27a'
    }).setDepth(213);

    this.rLine = this.add.text(ix, iy + 62 * U, '', {
      fontFamily: 'SpecialElite', fontSize: this.px(15), color: '#a9d8b4',
      wordWrap: { width: iw }
    }).setDepth(213);

    this.updateStation(false);

    this.radioZone = this.add.zone(
      W * 0.595 + W * 0.0875, top + H * 0.012 + H * 0.058, W * 0.175, H * 0.12
    ).setDepth(217).setInteractive({ useHandCursor: true });

    this.radioZone.on('pointerdown', () => {
      this.uiHeld = true;
      this.updateStation(true);
    });

    // fuzzy dice
    this.dice = this.add.container(W * 0.675, H * 0.115).setDepth(209);
    const rope = this.add.graphics();
    rope.lineStyle(3, 0xdddddd, 1);
    rope.lineBetween(0, 0, -26, 105);
    rope.lineBetween(0, 0, 22, 128);
    const d1 = this.add.image(-30, 140, 'drv_die').setScale(1.15 * this.U).setAngle(-12);
    const d2 = this.add.image(26, 160, 'drv_die').setScale(1.0 * this.U).setAngle(14);
    this.dice.add([rope, d1, d2]);
    this.dice.setScale(this.U);

    // dino on the dash
    const dinoScale = (H * 0.11) / 130;
    this.dinoBaseY = top + H * 0.012;

    this.dino = this.add.image(W * 0.52, this.dinoBaseY, 'drv_dino')
      .setOrigin(0.5, 1)
      .setScale(dinoScale)
      .setDepth(214)
      .setInteractive({ useHandCursor: true });

    this.dino.on('pointerdown', () => {
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

    // steering wheel
    this.wheel = this.add.image(
      W * 0.40, H * 1.04, `drv_wheel_${this.wheelR}`
    ).setDepth(220);

    this.buildAutopilotButton();
  },

  buildAutopilotButton() {
    const { W, H, U, dashTop } = this;
    const x = W * 0.875, y = dashTop + H * 0.115, w = W * 0.1, h = H * 0.075;

    this.autoGfx = this.add.graphics().setDepth(215);
    this.autoGfx.fillStyle(0x1b2430, 1);
    this.autoGfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8 * U);
    this.autoGfx.lineStyle(3, 0xd4af37, 1);
    this.autoGfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8 * U);

    this.autoText = this.add.text(x, y, __dialogueText("scenes/DriveScene.js", "t_ecb1d5dcf3d13e4f3454"), {
      fontFamily: 'PressStart2P', fontSize: this.px(11), color: '#d4af37',
      align: 'center', lineSpacing: 6
    }).setOrigin(0.5).setDepth(216);

    this.autoGfx.setAlpha(0.3);
    this.autoText.setAlpha(0.3);

    this.autoZone = this.add.zone(x, y, w, h).setDepth(217);

    this.time.delayedCall(2000, () => {
      if (!this.autoZone?.scene) {
        return;
      }

      this.autoGfx.setAlpha(1);
      this.autoText.setAlpha(1);
      this.autoZone.setInteractive({ useHandCursor: true });

      this.autoZone.on('pointerdown', () => {
        this.uiHeld = true;
        this.autopilot();
      });

      this.autoZone.on('pointerover', () => {
        this.say(__dialogueText("scenes/DriveScene.js", "t_eff86d8f257880ce4016"), 3200, true);
      });
    });
  },

  buildHud() {
    const { W, H, U } = this;

    this.hudBar = this.add.graphics().setDepth(230);

    this.add.text(W * 0.23, H * 0.03, this.fromTown.short, {
      fontFamily: 'PressStart2P', fontSize: this.px(13), color: '#f4e7c1'
    }).setOrigin(0, 0.5).setDepth(231);

    this.add.text(W * 0.77, H * 0.03, this.town.short, {
      fontFamily: 'PressStart2P', fontSize: this.px(13), color: '#d4af37'
    }).setOrigin(1, 0.5).setDepth(231);

    this.statsText = this.add.text(W / 2, H * 0.066, '', {
      fontFamily: 'PressStart2P', fontSize: this.px(11), color: '#9fb2c4'
    }).setOrigin(0.5).setDepth(231);

    this.refreshStats();

    this.introText = this.add.text(
      W / 2, H * 0.22,
      __dialogueText("scenes/DriveScene.js", "t_a299a13955305d00ea45"),
      {
        fontFamily: 'SpecialElite', fontSize: this.px(26), color: '#f4e7c1',
        backgroundColor: '#1a130e', align: 'center', padding: { x: 18 * U, y: 12 * U }
      }
    ).setOrigin(0.5).setDepth(240);

    this.createTrackedTween({
      targets: this.introText,
      alpha: 0,
      delay: 5200,
      duration: 800
    });
  },

  refreshStats() {
    const s = this.stats;
    this.statsText?.setText(
      `${__dialogueText("scenes/DriveScene.js", "t_b15a09a918a712a6fdb5")}${s.coffees}${__dialogueText("scenes/DriveScene.js", "t_4dabc8fc0998bd184e87")}${s.coins}${__dialogueText("scenes/DriveScene.js", "t_49f970bc616a0d881cc5")}${s.hits}${__dialogueText("scenes/DriveScene.js", "t_acf6f855220fa82df1dd")}${s.fines}`
    );
  },

  drawHudBar(progress) {
    const { W, H, U } = this;
    const g = this.hudBar;
    const x0 = W * 0.40, x1 = W * 0.60, y = H * 0.03;

    g.clear();
    g.fillStyle(0x2a2a30, 1); g.fillRect(x0, y - 3 * U, x1 - x0, 6 * U);
    g.fillStyle(0xd4af37, 1); g.fillRect(x0, y - 3 * U, (x1 - x0) * progress, 6 * U);

    const cx = x0 + (x1 - x0) * progress;
    g.fillStyle(0xf4e7c1, 1);
    g.fillTriangle(cx, y - 10 * U, cx - 6 * U, y - 2 * U, cx + 6 * U, y - 2 * U);
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

  say(text, ms = 2800, force = false) {
    if (this._cleanupDone || this._destroyCleanupDone || !this.dino?.scene) return;
    if (!this.ready && !force) {
      return;
    }

    if (this.bubbleUntil > this.clock && !force) {
      return;
    }

    this.clearDriveBubble();

    const { W, H, U } = this;
    const pad = 14 * U;

    const t = this.add.text(0, 0, text, {
      fontFamily: 'SpecialElite', fontSize: this.px(22), color: '#2a1d12',
      align: 'center', wordWrap: { width: W * 0.3 }
    }).setOrigin(0.5, 1);

    const w = t.width + pad * 2;
    const h = t.height + pad * 2;

    const g = this.add.graphics();
    g.fillStyle(0xf6ecc8, 1); g.fillRoundedRect(-w / 2, -h, w, h, 10 * U);
    g.lineStyle(3, 0x3b2d20, 1); g.strokeRoundedRect(-w / 2, -h, w, h, 10 * U);
    g.fillStyle(0xf6ecc8, 1); g.fillTriangle(-10 * U, 0, 10 * U, 0, 0, 16 * U);

    t.setPosition(0, -pad);

    const x = clamp(this.dino.x, w / 2 + 10, W - w / 2 - 10);
    const y = this.dashTop - H * 0.02;

    const c = this.add.container(x, y, [g, t]).setDepth(300).setAlpha(0);

    this.bubble = c;
    this.bubbleUntil = this.clock + ms / 1000;

    this.createTrackedTween({ targets: c, alpha: 1, duration: 120 });

    this._bubbleTimer = this.time.delayedCall(ms, () => {
      if (this._cleanupDone || this.bubble !== c || !c.scene) {
        return;
      }

      this._bubbleTimer = null;
      this.killTrackedTweensOf(c);
      this.createTrackedTween({
        targets: c,
        alpha: 0,
        duration: 250,
        onComplete: () => {
          if (this.bubble !== c) return;
          this.bubble = null;
          this.bubbleUntil = 0;
          if (c.scene) c.destroy(true);
        }
      });
    });
  },

  floatText(text, color = '#ffd84d') {
    const t = this.add.text(this.W / 2, this.dashTop - this.H * 0.08, text, {
      fontFamily: 'PressStart2P', fontSize: this.px(20), color,
      stroke: "#000000", strokeThickness: 4
    }).setOrigin(0.5).setDepth(260);

    this.createTrackedTween({
      targets: t,
      y: t.y - 70 * this.U,
      alpha: 0,
      duration: 900,
      onComplete: () => t.destroy()
    });
  },

  updateStation(next) {
    if (next) {
      this.stationIndex = (this.stationIndex + 1) % FLAVOUR.radio.length;

      this.createTrackedTween({
        targets: [this.rStation, this.rLine],
        alpha: { from: 0.1, to: 1 },
        duration: 260
      });
    }

    const s = FLAVOUR.radio[this.stationIndex];
    this.rStation.setText(s.name);
    this.rLine.setText(s.line);
  },

  updateDashboard(dt) {
    const { W, H, dashTop: top } = this;
    const sp = clamp(this.speed / (BASE_SPEED * 1.5), 0, 1);
    const progress = clamp(this.pos / this.L, 0, 1);

    this.wheel.rotation = this.steerVel * 0.6;

    this.dice.rotation =
      -this.steerVel * 0.22 +
      Math.sin(this.clock * 1.9) * 0.04 +
      Math.sin(this.clock * 13) * 0.012 * sp;

    const bob = Math.sin(this.clock * 14) * sp * 1.6 * this.U;
    const jolt = Math.abs(this.playerX) > 1.1 ? Math.sin(this.clock * 40) * 2.5 * this.U : 0;

    if (!this.isTweenPlaying(this.dinoBounce)) {
      this.dino.y = this.dinoBaseY + bob + jolt;
    }

    const g = this.gaugeGfx;
    g.clear();

    const needle = (cx, cy, r, val) => {
      const a = Phaser.Math.DegToRad(135 + 270 * clamp(val, 0, 1));
      g.lineStyle(3, 0xff5a3c, 1);
      g.lineBetween(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      g.fillStyle(0xcccccc, 1);
      g.fillCircle(cx, cy, r * 0.14);
    };

    const gy = top + H * 0.07;
    const gr = H * 0.05 * 0.82;

    needle(W * 0.33, gy, gr, sp);
    needle(W * 0.48, gy, gr, progress);

    this.drawHudBar(progress);

    this.uiTick += dt;

    if (this.uiTick > 0.1) {
      this.uiTick = 0;

      this.speedText.setText(String(Math.round(this.speed * 0.55)));

      const left = Math.max(0, (1 - progress) * this.quote.km);
      this.rKm.setText(`${left.toFixed(1)}${__dialogueText("scenes/DriveScene.js", "t_7474ac0c56a5235015a8")}`);
    }
  }
};
