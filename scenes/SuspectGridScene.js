import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { CrimeLabManager } from './CSI/CrimeLabManager.js';
import { DEDUCTION_EVIDENCE_REGISTRY } from './CSI/DeductionEvidenceRegistry.js';
import { applyGridExclusions } from '../suspectsBoard/applyGridExclusions.js';

const DEFAULT_ROWS = [
  { id: 'shoeSizeCategory', label: 'SHOE SIZE' },
  { id: 'handedness', label: 'HANDEDNESS' },
  { id: 'hair_color', label: 'HAIR COLOR' },
  { id: 'bloodType', label: 'BLOOD TYPE' },
  { id: 'gender', label: 'DNA PROFILE' },
  { id: 'fingerprintPattern', label: 'FINGERPRINT' },
  { id: 'race', label: 'ANCESTRY' },
  { id: 'skills', label: 'CRIMINAL SKILLS' },
  { id: 'habitus', label: 'HABITS' },
  { id: 'alibi', label: 'ALIBI' },
  { id: 'motive', label: 'MOTIVE' }
];

const COLORS = {
  bg: 0x110d0e,
  band: 0x271d1f,
  gold: 0xd4af37,
  panel: 0x1c1514,
  panelStroke: 0x5d4932,
  cellA: 0x241a17,
  cellB: 0x1d1514,
  cellHover: 0x3b2b1c,
  cellFilled: 0x3a2e1a,
  line: 0x604b34,
  headerScene: 0x503719,
  headerSuspect: 0x32251b,
  okFill: 0x24422a,
  okStroke: 0x65a566,
  noFill: 0x632923,
  noStroke: 0xdf6559
};

const RULED_OUT_EVERYONE_REASON =
  'You ruled out every single suspect. With nobody left to investigate, the case went cold and the thief walked free.';

function prettify(value = '') {
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalize(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).join(', ');
  }
  if (value === undefined || value === null || value === '') {
    return '?';
  }
  return String(value);
}

function pickRandom(items = []) {
  if (!Array.isArray(items) || !items.length) {
    return '';
  }
  return items[Math.floor(Math.random() * items.length)];
}

function fillTemplate(template = '', params = {}) {
  return String(template).replace(
    /{(\w+)}/g,
    (_, key) => params[key] ?? '???'
  );
}

/**
 * Evidence Grid ma osobny status.
 * `markedUnlikely` to wyłącznie robocza decyzja gracza na tablicy,
 * NIE jest to `deductionState.eliminated`.
 */
function getGridMarkState(rawState = {}) {
  const currentState =
    rawState.markedUnlikelyBySuspectId ||
    rawState.ruledOutBySuspectId ||
    {};

  if (!currentState || typeof currentState !== 'object') {
    return {};
  }
  return { ...currentState };
}

export class SuspectGridScene extends BaseScene {
  constructor() {
    super('SuspectGridScene');

    this.gameState = gameState;
    this.cityId = null;
    this.returnScene = 'CrimeCityScene';
    this.returnData = {};

    this.labManager = null;
    this.suspects = [];
    this.rows = [];

    this.clueCards = [];
    this.selectedClueId = null;

    this.placedCluesByCell = {};
    this.markedUnlikelyBySuspectId = {};

    this.uiRoot = null;
    this.modalRoot = null;
    this.maskGraphics = [];
    this.feedbackText = null;
    this.feedbackMessage = '';

    this.regions = { body: null, clueList: null, header: null };
    this.bodyContainer = null;
    this.headerContainer = null;
    this.labelContainer = null;
    this.clueListContainer = null;
    this.layout = null;

    this.scrollX = 0;
    this.scrollY = 0;
    this.minScrollX = 0;
    this.minScrollY = 0;
    this.clueScrollY = 0;
    this.minClueScroll = 0;

    this.dragTarget = null;
    this.dragMoved = false;
    this.dragStart = { x: 0, y: 0, sx: 0, sy: 0, cy: 0 };

    this.modalOpen = false;
    this.resizeHandler = null;
  }

