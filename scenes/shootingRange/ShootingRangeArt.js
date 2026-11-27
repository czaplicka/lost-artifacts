// =============================================================================
// ShootingRangeArt.js - procedural placeholders for every range image.
// Used only when the matching file in assets/pi/shooting-range/ is missing.
// Each painter draws into a canvas of exactly IMAGES[name].w x IMAGES[name].h.
// =============================================================================
import { IMAGES, LANES, SHELF } from './ShootingRangeData.js';

const TAU = Math.PI * 2;
const fill = (ctx, c) => { ctx.fillStyle = c; ctx.fill(); };
const box = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const disc = (ctx, x, y, r, c) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); fill(ctx, c); };
const vgrad = (ctx, y0, y1, stops) => {
  const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g;
};
const seeded = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

function silhouette(ctx, body, head, outline) {
  ctx.beginPath(); ctx.arc(100, 62, 44, 0, TAU); fill(ctx, head);
  ctx.beginPath();
  ctx.moveTo(70, 104); ctx.lineTo(130, 104); ctx.quadraticCurveTo(170, 116, 172, 170);
  ctx.lineTo(166, 336); ctx.lineTo(34, 336); ctx.lineTo(28, 170); ctx.quadraticCurveTo(30, 116, 70, 104);
  fill(ctx, body);
  ctx.lineWidth = 3; ctx.strokeStyle = outline; ctx.stroke();
  ctx.beginPath(); ctx.arc(100, 62, 44, 0, TAU); ctx.stroke();
}

