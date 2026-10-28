import { audioManager } from '../../managers/AudioManager.js';

const SEGMENT_AUDIO = {
  filler: 'tv1',
  ad: 'ad_jingle',
  news: 'tv2'
};

export class TvBroadcastAudio {
  constructor(scene) {
    this.scene = scene;

    this.level = 1;
    this.noiseBuffer = null;
    this.humNodes = null;
    this.live = new Set();
    this.destroyed = false;

    this.segmentSound = null;
    this.segmentToken = null;
    this.warned = new Set();

    scene.events.on('update', this.syncSegment, this);
  }

  syncSegment() {
    const scene = this.scene;

    if (this.destroyed || !scene) return;

    if (
      scene.isClosing ||
      scene.isTransitioning ||
      !scene.hasStarted
    ) {
      this.stopSegment();
      this.segmentToken = null;
      return;
    }

    const segment = scene.currentSegment;
    const key = SEGMENT_AUDIO[segment?.type];

    const token = segment
      ? `${scene.currentSegmentIndex}:${segment.id || segment.type}`
      : null;

    if (token !== this.segmentToken) {
      this.stopSegment();
      this.segmentToken = token;

      if (key && scene.cache.audio.exists(key)) {
        try {
          const sound = scene.sound.add(key, {
            loop: false,
            volume: this.getVolume()
          });

          this.segmentSound = sound;
          sound.play();
        } catch (error) {
          console.warn(
            '[TV] Could not play audio:',
            key,
            error
          );
        }
      } else if (key && !this.warned.has(key)) {
        this.warned.add(key);

        console.warn(
          '[TV] Audio missing from cache:',
          key
        );
      }
    }

    const sound = this.segmentSound;

    if (sound && !sound.pendingRemove) {
      sound.setVolume(this.getVolume());

      if (scene.isBroadcastPaused && sound.isPlaying) {
        sound.pause();
      } else if (
        !scene.isBroadcastPaused &&
        sound.isPaused
      ) {
        sound.resume();
      }
    }

    const ctx = this.getContext();

    if (ctx && this.humNodes) {
      this.humNodes.gain.gain.setTargetAtTime(
        this.getVolume(0.05),
        ctx.currentTime,
        0.05
      );
    }
  }

  stopSegment() {
    const sound = this.segmentSound;
    this.segmentSound = null;

    if (sound && !sound.pendingRemove) {
      sound.stop();
      sound.destroy();
    }
  }

  getContext() {
    const ctx = this.scene?.sound?.context;

    return ctx && typeof ctx.createGain === 'function'
      ? ctx
      : null;
  }

  ensure() {
    if (this.destroyed) return null;

    const ctx = this.getContext();

    if (!ctx) return null;

    if (ctx.state === 'suspended') {
      ctx.resume?.().catch(() => {});
    }

    return ctx;
  }

  getOutput(ctx) {
    return this.scene?.sound?.destination || ctx.destination;
  }

  getVolume(scale = 1) {
    try {
      if (audioManager.getMuted?.()) return 0;

      let volume = Number(
        audioManager.getSfxVolume?.()
      );

      if (!Number.isFinite(volume)) {
        volume = 0.5;
      }

      return Math.max(
        0,
        Math.min(1, volume * this.level * scale)
      );
    } catch {
      return 0.3 * this.level * scale;
    }
  }

  setLevel(level) {
    this.level = Math.max(
      0,
      Math.min(1, Number(level) || 0)
    );

    this.segmentSound?.setVolume(
      this.getVolume()
    );

    const ctx = this.getContext();

    if (ctx && this.humNodes) {
      this.humNodes.gain.gain.setTargetAtTime(
        this.getVolume(0.05),
        ctx.currentTime,
        0.05
      );
    }
  }

  getNoiseBuffer(ctx) {
    if (this.noiseBuffer) {
      return this.noiseBuffer;
    }

    const buffer = ctx.createBuffer(
      1,
      ctx.sampleRate,
      ctx.sampleRate
    );

    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.noiseBuffer = buffer;

    return buffer;
  }

  track(node, connections = []) {
    this.live.add(node);

    node.onended = () => {
      this.live.delete(node);

      for (const item of [node, ...connections]) {
        try {
          item.disconnect();
        } catch {}
      }
    };
  }

