import { CHASE_CONFIG as C } from '../config/chaseConfig.js';
export function successChance(difficulty, option) {
  const chances = C.difficulty[difficulty] || C.difficulty.field;
  return Math.max(0.05, Math.min(0.98, chances[option.type] + (option.bonus || 0)));
}
export function resolveMove(distance, difficulty, option, roll) {
  if (!option) return { distance: Math.min(C.escapeDistance, distance + C.timeoutPenalty), success: false, delta: C.timeoutPenalty };
  const move = C.moves[option.type];
  const success = roll < successChance(difficulty, option);
  const delta = success ? -move.gain : move.loss;
  return { distance: Math.max(0, Math.min(C.escapeDistance, distance + delta)), success, delta };
}
export function finalChance(distance, difficulty) {
  const modifier = { rookie: 0.15, field: 0, master: -0.15 }[difficulty] || 0;
  return Math.max(0.05, Math.min(0.95, 1 - distance / C.escapeDistance + modifier));
}
export function seededRandom(seed) {
  let n = seed >>> 0;
  return () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function makePlan(events, seed) {
  const random = seededRandom(seed);
  const shuffled = [...events];
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  return { rounds: shuffled.slice(0, C.maxRounds).map(event => ({ event, flip: random() < 0.5, rolls: [random(), random()] })), finalRoll: random() };
}
export function validChase(record, caseId, createdAt) {
  return Boolean(record && record.version === C.version && String(record.caseId) === String(caseId)
    && record.campaignId === createdAt && record.suspectId != null && record.plan?.rounds?.length === C.maxRounds
    && Number.isFinite(record.distance) && record.distance >= 0 && record.distance <= C.escapeDistance
    && Number.isInteger(record.round) && record.round >= 0 && record.round <= C.maxRounds
    && Number.isFinite(record.remaining) && record.remaining >= 0 && record.remaining <= C.decisionMs
    && ['intro','choice','result','final','caught','escaped','review','settled'].includes(record.phase)
    && record.plan.rounds.every(r => r.event?.options?.length === 2 && r.rolls?.length === 2
      && r.rolls.every(n => Number.isFinite(n) && n >= 0 && n < 1)
      && r.event.options.every(o => Object.hasOwn(C.moves, o.type)))
    && Number.isFinite(record.plan.finalRoll) && record.plan.finalRoll >= 0 && record.plan.finalRoll < 1);
}
export function makeChase({ caseId, campaignId, suspectId, difficulty, seed, events }) {
  if (caseId == null || campaignId == null || suspectId == null) throw new Error('Chase requires stable case, campaign and suspect IDs.');
  return { version: C.version, caseId, campaignId, suspectId,
    difficulty: Object.hasOwn(C.difficulty, difficulty) ? difficulty : 'field',
    seed, plan: makePlan(events, seed), phase: 'intro', distance: C.startDistance,
    round: 0, remaining: C.decisionMs, resultText: '', terminalScene: null };
}
export function applyChoice(record, index) {
  if (record.phase !== 'choice') return false;
  if (index !== null && index !== 0 && index !== 1) return false;
  const current = record.plan.rounds[record.round];
  const options = current.flip ? [...current.event.options].reverse() : current.event.options;
  const option = index === null ? null : options[index];
  const before = record.distance;
  const result = resolveMove(before, record.difficulty, option, index === null ? 1 : current.rolls[index]);
  record.distance = result.distance;
  record.round++;
  record.remaining = 0;
  const text = !option ? 'You consider your options. The suspect does not.'
    : result.success ? option.success : option.failure;
  record.resultText = `${text}\nDISTANCE: ${before} m -> ${record.distance} m`;
  record.phase = record.distance <= 0 ? 'caught' : record.distance >= C.escapeDistance ? 'escaped' : 'result';
  return true;
}
export function advanceRound(record) {
  if (!['intro','result'].includes(record.phase)) return false;
  record.phase = record.distance <= 0 ? 'caught' : record.distance >= C.escapeDistance ? 'escaped'
    : record.round >= C.maxRounds ? 'final' : 'choice';
  if (record.phase === 'choice') record.remaining = C.decisionMs;
  return true;
}
export function applyFinal(record) {
  if (record.phase !== 'final') return false;
  const caught = record.plan.finalRoll < finalChance(record.distance, record.difficulty);
  record.phase = caught ? 'caught' : 'escaped';
  if (caught) record.distance = 0;
  return true;
}
