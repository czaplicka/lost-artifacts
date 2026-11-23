import { DialoguePanel } from './DialoguePanel.js';
import { showDialogueBubbles } from './DialogueBubbles.js';
import { getHomeTownTrust, hasHomeTownTrustChoice, applyHomeTownTrustChoice,
  resolveHomeTownTrustDelta } from '../managers/HomeTownTrust.js';

const hasId = value => typeof value === 'string' && value.trim().length > 0;
function normalizeChoice(raw, index) {
  if (Array.isArray(raw)) {
    const [label, action, metadata = {}] = raw;
    const options = typeof metadata === 'string' ? { attitude: metadata } : metadata || {};
    return { ...options, label: String(label ?? ''), action, index };
  }
  if (raw && typeof raw === 'object') {
    return { ...raw, label: String(raw.label ?? ''), action: raw.action ?? raw.onSelect, index };
  }
  return { label: String(raw ?? ''), action: null, attitude: 'neutral', disabled: true, index };
}

class HomeTownView extends DialoguePanel {
  constructor(scene, data, onLeave) {
    super(scene, { depth: data.depth ?? 5000, modal: true });
    this.onLeave = onLeave;
    this.topics = [];
    this.pages = [''];
    this.pageIndex = 0;
    this.isOpen = true;
    this.nameText.setText(String(data.title || '').toUpperCase());
    this.roleText.setText(String(data.role ?? ''));
    this.numText.setText('').setVisible(false);
    this.toneObjs.forEach(object => object.setVisible(false));
    this.speakerText.setVisible(false);
    this._setTabsVisible(false);
    this.choiceTitle.setText('YOUR REPLY:').setVisible(true);
    this.byeBtn.text.setText('ESC   LEAVE');
    this.pageLabel = this._txt(this.L.lx, this.L.py + this.L.ph - 30 * this.L.s,
      '', 'SpecialElite', 12 * this.L.s, '#d4af37');
    this.setTrust(null);
    this._setEntries([]);
    this._show();
    const messages = Array.isArray(data.messages) && data.messages.length
      ? data.messages : [{ speaker: 'npc', text: String(data.text ?? '') }];
    showDialogueBubbles(this, messages);
    const renderBubbles = this.renderTextPage.bind(this);
    const replaceLabel = () => {
      if (this.pageLabel.text.startsWith('WITNESS  ')) {
        this.pageLabel.setText(this.pageLabel.text.replace('WITNESS  ',
          `${String(data.title || 'NPC').toUpperCase()}  `));
      }
    };
    this.renderTextPage = () => { renderBubbles(); replaceLabel(); };
    replaceLabel();
  }
  get isTyping() { return this.mode === 'typing'; }
  get textPage() { return this.pageIndex; }
  get choicePage() { return Math.floor(this.scroll / this.rows.length); }
  get textPages() { return this.pages.map(text => ({ text })); }
  get pageText() { return this.pages[this.pageIndex] || ''; }

