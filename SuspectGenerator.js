import { gameState } from '../GameData.js';
import { saveGameState } from '../GameStatePersistence.js';

const FIRST_NAMES = {
  female: [
    'Amelia',
    'Beatrice',
    'Camille',
    'Daphne',
    'Elena',
    'Francesca',
    'Giulia',
    'Helena',
    'Isabelle',
    'Juliette',
    'Katarina',
    'Lucia',
    'Margot',
    'Nadia',
    'Olivia',
    'Penelope',
    'Rosa',
    'Sofia',
    'Theresa',
    'Valentina'
  ],
  male: [
    'Adrian',
    'Benoit',
    'Charles',
    'Damien',
    'Elias',
    'Felix',
    'Gabriel',
    'Hugo',
    'Ivan',
    'Julian',
    'Konrad',
    'Leon',
    'Matteo',
    'Nicolas',
    'Oscar',
    'Pascal',
    'Quentin',
    'Rafael',
    'Sebastian',
    'Victor'
  ],
  nb: [
    'Alex',
    'Avery',
    'Casey',
    'Dakota',
    'Emery',
    'Harper',
    'Jamie',
    'Jordan',
    'Morgan',
    'Noel',
    'Parker',
    'Quinn',
    'Reese',
    'Robin',
    'Rowan'
  ]
};

const LAST_NAMES = [
  'Arnaud',
  'Bianchi',
  'Blanc',
  'Carter',
  'Costa',
  'Dubois',
  'Durand',
  'Evans',
  'Fournier',
  'Garcia',
  'Hughes',
  'Kowalski',
  'Lambert',
  'Martin',
  'Moreau',
  'Nowak',
  'Rossi',
  'Schmidt',
  'Silva',
  'Taylor',
  'Walker'
];

const OCCUPATIONS = [
  'Museum Curator',
  'Assistant Archaeologist',
  'Night Security Guard',
  'Deputy Director',
  'Archive Clerk',
  'Exhibition Designer',
  'Restoration Technician',
  'Museum Guide',
  'Insurance Assessor',
  'Private Collector',
  'Art Courier',
  'Gift Shop Manager',
  'Facilities Supervisor',
  'Research Fellow',
  'Volunteer Coordinator'
];

const CASE_CONNECTIONS = [
  'Listed in the local access records.',
  'Worked near the artifact wing on the day of the theft.',
  'Had authorized access to a restricted museum corridor.',
  'Was seen near the staff entrance before closing time.',
  'Handled paperwork connected to the exhibition.',
  'Appears in the museum security roster.',
  'Visited the museum shortly before the incident.',
  'Was mentioned by a member of museum staff.',
  'Had professional contact with the artifact department.',
  'Was present during preparations for the exhibition.'
];

const HAIR_COLORS = [
  'black',
  'brown',
  'blonde',
  'red',
  'grey',
  'white',
  'auburn'
];

const EYE_COLORS = [
  'brown',
  'blue',
  'green',
  'grey',
  'hazel'
];

const BLOOD_TYPES = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-'
];

const SHOE_SIZE_CATEGORIES = [
  'small',
  'medium',
  'large'
];

const VISUAL_TRAIT_TEMPLATES = [
  ({ hairColor }) => `${capitalize(hairColor)} hair`,
  () => 'Wears round glasses',
  () => 'Wears square glasses',
  () => 'No glasses',
  () => 'Usually wears a hat',
  () => 'Always carries a notebook',
  () => 'Wears a long coat',
  () => 'Wears a bright scarf',
  () => 'Wears leather gloves',
  () => 'Carries an old camera',
  () => 'Wears a wristwatch',
  () => 'Has a messenger bag',
  () => 'Wears polished shoes',
  () => 'Prefers practical boots',
  () => 'Has a vintage lapel pin',
  () => 'Often carries an umbrella',
  () => 'Smells faintly of coffee',
  () => 'Keeps immaculate clothing',
  () => 'Wears a slightly rumpled suit',
  () => 'Has paint on their sleeves',
  () => 'Carries a folded city map',
  () => 'Wears an old signet ring',
  () => 'Always has a fountain pen',
  () => 'Has a distinctive scarf pin'
];

