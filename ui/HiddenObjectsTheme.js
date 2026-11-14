import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// ui/HiddenObjectsTheme.js
// Wspólny motyw wizualny sceny Hidden Objects:
// "teczka śledcza" - papier, pieczątki, taśma policyjna, znaczniki dowodów.
// Wszystkie tekstury są rysowane proceduralnie (zero nowych assetów).

export const HO_FONTS = {
  body: __dialogueText("ui/HiddenObjectsTheme.js", "t_749639cb7eb80c7ff9a7"),
  pixel: __dialogueText("ui/HiddenObjectsTheme.js", "t_8579050150a2d7c2e239")
};

export const HO_COLORS = {
  // liczby (Graphics / Rectangle)
  gold: 0xd4af37,
  goldLight: 0xf0d48a,
  brass: 0x8b6b2f,
  brassLight: 0xa07a34,
  brassDark: 0x5c4620,
  plate: 0x1a1511,
  leather: 0x15110d,
  ink: 0x2b2118,
  inkSoft: 0x6b5a3e,
  red: 0xd9382f,
  redInk: 0x9a2b2b,
  green: 0x2f7d32,
  tapeYellow: 0xffd23f,

  // stringi (Text)
  inkHex: '#2b2118',
  inkSoftHex: '#6b5a3e',
  inkFaintHex: '#9a8a68',
  redHex: '#d9382f',
  redInkHex: '#8b1e1e',
  greenHex: '#2f7d32',
  goldHex: '#d4af37',
  cream: '#f8e7b9',
  amber: '#ffd966',
  lime: '#7CFC00'
};

// ---------------------------------------------------------------------------
// Pomocnicze
// ---------------------------------------------------------------------------

