// Handles suspect card grid rendering (layout, visuals, interactions)
// and the card status badge logic.

import { saveGameState } from '../GameStatePersistence.js';

export const SuspectCardsMixin = {
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
  },

  createSuspectCard(suspect, x, y, width, height) {
    const isSelected = suspect.id === this.selectedSuspectId;
    const isEliminated = Boolean(
      suspect.deductionState?.eliminated
    );

    const card = this.add.container(x, y);

    const backgroundColor = isEliminated
      ? 0x2c211e
      : this.excludeMode
        ? 0x38251d
        : isSelected
          ? 0x4a3520
          : 0x2a2018;

    const borderColor = isEliminated
      ? 0x8e3d34
      : this.excludeMode
        ? 0xffb347
        : isSelected
          ? 0xd4af37
          : 0x766044;

    const bg = this.add
      .rectangle(0, 0, width, height, backgroundColor, 1)
      .setStrokeStyle(
        this.excludeMode || isSelected ? 3 : 2,
        borderColor,
        0.95
      )
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

    const traitLines = traits.length
      ? traits.map((trait) => `• ${trait}`)
      : ['• No visible notes'];

    if (this.excludeMode) {
      const hairEvidence = this.getHairEvidenceValue();

      this.modeHintText?.setText(
        hairEvidence
          ? `EXCLUDE MODE: LAB HAIR = ${hairEvidence.toUpperCase()}. Click files to clear or restore them.`
          : 'EXCLUDE MODE: Click files to clear or restore them.'
      );
    }

    const traitsText = traitLines.join('\n');

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

    if (this.excludeMode) {
      const modeText = this.add
        .text(
          0,
          height / 2 - 44,
          isEliminated
            ? '[ CLICK TO RESTORE ]'
            : '[ CLICK TO EXCLUDE ]',
          {
            fontFamily: 'PressStart2P',
            fontSize: '8px',
            color: isEliminated ? '#ffb5aa' : '#ffdc73',
            align: 'center'
          }
        )
        .setOrigin(0.5);

      card.add(modeText);
    }

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
      if (isEliminated && !this.excludeMode) return;
      if (isSelected && !this.excludeMode) return;

      bg.setFillStyle(
        this.excludeMode ? 0x5b3224 : 0x514027,
        1
      );

      bg.setStrokeStyle(
        3,
        this.excludeMode ? 0xffdc73 : 0xd4af37,
        1
      );
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(backgroundColor, 1);

      bg.setStrokeStyle(
        this.excludeMode || isSelected ? 3 : 2,
        borderColor,
        0.95
      );
    });

    bg.on('pointerdown', () => {
      if (this.excludeMode) {
        this.toggleSuspectExclusion(suspect.id);
        return;
      }

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
  },

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

    if (this.excludeMode) {
      return {
        label: 'SELECT FOR EXCLUSION',
        color: '#ffdc73'
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
};