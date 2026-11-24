import { dialogueText as __dialogueText, dialogueText } from '../dialogues/DialogueText.js';
import { storageRoomDialogues as DIALOGUES } from '../storageRoomDialogueService.js';
import { BaseScene } from './BaseScene.js';
import { HomeTownDialogue } from '../ui/HomeTownDialogue.js';
import { DialogUI } from '../ui/DialogUI.js';
import { getTrustLevel } from '../managers/TrustManager.js';
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

// Wyłącznie istniejący odtwarzacz głosu. create() nie tworzy UI.
// DialogUI nadal obsługuje ładowanie audio, synchronizację intro i fallback.
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

// Adapter przebiegu i audio. Cały widoczny panel tworzy HomeTownDialogue.
class AlexStorageDialogue {
  constructor(hud) {
    this.scene = hud;
    this.destroyed = false;
    this.isOpen = false;
    this.onClose = null;
    this.lines = [];
    this.lineIndex = 0;
    this.renderVersion = 0;
    this.speakerText = { text: '' }; // API animacji ust pozostaje bez zmian.
    this.voice = new AlexVoicePlayer(hud);
    this.voice.panel = this;
    this.shared = new HomeTownDialogue(hud, () => {
      // Stary panel nie pozwalał zakończyć rozmowy przez Esc/0.
      if (this.isOpen && !this.destroyed) this.renderLine();
    });
    // Używamy dotychczasowego alex_trust, nie drugiej kopii zaufania.
    this.shared.refreshTrust = () => this.drawTrust(readTrust().value);
    this.boundKey = event => this.handleKey(event);
    this.boundShutdown = () => this.destroy();
    hud.events.once('shutdown', this.boundShutdown);
    hud.events.once('destroy', this.boundShutdown);
  }
  get root() { return this.shared?.root || null; }
  get isTyping() {
    return this.isOpen && (Boolean(this.shared?.typing) || Boolean(this.voice?.voiceSound?.isPlaying));
  }
  open({ speaker, lines }, { onClose } = {}) {
    if (this.destroyed || this.isOpen) throw new Error('The Alex dialogue panel is not available.');
    this.speakerText.text = speaker;
    this.lines = [...lines];
    this.lineIndex = 0;
    this.onClose = typeof onClose === 'function' ? onClose : null;
    this.isOpen = true;
    // Przed listenerem modalnym wspólnego panelu: Space nadal pomija całą rozmowę.
    if (typeof window !== 'undefined') window.addEventListener('keydown', this.boundKey, true);
    this.voice.begin(getVoiceMode(speaker, this.lines), this.lines);
    try {
      if (!this.lines.length) this.close();
      else this.startLine();
      return true;
    } catch (error) {
      this.isOpen = false;
      this.onClose = null;
      this.voice.end();
      this.shared.close(false);
      this.unbindKey();
      throw error;
    }
  }
  startLine() {
    if (!this.isOpen || this.destroyed) return;
    if (this.lineIndex >= this.lines.length) { this.close(); return; }
    const mode = this.voice.voiceMode;
    const clip = mode ? VOICE_FILES[mode]?.[this.lineIndex] : null;
    this.renderLine(Boolean(clip));
    if (clip) {
      this.voice.currentLineIndex = this.lineIndex;
      this.voice.playAlexVoice(clip);
      this.updateVoiceControls();
    }
  }
  renderLine(instant = false) {
    if (!this.isOpen || this.destroyed) return;
    const version = ++this.renderVersion;
    const line = this.lines[this.lineIndex] ?? '';
    this.shared.show({
      title: this.speakerText.text,
      role: 'SPACE: Skip conversation / ENTER: Continue',
      text: line,
      messages: [{ speaker: 'npc', text: line }],
      npcId: 'alex_murphy',
      startTrust: readTrust().value,
      showTrust: true,
      scoreTrust: false,
      depth: 9000,
      nodeId: `alex_storage:${this.lineIndex}`,
      choices: [
        { id: 'alex_storage_continue', label: 'Continue', scoreTrust: false,
          action: () => { if (this.renderVersion === version) this.advance(); } },
        { id: 'alex_storage_skip', label: 'Skip conversation', scoreTrust: false,
          action: () => { if (this.renderVersion === version) this.skipConversation(); } },
      ],
      onAdvance: () => {
        if (this.renderVersion !== version || !this.isOpen) return;
        if (this.voice.voiceBusy) { this.unlockAudio(); return; }
        this.lineIndex += 1;
        this.startLine();
      },
      onDraw: () => {
        this.shared.panel?.byeBtn.rect.setVisible(false);
        this.shared.panel?.byeBtn.text.setVisible(false);
        // Klik w tekst ma tę samą blokadę audio co Enter.
        for (const hit of [this.shared.panel?.textHit, this.shared.panel?.blocker]) {
          if (!hit) continue;
          hit.removeAllListeners('pointerdown');
          hit.on('pointerdown', (_p, _x, _y, event) => {
            event?.stopPropagation?.();
            if (this.renderVersion === version) this.advance();
          });
        }
        this.drawTrust(readTrust().value);
        this.updateVoiceControls();
      },
    });
    if (instant) this.shared.stop();
    this.updateVoiceControls();
  }
  drawTrust(value) {
    if (!this.shared?.panel) return;
    this.shared.panel.setTrust({ value, level: getTrustLevel(value) });
  }
  updateVoiceControls() {
    if (this.voice?.voiceBusy) this.shared?.panel?.contArrow.setVisible(false);
  }
  unlockAudio() {
    if (this.scene.sound?.locked) this.scene.sound.unlock?.();
  }
  showVoiceSubtitle(text) {
    if (!this.isOpen || this.destroyed) return;
    const index = this.voice.currentLineIndex;
    if (index >= 0 && index < this.lines.length) this.lineIndex = index;
    // Tekst synchronizowany przez ten sam odtwarzacz co dotąd.
    if (this.lines[this.lineIndex] !== String(text ?? '')) return;
    this.renderLine(true);
  }
  showManualContinue() {
    if (!this.isOpen) return;
    this.shared.stop();
    const panel = this.shared.panel;
    if (panel) panel.contArrow.setVisible(true);
  }
  continueAfterVoice() {
    if (!this.isOpen || this.destroyed) return;
    this.lineIndex += 1;
    this.startLine();
  }
  finishVoicedIntro() { if (this.isOpen) this.close(); }
  advance() {
    if (!this.isOpen || this.destroyed) return;
    if (this.voice.voiceBusy) { this.unlockAudio(); return; }
    this.shared.advance();
  }
  skipConversation() {
    if (this.destroyed || !this.isOpen) return false;
    this.close();
    return true;
  }
  handleKey(event) {
    if (!this.isOpen || this.destroyed || event.ctrlKey || event.metaKey || event.altKey ||
      event.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
    const space = event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar';
    const enter = event.key === 'Enter';
    const blockedExit = event.key === 'Escape' || event.key === '0';
    if (!space && !enter && !blockedExit) return;
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    if (event.repeat || blockedExit) return;
    if (space) this.skipConversation();
    else this.advance();
  }
  unbindKey() {
    if (typeof window !== 'undefined') window.removeEventListener('keydown', this.boundKey, true);
  }
  close() {
    if (!this.isOpen || this.destroyed) return;
    this.isOpen = false;
    ++this.renderVersion;
    this.voice.end();
    this.shared.close(false);
    this.unbindKey();
    const callback = this.onClose;
    this.onClose = null;
    try { addTrustForConversation(this.lines); }
    catch (error) { console.warn('[Alex Storage] Could not save trust:', error); }
    callback?.();
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.isOpen = false;
    ++this.renderVersion;
    this.onClose = null;
    this.unbindKey();
    this.voice.destroy();
    this.shared.destroy();
    this.scene.events.off('shutdown', this.boundShutdown);
    this.scene.events.off('destroy', this.boundShutdown);
  }
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
        this.storageDialog = new AlexStorageDialogue(hud);
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
