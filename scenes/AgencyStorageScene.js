import { dialogueText as __dialogueText, dialogueText } from '../dialogues/DialogueText.js';
import { storageRoomDialogues as DIALOGUES } from '../storageRoomDialogueService.js';
import { BaseScene } from './BaseScene.js';
import { LiveDialogUI } from '../ui/LiveDialogUI.js';
import { DialoguePanel } from '../ui/DialoguePanel.js';
import { DialogUI } from '../ui/DialogUI.js';
import { showDialogueBubbles } from '../ui/DialogueBubbles.js';
import { gameState } from '../GameData.js';
import { ItemsLoader } from '../ItemsLoader.js';
import { audioManager } from '../managers/AudioManager.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { saveGameState, requestAutosave } from '../gameStatePersistence.js';
import { ensureAgencyFieldManual, getAgencyManualIssueMode } from '../managers/AgencyManualService.js';
import { thirdMissionConfig, getThirdMissionStory, markAlexRefusal } from '../thirdMissionStoryService.js';
import { fourthMissionConfig, getFourthMissionStory, markAlexCrashAccount } from '../fourthMissionStoryService.js';
import { chapterTwoOpeningConfig, getChapterTwoOpening, markChapterTwoAlexFollowup } from '../chapterTwoOpeningService.js';
import { AlexMouthAnimation, alexMouthSource } from './storage/AlexMouthAnimation.js';

const EMPTY_STORAGE_KEY = 'agency_storage_room_v2';
const MANAGER_STORAGE_KEY = 'agency_storage_manager';
const MANAGER_PORTRAIT_KEY = 'portrait_magazine';
const MANAGER_PORTRAIT_URL = 'assets/portraits/magazine_manager.webp';
const INTRO_LINES = DIALOGUES.manual.intro;
const REISSUE_LINES = DIALOGUES.manual.replacement;
const RETURN_LINES = DIALOGUES.manual.return;
const TRUST_KEY = 'alex_trust';
const START_TRUST = 50;
const PRESS = '"Press Start 2P", "PressStart2P", monospace';
const VOICE_FILES = {
  intro: ['intro'],
  replacement: ['replacement', 'replacement2', 'replacement3'],
  return: ['return', 'return2'],
};

function sameLines(actual, expected) {
  return Array.isArray(expected) && actual.length === expected.length &&
    actual.every((line, index) => line === expected[index]);
}
function getVoiceMode(speaker, lines) {
  if (speaker !== DIALOGUES.speaker) return null;
  return Object.keys(VOICE_FILES).find(mode => sameLines(lines, DIALOGUES.manual[mode])) ?? null;
}
function readTrust() {
  const stored = MainStoryManager.getSideClue(TRUST_KEY);
  return {
    value: Number.isFinite(stored?.value)
      ? Math.max(0, Math.min(100, Math.round(stored.value))) : START_TRUST,
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
    value: Math.min(100, trust.value + 5), counted: [...trust.counted, milestone],
  });
  requestAutosave();
}

