// Handles the desktop details side-panel, the mobile full-screen details
// modal, the Crime Lab results widget, and shared formatting helpers.
//
// Design rule:
// - CRIME LAB RESULTS contains confirmed evidence from completed minigames.
// - CASE NOTES contains information about the selected suspect.
// - The UI does not compare values and does not make deductions for the player.

import { CrimeLabManager } from '../scenes/CSI/CrimeLabManager.js';
import { DEDUCTION_EVIDENCE_REGISTRY } from '../scenes/CSI/DeductionEvidenceRegistry.js';

const DISPLAY_FIELD_ORDER = [
  'hair_color',
  'blood_type',
  'biological_sex',
  'fingerprint_pattern',
  'shoe_size_category',
  'handedness',
  'eye_color',
  'race',
  'skills',
  'habitus'
];

function normalizeFieldKey(field = '') {
  const raw = String(field || '').trim();

  const aliases = {
    hair: 'hair_color',
    hairColor: 'hair_color',
    hair_color: 'hair_color',

    eyes: 'eye_color',
    eyeColor: 'eye_color',
    eye_color: 'eye_color',

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

    ancestry: 'race',
    race: 'race',

    skills: 'skills',
    habitus: 'habitus'
  };

  return aliases[raw] || raw;
}

function formatFieldLabel(field = '') {
  const normalizedField = normalizeFieldKey(field);

  const labels = {
    hair_color: 'HAIR COLOR',
    eye_color: 'EYE COLOR',
    blood_type: 'BLOOD TYPE',
    biological_sex: 'DNA PROFILE',
    fingerprint_pattern: 'FINGERPRINT',
    shoe_size_category: 'SHOE SIZE',
    handedness: 'DOMINANT HAND',
    race: 'ANCESTRY',
    skills: 'CRIMINAL SKILLS',
    habitus: 'HABITS'
  };

  if (labels[normalizedField]) {
    return labels[normalizedField];
  }

  return String(normalizedField)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim()
    .toUpperCase();
}

function formatValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => formatValue(item))
      .filter(Boolean)
      .join(', ');
  }

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return 'UNKNOWN';
  }

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
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

function isUsableEvidence(rawEvidence) {
  const field = getEvidenceField(rawEvidence);
  const value = getEvidenceValue(rawEvidence);

  return Boolean(
    field &&
      value !== undefined &&
      value !== null &&
      value !== ''
  );
}

function sortEvidenceByFieldOrder(evidence = []) {
  return [...evidence].sort((a, b) => {
    const aIndex = DISPLAY_FIELD_ORDER.indexOf(a.field);
    const bIndex = DISPLAY_FIELD_ORDER.indexOf(b.field);

    const normalizedAIndex =
      aIndex === -1
        ? DISPLAY_FIELD_ORDER.length + 1
        : aIndex;

    const normalizedBIndex =
      bIndex === -1
        ? DISPLAY_FIELD_ORDER.length + 1
        : bIndex;

    if (normalizedAIndex !== normalizedBIndex) {
      return normalizedAIndex - normalizedBIndex;
    }

    return a.label.localeCompare(b.label);
  });
}

