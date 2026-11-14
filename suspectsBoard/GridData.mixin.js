import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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

import {
  getMaterialDossierNotes,
  getMaterialProfiles
} from '../suspects/MaterialEvidence.js';

import {
  getDustHobbyLabels,
  getDustProfiles
} from '../suspects/DustEvidence.js';

const SPECIAL = new Set([
  'material_profile',
  'dust_profile'
]);

const DNA_FIELDS = new Set([
  'dna_gender',
  'dna_profile',
  'biological_sex',
  'biologicalSex',
  'gender',
  'sex'
]);

function canonicalField(rawField = '') {
  const field = String(rawField ?? '').trim();

  if (DNA_FIELDS.has(field)) {
    return 'biological_sex';
  }

  return normalizeFieldKey(field);
}

function getRegistryEntry(rawField) {
  const field = canonicalField(rawField);

  return (
    DEDUCTION_EVIDENCE_REGISTRY[field] ||
    DEDUCTION_EVIDENCE_REGISTRY[rawField] ||
    null
  );
}

function normalizeFieldValue(field, value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const entry = getRegistryEntry(field);

  return typeof entry?.normalizeEvidence === 'function'
    ? entry.normalizeEvidence(value)
    : value;
}

function getEvidenceField(evidence = {}) {
  return (
    evidence.field ||
    evidence.forensicField ||
    evidence.attribute ||
    evidence.evidenceType ||
    evidence.evidenceConfig?.attribute ||
    evidence.evidenceConfig?.evidenceType ||
    ''
  );
}

function getHardEvidenceValue(evidence = {}) {
  return (
    evidence.value ??
    evidence.normalizedValue ??
    evidence.thief_value ??
    evidence.correctValue ??
    evidence.expectedValue ??
    null
  );
}

function getResultValue(result = {}) {
  return (
    result.value ??
    result.result ??
    result.selectedValue ??
    result.correctValue ??
    result.evidenceConfig?.correctValue ??
    null
  );
}

function fieldLabel(field) {
  const canonical = canonicalField(field);

  if (canonical === 'material_profile') {
    return __dialogueText("suspectsBoard/GridData.mixin.js", "t_87b82692cc6dcce39863");
  }

  if (canonical === 'dust_profile') {
    return __dialogueText("suspectsBoard/GridData.mixin.js", "t_a2df7c0d39e11ec0a06b");
  }

  return getFieldLabel(canonical);
}

function resultLabel(field, value) {
  const profiles = field === 'material_profile'
    ? getMaterialProfiles()
    : getDustProfiles();

  return (
    profiles.find(profile => profile.id === value)?.label ||
    String(value)
  );
}

