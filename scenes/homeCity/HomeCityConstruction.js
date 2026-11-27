// =============================================================================
// HomeCityConstruction.js - the construction site in the Old Quarter.
//
// WHY: a real building can later appear on this plot without anything
// popping into the map mid-game. The plot (footprint + door) is reserved from
// the very first frame; only the art on it changes.
//
// HOW TO TURN IT INTO A REAL BUILDING LATER (3 steps, nothing else to touch):
//   1. In HomeCityScene.js replace `{ ...CONSTRUCTION_SITE_BUILDING }`
//      in EXTRA_BUILDINGS with your new building. KEEP the footprint:
//      `...SITE_FOOTPRINT` (x13, y21, w3, h3, door ends up at 14,24) and give it
//      a `sceneKey` + `SceneClass` like the church / pawn shop.
//      (The first site at x33 became Holloway's Shooting Range this way.)
//   2. Register a PALETTES[...] entry for it (see HomeCityLombard.js).
//   3. Remove CONSTRUCTION_SITE_PROPS from EXTRA_PROPS (or keep the cones, up to you).
// The drawing hook below only fires for id 'construction-site', so a new id
// is drawn by the normal house renderer automatically.
//
// Imported by HomeCityScene.js. Side effects: registers 3 new prop
// arts (cone, barrier, portaloo) and hooks HomeCityBuildings.drawHouse.
// NOTE: texts are plain strings (not __dialogueText).
// =============================================================================
import { HW, FONT_UI } from './HomeCityConfig.js';
import { HomeCityBuildings } from './HomeCityBuildings.js';
import { PROP_ART } from './HomeCityPropArt.js';
import { css, mix, dark, hash, pp, pathOf, poly, rect, circle, ellipse, line, shadow, isoBox, blob, S } from './HomeCityDrawing.js';

export const SITE_ID = 'construction-site';
export const SITE_FOOTPRINT = { x: 13, y: 21, w: 3, h: 3 };   // Foundry Lane (third street), first lot past the crossroads

export const CONSTRUCTION_SITE_QUIPS = [
  'The gate is locked. The sign says "BACK IN 5 MINUTES". The sign has said that since the Tuesday before last.',
  'HARD HAT REQUIRED. You are wearing a fedora. The foreman says it "counts, spiritually" and waves you off anyway.',
  'DAYS WITHOUT AN ACCIDENT: 0. Underneath, in chalk: "(it was only a small one)".',
  'COMING SOON! Coming soon what? Nobody knows. The architect left a single note: "Surprise."',
  'The crane operator waves at you. You are 90% sure he is a pigeon in a hard hat. The other 10% is also a pigeon.',
  'A worker leans on a shovel and asks if you are the inspector. You say yes. Everyone is suddenly very busy for 40 seconds.',
  'The building permit is pinned to the fence: PERMIT PENDING. Underneath, in another pen: "PERMIT FOR THE PERMIT PENDING."',
  'You hear a drill. Then silence. Then a very long coffee break.'
];

export const CONSTRUCTION_SITE_BUILDING = {
  id: SITE_ID, name: 'Under Construction', ...SITE_FOOTPRINT,
  color: 0xc9a227, message: '', quips: CONSTRUCTION_SITE_QUIPS
};

// cones flank the gate, the door cell (14,24) and the cell in front of it (14,25) stay free
export const CONSTRUCTION_SITE_PROPS = [
  { x: 13, y: 24, kind: 'cone' }, { x: 15, y: 24, kind: 'cone' },
  { x: 13, y: 25, kind: 'barrier' }, { x: 16, y: 24, kind: 'portaloo' }
];

export const CONSTRUCTION_PROP_QUIPS = {
  cone: [
    'A traffic cone. It marks the spot where something was about to happen. It has been about to happen for months.',
    'There is a second cone behind this one, so the first cone does not feel alone.'
  ],
  barrier: [
    '"DO NOT CROSS." You were not going to. Now you are seriously considering it.',
    'The barrier was moved three metres to the left during the night. Nobody saw anything. Nobody ever does.'
  ],
  portaloo: [
    'OCCUPIED. The little sign has said that since the foundations were poured.',
    'You knock. A tiny voice answers: "...one minute." That was a long minute.'
  ]
};

// ------------------------------------------------------------------ props ---
PROP_ART.cone = { w: 60, h: 80, ax: 30, ay: 66, draw(ctx) {
  shadow(ctx, 20, 7);
  rect(ctx, -15, -5, 30, 7, 0x2d2d2d);
  poly(ctx, pp([-11, -5], [11, -5], [4, -50], [-4, -50]), 0xf06a1c, dark(0xf06a1c, 0.35));
  poly(ctx, pp([-8.67, -20], [8.67, -20], [7.57, -27], [-7.57, -27]), 0xf4f1e6, null);
  poly(ctx, pp([-6.49, -34], [6.49, -34], [5.56, -40], [-5.56, -40]), 0xf4f1e6, null);
  line(ctx, -9, -8, -4, -46, 'rgba(255,255,255,0.28)', 2);
  rect(ctx, -4, -53, 8, 4, 0xd85a14);
} };

