// AlibiWitnessData.js
// Pure generator: no gameState access and no save mutations.

const WITNESS_TEXTURE_KEYS = [
  'npc', 'npc1', 'npc2', 'npc3', 'npc4', 'npc5', 'npc6'
];

const WITNESS_ROLES = [
  { id: 'neighbor', label: 'Neighbor', tone: 'gossipy' },
  { id: 'coworker', label: 'Coworker', tone: 'matter_of_fact' },
  { id: 'receptionist', label: 'Receptionist', tone: 'chatty' }
];

export const ALIBI_DATA_VERSION = 2;

export function formatAlibiTime(minute) {
  if (!Number.isInteger(minute)) {
    throw new Error('Alibi time must be an integer minute.');
  }

  const wrapped = ((minute % 1440) + 1440) % 1440;
  const hours = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;

  return (
    String(hours).padStart(2, '0') +
    ':' +
    String(minutes).padStart(2, '0')
  );
}

function validateCrimeWindow(window) {
  if (
    !window ||
    !Number.isInteger(window.day) ||
    !Number.isInteger(window.startMinute) ||
    !Number.isInteger(window.endMinute) ||
    window.startMinute < 30 ||
    window.endMinute <= window.startMinute ||
    window.endMinute > 1409
  ) {
    throw new Error(
      'A valid crimeWindow with a 30-minute day margin is required.'
    );
  }
}

function hashString(value) {
  let hash = 2166136261;

  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function shuffleSeeded(items, seed) {
  const result = [...items];
  let state = seed || 1;

  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

    const other = state % (index + 1);

    [result[index], result[other]] = [
      result[other],
      result[index]
    ];
  }

  return result;
}

function makeCard(id, timeSlot, locationTag, label, isReal = true) {
  return {
    id,
    timeSlot,
    locationTag,
    label,
    isReal
  };
}

