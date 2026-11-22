import { dialogueText } from '../../dialogues/DialogueText.js';
import { DialoguePanel } from '../../ui/DialoguePanel.js';
import { showDialogueBubbles } from '../../ui/DialogueBubbles.js';
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

class CsiDialogueView extends DialoguePanel {
  constructor(scene, onLeave) {
    super(scene, { depth: 3000, modal: true });
    this.onLeave = onLeave;
    this.text = this.body;
    this.topics = [];
    this.pageTopics = [];
    this.pages = [];
    this.textPage = 0;
    this.choicePage = 0;
    this.isOpen = true;

    this.meterObjs.forEach(object => object.setVisible(false));
    this.numText.setVisible(false);
    this.toneObjs.forEach(object => object.setVisible(false));
    this._setTabsVisible(false);
    this.choiceTitle.setText('YOUR REPLY:').setVisible(false);
    this.byeBtn.text.setText('EXIT LAB');
    this._setEntries([]);

    const { lx, lw, py, s } = this.L;
    this.dialWidth = Math.min(105 * s, lw * 0.38);
    this.dialX = lx + lw - this.dialWidth / 2;
    this.dialY = py + 51 * s;
    this.dialRadius = Math.max(1, Math.min(23 * s, this.dialWidth * 0.38));
    this.dial = scene.add.graphics();
    this.root.add(this.dial);
    this.dialLabel = this._txt(
      this.dialX, py + 9 * s, '',
      '"Press Start 2P", "PressStart2P", monospace', 7 * s, '#d4af37'
    ).setOrigin(0.5, 0);

    showDialogueBubbles({
      L: this.L,
      scene,
      root: this.root,
      body: this.body,
      pageLabel: { setText() {} },
      renderTextPage() {},
    }, [{ speaker: 'npc', text: '' }]);

    this.drawTrust(readTrust().value);
    this._show();
  }

  get isTyping() { return this.mode === 'typing'; }

