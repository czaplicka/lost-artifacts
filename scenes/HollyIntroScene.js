import { dialogueText } from '../dialogues/DialogueText.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { moneyManager, ECONOMY_CATEGORY } from '../managers/MoneyManager.js';
import hintManager from '../managers/HintManager.js';
import { requestAutosave, flushAutosave } from '../gameStatePersistence.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { DialoguePanel } from '../ui/DialoguePanel.js';
import { showDialogueBubbles } from '../ui/DialogueBubbles.js';

const T = id => dialogueText('scenes/HollyIntroScene.js', id);
const HOLLY = T('t_58de530cfa35752b7230');
const DETECTIVE = T('t_1e954e77ee4e5253c6c5');
const TRUST_KEY = 'holly_trust';
const START_TRUST = 50;
const TRUST_BY_TONE = Object.freeze({ serious: 10, sarcastic: -5, greedy: -10 });
const GOLD = 0xd4af37;
const IVORY = 0xf3e7c4;
const PRESS = '"Press Start 2P", monospace';
const line = (speaker, id, extra = {}) => ({ speaker, text: T(id), ...extra });

const OPENING_SCRIPT = [
  line(HOLLY, 't_3cfc53f7bfc5b8f7ae88'),
  { choice: true, options: [
    { tone: 'sarcastic', lines: [line(DETECTIVE, 't_74c233625f6b492e13c7'), line(HOLLY, 't_50e757c57fabc06607f1')] },
    { tone: 'serious', lines: [line(DETECTIVE, 't_f4f93a89db6836d93750'), line(HOLLY, 't_240d4587c662a3616fac')] },
    { tone: 'greedy', lines: [line(DETECTIVE, 't_bb744364ded3e1c4e5b2'), line(HOLLY, 't_ebbdaa241cb92cf1064a'), line(HOLLY, 't_50e757c57fabc06607f1')] }
  ] },
  line(HOLLY, 't_62c37e29d04f7e79b74c'),
  line(DETECTIVE, 't_dd7c20fddbdfc0013122'),
  line(HOLLY, 't_e9fbee6a8263393ebd98', { stamp: 'CLASSIFIED' }),
  { choice: true, options: [
    { tone: 'sarcastic', lines: [line(DETECTIVE, 't_5ad00f98d7e55e4f19be'), line(HOLLY, 't_27cd71ceb568b2a867e3')] },
    { tone: 'serious', lines: [line(DETECTIVE, 't_034bc3a16d07673de51a')] },
    { tone: 'greedy', lines: [line(DETECTIVE, 't_1da4c748f4fb0244aa69'), line(HOLLY, 't_6030b237e93b17d23fff')] }
  ] },
  line(HOLLY, 't_9e5655f42cefea5b5d71'),
  line(DETECTIVE, 't_f65d02ecbea38aac4be3'),
  line(HOLLY, 't_54ca21d98060df467a90'),
  line(DETECTIVE, 't_51863d7a15d8a13e3401'),
  line(HOLLY, 't_0048782429e52a93ccdf', { stamp: T('t_26ce46b10bbdbeeccac6') })
];
const CLOSING_SCRIPT = [
  line(HOLLY, 't_446661c97578f44ff416'),
  line(DETECTIVE, 't_d97965f43c564e3eeb15'),
  line(HOLLY, 't_d51576c7ff76180b8316'),
  line(DETECTIVE, 't_6509a5b517eb995a2b4c')
];
const REWARD_CHOICES = [
  { id: 'cash', label: T('t_fb5b1b0623205ba2c12c'), desc: T('t_e21e026308b1dd9fce2a') },
  { id: 'rest', label: T('t_878cef89d2a9686096fb'), desc: T('t_21b6487c0f96a50b7a2e') },
  { id: 'kit', label: T('t_2fb1d1b9ec31b925e61f'), desc: T('t_cb1031afb8c84378546b') },
  { id: 'travel', label: T('t_434a8d75fb758289413a'), desc: T('t_47b1dcd8b1cdd60d9be7') }
];

