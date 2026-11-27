import {
  TrustManager, trustManager, getTrustLevel, getTrustLevelIndex,
  TONES, TONE_ORDER, rollValue
} from './TrustManager.js';
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { registerRestoreParticipant } from '../gameState/restoreParticipants.js';

const pick = list => list[Math.floor(Math.random() * list.length)];
const safeRecord = value => Object.assign(Object.create(null), value || {});
const count = value => Math.max(0, Math.floor(Number(value) || 0));
const isRecord = value => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};
const cloneNpcState = state => ({
  visits: state.visits, asked: safeRecord(state.asked), lastResp: safeRecord(state.lastResp),
  presented: safeRecord(state.presented), unlocked: new Set(state.unlocked),
  removed: new Set(state.removed), walkedOut: state.walkedOut, returnAt: state.returnAt
});
const REPEAT = ['I already answered that.', 'Same question, same answer. Next.'];
const REFUSE = ["I'd rather not discuss that. With you.", 'Ask me again when I like you more.'];
const WALKOUT = ["That's it. We're done here.", '*Walks away. Not slowly.*'];
const DEFAULT_HOOKS = {
  getEvidenceItems: () => [], hasItem: null, giveItem: () => {},
  getItemLabel: id => id, hasFlag: null, setFlag: null, clearFlag: null,
  getMoney: () => 0, changeMoney: () => ({ ok: false }),
  changeEnergy: () => {}, onEvent: () => {}
};
const isLine = value => typeof value === 'string' ||
  (value && typeof value === 'object' && value.text !== undefined && value.say === undefined);

export function normalizeResponses(value) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    if (value.length && value.every(isLine)) return [{ say: value }];
    return value.filter(Boolean).map(entry => isLine(entry) ? { say: [entry] } : entry);
  }
  return isLine(value) ? [{ say: [value] }] : [value];
}

export class DialogueManager {
  constructor({ trust = new TrustManager(), store = null, now = () => Date.now() } = {}) {
    this.npcs = new Map();
    this.states = new Map();
    this.flags = new Set();
    this.vars = { player: 'Detective' };
    this.trust = trust;
    this.store = store;
    this.now = now;
    this._baseHooks = { ...DEFAULT_HOOKS };
    this.hooks = { ...DEFAULT_HOOKS };
    this._hookScopes = [];
    this._listeners = new Map();
    this._storeValue = Symbol('unread');
    this._generation = 0;
    this._acting = false;
    this._restoring = false;
    this._invalidationListeners = new Set();
  }

  // Epoch of the loaded dialogue data. Every load (save restore, new game)
  // bumps it; sessions and panels opened earlier compare their token with it.
  get generation() { return this._generation; }
  isCurrentGeneration(token) { return token === this._generation && !this._restoring; }
  get isRestoring() { return this._restoring; }

  // UI-only notification after a committed restore: close/detach conversations
  // bound to the previous save. Listeners must not change game state.
  onInvalidated(fn) {
    if (typeof fn !== 'function') throw new TypeError('Listener must be a function.');
    this._invalidationListeners.add(fn);
    return () => this._invalidationListeners.delete(fn);
  }

  _notifyInvalidated() {
    const generation = this._generation;
    for (const fn of [...this._invalidationListeners]) {
      try { fn({ generation }); }
      catch (error) { console.error('[Dialogue] Invalidation listener failed:', error); }
    }
  }

  // --- Save-restore transaction (see gameState/restoreParticipants.js) ---
  // Trust is not snapshotted separately from the dialogue data: the TrustManager
  // is the in-memory half of dialogueState.trust and is captured with it.
  captureRestoreSnapshot() {
    const synced = Boolean(this.store) && this._storeValue === this.store.read();
    const states = new Map();
    for (const [id, state] of this.states) states.set(id, cloneNpcState(state));
    const trustValues = this.trust.values instanceof Map ? new Map(this.trust.values) : null;
    return {
      flags: new Set(this.flags), states, synced, storeValue: this._storeValue,
      trustValues, trustData: trustValues ? null : this.trust.serialize(),
      generation: this._generation
    };
  }

