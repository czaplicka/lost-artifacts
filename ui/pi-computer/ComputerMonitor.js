import { COLORS, DESIGN_WIDTH, DESIGN_HEIGHT, seeded, lerpColor } from './ComputerTheme.js';

const SCREEN = { x: 67, y: 49, w: 986, h: 595 };
const TEX_SCAN = 'pi_crt_scanlines';
const TEX_FRAME = 'pi_crt_frame';

const BOOT_FULL = [
  'NIGHT OWL BIOS v4.86  (C) 1993 Night Owl Ltd.',
  'CPU: 486DX2 @ 66MHz ........ OK',
  'Memory test: 4096K ........ OK (nobody needs more)',
  'Detecting coffee ........ 1 cup, lukewarm',
  'Checking conscience ........ NOT FOUND, continuing',
  'Mounting C:\\CASEFILES ........ OK',
  'Mounting D:\\EXWIFE ........ ACCESS DENIED',
  'Loading NIGHT OWL OS ........',
  'Welcome back, detective.'
];

const BOOT_QUICK = [
  'Resuming from hibernation ........ OK',
  'Re-checking conscience ........ still missing',
  'Welcome back, detective.'
];

const APP_NAMES = {
  desktop: 'Night Owl OS', mail: 'Mail', ledger: 'Personal Ledger', classifieds: 'Classifieds'
};
const APP_TITLES = {
  mail: 'Mail — Private correspondence',
  ledger: 'Personal Ledger — Private funds',
  classifieds: 'Classifieds — City notices'
};
const APP_STATUS = {
  mail: 'Private correspondence. Spam folder: 14,212 items.',
  ledger: 'Personal funds — separate from agency finances (the agency has none).',
  classifieds: 'Local notices and private enquiries. Please do not call about the llama.'
};
const APP_ACCENT = { desktop: 0x98b9ce, mail: 0xe6d9ab, ledger: 0xa5c397, classifieds: 0xd1d6d8 };

const MENU_ITEMS = [
  { app: 'mail', label: 'Mail', color: 0xe6d9ab },
  { app: 'ledger', label: 'Personal Ledger', color: 0xa5c397 },
  { app: 'classifieds', label: 'Classifieds', color: 0xd1d6d8 },
  { app: 'investigations', label: 'Investigations', color: 0xc69d7d },
  { app: 'travel', label: 'World Travel', color: 0x98b9ce },
  { sep: true },
  { app: 'off', label: 'Shut Down...', color: 0xb04a3a }
];

export class ComputerMonitor {
  constructor(ui) {
    this.ui = ui;
    this.fxTargets = [];
    this.bootTimer = null;
  }

  // ---------------------------------------------------------------- effects
  tween(config) {
    this.fxTargets.push(...[].concat(config.targets));
    return this.ui.scene.tweens.add(config);
  }

  clearFx() {
    const targets = this.fxTargets;
    this.fxTargets = [];
    if (!targets.length) return;
    try { this.ui.scene.tweens?.killTweensOf(targets); } catch (e) { /* scene shutting down */ }
  }

