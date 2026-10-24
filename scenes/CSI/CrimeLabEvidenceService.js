// scenes/CSI/CrimeLabEvidenceService.js
import {saveGameState} from '../../gameStatePersistence.js';
import {EventBus} from '../../EventBus.js';
import {normalizeForensicField,normalizeForensicValue} from '../../suspects/forensicEvidence.js';
import {DEDUCTION_EVIDENCE_REGISTRY} from './DeductionEvidenceRegistry.js';

const STATION_IDS = ['identity', 'trace_0', 'trace_1'];
const IDENTITY_FIELDS = new Set([
  'hair_color', 'blood_type', 'biological_sex', 'fingerprint_pattern'
]);
const VALUE_KEYS = ['value', 'result', 'selectedValue', 'correctValue', 'answer'];
function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}
function configuredValue(config) {
  return config.correctValue ?? config.thief_value ?? config.value ?? config.normalizedValue;
}
function entryFor(type) {
  return DEDUCTION_EVIDENCE_REGISTRY[type] ||
    DEDUCTION_EVIDENCE_REGISTRY[normalizeForensicField(type)] || null;
}
function displayValue(type, value) {
  const entry = entryFor(type);
  if (entry?.formatEvidence) return entry.formatEvidence(value);
  return String(value).replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}
function evidenceValueMatches(field, a, b) {
  return normalizeForensicValue(field, a) === normalizeForensicValue(field, b);
}

export class CrimeLabEvidenceService {
  constructor(gameState, labManager, cityId) {
    this.gameState = gameState;
    this.labManager = labManager;
    this.cityId = cityId;
  }

  getCaseKey() {
    return String(this.labManager?.getCaseKey?.() || 'default_case');
  }

  getCaseForensics() {
    if (!this.labManager?.ensureCaseForensics) {
      throw new Error('[CrimeLabEvidenceService] CrimeLabManager is unavailable.');
    }
    return this.labManager.ensureCaseForensics();
  }

  getCrimeBoardCase() {
    const caseKey = this.getCaseKey();
    this.gameState.crimeBoards ??= {};
    const board = this.gameState.crimeBoards[caseKey] ??= {
      caseKey, cityId: this.cityId, forensicEvidence: [], clues: [], updatedAt: null
    };
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
    if (!STATION_IDS.includes(stationId)) return null;
    if (stationId === 'identity') {
      return this.labManager?.getIdentityEvidenceConfig?.() || null;
    }
    const index = Number(stationId.slice('trace_'.length));
    return this.labManager?.getTraceEvidenceConfig?.(index) || null;
  }