  // Loads the freshly imported dialogueState. No commit, autosave or events.
  restoreFromStore() {
    this._restoring = true;
    if (!this.store) return true;
    const saved = this.store.read();
    this._load(saved);
    this._storeValue = saved;
    return true;
  }

  rollbackRestore(snapshot, { stateRolledBack = false } = {}) {
    this.flags = new Set(snapshot.flags);
    const states = new Map();
    for (const [id, state] of snapshot.states) states.set(id, cloneNpcState(state));
    this.states = states;
    if (snapshot.trustValues) this.trust.values = new Map(snapshot.trustValues);
    else { this.trust.reset(); this.trust.deserialize(snapshot.trustData); }
    this._generation = snapshot.generation;
    this._acting = false;
    // gameState now holds a fresh copy of the old data. Re-bind to it without
    // reloading, so sessions opened before the failed load stay valid. If the
    // state itself could not be rolled back, force a reload from whatever it is.
    if (snapshot.synced) this._storeValue = stateRolledBack ? this.store.read() : Symbol('unread');
    else this._storeValue = snapshot.storeValue;
    this._restoring = false;
  }

  commitRestore() {
    this._restoring = false;
    this._notifyInvalidated();
  }

  // Tylko hooki aplikacyjne. Dla hooków sceny używaj configureForScene().
  configure(hooks = {}) {
    Object.assign(this._baseHooks, hooks);
    this._rebuildHooks();
    return this;
  }

