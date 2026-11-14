const PREFIX = '__tv_';

export function parseColor(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = parseInt(value.replace('#', ''), 16);

    return Number.isNaN(parsed) ? fallback : parsed;
  }

  return fallback;
}

export function mixColor(a, b, t) {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;

  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;

  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);

  return (r << 16) | (g << 8) | bl;
}

const rgba = (n, alpha = 1) =>
  `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;

const hex = (n) => (n >>> 0).toString(16).padStart(6, '0');

/**
 * Wycina białe tło z JPG-ów (anchorzy). Flood fill idzie tylko od krawędzi,
 * więc białe elementy wewnątrz postaci (koszula, kartki) zostają.
 */
export function ensureKeyedTexture(scene, sourceKey, maxSize = 640) {
  if (!sourceKey || !scene?.textures) return null;

  const key = `${PREFIX}keyed_${sourceKey}`;

  if (scene.textures.exists(key)) return key;
  if (!scene.textures.exists(sourceKey)) return null;

  try {
    const src = scene.textures.get(sourceKey).getSourceImage();

    const sw = src.naturalWidth || src.width;
    const sh = src.naturalHeight || src.height;

    if (!sw || !sh) return null;

    const scale = Math.min(1, maxSize / Math.max(sw, sh));
    const w = Math.max(8, Math.round(sw * scale));
    const h = Math.max(8, Math.round(sh * scale));

    const tex = scene.textures.createCanvas(key, w, h);
    const ctx = tex.getContext();

    ctx.drawImage(src, 0, 0, w, h);

    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;

    const total = w * h;
    const visited = new Uint8Array(total);
    const stack = new Int32Array(total);

    let sp = 0;

    const isBackground = (p) => {
      const i = p * 4;

      if (d[i + 3] < 16) return true;

      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];

      const mn = Math.min(r, g, b);
      const mx = Math.max(r, g, b);

      return mn >= 226 && mx - mn <= 26;
    };

    const push = (p) => {
      if (visited[p] || !isBackground(p)) return;

      visited[p] = 1;
      stack[sp++] = p;
    };

    for (let x = 0; x < w; x++) {
      push(x);
      push((h - 1) * w + x);
    }

    for (let y = 0; y < h; y++) {
      push(y * w);
      push(y * w + w - 1);
    }

    while (sp > 0) {
      const p = stack[--sp];
      const x = p % w;
      const y = (p / w) | 0;

      if (x > 0) push(p - 1);
      if (x < w - 1) push(p + 1);
      if (y > 0) push(p - w);
      if (y < h - 1) push(p + w);
    }

    for (let p = 0; p < total; p++) {
      if (visited[p]) d[p * 4 + 3] = 0;
    }

    // miękka krawędź na styku z usuniętym tłem (artefakty JPG)
    for (let p = 0; p < total; p++) {
      if (visited[p]) continue;

      const x = p % w;
      const y = (p / w) | 0;

      const touchesBackground =
        (x > 0 && visited[p - 1]) ||
        (x < w - 1 && visited[p + 1]) ||
        (y > 0 && visited[p - w]) ||
        (y < h - 1 && visited[p + w]);

      if (!touchesBackground) continue;

      const i = p * 4;
      const mn = Math.min(d[i], d[i + 1], d[i + 2]);

      if (mn > 190) {
        const alpha = Math.min(1, Math.max(0, (255 - mn) / 65));

        d[i + 3] = Math.round(255 * alpha);
      }
    }

    ctx.putImageData(img, 0, 0);
    tex.refresh();

    return key;
  } catch (error) {
    if (scene.textures.exists(key)) scene.textures.remove(key);

    console.warn('[TV] Keying failed:', error);

    return null;
  }
}

/**
 * Scenografia dla segmentów bez własnego tła.
 * kind: 'stage' (prezenter) albo 'ad' (sunburst).
 * Wypiekane w połowie rozdzielczości, bo to gładkie gradienty.
 */
export function ensureBackdropTexture(scene, width, height, colors, kind) {
  const w = Math.max(32, Math.round(width / 2));
  const h = Math.max(32, Math.round(height / 2));

  const { base, top, badge } = colors;

  const key = `${PREFIX}bd_${kind}_${w}x${h}_${hex(base)}_${hex(top)}_${hex(badge)}`;

  if (scene.textures.exists(key)) return key;

  try {
    const tex = scene.textures.createCanvas(key, w, h);
    const ctx = tex.getContext();

    const grad = ctx.createLinearGradient(0, 0, 0, h);

    grad.addColorStop(0, rgba(mixColor(base, 0x000000, 0.4)));
    grad.addColorStop(0.55, rgba(base));
    grad.addColorStop(1, rgba(mixColor(base, badge, 0.3)));

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    if (kind === 'ad') {
      const cx = w / 2;
      const cy = h * 0.52;
      const rays = 20;
      const radius = Math.hypot(w, h);

      for (let i = 0; i < rays; i += 2) {
        const a0 = (i / rays) * Math.PI * 2;
        const a1 = ((i + 1) / rays) * Math.PI * 2;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, a0, a1);
        ctx.closePath();

        ctx.fillStyle = rgba(badge, 0.14);
        ctx.fill();
      }

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 0.7);

      glow.addColorStop(0, rgba(mixColor(top, 0xffffff, 0.3), 0.35));
      glow.addColorStop(1, rgba(top, 0));

      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    } else {
      const sx = w * 0.28;
      const sy = h * 0.42;

      const spot = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.8);

      spot.addColorStop(0, rgba(mixColor(top, 0xffffff, 0.25), 0.4));
      spot.addColorStop(1, rgba(top, 0));

      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = rgba(0xffffff, 0.04);
      ctx.lineWidth = 2;

      for (let x = -h; x < w; x += 18) {
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(x + h, 0);
        ctx.stroke();
      }

      ctx.fillStyle = rgba(0x000000, 0.3);
      ctx.fillRect(0, h * 0.9, w, h * 0.1);
    }

    tex.refresh();

    return key;
  } catch (error) {
    if (scene.textures.exists(key)) scene.textures.remove(key);

    console.warn('[TV] Backdrop failed:', error);

    return null;
  }
}

export function ensureVignetteTexture(scene, width, height) {
  const w = Math.max(32, Math.round(width / 2));
  const h = Math.max(32, Math.round(height / 2));
  const key = `${PREFIX}vignette_${w}x${h}`;

  if (scene.textures.exists(key)) return key;

  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();

  const grad = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.25,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.75
  );

  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0.8)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  tex.refresh();

  return key;
}

export function ensureScanlineTexture(scene) {
  const key = `${PREFIX}scanlines`;

  if (scene.textures.exists(key)) return key;

  const tex = scene.textures.createCanvas(key, 4, 4);
  const ctx = tex.getContext();

  ctx.fillStyle = 'rgba(0,0,0,0.26)';
  ctx.fillRect(0, 2, 4, 2);

  tex.refresh();

  return key;
}

export function ensureNoiseTexture(scene) {
  const key = `${PREFIX}noise`;

  if (scene.textures.exists(key)) return key;

  const tex = scene.textures.createCanvas(key, 128, 128);
  const ctx = tex.getContext();
  const img = ctx.createImageData(128, 128);

  for (let i = 0; i < img.data.length; i += 4) {
    const v = (Math.random() * 255) | 0;

    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }

  ctx.putImageData(img, 0, 0);
  tex.refresh();

  return key;
}

export function ensureBarsTexture(scene, width, height) {
  const w = Math.max(32, Math.round(width / 2));
  const h = Math.max(32, Math.round(height / 2));
  const key = `${PREFIX}bars_${w}x${h}`;

  if (scene.textures.exists(key)) return key;

  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();

  const bars = [
    '#c0c0c0',
    '#c0c000',
    '#00c0c0',
    '#00c000',
    '#c000c0',
    '#c00000',
    '#0000c0'
  ];

  const barW = w / bars.length;
  const mainH = h * 0.7;

  bars.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(i * barW), 0, Math.ceil(barW), mainH);
  });

  const lower = ['#0000c0', '#111111', '#c000c0', '#111111', '#00c0c0', '#111111', '#c0c0c0'];

  lower.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(i * barW), mainH, Math.ceil(barW), h * 0.12);
  });

  ctx.fillStyle = '#101010';
  ctx.fillRect(0, h * 0.82, w, h * 0.18);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(w * 0.1, h * 0.86, w * 0.16, h * 0.1);

  tex.refresh();

  return key;
}