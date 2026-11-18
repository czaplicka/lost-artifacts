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

// Reuses only DialogUI's existing audio-loading/voice lifecycle.
// Face-to-face visuals are exclusively rendered by LocationDialoguePanel.
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
      this.view = new LocationDialoguePanel(this.scene, {
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
  // Invoked by the shared panel only after its last text page is complete.
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
