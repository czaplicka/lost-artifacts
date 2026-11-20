import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// ui/RoadTripDestinationsUI.js
//
// Parchment "county map" for the funny road-trip towns.
// Same look and API shape as PIOfficeDestinationsUI / DestinationsUI
// (theme 'pi': overlay, parchment map, red-X pins, ledger info panel
// bottom-right, typewriter notes bottom-left), but standalone: the world map
// painter is not used because the towns are fictional.
//
// Usage (e.g. from the PI office computer):
//
//   this.roadTripUI = new RoadTripDestinationsUI(this, {
//     onClose: ({ returnToComputer }) => { ... },
//     // Decide where the mission for the picked town happens:
//     resolveDestination: town => ({
//       nextScene: 'StakeoutScene',
//       nextData: { missionId: 'granny_fence', townId: town.id }
//     })
//   });
//   this.roadTripUI.open();

import { EventBus } from '../EventBus.js';
import { getDestinationTheme } from './DestinationMeta.js';
import { getEnergyManager } from '../managers/EnergyManager.js';
import { moneyManager, MONEY_SOURCE } from '../managers/MoneyManager.js';
import {
  ROAD_TRIP_TOWN_LIST,
  getTown
} from '../config/RoadTripTowns.js';
import {
  getCurrentTownId,
  getRoadTripQuote,
  canStartRoadTrip,
  startRoadTrip
} from '../managers/RoadTripManager.js';

const DW = 1920;
const DH = 1080;

// Towns use 0..1000 map coordinates; this is the area they are drawn in.
const MAP_X0 = 120;
const MAP_W = 1280;
const MAP_Y0 = 175;
const MAP_H = 760;

const ROAD_NOTES = [
  __dialogueText("ui/RoadTripDestinationsUI.js", "t_02c0199853ad2852f166"),
  __dialogueText("ui/RoadTripDestinationsUI.js", "t_3e2910b403d6af569d8c"),
  __dialogueText("ui/RoadTripDestinationsUI.js", "t_a24f5df98b035392dea8"),
  __dialogueText("ui/RoadTripDestinationsUI.js", "t_814a8aa2b8b988fe7f14"),
  __dialogueText("ui/RoadTripDestinationsUI.js", "t_aceac75da19c5e946ad3"),
  __dialogueText("ui/RoadTripDestinationsUI.js", "t_1bf14977612d4dec76b2"),
  __dialogueText("ui/RoadTripDestinationsUI.js", "t_7aca75cb88588bcbb36a")
];

function mulberry32(seed) {
  let a = seed >>> 0;

  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeText(scene, x, y, value, style) {
  const t = scene.add.text(x, y, value, style);
  t.setResolution?.(2);
  return t;
}

function buildArc(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const lift = Math.min(110, Math.max(12, dist * 0.15));

  let nx = -dy / dist;
  let ny = dx / dist;

  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }

  const cx = (a.x + b.x) / 2 + nx * lift * 2;
  const cy = (a.y + b.y) / 2 + ny * lift * 2;
  const pts = [];
  const steps = 80;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;

    pts.push({
      x: u * u * a.x + 2 * u * t * cx + t * t * b.x,
      y: u * u * a.y + 2 * u * t * cy + t * t * b.y,
      a: 0
    });
  }

  for (let i = 0; i < pts.length; i++) {
    const n = pts[Math.min(i + 1, pts.length - 1)];
    const p = pts[Math.max(i - 1, 0)];
    pts[i].a = Math.atan2(n.y - p.y, n.x - p.x);
  }

  return pts;
}