export function generateAlibiWitnesses(
  suspect,
  caseSeed = 'default_case',
  crimeWindow
) {
  if (!suspect?.id) {
    throw new Error('An alibi suspect with an ID is required.');
  }

  validateCrimeWindow(crimeWindow);

  const isThief =
    suspect.hiddenCaseData?.isTrueThief === true;

  const isTwin =
    suspect.hiddenCaseData?.isForensicTwin === true;

  if (isThief === isTwin) {
    throw new Error(
      'Alibi suspect must be either the real thief or the forensic twin.'
    );
  }

  const name = suspect.name || 'The suspect';
  const { startMinute: start, endMinute: end } = crimeWindow;

  const time = formatAlibiTime;
  const seed = hashString(
    `${caseSeed}:${suspect.id}:${crimeWindow.day}:${start}:${end}`
  );

  const portraits = shuffleSeeded(WITNESS_TEXTURE_KEYS, seed);
  const id = (suffix) => `${suspect.id}_alibi_${suffix}`;

  let statements;
  let trueTimeline;
  let decoys;
  let contradiction = null;

  if (!isThief) {
    statements = [
      `${name} left our building at ${time(start - 25)}. ` +
      `I walked with them to the television studio and saw them ` +
      `check in at ${time(start - 15)}. ` +
      `I stayed in the audience until ${time(end + 10)}. ` +
      `They were on stage throughout the broadcast. ` +
      `I was mostly watching them. The host's tie was a distraction.`,

      `I was on stage beside ${name} from ${time(start - 10)} ` +
      `until ${time(end + 10)}. It was a live broadcast, ` +
      `with no breaks and no stand-ins. Neither of us left the stage. ` +
      `Believe me, I tried to escape the cooking segment.`,

      `I handled check-in and watched the live studio feed. ` +
      `${name} checked in at ${time(start - 15)}. ` +
      `The uninterrupted broadcast ran from ${time(start - 10)} ` +
      `to ${time(end + 10)}, and they remained visible on stage. ` +
      `They checked out at ${time(end + 20)}. ` +
      `The studio is a different building from the crime scene.`
    ];

    trueTimeline = [
      makeCard(
        id('arrival'),
        time(start - 15),
        'television_studio',
        `${time(start - 15)} — the suspect checks in at the television studio.`
      ),
      makeCard(
        id('broadcast'),
        time(start - 10),
        'television_studio',
        `${time(start - 10)}–${time(end + 10)} — the suspect remains ` +
        `visible on stage throughout an uninterrupted live broadcast.`
      ),
      makeCard(
        id('departure'),
        time(end + 20),
        'television_studio',
        `${time(end + 20)} — the suspect checks out of the television studio.`
      )
    ];

    decoys = [
      makeCard(
        id('decoy_1'),
        time(start + 1),
        'television_studio',
        `${time(start + 1)} — the suspect leaves the studio during a break.`,
        false
      ),
      makeCard(
        id('decoy_2'),
        time(start - 15),
        'home',
        `${time(start - 15)} — the suspect stays at home.`,
        false
      ),
      makeCard(
        id('decoy_3'),
        time(end - 1),
        'television_studio',
        `${time(end - 1)} — the suspect checks out before the broadcast ends.`,
        false
      )
    ];
  } else {
    statements = [
      `I saw ${name} leave our building alone at ${time(start - 20)}. ` +
      `They came back at ${time(end + 20)}. ` +
      `Where they went between those times? No idea. ` +
      `My window is a window, detective, not a satellite.`,

      `${name} was with me in my apartment from ${time(start - 10)} ` +
      `until ${time(end + 10)}. We stayed together the entire time. ` +
      `No interruptions, no visitors, no reason to check that story ` +
      `with anyone else. That last bit was a suggestion.`,

      `The coworker who says they hosted ${name} was actually ` +
      `with me at the hotel reception from ${time(start - 15)} ` +
      `until ${time(end + 15)}. We worked side by side the whole time. ` +
      `They never left, and ${name} never joined us. ` +
      `The reception desk is not in that coworker's apartment. ` +
      `I would remember having a minibar at work.`
    ];

    trueTimeline = [
      makeCard(
        id('departure'),
        time(start - 20),
        'home',
        `${time(start - 20)} — the suspect leaves home alone.`
      ),
      makeCard(
        id('coworker_location'),
        time(start - 15),
        'hotel_reception',
        `${time(start - 15)}–${time(end + 15)} — the coworker ` +
        `remains at the hotel reception, not in their apartment.`
      ),
      makeCard(
        id('return'),
        time(end + 20),
        'home',
        `${time(end + 20)} — the suspect returns home; ` +
        `their whereabouts during the theft remain unconfirmed.`
      )
    ];

    decoys = [
      makeCard(
        id('false_alibi'),
        time(start - 10),
        'coworker_apartment',
        `${time(start - 10)}–${time(end + 10)} — the suspect ` +
        `and coworker stay together in the coworker's apartment.`,
        false
      ),
      makeCard(
        id('decoy_2'),
        time(start + 1),
        'home',
        `${time(start + 1)} — the neighbor sees the suspect at home.`,
        false
      ),
      makeCard(
        id('decoy_3'),
        time(end - 1),
        'hotel_reception',
        `${time(end - 1)} — the receptionist sees the suspect at the hotel.`,
        false
      )
    ];

    contradiction = {
      witnessRoleId: 'coworker',
      supportingRoleId: 'receptionist',
      explanation:
        'The coworker claims to have stayed with the suspect in their ' +
        'apartment, but the receptionist places that coworker at the ' +
        'hotel for the entire claimed interval. The alleged meeting ' +
        'cannot have happened as described.'
    };
  }

  const witnesses = WITNESS_ROLES.map((role, index) => {
    const isLiar = isThief && role.id === 'coworker';

    return {
      npcId: `${suspect.id}_witness_${role.id}`,
      suspectId: suspect.id,
      roleId: role.id,
      role: role.label,
      tone: role.tone,

      portraitKey: portraits[index],
      textureKey: portraits[index],

      isLiar,
      statement: statements[index],

      contradictionHint: isLiar
        ? 'Compare the claimed meeting with the receptionist’s account.'
        : null,

      timelineCard: isLiar
        ? decoys[0]
        : trueTimeline[index],

      motiveFragment: null
    };
  });

  return {
    version: ALIBI_DATA_VERSION,
    suspectId: suspect.id,
    suspectName: name,

    crimeWindow: { ...crimeWindow },

    // Internal solution data: do not display as a player-facing heading.
    alibiType: isThief ? 'contradicted' : 'confirmed',

    witnesses,
    contradiction,
    trueTimeline,
    boardCards: shuffleSeeded(
      [...trueTimeline, ...decoys],
      seed ^ 0x9e3779b9
    )
  };
}

export const AlibiWitnessData = {
  WITNESS_ROLES,
  WITNESS_TEXTURE_KEYS,
  generateAlibiWitnesses,
  formatAlibiTime
};