import { gameState } from '../GameData.js';
import { getCaseSuspects } from '../suspects/CaseSuspects.js';
import { saveGameState } from '../gameStatePersistence.js';
import { allWitnessesVisited, NO_ALIBI_LIAR } from './AlibiEncounterSetup.js';

const FINAL = new Set(['confirmed', 'contradicted']);

function findContext(caseKey, suspectId) {
  const data = gameState.caseData?.alibiCases?.[caseKey]?.suspects
    ?.find(entry => entry.suspectId === suspectId);
  const suspect = getCaseSuspects(gameState).find(entry => entry.id === suspectId);
  return { data, suspect };
}

export function getFiledAlibiConclusion(caseKey, suspectId) {
  const { data, suspect } = findContext(caseKey, suspectId);
  const filed = data?.playerConclusion;
  if (filed?.locked === true && FINAL.has(filed.status)) {
    return {
      status: filed.status, choice: filed.choice,
      timelineIds: [...(filed.timelineIds || [])], locked: true
    };
  }
  // Completed boards from older saves are also final.
  const status = suspect?.deductionState?.alibiStatus;
  if (FINAL.has(status)) {
    return {
      status, locked: true,
      choice: gameState.alibiAccusations?.[caseKey]?.[suspectId] || null,
      timelineIds: []
    };
  }
  return null;
}

export function fileAlibiConclusion(caseKey, suspectId, timelineIds, choice) {
  const previous = getFiledAlibiConclusion(caseKey, suspectId);
  if (previous) return { accepted: true, alreadyFiled: true, ...previous };
  const { data, suspect } = findContext(caseKey, suspectId);
  if (!data || !suspect || !allWitnessesVisited(caseKey, suspectId)) {
    return { accepted: false, message: 'Complete all three interviews first.' };
  }
  const availableIds = (data.boardCards || []).map(card => card.id);
  if (!Array.isArray(timelineIds) || timelineIds.length !== 3 ||
      availableIds.length !== 3 || new Set(timelineIds).size !== 3 ||
      timelineIds.some(id => !availableIds.includes(id))) {
    return { accepted: false, message: 'Place all three witness cards first.' };
  }
  if (choice !== NO_ALIBI_LIAR && !data.witnesses.some(w => w.npcId === choice)) {
    return { accepted: false, message: 'Choose a conclusion first.' };
  }
  const status = choice === NO_ALIBI_LIAR ? 'confirmed' : 'contradicted';
  const timelineCorrect = (data.trueTimeline || []).length === 3 &&
    data.trueTimeline.every((card, index) => card.id === timelineIds[index]);
  const conclusionCorrect = choice === NO_ALIBI_LIAR
    ? data.alibiType === 'confirmed'
    : data.witnesses.some(w => w.npcId === choice && w.isLiar === true);

  data.playerConclusion = {
    version: 1, locked: true, status, choice,
    timelineIds: [...timelineIds], filedAt: new Date().toISOString(),
    evaluation: { timelineCorrect, conclusionCorrect, correct: timelineCorrect && conclusionCorrect }
  };
  gameState.alibiAccusations ??= {};
  gameState.alibiAccusations[caseKey] ??= {};
  gameState.alibiAccusations[caseKey][suspectId] = choice;
  suspect.deductionState ??= {};
  // This is the player's filed assessment, not the hidden answer.
  suspect.deductionState.alibiStatus = status;
  saveGameState();
  return { accepted: true, alreadyFiled: false, status, locked: true };
}
