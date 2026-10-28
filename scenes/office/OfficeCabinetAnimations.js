const CONFIG = {
  room: 'cabinet',
  screen: [615, 486, 731, 483, 731, 590, 615, 600],
  window: [274, 10, 550, 72, 550, 197, 274, 157],
  glints: [{ x: 953, y: 250 }, { x: 1393, y: 553 }, { x: 1535, y: 593 }]
};

export class OfficeCabinetAnimations {
  constructor(scene) {
    this.scene = scene;
    this.disposed = false;
    this.elapsed = 0;
    this.masks = [];
    this.maskGraphics = [];
    this.maskedItems = [];
    this.particles = Array.from({ length: 16 }, (_, i) => ({
      x: (i * 0.61803398875) % 1, y: (i * 0.38196601125) % 1,
      phase: i * 1.7, speed: 0.012 + (i % 4) * 0.004
    }));
    this.create();
  }

  createMask(points) {
    const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillPoints(Array.from({ length: points.length / 2 }, (_, i) => ({
      x: points[i * 2], y: points[i * 2 + 1]
    })), true);
    const mask = graphics.createGeometryMask();
    this.maskGraphics.push(graphics);
    this.masks.push(mask);
    return mask;
  }

  create() {
    const bg = this.scene.rooms?.[CONFIG.room]?.bg;
    if (!bg?.active) {
      console.warn('[CabinetAnimations] Cabinet background is unavailable.');
      this.disposed = true;
      return;
    }
    this.root = this.scene.add.container(0, 0).setDepth(bg.depth + 2);
    this.screen = this.scene.add.graphics().setMask(this.createMask(CONFIG.screen));
    this.window = this.scene.add.graphics().setMask(this.createMask(CONFIG.window));
    this.dust = this.scene.add.graphics();
    this.glints = this.scene.add.graphics();
    this.maskedItems.push(this.screen, this.window);
    this.root.add([this.window, this.screen, this.dust, this.glints]);
    this.root.setVisible(false);
    this.layout();
    this.scene.events.on('update', this.update, this);
    this.scene.scale.on('resize', this.layout, this);
    this.scene.events.once('shutdown', this.destroy, this);
    this.scene.events.once('destroy', this.destroy, this);
  }

  layout() {
    const bg = this.scene.rooms?.[CONFIG.room]?.bg;
    if (this.disposed || !bg?.active) return;
    const sx = bg.displayWidth / 1920;
    const sy = bg.displayHeight / 1080;
    this.root.setPosition(bg.x, bg.y).setScale(sx, sy);
    for (const graphics of this.maskGraphics) {
      graphics.setPosition(bg.x, bg.y).setScale(sx, sy);
    }
  }

  update(_time, delta) {
    if (this.disposed) return;
    const visible = this.scene.currentView === CONFIG.room;
    this.root.setVisible(visible);
    if (!visible) return;
    this.elapsed += Math.min(delta, 100);
    this.drawScreen();
    this.drawWindow();
    this.drawDust();
    this.drawGlints();
  }

  drawScreen() {
    const g = this.screen;
    const t = this.elapsed / 1000;
    g.clear();
    // Transparent overlays preserve the portraits and text painted in the background.
    g.fillStyle(0x81c3a2, 0.018 + (Math.sin(t * 1.1) + 1) * 0.009);
    g.fillRect(610, 480, 128, 126);
    for (let y = 485; y < 605; y += 4) {
      g.fillStyle(0x061d19, 0.045);
      g.fillRect(610, y, 128, 1);
    }
    const scanY = 477 + ((t * 11) % 133);
    g.fillStyle(0xa5d4bc, 0.075);
    g.fillRect(610, scanY, 128, 3);
  }

  drawWindow() {
    const g = this.window;
    const t = this.elapsed / 1000;
    g.clear();
    // Faint cloud shadow, not an opaque replacement of the window.
    const x = 170 + ((t * 5) % 590);
    for (let i = 0; i < 5; i++) {
      g.fillStyle(0x344b5a, 0.012);
      g.fillEllipse(x + i * 9, 99, 130 + i * 15, 185 + i * 10);
    }
  }

  drawDust() {
    const g = this.dust;
    const t = this.elapsed / 1000;
    g.clear();
    for (const p of this.particles) {
      const progress = (p.y + t * p.speed) % 1;
      const y = 370 + progress * 245;
      const width = 70 + progress * 100;
      const x = 752 + (p.x - 0.5) * width + Math.sin(t * 0.3 + p.phase) * 5;
      g.fillStyle(0xead9b7, Math.sin(progress * Math.PI) * 0.21);
      g.fillCircle(x, y, 0.7 + (Math.sin(p.phase) + 1) * 0.2);
    }
  }

  drawGlints() {
    const g = this.glints;
    const cycle = this.elapsed % 12000;
    g.clear();
    // One restrained reflected highlight every twelve seconds; not an interaction prompt.
    if (cycle < 5000 || cycle > 6100) return;
    const index = Math.floor(this.elapsed / 12000) % CONFIG.glints.length;
    const point = CONFIG.glints[index];
    const envelope = Math.sin(((cycle - 5000) / 1100) * Math.PI);
    const length = 2 + envelope * 3;
    g.fillStyle(0xffe9ae, envelope * 0.07);
    g.fillCircle(point.x, point.y, length + 2);
    g.lineStyle(1, 0xffedc5, envelope * 0.42);
    g.lineBetween(point.x - length, point.y, point.x + length, point.y);
    g.lineBetween(point.x, point.y - length, point.x, point.y + length);
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.events.off('update', this.update, this);
    this.scene.scale.off('resize', this.layout, this);
    this.scene.events.off('shutdown', this.destroy, this);
    this.scene.events.off('destroy', this.destroy, this);
    for (const item of this.maskedItems) item.clearMask();
    this.root?.destroy(true);
    for (const mask of this.masks) mask.destroy();
    for (const graphics of this.maskGraphics) graphics.destroy();
    this.masks = [];
    this.maskGraphics = [];
    this.maskedItems = [];
    this.particles = [];
  }
}
