import { css, light, dark, hash, pp, poly, rect, circle, ellipse, line, vgrad, hgrad, shadow, S, isoBox, blob } from './HomeCityDrawing.js';
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


export { PROP_ART, treeArt, drawCar, CAR_COLORS, drawPerson, PEOPLE };
