import { dialogueText, formatDialogueText } from '../../dialogues/DialogueText.js';
import { HomeTownDialogue } from '../../ui/HomeTownDialogue.js';
import { getTrustLevel } from '../../managers/TrustManager.js';
import { audioManager } from '../../managers/AudioManager.js';
import { MainStoryManager } from '../../managers/MainStoryManager.js';
import { requestAutosave } from '../../gameStatePersistence.js';

const STORE = { seen: new Map(), chosen: new Map() };
const TRUST_KEY = 'csi_assistant_trust';
const text = id => dialogueText('scenes/CSI/CrimeLabAssistantDialog.js', id);
const pick = list => list[Math.floor(Math.random() * list.length)];
const plural = (n, one, many) => n === 1 ? one : many;
const clampTrust = value => Math.max(0, Math.min(100, Math.round(value)));
const REL_MENU = '__csi_relationship_menu';
const REL_POSITIVE = '__csi_relationship_positive';
const REL_NEGATIVE = '__csi_relationship_negative';
const REL_CHOICES = Object.freeze({
  __csi_respect_work: { delta: 8, next: REL_POSITIVE },
  __csi_dismiss_work: { delta: -8, next: REL_NEGATIVE },
});

function bucket(map, key) {
  if (!map.has(key)) map.set(key, new Set());
  return map.get(key);
}

function readTrust() {
  const raw = MainStoryManager.getSideClue(TRUST_KEY);
  const saved = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    ...saved,
    value: Number.isFinite(saved.value) ? clampTrust(saved.value) : 50,
    creditedCases: Array.isArray(saved.creditedCases) ? [...saved.creditedCases] : [],
    relationshipCases: Array.isArray(saved.relationshipCases)
      ? [...saved.relationshipCases] : [],
  };
}

function isResultsChoice(choice) {
  return [].concat(choice?.showIf ?? []).includes('has_assistant_results');
}

// Adapter istniejącego API laboratorium. Nie rysuje własnego panelu:
// tekst, dymki, strony, przyciski i miernik tworzy HomeTownDialogue.
class CsiDialogueView {
  constructor(scene, onLeave, onExitLab) {
    this.scene = scene;
    this.isOpen = true;
    this.topics = [];
    this.speaker = '';
    this.value = '';
    this.pendingText = true;
    this.instant = false;
    this.savedScroll = 0;
    this.readySignature = null;
    this.boundPanel = null;
    this.exitRequested = false;
    this.onExitLab = onExitLab;
    this.shared = new HomeTownDialogue(scene, () => onLeave?.());
    this.onUpdate = () => this.sync();
    scene.events.on('update', this.onUpdate);
  }

  get root() { return this.shared?.root || null; }
  get text() { return this.shared?.body || null; }
  get isTyping() { return Boolean(this.shared?.typing); }
  get textPage() { return this.shared?.textPage || 0; }
  get pages() { return this.shared?.pages || []; }
  get scroll() { return this.shared?.panel?.scroll ?? this.savedScroll; }
  set scroll(value) {
    this.savedScroll = value;
    if (this.shared?.panel) this.shared.panel.scroll = value;
  }
  get choicePage() { return this.shared?.menuPage || 0; }
  set choicePage(value) {
    this.savedScroll = value * (this.shared?.panel?.rows?.length || 6);
  }
  get pageTopics() {
    if (!this.isReady()) return [];
    return this.topics.slice(this.scroll, this.scroll + (this.shared?.panel?.rows?.length || 6));
  }
  get byeBtn() { return this.shared?.panel?.byeBtn; }

  isReady() {
    return this.isOpen && Boolean(this.shared?.panel) && !this.isTyping &&
      this.textPage >= this.pages.length - 1;
  }

  setSpeaker({ name }) { this.speaker = name; }
  setText(value, { instant = false } = {}) {
    this.value = String(value ?? '');
    this.instant = instant;
    this.pendingText = true;
  }

  setTopics(topics, { preservePage = false } = {}) {
    this.topics = topics;
    if (!preservePage) this.scroll = 0;
    if (this.pendingText || !this.shared.panel) this.render();
    else {
      this.readySignature = null;
      this.sync();
    }
  }

