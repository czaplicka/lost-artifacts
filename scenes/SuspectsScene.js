import { gameState } from '../GameData.js';
import { saveGameState } from '../GameStatePersistence.js';
import { BaseScene } from './BaseScene.js';
import {
  getPublicSuspectList,
  getSuspectCaseSummary
} from '../suspectUtils.js';

export class SuspectsScene extends BaseScene {
  constructor() {
    super('SuspectBoardScene');

    this.gameState = gameState;
    this.cityId = null;
    this.returnScene = 'CityScene';
    this.returnData = {};

    this.selectedSuspectId = null;
    this.filterMode = 'all';
    this.currentPage = 0;

    this.headerText = null;
    this.summaryText = null;
    this.filterButtons = [];
    this.cardsContainer = null;
    this.detailsContainer = null;
    this.emptyText = null;
    this.pageText = null;
    this.previousPageButton = null;
    this.nextPageButton = null;
    this.closeButton = null;

    this.resizeHandler = null;
  }

  init(data = {}) {
    this.gameState = data.gameState || gameState;

    this.cityId =
      data.cityId ||
      this.gameState.currentMission?.city ||
      this.gameState.currentCityId ||
      this.gameState.crimeCityId ||
      'Unknown City';

    this.returnScene =
      typeof data.returnScene === 'string' && data.returnScene.trim()
        ? data.returnScene.trim()
        : 'CityScene';

    this.returnData = {
      cityId: this.cityId,
      ...(data.returnData || {})
    };

    this.selectedSuspectId =
      data.selectedSuspectId ||
      this.gameState.selectedSuspectId ||
      null;

    this.filterMode = 'all';
    this.currentPage = 0;
  }

  create() {
    super.create();

    this.cameras.main.setBackgroundColor('#16110d');

    this.createBackground();
    this.createHeader();
    this.createFilters();
    this.createContentContainers();
    this.createNavigation();

    this.refreshBoard();

    this.resizeHandler = () => {
      this.rebuildScene();
    };

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
      .rectangle(0, 0, width, height, 0x16110d, 1)
      .setOrigin(0, 0)
      .setDepth(-10);

    this.add
      .rectangle(0, 0, width, 110, 0x261a12, 1)
      .setOrigin(0, 0)
      .setDepth(-9);

    this.add
      .rectangle(0, 108, width, 3, 0xd4af37, 0.9)
      .setOrigin(0, 0)
      .setDepth(-8);

    this.add
      .rectangle(0, height - 56, width, 56, 0x120d0a, 0.95)
      .setOrigin(0, 0)
      .setDepth(-8);
  }

