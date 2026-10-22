// AlibiEncounterSetup.js
import { gameState } from '../GameData.js';
import { getCaseSuspects } from '../suspects/CaseSuspects.js';
import { saveGameState, requestAutosave } from '../gameStatePersistence.js';
import { generateAlibiWitnesses, ALIBI_DATA_VERSION } from './AlibiWitnessData.js';

const GENERIC_NPC_KEYS = ['npc', 'npc1', 'npc2', 'npc3', 'npc4', 'npc5', 'npc6'];
const WITNESSES_PER_SUSPECT = 3;
export const NO_ALIBI_LIAR = '__no_liar__';

function clone(value) {
  return structuredClone(value);
}

function findSuspect(suspectId) {
  return getCaseSuspects(gameState).find(
    (suspect) => suspect?.id === suspectId
  ) || null;
}

// Returns null until the Evidence Grid has been submitted.
function getAlibiSubjects(caseKey) {
  const state = gameState.suspectExclusionState?.[caseKey];
  if (state?.finished !== true) return null;
  const manualIds = new Set(
    Array.isArray(state.manualExclusionIds) ? state.manualExclusionIds : []
  );
  return getCaseSuspects(gameState).filter((suspect) => suspect?.id &&
    suspect.deductionState?.eliminated !== true && !manualIds.has(suspect.id));
}

function toAlibiSubject(suspect) {
  const isThief = suspect.hiddenCaseData?.isTrueThief === true;
  return {
    ...suspect,
    hiddenCaseData: {
      ...(suspect.hiddenCaseData || {}),
      isTrueThief: isThief, isForensicTwin: !isThief
    }
  };
}

function getCrimeWindow() {
  const crimeWindow = gameState.caseData?.crimeWindow;
  if (!crimeWindow || !Number.isInteger(crimeWindow.day) ||
    !Number.isInteger(crimeWindow.startMinute) ||
    !Number.isInteger(crimeWindow.endMinute) || crimeWindow.startMinute < 30 ||
    crimeWindow.endMinute <= crimeWindow.startMinute || crimeWindow.endMinute > 1409) {
    throw new Error('Missing or invalid caseData.crimeWindow. ' +
      'Start a new case using the updated GameSetup.');
  }
  return crimeWindow;
}

function getSourceKey(caseKey, subjects, crimeWindow) {
  return JSON.stringify({
    version: ALIBI_DATA_VERSION, caseKey,
    window: {
      day: crimeWindow.day, startMinute: crimeWindow.startMinute,
      endMinute: crimeWindow.endMinute
    },
    suspects: subjects.map((suspect) => ({
      id: suspect.id, name: suspect.name || '',
      occupation: suspect.occupation || suspect.publicProfile?.occupation || '',
      isThief: suspect.hiddenCaseData?.isTrueThief === true
    }))
  });
}

function ensureStores() {
  if (!gameState.caseData || typeof gameState.caseData !== 'object') {
    throw new Error('Missing caseData.');
  }
  gameState.caseData.alibiCases ??= {};
  gameState.crimeCityEncounterState ??= {};
  gameState.alibiAccusations ??= {};
}

function getStoredCase(caseKey) {
  return gameState.caseData?.alibiCases?.[caseKey] || null;
}

function getStoredWitnessData(caseKey, suspectId) {
  const entry = getStoredCase(caseKey);
  return entry?.suspects?.find((item) => item.suspectId === suspectId) || null;
}

function getWitnessEncounterId(suspectId, witness, index = 0) {
  const roleKey = String(witness?.role || witness?.npcId || `witness_${index + 1}`)
    .trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `alibi_${suspectId}_${roleKey || `witness_${index + 1}`}`;
}

function isValidStoredCase(entry, sourceKey, expectedSuspects) {
  if (entry?.version !== ALIBI_DATA_VERSION || entry.sourceKey !== sourceKey ||
    !Array.isArray(entry.suspects) || entry.suspects.length !== expectedSuspects) {
    return false;
  }
  return entry.suspects.every((data) =>
    Array.isArray(data.witnesses) && data.witnesses.length === WITNESSES_PER_SUSPECT &&
    Array.isArray(data.boardCards) && data.boardCards.length === WITNESSES_PER_SUSPECT &&
    Array.isArray(data.trueTimeline) && data.trueTimeline.length === WITNESSES_PER_SUSPECT);
}

function buildStoredCase(caseKey, subjects, crimeWindow, sourceKey) {
  const suspects = subjects.map((suspect) =>
    generateAlibiWitnesses(toAlibiSubject(suspect), caseKey, crimeWindow));
  return {
    version: ALIBI_DATA_VERSION, sourceKey,
    crimeWindow: clone(crimeWindow), suspects
  };
}

function pickPortrait(previous, witness) {
  return [previous?.portraitKey, previous?.textureKey, witness.portraitKey,
    witness.textureKey, GENERIC_NPC_KEYS[0]]
    .find((key) => GENERIC_NPC_KEYS.includes(key));
}

