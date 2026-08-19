// SuspectGridScene.js
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../GameStatePersistence.js';
import { CrimeLabManager } from './CSI/CrimeLabManager.js';
import { DEDUCTION_EVIDENCE_REGISTRY } from '../scenes/csi/DeductionEvidenceRegistry.js';

function getByPath(source, path) {
  if (!source || !path) return undefined;

  return String(path)
    .split('.')
    .reduce((current, key) => current?.[key], source);
}

function pickRandomTemplate(templates = []) {
  if (!Array.isArray(templates) || !templates.length) return '';

  return templates[Math.floor(Math.random() * templates.length)];
}

function fillTemplate(template, params = {}) {
  return String(template || '').replace(
    /{(\w+)}/g,
    (_, key) => params[key] ?? '???'
  );
}

function prettifyFieldName(field = '') {
  return String(field)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export class SuspectGridScene extends BaseScene {
  constructor() {
    super('SuspectGridScene');

    this.gameState = gameState;
    this.cityId = null;
    this.returnScene = 'SuspectBoardScene';
    this.returnData = {};

    this.suspects = [];
    this.clueCards = [];
    this.selectedClueId = null;
    this.marksBySuspectId = {};
    this.lastResultBySuspectClue = {};

    this.headerText = null;
    this.subHeaderText = null;
    this.clueRailContainer = null;
    this.suspectGridContainer = null;
    this.feedbackText = null;
    this.finishButton = null;
    this.backButton = null;

    this.resizeHandler = null;
  }

  init(data = {}) {
    this.gameState = data.gameState || gameState;

    this.cityId =
      data.cityId ||
      this.gameState.currentMission?.city ||
      this.gameState.crimeCityId ||
      'Unknown City';

    this.returnScene =
      typeof data.returnScene === 'string' && data.returnScene.trim()
        ? data.returnScene.trim()
        : 'SuspectBoardScene';

    this.returnData = { ...(data.returnData || {}) };

    this.labManager = new CrimeLabManager(this.gameState, this.cityId);

    const suspectIds =
      data.suspectIds ||
      this.gameState.suspectGridInput?.suspectIds ||
      [];

    const allSuspects = Array.isArray(this.gameState.suspects)
      ? this.gameState.suspects
      : [];

    this.suspects = allSuspects.filter((suspect) =>
      suspectIds.includes(suspect.id)
    );

    const caseForensics = this.labManager.ensureCaseForensics();

    this.marksBySuspectId = {
      ...(caseForensics.suspectGrid.marksBySuspectId || {})
    };

    this.clueCards = this.buildClueCards(caseForensics);
    this.selectedClueId = this.clueCards[0]?.id || null;
    this.lastResultBySuspectClue = {};
  }

  buildClueCards(caseForensics) {
    const rawHardEvidence =
      this.gameState.currentMission?.forensicHardEvidence ||
      this.gameState.hardEvidence ||
      [];

    const usedFields = new Set();

    const hardCards = rawHardEvidence
      .map((evidence, index) => {
        const field = evidence.field || evidence.forensicField;
        const entry = DEDUCTION_EVIDENCE_REGISTRY[field];

        if (!entry || entry.role !== 'hard_filter') return null;

        usedFields.add(field);

        const rawValue = evidence.value ?? evidence.normalizedValue;
        const value = entry.normalizeEvidence
          ? entry.normalizeEvidence(rawValue)
          : rawValue;

        const introTemplate = pickRandomTemplate(entry.clueTemplates);

        return {
          id: `hard_${field}_${index}`,
          evidenceType: field,
          role: entry.role,
          label: prettifyFieldName(field),
          value,
          registryEntry: entry,
          templateParams: { value },
          introText: fillTemplate(introTemplate, { value })
        };
      })
      .filter(Boolean);

    const traceResults = [
      caseForensics.identityEvidenceResult,
      ...(caseForensics.traceEvidenceResults || [])
    ].filter(Boolean);

    const flavorCards = traceResults
      .map((result, index) => {
        const field = result.evidenceType;

        if (!field || field === 'hair_color' || usedFields.has(field)) {
          return null;
        }

        const entry = DEDUCTION_EVIDENCE_REGISTRY[field];

        if (!entry || entry.role === 'hard_filter') return null;

        let templateParams = { value: result.value };

        if (typeof entry.extract === 'function') {
          templateParams = {
            ...templateParams,
            ...entry.extract(result.value)
          };
        }

        const introTemplate = pickRandomTemplate(entry.clueTemplates);

        return {
          id: `flavor_${field}_${index}`,
          evidenceType: field,
          role: entry.role,
          label: prettifyFieldName(field),
          value: result.value,
          registryEntry: entry,
          templateParams,
          introText: fillTemplate(introTemplate, templateParams)
        };
      })
      .filter(Boolean);

    return [...hardCards, ...flavorCards];
  }

  create() {
    super.create();

    this.scene.stop('NewsHudScene');
    this.scene.stop('UIScene');
    this.scene.stop('MenuScene');

    this.cameras.main.setBackgroundColor('#141013');

    this.createBackground();
    this.createHeader();
    this.createClueRail();
    this.createSuspectGrid();
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
      .rectangle(0, 0, width, height, 0x141013, 1)
      .setOrigin(0, 0)
      .setDepth(-10);

    this.add
      .rectangle(0, 0, width, 96, 0x231b1e, 1)
      .setOrigin(0, 0)
      .setDepth(-9);

    this.add
      .rectangle(0, 94, width, 3, 0xd4af37, 0.9)
      .setOrigin(0, 0)
      .setDepth(-8);

    this.add
      .rectangle(0, height - 64, width, 64, 0x100c0e, 0.95)
      .setOrigin(0, 0)
      .setDepth(-8);
  }

  createHeader() {
    const { width } = this.scale;

    this.headerText = this.add
      .text(width / 2, 14, 'EVIDENCE GRID', {
        fontFamily: 'Special Elite',
        fontSize: '30px',
        color: '#f5e7c6',
        align: 'center'
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this.subHeaderText = this.add
      .text(
        width / 2,
        52,
        'Pick a piece of evidence, then check it against each suspect.',
        {
          fontFamily: 'Special Elite',
          fontSize: '15px',
          color: '#d9c998',
          align: 'center',
          wordWrap: { width: width - 60, useAdvancedWrap: true }
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(10);
  }

  createUiButton({
    x,
    y,
    width,
    height,
    label,
    fontSize = '9px',
    depth = 15,
    normalFill = 0x2d2118,
    hoverFill = 0x4b3322,
    normalColor = '#d8c59b',
    hoverColor = '#fff4d6',
    activeFill = 0xd4af37,
    activeColor = '#17110c',
    onClick = null
  }) {
    const container = this.add.container(x, y).setDepth(depth);

    const background = this.add
      .rectangle(0, 0, width, height, normalFill, 1)
      .setStrokeStyle(2, 0x766044, 0.9)
      .setInteractive({ useHandCursor: true });

    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'PressStart2P',
        fontSize,
        color: normalColor,
        align: 'center',
        wordWrap: { width: width - 18, useAdvancedWrap: true }
      })
      .setOrigin(0.5);

    container.add([background, text]);

    container.buttonBackground = background;
    container.buttonText = text;
    container.isActive = false;
    container.buttonStyle = {
      normalFill,
      hoverFill,
      normalColor,
      hoverColor,
      activeFill,
      activeColor
    };

    const applyStyle = () => {
      const style = container.buttonStyle;

      if (container.isActive) {
        background.setFillStyle(style.activeFill, 1);
        text.setColor(style.activeColor);
        background.setStrokeStyle(2, 0xf4d36b, 1);
        return;
      }

      background.setFillStyle(style.normalFill, 1);
      text.setColor(style.normalColor);
      background.setStrokeStyle(2, 0x766044, 0.9);
    };

    background.on('pointerover', () => {
      if (container.isActive) return;

      background.setFillStyle(container.buttonStyle.hoverFill, 1);
      text.setColor(container.buttonStyle.hoverColor);
      background.setStrokeStyle(2, 0xd4af37, 1);
    });

    background.on('pointerout', applyStyle);

    if (typeof onClick === 'function') {
      background.on('pointerdown', onClick);
    }

    container.applyStyle = applyStyle;

    return container;
  }

  createClueRail() {
    this.clueRailContainer = this.add.container(0, 0).setDepth(5);
  }

  createSuspectGrid() {
    this.suspectGridContainer = this.add.container(0, 0).setDepth(5);
  }

  createFooter() {
    const { width, height } = this.scale;

    this.feedbackText = this.add
      .text(width / 2, height - 32, '', {
        fontFamily: 'Special Elite',
        fontSize: '16px',
        color: '#ffdc73',
        align: 'center',
        wordWrap: { width: width - 340, useAdvancedWrap: true }
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.backButton = this.createUiButton({
      x: 110,
      y: height - 32,
      width: 180,
      height: 38,
      label: '[ BACK TO FILES ]',
      fontSize: '9px',
      depth: 30,
      normalFill: 0x3a201b,
      hoverFill: 0x6b3328,
      normalColor: '#f6e7bf',
      hoverColor: '#ffffff',
      onClick: () => this.closeScene()
    });

    this.finishButton = this.createUiButton({
      x: width - 130,
      y: height - 32,
      width: 220,
      height: 38,
      label: '[ FINALIZE SUSPECTS ]',
      fontSize: '9px',
      depth: 30,
      normalFill: 0x25422a,
      hoverFill: 0x35633c,
      normalColor: '#d3ffd1',
      hoverColor: '#ffffff',
      onClick: () => this.finalizeGrid()
    });
  }

  refreshAll() {
    this.clearContainer(this.clueRailContainer);
    this.clearContainer(this.suspectGridContainer);

    this.renderClueRail();
    this.renderSuspectGrid();
  }

  renderClueRail() {
    const { width } = this.scale;

    if (!this.clueCards.length) {
      const empty = this.add
        .text(width / 2, 150, 'No evidence collected yet.', {
          fontFamily: 'Special Elite',
          fontSize: '18px',
          color: '#d9c998'
        })
        .setOrigin(0.5);

      this.clueRailContainer.add(empty);
      return;
    }

    const cardWidth = 210;
    const cardHeight = 108;
    const gap = 14;

    const totalWidth =
      this.clueCards.length * cardWidth +
      (this.clueCards.length - 1) * gap;

    const startX = width / 2 - totalWidth / 2 + cardWidth / 2;
    const y = 148;

    this.clueCards.forEach((clue, index) => {
      const x = startX + index * (cardWidth + gap);
      const isSelected = clue.id === this.selectedClueId;

      const card = this.add.container(x, y);

      const bg = this.add
        .rectangle(
          0,
          0,
          cardWidth,
          cardHeight,
          isSelected ? 0x4a3520 : 0x241a13,
          1
        )
        .setStrokeStyle(isSelected ? 3 : 2, isSelected ? 0xd4af37 : 0x766044, 0.95)
        .setInteractive({ useHandCursor: true });

      const roleBadge = {
        hard_filter: 'KEY EVIDENCE',
        soft_clue: 'TRACE CLUE',
        red_herring: 'INCONCLUSIVE',
        future_filter: 'PENDING'
      }[clue.role] || 'CLUE';

      const badge = this.add
        .text(0, -cardHeight / 2 + 14, `${clue.label} · ${roleBadge}`, {
          fontFamily: 'PressStart2P',
          fontSize: '7px',
          color: '#ffdc73',
          align: 'center',
          wordWrap: { width: cardWidth - 20, useAdvancedWrap: true }
        })
        .setOrigin(0.5, 0);

      const introText = this.add
        .text(0, 4, clue.introText, {
          fontFamily: 'Special Elite',
          fontSize: '12px',
          color: '#e9dbbb',
          align: 'center',
          wordWrap: { width: cardWidth - 20, useAdvancedWrap: true }
        })
        .setOrigin(0.5);

      card.add([bg, badge, introText]);

      bg.on('pointerdown', () => {
        this.selectedClueId = clue.id;
        this.feedbackText.setText('');
        this.refreshAll();
      });

      this.clueRailContainer.add(card);
    });
  }

  renderSuspectGrid() {
    const { width, height } = this.scale;

    if (!this.suspects.length) {
      const empty = this.add
        .text(width / 2, height / 2, 'No suspects remain in this pool.', {
          fontFamily: 'Special Elite',
          fontSize: '22px',
          color: '#d9c998',
          align: 'center'
        })
        .setOrigin(0.5);

      this.suspectGridContainer.add(empty);
      return;
    }

    const columns = Math.min(3, this.suspects.length);
    const rows = Math.ceil(this.suspects.length / columns);

    const cardWidth = 260;
    const cardHeight = 200;
    const gapX = 20;
    const gapY = 20;

    const gridWidth = columns * cardWidth + (columns - 1) * gapX;
    const startX = width / 2 - gridWidth / 2 + cardWidth / 2;
    const startY = 290;

    this.suspects.forEach((suspect, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);

      const x = startX + column * (cardWidth + gapX);
      const y = startY + row * (cardHeight + gapY);

      const card = this.createSuspectCard(suspect, x, y, cardWidth, cardHeight);
      this.suspectGridContainer.add(card);
    });
  }

  createSuspectCard(suspect, x, y, width, height) {
    const mark = this.marksBySuspectId[suspect.id] || 'possible';
    const isRuledOut = mark === 'ruled_out';

    const card = this.add.container(x, y);

    const backgroundColor = isRuledOut ? 0x2c211e : 0x241a13;
    const borderColor = isRuledOut ? 0x8e3d34 : 0x766044;

    const bg = this.add
      .rectangle(0, 0, width, height, backgroundColor, 1)
      .setStrokeStyle(2, borderColor, 0.95);

    const name = this.add
      .text(0, -height / 2 + 18, suspect.name || 'Unknown', {
        fontFamily: 'Special Elite',
        fontSize: '20px',
        color: isRuledOut ? '#b8a39d' : '#fff0cd',
        align: 'center',
        wordWrap: { width: width - 24, useAdvancedWrap: true }
      })
      .setOrigin(0.5, 0);

    const occupation = this.add
      .text(0, -height / 2 + 46, suspect.occupation || 'Unknown role', {
        fontFamily: 'Special Elite',
        fontSize: '14px',
        color: isRuledOut ? '#9a8581' : '#dfca9e',
        align: 'center',
        wordWrap: { width: width - 24, useAdvancedWrap: true }
      })
      .setOrigin(0.5, 0);

    const resultLine = this.add
      .text(0, 4, this.getLastResultText(suspect.id), {
        fontFamily: 'Special Elite',
        fontSize: '12px',
        color: '#ffdc73',
        align: 'center',
        wordWrap: { width: width - 28, useAdvancedWrap: true }
      })
      .setOrigin(0.5);

    card.add([bg, name, occupation, resultLine]);

    const checkButton = this.createUiButton({
      x: -width / 4,
      y: height / 2 - 30,
      width: width / 2 - 16,
      height: 32,
      label: '[ CHECK ]',
      fontSize: '8px',
      depth: 1,
      normalFill: 0x3a3320,
      hoverFill: 0x5c5230,
      normalColor: '#ffe8a3',
      hoverColor: '#ffffff',
      onClick: () => this.checkSuspectAgainstClue(suspect)
    });

    const excludeButton = this.createUiButton({
      x: width / 4,
      y: height / 2 - 30,
      width: width / 2 - 16,
      height: 32,
      label: isRuledOut ? '[ RESTORE ]' : '[ RULE OUT ]',
      fontSize: '8px',
      depth: 1,
      normalFill: isRuledOut ? 0x2f4a33 : 0x4a231d,
      hoverFill: isRuledOut ? 0x3f643f : 0x6b3328,
      normalColor: '#f6e7bf',
      hoverColor: '#ffffff',
      onClick: () => this.toggleSuspectMark(suspect.id)
    });

    card.add([checkButton, excludeButton]);

    if (isRuledOut) {
      const stamp = this.add
        .text(0, -20, 'RULED OUT', {
          fontFamily: 'PressStart2P',
          fontSize: '16px',
          color: '#db5750',
          stroke: '#1f0d0b',
          strokeThickness: 5
        })
        .setOrigin(0.5)
        .setAngle(-12)
        .setAlpha(0.9);

      card.add(stamp);
    }

    return card;
  }

  getLastResultText(suspectId) {
    const key = `${suspectId}_${this.selectedClueId}`;
    return this.lastResultBySuspectClue[key] || '';
  }

  checkSuspectAgainstClue(suspect) {
    const clue = this.clueCards.find(
      (item) => item.id === this.selectedClueId
    );

    if (!clue) return;

    const entry = clue.registryEntry;
    let text = '';

    if (typeof entry.matches === 'function' && entry.suspectField) {
      const suspectValue = getByPath(suspect, entry.suspectField);
      const isMatch = entry.matches(suspectValue, clue.value);

      const template = pickRandomTemplate(
        isMatch ? entry.clueTemplates : entry.eliminateTemplates
      );

      text = fillTemplate(template, {
        name: suspect.name,
        value: clue.value,
        suspectValue
      });
    } else {
      const templates =
        clue.role === 'soft_clue'
          ? entry.redHerringTemplates || entry.clueTemplates
          : entry.clueTemplates;

      const template = pickRandomTemplate(templates);

      text = fillTemplate(template, {
        name: suspect.name,
        ...clue.templateParams
      });
    }

    this.lastResultBySuspectClue[`${suspect.id}_${clue.id}`] = text;
    this.feedbackText.setText(text);

    this.refreshAll();
  }

  toggleSuspectMark(suspectId) {
    const currentMark = this.marksBySuspectId[suspectId] || 'possible';

    this.marksBySuspectId[suspectId] =
      currentMark === 'ruled_out' ? 'possible' : 'ruled_out';

    this.saveMarks();
    this.refreshAll();
  }

  saveMarks() {
    const caseForensics = this.labManager.ensureCaseForensics();

    caseForensics.suspectGrid.marksBySuspectId = {
      ...this.marksBySuspectId
    };

    caseForensics.suspectGrid.eliminatedSuspectIds = Object.entries(
      this.marksBySuspectId
    )
      .filter(([, mark]) => mark === 'ruled_out')
      .map(([suspectId]) => suspectId);

    saveGameState();
  }

  finalizeGrid() {
    const remaining = this.suspects.filter(
      (suspect) => this.marksBySuspectId[suspect.id] !== 'ruled_out'
    );

    if (remaining.length !== 2) {
      this.feedbackText.setText(
        `You have ${remaining.length} suspect(s) left. Narrow it down to exactly two before finalizing.`
      );
      return;
    }

    const caseForensics = this.labManager.ensureCaseForensics();

    caseForensics.suspectGrid.completed = true;
    caseForensics.suspectGrid.completedAt = Date.now();
    caseForensics.suspectGrid.marksBySuspectId = { ...this.marksBySuspectId };

    this.gameState.finalTwoSuspectIds = remaining.map(
      (suspect) => suspect.id
    );

    saveGameState();

    this.feedbackText.setText(
      'Two suspects remain. One of them is lying about far more than an alibi.'
    );

    this.time.delayedCall(1400, () => this.closeScene());
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
    this.refreshAll();
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

  cleanupScene() {
    if (this.resizeHandler) {
      this.scale.off('resize', this.resizeHandler);
    }

    this.resizeHandler = null;

    this.clueRailContainer?.destroy();
    this.suspectGridContainer?.destroy();

    [this.backButton, this.finishButton].forEach((button) => {
      button?.removeAllListeners?.();
      button?.destroy?.();
    });

    this.feedbackText?.destroy();
  }
}