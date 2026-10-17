import { saveGameState } from '../../gameStatePersistence.js';
import { normalizeMiniGameKey, CSI_MAIN_GAME_POOL } from './CrimeLabConfig.js';
import { getForensicValue } from '../../suspects/suspectFactory.js';

function cloneEvidence(evidence = {}) { return structuredClone(evidence); }
function getEvidenceValue(evidence = {}) {
  return evidence.thief_value ?? evidence.value ?? evidence.correctValue ?? evidence.normalizedValue ?? null;
}
function hashString(value) {
  let hash = 0;
  for (const character of String(value || 'default')) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash;
}
function mapGenderCodeToDnaProfile(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['m', 'male', 'xy'].includes(normalized)) return 'XY';
  if (['f', 'female', 'xx'].includes(normalized)) return 'XX';
  return null;
}
function weightedFingerprintPattern(seed) {
  const roll = (seed % 1000) / 1000;
  return roll < 0.65 ? 'LOOP' : roll < 0.95 ? 'WHORL' : 'ARCH';
}
export class CrimeLabManager {
  constructor(gameState, cityId) { this.gameState = gameState; this.cityId = cityId; }
  getCaseKey() {
    const mission = this.gameState.currentMission ?? {};
    const id = mission.id ?? mission.caseId ?? mission.caseIndex;
    return id !== undefined && id !== null && id !== '' ? String(id) : `${this.cityId ?? 'unknown_city'}_${mission.artifact ?? 'default_artifact'}`;
  }
  getSuspectData() {
    const selected = this.gameState.selectedThiefProfile || this.gameState.selectedThief || this.gameState.currentThief || this.gameState.thief || {};
    return { ...selected, ...(this.gameState.reconstructedHeist || {}) };
  }
  ensureCaseForensics() {
    this.gameState.caseForensics ??= {};
    const state = this.gameState.caseForensics[this.getCaseKey()] ??= {};
    state.identityEvidenceResult ??= null;
    state.traceEvidenceResults ??= [];
    state.forensicResults ??= [];
    state.suspectGrid ??= {
      generated: false, completed: false, eliminatedSuspectIds: [], marksBySuspectId: {}, clueCards: [],
      score: 0, mistakes: 0, hintsUsed: 0, completedAt: null
    };
    return state;
  }
  ensureCaseAssignment() {
    this.gameState.caseCsiAssignments ??= {};
    return this.gameState.caseCsiAssignments[this.getCaseKey()] ??= { identityEvidence: null, traceEvidence: [] };
  }
  isValidIdentityEvidence(evidence) {
    return Boolean(evidence && typeof evidence.id === 'string' && evidence.id && typeof evidence.attribute === 'string' && evidence.attribute && getEvidenceValue(evidence) !== null);
  }
  isValidTraceEvidence(evidence) { return this.isValidIdentityEvidence(evidence) && typeof evidence.label === 'string' && Boolean(evidence.label); }
  isStationCompleted(stationId) {
    const state = this.ensureCaseForensics();
    if (stationId === 'identity') return Boolean(state.identityEvidenceResult);
    const match = /^trace_(\d+)$/.exec(String(stationId || ''));
    return match ? Boolean(state.traceEvidenceResults[Number(match[1])]) : false;
  }
  markCrimeLabCompleted() {
    const key = this.getCaseKey();
    this.gameState.crimeCityProgress ??= {};
    this.gameState.crimeCityProgress[key] ??= {};
    this.gameState.crimeCityProgress[key].crimeLabCompleted = true;
    this.gameState.crimeCityProgress[key].crimeLabCompletedAt = Date.now();
    this.gameState.csiLabCompleted = true;
    saveGameState();
  }
  normalizeEvidenceConfig(evidence = {}, { stationId = null, fallbackLabel = 'Forensic Analysis', fallbackClueType = 'trace' } = {}) {
    const attribute = evidence.attribute || evidence.field || evidence.evidenceType;
    const value = getEvidenceValue(evidence);
    if (!attribute || value === null || value === undefined || value === '') throw new Error('CrimeLabManager: invalid forensic evidence.');
    const result = {
      ...cloneEvidence(evidence), id: evidence.id || `${attribute}_evidence`,
      stationId: stationId ?? evidence.stationId ?? null, attribute, evidenceType: attribute,
      thief_value: value, correctValue: value, source: evidence.source || 'crime_lab',
      label: evidence.label || fallbackLabel, clueType: evidence.clueType || fallbackClueType,
      clueText: evidence.clueText || `Laboratory analysis confirms: ${attribute} = ${value}.`,
      allowedValues: Array.isArray(evidence.allowedValues) ? [...evidence.allowedValues] : [],
      minigame: normalizeMiniGameKey(evidence.minigame, attribute)
    };
    return { ...result, evidence: cloneEvidence(result) };
  }
  ensureIdentityEvidence() {
    const assignment = this.ensureCaseAssignment();
    if (!this.isValidIdentityEvidence(assignment.identityEvidence)) {
      assignment.identityEvidence = this.buildIdentityEvidenceForCase(this.getCaseKey());
      if (!this.isValidIdentityEvidence(assignment.identityEvidence)) throw new Error('CrimeLabManager: cannot generate identity evidence.');
      saveGameState();
    }
    const evidence = cloneEvidence(assignment.identityEvidence);
    evidence.resultUnlocked = Boolean(this.ensureCaseForensics().identityEvidenceResult);
    this.gameState.identityEvidence = cloneEvidence(evidence);
    return evidence;
  }
  getIdentityEvidenceConfig() {
    return this.normalizeEvidenceConfig(this.ensureIdentityEvidence(), { stationId: 'identity', fallbackLabel: 'Identity Evidence Analysis', fallbackClueType: 'identity' });
  }
  buildIdentityEvidenceForCase(caseKey) {
    const suspect = this.getSuspectData();
    const seed = hashString(suspect.id || suspect.name || caseKey);
    const templates = CSI_MAIN_GAME_POOL.map((entry) => {
      let value, allowedValues, clueText;
      switch (entry.evidenceType) {
        case 'hair_color':
          value = getForensicValue(suspect, 'hair_color', null);
          allowedValues = ['Black', 'Brown', 'Blond', 'Red', 'Grey', 'White', 'Auburn'];
          clueText = value ? `Microscopic hair analysis indicates a ${String(value).toLowerCase()} hair strand.` : null;
          break;
        case 'blood_type':
          value = getForensicValue(suspect, 'blood_type', null);
          allowedValues = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
          clueText = value ? `Serological testing confirms a blood type of ${value}.` : null;
          break;
        case 'dna_gender': {
          const biologicalSex = getForensicValue(suspect, 'biological_sex', null);
          value = mapGenderCodeToDnaProfile(biologicalSex || suspect.gender_code || suspect.genderCode || suspect.gender);
          allowedValues = ['XX', 'XY'];
          clueText = value ? `DNA amplification reveals a ${value} profile.` : null;
          break;
        }
        case 'fingerprint_pattern':
          value = String(getForensicValue(suspect, 'fingerprint_pattern', weightedFingerprintPattern(seed))).toUpperCase();
          allowedValues = ['LOOP', 'WHORL', 'ARCH'];
          clueText = `Latent print analysis shows a ${value.toLowerCase()} ridge pattern.`;
          break;
        default: return null;
      }
      if (value === null || value === undefined || value === '') return null;
      return { ...entry, id: `identity_${entry.evidenceType}`, attribute: entry.evidenceType, thief_value: value,
        allowedValues, clueType: 'identity', source: 'crime_lab', clueText, stationId: 'identity' };
    }).filter(Boolean);
    return templates.length ? cloneEvidence(templates[seed % templates.length]) : null;
  }
  ensureRandomTraceEvidence() {
    const assignment = this.ensureCaseAssignment();
    const expected = ['shoeSizeCategory', 'handedness'];
    const valid = Array.isArray(assignment.traceEvidence) && assignment.traceEvidence.length === 2 &&
      assignment.traceEvidence.every((item, index) => this.isValidTraceEvidence(item) && item.attribute === expected[index]);
    if (!valid) {
      const state = this.ensureCaseForensics();
      if (state.traceEvidenceResults.some(Boolean)) throw new Error('CrimeLabManager: old trace assignment with completed results. Start a new case; do not migrate it silently.');
      assignment.traceEvidence = this.buildTraceEvidenceForCase(this.getCaseKey());
      saveGameState();
    }
    const evidence = assignment.traceEvidence.map((item) => cloneEvidence(item));
    this.gameState.traceEvidence = evidence.map((item) => cloneEvidence(item));
    return evidence;
  }
  buildTraceEvidenceForCase() {
    const suspect = this.getSuspectData();
    const shoeSize = String(getForensicValue(suspect, 'shoe_size_category', 'medium')).trim().toLowerCase();
    const handedness = String(getForensicValue(suspect, 'handedness', 'right')).trim().toLowerCase();
    if (!['small', 'medium', 'large'].includes(shoeSize) || !['left', 'right'].includes(handedness)) throw new Error('CrimeLabManager: unsupported shoe size or handedness.');
    return [
      { id: 'trace_shoe_print', label: 'Boot Print Analysis', attribute: 'shoeSizeCategory', thief_value: shoeSize,
        allowedValues: ['small', 'medium', 'large'], minigame: 'ShoeprintScene', stationId: 'trace_0', clueType: 'trace', source: 'crime_lab', isRedHerring: false,
        clueText: `The partial boot print indicates ${shoeSize} footwear.` },
      { id: 'trace_hand_smudge', label: 'Cabinet Handle Smudge', attribute: 'handedness', thief_value: handedness,
        allowedValues: ['left', 'right'], minigame: 'ToolmarkAnalysisScene', stationId: 'trace_1', clueType: 'trace', source: 'crime_lab', isRedHerring: false,
        clueText: `The smudge pattern indicates a ${handedness}-handed person.` }
    ];
  }
  getTraceEvidenceConfig(index) {
    const evidence = this.ensureRandomTraceEvidence()[index];
    if (!evidence) throw new Error(`CrimeLabManager: trace ${index} does not exist.`);
    return this.normalizeEvidenceConfig(evidence, { stationId: `trace_${index}`, fallbackLabel: `Trace Evidence ${index + 1}`, fallbackClueType: 'trace' });
  }
}