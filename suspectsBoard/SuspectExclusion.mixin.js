// Handles Exclude Mode: toggling, confirmation modal, per-suspect elimination
// state, forensic hair-evidence lookups, and the hand-off to the Evidence Grid.

import { saveGameState } from '../../GameStatePersistence.js';

export const SuspectExclusionMixin = {
  toggleExcludeMode() {
    if (this.exclusionFinished) return;

    this.excludeMode = !this.excludeMode;

    if (this.excludeMode) {
      this.filterMode = 'all';
      this.currentPage = 0;
    }

    this.updateExclusionControls();
    this.refreshBoard();
  },

  finishExcluding() {
    this.showFinishExclusionConfirm();
  },

  showFinishExclusionConfirm() {
    const { width, height } = this.scale;

    const activeCount = this.getAllSuspects().filter(
      (suspect) => !suspect.deductionState?.eliminated
    ).length;

    const clearedCount = this.getAllSuspects().filter(
      (suspect) => suspect.deductionState?.eliminated
    ).length;

    const overlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.78)
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
        `You cleared ${clearedCount} suspect(s).\n${activeCount} file(s) will move to the Evidence Grid.\n\nYou will not be able to change these exclusions after continuing.`,
        {
          fontFamily: 'Special Elite',
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
      label: '[ CONTINUE ]',
      fontSize: '9px',
      depth: 1002,
      normalFill: 0x25422a,
      hoverFill: 0x35633c,
      normalColor: '#d3ffd1',
      hoverColor: '#ffffff'
    });

    const closeModal = () => {
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

    cancelButton.buttonBackground.on('pointerdown', () => {
      closeModal();
    });

    confirmButton.buttonBackground.on('pointerdown', () => {
      closeModal();

      this.excludeMode = false;
      this.exclusionFinished = true;

      this.gameState.suspectExclusionState ??= {};
      this.gameState.suspectExclusionState[this.getCaseKey()] = {
        finished: true,
        finishedAt: Date.now()
      };

      saveGameState();

      this.updateExclusionControls();
      this.refreshBoard();
    });
  },

  updateExclusionControls() {
    if (!this.exclusionButton || !this.continueButton) return;

    if (this.exclusionFinished) {
      this.exclusionButton.setVisible(false);
      this.continueButton.setVisible(true);
      this.modeHintText?.setText(
        'Preliminary exclusions saved. Continue with the remaining files.'
      );
      return;
    }

    this.continueButton.setVisible(false);
    this.exclusionButton.setVisible(true);

    if (this.excludeMode) {
      this.exclusionButton.buttonText.setText('[ FINISH EXCLUDING ]');
      this.exclusionButton.isActive = true;
      this.exclusionButton.applyStyle?.();

      this.exclusionButton.buttonBackground.removeAllListeners(
        'pointerdown'
      );

      this.exclusionButton.buttonBackground.on(
        'pointerdown',
        () => this.finishExcluding()
      );

      this.modeHintText?.setText(
        'EXCLUDE MODE: Click suspect files to clear or restore them.'
      );
      return;
    }

    this.exclusionButton.buttonText.setText('[ EXCLUDE MODE ]');
    this.exclusionButton.isActive = false;
    this.exclusionButton.applyStyle?.();

    this.exclusionButton.buttonBackground.removeAllListeners(
      'pointerdown'
    );

    this.exclusionButton.buttonBackground.on(
      'pointerdown',
      () => this.toggleExcludeMode()
    );

    const hairEvidence = this.getHairEvidenceValue();

    this.modeHintText?.setText(
      hairEvidence
        ? `LAB EVIDENCE: RECOVERED HAIR — ${hairEvidence.toUpperCase()}`
        : 'LAB EVIDENCE: Hair analysis not available yet.'
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

    const rawValue =
      hairEvidence?.value ??
      hairEvidence?.normalizedValue ??
      this.gameState.identityEvidence?.thief_value ??
      null;

    if (!rawValue) return null;

    return String(rawValue)
      .trim()
      .toLowerCase()
      .replace(/^blond$/, 'blonde');
  },

  getSuspectHairValue(suspect) {
    const rawValue =
      suspect?.restrictedProfile?.forensicAttributes?.hair_color?.value ??
      suspect?.restrictedProfile?.forensicAttributes?.hair_color ??
      null;

    if (!rawValue) return null;

    return String(rawValue)
      .trim()
      .toLowerCase()
      .replace(/^blond$/, 'blonde');
  },

  getMutableSuspect(suspectId) {
    const collections = [
      this.gameState.suspects,
      this.gameState.suspectList,
      this.gameState.caseSuspects
    ];

    for (const suspects of collections) {
      if (!Array.isArray(suspects)) continue;

      const suspect = suspects.find(
        (item) => item.id === suspectId
      );

      if (suspect) return suspect;
    }

    return null;
  },

  getCrimeLabCompleted() {
    const caseKey = this.getCaseKey();

    return Boolean(
      this.gameState.crimeCityProgress?.[caseKey]?.crimeLabCompleted ||
      this.gameState.csiLabCompleted
    );
  },

  toggleSuspectExclusion(suspectId) {
    const suspect = this.getMutableSuspect(suspectId);

    if (!suspect) {
      console.error(
        '[SuspectsScene] Could not find mutable suspect:',
        suspectId
      );

      return;
    }

    suspect.deductionState ??= {};
    suspect.deductionState.eliminated =
      !Boolean(suspect.deductionState.eliminated);

    if (suspect.deductionState.eliminated) {
      suspect.deductionState.eliminationReasons = [
        {
          label: 'Preliminary forensic exclusion',
          note: 'Removed during initial laboratory review.'
        }
      ];

      suspect.deductionState.labStatus = 'eliminated';
    } else {
      suspect.deductionState.eliminationReasons = [];
      suspect.deductionState.labStatus = 'pending';
    }

    this.gameState.selectedSuspectId = suspect.id;

    saveGameState();
    this.refreshBoard();
  },

  openEvidenceGrid() {
    const remainingSuspects = this.getAllSuspects().filter(
      (suspect) => !suspect.deductionState?.eliminated
    );

    this.gameState.suspectGridInput = {
      cityId: this.cityId,
      suspectIds: remainingSuspects.map((suspect) => suspect.id),
      startedAt: Date.now()
    };

    saveGameState();

    if (this.scene.manager.keys.SuspectGridScene) {
      this.scene.start('SuspectGridScene', {
        cityId: this.cityId,
        gameState: this.gameState,
        suspectIds: this.gameState.suspectGridInput.suspectIds,
        returnScene: this.scene.key
      });

      return;
    }

    console.warn(
      '[SuspectsScene] SuspectGridScene is not registered yet.'
    );

    this.modeHintText?.setText(
      'Evidence Grid is not installed yet. Your exclusions were saved.'
    );
  }
};