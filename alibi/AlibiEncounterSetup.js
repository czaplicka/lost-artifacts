// AlibiEncounterSetup.js
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';

import {
  generateAlibiWitnesses,
  ALIBI_DATA_VERSION
} from './AlibiWitnessData.js';

const GENERIC_NPC_KEYS = [
  'npc', 'npc1', 'npc2', 'npc3', 'npc4', 'npc5', 'npc6'
];

// Use this value when the player concludes that no witness lied.
export const NO_ALIBI_LIAR = '__no_liar__';

function clone(value) {
  return structuredClone(value);
}

function getCaseSuspects() {
  const suspects =
    Array.isArray(gameState.caseSuspects) &&
    gameState.caseSuspects.length
      ? gameState.caseSuspects
      : Array.isArray(gameState.suspects) &&
          gameState.suspects.length
        ? gameState.suspects
        : Array.isArray(gameState.suspectList)
          ? gameState.suspectList
          : [];

  gameState.caseSuspects = suspects;
  gameState.suspects = suspects;
  gameState.suspectList = suspects;

  return suspects;
}

function findSuspect(suspectId) {
  return getCaseSuspects().find(
    (suspect) => suspect?.id === suspectId
  ) || null;
}

function getAlibiPair() {
  const suspects = getCaseSuspects();

  const thieves = suspects.filter(
    (suspect) =>
      suspect?.hiddenCaseData?.isTrueThief === true
  );

  const twins = suspects.filter(
    (suspect) =>
      suspect?.hiddenCaseData?.isForensicTwin === true
  );

  if (
    thieves.length !== 1 ||
    twins.length !== 1 ||
    thieves[0].id === twins[0].id
  ) {
    throw new Error(
      'Alibi phase requires exactly one real thief and one forensic twin.'
    );
  }

  // Preserve case-list order rather than putting the thief first.
  const pairIds = new Set([
    thieves[0].id,
    twins[0].id
  ]);

  return suspects.filter(
    (suspect) => pairIds.has(suspect.id)
  );
}

function getCrimeWindow() {
  const window = gameState.caseData?.crimeWindow;

  if (
    !window ||
    !Number.isInteger(window.day) ||
    !Number.isInteger(window.startMinute) ||
    !Number.isInteger(window.endMinute) ||
    window.startMinute < 30 ||
    window.endMinute <= window.startMinute ||
    window.endMinute > 1409
  ) {
    throw new Error(
      'Missing or invalid caseData.crimeWindow. ' +
      'Start a new case using the updated GameSetup.'
    );
  }

  return window;
}

function getSourceKey(caseKey, pair, window) {
  return JSON.stringify({
    version: ALIBI_DATA_VERSION,
    caseKey,
    window: {
      day: window.day,
      startMinute: window.startMinute,
      endMinute: window.endMinute
    },
    suspects: pair.map((suspect) => ({
      id: suspect.id,
      name: suspect.name || '',
      isThief: suspect.hiddenCaseData.isTrueThief === true
    }))
  });
}

