// ---------------------------------------------------------------------------
// ui/NewspaperTimeCover.js
//
// Paints the TIME magazine background in code: a wooden desk, a 1939-style
// cover (red frame, TIME logo, rules), a "private eye" cover illustration
// with sunburst, halftone dots, wear and a bent corner.
//
// Text (date, headline, teasers, caption) is added by NewspaperUI on top.
// ---------------------------------------------------------------------------

export const TIME_COVER_KEY = 'paper_time_procedural';

const NAVY = '#14161f';
const RED = '#c1121f';

export const TIME_CAPTIONS = [
  'PRIVATE EYE OF THE WEEK: "I saw nothing. Professionally."',
  'MAN OF THE WEEK: Wears sunglasses indoors. For the case.',
  'COVER STAR: Declined to comment. Accepted the fee.',
  'FIGURE OF THE WEEK: Still looking for the thief. And the hat.',
  'THE DETECTIVE: Has a hunch. Also has a snack.'
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = value => (value < 0 ? 0 : value > 255 ? 255 : value);

export function ensureTimeCoverTexture(scene, layout, key = TIME_COVER_KEY) {
  if (scene.textures.exists(key)) return key;
  if (!layout?.cover) return null;

  const width = layout.pageWidth || 1920;
  const height = layout.pageHeight || 1080;

  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) return null;

  paintTime(texture.getContext(), width, height, layout);
  texture.refresh();

  return key;
}

function paintTime(ctx, W, H, layout) {
  const rand = mulberry32(1939);
  const c = layout.cover;

  paintDesk(ctx, W, H, rand);
  paintPencil(ctx, 250, 900);
  paintCoverPaper(ctx, c, rand);
  paintCoverPrint(ctx, layout);
  paintIllustration(ctx, layout.illustration, layout.badge);
  paintCoverWear(ctx, c, rand);
}

// ---- desk -----------------------------------------------------------------

