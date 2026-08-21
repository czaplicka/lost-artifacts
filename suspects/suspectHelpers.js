import { gameState } from '../GameData.js';

function getThiefId() {
  return gameState.currentThief?.id ||
    gameState.currentThiefId ||
    null;
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

  throw new Error(
    `[suspectHelpers] ${message}`
  );
}

export function getRandomSuspectLineup(
  allSuspects,
  thiefId = getThiefId(),
  lineupSize = 5
) {
  assertLineupCondition(
    Array.isArray(allSuspects),
    'allSuspects must be an array.',
    {
      receivedType: typeof allSuspects
    }
  );

  assertLineupCondition(
    Number.isInteger(lineupSize) && lineupSize >= 2,
    'lineupSize must be an integer greater than or equal to 2.',
    {
      lineupSize
    }
  );

  assertLineupCondition(
    typeof thiefId === 'string' && thiefId.trim().length > 0,
    'A valid thiefId is required.',
    {
      thiefId
    }
  );

  const validSuspects = allSuspects.filter(isValidSuspect);

  assertLineupCondition(
    validSuspects.length >= lineupSize,
    `Need at least ${lineupSize} valid suspects.`,
    {
      lineupSize,
      validSuspectsCount: validSuspects.length
    }
  );

  const realThief = validSuspects.find(
    suspect => suspect.id === thiefId
  );

  assertLineupCondition(
    Boolean(realThief),
    `Thief "${thiefId}" was not found in the suspects list.`,
    {
      thiefId,
      validSuspectIds: validSuspects.map(
        suspect => suspect.id
      )
    }
  );

  const decoys = validSuspects.filter(
    suspect => suspect.id !== thiefId
  );

  assertLineupCondition(
    decoys.length >= lineupSize - 1,
    `Need at least ${lineupSize - 1} decoys for the lineup.`,
    {
      requiredDecoys: lineupSize - 1,
      availableDecoys: decoys.length,
      thiefId
    }
  );

  const selectedDecoys = Phaser.Utils.Array
    .Shuffle([...decoys])
    .slice(0, lineupSize - 1);

  return Phaser.Utils.Array.Shuffle([
    realThief,
    ...selectedDecoys
  ]);
}

export function isCorrectSuspectChoice(
  selectedSuspectId,
  thiefId = getThiefId()
) {
  if (!selectedSuspectId || !thiefId) {
    return false;
  }

  return selectedSuspectId === thiefId;
}

export function getSuspectImageKey(suspect) {
  if (!suspect || typeof suspect !== 'object') {
    return null;
  }

  return suspect.suspectImageKey ||
    suspect.image ||
    suspect.portraitKey ||
    null;
}

export function getSuspectById(allSuspects, suspectId) {
  if (!Array.isArray(allSuspects) || !suspectId) {
    return null;
  }

  return allSuspects.find(
    suspect => suspect?.id === suspectId
  ) || null;
}