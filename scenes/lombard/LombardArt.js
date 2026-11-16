// =============================================================================
// LombardArt.js - procedural artwork for Honest Ziggy's Pawn (interior).
// Pure Canvas2D, design space 1920 x 1080 (flat front elevation).
// =============================================================================
export const ART_W = 1920, ART_H = 1080;
export { paintGlow } from '../church/ChurchArt.js';

const hex = n => '#' + (n & 0xffffff).toString(16).padStart(6, '0');
const C = c => (typeof c === 'number' ? hex(c) : c);
const hash = (x, y = 0, s = 0) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
const fillR = (ctx, x, y, w, h, c) => { ctx.fillStyle = C(c); ctx.fillRect(x, y, w, h); };
const circ = (ctx, x, y, r, c) => { ctx.fillStyle = C(c); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
const ell = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = C(c); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 7); ctx.fill(); };
const ln = (ctx, x1, y1, x2, y2, c, w = 1) => { ctx.strokeStyle = C(c); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
const grad = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([t, c]) => g.addColorStop(t, C(c))); return g; };
const rr = (ctx, x, y, w, h, r, c) => { ctx.fillStyle = C(c); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fill(); };

// ---------------------------------------------------------------- junk on the shelves
const ITEMS = {
  guitar(ctx, x, y) { ctx.save(); ctx.translate(x, y); ctx.rotate(-0.12);
    rr(ctx, -6, -150, 12, 100, 3, 0x3a2414); fillR(ctx, -9, -165, 18, 20, 0x2a1a0e);
    ell(ctx, 0, -28, 42, 34, 0xb8742e); ell(ctx, 0, -68, 30, 26, 0xb8742e); circ(ctx, 0, -40, 11, 0x1a0f08);
    ln(ctx, 0, -150, 0, -20, 0xd9d2b8, 1); fillR(ctx, -14, -16, 28, 5, 0x3a2414); ctx.restore(); },
  trumpet(ctx, x, y) { ctx.strokeStyle = C(0xd9aa38); ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 60, y - 30); ctx.lineTo(x + 40, y - 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 60, y - 52); ctx.lineTo(x + 30, y - 52); ctx.stroke();
    ctx.beginPath(); ctx.arc(x - 62, y - 41, 11, Math.PI / 2, -Math.PI / 2); ctx.stroke();
    ctx.fillStyle = C(0xd9aa38); ctx.beginPath(); ctx.moveTo(x + 30, y - 52); ctx.lineTo(x + 72, y - 78); ctx.lineTo(x + 72, y - 6); ctx.lineTo(x + 40, y - 30); ctx.closePath(); ctx.fill();
    for (const k of [-20, -4, 12]) fillR(ctx, x + k, y - 70, 5, 18, 0xf2d27a); ctx.lineCap = 'butt'; },
  clock(ctx, x, y) { circ(ctx, x, y - 52, 48, 0x5a3a1c); circ(ctx, x, y - 52, 41, 0xf1ead2);
    for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; ln(ctx, x + Math.sin(a) * 33, y - 52 - Math.cos(a) * 33, x + Math.sin(a) * 38, y - 52 - Math.cos(a) * 38, 0x2b2418, 2); }
    ln(ctx, x, y - 52, x + 2, y - 78, 0x2b2418, 3); ln(ctx, x, y - 52, x - 22, y - 44, 0x2b2418, 2); circ(ctx, x, y - 52, 3, 0xb7342d); },
  fish(ctx, x, y) { rr(ctx, x - 70, y - 100, 140, 80, 6, 0x5a3a1c); rr(ctx, x - 62, y - 92, 124, 64, 4, 0x7a5430);
    ell(ctx, x, y - 60, 44, 16, 0x3c86b8); ctx.fillStyle = C(0x3c86b8); ctx.beginPath(); ctx.moveTo(x + 38, y - 60); ctx.lineTo(x + 62, y - 78); ctx.lineTo(x + 62, y - 42); ctx.closePath(); ctx.fill();
    ell(ctx, x - 6, y - 52, 30, 7, 0xcfe4ee); circ(ctx, x - 30, y - 64, 3.2, 0x101010); ln(ctx, x - 14, y - 76, x + 6, y - 66, 0x2a6a98, 3); fillR(ctx, x - 20, y - 36, 40, 10, 0xd9b45a); },
  globe(ctx, x, y) { fillR(ctx, x - 4, y - 24, 8, 24, 0x3a2414); fillR(ctx, x - 24, y - 6, 48, 6, 0x3a2414);
    circ(ctx, x, y - 62, 38, 0x2f6f9a); ell(ctx, x - 10, y - 70, 14, 10, 0x4f9a56, 0.4); ell(ctx, x + 16, y - 52, 10, 14, 0x4f9a56, -0.3);
    ctx.strokeStyle = C(0xd9b45a); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 62, 44, -2.2, 0.6); ctx.stroke(); },
  helmet(ctx, x, y) { ctx.fillStyle = C(0x9aa2aa); ctx.beginPath(); ctx.arc(x, y - 55, 40, Math.PI, 0); ctx.lineTo(x + 40, y - 12); ctx.lineTo(x - 40, y - 12); ctx.closePath(); ctx.fill();
    fillR(ctx, x - 6, y - 98, 12, 22, 0xb7342d); fillR(ctx, x - 34, y - 54, 68, 8, 0x14161a); ln(ctx, x, y - 46, x, y - 12, 0x6e757c, 3); fillR(ctx, x - 30, y - 28, 60, 4, 0x14161a); },
  camera(ctx, x, y) { rr(ctx, x - 52, y - 70, 104, 62, 8, 0x2a2a2e); rr(ctx, x - 52, y - 70, 104, 20, 8, 0xb9bcc2); circ(ctx, x + 4, y - 36, 22, 0x14161a); circ(ctx, x + 4, y - 36, 15, 0x2c4a6a); circ(ctx, x - 1, y - 41, 4, 0xbcd8ff); fillR(ctx, x - 40, y - 82, 18, 12, 0x2a2a2e); },
  vase(ctx, x, y) { ctx.fillStyle = C(0x2f5aa8); ctx.beginPath(); ctx.moveTo(x - 14, y - 100); ctx.lineTo(x + 14, y - 100); ctx.quadraticCurveTo(x + 18, y - 70, x + 40, y - 46); ctx.quadraticCurveTo(x + 44, y - 8, x, y - 4); ctx.quadraticCurveTo(x - 44, y - 8, x - 40, y - 46); ctx.quadraticCurveTo(x - 18, y - 70, x - 14, y - 100); ctx.fill();
    ctx.strokeStyle = C(0xf1ead2); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 36, y - 38); ctx.quadraticCurveTo(x, y - 20, x + 36, y - 38); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 30, y - 22); ctx.quadraticCurveTo(x, y - 6, x + 30, y - 22); ctx.stroke(); },
  violin(ctx, x, y) { ctx.save(); ctx.translate(x, y - 48); ctx.rotate(0.5); ell(ctx, 0, 14, 24, 28, 0xa8501e); ell(ctx, 0, -14, 18, 20, 0xa8501e); fillR(ctx, -4, -70, 8, 50, 0x2a1a0e); ln(ctx, 0, -66, 0, 30, 0xe8dcb0, 1); fillR(ctx, -12, 26, 24, 4, 0x2a1a0e); ctx.restore(); },
  typewriter(ctx, x, y) { rr(ctx, x - 56, y - 52, 112, 46, 6, 0x2f3a36); fillR(ctx, x - 40, y - 76, 80, 28, 0x1c2421); fillR(ctx, x - 34, y - 90, 68, 20, 0xf1ead2); ln(ctx, x - 26, y - 82, x + 24, y - 82, 0x8a8472, 2);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) circ(ctx, x - 42 + c * 12, y - 40 + r * 10, 3.3, 0xd9d2b8); },
  tv(ctx, x, y) { rr(ctx, x - 62, y - 100, 124, 96, 10, 0x6a4a2e); rr(ctx, x - 50, y - 90, 82, 76, 14, 0x16221f); ell(ctx, x - 20, y - 68, 14, 8, 'rgba(180,230,210,0.25)', -0.5);
    circ(ctx, x + 46, y - 78, 6, 0xd9b45a); circ(ctx, x + 46, y - 58, 6, 0xd9b45a); ln(ctx, x - 20, y - 100, x - 40, y - 130, 0x9aa2aa, 3); ln(ctx, x - 20, y - 100, x, y - 128, 0x9aa2aa, 3); },
  boombox(ctx, x, y) { rr(ctx, x - 70, y - 64, 140, 58, 8, 0x2a2a2e); circ(ctx, x - 40, y - 34, 20, 0x14161a); circ(ctx, x + 40, y - 34, 20, 0x14161a); circ(ctx, x - 40, y - 34, 9, 0x6a6e76); circ(ctx, x + 40, y - 34, 9, 0x6a6e76);
    fillR(ctx, x - 16, y - 56, 32, 18, 0xe0463c); ln(ctx, x - 60, y - 64, x - 90, y - 100, 0x9aa2aa, 3); },
  lamp(ctx, x, y) { fillR(ctx, x - 3, y - 70, 6, 66, 0x3a2414); ell(ctx, x, y - 5, 22, 6, 0x3a2414); ctx.fillStyle = C(0xe8c872); ctx.beginPath(); ctx.moveTo(x - 20, y - 66); ctx.lineTo(x + 20, y - 66); ctx.lineTo(x + 40, y - 112); ctx.lineTo(x - 40, y - 112); ctx.closePath(); ctx.fill(); },
  teddy(ctx, x, y) { circ(ctx, x - 24, y - 92, 12, 0x8a5a32); circ(ctx, x + 24, y - 92, 12, 0x8a5a32); circ(ctx, x, y - 76, 28, 0xa8723e); ell(ctx, x, y - 30, 32, 34, 0xa8723e); circ(ctx, x - 40, y - 42, 11, 0xa8723e); circ(ctx, x + 40, y - 42, 11, 0xa8723e);
    ell(ctx, x, y - 66, 12, 9, 0xe8c896); circ(ctx, x - 10, y - 82, 3, 0x101010); circ(ctx, x + 10, y - 82, 3, 0x101010); circ(ctx, x, y - 68, 3.5, 0x101010); ctx.fillStyle = C(0xb7342d); ctx.fillRect(x - 28, y - 52, 56, 7); ln(ctx, x - 30, y - 82, x - 16, y - 72, 0xe8dcb0, 3); },
  microwave(ctx, x, y) { rr(ctx, x - 66, y - 70, 132, 64, 6, 0xb9b6a8); rr(ctx, x - 58, y - 62, 80, 48, 4, 0x1a2420); fillR(ctx, x + 32, y - 60, 24, 8, 0x2a2a2e); for (let i = 0; i < 4; i++) circ(ctx, x + 38 + (i % 2) * 14, y - 40 + Math.floor(i / 2) * 14, 4, 0x6a6e76); },
  bowling(ctx, x, y) { for (const [dx, c] of [[-30, 0x2f5aa8], [20, 0x8f1f2b]]) { circ(ctx, x + dx, y - 34, 30, c); circ(ctx, x + dx - 8, y - 44, 4, 0x101010); circ(ctx, x + dx + 4, y - 48, 4, 0x101010); circ(ctx, x + dx - 2, y - 36, 4, 0x101010); circ(ctx, x + dx - 10, y - 20, 8, 'rgba(255,255,255,0.14)'); } },
  sax(ctx, x, y) { ctx.strokeStyle = C(0xd9aa38); ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 20, y - 110); ctx.lineTo(x - 20, y - 30); ctx.quadraticCurveTo(x - 20, y - 4, x + 14, y - 8); ctx.lineTo(x + 36, y - 40); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = C(0xd9aa38); ctx.beginPath(); ctx.moveTo(x + 24, y - 42); ctx.lineTo(x + 50, y - 42); ctx.lineTo(x + 62, y - 66); ctx.lineTo(x + 12, y - 66); ctx.closePath(); ctx.fill(); ln(ctx, x - 20, y - 100, x - 4, y - 120, 0x2a1a0e, 5); for (let i = 0; i < 4; i++) circ(ctx, x - 20, y - 90 + i * 18, 4, 0xf2d27a); },
  toaster(ctx, x, y) { rr(ctx, x - 44, y - 50, 88, 44, 10, 0xc9ccd2); fillR(ctx, x - 30, y - 58, 20, 10, 0x2a2a2e); fillR(ctx, x + 6, y - 58, 20, 10, 0x2a2a2e); circ(ctx, x + 34, y - 28, 5, 0x2a2a2e); },
  box(ctx, x, y, w = 130, h = 70) { fillR(ctx, x - w / 2, y - h, w, h, 0xb98c52); fillR(ctx, x - w / 2, y - h, w, 12, 0xa07a44); fillR(ctx, x - 18, y - h + 16, 36, 22, 0xf1ead2); ln(ctx, x - 12, y - h + 24, x + 12, y - h + 24, 0x8a3a2a, 2); ln(ctx, x - 12, y - h + 31, x + 6, y - h + 31, 0x8a3a2a, 2); }
};

