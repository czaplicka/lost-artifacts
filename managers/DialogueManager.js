// managers/DialogueManager.js
// Universal dialogue logic. No Phaser dependency: the UI lives in ui/DialoguePanel.js.
//
// ============================================================================
// NPC DEFINITION CHEAT SHEET
// ============================================================================
// {
//   id: 'curator',                 // unique
//   name: 'Dr. Pemberton',         // shown in the nameplate
//   role: 'Curator',               // small subtitle (optional)
//   startTrust: 25,                // 0..100 (default 40)
//   showTrust: true,               // false = hide trust meter (e.g. Holly in the dream)
//   useTones: true,                // false = hide the POLITE/JOKE/PUSHY/BRIBE row
//   evidenceTab: true,             // false = hide the EVIDENCE tab
//   bribeCost: 20,                 // optional override
//   reacts: { polite: 3, joke: [-5, 1], pressure: -8, bribe: -12 },   // trust change per tone
//   walkOut: { at: 8, say: [...], returnSay: [...], recoverTo: 20 },  // NPC leaves when trust <= at
//   greeting: [ { when, say, effects, choices, end } ... ],           // first matching is played
//   farewell: [ { when, say } ... ],
//   topics: [ { id, label, ask?, minTrust?, locked?, lockedLabel?, hidden?, showIf?,
//               allowRepeat?, repeat?, responses: [ { when, say, effects, choices, end, meta } ] } ],
//   evidence: { itemId: { responses: [...] } },   // or { say: [...], effects: [...] } shorthand
//   evidenceDefault: [...]                        // reaction to items not listed above
// }
//
// LINES (strings inside `say`)
//   'Text'                 -> the NPC speaks
//   '> Text'               -> the detective speaks
//   '*Text*'               -> narration / stage direction
//   { who: 'Name', text }  -> third person; who: 'player' / 'narrator' also work
//   Placeholders: {player}, {npc} and anything set via setVars().
//
// CONDITIONS (`when`, `showIf`) - all given keys must match:
//   trustMin, trustMax, level ('wary' or ['wary','hostile']), flag, flags[], notFlag, notFlags[],
//   item, tone, firstVisit (bool), asked (topicId), notAsked (topicId), any: [cond, cond]
//
// EFFECTS (array of objects, any mix of keys):
//   { trust: 5 } / { trust: [-2, 4] }, { flag: 'x' }, { clearFlag: 'x' }, { unlock: 'topicId' },
//   { lock: 'topicId' }, { giveItem: 'id' }, { money: -20 }, { energy: -5 },
//   { event: 'clue:found', data: {...} }  -> emitted through dialogueManager.on(...)
//   { end: true }
// ============================================================================

import {
  trustManager, getTrustLevel, getTrustLevelIndex, TONES, TONE_ORDER, rollValue,
} from './TrustManager.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const REPEAT_LINES = [
  'I already answered that.',
  "Didn't we just cover this?",
  'Same question, same answer. Next.',
  'Are you stuck in a loop, Detective?',
];
const REFUSE_LINES = [
  "I'd rather not discuss that. With you.",
  'Ask me again when I like you more.',
  "That's private. Like, 'we only just met' private.",
];
const EVIDENCE_LINES = [
  'Never seen that in my life.',
  'Is that supposed to mean something to me?',
  'That is an object. I can confirm it is an object.',
];
const WALKOUT_LINES = ["That's it. We're done here.", '*Walks away. Not slowly.*'];

// Connect these to your real game state (inventory, money, flags, energy...).
const DEFAULT_HOOKS = {
  getEvidenceItems: () => [],      // () => [{ id, label }]
  hasItem: null,                   // (id) => bool   (default: looks in getEvidenceItems)
  giveItem: () => {},              // (id)
  getItemLabel: (id) => id,        // (id) => string
  hasFlag: null,                   // (flag) => bool (default: internal flag set)
  setFlag: null,                   // (flag)
  clearFlag: null,                 // (flag)
  getMoney: () => 0,               // () => number
  changeMoney: () => {},           // (delta)
  changeEnergy: () => {},          // (delta)
  onEvent: () => {},               // (name, data)
};

const isLine = (e) =>
  typeof e === 'string' || (e && typeof e === 'object' && e.text !== undefined && e.say === undefined);