function ensureStores() {
  if (
    !gameState.caseData ||
    typeof gameState.caseData !== 'object'
  ) {
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

  return entry?.suspects?.find(
    (item) => item.suspectId === suspectId
  ) || null;
}

function getWitnessEncounterId(suspectId, witness, index = 0) {
  const roleKey = String(
    witness?.role ||
    witness?.npcId ||
    `witness_${index + 1}`
  )
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `alibi_${suspectId}_${roleKey || `witness_${index + 1}`}`;
}

function isValidStoredCase(entry, sourceKey) {
  if (
    entry?.version !== ALIBI_DATA_VERSION ||
    entry.sourceKey !== sourceKey ||
    !Array.isArray(entry.suspects) ||
    entry.suspects.length !== 2
  ) {
    return false;
  }

  return entry.suspects.every(
    (data) =>
      Array.isArray(data.witnesses) &&
      data.witnesses.length === 3 &&
      Array.isArray(data.boardCards) &&
      data.boardCards.length === 6 &&
      Array.isArray(data.trueTimeline) &&
      data.trueTimeline.length === 3
  );
}

function buildStoredCase(caseKey, pair, window, sourceKey) {
  const suspects = pair.map((suspect) =>
    generateAlibiWitnesses(
      suspect,
      caseKey,
      window
    )
  );

  return {
    version: ALIBI_DATA_VERSION,
    sourceKey,
    crimeWindow: clone(window),
    suspects
  };
}

function assignPortraits(encounters, previousEncounters) {
  const used = new Set();

  const previousById = new Map(
    previousEncounters
      .filter(Boolean)
      .map((encounter) => [encounter.id, encounter])
  );

  // First preserve existing valid, unique assignments.
  const assignments = encounters.map((encounter) => {
    const previous = previousById.get(encounter.id);

    const key = [
      previous?.portraitKey,
      previous?.textureKey
    ].find(
      (candidate) =>
        GENERIC_NPC_KEYS.includes(candidate) &&
        !used.has(candidate)
    );

    if (key) {
      used.add(key);
    }

    return key || null;
  });

  return encounters.map((encounter, index) => {
    let key = assignments[index];

    if (!key) {
      key = [
        encounter.portraitKey,
        encounter.textureKey,
        ...GENERIC_NPC_KEYS
      ].find(
        (candidate) =>
          GENERIC_NPC_KEYS.includes(candidate) &&
          !used.has(candidate)
      );

      used.add(key);
    }

    return {
      ...encounter,
      portraitKey: key,
      textureKey: key
    };
  });
}

function buildEncounters(entry, previousEncounters = []) {
  const previousById = new Map(
    previousEncounters
      .filter(Boolean)
      .map((encounter) => [encounter.id, encounter])
  );

  const encounters = entry.suspects.flatMap((data) =>
    data.witnesses.map((witness, index) => {
      const id = getWitnessEncounterId(
        data.suspectId,
        witness,
        index
      );

      const previous = previousById.get(id);

      const completed =
        previous?.interviewed === true &&
        previous?.dialogueCompleted === true;

      return {
        id,
        npcId: witness.npcId,
        suspectId: data.suspectId,
        locationId: 'alibi_contact',

        label:
          `${witness.role || 'Witness'} of ` +
          `${data.suspectName || 'suspect'}`,

        witnessRole: witness.role || 'Witness',

        enabled: true,
        excluded: false,
        interviewed: completed,
        dialogueCompleted: completed,
        visited: completed,
        alibiWitness: true,

        portraitKey: witness.portraitKey,
        textureKey: witness.textureKey
      };
    })
  );

  if (encounters.length !== 6) {
    throw new Error('Expected exactly six alibi encounters.');
  }

  if (new Set(encounters.map((item) => item.id)).size !== 6) {
    throw new Error('Alibi encounter IDs must be unique.');
  }

  return assignPortraits(encounters, previousEncounters);
}

export function ensureAlibiEncounters(caseKey) {
  if (!caseKey) {
    console.warn(
      '[AlibiEncounterSetup] Cannot prepare alibis without a caseKey.'
    );
    return [];
  }

  try {
    ensureStores();

    const pair = getAlibiPair();
    const window = getCrimeWindow();
    const sourceKey = getSourceKey(caseKey, pair, window);

    const existingEntry = getStoredCase(caseKey);

    const existingEncounters =
      Array.isArray(gameState.crimeCityEncounterState[caseKey])
        ? gameState.crimeCityEncounterState[caseKey]
        : [];

    const reusable = isValidStoredCase(
      existingEntry,
      sourceKey
    );

    const entry = reusable
      ? existingEntry
      : buildStoredCase(
          caseKey,
          pair,
          window,
          sourceKey
        );

    const encounters = buildEncounters(
      entry,
      reusable ? existingEncounters : []
    );

    if (!reusable) {
      if (existingEntry || existingEncounters.length) {
        console.warn(
          '[AlibiEncounterSetup] Rebuilding legacy or changed alibis. ' +
          'Interview progress and accusations for this case are reset.'
        );
      }

      delete gameState.alibiAccusations[caseKey];

      pair.forEach((suspect) => {
        suspect.deductionState ??= {};
        suspect.deductionState.alibiStatus = 'pending';
      });
    }

    gameState.caseData.alibiCases[caseKey] = entry;
    gameState.crimeCityEncounterState[caseKey] = encounters;

    saveGameState();

    return encounters;
  } catch (error) {
    console.error(
      '[AlibiEncounterSetup] Failed to prepare alibi encounters.',
      error
    );

    // Do not display stale encounters with unrelated testimony.
    if (gameState.crimeCityEncounterState && caseKey) {
      gameState.crimeCityEncounterState[caseKey] = [];
    }

    return [];
  }
}

function getWitnessEncounters(caseKey, suspectId) {
  const encounters =
    gameState.crimeCityEncounterState?.[caseKey];

  if (!Array.isArray(encounters)) {
    return [];
  }

  return encounters.filter(
    (encounter) =>
      encounter?.suspectId === suspectId &&
      encounter.alibiWitness === true
  );
}

export function markAlibiWitnessInterviewed(
  caseKey,
  encounterId
) {
  const encounters =
    gameState.crimeCityEncounterState?.[caseKey];

  if (!Array.isArray(encounters)) {
    return false;
  }

  const encounter = encounters.find(
    (item) =>
      item?.id === encounterId &&
      item.alibiWitness === true
  );

  if (!encounter) {
    return false;
  }

  const data = getStoredWitnessData(
    caseKey,
    encounter.suspectId
  );

  if (!data?.witnesses.some(
    (witness) => witness.npcId === encounter.npcId
  )) {
    return false;
  }

  encounter.interviewed = true;
  encounter.dialogueCompleted = true;
  encounter.visited = true;

  saveGameState();

  return true;
}

export function getWitnessTestimony(
  caseKey,
  suspectId,
  npcId
) {
  const data = getStoredWitnessData(caseKey, suspectId);

  if (!data) {
    return null;
  }

  const witness = data.witnesses.find(
    (item) => item.npcId === npcId
  );

  const encounter = getWitnessEncounters(
    caseKey,
    suspectId
  ).find(
    (item) => item.npcId === npcId
  );

  if (!witness || !encounter) {
    return null;
  }

  return {
    encounterId: encounter.id,
    suspectId,
    suspectName: data.suspectName || 'the suspect',

    npcId,
    role: witness.role,
    tone: witness.tone,

    portraitKey: encounter.portraitKey,
    textureKey: encounter.textureKey,

    statement: witness.statement,
    contradictionHint: witness.contradictionHint,
    timelineCard: clone(witness.timelineCard),
    motiveFragment: witness.motiveFragment,

    crimeWindow: clone(data.crimeWindow),

    // Kept for compatibility with the existing return contract.
    // Do not display trueTimeline as a solution during the interview.
    boardCards: clone(data.boardCards),
    trueTimeline: clone(data.trueTimeline),

    interviewed: encounter.interviewed === true,
    dialogueCompleted: encounter.dialogueCompleted === true,

    allWitnessesVisited: allWitnessesVisited(
      caseKey,
      suspectId
    )
  };
}

export function allWitnessesVisited(caseKey, suspectId) {
  const encounters = getWitnessEncounters(
    caseKey,
    suspectId
  );

  return (
    encounters.length === 3 &&
    encounters.every(
      (encounter) =>
        encounter.interviewed === true &&
        encounter.dialogueCompleted === true
    )
  );
}

export function recordAlibiAccusation(
  caseKey,
  suspectId,
  npcId
) {
  const data = getStoredWitnessData(caseKey, suspectId);

  if (!data || !findSuspect(suspectId)) {
    return {
      correct: false,
      message: 'Unknown suspect.'
    };
  }

  if (!allWitnessesVisited(caseKey, suspectId)) {
    return {
      correct: false,
      message:
        'Interview every available witness before reaching a conclusion.'
    };
  }

  const noLiar = npcId === NO_ALIBI_LIAR;

  const witness = noLiar
    ? null
    : data.witnesses.find(
        (item) => item.npcId === npcId
      );

  if (!noLiar && !witness) {
    return {
      correct: false,
      message: 'Unknown witness.'
    };
  }

  const correct = noLiar
    ? data.alibiType === 'confirmed'
    : witness.isLiar === true;

  gameState.alibiAccusations ??= {};
  gameState.alibiAccusations[caseKey] ??= {};
  gameState.alibiAccusations[caseKey][suspectId] = npcId;

  // A changed answer invalidates a previously resolved conclusion.
  const suspect = findSuspect(suspectId);
  suspect.deductionState ??= {};
  suspect.deductionState.alibiStatus = 'pending';

  saveGameState();

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
  return recordAlibiAccusation(
    caseKey,
    suspectId,
    NO_ALIBI_LIAR
  );
}

export function getAlibiAccusation(caseKey, suspectId) {
  return (
    gameState.alibiAccusations?.[caseKey]?.[suspectId] ||
    null
  );
}

// Call only after the player correctly completes the evidence/timeline puzzle.
export function resolveAlibiTimelineSuccess(caseKey, suspectId) {
  const suspect = findSuspect(suspectId);
  const data = getStoredWitnessData(caseKey, suspectId);

  if (
    !suspect ||
    !data ||
    !allWitnessesVisited(caseKey, suspectId)
  ) {
    return 'pending';
  }

  const answer = getAlibiAccusation(
    caseKey,
    suspectId
  );

  let status = 'pending';

  if (
    answer === NO_ALIBI_LIAR &&
    data.alibiType === 'confirmed'
  ) {
    status = 'confirmed';
  } else if (
    data.alibiType === 'contradicted' &&
    data.witnesses.some(
      (witness) =>
        witness.npcId === answer &&
        witness.isLiar === true
    )
  ) {
    status = 'contradicted';
  }

  suspect.deductionState ??= {};
  suspect.deductionState.alibiStatus = status;

  // No automatic elimination and no automatic arrest.
  saveGameState();

  return status;
}

export function getTimelineBoardData(caseKey, suspectId) {
  const data = getStoredWitnessData(caseKey, suspectId);

  if (!data || !allWitnessesVisited(caseKey, suspectId)) {
    return {
      boardCards: [],
      trueTimeline: []
    };
  }

  return {
    boardCards: clone(data.boardCards),
    trueTimeline: clone(data.trueTimeline),
    crimeWindow: clone(data.crimeWindow)
  };
}

export function getAlibiEncounterDebugData(caseKey) {
  const encounters =
    gameState.crimeCityEncounterState?.[caseKey];

  if (!Array.isArray(encounters)) {
    return [];
  }

  return encounters.map((encounter) => ({
    id: encounter.id,
    suspectId: encounter.suspectId,
    npcId: encounter.npcId,
    label: encounter.label,
    enabled: encounter.enabled,
    excluded: encounter.excluded,
    interviewed: encounter.interviewed,
    dialogueCompleted: encounter.dialogueCompleted,
    portraitKey: encounter.portraitKey,
    textureKey: encounter.textureKey
  }));
}