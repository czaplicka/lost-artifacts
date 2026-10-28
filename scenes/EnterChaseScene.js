import { EnterScene as OriginalEnterScene } from './EnterScene.js';
import { gameState } from '../GameData.js';
import {
  currentChase, restoreLocalChaseCheckpoint, terminalData,
  latestLocalChaseCheckpoint, restoreExplicitChaseCheckpoint
} from '../systems/chasePersistence.js';
import { validCourt, courtResumeTarget } from '../systems/courtLogic.js';

const sameId = (a, b) => a != null && b != null && String(a) === String(b);

export class EnterScene extends OriginalEnterScene {
  async create() {
    await super.create();
    if (!this.isCurrentRun()) return;
    this.chaseLoadSource = null;
    const checkpoint = latestLocalChaseCheckpoint();
    if (!checkpoint) return;
    const containsCourt = validCourt(checkpoint.data?.courtState, checkpoint.data);
    const button = this.add.text(
      this.scale.width * 0.65,
      this.scale.height * 0.82,
      containsCourt ? 'RESUME LOCAL TRIAL' : 'RESUME LOCAL PURSUIT',
      {
        fontFamily: 'SpecialElite', fontSize: '28px', color: '#ffe2a3',
        backgroundColor: '#322414', padding: { x: 22, y: 18 }, align: 'center'
      }
    ).setOrigin(0.5).setDepth(200).setInteractive({ useHandCursor: true });
    this.entryButtons.push(button);
    button.on('pointerdown', async () => {
      if (!this.canUseEntry()) return;
      this.isEnteringGame = true;
      this.updateEntryButtons();
      try {
        if (!restoreExplicitChaseCheckpoint(checkpoint)) {
          throw new Error('Invalid pursuit or trial checkpoint.');
        }
        this.chaseLoadSource = 'checkpoint';
        const opened = await this.goto('OfficeScene', {
          fromSave: true,
          saveSlotKey: checkpoint.data.chaseState?.slotKey,
          authMode: this.currentUser ? 'account' : 'guest',
          playerId: this.currentUser?.id ?? null
        });
        if (!opened && this.isCurrentRun()) throw new Error('Could not resume pursuit or trial.');
      } catch (error) {
        if (!this.isCurrentRun()) return;
        console.error('[EnterScene] Checkpoint resume failed:', error);
        this.isEnteringGame = false;
        this.updateEntryButtons();
        this._showNotice('Unable to resume pursuit or trial. Your checkpoint has not been deleted.');
      }
    });
  }

  async loadSelectedSlot(slotKey, authMode, source, root) {
    this.chaseLoadSource = source;
    return super.loadSelectedSlot(slotKey, authMode, source, root);
  }

  getCourtResumeTarget() {
    const record = gameState.courtState;
    return validCourt(record, gameState) ? courtResumeTarget(record) : null;
  }

  hasCourtForCurrentCase() {
    const record = gameState.courtState;
    return Boolean(record && sameId(record.caseId, gameState.currentCaseId) &&
      record.campaignId === gameState._createdAt);
  }

  async goto(key, data = {}) {
    if (!data.fromSave) return super.goto(key, data);
    let courtTarget = this.getCourtResumeTarget();
    if (courtTarget) {
      return super.goto(courtTarget.key, { ...data, ...courtTarget.data });
    }
    if (this.hasCourtForCurrentCase()) {
      throw new Error('The saved trial is inconsistent. It has not been restarted or overwritten.');
    }
    if (this.chaseLoadSource === 'local') restoreLocalChaseCheckpoint(data.saveSlotKey);
    courtTarget = this.getCourtResumeTarget();
    if (courtTarget) {
      return super.goto(courtTarget.key, { ...data, ...courtTarget.data });
    }
    if (this.hasCourtForCurrentCase()) {
      throw new Error('The checkpoint contains an inconsistent trial. Your checkpoint has not been deleted.');
    }
    const record = currentChase();
    if (!record) return super.goto(key, data);
    if (record.phase === 'escaped' || record.terminalScene === 'GameOverScene') {
      return super.goto('GameOverScene', { ...data, ...terminalData(record) });
    }
    if (record.terminalScene === 'CourtScene') {
      return super.goto('CourtScene', {
        ...data, caseId: record.caseId, suspectId: record.suspectId
      });
    }
    if (record.phase === 'settled' && record.terminalScene) {
      return super.goto(record.terminalScene, {
        ...data, caseId: record.caseId, suspectId: record.suspectId
      });
    }
    return super.goto('ChaseScene', {
      ...data,
      caseId: record.caseId,
      suspectId: record.suspectId,
      sourceKey: null,
      resumeChase: true
    });
  }
}
