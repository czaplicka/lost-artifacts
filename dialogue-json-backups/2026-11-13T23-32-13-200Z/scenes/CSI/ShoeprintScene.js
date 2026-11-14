import { BaseScene } from '../BaseScene.js';


/* ------------------------------------------------------------------ */
/*  CONSTANTS                                                          */
/* ------------------------------------------------------------------ */

const FONT_PIXEL = '"PressStart2P", "Press Start 2P", monospace';
const FONT_TYPE = '"SpecialElite", "Special Elite", "Courier New", monospace';

const PAL = {
  bgTop: 0x13262c,
  bgBottom: 0x070d10,
  tile: 0x1d3a42,
  panel: 0x0a1519,
  panelEdge: 0x2f6b5c,

  green: 0x39ff88,
  amber: 0xffc247,
  red: 0xff4d5e,
  text: 0xd7efe3,
  dim: 0x6f9a8a,

  plaster: 0xd8cbae,
  plasterDark: 0xbba982,
  plasterLight: 0xf2e8cf,
  plasterShadow: 0x8c7c5c,
  plasterTread: 0x6a5a3c
};

const css = n => `#${n.toString(16).padStart(6, '0')}`;

const lerpColor = (a, b, t) => {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;

  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
};

const SHOEPRINT_PROFILES = {
  small: {
    size: 38,
    sole: 'RUBBER',
    wear: 'RIGHT TOE',
    value: 'small'
  },

  medium: {
    size: 41,
    sole: 'VIBRAM',
    wear: 'LEFT HEEL',
    value: 'medium'
  },

  large: {
    size: 44,
    sole: 'LUGGED',
    wear: 'OUTER EDGE',
    value: 'large'
  }
};

const SOLE_PATTERN = {
  RUBBER: 'ribs',
  VIBRAM: 'studs',
  LUGGED: 'blocks'
};

// [t, halfWidth] — t: 0 = toe (top), 1 = heel (bottom)
const SOLE_OUTLINE = [
  [0, 0],
  [0.02, 0.42],
  [0.06, 0.66],
  [0.14, 0.88],
  [0.26, 1],
  [0.40, 0.93],
  [0.55, 0.72],
  [0.68, 0.66],
  [0.80, 0.74],
  [0.90, 0.76],
  [0.96, 0.62],
  [0.99, 0.40],
  [1, 0]
];

const MISS_QUIPS = [
  'THE DATABASE IS DISAPPOINTED. TRY AGAIN.',
  'THAT BOOT HAS NEVER BEEN TO A MUSEUM. PROBABLY.',
  'EVEN THE PLASTER LAUGHED AT THAT ONE.',
  'CLOSE, BUT CINDERELLA WOULD FILE A COMPLAINT.',
  'WRONG SHOE. THE LAB CAT IS UNIMPRESSED.',
  'THIS BOOT HAS AN ALIBI AND A PEDICURE.'
];

const DEFAULT_EVIDENCE = {
  id: 'museum_windowsill_shoeprint',
  slot: 'trace',
  attribute: 'shoe_size_category',
  thief_value: 'medium',
  source: 'footwear_cast',
  label: 'Footwear Impression',
  clueText: 'The plaster cast indicates a medium shoe size.',
  allowedValues: ['small', 'medium', 'large']
};


/* ------------------------------------------------------------------ */
/*  DRAWING HELPERS                                                    */
/* ------------------------------------------------------------------ */

function halfWidthAt(t) {
  const c = Phaser.Math.Clamp(t, 0, 1);

  for (let i = 1; i < SOLE_OUTLINE.length; i++) {
    const [t1, w1] = SOLE_OUTLINE[i];

    if (c <= t1) {
      const [t0, w0] = SOLE_OUTLINE[i - 1];
      const k = (c - t0) / ((t1 - t0) || 1);
      return w0 + (w1 - w0) * k;
    }
  }

  return 0;
}

function line(g, x1, y1, x2, y2) {
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.strokePath();
}

/**
 * Draws a shoe sole print, toe at the top.
 * style: { base, tread, outline, emboss?, light?, shadow? }
 */