  setTrust(info) {
    this.meterObjs.forEach(object => object.setVisible(false));
    this.numText.setText('').setVisible(false);
    const visible = Boolean(info);
    const L = this.L;
    this._fitWidth(this.nameText,
      Math.max(20 * L.s, visible ? L.lw - 205 * L.s : L.lw), 14 * L.s, 7 * L.s);
    if (!visible) { this.levelText.setText(''); return; }
    this.levelText.setText(`TRUST: ${info.level.label}`).setColor(info.level.hex)
      .setPosition(L.lx + L.lw, L.py + 20 * L.s).setOrigin(1, 0).setVisible(true);
    this._fitWidth(this.levelText, Math.max(20 * L.s, Math.min(195 * L.s, L.lw * 0.55)),
      9 * L.s, 5 * L.s);
  }
  renderTextPage() {
    if (!this.isOpen || this._destroyed) return;
    this._cancelTyper();
    this._full = this.pageText;
    this._idx = 0;
    this.body.setText('');
    this.contArrow.setVisible(false);
    this._setMode('typing');
    this._tick();
  }
  _afterLines() {
    this._setMode('choices');
    this.contArrow.setVisible(this.pageIndex < this.pages.length - 1);
  }
  _listActive() { return this.isOpen; }
  setTopics(topics, { preservePage = false } = {}) {
    this.topics = topics;
    if (!preservePage) this.scroll = 0;
    this._setEntries(topics.map(topic => ({ label: topic.label,
      disabled: topic.state === 'disabled',
      style: topic.state === 'disabled' ? 'locked' : topic.state === 'used' ? 'asked' : 'new' })));
  }
  _pickIndex(index) {
    if (!this.isOpen || this._destroyed || this._entries[index]?.disabled) return;
    this.topics[index]?.onSelect?.();
  }
  _advance() {
    if (!this.isOpen) return;
    if (this.isTyping) { this._finishTyping(); return; }
    if (this.pageIndex < this.pages.length - 1) {
      this.pageIndex += 1;
      this.renderTextPage();
    } else {
      this.advanceAfterPages?.();
    }
  }
  previousPage() {
    if (!this.isOpen || this.pageIndex <= 0) return;
    this.pageIndex -= 1;
    this.renderTextPage();
  }
  _goodbye() { if (this.isOpen) this.onLeave?.(); }
  _handleKey(event) {
    if (!this.isOpen || this._destroyed || event.ctrlKey || event.metaKey || event.altKey ||
      event.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
    const key = event.key;
    if (!['Escape', ' ', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key) &&
      !/^[0-6]$/.test(key)) return;
    event.preventDefault?.();
    if (event.repeat) return;
    if (key === 'Escape' || key === '0') this._goodbye();
    else if ([' ', 'Enter', 'ArrowRight'].includes(key)) this._advance();
    else if (key === 'ArrowLeft') this.previousPage();
    else if (key === 'ArrowUp' || key === 'ArrowDown') this._scrollBy(key === 'ArrowUp' ? -1 : 1);
    else if (this.isTyping) this._finishTyping();
    else this._pickIndex(this.scroll + Number(key) - 1);
  }
}

export class HomeTownDialogue {
  constructor(scene, onClose = () => {}) {
    this.scene = scene;
    this.onClose = onClose;
    this.root = null;
    this.panel = null;
    this.data = null;
    this.seen = new Set();
    this.destroyed = false;
    this.choosing = false;
    this.dispose = () => this.destroy();
    this.resize = () => this.draw();
    scene.events.once('shutdown', this.dispose);
    scene.events.once('destroy', this.dispose);
    scene.scale.on('resize', this.resize);
  }
  get typing() { return Boolean(this.panel?.isTyping); }
  get textPage() { return this.panel?.textPage || 0; }
  get menuPage() { return this.panel?.choicePage || 0; }
  get body() { return this.panel?.body || null; }
  get footer() { return this.panel?.pageLabel || null; }
  get pages() { return this.panel?.pages || []; }
  get pageText() { return this.panel?.pageText || ''; }
  get trustEnabled() {
    return Boolean(this.data && this.data.showTrust !== false && hasId(this.data.npcId));
  }
  shouldScoreChoice(choice) {
    if (!this.data || !hasId(this.data.npcId) || this.data.scoreTrust === false ||
      choice.scoreTrust === false) return false;
    return resolveHomeTownTrustDelta(choice, this.data.trustReactions) !== 0;
  }
  stop() { if (this.panel?.isTyping) this.panel._finishTyping(); }
  clear() { this.panel?.destroy(); this.panel = null; this.root = null; }
  show(data = {}) {
    if (this.destroyed) return null;
    this.clear();
    this.data = { title: '', text: '', choices: [], ...data };
    if (!Array.isArray(this.data.choices)) this.data.choices = [];
    if (hasId(this.data.npcId)) this.data.npcId = this.data.npcId.trim();
    this.panel = new HomeTownView(this.scene, this.data, () => this.close());
    const panel = this.panel;
    const activeData = this.data;
    panel.advanceAfterPages = () => {
      if (this.panel === panel && panel.isOpen) activeData.onAdvance?.();
    };
    this.root = panel.root;
    this.refreshTrust();
    this.updateTopics();
    this.data.onDraw?.(this);
    return this.root;
  }
  refreshTrust() {
    if (!this.panel?.isOpen) return;
    this.panel.setTrust(this.trustEnabled
      ? getHomeTownTrust(this.data.npcId, this.data.startTrust) : null);
  }
  getChoiceId(choice) {
    return hasId(choice.id) ? choice.id.trim()
      : JSON.stringify([this.data.nodeId ?? this.data.title, choice.label]);
  }
  getSeenKey(choiceId) { return JSON.stringify([this.data.npcId ?? '', choiceId]); }
  updateTopics() {
    if (!this.data || !this.panel?.isOpen) return;
    const sourcePanel = this.panel;
    const topics = this.data.choices.map((raw, index) => {
      const choice = normalizeChoice(raw, index);
      const choiceId = this.getChoiceId(choice);
      const seenKey = this.getSeenKey(choiceId);
      const scoring = this.shouldScoreChoice(choice);
      const used = this.seen.has(seenKey) || (scoring &&
        hasHomeTownTrustChoice(this.data.npcId, choiceId));
      const disabled = choice.disabled === true || choice.state === 'disabled' ||
        typeof choice.action !== 'function';
      return { id: choiceId, label: choice.label,
        state: disabled ? 'disabled' : used || choice.state === 'used' ? 'used' : 'normal',
        onSelect: () => {
          if (this.choosing || this.destroyed || this.panel !== sourcePanel ||
            !sourcePanel.isOpen || disabled) return;
          const data = this.data;
          this.choosing = true;
          try {
            if (scoring) {
              applyHomeTownTrustChoice({ npcId: data.npcId, choiceId,
                attitude: choice.attitude ?? 'neutral', trustDelta: choice.trustDelta,
                reactions: data.trustReactions, startTrust: data.startTrust });
              this.refreshTrust();
            }
            this.seen.add(seenKey);
            const result = choice.action();
            if (result && typeof result.catch === 'function') {
              result.catch(error => console.error('[HomeTownDialogue] Async choice failed:', error));
            }
          } finally {
            this.choosing = false;
            if (this.panel?.isOpen) { this.refreshTrust(); this.updateTopics(); }
          }
        } };
    });
    sourcePanel.setTopics(topics, { preservePage: true });
  }
  draw() {
    if (this.destroyed || !this.data || !this.panel?.isOpen) return;
    const page = this.textPage, scroll = this.panel.scroll, data = this.data, wasTyping = this.typing;
    this.show(data);
    this.panel.pageIndex = Math.min(page, this.panel.pages.length - 1);
    this.panel.renderTextPage();
    if (!wasTyping) this.panel._finishTyping();
    this.panel.scroll = scroll;
    this.updateTopics();
  }
  type() { this.panel?.renderTextPage(); }
  advance() { this.panel?._advance(); }
  close(notify = true) {
    this.clear(); this.data = null;
    if (notify) this.onClose();
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.close(false);
    this.scene.events.off('shutdown', this.dispose);
    this.scene.events.off('destroy', this.dispose);
    this.scene.scale.off('resize', this.resize);
  }
}