class AlexVoicePlayer extends DialogUI {
  create() {
    this.bodyText = { setText: text => this.panel?.showVoiceSubtitle(text) };
    this.nextHint = { setAlpha() {} };
  }
  begin(mode, lines) {
    this.stopVoice();
    this.voiceMode = mode;
    this.lines = lines;
    this.currentLineIndex = 0;
    this.isOpen = Boolean(mode);
  }
  showLine() { this.panel?.continueAfterVoice(); }
  finishLines() { this.panel?.finishVoicedIntro(); }
  fallbackToManual(request) {
    if (this.destroyed || !this.isOpen || request !== this.voiceRequest) return;
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
    this._alexBubbleStyled = false;
    const { lx, lw, py, s } = this.L;
    this.dialWidth = Math.min(110 * s, lw * 0.42);
    this.dialX = lx + lw - this.dialWidth / 2;
    this.dialY = py + 51 * s;
    this.dialRadius = Math.max(1, Math.min(24 * s, this.dialWidth * 0.37));
    this.dial = hud.add.graphics();
    this.root.add(this.dial);
    this.dialLabel = this._txt(this.dialX, py + 9 * s, '', PRESS, 7 * s, '#d4af37').setOrigin(0.5, 0);
    this.skipHint = this._txt(
      this.L.rx, py + this.L.ph - 42 * s,
      'SPACE: Skip conversation\nENTER: Continue',
      '"Special Elite", "Courier New", monospace', 14 * s, '#d4af37',
      { wordWrap: { width: this.L.rw, useAdvancedWrap: true } }
    );
  }
  get destroyed() { return this._destroyed; }
  get isTyping() {
    return this.isOpen && (this.mode === 'typing' || Boolean(this.voice?.voiceSound?.isPlaying));
  }
  open({ speaker, lines }, { onClose } = {}) {
    if (this.destroyed || this.isOpen) throw new Error('The Alex dialogue panel is not available.');
    this.voiceLineIndex = -1;
    this.voice.begin(getVoiceMode(speaker, lines), lines);
    try {
      const opened = this.talkOnce(speaker, lines, {
        onClose: () => {
          try { addTrustForConversation(lines); }
          catch (error) { console.warn('[Alex Storage] Could not save trust:', error); }
          onClose?.();
        },
      });
      if (!opened) throw new Error('Could not open the Alex dialogue.');
      this._setTabsVisible(false);
      this.byeBtn.rect.setVisible(false);
      this.byeBtn.text.setVisible(false);
      const { lw, s } = this.L;
      this._fitWidth(this.nameText, Math.max(1, lw - this.dialWidth - 8 * s), 14 * s, 7 * s);
      this.drawTrust(readTrust().value);
      this.addAlexBubble();
      return true;
    } catch (error) {
      this.voice.end();
      throw error;
    }
  }
  addAlexBubble() {
    if (!this.isOpen || this._alexBubbleStyled) return;
    const initialText = this._full || this.body.text || '';
    const previousText = this.body.text;
    const index = this.root.getIndex(this.body);
    showDialogueBubbles({
      L: this.L, scene: this.scene, root: this.root, body: this.body,
      pageLabel: { setText() {} }, renderTextPage() {},
    }, [{ speaker: 'npc', text: initialText }]);
    this.body.setText(previousText);
    this.root.getAt(index).setVisible(true);
    this._alexBubbleStyled = true;
  }
  _showLine(line) {
    const index = ++this.voiceLineIndex;
    const mode = this.voice?.voiceMode;
    const clip = mode ? VOICE_FILES[mode]?.[index] : null;
    super._showLine(line);
    this.speakerText.setText(dialogueText(
      'scenes/storage/AlexMouthAnimation.js', 't_1a609d7d435a01c0384d'
    )).setVisible(false);
    if (clip) {
      if (this.mode === 'typing') this._finishTyping();
      this.voice.currentLineIndex = index;
      this.voice.playAlexVoice(clip);
      if (this.voice.voiceBusy) this.contArrow.setVisible(false);
    }
    if (this._alexBubbleStyled) this.body.setColor('#f3e7c4');
  }
  showVoiceSubtitle(text) {
    if (this.isOpen) this.body.setText(this._fit(String(text ?? '')));
  }
  showManualContinue() {
    if (!this.isOpen) return;
    this.contArrow.setVisible(this.mode === 'waiting' || this.mode === 'endwait');
  }
  continueAfterVoice() { if (this.isOpen) super._advance(); }
  finishVoicedIntro() {
    if (!this.isOpen) return;
    this.lineQueue.length = 0;
    this._close();
  }
  skipConversation() {
    if (this.destroyed || !this.isOpen || !this.session) return false;
    this._cancelTyper();
    this.lineQueue.length = 0;
    this._close();
    return true;
  }
  _advance() {
    if (this.voice?.voiceBusy) {
      if (this.scene.sound?.locked) this.scene.sound.unlock?.();
      return;
    }
    super._advance();
  }
  _close() { this.voice?.end(); super._close(); }
  drawTrust(value) {
    const g = this.dial;
    const { s } = this.L;
    const x = this.dialX, y = this.dialY, radius = this.dialRadius;
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
    g.lineBetween(x, y, x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    g.fillStyle(0xd4af37, 1);
    g.fillCircle(x, y, Math.max(1, 3 * s));
  }
  _handleKey(event) {
    if (!this.isOpen || event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
      event.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
    if (event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault?.();
      this.skipConversation();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault?.();
      this._advance();
    }
  }
  destroy() { this.voice?.destroy(); super.destroy(); }
}

export class AgencyStorageScene extends BaseScene {
  constructor() {
    super({ key: 'AgencyStorageScene' });
    this._storageDisposed = true;
  }
  init(data = {}) {
    this.gameState = data.gameState ?? gameState;
    this.background = null;
    this.backButton = null;
    this.retryButton = null;
    this.statusText = null;
    this.timelineButton = null;
    this.manualTemplate = null;
    this.storageHud = null;
    this.storageDialog = null;
    this.isLeaving = false;
    this._conversationOpen = false;
    this._preparing = false;
    this._finishing = false;
    this._timelineOpen = false;
    this._storageDisposed = false;
    this._storageRunToken = Symbol('storage-run');
    this._cancelHudWait = null;
    this._prepareTimer = null;
    this.alexMouthAnimation = null;
  }
  preload() {
    if (!this.textures.exists('back')) this.load.image('back', 'assets/buttons/back.webp');
    if (!this.textures.exists(MANAGER_PORTRAIT_KEY)) this.load.image(MANAGER_PORTRAIT_KEY, MANAGER_PORTRAIT_URL);
    const { key, url } = alexMouthSource(this);
    if (!this.textures.exists(key)) this.load.image(key, url);
  }
  create() {
    super.create();
    audioManager.init(this);
    this.registry.set('currentSceneKey', 'AgencyStorageScene');
    this.registry.set('currentCity', 'hq');
    this.registry.set('currentCityId', 'hq');
    this.registry.set('gameState', this.gameState);
    this.registry.set('activeMission', this.gameState.currentMission || null);
    this.cameras.main.setBackgroundColor('#17110e');
    const key = this.textures.exists(MANAGER_STORAGE_KEY) ? MANAGER_STORAGE_KEY : EMPTY_STORAGE_KEY;
    if (this.textures.exists(key)) this.background = this.add.image(0, 0, key).setOrigin(0).setDepth(0);
    this.createInterface();
    this.layoutStorage();
    this.scale.on('resize', this.layoutStorage, this);
    this.events.on(Phaser.Scenes.Events.WAKE, this.onWakeOrResume, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onWakeOrResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupStorage, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanupStorage, this);
    this.statusText.setText(__dialogueText('scenes/AgencyStorageScene.js', 't_da6b55f59c4a102ab849')).setVisible(true);
    this.schedulePreparation();
    this.alexMouthAnimation = new AlexMouthAnimation(this);
  }
  schedulePreparation() {
    this._prepareTimer?.remove(false);
    this._prepareTimer = this.time.delayedCall(0, () => {
      this._prepareTimer = null;
      void this.prepareVisit();
    });
  }
  isCurrent(token = this._storageRunToken) {
    return Boolean(!this._storageDisposed && this._storageRunToken === token && !this._cleanupDone && this.sys.isActive());
  }
  completeStorageTutorialVisit() {
    const tutorial = this.gameState.onboarding?.firstCase;
    if (!tutorial || tutorial.active !== true || tutorial.completed === true || tutorial.skipped === true || tutorial.step !== 'visit_storage') return;
    tutorial.storageVisited = true;
    tutorial.step = 'walk_to_case_file';
    requestAutosave();
  }
  showManagerBackground() {
    if (!this.textures.exists(MANAGER_STORAGE_KEY)) return false;
    if (!this.background) this.background = this.add.image(0, 0, MANAGER_STORAGE_KEY).setOrigin(0).setDepth(0);
    else this.background.setTexture(MANAGER_STORAGE_KEY);
    this.background.setDisplaySize(this.scale.width, this.scale.height);
    return true;
  }
  createInterface() {
    const style = { fontFamily: 'SpecialElite', fontSize: '22px', color: '#f2d477', backgroundColor: '#17110e', padding: { x: 14, y: 10 } };
    const make = (label, origin, callback) => {
      const button = this.add.text(0, 0, label, style).setOrigin(origin, 1).setDepth(100).setInteractive({ useHandCursor: true });
      button.on('pointerdown', callback);
      button.on('pointerover', () => button.setColor('#ffffff'));
      button.on('pointerout', () => button.setColor('#f2d477'));
      return button;
    };
    this.backButton = this.add.image(0, 0, 'back').setOrigin(0, 1).setDepth(100).setInteractive({ useHandCursor: true });
    this.backButton.on('pointerdown', () => { void this.returnToOffice(); });
    this.backButton.on('pointerover', () => { this.backButton?.setTint(0xffe4a3); });
    this.backButton.on('pointerout', () => { this.backButton?.clearTint(); });
    this.retryButton = make(__dialogueText('scenes/AgencyStorageScene.js', 't_7fb9c96f07064e72471c'), 1, () => { void this.prepareVisit(true); }).setVisible(false);
    this.timelineButton = make(fourthMissionConfig.buttons.start, .5, () => { void this.openTimeline(); }).setVisible(false);
    this.statusText = this.add.text(0, 0, '', { ...style, align: 'center', padding: { x: 16, y: 12 } }).setOrigin(.5, 0).setDepth(110).setVisible(false);
  }
  layoutStorage() {
    if (this._storageDisposed) return;
    const { width, height } = this.scale;
    const compact = width < 600;
    this.background?.setDisplaySize(width, height);
    if (this.backButton) {
      const buttonWidth = Math.min(width < 600 ? 120 : 160, width * .3);
      this.backButton.setScale(buttonWidth / this.backButton.width).setPosition(16, height - 24);
    }
    this.retryButton?.setFontSize(compact ? 14 : 22).setPosition(width - 16, height - (width < 420 ? 82 : 24));
    this.timelineButton?.setFontSize(compact ? 14 : 22).setPosition(width / 2, height - (width < 420 ? 145 : 95));
    this.statusText?.setFontSize(compact ? 17 : 22).setPosition(width / 2, 100).setWordWrapWidth(Math.max(120, Math.min(width - 48, 760)), true);
  }
  refreshTimelineButton() {
    const story = getFourthMissionStory(this.gameState);
    const opening = getChapterTwoOpening();
    const manualReceived = this.manualTemplate && this.hasInventoryItem(this.manualTemplate.id);
    const visible = Boolean(manualReceived && story.canReconstruct && !opening.needsAlex && !this._conversationOpen && !this._preparing && !this._finishing && !this._timelineOpen && !this.isLeaving);
    this.timelineButton?.setText(story.completed ? fourthMissionConfig.buttons.review : fourthMissionConfig.buttons.start).setVisible(visible);
    if (this.timelineButton?.input) this.timelineButton.input.enabled = visible;
  }
  showStatus(message) {
    if (this.isCurrent()) this.statusText?.setText(message).setVisible(true);
  }
  showRecovery(message, error = null) {
    if (!this.isCurrent()) return;
    this.backButton?.setVisible(true);
    this.retryButton?.setVisible(true);
    this.refreshTimelineButton();
    this.showStatus(message);
    if (error) console.error('[AgencyStorageScene]', error);
  }
  waitForHudReady(hud) {
    if (hud.isHudReady) return Promise.resolve(true);
    this._cancelHudWait?.();
    return new Promise(resolve => {
      let settled = false, timeout = null;
      const finish = ready => {
        if (settled) return;
        settled = true;
        hud.events.off('hud-ready', onReady);
        timeout?.remove(false);
        if (this._cancelHudWait === cancel) this._cancelHudWait = null;
        resolve(ready);
      };
      const onReady = () => finish(true);
      const cancel = () => finish(false);
      this._cancelHudWait = cancel;
      hud.events.once('hud-ready', onReady);
      timeout = this.time.delayedCall(10000, () => finish(Boolean(hud.isHudReady)));
      if (hud.isHudReady) finish(true);
    });
  }
  showStorageHud() {
    if (!this.storageHud?.isHudReady) return;
    this.storageHud.showHud();
    this.scene.setVisible(true, 'PlayerHudScene');
    this.bringSceneToTopIfActive('PlayerHudScene');
  }
  async prepareVisit(explicitTalk = false) {
    if (!this.isCurrent() || this.isLeaving || this._conversationOpen || this._preparing || this._finishing || this._timelineOpen) return;
    const token = this._storageRunToken;
    let prepared = false;
    this._preparing = true;
    this.retryButton?.setVisible(false);
    this.refreshTimelineButton();
    this.showStatus(__dialogueText('scenes/AgencyStorageScene.js', 't_da6b55f59c4a102ab849'));
    try {
      if (!this.showManagerBackground()) throw new Error(`Missing image "${MANAGER_STORAGE_KEY}".`);
      await ItemsLoader.load();
      if (!this.isCurrent(token) || this.isLeaving) return;
      this.manualTemplate = ItemsLoader.get('documents', 'agencyFieldManual');
      if (!this.manualTemplate?.id || !this.manualTemplate?.name) throw new Error('Missing documents.agencyFieldManual in ItemsCatalog.json.');
      await this.ensureOverlayScene('UIScene');
      if (!this.isCurrent(token) || this.isLeaving) return;
      const hud = await this.restorePlayerHud();
      if (!this.isCurrent(token) || this.isLeaving) return;
      if (!hud) throw new Error('PlayerHudScene is unavailable.');
      const ready = await this.waitForHudReady(hud);
      if (!this.isCurrent(token) || this.isLeaving) return;
      if (!ready) throw new Error('PlayerHudScene did not finish initialising.');
      hud.closeAllUIPanels?.();
      hud.setCurrentGameplayScene?.('AgencyStorageScene');
      if (!this.isCurrent(token) || this.isLeaving) return;
      if (!this.storageDialog || this.storageDialog.destroyed || this.storageDialog.scene !== hud) {
        this.storageDialog?.destroy();
        this.storageDialog = new LiveDialogUI(hud);
      }
      this.storageHud = hud;
      const news = await this.ensureOverlayScene('NewsHud');
      if (!this.isCurrent(token) || this.isLeaving) return;
      news?.events?.emit('setNewspaperVisible', false);
      news?.events?.emit('setTvVisible', false);
      this.showStorageHud();
      this.statusText?.setVisible(false);
      prepared = true;
    } catch (error) {
      if (this.isCurrent(token) && !this.isLeaving) this.showRecovery(`${__dialogueText('scenes/AgencyStorageScene.js', 't_4ebb2b9b5bc69ce38cef')}${error.message || String(error)}`, error);
    } finally {
      if (this._storageRunToken === token) this._preparing = false;
    }
    if (prepared && this.isCurrent(token) && !this.isLeaving) {
      const story = getFourthMissionStory(this.gameState);
      const opening = getChapterTwoOpening();
      if (!explicitTalk && this.hasInventoryItem(this.manualTemplate.id) && !opening.needsAlex && (opening.open || story.canReconstruct)) {
        this.backButton?.setVisible(true);
        this.retryButton?.setVisible(true);
        this.refreshTimelineButton();
        this.showStatus(opening.open
          ? (opening.deskComplete ? chapterTwoOpeningConfig.messages.deskDone : chapterTwoOpeningConfig.messages.afterAlex)
          : story.completed ? fourthMissionConfig.messages.completed : fourthMissionConfig.messages.ready);
      } else this.startConversation();
    }
  }
  startConversation() {
    const hud = this.storageHud;
    const current = this.storageDialog;
    if (this.isCurrent() && !this.isLeaving && !this._preparing && !this._conversationOpen &&
      !this._finishing && !this._timelineOpen && this.manualTemplate && hud?.isHudReady &&
      current && !current.isOpen && (!(current instanceof AlexStorageDialogue) || current.destroyed || current.scene !== hud)) {
      current.onClose = null;
      current.destroy();
      this.storageDialog = new AlexStorageDialogue(hud);
    }
    if (!this.isCurrent() || this.isLeaving || this._preparing || this._conversationOpen || this._finishing || this._timelineOpen || !this.manualTemplate) return false;
    const dialog = this.storageDialog;
    if (!hud?.isHudReady || !dialog || dialog.destroyed || dialog.isOpen) {
      this.showRecovery(__dialogueText('scenes/AgencyStorageScene.js', 't_b82115ec6cdc97d71ee7'));
      return false;
    }
    const token = this._storageRunToken;
    const hasManual = this.hasInventoryItem(this.manualTemplate.id);
    const issueMode = getAgencyManualIssueMode();
    const fourth = getFourthMissionStory(this.gameState);
    const opening = getChapterTwoOpening();
    const mode = !hasManual ? (issueMode === 'replacement' ? 'manualReplacement' : 'manual')
      : opening.needsAlex ? 'chapterTwo' : opening.open ? 'chapterTwoReview'
      : fourth.needsAccount ? 'crash' : fourth.canReconstruct ? 'review'
      : getThirdMissionStory(this.gameState).needsAlex ? 'refusal' : 'return';
    const lines = mode === 'manualReplacement' ? REISSUE_LINES : mode === 'manual' ? INTRO_LINES
      : mode === 'chapterTwo' || mode === 'chapterTwoReview' ? chapterTwoOpeningConfig.conversation
      : mode === 'crash' ? fourthMissionConfig.conversation : mode === 'review' ? fourthMissionConfig.reviewConversation
      : mode === 'refusal' ? thirdMissionConfig.alexLines : RETURN_LINES;
    this._conversationOpen = true;
    this.backButton?.setVisible(false);
    this.retryButton?.setVisible(false);
    this.timelineButton?.setVisible(false);
    this.statusText?.setVisible(false);
    try {
      this.showManagerBackground();
      this.showStorageHud();
      dialog.open({ speaker: DIALOGUES.speaker, portraitKey: MANAGER_PORTRAIT_KEY, lines: [...lines] }, {
        onClose: () => {
          if (!this.isCurrent(token) || !this._conversationOpen || this.isLeaving) return;
          this._conversationOpen = false;
          if (mode === 'chapterTwo' || mode === 'chapterTwoReview') {
            const result = mode === 'chapterTwo' ? markChapterTwoAlexFollowup() : { success: true, saved: true };
            this.backButton?.setVisible(true);
            this.retryButton?.setVisible(true);
            this.refreshTimelineButton();
            this.showStatus(chapterTwoOpeningConfig.messages.afterAlex + (result.saved ? '' : ` ${chapterTwoOpeningConfig.messages.saveFailed}`));
          } else if (mode === 'crash') {
            const result = markAlexCrashAccount(this.gameState);
            this.backButton?.setVisible(true);
            this.retryButton?.setVisible(true);
            this.refreshTimelineButton();
            this.showStatus(result.success
              ? fourthMissionConfig.messages.ready + (result.saved ? '' : ` ${fourthMissionConfig.messages.saveFailed}`)
              : __dialogueText('scenes/AgencyStorageScene.js', 't_9e5f0f428737d69a0406'));
          } else if (mode === 'review') {
            this.backButton?.setVisible(true);
            this.retryButton?.setVisible(true);
            this.refreshTimelineButton();
            this.showStatus(fourthMissionConfig.messages.ready);
          } else if (mode === 'refusal') {
            const saved = markAlexRefusal(this.gameState);
            this.backButton?.setVisible(true);
            this.retryButton?.setVisible(true);
            this.showStatus(thirdMissionConfig.messages.refused + (saved ? '' : ` ${thirdMissionConfig.messages.saveFailed}`));
          } else void this.finishConversation();
        }
      });
      return true;
    } catch (error) {
      this._conversationOpen = false;
      this.showRecovery(`${__dialogueText('scenes/AgencyStorageScene.js', 't_b9474492c53e9766198b')}${error.message || String(error)}`, error);
      return false;
    }
  }
  async openTimeline() {
    if (!this.isCurrent() || this.isLeaving || this._conversationOpen || this._preparing || this._finishing || this._timelineOpen || !getFourthMissionStory(this.gameState).canReconstruct) return;
    const token = this._storageRunToken;
    this._timelineOpen = true;
    this.backButton?.setVisible(false);
    this.retryButton?.setVisible(false);
    this.timelineButton?.setVisible(false);
    this.showStatus(fourthMissionConfig.messages.preparing);
    try {
      this.storageHud?.closeAllUIPanels?.();
      const { openCrashTimeline } = await import('../crashTimelineLauncher.js');
      if (!this.isCurrent(token) || this.isLeaving) return;
      const opened = openCrashTimeline(this.game, { preview: false, onFinished: () => this.onTimelineFinished(token) });
      if (!opened) throw new Error('Timeline scene is already open.');
      this.statusText?.setVisible(false);
    } catch (error) {
      if (this.isCurrent(token)) {
        this._timelineOpen = false;
        this.showRecovery(fourthMissionConfig.messages.loadFailed, error);
      }
    }
  }
  onTimelineFinished(token) {
    if (!this.isCurrent(token)) return;
    this._timelineOpen = false;
    this.backButton?.setVisible(true);
    this.retryButton?.setVisible(true);
    this.showStorageHud();
    this.layoutStorage();
    this.refreshTimelineButton();
    const story = getFourthMissionStory(this.gameState);
    const saved = saveGameState();
    this.showStatus((story.completed ? fourthMissionConfig.messages.completed : fourthMissionConfig.messages.unfinished)
      + (saved ? '' : ` ${fourthMissionConfig.messages.saveFailed}`));
  }
  async finishConversation() {
    if (!this.isCurrent() || this.isLeaving || this._finishing || !this.manualTemplate) return;
    this._finishing = true;
    const token = this._storageRunToken;
    let received = false;
    try {
      const issue = ensureAgencyFieldManual();
      if (!issue.ok) { this.showRecovery(DIALOGUES.messages.pocketsFull); return; }
      if (!this.hasInventoryItem(this.manualTemplate.id)) throw new Error('The manual was not added to inventory.');
      this.completeStorageTutorialVisit();
      if (!saveGameState()) console.warn('[AgencyStorageScene] Manual received, but save failed.');
      received = true;
    } catch (error) {
      this.showRecovery(`${__dialogueText('scenes/AgencyStorageScene.js', 't_51040c74460a0d1485f5')}${error.message || String(error)}`, error);
    } finally {
      if (this._storageRunToken === token) this._finishing = false;
    }
    if (received && this.isCurrent(token)) await this.returnToOffice();
  }
  async returnToOffice() {
    if (!this.isCurrent() || this.isLeaving || this._conversationOpen || this._finishing || this._timelineOpen) return false;
    const token = this._storageRunToken;
    this.isLeaving = true;
    this._cancelHudWait?.();
    this.backButton?.setVisible(false);
    this.retryButton?.setVisible(false);
    this.timelineButton?.setVisible(false);
    let result = false;
    try {
      audioManager.playSfx('click_sound');
      this.storageHud?.closeAllUIPanels?.();
      result = await this.goto('OfficeScene', { gameState: this.gameState });
    } catch (error) { console.error('[AgencyStorageScene] Return to office failed:', error); }
    if (!this.isCurrent(token)) return result !== false;
    this.isLeaving = false;
    if (result === false) this.showRecovery(__dialogueText('scenes/AgencyStorageScene.js', 't_f9cfade29406b1e01d2d'));
    return result !== false;
  }
  onWakeOrResume() {
    if (!this.isCurrent() || this.isLeaving) return;
    this.showManagerBackground();
    this.layoutStorage();
    if (this._timelineOpen) return;
    if (this._conversationOpen) { this.showStorageHud(); return; }
    if (!this._preparing && !this._finishing) this.schedulePreparation();
  }
  cleanupStorage() {
    if (this._storageDisposed) return;
    this._storageDisposed = true;
    this._storageRunToken = null;
    this._conversationOpen = false;
    this._preparing = false;
    this._finishing = false;
    this._timelineOpen = false;
    this._prepareTimer?.remove(false);
    this._prepareTimer = null;
    this._cancelHudWait?.();
    this._cancelHudWait = null;
    if (this.storageDialog) {
      this.storageDialog.onClose = null;
      this.storageDialog.destroy();
    }
    this.scale.off('resize', this.layoutStorage, this);
    for (const event of [Phaser.Scenes.Events.WAKE, Phaser.Scenes.Events.RESUME]) this.events.off(event, this.onWakeOrResume, this);
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.cleanupStorage, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.cleanupStorage, this);
    this.backButton?.removeAllListeners();
    this.retryButton?.removeAllListeners();
    this.timelineButton?.removeAllListeners();
    this.background = null;
    this.backButton = null;
    this.retryButton = null;
    this.timelineButton = null;
    this.statusText = null;
    this.manualTemplate = null;
    this.storageHud = null;
    this.storageDialog = null;
  }
}
