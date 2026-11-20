import { AlibiScene as AlibiInterviewScene } from './AlibiInterviewScene.js';
import { DialoguePanel } from '../ui/DialoguePanel.js';
import { showDialogueBubbles } from '../ui/DialogueBubbles.js';
import { COOPERATION_LABELS } from '../alibi/AlibiCooperation.js';

const FONT = '"Press Start 2P", "PressStart2P", monospace';

class AlibiDialogueView extends DialoguePanel {
  constructor(scene, { level, onLeave }) {
    super(scene, { depth: 6000, modal: false });
    this.isOpen = true;
    this.onLeave = onLeave;
    this.topics = [];
    this.pages = [''];
    this.pageIndex = 0;
    this.meterObjs.forEach(object => object.setVisible(false));
    this.numText.setVisible(false);
    this.toneObjs.forEach(object => object.setVisible(false));
    this.speakerText.setVisible(false);
    this._setTabsVisible(false);
    this.choiceTitle.setText('INTERVIEW').setVisible(true);
    this.byeBtn.text.setText('RETURN TO CITY');
    const { lx, lw, py, s } = this.L;
    this.dialWidth = Math.min(128 * s, lw * 0.48);
    this.dialX = lx + lw - this.dialWidth / 2;
    this.dialY = py + 53 * s;
    this.dial = scene.add.graphics();
    this.root.add(this.dial);
    this.dialLabel = this._txt(this.dialX, py + 8 * s, '', FONT, 7 * s, '#d4af37').setOrigin(0.5, 0);
    this.pageLabel = this._txt(lx, py + 68 * s, '', FONT, 8 * s, '#d4af37');
    this.drawCooperation(level);
    this._show();
  }
  _bindInput() {
    this._onKey = () => {};
    this._onWheel = (pointer, _over, _dx, dy) => { this._handleWheel(pointer, dy); };
    this.scene.input.on('wheel', this._onWheel);
  }
  drawCooperation(rawLevel) {
    const { s } = this.L;
    const level = Math.max(0, Math.min(3, Math.round(Number(rawLevel) || 0)));
    const radius = Math.max(1, Math.min(23 * s, this.dialWidth * 0.36));
    const x = this.dialX, y = this.dialY, g = this.dial;
    const label = String(COOPERATION_LABELS[level] ?? '').toUpperCase();
    this.dialLabel.setText(label);
    this._fitWidth(this.dialLabel, this.dialWidth, 7 * s, 5 * s);
    g.clear();
    [0xad5249, 0xbc793e, 0xb5a04c, 0x6a9d63].forEach((color, i) => {
      g.lineStyle(Math.max(2, 4 * s), color, 1);
      g.beginPath();
      g.arc(x, y, radius, Math.PI + i * Math.PI / 4 + 0.04,
        Math.PI + (i + 1) * Math.PI / 4 - 0.04, false);
      g.strokePath();
    });
    const angle = Math.PI + (level + 0.5) * Math.PI / 4;
    const length = Math.max(0, radius - 4 * s);
    g.lineStyle(Math.max(1, 2 * s), 0xf3e7c4, 1);
    g.lineBetween(x, y, x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    g.fillStyle(0xd4af37, 1);
    g.fillCircle(x, y, Math.max(1, 3 * s));
  }
  setSpeaker(name) {
    const { lw, s } = this.L;
    this.nameText.setText(String(name || 'Witness').toUpperCase());
    this._fitWidth(this.nameText, Math.max(1, lw - this.dialWidth - 6 * s), 14 * s, 7 * s);
  }
  setInterviewText(value) {
    const { s, bodyH } = this.L;
    const size = Math.max(1, 16 * s), spacing = 4 * s;
    this._cancelTyper();
    this.body.setFontSize(size).setLineSpacing(spacing);
    const rows = this.body.getWrappedText(String(value ?? ''));
    const rowsPerPage = Math.max(1, Math.floor(bodyH / (size * 1.45 + spacing)));
    this.pages = [];
    for (let i = 0; i < rows.length; i += rowsPerPage) {
      this.pages.push(rows.slice(i, i + rowsPerPage).join('\n'));
    }
    if (!this.pages.length) this.pages.push('');
    this.pageIndex = 0;
    this.renderTextPage();
  }
  setInterviewMessages(messages) {
    this._cancelTyper();
    showDialogueBubbles(this, messages);
  }
  renderTextPage() {
    this._cancelTyper();
    this._curKind = 'say';
    this._full = this.pages[this.pageIndex] ?? '';
    this._idx = 0;
    this.body.setText('');
    this.contArrow.setVisible(false);
    this.pageLabel.setText(this.pages.length > 1 ? `TEXT ${this.pageIndex + 1}/${this.pages.length}` : '');
    this._setMode('typing');
    this._tick();
  }
  _afterLines() {
    this._setMode('choices');
    this.contArrow.setVisible(this.pageIndex < this.pages.length - 1);
  }
  _listActive() { return this.isOpen; }
  setTopics(topics) {
    this.topics = topics;
    this.scroll = 0;
    this._setEntries(topics.map(topic => ({ label: topic.label,
      disabled: topic.state === 'disabled',
      style: topic.state === 'disabled' ? 'locked' : topic.state === 'used' ? 'asked' : 'new'
    })));
  }
  _drawRows() {
    super._drawRows();
    const { s, rw, rowH } = this.L;
    this.rows.forEach((row, i) => {
      if (!this._entries[this.scroll + i]) return;
      const width = Math.max(1, rw - 64 * s), maxHeight = Math.max(1, rowH - 5 * s);
      let size = 14 * s;
      row.label.setWordWrapWidth(width, true).setLineSpacing(0).setFontSize(size);
      while (row.label.height > maxHeight && size > 8 * s) {
        size -= s; row.label.setFontSize(size);
      }
    });
  }
  _pickIndex(index) {
    if (!this.isOpen || this._entries[index]?.disabled) return;
    this.topics[index]?.onSelect?.();
  }
  _advance() {
    if (!this.isOpen) return;
    if (this.mode === 'typing') { this._finishTyping(); return; }
    if (this.pageIndex < this.pages.length - 1) { this.pageIndex += 1; this.renderTextPage(); }
  }
  previousTextPage() {
    if (!this.isOpen || this.pageIndex <= 0) return;
    this.pageIndex -= 1; this.renderTextPage();
    if (this.mode === 'typing') this._finishTyping();
  }
  _goodbye() { if (this.isOpen) this.onLeave?.(); }
  handleInterviewKey(event) {
    if (!this.isOpen || event.ctrlKey || event.metaKey || event.altKey || event.target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
    const key = event.key;
    if (event.code === 'Space' || key === ' ' || key === 'Enter') {
      event.preventDefault(); if (!event.repeat) this._advance();
    } else if (key === 'Escape') {
      event.preventDefault(); if (!event.repeat) this._goodbye();
    } else if (key === 'ArrowLeft') {
      event.preventDefault(); if (!event.repeat) this.previousTextPage();
    } else if (key === 'ArrowUp' || key === 'ArrowDown') {
      event.preventDefault(); this._scrollBy(key === 'ArrowUp' ? -1 : 1);
    } else if (/^[1-6]$/.test(key) && !event.repeat) {
      this._pickIndex(this.scroll + Number(key) - 1);
    }
  }
}

export class AlibiScene extends AlibiInterviewScene {
  create() {
    super.create();
    if (this.input.keyboard) {
      this.trackInputEvent(this.input.keyboard, 'keydown', event => {
        this.dialoguePanel?.handleInterviewKey?.(event);
      });
    }
  }
  layout() {
    const layout = super.layout();
    const scale = layout.h / 720;
    const panelHeight = Math.max(layout.panelHeight, 320 * scale);
    return { ...layout, panelHeight, panelY: Math.max(0, layout.h - panelHeight) };
  }
  renderWitness() {
    if (this.L.panelY < 180) return;
    const lines = this.witnessContext().slice(0, 4);
    const object = this.text(28, 98, lines.join('\n'), this.L.w - 56, {
      fontSize: this.L.narrow ? '16px' : '22px'
    });
    this.fitText(object, Math.max(28, this.L.panelY - 146), 12);
  }
  renderReply() {
    const entry = this.entry || { witness: this.view.personality.opening };
    const heading = this.historyIndex >= 0 ? 'INTERVIEW HISTORY'
      : this.view.state.pendingChallenge ? 'FOLLOW-UP REQUIRED' : 'CURRENT EXCHANGE';
    const notes = [entry.note ? `NOTE: ${entry.note}` : '', ...this.guidance,
      this.interviewStatus(), ...(this.L.panelY < 180 ? [this.witnessContext().join('\n')] : [])
    ].filter(Boolean).join('\n\n');
    const messages = [
      { speaker: 'note', text: heading },
      ...(entry.detective ? [{ speaker: 'player', text: `YOU: ${entry.detective}` }] : []),
      { speaker: 'npc', text: `WITNESS: ${entry.witness || ''}` },
      ...(notes ? [{ speaker: 'note', text: notes }] : [])
    ];
    const panel = new AlibiDialogueView(this, {
      level: this.view.state.level, onLeave: () => { void this.returnToCity(); }
    });
    this.dialoguePanel = panel;
    panel.setSpeaker(this.testimony.role || 'Witness');
    panel.setInterviewMessages(messages);
    panel.setTopics([...this.actionTopics, ...this.operationTopics].map(topic => ({
      ...topic, onSelect: () => {
        if (this.dialoguePanel === panel && topic.state !== 'disabled' &&
          !this.isLeaving && !this.isSaving && !this._cleanupDone) topic.onSelect?.();
      }
    })));
  }
}