const FORENSIC_FIELD_CONFIG = {
  hair_color: {
    values: HAIR_COLORS,
    path: 'restrictedProfile.forensicAttributes.hair_color.value'
  },
  eye_color: {
    values: EYE_COLORS,
    path: 'restrictedProfile.forensicAttributes.eye_color.value'
  },
  blood_type: {
    values: BLOOD_TYPES,
    path: 'restrictedProfile.forensicAttributes.blood_type.value'
  },
  biological_sex: {
    values: ['female', 'male'],
    path: 'restrictedProfile.forensicAttributes.biological_sex.value'
  },
  shoe_size_category: {
    values: SHOE_SIZE_CATEGORIES,
    path: 'restrictedProfile.forensicAttributes.shoe_size_category.value'
  }
};

function capitalize(value = '') {
  const text = String(value || '').trim();

  if (!text) return '';

  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function randomItem(items = []) {
  if (!Array.isArray(items) || !items.length) return null;

  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items = []) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    
    [copy[index], copy[randomIndex]] = [
      copy[randomIndex],
      copy[index]
    ];
  }

  return copy;
}

function createId(prefix = 'suspect') {
  const randomPart = Math.random().toString(36).slice(2, 9);
  const timePart = Date.now().toString(36);

  return `${prefix}_${timePart}_${randomPart}`;
}

function safeClone(value) {
  if (value === undefined) return undefined;

  try {
    return structuredClone(value);
  } catch (error) {
    return JSON.parse(JSON.stringify(value));
  }
}

function normalizeCityId(value) {
  if (typeof value !== 'string' || !value.trim()) return null;

  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function normalizeString(value = '') {
  return String(value ?? '').trim().toLowerCase();
}

function getByPath(source, path) {
  if (!source || !path) return undefined;

  return String(path)
    .split('.')
    .reduce((currentValue, key) => currentValue?.[key], source);
}

function setByPath(target, path, value) {
  if (!target || !path) return target;

  const parts = String(path).split('.');
  const lastKey = parts.pop();

  const destination = parts.reduce((currentValue, key) => {
    if (
      !currentValue[key] ||
      typeof currentValue[key] !== 'object'
    ) {
      currentValue[key] = {};
    }

    return currentValue[key];
  }, target);

  destination[lastKey] = value;

  return target;
}

function getGenderCode() {
  const roll = Math.random();

  if (roll < 0.46) return 'female';
  if (roll < 0.92) return 'male';

  return 'nb';
}

function normalizeGenderCode(value) {
  const gender = normalizeString(value);

  if (['female', 'f', 'woman'].includes(gender)) return 'female';
  if (['male', 'm', 'man'].includes(gender)) return 'male';

  return 'nb';
}

function getBiologicalSex(genderCode) {
  if (genderCode === 'female') return 'female';
  if (genderCode === 'male') return 'male';

  return Math.random() < 0.5 ? 'female' : 'male';
}

function createFullName(genderCode) {
  const firstNames = FIRST_NAMES[genderCode] || FIRST_NAMES.nb;
  const firstName = randomItem(firstNames);
  const lastName = randomItem(LAST_NAMES);

  return `${firstName} ${lastName}`;
}

function createForensicAttributes(genderCode) {
  return {
    hair_color: {
      value: randomItem(HAIR_COLORS),
      unlocked: false
    },
    eye_color: {
      value: randomItem(EYE_COLORS),
      unlocked: false
    },
    blood_type: {
      value: randomItem(BLOOD_TYPES),
      unlocked: false
    },
    biological_sex: {
      value: getBiologicalSex(genderCode),
      unlocked: false
    },
    shoe_size_category: {
      value: randomItem(SHOE_SIZE_CATEGORIES),
      unlocked: false
    }
  };
}

function getForensicValue(source, field, fallback) {
  const value =
    source?.restrictedProfile?.forensicAttributes?.[field]?.value ??
    source?.restrictedProfile?.forensicAttributes?.[field] ??
    source?.forensicAttributes?.[field]?.value ??
    source?.forensicAttributes?.[field] ??
    source?.[field];

  return value ?? fallback;
}

function normalizeForensicAttributes(source = {}, genderCode = 'nb') {
  return {
    hair_color: {
      value: normalizeString(
        getForensicValue(source, 'hair_color', randomItem(HAIR_COLORS))
      ),
      unlocked: false
    },
    eye_color: {
      value: normalizeString(
        getForensicValue(source, 'eye_color', randomItem(EYE_COLORS))
      ),
      unlocked: false
    },
    blood_type: {
      value: String(
        getForensicValue(source, 'blood_type', randomItem(BLOOD_TYPES))
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
          randomItem(SHOE_SIZE_CATEGORIES)
        )
      ),
      unlocked: false
    }
  };
}

