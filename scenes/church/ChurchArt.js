// =============================================================================
// ChurchArt.js - procedural artwork for the interior of St. John Church.
// Pure Canvas2D (no Phaser, no dialogue catalog) so it can be baked into a
// texture by ChurchScene and tested in isolation. Design space: 1920 x 1080.
// =============================================================================
export const ART_W = 1920, ART_H = 1080;

// One-point perspective: vanishing point (960, 430), back wall at Z = 1.
const VPX = 960, VPY = 430, K = 131;
const WALL = 2.2, FLOOR = -1.6, NEAR = 0.3, FAR = 1.0;
const P = (X, Y, Z) => ({ x: VPX + (X * K) / Z, y: VPY - (Y * K) / Z });

const hex = n => '#' + (n & 0xffffff).toString(16).padStart(6, '0');
const rgba = (n, a) => `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
const mix = (a, b, t) => {
  const r = (a >> 16) & 255, g = (a >> 8) & 255, bl = a & 255;
  return ((Math.round(r + (((b >> 16) & 255) - r) * t) << 16) |
    (Math.round(g + (((b >> 8) & 255) - g) * t) << 8) | Math.round(bl + ((b & 255) - bl) * t));
};
const hash = (x, y = 0, s = 0) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };

function path(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); }
function poly(ctx, pts, fill, stroke = null, lw = 1) {
  path(ctx, pts);
  if (fill != null) { ctx.fillStyle = typeof fill === 'number' ? hex(fill) : fill; ctx.fill(); }
  if (stroke != null) { ctx.lineWidth = lw; ctx.strokeStyle = typeof stroke === 'number' ? hex(stroke) : stroke; ctx.stroke(); }
}
function line(ctx, a, b, color, w = 1) {
  ctx.strokeStyle = typeof color === 'number' ? hex(color) : color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}
function vgrad(ctx, y0, y1, stops) { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(([t, c]) => g.addColorStop(t, typeof c === 'number' ? hex(c) : c)); return g; }
function hgrad(ctx, x0, x1, stops) { const g = ctx.createLinearGradient(x0, 0, x1, 0); stops.forEach(([t, c]) => g.addColorStop(t, typeof c === 'number' ? hex(c) : c)); return g; }

// Pointed (lancet) arch outline between two bottom points, in screen space.
// `lift` is how many pixels the tip rises above the straight top edge.
function lancet(a, b, spring, lift, steps = 10) {
  // a = bottom-left, b = bottom-right, `spring` = vertical px of the straight sides.
  const pts = [a, { x: a.x, y: a.y - spring }];
  const left = t => ({ x: a.x + (b.x - a.x) * t, y: a.y - spring - lift * Math.sqrt(Math.max(0, 1 - (1 - 2 * t) * (1 - 2 * t) * 1)) * 0 });
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * 0.5;                 // 0 .. 0.5
    const h = Math.sqrt(Math.max(0, 1 - (1 - 2 * t) * (1 - 2 * t))); // circular arc, equals 0 at t=0 and ~0.866..1 at the tip
    pts.push({ x: a.x + (b.x - a.x) * t, y: a.y - spring - lift * h });
  }
  for (let i = steps - 1; i >= 0; i--) {
    const t = 1 - (i / steps) * 0.5;             // 0.5 .. 1
    const h = Math.sqrt(Math.max(0, 1 - (2 * t - 1) * (2 * t - 1)));
    pts.push({ x: a.x + (b.x - a.x) * t, y: b.y - spring - lift * h });
  }
  pts.push({ x: b.x, y: b.y - spring }, b);
  void left; return pts;
}

const GLASS = [0x2f5aa8, 0xb8372f, 0xdba93a, 0x2e8a57, 0x6d3f9a, 0x3c86b8];

// Colourful stained glass, clipped to `outline`, laid out in the box (x0..x1, y0..y1).
function stainedGlass(ctx, outline, x0, y0, x1, y1, seed, cols = 3, rows = 9, bright = 1) {
  ctx.save(); path(ctx, outline); ctx.clip();
  ctx.fillStyle = '#15121c'; ctx.fillRect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8);
  const cw = (x1 - x0) / cols, rh = (y1 - y0) / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const base = GLASS[Math.floor(hash(c, r, seed) * GLASS.length)];
    const color = mix(0x000000, base, 0.55 + 0.45 * bright * (0.6 + 0.4 * hash(r, c, seed + 3)));
    ctx.fillStyle = hex(color); ctx.fillRect(x0 + c * cw + 1.2, y0 + r * rh + 1.2, cw - 2.4, rh - 2.4);
  }
  // soft light from the top of the glass
  ctx.fillStyle = vgrad(ctx, y0, y1, [[0, 'rgba(255,240,200,0.22)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.18)']]);
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
  path(ctx, outline); ctx.lineWidth = 3; ctx.strokeStyle = '#2b2118'; ctx.stroke();
}

function stoneTexture(ctx, pts, seed, density = 80) {
  ctx.save(); path(ctx, pts); ctx.clip();
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  for (let i = 0; i < density; i++) {
    const x = x0 + hash(i, seed, 1) * (x1 - x0), y = y0 + hash(seed, i, 2) * (y1 - y0), s = 2 + hash(i, i, 3) * 6;
    ctx.fillStyle = hash(i, seed, 4) > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.07)'; ctx.fillRect(x, y, s * 2, s);
  }
  ctx.restore();
}

export function paintChurchInterior(ctx) {
  const W = ART_W, H = ART_H;
  ctx.fillStyle = '#0d0b10'; ctx.fillRect(0, 0, W, H);

  // ---- shell: ceiling / vault, walls, floor --------------------------------
  const wallTop = 1.4;
  const backL = P(-WALL, 0, FAR), backR = P(WALL, 0, FAR);
  const nearTopL = P(-WALL, wallTop, NEAR), nearTopR = P(WALL, wallTop, NEAR);
  const backTopL = P(-WALL, wallTop, FAR), backTopR = P(WALL, wallTop, FAR);
  const floorNearL = P(-WALL, FLOOR, NEAR), floorNearR = P(WALL, FLOOR, NEAR);
  const floorBackL = P(-WALL, FLOOR, FAR), floorBackR = P(WALL, FLOOR, FAR);

  // vault (everything above the wall line)
  ctx.fillStyle = vgrad(ctx, 0, VPY, [[0, '#17141b'], [0.55, '#2a2430'], [1, '#463b45']]); ctx.fillRect(0, 0, W, H);

  // side walls
  const leftWall = [{ x: -40, y: nearTopL.y }, backTopL, floorBackL, { x: -40, y: H + 40 }];
  const rightWall = [{ x: W + 40, y: nearTopR.y }, backTopR, floorBackR, { x: W + 40, y: H + 40 }];
  poly(ctx, [{ x: -40, y: -40 }, backTopL, floorBackL, { x: -40, y: H + 40 }], null);
  for (const [wall, side] of [[leftWall, -1], [rightWall, 1]]) {
    const g = ctx.createLinearGradient(side < 0 ? 0 : W, 0, side < 0 ? 760 : W - 760, 0);
    g.addColorStop(0, '#2c2620'); g.addColorStop(1, '#6d5f4e');
    poly(ctx, wall, g); stoneTexture(ctx, wall, side + 3, 140);
  }
  // masonry courses on the walls (lines converge on the vanishing point)
  ctx.lineWidth = 1;
  for (const side of [-1, 1]) for (let Y = -1.4; Y <= 1.4; Y += 0.28) {
    const a = P(side * WALL, Y, NEAR), b = P(side * WALL, Y, FAR);
    line(ctx, a, b, 'rgba(0,0,0,0.20)', 1);
  }

  // back wall
  const back = [backL, backR, backTopR, backTopL];
  const backWallFull = [floorBackL, floorBackR, backTopR, { x: 960 + 0.0, y: P(0, 2.6, FAR).y }, backTopL];
  poly(ctx, backWallFull, vgrad(ctx, 90, 650, [[0, '#5a4c40'], [1, '#8a7860']]));
  stoneTexture(ctx, backWallFull, 9, 160); void back;

  // floor (stone slabs)
  const floorPoly = [floorNearL, floorNearR, floorBackR, floorBackL];
  poly(ctx, floorPoly, vgrad(ctx, 640, H, [[0, '#4a4036'], [1, '#2a241f']]));
  const rows = []; for (let Z = NEAR; Z <= FAR + 0.001; Z += 0.07) rows.push(Z);
  for (let i = 0; i < rows.length - 1; i++) for (let j = -4; j < 4; j++) {
    const X0 = j * 0.55, X1 = X0 + 0.55, Z0 = rows[i], Z1 = rows[i + 1];
    const tile = [P(X0, FLOOR, Z0), P(X1, FLOOR, Z0), P(X1, FLOOR, Z1), P(X0, FLOOR, Z1)];
    const dark = (i + j) % 2 === 0;
    poly(ctx, tile, dark ? 'rgba(20,16,12,0.30)' : 'rgba(255,240,210,0.05)', 'rgba(0,0,0,0.22)', 1);
  }

  // ---- stone arcade: pillars + stained-glass windows on both walls -----------
  const pillarZ = [0.31, 0.385, 0.475, 0.58, 0.705, 0.85, 0.99];
  const windows = [];
  for (const side of [-1, 1]) {
    for (let i = 1; i < pillarZ.length - 1; i++) {
      const Za = pillarZ[i] + 0.012, Zb = pillarZ[i + 1] - 0.012;
      const a = P(side * WALL, 0.05, Za), b = P(side * WALL, 0.05, Zb);
      const topA = P(side * WALL, 0.95, Za), topB = P(side * WALL, 0.95, Zb);
      const spring = a.y - topA.y, spring2 = b.y - topB.y;
      const lo = side < 0 ? [a, b] : [b, a];             // keep a->b left to right on screen
      const left = lo[0], right = lo[1];
      const sp = (left.y - (side < 0 ? topA.y : topB.y)), sp2 = (right.y - (side < 0 ? topB.y : topA.y));
      void spring; void spring2; void sp2;
      const width = Math.abs(right.x - left.x), lift = width * 0.95;
      const bl = { x: left.x, y: left.y }, br = { x: right.x, y: right.y };
      // slanted bottom/top edges: lancet() assumes level sills, so correct with a skew afterwards.
      const outline = lancet(bl, { x: br.x, y: bl.y }, sp, lift, 12);
      const skew = (br.y - bl.y);
      const tilted = outline.map(p => ({ x: p.x, y: p.y + skew * ((p.x - bl.x) / (br.x - bl.x || 1)) }));
      const frame = lancet({ x: bl.x - 5, y: bl.y + 5 }, { x: br.x + 5, y: bl.y + 5 }, sp + 8, lift + 10, 12)
        .map(p => ({ x: p.x, y: p.y + skew * ((p.x - bl.x) / (br.x - bl.x || 1)) }));
      poly(ctx, frame, 0x9a8a70, 0x2b2118, 2);
      const topY = Math.min(...tilted.map(p => p.y));
      stainedGlass(ctx, tilted, left.x, topY, right.x, Math.max(left.y, right.y), i * 5 + (side > 0 ? 40 : 0), 2, 10, 1);
      windows.push({ left, right, topY, side, i, width });
    }
    // pillars
    for (const Z of pillarZ) {
      const x = P(side * WALL, 0, Z).x, wpx = 14 * (0.6 / Z) + 3;
      const yTop = P(side * WALL, wallTop, Z).y, yBot = P(side * WALL, FLOOR, Z).y;
      ctx.fillStyle = hgrad(ctx, x - wpx, x + wpx, [[0, '#4b4034'], [0.5, '#9a8a72'], [1, '#42382d']]);
      ctx.fillRect(x - wpx, yTop, wpx * 2, yBot - yTop);
    }
  }

  // light shafts falling from the windows onto the floor
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const w of windows) {
    const fy = (w.left.y + w.right.y) / 2;
    const dir = w.side < 0 ? 1 : -1;
    const ground = fy + 120 + (1 - w.width / 220) * 160;
    const tint = [0xffd9a0, 0x9fc4ff, 0xffb0a0, 0xb0ffc0][w.i % 4];
    const shaft = [{ x: w.left.x, y: fy - 30 }, { x: w.right.x, y: fy - 30 }, { x: w.right.x + dir * (w.width * 1.6 + 50), y: ground }, { x: w.left.x + dir * (w.width * 1.2 + 20), y: ground + 20 }];
    const g = ctx.createLinearGradient(0, fy - 30, 0, ground); g.addColorStop(0, rgba(tint, 0.16)); g.addColorStop(1, rgba(tint, 0));
    poly(ctx, shaft, g);
  }
  ctx.restore();

  // ---- vault ribs --------------------------------------------------------------
  ctx.lineCap = 'round';
  for (const Z of [0.34, 0.44, 0.56, 0.70, 0.86, 1.0]) {
    const L = P(-WALL, wallTop, Z), R = P(WALL, wallTop, Z), apex = P(0, 2.7, Z);
    const c1 = P(-WALL * 0.95, 2.35, Z), c2 = P(WALL * 0.95, 2.35, Z);
    ctx.lineWidth = Math.max(3, 20 * (0.5 / Z)); ctx.strokeStyle = 'rgba(30,24,22,0.85)';
    ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.quadraticCurveTo(c1.x, c1.y, apex.x, apex.y); ctx.quadraticCurveTo(c2.x, c2.y, R.x, R.y); ctx.stroke();
    ctx.lineWidth = Math.max(1.5, 8 * (0.5 / Z)); ctx.strokeStyle = 'rgba(170,150,120,0.45)'; ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // ridge line down the middle of the vault
  line(ctx, P(0, 2.7, NEAR), P(0, 2.7, FAR), 'rgba(0,0,0,0.35)', 3);

  // ---- carpet ------------------------------------------------------------------
  const carpet = [P(-0.5, FLOOR, NEAR), P(0.5, FLOOR, NEAR), P(0.5, FLOOR, 0.97), P(-0.5, FLOOR, 0.97)];
  poly(ctx, carpet, vgrad(ctx, 640, H, [[0, '#6a161f'], [1, '#8d2330']]));
  for (const X of [-0.43, 0.43]) line(ctx, P(X, FLOOR, NEAR), P(X, FLOOR, 0.97), 0xc9a24a, 5);
  for (const X of [-0.5, 0.5]) line(ctx, P(X, FLOOR, NEAR), P(X, FLOOR, 0.97), 'rgba(0,0,0,0.35)', 3);

  // ---- apse: altar, big window, steps -------------------------------------------
  // steps in front of the altar
  poly(ctx, [P(-1.1, FLOOR, 0.93), P(1.1, FLOOR, 0.93), P(1.1, FLOOR, 0.985), P(-1.1, FLOOR, 0.985)], 0x7c6e5c, 0x3b332a);
  poly(ctx, [P(-1.0, FLOOR + 0.12, 0.985), P(1.0, FLOOR + 0.12, 0.985), P(1.0, FLOOR + 0.12, 1.0), P(-1.0, FLOOR + 0.12, 1.0)], 0x8a7b66);
  // great east window
  const wl = P(-0.75, 0.2, FAR), wr = P(0.75, 0.2, FAR), wSpring = P(0, 1.35, FAR).y;
  const springPx = wl.y - wSpring, winLift = (wr.x - wl.x) * 0.95;
  const great = lancet(wl, wr, springPx, winLift, 16);
  poly(ctx, lancet({ x: wl.x - 10, y: wl.y + 10 }, { x: wr.x + 10, y: wl.y + 10 }, springPx + 10, winLift + 12, 16), 0xa89a82, 0x2b2118, 3);
  stainedGlass(ctx, great, wl.x, Math.min(...great.map(p => p.y)), wr.x, wl.y, 77, 5, 14, 1.15);
  // St. John in the window: halo, robe, book
  const cx = 960, topY = Math.min(...great.map(p => p.y));
  ctx.save(); path(ctx, great); ctx.clip();
  ctx.fillStyle = 'rgba(255,230,140,0.9)'; ctx.beginPath(); ctx.arc(cx, topY + 150, 44, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,248,214,0.95)'; ctx.beginPath(); ctx.arc(cx, topY + 150, 30, 0, 7); ctx.fill();
  ctx.fillStyle = '#7a1c28'; poly(ctx, [{ x: cx - 52, y: wl.y }, { x: cx + 52, y: wl.y }, { x: cx + 30, y: topY + 188 }, { x: cx - 30, y: topY + 188 }], '#7a1c28');
  ctx.fillStyle = '#e9d9a8'; ctx.fillRect(cx - 14, topY + 232, 28, 22);
  ctx.fillStyle = '#2d62a6'; ctx.fillRect(cx + 26, topY + 236, 16, 30);              // the (unexplained) fish
  ctx.fillStyle = '#5c8ac4'; poly(ctx, [{ x: cx + 42, y: topY + 251 }, { x: cx + 54, y: topY + 240 }, { x: cx + 54, y: topY + 262 }], '#5c8ac4');
  ctx.restore();
  // mullions of the great window
  for (const k of [-0.5, -0.25, 0, 0.25, 0.5]) { const a = P(k * 1.5, 0.2, FAR), b = { x: a.x, y: topY + 30 }; line(ctx, a, b, 'rgba(25,18,14,0.9)', 3); }

  // altar
  const al = P(-0.62, FLOOR + 0.12, 0.99), ar = P(0.62, FLOOR + 0.12, 0.99), at = P(0, -0.82, 0.99).y;
  ctx.fillStyle = vgrad(ctx, at, al.y, [[0, '#f1ead8'], [1, '#c9bfa6']]); ctx.fillRect(al.x, at, ar.x - al.x, al.y - at);
  ctx.fillStyle = '#c9a24a'; ctx.fillRect(al.x - 6, at - 6, ar.x - al.x + 12, 8); ctx.fillRect(al.x, at + 26, ar.x - al.x, 5);
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(al.x, al.y - 10, ar.x - al.x, 10);
  // "Holy Mug" tea ring
  ctx.strokeStyle = 'rgba(120,80,40,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(al.x + 40, at - 4, 9, 3, 0, 0, 7); ctx.stroke();
  // cross
  ctx.fillStyle = '#d9b45a'; ctx.fillRect(cx - 5, at - 78, 10, 72); ctx.fillRect(cx - 22, at - 62, 44, 9);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(cx - 5, at - 78, 3, 72);
  // altar candlesticks
  for (const dx of [-72, 72]) {
    ctx.fillStyle = '#c9a24a'; ctx.fillRect(cx + dx - 9, at - 5, 18, 5); ctx.fillRect(cx + dx - 3, at - 34, 6, 30);
    ctx.fillStyle = '#f4ecd2'; ctx.fillRect(cx + dx - 5, at - 58, 10, 26);
  }

  // ---- pews ----------------------------------------------------------------------
  const pewZ = [0.37, 0.455, 0.555, 0.675, 0.82];
  for (const side of [-1, 1]) for (const Z of pewZ) {
    const x0 = side < 0 ? -1.95 : 0.62, x1 = side < 0 ? -0.62 : 1.95;
    const dz = 0.03, back = 0.78 + 0, seat = -1.28;
    const faceA = [P(x0, seat - 0.3, Z), P(x1, seat - 0.3, Z), P(x1, -0.86, Z), P(x0, -0.86, Z)];
    poly(ctx, faceA, vgrad(ctx, P(0, -0.86, Z).y, P(0, seat - 0.3, Z).y, [[0, '#4a2c1a'], [1, '#2e1a0f']]), '#1b0e07', 1.5);
    poly(ctx, [P(x0, -0.86, Z), P(x1, -0.86, Z), P(x1, -0.86, Z + dz), P(x0, -0.86, Z + dz)], '#6b4529', '#1b0e07', 1);
    // vertical slats
    const n = 8; for (let k = 1; k < n; k++) { const X = x0 + ((x1 - x0) * k) / n; line(ctx, P(X, seat - 0.3, Z), P(X, -0.9, Z), 'rgba(0,0,0,0.28)', 1.5); }
    void back;
  }
  // somebody carved into the front pew
  const gx = P(-1.35, -1.05, 0.37); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(gx.x, gx.y, 38, 3); ctx.fillRect(gx.x + 6, gx.y + 8, 24, 3);

  // ---- organ on the left: pipes behind, console in front ---------------------------------
  {
    const Zs = [0.515, 0.545, 0.575, 0.605, 0.635, 0.665, 0.695];
    const hs = [0.95, 1.3, 1.1, 1.45, 1.15, 1.3, 1.0];
    Zs.forEach((Z, i) => {
      const base = P(-WALL + 0.3, -0.3, Z), top = P(-WALL + 0.3, hs[i], Z), wpx = 15 * (0.55 / Z);
      ctx.fillStyle = hgrad(ctx, base.x - wpx, base.x + wpx, [[0, '#8f8a80'], [0.45, '#f4f2ea'], [1, '#6d6a62']]);
      ctx.fillRect(base.x - wpx, top.y, wpx * 2, base.y - top.y);
      ctx.fillStyle = '#2a2420'; ctx.beginPath(); ctx.ellipse(base.x, top.y + 7, wpx * 0.62, 6, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.5; ctx.strokeRect(base.x - wpx, top.y, wpx * 2, base.y - top.y);
    });
    const X0 = -WALL + 0.02, X1 = -1.45, Zf = 0.50, Zb = 0.72, Y0 = FLOOR, Y1 = -0.35;
    const front = [P(X0, Y0, Zf), P(X1, Y0, Zf), P(X1, Y1, Zf), P(X0, Y1, Zf)];
    const side = [P(X1, Y0, Zf), P(X1, Y0, Zb), P(X1, Y1, Zb), P(X1, Y1, Zf)];
    const top = [P(X0, Y1, Zf), P(X1, Y1, Zf), P(X1, Y1, Zb), P(X0, Y1, Zb)];
    poly(ctx, side, vgrad(ctx, side[2].y, side[0].y, [[0, '#4a2c16'], [1, '#2a170a']]), '#150a04', 2);
    poly(ctx, front, vgrad(ctx, front[3].y, front[0].y, [[0, '#6b4528'], [1, '#3a2312']]), '#150a04', 3);
    poly(ctx, top, '#8a5a30', '#150a04', 2);
    // keyboard + stops on the front of the console
    const k0 = P(X0 + 0.08, Y1 - 0.02, Zf), k1 = P(X1 - 0.08, Y1 - 0.02, Zf);
    line(ctx, k0, k1, '#f1eadb', 12); line(ctx, { x: k0.x, y: k0.y + 8 }, { x: k1.x, y: k1.y + 8 }, '#171009', 4);
    for (let i = 0; i < 7; i++) { const t = (i + 0.5) / 7, kx = k0.x + (k1.x - k0.x) * t; line(ctx, { x: kx, y: k0.y - 5 }, { x: kx, y: k0.y + 5 }, '#171009', 1.5); }
    for (let i = 0; i < 4; i++) { const t = (i + 0.7) / 4.4, px = front[0].x + (front[1].x - front[0].x) * t; ctx.fillStyle = '#d9b45a'; ctx.beginPath(); ctx.arc(px, front[3].y + 46, 5, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(front[0].x, front[0].y - 14, front[1].x - front[0].x, 14);
  }

  // ---- confessional on the right -------------------------------------------------------
  {
    const X0 = 1.35, X1 = WALL - 0.02, Zf = 0.50, Zb = 0.69, Y0 = FLOOR, Y1 = 0.78;
    const front = [P(X0, Y0, Zf), P(X1, Y0, Zf), P(X1, Y1, Zf), P(X0, Y1, Zf)];
    const side = [P(X0, Y0, Zf), P(X0, Y0, Zb), P(X0, Y1, Zb), P(X0, Y1, Zf)];
    poly(ctx, side, vgrad(ctx, front[3].y, front[0].y, [[0, '#3a2412'], [1, '#22140a']]), '#150a04', 2);
    poly(ctx, front, vgrad(ctx, front[3].y, front[0].y, [[0, '#5a3820'], [1, '#34200f']]), '#150a04', 3);
    const fx0 = front[0].x, fx1 = front[1].x, fy0 = front[3].y, fy1 = front[0].y, fw = fx1 - fx0, fh = fy1 - fy0;
    // gabled top
    poly(ctx, [{ x: fx0 - 8, y: fy0 }, { x: fx1 + 8, y: fy0 }, { x: (fx0 + fx1) / 2, y: fy0 - 62 }], '#2a180c', '#150a04', 2);
    ctx.fillStyle = '#d9b45a'; ctx.fillRect((fx0 + fx1) / 2 - 3, fy0 - 92, 6, 30); ctx.fillRect((fx0 + fx1) / 2 - 11, fy0 - 82, 22, 6);
    // three compartments: curtain / priest door / curtain
    const cw = fw / 3;
    for (let i = 0; i < 3; i++) {
      const x = fx0 + cw * i + 10, w = cw - 20;
      ctx.fillStyle = '#25150a'; ctx.fillRect(x, fy0 + 34, w, fh - 60);
      if (i === 1) {
        ctx.fillStyle = '#4a2c16'; ctx.fillRect(x + 4, fy0 + 40, w - 8, fh - 72);
        ctx.fillStyle = '#d9b45a'; ctx.beginPath(); ctx.arc(x + w - 14, fy0 + fh * 0.5, 5, 0, 7); ctx.fill();
        // grille
        ctx.fillStyle = '#120a05'; ctx.fillRect(x + w / 2 - 22, fy0 + 66, 44, 52);
        ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2; for (let g = 0; g < 5; g++) { ctx.beginPath(); ctx.moveTo(x + w / 2 - 20 + g * 10, fy0 + 68); ctx.lineTo(x + w / 2 - 20 + g * 10, fy0 + 116); ctx.stroke(); }
      } else {
        const cg = ctx.createLinearGradient(x, 0, x + w, 0); cg.addColorStop(0, '#5a0f1a'); cg.addColorStop(0.5, '#a31f33'); cg.addColorStop(1, '#5a0f1a');
        ctx.fillStyle = cg; ctx.fillRect(x + 3, fy0 + 40, w - 6, fh - 100);
        for (let f = 1; f < 6; f++) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 3 + ((w - 6) * f) / 6, fy0 + 40, 2, fh - 100); }
        ctx.fillStyle = '#d9b45a'; ctx.fillRect(x, fy0 + 36, w, 5);
      }
    }
  }

  // ---- lanterns on chains (static body; the scene adds the flickering glow) --------------
  for (const [X, Z] of LANTERNS) {
    const top = P(X, 1.4, Z), body = P(X, 0.75, Z), s = 0.45 / Z;
    line(ctx, { x: top.x, y: 0 }, { x: body.x, y: body.y - 20 * s }, '#1b1612', 3);
    ctx.fillStyle = '#2a2420'; ctx.fillRect(body.x - 18 * s, body.y - 20 * s, 36 * s, 6 * s);
    ctx.fillStyle = 'rgba(255,214,130,0.95)'; ctx.fillRect(body.x - 13 * s, body.y - 14 * s, 26 * s, 30 * s);
    ctx.fillStyle = '#2a2420'; ctx.fillRect(body.x - 18 * s, body.y + 16 * s, 36 * s, 6 * s);
  }

  // ---- foreground: donation box (left) and votive-candle stand (right) ------------------
  paintDonationBox(ctx, 300, 985);
  paintCandleStand(ctx, 1625, 1000);

  // vignette
  const v = ctx.createRadialGradient(960, 520, 300, 960, 520, 1150);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.62)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

export const LANTERNS = [[-0.9, 0.45], [0.9, 0.45], [-0.9, 0.7], [0.9, 0.7]];
export function lanternGlowPoints() { return LANTERNS.map(([X, Z]) => { const p = P(X, 0.75, Z); return { x: p.x, y: p.y, s: 0.45 / Z }; }); }

// (x, y) = bottom centre of the box on the floor
function paintDonationBox(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 128, 22, 0, 0, 7); ctx.fill();
  // iron legs
  ctx.fillStyle = '#17120f'; for (const dx of [-78, 66]) ctx.fillRect(x + dx, y - 236, 12, 236);
  // chest body
  const bx = x - 100, by = y - 400, bw = 200, bh = 170;
  ctx.fillStyle = vgrad(ctx, by, by + bh, [[0, '#7a4a26'], [1, '#4a2a14']]); ctx.fillRect(bx, by + 30, bw, bh - 30);
  // lid
  ctx.fillStyle = '#8a5a30'; ctx.beginPath(); ctx.moveTo(bx - 10, by + 32); ctx.lineTo(bx + 10, by); ctx.lineTo(bx + bw - 10, by); ctx.lineTo(bx + bw + 10, by + 32); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#1d1008'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#15100c'; ctx.fillRect(bx + 60, by + 10, 80, 9);            // coin slot
  ctx.fillStyle = '#c9a24a'; ctx.fillRect(bx + 56, by + 6, 88, 3); ctx.fillRect(bx + 56, by + 22, 88, 3);
  // iron bands + lock
  ctx.fillStyle = '#1d1815'; for (const dx of [18, bw - 36]) ctx.fillRect(bx + dx, by + 32, 18, bh - 32);
  ctx.fillStyle = '#c9a24a'; ctx.fillRect(bx + bw / 2 - 12, by + 78, 24, 30);
  ctx.fillStyle = '#15100c'; ctx.beginPath(); ctx.arc(bx + bw / 2, by + 92, 4, 0, 7); ctx.fill(); ctx.fillRect(bx + bw / 2 - 1.5, by + 92, 3, 10);
  // golden plaque (blank: the scene prints the text)
  ctx.fillStyle = '#d9b45a'; ctx.fillRect(bx + 54, by + 124, 92, 30);
  ctx.strokeStyle = '#6a4c14'; ctx.lineWidth = 2; ctx.strokeRect(bx + 54, by + 124, 92, 30);
  // lid highlight
  ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(bx - 4, by + 2, bw + 8, 8);
}
export const DONATION_PLAQUE = { x: 254, y: 710, w: 92, h: 30 };

export const CANDLE_SPOTS = (() => {
  const spots = [], x0 = 1625, y0 = 828;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) spots.push({ x: x0 + (c - 1.5) * 52 + (r % 2) * 14 - 7, y: y0 + r * 44 });
  return spots;
})();
function paintCandleStand(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 150, 24, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#1a1511'; ctx.lineWidth = 14; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 60, y); ctx.lineTo(x - 22, y - 150); ctx.moveTo(x + 60, y); ctx.lineTo(x + 22, y - 150); ctx.moveTo(x, y); ctx.lineTo(x, y - 160); ctx.stroke();
  ctx.lineCap = 'butt';
  // iron tray
  ctx.fillStyle = vgrad(ctx, y - 215, y - 150, [[0, '#3a322b'], [1, '#17120f']]);
  ctx.beginPath(); ctx.moveTo(x - 135, y - 150); ctx.lineTo(x + 135, y - 150); ctx.lineTo(x + 112, y - 232); ctx.lineTo(x - 112, y - 232); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#0d0a08'; ctx.lineWidth = 3; ctx.stroke();
  // votive cups
  for (const s of CANDLE_SPOTS) {
    const cy = s.y + 28;
    ctx.fillStyle = '#8f1f2b'; ctx.beginPath(); ctx.moveTo(s.x - 17, cy - 38); ctx.lineTo(s.x + 17, cy - 38); ctx.lineTo(s.x + 13, cy); ctx.lineTo(s.x - 13, cy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(s.x - 14, cy - 36, 5, 30);
    ctx.fillStyle = '#efe4c0'; ctx.fillRect(s.x - 3, cy - 52, 6, 18);       // wick/wax stub
    ctx.fillStyle = '#17120f'; ctx.fillRect(s.x - 0.8, cy - 58, 1.6, 7);
  }
}

// ---------------------------------------------------------------------------------------
// Sprites (transparent canvases)
// ---------------------------------------------------------------------------------------
export const PRIEST_SIZE = { w: 220, h: 430 };
export function paintPriest(ctx) {
  const w = PRIEST_SIZE.w, h = PRIEST_SIZE.h, cx = w / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(cx, h - 10, 70, 11, 0, 0, 7); ctx.fill();
  // cassock
  ctx.fillStyle = vgrad(ctx, 130, h, [[0, '#2a2a2f'], [1, '#101013']]);
  ctx.beginPath(); ctx.moveTo(cx - 30, 140); ctx.lineTo(cx + 30, 140); ctx.lineTo(cx + 76, h - 12); ctx.lineTo(cx - 76, h - 12); ctx.closePath(); ctx.fill();
  // buttons
  ctx.fillStyle = '#3a3a40'; for (let i = 0; i < 11; i++) { ctx.beginPath(); ctx.arc(cx, 160 + i * 21, 3, 0, 7); ctx.fill(); }
  // sash
  ctx.fillStyle = '#6a1626'; ctx.fillRect(cx - 54, 262, 108, 12); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(cx - 54, 262, 108, 3);
  // arms + hands clasped
  ctx.fillStyle = '#1d1d22'; ctx.beginPath(); ctx.moveTo(cx - 34, 144); ctx.lineTo(cx - 66, 240); ctx.lineTo(cx - 40, 262); ctx.lineTo(cx - 8, 200); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx + 34, 144); ctx.lineTo(cx + 66, 240); ctx.lineTo(cx + 40, 262); ctx.lineTo(cx + 8, 200); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e3b894'; ctx.beginPath(); ctx.ellipse(cx, 252, 24, 14, 0, 0, 7); ctx.fill();
  // collar + neck
  ctx.fillStyle = '#e3b894'; ctx.fillRect(cx - 11, 118, 22, 28);
  ctx.fillStyle = '#f6f1e3'; ctx.fillRect(cx - 17, 134, 34, 14);
  // head
  ctx.fillStyle = '#e8bf9b'; ctx.beginPath(); ctx.ellipse(cx, 84, 34, 40, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#d8a984'; ctx.beginPath(); ctx.ellipse(cx - 34, 88, 6, 11, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx + 34, 88, 6, 11, 0, 0, 7); ctx.fill();
  // thin white hair on the sides
  ctx.fillStyle = '#e9e6df'; ctx.beginPath(); ctx.ellipse(cx - 31, 66, 8, 16, -0.3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx + 31, 66, 8, 16, 0.3, 0, 7); ctx.fill();
  // glasses
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx - 15, 82, 12, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + 15, 82, 12, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 3, 82); ctx.lineTo(cx + 3, 82); ctx.stroke();
  ctx.fillStyle = 'rgba(190,225,240,0.35)'; ctx.beginPath(); ctx.arc(cx - 15, 82, 10, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(cx + 15, 82, 10, 0, 7); ctx.fill();
  ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.arc(cx - 15, 83, 3.2, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(cx + 15, 83, 3.2, 0, 7); ctx.fill();
  // eyebrows, nose, mouth
  ctx.strokeStyle = '#d6d2c8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - 26, 64); ctx.lineTo(cx - 6, 66); ctx.moveTo(cx + 6, 66); ctx.lineTo(cx + 26, 64); ctx.stroke();
  ctx.fillStyle = '#d29b78'; ctx.beginPath(); ctx.moveTo(cx - 4, 90); ctx.lineTo(cx + 4, 90); ctx.lineTo(cx, 102); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8a4a3a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, 104, 11, 0.25, Math.PI - 0.25); ctx.stroke();
}
export function paintPriestPortrait(ctx, size = 180) {
  ctx.save(); ctx.scale(size / 120, size / 120);
  ctx.fillStyle = '#3a2d22'; ctx.fillRect(0, 0, 120, 120);
  const g = ctx.createRadialGradient(60, 50, 10, 60, 60, 80); g.addColorStop(0, '#7a5a3a'); g.addColorStop(1, '#2b2018'); ctx.fillStyle = g; ctx.fillRect(0, 0, 120, 120);
  ctx.fillStyle = '#17171a'; ctx.beginPath(); ctx.moveTo(8, 120); ctx.lineTo(24, 92); ctx.lineTo(96, 92); ctx.lineTo(112, 120); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e3b894'; ctx.fillRect(50, 78, 20, 16); ctx.fillStyle = '#f6f1e3'; ctx.fillRect(44, 90, 32, 10);
  ctx.fillStyle = '#e8bf9b'; ctx.beginPath(); ctx.ellipse(60, 52, 29, 34, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#e9e6df'; ctx.beginPath(); ctx.ellipse(33, 44, 7, 14, -0.3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(87, 44, 7, 14, 0.3, 0, 7); ctx.fill();
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(48, 54, 10, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(72, 54, 10, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(58, 54); ctx.lineTo(62, 54); ctx.stroke();
  ctx.fillStyle = 'rgba(190,225,240,0.35)'; ctx.beginPath(); ctx.arc(48, 54, 8.5, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(72, 54, 8.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.arc(48, 55, 2.6, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(72, 55, 2.6, 0, 7); ctx.fill();
  ctx.strokeStyle = '#d6d2c8'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(38, 40); ctx.lineTo(54, 42); ctx.moveTo(66, 42); ctx.lineTo(82, 40); ctx.stroke();
  ctx.fillStyle = '#d29b78'; ctx.beginPath(); ctx.moveTo(57, 62); ctx.lineTo(63, 62); ctx.lineTo(60, 72); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8a4a3a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(60, 74, 9, 0.3, Math.PI - 0.3); ctx.stroke();
  ctx.restore();
}

export const PIGEON_SIZE = { w: 90, h: 80 };
export function paintPigeon(ctx) {
  const cx = 42, by = 70;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(cx, by + 2, 26, 4, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#d0803a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 6, by - 14); ctx.lineTo(cx - 6, by); ctx.moveTo(cx + 6, by - 14); ctx.lineTo(cx + 6, by); ctx.stroke();
  ctx.fillStyle = '#6f767c'; ctx.beginPath(); ctx.moveTo(cx - 24, by - 26); ctx.lineTo(cx - 44, by - 14); ctx.lineTo(cx - 24, by - 12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8d949b'; ctx.beginPath(); ctx.ellipse(cx, by - 28, 26, 18, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#6b7279'; ctx.beginPath(); ctx.ellipse(cx - 4, by - 28, 18, 10, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#4a6a74'; ctx.beginPath(); ctx.arc(cx + 18, by - 44, 11, 0, 7); ctx.fill();
  ctx.fillStyle = '#6b7d84'; ctx.beginPath(); ctx.arc(cx + 24, by - 50, 8, 0, 7); ctx.fill();
  ctx.fillStyle = '#e0983c'; ctx.beginPath(); ctx.moveTo(cx + 30, by - 50); ctx.lineTo(cx + 40, by - 47); ctx.lineTo(cx + 30, by - 45); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#101010'; ctx.beginPath(); ctx.arc(cx + 26, by - 51, 1.8, 0, 7); ctx.fill();
  ctx.fillStyle = '#e8e8e8'; ctx.beginPath(); ctx.arc(cx + 26.7, by - 51.7, 0.6, 0, 7); ctx.fill();
}

// soft radial glow, white (tint it in Phaser)
export function paintGlow(ctx, size = 128) {
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
}
export function paintFlame(ctx, w = 28, h = 46) {
  const g = ctx.createRadialGradient(w / 2, h * 0.68, 1, w / 2, h * 0.62, h * 0.55);
  g.addColorStop(0, '#fffbe0'); g.addColorStop(0.45, '#ffd25a'); g.addColorStop(1, 'rgba(255,120,30,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(w / 2, 2); ctx.quadraticCurveTo(w - 2, h * 0.55, w / 2, h - 4); ctx.quadraticCurveTo(2, h * 0.55, w / 2, 2); ctx.fill();
}
export const FLAME_SIZE = { w: 28, h: 46 };