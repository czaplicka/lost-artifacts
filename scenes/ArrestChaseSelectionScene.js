import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { ArrestSelectionScene as OriginalArrestSelectionScene } from './ArrestSelectionScene.js';
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { saveManager } from '../saveGameService.js';
import { ChaseScene } from './ChaseScene.js';
import { CHASE_EVENTS } from '../config/chaseEvents.js';
import { makeChase, validChase } from '../systems/chaseLogic.js';
import { ensureCaseIdentity } from '../systems/caseIdentity.js';
import { prepareTheorySubmission } from '../systems/CaseTheorySubmission.js';
import { currentChase, persistChase, terminalData, chaseFailureCode } from '../systems/chasePersistence.js';

const text = key => __dialogueText('scenes/ArrestChaseSelectionScene.js', key);

export class ArrestSelectionScene extends OriginalArrestSelectionScene {
  init(...args) {
    super.init(...args);
    this.chaseStarting = false;
    this.chasePassed = false;
    this._chaseRun = Symbol('arrest-chase-run');
    this._preparedChases = new Map();
    this._chaseRecoveryRoot = null;
    this._chaseRecoveryText = null;
    this._chaseRetryButton = null;
  }

  isCurrentChaseRun(run) {
    return run != null && this._chaseRun === run && !this._cleanupDone;
  }