  getCaseSuspects() {
    const suspects =
      Array.isArray(this.gameState.caseSuspects) &&
      this.gameState.caseSuspects.length
        ? this.gameState.caseSuspects
        : Array.isArray(this.gameState.suspects) &&
            this.gameState.suspects.length
          ? this.gameState.suspects
          : Array.isArray(this.gameState.suspectList)
            ? this.gameState.suspectList
            : [];

    this.gameState.caseSuspects = suspects;
    this.gameState.suspects = suspects;
    this.gameState.suspectList = suspects;

    return suspects;
  }

  init(data = {}) {
    this.gameState = data.gameState || gameState;

    this.cityId =
      data.cityId ||
      this.gameState.currentMission?.city ||
      this.gameState.crimeCityId ||
      'unknown_city';

    this.returnScene =
      typeof data.returnScene === 'string' && data.returnScene.trim()
        ? data.returnScene.trim()
        : 'CrimeCityScene';

    this.returnData = {
      ...(data.returnData || {}),
      cityId: this.cityId,
      openPanel: data.returnData?.openPanel || 'alibi'
    };

    this.labManager = new CrimeLabManager(this.gameState, this.cityId);

    const allSuspects = this.getCaseSuspects();

    const requestedSuspectIds =
      data.suspectIds ||
      this.gameState.suspectGridInput?.suspectIds ||
      this.gameState.currentMission?.suspectIds ||
      allSuspects.map((suspect) => suspect.id);

    const validSuspectIds = new Set(
      Array.isArray(requestedSuspectIds) ? requestedSuspectIds : []
    );

    this.suspects = allSuspects.filter(
      (suspect) => suspect?.id && validSuspectIds.has(suspect.id)
    );

    const caseForensics = this.labManager.ensureCaseForensics();

    caseForensics.suspectGrid ??= {};
    caseForensics.suspectGrid.placedCluesByCell ??= {};

    this.placedCluesByCell = {
      ...caseForensics.suspectGrid.placedCluesByCell
    };

    this.markedUnlikelyBySuspectId = getGridMarkState(
      caseForensics.suspectGrid
    );

    this.clueCards = this.buildClueCards(caseForensics, data);
    this.rows = this.buildRows();
    this.selectedClueId = null;
    this.scrollX = 0;
    this.scrollY = 0;
    this.clueScrollY = 0;
    this.feedbackMessage = '';
    this.modalOpen = false;
  }

  buildClueCards(caseForensics, data) {
    const explicitCards =
      data.gridClues ||
      this.gameState.suspectGridInput?.gridClues ||
      this.gameState.currentMission?.gridClues ||
      [];

    const normalizedExplicitCards = Array.isArray(explicitCards)
      ? explicitCards
          .map((clue, index) => this.normalizeExplicitClue(clue, index))
          .filter(Boolean)
      : [];

    const automaticCrimeSceneCards =
      this.buildCrimeSceneEvidenceCards(caseForensics);

    const uniqueCards = new Map();

    [...normalizedExplicitCards, ...automaticCrimeSceneCards].forEach(
      (card) => {
        if (!card?.id || uniqueCards.has(card.id)) {
          return;
        }
        uniqueCards.set(card.id, card);
      }
    );

    return [...uniqueCards.values()];
  }

  normalizeExplicitClue(clue, index) {
    if (!clue?.field) {
      return null;
    }

    const type =
      clue.type === 'crime_scene_fact' ||
      clue.type === 'crime_scene_evidence'
        ? 'crime_scene_fact'
        : 'suspect_fact';

    const suspectId =
      clue.suspectId ||
      clue.targetSuspectId ||
      clue.subjectSuspectId ||
      null;

    if (type === 'suspect_fact' && !suspectId) {
      console.warn('[SuspectGridScene] suspect_fact needs suspectId:', clue);
      return null;
    }

    const suspect = this.suspects.find((item) => item.id === suspectId);
    const value = normalize(clue.value);

    return {
      id: clue.id || `grid_clue_${index}_${clue.field}`,
      type,
      suspectId,
      field: clue.field,
      value,
      label: clue.label || prettify(clue.field),
      text:
        clue.text ||
        clue.description ||
        (type === 'crime_scene_fact'
          ? `Crime scene result: ${prettify(clue.field)} is ${value}.`
          : `${suspect?.name || 'This suspect'}: ${prettify(
              clue.field
            )} is ${value}.`)
    };
  }

