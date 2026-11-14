import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';

import {
  getCaseSuspects
} from '../suspects/CaseSuspects.js';

import {
  saveGameState
} from '../gameStatePersistence.js';

import {
  progressionManager
} from '../managers/ProgressionManager.js';

import {
  allWitnessesVisited,
  NO_ALIBI_LIAR
} from './AlibiEncounterSetup.js';

const FINAL = new Set([
  'confirmed',
  'contradicted'
]);

function findContext(caseKey, suspectId) {
  const data =
    gameState.caseData
      ?.alibiCases?.[caseKey]
      ?.suspects
      ?.find(
        entry => entry.suspectId === suspectId
      );

  const suspect = getCaseSuspects(gameState).find(
    entry => entry.id === suspectId
  );

  return {
    data,
    suspect
  };
}

function getProgressionCaseKey(caseKey) {
  if (
    typeof caseKey !== 'string' &&
    typeof caseKey !== 'number'
  ) {
    return null;
  }

  if (
    typeof caseKey === 'number' &&
    !Number.isFinite(caseKey)
  ) {
    return null;
  }

  const key = String(caseKey).trim();

  if (
    !key ||
    key === 'default_case' ||
    key.length > 400
  ) {
    return null;
  }

  return key;
}

function isAlibiStageComplete(caseKey) {
  const subjects =
    gameState.caseData
      ?.alibiCases?.[caseKey]
      ?.suspects;

  if (
    !Array.isArray(subjects) ||
    subjects.length === 0
  ) {
    return false;
  }

  const suspectIds = subjects.map(
    entry => entry?.suspectId
  );

  if (
    suspectIds.some(
      id => typeof id !== 'string' || !id.trim()
    ) ||
    new Set(suspectIds).size !== suspectIds.length
  ) {
    return false;
  }

  return subjects.every(subject => {
    if (
      !allWitnessesVisited(
        caseKey,
        subject.suspectId
      )
    ) {
      return false;
    }

    // Liczy się złożony wniosek gracza.
    // Nie sprawdzamy ukrytej poprawności odpowiedzi.
    const filed = subject.playerConclusion;

    return (
      filed?.locked === true &&
      FINAL.has(filed.status) &&
      Array.isArray(filed.timelineIds) &&
      filed.timelineIds.length === 3 &&
      new Set(filed.timelineIds).size === 3
    );
  });
}

function grantAlibiCompletionXP(caseKey) {
  if (!isAlibiStageComplete(caseKey)) {
    return {
      success: false,
      reason: 'alibi_stage_not_finished'
    };
  }

  const scopeId = getProgressionCaseKey(caseKey);

  if (!scopeId) {
    console.warn(
      '[AlibiConclusion] XP skipped: no stable case key.'
    );

    return {
      success: false,
      reason: 'missing_case_key'
    };
  }

  try {
    return progressionManager.grantReward(
      'alibi_completed',
      scopeId,
      __dialogueText("alibi/AlibiConclusion.js", "t_8020ed3cbb6c6084f493")
    );
  } catch (error) {
    console.error(
      '[AlibiConclusion] Could not grant alibi XP:',
      error
    );

    return {
      success: false,
      reason: 'progression_error'
    };
  }
}

export function getFiledAlibiConclusion(
  caseKey,
  suspectId
) {
  const { data, suspect } = findContext(
    caseKey,
    suspectId
  );

  const filed = data?.playerConclusion;

  if (
    filed?.locked === true &&
    FINAL.has(filed.status)
  ) {
    return {
      status: filed.status,
      choice: filed.choice,
      timelineIds: [...(filed.timelineIds || [])],
      locked: true
    };
  }

  // Zachowujemy obsługę zakończonych tablic
  // ze starszych zapisów.
  const status =
    suspect?.deductionState?.alibiStatus;

  if (FINAL.has(status)) {
    return {
      status,
      locked: true,

      choice:
        gameState.alibiAccusations
          ?.[caseKey]?.[suspectId] || null,

      timelineIds: []
    };
  }

  return null;
}

export function fileAlibiConclusion(
  caseKey,
  suspectId,
  timelineIds,
  choice
) {
  const previous = getFiledAlibiConclusion(
    caseKey,
    suspectId
  );

  // Ponowne otwarcie lub wysłanie zatwierdzonej
  // tablicy nie przyznaje nagrody.
  if (previous) {
    return {
      accepted: true,
      alreadyFiled: true,
      ...previous
    };
  }

  const { data, suspect } = findContext(
    caseKey,
    suspectId
  );

  if (
    !data ||
    !suspect ||
    !allWitnessesVisited(caseKey, suspectId)
  ) {
    return {
      accepted: false,
      message: __dialogueText("alibi/AlibiConclusion.js", "t_e7af74f607a9e2ff0fc1")
    };
  }

  const availableIds = (
    data.boardCards || []
  ).map(card => card.id);

  if (
    !Array.isArray(timelineIds) ||
    timelineIds.length !== 3 ||
    availableIds.length !== 3 ||
    new Set(timelineIds).size !== 3 ||
    timelineIds.some(
      id => !availableIds.includes(id)
    )
  ) {
    return {
      accepted: false,
      message: __dialogueText("alibi/AlibiConclusion.js", "t_1bbee57186391f2cdb1f")
    };
  }

  if (
    choice !== NO_ALIBI_LIAR &&
    !data.witnesses.some(
      witness => witness.npcId === choice
    )
  ) {
    return {
      accepted: false,
      message: __dialogueText("alibi/AlibiConclusion.js", "t_30e262c11b8715b55091")
    };
  }

  const status =
    choice === NO_ALIBI_LIAR
      ? 'confirmed'
      : 'contradicted';

  const timelineCorrect =
    (data.trueTimeline || []).length === 3 &&
    data.trueTimeline.every(
      (card, index) =>
        card.id === timelineIds[index]
    );

  const conclusionCorrect =
    choice === NO_ALIBI_LIAR
      ? data.alibiType === 'confirmed'
      : data.witnesses.some(
          witness =>
            witness.npcId === choice &&
            witness.isLiar === true
        );

  data.playerConclusion = {
    version: 1,
    locked: true,
    status,
    choice,
    timelineIds: [...timelineIds],
    filedAt: new Date().toISOString(),

    evaluation: {
      timelineCorrect,
      conclusionCorrect,
      correct:
        timelineCorrect && conclusionCorrect
    }
  };

  gameState.alibiAccusations ??= {};
  gameState.alibiAccusations[caseKey] ??= {};

  gameState.alibiAccusations[
    caseKey
  ][suspectId] = choice;

  suspect.deductionState ??= {};

  // To ocena złożona przez gracza,
  // a nie ujawnienie prawdziwego alibi.
  suspect.deductionState.alibiStatus = status;

  // Nagroda dopiero po zatwierdzeniu
  // ostatniej tablicy w całym etapie.
  const xpResult =
    grantAlibiCompletionXP(caseKey);

  // Wnioski i odebrana nagroda trafiają
  // do tego samego zapisu gry.
  saveGameState();

  return {
    accepted: true,
    alreadyFiled: false,
    status,
    locked: true,
    xpResult
  };
}