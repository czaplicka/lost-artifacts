import { CourtScene as OriginalCourtScene } from './CourtScene.js';
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { saveGameState } from '../gameStatePersistence.js';
import { audioManager } from '../managers/AudioManager.js';
import { buildCourtFacts } from '../systems/courtLogic.js';
import { currentChase, persistChase } from '../systems/chasePersistence.js';
import { getEvidenceCaseKey } from '../managers/ApartmentEvidenceModel.js';
import {
  FINALE_SOURCES, buildArtifactFinalePlan, createArtifactFinaleRecord,
  validArtifactFinaleRecord, advanceArtifactFinale, makeFinaleRecoveryData, recoveryEntryMatches
} from '../systems/artifactFinaleLogic.js';

export class CourtScene extends OriginalCourtScene {
  init(data = {}) {
    super.init(data);
    this.recoveryPlan = null; this.recoveryRecord = null; this.recoveryRoot = null;
    this.recoveryBusy = false; this.recoveryNotice = ''; this.recoveryError = null;
  }
  create() {
    const effect = gameState.currentMission?.caseModifiers?.apartment?.effect;
    // Existing trials keep their existing questions and verdict, including old saves.
    const trial = gameState.courtState;
    const existingTrial = trial && String(trial.caseId) === String(gameState.currentCaseId) &&
      trial.campaignId === gameState._createdAt && String(trial.suspectId) === String(this.requestedSuspectId);
    if (effect?.artifactState !== 'carried_away' || existingTrial) { super.create(); return; }
    let plan;
    try {
      const facts = buildCourtFacts(gameState, this.requestedSuspectId);
      plan = buildArtifactFinalePlan(gameState, facts, getEvidenceCaseKey(gameState));
      if (!plan) { super.create(); return; }
      const entry = gameState.getRecoveredArtifact(plan.missionId);
      if (entry) {
        if (!recoveryEntryMatches(entry, plan)) throw new Error('The recovered collection entry belongs to another artefact.');
        super.create(); return;
      }
      const saved = gameState.apartmentProgress?.[plan.missionId]?.artifactFinale;
      if (saved?.caseKey === plan.caseKey && !validArtifactFinaleRecord(saved, plan)) {
        throw new Error('The saved recovery stage is inconsistent. It was not overwritten.');
      }
      this.recoveryPlan = plan;
      this.recoveryRecord = saved?.caseKey === plan.caseKey ? structuredClone(saved) : createArtifactFinaleRecord(plan);
      if (this.recoveryRecord.phase === 'secured') throw new Error('The recovery record has no matching collection entry.');
    } catch (error) { this.recoveryError = error.message; }
    BaseScene.prototype.create.call(this);
    EventBus.emit('hideHUD');
    for (const key of ['PlayerHudScene','UIScene','NewsHud']) {
      const hud = this.getRegisteredScene(key); hud?.closeAllUIPanels?.(); hud?.hideHud?.();
      if (hud) this.scene.setVisible(false, key);
    }
    audioManager.init(this); audioManager.stopAllMusic(); audioManager.stopAllNonMusic();
    this.onRecoveryResize = () => this.renderRecovery();
    this.scale.on('resize', this.onRecoveryResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.onRecoveryResize);
      this.recoveryRoot?.destroy(true); this.recoveryRoot = null;
    });
    if (!this.recoveryError && !this.saveRecovery()) this.recoveryNotice = 'Save failed. Retry before closing this tab.';
    this.renderRecovery();
  }
  saveRecovery() {
    const p = this.recoveryPlan, r = this.recoveryRecord;
    if (!p || !r || p.caseKey !== getEvidenceCaseKey(gameState) || !validArtifactFinaleRecord(r, p)) return false;
    gameState.updateState({ apartmentProgress: {
      ...(gameState.apartmentProgress || {}),
      [p.missionId]: { ...(gameState.apartmentProgress?.[p.missionId] || {}), artifactFinale: structuredClone(r) }
    } });
    const chase = currentChase();
    if (chase && String(chase.suspectId) === String(p.suspectId) &&
        ['caught','review'].includes(chase.phase)) {
      return persistChase({ ...structuredClone(chase), phase: 'review', terminalScene: 'CourtScene' }) === true;
    }
    return saveGameState() === true;
  }
  applyRecoveryAction(action, value = null) {
    if (this.recoveryBusy || !this.recoveryPlan || this.recoveryError) return;
    if (getEvidenceCaseKey(gameState) !== this.recoveryPlan.caseKey) {
      this.recoveryError = 'The active case changed. Recovery was stopped.'; this.renderRecovery(); return;
    }
    const result = advanceArtifactFinale(this.recoveryRecord, this.recoveryPlan, action, value);
    if (result.record) this.recoveryRecord = result.record;
    this.recoveryNotice = result.message || '';
    if (result.record && !this.saveRecovery()) this.recoveryNotice = 'Save failed. Retry before closing this tab.';
    this.renderRecovery();
  }
  secureArtifact() {
    if (this.recoveryBusy || this.recoveryRecord?.phase !== 'inspect') return;
    this.recoveryBusy = true;
    try {
      const p = this.recoveryPlan;
      if (getEvidenceCaseKey(gameState) !== p.caseKey) throw new Error('The active case changed.');
      // Revalidate the arrest and city immediately before touching the collection.
      const fresh = buildArtifactFinalePlan(gameState, buildCourtFacts(gameState, this.requestedSuspectId), getEvidenceCaseKey(gameState));
      if (!fresh || fresh.artifact.id !== p.artifact.id || fresh.kind !== p.kind) throw new Error('The recovery context changed.');
      let entry = gameState.getRecoveredArtifact(p.missionId);
      let recovered = false;
      const data = makeFinaleRecoveryData(p, new Date().toISOString());
      if (!entry) {
        recovered = gameState.recoverArtifact(data) === true;
        entry = gameState.getRecoveredArtifact(p.missionId);
      }
      if (!recoveryEntryMatches(entry, p)) throw new Error('The artefact could not be registered. Nothing was marked as secured.');
      this.recoveryRecord = { ...this.recoveryRecord, phase: 'secured', recoveredAt: entry.recoveredAt || data.recoveredAt };
      this.recoveryNotice = this.saveRecovery() ? '' : 'Artefact secured in memory, but saving failed. Retry before continuing.';
      if (recovered) EventBus.emit('artifactRecovered', { missionId: p.missionId,
        artifact: data.artifact, sourceObject: { id: data.recoveredFrom, label: data.recoveredLocation } });
    } catch (error) { console.error('[ArtefactFinale]', error); this.recoveryNotice = error.message; }
    finally { this.recoveryBusy = false; this.renderRecovery(); }
  }
  continueToCourt() {
    if (this.recoveryBusy || this.recoveryRecord?.phase !== 'secured') return;
    const p = this.recoveryPlan;
    if (getEvidenceCaseKey(gameState) !== p.caseKey || !recoveryEntryMatches(gameState.getRecoveredArtifact(p.missionId), p)) {
      this.recoveryNotice = 'No matching recovered artefact is registered.'; this.renderRecovery(); return;
    }
    if (!this.saveRecovery()) { this.recoveryNotice = 'Save failed. Please retry.'; this.renderRecovery(); return; }
    this.recoveryBusy = true;
    this.scene.restart({ suspectId: this.requestedSuspectId });
  }
  renderRecovery() {
    this.recoveryRoot?.destroy(true);
    const { width, height } = this.scale;
    const scale = Math.min(width / 1000, height / 760);
    const root = this.add.container((width - 1000 * scale) / 2, (height - 760 * scale) / 2).setScale(scale);
    this.recoveryRoot = root;
    const text = (x, y, content, size = 23, color = '#f4e6cd', maxHeight = 130) => {
      const t = this.add.text(x, y, content, { fontFamily: 'SpecialElite', fontSize: `${size}px`,
        color, align: 'center', wordWrap: { width: 880 } }).setOrigin(0.5, 0);
      while (t.height > maxHeight && parseInt(t.style.fontSize, 10) > 12) t.setFontSize(parseInt(t.style.fontSize, 10) - 1);
      root.add(t); return t;
    };
    const button = (y, label, callback) => {
      const bg = this.add.rectangle(500, y, 850, 54, 0x4d3828).setStrokeStyle(2, 0xcba564).setInteractive({ useHandCursor: true });
      root.add(bg); text(500, y - 14, label, 22, '#ffdda1', 40);
      bg.on('pointerdown', () => { if (!this.recoveryBusy) callback(); });
    };
    root.add(this.add.rectangle(500, 380, 1000, 760, 0x1c1713));
    text(500, 24, 'ARTEFACT RECOVERY', 30, '#ffcf78');
    if (this.recoveryError) {
      text(500, 160, this.recoveryError, 24, '#ffb4a1', 300);
      text(500, 510, 'Recovery is blocked by inconsistent case data. No substitute artefact or destination was generated.', 21);
      button(660, 'RETRY', () => this.scene.restart({ suspectId: this.requestedSuspectId })); return;
    }
    const p = this.recoveryPlan, r = this.recoveryRecord;
    text(500, 76, p.artifact.label, 25, '#ffdda1', 65);
    const city = gameState.currentCityData?.city || (typeof gameState.currentCity === 'string' ? gameState.currentCity : p.cityId);
    text(500, 146, `Recovery operation: ${city}`, 20);
    if (r.phase === 'briefing') {
      text(500, 205, p.witnessLead
        ? 'Your apartment interview established a possible trail. The arrest team can now verify it against the detained suspect’s account.'
        : 'The thief is detained, but the artefact has not been recovered. Question the suspect to establish who currently holds it.', 25, '#f4e6cd', 190);
      text(500, 415, 'The arrest is not the recovery. The paperwork insists on making that distinction.', 22);
      button(585, p.witnessLead ? 'VERIFY THE LEAD WITH THE DETAINEE' : 'QUESTION THE DETAINED SUSPECT', () => this.applyRecoveryAction('brief'));
    } else if (r.phase === 'source') {
      text(500, 205, p.source.explanation, 25);
      text(500, 335, 'Which recovery team do you contact?', 24);
      Object.entries(FINALE_SOURCES).forEach(([id, source], index) =>
        button(420 + index * 70, source.label.toUpperCase(), () => this.applyRecoveryAction('select', id)));
    } else if (r.phase === 'inspect') {
      text(500, 205, p.source.search, 25, '#f4e6cd', 160);
      text(500, 390, `CASE FILE: ${p.artifact.label}\n\n${p.artifact.description || 'Compare the recovered object with the stolen artefact recorded in the case file.'}`, 23, '#ffdda1', 160);
      button(610, 'COMPARE WITH CASE FILE AND SECURE THE ARTEFACT', () => this.secureArtifact());
    } else {
      text(500, 215, 'ARTEFACT SECURED', 30, '#d9edb2');
      text(500, 300, `${p.artifact.label}\n\nRecovered at: ${p.source.place}\n\nLogged in recovered artefacts.`, 25, '#f4e6cd', 230);
      button(610, 'CONTINUE TO COURT', () => this.continueToCourt());
    }
    if (this.recoveryNotice) {
      text(500, 660, this.recoveryNotice, 19, '#ffb4a1', 50);
      button(730, 'RETRY SAVE', () => { this.recoveryNotice = this.saveRecovery() ? 'Saved.' : 'Save failed.'; this.renderRecovery(); });
    }
  }
}
