import { ReconstructionGenerator } from '../../ReconstructionGenerator.js';
import { getMissionCaseKey } from '../../crimeCaseKey.js';

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function identity(value) {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}
function uniqueIds(values, count) {
  return Array.isArray(values) && values.length === count &&
    values.every(value => typeof value === 'string' && value.trim()) && new Set(values).size === count;
}
function matchesWhenTagged(saved, expected) {
  if (saved == null || expected == null) return true;
  const a = identity(saved), b = identity(expected);
  return a !== null && b !== null && a === b;
}
function validReconstruction(saved, expected) {
  if (!record(saved) || !uniqueIds(saved.foundCardIds, 6) || !Array.isArray(saved.claims) || saved.claims.length !== 3) return false;
  if (!matchesWhenTagged(saved.missionId, expected.missionId) || !matchesWhenTagged(saved.sceneId, expected.sceneId) ||
    !matchesWhenTagged(saved.thiefId, expected.thiefId)) return false;
  const found = new Set(saved.foundCardIds);
  const solutions = saved.claims.map(claim => claim?.solutionItemId);
  const questionIds = saved.claims.map(claim => claim?.questionId ?? claim?.id);
  if (!uniqueIds(solutions, 3) || !uniqueIds(questionIds, 3) || !solutions.every(id => found.has(id))) return false;
  if (saved.solutionCardIds != null && (!uniqueIds(saved.solutionCardIds, 3) || !saved.solutionCardIds.every(id => solutions.includes(id)))) return false;
  for (const field of ['foundCards', 'allCards']) {
    if (saved[field] == null) continue;
    if (!Array.isArray(saved[field]) || !uniqueIds(saved[field].map(card => card?.id), 6) ||
      !saved[field].every(card => found.has(card.id))) return false;
  }
  return true;
}

export class CrimeCityReconstructionService {
  constructor({ cache, gameState, cityId, getCaseKey } = {}) {
    this.cache = cache || null;
    this.gameState = gameState || {};
    this.cityId = cityId || null;
    this.getCaseKey = typeof getCaseKey === 'function' ? getCaseKey : () => getMissionCaseKey(this.gameState, this.cityId);
  }

  getReconstructionData() {
    const rawObjectsData = this.cache?.json?.get('objects-data');
    const rawQuestionsData = this.cache?.json?.get('reconstruction_questions');
    const items = Array.isArray(rawObjectsData) ? rawObjectsData : rawObjectsData?.objects || rawObjectsData?.items || rawObjectsData?.hiddenObjects || [];
    const questions = Array.isArray(rawQuestionsData) ? rawQuestionsData : rawQuestionsData?.reconstructionQuestions || rawQuestionsData?.questions || [];
    if (!Array.isArray(items) || !items.length) {
      console.error('[CrimeCityReconstructionService] Reconstruction objects data is missing or invalid.'); return null;
    }
    if (!Array.isArray(questions) || !questions.length) {
      console.error('[CrimeCityReconstructionService] Reconstruction questions data is missing or invalid.'); return null;
    }
    return { items, questions };
  }

  prepareReconstruction() {
    try {
      const caseKey = identity(this.getCaseKey());
      if (caseKey === null || ['default_case', 'unknown_mission', '__proto__', 'constructor', 'prototype'].includes(caseKey)) {
        throw new Error('A stable reconstruction case key is required.');
      }
      const mission = this.gameState.currentMission;
      if (!identity(mission?.scene)) throw new Error('The mission scene is missing.');
      const actualThief = this.resolveActualThief();
      const expected = {
        missionId: mission.id || caseKey, sceneId: mission.scene,
        thiefId: actualThief?.id ?? this.gameState.currentThiefId ?? mission.actualThiefId ?? mission.thiefId ?? this.gameState.actualThiefId
      };
      const stored = this.gameState.reconstructedHeists;
      if (stored != null && !record(stored)) throw new Error('The saved reconstruction collection is invalid. It was not replaced.');
      const existing = stored && own(stored, caseKey) ? stored[caseKey] : null;
      if (existing != null) {
        if (!validReconstruction(existing, expected)) {
          throw new Error('The saved reconstruction is inconsistent. It was not rerolled or overwritten.');
        }
        this.gameState.reconstructedHeist = existing;
        return existing;
      }
      if (!identity(actualThief?.id)) throw new Error('The actual thief is missing.');
      const thiefSkills = this.normalizeThiefSkills(actualThief.skills);
      if (thiefSkills.length < 3) throw new Error('The thief needs at least three distinct skills.');
      const data = this.getReconstructionData();
      if (!data) return null;
      const generated = ReconstructionGenerator.generate({
        items: data.items, questions: data.questions,
        missionId: expected.missionId, cityId: mission.cityId || mission.city || this.cityId,
        sceneId: mission.scene, thiefId: actualThief.id, thiefSkills, cardCount: 6, claimCount: 3
      });
      if (!validReconstruction(generated, expected)) throw new Error('ReconstructionGenerator returned an inconsistent evidence set.');
      // Install only a fully validated set. A failed attempt does not create an empty slot.
      this.gameState.reconstructedHeists = { ...(stored || {}), [caseKey]: generated };
      this.gameState.reconstructedHeist = generated;
      return generated;
    } catch (error) {
      console.error('[CrimeCityReconstructionService] Could not prepare reconstruction:', error);
      return null;
    }
  }

  resolveActualThief() {
    const mission = this.gameState.currentMission || {};
    if (this.gameState.currentThief?.id) return this.gameState.currentThief;
    if (mission.actualThief?.id) return mission.actualThief;
    const actualThiefId = this.gameState.currentThiefId || mission.actualThiefId || mission.thiefId || this.gameState.actualThiefId;
    const pools = [mission.suspectPool, this.gameState.suspectPool, this.gameState.currentSuspectPool, this.gameState.thieves, this.gameState.caseSuspects];
    for (const pool of pools) {
      if (!Array.isArray(pool)) continue;
      const thief = pool.find(suspect => suspect?.id === actualThiefId);
      if (thief) return thief;
    }
    return null;
  }

  normalizeThiefSkills(skills) { return ReconstructionGenerator.uniqueStrings(skills); }
}