  drawTrust(value) {
    value = clampTrust(value);
    const { s } = this.L;
    const x = this.dialX, y = this.dialY, radius = this.dialRadius;
    this.dialLabel.setText(`TRUST ${value}`);
    this.dial.clear();
    [0xb95749, 0xc99042, 0x669d62].forEach((color, i) => {
      this.dial.lineStyle(Math.max(2, 5 * s), color, 1);
      this.dial.beginPath();
      this.dial.arc(x, y, radius,
        Math.PI + i * Math.PI / 3 + 0.035,
        Math.PI + (i + 1) * Math.PI / 3 - 0.035, false);
      this.dial.strokePath();
    });
    const angle = Math.PI + Math.PI * value / 100;
    const length = Math.max(0, radius - 5 * s);
    this.dial.lineStyle(Math.max(1, 2 * s), 0xf3e7c4, 1);
    this.dial.lineBetween(x, y,
      x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    this.dial.fillStyle(0xd4af37, 1);
    this.dial.fillCircle(x, y, Math.max(1, 3 * s));
  }

  setSpeaker({ name }) {
    const { lw, s } = this.L;
    this.nameText.setText(String(name ?? '').toUpperCase());
    this._fitWidth(this.nameText,
      Math.max(1, lw - this.dialWidth - 8 * s), 14 * s, 7 * s);
  }

  setText(value, { instant = false } = {}) {
    const { s, bodyH } = this.L;
    const fontSize = Math.max(1, 16 * s), spacing = 5 * s;
    this._cancelTyper();
    this.body.setFontSize(fontSize).setLineSpacing(spacing);
    const lines = this.body.getWrappedText(String(value ?? ''));
    const pageSize = Math.max(1, Math.floor(bodyH / (fontSize * 1.4 + spacing)));
    this.pages = [];
    for (let i = 0; i < lines.length; i += pageSize) {
      this.pages.push(lines.slice(i, i + pageSize).join('\n'));
    }
    if (!this.pages.length) this.pages.push('');
    this.textPage = 0;
    this.renderPage(instant);
  }

  renderPage(instant = false) {
    this._cancelTyper();
    this._curKind = 'say';
    this._full = this.pages[this.textPage] ?? '';
    this._idx = 0;
    this.body.setFontSize(Math.max(1, 16 * this.L.s)).setText('');
    this.contArrow.setVisible(false);
    this.choiceTitle.setVisible(false);
    this._setMode('typing');
    this._setEntries([]);
    this.pageTopics = [];
    if (instant) this._finishTyping();
    else this._tick();
  }

  _afterLines() {
    const moreText = this.textPage < this.pages.length - 1;
    this._setMode(moreText ? 'waiting' : 'choices');
    this.contArrow.setVisible(moreText);
    this.refreshTopics();
  }

  setTopics(topics, { preservePage = false } = {}) {
    this.topics = topics;
    if (!preservePage) this.scroll = 0;
    this.refreshTopics();
  }

  refreshTopics() {
    const ready = this.mode === 'choices';
    this.choiceTitle.setVisible(ready && this.topics.length > 0);
    this._setEntries(ready
      ? this.topics.map(topic => ({ label: topic.label, style: 'new' })) : []);
    this.pageTopics = ready
      ? this.topics.slice(this.scroll, this.scroll + this.rows.length) : [];
  }

  _scrollBy(delta) {
    super._scrollBy(delta);
    this.pageTopics = this.mode === 'choices'
      ? this.topics.slice(this.scroll, this.scroll + this.rows.length) : [];
  }

  _pickIndex(index) {
    if (this.isOpen && this.mode === 'choices') this.topics[index]?.onSelect?.();
  }

  _advance() {
    if (!this.isOpen) return;
    if (this.isTyping) this._finishTyping();
    else if (this.mode === 'waiting') {
      this.textPage += 1;
      this.renderPage();
    }
  }

  advance() { this._advance(); }
  completeTypewriter() { if (this.isTyping) this._finishTyping(); }
  stopTypewriter() { if (this.isTyping) this._finishTyping(); }
  relayout() {}
  _goodbye() { if (this.isOpen) this.onLeave?.(); }

  _handleKey(event) {
    if (!this.isOpen || event.ctrlKey || event.metaKey || event.altKey ||
      event.target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (!event.repeat) this._goodbye();
      return;
    }
    if (event.code === 'Space' || event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!event.repeat) this._advance();
      return;
    }
    if (event.repeat) return;
    if (/^[1-6]$/.test(event.key)) {
      this._pickIndex(this.scroll + Number(event.key) - 1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      this._scrollBy(event.key === 'ArrowUp' ? -1 : 1);
    }
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
    this.view = new CsiDialogueView(this.scene, () => this.close());
    this.bindExitButton();
    this.scene.events.once('shutdown', this.boundShutdown);
    this.scene.events.once('destroy', this.boundShutdown);
    this.renderCurrentNode();
    return true;
  }

  bindExitButton() {
    const view = this.view;
    const exitButton = view.byeBtn;
    exitButton.text.setText('EXIT LAB');
    exitButton.rect.removeAllListeners('pointerdown');
    let exitRequested = false;
    exitButton.rect.on('pointerdown', (_pointer, _x, _y, event) => {
      event?.stopPropagation?.();
      const lab = this.scene;
      if (exitRequested || !this.isOpen() || this.view !== view ||
        lab.isExitingLab || lab.debugMode || !lab.sys.isActive()) return;
      exitRequested = true;
      this.close();
      lab.exitLab();
    });
  }

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
      text: '"Working together? Sure. I handle the microscopic evidence. You handle the people who insist they were never there."',
      choices: [
        { id: '__csi_respect_work', text: 'I appreciate your work. You catch what the rest of us miss.', next: REL_POSITIVE },
        { id: '__csi_dismiss_work', text: 'Just run the tests. The machines do the clever part.', next: REL_NEGATIVE },
        { id: '__csi_relationship_cancel', text: 'Never mind. Back to the case.', next: root },
      ],
    };
    this.dialogue.nodes[REL_POSITIVE] = {
      text: '*The assistant looks up from the microscope.*\n\n"Thank you. Most people only notice my work when it fails to confirm their theory."\n\n"I would shake your hand, but mine currently counts as evidence."',
      choices: back(),
    };
    this.dialogue.nodes[REL_NEGATIVE] = {
      text: '*The assistant stops writing.*\n\n"Of course. The centrifuge also writes the reports, testifies in court and remembers your name."\n\n"It has asked me not to repeat what it calls you."',
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
