import { CHALLENGES } from './AlibiCooperationConfig.js';
import { MODES, CUES, CHALLENGE_PROGRESS, CHALLENGE_SETBACK } from './AlibiChallengeData.js';
import { getCooperationState } from './AlibiCooperationState.js';
import { getInterviewView } from './AlibiInterviewView.js';
import { hash, findData, addEntry, spendMinutes } from './AlibiCooperationRuntime.js';
import { savedLine, voiceLine, detectiveLine } from './AlibiDialogue.js';
import { checkEvidence, evidenceStillValid, RETRACTION_DETAILS } from './AlibiEvidence.js';
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

function openChallenge(
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
    return state.transcript.filter(
      entry => entry.id === `resolved:${topic}`
    ).at(-1) || null;
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


export function challengeWitness(caseKey, encounterId, selection) {
  const view = getInterviewView(caseKey, encounterId), state = view.state;
  if (!view.canChallenge || state.pendingChallenge || state.revisedStatement) return null;
  const bundle = checkEvidence(caseKey, encounterId, selection);
  if (!bundle) return null;
  state.evidenceAttempts ??= [];
  state.evidenceAttempts.push({ statementId: bundle.statement.id,
    evidenceId: bundle.evidence.id, reason: bundle.reason, supported: bundle.supported });
  if (!bundle.supported) {
    spendMinutes(5);
    return addEntry(state, `evidence:unsupported:${state.evidenceAttempts.length}`,
      `I compared your account with ${bundle.evidence.name}'s account.`,
      'Those accounts do not establish the point you are making.',
      '5 minutes spent. No correction recorded. Cooperation unchanged.');
  }
  state.activeEvidence = bundle;
  const thread = state.confrontations[bundle.topic];
  if (thread?.resolved && !state.revisedStatement) { thread.resolved = false; thread.stage = 0; }
  const entry = openChallenge(caseKey, encounterId, bundle.topic);
  if (entry) {
    entry.detective = `Your recorded account: "${bundle.statement.quote}"\n\n` +
      `${bundle.evidence.name}'s account: "${bundle.evidence.quote}"\n\n` + entry.detective;
    entry.note = 'The selected comparison is recorded. Listen and follow up; no retraction yet.';
  }
  return entry;
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
  if (!evidenceStillValid(caseKey, encounterId, state.activeEvidence)) {
    state.pendingChallenge = null; state.activeEvidence = null;
    return addEntry(state, 'evidence:expired', 'Let us check the recorded accounts again.',
      'We need to return to the statements before continuing.', 'No facts or retraction added.');
  }

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

  const relevant = evidenceStillValid(caseKey, encounterId, state.activeEvidence);

  let answer;

  if (relevant) {
    state.revisedStatement = voiceLine(
      caseKey,
      state,
      'retraction',
      `retraction:${topic}`
    );

    state.revisedStatement += " " + RETRACTION_DETAILS[state.activeEvidence.pattern];
    state.correctedEvidence = structuredClone(state.activeEvidence);
    answer = state.revisedStatement;
  } else {
    answer = voiceLine(
      caseKey,
      state,
      'standBy',
      `standBy:${topic}`
    );
  }

  state.activeEvidence = null;

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
