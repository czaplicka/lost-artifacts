import {
  getByPath,
  normalizeString,
  randomItem,
  setByPath
} from './suspectGeneratorUtils.js';

import {
  getForensicFieldConfig,
  normalizeForensicAttributes,
  normalizeGenderCode
} from './suspectFactory.js';

function forensicFieldConfig() {
  return getForensicFieldConfig();
}

export function normalizeHardEvidence(hardEvidence = []) {
  if (!Array.isArray(hardEvidence)) return [];

  const config = forensicFieldConfig();

  return hardEvidence
    .map((evidence) => {
      if (!evidence || typeof evidence !== 'object') return null;

      const forensicField =
        evidence.forensicField || evidence.field || evidence.attribute || evidence.key || null;

      const configuredPath = forensicField && config[forensicField]?.path;
      const suspectField = evidence.suspectField || configuredPath || null;

      const rawValue =
        evidence.normalizedValue ?? evidence.value ?? evidence.expectedValue ?? null;

      if (!suspectField || rawValue === null || rawValue === undefined) return null;

      return {
        id: evidence.id || forensicField || suspectField,
        forensicField,
        suspectField,
        normalizedValue: normalizeString(rawValue),
        matches:
          typeof evidence.matches === 'function'
            ? evidence.matches
            : (a, b) => normalizeString(a) === normalizeString(b)
      };
    })
    .filter(Boolean);
}

export function matchesAllHardEvidence(suspect, hardEvidence = []) {
  const normalizedEvidence = normalizeHardEvidence(hardEvidence);

  if (!suspect || !normalizedEvidence.length) return false;

  return normalizedEvidence.every((evidence) =>
    evidence.matches(getByPath(suspect, evidence.suspectField), evidence.normalizedValue)
  );
}

export function getAlternativeForensicValue(field, forbiddenValue) {
  const config = forensicFieldConfig()[field];

  if (!config?.values?.length) return null;

  const normalizedForbidden = normalizeString(forbiddenValue);
  const candidates = config.values.filter((v) => normalizeString(v) !== normalizedForbidden);

  return randomItem(candidates);
}

export function applyHardEvidenceToSuspect(suspect, hardEvidence = []) {
  const config = forensicFieldConfig();

  normalizeHardEvidence(hardEvidence).forEach((evidence) => {
    if (!evidence.forensicField || !config[evidence.forensicField]) {
      throw new Error(`Hard evidence "${evidence.id}" must use a supported forensic field.`);
    }

    setByPath(suspect, evidence.suspectField, normalizeString(evidence.normalizedValue));
  });

  return suspect;
}

export function forceSuspectToFailHardEvidence(suspect, hardEvidence = [], preferredFailureIndex = 0) {
  const config = forensicFieldConfig();
  const normalizedEvidence = normalizeHardEvidence(hardEvidence);

  if (!normalizedEvidence.length) return suspect;

  const evidence = normalizedEvidence[preferredFailureIndex % normalizedEvidence.length];

  if (!evidence.forensicField || !config[evidence.forensicField]) {
    throw new Error(`Hard evidence "${evidence.id}" must use a supported forensic field.`);
  }

  const conflictingValue = getAlternativeForensicValue(evidence.forensicField, evidence.normalizedValue);

  if (conflictingValue === null) {
    throw new Error(`Could not create a conflicting forensic value for "${evidence.id}".`);
  }

  setByPath(suspect, evidence.suspectField, normalizeString(conflictingValue));

  return suspect;
}

export function getDefaultHardEvidenceFromThief(thief = {}) {
  const genderCode = normalizeGenderCode(thief.gender_code || thief.genderCode || thief.gender);
  const attributes = normalizeForensicAttributes(thief, genderCode);

  return [
    { field: 'hair_color', value: attributes.hair_color.value },
    { field: 'shoe_size_category', value: attributes.shoe_size_category.value }
  ];
}

export function validateExactlyTwoForensicCandidates(suspects, hardEvidence) {
  const survivors = suspects.filter((suspect) => matchesAllHardEvidence(suspect, hardEvidence));

  if (survivors.length !== 2) {
    throw new Error(`Suspect pool must leave exactly two forensic candidates. Current result: ${survivors.length}.`);
  }

  const realThief = survivors.find((s) => s.isRealThief === true);
  const forensicTwin = survivors.find((s) => s.isRealThief === false);

  if (!realThief || !forensicTwin) {
    throw new Error('The two forensic candidates must contain exactly one real thief and one forensic twin.');
  }

  return { survivors, realThiefCaseSuspect: realThief, forensicTwin };
}