  configureForScene(scene, hooks = {}) {
    if (!scene?.events) throw new TypeError('configureForScene requires a scene.');
    const scope = { hooks: { ...hooks } };
    this._hookScopes.push(scope);
    this._rebuildHooks();
    let disposed = false;
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      scene.events.off('shutdown', dispose);
      scene.events.off('destroy', dispose);
      this._hookScopes = this._hookScopes.filter(entry => entry !== scope);
      this._rebuildHooks();
    };
    scene.events.once('shutdown', dispose);
    scene.events.once('destroy', dispose);
    return dispose;
  }

  _rebuildHooks() {
    this.hooks = Object.assign({}, this._baseHooks, ...this._hookScopes.map(scope => scope.hooks));
  }

  _sync() {
    // While a save is being restored, restoreFromStore() owns loading.
    if (!this.store || this._restoring) return;
    const saved = this.store.read();
    if (saved === this._storeValue) return;
    this._load(saved);
    this._storeValue = saved;
  }

  _commit() {
    // Restoring must not write back or request an autosave.
    if (!this.store || this._restoring) return;
    const data = this._serialize();
    this.store.write(data);
    this._storeValue = this.store.read();
    this.store.requestSave?.();
  }

  setVars(vars) { Object.assign(this.vars, vars); return this; }

  registerNpc(def) {
    if (!def?.id) throw new Error('[Dialogue] NPC definition needs an id.');
    this._sync();
    this.npcs.set(def.id, def);
    this.trust.ensure(def.id, def.startTrust ?? 40);
    return this;
  }

  registerNpcs(defs) {
    for (const def of Array.isArray(defs) ? defs : Object.values(defs)) this.registerNpc(def);
    return this;
  }

  hasNpc(id) { return this.npcs.has(id); }

  createSession(id) {
    this._sync();
    const def = this.npcs.get(id);
    if (!def) { console.error(`[Dialogue] Unknown NPC "${id}".`); return null; }
    return new DialogueSession(this, def);
  }

  hasFlag(flag) { return this.hooks.hasFlag ? !!this.hooks.hasFlag(flag) : this.flags.has(flag); }
  setFlag(flag) { if (this.hooks.setFlag) this.hooks.setFlag(flag); else this.flags.add(flag); }
  clearFlag(flag) { if (this.hooks.clearFlag) this.hooks.clearFlag(flag); else this.flags.delete(flag); }
  hasItem(id) {
    return this.hooks.hasItem ? !!this.hooks.hasItem(id) :
      (this.hooks.getEvidenceItems() || []).some(item => item.id === id);
  }

  // Każdy listener oraz onEvent dostaje (data, name).
  on(name, fn) {
    if (typeof fn !== 'function') throw new TypeError('Listener must be a function.');
    if (!this._listeners.has(name)) this._listeners.set(name, new Set());
    this._listeners.get(name).add(fn);
    return () => {
      const listeners = this._listeners.get(name);
      listeners?.delete(fn);
      if (!listeners?.size) this._listeners.delete(name);
    };
  }

  _emit(name, data = {}) {
    if (this._restoring) return;
    const invoke = fn => {
      try {
        const pending = fn(data, name);
        if (pending && typeof pending.catch === 'function') {
          pending.catch(error => console.error(`[Dialogue] Async listener "${name}" failed:`, error));
        }
      } catch (error) {
        console.error(`[Dialogue] Listener "${name}" failed:`, error);
      }
    };
    for (const fn of [...(this._listeners.get(name) || [])]) invoke(fn);
    if (name !== '*') for (const fn of [...(this._listeners.get('*') || [])]) invoke(fn);
    invoke(this.hooks.onEvent);
  }

  fmt(text, def) {
    return String(text ?? '').replace(/\{(\w+)\}/g, (match, key) => {
      if (key === 'npc' && def) return def.name;
      return this.vars[key] !== undefined ? this.vars[key] : match;
    });
  }

  _state(id) {
    if (!this.states.has(id)) this.states.set(id, {
      visits: 0, asked: safeRecord(), lastResp: safeRecord(), presented: safeRecord(),
      unlocked: new Set(), removed: new Set(), walkedOut: false, returnAt: 0
    });
    return this.states.get(id);
  }

  resetNpc(id) {
    this._sync();
    this.states.delete(id);
    const def = this.npcs.get(id);
    if (def) this.trust.set(id, def.startTrust ?? 40);
    this._commit();
  }

  _check(condition, ctx = {}) {
    if (!condition) return true;
    const c = condition, st = ctx.state, trust = ctx.trust ?? 0;
    if (c.trustMin != null && trust < c.trustMin) return false;
    if (c.trustMax != null && trust > c.trustMax) return false;
    if (c.level && ![].concat(c.level).includes(getTrustLevel(trust).id)) return false;
    if (c.flag && !this.hasFlag(c.flag)) return false;
    if (c.flags && !c.flags.every(flag => this.hasFlag(flag))) return false;
    if (c.notFlag && this.hasFlag(c.notFlag)) return false;
    if (c.notFlags && c.notFlags.some(flag => this.hasFlag(flag))) return false;
    if (c.item && !this.hasItem(c.item)) return false;
    if (c.tone && ![].concat(c.tone).includes(ctx.tone)) return false;
    if (st) {
      if (c.firstVisit != null && (st.visits === 0) !== c.firstVisit) return false;
      if (c.asked && !(st.asked[c.asked] > 0)) return false;
      if (c.notAsked && st.asked[c.notAsked] > 0) return false;
    }
    return !c.any || c.any.some(entry => this._check(entry, ctx));
  }

  _serialize() {
    const npcs = Object.create(null);
    for (const [id, state] of this.states) npcs[id] = {
      visits: state.visits, asked: { ...state.asked }, lastResp: { ...state.lastResp },
      presented: { ...state.presented }, unlocked: [...state.unlocked], removed: [...state.removed],
      walkedOut: state.walkedOut, returnAt: state.returnAt
    };
    return { version: 2, flags: [...this.flags], npcs, trust: this.trust.serialize() };
  }

  serialize() { this._sync(); return this._serialize(); }

  _load(data) {
    // Validate and build everything first; memory changes only if all of it is valid.
    if (data != null && (!isRecord(data) || ![1, 2].includes(data.version))) {
      throw new Error('Unsupported dialogue save version.');
    }
    if (data?.flags != null && !Array.isArray(data.flags)) throw new Error('Invalid dialogue flags.');
    if (data?.npcs != null && !isRecord(data.npcs)) throw new Error('Invalid dialogue NPC states.');
    const flags = new Set(data?.flags || []);
    const states = new Map();
    for (const [id, state] of Object.entries(data?.npcs || {})) {
      if (!isRecord(state)) throw new Error(`Invalid dialogue state for "${id}".`);
      states.set(id, {
        visits: count(state.visits), asked: safeRecord(state.asked),
        lastResp: safeRecord(state.lastResp), presented: safeRecord(state.presented),
        unlocked: new Set(state.unlocked || []), removed: new Set(state.removed || []),
        walkedOut: !!state.walkedOut,
        returnAt: Number.isFinite(state.returnAt) ? state.returnAt : 0
      });
    }
    this.flags = flags;
    this.states = states;
    this.trust.reset();
    if (data?.trust) this.trust.deserialize(data.trust);
    for (const [id, def] of this.npcs) this.trust.ensure(id, def.startTrust ?? 40);
    this._generation += 1;
  }

  deserialize(data) { this._load(data); this._commit(); return true; }
  reset() { this._load(null); this._commit(); this._notifyInvalidated(); }
}