export const GridDataMixin = {
  getSuspectDisplayName(suspect) {
    return (
      suspect?.publicProfile?.displayName ||
      suspect?.name ||
      __dialogueText("suspectsBoard/GridData.mixin.js", "t_b764cdc0eab713746721")
    );
  },

  getSuspectOccupation(suspect) {
    return (
      suspect?.publicProfile?.occupation ||
      suspect?.occupation ||
      ''
    );
  },

  getSuspectFieldValue(suspect, rawField) {
    const field = canonicalField(rawField);

    if (field === 'material_profile') {
      const notes = getMaterialDossierNotes(suspect);

      return notes.length
        ? notes.map(note => note.text).join(' ')
        : null;
    }

    if (field === 'dust_profile') {
      const hobbies = getDustHobbyLabels(suspect);

      return hobbies.length
        ? hobbies.join('; ')
        : null;
    }

    const attributes =
      suspect?.restrictedProfile?.forensicAttributes;

    if (!attributes || typeof attributes !== 'object') {
      return null;
    }

    const definition = FIELD_BY_ALIAS.get(field);

    const keys = new Set(
      definition
        ? [definition.id, ...definition.aliases, rawField]
        : [field, rawField]
    );

    if (field === 'biological_sex') {
      DNA_FIELDS.forEach(alias => keys.add(alias));
    }

    for (const key of keys) {
      const entry = attributes[key];
      const value = entry?.value ?? entry ?? null;

      if (
        value === null ||
        value === undefined ||
        value === ''
      ) {
        continue;
      }

      if (typeof value === 'object' && !Array.isArray(value)) {
        continue;
      }

      return normalizeFieldValue(field, value);
    }

    return null;
  },

  getSuspectUnlockedFields(suspect) {
    const fields = new Set();

    const unlockedFields =
      suspect?.restrictedProfile?.unlockedFields || [];

    unlockedFields.forEach(field => {
      const key = typeof field === 'string'
        ? field
        : field?.field || field?.id || field?.key || '';

      if (key) {
        fields.add(canonicalField(key));
      }
    });

    const attributes =
      suspect?.restrictedProfile?.forensicAttributes || {};

    Object.entries(attributes).forEach(([key, entry]) => {
      if (entry?.unlocked === true) {
        fields.add(canonicalField(key));
      }
    });

    return fields;
  },

  getAutoSuspectValue(suspect, rawField) {
    const field = canonicalField(rawField);

    const revealed =
      this.revealedFields?.has(field) ||
      this.getSuspectUnlockedFields(suspect).has(field);

    if (!revealed) {
      return null;
    }

    return (
      formatCellValue(
        this.getSuspectFieldValue(suspect, field)
      ) || null
    );
  },

  buildClueCards(caseForensics = {}, data = {}) {
    const explicit =
      data.gridClues ||
      this.gameState.suspectGridInput?.gridClues ||
      this.gameState.currentMission?.gridClues ||
      [];

    const normalizedExplicit = Array.isArray(explicit)
      ? explicit
          .map((clue, index) =>
            this.normalizeExplicitClue(clue, index)
          )
          .filter(Boolean)
      : [];

    const unique = new Map();

    [
      ...normalizedExplicit,
      ...this.buildCrimeSceneEvidenceCards(caseForensics)
    ].forEach(card => {
      if (card?.id && !unique.has(card.id)) {
        unique.set(card.id, card);
      }
    });

    const merged = [...unique.values()];

    this.revealedFields = new Set(
      merged
        .filter(card => card.type === 'crime_scene_fact')
        .map(card => canonicalField(card.field))
    );

    return merged.filter(card => {
      if (card.type !== 'suspect_fact') {
        return true;
      }

      const suspect = this.suspects.find(
        item => item.id === card.suspectId
      );

      return (
        !suspect ||
        this.getAutoSuspectValue(suspect, card.field) === null
      );
    });
  },

  normalizeExplicitClue(clue, index) {
    if (!clue?.field) {
      return null;
    }

    const field = canonicalField(clue.field);

    const type = [
      'crime_scene_fact',
      'crime_scene_evidence'
    ].includes(clue.type)
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
      item => item.id === suspectId
    );

    const value = normalize(
      normalizeFieldValue(field, clue.value)
    );

    return {
      id: clue.id || `grid_clue_${index}_${field}`,
      type,
      suspectId,
      field,
      value,
      label: clue.label || fieldLabel(field),

      text:
        clue.text ||
        clue.description ||
        (
          type === __dialogueText("suspectsBoard/GridData.mixin.js", "t_4b2daddd496aa58de719")
            ? `${__dialogueText("suspectsBoard/GridData.mixin.js", "t_c777a76f9374d856ab8e")}${fieldLabel(field)}${__dialogueText("suspectsBoard/GridData.mixin.js", "t_81afb10b461acd8f2b7e")}${value}${__dialogueText("suspectsBoard/GridData.mixin.js", "t_cdb4ee2aea69cc6a8333")}`
            : `${this.getSuspectDisplayName(suspect)}${__dialogueText("suspectsBoard/GridData.mixin.js", "t_45822f54a0d0e030f756")}${fieldLabel(field)}${__dialogueText("suspectsBoard/GridData.mixin.js", "t_81afb10b461acd8f2b7e")}${value}${__dialogueText("suspectsBoard/GridData.mixin.js", "t_cdb4ee2aea69cc6a8333")}`
        )
    };
  },

  buildCrimeSceneEvidenceCards(caseForensics = {}) {
    const cards = [];
    const added = new Set();

    const results = [
      caseForensics.identityEvidenceResult,
      ...(caseForensics.traceEvidenceResults || [])
    ].filter(result => result && !result.aborted);

    const completedSpecialResults = new Map(
      results
        .filter(result => {
          const field = canonicalField(
            getEvidenceField(result)
          );

          return (
            result.completed === true &&
            SPECIAL.has(field)
          );
        })
        .map(result => [
          canonicalField(getEvidenceField(result)),
          result
        ])
    );

    const addSpecial = (field, value, text, id) => {
      const result = completedSpecialResults.get(field);

      if (added.has(field) || !result) {
        return;
      }

      const resolvedValue = value ?? getResultValue(result);

      if (
        resolvedValue === null ||
        resolvedValue === undefined ||
        resolvedValue === ''
      ) {
        return;
      }

      added.add(field);

      cards.push({
        id,
        type: 'crime_scene_fact',
        field,
        value: resultLabel(field, resolvedValue),

        label: field === __dialogueText("suspectsBoard/GridData.mixin.js", "t_f8326ff535e4b036f70b")
          ? __dialogueText("suspectsBoard/GridData.mixin.js", "t_18213d067a58bdb27f29")
          : __dialogueText("suspectsBoard/GridData.mixin.js", "t_417cac3597812e93560c"),

        text:
          result.clueText ||
          text ||
          `${__dialogueText("suspectsBoard/GridData.mixin.js", "t_9d3834f76e56ee1a557e")}${resultLabel(field, resolvedValue)}${__dialogueText("suspectsBoard/GridData.mixin.js", "t_cdb4ee2aea69cc6a8333")}`
      });
    };

    const hardEvidence =
      this.gameState.currentMission?.forensicHardEvidence ||
      this.gameState.hardEvidence ||
      [];

    hardEvidence.forEach((evidence, index) => {
      const rawField = getEvidenceField(evidence);
      const field = canonicalField(rawField);

      if (!field || added.has(field)) {
        return;
      }

      const rawValue = getHardEvidenceValue(evidence);

      if (SPECIAL.has(field)) {
        addSpecial(
          field,
          rawValue,
          evidence.clueText,
          `crime_scene_${field}_${index}`
        );

        return;
      }

      const value = normalizeFieldValue(field, rawValue);

      if (
        value === null ||
        value === undefined ||
        value === ''
      ) {
        return;
      }

      added.add(field);

      const entry = getRegistryEntry(field);
      const template = pickRandom(entry?.clueTemplates);
      const displayValue = normalize(value);

      const text = template
        ? fillTemplate(template, { value: displayValue })
        : `${__dialogueText("suspectsBoard/GridData.mixin.js", "t_c777a76f9374d856ab8e")}${fieldLabel(field)}${__dialogueText("suspectsBoard/GridData.mixin.js", "t_81afb10b461acd8f2b7e")}${displayValue}${__dialogueText("suspectsBoard/GridData.mixin.js", "t_cdb4ee2aea69cc6a8333")}`;

      cards.push({
        id: `crime_scene_hard_${rawField}_${index}`,
        type: 'crime_scene_fact',
        field,
        value: displayValue,
        label: fieldLabel(field),
        text
      });
    });

    results.forEach((result, index) => {
      const rawField = getEvidenceField(result);
      const field = canonicalField(rawField);

      if (!field || added.has(field)) {
        return;
      }

      const rawValue = getResultValue(result);

      if (SPECIAL.has(field)) {
        addSpecial(
          field,
          rawValue,
          result.clueText,
          `crime_scene_${field}_result_${index}`
        );

        return;
      }

      const value = normalizeFieldValue(field, rawValue);

      if (
        value === null ||
        value === undefined ||
        value === ''
      ) {
        return;
      }

      added.add(field);

      const entry = getRegistryEntry(field);
      const template = pickRandom(entry?.clueTemplates);
      const displayValue = normalize(value);

      const text = template
        ? fillTemplate(template, { value: displayValue })
        : `${__dialogueText("suspectsBoard/GridData.mixin.js", "t_9d3834f76e56ee1a557e")}${fieldLabel(field)}${__dialogueText("suspectsBoard/GridData.mixin.js", "t_81afb10b461acd8f2b7e")}${displayValue}${__dialogueText("suspectsBoard/GridData.mixin.js", "t_cdb4ee2aea69cc6a8333")}`;

      cards.push({
        id: `crime_scene_trace_${rawField}_${index}`,
        type: 'crime_scene_fact',
        field,
        value: displayValue,
        label: fieldLabel(field),
        text
      });
    });

    return cards;
  },

  buildRows() {
    const fields = new Set(
      this.clueCards
        .map(card => canonicalField(card.field))
        .filter(Boolean)
    );

    const rows = [...fields]
      .sort(
        (first, second) =>
          getFieldOrder(first) - getFieldOrder(second)
      )
      .map(field => ({
        id: field,
        label: fieldLabel(field)
      }));

    return rows.length
      ? rows
      : [
          {
            id: 'shoe_size_category',
            label: __dialogueText("suspectsBoard/GridData.mixin.js", "t_3e123d9791e7963a31ef")
          },
          {
            id: 'handedness',
            label: __dialogueText("suspectsBoard/GridData.mixin.js", "t_ff71f64490560b300afa")
          },
          {
            id: 'blood_type',
            label: __dialogueText("suspectsBoard/GridData.mixin.js", "t_95d92096f95755553f37")
          }
        ];
  }
};