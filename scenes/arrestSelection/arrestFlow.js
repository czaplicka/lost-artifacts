import { gameState } from '../../GameData.js';
import { saveGameState } from '../../gameStatePersistence.js';
import { isCorrectSuspectChoice } from '../../suspects/suspectHelpers.js';
import { REQUIRE_ARREST_CONFIRMATION, ARREST_COMMIT_DELAY, PAL } from './config.js';

export const arrestFlowMethods = {
  requestArrest() {
    if (!this.canNavigate() || this.resultCommitted) return;

    const suspect = this.displaySuspects[this.currentSuspectIndex];

    if (!suspect) return;

    if (REQUIRE_ARREST_CONFIRMATION) {
      this.openConfirm(suspect);
      return;
    }

    this.beginArrest();
  },

  beginArrest() {
    if (this.resultCommitted || this.selectionLocked || this.isLeaving) {
      return;
    }

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
      'Arrest order submitted. The team is moving in to detain the suspect...'
    );

    this.bottomNoteText.setText(
      'The case will be reviewed once the suspect is in custody.'
    );

    this.currentCard?.polaroidFrame?.setStrokeStyle(5, PAL.red, 1);

    // rubber stamp slam on the record page (identical for every suspect)
    this.orderStamp?.destroy();

    this.orderStamp = this.createStamp(
      1450,
      690,
      'ORDER SIGNED',
      26,
      0xb3281c,
      -0.18
    )
      .setDepth(340)
      .setAlpha(0)
      .setScale(3.2);

    this.tweens.add({
      targets: this.orderStamp,
      alpha: 0.92,
      scale: 1,
      duration: 260,
      ease: 'Cubic.In',
      onComplete: () => {
        this.cameras.main.shake(120, 0.004);
      }
    });

    this.time.delayedCall(ARREST_COMMIT_DELAY, () =>
      this.confirmSelection()
    );
  },

  confirmSelection() {
    if (this.resultCommitted || this.isLeaving) {
      return;
    }

    const thiefId =
      gameState.currentThief?.id ??
      gameState.currentThiefId;

    const selectedSuspectId = this.selectedSuspectId;

    if (selectedSuspectId == null || thiefId == null) {
      console.error(
        '[ArrestSelectionScene] Cannot submit arrest: missing suspect data.',
        { selectedSuspectId, thiefId }
      );

      this.selectionLocked = false;
      this.enableNavigation();

      this.orderStamp?.destroy();
      this.orderStamp = null;

      this.arrestButton
        ?.setInteractive({ useHandCursor: true });
      this.arrestButton?.bg?.setFillStyle(PAL.red, 1);
      this.arrestButtonText?.setAlpha(1);
      this.startArrestPulse();

      this.dialogueText?.setText(
        'The arrest order could not be submitted. ' +
          'Review the dossier and try again.'
      );

      this.bottomNoteText?.setText(
        'Missing suspect data. No arrest has been recorded.'
      );

      return;
    }

    const isCorrect = isCorrectSuspectChoice(
      selectedSuspectId,
      thiefId
    );

    this.resultCommitted = true;
    this.selectionLocked = true;

    this.disableNavigation();
    this.arrestButton?.disableInteractive();
    this.closeZoom();

    // Internal result used by the ending scenes.
    // This scene awards no points, reputation or integrity.
    gameState.finalArrestSuspectId = selectedSuspectId;

    gameState.finalArrestResult = isCorrect
      ? 'SUCCESS'
      : 'FAILURE';

    gameState.caseResolved = isCorrect;
    gameState.caseFailed = !isCorrect;
    gameState.isGameActive = false;

    gameState.gameOverReason = isCorrect
      ? ''
      : 'Incorrect suspect detained. The real thief escaped before the bureau could act.';

    this.nextSceneKey = isCorrect
      ? 'SuccessScene'
      : 'GameOverScene';

    const saved = saveGameState();

    if (!saved) {
      console.warn(
        '[ArrestSelectionScene] Arrest decision is in memory, ' +
          'but saving the game failed.'
      );
    }

    // Identical confirmation for correct and wrong picks (no spoilers).
    this.showResult(
      'SUSPECT DETAINED',
      'The selected suspect has been taken into custody. ' +
        'Your report has been forwarded to the bureau for review.'
    );
  }
};