  normalizeResult(payload = {}, config = null) {
    const stationId = payload.stationId;
    if (!STATION_IDS.includes(stationId)) {
      throw new Error('Unknown or missing laboratory station.');
    }
    const caseKey = this.getCaseKey();
    if (payload.caseKey != null && String(payload.caseKey) !== caseKey) {
      throw new Error('Result belongs to a different case.');
    }
    const evidence = config || this.getStationEvidenceConfig(stationId);
    if (!evidence || typeof evidence !== 'object') {
      throw new Error(`Missing evidence configuration for ${stationId}.`);
    }
    if (evidence.stationId && evidence.stationId !== stationId) {
      throw new Error('Evidence configuration belongs to a different station.');
    }
    const evidenceType = evidence.evidenceType || evidence.attribute || evidence.field;
    if (!evidenceType) throw new Error('Evidence type is missing.');
    const field = normalizeForensicField(evidenceType);
    if (payload.evidenceType && normalizeForensicField(payload.evidenceType) !== field) {
      throw new Error('Result evidence type differs from the assigned analysis.');
    }
    const value = configuredValue(evidence);
    if (!hasValue(value)) throw new Error('Assigned evidence value is missing.');

    // Case assignment is authoritative. Reject conflicting answers rather than
    // silently converting an incorrect or stale result into a successful one.
    for (const key of VALUE_KEYS) {
      if (hasValue(payload[key]) && !evidenceValueMatches(field, payload[key], value)) {
        throw new Error(`Result ${key} differs from the assigned evidence.`);
      }
    }
    const incomingConfig = payload.evidenceConfig;
    if (incomingConfig && typeof incomingConfig === 'object') {
      const incomingType = incomingConfig.evidenceType || incomingConfig.attribute || incomingConfig.field;
      if (incomingType && normalizeForensicField(incomingType) !== field) {
        throw new Error('Incoming evidence configuration has a different type.');
      }
      const incomingValue = configuredValue(incomingConfig);
      if (hasValue(incomingValue) && !evidenceValueMatches(field, incomingValue, value)) {
        throw new Error('Incoming evidence configuration has a different value.');
      }
      if (incomingConfig.id && evidence.id && incomingConfig.id !== evidence.id) {
        throw new Error('Incoming evidence configuration has a different ID.');
      }
    }
    const label = evidence.label || entryFor(evidenceType)?.label || 'Forensic Analysis';
    const clueType = evidence.clueType || (stationId === 'identity' ? 'identity' : 'trace');
    let clueText = evidence.clueText || payload.clueText || payload.clue?.text ||
      `Laboratory analysis confirms: ${displayValue(evidenceType, value)}.`;
    const sourceConfirmed = evidence.sourceConfirmed === true;
    const sourceText = String(evidence.sourceText ?? '').trim();
    if (sourceText && !clueText.includes(sourceText)) clueText += ` ${sourceText}`;
    const source = payload.source || (payload.assistantProvided ? 'lab_assistant' : 'player');
    const assistantProvided = payload.assistantProvided === true || source === 'lab_assistant';
    const normalizedConfig = {
      ...evidence, stationId, evidenceType, field, correctValue: value,
      thief_value: value, label, clueType, clueText, sourceConfirmed, sourceText
    };
    const clue = {
      ...(payload.clue && typeof payload.clue === 'object' ? payload.clue : {}),
      id: evidence.id || payload.clue?.id || `${stationId}_${field}`,
      type: clueType, text: clueText, correctValue: value, sourceConfirmed, sourceText
    };
    return {
      ...payload,
      resultSchemaVersion: 1,
      completed: true, aborted: false, stationId,
      caseKey, cityId: this.cityId,
      evidenceIndex: stationId === 'identity' ? null : Number(stationId.slice('trace_'.length)),
      evidenceId: evidence.id || null, evidenceType, field,
      evidenceConfig: normalizedConfig,
      value, result: value, selectedValue: value, correctValue: value,
      displayValue: displayValue(evidenceType, value),
      clueType, clueText, label, clue,
      sourceConfirmed, sourceText,
      source, completedBy: assistantProvided ? 'lab_assistant' : 'player', assistantProvided,
      isValuable: Boolean(evidence.isValuable ?? (stationId === 'identity')),
      isRedHerring: evidence.isRedHerring === true
    };
  }

  getStationPayload(stationId, source = 'player') {
    try {
      return this.normalizeResult({stationId, source, completed: true, aborted: false});
    } catch (error) {
      console.warn('[CrimeLabEvidenceService] Station payload unavailable:', {stationId, message: error.message});
      return null;
    }
  }

  getStoredStationResult(stationId, state = this.getCaseForensics()) {
    if (stationId === 'identity') return state.identityEvidenceResult || null;
    if (!STATION_IDS.includes(stationId)) return null;
    return state.traceEvidenceResults?.[Number(stationId.slice('trace_'.length))] || null;
  }

  isStationCompleted(stationId, state = this.getCaseForensics()) {
    return Boolean(this.getStoredStationResult(stationId, state));
  }

  getCompletedStationCount() {
    const state = this.getCaseForensics();
    return STATION_IDS.filter(id => this.isStationCompleted(id, state)).length;
  }

  rejectedResult(reason = null) {
    return {
      saved: false, wasAlreadyCompleted: false,
      completedCount: this.getCompletedStationCount(), reason
    };
  }

