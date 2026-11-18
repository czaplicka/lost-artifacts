import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { profileFor, pick } from './AlibiCooperationRuntime.js';
import { DETECTIVE_LINES } from './AlibiDialogueData.js';
import { VOICES } from './AlibiVoices.js';
export function savedLine(caseKey, state, slot, pool) {
  state.dialogueLines ??= {};

  if (
    typeof state.dialogueLines[slot] === 'string' &&
    state.dialogueLines[slot]
  ) {
    return state.dialogueLines[slot];
  }

  if (!Array.isArray(pool) || !pool.length) {
    throw new Error(`Missing dialogue pool: ${slot}`);
  }

  const stored =
    gameState.caseData?.alibiCases?.[caseKey];

  const counts = new Map(
    pool.map(line => [line, 0])
  );

  const countLine = line => {
    if (counts.has(line)) {
      counts.set(line, counts.get(line) + 1);
    }
  };

  for (const other of Object.values(stored?.cooperation || {})) {
    const saved = Object.values(other?.dialogueLines || {});

    for (const line of saved) {
      countLine(line);
    }

    // Uwzględniamy także wcześniejsze rozmowy bez nowego zapisu kwestii.
    const alreadySaved = new Set(saved);

    for (const entry of other?.transcript || []) {
      for (const line of [entry.detective, entry.witness]) {
        if (!alreadySaved.has(line)) {
          countLine(line);
        }
      }
    }
  }

  const minimum = Math.min(...counts.values());

  const candidates = pool.filter(
    line => counts.get(line) === minimum
  );

  const selected = pick(
    candidates,
    `${state.dialogueSeed}:variety-v1:${slot}`
  );

  state.dialogueLines[slot] = selected;
  requestAutosave();

  return selected;
}

export function voiceLine(caseKey, state, category, slot = category) {
  const profile = profileFor(state);
  const pool = VOICES[profile.id]?.[category];

  return savedLine(
    caseKey,
    state,
    `witness:${slot}`,
    pool
  );
}

export function detectiveLine(caseKey, state, category, slot = category) {
  return savedLine(
    caseKey,
    state,
    `detective:${slot}`,
    DETECTIVE_LINES[category]
  );
}
