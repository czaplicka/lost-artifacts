import { DEDUCTION_EVIDENCE_REGISTRY } from '../scenes/CSI/DeductionEvidenceRegistry.js';
import { FIELD_BY_ALIAS } from './gridConstants.js';
import {
  normalizeFieldKey,
  getFieldLabel,
  getFieldOrder,
  normalize,
  formatCellValue,
  pickRandom,
  fillTemplate
} from './gridHelpers.js';

export const GridDataMixin = {
  getSuspectDisplayName(suspect) {
    return (
      suspect?.publicProfile?.displayName || suspect?.name || 'Unknown'
    );
  },

  getSuspectOccupation(suspect) {
    return suspect?.publicProfile?.occupation || suspect?.occupation || '';
  },

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
  },

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
  },

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
  },

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
  },

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
  },

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
  },

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
};