// AlibiEncounterSetup.js
// Creates and maintains witness encounters for the alibi phase.
//
// Important rule:
// - An alibi witness is NOT excluded merely because the player returned
//   to Crime City or because a legacy visitedEncounters entry exists.
// - A witness becomes interviewed only after dialogue completion.
// - Witnesses have NO visual identity of their own: their role/job
//   (npcId, e.g. "fence", "kustosz") is purely narrative data. The
//   sprite shown on the map is always one of the generic passer-by
//   icons (npc, npc1..npc6), assigned uniquely per encounter whenever
//   possible.

import { gameState } from './GameData.js';
import { generateAlibiWitnesses } from './AlibiWitnessData.js';

const GENERIC_NPC_KEYS = [
  'npc', 'npc1', 'npc2', 'npc3', 'npc4', 'npc5', 'npc6'
];

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

function getActiveSuspects() {
  return getCaseSuspects().filter(
    (suspect) => suspect?.deductionState?.eliminated !== true
  );
}

function findSuspect(suspectId) {
  return (
    getCaseSuspects().find(
      (suspect) => suspect?.id === suspectId
    ) || null
  );
}

function getWitnessData(suspect, caseKey) {
  return generateAlibiWitnesses(suspect, caseKey);
}

function ensureEncounterStateStore() {
  if (
    !gameState.crimeCityEncounterState ||
    typeof gameState.crimeCityEncounterState !== 'object'
  ) {
    gameState.crimeCityEncounterState = {};
  }

  return gameState.crimeCityEncounterState;
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

/**
 * Przydziela unikatowy sprite (npc/npc1..npc6) każdemu aktywnemu
 * encounterowi świadka.
 *
 * Świadomie IGNORUJE dowolne pole związane z rolą/tożsamością (npcId,
 * role, itd.) — sprite pochodzi wyłącznie z generycznej puli, żeby
 * grafika nigdy nie "zdradzała" zawodu świadka i nigdy przypadkiem
 * nie wylosowała portretu dialogowego innej postaci (np. pasera).
 *
 * Jeśli aktywnych encounterów jest więcej niż grafik w puli (np. 3
 * podejrzani x 3 świadków = 9 > 7 sprite'ów), część grafik się
 * powtórzy — logujemy to jako ostrzeżenie, ale nie blokujemy gry.
 */
function assignUniquePortraitKeys(encounters = []) {
  const usedKeys = new Set();

  return encounters.map((encounter, index) => {
    const freshKey = GENERIC_NPC_KEYS.find(
      (key) => !usedKeys.has(key)
    );

    const selectedKey =
      freshKey ||
      GENERIC_NPC_KEYS[index % GENERIC_NPC_KEYS.length];

    if (!freshKey) {
      console.warn(
        '[AlibiEncounterSetup] Not enough generic NPC sprites for all witnesses — reusing one.',
        {
          encounterId: encounter.id,
          npcId: encounter.npcId,
          portraitKey: selectedKey
        }
      );
    }

    usedKeys.add(selectedKey);

    return {
      ...encounter,
      portraitKey: selectedKey,
      textureKey: selectedKey
    };
  });
}

/**
 * Normalizuje encounter z obecnego albo starego save'a.
 *
 * Krytyczne:
 * - Nie odczytujemy `visitedEncounters` jako `interviewed`.
 * - Nie ustawiamy `excluded` tylko dlatego, że witness był wcześniej
 *   renderowany lub istnieje w stanie miasta.
 * - Jeżeli stary save nie ma tych pól, witness wraca jako dostępny,
 *   ale nieprzesłuchany.
 * - portraitKey/textureKey ze starego save'a NIE są tu ostatecznie
 *   zaufane (mogły powstać przed poprawką i wskazywać na rolę, np.
 *   "fence") — assignUniquePortraitKeys zawsze je nadpisze poprawną
 *   grafiką z generycznej puli po tym kroku.
 */
function normalizeWitnessEncounter(
  encounter = {},
  {
    forceFreshInterviewState = false
  } = {}
) {
  return {
    ...encounter,

    enabled: encounter.enabled !== false,

    excluded:
      forceFreshInterviewState
        ? false
        : encounter.excluded === true,

    interviewed:
      forceFreshInterviewState
        ? false
        : encounter.interviewed === true,

    dialogueCompleted:
      forceFreshInterviewState
        ? false
        : encounter.dialogueCompleted === true,

    visited:
      forceFreshInterviewState
        ? false
        : encounter.visited === true,

    alibiWitness: true
  };
}

/**
 * Czy istniejąca lista wygląda jak aktualna lista świadków tej samej sprawy.
 *
 * Jeżeli skład aktywnych podejrzanych się zmienił, np. po ręcznym
 * wykluczeniu osoby, lista witnessów jest przebudowywana zachowując
 * postęp tylko dla tych encounterów, które nadal istnieją.
 */
function shouldRebuildEncounters(existingEncounters, activeSuspects) {
  if (!Array.isArray(existingEncounters) || !existingEncounters.length) {
    return true;
  }

  const activeSuspectIds = new Set(
    activeSuspects.map((suspect) => suspect.id)
  );

  const existingSuspectIds = new Set(
    existingEncounters
      .filter((encounter) => encounter?.alibiWitness === true)
      .map((encounter) => encounter.suspectId)
      .filter(Boolean)
  );

  if (
    activeSuspectIds.size !== existingSuspectIds.size
  ) {
    return true;
  }

  return [...activeSuspectIds].some(
    (suspectId) => !existingSuspectIds.has(suspectId)
  );
}

/**
 * Buduje świeżą listę witnessów dla aktywnych podejrzanych.
 *
 * portraitKey/textureKey nie są tu ustawiane na podstawie danych
 * witnessa — zostają przydzielone jednym krokiem, na końcu, przez
 * assignUniquePortraitKeys, wyłącznie z generycznej puli sprite'ów.
 */
function createWitnessEncounters(caseKey, activeSuspects) {
  const encounters = [];

  activeSuspects.forEach((suspect) => {
    const { witnesses } = getWitnessData(suspect, caseKey);

    witnesses.forEach((witness, index) => {
      const encounterId = getWitnessEncounterId(
        suspect.id,
        witness,
        index
      );

      encounters.push({
        id: encounterId,

        npcId: witness.npcId,
        suspectId: suspect.id,

        locationId: 'alibi_contact',

        label:
          `${witness.role || 'Witness'} of ` +
          `${suspect.name || 'suspect'}`,

        witnessRole: witness.role || 'Witness',

        enabled: true,
        excluded: false,
        interviewed: false,
        dialogueCompleted: false,
        visited: false,

        alibiWitness: true
      });
    });
  });

  return assignUniquePortraitKeys(encounters);
}

/**
 * Przenosi realny postęp z poprzedniej listy do świeżo zbudowanej.
 *
 * Zachowujemy tylko stan zakończonej rozmowy i nie zmieniamy
 * dostępności nowych NPC. Grafika (portraitKey/textureKey) jest
 * zawsze przydzielana na nowo przez assignUniquePortraitKeys na
 * końcu ensureAlibiEncounters, więc tutaj jej nie kopiujemy.
 */
function mergeExistingWitnessProgress(
  newEncounters = [],
  existingEncounters = []
) {
  const existingById = new Map(
    existingEncounters
      .filter(
        (encounter) =>
          encounter &&
          typeof encounter.id === 'string'
      )
      .map((encounter) => [
        encounter.id,
        normalizeWitnessEncounter(encounter)
      ])
  );

  return newEncounters.map((encounter) => {
    const existing = existingById.get(encounter.id);

    if (!existing) {
      return encounter;
    }

    return {
      ...encounter,

      /**
       * Te pola zachowujemy, bo oznaczają realny postęp gracza.
       * Nie kopiujemy stalego `enabled: false` ani `excluded: true`,
       * żeby stary/błędny save nie zablokował świeżego witnessa.
       */
      interviewed: existing.interviewed === true,
      dialogueCompleted: existing.dialogueCompleted === true,
      visited: existing.visited === true
    };
  });
}

/**
 * Creates 3 alibi contacts per active suspect.
 *
 * This function is safe to call repeatedly:
 * - same case + same suspect pool: returns the existing list,
 * - changed suspect pool: rebuilds list and retains completed talks,
 * - bad legacy state: normalizes encounters instead of blocking them.
 *
 * Call after Evidence Grid is completed:
 *
 * ensureAlibiEncounters(this.getCaseKey());
 */
export function ensureAlibiEncounters(caseKey) {
  if (!caseKey) {
    console.warn(
      '[AlibiEncounterSetup] Cannot create encounters without a caseKey.'
    );

    return [];
  }

  const encounterStore = ensureEncounterStateStore();
  const activeSuspects = getActiveSuspects();

  const existingEncounters =
    encounterStore[caseKey];

  /**
   * Gdy obecna lista nadal pasuje do aktywnej puli, normalizujemy ją,
   * ale nie regenerujemy — dzięki temu rozmowy pozostają zapisane.
   * Grafika i tak jest przeliczana od nowa przez assignUniquePortraitKeys,
   * co samo naprawia ewentualne stare, błędne wartości portraitKey.
   */
  if (
    Array.isArray(existingEncounters) &&
    existingEncounters.length > 0 &&
    !shouldRebuildEncounters(existingEncounters, activeSuspects)
  ) {
    const normalizedEncounters = assignUniquePortraitKeys(
      existingEncounters.map((encounter) =>
        normalizeWitnessEncounter(encounter)
      )
    );

    encounterStore[caseKey] = normalizedEncounters;

    return normalizedEncounters;
  }

  const freshEncounters = createWitnessEncounters(
    caseKey,
    activeSuspects
  );

  const mergedEncounters = mergeExistingWitnessProgress(
    freshEncounters,
    Array.isArray(existingEncounters)
      ? existingEncounters
      : []
  );

  encounterStore[caseKey] = assignUniquePortraitKeys(
    mergedEncounters
  );

  console.log(
    '[AlibiEncounterSetup] Alibi encounters prepared.',
    {
      caseKey,
      activeSuspectIds: activeSuspects.map(
        (suspect) => suspect.id
      ),
      encounterCount: encounterStore[caseKey].length,
      encounters: encounterStore[caseKey].map(
        (encounter) => ({
          id: encounter.id,
          suspectId: encounter.suspectId,
          npcId: encounter.npcId,
          enabled: encounter.enabled,
          excluded: encounter.excluded,
          interviewed: encounter.interviewed,
          portraitKey: encounter.portraitKey
        })
      )
    }
  );

  return encounterStore[caseKey];
}

/**
 * Oznacza świadka jako przesłuchanego.
 *
 * Wywołuj wyłącznie na końcu dialogu — nie po kliknięciu NPC,
 * nie po wejściu do Crime City i nie po otwarciu LocationScene.
 */
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
    (item) => item?.id === encounterId
  );

  if (!encounter) {
    return false;
  }

  encounter.interviewed = true;
  encounter.dialogueCompleted = true;
  encounter.visited = true;

  return true;
}

