import { DialogUI } from './DialogUI.js';
import { LocationDialoguePanel } from './LocationDialoguePanel.js';
import { storageRoomDialogues } from '../storageRoomDialogueService.js';

const VOICE_FILES = {
  intro: ['intro'], replacement: ['replacement', 'replacement2', 'replacement3'],
  return: ['return', 'return2']
};
function getVoiceMode(entry) {
  if (entry.speaker !== storageRoomDialogues.speaker || !Array.isArray(entry.lines)) return null;
  return Object.keys(VOICE_FILES).find(mode => {
    const expected = storageRoomDialogues.manual[mode];
    return Array.isArray(expected) && expected.length === entry.lines.length &&
      expected.every((line, index) => line === entry.lines[index]);
  }) || null;
}

class LiveBubblePanel extends LocationDialoguePanel {
  constructor(scene, options) {
    super(scene, options);
    this.clearPortrait();
    this.nameText = this.makeText(0, 0, '', 10, '#ffd86b', true);
    this.bubble = scene.add.graphics();
    this.choiceFrames = scene.add.graphics();
    this.root.addAt(this.bubble, this.root.getIndex(this.text));
    this.root.addAt(this.choiceFrames, this.root.getIndex(this.text));
    this.bubbleStyleReady = true;
    this.relayout();
  }
  renderSpeaker() {
    if (!this.bubbleStyleReady) { super.renderSpeaker(); return; }
    if (!this.isOpen) return;
    const L = this.layout;
    this.nameText.setText(this.speaker.name || '').setPosition(L.textX, L.panelY + 22)
      .setFontSize(L.width < 700 ? 8 : 10).setWordWrapWidth(L.textWidth, true);
  }
  relayout() {
    if (!this.bubbleStyleReady) { super.relayout(); return; }
    if (!this.isOpen) return;
    const offset = this.textPages[this.textPage]?.start || 0;
    const { width: w, height: h } = this.scene.scale;
    const small = w < 700, ph = Math.min(h, small ? 340 : 272), y = h - ph;
    const pad = small ? 18 : 26;
    const menu = Math.min(this.options.menuWidth, small ? Math.max(116, w * .35) : w * .28);
    const divider = w - menu - 20, textX = pad + 10;
    this.layout = { width: w, height: h, panelHeight: ph, panelY: y,
      portraitSize: 0, portraitX: pad, portraitY: y + 12, centerX: pad, centerY: y + 12,
      textX, textEndX: divider, menuWidth: menu, menuX: divider + 16,
      textWidth: Math.max(16, (divider - textX - 24) * .88), font: small ? 17 : 22 };
    this.overlay.setSize(w, h);
    this.background.setPosition(0, y).setSize(w, ph);
    this.border.clear().lineStyle(4, 0xd4af37, 1)
      .strokeRect(6, y + 6, Math.max(1, w - 12), Math.max(1, ph - 12))
      .lineStyle(1, 0x8a6d1f, .9)
      .strokeRect(12, y + 12, Math.max(1, w - 24), Math.max(1, ph - 24));
    this.border.lineBetween(divider, y + 16, divider, h - 16);
    this.portraitFrame.clear().setVisible(false);
    this.text.setPosition(textX, y + 58).setFontSize(this.layout.font)
      .setWordWrapWidth(this.layout.textWidth, true).setScale(1);
    this.footer.setPosition(textX, h - 72).setFontSize(small ? 9 : 11)
      .setWordWrapWidth(this.layout.textWidth, true);
    this.previousText.setPosition(textX, h - 37);
    this.pageLabel.setPosition(textX + 28, h - 37);
    this.nextText.setPosition(divider - 24, h - 37);
    this.leaveButton.setPosition(divider + 16, h - 37).setFontSize(small ? 16 : 18)
      .setText(this.options.leaveLabel);
    this.leaveButton.setScale(Math.min(1, Math.max(1, menu - 18) / Math.max(1, this.leaveButton.width)));
    this.renderSpeaker(); this.repaginate(offset); this.renderPage(true); this.renderTopics();
  }
  repaginate(offset = 0) {
    if (!this.bubbleStyleReady) { super.repaginate(offset); return; }
    const height = this.layout.panelHeight;
    this.layout.panelHeight = height - 42;
    try { super.repaginate(offset); } finally { this.layout.panelHeight = height; }
  }
  renderPage(instant = false) {
    if (this.bubbleStyleReady && this.isOpen) {
      const L = this.layout;
      this.bubble.clear().fillStyle(0x2a2012, 1)
        .fillRoundedRect(L.textX - 10, L.panelY + 48, L.textWidth + 20, Math.max(1, L.panelHeight - 102), 8)
        .lineStyle(1, 0xb58a42, 1)
        .strokeRoundedRect(L.textX - 10, L.panelY + 48, L.textWidth + 20, Math.max(1, L.panelHeight - 102), 8);
      this.text.setColor('#f3e7c4');
    }
    super.renderPage(instant);
  }
  clearTopics() {
    this.choiceFrames?.clear();
    super.clearTopics();
  }
  renderTopics() {
    super.renderTopics();
    if (!this.bubbleStyleReady || !this.isOpen) return;
    this.choiceFrames.clear();
    this.pageTopics.forEach((topic, index) => {
      const label = this.topicObjects[index];
      if (!label) return;
      const muted = this.topicsLocked() || topic.state === 'used' || topic.state === 'disabled';
      const x = label.x - 5, y = label.y - 2;
      const width = Math.min(this.layout.menuWidth - 12, Math.max(20, label.displayWidth + 10));
      const height = label.displayHeight + 4;
      this.choiceFrames.fillStyle(muted ? 0x242821 : 0x263729, 1)
        .fillRoundedRect(x, y, width, height, 4)
        .lineStyle(1, muted ? 0x53604e : 0x88b589, 1)
        .strokeRoundedRect(x, y, width, height, 4);
    });
  }
}

