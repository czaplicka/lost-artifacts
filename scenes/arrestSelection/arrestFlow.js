import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gameState } from '../../GameData.js';
import { saveGameState } from '../../gameStatePersistence.js';
import { isCorrectSuspectChoice } from '../../suspects/suspectHelpers.js';
import { getTheoryReadiness, theoryCaseKey } from '../../crimeBoard/CaseTheoryModel.js';
import { REQUIRE_ARREST_CONFIRMATION, ARREST_COMMIT_DELAY, PAL } from './config.js';

function requireCompleteTheory(scene) {
  const readiness = getTheoryReadiness(gameState);
  if (readiness.complete) return readiness;
  scene.dialogueText?.setText(
    __dialogueText("scenes/arrestSelection/arrestFlow.js", "t_ee4c6d53f7a026dac9d3") + readiness.missing.join(__dialogueText("scenes/arrestSelection/arrestFlow.js", "t_01ba4719c80b6fe911b0"))
  );
  scene.bottomNoteText?.setText(
    __dialogueText("scenes/arrestSelection/arrestFlow.js", "t_a9d23a1b2f832162ac76")
  );
  return null;
}

function restoreArrestControls(scene) {
  scene.selectionLocked = false;
  scene.enableNavigation();
  scene.orderStamp?.destroy();
  scene.orderStamp = null;
  scene.arrestButton?.setInteractive({ useHandCursor: true });
  scene.arrestButton?.bg?.setFillStyle(PAL.red, 1);
  scene.arrestButtonText?.setAlpha(1);
  scene.startArrestPulse();
}

export const arrestFlowMethods = {
  requestArrest() {
    if (!this.canNavigate() || this.resultCommitted) return;
    if (!requireCompleteTheory(this)) return;
    const suspect = this.displaySuspects[this.currentSuspectIndex];
    if (!suspect) return;
    if (REQUIRE_ARREST_CONFIRMATION) {
      this.openConfirm(suspect);
      return;
    }
    this.beginArrest();
  },

  beginArrest() {
    if (this.resultCommitted || this.selectionLocked || this.isLeaving) return;
    if (!requireCompleteTheory(this)) return;
    const suspect = this.displaySuspects[this.currentSuspectIndex];
    if (!suspect) return;
    this.selectionLocked = true;
    this.selectedSuspectId = suspect.id;
    this.disableNavigation();
    this.arrestButton.disableInteractive();
    this.arrestButton.bg.setFillStyle(0x555555, 1);
    this.arrestButtonText.setAlpha(0.7);
    this.stopArrestPulse();
    this.dialogueText.setText(
      __dialogueText("scenes/arrestSelection/arrestFlow.js", "t_14da18d8bd49e95eecdd")
    );
    this.bottomNoteText.setText(
      __dialogueText("scenes/arrestSelection/arrestFlow.js", "t_36dc86ef43868ddcb609")
    );
    this.currentCard?.polaroidFrame?.setStrokeStyle(5, PAL.red, 1);
    this.orderStamp?.destroy();
    this.orderStamp = this.createStamp(
      1450, 690, __dialogueText("scenes/arrestSelection/arrestFlow.js", "t_caff0eb1ece00a272f42"), 26, 0xb3281c, -0.18
    ).setDepth(340).setAlpha(0).setScale(3.2);
    this.tweens.add({
      targets: this.orderStamp, alpha: 0.92, scale: 1,
      duration: 260, ease: 'Cubic.In',
      onComplete: () => this.cameras.main.shake(120, 0.004)
    });
    this.time.delayedCall(ARREST_COMMIT_DELAY, () => this.confirmSelection());
  },

  confirmSelection() {
    if (this.resultCommitted || this.isLeaving) return;
    const readiness = getTheoryReadiness(gameState);
    if (!readiness.complete) {
      restoreArrestControls(this);
      requireCompleteTheory(this);
      return;
    }
    const thiefId = gameState.currentThief?.id ?? gameState.currentThiefId;
    const selectedSuspectId = this.selectedSuspectId;
    if (selectedSuspectId == null || thiefId == null) {
      console.error('[ArrestSelectionScene] Cannot submit arrest: missing suspect data.', {
        selectedSuspectId, thiefId
      });
      restoreArrestControls(this);
      this.dialogueText?.setText(
        __dialogueText("scenes/arrestSelection/arrestFlow.js", "t_ecdfad95d829af960edb")
      );
      this.bottomNoteText?.setText(__dialogueText("scenes/arrestSelection/arrestFlow.js", "t_619bd5c53b4d1d772ce4"));
      return;
    }
    const isCorrect = isCorrectSuspectChoice(selectedSuspectId, thiefId);
    const submitted = JSON.parse(JSON.stringify({
      version: 1,
      caseId: gameState.currentCaseId,
      campaignId: gameState._createdAt,
      workspaceKey: theoryCaseKey(gameState),
      suspectId: selectedSuspectId,
      theory: readiness.theory,
      submittedAt: new Date().toISOString()
    }));
    gameState.caseData = {
      ...(gameState.caseData || {}),
      submittedCaseTheory: submitted
    };
    this.resultCommitted = true;
    this.selectionLocked = true;
    this.disableNavigation();
    this.arrestButton?.disableInteractive();
    this.closeZoom();
    gameState.finalArrestSuspectId = selectedSuspectId;
    gameState.finalArrestResult = isCorrect ? 'SUCCESS' : 'FAILURE';
    gameState.caseResolved = isCorrect;
    gameState.caseFailed = !isCorrect;
    gameState.isGameActive = false;
    gameState.gameOverReason = isCorrect ? ''
      : __dialogueText("scenes/arrestSelection/arrestFlow.js", "t_9046d6f0d000a468d137");
    this.nextSceneKey = isCorrect ? 'SuccessScene' : 'GameOverScene';
    const saved = saveGameState();
    if (!saved) console.warn(
      '[ArrestSelectionScene] Arrest decision is in memory, but saving the game failed.'
    );
    this.showResult(
      __dialogueText("scenes/arrestSelection/arrestFlow.js", "t_c5a019228081764cf001"),
      __dialogueText("scenes/arrestSelection/arrestFlow.js", "t_f41ea836a2d9d3f7ff3a")
    );
  }
};