  buildCrimeSceneEvidenceCards(caseForensics) {
    const cards = [];
    const alreadyAdded = new Set();

    const rawHardEvidence =
      this.gameState.currentMission?.forensicHardEvidence ||
      this.gameState.hardEvidence ||
      [];

    rawHardEvidence.forEach((evidence, index) => {
      const field = evidence.field || evidence.forensicField;

      if (!field || alreadyAdded.has(field)) {
        return;
      }

      const entry = DEDUCTION_EVIDENCE_REGISTRY[field];
      const rawValue = evidence.value ?? evidence.normalizedValue;

      const value = entry?.normalizeEvidence
        ? entry.normalizeEvidence(rawValue)
        : rawValue;

      if (value === undefined || value === null || value === '') {
        return;
      }

      alreadyAdded.add(field);

      const template = pickRandom(entry?.clueTemplates);

      const text = template
        ? fillTemplate(template, { value: normalize(value) })
        : `Crime scene result: ${prettify(field)} is ${normalize(value)}.`;

      cards.push({
        id: `crime_scene_hard_${field}_${index}`,
        type: 'crime_scene_fact',
        field,
        value: normalize(value),
        label: prettify(field),
        text
      });
    });

    const traceResults = [
      caseForensics.identityEvidenceResult,
      ...(caseForensics.traceEvidenceResults || [])
    ].filter(Boolean);

    traceResults.forEach((result, index) => {
      const field = result.evidenceType;

      if (!field || alreadyAdded.has(field)) {
        return;
      }

      const entry = DEDUCTION_EVIDENCE_REGISTRY[field];
      const rawValue = result.value;

      if (rawValue === undefined || rawValue === null || rawValue === '') {
        return;
      }

      alreadyAdded.add(field);

      const template = pickRandom(entry?.clueTemplates);

      const text = template
        ? fillTemplate(template, { value: normalize(rawValue) })
        : `Lab result: ${prettify(field)} is ${normalize(rawValue)}.`;

      cards.push({
        id: `crime_scene_trace_${field}_${index}`,
        type: 'crime_scene_fact',
        field,
        value: normalize(rawValue),
        label: prettify(field),
        text
      });
    });

    return cards;
  }

  buildRows() {
    const fieldsInCards = new Set(
      this.clueCards.map((clue) => clue.field).filter(Boolean)
    );

    const defaultRows = DEFAULT_ROWS.filter((row) =>
      fieldsInCards.has(row.id)
    );

    const extraRows = [...fieldsInCards]
      .filter((field) => !DEFAULT_ROWS.some((row) => row.id === field))
      .map((field) => ({ id: field, label: prettify(field).toUpperCase() }));

    const rows = [...defaultRows, ...extraRows];

    return rows.length
      ? rows
      : [
          { id: 'shoeSizeCategory', label: 'SHOE SIZE' },
          { id: 'handedness', label: 'HANDEDNESS' },
          { id: 'bloodType', label: 'BLOOD TYPE' }
        ];
  }

  /* ------------------------------------------------------------------ */
  /* CREATE / UI                                                         */
  /* ------------------------------------------------------------------ */

