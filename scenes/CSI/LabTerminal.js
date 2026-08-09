export const TERM = {
  green: '#46ff7a',
  dim: '#2c8a4b',
  amber: '#ffc857',
  red: '#ff5252',
  dark: '#0a0f0a'
};

export function award(scene, pts) {
  const s = scene.registry.get('score') ?? 0;
  scene.registry.set('score', s + pts);
}

export class LabTerminal {
  constructor(scene, opts = {}) {
    this.scene = scene;
    const W = scene.scale.width;
    const H = scene.scale.height;
    this.w = opts.width ?? Math.min(920, W - 40);
    this.h = opts.height ?? Math.min(600, H - 40);
    this.x = Math.round((W - this.w) / 2);
    this.y = Math.round((H - this.h) / 2);
    this.maxLines = opts.maxLines ?? 14;
    this.charDelay = opts.charDelay ?? 10;
    this.logLines = [];
    this._queue = Promise.resolve();
    this._btnX = 0;
    this._buildChrome(opts.title ?? 'MARK AGENCY // FORENSICS TERMINAL');
    this._buildScanlines();
  }

  _buildChrome(title) {
    const s = this.scene;
    const g = s.add.graphics();
    g.fillStyle(0x000000, 0.8);
    g.fillRect(0, 0, s.scale.width, s.scale.height);
    g.fillStyle(0x050805, 1);
    g.fillRect(this.x, this.y, this.w, this.h);
    g.lineStyle(2, 0x1f3b26, 1);
    g.strokeRect(this.x, this.y, this.w, this.h);
    g.fillStyle(0x1f3b26, 1);
    g.fillRect(this.x, this.y, this.w, 34);
    s.add.text(this.x + 12, this.y + 9, title, {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: TERM.green
    });
    this.buttonRow = s.add.container(this.x + 16, this.y + this.h - 52);
  }

  _buildScanlines() {
    const s = this.scene;
    if (!s.textures.exists('lab-scanlines')) {
      const tex = s.textures.createCanvas('lab-scanlines', 2, 4);
      const ctx = tex.getContext();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, 3, 2, 1);
      tex.refresh();
    }
    s.add.tileSprite(this.x + this.w / 2, this.y + this.h / 2, this.w, this.h, 'lab-scanlines')
      .setAlpha(0.55);
  }

  blip(freq = 520, dur = 0.05, type = 'square', vol = 0.04) {
    const ctx = this.scene.sound.context;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  print(text, opts = {}) {
    this._queue = this._queue.then(() => this._typeLine(text, opts));
    return this._queue;
  }

  _typeLine(text, opts) {
    return new Promise(resolve => {
      const t = this.scene.add.text(this.x + 16, 0, '', {
        fontFamily: opts.fontFamily ?? '"Special Elite"',
        fontSize: opts.fontSize ?? '18px',
        color: opts.color ?? TERM.green,
        wordWrap: { width: this.w - 32 }
      });
      this.logLines.push(t);
      if (this.logLines.length > this.maxLines) this.logLines.shift().destroy();
      this._layout();
      if (!text.length) { resolve(); return; }
      let i = 0;
      this.scene.time.addEvent({
        delay: opts.charDelay ?? this.charDelay,
        repeat: text.length - 1,
        callback: () => {
          t.text += text[i++];
          if (i % 3 === 0) this.blip(650 + Math.random() * 250, 0.012, 'square', 0.01);
          this._layout();
          if (i >= text.length) resolve();
        }
      });
    });
  }

  progress(label, ms = 1400) {
    this._queue = this._queue.then(() => new Promise(resolve => {
      const total = 24;
      let p = 0;
      const t = this.scene.add.text(this.x + 16, 0, '', {
        fontFamily: '"Courier New"', fontSize: '18px', color: TERM.dim
      });
      this.logLines.push(t);
      if (this.logLines.length > this.maxLines) this.logLines.shift().destroy();
      this.scene.time.addEvent({
        delay: ms / total,
        repeat: total - 1,
        callback: () => {
          p++;
          t.setText(`${label} [${'#'.repeat(p)}${'.'.repeat(total - p)}] ${Math.round((p / total) * 100)}%`);
          this._layout();
          if (p >= total) { this.blip(990, 0.08); resolve(); }
        }
      });
    }));
    return this._queue;
  }

  _layout() {
    let y = this.y + 46;
    for (const t of this.logLines) {
      t.setY(y);
      y += t.height + 4;
    }
  }

  clearButtons() {
    this.buttonRow.removeAll(true);
    this._btnX = 0;
  }

  button(label, color, onClick) {
    const t = this.scene.add.text(this._btnX, 0, ` ${label} `, {
      fontFamily: '"Press Start 2P"',
      fontSize: '12px',
      color: TERM.dark,
      backgroundColor: color,
      padding: { x: 8, y: 8 }
    }).setInteractive({ useHandCursor: true });
    t.on('pointerover', () => t.setBackgroundColor(TERM.amber));
    t.on('pointerout', () => t.setBackgroundColor(color));
    t.on('pointerdown', () => { this.blip(880, 0.06); onClick(); });
    this.buttonRow.add(t);
    this._btnX += t.width + 14;
    return t;
  }
}