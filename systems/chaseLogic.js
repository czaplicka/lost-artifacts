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