function buildEncounters(entry, previousEncounters = []) {
  const previousById = new Map(previousEncounters.filter(Boolean)
    .map((encounter) => [encounter.id, encounter]));
  const encounters = entry.suspects.flatMap((data) =>
    data.witnesses.map((witness, index) => {
      const id = getWitnessEncounterId(data.suspectId, witness, index);
      const previous = previousById.get(id);
      const completed = previous?.interviewed === true &&
        previous?.dialogueCompleted === true;
      const portrait = pickPortrait(previous, witness);
      return {
        id, npcId: witness.npcId, suspectId: data.suspectId,
        locationId: 'alibi_contact',
        label: `${witness.role || 'Witness'} of ${data.suspectName || 'suspect'}`,
        witnessRole: witness.role || 'Witness',
        suspectName: data.suspectName || 'suspect',
        enabled: true, excluded: false, interviewed: completed,
        dialogueCompleted: completed, visited: completed, alibiWitness: true,
        portraitKey: portrait, textureKey: portrait
      };
    })
  );
  const expected = entry.suspects.length * WITNESSES_PER_SUSPECT;
  if (encounters.length !== expected) {
    throw new Error(`Expected exactly ${expected} alibi encounters.`);
  }
  if (new Set(encounters.map((item) => item.id)).size !== expected) {
    throw new Error('Alibi encounter IDs must be unique.');
  }
  return encounters;
}

export function ensureAlibiEncounters(caseKey) {
  if (!caseKey) {
    console.warn('[AlibiEncounterSetup] Cannot prepare alibis without a caseKey.');
    return [];
  }
  try {
    ensureStores();
    const subjects = getAlibiSubjects(caseKey);
    if (subjects === null) return [];
    if (!subjects.length) {
      gameState.crimeCityEncounterState[caseKey] = [];
      return [];
    }
    const crimeWindow = getCrimeWindow();
    const sourceKey = getSourceKey(caseKey, subjects, crimeWindow);
    const expectedEncounters = subjects.length * WITNESSES_PER_SUSPECT;
    const existingEntry = getStoredCase(caseKey);
    const existingEncounters = Array.isArray(gameState.crimeCityEncounterState[caseKey])
      ? gameState.crimeCityEncounterState[caseKey] : [];
    const reusable = isValidStoredCase(existingEntry, sourceKey, subjects.length);
    if (reusable && existingEncounters.length === expectedEncounters &&
      existingEncounters.every((encounter) => encounter?.alibiWitness === true)) {
      return existingEncounters;
    }
    const entry = reusable ? existingEntry
      : buildStoredCase(caseKey, subjects, crimeWindow, sourceKey);
    const encounters = buildEncounters(entry, reusable ? existingEncounters : []);
    if (!reusable) {
      if (existingEntry || existingEncounters.length) {
        console.warn('[AlibiEncounterSetup] Rebuilding legacy or changed alibis. ' +
          'Interview progress and accusations for this case are reset.');
      }
      delete gameState.alibiAccusations[caseKey];
      subjects.forEach((suspect) => {
        suspect.deductionState ??= {};
        suspect.deductionState.alibiStatus = 'pending';
      });
    }
    gameState.caseData.alibiCases[caseKey] = entry;
    gameState.crimeCityEncounterState[caseKey] = encounters;
    saveGameState();
    return encounters;
  } catch (error) {
    console.error('[AlibiEncounterSetup] Failed to prepare alibi encounters.', error);
    if (gameState.crimeCityEncounterState && caseKey) {
      gameState.crimeCityEncounterState[caseKey] = [];
    }
    return [];
  }
}

function getWitnessEncounters(caseKey, suspectId) {
  const encounters = gameState.crimeCityEncounterState?.[caseKey];
  if (!Array.isArray(encounters)) return [];
  return encounters.filter((encounter) => encounter?.suspectId === suspectId &&
    encounter.alibiWitness === true);
}

export function markAlibiWitnessInterviewed(caseKey, encounterId) {
  const encounters = gameState.crimeCityEncounterState?.[caseKey];
  if (!Array.isArray(encounters)) return false;
  const encounter = encounters.find((item) => item?.id === encounterId &&
    item.alibiWitness === true);
  if (!encounter) return false;
  const data = getStoredWitnessData(caseKey, encounter.suspectId);
  if (!data?.witnesses.some((witness) => witness.npcId === encounter.npcId)) return false;
  encounter.interviewed = true;
  encounter.dialogueCompleted = true;
  encounter.visited = true;
  requestAutosave();
  return true;
}

