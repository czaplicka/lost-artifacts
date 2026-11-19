import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import {
  ownsNewPIOffice,
  needsOfficeMoveIn
} from '../../managers/PIOfficeShopManager.js';
import { COLORS, seeded, lerpColor } from './ComputerTheme.js';
import { ComputerShell } from './ComputerShell.js';
import { renderAlibiBooks } from './ComputerAlibiBooks.js';

const FILE = 'ui/pi-computer/ComputerMonitor.js';
const t = id => __dialogueText(FILE, id);

const MONITOR_WIDTH = 1120;
const MONITOR_HEIGHT = 800;
const NOTEBOOK_WIDTH = 300;
const WORKSPACE_GAP = 20;
const SCREEN = { x: 48, y: 36, w: 1024, h: 700 };
const TEX_SCAN = 'pi_crt_scanlines';
const TEX_FRAME = 'pi_crt_frame_large_v2';

const ALIBI_APP = 'alibi-books';
const alibiBooksInstalled = () => ownsNewPIOffice() && !needsOfficeMoveIn();

const BOOT_FULL = [
  t('t_a2f191088a61372b32b6'),
  t('t_7f584c81b0be40fc415a'),
  t('t_939126be3cba40c8e59e'),
  t('t_e667591523e1e61a549f'),
  t('t_990eb7d327f9dc347875'),
  t('t_92a351d49abaee557fb6'),
  t('t_7f0f257c63ded9fad866'),
  t('t_6dd7ffa1f9b8e6861d65'),
  t('t_c9b829061a0315e4de0b')
];

const BOOT_QUICK = [
  t('t_9727131c8758932c394b'),
  t('t_033cc3813428cd9108d4'),
  t('t_c9b829061a0315e4de0b')
];

const APP_INFO = {
  audio: { title: t('t_5ddde5a18bc919b6ce35'), color: 0x93ba99, kind: 'audio' },
  mail: { title: t('t_07ed6ccf6bf6393d1868'), color: 0xe6d9ab, kind: 'envelope' },
  ledger: { title: t('t_7401c872d2cd61eeb936'), color: 0xa5c397, kind: 'ledger' },
  [ALIBI_APP]: { title: 'Alibi Books', color: 0xd4af37, kind: 'ledger' },
  classifieds: { title: t('t_c2a15c2c550a91eda017'), color: 0xd1d6d8, kind: 'paper' },
  search: { title: t('t_6f6ca128fbbdf22488f9'), color: 0x9fc9a9, kind: 'owl_search' },
  photo: { title: t('t_c17959fcc266deba71d6'), color: 0xc69d7d, kind: 'board' },
  'office-shop': { title: t('t_a0bf07cb320d609e5d18'), color: 0xd4af37, kind: 'ledger' },
  'office-archive': { title: t('t_57d85826cd5027dbef9c'), color: 0xd4af37, kind: 'ledger' },
  'office-documents': { title: t('t_b4e929d8bcfe04189801'), color: 0xd4af37, kind: 'paper' },
  chat: { title: t('t_e59416b5d53bff12f651'), color: 0x8db7a6, kind: 'chat' },
  thiefdoku: { title: t('t_5cf46358ab38145b427c'), color: 0xc69d7d, kind: 'board' }
};

const APP_TITLES = {
  audio: t('t_a91dc0af41c020f9031a'),
  chat: t('t_82b3592674286f95bc4e'),
  mail: t('t_34844c19e4003f75991a'),
  ledger: t('t_f24e48dd99341885fe80'),
  [ALIBI_APP]: 'Alibi Books',
  classifieds: t('t_8d076ff2a8cfa45bab92')
};

const APP_STATUS = {
  audio: t('t_11b8b36a8745ddaaeec0'),
  mail: t('t_8a729d441d861a78165d'),
  ledger: t('t_b2bc3cf0d66bc332e666'),
  [ALIBI_APP]: 'Company funds only. Every dollar has a witness.',
  classifieds: t('t_44491562bd39e5a236d8'),
  chat: t('t_23f9ad59af1dfc586646')
};

