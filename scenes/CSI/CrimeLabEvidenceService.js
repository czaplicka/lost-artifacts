import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import {
  saveGameState
} from '../../gameStatePersistence.js';

import { EventBus } from '../../EventBus.js';

import {
  progressionManager
} from '../../managers/ProgressionManager.js';

import {
  normalizeForensicField,
  normalizeForensicValue
} from '../../suspects/forensicEvidence.js';

import {
  DEDUCTION_EVIDENCE_REGISTRY
} from './DeductionEvidenceRegistry.js';

import {
  isCompletedLabResult
} from './LabResultState.js';

const STATION_IDS = [
  'identity',
  'trace_0',
  'trace_1'
];

const IDENTITY_FIELDS = new Set([
  'hair_color',
  'blood_type',
  'biological_sex',
  'fingerprint_pattern'
]);

const VALUE_KEYS = [
  'value',
  'result',
  'selectedValue',
  'correctValue',
  'answer'
];

function hasValue(value) {
  return (
    value !== undefined &&
    value !== null &&
    String(value).trim() !== ''
  );
}

function configuredValue(config) {
  return (
    config.correctValue ??
    config.thief_value ??
    config.value ??
    config.normalizedValue
  );
}

function entryFor(type) {
  return (
    DEDUCTION_EVIDENCE_REGISTRY[type] ||
    DEDUCTION_EVIDENCE_REGISTRY[
      normalizeForensicField(type)
    ] ||
    null
  );
}

