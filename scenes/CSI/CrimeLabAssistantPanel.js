import {
  CrimeLabAssistantDialog as CrimeLabAssistantDialogBase,
} from './CrimeLabAssistantDialogBase.js';
import { DialoguePanel } from '../../ui/DialoguePanel.js';
import { audioManager } from '../../managers/AudioManager.js';
import { MainStoryManager } from '../../managers/MainStoryManager.js';
import { requestAutosave } from '../../gameStatePersistence.js';

const TRUST_KEY = 'csi_assistant_trust';

function readTrust() {
  const saved = MainStoryManager.getSideClue(TRUST_KEY);
  return {
    value: Number.isFinite(saved?.value)
      ? Math.max(0, Math.min(100, Math.round(saved.value)))
      : 50,
    creditedCases: Array.isArray(saved?.creditedCases)
      ? saved.creditedCases
      : [],
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
    this.byeBtn.text.setText('ESC   LEAVE');
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
      '"Press Start 2P", "PressStart2P", monospace',
      7 * s, '#d4af37'
    ).setOrigin(0.5, 0);

    this.drawTrust(readTrust().value);
    this._show();
  }

  get isTyping() {
    return this.mode === 'typing';
  }

  drawTrust(value) {
    const { s } = this.L;
    const x = this.dialX;
    const y = this.dialY;
    const radius = this.dialRadius;

    this.dialLabel.setText(`TRUST ${value}`);
    this.dial.clear();

    [0xb95749, 0xc99042, 0x669d62].forEach((color, i) => {
      this.dial.lineStyle(Math.max(2, 5 * s), color, 1);
      this.dial.beginPath();
      this.dial.arc(
        x, y, radius,
        Math.PI + i * Math.PI / 3 + 0.035,
        Math.PI + (i + 1) * Math.PI / 3 - 0.035,
        false
      );
      this.dial.strokePath();
    });

    const angle = Math.PI + Math.PI * value / 100;
    const length = Math.max(0, radius - 5 * s);

    this.dial.lineStyle(Math.max(1, 2 * s), 0xf3e7c4, 1);
    this.dial.lineBetween(
      x, y,
      x + Math.cos(angle) * length,
      y + Math.sin(angle) * length
    );
    this.dial.fillStyle(0xd4af37, 1);
    this.dial.fillCircle(x, y, Math.max(1, 3 * s));
  }

  setSpeaker({ name }) {
    const { lw, s } = this.L;
    this.nameText.setText(String(name ?? '').toUpperCase());
    this._fitWidth(
      this.nameText, Math.max(1, lw - this.dialWidth - 8 * s),
      14 * s, 7 * s
    );
  }

  setText(value, { instant = false } = {}) {
    const { s, bodyH } = this.L;
    const fontSize = Math.max(1, 16 * s);
    const spacing = 5 * s;

    this._cancelTyper();
    this.body.setFontSize(fontSize).setLineSpacing(spacing);

    const lines = this.body.getWrappedText(String(value ?? ''));
    const pageSize = Math.max(
      1, Math.floor(bodyH / (fontSize * 1.4 + spacing))
    );

    this.pages = [];
    for (let i = 0; i < lines.length; i += pageSize) {
      this.pages.push(lines.slice(i, i + pageSize).join('\n'));
    }
    if (!this.pages.length) this.pages.push('');

    this.textPage = 0;
    this.renderPage(instant);
  }

  renderPage(instant = false) {
    const { s } = this.L;
    this._cancelTyper();
    this._curKind = 'say';
    this._full = this.pages[this.textPage] ?? '';
    this._idx = 0;
    this.body.setFontSize(Math.max(1, 16 * s)).setText('');
    this.contArrow.setVisible(false);
    this.choiceTitle.setVisible(false);
    this._setMode('typing');
    this._setEntries([]);

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
      ? this.topics.map(topic => ({ label: topic.label, style: 'new' }))
      : []);

    this.pageTopics = ready
      ? this.topics.slice(this.scroll, this.scroll + this.rows.length)
      : [];
  }

  _scrollBy(delta) {
    super._scrollBy(delta);
    this.pageTopics = this.mode === 'choices'
      ? this.topics.slice(this.scroll, this.scroll + this.rows.length)
      : [];
  }

  _pickIndex(index) {
    if (this.isOpen && this.mode === 'choices') {
      this.topics[index]?.onSelect?.();
    }
  }

  _advance() {
    if (!this.isOpen) return;

    if (this.isTyping) {
      this._finishTyping();
    } else if (this.mode === 'waiting') {
      this.textPage += 1;
      this.renderPage();
    }
  }

  advance() {
    this._advance();
  }

  completeTypewriter() {
    if (this.isTyping) this._finishTyping();
  }

  stopTypewriter() {
    if (this.isTyping) this._finishTyping();
  }

  relayout() {
    // DialoguePanel wylicza pozycje podczas otwierania rozmowy.
  }

  _goodbye() {
    if (this.isOpen) this.onLeave?.();
  }

  _handleKey(event) {
    if (
      !this.isOpen ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)
    ) return;

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

export class CrimeLabAssistantDialog extends CrimeLabAssistantDialogBase {
  open(options = {}) {
    if (!super.open(options)) return false;

    // Zachowujemy stan i tekst przygotowane przez istniejącą rozmowę CSI.
    const oldView = this.view;
    const newView = new CsiDialogueView(this.scene, () => this.close());
    oldView.destroy();

    this.view = newView;
    newView.setText(this.fullText);
    this.renderCurrentNode();
    return true;
  }

  ensurePortrait() {
    // W nowym panelu nie wczytujemy ani nie pokazujemy portretu.
  }

  choose(choice = {}) {
    if (!this.isOpen() || this.isClosing) return;

    const credit = isResultsChoice(choice) && this.meetsCondition(choice.showIf);
    const caseKey = this.getCaseKey();

    super.choose(choice);

    if (!credit) return;

    try {
      const trust = readTrust();
      if (trust.creditedCases.includes(caseKey)) return;

      const value = Math.min(100, trust.value + 5);
      MainStoryManager.setSideClue(TRUST_KEY, {
        value,
        creditedCases: [...trust.creditedCases, caseKey],
      });
      requestAutosave();
      this.view?.drawTrust(value);
    } catch (error) {
      console.warn('[CSI Assistant] Could not save trust:', error);
    }
  }

  playSfx(key, volume) {
    if (!key) return;

    try {
      audioManager.init(this.scene);
      audioManager.playSfx(key, {
        gain: volume,
        volume: audioManager.getSfxVolume() * volume,
      });
    } catch {
      // Brak dźwięku nie przerywa rozmowy.
    }
  }
}