// Roadside scenery painted as small pixel-art sprites, then enlarged with nearest-neighbour
// scaling so they match the pixel-art cockpit. One light source (top-left), a shared
// outline rule and ordered dithering keep every sprite in the same style.
// Final texture sizes match the old procedural sprites, so biome decor scales still apply.

const PIXEL = 4;
const BAYER = [[0, .5], [.75, .25]];
const LIGHT = [-.55, -.65, .52];
const rgb = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function hash(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

class Pix {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  set(x, y, c, a = 255) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4, [r, g, b] = rgb(c);
    this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.d[i + 3] = a;
  }
  clear(x, y) { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[(y * this.w + x) * 4 + 3] = 0; }
  alpha(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.d[(y * this.w + x) * 4 + 3]; }
  // v in 0..1 picks a colour from a dark→light ramp, dithering between neighbouring tones.
  tone(x, y, v, ramp) {
    const f = clamp(v, 0, .999) * ramp.length + (BAYER[y & 1][x & 1] - .375) * .7;
    this.set(x, y, ramp[clamp(Math.floor(f), 0, ramp.length - 1)]);
  }
  // Union of shaded spheres (foliage, bushes). Later circles sit in front of earlier ones.
  blob(circles, ramp, { noise = .22, seed = 1, clipY = this.h } = {}) {
    for (let y = 0; y < Math.min(this.h, clipY); y++) for (let x = 0; x < this.w; x++) {
      let hit = null;
      for (const c of circles) { const dx = x + .5 - c[0], dy = y + .5 - c[1]; if (dx * dx + dy * dy <= c[2] * c[2]) hit = [dx / c[2], dy / c[2], c]; }
      if (!hit) continue;
      const [nx, ny] = hit, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      let v = .42 + .58 * (LIGHT[0] * nx + LIGHT[1] * ny + LIGHT[2] * nz);
      v += (hash(x, y, seed) - .5) * noise + (hash(x >> 1, y >> 1, seed + 7) - .5) * noise * .8;
      this.tone(x, y, v, ramp);
    }
  }
  // Vertical or horizontal capsule shaded like a cylinder (cactus arms, trunks, poles).
  capsule(x0, y0, x1, y1, r, ramp, { ribs = 0, seed = 2 } = {}) {
    const vertical = Math.abs(x1 - x0) < Math.abs(y1 - y0);
    for (let y = Math.floor(Math.min(y0, y1) - r); y <= Math.max(y0, y1) + r; y++)
      for (let x = Math.floor(Math.min(x0, x1) - r); x <= Math.max(x0, x1) + r; x++) {
        const px = x + .5, py = y + .5;
        const t = clamp(((px - x0) * (x1 - x0) + (py - y0) * (y1 - y0)) / ((x1 - x0) ** 2 + (y1 - y0) ** 2 || 1), 0, 1);
        const cx = x0 + (x1 - x0) * t, cy = y0 + (y1 - y0) * t, dx = px - cx, dy = py - cy;
        if (dx * dx + dy * dy > r * r) continue;
        const across = (vertical ? dx : dy) / r;
        let v = .62 - across * .45 + (hash(x, y, seed) - .5) * .12;
        if (ribs && ((vertical ? x : y) % ribs === 0)) v -= .22;
        this.tone(x, y, v, ramp);
      }
  }
  // Shaded ellipse (bodies, heads, coins). flat < 1 keeps the shading softer.
  ell(cx, cy, rx, ry, ramp, { noise = .1, seed = 3, flat = 1, base = .42 } = {}) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const nx = (x + .5 - cx) / rx, ny = (y + .5 - cy) / ry;
      if (nx * nx + ny * ny > 1) continue;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const v = base + (.58 * (LIGHT[0] * nx + LIGHT[1] * ny + LIGHT[2] * nz)) * flat + (hash(x, y, seed) - .5) * noise;
      this.tone(x, y, v, ramp);
    }
  }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c); }
  // Polygon fill; shade(x, y) returns a 0..1 tone for the ramp.
  poly(points, ramp, shade) {
    const ys = points.map(p => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
      for (let x = 0; x < this.w; x++) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const [xi, yi] = points[i], [xj, yj] = points[j];
          if ((yi > y + .5) !== (yj > y + .5) && x + .5 < (xj - xi) * (y + .5 - yi) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) this.tone(x, y, shade(x, y), ramp);
      }
  }
  line(x0, y0, x1, y1, c, thick = 1) {
    const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) || 1;
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
      for (let a = 0; a < thick; a++) for (let b = 0; b < thick; b++) this.set(x + a - (thick >> 1), y + b - (thick >> 1), c);
    }
  }
  // Edge pixels of each shape are darkened into a soft outline, like the cockpit artwork.
  outline(strength = .42) {
    const copy = new Uint8ClampedArray(this.d);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.alpha(x, y) < 255) continue;
      if (this.alpha(x - 1, y) && this.alpha(x + 1, y) && this.alpha(x, y - 1) && this.alpha(x, y + 1)) continue;
      const i = (y * this.w + x) * 4;
      for (let k = 0; k < 3; k++) copy[i + k] = this.d[i + k] * strength;
    }
    this.d = copy;
  }
  // Soft contact shadow, only painted where nothing else is.
  shadow(cx, cy, rx, ry, a = 70) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry;
      if (dx * dx + dy * dy <= 1 && !this.alpha(x, y)) this.set(x, y, 0x10140c, a);
    }
  }
  glow(cx, cy, r, c, a) {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const d = Math.hypot(x + .5 - cx, y + .5 - cy) / r;
      if (d <= 1 && !this.alpha(x, y)) this.set(x, y, c, Math.round(a * (1 - d) * (BAYER[y & 1][x & 1] < (1 - d) * 1.4 ? 1 : .55)));
    }
  }
  toTexture(scene, key) {
    if (scene.textures.exists(key)) return;
    const small = document.createElement('canvas'); small.width = this.w; small.height = this.h;
    small.getContext('2d').putImageData(new ImageData(this.d, this.w, this.h), 0, 0);
    const big = document.createElement('canvas'); big.width = this.w * PIXEL; big.height = this.h * PIXEL;
    const ctx = big.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, big.width, big.height);
    scene.textures.addCanvas(key, big);
  }
}

