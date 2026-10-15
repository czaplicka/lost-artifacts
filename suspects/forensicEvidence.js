import { getByPath, normalizeString, randomItem, setByPath } from './suspectGeneratorUtils.js';
import { getForensicFieldConfig, normalizeForensicAttributes, normalizeGenderCode } from './suspectFactory.js';

export function normalizeForensicField(field = '') {
  const key = String(field).trim();
  const aliases = {
    hair: 'hair_color', hairColor: 'hair_color', bloodType: 'blood_type',
    dna_gender: 'biological_sex', dna_profile: 'biological_sex', biologicalSex: 'biological_sex', sex: 'biological_sex', gender: 'biological_sex',
    fingerprintPattern: 'fingerprint_pattern', shoeSizeCategory: 'shoe_size_category', dominantHand: 'handedness', eyeColor: 'eye_color', eyes: 'eye_color'
  };
  return aliases[key] || key;
}
export function normalizeForensicValue(field, value) {
  const normalized = normalizeString(value);
  if (normalizeForensicField(field) === 'biological_sex') {
    if (['xx', 'f', 'female', 'woman'].includes(normalized)) return 'female';
    if (['xy', 'm', 'male', 'man'].includes(normalized)) return 'male';
  }
  if (normalizeForensicField(field) === 'hair_color' && normalized === 'blond') return 'blonde';
  return normalized;
}
export function normalizeHardEvidence(hardEvidence = []) {
  if (!Array.isArray(hardEvidence)) return [];
  const config = getForensicFieldConfig();
  return hardEvidence.map((evidence) => {
    if (!evidence || typeof evidence !== 'object') return null;
    const forensicField = normalizeForensicField(evidence.forensicField || evidence.field || evidence.attribute || evidence.key || '');
    const suspectField = config[forensicField]?.path || evidence.suspectField;
    const rawValue = evidence.normalizedValue ?? evidence.value ?? evidence.expectedValue ?? evidence.thief_value ?? evidence.correctValue;
    if (!suspectField || rawValue === undefined || rawValue === null || String(rawValue).trim() === '') return null;
    const normalizedValue = normalizeForensicValue(forensicField, rawValue);
    return {
      id: evidence.id || forensicField || suspectField,
      field: forensicField, forensicField, suspectField,
      value: normalizedValue, normalizedValue,
      stationId: evidence.stationId || null,
      matches: typeof evidence.matches === 'function' ? evidence.matches :
        (a, b) => normalizeForensicValue(forensicField, a) === normalizeForensicValue(forensicField, b)
    };
  }).filter(Boolean);
}
export function matchesAllHardEvidence(suspect, hardEvidence = []) {
  const evidence = normalizeHardEvidence(hardEvidence);
  return Boolean(suspect && evidence.length && evidence.every((item) => item.matches(getByPath(suspect, item.suspectField), item.normalizedValue)));
}
export function getAlternativeForensicValue(field, forbiddenValue) {
  const canonical = normalizeForensicField(field);
  const values = getForensicFieldConfig()[canonical]?.values;
  if (!Array.isArray(values)) return null;
  return randomItem(values.filter((value) => normalizeForensicValue(canonical, value) !== normalizeForensicValue(canonical, forbiddenValue)));
}
export function applyHardEvidenceToSuspect(suspect, hardEvidence = []) {
  const config = getForensicFieldConfig();
  normalizeHardEvidence(hardEvidence).forEach((evidence) => {
    if (!config[evidence.forensicField]) throw new Error(`Unsupported forensic field: ${evidence.forensicField}`);
    setByPath(suspect, evidence.suspectField, evidence.normalizedValue);
  });
  return suspect;
}
export function forceSuspectToFailHardEvidence(suspect, hardEvidence = [], preferredFailureIndex = 0) {
  const evidence = normalizeHardEvidence(hardEvidence);
  if (!evidence.length) return suspect;
  const index = ((preferredFailureIndex % evidence.length) + evidence.length) % evidence.length;
  const selected = evidence[index];
  const alternative = getAlternativeForensicValue(selected.forensicField, selected.normalizedValue);
  if (alternative === null || alternative === undefined) throw new Error(`No alternative value for ${selected.forensicField}`);
  setByPath(suspect, selected.suspectField, normalizeForensicValue(selected.forensicField, alternative));
  return suspect;
}
export function getDefaultHardEvidenceFromThief(thief = {}) {
  const attributes = normalizeForensicAttributes(thief, normalizeGenderCode(thief.gender_code || thief.genderCode || thief.gender));
  return [
    { field: 'hair_color', value: attributes.hair_color.value, stationId: 'identity' },
    { field: 'shoe_size_category', value: attributes.shoe_size_category.value, stationId: 'trace_0' },
    { field: 'handedness', value: attributes.handedness.value, stationId: 'trace_1' }
  ];
}
export function validateExactlyTwoForensicCandidates(suspects, hardEvidence) {
  const survivors = suspects.filter((suspect) => matchesAllHardEvidence(suspect, hardEvidence));
  if (survivors.length !== 2) throw new Error(`Expected two forensic candidates; received ${survivors.length}.`);
  const thieves = survivors.filter((suspect) => suspect.isRealThief === true);
  const twins = survivors.filter((suspect) => suspect.isRealThief === false);
  if (thieves.length !== 1 || twins.length !== 1) throw new Error('Final candidates must contain one thief and one twin.');
  return { survivors, realThiefCaseSuspect: thieves[0], forensicTwin: twins[0] };
}
export function validateProgressiveForensicCandidates(suspects, hardEvidence, expectedCounts) {
  const evidence = normalizeHardEvidence(hardEvidence);
  const rows = evidence.map((item, index) => {
    const survivors = suspects.filter((suspect) => matchesAllHardEvidence(suspect, evidence.slice(0, index + 1)));
    const expected = expectedCounts[index];
    if (survivors.length !== expected) throw new Error(`Forensic stage ${index + 1} (${item.forensicField}): expected ${expected}, received ${survivors.length}.`);
    return { stage: index + 1, field: item.forensicField, survivors: survivors.length };
  });
  return rows;
}