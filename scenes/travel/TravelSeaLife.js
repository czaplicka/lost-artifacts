// scenes/travel/TravelSeaLife.js
// Sea-voyage extras for TravelRouteStage (only created for ship legs):
//   - three seagulls hovering around the ship, flapping, lagging a little behind it
//   - a shark fin that circles the ship, submerges now and then, and brings its own soundtrack
//
// Everything is time-driven (not tied to the vehicle tween), so the animals keep
// moving while the ship is paused by an incident. Cleaned up together with the stage.

import { TRAVEL_DEPTH, fs } from './TravelTextures.js';

const GULL_COUNT = 3;
const FIN_LINES = ['da-dum...', 'da-dum... da-dum...', 'it is probably a dolphin.'];

export class TravelSeaLife {
  constructor(stage) {
    this.stage = stage;
    this.scene = stage.scene;
    this.tweens = [];
    this.destroyed = false;
    this.started = false;
    this.finLineShown = false;
    this.gulls = [];
    this.fin = null;

    // Everything scales with the vehicle (shorter routes -> smaller ship -> smaller animals).
    const vehicleScale = stage.transport.vehicleScale ?? 0.7;
    this.s = stage.baseScale / vehicleScale;

    this.buildGulls();
    this.buildFin();

    const state = { t: 0 };

    this.tween({
      targets: state,
      t: 1,
      duration: 60000,
      repeat: -1,
      ease: 'Linear',
      onUpdate: () => this.update()
    });
  }

  tween(config) {
    const tween = this.scene.createTrackedTween(config);
    if (tween) this.tweens.push(tween);
    return tween;
  }

