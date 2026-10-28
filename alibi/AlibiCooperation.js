import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { getEffectiveStats } from '../ui/characterCreation/CharacterCreationData.js';

export const COOPERATION_LABELS = [
  'Guarded',
  'Cautious',
  'Cooperative',
  'Open'
];

export const APPROACHES = [
  {
    id: 'reassure',
    label: 'Reassure',
    line: "Take your time. I want your account, not a performance."
  },
  {
    id: 'direct',
    label: 'Be direct',
    line: "I'll keep this brief. Specific questions, specific answers."
  },
  {
    id: 'joke',
    label: 'Share a joke',
    line: "Relax. The notebook looks official, but half of it is shopping."
  }
];

export const CHALLENGES = [
  { id: 'host', label: "The host's location" },
  { id: 'room', label: 'The sealed room' },
  { id: 'departure', label: 'The early departure' },
  { id: 'arrival', label: 'The late arrival' },
  { id: 'date', label: 'The attendance date' },
  { id: 'duration', label: 'The length of the visit' }
];

const PERSONALITIES = [
  {
    id: 'worried',
    hint: 'Worried — reassurance may help.',
    opening:
      "Am I in trouble? Please be specific. I worry more efficiently with a list.",
    likes: 'reassure',
    dislikes: 'direct',
    positive:
      "Thank you. Notebooks make me nervous. Especially when people underline things.",
    neutral:
      "All right. What would you like to know?",
    negative:
      "Could you not make this sound like I've already been sentenced?"
  },
  {
    id: 'busy',
    hint: 'Busy — get to the point.',
    opening:
      "Five minutes, detective. My unfinished work has started reproducing.",
    likes: 'direct',
    dislikes: 'joke',
    positive:
      "Excellent. Someone who understands that a clock is not a decorative plate.",
    neutral:
      "Fine. But keep it short.",
    negative:
      "Lovely. A comedy show. Does the investigation start after the interval?"
  },
  {
    id: 'chatty',
    hint: 'Talkative — humour may help.',
    opening:
      "Finally! Someone asking questions. Usually people just pretend their phone is ringing.",
    likes: 'joke',
    dislikes: 'direct',
    positive:
      "Ha! Fine. You can stay. The notebook too.",
    neutral:
      "Of course. Ask away.",
    negative:
      "Well. You could at least pretend this is a conversation."
  }
];

const OPINIONS = [
  {
    short:
      "I didn't say we were friends. We were in the same room. Very different subscription plans.",
    open:
      "Honestly? I try not to judge people too quickly. I prefer to collect enough material to judge them properly.",
    secret:
      "I was trying not to get involved. There's no polite way to say 'please investigate somebody else's afternoon'."
  },
  {
    short:
      "You want my opinion? Dangerous. Most people only want a shorter version of their own.",
    open:
      "Whatever I think of them personally, it shouldn't become evidence. Though I would enjoy being quoted accurately for once.",
    secret:
      "I didn't want to sound like a gossip. That's a reputation I've spent years disguising as 'being well informed'."
  },
  {
    short:
      "I know them from the session. Not from a secret criminal book club, before you ask.",
    open:
      "I can tell you what happened around me. Their entire inner life wasn't included in the booking.",
    secret:
      "The investigation frightened me. I thought a short answer would mean a short conversation. Clearly an amateur mistake."
  }
];

const RETRACTIONS = {
  host:
    "I withdraw my claim that we were together at my apartment. That meeting did not happen as I described it. I cannot provide that alibi.",
  room:
    "I withdraw my claim that we were inside that room together. We were not having the meeting I described. I cannot provide that alibi.",
  departure:
    "I withdraw my claim that they stayed with me throughout that period. My account of uninterrupted attendance was false.",
  arrival:
    "I withdraw my claim that they were already with me before the theft. I cannot support that arrival time.",
  date:
    "I withdraw my claim that the meeting I described happened on the day of the theft. I presented the wrong day as their alibi.",
  duration:
    "I withdraw my claim that the visit lasted throughout the theft. I extended the visit in my account."
};

function hash(value) {
  let result = 2166136261;

  for (const character of String(value)) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }

  return result >>> 0;
}

function readCase(caseKey) {
  const entry = gameState.caseData?.alibiCases?.[caseKey];

  if (!entry) {
    throw new Error('Missing stored alibi case.');
  }

  return entry;
}

function findData(caseKey, encounterId) {
  const encounters =
    gameState.crimeCityEncounterState?.[caseKey];

  const encounter = encounters?.find(
    item => item.id === encounterId
  );

  if (!encounter) {
    throw new Error('Missing witness encounter.');
  }

  const subject = readCase(caseKey).suspects.find(
    item => item.suspectId === encounter.suspectId
  );

  const witness = subject?.witnesses.find(
    item => item.npcId === encounter.npcId
  );

  if (!subject || !witness) {
    throw new Error('Missing stored witness.');
  }

  return { encounter, subject, witness };
}