export const PAWN_SPOTS = { sign: { x: 960, y: 110 }, neon: { x: 1560, y: 210 }, lamp: { x: 960, y: 250 } };

export function paintLombardInterior(ctx) {
  const W = ART_W, H = ART_H;
  // wall: dark green wallpaper with stripes
  ctx.fillStyle = grad(ctx, 0, 0, 0, 800, [[0, 0x1d2e26], [1, 0x2d4538]]); ctx.fillRect(0, 0, W, 820);
  for (let x = 0; x < W; x += 60) fillR(ctx, x, 0, 26, 820, 'rgba(255,255,255,0.035)');
  for (let i = 0; i < 90; i++) fillR(ctx, hash(i, 1) * W, hash(i, 2) * 800, 3 + hash(i, 3) * 14, 2, 'rgba(0,0,0,0.12)');
  // wainscot
  fillR(ctx, 0, 690, W, 140, 0x3a2a1c); fillR(ctx, 0, 684, W, 10, 0x6a4a2c);
  for (let x = 20; x < W; x += 150) { rr(ctx, x, 710, 120, 100, 4, 0x2f2218); }
  // floor
  ctx.fillStyle = grad(ctx, 0, 820, 0, H, [[0, 0x5a3c22], [1, 0x2e1e12]]); ctx.fillRect(0, 820, W, H - 820);
  for (let x = -200; x < W + 200; x += 130) { ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(960 + (x - 960) * 0.55, 820); ctx.lineTo(x, H); ctx.stroke(); }
  fillR(ctx, 0, 820, W, 8, 0x1a110a);

  // shelves (3 rows) behind the counter
  const rows = [{ y: 330, items: [['trumpet', 420], ['clock', 600], ['fish', 800], ['globe', 1030], ['helmet', 1220], ['camera', 1400]] },
    { y: 520, items: [['typewriter', 400], ['tv', 590], ['boombox', 800], ['lamp', 1010], ['teddy', 1200], ['microwave', 1400]] },
    { y: 700, items: [['bowling', 420], ['toaster', 580], ['box', 720], ['box', 1200], ['sax', 1400]] }];
  for (const r of rows) {
    fillR(ctx, 330, r.y - 2, 1320, 16, 0x5a3c22); fillR(ctx, 330, r.y + 14, 1320, 6, 0x2a1a0e); fillR(ctx, 330, r.y - 2, 1320, 3, 0x8a6240);
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(330, r.y - 150, 1320, 150);
    for (const [name, x] of r.items) ITEMS[name](ctx, x, r.y - 2);
  }
  fillR(ctx, 314, 190, 16, 540, 0x3a2414); fillR(ctx, 1650, 190, 16, 540, 0x3a2414);

  // grandfather clock (left)
  const gx = 130, gy = 330;
  rr(ctx, gx - 20, gy - 40, 150, 520, 10, 0x4a2c16); rr(ctx, gx + 4, gy - 16, 102, 90, 8, 0xf1ead2);
  circ(ctx, gx + 55, gy + 28, 36, 0xfaf4e0); for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; ln(ctx, gx + 55 + Math.sin(a) * 28, gy + 28 - Math.cos(a) * 28, gx + 55 + Math.sin(a) * 33, gy + 28 - Math.cos(a) * 33, 0x2b2418, 2); }
  ln(ctx, gx + 55, gy + 28, gx + 55, gy + 4, 0x2b2418, 3); ln(ctx, gx + 55, gy + 28, gx + 72, gy + 36, 0x2b2418, 2);
  rr(ctx, gx + 4, gy + 100, 102, 290, 6, 0x1c120a); fillR(ctx, gx + 50, gy + 120, 10, 190, 0xc9a24a); circ(ctx, gx + 55, gy + 330, 24, 0xd9b45a); circ(ctx, gx + 49, gy + 324, 8, 0xfff0b8);
  // safe (right)
  const sx = 1700, sy = 560;
  rr(ctx, sx, sy, 190, 250, 10, 0x2a2e33); rr(ctx, sx + 10, sy + 10, 170, 230, 8, 0x3a4048);
  circ(ctx, sx + 95, sy + 110, 44, 0x1c2024); circ(ctx, sx + 95, sy + 110, 36, 0x6a7078); circ(ctx, sx + 95, sy + 110, 8, 0xd9b45a);
  for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; ln(ctx, sx + 95 + Math.sin(a) * 28, sy + 110 - Math.cos(a) * 28, sx + 95 + Math.sin(a) * 34, sy + 110 - Math.cos(a) * 34, 0x1c2024, 2); }
  fillR(ctx, sx + 140, sy + 190, 30, 10, 0xd9b45a); fillR(ctx, sx + 20, sy + 250, 20, 16, 0x1a1c20); fillR(ctx, sx + 150, sy + 250, 20, 16, 0x1a1c20);
  // hanging three-ball sign + lamp cord
  ln(ctx, 960, 0, 960, 60, 0x14110e, 4); ln(ctx, 880, 60, 1040, 60, 0x14110e, 6);
  for (const [bx, by] of [[900, 112], [1020, 112], [960, 190]]) { ln(ctx, bx > 960 ? 1030 : bx < 960 ? 890 : 960, 60, bx, by - 30, 0x14110e, 2); circ(ctx, bx, by, 38, 0xc8962a); circ(ctx, bx - 6, by - 6, 28, 0xe8be4a); circ(ctx, bx - 14, by - 14, 9, 0xfff3c4); }
  // framed notice board (text is added by the scene)
  rr(ctx, 1440, 130, 290, 150, 8, 0x14110e); rr(ctx, 1448, 138, 274, 134, 6, 0xe8dcb0);
  // hanging lamp
  ln(ctx, 960, 250, 960, 300, 0x14110e, 3);

  // ---- counter, glass case, cage -------------------------------------------------
  // counter
  rr(ctx, 260, 780, 1400, 24, 6, 0x8a5a30); fillR(ctx, 260, 780, 1400, 5, 0xc89a64);
  ctx.fillStyle = grad(ctx, 0, 804, 0, 1010, [[0, 0x5a3820], [1, 0x331f10]]); ctx.fillRect(268, 804, 1384, 206);
  for (let x = 292; x < 1640; x += 175) { rr(ctx, x, 830, 150, 150, 6, 0x3f2814); rr(ctx, x + 10, 840, 130, 130, 4, 0x4c321a); }
  fillR(ctx, 268, 1000, 1384, 14, 0x1a110a);
  // glass case on the counter (left): jewellery + one very suspicious watch
  rr(ctx, 300, 690, 330, 90, 4, 'rgba(160,200,200,0.22)'); fillR(ctx, 300, 688, 330, 4, 0xb08a3a); fillR(ctx, 300, 776, 330, 6, 0xb08a3a);
  fillR(ctx, 308, 742, 314, 34, 0x14304a);
  for (let i = 0; i < 6; i++) { circ(ctx, 340 + i * 48, 758, 9, [0xd9b45a, 0xe0463c, 0xdfe8f0, 0x2e8a57, 0xd9b45a, 0x6d3f9a][i]); circ(ctx, 337 + i * 48, 755, 3, 'rgba(255,255,255,0.7)'); }
  circ(ctx, 580, 724, 20, 0xd9b45a); circ(ctx, 580, 724, 16, 0xf1ead2); ln(ctx, 580, 724, 580, 712, 0x2b2418, 2); ln(ctx, 580, 724, 590, 728, 0x2b2418, 2);
  ln(ctx, 580, 704, 580, 690, 0xd9b45a, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.moveTo(310, 692); ctx.lineTo(400, 692); ctx.lineTo(340, 778); ctx.lineTo(310, 778); ctx.fill();
  // bell + cash register on the right of the counter
  rr(ctx, 1320, 700, 230, 80, 6, 0xb8a070); rr(ctx, 1332, 712, 120, 34, 4, 0x1a2a26); for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) rr(ctx, 1470 + c * 18, 712 + r * 20, 14, 14, 2, 0x4a3a22);
  ell(ctx, 1420, 690, 22, 10, 0xd9b45a); circ(ctx, 1420, 686, 5, 0xfff0b8);

  // vignette
  const v = ctx.createRadialGradient(960, 520, 360, 960, 520, 1200); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