const APP_ACCENT = {
  audio: 0x93ba99,
  desktop: 0x98b9ce,
  mail: 0xe6d9ab,
  ledger: 0xa5c397,
  [ALIBI_APP]: 0xd4af37,
  classifieds: 0xd1d6d8,
  search: 0x9fc9a9,
  chat: 0x8db7a6,
  photo: 0xc69d7d
};

const MENU_ITEMS = [
  { app: 'audio', label: APP_INFO.audio.title, color: 0x93ba99, kind: 'audio' },
  { app: 'mail', label: APP_INFO.mail.title, color: 0xe6d9ab, kind: 'envelope' },
  { app: 'ledger', label: APP_INFO.ledger.title, color: 0xa5c397, kind: 'ledger' },
  { app: ALIBI_APP, label: 'Alibi Books', color: 0xd4af37, kind: 'ledger' },
  { app: 'classifieds', label: APP_INFO.classifieds.title, color: 0xd1d6d8, kind: 'paper' },
  { app: 'search', label: t('t_d04fc7d7e19702f8b611'), color: 0x9fc9a9, kind: 'owl_search' },
  { app: 'office-shop', label: APP_INFO['office-shop'].title, color: 0xd4af37, kind: 'ledger' },
  { app: 'investigations', label: t('t_21476f00fdcfab750c7e'), color: 0xc69d7d, kind: 'board' },
  { app: 'travel', label: t('t_53fb6f891d4e250ec47e'), color: 0x98b9ce, kind: 'globe' },
  { sep: true },
  { app: 'off', label: t('t_5858fcc46968f80e0432'), color: 0xb04a3a, kind: 'power' }
];

const COMPACT_WINDOWS = {
  ledger: { w: 800, h: 560 },
  [ALIBI_APP]: { w: 800, h: 560 }
};

export function createPiShellConfig(ui) {
  const fallback = { x: 60, y: 48, w: 1000, h: 676 };

  return {
    theme: 'pi',
    apps: APP_INFO,
    groups: {
      photo: 'mail',
      'office-shop': 'office',
      'office-archive': 'office',
      'office-documents': 'office'
    },
    sizes: COMPACT_WINDOWS,
    stateKeys: ['selectedId', 'listPage', 'bodyPage', 'notice'],
    defaults: () => ({ selectedId: null, listPage: 0, bodyPage: 0, notice: '' }),
    defaultRect: () => {
      const { x, y, w, h } = ui.layout || fallback;
      return { x: x + 12, y: y + 10, w: w - 24, h: h - 58 };
    },
    area: () => ui.layout || fallback
  };
}

export class ComputerMonitor {
  constructor(ui) {
    this.ui = ui;
    this.fxTargets = [];
    this.bootTimer = null;
    ui.shell = new ComputerShell(ui, createPiShellConfig(ui));
  }

  tween(config) {
    this.fxTargets.push(...[].concat(config.targets));
    return this.ui.scene.tweens.add(config);
  }

  clearFx() {
    const targets = this.fxTargets;
    this.fxTargets = [];
    if (!targets.length) return;
    try {
      this.ui.scene.tweens?.killTweensOf(targets);
    } catch (_) {}
  }