function displayValue(type, value) {
  const entry = entryFor(type);

  return entry?.formatEvidence
    ? entry.formatEvidence(value)
    : String(value)
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function valuesMatch(field, first, second) {
  return (
    normalizeForensicValue(field, first) ===
    normalizeForensicValue(field, second)
  );
}

export class CrimeLabEvidenceService {
  constructor(gameState, labManager, cityId) {
    this.gameState = gameState;
    this.labManager = labManager;
    this.cityId = cityId;
  }

  getCaseKey() {
    return String(
      this.labManager?.getCaseKey?.() ||
      'default_case'
    );
  }

  getCaseForensics() {
    if (!this.labManager?.ensureCaseForensics) {
      throw new Error(
        'CrimeLabManager is unavailable.'
      );
    }

    return this.labManager.ensureCaseForensics();
  }

  getCrimeBoardCase() {
    const key = this.getCaseKey();

    this.gameState.crimeBoards ??= {};

    const board =
      this.gameState.crimeBoards[key] ??= {
        caseKey: key,
        cityId: this.cityId,
        forensicEvidence: [],
        clues: [],
        updatedAt: null
      };

    board.caseKey ??= key;
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

  getStationEvidenceConfig(id) {
    if (!STATION_IDS.includes(id)) {
      return null;
    }

    return id === 'identity'
      ? this.labManager
          ?.getIdentityEvidenceConfig?.() || null
      : this.labManager
          ?.getTraceEvidenceConfig?.(
            Number(id.slice(-1))
          ) || null;
  }

  normalizeResult(payload = {}, config = null) {
    const id = payload.stationId;
    const key = this.getCaseKey();

    if (!STATION_IDS.includes(id)) {
      throw new Error(
        'Unknown or missing laboratory station.'
      );
    }

    if (
      payload.caseKey != null &&
      String(payload.caseKey) !== key
    ) {
      throw new Error(
        'Result belongs to a different case.'
      );
    }

    const evidence =
      config || this.getStationEvidenceConfig(id);

    if (!evidence || typeof evidence !== 'object') {
      throw new Error(
        `Missing evidence configuration: ${id}`
      );
    }

    if (
      evidence.stationId &&
      evidence.stationId !== id
    ) {
      throw new Error(
        'Evidence belongs to a different station.'
      );
    }

    const type =
      evidence.evidenceType ||
      evidence.attribute ||
      evidence.field;

    if (!type) {
      throw new Error('Evidence type is missing.');
    }

    const field = normalizeForensicField(type);
    const value = configuredValue(evidence);

    if (
      payload.evidenceType &&
      normalizeForensicField(
        payload.evidenceType
      ) !== field
    ) {
      throw new Error('Wrong evidence type.');
    }

    if (!hasValue(value)) {
      throw new Error(
        'Assigned evidence value is missing.'
      );
    }

    for (const valueKey of VALUE_KEYS) {
      if (
        hasValue(payload[valueKey]) &&
        !valuesMatch(
          field,
          payload[valueKey],
          value
        )
      ) {
        throw new Error(
          `Result ${valueKey} differs from the assigned evidence.`
        );
      }
    }

    const incoming = payload.evidenceConfig;

    if (incoming && typeof incoming === 'object') {
      const incomingType =
        incoming.evidenceType ||
        incoming.attribute ||
        incoming.field;

      if (
        incomingType &&
        normalizeForensicField(
          incomingType
        ) !== field
      ) {
        throw new Error(
          'Incoming config has a different type.'
        );
      }

      const incomingValue =
        configuredValue(incoming);

      if (
        hasValue(incomingValue) &&
        !valuesMatch(field, incomingValue, value)
      ) {
        throw new Error(
          'Incoming config has a different value.'
        );
      }

      if (
        incoming.id &&
        evidence.id &&
        incoming.id !== evidence.id
      ) {
        throw new Error(
          'Incoming config has a different ID.'
        );
      }
    }

    const label =
      evidence.label ||
      entryFor(type)?.label ||
      __dialogueText("scenes/CSI/CrimeLabEvidenceService.js", "t_d2f42de4fcfd1fbdaa64");

    const clueType =
      evidence.clueType ||
      (id === 'identity' ? 'identity' : 'trace');

    let text =
      evidence.clueText ||
      payload.clueText ||
      payload.clue?.text ||
      `${__dialogueText("scenes/CSI/CrimeLabEvidenceService.js", "t_c3a8aab15c7d72b57838")}${
        displayValue(type, value)
      }${__dialogueText("scenes/CSI/CrimeLabEvidenceService.js", "t_cdb4ee2aea69cc6a8333")}`;

    const sourceConfirmed =
      evidence.sourceConfirmed === true;

    const sourceText = String(
      evidence.sourceText ?? ''
    ).trim();

    if (
      sourceText &&
      !text.includes(sourceText)
    ) {
      text += ` ${sourceText}`;
    }

    const source =
      payload.source ||
      (
        payload.assistantProvided
          ? 'lab_assistant'
          : 'player'
      );

    const assistant =
      payload.assistantProvided === true ||
      source === 'lab_assistant';

    const evidenceConfig = {
      ...evidence,
      stationId: id,
      evidenceType: type,
      field,
      correctValue: value,
      thief_value: value,
      label,
      clueType,
      clueText: text,
      sourceConfirmed,
      sourceText
    };

    return {
      ...payload,
      resultSchemaVersion: 1,
      completed: true,
      aborted: false,
      stationId: id,
      caseKey: key,
      cityId: this.cityId,

      evidenceIndex:
        id === 'identity'
          ? null
          : Number(id.slice(-1)),

      evidenceId: evidence.id || null,
      evidenceType: type,
      field,
      evidenceConfig,

      value,
      result: value,
      selectedValue: value,
      correctValue: value,
      displayValue: displayValue(type, value),

      clueType,
      clueText: text,
      label,

      clue: {
        ...(
          payload.clue &&
          typeof payload.clue === 'object'
            ? payload.clue
            : {}
        ),

        id:
          evidence.id ||
          payload.clue?.id ||
          `${id}_${field}`,

        type: clueType,
        text,
        correctValue: value,
        sourceConfirmed,
        sourceText
      },

      sourceConfirmed,
      sourceText,
      source,

      completedBy:
        assistant ? 'lab_assistant' : 'player',

      assistantProvided: assistant,

      isValuable: Boolean(
        evidence.isValuable ??
        (id === 'identity')
      ),

      isRedHerring:
        evidence.isRedHerring === true
    };
  }

  getStationPayload(id, source = 'player') {
    try {
      return this.normalizeResult({
        stationId: id,
        source,
        completed: true,
        aborted: false
      });
    } catch (error) {
      console.warn(
        '[CrimeLabEvidenceService] Station payload unavailable:',
        error.message
      );

      return null;
    }
  }

  getStoredStationResult(
    id,
    state = this.getCaseForensics()
  ) {
    if (!STATION_IDS.includes(id)) {
      return null;
    }

    const result =
      id === 'identity'
        ? state.identityEvidenceResult
        : state.traceEvidenceResults?.[
            Number(id.slice(-1))
          ];

    return isCompletedLabResult(result, {
      caseKey: this.getCaseKey()
    })
      ? result
      : null;
  }

  isStationCompleted(
    id,
    state = this.getCaseForensics()
  ) {
    return (
      this.getStoredStationResult(id, state) !== null
    );
  }

  getCompletedStationCount() {
    const state = this.getCaseForensics();

    return STATION_IDS.filter(id =>
      this.isStationCompleted(id, state)
    ).length;
  }

  grantCompletionXP() {
    if (
      this.getCompletedStationCount() !==
      STATION_IDS.length
    ) {
      return {
        success: false,
        reason: 'lab_not_completed'
      };
    }

    const caseKey = this.getCaseKey().trim();

    // Nie używamy wspólnego klucza zastępczego
    // do jednorazowych nagród postaci.
    if (
      !caseKey ||
      caseKey === 'default_case'
    ) {
      console.warn(
        '[CrimeLabEvidenceService] XP skipped: no stable case key.'
      );

      return {
        success: false,
        reason: 'missing_case_key'
      };
    }

    try {
      return progressionManager.grantReward(
        'csi_completed',
        caseKey,
        __dialogueText("scenes/CSI/CrimeLabEvidenceService.js", "t_747d106caa6c836b095f")
      );
    } catch (error) {
      console.error(
        '[CrimeLabEvidenceService] Could not grant CSI XP:',
        error
      );

      return {
        success: false,
        reason: 'progression_error'
      };
    }
  }

  rejectedResult(reason = null) {
    return {
      saved: false,
      wasAlreadyCompleted: false,
      completedCount:
        this.getCompletedStationCount(),
      reason
    };
  }

  saveMiniGameResult(payload = {}) {
    if (
      !payload ||
      typeof payload !== 'object' ||
      payload.completed !== true ||
      payload.aborted
    ) {
      return this.rejectedResult(
        __dialogueText("scenes/CSI/CrimeLabEvidenceService.js", "t_de5f20b77689a295e478")
      );
    }

    let normalized;

    try {
      normalized = this.normalizeResult(payload);
    } catch (error) {
      console.warn(
        '[CrimeLabEvidenceService] Result rejected:',
        error.message
      );

      return this.rejectedResult(error.message);
    }

    const state = this.getCaseForensics();

    const previous = this.getStoredStationResult(
      normalized.stationId,
      state
    );

    // Ponowny zapis starego wyniku nie daje XP.
    if (previous) {
      return {
        saved: true,
        wasAlreadyCompleted: true,
        stationId: normalized.stationId,
        forensicResult: previous,
        completedCount:
          this.getCompletedStationCount(),

        xpResult: {
          success: false,
          reason: 'station_already_completed'
        }
      };
    }

    const result = {
      ...normalized,
      completedAt: Date.now()
    };

    this.storeStationResult(
      result.stationId,
      result,
      state
    );

    this.upsertForensicResult(result, state);

    this.addForensicResultToCrimeBoard(
      result,
      result
    );

    this.addCrimeLabClueToBoard(
      result,
      result
    );

    this.addLabResultToCrimeBoardData(
      result,
      result
    );

    this.unlockIdentityEvidenceForSuspects(result);

    const count = this.getCompletedStationCount();

    // Nagroda dopiero po zapisaniu ostatniej
    // brakującej analizy w stanie sprawy.
    const xpResult = this.grantCompletionXP();

    // Wyniki i odebrana nagroda trafiają
    // do tego samego zapisu gry.
    const saveSucceeded = saveGameState();

    EventBus.emit('crimeLabResultSaved', {
      caseKey: this.getCaseKey(),
      stationId: result.stationId,
      forensicResult: result,
      wasAlreadyCompleted: false,
      completedCount: count,
      xpResult
    });

    return {
      saved: true,
      saveSucceeded,
      wasAlreadyCompleted: false,
      stationId: result.stationId,
      forensicResult: result,
      completedCount: count,
      xpResult
    };
  }

  ensureAssistantResults(ids = []) {
    const stations = Array.isArray(ids)
      ? [
          ...new Set(
            ids.filter(id =>
              STATION_IDS.includes(id)
            )
          )
        ]
      : [];

    const added = [];

    for (const id of stations) {
      if (this.isStationCompleted(id)) {
        continue;
      }

      const payload = this.getStationPayload(
        id,
        'lab_assistant'
      );

      if (!payload) {
        continue;
      }

      const result =
        this.saveMiniGameResult(payload);

      if (
        result.saved &&
        !result.wasAlreadyCompleted
      ) {
        added.push(id);
      }
    }

    const count = this.getCompletedStationCount();

    EventBus.emit('crimeLabAssistantResultsReady', {
      caseKey: this.getCaseKey(),
      cityId: this.cityId,
      stationIds: stations,
      addedStationIds: added,
      completedCount: count
    });

    return {
      added,
      completedCount: count
    };
  }

  storeStationResult(id, result, state) {
    if (!STATION_IDS.includes(id)) {
      throw new Error(
        `Unknown station: ${id}`
      );
    }

    if (id === 'identity') {
      state.identityEvidenceResult = result;
    } else {
      state.traceEvidenceResults ??= [];

      state.traceEvidenceResults[
        Number(id.slice(-1))
      ] = result;
    }
  }

  upsertForensicResult(result, state) {
    state.forensicResults ??= [];

    const index =
      state.forensicResults.findIndex(
        entry =>
          entry?.stationId === result.stationId
      );

    if (index < 0) {
      state.forensicResults.push(result);
    } else {
      state.forensicResults[index] = result;
    }
  }

  recordForBoard(payload = {}, result = {}) {
    return this.normalizeResult({
      ...payload,
      ...result
    });
  }

  boardFields(result) {
    return {
      caseKey: result.caseKey,
      stationId: result.stationId,
      cityId: result.cityId,
      evidenceId: result.evidenceId,
      evidenceType: result.evidenceType,
      field: result.field,
      clueType: result.clueType,

      label: result.label,
      title: result.label,

      value: result.value,
      result: result.result,
      selectedValue: result.selectedValue,
      correctValue: result.correctValue,
      displayValue: result.displayValue,

      text: result.clueText,
      clueText: result.clueText,
      description: result.clueText,

      sourceConfirmed: result.sourceConfirmed,
      sourceText: result.sourceText,
      source: result.source,

      completedBy: result.completedBy,
      assistantProvided: result.assistantProvided,
      isValuable: result.isValuable,
      isRedHerring: result.isRedHerring,

      completed: true,
      status: 'completed',

      completedAt:
        result.completedAt || Date.now()
    };
  }

  addLabResultToCrimeBoardData(
    payload = {},
    record = {}
  ) {
    const normalized =
      this.recordForBoard(payload, record);

    const board = this.getCrimeBoardData();

    const result = {
      ...this.boardFields(normalized),
      id: `lab-result-${normalized.stationId}`,
      type: normalized.evidenceType,
      success: true
    };

    this.upsertById(board.labResults, result);

    board.updatedAt = Date.now();

    EventBus.emit('crimeBoardLabResultAdded', {
      caseKey: normalized.caseKey,
      cityId: this.cityId,
      result
    });

    return result;
  }

  addForensicResultToCrimeBoard(
    payload = {},
    record = {}
  ) {
    const normalized =
      this.recordForBoard(payload, record);

    const board = this.getCrimeBoardCase();

    const clue = {
      ...this.boardFields(normalized),
      id: `forensic_${normalized.stationId}`,
      category: 'forensics',
      discovered: true,
      read: false
    };

    this.upsertById(
      board.forensicEvidence,
      clue
    );

    this.upsertById(board.clues, clue);

    board.updatedAt = Date.now();

    EventBus.emit('crimeBoardClueAdded', {
      caseKey: normalized.caseKey,
      clue
    });

    return clue;
  }

  addCrimeLabClueToBoard(
    payload = {},
    record = {}
  ) {
    const normalized =
      this.recordForBoard(payload, record);

    const clue = {
      ...this.boardFields(normalized),

      id:
        `crime_lab_${normalized.caseKey}_` +
        normalized.stationId,

      category: 'forensics',
      discovered: true,
      read: false
    };

    this.gameState.caseClues ??= {};

    this.gameState.caseClues[
      normalized.caseKey
    ] ??= [];

    this.gameState.crimeLabClues ??= {};

    this.gameState.crimeLabClues[
      normalized.caseKey
    ] ??= [];

    this.upsertById(
      this.gameState.caseClues[
        normalized.caseKey
      ],
      clue
    );

    this.upsertById(
      this.gameState.crimeLabClues[
        normalized.caseKey
      ],
      clue
    );

    EventBus.emit('crimeBoardClueAdded', {
      caseKey: normalized.caseKey,
      clue
    });

    return clue;
  }

  unlockIdentityEvidenceForSuspects(
    payload = {}
  ) {
    if (
      !payload.completed ||
      payload.aborted
    ) {
      return false;
    }

    const type =
      payload.evidenceType ||
      payload.evidenceConfig?.evidenceType;

    const field = normalizeForensicField(
      type || ''
    );

    if (!IDENTITY_FIELDS.has(field)) {
      return false;
    }

    const suspects =
      Array.isArray(this.gameState.caseSuspects) &&
      this.gameState.caseSuspects.length
        ? this.gameState.caseSuspects
        : Array.isArray(this.gameState.suspects)
          ? this.gameState.suspects
          : [];

    for (const suspect of suspects) {
      suspect.restrictedProfile ??= {};

      suspect.restrictedProfile
        .unlockedFields ??= [];

      suspect.restrictedProfile
        .forensicAttributes ??= {};

      const data =
        suspect.restrictedProfile
          .forensicAttributes[field];

      if (data && typeof data === 'object') {
        data.unlocked = true;
      }

      if (
        !suspect.restrictedProfile
          .unlockedFields.includes(field)
      ) {
        suspect.restrictedProfile
          .unlockedFields.push(field);
      }
    }

    EventBus.emit('suspectEvidenceUnlocked', {
      caseKey: this.getCaseKey(),
      evidenceType: type,
      field
    });

    return true;
  }

  upsertById(collection, entry) {
    if (
      !Array.isArray(collection) ||
      !entry?.id
    ) {
      return false;
    }

    const index = collection.findIndex(
      item => item?.id === entry.id
    );

    if (index < 0) {
      collection.push(entry);
    } else {
      collection[index] = {
        ...collection[index],
        ...entry
      };
    }

    return true;
  }
}