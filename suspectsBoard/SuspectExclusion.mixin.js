// suspectsBoard/SuspectExclusion.mixin.js

import { saveGameState } from '../GameStatePersistence.js';
import { getEnergyManager } from '../managers/EnergyManager.js';

import {
  manuallyClearSuspect,
  restoreManuallyClearedSuspect
} from '../ui/suspectUtils.js';

const EXCLUSION_SESSION_ENERGY_COST = 10;

function getCaseThiefSuspectId(gameState) {
  return (
    gameState.trueThiefCaseSuspectId ||
    gameState.realThiefSuspectId ||
    null
  );
}

export const SuspectExclusionMixin = {
  getExclusionSessionState() {
    return this.ensureExclusionState();
  },

  /**
   * Jedna opłata za rozpoczętą sesję:
   * od wejścia w Exclude Mode do zatwierdzenia wyników.
   *
   * Zapisane energyPaid chroni przed ponowną opłatą
   * po wyjściu, powrocie albo wczytaniu zapisu.
   */
  payForExclusionSession() {
    const state = this.getExclusionSessionState();

    if (state.finished === true) {
      return false;
    }

    if (state.energyPaid === true) {
      return true;
    }

    const energyManager = getEnergyManager();

    const affordability = energyManager.canAfford(
      EXCLUSION_SESSION_ENERGY_COST
    );

    if (!affordability.ok) {
      this.modeHintText?.setText(
        energyManager.getInsufficientEnergyMessage(
          EXCLUSION_SESSION_ENERGY_COST
        )
      );

      return false;
    }

    const result = energyManager.consumeCustom(
      EXCLUSION_SESSION_ENERGY_COST,
      `Suspect review: -${EXCLUSION_SESSION_ENERGY_COST}`,
      {
        requireFullAmount: true,
        activityType: 'suspect_exclusion'
      }
    );

    if (!result?.success) {
      this.modeHintText?.setText(
        result?.message ||
        'The suspect review could not be started.'
      );

      return false;
    }

    state.energyPaid = true;
    state.energyCost = EXCLUSION_SESSION_ENERGY_COST;
    state.energyPaidAt = Date.now();
    state.sessionStartedAt ??= Date.now();

    saveGameState();

    return true;
  },

  toggleExcludeMode() {
    if (this.exclusionFinished) {
      return;
    }

    if (!this.getCrimeLabCompleted()) {
      this.modeHintText?.setText(
        'COMPLETE THE CRIME LAB FIRST. Preliminary exclusions require forensic evidence.'
      );

      return;
    }

    if (
      !this.excludeMode &&
      !this.payForExclusionSession()
    ) {
      return;
    }

    this.excludeMode = !this.excludeMode;

    if (this.excludeMode) {
      this.filterMode = 'all';
      this.currentPage = 0;
    }

    this.updateExclusionControls();
    this.refreshBoard();
  },

  finishExcluding() {
    if (
      !this.excludeMode ||
      this.exclusionFinished ||
      this._finishExclusionModalOpen
    ) {
      return;
    }

    this.showFinishExclusionConfirm();
  },

  showFinishExclusionConfirm() {
    if (this._finishExclusionModalOpen) {
      return;
    }

    const allSuspects = this.getAllSuspects();

    const activeCount = allSuspects.filter(
      (suspect) =>
        suspect?.deductionState?.eliminated !== true
    ).length;

    const clearedCount = allSuspects.filter(
      (suspect) =>
        suspect?.deductionState?.eliminated === true
    ).length;

    if (activeCount < 2) {
      this.modeHintText?.setText(
        'Keep at least two suspects active for the alibi investigation.'
      );

      return;
    }

    this._finishExclusionModalOpen = true;

    const { width, height } = this.scale;

    const overlay = this.add
      .rectangle(
        0,
        0,
        width,
        height,
        0x000000,
        0.78
      )
      .setOrigin(0, 0)
      .setDepth(1000)
      .setInteractive();

    const panelWidth = Math.min(620, width - 40);
    const panelHeight = 320;

    const panel = this.add
      .rectangle(
        width / 2,
        height / 2,
        panelWidth,
        panelHeight,
        0x211711,
        1
      )
      .setStrokeStyle(3, 0xd4af37, 1)
      .setDepth(1001);

    const title = this.add
      .text(
        width / 2,
        height / 2 - 120,
        'FINISH PRELIMINARY REVIEW?',
        {
          fontFamily: 'PressStart2P',
          fontSize: '14px',
          color: '#ffdc73',
          align: 'center',
          wordWrap: {
            width: panelWidth - 50,
            useAdvancedWrap: true
          }
        }
      )
      .setOrigin(0.5)
      .setDepth(1002);

    const body = this.add
      .text(
        width / 2,
        height / 2 - 40,
        [
          `You manually cleared ${clearedCount} suspect(s).`,
          `${activeCount} file(s) remain for the alibi investigation.`,
          '',
          'You will not be able to change these exclusions after confirming.'
        ].join('\n'),
        {
          fontFamily: 'SpecialElite',
          fontSize: '21px',
          color: '#f5e7c6',
          align: 'center',
          lineSpacing: 8,
          wordWrap: {
            width: panelWidth - 70,
            useAdvancedWrap: true
          }
        }
      )
      .setOrigin(0.5)
      .setDepth(1002);

    const cancelButton = this.createUiButton({
      x: width / 2 - 125,
      y: height / 2 + 105,
      width: 210,
      height: 46,
      label: '[ KEEP REVIEWING ]',
      fontSize: '9px',
      depth: 1002,
      normalFill: 0x3a201b,
      hoverFill: 0x6b3328,
      normalColor: '#f6e7bf',
      hoverColor: '#ffffff'
    });

    const confirmButton = this.createUiButton({
      x: width / 2 + 125,
      y: height / 2 + 105,
      width: 210,
      height: 46,
      label: '[ CONFIRM ]',
      fontSize: '9px',
      depth: 1002,
      normalFill: 0x25422a,
      hoverFill: 0x35633c,
      normalColor: '#d3ffd1',
      hoverColor: '#ffffff'
    });

    let modalClosed = false;

    const closeModal = () => {
      if (modalClosed) {
        return;
      }

      modalClosed = true;
      this._finishExclusionModalOpen = false;

      this.events.off('shutdown', closeModal);

      [
        overlay,
        panel,
        title,
        body,
        cancelButton,
        confirmButton
      ].forEach((item) => {
        item?.removeAllListeners?.();
        item?.destroy?.();
      });
    };

    this.events.once('shutdown', closeModal);

    cancelButton.buttonBackground.on(
      'pointerdown',
      closeModal
    );

    confirmButton.buttonBackground.on(
      'pointerdown',
      () => {
        if (modalClosed) {
          return;
        }

        closeModal();

        const suspects = this.getAllSuspects();

        const remainingSuspects = suspects.filter(
          (suspect) =>
            suspect?.deductionState?.eliminated !== true
        );

        if (remainingSuspects.length < 2) {
          this.modeHintText?.setText(
            'Keep at least two suspects active for the alibi investigation.'
          );

          return;
        }

        this.excludeMode = false;
        this.exclusionFinished = true;

        const state = this.getExclusionSessionState();

        state.finished = true;
        state.finishedAt = Date.now();

        state.manualExclusionIds = suspects
          .filter(
            (suspect) =>
              suspect?.deductionState?.eliminated === true
          )
          .map((suspect) => suspect.id);

        saveGameState();

        this.updateExclusionControls();
        this.refreshBoard();
      }
    );
  },

  updateExclusionControls() {
    if (
      !this.exclusionButton ||
      !this.continueButton
    ) {
      return;
    }

    const crimeLabCompleted =
      this.getCrimeLabCompleted();

    if (this.exclusionFinished) {
      this.exclusionButton.setVisible(false);
      this.continueButton.setVisible(true);

      this.modeHintText?.setText(
        'Preliminary exclusions saved. Alibi contacts for the remaining files are now available in Crime City.'
      );

      return;
    }

    this.continueButton.setVisible(false);
    this.exclusionButton.setVisible(true);

    if (!crimeLabCompleted) {
      this.exclusionButton.buttonText.setText(
        '[ CRIME LAB REQUIRED ]'
      );

      this.exclusionButton.isActive = false;
      this.exclusionButton.applyStyle?.();

      this.setButtonEnabled(
        this.exclusionButton,
        false
      );

      this.modeHintText?.setText(
        'Complete the Crime Lab to unlock preliminary suspect exclusions.'
      );

      return;
    }

    this.setButtonEnabled(
      this.exclusionButton,
      true
    );

    this.exclusionButton.buttonBackground.off(
      'pointerdown'
    );

    if (this.excludeMode) {
      this.exclusionButton.buttonText.setText(
        '[ FINISH EXCLUDING ]'
      );

      this.exclusionButton.isActive = true;
      this.exclusionButton.applyStyle?.();

      this.exclusionButton.buttonBackground.on(
        'pointerdown',
        () => this.finishExcluding()
      );

      this.modeHintText?.setText(
        'EXCLUDE MODE: Click files to clear or restore them. This review session is already paid.'
      );

      return;
    }

    const sessionState =
      this.getExclusionSessionState();

    const alreadyPaid =
      sessionState.energyPaid === true;

    this.exclusionButton.buttonText.setText(
      alreadyPaid
        ? '[ RESUME EXCLUDING ]'
        : '[ EXCLUDE MODE ]'
    );

    this.exclusionButton.isActive = true;
    this.exclusionButton.applyStyle?.();

    this.exclusionButton.buttonBackground.on(
      'pointerdown',
      () => this.toggleExcludeMode()
    );

    this.modeHintText?.setText(
      alreadyPaid
        ? 'Resume your unfinished review. No additional energy cost.'
        : `Starting the suspect review costs ${EXCLUSION_SESSION_ENERGY_COST} energy. Clearing and restoring files is free.`
    );
  },

  getHairEvidenceValue() {
    const hardEvidence =
      this.gameState.currentMission?.forensicHardEvidence ||
      this.gameState.hardEvidence ||
      [];

    const hairEvidence = hardEvidence.find(
      (evidence) =>
        evidence?.field === 'hair_color' ||
        evidence?.forensicField === 'hair_color'
    );

    // Nie traktujemy wyniku innej analizy, np. krwi,
    // jako informacji o kolorze włosów.
    const identityEvidence =
      this.gameState.identityEvidence;

    const identityField =
      identityEvidence?.attribute ||
      identityEvidence?.evidenceType ||
      identityEvidence?.field;

    const rawValue =
      hairEvidence?.value ??
      hairEvidence?.normalizedValue ??
      (
        identityField === 'hair_color'
          ? identityEvidence?.thief_value
          : null
      );

    if (!rawValue) {
      return null;
    }

    return String(rawValue)
      .trim()
      .toLowerCase()
      .replace(/^blond$/, 'blonde');
  },

  getSuspectHairValue(suspect) {
    const hairAttribute =
      suspect?.restrictedProfile
        ?.forensicAttributes?.hair_color;

    const rawValue =
      hairAttribute?.value ??
      hairAttribute ??
      null;

    if (!rawValue) {
      return null;
    }

    return String(rawValue)
      .trim()
      .toLowerCase()
      .replace(/^blond$/, 'blonde');
  },

  getMutableSuspect(suspectId) {
    const suspects =
      Array.isArray(this.gameState.caseSuspects) &&
      this.gameState.caseSuspects.length
        ? this.gameState.caseSuspects
        : Array.isArray(this.gameState.suspects) &&
            this.gameState.suspects.length
          ? this.gameState.suspects
          : Array.isArray(this.gameState.suspectList)
            ? this.gameState.suspectList
            : [];

    this.gameState.caseSuspects = suspects;
    this.gameState.suspects = suspects;
    this.gameState.suspectList = suspects;

    return suspects.find(
      (suspect) => suspect?.id === suspectId
    ) || null;
  },

  getCrimeLabCompleted() {
    const caseKey = this.getCaseKey();

    return Boolean(
      this.gameState.crimeCityProgress?.[caseKey]
        ?.crimeLabCompleted ||
      this.gameState.csiLabCompleted
    );
  },

  toggleSuspectExclusion(
    suspectId,
    {
      playerInitiated = false,
      source = 'unknown'
    } = {}
  ) {
    if (!playerInitiated) {
      console.warn(
        '[SuspectsScene] Blocked automatic suspect exclusion.',
        {
          suspectId,
          source
        }
      );

      return false;
    }

    if (
      !this.excludeMode ||
      this.exclusionFinished ||
      this._finishExclusionModalOpen
    ) {
      return false;
    }

    if (!this.getCrimeLabCompleted()) {
      this.modeHintText?.setText(
        'Complete the Crime Lab before excluding a suspect.'
      );

      return false;
    }

    if (getEnergyManager().isForcedSleepActive()) {
      this.modeHintText?.setText(
        'You are currently asleep. Resume the review after resting.'
      );

      return false;
    }

    const suspect =
      this.getMutableSuspect(suspectId);

    if (!suspect) {
      console.error(
        '[SuspectsScene] Could not find mutable suspect:',
        suspectId
      );

      return false;
    }

    const realThiefCaseSuspectId =
      getCaseThiefSuspectId(this.gameState);

    if (suspect.id === realThiefCaseSuspectId) {
      this.modeHintText?.setText(
        'This file remains inconclusive. The evidence is not enough to clear it.'
      );

      return false;
    }

    const isCurrentlyCleared =
      suspect.deductionState?.eliminated === true;

    const result = isCurrentlyCleared
      ? restoreManuallyClearedSuspect(suspect.id)
      : manuallyClearSuspect(suspect.id, {
          source,
          label: 'Preliminary forensic exclusion',
          note:
            'Manually cleared during the initial laboratory review.',
          type: 'manual_forensic_review'
        });

    if (!result?.success) {
      this.modeHintText?.setText(
        result?.message ||
        'This file cannot be cleared yet.'
      );

      return false;
    }

    this.gameState.selectedSuspectId = suspect.id;

    const state = this.getExclusionSessionState();

    const manualExclusionIds = new Set(
      state.manualExclusionIds || []
    );

    if (isCurrentlyCleared) {
      manualExclusionIds.delete(suspect.id);
    } else {
      manualExclusionIds.add(suspect.id);
    }

    state.manualExclusionIds = [
      ...manualExclusionIds
    ];

    state.updatedAt = Date.now();

    console.info(
      '[SuspectsScene] Manual suspect exclusion changed.',
      {
        suspectId: suspect.id,
        suspectName: suspect.name,
        eliminated: !isCurrentlyCleared,
        source
      }
    );

    saveGameState();
    this.refreshBoard();

    return true;
  },

  /**
   * Osobny Evidence Grid pozostaje dostępny.
   * Używamy loadera zamiast wymagać wcześniejszej rejestracji.
   */
  async openEvidenceGrid() {
    if (
      this._openingEvidenceGrid ||
      this._cleanupDone ||
      !this.sys.isActive()
    ) {
      return false;
    }

    if (!this.exclusionFinished) {
      this.modeHintText?.setText(
        'Finish and confirm the preliminary exclusions first.'
      );

      return false;
    }

    const remainingSuspects =
      this.getAllSuspects().filter(
        (suspect) =>
          suspect?.deductionState?.eliminated !== true
      );

    if (remainingSuspects.length < 2) {
      this.modeHintText?.setText(
        'Keep at least two suspects active before opening the Evidence Grid.'
      );

      return false;
    }

    this._openingEvidenceGrid = true;

    try {
      const loader = this.game.sceneLoader;

      // Najpierw upewniamy się, że moduł istnieje.
      // Jeśli import zawiedzie, nie opuszczamy obecnej planszy.
      if (loader) {
        await loader.ensure('SuspectGridScene');
      } else if (!this.hasScene('SuspectGridScene')) {
        throw new Error(
          'SuspectGridScene is not registered and SceneLoader is unavailable.'
        );
      }

      if (
        this._cleanupDone ||
        !this.sys.isActive()
      ) {
        return false;
      }

      const suspectIds = remainingSuspects.map(
        (suspect) => suspect.id
      );

      this.gameState.suspectGridInput = {
        cityId: this.cityId,
        suspectIds,
        startedAt: Date.now()
      };

      saveGameState();

      const moved = await this.goto(
        'SuspectGridScene',
        {
          cityId: this.cityId,
          gameState: this.gameState,
          suspectIds,
          returnScene: this.scene.key,
          returnData: {
            cityId: this.cityId,
            returnScene: this.returnScene,
            returnData: {
              ...this.returnData
            }
          }
        }
      );

      if (!moved && !this._cleanupDone) {
        this.modeHintText?.setText(
          'The Evidence Grid could not be opened. Your exclusions are still saved.'
        );
      }

      return Boolean(moved);
    } catch (error) {
      console.error(
        '[SuspectsScene] Could not open Evidence Grid:',
        error
      );

      if (!this._cleanupDone) {
        this.modeHintText?.setText(
          'The Evidence Grid could not be loaded. Your exclusions are still saved.'
        );
      }

      return false;
    } finally {
      this._openingEvidenceGrid = false;
    }
  }
};