function hasCompletedHollyIntro() {
  return gameState.hollyIntroSeen === true || REWARD_CHOICES.some(choice => choice.id === gameState.hollyIntroChoice);
}
function clampTrust(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
export function getHollyTrust() {
  const value = MainStoryManager.getSideClue(TRUST_KEY)?.value;
  return Number.isFinite(value) ? clampTrust(value) : START_TRUST;
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
      this.style.textContent = `${T('t_3f18ff5f78084f067ac4')}`;
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
          scene, visible: scene.sys.settings.visible,
          input: scene.input, inputEnabled: scene.input?.enabled,
          keyboard: scene.input?.keyboard, keyboardEnabled: scene.input?.keyboard?.enabled,
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
      if (scene !== snapshot.scene || !scene?.sys || !(scene.sys.isActive() || scene.sys.isPaused())) continue;
      if (scene.input === snapshot.input && typeof snapshot.inputEnabled === 'boolean') scene.input.enabled = snapshot.inputEnabled;
      if (scene.input?.keyboard === snapshot.keyboard && typeof snapshot.keyboardEnabled === 'boolean') scene.input.keyboard.enabled = snapshot.keyboardEnabled;
      if (key === 'NewsHud' && typeof snapshot.newsEnabled === 'boolean') scene.setHudVisible?.(failed ? false : snapshot.newsEnabled);
      if (failed && key === 'UIScene') scene.hideHUD?.();
      scene.sys.setVisible(failed ? false : snapshot.visible);
    }
    this.snapshots.clear();
  }
}

