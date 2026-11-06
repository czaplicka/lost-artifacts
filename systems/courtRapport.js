import {
  COURT_CONFIG,
  buildCourtFacts as buildBaseFacts,
  createCourtRecord as createBaseRecord,
  answerCourtQuestion,
  advanceCourt,
  validCourt as validBaseCourt
} from './courtLogic.js';

import { getEffectiveStats } from
  '../ui/characterCreation/CharacterCreationData.js';

export {
  COURT_CONFIG,
  answerCourtQuestion,
  advanceCourt
};

const clamp = value => Math.max(0, Math.min(100, value));

function readBonus(facts) {
  const bonus = facts?.courtRapportBonus;

  // Existing trials without a bonus keep their original starting trust.
  if (bonus === undefined) return 0;

  if (
    !Number.isInteger(bonus) ||
    bonus < 0 ||
    bonus > 16 ||
    bonus % 2 !== 0
  ) {
    throw new Error('Invalid saved court rapport bonus.');
  }

  return bonus;
}

export function buildCourtFacts(state, suspectId) {
  const facts = buildBaseFacts(state, suspectId);

  const stats = getEffectiveStats({
    profile: state.detectiveProfile || 'analyst',
    stats: state.detectiveStats || {}
  });

  const raw = Number(stats.rapport);

  const rapport = Number.isFinite(raw)
    ? Math.max(0, Math.floor(raw))
    : 0;

  return {
    ...facts,
    courtRapport: rapport,
    courtRapportBonus: Math.min(16, rapport * 2)
  };
}

export function createCourtRecord(facts) {
  const record = createBaseRecord(facts);

  record.trust = clamp(
    COURT_CONFIG.initialTrust + readBonus(facts)
  );

  return record;
}

export function validCourt(record, state, suspectId = null) {
  try {
    if (
      !record ||
      !record.facts ||
      !Array.isArray(record.answers) ||
      !Array.isArray(record.questions) ||
      record.answers.length > record.questions.length ||
      (
        record.resultCommitted !== undefined &&
        typeof record.resultCommitted !== 'boolean'
      ) ||
      (
        record.resultCommitted === true &&
        record.phase !== 'verdict'
      )
    ) {
      return false;
    }

    readBonus(record.facts);

    // Base validation verifies case identity, warrant and fact structure.
    const base = createBaseRecord(record.facts);

    if (!validBaseCourt(base, state, suspectId)) {
      return false;
    }

    // Replay with the saved starting bonus, never the current live stat.
    const replay = createCourtRecord(record.facts);

    for (let i = 0; i < record.answers.length; i++) {
      const saved = record.answers[i];

      if (!saved || !answerCourtQuestion(replay, saved.answerIndex)) {
        return false;
      }

      const actual = replay.answers[replay.answers.length - 1];

      if (
        saved.questionId !== actual.questionId ||
        saved.delta !== actual.delta ||
        saved.trust !== actual.trust
      ) {
        return false;
      }

      if (
        i < record.answers.length - 1 ||
        record.phase !== 'feedback'
      ) {
        if (!advanceCourt(replay)) return false;
      }
    }

    const fields = [
      'version',
      'caseId',
      'campaignId',
      'suspectId',
      'questions',
      'index',
      'trust',
      'identityExposed',
      'phase',
      'feedback',
      'answers',
      'verdict'
    ];

    return fields.every(
      key => JSON.stringify(record[key]) === JSON.stringify(replay[key])
    );
  } catch {
    return false;
  }
}