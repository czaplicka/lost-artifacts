// Transactional dialogue restore on save-load.
// Runs the real DialogueManager / TrustManager / HomeTownTrust / HomeTownDialogue /
// saveRestore code in a temp copy (package type "module") with a fake gameState,
// fake storage, fake Phaser scene and a stubbed DialoguePanel base class.
//   node tests/dialogue-restore-transaction.mjs
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'dialogue-restore-test-'));

const realFiles = [
  'managers/DialogueManager.js', 'managers/TrustManager.js', 'managers/HomeTownTrust.js',
  'gameState/saveRestore.js', 'gameState/restoreParticipants.js', 'ui/HomeTownDialogue.js'
];

const stubs = {
  'package.json': '{"type":"module"}',
  // Fake gameState: plain data, cloned on write like GameStateManager.updateState.
  'GameData.js': String.raw`
const clone = v => structuredClone(v);
export const gameState = {
  state: { dialogueState: null }, dirty: false, saveCheckpoint: null, caseDirector: null, isGameActive: true,
  get dialogueState() { return this.state.dialogueState; },
  updateState(u) { for (const [k, v] of Object.entries(u)) this.state[k] = clone(v); this.dirty = true; return true; },
  getState() { return clone(this.state); },
  exportForSave() { return clone(this.state); },
  importFromSave(data) {
    if (!data || data.rejectState) return false;
    this.state = clone(data); this.dirty = false; this.saveCheckpoint = null; return true;
  }
};`,
  // Counts every autosave request (the only persistence call DialogueManager makes).
  'gameStatePersistence.js': String.raw`
export const persistence = { autosaves: 0 };
export function requestAutosave() { persistence.autosaves += 1; }
export function saveGameState() { persistence.autosaves += 1; return true; }`,
  'managers/MainStoryManager.js': String.raw`
export const MainStoryManager = { serialize: () => ({ version: 1 }), deserialize: () => true, resetProgress() {} };`,
  'managers/InventoryManager.js': String.raw`
export const faults = { inventory: false, energy: false };
export const inventoryManager = {
  exportState: () => ({ version: 1, items: [] }),
  importState() { if (!faults.inventory) return true; faults.inventory = false; return false; }
};`,
  'managers/EnergyManager.js': String.raw`
import { faults } from './InventoryManager.js';
const energy = {
  serialize: () => ({ energy: 100 }),
  restore(data, options) { if (faults.energy && !options?.rollback && data?.energy !== 100) throw new Error('energy boom'); },
  resumeRestoredEffects() {}
};
export function getEnergyManager() { return energy; }
export function energyRestoreData(saved) { return { energy: saved.energy ?? 50 }; }`,
  'restoreCaseDirector.js': 'export function createCaseDirectorFromState() { return null; }',
  'ui/DialogueBubbles.js': 'export function showDialogueBubbles() {}',
  // Minimal DialoguePanel base so HomeTownView can be constructed without Phaser.
  'ui/DialoguePanel.js': String.raw`
const any = () => {
  const target = {};
  const proxy = new Proxy(target, { get(_t, key) {
    if (key === 'text') return '';
    if (key === Symbol.toPrimitive) return () => 0;
    if (key === 'then') return undefined;
    return () => proxy;
  } });
  return proxy;
};
export class DialoguePanel {
  constructor(scene) {
    this.scene = scene; this.isOpen = false; this.mode = 'closed'; this.scroll = 0; this._destroyed = false;
    this.L = { lx: 0, lw: 400, py: 0, ph: 300, s: 1 };
    this.rows = [1, 2, 3, 4, 5, 6]; this.meterObjs = []; this.toneObjs = []; this._entries = [];
    for (const key of ['nameText', 'roleText', 'numText', 'speakerText', 'choiceTitle', 'levelText', 'body', 'contArrow', 'root']) this[key] = any();
    this.byeBtn = { text: any() };
    scene.panels.push(this);
  }
  _txt() { return any(); }
  _setTabsVisible() {} _fitWidth() {} _renderTrust() {} _show() {} _tick() {} _cancelTyper() {} _scrollBy() {}
  _finishTyping() { this._afterLines?.(); }
  _setMode(mode) { this.mode = mode; }
  _setEntries(entries) { this._entries = entries; }
  destroy() { this._destroyed = true; this.isOpen = false; }
}`
};

