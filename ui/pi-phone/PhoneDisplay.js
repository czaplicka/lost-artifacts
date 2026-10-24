import { DW, DH, FONT_TEXT, FONT_PIXEL, SFX, ART, AMBER, AMBER_CSS, GREEN, GREEN_CSS, RED, CREAM_CSS, FAINT_CSS, SCREEN_TEXT, DIAL_X, DIAL_Y, STOP_ANGLE, HOLE_RING, MON_X, MON_Y, MON_W, MON_H, SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H, LEDS, VU_BARS, mulberry32 } from './PhoneConfig.js';

export const PhoneDisplay = {
  ensureBuilt() {
    if (this.built) return;

    const s = this.scene;

    this.blocker = s.add.rectangle(0, 0, 10, 10, 0x000000, 0.9).setOrigin(0);
    this.root.add(this.blocker);

    this.ui = s.add.container(0, 0);
    this.root.add(this.ui);

    this.buildDesk();
    this.buildPhone();
    this.buildMonitor();
    this.buildTopBar();
    this.buildSticky();

    this.dir = s.add.container(0, 0).setVisible(false);
    this.ui.add(this.dir);

    this.built = true;
  }
,
  setHit(obj, width, height, hand = true) {
    obj.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, width, height),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: hand
    });
  }
,
  layout() {
    if (!this.ui || !this.blocker) return;

    const { width, height } = this.scene.scale;

    this.blocker.setSize(width, height);
    this.setHit(this.blocker, width, height, false);

    const scale = Math.min(
      (width - 20) / DW,
      (height - 20) / DH
    );

    this.uiScale = scale;
    this.uiBaseX = (width - DW * scale) / 2;
    this.uiBaseY = (height - DH * scale) / 2;

    this.ui.setScale(scale);
    this.ui.setX(this.uiBaseX);

    if (!this.isOpen || !this.scene.tweens.isTweening(this.ui)) {
      this.ui.setY(this.uiBaseY);
    }
  }
