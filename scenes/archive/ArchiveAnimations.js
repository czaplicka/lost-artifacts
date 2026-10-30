const SCREENS = [
  [468, 139, 571, 150, 571, 239, 468, 229],
  [627, 161, 724, 174, 724, 257, 627, 246],
  [786, 186, 872, 197, 872, 274, 786, 263],
  [470, 311, 574, 316, 574, 413, 470, 405],
  [627, 330, 728, 335, 728, 423, 627, 418],
  [787, 339, 868, 342, 868, 429, 787, 424]
];
const MAP = [976, 454, 1195, 455, 1195, 605, 976, 605];
const LEDS = [
  { x: 180, y: 82, phase: 0 }, { x: 230, y: 89, phase: 1.5 },
  { x: 280, y: 96, phase: 3 }, { x: 333, y: 135, phase: 4.5 },
  { x: 180, y: 205, phase: 2.4 }, { x: 282, y: 218, phase: 5 },
  { x: 357, y: 226, phase: 0.8 },
  { x: 1770, y: 592, phase: 1 }, { x: 1787, y: 592, phase: 3.3 }
];

export class ArchiveAnimations {
  constructor(scene) {
    this.scene = scene;
    this.disposed = false;
    this.elapsed = 0;
    this.maskGraphics = [];
    this.masks = [];
    this.maskedItems = [];
    this.particles = Array.from({ length: 18 }, (_, i) => ({
      x: (i * 0.61803398875) % 1, y: (i * 0.38196601125) % 1,
      phase: i * 1.7, speed: 0.012 + (i % 4) * 0.004
    }));
    this.create();
  }

  mask(points) {
    const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillPoints(Array.from({ length: points.length / 2 }, (_, i) => ({
      x: points[i * 2], y: points[i * 2 + 1]
    })), true);
    const result = g.createGeometryMask();
    this.maskGraphics.push(g);
    this.masks.push(result);
    return result;
  }

  create() {
    const scene = this.scene;
    this.root = scene.add.container(0, 0).setDepth(2).setVisible(false);
    this.screens = SCREENS.map(points => {
      const g = scene.add.graphics().setMask(this.mask(points));
      this.maskedItems.push(g);
      this.root.add(g);
      return g;
    });
    this.map = scene.add.graphics().setMask(this.mask(MAP));
    this.maskedItems.push(this.map);
    this.leds = scene.add.graphics();
    this.meters = scene.add.graphics();
    this.dust = scene.add.graphics();
    this.root.add([this.map, this.leds, this.meters, this.dust]);
    this.layout();
    scene.events.on('update', this.update, this);
    scene.scale.on('resize', this.layout, this);
    scene.events.once('shutdown', this.destroy, this);
    scene.events.once('destroy', this.destroy, this);
  }

  layout() {
    const bg = this.scene.background;
    if (this.disposed || !bg?.active) return;
    const sx = bg.displayWidth / 1920;
    const sy = bg.displayHeight / 1080;
    this.root.setPosition(bg.x, bg.y).setScale(sx, sy);
    for (const g of this.maskGraphics) g.setPosition(bg.x, bg.y).setScale(sx, sy);
  }

  update(_time, delta) {
    if (this.disposed) return;
    const bg = this.scene.background;
    // The archivist background may have a different composition. Never draw over Frank blindly.
    const visible = Boolean(!this.scene._archiveDisposed && !this.scene.isLeaving &&
      bg?.active && bg.visible && bg.texture?.key === 'archive');
    this.root.setVisible(visible);
    if (!visible) return;
    this.elapsed += Math.min(delta, 100);
    this.drawScreens();
    this.drawMap();
    this.drawLeds();
    this.drawMeters();
    this.drawDust();
  }

