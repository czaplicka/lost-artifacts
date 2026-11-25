import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { EventBus } from '../EventBus.js';
import {
  requestAutosave,
  saveGameStateResult,
  getPersistenceStatus
} from '../gameStatePersistence.js';
import {
  applyGridExclusions,
  getCaseKey
} from './applyGridExclusions.js';
import { RULED_OUT_EVERYONE_REASON } from './gridConstants.js';
import { formatCellValue } from './gridHelpers.js';
import { advanceCrimeTutorial } from '../tutorials/CrimeCityTutorial.js';
import { playPuzzleSfx } from '../scenes/archive/PuzzleSfx.js';
import { playDocumentSfx } from '../scenes/archive/DocumentSfx.js';

const t = id => __dialogueText(
  'suspectsBoard/GridLogic.mixin.js',
  id
);

const SNAPSHOT_FIELDS = [
  'caseForensics',
  'caseSuspects',
  'suspects',
  'suspectList',
  'excludedSuspects',
  'suspectExclusionState',
  'alibiInvestigation',
  'caseFailed',
  'caseResolved',
  'isGameActive',
  'gameOverReason'
];

const PAUSED_SAVE_MESSAGE =
  'Saving is paused. Changes are only in memory and will be lost if you reload.';

let restoredGeneration = 0;

EventBus.on('gameState:restored', () => {
  restoredGeneration += 1;
});

