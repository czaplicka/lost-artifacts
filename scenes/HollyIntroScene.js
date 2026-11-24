import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { requestAutosave, flushAutosave } from '../gameStatePersistence.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { HomeTownDialogue } from '../ui/HomeTownDialogue.js';

import {
  T,
  HOLLY,
  DETECTIVE,
  OPENING_SCRIPT,
  CLOSING_SCRIPT,
  REWARD_CHOICES
} from './hollyIntro/HollyIntroText.js';

import {
  TRUST_KEY,
  START_TRUST,
  getHollyTrust,
  applyToneToTrust
} from './hollyIntro/HollyIntroTrust.js';

import { HollyHudGuard } from './hollyIntro/HollyHudGuard.js';

import {
  hasCompletedHollyIntro,
  grantHollyChoiceReward
} from './hollyIntro/HollyIntroRewards.js';

// Dotychczasowy import z tego pliku pozostaje poprawny.
export { getHollyTrust } from './hollyIntro/HollyIntroTrust.js';

const PRESS = '"Press Start 2P", monospace';

const SLEEP_DURATION = 2200;
const SLEEP_FADE_DURATION = 350;

const DIALOGUE_DEPTH = 9000;
const STAMP_DEPTH = 9500;

// Tylko do wyświetlania stanu rozmówcy. Zaufanie Holly
// nadal zapisuje się osobno pod kluczem holly_trust.
const TRUST_VIEW_ID = 'holly_intro';

export class HollyIntroScene extends BaseScene {
  constructor() {
    super({ key: 'HollyIntroScene' });

    this.returnScene = null;
    this.returnData = {};
    this.phase = 'idle';
    this.queue = [];
    this.nextPhaseAfterDialogue = null;
    this.choiceNodes = [];
    this.pickedTones = [];
    this.fullText = '';
    this.isTyping = false;
    this.typingEvent = null;
    this.video = null;
    this.bgVideo = null;
    this.videoFitted = false;
    this.stampText = null;
    this.stampLabel = null;
    this.stampShown = false;
    this.stampSlam = false;
    this._finishEmitted = false;
    this._applyingReward = false;
    this._skipRepeatedIntro = false;
    this._hudGuard = null;
    this.source = 'forced_sleep';
    this.sleepHours = 6;
    this.dialogue = null;
    this.currentView = null;
    this._lineSerial = 0;
    this._optionsToken = 0;
    this.hollyTrust = START_TRUST;

    this.sleepLayer = null;
    this.sleepBackdrop = null;
    this.sleepText = null;
    this.sleepPulse = null;
    this.sleepFade = null;
    this.sleepTimer = null;
    this.sleepDotsTimer = null;
    this.sleepStep = 0;
  }

  get isTyping() {
    return this.dialogue?.typing ?? this._typingFallback ?? false;
  }

  set isTyping(value) {
    this._typingFallback = Boolean(value);
  }

  init(data = {}) {
    this._hudGuard?.release();
    this._hudGuard = null;

    this.clearSleepTransition();
    this.stopTyping();
    this.hideStamp();

    this.dialogue?.destroy();
    this.dialogue = null;
    this.currentView = null;

    this.returnScene = data.returnScene || null;

    this.returnData = (
      data.returnData &&
      typeof data.returnData === 'object'
    ) ? { ...data.returnData } : {};

    const manual = (
      this.returnScene === 'HotelScene' ||
      this.returnScene === 'SleepScene'
    );

    this.source = data.source || (
      manual ? 'hotel_sleep' : 'forced_sleep'
    );

    const hours = Number(
      this.returnData.sleepHours ??
      data.sleepHours ??
      (manual ? 8 : 6)
    );

    this.sleepHours = Number.isFinite(hours) && hours > 0
      ? hours
      : (manual ? 8 : 6);

    this.phase = 'idle';
    this.queue = [];
    this.nextPhaseAfterDialogue = null;
    this.choiceNodes = [];
    this.pickedTones = [];
    this.fullText = '';
    this.isTyping = false;
    this.typingEvent = null;
    this.video = null;
    this.bgVideo = null;
    this.videoFitted = false;
    this.stampText = null;
    this.stampLabel = null;
    this.stampShown = false;
    this.stampSlam = false;
    this._finishEmitted = false;
    this._applyingReward = false;
    this._skipRepeatedIntro = false;
    this._lineSerial = 0;
    this._optionsToken++;
    this.hollyTrust = getHollyTrust();
  }