export class DialogueSession {
  constructor(manager, def) {
    this.m = manager;
    this.def = def;
    this.npcId = def.id;
    this.tone = 'polite';
    this._choices = null;
    this._closed = false;
    this._generation = manager._generation;
    this.m.trust.ensure(def.id, def.startTrust ?? 40);
    this._lastTrust = this.trust;
  }

  // A session belongs to the save that was loaded when it was created. After
  // another load it must neither read nor write the new save's data.
  isCurrent() {
    if (this._closed) return false;
    try { this.m._sync(); }
    catch (error) { console.error('[Dialogue] Sync failed:', error); return false; }
    return this.m.isCurrentGeneration(this._generation);
  }
  get isStale() { return !this._closed && !this.isCurrent(); }

  get state() { return this.m._state(this.npcId); }
  get trust() { return this.m.trust.get(this.npcId); }
  get bribeCost() { return Math.max(0, rollValue(this.def.bribeCost ?? TONES.bribe.cost)); }
  getTrust() {
    const value = this.isCurrent() ? (this._lastTrust = this.trust) : this._lastTrust;
    return { value, level: getTrustLevel(value), show: this.def.showTrust !== false };
  }
  setTone(id) { if (this.def.useTones !== false && TONES[id]) this.tone = id; }
  getTones() {
    const current = this.isCurrent();
    return TONE_ORDER.map(id => ({
      id, label: TONES[id].label, hint: TONES[id].hint,
      cost: id === 'bribe' && current ? this.bribeCost : 0,
      enabled: current && this.def.useTones !== false &&
        (id !== 'bribe' || this.m.hooks.getMoney() >= this.bribeCost)
    }));
  }

  _effectiveTone() {
    if (this.def.useTones === false) return null;
    return this.tone === 'bribe' && this.m.hooks.getMoney() < this.bribeCost ? 'polite' : this.tone;
  }
  _ctx(tone = this._effectiveTone()) { return { state: this.state, trust: this.trust, tone }; }

  getTopics() {
    if (!this.isCurrent()) return [];
    const st = this.state;
    return (this.def.topics || []).filter(topic =>
      !st.removed.has(topic.id) && (!topic.hidden || st.unlocked.has(topic.id)) &&
      this.m._check(topic.showIf, this._ctx())
    ).map(topic => {
      const locked = topic.minTrust != null && this.trust < topic.minTrust;
      return { id: topic.id, label: this.m.fmt(locked ? topic.lockedLabel ?? topic.label : topic.label, this.def),
        locked, asked: st.asked[topic.id] > 0 };
    });
  }
  getEvidence() {
    if (!this.isCurrent()) return [];
    return (this.m.hooks.getEvidenceItems() || []).map(item => ({
      id: item.id, label: item.label || item.id, presented: this.state.presented[item.id] > 0
    }));
  }

  _newResult(extra = {}) {
    return { npcId: this.npcId, kind: 'topic', tone: this._effectiveTone(), lines: [],
      choices: null, end: false, endedBy: null, locked: false, repeated: false,
      spent: 0, toneDelta: 0, gained: [], trust: null, ...extra };
  }

