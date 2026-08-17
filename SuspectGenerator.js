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

function getGenderCode() {
  const roll = Math.random();

  if (roll < 0.46) return 'female';
  if (roll < 0.92) return 'male';

  return 'nb';
}

function normalizeGenderCode(value) {
  const gender = String(value || '').trim().toLowerCase();

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
      value: String(
        getForensicValue(
          source,
          'hair_color',
          randomItem(HAIR_COLORS)
        )
      ).toLowerCase(),
      unlocked: false
    },
    eye_color: {
      value: String(
        getForensicValue(
          source,
          'eye_color',
          randomItem(EYE_COLORS)
        )
      ).toLowerCase(),
      unlocked: false
    },
    blood_type: {
      value: String(
        getForensicValue(
          source,
          'blood_type',
          randomItem(BLOOD_TYPES)
        )
      ).toUpperCase(),
      unlocked: false
    },
    biological_sex: {
      value: String(
        getForensicValue(
          source,
          'biological_sex',
          getBiologicalSex(genderCode)
        )
      ).toLowerCase(),
      unlocked: false
    },
    shoe_size_category: {
      value: String(
        getForensicValue(
          source,
          'shoe_size_category',
          randomItem(SHOE_SIZE_CATEGORIES)
        )
      ).toLowerCase(),
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
    isRealThief: false,
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
    deductionState: createDeductionState(source.deductionState)
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

  generateCaseSuspects(thief, crimeCityId) {
    const citySuspects = this.getCitySuspects(crimeCityId);

    const decoys = citySuspects.map((source, index) =>
      createDecoySuspect(index, source)
    );

    const availableSuspects = decoys.length
      ? decoys
      : Array.from(
        { length: 10 },
        (_, index) => createDecoySuspect(index)
      );

    const requestedCount = Math.min(10, availableSuspects.length);

    const suspects = shuffle(availableSuspects)
      .slice(0, requestedCount)
      .map((suspect) => ({
        ...suspect,
        publicProfile: {
          ...suspect.publicProfile,
          visibleTraits: [...suspect.publicProfile.visibleTraits]
        },
        restrictedProfile: {
          ...suspect.restrictedProfile,
          forensicAttributes: safeClone(
            suspect.restrictedProfile.forensicAttributes
          )
        },
        deductionState: createDeductionState(
          suspect.deductionState
        )
      }));

    ensureUniqueIds(suspects);
    ensureUniqueNames(suspects);

    const trueThiefCaseSuspect = randomItem(suspects);

    if (!trueThiefCaseSuspect) {
      throw new Error(
        'Could not generate a case suspect list. No suspect personas are available.'
      );
    }

    const thiefGenderCode = normalizeGenderCode(
      thief?.gender_code ||
      thief?.genderCode ||
      thief?.gender
    );

    const thiefForensics = normalizeForensicAttributes(
      thief || {},
      thiefGenderCode
    );

    trueThiefCaseSuspect.type = 'suspect';
    trueThiefCaseSuspect.isRealThief = false;

    trueThiefCaseSuspect.restrictedProfile = {
      unlockedFields: [],
      forensicAttributes: thiefForensics
    };

    trueThiefCaseSuspect.hiddenCaseData = {
      isTrueThief: true,
      realThiefId: thief?.id || null,
      realThiefName: thief?.name || null,
      realThiefProfile: safeClone(thief || {})
    };

    const trueThiefCaseSuspectId = trueThiefCaseSuspect.id;

    return {
      cityId: normalizeCityId(crimeCityId),
      suspects,
      citySuspects: suspects,
      realThiefId: trueThiefCaseSuspectId,
      realThiefSuspectId: trueThiefCaseSuspectId,
      trueThiefCaseSuspectId,
      actualCriminalId: thief?.id || null,
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
  realThief = null
} = {}) {
  const generator = new SuspectGenerator([]);

  const caseData = generator.generateCaseSuspects(
    realThief,
    null
  );

  const suspects = [...caseData.suspects];

  while (suspects.length < total) {
    suspects.push(createDecoySuspect(suspects.length));
  }

  ensureUniqueIds(suspects);
  ensureUniqueNames(suspects);

  gameState.suspects = shuffle(suspects);
  gameState.suspectList = gameState.suspects;

  saveGameState();

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