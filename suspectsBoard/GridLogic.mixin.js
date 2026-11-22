import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { EventBus } from '../EventBus.js';
import { requestAutosave, saveGameState } from '../gameStatePersistence.js';
import { applyGridExclusions, getCaseKey } from './applyGridExclusions.js';
import { RULED_OUT_EVERYONE_REASON } from './gridConstants.js';
import { formatCellValue } from './gridHelpers.js';
import { advanceCrimeTutorial } from '../tutorials/CrimeCityTutorial.js';
import { playPuzzleSfx } from '../scenes/archive/PuzzleSfx.js';
import { playDocumentSfx } from '../scenes/archive/DocumentSfx.js';

const t = id => __dialogueText('suspectsBoard/GridLogic.mixin.js', id);
const SNAPSHOT_FIELDS = [
  'caseForensics', 'caseSuspects', 'suspects', 'suspectList', 'excludedSuspects',
  'suspectExclusionState', 'alibiInvestigation', 'caseFailed', 'caseResolved',
  'isGameActive', 'gameOverReason'
];
let restoredGeneration = 0;
EventBus.on('gameState:restored', () => { restoredGeneration += 1; });
function ensureSafetyContext(scene) {
  const state = scene.gameState;
  const key = JSON.stringify([restoredGeneration, state._createdAt, state.currentCaseId ?? getCaseKey(state, scene.cityId), scene.cityId]);
  if (scene._gridSafetyContext === key) return;
  scene._gridSafetyContext = key;
  scene._gridCommitting = false;
  scene._gridRecoveryRequired = false;
  scene._gridTerminalPending = state.caseFailed === true && state.gameOverReason === RULED_OUT_EVERYONE_REASON &&
    scene.labManager.ensureCaseForensics().suspectGrid?.ruledOutEveryone === true;
}
function canEdit(scene) {
  ensureSafetyContext(scene);
  return !scene.gridLeaving && !scene.modalOpen && !scene._gridCommitting &&
    !scene._gridRecoveryRequired && !scene._gridTerminalPending && !scene._cleanupDone;
}
function playGridAction(scene, name) {
  if (!scene.gridStarted || !canEdit(scene)) return;
  try {
    if (name === 'paper') playPuzzleSfx(scene, 'paper', .25);
    else playDocumentSfx(scene, 'click', .15);
  } catch (error) { console.debug('[SuspectGridScene] Action audio unavailable:', error); }
}
function commitGridState(scene, change) {
  ensureSafetyContext(scene);
  if (scene._gridCommitting || scene._gridRecoveryRequired || scene._cleanupDone) return false;
  let snapshot;
  try { snapshot = structuredClone(Object.fromEntries(SNAPSHOT_FIELDS.map(key => [key, scene.gameState[key]]))); }
  catch (error) {
    console.error('[SuspectGridScene] Snapshot failed:', error);
    scene.setFeedback('The grid could not be prepared for saving. Reopen it and try again.');
    return false;
  }
  scene._gridCommitting = true;
  try {
    change();
    if (saveGameState() !== true) throw new Error('The grid could not be saved.');
    return true;
  } catch (error) {
    console.error('[SuspectGridScene] Commit failed:', error);
    const rollbackErrors = [];
    for (const key of SNAPSHOT_FIELDS) {
      try { scene.gameState[key] = snapshot[key]; }
      catch (rollbackError) { rollbackErrors.push(rollbackError); }
    }
    if (Array.isArray(scene.gameState.caseSuspects)) {
      scene.suspects = scene.suspects.map(suspect => scene.gameState.caseSuspects.find(item => item.id === suspect.id) || suspect);
    }
    scene._gridRecoveryRequired = rollbackErrors.length > 0;
    scene.setFeedback(scene._gridRecoveryRequired
      ? 'Grid recovery was incomplete. Reload a known-good save before continuing.'
      : 'The shortlist could not be confirmed or saved. Your marks are still available. Please try again.');
    if (rollbackErrors.length) console.error('[SuspectGridScene] Recovery failed:', rollbackErrors);
    return false;
  } finally { scene._gridCommitting = false; }
}
function navigationAttempt(scene) {
  const token = Symbol('grid-navigation');
  scene._gridNavigationAttempt = token;
  const shutdown = () => {
    if (scene._gridNavigationAttempt === token) scene._gridNavigationAttempt = null;
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, shutdown);
  return {
    current: () => !scene._cleanupDone && scene._gridNavigationAttempt === token,
    release: () => scene.events.off(Phaser.Scenes.Events.SHUTDOWN, shutdown)
  };
}
export const GridLogicMixin = {
  getPlacedClueIds() { return new Set(Object.values(this.placedCluesByCell)); },
  getUnplacedClues() { const placed = this.getPlacedClueIds(); return this.clueCards.filter(clue => !placed.has(clue.id)); },
  getCellKey(target) { return `${target.type === 'crime_scene' ? 'crime_scene' : target.suspectId}:${target.field}`; },
  isTargetForClue(clue, target) {
    if (!clue) return false;
    if (clue.type === 'crime_scene_fact') return target.type === 'crime_scene' && target.field === clue.field;
    return target.type === 'suspect' && target.suspectId === clue.suspectId && target.field === clue.field;
  },
  setFeedback(message) { this.feedbackMessage = message || ''; this.feedbackText?.setText(this.feedbackMessage); },
  selectClue(clueId) {
    if (!canEdit(this)) return;
    const before = this.selectedClueId;
    this.selectedClueId = this.selectedClueId === clueId ? null : clueId;
    this.setFeedback(this.selectedClueId ? t('t_7ef159f58cbf5ae3b054') : ''); this.refreshAll();
    if (this.selectedClueId !== before) playGridAction(this, 'click');
  },
  onCellClick(target, placedClue) {
    if (!canEdit(this)) return;
    if (placedClue && !this.selectedClueId) { this.removePlacedClue(target, placedClue); return; }
    this.placeSelectedClue(target);
  },
  removePlacedClue(target, clue) {
    if (!canEdit(this)) return;
    const key = this.getCellKey(target), changed = Object.prototype.hasOwnProperty.call(this.placedCluesByCell, key);
    delete this.placedCluesByCell[key]; this.saveGridProgress();
    this.setFeedback(`${clue.label}${t('t_e883dc0c124ecc44d9f3')}`); this.refreshAll();
    if (changed) playGridAction(this, 'paper');
  },
  placeSelectedClue(target) {
    if (!canEdit(this)) return;
    const clue = this.clueCards.find(item => item.id === this.selectedClueId);
    if (!clue) { this.setFeedback(t('t_926799f0f634d72f08c1')); return; }
    if (!this.isTargetForClue(clue, target)) { this.setFeedback(t('t_b4779080efd5d07bd7a2')); return; }
    const key = this.getCellKey(target);
    if (this.placedCluesByCell[key]) { this.setFeedback(t('t_1268013213e0749fb537')); return; }
    this.placedCluesByCell[key] = clue.id; this.selectedClueId = null; this.saveGridProgress();
    this.setFeedback(`${clue.label}${t('t_45822f54a0d0e030f756')}${formatCellValue(clue.value)}${t('t_1d09c4f33391fa4eba81')}`);
    this.refreshAll(); playGridAction(this, 'paper');
  },
  toggleSuspectMark(suspectId) {
    if (!canEdit(this)) return;
    this.markedUnlikelyBySuspectId[suspectId] = !this.markedUnlikelyBySuspectId[suspectId];
    this.saveGridProgress(); this.refreshAll(); playGridAction(this, 'click');
  },
  saveGridProgress() {
    ensureSafetyContext(this);
    if (this._gridRecoveryRequired || this._gridTerminalPending || this._cleanupDone) return false;
    const forensics = this.labManager.ensureCaseForensics(); forensics.suspectGrid ??= {};
    forensics.suspectGrid.placedCluesByCell = { ...this.placedCluesByCell };
    forensics.suspectGrid.markedUnlikelyBySuspectId = { ...this.markedUnlikelyBySuspectId };
    delete forensics.suspectGrid.eliminatedSuspectIds; requestAutosave(); return true;
  },
  getGridRemainingSuspects() { return this.suspects.filter(suspect => !this.markedUnlikelyBySuspectId[suspect.id]); },
  isGridShortlistSubmitted() {
    ensureSafetyContext(this);
    const grid = this.labManager.ensureCaseForensics().suspectGrid;
    if (!grid?.completed || grid.ruledOutEveryone || this._gridRecoveryRequired) return false;
    const caseKey = getCaseKey(this.gameState, this.cityId);
    if (this.gameState.suspectExclusionState?.[caseKey]?.finished !== true) return false;
    const submitted = grid.alibiCandidateSuspectIds, current = this.getGridRemainingSuspects().map(suspect => suspect.id);
    if (!Array.isArray(submitted) || !current.length || submitted.length !== current.length) return false;
    const ids = new Set(submitted);
    return ids.size === current.length && current.every(id => ids.has(id));
  },
  finalizeGrid() {
    ensureSafetyContext(this);
    if (this.gridLeaving || this.modalOpen || this._gridCommitting || this._gridRecoveryRequired || this._cleanupDone) return false;
    if (this._gridTerminalPending) return this.failCaseRuledOutEveryone();
    const remaining = this.getGridRemainingSuspects();
    if (!remaining.length) {
      this.showConfirmModal({
        title: t('t_f91261fca31563851921'), message: t('t_a8cda391d19344841dc4'),
        yesLabel: t('t_c4063ca8c142ba1daedc'), noLabel: t('t_44674bc70455e9bd676e'), onYes: () => this.failCaseRuledOutEveryone()
      }); return false;
    }
    const alreadySubmitted = this.isGridShortlistSubmitted();
    if (!alreadySubmitted && !this.commitGrid(remaining)) return false;
    if (alreadySubmitted && saveGameState() !== true) {
      this.setFeedback('The grid could not be saved. Please try again.'); return false;
    }
    this.refreshAll(); this.crimeTutorial?.syncGridStep(true); return true;
  },
  async failCaseRuledOutEveryone() {
    ensureSafetyContext(this);
    if (this.gridLeaving || this._gridCommitting || this._gridRecoveryRequired || this._cleanupDone) return false;
    if (!this._gridTerminalPending) {
      const saved = commitGridState(this, () => {
        const forensics = this.labManager.ensureCaseForensics(); forensics.suspectGrid ??= {};
        Object.assign(forensics.suspectGrid, { completed: true, completedAt: Date.now(), ruledOutEveryone: true, alibiCandidateSuspectIds: [] });
        delete forensics.suspectGrid.remainingSuspectIds; delete forensics.suspectGrid.eliminatedSuspectIds;
        Object.assign(this.gameState, { caseFailed: true, caseResolved: false, isGameActive: false, gameOverReason: RULED_OUT_EVERYONE_REASON });
      });
      if (!saved) return false;
      this._gridTerminalPending = true;
    }
    this.gridLeaving = true;
    const attempt = navigationAttempt(this);
    try {
      const opened = await this.goto('GameOverScene', { title: t('t_3f04ff73607035edc1b8'), message: RULED_OUT_EVERYONE_REASON });
      if (!attempt.current()) return Boolean(opened);
      if (opened === false) throw new Error('GameOverScene could not be opened.');
      return true;
    } catch (error) {
      if (!attempt.current()) return false;
      this.gridLeaving = false;
      this.setFeedback('The result screen could not be opened. Press FINISH again to retry.');
      console.error('[SuspectGridScene] Result failed:', error); return false;
    } finally { attempt.release(); }
  },
  commitGrid(remainingSuspects) {
    ensureSafetyContext(this);
    if (this._gridTerminalPending || this.gridLeaving || this._cleanupDone) return false;
    const saved = commitGridState(this, () => {
      this.saveGridProgress();
      const forensics = this.labManager.ensureCaseForensics();
      applyGridExclusions({ gameState: this.gameState, cityId: this.cityId,
        suspectIds: this.suspects.map(suspect => suspect.id), unlikelyById: this.markedUnlikelyBySuspectId });
      Object.assign(forensics.suspectGrid, { completed: true, completedAt: Date.now(), ruledOutEveryone: false,
        alibiCandidateSuspectIds: remainingSuspects.map(suspect => suspect.id) });
      delete forensics.suspectGrid.remainingSuspectIds; delete forensics.suspectGrid.eliminatedSuspectIds;
      const caseKey = getCaseKey(this.gameState, this.cityId);
      this.gameState.alibiInvestigation = { cityId: this.cityId, caseKey, suspectIds: remainingSuspects.map(suspect => suspect.id), unlocked: true };
    });
    if (saved) this.setFeedback(`${remainingSuspects.length}${t('t_0545f3b240f4f6c416f9')}`);
    return saved;
  },
  async closeScene({ skipCommit = false } = {}) {
    ensureSafetyContext(this);
    if (this.gridLeaving || this.modalOpen || this._gridCommitting || this._gridRecoveryRequired || this._cleanupDone) return false;
    if (this._gridTerminalPending) return this.failCaseRuledOutEveryone();
    const remaining = this.getGridRemainingSuspects(), tutorial = this.gameState.onboarding?.crimeCity;
    const guided = tutorial && !tutorial.completed && tutorial.step === 'suspect_grid';
    if (!skipCommit && [2, 3].includes(remaining.length) && !this.isGridShortlistSubmitted()) {
      if (guided) { this.syncReturnHighlight?.(); this.setFeedback(t('t_c32f0cb05a3b89cf187c')); return false; }
      if (!this.commitGrid(remaining)) return false;
    }
    const submitted = this.isGridShortlistSubmitted();
    const snapshot = tutorial ? structuredClone(tutorial) : null;
    this.gridLeaving = true;
    const attempt = navigationAttempt(this);
    try {
      if (submitted && tutorial && !tutorial.completed && ['hypothesis', 'suspects', 'suspect_grid'].includes(tutorial.step)) {
        for (const step of ['hypothesis', 'suspects', 'suspect_grid']) advanceCrimeTutorial(this.gameState, step);
      }
      if (saveGameState() !== true) throw new Error('The grid could not be saved before returning.');
      this.clearReturnHighlight?.(); this.crimeTutorial?.clearHighlight();
      // goto is responsible for loading a registered/lazy scene, not this mixin.
      if (this.returnScene && this.returnScene !== this.scene.key) {
        const opened = await this.goto(this.returnScene, { ...this.returnData, cityId: this.cityId, evidenceGridClosed: true });
        if (!attempt.current()) return Boolean(opened);
        if (opened === false) throw new Error('Return scene could not be opened.');
      } else this.scene.stop();
      return true;
    } catch (error) {
      if (!attempt.current()) return false;
      if (snapshot && this.gameState.onboarding) this.gameState.onboarding.crimeCity = snapshot;
      this.gridLeaving = false; requestAutosave(); this.startCrimeTutorial?.(); this.syncReturnHighlight?.();
      this.setFeedback(t('t_a5d459c5fc757ceac3bb'));
      console.error('[SuspectGridScene] Return failed:', error); return false;
    } finally { attempt.release(); }
  }
};