// Accepts: 'text' | ['text', 'text'] | { say } | [ { say }, { say } ]  -> always [ { say, ... } ]
export function normalizeResponses(x) {
  if (x == null) return [];
  if (Array.isArray(x)) {
    if (x.length && x.every(isLine)) return [{ say: x }];
    return x.map((e) => (isLine(e) ? { say: [e] } : e));
  }
  if (isLine(x)) return [{ say: [x] }];
  return [x];
}

export class DialogueManager {
  constructor() {
    this.npcs = new Map();
    this.states = new Map();
    this.flags = new Set();
    this.vars = { player: 'Detective' };
    this.hooks = { ...DEFAULT_HOOKS };
    this._listeners = new Map();
  }

  // ---------- setup ----------
  configure(hooks) {
    Object.assign(this.hooks, hooks);
    return this;
  }

  setVars(vars) {
    Object.assign(this.vars, vars);
    return this;
  }

  registerNpc(def) {
    if (!def || !def.id) throw new Error('[Dialogue] NPC definition needs an id');
    this.npcs.set(def.id, def);
    trustManager.ensure(def.id, def.startTrust ?? 40);
    return this;
  }

  registerNpcs(defs) {
    (Array.isArray(defs) ? defs : Object.values(defs)).forEach((d) => this.registerNpc(d));
    return this;
  }

  hasNpc(id) {
    return this.npcs.has(id);
  }

  createSession(npcId) {
    const def = this.npcs.get(npcId);
    if (!def) {
      console.error(`[Dialogue] Unknown NPC "${npcId}". Did you call registerNpc()?`);
      return null;
    }
    return new DialogueSession(this, def);
  }

  // ---------- flags & items (go through hooks when provided) ----------
  hasFlag(f) {
    return this.hooks.hasFlag ? !!this.hooks.hasFlag(f) : this.flags.has(f);
  }

  setFlag(f) {
    if (this.hooks.setFlag) this.hooks.setFlag(f);
    else this.flags.add(f);
  }

  clearFlag(f) {
    if (this.hooks.clearFlag) this.hooks.clearFlag(f);
    else this.flags.delete(f);
  }

  hasItem(id) {
    if (this.hooks.hasItem) return !!this.hooks.hasItem(id);
    return (this.hooks.getEvidenceItems() || []).some((i) => i.id === id);
  }

  // ---------- events ----------
  // on('*', (name, data) => ...) listens to everything. Returns an unsubscribe function.
  on(name, fn) {
    if (!this._listeners.has(name)) this._listeners.set(name, new Set());
    this._listeners.get(name).add(fn);
    return () => this._listeners.get(name)?.delete(fn);
  }

  _emit(name, data = {}) {
    this._listeners.get(name)?.forEach((fn) => fn(data, name));
    this._listeners.get('*')?.forEach((fn) => fn(name, data));
    try { this.hooks.onEvent(name, data); } catch (e) { console.error(e); }
  }

  // ---------- text ----------
  fmt(str, def) {
    return String(str ?? '').replace(/\{(\w+)\}/g, (match, key) => {
      if (key === 'npc' && def) return def.name;
      return this.vars[key] !== undefined ? this.vars[key] : match;
    });
  }

  // ---------- per-NPC memory ----------
  _state(id) {
    let s = this.states.get(id);
    if (!s) {
      s = {
        visits: 0, asked: {}, lastResp: {}, presented: {},
        unlocked: new Set(), removed: new Set(), walkedOut: false,
      };
      this.states.set(id, s);
    }
    return s;
  }

  resetNpc(id) {
    this.states.delete(id);
  }

  // ---------- conditions ----------
  _check(c, ctx = {}) {
    if (!c) return true;
    const st = ctx.state;
    const trust = ctx.trust ?? 0;
    if (c.trustMin != null && trust < c.trustMin) return false;
    if (c.trustMax != null && trust > c.trustMax) return false;
    if (c.level && ![].concat(c.level).includes(getTrustLevel(trust).id)) return false;
    if (c.flag && !this.hasFlag(c.flag)) return false;
    if (c.flags && !c.flags.every((f) => this.hasFlag(f))) return false;
    if (c.notFlag && this.hasFlag(c.notFlag)) return false;
    if (c.notFlags && c.notFlags.some((f) => this.hasFlag(f))) return false;
    if (c.item && !this.hasItem(c.item)) return false;
    if (c.tone && !(ctx.tone && [].concat(c.tone).includes(ctx.tone))) return false;
    if (st) {
      if (c.firstVisit != null && (st.visits === 0) !== c.firstVisit) return false;
      if (c.asked && !(st.asked[c.asked] > 0)) return false;
      if (c.notAsked && st.asked[c.notAsked] > 0) return false;
    }
    if (c.any && !c.any.some((x) => this._check(x, ctx))) return false;
    return true;
  }

