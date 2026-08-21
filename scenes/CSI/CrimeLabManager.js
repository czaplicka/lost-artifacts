import { saveGameState } from '../../GameStatePersistence.js';
import { normalizeMiniGameKey } from './CrimeLabConfig.js';

function cloneEvidence(evidence = {}) {
  try {
    return structuredClone(evidence);
  } catch {
    return JSON.parse(JSON.stringify(evidence));
  }
}

function getEvidenceValue(evidence = {}) {
  return (
    evidence.thief_value ??
    evidence.value ??
    evidence.correctValue ??
    null
  );
}

export class CrimeLabManager {
  constructor(gameState, cityId) {
    this.gameState = gameState;
    this.cityId = cityId;
  }

  getCaseKey() {
    const mission = this.gameState.currentMission || {};

    return String(
      mission.id ||
      mission.caseId ||
      `${this.cityId}_${mission.artifact || 'default'}`
    );
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

    const caseForensics =
      this.gameState.caseForensics[caseKey];

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
    this.gameState.crimeCityProgress[caseKey].crimeLabCompletedAt =
      Date.now();

    this.gameState.csiLabCompleted = true;

    saveGameState();
  }

  normalizeEvidenceConfig(
    evidence = {},
    {
      stationId = null,
      fallbackLabel = 'Forensic Analysis',
      fallbackClueType = 'trace'
    } = {}
  ) {
    const attribute =
      evidence.attribute ||
      evidence.field ||
      evidence.evidenceType ||
      null;

    const correctValue = getEvidenceValue(evidence);

    if (!attribute) {
      throw new Error(
        'CrimeLabManager: forensic evidence is missing "attribute".'
      );
    }

    if (
      correctValue === null ||
      correctValue === undefined ||
      correctValue === ''
    ) {
      throw new Error(
        `CrimeLabManager: forensic evidence "${attribute}" is missing "thief_value".`
      );
    }

    const normalizedEvidence = {
      ...cloneEvidence(evidence),

      id: evidence.id || `${attribute}_evidence`,
      stationId: stationId || evidence.stationId || null,

      attribute,
      evidenceType: attribute,

      thief_value: correctValue,

      source: evidence.source || 'crime_lab',
      label: evidence.label || fallbackLabel,

      clueType:
        evidence.clueType ||
        fallbackClueType,

      clueText:
        evidence.clueText ||
        `Laboratory analysis confirms: ${attribute} = ${correctValue}.`,

      allowedValues: Array.isArray(evidence.allowedValues)
        ? [...evidence.allowedValues]
        : [],

      minigame: normalizeMiniGameKey(
        evidence.minigame,
        attribute
      )
    };

    return {
      ...normalizedEvidence,

      correctValue,

      evidence: cloneEvidence(
        normalizedEvidence
      )
    };
  }

  getIdentityEvidenceConfig() {
    const identityEvidence =
      this.gameState.identityEvidence;

    if (
      !identityEvidence ||
      typeof identityEvidence !== 'object'
    ) {
      throw new Error(
        'CrimeLabManager: gameState.identityEvidence is missing. Generate and save the primary CSI evidence before entering the Crime Lab.'
      );
    }

    return this.normalizeEvidenceConfig(
      identityEvidence,
      {
        stationId: 'identity',
        fallbackLabel: 'Identity Evidence Analysis',
        fallbackClueType: 'identity'
      }
    );
  }

  ensureRandomTraceEvidence() {
    const caseKey = this.getCaseKey();

    this.gameState.caseCsiAssignments ??= {};

    const existing =
      this.gameState.caseCsiAssignments[caseKey];

    if (
      Array.isArray(existing) &&
      existing.length === 2
    ) {
      this.gameState.traceEvidence =
        cloneEvidence(existing);

      return this.gameState.traceEvidence;
    }

    const generatedTraceEvidence =
      this.gameState.traceEvidence;

    if (
      !Array.isArray(generatedTraceEvidence) ||
      generatedTraceEvidence.length !== 2
    ) {
      throw new Error(
        'CrimeLabManager: gameState.traceEvidence must contain exactly two evidence objects. Generate them in gameSetup before entering the Crime Lab.'
      );
    }

    const assignments =
      generatedTraceEvidence.map((evidence, index) => {
        const config = this.normalizeEvidenceConfig(
          evidence,
          {
            stationId: `trace_${index + 1}`,
            fallbackLabel: `Trace Evidence ${index + 1}`,
            fallbackClueType: 'trace'
          }
        );

        return config.evidence;
      });

    this.gameState.caseCsiAssignments[caseKey] =
      cloneEvidence(assignments);

    this.gameState.traceEvidence =
      cloneEvidence(assignments);

    saveGameState();

    return this.gameState.traceEvidence;
  }

  getTraceEvidenceConfig(index) {
    const assignedEvidence =
      this.ensureRandomTraceEvidence();

    const evidence =
      assignedEvidence[index];

    if (!evidence) {
      throw new Error(
        `CrimeLabManager: trace evidence at index ${index} does not exist.`
      );
    }

    return this.normalizeEvidenceConfig(
      evidence,
      {
        stationId: `trace_${index + 1}`,
        fallbackLabel: `Trace Evidence ${index + 1}`,
        fallbackClueType: 'trace'
      }
    );
  }
}