export function mulberry32(seed) {
  let a = seed >>> 0;

  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Tworzy teksturę canvas tylko raz (cache w TextureManager).
 * Zwraca klucz albo null, jeśli się nie udało.
 */
export function ensureCanvasTexture(scene, key, width, height, painter) {
  if (!scene?.textures) {
    return null;
  }

  if (scene.textures.exists(key)) {
    return key;
  }

  const w = Math.max(2, Math.round(width));
  const h = Math.max(2, Math.round(height));

  try {
    const texture = scene.textures.createCanvas(key, w, h);
    const ctx = texture.getContext();

    painter(ctx, w, h);
    texture.refresh();

    return key;
  } catch (error) {
    console.warn(
      `[HiddenObjectsTheme] Could not create texture "${key}".`,
      error
    );

    if (scene.textures.exists(key)) {
      scene.textures.remove(key);
    }

    return null;
  }
}

// ---------------------------------------------------------------------------
// Papier
// ---------------------------------------------------------------------------

function paintPaper(ctx, w, h, options) {
  const {
    seed = 1,
    base = '#dfcd9f',
    edge = '70,45,15',
    stain = null
  } = options;

  const rnd = mulberry32(seed);

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // Duże, miękkie plamy - papier nigdy nie jest równy.
  const blotches = Math.round((w * h) / 9000) + 8;

  for (let i = 0; i < blotches; i += 1) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = 30 + rnd() * 110;
    const light = rnd() > 0.5;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);

    gradient.addColorStop(
      0,
      light
        ? __dialogueText("ui/HiddenObjectsTheme.js", "t_07f9a6496b87d65b7ff6")
        : __dialogueText("ui/HiddenObjectsTheme.js", "t_bfea9a5939ee9b96793f")
    );

    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Ziarno.
  const specks = Math.round((w * h) / 160);

  for (let i = 0; i < specks; i += 1) {
    const dark = rnd() > 0.55;
    const alpha = 0.05 + rnd() * 0.11;

    ctx.fillStyle = dark
      ? `rgba(90,60,25,${alpha})`
      : `rgba(255,250,230,${alpha})`;

    ctx.fillRect(
      rnd() * w,
      rnd() * h,
      1 + rnd() * 1.5,
      1 + rnd() * 1.5
    );
  }

  // Włókna.
  const fibers = Math.round((w * h) / 4000);

  ctx.lineWidth = 1;

  for (let i = 0; i < fibers; i += 1) {
    const x = rnd() * w;
    const y = rnd() * h;

    ctx.strokeStyle = `rgba(110,80,40,${0.05 + rnd() * 0.07})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rnd() - 0.5) * 14, y + (rnd() - 0.5) * 6);
    ctx.stroke();
  }

  // Przypalone / wytarte brzegi.
  const edgeSize = 26;
  const edgeColor = (alpha) => `rgba(${edge},${alpha})`;

  const fillEdge = (x0, y0, x1, y1, rx, ry, rw, rh) => {
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);

    gradient.addColorStop(0, edgeColor(0.38));
    gradient.addColorStop(1, edgeColor(0));

    ctx.fillStyle = gradient;
    ctx.fillRect(rx, ry, rw, rh);
  };

  fillEdge(0, 0, edgeSize, 0, 0, 0, edgeSize, h);
  fillEdge(w, 0, w - edgeSize, 0, w - edgeSize, 0, edgeSize, h);
  fillEdge(0, 0, 0, edgeSize, 0, 0, w, edgeSize);
  fillEdge(0, h, 0, h - edgeSize, 0, h - edgeSize, w, edgeSize);

  // Ślad po kawie. Każdy detektyw musi mieć.
  if (stain) {
    const { x, y, r } = stain;

    ctx.save();

    const halo = ctx.createRadialGradient(
      x, y, r * 0.6,
      x, y, r * 1.05
    );

    halo.addColorStop(0, __dialogueText("ui/HiddenObjectsTheme.js", "t_2d2c1ee552e399cfc1a9"));
    halo.addColorStop(0.85, __dialogueText("ui/HiddenObjectsTheme.js", "t_d22983cb881bd664df16"));
    halo.addColorStop(1, 'rgba(120,78,30,0)');

    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = __dialogueText("ui/HiddenObjectsTheme.js", "t_1eec7fe115fde6b4d237");
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0.2, Math.PI * 1.8);
    ctx.stroke();

    ctx.strokeStyle = __dialogueText("ui/HiddenObjectsTheme.js", "t_735eafa237454e21d088");
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 1, y + 1, r - 4, 0.9, Math.PI * 2.3);
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * Dodaje obraz papieru. Gdy canvas się nie uda, wraca do zwykłego prostokąta.
 * options: { origin, seed, base, edge, stain: {x,y,r} }
 */
export function addPaper(scene, x, y, width, height, options = {}) {
  const {
    origin = 0,
    seed = 1,
    base = '#dfcd9f',
    edge = '70,45,15',
    stain = null
  } = options;

  const w = Math.round(width);
  const h = Math.round(height);

  const stainKey = stain
    ? `s${Math.round(stain.x)}_${Math.round(stain.y)}_${Math.round(stain.r)}`
    : 'n';

  const key =
    `ho_paper_${seed}_${w}x${h}_${base.replace('#', '')}_${stainKey}`;

  const ready = ensureCanvasTexture(
    scene,
    key,
    w,
    h,
    (ctx, cw, ch) => paintPaper(ctx, cw, ch, {
      seed,
      base,
      edge,
      stain
    })
  );

  if (ready) {
    return scene.add.image(x, y, key).setOrigin(origin);
  }

  return scene.add
    .rectangle(x, y, w, h, 0xdfcd9f, 1)
    .setOrigin(origin);
}

// ---------------------------------------------------------------------------
// Tło / winieta
// ---------------------------------------------------------------------------

export function ensureNoiseTile(scene) {
  return ensureCanvasTexture(
    scene,
    'ho_noise_tile',
    128,
    128,
    (ctx, w, h) => {
      const rnd = mulberry32(99);

      ctx.fillStyle = '#17120d';
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 900; i += 1) {
        const light = rnd() > 0.5;
        const alpha = 0.02 + rnd() * 0.05;

        ctx.fillStyle = light
          ? `rgba(255,235,200,${alpha})`
          : `rgba(0,0,0,${alpha * 2})`;

        ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd());
      }

      // Delikatny splot, żeby tło wyglądało jak skóra / sukno.
      ctx.strokeStyle = __dialogueText("ui/HiddenObjectsTheme.js", "t_d6f5e1ed6adab0690ce3");
      ctx.lineWidth = 1;

      for (let i = -h; i < w; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + h, h);
        ctx.stroke();
      }
    }
  );
}

export function ensureVignetteTexture(scene) {
  return ensureCanvasTexture(
    scene,
    'ho_vignette',
    512,
    512,
    (ctx, w, h) => {
      const gradient = ctx.createRadialGradient(
        w / 2, h / 2, w * 0.24,
        w / 2, h / 2, w * 0.71
      );

      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.6, __dialogueText("ui/HiddenObjectsTheme.js", "t_a70919eca5a85f47f76a"));
      gradient.addColorStop(1, __dialogueText("ui/HiddenObjectsTheme.js", "t_f71fbab13810b917607a"));

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }
  );
}

// ---------------------------------------------------------------------------
// Rysunki
// ---------------------------------------------------------------------------

export function drawDashedLine(graphics, x1, x2, y, dash = 8, gap = 5) {
  for (let x = x1; x < x2; x += dash + gap) {
    graphics.lineBetween(x, y, Math.min(x + dash, x2), y);
  }
}

/** Ptaszek rysowany wokół (0,0). */
export function drawCheckMark(graphics, size, color = HO_COLORS.green, width = 4) {
  graphics.lineStyle(width, color, 1);
  graphics.beginPath();
  graphics.moveTo(-0.32 * size, 0.02 * size);
  graphics.lineTo(-0.08 * size, 0.3 * size);
  graphics.lineTo(0.38 * size, -0.32 * size);
  graphics.strokePath();
}

export function drawPaperclip(scene, x, y) {
  const g = scene.add.graphics({ x, y });

  g.lineStyle(3, 0x7d838b, 1);
  g.strokeRoundedRect(-9, -4, 18, 50, 9);
  g.strokeRoundedRect(-4, 6, 8, 36, 4);

  g.lineStyle(1, 0xffffff, 0.45);
  g.strokeRoundedRect(-10, -5, 18, 50, 9);

  return g;
}

/**
 * Pieczątka: ramka + napis (+ opcjonalna dopiska), lekko obrócona.
 * Zwraca Container (origin w środku).
 */
export function createStamp(scene, x, y, text, color, colorHex, options = {}) {
  const {
    angle = -10,
    fontSize = 14,
    sub = '',
    alpha = 0.85
  } = options;

  const main = scene.add
    .text(0, 0, text, {
      fontFamily: HO_FONTS.pixel,
      fontSize: `${fontSize}px`,
      color: colorHex
    })
    .setOrigin(0.5);

  let subText = null;

  if (sub) {
    subText = scene.add
      .text(0, 0, sub, {
        fontFamily: HO_FONTS.body,
        fontSize: `${Math.max(11, Math.round(fontSize * 0.8))}px`,
        color: colorHex
      })
      .setOrigin(0.5);
  }

  const contentHeight =
    main.height + (subText ? 6 + subText.height : 0);

  const padX = 14;
  const padY = 10;

  const boxWidth = Math.max(main.width, subText?.width || 0) + padX * 2;
  const boxHeight = contentHeight + padY * 2;

  const top = -contentHeight / 2;

  main.setY(top + main.height / 2);

  if (subText) {
    subText.setY(top + main.height + 6 + subText.height / 2);
  }

  const outer = scene.add
    .rectangle(0, 0, boxWidth, boxHeight)
    .setStrokeStyle(4, color, 1);

  const inner = scene.add
    .rectangle(0, 0, boxWidth - 10, boxHeight - 10)
    .setStrokeStyle(2, color, 1);

  const children = [outer, inner, main];

  if (subText) {
    children.push(subText);
  }

  return scene.add
    .container(x, y, children)
    .setAngle(angle)
    .setAlpha(alpha);
}