import { HW, HH } from './HomeCityConfig.js';
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


export { rgb, css, col, mix, light, dark, hash, pp, pathOf, poly, rect, circle, ellipse, line, vgrad, hgrad, yRange, shadow, S, isoBox, blob };
