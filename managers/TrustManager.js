// managers/TrustManager.js
// Pure dialogue/trust logic. No Phaser dependency.

export const TRUST_MIN = 0;
export const TRUST_MAX = 100;
export const TRUST_DEFAULT = 40;

export const TRUST_LEVELS = [
  {
    id: 'hostile',
    min: 0,
    label: 'HOSTILE',
    color: 0xc0392b,
    hex: '#e0604f',
    blurbs: [
      'Is considering calling security.',
      'Would rather talk to a wall.',
      'Your name is on a list now.'
    ]
  },
  {
    id: 'wary',
    min: 20,
    label: 'WARY',
    color: 0xd9822b,
    hex: '#e8993f',
    blurbs: [
      'Keeps one hand on the phone.',
      'Answers, but with That Look.',
      'Suspects you of something. Rightly, maybe.'
    ]
  },
  {
    id: 'neutral',
    min: 40,
    label: 'NEUTRAL',
    color: 0xc9b458,
    hex: '#d6c36a',
    blurbs: [
      'Professional. Slightly bored.',
      'Treats you like a parking ticket.',
      'Neither friend nor foe.'
    ]
  },
  {
    id: 'friendly',
    min: 60,
    label: 'FRIENDLY',
    color: 0x7fb85a,
    hex: '#8fcb68',
    blurbs: [
      'Actually smiling. Suspicious.',
      'Offered you a mint.',
      'Starting to like you. Do not ruin it.'
    ]
  },
  {
    id: 'trusting',
    min: 80,
    label: 'TRUSTING',
    color: 0x3fbf7f,
    hex: '#4fd18f',
    blurbs: [
      'Would hand you a spare key.',
      'Tells you things. Too many things.',
      'Considers you a friend. Congrats.'
    ]
  }
];

export const TONES = {
  polite: {
    id: 'polite',
    label: 'POLITE',
    hint: 'Ask nicely. Works on most humans.',
    react: 2
  },
  joke: {
    id: 'joke',
    label: 'JOKE',
    hint: 'Risky. Humor is subjective. So is your career.',
    react: [-3, 4]
  },
  pressure: {
    id: 'pressure',
    label: 'PUSHY',
    hint: 'Lean in and loom. Fast, but people remember.',
    react: -4
  },
  bribe: {
    id: 'bribe',
    label: 'BRIBE',
    hint: 'Cash talks. Some people hate being talked to.',
    react: 1,
    cost: 20
  }
};

export const TONE_ORDER = [
  'polite',
  'joke',
  'pressure',
  'bribe'
];

function isValidId(id) {
  return typeof id === 'string' && id.trim().length > 0;
}

function requireId(id) {
  if (!isValidId(id)) {
    throw new TypeError(
      '[TrustManager] NPC id must be a non-empty string.'
    );
  }
}

