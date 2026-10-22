// ui/HypothesisBoardUI.js
import { audioManager } from '../managers/AudioManager.js';

const FONT_TEXT = 'SpecialElite';
const FONT_PIXEL = 'PressStart2P';

const STRING_COLORS = {
  neutral: 0xd9c9a0,
  green: 0x44d66a,
  yellow: 0xf1c232,
  red: 0xe06666
};

const PIN_COLORS = [0xb22222, 0x2f5d8a, 0xd4a017, 0x2f7f4a, 0x7a3b8a, 0xc2581a];

const SLOT_COLORS = {
  neutral: { fill: 0x241c16, stroke: 0xc8a75a, text: '#8d8577' },
  selected: { fill: 0x3a3017, stroke: 0xffd966, text: '#fff0bf' },
  green: { fill: 0x193019, stroke: 0x44d66a, text: '#b9efb9' },
  yellow: { fill: 0x3d3216, stroke: 0xf1c232, text: '#fff0bf' },
  red: { fill: 0x3a1d1d, stroke: 0xe06666, text: '#fff0bf' }
};

const LEGEND_ITEMS = [
  { color: 0x44d66a, label: 'correct' },
  { color: 0xf1c232, label: 'right clue, wrong question' },
  { color: 0xe06666, label: 'wrong clue' }
];

