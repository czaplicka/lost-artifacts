// scenes/travel/TravelMapAmbient.js
// The living details of the Destinations world map, reused on the travel map:
//   agency: scanning band + two satellites with trails
//   pi:     drifting clouds, two sailing ships, wobbling compass needle, lamp flicker
//
// Everything is drawn in MAP TEXTURE space (1920x1080) inside one container.
// TravelRouteStage calls setTransform() every time it moves / zooms the map,
// so the animations stay glued to the right place on the painted map.

import {
  MAP_FRAME,
  MAP_H,
  MAP_W,
  PI_COMPASS,
  PROJECTION
} from '../../ui/DestinationMapPainter.js';
import { TRAVEL_DEPTH } from './TravelTextures.js';

const AGENCY_ACCENT = 0x00e5ff;
const AGENCY_GOLD = 0xffcc00;

export class TravelMapAmbient {
  constructor(stage) {
    this.stage = stage;
    this.scene = stage.scene;
    this.themeId = stage.themeId;
    this.tweens = [];
    this.destroyed = false;

    // Between the map (depth 1) and the route (depth 3).
    this.root = stage.track(
      this.scene.add.container(0, 0),
      TRAVEL_DEPTH.map + 0.5
    );

    if (this.themeId === 'pi') this.buildPi();
    else this.buildAgency();
  }

  // Keeps the layer glued to the (zooming) map image.
  setTransform(left, top, scaleX, scaleY) {
    if (this.destroyed || !this.root?.active) return;
    this.root.setPosition(left, top).setScale(scaleX, scaleY);
  }

  tween(config) {
    const tween = this.scene.createTrackedTween(config);
    if (tween) this.tweens.push(tween);
    return tween;
  }

  // ------------------------------------------------------------------ agency
  buildAgency() {
    const { scene, root } = this;
    const F = MAP_FRAME;

    // Radar-like scanning band.
    this.scan = scene.add.container(0, F.t - 40);
    this.scan.add([
      scene.add.rectangle(F.l, 0, F.r - F.l, 38, AGENCY_ACCENT, 0.07).setOrigin(0),
      scene.add.rectangle(F.l, 36, F.r - F.l, 2, AGENCY_ACCENT, 0.32).setOrigin(0)
    ]);
    root.add(this.scan);

    this.tween({
      targets: this.scan,
      y: { from: F.t - 40, to: F.b },
      duration: 5200,
      repeat: -1,
      repeatDelay: 900,
      ease: 'Linear'
    });

    // Two satellites.
    this.satTrail = scene.add.graphics();
    root.add(this.satTrail);

    this.sats = [0, 1].map((i) => {
      const g = scene.add.graphics();

      g.lineStyle(2, AGENCY_GOLD, 1);
      g.lineBetween(-8, 0, 8, 0);
      g.lineBetween(0, -8, 0, 8);
      g.fillStyle(AGENCY_GOLD, 1).fillCircle(0, 0, 3.2);

      root.add(g);

      return {
        gfx: g,
        trail: [],
        last: 0,
        phase: i * 0.5,
        waves: i === 0 ? 1.5 : 2,
        speed: i === 0 ? 1 : 0.7
      };
    });

    const state = { v: 0 };

    this.tween({
      targets: state,
      v: 1,
      duration: 46000,
      repeat: -1,
      ease: 'Linear',
      onUpdate: () => this.updateSatellites(state.v)
    });

    this.updateSatellites(0);
  }

  updateSatellites(v) {
    if (this.destroyed || !this.satTrail?.active) return;

    const F = MAP_FRAME;
    const cy = (F.t + F.b) / 2;
    const h = F.b - F.t;

    this.satTrail.clear();

    this.sats.forEach((sat) => {
      const t = (v * sat.speed * 3 + sat.phase) % 1;

      if (t < sat.last) sat.trail = [];
      sat.last = t;

      const x = F.l + t * (F.r - F.l);
      const y = cy + Math.sin((t * sat.waves + sat.phase) * Math.PI * 2) * h * 0.34;

      sat.gfx.setPosition(x, y);
      sat.trail.push({ x, y });
      if (sat.trail.length > 16) sat.trail.shift();

      for (let i = 1; i < sat.trail.length; i++) {
        this.satTrail.lineStyle(2, AGENCY_GOLD, (i / sat.trail.length) * 0.55);
        this.satTrail.lineBetween(
          sat.trail[i - 1].x, sat.trail[i - 1].y,
          sat.trail[i].x, sat.trail[i].y
        );
      }
    });
  }