function createVisibleTraits(forensicAttributes, existingTraits = []) {
  const hairColor = forensicAttributes?.hair_color?.value || 'brown';

  const generatedTraits = VISUAL_TRAIT_TEMPLATES.map((template) =>
    template({ hairColor })
  );

  const allTraits = shuffle([
    ...(Array.isArray(existingTraits) ? existingTraits : []),
    ...generatedTraits
  ]);

  const uniqueTraits = [];

  allTraits.forEach((trait) => {
    if (
      typeof trait === 'string' &&
      trait.trim() &&
      !uniqueTraits.some(
        (existingTrait) =>
          existingTrait.toLowerCase() === trait.trim().toLowerCase()
      )
    ) {
      uniqueTraits.push(trait.trim());
    }
  });

  return uniqueTraits.slice(0, 2);
}

function createDeductionState(existingState = {}) {
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

function createRestrictedProfile(forensicAttributes) {
  return {
    unlockedFields: [],
    forensicAttributes
  };
}

function createPublicProfile({
  name,
  occupation,
  genderCode,
  visibleTraits,
  caseConnection
}) {
  return {
    displayName: name,
    occupation,
    genderCode,
    visibleTraits,
    caseConnection
  };
}

function createDecoySuspect(index = 0, source = {}) {
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
    randomItem(OCCUPATIONS);

  const forensicAttributes = normalizeForensicAttributes(
    source,
    genderCode
  );

  const existingTraits =
    source.visibleTraits ||
    source.publicProfile?.visibleTraits ||
    [];

  const visibleTraits = createVisibleTraits(
    forensicAttributes,
    existingTraits
  );

  const caseConnection =
    source.caseConnection ||
    source.publicProfile?.caseConnection ||
    randomItem(CASE_CONNECTIONS);

  return {
    id: source.id || createId(`suspect_${index + 1}`),
    type: 'suspect',
    isRealThief: Boolean(source.isRealThief),
    name,
    occupation,
    genderCode,
    publicProfile: createPublicProfile({
      name,
      occupation,
      genderCode,
      visibleTraits,
      caseConnection
    }),
    restrictedProfile: createRestrictedProfile(forensicAttributes),
    deductionState: createDeductionState(source.deductionState),
    hiddenIdentity: source.hiddenIdentity
      ? safeClone(source.hiddenIdentity)
      : null
  };
}

function ensureUniqueNames(suspects = []) {
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

    if (suspect.publicProfile) {
      suspect.publicProfile.displayName = candidateName;
    }

    usedNames.add(candidateName.toLowerCase());
  });

  return suspects;
}

