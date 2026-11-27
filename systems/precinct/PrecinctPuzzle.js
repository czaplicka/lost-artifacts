// Precinct case board: a grid of people, some of them criminals.
// The player marks each person as innocent or criminal. Revealing an innocent
// shows their statement (a clue); revealing a criminal shows their offence.
//
// The generator guarantees the board can be solved by deduction alone: from any
// reachable state at least one hidden person is forced by the visible clues.
// (Forced sets only grow as more is revealed, so the order the player picks
// never matters.)
//
// Pure module, no Phaser or DOM: deterministic from (config, seed).

const COLS = 'ABCDEF';

export function createRng(seed) {
  let a = (Number(seed) >>> 0) || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, list) => list[Math.floor(rng() * list.length)];

function shuffle(rng, list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function popcount(n) {
  let c = 0;
  while (n) { n &= n - 1; c++; }
  return c;
}

const bit = i => 1 << i;

export const FIRST_NAMES = [
  'Agnes', 'Basil', 'Cora', 'Desmond', 'Edith', 'Felix', 'Greta', 'Hugo',
  'Ida', 'Jasper', 'Kitty', 'Leon', 'Mabel', 'Nigel', 'Olive', 'Percy',
  'Queenie', 'Rufus', 'Sylvia', 'Theo', 'Ursula', 'Victor', 'Winnie', 'Xavier',
  'Yvonne', 'Zeke', 'Hattie', 'Otto', 'Lottie', 'Bram', 'Dora', 'Ezra',
  'Flora', 'Gus', 'Iris', 'Jonah', 'Lena', 'Monty', 'Nell', 'Oscar',
];

export const OFFENCES = [
  'Fenced a stolen museum brooch.',
  'Forged gallery entry tickets.',
  'Swapped a vase for a replica.',
  'Ran an illegal card game upstairs.',
  'Picked pockets at the tram stop.',
  'Sold "ancient" coins minted last week.',
  'Bribed the night watchman.',
  'Laundered money through a bakery.',
  'Smuggled statuettes in hat boxes.',
  'Stole the mayor\'s pocket watch.',
  'Cooked the auction house books.',
  'Hid stolen maps in a piano.',
];

const ROW_WORD = r => `row ${r + 1}`;
const COL_WORD = c => `column ${COLS[c]}`;
const crim = n => (n === 1 ? 'criminal' : 'criminals');

// ---------------------------------------------------------------------------
// Board geometry

function buildBoard(cfg, rng) {
  const { cols, rows } = cfg;
  const total = cols * rows;
  const blockedCount = Math.min(cfg.blocked || 0, total - cfg.criminals - 2);
  const blocked = new Set(shuffle(rng, [...Array(total).keys()]).slice(0, blockedCount));
  const names = shuffle(rng, FIRST_NAMES);
  const cells = [];
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      cells.push({
        index: i,
        row: r,
        col: c,
        label: `${COLS[c]}${r + 1}`,
        blocked: blocked.has(i),
        name: blocked.has(i) ? null : names[n++ % names.length],
      });
    }
  }
  const open = cells.filter(cell => !cell.blocked).map(cell => cell.index);
  let openMask = 0;
  for (const i of open) openMask |= bit(i);
  const rowMask = [];
  const colMask = [];
  for (let r = 0; r < rows; r++) {
    let m = 0;
    for (let c = 0; c < cols; c++) m |= bit(r * cols + c);
    rowMask.push(m & openMask);
  }
  for (let c = 0; c < cols; c++) {
    let m = 0;
    for (let r = 0; r < rows; r++) m |= bit(r * cols + c);
    colMask.push(m & openMask);
  }
  const at = (r, c) => (r >= 0 && r < rows && c >= 0 && c < cols ? cells[r * cols + c] : null);
  const neighbourMask = cells.map(cell => {
    let m = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const o = at(cell.row + dr, cell.col + dc);
        if (o && !o.blocked) m |= bit(o.index);
      }
    }
    return m;
  });
  let cornerMask = 0;
  for (const [r, c] of [[0, 0], [0, cols - 1], [rows - 1, 0], [rows - 1, cols - 1]]) {
    const o = at(r, c);
    if (o && !o.blocked) cornerMask |= bit(o.index);
  }
  return { cols, rows, cells, open, openMask, rowMask, colMask, neighbourMask, cornerMask, at };
}

function allSubsets(open, k) {
  const out = [];
  const walk = (start, left, mask) => {
    if (!left) { out.push(mask); return; }
    for (let i = start; i <= open.length - left; i++) walk(i + 1, left - 1, mask | bit(open[i]));
  };
  walk(0, k, 0);
  return out;
}

// ---------------------------------------------------------------------------
// Clues. Each clue: { type, text, refs (mask of cells it talks about), spec }
// spec is plain data so it survives saves and drives both generator and solver:
//   { k: 'count', m, n }      exactly n criminals among mask m
//   { k: 'exact', m, want }   cells of m are criminal exactly where want has bits
//   { k: 'cmp', a, b, rel }   popcount(a) vs popcount(b): 'eq' or 'gt' (a > b)