,
  buildMonitor() {
    const s = this.scene;
    const X = MON_X;
    const Y = MON_Y;
    const W = MON_W;
    const H = MON_H;

    const g = s.add.graphics();

    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(X + 6, Y + 8, W, H, 14);
    g.fillStyle(0x0f1512, 0.96);
    g.fillRoundedRect(X, Y, W, H, 14);
    g.lineStyle(2, 0x3a4a40, 1);
    g.strokeRoundedRect(X, Y, W, H, 14);

    // Narożniki w stylu HUD
    const b = 18;
    g.lineStyle(3, AMBER, 0.9);

    [
      [X + 8, Y + 8, 1, 1],
      [X + W - 8, Y + 8, -1, 1],
      [X + 8, Y + H - 8, 1, -1],
      [X + W - 8, Y + H - 8, -1, -1]
    ].forEach(([cx, cy, sx, sy]) => {
      g.lineBetween(cx, cy, cx + sx * b, cy);
      g.lineBetween(cx, cy, cx, cy + sy * b);
    });

    this.ui.add(g);

    this.t(this.ui, X + 28, Y + 20, 'LINE MONITOR', 11, AMBER_CSS, FONT_PIXEL);

    this.timerText = this.t(this.ui, X + W - 28, Y + 20, '', 11, GREEN_CSS, FONT_PIXEL)
      .setOrigin(1, 0);

    // Diody stanu
    this.ledViews = LEDS.map(([id, label, color], i) => {
      const lx = X + 28 + i * 102;
      const ly = Y + 54;

      const glow = s.add.circle(lx + 8, ly + 8, 11, color, 0.0)
        .setBlendMode(Phaser.BlendModes.ADD);
      const dot = s.add.circle(lx + 8, ly + 8, 6, color, 0.18)
        .setStrokeStyle(1, 0x000000, 0.8);

      this.ui.add([glow, dot]);

      this.t(this.ui, lx + 22, ly + 1, label, 8, FAINT_CSS, FONT_PIXEL);

      return { id, color, glow, dot };
    });

    // Wyświetlacz numeru
    this.t(this.ui, X + 28, Y + 80, 'NUMBER', 8, FAINT_CSS, FONT_PIXEL);

    const length = Number(this.data.numberLength) || 3;
    this.digitBoxes = [];

    for (let i = 0; i < length; i++) {
      const bx = X + 28 + i * 100;
      const by = Y + 96;

      const bg = s.add.graphics();
      const text = s.add.text(bx + 44, by + 46, '-', {
        fontFamily: FONT_PIXEL,
        fontSize: '44px',
        color: '#4a3a1c'
      }).setOrigin(0.5);

      this.ui.add([bg, text]);
      this.digitBoxes.push({ x: bx, y: by, bg, text });
    }

    // Miernik poziomu linii
    this.t(this.ui, X + 340, Y + 80, 'LINE LEVEL', 8, FAINT_CSS, FONT_PIXEL);
    this.vuGfx = s.add.graphics();
    this.ui.add(this.vuGfx);

    // Ekran
    const screen = s.add.graphics();

    screen.fillStyle(0x0a120e, 1);
    screen.fillRoundedRect(SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H, 8);
    screen.lineStyle(2, 0x2c4a3a, 1);
    screen.strokeRoundedRect(SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H, 8);
    screen.lineStyle(1, GREEN, 0.18);
    screen.strokeRoundedRect(SCREEN_X + 3, SCREEN_Y + 3, SCREEN_W - 6, SCREEN_H - 6, 6);

    this.ui.add(screen);

    // Klik na ekranie podczas rozmowy = dalej
    const screenHit = s.add.rectangle(SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H, 0xffffff, 0)
      .setOrigin(0)
      .setInteractive();

    screenHit.on('pointerdown', () => {
      if (this.state === 'connected') this.nextLine();
    });

    this.ui.add(screenHit);

    this.statusText = s.add.text(SCREEN_X + 22, SCREEN_Y + 18, '', {
      fontFamily: FONT_TEXT,
      fontSize: '22px',
      color: SCREEN_TEXT,
      wordWrap: { width: SCREEN_W - 44 },
      lineSpacing: 6
    });

    this.logContainer = s.add.container(SCREEN_X + 18, SCREEN_Y + 14);

    this.prompt = s.add.text(SCREEN_X + SCREEN_W - 18, SCREEN_Y + SCREEN_H - 14, '', {
      fontFamily: FONT_PIXEL,
      fontSize: '10px',
      color: AMBER_CSS
    })
      .setOrigin(1, 1)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);

    this.prompt.on('pointerdown', () => this.nextLine());

    this.ui.add([this.statusText, this.logContainer, this.prompt]);

    // Linie skanowania CRT
    const scan = s.add.graphics();
    scan.lineStyle(1, 0x000000, 0.18);

    for (let y = SCREEN_Y + 2; y < SCREEN_Y + SCREEN_H - 2; y += 3) {
      scan.lineBetween(SCREEN_X + 3, y, SCREEN_X + SCREEN_W - 3, y);
    }

    this.ui.add(scan);

    // Klawisze
    this.btnHook = this.makeKey(
      X + 18,
      Y + H - 76,
      250,
      46,
      'PICK UP',
      () => this.pickUp()
    );

    this.btnDir = this.makeKey(
      X + W - 18 - 250,
      Y + H - 76,
      250,
      46,
      'DIRECTORY',
      () => {
        if (this.state !== 'dialling') this.openDirectory();
      }
    );
  }
,
  buildTopBar() {
    this.t(this.ui, 40, 22, 'LOCAL TELEPHONE', 30, AMBER_CSS, FONT_TEXT);

    this.ownLine = this.t(this.ui, 42, 58, '', 14, FAINT_CSS, FONT_TEXT);

    this.t(
      this.ui,
      40,
      DH - 30,
      '0-9 dial   SPACE / ENTER continue   D directory   ESC close',
      14,
      '#7d7560',
      FONT_TEXT
    );

    this.makeKey(DW - 40 - 120, 20, 120, 40, 'CLOSE', () => this.close(), { size: 10 });
  }
,
  buildSticky() {
    const s = this.scene;

    this.stickyNote = s.add.container(118, 578).setAngle(-5).setVisible(false);

    const g = s.add.graphics();
    g.fillStyle(0x000000, 0.35);
    g.fillRect(-52, -38, 110, 88);
    g.fillStyle(0xffe98a, 1);
    g.fillRect(-56, -42, 110, 88);
    g.fillStyle(0xe8cf6a, 1);
    g.fillTriangle(54, 46, 54, 30, 38, 46);

    const tape = s.add.rectangle(0, -44, 44, 14, 0xe8dca0, 0.85).setAngle(3);

    this.stickyNumber = s.add.text(0, -16, '', {
      fontFamily: FONT_TEXT,
      fontSize: '34px',
      color: '#2a2118'
    }).setOrigin(0.5);

    this.stickyName = s.add.text(0, 18, '', {
      fontFamily: FONT_TEXT,
      fontSize: '14px',
      color: '#4a3d18',
      align: 'center',
      wordWrap: { width: 96 }
    }).setOrigin(0.5);

    this.stickyNote.add([g, tape, this.stickyNumber, this.stickyName]);
    this.ui.add(this.stickyNote);
  }
