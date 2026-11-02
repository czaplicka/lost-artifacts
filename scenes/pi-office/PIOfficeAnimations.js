const WINDOWS = [
  [0, 365, 129, 365, 129, 419, 78, 443, 31, 484, 0, 491],
  [328, 275, 626, 283, 626, 564, 328, 564],
  [1350, 304, 1653, 306, 1653, 525, 1460, 525, 1437, 515, 1350, 519]
];
const TV = [143, 449, 258, 447, 260, 545, 145, 559];
const MONITOR = [1471, 677, 1686, 707, 1672, 903, 1452, 877];

export class PIOfficeAnimations {
  constructor(scene) {
    this.scene = scene;
    this.disposed = false;
    this.elapsed = 0;
    this.objects = [];
    this.masked = [];
    this.maskGraphics = [];
    this.masks = [];
    this.windows = this.graphics(WINDOWS);
    this.tv = this.graphics([TV]);
    this.monitor = this.graphics([MONITOR]);
    this.steam = this.graphics();
    this.layout();
    scene.events.on('update', this.update, this);
    scene.scale.on('resize', this.layout, this);
    scene.events.once('shutdown', this.destroy, this);
    scene.events.once('destroy', this.destroy, this);
    this.update(0, 0);
  }

  graphics(polygons = null) {
    const g = this.scene.add.graphics().setDepth(3).setVisible(false);
    this.objects.push(g);
    if (polygons) {
      const shape = this.scene.make.graphics({ x: 0, y: 0, add: false });
      shape.fillStyle(0xffffff, 1);
      for (const points of polygons) shape.fillPoints(
        Array.from({ length: points.length / 2 }, (_, i) => ({
          x: points[i * 2], y: points[i * 2 + 1]
        })), true);
      const mask = shape.createGeometryMask();
      g.setMask(mask);
      this.masked.push(g);
      this.maskGraphics.push(shape);
      this.masks.push(mask);
    }
    return g;
  }

  layout() {
    const bg = this.scene.officeBackground;
    if (this.disposed || !bg?.active) return;
    const width = bg.displayWidth;
    const height = bg.displayHeight;
    const x = bg.x - width * (bg.originX ?? 0);
    const y = bg.y - height * (bg.originY ?? 0);
    for (const g of [...this.objects, ...this.maskGraphics]) {
      g.setPosition(x, y).setScale(width / 1920, height / 1080);
    }
  }

  update(_time, delta) {
    if (this.disposed) return;
    const scene = this.scene;
    const visible = Boolean(!scene.disposed && !scene._cleanupDone && !scene.navigating &&
      !scene.debugMode && !scene.activeDevice && !scene.computerChild && !scene.childLoading &&
      scene.officeBackground?.active && scene.officeBackground?.visible);
    for (const g of this.objects) g.setVisible(visible);
    if (!visible) return;
    this.elapsed += Math.min(Math.max(Number(delta) || 0, 0), 100);
    this.layout();
    this.drawWindows();
    this.drawTV();
    this.drawMonitor();
    this.drawSteam();
  }

  drawWindows() {
    const g = this.windows;
    const t = this.elapsed / 1000;
    g.clear();
    // Slow changes in a few distant windows, not a flashing whole-room overlay.
    const lights = [
      { x: 371, y: 375 }, { x: 461, y: 326 }, { x: 573, y: 403 },
      { x: 1388, y: 389 }, { x: 1487, y: 349 }, { x: 1598, y: 421 }
    ];
    for (let i = 0; i < lights.length; i++) {
      const p = lights[i];
      const pulse = (Math.sin(t * 0.42 + i * 2.1) + 1) / 2;
      g.fillStyle(0xdedbaf, pulse * 0.48);
      g.fillRect(p.x, p.y, 4, 8);
    }
    for (let i = 0; i < 68; i++) {
      const lane = i % 2;
      const width = lane === 0 ? 300 : 305;
      const left = lane === 0 ? 328 : 1350;
      const x = left + ((i * 73.37 + t * 17) % width);
      const y = 275 + ((i * 51.61 + t * (95 + i % 5 * 9)) % 310);
      g.lineStyle(1, 0xb8cfdb, 0.13 + (i % 3) * 0.035);
      g.lineBetween(x, y, x - 3, y + 14 + i % 8);
    }
    // A faint moving reflection, restricted to the glass.
    const reflection = 320 + ((t * 22) % 1500);
    g.fillStyle(0x9db4c2, 0.035);
    g.fillRect(reflection, 290, 18, 290);
  }

