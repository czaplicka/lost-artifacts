import { getSuspectData } from './suspectDataProvider.js';

import {
  capitalize,
  createId,
  normalizeString,
  randomItem,
  safeClone,
  shuffle
} from './suspectGeneratorUtils.js';

function data() {
  return getSuspectData();
}

export function getGenderCode() {
  const roll = Math.random();

  if (roll < 0.46) return 'female';
  if (roll < 0.92) return 'male';

  return 'nb';
}

export function normalizeGenderCode(value) {
  const gender = normalizeString(value);

  if (['female', 'f', 'woman'].includes(gender)) return 'female';
  if (['male', 'm', 'man'].includes(gender)) return 'male';

  return 'nb';
}

export function getBiologicalSex(genderCode) {
  if (genderCode === 'female') return 'female';
  if (genderCode === 'male') return 'male';

  return Math.random() < 0.5 ? 'female' : 'male';
}

export function createFullName(genderCode) {
  const firstNames = data().firstNames[genderCode] || data().firstNames.nb;
  const firstName = randomItem(firstNames);
  const lastName = randomItem(data().lastNames);

  return `${firstName} ${lastName}`;
}

export function getForensicValue(source, field, fallback) {
  const value =
    source?.restrictedProfile?.forensicAttributes?.[field]?.value ??
    source?.restrictedProfile?.forensicAttributes?.[field] ??
    source?.forensicAttributes?.[field]?.value ??
    source?.forensicAttributes?.[field] ??
    source?.[field];

  return value ?? fallback;
}

export function normalizeForensicAttributes(source = {}, genderCode = 'nb') {
  const forensics = data().forensics;

  return {
    hair_color: {
      value: normalizeString(getForensicValue(source, 'hair_color', randomItem(forensics.hairColors))),
      unlocked: false
    },
    eye_color: {
      value: normalizeString(getForensicValue(source, 'eye_color', randomItem(forensics.eyeColors))),
      unlocked: false
    },
    blood_type: {
      value: String(getForensicValue(source, 'blood_type', randomItem(forensics.bloodTypes))).toUpperCase(),
      unlocked: false
    },
    biological_sex: {
      value: normalizeString(getForensicValue(source, 'biological_sex', getBiologicalSex(genderCode))),
      unlocked: false
    },
    shoe_size_category: {
      value: normalizeString(getForensicValue(source, 'shoe_size_category', randomItem(forensics.shoeSizeCategories))),
      unlocked: false
    },
    handedness: {
      value: normalizeString(getForensicValue(source, 'handedness', randomItem(forensics.handedness))),
      unlocked: false
    }
  };
}

export function createVisibleTraits(forensicAttributes, existingTraits = []) {
  const hairColor = forensicAttributes?.hair_color?.value || 'brown';

  const generatedTraits = data().visualTraits;
  const uniqueTraits = [];

  shuffle([
    ...(Array.isArray(existingTraits) ? existingTraits : []),
    `${capitalize(hairColor)} hair`,
    ...generatedTraits
  ]).forEach((trait) => {
    if (
      typeof trait !== 'string' ||
      !trait.trim() ||
      uniqueTraits.some((t) => t.toLowerCase() === trait.trim().toLowerCase())
    ) {
      return;
    }

    uniqueTraits.push(trait.trim());
  });

  return uniqueTraits.slice(0, 2);
}

export function createDeductionState(existingState = {}) {
  return {
    eliminated: Boolean(existingState.eliminated),
    eliminationReasons: Array.isArray(existingState.eliminationReasons)
      ? safeClone(existingState.eliminationReasons)
      : [],
    notesUnlocked: Array.isArray(existingState.notesUnlocked)
      ? [...existingState.notesUnlocked]
      : [],
    labStatus: existingState.labStatus || 'pending',
    hypothesisStatus: existingState.hypothesisStatus || 'pending',
    interviewStatus: existingState.interviewStatus || 'pending',
    alibiStatus: existingState.alibiStatus || 'pending'
  };
}

export function createDecoySuspect(index = 0, source = {}) {
  const genderCode = normalizeGenderCode(
    source.gender_code || source.genderCode || source.gender || getGenderCode()
  );

  const name =
    source.name ||
    source.displayName ||
    source.publicProfile?.displayName ||
    createFullName(genderCode);

  const occupation =
    source.occupation ||
    source.role ||
    source.publicProfile?.occupation ||
    randomItem(data().occupations);

  const forensicAttributes = normalizeForensicAttributes(source, genderCode);

  const visibleTraits = createVisibleTraits(
    forensicAttributes,
    source.visibleTraits || source.publicProfile?.visibleTraits || []
  );

  const caseConnection =
    source.caseConnection ||
    source.publicProfile?.caseConnection ||
    randomItem(data().caseConnections);

  return {
    id: source.id || createId(`suspect_${index + 1}`),
    type: 'suspect',
    isRealThief: Boolean(source.isRealThief),
    name,
    occupation,
    genderCode,
    publicProfile: { displayName: name, occupation, genderCode, visibleTraits, caseConnection },
    restrictedProfile: { unlockedFields: [], forensicAttributes },
    deductionState: createDeductionState(source.deductionState),
    hiddenIdentity: source.hiddenIdentity ? safeClone(source.hiddenIdentity) : null
  };
}

export function ensureUniqueNames(suspects = []) {
  const usedNames = new Set();

  suspects.forEach((suspect) => {
    let candidateName = suspect.name;
    let attempts = 0;

    while (usedNames.has(candidateName.toLowerCase()) && attempts < 30) {
      candidateName = createFullName(suspect.genderCode);
      attempts += 1;
    }

    suspect.name = candidateName;
    suspect.publicProfile.displayName = candidateName;
    usedNames.add(candidateName.toLowerCase());
  });

  return suspects;
}
export function getForensicFieldConfig() {
  const forensics = data().forensics;

  return {
    hair_color: {
      values: forensics.hairColors,
      path: 'restrictedProfile.forensicAttributes.hair_color.value'
    },
    eye_color: {
      values: forensics.eyeColors,
      path: 'restrictedProfile.forensicAttributes.eye_color.value'
    },
    blood_type: {
      values: forensics.bloodTypes,
      path: 'restrictedProfile.forensicAttributes.blood_type.value'
    },
    biological_sex: {
      values: ['female', 'male'],
      path: 'restrictedProfile.forensicAttributes.biological_sex.value'
    },
    shoe_size_category: {
      values: forensics.shoeSizeCategories,
      path: 'restrictedProfile.forensicAttributes.shoe_size_category.value'
    },
    handedness: {
      values: forensics.handedness,
      path: 'restrictedProfile.forensicAttributes.handedness.value'
    }
  };
}
export function ensureUniqueIds(suspects = []) {
  const usedIds = new Set();

  suspects.forEach((suspect, index) => {
    let candidateId = suspect.id || createId(`suspect_${index + 1}`);

    while (usedIds.has(candidateId)) {
      candidateId = createId(`suspect_${index + 1}`);
    }

    suspect.id = candidateId;
    usedIds.add(candidateId);
  });

  return suspects;
}