  saveMiniGameResult(payload = {}) {
    if (!payload || typeof payload !== 'object' || !payload.completed || payload.aborted) {
      return this.rejectedResult('Analysis not completed.');
    }
    let normalized;
    try {
      normalized = this.normalizeResult(payload);
    } catch (error) {
      console.warn('[CrimeLabEvidenceService] Result rejected:', error.message);
      return this.rejectedResult(error.message);
    }
    const state = this.getCaseForensics();
    const previous = this.getStoredStationResult(normalized.stationId, state);
    if (previous) {
      // No replacement, extra events, new completion time or repeated time cost.
      return {
        saved: true, wasAlreadyCompleted: true, stationId: normalized.stationId,
        forensicResult: previous, completedCount: this.getCompletedStationCount()
      };
    }
    const result = {...normalized, completedAt: Date.now()};
    this.storeStationResult(result.stationId, result, state);
    this.upsertForensicResult(result, state);
    this.addForensicResultToCrimeBoard(result, result);
    this.addCrimeLabClueToBoard(result, result);
    this.addLabResultToCrimeBoardData(result, result);
    this.unlockIdentityEvidenceForSuspects(result);
    const saveSucceeded = saveGameState();
    const completedCount = this.getCompletedStationCount();
    EventBus.emit('crimeLabResultSaved', {
      caseKey: this.getCaseKey(), stationId: result.stationId,
      forensicResult: result, wasAlreadyCompleted: false, completedCount
    });
    return {
      saved: true, saveSucceeded, wasAlreadyCompleted: false,
      stationId: result.stationId, forensicResult: result, completedCount
    };
  }

  ensureAssistantResults(assistantStationIds = []) {
    const stationIds = Array.isArray(assistantStationIds)
      ? [...new Set(assistantStationIds.filter(id => STATION_IDS.includes(id)))] : [];
    const added = [];
    for (const stationId of stationIds) {
      if (this.isStationCompleted(stationId)) continue;
      const payload = this.getStationPayload(stationId, 'lab_assistant');
      if (!payload) continue;
      const result = this.saveMiniGameResult(payload);
      if (result.saved && !result.wasAlreadyCompleted) added.push(stationId);
    }
    const completedCount = this.getCompletedStationCount();
    EventBus.emit('crimeLabAssistantResultsReady', {
      caseKey: this.getCaseKey(), cityId: this.cityId,
      stationIds, addedStationIds: added, completedCount
    });
    return {added, completedCount};
  }

  storeStationResult(stationId, result, state) {
    if (!STATION_IDS.includes(stationId)) throw new Error(`Unknown station: ${stationId}`);
    if (stationId === 'identity') state.identityEvidenceResult = result;
    else {
      state.traceEvidenceResults ??= [];
      state.traceEvidenceResults[Number(stationId.slice('trace_'.length))] = result;
    }
  }

  upsertForensicResult(result, state) {
    state.forensicResults ??= [];
    const index = state.forensicResults.findIndex(r => r?.stationId === result.stationId);
    if (index < 0) state.forensicResults.push(result);
    else state.forensicResults[index] = result;
  }

  recordForBoard(payload = {}, forensicResult = {}) {
    // Internal calls always pass the normalized record. Older callers can still
    // use the original two-argument helpers and receive the same normalization.
    const merged = {...payload, ...forensicResult};
    return this.normalizeResult(merged);
  }

  boardFields(result) {
    return {
      caseKey: result.caseKey, stationId: result.stationId, cityId: result.cityId,
      evidenceId: result.evidenceId, evidenceType: result.evidenceType, field: result.field,
      clueType: result.clueType, label: result.label, title: result.label,
      value: result.value, result: result.result, selectedValue: result.selectedValue,
      correctValue: result.correctValue, displayValue: result.displayValue,
      text: result.clueText, clueText: result.clueText, description: result.clueText,
      sourceConfirmed: result.sourceConfirmed, sourceText: result.sourceText,
      source: result.source, completedBy: result.completedBy,
      assistantProvided: result.assistantProvided,
      isValuable: result.isValuable, isRedHerring: result.isRedHerring,
      completed: true, status: 'completed', completedAt: result.completedAt || Date.now()
    };
  }

