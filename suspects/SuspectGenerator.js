import {
  applyHardEvidenceToSuspect, forceSuspectToFailHardEvidence, getDefaultHardEvidenceFromThief,
  normalizeHardEvidence, matchesAllHardEvidence, validateProgressiveForensicCandidates
} from './forensicEvidence.js';
import { createDecoySuspect, createVisibleTraits, ensureUniqueIds, ensureUniqueNames, normalizeForensicAttributes, normalizeGenderCode } from './suspectFactory.js';
import { normalizeCityId, safeClone, shuffle } from './suspectGeneratorUtils.js';
import { prepareCaseSuspectState } from './SuspectCaseState.js';
import { createMaterialProfile } from './MaterialEvidence.js';
import { createDustProfile, getDustProfiles } from './DustEvidence.js';
import { getSuspectFileNotes } from './SuspectFileNotes.js';
import { gameState } from '../GameData.js';
import { currentCampaignCaseIndex } from '../caseSequence.js';

function resetProgress(s) {
  s.deductionState = { eliminated: false, eliminationReasons: [], evidenceMismatches: [], notesUnlocked: [], labStatus: 'pending', hypothesisStatus: 'pending', interviewStatus: 'pending', alibiStatus: 'pending' };
  s.restrictedProfile ??= {}; s.restrictedProfile.unlockedFields = [];
  Object.values(s.restrictedProfile.forensicAttributes || {}).forEach(a => {
    if (a && typeof a === 'object') { a.unlocked = false; delete a.source; delete a.unlockedAt; }
  });
  return s;
}
function refreshTraits(s) {
  s.publicProfile ??= {};
  const prev = getSuspectFileNotes(s).visible.filter(t => !/\bhair\b/i.test(String(t)));
  s.publicProfile.visibleTraits = createVisibleTraits(s.restrictedProfile.forensicAttributes, prev);
}
function buildPlan(total, survivorCount) {
  const n = total - survivorCount;
  if (n < 3) throw new Error('Three forensic stages require at least three eliminations.');
  if (n === 8) return [5, 2, 1];
  const first = Math.min(n - 2, Math.max(1, Math.round(n * .625)));
  const second = Math.max(1, Math.ceil((n - first) / 2));
  return [first, second, n - first - second];
}
function chooseSurvivorCount(total, requested) {
  // Indeks kampanii jest ustalony przed generowaniem podejrzanych.
  if (currentCampaignCaseIndex(gameState) === 0) return 2;
  if (requested != null) {
    if (![2, 3].includes(requested)) throw new Error('forensicCandidateCount must be 2 or 3.');
    if (total - requested < 3) throw new Error('Not enough suspects for the requested candidate count.');
    return requested;
  }
  return total < 6 ? 2 : Math.random() < .5 ? 2 : 3;
}
function validateCandidates(suspects, evidence, expected) {
  const survivors = suspects.filter(s => matchesAllHardEvidence(s, evidence));
  const thieves = survivors.filter(s => s.isRealThief === true && s.hiddenCaseData?.isTrueThief === true);
  const twins = survivors.filter(s => s.isRealThief === false && s.hiddenCaseData?.isForensicTwin === true);
  if (survivors.length !== expected || thieves.length !== 1 || twins.length !== expected - 1) {
    throw new Error(`Expected one thief and ${expected - 1} forensic decoys; got ${survivors.length} candidates.`);
  }
  return { survivors, realThiefCaseSuspect: thieves[0], forensicTwins: twins };
}

