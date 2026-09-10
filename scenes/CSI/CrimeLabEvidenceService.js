import { saveGameState } from '../../GameStatePersistence.js';
import { EventBus } from '../../EventBus.js';

const IDENTITY_EVIDENCE_TYPES = [
  'hair_color',
  'blood_type',
  'dna_gender',
  'fingerprint_pattern'
];

export class CrimeLabEvidenceService {
  constructor(gameState, labManager, cityId) {
    this.gameState = gameState;
    this.labManager = labManager;
    this.cityId = cityId;
  }

  getCaseKey() {
    return this.labManager?.getCaseKey?.() || 'default_case';
  }

  getCaseForensics() {
    if (!this.labManager?.ensureCaseForensics) {
      throw new Error(
        '[CrimeLabEvidenceService] CrimeLabManager is unavailable.'
      );
    }

    return this.labManager.ensureCaseForensics();
  }

  getCrimeBoardCase() {
    const caseKey = this.getCaseKey();

    this.gameState.crimeBoards ??= {};

    this.gameState.crimeBoards[caseKey] ??= {
      caseKey,
      cityId: this.cityId,
      forensicEvidence: [],
      clues: [],
      updatedAt: null
    };

    const board = this.gameState.crimeBoards[caseKey];

    board.caseKey ??= caseKey;
    board.cityId ??= this.cityId;
    board.forensicEvidence ??= [];
    board.clues ??= [];

    return board;
  }

  isStationCompleted(stationId, caseForensics = this.getCaseForensics()) {
    if (this.labManager?.isStationCompleted) {
      return this.labManager.isStationCompleted(stationId);
    }

    if (stationId === 'identity') {
      return Boolean(caseForensics.identityEvidenceResult);
    }

    const traceMatch = /^trace_(\d+)$/.exec(String(stationId || ''));

    if (traceMatch) {
      const index = Number(traceMatch[1]);
      return Boolean(caseForensics.traceEvidenceResults?.[index]);
    }

    return false;
  }

  getCompletedStationCount() {
    const caseForensics = this.getCaseForensics();

    return [
      this.isStationCompleted('identity', caseForensics),
      this.isStationCompleted('trace_0', caseForensics),
      this.isStationCompleted('trace_1', caseForensics)
    ].filter(Boolean).length;
  }

  saveMiniGameResult(payload = {}) {
    if (!payload.completed || payload.aborted) {
      return {
        saved: false,
        wasAlreadyCompleted: false,
        completedCount: this.getCompletedStationCount()
      };
    }

    const stationId = payload.stationId;

    if (!stationId) {
      console.warn(
        '[CrimeLabEvidenceService] Result ignored: missing stationId.',
        payload
      );

      return {
        saved: false,
        wasAlreadyCompleted: false,
        completedCount: this.getCompletedStationCount()
      };
    }

    const caseForensics = this.getCaseForensics();
    const wasAlreadyCompleted = this.isStationCompleted(
      stationId,
      caseForensics
    );

    const forensicResult = {
      ...payload,
      completedAt: Date.now()
    };

    this.storeStationResult(
      stationId,
      forensicResult,
      caseForensics
    );

    this.upsertForensicResult(forensicResult, caseForensics);
    this.addForensicResultToCrimeBoard(payload, forensicResult);
    this.addCrimeLabClueToBoard(payload, forensicResult);
    this.unlockIdentityEvidenceForSuspects(payload);

    saveGameState();

    const completedCount = this.getCompletedStationCount();

    EventBus.emit('crimeLabResultSaved', {
      caseKey: this.getCaseKey(),
      stationId,
      forensicResult,
      wasAlreadyCompleted,
      completedCount
    });

    return {
      saved: true,
      wasAlreadyCompleted,
      stationId,
      forensicResult,
      completedCount
    };
  }

  storeStationResult(stationId, forensicResult, caseForensics) {
    if (stationId === 'identity') {
      caseForensics.identityEvidenceResult = forensicResult;
      return;
    }

    const traceMatch = /^trace_(\d+)$/.exec(String(stationId || ''));

    if (!traceMatch) {
      console.warn(
        '[CrimeLabEvidenceService] Unknown stationId; result kept only in forensicResults.',
        stationId
      );
      return;
    }

    const evidenceIndex = Number(traceMatch[1]);

    if (!Number.isInteger(evidenceIndex) || evidenceIndex < 0) {
      return;
    }

    caseForensics.traceEvidenceResults ??= [];
    caseForensics.traceEvidenceResults[evidenceIndex] = forensicResult;
  }

  upsertForensicResult(forensicResult, caseForensics) {
    caseForensics.forensicResults ??= [];

    const existingResultIndex = caseForensics.forensicResults.findIndex(
      (result) => result.stationId === forensicResult.stationId
    );

    if (existingResultIndex >= 0) {
      caseForensics.forensicResults[existingResultIndex] = forensicResult;
      return;
    }

    caseForensics.forensicResults.push(forensicResult);
  }