function paintDesk(ctx, W, H, rand) {
  const base = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, W * 0.7);
  base.addColorStop(0, '#4b3424');
  base.addColorStop(1, '#1b1109');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // wood grain
  for (let y = 0; y < H; y += 3) {
    const dark = rand() < 0.6;
    ctx.strokeStyle = dark
      ? `rgba(10, 5, 2, ${0.05 + rand() * 0.10})`
      : `rgba(150, 100, 60, ${0.03 + rand() * 0.05})`;
    ctx.lineWidth = 1 + rand() * 1.5;

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(
      W * 0.3, y + (rand() - 0.5) * 8,
      W * 0.7, y + (rand() - 0.5) * 8,
      W, y + (rand() - 0.5) * 4
    );
    ctx.stroke();
  }

  // a few knots
  for (let n = 0; n < 4; n++) {
    const x = rand() * W;
    const y = rand() * H;

    for (let r = 4; r < 26; r += 4) {
      ctx.strokeStyle = `rgba(10, 5, 2, ${0.12 - r * 0.003})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 2.2, r, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function paintPencil(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 6;
  ctx.shadowOffsetY = 8;

  ctx.fillStyle = '#d9a026';
  ctx.fillRect(0, -9, 300, 18);

  ctx.shadowColor = 'transparent';

  ctx.fillStyle = 'rgba(255, 220, 120, 0.35)';
  ctx.fillRect(0, -9, 300, 5);

  ctx.fillStyle = '#e8cfa0';
  ctx.beginPath();
  ctx.moveTo(300, -9);
  ctx.lineTo(344, 0);
  ctx.lineTo(300, 9);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = NAVY;
  ctx.beginPath();
  ctx.moveTo(331, -2.5);
  ctx.lineTo(344, 0);
  ctx.lineTo(331, 2.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#9a9a9a';
  ctx.fillRect(-8, -9, 8, 18);
  ctx.fillStyle = '#c9605a';
  ctx.fillRect(-28, -9, 20, 18);

  ctx.restore();
}

// ---- cover paper ----------------------------------------------------------

function paintCoverPaper(ctx, c, rand) {
  const { x, y, width: w, height: h } = c;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 46;
  ctx.shadowOffsetX = 12;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = '#efe6cf';
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  const image = ctx.createImageData(w, h);
  const data = image.data;

  const GW = 12;
  const GH = 16;
  const grid = [];

  for (let j = 0; j <= GH; j++) {
    const row = [];
    for (let i = 0; i <= GW; i++) row.push(rand());
    grid.push(row);
  }

  const cellW = w / GW;
  const cellH = h / GH;

  for (let py = 0; py < h; py++) {
    const gy = py / cellH;
    const j = Math.floor(gy);
    const fy = gy - j;
    const sy = fy * fy * (3 - 2 * fy);

    for (let px = 0; px < w; px++) {
      const gx = px / cellW;
      const i = Math.floor(gx);
      const fx = gx - i;
      const sx = fx * fx * (3 - 2 * fx);

      const a = grid[j][i];
      const b = grid[j][i + 1];
      const cc = grid[j + 1][i];
      const e = grid[j + 1][i + 1];

      const blot = a + (b - a) * sx + (cc - a) * sy + (a - b - cc + e) * sx * sy;
      const t = (blot - 0.5) * 14 + (rand() - 0.5) * 9;

      const p = (py * w + px) * 4;
      data[p] = clamp(244 + t);
      data[p + 1] = clamp(237 + t * 0.95);
      data[p + 2] = clamp(216 + t * 0.8);
      data[p + 3] = 255;
    }
  }

  ctx.putImageData(image, x, y);

  // fibres
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.lineCap = 'round';

  for (let n = 0; n < 900; n++) {
    const fx = x + rand() * w;
    const fy = y + rand() * h;
    const len = 6 + rand() * 20;
    const angle = rand() * Math.PI * 2;

    ctx.strokeStyle = rand() < 0.7
      ? `rgba(110, 80, 40, ${0.04 + rand() * 0.07})`
      : `rgba(255, 252, 240, ${0.08 + rand() * 0.10})`;
    ctx.lineWidth = 0.6 + rand() * 0.7;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + Math.cos(angle) * len, fy + Math.sin(angle) * len);
    ctx.stroke();
  }

  ctx.restore();
}

// ---- printed parts of the cover -------------------------------------------

function paintCoverPrint(ctx, layout) {
  const c = layout.cover;
  const cx = c.x + c.width / 2;

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';

  // red frame
  ctx.strokeStyle = RED;
  ctx.lineWidth = c.border;
  ctx.strokeRect(
    c.x + c.border / 2,
    c.y + c.border / 2,
    c.width - c.border,
    c.height - c.border
  );

  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(c.x + c.border + 6, c.y + c.border + 6, c.width - (c.border + 6) * 2, c.height - (c.border + 6) * 2);

  // logo: TIME, drawn letter by letter so we control the spacing
  const size = layout.logo.size;
  ctx.font = `bold ${size}px "Times New Roman", Georgia, serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = NAVY;

  const letters = [...'TIME'];
  const spacing = 12;
  const widths = letters.map(letter => ctx.measureText(letter).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + spacing * (letters.length - 1);

  let lx = cx - total / 2;
  letters.forEach((letter, index) => {
    ctx.fillText(letter, lx, layout.logo.baseline);
    lx += widths[index] + spacing;
  });

  // rules around the tagline
  const left = c.x + c.border + 30;
  const right = c.x + c.width - c.border - 30;

  ctx.strokeStyle = RED;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(left, layout.rules.top);
  ctx.lineTo(right, layout.rules.top);
  ctx.stroke();

  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(left, layout.rules.bottom);
  ctx.lineTo(right, layout.rules.bottom);
  ctx.stroke();

  // short red divider under the headline
  ctx.strokeStyle = RED;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - layout.divider.width / 2, layout.divider.y);
  ctx.lineTo(cx + layout.divider.width / 2, layout.divider.y);
  ctx.stroke();

  ctx.restore();
}

// ---- illustration ---------------------------------------------------------

function paintIllustration(ctx, box, badge) {
  const { x, y, width: w, height: h } = box;
  const cx = x + w / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // backdrop
  const back = ctx.createLinearGradient(0, y, 0, y + h);
  back.addColorStop(0, '#e6d6ad');
  back.addColorStop(1, '#d2bb88');
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);

  // sunburst
  const sx = cx;
  const sy = y + h * 0.78;
  const rays = 36;

  for (let i = 0; i < rays; i++) {
    if (i % 2) continue;

    const a0 = (Math.PI * 2 * i) / rays;
    const a1 = (Math.PI * 2 * (i + 1)) / rays;

    ctx.fillStyle = 'rgba(193, 18, 31, 0.16)';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.arc(sx, sy, w, a0, a1);
    ctx.closePath();
    ctx.fill();
  }

  // red halo behind the head
  ctx.fillStyle = 'rgba(184, 35, 30, 0.92)';
  ctx.beginPath();
  ctx.arc(cx, y + 200, 150, 0, Math.PI * 2);
  ctx.fill();

  drawDetective(ctx, cx, y);

  // halftone dots over the whole picture
  ctx.fillStyle = 'rgba(20, 22, 31, 0.07)';
  for (let py = y + 4; py < y + h; py += 8) {
    for (let px = x + 4; px < x + w; px += 8) {
      ctx.beginPath();
      ctx.arc(px, py, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();

  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, w, h);

  // sticker burst in the corner
  if (badge) {
    const pts = [];
    const spikes = 18;

    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? badge.radius : badge.radius - 10;
      const a = (Math.PI * i) / spikes - Math.PI / 2;
      pts.push([badge.x + Math.cos(a) * r, badge.y + Math.sin(a) * r]);
    }

    ctx.fillStyle = RED;
    ctx.beginPath();
    pts.forEach(([px, py], index) => (index ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#f3ead2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(badge.x, badge.y, badge.radius - 16, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// The cover star: a very serious private eye (sunglasses, giant magnifier).
function drawDetective(ctx, cx, top) {
  const navy = NAVY;

  // coat / shoulders
  ctx.fillStyle = navy;
  ctx.beginPath();
  ctx.moveTo(cx - 200, top + 386);
  ctx.bezierCurveTo(cx - 160, top + 290, cx - 80, top + 268, cx - 30, top + 256);
  ctx.lineTo(cx + 30, top + 256);
  ctx.bezierCurveTo(cx + 80, top + 268, cx + 160, top + 290, cx + 200, top + 386);
  ctx.closePath();
  ctx.fill();

  // shirt V and tie
  ctx.fillStyle = '#efe6cf';
  ctx.beginPath();
  ctx.moveTo(cx - 30, top + 256);
  ctx.lineTo(cx + 30, top + 256);
  ctx.lineTo(cx, top + 322);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.moveTo(cx - 6, top + 276);
  ctx.lineTo(cx + 6, top + 276);
  ctx.lineTo(cx + 10, top + 336);
  ctx.lineTo(cx, top + 348);
  ctx.lineTo(cx - 10, top + 336);
  ctx.closePath();
  ctx.fill();

  // neck + head
  ctx.fillStyle = '#d9bf94';
  ctx.fillRect(cx - 18, top + 226, 36, 34);
  ctx.beginPath();
  ctx.arc(cx, top + 196, 52, 0, Math.PI * 2);
  ctx.fill();

  // sunglasses
  ctx.fillStyle = navy;
  ctx.fillRect(cx - 36, top + 190, 29, 12);
  ctx.fillRect(cx + 7, top + 190, 29, 12);
  ctx.fillRect(cx - 8, top + 193, 16, 3);

  // moustache
  ctx.beginPath();
  ctx.ellipse(cx, top + 222, 20, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // fedora
  ctx.beginPath();
  ctx.ellipse(cx, top + 160, 100, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - 55, top + 160);
  ctx.quadraticCurveTo(cx - 60, top + 98, cx - 30, top + 90);
  ctx.lineTo(cx + 30, top + 90);
  ctx.quadraticCurveTo(cx + 60, top + 98, cx + 55, top + 160);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = RED;
  ctx.fillRect(cx - 55, top + 136, 110, 10);

  // giant magnifying glass with an eye inside the lens
  const gx = cx + 140;
  const gy = top + 262;

  ctx.strokeStyle = navy;
  ctx.lineCap = 'round';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(gx - 38, gy + 40);
  ctx.lineTo(gx - 100, gy + 112);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.arc(gx, gy, 54, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(gx, gy, 54, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#f7f0dc';
  ctx.beginPath();
  ctx.ellipse(gx, gy, 32, 19, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = navy;
  ctx.beginPath();
  ctx.arc(gx, gy, 9, 0, Math.PI * 2);
  ctx.fill();
}

// ---- wear -----------------------------------------------------------------

function paintCoverWear(ctx, c, rand) {
  const { x, y, width: w, height: h } = c;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // ink dropouts
  ctx.fillStyle = 'rgba(244, 237, 218, 0.6)';
  for (let n = 0; n < 1400; n++) {
    ctx.fillRect(x + rand() * w, y + rand() * h, 1 + rand() * 1.6, 1 + rand() * 1.6);
  }

  // yellowed edges
  const edge = (x0, y0, x1, y1, rx, ry, rw, rh) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, 'rgba(150, 100, 40, 0.30)');
    g.addColorStop(1, 'rgba(150, 100, 40, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(rx, ry, rw, rh);
  };

  edge(x, y, x + 46, y, x, y, 46, h);
  edge(x + w, y, x + w - 46, y, x + w - 46, y, 46, h);
  edge(x, y, x, y + 46, x, y, w, 46);
  edge(x, y + h, x, y + h - 46, x, y + h - 46, w, 46);

  // bent bottom-right corner crease
  const g = ctx.createLinearGradient(x + w - 90, y + h - 90, x + w - 40, y + h - 40);
  g.addColorStop(0, 'rgba(60, 40, 15, 0)');
  g.addColorStop(0.5, 'rgba(60, 40, 15, 0.28)');
  g.addColorStop(1, 'rgba(255, 250, 235, 0.25)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x + w - 130, y + h);
  ctx.lineTo(x + w, y + h - 130);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();

  // old coffee ring on the cover
  const rx = x + 120;
  const ry = y + h - 120;
  const ring = ctx.createRadialGradient(rx, ry, 10, rx, ry, 52);
  ring.addColorStop(0, 'rgba(120, 72, 24, 0.04)');
  ring.addColorStop(0.85, 'rgba(120, 72, 24, 0.10)');
  ring.addColorStop(0.96, 'rgba(92, 52, 16, 0.22)');
  ring.addColorStop(1, 'rgba(92, 52, 16, 0)');
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(rx, ry, 52, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}