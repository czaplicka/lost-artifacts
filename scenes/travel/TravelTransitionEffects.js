// scenes/travel/TravelTransitionEffects.js
// 1) TravelRouteStage  - lamp-lit desk, the same parchment map as the Destinations screen,
//                        zoom-in, dashed route drawn live, vehicle + particle trail, pins.
// 2) playEncounterEffect - incident popup (mini animation) for every encounter id,
//                        plus full-screen weather / detour layers where it makes sense.
//
// All tweens go through scene.createTrackedTween (BaseScene) so nothing leaks.
// All display objects are pushed into scene.effectObjects -> cleanupTravelEffects() destroys them.

import { DEFAULT_ENCOUNTER_VISUAL, ENCOUNTER_VISUALS } from './TransportVisuals.js';
import { TRAVEL_DEPTH, fs, hex } from './TravelTextures.js';

export const MAP_MAX_ZOOM = 2;      // lower it if the map looks too blurry when zoomed
const ROUTE_SAMPLES = 200;

const TRAIL_STYLES = {
  contrail: { lifespan: 1500, scale: { start: 0.35, end: 1.1 }, alpha: { start: 0.55, end: 0 }, tint: 0xffffff },
  smoke: { lifespan: 1000, scale: { start: 0.3, end: 0.95 }, alpha: { start: 0.6, end: 0 }, tint: 0x8b8b8b, speedY: { min: -26, max: -10 } },
  dust: { lifespan: 800, scale: { start: 0.25, end: 0.7 }, alpha: { start: 0.5, end: 0 }, tint: 0xb99a6a },
  wake: { lifespan: 1600, scale: { start: 0.3, end: 1 }, alpha: { start: 0.6, end: 0 }, tint: 0xeaf6f8 }
};

// ===========================================================================
// TravelRouteStage
// ===========================================================================

export class TravelRouteStage {
  constructor(scene, { width, height, U, transport, fromPoint = null, toPoint = null, fromCity = '', toCity = '' }) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.U = U;
    this.transport = transport;
    this.fromPoint = fromPoint;
    this.toPoint = toPoint;
    this.fromCity = fromCity;
    this.toCity = toCity;

    this.state = { progress: 0 };
    this.position = { x: 0, y: 0 };
    this.frame = 0;
    this.running = false;
    this.destroyed = false;
    this.marker = null;
    this.detourGraphics = null;
    this.detourTween = null;