export function getWitnessTestimony(caseKey, suspectId, npcId) {
  const data = getStoredWitnessData(caseKey, suspectId);
  if (!data) return null;
  const witness = data.witnesses.find((item) => item.npcId === npcId);
  const encounter = getWitnessEncounters(caseKey, suspectId)
    .find((item) => item.npcId === npcId);
  if (!witness || !encounter) return null;
  return {
    encounterId: encounter.id, suspectId,
    suspectName: data.suspectName || 'the suspect',
    npcId, role: witness.role, roleId: witness.roleId, tone: witness.tone,
    portraitKey: encounter.portraitKey, textureKey: encounter.textureKey,
    statement: witness.statement, contradictionHint: witness.contradictionHint,
    timelineCard: clone(witness.timelineCard), motiveFragment: witness.motiveFragment,
    crimeWindow: clone(data.crimeWindow),
    // Compatibility fields; do not display the solution during the interview.
    boardCards: clone(data.boardCards), trueTimeline: clone(data.trueTimeline),
    interviewed: encounter.interviewed === true,
    dialogueCompleted: encounter.dialogueCompleted === true,
    allWitnessesVisited: allWitnessesVisited(caseKey, suspectId)
  };
}

export function allWitnessesVisited(caseKey, suspectId) {
  const encounters = getWitnessEncounters(caseKey, suspectId);
  return encounters.length === WITNESSES_PER_SUSPECT &&
    encounters.every((encounter) => encounter.interviewed === true &&
      encounter.dialogueCompleted === true);
}

export function recordAlibiAccusation(caseKey, suspectId, npcId) {
  const data = getStoredWitnessData(caseKey, suspectId);
  if (!data || !findSuspect(suspectId)) {
    return { correct: false, message: 'Unknown suspect.' };
  }
  if (!allWitnessesVisited(caseKey, suspectId)) {
    return {
      correct: false,
      message: 'Interview every available witness before reaching a conclusion.'
    };
  }
  const noLiar = npcId === NO_ALIBI_LIAR;
  const witness = noLiar ? null : data.witnesses.find((item) => item.npcId === npcId);
  if (!noLiar && !witness) return { correct: false, message: 'Unknown witness.' };
  const correct = noLiar ? data.alibiType === 'confirmed' : witness.isLiar === true;
  gameState.alibiAccusations ??= {};
  gameState.alibiAccusations[caseKey] ??= {};
  gameState.alibiAccusations[caseKey][suspectId] = npcId;
  const suspect = findSuspect(suspectId);
  suspect.deductionState ??= {};
  suspect.deductionState.alibiStatus = 'pending';
  requestAutosave();
  return {
    correct,
    message: correct
      ? noLiar
        ? 'Correct. The accounts support a consistent alibi.'
        : 'Correct. That account conflicts with another witness’s testimony.'
      : noLiar
        ? 'The accounts contain an unresolved contradiction.'
        : 'That witness is not the source of the false alibi.'
  };
}

export function recordAlibiConfirmation(caseKey, suspectId) {
  return recordAlibiAccusation(caseKey, suspectId, NO_ALIBI_LIAR);
}

export function getAlibiAccusation(caseKey, suspectId) {
  return gameState.alibiAccusations?.[caseKey]?.[suspectId] || null;
}

// Call only after the evidence/timeline puzzle has been solved correctly.
export function resolveAlibiTimelineSuccess(caseKey, suspectId) {
  const suspect = findSuspect(suspectId);
  const data = getStoredWitnessData(caseKey, suspectId);
  if (!suspect || !data || !allWitnessesVisited(caseKey, suspectId)) return 'pending';
  const answer = getAlibiAccusation(caseKey, suspectId);
  let status = 'pending';
  if (answer === NO_ALIBI_LIAR && data.alibiType === 'confirmed') {
    status = 'confirmed';
  } else if (data.alibiType === 'contradicted' && data.witnesses.some(
    (witness) => witness.npcId === answer && witness.isLiar === true)) {
    status = 'contradicted';
  }
  suspect.deductionState ??= {};
  suspect.deductionState.alibiStatus = status;
  // No automatic elimination or arrest.
  saveGameState();
  return status;
}

export function getTimelineBoardData(caseKey, suspectId) {
  const data = getStoredWitnessData(caseKey, suspectId);
  if (!data || !allWitnessesVisited(caseKey, suspectId)) {
    return { boardCards: [], trueTimeline: [] };
  }
  return {
    boardCards: clone(data.boardCards), trueTimeline: clone(data.trueTimeline),
    crimeWindow: clone(data.crimeWindow)
  };
}

export function getAlibiEncounterDebugData(caseKey) {
  const encounters = gameState.crimeCityEncounterState?.[caseKey];
  if (!Array.isArray(encounters)) return [];
  return encounters.map((encounter) => ({
    id: encounter.id, suspectId: encounter.suspectId, npcId: encounter.npcId,
    label: encounter.label, enabled: encounter.enabled, excluded: encounter.excluded,
    interviewed: encounter.interviewed, dialogueCompleted: encounter.dialogueCompleted,
    portraitKey: encounter.portraitKey, textureKey: encounter.textureKey
  }));
}
