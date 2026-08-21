import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { safeClone } from './suspectGeneratorUtils.js';

export function prepareCaseSuspectState(caseData = {}) {
  const suspects = caseData.suspects || caseData.citySuspects || [];

  gameState.caseSuspects = safeClone(suspects);
  gameState.suspects = safeClone(suspects);
  gameState.suspectList = safeClone(suspects);

  gameState.realThiefSuspectId =
    caseData.trueThiefCaseSuspectId || caseData.realThiefSuspectId || caseData.realThiefId || null;

  gameState.trueThiefCaseSuspectId = gameState.realThiefSuspectId;
  gameState.forensicTwinSuspectId = caseData.forensicTwinSuspectId || null;

  gameState.currentMission ??= {};
  gameState.currentMission.forensicHardEvidence = safeClone(caseData.hardEvidence || []);

  gameState.forensicSurvivorIds = safeClone(caseData.forensicSurvivorIds || []);

  gameState.actualCriminalId =
    caseData.actualCriminalId || gameState.currentThief?.id || gameState.currentThiefId || null;

  gameState.caseSuspectCityId = caseData.cityId || gameState.crimeCityId || null;

  gameState.selectedSuspectId =
    suspects.find((s) => !s.deductionState?.eliminated)?.id || suspects[0]?.id || null;

  saveGameState();

  return gameState.caseSuspects;
}

export function getGeneratedSuspects() {
  if (Array.isArray(gameState.suspects) && gameState.suspects.length) {
    return gameState.suspects;
  }

  if (Array.isArray(gameState.suspectList) && gameState.suspectList.length) {
    return gameState.suspectList;
  }

  return [];
}