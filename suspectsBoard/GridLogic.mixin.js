import { requestAutosave, saveGameState, flushAutosave } from '../gameStatePersistence.js';
import { applyGridExclusions } from './applyGridExclusions.js';
import { RULED_OUT_EVERYONE_REASON } from './gridConstants.js';
import { formatCellValue } from './gridHelpers.js';

export const GridLogicMixin = {
  getPlacedClueIds() {
    return new Set(Object.values(this.placedCluesByCell));
  },

  getUnplacedClues() {
    const placed = this.getPlacedClueIds();
    return this.clueCards.filter((clue) => !placed.has(clue.id));
  },

  getCellKey(target) {
    const subject =
      target.type === 'crime_scene' ? 'crime_scene' : target.suspectId;
    return `${subject}:${target.field}`;
  },

  isTargetForClue(clue, target) {
    if (!clue) return false;

    if (clue.type === 'crime_scene_fact') {
      return target.type === 'crime_scene' && target.field === clue.field;
    }

    return (
      target.type === 'suspect' &&
      target.suspectId === clue.suspectId &&
      target.field === clue.field
    );
  },

  setFeedback(message) {
    this.feedbackMessage = message || '';
    this.feedbackText?.setText(this.feedbackMessage);
  },

  selectClue(clueId) {
    this.selectedClueId = this.selectedClueId === clueId ? null : clueId;

    this.setFeedback(
      this.selectedClueId ? 'Now click the glowing cell in the grid.' : ''
    );

    this.refreshAll();
  },

  onCellClick(target, placedClue) {
    if (placedClue && !this.selectedClueId) {
      this.removePlacedClue(target, placedClue);
      return;
    }

    this.placeSelectedClue(target);
  },

  removePlacedClue(target, clue) {
    const key = this.getCellKey(target);
    delete this.placedCluesByCell[key];
    this.saveGridProgress();
    this.setFeedback(`${clue.label} taken back from the grid.`);
    this.refreshAll();
  },

  placeSelectedClue(target) {
    const clue = this.clueCards.find(
      (item) => item.id === this.selectedClueId
    );

    if (!clue) {
      this.setFeedback('Choose a clue card first.');
      return;
    }

    if (!this.isTargetForClue(clue, target)) {
      this.setFeedback('That clue does not belong in this cell.');
      return;
    }

    const key = this.getCellKey(target);

    if (this.placedCluesByCell[key]) {
      this.setFeedback('This cell already has a clue. Click it to take it back.');
      return;
    }

    this.placedCluesByCell[key] = clue.id;
    this.selectedClueId = null;

    this.saveGridProgress();
    this.setFeedback(
      `${clue.label}: ${formatCellValue(clue.value)} added to the grid.`
    );
    this.refreshAll();
  },

  toggleSuspectMark(suspectId) {
    this.markedUnlikelyBySuspectId[suspectId] =
      !this.markedUnlikelyBySuspectId[suspectId];

    this.saveGridProgress();
    this.refreshAll();
  },

  saveGridProgress() {
    const caseForensics = this.labManager.ensureCaseForensics();

    caseForensics.suspectGrid ??= {};
    caseForensics.suspectGrid.placedCluesByCell = {
      ...this.placedCluesByCell
    };

    caseForensics.suspectGrid.markedUnlikelyBySuspectId = {
      ...this.markedUnlikelyBySuspectId
    };

    delete caseForensics.suspectGrid.eliminatedSuspectIds;

    requestAutosave();
  },

  finalizeGrid() {
    const remainingSuspects = this.suspects.filter(
      (suspect) => !this.markedUnlikelyBySuspectId[suspect.id]
    );

    if (remainingSuspects.length === 0) {
      this.showConfirmModal({
        title: 'RULE OUT EVERYONE?',
        message:
          'You marked every single suspect as unlikely. If you confirm, the case is closed and you lose. Are you sure, detective?',
        yesLabel: 'YES, CLOSE THE CASE',
        noLabel: 'LET ME RECHECK',
        onYes: () => this.failCaseRuledOutEveryone()
      });
      return;
    }

    this.commitGrid(remainingSuspects);
  },

  failCaseRuledOutEveryone() {
    const caseForensics = this.labManager.ensureCaseForensics();

    caseForensics.suspectGrid ??= {};
    caseForensics.suspectGrid.completed = true;
    caseForensics.suspectGrid.completedAt = Date.now();
    caseForensics.suspectGrid.ruledOutEveryone = true;
    caseForensics.suspectGrid.alibiCandidateSuspectIds = [];

    delete caseForensics.suspectGrid.remainingSuspectIds;
    delete caseForensics.suspectGrid.eliminatedSuspectIds;

    this.gameState.caseFailed = true;
    this.gameState.caseResolved = false;
    this.gameState.isGameActive = false;
    this.gameState.gameOverReason = RULED_OUT_EVERYONE_REASON;

    saveGameState();

    this.goto('GameOverScene', {
      title: 'THE CASE WENT COLD',
      message: RULED_OUT_EVERYONE_REASON
    });
  },

  commitGrid(remainingSuspects) {
    const caseForensics = this.labManager.ensureCaseForensics();

    caseForensics.suspectGrid ??= {};
    caseForensics.suspectGrid.completed = true;
    caseForensics.suspectGrid.completedAt = Date.now();
    caseForensics.suspectGrid.ruledOutEveryone = false;

    caseForensics.suspectGrid.alibiCandidateSuspectIds =
      remainingSuspects.map((suspect) => suspect.id);

    delete caseForensics.suspectGrid.remainingSuspectIds;
    delete caseForensics.suspectGrid.eliminatedSuspectIds;

    applyGridExclusions({
      gameState: this.gameState,
      cityId: this.cityId,
      suspectIds: this.suspects.map((suspect) => suspect.id),
      unlikelyById: this.markedUnlikelyBySuspectId
    });

    this.gameState.alibiInvestigation = {
      cityId: this.cityId,
      suspectIds: remainingSuspects.map((suspect) => suspect.id),
      unlocked: true
    };

    saveGameState();

    this.setFeedback(
      `${remainingSuspects.length} suspects remain. Their alibis are now available in Crime City.`
    );

    this.time.delayedCall(900, () => {
      this.closeScene();
    });
  },

  closeScene() {
    flushAutosave();

    if (
      this.returnScene &&
      this.returnScene !== this.scene.key &&
      this.scene.manager.keys[this.returnScene]
    ) {
      this.goto(this.returnScene, {
        ...this.returnData,
        cityId: this.cityId,
        evidenceGridClosed: true
      });
      return;
    }

    this.scene.stop();
  }
};