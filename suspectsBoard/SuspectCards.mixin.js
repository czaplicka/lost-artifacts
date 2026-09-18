// Handles suspect card grid rendering, visuals, interactions,
// visible suspect-file data and card status badges.
//
// Information rule:
// - A suspect value is visible only after the player completed
//   the matching Crime Lab analysis.
// - Cards do not compare values with lab evidence.
// - The player makes the comparison using the separate lab widget.
// - CLEARED remains a manual action in active Exclude Mode only.

import { saveGameState } from '../GameStatePersistence.js';
import { CrimeLabManager } from '../scenes/CSI/CrimeLabManager.js';

const FILE_DATA_FIELDS = [
  {
    field: 'hair_color',
    aliases: [
      'hair_color',
      'hairColor',
      'hair'
    ],
    label: 'HAIR'
  },
  {
    field: 'blood_type',
    aliases: [
      'blood_type',
      'bloodType'
    ],
    label: 'BLOOD'
  },
  {
    field: 'biological_sex',
    aliases: [
      'biological_sex',
      'biologicalSex',
      'sex',
      'gender'
    ],
    label: 'DNA'
  },
  {
    field: 'fingerprint_pattern',
    aliases: [
      'fingerprint_pattern',
      'fingerprintPattern'
    ],
    label: 'PRINT'
  },
  {
    field: 'shoe_size_category',
    aliases: [
      'shoe_size_category',
      'shoeSizeCategory'
    ],
    label: 'SHOES'
  },
  {
    field: 'handedness',
    aliases: [
      'handedness',
      'dominantHand'
    ],
    label: 'HAND'
  },
  {
    field: 'eye_color',
    aliases: [
      'eye_color',
      'eyeColor',
      'eyes'
    ],
    label: 'EYES'
  },
  {
    field: 'race',
    aliases: [
      'race',
      'ancestry'
    ],
    label: 'ANCESTRY'
  }
];

function normalizeFieldKey(field = '') {
  const raw = String(field || '').trim();

  const aliases = {
    hair: 'hair_color',
    hairColor: 'hair_color',
    hair_color: 'hair_color',

    bloodType: 'blood_type',
    blood_type: 'blood_type',

    gender: 'biological_sex',
    sex: 'biological_sex',
    biologicalSex: 'biological_sex',
    biological_sex: 'biological_sex',

    fingerprintPattern: 'fingerprint_pattern',
    fingerprint_pattern: 'fingerprint_pattern',

    shoeSizeCategory: 'shoe_size_category',
    shoe_size_category: 'shoe_size_category',

    dominantHand: 'handedness',
    handedness: 'handedness',

    eyeColor: 'eye_color',
    eye_color: 'eye_color',
    eyes: 'eye_color',

    ancestry: 'race',
    race: 'race'
  };

  return aliases[raw] || raw;
}

function getAttributeValue(attributes, aliases = []) {
  if (!attributes || typeof attributes !== 'object') {
    return null;
  }

  for (const alias of aliases) {
    const entry = attributes[alias];

    const value =
      entry?.value ??
      entry ??
      null;

    if (
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      return value;
    }
  }

  return null;
}

function formatFileValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => formatFileValue(item))
      .filter(Boolean)
      .join(', ');
  }

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return '';
  }

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function getEvidenceField(rawEvidence = {}) {
  return normalizeFieldKey(
    rawEvidence.field ||
      rawEvidence.forensicField ||
      rawEvidence.attribute ||
      rawEvidence.evidenceType ||
      rawEvidence.type ||
      ''
  );
}

function getEvidenceValue(rawEvidence = {}) {
  return (
    rawEvidence.value ??
    rawEvidence.normalizedValue ??
    rawEvidence.thiefValue ??
    rawEvidence.thief_value ??
    rawEvidence.result ??
    rawEvidence.resultValue ??
    null
  );
}

function isEvidenceResultUsable(rawEvidence) {
  const field = getEvidenceField(rawEvidence);
  const value = getEvidenceValue(rawEvidence);

  return Boolean(
    field &&
      value !== undefined &&
      value !== null &&
      value !== ''
  );
}