  preload() {
    if (!this.textures.exists('holly')) {
      this.load.image('holly', 'assets/pi/holly.webp');
    }
  }

  _syncCompletedIntro() {
    gameState.updateState({
      hollyIntroSeen: true,
      hollyIntroPending: false,
      hollyFirstSleepSeen: true
    });

    requestAutosave();
    flushAutosave();
  }

  create() {
    super.create();

    if (hasCompletedHollyIntro()) {
      this._skipRepeatedIntro = true;
      this.phase = 'already-seen';
      this._syncCompletedIntro();

      this.time.delayedCall(0, () => {
        if (!this._cleanupDone) {
          this.finishScene();
        }
      });

      return;
    }

    this._hudGuard = new HollyHudGuard(this);
    this._hudGuard.start();

    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#000000');

    this.bg = this.add.rectangle(
      0, 0, width, height, 0x000000, 1
    )
      .setOrigin(0)
      .setDepth(0);

    this.overlay = this.add.rectangle(
      0, 0, width, height, 0x000000, 0.45
    )
      .setOrigin(0)
      .setDepth(8)
      .setVisible(false);

    this.dialogue = new HomeTownDialogue(
      this,
      () => this.handleUserLeave()
    );

    this.trackInputEvent(
      this.scale,
      'resize',
      this.layoutDialogue,
      this
    );

    this.playSleepTransition();
  }