const LEAF = [0x173a1d, 0x245a26, 0x347a2f, 0x4f9a3a, 0x79bd4f, 0xa6d86a];
const BARK = [0x2e1d10, 0x4a311b, 0x6b4826, 0x8a6236];
const PINE = [0x0f2a1f, 0x17402c, 0x22573a, 0x30704a, 0x4a8d5c];
const SNOW = [0x9fb2c6, 0xc8d6e4, 0xe9f0f7, 0xffffff];
const CACTUS = [0x1d4a2a, 0x2c6a37, 0x3f8a45, 0x62ad5a, 0x8dcc72];
const PALM = [0x1c4a26, 0x2a6b33, 0x3f8f3e, 0x66b34e];
const STONE = [0x3b3d44, 0x585b63, 0x767a82, 0x989ca3, 0xbcc0c5];
const METAL = [0x16171b, 0x2a2c33, 0x454852, 0x6a6e78];
const WALL = [0x7a6447, 0x9c835f, 0xbba27b, 0xd6c19a];
const ROOF = [0x4a1f19, 0x6e2e24, 0x8f3d2e, 0xae5340];

function roundTree() {
  const p = new Pix(40, 65);
  p.capsule(20, 36, 20, 64, 3.2, BARK, { ribs: 3, seed: 3 });
  p.line(20, 44, 13, 37, BARK[2], 2); p.line(21, 41, 28, 35, BARK[2], 2);
  p.blob([[11, 30, 9], [29, 30, 9], [15, 18, 9], [27, 16, 10], [20, 27, 11], [20, 11, 8], [13, 34, 6], [27, 35, 6]], LEAF, { seed: 11 });
  p.outline(); p.shadow(20, 63.5, 14, 2.2); return p;
}
function pine(snow) {
  const p = new Pix(35, 70);
  p.capsule(17.5, 56, 17.5, 69, 2.4, BARK, { ribs: 3, seed: 5 });
  const tiers = [[38, 67, 16.5], [22, 51, 13.5], [8, 35, 10.5], [1, 18, 6.5]];
  tiers.forEach(([top, base, half], k) => {
    const jag = x => base + ((x * 7 + k * 3) % 5 === 0 ? 1 : 0) - ((x * 3 + k) % 4 === 0 ? 1 : 0);
    const pts = [[17.5, top]];
    for (let x = 17.5 + half; x >= 17.5 - half; x -= 1) pts.push([x, jag(Math.round(x))]);
    p.poly(pts, PINE, (x, y) => {
      const rel = (x + .5 - 17.5) / half, down = (y - top) / (base - top);
      return .7 - rel * .38 - down * .22 + (hash(x, y, 20 + k) - .5) * .25;
    });
    if (snow) for (let y = top; y <= base; y++) for (let x = 0; x < 35; x++) {
      if (!p.alpha(x, y)) continue;
      const down = (y - top) / (base - top), rel = (x + .5 - 17.5) / half;
      if (down < .42 + hash(x, 0, k) * .14 - Math.max(0, rel) * .15 || (y >= base - 2 && rel < .35 && hash(x, y, k) > .3))
        p.tone(x, y, .75 - rel * .3 + (hash(x, y, 40) - .5) * .2, SNOW);
    }
  });
  p.outline(); p.shadow(17.5, 69, 13, 1.8); return p;
}
function cactus() {
  const p = new Pix(25, 50);
  p.capsule(5, 15, 5, 27, 2.6, CACTUS, { ribs: 2, seed: 6 }); p.capsule(5, 27, 11, 27, 2.6, CACTUS, { seed: 6 });
  p.capsule(20, 21, 20, 33, 2.6, CACTUS, { ribs: 2, seed: 7 }); p.capsule(14, 33, 20, 33, 2.6, CACTUS, { seed: 7 });
  p.capsule(12.5, 6, 12.5, 49, 4.4, CACTUS, { ribs: 3, seed: 8 });
  for (let y = 4; y < 48; y += 3) for (let x = 7; x < 19; x += 3) if (p.alpha(x, y) && hash(x, y, 9) > .55) p.set(x, y, 0xe8e0b8);
  p.set(12, 2, 0xe86a8a); p.set(13, 2, 0xf59ab0); p.set(12, 3, 0xd04c70); p.set(13, 3, 0xe86a8a);
  p.outline(); p.shadow(12.5, 49, 10, 1.4); return p;
}
function palm() {
  const p = new Pix(40, 70);
  for (let y = 18; y < 70; y++) {
    const t = (y - 18) / 52, x = 19 + Math.sin(t * 2.2) * 3.5 + t * 2, r = 1.6 + t * 1.3;
    for (let dx = -r; dx <= r; dx += 1) {
      const rel = dx / r, seg = (y % 4 === 0) ? -.25 : 0;
      p.tone(Math.round(x + dx), y, .62 - rel * .4 + seg, BARK);
    }
  }
  // Fronds: thick drooping leaves with leaflets hanging below the rib; back leaves darker.
  const fronds = [[-.55, -1, .55], [.55, -1, .55], [-1, -.45, 1], [1, -.4, 1], [-.95, .2, .8], [.95, .25, .8], [-.25, -.2, .7], [.3, -.15, .7]];
  fronds.forEach(([dir, lift, len], k) => {
    const back = k < 2 ? -.2 : 0, n = Math.round(19 * len);
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = 19 + dir * t * 19 * len, y = 16 + lift * t * 11 + t * t * 15 * len;
      const w = Math.max(2, Math.round((1 - t * .7) * 4));
      for (let j = 0; j < w; j++) p.tone(Math.round(x), Math.round(y + j - 1), .78 - j * .16 - t * .2 + back + (hash(i, k, 30) - .5) * .15, PALM);
      if (t > .15 && i % 2 === 0) for (let j = 1; j <= Math.round(3 * (1 - t) + 1); j++)
        p.tone(Math.round(x - dir * j * .4), Math.round(y + w - 1 + j), .45 - j * .08 + back, PALM);
    }
  });
  for (const [x, y] of [[17, 19], [21, 20], [19, 21]]) { p.set(x, y, 0x5a3a1c); p.set(x + 1, y, 0x7a5228); }
  p.outline(); p.shadow(24, 69, 11, 1.6); return p;
}
function bush() {
  const p = new Pix(30, 18);
  p.blob([[7, 12, 6.5], [23, 12, 6], [12, 8, 7], [19, 7, 7], [15, 12, 7]], LEAF, { seed: 14, clipY: 17 });
  p.outline(); p.shadow(15, 17, 14, 1.2); return p;
}
function rock() {
  const p = new Pix(28, 18);
  const pts = [[1, 17], [4, 8], [10, 3], [17, 2], [24, 7], [27, 17]];
  p.poly(pts, STONE, (x, y) => {
    const top = y < 9 - x * .12, left = x < 12;
    return (top ? .82 : left ? .58 : .36) + (hash(x, y, 15) - .5) * .18;
  });
  p.line(13, 6, 16, 12, STONE[1]); p.line(16, 12, 15, 16, STONE[1]);
  p.outline(); p.shadow(14, 17, 14, 1.2); return p;
}
function lamp() {
  const p = new Pix(15, 65);
  p.glow(11.5, 12, 7, 0xffd98a, 120);
  p.capsule(4.5, 10, 4.5, 63, 1.2, METAL, { seed: 16 });
  p.line(4, 7, 11, 7, METAL[2]); p.line(4, 8, 5, 10, METAL[2]);
  p.rect(9, 8, 5, 2, METAL[1]); p.rect(10, 10, 3, 1, 0xfff0b0);
  p.rect(2, 61, 6, 4, METAL[1]); p.rect(3, 61, 2, 3, METAL[2]);
  p.outline(.5); return p;
}
function house() {
  const p = new Pix(55, 50);
  p.rect(39, 5, 5, 12, ROOF[0]); p.rect(40, 5, 2, 11, ROOF[1]); p.rect(38, 4, 7, 2, STONE[1]);
  p.poly([[5, 21], [5, 49], [50, 49], [50, 21]], WALL, (x, y) => (y % 3 === 0 ? .35 : .62) - (x > 27 ? .15 : 0) + (hash(x, y, 17) - .5) * .08);
  p.poly([[0, 23], [27.5, 2], [55, 23]], ROOF, (x, y) => ((y % 3 === 0) ? .3 : .7) - (x > 27 ? .25 : 0) + (hash(x >> 1, y, 18) - .5) * .15);
  for (const wx of [10, 37]) {
    p.rect(wx - 1, 28, 10, 10, 0x3b2d20);
    for (let y = 29; y < 37; y++) for (let x = wx; x < wx + 8; x++) p.tone(x, y, .9 - (y - 29) * .06, [0xb07a2a, 0xe0a83c, 0xffd36a, 0xfff0b0]);
    p.rect(wx + 3, 29, 2, 8, 0x3b2d20); p.rect(wx, 32, 8, 1, 0x3b2d20);
  }
  p.rect(23, 33, 10, 16, 0x3b2216); p.rect(24, 34, 8, 15, 0x5a3420); p.set(30, 41, 0xd4af37);
  p.outline(); p.shadow(27.5, 49, 27, 1.5); return p;
}