  // ------------------------------------------------------------------ gulls
  buildGulls() {
    const { scene, stage, s } = this;

    for (let i = 0; i < GULL_COUNT; i += 1) {
      const wings = scene.add.graphics();
      const points = [
        { x: -13, y: 3 }, { x: -6, y: -4 }, { x: 0, y: 1 },
        { x: 6, y: -4 }, { x: 13, y: 3 }
      ];

      // dark outline first, white bird on top (readable on parchment and on dark map)
      wings.lineStyle(5, 0x1a0f08, 0.55);
      wings.strokePoints(points, false);
      wings.lineStyle(3, 0xf7f3e6, 1);
      wings.strokePoints(points, false);

      const gull = stage.track(
        scene.add.container(0, 0, [wings]).setAlpha(0).setScale(s * 1.4),
        TRAVEL_DEPTH.vehicle + 0.5
      );

      this.gulls.push({
        node: gull,
        wings,
        phase: i * 2.1,
        radius: (46 + i * 22) * s,
        height: (30 + i * 12) * s,
        speed: 0.55 + i * 0.17,
        x: 0,
        y: 0
      });

      this.tween({
        targets: wings,
        scaleY: { from: 1, to: 0.35 },
        duration: 170 + i * 35,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  // -------------------------------------------------------------------- fin
  buildFin() {
    const { scene, stage, s } = this;

    const wake = scene.add.ellipse(0, 2 * s, 34 * s, 10 * s)
      .setStrokeStyle(2 * s, 0xeaf6f8, 0.7);

    const body = scene.add.graphics();
    const fin = [{ x: -13, y: 0 }, { x: -2, y: -26 }, { x: 7, y: 0 }];

    body.fillStyle(0x5d6b73, 1);
    body.fillPoints(fin, true);
    body.lineStyle(2, 0x1a0f08, 1);
    body.strokePoints(fin, true);
    body.lineStyle(1.5, 0xaab8bf, 0.6);
    body.lineBetween(-2, -22, -1, -4);

    const node = stage.track(
      scene.add.container(0, 0, [wake, body]).setAlpha(0).setScale(s * 1.2),
      TRAVEL_DEPTH.trail - 0.2
    );

    const caption = stage.track(
      scene.add.text(0, 0, '', {
        fontFamily: 'SpecialElite',
        fontSize: fs(stage.U, 20),
        color: '#f4e7c1',
        stroke: '#1a0f08',
        strokeThickness: Math.max(2, Math.round(5 * stage.U))
      }).setOrigin(0.5).setAlpha(0),
      TRAVEL_DEPTH.vehicle + 1
    );

    this.fin = { node, wake, caption, angle: 0, visible: false, x: 0, y: 0 };

    this.tween({
      targets: wake,
      scaleX: { from: 1, to: 1.5 },
      scaleY: { from: 1, to: 1.6 },
      alpha: { from: 1, to: 0.25 },
      duration: 900,
      repeat: -1,
      ease: 'Sine.easeOut'
    });
  }

  say(line) {
    const { scene, fin } = this;

    if (!fin?.caption?.active) return;

    fin.caption.setText(line).setAlpha(0);

    this.tween({
      targets: fin.caption,
      alpha: { from: 0, to: 1 },
      duration: 250,
      yoyo: true,
      hold: 1700,
      onComplete: () => { if (fin.caption?.active) fin.caption.setAlpha(0); }
    });

    void scene;
  }

  // ----------------------------------------------------------------- update
  update() {
    if (this.destroyed) return;

    const { stage, scene, s } = this;
    const vehicle = stage.vehicle;

    // The ship is not on the map yet (intro zoom): keep the animals hidden.
    if (!vehicle?.active || vehicle.alpha <= 0) return;

    const now = scene.time.now / 1000;
    const dt = Math.min(50, scene.game?.loop?.delta || 16);
    const follow = Math.min(1, dt * 0.004);

    const px = stage.position.x;
    const py = stage.position.y;

    // --- gulls
    for (const gull of this.gulls) {
      const targetX = px + Math.cos(now * gull.speed + gull.phase) * gull.radius;
      const targetY = py - gull.height + Math.sin(now * gull.speed * 1.3 + gull.phase) * 14 * s;

      if (!this.started) {
        gull.x = targetX;
        gull.y = targetY;
      } else {
        gull.x += (targetX - gull.x) * follow;
        gull.y += (targetY - gull.y) * follow;
      }

      gull.node.setPosition(gull.x, gull.y);
      gull.node.setAngle(Math.sin(now * 1.7 + gull.phase) * 8);
      gull.node.setAlpha(Math.min(1, gull.node.alpha + 0.05));
    }

    // --- shark fin: circles the ship on a flattened ellipse, submerges periodically
    const fin = this.fin;
    fin.angle += dt * 0.0011;

    const radiusX = 120 * s;
    const radiusY = 52 * s;
    const targetX = px + Math.cos(fin.angle) * radiusX;
    const targetY = py + 26 * s + Math.sin(fin.angle) * radiusY;

    if (!this.started) {
      fin.x = targetX;
      fin.y = targetY;
    } else {
      fin.x += (targetX - fin.x) * follow;
      fin.y += (targetY - fin.y) * follow;
    }

    const shouldShow = Math.sin(now * 0.7) > -0.25;

    fin.node.setPosition(fin.x, fin.y);
    // facing the direction of its swim
    fin.node.setScale(
      (Math.sin(fin.angle) >= 0 ? -1 : 1) * Math.abs(fin.node.scaleX),
      fin.node.scaleY
    );

    const goalAlpha = shouldShow ? 1 : 0;
    fin.node.setAlpha(fin.node.alpha + (goalAlpha - fin.node.alpha) * 0.08);

    if (shouldShow && !fin.visible) {
      fin.visible = true;

      if (this.started && !this.finLineShown) {
        this.finLineShown = true;
        this.say(FIN_LINES[Math.floor(Math.random() * FIN_LINES.length)]);
      }
    } else if (!shouldShow) {
      fin.visible = false;
    }

    fin.caption.setPosition(fin.x, fin.y - 48 * s);

    this.started = true;
  }

  // -------------------------------------------------------------------- end
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    this.tweens.forEach((tween) => this.scene.removeTrackedTween?.(tween));
    this.tweens = [];

    // Display objects are destroyed with the other stage objects.
    this.gulls = [];
    this.fin = null;
  }
}