  render() {
    if (!this.isOpen) return;
    this.pendingText = false;
    this.readySignature = null;
    const trust = readTrust().value;
    this.shared.show({
      title: this.speaker,
      text: this.value,
      messages: [{ speaker: 'npc', text: this.value }],
      npcId: 'csi_assistant',
      startTrust: trust,
      showTrust: true,
      scoreTrust: false,
      depth: 3000,
      choices: [],
      onDraw: () => {
        this.readySignature = null;
        this.bindExitButton();
        this.drawTrust(readTrust().value);
        this.sync();
      },
    });
    this.shared.panel.scroll = this.savedScroll;
    if (this.instant) this.shared.stop();
    this.sync();
  }

  sync() {
    if (!this.isOpen || !this.shared?.panel) return;
    this.bindExitButton();
    const panel = this.shared.panel;
    const ready = this.isReady();
    const signature = `${ready}:${this.topics.length}`;
    if (this.readySignature !== signature) {
      this.readySignature = signature;
      this.shared.data.choices = ready ? this.topics.map((topic, index) => ({
        id: topic.id || `csi_choice:${index}`,
        label: topic.label,
        state: topic.state || 'normal',
        scoreTrust: false,
        action: () => { if (this.isReady()) topic.onSelect?.(); },
      })) : [];
      this.shared.updateTopics();
    }
    panel.choiceTitle.setVisible(ready && this.topics.length > 0);
  }

  bindExitButton() {
    const panel = this.shared?.panel;
    if (!panel || this.boundPanel === panel) return;
    this.boundPanel = panel;
    panel.byeBtn.text.setText('EXIT LAB');
    panel.byeBtn.rect.removeAllListeners('pointerdown');
    panel.byeBtn.rect.on('pointerdown', (_pointer, _x, _y, event) => {
      event?.stopPropagation?.();
      const lab = this.scene;
      if (this.exitRequested || !this.isOpen || lab.isExitingLab ||
        lab.debugMode || !lab.sys.isActive()) return;
      this.exitRequested = true;
      this.onExitLab?.();
    });
  }

