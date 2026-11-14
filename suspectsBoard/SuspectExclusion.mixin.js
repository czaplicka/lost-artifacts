import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// suspectsBoard/SuspectExclusion.mixin.js


import { saveGameState, requestAutosave } from '../gameStatePersistence.js';
import { getEnergyManager } from '../managers/EnergyManager.js';


const EVIDENCE_GRID_ENERGY_COST = 10;


export const SuspectExclusionMixin = {
  getExclusionSessionState() {
    return this.ensureExclusionState();
  },


  /**
   * Jednorazowa opłata za pracę z Evidence Grid.
   * energyPaid chroni przed ponowną opłatą po wyjściu i wczytaniu zapisu.
   */
  payForEvidenceGrid() {
    const state = this.getExclusionSessionState();


    if (state.finished === true) {
      return false;
    }


    if (state.energyPaid === true) {
      return true;
    }


    const energyManager = getEnergyManager();


    const affordability = energyManager.canAfford(
      EVIDENCE_GRID_ENERGY_COST
    );


    if (!affordability.ok) {
      this.modeHintText?.setText(
        energyManager.getInsufficientEnergyMessage(
          EVIDENCE_GRID_ENERGY_COST
        )
      );


      return false;
    }


    const result = energyManager.consumeCustom(
      EVIDENCE_GRID_ENERGY_COST,
      `${__dialogueText("suspectsBoard/SuspectExclusion.mixin.js", "t_1d87e52fb2b5bcd72111")}${EVIDENCE_GRID_ENERGY_COST}`,
      {
        requireFullAmount: true,
        activityType: 'suspect_exclusion'
      }
    );


    if (!result?.success) {
      this.modeHintText?.setText(
        result?.message ||
          __dialogueText("suspectsBoard/SuspectExclusion.mixin.js", "t_22c343893639580926a8")
      );


      return false;
    }


    state.energyPaid = true;
    state.energyCost = EVIDENCE_GRID_ENERGY_COST;
    state.energyPaidAt = Date.now();
    state.sessionStartedAt ??= Date.now();


    requestAutosave();


    return true;
  },


  // Zgodność ze starym kodem: Exclude Mode już nie istnieje.
  toggleExcludeMode() {
    return this.openEvidenceGrid();
  },


  // Zgodność ze starym kodem: wykluczanie dzieje się tylko w Evidence Grid.
  toggleSuspectExclusion() {
    this.modeHintText?.setText(
      __dialogueText("suspectsBoard/SuspectExclusion.mixin.js", "t_675cf606110bbe5d8cca")
    );


    return false;
  },


  updateExclusionControls() {
    if (!this.continueButton) {
      return;
    }


    this.exclusionButton?.setVisible(false);
    this.continueButton.setVisible(true);


    if (this.exclusionFinished) {
      this.continueButton.buttonText.setText(__dialogueText("suspectsBoard/SuspectExclusion.mixin.js", "t_5bc9a22b295ac27a8a27"));
      this.setButtonEnabled(this.continueButton, false);


      const clearedCount = this.getAllSuspects().filter(
        (suspect) => suspect?.deductionState?.eliminated === true
      ).length;


      this.modeHintText?.setText(
        `${__dialogueText("suspectsBoard/SuspectExclusion.mixin.js", "t_e602c4bfb6b313be1cce")}${clearedCount}${__dialogueText("suspectsBoard/SuspectExclusion.mixin.js", "t_59d002d676dde38d157e")}`
      );


      return;
    }


    if (!this.getCrimeLabCompleted()) {
      this.continueButton.buttonText.setText(__dialogueText("suspectsBoard/SuspectExclusion.mixin.js", "t_9551968a134b708f784d"));
      this.setButtonEnabled(this.continueButton, false);


      this.modeHintText?.setText(
        __dialogueText("suspectsBoard/SuspectExclusion.mixin.js", "t_c9a1735abc7f8f89e6b3")
      );


      return;
    }


    const alreadyPaid =
      this.getExclusionSessionState().energyPaid === true;


    this.continueButton.buttonText.setText(
      alreadyPaid ? __dialogueText("suspectsBoard/SuspectExclusion.mixin.js", "t_afbf87c0050ca3de025d") : __dialogueText("suspectsBoard/SuspectExclusion.mixin.js", "t_fc203ca20a78a14a9f07")
    );


    this.setButtonEnabled(this.continueButton, true);


    this.modeHintText?.setText(
      alreadyPaid
        ? __dialogueText("suspectsBoard/SuspectExclusion.mixin.js", "t_2c8a152549f58db3ca89")
        : `${__dialogueText("suspectsBoard/SuspectExclusion.mixin.js", "t_6fb2892db8eb45dd3f02")}${EVIDENCE_GRID_ENERGY_COST}${__dialogueText("suspectsBoard/SuspectExclusion.mixin.js", "t_936697a09eb5e43ff87a")}`
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


    const identityEvidence = this.gameState.identityEvidence;


    const identityField =
      identityEvidence?.attribute ||
      identityEvidence?.evidenceType ||
      identityEvidence?.field;


    const rawValue =
      hairEvidence?.value ??
      hairEvidence?.normalizedValue ??
      (identityField === 'hair_color'
        ? identityEvidence?.thief_value
        : null);


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
      suspect?.restrictedProfile?.forensicAttributes?.hair_color;


    const rawValue = hairAttribute?.value ?? hairAttribute ?? null;


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


    return suspects.find((suspect) => suspect?.id === suspectId) || null;
  },


  getCrimeLabCompleted() {
    const caseKey = this.getCaseKey();


    return Boolean(
      this.gameState.crimeCityProgress?.[caseKey]?.crimeLabCompleted ||
        this.gameState.csiLabCompleted
    );
  },


  async openEvidenceGrid() {
    if (
      this._openingEvidenceGrid ||
      this._cleanupDone ||
      !this.sys.isActive() ||
      this.exclusionFinished
    ) {
      return false;
    }


    if (!this.getCrimeLabCompleted()) {
      this.modeHintText?.setText(
        __dialogueText("suspectsBoard/SuspectExclusion.mixin.js", "t_c9a1735abc7f8f89e6b3")
      );


      return false;
    }


    if (getEnergyManager().isForcedSleepActive()) {
      this.modeHintText?.setText(
        __dialogueText("suspectsBoard/SuspectExclusion.mixin.js", "t_666195422274738bfcaa")
      );


      return false;
    }


    this._openingEvidenceGrid = true;


    try {
      const loader = this.game.sceneLoader;


      if (loader) {
        await loader.ensure('SuspectGridScene');
      } else if (!this.hasScene('SuspectGridScene')) {
        throw new Error(
          'SuspectGridScene is not registered and SceneLoader is unavailable.'
        );
      }


      if (this._cleanupDone || !this.sys.isActive()) {
        return false;
      }


      if (!this.payForEvidenceGrid()) {
        return false;
      }


      const suspectIds = this.getAllSuspects().map(
        (suspect) => suspect.id
      );


      this.gameState.suspectGridInput = {
        cityId: this.cityId,
        suspectIds,
        startedAt: Date.now()
      };


      saveGameState();


      const moved = await this.goto('SuspectGridScene', {
        cityId: this.cityId,
        gameState: this.gameState,
        suspectIds,
        returnScene: this.scene.key,
        returnData: {
          cityId: this.cityId,
          returnScene: this.returnScene,
          returnData: { ...this.returnData }
        }
      });


      if (!moved && !this._cleanupDone) {
        this.modeHintText?.setText(
          __dialogueText("suspectsBoard/SuspectExclusion.mixin.js", "t_22c343893639580926a8")
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
          __dialogueText("suspectsBoard/SuspectExclusion.mixin.js", "t_26f973d25004f56a1dc8")
        );
      }


      return false;
    } finally {
      this._openingEvidenceGrid = false;
    }
  }
};