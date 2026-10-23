import { mulberry32 } from './BoardConstants.js';

export const BoardLayout = {
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
  },

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
  },

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

    this.layoutDeductionControls();
    this.drawStrings();
  }
};
