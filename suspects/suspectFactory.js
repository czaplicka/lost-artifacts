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

// ============================================================
// FINGERPRINT PATTERN: LOOP ~65%, WHORL ~30%, ARCH ~5%.
// ============================================================
function weightedFingerprintPattern() {
  const roll = Math.random();

  if (roll < 0.65) return 'LOOP';
  if (roll < 0.95) return 'WHORL';

  return 'ARCH';
}

export function getForensicValue(source, field, fallback) {
  const aliases = {
    hair_color: [
      'hair_color',
      'hairColor',
      'hair'
    ],

    eye_color: [
      'eye_color',
      'eyeColor',
      'eyes'
    ],

    blood_type: [
      'blood_type',
      'bloodType'
    ],

    biological_sex: [
      'biological_sex',
      'biologicalSex',
      'sex'
    ],

    shoe_size_category: [
      'shoe_size_category',
      'shoeSizeCategory'
    ],

    handedness: [
      'handedness',
      'dominantHand'
    ],

    fingerprint_pattern: [
      'fingerprint_pattern',
      'fingerprintPattern'
    ]
  };

  const candidateFields = aliases[field] || [field];

  for (const candidateField of candidateFields) {
    const value =
      source?.restrictedProfile?.forensicAttributes?.[candidateField]?.value ??
      source?.restrictedProfile?.forensicAttributes?.[candidateField] ??
      source?.forensicAttributes?.[candidateField]?.value ??
      source?.forensicAttributes?.[candidateField] ??
      source?.[candidateField];

    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return fallback;
}

export function normalizeForensicAttributes(source = {}, genderCode = 'nb') {
  const forensics = data().forensics;

  return {
    hair_color: {
      value: normalizeString(
        getForensicValue(
          source,
          'hair_color',
          randomItem(forensics.hairColors)
        )
      ),
      unlocked: false
    },

    eye_color: {
      value: normalizeString(
        getForensicValue(
          source,
          'eye_color',
          randomItem(forensics.eyeColors)
        )
      ),
      unlocked: false
    },

    blood_type: {
      value: String(
        getForensicValue(
          source,
          'blood_type',
          randomItem(forensics.bloodTypes)
        )
      ).toUpperCase(),
      unlocked: false
    },

    biological_sex: {
      value: normalizeString(
        getForensicValue(
          source,
          'biological_sex',
          getBiologicalSex(genderCode)
        )
      ),
      unlocked: false
    },

    shoe_size_category: {
      value: normalizeString(
        getForensicValue(
          source,
          'shoe_size_category',
          randomItem(forensics.shoeSizeCategories)
        )
      ),
      unlocked: false
    },

    handedness: {
      value: normalizeString(
        getForensicValue(
          source,
          'handedness',
          randomItem(forensics.handedness)
        )
      ),
      unlocked: false
    },

    fingerprint_pattern: {
      value: String(
        getForensicValue(
          source,
          'fingerprint_pattern',
          weightedFingerprintPattern()
        )
      ).toUpperCase(),
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
      uniqueTraits.some(
        (existingTrait) =>
          existingTrait.toLowerCase() === trait.trim().toLowerCase()
      )
    ) {
      return;
    }

    uniqueTraits.push(trait.trim());
  });

  return uniqueTraits.slice(0, 2);
}

/**
 * Tworzy czysty stan dedukcji.
 *
 * Domyślne zachowanie:
 * - nowo wygenerowany podejrzany NIGDY nie jest wykluczony;
 * - nie ma powodów wykluczenia;
 * - nie ma odblokowanych notatek;
 * - wszystkie fazy śledztwa są pending.
 *
 * preserveCaseProgress = true stosuj WYŁĄCZNIE przy:
 * - wczytywaniu save'a tej samej sprawy,
 * - odświeżeniu sceny,
 * - powrocie do Suspect File w trakcie trwającego case'a.
 *
 * Nie stosuj tego przy:
 * - generowaniu nowej sprawy,
 * - rozpoczynaniu nowej gry,
 * - ponownym generowaniu 10 podejrzanych,
 * - budowaniu nowej puli po zakończeniu sprawy.
 */