PROP_ART.barrier = { w: 120, h: 100, ax: 60, ay: 84, draw(ctx) {
  shadow(ctx, 48, 9);
  for (const x of [-34, 34]) poly(ctx, pp([x - 5, -2], [x + 5, -2], [x + 2, -60], [x - 2, -60]), 0xe9e2cf, 0x6b665a);
  for (const [y0, y1] of [[-62, -48], [-42, -28]]) {
    rect(ctx, -48, y0, 96, y1 - y0, 0xeee8d6);
    for (let x = -48; x <= 32; x += 16) poly(ctx, pp([x, y1], [x + 8, y1], [x + 13, y0], [x + 5, y0]), 0xc8302a, null);
    ctx.strokeStyle = css(0x5a554a); ctx.lineWidth = 1.5; ctx.strokeRect(-48, y0, 96, y1 - y0);
  }
  circle(ctx, -34, -68, 6, 0xffb02e); circle(ctx, -35.5, -69.5, 2, 0xfff0b8);
} };

PROP_ART.portaloo = { w: 90, h: 150, ax: 45, ay: 128, draw(ctx) {
  shadow(ctx, 32, 10);
  isoBox(ctx, 0, 0, 0.2, 0.2, 0, 92, 0xdfe8ee, 0x2f78c4, 0x24609f, 0x112b47);
  const F = (u, z) => S(0, 0, u, 0.2, z);
  poly(ctx, [F(-0.12, 6), F(0.12, 6), F(0.12, 80), F(-0.12, 80)], 0x1d5a99, 0x0e2c4d, 1.5);
  poly(ctx, [F(0.07, 40), F(0.1, 40), F(0.1, 44), F(0.07, 44)], 0xe9e0b0, null);
  poly(ctx, [F(-0.06, 66), F(0.06, 66), F(0.06, 74), F(-0.06, 74)], 0xc8302a, 0x5a1612);
  isoBox(ctx, 0, 0, 0.06, 0.06, 92, 101, 0xcfd8de, 0x9aa5ad, 0x7d8890, 0x3a4248);
} };

// ---------------------------------------------------------------- helpers ---
const SITE_H = 150;                 // height for the nameplate and the hover outline
const FV = 2.94, FU = 2.88;         // front / right fence planes (local cells)
const GATE = [0.7, 2.3];            // gate posts (local u)
const BOARD = { x: 2.96, v1: 0.55, v2: 2.15, z1: 54, z2: 100 };

function place(r, name, pts, draw, depth, pad = 12) {
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const left = Math.floor(Math.min(...xs)) - pad, top = Math.floor(Math.min(...ys)) - pad;
  const w = Math.ceil(Math.max(...xs)) + pad - left, h = Math.ceil(Math.max(...ys)) + pad - top;
  const key = r.bake(name, w, h, draw, left, top);
  if (!key) return null;
  return { img: r.scene.add.image(left, top, key).setOrigin(0, 0).setDepth(depth), left, top, key };
}

// diagonal yellow/black tape on a vertical face
function hazard(r, ctx, axis, fixed, u1, u2, z1, z2) {
  const pts = r.faceP(axis, fixed, u1, u2, z1, z2);
  poly(ctx, pts, 0xf2c124, null);
  ctx.save(); pathOf(ctx, pts); ctx.clip();
  const step = 0.07, k = 0.07;
  for (let u = u1 - k; u < u2; u += step * 2) {
    poly(ctx, [r.P(axis, u, fixed, z1), r.P(axis, u + step, fixed, z1), r.P(axis, u + step + k, fixed, z2), r.P(axis, u + k, fixed, z2)], 0x2a2a2a, null);
  }
  ctx.restore();
}

// zig-zag truss on a vertical face
function lattice(r, ctx, axis, fixed, u1, u2, z1, z2, n, color, w = 1) {
  for (let i = 0; i < n; i++) {
    const a = u1 + ((u2 - u1) * i) / n, c = u1 + ((u2 - u1) * (i + 1)) / n, up = i % 2 === 0;
    const p0 = r.P(axis, a, fixed, up ? z1 : z2), p1 = r.P(axis, c, fixed, up ? z2 : z1);
    line(ctx, p0.x, p0.y, p1.x, p1.y, color, w);
  }
}

// courses of bricks on a vertical face; topAt(u) = local wall height (stepped, unfinished edge)
function brickWall(r, ctx, axis, fixed, u1, u2, z0, topAt, holes, seed, dim = 0) {
  const du = 0.12, rowH = 6;
  for (let row = 0; z0 + row * rowH < 84; row++) {
    const z = z0 + row * rowH;
    for (let k = -1; ; k++) {
      const a0 = u1 + (k + (row % 2 ? 0.5 : 0)) * du;
      if (a0 >= u2) break;
      const a = Math.max(a0, u1), c = Math.min(a0 + du, u2);
      if (c - a < 0.02) continue;
      const mid = (a + c) / 2;
      if (z + rowH > topAt(mid) + 0.5) continue;
      if (holes.some(h => mid > h.u1 && mid < h.u2 && z + rowH > h.z1 && z < h.z2)) continue;
      const base = mix(0x9a4d34, 0xcc7a52, hash(k + 7, row, seed));
      r.face(ctx, axis, fixed, a, c, z, z + rowH, dim ? dark(base, dim) : base, 0xcdbda2);
    }
  }
}