const runtime = String.raw`
import assert from 'node:assert/strict';
import { gameState } from './GameData.js';
import { persistence } from './gameStatePersistence.js';
import { faults } from './managers/InventoryManager.js';
import { dialogueManager } from './managers/DialogueManager.js';
import { getHomeTownTrust } from './managers/HomeTownTrust.js';
import { HomeTownDialogue } from './ui/HomeTownDialogue.js';
import { restoreSavedGameState, exportCurrentGameState } from './gameState/saveRestore.js';

let passed = 0;
const check = (name, fn) => { fn(); passed += 1; console.log('ok -', name); };

// --- fixtures ---------------------------------------------------------------
const storage = new Map();                          // fake localStorage / slot store
const saveSlot = key => storage.set(key, JSON.stringify(exportCurrentGameState()));
const loadSlot = key => restoreSavedGameState(JSON.parse(storage.get(key)));

const sideEffects = { emits: [], flags: [], items: [], money: [] };
dialogueManager.configure({
  setFlag: f => sideEffects.flags.push(f), hasFlag: () => false, clearFlag: () => {},
  giveItem: id => sideEffects.items.push(id), changeMoney: d => { sideEffects.money.push(d); return { ok: true }; },
  getMoney: () => 1000
});
dialogueManager.on('*', (_data, name) => sideEffects.emits.push(name));
dialogueManager.registerNpc({
  id: 'curator', name: 'Curator', startTrust: 40,
  greeting: [{ say: ['Hello.'] }],
  topics: [{ id: 'vase', label: 'The vase', responses: [{ say: ['It was old.'], effects: [{ trust: 5, flag: 'vase_known', giveItem: 'note' }] }] }]
});
let invalidations = 0;
dialogueManager.onInvalidated(() => { invalidations += 1; });

const scene = () => {
  const handlers = [];
  return { panels: [], events: { once: (n, f) => handlers.push([n, f]), off() {} }, scale: { on() {}, off() {} } };
};
const resetCounters = () => {
  persistence.autosaves = 0; invalidations = 0;
  for (const list of Object.values(sideEffects)) list.length = 0;
};
const trustOf = id => dialogueManager.serialize().trust[id];

// Save A: curator trust 40 (+2 polite tone, +5 effect = 47), flag recorded in dialogue state.
dialogueManager.reset();
const first = dialogueManager.createSession('curator');
first.start(); first.ask('vase');
assert.equal(trustOf('curator'), 47);
saveSlot('A');
// Save B: a different playthrough, curator trust 75, no topics asked.
gameState.updateState({ dialogueState: { version: 2, flags: ['from_b'], npcs: {}, trust: { curator: 75 } } });
saveSlot('B');
// Back to A in memory (as if the player kept playing A).
loadSlot('A');

// --- success ----------------------------------------------------------------
check('success: loads trust and NPC state from the save, no autosave/emits/rewards', () => {
  const session = dialogueManager.createSession('curator');
  session.start();
  const panel = new HomeTownDialogue(scene(), () => { throw new Error('stale onClose must not run'); });
  let actionRuns = 0;
  panel.show({ npcId: 'curator', title: 'Curator', choices: [
    { id: 'kind', label: 'Be kind', attitude: 'nice', action: () => { actionRuns += 1; } }
  ] });
  const staleChoice = panel.panel.topics[0].onSelect;
  const generationBefore = dialogueManager.generation;
  resetCounters();

  loadSlot('B');

  assert.equal(persistence.autosaves, 0, 'restore must not request autosave');
  assert.deepEqual(sideEffects.emits, [], 'restore must not emit dialogue events');
  assert.deepEqual(sideEffects.flags, []); assert.deepEqual(sideEffects.items, []);
  assert.equal(trustOf('curator'), 75, 'trust comes from the dialogue serialization');
  assert.equal(getHomeTownTrust('curator').value, 75, 'HomeTownTrust reads the same single source');
  assert.equal(gameState.dialogueState.trust.curator, 75);
  assert.equal(dialogueManager.states.has('curator'), false, 'A\'s NPC state is gone');
  assert.deepEqual([...dialogueManager.flags], ['from_b']);
  assert.ok(dialogueManager.generation > generationBefore, 'generation bumped');
  assert.equal(invalidations, 1, 'open conversations notified once');

  // --- stale-session invalidation ---
  assert.equal(session.isCurrent(), false);
  const stale = session.ask('vase');
  assert.equal(stale.endedBy, 'stale_session');
  assert.equal(stale.end, true);
  assert.equal(session.getTrust().value, 47, 'stale session shows its own last value, not B\'s');
  assert.deepEqual(session.getTopics(), []);
  const summary = session.close();
  assert.equal(summary.stale, true);
  assert.equal(dialogueManager.states.has('curator'), false, 'stale session did not create state in B');
  assert.equal(trustOf('curator'), 75, 'stale session did not write trust into B');
  assert.equal(panel.panel, null, 'HomeTownDialogue on screen was detached');
  staleChoice();
  assert.equal(actionRuns, 0, 'old choice action did not run');
  assert.equal(trustOf('curator'), 75, 'old choice did not change B\'s trust');
  assert.deepEqual(sideEffects.emits, [], 'stale close emitted nothing');
  assert.equal(persistence.autosaves, 0);

  // A conversation opened after the load works normally (and now saves).
  panel.show({ npcId: 'curator', title: 'Curator', choices: [
    { id: 'kind', label: 'Be kind', attitude: 'nice', action: () => { actionRuns += 1; } }
  ] });
  panel.panel.topics[0].onSelect();
  assert.equal(actionRuns, 1);
  assert.equal(trustOf('curator'), 77);
  assert.equal(gameState.dialogueState.trust.curator, 77);
  assert.ok(persistence.autosaves > 0, 'normal play still autosaves');
});

// --- failure with rollback ---------------------------------------------------
const memory = () => JSON.stringify(dialogueManager._serialize());
for (const [label, arrange] of [
  ['another part fails before dialogue loads', () => { faults.inventory = true; }],
  ['another part fails after dialogue loaded', () => { faults.energy = true; }],
  ['dialogue data itself is invalid', () => {}]
]) {
  check('failure (' + label + '): manager memory and gameState roll back, sessions stay valid', () => {
    loadSlot('A');
    const session = dialogueManager.createSession('curator');
    session.start();
    const before = memory();
    const stateBefore = JSON.stringify(gameState.state);
    const generationBefore = dialogueManager.generation;
    resetCounters();
    arrange();
    const raw = JSON.parse(storage.get('B'));
    if (label.startsWith('dialogue')) raw.dialogueState = { version: 99 };
    raw.energy = 10;
    assert.throws(() => restoreSavedGameState(raw), /Could not restore save/);
    faults.inventory = false; faults.energy = false;

    assert.equal(memory(), before, 'DialogueManager memory equals the snapshot');
    assert.equal(JSON.stringify(gameState.state), stateBefore, 'gameState equals the snapshot');
    assert.equal(trustOf('curator'), 47);
    assert.equal(dialogueManager.generation, generationBefore, 'no invalidation on failure');
    assert.equal(invalidations, 0);
    assert.equal(persistence.autosaves, 0);
    assert.deepEqual(sideEffects.emits, []);
    // The conversation opened before the failed load keeps working against A.
    assert.equal(session.isCurrent(), true);
    const result = session.leave();
    assert.notEqual(result.endedBy, 'stale_session');
    assert.equal(gameState.dialogueState.trust.curator, 47);
  });
}

check('single trust source: no second trust copy in the save', () => {
  loadSlot('B');
  const saved = JSON.parse(JSON.stringify(exportCurrentGameState()));
  const trustKeys = Object.keys(saved).filter(key => /trust/i.test(key));
  assert.deepEqual(trustKeys, [], 'trust lives only inside dialogueState');
  assert.equal(saved.dialogueState.trust.curator, 75);
});

console.log(JSON.stringify({ testsPassed: passed }));
`;

async function put(file, content) {
  const absolute = path.join(temp, file);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, content, 'utf8');
}

try {
  for (const file of realFiles) await put(file, await fs.readFile(path.join(project, file), 'utf8'));
  for (const [file, source] of Object.entries(stubs)) await put(file, source);
  await put('runtime-tests.mjs', runtime);
  const output = execFileSync(process.execPath, [path.join(temp, 'runtime-tests.mjs')], {
    encoding: 'utf8', timeout: 30000
  });
  console.log(output.trim());
  console.log('PASS: dialogue restore success, rollback on failure, stale-session invalidation.');
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