export function getRapport() {
  const stats = getEffectiveStats({
    profile: gameState.detectiveProfile || 'analyst',
    stats: gameState.detectiveStats || {}
  });

  const value = Number(stats.rapport);

  return Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

export function getWitnessPersonality(caseKey, encounterId) {
  return PERSONALITIES[
    hash(`personality:${caseKey}:${encounterId}`) %
      PERSONALITIES.length
  ];
}

export function getCooperationState(caseKey, encounterId) {
  const stored = readCase(caseKey);

  stored.cooperation ??= {};

  if (!stored.cooperation[encounterId]) {
    const { encounter } = findData(caseKey, encounterId);

    stored.cooperation[encounterId] = {
      version: 2,
      level: getRapport() >= 6 ? 2 : 1,
      usedApproaches: [],
      positiveBonusUsed: false,
      protectionUsed: false,
      asked: encounter.dialogueCompleted ? ['statement'] : [],
      transcript: [],
      challenges: [],
      pendingChallenge: null,
      revisedStatement: null
    };

    requestAutosave();
  }

  const state = stored.cooperation[encounterId];

  // Compatible with the previous cooperation file.
  state.challenges ??= [];
  state.pendingChallenge ??= null;
  state.revisedStatement ??= null;
  state.transcript ??= [];
  state.asked ??= [];
  state.usedApproaches ??= [];

  return state;
}

function addEntry(state, id, detective, witness, note = '') {
  const entry = { id, detective, witness, note };

  state.transcript.push(entry);
  requestAutosave();

  return entry;
}

export function getInterviewView(caseKey, encounterId) {
  const state = getCooperationState(caseKey, encounterId);
  const { encounter, subject, witness } =
    findData(caseKey, encounterId);

  const encounters =
    gameState.crimeCityEncounterState?.[caseKey] || [];

  const otherWitnesses = subject.witnesses.filter(
    item => item.npcId !== witness.npcId
  );

  const otherAccountsRecorded = otherWitnesses.every(
    other => encounters.some(item =>
      item.suspectId === subject.suspectId &&
      item.npcId === other.npcId &&
      item.interviewed === true &&
      item.dialogueCompleted === true
    )
  );

  return {
    state,
    personality: getWitnessPersonality(caseKey, encounterId),
    completed:
      encounter.interviewed === true &&
      encounter.dialogueCompleted === true,
    canChallenge:
      state.asked.includes('statement') &&
      otherAccountsRecorded,
    originalStatement: witness.statement,
    revisedStatement: state.revisedStatement
  };
}

export function applyApproach(caseKey, encounterId, approachId) {
  const approach = APPROACHES.find(
    item => item.id === approachId
  );

  if (!approach) return null;

  const state = getCooperationState(caseKey, encounterId);

  if (
    state.pendingChallenge ||
    state.usedApproaches.includes(approachId)
  ) {
    return null;
  }

  const personality =
    getWitnessPersonality(caseKey, encounterId);

  const rapport = getRapport();
  const previous = state.level;

  let change = 0;
  let response = personality.neutral;
  let note = '';

  if (approachId === personality.likes) {
    change = 1;
    response = personality.positive;

    if (rapport >= 3 && !state.positiveBonusUsed) {
      change = 2;
      state.positiveBonusUsed = true;
      note = 'Rapport: stronger positive response.';
    }
  } else if (approachId === personality.dislikes) {
    change = -1;
    response = personality.negative;

    if (rapport >= 4 && !state.protectionUsed) {
      change = 0;
      state.protectionUsed = true;
      response += " Still, let's move on.";
      note = 'Rapport: first awkward moment recovered.';
    }
  }

  state.level = Math.max(0, Math.min(3, previous + change));
  state.usedApproaches.push(approachId);

  note = [
    `Cooperation ${state.level - previous >= 0 ? '+' : ''}` +
      `${state.level - previous}.`,
    note
  ].filter(Boolean).join(' ');

  return addEntry(
    state,
    `approach:${approachId}`,
    approach.line,
    response,
    note
  );
}

export function askWitness(caseKey, encounterId, topic) {
  const state = getCooperationState(caseKey, encounterId);
  const { subject, witness } = findData(caseKey, encounterId);

  if (state.pendingChallenge) return null;

  const existing = state.transcript.find(
    entry => entry.id === `question:${topic}`
  );

  if (existing) return existing;

  const opinion = OPINIONS[
    hash(`opinion:${caseKey}:${encounterId}`) % OPINIONS.length
  ];

  let question;
  let answer;
  let note = '';

  switch (topic) {
    case 'statement':
      question =
        `Where was ${subject.suspectName || 'the suspect'} ` +
        'during the theft?';
      answer = witness.statement;
      break;

    case 'person':
      question = 'What do you think of them personally?';
      answer = opinion.short;
      note = 'Personal opinion — not proof of guilt.';
      break;

    case 'personal':
      if (state.level < 2 || !state.asked.includes('person')) {
        return null;
      }

      question = "And off the record? What's your impression?";
      answer = opinion.open;
      note = 'Personal opinion — not proof of guilt.';
      break;

    case 'withheld':
      if (
        state.level < 3 ||
        !state.asked.includes('statement')
      ) {
        return null;
      }

      question = 'Is there something you were reluctant to tell me?';

      answer = state.revisedStatement
        ? "I've corrected my account. Keep both versions. I don't expect the first one to disappear because I dislike it now."
        : opinion.secret;

      note = 'A personal disclosure, not an alibi verdict.';
      break;

    case 'summary':
      if (
        state.level < 2 ||
        !state.asked.includes('statement') ||
        !witness.timelineCard?.label
      ) {
        return null;
      }

      question = 'What is the key point of your original account?';
      answer = witness.timelineCard.label;
      note = state.revisedStatement
        ? 'Original account — subsequently withdrawn.'
        : 'Summary of this witness’s claim, not independent verification.';
      break;

    default:
      return null;
  }

  if (!answer) return null;

  if (!state.asked.includes(topic)) state.asked.push(topic);

  return addEntry(
    state,
    `question:${topic}`,
    question,
    answer,
    note
  );
}

export function challengeWitness(caseKey, encounterId, topic) {
  const view = getInterviewView(caseKey, encounterId);
  const state = view.state;

  if (
    !view.canChallenge ||
    state.pendingChallenge ||
    state.revisedStatement
  ) {
    return null;
  }

  const challenge = CHALLENGES.find(item => item.id === topic);

  if (!challenge) return null;

  const previous = state.transcript.find(
    entry => entry.id === `challenge:${topic}`
  );

  if (previous) return previous;

  const { subject, witness } = findData(caseKey, encounterId);

  const scenarioMatch = String(subject.scenarioId || '')
    .match(/_false_([0-5])$/);

  const expectedTopic = scenarioMatch
    ? CHALLENGES[Number(scenarioMatch[1])]?.id
    : null;

  const relevant =
    witness.isLiar === true &&
    expectedTopic === topic;

  state.challenges.push(topic);

  if (relevant) {
    state.pendingChallenge = topic;

    return addEntry(
      state,
      `challenge:${topic}`,
      `I'd like you to explain your account in relation to ` +
        `${challenge.label.toLowerCase()}.`,
      "I've heard your question. Give me a moment.",
      'Choose how to follow up.'
    );
  }

  state.level = Math.max(0, state.level - 1);

  return addEntry(
    state,
    `challenge:${topic}`,
    `I'd like you to explain your account in relation to ` +
      `${challenge.label.toLowerCase()}.`,
    "I stand by my account. If you think there's a conflict, compare what each of us actually said.",
    'Cooperation -1, unless already at minimum. No verdict recorded.'
  );
}

export function followUpChallenge(caseKey, encounterId, mode) {
  if (!['space', 'press', 'pause'].includes(mode)) return null;

  const state = getCooperationState(caseKey, encounterId);
  const topic = state.pendingChallenge;

  if (!topic) return null;

  state.pendingChallenge = null;

  const question = {
    space: "Take your time. Tell me what you can honestly stand by.",
    press: "I need an explanation. Your account is being challenged.",
    pause: "We'll leave that there for now."
  }[mode];

  if (mode === 'space' && state.level >= 2) {
    state.revisedStatement = RETRACTIONS[topic];

    return addEntry(
      state,
      'revision',
      question,
      state.revisedStatement,
      'Revised account recorded. The original remains in the history.'
    );
  }

  if (mode === 'press') {
    state.level = Math.max(0, state.level - 1);
  }

  // A later visit may revisit the same challenge after warming the witness.
  state.transcript = state.transcript.map(entry =>
    entry.id === `challenge:${topic}`
      ? { ...entry, id: `previous:${entry.id}:${state.transcript.length}` }
      : entry
  );

  return addEntry(
    state,
    `followup:${state.transcript.length}`,
    question,
    mode === 'pause'
      ? "Fine. Let's talk about something else."
      : "I'm not changing my account right now.",
    'No revised statement. You can still assess the evidence yourself.'
  );
}