// Deterministyczny PRNG: korek i przechył kartek wyglądają tak samo po każdym resize.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class HypothesisBoardUI {
  constructor(scene, {
    state,
    cards = [],
    slotLabels = [],
    buildSlotSentence = null,
    onCardTap = null,
    onSlotTap = null,
    onSlotRemove = null,
    onConfirm = null,
    onClose = null
  } = {}) {
    this.scene = scene;
    this.state = state;
    this.cards = Array.isArray(cards) ? cards : [];
    this.slotLabels = Array.isArray(slotLabels) ? slotLabels : [];

    this.buildSlotSentence =
      typeof buildSlotSentence === 'function'
        ? buildSlotSentence
        : null;

    this.onCardTap =
      typeof onCardTap === 'function'
        ? onCardTap
        : null;

    this.onSlotTap =
      typeof onSlotTap === 'function'
        ? onSlotTap
        : null;

    this.onSlotRemove =
      typeof onSlotRemove === 'function'
        ? onSlotRemove
        : null;

    this.onConfirm =
      typeof onConfirm === 'function'
        ? onConfirm
        : null;

    this.onClose =
      typeof onClose === 'function'
        ? onClose
        : null;

    this.overlay = null;
    this.panel = null;

    this.titleText = null;
    this.subtitleText = null;
    this.attemptsText = null;
    this.attemptsIcons = null;
    this.legendContainer = null;
    this.legendItems = [];
    this.feedbackText = null;
    this.stringGfx = null;

    this.closeButton = null;
    this.confirmButton = null;

    this.slotViews = [];
    this.cardViews = [];

    this.layout = null;
    this.resizeHandler = null;
    this.isDestroyed = false;

    this._maxAttempts = 0;
    this._lastAttempts = null;
    this._lastFeedback = [];
    this._prevPlaced = [];
    this._stringProg = {};
    this._stringHolders = {};
    this._confirmPulseOn = false;
    this._keysBound = false;

    this._onEsc = () => {
      if (this.isDestroyed || this.state?.uiLocked) return;
      this.onClose?.();
    };

    this._onEnter = () => {
      if (this.isDestroyed) return;
      this._tryConfirm();
    };
  }

  // ─── Tweeny i dźwięk ──────────────────────────────────────────────────────

  _tween(config) {
    const s = this.scene;
    if (!s?.tweens || this.isDestroyed) return null;
    return typeof s.createTrackedTween === 'function'
      ? s.createTrackedTween(config)
      : s.tweens.add(config);
  }

  _kill(target) {
    if (!target) return;
    const s = this.scene;
    if (typeof s?.killTrackedTweensOf === 'function') {
      s.killTrackedTweensOf(target);
    } else {
      s?.tweens?.killTweensOf(target);
    }
  }

  // Dźwięk przez AudioManager: respektuje wyciszenie i głośność SFX.
  _sfx(key, volume = 0.5) {
    try {
      audioManager.playSfx(key, {
        volume: audioManager.getSfxVolume() * volume
      });
    } catch (e) {
      // dźwięk nigdy nie powinien wywalać UI
    }
  }

  // Obszar klikalny musi odzwierciedlać aktualny rozmiar (po setSize na Shape
  // hitArea zostaje z rozmiaru początkowego).
  _setHit(obj, width, height, hand = true) {
    if (!obj) return;

    obj.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, width, height),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: hand
    });
  }

  // ─── Tworzenie ────────────────────────────────────────────────────────────

  create() {
    if (this.isDestroyed) {
      return;
    }

    const { width, height } = this.scene.scale;

    /*
     * Blokuje kliknięcia w scenę pod spodem.
     * Wszystkie elementy minigry mają większy depth.
     */
    this.overlay = this.scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.86)
      .setOrigin(0)
      .setDepth(3000)
      .setInteractive();

    // Korkowa tablica śledczego (rysowana w drawBoard)
    this.panel = this.scene.add
      .graphics()
      .setDepth(3001);

    this.titleText = this.scene.add
      .text(width / 2, 0, 'RECONSTRUCT THE HEIST', {
        fontFamily: FONT_TEXT,
        fontSize: '36px',
        color: '#f7f1dc',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(3010);

    this.subtitleText = this.scene.add
      .text(
        width / 2,
        0,
        'Select one clue below, then select the question it answers.',
        {
          fontFamily: FONT_TEXT,
          fontSize: '19px',
          color: '#e8d7a8',
          align: 'center',
          stroke: '#000000',
          strokeThickness: 3
        }
      )
      .setOrigin(0.5)
      .setDepth(3010);

    this.attemptsText = this.scene.add
      .text(width / 2, 0, '', {
        fontFamily: FONT_TEXT,
        fontSize: '21px',
        color: '#ffd966',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(3010);

    // Lupki: jedna na każdą pozostałą próbę
    this.attemptsIcons = this.scene.add
      .graphics()
      .setDepth(3010);

    this._maxAttempts = Math.max(
      this.state?.attemptsLeft ?? 0,
      1
    );

    this.createQuestionSlots();
    this.createEvidenceCards();
    this.createButtons();

    // Sznurki nad kartkami i slotami
    this.stringGfx = this.scene.add
      .graphics()
      .setDepth(3014);

    this.createLegend();

    this.feedbackText = this.scene.add
      .text(width / 2, 0, '', {
        fontFamily: FONT_TEXT,
        fontSize: '19px',
        color: '#ffd966',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3,
        wordWrap: {
          width: 700,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5)
      .setDepth(3010);

    this.resizeHandler = () => {
      if (this.isDestroyed) {
        return;
      }

      this.applyLayout();
      this.refresh();
    };

    this.scene.scale.on(
      'resize',
      this.resizeHandler,
      this
    );

    this._bindKeys();

    this.applyLayout();
    this.refresh();
    this._playIntro();
  }

  createQuestionSlots() {
    const count = this.state?.activeSlotCount || 3;

    for (let index = 0; index < count; index++) {
      const container = this.scene.add
        .container(0, 0)
        .setDepth(3013);

      const shadow = this.scene.add
        .rectangle(5, 6, 380, 132, 0x000000, 0.4);

      // Pulsująca poświata zaznaczonego pytania
      const glow = this.scene.add
        .rectangle(0, 0, 394, 146, 0x000000, 0)
        .setStrokeStyle(4, 0xffd966, 1)
        .setAlpha(0);

      const box = this.scene.add
        .rectangle(0, 0, 380, 132, 0x241c16, 1)
        .setStrokeStyle(3, 0xc8a75a, 0.9)
        .setInteractive({ useHandCursor: true });

      const decor = this.scene.add.graphics();

      const qMark = this.scene.add
        .text(0, 0, '?', {
          fontFamily: FONT_PIXEL,
          fontSize: '48px',
          color: '#ffffff'
        })
        .setOrigin(0.5)
        .setAlpha(0.07);

      const labelTape = this.scene.add
        .rectangle(0, 0, 200, 30, 0xe8dca0, 0.96)
        .setStrokeStyle(1, 0xb8a678, 1);

      const label = this.scene.add
        .text(0, 0, this.slotLabels[index] || `QUESTION ${index + 1}`, {
          fontFamily: FONT_PIXEL,
          fontSize: '11px',
          color: '#3d2a09',
          align: 'center',
          wordWrap: {
            width: 340,
            useAdvancedWrap: true
          }
        })
        .setOrigin(0.5);

      const labelPin = this.scene.add.graphics();

      const answerText = this.scene.add
        .text(0, 2, '[ empty ]', {
          fontFamily: FONT_TEXT,
          fontSize: '20px',
          color: '#8d8577',
          align: 'center',
          wordWrap: {
            width: 320,
            useAdvancedWrap: true
          },
          lineSpacing: 5
        })
        .setOrigin(0.5);

      const lockStamp = this.scene.add
        .text(0, 0, 'CONFIRMED', {
          fontFamily: FONT_PIXEL,
          fontSize: '9px',
          color: '#6fe08a',
          padding: { left: 5, right: 5, top: 4, bottom: 4 }
        })
        .setOrigin(0.5)
        .setAngle(-8)
        .setAlpha(0.85)
        .setVisible(false);

      const removeButton = this.scene.add
        .text(0, 0, 'REMOVE', {
          fontFamily: FONT_PIXEL,
          fontSize: '9px',
          color: '#ffffff',
          backgroundColor: '#7a1f1f',
          padding: {
            left: 7,
            right: 7,
            top: 6,
            bottom: 6
          }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setVisible(false);

      box.on('pointerup', () => {
        if (this.state?.uiLocked) {
          return;
        }

        this.onSlotTap?.(index);
      });

      removeButton.on('pointerup', () => {
        if (this.state?.uiLocked) {
          return;
        }

        this._sfx('paper_rustle', 0.3);
        this.onSlotRemove?.(index);
      });

      container.add([
        shadow,
        glow,
        box,
        decor,
        qMark,
        answerText,
        labelTape,
        label,
        labelPin,
        lockStamp,
        removeButton
      ]);

      this.slotViews.push({
        index,
        container,
        shadow,
        glow,
        box,
        decor,
        qMark,
        labelTape,
        label,
        labelPin,
        answerText,
        lockStamp,
        removeButton,
        glowOn: false
      });
    }
  }

  createEvidenceCards() {
    this.cards.forEach((card, index) => {
      const rng = mulberry32(1000 + index * 17);

      const container = this.scene.add
        .container(0, 0)
        .setDepth(3012);

      const shadow = this.scene.add
        .rectangle(4, 5, 230, 102, 0x000000, 0.4);

      const box = this.scene.add
        .rectangle(0, 0, 230, 102, 0xf1e2bf, 1)
        .setStrokeStyle(3, 0x725022, 0.95)
        .setInteractive({ useHandCursor: true });

      const decor = this.scene.add.graphics();
      const pin = this.scene.add.graphics();

      const cardTitle = this.scene.add
        .text(0, 4, card.item || `CLUE ${index + 1}`, {
          fontFamily: FONT_TEXT,
          fontSize: '18px',
          color: '#3d2409',
          align: 'center',
          wordWrap: {
            width: 196,
            useAdvancedWrap: true
          },
          lineSpacing: 4
        })
        .setOrigin(0.5);

      const selectedMark = this.scene.add
        .text(0, 39, 'SELECTED', {
          fontFamily: FONT_PIXEL,
          fontSize: '9px',
          color: '#251700',
          backgroundColor: '#ffd966',
          padding: {
            left: 6,
            right: 6,
            top: 4,
            bottom: 4
          }
        })
        .setOrigin(0.5)
        .setVisible(false);

      const usedMark = this.scene.add
        .text(0, 0, 'USED', {
          fontFamily: FONT_PIXEL,
          fontSize: '14px',
          color: '#f7e7bd',
          backgroundColor: '#463a30',
          padding: {
            left: 9,
            right: 9,
            top: 7,
            bottom: 7
          }
        })
        .setOrigin(0.5)
        .setVisible(false);

      const view = {
        index,
        container,
        shadow,
        box,
        decor,
        pin,
        cardTitle,
        selectedMark,
        usedMark,
        baseX: 0,
        baseY: 0,
        baseRot: (rng() - 0.5) * 0.07,
        pinColor: PIN_COLORS[index % PIN_COLORS.length],
        hover: false
      };

      box.on('pointerover', () => {
        if (this.state?.uiLocked || this.isCardUsed(index)) {
          return;
        }

        view.hover = true;
        this._settleCard(view);
      });

      box.on('pointerdown', () => {
        if (this.state?.uiLocked || this.isCardUsed(index)) {
          return;
        }

        this._kill(container);
        container.setScale(0.96);
      });

      box.on('pointerup', () => {
        container.setScale(1);

        if (this.state?.uiLocked || this.isCardUsed(index)) {
          this._settleCard(view);
          return;
        }

        this._sfx('click_sound', 0.3);
        this.onCardTap?.(index);
        this._settleCard(view);
      });

      box.on('pointerout', () => {
        view.hover = false;
        this._settleCard(view);
      });

      container.add([
        shadow,
        box,
        decor,
        cardTitle,
        pin,
        selectedMark,
        usedMark
      ]);

      this.cardViews.push(view);
    });
  }

  createButtons() {
    this.closeButton = this.createButton(
      '[ CLOSE ]',
      '#ded6c2'
    );

    this.confirmButton = this.createButton(
      '[ CHECK THEORY ]',
      '#ffd966'
    );

    this.closeButton.on('pointerup', () => {
      this.onClose?.();
    });

    this.confirmButton.on('pointerup', () => {
      this._tryConfirm();
    });
  }

  _tryConfirm() {
    if (this.state?.uiLocked) {
      return;
    }

    if (!this.state?.isTimelineComplete()) {
      this.showFeedback(
        `Choose answers for all ${this.state?.activeSlotCount || 3} questions first.`,
        '#ff9f80'
      );

      return;
    }

    this._sfx('paper_rustle', 0.4);
    this.onConfirm?.();
  }

  createButton(text, color) {
    const button = this.scene.add
      .text(0, 0, text, {
        fontFamily: FONT_TEXT,
        fontSize: '23px',
        color,
        backgroundColor: '#332519',
        padding: {
          left: 18,
          right: 18,
          top: 10,
          bottom: 10
        }
      })
      .setOrigin(0.5)
      .setDepth(3020)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      if (this._confirmPulseOn && button === this.confirmButton) {
        return;
      }

      button.setScale(1.04);
    });

    button.on('pointerout', () => {
      if (this._confirmPulseOn && button === this.confirmButton) {
        return;
      }

      button.setScale(1);
    });

    return button;
  }

  // Legenda: kolorowe kropki + opisy (zamiast jednej linii tekstu)
  createLegend() {
    this.legendContainer = this.scene.add
      .container(0, 0)
      .setDepth(3010);

    this.legendItems = LEGEND_ITEMS.map(item => {
      const swatch = this.scene.add.circle(0, 0, 7, item.color, 1)
        .setStrokeStyle(2, 0x000000, 0.6);

      const text = this.scene.add
        .text(0, 0, item.label, {
          fontFamily: FONT_TEXT,
          fontSize: '15px',
          color: '#e0cfa2',
          stroke: '#000000',
          strokeThickness: 3
        })
        .setOrigin(0, 0.5);

      this.legendContainer.add([swatch, text]);
      return { swatch, text };
    });
  }

  // ─── Układ (Twoje liczby bez zmian) ───────────────────────────────────────

  getLayout() {
    const { width, height } = this.scene.scale;

    const compact =
      height < 780 ||
      width < 1100;

    const panelMarginX = compact ? 18 : 38;
    const panelMarginY = compact ? 14 : 30;

    const panelWidth = width - panelMarginX * 2;
    const panelHeight = height - panelMarginY * 2;
    const panelTop = panelMarginY;
    const panelBottom = height - panelMarginY;

    const titleY = panelTop + (compact ? 30 : 44);
    const subtitleY = titleY + (compact ? 36 : 48);
    const attemptsY = subtitleY + (compact ? 40 : 54);

    /*
     * Wyraźna przerwa między ATTEMPTS LEFT a pytaniami.
     */
    const slotsY = attemptsY + (compact ? 118 : 148);

    const slotGap = compact ? 18 : 30;

    const slotWidth = Math.min(
      compact ? 270 : 380,
      (panelWidth - 80 - slotGap * 2) / 3
    );

    const slotHeight = compact ? 94 : 132;

    const slotStartX =
      width / 2 -
      (slotWidth * 3 + slotGap * 2) / 2 +
      slotWidth / 2;

    const slotPositions = Array.from(
      { length: 3 },
      (_, index) => ({
        x: slotStartX + index * (slotWidth + slotGap),
        y: slotsY
      })
    );

    /*
     * ZAWSZE:
     * 0, 1, 2 = pierwszy rząd
     * 3, 4, 5 = drugi rząd
     */
    const cardColumns = 3;
    const cardRows = 2;

    const cardsTopY =
      slotsY +
      slotHeight / 2 +
      (compact ? 72 : 92);

    const cardGapX = compact ? 14 : 22;
    const cardGapY = compact ? 14 : 18;

    const cardWidth = Math.min(
      compact ? 190 : 230,
      (
        panelWidth -
        90 -
        cardGapX * (cardColumns - 1)
      ) / cardColumns
    );

    const cardHeight = compact ? 78 : 102;

    const cardStartX =
      width / 2 -
      (
        cardWidth * cardColumns +
        cardGapX * (cardColumns - 1)
      ) / 2 +
      cardWidth / 2;

    const cardPositions = this.cards.map((_, index) => {
      const column = index % cardColumns;
      const row = Math.floor(index / cardColumns);

      return {
        x: cardStartX + column * (cardWidth + cardGapX),
        y: cardsTopY + row * (cardHeight + cardGapY)
      };
    });

    const cardsBottomY =
      cardsTopY +
      (cardRows - 1) * (cardHeight + cardGapY) +
      cardHeight / 2;

    const legendY = cardsBottomY + (compact ? 36 : 44);
    const feedbackY = legendY + (compact ? 30 : 38);

    const buttonsY = Math.min(
      panelBottom - (compact ? 34 : 44),
      feedbackY + (compact ? 46 : 58)
    );

    return {
      width,
      height,
      compact,

      panelWidth,
      panelHeight,

      titleY,
      subtitleY,
      attemptsY,

      slotWidth,
      slotHeight,
      slotPositions,

      cardWidth,
      cardHeight,
      cardPositions,

      legendY,
      feedbackY,
      buttonsY,

      closeX: width / 2 - (compact ? 112 : 155),
      confirmX: width / 2 + (compact ? 112 : 155),

      slotWrapWidth: Math.max(135, slotWidth - 30),
      feedbackWrapWidth: Math.max(320, panelWidth - 90)
    };
  }

  // Korkowa tablica: drewniana rama, złota linia, ziarno korka, cień wewnętrzny.
  drawBoard() {
    const L = this.layout;
    const g = this.panel;
    if (!L || !g) return;

    g.clear();

    const w = L.panelWidth;
    const h = L.panelHeight;
    const x = (L.width - w) / 2;
    const y = (L.height - h) / 2;
    const m = 14;

    // Rama
    g.fillStyle(0x24160c, 1);
    g.fillRoundedRect(x, y, w, h, 10);
    g.lineStyle(4, 0xd4af37, 0.9);
    g.strokeRoundedRect(x, y, w, h, 10);

    // Korek
    const ix = x + m;
    const iy = y + m;
    const iw = w - m * 2;
    const ih = h - m * 2;

    g.fillStyle(0x3b2a1d, 1);
    g.fillRect(ix, iy, iw, ih);

    const rng = mulberry32(77);
    const dots = Math.min(5000, Math.floor((iw * ih) / 500));
    const tones = [0x2c1f15, 0x4a3626, 0x5a4430, 0x23180f];

    for (let i = 0; i < dots; i++) {
      const px = ix + rng() * iw;
      const py = iy + rng() * ih;
      const size = rng() < 0.7 ? 2 : 3;

      g.fillStyle(tones[Math.floor(rng() * tones.length)], 0.5 + rng() * 0.4);
      g.fillRect(px, py, size, size);
    }

    // Cień wewnętrzny (głębia ramy)
    for (let k = 0; k < 8; k++) {
      g.lineStyle(2, 0x000000, 0.35 * (1 - k / 8));
      g.strokeRect(ix + k * 2, iy + k * 2, iw - k * 4, ih - k * 4);
    }

    g.lineStyle(1, 0xd4af37, 0.35);
    g.strokeRect(ix, iy, iw, ih);

    // Mosiężne gwoździe w narożnikach ramy
    g.fillStyle(0xc9a24b, 1);
    [
      [x + 7, y + 7],
      [x + w - 7, y + 7],
      [x + 7, y + h - 7],
      [x + w - 7, y + h - 7]
    ].forEach(([cx, cy]) => g.fillCircle(cx, cy, 3));
  }

  applyLayout() {
    if (!this.overlay || this.isDestroyed) {
      return;
    }

    this.layout = this.getLayout();

    const L = this.layout;

    this.overlay
      .setSize(L.width, L.height)
      .setPosition(0, 0);
    this._setHit(this.overlay, L.width, L.height, false);

    this.drawBoard();

    this.titleText
      .setPosition(L.width / 2, L.titleY)
      .setFontSize(L.compact ? '26px' : '36px');

    this.subtitleText
      .setPosition(L.width / 2, L.subtitleY)
      .setFontSize(L.compact ? '14px' : '19px')
      .setWordWrapWidth(L.feedbackWrapWidth, true);

    this.attemptsText
      .setPosition(L.width / 2, L.attemptsY)
      .setFontSize(L.compact ? '16px' : '21px');

    this.slotViews.forEach((view, index) => {
      const position = L.slotPositions[index];

      if (!position) {
        return;
      }

      const sw = L.slotWidth;
      const sh = L.slotHeight;

      view.container.setPosition(position.x, position.y);

      view.shadow.setSize(sw, sh);
      view.glow.setSize(sw + 14, sh + 14);

      view.box.setSize(sw, sh);
      this._setHit(view.box, sw, sh);

      // Nity i wewnętrzna ramka "karty z teczki"
      view.decor.clear();
      view.decor.lineStyle(1, 0xc8a75a, 0.22);
      view.decor.strokeRect(-sw / 2 + 7, -sh / 2 + 7, sw - 14, sh - 14);
      view.decor.fillStyle(0xc9a24b, 0.9);
      [
        [-sw / 2 + 9, -sh / 2 + 9],
        [sw / 2 - 9, -sh / 2 + 9],
        [-sw / 2 + 9, sh / 2 - 9],
        [sw / 2 - 9, sh / 2 - 9]
      ].forEach(([cx, cy]) => view.decor.fillCircle(cx, cy, 2.5));

      view.qMark
        .setPosition(0, 2)
        .setFontSize(L.compact ? '30px' : '48px');

      /*
       * Etykieta jest nad ramką pytania,
       * a nie wewnątrz niej. Teraz na przypiętej taśmie.
       */
      view.label
        .setPosition(0, -sh / 2 - 22)
        .setFontSize(L.compact ? '8px' : '11px')
        .setWordWrapWidth(L.slotWrapWidth, true);

      const tapeW = Math.min(sw + 10, view.label.width + 24);
      const tapeH = view.label.height + 12;

      view.labelTape
        .setSize(tapeW, tapeH)
        .setPosition(0, view.label.y);

      view.labelPin.clear();
      view.labelPin.fillStyle(0x000000, 0.35);
      view.labelPin.fillCircle(1, view.label.y - tapeH / 2 + 6, 5);
      view.labelPin.fillStyle(0xb22222, 1);
      view.labelPin.fillCircle(0, view.label.y - tapeH / 2 + 4, 5);
      view.labelPin.fillStyle(0xffffff, 0.55);
      view.labelPin.fillCircle(-1.5, view.label.y - tapeH / 2 + 2.5, 1.6);

      view.answerText
        .setPosition(0, 2)
        .setFontSize(L.compact ? '15px' : '20px')
        .setWordWrapWidth(L.slotWrapWidth, true);

      view.lockStamp
        .setPosition(sw / 2 - 58, sh / 2 - 16)
        .setFontSize(L.compact ? '7px' : '9px');

      view.removeButton
        .setPosition(
          sw / 2 - 35,
          -sh / 2 + 17
        )
        .setFontSize(L.compact ? '7px' : '9px');
    });

    this.cardViews.forEach((view, index) => {
      const position = L.cardPositions[index];

      if (!position) {
        return;
      }

      const cw = L.cardWidth;
      const ch = L.cardHeight;

      view.baseX = position.x;
      view.baseY = position.y;

      view.shadow.setSize(cw, ch);
      view.box.setSize(cw, ch);
      this._setHit(view.box, cw, ch);

      // Zagięty róg
      view.decor.clear();
      view.decor.fillStyle(0xc7b283, 1);
      view.decor.fillTriangle(
        cw / 2 - 16, -ch / 2 + 16,
        cw / 2 - 16, -ch / 2,
        cw / 2, -ch / 2 + 16
      );
      view.decor.fillStyle(0xd9c79a, 1);
      view.decor.fillTriangle(
        cw / 2 - 16, -ch / 2,
        cw / 2, -ch / 2,
        cw / 2, -ch / 2 + 16
      );

      // Pinezka
      view.pin.clear();
      view.pin.fillStyle(0x000000, 0.35);
      view.pin.fillCircle(1, -ch / 2 + 11, 6);
      view.pin.fillStyle(view.pinColor, 1);
      view.pin.fillCircle(0, -ch / 2 + 8, 6);
      view.pin.fillStyle(0xffffff, 0.55);
      view.pin.fillCircle(-2, -ch / 2 + 6, 1.8);

      view.cardTitle
        .setPosition(0, 5)
        .setFontSize(L.compact ? '14px' : '18px')
        .setWordWrapWidth(
          Math.max(110, cw - 20),
          true
        );

      view.selectedMark.setPosition(0, ch / 2);

      this._settleCard(view, false);
    });

    // Legenda: kropki + opisy wyśrodkowane razem
    const size = L.compact ? '11px' : '15px';
    const swatchW = 14;
    const gapIn = 8;
    const gapOut = 26;

    this.legendItems.forEach(item => item.text.setFontSize(size));

    const widths = this.legendItems.map(
      item => swatchW + gapIn + item.text.width
    );

    const total =
      widths.reduce((sum, v) => sum + v, 0) +
      gapOut * (this.legendItems.length - 1);

    let cursor = -total / 2;

    this.legendItems.forEach((item, i) => {
      item.swatch.setPosition(cursor + swatchW / 2, 0);
      item.text.setPosition(cursor + swatchW + gapIn, 0);
      cursor += widths[i] + gapOut;
    });

    this.legendContainer
      .setPosition(L.width / 2, L.legendY)
      .setScale(Math.min(1, (L.panelWidth - 60) / Math.max(1, total)));

    this.feedbackText
      .setPosition(L.width / 2, L.feedbackY)
      .setFontSize(L.compact ? '14px' : '19px')
      .setWordWrapWidth(L.feedbackWrapWidth, true);

    this.closeButton
      .setPosition(L.closeX, L.buttonsY)
      .setFontSize(L.compact ? '17px' : '23px');

    this.confirmButton
      .setPosition(L.confirmX, L.buttonsY)
      .setFontSize(L.compact ? '17px' : '23px');

    this.drawStrings();
  }

  // ─── Animacja wejścia ─────────────────────────────────────────────────────

  _playIntro() {
    const L = this.layout;
    if (!L || this.isDestroyed) return;

    this.overlay.setAlpha(0);
    this._tween({ targets: this.overlay, alpha: 1, duration: 180 });

    this.panel.setAlpha(0);
    this._tween({ targets: this.panel, alpha: 1, duration: 260 });

    [this.titleText, this.subtitleText, this.attemptsText, this.attemptsIcons]
      .forEach((obj, i) => {
        obj.setAlpha(0);
        this._tween({ targets: obj, alpha: 1, duration: 260, delay: 80 + i * 60 });
      });

    this.slotViews.forEach((view, i) => {
      const y = view.container.y;
      view.container.setAlpha(0).setY(y - 24);
      this._tween({
        targets: view.container,
        alpha: 1,
        y,
        duration: 280,
        delay: 160 + i * 110,
        ease: 'Cubic.easeOut'
      });
    });

    // Karteczki "rozdawane" na tablicę
    this.cardViews.forEach((view, i) => {
      view.container.setAlpha(0).setY(view.baseY + 40);
      this._tween({
        targets: view.container,
        alpha: this.isCardUsed(view.index) ? 0.38 : 1,
        y: view.baseY,
        duration: 300,
        delay: 360 + i * 80,
        ease: 'Back.easeOut'
      });
    });

    [this.legendContainer, this.feedbackText, this.closeButton, this.confirmButton]
      .forEach(obj => {
        obj.setAlpha(0);
        this._tween({ targets: obj, alpha: 1, duration: 260, delay: 700 });
      });
  }

  // ─── Stan kartek ──────────────────────────────────────────────────────────

  // Jedyne miejsce, które ustawia pozycję/skalę/obrót/przezroczystość kartki.
  _settleCard(view, animate = true) {
    if (!view?.container?.scene || this.isDestroyed) return;

    const used = this.isCardUsed(view.index);
    const selected = this.state?.selectedCardIndex === view.index && !used;
    const hover = view.hover && !used && !selected;

    const target = {
      x: view.baseX,
      y: view.baseY - (selected ? 10 : hover ? 5 : 0),
      scale: selected ? 1.05 : hover ? 1.02 : 1,
      rotation: selected ? 0 : view.baseRot,
      alpha: used ? 0.38 : 1
    };

    this._kill(view.container);

    const tween = animate
      ? this._tween({
          targets: view.container,
          ...target,
          duration: 140,
          ease: 'Sine.easeOut'
        })
      : null;

    if (!tween) {
      view.container
        .setPosition(target.x, target.y)
        .setScale(target.scale)
        .setRotation(target.rotation)
        .setAlpha(target.alpha);
    }
  }

  // ─── Sznurki ──────────────────────────────────────────────────────────────

  _cardPin(view) {
    const ch = this.layout.cardHeight;
    const d = ch / 2 - 8;
    const r = view.container.rotation;

    return {
      x: view.container.x + d * Math.sin(r),
      y: view.container.y - d * Math.cos(r)
    };
  }

  drawStrings() {
    const g = this.stringGfx;
    const L = this.layout;

    if (!g?.scene || !L || this.isDestroyed) return;

    g.clear();

    this.slotViews.forEach((slotView, slotIndex) => {
      const cardIndex = this.state?.getPlacedCardIndex?.(slotIndex);

      if (
        cardIndex === null ||
        cardIndex === undefined ||
        cardIndex < 0
      ) {
        return;
      }

      const cardView = this.cardViews[cardIndex];

      if (!cardView) return;

      const feedback = this.state?.slotFeedback?.[slotIndex] || 'neutral';
      const color = STRING_COLORS[feedback] ?? STRING_COLORS.neutral;

      const start = {
        x: slotView.container.x,
        y: slotView.container.y + L.slotHeight / 2
      };

      const end = this._cardPin(cardView);

      const progress = this._stringProg[slotIndex] ?? 1;

      const sag = 26 + Math.hypot(end.x - start.x, end.y - start.y) * 0.08;
      const control = {
        x: (start.x + end.x) / 2,
        y: Math.max(start.y, end.y) + sag * 0.35 + 18
      };

      const pointAt = t => ({
        x: (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * control.x + t * t * end.x,
        y: (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * control.y + t * t * end.y
      });

      const steps = 28;
      const last = Math.max(1, Math.round(steps * progress));

      // Cień sznurka
      g.lineStyle(4, 0x000000, 0.3);
      g.beginPath();
      for (let i = 0; i <= last; i++) {
        const p = pointAt(i / steps);
        if (i === 0) g.moveTo(p.x + 2, p.y + 3);
        else g.lineTo(p.x + 2, p.y + 3);
      }
      g.strokePath();

      // Sznurek + jasny refleks (efekt skręconej nici)
      g.lineStyle(3, color, 0.95);
      g.beginPath();
      for (let i = 0; i <= last; i++) {
        const p = pointAt(i / steps);
        if (i === 0) g.moveTo(p.x, p.y);
        else g.lineTo(p.x, p.y);
      }
      g.strokePath();

      g.lineStyle(1, 0xffffff, 0.25);
      g.beginPath();
      for (let i = 0; i <= last; i++) {
        const p = pointAt(i / steps);
        if (i === 0) g.moveTo(p.x, p.y - 1);
        else g.lineTo(p.x, p.y - 1);
      }
      g.strokePath();

      // Węzły na końcach
      g.fillStyle(color, 1);
      g.fillCircle(start.x, start.y, 4);
      if (progress >= 1) g.fillCircle(end.x, end.y, 4);
    });
  }

  // ─── Odświeżanie ──────────────────────────────────────────────────────────

  refresh() {
    if (this.isDestroyed) {
      return;
    }

    this.refreshSlots();
    this.refreshCards();
    this.refreshAttempts();
    this.refreshConfirmButton();
    this.drawStrings();
  }

  refreshSlots() {
    const newFeedback = [];
    const placed = [];

    this.slotViews.forEach((view, slotIndex) => {
      /*
       * Wszystkie zmienne muszą powstać PRZED
       * pierwszym użyciem isSelected / isLocked.
       */
      const card = this.state?.getPlacedCard(slotIndex);

      const isSelected =
        this.state?.selectedSlotIndex === slotIndex;

      const isLocked =
        this.state?.isSlotLocked(slotIndex);

      const feedback =
        this.state?.slotFeedback?.[slotIndex] ||
        'neutral';

      newFeedback[slotIndex] = feedback;

      const cardIndex = this.state?.getPlacedCardIndex?.(slotIndex);
      placed[slotIndex] =
        cardIndex === undefined || cardIndex === null || cardIndex < 0
          ? null
          : cardIndex;

      let visual = SLOT_COLORS[feedback] || SLOT_COLORS.neutral;

      if (isSelected && !card) {
        visual = SLOT_COLORS.selected;
      }

      if (isLocked) {
        visual = SLOT_COLORS.green;
      }

      view.box.setFillStyle(visual.fill, 1);
      view.box.setStrokeStyle(
        isSelected ? 4 : 3,
        visual.stroke,
        1
      );

      // Pulsująca poświata wybranego pytania
      const wantGlow = Boolean(isSelected && !isLocked);

      if (wantGlow && !view.glowOn) {
        view.glowOn = true;
        this._kill(view.glow);
        view.glow.setAlpha(0.2);
        this._tween({
          targets: view.glow,
          alpha: 0.9,
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      } else if (!wantGlow && view.glowOn) {
        view.glowOn = false;
        this._kill(view.glow);
        view.glow.setAlpha(0);
      }

      view.qMark.setVisible(!card);
      view.lockStamp.setVisible(Boolean(isLocked));

      if (!card) {
        view.answerText.setText(
          isSelected
            ? '[ now select a clue ]'
            : '[ empty ]'
        );

        view.answerText.setColor(visual.text);
        view.removeButton.setVisible(false);

        return;
      }

      /*
       * To jest moment, kiedy tekst wybranej wskazówki
       * trafia do kwadratu pytania.
       */
      view.answerText.setText(
        this.getSlotSentence(card, slotIndex)
      );

      view.answerText.setColor(visual.text);

      view.removeButton.setVisible(
        !isLocked &&
        !this.state?.uiLocked
      );
    });

    this._reactToFeedback(newFeedback);
    this._reactToPlacement(placed);
  }

  // Nowy werdykt: sloty "przeskakują" po kolei, a dźwięk zależy od wyniku.
  _reactToFeedback(newFeedback) {
    const changed = [];

    newFeedback.forEach((feedback, i) => {
      const prev = this._lastFeedback[i] || 'neutral';
      if (feedback !== 'neutral' && feedback !== prev) {
        changed.push(i);
      }
    });

    this._lastFeedback = newFeedback.slice();

    if (!changed.length) return;

    changed.forEach((slotIndex, order) => {
      this._popSlot(slotIndex, order * 120);
    });

    const anyGreen = changed.some(i => newFeedback[i] === 'green');
    this._sfx(anyGreen ? 'correct' : 'wrong', 0.4);
  }

  // Nowe przypisanie: sznurek "rysuje się" od slotu do kartki.
  _reactToPlacement(placed) {
    placed.forEach((cardIndex, slotIndex) => {
      const prev = this._prevPlaced[slotIndex] ?? null;

      if (cardIndex === null) {
        delete this._stringProg[slotIndex];
        this._kill(this._stringHolders[slotIndex]);
        delete this._stringHolders[slotIndex];
        return;
      }

      if (cardIndex !== prev) {
        this._startStringTween(slotIndex);
      }
    });

    this._prevPlaced = placed.slice();
  }

  _startStringTween(slotIndex) {
    this._kill(this._stringHolders[slotIndex]);

    const holder = { v: 0 };
    this._stringHolders[slotIndex] = holder;
    this._stringProg[slotIndex] = 0;

    const done = () => {
      this._stringProg[slotIndex] = 1;
      this.drawStrings();
    };

    const tween = this._tween({
      targets: holder,
      v: 1,
      duration: 260,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        this._stringProg[slotIndex] = holder.v;
        this.drawStrings();
      },
      onComplete: done
    });

    if (!tween) {
      done();
      return;
    }

    this._sfx('paper_rustle', 0.3);
  }

  _popSlot(slotIndex, delay = 0) {
    const view = this.slotViews[slotIndex];

    if (!view?.container?.scene) return;

    this._tween({
      targets: view.container,
      scale: 1.06,
      duration: 110,
      delay,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (view.container?.scene) view.container.setScale(1);
      }
    });
  }

  refreshCards() {
    this.cardViews.forEach(view => {
      const used = this.isCardUsed(view.index);

      const selected =
        this.state?.selectedCardIndex === view.index;

      view.usedMark.setVisible(used);
      view.selectedMark.setVisible(selected && !used);

      if (used) {
        view.box.setFillStyle(0x95866d, 1);
        view.box.setStrokeStyle(
          2,
          0x6c5e4c,
          0.7
        );

        view.box.disableInteractive();
        view.hover = false;
      } else {
        this._setHit(
          view.box,
          this.layout?.cardWidth ?? 230,
          this.layout?.cardHeight ?? 102
        );

        if (selected) {
          view.box.setFillStyle(0xffedb1, 1);
          view.box.setStrokeStyle(
            4,
            0xd4af37,
            1
          );
        } else {
          view.box.setFillStyle(0xf1e2bf, 1);
          view.box.setStrokeStyle(
            3,
            0x725022,
            0.95
          );
        }
      }

      this._settleCard(view);
    });
  }

  refreshAttempts() {
    const attempts =
      this.state?.attemptsLeft ?? 0;

    this._maxAttempts = Math.max(this._maxAttempts, attempts);

    this.attemptsText.setText(
      `ATTEMPTS LEFT: ${attempts}`
    );

    this.drawAttemptIcons(attempts);

    // Zmarnowana próba: ikonki się trzęsą
    if (this._lastAttempts !== null && attempts < this._lastAttempts) {
      this._kill(this.attemptsIcons);
      this.attemptsIcons.setX(0);
      this._tween({
        targets: this.attemptsIcons,
        x: 6,
        duration: 50,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          if (this.attemptsIcons?.scene) this.attemptsIcons.setX(0);
        }
      });
    }

    this._lastAttempts = attempts;
  }

  // Lupki: pełna = pozostała próba, zgaszona = zużyta
  drawAttemptIcons(attempts) {
    const L = this.layout;
    const g = this.attemptsIcons;

    if (!L || !g?.scene) return;

    g.clear();

    const max = Math.max(this._maxAttempts, attempts);
    const gap = L.compact ? 30 : 38;
    const r = L.compact ? 7 : 9;
    const y = L.attemptsY + (L.compact ? 26 : 32);
    const startX = L.width / 2 - ((max - 1) * gap) / 2;

    for (let i = 0; i < max; i++) {
      const x = startX + i * gap;
      const on = i < attempts;
      const color = on ? 0xffd966 : 0x5a4a30;

      if (on) {
        g.fillStyle(0xffd966, 0.22);
        g.fillCircle(x, y, r);
      }

      g.lineStyle(3, color, on ? 1 : 0.7);
      g.strokeCircle(x, y, r);
      g.lineBetween(x + r * 0.7, y + r * 0.7, x + r * 1.7, y + r * 1.7);

      if (!on) {
        g.lineStyle(2, 0x8a3a3a, 0.9);
        g.lineBetween(x - r * 0.6, y - r * 0.6, x + r * 0.6, y + r * 0.6);
        g.lineBetween(x - r * 0.6, y + r * 0.6, x + r * 0.6, y - r * 0.6);
      }
    }
  }

  refreshConfirmButton() {
    const isComplete = Boolean(
      this.state?.isTimelineComplete() &&
      !this.state?.uiLocked
    );

    this.confirmButton.setColor(
      isComplete ? '#ffd966' : '#777777'
    );

    this.confirmButton.setBackgroundColor(
      isComplete ? '#513c12' : '#2d2822'
    );

    this.confirmButton.setAlpha(
      isComplete ? 1 : 0.72
    );

    // Gdy teoria jest kompletna, przycisk delikatnie pulsuje
    if (isComplete && !this._confirmPulseOn) {
      this._confirmPulseOn = true;
      this._kill(this.confirmButton);
      this._tween({
        targets: this.confirmButton,
        scale: 1.05,
        duration: 520,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else if (!isComplete && this._confirmPulseOn) {
      this._confirmPulseOn = false;
      this._kill(this.confirmButton);
      this.confirmButton.setScale(1);
    }
  }

  isCardUsed(cardIndex) {
    const slotIndex =
      this.state?.getCardSlot(cardIndex);

    return (
      slotIndex !== -1 &&
      slotIndex !== null &&
      slotIndex !== undefined
    );
  }

  getSlotSentence(card, slotIndex) {
    if (!card) {
      return '[ empty ]';
    }

    /*
     * To usuwa drugi błąd z Twojego pliku:
     * `return sentence || ...`, gdy sentence nie istnieje.
     */
    const sentence = this.buildSlotSentence?.(
      card,
      slotIndex
    );

    return (
      sentence ||
      card.item ||
      '[ clue ]'
    );
  }

  showFeedback(text, color = '#ffd966') {
    if (!this.feedbackText || this.isDestroyed) {
      return;
    }

    this._kill(this.feedbackText);

    this.feedbackText
      .setText(text)
      .setColor(color)
      .setAlpha(0.2);

    const tween = this._tween({
      targets: this.feedbackText,
      alpha: 1,
      duration: 180,
      ease: 'Sine.easeOut'
    });

    if (!tween) this.feedbackText.setAlpha(1);
  }

  showGreenNarrative(slotIndex, text, delay = 0) {
    if (!text || this.isDestroyed) {
      return;
    }

    this.scene.time.delayedCall(delay, () => {
      if (this.isDestroyed) {
        return;
      }

      const view = this.slotViews[slotIndex];

      if (!view) {
        return;
      }

      view.answerText.setText(text);
      view.answerText.setColor('#b9efb9');
      this._popSlot(slotIndex);
    });
  }

  flashSlot(slotIndex) {
    const view = this.slotViews[slotIndex];

    if (!view?.box) {
      return;
    }

    this._kill(view.box);

    this._tween({
      targets: view.box,
      alpha: {
        from: 1,
        to: 0.7
      },
      yoyo: true,
      duration: 90,
      repeat: 1,
      onComplete: () => {
        if (view.box?.active) {
          view.box.setAlpha(1);
        }
      }
    });
  }

  // ─── Klawiatura ───────────────────────────────────────────────────────────

  _bindKeys() {
    const kb = this.scene.input?.keyboard;
    if (!kb || this._keysBound) return;

    kb.on('keydown-ESC', this._onEsc);
    kb.on('keydown-ENTER', this._onEnter);
    this._keysBound = true;
  }

  _unbindKeys() {
    if (!this._keysBound) return;

    const kb = this.scene.input?.keyboard;
    kb?.off('keydown-ESC', this._onEsc);
    kb?.off('keydown-ENTER', this._onEnter);
    this._keysBound = false;
  }

  // ─── Sprzątanie ───────────────────────────────────────────────────────────

  destroy() {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;

    this._unbindKeys();

    if (this.resizeHandler) {
      this.scene.scale.off(
        'resize',
        this.resizeHandler,
        this
      );
    }

    Object.values(this._stringHolders).forEach(h => this._kill(h));
    this._stringHolders = {};
    this._stringProg = {};

    this.slotViews.forEach(view => {
      this._kill(view.container);
      this._kill(view.glow);
      this._kill(view.box);

      [view.box, view.removeButton].forEach(item => {
        item?.removeAllListeners?.();
      });

      view.container?.destroy?.(true);
    });

    this.cardViews.forEach(view => {
      this._kill(view.container);

      view.box?.removeAllListeners?.();
      view.container?.destroy?.(true);
    });

    [
      this.overlay,
      this.panel,
      this.titleText,
      this.subtitleText,
      this.attemptsText,
      this.attemptsIcons,
      this.feedbackText,
      this.legendContainer,
      this.stringGfx,
      this.closeButton,
      this.confirmButton
    ].forEach(item => {
      this._kill(item);
      item?.removeAllListeners?.();
      item?.destroy?.();
    });

    this.slotViews = [];
    this.cardViews = [];
    this.legendItems = [];
    this.cards = [];
    this.layout = null;
    this.resizeHandler = null;
  }
}