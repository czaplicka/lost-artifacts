import {
  applyHardEvidenceToSuspect, forceSuspectToFailHardEvidence,
  getDefaultHardEvidenceFromThief, normalizeHardEvidence,
  validateExactlyTwoForensicCandidates, validateProgressiveForensicCandidates
} from './forensicEvidence.js';
import {
  createDecoySuspect, createVisibleTraits, ensureUniqueIds,
  ensureUniqueNames, normalizeForensicAttributes, normalizeGenderCode
} from './suspectFactory.js';
import { normalizeCityId, safeClone, shuffle } from './suspectGeneratorUtils.js';
import { prepareCaseSuspectState } from './SuspectCaseState.js';

function resetProgress(suspect) {
  suspect.deductionState = {
    eliminated: false, eliminationReasons: [], evidenceMismatches: [], notesUnlocked: [],
    labStatus: 'pending', hypothesisStatus: 'pending', interviewStatus: 'pending', alibiStatus: 'pending'
  };
  suspect.restrictedProfile ??= {};
  suspect.restrictedProfile.unlockedFields = [];
  Object.values(suspect.restrictedProfile.forensicAttributes || {}).forEach((attribute) => {
    if (attribute && typeof attribute === 'object') {
      attribute.unlocked = false;
      delete attribute.source;
      delete attribute.unlockedAt;
    }
  });
  return suspect;
}
function refreshTraits(suspect) {
  suspect.publicProfile ??= {};
  const previous = (suspect.publicProfile.visibleTraits || []).filter((trait) => !/\bhair\b/i.test(String(trait)));
  suspect.publicProfile.visibleTraits = createVisibleTraits(suspect.restrictedProfile.forensicAttributes, previous);
}
function buildPlan(total) {
  const decoys = total - 2;
  if (decoys === 8) return [5, 2, 1];
  const first = Math.min(decoys - 2, Math.max(1, Math.round(decoys * 0.625)));
  const second = Math.max(1, Math.ceil((decoys - first) / 2));
  return [first, second, decoys - first - second];
}
export class SuspectGenerator {
  constructor(citySuspectsData = {}) { this.citySuspectsData = citySuspectsData; }
  getCitySuspects(crimeCityId) {
    const cityId = normalizeCityId(crimeCityId);
    const data = this.citySuspectsData;
    const filter = (items) => items.filter((suspect) => {
      const id = normalizeCityId(suspect.cityId || suspect.city_id || suspect.city);
      return !id || id === cityId;
    });
    if (Array.isArray(data)) return filter(data);
    if (Array.isArray(data?.suspects)) return filter(data.suspects);
    if (Array.isArray(data?.cities)) {
      const city = data.cities.find((entry) => normalizeCityId(entry.id || entry.cityId || entry.city) === cityId);
      return Array.isArray(city?.suspects) ? city.suspects : [];
    }
    return Array.isArray(data?.[cityId]) ? data[cityId] : [];
  }
  generateCaseSuspects(thief, crimeCityId, { total = 10, hardEvidence = [] } = {}) {
    if (!thief || typeof thief !== 'object') throw new Error('A real thief profile is required.');
    if (!Number.isInteger(total) || total < 5) throw new Error('Three-stage generation requires at least five suspects.');
    if (!Array.isArray(hardEvidence)) throw new Error('hardEvidence must be an array.');
    // Input order is identity, trace_0, trace_1. Never sort by field name.
    const evidence = normalizeHardEvidence(hardEvidence.length ? hardEvidence : getDefaultHardEvidenceFromThief(thief));
    const mainFields = ['hair_color', 'blood_type', 'biological_sex', 'fingerprint_pattern'];
    if (evidence.length !== 3 || !mainFields.includes(evidence[0].forensicField) ||
        evidence[1].forensicField !== 'shoe_size_category' || evidence[2].forensicField !== 'handedness') {
      throw new Error('Expected main identity evidence, shoe size, then handedness.');
    }
    const sources = shuffle(this.getCitySuspects(crimeCityId));
    const bases = sources.slice(0, total - 1).map((source, index) => createDecoySuspect(index, source, { preserveCaseProgress: false }));
    while (bases.length < total - 1) bases.push(createDecoySuspect(bases.length));
    const trueSuspect = safeClone(bases.shift());
    trueSuspect.isRealThief = true;
    trueSuspect.restrictedProfile = {
      unlockedFields: [],
      forensicAttributes: normalizeForensicAttributes(thief, normalizeGenderCode(thief.gender_code || thief.genderCode || thief.gender))
    };
    trueSuspect.hiddenIdentity = thief.hiddenIdentity ? safeClone(thief.hiddenIdentity) : {
      realName: thief.realName || thief.name || null, revealStage: thief.revealStage || 'identity_reveal'
    };
    trueSuspect.hiddenCaseData = {
      isTrueThief: true, realThiefId: thief.id || null,
      realThiefName: thief.name || null, realThiefProfile: safeClone(thief)
    };
    applyHardEvidenceToSuspect(trueSuspect, evidence);
    const twin = createDecoySuspect(total);
    twin.isRealThief = false;
    twin.hiddenIdentity = null;
    twin.hiddenCaseData = { isTrueThief: false, isForensicTwin: true };
    applyHardEvidenceToSuspect(twin, evidence);
    const ordinary = bases.slice(0, total - 2);
    const plan = buildPlan(total);
    let cursor = 0;
    ordinary.forEach((suspect) => {
      suspect.isRealThief = false;
      suspect.hiddenIdentity = null;
      suspect.hiddenCaseData = { isTrueThief: false, isForensicTwin: false };
      applyHardEvidenceToSuspect(suspect, evidence);
    });
    plan.forEach((count, stage) => {
      for (let i = 0; i < count; i += 1) {
        const suspect = ordinary[cursor++];
        forceSuspectToFailHardEvidence(suspect, [evidence[stage]], 0);
        suspect.hiddenCaseData.forensicFailureStage = stage;
        suspect.hiddenCaseData.forensicFailureField = evidence[stage].forensicField;
      }
    });
    const suspects = shuffle([trueSuspect, twin, ...ordinary]);
    ensureUniqueIds(suspects);
    ensureUniqueNames(suspects);
    suspects.forEach((suspect) => { refreshTraits(suspect); resetProgress(suspect); });
    const expected = [total - plan[0], total - plan[0] - plan[1], 2];
    const pacing = validateProgressiveForensicCandidates(suspects, evidence, expected);
    const validation = validateExactlyTwoForensicCandidates(suspects, evidence);
    console.table(pacing);
    return {
      cityId: normalizeCityId(crimeCityId), suspects, citySuspects: suspects,
      realThiefId: validation.realThiefCaseSuspect.id,
      realThiefSuspectId: validation.realThiefCaseSuspect.id,
      trueThiefCaseSuspectId: validation.realThiefCaseSuspect.id,
      forensicTwinSuspectId: validation.forensicTwin.id,
      // Serializable evidence: do not put comparator functions into save data.
      hardEvidence: evidence.map(({ matches, ...item }) => safeClone(item)),
      forensicSurvivorIds: validation.survivors.map((suspect) => suspect.id),
      actualCriminalId: thief.id || null, generatedAt: new Date().toISOString()
    };
  }
  prepareCaseState(caseData = {}) { return prepareCaseSuspectState(caseData, { preserveCaseProgress: false }); }
  restoreSavedCaseState(caseData = {}) { return prepareCaseSuspectState(caseData, { preserveCaseProgress: true }); }
}
export default SuspectGenerator;