  ensureTextures() {
    const tm = this.ui.scene.textures;
    if (!tm.exists(TEX_SCAN)) {
      const c = tm.createCanvas(TEX_SCAN, 4, 4);
      const ctx = c.getContext();
      ctx.clearRect(0, 0, 4, 4);
      [0, 0, 0.30, 0.12].forEach((a, row) => {
        ctx.fillStyle = `rgba(0,0,0,${a})`;
        ctx.fillRect(0, row, 4, 1);
      });
      c.refresh();
    }
    if (!tm.exists(TEX_FRAME)) {
      const { w, h } = SCREEN;
      const c = tm.createCanvas(TEX_FRAME, w, h);
      const ctx = c.getContext();
      const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) / 2);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(120,255,160,0.025)';
      ctx.fillRect(0, 0, w, h);
      // Rounded-corner mask (even-odd: fill everything OUTSIDE the rounded rectangle).
      const r = 30;
      ctx.fillStyle = '#07090c';
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.moveTo(r, 0);
      ctx.lineTo(w - r, 0);
      ctx.quadraticCurveTo(w, 0, w, r);
      ctx.lineTo(w, h - r);
      ctx.quadraticCurveTo(w, h, w - r, h);
      ctx.lineTo(r, h);
      ctx.quadraticCurveTo(0, h, 0, h - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      ctx.fill('evenodd');
      c.refresh();
    }
  }

  // ------------------------------------------------------------------- boot
  startBoot() {
    const ui = this.ui;
    this.stopBoot();
    ui.booting = true;
    ui.bootStep = 0;
    ui.bootLines = ui.hasBooted ? BOOT_QUICK : BOOT_FULL;
    const token = ui.viewToken;
    this.bootTimer = ui.scene.time.addEvent({
      delay: ui.hasBooted ? 200 : 260,
      repeat: ui.bootLines.length,
      callback: () => {
        if (ui.destroyed || !ui.isOpen || ui.suspended || !ui.booting || token !== ui.viewToken) {
          this.stopBoot();
          return;
        }
        ui.bootStep += 1;
        if (ui.bootStep > ui.bootLines.length) this.finishBoot();
        else this.render();
      }
    });
  }

  stopBoot() {
    if (this.bootTimer) {
      try { this.bootTimer.remove(false); } catch (e) { /* already removed */ }
      this.bootTimer = null;
    }
  }

  finishBoot() {
    const ui = this.ui;
    this.stopBoot();
    if (!ui.booting) return;
    ui.booting = false;
    ui.hasBooted = true;
    ui.notice = '';
    this.render();
  }

  // ----------------------------------------------------------------- render
  render() {
    const ui = this.ui;
    if (ui.destroyed || !ui.isOpen || ui.suspended) return;
    this.clearFx();
    ui.content = null;
    ui.root.removeAll(true);
    const { width, height } = ui.scene.scale;
    ui.root.add(ui.scene.add.rectangle(0, 0, width, height, 0x090b10, 0.94)
      .setOrigin(0).setInteractive());
    const scale = Math.max(0.01, Math.min(
      Math.max(1, width - 16) / DESIGN_WIDTH,
      Math.max(1, height - 16) / DESIGN_HEIGHT
    ));
    const left = (width - DESIGN_WIDTH * scale) / 2;
    const top = (height - DESIGN_HEIGHT * scale) / 2;
    ui.content = ui.scene.add.container(left, top).setScale(scale);
    ui.root.add(ui.content);

    this.drawHousing();
    ui.layout = { x: 78, y: 60, w: 964, h: 572 };

    if (ui.booting) {
      this.drawBoot();
    } else {
      this.drawWallpaper();
      this.drawTaskbar();
      if (ui.app === 'desktop') ui.desktop.render();
      else this.renderApplication();
      if (ui.menuOpen) this.drawStartMenu();
    }
    this.drawCrtOverlay();
    this.drawMonitorDetails();

    if (ui.powerOn) {
      ui.powerOn = false;
      ui.content.setScale(scale, scale * 0.02);
      ui.content.y = height / 2 - (DESIGN_HEIGHT * scale * 0.02) / 2;
      this.tween({ targets: ui.content, scaleY: scale, y: top, duration: 190, ease: 'Cubic.easeOut' });
    }
  }

  // ---------------------------------------------------------------- housing
  drawHousing() {
    const ui = this.ui;
    const d = ui.drawing;
    const scene = ui.scene;
    const rnd = seeded(77);

    // Desk
    d.rectangle(0, 735, 1120, 65, 0x382b28);
    d.rectangle(0, 735, 1120, 8, 0x765443);
    d.rectangle(0, 743, 1120, 3, 0x1c1412, 0.5);
    for (let i = 0; i < 18; i++) {
      d.rectangle(Math.floor(rnd() * 1120), 750 + Math.floor(rnd() * 46),
        60 + Math.floor(rnd() * 160), 1, 0x120d0b, 0.35);
    }
    d.rectangle(95, 725, 930, 20, 0x17191b, 0.6);

    // Stand
    d.bevel(465, 704, 190, 39, 0x8f8d80);
    d.bevel(380, 741, 360, 27, 0xa8a697);

    // Desk props: coffee mug (with steam) and a pencil
    d.rectangle(880, 752, 36, 30, 0xe8e2cf);
    d.rectangle(883, 753, 30, 5, 0x4a2c1a);
    d.frame(880, 752, 36, 30, COLORS.ink, 0.9, 2);
    const handle = scene.add.graphics();
    d.add(handle);
    handle.lineStyle(4, 0xe8e2cf, 1);
    handle.strokeCircle(922, 767, 8);
    for (let i = 0; i < 3; i++) {
      const steam = d.rectangle(887 + i * 9, 742, 3, 9, 0xe8e2cf, 0.5);
      this.tween({ targets: steam, y: 722, alpha: 0, duration: 1500, repeat: -1, delay: i * 420, ease: 'Sine.easeOut' });
    }
    d.rectangle(150, 772, 96, 6, 0xe0b44c).setAngle(-3);
    d.rectangle(150, 772, 12, 6, 0xe58f8f).setAngle(-3);

    // Monitor body
    d.bevel(35, 18, 1050, 694, COLORS.plastic);
    d.rectangle(40, 22, 1040, 3, 0xe9e5d2, 0.8);
    d.rectangle(40, 700, 1040, 8, 0x000000, 0.12);
    d.bevel(52, 35, 1016, 627, 0x6f7168, true);
    d.bevel(67, 49, 986, 595, 0x0b1016, true);

    // Screws
    const g = scene.add.graphics();
    d.add(g);
    [[44, 27], [1076, 27], [44, 703], [1076, 703]].forEach(([px, py], i) => {
      g.fillStyle(0x9a967f, 1);
      g.fillCircle(px, py, 5);
      g.lineStyle(1, 0x1c1e1a, 0.8);
      g.strokeCircle(px, py, 5);
      g.lineStyle(2, 0x4a4a40, 1);
      g.lineBetween(px - 3, py - 1 + (i % 2), px + 3, py + 1 - (i % 2));
    });
  }

  drawMonitorDetails() {
    const ui = this.ui;
    const d = ui.drawing;
    // Brand plate
    d.bevel(70, 668, 170, 30, 0x24262a, true);
    d.pixel(83, 677, 'NIGHT OWL', 11, COLORS.gold);
    d.pixel(262, 678, 'PERSONAL COMPUTER', 8, '#5d604f');
    d.pixel(430, 678, 'PI-486', 8, '#5d604f');
    // Turbo display
    d.bevel(520, 668, 84, 30, 0x0f130f, true);
    d.pixel(532, 677, '66', 12, '#6dff8a');
    d.text(562, 677, 'MHz', 12, '#3d8a58');
    // Vents
    for (let i = 0; i < 9; i++) {
      d.rectangle(740 + i * 14, 675, 7, 17, 0x64665b);
      d.rectangle(740 + i * 14, 675, 7, 2, 0x3b3d35);
    }
    // Power LED
    d.text(892, 678, 'PWR', 12, '#5d604f');
    const led = d.rectangle(930, 678, 10, 10, 0x6dff8a);
    this.tween({ targets: led, alpha: 0.4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    d.button(960, 668, 'OFF', () => ui.close());
  }

  // ------------------------------------------------------------------- boot
  drawBoot() {
    const ui = this.ui;
    const d = ui.drawing;
    const { x, y, w, h } = ui.layout;
    d.rectangle(x, y, w, h, 0x03060a);

    // Owl logo
    const g = ui.scene.add.graphics();
    ui.content.add(g);
    const ox = x + w - 110;
    const oy = y + 78;
    g.lineStyle(3, 0x7dff9b, 0.9);
    g.strokeCircle(ox - 22, oy, 20);
    g.strokeCircle(ox + 22, oy, 20);
    g.lineBetween(ox - 40, oy - 16, ox - 32, oy - 38);
    g.lineBetween(ox - 32, oy - 38, ox - 14, oy - 22);
    g.lineBetween(ox + 40, oy - 16, ox + 32, oy - 38);
    g.lineBetween(ox + 32, oy - 38, ox + 14, oy - 22);
    g.fillStyle(0x7dff9b, 0.9);
    g.fillCircle(ox - 22, oy, 8);
    g.fillCircle(ox + 22, oy, 8);
    g.fillTriangle(ox - 7, oy + 10, ox + 7, oy + 10, ox, oy + 26);

    const lines = ui.bootLines || BOOT_FULL;
    const shown = Math.min(ui.bootStep, lines.length);
    for (let i = 0; i < shown; i++) {
      const warn = /DENIED|NOT FOUND|missing|lukewarm/i.test(lines[i]);
      d.pixel(x + 28, y + 32 + i * 28, lines[i], 11, warn ? COLORS.amber : COLORS.phosphor);
    }
    if (shown < lines.length) {
      const cursor = d.rectangle(x + 28, y + 32 + shown * 28, 11, 13, 0x7dff9b);
      this.tween({ targets: cursor, alpha: 0, duration: 260, yoyo: true, repeat: -1 });
    }

    const bw = 420;
    const bx = x + 28;
    const by = y + h - 70;
    d.pixel(bx, by - 24, 'LOADING NIGHT OWL OS', 9, '#3d8a58');
    d.frame(bx, by, bw, 22, 0x7dff9b, 0.8, 2);
    const ratio = Math.min(1, ui.bootStep / Math.max(1, lines.length));
    d.rectangle(bx + 4, by + 4, Math.round((bw - 8) * ratio), 14, 0x7dff9b, 0.85);
    d.text(x + w - 24, y + h - 34, 'click to skip', 14, '#3d5a45').setOrigin(1, 0);

    d.rectangle(x, y, w, h, 0x000000, 0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.finishBoot());
  }

  // -------------------------------------------------------------- wallpaper
  drawWallpaper() {
    const ui = this.ui;
    const d = ui.drawing;
    const scene = ui.scene;
    const { x, y, w, h } = ui.layout;
    const dh = h - 36;
    const key = ui.options.wallpaperKey || 'pi_computer_wallpaper';
    if (scene.textures.exists(key)) {
      ui.content.add(scene.add.image(x, y, key).setOrigin(0).setDisplaySize(w, dh));
      return;
    }

    const rnd = seeded(1993);
    const sky = scene.add.graphics();
    ui.content.add(sky);

    // Sky gradient
    const bands = 18;
    const bh = Math.ceil(dh / bands);
    const skyAt = t => (t < 0.6
      ? lerpColor(0x070d22, 0x1f2f62, t / 0.6)
      : lerpColor(0x1f2f62, 0x7a4b72, (t - 0.6) / 0.4));
    for (let i = 0; i < bands; i++) {
      sky.fillStyle(skyAt(i / (bands - 1)), 1);
      sky.fillRect(x, y + i * bh, w, bh + 1);
    }

    // Stars (8 twinkle)
    const twinkles = [];
    for (let i = 0; i < 80; i++) {
      const sx = Math.floor(x + 4 + rnd() * (w - 8));
      const sy = Math.floor(y + 4 + rnd() * dh * 0.4);
      const big = rnd() < 0.15;
      const a = 0.35 + rnd() * 0.6;
      if (i < 8) {
        twinkles.push(d.rectangle(sx, sy, 3, 3, 0xffffff, 1));
      } else {
        sky.fillStyle(0xdfe8ff, a);
        sky.fillRect(sx, sy, big ? 3 : 2, big ? 3 : 2);
      }
    }
    twinkles.forEach((s, i) => this.tween({
      targets: s, alpha: 0.15, duration: 700 + i * 180, yoyo: true, repeat: -1, delay: i * 230, ease: 'Sine.easeInOut'
    }));

    // Moon + clouds (drawn into a separate layer above the twinkles)
    const moon = scene.add.graphics();
    ui.content.add(moon);
    const mx = x + w - 360;
    const my = y + 120;
    moon.fillStyle(0xf4e9c4, 0.05);
    moon.fillCircle(mx, my, 80);
    moon.fillStyle(0xf4e9c4, 0.08);
    moon.fillCircle(mx, my, 60);
    moon.fillStyle(0xf1e6c0, 1);
    moon.fillCircle(mx, my, 40);
    moon.fillStyle(0xd9cca3, 1);
    moon.fillCircle(mx - 12, my - 8, 8);
    moon.fillCircle(mx + 14, my + 10, 6);
    moon.fillCircle(mx + 6, my - 18, 4);
    moon.fillStyle(0xaab4d8, 0.10);
    moon.fillRect(mx - 190, my + 30, 150, 6);
    moon.fillRect(mx - 160, my + 24, 80, 6);
    moon.fillRect(mx + 40, my + 62, 170, 5);
    moon.fillRect(x + 360, y + 60, 120, 5);

    // Skyline
    const city = scene.add.graphics();
    ui.content.add(city);
    const baseY = y + dh;
    this.drawSkyline(city, rnd, x, w, baseY, { color: 0x1a2650, minH: 70, maxH: 170, minW: 28, maxW: 70, windows: 0 });
    this.drawSkyline(city, rnd, x, w, baseY, { color: 0x101a3a, minH: 90, maxH: 230, minW: 30, maxW: 74, windows: 0.12 });
    this.drawSkyline(city, rnd, x, w, baseY, { color: 0x080d1c, minH: 60, maxH: 200, minW: 34, maxW: 80, windows: 0.22 });

    // The agency's own tower with neon sign
    const tx = x + w - 440;
    const tw = 120;
    const th = 270;
    city.fillStyle(0x070b18, 1);
    city.fillRect(tx, baseY - th, tw, th);
    for (let wy = baseY - th + 12; wy < baseY - 10; wy += 16) {
      for (let wx = tx + 8; wx < tx + tw - 10; wx += 13) {
        if (rnd() < 0.3) {
          city.fillStyle(0xffd77a, 0.5 + rnd() * 0.45);
          city.fillRect(wx, wy, 6, 8);
        }
      }
    }
    city.fillStyle(0x2a2f45, 1);
    city.fillRect(tx + 20, baseY - th - 18, 4, 18);
    city.fillRect(tx + 96, baseY - th - 18, 4, 18);
    const neon = d.pixel(tx + 24, baseY - th - 44, 'OWL', 22, '#ff8ad4');
    neon.setShadow(0, 0, '#ff3ea5', 12, false, true);
    this.tween({ targets: neon, alpha: 0.55, duration: 650, yoyo: true, repeat: -1, hold: 1400, ease: 'Sine.easeInOut' });
  }

  drawSkyline(g, rnd, x, w, baseY, o) {
    let cx = x - 12;
    while (cx < x + w) {
      const bw = Math.floor(o.minW + rnd() * (o.maxW - o.minW));
      const bh = Math.floor(o.minH + rnd() * (o.maxH - o.minH));
      const l = Math.max(cx, x);
      const r = Math.min(cx + bw, x + w);
      if (r > l) {
        g.fillStyle(o.color, 1);
        g.fillRect(l, baseY - bh, r - l, bh);
        const mid = Math.floor(cx + bw / 2);
        if (rnd() < 0.25 && mid > x + 2 && mid < x + w - 2) g.fillRect(mid - 1, baseY - bh - 16, 2, 16);
        if (o.windows) {
          for (let wy = baseY - bh + 9; wy < baseY - 8; wy += 15) {
            for (let wx = cx + 6; wx < cx + bw - 9; wx += 11) {
              if (wx < x || wx + 5 > x + w) continue;
              if (rnd() < o.windows) {
                g.fillStyle(rnd() < 0.82 ? 0xffd77a : 0x8fd4ff, 0.5 + rnd() * 0.45);
                g.fillRect(wx, wy, 5, 7);
              }
            }
          }
        }
      }
      cx += bw + Math.floor(rnd() * 5);
    }
  }

  // ---------------------------------------------------------------- taskbar
  drawTaskbar() {
    const ui = this.ui;
    const d = ui.drawing;
    const { x, y, w, h } = ui.layout;
    const ty = y + h - 36;
    d.bevel(x, ty, w, 36, 0xc8c5b9);

    // START button
    d.bevel(x + 4, ty + 4, 116, 28, 0xd0cec6, ui.menuOpen);
    const g = ui.scene.add.graphics();
    ui.content.add(g);
    const gx = x + 24;
    const gy = ty + 17;
    g.fillStyle(0x294b70, 1);
    g.fillCircle(gx - 6, gy, 7);
    g.fillCircle(gx + 6, gy, 7);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(gx - 6, gy, 4);
    g.fillCircle(gx + 6, gy, 4);
    g.fillStyle(0x111111, 1);
    g.fillCircle(gx - 6, gy, 2);
    g.fillCircle(gx + 6, gy, 2);
    g.fillStyle(0xd4af37, 1);
    g.fillTriangle(gx - 3, gy + 5, gx + 3, gy + 5, gx, gy + 11);
    d.pixel(x + 44, ty + 13, 'START', 10, COLORS.text);
    d.rectangle(x + 4, ty + 4, 116, 28, 0xffffff, 0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        ui.options.onSfx?.('click');
        ui.menuOpen = !ui.menuOpen;
        ui.render();
      });

    d.rectangle(x + 126, ty + 5, 2, 26, 0x8d8b80);

    // Active window
    d.bevel(x + 134, ty + 5, 230, 26, 0xb4b5ad, true);
    d.rectangle(x + 143, ty + 11, 14, 14, APP_ACCENT[ui.app] || APP_ACCENT.desktop);
    d.frame(x + 143, ty + 11, 14, 14, COLORS.ink, 1, 2);
    d.pixel(x + 166, ty + 14, APP_NAMES[ui.app] || APP_NAMES.desktop, 9, '#333c3c');
    if (ui.app !== 'desktop') {
      d.rectangle(x + 134, ty + 5, 230, 26, 0xffffff, 0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => ui.openApp('desktop'));
    }

    // Tray: cash + clock
    const trayW = 262;
    const trayX = x + w - trayW - 4;
    d.bevel(trayX, ty + 4, trayW, 28, 0xb4b5ad, true);
    const balance = ui.ledger.getBalance();
    d.pixel(trayX + 12, ty + 14, balance === null ? 'N/A' : ui.money(balance), 9, '#2f4a33');
    d.rectangle(trayX + trayW - 100, ty + 8, 2, 20, 0x8d8b80);
    d.pixel(trayX + trayW - 12, ty + 14, this.clockText(), 9, COLORS.text).setOrigin(1, 0);
  }

  clockText() {
    const custom = this.ui.options.getTimeText?.();
    if (custom) return String(custom);
    try {
      return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch (e) {
      return '--:--';
    }
  }

  drawStartMenu() {
    const ui = this.ui;
    const d = ui.drawing;
    const { x, y, w, h } = ui.layout;
    const ty = y + h - 36;

    // Click-away catcher (covers everything above the taskbar)
    d.rectangle(x, y, w, h - 36, 0x000000, 0).setInteractive()
      .on('pointerdown', () => { ui.menuOpen = false; ui.render(); });

    const itemH = 38;
    const sepH = 14;
    const stripW = 36;
    const mw = 276;
    const mh = 10 + MENU_ITEMS.reduce((sum, it) => sum + (it.sep ? sepH : itemH), 0);
    const mx = x + 4;
    const my = ty - mh - 2;
    d.rectangle(mx + 6, my + 6, mw, mh, 0x050a10, 0.45);
    d.bevel(mx, my, mw, mh, 0xd0cec6);
    d.rectangle(mx + 5, my + 5, stripW, mh - 10, 0x1d3a5e);
    const brand = d.pixel(0, 0, 'NIGHT OWL OS', 10, COLORS.gold);
    brand.setAngle(-90).setPosition(mx + 5 + Math.round((stripW - brand.height) / 2), my + mh - 14);

    const ix = mx + 5 + stripW;
    const iw = mw - 10 - stripW;
    let iy = my + 5;
    MENU_ITEMS.forEach(item => {
      if (item.sep) {
        d.rectangle(ix + 6, iy + 6, iw - 12, 1, 0x8d8b80);
        d.rectangle(ix + 6, iy + 7, iw - 12, 1, 0xfbf8ec);
        iy += sepH;
        return;
      }
      const row = d.rectangle(ix, iy, iw, itemH, 0x294b70, 0).setInteractive({ useHandCursor: true });
      d.rectangle(ix + 12, iy + 10, 18, 18, item.color);
      d.frame(ix + 12, iy + 10, 18, 18, COLORS.ink, 1, 2);
      const label = d.text(ix + 42, iy + 9, item.label, 17, COLORS.text);
      row.on('pointerover', () => { row.setFillStyle(0x294b70, 1); label.setColor('#ffffff'); })
        .on('pointerout', () => { row.setFillStyle(0x294b70, 0); label.setColor(COLORS.text); })
        .on('pointerdown', () => {
          ui.options.onSfx?.('click');
          ui.menuOpen = false;
          if (item.app === 'off') { ui.close(); return; }
          ui.render();
          ui.openApp(item.app);
        });
      iy += itemH;
    });
  }

  // ------------------------------------------------------------ application
  renderApplication() {
    const ui = this.ui;
    const d = ui.drawing;
    const { x, y, w, h } = ui.layout;
    ui.window = { x: x + 24, y: y + 18, w: w - 48, h: h - 74 };
    const box = ui.window;

    d.rectangle(box.x + 8, box.y + 8, box.w, box.h, 0x050a10, 0.45);
    d.bevel(box.x, box.y, box.w, box.h, COLORS.window);
    d.rectangle(box.x + 4, box.y + 4, box.w - 8, 34, COLORS.titlebar);

    d.rectangle(box.x + 12, box.y + 13, 14, 14, APP_ACCENT[ui.app] || APP_ACCENT.desktop);
    d.frame(box.x + 12, box.y + 13, 14, 14, 0x0e1822, 1, 2);
    const title = d.pixel(box.x + 34, box.y + 15, APP_TITLES[ui.app] || 'Application', 11, COLORS.titleText);
    const sx = box.x + 34 + title.width + 14;
    const ex = box.x + box.w - 60;
    if (ex > sx) {
      for (let i = 0; i < 5; i++) d.rectangle(sx, box.y + 9 + i * 5, ex - sx, 2, COLORS.titlebarLight, 0.7);
    }
    d.button(box.x + box.w - 48, box.y + 6, 'X', () => ui.openApp('desktop'));

    if (ui.app === 'ledger') ui.ledger.render();
    else ui.documents.render();

    d.bevel(box.x + 8, box.y + box.h - 35, box.w - 16, 26, 0xc3c2b7, true);
    d.text(box.x + 16, box.y + box.h - 30, ui.notice || APP_STATUS[ui.app] || '', 13, '#3a3428', box.w - 32);
  }

  // -------------------------------------------------------------------- CRT
  drawCrtOverlay() {
    const ui = this.ui;
    const scene = ui.scene;
    this.ensureTextures();
    const { x, y, w, h } = SCREEN;
    const add = object => ui.content.add(object);

    const scan = scene.add.tileSprite(x, y, w, h, TEX_SCAN).setOrigin(0);
    add(scan);
    this.tween({ targets: scan, alpha: 0.7, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const band = scene.add.rectangle(x, y, w, 64, 0xbfffd0, 0.04).setOrigin(0);
    add(band);
    this.tween({ targets: band, y: y + h - 64, duration: 5200, repeat: -1, repeatDelay: 2400, ease: 'Linear' });

    const glare = scene.add.graphics();
    add(glare);
    glare.fillStyle(0xffffff, 0.045);
    glare.fillPoints([
      { x: x + 26, y: y + 22 }, { x: x + 330, y: y + 22 },
      { x: x + 170, y: y + 250 }, { x: x + 26, y: y + 250 }
    ], true);
    glare.fillStyle(0xffffff, 0.03);
    glare.fillPoints([
      { x: x + 350, y: y + 22 }, { x: x + 420, y: y + 22 },
      { x: x + 260, y: y + 250 }, { x: x + 190, y: y + 250 }
    ], true);

    add(scene.add.image(x, y, TEX_FRAME).setOrigin(0));
  }
}