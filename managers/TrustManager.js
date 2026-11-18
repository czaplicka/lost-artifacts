// managers/TrustManager.js
// Single source of truth for "how much does this NPC trust the detective".
// Pure logic, no Phaser dependency: usable from dialogues, phone calls, saves, scoring.

export const TRUST_MIN = 0;
export const TRUST_MAX = 100;

export const TRUST_LEVELS = [
  { id: 'hostile', min: 0, label: 'HOSTILE', color: 0xc0392b, hex: '#e0604f',
    blurbs: ['Is considering calling security.', 'Would rather talk to a wall.', 'Your name is on a list now.'] },
  { id: 'wary', min: 20, label: 'WARY', color: 0xd9822b, hex: '#e8993f',
    blurbs: ['Keeps one hand on the phone.', 'Answers, but with That Look.', 'Suspects you of something. Rightly, maybe.'] },
  { id: 'neutral', min: 40, label: 'NEUTRAL', color: 0xc9b458, hex: '#d6c36a',
    blurbs: ['Professional. Slightly bored.', 'Treats you like a parking ticket.', 'Neither friend nor foe.'] },
  { id: 'friendly', min: 60, label: 'FRIENDLY', color: 0x7fb85a, hex: '#8fcb68',
    blurbs: ['Actually smiling. Suspicious.', 'Offered you a mint.', 'Starting to like you. Do not ruin it.'] },
  { id: 'trusting', min: 80, label: 'TRUSTING', color: 0x3fbf7f, hex: '#4fd18f',
    blurbs: ['Would hand you a spare key.', 'Tells you things. Too many things.', 'Considers you a friend. Congrats.'] },
];

// How the detective phrases a question. Each NPC can override the reaction via def.reacts.
// A reaction is a number or [min, max] (random integer, inclusive).
export const TONES = {
  polite:   { id: 'polite',   label: 'POLITE', hint: 'Ask nicely. Works on most humans.', react: 2 },
  joke:     { id: 'joke',     label: 'JOKE',   hint: 'Risky. Humor is subjective. So is your career.', react: [-3, 4] },
  pressure: { id: 'pressure', label: 'PUSHY',  hint: 'Lean in and loom. Fast, but people remember.', react: -4 },
  bribe:    { id: 'bribe',    label: 'BRIBE',  hint: 'Cash talks. Some people hate being talked to.', react: 1, cost: 20 },
};
export const TONE_ORDER = ['polite', 'joke', 'pressure', 'bribe'];

export function clampTrust(v) {
  return Math.max(TRUST_MIN, Math.min(TRUST_MAX, Math.round(v)));
}

export function getTrustLevelIndex(value) {
  let idx = 0;
  for (let i = 0; i < TRUST_LEVELS.length; i++) {
    if (value >= TRUST_LEVELS[i].min) idx = i;
  }
  return idx;
}

export function getTrustLevel(value) {
  return TRUST_LEVELS[getTrustLevelIndex(value)];
}

export function randomBlurb(level) {
  const lv = typeof level === 'string' ? TRUST_LEVELS.find((l) => l.id === level) : level;
  const list = (lv && lv.blurbs) || [''];
  return list[Math.floor(Math.random() * list.length)];
}

// number -> number, [min,max] -> random int in range
export function rollValue(spec) {
  if (Array.isArray(spec)) {
    const a = Math.min(spec[0], spec[1]);
    const b = Math.max(spec[0], spec[1]);
    return a + Math.floor(Math.random() * (b - a + 1));
  }
  return Math.round(Number(spec) || 0);
}

export class TrustManager {
  constructor() {
    this.values = new Map();
  }

  ensure(id, start = 40) {
    if (!this.values.has(id)) this.values.set(id, clampTrust(start));
    return this.values.get(id);
  }

  get(id, fallback = 40) {
    return this.values.has(id) ? this.values.get(id) : fallback;
  }

  set(id, value) {
    this.values.set(id, clampTrust(value));
  }

  add(id, delta) {
    const before = this.get(id);
    const after = clampTrust(before + delta);
    this.values.set(id, after);
    return {
      before,
      after,
      delta: after - before,
      levelChanged: getTrustLevelIndex(before) !== getTrustLevelIndex(after),
      level: getTrustLevel(after),
    };
  }

  serialize() {
    return Object.fromEntries(this.values);
  }

  deserialize(obj) {
    this.values = new Map(Object.entries(obj || {}).map(([k, v]) => [k, clampTrust(v)]));
  }

  reset() {
    this.values.clear();
  }
}

export const trustManager = new TrustManager();