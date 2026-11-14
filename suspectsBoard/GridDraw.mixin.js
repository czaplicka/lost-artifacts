import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { COLORS } from './gridConstants.js';
import { prettify } from './gridHelpers.js';
import {
  THEME, bevelBox, cornerBrackets, hatch, hashString, pill, tapeStrip
} from './gridTheme.js';

const QUIPS = [
  __dialogueText("suspectsBoard/GridDraw.mixin.js", "t_d5b98be4acba60789932"),
  __dialogueText("suspectsBoard/GridDraw.mixin.js", "t_ec949aad36b156126757"),
  __dialogueText("suspectsBoard/GridDraw.mixin.js", "t_83ea70ea71dbe68b428a"),
  __dialogueText("suspectsBoard/GridDraw.mixin.js", "t_788e1ab8b8708ccbdc1f"),
  __dialogueText("suspectsBoard/GridDraw.mixin.js", "t_06033eae2c2842ab3ce2"),
  __dialogueText("suspectsBoard/GridDraw.mixin.js", "t_7da5b570b9b32671b7fc"),
  __dialogueText("suspectsBoard/GridDraw.mixin.js", "t_ce9bce66ea9aebff5a4a"),
  __dialogueText("suspectsBoard/GridDraw.mixin.js", "t_f6257310557693330731")
];

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

  /** Tweens created for grid visuals are tracked so clearUI can kill them. */
  trackTween(config) {
    const tween = this.tweens.add(config);
    (this.gridTweens ??= []).push(tween);
    return tween;
  },

  clearUI() {
    (this.gridTweens || []).forEach((tween) => {
      tween?.stop?.();
      tween?.remove?.();
    });
    this.gridTweens = [];

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
    this.scrollbars = {};
    this.gridHover = null;
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

  /* ----------------------------- BACKGROUND -------------------------- */

  drawBackground(L) {
    const { width, height } = L;

    this.uiRoot.add([
      this.add.rectangle(0, 0, width, height, COLORS.bg, 1).setOrigin(0),
      hatch(this, 0, 88, width, height - 88 - 62, {
        spacing: 14, color: THEME.gold, alpha: 0.025
      }),
      this.add.rectangle(0, 0, width, 88, COLORS.band, 1).setOrigin(0),
      hatch(this, 0, 0, width, 85, { spacing: 8, color: 0x000000, alpha: 0.18 }),
      this.add.rectangle(0, 81, width, 1, THEME.gold, 0.3).setOrigin(0),
      this.add.rectangle(0, 85, width, 3, COLORS.gold, 0.95).setOrigin(0),
      tapeStrip(this, 0, 89, width, 5, 12).setAlpha(0.85),
      this.add.rectangle(0, height - 62, width, 62, 0x0c090a, 1).setOrigin(0),
      this.add.rectangle(0, height - 62, width, 2, THEME.gold, 0.55).setOrigin(0)
    ]);
  },

  /* ------------------------------- HEADER ---------------------------- */

  drawHeader(L) {
    const { width } = L;
    const narrow = width < 900;

    const placedCount = this.clueCards.length - this.getUnplacedClues().length;
    const unlikelyCount = this.suspects.filter(
      (s) => this.markedUnlikelyBySuspectId[s.id]
    ).length;
    const possibleCount = this.suspects.length - unlikelyCount;

    this.uiRoot.add(cornerBrackets(this, 8, 6, width - 16, 72, { len: 14, alpha: 0.45 }));

    const title = this.add
      .text(width / 2, 8, __dialogueText("suspectsBoard/GridDraw.mixin.js", "t_a90fb599d8cf71821729"), {
        fontFamily: 'SpecialElite',
        fontSize: '28px',
        color: '#f5e7c6'
      })
      .setOrigin(0.5, 0)
      .setShadow(3, 3, '#000000', 0, false, true);

    const sub = this.add
      .text(
        width / 2,
        44,
        __dialogueText("suspectsBoard/GridDraw.mixin.js", "t_f9987d68584a73ffec28"),
        { fontFamily: 'SpecialElite', fontSize: '13px', color: '#d9c998' }
      )
      .setOrigin(0.5, 0);
    sub.setScale(Math.min(1, (width - 40) / Math.max(1, sub.width)));

    this.uiRoot.add([title, sub]);

    if (!narrow) {
      const city = prettify(this.cityId || 'unknown').toUpperCase();
      const quip = QUIPS[
        hashString(`${this.cityId}|${this.gameState.currentMission?.id || ''}`) % QUIPS.length
      ];

      this.uiRoot.add([
        this.add.text(18, 12, __dialogueText("suspectsBoard/GridDraw.mixin.js", "t_c95495641200bd4f90b7"), {
          fontFamily: 'PressStart2P', fontSize: '7px', color: '#a8946a'
        }),
        this.add.text(18, 26, city, {
          fontFamily: 'SpecialElite', fontSize: '18px', color: '#f5e7c6',
          wordWrap: { width: 250, useAdvancedWrap: true }
        }),
        this.add
          .text(width - 18, 14, quip, {
            fontFamily: 'SpecialElite', fontSize: '13px', color: '#a8946a',
            align: 'right', wordWrap: { width: 260, useAdvancedWrap: true }
          })
          .setOrigin(1, 0)
      ]);
    }

    const pills = [
      pill(this, 0, 74, `${__dialogueText("suspectsBoard/GridDraw.mixin.js", "t_cdbbe6cb6adbf314e0a9")}${placedCount}${__dialogueText("suspectsBoard/GridDraw.mixin.js", "t_8a5edab282632443219e")}${this.clueCards.length}`, {
        dot: THEME.gold, color: '#ffdc73'
      }),
      pill(this, 0, 74, `${__dialogueText("suspectsBoard/GridDraw.mixin.js", "t_bd6ddbd206bce11de29c")}${possibleCount}`, {
        dot: COLORS.okStroke, color: '#d5ffd2', stroke: COLORS.okStroke
      }),
      pill(this, 0, 74, `${__dialogueText("suspectsBoard/GridDraw.mixin.js", "t_3cdfbeae113647882fd0")}${unlikelyCount}`, {
        dot: COLORS.noStroke, color: '#ffd1c8', stroke: COLORS.noStroke
      })
    ];
    const gap = 10;
    const total = pills.reduce((sum, p) => sum + p.width, 0) + gap * (pills.length - 1);
    let cursor = width / 2 - total / 2;
    pills.forEach((p) => {
      p.container.x = cursor + p.width / 2;
      cursor += p.width + gap;
      this.uiRoot.add(p.container);
    });
  },

  /* ------------------------------ SIDEBAR ---------------------------- */

  drawClueSidebar(L) {
    const s = L.sidebar;
    const clues = this.getUnplacedClues();

    this.uiRoot.add(
      bevelBox(this, s.x, s.y, s.w, s.h, { fill: COLORS.panel, stroke: COLORS.panelStroke })
    );
    this.uiRoot.add([
      this.add.rectangle(s.x + 2, s.y + 2, s.w - 4, 28, 0x2b2018, 1).setOrigin(0),
      this.add.rectangle(s.x + 2, s.y + 30, s.w - 4, 2, THEME.gold, 0.7).setOrigin(0),
      this.add
        .text(s.x + 12, s.y + 11, `${__dialogueText("suspectsBoard/GridDraw.mixin.js", "t_4827219e37f419978d97")}${clues.length}${__dialogueText("suspectsBoard/GridDraw.mixin.js", "t_ba5ec51d07a4ac0e9516")}`, {
          fontFamily: 'PressStart2P',
          fontSize: '9px',
          color: '#ffdc73'
        })
        .setOrigin(0, 0)
    ]);

    const listX = s.x + 8;
    const listY = s.y + 38;
    const listW = s.w - 16;
    const listH = s.h - 46;

    this.regions.clueList = { x: listX, y: listY, w: listW, h: listH };

    this.clueListContainer = this.add.container(listX, listY);
    this.clueListContainer.setMask(this.makeMask(listX, listY, listW, listH));
    this.uiRoot.add(this.clueListContainer);

    if (!clues.length) {
      const done = this.add
        .text(listW / 2, 30, __dialogueText("suspectsBoard/GridDraw.mixin.js", "t_099807993ab11a49f0db"), {
          fontFamily: 'SpecialElite',
          fontSize: '16px',
          color: '#c6b58d',
          align: 'center',
          wordWrap: { width: listW - 20, useAdvancedWrap: true }
        })
        .setOrigin(0.5, 0);
      const joke = this.add
        .text(listW / 2, done.y + done.height + 12, __dialogueText("suspectsBoard/GridDraw.mixin.js", "t_2cf84d0fb9da1322790c"), {
          fontFamily: 'SpecialElite',
          fontSize: '13px',
          color: '#8f7f60',
          align: 'center',
          wordWrap: { width: listW - 20, useAdvancedWrap: true }
        })
        .setOrigin(0.5, 0);

      this.clueListContainer.add([done, joke]);
      this.minClueScroll = 0;
      this.clueScrollY = 0;
      return;
    }

    const cardW = listW - 20;
    let cursorY = 8;

    clues.forEach((clue) => {
      const card = this.createClueCard(clue, cardW, cursorY);
      this.clueListContainer.add(card.container);
      cursorY += card.height + 10;
    });

    this.minClueScroll = Math.min(0, listH - cursorY);
    this.clueScrollY = Phaser.Math.Clamp(this.clueScrollY, this.minClueScroll, 0);

    if (this.minClueScroll < 0) {
      this.uiRoot.add(
        this.add
          .text(s.x + s.w - 12, s.y + 12, __dialogueText("suspectsBoard/GridDraw.mixin.js", "t_8fdbadc3bcfa716f8e86"), {
            fontFamily: 'PressStart2P',
            fontSize: '6px',
            color: '#aa9263'
          })
          .setOrigin(1, 0)
      );
      this.addScrollbar('clues', {
        axis: 'v',
        start: listY,
        fixed: s.x + s.w - 9,
        trackLen: listH,
        viewport: listH,
        content: listH - this.minClueScroll,
        getScroll: () => this.clueScrollY,
        getMin: () => this.minClueScroll
      });
    }
  },

  createClueCard(clue, cardW, y) {
    const selected = clue.id === this.selectedClueId;
    const isScene = clue.type === 'crime_scene_fact';
    const accent = isScene ? THEME.sceneAccent : THEME.suspectAccent;
    const padL = 18;
    const textW = cardW - padL - 12;

    const container = this.add.container(6, y);

    const badgeText = this.add
      .text(padL + 6, 11, isScene ? __dialogueText("suspectsBoard/GridDraw.mixin.js", "t_149dbafdfa19fa96352e") : __dialogueText("suspectsBoard/GridDraw.mixin.js", "t_edfa2c31b6de69133e64"), {
        fontFamily: 'PressStart2P',
        fontSize: '6px',
        color: '#15100a'
      })
      .setOrigin(0, 0.5);
    const badge = this.add
      .rectangle(padL, 4, Math.ceil(badgeText.width) + 12, 14, accent, 1)
      .setOrigin(0);

    const label = this.add
      .text(padL, 26, clue.label.toUpperCase(), {
        fontFamily: 'PressStart2P',
        fontSize: '7px',
        color: selected ? '#4a3414' : isScene ? '#ffdc73' : '#a9d0f5',
        wordWrap: { width: textW, useAdvancedWrap: true }
      })
      .setOrigin(0, 0);

    const body = this.add
      .text(padL, label.y + label.height + 7, clue.text, {
        fontFamily: 'SpecialElite',
        fontSize: '15px',
        color: selected ? '#21160c' : '#f1e2c0',
        wordWrap: { width: textW, useAdvancedWrap: true }
      })
      .setOrigin(0, 0);

    const cardH = Math.ceil(body.y + body.height + 12);

    const shadow = this.add.rectangle(3, 4, cardW, cardH, 0x000000, 0.4).setOrigin(0);

    const bg = this.add
      .rectangle(0, 0, cardW, cardH, selected ? THEME.paper : THEME.card, 1)
      .setOrigin(0)
      .setStrokeStyle(selected ? 3 : 2, selected ? 0xfff0b0 : THEME.cardEdge, 1)
      .setInteractive({ useHandCursor: true });

    const stripe = this.add.rectangle(0, 0, 6, cardH, accent, 1).setOrigin(0);
    const tape = this.add
      .rectangle(cardW / 2, -1, 34, 10, 0xe8dcae, 0.55)
      .setAngle(-3);

    bg.on('pointerover', () => {
      if (!selected) bg.setFillStyle(THEME.cardHover, 1);
    });
    bg.on('pointerout', () => {
      if (!selected) bg.setFillStyle(THEME.card, 1);
    });
    bg.on('pointerup', (pointer) => {
      if (this.modalOpen || this.dragMoved) return;
      if (!this.inRect(pointer, this.regions.clueList)) return;
      this.selectClue(clue.id);
    });

    container.add([shadow, bg, stripe, tape, badge, badgeText, label, body]);

    if (selected) {
      const glow = this.add
        .rectangle(cardW / 2, cardH / 2, cardW + 8, cardH + 8)
        .setStrokeStyle(2, 0xffdc73, 1);
      container.add(glow);
      this.trackTween({
        targets: glow,
        alpha: { from: 0.25, to: 1 },
        duration: 650,
        yoyo: true,
        repeat: -1
      });
    }

    return { container, height: cardH };
  },

  /* ------------------------------ SCROLLBARS ------------------------- */

  addScrollbar(key, { axis, start, fixed, trackLen, viewport, content, getScroll, getMin }) {
    const T = 6;
    const vertical = axis === 'v';
    const thumbLen = Math.max(
      20,
      Math.min(trackLen, Math.round((trackLen * viewport) / Math.max(content, 1)))
    );

    const track = this.add
      .rectangle(
        vertical ? fixed : start, vertical ? start : fixed,
        vertical ? T : trackLen, vertical ? trackLen : T,
        0x000000, 0.35
      )
      .setOrigin(0);
    const thumb = this.add
      .rectangle(
        vertical ? fixed : start, vertical ? start : fixed,
        vertical ? T : thumbLen, vertical ? thumbLen : T,
        THEME.gold, 0.75
      )
      .setOrigin(0);

    this.uiRoot.add([track, thumb]);
    (this.scrollbars ??= {})[key] = {
      thumb, vertical, start, fixed, trackLen, thumbLen, getScroll, getMin
    };
  },

  updateScrollbars() {
    Object.values(this.scrollbars || {}).forEach((bar) => {
      if (!bar?.thumb?.scene) return;
      const min = bar.getMin();
      const frac = min < 0 ? Phaser.Math.Clamp(bar.getScroll() / min, 0, 1) : 0;
      const pos = bar.start + (bar.trackLen - bar.thumbLen) * frac;
      if (bar.vertical) bar.thumb.setPosition(bar.fixed, pos);
      else bar.thumb.setPosition(pos, bar.fixed);
    });
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
        label: __dialogueText("suspectsBoard/GridDraw.mixin.js", "t_48d75061c0347ba9ed22"),
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
        label: __dialogueText("suspectsBoard/GridDraw.mixin.js", "t_ea1952e820670cb86750"),
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
    ignoreModal = false,
    onClick
  }) {
    const container = this.add.container(x, y);

    const shadow = this.add.rectangle(3, 4, width, height, 0x000000, 0.55);
    const background = this.add
      .rectangle(0, 0, width, height, fill, 1)
      .setStrokeStyle(2, 0x8b704b, 1)
      .setInteractive({ useHandCursor: true });
    const light = this.add.rectangle(0, -height / 2 + 4, width - 8, 2, 0xffffff, 0.12);
    const dark = this.add.rectangle(0, height / 2 - 4, width - 8, 2, 0x000000, 0.3);

    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'PressStart2P',
        fontSize: '8px',
        color: textColor,
        align: 'center',
        wordWrap: { width: width - 14, useAdvancedWrap: true }
      })
      .setOrigin(0.5);

    const rest = () => {
      container.setPosition(x, y);
      shadow.setVisible(true);
    };

    background.on('pointerover', () => {
      background.setFillStyle(hoverFill, 1);
      background.setStrokeStyle(2, COLORS.gold, 1);
    });
    background.on('pointerout', () => {
      background.setFillStyle(fill, 1);
      background.setStrokeStyle(2, 0x8b704b, 1);
      rest();
    });
    background.on('pointerdown', () => {
      if (this.modalOpen && !ignoreModal) return;
      container.setPosition(x + 1, y + 2);
      shadow.setVisible(false);
    });
    background.on('pointerup', () => {
      rest();
      if (this.modalOpen && !ignoreModal) return;
      onClick();
    });

    container.add([shadow, background, light, dark, text]);
    return container;
  },

  /* -------------------------------- MODAL ---------------------------- */

  showConfirmModal({ title, message, yesLabel, noLabel, onYes }) {
    const { width, height } = this.scale;
    this.modalOpen = true;

    const root = this.add.container(0, 0).setDepth(200);
    this.modalRoot = root;

    const blocker = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.78)
      .setOrigin(0)
      .setInteractive();

    const boxW = Math.min(580, width - 40);
    const boxH = 270;
    const boxX = width / 2 - boxW / 2;
    const boxY = height / 2 - boxH / 2;

    const titleText = this.add
      .text(width / 2, boxY + 34, title, {
        fontFamily: 'PressStart2P',
        fontSize: '11px',
        color: '#ff9d8f',
        align: 'center',
        wordWrap: { width: boxW - 40, useAdvancedWrap: true }
      })
      .setOrigin(0.5, 0);

    const msgText = this.add
      .text(width / 2, height / 2 - 8, message, {
        fontFamily: 'SpecialElite',
        fontSize: '16px',
        color: '#f1e2c0',
        align: 'center',
        wordWrap: { width: boxW - 50, useAdvancedWrap: true }
      })
      .setOrigin(0.5, 0.5);

    root.add([
      blocker,
      ...bevelBox(this, boxX, boxY, boxW, boxH, {
        fill: 0x1f1614, stroke: COLORS.noStroke, strokeW: 3
      }),
      tapeStrip(this, boxX + 3, boxY + 3, boxW - 6, 9, 12),
      titleText,
      msgText
    ]);

    const closeModal = () => {
      this.modalOpen = false;
      this.modalRoot?.destroy(true);
      this.modalRoot = null;
    };

    const bw = Math.floor((boxW - 60) / 2);
    const by = height / 2 + boxH / 2 - 44;

    root.add(
      this.createButton({
        x: width / 2 - boxW / 4,
        y: by,
        width: bw,
        height: 44,
        label: noLabel,
        fill: 0x24442a,
        hoverFill: 0x38673e,
        textColor: '#d6ffd5',
        ignoreModal: true,
        onClick: closeModal
      })
    );

    root.add(
      this.createButton({
        x: width / 2 + boxW / 4,
        y: by,
        width: bw,
        height: 44,
        label: yesLabel,
        fill: 0x632923,
        hoverFill: 0x823b31,
        textColor: '#ffe3dc',
        ignoreModal: true,
        onClick: () => {
          closeModal();
          onYes();
        }
      })
    );
  }
};