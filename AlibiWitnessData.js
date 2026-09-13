const WITNESS_ROLES = [
  {
    id: 'sister',
    label: 'Sister',
    tone: 'defensive',
    trustBias: 0.7
  },
  {
    id: 'boss',
    label: 'Boss',
    tone: 'annoyed',
    trustBias: 0.5
  },
  {
    id: 'neighbor',
    label: 'Neighbor',
    tone: 'gossipy',
    trustBias: 0.4
  },
  {
    id: 'coworker',
    label: 'Coworker',
    tone: 'nervous',
    trustBias: 0.5
  },
  {
    id: 'landlord',
    label: 'Landlord',
    tone: 'bored',
    trustBias: 0.3
  },
  {
    id: 'receptionist',
    label: 'Receptionist',
    tone: 'chatty',
    trustBias: 0.45
  }
];

/**
 * Shared generic city-NPC portrait pool.
 *
 * Jeśli w jednym momencie pokazujesz więcej niż 5 NPC, duplikaty będą
 * wizualnie nieuniknione bez dodania kolejnych assetów. AlibiEncounterSetup
 * wypisze wtedy warning, aby było jasne, że trzeba powiększyć pulę.
 */
const WITNESS_TEXTURE_KEYS = [
  'npc',
  'npc1',
  'npc2',
  'npc3',
  'npc4',
  'npc5',
  'npc6'
];

const TIME_SLOTS = [
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00'
];

const LOCATION_TAGS = [
  'home',
  'office',
  'restaurant',
  'train_station',
  'gallery_backdoor',
  'hotel_bar',
  'parking_lot'
];

const MOTIVE_FRAGMENTS = [
  'money problems that never came up in the interview',
  'a grudge against the museum board',
  'a debt to someone dangerous',
  'a private obsession with the artifact itself',
  'a promise made to someone who is now missing',
  'a plan to disappear before the end of the month'
];

const LIAR_CONTRADICTION_HINTS = [
  'Their story has no small details — no smells, no sounds, nothing a real memory usually has.',
  'They answered before you finished the question.',
  'They avoided your eyes when naming the exact time.',
  'They used the exact same phrase the suspect used earlier. Rehearsed?'
];

function pickRandom(items = [], rng = Math.random) {
  if (!Array.isArray(items) || !items.length) {
    return null;
  }

  return items[Math.floor(rng() * items.length)];
}

function shuffle(items = [], rng = Math.random) {
  if (!Array.isArray(items)) {
    return [];
  }

  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(rng() * (index + 1));

    [copy[index], copy[randomIndex]] = [
      copy[randomIndex],
      copy[index]
    ];
  }

  return copy;
}

function makeSeededRng(seed) {
  let state = seed % 2147483647;

  if (state <= 0) {
    state += 2147483646;
  }

  return function rng() {
    state = (state * 16807) % 2147483647;

    return (state - 1) / 2147483646;
  };
}