  addForensicResultToCrimeBoard(payload = {}, forensicResult = {}) {
    const evidenceConfig = payload.evidenceConfig || {};
    const board = this.getCrimeBoardCase();

    const stationId = payload.stationId || forensicResult.stationId;

    if (!stationId) {
      return null;
    }

    const evidenceType =
      payload.evidenceType ||
      evidenceConfig.evidenceType ||
      'unknown_evidence';

    const clueType =
      payload.clueType ||
      evidenceConfig.clueType ||
      'forensic';

    const clue = {
      id: `forensic_${stationId}`,
      source: 'crime_lab',
      stationId,
      cityId: this.cityId,
      evidenceType,
      clueType,
      title:
        evidenceConfig.label ||
        payload.label ||
        'Crime Lab Result',
      text:
        payload.clueText ||
        evidenceConfig.clueText ||
        forensicResult.clueText ||
        'The laboratory produced an inconclusive but suspicious result.',
      correctValue:
        payload.correctValue ??
        evidenceConfig.correctValue ??
        forensicResult.correctValue ??
        null,
      result:
        payload.result ??
        payload.selectedValue ??
        payload.answer ??
        forensicResult.result ??
        null,
      isValuable: Boolean(
        payload.isValuable ??
        evidenceConfig.isValuable ??
        (clueType === 'identity')
      ),
      completedAt: forensicResult.completedAt || Date.now(),
      discovered: true,
      read: false
    };

    this.upsertById(board.forensicEvidence, clue);
    this.upsertById(board.clues, clue);

    board.updatedAt = Date.now();

    EventBus.emit('crimeBoardClueAdded', {
      caseKey: board.caseKey,
      clue
    });

    return clue;
  }

  addCrimeLabClueToBoard(payload = {}, forensicResult = {}) {
    const caseKey = this.getCaseKey();
    const evidence = payload.evidenceConfig || {};
    const stationId = payload.stationId || forensicResult.stationId;

    if (!stationId) {
      return null;
    }

    const clue = {
      id: `crime_lab_${caseKey}_${stationId}`,
      stationId,
      source: 'crime_lab',
      cityId: this.cityId,
      title: evidence.label || 'Crime Lab Evidence',
      text:
        evidence.clueText ||
        payload.clueText ||
        'The lab result needs further interpretation.',
      clueText:
        evidence.clueText ||
        payload.clueText ||
        'The lab result needs further interpretation.',
      clueType:
        evidence.clueType ||
        payload.clueType ||
        'forensic',
      evidenceType:
        evidence.evidenceType ||
        payload.evidenceType ||
        'unknown',
      correctValue:
        evidence.correctValue ??
        payload.correctValue ??
        forensicResult.correctValue ??
        null,
      category: 'forensics',
      discovered: true,
      read: false,
      completedAt: forensicResult.completedAt || Date.now()
    };

    this.gameState.caseClues ??= {};
    this.gameState.caseClues[caseKey] ??= [];
    this.upsertById(this.gameState.caseClues[caseKey], clue);

    this.gameState.crimeLabClues ??= {};
    this.gameState.crimeLabClues[caseKey] ??= [];
    this.upsertById(this.gameState.crimeLabClues[caseKey], clue);

    EventBus.emit('crimeBoardClueAdded', {
      caseKey,
      clue
    });

    console.log(
      '[CrimeLabEvidenceService] Crime Board clue added:',
      clue
    );

    return clue;
  }

  unlockIdentityEvidenceForSuspects(payload = {}) {
    if (!payload.completed || payload.aborted) {
      return false;
    }

    const evidenceType =
      payload.evidenceType ||
      payload.evidenceConfig?.evidenceType;

    if (!IDENTITY_EVIDENCE_TYPES.includes(evidenceType)) {
      return false;
    }

    const suspects = Array.isArray(this.gameState.suspects)
      ? this.gameState.suspects
      : [];

    suspects.forEach((suspect) => {
      suspect.restrictedProfile ??= {};
      suspect.restrictedProfile.unlockedFields ??= [];
      suspect.restrictedProfile.forensicAttributes ??= {};

      const attributeData =
        suspect.restrictedProfile.forensicAttributes[evidenceType];

      if (attributeData && typeof attributeData === 'object') {
        attributeData.unlocked = true;
      }

      if (!suspect.restrictedProfile.unlockedFields.includes(evidenceType)) {
        suspect.restrictedProfile.unlockedFields.push(evidenceType);
      }
    });

    EventBus.emit('suspectEvidenceUnlocked', {
      caseKey: this.getCaseKey(),
      evidenceType
    });

    return true;
  }

  upsertById(collection, entry) {
    if (!Array.isArray(collection) || !entry?.id) {
      return false;
    }

    const existingIndex = collection.findIndex(
      (item) => item?.id === entry.id
    );

    if (existingIndex >= 0) {
      collection[existingIndex] = {
        ...collection[existingIndex],
        ...entry
      };
    } else {
      collection.push(entry);
    }

    return true;
  }
}