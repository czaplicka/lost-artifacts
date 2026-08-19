// CrimeLabManager.js
import { saveGameState } from '../../GameStatePersistence.js';
import { CSI_TRACE_GAME_POOL, normalizeMiniGameKey } from './CrimeLabConfig.js';

export class CrimeLabManager {
  constructor(gameState, cityId) {
    this.gameState = gameState;
    this.cityId = cityId;
  }

  getCaseKey() {
    const mission = this.gameState.currentMission || {};
    return String(mission.id || mission.caseId || `${this.cityId}_${mission.artifact || 'default'}`);
  }

ensureCaseForensics() {
  const caseKey = this.getCaseKey();

  this.gameState.caseForensics ??= {};

  this.gameState.caseForensics[caseKey] ??= {
    identityEvidenceResult: null,
    traceEvidenceResults: [],
    forensicResults: [],

    suspectGrid: {
      generated: false,
      completed: false,

      eliminatedSuspectIds: [],
      marksBySuspectId: {},
      clueCards: [],

      score: 0,
      mistakes: 0,
      hintsUsed: 0,
      completedAt: null
    }
  };

  const caseForensics = this.gameState.caseForensics[caseKey];

  caseForensics.suspectGrid ??= {
    generated: false,
    completed: false,

    eliminatedSuspectIds: [],
    marksBySuspectId: {},
    clueCards: [],

    score: 0,
    mistakes: 0,
    hintsUsed: 0,
    completedAt: null
  };

  return caseForensics;
}

  markCrimeLabCompleted() {
    const caseKey = this.getCaseKey();
    this.gameState.crimeCityProgress ??= {};
    this.gameState.crimeCityProgress[caseKey] ??= {};
    this.gameState.crimeCityProgress[caseKey].crimeLabCompleted = true;
    this.gameState.crimeCityProgress[caseKey].crimeLabCompletedAt = Date.now();
    this.gameState.csiLabCompleted = true;
    saveGameState();
  }

  getIdentityEvidenceConfig() {
    const identityEvidence = this.gameState.identityEvidence || {};
    const allowedHairColors = ['blonde', 'black', 'red', 'brown', 'grey', 'white', 'auburn'];
    const thiefHairColor = identityEvidence.thief_value || 'black';
    const correctValue = allowedHairColors.includes(thiefHairColor) ? thiefHairColor : 'black';

    return {
      id: identityEvidence.id || 'hair_identity_sample',
      label: identityEvidence.label || 'Hair Analysis',
      minigame: 'HairAnalysisScene',
      evidenceType: 'hair_color',
      correctValue,
      clueType: 'identity',
      clueText: identityEvidence.clueText || `A ${correctValue} hair was recovered from the display case.`
    };
  }

  ensureRandomTraceEvidence() {
    const caseKey = this.getCaseKey();
    this.gameState.caseCsiAssignments ??= {};
    const existing = this.gameState.caseCsiAssignments[caseKey];

    if (Array.isArray(existing) && existing.length === 2) {
      this.gameState.traceEvidence = existing;
      return existing;
    }

    const shuffled = Phaser.Utils.Array.Shuffle(CSI_TRACE_GAME_POOL.map((e) => ({ ...e })));
    const selected = shuffled.slice(0, 2);

    this.gameState.caseCsiAssignments[caseKey] = selected;
    this.gameState.traceEvidence = selected;
    saveGameState();

    return selected;
  }

  getTraceEvidenceConfig(index) {
    const assignedEvidence = this.ensureRandomTraceEvidence();
    const fallback = CSI_TRACE_GAME_POOL[index] || {};
    const storedEvidence = assignedEvidence[index] || fallback;

    return {
      ...fallback,
      ...storedEvidence,
      minigame: normalizeMiniGameKey(
        storedEvidence.minigame || fallback.minigame,
        storedEvidence.evidenceType || fallback.evidenceType
      )
    };
  }
}