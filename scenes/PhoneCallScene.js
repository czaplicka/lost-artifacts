import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { advanceCrimeTutorial } from '../tutorials/CrimeCityTutorial.js';
import { BaseScene } from './BaseScene.js';
import { IncomingMobileAudio } from './phone/IncomingMobileAudio.js';

export class PhoneCallScene extends BaseScene {
  constructor() {
    super({ key: 'PhoneCallScene' });
    this.ui = []; this.ringTweens = []; this.mobileAudio = null;
    this._phoneRun = null; this.answerBtn = null; this.laterBtn = null; this.statusText = null;
    this.isAnswered = false; this.isEnding = false; this.isShuttingDown = false;
  }
  init(data = {}) {
    this.mobileAudio?.destroy(); this.mobileAudio = null;
    this._phoneRun = Symbol('phone-call');
    this.sourceScene = data.sourceScene || 'CrimeCityScene';
    this.cityId = data.cityId || gameState.currentCityId || null;
    this.caseKey = data.caseKey ?? null;
    const requested = data.returnScene || this.sourceScene;
    this.returnScene = ['PhoneCallScene', 'HypothesisScene', 'TheoryResultCallScene'].includes(requested)
      ? 'CrimeCityScene' : requested;
    this.returnData = { ...(data.returnData || {}), cityId: this.cityId };
    this.ui = []; this.ringTweens = [];
    this.answerBtn = null; this.laterBtn = null; this.statusText = null;
    this.isAnswered = false; this.isEnding = false; this.isShuttingDown = false;
  }
  preload() { IncomingMobileAudio.preload(this); }
  isCurrentPhoneRun(token) {
    return token === this._phoneRun && !this.isShuttingDown && !this._cleanupDone && this.sys.isActive();
  }
  getCrimeCityScene() { return this.scene?.manager?.keys?.CrimeCityScene || null; }
  unlockSuspectFiles(choice) {
    const city = this.getCrimeCityScene(), caseKey = this.caseKey ?? city?.getCaseKey?.();
    if (caseKey === null || caseKey === undefined || caseKey === '') {
      console.error('[PhoneCallScene] Cannot unlock suspect files: missing caseKey.'); return false;
    }
    this.caseKey = caseKey;
    const decisions = gameState.suspectFilesPhoneDecisions;
    gameState.updateState({ suspectFilesPhoneDecisions: {
      ...(decisions && typeof decisions === 'object' && !Array.isArray(decisions) ? decisions : {}),
      [String(caseKey)]: choice
    } });
    saveGameState();
    if (city && !city._cleanupDone && city.sys?.isActive()) {
      city.mapUI?.createHeader();
      city.mapUI?.createAvailableLocations({ crimeSceneCompleted: city.isCrimeSceneCompleted(),
        crimeLabCompleted: city.isCrimeLabCompleted(), apartmentAvailable: city.hasAnyDebunkedAlibi() });
    }
    return true;
  }
  disablePhoneInput() {
    for (const object of [this.answerBtn, this.laterBtn]) {
      if (object?.scene && object.input) object.disableInteractive();
    }
  }
  stopRinging({ disableInput = true } = {}) {
    this.mobileAudio?.destroy(); this.mobileAudio = null;
    const tweens = this.ringTweens; this.ringTweens = [];
    for (const tween of tweens) { if (tween?.parent) tween.remove(); }
    if (disableInput && !this.isShuttingDown) this.disablePhoneInput();
  }
  recoverPhoneNavigation(token, error = null) {
    if (!this.isCurrentPhoneRun(token)) return false;
    if (error) console.error('[PhoneCallScene] Hypothesis launch failed:', error);
    this.isAnswered = false; this.isEnding = false;
    this.statusText?.setText('CONNECTION FAILED.\nTRY AGAIN OR IGNORE.');
    for (const button of [this.answerBtn, this.laterBtn]) {
      if (button?.scene) button.setInteractive({ useHandCursor: true });
    }
    return false;
  }
  async answerCall() {
    if (this.isAnswered || this.isEnding || this.isShuttingDown) return false;
    const token = this._phoneRun;
    this.isAnswered = true; this.isEnding = true; this.stopRinging();
    try {
      if (!this.unlockSuspectFiles('answer')) return this.recoverPhoneNavigation(token);
      advanceCrimeTutorial(gameState, 'phone_lab');
      EventBus.emit('crimeCityTutorialStep', { step: 'phone_lab' }); saveGameState();
      const opened = await this.goto('HypothesisScene', {
        cityId: this.cityId, caseKey: this.caseKey,
        sourceScene: this.returnScene, returnScene: this.returnScene,
        returnData: { ...this.returnData, cityId: this.cityId, showSuspectTutorial: true }
      });
      if (!opened) return this.recoverPhoneNavigation(token);
      return true;
    } catch (error) { return this.recoverPhoneNavigation(token, error); }
  }
  ignoreCall() {
    if (this.isEnding || this.isShuttingDown) return false;
    const token = this._phoneRun;
    this.isEnding = true; this.stopRinging();
    try {
      if (!this.unlockSuspectFiles('ignore')) return this.recoverPhoneNavigation(token);
      saveGameState(); this.scene.stop(); return true;
    } catch (error) { return this.recoverPhoneNavigation(token, error); }
  }
  create() {
    super.create();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.onShutdown, this);
    const { width, height } = this.scale, cx = width / 2, cy = height / 2;
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, .75).setOrigin(0, 0).setDepth(2000).setInteractive();
    const phoneBody = this.add.rectangle(cx, cy, 380, 680, 0x1e222a, 1).setStrokeStyle(4, 0x3a3f4d).setDepth(2001);
    const phoneInnerFrame = this.add.rectangle(cx, cy, 360, 660, 0x14171d, 1).setDepth(2001);
    const speaker = this.add.rectangle(cx, cy - 290, 80, 10, 0x0a0c0e, 1).setStrokeStyle(2, 0x2c313c).setDepth(2002);
    const screenBg = this.add.rectangle(cx, cy - 110, 310, 300, 0x8bac0f, 1).setStrokeStyle(4, 0x0f380f).setDepth(2002);
    const screenBorder = this.add.rectangle(cx, cy - 110, 302, 292).setStrokeStyle(2, 0x306230).setDepth(2002);
    const signalText = this.add.text(cx - 135, cy - 245, __dialogueText('scenes/PhoneCallScene.js', 't_d13c8ecee55104d8936a'), { fontFamily: 'PressStart2P', fontSize: '12px', color: '#0f380f' }).setDepth(2003);
    const batteryText = this.add.text(cx + 85, cy - 245, __dialogueText('scenes/PhoneCallScene.js', 't_c8c2b203b9eef66f484e'), { fontFamily: 'PressStart2P', fontSize: '12px', color: '#0f380f' }).setDepth(2003);
    const title = this.add.text(cx, cy - 200, 'INCOMING CALL', { fontFamily: 'PressStart2P', fontSize: '14px', color: '#0f380f' }).setOrigin(.5).setDepth(2003);
    const phoneIcon = this.add.text(cx, cy - 150, '☎', { fontSize: '42px', color: '#0f380f' }).setOrigin(.5).setDepth(2003);
    const caller = this.add.text(cx, cy - 90, 'DETECTIVE BUREAU', { fontFamily: 'PressStart2P', fontSize: '13px', color: '#0f380f', align: 'center', wordWrap: { width: 280 } }).setOrigin(.5).setDepth(2003);
    const ringing = this.add.text(cx, cy - 35, 'LINE ACTIVE...', { fontFamily: 'PressStart2P', fontSize: '10px', color: '#306230', align: 'center' }).setOrigin(.5).setDepth(2003);
    const answerBtn = this.add.text(cx - 70, cy + 18, '[ ANSWER ]', { fontFamily: 'PressStart2P', fontSize: '11px', color: '#0f380f', backgroundColor: '#9bbc0f', padding: { left: 8, right: 8, top: 6, bottom: 6 } }).setOrigin(.5).setDepth(2003).setInteractive({ useHandCursor: true });
    const laterBtn = this.add.text(cx + 70, cy + 18, '[ IGNORE ]', { fontFamily: 'PressStart2P', fontSize: '11px', color: '#0f380f', backgroundColor: '#9bbc0f', padding: { left: 8, right: 8, top: 6, bottom: 6 } }).setOrigin(.5).setDepth(2003).setInteractive({ useHandCursor: true });
    this.answerBtn = answerBtn; this.laterBtn = laterBtn; this.statusText = ringing;
    const phoneObjects = [phoneBody, phoneInnerFrame, speaker, screenBg, screenBorder, signalText,
      batteryText, title, phoneIcon, caller, ringing, answerBtn, laterBtn, ...this.drawKeypad(cx, cy + 180)];
    this.ui.push(overlay, ...phoneObjects);
    this.ringTweens.push(this.tweens.add({ targets: [phoneIcon, ringing], alpha: { from: .2, to: 1 }, duration: 500, yoyo: true, repeat: -1 }),
      this.tweens.add({ targets: phoneObjects, x: '+=2', duration: 50, yoyo: true, repeat: -1 }));
    for (const button of [answerBtn, laterBtn]) {
      button.on('pointerover', () => { if (!this.isEnding && !this.isShuttingDown && button.scene) button.setStyle({ color: '#9bbc0f', backgroundColor: '#0f380f' }); });
      button.on('pointerout', () => { if (!this.isEnding && !this.isShuttingDown && button.scene) button.setStyle({ color: '#0f380f', backgroundColor: '#9bbc0f' }); });
    }
    answerBtn.on('pointerdown', () => { void this.answerCall(); });
    laterBtn.on('pointerdown', () => this.ignoreCall());
    this.mobileAudio = new IncomingMobileAudio(this); this.mobileAudio.start();
  }
  drawKeypad(startX, startY) {
    const keys = [], labels = ['1','2','3','4','5','6','7','8','9','*','0','#'];
    labels.forEach((label, index) => {
      const x = startX + (index % 3 - 1) * 75, y = startY + Math.floor(index / 3) * 47;
      keys.push(this.add.rectangle(x, y, 60, 35, 0x2a2f3a).setStrokeStyle(2, 0x14171d).setDepth(2002),
        this.add.text(x, y, label, { fontFamily: 'PressStart2P', fontSize: '12px', color: '#a0aab0' }).setOrigin(.5).setDepth(2003));
    });
    return keys;
  }
  onShutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true; this.isEnding = true; this._phoneRun = null;
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.onShutdown, this);
    this.stopRinging({ disableInput: false });
    const objects = this.ui; this.ui = [];
    for (const object of objects) if (object?.scene) object.destroy();
    this.answerBtn = null; this.laterBtn = null; this.statusText = null;
  }
}