function drawSole(g, cx, top, length, sole, wear, style) {
  const half = length * 0.19;
  const hw = t => halfWidthAt(t) * half;
  const rows = 60;

  const outline = (dx = 0, dy = 0) => {
    g.beginPath();

    for (let i = 0; i <= rows; i++) {
      const t = i / rows;
      const x = cx - hw(t) + dx;
      const y = top + t * length + dy;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }

    for (let i = rows; i >= 0; i--) {
      const t = i / rows;
      g.lineTo(cx + hw(t) + dx, top + t * length + dy);
    }

    g.closePath();
  };

  // relief for plaster
  if (style.emboss) {
    g.fillStyle(style.shadow, 1);
    outline(2, 2);
    g.fillPath();

    g.fillStyle(style.light, 1);
    outline(-2, -2);
    g.fillPath();
  }

  g.fillStyle(style.base, 1);
  outline();
  g.fillPath();

  // tread
  const pattern = SOLE_PATTERN[sole] || 'ribs';
  const zones = [[0.07, 0.50], [0.69, 0.94]];
  const stepT = pattern === 'ribs' ? 0.05 : pattern === 'studs' ? 0.055 : 0.095;

  g.fillStyle(style.tread, 1);
  g.lineStyle(Math.max(2, length * 0.011), style.tread, 1);

  zones.forEach(([t0, t1]) => {
    let row = 0;

    for (let t = t0; t <= t1; t += stepT, row++) {
      const y = top + t * length;
      const w = hw(t) * 0.84;

      if (pattern === 'ribs') {
        const drop = length * 0.016;
        g.beginPath();
        g.moveTo(cx - w, y + drop);
        g.lineTo(cx, y - drop);
        g.lineTo(cx + w, y + drop);
        g.strokePath();
      }

      if (pattern === 'studs') {
        const colStep = half * 0.38;
        const b = length * 0.013;
        const offset = (row % 2) * colStep * 0.5;

        for (let k = -4; k <= 4; k++) {
          const x = cx + k * colStep + offset;
          if (Math.abs(x - cx) + b <= w) {
            g.fillRect(x - b, y - b, b * 2, b * 2);
          }
        }
      }

      if (pattern === 'blocks') {
        const bw = half * 0.44;
        const bh = length * 0.05;
        const xs = row % 2
          ? [-0.62 * half, 0, 0.62 * half]
          : [-0.32 * half, 0.32 * half];

        xs.forEach(dx => {
          if (Math.abs(dx) + bw / 2 <= w) {
            g.fillRect(cx + dx - bw / 2, y - bh / 2, bw, bh);
          }
        });
      }
    }
  });

  // shank line between forefoot and heel
  g.lineStyle(Math.max(1, length * 0.006), style.tread, 0.7);
  const ts = 0.655;
  line(
    g,
    cx - hw(ts) * 0.9, top + ts * length,
    cx + hw(ts) * 0.9, top + ts * length
  );

  // wear = smooth patch with no tread
  g.fillStyle(style.base, 1);

  if (wear === 'RIGHT TOE') {
    g.fillEllipse(
      cx + half * 0.42, top + length * 0.15,
      half * 0.8, length * 0.10
    );
  } else if (wear === 'LEFT HEEL') {
    g.fillEllipse(
      cx - half * 0.30, top + length * 0.84,
      half * 0.72, length * 0.11
    );
  } else if (wear === 'OUTER EDGE') {
    g.beginPath();

    for (let t = 0.28; t <= 0.74; t += 0.02) {
      const x = cx + hw(t) - 1;
      const y = top + t * length;
      if (t === 0.28) g.moveTo(x, y);
      else g.lineTo(x, y);
    }

    for (let t = 0.74; t >= 0.28; t -= 0.02) {
      g.lineTo(cx + hw(t) - half * 0.26, top + t * length);
    }

    g.closePath();
    g.fillPath();
  }

  // outline on top
  g.lineStyle(2, style.outline, 1);
  outline();
  g.strokePath();
}


/* ------------------------------------------------------------------ */
/*  SCENE                                                              */
/* ------------------------------------------------------------------ */

export class ShoeprintScene extends BaseScene {
  constructor() {
    super('ShoeprintScene');

    this.stationId = 'trace_1';
    this.evidence = null;
    this.evidenceType = 'shoe_size_category';
    this.correctValue = 'medium';
    this.clue = null;

    this.cast = null;
    this.entries = [];
    this.cards = [];

    this.score = 100;
    this.mistakes = 0;
    this.startedAt = 0;
    this.timerStarted = false;
    this.finishedSeconds = null;

    this.finished = false;
    this.returningToLab = false;
    this.busy = false;
    this.introDone = false;

    this.u = 1;
    this.layout = null;
    this.castArea = null;
    this.castStampPos = null;

    this.logRows = null;
    this.typeEvent = null;
    this.clockEvent = null;
    this.lastQuip = -1;

    this.hudScore = null;
    this.hudErr = null;
    this.hudTime = null;

    this._shoeprintDisposed = true;
    this._shoeprintSession = 0;
  }


  /* ---------------------------- init ----------------------------- */

