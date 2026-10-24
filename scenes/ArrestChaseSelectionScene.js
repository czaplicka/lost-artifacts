import { ArrestSelectionScene as OriginalArrestSelectionScene } from './ArrestSelectionScene.js';
import { gameState } from '../GameData.js';
import { ChaseScene } from './ChaseScene.js';

// Preserve the existing dossier screen and its original outcome processing.
export class ArrestSelectionScene extends OriginalArrestSelectionScene {
  init(...args) {
    super.init(...args);
    this.chaseStarting = false;
    this.chasePassed = false;
  }

  async confirmSelection() {
    if (this.resultCommitted || this.isLeaving || this.chaseStarting) return;
    if (this.chasePassed || !gameState.arrestWarrantIssued) {
      return super.confirmSelection();
    }
    if (this.selectedSuspectId == null) return;
    this.chaseStarting = true;
    try {
      // Register before launching: the original screen remains paused underneath.
      if (!this.hasScene('ChaseScene')) this.scene.add('ChaseScene', ChaseScene, false);
      this.scene.pause();
      this.scene.launch('ChaseScene', {
        sourceKey: this.sys.settings.key,
        caseId: gameState.currentCaseId,
        suspectId: this.selectedSuspectId
      });
    } catch (error) {
      console.error('[ArrestSelectionScene] Could not start chase:', error);
      this.scene.resume();
      this.chaseStarting = false;
      this.selectionLocked = false;
      this.enableNavigation();
      this.arrestButton?.setInteractive({ useHandCursor: true });
      this.arrestButton?.setFillStyle(0x7b241c, 1);
      this.arrestButtonText?.setAlpha(1);
      this.dialogueText?.setText('Could not start pursuit. Please try again.');
    }
  }

  completeChase() {
    if (!this.chaseStarting || this.chasePassed || this.resultCommitted) return;
    this.chaseStarting = false;
    this.chasePassed = true;
    this.scene.resume();
    super.confirmSelection();
  }
}
