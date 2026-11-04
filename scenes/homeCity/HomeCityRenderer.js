// =============================================================================
// HomeCityRenderer.js - art for the isometric "Old Quarter" (home city).
// Navigation / input stay in HomeCityScene.
//
// Everything is drawn procedurally into canvas textures ONCE (cheap at runtime),
// and every piece can be replaced by real art simply by loading a texture with
// the key below (see ART_KEYS). Missing textures -> procedural fallback.
//
//   hc_bld_<id>        building sprite: pi-office, spy-shop, tavern, police-station, your-home, cemetery
//   hc_prop_<name>     prop sprite: lamp bench board bin planter bush hydrant mailbox kiosk crate
//                                   tree_0 tree_1 tree_2 car_x car_y
//   hc_tex_grass / hc_tex_road / hc_tex_sidewalk / hc_tex_plaza   seamless ground textures (square)
//   hc_detective / hc_detective_back                            player sprite (used by HomeCityScene)
// =============================================================================
const HW = 64, HH = 32;                    // keep in sync with HomeCityScene
const WORLD_W = 3300, WORLD_H = 2000;      // keep in sync with camera bounds in HomeCityScene
const FONT_UI = 'SpecialElite, monospace', FONT_PX = 'PressStart2P, monospace';
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
let instances = 0;

// Fine-tuning for real sprites (anchor = bottom vertex of the building footprint / bottom-centre of a prop).
export const BUILDING_SPRITE_TWEAKS = {
  'pi-office': { dx: 0, dy: 0, scale: 1, height: 170 }, 'spy-shop': { dx: 0, dy: 0, scale: 1, height: 150 },
  tavern: { dx: 0, dy: 0, scale: 1, height: 160 }, 'police-station': { dx: 0, dy: 0, scale: 1, height: 190 },
  'your-home': { dx: 0, dy: 0, scale: 1, height: 160 }, cemetery: { dx: 0, dy: 0, scale: 1, height: 120 }
};
export const PROP_SPRITE_TWEAKS = {}; // e.g. { tree_0: { dx: 0, dy: 4, scale: 0.8 } }

const PALETTES = {
  'pi-office': { wall: 0xc4ab83, shade: 0x9a7d5b, roof: 0x57483e, trim: 0xe3cfaa, glass: 0x35494c, accent: 0xd7b16b, height: 142,
    style: 'brick', door: 0x3f2f26, lit: 0.35, blinds: true, blade: 'eye', sign: 'PRIVATE EYE (OPEN 9-ISH)',
    features: [{ t: [0, 0], k: 'chimney' }, { t: [2, 0], k: 'antenna' }, { t: [1, 1], k: 'vent' }, { t: [2, 2], k: 'vent', dx: 8 }] },
  'spy-shop': { wall: 0x78918a, shade: 0x4e6b66, roof: 0x343e3b, trim: 0xb8bfa4, glass: 0x233b3b, accent: 0xddd28e, height: 114,
    style: 'boards', door: 0x24403c, lit: 0.2, shop: true, awning: [0x2f6f66, 0xd9d4b4], blade: 'lens', sign: 'CLOSED. NOBODY WAS HERE.',
    features: [{ t: [1, 1], k: 'dish' }, { t: [2, 0], k: 'antenna' }] },
  tavern: { wall: 0xb58162, shade: 0x86563f, roof: 0x6c4235, trim: 0xe1bc87, glass: 0x78623d, accent: 0xe7b85c, height: 132,
    style: 'stucco', door: 0x4a2c20, lit: 1, shop: true, awning: [0x8c2f2a, 0xe9ddc0], blade: 'mug', sign: 'THE DRUNKEN ALIBI',
    features: [{ t: [0, 1], k: 'chimney', smoke: true }, { t: [2, 0], k: 'vent' }] },
  'police-station': { wall: 0x93a1a1, shade: 0x65757c, roof: 0x3d4d56, trim: 0xd1d1b8, glass: 0x344c58, accent: 0xc3a45b, height: 156,
    style: 'stone', door: 0x2b3a46, lit: 0.5, pilasters: true, blade: 'badge', sign: 'PRECINCT 13 1/2',
    features: [{ t: [3, 0], k: 'flag' }, { t: [1, 2], k: 'beacon' }, { t: [0, 1], k: 'vent' }] },
  'your-home': { wall: 0xc2b491, shade: 0x95896d, roof: 0x666d51, trim: 0xebe0bd, glass: 0x486064, accent: 0x839b72, height: 120,
    style: 'stucco', door: 0x4b5a3f, lit: 0.45, shutters: 0x5f7a52, blade: 'bird', sign: 'COO-COO LOFT',
    features: [{ t: [1, 1], k: 'loft' }, { t: [0, 0], k: 'chimney', smoke: true }] }
};

const STREET_TEXTS = [
  { t: 'RED HERRING RD', u: 10, v: 3.6, rot: 'v', size: 30 },
  { t: 'GUMSHOE AVE', u: 21.5, v: 10.6, rot: 'u', size: 30 },
  { t: 'SLOW: PIGEONS', u: 1.5, v: 15, rot: 'v', size: 26 },
  { t: 'OLD QUARTER', u: 15, v: 8.45, rot: 'u', size: 24 }
];
const WALKERS = [
  { tex: 'ped0', speed: 1.0, route: [[2, 20], [23, 20]] },
  { tex: 'ped1', speed: 0.9, route: [[3, 1], [3, 21]] },
  { tex: 'ped2', speed: 1.25, route: [[25, 1], [25, 21]] },
  { tex: 'dog', speed: 1.3, route: [[5, 7], [8, 7, 2.6], [11, 7], [8, 7, 1.2]] }
];