  // ---------- save / load ----------
  serialize() {
    const npcs = {};
    for (const [id, s] of this.states) {
      npcs[id] = {
        visits: s.visits,
        asked: { ...s.asked },
        lastResp: { ...s.lastResp },
        presented: { ...s.presented },
        unlocked: [...s.unlocked],
        removed: [...s.removed],
        walkedOut: s.walkedOut,
      };
    }
    return { version: 1, flags: [...this.flags], npcs, trust: trustManager.serialize() };
  }

  deserialize(data) {
    if (!data) return;
    this.flags = new Set(data.flags || []);
    this.states.clear();
    for (const [id, s] of Object.entries(data.npcs || {})) {
      this.states.set(id, {
        visits: s.visits || 0,
        asked: s.asked || {},
        lastResp: s.lastResp || {},
        presented: s.presented || {},
        unlocked: new Set(s.unlocked || []),
        removed: new Set(s.removed || []),
        walkedOut: !!s.walkedOut,
      });
    }
    trustManager.deserialize(data.trust);
    this.npcs.forEach((def, id) => trustManager.ensure(id, def.startTrust ?? 40));
  }

  reset() {
    this.states.clear();
    this.flags.clear();
    trustManager.reset();
    this.npcs.forEach((def, id) => trustManager.ensure(id, def.startTrust ?? 40));
  }
}

// ============================================================================
// One conversation with one NPC. The UI only talks to this class.
// Every action returns a "result":
// { npcId, tone, lines:[{kind,who,text}], choices:null|[labels], end, endedBy,
//   locked, repeated, spent, toneDelta, gained:[ids], trust:null|{before,after,delta,level,levelChanged} }
// ============================================================================
export class DialogueSession {
  constructor(manager, def) {
    this.m = manager;
    this.def = def;
    this.npcId = def.id;
    this.tone = 'polite';
    this._choices = null;
    trustManager.ensure(def.id, def.startTrust ?? 40);
  }

  get state() { return this.m._state(this.npcId); }
  get trust() { return trustManager.get(this.npcId); }
  get bribeCost() { return this.def.bribeCost ?? TONES.bribe.cost; }

  getTrust() {
    const value = this.trust;
    return { value, level: getTrustLevel(value), show: this.def.showTrust !== false };
  }

  // ---------- tones ----------
  setTone(id) {
    if (TONES[id]) this.tone = id;
  }

  getTones() {
    return TONE_ORDER.map((id) => {
      const t = TONES[id];
      const cost = id === 'bribe' ? this.bribeCost : 0;
      const enabled = id !== 'bribe' || this.m.hooks.getMoney() >= cost;
      return { id, label: t.label, hint: t.hint, cost, enabled };
    });
  }

  // ---------- lists for the UI ----------
  getTopics() {
    const st = this.state;
    const trust = this.trust;
    const out = [];
    for (const t of this.def.topics || []) {
      if (st.removed.has(t.id)) continue;
      if (t.hidden && !st.unlocked.has(t.id)) continue;
      if (t.showIf && !this.m._check(t.showIf, this._ctx())) continue;
      const locked = t.minTrust != null && trust < t.minTrust;
      out.push({
        id: t.id,
        label: this.m.fmt(locked ? (t.lockedLabel ?? t.label) : t.label, this.def),
        locked,
        asked: (st.asked[t.id] || 0) > 0,
      });
    }
    return out;
  }

  getEvidence() {
    const st = this.state;
    return (this.m.hooks.getEvidenceItems() || []).map((i) => ({
      id: i.id,
      label: i.label || i.id,
      presented: (st.presented[i.id] || 0) > 0,
    }));
  }

  // ---------- actions ----------
  start() {
    const st = this.state;
    const def = this.def;
    const result = this._newResult({ kind: 'start' });
    let resp = null;

    if (st.walkedOut) {
      st.walkedOut = false;
      const wo = def.walkOut || {};
      trustManager.set(this.npcId, Math.max(this.trust, wo.recoverTo ?? (wo.at ?? 0) + 10));
      if (wo.returnSay) resp = { say: wo.returnSay };
    }
    if (!resp) {
      resp = normalizeResponses(def.greeting).find((r) => this.m._check(r.when, this._ctx())) || null;
    }
    st.visits += 1;
    if (resp) this._runResponse(resp, result);
    this.m._emit('dialogue:start', { npcId: this.npcId });
    return result;
  }