/**
 * Zwraca dane dialogowe dla klikniętego świadka.
 *
 * `allWitnessesVisited` nie jest liczone z globalnego visitedEncounters,
 * tylko ze stanu `interviewed` zapisanym na konkretnych encounterach.
 */
export function getWitnessTestimony(
  caseKey,
  suspectId,
  npcId
) {
  const suspect = findSuspect(suspectId);

  if (!suspect) {
    return null;
  }

  const { witnesses, boardCards, trueTimeline } =
    getWitnessData(suspect, caseKey);

  const witness = witnesses.find(
    (item) => item.npcId === npcId
  );

  if (!witness) {
    return null;
  }

  const encounterId = getWitnessEncounterId(
    suspectId,
    witness,
    witnesses.indexOf(witness)
  );

  const encounter =
    gameState.crimeCityEncounterState?.[caseKey]?.find(
      (item) => item?.id === encounterId
    ) || null;

  return {
    encounterId,

    suspectId,
    suspectName: suspect.name || 'the suspect',

    npcId,
    role: witness.role,
    tone: witness.tone,

    portraitKey: encounter?.portraitKey || 'npc',
    textureKey: encounter?.textureKey || 'npc',

    statement: witness.statement,
    contradictionHint: witness.contradictionHint,
    timelineCard: witness.timelineCard,
    motiveFragment: witness.motiveFragment,

    boardCards,
    trueTimeline,

    interviewed: encounter?.interviewed === true,
    dialogueCompleted: encounter?.dialogueCompleted === true,

    allWitnessesVisited: allWitnessesVisited(
      caseKey,
      suspectId
    )
  };
}

