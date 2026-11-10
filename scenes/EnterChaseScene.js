import { EnterScene as OriginalEnterScene } from './EnterScene.js';
import { gameState } from '../GameData.js';
import {
  currentChase,
  restoreLocalChaseCheckpoint,
  terminalData
} from '../systems/chasePersistence.js';
import { courtResumeTarget } from '../systems/courtLogic.js';
import { validCourt } from '../systems/courtRapport.js';

const sameId = (a, b) =>
  a != null && b != null && String(a) === String(b);

export class EnterScene extends OriginalEnterScene {
  async create() {
    this.chaseLoadSource = null;
    await super.create();
  }

  async loadSelectedSlot(slotKey, authMode, source, root) {
    this.chaseLoadSource = source;

    return super.loadSelectedSlot(
      slotKey,
      authMode,
      source,
      root
    );
  }

  getCourtResumeTarget() {
    const record = gameState.courtState;

    return validCourt(record, gameState)
      ? courtResumeTarget(record)
      : null;
  }

  hasCourtForCurrentCase() {
    const record = gameState.courtState;

    return Boolean(
      record &&
      sameId(record.caseId, gameState.currentCaseId) &&
      record.campaignId === gameState._createdAt
    );
  }

  async goto(key, data = {}) {
    if (!data.fromSave) {
      return super.goto(key, data);
    }

    let courtTarget = this.getCourtResumeTarget();

    if (courtTarget) {
      return super.goto(courtTarget.key, {
        ...data,
        ...courtTarget.data
      });
    }

    if (this.hasCourtForCurrentCase()) {
      throw new Error(
        'The saved trial is inconsistent. It has not been restarted or overwritten.'
      );
    }

    if (this.chaseLoadSource === 'local') {
      restoreLocalChaseCheckpoint(data.saveSlotKey);
    }

    courtTarget = this.getCourtResumeTarget();

    if (courtTarget) {
      return super.goto(courtTarget.key, {
        ...data,
        ...courtTarget.data
      });
    }

    if (this.hasCourtForCurrentCase()) {
      throw new Error(
        'The checkpoint contains an inconsistent trial. Your checkpoint has not been deleted.'
      );
    }

    const record = currentChase();

    if (!record) {
      return super.goto(key, data);
    }

    if (
      record.phase === 'escaped' ||
      record.terminalScene === 'GameOverScene'
    ) {
      return super.goto('GameOverScene', {
        ...data,
        ...terminalData(record)
      });
    }

    if (record.terminalScene === 'CourtScene') {
      return super.goto('CourtScene', {
        ...data,
        caseId: record.caseId,
        suspectId: record.suspectId
      });
    }

    if (record.phase === 'settled' && record.terminalScene) {
      return super.goto(record.terminalScene, {
        ...data,
        caseId: record.caseId,
        suspectId: record.suspectId
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