import { ArrestSelectionScene as OriginalArrestSelectionScene } from './ArrestSelectionScene.js';
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { saveManager } from '../saveGameService.js';
import { ChaseScene } from './ChaseScene.js';
import { CHASE_EVENTS } from '../config/chaseEvents.js';
import { makeChase } from '../systems/chaseLogic.js';
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
    const record = currentChase();
    if (record && chaseFailureCode(record)) {
  BaseScene.prototype.create.call(this);

  void this.goto(
    'GameOverScene',
    terminalData(record)
  );

  return;
}
    if (record && !['caught','review','settled'].includes(record.phase)) {
      BaseScene.prototype.create.call(this);
      void this.goto(record.phase === 'escaped' ? 'GameOverScene' : 'ChaseScene',
        record.phase === 'escaped' ? terminalData(record) : { sourceKey: null, resumeChase: true });
      return;
    }
    super.create();
    if (record && ['caught','review'].includes(record.phase) && gameState.arrestWarrantIssued) {
      this.selectedSuspectId = record.suspectId;
      this.selectionLocked = true;
      this.chasePassed = true;
      this.disableNavigation();
      this.arrestButton?.disableInteractive();
      this.time.delayedCall(0, () => super.confirmSelection());
    }
  }
  async confirmSelection() {
    if (this.resultCommitted || this.isLeaving || this.chaseStarting) return;
    if (this.chasePassed || !gameState.arrestWarrantIssued) return super.confirmSelection();
    if (this.selectedSuspectId == null) return;
    this.chaseStarting = true;
    try {
      const seed = (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
      const record = makeChase({ caseId: gameState.currentCaseId, campaignId: gameState._createdAt,
        suspectId: this.selectedSuspectId, difficulty: gameState.difficulty, seed, events: CHASE_EVENTS });
      record.slotKey = saveManager.getLastUsedSlot();
      persistChase(record);
      if (!this.hasScene('ChaseScene')) this.scene.add('ChaseScene', ChaseScene, false);
      this.scene.pause();
      this.scene.launch('ChaseScene', { sourceKey: this.sys.settings.key, resumeChase: true });
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
