import { DW, DH, FONT_TEXT, FONT_PIXEL, SFX, ART, AMBER, AMBER_CSS, GREEN, GREEN_CSS, RED, CREAM_CSS, FAINT_CSS, SCREEN_TEXT, DIAL_X, DIAL_Y, STOP_ANGLE, HOLE_RING, MON_X, MON_Y, MON_W, MON_H, SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H, LEDS, VU_BARS, mulberry32 } from './PhoneConfig.js';

export const PhoneArtwork = {
  buildDesk() {
    const s = this.scene;

    if (s.textures.exists(ART.desk)) {
      this.ui.add(s.add.image(DW / 2, DH / 2, ART.desk).setDisplaySize(DW, DH));
    } else {
      const g = s.add.graphics();

      g.fillStyle(0x17120d, 1);
      g.fillRoundedRect(0, 0, DW, DH, 18);

      // Usłojenie drewna (stałe ziarno)
      const rng = mulberry32(512);

      for (let i = 0; i < 90; i++) {
        const x = rng() * DW;
        const y = rng() * DH;
        const len = 120 + rng() * 520;
        const dark = rng() < 0.55;

        g.lineStyle(rng() < 0.2 ? 2 : 1, dark ? 0x000000 : 0x4a3a28, 0.05 + rng() * 0.07);
        g.lineBetween(x, y, x + len, y + (rng() - 0.5) * 8);
      }

      // Rekwizyty: plama po kawie, filiżanka, ołówek
      g.lineStyle(3, 0x2a1a0e, 0.35);
      g.strokeCircle(150, 112, 36);
      g.lineStyle(2, 0x2a1a0e, 0.2);
      g.strokeCircle(152, 114, 34);

      g.fillStyle(0xe8e2d0, 1);
      g.fillCircle(118, 112, 40);
      g.lineStyle(2, 0xb8b09a, 1);
      g.strokeCircle(118, 112, 40);
      g.fillStyle(0xf4efe0, 1);
      g.fillCircle(118, 112, 28);
      g.fillStyle(0x3a2214, 1);
      g.fillCircle(118, 112, 22);
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(110, 104, 7);
      g.lineStyle(6, 0xf4efe0, 1);
      g.beginPath();
      g.arc(150, 112, 10, -1.2, 1.2, false);
      g.strokePath();

      const pencil = (cx, cy, angleDeg) => {
        const a = Phaser.Math.DegToRad(angleDeg);
        const rot = (px, py) => ({
          x: cx + px * Math.cos(a) - py * Math.sin(a),
          y: cy + px * Math.sin(a) + py * Math.cos(a)
        });

        g.fillStyle(0xd9a521, 1);
        g.fillPoints([rot(-60, -5), rot(40, -5), rot(40, 5), rot(-60, 5)], true);
        g.fillStyle(0xe8c9a0, 1);
        g.fillPoints([rot(40, -5), rot(62, 0), rot(40, 5)], true);
        g.fillStyle(0x333333, 1);
        g.fillPoints([rot(56, -1.5), rot(62, 0), rot(56, 1.5)], true);
        g.fillStyle(0xc2554a, 1);
        g.fillPoints([rot(-72, -5), rot(-60, -5), rot(-60, 5), rot(-72, 5)], true);
      };

      pencil(560, 118, -14);

      this.ui.add(g);

      // Światło lampy (addytywnie)
      const glow = s.add.graphics().setBlendMode(Phaser.BlendModes.ADD);

      for (let r = 560; r >= 80; r -= 40) {
        glow.fillStyle(AMBER, 0.013);
        glow.fillCircle(DIAL_X - 10, DIAL_Y - 30, r);
      }

      this.ui.add(glow);
    }

    // Winieta
    const vignette = s.add.graphics();

    for (let k = 0; k < 14; k++) {
      vignette.lineStyle(3, 0x000000, 0.14 * (1 - k / 14));
      vignette.strokeRoundedRect(k * 3, k * 3, DW - k * 6, DH - k * 6, 18);
    }

    vignette.lineStyle(2, 0x6b5a2e, 0.8);
    vignette.strokeRoundedRect(0, 0, DW, DH, 18);

    this.ui.add(vignette);
  }
,
  buildPhone() {
    const s = this.scene;

    // Korpus
    if (s.textures.exists(ART.base)) {
      this.ui.add(s.add.image(DIAL_X, 445, ART.base));
    } else {
      const g = s.add.graphics();

      g.fillStyle(0x000000, 0.45);
      g.fillRoundedRect(78, 278, 520, 360, 60);

      g.fillStyle(0x121212, 1);
      g.fillRoundedRect(70, 265, 520, 360, 60);
      g.fillStyle(0x1d1d1d, 1);
      g.fillRoundedRect(74, 268, 512, 340, 56);
      g.fillStyle(0x2b2b2b, 0.55);
      g.fillRoundedRect(92, 276, 476, 54, 36);
      g.lineStyle(2, 0x3a3a3a, 0.9);
      g.strokeRoundedRect(70, 265, 520, 360, 60);

      // Wsporniki widełek
      g.fillStyle(0x0f0f0f, 1);
      g.fillRoundedRect(120, 246, 110, 52, 18);
      g.fillRoundedRect(430, 246, 110, 52, 18);
      g.lineStyle(2, 0x333333, 1);
      g.strokeRoundedRect(120, 246, 110, 52, 18);
      g.strokeRoundedRect(430, 246, 110, 52, 18);

      // Zagłębienie na tarczę + chromowy pierścień
      g.fillStyle(0x090909, 1);
      g.fillCircle(DIAL_X, DIAL_Y, 166);
      g.lineStyle(5, 0x5a5a52, 1);
      g.strokeCircle(DIAL_X, DIAL_Y, 166);
      g.lineStyle(2, 0x000000, 1);
      g.strokeCircle(DIAL_X, DIAL_Y, 172);

      this.ui.add(g);
    }

    // Plunger'y widełek: wyskakują, gdy słuchawka jest podniesiona
    this.hooks = s.add.container(0, 0);
    const hookG = s.add.graphics();
    hookG.fillStyle(0x8a8a80, 1);
    hookG.fillRoundedRect(166, 246, 18, 22, 4);
    hookG.fillRoundedRect(476, 246, 18, 22, 4);
    hookG.lineStyle(1, 0x3a3a34, 1);
    hookG.strokeRoundedRect(166, 246, 18, 22, 4);
    hookG.strokeRoundedRect(476, 246, 18, 22, 4);
    this.hooks.add(hookG);
    this.ui.add(this.hooks);

    // Kabel (pod słuchawką)
    this.cordGfx = s.add.graphics();
    this.ui.add(this.cordGfx);

    // Tarcza
    this.dial = s.add.container(DIAL_X, DIAL_Y);
    this.ui.add(this.dial);
    this.uprights = [];
    this.holes = [];

    if (s.textures.exists(ART.dial)) {
      this.dial.add(s.add.image(0, 0, ART.dial).setDisplaySize(290, 290));
    } else {
      const plate = s.add.graphics();

      plate.fillStyle(0xcfc9b4, 1);
      plate.fillCircle(0, 0, 142);
      plate.fillStyle(0xbab49f, 1);
      plate.fillCircle(0, 0, 132);
      plate.fillStyle(0xcfc9b4, 1);
      plate.fillCircle(0, 0, 128);
      plate.lineStyle(6, 0x8e8878, 1);
      plate.strokeCircle(0, 0, 142);
      plate.lineStyle(1, 0x6e6a5c, 0.8);
      plate.strokeCircle(0, 0, 132);

      this.dial.add(plate);
    }

    const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

    labels.forEach((digit, index) => {
      // Otwory rosną przeciwnie do ruchu wskazówek, ogranicznik jest w STOP_ANGLE.
      const rotationNeeded = 60 + index * 30;
      const angle = Phaser.Math.DegToRad(STOP_ANGLE - rotationNeeded);
      const x = Math.cos(angle) * HOLE_RING;
      const y = Math.sin(angle) * HOLE_RING;

      const hole = s.add.circle(x, y, 23, 0x0d0f0d)
        .setStrokeStyle(3, 0x6e6a5c)
        .setInteractive({ useHandCursor: true });

      hole.on('pointerover', () => {
        if (this.state === 'ready') hole.setStrokeStyle(3, AMBER);
      });

      hole.on('pointerout', () => hole.setStrokeStyle(3, 0x6e6a5c));
      hole.on('pointerdown', () => this.dialDigit(digit));

      const label = s.add.text(x, y, digit, {
        fontFamily: FONT_PIXEL,
        fontSize: '15px',
        color: '#f3ead0'
      }).setOrigin(0.5);

      this.dial.add([hole, label]);
      this.holes.push(hole);
      this.uprights.push(label);
    });

    const centre = s.add.circle(0, 0, 50, 0xe6dfc8)
      .setStrokeStyle(3, 0x5b5646);

    this.dialCentre = s.add.text(0, 0, '', {
      fontFamily: FONT_TEXT,
      fontSize: '13px',
      color: '#252c25',
      align: 'center'
    }).setOrigin(0.5);

    this.dial.add([centre, this.dialCentre]);
    this.uprights.push(this.dialCentre);

    // Ogranicznik palca (nieruchomy)
    const stopAngle = Phaser.Math.DegToRad(STOP_ANGLE);
    const stop = s.add.graphics();
    const sx = DIAL_X + Math.cos(stopAngle) * 156;
    const sy = DIAL_Y + Math.sin(stopAngle) * 156;

    stop.fillStyle(0x000000, 0.4);
    stop.fillRoundedRect(-10, -22, 22, 48, 6);
    stop.fillStyle(0xc0a66c, 1);
    stop.fillRoundedRect(-11, -24, 22, 48, 6);
    stop.fillStyle(0xe6d19a, 0.7);
    stop.fillRoundedRect(-8, -21, 6, 42, 3);
    stop.lineStyle(2, 0x6b5a2e, 1);
    stop.strokeRoundedRect(-11, -24, 22, 48, 6);

    stop.setPosition(sx, sy).setAngle(STOP_ANGLE + 90);
    this.ui.add(stop);

    // Słuchawka
    this.handset = s.add.container(330, 252);

    if (s.textures.exists(ART.handset)) {
      this.handset.add(s.add.image(0, 10, ART.handset));
    } else {
      const h = s.add.graphics();

      // cień
      h.fillStyle(0x000000, 0.35);
      h.fillRoundedRect(-150, -8, 300, 32, 14);

      // pałąk
      h.fillStyle(0x1b1b1b, 1);
      h.fillRoundedRect(-150, -14, 300, 28, 14);
      h.lineStyle(2, 0x454545, 0.9);
      h.lineBetween(-130, -8, 130, -8);

      // muszle
      [-1, 1].forEach(side => {
        const cx = side * 150;

        h.fillStyle(0x161616, 1);
        h.fillRoundedRect(cx - 35, -22, 70, 64, 22);
        h.lineStyle(2, 0x3a3a3a, 1);
        h.strokeRoundedRect(cx - 35, -22, 70, 64, 22);
        h.fillStyle(0x2b2b2b, 0.7);
        h.fillRoundedRect(cx - 28, -18, 56, 14, 8);

        // perforacja
        h.fillStyle(0x050505, 0.9);

        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 4; col++) {
            h.fillCircle(cx - 15 + col * 10, 14 + row * 8, 2);
          }
        }
      });

      this.handset.add(h);
    }

    const handsetHit = s.add.rectangle(0, 10, 380, 110, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });

    handsetHit.on('pointerdown', () => {
      this.sfxClick();
      this.pickUp();
    });

    this.handset.add(handsetHit);
    this.ui.add(this.handset);

    this.drawCord();
  }

  // Kabel spiralny od słuchawki do korpusu