  ask(topicId) {
    const def = this.def;
    const st = this.state;
    const topic = (def.topics || []).find((t) => t.id === topicId);
    const result = this._newResult({ topicId, kind: 'topic' });
    if (!topic) return result;
    const before = this.trust;

    // 1) tone
    let tone = this.tone;
    if (tone === 'bribe') {
      const cost = this.bribeCost;
      if (this.m.hooks.getMoney() >= cost) {
        this.m.hooks.changeMoney(-cost);
        result.spent = cost;
      } else {
        tone = 'polite';
      }
    }
    result.tone = tone;
    const toneDelta = rollValue(def.reacts?.[tone] ?? TONES[tone].react);
    result.toneDelta = toneDelta;
    this._addTrust(toneDelta);

    // 2) walk-out
    const wo = def.walkOut;
    if (wo && toneDelta < 0 && this.trust <= wo.at) {
      st.walkedOut = true;
      result.lines = this._lines(wo.say ?? WALKOUT_LINES);
      result.end = true;
      result.endedBy = 'walkout';
      this.m._emit('dialogue:walkout', { npcId: this.npcId });
      return this._finalize(result, before);
    }

    // 3) trust gate
    if (topic.minTrust != null && this.trust < topic.minTrust) {
      result.lines = this._lines(topic.locked ?? [pick(REFUSE_LINES)]);
      result.locked = true;
      return this._finalize(result, before);
    }

    // 4) pick the response
    if (topic.ask) result.lines.push(this._line('> ' + topic.ask));
    const list = topic.responses
      ? normalizeResponses(topic.responses)
      : normalizeResponses({ say: topic.say, effects: topic.effects, choices: topic.choices, end: topic.end });
    const idx = list.findIndex((r) => this.m._check(r.when, this._ctx()));
    const resp = list[idx];
    const repeated = (st.asked[topicId] || 0) > 0 && st.lastResp[topicId] === idx && !topic.allowRepeat;

    if (!resp) {
      result.lines.push(...this._lines(['...']));
    } else if (repeated) {
      result.lines.push(...this._lines(topic.repeat ?? [pick(REPEAT_LINES)]));
      result.repeated = true;
      this._addTrust(-1);
    } else {
      this._runResponse(resp, result);
    }

    st.asked[topicId] = (st.asked[topicId] || 0) + 1;
    st.lastResp[topicId] = idx;
    this.m._emit('dialogue:topic', {
      npcId: this.npcId, topicId, repeated, tone, meta: resp ? resp.meta : null,
    });
    return this._finalize(result, before);
  }

  present(itemId) {
    const def = this.def;
    const st = this.state;
    const before = this.trust;
    const result = this._newResult({ kind: 'evidence', itemId, tone: null });
    const entry = def.evidence ? def.evidence[itemId] : null;
    const key = 'ev:' + itemId;

    let list;
    if (entry) {
      list = entry.responses
        ? normalizeResponses(entry.responses)
        : normalizeResponses({ say: entry.say, effects: entry.effects, choices: entry.choices, end: entry.end });
    } else {
      list = normalizeResponses(def.evidenceDefault ?? { say: [pick(EVIDENCE_LINES)] });
    }

    const idx = list.findIndex((r) => this.m._check(r.when, this._ctx()));
    const resp = list[idx];
    const repeated = (st.presented[itemId] || 0) > 0 && st.lastResp[key] === idx;

    if (!resp) {
      result.lines.push(...this._lines(['...']));
    } else if (repeated) {
      result.lines.push(...this._lines([pick(REPEAT_LINES)]));
      result.repeated = true;
      this._addTrust(-1);
    } else {
      this._runResponse(resp, result);
    }

    st.presented[itemId] = (st.presented[itemId] || 0) + 1;
    st.lastResp[key] = idx;
    this.m._emit('dialogue:evidence', { npcId: this.npcId, itemId, meta: resp ? resp.meta : null });
    return this._finalize(result, before);
  }

  choose(index) {
    const ch = this._choices ? this._choices[index] : null;
    const before = this.trust;
    const result = this._newResult({ kind: 'choice' });
    this._choices = null;
    if (!ch) return result;
    this._runResponse(ch, result);
    return this._finalize(result, before);
  }

  leave() {
    const result = this._newResult({ kind: 'leave', end: true, endedBy: 'goodbye' });
    const resp = normalizeResponses(this.def.farewell).find((r) => this.m._check(r.when, this._ctx()));
    if (resp) {
      result.lines = this._lines(resp.say);
      this._applyEffects(resp.effects, result);
    }
    return result;
  }