    this.build();
  }

  track(object, depth) {
    if (depth !== undefined) object.setDepth(depth);
    this.scene.effectObjects.push(object);
    return object;
  }

  build() {
    const { scene, width, height } = this;

    this.track(
      scene.add.image(width / 2, height / 2, 'travel-desk').setDisplaySize(width, height),
      TRAVEL_DEPTH.desk
    );

    const mapKey = scene.textures.exists('mapbg') ? 'mapbg' : 'travel-fallback-map';
    this.map = this.track(
      scene.add.image(width / 2, height / 2, mapKey).setDisplaySize(width, height).setTint(0xeadcbc),
      TRAVEL_DEPTH.map
    );

    this.computeRoute();
    this.applyMapTransform(0);
    this.routeGraphics = this.track(scene.add.graphics(), TRAVEL_DEPTH.route);
    this.createPins();
    this.createVehicle();
    this.createAtmosphere();
  }

  // ---- route geometry ------------------------------------------------------

  computeRoute() {
    const { width, height, transport } = this;

    let a = this.fromPoint ? { ...this.fromPoint } : { x: width * 0.34, y: height * 0.46 };
    let b = this.toPoint ? { ...this.toPoint } : { x: width * 0.66, y: height * 0.4 };

    // Same city (e.g. returning to the private office): a short local hop.
    if (Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) < 30) {
      const { x, y } = a;
      a = { x: x - 150, y: y + 16 };
      b = { x: x + 150, y: y - 16 };
    }

    const A = new Phaser.Math.Vector2(a.x, a.y);
    const B = new Phaser.Math.Vector2(b.x, b.y);
    const dist = A.distance(B);
    const dir = B.clone().subtract(A).normalize();
    const normal = new Phaser.Math.Vector2(dir.y, -dir.x);
    if (normal.y > 0) normal.negate();              // arcs always bulge upward

    const peak = dist * (transport.arc ?? 0.1);
    const control = A.clone().add(B).scale(0.5).add(normal.scale(peak * 2));
    const curve = new Phaser.Curves.QuadraticBezier(A, control, B);
    const mapPoints = curve.getSpacedPoints(ROUTE_SAMPLES);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of mapPoints) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    const bw = Math.max(maxX - minX, 60);
    const bh = Math.max(maxY - minY, 60);
    this.zoom = Phaser.Math.Clamp(Math.min((width * 0.6) / bw, (height * 0.3) / bh), 1, MAP_MAX_ZOOM);
    this.focus = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    this.center = { x: width / 2, y: height * 0.4 };

    this.points = mapPoints.map((p) => this.toScreen(p));
    this.length = curve.getLength() * this.zoom;
  }

  toScreen(p) {
    return {
      x: this.center.x + (p.x - this.focus.x) * this.zoom,
      y: this.center.y + (p.y - this.focus.y) * this.zoom
    };
  }

  // u = 0 -> whole map, u = 1 -> final zoom on the route.
  applyMapTransform(u) {
    const { width, height } = this;
    const Z = 1 + (this.zoom - 1) * u;
    const cx = width / 2 + (this.center.x - width / 2) * u;
    const cy = height / 2 + (this.center.y - height / 2) * u;
    const fx = width / 2 + (this.focus.x - width / 2) * u;
    const fy = height / 2 + (this.focus.y - height / 2) * u;

    this.map.setPosition(cx + (width / 2 - fx) * Z, cy + (height / 2 - fy) * Z);
    this.map.setDisplaySize(width * Z, height * Z);
  }

  // ---- pins, vehicle, atmosphere -------------------------------------------

  createPins() {
    const { scene, U } = this;
    const a = this.points[0];
    const b = this.points[this.points.length - 1];

    this.originPin = this.track(
      scene.add.circle(a.x, a.y, 9 * U, 0xf4e7c1).setStrokeStyle(3 * U, 0x2b1d12).setAlpha(0),
      TRAVEL_DEPTH.pin
    );

    // Indiana-Jones style red X where the trail ends.
    const mark = this.track(scene.add.graphics({ x: b.x, y: b.y }), TRAVEL_DEPTH.pin);
    const s = 16 * U;
    mark.lineStyle(7 * U, 0x2b1d12, 0.55);
    mark.lineBetween(-s, -s, s, s);
    mark.lineBetween(-s, s, s, -s);
    mark.lineStyle(4.5 * U, 0xb3261e, 1);
    mark.lineBetween(-s, -s, s, s);
    mark.lineBetween(-s, s, s, -s);
    mark.setAlpha(0);
    this.destMark = mark;

    const originOnLeft = a.x <= b.x;
    this.originLabel = this.makeLabel(a, this.fromCity, originOnLeft ? 'left' : 'right');
    this.destLabel = this.makeLabel(b, this.toCity, originOnLeft ? 'right' : 'left');
  }

  makeLabel(point, text, side) {
    const { scene, U, width } = this;
    const label = scene.add.text(
      side === 'left' ? point.x - 12 * U : point.x + 12 * U,
      point.y + 14 * U,
      text,
      {
        fontFamily: 'SpecialElite',
        fontSize: fs(U, 22),
        color: '#f4e7c1',
        backgroundColor: '#2b1d12',
        padding: { x: Math.round(8 * U), y: Math.round(4 * U) }
      }
    ).setOrigin(side === 'left' ? 1 : 0, 0).setAlpha(0);

    if (side === 'left') label.x = Math.max(label.x, label.width + 12 * U);
    else label.x = Math.min(label.x, width - label.width - 12 * U);
    return this.track(label, TRAVEL_DEPTH.pin);
  }

  createVehicle() {
    const { scene, U, transport } = this;
    const key = scene.textures.exists(transport.customVehicleKey) ? transport.customVehicleKey : transport.vehicleKey;
    this.vehicleKey = key;
    this.baseScale = (transport.vehicleScale ?? 0.6) * U;

    this.shadow = this.track(
      scene.add.image(0, 0, key).setTint(0x000000).setAlpha(0).setScale(this.baseScale),
      TRAVEL_DEPTH.trail
    );
    this.vehicle = this.track(
      scene.add.image(0, 0, key).setAlpha(0).setScale(this.baseScale),
      TRAVEL_DEPTH.vehicle
    );

    const style = TRAIL_STYLES[transport.trail] || TRAIL_STYLES.contrail;
    this.trail = this.track(
      scene.add.particles(0, 0, 'travel-puff', {
        emitting: false,
        lifespan: style.lifespan,
        scale: { start: style.scale.start * U, end: style.scale.end * U },
        alpha: style.alpha,
        tint: style.tint,
        ...(style.speedY ? { speedY: style.speedY } : {})
      }),
      TRAVEL_DEPTH.trail
    );
  }

  createAtmosphere() {
    const { scene, width, height, U } = this;

    // floating dust in the lamp light
    this.track(
      scene.add.particles(0, 0, 'travel-dot', {
        x: { min: 0, max: width },
        y: { min: 0, max: height },
        lifespan: { min: 4500, max: 8000 },
        speedX: { min: -8, max: 8 },
        speedY: { min: -16, max: -4 },
        scale: { start: 0.3, end: 0 },
        alpha: { start: 0.45, end: 0 },
        quantity: 1,
        frequency: 240,
        tint: 0xffe2a0,
        blendMode: 'ADD'
      }),
      TRAVEL_DEPTH.dust
    );

    this.track(
      scene.add.image(width / 2, height / 2, 'travel-vignette').setDisplaySize(width, height),
      TRAVEL_DEPTH.vignette
    );
    this.track(
      scene.add.image(width / 2, 0, 'travel-fade').setOrigin(0.5, 0).setDisplaySize(width, Math.round(200 * U)),
      TRAVEL_DEPTH.fade
    );
    this.track(
      scene.add.image(width / 2, height, 'travel-fade').setOrigin(0.5, 1).setFlipY(true)
        .setDisplaySize(width, Math.round(430 * U)),
      TRAVEL_DEPTH.fade
    );
  }

  // ---- timeline ------------------------------------------------------------

  playZoom(duration, onDone) {
    const t = { u: 0 };
    this.applyMapTransform(0);
    this.scene.createTrackedTween({
      targets: t,
      u: 1,
      duration,
      ease: 'Cubic.easeInOut',
      onUpdate: () => this.applyMapTransform(t.u),
      onComplete: () => {
        this.applyMapTransform(1);
        this.showPins();
        onDone?.();
      }
    });
  }

  showPins() {
    this.scene.createTrackedTween({
      targets: [this.originPin, this.originLabel, this.destLabel],
      alpha: 1,
      duration: 400,
      ease: 'Sine.easeOut'
    });
    this.scene.createTrackedTween({
      targets: this.destMark,
      alpha: 0.45,
      duration: 400,
      ease: 'Sine.easeOut'
    });
  }

  run({ travelMs, encounterAt = null, holdMs = 0, onProgress, onEncounter, onEncounterEnd, onArrive }) {
    const { scene } = this;
    this.running = true;
    this.vehicle.setAlpha(1);
    this.shadow.setAlpha(this.transport.flies ? 0.28 : 0.18);
    this.updateAt(0);

    const leg = (to, duration, ease, onDone) => scene.createTrackedTween({
      targets: this.state,
      progress: to,
      duration,
      ease,
      onUpdate: () => {
        this.updateAt(this.state.progress);
        onProgress?.(this.state.progress);
      },
      onComplete: onDone
    });

    const finish = () => {
      this.updateAt(1);
      onProgress?.(1);
      this.playArrival();
      onArrive?.();
    };

    if (encounterAt === null) {
      leg(1, travelMs, 'Sine.easeInOut', finish);
      return;
    }

    leg(encounterAt, travelMs * encounterAt, 'Quad.easeOut', () => {
      this.beginPause();
      onEncounter?.(this.getVehiclePosition());
      scene.time.delayedCall(holdMs, () => {
        if (this.destroyed || scene.isLeaving) return;
        this.endPause();
        onEncounterEnd?.();
        leg(1, travelMs * (1 - encounterAt), 'Quad.easeIn', finish);
      });
    });
  }

  updateAt(p) {
    const { U, transport } = this;
    const N = this.points.length - 1;
    const t = Phaser.Math.Clamp(p, 0, 1) * N;
    const i = Math.min(N - 1, Math.floor(t));
    const f = t - i;
    const a = this.points[i];
    const b = this.points[i + 1];
    const x = a.x + (b.x - a.x) * f;
    const y = a.y + (b.y - a.y) * f;

    const prev = this.points[Math.max(0, i - 2)];
    const next = this.points[Math.min(N, i + 3)];
    const heading = Math.atan2(next.y - prev.y, next.x - prev.x);

    const alt = transport.flies ? Math.sin(Math.PI * Phaser.Math.Clamp(p, 0, 1)) : 0;
    this.position.x = x;
    this.position.y = y - alt * 14 * U;

    this.vehicle
      .setPosition(this.position.x, this.position.y)
      .setRotation(heading)
      .setScale(this.baseScale * (1 + alt * 0.3));
    this.shadow
      .setPosition(x + alt * 18 * U, y + alt * 30 * U)
      .setRotation(heading)
      .setScale(this.baseScale * (1 + alt * 0.15) * (1 - alt * 0.1));

    this.drawRoute(Math.floor(t));

    if (this.running && p > 0 && p < 1 && (++this.frame % 2 === 0)) {
      this.trail.emitParticleAt(
        this.position.x - Math.cos(heading) * 22 * U,
        this.position.y - Math.sin(heading) * 22 * U,
        1
      );
    }
  }

  drawRoute(upTo) {
    const { U, transport } = this;
    const g = this.routeGraphics;
    const pts = this.points;
    const spacing = Math.max(0.5, this.length / (pts.length - 1));
    const on = Math.max(1, Math.round((16 * U) / spacing));
    const period = on + Math.max(1, Math.round((11 * U) / spacing));
    const end = Math.min(upTo + 1, pts.length - 1);

    g.clear();
    for (const [width, color, alpha] of [[8 * U, 0x1a0f08, 0.35], [4.5 * U, transport.lineColor, 0.95]]) {
      g.lineStyle(width, color, alpha);
      g.beginPath();
      for (let i = 0; i < end; i++) {
        if (i % period < on) {
          g.moveTo(pts[i].x, pts[i].y);
          g.lineTo(pts[i + 1].x, pts[i + 1].y);
        }
      }
      g.strokePath();
    }
  }

  // ---- incident pause ------------------------------------------------------

  beginPause() {
    const { scene, U } = this;
    this.marker = this.track(
      scene.add.text(this.position.x, this.position.y - 56 * U, '!', {
        fontFamily: 'PressStart2P',
        fontSize: fs(U, 30),
        color: '#ff5a4a',
        stroke: '#1a0f08',
        strokeThickness: Math.round(6 * U)
      }).setOrigin(0.5),
      TRAVEL_DEPTH.vehicle + 1
    );
    scene.createTrackedTween({
      targets: this.marker,
      y: this.marker.y - 10 * U,
      duration: 320,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    scene.createTrackedTween({
      targets: this.vehicle,
      angle: this.vehicle.angle + 4,
      duration: 90,
      yoyo: true,
      repeat: 8
    });
  }

  endPause() {
    if (this.marker) {
      this.scene.killTrackedTweensOf(this.marker);
      this.marker.destroy();
      this.marker = null;
    }
  }

  // Amber detour drawn around the vehicle (reroute / wrong turn).
  startDetour(color = 0xffd166) {
    if (this.detourGraphics) return;
    const { scene, U } = this;
    const g = this.track(scene.add.graphics(), TRAVEL_DEPTH.route + 0.5);
    const N = this.points.length - 1;
    const center = Math.round(this.state.progress * N);
    const from = Math.max(0, center - 25);
    const to = Math.min(N, center + 55);
    const bendAt = (j, k) => Math.sin((Math.PI * (j - from)) / Math.max(1, to - from)) * (46 + 64 * k) * U;
    const k = { value: 0 };

    this.detourGraphics = g;
    this.detourTween = scene.createTrackedTween({
      targets: k,
      value: 1,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        g.clear();
        g.lineStyle(4 * U, color, 0.95);
        g.beginPath();
        for (let j = from; j < to; j++) {
          if (j % 4 >= 2) continue;
          const p0 = this.offsetPoint(j, bendAt(j, k.value));
          const p1 = this.offsetPoint(j + 1, bendAt(j + 1, k.value));
          g.moveTo(p0.x, p0.y);
          g.lineTo(p1.x, p1.y);
        }
        g.strokePath();
      }
    });
  }

  offsetPoint(index, bend) {
    const pts = this.points;
    const a = pts[Math.max(0, index - 1)];
    const b = pts[Math.min(pts.length - 1, index + 1)];
    let nx = -(b.y - a.y);
    let ny = b.x - a.x;
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    if (ny > 0) { nx = -nx; ny = -ny; }
    return { x: pts[index].x + nx * bend, y: pts[index].y + ny * bend };
  }

  stopDetour() {
    if (this.detourTween) {
      this.scene.removeTrackedTween(this.detourTween);
      this.detourTween = null;
    }
    if (this.detourGraphics) {
      if (this.detourGraphics.active) this.detourGraphics.destroy();
      this.detourGraphics = null;
    }
  }

  // ---- arrival -------------------------------------------------------------

  playArrival() {
    const { scene, U } = this;
    this.running = false;
    this.stopDetour();

    const b = this.points[this.points.length - 1];
    scene.createTrackedTween({
      targets: this.destMark,
      alpha: 1,
      scale: { from: 0.2, to: 1 },
      duration: 380,
      ease: 'Back.easeOut'
    });

    const ring = this.track(
      scene.add.circle(b.x, b.y, 12 * U).setStrokeStyle(3 * U, 0xb3261e, 0.9),
      TRAVEL_DEPTH.pin
    );
    scene.createTrackedTween({
      targets: ring,
      scale: { from: 1, to: 5 },
      alpha: { from: 0.9, to: 0 },
      duration: 1000,
      repeat: 1,
      ease: 'Cubic.easeOut',
      onComplete: () => { if (ring.active) ring.destroy(); }
    });
  }

  getVehiclePosition() {
    return { x: this.position.x, y: this.position.y };
  }

  destroy() {
    this.destroyed = true;
    this.running = false;
    this.stopDetour();
    if (this.marker?.active) this.marker.destroy();
    this.marker = null;
  }
}