// Existing audio lifecycle and dialogue flow are retained.
export class LiveDialogUI extends DialogUI {
  create() {
    this.view = null;
    this.container = null;
    this.overlay = null;
    this.choosing = false;
    this.showingChoices = false;
    this.rendering = false;
    this.keyCapture = null;
    this.bodyText = { setText: value => {
      if (this.view?.isOpen) {
        this.view.setText(value, { instant: true });
        this.updateControls();
      }
      return this.bodyText;
    } };
    this.nextHint = { setAlpha: () => { this.updateControls(); return this.nextHint; } };
  }
  open(entry = {}, options = {}) {
    if (this.destroyed) return false;
    if (typeof LocationDialoguePanel.prototype.advance !== 'function' ||
        typeof LocationDialoguePanel.prototype.renderPage !== 'function') {
      throw new Error('LiveDialogUI requires LocationDialoguePanel from unified dialogues stage 1.');
    }
    if (this.isOpen) this.close(false);
    this.stopVoice();
    ++this.session;
    this.lines = (entry.lines || []).map(line => String(line ?? ''));
    this.currentLineIndex = 0;
    this.choices = [...(options.choices || entry.choices || [])];
    this.onClose = typeof options.onClose === 'function' ? options.onClose : null;
    this.voiceMode = getVoiceMode(entry);
    this.showingChoices = false;
    this.isOpen = true;
    try {
      this.view = new LiveBubblePanel(this.scene, {
        depth: 6000, modal: true, keyboard: true, lockTopicsUntilRead: false,
        leaveLabel: 'Continue', onLeave: () => this.advance(),
        onAdvance: () => this.nextLine(), onTextComplete: () => this.updateControls()
      });
      this.container = this.view.root;
      this.overlay = this.view.overlay;
      const portrait = this.getPortrait(entry.portraitKey);
      this.view.setSpeaker({ name: entry.speaker || 'UNKNOWN', portrait });
      this.captureKeyboard();
      this.showLine(0);
      return true;
    } catch (error) {
      this.close(false);
      throw error;
    }
  }
  captureKeyboard() {
    this.releaseKeyboard();
    if (typeof document === 'undefined') return;
    this.keyCapture = event => {
      if (!this.isOpen || !this.view?.isOpen) return;
      const target = event.target;
      if (event.ctrlKey || event.metaKey || event.altKey || target?.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;
      event.stopImmediatePropagation();
      if (['Enter', 'NumpadEnter', 'Space', 'Escape', 'Tab'].includes(event.code) ||
          /^(?:Digit|Numpad)[1-9]$/.test(event.code)) event.preventDefault();
      if (event.type === 'keydown' && !event.repeat) this.view.onKeyDown(event);
    };
    document.addEventListener('keydown', this.keyCapture, true);
    document.addEventListener('keyup', this.keyCapture, true);
  }
  releaseKeyboard() {
    if (typeof document !== 'undefined' && this.keyCapture) {
      document.removeEventListener('keydown', this.keyCapture, true);
      document.removeEventListener('keyup', this.keyCapture, true);
    }
    this.keyCapture = null;
  }
  getPortrait(requestedKey) {
    const key = requestedKey && this.scene.textures.exists(requestedKey) ? requestedKey : 'portrait_fallback';
    if (key !== 'portrait_magazine' || !this.scene.textures.exists(key)) return { kind: 'texture', key };
    const frame = this.scene.textures.getFrame(key);
    const width = frame.realWidth || frame.width, height = frame.realHeight || frame.height;
    return { kind: 'crop', key, cx: .5, cy: .5, sideFrac: Math.min(width, height) / Math.max(1, height) };
  }
  showLine(index) {
    if (!this.isOpen || this.destroyed) return;
    if (index >= this.lines.length) { this.finishLines(); return; }
    this.currentLineIndex = index;
    this.showingChoices = false;
    this.view.setText(this.lines[index], { instant: Boolean(this.voiceMode) });
    if (this.voiceMode && (this.voiceMode !== 'intro' || index === 0)) {
      this.playAlexVoice(this.voiceMode === 'intro' ? 'intro' : VOICE_FILES[this.voiceMode][index]);
    }
    this.updateControls();
  }
  nextLine() {
    if (!this.isOpen || this.destroyed || this.showingChoices) return;
    if (this.voiceBusy) {
      if (this.scene.sound?.locked) this.scene.sound.unlock?.();
      return;
    }
    this.showLine(this.currentLineIndex + 1);
  }
  advance() {
    if (!this.isOpen || this.destroyed || this.showingChoices) return;
    this.view.advance();
    this.updateControls();
  }
  updateControls() {
    if (!this.isOpen || !this.view?.isOpen || this.rendering) return;
    this.rendering = true;
    try {
      this.isTyping = Boolean(this.view.isTyping);
      const lastLine = this.currentLineIndex >= this.lines.length - 1;
      const label = this.showingChoices ? 'Choose a topic' : this.voiceBusy ? 'Listening...' : lastLine ? 'Leave' : 'Continue';
      this.view.options.leaveLabel = label;
      this.view.createLeaveButton();
      if (this.showingChoices) {
        this.view.setTopics(this.choices.map(choice => ({
          label: choice.text || 'Continue', onSelect: () => this.selectChoice(choice)
        })), { preservePage: true });
      } else this.view.setTopics([{ id: 'continue',
        label: this.voiceBusy ? 'Listening...' : this.view.isTyping ? 'Show text' : 'Continue',
        state: this.voiceBusy && this.view.textPage >= this.view.textPages.length - 1 ? 'disabled' : 'normal',
        onSelect: () => this.advance()
      }]);
    } finally { this.rendering = false; }
  }
  finishLines() {
    this.stopVoice(); this.stopTypewriter();
    if (this.choices.length) this.showChoices(); else this.close();
  }
  showChoices() {
    if (!this.isOpen) return;
    this.stopVoice(); this.stopTypewriter(); this.showingChoices = true;
    this.updateControls();
  }
  selectChoice(choice) {
    if (!this.isOpen || !this.showingChoices || this.choosing) return;
    this.choosing = true;
    const callback = choice?.callback;
    this.choices = [];
    try { this.close(); callback?.(); }
    finally { this.choosing = false; }
  }
  clearChoices() { this.view?.setTopics([]); }
  stopTypewriter() { this.view?.stopTypewriter(); this.isTyping = false; }
  skipTypewriter() { this.view?.completeTypewriter(); this.updateControls(); }
  close(notify = true) {
    this.stopVoice(); this.stopTypewriter(); this.voiceMode = null;
    if (!this.isOpen) return;
    this.isOpen = false; ++this.session;
    this.releaseKeyboard();
    const callback = this.onClose;
    this.onClose = null;
    this.view?.destroy(); this.view = null;
    this.container = null; this.overlay = null;
    this.choices = []; this.showingChoices = false;
    if (notify) callback?.();
  }
  destroy() {
    if (this.destroyed) return;
    this.close(false);
    this.stopVoice();
    this.releaseKeyboard();
    this.unbindSceneLifecycle();
    this.destroyed = true; this.onClose = null;
  }
}
