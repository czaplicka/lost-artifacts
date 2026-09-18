import { saveGameState } from '../../GameStatePersistence.js';
import { EventBus } from '../../EventBus.js';

const IDENTITY_EVIDENCE_TYPES = [
  'hair_color',
  'blood_type',
  'dna_gender',
  'fingerprint_pattern'
];

const STATION_IDS = [
  'identity',
  'trace_0',
  'trace_1'
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

  getCrimeBoardData() {
    this.gameState.crimeBoardData ??= {};

    this.gameState.crimeBoardData.labResults ??= [];

    return this.gameState.crimeBoardData;
  }

  getStationEvidenceConfig(stationId) {
    if (stationId === 'identity') {
      return this.labManager?.getIdentityEvidenceConfig?.() || null;
    }

    const traceMatch = /^trace_(\d+)$/.exec(
      String(stationId || '')
    );

    if (!traceMatch) {
      return null;
    }

    const evidenceIndex = Number(traceMatch[1]);

    if (!Number.isInteger(evidenceIndex) || evidenceIndex < 0) {
      return null;
    }

    return this.labManager?.getTraceEvidenceConfig?.(
      evidenceIndex
    ) || null;
  }

  getStationPayload(stationId, source = 'player') {
    const evidenceConfig =
      this.getStationEvidenceConfig(stationId);

    if (!evidenceConfig) {
      console.warn(
        '[CrimeLabEvidenceService] Missing evidence configuration.',
        { stationId, source }
      );

      return null;
    }

    const traceMatch = /^trace_(\d+)$/.exec(
      String(stationId || '')
    );

    const evidenceIndex = traceMatch
      ? Number(traceMatch[1])
      : null;

    return {
      completed: true,
      aborted: false,
      stationId,
      source,
      evidenceConfig,
      evidenceIndex,
      evidenceType: evidenceConfig.evidenceType,
      correctValue: evidenceConfig.correctValue,
      clueType: evidenceConfig.clueType,
      clueText: evidenceConfig.clueText,
      label: evidenceConfig.label,

      /*
       * Wynik jest kontrolowany przez dane sprawy,
       * nie przez sam fakt kliknięcia przez gracza.
       */
      result: evidenceConfig.correctValue,
      selectedValue: evidenceConfig.correctValue,

      isValuable: Boolean(
        evidenceConfig.isValuable ??
        evidenceConfig.clueType === 'identity'
      )
    };
  }

  ensureAssistantResults(assistantStationIds = []) {
    const safeAssistantStationIds = Array.isArray(
      assistantStationIds
    )
      ? assistantStationIds.filter(stationId => {
        return STATION_IDS.includes(stationId);
      })
      : [];

    const added = [];

    if (safeAssistantStationIds.length === 0) {
      const completedCount = this.getCompletedStationCount();

      EventBus.emit('crimeLabAssistantResultsReady', {
        caseKey: this.getCaseKey(),
        cityId: this.cityId,
        stationIds: [],
        addedStationIds: [],
        completedCount
      });

      return {
        added: [],
        completedCount
      };
    }

    const caseForensics = this.getCaseForensics();

    safeAssistantStationIds.forEach(stationId => {
      if (this.isStationCompleted(stationId, caseForensics)) {
        return;
      }

      const payload = this.getStationPayload(
        stationId,
        'lab_assistant'
      );

      if (!payload) {
        return;
      }

      const forensicResult = {
        ...payload,
        completedAt: Date.now(),
        completedBy: 'lab_assistant',
        assistantProvided: true
      };

      this.storeStationResult(
        stationId,
        forensicResult,
        caseForensics
      );

      this.upsertForensicResult(
        forensicResult,
        caseForensics
      );

      this.addForensicResultToCrimeBoard(
        payload,
        forensicResult
      );

      this.addCrimeLabClueToBoard(
        payload,
        forensicResult
      );

      this.addLabResultToCrimeBoardData(
        payload,
        forensicResult
      );

      this.unlockIdentityEvidenceForSuspects(payload);

      added.push(stationId);

      EventBus.emit('crimeLabResultSaved', {
        caseKey: this.getCaseKey(),
        stationId,
        forensicResult,
        wasAlreadyCompleted: false,
        completedCount: this.getCompletedStationCount()
      });
    });

    if (added.length > 0) {
      saveGameState();

      console.log(
        '[CrimeLabEvidenceService] Assistant results prepared:',
        {
          caseKey: this.getCaseKey(),
          stationIds: added
        }
      );
    }

    const completedCount = this.getCompletedStationCount();

    EventBus.emit('crimeLabAssistantResultsReady', {
      caseKey: this.getCaseKey(),
      cityId: this.cityId,
      stationIds: safeAssistantStationIds,
      addedStationIds: added,
      completedCount
    });

    return {
      added,
      completedCount
    };
  }

  isStationCompleted(
    stationId,
    caseForensics = this.getCaseForensics()
  ) {
    if (this.labManager?.isStationCompleted) {
      return this.labManager.isStationCompleted(stationId);
    }

    if (stationId === 'identity') {
      return Boolean(caseForensics.identityEvidenceResult);
    }

    const traceMatch = /^trace_(\d+)$/.exec(
      String(stationId || '')
    );

    if (traceMatch) {
      const index = Number(traceMatch[1]);

      return Boolean(
        caseForensics.traceEvidenceResults?.[index]
      );
    }

    return false;
  }

  getCompletedStationCount() {
    const caseForensics = this.getCaseForensics();

    return STATION_IDS.filter(stationId => {
      return this.isStationCompleted(
        stationId,
        caseForensics
      );
    }).length;
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
      source: payload.source || 'player',
      completedBy: payload.completedBy || 'player',
      completedAt: Date.now()
    };

    this.storeStationResult(
      stationId,
      forensicResult,
      caseForensics
    );

    this.upsertForensicResult(
      forensicResult,
      caseForensics
    );

    this.addForensicResultToCrimeBoard(
      payload,
      forensicResult
    );

    this.addCrimeLabClueToBoard(
      payload,
      forensicResult
    );

    this.addLabResultToCrimeBoardData(
      payload,
      forensicResult
    );

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

  storeStationResult(
    stationId,
    forensicResult,
    caseForensics
  ) {
    if (stationId === 'identity') {
      caseForensics.identityEvidenceResult = forensicResult;
      return;
    }

    const traceMatch = /^trace_(\d+)$/.exec(
      String(stationId || '')
    );

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
    caseForensics.traceEvidenceResults[evidenceIndex] =
      forensicResult;
  }

  upsertForensicResult(forensicResult, caseForensics) {
    caseForensics.forensicResults ??= [];

    const existingResultIndex =
      caseForensics.forensicResults.findIndex(result => {
        return result.stationId === forensicResult.stationId;
      });

    if (existingResultIndex >= 0) {
      caseForensics.forensicResults[existingResultIndex] =
        forensicResult;
      return;
    }

    caseForensics.forensicResults.push(forensicResult);
  }

  addLabResultToCrimeBoardData(
    payload = {},
    forensicResult = {}
  ) {
    const boardData = this.getCrimeBoardData();
    const evidenceConfig = payload.evidenceConfig || {};

    const stationId =
      payload.stationId ||
      forensicResult.stationId;

    if (!stationId) {
      return null;
    }

    const evidenceType =
      payload.evidenceType ||
      evidenceConfig.evidenceType ||
      forensicResult.evidenceType ||
      'unknown';

    const title =
      evidenceConfig.label ||
      payload.label ||
      forensicResult.label ||
      'LAB REPORT';

    const value =
      payload.result ??
      payload.selectedValue ??
      payload.correctValue ??
      forensicResult.result ??
      forensicResult.selectedValue ??
      forensicResult.correctValue ??
      'Analysis complete';

    const description =
      payload.clueText ||
      evidenceConfig.clueText ||
      forensicResult.clueText ||
      'The laboratory produced a verified forensic result.';

    const labResult = {
      id: `lab-result-${stationId}`,
      stationId,
      completed: true,
      success: true,
      status: 'completed',
      cityId: this.cityId,
      type: evidenceType,
      evidenceType,
      clueType:
        payload.clueType ||
        evidenceConfig.clueType ||
        forensicResult.clueType ||
        'forensic',
      title,
      label: title,
      value: String(value),
      result: value,
      correctValue: value,
      description,
      source:
        forensicResult.source ||
        payload.source ||
        'crime_lab',
      completedBy:
        forensicResult.completedBy ||
        payload.completedBy ||
        'player',
      assistantProvided: Boolean(
        forensicResult.assistantProvided
      ),
      isValuable: Boolean(
        payload.isValuable ??
        evidenceConfig.isValuable ??
        forensicResult.isValuable ??
        false
      ),
      completedAt:
        forensicResult.completedAt ||
        Date.now()
    };

    this.upsertById(
      boardData.labResults,
      labResult
    );

    boardData.updatedAt = Date.now();

    EventBus.emit('crimeBoardLabResultAdded', {
      caseKey: this.getCaseKey(),
      cityId: this.cityId,
      result: labResult
    });

    return labResult;
  }

  addForensicResultToCrimeBoard(
    payload = {},
    forensicResult = {}
  ) {
    const evidenceConfig = payload.evidenceConfig || {};
    const board = this.getCrimeBoardCase();

    const stationId =
      payload.stationId ||
      forensicResult.stationId;

    if (!stationId) {
      return null;
    }

    const evidenceType =
      payload.evidenceType ||
      evidenceConfig.evidenceType ||
      forensicResult.evidenceType ||
      'unknown_evidence';

    const clueType =
      payload.clueType ||
      evidenceConfig.clueType ||
      forensicResult.clueType ||
      'forensic';

    const clue = {
      id: `forensic_${stationId}`,
      source:
        forensicResult.source ||
        payload.source ||
        'crime_lab',
      completedBy:
        forensicResult.completedBy ||
        payload.completedBy ||
        'player',
      assistantProvided: Boolean(
        forensicResult.assistantProvided
      ),
      stationId,
      cityId: this.cityId,
      evidenceType,
      clueType,
      title:
        evidenceConfig.label ||
        payload.label ||
        forensicResult.label ||
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
        forensicResult.selectedValue ??
        forensicResult.correctValue ??
        null,
      isValuable: Boolean(
        payload.isValuable ??
        evidenceConfig.isValuable ??
        forensicResult.isValuable ??
        clueType === 'identity'
      ),
      completed: true,
      status: 'completed',
      completedAt:
        forensicResult.completedAt ||
        Date.now(),
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

  addCrimeLabClueToBoard(
    payload = {},
    forensicResult = {}
  ) {
    const caseKey = this.getCaseKey();
    const evidence = payload.evidenceConfig || {};

    const stationId =
      payload.stationId ||
      forensicResult.stationId;

    if (!stationId) {
      return null;
    }

    const result =
      payload.result ??
      payload.selectedValue ??
      payload.correctValue ??
      forensicResult.result ??
      forensicResult.selectedValue ??
      forensicResult.correctValue ??
      null;

    const clue = {
      id: `crime_lab_${caseKey}_${stationId}`,
      stationId,
      source:
        forensicResult.source ||
        payload.source ||
        'crime_lab',
      completedBy:
        forensicResult.completedBy ||
        payload.completedBy ||
        'player',
      assistantProvided: Boolean(
        forensicResult.assistantProvided
      ),
      cityId: this.cityId,
      title:
        evidence.label ||
        payload.label ||
        forensicResult.label ||
        'Crime Lab Evidence',
      text:
        evidence.clueText ||
        payload.clueText ||
        forensicResult.clueText ||
        'The lab result needs further interpretation.',
      clueText:
        evidence.clueText ||
        payload.clueText ||
        forensicResult.clueText ||
        'The lab result needs further interpretation.',
      clueType:
        evidence.clueType ||
        payload.clueType ||
        forensicResult.clueType ||
        'forensic',
      evidenceType:
        evidence.evidenceType ||
        payload.evidenceType ||
        forensicResult.evidenceType ||
        'unknown',
      correctValue:
        evidence.correctValue ??
        payload.correctValue ??
        forensicResult.correctValue ??
        null,
      result,
      category: 'forensics',
      completed: true,
      status: 'completed',
      discovered: true,
      read: false,
      completedAt:
        forensicResult.completedAt ||
        Date.now()
    };

    this.gameState.caseClues ??= {};
    this.gameState.caseClues[caseKey] ??= [];

    this.upsertById(
      this.gameState.caseClues[caseKey],
      clue
    );

    this.gameState.crimeLabClues ??= {};
    this.gameState.crimeLabClues[caseKey] ??= [];

    this.upsertById(
      this.gameState.crimeLabClues[caseKey],
      clue
    );

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

    suspects.forEach(suspect => {
      suspect.restrictedProfile ??= {};
      suspect.restrictedProfile.unlockedFields ??= [];
      suspect.restrictedProfile.forensicAttributes ??= {};

      const attributeData =
        suspect.restrictedProfile.forensicAttributes[
          evidenceType
        ];

      if (attributeData && typeof attributeData === 'object') {
        attributeData.unlocked = true;
      }

      if (
        !suspect.restrictedProfile.unlockedFields.includes(
          evidenceType
        )
      ) {
        suspect.restrictedProfile.unlockedFields.push(
          evidenceType
        );
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

    const existingIndex = collection.findIndex(item => {
      return item?.id === entry.id;
    });

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