// ===========================================================================
// Encounters
// ===========================================================================

export function getEncounterVisual(encounter) {
  if (!encounter?.id) return null;
  const known = ENCOUNTER_VISUALS[encounter.id];
  if (known) return { ...known };
  return {
    ...DEFAULT_ENCOUNTER_VISUAL,
    stamp: String(encounter.label || DEFAULT_ENCOUNTER_VISUAL.stamp).toUpperCase().slice(0, 14)
  };
}

// --- popup content builders (content container is centred in the popup) -----

const CONTENT = {
  scanner({ scene, content, U, color, tw }) {
    const bar = scene.add.rectangle(0, 8 * U, 280 * U, 16 * U, 0x0a1118, 0.95).setStrokeStyle(1, color, 0.7);
    const scan = scene.add.rectangle(-122 * U, 8 * U, 18 * U, 34 * U, color, 0.6);
    const glow = scene.add.rectangle(-122 * U, 8 * U, 50 * U, 34 * U, color, 0.14);
    content.add([bar, glow, scan]);
    tw({ targets: [scan, glow], x: 122 * U, duration: 1100, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });

    for (let i = 0; i < 5; i++) {
      const dot = scene.add.circle(-64 * U + i * 32 * U, 46 * U, 5 * U, 0xffd166, 0.25);
      content.add(dot);
      tw({ targets: dot, alpha: { from: 0.15, to: 0.95 }, duration: 350, yoyo: true, repeat: -1, delay: i * 120 });
    }
  },

  baggage({ scene, content, U, tw }) {
    content.add(scene.add.rectangle(0, 30 * U, 300 * U, 26 * U, 0x1d232b, 1).setStrokeStyle(2, 0x5c5141, 0.8));
    [0x9b5f3f, 0x6c7a89, 0x7d4d82].forEach((color, i) => {
      const bag = scene.add.container(-140 * U, 14 * U, [
        scene.add.rectangle(0, 0, 34 * U, 22 * U, color).setStrokeStyle(2, 0xe9d8c1, 0.3),
        scene.add.rectangle(0, -14 * U, 12 * U, 4 * U, 0xd9c7a4)
      ]);
      content.add(bag);
      tw({ targets: bag, x: 140 * U, duration: 1900, repeat: -1, delay: i * 630, ease: 'Linear' });
      tw({ targets: bag, y: 10 * U, duration: 220, yoyo: true, repeat: -1, delay: i * 630 });
    });
  },

  clock({ scene, content, U, tw, penalty }) {
    const cx = -50 * U;
    const cy = 4 * U;
    content.add(scene.add.circle(cx, cy, 42 * U, 0xf1e4c3).setStrokeStyle(4 * U, 0x2b1d12));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      content.add(
        scene.add.rectangle(cx + Math.sin(a) * 34 * U, cy - Math.cos(a) * 34 * U, 3 * U, 8 * U, 0x2b1d12)
          .setRotation(a)
      );
    }
    const minute = scene.add.container(cx, cy, [scene.add.rectangle(0, -16 * U, 4 * U, 34 * U, 0x2b1d12)]);
    const hour = scene.add.container(cx, cy, [scene.add.rectangle(0, -10 * U, 5 * U, 22 * U, 0xb3261e)]);
    content.add([minute, hour, scene.add.circle(cx, cy, 5 * U, 0x2b1d12)]);
    tw({ targets: minute, angle: 360, duration: 1300, repeat: -1 });
    tw({ targets: hour, angle: 360, duration: 9000, repeat: -1 });

    content.add(scene.add.text(40 * U, cy, penalty > 0 ? `Delay:\n+${penalty}h` : 'Please\nwait.', {
      fontFamily: 'SpecialElite', fontSize: fs(U, 24), color: '#f4e7c1', align: 'left'
    }).setOrigin(0, 0.5));
  },

  signal({ scene, content, U, tw }) {
    const x = -90 * U;
    content.add(scene.add.rectangle(x, 40 * U, 8 * U, 60 * U, 0x59636d));
    content.add(scene.add.rectangle(x, -6 * U, 38 * U, 64 * U, 0x151b22).setStrokeStyle(2, 0x59636d));
    const red = scene.add.circle(x, -26 * U, 9 * U, 0xff3b30, 1);
    content.add([
      red,
      scene.add.circle(x, -6 * U, 9 * U, 0xffb000, 0.15),
      scene.add.circle(x, 14 * U, 9 * U, 0x35c759, 0.15)
    ]);
    tw({ targets: red, alpha: { from: 0.35, to: 1 }, duration: 420, yoyo: true, repeat: -1 });
    content.add(scene.add.text(-30 * U, 4 * U, 'Signal: red.\nStill red.', {
      fontFamily: 'SpecialElite', fontSize: fs(U, 24), color: '#f4e7c1'
    }).setOrigin(0, 0.5));
  },

  traffic({ scene, content, U, tw }) {
    [0xc0392b, 0x2980b9, 0xf1c40f, 0x27ae60, 0x8e44ad, 0xe67e22].forEach((color, i) => {
      const car = scene.add.container(-135 * U + i * 54 * U, 34 * U, [
        scene.add.rectangle(0, 0, 42 * U, 20 * U, color).setStrokeStyle(2, 0x1a0f08),
        scene.add.rectangle(6 * U, 0, 12 * U, 12 * U, 0xcfe9ff, 0.8),
        scene.add.rectangle(-12 * U, -11 * U, 8 * U, 3 * U, 0x111111),
        scene.add.rectangle(12 * U, -11 * U, 8 * U, 3 * U, 0x111111)
      ]);
      content.add(car);
      tw({ targets: car, x: car.x + 4 * U, duration: 260 + i * 40, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    [['BEEP!', -70, -6, 0], ['HONK!', 60, -16, 300]].forEach(([label, x, y, delay]) => {
      const honk = scene.add.text(x * U, y * U, label, {
        fontFamily: 'PressStart2P', fontSize: fs(U, 11), color: '#ffd166'
      }).setOrigin(0.5).setAlpha(0);
      content.add(honk);
      tw({ targets: honk, alpha: 1, duration: 280, yoyo: true, repeat: -1, repeatDelay: 220, delay });
    });
  },

  roadworks({ scene, content, U, tw }) {
    for (let i = 0; i < 3; i++) {
      const cone = scene.add.triangle(-120 * U + i * 44 * U, 28 * U, 0, 30 * U, 15 * U, 0, 30 * U, 30 * U, 0xff7a1a)
        .setStrokeStyle(2, 0x1a0f08);
      content.add(cone);
      tw({ targets: cone, angle: { from: -4, to: 4 }, duration: 600 + i * 120, yoyo: true, repeat: -1 });
    }
    for (let i = 0; i < 5; i++) {
      content.add(scene.add.rectangle(-120 * U + i * 24 * U, 56 * U, 24 * U, 12 * U, i % 2 ? 0xf1e4c3 : 0xff7a1a));
    }
    content.add(scene.add.text(40 * U, 14 * U, 'Workers: 4\nWorking: 1', {
      fontFamily: 'SpecialElite', fontSize: fs(U, 22), color: '#f4e7c1'
    }).setOrigin(0, 0.5));
  },

  suspect({ scene, content, U, tw }) {
    const x = -120 * U;
    content.add(scene.add.rectangle(x, 24 * U, 28 * U, 48 * U, 0x6b5a45).setStrokeStyle(2, 0x1a0f08));
    content.add(scene.add.circle(x, -12 * U, 11 * U, 0xe0c9a6));
    content.add(scene.add.rectangle(x, -22 * U, 32 * U, 5 * U, 0x2b1d12));
    content.add(scene.add.rectangle(x, -29 * U, 18 * U, 10 * U, 0x2b1d12));

    const question = scene.add.text(x + 36 * U, -26 * U, '?', {
      fontFamily: 'PressStart2P', fontSize: fs(U, 20), color: '#ffd166'
    }).setOrigin(0.5);
    const suitcase = scene.add.container(-36 * U, 40 * U, [
      scene.add.rectangle(0, 0, 48 * U, 32 * U, 0x8a5a33).setStrokeStyle(2, 0x1a0f08),
      scene.add.rectangle(0, -20 * U, 16 * U, 6 * U, 0x2b1d12)
    ]);
    content.add([question, suitcase]);
    tw({ targets: question, alpha: { from: 0.3, to: 1 }, duration: 350, yoyo: true, repeat: -1 });
    tw({ targets: suitcase, angle: { from: -5, to: 5 }, duration: 160, yoyo: true, repeat: -1 });

    content.add(scene.add.text(80 * U, 6 * U, 'Unattended\nsuitcase.\nNot mine.', {
      fontFamily: 'SpecialElite', fontSize: fs(U, 20), color: '#f4e7c1', align: 'center'
    }).setOrigin(0.5));
  },

  chatter({ scene, content, U, tw }) {
    const style = {
      fontFamily: 'SpecialElite', fontSize: fs(U, 17), color: '#2b1d12',
      backgroundColor: '#f1e4c3', padding: { x: Math.round(8 * U), y: Math.round(5 * U) }
    };
    const first = scene.add.text(-50 * U, -8 * U, 'blah blah blah', style).setOrigin(0.5);
    const second = scene.add.text(30 * U, 40 * U, '...and another thing', style).setOrigin(0.5).setAlpha(0.35);
    content.add([first, second]);
    tw({ targets: first, alpha: { from: 1, to: 0.35 }, duration: 600, yoyo: true, repeat: -1 });
    tw({ targets: second, alpha: { from: 0.35, to: 1 }, duration: 600, yoyo: true, repeat: -1 });
  },

  smoke({ scene, content, U, tw }) {
    content.add(scene.add.rectangle(-80 * U, 48 * U, 80 * U, 30 * U, 0x4a4f57).setStrokeStyle(2, 0x1a0f08));
    for (let i = 0; i < 4; i++) {
      const puff = scene.add.circle(-84 * U + i * 6 * U, 34 * U, 10 * U, 0x9aa0a6, 0.7);
      content.add(puff);
      tw({
        targets: puff,
        y: -30 * U,
        alpha: { from: 0.7, to: 0 },
        scale: { from: 0.5, to: 1.7 },
        duration: 1500,
        repeat: -1,
        delay: i * 380
      });
    }
    content.add(scene.add.text(50 * U, 12 * U, 'Engine says:\n"Nope."', {
      fontFamily: 'SpecialElite', fontSize: fs(U, 22), color: '#f4e7c1'
    }).setOrigin(0.5));
  },

  waves({ scene, content, U, tw, stage }) {
    const boat = scene.add.image(-80 * U, 16 * U, stage.vehicleKey).setScale(0.55 * U);
    content.add(boat);
    tw({ targets: boat, angle: { from: -8, to: 8 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    content.add(scene.add.text(48 * U, 10 * U, 'Rough seas.\nBring a bucket.', {
      fontFamily: 'SpecialElite', fontSize: fs(U, 22), color: '#f4e7c1'
    }).setOrigin(0.5));
  },

  storm({ scene, content, U, tw }) {
    const bolt = scene.add.polygon(-90 * U, 10 * U, [
      0, -40 * U, 22 * U, -40 * U, 8 * U, -4 * U, 28 * U, -4 * U, -14 * U, 44 * U, -4 * U, 6 * U, -22 * U, 6 * U
    ], 0xffd166);
    content.add(bolt);
    tw({ targets: bolt, alpha: { from: 0.25, to: 1 }, duration: 160, yoyo: true, repeat: -1, repeatDelay: 380 });
    content.add(scene.add.text(40 * U, 10 * U, 'Storm ahead.\nSeatbelts: yes.', {
      fontFamily: 'SpecialElite', fontSize: fs(U, 22), color: '#f4e7c1'
    }).setOrigin(0.5));
  },

  reroute({ scene, content, U, tw }) {
    const label = scene.add.text(0, 10 * U, 'Recalculating route', {
      fontFamily: 'SpecialElite', fontSize: fs(U, 24), color: '#f4e7c1'
    }).setOrigin(0.5);
    content.add(label);
    for (let i = 0; i < 3; i++) {
      const dot = scene.add.circle(-24 * U + i * 24 * U, 48 * U, 5 * U, 0xffd166, 0.2);
      content.add(dot);
      tw({ targets: dot, alpha: { from: 0.2, to: 1 }, duration: 300, yoyo: true, repeat: -1, delay: i * 200 });
    }
  }
};

// --- full-screen layers -------------------------------------------------------

const OVERLAYS = {
  storm({ scene, width, height, layers }) {
    const tint = scene.add.rectangle(width / 2, height / 2, width, height, 0x0c1c2c, 0.2)
      .setDepth(TRAVEL_DEPTH.weather);
    const rain = scene.add.particles(0, -20, 'travel-rain-drop', {
      x: { min: -100, max: width + 100 },
      y: { min: -40, max: 0 },
      lifespan: { min: 500, max: 900 },
      quantity: 6,
      frequency: 45,
      speedX: { min: -40, max: 30 },
      speedY: { min: 720, max: 980 },
      alpha: { start: 0.9, end: 0.15 },
      rotate: 12
    }).setDepth(TRAVEL_DEPTH.weather);
    const flash = scene.add.rectangle(width / 2, height / 2, width, height, 0xf4f7ff, 0)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setDepth(TRAVEL_DEPTH.weather + 1);

    scene.effectObjects.push(tint, rain, flash);
    layers.push(tint, rain, flash);

    const trigger = () => {
      if (scene.isLeaving || !flash.active) return;
      scene.createTrackedTween({
        targets: flash,
        alpha: 0.45,
        duration: 80,
        yoyo: true,
        hold: 35,
        repeat: Phaser.Math.Between(0, 1),
        onComplete: () => {
          if (!scene.isLeaving && flash.active) {
            scene.time.delayedCall(Phaser.Math.Between(700, 1500), trigger);
          }
        }
      });
    };
    scene.time.delayedCall(400, trigger);
  },

  waves({ scene, width, pos, U, layers, tw }) {
    const g = scene.add.graphics().setDepth(TRAVEL_DEPTH.weather);
    scene.effectObjects.push(g);
    layers.push(g);

    const phase = { value: 0 };
    const draw = () => {
      g.clear();
      for (let band = 0; band < 3; band++) {
        g.lineStyle(3 * U, 0xe8f6f8, 0.36 - band * 0.09);
        g.beginPath();
        const baseY = pos.y + 34 * U + band * 34 * U;
        for (let x = 0; x <= width; x += 24 * U) {
          const y = baseY + Math.sin(x * 0.012 + phase.value + band) * 8 * U;
          if (x === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.strokePath();
      }
    };
    draw();
    tw({ targets: phase, value: Math.PI * 2, duration: 2400, repeat: -1, ease: 'Linear', onUpdate: draw });
  },

  reroute({ stage }) {
    stage.startDetour(0xffd166);
  }
};

// Returns { dismiss } - call it when the vehicle sets off again.
export function playEncounterEffect(scene, stage, encounter, { penalty = 0 } = {}) {
  const visual = getEncounterVisual(encounter);
  if (!visual) return { dismiss() {} };

  const { width, height, U } = stage;
  const pos = stage.getVehiclePosition();
  const color = visual.color;
  const tweens = [];
  const layers = [];
  const tw = (config) => {
    const tween = scene.createTrackedTween(config);
    if (tween) tweens.push(tween);
    return tween;
  };

  // popup placement: above the vehicle, below it if there is no room
  const popupW = 380 * U;
  const popupH = 176 * U;
  const px = Phaser.Math.Clamp(pos.x, popupW / 2 + 24 * U, width - popupW / 2 - 24 * U);
  let py = pos.y - (popupH / 2 + 64 * U);
  if (py - popupH / 2 < 130 * U) py = pos.y + popupH / 2 + 64 * U;

  const popup = scene.add.container(px, py).setDepth(TRAVEL_DEPTH.popup);
  scene.effectObjects.push(popup);

  const frame = scene.add.graphics();
  frame.fillStyle(0x0b1620, 0.94);
  frame.fillRoundedRect(-popupW / 2, -popupH / 2, popupW, popupH, 12 * U);
  frame.lineStyle(3 * U, color, 0.95);
  frame.strokeRoundedRect(-popupW / 2, -popupH / 2, popupW, popupH, 12 * U);
  popup.add(frame);

  popup.add(scene.add.text(0, -popupH / 2 + 30 * U, visual.stamp, {
    fontFamily: 'PressStart2P', fontSize: fs(U, 15), color: hex(color)
  }).setOrigin(0.5));

  if (penalty > 0) {
    popup.add(scene.add.text(popupW / 2 - 18 * U, -popupH / 2 + 30 * U, `+${penalty}h`, {
      fontFamily: 'PressStart2P', fontSize: fs(U, 13), color: '#ff8a5c'
    }).setOrigin(1, 0.5));
  }

  const content = scene.add.container(0, 18 * U);
  popup.add(content);

  const ctx = { scene, stage, content, U, color, tw, penalty, layers, pos, width, height };
  CONTENT[visual.archetype]?.(ctx);
  OVERLAYS[visual.archetype]?.(ctx);

  popup.setScale(0.6).setAlpha(0);
  tw({ targets: popup, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;

    tweens.forEach((tween) => scene.removeTrackedTween(tween));
    stage.stopDetour();

    scene.createTrackedTween({
      targets: popup,
      scale: 0.7,
      alpha: 0,
      duration: 220,
      ease: 'Back.easeIn',
      onComplete: () => { if (popup.active) popup.destroy(); }
    });

    if (layers.length) {
      layers.forEach((layer) => {
        scene.killTrackedTweensOf(layer);
        layer.stop?.();
      });
      scene.createTrackedTween({
        targets: layers,
        alpha: 0,
        duration: 1200,
        onComplete: () => layers.forEach((layer) => { if (layer.active) layer.destroy(); })
      });
    }
  };

  return { dismiss };
}
