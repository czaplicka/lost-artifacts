import { gameState, saveGameState } from './GameData.js';

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
  if (!value) return '';

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
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

function getGenderCode() {
  const roll = Math.random();

  if (roll < 0.46) return 'female';
  if (roll < 0.92) return 'male';

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

function createVisibleTraits(forensicAttributes) {
  const hairColor =
    forensicAttributes?.hair_color?.value ||
    'brown';

  const availableTraits = VISUAL_TRAIT_TEMPLATES.map((template) =>
    template({
      hairColor
    })
  );

  return shuffle(availableTraits).slice(0, 2);
}

function createDeductionState() {
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

function createDecoySuspect(index = 0) {
  const genderCode = getGenderCode();
  const forensicAttributes = createForensicAttributes(genderCode);
  const name = createFullName(genderCode);
  const occupation = randomItem(OCCUPATIONS);
  const caseConnection = randomItem(CASE_CONNECTIONS);
  const visibleTraits = createVisibleTraits(forensicAttributes);

  return {
    id: createId(`suspect_${index + 1}`),
    type: 'decoy',
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
    deductionState: createDeductionState()
  };
}

function normalizeRealThief(realThief = {}) {
  const genderCode = realThief.gender_code || realThief.genderCode || 'nb';
  const name =
    realThief.name ||
    realThief.displayName ||
    createFullName(genderCode);

  const occupation =
    realThief.occupation ||
    'Independent Consultant';

  const originalForensics =
    realThief.restrictedProfile?.forensicAttributes ||
    realThief.forensicAttributes ||
    {};

  const forensicAttributes = {
    hair_color: {
      value:
        originalForensics.hair_color?.value ||
        originalForensics.hair_color ||
        randomItem(HAIR_COLORS),
      unlocked: false
    },
    eye_color: {
      value:
        originalForensics.eye_color?.value ||
        originalForensics.eye_color ||
        randomItem(EYE_COLORS),
      unlocked: false
    },
    blood_type: {
      value:
        originalForensics.blood_type?.value ||
        originalForensics.blood_type ||
        randomItem(BLOOD_TYPES),
      unlocked: false
    },
    biological_sex: {
      value:
        originalForensics.biological_sex?.value ||
        originalForensics.biological_sex ||
        getBiologicalSex(genderCode),
      unlocked: false
    },
    shoe_size_category: {
      value:
        originalForensics.shoe_size_category?.value ||
        originalForensics.shoe_size_category ||
        randomItem(SHOE_SIZE_CATEGORIES),
      unlocked: false
    }
  };

  const visibleTraits = createVisibleTraits(forensicAttributes);

  return {
    id: realThief.id || createId('real_thief'),
    type: 'real_thief',
    isRealThief: true,
    name,
    occupation,
    genderCode,
    publicProfile: createPublicProfile({
      name,
      occupation,
      genderCode,
      visibleTraits,
      caseConnection:
        realThief.publicProfile?.caseConnection ||
        realThief.caseConnection ||
        'Listed in the local access records.'
    }),
    restrictedProfile: createRestrictedProfile(forensicAttributes),
    deductionState: createDeductionState(),
    hiddenIdentity: realThief.hiddenIdentity || null,
    criminalProfile: realThief.criminalProfile || null
  };
}

function ensureUniqueNames(suspects = []) {
  const usedNames = new Set();

  suspects.forEach((suspect) => {
    let candidateName = suspect.name;
    let attempts = 0;

    while (usedNames.has(candidateName) && attempts < 30) {
      candidateName = createFullName(suspect.genderCode);
      attempts += 1;
    }

    suspect.name = candidateName;

    if (suspect.publicProfile) {
      suspect.publicProfile.displayName = candidateName;
    }

    usedNames.add(candidateName);
  });

  return suspects;
}

export function generateSuspects({
  total = 10,
  realThief = null
} = {}) {
  const suspectCount = Math.max(2, total);
  const suspects = [];

  if (realThief) {
    suspects.push(normalizeRealThief(realThief));
  } else {
    const generatedRealThief = createDecoySuspect(0);

    generatedRealThief.id = createId('real_thief');
    generatedRealThief.type = 'real_thief';
    generatedRealThief.isRealThief = true;
    generatedRealThief.hiddenIdentity = 'Unknown';
    generatedRealThief.criminalProfile = {};

    suspects.push(generatedRealThief);
  }

  while (suspects.length < suspectCount) {
    suspects.push(createDecoySuspect(suspects.length));
  }

  ensureUniqueNames(suspects);

  const shuffledSuspects = shuffle(suspects);

  gameState.suspects = shuffledSuspects;
  gameState.suspectList = shuffledSuspects;

  saveGameState();

  return shuffledSuspects;
}

export function regenerateSuspects(options = {}) {
  return generateSuspects(options);
}

export function getGeneratedSuspects() {
  if (Array.isArray(gameState.suspects) && gameState.suspects.length) {
    return gameState.suspects;
  }

  if (Array.isArray(gameState.suspectList) && gameState.suspectList.length) {
    return gameState.suspectList;
  }

  return [];
}
export default generateSuspects;