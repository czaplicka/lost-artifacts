import { CHALLENGES } from './Config.js';
import { MODES, CUES, CHALLENGE_PROGRESS, CHALLENGE_SETBACK } from './ChallengeData.js';
import { getCooperationState } from './State.js';
import { getInterviewView } from './View.js';
import { hash, findData, addEntry, spendMinutes } from './Runtime.js';
import { savedLine, voiceLine, detectiveLine } from './Dialogue.js';
import { validateEvidenceSelection } from './EvidenceModel.js';
function threadFor(state, topic) {
  if (!state.confrontations[topic]) {
    const first = hash(
      `${state.dialogueSeed}:${topic}:first`
    ) % 3;

    const second = (
      first +
      1 +
      hash(`${state.dialogueSeed}:${topic}:second`) % 2
    ) % 3;

    state.confrontations[topic] = {
      stage: 0,
      failures: 0,
      attempts: 0,
      modes: [
        MODES[first],
        MODES[second]
      ],
      resolved: false
    };
  }

  return state.confrontations[topic];
}

function cue(caseKey, state, topic, thread) {
  const mode = thread.modes[
    Math.min(thread.stage, 1)
  ];

  return savedLine(
    caseKey,
    state,
    `cue:${topic}:${thread.stage}:${thread.failures}`,
    CUES[mode]
  );
}

export function challengeWitness(
  caseKey,
  encounterId,
  topic
) {
  const view = getInterviewView(
    caseKey,
    encounterId
  );

  const state = view.state;

  if (
    !view.canChallenge ||
    state.pendingChallenge ||
    state.revisedStatement
  ) {
    return null;
  }

  const challenge = CHALLENGES.find(
    entry => entry.id === topic
  );

  if (!challenge) return null;

  const thread = threadFor(state, topic);

  if (thread.resolved) {
    return state.transcript.find(
      entry => entry.id === `resolved:${topic}`
    ) || null;
  }

  thread.attempts++;
  state.pendingChallenge = topic;

  if (!state.challenges.includes(topic)) {
    state.challenges.push(topic);
  }

  return addEntry(
    state,
    `challenge:${topic}:${thread.attempts}`,
    challenge.label,
    cue(caseKey, state, topic, thread),
    'Compare the collected accounts. Opening a topic does not identify a liar.'
  );
}

export function followUpChallenge(
  caseKey,
  encounterId,
  mode
) {
  if (!MODES.includes(mode)) return null;

  const state = getCooperationState(
    caseKey,
    encounterId
  );

  const topic = state.pendingChallenge;

  if (!topic) return null;

  const {
    subject,
    witness
  } = findData(caseKey, encounterId);

  const thread = threadFor(state, topic);

  const turn = `${topic}:${thread.stage}:${thread.failures}`;

  const question = detectiveLine(
    caseKey,
    state,
    mode,
    `followup:${turn}:${mode}`
  );

  const expected = thread.modes[
    Math.min(thread.stage, 1)
  ];

  if (mode !== expected) {
    thread.failures++;
    spendMinutes(5);

    if (mode === 'press') {
      state.level = Math.max(0, state.level - 1);
    }

    if (
      mode === 'pause' ||
      state.level < 2
    ) {
      state.pendingChallenge = null;
    }

    const setback = savedLine(
      caseKey,
      state,
      `setback:${topic}:${thread.failures}`,
      CHALLENGE_SETBACK
    );

    return addEntry(
      state,
      `followup:${topic}:${state.transcript.length}`,
      question,
      `${setback} ${cue(caseKey, state, topic, thread)}`,
      '5 minutes spent. No new fact recorded.'
    );
  }

  thread.stage++;

  if (thread.stage < 2) {
    if (mode === 'pause') {
      state.pendingChallenge = null;
    }

    const progress = savedLine(
      caseKey,
      state,
      `progress:${topic}:${thread.stage}`,
      CHALLENGE_PROGRESS
    );

    return addEntry(
      state,
      `step:${topic}:1`,
      question,
      `${progress} ${cue(caseKey, state, topic, thread)}`,
      'The topic is not resolved yet.'
    );
  }

  state.pendingChallenge = null;
  thread.resolved = true;

  const validation = validateEvidenceSelection(caseKey, encounterId, thread.evidenceProof);
  const relevant = validation.valid && validation.topic === topic;

  let answer;

  if (relevant) {
    state.revisedStatement = voiceLine(
      caseKey,
      state,
      'retraction',
      `retraction:${topic}`
    );

    state.revisedStatement += ` I withdraw this claim: "${validation.proof.targetText}" The recorded account from ${validation.proof.evidenceRole} contradicts it.`;
    answer = state.revisedStatement;
  } else {
    answer = voiceLine(
      caseKey,
      state,
      'standBy',
      `standBy:${topic}`
    );
  }

  return addEntry(
    state,
    `resolved:${topic}`,
    question,
    answer,
    relevant
      ? 'Retraction recorded alongside the original. You must still draw your own conclusion.'
      : 'No retraction. This does not certify that the entire account is true.'
  );
}