,
  updateSticky(animate) {
    if (!this.stickyNote) return;

    if (!this.sticky) {
      this.stickyNote.setVisible(false);
      return;
    }

    this.stickyNumber.setText(this.sticky.number);
    this.stickyName.setText(this.sticky.name);
    this.stickyNote.setVisible(true);

    if (animate) {
      this._kill(this.stickyNote);
      this.stickyNote.setScale(1.25).setAlpha(0.4);
      this._tween({
        targets: this.stickyNote,
        scale: 1,
        alpha: 1,
        duration: 180,
        ease: 'Back.easeOut'
      });
    }
  }

  // ─── Elementy wspólne ─────────────────────────────────────────────────────
,
  t(parent, x, y, value, size, color, font = FONT_TEXT) {
    const text = this.scene.add.text(x, y, value, {
      fontFamily: font,
      fontSize: `${size}px`,
      color
    });

    parent?.add(text);
    return text;
  }
,
  makeKey(x, y, w, h, label, onClick, { size = 12, color = AMBER_CSS } = {}) {
    const s = this.scene;

    const container = s.add.container(x, y);
    const g = s.add.graphics();

    const text = s.add.text(w / 2, h / 2, label, {
      fontFamily: FONT_PIXEL,
      fontSize: `${size}px`,
      color
    }).setOrigin(0.5);

    const hit = s.add.rectangle(0, 0, w, h, 0xffffff, 0)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });

    const key = {
      container,
      enabled: true,
      hover: false,
      setLabel: value => text.setText(value),
      setEnabled: value => {
        key.enabled = value;
        draw();
      },
      setVisible: value => container.setVisible(value)
    };

    const draw = () => {
      g.clear();

      const lit = key.hover && key.enabled;

      g.fillStyle(0x000000, 0.4);
      g.fillRoundedRect(2, 4, w, h, 8);
      g.fillStyle(lit ? 0x343a2e : 0x23281f, 1);
      g.fillRoundedRect(0, 0, w, h, 8);
      g.fillStyle(0xffffff, 0.06);
      g.fillRoundedRect(3, 3, w - 6, h * 0.4, 6);
      g.lineStyle(2, lit ? 0xffd98a : 0x6b5a2e, 1);
      g.strokeRoundedRect(0, 0, w, h, 8);

      text.setAlpha(key.enabled ? 1 : 0.4);
    };

    hit.on('pointerover', () => {
      key.hover = true;
      draw();
    });

    hit.on('pointerout', () => {
      key.hover = false;
      draw();
    });

    hit.on('pointerdown', () => {
      if (!key.enabled) return;
      this.sfxClick();
      onClick();
    });

    container.add([g, text, hit]);
    draw();

    this.ui.add(container);
    this.keys.push(key);

    return key;
  }
,
  render() {
    if (this.destroyed || !this.isOpen || !this.built) return;

    const state = this.state;

    // Słuchawka
    this.setHandset(state !== 'on_hook');

    // Napis na tarczy i w nagłówku
    const own = this.ownContact;

    this.dialCentre.setText(
      [own?.name || 'LOCAL PHONE', own?.number || '---'].join('\n')
    );

    this.ownLine.setText(
      own ? `${own.name}  ·  ext. ${own.number}` : ''
    );

    // Klawisze
    this.btnHook.setLabel(state === 'on_hook' ? 'PICK UP' : 'HANG UP');
    this.btnDir.setEnabled(state !== 'dialling');

    // Otwory tarczy reagują tylko w stanie "ready"
    this.holes.forEach(hole => {
      if (hole.input) hole.input.enabled = state === 'ready';
      if (state !== 'ready') hole.setStrokeStyle(3, 0x6e6a5c);
    });

    // Ekran: transkrypcja albo komunikat
    const logMode = this.logItems.length > 0;

    this.logContainer.setVisible(logMode);
    this.statusText.setVisible(!logMode).setText(this.status || '');

    const connected = state === 'connected';
    this.prompt.setVisible(connected);

    if (connected) {
      const last = this.lineIndex >= this.lines.length - 1;
      this.prompt.setText(last ? 'END CONVERSATION >' : 'CONTINUE >');
    }

    this.refreshDigits();
    this.updateLeds();
    this.dir.setVisible(this.directoryOpen);
  }
