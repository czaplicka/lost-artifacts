export const DESIGN_WIDTH = 1120;
export const DESIGN_HEIGHT = 800;

// If your @font-face names differ, change them here (single source of truth).
export const FONTS = {
  pixel: '"Press Start 2P", "Courier New", monospace',
  body: '"Special Elite", "Courier New", monospace'
};

export const COLORS = {
  // CSS colour strings (text)
  text: '#2b2a26',
  muted: '#6d695b',
  selected: '#173d73',
  titleText: '#f4efd8',
  gold: '#d4af37',
  phosphor: '#7dff9b',
  amber: '#ffd166',
  // Numeric fills
  desktop: 0x657f9b,
  window: 0xd7d5ca,
  titlebar: 0x294b70,
  titlebarLight: 0x4a79b0,
  divider: 0xaaa99e,
  plastic: 0xbdb9a4,
  ink: 0x1b2530
};

// Small deterministic PRNG so procedural art never changes between renders.
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function lerpColor(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) |
         (Math.round(ag + (bg - ag) * t) << 8) |
          Math.round(ab + (bb - ab) * t);
}