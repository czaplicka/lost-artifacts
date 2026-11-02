import { ArrestSelectionScene as OriginalArrestSelectionScene } from './ArrestSelectionScene.js';
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { saveManager } from '../saveGameService.js';
import { ChaseScene } from './ChaseScene.js';
import { CHASE_EVENTS } from '../config/chaseEvents.js';
import { makeChase } from '../systems/chaseLogic.js';
import { ensureCaseIdentity } from '../systems/caseIdentity.js';
import {
  currentChase,
  persistChase,
  terminalData,
  chaseFailureCode
} from '../systems/chasePersistence.js';

export class ArrestSelectionScene extends OriginalArrestSelectionScene {
  init(...args) {
    super.init(...args);
    this.chaseStarting = false;
    this.chasePassed = false;
  }

  create() {
    if (gameState.arrestWarrantIssued) {
      try {
        if (ensureCaseIdentity(gameState) && !saveGameState()) {
          console.warn('[ArrestSelectionScene] Restored case ID is in memory, but autosave failed.');
        }
      } catch (error) {
        console.error('[ArrestSelectionScene] Case identity could not be restored:', error);
        super.create();
        this.dialogueText?.setText('The case file could not be restored. Reload your saved game.');
        return;
      }
    }

    const record = currentChase();
    if (record && chaseFailureCode(record)) {
      BaseScene.prototype.create.call(this);
      void this.goto('GameOverScene', terminalData(record));
      return;
    }

    if (record && !['caught', 'review', 'settled'].includes(record.phase)) {
      BaseScene.prototype.create.call(this);
      void this.goto('ChaseScene', { sourceKey: null, resumeChase: true });
      return;
    }

    super.create();
    if (record && ['caught', 'review'].includes(record.phase) &&
        gameState.arrestWarrantIssued && this.arrestButton) {
      this.selectedSuspectId = record.suspectId;
      this.selectionLocked = true;
      this.chasePassed = true;
      this.disableNavigation();
      this.arrestButton.disableInteractive();
      this.time.delayedCall(0, () => super.confirmSelection());
    }
  }

  async confirmSelection() {
    if (this.resultCommitted || this.isLeaving || this.chaseStarting) return;
    if (this.chasePassed || !gameState.arrestWarrantIssued) {
      return super.confirmSelection();
    }
    if (this.selectedSuspectId == null) return;

    this.chaseStarting = true;
    try {
      ensureCaseIdentity(gameState);

      // Reuse a saved pursuit after a failed launch or save attempt.
      // Never draw a second plan for an already-started pursuit.
      let record = currentChase();
      if (record) {
        if (String(record.suspectId) !== String(this.selectedSuspectId)) {
          throw new Error('An existing pursuit belongs to another suspect. Reload the saved game.');
        }
        if (chaseFailureCode(record) || record.phase === 'settled') {
          throw new Error('This pursuit has already ended. Reload the saved game.');
        }
      } else {
        if (gameState.chaseState != null) {
          throw new Error('The saved pursuit does not match the current case. Reload the saved game.');
        }
        const seed = (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
        record = makeChase({
          caseId: gameState.currentCaseId,
          campaignId: gameState._createdAt,
          suspectId: this.selectedSuspectId,
          difficulty: gameState.difficulty,
          seed,
          events: CHASE_EVENTS
        });
        record.slotKey = saveManager.getLastUsedSlot();
      }

      if (!this.hasScene('ChaseScene')) {
        this.scene.add('ChaseScene', ChaseScene, false);
      }
      if (!persistChase(record)) {
        throw new Error('Could not save the pursuit checkpoint. Check browser storage and try again.');
      }
      this.scene.pause();
      this.scene.launch('ChaseScene', {
        sourceKey: this.sys.settings.key,
        resumeChase: true
      });
    } catch (error) {
      console.error('[ArrestSelectionScene] Could not start chase:', error, {
        caseId: gameState.currentCaseId,
        campaignId: gameState._createdAt,
        suspectId: this.selectedSuspectId
      });
      if (this.scene.isPaused()) this.scene.resume();
      this.restoreArrestAfterChaseError(error);
    }
  }

  restoreArrestAfterChaseError(error) {
    this.chaseStarting = false;
    this.selectionLocked = false;
    this.orderStamp?.destroy();
    this.orderStamp = null;
    this.enableNavigation();

    this.arrestButton?.setInteractive({ useHandCursor: true });
    this.arrestButton?.bg?.setFillStyle(this.arrestButton.fillNormal ?? 0x8f1d14, 1);
    this.arrestButtonText?.setAlpha(1);
    this.currentCard?.polaroidFrame?.setStrokeStyle(2, 0xcfc2a0, 1);
    this.startArrestPulse();
    this.dialogueText?.setText('Could not start pursuit. No arrest has been recorded.');
    this.bottomNoteText?.setText(error?.message || 'Review the case file and try again.');
  }

  completeChase() {
    if (!this.chaseStarting || this.chasePassed || this.resultCommitted) return;
    this.chaseStarting = false;
    this.chasePassed = true;
    this.scene.resume();
    super.confirmSelection();
  }
}
