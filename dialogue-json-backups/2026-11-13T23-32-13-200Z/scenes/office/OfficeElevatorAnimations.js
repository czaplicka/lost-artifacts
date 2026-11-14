const STATES = {
  elevator_broken: 'broken',
  elevator_close: 'closed',
  elevator_open: 'open'
};
const PLACEMENT = {
  broken: { displayX: 1358, displayY: 211, buttonX: 1397, buttonY: 532 },
  closed: { displayX: 1358, displayY: 211, buttonX: 1397, buttonY: 532 },
  open: { displayX: 1370, displayY: 210, buttonX: 1409, buttonY: 532 }
};

export class OfficeElevatorAnimations {
  constructor(scene) {
    this.scene = scene;
    this.disposed = false;
    this.elapsed = 0;
    this.state = null;
    this.flickerStart = null;
    this.nextFlicker = 6500;
    this.particles = Array.from({ length: 18 }, (_, i) => ({
      x: (i * 0.61803398875) % 1,
      y: (i * 0.38196601125) % 1,
      speed: 0.012 + (i % 5) * 0.003,
      phase: i * 1.9
    }));
    this.create();
  }

  create() {
    const scene = this.scene;
    const bg = scene.rooms?.elevator?.bg;
    if (!bg?.active) {
      console.warn('[ElevatorAnimations] Elevator background is unavailable.');
      this.disposed = true;
      return;
    }
    // A perfectly aligned tinted copy gives a short, subtle room-light dip.
    this.dimmer = scene.add.image(bg.x, bg.y, bg.texture.key)
      .setOrigin(0, 0).setDepth(bg.depth + 0.25)
      .setTint(0x344451).setAlpha(0).setVisible(false);
    this.root = scene.add.container(0, 0).setDepth(bg.depth + 2);
    this.display = scene.add.graphics();
    this.glow = scene.add.graphics();
    this.dust = scene.add.graphics();
    this.label = scene.add.text(0, 0, '', {
      fontFamily: 'monospace', fontSize: '25px', color: '#94cbb3',
      align: 'center', padding: 0
    }).setOrigin(0.5);
    this.root.add([this.display, this.glow, this.dust, this.label]);
    this.root.setVisible(false);
    this.layout();
    scene.events.on('update', this.update, this);
    scene.scale.on('resize', this.layout, this);
    scene.events.once('shutdown', this.destroy, this);
    scene.events.once('destroy', this.destroy, this);
  }

  layout() {
    const bg = this.scene.rooms?.elevator?.bg;
    if (this.disposed || !bg?.active) return;
    const sx = bg.displayWidth / 1920;
    const sy = bg.displayHeight / 1080;
    this.root.setPosition(bg.x, bg.y).setScale(sx, sy);
    this.dimmer.setPosition(bg.x, bg.y)
      .setDisplaySize(bg.displayWidth, bg.displayHeight);
  }

  update(_time, delta) {
    if (this.disposed) return;
    const bg = this.scene.rooms?.elevator?.bg;
    const state = STATES[bg?.texture?.key];
    const visible = Boolean(bg?.active && state && this.scene.currentView === 'elevator');
    this.root.setVisible(visible);
    this.dimmer.setVisible(visible);
    if (!visible) return;
    if (this.dimmer.texture.key !== bg.texture.key) {
      this.dimmer.setTexture(bg.texture.key);
      this.layout();
    }
    if (state !== this.state) {
      this.state = state;
      this.elapsed = 0;
      this.flickerStart = null;
      this.nextFlicker = 6500;
      this.dimmer.setAlpha(0);
    }
    this.elapsed += Math.min(delta, 100);
    this.drawDisplay();
    this.drawButton();
    this.updateLight();
    this.drawDust();
  }

  drawDisplay() {
    const g = this.display;
    const p = PLACEMENT[this.state];
    const x = p.displayX;
    const y = p.displayY;
    g.clear();
    g.fillStyle(0x142726, 0.97);
    g.fillRect(x, y, 109, 84);
    g.fillStyle(0x83b7a0, 0.035);
    for (let offset = 3; offset < 83; offset += 5) g.fillRect(x + 2, y + offset, 105, 1);
    this.label.setPosition(x + 54.5, y + 42);
    if (this.state === 'broken') {
      const cycle = this.elapsed % 16000;
      const showing = cycle >= 1800 && cycle < 4100;
      const joke = Math.floor(this.elapsed / 16000) % 4 === 3;
      this.label.setColor('#df8a76').setText(showing ? (joke ? 'NOPE' : 'ERR') : '');
      if (showing) {
        g.fillStyle(0xd07b62, 0.07);
        g.fillRect(x + 2, y + 2, 105, 80);
      }
    } else {
      this.label.setColor('#94cbb3').setText(this.state === 'open' ? 'OPEN' : 'READY');
      g.fillStyle(0x86ccb0, 0.05);
      g.fillRect(x + 2, y + 2, 105, 80);
    }
  }

  drawButton() {
    const g = this.glow;
    const p = PLACEMENT[this.state];
    const t = this.elapsed / 1000;
    g.clear();
    if (this.state === 'broken') {
      const pulse = (Math.sin(t * Math.PI / 1.8) + 1) / 2;
      g.fillStyle(0xeb5349, 0.025 + pulse * 0.075);
      g.fillCircle(p.buttonX, p.buttonY, 27);
      g.lineStyle(1.2, 0xee725e, 0.08 + pulse * 0.22);
      g.strokeCircle(p.buttonX, p.buttonY, 22);
    } else {
      g.fillStyle(0xffb18c, 0.045);
      g.fillCircle(p.buttonX, p.buttonY, 24);
    }
    if (this.state === 'open') {
      const pulse = (Math.sin(t * 1.3) + 1) / 2;
      g.fillStyle(0x70ef88, 0.06 + pulse * 0.08);
      g.fillRoundedRect(1204, 568, 17, 22, 3);
    }
  }

  updateLight() {
    if (this.state !== 'broken') {
      this.dimmer.setAlpha(0);
      return;
    }
    if (this.flickerStart === null && this.elapsed >= this.nextFlicker) {
      this.flickerStart = this.elapsed;
    }
    if (this.flickerStart === null) {
      this.dimmer.setAlpha(0);
      return;
    }
    const age = this.elapsed - this.flickerStart;
    let alpha = 0;
    if (age < 180) alpha = 0.14;
    else if (age >= 440 && age < 760) alpha = 0.20;
    else if (age >= 760 && age < 1080) alpha = 0.20 * (1 - (age - 760) / 320);
    this.dimmer.setAlpha(alpha);
    if (age >= 1080) {
      this.dimmer.setAlpha(0);
      this.flickerStart = null;
      this.nextFlicker = this.elapsed + Phaser.Math.Between(13000, 26000);
    }
  }

  drawDust() {
    const g = this.dust;
    const t = this.elapsed / 1000;
    const brightness = 1 - this.dimmer.alpha * 2;
    g.clear();
    for (const p of this.particles) {
      const progress = (p.y + t * p.speed) % 1;
      const x = 855 + p.x * 225 + Math.sin(t * 0.3 + p.phase) * 8;
      const y = 85 + progress * 220;
      const fade = Math.sin(progress * Math.PI);
      g.fillStyle(0xe6d4aa, fade * 0.18 * brightness);
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
    this.root?.destroy(true);
    this.dimmer?.destroy();
    this.particles = [];
  }
}