  ensureTextures() {
    const textures = this.ui.scene.textures;

    if (!textures.exists(TEX_SCAN)) {
      const canvas = textures.createCanvas(TEX_SCAN, 4, 4);
      const context = canvas.getContext();
      context.clearRect(0, 0, 4, 4);

      [0, 0, 0.30, 0.12].forEach((alpha, row) => {
        context.fillStyle = `rgba(0,0,0,${alpha})`;
        context.fillRect(0, row, 4, 1);
      });

      canvas.refresh();
    }

    if (!textures.exists(TEX_FRAME)) {
      const { w, h } = SCREEN;
      const canvas = textures.createCanvas(TEX_FRAME, w, h);
      const context = canvas.getContext();

      const gradient = context.createRadialGradient(
        w / 2, h / 2, Math.min(w, h) * 0.35,
        w / 2, h / 2, Math.hypot(w, h) / 2
      );

      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, t('t_7be18e16198b94e74581'));
      context.fillStyle = gradient;
      context.fillRect(0, 0, w, h);
      context.fillStyle = t('t_7ff899da8cf9ca9549eb');
      context.fillRect(0, 0, w, h);

      const radius = 20;
      context.fillStyle = '#07090c';
      context.beginPath();
      context.rect(0, 0, w, h);
      context.moveTo(radius, 0);
      context.lineTo(w - radius, 0);
      context.quadraticCurveTo(w, 0, w, radius);
      context.lineTo(w, h - radius);
      context.quadraticCurveTo(w, h, w - radius, h);
      context.lineTo(radius, h);
      context.quadraticCurveTo(0, h, 0, h - radius);
      context.lineTo(0, radius);
      context.quadraticCurveTo(0, 0, radius, 0);
      context.closePath();
      context.fill('evenodd');
      canvas.refresh();
    }
  }

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
        if (ui.destroyed || !ui.isOpen || ui.suspended ||
            !ui.booting || token !== ui.viewToken) {
          this.stopBoot();
          return;
        }

        ui.bootStep++;
        if (ui.bootStep > ui.bootLines.length) this.finishBoot();
        else this.render();
      }
    });
  }

  stopBoot() {
    if (!this.bootTimer) return;
    try {
      this.bootTimer.remove(false);
    } catch (_) {}
    this.bootTimer = null;
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

  calculateWorkspace() {
    const { width, height } = this.ui.scene.scale;
    const totalWidth = MONITOR_WIDTH + WORKSPACE_GAP + NOTEBOOK_WIDTH;

    const scale = Math.max(0.001, Math.min(
      Math.max(1, width - 16) / totalWidth,
      Math.max(1, height - 16) / MONITOR_HEIGHT
    ));

    const left = (width - totalWidth * scale) / 2;
    const top = (height - MONITOR_HEIGHT * scale) / 2;

    return {
      scale,
      left,
      top,
      notebook: {
        x: left + (MONITOR_WIDTH + WORKSPACE_GAP) * scale,
        y: top + 18 * scale,
        w: NOTEBOOK_WIDTH,
        h: 764
      }
    };
  }

  render() {
    const ui = this.ui;
    if (ui.destroyed || !ui.isOpen || ui.suspended) return;

    this.clearFx();
    ui.content = null;
    ui.root.removeAll(true);

    const { width, height } = ui.scene.scale;
    ui.root.add(
      ui.scene.add.rectangle(0, 0, width, height, 0x090b10, 0.97)
        .setOrigin(0)
        .setInteractive()
    );

    const workspace = this.calculateWorkspace();
    ui.computerWorkspace = workspace;
    ui.content = ui.scene.add.container(workspace.left, workspace.top)
      .setScale(workspace.scale);
    ui.root.add(ui.content);

    this.drawHousing();
    ui.layout = { x: 60, y: 48, w: 1000, h: 676 };

    if (ui.booting) {
      this.drawBoot();
    } else {
      ui.shell.beginFrame();
      this.drawWallpaper();
      ui.desktop.render();
      ui.shell.renderWindows();
      this.drawTaskbar();
      if (ui.menuOpen) this.drawStartMenu();
    }

    this.drawCrtOverlay();
    this.drawMonitorDetails();
    ui.powerOn = false;
  }

  drawHousing() {
    const ui = this.ui;
    const d = ui.drawing;
    d.bevel(20, 10, 1080, 780, COLORS.plastic);
    d.rectangle(25, 14, 1070, 3, 0xe9e5d2, 0.8);
    d.rectangle(25, 778, 1070, 8, 0x000000, 0.12);
    d.bevel(34, 23, 1052, 726, 0x6f7168, true);
    d.bevel(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, 0x0b1016, true);

    const screws = ui.scene.add.graphics();
    d.add(screws);

    [[29, 19], [1091, 19], [29, 781], [1091, 781]].forEach(([x, y], i) => {
      screws.fillStyle(0x9a967f, 1);
      screws.fillCircle(x, y, 5);
      screws.lineStyle(1, 0x1c1e1a, 0.8);
      screws.strokeCircle(x, y, 5);
      screws.lineStyle(2, 0x4a4a40, 1);
      screws.lineBetween(x - 3, y - 1 + i % 2, x + 3, y + 1 - i % 2);
    });
  }

  drawMonitorDetails() {
    const ui = this.ui;
    const d = ui.drawing;

    d.bevel(56, 750, 170, 28, 0x24262a, true);
    d.pixel(69, 758, t('t_3b673ac52b2bff7326ed'), 11, COLORS.gold);
    d.pixel(248, 760, t('t_524ae3a2f4f6f8207127'), 8, '#5d604f');
    d.pixel(416, 760, 'PI-486', 8, '#5d604f');

    d.bevel(506, 750, 84, 28, 0x0f130f, true);
    d.pixel(518, 758, '66', 12, '#6dff8a');
    d.text(548, 758, 'MHz', 12, '#3d8a58');

    for (let i = 0; i < 9; i++) {
      d.rectangle(726 + i * 14, 756, 7, 17, 0x64665b);
      d.rectangle(726 + i * 14, 756, 7, 2, 0x3b3d35);
    }

    d.text(878, 758, 'PWR', 12, '#5d604f');
    const led = d.rectangle(916, 758, 10, 10, 0x6dff8a);
    this.tween({
      targets: led, alpha: 0.4, duration: 900,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
    d.button(960, 750, 'OFF', () => ui.close());
  }

  drawBoot() {
    const ui = this.ui;
    const d = ui.drawing;
    const { x, y, w, h } = ui.layout;
    d.rectangle(x, y, w, h, 0x03060a);

    const g = ui.scene.add.graphics();
    ui.content.add(g);

    const owlX = x + w - 110;
    const owlY = y + 78;

    g.lineStyle(3, 0x7dff9b, 0.9);
    g.strokeCircle(owlX - 22, owlY, 20);
    g.strokeCircle(owlX + 22, owlY, 20);
    g.lineBetween(owlX - 40, owlY - 16, owlX - 32, owlY - 38);
    g.lineBetween(owlX - 32, owlY - 38, owlX - 14, owlY - 22);
    g.lineBetween(owlX + 40, owlY - 16, owlX + 32, owlY - 38);
    g.lineBetween(owlX + 32, owlY - 38, owlX + 14, owlY - 22);
    g.fillStyle(0x7dff9b, 0.9);
    g.fillCircle(owlX - 22, owlY, 8);
    g.fillCircle(owlX + 22, owlY, 8);
    g.fillTriangle(owlX - 7, owlY + 10, owlX + 7, owlY + 10, owlX, owlY + 26);

    const lines = ui.bootLines || BOOT_FULL;
    const shown = Math.min(ui.bootStep, lines.length);

    for (let i = 0; i < shown; i++) {
      const warning = /DENIED|NOT FOUND|missing|off-screen/i.test(lines[i]);
      d.pixel(x + 28, y + 32 + i * 28, lines[i], 11,
        warning ? COLORS.amber : COLORS.phosphor);
    }

    if (shown < lines.length) {
      const cursor = d.rectangle(x + 28, y + 32 + shown * 28, 11, 13, 0x7dff9b);
      this.tween({ targets: cursor, alpha: 0, duration: 260, yoyo: true, repeat: -1 });
    }

    const barWidth = 420;
    const barX = x + 28;
    const barY = y + h - 70;
    d.pixel(barX, barY - 24, t('t_6ef2f20ffec0bf12b3a7'), 9, '#3d8a58');
    d.frame(barX, barY, barWidth, 22, 0x7dff9b, 0.8, 2);

    const ratio = Math.min(1, ui.bootStep / Math.max(1, lines.length));
    d.rectangle(barX + 4, barY + 4, Math.round((barWidth - 8) * ratio), 14, 0x7dff9b, 0.85);
    d.text(x + w - 24, y + h - 34, t('t_4d7f5cbc50d2370746b3'), 14, '#3d5a45')
      .setOrigin(1, 0);

    d.rectangle(x, y, w, h, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.finishBoot());
  }

  drawWallpaper() {
    const ui = this.ui;
    const d = ui.drawing;
    const scene = ui.scene;
    const { x, y, w, h } = ui.layout;
    const desktopHeight = h - 36;
    const key = ui.options.wallpaperKey || 'pi_computer_wallpaper';

    if (!scene.textures.exists(key)) ui.shell.art(key, 'wallpaper_pi.webp');

    if (scene.textures.exists(key)) {
      ui.content.add(
        scene.add.image(x, y, key).setOrigin(0).setDisplaySize(w, desktopHeight)
      );
      return;
    }

    const random = seeded(1993);
    const sky = scene.add.graphics();
    ui.content.add(sky);

    const bands = 18;
    const bandHeight = Math.ceil(desktopHeight / bands);
    const skyAt = value => value < 0.6
      ? lerpColor(0x070d22, 0x1f2f62, value / 0.6)
      : lerpColor(0x1f2f62, 0x7a4b72, (value - 0.6) / 0.4);

    for (let i = 0; i < bands; i++) {
      sky.fillStyle(skyAt(i / (bands - 1)), 1);
      sky.fillRect(
        x, y + i * bandHeight, w,
        Math.min(bandHeight + 1, desktopHeight - i * bandHeight)
      );
    }

    for (let i = 0; i < 80; i++) {
      const starX = Math.floor(x + 4 + random() * (w - 8));
      const starY = Math.floor(y + 4 + random() * desktopHeight * 0.4);
      const big = random() < 0.15;
      const alpha = 0.35 + random() * 0.6;

      if (i < 8) {
        const star = d.rectangle(starX, starY, 3, 3, 0xffffff);
        this.tween({
          targets: star, alpha: 0.15, duration: 700 + i * 180,
          yoyo: true, repeat: -1, delay: i * 230, ease: 'Sine.easeInOut'
        });
      } else {
        sky.fillStyle(0xdfe8ff, alpha);
        sky.fillRect(starX, starY, big ? 3 : 2, big ? 3 : 2);
      }
    }

    const moon = scene.add.graphics();
    ui.content.add(moon);
    const moonX = x + w - 360;
    const moonY = y + 120;

    moon.fillStyle(0xf4e9c4, 0.05);
    moon.fillCircle(moonX, moonY, 80);
    moon.fillStyle(0xf4e9c4, 0.08);
    moon.fillCircle(moonX, moonY, 60);
    moon.fillStyle(0xf1e6c0, 1);
    moon.fillCircle(moonX, moonY, 40);
    moon.fillStyle(0xd9cca3, 1);
    moon.fillCircle(moonX - 12, moonY - 8, 8);
    moon.fillCircle(moonX + 14, moonY + 10, 6);
    moon.fillCircle(moonX + 6, moonY - 18, 4);
    moon.fillStyle(0xaab4d8, 0.10);
    moon.fillRect(moonX - 190, moonY + 30, 150, 6);
    moon.fillRect(moonX + 40, moonY + 62, 170, 5);

    const city = scene.add.graphics();
    ui.content.add(city);
    const baseY = y + desktopHeight;

    this.drawSkyline(city, random, x, w, baseY, {
      color: 0x1a2650, minH: 70, maxH: 170, minW: 28, maxW: 70, windows: 0
    });
    this.drawSkyline(city, random, x, w, baseY, {
      color: 0x101a3a, minH: 90, maxH: 230, minW: 30, maxW: 74, windows: 0.12
    });
    this.drawSkyline(city, random, x, w, baseY, {
      color: 0x080d1c, minH: 60, maxH: 200, minW: 34, maxW: 80, windows: 0.22
    });

    const towerX = x + w - 440;
    const towerWidth = 120;
    const towerHeight = 270;

    city.fillStyle(0x070b18, 1);
    city.fillRect(towerX, baseY - towerHeight, towerWidth, towerHeight);

    for (let wy = baseY - towerHeight + 12; wy < baseY - 10; wy += 16) {
      for (let wx = towerX + 8; wx < towerX + towerWidth - 10; wx += 13) {
        if (random() < 0.3) {
          city.fillStyle(0xffd77a, 0.5 + random() * 0.45);
          city.fillRect(wx, wy, 6, 8);
        }
      }
    }

    city.fillStyle(0x2a2f45, 1);
    city.fillRect(towerX + 20, baseY - towerHeight - 18, 4, 18);
    city.fillRect(towerX + 96, baseY - towerHeight - 18, 4, 18);

    const neon = d.pixel(towerX + 24, baseY - towerHeight - 44, 'OWL', 22, '#ff8ad4');
    neon.setShadow(0, 0, '#ff3ea5', 12, false, true);
    this.tween({
      targets: neon, alpha: 0.55, duration: 650,
      yoyo: true, repeat: -1, hold: 1400, ease: 'Sine.easeInOut'
    });
  }

  drawSkyline(g, random, x, width, baseY, options) {
    let cursorX = x - 12;

    while (cursorX < x + width) {
      const bw = Math.floor(options.minW + random() * (options.maxW - options.minW));
      const bh = Math.floor(options.minH + random() * (options.maxH - options.minH));
      const left = Math.max(cursorX, x);
      const right = Math.min(cursorX + bw, x + width);

      if (right > left) {
        g.fillStyle(options.color, 1);
        g.fillRect(left, baseY - bh, right - left, bh);

        const middle = Math.floor(cursorX + bw / 2);
        if (random() < 0.25 && middle > x + 2 && middle < x + width - 2) {
          g.fillRect(middle - 1, baseY - bh - 16, 2, 16);
        }

        if (options.windows) {
          for (let wy = baseY - bh + 9; wy < baseY - 8; wy += 15) {
            for (let wx = cursorX + 6; wx < cursorX + bw - 9; wx += 11) {
              if (wx < x || wx + 5 > x + width) continue;
              if (random() < options.windows) {
                g.fillStyle(random() < 0.82 ? 0xffd77a : 0x8fd4ff, 0.5 + random() * 0.45);
                g.fillRect(wx, wy, 5, 7);
              }
            }
          }
        }
      }

      cursorX += bw + Math.floor(random() * 5);
    }
  }

  drawTaskbar() {
    const ui = this.ui;
    const d = ui.drawing;

    ui.shell.drawTaskbar(ui.layout, {
      startLabel: 'START',
      startIcon: 'owl',
      startWidth: 116,
      trayWidth: 262,
      drawTray: (trayX, taskbarY, trayWidth) => {
        const balance = ui.ledger.getBalance();
        d.pixel(trayX + 12, taskbarY + 14,
          balance === null ? 'N/A' : ui.money(balance), 9, '#7dff9b');
        d.rectangle(trayX + trayWidth - 100, taskbarY + 8, 2, 20, 0x2b4f7e);
        d.pixel(trayX + trayWidth - 12, taskbarY + 14, this.clockText(), 9, '#f4efd8')
          .setOrigin(1, 0);
      }
    });
  }

  clockText() {
    const custom = this.ui.options.getTimeText?.();
    if (custom) return String(custom);

    try {
      return new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (_) {
      return '--:--';
    }
  }

  drawStartMenu() {
    const ui = this.ui;
    const installed = alibiBooksInstalled();
    const items = MENU_ITEMS.filter(item => item.app !== ALIBI_APP || installed);

    ui.shell.drawStartMenu(ui.layout, items, item => {
      if (item.app === 'off') {
        ui.close();
        return;
      }
      ui.openApp(item.app);
      if (ui.isOpen && !ui.suspended && ui.menuOpen === false) ui.render();
    }, t('t_d5bd2ff79b6dd03772bc'));
  }

  renderApplication() {
    const ui = this.ui;
    const d = ui.drawing;
    const { x, y, w, h } = ui.layout;

    ui.window = ui.shell.rectFor({ x: x + 12, y: y + 10, w: w - 24, h: h - 58 });

    const box = ui.window;
    const accent = APP_ACCENT[ui.app] || APP_ACCENT.desktop;

    d.rectangle(box.x + 6, box.y + 6, box.w, box.h, 0x050a10, 0.45);
    d.bevel(box.x, box.y, box.w, box.h, COLORS.window);
    d.rectangle(box.x + 4, box.y + 4, box.w - 8, 34, COLORS.titlebar);
    d.rectangle(box.x + 4, box.y + 4, box.w - 8, 14, COLORS.titlebarLight, 0.55);
    d.rectangle(box.x + 4, box.y + 36, box.w - 8, 2, 0x16304d);
    d.rectangle(box.x + 12, box.y + 13, 14, 14, accent);
    d.frame(box.x + 12, box.y + 13, 14, 14, 0x0e1822, 1, 2);

    const title = d.pixel(
      box.x + 34, box.y + 15,
      APP_TITLES[ui.app] || t('t_e7ad522ea327e5ba9553'),
      11, COLORS.titleText
    );

    const stripeX = box.x + 34 + title.width + 14;
    const stripeEnd = box.x + box.w - 120;

    if (stripeEnd > stripeX) {
      for (let i = 0; i < 5; i++) {
        d.rectangle(stripeX, box.y + 9 + i * 5, stripeEnd - stripeX,
          2, COLORS.titlebarLight, 0.7);
      }
    }

    d.button(box.x + box.w - 48, box.y + 6, 'X', () => ui.openApp('desktop'));

    switch (ui.app) {
      case 'audio':
        ui.audioApp.render();
        break;
      case 'ledger':
        ui.ledger.render();
        break;
      case ALIBI_APP:
        if (alibiBooksInstalled()) {
          renderAlibiBooks(ui);
        } else {
          d.text(box.x + 20, box.y + 58,
            'Alibi Books is installed after you move into the new PI office.',
            16, COLORS.text, box.w - 40);
        }
        break;
      case 'thiefdoku':
        ui.thiefdoku.render();
        break;
      case 'chat':
        ui.chatApp.render();
        break;
      default:
        ui.documents.render();
        break;
    }

    d.bevel(box.x + 8, box.y + box.h - 35, box.w - 16, 26, 0xc3c2b7, true);
    d.text(box.x + 16, box.y + box.h - 30,
      ui.notice || APP_STATUS[ui.app] || '', 13, '#3a3428', box.w - 32);
  }

  drawCrtOverlay() {
    const ui = this.ui;
    const scene = ui.scene;
    this.ensureTextures();

    const { x, y, w, h } = SCREEN;
    const scan = scene.add.tileSprite(x, y, w, h, TEX_SCAN).setOrigin(0);
    ui.content.add(scan);
    this.tween({ targets: scan, alpha: 0.6, duration: 1400, yoyo: true, repeat: -1 });

    const band = scene.add.rectangle(x, y, w, 64, 0xbfffd0, 0.025).setOrigin(0);
    ui.content.add(band);
    this.tween({
      targets: band, y: y + h - 64, duration: 5200,
      repeat: -1, repeatDelay: 2400, ease: 'Linear'
    });

    const glare = scene.add.graphics();
    ui.content.add(glare);
    glare.fillStyle(0xffffff, 0.025);
    glare.fillPoints([
      { x: x + 26, y: y + 22 },
      { x: x + 330, y: y + 22 },
      { x: x + 170, y: y + 250 },
      { x: x + 26, y: y + 250 }
    ], true);

    ui.content.add(scene.add.image(x, y, TEX_FRAME).setOrigin(0));
  }
}