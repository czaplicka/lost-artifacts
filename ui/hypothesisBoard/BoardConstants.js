export const FONT_TEXT = 'SpecialElite';
export const FONT_PIXEL = 'PressStart2P';

export const STRING_COLORS = {
  neutral: 0xd9c9a0,
  green: 0x44d66a,
  yellow: 0xf1c232,
  red: 0xe06666
};

export const PIN_COLORS = [0xb22222, 0x2f5d8a, 0xd4a017, 0x2f7f4a, 0x7a3b8a, 0xc2581a];

export const SLOT_COLORS = {
  neutral: { fill: 0x241c16, stroke: 0xc8a75a, text: '#8d8577' },
  selected: { fill: 0x3a3017, stroke: 0xffd966, text: '#fff0bf' },
  green: { fill: 0x193019, stroke: 0x44d66a, text: '#b9efb9' },
  yellow: { fill: 0x3d3216, stroke: 0xf1c232, text: '#fff0bf' },
  red: { fill: 0x3a1d1d, stroke: 0xe06666, text: '#fff0bf' }
};

export const LEGEND_ITEMS = [
  { color: 0x44d66a, label: 'correct' },
  { color: 0xf1c232, label: 'right clue, wrong question' },
  { color: 0xe06666, label: 'wrong clue' }
];

// Deterministyczny PRNG: korek i przechył kartek wyglądają tak samo po każdym resize.
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
