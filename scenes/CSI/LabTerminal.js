import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { audioManager } from '../../managers/AudioManager.js';

export const TERM = {
  green: '#46ff7a', dim: '#2c8a4b', amber: '#ffc857',
  red: '#ff5252', dark: '#0a0f0a'
};
const SCANLINES_KEY = 'lab-scanlines-v2';
const SCANLINE_COLOR = 'rgba(0, 0, 0, 0.25)';
const MAX_VOICES = 3;
const MIN_BLIP_MS = 45;
const TYPE_BLIP_MS = 85;
const clamp01 = value => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const text = key => __dialogueText('scenes/CSI/LabTerminal.js', key);

export class LabTerminal {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.destroyed = false;
    const W = scene.scale.width, H = scene.scale.height;
    this.w = Math.max(1, Math.min(finite(opts.width, Math.min(920, W - 40)), W));
    this.h = Math.max(1, Math.min(finite(opts.height, Math.min(600, H - 40)), H));
    this.x = Math.round((W - this.w) / 2);
    this.y = Math.round((H - this.h) / 2);
    this.maxLines = Math.max(1, Math.floor(finite(opts.maxLines, 14)));
    this.charDelay = finite(opts.charDelay, 10);
    this.logLines = [];
    this.buttonRow = null;
    this._queue = Promise.resolve(true);
    this._btnX = 0;
    this._objects = new Set();
    this._tasks = new Set();
    this._voices = new Set();
    this._audioBus = null;
    this._audioContext = null;
    this._lastBlipAt = -Infinity;
    this._lastTypeBlipAt = -Infinity;
    this._audioSuspended = false;
    this._textMask = null;
    this._maskGraphics = null;
    this._boundDestroy = () => this.destroy();
    this._boundAudioUpdate = () => this._syncAudio();
    this._boundSleep = () => {
      this._audioSuspended = true;
      this._stopVoices();
      this._syncAudio();
    };
    this._boundWake = () => { this._audioSuspended = false; };
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this._boundDestroy);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this._boundDestroy);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this._boundAudioUpdate);
    scene.events.on(Phaser.Scenes.Events.SLEEP, this._boundSleep);
    scene.events.on(Phaser.Scenes.Events.PAUSE, this._boundSleep);
    scene.events.on(Phaser.Scenes.Events.WAKE, this._boundWake);
    scene.events.on(Phaser.Scenes.Events.RESUME, this._boundWake);
    try {
      this._buildChrome(opts.title ?? text('t_f353d0b236dd6abb9525'));
      this._buildTextViewport();
      this._buildScanlines();
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  _track(object) { this._objects.add(object); return object; }

  _buildChrome(title) {
    const s = this.scene, g = this._track(s.add.graphics());
    g.fillStyle(0x000000, .8); g.fillRect(0, 0, s.scale.width, s.scale.height);
    g.fillStyle(0x050805, 1); g.fillRect(this.x, this.y, this.w, this.h);
    g.lineStyle(2, 0x1f3b26, 1); g.strokeRect(this.x, this.y, this.w, this.h);
    g.fillStyle(0x1f3b26, 1); g.fillRect(this.x, this.y, this.w, 34);
    this._track(s.add.text(this.x + 12, this.y + 9, title, {
      fontFamily: 'PressStart2P', fontSize: '12px', color: TERM.green,
      wordWrap: { width: Math.max(1, this.w - 24) }
    }));
    this.buttonRow = this._track(s.add.container(this.x + 16, this.y + this.h - 52));
  }

  _buildTextViewport() {
    this._textLeft = this.x + 16;
    this._textTop = this.y + 46;
    this._textWidth = Math.max(1, this.w - 32);
    this._textBottom = Math.max(this._textTop, this.buttonRow.y - 12);
    this._textHeight = Math.max(0, this._textBottom - this._textTop);
    // An off-display-list Graphics object is used only as a geometry mask.
    this._maskGraphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
    this._maskGraphics.fillStyle(0xffffff, 1);
    this._maskGraphics.fillRect(this._textLeft, this._textTop, this._textWidth, this._textHeight);
    this._textMask = this._maskGraphics.createGeometryMask();
  }

  _buildScanlines() {
    const s = this.scene;
    if (!s.textures.exists(SCANLINES_KEY)) {
      const texture = s.textures.createCanvas(SCANLINES_KEY, 2, 4);
      if (!texture) return;
      const context = texture.getContext();
      context.clearRect(0, 0, 2, 4);
      context.fillStyle = SCANLINE_COLOR;
      context.fillRect(0, 3, 2, 1);
      texture.refresh();
    }
    this._track(s.add.tileSprite(this.x + this.w / 2, this.y + this.h / 2,
      this.w, this.h, SCANLINES_KEY).setAlpha(.55));
  }

  _effectiveSfxVolume() {
    if (this.destroyed || this._audioSuspended || audioManager.getMuted() || this.scene?.sound?.mute) return 0;
    const sfx = clamp01(audioManager.getSfxVolume());
    const global = clamp01(finite(this.scene?.sound?.volume, 1));
    return sfx * global;
  }

  _syncAudio() {
    const volume = this._effectiveSfxVolume();
    if (this._audioBus && this._audioContext?.state === 'running') {
      try { this._audioBus.gain.setValueAtTime(volume, this._audioContext.currentTime); } catch {}
    }
    if (volume <= 0 && this._voices.size) this._stopVoices();
    return volume;
  }

  _ensureAudioBus(context) {
    if (this._audioContext === context && this._audioBus) return this._audioBus;
    this._stopVoices();
    try { this._audioBus?.disconnect(); } catch {}
    this._audioBus = null;
    this._audioContext = context;
    const bus = context.createGain();
    try {
      bus.gain.setValueAtTime(this._effectiveSfxVolume(), context.currentTime);
      bus.connect(context.destination);
      this._audioBus = bus;
      return bus;
    } catch (error) {
      try { bus.disconnect(); } catch {}
      throw error;
    }
  }

  blip(freq = 520, dur = .05, type = 'square', vol = .04) {
    if (this.destroyed || this._syncAudio() <= 0) return false;
    const context = this.scene?.sound?.context;
    if (!context || context.state !== 'running' || typeof context.createOscillator !== 'function') return false;
    if (!Number.isFinite(freq) || freq <= 0 || !Number.isFinite(dur) || dur <= 0 ||
        !Number.isFinite(vol) || vol <= 0 || !['sine', 'square', 'sawtooth', 'triangle'].includes(type)) return false;
    const now = context.currentTime;
    if (now * 1000 - this._lastBlipAt < MIN_BLIP_MS || this._voices.size >= MAX_VOICES) return false;
    let voice = null;
    try {
      const bus = this._ensureAudioBus(context);
      voice = { oscillator: null, gain: null, released: false };
      voice.oscillator = context.createOscillator();
      voice.gain = context.createGain();
      this._voices.add(voice);
      const { oscillator, gain } = voice;
      const duration = Math.min(.25, dur);
      oscillator.type = type;
      oscillator.frequency.value = Math.min(12000, Math.max(40, freq));
      gain.gain.setValueAtTime(clamp01(vol), now);
      oscillator.connect(gain); gain.connect(bus);
      oscillator.onended = () => this._releaseVoice(voice);
      oscillator.start(now);
      gain.gain.exponentialRampToValueAtTime(.00001, now + duration);
      oscillator.stop(now + duration + .02);
      this._lastBlipAt = now * 1000;
      return true;
    } catch {
      if (voice) this._releaseVoice(voice, true);
      return false;
    }
  }

  _typingBlip() {
    const now = this.scene?.sound?.context?.currentTime;
    if (!Number.isFinite(now) || now * 1000 - this._lastTypeBlipAt < TYPE_BLIP_MS) return;
    if (this.blip(650 + Math.random() * 250, .012, 'square', .01)) this._lastTypeBlipAt = now * 1000;
  }

  _releaseVoice(voice, stop = false) {
    if (!voice || voice.released) return;
    voice.released = true;
    this._voices.delete(voice);
    if (voice.oscillator) {
      voice.oscillator.onended = null;
      if (stop) { try { voice.oscillator.stop(); } catch {} }
      try { voice.oscillator.disconnect(); } catch {}
    }
    try { voice.gain?.disconnect(); } catch {}
  }
  _stopVoices() { for (const voice of [...this._voices]) this._releaseVoice(voice, true); }

  _enqueue(action) {
    if (this.destroyed) return Promise.resolve(false);
    this._queue = this._queue.then(() => this.destroyed ? false : action()).catch(error => {
      if (!this.destroyed) console.error('[LabTerminal] Operation failed:', error);
      return false;
    });
    return this._queue;
  }

  _runTimedSteps(steps, delay, onStep) {
    if (this.destroyed) return Promise.resolve(false);
    if (!Number.isFinite(steps) || steps <= 0) return Promise.resolve(true);
    steps = Math.floor(steps);
    if (steps === 0) return Promise.resolve(true);
    return new Promise((resolve, reject) => {
      const task = { timer: null, settled: false, finish: null };
      task.finish = (completed, error = null) => {
        if (task.settled) return;
        task.settled = true;
        task.timer?.remove(false); task.timer = null;
        this._tasks.delete(task);
        if (error) reject(error); else resolve(completed);
      };
      this._tasks.add(task);
      let step = 0;
      try {
        task.timer = this.scene.time.addEvent({ delay: Math.max(1, finite(delay, 1)), repeat: steps - 1,
          callback: () => {
            if (this.destroyed) { task.finish(false); return; }
            try {
              step++; onStep(step);
              if (step >= steps) task.finish(true);
            } catch (error) { task.finish(false, error); }
          }
        });
      } catch (error) { task.finish(false, error); }
    });
  }

  _addLine(style) {
    if (this.destroyed) return null;
    const line = this._track(this.scene.add.text(this._textLeft, 0, '', {
      ...style, wordWrap: { width: this._textWidth, useAdvancedWrap: true }
    }).setMask(this._textMask));
    this.logLines.push(line);
    while (this.logLines.length > this.maxLines) this._removeOldestLine();
    this._layout();
    return line;
  }

  _removeOldestLine() {
    const oldest = this.logLines.shift();
    if (!oldest) return;
    this._objects.delete(oldest);
    oldest.clearMask(false); oldest.destroy();
  }

  print(value, opts = {}) {
    const content = String(value ?? ''), options = { ...opts };
    return this._enqueue(() => this._typeLine(content, options));
  }

  _typeLine(content, opts) {
    if (this.destroyed) return Promise.resolve(false);
    const line = this._addLine({
      fontFamily: opts.fontFamily ?? 'SpecialElite', fontSize: opts.fontSize ?? '18px',
      color: opts.color ?? TERM.green
    });
    if (!line) return Promise.resolve(false);
    if (!content.length) return Promise.resolve(true);
    const delay = finite(opts.charDelay, this.charDelay);
    if (delay <= 0) { line.setText(content); this._layout(); return Promise.resolve(true); }
    return this._runTimedSteps(content.length, delay, step => {
      if (!line.scene) return;
      line.setText(content.slice(0, step));
      if (step % 3 === 0) this._typingBlip();
      this._layout();
    });
  }

  progress(label, ms = 1400) {
    const content = String(label ?? '');
    return this._enqueue(() => {
      const total = 24;
      const line = this._addLine({ fontFamily: 'Courier New', fontSize: '18px', color: TERM.dim });
      if (!line) return false;
      return this._runTimedSteps(total, Math.max(0, finite(ms, 1400)) / total, step => {
        if (!line.scene) return;
        const filled = '#'.repeat(step), empty = '.'.repeat(total - step);
        const percent = Math.round(step / total * 100);
        line.setText(`${content}${text('t_c4ebc7684be8c9fd10cb')}${filled}${empty}${text('t_1ae2bcbc6c0f178c5b74')}${percent}${text('t_bbf3f11cb5b43e700273')}`);
        this._layout();
        if (step === total) this.blip(990, .08);
      });
    });
  }

  _layout() {
    if (this.destroyed) return;
    const gap = 4;
    const totalHeight = () => this.logLines.reduce((height, line, i) => height + line.height + (i ? gap : 0), 0);
    // Limit by rendered height, not only the number of print() calls.
    let height = totalHeight();
    while (this.logLines.length > 1 && height > this._textHeight) {
      this._removeOldestLine(); height = totalHeight();
    }
    // A single oversized message stays masked; its newest text remains visible.
    let y = this._textTop - Math.max(0, height - this._textHeight);
    for (const line of this.logLines) {
      if (!line?.scene) continue;
      line.setY(y); y += line.height + gap;
    }
  }

  clearButtons() {
    this._btnX = 0;
    if (!this.destroyed && this.buttonRow?.scene) this.buttonRow.removeAll(true);
  }

  button(label, color, onClick) {
    if (this.destroyed || !this.buttonRow?.scene) return null;
    const button = this.scene.add.text(this._btnX, 0,
      `${text('t_36a9e7f1c95b82ffb997')}${label}${text('t_36a9e7f1c95b82ffb997')}`, {
        fontFamily: 'PressStart2P', fontSize: '12px', color: TERM.dark,
        backgroundColor: color, padding: { x: 8, y: 8 }
      }).setInteractive({ useHandCursor: true });
    button.on('pointerover', () => { if (!this.destroyed) button.setBackgroundColor(TERM.amber); });
    button.on('pointerout', () => { if (!this.destroyed) button.setBackgroundColor(color); });
    button.on('pointerdown', () => {
      if (this.destroyed) return;
      this.blip(880, .06);
      if (typeof onClick === 'function') onClick();
    });
    this.buttonRow.add(button); this._btnX += button.width + 14;
    return button;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    const events = this.scene?.events;
    events?.off(Phaser.Scenes.Events.SHUTDOWN, this._boundDestroy);
    events?.off(Phaser.Scenes.Events.DESTROY, this._boundDestroy);
    events?.off(Phaser.Scenes.Events.UPDATE, this._boundAudioUpdate);
    events?.off(Phaser.Scenes.Events.SLEEP, this._boundSleep);
    events?.off(Phaser.Scenes.Events.PAUSE, this._boundSleep);
    events?.off(Phaser.Scenes.Events.WAKE, this._boundWake);
    events?.off(Phaser.Scenes.Events.RESUME, this._boundWake);
    for (const task of [...this._tasks]) task.finish(false);
    this._tasks.clear(); this._stopVoices();
    try { this._audioBus?.disconnect(); } catch {}
    this._audioBus = null; this._audioContext = null;
    for (const object of this._objects) {
      if (object?.scene) { object.clearMask?.(false); object.destroy(); }
    }
    this._objects.clear();
    this._textMask?.destroy(); this._textMask = null;
    this._maskGraphics?.destroy(); this._maskGraphics = null;
    this.logLines = []; this.buttonRow = null; this._btnX = 0;
    this._queue = Promise.resolve(false); this.scene = null;
  }
}