  drawScreens() {
    const t = this.elapsed / 1000;
    for (let i = 0; i < this.screens.length; i++) {
      const g = this.screens[i];
      const points = SCREENS[i];
      const xs = points.filter((_, index) => index % 2 === 0);
      const ys = points.filter((_, index) => index % 2 === 1);
      const x = Math.min(...xs), y = Math.min(...ys);
      const w = Math.max(...xs) - x, h = Math.max(...ys) - y;
      g.clear();
      g.fillStyle(0x8ac8ad, 0.014 + (Math.sin(t * 0.8 + i) + 1) * 0.012);
      g.fillRect(x, y, w, h);
      g.fillStyle(0x102a25, 0.045);
      for (let line = y; line < y + h; line += 4) g.fillRect(x, line, w, 1);
      const scanY = y - 5 + ((t * (10 + i * 1.3) + i * 19) % (h + 10));
      g.fillStyle(0xb4dfce, 0.10);
      g.fillRect(x, scanY, w, 2);
    }
  }

  drawMap() {
    const g = this.map;
    const phase = (this.elapsed % 3000) / 3000;
    const pulse = (Math.sin(phase * Math.PI * 2) + 1) / 2;
    const x = 1080, y = 535;
    g.clear();
    g.fillStyle(0xe56b57, 0.07 + pulse * 0.06);
    g.fillCircle(x, y, 10 + pulse * 2);
    g.lineStyle(1, 0xf3a17b, (1 - phase) * 0.45);
    g.strokeCircle(x, y, 4 + phase * 13);
    g.fillStyle(0xf19b77, 0.75 + pulse * 0.2);
    g.fillCircle(x, y, 2.6);
  }

  drawLeds() {
    const g = this.leds;
    const t = this.elapsed / 1000;
    g.clear();
    for (const led of LEDS) {
      const cycle = (t + led.phase) % 5.8;
      const dip = cycle > 4.8 && cycle < 5.3;
      if (dip) {
        g.fillStyle(0x162d2b, 0.62);
        g.fillRect(led.x - 3.5, led.y - 3.5, 7, 7);
      } else {
        g.fillStyle(0x9ae3a3, 0.04 + (Math.sin(t + led.phase) + 1) * 0.025);
        g.fillCircle(led.x, led.y, 5);
      }
    }
  }

  drawMeters() {
    const g = this.meters;
    const t = this.elapsed / 1000;
    g.clear();
    for (let i = 0; i < 2; i++) {
      const x = i === 0 ? 218 : 272;
      const y = i === 0 ? 778 : 771;
      const angle = -Math.PI / 2 + Math.sin(t * 1.35 + i * 1.4) * 0.42;
      g.lineStyle(1.2, 0x684c39, 0.8);
      g.lineBetween(x, y, x + Math.cos(angle) * 13, y + Math.sin(angle) * 13);
    }
    for (let i = 0; i < 6; i++) {
      const level = (Math.sin(t * 0.9 + i * 1.1) + 1) / 2;
      g.fillStyle(0x95d0bb, 0.035 + level * 0.09);
      g.fillRect(1773 + i * 15, 935, 3, 55);
    }
  }

  drawDust() {
    const g = this.dust;
    const t = this.elapsed / 1000;
    g.clear();
    for (const p of this.particles) {
      const progress = (p.y + t * p.speed) % 1;
      const width = 75 + progress * 180;
      const x = 1470 + (p.x - 0.5) * width + Math.sin(t * 0.3 + p.phase) * 5;
      const y = 378 + progress * 165;
      g.fillStyle(0xf0dfb5, Math.sin(progress * Math.PI) * 0.19);
      g.fillCircle(x, y, 0.7 + (Math.sin(p.phase) + 1) * 0.2);
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
    for (const item of this.maskedItems) item.clearMask();
    this.root.destroy(true);
    for (const mask of this.masks) mask.destroy();
    for (const g of this.maskGraphics) g.destroy();
    this.masks = [];
    this.maskGraphics = [];
    this.maskedItems = [];
    this.particles = [];
  }
}