  drawTrust(value) {
    if (!this.shared?.panel) return;
    const safe = clampTrust(value);
    this.shared.data.startTrust = safe;
    this.shared.panel.setTrust({ value: safe, level: getTrustLevel(safe) });
  }
  advance() { this.shared?.advance(); this.sync(); }
  completeTypewriter() { this.shared?.stop(); this.sync(); }
  stopTypewriter() { this.completeTypewriter(); }
  relayout() { this.shared?.draw(); this.sync(); }
  destroy() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.scene.events.off('update', this.onUpdate);
    this.shared?.destroy();
    this.shared = null;
    this.topics = [];
    this.boundPanel = null;
  }
}

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
    this.relationshipRootId = null;
  }

  get container() { return this.view?.root || null; }
  get bodyText() { return this.view?.text || null; }
  get isTyping() { return Boolean(this.view?.isTyping); }
  get textPage() { return this.view?.textPage || 0; }
  get pageChoices() { return this.view?.pageTopics?.map(topic => topic.choice) || []; }
  isOpen() { return !this.destroyed && Boolean(this.view?.isOpen); }
  getCaseKey() {
    return String(this.scene?.labManager?.getCaseKey?.() ?? this.scene?.cityId ?? 'default');
  }

  open({ dialogue, startNodeId = null, onClose = null } = {}) {
    if (this.destroyed || this.isOpen() || !dialogue?.nodes) return false;
    const start = startNodeId || dialogue.defaultNodeId;
    if (!start || !dialogue.nodes[start]) return false;
    this.dialogue = {
      ...dialogue,
      nodes: Object.fromEntries(Object.entries(dialogue.nodes).map(([id, node]) => [id, {
        ...node,
        choices: (node.choices || []).map(choice => ({ ...choice })),
      }])),
    };
    this.currentNodeId = start;
    this.renderedNodeId = null;
    this.choicePage = 0;
    this.fullText = '';
    this.onClose = typeof onClose === 'function' ? onClose : null;
    this.isClosing = false;
    const key = this.getCaseKey();
    this.seen = bucket(STORE.seen, key);
    this.chosen = bucket(STORE.chosen, key);
    this.installRelationshipNodes();
    this.view = new CsiDialogueView(this.scene, () => this.close(), () => {
      this.close();
      this.scene.exitLab();
    });
    this.scene.events.once('shutdown', this.boundShutdown);
    this.scene.events.once('destroy', this.boundShutdown);
    this.renderCurrentNode();
    return true;
  }

  bindExitButton() { this.view?.bindExitButton(); }
  ensurePortrait() {}

  cancelPortraitLoad() {
    const load = this.portraitLoad;
    if (!load) return;
    load.loader.off(load.event, load.ready);
    load.loader.off('loaderror', load.failed);
    this.portraitLoad = null;
  }

  getContext() { return this.scene?.getAssistantDialogueContext?.() || {}; }
  interpolate(value, ctx) {
    return String(value || '')
      .replace(/\{(artifact|city|remaining|pending|hours|completed|total|onboarding)\}/g,
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
    const dynamic = [].concat(node.dynamic || [])
      .map(key => this.resolveDynamicText(key, ctx)).filter(Boolean);
    return this.interpolate([String(base || '').trim(), ...dynamic].filter(Boolean).join('\n'), ctx);
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
    // One line per result and no blank lines, so the summary fits one dialogue page.
    return summaries.map(result => formatDialogueText(dialogueText("scenes/CSI/CrimeLabAssistantDialog.js", "t_d6030933e483bef2b5e5"), { label: result.label, text: result.text })).join('\n');
  }

  getRemainingWorkText() {
    const remaining = this.scene?.getRemainingAnalysisCount?.() ?? 0;
    const pending = this.scene?.getPendingAssistantCount?.() ?? 0;
    const line = remaining > 1 ? `${remaining}${text('t_6b1fd29009b2eb28e0c7')}`
      : remaining === 1 ? text('t_5f5af2fa5725f708416c') : text('t_9751ce44a985169659e9');
    if (pending) return `${line}${text('t_01ba4719c80b6fe911b0')}${pending}${text('t_4cb80ca8309f49e83b4f')}${plural(pending,
      text('t_82812bc7da9a90351756'), text('t_6b2563c49802652fefa2'))}${text('t_f497f557f53b657cf702')}`;
    return remaining ? line : text('t_1f58ae971d238297163f');
  }

  getTimeCostText(ctx) {
    const hours = Number(ctx.hours) || 0;
    return hours > 0
      ? `${text('t_078aae974076e91018f5')}${hours}${text('t_36a9e7f1c95b82ffb997')}${plural(hours,
        'hour', 'hours')}${text('t_064ec361f5d1e6d0ce66')}` : '';
  }

  getProgressVerdictText(ctx) {
    const completed = Number(ctx.completed) || 0, total = Number(ctx.total) || 3;
    if (completed >= total) return pick([text('t_af1c0ce8daf8eb3dfe18'), text('t_3348d77e4b199aca197c')]);
    if (completed === 0) return pick([text('t_77cf7bd12cbcbd868198'), text('t_ee86fc3fd63eac7fd4b4')]);
    return pick([
      `${completed}${text('t_a4282e4b2298b90b56f7')}${total}${text('t_8340181228444c7c5981')}`,
      `${completed}${text('t_1f46dc2625be6d1bef44')}${total}${text('t_2f430e5e0eb80fa43f8b')}`,
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

  installRelationshipNodes() {
    const root = this.dialogue.defaultNodeId;
    this.relationshipRootId = root && this.dialogue.nodes[root] ? root : null;
    if (!this.relationshipRootId) return;
    const back = () => [{ id: '__csi_relationship_back', text: 'Back to the case.', next: root }];
    this.dialogue.nodes[REL_MENU] = {
      text: '\"Working together? Sure. I handle the microscopic evidence. You handle the people who insist they were never there.\"',
      choices: [
        { id: '__csi_respect_work', text: 'I appreciate your work. You catch what the rest of us miss.', next: REL_POSITIVE },
        { id: '__csi_dismiss_work', text: 'Just run the tests. The machines do the clever part.', next: REL_NEGATIVE },
        { id: '__csi_relationship_cancel', text: 'Never mind. Back to the case.', next: root },
      ],
    };
    this.dialogue.nodes[REL_POSITIVE] = {
      text: '*The assistant looks up from the microscope.*\n\n\"Thank you. Most people only notice my work when it fails to confirm their theory.\"\n\n\"I would shake your hand, but mine currently counts as evidence.\"',
      choices: back(),
    };
    this.dialogue.nodes[REL_NEGATIVE] = {
      text: '*The assistant stops writing.*\n\n\"Of course. The centrifuge also writes the reports, testifies in court and remembers your name.\"\n\n\"It has asked me not to repeat what it calls you.\"',
      choices: back(),
    };
  }

  hasUsedRelationshipChoice() {
    return readTrust().relationshipCases.includes(this.getCaseKey());
  }

  getChoices(node) {
    const base = (node?.choices || []).filter(choice => this.meetsCondition(choice.showIf) &&
      !(choice.once && choice.id && this.chosen?.has(`${this.currentNodeId}:${choice.id}`)));
    let choices = this.extension?.augmentChoices ? this.extension.augmentChoices(this, base) : base;
    if (!Array.isArray(choices)) choices = base;
    choices = [...choices];
    if (this.relationshipRootId && this.currentNodeId === this.relationshipRootId &&
      !this.hasUsedRelationshipChoice() &&
      !choices.some(choice => choice.id === '__csi_relationship_open')) {
      const closeIndex = choices.findIndex(choice => choice.action === 'close');
      choices.splice(closeIndex < 0 ? choices.length : closeIndex, 0, {
        id: '__csi_relationship_open', text: 'About working together...', next: REL_MENU,
      });
    }
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
      this.view.scroll = 0;
    }
    const key = node.portraitKey || this.dialogue.portraitKey || 'portrait_CSI';
    this.view.setSpeaker({
      name: node.speaker || text('t_c8e3674bd53680fa2602'),
      portrait: { kind: 'texture', key },
    });
    if (entering) this.view.setText(this.fullText, { instant });
    this.view.choicePage = this.choicePage;
    this.view.setTopics(this.getChoices(node).map(choice => ({
      id: choice.id, label: choice.text || text('t_31fbef162594de01bab0'), choice,
      state: 'normal', onSelect: () => this.choose(choice),
    })), { preservePage: true });
  }

  choose(choice = {}) {
    if (!this.isOpen() || this.isClosing) return;
    const relationship = REL_CHOICES[choice.id];
    if (relationship) {
      if (this.currentNodeId !== REL_MENU) return;
      if (this.hasUsedRelationshipChoice()) {
        this.currentNodeId = this.relationshipRootId;
        this.renderCurrentNode();
        return;
      }
      const offered = this.getChoices(this.dialogue.nodes[this.currentNodeId])
        .some(item => item.id === choice.id && item.next === relationship.next);
      if (!offered) return;
      if (!this.saveTrustChange(relationship.delta, 'relationshipCases')) return;
    }

    const credit = isResultsChoice(choice) && this.meetsCondition(choice.showIf);
    this.playClick();
    if (choice.once && choice.id) this.chosen?.add(`${this.currentNodeId}:${choice.id}`);
    const handled = this.extension?.handleChoice?.(choice, this) === true;
    if (!handled) {
      if (choice.action === 'close') this.close();
      else if (choice.next && this.dialogue.nodes[choice.next]) {
        this.currentNodeId = choice.next;
        this.choicePage = 0;
        this.renderCurrentNode();
      } else console.warn('[CrimeLabAssistantDialog] Invalid choice:', choice);
    }
    if (credit) this.saveTrustChange(5, 'creditedCases');
  }

  saveTrustChange(delta, listKey) {
    try {
      const saved = readTrust();
      const caseKey = this.getCaseKey();
      if (saved[listKey].includes(caseKey)) return false;
      const value = clampTrust(saved.value + delta);
      MainStoryManager.setSideClue(TRUST_KEY, {
        ...saved,
        value,
        [listKey]: [...saved[listKey], caseKey],
      });
      requestAutosave();
      this.view?.drawTrust(value);
      return true;
    } catch (error) {
      console.warn('[CSI Assistant] Could not save trust:', error);
      return false;
    }
  }

  playClick() {
    if (!this.scene.cache.audio.exists('click')) return;
    try { audioManager.playSfx('click', { volume: 0.25 }); } catch {}
  }

  playSfx(key, volume) {
    if (!key) return;
    try {
      audioManager.init(this.scene);
      audioManager.playSfx(key, {
        gain: volume,
        volume: audioManager.getSfxVolume() * volume,
      });
    } catch {}
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
    this.view.destroy();
    this.view = null;
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
    this.view?.destroy();
    this.view = null;
    this.scene.events.off('shutdown', this.boundShutdown);
    this.scene.events.off('destroy', this.boundShutdown);
    this.extension = null;
  }
}