,
  refreshDigits() {
    const ready = this.state === 'ready';

    this.digitBoxes.forEach((box, i) => {
      const ch = this.number[i];
      const isCursor = ready && i === this.number.length;

      box.text
        .setText(ch ?? '-')
        .setColor(ch ? AMBER_CSS : '#4a3a1c');

      box.bg.clear();
      box.bg.fillStyle(0x070b08, 1);
      box.bg.fillRoundedRect(box.x, box.y, 88, 92, 8);
      box.bg.lineStyle(2, isCursor ? AMBER : 0x3a3524, 1);
      box.bg.strokeRoundedRect(box.x, box.y, 88, 92, 8);

      if (ch) {
        box.bg.fillStyle(AMBER, 0.06);
        box.bg.fillRoundedRect(box.x + 3, box.y + 3, 82, 86, 6);
      }
    });
  }
,
  updateLeds() {
    const s = this.state;
    const blink = this.tickCount % 8 < 4;

    const on = {
      line: s !== 'on_hook',
      dial: s === 'ready' || s === 'dialling',
      ring: s === 'ringing' && blink,
      busy: s === 'busy' && blink,
      live: s === 'connected'
    };

    this.ledViews.forEach(led => {
      const lit = Boolean(on[led.id]);
      led.dot.setFillStyle(led.color, lit ? 1 : 0.18);
      led.glow.setFillStyle(led.color, lit ? 0.35 : 0);
    });
  }

  // ─── Zegar odświeżania (diody, miernik, kursor) ───────────────────────────
,
  startTick() {
    this.stopTick();

    this.tickEvent = this.scene.time.addEvent({
      delay: 110,
      loop: true,
      callback: () => this.onTick()
    });
  }
,
  stopTick() {
    this.tickEvent?.remove(false);
    this.tickEvent = null;
  }
,
  onTick() {
    if (!this.isOpen || this.destroyed || !this.built) return;

    this.tickCount += 1;

    this.updateLeds();
    this.updateVu();

    // Czas rozmowy
    if (this.state === 'connected') {
      const sec = Math.floor((this.scene.time.now - this.callStart) / 1000);
      const mm = String(Math.floor(sec / 60)).padStart(2, '0');
      const ss = String(sec % 60).padStart(2, '0');
      this.timerText.setText(`${mm}:${ss}`);
    } else {
      this.timerText.setText('');
    }

    // Migający kursor na kolejnej cyfrze
    if (this.state === 'ready') {
      const box = this.digitBoxes[this.number.length];

      if (box) {
        box.text.setAlpha(this.tickCount % 8 < 5 ? 1 : 0.35);
      }
    }

    // Pulsujący monit "CONTINUE"
    if (this.prompt.visible) {
      this.prompt.setAlpha(this.tickCount % 8 < 5 ? 1 : 0.55);
    }
  }
,
  updateVu() {
    const g = this.vuGfx;
    if (!g?.scene) return;

    const t = this.tickCount;
    let target;

    switch (this.state) {
      case 'ringing':
        target = t % 14 < 5 ? 0.85 : 0.08;
        break;

      case 'busy':
        target = t % 5 < 2 ? 0.9 : 0.08;
        break;

      case 'connected':
        target = this.typingItem ? 0.35 + Math.random() * 0.6 : 0.12 + Math.random() * 0.3;
        break;

      case 'dialling':
        target = 0.1 + Math.random() * 0.2;
        break;

      case 'ready':
        target = 0.06 + Math.random() * 0.08;
        break;

      default:
        target = 0.04;
    }

    const X = MON_X + 340;
    const Y = MON_Y + 96;
    const H = 92;

    g.clear();

    for (let i = 0; i < VU_BARS; i++) {
      // profil: środek reaguje mocniej
      const profile = 0.55 + 0.45 * Math.sin(((i + 1) / (VU_BARS + 1)) * Math.PI);
      const goal = Math.min(1, target * profile * (0.7 + Math.random() * 0.6));

      this.vuLevels[i] += (goal - this.vuLevels[i]) * 0.55;

      const level = Math.max(0.03, this.vuLevels[i]);
      const barH = Math.round(level * H);
      const color = i >= VU_BARS - 3 ? RED : i >= VU_BARS - 6 ? AMBER : GREEN;

      g.fillStyle(0x0a120e, 1);
      g.fillRect(X + i * 13, Y, 10, H);
      g.fillStyle(color, 0.9);
      g.fillRect(X + i * 13, Y + H - barH, 10, barH);
    }
  }

  // ─── Książka telefoniczna ─────────────────────────────────────────────────
};
