import { COLORS } from './gridConstants.js';

export const GridDrawMixin = {
  computeLayout() {
    const { width, height } = this.scale;
    const narrow = width < 900;

    const top = 96;
    const bottom = 62;
    const sidebarW = narrow ? 230 : Math.min(360, Math.floor(width * 0.27));
    const areaH = height - top - bottom - 10;

    const sidebar = { x: 12, y: top, w: sidebarW, h: areaH };
    const grid = {
      x: sidebar.x + sidebarW + 12,
      y: top,
      w: width - (sidebar.x + sidebarW + 12) - 12,
      h: areaH
    };

    return {
      width,
      height,
      sidebar,
      grid,
      nameW: narrow ? 230 : 270,
      headerH: 56,
      sceneRowH: 64,
      rowH: 64,
      minColW: 120,
      maxColW: 250
    };
  },

  clearUI() {
    this.maskGraphics.forEach((g) => g?.destroy());
    this.maskGraphics = [];

    if (this.uiRoot) {
      this.uiRoot.destroy(true);
      this.uiRoot = null;
    }

    if (this.modalRoot) {
      this.modalRoot.destroy(true);
      this.modalRoot = null;
    }

    this.bodyContainer = null;
    this.headerContainer = null;
    this.sceneContainer = null;
    this.nameContainer = null;
    this.clueListContainer = null;
    this.feedbackText = null;
  },

  makeMask(x, y, w, h) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillRect(x, y, w, h);
    this.maskGraphics.push(g);
    return g.createGeometryMask();
  },

  buildUI() {
    this.clearUI();

    const L = (this.layout = this.computeLayout());

    this.uiRoot = this.add.container(0, 0).setDepth(0);

    this.drawBackground(L);
    this.drawHeader(L);
    this.drawClueSidebar(L);
    this.drawGrid(L);
    this.drawFooter(L);

    this.applyScroll();
  },

  drawBackground(L) {
    const { width, height } = L;

    this.uiRoot.add([
      this.add.rectangle(0, 0, width, height, COLORS.bg, 1).setOrigin(0),
      this.add.rectangle(0, 0, width, 88, COLORS.band, 1).setOrigin(0),
      this.add.rectangle(0, 85, width, 3, COLORS.gold, 0.95).setOrigin(0),
      this.add
        .rectangle(0, height - 62, width, 62, 0x0c090a, 1)
        .setOrigin(0)
    ]);
  },

  drawHeader(L) {
    const { width } = L;

    const placedCount = Object.keys(this.placedCluesByCell).length;
    const unlikelyCount = this.suspects.filter(
      (s) => this.markedUnlikelyBySuspectId[s.id]
    ).length;
    const possibleCount = this.suspects.length - unlikelyCount;

    const title = this.add
      .text(width / 2, 8, 'EVIDENCE GRID', {
        fontFamily: 'SpecialElite',
        fontSize: '28px',
        color: '#f5e7c6'
      })
      .setOrigin(0.5, 0);

    const sub = this.add
      .text(
        width / 2,
        44,
        'Pick a clue card, then click the glowing cell. Compare the crime scene row with each suspect.',
        {
          fontFamily: 'SpecialElite',
          fontSize: '14px',
          color: '#d9c998',
          align: 'center',
          wordWrap: { width: width - 40, useAdvancedWrap: true }
        }
      )
      .setOrigin(0.5, 0);

    const stats = this.add
      .text(
        width / 2,
        66,
        `CLUES ${placedCount}/${this.clueCards.length + placedCount}   ·   POSSIBLE ${possibleCount}   ·   UNLIKELY ${unlikelyCount}`,
        {
          fontFamily: 'PressStart2P',
          fontSize: '8px',
          color: '#ffdc73'
        }
      )
      .setOrigin(0.5, 0);

    this.uiRoot.add([title, sub, stats]);
  },

  /* ------------------------------ SIDEBAR ---------------------------- */

  drawClueSidebar(L) {
    const s = L.sidebar;
    const clues = this.getUnplacedClues();

    this.uiRoot.add([
      this.add
        .rectangle(s.x + s.w / 2, s.y + s.h / 2, s.w, s.h, COLORS.panel, 1)
        .setStrokeStyle(2, COLORS.panelStroke, 1),
      this.add
        .text(s.x + 12, s.y + 10, `CLUE CARDS (${clues.length})`, {
          fontFamily: 'PressStart2P',
          fontSize: '9px',
          color: '#ffdc73'
        })
        .setOrigin(0, 0)
    ]);

    const listX = s.x + 8;
    const listY = s.y + 34;
    const listW = s.w - 16;
    const listH = s.h - 42;

    this.regions.clueList = { x: listX, y: listY, w: listW, h: listH };

    this.clueListContainer = this.add.container(listX, listY);
    this.clueListContainer.setMask(this.makeMask(listX, listY, listW, listH));
    this.uiRoot.add(this.clueListContainer);

    if (!clues.length) {
      const empty = this.add
        .text(listW / 2, 30, 'All clue cards are on the board.', {
          fontFamily: 'SpecialElite',
          fontSize: '16px',
          color: '#c6b58d',
          align: 'center',
          wordWrap: { width: listW - 20, useAdvancedWrap: true }
        })
        .setOrigin(0.5, 0);

      this.clueListContainer.add(empty);
      this.minClueScroll = 0;
      this.clueScrollY = 0;
      return;
    }

    let cursorY = 0;

    clues.forEach((clue) => {
      const card = this.createClueCard(clue, listW, cursorY);
      this.clueListContainer.add(card.container);
      cursorY += card.height + 8;
    });

    this.minClueScroll = Math.min(0, listH - cursorY);
    this.clueScrollY = Phaser.Math.Clamp(
      this.clueScrollY,
      this.minClueScroll,
      0
    );

    if (this.minClueScroll < 0) {
      this.uiRoot.add(
        this.add
          .text(s.x + s.w - 10, s.y + 12, 'SCROLL ↕', {
            fontFamily: 'PressStart2P',
            fontSize: '6px',
            color: '#aa9263'
          })
          .setOrigin(1, 0)
      );
    }
  },

  createClueCard(clue, cardW, y) {
    const selected = clue.id === this.selectedClueId;
    const isScene = clue.type === 'crime_scene_fact';
    const accent = isScene ? 0xd4af37 : 0x6fa8dc;

    const container = this.add.container(0, y);

    const tag = this.add
      .text(
        16,
        10,
        `${isScene ? 'CRIME SCENE' : 'SUSPECT'} · ${clue.label.toUpperCase()}`,
        {
          fontFamily: 'PressStart2P',
          fontSize: '7px',
          color: selected ? '#18110b' : isScene ? '#ffdc73' : '#a9d0f5',
          wordWrap: { width: cardW - 28, useAdvancedWrap: true }
        }
      )
      .setOrigin(0, 0);

    const body = this.add
      .text(16, tag.y + tag.height + 8, clue.text, {
        fontFamily: 'SpecialElite',
        fontSize: '15px',
        color: selected ? '#21160c' : '#f1e2c0',
        wordWrap: { width: cardW - 28, useAdvancedWrap: true }
      })
      .setOrigin(0, 0);

    const cardH = Math.ceil(body.y + body.height + 12);

    const bg = this.add
      .rectangle(
        cardW / 2,
        cardH / 2,
        cardW,
        cardH,
        selected ? 0xe3c26a : 0x302217,
        1
      )
      .setStrokeStyle(selected ? 3 : 2, selected ? 0xfff0b0 : 0x806440, 1)
      .setInteractive({ useHandCursor: true });

    const stripe = this.add
      .rectangle(0, 0, 5, cardH, accent, 1)
      .setOrigin(0, 0);

    bg.on('pointerover', () => {
      if (!selected) bg.setFillStyle(0x45321f, 1);
    });
    bg.on('pointerout', () => {
      if (!selected) bg.setFillStyle(0x302217, 1);
    });
    bg.on('pointerup', (pointer) => {
      if (this.modalOpen || this.dragMoved) return;
      if (!this.inRect(pointer, this.regions.clueList)) return;
      this.selectClue(clue.id);
    });

    container.add([bg, stripe, tag, body]);

    return { container, height: cardH };
  },

  /* ------------------------------- FOOTER ---------------------------- */

  drawFooter(L) {
    const { width, height } = L;

    this.feedbackText = this.add
      .text(width / 2, height - 31, this.feedbackMessage, {
        fontFamily: 'SpecialElite',
        fontSize: '15px',
        color: '#ffdc73',
        align: 'center',
        wordWrap: { width: Math.max(220, width - 480), useAdvancedWrap: true }
      })
      .setOrigin(0.5);

    this.uiRoot.add(this.feedbackText);

    this.uiRoot.add(
      this.createButton({
        x: 110,
        y: height - 31,
        width: 190,
        height: 38,
        label: '[ CRIME CITY ]',
        fill: 0x43241e,
        hoverFill: 0x67382d,
        onClick: () => this.closeScene()
      })
    );

    this.uiRoot.add(
      this.createButton({
        x: width - 135,
        y: height - 31,
        width: 250,
        height: 38,
        label: '[ SEND TO ALIBIS ]',
        fill: 0x24442a,
        hoverFill: 0x38673e,
        textColor: '#d6ffd5',
        onClick: () => this.finalizeGrid()
      })
    );
  },

  createButton({
    x,
    y,
    width,
    height,
    label,
    fill = 0x2d2118,
    hoverFill = 0x4b3322,
    textColor = '#f6e7bf',
    onClick
  }) {
    const container = this.add.container(x, y);

    const background = this.add
      .rectangle(0, 0, width, height, fill, 1)
      .setStrokeStyle(2, 0x8b704b, 1)
      .setInteractive({ useHandCursor: true });

    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'PressStart2P',
        fontSize: '8px',
        color: textColor,
        align: 'center',
        wordWrap: { width: width - 14, useAdvancedWrap: true }
      })
      .setOrigin(0.5);

    background.on('pointerover', () => {
      background.setFillStyle(hoverFill, 1);
      background.setStrokeStyle(2, COLORS.gold, 1);
    });
    background.on('pointerout', () => {
      background.setFillStyle(fill, 1);
      background.setStrokeStyle(2, 0x8b704b, 1);
    });
    background.on('pointerup', () => {
      if (this.modalOpen) return;
      onClick();
    });

    container.add([background, text]);
    return container;
  },

  /* -------------------------------- MODAL ---------------------------- */

  showConfirmModal({ title, message, yesLabel, noLabel, onYes }) {
    const { width, height } = this.scale;
    this.modalOpen = true;

    const root = this.add.container(0, 0).setDepth(200);
    this.modalRoot = root;

    const blocker = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.75)
      .setOrigin(0)
      .setInteractive();

    const boxW = Math.min(580, width - 40);
    const boxH = 270;

    const box = this.add
      .rectangle(width / 2, height / 2, boxW, boxH, 0x1f1614, 1)
      .setStrokeStyle(3, COLORS.noStroke, 1);

    const titleText = this.add
      .text(width / 2, height / 2 - boxH / 2 + 28, title, {
        fontFamily: 'PressStart2P',
        fontSize: '11px',
        color: '#ff9d8f',
        align: 'center',
        wordWrap: { width: boxW - 40, useAdvancedWrap: true }
      })
      .setOrigin(0.5, 0);

    const msgText = this.add
      .text(width / 2, height / 2 - 16, message, {
        fontFamily: 'SpecialElite',
        fontSize: '16px',
        color: '#f1e2c0',
        align: 'center',
        wordWrap: { width: boxW - 50, useAdvancedWrap: true }
      })
      .setOrigin(0.5, 0.5);

    root.add([blocker, box, titleText, msgText]);

    const closeModal = () => {
      this.modalOpen = false;
      this.modalRoot?.destroy(true);
      this.modalRoot = null;
    };

    const makeBtn = (bx, label, fill, hover, cb) => {
      const bw = Math.floor((boxW - 60) / 2);
      const bh = 44;
      const by = height / 2 + boxH / 2 - 44;

      const bg = this.add
        .rectangle(bx, by, bw, bh, fill, 1)
        .setStrokeStyle(2, 0x8b704b, 1)
        .setInteractive({ useHandCursor: true });

      const tx = this.add
        .text(bx, by, label, {
          fontFamily: 'PressStart2P',
          fontSize: '7px',
          color: '#fff0cb',
          align: 'center',
          wordWrap: { width: bw - 12, useAdvancedWrap: true }
        })
        .setOrigin(0.5);

      bg.on('pointerover', () => bg.setFillStyle(hover, 1));
      bg.on('pointerout', () => bg.setFillStyle(fill, 1));
      bg.on('pointerup', cb);

      root.add([bg, tx]);
    };

    makeBtn(width / 2 - boxW / 4, noLabel, 0x24442a, 0x38673e, () => {
      closeModal();
    });

    makeBtn(width / 2 + boxW / 4, yesLabel, 0x632923, 0x823b31, () => {
      closeModal();
      onYes();
    });
  }
};