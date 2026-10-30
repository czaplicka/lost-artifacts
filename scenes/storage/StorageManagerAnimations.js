const MANAGER_KEY = 'agency_storage_manager';
const SCREENS = [
  [680, 136, 780, 135, 780, 195, 680, 195],
  [541, 481, 626, 481, 626, 551, 541, 551],
  [1207, 288, 1297, 288, 1297, 342, 1207, 342]
];
const WINDOW_PANES = [
  [269, 192, 322, 208, 322, 340, 269, 339],
  [269, 370, 322, 373, 322, 500, 269, 505]
];
const CONSOLE_LINES = ['STOCK CHECK', 'ROPES: 12', 'HOOKS: DENIED', 'FORMS: MANY', 'ALL FILED.'];

export class StorageManagerAnimations {
  constructor(scene) {
    this.scene = scene;
    this.disposed = false;
    this.elapsed = 0;
    this.masks = [];
    this.maskGraphics = [];
    this.maskedItems = [];
    this.particles = Array.from({ length: 22 }, (_, i) => ({
      x: (i * 0.61803398875) % 1, y: (i * 0.38196601125) % 1,
      phase: i * 1.7, speed: 0.012 + (i % 4) * 0.003
    }));
    this.create();
  }

  makeMask(polygons) {
    const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    for (const points of polygons) {
      g.fillPoints(Array.from({ length: points.length / 2 }, (_, i) => ({
        x: points[i * 2], y: points[i * 2 + 1]
      })), true);
    }
    const mask = g.createGeometryMask();
    this.masks.push(mask);
    this.maskGraphics.push(g);
    return mask;
  }

  applyMask(item, mask) {
    item.setMask(mask);
    this.maskedItems.push(item);
    return item;
  }

  create() {
    const scene = this.scene;
    this.root = scene.add.container(0, 0).setDepth(2).setVisible(false);
    const screenMasks = SCREENS.map(points => this.makeMask([points]));
    this.screens = screenMasks.map(mask => this.applyMask(scene.add.graphics(), mask));
    this.console = this.applyMask(scene.add.text(547, 489, '', {
      fontFamily: 'monospace', fontSize: '8px', color: '#92b591',
      lineSpacing: 3, padding: 0
    }), screenMasks[1]);
    this.cursor = this.applyMask(scene.add.rectangle(547, 489, 4, 7, 0xa7c79c)
      .setOrigin(0), screenMasks[1]);
    this.window = this.applyMask(scene.add.graphics(), this.makeMask(WINDOW_PANES));
    this.light = scene.add.graphics();
    this.dust = scene.add.graphics();
    this.root.add([this.window, this.light, ...this.screens, this.console, this.cursor, this.dust]);
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
    const visible = Boolean(!this.scene._storageDisposed && !this.scene.isLeaving &&
      bg?.active && bg.visible && bg.texture?.key === MANAGER_KEY);
    this.root.setVisible(visible);
    if (!visible) return;
    // Keep up with showManagerBackground(), including backgrounds created after create().
    this.layout();
    this.elapsed += Math.min(Math.max(Number(delta) || 0, 0), 100);
    this.drawScreens();
    this.updateConsole();
    this.drawWindow();
    this.drawLight();
    this.drawDust();
  }

  drawScreens() {
    const t = this.elapsed / 1000;
    for (let i = 0; i < this.screens.length; i++) {
      const g = this.screens[i];
      const points = SCREENS[i];
      const xs = points.filter((_, j) => j % 2 === 0);
      const ys = points.filter((_, j) => j % 2 === 1);
      const x = Math.min(...xs), y = Math.min(...ys);
      const w = Math.max(...xs) - x, h = Math.max(...ys) - y;
      g.clear();
      if (i === 1) {
        g.fillStyle(0x162319, 0.70);
        g.fillRect(x, y, w, h);
      }
      g.fillStyle(0x8fba93, 0.018 + (Math.sin(t * 0.7 + i) + 1) * 0.01);
      g.fillRect(x, y, w, h);
      g.fillStyle(0x0c1d14, 0.055);
      for (let yy = y; yy < y + h; yy += 4) g.fillRect(x, yy, w, 1);
      g.fillStyle(0xb2d2af, 0.075);
      g.fillRect(x, y - 3 + ((t * (7 + i * 2) + i * 17) % (h + 6)), w, 2);
    }
  }

  updateConsole() {
    // Purely decorative inventory: these lines never change real game inventory.
    const cycle = this.elapsed % 19000;
    let remaining = Math.floor(cycle / 145);
    const lines = [];
    let current = '';
    for (const line of CONSOLE_LINES) {
      if (remaining >= line.length + 8) {
        lines.push(line);
        remaining -= line.length + 8;
      } else {
        current = line.slice(0, Math.min(remaining, line.length));
        break;
      }
    }
    const display = [...lines, current].slice(0, 5);
    this.console.setText(display.join('\n'));
    const row = Math.min(lines.length, 4);
    this.cursor.setPosition(547 + current.length * 4.8, 489 + row * 11);
    this.cursor.setVisible(lines.length < CONSOLE_LINES.length && Math.floor(this.elapsed / 550) % 2 === 0);
  }

  drawWindow() {
    const g = this.window;
    const t = this.elapsed / 1000;
    g.clear();
    const x = 170 + ((t * 3.5) % 280);
    for (let i = 0; i < 5; i++) {
      g.fillStyle(0x626b4c, 0.009);
      g.fillEllipse(x + i * 6, 350, 70 + i * 17, 400);
    }
  }

  drawLight() {
    const g = this.light;
    const t = this.elapsed / 1000;
    const pulse = (Math.sin(t * 0.45) + 1) / 2;
    g.clear();
    g.fillStyle(0xffe3a3, 0.015 + pulse * 0.018);
    g.fillEllipse(966, 117, 140, 39);
  }

  drawDust() {
    const g = this.dust;
    const t = this.elapsed / 1000;
    g.clear();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const progress = (p.y + t * p.speed) % 1;
      const window = i >= 14;
      const x = window
        ? 350 + p.x * 95 + progress * 35 + Math.sin(t * 0.2 + p.phase) * 5
        : 970 + (p.x - 0.5) * (100 + progress * 165) + Math.sin(t * 0.3 + p.phase) * 6;
      const y = window ? 270 + progress * 230 : 150 + progress * 78;
      g.fillStyle(0xf1e1b4, Math.sin(progress * Math.PI) * 0.19);
      g.fillCircle(x, y, 0.7 + (Math.sin(p.phase) + 1) * 0.25);
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
