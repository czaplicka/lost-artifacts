import {
  AgencyStorageScene as AgencyStorageStoryScene,
} from './AgencyStorageStoryScene.js';
import {
  AlexMouthAnimation,
  alexMouthSource,
} from './storage/AlexMouthAnimation.js';
import { dialogueText } from '../dialogues/DialogueText.js';
import { DialoguePanel } from '../ui/DialoguePanel.js';
import { DialogUI } from '../ui/DialogUI.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { storageRoomDialogues } from '../storageRoomDialogueService.js';
import { thirdMissionConfig } from '../thirdMissionStoryService.js';
import { fourthMissionConfig } from '../fourthMissionStoryService.js';
import { chapterTwoOpeningConfig } from '../chapterTwoOpeningService.js';

const TRUST_KEY = 'alex_trust';
const START_TRUST = 50;
const PRESS = '"Press Start 2P", "PressStart2P", monospace';

const VOICE_FILES = {
  intro: ['intro'],
  replacement: ['replacement', 'replacement2', 'replacement3'],
  return: ['return', 'return2'],
};

function sameLines(actual, expected) {
  return Array.isArray(expected) &&
    actual.length === expected.length &&
    actual.every((line, index) => line === expected[index]);
}

function getVoiceMode(speaker, lines) {
  if (speaker !== storageRoomDialogues.speaker) return null;

  return Object.keys(VOICE_FILES).find(mode =>
    sameLines(lines, storageRoomDialogues.manual[mode])
  ) ?? null;
}

function readTrust() {
  const stored = MainStoryManager.getSideClue(TRUST_KEY);

  return {
    value: Number.isFinite(stored?.value)
      ? Math.max(0, Math.min(100, Math.round(stored.value)))
      : START_TRUST,
    counted: Array.isArray(stored?.counted) ? stored.counted : [],
  };
}

function addTrustForConversation(lines) {
  const milestone = [
    ['storage_refusal', thirdMissionConfig.alexLines],
    ['storage_crash_account', fourthMissionConfig.conversation],
    ['storage_chapter_two', chapterTwoOpeningConfig.conversation],
  ].find(([, expected]) => sameLines(lines, expected))?.[0];

  if (!milestone) return;

  const trust = readTrust();
  if (trust.counted.includes(milestone)) return;

  MainStoryManager.setSideClue(TRUST_KEY, {
    value: Math.min(100, trust.value + 5),
    counted: [...trust.counted, milestone],
  });
  requestAutosave();
}

// Używa starego odtwarzacza, ale nie tworzy starego panelu ani portretu.
class AlexVoicePlayer extends DialogUI {
  create() {
    this.bodyText = {
      setText: text => this.panel?.showVoiceSubtitle(text),
    };
    this.nextHint = { setAlpha() {} };
  }

  begin(mode, lines) {
    this.stopVoice();
    this.voiceMode = mode;
    this.lines = lines;
    this.currentLineIndex = 0;
    this.isOpen = Boolean(mode);
  }

  showLine() {
    this.panel?.continueAfterVoice();
  }

  finishLines() {
    this.panel?.finishVoicedIntro();
  }

  fallbackToManual(request) {
    if (this.destroyed || !this.isOpen || request !== this.voiceRequest) {
      return;
    }

    super.fallbackToManual(request);
    this.panel?.showManualContinue();
  }

  end() {
    this.isOpen = false;
    this.stopVoice();
    this.voiceMode = null;
    this.lines = [];
  }

  destroy() {
    if (this.destroyed) return;
    this.end();
    this.panel = null;
    super.destroy();
  }
}

class AlexStorageDialogue extends DialoguePanel {
  constructor(hud) {
    super(hud, { depth: 9000, modal: true });

    this.voice = new AlexVoicePlayer(hud);
    this.voice.panel = this;
    this.voiceLineIndex = -1;

    const { lx, lw, py, s } = this.L;
    this.dialWidth = Math.min(110 * s, lw * 0.42);
    this.dialX = lx + lw - this.dialWidth / 2;
    this.dialY = py + 51 * s;
    this.dialRadius = Math.max(1, Math.min(24 * s, this.dialWidth * 0.37));

    this.dial = hud.add.graphics();
    this.root.add(this.dial);
    this.dialLabel = this._txt(
      this.dialX, py + 9 * s, '', PRESS, 7 * s, '#d4af37'
    ).setOrigin(0.5, 0);
  }

  get destroyed() {
    return this._destroyed;
  }

  get isTyping() {
    return this.isOpen && (
      this.mode === 'typing' || Boolean(this.voice?.voiceSound?.isPlaying)
    );
  }

