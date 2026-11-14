import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { moneyManager, ECONOMY_CATEGORY } from '../managers/MoneyManager.js';
import hintManager from '../managers/HintManager.js';
import { requestAutosave, flushAutosave } from '../gameStatePersistence.js';

const TYPE_DELAY_MS = 22;
const OPENING_SCRIPT = [
  { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_58de530cfa35752b7230"), text: __dialogueText("scenes/HollyIntroScene.js", "t_3cfc53f7bfc5b8f7ae88") },
  { choice: true, options: [
    { tone: 'sarcastic', lines: [
      { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_1e954e77ee4e5253c6c5"), text: __dialogueText("scenes/HollyIntroScene.js", "t_74c233625f6b492e13c7") },
      { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_58de530cfa35752b7230"), text: __dialogueText("scenes/HollyIntroScene.js", "t_50e757c57fabc06607f1") }
    ] },
    { tone: 'serious', lines: [
      { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_1e954e77ee4e5253c6c5"), text: __dialogueText("scenes/HollyIntroScene.js", "t_f4f93a89db6836d93750") },
      { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_58de530cfa35752b7230"), text: __dialogueText("scenes/HollyIntroScene.js", "t_240d4587c662a3616fac") }
    ] },
    { tone: 'greedy', lines: [
      { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_1e954e77ee4e5253c6c5"), text: __dialogueText("scenes/HollyIntroScene.js", "t_bb744364ded3e1c4e5b2") },
      { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_58de530cfa35752b7230"), text: __dialogueText("scenes/HollyIntroScene.js", "t_ebbdaa241cb92cf1064a") },
      { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_58de530cfa35752b7230"), text: __dialogueText("scenes/HollyIntroScene.js", "t_50e757c57fabc06607f1") }
    ] }
  ] },
  { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_58de530cfa35752b7230"), text: __dialogueText("scenes/HollyIntroScene.js", "t_62c37e29d04f7e79b74c") },
  { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_1e954e77ee4e5253c6c5"), text: __dialogueText("scenes/HollyIntroScene.js", "t_dd7c20fddbdfc0013122") },
  { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_58de530cfa35752b7230"), text: __dialogueText("scenes/HollyIntroScene.js", "t_e9fbee6a8263393ebd98"), stamp: 'CLASSIFIED' },
  { choice: true, options: [
    { tone: 'sarcastic', lines: [
      { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_1e954e77ee4e5253c6c5"), text: __dialogueText("scenes/HollyIntroScene.js", "t_5ad00f98d7e55e4f19be") },
      { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_58de530cfa35752b7230"), text: __dialogueText("scenes/HollyIntroScene.js", "t_27cd71ceb568b2a867e3") }
    ] },
    { tone: 'serious', lines: [ { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_1e954e77ee4e5253c6c5"), text: __dialogueText("scenes/HollyIntroScene.js", "t_034bc3a16d07673de51a") } ] },
    { tone: 'greedy', lines: [
      { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_1e954e77ee4e5253c6c5"), text: __dialogueText("scenes/HollyIntroScene.js", "t_1da4c748f4fb0244aa69") },
      { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_58de530cfa35752b7230"), text: __dialogueText("scenes/HollyIntroScene.js", "t_6030b237e93b17d23fff") }
    ] }
  ] },
  { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_58de530cfa35752b7230"), text: __dialogueText("scenes/HollyIntroScene.js", "t_9e5655f42cefea5b5d71") },
  { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_1e954e77ee4e5253c6c5"), text: __dialogueText("scenes/HollyIntroScene.js", "t_f65d02ecbea38aac4be3") },
  { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_58de530cfa35752b7230"), text: __dialogueText("scenes/HollyIntroScene.js", "t_54ca21d98060df467a90") },
  { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_1e954e77ee4e5253c6c5"), text: __dialogueText("scenes/HollyIntroScene.js", "t_51863d7a15d8a13e3401") },
  { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_58de530cfa35752b7230"), text: __dialogueText("scenes/HollyIntroScene.js", "t_0048782429e52a93ccdf"), stamp: __dialogueText("scenes/HollyIntroScene.js", "t_26ce46b10bbdbeeccac6") }
];
const CLOSING_SCRIPT = [
  { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_58de530cfa35752b7230"), text: __dialogueText("scenes/HollyIntroScene.js", "t_446661c97578f44ff416") },
  { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_1e954e77ee4e5253c6c5"), text: __dialogueText("scenes/HollyIntroScene.js", "t_d97965f43c564e3eeb15") },
  { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_58de530cfa35752b7230"), text: __dialogueText("scenes/HollyIntroScene.js", "t_d51576c7ff76180b8316") },
  { speaker: __dialogueText("scenes/HollyIntroScene.js", "t_1e954e77ee4e5253c6c5"), text: __dialogueText("scenes/HollyIntroScene.js", "t_6509a5b517eb995a2b4c") }
];
const REWARD_CHOICES = [
  { id: 'cash', label: __dialogueText("scenes/HollyIntroScene.js", "t_fb5b1b0623205ba2c12c"), desc: __dialogueText("scenes/HollyIntroScene.js", "t_e21e026308b1dd9fce2a") },
  { id: 'rest', label: __dialogueText("scenes/HollyIntroScene.js", "t_878cef89d2a9686096fb"), desc: __dialogueText("scenes/HollyIntroScene.js", "t_21b6487c0f96a50b7a2e") },
  { id: 'kit', label: __dialogueText("scenes/HollyIntroScene.js", "t_2fb1d1b9ec31b925e61f"), desc: __dialogueText("scenes/HollyIntroScene.js", "t_cb1031afb8c84378546b") },
  { id: 'travel', label: __dialogueText("scenes/HollyIntroScene.js", "t_434a8d75fb758289413a"), desc: __dialogueText("scenes/HollyIntroScene.js", "t_47b1dcd8b1cdd60d9be7") }
];
const SPEAKER_COLORS = { HOLLY: '#e6c27a', DETECTIVE: '#8fc7e8' };

function hasCompletedHollyIntro() {
  return gameState.hollyIntroSeen === true ||
    REWARD_CHOICES.some(choice => choice.id === gameState.hollyIntroChoice);
}

class HollyHudGuard {
  constructor(owner) {
    this.owner = owner;
    this.snapshots = new Map();
    this.style = null;
    this.active = false;
    this.enforce = this.enforce.bind(this);
  }

  start() {
    if (this.active) return;
    this.active = true;
    if (typeof document !== 'undefined' && document.head) {
      this.style = document.createElement('style');
      this.style.setAttribute('data-holly-hud-lock', 'true');
      this.style.textContent = `${__dialogueText("scenes/HollyIntroScene.js", "t_3f18ff5f78084f067ac4")}`;
      document.head.appendChild(this.style);
    }
    this.owner.events.on('preupdate', this.enforce);
    this.enforce();
  }

  enforce() {
    if (!this.active) return;
    const keys = this.owner.scene?.manager?.keys;
    if (!keys) return;
    for (const key of ['UIScene', 'PlayerHudScene', 'NewsHud']) {
      const scene = keys[key];
      if (!scene?.sys || !(scene.sys.isActive() || scene.sys.isPaused())) continue;
      let snapshot = this.snapshots.get(key);
      if (!snapshot || snapshot.scene !== scene) {
        snapshot = {
          scene,
          visible: scene.sys.settings.visible,
          input: scene.input,
          inputEnabled: scene.input?.enabled,
          keyboard: scene.input?.keyboard,
          keyboardEnabled: scene.input?.keyboard?.enabled,
          newsEnabled: key === 'NewsHud' ? scene.hudEnabled : null
        };
        this.snapshots.set(key, snapshot);
        if (key === 'PlayerHudScene') {
          scene.closeAllUIPanels?.();
          scene._panelInstances?.get('playerMenu')?.close?.();
        }
        if (key === 'UIScene') {
          scene._hideTooltip?.();
          scene._setEnergyLogVisible?.(false);
        }
      }
      if (key === 'NewsHud') {
        scene.closeMenu?.(true);
        if (scene.hudEnabled !== false) scene.setHudVisible?.(false);
      }
      scene.sys.setVisible(false);
      if (scene.input) scene.input.enabled = false;
      if (scene.input?.keyboard) scene.input.keyboard.enabled = false;
    }
  }

  release() {
    if (!this.active) return;
    this.active = false;
    this.owner.events.off('preupdate', this.enforce);
    this.style?.remove();
    this.style = null;
    const keys = this.owner.scene?.manager?.keys;
    const failed = gameState.caseFailed === true;
    for (const [key, snapshot] of this.snapshots) {
      const scene = keys?.[key];
      if (scene !== snapshot.scene || !scene?.sys ||
          !(scene.sys.isActive() || scene.sys.isPaused())) continue;
      if (scene.input === snapshot.input && typeof snapshot.inputEnabled === 'boolean') {
        scene.input.enabled = snapshot.inputEnabled;
      }
      if (scene.input?.keyboard === snapshot.keyboard && typeof snapshot.keyboardEnabled === 'boolean') {
        scene.input.keyboard.enabled = snapshot.keyboardEnabled;
      }
      if (key === 'NewsHud' && typeof snapshot.newsEnabled === 'boolean') {
        scene.setHudVisible?.(failed ? false : snapshot.newsEnabled);
      }
      if (failed && key === 'UIScene') scene.hideHUD?.();
      scene.sys.setVisible(failed ? false : snapshot.visible);
    }
    this.snapshots.clear();
  }
}

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
    this.hollyPortrait = null;
    this.portraitBaseY = 0;
    this.stampText = null;
    this.stampShown = false;
    this._finishEmitted = false;
    this._applyingReward = false;
    this._skipRepeatedIntro = false;
    this._hudGuard = null;
    this.source = 'forced_sleep';
    this.sleepHours = 6;
    this.boundAdvance = this.handleAdvance.bind(this);
  }

  init(data = {}) {
    this._hudGuard?.release();
    this._hudGuard = null;
    this.returnScene = data.returnScene || null;
    this.returnData = data.returnData && typeof data.returnData === 'object'
      ? { ...data.returnData } : {};
    const manual = this.returnScene === 'HotelScene' || this.returnScene === 'SleepScene';
    this.source = data.source || (manual ? 'hotel_sleep' : 'forced_sleep');
    const hours = Number(this.returnData.sleepHours ?? data.sleepHours ?? (manual ? 8 : 6));
    this.sleepHours = Number.isFinite(hours) && hours > 0 ? hours : (manual ? 8 : 6);
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
    this.hollyPortrait = null;
    this.stampText = null;
    this.stampShown = false;
    this._finishEmitted = false;
    this._applyingReward = false;
    this._skipRepeatedIntro = false;
  }

  _syncCompletedIntro() {
    gameState.updateState({ hollyIntroSeen: true, hollyIntroPending: false, hollyFirstSleepSeen: true });
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
        if (!this._cleanupDone) this.finishScene();
      });
      return;
    }
    this._hudGuard = new HollyHudGuard(this);
    this._hudGuard.start();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#000000');
    this.bg = this.add.rectangle(0, 0, width, height, 0x000000, 1).setOrigin(0, 0).setDepth(0);
    this.overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.45)
      .setOrigin(0, 0).setDepth(8).setVisible(false);
    this.dialogPanel = this.add.rectangle(width / 2, height - 138, width - 56, 220, 0x111111, 0.96)
      .setStrokeStyle(3, 0x8b6b3f, 1).setDepth(10).setVisible(false);
    this.nameText = this.add.text(42, height - 236, '', {
      fontFamily: 'SpecialElite', fontSize: '30px', color: '#d7c29a'
    }).setDepth(11).setVisible(false);
    this.dialogText = this.add.text(42, height - 190, '', {
      fontFamily: 'SpecialElite', fontSize: '28px', color: '#f4ead7', wordWrap: { width: width - 320 }
    }).setDepth(11).setVisible(false);
    this.continueText = this.add.text(width - 40, height - 30, __dialogueText("scenes/HollyIntroScene.js", "t_77a852cfc873edb0457c"), {
      fontFamily: 'PressStart2P', fontSize: '10px', color: '#c9b78c'
    }).setOrigin(1, 1).setDepth(11).setVisible(false);
    this.createTrackedTween({ targets: this.continueText, alpha: 0.3,
      duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.stampText = this.add.text(width * 0.42, height * 0.3, '', {
      fontFamily: 'PressStart2P', fontSize: '44px', color: '#c0392b',
      stroke: __dialogueText("scenes/HollyIntroScene.js", "t_3eac5ba92e880ae7ba06"), strokeThickness: 2, padding: { x: 18, y: 12 }
    }).setOrigin(0.5).setAngle(-14).setDepth(14).setVisible(false);
    this.trackInputEvent(this.input, 'pointerdown', this.boundAdvance);
    if (this.input.keyboard) this.trackInputEvent(this.input.keyboard, 'keydown-SPACE', this.boundAdvance);
    this.playIntroVideo();
  }

  update() {
    if (this.video && !this.videoFitted) this.tryFitVideo(this.video);
  }

  createFullscreenVideo(key) {
    const { width, height } = this.scale;
    this.videoFitted = false;
    const video = this.add.video(width / 2, height / 2, key).setOrigin(0.5).setDepth(2).setAlpha(0);
    video.once('textureready', () => this.tryFitVideo(video));
    video.once('playing', () => this.tryFitVideo(video));
    this.time.delayedCall(1500, () => {
      if (video.active) { this.tryFitVideo(video); video.setAlpha(1); }
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
    video.setScale(Math.min(width / videoWidth, height / videoHeight));
    video.setAlpha(1);
    this.videoFitted = true;
    return true;
  }

  destroyVideo(video) { if (video?.active) video.destroy(); }

  playIntroVideo() {
    this.phase = 'intro-video';
    this.video = this.createFullscreenVideo('in');
    this.video.once('complete', () => {
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
    this.dialogPanel.setPosition(width / 2, height - 138).setSize(width - 56, 220);
    this.nameText.setPosition(42, height - 236);
    this.dialogText.setPosition(42, height - 190);
  }

  layoutOptions(count, spacing) {
    const { width, height } = this.scale;
    const panelHeight = count * spacing + 140;
    const panelTop = height - 20 - panelHeight;
    this.dialogPanel.setPosition(width / 2, panelTop + panelHeight / 2).setSize(width - 56, panelHeight);
    this.nameText.setPosition(42, panelTop + 12);
    this.dialogText.setPosition(42, panelTop + 54);
    return panelTop + 130;
  }

  showDialogueLayout() {
    const { width, height } = this.scale;
    this.layoutDialogue();
    this.overlay.setVisible(true);
    this.dialogPanel.setVisible(true);
    this.nameText.setVisible(true);
    this.dialogText.setVisible(true);
    if (!this.hollyPortrait) {
      this.portraitBaseY = height - 362;
      this.hollyPortrait = this.add.image(width - 165, this.portraitBaseY, 'holly')
        .setOrigin(0.5).setScale(0.42).setDepth(9);
      this.createTrackedTween({ targets: this.hollyPortrait, y: this.portraitBaseY - 6,
        duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.hollyPortrait.setVisible(true);
  }

  hideDialogueLayout() {
    this.stopTyping();
    this.hideStamp();
    this.overlay.setVisible(false);
    this.dialogPanel.setVisible(false);
    this.nameText.setVisible(false);
    this.dialogText.setVisible(false);
    this.continueText.setVisible(false);
    this.hollyPortrait?.setVisible(false);
  }

  startScript(script, nextPhase) {
    this.queue = [...script];
    this.nextPhaseAfterDialogue = nextPhase;
    this.phase = 'dialogue';
    this.showDialogueLayout();
    this.advance();
  }

  handleAdvance() {
    if (this.phase !== 'dialogue') return;
    if (this.isTyping) { this.finishTyping(); return; }
    this.advance();
  }

  advance() {
    this.hideStamp();
    if (this.queue.length === 0) { this.onScriptDone(); return; }
    const item = this.queue.shift();
    if (item.choice) { this.showDialogueChoice(item); return; }
    this.showLine(item);
  }

  onScriptDone() {
    if (this.nextPhaseAfterDialogue === 'choices') { this.showRewardChoices(); return; }
    if (this.nextPhaseAfterDialogue === 'outro') this.playOutroVideo();
  }

  showLine(line) {
    this.layoutDialogue();
    this.nameText.setText(line.speaker).setColor(SPEAKER_COLORS[line.speaker] || '#d7c29a');
    this.setSpeaker(line.speaker);
    if (line.stamp) this.showStamp(line.stamp);
    this.typeLine(line.text);
  }

  typeLine(text) {
    this.stopTyping();
    this.fullText = text;
    this.isTyping = true;
    this.dialogText.setText('');
    this.continueText.setVisible(false);
    let index = 0;
    this.typingEvent = this.time.addEvent({ delay: TYPE_DELAY_MS, loop: true,
      callback: () => {
        index++;
        this.dialogText.setText(this.fullText.slice(0, index));
        if (index >= this.fullText.length) this.finishTyping();
      }
    });
  }

  stopTyping() { this.typingEvent?.remove(false); this.typingEvent = null; }

  finishTyping() {
    this.stopTyping();
    this.isTyping = false;
    this.dialogText.setText(this.fullText);
    this.continueText.setVisible(true);
  }

  setSpeaker(speaker) {
    if (!this.hollyPortrait?.active) return;
    if (speaker === 'HOLLY') {
      this.hollyPortrait.clearTint().setAlpha(1);
      this.createTrackedTween({ targets: this.hollyPortrait, scale: 0.45,
        duration: 110, yoyo: true, ease: 'Quad.easeOut' });
      return;
    }
    this.hollyPortrait.setTint(0x8a8a8a).setAlpha(0.7);
  }

  showStamp(label) {
    if (!this.stampText?.active) return;
    this.killTrackedTweensOf(this.stampText);
    this.stampText.setText(label).setVisible(true).setAlpha(0).setScale(2.6);
    this.stampShown = true;
    this.createTrackedTween({ targets: this.stampText, scale: 1, alpha: 0.92,
      duration: 170, ease: 'Quad.easeIn', onComplete: () => this.cameras.main.shake(90, 0.004) });
  }

  hideStamp() {
    if (!this.stampShown || !this.stampText?.active) return;
    this.killTrackedTweensOf(this.stampText);
    this.stampText.setVisible(false);
    this.stampShown = false;
  }

  showOptions({ speaker, prompt, entries, spacing, fontSize, onPick }) {
    this.continueText.setVisible(false);
    const { width } = this.scale;
    const firstTop = this.layoutOptions(entries.length, spacing);
    const boxHeight = spacing - 10;
    this.nameText.setText(speaker).setColor(SPEAKER_COLORS[speaker] || '#d7c29a');
    this.dialogText.setText(prompt);
    entries.forEach((entry, index) => {
      const y = firstTop + index * spacing + spacing / 2;
      const box = this.add.rectangle(width / 2, y, width - 120, boxHeight, 0x2a2a2a, 0.97)
        .setStrokeStyle(2, 0x8b6b3f, 1).setInteractive({ useHandCursor: true }).setDepth(12);
      const text = this.add.text(60, y, entry.label, {
        fontFamily: 'SpecialElite', fontSize: `${fontSize}px`, color: '#f4ead7',
        wordWrap: { width: width - 180 }
      }).setOrigin(0, 0.5).setDepth(13);
      box.on('pointerover', () => box.setFillStyle(0x3a3126, 1));
      box.on('pointerout', () => box.setFillStyle(0x2a2a2a, 0.97));
      box.on('pointerdown', () => onPick(index));
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => onPick(index));
      this.choiceNodes.push(box, text);
    });
  }

  clearChoices() {
    this.choiceNodes.forEach(node => { if (node?.active) node.destroy(); });
    this.choiceNodes = [];
  }

  showDialogueChoice(item) {
    this.phase = 'dialogue-choice';
    this.setSpeaker('DETECTIVE');
    this.showOptions({ speaker: __dialogueText("scenes/HollyIntroScene.js", "t_1e954e77ee4e5253c6c5"), prompt: __dialogueText("scenes/HollyIntroScene.js", "t_9276ea83937dc25660ee"), spacing: 62, fontSize: 21,
      entries: item.options.map(option => ({ label: option.lines[0].text })),
      onPick: index => this.pickDialogueOption(item, index) });
  }

  pickDialogueOption(item, index) {
    if (this.phase !== 'dialogue-choice') return;
    const option = item.options[index];
    if (!option) return;
    this.phase = 'picking';
    this.pickedTones.push(option.tone);
    this.clearChoices();
    this.time.delayedCall(80, () => {
      if (this._cleanupDone) return;
      this.queue.unshift(...option.lines);
      this.phase = 'dialogue';
      this.layoutDialogue();
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
    this.setSpeaker('HOLLY');
    this.showOptions({ speaker: __dialogueText("scenes/HollyIntroScene.js", "t_58de530cfa35752b7230"),
      prompt: __dialogueText("scenes/HollyIntroScene.js", "t_c5f780118a1f30f19ce3"),
      spacing: 48, fontSize: 22,
      entries: REWARD_CHOICES.map(choice => ({ label: `${choice.label}${__dialogueText("scenes/HollyIntroScene.js", "t_3b2e8119b6fcc97df985")}${choice.desc}` })),
      onPick: index => this.selectChoice(REWARD_CHOICES[index]) });
  }

  selectChoice(choice) {
    if (this.phase !== 'choices' || !choice) return;
    this.phase = 'applying-choice';
    this.clearChoices();
    try { this.applyChoice(choice); }
    catch (error) {
      console.error('[HollyIntroScene] Applying choice failed:', error);
      this.phase = 'choices';
      this.showRewardChoices();
      return;
    }
    this.time.delayedCall(80, () => {
      if (!this._cleanupDone) this.startScript(CLOSING_SCRIPT, 'outro');
    });
  }

  getDominantTone() {
    if (this.pickedTones.length === 0) return null;
    const counts = {};
    this.pickedTones.forEach(tone => { counts[tone] = (counts[tone] || 0) + 1; });
    return Object.keys(counts).reduce((best, tone) => counts[tone] > counts[best] ? tone : best);
  }

  applyChoice(choice) {
    if (hasCompletedHollyIntro()) { this._syncCompletedIntro(); return false; }
    if (this._applyingReward) return false;
    if (!REWARD_CHOICES.some(entry => entry.id === choice?.id)) {
      throw new Error('[HollyIntroScene] Invalid reward choice.');
    }
    this._applyingReward = true;
    try {
      this.grantHollyChoiceReward(choice.id);
      gameState.updateState({
        hollyIntroSeen: true, hollyIntroPending: false, hollyFirstSleepSeen: true,
        hollyIntroChoice: choice.id, hollyIntroTone: this.getDominantTone(),
        johnCaseAccepted: true, blackLadyCaseAccepted: true
      });
      requestAutosave();
      flushAutosave();
      EventBus.emit('hollyIntroChoiceMade', { choice: choice.id });
      return true;
    } finally { this._applyingReward = false; }
  }

  grantHollyChoiceReward(choiceId) {
    const fullState = gameState.getState ? gameState.getState() : {};
    switch (choiceId) {
      case 'cash':
        moneyManager.addCash(250, {
          category: ECONOMY_CATEGORY.AGENCY_ADVANCE, description: __dialogueText("scenes/HollyIntroScene.js", "t_a7ef26be8904c900b45f"),
          missionId: 'black-lady-main-case', metadata: { source: 'holly_intro_choice', choiceId }
        });
        break;
      case 'rest':
        gameState.updateState({ restVouchers: Number(fullState.restVouchers || 0) + 2 });
        break;
      case 'kit':
        hintManager.grantOnce('holly_intro_field_support', 2, __dialogueText("scenes/HollyIntroScene.js", "t_0da52c91c65a43f635d8"));
        break;
      case 'travel':
        gameState.updateState({ freeTransfers: Number(fullState.freeTransfers || 0) + 2 });
        break;
      default: throw new Error(`[HollyIntroScene] Unknown reward choice: ${choiceId}`);
    }
  }

  finishScene() {
    if (this._finishEmitted) return;
    this._finishEmitted = true;
    this.phase = 'finished';
    this._hudGuard?.release();
    this._hudGuard = null;
    const choice = gameState.hollyIntroChoice || null;
    const sleepHours = this.sleepHours;
    EventBus.emit('hollyIntroFinished', {
      choice, sleepHours, source: this.source, skipped: this._skipRepeatedIntro
    });
    if (this.returnScene === 'HotelScene' || this.returnScene === 'SleepScene') {
      EventBus.emit('hollySleepFinished', { choice, sleepHours, skipped: this._skipRepeatedIntro });
      return;
    }
    this.scene.stop();
  }

  cleanup() {
    this._hudGuard?.release();
    this._hudGuard = null;
    this.stopTyping();
    this.clearChoices();
    this.destroyVideo(this.video);
    this.destroyVideo(this.bgVideo);
    this.video = null;
    this.bgVideo = null;
    this.hollyPortrait = null;
    this.stampText = null;
    super.cleanup();
  }
}