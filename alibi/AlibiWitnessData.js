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

export const ALIBI_DATA_VERSION = 4;

const OCCUPATION_PROFILES = {
  'museum curator': {
    workplace: 'the museum offices',
    venue: 'the City Library auditorium',
    activity: 'giving a public lecture on ancient pottery',
    quip: 'Forty minutes about one vase. I checked my watch twice.'
  },
  'assistant archaeologist': {
    workplace: 'the excavation office',
    venue: 'the university lab',
    activity: 'sorting pottery shards at the university lab',
    quip: 'Nobody sneaks out of a room full of shards. You can hear it.'
  },
  'night security guard': {
    workplace: 'the security office',
    venue: 'the guard training hall',
    activity: 'taking a mandatory first-aid course',
    quip: 'He bandaged a dummy all evening. The dummy looked relieved.'
  },
  'deputy director': {
    workplace: 'the administration wing',
    venue: 'the Chamber of Commerce',
    activity: 'chairing a budget meeting',
    quip: 'Three hours about a stapler budget. We all wanted to leave. Nobody could.'
  },
  'archive clerk': {
    workplace: 'the city archive',
    venue: 'the municipal records hall',
    activity: 'stamping forms during a records audit',
    quip: 'Stamping is loud. A gap in the stamping would have been noticed.'
  },
  'exhibition designer': {
    workplace: 'the design studio',
    venue: 'the trade fair hall',
    activity: 'building a display stand at the trade fair',
    quip: 'The stand collapsed twice. Both times with them under it.'
  },
  'restoration technician': {
    workplace: 'the restoration workshop',
    venue: 'the conservation lab',
    activity: 'cleaning an old tapestry at the conservation lab',
    quip: 'You cannot pause a tapestry bath. Believe me, people have tried.'
  },
  'museum guide': {
    workplace: 'the visitor centre',
    venue: 'the old town square',
    activity: 'leading an evening walking tour',
    quip: 'Twelve tourists with cameras. Best alibi in Europe.'
  },
  'insurance assessor': {
    workplace: 'the insurance office',
    venue: 'a client warehouse',
    activity: 'inspecting a damaged shipment',
    quip: 'Counting crates is not a job anyone abandons halfway.'
  },
  'private collector': {
    workplace: 'the Collectors’ Club',
    venue: 'the auction house',
    activity: 'bidding at a charity auction',
    quip: 'Their paddle went up eleven times. We have the receipts. Painful ones.'
  },
  'art courier': {
    workplace: 'the shipping depot',
    venue: 'the airport cargo terminal',
    activity: 'signing for a crate at the cargo terminal',
    quip: 'The paperwork needs seven stamps. Seven.'
  },
  'gift shop manager': {
    workplace: 'the museum gift shop',
    venue: 'the wholesale market',
    activity: 'haggling over souvenir magnets',
    quip: 'Nobody haggles that hard over a magnet unless they mean it.'
  },
  'facilities supervisor': {
    workplace: 'the facilities office',
    venue: 'the town hall boiler room',
    activity: 'fixing a burst pipe at the town hall',
    quip: 'A burst pipe waits for no one. Neither does the invoice.'
  },
  'research fellow': {
    workplace: 'the research institute',
    venue: 'the conference centre',
    activity: 'presenting a poster at a conference',
    quip: 'Nobody leaves their own poster session. It is the only time anyone visits it.'
  },
  'volunteer coordinator': {
    workplace: 'the volunteer office',
    venue: 'the community hall',
    activity: 'running a volunteer training evening',
    quip: 'Forty volunteers and one flipchart. Chaos is an excellent witness.'
  }
};

const DEFAULT_PROFILE = {
  workplace: 'their workplace',
  venue: 'the community hall',
  activity: 'attending an evening event',
  quip: 'It was dull enough that I remember every minute.'
};

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