  summary(endedBy = 'goodbye') {
    const st = this.state;
    return {
      npcId: this.npcId,
      name: this.def.name,
      endedBy,
      trust: this.trust,
      level: getTrustLevel(this.trust).id,
      asked: Object.keys(st.asked).filter((k) => st.asked[k] > 0),
      presented: Object.keys(st.presented).filter((k) => st.presented[k] > 0),
    };
  }

  close(endedBy = 'goodbye') {
    const s = this.summary(endedBy);
    this.m._emit('dialogue:close', s);
    return s;
  }

  // ---------- internals ----------
  _ctx(extra) {
    return { state: this.state, trust: this.trust, tone: this.tone, ...extra };
  }

  _addTrust(delta) {
    if (!delta) return null;
    return trustManager.add(this.npcId, delta);
  }

  _newResult(extra = {}) {
    this._choices = null;
    return {
      npcId: this.npcId, kind: 'topic', tone: this.tone, lines: [], choices: null,
      end: false, endedBy: null, locked: false, repeated: false, spent: 0,
      toneDelta: 0, gained: [], trust: null, ...extra,
    };
  }

  _finalize(result, before) {
    const after = this.trust;
    result.trust = {
      before,
      after,
      delta: after - before,
      level: getTrustLevel(after),
      levelChanged: getTrustLevelIndex(before) !== getTrustLevelIndex(after),
    };
    return result;
  }

  _runResponse(resp, result) {
    result.lines.push(...this._lines(resp.say));
    this._applyEffects(resp.effects, result);
    if (resp.choices) {
      this._choices = resp.choices.filter((c) => this.m._check(c.when, this._ctx()));
      result.choices = this._choices.map((c) => this.m.fmt(c.label, this.def));
      if (!result.choices.length) { result.choices = null; this._choices = null; }
    }
    if (resp.end) {
      result.end = true;
      result.endedBy = result.endedBy || 'script';
    }
  }

  _applyEffects(effects, result) {
    const m = this.m;
    const h = m.hooks;
    for (const e of [].concat(effects ?? [])) {
      if (!e) continue;
      if (e.trust != null) this._addTrust(rollValue(e.trust));
      if (e.flag) [].concat(e.flag).forEach((f) => m.setFlag(f));
      if (e.clearFlag) [].concat(e.clearFlag).forEach((f) => m.clearFlag(f));
      if (e.unlock) {
        [].concat(e.unlock).forEach((id) => { this.state.unlocked.add(id); this.state.removed.delete(id); });
      }
      if (e.lock) [].concat(e.lock).forEach((id) => this.state.removed.add(id));
      if (e.giveItem) {
        [].concat(e.giveItem).forEach((id) => { h.giveItem(id); result.gained.push(h.getItemLabel(id)); });
      }
      if (e.money != null) h.changeMoney(e.money);
      if (e.energy != null) h.changeEnergy(e.energy);
      if (e.event) m._emit(e.event, { npcId: this.npcId, ...(e.data || {}) });
      if (e.end) { result.end = true; result.endedBy = result.endedBy || 'script'; }
    }
  }

  _lines(raw) {
    return [].concat(raw ?? []).map((r) => this._line(r)).filter(Boolean);
  }

  _line(raw) {
    if (raw == null) return null;
    const m = this.m;
    const def = this.def;
    const playerName = String(m.vars.player || 'Detective').toUpperCase();

    if (typeof raw === 'string') {
      if (raw.length > 2 && raw.startsWith('*') && raw.endsWith('*')) {
        return { kind: 'action', who: '', text: m.fmt(raw.slice(1, -1), def) };
      }
      if (raw.startsWith('> ')) {
        return { kind: 'player', who: playerName, text: m.fmt(raw.slice(2), def) };
      }
      return { kind: 'say', who: def.name.toUpperCase(), text: m.fmt(raw, def) };
    }
    if (raw.who === 'player') return { kind: 'player', who: playerName, text: m.fmt(raw.text, def) };
    if (raw.who === 'narrator') return { kind: 'action', who: '', text: m.fmt(raw.text, def) };
    return { kind: 'say', who: String(raw.who || def.name).toUpperCase(), text: m.fmt(raw.text, def) };
  }
}

export const dialogueManager = new DialogueManager();
export function getDialogueManager() { return dialogueManager; }