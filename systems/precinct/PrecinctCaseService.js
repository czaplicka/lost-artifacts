// Precinct case chain: progression, ranks, rewards and the saved board state
// for the detective sergeant's "line-up" cases behind the police staff door.

import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { moneyManager, ECONOMY_CATEGORY } from '../../managers/MoneyManager.js';
import { applyHomeTownTrustChoice, getHomeTownTrust } from '../../managers/HomeTownTrust.js';
import { generatePuzzle } from './PrecinctPuzzle.js';

export const PRECINCT_NPC_ID = 'pi_precinct_sergeant';
export const PRECINCT_MAX_MISTAKES = 3;
export const PRECINCT_FREE_HINTS = 1;
export const PRECINCT_HINT_PRICE = 10;

// Case difficulty grows along the chain; the last tier repeats forever.
const TIERS = [
  { from: 1, cols: 3, rows: 3, criminals: 2, blocked: 0, pay: 15,
    clueTypes: ['row', 'col', 'direction', 'direct'], preferTight: 0.5 },
  { from: 3, cols: 3, rows: 4, criminals: 3, blocked: 1, pay: 25,
    clueTypes: ['row', 'col', 'direction', 'pair'], preferTight: 0.55 },
  { from: 6, cols: 4, rows: 4, criminals: 4, blocked: 1, pay: 35,
    clueTypes: ['row', 'col', 'direction', 'pair', 'neighbours'], preferTight: 0.6 },
  { from: 10, cols: 4, rows: 5, criminals: 5, blocked: 2, pay: 50,
    clueTypes: ['row', 'col', 'direction', 'pair', 'neighbours', 'compare', 'corners'], preferTight: 0.65 },
  { from: 15, cols: 4, rows: 5, criminals: 6, blocked: 1, pay: 70,
    clueTypes: ['row', 'col', 'direction', 'pair', 'neighbours', 'compare', 'corners'], preferTight: 0.75 },
];

export const PRECINCT_RANKS = [
  { id: 'probationer', title: 'Probationer', at: 0 },
  { id: 'constable', title: 'Constable', at: 2 },
  { id: 'sergeant', title: 'Sergeant', at: 5 },
  { id: 'detective', title: 'Detective', at: 9 },
  { id: 'inspector', title: 'Inspector', at: 14 },
  { id: 'chief_inspector', title: 'Chief Inspector', at: 20 },
];

// Short briefings so each case in the chain reads like a job, not a level.
const BRIEFINGS = [
  'Pickpocketing at the tram stop. Nine regulars, two of them light-fingered.',
  'A brooch went missing at the jeweller\'s. The usual suspects are in the waiting room.',
  'Forged tickets at the city gallery. The ushers all blame each other.',
  'Someone swapped a museum vase for a replica. Half the night shift was in on it.',
  'Card game raid on Mill Street. The players have plenty to say about each other.',
  'Fake coins at the flea market. The stallholders are pointing fingers.',
  'The auction house books do not add up. The clerks know more than they say.',
  'Statuettes smuggled out in hat boxes. The milliner\'s staff are waiting.',
  'The mayor\'s pocket watch walked off at the gala. Every guest has a theory.',
  'A ring of fences is working the docks. We pulled in the whole shift.',
];

const clampInt = (v, min = 0) => (Number.isInteger(v) && v >= min ? v : min);

function getState() {
  let s = gameState.precinctCases;
  if (!s || typeof s !== 'object' || Array.isArray(s)) {
    s = gameState.precinctCases = { version: 1, solved: 0, perfect: 0, active: null };
  }
  s.solved = clampInt(s.solved);
  s.perfect = clampInt(s.perfect);
  if (s.active && (typeof s.active !== 'object' || !Number.isInteger(s.active.seed))) s.active = null;
  return s;
}

export function getPrecinctTier(caseNumber) {
  let tier = TIERS[0];
  let index = 0;
  TIERS.forEach((t, i) => { if (caseNumber >= t.from) { tier = t; index = i; } });
  return { ...tier, index };
}

export function getPrecinctRank(solved = getState().solved) {
  let rank = PRECINCT_RANKS[0];
  for (const r of PRECINCT_RANKS) if (solved >= r.at) rank = r;
  const next = PRECINCT_RANKS.find(r => r.at > solved) || null;
  return { ...rank, next, solved };
}

export function getPrecinctSummary() {
  const s = getState();
  const caseNumber = s.solved + 1;
  const tier = getPrecinctTier(caseNumber);
  return {
    solved: s.solved,
    perfect: s.perfect,
    caseNumber,
    rank: getPrecinctRank(s.solved),
    briefing: BRIEFINGS[(caseNumber - 1) % BRIEFINGS.length],
    pay: tier.pay,
    size: `${tier.cols}×${tier.rows}`,
    criminals: tier.criminals,
    hasActive: Boolean(s.active && s.active.caseNumber === caseNumber),
    trust: getHomeTownTrust(PRECINCT_NPC_ID),
  };
}

