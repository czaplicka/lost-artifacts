const LEFT = [329, 497, 414, 509, 415, 642, 329, 656];
const CENTER = [478, 478, 687, 479, 687, 626, 478, 638];
const MAP = [820, 435, 986, 435, 986, 475, 820, 475];
// Only exposed glass above the bookcase; no motion over furniture.
const WINDOW_PANES = [
  [1342, 132, 1565, 115, 1565, 211, 1342, 211],
  [1607, 113, 1874, 92, 1874, 237, 1740, 237, 1740, 211, 1607, 211]
];
const MESSAGES = [
  'CONNECTING TO MARKNET...',
  'CHECKING CASE FILES...',
  'EVIDENCE: INCONCLUSIVE.',
  'COFFEE: CRITICAL.',
  'RECONSTRUCTING CRIME...',
  'BLAMING PRINTER...',
  'PRINTER DENIES EVERYTHING.'
];
const SETTINGS = {
  map: { x: 932, y: 457, period: 2600 },
  dust: { count: 12, x: 1030, y: 445, width: 115, height: 180 }
};

export class OfficeScreenAnimations {
  constructor(scene) {
    this.scene = scene;
    this.disposed = false;
    this.elapsed = 0;
    this.messageIndex = 0;
    this.typed = 0;
    this.nextCharacterAt = 0;
    this.holdUntil = 0;
    this.lines = [];
    this.maskGraphics = [];
    this.masks = [];
    this.maskedItems = [];
    this.dustParticles = Array.from({ length: SETTINGS.dust.count }, (_, i) => ({
      x: (i * 0.61803398875) % 1,
      y: (i * 0.38196601125) % 1,
      speed: 0.018 + (i % 4) * 0.006,
      phase: i * 1.7
    }));
    this.create();
  }

  createMask(polygons) {
    const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    for (const points of polygons) {
      g.fillPoints(Array.from({ length: points.length / 2 }, (_, i) => ({
        x: points[i * 2], y: points[i * 2 + 1]
      })), true);
    }
    const mask = g.createGeometryMask();
    this.maskGraphics.push(g);
    this.masks.push(mask);
    return mask;
  }

  masked(item, mask) {
    item.setMask(mask);
    this.maskedItems.push(item);
    return item;
  }

