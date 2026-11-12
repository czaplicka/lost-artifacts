import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { getReputation, REPUTATION_CHANGED } from '../managers/ReputationManager.js';

const WIDTH = 1920;
const HEIGHT = 1080;
const GAME_OVER_SCORE_PENALTY = 250;
const GAME_OVER_FAME_PENALTY = 5;
const WRONG_ARREST_INTEGRITY_PENALTY = 12;
const FAILURE_SFX_KEY = 'sfx_result_failure';
const ASSET_KEYS = [
  'background', 'game_over', 'lamp', 'map', 'medallion_officer', 'medialion',
  'officer_left_01', 'officer_left_02_1', 'officer_left_02', 'officer_right_01_1',
  'officer_right_01', 'officer_right_02', 'paper_01', 'paper_02', 'paper_03',
  'police_car', 'pouch', 'thief', 'wall'
];
const LEGACY_WRONG_ARREST_MESSAGE = 'Incorrect suspect detained. The real thief escaped before the bureau could act.';
const LEGACY_MISSING_WARRANT_MESSAGE = 'Without a signed warrant, the agency could not act in time. ' +
  'The thief escaped before the arrest team arrived.';
const GAME_OVER_REASONS = {
  trail_cold: { title: 'The trail has gone cold', message:
    'The thief used the four days you spent in the crime city to buy a ticket, ' +
    'a wig and a new personality.\n' +
    'By the time you looked up, the trail was colder than the coffee at Mark Agency.' },
  time_expired: { title: 'Time is up', message:
    'Seven days. That is how long the thief needed to disappear, ' +
    'and exactly how long you needed to be almost there.\n' +
    'The artefact is gone. The paperwork, sadly, is not.' },
  wrong_arrest: { title: 'Wrong person. Real consequences.', message:
    'The bureau reviewed your report. You arrested the wrong person.\n' +
    'The real thief escaped with the artefact. ' +
    'An innocent person got a cell, and you got the paperwork.' },
  missing_warrant: { title: 'No warrant. No arrest.', message:
    'Without a signed warrant, the arrest team could not act.\n' +
    'The thief escaped before the paperwork caught up.' }
};
function isKnownReason(value) {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(GAME_OVER_REASONS, value);
}
function isValidCaseId(value) {
  return (typeof value === 'string' && value.trim().length > 0) || (typeof value === 'number' && Number.isFinite(value));
}
export class GameOverScene extends BaseScene {
  constructor() { super({ key: 'GameOverScene' }); }
  init(data = {}) {
    this.reasonCode = null; this.consequencesProcessed = false; this.isLeaving = false;
    this.introComplete = false; this.continueBtn = null; this.continueButtonBaseScale = 1;
    this.introTimers = []; this.introTweens = []; this.layers = {};
    this.gameOverSoundPlayed = false;
    this.caseId = data.caseId ?? gameState.currentCaseId ?? null;
    this.suspectId = data.suspectId ?? gameState.finalArrestSuspectId ?? null;
    const incomingReason = typeof data.reason === 'string' ? data.reason : null;
    const savedReason = typeof gameState.gameOverReason === 'string' ? gameState.gameOverReason : null;
    if (typeof data.reasonCode === 'string' && data.reasonCode.trim()) this.reasonCode = data.reasonCode;
    else if (isKnownReason(incomingReason)) this.reasonCode = incomingReason;
    else if (incomingReason) this.reasonCode = this.resolveLegacyReason(incomingReason);
    else if (isKnownReason(savedReason)) this.reasonCode = savedReason;
    else this.reasonCode = this.resolveLegacyReason(savedReason);
    const known = isKnownReason(this.reasonCode) ? GAME_OVER_REASONS[this.reasonCode] : null;
    this.titleTextValue = data.title || known?.title || 'You have failed the mission';
    this.messageTextValue = data.message || known?.message || incomingReason || savedReason || 'The case has been lost.';
  }
  preload() {
    if (!this.cache.audio.exists(FAILURE_SFX_KEY)) this.load.audio(FAILURE_SFX_KEY, 'assets/audio/game_over.mp3');
    for (const key of ASSET_KEYS) {
      if (!this.textures.exists(key)) this.load.image(key, `assets/game_over/${key}.webp`);
    }
    if (!this.textures.exists('btnContinue')) this.load.image('btnContinue', 'assets/continue.png');
  }
  resolveLegacyReason(reason) {
    if (reason === LEGACY_WRONG_ARREST_MESSAGE) return 'wrong_arrest';
    if (reason === LEGACY_MISSING_WARRANT_MESSAGE) return 'missing_warrant';
    return null;
  }
  create() {
    super.create(); this.hideGameplayInterface();
    audioManager.init(this); audioManager.stopAllMusic(); audioManager.stopAllAmbient();
    audioManager.stopAllVoice(); audioManager.stopAllSfx();
    this.applyGameOverConsequences();
    this.stage = this.add.container(0, 0); this.buildStreet(); this.buildMedallion(); this.buildResultPanel();
    this.skipHint = this.add.text(960, 1015, 'CLICK TO SKIP INTRO', {
      fontFamily: 'SpecialElite', fontSize: '21px', color: '#cfba92'
    }).setOrigin(0.5);
    this.stage.add(this.skipHint); this.layoutStage();
    this.onGameOverResize = () => this.layoutStage(); this.scale.on('resize', this.onGameOverResize);
    this.onSkipIntro = () => { if (!this.introComplete) this.finishIntro(); };
    this.input.on('pointerdown', this.onSkipIntro);
    this.startAmbientAnimation(); this.playIntro();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.onGameOverResize); this.input.off('pointerdown', this.onSkipIntro);
      this.cancelIntro(); this.time.removeAllEvents(); this.tweens.killAll();
      audioManager.stopAllSfx(); this.continueBtn = null; this.layers = {};
    });
  }
  layoutStage() {
    if (!this.stage) return;
    const width = this.scale.width, height = this.scale.height, scale = Math.min(width / WIDTH, height / HEIGHT);
    this.stage.setScale(scale).setPosition((width - WIDTH * scale) / 2, (height - HEIGHT * scale) / 2);
  }
  hideGameplayInterface() {
    const hud = this.scene.manager.keys.PlayerHudScene; hud?.closeAllUIPanels?.(); hud?.hideHud?.();
    const newsHud = this.scene.manager.keys.NewsHud;
    newsHud?.events?.emit('setButtonsVisible', false); newsHud?.events?.emit('setNewspaperVisible', false);
    newsHud?.events?.emit('setTvVisible', false);
    for (const key of ['NewsHud', 'PlayerHudScene', 'UIScene']) {
      if (!this.hasScene(key)) continue; this.scene.setVisible(false, key); this.stopSceneIfActive(key);
    }
  }
  addLayer(key, parent = this.stage) {
    if (!this.textures.exists(key)) { console.error(`[GameOverScene] Missing texture: ${key}`); return null; }
    const image = this.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(WIDTH, HEIGHT);
    parent.add(image); this.layers[key] = image; return image;
  }
  buildStreet() {
    this.addLayer('background'); this.lampGlow = this.createGlow(250, 550, 190, 0xffc967, 0.09);
    this.stage.add(this.lampGlow); this.addLayer('lamp'); this.addLayer('thief'); this.addLayer('wall');
    this.addLayer('pouch'); this.addLayer('map'); this.addLayer('paper_01'); this.addLayer('paper_02');
    this.addLayer('paper_03'); this.addLayer('police_car');
    this.redGlow = this.createGlow(1630, 719, 155, 0xff3434, 0.065);
    this.blueGlow = this.createGlow(1690, 723, 155, 0x4598ff, 0.065);
    this.stage.add([this.redGlow, this.blueGlow]);
    this.redBulb = this.add.ellipse(1630, 712, 46, 18, 0xff5046, 0.85);
    this.blueBulb = this.add.ellipse(1690, 721, 55, 18, 0x67b4ff, 0.85);
    this.stage.add([this.redBulb, this.blueBulb]);
    this.addLayer('officer_left_01'); this.addLayer('officer_left_02'); this.addLayer('officer_left_02_1');
    this.addLayer('officer_right_01_1'); this.addLayer('officer_right_01'); this.addLayer('officer_right_02');
    this.setOfficerPose('left', false); this.setOfficerPose('right', false);
    this.streetShade = this.add.rectangle(960, 540, 1810, 980, 0x080a10, 0.72); this.stage.add(this.streetShade);
  }
  createGlow(x, y, radius, color, alpha) {
    const glow = this.add.graphics();
    for (let i = 12; i >= 1; i -= 1) { glow.fillStyle(color, alpha / 3); glow.fillCircle(x, y, radius * i / 12); }
    return glow;
  }
  setOfficerPose(side, reaction) {
    const normal = side === 'left' ? 'officer_left_02_1' : 'officer_right_01_1';
    const reacted = side === 'left' ? 'officer_left_02' : 'officer_right_01';
    this.layers[normal]?.setVisible(!reaction); this.layers[reacted]?.setVisible(reaction);
  }
  buildMedallion() {
    this.medallionGroup = this.add.container(0, -650); this.medallionGroup.setAlpha(0); this.stage.add(this.medallionGroup);
    const innerDisc = this.add.ellipse(967, 438, 555, 555, 0x30302e, 1); this.medallionGroup.add(innerDisc);
    this.addLayer('medialion', this.medallionGroup); this.addLayer('medallion_officer', this.medallionGroup);
    this.gameOverLabel = this.addLayer('game_over', this.medallionGroup); this.gameOverLabel?.setAlpha(0);
  }
  buildResultPanel() {
    this.resultPanel = this.add.container(0, 0).setAlpha(0).setVisible(false); this.stage.add(this.resultPanel);
    const panel = this.add.rectangle(1580, 355, 490, 510, 0x211e1a, 0.94); panel.setStrokeStyle(2, 0x9f8255, 0.9);
    const title = this.add.text(1580, 135, this.titleTextValue, {
      fontFamily: 'PressStart2P', fontSize: '20px', color: '#e0bd7c', align: 'center', wordWrap: { width: 430 }
    }).setOrigin(0.5, 0);
    const titleBottom = title.y + title.height;
    const message = this.add.text(1580, titleBottom + 27, this.messageTextValue, {
      fontFamily: 'SpecialElite', fontSize: '24px', color: '#f1e4cb', align: 'center', wordWrap: { width: 425 }, lineSpacing: 7
    }).setOrigin(0.5, 0);
    const availableHeight = Math.max(120, 485 - message.y);
    if (message.height > availableHeight) { const fitScale = availableHeight / message.height; message.setScale(Math.min(1, fitScale)); }
    this.resultPanel.add([panel, title, message]);
    this.continueBtn = this.add.image(1580, 550, 'btnContinue').setOrigin(0.5);
    this.continueButtonBaseScale = Math.min(285 / this.continueBtn.width, 70 / this.continueBtn.height);
    this.continueBtn.setScale(this.continueButtonBaseScale); this.resultPanel.add(this.continueBtn);
    this.continueBtn.on('pointerover', () => { if (!this.isLeaving && this.introComplete) this.continueBtn.setScale(this.continueButtonBaseScale * 1.06); });
    this.continueBtn.on('pointerout', () => this.continueBtn?.setScale(this.continueButtonBaseScale));
    this.continueBtn.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation(); if (this.introComplete) void this.continueToAgainScene();
    });
  }
  introAfter(delay, callback) {
    const timer = this.time.delayedCall(delay, () => { if (!this.introComplete) callback(); });
    this.introTimers.push(timer); return timer;
  }
  introTween(config) { const tween = this.tweens.add(config); this.introTweens.push(tween); return tween; }
  playIntro() {
    this.introTween({ targets: this.streetShade, alpha: 0, duration: 900, ease: 'Sine.easeOut' });
    this.introAfter(1000, () => this.setOfficerPose('left', true));
    this.introAfter(1550, () => this.setOfficerPose('right', true));
    this.introAfter(2050, () => {
      this.medallionGroup.setAlpha(1); this.introTween({ targets: this.medallionGroup, y: 0, duration: 750, ease: 'Bounce.easeOut' });
    });
    this.introAfter(2800, () => {
      this.playGameOverSound();
      if (this.gameOverLabel) this.introTween({ targets: this.gameOverLabel, alpha: 1, duration: 300 });
    });
    this.introAfter(3400, () => this.finishIntro());
  }
  cancelIntro() {
    for (const timer of this.introTimers) timer.remove(false);
    for (const tween of this.introTweens) tween.stop();
    this.introTimers = []; this.introTweens = [];
  }
  finishIntro() {
    if (this.introComplete) return;
    this.introComplete = true; this.cancelIntro();
    this.streetShade.setAlpha(0); this.medallionGroup.setPosition(0, 0).setAlpha(1); this.gameOverLabel?.setAlpha(1);
    this.setOfficerPose('left', true); this.setOfficerPose('right', true); this.skipHint.setVisible(false);
    this.playGameOverSound(); this.resultPanel.setVisible(true);
    this.tweens.add({ targets: this.resultPanel, alpha: 1, duration: 350 });
    this.continueBtn.setInteractive({ useHandCursor: true }); this.startOfficerReactions();
  }
  playGameOverSound() {
    if (this.gameOverSoundPlayed || this.isLeaving || this._cleanupDone || !this.sys.isActive()) return;
    this.gameOverSoundPlayed = true;
    if (!this.cache.audio.exists(FAILURE_SFX_KEY)) return;
    try {
      audioManager.init(this);
      audioManager.playSfx(FAILURE_SFX_KEY, { volume: audioManager.getSfxVolume() * 0.45 });
    } catch (error) { console.debug('[GameOverScene] Failure sound unavailable:', error); }
  }
  startAmbientAnimation() {
    this.tweens.add({ targets: this.lampGlow, alpha: 0.58, duration: 170, yoyo: true, repeat: -1, repeatDelay: 1300, ease: 'Sine.easeInOut' });
    this.time.addEvent({ delay: 180, loop: true, callback: () => {
      this.sirenPhase = ((this.sirenPhase || 0) + 1) % 8;
      const redOn = this.sirenPhase === 0 || this.sirenPhase === 2, blueOn = this.sirenPhase === 4 || this.sirenPhase === 6;
      this.redGlow.setAlpha(redOn ? 1 : 0); this.blueGlow.setAlpha(blueOn ? 1 : 0);
      this.redBulb.setAlpha(redOn ? 0.85 : 0); this.blueBulb.setAlpha(blueOn ? 0.85 : 0);
    }});
    this.redGlow.setAlpha(0); this.blueGlow.setAlpha(0); this.redBulb.setAlpha(0); this.blueBulb.setAlpha(0);
    ['paper_01', 'paper_02', 'paper_03'].forEach((key, index) => {
      const paper = this.layers[key]; if (!paper) return;
      this.tweens.add({ targets: paper, x: 16 + index * 9, y: -4 - index * 2,
        duration: 1900 + index * 450, delay: 1000 + index * 550, yoyo: true, repeat: -1,
        repeatDelay: 1700 + index * 300, ease: 'Sine.easeInOut' });
    });
  }
  startOfficerReactions() {
    this.time.addEvent({ delay: 5700, loop: true, callback: () => {
      this.setOfficerPose('left', false); this.time.delayedCall(600, () => this.setOfficerPose('left', true));
    }});
    this.time.addEvent({ delay: 7300, loop: true, callback: () => {
      this.setOfficerPose('right', false); this.time.delayedCall(950, () => this.setOfficerPose('right', true));
    }});
  }
  async continueToAgainScene() {
    if (this.isLeaving || !this.introComplete) return;
    this.isLeaving = true;
    this.continueBtn?.disableInteractive().setScale(this.continueButtonBaseScale).setAlpha(0.75);
    saveGameState(); audioManager.stopAllNonMusic(); audioManager.stopAllMusic();
    try {
      const opened = await this.goto('AgainScene');
      if (!opened && !this._cleanupDone) { this.restoreContinueButton(); console.error('[GameOverScene] Could not open AgainScene.'); }
    } catch (error) {
      console.error('[GameOverScene] Transition failed:', error);
      if (!this._cleanupDone) this.restoreContinueButton();
    }
  }
  restoreContinueButton() {
    this.isLeaving = false; this.continueBtn?.setAlpha(1).setInteractive({ useHandCursor: true });
  }
  applyGameOverConsequences() {
    if (this.consequencesProcessed) return;
    this.consequencesProcessed = true;
    gameState.caseResolved = false; gameState.caseFailed = true; gameState.isGameActive = false;
    gameState.gameOverReason = isKnownReason(this.reasonCode) ? this.reasonCode : this.messageTextValue;
    if (!isValidCaseId(this.caseId)) {
      console.error('[GameOverScene] Missing valid case ID. Penalties cannot be safely applied without a stable case identifier.');
      this.saveOutcome(); return;
    }
    const eventId = `case:${this.caseId}:game-over`, before = getReputation();
    if (before.appliedEventIds.includes(eventId)) { this.saveOutcome(); return; }
    const isWrongArrest = this.reasonCode === 'wrong_arrest', arrestEventId = `case:${this.caseId}:final-arrest`;
    const arrestAlreadySettled = isWrongArrest && before.appliedEventIds.includes(arrestEventId);
    const integrityPenalty = isWrongArrest && !arrestAlreadySettled ? WRONG_ARREST_INTEGRITY_PENALTY : 0;
    const scorePenalty = arrestAlreadySettled ? 0 : GAME_OVER_SCORE_PENALTY;
    const currentScore = Number.isFinite(gameState.score) ? gameState.score : 0;
    const appliedEventIds = [...before.appliedEventIds, eventId];
    if (isWrongArrest && !arrestAlreadySettled) appliedEventIds.push(arrestEventId);
    const next = { ...before, fame: Math.max(0, before.fame - GAME_OVER_FAME_PENALTY),
      integrity: Math.max(-100, before.integrity - integrityPenalty), appliedEventIds };
    gameState.score = Math.max(0, currentScore - scorePenalty); gameState.reputationState = next;
    this.saveOutcome();
    EventBus.emit(REPUTATION_CHANGED, { type: 'game_over', eventId,
      context: { caseId: this.caseId, suspectId: this.suspectId, reasonCode: this.reasonCode || 'unknown', source: 'GameOverScene' },
      before, after: getReputation() });
  }
  saveOutcome() {
    const saved = saveGameState();
    if (!saved) console.warn('[GameOverScene] Outcome is in memory, but saving the game failed.');
  }
}