// ================================================================= RoadPin
class RoadPin {
  constructor(ui, town, pos, { isHere = false, subText = '', side = 1 } = {}) {
    this.ui = ui;
    this.scene = ui.scene;
    this.town = town;
    this.x = pos.x;
    this.y = pos.y;
    this.isHere = isHere;
    this.hover = false;
    this.selected = false;
    this.destroyed = false;
    this.tweens = [];
    this.selectTween = null;

    const s = this.scene;

    this.container = s.add.container(pos.x, pos.y);
    this.body = s.add.container(0, 0);

    this.ping = s.add.circle(0, 0, 10, 0x000000, 0).setStrokeStyle(2, 0x8b2a1d, 0.9);

    const g = s.add.graphics();

    if (isHere) {
      g.fillStyle(0x2b1a0c, 0.3).fillCircle(2, 3, 15);
      g.fillStyle(0xefe0b4, 1).fillCircle(0, 0, 15);
      g.lineStyle(2.5, 0x2b1a0c, 1).strokeCircle(0, 0, 15);
      g.fillStyle(0x8b2a1d, 1);
      g.fillPoints(RoadPin.star(0, 0, 9, 3.8, 5), true);
    } else {
      g.lineStyle(9, 0x2b1a0c, 0.32);
      g.lineBetween(-8, -8, 12, 13);
      g.lineBetween(12, -7, -8, 13);
      g.lineStyle(6, 0x8b2a1d, 1);
      g.lineBetween(-10, -10, 10, 10);
      g.lineBetween(10, -10, -10, 10);
    }

    const ring = s.add.circle(0, 0, 18, 0x000000, 0).setStrokeStyle(2, 0x8b2a1d, 0.55);

    this.body.add(isHere ? [this.ping, g] : [this.ping, ring, g]);

    this.nameText = makeText(s, 11, 5, town.name, {
      fontFamily: 'SpecialElite', fontSize: '20px', color: this.ui.theme.labelName
    });

    this.subText = makeText(s, 11, 5 + this.nameText.height - 3, subText, {
      fontFamily: 'SpecialElite', fontSize: '13px', color: this.ui.theme.labelSub
    });

    this.labelW = Math.ceil(Math.max(this.nameText.width, this.subText.width) + 24);
    this.labelH = Math.ceil(this.nameText.height + this.subText.height + 5);

    this.labelBg = s.add.graphics();
    this.labelHit = s.add.rectangle(0, 0, this.labelW, this.labelH, 0xffffff, 0.001)
      .setOrigin(0);

    const lx = side > 0 ? 24 : -(24 + this.labelW);

    this.label = s.add.container(lx, -this.labelH / 2);
    this.label.add([this.labelBg, this.nameText, this.subText, this.labelHit]);

    this.hit = s.add.circle(0, 0, 19, 0xffffff, 0.001);

    this.container.add([this.body, this.label, this.hit]);

    if (!isHere) {
      this.hit.setInteractive({ useHandCursor: true });
      this.labelHit.setInteractive({ useHandCursor: true });
    }

    this.drawLabel();
  }

  static star(cx, cy, outer, inner, n) {
    const pts = [];

    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = -Math.PI / 2 + (i * Math.PI) / n;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }

    return pts;
  }

  drawLabel() {
    const g = this.labelBg;
    const t = this.ui.theme;
    const hot = this.hover || this.selected;

    g.clear();
    g.fillStyle(0xf0e1b4, 0.97).fillRect(0, 0, this.labelW, this.labelH);
    g.lineStyle(hot ? 2 : 1.5, hot ? 0x8b2a1d : 0x4a3320, 1)
      .strokeRect(0, 0, this.labelW, this.labelH);
    g.fillStyle(0xd9c27a, 0.85).fillPoints([
      { x: -4, y: 4 }, { x: 10, y: -3 }, { x: 17, y: 5 }, { x: 3, y: 12 }
    ], true);

    this.nameText.setColor(hot ? t.labelNameHot : t.labelName);
  }

  bind(handlers = {}) {
    if (this.isHere) {
      return;
    }

    for (const target of [this.hit, this.labelHit]) {
      target.on('pointerover', () => handlers.onOver?.(this));
      target.on('pointerout', () => handlers.onOut?.(this));
      target.on('pointerdown', (pointer, lx, ly, event) => {
        event?.stopPropagation?.();
        handlers.onDown?.(this);
      });
    }
  }

  setHover(value) {
    if (this.destroyed || this.hover === value) {
      return;
    }

    this.hover = value;

    if (!this.selected) {
      this.body.setScale(value ? 1.18 : 1);
    }

    this.drawLabel();
  }

  setSelected(value) {
    if (this.destroyed) {
      return;
    }

    this.selected = value;
    this.selectTween?.stop?.();
    this.selectTween = null;

    if (value) {
      this.body.setScale(1.3);

      this.selectTween = this.scene.tweens.add({
        targets: this.body,
        angle: { from: -7, to: 7 },
        duration: 260,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else {
      this.body.setAngle(0);
      this.body.setScale(this.hover ? 1.18 : 1);
    }

    this.drawLabel();
  }

  startAnimations() {
    if (this.destroyed || this.tweens.length) {
      return;
    }

    this.tweens.push(this.scene.tweens.add({
      targets: this.ping,
      scale: { from: 1, to: this.isHere ? 2.2 : 2.6 },
      alpha: { from: 0.9, to: 0 },
      duration: 1500,
      repeat: -1,
      delay: Math.random() * 1200,
      ease: 'Sine.easeOut'
    }));
  }

  stopAnimations() {
    this.tweens.forEach(tw => tw?.stop?.());
    this.tweens = [];
    this.ping?.setScale(1).setAlpha(0.9);
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.stopAnimations();
    this.selectTween?.stop?.();
    this.selectTween = null;
    this.container?.destroy(true);
    this.container = null;
  }
}

// ================================================================= UI
export class RoadTripDestinationsUI {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = options;

    this.isOpen = false;
    this.isTransitioning = false;
    this.isDestroyed = false;
    this.canConfirm = false;

    this.theme = getDestinationTheme('pi');

    this.towns = ROAD_TRIP_TOWN_LIST;
    this.pins = [];
    this.selectedTown = null;
    this.selectedPin = null;

    this.route = null;
    this.routeTween = null;
    this.hereMarker = null;
    this.hereTween = null;

    this.noteState = { target: '', typed: 0, hold: 0, idx: 0, override: false };
    this.noteTimer = null;
    this.errorTimer = null;
    this.lockedNewsScene = null;

    this.boundShutdown = this.destroy.bind(this);
    this.boundEsc = () => {
      if (this.isOpen && !this.isTransitioning) {
        this.close();
      }
    };

    const { width, height } = scene.scale;

    this.container = scene.add.container(0, 0).setDepth(1800).setVisible(false);

    this.overlay = scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.8)
      .setOrigin(0)
      .setInteractive();

    this.overlay.on('pointerdown', () => this.close());
    this.container.add(this.overlay);

    this.root = scene.add.container(0, 0).setScale(width / DW, height / DH);
    this.container.add(this.root);

    this.buildMap();

    this.closeBtn = scene.add
      .text(width - 100, 75, __dialogueText("ui/RoadTripDestinationsUI.js", "t_be64f28a8d0a6257b2af"), {
        fontFamily: 'SpecialElite',
        fontSize: '48px',
        color: this.theme.closeColor
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.closeBtn.on('pointerdown', () => this.close());
    this.container.add(this.closeBtn);

    this.createInfoPanel(width, height);

    scene.input?.keyboard?.on('keydown-ESC', this.boundEsc);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.boundShutdown);
  }

  // ------------------------------------------------------------ geometry
  project(town) {
    return {
      x: MAP_X0 + (town.map.x / 1000) * MAP_W,
      y: MAP_Y0 + (town.map.y / 1000) * MAP_H
    };
  }

  // ------------------------------------------------------------ painting
  buildMap() {
    const s = this.scene;
    const rng = mulberry32(20261114);
    const t = this.theme;

    const parchment = s.add.graphics();
    parchment.fillStyle(t.fallbackBg, 1).fillRect(0, 0, DW, DH);

    for (let i = 0; i < 46; i++) {
      parchment.fillStyle(0xc4a66a, 0.1 + rng() * 0.08);
      parchment.fillEllipse(rng() * DW, rng() * DH, 120 + rng() * 300, 60 + rng() * 160);
    }

    for (let i = 0; i < 16; i++) {
      parchment.lineStyle(4, 0x5a3f22, 0.035);
      parchment.strokeRect(i * 4, i * 4, DW - i * 8, DH - i * 8);
    }

    parchment.lineStyle(4, 0x4a3320, 0.9).strokeRect(40, 40, DW - 80, DH - 80);
    parchment.lineStyle(1.5, 0x4a3320, 0.8).strokeRect(50, 50, DW - 100, DH - 100);

    this.baseImage = parchment;

    // Hit area so clicks do not fall through to the closing overlay.
    this.mapHit = s.add.rectangle(0, 0, DW, DH, 0xffffff, 0.001)
      .setOrigin(0)
      .setInteractive();

    this.terrain = s.add.graphics();
    this.roads = s.add.graphics();
    this.routeLayer = s.add.container(0, 0);
    this.routeGfx = s.add.graphics();
    this.car = this.buildCar();
    this.routeLayer.add([this.routeGfx, this.car]);
    this.pinLayer = s.add.container(0, 0);
    this.hudLayer = s.add.container(0, 0);

    this.root.add([
      parchment,
      this.mapHit,
      this.terrain,
      this.roads,
      this.routeLayer,
      this.pinLayer,
      this.hudLayer
    ]);

    this.paintTerrain(rng);
    this.paintRoads(rng);
    this.buildTitles();
    this.buildNote();
  }

  paintTerrain(rng) {
    const g = this.terrain;
    const pts = this.towns.map(town => this.project(town));

    const free = (x, y, r = 70) =>
      !pts.some(p => Math.hypot(p.x - x, p.y - y) < r) &&
      !(x > 1480 && y > 620) &&
      y > 150 && y < DH - 110 && x > 90 && x < DW - 90;

    // lake
    g.fillStyle(0x8fb2b8, 0.55).fillEllipse(1180, 885, 230, 110);
    g.lineStyle(2, 0x4a6e75, 0.8).strokeEllipse(1180, 885, 230, 110);
    g.lineStyle(1.5, 0x4a6e75, 0.6);
    g.lineBetween(1120, 880, 1150, 880);
    g.lineBetween(1190, 895, 1225, 895);

    // hills
    for (let i = 0; i < 34; i++) {
      const x = 90 + rng() * (DW - 180);
      const y = 160 + rng() * (DH - 280);

      if (!free(x, y, 80) || Math.hypot(x - 1180, y - 885) < 150) {
        continue;
      }

      g.lineStyle(2.5, 0x7a5c35, 0.75);
      g.beginPath();
      g.moveTo(x - 22, y + 10);
      g.lineTo(x - 8, y - 12);
      g.lineTo(x + 4, y + 4);
      g.lineTo(x + 14, y - 8);
      g.lineTo(x + 28, y + 10);
      g.strokePath();
    }

    // trees
    for (let i = 0; i < 70; i++) {
      const x = 90 + rng() * (DW - 180);
      const y = 160 + rng() * (DH - 280);

      if (!free(x, y, 55) || Math.hypot(x - 1180, y - 885) < 140) {
        continue;
      }

      g.lineStyle(2, 0x5a3f22, 0.7).lineBetween(x, y, x, y + 9);
      g.fillStyle(0x6b7a3a, 0.6).fillCircle(x, y - 2, 6.5);
    }

    // compass rose
    const cx = 175;
    const cy = 900;

    g.fillStyle(0x8b2a1d, 0.9).fillTriangle(cx, cy - 52, cx - 11, cy, cx + 11, cy);
    g.fillStyle(0x3b2a18, 0.85).fillTriangle(cx, cy + 52, cx - 11, cy, cx + 11, cy);
    g.fillStyle(0x3b2a18, 0.85).fillTriangle(cx - 52, cy, cx, cy - 11, cx, cy + 11);
    g.fillStyle(0x3b2a18, 0.85).fillTriangle(cx + 52, cy, cx, cy - 11, cx, cy + 11);
    g.lineStyle(2, 0x3b2a18, 0.8).strokeCircle(cx, cy, 58);

    this.compassN = makeText(this.scene, cx, cy - 76, 'N', {
      fontFamily: 'SpecialElite', fontSize: '24px', color: '#3b2a18'
    }).setOrigin(0.5);

    this.legend = makeText(
      this.scene, 250, 884,
      __dialogueText("ui/RoadTripDestinationsUI.js", "t_b09598200472988ed4d0"),
      { fontFamily: 'SpecialElite', fontSize: '17px', color: '#7a5c35' }
    );

    this.hudLayer.add([this.compassN, this.legend]);
  }

  paintRoads(rng) {
    const g = this.roads;
    const edges = new Set();

    const positions = this.towns.map(town => this.project(town));

    this.towns.forEach((town, i) => {
      const order = this.towns
        .map((other, j) => ({
          j,
          d: Math.hypot(positions[i].x - positions[j].x, positions[i].y - positions[j].y)
        }))
        .filter(item => item.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);

      for (const { j } of order) {
        edges.add(i < j ? `${i}-${j}` : `${j}-${i}`);
      }
    });

    g.lineStyle(3, 0x7a5c35, 0.8);

    for (const key of edges) {
      const [i, j] = key.split('-').map(Number);
      const a = positions[i];
      const b = positions[j];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const bend = (rng() - 0.5) * 0.35 * dist;
      const cx = (a.x + b.x) / 2 - ((b.y - a.y) / dist) * bend;
      const cy = (a.y + b.y) / 2 + ((b.x - a.x) / dist) * bend;

      const samples = Math.max(14, Math.round(dist / 12));
      let prev = a;

      for (let k = 1; k <= samples; k++) {
        const tt = k / samples;
        const u = 1 - tt;

        const p = {
          x: u * u * a.x + 2 * u * tt * cx + tt * tt * b.x,
          y: u * u * a.y + 2 * u * tt * cy + tt * tt * b.y
        };

        if (k % 2 === 1) {
          g.lineBetween(prev.x, prev.y, p.x, p.y);
        }

        prev = p;
      }
    }
  }

  buildTitles() {
    const s = this.scene;

    this.title = makeText(s, DW / 2, 66, __dialogueText("ui/RoadTripDestinationsUI.js", "t_aa9de920bf8baec13de9"), {
      fontFamily: 'SpecialElite', fontSize: '40px', color: '#3b2a18'
    }).setOrigin(0.5);

    this.subtitle = makeText(
      s, DW / 2, 102,
      __dialogueText("ui/RoadTripDestinationsUI.js", "t_4f39e606e59eb1394303"),
      { fontFamily: 'SpecialElite', fontSize: '18px', color: '#7a5c35' }
    ).setOrigin(0.5);

    this.hudLayer.add([this.title, this.subtitle]);
  }

  buildNote() {
    this.noteText = makeText(this.scene, 70, 1032, '', {
      fontFamily: 'SpecialElite',
      fontSize: '22px',
      color: '#5a3f22',
      wordWrap: { width: 1380 }
    });

    this.hudLayer.add(this.noteText);
  }

  buildCar() {
    const s = this.scene;
    const g = s.add.graphics();

    g.fillStyle(0x000000, 0.3).fillEllipse(2, 12, 40, 8);
    g.fillStyle(0x2b1a0c, 1).fillRoundedRect(-20, -9, 40, 14, 4);
    g.fillStyle(0x8b2a1d, 1).fillRoundedRect(-13, -17, 24, 11, 4);
    g.fillStyle(0xefe0b4, 1).fillRect(-9, -15, 8, 7);
    g.fillStyle(0xefe0b4, 1).fillRect(1, -15, 7, 7);
    g.fillStyle(0x111111, 1).fillCircle(-11, 6, 5).fillCircle(11, 6, 5);
    g.fillStyle(0xcccccc, 1).fillCircle(-11, 6, 2).fillCircle(11, 6, 2);

    return s.add.container(0, 0, [g]).setVisible(false).setScale(1.3);
  }

  // ------------------------------------------------------------ info panel
  createInfoPanel(width, height) {
    const t = this.theme;
    const s = this.scene;

    this.infoPanel = s.add.container(width - 405, height - 430);

    const bg = s.add
      .rectangle(0, 0, 380, 415, t.panelBg, t.panelAlpha)
      .setOrigin(0)
      .setStrokeStyle(2, t.panelStroke)
      .setInteractive();

    const deco = s.add.graphics();
    deco.lineStyle(2, t.panelStroke, 0.9).lineBetween(20, 51, 360, 51);
    deco.lineStyle(1, t.panelStroke, 0.7).lineBetween(20, 55, 360, 55);
    deco.fillStyle(0xd9c27a, 0.85).fillPoints([
      { x: -6, y: 8 }, { x: 18, y: -4 }, { x: 30, y: 10 }, { x: 6, y: 22 }
    ], true);

    const text = (x, y, value, size, color, wrap = 0) =>
      s.add.text(x, y, value, {
        fontFamily: 'SpecialElite',
        fontSize: `${size}px`,
        color,
        wordWrap: wrap ? { width: wrap, useAdvancedWrap: true } : undefined
      });

    this.infoTitle = text(20, 14, __dialogueText("ui/RoadTripDestinationsUI.js", "t_7fa655cc123f15def656"), 27, t.titleColor);
    this.infoCity = text(20, 60, '', 23, t.cityColor);
    this.infoTagline = text(20, 88, '', 17, t.countryColor, 335);
    this.infoPrompt = text(20, 140, '', 17, t.promptColor, 335);
    this.infoTravel = text(20, 175, '', 17, t.travelColor, 340);
    this.infoHours = text(20, 257, '', 18, t.hoursColor, 340);
    this.infoWarn = text(20, 285, '', 14, t.warnColor, 340);

    this.confirmButton = s.add
      .rectangle(190, 350, 280, 44, t.confirmOff, 1)
      .setStrokeStyle(2, t.confirmStroke)
      .setInteractive({ useHandCursor: true });

    this.confirmLabel = text(190, 350, __dialogueText("ui/RoadTripDestinationsUI.js", "t_6eb9e7d4fa3e6d2e8a9d"), 17, t.confirmText).setOrigin(0.5);

    this.confirmButton.on('pointerdown', () => {
      void this.confirm();
    });

    this.infoPanel.add([
      bg, deco,
      this.infoTitle, this.infoCity, this.infoTagline, this.infoPrompt,
      this.infoTravel, this.infoHours, this.infoWarn,
      this.confirmButton, this.confirmLabel
    ]);

    this.container.add(this.infoPanel);
    this.refreshInfoPanel(null);
  }

  setConfirmEnabled(enabled) {
    this.canConfirm = Boolean(
      enabled && !this.isTransitioning && !this.isDestroyed
    );

    if (!this.confirmButton || this.isDestroyed) {
      return;
    }

    const t = this.theme;

    this.confirmButton.setFillStyle(this.canConfirm ? t.confirmOn : t.confirmOff, 1);

    const alpha = this.canConfirm ? 1 : 0.7;
    this.confirmButton.setAlpha(alpha);
    this.confirmLabel.setAlpha(alpha);
  }

  getPurse() {
    return {
      cash: moneyManager.getBalance(MONEY_SOURCE.CASH),
      energy: getEnergyManager().getCurrentEnergy()
    };
  }

  refreshInfoPanel(town) {
    if (this.isDestroyed) {
      return;
    }

    const t = this.theme;

    if (!town) {
      this.infoCity.setText(__dialogueText("ui/RoadTripDestinationsUI.js", "t_6eb9e7d4fa3e6d2e8a9d"));
      this.infoTagline.setText('');
      this.infoPrompt.setText('');
      this.infoTravel.setText('');
      this.infoHours.setText('');
      this.infoWarn.setText('');
      this.confirmLabel.setText(__dialogueText("ui/RoadTripDestinationsUI.js", "t_6eb9e7d4fa3e6d2e8a9d"));
      this.setConfirmEnabled(false);
      return;
    }

    const fromId = getCurrentTownId();
    const quote = getRoadTripQuote(fromId, town.id);
    const check = canStartRoadTrip(fromId, town.id);
    const purse = this.getPurse();

    this.infoCity.setText(town.name);
    this.infoTagline.setText(town.tagline);

    this.infoPrompt
      .setColor(t.promptColor)
      .setText(__dialogueText("ui/RoadTripDestinationsUI.js", "t_5c9d49f9d9f177474dd7"));

    this.infoTravel.setText(
      `${__dialogueText("ui/RoadTripDestinationsUI.js", "t_d4f0c98a7ca933680de3")}${quote.km}${__dialogueText("ui/RoadTripDestinationsUI.js", "t_436130357b07e861a60f")}` +
      `${__dialogueText("ui/RoadTripDestinationsUI.js", "t_accf5ff1416a08bfb95b")}${quote.fuelCost}${__dialogueText("ui/RoadTripDestinationsUI.js", "t_41d1981991e7116a2849")}${quote.energyCost}${__dialogueText("ui/RoadTripDestinationsUI.js", "t_01ba4719c80b6fe911b0")}` +
      `${__dialogueText("ui/RoadTripDestinationsUI.js", "t_0b51cd3cd5f2e8f345fb")}${purse.cash}${__dialogueText("ui/RoadTripDestinationsUI.js", "t_4a70ec10b250d882dd0d")}${purse.energy}`
    );

    this.infoHours.setText(`${__dialogueText("ui/RoadTripDestinationsUI.js", "t_d659ad85ef58eb97435d")}${quote.baseHours}${__dialogueText("ui/RoadTripDestinationsUI.js", "t_90f4dc4589c0dfbb0574")}`);

    if (check.ok) {
      this.infoWarn.setColor(t.warnColor).setText(__dialogueText("ui/RoadTripDestinationsUI.js", "t_d760836bb2aa9c93ebcf"));
      this.confirmLabel.setText(`${__dialogueText("ui/RoadTripDestinationsUI.js", "t_206b1b5392a98c548c8e")}${town.short.length > 14 ? __dialogueText("ui/RoadTripDestinationsUI.js", "t_50ac81f970325a3e011f") : town.name}`);
    } else {
      this.infoWarn.setColor(t.errorColor).setText(check.message);
      this.confirmLabel.setText(__dialogueText("ui/RoadTripDestinationsUI.js", "t_53468567a19606c41752"));
    }

    this.setConfirmEnabled(check.ok);
  }

  showError(message) {
    if (this.isDestroyed) {
      return;
    }

    this.errorTimer?.remove(false);

    this.infoWarn.setColor(this.theme.errorColor).setText(message);

    this.errorTimer = this.scene.time.delayedCall(3500, () => {
      this.errorTimer = null;

      if (!this.isDestroyed && this.isOpen && !this.isTransitioning) {
        this.refreshInfoPanel(this.selectedTown);
      }
    });
  }

  // ------------------------------------------------------------ pins
  clearPins() {
    this.pins.forEach(pin => pin.destroy());
    this.pins = [];

    this.hereTween?.stop?.();
    this.hereTween = null;
    this.hereMarker?.destroy(true);
    this.hereMarker = null;
  }

  renderPins() {
    this.clearPins();

    const currentId = getCurrentTownId();

    for (const town of this.towns) {
      const pos = this.project(town);
      const isHere = town.id === currentId;
      const quote = isHere ? null : getRoadTripQuote(currentId, town.id);

      const pin = new RoadPin(this, town, pos, {
        isHere,
        side: pos.x > 1000 ? -1 : 1,
        subText: isHere ? __dialogueText("ui/RoadTripDestinationsUI.js", "t_b0b52ce074f3c6d015bb") : `${quote.km}${__dialogueText("ui/RoadTripDestinationsUI.js", "t_2a0fdd4fbfc5e013e73b")}${quote.fuelCost}${__dialogueText("ui/RoadTripDestinationsUI.js", "t_18f2efa215d612c8cd00")}`
      });

      pin.bind({
        onOver: p => {
          if (this.isBlocked()) return;
          p.setHover(true);
          this.say(town.tagline);
        },
        onOut: p => p.setHover(false),
        onDown: p => {
          if (this.isBlocked()) return;
          this.selectTown(town, p);
        }
      });

      this.pinLayer.add(pin.container);
      this.pins.push(pin);

      if (isHere) {
        this.addHereMarker(pos);
      }
    }
  }

  addHereMarker(pos) {
    const s = this.scene;
    const marker = s.add.container(pos.x, pos.y);

    const ring = s.add.graphics();
    ring.lineStyle(3, 0x8b2a1d, 0.9);
    ring.beginPath();
    ring.arc(0, 0, 25, -0.3, Math.PI * 2 - 0.9, false);
    ring.strokePath();
    ring.lineStyle(2, 0x8b2a1d, 0.6);
    ring.beginPath();
    ring.arc(0, 0, 28, 0.5, Math.PI * 2 - 0.2, false);
    ring.strokePath();

    const note = makeText(s, 0, -58, __dialogueText("ui/RoadTripDestinationsUI.js", "t_b0b52ce074f3c6d015bb"), {
      fontFamily: 'SpecialElite', fontSize: '22px', color: '#8b2a1d'
    }).setOrigin(0.5).setAngle(-6);

    const arrow = s.add.graphics();
    arrow.lineStyle(2.5, 0x8b2a1d, 0.9);
    arrow.lineBetween(0, -44, 0, -30);
    arrow.lineBetween(0, -30, -5, -37);
    arrow.lineBetween(0, -30, 5, -37);

    marker.add([ring, arrow, note]);

    this.pinLayer.add(marker);
    this.pinLayer.sendToBack(marker);
    this.hereMarker = marker;

    if (this.isOpen) {
      this.startHereAnimation();
    }
  }

  startHereAnimation() {
    if (this.hereTween || !this.hereMarker) {
      return;
    }

    this.hereTween = this.scene.tweens.add({
      targets: this.hereMarker.list[0],
      angle: { from: -4, to: 4 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  isBlocked() {
    return this.isTransitioning || this.isDestroyed;
  }

  selectTown(town, pin) {
    if (this.isBlocked()) {
      return;
    }

    this.errorTimer?.remove(false);
    this.errorTimer = null;

    this.selectedPin?.setSelected(false);
    this.selectedTown = town;
    this.selectedPin = pin;
    pin?.setSelected(true);

    this.refreshInfoPanel(town);
    this.previewRoute(town);
    this.say(town.tagline);
  }

  // ------------------------------------------------------------ route preview
  previewRoute(town) {
    this.clearRoute();

    const from = getTown(getCurrentTownId());
    const a = this.project(from);
    const b = this.project(town);

    if (Math.hypot(a.x - b.x, a.y - b.y) < 6) {
      return;
    }

    this.route = { pts: buildArc(a, b) };
    this.car.setVisible(true);

    this.routeTween = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 3600,
      repeat: -1,
      onUpdate: tween => this.drawRoute(tween.getValue())
    });
  }

  clearRoute() {
    this.routeTween?.stop?.();
    this.routeTween = null;
    this.route = null;
    this.routeGfx?.clear();
    this.car?.setVisible(false);
  }

  drawRoute(v) {
    const r = this.route;
    const g = this.routeGfx;

    if (!r || !g || this.isDestroyed) {
      return;
    }

    const pts = r.pts;
    const head = Math.max(1, Math.floor((pts.length - 1) * Math.min(1, v * 3.2)));
    const off = Math.floor(v * 90);

    g.clear();
    g.lineStyle(8, 0xefe0b4, 0.45);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i <= head; i++) {
      g.lineTo(pts[i].x, pts[i].y);
    }

    g.strokePath();

    g.fillStyle(0x8b2a1d, 1);

    for (let i = 0; i <= head; i++) {
      if ((i + off) % 2 === 0) {
        g.fillCircle(pts[i].x, pts[i].y, 3.2);
      }
    }

    const idx = Math.min(head, Math.floor(((v * 1.15) % 1) * (pts.length - 1)));
    const p = pts[idx];
    const flip = Math.cos(p.a) < 0;

    this.car.setPosition(p.x, p.y - 8);
    this.car.setRotation(flip ? p.a + Math.PI : p.a);
    this.car.setScale(1.3, flip ? -1.3 : 1.3);
  }

  // ------------------------------------------------------------ ticker
  say(message) {
    if (this.isDestroyed || !message) {
      return;
    }

    const s = this.noteState;

    if (s.target === message) {
      return;
    }

    s.target = message;
    s.typed = 0;
    s.hold = 0;
    s.override = true;
  }

  tickNote() {
    if (this.isDestroyed || !this.noteText?.active) {
      return;
    }

    const s = this.noteState;

    if (!s.target) {
      s.target = ROAD_NOTES[s.idx % ROAD_NOTES.length];
    }

    if (s.typed < s.target.length) {
      s.typed++;
    } else {
      s.hold += 34;

      if (s.hold > (s.override ? 5600 : 3800)) {
        s.override = false;
        s.idx = (s.idx + 1) % ROAD_NOTES.length;
        s.target = ROAD_NOTES[s.idx];
        s.typed = 0;
        s.hold = 0;
      }
    }

    this.noteText.setText(`${__dialogueText("ui/RoadTripDestinationsUI.js", "t_fc74c9d3e676521960b2")}${s.target.slice(0, s.typed)}`);
  }

  // ------------------------------------------------------------ confirm
  async confirm() {
    if (!this.canConfirm || !this.selectedTown || this.isTransitioning || this.isDestroyed) {
      return false;
    }

    const town = this.selectedTown;
    const check = canStartRoadTrip(getCurrentTownId(), town.id);

    if (!check.ok) {
      this.showError(check.message);
      this.setConfirmEnabled(false);
      return false;
    }

    const dest = this.options.resolveDestination?.(town) || {};

    const nextScene = dest.nextScene ?? this.options.nextScene;
    const nextData = dest.nextData ?? this.options.nextData;

    this.isTransitioning = true;
    this.setConfirmEnabled(false);

    // Same pattern as the PI office map: close without restoring the HUD,
    // the destination scene takes over.
    this.close({ restoreHud: false });

    let result = null;

    try {
      result = await startRoadTrip(this.scene, town.id, {
        fromTownId: getCurrentTownId(),
        nextScene,
        nextData
      });
    } catch (error) {
      console.error('[RoadTripDestinationsUI] startRoadTrip failed:', error);
    }

    if (result && result.ok !== false) {
      return true;
    }

    if (!this.isDestroyed && this.scene?.sys?.isActive()) {
      this.isTransitioning = false;

      if (!this.isOpen) {
        this.open();
      }

      this.showError(result?.message || __dialogueText("ui/RoadTripDestinationsUI.js", "t_e7ff5eaaab1d87f153f5"));
    }

    return false;
  }

  // ------------------------------------------------------------ lifecycle
  open() {
    if (this.isDestroyed || this.isTransitioning || this.isOpen) {
      return false;
    }

    this.selectedPin = null;
    this.selectedTown = null;
    this.clearRoute();

    this.isOpen = true;
    this.container.setVisible(true);

    EventBus.emit('hideHUD');
    this.acquireNewsLock();

    this.renderPins();
    this.refreshInfoPanel(null);

    this.container.bringToTop(this.infoPanel);
    this.container.bringToTop(this.closeBtn);

    this.pins.forEach(pin => pin.startAnimations());
    this.startHereAnimation();

    this.noteState.typed = 0;
    this.noteState.hold = 0;
    this.noteState.target = '';
    this.noteState.override = false;

    this.noteTimer = this.scene.time.addEvent({
      delay: 34,
      loop: true,
      callback: () => this.tickNote()
    });

    return true;
  }

  close({ restoreHud = true } = {}) {
    if (!this.isOpen || this.isDestroyed) {
      return false;
    }

    if (this.isTransitioning && restoreHud) {
      return false;
    }

    this.isOpen = false;
    this.container.setVisible(false);

    this.noteTimer?.remove(false);
    this.noteTimer = null;
    this.errorTimer?.remove(false);
    this.errorTimer = null;

    this.clearRoute();
    this.pins.forEach(pin => pin.stopAnimations());
    this.hereTween?.stop?.();
    this.hereTween = null;
    this.clearPins();

    this.selectedPin = null;
    this.selectedTown = null;

    this.releaseNewsLock();

    this.options.onClose?.({ returnToComputer: restoreHud !== false });

    return true;
  }

  acquireNewsLock() {
    this.releaseNewsLock();

    const news = this.scene.getRegisteredScene?.('NewsHud');

    if (!news) {
      return;
    }

    news.destinationMapLocks ??= new Set();
    news.destinationMapLocks.add(this);
    this.lockedNewsScene = news;
    news.syncLocationVisibility?.();
  }

  releaseNewsLock() {
    const news = this.lockedNewsScene;
    this.lockedNewsScene = null;

    if (!news) {
      return;
    }

    news.destinationMapLocks?.delete(this);
    news.syncLocationVisibility?.();
  }

  destroy() {
    if (this.isDestroyed) {
      return;
    }

    this.releaseNewsLock();
    this.isDestroyed = true;

    this.noteTimer?.remove(false);
    this.errorTimer?.remove(false);
    this.routeTween?.stop?.();
    this.hereTween?.stop?.();

    try {
      this.scene?.input?.keyboard?.off('keydown-ESC', this.boundEsc);
      this.scene?.events?.off(Phaser.Scenes.Events.SHUTDOWN, this.boundShutdown);
    } catch (error) {
      /* scene already gone */
    }

    this.pins.forEach(pin => pin.destroy());
    this.pins = [];

    this.container?.destroy(true);
    this.container = null;

    this.selectedPin = null;
    this.selectedTown = null;
    this.isOpen = false;
    this.isTransitioning = false;
    this.canConfirm = false;
  }
}