  init(data = {}) {
    const incomingEvidence =
      data.evidence ||
      data.evidenceConfig ||
      {};

    this.evidence = {
      ...DEFAULT_EVIDENCE,
      ...incomingEvidence
    };

    this.stationId =
      data.stationId ||
      this.evidence.stationId ||
      'trace_1';

    this.evidenceType =
      data.evidenceType ||
      incomingEvidence.evidenceType ||
      this.evidence.attribute ||
      'shoe_size_category';

    const incomingValue = String(
      data.correctValue ??
      incomingEvidence.correctValue ??
      incomingEvidence.thief_value ??
      DEFAULT_EVIDENCE.thief_value
    ).trim().toLowerCase();

    this.correctValue = Object.prototype.hasOwnProperty.call(
      SHOEPRINT_PROFILES,
      incomingValue
    )
      ? incomingValue
      : 'medium';

    const clueText =
      data.clueText ||
      incomingEvidence.clueText ||
      `The plaster cast indicates a ${this.correctValue} shoe size.`;

    this.evidence.thief_value = this.correctValue;
    this.evidence.correctValue = this.correctValue;
    this.evidence.clueText = clueText;

    const correctProfile = SHOEPRINT_PROFILES[this.correctValue];

    this.clue = data.clue || {
      id: this.evidence.id,
      type:
        data.clueType ||
        this.evidence.clueType ||
        'means',
      text: clueText,
      facts: {
        shoeSizeCategory: this.correctValue,
        size: correctProfile.size,
        sole: correctProfile.sole,
        wear: correctProfile.wear
      }
    };

    this.score = data.startScore ?? 100;
    this.mistakes = 0;
    this.startedAt = 0;
    this.timerStarted = false;
    this.finishedSeconds = null;

    this.cast = null;
    this.entries = [];
    this.cards = [];
    this.logRows = null;
    this.typeEvent = null;
    this.clockEvent = null;
    this.lastQuip = -1;

    this.finished = false;
    this.returningToLab = false;
    this.busy = false;
    this.introDone = false;

    this._shoeprintDisposed = true;
    this._shoeprintSession += 1;
  }


  /* --------------------------- create ---------------------------- */

  create() {
    super.create();

    this._shoeprintDisposed = false;
    this._shoeprintSession += 1;

    this.u = this.scale.height / 720;
    this.layout = this.computeLayout();

    this.buildPuzzle();

    this.buildBackdrop();
    this.buildHeader();
    this.buildCastPanel();
    this.buildCards();
    this.buildReadout();
    this.buildOverlay();

    this.updateHud();
    this.showIntro();
  }


  /* -------------------------- utilities -------------------------- */

  px(n) {
    return `${Math.max(6, Math.round(n * this.u))}px`;
  }


  alive(session = this._shoeprintSession) {
    return (
      !this._shoeprintDisposed &&
      !this._cleanupDone &&
      !this.returningToLab &&
      session === this._shoeprintSession
    );
  }


  computeLayout() {
    const W = this.scale.width;
    const H = this.scale.height;

    const pad = W * 0.04;
    const castW = W * 0.32;
    const gap = W * 0.015;
    const cardsX = pad + castW + W * 0.04;
    const cardsW = W - pad - cardsX;
    const cardW = (cardsW - gap * 2) / 3;

    return {
      W,
      H,
      pad,
      top: H * 0.14,
      panelH: H * 0.62,
      castW,
      gap,
      cardsX,
      cardW,
      pxPerCm: H * 0.0125,
      readoutY: H * 0.80,
      readoutH: H * 0.16
    };
  }


  drawPanel(g, x, y, w, h, edge) {
    const u = this.u;

    g.fillStyle(PAL.panel, 0.9);
    g.fillRect(x, y, w, h);

    g.lineStyle(2, edge, 1);
    g.strokeRect(x, y, w, h);

    g.fillStyle(edge, 1);
    const s = 5 * u;
    g.fillRect(x - 2, y - 2, s, s);
    g.fillRect(x + w - s + 2, y - 2, s, s);
    g.fillRect(x - 2, y + h - s + 2, s, s);
    g.fillRect(x + w - s + 2, y + h - s + 2, s, s);
  }


  /* -------------------------- puzzle data ------------------------ */

  buildPuzzle() {
    const correct = SHOEPRINT_PROFILES[this.correctValue];

    this.cast = {
      size: correct.size,
      sole: correct.sole,
      wear: correct.wear
    };

    const wrong = Phaser.Utils.Array.Shuffle(
      Object.values(SHOEPRINT_PROFILES).filter(
        p => p.value !== this.correctValue
      )
    );

    // Near-misses: each wrong boot shares exactly ONE trait with the cast
    // (besides the wrong size), so the player must check all three.
    const entries = [
      {
        size: correct.size,
        sole: correct.sole,
        wear: correct.wear,
        value: correct.value,
        ok: true
      },
      {
        size: wrong[0].size,
        sole: correct.sole,
        wear: wrong[0].wear,
        value: wrong[0].value,
        ok: false
      },
      {
        size: wrong[1].size,
        sole: wrong[1].sole,
        wear: correct.wear,
        value: wrong[1].value,
        ok: false
      }
    ];

    this.entries = Phaser.Utils.Array.Shuffle(entries);

    this.entries.forEach((entry, i) => {
      entry.id = `BOOT-${String(1138 + i * 911).padStart(4, '0')}`;
    });
  }