  _action(extra, fn) {
    if (!this.isCurrent()) {
      // No effects, no trust read from (or written to) the newly loaded save.
      const value = this._lastTrust;
      return { npcId: this.npcId, kind: extra?.kind ?? 'topic', tone: null, lines: [],
        choices: null, end: true, endedBy: 'stale_session', locked: false, repeated: false,
        spent: 0, toneDelta: 0, gained: [],
        trust: { before: value, after: value, delta: 0, level: getTrustLevel(value), levelChanged: false } };
    }
    const result = this._newResult(extra);
    if (this.m._acting) {
      result.lines = this._lines(['One question at a time, Detective.']);
      return result;
    }
    this.m._acting = true;
    const before = this.trust;
    this._choices = null;
    try {
      fn(result);
      this._checkWalkout(result);
    } catch (error) {
      console.error('[Dialogue] Action failed:', error);
      this._choices = null;
      result.choices = null;
      result.lines = this._lines(['The conversation was interrupted.']);
      result.end = true;
      result.endedBy = 'error';
    } finally {
      try { this.m._commit(); }
      catch (error) { console.error('[Dialogue] Save request failed:', error); }
      this.m._acting = false;
    }
    const after = this.trust;
    this._lastTrust = after;
    result.trust = { before, after, delta: after - before, level: getTrustLevel(after),
      levelChanged: getTrustLevelIndex(before) !== getTrustLevelIndex(after) };
    return result;
  }

  _blocked(result) {
    if (!this.state.walkedOut) return false;
    result.lines = this._lines(this.def.walkOut?.cooldownSay ?? ['Not now. Come back later.']);
    result.end = true;
    result.endedBy = 'cooldown';
    return true;
  }

  start() {
    return this._action({ kind: 'start' }, result => {
      const st = this.state, wo = this.def.walkOut || {};
      let response;
      if (st.walkedOut) {
        if (this.m.now() < st.returnAt) { this._blocked(result); return; }
        st.walkedOut = false;
        st.returnAt = 0;
        this.m.trust.set(this.npcId, Math.max(this.trust, wo.recoverTo ?? (wo.at ?? 0) + 10));
        if (wo.returnSay) response = { say: wo.returnSay };
      }
      response ||= normalizeResponses(this.def.greeting).find(entry => this.m._check(entry.when, this._ctx(result.tone)));
      st.visits += 1;
      if (response) this._runResponse(response, result);
      this.m._emit('dialogue:start', { npcId: this.npcId });
    });
  }

  ask(topicId) {
    return this._action({ kind: 'topic', topicId }, result => {
      if (this._blocked(result) || this._checkWalkout(result)) return;
      const st = this.state;
      const topic = (this.def.topics || []).find(entry => entry.id === topicId);
      if (!topic || st.removed.has(topicId) || (topic.hidden && !st.unlocked.has(topicId)) ||
          !this.m._check(topic.showIf, this._ctx(result.tone))) return;

      // Bramka jest oceniana PRZED reakcją na ton i PRZED płatnością.
      if (topic.minTrust != null && this.trust < topic.minTrust) {
        result.lines = this._lines(topic.locked ?? [pick(REFUSE)]);
        result.locked = true;
        return;
      }
      const list = normalizeResponses(topic.responses ?? {
        say: topic.say, effects: topic.effects, choices: topic.choices, end: topic.end
      });
      const select = tone => list.findIndex(entry => this.m._check(entry.when, this._ctx(tone)));
      let index = select(result.tone);
      let response = list[index];
      let repeated = st.asked[topicId] > 0 && st.lastResp[topicId] === index && !topic.allowRepeat;

      // Nie pobieramy łapówki za brak odpowiedzi ani powtórkę.
      if (response && !repeated && result.tone === 'bribe') {
        const cost = this.bribeCost;
        const balanceBefore = Number(this.m.hooks.getMoney());
        const payment = cost ? this.m.hooks.changeMoney(-cost) : { ok: true };
        if (payment && typeof payment.then === 'function') {
          throw new Error('Dialogue money hooks must be synchronous.');
        }
        const balanceAfter = Number(this.m.hooks.getMoney());
        const actuallyPaid = cost === 0 || (
          Number.isFinite(balanceBefore) && Number.isFinite(balanceAfter) &&
          balanceAfter <= balanceBefore - cost
        );
        if (payment === false || payment?.ok === false || !actuallyPaid) {
          result.tone = 'polite';
          index = select(result.tone);
          response = list[index];
          repeated = st.asked[topicId] > 0 && st.lastResp[topicId] === index && !topic.allowRepeat;
        } else result.spent = cost;
      }
      if (topic.ask) result.lines.push(this._line('> ' + topic.ask));
      if (!response) result.lines.push(...this._lines(['...']));
      else if (repeated) {
        result.repeated = true;
        result.lines.push(...this._lines(topic.repeat ?? [pick(REPEAT)]));
        this._addTrust(-1);
      } else {
        if (!(st.asked[topicId] > 0) && result.tone) {
          result.toneDelta = rollValue(this.def.reacts?.[result.tone] ?? TONES[result.tone].react);
          this._addTrust(result.toneDelta);
        }
        // Gdy ton powoduje walkout, nie wykonujemy efektów odpowiedzi.
        if (!this._checkWalkout(result)) this._runResponse(response, result);
      }
      st.asked[topicId] = count(st.asked[topicId]) + 1;
      st.lastResp[topicId] = index;
      this._checkWalkout(result);
      this.m._emit('dialogue:topic', {
        npcId: this.npcId, topicId, repeated: result.repeated,
        tone: result.tone, meta: response?.meta ?? null
      });
    });
  }