  create() {
    const scene = this.scene;
    this.root = scene.add.container(0, 0).setDepth(2);
    const leftMask = this.createMask([LEFT]);
    const centerMask = this.createMask([CENTER]);
    const mapMask = this.createMask([MAP]);
    const windowMask = this.createMask(WINDOW_PANES);
    this.left = this.masked(scene.add.graphics(), leftMask);
    this.center = this.masked(scene.add.graphics(), centerMask);
    this.map = this.masked(scene.add.graphics(), mapMask);
    this.window = this.masked(scene.add.graphics(), windowMask);
    this.dust = scene.add.graphics();
    this.text = this.masked(scene.add.text(489, 489, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#90bcb0',
      lineSpacing: 8, padding: 0
    }), centerMask);
    this.cursor = this.masked(scene.add.rectangle(489, 489, 6, 10, 0xa6d8bb)
      .setOrigin(0, 0), centerMask);
    this.root.add([this.window, this.left, this.center, this.map, this.text, this.cursor, this.dust]);
    this.layout();
    this.drawLeft();
    this.drawCenter();
    this.drawMap();
    this.drawWindow();
    this.drawDust();
    scene.events.on('update', this.update, this);
    scene.scale.on('resize', this.layout, this);
    scene.events.once('shutdown', this.destroy, this);
    scene.events.once('destroy', this.destroy, this);
  }

  layout() {
    const bg = this.scene.rooms?.office?.bg;
    if (this.disposed || !bg?.active) return;
    const sx = bg.displayWidth / 1920;
    const sy = bg.displayHeight / 1080;
    this.root.setPosition(bg.x, bg.y).setScale(sx, sy);
    for (const g of this.maskGraphics) g.setPosition(bg.x, bg.y).setScale(sx, sy);
  }

  update(_time, delta) {
    if (this.disposed) return;
    const visible = this.scene.currentView === 'office';
    this.root.setVisible(visible);
    if (!visible) return;
    this.elapsed += Math.min(delta, 100);
    this.drawLeft();
    this.drawCenter();
    this.updateConsole();
    this.drawMap();
    this.drawWindow();
    this.drawDust();
  }

  drawLeft() {
    const g = this.left;
    const t = this.elapsed / 1000;
    g.clear();
    g.fillStyle(0x071c18, 0.55);
    g.fillRect(320, 490, 110, 180);
    for (let i = 0; i < 5; i++) {
      g.lineStyle(1, 0x54947c, 0.10);
      g.lineBetween(332, 522 + i * 27, 414, 522 + i * 27);
    }
    const trace = [];
    for (let i = 0; i < 30; i++) {
      const phase = i * 0.37 + t * 0.9;
      trace.push({ x: 339 + i * 2.2,
        y: 576 + Math.sin(phase) * 14 + Math.sin(phase * 2.3) * 5 });
    }
    g.lineStyle(5, 0x5cb891, 0.10);
    g.strokePoints(trace, false);
    g.lineStyle(1.5, 0x8bd5a9, 0.80);
    g.strokePoints(trace, false);
    g.fillStyle(0x9deac1, 0.07);
    g.fillRect(325, 500 + ((t * 13) % 155), 100, 3);
    const head = trace[trace.length - 1];
    g.fillStyle(0xc1f3ce, 0.8);
    g.fillCircle(head.x, head.y, 1.8);
  }

  drawCenter() {
    const g = this.center;
    g.clear();
    g.fillStyle(0x09242e, 0.94);
    g.fillRect(475, 475, 220, 170);
    g.fillStyle(0x75c7ba, 0.025);
    for (let y = 480; y < 640; y += 4) g.fillRect(475, y, 220, 1);
    g.fillStyle(0xb5dfcd, 0.045);
    g.fillRect(475, 478 + ((this.elapsed / 1000 * 9) % 160), 220, 2);
  }

  updateConsole() {
    const message = MESSAGES[this.messageIndex];
    if (this.holdUntil) {
      if (this.elapsed >= this.holdUntil) {
        this.lines.push('> ' + message);
        this.lines = this.lines.slice(-4);
        this.messageIndex = (this.messageIndex + 1) % MESSAGES.length;
        this.typed = 0;
        this.holdUntil = 0;
        this.nextCharacterAt = this.elapsed + 350;
      }
    } else if (this.elapsed >= this.nextCharacterAt) {
      this.typed = Math.min(this.typed + 1, message.length);
      this.nextCharacterAt = this.elapsed + 85;
      if (this.typed === message.length) this.holdUntil = this.elapsed + 2200;
    }
    const current = '> ' + MESSAGES[this.messageIndex].slice(0, this.typed);
    this.text.setText([...this.lines, current].join('\n'));
    this.cursor.setPosition(489 + current.length * 6.02, 489 + this.lines.length * 18);
    this.cursor.setVisible(Math.floor(this.elapsed / 550) % 2 === 0);
  }

  drawMap() {
    const g = this.map;
    const { x, y, period } = SETTINGS.map;
    const phase = (this.elapsed % period) / period;
    const pulse = (Math.sin(phase * Math.PI * 2) + 1) / 2;
    g.clear();
    g.fillStyle(0xee4a45, 0.06 + pulse * 0.08);
    g.fillCircle(x, y, 9 + pulse * 3);
    g.lineStyle(1, 0xff6556, (1 - phase) * 0.55);
    g.strokeCircle(x, y, 4 + phase * 12);
    g.fillStyle(0xef4a43, 0.7 + pulse * 0.3);
    g.fillCircle(x, y, 3);
    g.fillStyle(0xffb2a1, 0.8);
    g.fillCircle(x - 0.6, y - 0.6, 0.8);
  }

  drawWindow() {
    const g = this.window;
    const t = this.elapsed / 1000;
    g.clear();
    // Translucent clouds: existing city skyline remains visible underneath.
    for (let i = 0; i < 3; i++) {
      const x = 1190 + ((t * (4 + i) + i * 265) % 1050);
      const y = 152 + i * 24;
      g.fillStyle(0xcad6dc, 0.08);
      g.fillEllipse(x, y, 165, 23);
      g.fillEllipse(x + 42, y - 8, 115, 27);
      g.fillEllipse(x - 35, y - 4, 90, 22);
    }
    // One small distant bird, about once every 32 seconds of office time.
    const flight = t % 32;
    if (flight >= 9 && flight <= 17) {
      const p = (flight - 9) / 8;
      const x = 1280 + p * 660;
      const y = 174 - Math.sin(p * Math.PI) * 20;
      const wing = 2 + Math.sin(t * 9) * 2;
      g.lineStyle(1.3, 0x344955, 0.34);
      g.beginPath();
      g.moveTo(x - 5, y - wing);
      g.lineTo(x, y);
      g.lineTo(x + 5, y - wing);
      g.strokePath();
    }
  }

  drawDust() {
    const g = this.dust;
    const t = this.elapsed / 1000;
    const area = SETTINGS.dust;
    // Match the glow to the actual frame of the lamp if it is present.
    const frame = Number(this.scene.deskLamp?.frame?.name ?? 0);
    const light = (frame === 2 || frame === 4) ? 0.12 : frame === 1 ? 0.45 : 1;
    g.clear();
    for (const p of this.dustParticles) {
      const progress = (p.y + t * p.speed) % 1;
      const x = area.x + p.x * area.width + Math.sin(t * 0.35 + p.phase) * 7;
      const y = area.y + (1 - progress) * area.height;
      const fade = Math.sin(progress * Math.PI);
      g.fillStyle(0xe5d7ac, fade * 0.19 * light);
      g.fillCircle(x, y, 0.8 + (Math.sin(p.phase) + 1) * 0.25);
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
    for (const item of this.maskedItems) item?.clearMask();
    this.root?.destroy(true);
    for (const mask of this.masks) mask.destroy();
    for (const g of this.maskGraphics) g.destroy();
    this.masks = [];
    this.maskGraphics = [];
    this.maskedItems = [];
  }
}
