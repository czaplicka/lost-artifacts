import { dialogueText } from '../../dialogues/DialogueText.js';
import { LocationDialoguePanel } from '../../ui/LocationDialoguePanel.js';
import { audioManager } from '../../managers/AudioManager.js';

const STORE = { seen: new Map(), chosen: new Map() };
const text = id => dialogueText('scenes/CSI/CrimeLabAssistantDialog.js', id);
const pick = list => list[Math.floor(Math.random() * list.length)];
const plural = (n, one, many) => n === 1 ? one : many;
function bucket(map, key) {
  if (!map.has(key)) map.set(key, new Set());
  return map.get(key);
}

// The lab keeps its node/condition/evidence API; only the renderer is shared.
export class CrimeLabAssistantDialog {
  constructor(scene) {
    this.scene = scene;
    this.view = null;
    this.dialogue = null;
    this.currentNodeId = null;
    this.renderedNodeId = null;
    this.extension = null;
    this.onClose = null;
    this.destroyed = false;
    this.isClosing = false;
    this.choicePage = 0;
    this.fullText = '';
    this.portraitLoad = null;
    this.boundShutdown = () => this.destroy();
  }
  get container() { return this.view?.root || null; }
  get bodyText() { return this.view?.text || null; }
  get isTyping() { return Boolean(this.view?.isTyping); }
  get textPage() { return this.view?.textPage || 0; }
  get pageChoices() { return this.view?.pageTopics.map(topic => topic.choice) || []; }
  isOpen() { return !this.destroyed && Boolean(this.view?.isOpen); }
  getCaseKey() { return String(this.scene?.labManager?.getCaseKey?.() ?? this.scene?.cityId ?? 'default'); }
  open({ dialogue, startNodeId = null, onClose = null } = {}) {
    if (this.destroyed || this.isOpen() || !dialogue?.nodes) return false;
    const start = startNodeId || dialogue.defaultNodeId;
    if (!start || !dialogue.nodes[start]) return false;
    this.dialogue = { ...dialogue, nodes: Object.fromEntries(Object.entries(dialogue.nodes)
      .map(([id, node]) => [id, { ...node, choices: (node.choices || []).map(choice => ({ ...choice })) }])) };
    this.currentNodeId = start;
    this.renderedNodeId = null;
    this.choicePage = 0;
    this.onClose = typeof onClose === 'function' ? onClose : null;
    this.isClosing = false;
    const key = this.getCaseKey();
    this.seen = bucket(STORE.seen, key);
    this.chosen = bucket(STORE.chosen, key);
    this.view = new LocationDialoguePanel(this.scene, {
      depth: 3000, modal: true, keyboard: true, lockTopicsUntilRead: true,
      onLeave: () => this.close(),
      onMenuPageChange: page => { this.choicePage = page; }
    });
    this.scene.events.once('shutdown', this.boundShutdown);
    this.scene.events.once('destroy', this.boundShutdown);
    this.renderCurrentNode();
    this.ensurePortrait();
    return true;
  }
  ensurePortrait() {
    const s = this.scene, key = 'portrait_CSI';
    if (s.textures.exists(key) || this.portraitLoad) return;
    const loader = s.load, event = `filecomplete-image-${key}`;
    const ready = () => {
      this.cancelPortraitLoad();
      if (this.isOpen()) this.view.renderSpeaker();
    };
    const failed = file => { if (file.key === key) this.cancelPortraitLoad(); };
    this.portraitLoad = { loader, event, ready, failed };
    loader.once(event, ready); loader.on('loaderror', failed);
    loader.image(key, 'assets/portraits/csi.webp');
    if (!loader.isLoading()) loader.start();
  }
  cancelPortraitLoad() {
    const load = this.portraitLoad;
    if (!load) return;
    load.loader.off(load.event, load.ready); load.loader.off('loaderror', load.failed);
    this.portraitLoad = null;
  }
  getContext() { return this.scene?.getAssistantDialogueContext?.() || {}; }
  interpolate(value, ctx) {
    return String(value || '').replace(/\{(artifact|city|remaining|pending|hours|completed|total|onboarding)\}/g,
      (match, key) => ctx[key] != null ? String(ctx[key]) : match)
      .replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
  }
  hasSeen(nodeId) { return Boolean(this.seen?.has(nodeId)); }
  markSeen(nodeId) { this.seen?.add(nodeId); }
  resolveNodeText(node) {
    const ctx = this.getContext();
    let raw = node.firstText && !this.hasSeen(this.currentNodeId) ? node.firstText : node.text;
    if (raw == null || Array.isArray(raw) && !raw.length) raw = node.firstText ?? '';
    const base = Array.isArray(raw) ? pick(raw) : String(raw);
    const dynamic = [].concat(node.dynamic || []).map(key => this.resolveDynamicText(key, ctx)).filter(Boolean);
    return this.interpolate([String(base || '').trim(), ...dynamic].filter(Boolean).join('\n\n'), ctx);
  }
  resolveDynamicText(key, ctx) {
    switch (key) {
      case 'assistant_results': return this.getAssistantResultsText();
      case 'remaining_work': return this.getRemainingWorkText();
      case 'time_cost': return this.getTimeCostText(ctx);
      case 'progress_verdict': return this.getProgressVerdictText(ctx);
      default: return '';
    }
  }
  getAssistantResultsText() {
    const summaries = this.scene?.getAssistantResultSummaries?.() || [];
    if (!summaries.length) return (this.scene?.getPendingAssistantCount?.() || 0)
      ? pick([text('t_32fffe82bc2e53aa6ecd'), text('t_3a5852aac6b0986e7348')])
      : pick([text('t_40c755d9880ed14b1672'), text('t_2f45d446c4e010a0c9af')]);
    return summaries.map(result => `• ${result.label}\n${result.text}`).join('\n\n');
  }
  getRemainingWorkText() {
    const remaining = this.scene?.getRemainingAnalysisCount?.() ?? 0;
    const pending = this.scene?.getPendingAssistantCount?.() ?? 0;
    const line = remaining > 1 ? `${remaining}${text('t_6b1fd29009b2eb28e0c7')}` : remaining === 1
      ? text('t_5f5af2fa5725f708416c') : text('t_9751ce44a985169659e9');
    if (pending) return `${line}${text('t_01ba4719c80b6fe911b0')}${pending}${text('t_4cb80ca8309f49e83b4f')}${plural(pending,
      text('t_82812bc7da9a90351756'), text('t_6b2563c49802652fefa2'))}${text('t_f497f557f53b657cf702')}`;
    return remaining ? line : text('t_1f58ae971d238297163f');
  }
  getTimeCostText(ctx) {
    const hours = Number(ctx.hours) || 0;
    return hours > 0 ? `${text('t_078aae974076e91018f5')}${hours}${text('t_36a9e7f1c95b82ffb997')}${plural(hours,
      'hour', 'hours')}${text('t_064ec361f5d1e6d0ce66')}` : '';
  }
  getProgressVerdictText(ctx) {
    const completed = Number(ctx.completed) || 0, total = Number(ctx.total) || 3;
    if (completed >= total) return pick([text('t_af1c0ce8daf8eb3dfe18'), text('t_3348d77e4b199aca197c')]);
    if (completed === 0) return pick([text('t_77cf7bd12cbcbd868198'), text('t_ee86fc3fd63eac7fd4b4')]);
    return pick([
      `${completed}${text('t_a4282e4b2298b90b56f7')}${total}${text('t_8340181228444c7c5981')}`,
      `${completed}${text('t_1f46dc2625be6d1bef44')}${total}${text('t_2f430e5e0eb80fa43f8b')}`
    ]);
  }
  meetsCondition(condition) {
    if (condition == null || condition === '') return true;
    if (Array.isArray(condition)) return condition.every(item => this.meetsCondition(item));
    let key = String(condition).trim(), negate = false;
    if (key.startsWith('!')) { negate = true; key = key.slice(1); }
    let result = false;
    switch (key) {
      case 'has_assistant_results': result = (this.scene?.getAssistantResultSummaries?.() || []).length > 0; break;
      case 'has_pending_assistant': result = (this.scene?.getPendingAssistantCount?.() || 0) > 0; break;
      case 'has_remaining_work': result = (this.scene?.getRemainingAnalysisCount?.() || 0) > 0; break;
      case 'lab_complete': result = Boolean(this.scene?.isLabComplete?.()); break;
      default: if (key.startsWith('seen:')) result = this.hasSeen(key.slice(5));
    }
    return negate ? !result : result;
  }
  getChoices(node) {
    const base = (node?.choices || []).filter(choice => this.meetsCondition(choice.showIf) &&
      !(choice.once && choice.id && this.chosen?.has(`${this.currentNodeId}:${choice.id}`)));
    let choices = this.extension?.augmentChoices ? this.extension.augmentChoices(this, base) : base;
    if (!Array.isArray(choices)) choices = base;
    return choices.length ? choices : [{ text: text('t_f3daf2941865055833e9'), action: 'close' }];
  }
  renderCurrentNode(instant = false) {
    if (!this.isOpen()) return;
    const node = this.dialogue?.nodes?.[this.currentNodeId];
    if (!node) { this.close(); return; }
    const entering = this.renderedNodeId !== this.currentNodeId;
    if (entering) {
      this.fullText = this.resolveNodeText(node);
      this.renderedNodeId = this.currentNodeId;
      this.choicePage = 0;
      this.markSeen(this.currentNodeId);
    }
    const key = node.portraitKey || this.dialogue.portraitKey || 'portrait_CSI';
    this.view.setSpeaker({ name: node.speaker || text('t_c8e3674bd53680fa2602'),
      portrait: { kind: 'texture', key } });
    if (entering) this.view.setText(this.fullText, { instant });
    this.view.choicePage = this.choicePage;
    this.view.setTopics(this.getChoices(node).map(choice => ({
      id: choice.id, label: choice.text || text('t_31fbef162594de01bab0'), choice,
      state: 'normal', onSelect: () => this.choose(choice)
    })), { preservePage: true });
  }
  choose(choice = {}) {
    if (!this.isOpen() || this.isClosing) return;
    this.playClick();
    if (choice.once && choice.id) this.chosen?.add(`${this.currentNodeId}:${choice.id}`);
    if (this.extension?.handleChoice?.(choice, this) === true) return;
    if (choice.action === 'close') { this.close(); return; }
    if (choice.next && this.dialogue.nodes[choice.next]) {
      this.currentNodeId = choice.next; this.choicePage = 0; this.renderCurrentNode(); return;
    }
    console.warn('[CrimeLabAssistantDialog] Invalid choice:', choice);
  }
  playClick() {
    if (!this.scene.cache.audio.exists('click')) return;
    try { audioManager.playSfx('click', { volume: .25 }); } catch (_) { /* Cosmetic only. */ }
  }
  advance() { this.view?.advance(); }
  finishTyping() { this.view?.completeTypewriter(); }
  stopTypewriter() { this.view?.stopTypewriter(); }
  relayout() { this.view?.relayout(); }
  close() {
    if (this.isClosing || !this.isOpen()) return;
    this.isClosing = true;
    const callback = this.onClose;
    this.onClose = null;
    this.cancelPortraitLoad();
    this.view.destroy(); this.view = null;
    this.scene.events.off('shutdown', this.boundShutdown);
    this.scene.events.off('destroy', this.boundShutdown);
    this.isClosing = false;
    callback?.();
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.onClose = null;
    this.cancelPortraitLoad();
    this.view?.destroy(); this.view = null;
    this.scene.events.off('shutdown', this.boundShutdown);
    this.scene.events.off('destroy', this.boundShutdown);
    this.extension = null;
  }
}