// temporary fence: plywood kickboard, hazard tape, orange safety net, posts
function paintFence(r, ctx, axis, fixed, u1, u2) {
  const net = 'rgba(240,118,26,0.30)';
  r.face(ctx, axis, fixed, u1, u2, 0, 15, 0xb58f5a, 0x6e5230);
  for (let u = u1 + 0.1; u < u2 - 0.01; u += 0.1) {
    const a = r.P(axis, u, fixed, 0), c = r.P(axis, u, fixed, 15);
    line(ctx, a.x, a.y, c.x, c.y, 'rgba(60,40,20,0.35)', 1);
  }
  hazard(r, ctx, axis, fixed, u1, u2, 15, 22);
  r.face(ctx, axis, fixed, u1, u2, 22, 46, net, null);
  for (let u = u1; u <= u2 + 1e-6; u += 0.075) {
    const a = r.P(axis, u, fixed, 22), c = r.P(axis, u, fixed, 46);
    line(ctx, a.x, a.y, c.x, c.y, 'rgba(255,178,80,0.55)', 1);
  }
  for (let z = 27; z < 46; z += 5) {
    const a = r.P(axis, u1, fixed, z), c = r.P(axis, u2, fixed, z);
    line(ctx, a.x, a.y, c.x, c.y, 'rgba(255,178,80,0.45)', 1);
  }
  r.face(ctx, axis, fixed, u1, u2, 46, 49, 0x555b61, 0x2b2f33);
  const n = Math.max(1, Math.round((u2 - u1) / 0.5));
  for (let i = 0; i <= n; i++) {
    const u = u1 + ((u2 - u1) * i) / n;
    r.face(ctx, axis, fixed, u - 0.03, u + 0.03, 0, 50, 0x555b61, 0x2b2f33);
  }
}

