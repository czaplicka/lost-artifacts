import { gameState, saveGameState } from '../GameData.js';
import { BaseScene } from './BaseScene.js';
import {
  getPublicSuspectList,
  getSuspectCaseSummary
} from '../suspectUtils.js';

export class SuspectsScene extends BaseScene {
  constructor() {
    /*
     * Keep this key compatible with CrimeLabScene:
     * this.scene.start('SuspectBoardScene', ...)
     */
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

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
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

  createFilters() {
    const { width } = this.scale;

    const filters = [
      { id: 'all', label: 'ALL FILES' },
      { id: 'active', label: 'ACTIVE' },
      { id: 'eliminated', label: 'ELIMINATED' }
    ];

    const gap = 14;
    const buttonWidth = 142;
    const totalWidth = filters.length * buttonWidth + (filters.length - 1) * gap;
    const startX = width / 2 - totalWidth / 2 + buttonWidth / 2;

    filters.forEach((filter, index) => {
      const x = startX + index * (buttonWidth + gap);

      const button = this.add
        .text(x, 136, filter.label, {
          fontFamily: 'PressStart2P',
          fontSize: '9px',
          color: '#d8c59b',
          backgroundColor: '#2d2118',
          padding: {
            left: 10,
            right: 10,
            top: 10,
            bottom: 10
          }
        })
        .setOrigin(0.5)
        .setDepth(15)
        .setInteractive({ useHandCursor: true });

      button.filterId = filter.id;

      button.on('pointerover', () => {
        if (this.filterMode === filter.id) return;

        button.setStyle({
          color: '#fff4d6',
          backgroundColor: '#4b3322'
        });
      });

      button.on('pointerout', () => {
        this.updateFilterButtonStyles();
      });

      button.on('pointerdown', () => {
        this.filterMode = filter.id;
        this.currentPage = 0;
        this.refreshBoard();
      });

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

    this.previousPageButton = this.add
      .text(50, height - 28, '◀', {
        fontFamily: 'Special Elite',
        fontSize: '34px',
        color: '#d4af37'
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setInteractive({ useHandCursor: true });

    this.nextPageButton = this.add
      .text(120, height - 28, '▶', {
        fontFamily: 'Special Elite',
        fontSize: '34px',
        color: '#d4af37'
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setInteractive({ useHandCursor: true });

    this.pageText = this.add
      .text(185, height - 28, '', {
        fontFamily: 'PressStart2P',
        fontSize: '9px',
        color: '#d9c998'
      })
      .setOrigin(0, 0.5)
      .setDepth(30);

    this.closeButton = this.add
      .text(width - 28, height - 28, '[ RETURN ]', {
        fontFamily: 'PressStart2P',
        fontSize: '9px',
        color: '#f6e7bf',
        backgroundColor: '#3a201b',
        padding: {
          left: 10,
          right: 10,
          top: 8,
          bottom: 8
        }
      })
      .setOrigin(1, 0.5)
      .setDepth(30)
      .setInteractive({ useHandCursor: true });

    this.previousPageButton.on('pointerdown', () => {
      if (this.currentPage <= 0) return;

      this.currentPage -= 1;
      this.refreshBoard();
    });

    this.nextPageButton.on('pointerdown', () => {
      const pageCount = this.getPageCount();

      if (this.currentPage >= pageCount - 1) return;

      this.currentPage += 1;
      this.refreshBoard();
    });

    this.closeButton.on('pointerover', () => {
      this.closeButton.setStyle({
        color: '#ffffff',
        backgroundColor: '#6b3328'
      });
    });

    this.closeButton.on('pointerout', () => {
      this.closeButton.setStyle({
        color: '#f6e7bf',
        backgroundColor: '#3a201b'
      });
    });

    this.closeButton.on('pointerdown', () => {
      this.closeScene();
    });
  }

  getAllSuspects() {
    try {
      return getPublicSuspectList();
    } catch (error) {
      console.error('[SuspectsScene] Could not load suspect list.', error);
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
    const { width } = this.scale;

    if (width <= 700) return 4;
    if (width <= 1100) return 6;

    return 10;
  }

  getPageCount() {
    const suspects = this.getFilteredSuspects();
    const cardsPerPage = this.getCardsPerPage();

    return Math.max(1, Math.ceil(suspects.length / cardsPerPage));
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
      !allSuspects.some((suspect) => suspect.id === this.selectedSuspectId)
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
      const isActive = button.filterId === this.filterMode;

      button.setStyle({
        color: isActive ? '#17110c' : '#d8c59b',
        backgroundColor: isActive ? '#d4af37' : '#2d2118'
      });
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

    const contentTop = 192;
    const contentBottom = height - 74;

    const detailsWidth = isMobile ? 0 : isTablet ? 310 : 360;
    const cardsAreaWidth = isMobile
      ? width - 32
      : width - detailsWidth - 54;

    const cardsAreaX = isMobile
      ? width / 2
      : 24 + cardsAreaWidth / 2;

    const columns = isMobile ? 2 : isTablet ? 2 : 5;
    const rows = Math.ceil(suspects.length / columns);

    const gapX = isMobile ? 12 : 16;
    const gapY = isMobile ? 12 : 16;

    const cardWidth = Math.min(
      isMobile ? 230 : isTablet ? 270 : 245,
      (cardsAreaWidth - gapX * (columns - 1)) / columns
    );

    const cardHeight = Math.min(
      isMobile ? 185 : 205,
      (contentBottom - contentTop - gapY * (rows - 1)) / Math.max(1, rows)
    );

    const gridWidth = columns * cardWidth + (columns - 1) * gapX;
    const startX = cardsAreaX - gridWidth / 2 + cardWidth / 2;

    suspects.forEach((suspect, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);

      const x = startX + column * (cardWidth + gapX);
      const y = contentTop + cardHeight / 2 + row * (cardHeight + gapY);

      const card = this.createSuspectCard(
        suspect,
        x,
        y,
        cardWidth,
        cardHeight
      );

      this.cardsContainer.add(card);
    });

    if (!isMobile) {
      this.renderDetailsPanel();
    }
  }

  createSuspectCard(suspect, x, y, width, height) {
    const isSelected = suspect.id === this.selectedSuspectId;
    const isEliminated = Boolean(suspect.deductionState?.eliminated);

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
      .setInteractive(
        new Phaser.Geom.Rectangle(
          -width / 2,
          -height / 2,
          width,
          height
        ),
        Phaser.Geom.Rectangle.Contains
      );

    const fileNumber = this.getSuspectFileNumber(suspect.id);

    const fileLabel = this.add
      .text(-width / 2 + 12, -height / 2 + 12, `FILE ${fileNumber}`, {
        fontFamily: 'PressStart2P',
        fontSize: '8px',
        color: isEliminated ? '#d07f75' : '#bba276'
      })
      .setOrigin(0, 0);

    const name = this.add
      .text(0, -height / 2 + 34, suspect.name || 'Unknown', {
        fontFamily: 'Special Elite',
        fontSize: width < 210 ? '20px' : '23px',
        color: isEliminated ? '#b8a39d' : '#fff0cd',
        align: 'center',
        wordWrap: {
          width: width - 24,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5, 0);

    const occupation = this.add
      .text(0, -height / 2 + 82, suspect.occupation || 'Unknown role', {
        fontFamily: 'Special Elite',
        fontSize: '16px',
        color: isEliminated ? '#9a8581' : '#dfca9e',
        align: 'center',
        wordWrap: {
          width: width - 28,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5, 0);

    const traits = Array.isArray(suspect.visibleTraits)
      ? suspect.visibleTraits.slice(0, 2)
      : [];

    const traitsText = traits.length
      ? traits.map((trait) => `• ${trait}`).join('\n')
      : '• No visible notes';

    const visibleTraits = this.add
      .text(-width / 2 + 14, 16, traitsText, {
        fontFamily: 'Special Elite',
        fontSize: '14px',
        color: isEliminated ? '#9c8984' : '#e9dbbb',
        lineSpacing: 3,
        wordWrap: {
          width: width - 28,
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
        align: 'center'
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
          fontSize: width < 210 ? '15px' : '18px',
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
      if (isEliminated) return;

      bg.setFillStyle(0x514027, 1);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(backgroundColor, 1);
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
    const index = allSuspects.findIndex((suspect) => suspect.id === suspectId);

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

    const panelWidth = width <= 1100 ? 286 : 336;
    const panelX = width - panelWidth / 2 - 18;
    const panelY = (height - 56 + 170) / 2 + 20;
    const panelHeight = height - 210;

    const panelBg = this.add
      .rectangle(panelX, panelY, panelWidth, panelHeight, 0x211711, 0.98)
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

    const isEliminated = Boolean(selected.deductionState?.eliminated);
    const details = this.buildDetailsText(selected);

    const heading = this.add
      .text(panelX, panelY - panelHeight / 2 + 18, 'CASE NOTES', {
        fontFamily: 'PressStart2P',
        fontSize: '10px',
        color: '#d4af37'
      })
      .setOrigin(0.5, 0);

    const suspectName = this.add
      .text(panelX, panelY - panelHeight / 2 + 48, selected.name, {
        fontFamily: 'Special Elite',
        fontSize: '26px',
        color: isEliminated ? '#b69891' : '#fff0cd',
        align: 'center',
        wordWrap: {
          width: panelWidth - 34,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5, 0);

    const body = this.add
      .text(panelX - panelWidth / 2 + 16, panelY - panelHeight / 2 + 108, details, {
        fontFamily: 'Special Elite',
        fontSize: width <= 1100 ? '15px' : '17px',
        color: '#e2d1ad',
        lineSpacing: 6,
        wordWrap: {
          width: panelWidth - 32,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0, 0);

    this.detailsContainer.add([heading, suspectName, body]);

    if (isEliminated) {
      const clearedStamp = this.add
        .text(panelX, panelY + panelHeight / 2 - 38, 'EXCLUDED FROM CURRENT LEADS', {
          fontFamily: 'PressStart2P',
          fontSize: '8px',
          color: '#ec726a',
          align: 'center',
          wordWrap: {
            width: panelWidth - 30,
            useAdvancedWrap: true
          }
        })
        .setOrigin(0.5);

      this.detailsContainer.add(clearedStamp);
    }
  }

  buildDetailsText(suspect) {
    const state = suspect.deductionState || {};
    const forensic = suspect.restrictedProfile?.forensicAttributes || {};
    const visibleTraits = Array.isArray(suspect.visibleTraits)
      ? suspect.visibleTraits
      : [];

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

    const forensicEntries = Object.entries(forensic);

    if (!forensicEntries.length) {
      lines.push('• Police records pending');
    } else {
      forensicEntries.forEach(([field, data]) => {
        const label = this.formatEvidenceField(field);
        const value = data?.value || 'pending';

        lines.push(`• ${label}: ${String(value).toUpperCase()}`);
      });
    }

    lines.push('\nDeduction status:');
    lines.push(`• Lab: ${this.formatStatus(state.labStatus)}`);
    lines.push(`• Method: ${this.formatStatus(state.hypothesisStatus)}`);
    lines.push(`• Interview: ${this.formatStatus(state.interviewStatus)}`);
    lines.push(`• Alibi: ${this.formatStatus(state.alibiStatus)}`);

    if (Array.isArray(state.eliminationReasons) && state.eliminationReasons.length) {
      lines.push('\nWhy cleared:');

      state.eliminationReasons.forEach((reason) => {
        lines.push(`• ${reason.label || 'Evidence'}`);

        if (reason.note) {
          lines.push(`  ${reason.note}`);
        }
      });
    }

    if (Array.isArray(state.notesUnlocked) && state.notesUnlocked.length) {
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
      .setDepth(100);

    const panel = this.add
      .rectangle(width / 2, height / 2, width - 36, height - 90, 0x211711, 1)
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

    const close = this.add
      .text(width / 2, height - 54, '[ CLOSE FILE ]', {
        fontFamily: 'PressStart2P',
        fontSize: '10px',
        color: '#20150e',
        backgroundColor: '#d4af37',
        padding: {
          left: 12,
          right: 12,
          top: 10,
          bottom: 10
        }
      })
      .setOrigin(0.5)
      .setDepth(102)
      .setInteractive({ useHandCursor: true });

    const closeDetails = () => {
      [
        overlay,
        panel,
        title,
        body,
        close
      ].forEach((item) => {
        item.removeAllListeners?.();
        item.destroy();
      });
    };

    overlay.on('pointerdown', closeDetails);
    close.on('pointerdown', closeDetails);
  }

  updatePagination() {
    const pageCount = this.getPageCount();
    const hasMultiplePages = pageCount > 1;

    this.previousPageButton.setVisible(hasMultiplePages);
    this.nextPageButton.setVisible(hasMultiplePages);
    this.pageText.setVisible(hasMultiplePages);

    if (!hasMultiplePages) return;

    this.pageText.setText(`PAGE ${this.currentPage + 1}/${pageCount}`);

    this.previousPageButton.setColor(
      this.currentPage > 0 ? '#d4af37' : '#604e32'
    );

    this.nextPageButton.setColor(
      this.currentPage < pageCount - 1 ? '#d4af37' : '#604e32'
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

    const filters = this.filterButtons;
    const gap = 14;
    const buttonWidth = 142;
    const totalWidth = filters.length * buttonWidth + (filters.length - 1) * gap;
    const startX = width / 2 - totalWidth / 2 + buttonWidth / 2;

    filters.forEach((button, index) => {
      button.setPosition(startX + index * (buttonWidth + gap), 136);
    });

    this.previousPageButton.setPosition(50, height - 28);
    this.nextPageButton.setPosition(120, height - 28);
    this.pageText.setPosition(185, height - 28);
    this.closeButton.setPosition(width - 28, height - 28);

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