  create() {
    super.create();

    this.scene.stop('NewsHud');
    this.scene.stop('UIScene');
    this.scene.stop('MenuScene');

    this.cameras.main.setBackgroundColor('#110d0e');

    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.input.on('wheel', this.handleWheel, this);

    this.buildUI();

    this.resizeHandler = () => {
      if (this.sys.isActive()) {
        this.buildUI();
      }
    };

    this.scale.on('resize', this.resizeHandler, this);

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanupScene,
      this
    );
  }

  refreshAll() {
    this.buildUI();
  }

  rebuildScene() {
    this.buildUI();
  }

  computeLayout() {
    const { width, height } = this.scale;
    const narrow = width < 900;

    const top = 96;
    const bottom = 62;
    const sidebarW = narrow ? 230 : Math.min(340, Math.floor(width * 0.28));
    const areaH = height - top - bottom - 10;

    const sidebar = { x: 12, y: top, w: sidebarW, h: areaH };
    const grid = {
      x: sidebar.x + sidebarW + 12,
      y: top,
      w: width - (sidebar.x + sidebarW + 12) - 12,
      h: areaH
    };

    const labelW = narrow ? 112 : 142;
    const headerH = 84;
    const rowH = 50;
    const sceneW = narrow ? 104 : 120;
    const suspectW = narrow ? 128 : 150;

    return {
      width,
      height,
      sidebar,
      grid,
      labelW,
      headerH,
      rowH,
      sceneW,
      suspectW
    };
  }

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
    this.labelContainer = null;
    this.clueListContainer = null;
    this.feedbackText = null;
  }

  makeMask(x, y, w, h) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillRect(x, y, w, h);
    this.maskGraphics.push(g);
    return g.createGeometryMask();
  }

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
  }

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
  }

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
        'Pick a clue card, then click its cell. Click a placed clue to take it back.',
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
        `CLUES ${placedCount}/${this.clueCards.length}   ·   POSSIBLE ${possibleCount}   ·   UNLIKELY ${unlikelyCount}`,
        {
          fontFamily: 'PressStart2P',
          fontSize: '8px',
          color: '#ffdc73'
        }
      )
      .setOrigin(0.5, 0);

    this.uiRoot.add([title, sub, stats]);
  }

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
          fontSize: '14px',
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
  }

  createClueCard(clue, cardW, y) {
    const selected = clue.id === this.selectedClueId;
    const isScene = clue.type === 'crime_scene_fact';
    const accent = isScene ? 0xd4af37 : 0x6fa8dc;

    const container = this.add.container(0, y);

    const tag = this.add
      .text(
        14,
        8,
        `${isScene ? 'CRIME SCENE' : 'SUSPECT'} · ${clue.label.toUpperCase()}`,
        {
          fontFamily: 'PressStart2P',
          fontSize: '6px',
          color: selected ? '#18110b' : isScene ? '#ffdc73' : '#a9d0f5',
          wordWrap: { width: cardW - 24, useAdvancedWrap: true }
        }
      )
      .setOrigin(0, 0);

    const body = this.add
      .text(14, tag.y + tag.height + 6, clue.text, {
        fontFamily: 'SpecialElite',
        fontSize: '13px',
        color: selected ? '#21160c' : '#f1e2c0',
        wordWrap: { width: cardW - 24, useAdvancedWrap: true }
      })
      .setOrigin(0, 0);

    const cardH = Math.ceil(body.y + body.height + 10);

    const bg = this.add
      .rectangle(cardW / 2, cardH / 2, cardW, cardH, selected ? 0xe3c26a : 0x302217, 1)
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
  }

  /* -------------------------------- GRID ----------------------------- */

  drawGrid(L) {
    const g = L.grid;
    const { labelW, headerH, rowH, sceneW, suspectW } = L;

    this.uiRoot.add(
      this.add
        .rectangle(g.x + g.w / 2, g.y + g.h / 2, g.w, g.h, 0x171112, 1)
        .setStrokeStyle(2, 0x725d40, 1)
    );

    const bodyX = g.x + labelW;
    const bodyY = g.y + headerH;
    const bodyW = g.w - labelW;
    const bodyH = g.h - headerH;

    const contentW = sceneW + this.suspects.length * suspectW;
    const contentH = this.rows.length * rowH;

    this.minScrollX = Math.min(0, bodyW - contentW);
    this.minScrollY = Math.min(0, bodyH - contentH);
    this.scrollX = Phaser.Math.Clamp(this.scrollX, this.minScrollX, 0);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, this.minScrollY, 0);

    this.regions.body = { x: bodyX, y: bodyY, w: bodyW, h: bodyH };
    this.regions.header = { x: bodyX, y: g.y, w: bodyW, h: headerH };
    this.gridOrigin = { bodyX, bodyY, headerY: g.y, labelX: g.x };

    this.bodyContainer = this.add.container(bodyX, bodyY);
    this.headerContainer = this.add.container(bodyX, g.y);
    this.labelContainer = this.add.container(g.x, bodyY);

    this.bodyContainer.setMask(this.makeMask(bodyX, bodyY, bodyW, bodyH));
    this.headerContainer.setMask(this.makeMask(bodyX, g.y, bodyW, headerH));
    this.labelContainer.setMask(this.makeMask(g.x, bodyY, labelW, bodyH));

    this.uiRoot.add([
      this.bodyContainer,
      this.headerContainer,
      this.labelContainer
    ]);

    const corner = this.add
      .rectangle(g.x + labelW / 2, g.y + headerH / 2, labelW, headerH, 0x38291d, 1)
      .setStrokeStyle(1, 0x8b704b, 1);

    const cornerText = this.add
      .text(g.x + labelW / 2, g.y + headerH / 2, 'EVIDENCE', {
        fontFamily: 'PressStart2P',
        fontSize: '8px',
        color: '#ffdc73'
      })
      .setOrigin(0.5);

    this.uiRoot.add([corner, cornerText]);

    this.rows.forEach((row, index) => {
      const y = index * rowH;

      const bg = this.add
        .rectangle(labelW / 2, y + rowH / 2, labelW, rowH, index % 2 ? 0x211816 : 0x281d18, 1)
        .setStrokeStyle(1, COLORS.line, 1);

      const text = this.add
        .text(10, y + rowH / 2, row.label, {
          fontFamily: 'PressStart2P',
          fontSize: '7px',
          color: '#dfc893',
          wordWrap: { width: labelW - 16, useAdvancedWrap: true }
        })
        .setOrigin(0, 0.5);

      this.labelContainer.add([bg, text]);
    });

    const columns = [
      { id: 'crime_scene', type: 'crime_scene', name: 'CRIME SCENE', width: sceneW },
      ...this.suspects.map((suspect) => ({
        id: suspect.id,
        type: 'suspect',
        name: suspect.name || 'Unknown',
        width: suspectW
      }))
    ];

    let offsetX = 0;

    columns.forEach((column) => {
      const cx = offsetX + column.width / 2;
      this.drawColumnHeader(column, cx, headerH);

      this.rows.forEach((row, rowIndex) => {
        this.createEvidenceCell({
          x: cx,
          y: rowIndex * rowH + rowH / 2,
          width: column.width,
          height: rowH,
          row,
          column,
          alternate: rowIndex % 2 === 1
        });
      });

      offsetX += column.width;
    });

    if (this.minScrollX < 0 || this.minScrollY < 0) {
      this.uiRoot.add(
        this.add
          .text(g.x + g.w - 8, g.y + g.h - 12, 'DRAG OR SCROLL TABLE', {
            fontFamily: 'PressStart2P',
            fontSize: '6px',
            color: '#aa9263'
          })
          .setOrigin(1, 0.5)
          .setDepth(5)
      );
    }
  }

  drawColumnHeader(column, cx, headerH) {
    const isScene = column.type === 'crime_scene';
    const unlikely =
      !isScene && this.markedUnlikelyBySuspectId[column.id] === true;

    const bg = this.add
      .rectangle(
        cx,
        headerH / 2,
        column.width,
        headerH,
        isScene ? COLORS.headerScene : unlikely ? 0x3a1b18 : COLORS.headerSuspect,
        1
      )
      .setStrokeStyle(1, 0x8b704b, 1);

    const name = this.add
      .text(cx, isScene ? headerH / 2 : 8, column.name, {
        fontFamily: 'SpecialElite',
        fontSize: isScene ? '15px' : '14px',
        color: unlikely ? '#a38b85' : '#fff0cb',
        align: 'center',
        wordWrap: { width: column.width - 12, useAdvancedWrap: true }
      })
      .setOrigin(0.5, isScene ? 0.5 : 0);

    this.headerContainer.add([bg, name]);

    if (isScene) return;

    const btnW = column.width - 20;
    const btnH = 24;
    const btnY = headerH - btnH / 2 - 8;

    const btn = this.add
      .rectangle(cx, btnY, btnW, btnH, unlikely ? COLORS.noFill : COLORS.okFill, 1)
      .setStrokeStyle(2, unlikely ? COLORS.noStroke : COLORS.okStroke, 1)
      .setInteractive({ useHandCursor: true });

    const label = this.add
      .text(cx, btnY, unlikely ? 'UNLIKELY' : 'POSSIBLE', {
        fontFamily: 'PressStart2P',
        fontSize: '7px',
        color: unlikely ? '#ffd1c8' : '#d5ffd2'
      })
      .setOrigin(0.5);

    btn.on('pointerover', () => {
      btn.setFillStyle(unlikely ? 0x823b31 : 0x35613a, 1);
    });
    btn.on('pointerout', () => {
      btn.setFillStyle(unlikely ? COLORS.noFill : COLORS.okFill, 1);
    });
    btn.on('pointerup', (pointer) => {
      if (this.modalOpen || this.dragMoved) return;
      if (!this.inRect(pointer, this.regions.header)) return;
      this.toggleSuspectMark(column.id);
    });

    this.headerContainer.add([btn, label]);
  }

  createEvidenceCell({ x, y, width, height, row, column, alternate }) {
    const target = {
      type: column.type === 'crime_scene' ? 'crime_scene' : 'suspect',
      suspectId: column.type === 'suspect' ? column.id : null,
      field: row.id
    };

    const key = this.getCellKey(target);
    const placedClueId = this.placedCluesByCell[key];
    const placedClue = this.clueCards.find((c) => c.id === placedClueId);

    const unlikely =
      column.type === 'suspect' &&
      this.markedUnlikelyBySuspectId[column.id] === true;

    const baseFill = placedClue
      ? COLORS.cellFilled
      : alternate
        ? COLORS.cellB
        : COLORS.cellA;

    const waiting = Boolean(this.selectedClueId) && !placedClue;

    const bg = this.add
      .rectangle(x, y, width, height, baseFill, 1)
      .setStrokeStyle(
        waiting ? 2 : 1,
        waiting ? 0xb28d44 : COLORS.line,
        waiting ? 0.85 : 1
      )
      .setInteractive({ useHandCursor: true });

    const text = this.add
      .text(x, y, placedClue ? normalize(placedClue.value).toUpperCase() : '?', {
        fontFamily: placedClue ? 'SpecialElite' : 'PressStart2P',
        fontSize: placedClue ? '15px' : '10px',
        color: placedClue ? '#f6dfa3' : '#756351',
        align: 'center',
        wordWrap: { width: width - 12, useAdvancedWrap: true }
      })
      .setOrigin(0.5);

    if (unlikely) {
      bg.setAlpha(0.45);
      text.setAlpha(0.45);
    }

    bg.on('pointerover', () => {
      if (this.modalOpen) return;
      bg.setFillStyle(placedClue ? 0x4d3a20 : COLORS.cellHover, 1);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(baseFill, 1);
    });
    bg.on('pointerup', (pointer) => {
      if (this.modalOpen || this.dragMoved) return;
      if (!this.inRect(pointer, this.regions.body)) return;
      this.onCellClick(target, placedClue);
    });

    this.bodyContainer.add([bg, text]);
  }

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
  }

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
  }

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

  /* ------------------------------ INTERACTION ------------------------ */

  inRect(pointer, rect) {
    if (!rect || !pointer) return false;
    return (
      pointer.x >= rect.x &&
      pointer.x <= rect.x + rect.w &&
      pointer.y >= rect.y &&
      pointer.y <= rect.y + rect.h
    );
  }

  applyScroll() {
    if (!this.gridOrigin) return;

    const { bodyX, bodyY, headerY, labelX } = this.gridOrigin;

    this.bodyContainer?.setPosition(bodyX + this.scrollX, bodyY + this.scrollY);
    this.headerContainer?.setPosition(bodyX + this.scrollX, headerY);
    this.labelContainer?.setPosition(labelX, bodyY + this.scrollY);

    if (this.clueListContainer && this.regions.clueList) {
      this.clueListContainer.setPosition(
        this.regions.clueList.x,
        this.regions.clueList.y + this.clueScrollY
      );
    }
  }

  handlePointerDown(pointer) {
    this.dragMoved = false;
    this.dragTarget = null;

    if (this.modalOpen) return;

    if (
      this.inRect(pointer, this.regions.body) ||
      this.inRect(pointer, this.regions.header)
    ) {
      this.dragTarget = 'grid';
    } else if (this.inRect(pointer, this.regions.clueList)) {
      this.dragTarget = 'clues';
    }

    this.dragStart = {
      x: pointer.x,
      y: pointer.y,
      sx: this.scrollX,
      sy: this.scrollY,
      cy: this.clueScrollY
    };
  }

  handlePointerMove(pointer) {
    if (!this.dragTarget || !pointer.isDown) return;

    const dx = pointer.x - this.dragStart.x;
    const dy = pointer.y - this.dragStart.y;

    if (!this.dragMoved && Math.hypot(dx, dy) > 8) {
      this.dragMoved = true;
    }

    if (!this.dragMoved) return;

    if (this.dragTarget === 'grid') {
      this.scrollX = Phaser.Math.Clamp(this.dragStart.sx + dx, this.minScrollX, 0);
      this.scrollY = Phaser.Math.Clamp(this.dragStart.sy + dy, this.minScrollY, 0);
    } else {
      this.clueScrollY = Phaser.Math.Clamp(
        this.dragStart.cy + dy,
        this.minClueScroll,
        0
      );
    }

    this.applyScroll();
  }

  handlePointerUp() {
    this.dragTarget = null;
  }

  handleWheel(pointer, _objects, deltaX, deltaY) {
    if (this.modalOpen) return;

    if (this.inRect(pointer, this.regions.clueList)) {
      this.clueScrollY = Phaser.Math.Clamp(
        this.clueScrollY - deltaY,
        this.minClueScroll,
        0
      );
      this.applyScroll();
      return;
    }

    if (
      this.inRect(pointer, this.regions.body) ||
      this.inRect(pointer, this.regions.header)
    ) {
      const horizontal =
        pointer.event?.shiftKey || Math.abs(deltaX) > Math.abs(deltaY);
      const amount = horizontal && Math.abs(deltaX) > 0 ? deltaX : deltaY;

      if (horizontal) {
        this.scrollX = Phaser.Math.Clamp(this.scrollX - amount, this.minScrollX, 0);
      } else if (this.minScrollY < 0) {
        this.scrollY = Phaser.Math.Clamp(this.scrollY - amount, this.minScrollY, 0);
      } else {
        this.scrollX = Phaser.Math.Clamp(this.scrollX - amount, this.minScrollX, 0);
      }

      this.applyScroll();
    }
  }

  /* ------------------------------- LOGIC ----------------------------- */

  getPlacedClueIds() {
    return new Set(Object.values(this.placedCluesByCell));
  }

  getUnplacedClues() {
    const placed = this.getPlacedClueIds();
    return this.clueCards.filter((clue) => !placed.has(clue.id));
  }

  getCellKey(target) {
    const subject =
      target.type === 'crime_scene' ? 'crime_scene' : target.suspectId;
    return `${subject}:${target.field}`;
  }

  setFeedback(message) {
    this.feedbackMessage = message || '';
    this.feedbackText?.setText(this.feedbackMessage);
  }

  selectClue(clueId) {
    this.selectedClueId = this.selectedClueId === clueId ? null : clueId;

    this.setFeedback(
      this.selectedClueId ? 'Now click the matching cell in the grid.' : ''
    );

    this.refreshAll();
  }

  onCellClick(target, placedClue) {
    if (placedClue && !this.selectedClueId) {
      this.removePlacedClue(target, placedClue);
      return;
    }

    this.placeSelectedClue(target);
  }

  removePlacedClue(target, clue) {
    const key = this.getCellKey(target);
    delete this.placedCluesByCell[key];
    this.saveGridProgress();
    this.setFeedback(`${clue.label} taken back from the grid.`);
    this.refreshAll();
  }

  placeSelectedClue(target) {
    const clue = this.clueCards.find((item) => item.id === this.selectedClueId);

    if (!clue) {
      this.setFeedback('Choose a clue card first.');
      return;
    }

    const isCorrectCrimeSceneCell =
      clue.type === 'crime_scene_fact' &&
      target.type === 'crime_scene' &&
      target.field === clue.field;

    const isCorrectSuspectCell =
      clue.type === 'suspect_fact' &&
      target.type === 'suspect' &&
      target.suspectId === clue.suspectId &&
      target.field === clue.field;

    if (!isCorrectCrimeSceneCell && !isCorrectSuspectCell) {
      this.setFeedback('That clue does not belong in this cell.');
      return;
    }

    const key = this.getCellKey(target);

    if (this.placedCluesByCell[key]) {
      this.setFeedback('This cell already has a clue. Click it to take it back.');
      return;
    }

    this.placedCluesByCell[key] = clue.id;
    this.selectedClueId = null;

    this.saveGridProgress();
    this.setFeedback(`${clue.label}: ${normalize(clue.value)} added to the grid.`);
    this.refreshAll();
  }

  toggleSuspectMark(suspectId) {
    this.markedUnlikelyBySuspectId[suspectId] =
      !this.markedUnlikelyBySuspectId[suspectId];

    this.saveGridProgress();
    this.refreshAll();
  }

  saveGridProgress() {
    const caseForensics = this.labManager.ensureCaseForensics();

    caseForensics.suspectGrid ??= {};
    caseForensics.suspectGrid.placedCluesByCell = {
      ...this.placedCluesByCell
    };

    /**
     * Wyłącznie robocze oznaczenia gracza.
     * Nie zapisujemy tego jako eliminatedSuspectIds.
     */
    caseForensics.suspectGrid.markedUnlikelyBySuspectId = {
      ...this.markedUnlikelyBySuspectId
    };

    delete caseForensics.suspectGrid.eliminatedSuspectIds;

    saveGameState();
  }

  finalizeGrid() {
    const remainingSuspects = this.suspects.filter(
      (suspect) => !this.markedUnlikelyBySuspectId[suspect.id]
    );

    if (remainingSuspects.length === 0) {
      this.showConfirmModal({
        title: 'RULE OUT EVERYONE?',
        message:
          'You marked every single suspect as unlikely. If you confirm, the case is closed and you lose. Are you sure, detective?',
        yesLabel: 'YES, CLOSE THE CASE',
        noLabel: 'LET ME RECHECK',
        onYes: () => this.failCaseRuledOutEveryone()
      });
      return;
    }

    this.commitGrid(remainingSuspects);
  }

  failCaseRuledOutEveryone() {
    const caseForensics = this.labManager.ensureCaseForensics();

    caseForensics.suspectGrid ??= {};
    caseForensics.suspectGrid.completed = true;
    caseForensics.suspectGrid.completedAt = Date.now();
    caseForensics.suspectGrid.ruledOutEveryone = true;
    caseForensics.suspectGrid.alibiCandidateSuspectIds = [];

    delete caseForensics.suspectGrid.remainingSuspectIds;
    delete caseForensics.suspectGrid.eliminatedSuspectIds;

    this.gameState.caseFailed = true;
    this.gameState.caseResolved = false;
    this.gameState.isGameActive = false;
    this.gameState.gameOverReason = RULED_OUT_EVERYONE_REASON;

    saveGameState();

    this.goto('GameOverScene', {
      title: 'THE CASE WENT COLD',
      message: RULED_OUT_EVERYONE_REASON
    });
  }

  commitGrid(remainingSuspects) {
    const caseForensics = this.labManager.ensureCaseForensics();

    caseForensics.suspectGrid ??= {};
    caseForensics.suspectGrid.completed = true;
    caseForensics.suspectGrid.completedAt = Date.now();
    caseForensics.suspectGrid.ruledOutEveryone = false;

    caseForensics.suspectGrid.alibiCandidateSuspectIds =
      remainingSuspects.map((suspect) => suspect.id);

    delete caseForensics.suspectGrid.remainingSuspectIds;
    delete caseForensics.suspectGrid.eliminatedSuspectIds;

    applyGridExclusions({
      gameState: this.gameState,
      cityId: this.cityId,
      suspectIds: this.suspects.map((suspect) => suspect.id),
      unlikelyById: this.markedUnlikelyBySuspectId
    });

    this.gameState.alibiInvestigation = {
      cityId: this.cityId,
      suspectIds: remainingSuspects.map((suspect) => suspect.id),
      unlocked: true
    };

    saveGameState();

    this.setFeedback(
      `${remainingSuspects.length} suspects remain. Their alibis are now available in Crime City.`
    );

    this.time.delayedCall(900, () => {
      this.closeScene();
    });
  }

  closeScene() {
    saveGameState();

    if (
      this.returnScene &&
      this.returnScene !== this.scene.key &&
      this.scene.manager.keys[this.returnScene]
    ) {
      this.goto(this.returnScene, {
        ...this.returnData,
        cityId: this.cityId,
        evidenceGridClosed: true
      });
      return;
    }

    this.scene.stop();
  }

  cleanupScene() {
    if (this.resizeHandler) {
      this.scale.off('resize', this.resizeHandler, this);
    }

    this.input.off('pointerdown', this.handlePointerDown, this);
    this.input.off('pointermove', this.handlePointerMove, this);
    this.input.off('pointerup', this.handlePointerUp, this);
    this.input.off('wheel', this.handleWheel, this);

    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);

    this.resizeHandler = null;
    this.dragTarget = null;
    this.modalOpen = false;

    this.clearUI();
  }
}