  playSleepTransition() {
    this.clearSleepTransition();
    this.phase = 'falling-asleep';

    const { width, height } = this.scale;
    const s = height / 720;

    this.sleepLayer = this.add.container(0, 0)
      .setDepth(20000)
      .setScrollFactor(0);

    this.sleepBackdrop = this.add.rectangle(
      0, 0, width, height, 0x000000, 1
    )
      .setOrigin(0)
      .setInteractive();

    this.sleepBackdrop.on(
      'pointerdown',
      (pointer, x, y, event) => event?.stopPropagation?.()
    );

    this.sleepText = this.add.text(
      width / 2,
      height / 2,
      'Z…',
      {
        fontFamily: PRESS,
        fontSize: `${30 * s}px`,
        color: '#f3e7c4',
        align: 'center',
        padding: {
          x: 12 * s,
          y: 12 * s
        }
      }
    )
      .setOrigin(0.5)
      .setResolution(2);

    this.sleepLayer.add([
      this.sleepBackdrop,
      this.sleepText
    ]);

    this.sleepStep = 0;

    const frames = ['Z…', 'Z… Z…', 'Z… Z… Z…'];

    this.sleepDotsTimer = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        if (!this.sleepText?.active) return;

        this.sleepStep = (this.sleepStep + 1) % frames.length;
        this.sleepText.setText(frames[this.sleepStep]);
      }
    });

    this.sleepPulse = this.tweens.add({
      targets: this.sleepText,
      alpha: 0.45,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.sleepTimer = this.time.delayedCall(
      SLEEP_DURATION,
      () => {
        this.sleepTimer = null;

        if (
          this._cleanupDone ||
          this.phase !== 'falling-asleep'
        ) {
          return;
        }

        this.playIntroVideo();
      }
    );
  }

  revealFromSleep() {
    if (!this.sleepLayer || this.sleepFade) return;

    this.sleepTimer?.remove(false);
    this.sleepTimer = null;

    this.sleepDotsTimer?.remove(false);
    this.sleepDotsTimer = null;

    this.sleepPulse?.remove();
    this.sleepPulse = null;

    this.sleepFade = this.tweens.add({
      targets: this.sleepLayer,
      alpha: 0,
      duration: SLEEP_FADE_DURATION,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.sleepFade = null;
        this.clearSleepTransition();
      }
    });
  }

  clearSleepTransition() {
    this.sleepTimer?.remove(false);
    this.sleepTimer = null;

    this.sleepDotsTimer?.remove(false);
    this.sleepDotsTimer = null;

    this.sleepPulse?.remove();
    this.sleepPulse = null;

    this.sleepFade?.remove();
    this.sleepFade = null;

    this.sleepLayer?.destroy(true);
    this.sleepLayer = null;
    this.sleepBackdrop = null;
    this.sleepText = null;
    this.sleepStep = 0;
  }

  update() {
    if (this.video && !this.videoFitted) {
      this.tryFitVideo(this.video);
    }
  }

  createFullscreenVideo(key) {
    const { width, height } = this.scale;

    this.videoFitted = false;

    const video = this.add.video(
      width / 2,
      height / 2,
      key
    )
      .setOrigin(0.5)
      .setDepth(2)
      .setAlpha(0);

    video.once('textureready', () => this.tryFitVideo(video));
    video.once('playing', () => this.tryFitVideo(video));

    this.time.delayedCall(1500, () => {
      if (video.active) {
        this.tryFitVideo(video);
        video.setAlpha(1);
      }
    });

    return video;
  }

  tryFitVideo(video) {
    if (!video?.active) return false;

    const videoWidth = video.video?.videoWidth || 0;
    const videoHeight = video.video?.videoHeight || 0;

    if (!videoWidth || !videoHeight) return false;

    const { width, height } = this.scale;

    video.setPosition(width / 2, height / 2);
    video.setScale(
      Math.min(width / videoWidth, height / videoHeight)
    );
    video.setAlpha(1);

    if (video === this.video || !this.video) {
      this.videoFitted = true;
    }

    if (
      this.phase === 'intro-video' &&
      video === this.video
    ) {
      this.revealFromSleep();
    }

    return true;
  }

  destroyVideo(video) {
    if (video?.active) {
      video.destroy();
    }
  }

  playIntroVideo() {
    this.phase = 'intro-video';
    this.video = this.createFullscreenVideo('in');

    this.video.once('complete', () => {
      this.clearSleepTransition();
      this.tryFitVideo(this.video);

      this.bgVideo = this.video;
      this.video = null;

      this.startScript(OPENING_SCRIPT, 'choices');
    });

    this.video.play(false);
  }

  playOutroVideo() {
    this.phase = 'outro-video';
    this.hideDialogueLayout();

    this.video = this.createFullscreenVideo('out');
    this.video.setDepth(20);

    this.video.once('complete', () => {
      this.destroyVideo(this.video);
      this.video = null;

      this.destroyVideo(this.bgVideo);
      this.bgVideo = null;

      this.finishScene();
    });

    this.video.play(false);
  }

  layoutDialogue() {
    const { width, height } = this.scale;

    this.bg?.setSize(width, height);
    this.overlay?.setSize(width, height);

    this.sleepBackdrop?.setSize(width, height);

    if (this.sleepText) {
      this.sleepText
        .setPosition(width / 2, height / 2)
        .setFontSize(30 * height / 720);
    }

    this.tryFitVideo(this.video);
    this.tryFitVideo(this.bgVideo);
  }

  // ------------------------------------------------------------
  // Wspólny panel rozmowy
  // ------------------------------------------------------------

  showView(view) {
    if (
      this._cleanupDone ||
      !this.dialogue ||
      this.dialogue.destroyed
    ) {
      return;
    }

    this.overlay?.setVisible(true);
    this.currentView = view;

    this.dialogue.show({
      ...view,
      depth: DIALOGUE_DEPTH,
      npcId: TRUST_VIEW_ID,
      showTrust: true,
      scoreTrust: false,
      startTrust: this.hollyTrust,
      onDraw: () => this.afterDraw()
    });
  }

  afterDraw() {
    const panel = this.dialogue?.panel;

    if (!panel) return;

    // To wymuszona scena: nie ma przycisku wyjścia z rozmowy.
    panel.byeBtn?.rect?.setVisible(false);
    panel.byeBtn?.text?.setVisible(false);

    this.drawStamp();
  }

  handleUserLeave() {
    if (
      this._cleanupDone ||
      this.phase === 'finished' ||
      !this.currentView
    ) {
      return;
    }

    this.showView(this.currentView);
  }

  syncTrustLabel() {
    const dialogue = this.dialogue;

    if (!dialogue?.data) return;

    dialogue.data.startTrust = this.hollyTrust;
    dialogue.refreshTrust();
  }

  hideDialogueLayout() {
    this.stopTyping();
    this.hideStamp();

    this.overlay?.setVisible(false);

    this.dialogue?.close(false);
    this.currentView = null;

    this._optionsToken++;
  }

  startScript(script, nextPhase) {
    this.queue = [...script];
    this.nextPhaseAfterDialogue = nextPhase;
    this.phase = 'dialogue';

    this.advance();
  }

  advance() {
    this.hideStamp();

    if (this.queue.length === 0) {
      this.onScriptDone();
      return;
    }

    const item = this.queue.shift();

    if (item.choice) {
      this.showDialogueChoice(item);
      return;
    }

    this.showLine(item);
  }

  onScriptDone() {
    if (this.nextPhaseAfterDialogue === 'choices') {
      this.showRewardChoices();
      return;
    }

    if (this.nextPhaseAfterDialogue === 'outro') {
      this.playOutroVideo();
    }
  }

  showLine(item) {
    this.clearChoices();

    if (item.stamp) {
      this.stampLabel = item.stamp;
      this.stampShown = true;
      this.stampSlam = true;
    }

    const serial = ++this._lineSerial;
    this.fullText = item.text;

    this.showView({
      title: item.speaker,
      text: item.text,
      messages: [{
        speaker: item.speaker === DETECTIVE ? 'player' : 'npc',
        text: item.text
      }],
      choices: [{
        id: `holly_intro_continue:${serial}`,
        label: 'Continue',
        attitude: 'neutral',
        scoreTrust: false,
        action: () => this.dialogue?.advance()
      }],
      nodeId: `holly_intro_line:${serial}`,
      onAdvance: () => {
        if (this.phase === 'dialogue') {
          this.advance();
        }
      }
    });
  }

  stopTyping() {
    this.typingEvent?.remove(false);
    this.typingEvent = null;
    this.isTyping = false;
  }

  drawStamp() {
    this.destroyStampObject();

    const label = this.stampLabel;
    const panel = this.dialogue?.panel;

    if (!label || !panel) return;

    const { lx, lw, py, s } = panel.L;
    const slam = this.stampSlam;

    this.stampSlam = false;

    const stamp = this.add.text(
      lx + lw / 2,
      py - 64 * s,
      label,
      {
        fontFamily: PRESS,
        fontSize: `${18 * s}px`,
        color: '#c0392b',
        stroke: '#17110a',
        strokeThickness: 5 * s,
        padding: {
          x: 10 * s,
          y: 8 * s
        }
      }
    )
      .setOrigin(0.5)
      .setAngle(-8)
      .setResolution(2)
      .setDepth(STAMP_DEPTH);

    const maxWidth = Math.max(1, lw - 32 * s);
    const fitScale = Math.min(1, maxWidth / stamp.width);

    stamp.setScale(fitScale);

    if (slam) {
      stamp.setScale(fitScale * 1.5);

      this.tweens.add({
        targets: stamp,
        scaleX: fitScale,
        scaleY: fitScale,
        duration: 150,
        ease: 'Quad.easeOut'
      });
    }

    this.stampText = stamp;
  }

  destroyStampObject() {
    if (!this.stampText) return;

    this.tweens?.killTweensOf(this.stampText);
    this.stampText.destroy();
    this.stampText = null;
  }

  hideStamp() {
    this.destroyStampObject();

    this.stampLabel = null;
    this.stampShown = false;
    this.stampSlam = false;
  }

  showOptions({ speaker, prompt, entries, onPick }) {
    this.stopTyping();
    this.hideStamp();

    const token = ++this._optionsToken;

    this.showView({
      title: speaker,
      text: prompt,
      messages: [{
        speaker: speaker === DETECTIVE ? 'player' : 'npc',
        text: prompt
      }],
      choices: entries.map((entry, index) => ({
        id: `holly_intro_option:${token}:${index}`,
        label: entry.label,
        attitude: 'neutral',
        scoreTrust: false,
        action: () => {
          if (
            this._optionsToken === token &&
            !this._cleanupDone
          ) {
            onPick(index);
          }
        }
      })),
      nodeId: `holly_intro_options:${token}`
    });
  }

  clearChoices() {
    this._optionsToken++;
    this.choiceNodes = [];
  }

  showDialogueChoice(item) {
    this.phase = 'dialogue-choice';

    this.showOptions({
      speaker: DETECTIVE,
      prompt: T('t_9276ea83937dc25660ee'),
      entries: item.options.map(option => ({
        label: option.lines[0].text
      })),
      onPick: index => this.pickDialogueOption(item, index)
    });
  }

  pickDialogueOption(item, index) {
    const option = item?.options?.[index];

    if (this.phase !== 'dialogue-choice' || !option) return;

    this.phase = 'picking';
    this.pickedTones.push(option.tone);
    this.clearChoices();

    this.hollyTrust = applyToneToTrust(
      this.hollyTrust,
      option.tone
    );

    this.syncTrustLabel();

    this.time.delayedCall(80, () => {
      if (this._cleanupDone) return;

      this.queue.unshift(...option.lines);
      this.phase = 'dialogue';
      this.advance();
    });
  }

  showRewardChoices() {
    if (hasCompletedHollyIntro()) {
      this._syncCompletedIntro();
      this.startScript(CLOSING_SCRIPT, 'outro');
      return;
    }

    this.phase = 'choices';

    this.showOptions({
      speaker: HOLLY,
      prompt: T('t_c5f780118a1f30f19ce3'),
      entries: REWARD_CHOICES.map(choice => ({
        label: `${choice.label}${T('t_3b2e8119b6fcc97df985')}${choice.desc}`
      })),
      onPick: index => this.selectChoice(REWARD_CHOICES[index])
    });
  }

  selectChoice(choice) {
    if (this.phase !== 'choices' || !choice) return;

    this.phase = 'applying-choice';
    this.clearChoices();

    try {
      this.applyChoice(choice);
    } catch (error) {
      console.error(
        '[HollyIntroScene] Applying choice failed:',
        error
      );

      this.phase = 'choices';
      this.showRewardChoices();
      return;
    }

    this.time.delayedCall(80, () => {
      if (!this._cleanupDone) {
        this.startScript(CLOSING_SCRIPT, 'outro');
      }
    });
  }

  getDominantTone() {
    if (this.pickedTones.length === 0) return null;

    const counts = {};

    this.pickedTones.forEach(tone => {
      counts[tone] = (counts[tone] || 0) + 1;
    });

    return Object.keys(counts).reduce(
      (best, tone) => counts[tone] > counts[best] ? tone : best
    );
  }

  applyChoice(choice) {
    if (hasCompletedHollyIntro()) {
      this._syncCompletedIntro();
      return false;
    }

    if (this._applyingReward) return false;

    if (!REWARD_CHOICES.some(entry => entry.id === choice?.id)) {
      throw new Error('[HollyIntroScene] Invalid reward choice.');
    }

    const previous = MainStoryManager.getSideClue(TRUST_KEY);

    MainStoryManager.setSideClue(TRUST_KEY, {
      value: this.hollyTrust
    });

    this._applyingReward = true;

    try {
      grantHollyChoiceReward(choice.id);

      gameState.updateState({
        hollyIntroSeen: true,
        hollyIntroPending: false,
        hollyFirstSleepSeen: true,
        hollyIntroChoice: choice.id,
        hollyIntroTone: this.getDominantTone(),
        johnCaseAccepted: true,
        blackLadyCaseAccepted: true
      });

      requestAutosave();
      flushAutosave();

      EventBus.emit('hollyIntroChoiceMade', {
        choice: choice.id
      });

      return true;
    } catch (error) {
      if (!gameState.hollyIntroSeen) {
        MainStoryManager.setSideClue(
          TRUST_KEY,
          previous ?? null
        );
      }

      throw error;
    } finally {
      this._applyingReward = false;
    }
  }

  finishScene() {
    if (this._finishEmitted) return;

    this._finishEmitted = true;
    this.phase = 'finished';

    this.clearSleepTransition();
    this.hideDialogueLayout();

    this._hudGuard?.release();
    this._hudGuard = null;

    const choice = gameState.hollyIntroChoice || null;
    const sleepHours = this.sleepHours;

    EventBus.emit('hollyIntroFinished', {
      choice,
      sleepHours,
      source: this.source,
      skipped: this._skipRepeatedIntro
    });

    if (
      this.returnScene === 'HotelScene' ||
      this.returnScene === 'SleepScene'
    ) {
      EventBus.emit('hollySleepFinished', {
        choice,
        sleepHours,
        skipped: this._skipRepeatedIntro
      });

      return;
    }

    this.scene.stop();
  }

  cleanup() {
    this.clearSleepTransition();

    this._hudGuard?.release();
    this._hudGuard = null;

    this.stopTyping();
    this.clearChoices();
    this.hideDialogueLayout();

    this.dialogue?.destroy();
    this.dialogue = null;

    this.destroyVideo(this.video);
    this.destroyVideo(this.bgVideo);

    this.video = null;
    this.bgVideo = null;

    super.cleanup();
  }
}