  open({ speaker, lines }, { onClose } = {}) {
    if (this.destroyed || this.isOpen) {
      throw new Error('The Alex dialogue panel is not available.');
    }

    this.voiceLineIndex = -1;
    this.voice.begin(getVoiceMode(speaker, lines), lines);

    try {
      const opened = this.talkOnce(speaker, lines, {
        onClose: () => {
          try {
            addTrustForConversation(lines);
          } catch (error) {
            console.warn('[Alex Storage] Could not save trust:', error);
          }

          onClose?.();
        },
      });

      if (!opened) throw new Error('Could not open the Alex dialogue.');

      this._setTabsVisible(false);
      this.byeBtn.rect.setVisible(false);
      this.byeBtn.text.setVisible(false);

      const { lw, s } = this.L;
      this._fitWidth(
        this.nameText,
        Math.max(1, lw - this.dialWidth - 8 * s),
        14 * s,
        7 * s
      );

      this.drawTrust(readTrust().value);
      return true;
    } catch (error) {
      this.voice.end();
      throw error;
    }
  }

  _showLine(line) {
    const index = ++this.voiceLineIndex;
    const mode = this.voice?.voiceMode;
    const clip = mode ? VOICE_FILES[mode]?.[index] : null;

    super._showLine(line);

    this.speakerText.setText(dialogueText(
      'scenes/storage/AlexMouthAnimation.js',
      't_1a609d7d435a01c0384d'
    )).setVisible(false);

    if (!clip) return;

    // Nagranie ma pierwszeństwo przed efektem wypisywania liter.
    if (this.mode === 'typing') this._finishTyping();

    this.voice.currentLineIndex = index;
    this.voice.playAlexVoice(clip);

    if (this.voice.voiceBusy) this.contArrow.setVisible(false);
  }

  showVoiceSubtitle(text) {
    if (!this.isOpen) return;
    this.body.setText(this._fit(String(text ?? '')));
  }

  showManualContinue() {
    if (!this.isOpen) return;
    this.contArrow.setVisible(
      this.mode === 'waiting' || this.mode === 'endwait'
    );
  }

  continueAfterVoice() {
    if (!this.isOpen) return;
    super._advance();
  }

  finishVoicedIntro() {
    if (!this.isOpen) return;

    // Intro jest jednym nagraniem. Odtwarzacz sam zmienia napisy,
    // więc po jego końcu nie powtarzamy tych samych kwestii ręcznie.
    this.lineQueue.length = 0;
    this._close();
  }

  _advance() {
    if (this.voice?.voiceBusy) {
      if (this.scene.sound?.locked) this.scene.sound.unlock?.();
      return;
    }

    super._advance();
  }

  _close() {
    this.voice?.end();
    super._close();
  }

  drawTrust(value) {
    const g = this.dial;
    const { s } = this.L;
    const x = this.dialX;
    const y = this.dialY;
    const radius = this.dialRadius;

    this.dialLabel.setText(`TRUST ${value}`);
    g.clear();

    [0xb95749, 0xc99042, 0x669d62].forEach((color, index) => {
      const start = Math.PI + index * Math.PI / 3 + 0.035;
      const end = Math.PI + (index + 1) * Math.PI / 3 - 0.035;
      g.lineStyle(Math.max(2, 5 * s), color, 1);
      g.beginPath();
      g.arc(x, y, radius, start, end, false);
      g.strokePath();
    });

    const angle = Math.PI + Math.PI * value / 100;
    const length = Math.max(0, radius - 5 * s);

    g.lineStyle(Math.max(1, 2 * s), 0xf3e7c4, 1);
    g.lineBetween(
      x, y,
      x + Math.cos(angle) * length,
      y + Math.sin(angle) * length
    );
    g.fillStyle(0xd4af37, 1);
    g.fillCircle(x, y, Math.max(1, 3 * s));
  }

  _handleKey(event) {
    if (
      !this.isOpen ||
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)
    ) return;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this._advance();
    }
  }

  destroy() {
    this.voice?.destroy();
    super.destroy();
  }
}

export class AgencyStorageScene extends AgencyStorageStoryScene {
  preload() {
    super.preload();

    const { key, url } = alexMouthSource(this);
    if (!this.textures.exists(key)) {
      this.load.image(key, url);
    }
  }

  create() {
    super.create();
    this.alexMouthAnimation = new AlexMouthAnimation(this);
  }

  startConversation() {
    const hud = this.storageHud;
    const current = this.storageDialog;

    if (
      this.isCurrent() &&
      !this.isLeaving &&
      !this._preparing &&
      !this._conversationOpen &&
      !this._finishing &&
      !this._timelineOpen &&
      this.manualTemplate &&
      hud?.isHudReady &&
      current &&
      !current.isOpen &&
      (
        !(current instanceof AlexStorageDialogue) ||
        current.destroyed ||
        current.scene !== hud
      )
    ) {
      current.onClose = null;
      current.destroy();
      this.storageDialog = new AlexStorageDialogue(hud);
    }

    return super.startConversation();
  }
}