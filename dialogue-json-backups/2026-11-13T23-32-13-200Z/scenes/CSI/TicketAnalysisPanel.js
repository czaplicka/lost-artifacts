import {
  TicketAnalysisPanel as TicketAnalysisPanelBase
} from './TicketAnalysisPanelBase.js';

import {
  getTicketAnalysis,
  getTicketCaseKey
} from '../../managers/TicketAnalysisService.js';

import {
  getCaseClockStatus
} from '../../CaseTimeHelper.js';

import {
  EscapeTimeCallUI
} from '../../ui/EscapeTimeCallUI.js';

import {
  inventoryManager
} from '../../managers/InventoryManager.js';

export class TicketAnalysisPanel extends TicketAnalysisPanelBase {
  constructor(scene) {
    super(scene);

    this.escapeTimeCall = null;
    this.waitingForEvidenceResponse = false;
    this.escapeCallRetryAt = 0;

    this.handleEscapeCallUpdate = () => {
      this.tryOpenEscapeTimeCall();
    };
  }

  create() {
    super.create();

    if (this.destroyed || !this.scene) return;

    this.scene.events.on(
      'update',
      this.handleEscapeCallUpdate
    );
  }

  hasSeenEscapeTimeCall() {
    const state = this.scene?.gameState;

    return Boolean(
      state?.caseData
        ?.escapeTimeCalls
        ?.[String(this.caseKey)]
        ?.seen
    );
  }

  canOpenEscapeTimeCall() {
    const scene = this.scene;
    const state = scene?.gameState;

    if (
      this.destroyed ||
      !scene ||
      !state ||
      this.escapeTimeCall ||
      this.waitingForEvidenceResponse ||
      this.handlingDrop
    ) {
      return false;
    }

    if (
      !scene.sys.isActive() ||
      scene.isExitingLab ||
      scene.currentView !== 'lab_intro' ||
      scene.uiLocked ||
      scene.assistantDialog?.isOpen()
    ) {
      return false;
    }

    if (
      !state.isGameActive ||
      state.caseFailed ||
      state.caseResolved ||
      state.escapePhaseActive !== true
    ) {
      return false;
    }

    if (
      getTicketCaseKey(state) !== this.caseKey ||
      !getTicketAnalysis(state)?.completed ||
      this.hasSeenEscapeTimeCall()
    ) {
      return false;
    }

    const clock = getCaseClockStatus(state);

    return Boolean(
      clock.valid &&
      !clock.totalExpired &&
      clock.remainingSeconds > 0
    );
  }

  tryOpenEscapeTimeCall() {
    const scene = this.scene;

    if (
      !scene ||
      scene.time.now < this.escapeCallRetryAt ||
      !this.canOpenEscapeTimeCall()
    ) {
      return false;
    }

    const call = new EscapeTimeCallUI(scene, {
      state: scene.gameState,
      caseKey: this.caseKey,

      onClose: () => {
        if (this.escapeTimeCall === call) {
          this.escapeTimeCall = null;
        }

        if (
          this.destroyed ||
          !this.scene ||
          scene.isExitingLab ||
          !scene.sys.isActive()
        ) {
          return;
        }

        scene.applyLock(false);

        this.hud?.refreshFromScene?.();
        this.hud?.scene?.bringToTop();
      }
    });

    this.escapeTimeCall = call;

    try {
      scene.applyLock(true);

      if (!call.open()) {
        this.escapeTimeCall = null;

        call.destroy();

        scene.applyLock(false);

        return false;
      }

      scene.scene.bringToTop();

      return true;
    } catch (error) {
      console.error(
        '[TicketAnalysisPanel] Escape call failed.',
        error
      );

      this.escapeTimeCall = null;
      this.escapeCallRetryAt = scene.time.now + 2000;

      call.destroy();

      if (
        !this.destroyed &&
        !scene.isExitingLab
      ) {
        scene.applyLock(false);
      }

      return false;
    }
  }

  showResponse(text) {
    const scene = this.scene;

    if (!scene || this.destroyed) return;

    inventoryManager.close();

    this.waitingForEvidenceResponse = true;

    const opened = scene.assistantDialog.open({
      dialogue: {
        id: 'lab_evidence_handover',
        defaultNodeId: '__evidence_result',

        nodes: {
          __evidence_result: {
            speaker: 'LAB ASSISTANT',
            text,

            choices: [
              {
                text: 'Thanks. I will take it from here.',
                action: 'close'
              }
            ]
          }
        }
      },

      onClose: () => {
        this.waitingForEvidenceResponse = false;

        if (
          this.destroyed ||
          !this.scene ||
          scene.isExitingLab
        ) {
          return;
        }

        scene.applyLock(false);

        if (!this.tryOpenEscapeTimeCall()) {
          this.hud?.scene?.bringToTop();
        }
      }
    });

    if (opened) {
      scene.applyLock(true);
      scene.scene.bringToTop();
    } else {
      this.waitingForEvidenceResponse = false;
    }
  }

  destroy() {
    if (this.destroyed) return;

    this.scene?.events.off(
      'update',
      this.handleEscapeCallUpdate
    );

    const call = this.escapeTimeCall;

    this.escapeTimeCall = null;
    this.waitingForEvidenceResponse = false;

    call?.destroy();

    super.destroy();
  }
}