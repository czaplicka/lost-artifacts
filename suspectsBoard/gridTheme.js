// suspectsBoard/gridTheme.js
// Visual helpers + palette for the Evidence Grid. Presentation only, no game logic.

export const THEME = {
  gold: 0xd4af37,
  goldBright: 0xffdc73,
  goldDim: 0x8b704b,
  paper: 0xe9d7a0,
  card: 0x2e2218,
  cardHover: 0x45321f,
  cardEdge: 0x806440,
  sceneAccent: 0xd4af37,
  suspectAccent: 0x6fa8dc,
  green: 0x65a566,
  blue: 0x6fa8dc,
  tapeA: 0xf2c230,
  tapeB: 0x15100d
};

export const AVATAR_COLORS = [
  0x6b3a3a, 0x3a5a6b, 0x4d6b3a, 0x6b5a3a,
  0x5a3a6b, 0x3a6b5f, 0x6b3a56, 0x56533a
];

export function hashString(value = '') {
  const text = String(value);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Retro "pixel" panel: hard drop shadow, fill, border, thin top shine. Top-left origin. */
export function bevelBox(scene, x, y, w, h, opts = {}) {
  const {
    fill = 0x1c1514, stroke = 0x5d4932, strokeW = 2, shadow = true, shine = true
  } = opts;
  const parts = [];
  if (shadow) {
    parts.push(scene.add.rectangle(x + 4, y + 5, w, h, 0x000000, 0.45).setOrigin(0));
  }
  parts.push(
    scene.add.rectangle(x, y, w, h, fill, 1).setOrigin(0).setStrokeStyle(strokeW, stroke, 1)
  );
  if (shine) {
    parts.push(
      scene.add.rectangle(x + strokeW, y + strokeW, w - strokeW * 2, 2, 0xffffff, 0.07).setOrigin(0)
    );
  }
  return parts;
}

/** Diagonal hatch lines clipped exactly to the rectangle. */
export function hatch(scene, x, y, w, h, opts = {}) {
  const { spacing = 10, color = 0xffffff, alpha = 0.04, width = 1 } = opts;
  const g = scene.add.graphics();
  g.lineStyle(width, color, alpha);
  for (let k = spacing; k < w + h; k += spacing) {
    const ax = Math.min(k, w);
    const ay = k - ax;
    const by = Math.min(k, h);
    const bx = k - by;
    g.lineBetween(x + ax, y + ay, x + bx, y + by);
  }
  return g;
}

/** Four L-shaped corner brackets around a rectangle. */
export function cornerBrackets(scene, x, y, w, h, opts = {}) {
  const { len = 10, color = THEME.gold, alpha = 0.8, width = 2 } = opts;
  const g = scene.add.graphics();
  g.lineStyle(width, color, alpha);
  [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]
    .forEach(([px, py, dx, dy]) => {
      g.lineBetween(px, py, px + dx * len, py);
      g.lineBetween(px, py, px, py + dy * len);
    });
  return g;
}

/** Yellow/black "crime scene tape" strip. */
export function tapeStrip(scene, x, y, w, h, seg = 12) {
  const g = scene.add.graphics();
  g.fillStyle(THEME.tapeB, 1);
  g.fillRect(x, y, w, h);
  g.fillStyle(THEME.tapeA, 1);
  for (let px = 0, i = 0; px < w; px += seg, i++) {
    if (i % 2 === 0) g.fillRect(x + px, y, Math.min(seg, w - px), h);
  }
  return g;
}

/** Small status pill with an LED square. Returns { container, width, height }. */
export function pill(scene, cx, cy, label, opts = {}) {
  const {
    fill = 0x1c1514, stroke = THEME.goldDim, color = '#ffdc73', dot = null, fontSize = '7px'
  } = opts;
  const text = scene.add.text(0, 0, label, {
    fontFamily: 'PressStart2P', fontSize, color
  }).setOrigin(0, 0.5);
  const dotW = dot !== null ? 12 : 0;
  const w = Math.ceil(text.width) + 16 + dotW;
  const h = 22;
  const bg = scene.add.rectangle(0, 0, w, h, fill, 1).setStrokeStyle(2, stroke, 1);
  text.setPosition(-w / 2 + 8 + dotW, 1);
  const parts = [bg, text];
  if (dot !== null) parts.push(scene.add.rectangle(-w / 2 + 11, 0, 6, 6, dot, 1));
  const container = scene.add.container(cx, cy, parts);
  return { container, width: w, height: h };
}