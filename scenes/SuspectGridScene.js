import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { CrimeLabManager } from './CSI/CrimeLabManager.js';
import { DEDUCTION_EVIDENCE_REGISTRY } from './CSI/DeductionEvidenceRegistry.js';
import { applyGridExclusions } from '../suspectsBoard/applyGridExclusions.js';

const FIELD_DEFS = [
  { id: 'hair_color', aliases: ['hair', 'hairColor'], label: 'HAIR COLOR' },
  { id: 'blood_type', aliases: ['bloodType'], label: 'BLOOD TYPE' },
  {
    id: 'biological_sex',
    aliases: ['gender', 'sex', 'biologicalSex'],
    label: 'DNA PROFILE'
  },
  {
    id: 'fingerprint_pattern',
    aliases: ['fingerprintPattern'],
    label: 'FINGERPRINT'
  },
  {
    id: 'shoe_size_category',
    aliases: ['shoeSizeCategory'],
    label: 'SHOE SIZE'
  },
  { id: 'handedness', aliases: ['dominantHand'], label: 'DOMINANT HAND' },
  { id: 'eye_color', aliases: ['eyes', 'eyeColor'], label: 'EYE COLOR' },
  { id: 'race', aliases: ['ancestry'], label: 'ANCESTRY' },
  { id: 'skills', aliases: [], label: 'CRIMINAL SKILLS' },
  { id: 'habitus', aliases: [], label: 'HABITS' },
  { id: 'alibi', aliases: [], label: 'ALIBI' },
  { id: 'motive', aliases: [], label: 'MOTIVE' }
];

const FIELD_BY_ALIAS = new Map();

FIELD_DEFS.forEach((definition) => {
  [definition.id, ...definition.aliases].forEach((alias) => {
    FIELD_BY_ALIAS.set(alias, definition);
  });
});

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
  cellAuto: 0x2b2a1b,
  cellWaiting: 0x5a4518,
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

function normalizeFieldKey(field = '') {
  const raw = String(field || '').trim();
  return FIELD_BY_ALIAS.get(raw)?.id || raw;
}

function getFieldLabel(field = '') {
  return (
    FIELD_BY_ALIAS.get(field)?.label || prettify(field).toUpperCase()
  );
}

