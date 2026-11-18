import { getCooperationState } from './State.js';
import { findData, addEntry } from './Runtime.js';
import { voiceLine, detectiveLine } from './Dialogue.js';
export function askWitness(
  caseKey,
  encounterId,
  topic
) {
  const state = getCooperationState(
    caseKey,
    encounterId
  );

  const {
    subject,
    witness
  } = findData(caseKey, encounterId);

  if (state.pendingChallenge) return null;

  const existing = state.transcript.find(
    entry => entry.id === `question:${topic}`
  );

  // Ponowne pytanie odtwarza zapisaną wypowiedź.
  if (existing) return existing;

  let question;
  let answer;
  let note = '';

  if (topic === 'statement') {
    question = detectiveLine(
      caseKey,
      state,
      'statement'
    ).replace(
      '{name}',
      subject.suspectName || 'this person'
    );

    if (state.level === 0) {
      return addEntry(
        state,
        `refusal:${state.transcript.length}`,
        question,
        voiceLine(
          caseKey,
          state,
          'refusal',
          `refusal:${state.transcript.length}`
        ),
        "No statement recorded. Address the witness's concern."
      );
    }

    answer = voiceLine(caseKey, state, 'basic');

    note =
      'Basic contact recorded. ' +
      'Times, places and sequence remain unknown.';
  } else if (topic === 'summary') {
    if (
      state.level < 2 ||
      !state.asked.includes('statement')
    ) {
      return null;
    }

    question = detectiveLine(
      caseKey,
      state,
      'summary'
    );

    // Fakty alibi pozostają dokładnie takie jak w generatorze.
    answer = String(witness.statement || '');

    if (!answer) return null;

    state.detailsUnlocked = true;

    note =
      'Detailed account recorded. Its timeline note is now available. ' +
      'This is testimony, not proof of truth.';
  } else if (topic === 'person') {
    if (state.level === 0) return null;

    question = detectiveLine(
      caseKey,
      state,
      'person'
    );

    answer = voiceLine(
      caseKey,
      state,
      'person'
    );

    note = 'Context only. No new alibi evidence.';
  } else if (topic === 'personal') {
    if (
      state.level < 2 ||
      !state.asked.includes('person')
    ) {
      return null;
    }

    question = detectiveLine(
      caseKey,
      state,
      'personal'
    );

    answer = voiceLine(
      caseKey,
      state,
      'personal'
    );

    note =
      'Their concern may help you choose how to repair cooperation. ' +
      'No timeline fact unlocked.';
  } else if (topic === 'withheld') {
    if (
      state.level < 3 ||
      !state.detailsUnlocked
    ) {
      return null;
    }

    question = detectiveLine(
      caseKey,
      state,
      'withheld'
    );

    if (state.revisedStatement) {
      answer = voiceLine(
        caseKey,
        state,
        'correctionKnown'
      );
    } else if (
      typeof witness.motiveFragment === 'string' &&
      witness.motiveFragment.trim()
    ) {
      answer = witness.motiveFragment;
    } else {
      answer = voiceLine(
        caseKey,
        state,
        'nothing'
      );
    }

    note =
      'Additional context only. A retraction still requires ' +
      'a specific, supported challenge.';
  } else {
    return null;
  }

  if (!state.asked.includes(topic)) {
    state.asked.push(topic);
  }

  return addEntry(
    state,
    `question:${topic}`,
    question,
    answer,
    note
  );
}