export function specTest(spec) {
  if (spec.k === 'count') return x => popcount(x & spec.m) === spec.n;
  if (spec.k === 'exact') return x => (x & spec.m) === spec.want;
  if (spec.k === 'cmp') {
    return spec.rel === 'eq'
      ? x => popcount(x & spec.a) === popcount(x & spec.b)
      : x => popcount(x & spec.a) > popcount(x & spec.b);
  }
  return () => true;
}

const DIRS = [
  ['above', -1, 0, 'directly above me'],
  ['below', 1, 0, 'directly below me'],
  ['left', 0, -1, 'directly to my left'],
  ['right', 0, 1, 'directly to my right'],
];

function clueCandidates(board, cell, truth, types, rng) {
  const out = [];
  const name = i => board.cells[i].name;
  const isBad = i => Boolean(truth & bit(i));
  const add = (type, text, refs, spec) => out.push({ type, text, refs, spec, test: specTest(spec) });
  const count = (m, n) => ({ k: 'count', m, n });
  const exact = (m, want) => ({ k: 'exact', m, want });

  if (types.has('row')) {
    for (let r = 0; r < board.rows; r++) {
      const m = board.rowMask[r];
      if (!m) continue;
      const n = popcount(truth & m);
      const text = n === 0
        ? `Nobody in ${ROW_WORD(r)} is a criminal.`
        : `There ${n === 1 ? 'is exactly 1 criminal' : `are exactly ${n} criminals`} in ${ROW_WORD(r)}.`;
      add('row', text, m, count(m, n));
    }
  }
  if (types.has('col')) {
    for (let c = 0; c < board.cols; c++) {
      const m = board.colMask[c];
      if (!m) continue;
      const n = popcount(truth & m);
      const text = n === 0
        ? `${COL_WORD(c)[0].toUpperCase()}${COL_WORD(c).slice(1)} is clean. No criminals there.`
        : `I saw ${n} ${n === 1 ? 'person' : 'people'} from ${COL_WORD(c)} up to no good.`;
      add('col', text, m, count(m, n));
    }
  }
  if (types.has('direction')) {
    for (const [, dr, dc, words] of DIRS) {
      const o = board.at(cell.row + dr, cell.col + dc);
      if (!o || o.blocked) continue;
      const bad = isBad(o.index);
      const b = bit(o.index);
      add('direction', `The person ${words} is ${bad ? 'a criminal' : 'innocent'}.`, b,
        exact(b, bad ? b : 0));
    }
  }
  if (types.has('neighbours')) {
    const m = board.neighbourMask[cell.index];
    if (m) {
      const n = popcount(truth & m);
      const text = n === 0
        ? 'Nobody around me is a criminal (diagonals too).'
        : `${n} of the people around me ${n === 1 ? 'is a criminal' : 'are criminals'} (diagonals too).`;
      add('neighbours', text, m, count(m, n));
    }
  }
  const others = board.open.filter(i => i !== cell.index);
  if (types.has('direct')) {
    for (const i of others) {
      const bad = isBad(i);
      const b = bit(i);
      add('direct', bad ? `${name(i)} is a criminal. I'd swear to it.` : `${name(i)} is innocent. I'd vouch for them.`, b,
        exact(b, bad ? b : 0));
    }
  }
  if (types.has('pair')) {
    for (let k = 0; k < 6; k++) {
      const [a, b] = shuffle(rng, others).slice(0, 2);
      if (a === undefined || b === undefined) break;
      const m = bit(a) | bit(b);
      const n = popcount(truth & m);
      if (n === 0) add('pair', `${name(a)} and ${name(b)} did nothing wrong.`, m, exact(m, 0));
      else if (n === 2) add('pair', `${name(a)} and ${name(b)} are both crooks.`, m, exact(m, m));
      else add('pair', `Exactly one of ${name(a)} and ${name(b)} is a criminal.`, m, count(m, 1));
    }
  }
  if (types.has('compare')) {
    for (let k = 0; k < 4; k++) {
      const useRows = rng() < 0.5;
      const masks = useRows ? board.rowMask : board.colMask;
      const word = useRows ? ROW_WORD : COL_WORD;
      const [p, q] = shuffle(rng, [...masks.keys()].filter(i => masks[i])).slice(0, 2);
      if (p === undefined || q === undefined) break;
      const np = popcount(truth & masks[p]);
      const nq = popcount(truth & masks[q]);
      const mp = masks[p];
      const mq = masks[q];
      if (np === nq) {
        add('compare', `${word(p)} and ${word(q)} hide the same number of criminals.`.replace(/^./, s => s.toUpperCase()),
          mp | mq, { k: 'cmp', a: mp, b: mq, rel: 'eq' });
      } else {
        const [hi, lo, mh, ml] = np > nq ? [p, q, mp, mq] : [q, p, mq, mp];
        add('compare', `There are more criminals in ${word(hi)} than in ${word(lo)}.`,
          mh | ml, { k: 'cmp', a: mh, b: ml, rel: 'gt' });
      }
    }
  }
  if (types.has('corners') && board.cornerMask) {
    const m = board.cornerMask;
    const n = popcount(truth & m);
    add('corners', `${n === 0 ? 'None' : n} of the corner seats ${n === 1 ? 'is' : 'are'} taken by ${crim(n === 0 ? 2 : n)}.`,
      m, count(m, n));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Knowledge helpers

export function forcedCells(masks, openMask) {
  if (!masks.length) return { bad: 0, good: 0 };
  let and = -1;
  let or = 0;
  for (const m of masks) { and &= m; or |= m; }
  return { bad: and & openMask, good: ~or & openMask };
}

function filterMasks(masks, test) {
  const out = [];
  for (const m of masks) if (test(m)) out.push(m);
  return out;
}

// ---------------------------------------------------------------------------
// Generator

/**
 * @param {{cols:number, rows:number, criminals:number, blocked?:number,
 *   clueTypes:string[], preferTight?:number}} cfg
 * @param {number} seed
 */
export function generatePuzzle(cfg, seed) {
  const rng = createRng(seed);
  const board = buildBoard(cfg, rng);
  const types = new Set(cfg.clueTypes);
  const fallbackTypes = new Set(['direct']);
  const allMasks = allSubsets(board.open, cfg.criminals);
  const truth = pick(rng, allMasks);
  const offences = shuffle(rng, OFFENCES);
  const clues = new Array(board.cells.length).fill(null);

  let masks = allMasks;
  let revealed = 0;
  const order = [];

  const innocents = board.open.filter(i => !(truth & bit(i)));
  const start = pick(rng, innocents);

  const reveal = index => {
    revealed |= bit(index);
    order.push(index);
    const bad = Boolean(truth & bit(index));
    masks = filterMasks(masks, x => Boolean(x & bit(index)) === bad);
    if (bad) return;

    // The case keeps moving while some hidden innocent is deducible (their
    // statement will add information) or everything left is already decided.
    const progress = list => {
      const f = forcedCells(list, board.openMask);
      const hidden = board.openMask & ~revealed;
      const forced = (f.bad | f.good) & hidden;
      return { ok: (f.good & hidden) !== 0 || forced === hidden, forced: popcount(forced) };
    };
    const before = progress(masks);

    const cell = board.cells[index];
    const scored = [];
    for (const typeSet of [types, fallbackTypes]) {
      for (const clue of clueCandidates(board, cell, truth, typeSet, rng)) {
        const next = filterMasks(masks, clue.test);
        const after = progress(next);
        scored.push({ clue, next, ok: after.ok, gained: after.forced - before.forced, cut: masks.length - next.length });
      }
      if (scored.some(s => s.ok)) break;
    }
    const tight = cfg.preferTight ?? 0.6;
    let pool = scored.filter(s => s.ok && (before.ok ? s.cut > 0 : s.gained > 0));
    if (!pool.length) pool = scored.filter(s => s.ok);
    if (!pool.length) throw new Error('Precinct generator found no usable clue');
    // Prefer clues that move the case on a little, not ones that crack it open.
    pool.sort((x, y) => (x.gained - y.gained) || (y.cut - x.cut));
    const top = pool.slice(0, Math.max(1, Math.ceil(pool.length * (1 - tight))));
    const chosen = pick(rng, top);
    clues[index] = { type: chosen.clue.type, text: chosen.clue.text, refs: chosen.clue.refs, spec: chosen.clue.spec };
    masks = chosen.next;
  };

  reveal(start);
  while ((revealed & board.openMask) !== board.openMask) {
    const f = forcedCells(masks, board.openMask);
    const pending = board.open.filter(i => ((f.bad | f.good) & bit(i)) && !(revealed & bit(i)));
    if (!pending.length) throw new Error('Precinct generator stalled');
    reveal(pick(rng, pending));
  }

  let ci = 0;
  return {
    seed,
    cols: board.cols,
    rows: board.rows,
    criminals: cfg.criminals,
    start,
    solutionOrder: order,
    cells: board.cells.map(cell => ({
      index: cell.index,
      label: cell.label,
      row: cell.row,
      col: cell.col,
      blocked: cell.blocked,
      name: cell.name,
      criminal: !cell.blocked && Boolean(truth & bit(cell.index)),
      clue: clues[cell.index],
      offence: !cell.blocked && (truth & bit(cell.index)) ? offences[ci++ % offences.length] : null,
    })),
  };
}

// ---------------------------------------------------------------------------
// Runtime solver used for hints and "cleared" marks in the UI.

export function createSolver(puzzle) {
  const open = puzzle.cells.filter(c => !c.blocked).map(c => c.index);
  let openMask = 0;
  for (const i of open) openMask |= bit(i);
  const all = allSubsets(open, puzzle.criminals);
  return {
    // known: iterable of [index, isCriminal] for revealed cells
    forced(known) {
      let masks = all;
      for (const [i, bad] of known) {
        masks = filterMasks(masks, x => Boolean(x & bit(i)) === bad);
        const clue = puzzle.cells[i].clue;
        if (!bad && clue?.spec) masks = filterMasks(masks, specTest(clue.spec));
      }
      return forcedCells(masks, openMask);
    },
  };
}

export const PRECINCT_CELL_BIT = bit;