  staticBurst(duration = 0.15, strength = 0.5) {
    try {
      const ctx = this.ensure();
      const volume = this.getVolume(strength);

      if (!ctx || volume <= 0) return;

      const t = ctx.currentTime;

      const source = ctx.createBufferSource();
      source.buffer = this.getNoiseBuffer(ctx);
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2400;
      filter.Q.value = 0.4;

      const gain = ctx.createGain();

      gain.gain.setValueAtTime(0.0001, t);

      gain.gain.exponentialRampToValueAtTime(
        volume * 0.6,
        t + 0.012
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        t + duration
      );

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.getOutput(ctx));

      this.track(source, [filter, gain]);

      source.start(t);
      source.stop(t + duration + 0.05);
    } catch {}
  }

  tone(
    freq,
    duration = 0.1,
    type = 'sine',
    strength = 0.4
  ) {
    try {
      const ctx = this.ensure();
      const volume = this.getVolume(strength);

      if (!ctx || volume <= 0) return;

      const t = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);

      const gain = ctx.createGain();

      gain.gain.setValueAtTime(0.0001, t);

      gain.gain.exponentialRampToValueAtTime(
        volume * 0.5,
        t + 0.01
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        t + duration
      );

      osc.connect(gain);
      gain.connect(this.getOutput(ctx));

      this.track(osc, [gain]);

      osc.start(t);
      osc.stop(t + duration + 0.05);
    } catch {}
  }

  sweep(
    from,
    to,
    duration = 0.25,
    type = 'sawtooth',
    strength = 0.3
  ) {
    try {
      const ctx = this.ensure();
      const volume = this.getVolume(strength);

      if (!ctx || volume <= 0) return;

      const t = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = type;

      osc.frequency.setValueAtTime(
        Math.max(20, from),
        t
      );

      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, to),
        t + duration
      );

      const gain = ctx.createGain();

      gain.gain.setValueAtTime(0.0001, t);

      gain.gain.exponentialRampToValueAtTime(
        volume * 0.4,
        t + 0.02
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        t + duration
      );

      osc.connect(gain);
      gain.connect(this.getOutput(ctx));

      this.track(osc, [gain]);

      osc.start(t);
      osc.stop(t + duration + 0.05);
    } catch {}
  }

  beep(freq = 1000, duration = 0.25) {
    this.tone(freq, duration, 'sine', 0.35);
  }

  click() {
    this.tone(900, 0.03, 'square', 0.25);
  }

  powerOn() {
    this.sweep(
      70,
      2600,
      0.28,
      'sawtooth',
      0.35
    );

    this.staticBurst(0.12, 0.35);
  }

  powerOff() {
    this.stopSegment();

    this.sweep(
      2000,
      50,
      0.24,
      'sawtooth',
      0.35
    );

    this.staticBurst(0.08, 0.3);
  }

  startHum() {
    try {
      if (this.humNodes) return;

      const ctx = this.ensure();

      if (!ctx) return;

      const gain = ctx.createGain();

      gain.gain.setValueAtTime(
        0.0001,
        ctx.currentTime
      );

      gain.gain.linearRampToValueAtTime(
        this.getVolume(0.05),
        ctx.currentTime + 0.4
      );

      const low = ctx.createOscillator();
      low.type = 'sine';
      low.frequency.value = 60;

      const high = ctx.createOscillator();
      high.type = 'sine';
      high.frequency.value = 120;

      low.connect(gain);
      high.connect(gain);
      gain.connect(this.getOutput(ctx));

      low.start();
      high.start();

      this.humNodes = {
        low,
        high,
        gain
      };
    } catch {}
  }

  stopHum() {
    if (!this.humNodes) return;

    const { low, high, gain } = this.humNodes;
    this.humNodes = null;

    try {
      const t = this.getContext()?.currentTime || 0;

      gain.gain.cancelScheduledValues(t);

      gain.gain.setTargetAtTime(
        0.0001,
        t,
        0.05
      );

      low.onended = () => {
        for (const node of [low, high, gain]) {
          try {
            node.disconnect();
          } catch {}
        }
      };

      low.stop(t + 0.3);
      high.stop(t + 0.3);
    } catch {}
  }

  destroy() {
    if (this.destroyed) return;

    this.destroyed = true;

    this.scene?.events.off(
      'update',
      this.syncSegment,
      this
    );

    this.stopSegment();
    this.stopHum();

    for (const node of this.live) {
      try {
        node.stop();
      } catch {}
    }

    this.live.clear();

    this.noiseBuffer = null;
    this.segmentToken = null;
    this.scene = null;
  }
}