function getWitnessEncounters(caseKey, suspectId) {
  const encounters =
    gameState.crimeCityEncounterState?.[caseKey] || [];

  if (!Array.isArray(encounters)) {
    return [];
  }

  return encounters.filter(
    (encounter) =>
      encounter?.suspectId === suspectId &&
      encounter?.alibiWitness === true
  );
}

function getWitnessEncounterIds(caseKey, suspectId) {
  return getWitnessEncounters(caseKey, suspectId).map(
    (encounter) => encounter.id
  );
}

/**
 * True dopiero gdy dialog każdego świadka został ukończony.
 *
 * Nie sprawdzamy gameState.visitedEncounters, bo globalna lista może
 * mieć stare rekordy, kolizje ID albo wpisy z samego wejścia do lokacji.
 */
export function allWitnessesVisited(caseKey, suspectId) {
  const witnessEncounters = getWitnessEncounters(
    caseKey,
    suspectId
  );

  if (!witnessEncounters.length) {
    return false;
  }

  return witnessEncounters.every(
    (encounter) =>
      encounter.interviewed === true &&
      encounter.dialogueCompleted === true
  );
}

/**
 * Saves the player's choice of who lied.
 * Returns whether that witness actually lied.
 */
export function recordAlibiAccusation(
  caseKey,
  suspectId,
  npcId
) {
  if (
    !gameState.alibiAccusations ||
    typeof gameState.alibiAccusations !== 'object'
  ) {
    gameState.alibiAccusations = {};
  }

  gameState.alibiAccusations[caseKey] ??= {};

  const suspect = findSuspect(suspectId);

  if (!suspect) {
    return {
      correct: false,
      message: 'Unknown suspect.'
    };
  }

  /**
   * Nie pozwalamy oskarżać przed ukończeniem wszystkich rozmów.
   * Dzięki temu gracz nie omija świadków, a system timeline ma pełne dane.
   */
  if (!allWitnessesVisited(caseKey, suspectId)) {
    return {
      correct: false,
      message:
        'Interview every available witness before accusing anyone.'
    };
  }

  const { witnesses } = getWitnessData(suspect, caseKey);

  const witness = witnesses.find(
    (item) => item.npcId === npcId
  );

  if (!witness) {
    return {
      correct: false,
      message: 'Unknown witness.'
    };
  }

  gameState.alibiAccusations[caseKey][suspectId] = npcId;

  return {
    correct: witness.isLiar === true,
    message:
      witness.isLiar === true
        ? `Correct. The ${String(
            witness.role || 'witness'
          ).toLowerCase()} is protecting ${
            suspect.name || 'the suspect'
          }.`
        : `Wrong. The ${String(
            witness.role || 'witness'
          ).toLowerCase()} is not the liar.`
  };
}