// ------------------------------------------------------------------ helpers ---
const rgb = n => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
const css = (n, a = 1) => { const [r, g, b] = rgb(n); return `rgba(${r},${g},${b},${a})`; };
const col = c => (typeof c === 'number' ? css(c) : c);
const mix = (a, b, t) => {
  const A = rgb(a), B = rgb(b);
  return (Math.round(A[0] + (B[0] - A[0]) * t) << 16) | (Math.round(A[1] + (B[1] - A[1]) * t) << 8) | Math.round(A[2] + (B[2] - A[2]) * t);
};
const light = (n, t) => mix(n, 0xffffff, t), dark = (n, t) => mix(n, 0x000000, t);
const hash = (x, y, s = 0) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
const pp = (...a) => a.map(([x, y]) => ({ x, y }));
const pathOf = (ctx, pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); };
const poly = (ctx, pts, fill, stroke = fill, lw = 1) => {
  pathOf(ctx, pts);
  if (fill != null) { ctx.fillStyle = col(fill); ctx.fill(); }
  if (stroke != null) { ctx.lineWidth = lw; ctx.strokeStyle = col(stroke); ctx.stroke(); }
};
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = col(c); ctx.fillRect(x, y, w, h); };
const circle = (ctx, x, y, r, c) => { ctx.fillStyle = col(c); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
const ellipse = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = col(c); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill(); };
const line = (ctx, x1, y1, x2, y2, c, w = 1) => { ctx.strokeStyle = col(c); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
const vgrad = (ctx, y1, y2, stops) => { const g = ctx.createLinearGradient(0, y1, 0, y2); stops.forEach(([t, c]) => g.addColorStop(t, col(c))); return g; };
const hgrad = (ctx, x1, x2, stops) => { const g = ctx.createLinearGradient(x1, 0, x2, 0); stops.forEach(([t, c]) => g.addColorStop(t, col(c))); return g; };
const yRange = pts => [Math.min(...pts.map(p => p.y)), Math.max(...pts.map(p => p.y))];
const shadow = (ctx, rx, ry, a = 0.3) => ellipse(ctx, 7, 3, rx, ry, css(0x121810, a));
// iso projection relative to a screen centre (cx,cy); u = +x cell axis, v = +y cell axis
const S = (cx, cy, u, v, z = 0) => ({ x: cx + HW * (u - v), y: cy + HH * (u + v) - z });
function isoBox(ctx, cx, cy, lx, ly, z0, z1, top, front, side, edge = null) {
  const T = (u, v, z) => S(cx, cy, u, v, z);
  poly(ctx, [T(lx, -ly, z0), T(lx, ly, z0), T(lx, ly, z1), T(lx, -ly, z1)], side, edge);
  poly(ctx, [T(-lx, ly, z0), T(lx, ly, z0), T(lx, ly, z1), T(-lx, ly, z1)], front, edge);
  poly(ctx, [T(-lx, -ly, z1), T(lx, -ly, z1), T(lx, ly, z1), T(-lx, ly, z1)], top, edge);
}
const blob = (ctx, x, y, r, c) => { ctx.fillStyle = col(c); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };

// --------------------------------------------------------------- prop art ---
const PROP_ART = {
  lamp: { w: 90, h: 170, ax: 45, ay: 158, draw(ctx) {
    shadow(ctx, 24, 8); isoBox(ctx, 0, 0, 0.17, 0.17, 0, 12, 0x59615a, 0x434b44, 0x30372f);
    ctx.fillStyle = hgrad(ctx, -4, 4, [[0, 0x3a423b], [0.45, 0x77807a], [1, 0x2a312c]]); ctx.fillRect(-4, -100, 8, 90);
    rect(ctx, -7, -34, 14, 6, 0x353d36); rect(ctx, -6, -62, 12, 4, 0x353d36); rect(ctx, -12, -126, 24, 4, 0x2e352f);
    ctx.fillStyle = vgrad(ctx, -122, -98, [[0, 0xfff1c0], [1, 0xe4b868]]); ctx.fillRect(-10, -122, 20, 24);
    ctx.strokeStyle = css(0x2e352f); ctx.lineWidth = 2; ctx.strokeRect(-10, -122, 20, 24);
    line(ctx, 0, -122, 0, -98, 0x2e352f, 1.5); poly(ctx, pp([-16, -126], [0, -140], [16, -126]), 0x2e352f); circle(ctx, 0, -142, 3, 0x2e352f);
  } },
  bench: { w: 110, h: 80, ax: 55, ay: 68, draw(ctx) {
    shadow(ctx, 46, 11); rect(ctx, -36, -10, 6, 14, 0x3a3d33); rect(ctx, 30, -10, 6, 14, 0x3a3d33);
    rect(ctx, -44, -50, 5, 46, 0x3a3d33); rect(ctx, 39, -50, 5, 46, 0x3a3d33);
    for (let i = 0; i < 3; i++) { rect(ctx, -42, -48 + i * 8, 84, 6, i % 2 ? 0x98704e : 0xad8257); rect(ctx, -42, -48 + i * 8, 84, 1.5, 0xd2a878); }
    for (let i = 0; i < 2; i++) { rect(ctx, -42, -22 + i * 8, 84, 6, i % 2 ? 0x98704e : 0xb28b60); rect(ctx, -42, -22 + i * 8, 84, 1.5, 0xd8b283); }
    ctx.save(); ctx.translate(14, -24); ctx.rotate(-0.14); rect(ctx, -13, -4, 26, 8, 0xe7e0cb); rect(ctx, -10, -2, 12, 1.5, 0x777166); rect(ctx, -10, 1, 18, 1.5, 0x777166); ctx.restore();
  } },
  board: { w: 120, h: 140, ax: 60, ay: 132, draw(ctx) {
    shadow(ctx, 44, 10); rect(ctx, -32, -62, 7, 62, 0x594735); rect(ctx, 25, -62, 7, 62, 0x594735);
    poly(ctx, pp([-58, -112], [0, -128], [58, -112], [52, -104], [-52, -104]), 0x4a3828);
    rect(ctx, -52, -112, 104, 70, 0x5b4632); ctx.fillStyle = vgrad(ctx, -106, -48, [[0, 0xc4a672], [1, 0xa88a58]]); ctx.fillRect(-47, -107, 94, 60);
    const papers = [[-42, -102, 24, 32, 0xe9deb9, -0.05], [-12, -100, 26, 36, 0xf1ead2, 0.04], [18, -104, 24, 30, 0xe3d6a8, -0.03], [-36, -64, 22, 14, 0xf6e48a, 0.06], [4, -62, 30, 12, 0xe9deb9, -0.04]];
    for (const [x, y, w, h, c, r] of papers) {
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(r); rect(ctx, -w / 2, -h / 2, w, h, c);
      for (let k = 0; k < Math.floor(h / 6); k++) rect(ctx, -w / 2 + 3, -h / 2 + 8 + k * 5, w - 8 - (k % 2) * 6, 1.4, 0x7d7459); ctx.restore();
    }
    circle(ctx, -10, -66 + 18, 7, 0x3a3128); poly(ctx, pp([-22, -43], [2, -43], [-4, -52], [-16, -52]), 0x3a3128); rect(ctx, -13, -100, 6, 3, 0xb7342d);
    for (const [x, y] of [[-30, -100], [30, -102], [-24, -62], [24, -60]]) circle(ctx, x, y, 2.2, 0xb7342d);
  } },
  bin: { w: 56, h: 74, ax: 28, ay: 66, draw(ctx) {
    shadow(ctx, 20, 7); ctx.fillStyle = hgrad(ctx, -15, 15, [[0, 0x3a4a3f], [0.5, 0x56695b], [1, 0x2e3c33]]); ctx.fillRect(-15, -40, 30, 40);
    for (let i = 0; i < 4; i++) rect(ctx, -15, -34 + i * 9, 30, 1.5, 0x26332b);
    rect(ctx, -18, -46, 36, 8, 0x2e3c33); rect(ctx, -6, -50, 12, 4, 0x1f2a23);
    poly(ctx, pp([-22, 0], [-14, -3], [-10, 1], [-18, 3]), 0xe0c64a);
  } },
  planter: { w: 100, h: 100, ax: 50, ay: 88, draw(ctx) {
    shadow(ctx, 36, 10); rect(ctx, -26, -20, 52, 22, 0x8c7557); for (let i = 1; i < 4; i++) rect(ctx, -26 + i * 13, -20, 1.5, 22, 0x5d4a35);
    rect(ctx, -28, -24, 56, 5, 0xa88a65);
    for (const [x, y, r, c] of [[-16, -32, 16, 0x3c5a38], [14, -32, 16, 0x3c5a38], [0, -42, 18, 0x4a6e43], [-8, -48, 11, 0x5d8452], [12, -45, 9, 0x5d8452]]) blob(ctx, x, y, r, c);
    for (const [x, y, c] of [[-14, -40, 0xe4b84f], [10, -46, 0xd9627d], [16, -34, 0xf2eadb], [-4, -52, 0xd9627d], [-20, -30, 0xe4b84f]]) { blob(ctx, x, y, 3.2, c); blob(ctx, x, y, 1.2, 0x7a4a1f); }
  } },
  bush: { w: 100, h: 70, ax: 50, ay: 60, draw(ctx) {
    shadow(ctx, 34, 9, 0.28);
    for (const [x, y, r, c] of [[-20, -16, 17, 0x35542f], [18, -16, 17, 0x35542f], [0, -22, 21, 0x41683a], [-12, -30, 11, 0x5a8450], [12, -28, 10, 0x5a8450], [0, -34, 8, 0x6f9a5e]]) blob(ctx, x, y, r, c);
    for (const [x, y] of [[-10, -24], [8, -34], [18, -14], [-22, -12]]) blob(ctx, x, y, 2.4, 0xc23b3b);
  } },
  hydrant: { w: 50, h: 70, ax: 25, ay: 62, draw(ctx) {
    shadow(ctx, 16, 5); rect(ctx, -11, -6, 22, 6, 0x8a2b27); ctx.fillStyle = hgrad(ctx, -9, 9, [[0, 0x8a2b27], [0.4, 0xd6453b], [1, 0x7a2420]]); ctx.fillRect(-9, -34, 18, 30);
    ctx.fillStyle = css(0xc23d34); ctx.beginPath(); ctx.arc(0, -34, 9, Math.PI, 0); ctx.fill(); rect(ctx, -3, -46, 6, 5, 0xd6453b);
    rect(ctx, -17, -26, 9, 9, 0xb7342d); rect(ctx, 8, -26, 9, 9, 0xb7342d); rect(ctx, -19, -27, 3, 11, 0x8a2b27); rect(ctx, 16, -27, 3, 11, 0x8a2b27); rect(ctx, -9, -20, 18, 2, 0x7a2420);
  } },
  mailbox: { w: 56, h: 96, ax: 28, ay: 88, draw(ctx) {
    shadow(ctx, 18, 6); rect(ctx, -3, -54, 6, 54, 0x4a3b2c); ctx.fillStyle = hgrad(ctx, -14, 14, [[0, 0x23496f], [0.5, 0x3a73aa], [1, 0x1f3f60]]);
    ctx.fillRect(-14, -74, 28, 22); ctx.beginPath(); ctx.arc(0, -74, 14, Math.PI, 0); ctx.fill(); rect(ctx, -9, -66, 18, 2.5, 0x12263a); rect(ctx, 14, -80, 3, 16, 0xc23b3b); rect(ctx, 14, -80, 9, 6, 0xd6453b);
    ctx.save(); ctx.translate(-4, -80); ctx.rotate(-0.4); rect(ctx, -8, -3, 16, 7, 0xeee6cf); ctx.restore();
  } },
  kiosk: { w: 150, h: 170, ax: 75, ay: 150, draw(ctx) {
    shadow(ctx, 50, 14); isoBox(ctx, 0, 0, 0.36, 0.36, 0, 56, 0x4f6a4a, 0x56734f, 0x3e5539, 0x25321f);
    poly(ctx, [S(0, 0, -0.26, 0.36, 14), S(0, 0, 0.26, 0.36, 14), S(0, 0, 0.26, 0.36, 44), S(0, 0, -0.26, 0.36, 44)], 0x1f2a22, null);
    for (let i = 0; i < 5; i++) { const a = S(0, 0, -0.22 + i * 0.1, 0.37, 16 + (i % 2) * 14); rect(ctx, a.x - 5, a.y - 12, 10, 14, [0xe9deb9, 0xc9b98a, 0xd9627d, 0xf1ead2, 0x8bb3c9][i]); }
    const A = (u, v, z) => S(0, 0, u, v, z);
    for (let i = 0; i < 6; i++) {
      const a = -0.42 + (0.84 * i) / 6, b = -0.42 + (0.84 * (i + 1)) / 6, c = i % 2 ? 0xe9ddc0 : 0xb7342d;
      poly(ctx, [A(a, 0.36, 66), A(b, 0.36, 66), A(b, 0.66, 52), A(a, 0.66, 52)], c);
      poly(ctx, [A(0.36, a, 66), A(0.36, b, 66), A(0.66, b, 52), A(0.66, a, 52)], dark(c, 0.25));
    }
  } },
  crate: { w: 120, h: 120, ax: 60, ay: 100, draw(ctx) {
    shadow(ctx, 40, 12); isoBox(ctx, 0, 0, 0.28, 0.28, 0, 26, 0xb08a56, 0x9a7547, 0x7b5c37, 0x3d2d1c);
    isoBox(ctx, 6, -3, 0.2, 0.2, 26, 48, 0xbe9a64, 0xa6804f, 0x866342, 0x3d2d1c);
    for (const [x, c] of [[-12, 0x3f7a3e], [0, 0x4d8a4a], [12, 0x3f7a3e]]) { rect(ctx, x - 3, -66, 7, 14, c); rect(ctx, x - 1, -74, 3, 9, c); rect(ctx, x - 3, -64, 2, 8, 0xb9e0b0); }
  } }
};
const treeArt = v => ({ w: 220, h: 280, ax: 110, ay: 268, draw(ctx) {
  const pal = [[0x34502f, 0x4b6e3b, 0x72994f], [0x2f4a2e, 0x456b3a, 0x6b9350], [0x8a4a22, 0xc0742c, 0xe5a246]][v];
  shadow(ctx, 52, 15, 0.3);
  poly(ctx, pp([-9, 0], [9, 0], [14, 4], [5, -78], [-5, -78], [-14, 4]), 0x5a4330); poly(ctx, pp([-3, 0], [9, 0], [5, -78], [0, -78]), 0x6f5640, null);
  line(ctx, 0, -64, -22, -96, 0x5a4330, 5); line(ctx, 0, -60, 24, -92, 0x5a4330, 5);
  const tall = v === 1, cy = tall ? -150 : -128;
  for (let layer = 0; layer < 3; layer++) for (let i = 0; i < (tall ? 9 : 12); i++) {
    const a = hash(i, layer, v) * Math.PI * 2, r = (tall ? 20 : 42) * Math.sqrt(hash(layer, i, 5 + v));
    blob(ctx, Math.cos(a) * r * (tall ? 1 : 1.25), cy + Math.sin(a) * r * (tall ? 2.6 : 1) - layer * (tall ? 6 : 8) + (2 - layer) * 4, (tall ? 20 : 26) - layer * 2, pal[layer]);
  }
  for (let i = 0; i < 16; i++) { const a = hash(i, 9, v) * 6.28, r = hash(i, 4, v) * (tall ? 20 : 50); rect(ctx, Math.cos(a) * r - 12 * hash(i, 1, v), cy - 18 + Math.sin(a) * r * (tall ? 2.4 : 0.7), 4, 3, light(pal[2], 0.3)); }
  for (let i = 0; i < 9; i++) rect(ctx, -50 + hash(i, 2, v) * 100, -4 + hash(i, 3, v) * 12, 4, 3, v === 2 ? 0xd18a34 : 0x6a7b45);
} });
function drawCar(ctx, along, body) {
  const ax = along === 'x', lx = ax ? 0.92 : 0.34, ly = ax ? 0.34 : 0.92, T = (u, v, z) => S(0, 0, u, v, z);
  shadow(ctx, 86, 26, 0.3);
  isoBox(ctx, 0, 0, lx, ly, 8, 26, light(body, 0.12), body, dark(body, 0.3), 0x1a1a1a);
  const cl = ax ? [0.42, 0.28] : [0.28, 0.42], off = ax ? [-0.12, 0] : [0, -0.12], c = T(off[0], off[1], 0);
  isoBox(ctx, c.x, c.y, cl[0], cl[1], 26, 44, light(body, 0.2), light(body, 0.05), dark(body, 0.25), 0x1a1a1a);
  const C = (u, v, z) => S(c.x, c.y, u, v, z);
  poly(ctx, [C(-cl[0] + 0.06, cl[1], 30), C(cl[0] - 0.06, cl[1], 30), C(cl[0] - 0.06, cl[1], 41), C(-cl[0] + 0.06, cl[1], 41)], 0x27363a, null);
  poly(ctx, [C(cl[0], -cl[1] + 0.06, 30), C(cl[0], cl[1] - 0.06, 30), C(cl[0], cl[1] - 0.06, 41), C(cl[0], -cl[1] + 0.06, 41)], 0x1e2b2e, null);
  const wheels = ax ? [T(-0.55, ly, 8), T(0.55, ly, 8)] : [T(lx, -0.55, 8), T(lx, 0.55, 8)];
  for (const w of wheels) { circle(ctx, w.x, w.y, 10, 0x15171a); circle(ctx, w.x, w.y, 5, 0x9aa0a0); }
  const heads = ax ? [T(lx, -0.17, 17), T(lx, 0.17, 17)] : [T(-0.17, ly, 17), T(0.17, ly, 17)];
  for (const h of heads) { circle(ctx, h.x, h.y, 4, 0xfff0b0); circle(ctx, h.x, h.y, 2, 0xffffff); }
  const b0 = ax ? T(lx, -0.3, 10) : T(-0.3, ly, 10), b1 = ax ? T(lx, 0.3, 10) : T(0.3, ly, 10); line(ctx, b0.x, b0.y, b1.x, b1.y, 0xc9ccc4, 3);
}
const CAR_COLORS = [0x8e3a34, 0x3e7a74, 0xc69a3c];
function drawPerson(ctx, o) {
  shadow(ctx, 14, 5); rect(ctx, -7, -24, 6, 24, o.pants); rect(ctx, 1, -24, 6, 24, o.pants); rect(ctx, -9, -3, 9, 4, 0x1c1a18); rect(ctx, 0, -3, 10, 4, 0x1c1a18);
  poly(ctx, pp([-11, -54], [11, -54], [14, -22], [-14, -22]), o.coat); rect(ctx, -11, -37, 22, 3, dark(o.coat, 0.3));
  rect(ctx, -16, -52, 6, 24, dark(o.coat, 0.12)); rect(ctx, 10, -52, 6, 24, dark(o.coat, 0.12)); circle(ctx, -13, -27, 3.2, 0xe4c1a2); circle(ctx, 13, -27, 3.2, 0xe4c1a2);
  circle(ctx, 0, -63, 9, 0xe4c1a2); rect(ctx, -3, -64, 2, 2, 0x2a211b); rect(ctx, 3, -64, 2, 2, 0x2a211b);
  if (o.hat === 'fedora') { ellipse(ctx, 0, -70, 15, 4, o.hatC); rect(ctx, -8, -81, 16, 12, o.hatC); rect(ctx, -8, -73, 16, 3, dark(o.hatC, 0.4)); }
  else if (o.hat === 'cap') { rect(ctx, -9, -74, 18, 6, o.hatC); rect(ctx, 3, -70, 10, 3, o.hatC); }
  else { rect(ctx, -9, -73, 18, 6, o.hatC); rect(ctx, -9, -68, 3, 8, o.hatC); }
  if (o.item === 'paper') { ctx.save(); ctx.translate(18, -34); ctx.rotate(-0.2); rect(ctx, -9, -12, 18, 24, 0xe9e2cc); rect(ctx, -6, -8, 12, 2, 0x77715f); rect(ctx, -6, -3, 12, 2, 0x77715f); ctx.restore(); }
  if (o.item === 'bag') { rect(ctx, 14, -24, 12, 14, 0x8c3b3b); line(ctx, 17, -24, 18, -33, 0x5a2626, 2); }
  if (o.item === 'balloon') { line(ctx, 14, -28, 22, -80, 0xdddddd, 1); ellipse(ctx, 22, -90, 9, 11, 0xd9435d); rect(ctx, 20, -80, 4, 3, 0xd9435d); }
}
const PEOPLE = [
  { pants: 0x2f2b2a, coat: 0x8a6a45, hat: 'fedora', hatC: 0x4a3c2d, item: 'paper' },
  { pants: 0x3a2f35, coat: 0xa8333a, hat: 'beret', hatC: 0x24324a, item: 'bag' },
  { pants: 0x2e4157, coat: 0xe0b83a, hat: 'cap', hatC: 0x3a5a8c, item: 'balloon' }
];

// ===================================================================== class ===
export class HomeCityRenderer {
  constructor(scene) {
    this.scene = scene; this.uid = ++instances; this.destroyed = false;
    this.buildingArt = new Map(); this.routeGraphics = null; this.hl = null; this.prompt = null;
    this.keys = new Set(); this.anchors = new Map(); this.lights = []; this.smokeSpots = []; this.perches = [];
    this.pigeons = []; this.walkers = []; this.ghost = null; this.hoverId = null; this.selectedId = null;
    this.origin = scene.project(0, 0); this.paths = new Set();
    for (const b of scene.buildings) for (let y = b.door.y; y < scene.rows && !this.isRoad(b.door.x, y); y++) this.paths.add(scene.cellKey(b.door.x, y));
  }

  // ------------------------------------------------------------- basics ---
  has(key) { return !!this.scene?.textures?.exists(key); }
  pt(x, y, z = 0) { const p = this.scene.project(x, y); return { x: p.x, y: p.y - z }; }
  P(axis, u, f, z) { return axis === 'x' ? this.pt(u, f, z) : this.pt(f, u, z); }
  faceP(axis, fixed, u1, u2, low, high) { return [this.P(axis, u1, fixed, low), this.P(axis, u2, fixed, low), this.P(axis, u2, fixed, high), this.P(axis, u1, fixed, high)]; }
  face(ctx, axis, fixed, u1, u2, low, high, color, stroke = color) { poly(ctx, this.faceP(axis, fixed, u1, u2, low, high), color, stroke); }
  bake(name, w, h, draw, tx = 0, ty = 0) {
    const key = `hc${this.uid}_${name}`, tex = this.scene.textures.createCanvas(key, Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
    if (!tex) return null;
    const ctx = tex.getContext(); ctx.save(); ctx.translate(-tx, -ty); draw(ctx); ctx.restore(); tex.refresh();
    this.keys.add(key); return key;
  }
  bakeSprite(name, w, h, ax, ay, draw) { const key = this.bake(name, w, h, draw, -ax, -ay); if (key) this.anchors.set(key, [ax / w, ay / h]); return key; }
  afterFonts(fn) {
    const run = () => { if (!this.destroyed && this.scene) fn(); };
    const fonts = typeof document !== 'undefined' ? document.fonts : null;
    if (!fonts?.load) return run();
    Promise.all([fonts.load('16px SpecialElite'), fonts.load('16px PressStart2P')]).then(run, run);
  }
  isRoad(x, y) { return (x >= 9 && x <= 11) || (y >= 8 && y <= 11) || (y >= 18 && y <= 19) || (x >= 1 && x <= 2); }
  isSidewalk(x, y) { return [0, 3, 8, 12].includes(x) || [7, 12, 17, 20].includes(y); }
  isPlaza(x, y) { return x >= 13 && x <= 17 && y >= 8 && y <= 11; }
  kind(x, y) {
    const s = this.scene, out = x < 0 || y < 0 || x >= s.cols || y >= s.rows;
    if (this.isPlaza(x, y)) return 'plaza';
    if (this.isRoad(x, y)) return 'road';
    if (out) return 'outside';
    return this.isSidewalk(x, y) || this.paths.has(s.cellKey(x, y)) ? 'walk' : 'grass';
  }
  outsideDist(x, y) { const s = this.scene; return Math.max(0, -x, -y, x - (s.cols - 1), y - (s.rows - 1)); }

  // ------------------------------------------------------------- ground ---
  drawGround() {
    const s = this.scene, cw = 825, ch = 1000;
    for (let cy = 0; cy < WORLD_H; cy += ch) for (let cx = 0; cx < WORLD_W; cx += cw) {
      const key = this.bake(`ground_${cx}_${cy}`, cw, ch, ctx => this.paintGround(ctx, cx, cy, cw, ch), cx, cy);
      if (key) s.add.image(cx, cy, key).setOrigin(0, 0).setDepth(-1000);
    }
    this.routeGraphics = s.add.graphics().setDepth(-350);
    this.afterFonts(() => { for (const job of STREET_TEXTS) this.bakeFlatText(job); });
  }
  paintGround(ctx, cx, cy, cw, ch) {
    const s = this.scene, o = this.origin, R = 9;
    ctx.beginPath(); ctx.rect(cx, cy, cw, ch); ctx.clip();
    rect(ctx, cx, cy, cw, ch, '#141a12');
    ctx.save(); ctx.transform(HW, HH, -HW, HH, o.x, o.y);
    for (let y = -R; y < s.rows + R; y++) for (let x = -R; x < s.cols + R; x++) {
      const px = o.x + (x - y) * HW, py = o.y + (x + y) * HH;
      if (px + HW < cx || px - HW > cx + cw || py + HH < cy || py - HH > cy + ch) continue;
      this.paintTile(ctx, x, y);
    }
    this.paintDecals(ctx);
    ctx.restore();
  }
  texFill(ctx, key, x, y, rep = 4) {
    if (!this.has(key)) return false;
    const img = this.scene.textures.get(key).getSourceImage(), w = img.width, h = img.height;
    ctx.drawImage(img, (((x % rep) + rep) % rep) * (w / rep), (((y % rep) + rep) % rep) * (h / rep), w / rep, h / rep, x - 0.51, y - 0.51, 1.02, 1.02);
    return true;
  }
  paintTile(ctx, x, y) {
    const k = this.kind(x, y), n = hash(x, y), d = this.outsideDist(x, y);
    const fill = c => rect(ctx, x - 0.51, y - 0.51, 1.02, 1.02, c);
    const spot = (u, v, r, c, a = 1) => rect(ctx, x - 0.5 + u - r, y - 0.5 + v - r, r * 2, r * 2, css(c, a));
    const stroke = (a, b, c, d2, color, w) => { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x - 0.5 + a, y - 0.5 + b); ctx.lineTo(x - 0.5 + c, y - 0.5 + d2); ctx.stroke(); };
    if (k === 'road') {
      if (!this.texFill(ctx, 'hc_tex_road', x, y)) fill(mix(0x4a4f4b, 0x5c615a, n));
      if (hash(x, y, 2) > 0.78) rect(ctx, x - 0.4 + hash(x, y, 8) * 0.3, y - 0.4 + hash(y, x, 9) * 0.3, 0.35, 0.28, 'rgba(20,22,20,.16)');
      if (hash(x, y, 5) > 0.8) { const a = hash(x, y, 6), b = hash(x, y, 7); stroke(a, 0.05, a + 0.2, 0.4, 'rgba(18,20,18,.5)', 0.012); stroke(a + 0.2, 0.4, b, 0.95, 'rgba(18,20,18,.5)', 0.012); }
      for (let i = 0; i < 5; i++) spot(hash(x, i, 3), hash(i, y, 4), 0.012, 0xa4a89c, 0.35);
    } else if (k === 'walk') {
      const isPath = this.paths.has(this.scene.cellKey(x, y)) && !this.isSidewalk(x, y);
      if (!this.texFill(ctx, 'hc_tex_sidewalk', x, y)) fill(mix(0x9d937b, 0xb3a98f, n));
      if (isPath) {
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const v = hash(x * 3 + c, y * 3 + r, 1); rect(ctx, x - 0.5 + c / 3 + 0.02, y - 0.5 + r / 3 + 0.02, 0.29, 0.29, v > 0.65 ? 0xb8ad93 : v > 0.3 ? 0xaca187 : 0x9b917a); }
      } else {
        for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) rect(ctx, x - 0.5 + c / 2, y - 0.5 + r / 2, 0.5, 0.5, css(0xffffff, hash(x * 2 + c, y * 2 + r, 2) * 0.09));
        ctx.strokeStyle = 'rgba(70,60,45,.26)'; ctx.lineWidth = 0.016; ctx.strokeRect(x - 0.5, y - 0.5, 1, 1);
        stroke(0.5, 0, 0.5, 1, 'rgba(70,60,45,.2)', 0.012); stroke(0, 0.5, 1, 0.5, 'rgba(70,60,45,.2)', 0.012);
      }
      if (hash(x, y, 11) > 0.96) spot(hash(x, y, 12), hash(y, x, 13), 0.025, 0x4b3f3a, 0.55);
      if (hash(x, y, 14) > 0.9) spot(hash(x, y, 15), hash(y, x, 16), 0.022, [0xc9822f, 0xd8b04a, 0x8a5a2b][Math.floor(hash(x, y, 17) * 3)], 0.8);
    } else if (k === 'plaza') {
      if (!this.texFill(ctx, 'hc_tex_plaza', x, y)) {
        fill(0x8f846c);
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const v = hash(x * 4 + c, y * 4 + r, 1); rect(ctx, x - 0.5 + c / 4 + 0.012, y - 0.5 + r / 4 + 0.012, 0.226, 0.226, v > 0.66 ? 0xb9ae94 : v > 0.33 ? 0xada28a : 0x9f9580); }
      }
    } else {
      if (!this.texFill(ctx, 'hc_tex_grass', x, y)) fill(mix(0x62724c, 0x80905f, hash(Math.floor(x / 2), Math.floor(y / 2), 3) * 0.6 + n * 0.4));
      ctx.lineWidth = 0.016;
      for (let i = 0; i < 9; i++) {
        const u = hash(x, y, i + 10), v = hash(y, x, i + 20), dk = hash(x + i, y, 30) > 0.5;
        stroke(u, v, u - 0.07, v - 0.07 + (hash(i, x, 4) - 0.5) * 0.04, css(dk ? 0x4d5d3c : 0x93a86c, 0.75), 0.016);
      }
      if (k === 'grass' && hash(x, y, 7) > 0.88) { const c = [0xe8d27a, 0xe58aa0, 0xf2f2e6, 0x9ab8e6][Math.floor(hash(x, y, 8) * 4)]; spot(hash(x, y, 9), hash(y, x, 9), 0.022, c); spot(hash(x, y, 9) + 0.05, hash(y, x, 9) + 0.03, 0.018, c); }
      if (hash(x, y, 18) > 0.93) spot(hash(x, y, 19), hash(y, x, 19), 0.03, 0x8f8f86, 0.8);
    }
    if (d) fill(css(0x060906, Math.min(0.82, 0.17 * d)));
  }
  paintDecals(ctx) {
    const s = this.scene, o = this.origin;
    const strip = (x, y, dx, dy, w, c) => {
      const px = dx === 1 ? x + 0.5 - w : dx === -1 ? x - 0.5 : x - 0.5, py = dy === 1 ? y + 0.5 - w : dy === -1 ? y - 0.5 : y - 0.5;
      rect(ctx, px, py, dx ? w : 1, dy ? w : 1, c);
      rect(ctx, dx === 1 ? x + 0.5 : dx === -1 ? x - 0.5 - 0.08 : x - 0.5, dy === 1 ? y + 0.5 : dy === -1 ? y - 0.5 - 0.08 : y - 0.5, dx ? 0.08 : 1, dy ? 0.08 : 1, 'rgba(10,12,10,.22)');
    };
    for (let y = 0; y < s.rows; y++) for (let x = 0; x < s.cols; x++) {
      const k = this.kind(x, y); if (k !== 'walk' && k !== 'plaza') continue;
      for (const [dx, dy] of DIRS) { const nk = this.kind(x + dx, y + dy); if ((k === 'walk' && nk === 'road') || (k === 'plaza' && nk !== 'plaza')) strip(x, y, dx, dy, k === 'plaza' ? 0.14 : 0.1, k === 'plaza' ? 0xc8bda2 : 0xd6cdb4); }
    }
    ctx.lineCap = 'butt';
    const dash = (u1, v1, u2, v2, c, w) => { ctx.setLineDash([0.42, 0.5]); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(u1, v1); ctx.lineTo(u2, v2); ctx.stroke(); ctx.setLineDash([]); };
    const solid = (u1, v1, u2, v2, c, w) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(u1, v1); ctx.lineTo(u2, v2); ctx.stroke(); };
    const Y = 'rgba(224,186,70,.75)', W = 'rgba(232,228,212,.7)';
    for (const x of [10, 1.5]) for (const [a, b] of [[-9, 6.4], [12.6, 16.4], [20.6, 31]]) dash(x, a, x, b, Y, 0.05);
    for (const [a, b] of [[-9, 0.4], [3.7, 7.3], [18, 34]]) { solid(a, 9.45, b, 9.45, Y, 0.035); solid(a, 9.56, b, 9.56, Y, 0.035); }
    for (const [a, b] of [[-9, 0.4], [3.7, 7.3], [12.7, 34]]) dash(a, 18.5, b, 18.5, W, 0.045);
    const zebraV = (u0, u1, v) => { for (let u = u0; u < u1 - 0.1; u += 0.5) rect(ctx, u, v - 0.38, 0.26, 0.76, W); };
    const zebraU = (v0, v1, u) => { for (let v = v0; v < v1 - 0.1; v += 0.5) rect(ctx, u - 0.38, v, 0.76, 0.26, W); };
    for (const v of [7, 12, 17, 20]) { zebraV(8.6, 11.4, v); zebraV(0.6, 2.4, v); }
    for (const u of [3, 8, 12, 18]) zebraU(7.6, 11.4, u);
    for (const u of [3, 8, 12]) zebraU(17.6, 19.4, u);
    for (const [u, v] of [[10, 4], [10, 15], [5, 10], [21, 9.2]]) {
      circle(ctx, u, v, 0.21, 0x2b2e2b); circle(ctx, u, v, 0.17, 0x474b47);
      solid(u - 0.15, v, u + 0.15, v, 'rgba(20,22,20,.8)', 0.02); solid(u, v - 0.15, u, v + 0.15, 'rgba(20,22,20,.8)', 0.02);
    }
    for (const [u, v, r] of [[9.2, 14, 0.5], [20, 10.8, 0.6], [6.4, 8.8, 0.4], [10.4, 2, 0.45]]) {
      ellipse(ctx, u, v, r, r * 0.7, 'rgba(120,152,176,.3)', 0.6); ellipse(ctx, u - r * 0.2, v - r * 0.2, r * 0.4, r * 0.22, 'rgba(225,238,246,.3)', 0.6);
    }
    ctx.strokeStyle = 'rgba(70,62,50,.5)'; ctx.lineWidth = 0.13; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(15, 9.5, 1.05, 0, Math.PI * 2); ctx.stroke(); solid(15.75, 10.25, 16.55, 11.05, 'rgba(70,62,50,.5)', 0.2);
    ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.beginPath(); ctx.arc(15, 9.5, 1.0, 0, Math.PI * 2); ctx.fill();
    ctx.lineCap = 'butt';
  }
  bakeFlatText(job) {
    const s = this.scene, c = this.pt(job.u, job.v), o = this.origin;
    const key = this.bake(`txt_${job.t.replace(/\W/g, '')}`, 560, 300, ctx => {
      ctx.save(); ctx.transform(HW, HH, -HW, HH, o.x, o.y); ctx.translate(job.u, job.v);
      if (job.rot === 'v') ctx.rotate(-Math.PI / 2);
      ctx.scale(1 / 64, 1 / 64); ctx.font = `${job.size}px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(232,224,190,.5)'; ctx.fillText(job.t, 0, 0); ctx.restore();
    }, c.x - 280, c.y - 150);
    if (key) s.add.image(c.x - 280, c.y - 150, key).setOrigin(0, 0).setDepth(-900);
  }

  // ---------------------------------------------------------- buildings ---
  drawBuildings() {
    const s = this.scene;
    this.hl = s.add.graphics().setDepth(9000);
    for (const b of s.buildings) {
      const art = { label: null, marker: null, plaque: null, hull: null, height: 120 };
      this.buildingArt.set(b.id, art);
      if (b.id === 'cemetery') this.drawCemetery(b, art); else this.drawHouse(b, art);
      this.makeLabel(b, art);
    }
  }
  hookBuilding(obj, id, localPts) {
    obj.setInteractive(new Phaser.Geom.Polygon(localPts), Phaser.Geom.Polygon.Contains).setData('buildingId', id);
    if (obj.input) obj.input.cursor = 'pointer';
    obj.on('pointerover', () => this.setHover(id)); obj.on('pointerout', () => this.setHover(null));
  }
  placeSprite(b, art, key) {
    const s = this.scene, cfg = BUILDING_SPRITE_TWEAKS[b.id] || {}, right = b.x + b.w - 1, front = b.y + b.h - 1;
    const c = this.pt(right + 0.5, front + 0.5, 0), sc = cfg.scale || 1;
    const img = s.add.image(c.x + (cfg.dx || 0), c.y + (cfg.dy || 0), key).setOrigin(0.5, 1).setScale(sc).setDepth((b.x + b.y) * 100 + 50);
    art.height = cfg.height || art.height;
    const H = art.height;
    art.hull = [this.pt(b.x - 0.5, b.y - 0.5, H), this.pt(right + 0.5, b.y - 0.5, H), this.pt(right + 0.5, b.y - 0.5, 0), this.pt(right + 0.5, front + 0.5, 0), this.pt(b.x - 0.5, front + 0.5, 0), this.pt(b.x - 0.5, front + 0.5, H)];
    const tlx = img.x - img.displayWidth * 0.5, tly = img.y - img.displayHeight;
    this.hookBuilding(img, b.id, art.hull.map(q => ({ x: (q.x - tlx) / sc, y: (q.y - tly) / sc })));
  }
  bakeShadow(b) {
    const right = b.x + b.w - 1, front = b.y + b.h - 1;
    const pts = [this.pt(b.x - 0.3, b.y - 0.2), this.pt(right + 1.4, b.y - 0.05), this.pt(right + 1.4, front + 1.0), this.pt(b.x - 0.3, front + 1.0)];
    const xs = pts.map(q => q.x), ys = pts.map(q => q.y), left = Math.min(...xs) - 4, top = Math.min(...ys) - 4;
    const key = this.bake(`shadow_${b.id}`, Math.max(...xs) - left + 4, Math.max(...ys) - top + 4, ctx => poly(ctx, pts, 'rgba(14,20,12,.34)', null), left, top);
    if (key) this.scene.add.image(left, top, key).setOrigin(0, 0).setDepth(-700);
  }
  drawHouse(b, art) {
    const s = this.scene, p = PALETTES[b.id], right = b.x + b.w - 1, front = b.y + b.h - 1, H = p.height;
    art.height = H;
    art.hull = [this.pt(b.x - 0.5, b.y - 0.5, H), this.pt(right + 0.5, b.y - 0.5, H), this.pt(right + 0.5, b.y - 0.5, 0), this.pt(right + 0.5, front + 0.5, 0), this.pt(b.x - 0.5, front + 0.5, 0), this.pt(b.x - 0.5, front + 0.5, H)];
    this.bakeShadow(b);
    const spriteKey = `hc_bld_${b.id}`;
    if (this.has(spriteKey)) { this.placeSprite(b, art, spriteKey); return; }
    for (let y = b.y; y <= front; y++) for (let x = b.x; x <= right; x++) {
      const t = this.bakeTile(b, p, x, y); if (!t.key) continue;
      const img = s.add.image(t.left, t.top, t.key).setOrigin(0, 0).setDepth((x + y) * 100);
      const roof = s.diamond(x, y, H), base = s.diamond(x, y);
      this.hookBuilding(img, b.id, [roof[0], roof[1], base[1], base[2], base[3], roof[3]].map(q => ({ x: q.x - t.left, y: q.y - t.top })));
    }
    this.afterFonts(() => this.bakeBanner(b, p.sign, 100, 2.2));
    this.registerBlade(b, p);
  }
  registerBlade(b, p) {
    const right = b.x + b.w - 1, front = b.y + b.h - 1, a = this.pt(right + 0.5, front + 0.5, 84);
    if (p.blade === 'eye') this.lights.push({ x: a.x + 34, y: a.y + 36, r: 0.8, a: 0.35, c: 0xffc866 });
  }
  bakeTile(b, p, x, y) {
    const right = b.x + b.w - 1, front = b.y + b.h - 1, H = p.height, c = this.scene.project(x, y);
    const feats = (p.features || []).filter(f => b.x + f.t[0] === x && b.y + f.t[1] === y);
    const padX = x === right || y === front || feats.length ? 64 : 10, padTop = feats.length ? 130 : 12, padBot = 26;
    const left = c.x - HW - padX, top = c.y - HH - H - padTop, w = 2 * (HW + padX), h = HH + H + padTop + HH + padBot;
    const key = this.bake(`b_${b.id}_${x}_${y}`, w, h, ctx => this.paintTile2(ctx, b, p, x, y, feats), left, top);
    return { key, left, top };
  }
  paintTile2(ctx, b, p, x, y, feats) {
    const right = b.x + b.w - 1, front = b.y + b.h - 1, H = p.height;
    if (x === right) this.rightFace(ctx, b, p, y, right + 0.5);
    if (y === front) this.frontFace(ctx, b, p, x, front + 0.5);
    this.roofTile(ctx, b, p, x, y, front, right, H);
    for (const f of feats) this.feature(ctx, f, x, y, H);
    if (x === right && y === front) this.cornerSign(ctx, p, right + 0.5, front + 0.5);
  }
  wallTexture(ctx, axis, fixed, u1, u2, H, style, seed) {
    const Pz = (u, z) => this.P(axis, u, fixed, z);
    if (style === 'brick' || style === 'stone') {
      const rowH = style === 'brick' ? 8 : 15, step = style === 'brick' ? 0.22 : 0.5; let r = 0;
      for (let z = rowH; z < H; z += rowH, r++) {
        const a = Pz(u1, z), c = Pz(u2, z); line(ctx, a.x, a.y, c.x, c.y, 'rgba(40,28,18,.16)');
        for (let k = 0; ; k++) {
          const u = u1 + step * (k + (r % 2) * 0.5); if (u >= u2 - 0.01) break; if (u <= u1 + 0.01) continue;
          const a2 = Pz(u, z), b2 = Pz(u, z - rowH); line(ctx, a2.x, a2.y, b2.x, b2.y, 'rgba(40,28,18,.1)');
        }
        if (style === 'stone' && hash(r, seed, 3) > 0.6) { const q = this.faceP(axis, fixed, u1 + 0.1, u1 + 0.1 + step, z - rowH, z); poly(ctx, q, 'rgba(255,255,255,.06)', null); }
      }
    } else if (style === 'boards') {
      for (let z = 6; z < H; z += 7) { const a = Pz(u1, z), c = Pz(u2, z); line(ctx, a.x, a.y, c.x, c.y, 'rgba(0,0,0,.2)'); line(ctx, a.x, a.y + 1, c.x, c.y + 1, 'rgba(255,255,255,.07)'); }
    } else {
      for (let i = 0; i < 30; i++) { const a = Pz(u1 + hash(seed, i, 1) * (u2 - u1), hash(i, seed, 2) * H); rect(ctx, a.x, a.y, 2, 2, hash(i, seed, 3) > 0.5 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)'); }
      const st = this.faceP(axis, fixed, u1 + 0.3, u1 + 0.38, H - 30, H - 14); poly(ctx, st, 'rgba(0,0,0,.06)', null);
    }
  }
  wall(ctx, axis, fixed, u1, u2, H, base, p, seed) {
    const pts = this.faceP(axis, fixed, u1, u2, 0, H); poly(ctx, pts, base);
    ctx.save(); pathOf(ctx, pts); ctx.clip(); this.wallTexture(ctx, axis, fixed, u1, u2, H, p.style, seed);
    const [y0, y1] = yRange(pts), x0 = Math.min(...pts.map(q => q.x));
    ctx.fillStyle = vgrad(ctx, y0, y1, [[0, 'rgba(255,255,255,.07)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.22)']]); ctx.fillRect(x0 - 2, y0 - 2, 140, y1 - y0 + 4);
    ctx.restore();
  }
  cornice(ctx, axis, fixed, u1, u2, H, p) {
    this.face(ctx, axis, fixed, u1, u2, H - 26, H - 14, 'rgba(0,0,0,.16)', null);
    this.face(ctx, axis, fixed + 0.07, u1 - 0.03, u2 + 0.03, H - 14, H - 3, p.trim); this.face(ctx, axis, fixed + 0.07, u1 - 0.03, u2 + 0.03, H - 3, H, light(p.trim, 0.3));
  }
  window(ctx, axis, fixed, u, low, w, h, p, o = {}) {
    const F = (a, c, l, hh, color, st = null) => this.face(ctx, axis, fixed, a, c, l, hh, color, st), hw = w / 2;
    F(u - hw - 0.04, u + hw + 0.04, low - 4, low + h + 4, p.trim);
    const pts = this.faceP(axis, fixed, u - hw, u + hw, low, low + h), [y0, y1] = yRange(pts);
    poly(ctx, pts, o.lit ? vgrad(ctx, y0, y1, [[0, 0xf6dc9a], [1, 0xc58f4b]]) : vgrad(ctx, y0, y1, [[0, light(p.glass, 0.28)], [1, dark(p.glass, 0.25)]]), null);
    if (o.blinds) for (let z = low + h - 5; z > low + 4; z -= 6) F(u - hw, u + hw, z, z + 2.5, 'rgba(235,225,200,.5)');
    poly(ctx, [this.P(axis, u - hw * 0.2, fixed, low + h), this.P(axis, u + hw * 0.15, fixed, low + h), this.P(axis, u - hw * 0.35, fixed, low), this.P(axis, u - hw * 0.7, fixed, low)], 'rgba(255,255,255,.12)', null);
    F(u - 0.017, u + 0.017, low, low + h, p.trim); F(u - hw, u + hw, low + h * 0.48, low + h * 0.48 + 3, p.trim);
    F(u - hw - 0.07, u + hw + 0.07, low - 7, low - 3, light(p.trim, 0.2)); F(u - hw - 0.07, u + hw + 0.07, low - 12, low - 7, 'rgba(0,0,0,.16)');
    if (o.shutters) { F(u - hw - 0.2, u - hw - 0.05, low - 2, low + h + 2, o.shutters); F(u + hw + 0.05, u + hw + 0.2, low - 2, low + h + 2, o.shutters); }
    if (o.box) {
      this.face(ctx, axis, fixed + 0.04, u - hw - 0.04, u + hw + 0.04, low - 14, low - 6, 0x6d4f35);
      for (let i = 0; i <= 5; i++) { const q = this.P(axis, u - hw + (i * w) / 5, fixed + 0.04, low - 12); circle(ctx, q.x, q.y - 3, 4, i % 2 ? 0x4d7a45 : 0x3c6638); if (i % 2) circle(ctx, q.x, q.y - 7, 2, 0xd9627d); }
    }
    if (o.lit) { const c = this.P(axis, u, fixed, low + h / 2); this.lights.push({ x: c.x, y: c.y, r: 0.55, a: 0.2, c: 0xffc866 }); }
  }
  awning(ctx, axis, fixed, u1, u2, zTop, p) {
    const n = 6, out = 0.34, [c1, c2] = p.awning, A = (u, f, z) => this.P(axis, u, f, z);
    this.face(ctx, axis, fixed, u1, u2, zTop - 32, zTop - 15, 'rgba(0,0,0,.14)', null);
    for (let i = 0; i < n; i++) {
      const a = u1 + ((u2 - u1) * i) / n, c = u1 + ((u2 - u1) * (i + 1)) / n, color = i % 2 ? c2 : c1;
      poly(ctx, [A(a, fixed, zTop), A(c, fixed, zTop), A(c, fixed + out, zTop - 15), A(a, fixed + out, zTop - 15)], color);
      poly(ctx, [A(a, fixed + out, zTop - 15), A(c, fixed + out, zTop - 15), A(c, fixed + out, zTop - 21), A(a, fixed + out, zTop - 21)], dark(color, 0.2), null);
    }
  }
  door(ctx, b, p, x, fy) {
    const F = (...a) => this.face(ctx, 'x', fy, ...a), P3 = (u, f, z) => this.pt(u, f, z);
    F(x - 0.3, x + 0.3, 0, 68, p.trim); F(x - 0.23, x + 0.23, 0, 64, dark(p.door, 0.35), null); F(x - 0.21, x + 0.21, 0, 62, p.door, null);
    F(x - 0.16, x - 0.02, 6, 30, dark(p.door, 0.25), null); F(x + 0.02, x + 0.16, 6, 30, dark(p.door, 0.25), null);
    const gp = this.faceP('x', fy, x - 0.16, x + 0.16, 36, 58), [y0, y1] = yRange(gp);
    poly(ctx, gp, vgrad(ctx, y0, y1, [[0, light(p.glass, 0.35)], [1, dark(p.glass, 0.1)]]), null); F(x - 0.006, x + 0.006, 36, 58, p.trim, null);
    const k = P3(x + 0.13, fy, 30); circle(ctx, k.x, k.y, 2.2, p.accent); F(x - 0.46, x + 0.46, 70, 78, p.accent);
    poly(ctx, [P3(x - 0.34, fy, 5), P3(x + 0.34, fy, 5), P3(x + 0.34, fy + 0.3, 5), P3(x - 0.34, fy + 0.3, 5)], 0xcdbc98, 0xa89774);
    this.face(ctx, 'x', fy + 0.3, x - 0.34, x + 0.34, 0, 5, 0x9a8b6c);
    poly(ctx, [P3(x - 0.2, fy + 0.05, 5), P3(x + 0.2, fy + 0.05, 5), P3(x + 0.2, fy + 0.24, 5), P3(x - 0.2, fy + 0.24, 5)], 0x6b3f33, null);
    const l = this.pt(x, fy, 36); this.lights.push({ x: l.x, y: l.y, r: 0.45, a: 0.12, c: 0xffd9a0 });
  }
  frontFace(ctx, b, p, x, fy) {
    const H = p.height, F = (...a) => this.face(ctx, 'x', fy, ...a);
    this.wall(ctx, 'x', fy, x - 0.5, x + 0.5, H, p.wall, p, x * 7 + b.y);
    F(x - 0.5, x + 0.5, 0, 14, dark(p.wall, 0.42)); this.cornice(ctx, 'x', fy, x - 0.5, x + 0.5, H, p);
    if (p.pilasters) { F(x - 0.56, x - 0.44, 0, H - 14, light(p.wall, 0.22)); if (x === b.x + b.w - 1) F(x + 0.44, x + 0.56, 0, H - 14, light(p.wall, 0.22)); }
    if (x === b.door.x) this.door(ctx, b, p, x, fy);
    else {
      const lit = hash(x, b.y, b.id.length) < p.lit;
      if (p.shop) { this.window(ctx, 'x', fy, x, 20, 0.78, 46, p, { lit }); this.awning(ctx, 'x', fy, x - 0.5, x + 0.5, 76, p); }
      else this.window(ctx, 'x', fy, x, 38, 0.5, 36, p, { lit, blinds: p.blinds && lit, shutters: p.shutters });
    }
    if (H > 140) this.window(ctx, 'x', fy, x, 106, 0.44, 18, p, { lit: hash(x, 3, b.x) < p.lit });
  }
  rightFace(ctx, b, p, y, fx) {
    const H = p.height, F = (...a) => this.face(ctx, 'y', fx, ...a);
    this.wall(ctx, 'y', fx, y - 0.5, y + 0.5, H, p.shade, p, y * 11 + b.x);
    F(y - 0.5, y + 0.5, 0, 14, dark(p.wall, 0.55)); this.cornice(ctx, 'y', fx, y - 0.5, y + 0.5, H, p);
    if (p.pilasters) F(y - 0.56, y - 0.44, 0, H - 14, light(p.shade, 0.15));
    this.window(ctx, 'y', fx, y, 38, 0.52, 36, p, { lit: hash(y, b.x, 5) < p.lit, shutters: p.shutters, blinds: p.blinds });
    if (H > 140) this.window(ctx, 'y', fx, y, 106, 0.44, 18, p, { lit: hash(y, 7, b.x) < p.lit });
  }
  roofTile(ctx, b, p, x, y, front, right, H) {
    const roof = this.scene.diamond(x, y, H);
    poly(ctx, roof, p.roof);
    for (let i = 0; i < 14; i++) { const q = this.pt(x - 0.45 + hash(x, i, 1) * 0.9, y - 0.45 + hash(i, y, 2) * 0.9, H); rect(ctx, q.x, q.y, 2, 1.5, hash(i, x, 3) > 0.5 ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.22)'); }
    if (y === b.y) this.face(ctx, 'x', b.y - 0.5, x - 0.5, x + 0.5, H, H + 9, dark(p.trim, 0.3));
    if (x === b.x) this.face(ctx, 'y', b.x - 0.5, y - 0.5, y + 0.5, H, H + 9, dark(p.trim, 0.45));
    if (y === front) { this.face(ctx, 'x', front + 0.5, x - 0.5, x + 0.5, H, H + 9, p.trim); this.face(ctx, 'x', front + 0.53, x - 0.5, x + 0.5, H + 9, H + 11, light(p.trim, 0.3)); }
    if (x === right) { this.face(ctx, 'y', right + 0.5, y - 0.5, y + 0.5, H, H + 9, dark(p.trim, 0.12)); this.face(ctx, 'y', right + 0.53, y - 0.5, y + 0.5, H + 9, H + 11, p.trim); }
  }
  feature(ctx, f, x, y, H) {
    const c = this.pt(x, y, H), cx = c.x + (f.dx || 0), cy = c.y + (f.dy || 0);
    switch (f.k) {
      case 'chimney':
        isoBox(ctx, cx, cy, 0.2, 0.2, 0, 44, 0x3a2d28, 0x9a5b45, 0x764536, 0x2d231f);
        for (let z = 8; z < 44; z += 8) { const a = S(cx, cy, -0.2, 0.2, z), b = S(cx, cy, 0.2, 0.2, z); line(ctx, a.x, a.y, b.x, b.y, 'rgba(0,0,0,.18)'); }
        isoBox(ctx, cx, cy, 0.25, 0.25, 44, 50, 0x4a3b34, 0x6d5648, 0x544036);
        if (f.smoke) this.smokeSpots.push({ x: cx, y: cy - 56 });
        break;
      case 'vent': isoBox(ctx, cx, cy, 0.13, 0.13, 0, 12, 0x8e9690, 0x6f7873, 0x59615c, 0x3b423e); isoBox(ctx, cx, cy, 0.18, 0.18, 12, 16, 0x9aa29c, 0x7c847f, 0x666e69); break;
      case 'antenna':
        line(ctx, cx, cy, cx, cy - 92, 0x2d3430, 2);
        for (const [z, w] of [[88, 14], [76, 18], [64, 12]]) line(ctx, cx - w, cy - z, cx + w, cy - z, 0x2d3430, 2);
        line(ctx, cx, cy - 70, cx - 30, cy + 8, 'rgba(40,46,42,.6)'); line(ctx, cx, cy - 70, cx + 30, cy + 8, 'rgba(40,46,42,.6)'); circle(ctx, cx, cy - 94, 2.5, 0xe0463c);
        break;
      case 'dish':
        line(ctx, cx, cy, cx, cy - 30, 0x59615c, 4);
        ctx.save(); ctx.translate(cx, cy - 44); ctx.rotate(-0.5); ellipse(ctx, 0, 0, 30, 20, 0x5a6661); ellipse(ctx, 3, -1, 26, 16, 0xd6ddd6); ellipse(ctx, 5, -1, 18, 10, 0xaab5ae); ctx.restore();
        line(ctx, cx + 6, cy - 46, cx + 22, cy - 64, 0x3b423e, 2); circle(ctx, cx + 23, cy - 65, 3, 0xe0463c);
        break;
      case 'flag':
        line(ctx, cx, cy, cx, cy - 98, 0xcfcfbf, 3); poly(ctx, pp([cx, cy - 96], [cx + 38, cy - 91], [cx + 32, cy - 82], [cx + 40, cy - 72], [cx, cy - 77]), 0x2f4a82); circle(ctx, cx + 14, cy - 85, 3, 0xf2e6b0);
        break;
      case 'beacon':
        isoBox(ctx, cx, cy, 0.16, 0.16, 0, 8, 0x59616a, 0x454c55, 0x343a42); blob(ctx, cx, cy - 14, 9, 0x2f68c4); blob(ctx, cx - 3, cy - 17, 3, 0xbcd8ff);
        this.lights.push({ x: cx, y: cy - 14, r: 0.9, a: 0.4, c: 0x5c9bff, blink: true });
        break;
      case 'loft': {
        isoBox(ctx, cx, cy, 0.42, 0.34, 0, 36, 0x9c7a55, 0x8a6a49, 0x6b5039, 0x3d2d20);
        for (let z = 7; z < 36; z += 7) { const a = S(cx, cy, -0.42, 0.34, z), b = S(cx, cy, 0.42, 0.34, z); line(ctx, a.x, a.y, b.x, b.y, 'rgba(0,0,0,.18)'); }
        for (const u of [-0.24, 0, 0.24]) { const q = S(cx, cy, u, 0.34, 14); rect(ctx, q.x - 4, q.y - 10, 8, 11, 0x201710); }
        const r0 = S(cx, cy, -0.36, 0.44, 8), r1 = S(cx, cy, 0.36, 0.44, 8); line(ctx, r0.x, r0.y, r1.x, r1.y, 0x4a3828, 3);
        const apex = S(cx, cy, 0, 0, 64), A = (u, v) => S(cx, cy, u, v, 36);
        poly(ctx, [A(-0.52, 0.42), A(0.52, 0.42), apex], 0x7a3b32, 0x3d1c18); poly(ctx, [A(0.52, -0.42), A(0.52, 0.42), apex], 0x5d2c26, 0x3d1c18);
        line(ctx, apex.x, apex.y, apex.x, apex.y - 14, 0x2d2723, 2); poly(ctx, pp([apex.x, apex.y - 14], [apex.x + 9, apex.y - 11], [apex.x, apex.y - 8]), 0x2d2723);
        this.perches.push({ x: cx + 38, y: cy + 12 - 36 }, { x: cx - 30, y: cy + 22 - 30 });
        break;
      }
    }
  }
  cornerSign(ctx, p, fx, fy) {
    const a = this.pt(fx, fy, 84), tip = { x: a.x + 40, y: a.y + 16 };
    line(ctx, a.x, a.y, tip.x, tip.y, 0x2a2f2b, 3); line(ctx, a.x, a.y + 16, a.x + 24, a.y + 14, 0x2a2f2b, 2);
    line(ctx, tip.x - 14, tip.y, tip.x - 14, tip.y + 10, 0x2a2f2b, 1.5); line(ctx, tip.x + 2, tip.y + 1, tip.x + 2, tip.y + 10, 0x2a2f2b, 1.5);
    const px = tip.x - 20, py = tip.y + 10;
    rect(ctx, px - 1, py - 1, 40, 38, 0x20241f); rect(ctx, px, py, 38, 36, mix(p.glass, 0x2a2018, 0.5)); ctx.strokeStyle = css(p.accent); ctx.lineWidth = 1.5; ctx.strokeRect(px + 2, py + 2, 34, 32);
    this.icon(ctx, p.blade, px + 19, py + 18);
  }
  icon(ctx, kind, x, y) {
    ctx.save(); ctx.translate(x, y);
    if (kind === 'eye') {
      ctx.fillStyle = css(0xf4ecd2); ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(0, -13, 14, 0); ctx.quadraticCurveTo(0, 13, -14, 0); ctx.fill();
      circle(ctx, 0, 0, 6, 0x2f6f78); circle(ctx, 0, 0, 3, 0x10181a); circle(ctx, -1.5, -1.5, 1.2, 0xffffff);
    } else if (kind === 'lens') {
      ctx.strokeStyle = css(0xddd28e); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-3, -3, 9, 0, Math.PI * 2); ctx.stroke(); line(ctx, 4, 4, 12, 12, 0xddd28e, 4); circle(ctx, -6, -6, 2, 0xffffff);
    } else if (kind === 'mug') {
      rect(ctx, -9, -8, 15, 17, 0xe7b85c); rect(ctx, -9, -8, 15, 4, 0xfff3d0); circle(ctx, -6, -9, 3, 0xfff3d0); circle(ctx, 1, -10, 3.5, 0xfff3d0);
      ctx.strokeStyle = css(0xe7b85c); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(8, 0, 5, -1.4, 1.4); ctx.stroke();
    } else if (kind === 'badge') {
      ctx.fillStyle = css(0xe0c070); ctx.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 6 : 13, a = -Math.PI / 2 + (i * Math.PI) / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill(); circle(ctx, 0, 0, 4, 0x2f4a82);
    } else {
      ellipse(ctx, 0, 2, 10, 7, 0xcfd3d6); circle(ctx, 9, -3, 5, 0xb7bcc0); poly(ctx, pp([13, -3], [18, -1], [13, -1]), 0xe0983c); poly(ctx, pp([-9, 0], [-17, 6], [-9, 6]), 0xa9aeb3); circle(ctx, 10, -4, 1, 0x101010);
    }
    ctx.restore();
  }
  bakeBanner(b, text, zTop, widthCells) {
    const s = this.scene, front = b.y + b.h - 1, fy = front + 0.5, u0 = b.door.x - widthCells / 2, A = this.pt(u0, fy + 0.03, zTop);
    const wpx = widthCells * HW, w = Math.ceil(wpx + 30), h = Math.ceil(wpx * 0.5 + 52), left = A.x - 12, top = A.y - 12;
    const key = this.bake(`banner_${b.id}`, w, h, ctx => {
      ctx.save(); ctx.translate(A.x, A.y); ctx.transform(1, 0.5, 0, 1, 0, 0);
      rect(ctx, 1, 3, wpx, 20, 'rgba(0,0,0,.25)'); rect(ctx, 0, 0, wpx, 20, 0x2e231b); ctx.strokeStyle = css(0xd7b16b); ctx.lineWidth = 1.5; ctx.strokeRect(1.5, 1.5, wpx - 3, 17);
      let size = 13; ctx.font = `${size}px ${FONT_UI}`;
      while (ctx.measureText(text).width > wpx - 16 && size > 8) { size -= 1; ctx.font = `${size}px ${FONT_UI}`; }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = css(0xf1e2b6); ctx.fillText(text, wpx / 2, 11); ctx.restore();
    }, left, top);
    if (key) s.add.image(left, top, key).setOrigin(0, 0).setDepth((b.door.x + front) * 100 + 100.5);
  }
  makeLabel(b, art) {
    const s = this.scene, H = art.height + 24, c = this.pt(b.x + (b.w - 1) / 2, b.y + (b.h - 1) / 2, b.id === 'cemetery' ? 118 : H);
    art.plaque = s.add.graphics().setDepth(9999);
    art.label = s.add.text(c.x, c.y, b.name, { fontFamily: FONT_UI, fontSize: '22px', color: '#f6e7c1', padding: { x: 14, y: 8 } })
      .setOrigin(0.5).setDepth(10000).setInteractive({ useHandCursor: true }).setData('buildingId', b.id);
    art.label.on('pointerover', () => this.setHover(b.id)); art.label.on('pointerout', () => this.setHover(null));
    const door = this.pt(b.door.x, b.door.y);
    art.marker = s.add.ellipse(door.x, door.y, 56, 26, 0xe1c383, 0.45).setStrokeStyle(2, 0xf5dfa6, 0.5).setDepth(-400);
    this.paintLabel(b.id);
  }
  paintLabel(id) {
    const art = this.buildingArt.get(id); if (!art?.label?.active) return;
    const on = id === this.selectedId || id === this.hoverId, t = art.label, w = t.width, h = t.height, x = t.x - w / 2, y = t.y - h / 2, g = art.plaque;
    t.setColor(on ? '#fff0c4' : '#f6e7c1');
    g.clear(); g.fillStyle(0x000000, 0.28).fillRoundedRect(x + 3, y + 4, w, h, 8);
    g.fillStyle(on ? 0x6a5430 : 0x2b312b, 0.95).fillRoundedRect(x, y, w, h, 8); g.lineStyle(2, on ? 0xffd277 : 0xb89a58, 1).strokeRoundedRect(x, y, w, h, 8);
    g.fillStyle(on ? 0x6a5430 : 0x2b312b, 0.95).fillTriangle(t.x - 8, y + h - 1, t.x + 8, y + h - 1, t.x, y + h + 9);
    art.marker.setFillStyle(on ? 0xffdb80 : 0xe1c383, on ? 0.9 : 0.45);
  }
  refreshHull() {
    const g = this.hl; if (!g?.active) return; g.clear();
    for (const [id, strong] of [[this.hoverId, false], [this.selectedId, true]]) {
      const art = id ? this.buildingArt.get(id) : null; if (!art?.hull) continue;
      g.lineStyle(strong ? 9 : 6, 0xffd98a, strong ? 0.22 : 0.16).strokePoints(art.hull, true);
      g.lineStyle(3, 0xffe9b0, strong ? 0.95 : 0.7).strokePoints(art.hull, true);
    }
  }
  setHover(id) {
    if (this.destroyed || this.hoverId === id) return;
    const old = this.hoverId; this.hoverId = id;
    if (old) this.paintLabel(old); if (id) this.paintLabel(id); this.refreshHull();
  }
  selectBuilding(id = null) {
    this.selectedId = id; for (const key of this.buildingArt.keys()) this.paintLabel(key); this.refreshHull();
  }

  // ----------------------------------------------------------- cemetery ---
  drawCemetery(b, art) {
    const s = this.scene, left = b.x - 0.5, right = b.x + b.w - 0.5, back = b.y - 0.5, front = b.y + b.h - 0.5;
    art.height = 100;
    const hull = [this.pt(left, back, 100), this.pt(right, back, 100), this.pt(right, front, 0), this.pt(b.door.x, front + 0.45, 0), this.pt(left, front, 0)];
    art.hull = hull;
    const spriteKey = 'hc_bld_cemetery';
    if (this.has(spriteKey)) { this.placeSprite(b, art, spriteKey); return; }
    // ground + path
    const minX = this.pt(left, front).x - 40, minY = this.pt(left, back, 40).y - 30, maxX = this.pt(right, back).x + 40, maxY = this.pt(right, front).y + 50;
    const gk = this.bake('cem_ground', maxX - minX, maxY - minY, ctx => {
      poly(ctx, [this.pt(left, back), this.pt(right, back), this.pt(right, front), this.pt(left, front)], 0x4d5d45);
      for (let i = 0; i < 90; i++) { const q = this.pt(left + hash(i, 1, 51) * (right - left), back + hash(i, 2, 52) * (front - back)); rect(ctx, q.x, q.y, 3, 2, hash(i, 3, 53) > 0.5 ? 'rgba(130,160,100,.35)' : 'rgba(20,30,18,.3)'); }
      poly(ctx, [this.pt(b.door.x - 0.25, back + 0.4), this.pt(b.door.x + 0.25, back + 0.4), this.pt(b.door.x + 0.25, front + 0.45), this.pt(b.door.x - 0.25, front + 0.45)], 0xa29679);
      for (let i = 0; i < 24; i++) { const q = this.pt(b.door.x - 0.2 + hash(i, 4, 54) * 0.4, back + 0.5 + (i / 24) * (front - back)); rect(ctx, q.x, q.y, 5, 2, hash(i, 5, 55) > 0.5 ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.2)'); }
    }, minX, minY);
    if (gk) s.add.image(minX, minY, gk).setOrigin(0, 0).setDepth(-690);
    const fence = (axis, fixed, a, c, depth, name, pillarEnd) => {
      const pts = this.faceP(axis, fixed, a, c, 0, 100), xs = pts.map(q => q.x), ys = pts.map(q => q.y), l = Math.min(...xs) - 12, t = Math.min(...ys) - 12;
      const key = this.bake(`cem_${name}`, Math.max(...xs) - l + 12, Math.max(...ys) - t + 12, ctx => {
        this.face(ctx, axis, fixed, a, c, 0, 13, 0x757a6b);
        for (const z of [31, 58]) this.face(ctx, axis, fixed, a, c, z, z + 4, 0x333c39);
        for (let u = a + 0.1; u <= c + 0.001; u += 0.2) { this.face(ctx, axis, fixed, u - 0.018, u + 0.018, 13, 79, 0x303b37); poly(ctx, [this.P(axis, u - 0.035, fixed, 79), this.P(axis, u + 0.035, fixed, 79), this.P(axis, u, fixed, 90)], 0x303b37); }
        this.face(ctx, axis, fixed, a - 0.055, a + 0.055, 0, 91, 0x7c8170); if (pillarEnd) this.face(ctx, axis, fixed, c - 0.055, c + 0.055, 0, 91, 0x7c8170);
      }, l, t);
      if (key) s.add.image(l, t, key).setOrigin(0, 0).setDepth(depth);
    };
    for (let x = b.x; x < b.x + b.w; x++) {
      fence('x', back, x - 0.5, x + 0.5, (x + back) * 100, `back${x}`, x === b.x + b.w - 1);
      if (x === b.door.x) this.bakeGate(b, front); else fence('x', front, x - 0.5, x + 0.5, (x + front) * 100 + 10, `front${x}`, x === b.x + b.w - 1);
    }
    for (let y = b.y; y < b.y + b.h; y++) {
      fence('y', left, y - 0.5, y + 0.5, (left + y) * 100, `left${y}`, y === b.y + b.h - 1);
      fence('y', right, y - 0.5, y + 0.5, (right + y) * 100 + 10, `right${y}`, y === b.y + b.h - 1);
    }
    // graves
    [[0.45, 0.8], [1.6, 0.8], [2.8, 0.8], [0.45, 2.15], [1.6, 2.15], [2.8, 2.15]].forEach(([dx, dy], i) => {
      const gx = b.x + dx, gy = b.y + dy, key = this.bakeSprite(`grave${i}`, 80, 90, 40, 74, ctx => this.drawGrave(ctx, i));
      s.add.image(...Object.values(this.pt(gx, gy)), key).setOrigin(...this.anchors.get(key)).setDepth((gx + gy) * 100 + 5);
    });
    const tk = this.bakeSprite('deadtree', 180, 240, 90, 228, ctx => this.drawDeadTree(ctx));
    const tp = this.pt(b.x + 3.2, b.y + 3.1); s.add.image(tp.x, tp.y, tk).setOrigin(...this.anchors.get(tk)).setDepth((b.x + 3.2 + b.y + 3.1) * 100 + 6);
    const gh = this.bakeSprite('ghost', 60, 80, 30, 70, ctx => {
      ctx.fillStyle = 'rgba(240,244,250,.92)'; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.quadraticCurveTo(-22, -52, 0, -56); ctx.quadraticCurveTo(22, -52, 18, 0);
      ctx.lineTo(10, -8); ctx.lineTo(3, 0); ctx.lineTo(-4, -8); ctx.lineTo(-11, 0); ctx.closePath(); ctx.fill(); circle(ctx, -6, -34, 3, 0x1a1f2a); circle(ctx, 6, -34, 3, 0x1a1f2a); ellipse(ctx, 0, -25, 3, 4, 0x1a1f2a);
    });
    const gp = this.pt(b.x + 2.2, b.y + 1.5, 0);
    this.ghost = { sp: s.add.image(gp.x, gp.y, gh).setOrigin(...this.anchors.get(gh)).setDepth(7000).setAlpha(0.35), x: gp.x, y: gp.y };
    const zone = s.add.zone(Math.min(...hull.map(q => q.x)), Math.min(...hull.map(q => q.y)), 1, 1).setOrigin(0, 0).setDepth(9998);
    const zx = Math.min(...hull.map(q => q.x)), zy = Math.min(...hull.map(q => q.y)), zw = Math.max(...hull.map(q => q.x)) - zx, zh = Math.max(...hull.map(q => q.y)) - zy;
    zone.setSize(zw, zh); this.hookBuilding(zone, b.id, hull.map(q => ({ x: q.x - zx, y: q.y - zy })));
    this.afterFonts(() => this.bakeBanner(b, 'BLACKTHORN - NO REFUNDS', 150, 2.4));
  }
  bakeGate(b, front) {
    const s = this.scene, x = b.door.x, pts = this.faceP('x', front, x - 0.6, x + 0.6, 0, 125), xs = pts.map(q => q.x), ys = pts.map(q => q.y), l = Math.min(...xs) - 12, t = Math.min(...ys) - 12;
    const key = this.bake('cem_gate', Math.max(...xs) - l + 12, Math.max(...ys) - t + 12, ctx => {
      const F = (...a) => this.face(ctx, 'x', front, ...a);
      for (const u of [x - 0.52, x + 0.52]) F(u - 0.1, u + 0.1, 0, 113, 0x858a78);
      for (let u = x - 0.4; u <= x + 0.41; u += 0.16) { F(u - 0.025, u + 0.025, 3, 84, 0x303a35); poly(ctx, [this.P('x', u - 0.04, front, 84), this.P('x', u + 0.04, front, 84), this.P('x', u, front, 94)], 0x303a35); }
      F(x - 0.43, x + 0.43, 39, 44, 0x404a40); F(x - 0.43, x + 0.43, 82, 87, 0x404a40); F(x - 0.54, x + 0.54, 111, 120, 0x3e4a3b);
      for (const u of [x - 0.52, x + 0.52]) { const c = this.P('x', u, front, 122); circle(ctx, c.x, c.y, 5, 0x6f7a68); }
    }, l, t);
    if (key) s.add.image(l, t, key).setOrigin(0, 0).setDepth((x + front) * 100 + 25);
  }
  drawGrave(ctx, i) {
    shadow(ctx, 22, 8, 0.3); ellipse(ctx, 0, -2, 24, 7, 0x47543f);
    const stone = [0x8e9585, 0x7f8778, 0x9aa090][i % 3], dk = dark(stone, 0.25);
    if (i % 3 === 0) { rect(ctx, -14, -46, 28, 44, stone); ctx.fillStyle = css(stone); ctx.beginPath(); ctx.arc(0, -46, 14, Math.PI, 0); ctx.fill(); rect(ctx, 8, -42, 6, 40, dk); line(ctx, -6, -34, 7, -34, dk, 2); line(ctx, -5, -26, 6, -26, dk, 2); }
    else if (i % 3 === 1) { rect(ctx, -5, -64, 10, 62, stone); rect(ctx, -18, -50, 36, 9, stone); rect(ctx, 3, -62, 3, 60, dk); rect(ctx, -18, -44, 36, 3, dk); }
    else { poly(ctx, pp([-12, -2], [12, -2], [8, -58], [-8, -58]), stone); rect(ctx, 6, -56, 5, 52, dk); poly(ctx, pp([-8, -58], [8, -58], [0, -70]), light(stone, 0.1)); }
    for (let k = 0; k < 5; k++) rect(ctx, -12 + hash(k, i, 1) * 24, -40 + hash(i, k, 2) * 36, 3, 2, 'rgba(70,95,60,.5)');
  }
  drawDeadTree(ctx) {
    shadow(ctx, 36, 10); poly(ctx, pp([-9, 0], [9, 0], [5, -90], [-4, -90]), 0x3e342d);
    for (const [x1, y1, x2, y2, w] of [[0, -80, -34, -128, 6], [0, -90, 30, -138, 6], [-20, -104, -50, -112, 3], [18, -112, 48, -118, 3], [-30, -118, -34, -150, 3], [28, -126, 34, -160, 3], [0, -90, 4, -168, 5]]) line(ctx, x1, y1, x2, y2, 0x3e342d, w);
  }

  // -------------------------------------------------------------- props ---
  propKey(prop) {
    const v = Number.isInteger(prop.variant) ? prop.variant : Math.floor(hash(prop.x, prop.y, 9) * 3);
    if (prop.kind === 'car') return { name: `car_${prop.w > 1 ? 'x' : 'y'}`, v: v % 3 };
    if (prop.kind === 'tree') return { name: `tree_${v % 3}`, v: v % 3 };
    return { name: prop.kind, v };
  }
  bakeProp(name, v) {
    const cache = this.propCache ?? (this.propCache = new Map()), ck = `${name}:${v}`;
    if (cache.has(ck)) return cache.get(ck);
    let key = null;
    if (name.startsWith('tree_')) { const a = treeArt(Number(name.slice(5))); key = this.bakeSprite(name, a.w, a.h, a.ax, a.ay, a.draw); }
    else if (name.startsWith('car_')) key = this.bakeSprite(`${name}_${v}`, 300, 170, 150, 118, ctx => drawCar(ctx, name.endsWith('x') ? 'x' : 'y', CAR_COLORS[v]));
    else if (PROP_ART[name]) { const a = PROP_ART[name]; key = this.bakeSprite(name, a.w, a.h, a.ax, a.ay, a.draw); }
    cache.set(ck, key); return key;
  }
  drawProps() {
    const s = this.scene;
    s.props.forEach((prop, i) => {
      const w = prop.w || 1, h = prop.h || 1, cx = prop.x + (w - 1) / 2, cy = prop.y + (h - 1) / 2, c = this.pt(cx, cy), pk = this.propKey(prop);
      const ext = `hc_prop_${pk.name}`, depth = (prop.x + w - 1 + prop.y + h - 1) * 100 + 1;
      let img;
      if (this.has(ext)) { const t = PROP_SPRITE_TWEAKS[pk.name] || {}; img = s.add.image(c.x + (t.dx || 0), c.y + (t.dy || 0), ext).setOrigin(0.5, 1).setScale(t.scale || 1); }
      else { const key = this.bakeProp(pk.name, pk.v); if (!key) return; img = s.add.image(c.x, c.y, key).setOrigin(...this.anchors.get(key)); }
      img.setDepth(depth).setData('propIndex', i).setInteractive({ pixelPerfect: true, alphaTolerance: 40 });
      if (prop.kind === 'lamp') {
        this.lights.push({ x: c.x, y: c.y - 108, r: 1.3, a: 0.5, c: 0xffd28a, flicker: true }, { x: c.x, y: c.y + 2, r: 1, sx: 2.6, sy: 1.1, a: 0.2, c: 0xffd28a, ground: true });
        this.perches.push({ x: c.x, y: c.y - 146 });
      }
    });
    this.drawPerimeter();
  }
  drawPerimeter() {
    const s = this.scene;
    for (let y = -4; y < s.rows + 4; y++) for (let x = -4; x < s.cols + 4; x++) {
      const d = this.outsideDist(x, y); if (d < 1 || d > 3 || this.isRoad(x, y)) continue;
      if (hash(x, y, 41) > [0, 0.5, 0.38, 0.22][d]) continue;
      const c = this.pt(x, y); if (c.x < -80 || c.x > WORLD_W + 80 || c.y < -80 || c.y > WORLD_H + 120) continue;
      const v = Math.floor(hash(x, y, 44) * 3), tree = hash(x, y, 43) > 0.35, key = this.bakeProp(tree ? `tree_${v}` : 'bush', 0); if (!key) continue;
      s.add.image(c.x, c.y, key).setOrigin(...this.anchors.get(key)).setDepth((x + y) * 100 + 1).setTint(d === 1 ? 0xc8cec8 : d === 2 ? 0x98a098 : 0x6e756e);
    }
  }

  // ------------------------------------------------------------ ambient ---
  drawAmbient() {
    const s = this.scene, B = Phaser.BlendModes.ADD;
    const glow = this.bake('glow', 128, 128, ctx => {
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    });
    for (const L of this.lights) {
      const img = s.add.image(L.x, L.y, glow).setBlendMode(B).setTint(L.c).setAlpha(L.a).setScale(L.sx ?? L.r * 1.4, L.sy ?? L.r * 1.4).setDepth(L.ground ? -300 : 9000);
      if (L.flicker || L.blink) s.tweens.add({ targets: img, alpha: { from: L.a * (L.blink ? 0.2 : 0.8), to: L.a * 1.15 }, duration: L.blink ? 500 : 900 + Math.random() * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 800 });
    }
    const vk = this.bake('vignette', 480, 270, ctx => {
      const g = ctx.createRadialGradient(240, 135, 40, 240, 135, 300); g.addColorStop(0, 'rgba(255,190,110,.06)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(8,10,8,.62)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 270);
    });
    s.add.image(s.scale.width / 2, s.scale.height / 2, vk).setScrollFactor(0).setDisplaySize(s.scale.width, s.scale.height).setDepth(15000);
    // smoke
    const smoke = this.bake('smoke', 64, 64, ctx => {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(225,225,220,.8)'); g.addColorStop(1, 'rgba(225,225,220,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    });
    for (const sp of this.smokeSpots) s.add.particles(sp.x, sp.y, smoke, { lifespan: 2800, speedY: { min: -30, max: -18 }, speedX: { min: 5, max: 14 }, scale: { start: 0.3, end: 1.1 }, alpha: { start: 0.4, end: 0 }, frequency: 650, quantity: 1 }).setDepth(8900);
    // people, dog, pigeons
    PEOPLE.forEach((o, i) => this.bakeSprite(`ped${i}`, 60, 110, 30, 100, ctx => drawPerson(ctx, o)));
    this.bakeSprite('dog', 70, 50, 35, 44, ctx => {
      shadow(ctx, 18, 5); for (const x of [-11, -6, 8, 13]) rect(ctx, x, -12, 3.5, 12, 0x6e4a2c); ellipse(ctx, 0, -17, 16, 8, 0x8a5e37); circle(ctx, 17, -24, 7, 0x8a5e37);
      rect(ctx, 20, -25, 8, 5, 0x6e4a2c); circle(ctx, 27, -24, 2, 0x111111); poly(ctx, pp([12, -30], [17, -33], [17, -27]), 0x5a3a20); rect(ctx, 12, -20, 8, 2.5, 0xb7342d); line(ctx, -15, -20, -22, -30, 0x8a5e37, 3);
    });
    const pk = this.bakeSprite('pigeon', 40, 36, 20, 33, ctx => {
      line(ctx, -2, -8, -2, 0, 0xd0803a, 1.5); line(ctx, 3, -8, 3, 0, 0xd0803a, 1.5); poly(ctx, pp([-9, -14], [-17, -10], [-9, -8]), 0x6f767c); ellipse(ctx, 0, -14, 10, 7, 0x8d949b); ellipse(ctx, -2, -14, 7, 4, 0x6b7279);
      circle(ctx, 7, -20, 5, 0x4a6a74); circle(ctx, 10, -23, 4, 0x6b7d84); poly(ctx, pp([13, -23], [17, -22], [13, -21]), 0xe0983c); circle(ctx, 11, -24, 0.9, 0x101010);
    });
    for (const w of WALKERS) {
      const key = `hc${this.uid}_${w.tex}`, a = this.anchors.get(key); if (!a) continue;
      const sp = s.add.image(0, 0, key).setOrigin(...a);
      this.walkers.push({ sp, route: w.route, speed: w.speed, i: 1, cx: w.route[0][0], cy: w.route[0][1], wait: 0, dir: 1, ph: Math.random() * 6 });
      this.placeWalker(this.walkers[this.walkers.length - 1], 0, 0);
    }
    this.pigeonKey = pk;
    for (const [cx, cy] of [[14.2, 9], [15.4, 10.6], [16.6, 9.2], [14.4, 11], [15.8, 8.4], [16.8, 10.8]]) this.makePigeon(cx, cy);
    const home = s.buildings.find(b => b.id === 'your-home');
    if (home) for (let i = 0; i < 2; i++) { const q = this.makePigeon(16.2 + i * 1.2, 17.3); }
    this.prompt = s.add.text(0, 0, 'ENTER', { fontFamily: FONT_PX, fontSize: '12px', color: '#ffe19b', backgroundColor: '#2b312b', padding: { x: 8, y: 6 } }).setOrigin(0.5).setDepth(10001).setVisible(false);
  }
  makePigeon(cx, cy) {
    const home = this.pt(cx, cy), sp = this.scene.add.image(home.x, home.y, this.pigeonKey).setOrigin(...this.anchors.get(this.pigeonKey)).setDepth((cx + cy) * 100 + 1.2);
    const q = { sp, home, cx, cy, state: 'idle', t: Math.random() * 6, timer: 0, from: null, to: null, dur: 1, el: 0, returning: false };
    this.pigeons.push(q); return q;
  }
  flyTo(q, target, returning) {
    q.from = { x: q.sp.x, y: q.sp.y }; q.to = target; q.returning = returning; q.el = 0;
    q.dur = 0.4 + Math.hypot(target.x - q.from.x, target.y - q.from.y) / 320; q.state = 'fly'; q.sp.setDepth(8500);
  }
  placeWalker(w, time, moving) {
    const p = this.pt(w.cx, w.cy), ph = time * 0.012 * w.speed + w.ph;
    w.sp.setPosition(p.x, p.y - (moving ? Math.abs(Math.sin(ph)) * 3 : 0)).setDepth((w.cx + w.cy) * 100 + 1.5).setScale(w.dir, 1).setAngle(moving ? Math.sin(ph) * 3 : 0);
  }
  update(time, delta, st = {}) {
    if (this.destroyed || !this.scene) return;
    const dt = Math.min(delta, 100) / 1000, cell = st.cell;
    for (const w of this.walkers) {
      if (!w.sp.active) continue;
      if (w.wait > 0) { w.wait -= dt; this.placeWalker(w, time, 0); continue; }
      const tgt = w.route[w.i], dx = tgt[0] - w.cx, dy = tgt[1] - w.cy, dist = Math.hypot(dx, dy), step = w.speed * dt;
      if (dist <= step) { w.cx = tgt[0]; w.cy = tgt[1]; w.wait = tgt[2] || 0; w.i = (w.i + 1) % w.route.length; }
      else { w.cx += (dx / dist) * step; w.cy += (dy / dist) * step; if (Math.abs(dx - dy) > 0.01) w.dir = dx - dy > 0 ? 1 : -1; }
      this.placeWalker(w, time, 1);
    }
    for (const q of this.pigeons) {
      if (!q.sp.active) continue;
      const d = cell ? Math.hypot(cell.x - q.cx, cell.y - q.cy) : 99;
      if (q.state === 'idle') {
        q.t += dt; q.sp.setAngle(-Math.max(0, Math.sin(q.t * 5 + q.cx * 3)) * 14).setPosition(q.home.x, q.home.y);
        if (d < 2.3 && this.perches.length) this.flyTo(q, this.perches[Math.floor(Math.random() * this.perches.length)], false);
      } else if (q.state === 'fly') {
        q.el += dt; const k = Math.min(1, q.el / q.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        q.sp.setPosition(q.from.x + (q.to.x - q.from.x) * e, q.from.y + (q.to.y - q.from.y) * e - Math.sin(Math.PI * k) * 70).setAngle(0)
          .setScale(q.to.x < q.from.x ? -1 : 1, 0.85 + 0.25 * Math.sin(time * 0.04));
        if (k >= 1) { q.state = q.returning ? 'idle' : 'perch'; q.timer = 3 + Math.random() * 4; q.sp.setScale(1, 1).setDepth(q.returning ? (q.cx + q.cy) * 100 + 1.2 : 8000); }
      } else if (q.timer -= dt, q.timer <= 0 && d > 3.2) this.flyTo(q, q.home, true);
    }
    if (this.ghost?.sp.active) this.ghost.sp.setPosition(this.ghost.x + Math.sin(time * 0.0006) * 36, this.ghost.y - 8 + Math.sin(time * 0.002) * 6).setAlpha(0.28 + 0.12 * Math.sin(time * 0.0017));
    const pr = this.prompt;
    if (pr?.active) {
      const near = st.idle && cell ? this.scene.buildings.find(b => Math.abs(b.door.x - cell.x) + Math.abs(b.door.y - cell.y) <= 1) : null;
      if (near) { const p = this.pt(near.door.x, near.door.y); pr.setPosition(p.x, p.y - 140 + Math.sin(time * 0.006) * 4).setVisible(true); } else pr.setVisible(false);
    }
  }

  // ------------------------------------------------------------- route ---
  showRoute(path) {
    const g = this.routeGraphics; if (!g) return; g.clear();
    for (const cell of path) { const p = this.pt(cell.x, cell.y); g.fillStyle(0x2b2418, 0.35).fillEllipse(p.x + 1, p.y + 1, 12, 6); g.fillStyle(0xf1d49a, 0.7).fillEllipse(p.x, p.y, 10, 5); }
  }
  clearRoute() { this.routeGraphics?.clear(); }
  destroy() {
    if (this.destroyed) return; this.destroyed = true;
    const textures = this.scene?.textures, keys = [...this.keys];
    this.buildingArt.clear(); this.routeGraphics = null; this.pigeons = []; this.walkers = []; this.prompt = null; this.hl = null; this.ghost = null; this.scene = null;
    if (textures && keys.length) setTimeout(() => { try { for (const k of keys) if (textures.exists(k)) textures.remove(k); } catch { /* game already destroyed */ } }, 80);
  }
}