// ------------------------------------------------------------------ ground ---
function paintGround(r, ctx, C) {
  const corners = [[-0.12, -0.12], [3.12, -0.12], [3.12, 3.12], [-0.12, 3.12]], norm = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const ring = [];
  for (let e = 0; e < 4; e++) {
    const [u0, v0] = corners[e], [u1, v1] = corners[(e + 1) % 4];
    for (let i = 0; i < 8; i++) {
      const t = i / 8, j = (hash(e, i, 61) - 0.3) * 0.2;
      ring.push(C(u0 + (u1 - u0) * t + norm[e][0] * j, v0 + (v1 - v0) * t + norm[e][1] * j));
    }
  }
  poly(ctx, ring, 0x73593a, null);
  poly(ctx, [C(0.4, 0.5), C(2.7, 0.4), C(2.8, 2.5), C(0.3, 2.6)], 'rgba(55,38,20,0.35)', null);
  for (let i = 0; i < 140; i++) {
    const q = C(-0.05 + hash(i, 1, 62) * 3.1, -0.05 + hash(i, 2, 62) * 3.1);
    rect(ctx, q.x, q.y, 3, 2, hash(i, 3, 62) > 0.5 ? 'rgba(190,160,110,0.55)' : 'rgba(40,28,16,0.45)');
  }
  // tyre tracks from the gate into the yard
  ctx.lineCap = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(38,26,14,0.55)';
  for (const off of [-0.17, 0.17]) {
    const a = C(1.5 + off, 3.25), b = C(1.45 + off, 2.2), c = C(1.9 + off * 0.6, 1.8);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(b.x, b.y, c.x, c.y); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // plank walkway
  for (let v = 2.2; v < 2.95; v += 0.13) poly(ctx, [C(0.2, v), C(0.62, v), C(0.62, v + 0.1), C(0.2, v + 0.1)], 0xa98557, 'rgba(50,32,14,0.7)');
  // puddle
  const pd = C(2.25, 2.55);
  ellipse(ctx, pd.x, pd.y, 28, 11, 'rgba(108,138,152,0.85)'); ellipse(ctx, pd.x - 8, pd.y - 3, 12, 3.5, 'rgba(210,228,236,0.7)');
  // muddy footprints leaving through the gate
  for (let i = 0; i < 5; i++) { const p = C(1.35 + (i % 2) * 0.22, 3.2 + i * 0.14); ellipse(ctx, p.x, p.y, 5, 2.4, 'rgba(50,34,18,0.5)'); }
}

// ------------------------------------------------------------- main sprite ---
function paintMain(r, ctx, C, b, fx) {
  const box = (u0, u1, v0, v1, z0, z1, top, front, side, edge = null) => {
    poly(ctx, [C(u1, v0, z0), C(u1, v1, z0), C(u1, v1, z1), C(u1, v0, z1)], side, edge);
    poly(ctx, [C(u0, v1, z0), C(u1, v1, z0), C(u1, v1, z1), C(u0, v1, z1)], front, edge);
    poly(ctx, [C(u0, v0, z1), C(u1, v0, z1), C(u1, v1, z1), C(u0, v1, z1)], top, edge);
  };
  const concrete = [0xd2cdbf, 0xb8b3a5, 0x97927f, 0x4b473e];
  const column = (u, v, z0, z1) => box(u - 0.045, u + 0.045, v - 0.045, v + 0.045, z0, z1, ...concrete);
  const byDepth = list => [...list].sort((p, q) => (p[0] + p[1]) - (q[0] + q[1]));

  // ---- back fence (plywood, seen from inside)
  r.face(ctx, 'x', 0.08, 0.05, 2.95, 0, 50, 0xa8854f, 0x5f4528);
  for (let u = 0.15; u < 2.95; u += 0.15) { const a = r.P('x', u, 0.08, 0), c = r.P('x', u, 0.08, 50); line(ctx, a.x, a.y, c.x, c.y, 'rgba(50,34,16,0.35)', 1); }
  r.face(ctx, 'x', 0.08, 0.05, 2.95, 50, 54, 0x4a3a28, 0x2a2016);

  // ---- the half-built shell
  const BASE = 8, F1 = 84, F2 = 150;
  box(0.3, 2.3, 0.3, 1.9, 0, BASE, 0xbdb8aa, 0xa9a496, 0x8a8576, 0x4b473e);
  for (const [u, v] of byDepth([[0.4, 0.4], [1.3, 0.4], [2.2, 0.4], [0.4, 1.1]])) column(u, v, BASE, F1);
  // front wall (v = 1.8): door in the first bay, stepped unfinished top in the second
  const topFront = u => (u < 1.6 ? 78 : 78 - 6 * Math.ceil((u - 1.6) / 0.1));
  const holesFront = [{ u1: 0.6, u2: 0.98, z1: BASE, z2: 62 }];
  brickWall(r, ctx, 'x', 1.8, 0.445, 1.255, BASE, topFront, holesFront, 1);
  brickWall(r, ctx, 'x', 1.8, 1.345, 2.155, BASE, topFront, holesFront, 2);
  r.face(ctx, 'x', 1.8, 0.6, 0.98, BASE, 62, 0x2a211b, 0x7a7466);
  r.face(ctx, 'x', 1.8, 0.6, 0.98, 62, 68, 0x9a958a, 0x4b473e);                // lintel
  // right wall (u = 2.2): lower toward the back
  const topRight = v => Math.max(18, 78 - (1.76 - v) * 46);
  const holesRight = [{ u1: 1.4, u2: 1.65, z1: 32, z2: 52 }];
  brickWall(r, ctx, 'y', 2.2, 0.445, 1.055, BASE, topRight, holesRight, 3, 0.22);
  brickWall(r, ctx, 'y', 2.2, 1.145, 1.755, BASE, topRight, holesRight, 4, 0.22);
  r.face(ctx, 'y', 2.2, 1.4, 1.65, 32, 52, 0x2a211b, 0x7a7466);
  for (const [u, v] of byDepth([[2.2, 1.1], [0.4, 1.8], [1.3, 1.8], [2.2, 1.8]])) column(u, v, BASE, F1);
  // first floor slab, upper columns, partial second slab
  box(0.3, 2.3, 0.3, 1.9, F1 - 4, F1 + 4, 0xcfcabc, 0xb1ac9d, 0x938e80, 0x4b473e);
  const cols = byDepth([[0.4, 0.4], [1.3, 0.4], [2.2, 0.4], [0.4, 1.1], [2.2, 1.1], [0.4, 1.8], [1.3, 1.8], [2.2, 1.8]]);
  for (const [u, v] of cols) column(u, v, F1 + 4, F2);
  box(0.3, 1.4, 0.3, 1.9, F2 - 4, F2 + 4, 0xcfcabc, 0xb1ac9d, 0x938e80, 0x4b473e);
  // rebar sticking out of the columns
  for (const [u, v] of cols) {
    const z0 = u <= 1.4 ? F2 + 4 : F2;
    for (const [du, dv] of [[-0.025, -0.02], [0.025, -0.02], [0, 0.025]]) {
      const a = C(u + du, v + dv, z0), c = C(u + du, v + dv, z0 + 14 + hash(u * 10, v * 10, 5) * 8);
      line(ctx, a.x, a.y, c.x, c.y, 0x7b4b34, 1.6);
    }
  }
  // tarp hanging off the second floor
  const tarp = [r.P('x', 0.45, 1.93, 146), r.P('x', 1.25, 1.93, 146)];
  for (let i = 8; i >= 0; i--) tarp.push(r.P('x', 0.45 + (0.8 * i) / 8, 1.93, 104 + 5 * Math.sin(i * 1.7) + (i % 3) * 2));
  poly(ctx, tarp, 0x3f86c9, 0x2a5f93);
  for (let i = 1; i < 8; i++) {
    const a = r.P('x', 0.45 + (0.8 * i) / 8, 1.93, 146), c = r.P('x', 0.45 + (0.8 * i) / 8, 1.93, 110);
    line(ctx, a.x, a.y, c.x, c.y, i % 2 ? 'rgba(255,255,255,0.16)' : 'rgba(10,40,80,0.25)', 2);
  }

  // ---- scaffolding in front of the shell
  const poles = [0.3, 1.0, 1.7, 2.3], deck = (z) => box(0.2, 2.4, 2.05, 2.3, z, z + 4, 0xb98f58, 0x9a7440, 0x7b5a31, 0x3d2d1c);
  for (const u of poles) r.face(ctx, 'x', 2.05, u - 0.018, u + 0.018, 0, 172, 0x7b8086, 0x3a3d40);
  deck(76); deck(146);
  for (const u of poles) r.face(ctx, 'x', 2.3, u - 0.018, u + 0.018, 0, 172, 0x8b9096, 0x3a3d40);
  lattice(r, ctx, 'x', 2.3, 0.3, 2.3, 0, 76, 8, 0x5d6368, 1.5);
  lattice(r, ctx, 'x', 2.3, 0.3, 2.3, 80, 146, 8, 0x5d6368, 1.5);
  for (const z of [100, 170]) r.face(ctx, 'x', 2.3, 0.3, 2.3, z, z + 3, 0x8b9096, 0x3a3d40);
  // a worker on his coffee break
  {
    const p = C(2.1, 2.25, 80);
    rect(ctx, p.x - 6, p.y - 2, 5, 15, 0x2f3a52); rect(ctx, p.x + 1, p.y - 2, 5, 15, 0x2f3a52);
    rect(ctx, p.x - 7, p.y + 11, 6, 3, 0x1a1a1a); rect(ctx, p.x + 1, p.y + 11, 6, 3, 0x1a1a1a);
    poly(ctx, pp([p.x - 8, p.y - 30], [p.x + 8, p.y - 30], [p.x + 9, p.y - 2], [p.x - 9, p.y - 2]), 0xf07a1c, 0x8a410c);
    rect(ctx, p.x - 8, p.y - 18, 16, 2, 0xe8e8b0);
    rect(ctx, p.x + 8, p.y - 22, 6, 6, 0xeeeeee); rect(ctx, p.x + 14, p.y - 20, 2, 3, 0xeeeeee);
    circle(ctx, p.x, p.y - 36, 6, 0xe2b894);
    ctx.fillStyle = css(0xf2c124); ctx.beginPath(); ctx.arc(p.x, p.y - 38, 7.5, Math.PI, 0); ctx.fill(); rect(ctx, p.x - 9, p.y - 38, 18, 2.5, 0xd9a514);
  }

  // ---- tower crane
  const MU = 2.65, MV = 0.55, MH = 0.1, JZ0 = 300, JZ1 = 314;
  box(MU - 0.22, MU + 0.22, MV - 0.22, MV + 0.22, 0, 10, 0xb8b3a5, 0x9c978a, 0x7d786b, 0x3d3a33);
  box(MU - MH, MU + MH, MV - MH, MV + MH, 10, JZ0, 0xf3c43b, 0xe0a82a, 0xb8841c, 0x5a3f0d);
  lattice(r, ctx, 'x', MV + MH, MU - MH, MU + MH, 10, JZ0, 9, 0x8a6212, 1);
  lattice(r, ctx, 'y', MU + MH, MV - MH, MV + MH, 10, JZ0, 9, 0x8a6212, 1);
  box(0.0, 3.25, MV - 0.06, MV + 0.06, JZ0, JZ1, 0xf3c43b, 0xe0a82a, 0xb8841c, 0x5a3f0d);
  lattice(r, ctx, 'x', MV + 0.06, 0.0, 3.25, JZ0, JZ1, 26, 0x6a4a0e, 1.2);
  box(2.95, 3.25, MV - 0.08, MV + 0.08, 284, 300, 0xa7a396, 0x8f8b7d, 0x706c60, 0x3a372f);
  const apex = C(MU, MV, 344), jt = C(0.1, MV, JZ1), ct = C(3.2, MV, JZ1), mt = C(MU, MV, JZ1);
  line(ctx, mt.x, mt.y, apex.x, apex.y, 0xe0a82a, 4);
  line(ctx, apex.x, apex.y, jt.x, jt.y, 0x3a3d40, 1.3); line(ctx, apex.x, apex.y, ct.x, ct.y, 0x3a3d40, 1.3);
  box(1.18, 1.32, MV - 0.05, MV + 0.05, 293, 300, 0x555b61, 0x44494e, 0x33373b, 0x1e2124);   // trolley
  box(MU - 0.3, MU - 0.08, MV + 0.1, MV + 0.34, 294, 312, 0xe8e4d4, 0xd7d2c0, 0xb3ae9c, 0x5a564a);   // cab
  r.face(ctx, 'x', MV + 0.34, MU - 0.27, MU - 0.11, 299, 308, 0x9fd0e8, 0x3a3a3a);
  { // the operator
    const p = r.P('x', MU - 0.19, MV + 0.34, 302);
    circle(ctx, p.x, p.y, 3.4, 0x8d949b); poly(ctx, pp([p.x - 3, p.y - 0.5], [p.x - 7.5, p.y + 0.8], [p.x - 3, p.y + 1.8]), 0xe0983c, null);
    ctx.fillStyle = css(0xf2c124); ctx.beginPath(); ctx.arc(p.x, p.y - 2.2, 3.4, Math.PI, 0); ctx.fill();
  }

  // ---- yard: bricks, sand, mixer, burning barrel
  box(0.5, 1.0, 2.42, 2.78, 0, 5, 0xa07a48, 0x86653a, 0x6b5030, 0x3d2d1c);
  box(0.52, 0.98, 2.44, 2.76, 5, 21, 0xb85a3c, 0xa24a30, 0x7f3a26, 0x4a2217);
  for (let z = 9; z < 21; z += 4) {
    let a = r.P('x', 0.52, 2.76, z), c = r.P('x', 0.98, 2.76, z); line(ctx, a.x, a.y, c.x, c.y, 'rgba(40,15,8,0.45)', 1);
    a = r.P('y', 2.44, 0.98, z); c = r.P('y', 2.76, 0.98, z); line(ctx, a.x, a.y, c.x, c.y, 'rgba(40,15,8,0.45)', 1);
  }
  { const p = C(1.1, 2.7); rect(ctx, p.x, p.y - 3, 7, 3, 0xb85a3c); rect(ctx, p.x + 9, p.y + 1, 7, 3, 0xa24a30); }
  { // sand heap with a shovel
    const p = C(1.75, 2.55);
    ellipse(ctx, p.x, p.y + 2, 32, 10, 0xc7ad74); blob(ctx, p.x, p.y - 8, 20, 0xd4bb80); blob(ctx, p.x - 6, p.y - 16, 13, 0xe0c88f); blob(ctx, p.x + 4, p.y - 22, 7, 0xe8d49d);
    line(ctx, p.x + 16, p.y - 6, p.x + 32, p.y - 36, 0x5a4330, 3);
    poly(ctx, pp([p.x + 9, p.y - 5], [p.x + 19, p.y - 8], [p.x + 18, p.y + 3], [p.x + 9, p.y + 3]), 0x7b8288, 0x3a3d40);
  }
  { // cement mixer
    const p = C(2.5, 1.95);
    ellipse(ctx, p.x + 4, p.y + 2, 28, 8, 'rgba(18,24,16,0.3)');
    for (const dx of [-15, 15]) { circle(ctx, p.x + dx, p.y - 8, 8, 0x1b1d1f); circle(ctx, p.x + dx, p.y - 8, 3.5, 0x9aa0a0); }
    rect(ctx, p.x - 21, p.y - 21, 42, 5, 0x44494e);
    line(ctx, p.x - 11, p.y - 19, p.x, p.y - 36, 0x44494e, 3); line(ctx, p.x + 11, p.y - 19, p.x, p.y - 36, 0x44494e, 3);
    ctx.save(); ctx.translate(p.x, p.y - 44); ctx.rotate(-0.4);
    ellipse(ctx, 0, 0, 17, 24, 0xe2912f); ellipse(ctx, -3, -2, 13, 19, 0xefae4e); ellipse(ctx, 0, -20, 11, 5, 0x3a2f27);
    for (const y of [-8, 2, 12]) line(ctx, -15, y, 15, y, 'rgba(120,60,10,0.45)', 1.5);
    ctx.restore();
  }
  { // oil drum fire
    const p = C(2.55, 2.5);
    ellipse(ctx, p.x + 3, p.y + 2, 16, 5, 'rgba(18,24,16,0.3)');
    rect(ctx, p.x - 9, p.y - 30, 18, 30, 0x3b6ea5); for (const y of [-22, -12]) rect(ctx, p.x - 9, p.y + y, 18, 2, 0x2a4f7a);
    ellipse(ctx, p.x, p.y - 30, 9, 3.6, 0x1b1b1b);
    poly(ctx, pp([p.x - 7, p.y - 31], [p.x - 3, p.y - 47], [p.x, p.y - 37], [p.x + 3, p.y - 52], [p.x + 7, p.y - 31]), 0xf26b1d, null);
    poly(ctx, pp([p.x - 4, p.y - 31], [p.x - 1, p.y - 42], [p.x + 1, p.y - 36], [p.x + 3, p.y - 44], [p.x + 4, p.y - 31]), 0xffc844, null);
  }

  // ---- front + right fences, billboard, gate
  paintFence(r, ctx, 'y', FU, 0.1, 2.9);
  r.face(ctx, 'y', BOARD.x - 0.03, 0.68, 0.74, 0, BOARD.z1, 0x5a4a3a, 0x2f261d);
  r.face(ctx, 'y', BOARD.x - 0.03, 1.96, 2.02, 0, BOARD.z1, 0x5a4a3a, 0x2f261d);
  r.face(ctx, 'y', BOARD.x, BOARD.v1, BOARD.v2, BOARD.z1, BOARD.z2, 0xefe9d6, 0x3a3a3a);
  hazard(r, ctx, 'y', BOARD.x, BOARD.v1, BOARD.v2, BOARD.z2 - 8, BOARD.z2);
  paintFence(r, ctx, 'x', FV, 0.05, GATE[0] - 0.05);
  paintFence(r, ctx, 'x', FV, GATE[1] + 0.05, 2.95);
  // gate leaves
  const mid = (GATE[0] + GATE[1]) / 2, sheared = (p, fn) => { ctx.save(); ctx.transform(1, 0.5, 0, 1, p.x, p.y); fn(); ctx.restore(); };
  for (const [a, c] of [[GATE[0] + 0.05, mid - 0.01], [mid + 0.01, GATE[1] - 0.05]]) {
    r.face(ctx, 'x', FV, a, c, 0, 48, 0xb08a55, 0x4a3a22);
    for (let u = a + 0.08; u < c - 0.01; u += 0.08) { const p0 = r.P('x', u, FV, 0), p1 = r.P('x', u, FV, 48); line(ctx, p0.x, p0.y, p1.x, p1.y, 'rgba(50,34,16,0.3)', 1); }
    const f0 = r.P('x', a, FV + 0.005, 4), f1 = r.P('x', c, FV + 0.005, 44);
    line(ctx, f0.x, f0.y, f1.x, f1.y, 0x3d4044, 3);
    r.face(ctx, 'x', FV + 0.005, a, a + 0.04, 0, 48, 0x3d4044, null); r.face(ctx, 'x', FV + 0.005, c - 0.04, c, 0, 48, 0x3d4044, null);
  }
  sheared(r.P('x', mid + 0.3, FV + 0.01, 28), () => {
    circle(ctx, 0, 0, 9, 0xc8302a); rect(ctx, -6, -1.8, 12, 3.6, 0xf4f1e6);
  });
  sheared(r.P('x', mid, FV + 0.01, 22), () => { rect(ctx, -3, -1, 6, 6, 0xe8c030); ctx.strokeStyle = css(0x3a3a3a); ctx.lineWidth = 1; ctx.strokeRect(-3, -1, 6, 6); });
  { const a = r.P('x', mid - 0.08, FV + 0.01, 22), c = r.P('x', mid + 0.08, FV + 0.01, 22); line(ctx, a.x, a.y + 2, c.x, c.y + 2, 0x30343a, 1.5); }
  // gate posts + beam + flashers
  for (const u of GATE) box(u - 0.06, u + 0.06, FV - 0.06, FV + 0.06, 0, 106, 0x666b70, 0x4f5459, 0x3b3f43, 0x222528);
  box(GATE[0] - 0.06, GATE[1] + 0.06, FV - 0.05, FV + 0.05, 98, 106, 0x666b70, 0x4f5459, 0x3b3f43, 0x222528);
  for (const u of GATE) { const p = C(u, FV, 112); circle(ctx, p.x, p.y, 5, 0xffa51e); circle(ctx, p.x - 1.5, p.y - 1.5, 1.8, 0xfff0b8); }
  // hard hats hung on the fence
  for (const u of [0.35, 2.7]) {
    const p = C(u, FV, 49);
    ctx.fillStyle = css(0xf2c124); ctx.beginPath(); ctx.arc(p.x, p.y - 4, 6, Math.PI, 0); ctx.fill(); rect(ctx, p.x - 8, p.y - 4, 16, 2.5, 0xd9a514);
  }
  void fx;
}

// the swinging load under the crane (separate sprite, origin = trolley)
function paintHook(ctx) {
  line(ctx, 42, 0, 42, 100, 0x2a2a2a, 2);
  rect(ctx, 36, 100, 12, 8, 0xf2c124);
  ctx.strokeStyle = css(0x2a2a2a); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(42, 112, 5, -0.4, Math.PI * 1.2); ctx.stroke();
  line(ctx, 42, 108, 14, 128, 0xe0a020, 2); line(ctx, 42, 108, 70, 128, 0xe0a020, 2);
  for (const [y, c] of [[134, 0x5d6670], [141, 0x7b8590], [127, 0x6b7480]]) { rect(ctx, 12, y, 60, 7, c); rect(ctx, 12, y, 60, 1.5, 'rgba(255,255,255,0.3)'); }
  rect(ctx, 22, 124, 4, 25, 0xe0a020); rect(ctx, 58, 124, 4, 25, 0xe0a020);
  ellipse(ctx, 46, 122, 8, 5, 0x8d949b); ellipse(ctx, 44, 122, 5.5, 3, 0x6b7279);   // a pigeon hitching a ride
  circle(ctx, 53, 118, 3.6, 0x4a6a74); poly(ctx, pp([56, 118], [60, 119.5], [56, 120.5]), 0xe0983c, null); circle(ctx, 54, 117, 0.8, 0x101010);
}

// ----------------------------------------------------------------- driver ---
function drawConstructionSite(r, b, art) {
  const s = r.scene, X0 = b.x - 0.5, Y0 = b.y - 0.5, right = b.x + b.w - 1, front = b.y + b.h - 1;
  const C = (u, v, z = 0) => r.pt(X0 + u, Y0 + v, z);
  // same face / point helpers as the renderer, but in LOCAL plot coordinates (u,v in 0..3 from the plot's back corner)
  const L = {
    P: (axis, u, f, z) => (axis === 'x' ? r.P('x', X0 + u, Y0 + f, z) : r.P('y', Y0 + u, X0 + f, z)),
    faceP: (axis, f, u1, u2, lo, hi) => (axis === 'x' ? r.faceP('x', Y0 + f, X0 + u1, X0 + u2, lo, hi) : r.faceP('y', X0 + f, Y0 + u1, Y0 + u2, lo, hi)),
    face: (ctx, axis, f, u1, u2, lo, hi, color, stroke = color) => (axis === 'x'
      ? r.face(ctx, 'x', Y0 + f, X0 + u1, X0 + u2, lo, hi, color, stroke) : r.face(ctx, 'y', X0 + f, Y0 + u1, Y0 + u2, lo, hi, color, stroke))
  };
  art.height = SITE_H;
  art.hull = [r.pt(b.x - 0.5, b.y - 0.5, SITE_H), r.pt(right + 0.5, b.y - 0.5, SITE_H), r.pt(right + 0.5, b.y - 0.5, 0),
    r.pt(right + 0.5, front + 0.5, 0), r.pt(b.x - 0.5, front + 0.5, 0), r.pt(b.x - 0.5, front + 0.5, SITE_H)];
  r.bakeShadow(b);
  // sits between the cells behind it and the cells in front of it (the player can walk behind / in front)
  const depth = (b.x + (b.w - 1) / 2 + b.y + (b.h - 1) / 2) * 100 - 0.5;

  place(r, 'site_ground', [C(-0.3, -0.3), C(3.3, -0.3), C(3.3, 3.7), C(-0.3, 3.7)], ctx => paintGround(r, ctx, C), -800);
  const main = place(r, 'site_main', [C(-0.2, -0.2, 380), C(3.5, -0.2, 380), C(3.5, 3.1), C(-0.2, 3.1)], ctx => paintMain(L, ctx, C, b), depth);
  if (main) r.hookBuilding(main.img, b.id, art.hull.map(q => ({ x: q.x - main.left, y: q.y - main.top })));

  // swinging crane load
  const hookKey = r.bake('site_hook', 84, 150, ctx => paintHook(ctx), 0, 0);
  if (hookKey) {
    const t = C(1.25, 0.55, 297);
    const sp = s.add.image(t.x, t.y, hookKey).setOrigin(0.5, 0).setDepth(depth + 0.2);
    s.tweens.add({ targets: sp, angle: { from: -4, to: 4 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // billboard text needs the fonts
  r.afterFonts(() => {
    r.bakeBanner(b, 'COMING SOON', 97, GATE[1] - GATE[0]);
    const pts = L.faceP('y', BOARD.x, BOARD.v1, BOARD.v2, BOARD.z1, BOARD.z2);
    const o = L.P('y', BOARD.v2, BOARD.x, BOARD.z2), wpx = (BOARD.v2 - BOARD.v1) * HW;
    const t = place(r, 'site_text', pts, ctx => {
      ctx.save(); ctx.translate(o.x, o.y); ctx.transform(1, -0.5, 0, 1, 0, 0);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = css(0x2a2a2a);
      ctx.font = `10px ${FONT_UI}`; ctx.fillText('DAYS WITHOUT', wpx / 2, 17); ctx.fillText('ACCIDENT:', wpx / 2, 27);
      ctx.font = `bold 20px ${FONT_UI}`; ctx.fillStyle = css(0xb7342d); ctx.fillText('0', wpx / 2, 41);
      ctx.restore();
    }, depth + 0.1, 6);
    return t;
  });

  // lights, pigeon perches, smoke
  const flash = (u, v, z, c, a = 0.55) => { const p = C(u, v, z); r.lights.push({ x: p.x, y: p.y, r: 0.55, a, c, blink: true }); };
  flash(2.65, 0.55, 348, 0xff3b30); flash(0.1, 0.55, 320, 0xff3b30);
  flash(GATE[0], FV, 114, 0xffa51e, 0.5); flash(GATE[1], FV, 114, 0xffa51e, 0.5);
  const fire = C(2.55, 2.5, 46);
  r.lights.push({ x: fire.x, y: fire.y, r: 1.1, a: 0.45, c: 0xff9a3c, flicker: true },
    { x: fire.x, y: fire.y + 44, r: 1, sx: 2.6, sy: 1.1, a: 0.2, c: 0xff8a30, flicker: true, ground: true });
  r.smokeSpots.push({ x: fire.x, y: fire.y - 8 });
  for (const [u, v, z] of [[0.9, 0.9, 160], [1.9, 0.55, 316], [1.3, 2.9, 108]]) { const p = C(u, v, z); r.perches.push({ x: p.x, y: p.y }); }
}

// the building renderer calls drawHouse for every building: take over for the site only
if (!HomeCityBuildings.prototype.drawHouse.__constructionSite) {
  const baseDrawHouse = HomeCityBuildings.prototype.drawHouse;
  HomeCityBuildings.prototype.drawHouse = function drawHouse(b, art) {
    if (b.id === SITE_ID) return drawConstructionSite(this, b, art);
    return baseDrawHouse.call(this, b, art);
  };
  HomeCityBuildings.prototype.drawHouse.__constructionSite = true;
}