function newSeed() {
  return Math.floor(Math.random() * 0x7fffffff) || 1;
}

/** Returns the current board (resuming a saved one) and its saved progress. */
export function openPrecinctCase() {
  const s = getState();
  const caseNumber = s.solved + 1;
  if (!s.active || s.active.caseNumber !== caseNumber) {
    s.active = { caseNumber, seed: newSeed(), known: [], mistakes: 0, hintsUsed: 0 };
  }
  const tier = getPrecinctTier(caseNumber);
  let puzzle;
  try {
    puzzle = generatePuzzle(tier, s.active.seed);
  } catch (error) {
    // Should not happen (stress-tested), but never leave the player stuck.
    console.error('[Precinct] Board generation failed, reseeding:', error);
    s.active = { caseNumber, seed: newSeed(), known: [], mistakes: 0, hintsUsed: 0 };
    puzzle = generatePuzzle(tier, s.active.seed);
  }
  const known = new Map([[puzzle.start, false]]);
  for (const entry of Array.isArray(s.active.known) ? s.active.known : []) {
    const [i, bad] = entry || [];
    const cell = puzzle.cells[i];
    if (cell && !cell.blocked && cell.criminal === bad) known.set(i, bad);
  }
  requestAutosave();
  return {
    caseNumber,
    tier,
    puzzle,
    known,
    mistakes: clampInt(s.active.mistakes),
    hintsUsed: clampInt(s.active.hintsUsed),
    briefing: BRIEFINGS[(caseNumber - 1) % BRIEFINGS.length],
  };
}

export function savePrecinctProgress({ caseNumber, known, mistakes, hintsUsed }) {
  const s = getState();
  if (!s.active || s.active.caseNumber !== caseNumber) return;
  s.active.known = [...known].map(([i, bad]) => [i, Boolean(bad)]);
  s.active.mistakes = clampInt(mistakes);
  s.active.hintsUsed = clampInt(hintsUsed);
  requestAutosave();
}

/** Case failed (too many mistakes): same case number, fresh line-up next time. */
export function failPrecinctCase(caseNumber) {
  const s = getState();
  if (s.active?.caseNumber === caseNumber) s.active = null;
  requestAutosave();
}

/** Pays an extra hint. Returns { ok, message }. */
export function buyPrecinctHint() {
  if (!moneyManager.canAfford(PRECINCT_HINT_PRICE)) {
    return { ok: false, message: `A tip-off costs $${PRECINCT_HINT_PRICE}. You are short.` };
  }
  try {
    moneyManager.spend(PRECINCT_HINT_PRICE, {
      category: ECONOMY_CATEGORY.INFORMANT,
      description: 'Precinct tip-off',
      metadata: { precinctHint: true },
    });
    return { ok: true };
  } catch (error) {
    console.error('[Precinct] Hint payment failed:', error);
    return { ok: false, message: 'The tip-off could not be paid for.' };
  }
}

/** Case solved: pay, raise trust, advance the chain. */
export function completePrecinctCase({ caseNumber, mistakes }) {
  const s = getState();
  if (caseNumber !== s.solved + 1) return null;
  const tier = getPrecinctTier(caseNumber);
  const perfect = mistakes === 0;
  const rankBefore = getPrecinctRank(s.solved);
  const pay = perfect ? Math.round(tier.pay * 1.5) : tier.pay;

  let paid = 0;
  try {
    moneyManager.addCash(pay, {
      category: ECONOMY_CATEGORY.MISSION_REWARD,
      description: `Precinct case #${caseNumber}`,
      metadata: { precinctCase: caseNumber, perfect },
    });
    paid = pay;
  } catch (error) {
    console.error('[Precinct] Payment failed:', error);
  }

  const trust = applyHomeTownTrustChoice({
    npcId: PRECINCT_NPC_ID,
    choiceId: `precinct_case_${caseNumber}`,
    trustDelta: perfect ? 3 : 2,
  });

  s.solved += 1;
  if (perfect) s.perfect += 1;
  s.active = null;

  const rankAfter = getPrecinctRank(s.solved);
  let promotion = null;
  if (rankAfter.id !== rankBefore.id) {
    promotion = rankAfter;
    applyHomeTownTrustChoice({
      npcId: PRECINCT_NPC_ID,
      choiceId: `precinct_rank_${rankAfter.id}`,
      trustDelta: 3,
    });
  }
  requestAutosave();
  return { paid, perfect, trustDelta: trust?.delta ?? 0, promotion, rank: rankAfter };
}