  addLabResultToCrimeBoardData(payload = {}, forensicResult = {}) {
    const result = this.recordForBoard(payload, forensicResult);
    const board = this.getCrimeBoardData();
    const labResult = {
      ...this.boardFields(result),
      // Retain existing active-board IDs; include caseKey explicitly for readers.
      id: `lab-result-${result.stationId}`, type: result.evidenceType, success: true
    };
    this.upsertById(board.labResults, labResult);
    board.updatedAt = Date.now();
    EventBus.emit('crimeBoardLabResultAdded', {
      caseKey: result.caseKey, cityId: this.cityId, result: labResult
    });
    return labResult;
  }

  addForensicResultToCrimeBoard(payload = {}, forensicResult = {}) {
    const result = this.recordForBoard(payload, forensicResult);
    const board = this.getCrimeBoardCase();
    const clue = {
      ...this.boardFields(result), id: `forensic_${result.stationId}`,
      category: 'forensics', discovered: true, read: false
    };
    this.upsertById(board.forensicEvidence, clue);
    this.upsertById(board.clues, clue);
    board.updatedAt = Date.now();
    EventBus.emit('crimeBoardClueAdded', {caseKey: result.caseKey, clue});
    return clue;
  }

  addCrimeLabClueToBoard(payload = {}, forensicResult = {}) {
    const result = this.recordForBoard(payload, forensicResult);
    const clue = {
      ...this.boardFields(result),
      id: `crime_lab_${result.caseKey}_${result.stationId}`,
      category: 'forensics', discovered: true, read: false
    };
    this.gameState.caseClues ??= {};
    this.gameState.caseClues[result.caseKey] ??= [];
    this.gameState.crimeLabClues ??= {};
    this.gameState.crimeLabClues[result.caseKey] ??= [];
    this.upsertById(this.gameState.caseClues[result.caseKey], clue);
    this.upsertById(this.gameState.crimeLabClues[result.caseKey], clue);
    EventBus.emit('crimeBoardClueAdded', {caseKey: result.caseKey, clue});
    return clue;
  }

  unlockIdentityEvidenceForSuspects(payload = {}) {
    if (!payload.completed || payload.aborted) return false;
    const type = payload.evidenceType || payload.evidenceConfig?.evidenceType;
    const field = normalizeForensicField(type || '');
    if (!IDENTITY_FIELDS.has(field)) return false;
    const suspects = Array.isArray(this.gameState.caseSuspects) && this.gameState.caseSuspects.length
      ? this.gameState.caseSuspects : Array.isArray(this.gameState.suspects)
        ? this.gameState.suspects : [];
    for (const suspect of suspects) {
      suspect.restrictedProfile ??= {};
      suspect.restrictedProfile.unlockedFields ??= [];
      suspect.restrictedProfile.forensicAttributes ??= {};
      const data = suspect.restrictedProfile.forensicAttributes[field];
      if (data && typeof data === 'object') data.unlocked = true;
      if (!suspect.restrictedProfile.unlockedFields.includes(field)) {
        suspect.restrictedProfile.unlockedFields.push(field);
      }
    }
    // Reveal actual file data only. No match verdicts or automatic exclusions.
    EventBus.emit('suspectEvidenceUnlocked', {
      caseKey: this.getCaseKey(), evidenceType: type, field
    });
    return true;
  }

  upsertById(collection, entry) {
    if (!Array.isArray(collection) || !entry?.id) return false;
    const index = collection.findIndex(item => item?.id === entry.id);
    if (index < 0) collection.push(entry);
    else collection[index] = {...collection[index], ...entry};
    return true;
  }
}
