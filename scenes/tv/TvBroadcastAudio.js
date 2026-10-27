import { audioManager } from '../../managers/AudioManager.js';

/**
 * Proceduralne dźwięki telewizora (WebAudio), bo w assets/audio nie ma plików TV.
 * Szanuje mute i głośność SFX z audioManager. Gdy brak WebAudio, nic nie robi.
 */
export class TvBroadcastAudio {
  constructor(scene) {
    this.scene = scene;

    this.level = 1;
    this.noiseBuffer = null;
    this.humNodes = null;
    this.live = new Set();
    this.destroyed = false;
  }

  getContext() {
    const ctx = this.scene?.sound?.context;

    return ctx && typeof ctx.createGain === 'function' ? ctx : null;
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

      let volume = Number(audioManager.getSfxVolume?.());

      if (!Number.isFinite(volume)) volume = 0.5;

      return Math.max(0, Math.min(1, volume * this.level * scale));
    } catch (error) {
      return 0.3 * this.level * scale;
    }
  }

  setLevel(level) {
    this.level = Math.max(0, Math.min(1, level));

    if (this.humNodes) {
      const ctx = this.getContext();

      if (ctx) {
        this.humNodes.gain.gain.setTargetAtTime(
          this.getVolume(0.05),
          ctx.currentTime,
          0.05
        );
      }
    }
  }

  getNoiseBuffer(ctx) {
    if (this.noiseBuffer) return this.noiseBuffer;

    const length = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.noiseBuffer = buffer;

    return buffer;
  }

  track(node) {
    this.live.add(node);

    node.onended = () => {
      this.live.delete(node);

      try {
        node.disconnect();
      } catch (error) {
        /* ignore */
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
      gain.gain.exponentialRampToValueAtTime(volume * 0.6, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.getOutput(ctx));

      this.track(source);

      source.start(t);
      source.stop(t + duration + 0.05);
    } catch (error) {
      /* optional */
    }
  }

  tone(freq, duration = 0.1, type = 'sine', strength = 0.4) {
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
      gain.gain.exponentialRampToValueAtTime(volume * 0.5, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc.connect(gain);
      gain.connect(this.getOutput(ctx));

      this.track(osc);

      osc.start(t);
      osc.stop(t + duration + 0.05);
    } catch (error) {
      /* optional */
    }
  }

  sweep(from, to, duration = 0.25, type = 'sawtooth', strength = 0.3) {
    try {
      const ctx = this.ensure();
      const volume = this.getVolume(strength);

      if (!ctx || volume <= 0) return;

      const t = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, from), t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + duration);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume * 0.4, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc.connect(gain);
      gain.connect(this.getOutput(ctx));

      this.track(osc);

      osc.start(t);
      osc.stop(t + duration + 0.05);
    } catch (error) {
      /* optional */
    }
  }

  beep(freq = 1000, duration = 0.25) {
    this.tone(freq, duration, 'sine', 0.35);
  }

  click() {
    this.tone(900, 0.03, 'square', 0.25);
  }

  powerOn() {
    this.sweep(70, 2600, 0.28, 'sawtooth', 0.35);
    this.staticBurst(0.12, 0.35);
  }

  powerOff() {
    this.sweep(2000, 50, 0.24, 'sawtooth', 0.35);
    this.staticBurst(0.08, 0.3);
  }

  startHum() {
    try {
      if (this.humNodes) return;

      const ctx = this.ensure();

      if (!ctx) return;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(this.getVolume(0.05), ctx.currentTime + 0.4);

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

      this.humNodes = { low, high, gain };
    } catch (error) {
      /* optional */
    }
  }

  stopHum() {
    if (!this.humNodes) return;

    const { low, high, gain } = this.humNodes;

    this.humNodes = null;

    try {
      const ctx = this.getContext();
      const t = ctx ? ctx.currentTime : 0;

      gain.gain.cancelScheduledValues(t);
      gain.gain.setTargetAtTime(0.0001, t, 0.05);

      low.stop(t + 0.3);
      high.stop(t + 0.3);

      low.onended = () => {
        try {
          low.disconnect();
          high.disconnect();
          gain.disconnect();
        } catch (error) {
          /* ignore */
        }
      };
    } catch (error) {
      /* ignore */
    }
  }

  destroy() {
    this.destroyed = true;

    this.stopHum();

    for (const node of this.live) {
      try {
        node.stop();
        node.disconnect();
      } catch (error) {
        /* ignore */
      }
    }

    this.live.clear();

    this.noiseBuffer = null;
    this.scene = null;
  }
}