  /* ------------------------- scene building ---------------------- */

  buildBackdrop() {
    const { W, H } = this.layout;
    const u = this.u;

    const g = this.add.graphics().setDepth(0);

    const bands = 36;
    for (let i = 0; i < bands; i++) {
      g.fillStyle(lerpColor(PAL.bgTop, PAL.bgBottom, i / (bands - 1)), 1);
      g.fillRect(0, (H / bands) * i, W, H / bands + 1);
    }

    // lab wall tiles
    g.lineStyle(1, PAL.tile, 0.35);
    for (let y = H * 0.1; y < H; y += 48 * u) {
      line(g, 0, y, W, y);
    }
    for (let x = 0; x < W; x += 64 * u) {
      line(g, x, H * 0.1, x, H);
    }
  }


  buildHeader() {
    const { W, H, pad } = this.layout;
    const u = this.u;

    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x050c0e, 0.96);
    g.fillRect(0, 0, W, H * 0.095);
    g.fillStyle(PAL.green, 0.8);
    g.fillRect(0, H * 0.095, W, 2 * u);

    this.add.text(
      pad,
      H * 0.0475,
      'CAST COMPARATOR // FOOTWEAR DB (1994 EDITION)',
      {
        fontFamily: FONT_PIXEL,
        fontSize: this.px(14),
        color: css(PAL.green)
      }
    ).setOrigin(0, 0.5).setDepth(3);

    const hudStyle = {
      fontFamily: FONT_PIXEL,
      fontSize: this.px(11),
      color: css(PAL.text)
    };

    const y = H * 0.0475;