export const SuspectDetailsMixin = {
  renderDetailsPanel() {
    const { width, height } = this.scale;

    /**
     * Na mobile szczegóły są otwierane modalem.
     * W Exclude Mode nie pokazujemy panelu po prawej, bo karty
     * mają zostać czytelne i gracz korzysta z wyników laboratoryjnych
     * z dedykowanego widgetu lub otwieranego pliku.
     */
    if (width <= 700 ) {
      return;
    }

    const selected = this.getAllSuspects().find(
      (suspect) =>
        suspect?.id === this.selectedSuspectId
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

    /**
     * Widget z wynikami laboratorum istnieje nawet przed wybraniem osoby.
     * Dzięki temu gracz może przypomnieć sobie wyniki i dopiero potem
     * kliknąć aktę.
     */
    const labWidget = this.createCrimeLabResultsWidget({
      x: panelX - panelWidth / 2 + 14,
      y: panelTop + 14,
      width: panelWidth - 28,
      maxHeight: isTablet ? 178 : 206
    });

    this.detailsContainer.add(labWidget.container);

    if (!selected) {
      const noSelection = this.add
        .text(
          panelX,
          panelTop + labWidget.height + 60,
          'Select a suspect file\nto review their notes.',
          {
            fontFamily: 'SpecialElite',
            fontSize: '20px',
            color: '#dcc99e',
            align: 'center',
            wordWrap: {
              width: panelWidth - 34,
              useAdvancedWrap: true
            }
          }
        )
        .setOrigin(0.5);

      this.detailsContainer.add(noSelection);

      return;
    }

    const isEliminated =
      selected.deductionState?.eliminated === true;

    const details = this.buildDetailsText(selected);

    const notesTop =
      panelTop +
      labWidget.height +
      28;

    const heading = this.add
      .text(panelX, notesTop, 'CASE NOTES', {
        fontFamily: 'PressStart2P',
        fontSize: '10px',
        color: '#d4af37'
      })
      .setOrigin(0.5, 0);

    const suspectName = this.add
      .text(
        panelX,
        notesTop + 28,
        selected.publicProfile?.displayName ||
          selected.name ||
          'Unknown Suspect',
        {
          fontFamily: 'SpecialElite',
          fontSize: isTablet ? '25px' : '29px',
          color: isEliminated
            ? '#b69891'
            : '#fff0cd',
          align: 'center',
          wordWrap: {
            width: panelWidth - 34,
            useAdvancedWrap: true
          }
        }
      )
      .setOrigin(0.5, 0);

    const body = this.add
      .text(
        panelX - panelWidth / 2 + 18,
        notesTop + 86,
        details,
        {
          fontFamily: 'SpecialElite',
          fontSize: isTablet ? '16px' : '18px',
          color: '#e2d1ad',
          lineSpacing: 5,
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
  },

  /**
   * Zbiera WSZYSTKIE dostępne, ukończone wyniki Crime Lab.
   *
   * Dane mogą pochodzić z różnych wersji systemu:
   * - gameState.identityEvidenceResult,
   * - gameState.forensicResults,
   * - currentMission.forensicHardEvidence,
   * - caseForensics.identityEvidenceResult,
   * - caseForensics.traceEvidenceResults.
   *
   * Nie dodajemy hardEvidence „na ślepo”. Jest pokazywane tylko po
   * ukończeniu Crime Lab albo jeśli istnieje konkretne result object.
   */
  getCompletedCrimeLabResults() {
    const resultsByField = new Map();

    const addResult = (
      rawResult,
      fallbackSource = 'Crime Lab',
      {
        allowWithoutCompletion = false
      } = {}
    ) => {
      if (
        !rawResult ||
        typeof rawResult !== 'object' ||
        !isUsableEvidence(rawResult)
      ) {
        return;
      }

      const field = getEvidenceField(rawResult);

      const rawValue = getEvidenceValue(rawResult);

      const registryEntry =
        DEDUCTION_EVIDENCE_REGISTRY?.[field];

      const normalizedValue =
        registryEntry?.normalizeEvidence
          ? registryEntry.normalizeEvidence(rawValue)
          : rawValue;

      if (
        normalizedValue === undefined ||
        normalizedValue === null ||
        normalizedValue === ''
      ) {
        return;
      }

      const existing = resultsByField.get(field);

      /**
       * Wynik z konkretnej minigry ma pierwszeństwo przed fallbackiem.
       * To chroni przed nadpisaniem ukończonego wyniku danymi generowanymi
       * przy starcie case'a.
       */
      const incomingIsCompleted =
        allowWithoutCompletion ||
        rawResult.completed === true ||
        rawResult.completedAt ||
        rawResult.unlocked === true ||
        rawResult.resultUnlocked === true ||
        rawResult.source ||
        rawResult.evidenceType;

      if (
        existing?.isCompleted &&
        !incomingIsCompleted
      ) {
        return;
      }

      resultsByField.set(field, {
        id:
          rawResult.id ||
          rawResult.evidenceId ||
          `${field}_${fallbackSource}`,

        field,

        label:
          rawResult.label ||
          registryEntry?.label ||
          formatFieldLabel(field),

        value: formatValue(normalizedValue),

        source:
          rawResult.source ||
          fallbackSource,

        isCompleted: Boolean(incomingIsCompleted)
      });
    };

    /**
     * 1. Główny wynik identyfikacyjny.
     */
    addResult(
      this.gameState.identityEvidenceResult,
      'Crime Lab',
      {
        allowWithoutCompletion: true
      }
    );

    /**
     * 2. Wszystkie wyniki globalne.
     */
    if (Array.isArray(this.gameState.forensicResults)) {
      this.gameState.forensicResults.forEach((result) => {
        addResult(result, 'Crime Lab', {
          allowWithoutCompletion: true
        });
      });
    }

    /**
     * 3. Dane zapisane przez CrimeLabManager w bieżącej sprawie.
     */
    let caseForensics = null;

    try {
      const labManager = new CrimeLabManager(
        this.gameState,
        this.cityId
      );

      caseForensics =
        labManager.ensureCaseForensics();

      addResult(
        caseForensics?.identityEvidenceResult,
        'Crime Lab',
        {
          allowWithoutCompletion: true
        }
      );

      if (
        Array.isArray(
          caseForensics?.traceEvidenceResults
        )
      ) {
        caseForensics.traceEvidenceResults.forEach(
          (result) => {
            addResult(result, 'Crime Lab', {
              allowWithoutCompletion: true
            });
          }
        );
      }
    } catch (error) {
      console.warn(
        '[SuspectDetails] Could not read case forensic results.',
        error
      );
    }

    /**
     * 4. Fallback do hardEvidence.
     *
     * Pokazujemy je dopiero po ukończeniu Crime Lab. Dzięki temu
     * panel nie zdradza wyniku przed minigrą.
     */
    const crimeLabCompleted =
      this.getCrimeLabCompleted?.() ||
      this.gameState.csiLabCompleted === true ||
      caseForensics?.completed === true;

    if (crimeLabCompleted) {
      const hardEvidence =
        this.gameState.currentMission?.forensicHardEvidence ||
        this.gameState.hardEvidence ||
        [];

      if (Array.isArray(hardEvidence)) {
        hardEvidence.forEach((evidence) => {
          addResult(
            {
              id: evidence.id,
              field:
                evidence.field ||
                evidence.forensicField,

              value:
                evidence.value ??
                evidence.normalizedValue,

              label: evidence.label,
              source:
                evidence.source ||
                'Crime Lab'
            },
            'Crime Lab',
            {
              allowWithoutCompletion: true
            }
          );
        });
      }
    }

    return sortEvidenceByFieldOrder(
      [...resultsByField.values()]
    );
  },

  /**
   * Wyświetla listę ukończonych analiz w bocznym widgetcie.
   *
   * Widget nie porównuje wyniku z wybranym podejrzanym.
   * Pokazuje tylko informacje, które detektyw już zdobyła.
   */
  createCrimeLabResultsWidget({
    x,
    y,
    width,
    maxHeight = 200
  }) {
    const results =
      this.getCompletedCrimeLabResults();

    const padding = 12;
    const titleHeight = 20;
    const rowHeight = 28;
    const footerHeight = 18;

    const maxRows = Math.max(
      1,
      Math.floor(
        (maxHeight - padding * 2 - titleHeight - footerHeight) /
          rowHeight
      )
    );

    const visibleResults = results.slice(0, maxRows);

    const hasHiddenResults =
      results.length > visibleResults.length;

    const bodyHeight = visibleResults.length
      ? visibleResults.length * rowHeight
      : 42;

    const widgetHeight = Math.min(
      maxHeight,
      padding * 2 +
        titleHeight +
        bodyHeight +
        (hasHiddenResults ? footerHeight : 0)
    );

    const container = this.add.container(x, y);

    const background = this.add
      .rectangle(
        width / 2,
        widgetHeight / 2,
        width,
        widgetHeight,
        0x142022,
        0.98
      )
      .setStrokeStyle(2, 0x668f91, 1);

    const title = this.add
      .text(
        padding,
        padding,
        'CRIME LAB RESULTS',
        {
          fontFamily: 'PressStart2P',
          fontSize: '8px',
          color: '#91d8d9'
        }
      )
      .setOrigin(0, 0);

    container.add([background, title]);

    if (!visibleResults.length) {
      const empty = this.add
        .text(
          padding,
          padding + titleHeight + 6,
          'No completed analyses.\nCrime Lab data will appear here.',
          {
            fontFamily: 'SpecialElite',
            fontSize: '16px',
            color: '#b7c8c6',
            lineSpacing: 3,
            wordWrap: {
              width: width - padding * 2,
              useAdvancedWrap: true
            }
          }
        )
        .setOrigin(0, 0);

      container.add(empty);

      return {
        container,
        height: widgetHeight
      };
    }

    visibleResults.forEach((result, index) => {
      const rowY =
        padding +
        titleHeight +
        index * rowHeight;

      const row = this.add
        .rectangle(
          width / 2,
          rowY + (rowHeight - 2) / 2,
          width - 16,
          rowHeight - 3,
          0x233133,
          1
        )
        .setStrokeStyle(1, 0x45676a, 1);

      const marker = this.add
        .text(
          padding,
          rowY + 4,
          '✓',
          {
            fontFamily: 'SpecialElite',
            fontSize: '18px',
            color: '#8fe6c4'
          }
        )
        .setOrigin(0, 0);

      const field = this.add
        .text(
          padding + 18,
          rowY + 7,
          result.label,
          {
            fontFamily: 'PressStart2P',
            fontSize: '6px',
            color: '#a9d5d4',
            wordWrap: {
              width: width * 0.52,
              useAdvancedWrap: true
            }
          }
        )
        .setOrigin(0, 0);

      const value = this.add
        .text(
          width - padding,
          rowY + 5,
          result.value,
          {
            fontFamily: 'SpecialElite',
            fontSize: '16px',
            color: '#f4e6b5',
            align: 'right',
            wordWrap: {
              width: width * 0.4,
              useAdvancedWrap: true
            }
          }
        )
        .setOrigin(1, 0);

      container.add([
        row,
        marker,
        field,
        value
      ]);
    });

    if (hasHiddenResults) {
      const more = this.add
        .text(
          width - padding,
          widgetHeight - padding,
          `+${results.length - visibleResults.length} MORE RESULTS`,
          {
            fontFamily: 'PressStart2P',
            fontSize: '6px',
            color: '#8fa7a5'
          }
        )
        .setOrigin(1, 1);

      container.add(more);
    }

    return {
      container,
      height: widgetHeight
    };
  },

  buildDetailsText(suspect) {
    const state =
      suspect?.deductionState || {};

    const restrictedProfile =
      suspect?.restrictedProfile || {};

    const forensic =
      restrictedProfile.forensicAttributes || {};

    const visibleTraits =
      suspect?.publicProfile?.visibleTraits ||
      suspect?.visibleTraits ||
      [];

    const unlockedFields = Array.isArray(
      restrictedProfile.unlockedFields
    )
      ? restrictedProfile.unlockedFields
      : [];

    const unlockedFieldSet = new Set(
      unlockedFields
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

    const lines = [];

    lines.push(
      `Role: ${
        suspect?.publicProfile?.occupation ||
        suspect?.occupation ||
        'Unknown'
      }`
    );

    const caseConnection =
      suspect?.publicProfile?.caseConnection ||
      suspect?.caseConnection ||
      '';

    if (caseConnection) {
      lines.push('\nConnection:');
      lines.push(caseConnection);
    }

    lines.push('\nVisible notes:');

    if (visibleTraits.length) {
      visibleTraits.forEach((trait) => {
        lines.push(`• ${trait}`);
      });
    } else {
      lines.push('• No visible traits recorded');
    }

    lines.push('\nVerified file data:');

    const unlockedForensicEntries = Object.entries(
      forensic
    )
      .map(([field, data]) => ({
        originalField: field,
        field: normalizeFieldKey(field),
        data
      }))
      .filter(({ originalField, field, data }) => {
        return Boolean(
          data?.unlocked ||
            unlockedFieldSet.has(field) ||
            unlockedFieldSet.has(originalField)
        );
      })
      .sort((a, b) => {
        const aIndex = DISPLAY_FIELD_ORDER.indexOf(
          a.field
        );

        const bIndex = DISPLAY_FIELD_ORDER.indexOf(
          b.field
        );

        return (
          (aIndex === -1 ? 999 : aIndex) -
          (bIndex === -1 ? 999 : bIndex)
        );
      });

    if (!unlockedForensicEntries.length) {
      lines.push('• No verified forensic data yet');
    } else {
      unlockedForensicEntries.forEach(
        ({ field, data }) => {
          const value =
            data?.value ??
            data ??
            'pending';

          lines.push(
            `• ${formatFieldLabel(field)}: ${formatValue(value)}`
          );
        }
      );
    }

    if (
      Array.isArray(state.eliminationReasons) &&
      state.eliminationReasons.length
    ) {
      lines.push('\nWhy cleared:');

      state.eliminationReasons.forEach((reason) => {
        lines.push(
          `• ${reason?.label || 'Evidence'}`
        );

        if (reason?.note) {
          lines.push(`  ${reason.note}`);
        }
      });
    }

    if (
      Array.isArray(state.notesUnlocked) &&
      state.notesUnlocked.length
    ) {
      lines.push('\nInvestigator notes:');

      state.notesUnlocked
        .slice(-3)
        .forEach((note) => {
          lines.push(`• ${note}`);
        });
    }

    return lines.join('\n');
  },

  formatEvidenceField(field) {
    return formatFieldLabel(field);
  },

  formatStatus(status) {
    const labels = {
      pending: 'Pending',
      match: 'Evidence recorded',
      mismatch: 'Evidence recorded',
      eliminated: 'Excluded',
      manually_cleared: 'Cleared',
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
  },

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
      .text(
        width / 2,
        56,
        suspect?.publicProfile?.displayName ||
          suspect?.name ||
          'Unknown Suspect',
        {
          fontFamily: 'SpecialElite',
          fontSize: '28px',
          color: '#fff0cd',
          align: 'center',
          wordWrap: {
            width: width - 70,
            useAdvancedWrap: true
          }
        }
      )
      .setOrigin(0.5)
      .setDepth(102);

    const labWidget = this.createCrimeLabResultsWidget({
      x: 34,
      y: 98,
      width: width - 68,
      maxHeight: 200
    });

    labWidget.container.setDepth(102);

    const detailsTop =
      98 +
      labWidget.height +
      20;

    const body = this.add
      .text(
        34,
        detailsTop,
        this.buildDetailsText(suspect),
        {
          fontFamily: 'SpecialElite',
          fontSize: '17px',
          color: '#e2d1ad',
          lineSpacing: 5,
          wordWrap: {
            width: width - 68,
            useAdvancedWrap: true
          }
        }
      )
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
        labWidget.container,
        body,
        closeButton
      ].forEach((item) => {
        item?.removeAllListeners?.();
        item?.destroy?.();
      });
    };

    overlay.on('pointerdown', closeDetails);

    closeButton.buttonBackground.on(
      'pointerdown',
      closeDetails
    );
  }
};