  // ---------------------------------------------------------------------- pi
  buildPi() {
    const { scene, root } = this;
    const F = MAP_FRAME;

    // Clouds drifting over the parchment.
    [F.t + 150, F.t + 390, F.t + 620].forEach((y, i) => {
      const cloud = scene.add.container(F.l + 160 + i * 360, y);
      const g = scene.add.graphics();

      g.fillStyle(0xfff6df, 0.14);
      g.fillEllipse(0, 0, 170, 40);
      g.fillEllipse(55, -10, 110, 38);
      g.fillEllipse(-55, 8, 100, 30);

      cloud.add(g);
      root.add(cloud);

      this.tween({
        targets: cloud,
        x: { from: F.l + 120, to: F.r - 320 },
        duration: 80000 + i * 22000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    // Two little ships.
    [
      { a: PROJECTION.project(-62, 24), b: PROJECTION.project(-30, 48), dur: 26000 },
      { a: PROJECTION.project(62, -12), b: PROJECTION.project(92, -32), dur: 30000 }
    ].forEach((def) => {
      const g = scene.add.graphics();

      g.fillStyle(0x3a2815, 1).fillPoints([
        { x: -18, y: 0 }, { x: 18, y: 0 }, { x: 12, y: 9 }, { x: -12, y: 9 }
      ], true);
      g.lineStyle(2, 0x3a2815, 1).lineBetween(0, 0, 0, -28);
      g.fillStyle(0xf3e6c0, 1).fillPoints([
        { x: 2, y: -26 }, { x: 2, y: -4 }, { x: 19, y: -6 }
      ], true);
      g.lineStyle(1.2, 0x3a2815, 1).strokePoints([
        { x: 2, y: -26 }, { x: 2, y: -4 }, { x: 19, y: -6 }
      ], true);
      g.fillStyle(0x8b2a1d, 1).fillTriangle(0, -28, 0, -22, 9, -25);

      const ship = scene.add.container(def.a.x, def.a.y, [g]);
      root.add(ship);

      const state = { v: 0, prev: 0 };

      this.tween({
        targets: state,
        v: 1,
        duration: def.dur,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          if (this.destroyed || !ship.active) return;

          const v = state.v;

          ship.setPosition(
            def.a.x + (def.b.x - def.a.x) * v,
            def.a.y + (def.b.y - def.a.y) * v + Math.sin(v * 70) * 2.5
          );
          ship.setAngle(Math.sin(v * 55) * 3);
          ship.setScale(v >= state.prev ? 1 : -1, 1);

          state.prev = v;
        }
      });
    });

    // Compass needle on the baked compass rose.
    const compass = PROJECTION.project(PI_COMPASS.lon, PI_COMPASS.lat);
    const R = PI_COMPASS.radius;
    const needle = scene.add.container(compass.x, compass.y);
    const n = scene.add.graphics();

    n.fillStyle(0xc0392b, 1).fillTriangle(0, -R * 0.72, -4.5, 0, 4.5, 0);
    n.fillStyle(0xefe0b4, 1).fillTriangle(0, R * 0.72, -4.5, 0, 4.5, 0);
    n.lineStyle(1, 0x3a2815, 1).strokeTriangle(0, -R * 0.72, -4.5, 0, 4.5, 0);
    n.lineStyle(1, 0x3a2815, 1).strokeTriangle(0, R * 0.72, -4.5, 0, 4.5, 0);
    n.fillStyle(0x3a2815, 1).fillCircle(0, 0, 3);

    needle.add(n);
    root.add(needle);

    this.tween({
      targets: needle,
      angle: { from: -14, to: 14 },
      duration: 2300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Lamp flicker.
    const flicker = scene.add
      .rectangle(0, 0, MAP_W, MAP_H, 0x2a1405, 0.05)
      .setOrigin(0);

    root.add(flicker);

    this.tween({
      targets: flicker,
      alpha: { from: 0.02, to: 0.12 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  // --------------------------------------------------------------------- end
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    this.tweens.forEach((tween) => this.scene.removeTrackedTween?.(tween));
    this.tweens = [];
    this.sats = [];

    // The container itself is destroyed with the rest of the stage objects.
    this.root = null;
  }
}