export class SuspectGenerator {
  constructor(citySuspectsData = {}) { this.citySuspectsData = citySuspectsData; }
  getCitySuspects(crimeCityId) {
    const city = normalizeCityId(crimeCityId), data = this.citySuspectsData;
    const filter = items => items.filter(s => { const id = normalizeCityId(s.cityId || s.city_id || s.city); return !id || id === city; });
    if (Array.isArray(data)) return filter(data);
    if (Array.isArray(data?.suspects)) return filter(data.suspects);
    if (Array.isArray(data?.cities)) {
      const entry = data.cities.find(e => normalizeCityId(e.id || e.cityId || e.city) === city);
      return Array.isArray(entry?.suspects) ? entry.suspects : [];
    }
    return Array.isArray(data?.[city]) ? data[city] : [];
  }
  generateCaseSuspects(thief, crimeCityId, { total = 10, hardEvidence = [], forensicCandidateCount = null } = {}) {
    if (!thief || typeof thief !== 'object') throw new Error('A real thief profile is required.');
    if (!Number.isInteger(total) || total < 5) throw new Error('Three-stage generation requires at least five suspects.');
    if (!Array.isArray(hardEvidence)) throw new Error('hardEvidence must be an array.');
    const evidence = normalizeHardEvidence(hardEvidence.length ? hardEvidence : getDefaultHardEvidenceFromThief(thief));
    if (evidence.length !== 3 || !['hair_color', 'blood_type', 'biological_sex', 'fingerprint_pattern'].includes(evidence[0].forensicField) ||
        !['shoe_size_category', 'dust_profile'].includes(evidence[1].forensicField) ||
        !['handedness', 'material_profile'].includes(evidence[2].forensicField)) throw new Error('Expected identity, footwear/microtrace, handedness/material.');
    const survivorCount = chooseSurvivorCount(total, forensicCandidateCount);
    const fresh = { preserveCaseProgress: false, preservePersonalProfiles: false };
    const bases = shuffle(this.getCitySuspects(crimeCityId)).slice(0, total - 1).map((source, i) => createDecoySuspect(i, source, fresh));
    while (bases.length < total - 1) bases.push(createDecoySuspect(bases.length, {}, fresh));
    const real = safeClone(bases.shift()); real.isRealThief = true;
    real.restrictedProfile = { unlockedFields: [], forensicAttributes: normalizeForensicAttributes(thief, normalizeGenderCode(thief.gender_code || thief.genderCode || thief.gender)) };
    if (thief.materialProfile) real.materialProfile = safeClone(thief.materialProfile);
    if (thief.dustProfile) real.dustProfile = safeClone(thief.dustProfile);
    real.hiddenIdentity = thief.hiddenIdentity ? safeClone(thief.hiddenIdentity) : { realName: thief.realName || thief.name || null, revealStage: thief.revealStage || 'identity_reveal' };
    real.hiddenCaseData = { isTrueThief: true, realThiefId: thief.id || null, realThiefName: thief.name || null, realThiefProfile: safeClone(thief) };
    applyHardEvidenceToSuspect(real, evidence);
    const twins = Array.from({ length: survivorCount - 1 }, (_, index) => {
      const twin = createDecoySuspect(total + index, {}, fresh);
      twin.isRealThief = false; twin.hiddenIdentity = null;
      twin.hiddenCaseData = { isTrueThief: false, isForensicTwin: true };
      applyHardEvidenceToSuspect(twin, evidence);
      return twin;
    });
    const ordinary = bases.slice(0, total - survivorCount), plan = buildPlan(total, survivorCount);
    ordinary.forEach(s => {
      s.isRealThief = false; s.hiddenIdentity = null;
      s.hiddenCaseData = { isTrueThief: false, isForensicTwin: false };
      applyHardEvidenceToSuspect(s, evidence);
    });
    let cursor = 0;
    plan.forEach((count, stage) => {
      for (let i = 0; i < count; i++) {
        const s = ordinary[cursor++]; forceSuspectToFailHardEvidence(s, [evidence[stage]], 0);
        s.hiddenCaseData.forensicFailureStage = stage;
        s.hiddenCaseData.forensicFailureField = evidence[stage].forensicField;
      }
    });
    const suspects = shuffle([real, ...twins, ...ordinary]);
    ensureUniqueIds(suspects); ensureUniqueNames(suspects);
    const profiles = getDustProfiles();
    suspects.forEach(s => {
      if (!s.materialProfile) s.materialProfile = createMaterialProfile(Math.random() < .5 ? 'natural_leather' : 'wool_lanolin', { compatible: Math.random() < .6 });
      if (!s.dustProfile) s.dustProfile = createDustProfile(profiles[Math.floor(Math.random() * profiles.length)].id, { compatible: Math.random() < .6 });
      refreshTraits(s); resetProgress(s);
    });
    const pacing = validateProgressiveForensicCandidates(suspects, evidence, [total - plan[0], total - plan[0] - plan[1], survivorCount]);
    const valid = validateCandidates(suspects, evidence, survivorCount);
    console.table(pacing);
    return {
      cityId: normalizeCityId(crimeCityId), suspects, citySuspects: suspects,
      realThiefId: valid.realThiefCaseSuspect.id, realThiefSuspectId: valid.realThiefCaseSuspect.id,
      trueThiefCaseSuspectId: valid.realThiefCaseSuspect.id,
      // Pole pojedyncze zostaje dla zgodności ze starszym zapisem.
      forensicTwinSuspectId: valid.forensicTwins[0].id,
      hardEvidence: evidence.map(({ matches, ...e }) => safeClone(e)),
      // Ta lista jest już zapisywana przez SuspectCaseState, bez ponownego losowania po wczytaniu.
      forensicSurvivorIds: valid.survivors.map(s => s.id),
      actualCriminalId: thief.id || null, generatedAt: new Date().toISOString()
    };
  }
  prepareCaseState(data = {}) { return prepareCaseSuspectState(data, { preserveCaseProgress: false }); }
  restoreSavedCaseState(data = {}) { return prepareCaseSuspectState(data, { preserveCaseProgress: true }); }
}
export default SuspectGenerator;
