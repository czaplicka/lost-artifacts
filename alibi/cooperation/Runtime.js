import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { getEffectiveStats } from '../../ui/characterCreation/CharacterCreationData.js';
import { EventBus } from '../../EventBus.js';
import { PROFILES } from './Config.js';
export function hash(value) {
  let result = 2166136261;

  for (const character of String(value)) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }

  return result >>> 0;
}

export function pick(pool, key) {
  return pool[hash(key) % pool.length];
}

export function findData(caseKey, encounterId) {
  const stored =
    gameState.caseData?.alibiCases?.[caseKey];

  const encounter =
    gameState.crimeCityEncounterState?.[caseKey]?.find(
      entry =>
        entry.id === encounterId &&
        entry.alibiWitness === true
    );

  const subject = stored?.suspects?.find(
    entry => entry.suspectId === encounter?.suspectId
  );

  const witness = subject?.witnesses?.find(
    entry => entry.npcId === encounter?.npcId
  );

  if (!stored || !encounter || !subject || !witness) {
    throw new Error('Missing stored alibi witness.');
  }

  return {
    stored,
    encounter,
    subject,
    witness
  };
}

export function profileFor(state) {
  return PROFILES.find(
    profile => profile.id === state.profileId
  ) || PROFILES[0];
}

// Wybór zapisujemy osobno od transkryptu.
// Po wyczerpaniu puli wybierana jest najmniej używana kwestia.

export function getRapport() {
  const stats = getEffectiveStats({
    profile: gameState.detectiveProfile || 'analyst',
    stats: gameState.detectiveStats || {}
  });

  return Math.max(
    0,
    Math.floor(Number(stats.rapport) || 0)
  );
}

export function addEntry(
  state,
  id,
  detective,
  witness,
  note = ''
) {
  const entry = {
    id,
    detective,
    witness,
    note
  };

  state.transcript.push(entry);
  requestAutosave();

  return entry;
}

export function spendMinutes(minutes) {
  gameState.timeSpent =
    (Number(gameState.timeSpent) || 0) +
    minutes / 60;

  EventBus.emit('advanceTime', 0, minutes);
  requestAutosave();
}