  present(itemId) {
    return this._action({ kind: 'evidence', itemId, tone: null }, result => {
      if (this._blocked(result) || this._checkWalkout(result)) return;
      if (!this.m.hasItem(itemId)) {
        result.lines = this._lines(["You don't have that evidence."]);
        return;
      }
      const st = this.state;
      const entry = this.def.evidence?.[itemId];
      const list = normalizeResponses(entry ? entry.responses ?? entry :
        this.def.evidenceDefault ?? { say: ['Never seen that in my life.'] });
      const key = 'ev:' + itemId;
      const index = list.findIndex(response => this.m._check(response.when, this._ctx(null)));
      const response = list[index];
      if (!response) result.lines = this._lines(['...']);
      else if (st.presented[itemId] > 0 && st.lastResp[key] === index) {
        result.lines = this._lines([pick(REPEAT)]);
        result.repeated = true;
        this._addTrust(-1);
      } else this._runResponse(response, result);
      st.presented[itemId] = count(st.presented[itemId]) + 1;
      st.lastResp[key] = index;
      this._checkWalkout(result);
      this.m._emit('dialogue:evidence', { npcId: this.npcId, itemId, meta: response?.meta ?? null });
    });
  }

  choose(index) {
    const choice = this._choices?.[index];
    const tone = this._choiceTone === undefined ? this._effectiveTone() : this._choiceTone;
    return this._action({ kind: 'choice', tone }, result => {
      if (this._blocked(result) || this._checkWalkout(result) || !choice) return;
      if (this.m._check(choice.when, this._ctx(result.tone))) this._runResponse(choice, result);
    });
  }

  leave() {
    return this._action({ kind: 'leave', end: true, endedBy: 'goodbye' }, result => {
      if (this._blocked(result)) return;
      const response = normalizeResponses(this.def.farewell).find(entry => this.m._check(entry.when, this._ctx(result.tone)));
      if (response) this._runResponse(response, result);
    });
  }

  summary(endedBy = 'goodbye') {
    if (!this._closed && !this.isCurrent()) {
      // Never create or read NPC state in the save that replaced this session's.
      return { npcId: this.npcId, name: this.def.name, endedBy: 'stale_session', stale: true,
        trust: this._lastTrust, level: getTrustLevel(this._lastTrust).id, asked: [], presented: [] };
    }
    const st = this.state;
    return { npcId: this.npcId, name: this.def.name, endedBy, trust: this.trust,
      level: getTrustLevel(this.trust).id,
      asked: Object.keys(st.asked).filter(key => st.asked[key] > 0),
      presented: Object.keys(st.presented).filter(key => st.presented[key] > 0) };
  }
  close(endedBy = 'goodbye') {
    if (this._closed) return this._closedSummary;
    const summary = this.summary(endedBy);
    this._closed = true;
    this._choices = null;
    this._closedSummary = summary;
    // A stale session closes silently: its listeners belong to the old save.
    if (!summary.stale) this.m._emit('dialogue:close', summary);
    return summary;
  }

  _addTrust(delta) { if (delta) this.m.trust.add(this.npcId, delta); }