class HollyDialoguePanel extends DialoguePanel {
  constructor(scene, trust) {
    super(scene, { depth: 9000, modal: true });
    this.background = this.root;
    this.text = this.body;
    this.portraitObjects = [];
    this.stamp = null;
    this.items = [];
    this.leaveButton = { setVisible: () => this.leaveButton };
    this.isOpen = true;
    this.bubbleSide = 'npc';
    this.bubble = null;
    this.meterObjs.forEach(object => object.setVisible(false));
    this.numText.setVisible(false);
    this.toneObjs.forEach(object => object.setVisible(false));
    this.byeBtn.rect.setVisible(false);
    this.byeBtn.text.setVisible(false);
    this._setTabsVisible(false);
    this._setEntries([]);
    const { lx, lw, py, s } = this.L;
    this.meterWidth = Math.min(109 * s, lw * 0.40);
    this.meterX = lx + lw - this.meterWidth / 2;
    this.meterY = py + 52 * s;
    this.meterRadius = Math.min(25 * s, this.meterWidth * 0.40);
    this.meterFace = scene.add.graphics();
    this.root.add(this.meterFace);
    this.meterCaption = this._txt(this.meterX, py + 9 * s, '', PRESS, 7 * s, '#d4af37').setOrigin(0.5, 0);
    this.setTrust(trust);
    this._show();
  }
  get isTyping() { return this.mode === 'typing'; }
  setTrust(value) {
    const next = clampTrust(value);
    const before = this.trustTweenState?.value ?? next;
    this.trustTween?.remove();
    this.trustTweenState = { value: before };
    this.meterCaption.setText(`TRUST ${next}`);
    if (before === next) {
      this.drawTrustDial(next);
      return;
    }
    this.trustTween = this.scene.tweens.add({
      targets: this.trustTweenState, value: next, duration: 320, ease: 'Sine.easeOut',
      onUpdate: () => this.drawTrustDial(this.trustTweenState.value),
      onComplete: () => { this.trustTween = null; this.drawTrustDial(next); }
    });
  }
  drawTrustDial(value) {
    const g = this.meterFace;
    const { s } = this.L;
    const x = this.meterX, y = this.meterY, r = this.meterRadius;
    g.clear();
    [0xb95749, 0xc99042, 0x669d62].forEach((color, index) => {
      const start = Math.PI + index * Math.PI / 3 + 0.035;
      const end = Math.PI + (index + 1) * Math.PI / 3 - 0.035;
      g.lineStyle(5 * s, color, 1);
      g.beginPath();
      g.arc(x, y, r, start, end, false);
      g.strokePath();
    });
    g.lineStyle(Math.max(1, s), GOLD, 0.8);
    for (let i = 0; i <= 4; i++) {
      const angle = Math.PI + i * Math.PI / 4;
      const inner = r - 8 * s, outer = r - 4 * s;
      g.lineBetween(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner,
        x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
    }
    const angle = Math.PI + value / 100 * Math.PI;
    const length = Math.max(0, r - 5 * s);
    g.lineStyle(2 * s, IVORY, 1);
    g.lineBetween(x, y, x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    g.fillStyle(GOLD, 1);
    g.fillCircle(x, y, 3 * s);
  }
  _handleKey(event) {
    if (!this.isOpen || event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
      event.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
    if (/^[1-9]$/.test(event.key)) this._pickIndex(Number(event.key) - 1);
  }
  _advance() {
    if (!this.isOpen || this.mode === 'choices') return;
    if (this.isTyping) { this.completeTypewriter(); return; }
    if (this.scene.phase === 'dialogue') this.scene.advance();
  }
  advance() { this._advance(); }
  setSpeaker({ name }) {
    this.bubbleSide = name === DETECTIVE ? 'player' : 'npc';
    this.nameText.setText(String(name ?? '').toUpperCase());
    const { lw, s } = this.L;
    this._fitWidth(this.nameText, Math.max(1, lw - this.meterWidth - 8 * s), 14 * s, 7 * s);
  }
  setText(text, { instant = false } = {}) {
    this.bubble?.destroy();
    const view = {
      L: this.L, scene: this.scene, root: this.root, body: this.body,
      pageLabel: { setText() {} }, renderTextPage() {}
    };
    const index = this.root.getIndex(this.body);
    showDialogueBubbles(view, [{ speaker: this.bubbleSide, text }]);
    this.bubble = this.root.getAt(index);
    this.stopTypewriter();
    this._showLine({ kind: 'say', text: String(text ?? '') });
    if (instant) this.completeTypewriter();
  }
  _afterLines() {
    const choosing = this.items.length > 0;
    this._setMode(choosing ? 'choices' : 'waiting');
    this.contArrow.setVisible(!choosing);
  }
  stopTypewriter() {
    this._cancelTyper();
    if (this.isTyping) this._setMode('waiting');
  }
  completeTypewriter() { if (this.isTyping) this._finishTyping(); }
  setTopics(items) {
    this.items = items;
    this.scroll = 0;
    this.choiceTitle.setVisible(items.length > 0);
    if (items.length) this._setMode('choices');
    else if (this.mode === 'choices') this._setMode('waiting');
    this._setEntries(items.map(item => ({ label: item.label, style: 'new' })));
    this.contArrow.setVisible(!items.length && this.mode === 'waiting');
  }
  _drawRows() {
    super._drawRows();
    const { rw, listY, s } = this.L;
    const step = 47 * s, rowHeight = 43 * s;
    this.rows.forEach((row, index) => {
      if (!this._entries[this.scroll + index]) return;
      const y = listY + index * step;
      const width = Math.max(1, rw - 2 * s), height = Math.max(1, rowHeight);
      row.bg.setY(y).setSize(width, height);
      row.bg.input?.hitArea?.setSize(width, height);
      row.num.setY(y + height / 2);
      row.label.setY(y + height / 2).setWordWrapWidth(Math.max(1, rw - 42 * s), true).setFontSize(15 * s).setLineSpacing(0);
      let size = 15 * s;
      while (row.label.height > height - 2 * s && size > 8 * s) {
        size -= s;
        row.label.setFontSize(size);
      }
    });
  }
  _pickIndex(index) {
    if (!this.isOpen || this.mode !== 'choices') return;
    this.items[index]?.onSelect?.();
  }
  setStamp(label, { color = '#c0392b', slam = false } = {}) {
    this.clearStamp();
    const { lx, lw, py, ph, s } = this.L;
    this.stamp = this.scene.add.text(lx + lw / 2, py + ph - 42 * s, label, {
      fontFamily: PRESS, fontSize: `${12 * s}px`, color,
      stroke: '#17110a', strokeThickness: 4 * s
    }).setOrigin(0.5).setAngle(-8);
    this.root.add(this.stamp);
    if (slam) {
      this.stamp.setScale(1.7);
      this.scene.tweens.add({ targets: this.stamp, scaleX: 1, scaleY: 1, duration: 150 });
    }
  }
  clearStamp() {
    if (!this.stamp) return;
    this.scene.tweens.killTweensOf(this.stamp);
    this.stamp.destroy();
    this.stamp = null;
  }
  destroy() {
    this.trustTween?.remove();
    this.trustTween = null;
    this.clearStamp();
    super.destroy();
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
    this.dialoguePanel = null;
    this._optionsToken = 0;
    this.boundAdvance = this.handleAdvance.bind(this);
    this.hollyTrust = START_TRUST;
  }
  get isTyping() { return this.dialoguePanel?.isTyping ?? this._typingFallback ?? false; }
  set isTyping(value) { this._typingFallback = Boolean(value); }
  init(data = {}) {
    this._hudGuard?.release();
    this._hudGuard = null;
    this.stopTyping();
    this.dialoguePanel?.destroy();
    this.dialoguePanel = null;
    this.returnScene = data.returnScene || null;
    this.returnData = data.returnData && typeof data.returnData === 'object' ? { ...data.returnData } : {};
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
    this._optionsToken++;
    this.hollyTrust = getHollyTrust();
  }
  preload() {
    if (!this.textures.exists('holly')) this.load.image('holly', 'assets/pi/holly.webp');
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
      this.time.delayedCall(0, () => { if (!this._cleanupDone) this.finishScene(); });
      return;
    }
    this._hudGuard = new HollyHudGuard(this);
    this._hudGuard.start();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#000000');
    this.bg = this.add.rectangle(0, 0, width, height, 0x000000, 1).setOrigin(0).setDepth(0);
    this.overlay = this.add.rectangle(0, 0, width, height, 0x000000, .45).setOrigin(0).setDepth(8).setVisible(false);
    this.trackInputEvent(this.scale, 'resize', this.layoutDialogue, this);
    if (this.input.keyboard) {
      this.trackInputEvent(this.input.keyboard, 'keydown-SPACE', this.boundAdvance);
      this.trackInputEvent(this.input.keyboard, 'keydown-ENTER', this.boundAdvance);
    }
    this.playIntroVideo();
  }
  update() { if (this.video && !this.videoFitted) this.tryFitVideo(this.video); }
  createFullscreenVideo(key) {
    const { width, height } = this.scale;
    this.videoFitted = false;
    const video = this.add.video(width / 2, height / 2, key).setOrigin(.5).setDepth(2).setAlpha(0);
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
    if (video === this.video || !this.video) this.videoFitted = true;
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
  ensureDialoguePanel() {
    if (this.dialoguePanel?.isOpen) return this.dialoguePanel;
    const panel = new HollyDialoguePanel(this, this.hollyTrust);
    this.dialoguePanel = panel;
    this.dialogPanel = panel.background;
    this.dialogText = panel.text;
    this.continueText = panel.leaveButton;
    return panel;
  }
  layoutDialogue() {
    const { width, height } = this.scale;
    this.bg?.setSize(width, height);
    this.overlay?.setSize(width, height);
    this.tryFitVideo(this.video);
    this.tryFitVideo(this.bgVideo);
  }
  showDialogueLayout() { this.overlay?.setVisible(true); this.ensureDialoguePanel(); }
  hideDialogueLayout() {
    this.stopTyping();
    this.hideStamp();
    this.overlay?.setVisible(false);
    this.dialoguePanel?.destroy();
    this.dialoguePanel = null;
    this.dialogPanel = null;
    this.nameText = null;
    this.dialogText = null;
    this.continueText = null;
    this.hollyPortrait = null;
    this._optionsToken++;
  }
  startScript(script, nextPhase) {
    this.queue = [...script];
    this.nextPhaseAfterDialogue = nextPhase;
    this.phase = 'dialogue';
    this.showDialogueLayout();
    this.advance();
  }
  handleAdvance(event) {
    if (event?.repeat || this.phase !== 'dialogue') return;
    const target = event?.target;
    if (event?.ctrlKey || event?.metaKey || event?.altKey || target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;
    event?.preventDefault?.();
    this.dialoguePanel?.advance();
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
  showLine(item) {
    this.clearChoices();
    const panel = this.ensureDialoguePanel();
    panel.leaveButton.setVisible(true);
    this.setSpeaker(item.speaker);
    if (item.stamp) this.showStamp(item.stamp);
    this.typeLine(item.text);
  }
  typeLine(text) { this.stopTyping(); this.fullText = text; this.ensureDialoguePanel().setText(text); }
  stopTyping() {
    this.typingEvent?.remove(false);
    this.typingEvent = null;
    this.dialoguePanel?.stopTypewriter();
    this.isTyping = false;
  }
  finishTyping() { this.dialoguePanel?.completeTypewriter(); }
  setSpeaker(speaker) {
    const panel = this.ensureDialoguePanel();
    panel.setSpeaker({ name: speaker, portrait: { kind: 'texture', key: speaker === HOLLY ? 'holly' : 'portrait_fallback' } });
    this.nameText = panel.nameText;
    this.hollyPortrait = panel.portraitObjects[0] || null;
  }
  showStamp(label) {
    this.dialoguePanel?.setStamp(label, { slam: true, color: '#c0392b', colorInt: 0xc0392b });
    this.stampText = this.dialoguePanel?.stamp || null;
    this.stampShown = true;
  }
  hideStamp() {
    if (!this.stampShown) return;
    this.dialoguePanel?.clearStamp();
    this.stampText = null;
    this.stampShown = false;
  }
  showOptions({ speaker, prompt, entries, onPick }) {
    this.stopTyping();
    this.hideStamp();
    this.showDialogueLayout();
    this.setSpeaker(speaker);
    const panel = this.dialoguePanel;
    const token = ++this._optionsToken;
    panel.setText(prompt, { instant: true });
    panel.leaveButton.setVisible(false);
    panel.setTopics(entries.map((entry, index) => ({
      id: `choice_${index}`, label: entry.label,
      onSelect: () => {
        if (this._optionsToken === token && this.dialoguePanel === panel && panel.isOpen) onPick(index);
      }
    })));
  }
  clearChoices() { this._optionsToken++; this.choiceNodes = []; this.dialoguePanel?.setTopics([]); }
  showDialogueChoice(item) {
    this.phase = 'dialogue-choice';
    this.showOptions({ speaker: DETECTIVE, prompt: T('t_9276ea83937dc25660ee'),
      entries: item.options.map(option => ({ label: option.lines[0].text })),
      onPick: index => this.pickDialogueOption(item, index) });
  }
  pickDialogueOption(item, index) {
    const option = item?.options?.[index];
    if (this.phase !== 'dialogue-choice' || !option) return;
    this.phase = 'picking';
    this.pickedTones.push(option.tone);
    this.clearChoices();
    this.time.delayedCall(80, () => {
      if (this._cleanupDone) return;
      this.queue.unshift(...option.lines);
      this.phase = 'dialogue';
      this.advance();
    });
    this.hollyTrust = clampTrust(this.hollyTrust + (TRUST_BY_TONE[option.tone] ?? 0));
    this.dialoguePanel?.setTrust(this.hollyTrust);
  }
  showRewardChoices() {
    if (hasCompletedHollyIntro()) { this._syncCompletedIntro(); this.startScript(CLOSING_SCRIPT, 'outro'); return; }
    this.phase = 'choices';
    this.showOptions({ speaker: HOLLY, prompt: T('t_c5f780118a1f30f19ce3'),
      entries: REWARD_CHOICES.map(choice => ({ label: `${choice.label}${T('t_3b2e8119b6fcc97df985')}${choice.desc}` })),
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
    this.time.delayedCall(80, () => { if (!this._cleanupDone) this.startScript(CLOSING_SCRIPT, 'outro'); });
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
    if (!REWARD_CHOICES.some(entry => entry.id === choice?.id)) throw new Error('[HollyIntroScene] Invalid reward choice.');
    const previous = MainStoryManager.getSideClue(TRUST_KEY);
    MainStoryManager.setSideClue(TRUST_KEY, { value: this.hollyTrust });
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
    } catch (error) {
      if (!gameState.hollyIntroSeen) MainStoryManager.setSideClue(TRUST_KEY, previous ?? null);
      throw error;
    } finally { this._applyingReward = false; }
  }
  grantHollyChoiceReward(choiceId) {
    const fullState = gameState.getState ? gameState.getState() : {};
    switch (choiceId) {
      case 'cash':
        moneyManager.addCash(250, { category: ECONOMY_CATEGORY.AGENCY_ADVANCE,
          description: T('t_a7ef26be8904c900b45f'), missionId: 'black-lady-main-case',
          metadata: { source: 'holly_intro_choice', choiceId } });
        break;
      case 'rest': gameState.updateState({ restVouchers: Number(fullState.restVouchers || 0) + 2 }); break;
      case 'kit': hintManager.grantOnce('holly_intro_field_support', 2, T('t_0da52c91c65a43f635d8')); break;
      case 'travel': gameState.updateState({ freeTransfers: Number(fullState.freeTransfers || 0) + 2 }); break;
      default: throw new Error(`[HollyIntroScene] Unknown reward choice: ${choiceId}`);
    }
  }
  finishScene() {
    if (this._finishEmitted) return;
    this._finishEmitted = true;
    this.phase = 'finished';
    this.hideDialogueLayout();
    this._hudGuard?.release();
    this._hudGuard = null;
    const choice = gameState.hollyIntroChoice || null;
    const sleepHours = this.sleepHours;
    EventBus.emit('hollyIntroFinished', { choice, sleepHours, source: this.source, skipped: this._skipRepeatedIntro });
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
    this.hideDialogueLayout();
    this.destroyVideo(this.video);
    this.destroyVideo(this.bgVideo);
    this.video = null;
    this.bgVideo = null;
    this.hollyPortrait = null;
    this.stampText = null;
    super.cleanup();
  }
}