  create() {
    const run = this._chaseRun;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this._chaseRun !== run) return;
      this._chaseRun = null;
      this.clearChaseRecovery();
      this._preparedChases.clear();
    });
    if (gameState.arrestWarrantIssued) {
      try {
        if (ensureCaseIdentity(gameState) && !saveGameState()) {
          console.warn('[ArrestSelectionScene] Restored case ID could not be saved.');
        }
      } catch (error) {
        console.error('[ArrestSelectionScene] Case identity:', error);
        BaseScene.prototype.create.call(this);
        this.showChaseRecovery(error, () => this.scene.restart());
        return;
      }
    }
    const record = currentChase();
    if (record && chaseFailureCode(record)) {
      BaseScene.prototype.create.call(this);
      void this.openChaseDestination('GameOverScene', terminalData(record));
      return;
    }
    if (record?.phase === 'settled') {
      BaseScene.prototype.create.call(this);
      const target = record.terminalScene;
      if (target && target !== 'ChaseScene' && target !== 'ArrestSelectionScene') {
        void this.openChaseDestination(target, { caseId: record.caseId, suspectId: record.suspectId });
      } else {
        this.showChaseRecovery(new Error(text('t_aeb7e047c881664f47b5')), () => this.scene.restart());
      }
      return;
    }
    if (record) {
      BaseScene.prototype.create.call(this);
      void this.resumePursuit(record);
      return;
    }
    super.create();
  }

  clearChaseRecovery() {
    this._chaseRecoveryRoot?.destroy(true);
    this._chaseRecoveryRoot = null;
    this._chaseRecoveryText = null;
    this._chaseRetryButton = null;
  }

  showChaseRecovery(error, retry) {
    if (this._cleanupDone || this._chaseRun === null) return;
    this.clearChaseRecovery();
    const width = this.scale.width, height = this.scale.height;
    const root = this.add.container(0, 0).setDepth(10000);
    this._chaseRecoveryRoot = root;
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x17120f, 0.98).setInteractive();
    const message = this.add.text(width / 2, height * 0.30,
      error?.message || 'The pursuit could not be opened. Your saved pursuit has not been rerolled.', {
        fontFamily: 'SpecialElite', fontSize: '26px', color: '#f7e6bc', align: 'center',
        wordWrap: { width: Math.max(120, Math.min(900, width - 60)) }
      }).setOrigin(0.5, 0);
    const y = Math.max(height * 0.65, message.y + message.height + 55);
    const button = this.add.rectangle(width / 2, y, Math.min(340, Math.max(120, width - 40)), 70, 0x503722)
      .setStrokeStyle(2, 0xc7ad73).setInteractive({ useHandCursor: true });
    const label = this.add.text(width / 2, y, 'RETRY', {
      fontFamily: 'PressStart2P', fontSize: '20px', color: '#ffe3a0'
    }).setOrigin(0.5);
    root.add([shade, message, button, label]);
    this._chaseRecoveryText = message;
    this._chaseRetryButton = button;
    let retrying = false;
    const run = this._chaseRun;
    button.on('pointerdown', () => {
      if (retrying || this.chaseStarting || !this.isCurrentChaseRun(run)) return;
      retrying = true;
      button.disableInteractive();
      Promise.resolve().then(() => {
        if (this.isCurrentChaseRun(run)) return retry();
      }).catch(retryError => {
        console.error('[ArrestSelectionScene] Retry:', retryError);
        if (this.isCurrentChaseRun(run)) message.setText(retryError?.message || 'Please try again.');
      }).finally(() => {
        if (this.isCurrentChaseRun(run) && this._chaseRecoveryRoot === root) {
          retrying = false;
          button.setInteractive({ useHandCursor: true });
        }
      });
    });
  }

  async openChaseDestination(key, data = {}) {
    if (this.chaseStarting || this._cleanupDone || this._chaseRun === null) return;
    const run = this._chaseRun;
    this.chaseStarting = true;
    try {
      const opened = await this.goto(key, data);
      if (!this.isCurrentChaseRun(run)) return;
      if (opened === false) throw new Error(`Could not open ${key}.`);
    } catch (error) {
      console.error('[ArrestSelectionScene] Redirect:', error);
      if (!this.isCurrentChaseRun(run)) return;
      this.chaseStarting = false;
      this.showChaseRecovery(error, () => this.openChaseDestination(key, data));
    }
  }

  async resumePursuit(record) {
    if (!record || this.chaseStarting || this._cleanupDone || this._chaseRun === null) return;
    const run = this._chaseRun;
    this.chaseStarting = true;
    try {
      // Repeat preparation and persistence on RETRY, not only on initial scene creation.
      const fresh = currentChase();
      if (!fresh || String(fresh.caseId) !== String(record.caseId) || fresh.campaignId !== record.campaignId ||
        String(fresh.suspectId) !== String(record.suspectId)) {
        throw new Error('The active pursuit changed. Reload the saved game.');
      }
      if (chaseFailureCode(fresh) || fresh.phase === 'settled') {
        throw new Error('This pursuit has ended. Reload the saved result.');
      }
      prepareTheorySubmission(gameState, fresh.suspectId);
      if (!persistChase(structuredClone(fresh))) throw new Error('Could not save the pursuit checkpoint. Check browser storage and try again.');
      if (!this.isCurrentChaseRun(run)) return;
      const opened = await this.goto('ChaseScene', { sourceKey: null, resumeChase: true });
      if (!this.isCurrentChaseRun(run)) return;
      if (opened === false) throw new Error('Could not reopen the saved pursuit.');
    } catch (error) {
      console.error('[ArrestSelectionScene] Resume:', error);
      if (!this.isCurrentChaseRun(run)) return;
      this.chaseStarting = false;
      this.showChaseRecovery(error, () => this.resumePursuit(record));
    }
  }

  preparedChaseKey(suspectId) {
    return JSON.stringify([gameState._createdAt, String(gameState.currentCaseId), String(suspectId)]);
  }

  async confirmSelection() {
    if (this.resultCommitted || this.isLeaving || this.chaseStarting || this.selectedSuspectId == null || this._cleanupDone || this._chaseRun === null) return;
    const run = this._chaseRun;
    this.chaseStarting = true;
    try {
      ensureCaseIdentity(gameState);
      if (!gameState.arrestWarrantIssued) throw new Error('Issue an arrest warrant first.');
      let record = currentChase();
      if (record) {
        if (String(record.suspectId) !== String(this.selectedSuspectId)) throw new Error('The existing pursuit belongs to another suspect. It was not rerolled.');
        if (chaseFailureCode(record) || record.phase === 'settled') throw new Error('This pursuit has already ended. Reload the saved result.');
      } else if (gameState.chaseState != null) throw new Error('The saved pursuit does not match this case. Reload the saved game.');
      // Completeness only: incorrect theory answers remain available to the defence.
      prepareTheorySubmission(gameState, this.selectedSuspectId);
      if (!record) {
        const key = this.preparedChaseKey(this.selectedSuspectId);
        record = this._preparedChases.get(key);
        if (record && !validChase(record, gameState.currentCaseId, gameState._createdAt)) {
          throw new Error('The prepared pursuit is inconsistent. It was not rerolled.');
        }
        if (!record) {
          const seed = (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
          record = makeChase({ caseId: gameState.currentCaseId, campaignId: gameState._createdAt,
            suspectId: this.selectedSuspectId, difficulty: gameState.difficulty, seed, events: CHASE_EVENTS });
          record.slotKey = saveManager.getLastUsedSlot();
          this._preparedChases.set(key, structuredClone(record));
        }
      }
      if (!this.hasScene('ChaseScene')) this.scene.add('ChaseScene', ChaseScene, false);
      if (!persistChase(structuredClone(record))) throw new Error('Could not save the pursuit checkpoint. Check browser storage and try again.');
      if (!this.isCurrentChaseRun(run)) return;
      this.scene.pause();
      this.scene.launch('ChaseScene', { sourceKey: this.sys.settings.key, resumeChase: true });
    } catch (error) {
      console.error('[ArrestSelectionScene] Could not start chase:', error);
      if (!this.isCurrentChaseRun(run)) return;
      if (this.scene.isPaused()) this.scene.resume();
      this.restoreArrestAfterChaseError(error);
    }
  }

  restoreArrestAfterChaseError(error) {
    if (this._cleanupDone || this._chaseRun === null) return;
    this.chaseStarting = false;
    this.selectionLocked = false;
    this.orderStamp?.destroy(); this.orderStamp = null;
    this.enableNavigation(); this.arrestButton?.setInteractive({ useHandCursor: true });
    this.arrestButton?.bg?.setFillStyle(this.arrestButton.fillNormal ?? 0x8f1d14, 1);
    this.arrestButtonText?.setAlpha(1);
    this.currentCard?.polaroidFrame?.setStrokeStyle(2, 0xcfc2a0, 1);
    this.startArrestPulse();
    this.dialogueText?.setText(text('t_2e221730ac43e086d6c9'));
    this.bottomNoteText?.setText(error?.message || text('t_638fda49d09257cb8f8e'));
  }

  completeChase() {
    const record = currentChase();
    if (!record || !['caught', 'review'].includes(record.phase) || this._cleanupDone) return;
    this.chaseStarting = false;
    this.scene.resume();
    void this.resumePursuit(record);
  }
}