// ---- Obstacles, pickups and road furniture. Moving animals face right; the road code flips them.
const HIDE = [0x8f8f88, 0xc4c4bc, 0xe6e6de, 0xfafaf4];
const SPOT = [0x141416, 0x26262a, 0x3a3a40];
const PINK = [0xa85a68, 0xd98494, 0xf2aebb];
const ORANGE = [0x8a3208, 0xc4500e, 0xf07a1a, 0xffa448];
const RED = [0x5e120e, 0x931d16, 0xd0302a, 0xf26a50];
const GOLD = [0x7a4e00, 0xb88208, 0xf2b705, 0xffd84d, 0xfff2a8];
const TAR = [0x08080a, 0x161619, 0x26262b, 0x3c3c43];
const TWIG = [0x4a3018, 0x6e4a22, 0x9a6b35, 0xc49a5a];
const PAPER = [0xb4ab9a, 0xdad2c2, 0xf3eee3, 0xffffff];
const SLEEVE = [0x4f3218, 0x744c24, 0x9a6c38];
const SIGN = [0xb88a10, 0xe2aa1c, 0xf6c632, 0xffe070];

function pothole() {
  const p = new Pix(50, 13);
  p.ell(25, 6.5, 24, 6, TAR, { flat: .5, base: .6, noise: .25, seed: 40 });
  for (let y = 0; y < 13; y++) for (let x = 0; x < 50; x++) {
    const nx = (x + .5 - 25) / 19, ny = (y + .5 - 6.3) / 4.2;
    if (nx * nx + ny * ny <= 1) p.tone(x, y, .08 + Math.max(0, ny) * .35 + (hash(x, y, 41) - .5) * .12, TAR);
  }
  for (let i = 0; i < 9; i++) p.set(3 + hash(i, 1, 42) * 44, hash(i, 2, 42) > .5 ? 1 + hash(i, 3, 42) * 2 : 10 + hash(i, 3, 42) * 2, TAR[3]);
  p.outline(.7); return p;
}
function cone() {
  const p = new Pix(18, 22);
  p.poly([[9, 0], [16.5, 19], [1.5, 19]], ORANGE, (x, y) => .82 - (x - 9) / 8 * .4 + (hash(x, y, 43) - .5) * .08);
  for (let y = 0; y < 19; y++) for (let x = 0; x < 18; x++)
    if (p.alpha(x, y) && ((y >= 7 && y <= 9) || (y >= 12 && y <= 14))) p.tone(x, y, .85 - (x - 9) / 8 * .35, PAPER);
  p.rect(0, 19, 18, 3, METAL[1]); p.rect(1, 19, 16, 1, METAL[3]);
  p.outline(); p.shadow(9, 21.5, 9, 1); return p;
}
function cow() {
  const p = new Pix(55, 38);
  p.line(8, 13, 5, 19, HIDE[0], 2); p.line(5, 19, 4, 23, HIDE[0], 2);
  p.rect(3, 23, 3, 3, SPOT[1]); p.set(4, 26, SPOT[0]);
  for (const [x, far] of [[15, 1], [34, 1], [11, 0], [30, 0]]) {
    p.capsule(x, 23, x, 34, 1.9, far ? [0x6f6f69, 0x9a9a92, 0xbdbdb5] : HIDE, { seed: x });
    p.rect(x - 2, 34, 4, 2, SPOT[0]);
  }
  p.ell(24, 17, 18, 9.5, HIDE, { seed: 44 });
  for (const [x, y, r] of [[16, 13, 5], [29, 20, 4.5], [34, 11, 3.5], [21, 22, 3]])
    for (let j = Math.floor(y - r); j <= y + r; j++) for (let i = Math.floor(x - r); i <= x + r; i++)
      if (p.alpha(i, j) && Math.hypot(i + .5 - x, (j + .5 - y) * 1.2) < r - hash(i, j, 45) * 1.2) p.tone(i, j, .55 - (j - y) / r * .3, SPOT);
  p.ell(28, 26.5, 3.5, 2, PINK, { flat: .4, base: .5 });
  p.rect(43, 4, 2, 4, 0xd9c9a0); p.rect(49, 4, 2, 4, 0xd9c9a0);
  p.ell(46, 12, 7, 6.5, HIDE, { seed: 46 }); p.ell(40, 8, 3, 1.6, HIDE, { seed: 47 });
  p.ell(50, 16.5, 4.5, 3.2, PINK, { flat: .5, base: .55 });
  p.rect(47, 9, 2, 3, SPOT[0]); p.set(47, 9, 0xffffff);
  p.set(50, 17, PINK[0]); p.set(52, 17, PINK[0]);
  p.outline(); p.shadow(25, 36, 22, 1.6); return p;
}
function chicken() {
  const p = new Pix(22, 25);
  p.line(9, 19, 9, 23, ORANGE[2]); p.line(13, 19, 13, 23, ORANGE[2]);
  p.line(7, 24, 11, 24, ORANGE[1]); p.line(11, 24, 15, 24, ORANGE[1]);
  p.blob([[3, 9, 3], [4, 12, 3.2]], HIDE, { seed: 48, noise: .1 });
  p.ell(10.5, 14, 7.5, 6, HIDE, { seed: 49 });
  p.ell(9.5, 14, 4.5, 3, [0x9a9a92, 0xc4c4bc, 0xdcdcd4], { flat: .4, base: .5 });
  p.ell(16, 7, 3.6, 3.6, HIDE, { seed: 50 });
  p.rect(15, 2, 1, 2, RED[2]); p.rect(16, 1, 1, 3, RED[3]); p.rect(17, 2, 1, 2, RED[2]);
  p.rect(20, 7, 2, 1, ORANGE[3]); p.set(20, 8, ORANGE[1]);
  p.set(17, 6, SPOT[0]); p.rect(18, 9, 1, 2, RED[2]);
  p.outline(); p.shadow(11, 24.5, 8, 1); return p;
}
function tumbleweed() {
  const p = new Pix(30, 28);
  for (let k = 0; k < 46; k++) {
    const a0 = hash(k, 1, 51) * Math.PI * 2, a1 = a0 + 1 + hash(k, 2, 51) * 2.2, r = 5 + hash(k, 3, 51) * 8;
    const ox = (hash(k, 4, 51) - .5) * 6, oy = (hash(k, 5, 51) - .5) * 6;
    for (let a = a0; a < a1; a += .12) {
      const x = 15 + ox + Math.cos(a) * r, y = 13 + oy + Math.sin(a) * r * .9;
      if (Math.hypot(x - 15, (y - 13) / .9) > 12.5) continue;
      p.tone(Math.round(x), Math.round(y), .7 - (y - 13) / 12 * .35 + (hash(k, 6, 51) - .5) * .3, TWIG);
    }
  }
  p.outline(.7); p.shadow(15, 26.5, 10, 1.2); return p;
}
function crab() {
  const p = new Pix(40, 23);
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) { const bx = 20 + s * (5 + k * 2.5); p.line(bx, 15, bx + s * 4, 18 + k, RED[1]); p.line(bx + s * 4, 18 + k, bx + s * 5, 22, RED[1]); }
    p.line(20 + s * 8, 11, 20 + s * 13, 8, RED[2], 2);
    p.ell(20 + s * 15, 6, 3.8, 3.4, RED, { seed: 52 + s });
    // Pincer gap: a notch cut into the outer top of each claw.
    for (let y = 2; y <= 5; y++) for (let x = 0; x <= 1; x++) p.clear(20 + s * (16 + x), y + (x ? 0 : 1));
  }
  p.ell(20, 13, 10.5, 6, RED, { seed: 54 });
  for (const ex of [17, 23]) { p.rect(ex, 4, 1, 4, RED[1]); p.ell(ex + .5, 4, 1.8, 1.8, PAPER, { flat: .3, base: .7 }); p.set(ex, 4, 0); }
  p.line(18, 15, 22, 15, RED[0]);
  p.outline(); p.shadow(20, 21.5, 15, 1.3); return p;
}
function coffee() {
  const p = new Pix(18, 20);
  p.glow(9, 12, 9, 0xffd24a, 90);
  p.poly([[3.5, 7], [14.5, 7], [13.5, 19], [4.5, 19]], PAPER, x => .85 - (x - 9) / 6 * .35);
  for (let y = 11; y <= 14; y++) for (let x = 0; x < 18; x++) if (p.alpha(x, y) === 255) p.tone(x, y, .8 - (x - 9) / 6 * .4, SLEEVE);
  p.rect(2, 5, 14, 2, PAPER[1]); p.rect(3, 4, 12, 1, PAPER[2]); p.rect(2, 6, 14, 1, PAPER[0]);
  for (const [x, ph] of [[7, 0], [11, 2]]) for (let y = 0; y < 4; y++) p.set(x + ((y + ph) % 3 === 0 ? 1 : 0), y, 0xffffff, 170 - y * 25);
  p.outline(.5); return p;
}
function coin() {
  const p = new Pix(18, 18);
  p.ell(9, 9, 8, 8, GOLD, { flat: .6, base: .6, noise: .05 });
  for (let a = 0; a < Math.PI * 2; a += .1) p.set(9 + Math.cos(a) * 5.6, 9 + Math.sin(a) * 5.6, GOLD[1]);
  p.rect(8, 4, 2, 10, GOLD[1]); p.rect(6, 6, 5, 1, GOLD[1]); p.rect(7, 9, 4, 1, GOLD[1]); p.rect(7, 11, 5, 1, GOLD[1]); p.rect(6, 7, 1, 2, GOLD[1]); p.rect(11, 9, 1, 2, GOLD[1]);
  p.set(5, 4, 0xffffff); p.set(4, 5, GOLD[4]);
  p.outline(.5); return p;
}
function speedCam() {
  const p = new Pix(22, 50);
  p.capsule(11, 15, 11, 49, 1.5, METAL, { seed: 55 });
  p.poly([[2, 2], [20, 2], [20, 16], [2, 16]], [0x2a2d34, 0x3d414a, 0x565b66, 0x737985], (x, y) => .75 - (x - 2) / 18 * .3 - (y - 2) / 14 * .2);
  p.ell(10, 9, 4, 4, TAR, { flat: .4, base: .35 }); p.ell(10, 9, 2, 2, [0x1f5f9e, 0x3a8ae0, 0x8cc8ff], { flat: .5, base: .55 });
  p.rect(16, 3, 2, 2, 0xff3b3b); p.set(16, 3, 0xffb0a0);
  p.rect(3, 18, 16, 6, 0xf2f2ec); p.rect(4, 19, 14, 4, 0x2a2d34); p.rect(6, 20, 10, 2, 0xf2f2ec);
  p.outline(); p.shadow(11, 49, 7, 1); return p;
}
function chevron() {
  const p = new Pix(25, 42);
  p.capsule(12, 17, 12, 41, 1.3, METAL, { seed: 56 });
  p.rect(0, 0, 25, 18, 0x141416);
  p.poly([[1, 1], [24, 1], [24, 17], [1, 17]], SIGN, (x, y) => .8 - x / 24 * .25 - y / 17 * .2);
  for (const x0 of [3, 12]) p.poly([[x0, 3], [x0 + 4, 3], [x0 + 9, 9], [x0 + 4, 15], [x0, 15], [x0 + 5, 9]], SPOT, () => .3);
  p.outline(.55); p.shadow(12, 41, 5, .8); return p;
}

export function buildPixelDecor(scene) {
  const sprites = {
    drv_tree_round: roundTree, drv_pine: () => pine(false), drv_pine_snow: () => pine(true),
    drv_cactus: cactus, drv_palm: palm, drv_bush: bush, drv_rock: rock, drv_lamp: lamp, drv_house: house,
    drv_pothole: pothole, drv_cone: cone, drv_cow: cow, drv_chicken: chicken, drv_tumble: tumbleweed,
    drv_crab: crab, drv_coffee: coffee, drv_coin: coin, drv_cam: speedCam, drv_chevron: chevron
  };
  for (const [key, paint] of Object.entries(sprites)) if (!scene.textures.exists(key)) paint().toTexture(scene, key);
}
