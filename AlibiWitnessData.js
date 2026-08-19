// AlibiWitnessData.js
// Data-driven generator for alibi witnesses tied to a suspect's cover story.
// Follows the same "npcId / evidenceId / reason" shape already used in suspectUtils.js
// so it can plug directly into your existing deductionState / alibiStatus pipeline.
//
// Preload these once (e.g. in PreloaderScene.js):
//   this.load.image('npc', 'assets/npc_crime_city/npc.png');
//   this.load.image('npc1', 'assets/npc_crime_city/npc1.png');
//   this.load.image('npc2', 'assets/npc_crime_city/npc2.png');
//   this.load.image('npc3', 'assets/npc_crime_city/npc3.png');
//   this.load.image('npc4', 'assets/npc_crime_city/npc4.png');

const WITNESS_ROLES = [
  { id: 'sister', label: 'Sister', tone: 'defensive', trustBias: 0.7 },
  { id: 'boss', label: 'Boss', tone: 'annoyed', trustBias: 0.5 },
  { id: 'neighbor', label: 'Neighbor', tone: 'gossipy', trustBias: 0.4 },
  { id: 'coworker', label: 'Coworker', tone: 'nervous', trustBias: 0.5 },
  { id: 'landlord', label: 'Landlord', tone: 'bored', trustBias: 0.3 },
  { id: 'receptionist', label: 'Receptionist', tone: 'chatty', trustBias: 0.45 }
];

// Generic city-NPC icon set. Alibi witnesses are one-off, minor characters,
// so they reuse this shared pool instead of needing bespoke art — same
// silhouette, different alibi. That's the joke, keep it.
const WITNESS_TEXTURE_KEYS = ['npc', 'npc1', 'npc2', 'npc3', 'npc4'];

// Time slots the real heist timeline can occupy. Adjust to match your case length.
const TIME_SLOTS = ['18:00', '19:00', '20:00', '21:00', '22:00'];

const LOCATION_TAGS = [
  'home', 'office', 'restaurant', 'train_station', 'gallery_backdoor', 'hotel_bar', 'parking_lot'
];

const MOTIVE_FRAGMENTS = [
  'money problems that never came up in the interview',
  'a grudge against the museum board',
  'a debt to someone dangerous',
  'a private obsession with the artifact itself',
  'a promise made to someone who is now missing',
  'a plan to disappear before the end of the month'
];

function pickRandom(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle(arr, rng) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeSeededRng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function rng() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Deterministically assigns one of the 5 generic NPC icons to a witness,
 * based on suspectId + role, so the same witness always gets the same face
 * across save/load without needing to persist the texture key separately.
 */
function assignWitnessTexture(suspectId, roleId) {
  const index = hashString(`${suspectId}_${roleId}_icon`) % WITNESS_TEXTURE_KEYS.length;
  return WITNESS_TEXTURE_KEYS[index];
}

/**
 * Builds the true crime timeline (3 slots) that the alibi mini-game must reconstruct.
 * trueEvents: exactly 3 cards that are the real sequence.
 * decoyEvents: 3 extra cards (red herrings) mixed in for the Mastermind board.
 */
function buildTrueTimeline(suspect, rng) {
  const shuffledSlots = shuffle(TIME_SLOTS, rng).slice(0, 3).sort();
  const shuffledLocations = shuffle(LOCATION_TAGS, rng);

  const trueEvents = shuffledSlots.map((slot, index) => ({
    id: `${suspect.id}_true_${index}`,
    timeSlot: slot,
    locationTag: shuffledLocations[index],
    label: `${slot} — seen near ${shuffledLocations[index].replace('_', ' ')}`,
    isReal: true
  }));

  const decoyEvents = shuffledLocations.slice(3, 6).map((loc, index) => ({
    id: `${suspect.id}_decoy_${index}`,
    timeSlot: pickRandom(TIME_SLOTS, rng),
    locationTag: loc,
    label: `${pickRandom(TIME_SLOTS, rng)} — claimed to be at ${loc.replace('_', ' ')}`,
    isReal: false
  }));

  return { trueEvents, decoyEvents };
}

/**
 * Generates 3 alibi witnesses for a suspect. Exactly one is lying to protect them.
 * Each witness testimony carries one timeline card (real or decoy), a generic
 * city-NPC icon (textureKey), and, for the liar, a subtle contradiction hint.
 *
 * @param {Object} suspect - suspect object (must have .id and .name)
 * @param {string} caseSeed - stable seed string (e.g. caseId + suspect.id) for deterministic generation
 */
export function generateAlibiWitnesses(suspect, caseSeed) {
  const rng = makeSeededRng(hashString(`${caseSeed}_${suspect.id}`));
  const roles = shuffle(WITNESS_ROLES, rng).slice(0, 3);
  const { trueEvents, decoyEvents } = buildTrueTimeline(suspect, rng);

  const liarIndex = Math.floor(rng() * 3);
  const motiveFragment = pickRandom(MOTIVE_FRAGMENTS, rng);

  const witnesses = roles.map((role, index) => {
    const isLiar = index === liarIndex;
    // Liar's testimony conflicts with the real timeline card at the same slot.
    const card = isLiar ? pickRandom(decoyEvents, rng) : trueEvents[index % trueEvents.length];

    return {
      npcId: `${suspect.id}_witness_${role.id}`,
      suspectId: suspect.id,
      role: role.label,
      tone: role.tone,
      textureKey: assignWitnessTexture(suspect.id, role.id),
      isLiar,
      timelineCard: card,
      motiveFragment: isLiar ? null : motiveFragment,
      statement: isLiar
        ? `${suspect.name} was definitely with me at ${card.timeSlot}, near the ${card.locationTag.replace('_', ' ')}. I remember it clearly.`
        : `${suspect.name} mentioned being near the ${card.locationTag.replace('_', ' ')} around ${card.timeSlot}. Seemed normal at the time.`,
      contradictionHint: isLiar
        ? pickRandom([
            'Their story has no small details — no smells, no sounds, nothing a real memory usually has.',
            'They answered before you finished the question.',
            'They avoided your eyes when naming the exact time.',
            'They used the exact same phrase the suspect used earlier. Rehearsed?'
          ], rng)
        : null
    };
  });

  return {
    suspectId: suspect.id,
    witnesses,
    trueTimeline: trueEvents,
    boardCards: shuffle([...trueEvents, ...decoyEvents], rng)
  };
}

export const AlibiWitnessData = {
  WITNESS_ROLES,
  WITNESS_TEXTURE_KEYS,
  TIME_SLOTS,
  LOCATION_TAGS,
  generateAlibiWitnesses
};