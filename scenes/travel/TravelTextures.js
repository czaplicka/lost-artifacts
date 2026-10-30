// scenes/travel/TravelTextures.js
// Shared layout helpers + procedurally generated textures for the travel transition.
// Nothing here needs external assets - every texture is drawn once and cached by Phaser.

export const TRAVEL_DEPTH = {
  desk: 0,
  map: 1,
  route: 3,
  pin: 4,
  trail: 5,
  vehicle: 6,
  dust: 7,
  vignette: 8,
  fade: 9,
  ui: 12,
  popup: 20,
  weather: 22,
  hint: 30
};

/** Font size string scaled by the layout factor U (min keeps PressStart2P readable). */
export const fs = (U, size, min = 10) => `${Math.max(min, Math.round(size * U))}px`;

/** 0xRRGGBB -> '#rrggbb' */
export const hex = (value) => `#${Number(value).toString(16).padStart(6, '0')}`;

export const pick = (list) => list[Math.floor(Math.random() * list.length)];

/** 'New York City' / 'new_york_city' -> 'newyorkcity' (matches the manifest texture keys). */
export const normalizeKey = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

// ---------------------------------------------------------------------------
// Vehicles: 96x96, top-down, heading +X (Phaser rotates them along the route).
// ---------------------------------------------------------------------------

const INK = 0x2b1d12;

function poly(g, points, fill, stroke = INK, width = 3) {
  const pts = points.map(([x, y]) => ({ x, y }));
  g.fillStyle(fill, 1);
  g.fillPoints(pts, true);
  g.lineStyle(width, stroke, 1);
  g.strokePoints(pts, true);
}

const VEHICLE_PAINTERS = {
  plane(g) {
    poly(g, [[54, 44], [36, 8], [48, 8], [72, 44]], 0xd9ccaa);
    poly(g, [[54, 52], [36, 88], [48, 88], [72, 52]], 0xd9ccaa);
    poly(g, [[24, 45], [10, 28], [18, 28], [32, 45]], 0xd9ccaa);
    poly(g, [[24, 51], [10, 68], [18, 68], [32, 51]], 0xd9ccaa);
    g.fillStyle(0xf4e7c1, 1);
    g.fillRoundedRect(8, 41, 80, 14, 7);
    g.lineStyle(3, INK, 1);
    g.strokeRoundedRect(8, 41, 80, 14, 7);
    g.fillStyle(0xb3261e, 1);
    g.fillRect(30, 45, 26, 6);
    g.fillStyle(0x2b4a66, 1);
    g.fillRoundedRect(70, 44, 12, 8, 3);
  },

  train(g) {
    const cars = [[6, 26, 0x3f7f8f], [34, 26, 0x3f7f8f], [62, 30, 0xa83232]];
    cars.forEach(([x, w, color], index) => {
      g.fillStyle(color, 1);
      g.fillRoundedRect(x, 38, w, 20, 5);
      g.lineStyle(3, INK, 1);
      g.strokeRoundedRect(x, 38, w, 20, 5);
      g.fillStyle(0xf4e7c1, 0.9);
      const windows = index === 2 ? 2 : 3;
      for (let i = 0; i < windows; i++) g.fillRect(x + 4 + i * 7, 43, 4, 5);
    });
    g.fillStyle(INK, 1);
    g.fillRect(32, 47, 2, 2);
    g.fillRect(60, 47, 2, 2);
    g.fillCircle(84, 48, 3);
  },

  bus(g) {
    g.fillStyle(0xe0a62b, 1);
    g.fillRoundedRect(16, 34, 64, 28, 6);
    g.lineStyle(3, INK, 1);
    g.strokeRoundedRect(16, 34, 64, 28, 6);
    g.fillStyle(0x23394d, 1);
    for (let i = 0; i < 4; i++) g.fillRect(22 + i * 12, 38, 9, 8);
    g.fillRect(72, 37, 6, 22);
    g.fillStyle(0x1a1a1a, 1);
    [24, 58].forEach((x) => {
      g.fillRect(x, 30, 10, 5);
      g.fillRect(x, 61, 10, 5);
    });
    g.fillStyle(0xfff1b0, 1);
    g.fillRect(79, 38, 2, 5);
    g.fillRect(79, 53, 2, 5);
  },

  ship(g) {
    poly(g, [[10, 34], [62, 34], [90, 48], [62, 62], [10, 62]], 0x35495e);
    poly(g, [[16, 40], [60, 40], [80, 48], [60, 56], [16, 56]], 0xd9c7a4, INK, 2);
    g.fillStyle(0x8a5a33, 1);
    g.fillRect(44, 43, 12, 10);
    g.fillStyle(0xb3261e, 1);
    g.fillCircle(32, 48, 7);
    g.lineStyle(2, INK, 1);
    g.strokeCircle(32, 48, 7);
    g.fillStyle(INK, 1);
    g.fillCircle(32, 48, 3);
  }
};

// ---------------------------------------------------------------------------
// Canvas gradient textures (drawn at low res, scaled up - gradients stay smooth).
// ---------------------------------------------------------------------------

function canvasTexture(scene, key, width, height, paint) {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) return;
  paint(texture.getContext(), width, height);
  texture.refresh();
}

function paintDesk(ctx, w, h) {
  const gradient = ctx.createRadialGradient(w * 0.5, h * 0.42, h * 0.08, w * 0.5, h * 0.5, w * 0.72);
  gradient.addColorStop(0, '#3a2c1c');
  gradient.addColorStop(0.55, '#17130f');
  gradient.addColorStop(1, '#07111a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function paintVignette(ctx, w, h) {
  const gradient = ctx.createRadialGradient(w / 2, h / 2, h * 0.34, w / 2, h / 2, w * 0.62);
  gradient.addColorStop(0, 'rgba(3,8,14,0)');
  gradient.addColorStop(1, 'rgba(3,8,14,0.88)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function paintFade(ctx, w, h) {
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, 'rgba(3,8,14,0.96)');
  gradient.addColorStop(1, 'rgba(3,8,14,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

// Used only when the real 'mapbg' texture is not loaded.
function paintFallbackMap(ctx, w, h) {
  ctx.fillStyle = '#cdb07a';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = `rgba(110,75,35,${0.03 + Math.random() * 0.05})`;
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, 10 + Math.random() * 60, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(90,60,30,0.28)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(90,60,30,0.65)';
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, w - 24, h - 24);
}

export function ensureTravelTextures(scene) {
  const graphicsTexture = (key, w, h, paint) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    paint(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };

  Object.entries(VEHICLE_PAINTERS).forEach(([id, paint]) => {
    graphicsTexture(`travel-vehicle-${id}`, 96, 96, paint);
  });

  graphicsTexture('travel-dot', 8, 8, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
  });

  graphicsTexture('travel-puff', 32, 32, (g) => {
    g.fillStyle(0xffffff, 0.25);
    g.fillCircle(16, 16, 16);
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(16, 16, 10);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(16, 16, 5);
  });

  graphicsTexture('travel-rain-drop', 2, 18, (g) => {
    g.fillStyle(0xb7d8ff, 0.95);
    g.fillRect(0, 0, 2, 18);
  });

  canvasTexture(scene, 'travel-desk', 480, 270, paintDesk);
  canvasTexture(scene, 'travel-vignette', 480, 270, paintVignette);
  canvasTexture(scene, 'travel-fade', 4, 64, paintFade);
  canvasTexture(scene, 'travel-fallback-map', 960, 540, paintFallbackMap);
}
