// Handles the manual Suspect File exclusion stage.
//
// Important design rule:
// - Evidence may suggest a mismatch.
// - Only a player click in active Exclude Mode can mark a file CLEARED.
// - Evidence Grid "UNLIKELY" marks never write to deductionState.eliminated.
// - The only real CLEARED mutation is delegated to:
//   manuallyClearSuspect() / restoreManuallyClearedSuspect().

import { saveGameState } from '../GameStatePersistence.js';

import {
  manuallyClearSuspect,
  restoreManuallyClearedSuspect
} from '../ui/suspectUtils.js';

function getCaseThiefSuspectId(gameState) {
  return (
    gameState.trueThiefCaseSuspectId ||
    gameState.realThiefSuspectId ||
    null
  );
}

export const SuspectExclusionMixin = {
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

    this.excludeMode = !this.excludeMode;

    if (this.excludeMode) {
      this.filterMode = 'all';
      this.currentPage = 0;

      this.modeHintText?.setText(
        'EXCLUDE MODE ACTIVE. Click a file to mark it CLEARED or restore it.'
      );
    }

    this.updateExclusionControls();
    this.refreshBoard();
  },

  finishExcluding() {
    if (!this.excludeMode || this.exclusionFinished) {
      return;
    }

    this.showFinishExclusionConfirm();
  },

  showFinishExclusionConfirm() {
    const { width, height } = this.scale;

    const allSuspects = this.getAllSuspects();

    const activeCount = allSuspects.filter(
      (suspect) =>
        suspect?.deductionState?.eliminated !== true
    ).length;

    const clearedCount = allSuspects.filter(
      (suspect) =>
        suspect?.deductionState?.eliminated === true
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
        [
          `You manually cleared ${clearedCount} suspect(s).`,
          `${activeCount} file(s) will move to the Evidence Grid.`,
          '',
          'You will not be able to change these exclusions after continuing.'
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

      const caseKey = this.getCaseKey();

      this.gameState.suspectExclusionState ??= {};
      this.gameState.suspectExclusionState[caseKey] ??= {};

      const manualExclusionIds = this.getAllSuspects()
        .filter(
          (suspect) =>
            suspect?.deductionState?.eliminated === true
        )
        .map((suspect) => suspect.id);

      this.gameState.suspectExclusionState[caseKey] = {
        ...this.gameState.suspectExclusionState[caseKey],
        finished: true,
        finishedAt: Date.now(),
        manualExclusionIds
      };

      saveGameState();

      this.updateExclusionControls();
      this.refreshBoard();
    });
  },

  updateExclusionControls() {
    if (!this.exclusionButton || !this.continueButton) {
      return;
    }

    const crimeLabCompleted = this.getCrimeLabCompleted();

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

      const hairEvidence = this.getHairEvidenceValue();

      this.modeHintText?.setText(
        hairEvidence
          ? `EXCLUDE MODE: LAB HAIR = ${hairEvidence.toUpperCase()}. Click files to clear or restore them.`
          : 'EXCLUDE MODE: Click files to clear or restore them.'
      );

      return;
    }

    this.exclusionButton.buttonText.setText(
      '[ EXCLUDE MODE ]'
    );

    this.exclusionButton.isActive = true;
    this.exclusionButton.applyStyle?.();

    this.exclusionButton.buttonBackground.on(
      'pointerdown',
      () => this.toggleExcludeMode()
    );

    const hairEvidence = this.getHairEvidenceValue();

    this.modeHintText?.setText(
      hairEvidence
        ? `LAB EVIDENCE: RECOVERED HAIR — ${hairEvidence.toUpperCase()}`
        : 'LAB COMPLETE: Review the evidence, then enter Exclude Mode.'
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

    if (!rawValue) {
      return null;
    }

    return String(rawValue)
      .trim()
      .toLowerCase()
      .replace(/^blond$/, 'blonde');
  },

  getSuspectHairValue(suspect) {
    const rawValue =
      suspect?.restrictedProfile?.forensicAttributes
        ?.hair_color?.value ??
      suspect?.restrictedProfile?.forensicAttributes
        ?.hair_color ??
      null;

    if (!rawValue) {
      return null;
    }

    return String(rawValue)
      .trim()
      .toLowerCase()
      .replace(/^blond$/, 'blonde');
  },

  /**
   * caseSuspects jest jedynym źródłem prawdy.
   */
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

    return (
      suspects.find(
        (suspect) => suspect?.id === suspectId
      ) || null
    );
  },

  getCrimeLabCompleted() {
    const caseKey = this.getCaseKey();

    return Boolean(
      this.gameState.crimeCityProgress?.[caseKey]
        ?.crimeLabCompleted ||
      this.gameState.csiLabCompleted
    );
  },

  /**
   * Jedyna funkcja sceny do ręcznej zmiany CLEAR/RESTORE.
   *
   * Nie ustawia `deductionState.eliminated` bezpośrednio.
   * Zmianę wykonują wyłącznie funkcje z suspectUtils.js.
   */
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
          source,
          excludeMode: this.excludeMode,
          crimeLabCompleted: this.getCrimeLabCompleted(),
          stack: new Error().stack
        }
      );

      return false;
    }

    if (!this.excludeMode) {
      console.warn(
        '[SuspectsScene] Blocked exclusion outside Exclude Mode.',
        {
          suspectId,
          source,
          stack: new Error().stack
        }
      );

      return false;
    }

    if (this.exclusionFinished) {
      return false;
    }

    if (!this.getCrimeLabCompleted()) {
      this.modeHintText?.setText(
        'Complete the Crime Lab before excluding a suspect.'
      );

      return false;
    }

    const suspect = this.getMutableSuspect(suspectId);

    if (!suspect) {
      console.error(
        '[SuspectsScene] Could not find mutable suspect:',
        suspectId
      );

      return false;
    }

    const realThiefCaseSuspectId = getCaseThiefSuspectId(
      this.gameState
    );

    if (suspect.id === realThiefCaseSuspectId) {
      this.modeHintText?.setText(
        'This file remains inconclusive. The evidence is not enough to clear it.'
      );

      console.warn(
        '[SuspectsScene] Prevented preliminary exclusion of the true thief.',
        {
          suspectId: suspect.id,
          suspectName: suspect.name
        }
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

    const caseKey = this.getCaseKey();

    this.gameState.suspectExclusionState ??= {};
    this.gameState.suspectExclusionState[caseKey] ??= {
      finished: false,
      manualExclusionIds: []
    };

    const manualExclusionIds = new Set(
      this.gameState.suspectExclusionState[caseKey]
        .manualExclusionIds || []
    );

    if (isCurrentlyCleared) {
      manualExclusionIds.delete(suspect.id);
    } else {
      manualExclusionIds.add(suspect.id);
    }

    this.gameState.suspectExclusionState[caseKey] = {
      ...this.gameState.suspectExclusionState[caseKey],
      manualExclusionIds: [
        ...manualExclusionIds
      ],
      updatedAt: Date.now()
    };

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

  openEvidenceGrid() {
    const remainingSuspects = this.getAllSuspects().filter(
      (suspect) =>
        suspect?.deductionState?.eliminated !== true
    );

    if (remainingSuspects.length < 2) {
      this.modeHintText?.setText(
        'Keep at least two suspects active before opening the Evidence Grid.'
      );

      return;
    }

    this.gameState.suspectGridInput = {
      cityId: this.cityId,
      suspectIds: remainingSuspects.map(
        (suspect) => suspect.id
      ),
      startedAt: Date.now()
    };

    saveGameState();

    if (this.scene.manager.keys.SuspectGridScene) {
      this.scene.start('SuspectGridScene', {
        cityId: this.cityId,
        gameState: this.gameState,
        suspectIds:
          this.gameState.suspectGridInput.suspectIds,
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