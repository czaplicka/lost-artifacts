export function hashString(str) {
  let h = 2166136261 >>> 0;
  const s = String(str);

  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }

  return h >>> 0;
}

// Deterministyczny PRNG: ręcznie rysowane kółka wyglądają tak samo przy każdym kliknięciu.
export function mulberry32(seed) {
  let a = seed >>> 0;

  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const up = (v) => String(v ?? '').trim().toUpperCase();

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Tweeny przez scenę (śledzone, jeśli scena to potrafi).
export function createFx(scene) {
  return {
    tween(config) {
      if (!scene?.tweens) return null;

      return typeof scene.createTrackedTween === 'function'
        ? scene.createTrackedTween(config)
        : scene.tweens.add(config);
    },

    kill(target) {
      if (!target) return;

      if (typeof scene?.killTrackedTweensOf === 'function') {
        scene.killTrackedTweensOf(target);
      } else {
        scene?.tweens?.killTweensOf(target);
      }
    }
  };
}