export function createDeductionState(
  existingState = {},
  { preserveCaseProgress = false } = {}
) {
  if (!preserveCaseProgress) {
    return {
      eliminated: false,
      eliminationReasons: [],
      notesUnlocked: [],
      labStatus: 'pending',
      hypothesisStatus: 'pending',
      interviewStatus: 'pending',
      alibiStatus: 'pending'
    };
  }

  return {
    eliminated: existingState.eliminated === true,

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

/**
 * Ręczny reset stanu dedukcji.
 *
 * Użyj przy tworzeniu nowej sprawy lub jako zabezpieczenia, gdy
 * wykryjesz, że generator otrzymał „zabrudzony” obiekt z save'a.
 */
export function resetDeductionState(suspect) {
  if (!suspect || typeof suspect !== 'object') {
    return suspect;
  }

  suspect.deductionState = createDeductionState();

  return suspect;
}

/**
 * Resetuje całą listę podejrzanych.
 *
 * To powinno zostać wywołane raz po wygenerowaniu nowej puli 10 osób,
 * ale przed zapisaniem jej do gameState.caseSuspects.
 */
export function resetAllSuspectDeductionStates(suspects = []) {
  if (!Array.isArray(suspects)) {
    return [];
  }

  suspects.forEach((suspect) => {
    resetDeductionState(suspect);
  });

  return suspects;
}

export function createDecoySuspect(
  index = 0,
  source = {},
  { preserveCaseProgress = false } = {}
) {
  const genderCode = normalizeGenderCode(
    source.gender_code ||
      source.genderCode ||
      source.gender ||
      getGenderCode()
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

  const forensicAttributes = normalizeForensicAttributes(
    source,
    genderCode
  );

  const visibleTraits = createVisibleTraits(
    forensicAttributes,
    source.visibleTraits ||
      source.publicProfile?.visibleTraits ||
      []
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

    publicProfile: {
      displayName: name,
      occupation,
      genderCode,
      visibleTraits,
      caseConnection
    },

    restrictedProfile: {
      unlockedFields: preserveCaseProgress &&
        Array.isArray(source.restrictedProfile?.unlockedFields)
        ? [...source.restrictedProfile.unlockedFields]
        : [],

      forensicAttributes
    },

    deductionState: createDeductionState(
      source.deductionState,
      { preserveCaseProgress }
    ),

    hiddenIdentity: source.hiddenIdentity
      ? safeClone(source.hiddenIdentity)
      : null
  };
}

export function ensureUniqueNames(suspects = []) {
  const usedNames = new Set();

  suspects.forEach((suspect) => {
    let candidateName = suspect.name;
    let attempts = 0;

    while (
      usedNames.has(candidateName.toLowerCase()) &&
      attempts < 30
    ) {
      candidateName = createFullName(suspect.genderCode);
      attempts += 1;
    }

    suspect.name = candidateName;

    if (!suspect.publicProfile) {
      suspect.publicProfile = {};
    }

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
    },

    fingerprint_pattern: {
      values: forensics.fingerprintPatterns || [
        'LOOP',
        'WHORL',
        'ARCH'
      ],
      path: 'restrictedProfile.forensicAttributes.fingerprint_pattern.value'
    }
  };
}

export function ensureUniqueIds(suspects = []) {
  const usedIds = new Set();

  suspects.forEach((suspect, index) => {
    let candidateId =
      suspect.id ||
      createId(`suspect_${index + 1}`);

    while (usedIds.has(candidateId)) {
      candidateId = createId(`suspect_${index + 1}`);
    }

    suspect.id = candidateId;

    usedIds.add(candidateId);
  });

  return suspects;
}