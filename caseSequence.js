export const CASE_SEQUENCE_VERSION = 1;
const clone = value => JSON.parse(JSON.stringify(value));
function validIndex(index) { return Number.isSafeInteger(index) && index >= 0; }
export function nextCampaignCaseIndex(state = {}) {
  const sequence = state.caseSequence;
  if (sequence != null) {
    if (sequence.version !== CASE_SEQUENCE_VERSION || !validIndex(sequence.index) || sequence.index >= Number.MAX_SAFE_INTEGER) {
      throw new Error('[CaseSequence] Invalid saved campaign sequence.');
    }
    return sequence.index + 1;
  }
  // Old caseTemplate.caseIndex described rank, not the actual campaign sequence.
  const ids = Array.isArray(state.completedCaseIds) ? state.completedCaseIds : [];
  const count = new Set(ids.filter(id => (typeof id === 'string' && id.trim()) ||
    (typeof id === 'number' && Number.isFinite(id))).map(String)).size;
  if (count > 0) return count;
  if (state.casesSolved == null) return 0;
  if (!validIndex(state.casesSolved)) throw new Error('[CaseSequence] Invalid legacy completed-case count.');
  return state.casesSolved;
}
export function prepareCaseSequence(caseIndex, modifiersPool, schedule) {
  if (!validIndex(caseIndex) || !modifiersPool || !schedule) throw new Error('[CaseSequence] Invalid setup data.');
  const pool = clone(modifiersPool);
  if (!Array.isArray(pool.apartment) || !Array.isArray(pool.lab)) throw new Error('[CaseSequence] Missing apartment or lab pool.');
  // Only the first investigation guarantees the artefact in the apartment.
  if (caseIndex > 0) pool.apartment = pool.apartment.filter(m => m.effect?.artifactState === 'carried_away');
  // CrimeLabScene currently has three stations, not four.
  pool.lab = pool.lab.filter(m => Number.isInteger(m.effect?.gameCount) && m.effect.gameCount >= 0 && m.effect.gameCount <= 3);
  if (!pool.apartment.length || !pool.lab.length) throw new Error('[CaseSequence] No supported apartment or lab variants.');
  const forcedStages = clone(schedule[String(caseIndex)] || {});
  if (caseIndex === 0) forcedStages.apartment = 'empty_clues';
  for (const [stage, id] of Object.entries(forcedStages)) {
    if (!Array.isArray(pool[stage]) || !pool[stage].some(m => m.id === id)) {
      throw new Error(`[CaseSequence] Unknown forced modifier: ${stage}/${id}.`);
    }
  }
  return { pool, forcedStages };
}
export function makeMissionOnboarding(template) {
  if (!template?.stages) throw new Error('[CaseSequence] Missing case template.');
  const onboarding = Object.fromEntries(Object.entries(template.stages).map(([stage, effect]) => [stage, effect.modifierId]));
  const modes = ['call_only', 'single_game', 'two_games', 'three_games'];
  const count = template.stages.lab?.gameCount;
  if (!Number.isInteger(count) || count < 0 || count > 3) throw new Error('[CaseSequence] Unsupported laboratory station count.');
  onboarding.lab = modes[count];
  return onboarding;
}