const PAINTERS = {
  lobby(ctx, w, h) {
    ctx.fillStyle = vgrad(ctx, 0, 700, [[0, '#3a2d22'], [1, '#2a2019']]); ctx.fillRect(0, 0, w, 700);
    for (let x = 0; x < w; x += 96) { box(ctx, x, 0, 4, 700, 'rgba(0,0,0,0.25)'); box(ctx, x + 4, 0, 2, 700, 'rgba(255,220,170,0.05)'); }
    box(ctx, 0, 430, w, 14, '#1c1510');
    ctx.fillStyle = vgrad(ctx, 700, h, [[0, '#4a3b2c'], [1, '#231a13']]); ctx.fillRect(0, 700, w, h - 700);
    for (let y = 720; y < h; y += 46) box(ctx, 0, y, w, 2, 'rgba(0,0,0,0.25)');
    // window into the range
    box(ctx, 1040, 120, 760, 300, '#11181a'); box(ctx, 1040, 120, 760, 300, 'rgba(120,170,160,0.12)');
    ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 10; ctx.strokeRect(1040, 120, 760, 300);
    for (const x of [1230, 1420, 1610]) box(ctx, x, 125, 6, 290, '#2a3433');
    for (const [x, s] of [[1135, 0.9], [1325, 0.7], [1515, 1], [1705, 0.8]]) {
      disc(ctx, x, 300 - 40 * s, 26 * s, '#e9e0c4'); disc(ctx, x, 300 - 40 * s, 18 * s, '#b8402c'); disc(ctx, x, 300 - 40 * s, 8 * s, '#e9e0c4');
    }
    // posters
    box(ctx, 120, 110, 260, 340, '#d8c9a0'); box(ctx, 132, 122, 236, 316, '#efe3c0');
    ctx.fillStyle = '#7b2a1e'; ctx.font = 'bold 34px SpecialElite, monospace'; ctx.textAlign = 'center';
    ctx.fillText('SAFETY', 250, 180); ctx.fillText('FIRST', 250, 222);
    ctx.fillStyle = '#3a2d22'; ctx.font = '19px SpecialElite, monospace';
    ['Treat every gun', 'as loaded.', 'Never point at', 'anything you do', 'not mean to hit.', '', '- R. Holloway'].forEach((t, i) => ctx.fillText(t, 250, 270 + i * 26));
    box(ctx, 440, 150, 200, 260, '#cfc6ad'); disc(ctx, 540, 260, 70, '#efe7d0'); disc(ctx, 540, 260, 50, '#b8402c'); disc(ctx, 540, 260, 30, '#efe7d0'); disc(ctx, 540, 260, 12, '#b8402c');
    for (const [x, y] of [[528, 250], [552, 270], [541, 258]]) disc(ctx, x, y, 4, '#1a1a1a');
    ctx.fillStyle = '#3a2d22'; ctx.font = '18px SpecialElite, monospace'; ctx.fillText('RECORD: 241', 540, 385);
    // counter
    ctx.fillStyle = vgrad(ctx, 760, 1000, [[0, '#6b4a2f'], [1, '#3b281a']]); ctx.fillRect(0, 760, w, 240);
    box(ctx, 0, 744, w, 26, '#8a643f'); box(ctx, 0, 744, w, 5, '#b08758');
    for (let x = 60; x < w; x += 240) box(ctx, x, 790, 180, 180, 'rgba(0,0,0,0.18)');
    // ammo boxes + ear muffs on the counter
    for (const [x, c] of [[1240, '#a3342a'], [1320, '#2f5d8a'], [1290, '#c99a2e']]) { box(ctx, x, 690, 70, 56, c); box(ctx, x + 8, 700, 54, 14, '#efe3c0'); }
    ctx.lineWidth = 9; ctx.strokeStyle = '#222'; ctx.beginPath(); ctx.arc(1560, 720, 44, Math.PI, 0); ctx.stroke();
    disc(ctx, 1516, 728, 20, '#c8452f'); disc(ctx, 1604, 728, 20, '#c8452f');
    // hanging lamp
    box(ctx, 698, 0, 4, 70, '#111'); ctx.beginPath(); ctx.moveTo(640, 110); ctx.lineTo(760, 110); ctx.lineTo(720, 70); ctx.lineTo(680, 70); fill(ctx, '#2c3a33');
    const glow = ctx.createRadialGradient(700, 140, 10, 700, 300, 520); glow.addColorStop(0, 'rgba(255,214,140,0.28)'); glow.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
  },

  lanes(ctx, w, h) {
    ctx.fillStyle = vgrad(ctx, 0, 420, [[0, '#262622'], [1, '#3b3a33']]); ctx.fillRect(0, 0, w, 420);
    const rnd = seeded(7);
    for (let i = 0; i < 260; i++) box(ctx, rnd() * w, rnd() * 400, 2 + rnd() * 5, 1 + rnd() * 3, 'rgba(0,0,0,0.18)');
    for (let y = 40; y < 420; y += 54) box(ctx, 0, y, w, 2, 'rgba(0,0,0,0.25)');
    // backstop berm
    ctx.fillStyle = '#4c3b2a'; ctx.beginPath(); ctx.moveTo(0, 430); ctx.quadraticCurveTo(w / 2, 360, w, 430); ctx.lineTo(w, 470); ctx.lineTo(0, 470); ctx.fill();
    // back shelf for bottles
    box(ctx, SHELF.minX - 80, SHELF.y, SHELF.maxX - SHELF.minX + 160, 14, '#6a4c30'); box(ctx, SHELF.minX - 80, SHELF.y + 14, SHELF.maxX - SHELF.minX + 160, 6, '#2a1d12');
    // floor in perspective
    ctx.fillStyle = vgrad(ctx, 460, 900, [[0, '#4d4a40'], [1, '#6c675a']]); ctx.fillRect(0, 460, w, 440);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3;
    for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(w / 2 + i * 70, 462); ctx.lineTo(w / 2 + i * 330, 900); ctx.stroke(); }
    // rails at every lane
    for (const lane of LANES) {
      box(ctx, lane.minX - 120, lane.y - 4 * lane.scale, lane.maxX - lane.minX + 240, 8 * lane.scale + 2, '#2b2b2b');
      box(ctx, lane.minX - 120, lane.y - 4 * lane.scale, lane.maxX - lane.minX + 240, 2, '#8d8d86');
    }
    // ceiling baffles + lamps
    for (let i = 0; i < 4; i++) { const y = 20 + i * 34; box(ctx, 0, y, w, 16 - i * 2, `rgba(20,20,18,${0.75 - i * 0.12})`); }
    for (const x of [380, 960, 1540]) {
      box(ctx, x - 70, 96, 140, 12, '#d8d4b6');
      const g = ctx.createRadialGradient(x, 110, 5, x, 420, 520); g.addColorStop(0, 'rgba(255,240,200,0.22)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, 900);
    }
    // shooting booth in the foreground
    ctx.fillStyle = vgrad(ctx, 900, h, [[0, '#5d4630'], [1, '#2f2217']]); ctx.fillRect(0, 900, w, h - 900);
    box(ctx, 0, 892, w, 18, '#8a6a46'); box(ctx, 0, 892, w, 4, '#b38c5f');
    for (const x of [0, w - 160]) { ctx.fillStyle = vgrad(ctx, 0, h, [[0, '#2d261e'], [1, '#18130e']]); ctx.fillRect(x, 0, 160, h); box(ctx, x + (x ? 0 : 152), 0, 8, h, '#4a3c2c'); }
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, w, 16);
  },

  sarge(ctx, w, h) {
    // shoulders / shirt
    ctx.beginPath(); ctx.moveTo(40, h); ctx.lineTo(60, 520); ctx.quadraticCurveTo(260, 430, 460, 520); ctx.lineTo(480, h); fill(ctx, '#5a6447');
    ctx.beginPath(); ctx.moveTo(220, 470); ctx.lineTo(260, 560); ctx.lineTo(300, 470); fill(ctx, '#e6dcc0');
    box(ctx, 120, 560, 70, 40, '#3e4632'); box(ctx, 330, 560, 70, 40, '#3e4632');
    disc(ctx, 360, 640, 16, '#d4af37'); box(ctx, 120, 640, 90, 14, '#22281c');
    // neck + head
    box(ctx, 220, 400, 80, 90, '#c99d7c');
    ctx.beginPath(); ctx.ellipse(260, 320, 110, 130, 0, 0, TAU); fill(ctx, '#d8ad8a');
    // grey hair, short
    ctx.beginPath(); ctx.ellipse(260, 240, 118, 72, 0, Math.PI, TAU); fill(ctx, '#b9b6ad');
    box(ctx, 142, 236, 22, 90, '#b9b6ad'); box(ctx, 356, 236, 22, 90, '#b9b6ad');
    // ear muffs around neck
    ctx.lineWidth = 12; ctx.strokeStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(260, 470, 120, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    disc(ctx, 152, 508, 30, '#c8452f'); disc(ctx, 368, 508, 30, '#c8452f');
    // face
    box(ctx, 200, 295, 40, 7, '#5b4636'); box(ctx, 282, 291, 40, 7, '#5b4636');
    disc(ctx, 222, 320, 7, '#2b2b2b'); disc(ctx, 300, 320, 7, '#2b2b2b');
    ctx.strokeStyle = '#a57858'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(262, 330); ctx.lineTo(252, 372); ctx.lineTo(268, 374); ctx.stroke();
    box(ctx, 228, 402, 64, 6, '#8d5a46');
    ctx.strokeStyle = 'rgba(120,80,60,0.5)'; ctx.lineWidth = 2;
    for (const [x, y] of [[190, 335], [330, 335]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (x < 260 ? -14 : 14), y + 8); ctx.stroke(); }
    // cap
    ctx.beginPath(); ctx.ellipse(260, 214, 122, 58, 0, Math.PI, TAU); fill(ctx, '#3e4632');
    box(ctx, 138, 208, 244, 18, '#2f3626'); ctx.beginPath(); ctx.ellipse(250, 226, 130, 22, 0, 0, Math.PI); fill(ctx, '#2a3021');
    disc(ctx, 260, 182, 14, '#d4af37');
  },

  bullseye(ctx) {
    box(ctx, 102, 200, 16, 100, '#6f5236'); box(ctx, 70, 288, 80, 12, '#4c3826');
    box(ctx, 4, 4, 212, 212, '#dcd2b4'); ctx.strokeStyle = '#6f5236'; ctx.lineWidth = 6; ctx.strokeRect(4, 4, 212, 212);
    const rings = [[100, '#f1ead6'], [80, '#1f1f1f'], [62, '#f1ead6'], [44, '#b8402c'], [30, '#f1ead6'], [20, '#b8402c']];
    for (const [r, c] of rings) disc(ctx, 110, 110, r, c);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(110, 8); ctx.lineTo(110, 212); ctx.moveTo(8, 110); ctx.lineTo(212, 110); ctx.stroke();
    ctx.fillStyle = '#1f1f1f'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.fillText('10', 110, 115);
  },

  thug(ctx) {
    silhouette(ctx, '#2e3640', '#2e3640', '#11161b');
    box(ctx, 64, 44, 72, 18, '#11161b');                         // mask band
    disc(ctx, 84, 53, 6, '#e9e0c4'); disc(ctx, 116, 53, 6, '#e9e0c4');
    ctx.beginPath(); ctx.moveTo(56, 26); ctx.lineTo(144, 26); ctx.lineTo(132, 6); ctx.lineTo(68, 6); fill(ctx, '#1a1f25'); box(ctx, 44, 24, 112, 8, '#1a1f25');
    box(ctx, 132, 196, 54, 22, '#151515'); box(ctx, 176, 190, 18, 12, '#151515'); // pistol in hand
    ctx.strokeStyle = 'rgba(233,224,196,0.6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(100, 200, 44, 56, 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(100, 200, 20, 26, 0, 0, TAU); ctx.stroke();
  },

  civilian(ctx) {
    silhouette(ctx, '#7d9cb2', '#e2c4a4', '#3a4b57');
    ctx.beginPath(); ctx.ellipse(100, 40, 52, 30, 0, Math.PI, TAU); fill(ctx, '#b9b6ad');      // grey perm
    disc(ctx, 60, 50, 16, '#b9b6ad'); disc(ctx, 140, 50, 16, '#b9b6ad');
    for (const x of [82, 118]) { ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, 64, 11, 0, TAU); ctx.stroke(); }
    ctx.strokeStyle = '#8d5a46'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(100, 86, 12, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    box(ctx, 120, 200, 64, 74, '#d9c48f'); ctx.strokeStyle = '#8a7444'; ctx.lineWidth = 3; ctx.strokeRect(120, 200, 64, 74); // shopping bag
    disc(ctx, 140, 196, 9, '#6f9a3d'); disc(ctx, 160, 192, 11, '#c8452f');
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px SpecialElite, monospace'; ctx.textAlign = 'center'; ctx.fillText('DON\'T', 74, 300); ctx.fillText('SHOOT', 74, 324);
  },

  bottle(ctx) {
    ctx.beginPath(); ctx.moveTo(26, 8); ctx.lineTo(44, 8); ctx.lineTo(44, 54); ctx.quadraticCurveTo(58, 66, 58, 90); ctx.lineTo(58, 162);
    ctx.quadraticCurveTo(58, 168, 52, 168); ctx.lineTo(18, 168); ctx.quadraticCurveTo(12, 168, 12, 162); ctx.lineTo(12, 90); ctx.quadraticCurveTo(12, 66, 26, 54); ctx.closePath();
    fill(ctx, 'rgba(70,130,70,0.88)'); ctx.strokeStyle = '#203d20'; ctx.lineWidth = 2; ctx.stroke();
    box(ctx, 24, 2, 22, 10, '#8a6a46'); box(ctx, 16, 100, 38, 40, '#e9dfc0'); box(ctx, 20, 108, 30, 6, '#b8402c');
    box(ctx, 18, 70, 5, 86, 'rgba(255,255,255,0.35)');
  },

  revolver(ctx, w, h) {
    // the gun points up-left towards the middle of the screen; origin = bottom right
    ctx.save(); ctx.translate(360, 300); ctx.rotate(0.38);
    box(ctx, -300, -36, 260, 34, '#2b2d30'); box(ctx, -300, -36, 260, 8, '#4a4d52');           // barrel
    box(ctx, -306, -44, 16, 10, '#2b2d30');                                                     // front sight
    ctx.beginPath(); ctx.ellipse(-20, -14, 70, 46, 0, 0, TAU); fill(ctx, '#34373b');           // cylinder
    for (const y of [-40, -14, 12]) box(ctx, -78, y - 4, 116, 6, '#1d1f21');
    box(ctx, 30, -48, 90, 70, '#2b2d30');                                                       // frame
    ctx.beginPath(); ctx.moveTo(50, 20); ctx.lineTo(130, 10); ctx.lineTo(210, 190); ctx.lineTo(110, 220); fill(ctx, '#6b4426'); // grip
    ctx.strokeStyle = '#3b2414'; ctx.lineWidth = 3; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(80 + i * 14, 60); ctx.lineTo(120 + i * 14, 180); ctx.stroke(); }
    ctx.lineWidth = 8; ctx.strokeStyle = '#2b2d30'; ctx.beginPath(); ctx.arc(30, 40, 30, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke(); // trigger guard
    ctx.restore();
    // hand
    ctx.beginPath(); ctx.moveTo(300, h); ctx.quadraticCurveTo(330, 330, 430, 310); ctx.quadraticCurveTo(540, 320, w, 360); ctx.lineTo(w, h); fill(ctx, '#c99d7c');
    ctx.beginPath(); ctx.moveTo(300, h); ctx.quadraticCurveTo(320, 400, 380, 380); ctx.lineTo(w, 430); ctx.lineTo(w, h); fill(ctx, '#3c4a5a'); // sleeve
  },

  crosshair(ctx, w, h) {
    const c = w / 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(c, c, 26, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#f2e6b0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(c, c, 26, 0, TAU); ctx.stroke();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(c + dx * 12, c + dy * 12); ctx.lineTo(c + dx * 42, c + dy * 42); ctx.stroke();
      ctx.strokeStyle = '#f2e6b0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(c + dx * 12, c + dy * 12); ctx.lineTo(c + dx * 42, c + dy * 42); ctx.stroke();
    }
    disc(ctx, c, c, 3, '#e0463c');
  },

  hole(ctx, w) {
    const c = w / 2; disc(ctx, c, c, 12, 'rgba(60,40,20,0.45)'); disc(ctx, c, c, 7, '#141210'); disc(ctx, c - 2, c - 2, 2, 'rgba(255,255,255,0.25)');
  },

  bullet(ctx) {
    ctx.beginPath(); ctx.moveTo(3, 20); ctx.quadraticCurveTo(11, -4, 19, 20); fill(ctx, '#b87a3a');
    box(ctx, 3, 20, 16, 26, '#d8b24a'); box(ctx, 3, 20, 4, 26, '#f4dc8a'); box(ctx, 1, 42, 20, 5, '#a8862e');
  }
};

// Placeholders laid out for the old sizes are fitted onto the delivered sizes / zones.
const fitted = (paint, k, dx, dy) => (ctx, w, h) => { ctx.save(); ctx.translate(dx, dy); ctx.scale(k, k); paint(ctx, w, h); ctx.restore(); };
PAINTERS.bullseye = fitted(PAINTERS.bullseye, 0.79, 100 - 110 * 0.79, 138 - 110 * 0.79);
PAINTERS.bottle = fitted(PAINTERS.bottle, 70 / 170, (70 - 70 * 70 / 170) / 2, 0);
PAINTERS.thugFront = PAINTERS.thug;
PAINTERS.civilian2 = PAINTERS.civilian;

/** Create placeholder textures for every image whose file did not load. */
export function ensureRangeTextures(scene) {
  for (const [name, spec] of Object.entries(IMAGES)) {
    if (scene.textures.exists(spec.key)) continue;
    const tex = scene.textures.createCanvas(spec.key, spec.w, spec.h);
    if (!tex) continue;
    PAINTERS[name](tex.getContext(), spec.w, spec.h);
    tex.refresh();
  }
}