  drawTV() {
    const g = this.tv;
    const t = this.elapsed / 1000;
    g.clear();
    g.fillStyle(0xd8e1d2, 0.035 + (Math.sin(t * 3) + 1) * 0.015);
    g.fillRect(135, 440, 135, 130);
    g.fillStyle(0x071017, 0.16);
    for (let y = 445; y < 565; y += 4) g.fillRect(135, y, 135, 1);
    const scan = 442 + ((t * 25) % 125);
    g.fillStyle(0xe4e8d9, 0.24);
    g.fillRect(135, scan, 135, 3);
    const tick = Math.floor(t * 12);
    for (let i = 0; i < 20; i++) {
      const x = 141 + ((i * 31 + tick * 17) % 119);
      const y = 447 + ((i * 43 + tick * 13) % 113);
      g.fillStyle(i % 2 ? 0xdfe5da : 0x101a1d, 0.17);
      g.fillRect(x, y, 1 + i % 3, 1);
    }
    // A brief tracking fault, at a readable interval rather than constant rapid flashes.
    const cycle = t % 17;
    if (cycle > 9 && cycle < 9.45) {
      g.fillStyle(0x0d1318, 0.23);
      g.fillRect(135, 493, 135, 11);
      g.fillStyle(0xe4e8d9, 0.25);
      g.fillRect(135, 506, 135, 2);
    }
  }

  drawMonitor() {
    const g = this.monitor;
    const t = this.elapsed / 1000;
    g.clear();
    // Keep Mittens and all painted text; add only transparent CRT effects.
    g.fillStyle(0x91bfa0, 0.025 + (Math.sin(t * 0.8) + 1) * 0.015);
    g.fillRect(1440, 665, 260, 250);
    g.fillStyle(0x071713, 0.08);
    for (let y = 670; y < 912; y += 4) g.fillRect(1440, y, 260, 1);
    const scan = 680 + ((t * 30) % 230);
    g.fillStyle(0xa9cfb8, 0.19);
    g.fillRect(1440, scan, 260, 4);
    if (Math.floor(t * 1.4) % 2 === 0) {
      g.fillStyle(0xb9d2bd, 0.75);
      g.fillRect(1651, 884, 8, 3);
    }
  }

  drawSteam() {
    const g = this.steam;
    const t = this.elapsed / 1000;
    g.clear();
    for (let plume = 0; plume < 4; plume++) {
      const progress = (t * 0.19 + plume * 0.25) % 1;
      const centerY = 807 - progress * 115;
      const centerX = 1023 + Math.sin(t * 0.8 + plume * 1.8) * (5 + progress * 10);
      const fade = Math.sin(progress * Math.PI) * 0.30;
      const points = [];
      for (let i = 0; i < 18; i++) {
        const u = i / 17;
        points.push({ x: centerX + Math.sin(u * 5 + t * 1.1 + plume) * (3 + progress * 6),
          y: centerY - u * 32 });
      }
      g.lineStyle(6, 0xd5d6c9, fade * 0.16);
      g.strokePoints(points, false);
      g.lineStyle(2.5, 0xe0e0d3, fade);
      g.strokePoints(points, false);
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
    for (const g of this.masked) g.clearMask();
    for (const g of this.objects) g.destroy();
    for (const m of this.masks) m.destroy();
    for (const g of this.maskGraphics) g.destroy();
    this.objects = []; this.masked = []; this.masks = []; this.maskGraphics = [];
  }
}