function ensureUniqueIds(suspects = []) {
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

/*
 * Obsługiwane formaty dowodów:
 *
 * { field: 'hair_color', value: 'black' }
 * { forensicField: 'shoe_size_category', value: 'large' }
 * {
 *   suspectField: 'restrictedProfile.forensicAttributes.hair_color.value',
 *   normalizedValue: 'black',
 *   matches: (suspectValue, evidenceValue) => suspectValue === evidenceValue
 * }
 */
export function normalizeHardEvidence(hardEvidence = []) {
  if (!Array.isArray(hardEvidence)) return [];

  return hardEvidence
    .map((evidence) => {
      if (!evidence || typeof evidence !== 'object') return null;

      const forensicField =
        evidence.forensicField ||
        evidence.field ||
        evidence.attribute ||
        evidence.key ||
        null;

      const configuredPath =
        forensicField &&
        FORENSIC_FIELD_CONFIG[forensicField]?.path;

      const suspectField =
        evidence.suspectField ||
        configuredPath ||
        null;

      const rawValue =
        evidence.normalizedValue ??
        evidence.value ??
        evidence.expectedValue ??
        null;

      if (!suspectField || rawValue === null || rawValue === undefined) {
        return null;
      }

      return {
        id: evidence.id || forensicField || suspectField,
        forensicField,
        suspectField,
        normalizedValue: normalizeString(rawValue),
        matches:
          typeof evidence.matches === 'function'
            ? evidence.matches
            : (suspectValue, evidenceValue) =>
              normalizeString(suspectValue) === normalizeString(evidenceValue)
      };
    })
    .filter(Boolean);
}

export function matchesAllHardEvidence(
  suspect,
  hardEvidence = []
) {
  const normalizedEvidence = normalizeHardEvidence(hardEvidence);

  if (!normalizedEvidence.length) return false;

  return normalizedEvidence.every((evidence) =>
    evidence.matches(
      getByPath(suspect, evidence.suspectField),
      evidence.normalizedValue
    )
  );
}

function getAlternativeForensicValue(field, forbiddenValue) {
  const config = FORENSIC_FIELD_CONFIG[field];

  if (!config?.values?.length) return null;

  const normalizedForbidden = normalizeString(forbiddenValue);

  const candidates = config.values.filter(
    (value) => normalizeString(value) !== normalizedForbidden
  );

  return randomItem(candidates) ?? null;
}

function applyHardEvidenceToSuspect(suspect, hardEvidence = []) {
  const normalizedEvidence = normalizeHardEvidence(hardEvidence);

  normalizedEvidence.forEach((evidence) => {
    const field = evidence.forensicField;

    if (!field || !FORENSIC_FIELD_CONFIG[field]) {
      throw new Error(
        `Hard evidence "${evidence.id}" must use a supported forensic field.`
      );
    }

    setByPath(
      suspect,
      evidence.suspectField,
      normalizeString(evidence.normalizedValue)
    );
  });

  return suspect;
}

function forceSuspectToFailHardEvidence(
  suspect,
  hardEvidence = [],
  preferredFailureIndex = 0
) {
  const normalizedEvidence = normalizeHardEvidence(hardEvidence);

  if (!normalizedEvidence.length) return suspect;

  const evidence =
    normalizedEvidence[
      preferredFailureIndex % normalizedEvidence.length
    ];

  const field = evidence.forensicField;

  if (!field || !FORENSIC_FIELD_CONFIG[field]) {
    throw new Error(
      `Hard evidence "${evidence.id}" must use a supported forensic field.`
    );
  }

  const conflictingValue = getAlternativeForensicValue(
    field,
    evidence.normalizedValue
  );

  if (conflictingValue === null) {
    throw new Error(
      `Could not create a conflicting forensic value for "${field}".`
    );
  }

  setByPath(
    suspect,
    evidence.suspectField,
    normalizeString(conflictingValue)
  );

  return suspect;
}

function getDefaultHardEvidenceFromThief(thief = {}) {
  const forensicAttributes = normalizeForensicAttributes(
    thief,
    normalizeGenderCode(
      thief.gender_code ||
      thief.genderCode ||
      thief.gender
    )
  );

  return [
    {
      field: 'hair_color',
      value: forensicAttributes.hair_color.value
    },
    {
      field: 'shoe_size_category',
      value: forensicAttributes.shoe_size_category.value
    }
  ];
}

function createForensicTwin(
  index,
  hardEvidence,
  usedNames = new Set()
) {
  let twin = createDecoySuspect(index);

  let attempts = 0;

  while (
    usedNames.has(twin.name.toLowerCase()) &&
    attempts < 30
  ) {
    twin = createDecoySuspect(index);
    attempts += 1;
  }

  twin.isRealThief = false;
  twin.hiddenIdentity = null;
  twin.hiddenCaseData = null;

  applyHardEvidenceToSuspect(twin, hardEvidence);

  twin.publicProfile.visibleTraits = createVisibleTraits(
    twin.restrictedProfile.forensicAttributes,
    twin.publicProfile.visibleTraits
  );

  return twin;
}

function createTrueThiefCaseSuspect(
  sourceSuspect,
  thief,
  hardEvidence
) {
  const thiefGenderCode = normalizeGenderCode(
    thief?.gender_code ||
    thief?.genderCode ||
    thief?.gender
  );

  const thiefForensics = normalizeForensicAttributes(
    thief || {},
    thiefGenderCode
  );

  const suspect = {
    ...sourceSuspect,
    isRealThief: true,
    restrictedProfile: {
      unlockedFields: [],
      forensicAttributes: thiefForensics
    },
    hiddenIdentity: thief?.hiddenIdentity
      ? safeClone(thief.hiddenIdentity)
      : {
        realName: thief?.realName || thief?.name || null,
        revealStage: thief?.revealStage || 'identity_reveal'
      },
    hiddenCaseData: {
      isTrueThief: true,
      realThiefId: thief?.id || null,
      realThiefName: thief?.name || null,
      realThiefProfile: safeClone(thief || {})
    }
  };

  applyHardEvidenceToSuspect(suspect, hardEvidence);

  suspect.publicProfile.visibleTraits = createVisibleTraits(
    suspect.restrictedProfile.forensicAttributes,
    suspect.publicProfile.visibleTraits
  );

  return suspect;
}

function validateExactlyTwoForensicCandidates(
  suspects,
  hardEvidence
) {
  const survivors = suspects.filter((suspect) =>
    matchesAllHardEvidence(suspect, hardEvidence)
  );

  if (survivors.length !== 2) {
    throw new Error(
      `Suspect pool must leave exactly two forensic candidates. Current result: ${survivors.length}.`
    );
  }

  const realThiefSurvivors = survivors.filter(
    (suspect) => suspect.isRealThief === true
  );

  const decoySurvivors = survivors.filter(
    (suspect) => suspect.isRealThief === false
  );

  if (
    realThiefSurvivors.length !== 1 ||
    decoySurvivors.length !== 1
  ) {
    throw new Error(
      'The two forensic candidates must contain exactly one real thief and one forensic twin.'
    );
  }

  return {
    survivors,
    realThiefCaseSuspect: realThiefSurvivors[0],
    forensicTwin: decoySurvivors[0]
  };
}

export class SuspectGenerator {
  constructor(citySuspectsData = {}) {
    this.citySuspectsData = citySuspectsData;
  }

  getCitySuspects(crimeCityId) {
    const normalizedCrimeCityId = normalizeCityId(crimeCityId);
    const data = this.citySuspectsData;

    if (Array.isArray(data)) {
      return data.filter((suspect) => {
        const suspectCityId = normalizeCityId(
          suspect.cityId ||
          suspect.city_id ||
          suspect.city
        );

        return !suspectCityId || suspectCityId === normalizedCrimeCityId;
      });
    }

    if (Array.isArray(data?.suspects)) {
      return data.suspects.filter((suspect) => {
        const suspectCityId = normalizeCityId(
          suspect.cityId ||
          suspect.city_id ||
          suspect.city
        );

        return !suspectCityId || suspectCityId === normalizedCrimeCityId;
      });
    }

    if (Array.isArray(data?.cities)) {
      const cityData = data.cities.find((city) => {
        const cityId = normalizeCityId(
          city.id ||
          city.cityId ||
          city.city
        );

        return cityId === normalizedCrimeCityId;
      });

      if (Array.isArray(cityData?.suspects)) {
        return cityData.suspects;
      }
    }

    if (Array.isArray(data?.[normalizedCrimeCityId])) {
      return data[normalizedCrimeCityId];
    }

    return [];
  }

  generateCaseSuspects(
    thief,
    crimeCityId,
    {
      total = 10,
      hardEvidence = []
    } = {}
  ) {
    if (!thief || typeof thief !== 'object') {
      throw new Error(
        'A real thief profile is required to generate a case suspect pool.'
      );
    }

    if (total < 2) {
      throw new Error(
        'The suspect pool must contain at least two people.'
      );
    }

    const normalizedHardEvidence = normalizeHardEvidence(
      hardEvidence.length
        ? hardEvidence
        : getDefaultHardEvidenceFromThief(thief)
    );

    if (!normalizedHardEvidence.length) {
      throw new Error(
        'At least one hard forensic evidence item is required.'
      );
    }

    const citySuspects = this.getCitySuspects(crimeCityId);

    const availableDecoys = citySuspects.map((source, index) =>
      createDecoySuspect(index, source)
    );

    const fallbackDecoyCount = Math.max(total, 10);

    const sourceDecoys = availableDecoys.length
      ? availableDecoys
      : Array.from(
        { length: fallbackDecoyCount },
        (_, index) => createDecoySuspect(index)
      );

    const shuffledDecoys = shuffle(sourceDecoys).map((suspect) =>
      safeClone(suspect)
    );

    while (shuffledDecoys.length < total) {
      shuffledDecoys.push(
        createDecoySuspect(shuffledDecoys.length)
      );
    }

    const trueThiefBase = shuffledDecoys.shift() ||
      createDecoySuspect(0);

    const trueThiefCaseSuspect = createTrueThiefCaseSuspect(
      trueThiefBase,
      thief,
      normalizedHardEvidence
    );

    const usedNames = new Set([
      trueThiefCaseSuspect.name.toLowerCase()
    ]);

    const forensicTwin = createForensicTwin(
      1,
      normalizedHardEvidence,
      usedNames
    );

    usedNames.add(forensicTwin.name.toLowerCase());

    const remainingCount = total - 2;

    const ordinarySuspects = shuffledDecoys
      .slice(0, remainingCount)
      .map((suspect, index) => {
        const decoy = safeClone(suspect);

        decoy.isRealThief = false;
        decoy.hiddenIdentity = null;
        decoy.hiddenCaseData = null;

        forceSuspectToFailHardEvidence(
          decoy,
          normalizedHardEvidence,
          index
        );

        decoy.publicProfile.visibleTraits = createVisibleTraits(
          decoy.restrictedProfile.forensicAttributes,
          decoy.publicProfile.visibleTraits
        );

        return decoy;
      });

    const suspects = shuffle([
      trueThiefCaseSuspect,
      forensicTwin,
      ...ordinarySuspects
    ]);

    ensureUniqueIds(suspects);
    ensureUniqueNames(suspects);

    const validation = validateExactlyTwoForensicCandidates(
      suspects,
      normalizedHardEvidence
    );

    return {
      cityId: normalizeCityId(crimeCityId),
      suspects,
      citySuspects: suspects,
      realThiefId: validation.realThiefCaseSuspect.id,
      realThiefSuspectId: validation.realThiefCaseSuspect.id,
      trueThiefCaseSuspectId: validation.realThiefCaseSuspect.id,
      forensicTwinSuspectId: validation.forensicTwin.id,
      hardEvidence: safeClone(normalizedHardEvidence),
      forensicSurvivorIds: validation.survivors.map(
        (suspect) => suspect.id
      ),
      actualCriminalId: thief.id || null,
      generatedAt: new Date().toISOString()
    };
  }

  prepareCaseState(caseData = {}) {
    const suspects =
      caseData.suspects ||
      caseData.citySuspects ||
      [];

    gameState.caseSuspects = safeClone(suspects);
    gameState.suspects = safeClone(suspects);
    gameState.suspectList = safeClone(suspects);

    gameState.realThiefSuspectId =
      caseData.trueThiefCaseSuspectId ||
      caseData.realThiefSuspectId ||
      caseData.realThiefId ||
      null;

    gameState.trueThiefCaseSuspectId =
      gameState.realThiefSuspectId;

    gameState.forensicTwinSuspectId =
      caseData.forensicTwinSuspectId || null;

gameState.currentMission ??= {};

gameState.currentMission.forensicHardEvidence = safeClone(
  caseData.hardEvidence || []
);

    gameState.forensicSurvivorIds = safeClone(
      caseData.forensicSurvivorIds || []
    );

    gameState.actualCriminalId =
      caseData.actualCriminalId ||
      gameState.currentThief?.id ||
      gameState.currentThiefId ||
      null;

    gameState.caseSuspectCityId =
      caseData.cityId ||
      gameState.crimeCityId ||
      null;

    gameState.selectedSuspectId =
      suspects.find(
        (suspect) => !suspect.deductionState?.eliminated
      )?.id ||
      suspects[0]?.id ||
      null;

    saveGameState();

    return gameState.caseSuspects;
  }
}

export function generateSuspects({
  total = 10,
  realThief = null,
  hardEvidence = []
} = {}) {
  const generator = new SuspectGenerator([]);

  const caseData = generator.generateCaseSuspects(
    realThief,
    null,
    {
      total,
      hardEvidence
    }
  );

  generator.prepareCaseState(caseData);

  return gameState.suspects;
}

export function regenerateSuspects(options = {}) {
  return generateSuspects(options);
}

export function getGeneratedSuspects() {
  if (Array.isArray(gameState.suspects) && gameState.suspects.length) {
    return gameState.suspects;
  }

  if (
    Array.isArray(gameState.suspectList) &&
    gameState.suspectList.length
  ) {
    return gameState.suspectList;
  }

  return [];
}

export default SuspectGenerator;