// Every card belongs to exactly one witness.
function makeCard(id, minute, locationTag, label, role, isReal = true) {
  return {
    id,
    minute,
    timeSlot: formatAlibiTime(minute),
    locationTag,
    label,
    roleId: role.id,
    role: role.label,
    isReal
  };
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getOccupation(suspect) {
  return (
    suspect.occupation ||
    suspect.publicProfile?.occupation ||
    ''
  );
}

function getProfile(occupation) {
  return (
    OCCUPATION_PROFILES[String(occupation).trim().toLowerCase()] ||
    DEFAULT_PROFILE
  );
}

function getCaseConnection(suspect) {
  return (
    suspect.publicProfile?.caseConnection ||
    suspect.caseConnection ||
    ''
  ).trim();
}

function rumorLine(caseConnection) {
  if (!caseConnection) {
    return 'Rumors? I deal in rumors, detective. Fresh daily.';
  }

  return (
    `The rumor on our street is: "${caseConnection}" ` +
    'That is all it is. A rumor. I deal in those.'
  );
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
  const occupation = getOccupation(suspect) || 'staff member';
  const profile = getProfile(occupation);
  const rumor = rumorLine(getCaseConnection(suspect));

  const { startMinute: start, endMinute: end } = crimeWindow;

  const time = formatAlibiTime;
  const seed = hashString(
    `${caseSeed}:${suspect.id}:${crimeWindow.day}:${start}:${end}`
  );

  const portraits = shuffleSeeded(WITNESS_TEXTURE_KEYS, seed);
  const id = (suffix) => `${suspect.id}_alibi_${suffix}`;

  const [neighborRole, coworkerRole, receptionistRole] = WITNESS_ROLES;

  let statements;
  let cards;
  let contradiction = null;

  if (!isThief) {
    statements = [
      `${name}, our local ${occupation}? Left the building at ` +
      `${time(start - 25)}, muttering about ${profile.activity}. ` +
      `I walked with them to ${profile.venue} and saw them sign in at ` +
      `${time(start - 15)}. ${rumor}`,

      `I was next to ${name} at ${profile.venue} from ` +
      `${time(start - 10)} until ${time(end + 10)}. ` +
      `They were ${profile.activity} the whole time. ` +
      `Nobody left, nobody swapped places. ${profile.quip}`,

      `I run the front desk at ${profile.venue}. ` +
      `${name} signed in at ${time(start - 15)} and signed out at ` +
      `${time(end + 20)}. In between they were visibly busy ` +
      `${profile.activity}. ${capitalize(profile.venue)} ` +
      'is nowhere near the crime scene. I checked. Twice.'
    ];

    cards = [
      makeCard(
        id('arrival'),
        start - 15,
        'alibi_venue',
        `${time(start - 15)} — walked the suspect to ${profile.venue} ` +
        'and saw them sign in.',
        neighborRole
      ),
      makeCard(
        id('event'),
        start - 10,
        'alibi_venue',
        `${time(start - 10)}–${time(end + 10)} — stood beside the ` +
        `suspect, who was ${profile.activity}. No breaks.`,
        coworkerRole
      ),
      makeCard(
        id('departure'),
        end + 20,
        'alibi_venue',
        `${time(end + 20)} — the suspect signed out at ` +
        `${profile.venue}.`,
        receptionistRole
      )
    ];
  } else {
    statements = [
      `I saw ${name}, the ${occupation}, leave our building alone at ` +
      `${time(start - 20)}. They came back at ${time(end + 20)}. ` +
      'Where they went in between? No idea. ' +
      `My window is a window, detective, not a satellite. ${rumor}`,

      `${name} was with me in my apartment from ${time(start - 10)} ` +
      `until ${time(end + 10)}. We stayed together the entire time. ` +
      'No interruptions, no visitors, no reason to check that story ' +
      'with anyone else. That last bit was a suggestion.',

      `The coworker who says they hosted ${name} was actually ` +
      `with me at the front desk of ${profile.workplace} from ` +
      `${time(start - 15)} until ${time(end + 15)}. ` +
      'We worked side by side the whole time. They never left, and ' +
      `${name} never showed up. ${capitalize(profile.workplace)} ` +
      'is not anyone’s apartment. I would remember having a sofa at work.'
    ];

    cards = [
      makeCard(
        id('departure'),
        start - 20,
        'home',
        `${time(start - 20)} — saw the suspect leave home alone. ` +
        `Back at ${time(end + 20)}.`,
        neighborRole
      ),
      makeCard(
        id('false_alibi'),
        start - 10,
        'coworker_apartment',
        `${time(start - 10)}–${time(end + 10)} — claims the suspect ` +
        'was with them in their apartment.',
        coworkerRole,
        false
      ),
      makeCard(
        id('coworker_location'),
        start - 15,
        'workplace_reception',
        `${time(start - 15)}–${time(end + 15)} — says the coworker ` +
        `never left the front desk of ${profile.workplace}.`,
        receptionistRole
      )
    ];

    contradiction = {
      witnessRoleId: 'coworker',
      supportingRoleId: 'receptionist',
      explanation:
        'The coworker claims to have stayed with the suspect in their ' +
        'apartment, but the receptionist places that coworker at ' +
        `${profile.workplace} for the entire claimed interval. ` +
        'The alleged meeting cannot have happened as described.'
    };
  }

  const minutes = cards.map((card) => card.minute);

  if (new Set(minutes).size !== cards.length) {
    throw new Error(
      'Alibi cards must all have different times: ' + minutes.join(', ')
    );
  }

  const trueTimeline = [...cards].sort(
    (a, b) => a.minute - b.minute
  );

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

      timelineCard: cards[index],

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
    boardCards: shuffleSeeded(cards, seed ^ 0x9e3779b9)
  };
}

export const AlibiWitnessData = {
  WITNESS_ROLES,
  WITNESS_TEXTURE_KEYS,
  generateAlibiWitnesses,
  formatAlibiTime
};