  _checkWalkout(result) {
    const wo = this.def.walkOut;
    if (!wo || this.state.walkedOut || this.trust > wo.at) return false;
    const cooldown = Math.max(1, Number(wo.cooldownMs) || 60000);
    this.state.walkedOut = true;
    this.state.returnAt = this.m.now() + cooldown;
    this._choices = null;
    result.choices = null;
    result.lines.push(...this._lines(wo.say ?? WALKOUT));
    result.end = true;
    result.endedBy = 'walkout';
    this.m._emit('dialogue:walkout', { npcId: this.npcId, returnAt: this.state.returnAt });
    return true;
  }

  _runResponse(response, result) {
    result.lines.push(...this._lines(response.say));
    this._applyEffects(response.effects, result);
    if (response.choices) {
      this._choiceTone = result.tone;
      this._choices = response.choices.filter(choice => this.m._check(choice.when, this._ctx(result.tone)));
      result.choices = this._choices.map(choice => this.m.fmt(choice.label, this.def));
      if (!result.choices.length) { result.choices = null; this._choices = null; }
    }
    if (response.end) { result.end = true; result.endedBy ||= 'script'; }
  }

  _applyEffects(effects, result) {
    const m = this.m, h = m.hooks;
    for (const effect of [].concat(effects ?? [])) {
      if (!effect) continue;
      if (effect.trust != null) this._addTrust(rollValue(effect.trust));
      if (effect.flag) [].concat(effect.flag).forEach(flag => m.setFlag(flag));
      if (effect.clearFlag) [].concat(effect.clearFlag).forEach(flag => m.clearFlag(flag));
      if (effect.unlock) [].concat(effect.unlock).forEach(id => {
        this.state.unlocked.add(id); this.state.removed.delete(id);
      });
      if (effect.lock) [].concat(effect.lock).forEach(id => this.state.removed.add(id));
      if (effect.giveItem) [].concat(effect.giveItem).forEach(id => {
        h.giveItem(id); result.gained.push(h.getItemLabel(id));
      });
      if (effect.money != null) h.changeMoney(effect.money);
      if (effect.energy != null) h.changeEnergy(effect.energy);
      if (effect.event) m._emit(effect.event, { npcId: this.npcId, ...(effect.data || {}) });
      if (effect.end) { result.end = true; result.endedBy ||= 'script'; }
    }
  }

  _lines(raw) { return [].concat(raw ?? []).map(line => this._line(line)).filter(Boolean); }
  _line(raw) {
    if (raw == null) return null;
    const player = String(this.m.vars.player || 'Detective').toUpperCase();
    const fmt = text => this.m.fmt(text, this.def);
    if (typeof raw === 'string') {
      if (raw.length > 2 && raw.startsWith('*') && raw.endsWith('*')) return { kind: 'action', who: '', text: fmt(raw.slice(1, -1)) };
      if (raw.startsWith('> ')) return { kind: 'player', who: player, text: fmt(raw.slice(2)) };
      return { kind: 'say', who: this.def.name.toUpperCase(), text: fmt(raw) };
    }
    if (raw.who === 'player') return { kind: 'player', who: player, text: fmt(raw.text) };
    if (raw.who === 'narrator') return { kind: 'action', who: '', text: fmt(raw.text) };
    return { kind: 'say', who: String(raw.who || this.def.name).toUpperCase(), text: fmt(raw.text) };
  }
}

// Pełny reset gry zastępuje gameState.state. _sync() wykrywa również brak pola
// w nowej grze / starym zapisie i czyści pamięć poprzedniej rozgrywki.
export const dialogueManager = new DialogueManager({
  trust: trustManager,
  store: {
    read: () => gameState.dialogueState ?? null,
    write: data => gameState.updateState({ dialogueState: data }),
    requestSave: () => { if (gameState.isGameActive) requestAutosave(); }
  }
});
export function getDialogueManager() { return dialogueManager; }

// Joins every slot/autosave restore (gameState/saveRestore.js) as one transaction.
export function createDialogueRestoreParticipant(manager) {
  return {
    snapshot: () => manager.captureRestoreSnapshot(),
    restore: () => manager.restoreFromStore(),
    rollback: (snapshot, info) => manager.rollbackRestore(snapshot, info),
    commit: () => manager.commitRestore()
  };
}
registerRestoreParticipant('dialogue', createDialogueRestoreParticipant(dialogueManager));
