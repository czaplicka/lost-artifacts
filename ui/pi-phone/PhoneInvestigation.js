import '../pi-computer/AlibiSearchExpansion.js';
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { discoverSearchKeywords, getSearchProgress } from '../pi-computer/ComputerSearch.js';
import { mergeAlibiSearch, mergeAlibiPhone } from '../pi-computer/AlibiCaseData.js';
import { renderPhoneFieldNotes } from './PhoneFieldNotes.js';
const KEY = 'piPhoneInvestigations';
const clone = value => JSON.parse(JSON.stringify(value));
const safe = value => typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value) && !['__proto__','constructor','prototype'].includes(value);
const sig = ids => [...new Set(ids)].sort().join('|');
export function phoneCaseProgress(id) {
  return gameState[KEY]?.cases?.[id] || { flags: [], completedTopics: [], transcripts: [] };
}
export function eligiblePhoneRule(contact, terms, known, flags) {
  if (!Array.isArray(terms) || !terms.length || terms.length > 2 || new Set(terms).size !== terms.length || !terms.every(id => known.includes(id))) return null;
  return contact.topics.find(topic => sig(topic.terms) === sig(terms) && (topic.requiresFlags || []).every(flag => flags.includes(flag))) || null;
}
export function commitPhoneRule(caseId, topic, lines) {
  const old = phoneCaseProgress(caseId);
  const entry = { topicId: topic.id, lines: clone(lines || topic.lines || []) };
  const next = {
    ...old,
    flags: [...new Set([...(old.flags || []), ...(topic.grantFlags || [])])],
    completedTopics: [...new Set([...(old.completedTopics || []), topic.id])],
    transcripts: [...(old.transcripts || []).filter(t => t.topicId !== topic.id), entry].slice(-30)
  };
  gameState[KEY] = { ...(gameState[KEY] || {}), version: 1, cases: { ...(gameState[KEY]?.cases || {}), [caseId]: next } };
  requestAutosave();
  return next;
}
export function validatePhoneInvestigation(data, search) {
  if (data?.version !== 1 || !Array.isArray(data.contacts) || !Array.isArray(search?.cases)) throw Error('Invalid phone investigation data');
  const ids = new Set(), numbers = new Set();
  for (const contact of data.contacts) {
    if (!safe(contact.id) || ids.has(contact.id) || typeof contact.number !== 'string' || !/^\d{3}$/.test(contact.number) || numbers.has(contact.number)) throw Error('Invalid phone contact');
    ids.add(contact.id); numbers.add(contact.number);
    const definition = search.cases.find(d => d.id === contact.caseId);
    if (!definition || !Array.isArray(contact.topics) || !Array.isArray(contact.greeting) || !Array.isArray(contact.fallback)) throw Error('Incomplete contact');
    const keys = new Set(definition.keywords.map(k => k.id)), topics = new Set();
    const validLines = lines => Array.isArray(lines) && lines.length && lines.every(line => {
      if (typeof line.text !== 'string' || !line.text.length) return false;
      if (line.fragments === undefined) return true;
      return Array.isArray(line.fragments) && line.fragments.every(part => typeof part === 'string' || (part && keys.has(part.keywordId) && typeof part.text === 'string')) && line.fragments.map(part => typeof part === 'string' ? part : part.text).join('') === line.text;
    });
    if (!keys.has(contact.requiresKeyword) || !validLines(contact.greeting) || !validLines(contact.fallback)) throw Error('Invalid greeting or gate');
    if (contact.fallbackVariants && !contact.fallbackVariants.every(validLines)) throw Error('Invalid fallback variants');
    for (const topic of contact.topics) {
      if (!safe(topic.id) || topics.has(topic.id) || !Array.isArray(topic.terms) || !topic.terms.length || topic.terms.length > 2 || new Set(topic.terms).size !== topic.terms.length || !topic.terms.every(k => keys.has(k)) || !validLines(topic.lines)) throw Error('Invalid topic');
      topics.add(topic.id);
      if (!(topic.grantKeywords || []).every(k => keys.has(k)) || !(topic.grantFlags || []).every(safe) || !(topic.requiresFlags || []).every(safe)) throw Error('Invalid topic effects');
    }
  }
  return data;
}
export class PhoneInvestigation {
  constructor(phone) {
    Object.assign(this, { phone, data: null, searchData: null, loading: null, error: '', dead: false, active: null, phase: null, pending: null, selected: [], notePage: 0, paper: null, controller: null, fallbackIndex: 0 });
    this.install();
  }
  known(caseId) { return getSearchProgress().cases[caseId]?.known || []; }
  contacts() {
    return (this.data?.contacts || []).filter(c => this.known(c.caseId).includes(c.requiresKeyword)).map(c => ({ id: c.id, number: c.number, name: c.name, listed: true, status: 'available', dialogueId: null }));
  }
  install() {
    const p = this.phone, start = p.startCall.bind(p);
    p.startCall = () => {
      if (this.data || p.contacts.some(c => c.number === p.number)) return start();
      const token = p.run, number = p.number;
      p.state = 'ringing'; p.status = 'Connecting...'; p.render();
      void this.load().then(() => {
        if (this.dead || !p.isOpen || p.destroyed || p.run !== token || p.number !== number) return;
        p.state = 'ready'; start();
      });
    };
    const connect = p.connect.bind(p);
    p.connect = contact => {
      const definition = this.data?.contacts.find(c => c.id === contact.id && this.known(c.caseId).includes(c.requiresKeyword));
      if (!definition) return connect(contact);
      this.active = definition; this.selected = []; this.notePage = 0; this.pending = null;
      p.contactName = definition.name; this.play(definition.greeting, 'greeting');
    };
    const next = p.nextLine.bind(p);
    p.nextLine = () => {
      if (!this.active) return next();
      if (p.state !== 'connected' || p.directoryOpen) return;
      if (p.typingItem) { p.finishTyping(p.typingItem); return; }
      if (this.phase === 'choose') return;
      if (p.lineIndex < p.lines.length - 1) { p.lineIndex++; p.showDialogueLine(); return; }
      if (this.phase === 'response' && this.pending) {
        commitPhoneRule(this.active.caseId, this.pending, p.lines); this.pending = null;
      }
      this.phase = 'choose'; p.lines = []; p.lineIndex = 0; p.clearLog(); p.status = ''; p.render();
    };
    const hang = p.hangUp.bind(p);
    p.hangUp = () => { this.resetCall(); hang(); };
    const finish = p.finishCall.bind(p);
    p.finishCall = message => { this.resetCall(); finish(message); };
    const render = p.render.bind(p);
    p.render = () => {
      render();
      if (this.active && p.isOpen && !p.destroyed && p.built && p.state === 'connected') {
        if (this.phase === 'choose') { p.prompt.setVisible(false); p.statusText.setVisible(true).setText(''); }
        else p.prompt.setText(p.lineIndex >= p.lines.length - 1 ? 'RETURN TO NOTES >' : 'CONTINUE >');
        this.renderPaper();
      } else this.clearPaper();
    };
    const open = p.openDirectory.bind(p);
    p.openDirectory = () => { open(); if (this.paper) p.ui.bringToTop(p.dir); };
    const close = p.closeDirectory.bind(p);
    p.closeDirectory = () => { close(); if (p.isOpen && !p.destroyed) p.render(); };
  }
  async load() {
    if (this.dead || this.data || this.loading) return this.loading;
    this.error = ''; this.controller = new AbortController();
    this.loading = (async () => {
      try {
        const responses = await Promise.all([
          fetch('assets/data/piPhoneInvestigations.json', { signal: this.controller.signal }),
          fetch('assets/data/piSearch.json', { signal: this.controller.signal })
        ]);
        if (responses.some(r => !r.ok)) throw Error(`HTTP ${responses.map(r => r.status).join('/')}`);
        const [rawData, rawSearch] = await Promise.all(responses.map(r => r.json()));
        const data = mergeAlibiPhone(rawData), search = mergeAlibiSearch(rawSearch);
        validatePhoneInvestigation(data, search);
        if (this.dead) return;
        this.data = data; this.searchData = search;
        if (this.phone.isOpen) this.phone.render();
      } catch (error) {
        if (!this.dead && error.name !== 'AbortError') { this.error = 'Investigation contacts unavailable.'; console.error('[PhoneInvestigation]', error); }
      } finally { this.loading = null; }
    })();
    return this.loading;
  }
  play(lines, phase) {
    const p = this.phone;
    p.cancelActivity(); this.phase = phase; p.state = 'connected'; p.lines = clone(lines); p.lineIndex = 0;
    if (phase === 'greeting') p.callStart = p.scene.time.now;
    p.clearLog(); p.status = ''; p.showDialogueLine();
  }
  collectFragment(id, fragments) {
    if (!this.active || this.phone.directoryOpen || !this.phone.isOpen || !['response','replay','greeting'].includes(this.phase)) return false;
    const shown = this.phone.logItems.some(item => !item.typing && item.richDrawn && JSON.stringify(item.fragments) === JSON.stringify(fragments));
    if (!shown || !fragments.some(part => typeof part === 'object' && part.keywordId === id)) return false;
    if (!this.searchData.cases.find(c => c.id === this.active.caseId)?.keywords.some(k => k.id === id)) return false;
    discoverSearchKeywords(this.active.caseId, [id]); this.phone.render(); return true;
  }
  blockedResponse(flags) {
    if (this.active.caseId !== 'borrowed_alibi') return null;
    const candidate = this.active.topics.find(t => sig(t.terms) === sig(this.selected));
    if (!candidate) return null;
    const missing = (candidate.requiresFlags || []).filter(f => !flags.includes(f));
    if (!missing.length) return null;
    if (missing.includes('receipt_received')) return [{ speaker: 'You', text: 'I have a matching account, but I still need Arthur’s authorised restaurant record before I can support this challenge.' }];
    if (missing.includes('no_hot_food')) return [{ speaker: 'You', text: 'I should confirm Tuesday service with the restaurant before claiming that this meal could not have happened.' }];
    if (missing.includes('club_sample_received')) return [{ speaker: 'You', text: 'I should obtain the original demonstration rather than rely on a reference alone.' }];
    if (missing.includes('evelyn_confronted')) return [{ speaker: 'You', text: 'First I need to put the evidence about the dinner account to Evelyn. Then I can follow up on the incident.' }];
    return [{ speaker: 'You', text: 'I have not established the earlier part of this question yet. I should check my documents and start with the dinner account.' }];
  }
  ask() {
    if (!this.active || this.phase !== 'choose' || !this.selected.length || this.phone.directoryOpen) return false;
    const progress = phoneCaseProgress(this.active.caseId);
    const topic = eligiblePhoneRule(this.active, this.selected, this.known(this.active.caseId), progress.flags || []);
    const definition = this.searchData.cases.find(c => c.id === this.active.caseId);
    const question = this.selected.map(id => definition.keywords.find(k => k.id === id)?.label || id).join(' + ');
    const blocked = !topic ? this.blockedResponse(progress.flags || []) : null;
    const variants = this.active.fallbackVariants?.length ? this.active.fallbackVariants : [this.active.fallback];
    const reply = blocked || variants[this.fallbackIndex % variants.length];
    if (!topic) this.fallbackIndex++;
    const lines = topic ? topic.lines : blocked || [{ speaker: 'You', text: `I wanted to ask about ${question}.` }, ...reply];
    this.pending = topic || { id: 'general_enquiry', grantFlags: [], lines };
    this.play(lines, 'response'); return true;
  }
  replay() {
    if (!this.active || this.phase !== 'choose' || this.phone.directoryOpen) return;
    const entries = phoneCaseProgress(this.active.caseId).transcripts || [];
    const last = entries[entries.length - 1];
    if (last?.lines?.length) this.play(last.lines, 'replay');
  }
  select(id) {
    if (this.phase !== 'choose' || this.phone.directoryOpen || !this.known(this.active.caseId).includes(id)) return;
    if (this.selected.includes(id)) this.selected = this.selected.filter(k => k !== id);
    else if (this.selected.length < 2) this.selected.push(id);
    this.phone.render();
  }
  clearPaper() { this.paper?.destroy(true); this.paper = null; }
  renderPaper() { return renderPhoneFieldNotes.call(this); }
  resetCall() { this.active = null; this.phase = null; this.pending = null; this.selected = []; this.clearPaper(); }
  destroy() { this.dead = true; this.resetCall(); this.controller?.abort(); }
}