function cloneGridData(value) {
  if (typeof globalThis.structuredClone === 'function') {
    try {
      return globalThis.structuredClone(value);
    } catch {
      // Proxied plain data can fail native structuredClone.
    }
  }

  const seen = new WeakMap();

  function copy(item) {
    if (item === null || typeof item !== 'object') {
      if (
        typeof item === 'function' ||
        typeof item === 'symbol'
      ) {
        throw new TypeError(
          'Grid snapshot contains an unsupported value.'
        );
      }

      return item;
    }

    if (seen.has(item)) {
      return seen.get(item);
    }

    if (item instanceof Date) {
      const result = new Date(item.getTime());
      seen.set(item, result);
      return result;
    }

    if (item instanceof Set) {
      const result = new Set();
      seen.set(item, result);

      for (const entry of item) {
        result.add(copy(entry));
      }

      return result;
    }

    if (item instanceof Map) {
      const result = new Map();
      seen.set(item, result);

      for (const [key, entry] of item) {
        result.set(copy(key), copy(entry));
      }

      return result;
    }

    const prototype = Object.getPrototypeOf(item);

    if (
      !Array.isArray(item) &&
      prototype !== Object.prototype &&
      prototype !== null
    ) {
      throw new TypeError(
        'Grid snapshot contains an unsupported object.'
      );
    }

    const result = Array.isArray(item)
      ? new Array(item.length)
      : Object.create(prototype);

    seen.set(item, result);

    for (const key of Object.keys(item)) {
      Object.defineProperty(result, key, {
        value: copy(item[key]),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }

    return result;
  }

  return copy(value);
}

function ensureSafetyContext(scene) {
  const state = scene.gameState;

  const key = JSON.stringify([
    restoredGeneration,
    state._createdAt,
    state.currentCaseId ?? getCaseKey(state, scene.cityId),
    scene.cityId
  ]);

  if (scene._gridSafetyContext === key) return;

  scene._gridSafetyContext = key;
  scene._gridCommitting = false;
  scene._gridRecoveryRequired = false;
  scene._gridLastSavePaused = false;

  scene._gridTerminalPending =
    state.caseFailed === true &&
    state.gameOverReason === RULED_OUT_EVERYONE_REASON &&
    scene.labManager.ensureCaseForensics()
      .suspectGrid?.ruledOutEveryone === true;
}

function canEdit(scene) {
  ensureSafetyContext(scene);

  return (
    !scene.gridLeaving &&
    !scene.modalOpen &&
    !scene._gridCommitting &&
    !scene._gridRecoveryRequired &&
    !scene._gridTerminalPending &&
    !scene._cleanupDone
  );
}

function checkPersistenceReady() {
  const status = getPersistenceStatus();

  if (status.rollbackUnsafe) {
    throw new Error(
      'Save recovery was incomplete. Reload a known-good save before continuing.'
    );
  }

  if (status.busy) {
    throw new Error(
      'Saving or loading is in progress. Please try again.'
    );
  }
}

function persistGridState(scene) {
  const result = saveGameStateResult();

  if (result.status === 'saved') {
    scene._gridLastSavePaused = false;
    return result;
  }

  if (
    result.status === 'paused' &&
    result.reason === 'autosave_protected'
  ) {
    scene._gridLastSavePaused = true;
    return result;
  }

  scene._gridLastSavePaused = false;

  const messages = {
    unsafe:
      'Save recovery was incomplete. Reload a known-good save before continuing.',
    busy:
      'Saving or loading is in progress. Please try again.',
    error:
      'The grid could not be saved. Check browser storage and try again.'
  };

  throw new Error(
    messages[result.status] ||
    'The grid could not be saved.'
  );
}

function showPausedSaveNotice(scene) {
  if (!scene._gridLastSavePaused) return;

  const current = scene.feedbackMessage || '';

  if (!current.includes(PAUSED_SAVE_MESSAGE)) {
    scene.setFeedback(
      current
        ? `${current} ${PAUSED_SAVE_MESSAGE}`
        : PAUSED_SAVE_MESSAGE
    );
  }
}

function playGridAction(scene, name) {
  if (!scene.gridStarted || !canEdit(scene)) return;

  try {
    if (name === 'paper') {
      playPuzzleSfx(scene, 'paper', 0.25);
    } else {
      playDocumentSfx(scene, 'click', 0.15);
    }
  } catch (error) {
    console.debug(
      '[SuspectGridScene] Action audio unavailable:',
      error
    );
  }
}

function commitGridState(scene, change) {
  ensureSafetyContext(scene);

  if (
    scene._gridCommitting ||
    scene._gridRecoveryRequired ||
    scene._cleanupDone
  ) {
    return false;
  }

  let snapshot;

  try {
    checkPersistenceReady();

    snapshot = cloneGridData(
      Object.fromEntries(
        SNAPSHOT_FIELDS.map(key => [
          key,
          scene.gameState[key]
        ])
      )
    );
  } catch (error) {
    console.error(
      '[SuspectGridScene] Could not prepare commit:',
      error
    );

    scene.setFeedback(
      error.message ||
      'The grid could not be prepared. Reopen it and try again.'
    );

    return false;
  }

  scene._gridCommitting = true;

  try {
    change();
    persistGridState(scene);
    return true;
  } catch (error) {
    console.error(
      '[SuspectGridScene] Commit failed:',
      error
    );

    const rollbackErrors = [];

    for (const key of SNAPSHOT_FIELDS) {
      try {
        scene.gameState[key] = snapshot[key];
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }

    try {
      if (Array.isArray(scene.gameState.caseSuspects)) {
        scene.suspects = scene.suspects.map(
          suspect => scene.gameState.caseSuspects.find(
            item => item.id === suspect.id
          ) || suspect
        );
      }
    } catch (rollbackError) {
      rollbackErrors.push(rollbackError);
    }

    scene._gridRecoveryRequired =
      rollbackErrors.length > 0;

    scene.setFeedback(
      scene._gridRecoveryRequired
        ? 'Grid recovery was incomplete. Reload a known-good save before continuing.'
        : 'The shortlist could not be confirmed or saved. Your marks are still available. Please try again.'
    );

    if (rollbackErrors.length) {
      console.error(
        '[SuspectGridScene] Recovery failed:',
        rollbackErrors
      );
    }

    return false;
  } finally {
    scene._gridCommitting = false;
  }
}

function navigationAttempt(scene) {
  const token = Symbol('grid-navigation');

  scene._gridNavigationAttempt = token;

  const shutdown = () => {
    if (scene._gridNavigationAttempt === token) {
      scene._gridNavigationAttempt = null;
    }
  };

  scene.events.once(
    Phaser.Scenes.Events.SHUTDOWN,
    shutdown
  );

  return {
    current: () => (
      !scene._cleanupDone &&
      scene._gridNavigationAttempt === token
    ),

    release: () => {
      scene.events.off(
        Phaser.Scenes.Events.SHUTDOWN,
        shutdown
      );

      if (scene._gridNavigationAttempt === token) {
        scene._gridNavigationAttempt = null;
      }
    }
  };
}

function selectionSignature(scene) {
  return JSON.stringify(
    scene.suspects.map(suspect => [
      suspect.id,
      Boolean(
        scene.markedUnlikelyBySuspectId[suspect.id]
      )
    ])
  );
}

function confirmationIsCurrent(scene, context, selection) {
  ensureSafetyContext(scene);

  if (!canEdit(scene)) return false;

  if (
    scene._gridSafetyContext !== context ||
    selectionSignature(scene) !== selection
  ) {
    scene.setFeedback(
      'The case or your marks changed. Review the grid and confirm again.'
    );

    return false;
  }

  return true;
}

export const GridLogicMixin = {
  getPlacedClueIds() {
    return new Set(
      Object.values(this.placedCluesByCell)
    );
  },

  getUnplacedClues() {
    const placed = this.getPlacedClueIds();

    return this.clueCards.filter(
      clue => !placed.has(clue.id)
    );
  },

  getCellKey(target) {
    return `${
      target.type === 'crime_scene'
        ? 'crime_scene'
        : target.suspectId
    }:${target.field}`;
  },

  isTargetForClue(clue, target) {
    if (!clue) return false;

    if (clue.type === 'crime_scene_fact') {
      return (
        target.type === 'crime_scene' &&
        target.field === clue.field
      );
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
    if (!canEdit(this)) return;

    const before = this.selectedClueId;

    this.selectedClueId =
      this.selectedClueId === clueId
        ? null
        : clueId;

    this.setFeedback(
      this.selectedClueId
        ? t('t_7ef159f58cbf5ae3b054')
        : ''
    );

    this.refreshAll();

    if (this.selectedClueId !== before) {
      playGridAction(this, 'click');
    }
  },

  onCellClick(target, placedClue) {
    if (!canEdit(this)) return;

    if (placedClue && !this.selectedClueId) {
      this.removePlacedClue(target, placedClue);
      return;
    }

    this.placeSelectedClue(target);
  },

  removePlacedClue(target, clue) {
    if (!canEdit(this)) return;

    const key = this.getCellKey(target);

    const changed = Object.prototype.hasOwnProperty.call(
      this.placedCluesByCell,
      key
    );

    delete this.placedCluesByCell[key];

    this.saveGridProgress();

    this.setFeedback(
      `${clue.label}${t('t_e883dc0c124ecc44d9f3')}`
    );

    this.refreshAll();

    if (changed) {
      playGridAction(this, 'paper');
    }
  },

  placeSelectedClue(target) {
    if (!canEdit(this)) return;

    const clue = this.clueCards.find(
      item => item.id === this.selectedClueId
    );

    if (!clue) {
      this.setFeedback(t('t_926799f0f634d72f08c1'));
      return;
    }

    if (!this.isTargetForClue(clue, target)) {
      this.setFeedback(t('t_b4779080efd5d07bd7a2'));
      return;
    }

    const key = this.getCellKey(target);

    if (this.placedCluesByCell[key]) {
      this.setFeedback(t('t_1268013213e0749fb537'));
      return;
    }

    this.placedCluesByCell[key] = clue.id;
    this.selectedClueId = null;

    this.saveGridProgress();

    this.setFeedback(
      `${clue.label}` +
      `${t('t_45822f54a0d0e030f756')}` +
      `${formatCellValue(clue.value)}` +
      `${t('t_1d09c4f33391fa4eba81')}`
    );

    this.refreshAll();
    playGridAction(this, 'paper');
  },

  toggleSuspectMark(suspectId) {
    if (!canEdit(this)) return;

    this.markedUnlikelyBySuspectId[suspectId] =
      !this.markedUnlikelyBySuspectId[suspectId];

    this.saveGridProgress();
    this.refreshAll();
    playGridAction(this, 'click');
  },

  saveGridProgress() {
    ensureSafetyContext(this);

    if (
      this._gridRecoveryRequired ||
      this._gridTerminalPending ||
      this._cleanupDone
    ) {
      return false;
    }

    const forensics =
      this.labManager.ensureCaseForensics();

    forensics.suspectGrid ??= {};

    forensics.suspectGrid.placedCluesByCell = {
      ...this.placedCluesByCell
    };

    forensics.suspectGrid.markedUnlikelyBySuspectId = {
      ...this.markedUnlikelyBySuspectId
    };

    delete forensics.suspectGrid.eliminatedSuspectIds;

    requestAutosave();
    return true;
  },

  getGridRemainingSuspects() {
    return this.suspects.filter(
      suspect => !this.markedUnlikelyBySuspectId[suspect.id]
    );
  },

  isGridShortlistSubmitted() {
    ensureSafetyContext(this);

    const grid =
      this.labManager.ensureCaseForensics().suspectGrid;

    if (
      !grid?.completed ||
      grid.ruledOutEveryone ||
      this._gridRecoveryRequired
    ) {
      return false;
    }

    const caseKey = getCaseKey(
      this.gameState,
      this.cityId
    );

    if (
      this.gameState.suspectExclusionState
        ?.[caseKey]?.finished !== true
    ) {
      return false;
    }

    const submitted = grid.alibiCandidateSuspectIds;

    const current = this.getGridRemainingSuspects().map(
      suspect => suspect.id
    );

    if (
      !Array.isArray(submitted) ||
      !current.length ||
      submitted.length !== current.length
    ) {
      return false;
    }

    const ids = new Set(submitted);

    return (
      ids.size === current.length &&
      current.every(id => ids.has(id))
    );
  },

  confirmGridShortlist({ leaveAfter = false } = {}) {
    if (!canEdit(this)) return false;

    const remaining = this.getGridRemainingSuspects();

    if (!remaining.length) return false;

    const context = this._gridSafetyContext;
    const selection = selectionSignature(this);

    this.showConfirmModal({
      title: 'CONFIRM SHORTLIST',
      message:
        `Keep ${remaining.length} suspects and permanently exclude everyone marked UNLIKELY?\n\n` +
        'These exclusions cannot be undone. Check your marks before confirming.',
      yesLabel: leaveAfter
        ? 'CONFIRM & RETURN'
        : 'CONFIRM',
      noLabel: 'KEEP EDITING',

      onYes: () => {
        if (
          !confirmationIsCurrent(
            this,
            context,
            selection
          )
        ) {
          return;
        }

        const currentRemaining =
          this.getGridRemainingSuspects();

        if (!this.commitGrid(currentRemaining)) {
          return;
        }

        this.refreshAll();
        this.crimeTutorial?.syncGridStep(true);
        showPausedSaveNotice(this);

        if (leaveAfter) {
          void this.closeScene({ skipCommit: true });
        }
      }
    });

    return false;
  },

  finalizeGrid() {
    ensureSafetyContext(this);

    if (
      this.gridLeaving ||
      this.modalOpen ||
      this._gridCommitting ||
      this._gridRecoveryRequired ||
      this._cleanupDone
    ) {
      return false;
    }

    if (this._gridTerminalPending) {
      return this.failCaseRuledOutEveryone();
    }

    const remaining = this.getGridRemainingSuspects();

    if (!remaining.length) {
      const context = this._gridSafetyContext;
      const selection = selectionSignature(this);

      this.showConfirmModal({
        title: t('t_f91261fca31563851921'),
        message: t('t_a8cda391d19344841dc4'),
        yesLabel: t('t_c4063ca8c142ba1daedc'),
        noLabel: t('t_44674bc70455e9bd676e'),

        onYes: () => {
          if (
            !confirmationIsCurrent(
              this,
              context,
              selection
            )
          ) {
            return;
          }

          void this.failCaseRuledOutEveryone();
        }
      });

      return false;
    }

    if (!this.isGridShortlistSubmitted()) {
      return this.confirmGridShortlist();
    }

    try {
      checkPersistenceReady();
      persistGridState(this);
    } catch (error) {
      this.setFeedback(error.message);
      return false;
    }

    this.refreshAll();
    this.crimeTutorial?.syncGridStep(true);
    showPausedSaveNotice(this);

    return true;
  },

  async failCaseRuledOutEveryone() {
    ensureSafetyContext(this);

    if (
      this.gridLeaving ||
      this.modalOpen ||
      this._gridCommitting ||
      this._gridRecoveryRequired ||
      this._cleanupDone
    ) {
      return false;
    }

    if (!this._gridTerminalPending) {
      const committed = commitGridState(this, () => {
        const forensics =
          this.labManager.ensureCaseForensics();

        forensics.suspectGrid ??= {};

        Object.assign(forensics.suspectGrid, {
          completed: true,
          completedAt: Date.now(),
          ruledOutEveryone: true,
          alibiCandidateSuspectIds: []
        });

        delete forensics.suspectGrid.remainingSuspectIds;
        delete forensics.suspectGrid.eliminatedSuspectIds;

        Object.assign(this.gameState, {
          caseFailed: true,
          caseResolved: false,
          isGameActive: false,
          gameOverReason: RULED_OUT_EVERYONE_REASON
        });
      });

      if (!committed) return false;

      this._gridTerminalPending = true;
    }

    this.gridLeaving = true;

    const attempt = navigationAttempt(this);

    try {
      const opened = await this.goto('GameOverScene', {
        title: t('t_3f04ff73607035edc1b8'),
        message: RULED_OUT_EVERYONE_REASON
      });

      if (!attempt.current()) {
        return Boolean(opened);
      }

      if (opened === false) {
        throw new Error(
          'GameOverScene could not be opened.'
        );
      }

      return true;
    } catch (error) {
      if (!attempt.current()) return false;

      this.gridLeaving = false;

      this.setFeedback(
        'The result screen could not be opened. Press FINISH again to retry.'
      );

      showPausedSaveNotice(this);

      console.error(
        '[SuspectGridScene] Result failed:',
        error
      );

      return false;
    } finally {
      attempt.release();
    }
  },

  commitGrid(remainingSuspects) {
    ensureSafetyContext(this);

    if (
      this._gridTerminalPending ||
      this.gridLeaving ||
      this.modalOpen ||
      this._cleanupDone
    ) {
      return false;
    }

    const actualIds = this.getGridRemainingSuspects().map(
      suspect => suspect.id
    );

    const requestedIds = Array.isArray(remainingSuspects)
      ? remainingSuspects.map(suspect => suspect.id)
      : [];

    const requestedSet = new Set(requestedIds);

    if (
      !actualIds.length ||
      requestedIds.length !== actualIds.length ||
      requestedSet.size !== actualIds.length ||
      !actualIds.every(id => requestedSet.has(id))
    ) {
      this.setFeedback(
        'The shortlist changed. Review the grid and confirm again.'
      );

      return false;
    }

    const committed = commitGridState(this, () => {
      if (!this.saveGridProgress()) {
        throw new Error(
          'The grid progress could not be prepared.'
        );
      }

      const forensics =
        this.labManager.ensureCaseForensics();

      applyGridExclusions({
        gameState: this.gameState,
        cityId: this.cityId,
        suspectIds: this.suspects.map(
          suspect => suspect.id
        ),
        unlikelyById: this.markedUnlikelyBySuspectId
      });

      Object.assign(forensics.suspectGrid, {
        completed: true,
        completedAt: Date.now(),
        ruledOutEveryone: false,
        alibiCandidateSuspectIds: [...actualIds]
      });

      delete forensics.suspectGrid.remainingSuspectIds;
      delete forensics.suspectGrid.eliminatedSuspectIds;

      const caseKey = getCaseKey(
        this.gameState,
        this.cityId
      );

      this.gameState.alibiInvestigation = {
        cityId: this.cityId,
        caseKey,
        suspectIds: [...actualIds],
        unlocked: true
      };
    });

    if (committed) {
      this.setFeedback(
        `${actualIds.length}${t('t_0545f3b240f4f6c416f9')}`
      );

      showPausedSaveNotice(this);
    }

    return committed;
  },

  async closeScene({ skipCommit = false } = {}) {
    ensureSafetyContext(this);

    if (
      this.gridLeaving ||
      this.modalOpen ||
      this._gridCommitting ||
      this._gridRecoveryRequired ||
      this._cleanupDone
    ) {
      return false;
    }

    if (this._gridTerminalPending) {
      return this.failCaseRuledOutEveryone();
    }

    const remaining = this.getGridRemainingSuspects();
    const tutorial = this.gameState.onboarding?.crimeCity;

    const guided =
      tutorial &&
      !tutorial.completed &&
      tutorial.step === 'suspect_grid';

    if (
      !skipCommit &&
      [2, 3].includes(remaining.length) &&
      !this.isGridShortlistSubmitted()
    ) {
      if (guided) {
        this.syncReturnHighlight?.();
        this.setFeedback(t('t_c32f0cb05a3b89cf187c'));
        return false;
      }

      return this.confirmGridShortlist({
        leaveAfter: true
      });
    }

    const submitted = this.isGridShortlistSubmitted();

    let tutorialSnapshot;

    try {
      checkPersistenceReady();

      tutorialSnapshot = tutorial
        ? cloneGridData(tutorial)
        : null;
    } catch (error) {
      this.setFeedback(
        error.message ||
        'The grid could not be prepared for returning.'
      );

      return false;
    }

    this.gridLeaving = true;

    const attempt = navigationAttempt(this);

    try {
      if (
        submitted &&
        tutorial &&
        !tutorial.completed &&
        ['hypothesis', 'suspects', 'suspect_grid']
          .includes(tutorial.step)
      ) {
        for (const step of [
          'hypothesis',
          'suspects',
          'suspect_grid'
        ]) {
          advanceCrimeTutorial(this.gameState, step);
        }
      }

      persistGridState(this);
      showPausedSaveNotice(this);

      this.clearReturnHighlight?.();
      this.crimeTutorial?.clearHighlight();

      // goto handles registered and lazy-loaded scenes.
      if (
        this.returnScene &&
        this.returnScene !== this.scene.key
      ) {
        const opened = await this.goto(
          this.returnScene,
          {
            ...this.returnData,
            cityId: this.cityId,
            evidenceGridClosed: true
          }
        );

        if (!attempt.current()) {
          return Boolean(opened);
        }

        if (opened === false) {
          throw new Error(
            'Return scene could not be opened.'
          );
        }
      } else {
        this.scene.stop();
      }

      return true;
    } catch (error) {
      if (!attempt.current()) return false;

      const rollbackErrors = [];

      try {
        if (
          tutorialSnapshot &&
          this.gameState.onboarding
        ) {
          this.gameState.onboarding.crimeCity =
            tutorialSnapshot;
        }
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }

      this.gridLeaving = false;

      if (rollbackErrors.length) {
        this._gridRecoveryRequired = true;

        this.setFeedback(
          'Grid recovery was incomplete. Reload a known-good save before continuing.'
        );

        console.error(
          '[SuspectGridScene] Tutorial recovery failed:',
          rollbackErrors
        );
      } else {
        requestAutosave();

        try {
          this.startCrimeTutorial?.();
          this.syncReturnHighlight?.();
        } catch (uiError) {
          console.error(
            '[SuspectGridScene] Tutorial UI recovery failed:',
            uiError
          );
        }

        this.setFeedback(
          error.message ||
          t('t_a5d459c5fc757ceac3bb')
        );

        showPausedSaveNotice(this);
      }

      console.error(
        '[SuspectGridScene] Return failed:',
        error
      );

      return false;
    } finally {
      attempt.release();
    }
  }
};
