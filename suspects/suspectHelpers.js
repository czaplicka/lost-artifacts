import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { shuffle } from './suspectGeneratorUtils.js';

/**
 * Zwraca ID złodzieja w bieżącej puli podejrzanych.
 *
 * Kolejność jest celowa:
 * 1. ID fałszywej tożsamości w aktualnym case'ie.
 * 2. ID zapisane dla zgodności ze starszymi fragmentami gry.
 * 3. Dopiero na końcu globalne ID prawdziwego złodzieja.
 *
 * W line-upie potrzebujemy pierwszej wartości, bo lista zawiera
 * caseSuspects, a nie rekordy Wanted Database.
 */
function getCaseThiefSuspectId() {
  return (
    gameState.trueThiefCaseSuspectId ||
    gameState.realThiefSuspectId ||
    gameState.caseData?.trueThiefCaseSuspectId ||
    gameState.caseData?.realThiefSuspectId ||
    gameState.currentThiefCaseSuspectId ||
    gameState.currentThief?.caseSuspectId ||
    gameState.currentThief?.id ||
    gameState.currentThiefId ||
    null
  );
}

function isValidSuspect(suspect) {
  return Boolean(
    suspect &&
      typeof suspect === 'object' &&
      typeof suspect.id === 'string' &&
      suspect.id.trim().length > 0
  );
}

function assertLineupCondition(condition, message, details = null) {
  if (condition) {
    return;
  }

  console.error(
    '[suspectHelpers] Failed to build suspect lineup.',
    {
      message,
      details
    }
  );

  throw new Error(`[suspectHelpers] ${message}`);
}

/**
 * Zwraca pulę osób do line-upu.
 *
 * Wymagania:
 * - dokładnie jedna osoba z `thiefId` musi znajdować się w lineupie;
 * - reszta to różne osoby z bieżącej puli;
 * - funkcja nie modyfikuje wejściowego `allSuspects`.
 */
export function getRandomSuspectLineup(
  allSuspects = [],
  thiefId = getCaseThiefSuspectId(),
  lineupSize = 5
) {
  assertLineupCondition(
    Array.isArray(allSuspects),
    __dialogueText("suspects/suspectHelpers.js", "t_5826780b37804660dcb6"),
    {
      receivedType: typeof allSuspects
    }
  );

  assertLineupCondition(
    Number.isInteger(lineupSize) && lineupSize >= 2,
    __dialogueText("suspects/suspectHelpers.js", "t_e23521133532036e5914"),
    {
      lineupSize
    }
  );

  assertLineupCondition(
    typeof thiefId === 'string' && thiefId.trim().length > 0,
    __dialogueText("suspects/suspectHelpers.js", "t_1196dc32bcfd6b92fcff"),
    {
      thiefId,
      trueThiefCaseSuspectId: gameState.trueThiefCaseSuspectId,
      realThiefSuspectId: gameState.realThiefSuspectId,
      actualCriminalId: gameState.actualCriminalId
    }
  );

  const validSuspects = allSuspects.filter(isValidSuspect);

  assertLineupCondition(
    validSuspects.length >= lineupSize,
    `${__dialogueText("suspects/suspectHelpers.js", "t_7fe0149529d0312f492e")}${lineupSize}${__dialogueText("suspects/suspectHelpers.js", "t_bc3d70c98fb201e048d8")}`,
    {
      lineupSize,
      validSuspectsCount: validSuspects.length
    }
  );

  const realThief = validSuspects.find(
    (suspect) => suspect.id === thiefId
  );

  assertLineupCondition(
    Boolean(realThief),
    `${__dialogueText("suspects/suspectHelpers.js", "t_2e4fcb49440798d8ec1a")}${thiefId}${__dialogueText("suspects/suspectHelpers.js", "t_a57950201f292b6a0dea")}`,
    {
      thiefId,
      validSuspectIds: validSuspects.map(
        (suspect) => suspect.id
      )
    }
  );

  const decoys = validSuspects.filter(
    (suspect) => suspect.id !== thiefId
  );

  assertLineupCondition(
    decoys.length >= lineupSize - 1,
    `${__dialogueText("suspects/suspectHelpers.js", "t_7fe0149529d0312f492e")}${lineupSize - 1}${__dialogueText("suspects/suspectHelpers.js", "t_6c58469b988b9a3c4cad")}`,
    {
      requiredDecoys: lineupSize - 1,
      availableDecoys: decoys.length,
      thiefId
    }
  );

  const selectedDecoys = shuffle(decoys).slice(
    0,
    lineupSize - 1
  );

  return shuffle([
    realThief,
    ...selectedDecoys
  ]);
}

/**
 * Sprawdza, czy gracz wskazał złodzieja z bieżącej sprawy.
 */
export function isCorrectSuspectChoice(
  selectedSuspectId,
  thiefId = getCaseThiefSuspectId()
) {
  if (
    typeof selectedSuspectId !== 'string' ||
    !selectedSuspectId.trim() ||
    typeof thiefId !== 'string' ||
    !thiefId.trim()
  ) {
    return false;
  }

  return selectedSuspectId === thiefId;
}

/**
 * Zwraca możliwy klucz grafiki dla podejrzanego.
 *
 * Pierwszeństwo ma portret przypisany do fałszywej persony w sprawie.
 * `hiddenIdentity` nigdy nie jest tu używane, aby UI nie ujawniło
 * przypadkiem prawdziwej tożsamości złodzieja.
 */
export function getSuspectImageKey(suspect) {
  if (!suspect || typeof suspect !== 'object') {
    return null;
  }

  return (
    suspect.suspectImageKey ||
    suspect.publicProfile?.suspectImageKey ||
    suspect.publicProfile?.imageKey ||
    suspect.publicProfile?.portraitKey ||
    suspect.image ||
    suspect.portraitKey ||
    null
  );
}

/**
 * Zwraca podejrzanego z listy po ID.
 */
export function getSuspectById(allSuspects = [], suspectId = null) {
  if (!Array.isArray(allSuspects) || !suspectId) {
    return null;
  }

  return (
    allSuspects.find(
      (suspect) => suspect?.id === suspectId
    ) || null
  );
}

/**
 * Pomocnicza funkcja diagnostyczna.
 *
 * Możesz ją wywołać z konsoli po wygenerowaniu sprawy:
 *
 * console.table(getSuspectLineupDebugData(gameState.caseSuspects));
 */
export function getSuspectLineupDebugData(
  allSuspects = gameState.caseSuspects || []
) {
  const caseThiefId = getCaseThiefSuspectId();

  return Array.isArray(allSuspects)
    ? allSuspects.map((suspect) => ({
        id: suspect?.id || null,
        name: suspect?.name || null,
        isRealThief: suspect?.isRealThief === true,
        isCaseThief: suspect?.id === caseThiefId,
        eliminated: suspect?.deductionState?.eliminated === true,
        imageKey: getSuspectImageKey(suspect)
      }))
    : [];
}