function getFieldOrder(field = '') {
  const index = FIELD_DEFS.findIndex((definition) => definition.id === field);
  return index === -1 ? 999 : index;
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

function formatCellValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => formatCellValue(item))
      .filter(Boolean)
      .join(', ');
  }

  if (value === undefined || value === null || value === '') {
    return '';
  }

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^blond$/, 'blonde')
    .toUpperCase();
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
    this.revealedFields = new Set();
    this.selectedClueId = null;

    this.placedCluesByCell = {};
    this.markedUnlikelyBySuspectId = {};

    this.uiRoot = null;
    this.modalRoot = null;
    this.maskGraphics = [];
    this.feedbackText = null;
    this.feedbackMessage = '';

    this.regions = {
      body: null,
      scene: null,
      header: null,
      names: null,
      clueList: null
    };

    this.bodyContainer = null;
    this.headerContainer = null;
    this.sceneContainer = null;
    this.nameContainer = null;
    this.clueListContainer = null;
    this.layout = null;
    this.gridOrigin = null;

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

  /* ------------------------------------------------------------------ */
  /* DANE PODEJRZANYCH                                                   */
  /* ------------------------------------------------------------------ */

  getSuspectDisplayName(suspect) {
    return (
      suspect?.publicProfile?.displayName || suspect?.name || 'Unknown'
    );
  }

  getSuspectOccupation(suspect) {
    return suspect?.publicProfile?.occupation || suspect?.occupation || '';
  }

  getSuspectFieldValue(suspect, field) {
    const attributes = suspect?.restrictedProfile?.forensicAttributes;

    if (!attributes || typeof attributes !== 'object') {
      return null;
    }

    const definition = FIELD_BY_ALIAS.get(field);
    const keys = definition ? [definition.id, ...definition.aliases] : [field];

    for (const key of keys) {
      const entry = attributes[key];
      const value = entry?.value ?? entry ?? null;

      if (value === null || value === undefined || value === '') {
        continue;
      }

      if (typeof value === 'object' && !Array.isArray(value)) {
        continue;
      }

      return value;
    }

    return null;
  }

  getSuspectUnlockedFields(suspect) {
    const fields = new Set();

    (suspect?.restrictedProfile?.unlockedFields || []).forEach((field) => {
      const key =
        typeof field === 'string'
          ? field
          : field?.field || field?.id || field?.key || '';

      if (key) {
        fields.add(normalizeFieldKey(key));
      }
    });

    const attributes = suspect?.restrictedProfile?.forensicAttributes || {};

    Object.entries(attributes).forEach(([key, entry]) => {
      if (entry?.unlocked === true) {
        fields.add(normalizeFieldKey(key));
      }
    });

    return fields;
  }

  /**
   * Wartość podejrzanego wpisuje się sama, gdy:
   * - laboratorium dało wynik dla tej cechy (jest karta z miejsca zbrodni), albo
   * - cecha została odblokowana w aktach podejrzanego.
   * Tak samo działa FILE DATA na kartach w Boardzie.
   */
  getAutoSuspectValue(suspect, field) {
    const revealed =
      this.revealedFields.has(field) ||
      this.getSuspectUnlockedFields(suspect).has(field);

    if (!revealed) {
      return null;
    }

    const value = this.getSuspectFieldValue(suspect, field);
    const formatted = formatCellValue(value);

    return formatted || null;
  }

  /* ------------------------------------------------------------------ */
  /* KARTY ZE WSKAZÓWKAMI                                                */
  /* ------------------------------------------------------------------ */

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

    const merged = [...uniqueCards.values()];

    this.revealedFields = new Set(
      merged
        .filter((card) => card.type === 'crime_scene_fact')
        .map((card) => card.field)
    );

    return merged.filter((card) => {
      if (card.type !== 'suspect_fact') {
        return true;
      }

      const suspect = this.suspects.find(
        (item) => item.id === card.suspectId
      );

      return !suspect || this.getAutoSuspectValue(suspect, card.field) === null;
    });
  }

  normalizeExplicitClue(clue, index) {
    if (!clue?.field) {
      return null;
    }

    const field = normalizeFieldKey(clue.field);

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
      id: clue.id || `grid_clue_${index}_${field}`,
      type,
      suspectId,
      field,
      value,
      label: clue.label || getFieldLabel(field),
      text:
        clue.text ||
        clue.description ||
        (type === 'crime_scene_fact'
          ? `Crime scene result: ${getFieldLabel(field)} is ${value}.`
          : `${this.getSuspectDisplayName(suspect)}: ${getFieldLabel(
              field
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
      const rawField = evidence.field || evidence.forensicField;
      const field = normalizeFieldKey(rawField);

      if (!field || alreadyAdded.has(field)) {
        return;
      }

      const entry =
        DEDUCTION_EVIDENCE_REGISTRY[rawField] ||
        DEDUCTION_EVIDENCE_REGISTRY[field];
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
        : `Crime scene result: ${getFieldLabel(field)} is ${normalize(
            value
          )}.`;

      cards.push({
        id: `crime_scene_hard_${rawField}_${index}`,
        type: 'crime_scene_fact',
        field,
        value: normalize(value),
        label: getFieldLabel(field),
        text
      });
    });

    const traceResults = [
      caseForensics.identityEvidenceResult,
      ...(caseForensics.traceEvidenceResults || [])
    ].filter(Boolean);

    traceResults.forEach((result, index) => {
      const rawField = result.evidenceType;
      const field = normalizeFieldKey(rawField);

      if (!field || alreadyAdded.has(field)) {
        return;
      }

      const entry =
        DEDUCTION_EVIDENCE_REGISTRY[rawField] ||
        DEDUCTION_EVIDENCE_REGISTRY[field];
      const rawValue = result.value;

      if (rawValue === undefined || rawValue === null || rawValue === '') {
        return;
      }

      alreadyAdded.add(field);

      const template = pickRandom(entry?.clueTemplates);

      const text = template
        ? fillTemplate(template, { value: normalize(rawValue) })
        : `Lab result: ${getFieldLabel(field)} is ${normalize(rawValue)}.`;

      cards.push({
        id: `crime_scene_trace_${rawField}_${index}`,
        type: 'crime_scene_fact',
        field,
        value: normalize(rawValue),
        label: getFieldLabel(field),
        text
      });
    });

    return cards;
  }

  /**
   * Kolumny tabeli = cechy, dla których jest jakakolwiek karta.
   */
  buildRows() {
    const fields = new Set(
      this.clueCards.map((clue) => clue.field).filter(Boolean)
    );

    const rows = [...fields]
      .sort((a, b) => getFieldOrder(a) - getFieldOrder(b))
      .map((field) => ({ id: field, label: getFieldLabel(field) }));

    return rows.length
      ? rows
      : [
          { id: 'shoe_size_category', label: 'SHOE SIZE' },
          { id: 'handedness', label: 'DOMINANT HAND' },
          { id: 'blood_type', label: 'BLOOD TYPE' }
        ];
  }

  /* ------------------------------------------------------------------ */
  /* CREATE / UI                                                         */
  /* ------------------------------------------------------------------ */

  hideOverlayHuds() {
    const keys = this.scene.manager.keys;
    const newsHud = keys.NewsHud;

    if (newsHud?.events) {
      newsHud.events.emit('setNewspaperVisible', false);
      newsHud.events.emit('setTvVisible', false);
    }

    if (keys.PlayerHudScene) {
      this.scene.sleep('PlayerHudScene');
    }
  }

  create() {
    super.create();

    this.hideOverlayHuds();
    this.time.delayedCall(150, () => this.hideOverlayHuds());

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
    this.sceneContainer = null;
    this.nameContainer = null;
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
  }

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
  }

  /* -------------------------------- GRID ----------------------------- */

  drawGrid(L) {
    const g = L.grid;
    const { nameW, headerH, sceneRowH, rowH } = L;
    const fields = this.rows;

    this.uiRoot.add(
      this.add
        .rectangle(g.x + g.w / 2, g.y + g.h / 2, g.w, g.h, 0x171112, 1)
        .setStrokeStyle(2, 0x725d40, 1)
    );

    const bodyX = g.x + nameW;
    const bodyW = g.w - nameW;
    const sceneY = g.y + headerH;
    const bodyY = sceneY + sceneRowH;
    const bodyH = g.h - headerH - sceneRowH;

    const colW = Phaser.Math.Clamp(
      Math.floor(bodyW / Math.max(1, fields.length)),
      L.minColW,
      L.maxColW
    );

    const contentW = fields.length * colW;
    const contentH = this.suspects.length * rowH;

    this.minScrollX = Math.min(0, bodyW - contentW);
    this.minScrollY = Math.min(0, bodyH - contentH);
    this.scrollX = Phaser.Math.Clamp(this.scrollX, this.minScrollX, 0);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, this.minScrollY, 0);

    this.regions.body = { x: bodyX, y: bodyY, w: bodyW, h: bodyH };
    this.regions.scene = { x: bodyX, y: sceneY, w: bodyW, h: sceneRowH };
    this.regions.header = { x: bodyX, y: g.y, w: bodyW, h: headerH };
    this.regions.names = { x: g.x, y: bodyY, w: nameW, h: bodyH };

    this.gridOrigin = {
      bodyX,
      bodyY,
      sceneY,
      headerY: g.y,
      nameX: g.x
    };

    this.bodyContainer = this.add.container(bodyX, bodyY);
    this.headerContainer = this.add.container(bodyX, g.y);
    this.sceneContainer = this.add.container(bodyX, sceneY);
    this.nameContainer = this.add.container(g.x, bodyY);

    this.bodyContainer.setMask(this.makeMask(bodyX, bodyY, bodyW, bodyH));
    this.headerContainer.setMask(this.makeMask(bodyX, g.y, bodyW, headerH));
    this.sceneContainer.setMask(this.makeMask(bodyX, sceneY, bodyW, sceneRowH));
    this.nameContainer.setMask(this.makeMask(g.x, bodyY, nameW, bodyH));

    this.uiRoot.add([
      this.bodyContainer,
      this.headerContainer,
      this.sceneContainer,
      this.nameContainer
    ]);

    const corner = this.add
      .rectangle(g.x + nameW / 2, g.y + headerH / 2, nameW, headerH, 0x38291d, 1)
      .setStrokeStyle(1, 0x8b704b, 1);

    const cornerText = this.add
      .text(g.x + nameW / 2, g.y + headerH / 2, 'SUSPECTS', {
        fontFamily: 'PressStart2P',
        fontSize: '9px',
        color: '#ffdc73'
      })
      .setOrigin(0.5);

    const sceneLabelBg = this.add
      .rectangle(
        g.x + nameW / 2,
        sceneY + sceneRowH / 2,
        nameW,
        sceneRowH,
        COLORS.headerScene,
        1
      )
      .setStrokeStyle(1, 0x8b704b, 1);

    const sceneLabel = this.add
      .text(g.x + nameW / 2, sceneY + sceneRowH / 2, 'CRIME SCENE', {
        fontFamily: 'PressStart2P',
        fontSize: '10px',
        color: '#ffdc73'
      })
      .setOrigin(0.5);

    this.uiRoot.add([corner, cornerText, sceneLabelBg, sceneLabel]);

    fields.forEach((row, index) => {
      const cx = index * colW + colW / 2;

      const headerBg = this.add
        .rectangle(cx, headerH / 2, colW, headerH, COLORS.headerSuspect, 1)
        .setStrokeStyle(1, 0x8b704b, 1);

      const headerText = this.add
        .text(cx, headerH / 2, row.label, {
          fontFamily: 'PressStart2P',
          fontSize: '9px',
          color: '#f5e7c6',
          align: 'center',
          wordWrap: { width: colW - 14, useAdvancedWrap: true }
        })
        .setOrigin(0.5);

      this.headerContainer.add([headerBg, headerText]);

      this.createEvidenceCell({
        container: this.sceneContainer,
        region: this.regions.scene,
        x: cx,
        y: sceneRowH / 2,
        width: colW,
        height: sceneRowH,
        field: row.id,
        suspect: null,
        alternate: false
      });
    });

    this.suspects.forEach((suspect, rowIndex) => {
      const y = rowIndex * rowH;

      this.createSuspectNameCell(suspect, y, nameW, rowH, rowIndex);

      fields.forEach((row, index) => {
        this.createEvidenceCell({
          container: this.bodyContainer,
          region: this.regions.body,
          x: index * colW + colW / 2,
          y: y + rowH / 2,
          width: colW,
          height: rowH,
          field: row.id,
          suspect,
          alternate: rowIndex % 2 === 1
        });
      });
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

  createSuspectNameCell(suspect, y, nameW, rowH, rowIndex) {
    const unlikely = this.markedUnlikelyBySuspectId[suspect.id] === true;

    const bg = this.add
      .rectangle(
        nameW / 2,
        y + rowH / 2,
        nameW,
        rowH,
        unlikely ? 0x3a1b18 : rowIndex % 2 ? 0x211816 : 0x281d18,
        1
      )
      .setStrokeStyle(1, COLORS.line, 1);

    const btnW = 92;
    const textW = nameW - btnW - 30;

    const name = this.add
      .text(10, y + 6, this.getSuspectDisplayName(suspect), {
        fontFamily: 'SpecialElite',
        fontSize: '16px',
        color: unlikely ? '#a38b85' : '#fff0cb',
        wordWrap: { width: textW, useAdvancedWrap: true }
      })
      .setOrigin(0, 0);

    const occupation = this.add
      .text(10, name.y + name.height + 1, this.getSuspectOccupation(suspect), {
        fontFamily: 'SpecialElite',
        fontSize: '12px',
        color: unlikely ? '#85726d' : '#b9a57a',
        wordWrap: { width: textW, useAdvancedWrap: true }
      })
      .setOrigin(0, 0);

    const btnX = nameW - btnW / 2 - 8;
    const btnY = y + rowH / 2;

    const btn = this.add
      .rectangle(
        btnX,
        btnY,
        btnW,
        30,
        unlikely ? COLORS.noFill : COLORS.okFill,
        1
      )
      .setStrokeStyle(2, unlikely ? COLORS.noStroke : COLORS.okStroke, 1)
      .setInteractive({ useHandCursor: true });

    const label = this.add
      .text(btnX, btnY, unlikely ? 'UNLIKELY' : 'POSSIBLE', {
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
      if (!this.inRect(pointer, this.regions.names)) return;
      this.toggleSuspectMark(suspect.id);
    });

    this.nameContainer.add([bg, name, occupation, btn, label]);
  }

  isTargetForClue(clue, target) {
    if (!clue) return false;

    if (clue.type === 'crime_scene_fact') {
      return target.type === 'crime_scene' && target.field === clue.field;
    }

    return (
      target.type === 'suspect' &&
      target.suspectId === clue.suspectId &&
      target.field === clue.field
    );
  }

  createEvidenceCell({
    container,
    region,
    x,
    y,
    width,
    height,
    field,
    suspect,
    alternate
  }) {
    const target = suspect
      ? { type: 'suspect', suspectId: suspect.id, field }
      : { type: 'crime_scene', suspectId: null, field };

    const key = this.getCellKey(target);
    const placedClue = this.clueCards.find(
      (c) => c.id === this.placedCluesByCell[key]
    );

    const autoValue = suspect ? this.getAutoSuspectValue(suspect, field) : null;

    const sceneHasCard =
      !suspect &&
      this.clueCards.some(
        (c) => c.type === 'crime_scene_fact' && c.field === field
      );

    const noData = !suspect && !sceneHasCard && !placedClue;

    const unlikely =
      Boolean(suspect) &&
      this.markedUnlikelyBySuspectId[suspect.id] === true;

    const selectedClue = this.clueCards.find(
      (c) => c.id === this.selectedClueId
    );

    const waiting =
      Boolean(selectedClue) &&
      !placedClue &&
      autoValue === null &&
      this.isTargetForClue(selectedClue, target);

    const displayValue =
      autoValue || (placedClue ? formatCellValue(placedClue.value) : '');

    const clickable = autoValue === null && !noData;

    const baseFill = waiting
      ? COLORS.cellWaiting
      : autoValue
        ? COLORS.cellAuto
        : placedClue
          ? COLORS.cellFilled
          : alternate
            ? COLORS.cellB
            : COLORS.cellA;

    const bg = this.add
      .rectangle(x, y, width, height, baseFill, 1)
      .setStrokeStyle(
        waiting ? 3 : 1,
        waiting ? COLORS.gold : COLORS.line,
        1
      );

    if (clickable) {
      bg.setInteractive({ useHandCursor: true });
    }

    const text = this.add
      .text(
        x,
        y,
        displayValue || (noData ? '—' : '?'),
        {
          fontFamily: displayValue ? 'SpecialElite' : 'PressStart2P',
          fontSize: displayValue ? '20px' : '14px',
          color: displayValue ? '#f6dfa3' : '#756351',
          align: 'center',
          wordWrap: { width: width - 12, useAdvancedWrap: true }
        }
      )
      .setOrigin(0.5);

    if (unlikely) {
      bg.setAlpha(0.45);
      text.setAlpha(0.45);
    }

    if (clickable) {
      bg.on('pointerover', () => {
        if (this.modalOpen) return;
        bg.setFillStyle(placedClue ? 0x4d3a20 : COLORS.cellHover, 1);
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(baseFill, 1);
      });
      bg.on('pointerup', (pointer) => {
        if (this.modalOpen || this.dragMoved) return;
        if (!this.inRect(pointer, region)) return;
        this.onCellClick(target, placedClue);
      });
    }

    container.add([bg, text]);
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

  isOverGrid(pointer) {
    return (
      this.inRect(pointer, this.regions.body) ||
      this.inRect(pointer, this.regions.scene) ||
      this.inRect(pointer, this.regions.header) ||
      this.inRect(pointer, this.regions.names)
    );
  }

  applyScroll() {
    if (!this.gridOrigin) return;

    const { bodyX, bodyY, sceneY, headerY, nameX } = this.gridOrigin;

    this.bodyContainer?.setPosition(
      bodyX + this.scrollX,
      bodyY + this.scrollY
    );
    this.headerContainer?.setPosition(bodyX + this.scrollX, headerY);
    this.sceneContainer?.setPosition(bodyX + this.scrollX, sceneY);
    this.nameContainer?.setPosition(nameX, bodyY + this.scrollY);

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

    if (this.isOverGrid(pointer)) {
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
      this.scrollX = Phaser.Math.Clamp(
        this.dragStart.sx + dx,
        this.minScrollX,
        0
      );
      this.scrollY = Phaser.Math.Clamp(
        this.dragStart.sy + dy,
        this.minScrollY,
        0
      );
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

    if (this.isOverGrid(pointer)) {
      const horizontal =
        pointer.event?.shiftKey || Math.abs(deltaX) > Math.abs(deltaY);
      const amount = horizontal && Math.abs(deltaX) > 0 ? deltaX : deltaY;

      if (horizontal) {
        this.scrollX = Phaser.Math.Clamp(
          this.scrollX - amount,
          this.minScrollX,
          0
        );
      } else if (this.minScrollY < 0) {
        this.scrollY = Phaser.Math.Clamp(
          this.scrollY - amount,
          this.minScrollY,
          0
        );
      } else {
        this.scrollX = Phaser.Math.Clamp(
          this.scrollX - amount,
          this.minScrollX,
          0
        );
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
      this.selectedClueId ? 'Now click the glowing cell in the grid.' : ''
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
    const clue = this.clueCards.find(
      (item) => item.id === this.selectedClueId
    );

    if (!clue) {
      this.setFeedback('Choose a clue card first.');
      return;
    }

    if (!this.isTargetForClue(clue, target)) {
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
    this.setFeedback(
      `${clue.label}: ${formatCellValue(clue.value)} added to the grid.`
    );
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