export const SuspectCardsMixin = {
  renderSuspectCards(suspects = []) {
    const { width, height } = this.scale;

    const isMobile = width <= 700;
    const isTablet = width > 700 && width <= 1100;

    if (!suspects.length) {
      this.emptyText
        ?.setText('No suspect files match this filter.')
        ?.setPosition(width / 2, height / 2)
        ?.setVisible(true);

      return;
    }

    this.emptyText?.setVisible(false);

    const contentTop = 184;
    const contentBottom = height - 72;

    const detailsWidth = isMobile
      ? 0
      : isTablet
        ? 350
        : 450;

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
        (availableHeight - gapY * (rows - 1)) /
          Math.max(1, rows)
      )
    );

    const gridWidth =
      columns * cardWidth +
      (columns - 1) * gapX;

    const startX =
      cardsAreaX -
      gridWidth / 2 +
      cardWidth / 2;

    suspects.forEach((suspect, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);

      const x =
        startX +
        column * (cardWidth + gapX);

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

      this.cardsContainer?.add(card);
    });
  },

  createSuspectCard(suspect, x, y, width, height) {
    const isSelected =
      suspect.id === this.selectedSuspectId;

    const isEliminated =
      suspect.deductionState?.eliminated === true;

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

    const fileNumber = this.getSuspectFileNumber(
      suspect.id
    );

    const fileLabel = this.add
      .text(
        -width / 2 + 14,
        -height / 2 + 12,
        `FILE ${fileNumber}`,
        {
          fontFamily: 'PressStart2P',
          fontSize: '8px',
          color: isEliminated
            ? '#d07f75'
            : '#bba276'
        }
      )
      .setOrigin(0, 0);

    const name = this.add
      .text(
        0,
        -height / 2 + 34,
        suspect.publicProfile?.displayName ||
          suspect.name ||
          'Unknown',
        {
          fontFamily: 'SpecialElite',
          fontSize: width < 230 ? '20px' : '25px',
          color: isEliminated
            ? '#b8a39d'
            : '#fff0cd',
          align: 'center',
          wordWrap: {
            width: width - 28,
            useAdvancedWrap: true
          }
        }
      )
      .setOrigin(0.5, 0);

    const occupation = this.add
      .text(
        0,
        -height / 2 + 78,
        suspect.publicProfile?.occupation ||
          suspect.occupation ||
          'Unknown role',
        {
          fontFamily: 'SpecialElite',
          fontSize: '17px',
          color: isEliminated
            ? '#9a8581'
            : '#dfca9e',
          align: 'center',
          wordWrap: {
            width: width - 30,
            useAdvancedWrap: true
          }
        }
      )
      .setOrigin(0.5, 0);

    const fileData = this.createFileDataPanel(
      suspect,
      width,
      height,
      isEliminated
    );

    const status = this.getCardStatus(suspect);

    const statusText = this.add
      .text(
        0,
        height / 2 - 22,
        status.label,
        {
          fontFamily: 'PressStart2P',
          fontSize: '8px',
          color: status.color,
          align: 'center',
          wordWrap: {
            width: width - 24,
            useAdvancedWrap: true
          }
        }
      )
      .setOrigin(0.5);

    card.add([
      bg,
      fileLabel,
      name,
      occupation,
      ...fileData,
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
            color: isEliminated
              ? '#ffb5aa'
              : '#ffdc73',
            align: 'center'
          }
        )
        .setOrigin(0.5);

      card.add(modeText);
    }

    if (isEliminated) {
  const stamp = this.add
    .text(0, 0, 'CLEARED', {
      fontFamily: 'PressStart2P',
      fontSize: width < 230 ? '15px' : '18px',
      color: '#db5750',
      stroke: '#1f0d0b',
      strokeThickness: 5,
      align: 'center'
    })
    .setOrigin(0.5)
    .setAngle(-12)
    .setAlpha(0.9)
    .setDepth(10);

  card.add(stamp);
}

    bg.on('pointerover', () => {
      if (isEliminated && !this.excludeMode) {
        return;
      }

      if (isSelected && !this.excludeMode) {
        return;
      }

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
        this.toggleSuspectExclusion(suspect.id, {
          playerInitiated: true,
          source: 'suspect_card_pointerdown'
        });

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

  /**
   * Returns only the forensic fields that are currently allowed to be
   * visible to the player.
   *
   * A field becomes visible only when:
   * - a matching Crime Lab minigame is completed, OR
   * - the field was explicitly unlocked in the suspect file by another
   *   valid gameplay source, such as a police record.
   *
   * Exclude Mode does NOT reveal hidden data by itself.
   */
  getVisibleFileFacts(suspect) {
    const attributes =
      suspect?.restrictedProfile?.forensicAttributes || {};

    const unlockedFields = new Set(
      (
        suspect?.restrictedProfile?.unlockedFields || []
      )
        .map((field) => {
          if (typeof field === 'string') {
            return normalizeFieldKey(field);
          }

          return normalizeFieldKey(
            field?.field ||
              field?.id ||
              field?.key ||
              ''
          );
        })
        .filter(Boolean)
    );

    const completedLabFields =
      this.getCompletedCrimeLabFields();

    return FILE_DATA_FIELDS
      .map((definition) => {
        const value = getAttributeValue(
          attributes,
          definition.aliases
        );

        const isUnlockedByFile =
          definition.aliases.some(
            (alias) =>
              unlockedFields.has(
                normalizeFieldKey(alias)
              ) ||
              attributes?.[alias]?.unlocked === true
          );

        const isUnlockedByLab =
          completedLabFields.has(definition.field);

        /**
         * Important:
         * No result = no suspect value.
         *
         * Example:
         * - no blood test => do not show blood type;
         * - no fingerprint analysis => do not show fingerprint;
         * - no shoeprint analysis => do not show shoe size.
         */
        if (
          !isUnlockedByLab &&
          !isUnlockedByFile
        ) {
          return null;
        }

        if (
          value === undefined ||
          value === null ||
          value === ''
        ) {
          return null;
        }

        return {
          field: definition.field,
          label: definition.label,
          value: formatFileValue(value)
        };
      })
      .filter(Boolean);
  },

  /**
   * Builds the list of fields for which the player has a completed
   * Crime Lab result.
   *
   * Reads several existing state formats because your project stores
   * different minigame results in more than one place.
   */
  getCompletedCrimeLabFields() {
    const fields = new Set();

    const addEvidence = (rawEvidence) => {
      if (!isEvidenceResultUsable(rawEvidence)) {
        return;
      }

      fields.add(getEvidenceField(rawEvidence));
    };

    /**
     * Main identity-analysis result.
     */
    addEvidence(this.gameState.identityEvidenceResult);

    /**
     * Global forensic result history.
     */
    if (Array.isArray(this.gameState.forensicResults)) {
      this.gameState.forensicResults.forEach(addEvidence);
    }

    /**
     * Per-case CrimeLabManager data.
     */
    try {
      const cityId =
        this.cityId ||
        this.gameState.currentMission?.city ||
        this.gameState.crimeCityId ||
        null;

      const labManager = new CrimeLabManager(
        this.gameState,
        cityId
      );

      const caseForensics =
        labManager.ensureCaseForensics();

      addEvidence(
        caseForensics?.identityEvidenceResult
      );

      if (
        Array.isArray(
          caseForensics?.traceEvidenceResults
        )
      ) {
        caseForensics.traceEvidenceResults.forEach(
          addEvidence
        );
      }

      /**
       * Some scenes may use this alternative collection.
       */
      if (
        Array.isArray(
          caseForensics?.forensicResults
        )
      ) {
        caseForensics.forensicResults.forEach(
          addEvidence
        );
      }
    } catch (error) {
      console.warn(
        '[SuspectCards] Could not read completed Crime Lab fields.',
        error
      );
    }

    return fields;
  },

  /**
   * Renders only player-visible suspect data.
   *
   * No automatic comparison, no red/green verdict and no hidden values.
   */
  createFileDataPanel(
    suspect,
    width,
    height,
    isEliminated
  ) {
    const facts = this.getVisibleFileFacts(suspect);

    const left = -width / 2 + 16;
    const top = -height / 2 + 110;

    /**
     * Cards are intentionally compact.
     * The full data set remains available in CASE NOTES.
     */
    const maxRows = this.excludeMode ? 3 : 2;

    const title = this.add
      .text(left, top, 'FILE DATA', {
        fontFamily: 'PressStart2P',
        fontSize: '7px',
        color: isEliminated
          ? '#a58781'
          : '#c9b785'
      })
      .setOrigin(0, 0);

    if (!facts.length) {
      const empty = this.add
        .text(
          left,
          top + 17,
          'No lab-linked data available.',
          {
            fontFamily: 'SpecialElite',
            fontSize: '14px',
            color: isEliminated
              ? '#9c8984'
              : '#e9dbbb',
            wordWrap: {
              width: width - 32,
              useAdvancedWrap: true
            }
          }
        )
        .setOrigin(0, 0);

      return [title, empty];
    }

    const visibleFacts = facts.slice(0, maxRows);

    const lines = visibleFacts.map(
      (fact) => `${fact.label}: ${fact.value}`
    );

    if (facts.length > visibleFacts.length) {
      lines.push(
        `+ ${facts.length - visibleFacts.length} MORE`
      );
    }

    const text = this.add
      .text(
        left,
        top + 17,
        lines.join('\n'),
        {
          fontFamily: 'SpecialElite',
          fontSize: '14px',
          color: isEliminated
            ? '#9c8984'
            : '#e9dbbb',
          lineSpacing: 2,
          wordWrap: {
            width: width - 32,
            useAdvancedWrap: true
          }
        }
      )
      .setOrigin(0, 0);

    return [title, text];
  },

  getCardStatus(suspect) {
    const state = suspect?.deductionState || {};

    if (state.eliminated === true) {
      const reason = state.eliminationReasons?.[0];

      return {
        label: reason?.label
          ? `CLEARED: ${String(
              reason.label
            ).toUpperCase()}`
          : 'CLEARED',
        color: '#e6766e'
      };
    }

    if (this.excludeMode) {
      return {
        label: 'REVIEW FILE DATA',
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

    if (state.hypothesisStatus === 'mismatch') {
      return {
        label: 'METHOD QUESTIONED',
        color: '#d9b071'
      };
    }

    if (
      state.labStatus === 'match' ||
      state.labStatus === 'mismatch'
    ) {
      return {
        label: 'LAB DATA AVAILABLE',
        color: '#f0ddb0'
      };
    }

    return {
      label: 'UNDER REVIEW',
      color: '#b6aa90'
    };
  }
};