// Brass cage in front of the broker (drawn as an overlay above Ziggy). Placed at CAGE.x, CAGE.y.
export const CAGE = { x: 690, y: 560, w: 540, h: 240 };
export function paintCage(ctx) {
  const { w, h } = CAGE;
  fillR(ctx, 0, 0, w, 10, 0xb08a3a); fillR(ctx, 0, h - 14, w, 14, 0xb08a3a);
  for (let x = 0; x <= w - 6; x += 30) { fillR(ctx, x, 0, 6, h, 0xb08a3a); fillR(ctx, x + 6, 0, 3, h, 'rgba(255,240,184,0.28)'); }
}

// ----------------------------------------------------------------------- Ziggy
export const ZIGGY_SIZE = { w: 300, h: 330 };
export function paintZiggy(ctx) {
  const w = ZIGGY_SIZE.w, cx = w / 2;
  // torso: striped vest over a shirt
  ctx.fillStyle = C(0xe8e2cf); ctx.beginPath(); ctx.moveTo(cx - 100, 330); ctx.lineTo(cx - 80, 190); ctx.lineTo(cx + 80, 190); ctx.lineTo(cx + 100, 330); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C(0x6a2a2e); ctx.beginPath(); ctx.moveTo(cx - 96, 330); ctx.lineTo(cx - 76, 196); ctx.lineTo(cx - 22, 196); ctx.lineTo(cx - 10, 330); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx + 96, 330); ctx.lineTo(cx + 76, 196); ctx.lineTo(cx + 22, 196); ctx.lineTo(cx + 10, 330); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 5; i++) { circ(ctx, cx - 14, 230 + i * 20, 4, 0xd9b45a); }
  ln(ctx, cx, 196, cx, 330, 0x14110e, 2);
  // tie + gold chain
  ctx.fillStyle = C(0xb8372f); ctx.beginPath(); ctx.moveTo(cx - 8, 196); ctx.lineTo(cx + 8, 196); ctx.lineTo(cx + 12, 260); ctx.lineTo(cx, 276); ctx.lineTo(cx - 12, 260); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = C(0xd9b45a); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - 60, 200); ctx.quadraticCurveTo(cx, 276, cx + 60, 200); ctx.stroke();
  circ(ctx, cx, 262, 9, 0xd9b45a); circ(ctx, cx, 262, 5, 0xfff0b8);
  // arms resting on the counter, ringed fingers
  ctx.fillStyle = C(0xe8e2cf); ctx.fillRect(cx - 110, 270, 48, 60); ctx.fillRect(cx + 62, 270, 48, 60);
  for (const x of [cx - 100, cx + 72]) { ell(ctx, x + 14, 316, 28, 14, 0xd9a883); for (let i = 0; i < 3; i++) circ(ctx, x + 2 + i * 12, 310, 4, 0xd9b45a); }
  // neck + head
  ctx.fillStyle = C(0xd9a883); ctx.fillRect(cx - 24, 168, 48, 34);
  ell(ctx, cx, 112, 62, 66, 0xe0b08a);
  ell(ctx, cx - 62, 120, 10, 18, 0xd0a07a); ell(ctx, cx + 62, 120, 10, 18, 0xd0a07a);
  // slicked hair tufts
  ctx.fillStyle = C(0x1a1410); ctx.beginPath(); ctx.moveTo(cx - 60, 82); ctx.quadraticCurveTo(cx - 40, 38, cx, 40); ctx.quadraticCurveTo(cx + 40, 38, cx + 60, 82); ctx.quadraticCurveTo(cx + 30, 58, cx, 62); ctx.quadraticCurveTo(cx - 30, 58, cx - 60, 82); ctx.fill();
  // green visor
  ctx.fillStyle = C(0x2f7a4d); ctx.beginPath(); ctx.moveTo(cx - 70, 80); ctx.quadraticCurveTo(cx, 50, cx + 70, 80); ctx.lineTo(cx + 100, 92); ctx.lineTo(cx - 100, 92); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(cx - 100, 90, 200, 2);
  // jeweller's loupe
  circ(ctx, cx + 36, 102, 17, 0x2a2a2e); circ(ctx, cx + 36, 102, 12, 'rgba(190,225,240,0.6)'); ln(ctx, cx + 36, 86, cx + 36, 80, 0x2a2a2e, 3);
  // eyes (one huge through the loupe)
  circ(ctx, cx - 26, 108, 12, 0xf6f1e3); circ(ctx, cx - 24, 109, 5, 0x2a1a10);
  circ(ctx, cx + 36, 104, 11, 0xf6f1e3); circ(ctx, cx + 37, 105, 6, 0x2a1a10);
  ctx.strokeStyle = C(0x1a1410); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx - 42, 92); ctx.lineTo(cx - 12, 96); ctx.stroke();
  // nose + big moustache
  ctx.fillStyle = C(0xd49a76); ctx.beginPath(); ctx.moveTo(cx - 8, 112); ctx.lineTo(cx + 8, 112); ctx.lineTo(cx + 12, 142); ctx.lineTo(cx - 12, 142); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C(0x1a1410); ctx.beginPath(); ctx.moveTo(cx, 146); ctx.quadraticCurveTo(cx - 40, 130, cx - 62, 158); ctx.quadraticCurveTo(cx - 30, 160, cx, 156); ctx.quadraticCurveTo(cx + 30, 160, cx + 62, 158); ctx.quadraticCurveTo(cx + 40, 130, cx, 146); ctx.fill();
  // grin with gold tooth
  ctx.fillStyle = C(0x4a1a16); ctx.beginPath(); ctx.moveTo(cx - 30, 166); ctx.quadraticCurveTo(cx, 190, cx + 30, 166); ctx.quadraticCurveTo(cx, 172, cx - 30, 166); ctx.fill();
  ctx.fillStyle = C(0xf6f1e3); ctx.fillRect(cx - 24, 166, 48, 6); ctx.fillStyle = C(0xe8be4a); ctx.fillRect(cx + 10, 166, 9, 8);
}
export function paintZiggyPortrait(ctx, size = 180) {
  ctx.save(); ctx.scale(size / 120, size / 120);
  ctx.fillStyle = C(0x1d2e26); ctx.fillRect(0, 0, 120, 120);
  ctx.fillStyle = C(0x6a2a2e); ctx.fillRect(8, 98, 104, 22); ctx.fillStyle = C(0xe8e2cf); ctx.fillRect(40, 98, 40, 22); ctx.fillStyle = C(0xb8372f); ctx.fillRect(56, 98, 8, 22);
  ell(ctx, 60, 56, 30, 34, 0xe0b08a);
  ctx.fillStyle = C(0x2f7a4d); ctx.beginPath(); ctx.moveTo(26, 40); ctx.quadraticCurveTo(60, 20, 94, 40); ctx.lineTo(108, 46); ctx.lineTo(12, 46); ctx.closePath(); ctx.fill();
  circ(ctx, 78, 52, 8, 0x2a2a2e); circ(ctx, 78, 52, 5.5, 'rgba(190,225,240,0.6)');
  circ(ctx, 48, 55, 5.5, 0xf6f1e3); circ(ctx, 49, 56, 2.4, 0x2a1a10); circ(ctx, 78, 53, 5, 0xf6f1e3); circ(ctx, 79, 54, 2.8, 0x2a1a10);
  ctx.fillStyle = C(0x1a1410); ctx.beginPath(); ctx.moveTo(60, 72); ctx.quadraticCurveTo(42, 62, 30, 78); ctx.quadraticCurveTo(46, 80, 60, 77); ctx.quadraticCurveTo(74, 80, 90, 78); ctx.quadraticCurveTo(78, 62, 60, 72); ctx.fill();
  ctx.fillStyle = C(0x4a1a16); ctx.beginPath(); ctx.moveTo(46, 84); ctx.quadraticCurveTo(60, 96, 74, 84); ctx.quadraticCurveTo(60, 88, 46, 84); ctx.fill(); ctx.fillStyle = C(0xe8be4a); ctx.fillRect(64, 84, 5, 4);
  ctx.restore();
}