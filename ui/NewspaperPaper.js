import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// ---------------------------------------------------------------------------
// ui/NewspaperPaper.js
//
// Paints the daily newspaper background in code (no bitmap needed):
// aged newsprint, fibres, coffee stains, printed rules/frames/label bars,
// ink wear, centre fold, burnt edges and a torn outline.
//
// The texture is created once per game session and cached by key.
// ---------------------------------------------------------------------------

export const DAILY_PAPER_KEY = 'paper_daily_procedural';
export const HALFTONE_KEY = 'paper_halftone_dots';

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

export function ensureDailyPaperTexture(scene, layout, key = DAILY_PAPER_KEY) {
  if (scene.textures.exists(key)) return key;

  const width = layout?.pageWidth || 1920;
  const height = layout?.pageHeight || 1080;

  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) return null;

  paintPaper(texture.getContext(), width, height, layout?.structure || {});
  texture.refresh();

  return key;
}

// Small tileable dot pattern used as a halftone overlay on photos.
export function ensureHalftoneTexture(scene, key = HALFTONE_KEY) {
  if (scene.textures.exists(key)) return key;

  const texture = scene.textures.createCanvas(key, 6, 6);
  if (!texture) return null;

  const ctx = texture.getContext();
  ctx.fillStyle = __dialogueText("ui/NewspaperPaper.js", "t_f13cbdf79a7f6546791b");
  ctx.beginPath();
  ctx.arc(3, 3, 1.5, 0, Math.PI * 2);
  ctx.fill();
  texture.refresh();

  return key;
}

function paintPaper(ctx, W, H, structure) {
  const rand = mulberry32(1939);

  paintBase(ctx, W, H, rand);
  paintFibers(ctx, W, H, rand);
  paintStains(ctx, W, H, rand);
  paintStructure(ctx, structure);
  paintInkWear(ctx, W, H, rand);
  paintFolds(ctx, W, H);
  paintAging(ctx, W, H);
  paintTornEdge(ctx, W, H, rand);
}

