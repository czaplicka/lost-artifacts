import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { requestAutosave, flushAutosave } from '../gameStatePersistence.js';
import { ScoreManager } from '../managers/ScoreManager.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { checkAndAwardAchievements } from '../managers/AchievementManager.js';
import { applyReputationEvent } from '../managers/ReputationManager.js';
import { ensureMissionReport, moveStateToHeadquarters } from '../archiveReportService.js';

const CORRECT_ARREST_BONUS = 500;
const isValidId = value => (typeof value === 'string' && value.trim().length > 0) ||
  (typeof value === 'number' && Number.isFinite(value));
const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export class SuccessScene extends BaseScene {
  constructor() {
    super({ key: 'SuccessScene' });
    this.scoreManager = null; this.caseId = null; this.isLeaving = false;
  }
  init(data = {}) {
    this.caseId = isValidId(data.caseId) ? String(data.caseId) : null;
    this.isLeaving = false; this.statusText = null;
  }
  create() {
    super.create();
    EventBus.emit('hideHUD');
    const hud = this.scene.manager.keys.PlayerHudScene;
    hud?.hideHud?.();
    audioManager.init(this);
    audioManager.stopAllMusic(); audioManager.stopAllAmbient();
    audioManager.stopAllVoice(); audioManager.stopAllSfx();
    audioManager.playSfx('successsound');
    const newsHud = this.scene.manager.keys.NewsHud;
    newsHud?.events?.emit('setNewspaperVisible', false);
    newsHud?.events?.emit('setTvVisible', false);
    if (this.scene.manager.keys.UIScene) this.scene.sleep('UIScene');
    this.scoreManager = new ScoreManager();
    this.registerSuccessRewards(); this.registerCaseSuccess();
    this.registerFirstMissionSuccess(); this.unlockOfficeAfterFirstMission();
    const currentCaseId = this.getCurrentCaseId();
    if (currentCaseId !== null) gameState.currentCaseId = currentCaseId;
    const report = ensureMissionReport();
    if (!gameState.scoreSaved) {
      this.scoreManager.saveScore(gameState.playerName || gameState.agentName || 'Agent',
        Number.isFinite(gameState.score) ? gameState.score : 0);
      gameState.scoreSaved = true;
    }
    requestAutosave(); flushAutosave(); hud?.refreshUI?.();
    const { width, height } = this.scale, centerX = width / 2;
    if (this.textures.exists('backgrounds')) this.add.image(centerX, height / 2, 'backgrounds').setDisplaySize(width, height);
    else this.cameras.main.setBackgroundColor('#101010');
    this.add.rectangle(centerX, height / 2, width, height, 0x000000, 0.45).setDepth(0);
    const textWidth = Math.min(width * 0.8, 760);
    const text = (y, label, size, color = '#ffffff', extra = {}) => this.add.text(centerX, height * y, label, {
      fontFamily: 'PressStart2P', fontSize: `${size}px`, color, align: 'center',
      wordWrap: { width: textWidth, useAdvancedWrap: true }, ...extra
    }).setOrigin(0.5);
    text(0.18, 'CASE SOLVED', Math.max(20, Math.floor(width * 0.04)), '#ffe066',
      { stroke: '#000000', strokeThickness: 6 });
    text(0.34, `You captured:\n${gameState.currentThief?.name || 'Unknown suspect'}`,
      Math.max(14, Math.floor(width * 0.022)), '#ffffff', { lineSpacing: 12 });
    text(0.52, 'The artifact is safe.\nReturn to the agency and write your report.',
      Math.max(12, Math.floor(width * 0.018)), '#f5f5f5', { lineSpacing: 10 });
    text(0.66, `Final score: ${gameState.score || 0}`, Math.max(14, Math.floor(width * 0.02)), '#ffe066',
      { stroke: '#000000', strokeThickness: 4 });
    const message = report.status === 'draft' ? 'Use the agency COMPUTER to complete and print your Mission Report.'
      : report.status === 'full' ? 'Inventory full. Your printed report will wait until you free a slot.'
      : report.status === 'unavailable' ? 'Report unavailable: missing case identity.'
      : 'Deliver your Mission Report to Frank Drebin in the archive.';
    this.statusText = this.add.text(centerX, height * 0.74, message, {
      fontFamily: 'SpecialElite', fontSize: `${Math.max(14, Math.floor(width * 0.016))}px`,
      color: '#ffe29a', align: 'center', wordWrap: { width: textWidth }
    }).setOrigin(0.5);
    let nextBtn;
    if (this.textures.exists('next')) {
      nextBtn = this.add.image(centerX, height * 0.87, 'next').setInteractive({ useHandCursor: true });
      const scale = Math.min(0.7, width / 1400);
      nextBtn.setScale(scale); this.addHoverEffect(nextBtn, scale, scale + 0.08);
    } else nextBtn = text(0.87, '[ RETURN TO OFFICE ]', Math.max(12, Math.floor(width * 0.015)), '#ffffff', {
      backgroundColor: '#000000', padding: { x: 12, y: 10 }
    }).setInteractive({ useHandCursor: true });
    nextBtn.on('pointerdown', () => { void this.returnToOffice(nextBtn); });
    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this); audioManager.stopSfx('successsound');
    });
  }
  async returnToOffice(button) {
    if (this.isLeaving) return;
    this.isLeaving = true; button.disableInteractive();
    try {
      moveStateToHeadquarters(this.cache.json.get('locations') || []);
      requestAutosave(); flushAutosave();
      audioManager.stopSfx('successsound'); audioManager.stopAllNonMusic(); audioManager.stopAllMusic();
      const result = await this.goto('OfficeScene', { gameState });
      if (result === false && !this._cleanupDone) throw new Error('OfficeScene could not be opened.');
    } catch (error) {
      console.error('[SuccessScene] Return to office failed:', error);
      if (this._cleanupDone) return;
      this.isLeaving = false; button.setInteractive({ useHandCursor: true });
      this.statusText?.setText('The office could not be opened. Please try again.');
    }
  }
  registerSuccessRewards() {
    const caseId = this.getCurrentCaseId();
    if (caseId === null) { console.error('[SuccessScene] Cannot grant rewards: missing case ID.'); return; }
    const result = applyReputationEvent('correct_arrest', {
      eventId: `case:${caseId}:final-arrest`,
      context: { caseId, suspectId: gameState.finalArrestSuspectId ?? null, source: 'SuccessScene' }
    });
    if (!result.applied) return;
    gameState.score = Math.max(0, Number.isFinite(gameState.score) ? gameState.score : 0) + CORRECT_ARREST_BONUS;
    requestAutosave();
  }
  registerCaseSuccess() {
    const caseId = this.getCurrentCaseId();
    gameState.caseResolved = true; gameState.caseFailed = false; gameState.finalArrestResult = 'SUCCESS';
    gameState.isGameActive = false; gameState.gameOverReason = '';
    if (caseId === null) { console.warn('[SuccessScene] Cannot save dossier statistics: missing case ID.'); return; }
    const completed = Array.isArray(gameState.completedCaseIds) ? gameState.completedCaseIds : [];
    const arrests = Array.isArray(gameState.successfulArrestCaseIds) ? gameState.successfulArrestCaseIds : [];
    let changed = false;
    if (!completed.some(id => String(id) === caseId)) {
      gameState.completedCaseIds = [...completed, caseId]; gameState.casesSolved = gameState.completedCaseIds.length; changed = true;
    }
    if (!arrests.some(id => String(id) === caseId)) {
      gameState.successfulArrestCaseIds = [...arrests, caseId]; gameState.arrests = gameState.successfulArrestCaseIds.length; changed = true;
    }
    const badges = checkAndAwardAchievements();
    if (badges.length) console.log('[Achievements] New badges:', badges.map(item => item.title));
    if (changed) {
      requestAutosave(); EventBus.emit('agentStatsChanged', { casesSolved: gameState.casesSolved, arrests: gameState.arrests });
    }
  }
  registerFirstMissionSuccess() {
    const progress = isPlainObject(gameState.progress) ? gameState.progress : {};
    const onboarding = isPlainObject(gameState.onboarding) ? gameState.onboarding : {};
    const firstCase = isPlainObject(onboarding.firstCase) ? onboarding.firstCase : {};
    const alreadyRegistered = progress.firstMissionSuccess === true;
    const count = Number.isFinite(firstCase.successCount) ? firstCase.successCount : 0;
    gameState.progress = { ...progress, firstMissionSuccess: true };
    gameState.onboarding = { ...onboarding, firstCase: { ...firstCase, successCount: Math.max(1, count) } };
    if (alreadyRegistered) return;
    requestAutosave(); EventBus.emit('firstMissionSuccess');
  }
  unlockOfficeAfterFirstMission() {
    const progress = isPlainObject(gameState.progress) ? gameState.progress : {};
    if (progress.firstMissionCompleted) return;
    gameState.progress = { ...progress, firstMissionCompleted: true };
    requestAutosave(); EventBus.emit('firstMissionCompleted');
  }
  getCurrentCaseId() {
    const raw = [this.caseId, gameState.currentCaseId, gameState.currentMission?.caseId,
      gameState.currentMission?.id, gameState.currentMission?.missionId].find(isValidId);
    return raw === undefined ? null : String(raw);
  }
  handleResize() { if (!this.isLeaving) this.scene.restart({ caseId: this.getCurrentCaseId() }); }
  addHoverEffect(button, baseScale = 0.7, hoverScale = 0.8) {
    button.on('pointerover', () => button.setScale(hoverScale));
    button.on('pointerout', () => button.setScale(baseScale));
  }
}