export function getAlibiAccusation(caseKey, suspectId) {
  return (
    gameState.alibiAccusations?.[caseKey]?.[suspectId] ||
    null
  );
}

/**
 * Call only after winning AlibiTimelineScene.
 *
 * This function does NOT eliminate a suspect.
 * It only updates the alibi phase result.
 */
export function resolveAlibiTimelineSuccess(
  caseKey,
  suspectId
) {
  const suspect = findSuspect(suspectId);

  if (!suspect) {
    return 'pending';
  }

  const accusedNpcId = getAlibiAccusation(
    caseKey,
    suspectId
  );

  if (!accusedNpcId) {
    return 'pending';
  }

  const { witnesses } = getWitnessData(suspect, caseKey);

  const accusedWitness = witnesses.find(
    (item) => item.npcId === accusedNpcId
  );

  const status =
    accusedWitness?.isLiar === true
      ? 'contradicted'
      : 'pending';

  suspect.deductionState ??= {};
  suspect.deductionState.alibiStatus = status;

  /**
   * Tu celowo NIE ma:
   *
   * suspect.deductionState.eliminated = true;
   *
   * Alibi może być podważone, ale nie oznacza automatycznej eliminacji
   * albo automatycznego wskazania sprawcy.
   */
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

  const { boardCards, trueTimeline } = getWitnessData(
    suspect,
    caseKey
  );

  return {
    boardCards,
    trueTimeline
  };
}

/**
 * Diagnostyka do uruchomienia z konsoli:
 *
 * console.table(getAlibiEncounterDebugData('twoj_case_key'));
 */
export function getAlibiEncounterDebugData(caseKey) {
  const encounters =
    gameState.crimeCityEncounterState?.[caseKey] || [];

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