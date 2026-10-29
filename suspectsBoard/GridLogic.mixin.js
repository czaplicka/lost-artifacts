import { requestAutosave, saveGameState, flushAutosave } from '../gameStatePersistence.js';
import { applyGridExclusions, getCaseKey } from './applyGridExclusions.js';
import { RULED_OUT_EVERYONE_REASON } from './gridConstants.js';
import { formatCellValue } from './gridHelpers.js';
import { advanceCrimeTutorial } from '../CrimeCityTutorial.js';

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
    this.selectedClueId = this.selectedClueId === clueId ? null : clueId;
    this.setFeedback(this.selectedClueId ? 'Now click the glowing cell in the grid.' : ''); this.refreshAll();
  },
  onCellClick(target, placedClue) {
    if (placedClue && !this.selectedClueId) { this.removePlacedClue(target, placedClue); return; }
    this.placeSelectedClue(target);
  },
  removePlacedClue(target, clue) {
    delete this.placedCluesByCell[this.getCellKey(target)]; this.saveGridProgress();
    this.setFeedback(`${clue.label} taken back from the grid.`); this.refreshAll();
  },
  placeSelectedClue(target) {
    const clue = this.clueCards.find(item => item.id === this.selectedClueId);
    if (!clue) { this.setFeedback('Choose a clue card first.'); return; }
    if (!this.isTargetForClue(clue, target)) { this.setFeedback('That clue does not belong in this cell.'); return; }
    const key = this.getCellKey(target);
    if (this.placedCluesByCell[key]) { this.setFeedback('This cell already has a clue. Click it to take it back.'); return; }
    this.placedCluesByCell[key] = clue.id; this.selectedClueId = null; this.saveGridProgress();
    this.setFeedback(`${clue.label}: ${formatCellValue(clue.value)} added to the grid.`); this.refreshAll();
  },
  toggleSuspectMark(suspectId) {
    this.markedUnlikelyBySuspectId[suspectId] = !this.markedUnlikelyBySuspectId[suspectId];
    this.saveGridProgress(); this.refreshAll();
  },
  saveGridProgress() {
    const forensics = this.labManager.ensureCaseForensics(); forensics.suspectGrid ??= {};
    forensics.suspectGrid.placedCluesByCell = { ...this.placedCluesByCell };
    forensics.suspectGrid.markedUnlikelyBySuspectId = { ...this.markedUnlikelyBySuspectId };
    delete forensics.suspectGrid.eliminatedSuspectIds; requestAutosave();
  },
  getGridRemainingSuspects() { return this.suspects.filter(suspect => !this.markedUnlikelyBySuspectId[suspect.id]); },
  isGridShortlistSubmitted() {
    const grid = this.labManager.ensureCaseForensics().suspectGrid;
    if (!grid?.completed || grid.ruledOutEveryone) return false;
    const submitted = grid.alibiCandidateSuspectIds, current = this.getGridRemainingSuspects().map(suspect => suspect.id);
    if (!Array.isArray(submitted) || !current.length || submitted.length !== current.length) return false;
    const ids = new Set(submitted);
    return ids.size === current.length && current.every(id => ids.has(id));
  },
  finalizeGrid() {
    if (this.gridLeaving || this.modalOpen) return;
    const remaining = this.getGridRemainingSuspects();
    if (!remaining.length) {
      this.showConfirmModal({
        title: 'RULE OUT EVERYONE?',
        message: 'You marked every single suspect as unlikely. If you confirm, the case is closed and you lose. Are you sure, detective?',
        yesLabel: 'YES, CLOSE THE CASE', noLabel: 'LET ME RECHECK', onYes: () => this.failCaseRuledOutEveryone()
      }); return;
    }
    if (!this.isGridShortlistSubmitted()) this.commitGrid(remaining);
    flushAutosave(); this.refreshAll(); this.crimeTutorial?.syncGridStep(true);
  },
  failCaseRuledOutEveryone() {
    const forensics = this.labManager.ensureCaseForensics(); forensics.suspectGrid ??= {};
    Object.assign(forensics.suspectGrid, { completed: true, completedAt: Date.now(), ruledOutEveryone: true, alibiCandidateSuspectIds: [] });
    delete forensics.suspectGrid.remainingSuspectIds; delete forensics.suspectGrid.eliminatedSuspectIds;
    Object.assign(this.gameState, { caseFailed: true, caseResolved: false, isGameActive: false, gameOverReason: RULED_OUT_EVERYONE_REASON });
    saveGameState(); this.goto('GameOverScene', { title: 'THE CASE WENT COLD', message: RULED_OUT_EVERYONE_REASON });
  },
  commitGrid(remainingSuspects) {
    this.saveGridProgress();
    const forensics = this.labManager.ensureCaseForensics();
    Object.assign(forensics.suspectGrid, {
      completed: true, completedAt: Date.now(), ruledOutEveryone: false,
      alibiCandidateSuspectIds: remainingSuspects.map(suspect => suspect.id)
    });
    delete forensics.suspectGrid.remainingSuspectIds; delete forensics.suspectGrid.eliminatedSuspectIds;
    applyGridExclusions({ gameState: this.gameState, cityId: this.cityId, suspectIds: this.suspects.map(suspect => suspect.id), unlikelyById: this.markedUnlikelyBySuspectId });
    const caseKey = getCaseKey(this.gameState, this.cityId);
    this.gameState.alibiInvestigation = { cityId: this.cityId, caseKey, suspectIds: remainingSuspects.map(suspect => suspect.id), unlocked: true };
    // Leave the HQ tutorial on suspect_grid until the player clicks Return.
    saveGameState(); this.setFeedback(`${remainingSuspects.length} suspects sent. Click CRIME CITY to return.`);
  },
  async closeScene({ skipCommit = false } = {}) {
    if (this.gridLeaving || this.modalOpen) return;
    const remaining = this.getGridRemainingSuspects(), tutorial = this.gameState.onboarding?.crimeCity;
    const guided = tutorial && !tutorial.completed && tutorial.step === 'suspect_grid';
    if (!skipCommit && remaining.length === 2 && !this.isGridShortlistSubmitted()) {
      if (guided) { this.syncReturnHighlight?.(); this.setFeedback('Click SEND TO ALIBIS first. Then return to Crime City.'); return; }
      this.commitGrid(remaining);
    }
    const submitted = this.isGridShortlistSubmitted();
    const snapshot = tutorial ? JSON.parse(JSON.stringify(tutorial)) : null;
    this.gridLeaving = true;
    if (submitted && tutorial && !tutorial.completed && ['hypothesis', 'suspects', 'suspect_grid'].includes(tutorial.step)) {
      for (const step of ['hypothesis', 'suspects', 'suspect_grid']) advanceCrimeTutorial(this.gameState, step);
    }
    this.clearReturnHighlight?.(); this.crimeTutorial?.clearHighlight(); flushAutosave();
    try {
      if (this.returnScene && this.returnScene !== this.scene.key && this.scene.manager.keys[this.returnScene]) {
        const opened = await this.goto(this.returnScene, { ...this.returnData, cityId: this.cityId, evidenceGridClosed: true });
        if (opened === false && !this._cleanupDone) throw new Error('Return scene could not be opened.');
      } else this.scene.stop();
    } catch (error) {
      if (this._cleanupDone) return;
      if (snapshot && this.gameState.onboarding) this.gameState.onboarding.crimeCity = snapshot;
      this.gridLeaving = false; requestAutosave(); this.startCrimeTutorial?.(); this.syncReturnHighlight?.();
      this.setFeedback('Could not return to Crime City. Please try again.');
      console.error('[SuspectGridScene] Return failed:', error);
    }
  }
};