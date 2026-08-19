// AlibiEncounterSetup.js
// Connects AlibiWitnessData with gameState.crimeCityEncounterState.
// CrimeCityScene already reads this structure in createNpcSpots().

import { gameState } from './GameData.js';
import { generateAlibiWitnesses } from './AlibiWitnessData.js';

function getActiveSuspects() {
  if (!Array.isArray(gameState.caseSuspects)) {
    return [];
  }

  return gameState.caseSuspects.filter(
    (suspect) => !suspect?.deductionState?.eliminated
  );
}

function findSuspect(suspectId) {
  if (!Array.isArray(gameState.caseSuspects)) {
    return null;
  }

  return gameState.caseSuspects.find(
    (suspect) => suspect?.id === suspectId
  ) || null;
}

function getWitnessData(suspect, caseKey) {
  return generateAlibiWitnesses(suspect, caseKey);
}

/**
 * Creates 3 alibi contacts per active suspect and saves them in the exact
 * place CrimeCityScene.getCrimeCityEncounters() reads from.
 *
 * Call this after Crime Lab is completed:
 *   ensureAlibiEncounters(this.getCaseKey());
 */
export function ensureAlibiEncounters(caseKey) {
  if (
    !gameState.crimeCityEncounterState ||
    typeof gameState.crimeCityEncounterState !== 'object'
  ) {
    gameState.crimeCityEncounterState = {};
  }

  const existingEncounters = gameState.crimeCityEncounterState[caseKey];

  // Do not regenerate on every return to the city. This keeps completed
  // conversations, visit state and the same NPC list stable after save/load.
  if (Array.isArray(existingEncounters) && existingEncounters.length > 0) {
    return existingEncounters;
  }

  const encounters = [];

  getActiveSuspects().forEach((suspect) => {
    const { witnesses } = getWitnessData(suspect, caseKey);

    witnesses.forEach((witness) => {
      encounters.push({
        id: `alibi_${suspect.id}_${witness.role.toLowerCase()}`,
        npcId: witness.npcId,
        suspectId: suspect.id,
        locationId: 'alibi_contact',
        textureKey: witness.textureKey,
        label: `${witness.role} of ${suspect.name || 'suspect'}`,
        enabled: true,
        alibiWitness: true,
        witnessRole: witness.role
      });
    });
  });

  gameState.crimeCityEncounterState[caseKey] = encounters;

  console.log('[AlibiEncounterSetup] Alibi encounters created.', {
    caseKey,
    activeSuspects: getActiveSuspects().map((suspect) => suspect.id),
    encounterCount: encounters.length,
    encounters
  });

  return encounters;
}

/**
 * Returns generated dialogue/evidence data for the clicked witness.
 * Later call this from LocationScene with its existing scene data:
 *
 * const testimony = getWitnessTestimony(caseKey, suspectId, npcId);
 */
export function getWitnessTestimony(caseKey, suspectId, npcId) {
  const suspect = findSuspect(suspectId);

  if (!suspect) {
    return null;
  }

  const { witnesses, boardCards, trueTimeline } = getWitnessData(suspect, caseKey);
  const witness = witnesses.find((item) => item.npcId === npcId);

  if (!witness) {
    return null;
  }

  return {
    suspectId,
    suspectName: suspect.name || 'the suspect',
    npcId,
    role: witness.role,
    tone: witness.tone,
    textureKey: witness.textureKey,
    statement: witness.statement,
    contradictionHint: witness.contradictionHint,
    timelineCard: witness.timelineCard,
    motiveFragment: witness.motiveFragment,
    boardCards,
    trueTimeline,
    allWitnessesVisited: allWitnessesVisited(caseKey, suspectId)
  };
}

function getWitnessEncounterIds(caseKey, suspectId) {
  const encounters = gameState.crimeCityEncounterState?.[caseKey] || [];

  return encounters
    .filter(
      (encounter) =>
        encounter?.suspectId === suspectId &&
        encounter?.alibiWitness === true
    )
    .map((encounter) => encounter.id);
}

export function allWitnessesVisited(caseKey, suspectId) {
  const witnessEncounterIds = getWitnessEncounterIds(caseKey, suspectId);

  if (witnessEncounterIds.length === 0) {
    return false;
  }

  const visitedEncounters = Array.isArray(gameState.visitedEncounters)
    ? gameState.visitedEncounters
    : [];

  return witnessEncounterIds.every((encounterId) =>
    visitedEncounters.includes(encounterId)
  );
}

/**
 * Saves the player's choice of who lied.
 * Returns whether that witness actually lied.
 */
export function recordAlibiAccusation(caseKey, suspectId, npcId) {
  if (!gameState.alibiAccusations || typeof gameState.alibiAccusations !== 'object') {
    gameState.alibiAccusations = {};
  }

  if (!gameState.alibiAccusations[caseKey]) {
    gameState.alibiAccusations[caseKey] = {};
  }

  const suspect = findSuspect(suspectId);

  if (!suspect) {
    return {
      correct: false,
      message: 'Unknown suspect.'
    };
  }

  const { witnesses } = getWitnessData(suspect, caseKey);
  const witness = witnesses.find((item) => item.npcId === npcId);

  if (!witness) {
    return {
      correct: false,
      message: 'Unknown witness.'
    };
  }

  gameState.alibiAccusations[caseKey][suspectId] = npcId;

  return {
    correct: witness.isLiar,
    message: witness.isLiar
      ? `Correct. The ${witness.role.toLowerCase()} is protecting ${suspect.name || 'the suspect'}.`
      : `Wrong. The ${witness.role.toLowerCase()} is not the liar.`
  };
}

export function getAlibiAccusation(caseKey, suspectId) {
  return gameState.alibiAccusations?.[caseKey]?.[suspectId] || null;
}

/**
 * Call only after winning AlibiTimelineScene.
 * SuspectsScene already knows how to display deductionState.alibiStatus.
 */
export function resolveAlibiTimelineSuccess(caseKey, suspectId) {
  const suspect = findSuspect(suspectId);

  if (!suspect) {
    return 'pending';
  }

  const accusedNpcId = getAlibiAccusation(caseKey, suspectId);

  if (!accusedNpcId) {
    return 'pending';
  }

  const { witnesses } = getWitnessData(suspect, caseKey);
  const accusedWitness = witnesses.find((item) => item.npcId === accusedNpcId);
  const status = accusedWitness?.isLiar ? 'contradicted' : 'pending';

  if (!suspect.deductionState) {
    suspect.deductionState = {};
  }

  suspect.deductionState.alibiStatus = status;

  return status;
}

export function getTimelineBoardData(caseKey, suspectId) {
  const suspect = findSuspect(suspectId);

  if (!suspect) {
    return {
      boardCards: [],
      trueTimeline: []
    };
  }

  const { boardCards, trueTimeline } = getWitnessData(suspect, caseKey);

  return {
    boardCards,
    trueTimeline
  };
}