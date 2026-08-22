import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../GameStatePersistence.js';
import { CrimeLabManager } from './CSI/CrimeLabManager.js';
import { DEDUCTION_EVIDENCE_REGISTRY } from './CSI/DeductionEvidenceRegistry.js';

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

function getByPath(source, path) {
  if (!source || !path) return undefined;

  return String(path)
    .split('.')
    .reduce((current, key) => current?.[key], source);
}

function pickRandom(items = []) {
  if (!Array.isArray(items) || !items.length) return '';

  return items[Math.floor(Math.random() * items.length)];
}

function fillTemplate(template = '', params = {}) {
  return String(template).replace(
    /{(\w+)}/g,
    (_, key) => params[key] ?? '???'
  );
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
    this.ruledOutBySuspectId = {};

    this.gridViewport = null;
    this.gridScrollContainer = null;
    this.fixedGridContainer = null;
    this.clueContainer = null;

    this.headerText = null;
    this.subHeaderText = null;
    this.feedbackText = null;
    this.backButton = null;
    this.finishButton = null;

    this.gridScrollX = 0;
    this.minScrollX = 0;
    this.isDraggingGrid = false;
    this.dragStartX = 0;
    this.dragStartScrollX = 0;

    this.resizeHandler = null;
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
        ? data.returnScene
        : 'CrimeCityScene';

    this.returnData = {
      ...(data.returnData || {}),
      cityId: this.cityId,
      openPanel: data.returnData?.openPanel || 'alibi'
    };

    this.labManager = new CrimeLabManager(this.gameState, this.cityId);

    const allSuspects = Array.isArray(this.gameState.suspects)
      ? this.gameState.suspects
      : [];

    const suspectIds =
      data.suspectIds ||
      this.gameState.suspectGridInput?.suspectIds ||
      this.gameState.currentMission?.suspectIds ||
      allSuspects.map((suspect) => suspect.id);

    this.suspects = allSuspects.filter((suspect) =>
      suspectIds.includes(suspect.id)
    );

    const caseForensics = this.labManager.ensureCaseForensics();

    caseForensics.suspectGrid ??= {};
    caseForensics.suspectGrid.placedCluesByCell ??= {};
    caseForensics.suspectGrid.ruledOutBySuspectId ??= {};

    this.placedCluesByCell = {
      ...caseForensics.suspectGrid.placedCluesByCell
    };

    this.ruledOutBySuspectId = {
      ...caseForensics.suspectGrid.ruledOutBySuspectId
    };

    this.clueCards = this.buildClueCards(caseForensics, data);
    this.rows = this.buildRows();
    this.selectedClueId = null;
    this.gridScrollX = 0;
  }

  /*
   * Najważniejsze:
   *
   * Z CrimeCityScene możesz przekazać własne, konkretne karty:
   *
   * gridClues: [
   *   {
   *     id: 'nora_shoes_small',
   *     type: 'suspect_fact',
   *     suspectId: 'nora_pike',
   *     field: 'shoeSizeCategory',
   *     value: 'small',
   *     text: 'Nora Pike wears small shoes.'
   *   },
   *   {
   *     id: 'scene_shoes_large',
   *     type: 'crime_scene_fact',
   *     field: 'shoeSizeCategory',
   *     value: 'large',
   *     text: 'The shoeprint at the crime scene is large.'
   *   }
   * ]
   *
   * suspect_fact wkłada się w konkretną kolumnę podejrzanego.
   * crime_scene_fact wkłada się do kolumny CRIME SCENE.
   */
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

    const automaticCrimeSceneCards = this.buildCrimeSceneEvidenceCards(
      caseForensics
    );

    const combinedCards = [
      ...normalizedExplicitCards,
      ...automaticCrimeSceneCards
    ];

    const uniqueCards = new Map();

    combinedCards.forEach((card) => {
      if (!card?.id || uniqueCards.has(card.id)) return;
      uniqueCards.set(card.id, card);
    });

    return [...uniqueCards.values()];
  }

  normalizeExplicitClue(clue, index) {
    if (!clue?.field) return null;

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
      console.warn(
        '[SuspectGridScene] suspect_fact needs suspectId:',
        clue
      );
      return null;
    }

    const suspect = this.suspects.find(
      (item) => item.id === suspectId
    );

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

      if (!field || alreadyAdded.has(field)) return;

      const entry = DEDUCTION_EVIDENCE_REGISTRY[field];
      const rawValue = evidence.value ?? evidence.normalizedValue;
      const value = entry?.normalizeEvidence
        ? entry.normalizeEvidence(rawValue)
        : rawValue;

      if (value === undefined || value === null || value === '') return;

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

      if (!field || alreadyAdded.has(field)) return;

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
      .filter(
        (field) => !DEFAULT_ROWS.some((row) => row.id === field)
      )
      .map((field) => ({
        id: field,
        label: prettify(field)
      }));

    const rows = [...defaultRows, ...extraRows];

    return rows.length
      ? rows
      : [
          { id: 'shoeSizeCategory', label: 'SHOE SIZE' },
          { id: 'handedness', label: 'HANDEDNESS' },
          { id: 'bloodType', label: 'BLOOD TYPE' }
        ];
  }

  create() {
    super.create();

    this.scene.stop('NewsHudScene');
    this.scene.stop('UIScene');
    this.scene.stop('MenuScene');

    this.cameras.main.setBackgroundColor('#110d0e');

    this.createBackground();
    this.createHeader();
    this.createContainers();
    this.createFooter();
    this.refreshAll();

    this.resizeHandler = () => this.rebuildScene();
    this.scale.on('resize', this.resizeHandler);

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanupScene,
      this
    );
  }

  createBackground() {
    const { width, height } = this.scale;

    this.add
      .rectangle(0, 0, width, height, 0x110d0e, 1)
      .setOrigin(0)
      .setDepth(-20);

    this.add
      .rectangle(0, 0, width, 88, 0x271d1f, 1)
      .setOrigin(0)
      .setDepth(-19);

    this.add
      .rectangle(0, 85, width, 3, 0xd4af37, 0.95)
      .setOrigin(0)
      .setDepth(-18);

    this.add
      .rectangle(0, height - 62, width, 62, 0x0c090a, 1)
      .setOrigin(0)
      .setDepth(-19);
  }

  createHeader() {
    const { width } = this.scale;

    this.headerText = this.add
      .text(width / 2, 10, 'EVIDENCE GRID', {
        fontFamily: 'Special Elite',
        fontSize: '30px',
        color: '#f5e7c6',
        align: 'center'
      })
      .setOrigin(0.5, 0)
      .setDepth(30);

    this.subHeaderText = this.add
      .text(
        width / 2,
        48,
        'Select a clue, then place it in the correct cell. Your deductions are your own.',
        {
          fontFamily: 'Special Elite',
          fontSize: '15px',
          color: '#d9c998',
          align: 'center',
          wordWrap: {
            width: width - 40,
            useAdvancedWrap: true
          }
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(30);
  }

  createContainers() {
    this.clueContainer = this.add.container(0, 0).setDepth(10);

    this.gridViewport = this.add.container(0, 0).setDepth(5);
    this.fixedGridContainer = this.add.container(0, 0).setDepth(8);
    this.gridScrollContainer = this.add.container(0, 0).setDepth(7);

    this.gridViewport.add(this.gridScrollContainer);

    this.input.on('pointermove', this.handleGridDrag, this);
    this.input.on('pointerup', this.stopGridDrag, this);
  }

  createFooter() {
    const { width, height } = this.scale;

    this.feedbackText = this.add
      .text(width / 2, height - 30, '', {
        fontFamily: 'Special Elite',
        fontSize: '15px',
        color: '#ffdc73',
        align: 'center',
        wordWrap: {
          width: width - 350,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5)
      .setDepth(40);

    this.backButton = this.createButton({
      x: 100,
      y: height - 31,
      width: 175,
      height: 36,
      label: '[ CRIME CITY ]',
      fill: 0x43241e,
      hoverFill: 0x67382d,
      onClick: () => this.closeScene()
    });

    this.finishButton = this.createButton({
      x: width - 125,
      y: height - 31,
      width: 230,
      height: 36,
      label: '[ SEND TO ALIBIS ]',
      fill: 0x24442a,
      hoverFill: 0x38673e,
      textColor: '#d6ffd5',
      onClick: () => this.finalizeGrid()
    });
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
    const container = this.add.container(x, y).setDepth(50);

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
        wordWrap: {
          width: width - 14,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5);

    background.on('pointerover', () => {
      background.setFillStyle(hoverFill, 1);
      background.setStrokeStyle(2, 0xd4af37, 1);
    });

    background.on('pointerout', () => {
      background.setFillStyle(fill, 1);
      background.setStrokeStyle(2, 0x8b704b, 1);
    });

    background.on('pointerdown', onClick);

    container.add([background, text]);

    return container;
  }

  refreshAll() {
    this.clearContainer(this.clueContainer);
    this.clearContainer(this.fixedGridContainer);
    this.clearContainer(this.gridScrollContainer);

    this.renderClueCards();
    this.renderGrid();
  }

  getPlacedClueIds() {
    return new Set(Object.values(this.placedCluesByCell));
  }

  getUnplacedClues() {
    const placedClueIds = this.getPlacedClueIds();

    return this.clueCards.filter(
      (clue) => !placedClueIds.has(clue.id)
    );
  }

  renderClueCards() {
    const { width } = this.scale;

    const clues = this.getUnplacedClues();
    const panelY = 96;
    const panelHeight = 122;

    const panel = this.add
      .rectangle(
        width / 2,
        panelY + panelHeight / 2,
        width - 32,
        panelHeight,
        0x1c1514,
        1
      )
      .setStrokeStyle(2, 0x5d4932, 1);

    const title = this.add
      .text(26, panelY + 10, 'CLUE CARDS', {
        fontFamily: 'PressStart2P',
        fontSize: '9px',
        color: '#ffdc73'
      })
      .setOrigin(0, 0);

    this.clueContainer.add([panel, title]);

    if (!clues.length) {
      const empty = this.add
        .text(width / 2, panelY + 65, 'All currently available clue cards are on the board.', {
          fontFamily: 'Special Elite',
          fontSize: '17px',
          color: '#c6b58d',
          align: 'center'
        })
        .setOrigin(0.5);

      this.clueContainer.add(empty);
      return;
    }

    const cardWidth = 220;
    const cardHeight = 64;
    const gapX = 12;
    const gapY = 10;
    const maxColumns = Math.max(
      1,
      Math.floor((width - 46) / (cardWidth + gapX))
    );

    clues.forEach((clue, index) => {
      const column = index % maxColumns;
      const row = Math.floor(index / maxColumns);

      if (row > 0) return;

      const x = 27 + column * (cardWidth + gapX);
      const y = panelY + 36 + row * (cardHeight + gapY);

      const selected = clue.id === this.selectedClueId;

      const card = this.add.container(x, y);

      const background = this.add
        .rectangle(
          cardWidth / 2,
          cardHeight / 2,
          cardWidth,
          cardHeight,
          selected ? 0x5a4021 : 0x302217,
          1
        )
        .setStrokeStyle(
          selected ? 3 : 2,
          selected ? 0xf4d36b : 0x806440,
          1
        )
        .setInteractive({ useHandCursor: true });

      const typeLabel =
        clue.type === 'crime_scene_fact'
          ? 'CRIME SCENE'
          : 'SUSPECT FACT';

      const badge = this.add
        .text(10, 8, `${typeLabel} · ${clue.label}`, {
          fontFamily: 'PressStart2P',
          fontSize: '6px',
          color: selected ? '#18110b' : '#ffdc73',
          wordWrap: {
            width: cardWidth - 20,
            useAdvancedWrap: true
          }
        })
        .setOrigin(0, 0);

      const text = this.add
        .text(10, 26, clue.text, {
          fontFamily: 'Special Elite',
          fontSize: '12px',
          color: selected ? '#21160c' : '#f1e2c0',
          wordWrap: {
            width: cardWidth - 20,
            useAdvancedWrap: true
          }
        })
        .setOrigin(0, 0);

      background.on('pointerdown', () => this.selectClue(clue.id));

      card.add([background, badge, text]);
      this.clueContainer.add(card);
    });

    const hiddenCount = Math.max(0, clues.length - maxColumns);

    if (hiddenCount > 0) {
      const more = this.add
        .text(width - 34, panelY + 15, `+${hiddenCount} MORE`, {
          fontFamily: 'PressStart2P',
          fontSize: '7px',
          color: '#d9c998'
        })
        .setOrigin(1, 0);

      this.clueContainer.add(more);
    }
  }

  selectClue(clueId) {
    this.selectedClueId =
      this.selectedClueId === clueId ? null : clueId;

    this.feedbackText.setText(
      this.selectedClueId
        ? 'Now click the correct cell in the evidence grid.'
        : ''
    );

    this.refreshAll();
  }

  renderGrid() {
    const { width, height } = this.scale;

    const gridTop = 236;
    const gridBottom = height - 76;
    const viewportHeight = Math.max(160, gridBottom - gridTop);

    const labelWidth = 154;
    const sceneWidth = 126;
    const suspectWidth = 154;
    const headerHeight = 54;
    const rowHeight = 52;
    const decisionHeight = 46;

    const dataColumns = [
      {
        id: 'crime_scene',
        type: 'crime_scene',
        name: 'CRIME\nSCENE'
      },
      ...this.suspects.map((suspect) => ({
        id: suspect.id,
        type: 'suspect',
        name: suspect.name || 'Unknown'
      }))
    ];

    const contentWidth =
      sceneWidth + this.suspects.length * suspectWidth;

    const viewportWidth = width - labelWidth - 28;

    this.minScrollX = Math.min(0, viewportWidth - contentWidth);
    this.gridScrollX = Phaser.Math.Clamp(
      this.gridScrollX,
      this.minScrollX,
      0
    );

    const outer = this.add
      .rectangle(
        width / 2,
        gridTop + viewportHeight / 2,
        width - 28,
        viewportHeight,
        0x171112,
        1
      )
      .setStrokeStyle(2, 0x725d40, 1);

    this.fixedGridContainer.add(outer);

    const labelHeader = this.add
      .rectangle(
        14 + labelWidth / 2,
        gridTop + headerHeight / 2,
        labelWidth,
        headerHeight,
        0x38291d,
        1
      )
      .setStrokeStyle(1, 0x8b704b, 1);

    const labelHeaderText = this.add
      .text(14 + labelWidth / 2, gridTop + headerHeight / 2, 'EVIDENCE', {
        fontFamily: 'PressStart2P',
        fontSize: '8px',
        color: '#ffdc73',
        align: 'center'
      })
      .setOrigin(0.5);

    this.fixedGridContainer.add([labelHeader, labelHeaderText]);

    this.renderFixedRows({
      gridTop,
      headerHeight,
      rowHeight,
      decisionHeight,
      labelWidth
    });

    this.renderScrollableGrid({
      gridTop,
      viewportHeight,
      labelWidth,
      headerHeight,
      rowHeight,
      decisionHeight,
      sceneWidth,
      suspectWidth,
      dataColumns
    });

    const dragZone = this.add
      .rectangle(
        labelWidth + 14 + viewportWidth / 2,
        gridTop + viewportHeight / 2,
        viewportWidth,
        viewportHeight,
        0xffffff,
        0.001
      )
      .setInteractive({ useHandCursor: true });

    dragZone.on('pointerdown', (pointer) => {
      this.startGridDrag(pointer);
    });

    this.fixedGridContainer.add(dragZone);

    if (this.minScrollX < 0) {
      const help = this.add
        .text(width - 20, gridTop + 5, '← DRAG TABLE →', {
          fontFamily: 'PressStart2P',
          fontSize: '6px',
          color: '#aa9263'
        })
        .setOrigin(1, 0)
        .setDepth(30);

      this.fixedGridContainer.add(help);
    }
  }

  renderFixedRows({
    gridTop,
    headerHeight,
    rowHeight,
    decisionHeight,
    labelWidth
  }) {
    this.rows.forEach((row, index) => {
      const y = gridTop + headerHeight + index * rowHeight;

      const background = this.add
        .rectangle(
          14 + labelWidth / 2,
          y + rowHeight / 2,
          labelWidth,
          rowHeight,
          index % 2 ? 0x211816 : 0x281d18,
          1
        )
        .setStrokeStyle(1, 0x604b34, 1);

      const text = this.add
        .text(24, y + rowHeight / 2, row.label, {
          fontFamily: 'PressStart2P',
          fontSize: '7px',
          color: '#dfc893',
          wordWrap: {
            width: labelWidth - 18,
            useAdvancedWrap: true
          }
        })
        .setOrigin(0, 0.5);

      this.fixedGridContainer.add([background, text]);
    });

    const decisionY =
      gridTop + headerHeight + this.rows.length * rowHeight;

    const decisionBackground = this.add
      .rectangle(
        14 + labelWidth / 2,
        decisionY + decisionHeight / 2,
        labelWidth,
        decisionHeight,
        0x40201c,
        1
      )
      .setStrokeStyle(2, 0xb14f45, 1);

    const decisionText = this.add
      .text(
        24,
        decisionY + decisionHeight / 2,
        'YOUR\nDECISION',
        {
          fontFamily: 'PressStart2P',
          fontSize: '7px',
          color: '#ffc5b8',
          align: 'left'
        }
      )
      .setOrigin(0, 0.5);

    this.fixedGridContainer.add([
      decisionBackground,
      decisionText
    ]);
  }

  renderScrollableGrid({
    gridTop,
    labelWidth,
    headerHeight,
    rowHeight,
    decisionHeight,
    sceneWidth,
    suspectWidth,
    dataColumns
  }) {
    const startX = labelWidth + 14 + this.gridScrollX;

    dataColumns.forEach((column, columnIndex) => {
      const columnWidth =
        column.type === 'crime_scene'
          ? sceneWidth
          : suspectWidth;

      const previousWidths = dataColumns
        .slice(0, columnIndex)
        .reduce(
          (sum, item) =>
            sum +
            (item.type === 'crime_scene'
              ? sceneWidth
              : suspectWidth),
          0
        );

      const x = startX + previousWidths + columnWidth / 2;

      const headerColor =
        column.type === 'crime_scene' ? 0x503719 : 0x32251b;

      const header = this.add
        .rectangle(
          x,
          gridTop + headerHeight / 2,
          columnWidth,
          headerHeight,
          headerColor,
          1
        )
        .setStrokeStyle(1, 0x8b704b, 1);

      const headerText = this.add
        .text(x, gridTop + headerHeight / 2, column.name, {
          fontFamily: 'Special Elite',
          fontSize: column.type === 'crime_scene' ? '15px' : '16px',
          color: '#fff0cb',
          align: 'center',
          wordWrap: {
            width: columnWidth - 12,
            useAdvancedWrap: true
          }
        })
        .setOrigin(0.5);

      this.gridScrollContainer.add([header, headerText]);

      this.rows.forEach((row, rowIndex) => {
        const y =
          gridTop +
          headerHeight +
          rowIndex * rowHeight +
          rowHeight / 2;

        this.createEvidenceCell({
          x,
          y,
          width: columnWidth,
          height: rowHeight,
          row,
          column,
          alternate: rowIndex % 2 === 1
        });
      });

      if (column.type === 'suspect') {
        const decisionY =
          gridTop +
          headerHeight +
          this.rows.length * rowHeight +
          decisionHeight / 2;

        this.createDecisionCell({
          x,
          y: decisionY,
          width: columnWidth,
          height: decisionHeight,
          suspectId: column.id
        });
      } else {
        const decisionY =
          gridTop +
          headerHeight +
          this.rows.length * rowHeight +
          decisionHeight / 2;

        const empty = this.add
          .rectangle(
            x,
            decisionY,
            columnWidth,
            decisionHeight,
            0x251917,
            1
          )
          .setStrokeStyle(1, 0x604b34, 1);

        this.gridScrollContainer.add(empty);
      }
    });
  }

  createEvidenceCell({
    x,
    y,
    width,
    height,
    row,
    column,
    alternate
  }) {
    const target = {
      type:
        column.type === 'crime_scene'
          ? 'crime_scene'
          : 'suspect',
      suspectId:
        column.type === 'suspect' ? column.id : null,
      field: row.id
    };

    const key = this.getCellKey(target);
    const placedClueId = this.placedCluesByCell[key];
    const placedClue = this.clueCards.find(
      (clue) => clue.id === placedClueId
    );

    const background = this.add
      .rectangle(
        x,
        y,
        width,
        height,
        alternate ? 0x1d1514 : 0x241a17,
        1
      )
      .setStrokeStyle(1, 0x604b34, 1)
      .setInteractive({ useHandCursor: true });

    const hasSelectedCard = Boolean(this.selectedClueId);

    if (hasSelectedCard && !placedClue) {
      background.setStrokeStyle(2, 0xb28d44, 0.85);
    }

    const cellText = this.add
      .text(
        x,
        y,
        placedClue ? normalize(placedClue.value).toUpperCase() : '?',
        {
          fontFamily: placedClue ? 'Special Elite' : 'PressStart2P',
          fontSize: placedClue ? '15px' : '10px',
          color: placedClue ? '#f6dfa3' : '#756351',
          align: 'center',
          wordWrap: {
            width: width - 12,
            useAdvancedWrap: true
          }
        }
      )
      .setOrigin(0.5);

    background.on('pointerover', () => {
      if (placedClue) return;

      background.setFillStyle(0x3b2b1c, 1);
      background.setStrokeStyle(2, 0xd4af37, 1);
    });

    background.on('pointerout', () => {
      background.setFillStyle(
        alternate ? 0x1d1514 : 0x241a17,
        1
      );
      background.setStrokeStyle(
        hasSelectedCard && !placedClue ? 2 : 1,
        hasSelectedCard && !placedClue ? 0xb28d44 : 0x604b34,
        hasSelectedCard && !placedClue ? 0.85 : 1
      );
    });

    background.on('pointerdown', () => {
      this.placeSelectedClue(target);
    });

    this.gridScrollContainer.add([background, cellText]);
  }

  createDecisionCell({
    x,
    y,
    width,
    height,
    suspectId
  }) {
    const ruledOut = this.ruledOutBySuspectId[suspectId] === true;

    const fill = ruledOut ? 0x632923 : 0x24422a;
    const border = ruledOut ? 0xdf6559 : 0x65a566;
    const label = ruledOut ? 'RULED OUT' : 'POSSIBLE';
    const color = ruledOut ? '#ffd1c8' : '#d5ffd2';

    const background = this.add
      .rectangle(x, y, width, height, fill, 1)
      .setStrokeStyle(2, border, 1)
      .setInteractive({ useHandCursor: true });

    const text = this.add
      .text(x, y, label, {
        fontFamily: 'PressStart2P',
        fontSize: '8px',
        color,
        align: 'center',
        wordWrap: {
          width: width - 12,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5);

    background.on('pointerover', () => {
      background.setFillStyle(
        ruledOut ? 0x823b31 : 0x35613a,
        1
      );
    });

    background.on('pointerout', () => {
      background.setFillStyle(fill, 1);
    });

    background.on('pointerdown', () => {
      this.toggleSuspectMark(suspectId);
    });

    this.gridScrollContainer.add([background, text]);
  }

  getCellKey(target) {
    const subject =
      target.type === 'crime_scene'
        ? 'crime_scene'
        : target.suspectId;

    return `${subject}:${target.field}`;
  }

  placeSelectedClue(target) {
    const clue = this.clueCards.find(
      (item) => item.id === this.selectedClueId
    );

    if (!clue) {
      this.feedbackText.setText('Choose a clue card first.');
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
      this.feedbackText.setText(
        'That clue does not belong in this cell.'
      );
      return;
    }

    const key = this.getCellKey(target);

    if (this.placedCluesByCell[key]) {
      this.feedbackText.setText(
        'This cell already contains a clue. Remove it first if you want to change it.'
      );
      return;
    }

    this.placedCluesByCell[key] = clue.id;
    this.selectedClueId = null;

    this.saveGridProgress();

    this.feedbackText.setText(
      `${clue.label}: ${normalize(clue.value)} added to the grid.`
    );

    this.refreshAll();
  }

  toggleSuspectMark(suspectId) {
    this.ruledOutBySuspectId[suspectId] =
      !this.ruledOutBySuspectId[suspectId];

    this.saveGridProgress();
    this.refreshAll();
  }

  saveGridProgress() {
    const caseForensics = this.labManager.ensureCaseForensics();

    caseForensics.suspectGrid ??= {};

    caseForensics.suspectGrid.placedCluesByCell = {
      ...this.placedCluesByCell
    };

    caseForensics.suspectGrid.ruledOutBySuspectId = {
      ...this.ruledOutBySuspectId
    };

    caseForensics.suspectGrid.eliminatedSuspectIds = this.suspects
      .filter((suspect) => this.ruledOutBySuspectId[suspect.id])
      .map((suspect) => suspect.id);

    saveGameState();
  }

  finalizeGrid() {
    const remainingSuspects = this.suspects.filter(
      (suspect) => !this.ruledOutBySuspectId[suspect.id]
    );

    if (remainingSuspects.length < 2) {
      this.feedbackText.setText(
        'Leave at least two suspects for the alibi investigation.'
      );
      return;
    }

    const caseForensics = this.labManager.ensureCaseForensics();

    caseForensics.suspectGrid ??= {};
    caseForensics.suspectGrid.completed = true;
    caseForensics.suspectGrid.completedAt = Date.now();
    caseForensics.suspectGrid.remainingSuspectIds =
      remainingSuspects.map((suspect) => suspect.id);

    this.gameState.alibiInvestigation = {
      cityId: this.cityId,
      suspectIds: remainingSuspects.map((suspect) => suspect.id),
      unlocked: true
    };

    saveGameState();

    this.feedbackText.setText(
      `${remainingSuspects.length} suspects remain. Their alibis are now available in Crime City.`
    );

    this.time.delayedCall(900, () => this.closeScene());
  }

  startGridDrag(pointer) {
    if (this.minScrollX === 0) return;

    this.isDraggingGrid = true;
    this.dragStartX = pointer.x;
    this.dragStartScrollX = this.gridScrollX;
  }

  handleGridDrag(pointer) {
    if (!this.isDraggingGrid) return;

    const deltaX = pointer.x - this.dragStartX;

    this.gridScrollX = Phaser.Math.Clamp(
      this.dragStartScrollX + deltaX,
      this.minScrollX,
      0
    );

    this.refreshAll();
  }

  stopGridDrag() {
    this.isDraggingGrid = false;
  }

  closeScene() {
    saveGameState();

    if (
      this.returnScene &&
      this.returnScene !== this.scene.key &&
      this.scene.manager.keys[this.returnScene]
    ) {
      this.scene.start(this.returnScene, {
        ...this.returnData,
        cityId: this.cityId,
        evidenceGridClosed: true
      });

      return;
    }

    this.scene.stop();
  }

  clearContainer(container) {
    if (!container) return;

    const children = [...container.list];

    children.forEach((child) => {
      child.removeAllListeners?.();
      child.destroy?.();
    });

    container.removeAll(true);
  }

  rebuildScene() {
    this.createBackground();
    this.refreshAll();

    const { width, height } = this.scale;

    this.headerText?.setPosition(width / 2, 10);
    this.subHeaderText?.setPosition(width / 2, 48);
    this.feedbackText?.setPosition(width / 2, height - 30);

    this.backButton?.setPosition(100, height - 31);
    this.finishButton?.setPosition(width - 125, height - 31);
  }

  cleanupScene() {
    if (this.resizeHandler) {
      this.scale.off('resize', this.resizeHandler);
    }

    this.input.off('pointermove', this.handleGridDrag, this);
    this.input.off('pointerup', this.stopGridDrag, this);

    this.resizeHandler = null;

    this.clueContainer?.destroy();
    this.gridViewport?.destroy();
    this.fixedGridContainer?.destroy();

    [
      this.headerText,
      this.subHeaderText,
      this.feedbackText,
      this.backButton,
      this.finishButton
    ].forEach((item) => {
      item?.removeAllListeners?.();
      item?.destroy?.();
    });
  }
}