  createHeader() {
    const { width } = this.scale;

    this.headerText = this.add
      .text(width / 2, 24, 'SUSPECT FILES', {
        fontFamily: 'Special Elite',
        fontSize: '34px',
        color: '#f5e7c6',
        align: 'center'
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this.summaryText = this.add
      .text(width / 2, 70, '', {
        fontFamily: 'PressStart2P',
        fontSize: '10px',
        color: '#d9c998',
        align: 'center'
      })
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
      .setInteractive({
        useHandCursor: true
      });

    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'PressStart2P',
        fontSize,
        color: normalColor,
        align: 'center',
        wordWrap: {
          width: width - 18,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5);

    container.add([background, text]);

    container.buttonBackground = background;
    container.buttonText = text;
    container.buttonLabel = label;
    container.buttonStyle = {
      normalFill,
      hoverFill,
      normalColor,
      hoverColor,
      activeFill,
      activeColor
    };
    container.isActive = false;

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

  setButtonEnabled(button, enabled) {
    if (!button?.buttonBackground || !button?.buttonText) return;

    button.setAlpha(enabled ? 1 : 0.45);

    if (enabled) {
      button.buttonBackground.setInteractive({
        useHandCursor: true
      });
    } else {
      button.buttonBackground.disableInteractive();
    }
  }

  createFilters() {
    const { width } = this.scale;

    const filters = [
      { id: 'all', label: 'ALL FILES' },
      { id: 'active', label: 'ACTIVE' },
      { id: 'eliminated', label: 'ELIMINATED' }
    ];

    const gap = 14;
    const buttonWidth = Math.min(
      150,
      Math.max(106, (width - 48 - gap * 2) / 3)
    );
    const buttonHeight = 40;
    const totalWidth =
      filters.length * buttonWidth +
      (filters.length - 1) * gap;

    const startX =
      width / 2 - totalWidth / 2 + buttonWidth / 2;

    filters.forEach((filter, index) => {
      const button = this.createUiButton({
        x: startX + index * (buttonWidth + gap),
        y: 142,
        width: buttonWidth,
        height: buttonHeight,
        label: filter.label,
        onClick: () => {
          this.filterMode = filter.id;
          this.currentPage = 0;
          this.refreshBoard();
        }
      });

      button.filterId = filter.id;
      this.filterButtons.push(button);
    });
  }

  createContentContainers() {
    this.cardsContainer = this.add.container(0, 0).setDepth(5);
    this.detailsContainer = this.add.container(0, 0).setDepth(6);

    this.emptyText = this.add
      .text(0, 0, '', {
        fontFamily: 'Special Elite',
        fontSize: '24px',
        color: '#d9c998',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false);
  }

  createNavigation() {
    const { width, height } = this.scale;

    this.previousPageButton = this.createUiButton({
      x: 38,
      y: height - 28,
      width: 46,
      height: 38,
      label: '◀',
      fontSize: '22px',
      depth: 30,
      normalFill: 0x211711,
      hoverFill: 0x4b3322,
      normalColor: '#d4af37',
      hoverColor: '#fff4d6',
      onClick: () => {
        if (this.currentPage <= 0) return;

        this.currentPage -= 1;
        this.refreshBoard();
      }
    });

    this.nextPageButton = this.createUiButton({
      x: 94,
      y: height - 28,
      width: 46,
      height: 38,
      label: '▶',
      fontSize: '22px',
      depth: 30,
      normalFill: 0x211711,
      hoverFill: 0x4b3322,
      normalColor: '#d4af37',
      hoverColor: '#fff4d6',
      onClick: () => {
        const pageCount = this.getPageCount();

        if (this.currentPage >= pageCount - 1) return;

        this.currentPage += 1;
        this.refreshBoard();
      }
    });

    this.pageText = this.add
      .text(126, height - 28, '', {
        fontFamily: 'PressStart2P',
        fontSize: '9px',
        color: '#d9c998'
      })
      .setOrigin(0, 0.5)
      .setDepth(30);

    this.closeButton = this.createUiButton({
      x: width - 94,
      y: height - 28,
      width: 138,
      height: 38,
      label: '[ RETURN ]',
      fontSize: '9px',
      depth: 30,
      normalFill: 0x3a201b,
      hoverFill: 0x6b3328,
      normalColor: '#f6e7bf',
      hoverColor: '#ffffff',
      onClick: () => {
        this.closeScene();
      }
    });
  }

  getAllSuspects() {
    try {
      return getPublicSuspectList();
    } catch (error) {
      console.error(
        '[SuspectsScene] Could not load suspect list.',
        error
      );

      return [];
    }
  }

  getFilteredSuspects() {
    const suspects = this.getAllSuspects();

    if (this.filterMode === 'active') {
      return suspects.filter(
        (suspect) => !suspect.deductionState?.eliminated
      );
    }

    if (this.filterMode === 'eliminated') {
      return suspects.filter(
        (suspect) => suspect.deductionState?.eliminated
      );
    }

    return suspects;
  }

  getCardsPerPage() {
    return 4;
  }

  getPageCount() {
    const suspects = this.getFilteredSuspects();
    const cardsPerPage = this.getCardsPerPage();

    return Math.max(
      1,
      Math.ceil(suspects.length / cardsPerPage)
    );
  }

  getVisibleSuspects() {
    const suspects = this.getFilteredSuspects();
    const cardsPerPage = this.getCardsPerPage();
    const pageCount = this.getPageCount();

    if (this.currentPage > pageCount - 1) {
      this.currentPage = pageCount - 1;
    }

    const start = this.currentPage * cardsPerPage;

    return suspects.slice(start, start + cardsPerPage);
  }

  refreshBoard() {
    this.clearContainer(this.cardsContainer);
    this.clearContainer(this.detailsContainer);

    const allSuspects = this.getAllSuspects();
    const visibleSuspects = this.getVisibleSuspects();

    if (
      !this.selectedSuspectId ||
      !allSuspects.some(
        (suspect) => suspect.id === this.selectedSuspectId
      )
    ) {
      this.selectedSuspectId = visibleSuspects[0]?.id || null;
    }

    this.updateHeader();
    this.updateFilterButtonStyles();
    this.renderSuspectCards(visibleSuspects);
    this.renderDetailsPanel();
    this.updatePagination();
  }

  updateHeader() {
    let summary;

    try {
      summary = getSuspectCaseSummary();
    } catch (error) {
      summary = {
        total: 0,
        active: 0,
        eliminated: 0,
        crimeLabCompleted: false,
        hypothesisCompleted: false
      };
    }

    const labLabel = summary.crimeLabCompleted
      ? 'LAB: COMPLETE'
      : 'LAB: PENDING';

    const hypothesisLabel = summary.hypothesisCompleted
      ? 'METHOD: CONFIRMED'
      : 'METHOD: PENDING';

    this.summaryText.setText(
      `FILES: ${summary.total}   ACTIVE: ${summary.active}   CLEARED: ${summary.eliminated}   ${labLabel}   ${hypothesisLabel}`
    );
  }

  updateFilterButtonStyles() {
    this.filterButtons.forEach((button) => {
      button.isActive = button.filterId === this.filterMode;
      button.applyStyle?.();
    });
  }

  renderSuspectCards(suspects) {
    const { width, height } = this.scale;
    const isMobile = width <= 700;
    const isTablet = width > 700 && width <= 1100;

    if (!suspects.length) {
      this.emptyText
        .setText('No suspect files match this filter.')
        .setPosition(width / 2, height / 2)
        .setVisible(true);

      return;
    }

    this.emptyText.setVisible(false);

    const contentTop = 184;
    const contentBottom = height - 72;

    const detailsWidth = isMobile ? 0 : isTablet ? 350 : 450;
    const sidePadding = isMobile ? 18 : 24;
    const panelGap = isMobile ? 0 : 22;

    const cardsAreaWidth = isMobile
      ? width - sidePadding * 2
      : width - detailsWidth - panelGap - sidePadding * 2;

    const cardsAreaX = isMobile
      ? width / 2
      : sidePadding + cardsAreaWidth / 2;

    const columns = isMobile ? 1 : 2;
    const rows = Math.ceil(suspects.length / columns);

    const gapX = isMobile ? 0 : 18;
    const gapY = 16;

    const cardWidth = Math.min(
      isMobile ? width - 36 : 360,
      (cardsAreaWidth - gapX * (columns - 1)) / columns
    );

    const availableHeight = contentBottom - contentTop;

    const cardHeight = Math.max(
      142,
      Math.min(
        260,
        (availableHeight - gapY * (rows - 1)) / Math.max(1, rows)
      )
    );

    const gridWidth =
      columns * cardWidth +
      (columns - 1) * gapX;

    const startX =
      cardsAreaX - gridWidth / 2 + cardWidth / 2;

    suspects.forEach((suspect, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);

      const x = startX + column * (cardWidth + gapX);
      const y =
        contentTop +
        cardHeight / 2 +
        row * (cardHeight + gapY);

      const card = this.createSuspectCard(
        suspect,
        x,
        y,
        cardWidth,
        cardHeight
      );

      this.cardsContainer.add(card);
    });
  }

  createSuspectCard(suspect, x, y, width, height) {
    const isSelected = suspect.id === this.selectedSuspectId;
    const isEliminated = Boolean(
      suspect.deductionState?.eliminated
    );

    const card = this.add.container(x, y);

    const backgroundColor = isEliminated
      ? 0x2c211e
      : isSelected
        ? 0x4a3520
        : 0x2a2018;

    const borderColor = isEliminated
      ? 0x8e3d34
      : isSelected
        ? 0xd4af37
        : 0x766044;

    const bg = this.add
      .rectangle(0, 0, width, height, backgroundColor, 1)
      .setStrokeStyle(isSelected ? 3 : 2, borderColor, 0.95)
      .setInteractive({
        useHandCursor: true
      });

    const fileNumber = this.getSuspectFileNumber(suspect.id);

    const fileLabel = this.add
      .text(
        -width / 2 + 14,
        -height / 2 + 14,
        `FILE ${fileNumber}`,
        {
          fontFamily: 'PressStart2P',
          fontSize: '8px',
          color: isEliminated ? '#d07f75' : '#bba276'
        }
      )
      .setOrigin(0, 0);

    const name = this.add
      .text(0, -height / 2 + 38, suspect.name || 'Unknown', {
        fontFamily: 'Special Elite',
        fontSize: width < 230 ? '20px' : '25px',
        color: isEliminated ? '#b8a39d' : '#fff0cd',
        align: 'center',
        wordWrap: {
          width: width - 28,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5, 0);

    const occupation = this.add
      .text(
        0,
        -height / 2 + 88,
        suspect.occupation || 'Unknown role',
        {
          fontFamily: 'Special Elite',
          fontSize: '17px',
          color: isEliminated ? '#9a8581' : '#dfca9e',
          align: 'center',
          wordWrap: {
            width: width - 30,
            useAdvancedWrap: true
          }
        }
      )
      .setOrigin(0.5, 0);

    const traits = Array.isArray(suspect.visibleTraits)
      ? suspect.visibleTraits.slice(0, 2)
      : [];

    const traitsText = traits.length
      ? traits.map((trait) => `• ${trait}`).join('\n')
      : '• No visible notes';

    const visibleTraits = this.add
      .text(-width / 2 + 16, 18, traitsText, {
        fontFamily: 'Special Elite',
        fontSize: '15px',
        color: isEliminated ? '#9c8984' : '#e9dbbb',
        lineSpacing: 4,
        wordWrap: {
          width: width - 32,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0, 0);

    const status = this.getCardStatus(suspect);

    const statusText = this.add
      .text(0, height / 2 - 22, status.label, {
        fontFamily: 'PressStart2P',
        fontSize: '8px',
        color: status.color,
        align: 'center',
        wordWrap: {
          width: width - 24,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5);

    card.add([
      bg,
      fileLabel,
      name,
      occupation,
      visibleTraits,
      statusText
    ]);

    if (isEliminated) {
      const strike = this.add
        .line(
          0,
          0,
          -width / 2 + 10,
          -height / 2 + 12,
          width / 2 - 10,
          height / 2 - 12,
          0xb33c35,
          0.95
        )
        .setLineWidth(5, 5);

      const stamp = this.add
        .text(0, 0, 'CLEARED', {
          fontFamily: 'PressStart2P',
          fontSize: width < 230 ? '15px' : '18px',
          color: '#db5750',
          stroke: '#1f0d0b',
          strokeThickness: 5
        })
        .setOrigin(0.5)
        .setAngle(-12)
        .setAlpha(0.9);

      card.add([strike, stamp]);
    }

    bg.on('pointerover', () => {
      if (isEliminated || isSelected) return;

      bg.setFillStyle(0x514027, 1);
      bg.setStrokeStyle(2, 0xd4af37, 1);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(backgroundColor, 1);
      bg.setStrokeStyle(
        isSelected ? 3 : 2,
        borderColor,
        0.95
      );
    });

    bg.on('pointerdown', () => {
      this.selectedSuspectId = suspect.id;
      this.gameState.selectedSuspectId = suspect.id;

      saveGameState();

      if (this.scale.width <= 700) {
        this.showMobileDetails(suspect);
        return;
      }

      this.refreshBoard();
    });

    return card;
  }

  getSuspectFileNumber(suspectId) {
    const allSuspects = this.getAllSuspects();

    const index = allSuspects.findIndex(
      (suspect) => suspect.id === suspectId
    );

    return String(index + 1).padStart(2, '0');
  }

  getCardStatus(suspect) {
    const state = suspect.deductionState || {};

    if (state.eliminated) {
      const reason = state.eliminationReasons?.[0];

      return {
        label: reason?.label
          ? `CLEARED: ${String(reason.label).toUpperCase()}`
          : 'CLEARED',
        color: '#e6766e'
      };
    }

    if (state.alibiStatus === 'contradicted') {
      return {
        label: 'ALIBI QUESTIONED',
        color: '#ffb347'
      };
    }

    if (state.interviewStatus === 'suspicious') {
      return {
        label: 'WITNESS CONCERN',
        color: '#ffb347'
      };
    }

    if (state.hypothesisStatus === 'match') {
      return {
        label: 'METHOD MATCH',
        color: '#ffd966'
      };
    }

    if (state.labStatus === 'match') {
      return {
        label: 'LAB CONSISTENT',
        color: '#f0ddb0'
      };
    }

    return {
      label: 'UNDER REVIEW',
      color: '#b6aa90'
    };
  }

  renderDetailsPanel() {
    const { width, height } = this.scale;

    if (width <= 700) return;

    const selected = this.getAllSuspects().find(
      (suspect) => suspect.id === this.selectedSuspectId
    );

    const isTablet = width <= 1100;
    const panelWidth = isTablet ? 330 : 430;
    const panelX = width - panelWidth / 2 - 20;
    const panelTop = 184;
    const panelBottom = height - 72;
    const panelHeight = panelBottom - panelTop;
    const panelY = panelTop + panelHeight / 2;

    const panelBg = this.add
      .rectangle(
        panelX,
        panelY,
        panelWidth,
        panelHeight,
        0x211711,
        0.98
      )
      .setStrokeStyle(2, 0x8b6c38, 0.9);

    this.detailsContainer.add(panelBg);

    if (!selected) {
      const noSelection = this.add
        .text(panelX, panelY, 'Select a suspect file.', {
          fontFamily: 'Special Elite',
          fontSize: '20px',
          color: '#dcc99e',
          align: 'center'
        })
        .setOrigin(0.5);

      this.detailsContainer.add(noSelection);
      return;
    }

    const isEliminated = Boolean(
      selected.deductionState?.eliminated
    );

    const details = this.buildDetailsText(selected);

    const heading = this.add
      .text(panelX, panelTop + 18, 'CASE NOTES', {
        fontFamily: 'PressStart2P',
        fontSize: '10px',
        color: '#d4af37'
      })
      .setOrigin(0.5, 0);

    const suspectName = this.add
      .text(panelX, panelTop + 48, selected.name, {
        fontFamily: 'Special Elite',
        fontSize: isTablet ? '25px' : '29px',
        color: isEliminated ? '#b69891' : '#fff0cd',
        align: 'center',
        wordWrap: {
          width: panelWidth - 34,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5, 0);

    const body = this.add
      .text(
        panelX - panelWidth / 2 + 18,
        panelTop + 110,
        details,
        {
          fontFamily: 'Special Elite',
          fontSize: isTablet ? '16px' : '18px',
          color: '#e2d1ad',
          lineSpacing: 6,
          wordWrap: {
            width: panelWidth - 36,
            useAdvancedWrap: true
          }
        }
      )
      .setOrigin(0, 0);

    this.detailsContainer.add([
      heading,
      suspectName,
      body
    ]);

    if (isEliminated) {
      const clearedStamp = this.add
        .text(
          panelX,
          panelBottom - 18,
          'EXCLUDED FROM CURRENT LEADS',
          {
            fontFamily: 'PressStart2P',
            fontSize: '8px',
            color: '#ec726a',
            align: 'center',
            wordWrap: {
              width: panelWidth - 30,
              useAdvancedWrap: true
            }
          }
        )
        .setOrigin(0.5, 1);

      this.detailsContainer.add(clearedStamp);
    }
  }

  buildDetailsText(suspect) {
    const state = suspect.deductionState || {};
    const restrictedProfile = suspect.restrictedProfile || {};
    const forensic = restrictedProfile.forensicAttributes || {};

    const visibleTraits = Array.isArray(suspect.visibleTraits)
      ? suspect.visibleTraits
      : [];

    const unlockedFields = Array.isArray(
      restrictedProfile.unlockedFields
    )
      ? restrictedProfile.unlockedFields
      : [];

    const unlockedFieldSet = new Set(
      unlockedFields
        .map((field) => {
          if (typeof field === 'string') return field;

          return (
            field?.field ||
            field?.id ||
            field?.key ||
            null
          );
        })
        .filter(Boolean)
    );

    const lines = [];

    lines.push(`Role: ${suspect.occupation || 'Unknown'}`);

    if (suspect.caseConnection) {
      lines.push(`\nConnection:\n${suspect.caseConnection}`);
    }

    lines.push('\nVisible notes:');

    if (visibleTraits.length) {
      visibleTraits.forEach((trait) => {
        lines.push(`• ${trait}`);
      });
    } else {
      lines.push('• No visible traits recorded');
    }

    lines.push('\nForensics:');

    const unlockedForensicEntries = Object.entries(forensic).filter(
      ([field, data]) => {
        return Boolean(data?.unlocked) || unlockedFieldSet.has(field);
      }
    );

    if (!unlockedForensicEntries.length) {
      lines.push('• Lab analysis pending');
    } else {
      unlockedForensicEntries.forEach(([field, data]) => {
        const label = this.formatEvidenceField(field);
        const value = data?.value || 'pending';

        lines.push(
          `• ${label}: ${String(value).toUpperCase()}`
        );
      });
    }

    lines.push('\nDeduction status:');
    lines.push(`• Lab: ${this.formatStatus(state.labStatus)}`);
    lines.push(`• Method: ${this.formatStatus(state.hypothesisStatus)}`);
    lines.push(`• Interview: ${this.formatStatus(state.interviewStatus)}`);
    lines.push(`• Alibi: ${this.formatStatus(state.alibiStatus)}`);

    if (
      Array.isArray(state.eliminationReasons) &&
      state.eliminationReasons.length
    ) {
      lines.push('\nWhy cleared:');

      state.eliminationReasons.forEach((reason) => {
        lines.push(`• ${reason.label || 'Evidence'}`);

        if (reason.note) {
          lines.push(`  ${reason.note}`);
        }
      });
    }

    if (
      Array.isArray(state.notesUnlocked) &&
      state.notesUnlocked.length
    ) {
      lines.push('\nInvestigator notes:');

      state.notesUnlocked.slice(-3).forEach((note) => {
        lines.push(`• ${note}`);
      });
    }

    return lines.join('\n');
  }

  formatEvidenceField(field) {
    const labels = {
      hair_color: 'Hair result',
      eye_color: 'Witness description',
      blood_type: 'Blood result',
      biological_sex: 'DNA profile',
      shoe_size_category: 'Footwear result'
    };

    return labels[field] || String(field).replace(/_/g, ' ');
  }

  formatStatus(status) {
    const labels = {
      pending: 'Pending',
      match: 'Consistent',
      eliminated: 'Excluded',
      locked: 'Locked',
      unlocked: 'Available',
      suspicious: 'Questioned',
      confirmed: 'Confirmed',
      not_applicable: 'Not applicable',
      unverified: 'Unverified',
      corroborated: 'Corroborated',
      contradicted: 'Contradicted'
    };

    return labels[status] || 'Pending';
  }

  showMobileDetails(suspect) {
    const { width, height } = this.scale;

    const overlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.8)
      .setOrigin(0, 0)
      .setDepth(100)
      .setInteractive();

    const panel = this.add
      .rectangle(
        width / 2,
        height / 2,
        width - 36,
        height - 90,
        0x211711,
        1
      )
      .setStrokeStyle(3, 0xd4af37, 0.9)
      .setDepth(101);

    const title = this.add
      .text(width / 2, 72, suspect.name, {
        fontFamily: 'Special Elite',
        fontSize: '28px',
        color: '#fff0cd',
        align: 'center',
        wordWrap: {
          width: width - 70,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5)
      .setDepth(102);

    const body = this.add
      .text(34, 126, this.buildDetailsText(suspect), {
        fontFamily: 'Special Elite',
        fontSize: '17px',
        color: '#e2d1ad',
        lineSpacing: 5,
        wordWrap: {
          width: width - 68,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0, 0)
      .setDepth(102);

    const closeButton = this.createUiButton({
      x: width / 2,
      y: height - 54,
      width: 180,
      height: 42,
      label: '[ CLOSE FILE ]',
      fontSize: '10px',
      depth: 102,
      normalFill: 0xd4af37,
      hoverFill: 0xf0c653,
      normalColor: '#20150e',
      hoverColor: '#20150e'
    });

    const closeDetails = () => {
      [
        overlay,
        panel,
        title,
        body,
        closeButton
      ].forEach((item) => {
        item.removeAllListeners?.();
        item.destroy?.();
      });
    };

    overlay.on('pointerdown', closeDetails);
    closeButton.buttonBackground.on(
      'pointerdown',
      closeDetails
    );
  }

  updatePagination() {
    const pageCount = this.getPageCount();
    const hasMultiplePages = pageCount > 1;

    this.previousPageButton.setVisible(hasMultiplePages);
    this.nextPageButton.setVisible(hasMultiplePages);
    this.pageText.setVisible(hasMultiplePages);

    if (!hasMultiplePages) return;

    this.pageText.setText(
      `PAGE ${this.currentPage + 1}/${pageCount}`
    );

    this.setButtonEnabled(
      this.previousPageButton,
      this.currentPage > 0
    );

    this.setButtonEnabled(
      this.nextPageButton,
      this.currentPage < pageCount - 1
    );
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
    this.cardsContainer?.destroy();
    this.detailsContainer?.destroy();
    this.emptyText?.destroy();

    this.cardsContainer = this.add.container(0, 0).setDepth(5);
    this.detailsContainer = this.add.container(0, 0).setDepth(6);

    this.emptyText = this.add
      .text(0, 0, '', {
        fontFamily: 'Special Elite',
        fontSize: '24px',
        color: '#d9c998',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false);

    const { width, height } = this.scale;

    this.headerText.setPosition(width / 2, 24);
    this.summaryText.setPosition(width / 2, 70);

    const gap = 14;

    const buttonWidth = Math.min(
      150,
      Math.max(106, (width - 48 - gap * 2) / 3)
    );

    const totalWidth =
      this.filterButtons.length * buttonWidth +
      (this.filterButtons.length - 1) * gap;

    const startX =
      width / 2 - totalWidth / 2 + buttonWidth / 2;

    this.filterButtons.forEach((button, index) => {
      button.setPosition(
        startX + index * (buttonWidth + gap),
        142
      );

      button.buttonBackground.setSize(buttonWidth, 40);
    });

    this.previousPageButton.setPosition(38, height - 28);
    this.nextPageButton.setPosition(94, height - 28);
    this.pageText.setPosition(126, height - 28);
    this.closeButton.setPosition(width - 94, height - 28);

    this.refreshBoard();
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
        suspectBoardClosed: true
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

    this.filterButtons.forEach((button) => {
      button.removeAllListeners?.();
      button.destroy?.();
    });

    this.filterButtons = [];

    this.previousPageButton?.removeAllListeners?.();
    this.nextPageButton?.removeAllListeners?.();
    this.closeButton?.removeAllListeners?.();

    this.cardsContainer?.destroy();
    this.detailsContainer?.destroy();
  }
}