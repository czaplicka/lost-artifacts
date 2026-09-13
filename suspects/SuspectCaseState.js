import { gameState } from '../GameData.js';
import { saveGameState } from '../GameStatePersistence.js';
import { safeClone } from './suspectGeneratorUtils.js';

function createFreshDeductionState() {
  return {
    eliminated: false,
    eliminationReasons: [],
    notesUnlocked: [],
    labStatus: 'pending',
    hypothesisStatus: 'pending',
    interviewStatus: 'pending',
    alibiStatus: 'pending'
  };
}

function resetSuspectForNewCase(sourceSuspect = {}) {
  const suspect = safeClone(sourceSuspect) || {};

  suspect.publicProfile ??= {};
  suspect.restrictedProfile ??= {};

  /**
   * Nowa sprawa zaczyna się od zera.
   * Nie kopiujemy ani unlockedFields, ani deductionState z danych
   * wejściowych — źródło mogło pochodzić ze starego save'a lub UI.
   */
  suspect.restrictedProfile.unlockedFields = [];
  suspect.deductionState = createFreshDeductionState();

  return suspect;
}

function restoreSuspectForSavedCase(sourceSuspect = {}) {
  const suspect = safeClone(sourceSuspect) || {};

  suspect.publicProfile ??= {};
  suspect.restrictedProfile ??= {};

  suspect.restrictedProfile.unlockedFields = Array.isArray(
    suspect.restrictedProfile.unlockedFields
  )
    ? [...suspect.restrictedProfile.unlockedFields]
    : [];

  suspect.deductionState ??= {};

  suspect.deductionState.eliminated =
    suspect.deductionState.eliminated === true;

  suspect.deductionState.eliminationReasons = Array.isArray(
    suspect.deductionState.eliminationReasons
  )
    ? safeClone(suspect.deductionState.eliminationReasons)
    : [];

  suspect.deductionState.notesUnlocked = Array.isArray(
    suspect.deductionState.notesUnlocked
  )
    ? [...suspect.deductionState.notesUnlocked]
    : [];

  suspect.deductionState.labStatus ??= 'pending';
  suspect.deductionState.hypothesisStatus ??= 'pending';
  suspect.deductionState.interviewStatus ??= 'pending';
  suspect.deductionState.alibiStatus ??= 'pending';

  return suspect;
}

/**
 * Jedyna funkcja, która wkłada pulę podejrzanych do gameState.
 *
 * Nowy case:
 *   prepareCaseSuspectState(caseData)
 *
 * Wczytanie tego samego case'a:
 *   prepareCaseSuspectState(caseData, { preserveCaseProgress: true })
 */
export function prepareCaseSuspectState(
  caseData = {},
  { preserveCaseProgress = false } = {}
) {
  const rawSuspects = Array.isArray(caseData.suspects)
    ? caseData.suspects
    : Array.isArray(caseData.citySuspects)
      ? caseData.citySuspects
      : [];

  const realThiefSuspectId =
    caseData.trueThiefCaseSuspectId ||
    caseData.realThiefSuspectId ||
    caseData.realThiefId ||
    null;

  const suspects = rawSuspects.map((sourceSuspect) =>
    preserveCaseProgress
      ? restoreSuspectForSavedCase(sourceSuspect)
      : resetSuspectForNewCase(sourceSuspect)
  );

  /**
   * Bezpiecznik: prawdziwy złodziej nigdy nie może wejść do świeżej
   * sprawy jako cleared, nawet jeśli błędne dane źródłowe zawierają
   * deductionState z poprzedniej gry.
   */
  if (!preserveCaseProgress) {
    suspects.forEach((suspect) => {
      if (
        suspect.id === realThiefSuspectId ||
        suspect.isRealThief === true
      ) {
        suspect.deductionState = createFreshDeductionState();
      }
    });
  }

  /**
   * Jedna tablica, nie trzy klony.
   *
   * Każda scena od tej chwili widzi te same obiekty. Jeżeli gracz
   * kiedyś ręcznie zmieni status, zmiana jest wspólna dla całej gry.
   */
  gameState.caseSuspects = suspects;
  gameState.suspects = gameState.caseSuspects;
  gameState.suspectList = gameState.caseSuspects;

  gameState.realThiefSuspectId = realThiefSuspectId;
  gameState.trueThiefCaseSuspectId = realThiefSuspectId;
  gameState.forensicTwinSuspectId =
    caseData.forensicTwinSuspectId || null;

  gameState.currentMission ??= {};

  gameState.currentMission.forensicHardEvidence = safeClone(
    caseData.hardEvidence || []
  );

  gameState.forensicSurvivorIds = safeClone(
    caseData.forensicSurvivorIds || []
  );

  gameState.actualCriminalId =
    caseData.actualCriminalId ||
    gameState.currentThief?.id ||
    gameState.currentThiefId ||
    null;

  gameState.caseSuspectCityId =
    caseData.cityId ||
    gameState.crimeCityId ||
    null;

  gameState.selectedSuspectId =
    gameState.caseSuspects[0]?.id || null;

  /**
   * Ta kontrola jest celowo twarda.
   * Jeśli nowy case nadal miałby cleared osoby, gra przestaje działać
   * i konsola pokaże dokładne rekordy zamiast przechodzić dalej.
   */
  if (!preserveCaseProgress) {
    const prematurelyCleared = gameState.caseSuspects.filter(
      (suspect) =>
        suspect?.deductionState?.eliminated === true
    );

    if (prematurelyCleared.length > 0) {
      console.error(
        '[SuspectCaseState] New case contains CLEARED suspects.',
        prematurelyCleared
      );

      throw new Error(
        '[SuspectCaseState] A new case cannot start with cleared suspects.'
      );
    }
  }

  console.table(
    gameState.caseSuspects.map((suspect) => ({
      id: suspect.id,
      name: suspect.name,
      isRealThief: suspect.isRealThief === true,
      eliminated:
        suspect.deductionState?.eliminated === true,
      reasonCount:
        suspect.deductionState?.eliminationReasons?.length || 0
    }))
  );

  saveGameState();

  return gameState.caseSuspects;
}

export function getGeneratedSuspects() {
  if (
    Array.isArray(gameState.caseSuspects) &&
    gameState.caseSuspects.length
  ) {
    return gameState.caseSuspects;
  }

  if (
    Array.isArray(gameState.suspects) &&
    gameState.suspects.length
  ) {
    gameState.caseSuspects = gameState.suspects;
    gameState.suspectList = gameState.caseSuspects;

    return gameState.caseSuspects;
  }

  if (
    Array.isArray(gameState.suspectList) &&
    gameState.suspectList.length
  ) {
    gameState.caseSuspects = gameState.suspectList;
    gameState.suspects = gameState.caseSuspects;

    return gameState.caseSuspects;
  }

  return [];
}