// Newsprint: warm cream + low frequency blotches + fine grain.
function paintBase(ctx, W, H, rand) {
  const image = ctx.createImageData(W, H);
  const data = image.data;

  const GW = 36;
  const GH = 21;
  const grid = [];

  for (let j = 0; j <= GH; j++) {
    const row = [];
    for (let i = 0; i <= GW; i++) row.push(rand());
    grid.push(row);
  }

  const cellW = W / GW;
  const cellH = H / GH;

  for (let y = 0; y < H; y++) {
    const gy = y / cellH;
    const j = Math.floor(gy);
    const fy = gy - j;
    const sy = fy * fy * (3 - 2 * fy);

    for (let x = 0; x < W; x++) {
      const gx = x / cellW;
      const i = Math.floor(gx);
      const fx = gx - i;
      const sx = fx * fx * (3 - 2 * fx);

      const a = grid[j][i];
      const b = grid[j][i + 1];
      const c = grid[j + 1][i];
      const e = grid[j + 1][i + 1];

      const blot = a + (b - a) * sx + (c - a) * sy + (a - b - c + e) * sx * sy;
      const grain = (rand() - 0.5) * 14;
      const t = (blot - 0.5) * 20 + grain;

      const p = (y * W + x) * 4;
      data[p] = clamp(233 + t);
      data[p + 1] = clamp(216 + t * 0.92);
      data[p + 2] = clamp(178 + t * 0.7);
      data[p + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
}

function paintFibers(ctx, W, H, rand) {
  ctx.lineCap = 'round';

  for (let n = 0; n < 2600; n++) {
    const x = rand() * W;
    const y = rand() * H;
    const len = 6 + rand() * 26;
    const angle = rand() * Math.PI * 2;
    const dark = rand() < 0.7;

    ctx.strokeStyle = dark
      ? `${__dialogueText("ui/NewspaperPaper.js", "t_454d89fc4af6c838c9cb")}${0.04 + rand() * 0.08}${__dialogueText("ui/NewspaperPaper.js", "t_ba5ec51d07a4ac0e9516")}`
      : `${__dialogueText("ui/NewspaperPaper.js", "t_e3776a502c892f6ca9d7")}${0.06 + rand() * 0.10}${__dialogueText("ui/NewspaperPaper.js", "t_ba5ec51d07a4ac0e9516")}`;
    ctx.lineWidth = 0.6 + rand() * 0.8;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(angle) * len * 0.5 + (rand() - 0.5) * 6,
      y + Math.sin(angle) * len * 0.5 + (rand() - 0.5) * 6,
      x + Math.cos(angle) * len,
      y + Math.sin(angle) * len
    );
    ctx.stroke();
  }
}

function coffeeRing(ctx, x, y, r, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.5);
  ctx.scale(1, 0.9);

  const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
  g.addColorStop(0, `${__dialogueText("ui/NewspaperPaper.js", "t_7aa13d8ce1a40b733f6e")}${alpha * 0.18}${__dialogueText("ui/NewspaperPaper.js", "t_ba5ec51d07a4ac0e9516")}`);
  g.addColorStop(0.84, `${__dialogueText("ui/NewspaperPaper.js", "t_7aa13d8ce1a40b733f6e")}${alpha * 0.28}${__dialogueText("ui/NewspaperPaper.js", "t_ba5ec51d07a4ac0e9516")}`);
  g.addColorStop(0.95, `${__dialogueText("ui/NewspaperPaper.js", "t_ae6032f0ce5427b01659")}${alpha}${__dialogueText("ui/NewspaperPaper.js", "t_ba5ec51d07a4ac0e9516")}`);
  g.addColorStop(1, __dialogueText("ui/NewspaperPaper.js", "t_74548834764eff68a98a"));

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintStains(ctx, W, H, rand) {
  coffeeRing(ctx, W / 2 - 58, H - 22, 62, 0.2);
  coffeeRing(ctx, W / 2 + 52, 38, 44, 0.14);

  // foxing: tiny brown age spots
  for (let n = 0; n < 70; n++) {
    const x = rand() * W;
    const y = rand() * H;
    const r = 0.8 + rand() * 2.4;

    ctx.fillStyle = `${__dialogueText("ui/NewspaperPaper.js", "t_c88b8b8b0c40a5f22ba0")}${0.06 + rand() * 0.12}${__dialogueText("ui/NewspaperPaper.js", "t_ba5ec51d07a4ac0e9516")}`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Printed rules, frames and label bars. Multiply keeps the paper texture
// visible through the ink.
function paintStructure(ctx, structure) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';

  const ink = __dialogueText("ui/NewspaperPaper.js", "t_caf793a8673d19a24ef9");
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineCap = 'butt';

  for (const rule of structure.rules || []) drawRule(ctx, rule);

  for (const frame of structure.frames || []) {
    ctx.lineWidth = frame.lw || 2;
    ctx.strokeRect(frame.x + 0.5, frame.y + 0.5, frame.w, frame.h);
  }

  for (const bar of structure.bars || []) {
    ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
  }

  ctx.restore();
}

function drawRule(ctx, rule) {
  const horizontal = rule.y1 === rule.y2;

  const line = (offset, width) => {
    ctx.lineWidth = width;
    ctx.beginPath();

    if (horizontal) {
      ctx.moveTo(rule.x1, rule.y1 + offset);
      ctx.lineTo(rule.x2, rule.y2 + offset);
    } else {
      ctx.moveTo(rule.x1 + offset, rule.y1);
      ctx.lineTo(rule.x2 + offset, rule.y2);
    }

    ctx.stroke();
  };

  if (rule.style === 'double') {
    line(0, 4);
    line(7, 1.2);
  } else if (rule.style === 'dotted') {
    ctx.setLineDash([2, 4]);
    line(0, 1.5);
    ctx.setLineDash([]);
  } else {
    line(0, rule.w || 1.5);
  }
}

// Ink never prints perfectly: scatter tiny paper-coloured dropouts.
function paintInkWear(ctx, W, H, rand) {
  ctx.fillStyle = __dialogueText("ui/NewspaperPaper.js", "t_3787d120a698ff9490ef");

  for (let n = 0; n < 2600; n++) {
    ctx.fillRect(rand() * W, rand() * H, 1 + rand() * 1.6, 1 + rand() * 1.6);
  }
}

function paintFolds(ctx, W, H) {
  // centre gutter between the two pages
  const gx = W / 2;
  let g = ctx.createLinearGradient(gx - 60, 0, gx + 60, 0);
  g.addColorStop(0, __dialogueText("ui/NewspaperPaper.js", "t_f6085a66c394e05f2db5"));
  g.addColorStop(0.46, __dialogueText("ui/NewspaperPaper.js", "t_145a5a4275b644c91308"));
  g.addColorStop(0.5, __dialogueText("ui/NewspaperPaper.js", "t_be19b57c23f11f0458b4"));
  g.addColorStop(0.54, __dialogueText("ui/NewspaperPaper.js", "t_1a2bf36a880b047fc2d8"));
  g.addColorStop(0.62, __dialogueText("ui/NewspaperPaper.js", "t_6fc49790091f4cb840de"));
  g.addColorStop(1, __dialogueText("ui/NewspaperPaper.js", "t_f6085a66c394e05f2db5"));
  ctx.fillStyle = g;
  ctx.fillRect(gx - 60, 0, 120, H);

  // faint horizontal crease (paper was folded in four)
  g = ctx.createLinearGradient(0, H / 2 - 10, 0, H / 2 + 10);
  g.addColorStop(0, __dialogueText("ui/NewspaperPaper.js", "t_f6085a66c394e05f2db5"));
  g.addColorStop(0.5, __dialogueText("ui/NewspaperPaper.js", "t_4264a96da9c8183594ac"));
  g.addColorStop(1, __dialogueText("ui/NewspaperPaper.js", "t_f6085a66c394e05f2db5"));
  ctx.fillStyle = g;
  ctx.fillRect(0, H / 2 - 10, W, 20);
}

function paintAging(ctx, W, H) {
  const edge = (x0, y0, x1, y1, rx, ry, rw, rh) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, __dialogueText("ui/NewspaperPaper.js", "t_b14aba483cebe3f26c82"));
    g.addColorStop(1, __dialogueText("ui/NewspaperPaper.js", "t_147f476ddab836895ef2"));
    ctx.fillStyle = g;
    ctx.fillRect(rx, ry, rw, rh);
  };

  edge(0, 0, 70, 0, 0, 0, 70, H);
  edge(W, 0, W - 70, 0, W - 70, 0, 70, H);
  edge(0, 0, 0, 70, 0, 0, W, 70);
  edge(0, H, 0, H - 70, 0, H - 70, W, 70);

  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
  v.addColorStop(0, __dialogueText("ui/NewspaperPaper.js", "t_1cded8efd77feee88cb7"));
  v.addColorStop(1, __dialogueText("ui/NewspaperPaper.js", "t_a057ec1d3e6e9c96e64d"));
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

// Erase a jagged border so the dimmed scene shows through: torn edge.
function paintTornEdge(ctx, W, H, rand) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';

  const step = 14;
  const inset = () => 1.5 + rand() * 5.5;
  const points = [];

  for (let x = 0; x <= W; x += step) points.push([x, inset()]);
  for (let y = 0; y <= H; y += step) points.push([W - inset(), y]);
  for (let x = W; x >= 0; x -= step) points.push([x, H - inset()]);
  for (let y = H; y >= 0; y -= step) points.push([inset(), y]);

  ctx.beginPath();
  ctx.rect(-5, -5, W + 10, H + 10);
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill('evenodd');

  ctx.restore();
}