function isPlainRecord(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

export function clampTrust(
  value,
  fallback = TRUST_DEFAULT
) {
  const safeFallback = Number.isFinite(fallback)
    ? fallback
    : TRUST_DEFAULT;

  const safeValue = Number.isFinite(value)
    ? value
    : safeFallback;

  return Math.max(
    TRUST_MIN,
    Math.min(TRUST_MAX, Math.round(safeValue))
  );
}

export function getTrustLevelIndex(value) {
  const safeValue = clampTrust(value);
  let index = 0;

  for (let i = 0; i < TRUST_LEVELS.length; i++) {
    if (safeValue >= TRUST_LEVELS[i].min) {
      index = i;
    }
  }

  return index;
}

export function getTrustLevel(value) {
  return TRUST_LEVELS[getTrustLevelIndex(value)];
}

export function randomBlurb(level) {
  const resolved = typeof level === 'string'
    ? TRUST_LEVELS.find(entry => entry.id === level)
    : level;

  const list = Array.isArray(resolved?.blurbs) &&
    resolved.blurbs.length > 0
    ? resolved.blurbs
    : [''];

  return list[Math.floor(Math.random() * list.length)];
}

export function rollValue(spec) {
  if (Array.isArray(spec)) {
    if (
      spec.length !== 2 ||
      !Number.isFinite(spec[0]) ||
      !Number.isFinite(spec[1])
    ) {
      return 0;
    }

    const min = Math.ceil(Math.min(spec[0], spec[1]));
    const max = Math.floor(Math.max(spec[0], spec[1]));
    const span = max - min + 1;

    if (
      min > max ||
      !Number.isSafeInteger(min) ||
      !Number.isSafeInteger(max) ||
      !Number.isSafeInteger(span) ||
      span <= 0
    ) {
      return 0;
    }

    return min + Math.floor(Math.random() * span);
  }

  return Number.isFinite(spec)
    ? Math.round(spec)
    : 0;
}

export class TrustManager {
  constructor() {
    this.values = new Map();
  }

  ensure(id, start = TRUST_DEFAULT) {
    requireId(id);

    const existing = this.values.get(id);

    if (!Number.isFinite(existing)) {
      const initial = clampTrust(start);

      this.values.set(id, initial);

      return initial;
    }

    const normalized = clampTrust(existing);

    if (normalized !== existing) {
      this.values.set(id, normalized);
    }

    return normalized;
  }

  get(id, fallback = TRUST_DEFAULT) {
    const existing = this.values.get(id);

    return Number.isFinite(existing)
      ? clampTrust(existing)
      : clampTrust(fallback);
  }

  set(id, value) {
    requireId(id);

    if (!Number.isFinite(value)) {
      console.warn(
        `[TrustManager] Ignored invalid trust for "${id}".`,
        value
      );

      return false;
    }

    this.values.set(id, clampTrust(value));

    return true;
  }

  /**
   * Initialized NPC:
   *   ensure('curator', 25);
   *   add('curator', 3);
   *
   * Explicit initialization with the first change:
   *   add('curator', 3, 25);
   *
   * Unknown NPC without startTrust:
   *   throws instead of silently starting from 40.
   */
  add(id, delta, startTrust) {
    requireId(id);

    if (!Number.isFinite(this.values.get(id))) {
      if (!Number.isFinite(startTrust)) {
        throw new Error(
          `[TrustManager] "${id}" has no initialized trust. ` +
          'Call ensure(id, startTrust) first, ' +
          'or pass startTrust as the third argument to add().'
        );
      }

      this.ensure(id, startTrust);
    }

    const before = this.get(id);

    const safeDelta = Number.isFinite(delta)
      ? delta
      : 0;

    if (!Number.isFinite(delta)) {
      console.warn(
        `[TrustManager] Ignored invalid trust delta for "${id}".`,
        delta
      );
    }

    const after = clampTrust(
      before + safeDelta,
      before
    );

    this.values.set(id, after);

    return {
      before,
      after,
      delta: after - before,
      levelChanged:
        getTrustLevelIndex(before) !==
        getTrustLevelIndex(after),
      level: getTrustLevel(after)
    };
  }

  serialize() {
    const entries = [];

    for (const [id, value] of this.values) {
      if (
        !isValidId(id) ||
        !Number.isFinite(value)
      ) {
        continue;
      }

      entries.push([id, clampTrust(value)]);
    }

    return Object.fromEntries(entries);
  }

  deserialize(data) {
    const next = new Map();

    if (data == null) {
      this.values = next;
      return true;
    }

    if (!isPlainRecord(data)) {
      console.warn(
        '[TrustManager] Invalid saved trust data. ' +
        'Trust will be initialized from NPC definitions.'
      );

      this.values = next;

      return false;
    }

    let valid = true;

    for (const [id, value] of Object.entries(data)) {
      if (
        !isValidId(id) ||
        !Number.isFinite(value)
      ) {
        valid = false;

        console.warn(
          `[TrustManager] Ignored invalid saved trust for "${id}".`,
          value
        );

        continue;
      }

      next.set(id, clampTrust(value));
    }

    this.values = next;

    return valid;
  }

  reset() {
    this.values.clear();
  }
}

export const trustManager = new TrustManager();