,
  drawCord() {
    const g = this.cordGfx;
    const h = this.handset;

    if (!g?.scene || !h) return;

    g.clear();

    const rad = Phaser.Math.DegToRad(h.angle);
    const lx = -150;
    const ly = 38;

    const sx = h.x + lx * Math.cos(rad) - ly * Math.sin(rad);
    const sy = h.y + lx * Math.sin(rad) + ly * Math.cos(rad);

    const ex = 80;
    const ey = 400;
    const cx = Math.min(sx, ex) - 70;
    const cy = Math.max(sy, ey) + 40;

    const points = [];
    const steps = 70;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;

      const bx = u * u * sx + 2 * u * t * cx + t * t * ex;
      const by = u * u * sy + 2 * u * t * cy + t * t * ey;

      // styczna → normalna dla efektu skręcenia kabla
      const dx = 2 * u * (cx - sx) + 2 * t * (ex - cx);
      const dy = 2 * u * (cy - sy) + 2 * t * (ey - cy);
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const wave = Math.sin(i * 0.95) * 5;

      points.push({ x: bx + nx * wave, y: by + ny * wave });
    }

    const stroke = (width, color, alpha, dx = 0, dy = 0) => {
      g.lineStyle(width, color, alpha);
      g.beginPath();
      points.forEach((p, i) => {
        if (i === 0) g.moveTo(p.x + dx, p.y + dy);
        else g.lineTo(p.x + dx, p.y + dy);
      });
      g.strokePath();
    };

    stroke(6, 0x000000, 0.35, 2, 3);
    stroke(5, 0x0b0b0b, 1);
    stroke(1.5, 0x3a3a3a, 0.9, 0, -1);
  }
,
  setHandset(up) {
    if (this._handsetUp === up || !this.handset) return;

    this._handsetUp = up;

    this._kill(this.handset);
    this._kill(this.hooks);

    const target = up
      ? { x: 350, y: 176, angle: -6 }
      : { x: 330, y: 252, angle: 0 };

    const tween = this._tween({
      targets: this.handset,
      ...target,
      duration: 220,
      ease: 'Cubic.easeOut',
      onUpdate: () => this.drawCord(),
      onComplete: () => this.drawCord()
    });

    if (!tween) {
      this.handset.setPosition(target.x, target.y).setAngle(target.angle);
      this.drawCord();
    }

    this._tween({
      targets: this.hooks,
      y: up ? -7 : 0,
      duration: 140
    });
  }
,
  resetDial() {
    if (!this.dial) return;
    this._kill(this.dial);
    this.dial.setAngle(0);
    this.uprightLabels();
  }

  // Cyfry zostają czytelne, gdy tarcza się obraca.
,
  uprightLabels() {
    if (!this.dial) return;
    const rotation = -this.dial.rotation;
    this.uprights.forEach(obj => obj?.scene && obj.setRotation(rotation));
  }

  // ─── Aktualizacja widoku ──────────────────────────────────────────────────
};
