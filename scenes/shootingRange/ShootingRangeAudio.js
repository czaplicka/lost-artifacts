// =============================================================================
// ShootingRangeAudio.js - range sounds. Uses a real file when one was loaded
// (assets/audio/pi/shooting-range/<name>.mp3), otherwise a tiny WebAudio synth
// so the range is never silent.
// =============================================================================
import { audioManager } from '../../managers/AudioManager.js';
import { SOUNDS } from './ShootingRangeData.js';

function volume() {
  const v = audioManager.getSfxVolume?.();
  return Number.isFinite(v) ? v : 0.5;
}

function noise(ctx, seconds) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buffer; return src;
}

function envelope(ctx, peak, decay, at = ctx.currentTime) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(Math.max(0.0001, peak), at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  g.connect(ctx.destination); return g;
}

function tone(ctx, type, freq, peak, decay, at = ctx.currentTime) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, at);
  o.connect(envelope(ctx, peak, decay, at)); o.start(at); o.stop(at + decay + 0.02);
}

const SYNTH = {
  shot(ctx, v) {
    const src = noise(ctx, 0.35), f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(2400, ctx.currentTime); f.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);
    src.connect(f); f.connect(envelope(ctx, 0.9 * v, 0.32)); src.start();
    tone(ctx, 'sine', 90, 0.6 * v, 0.18);
  },
  empty(ctx, v) { tone(ctx, 'square', 1400, 0.12 * v, 0.03); },
  reload(ctx, v) {
    for (let i = 0; i < 3; i++) tone(ctx, 'square', 900 - i * 120, 0.1 * v, 0.04, ctx.currentTime + i * 0.16);
    tone(ctx, 'square', 520, 0.18 * v, 0.06, ctx.currentTime + 0.85);
  },
  ding(ctx, v) { tone(ctx, 'sine', 1320, 0.25 * v, 0.5); tone(ctx, 'sine', 2640, 0.08 * v, 0.3); },
  glass(ctx, v) {
    const src = noise(ctx, 0.4), f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3200;
    src.connect(f); f.connect(envelope(ctx, 0.5 * v, 0.35)); src.start();
    for (let i = 0; i < 4; i++) tone(ctx, 'sine', 2500 + Math.random() * 2500, 0.06 * v, 0.15, ctx.currentTime + i * 0.05);
  },
  buzz(ctx, v) { tone(ctx, 'sawtooth', 140, 0.2 * v, 0.35); }
};

export function preloadRangeAudio(scene, failed) {
  for (const s of Object.values(SOUNDS)) {
    if (!scene.cache.audio.exists(s.key) && !failed.has(s.key)) scene.load.audio(s.key, `assets/audio/pi/shooting-range/${s.file}.mp3`);
  }
}

export function playRangeSound(scene, name) {
  if (!scene?.sys?.isActive() || scene._cleanupDone) return;
  const v = volume(); if (v <= 0) return;
  const file = SOUNDS[name];
  try {
    if (file && scene.cache.audio.exists(file.key)) { audioManager.init(scene); audioManager.playSfx(file.key, { volume: v }); return; }
    const ctx = scene.sound?.context;
    if (!ctx || ctx.state === 'closed') return;
    if (ctx.state === 'suspended') ctx.resume?.();
    SYNTH[name]?.(ctx, v);
  } catch (error) {
    console.debug('[ShootingRange] sound unavailable:', error);
  }
}
