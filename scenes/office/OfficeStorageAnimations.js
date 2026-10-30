const PANES = [
  [1226, 173, 1267, 162, 1267, 281, 1226, 286],
  [1287, 159, 1336, 146, 1336, 275, 1287, 281],
  [1355, 141, 1381, 134, 1381, 267, 1355, 272],
  [1447, 117, 1509, 101, 1509, 256, 1447, 265],
  [1531, 96, 1593, 80, 1593, 245, 1531, 253],
  [1614, 75, 1660, 63, 1660, 232, 1614, 242],
  [1752, 44, 1836, 23, 1836, 213, 1752, 225],
  [1856, 19, 1919, 2, 1919, 199, 1856, 208]
];

export class OfficeStorageAnimations {
  constructor(scene) {
    this.scene = scene;
    this.disposed = false;
    this.elapsed = 0;
    this.particles = Array.from({ length: 25 }, (_, i) => ({
      x: (i * 0.61803398875) % 1, y: (i * 0.38196601125) % 1,
      phase: i * 1.7, speed: 0.009 + (i % 5) * 0.003
    }));
    this.create();
  }

  create() {
    const scene = this.scene;
    const bg = scene.rooms?.storage?.bg;
    if (!bg?.active) {
      console.warn('[StorageAnimations] Storage background is unavailable.');
      this.disposed = true;
      return;
    }
    this.root = scene.add.container(0, 0).setDepth(bg.depth + 2).setVisible(false);
    this.maskGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
    this.maskGraphics.fillStyle(0xffffff, 1);
    for (const points of PANES) {
      this.maskGraphics.fillPoints(Array.from({ length: points.length / 2 }, (_, i) => ({
        x: points[i * 2], y: points[i * 2 + 1]
      })), true);
    }
    this.windowMask = this.maskGraphics.createGeometryMask();
    this.window = scene.add.graphics().setMask(this.windowMask);
    this.dust = scene.add.graphics();
    this.recorder = scene.add.graphics();
    this.root.add([this.window, this.dust, this.recorder]);
    this.layout();
    scene.events.on('update', this.update, this);
    scene.scale.on('resize', this.layout, this);
    scene.events.once('shutdown', this.destroy, this);
    scene.events.once('destroy', this.destroy, this);
  }

  layout() {
    const bg = this.scene.rooms?.storage?.bg;
    if (this.disposed || !bg?.active) return;
    const sx = bg.displayWidth / 1920;
    const sy = bg.displayHeight / 1080;
    this.root.setPosition(bg.x, bg.y).setScale(sx, sy);
    this.maskGraphics.setPosition(bg.x, bg.y).setScale(sx, sy);
  }

  update(_time, delta) {
    if (this.disposed) return;
    const visible = this.scene.currentView === 'storage';
    this.root.setVisible(visible);
    if (!visible) return;
    this.elapsed += Math.min(delta, 100);
    this.drawWindow();
    this.drawDust();
    this.drawRecorder();
  }

  drawWindow() {
    const g = this.window;
    const t = this.elapsed / 1000;
    g.clear();
    const x = 1050 + ((t * 5) % 1160);
    for (let i = 0; i < 5; i++) {
      g.fillStyle(0x485765, 0.012);
      g.fillEllipse(x + i * 12, 155, 175 + i * 22, 370);
    }
  }

  drawDust() {
    const g = this.dust;
    const t = this.elapsed / 1000;
    g.clear();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const progress = (p.y + t * p.speed) % 1;
      const nearLamp = i < 6;
      const x = nearLamp
        ? 28 + p.x * 125 + Math.sin(t * 0.3 + p.phase) * 6
        : 1180 + p.x * 470 - progress * 110 + Math.sin(t * 0.22 + p.phase) * 8;
      const y = nearLamp ? 505 + progress * 135 : 290 + progress * 220;
      const fade = Math.sin(progress * Math.PI);
      g.fillStyle(0xf0e3bf, fade * (nearLamp ? 0.18 : 0.14));
      g.fillCircle(x, y, 0.7 + (Math.sin(p.phase) + 1) * 0.25);
    }
  }

  drawRecorder() {
    const g = this.recorder;
    const t = this.elapsed / 1000;
    g.clear();
    // Standby lamp and low-level meter activity only: no new audio or tape playback state.
    const pulse = (Math.sin(t * 1.4) + 1) / 2;
    g.fillStyle(0x98c783, 0.045 + pulse * 0.035);
    g.fillCircle(1748, 425, 5);
    g.fillStyle(0xa7d48e, 0.48 + pulse * 0.18);
    g.fillCircle(1748, 425, 1.5);
    for (let row = 0; row < 2; row++) {
      const level = 2 + Math.floor((Math.sin(t * 1.9 + row * 1.3)
        + Math.sin(t * 0.8 + row) + 2) * 1.5);
      for (let i = 0; i < 8; i++) {
        g.fillStyle(i < 6 ? 0x9ebd79 : 0xd4b274, i < level ? 0.40 : 0.045);
        g.fillRect(1770 + i * 4.5, 422 + row * 5, 3, 2);
      }
    }
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    const scene = this.scene;
    scene.events.off('update', this.update, this);
    scene.scale.off('resize', this.layout, this);
    scene.events.off('shutdown', this.destroy, this);
    scene.events.off('destroy', this.destroy, this);
    this.window.clearMask();
    this.root.destroy(true);
    this.windowMask.destroy();
    this.maskGraphics.destroy();
    this.particles = [];
  }
}