function hashString(value = '') {
  const text = String(value);

  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function normalizeLocationLabel(locationTag = '') {
  return String(locationTag)
    .replace(/_/g, ' ')
    .trim();
}

/**
 * Ustala preferowany portret świadka na podstawie stabilnego seed.
 *
 * To jest tylko preferencja. AlibiEncounterSetup.js może wybrać inny
 * dostępny obrazek, aby zapobiec duplikatom wśród aktualnie aktywnych NPC.
 */
function getPreferredWitnessTexture(
  suspectId,
  roleId,
  witnessIndex = 0
) {
  if (!WITNESS_TEXTURE_KEYS.length) {
    return null;
  }

  const seed = hashString(
    `${suspectId}_${roleId}_${witnessIndex}_portrait`
  );

  return WITNESS_TEXTURE_KEYS[
    seed % WITNESS_TEXTURE_KEYS.length
  ];
}

/**
 * Rozdziela portrety unikalnie w obrębie trzech świadków jednego podejrzanego.
 *
 * Przy obecnej puli 5 portretów i 3 świadkach zawsze uda się wybrać
 * trzy różne grafiki. Zwrócona tablica zachowuje kolejność roles.
 */
function assignUniqueWitnessTextures(
  suspectId,
  roles = []
) {
  const availableKeys = [...WITNESS_TEXTURE_KEYS];

  if (!availableKeys.length) {
    return roles.map(() => null);
  }

  const usedKeys = new Set();

  return roles.map((role, index) => {
    const preferredKey = getPreferredWitnessTexture(
      suspectId,
      role?.id || 'witness',
      index
    );

    const preferredAvailable =
      preferredKey &&
      !usedKeys.has(preferredKey)
        ? preferredKey
        : null;

    const firstAvailable = availableKeys.find(
      (key) => !usedKeys.has(key)
    );

    const selectedKey =
      preferredAvailable ||
      firstAvailable ||
      preferredKey ||
      availableKeys[index % availableKeys.length];

    usedKeys.add(selectedKey);

    return selectedKey;
  });
}

/**
 * Builds a true crime timeline consisting of exactly three chronological
 * events, plus three red-herring events.
 */
function buildTrueTimeline(suspect, rng) {
  const shuffledSlots = shuffle(TIME_SLOTS, rng)
    .slice(0, 3)
    .sort();

  const shuffledLocations = shuffle(LOCATION_TAGS, rng);

  const trueEvents = shuffledSlots.map((timeSlot, index) => {
    const locationTag = shuffledLocations[index];

    return {
      id: `${suspect.id}_true_${index}`,
      timeSlot,
      locationTag,
      label:
        `${timeSlot} — seen near ` +
        `${normalizeLocationLabel(locationTag)}`,
      isReal: true
    };
  });

  const decoyEvents = shuffledLocations
    .slice(3, 6)
    .map((locationTag, index) => {
      const timeSlot = pickRandom(TIME_SLOTS, rng);

      return {
        id: `${suspect.id}_decoy_${index}`,
        timeSlot,
        locationTag,
        label:
          `${timeSlot} — claimed to be at ` +
          `${normalizeLocationLabel(locationTag)}`,
        isReal: false
      };
    });

  return {
    trueEvents,
    decoyEvents
  };
}

/**
 * Generates exactly three witnesses for one suspect.
 *
 * Important:
 * - exactly one witness lies;
 * - each witness gets a unique preferred texture inside this trio;
 * - results are deterministic for the same caseSeed + suspect ID;
 * - this function has no side effects and never touches gameState.
 *
 * @param {Object} suspect Case suspect object with at least `id` and `name`
 * @param {string} caseSeed Stable case key / seed
 */
export function generateAlibiWitnesses(
  suspect,
  caseSeed = 'default_case'
) {
  if (
    !suspect ||
    typeof suspect !== 'object' ||
    !suspect.id
  ) {
    console.warn(
      '[AlibiWitnessData] Cannot generate witnesses for an invalid suspect.',
      suspect
    );

    return {
      suspectId: null,
      witnesses: [],
      trueTimeline: [],
      boardCards: []
    };
  }

  const rng = makeSeededRng(
    hashString(`${caseSeed}_${suspect.id}`)
  );

  const roles = shuffle(WITNESS_ROLES, rng).slice(0, 3);

  const witnessTextures = assignUniqueWitnessTextures(
    suspect.id,
    roles
  );

  const { trueEvents, decoyEvents } = buildTrueTimeline(
    suspect,
    rng
  );

  const liarIndex = Math.floor(rng() * roles.length);

  const motiveFragment = pickRandom(
    MOTIVE_FRAGMENTS,
    rng
  );

  const witnesses = roles.map((role, index) => {
    const isLiar = index === liarIndex;

    const timelineCard = isLiar
      ? pickRandom(decoyEvents, rng)
      : trueEvents[index % trueEvents.length];

    const locationLabel = normalizeLocationLabel(
      timelineCard.locationTag
    );

    return {
      npcId: `${suspect.id}_witness_${role.id}`,

      suspectId: suspect.id,

      roleId: role.id,
      role: role.label,
      tone: role.tone,
      trustBias: role.trustBias,

      /**
       * Preferred key is deterministic and unique inside this witness trio.
       * Encounter setup can replace it if it conflicts with another active NPC.
       */
      textureKey: witnessTextures[index],
      portraitKey: witnessTextures[index],

      isLiar,

      timelineCard,

      motiveFragment: isLiar
        ? null
        : motiveFragment,

      statement: isLiar
        ? `${suspect.name || 'The suspect'} was definitely with me at ${
            timelineCard.timeSlot
          }, near the ${locationLabel}. I remember it clearly.`
        : `${suspect.name || 'The suspect'} mentioned being near the ${
            locationLabel
          } around ${timelineCard.timeSlot}. Seemed normal at the time.`,

      contradictionHint: isLiar
        ? pickRandom(
            LIAR_CONTRADICTION_HINTS,
            rng
          )
        : null
    };
  });

  return {
    suspectId: suspect.id,
    witnesses,
    trueTimeline: trueEvents,
    boardCards: shuffle(
      [...trueEvents, ...decoyEvents],
      rng
    )
  };
}

export const AlibiWitnessData = {
  WITNESS_ROLES,
  WITNESS_TEXTURE_KEYS,
  TIME_SLOTS,
  LOCATION_TAGS,
  MOTIVE_FRAGMENTS,
  LIAR_CONTRADICTION_HINTS,
  generateAlibiWitnesses
};