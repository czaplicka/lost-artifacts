import { requestAutosave } from '../../gameStatePersistence.js';
import { PROFILES } from './Config.js';
import { OPENINGS } from './DialogueData.js';
import { findData, pick, hash, profileFor } from './Runtime.js';
import { savedLine } from './Dialogue.js';
import { migrateEvidenceChallenges } from './EvidenceRules.js';
export function getCooperationState(caseKey, encounterId) {
  const {
    stored,
    encounter, subject, witness
  } = findData(caseKey, encounterId);

  stored.cooperation ??= {};

  let state = stored.cooperation[encounterId];
  let dirty = false;

  if (!state) {
    state = stored.cooperation[encounterId] = {
      level: 1,
      usedApproaches: [],
      asked: [],
      transcript: [],
      challenges: [],
      pendingChallenge: null,
      revisedStatement: null,
      confrontations: {},
      positiveBonusUsed: false,
      protectionUsed: false
    };

    if (
      encounter.interviewed &&
      encounter.dialogueCompleted
    ) {
      state.asked = ['statement', 'summary'];
    }

    dirty = true;
  }

  state.asked = Array.isArray(state.asked)
    ? state.asked
    : [];

  state.transcript = Array.isArray(state.transcript)
    ? state.transcript
    : [];

  state.usedApproaches = Array.isArray(state.usedApproaches)
    ? state.usedApproaches
    : [];

  state.challenges = Array.isArray(state.challenges)
    ? state.challenges
    : [];

  state.confrontations ??= {};
  state.pendingChallenge ??= null;
  state.revisedStatement ??= null;

  state.level = Math.max(
    0,
    Math.min(
      3,
      Number.isFinite(state.level)
        ? state.level
        : 1
    )
  );

  if (state.disclosureVersion !== 1) {
    state.detailsUnlocked =
      state.asked.includes('statement') ||
      Boolean(
        encounter.interviewed &&
        encounter.dialogueCompleted
      );

    state.disclosureVersion = 1;
    dirty = true;
  }

  if (!PROFILES.some(profile => profile.id === state.profileId)) {
    state.profileId = pick(
      PROFILES,
      `profile:${caseKey}:${encounterId}`
    ).id;

    dirty = true;
  }

  if (!Number.isInteger(state.dialogueSeed)) {
    state.dialogueSeed = hash(
      `dialogue-v3:${caseKey}:${encounterId}`
    );

    dirty = true;
  }

  if (state.version !== 4) {
    state.version = 4;
    dirty = true;
  }

  if (
    !state.dialogueLines ||
    typeof state.dialogueLines !== 'object' ||
    Array.isArray(state.dialogueLines)
  ) {
    state.dialogueLines = {};
    dirty = true;
  }

  if (migrateEvidenceChallenges(state, subject, witness)) dirty = true;
  if (dirty) {
    requestAutosave();
  }

  return state;
}

export function getWitnessPersonality(caseKey, encounterId) {
  const state = getCooperationState(
    caseKey,
    encounterId
  );

  const profile = profileFor(state);

  return {
    ...profile,
    opening: savedLine(
      caseKey,
      state,
      'opening',
      OPENINGS[profile.id]
    )
  };
}
