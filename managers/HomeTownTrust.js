import { dialogueManager } from './DialogueManager.js';

import {
  TRUST_DEFAULT,
  clampTrust,
  getTrustLevel,
} from './TrustManager.js';

const DEFAULT_DELTAS = Object.freeze({
  nice: 2,
  neutral: 0,
  rude: -4,
});

const CHOICE_PREFIX = '__home_town_reply__:';

function validId(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeId(value) {
  return validId(value) ? value.trim() : null;
}

function requireId(value, label) {
  const id = normalizeId(value);

  if (!id) {
    throw new TypeError(
      `[HomeTownTrust] ${label} must be a non-empty string.`
    );
  }

  return id;
}

function syncManager() {
  // Wspólne dane i zapis z istniejącym DialogueManager.
  dialogueManager._sync();
}

function commitManager() {
  dialogueManager._commit();
}

function choiceKey(choiceId) {
  return CHOICE_PREFIX + requireId(choiceId, 'Choice id');
}

export function resolveHomeTownTrustDelta(
  choice = {},
  reactions = {}
) {
  if (Number.isFinite(choice.trustDelta)) {
    return Math.round(choice.trustDelta);
  }

  const attitude = choice.attitude ?? 'neutral';

  if (Number.isFinite(reactions?.[attitude])) {
    return Math.round(reactions[attitude]);
  }

  return DEFAULT_DELTAS[attitude] ?? 0;
}

export function getHomeTownTrust(
  npcId,
  startTrust = TRUST_DEFAULT
) {
  const id = requireId(npcId, 'NPC id');

  syncManager();

  const value = dialogueManager.trust.get(
    id,
    clampTrust(startTrust)
  );

  return {
    npcId: id,
    value,
    level: getTrustLevel(value),
  };
}

export function hasHomeTownTrustChoice(npcId, choiceId) {
  const id = requireId(npcId, 'NPC id');
  const key = choiceKey(choiceId);

  syncManager();

  const state = dialogueManager.states.get(id);

  return Number(state?.asked?.[key] || 0) > 0;
}

export function applyHomeTownTrustChoice({
  npcId,
  choiceId,
  attitude = 'neutral',
  trustDelta,
  reactions = {},
  startTrust = TRUST_DEFAULT,
}) {
  const id = requireId(npcId, 'NPC id');
  const key = choiceKey(choiceId);

  syncManager();

  const trust = dialogueManager.trust;
  const state = dialogueManager._state(id);
  const before = trust.get(id, clampTrust(startTrust));

  if (Number(state.asked[key] || 0) > 0) {
    return {
      npcId: id,
      before,
      after: before,
      delta: 0,
      repeated: true,
      level: getTrustLevel(before),
    };
  }

  const delta = resolveHomeTownTrustDelta(
    { attitude, trustDelta },
    reactions
  );

  trust.ensure(id, clampTrust(startTrust));

  const result = trust.add(id, delta);

  // Ten sam wybór wpływa na zaufanie tylko raz w zapisie gry.
  state.asked[key] = 1;

  commitManager();

  return {
    npcId: id,
    ...result,
    repeated: false,
  };
}