    this.hudTime = this.add.text(W - pad, y, '', hudStyle)
      .setOrigin(1, 0.5).setDepth(3);
    this.hudErr = this.add.text(W - pad - 150 * u, y, '', hudStyle)
      .setOrigin(1, 0.5).setDepth(3);
    this.hudScore = this.add.text(W - pad - 300 * u, y, '', hudStyle)
      .setOrigin(1, 0.5).setDepth(3);
  }


  buildCastPanel() {
    const { pad, top, panelH, castW, pxPerCm } = this.layout;
    const u = this.u;

    const panel = this.add.graphics().setDepth(1);
    this.drawPanel(panel, pad, top, castW, panelH, PAL.panelEdge);

    this.add.text(
      pad + 14 * u,
      top + 12 * u,
      'EXHIBIT A // WINDOWSILL CAST',
      {
        fontFamily: FONT_PIXEL,
        fontSize: this.px(9),
        color: css(PAL.amber)
      }
    ).setDepth(3);

    const slabX = pad + 14 * u;
    const slabY = top + 36 * u;
    const slabW = castW - 28 * u;
    const notesH = 84 * u;
    const slabH = panelH - 36 * u - notesH - 14 * u;

    const g = this.add.graphics().setDepth(2);

    // plaster slab
    g.fillStyle(PAL.plasterShadow, 1);
    g.fillRoundedRect(slabX + 4 * u, slabY + 5 * u, slabW, slabH, 10 * u);
    g.fillStyle(PAL.plaster, 1);
    g.fillRoundedRect(slabX, slabY, slabW, slabH, 10 * u);

    g.fillStyle(PAL.plasterDark, 0.55);
    for (let i = 0; i < 90; i++) {
      g.fillRect(
        slabX + Phaser.Math.Between(8, Math.floor(slabW) - 8),
        slabY + Phaser.Math.Between(8, Math.floor(slabH) - 8),
        Phaser.Math.Between(1, 3) * u,
        Phaser.Math.Between(1, 2) * u
      );
    }

    // ruler (0 cm at the heel)
    const soleBottom = slabY + slabH - 24 * u;
    const rx = slabX + 8 * u;
    const rw = 16 * u;
    const rulerH = 30 * pxPerCm;

    g.fillStyle(0xcfcab4, 1);
    g.fillRect(rx, soleBottom - rulerH, rw, rulerH);
    g.lineStyle(1, 0x4a4636, 1);

    for (let cm = 0; cm <= 30; cm++) {
      const y = soleBottom - cm * pxPerCm;
      const len = cm % 5 === 0 ? rw * 0.85 : rw * 0.45;
      line(g, rx + rw, y, rx + rw - len, y);

      if (cm % 5 === 0 && cm > 0) {
        this.add.text(rx + rw + 4 * u, y, `${cm}`, {
          fontFamily: FONT_TYPE,
          fontSize: this.px(11),
          color: '#4a4636'
        }).setOrigin(0, 0.5).setDepth(3);
      }
    }

    // the print itself
    const cx = rx + rw + (slabX + slabW - (rx + rw)) / 2;
    const length = this.cast.size * (2 / 3) * pxPerCm;

    drawSole(
      g,
      cx,
      soleBottom - length,
      length,
      this.cast.sole,
      this.cast.wear,
      {
        base: PAL.plasterDark,
        tread: PAL.plasterTread,
        outline: 0x7d6d4e,
        emboss: true,
        light: PAL.plasterLight,
        shadow: PAL.plasterShadow
      }
    );

    this.castArea = { x: slabX, y: slabY, w: slabW, h: slabH };
    this.castStampPos = { x: cx, y: slabY + slabH / 2 };

    // lab notes
    const notesY = slabY + slabH + 10 * u;
    const rowsData = [
      ['SIZE', String(this.cast.size)],
      ['SOLE', this.cast.sole],
      ['WEAR', this.cast.wear]
    ];

    rowsData.forEach(([label, value], i) => {
      this.add.text(pad + 16 * u, notesY + i * 24 * u, label, {
        fontFamily: FONT_TYPE,
        fontSize: this.px(18),
        color: css(PAL.dim)
      }).setDepth(3);

      this.add.text(pad + 100 * u, notesY + i * 24 * u, value, {
        fontFamily: FONT_TYPE,
        fontSize: this.px(18),
        color: css(PAL.text)
      }).setDepth(3);
    });
  }


  buildCards() {
    const { cardsX, cardW, gap, top, panelH, pxPerCm } = this.layout;
    const u = this.u;

    const headH = 30 * u;
    const textH = 88 * u;
    const areaH = panelH - headH - textH;

    const cardStyle = {
      base: 0x0f2a22,
      tread: PAL.green,
      outline: PAL.green,
      emboss: false
    };

    this.cards = this.entries.map((entry, i) => {
      const x = cardsX + i * (cardW + gap);
      const y = top;

      const container = this.add.container(x, y).setDepth(5);

      // frame + monitor grid
      const frame = this.add.graphics();
      this.drawPanel(frame, 0, 0, cardW, panelH, PAL.panelEdge);
      frame.fillStyle(0x0f2a22, 1);
      frame.fillRect(2, 2, cardW - 4, headH - 2);
      frame.lineStyle(1, PAL.green, 0.1);
      for (let gx = 20 * u; gx < cardW; gx += 20 * u) {
        line(frame, gx, headH, gx, headH + areaH);
      }
      for (let gy = headH + 20 * u; gy < headH + areaH; gy += 20 * u) {
        line(frame, 0, gy, cardW, gy);
      }

      // sole
      const soleG = this.add.graphics();
      const length = entry.size * (2 / 3) * pxPerCm * 0.75;

      drawSole(
        soleG,
        cardW / 2,
        headH + (areaH - length) / 2,
        length,
        entry.sole,
        entry.wear,
        cardStyle
      );

      // header
      const header = this.add.text(cardW / 2, headH / 2, entry.id, {
        fontFamily: FONT_PIXEL,
        fontSize: this.px(10),
        color: css(PAL.green)
      }).setOrigin(0.5);

      // data lines
      const lineStyle = {
        fontFamily: FONT_TYPE,
        fontSize: this.px(17),
        color: css(PAL.text)
      };
      const ty = headH + areaH + 10 * u;

      const lines = {
        size: this.add.text(14 * u, ty, `SIZE  ${entry.size}`, lineStyle),
        sole: this.add.text(14 * u, ty + 24 * u, `SOLE  ${entry.sole}`, lineStyle),
        wear: this.add.text(14 * u, ty + 48 * u, `WEAR  ${entry.wear}`, lineStyle)
      };

      // hover glow
      const glow = this.add.graphics();
      glow.lineStyle(3 * u, PAL.amber, 1);
      glow.strokeRect(0, 0, cardW, panelH);
      glow.setAlpha(0);

      const hit = this.add.zone(0, 0, cardW, panelH).setOrigin(0);

      container.add([
        frame,
        soleG,
        header,
        lines.size,
        lines.sole,
        lines.wear,
        glow,
        hit
      ]);

      const card = {
        entry,
        container,
        baseX: x,
        baseY: y,
        glow,
        lines,
        hit,
        w: cardW,
        h: panelH,
        area: { x, y: y + headH, w: cardW, h: areaH },
        disabled: false
      };

      hit.setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        if (!this.canPick(card)) return;

        card.glow.setAlpha(1);
        this.tweens.killTweensOf(card.container);
        this.tweens.add({
          targets: card.container,
          y: card.baseY - 6 * u,
          duration: 100
        });
      });

      hit.on('pointerout', () => {
        if (card.disabled || this.finished) return;

        card.glow.setAlpha(0);
        this.tweens.killTweensOf(card.container);
        this.tweens.add({
          targets: card.container,
          y: card.baseY,
          duration: 100
        });
      });

      hit.on('pointerdown', () => {
        this.guessEntry(card);
      });

      return card;
    });
  }


  buildReadout() {
    const { W, pad, readoutY, readoutH } = this.layout;
    const u = this.u;

    const g = this.add.graphics().setDepth(10);
    this.drawPanel(g, pad, readoutY, W - pad * 2, readoutH, PAL.green);

    const rowH = (readoutH - 16 * u) / 4;
    const alphas = [0.4, 0.55, 0.75, 1];

    this.logRows = alphas.map((alpha, i) =>
      this.add.text(
        pad + 16 * u,
        readoutY + 8 * u + i * rowH,
        '',
        {
          fontFamily: FONT_TYPE,
          fontSize: this.px(18),
          color: css(PAL.text)
        }
      ).setDepth(11).setAlpha(alpha)
    );
  }


  buildOverlay() {
    const { W, H, pad, top, panelH, castW } = this.layout;
    const u = this.u;

    // lamp cone over the cast
    const lampX = pad + castW / 2;
    const y0 = H * 0.1;
    const y1 = top + panelH;
    const w = castW * 0.5;

    const cone = this.add.graphics().setDepth(4);
    cone.fillStyle(0xfff4c8, 0.07);
    cone.fillTriangle(lampX - 14 * u, y0, lampX + 14 * u, y0, lampX + w, y1);
    cone.fillTriangle(lampX - 14 * u, y0, lampX + w, y1, lampX - w, y1);

    this.tweens.add({
      targets: cone,
      alpha: 0.55,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // vignette
    const vig = this.add.graphics().setDepth(58);
    for (let i = 0; i < 10; i++) {
      vig.lineStyle(14 * u, 0x000000, 0.05);
      vig.strokeRect(i * 10 * u, i * 10 * u, W - i * 20 * u, H - i * 20 * u);
    }

    // CRT scanlines
    const scan = this.add.graphics().setDepth(60);
    scan.lineStyle(1, 0x000000, 0.08);
    for (let y = 0; y < H; y += 4) {
      line(scan, 0, y, W, y);
    }
  }


  /* --------------------------- readout --------------------------- */

  say(text, color = css(PAL.text), charDelay = 14) {
    const session = this._shoeprintSession;

    return new Promise(resolve => {
      if (!this.alive(session) || !this.logRows) {
        resolve(false);
        return;
      }

      const rows = this.logRows;

      for (let i = 0; i < rows.length - 1; i++) {
        rows[i].setText(rows[i + 1].text);
        rows[i].setColor(rows[i + 1].style.color);
      }

      const row = rows[rows.length - 1];
      row.setColor(color);
      row.setText('');

      this.typeEvent?.remove(false);

      let n = 0;

      this.typeEvent = this.time.addEvent({
        delay: charDelay,
        repeat: text.length - 1,
        callback: () => {
          n += 1;

          if (n >= text.length) {
            row.setText(text);
            resolve(true);
          } else {
            row.setText(`${text.slice(0, n)}_`);
          }
        }
      });
    });
  }


  /* ----------------------------- HUD ----------------------------- */

  updateHud() {
    if (this._shoeprintDisposed || !this.hudScore) return;

    const s = this.getSecondsElapsed();

    let timeColor = css(PAL.text);
    if (this.timerStarted && s <= 15) timeColor = css(PAL.green);
    else if (this.timerStarted && s <= 30) timeColor = css(PAL.amber);

    this.hudScore.setText(`SCORE ${this.score}`);

    this.hudErr
      .setText(`ERR ${this.mistakes}`)
      .setColor(this.mistakes > 0 ? css(PAL.red) : css(PAL.text));

    this.hudTime
      .setText(`TIME ${String(s).padStart(2, '0')}s`)
      .setColor(timeColor);
  }


  /* ----------------------------- flow ---------------------------- */

  async showIntro() {
    const session = this._shoeprintSession;

    const lines = [
      [
        '> PLASTER CAST FROM THE MUSEUM WINDOWSILL. IT SMELLS LIKE CRIME.',
        css(PAL.text)
      ],
      [
        `> CAST NOTES: SIZE ${this.cast.size} / ${this.cast.sole} SOLE / ${this.cast.wear} WEAR.`,
        css(PAL.amber)
      ],
      [
        '> DATABASE RETURNED 3 BOOTS. CLICK THE ONE THAT FULLY MATCHES.',
        css(PAL.text)
      ]
    ];

    for (const [text, color] of lines) {
      const ok = await this.say(text, color, 10);
      if (!ok || !this.alive(session)) return;
    }

    this.introDone = true;
    this.timerStarted = true;
    this.startedAt = this.time.now;

    this.clockEvent = this.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => this.updateHud()
    });
  }


  canPick(card) {
    return (
      this.introDone &&
      !this.busy &&
      !this.finished &&
      !card.disabled &&
      this.alive()
    );
  }


  sweep(area, color, duration) {
    return new Promise(resolve => {
      const u = this.u;

      const beam = this.add.rectangle(
        area.x, area.y, area.w, 3 * u, color, 0.9
      ).setOrigin(0, 0.5).setDepth(20);

      const halo = this.add.rectangle(
        area.x, area.y, area.w, 18 * u, color, 0.18
      ).setOrigin(0, 0.5).setDepth(19);

      this.tweens.add({
        targets: [beam, halo],
        y: area.y + area.h,
        duration,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          beam.destroy();
          halo.destroy();
          resolve(true);
        }
      });
    });
  }


  stamp(x, y, label, color, size, angle) {
    const t = this.add.text(x, y, label, {
      fontFamily: FONT_PIXEL,
      fontSize: this.px(size),
      color: css(color),
      stroke: '#000000',
      strokeThickness: Math.round(4 * this.u)
    })
      .setOrigin(0.5)
      .setAngle(angle)
      .setDepth(30)
      .setScale(2.4)
      .setAlpha(0);

    this.tweens.add({
      targets: t,
      scale: 1,
      alpha: 1,
      duration: 220,
      ease: 'Back.easeOut'
    });

    return t;
  }


  async guessEntry(card) {
    const session = this._shoeprintSession;

    if (!this.canPick(card)) return;

    this.busy = true;

    this.tweens.killTweensOf(card.container);
    card.container.y = card.baseY;
    card.glow.setAlpha(1);

    try {
      const entry = card.entry;

      const results = await Promise.all([
        this.say(
          `> CHECKING ${entry.id}: ${entry.size} / ${entry.sole} / ${entry.wear}`,
          css(PAL.text),
          8
        ),
        this.sweep(this.castArea, PAL.amber, 1100),
        this.sweep(card.area, PAL.green, 1100)
      ]);

      if (!results[0] || !this.alive(session)) return;

      if (entry.ok) {
        await this.handleCorrectEntry(card, session);
      } else {
        await this.handleWrongEntry(card, session);
      }
    } finally {
      if (this.alive(session)) {
        this.busy = false;
      }
    }
  }


  async handleCorrectEntry(card, session = this._shoeprintSession) {
    if (!this.alive(session)) return;

    this.finished = true;
    this.finishedSeconds = this.getSecondsElapsed();
    this.clockEvent?.remove(false);
    this.clockEvent = null;

    const timeBonus = this.getTimeBonus();
    this.score = Math.min(120, this.score + timeBonus);
    this.updateHud();

    // visuals
    Object.values(card.lines).forEach(t => t.setColor(css(PAL.green)));

    card.glow.clear();
    card.glow.lineStyle(4 * this.u, PAL.green, 1);
    card.glow.strokeRect(0, 0, card.w, card.h);
    card.glow.setAlpha(1);

    this.tweens.add({
      targets: card.glow,
      alpha: 0.35,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    this.cards.forEach(other => {
      if (other === card) return;
      this.tweens.add({
        targets: other.container,
        alpha: 0.35,
        duration: 300
      });
    });

    this.stamp(
      this.castStampPos.x,
      this.castStampPos.y,
      'MATCH!',
      PAL.green,
      22,
      -12
    );

    this.stamp(
      card.area.x + card.area.w / 2,
      card.area.y + card.area.h / 2,
      'MATCH!',
      PAL.green,
      16,
      10
    );

    // readout
    const lines = [
      [
        '> FULL MATCH. THE SHOE FITS. SOMEONE IS ABOUT TO HAVE A BAD DAY.',
        css(PAL.amber)
      ],
      [
        `> FORENSIC CATEGORY: ${this.correctValue.toUpperCase()} SHOE SIZE.`,
        css(PAL.text)
      ]
    ];

    if (timeBonus > 0) {
      lines.push([`> SPEED BONUS: +${timeBonus} PTS.`, css(PAL.amber)]);
    }

    lines.push(['> CLUE READY FOR CASE FILE.', css(PAL.green)]);

    for (const [text, color] of lines) {
      const ok = await this.say(text, color, 10);
      if (!ok || !this.alive(session)) return;
    }

    this.showAddButton(session);
  }


  async handleWrongEntry(card, session = this._shoeprintSession) {
    if (!this.alive(session)) return;

    const u = this.u;

    this.mistakes += 1;
    this.score = Math.max(0, this.score - 15);
    this.updateHud();

    // per-trait verdict
    const mismatched = [];

    ['size', 'sole', 'wear'].forEach(prop => {
      const same = card.entry[prop] === this.cast[prop];
      card.lines[prop].setColor(css(same ? PAL.green : PAL.red));
      if (!same) mismatched.push(prop.toUpperCase());
    });

    card.disabled = true;
    card.glow.setAlpha(0);

    this.stamp(
      card.area.x + card.area.w / 2,
      card.area.y + card.area.h / 2,
      'NO MATCH',
      PAL.red,
      16,
      -10
    );

    this.tweens.add({
      targets: card.container,
      x: card.baseX + 6 * u,
      duration: 50,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        card.container.x = card.baseX;
      }
    });

    this.tweens.add({
      targets: card.container,
      alpha: 0.55,
      duration: 400
    });

    // pick a quip that isn't the previous one
    let q = Phaser.Math.Between(0, MISS_QUIPS.length - 1);
    if (q === this.lastQuip) q = (q + 1) % MISS_QUIPS.length;
    this.lastQuip = q;

    let ok = await this.say(
      `> MISMATCH: ${mismatched.join(' + ')}. (-15 PTS)`,
      css(PAL.red),
      10
    );
    if (!ok || !this.alive(session)) return;

    await this.say(`> ${MISS_QUIPS[q]}`, css(PAL.text), 10);
  }


  showAddButton(session) {
    if (!this.alive(session)) return;

    const { W, pad, readoutY, readoutH } = this.layout;
    const u = this.u;

    const bw = W * 0.2;
    const bh = readoutH * 0.62;
    const x = W - pad - bw - 16 * u;
    const y = readoutY + (readoutH - bh) / 2;

    const container = this.add.container(x, y).setDepth(40);

    const g = this.add.graphics();
    const paint = fill => {
      g.clear();
      g.fillStyle(fill, 1);
      g.fillRect(0, 0, bw, bh);
      g.lineStyle(3 * u, PAL.green, 1);
      g.strokeRect(0, 0, bw, bh);
    };
    paint(0x0f3a25);

    const label = this.add.text(bw / 2, bh / 2, 'ADD TO\nCASE FILE', {
      fontFamily: FONT_PIXEL,
      fontSize: this.px(11),
      color: css(PAL.green),
      align: 'center',
      lineSpacing: 6 * u
    }).setOrigin(0.5);

    const hit = this.add.zone(0, 0, bw, bh).setOrigin(0);
    hit.setInteractive({ useHandCursor: true });

    hit.on('pointerover', () => {
      paint(0x1b6b43);
      label.setColor('#ffffff');
    });

    hit.on('pointerout', () => {
      paint(0x0f3a25);
      label.setColor(css(PAL.green));
    });

    hit.on('pointerdown', () => {
      if (!this.alive(session)) return;
      this.returnResultToCrimeLab();
    });

    container.add([g, label, hit]);

    this.tweens.add({
      targets: label,
      alpha: 0.6,
      duration: 600,
      yoyo: true,
      repeat: -1
    });
  }


  /* --------------------------- scoring --------------------------- */

  getTimeBonus() {
    const s = this.getSecondsElapsed();

    if (s <= 15) return 20;
    if (s <= 30) return 10;

    return 0;
  }


  getSecondsElapsed() {
    if (this.finishedSeconds !== null) return this.finishedSeconds;
    if (!this.timerStarted) return 0;

    return Math.floor((this.time.now - this.startedAt) / 1000);
  }


  /* --------------------------- exit/cleanup ---------------------- */

  returnResultToCrimeLab() {
    if (
      this.returningToLab ||
      this._shoeprintDisposed ||
      !this.finished
    ) {
      return;
    }

    this.returningToLab = true;

    const payload = {
      aborted: false,
      completed: true,

      stationId: this.stationId,

      evidenceId: this.evidence.id,
      evidenceType: this.evidenceType,

      attribute: this.evidence.attribute,
      value: this.correctValue,

      source: this.evidence.source,
      label: this.evidence.label,
      clueText: this.evidence.clueText,

      evidence: {
        ...this.evidence
      },

      score: this.score,
      mistakes: this.mistakes,
      secondsElapsed: this.getSecondsElapsed(),

      clue: this.clue
    };

    this.events.emit('minigame-complete', payload);

    this.events.emit('minigame-closed', {
      aborted: false,
      payload
    });

    this.scene.stop();
  }


  cleanup() {
    if (this._shoeprintDisposed) {
      super.cleanup();
      return;
    }

    this._shoeprintDisposed = true;
    this._shoeprintSession += 1;
    this.returningToLab = true;
    this.busy = false;

    try {
      this.typeEvent?.remove(false);
      this.clockEvent?.remove(false);
      this.tweens?.killAll();
    } catch (e) {
      // scene systems may already be shut down
    }

    this.typeEvent = null;
    this.clockEvent = null;

    try {
      super.cleanup();
    } finally {
      this.cast = null;
      this.entries = [];
      this.cards = [];
      this.logRows = null;
      this.hudScore = null;
      this.hudErr = null;
      this.hudTime = null;
      this.castArea = null;
      this.castStampPos = null;
    }
  }
}