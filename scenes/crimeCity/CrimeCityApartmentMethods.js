import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gameState } from '../../GameData.js';
import { getCaseSuspects } from '../../suspects/CaseSuspects.js';
import { EventBus } from '../../EventBus.js';
import { launchFailedAlibiArrest } from '../FailedAlibiArrestOverlayScene.js';

export const crimeCityApartmentMethods = {
  hasVisitedApartment() {
    const mission = gameState.currentMission || {};
    const missionId = String(mission.id || mission.missionId || 'unknown_mission');
    const progress = gameState.apartmentProgress?.[missionId];
    return Boolean(progress && (progress.inventoryVersion === 2 || progress.updatedAt));
  },

  resolveApartmentTarget(suspectId) {
    const suspects = getCaseSuspects(gameState);
    if (!suspectId) return { valid: false, reason: 'missing_selection' };
    const target = suspects.find(suspect => suspect?.id === suspectId);
    if (!target) return { valid: false, reason: 'unknown_suspect' };
    const thieves = suspects.filter(suspect => (
      suspect?.isRealThief === true || suspect?.hiddenCaseData?.isTrueThief === true
    ));
    if (thieves.length !== 1) {
      console.error('[CrimeCityScene] Expected exactly one real case thief.', { suspectId, thiefCount: thieves.length });
      return { valid: false, reason: 'invalid_thief_data' };
    }
    return { valid: true, target, isCorrect: target.id === thieves[0].id };
  },

  visitApartment(suspectId) {
    if (this.isTransitioning || this.isVisitingApartment || this._cleanupDone || !this.sys.isActive()) return false;
    const target = this.resolveApartmentTarget(suspectId);
    if (!target.valid) {
      this.showMessage(target.reason === __dialogueText("scenes/crimeCity/CrimeCityApartmentMethods.js", "t_7d569cfc7cd9cee508f7")
        ? __dialogueText("scenes/crimeCity/CrimeCityApartmentMethods.js", "t_1846c3a864ebf99d7d99")
        : __dialogueText("scenes/crimeCity/CrimeCityApartmentMethods.js", "t_8d4ee84b5f99a01f381d"), 3000, __dialogueText("scenes/crimeCity/CrimeCityApartmentMethods.js", "t_e09afad9b0dfcb2294f9"));
      return false;
    }
    if (!this.isAlibiDebunked(suspectId)) {
      this.showMessage(__dialogueText("scenes/crimeCity/CrimeCityApartmentMethods.js", "t_68de0ca0aa1252dbe045"), 2600, __dialogueText("scenes/crimeCity/CrimeCityApartmentMethods.js", "t_e09afad9b0dfcb2294f9"));
      return false;
    }
    if (!this.canAffordLocalActivity('apartment')) return false;
    this.isTransitioning = true;
    this.isVisitingApartment = true;
    void this.prepareApartmentVisit(suspectId, this._runToken);
    return true;
  },

  async prepareApartmentVisit(suspectId, token) {
    try {
      let target = this.resolveApartmentTarget(suspectId);
      if (!target.valid) throw new Error(`Invalid apartment target: ${target.reason}`);
      if (this.game.sceneLoader) {
        await this.game.sceneLoader.ensure(target.isCorrect ? 'ApartmentScene' : 'GameOverScene');
      }
      if (!this.isCurrentRun(token)) return;
      target = this.resolveApartmentTarget(suspectId);
      if (!target.valid) throw new Error(`Apartment target changed: ${target.reason}`);
      const destination = target.isCorrect ? 'ApartmentScene' : 'GameOverScene';
      if (!this.hasScene(destination)) throw new Error(`${destination} could not be registered by SceneLoader.`);
      if (!this.isAlibiDebunked(suspectId)) { this.restoreAfterApartmentFailure(token); return; }
      if (!this.canAffordLocalActivity('apartment')) { this.restoreAfterApartmentFailure(token); return; }
      if (!this.moveToCrimeCityNode('apartment')) { this.restoreAfterApartmentFailure(token); return; }
      if (!this.trySpendEnergy('activity', 'apartment_visit')) { this.restoreAfterApartmentFailure(token); return; }
      if (!this.isCurrentRun(token)) return;
      this.closeAllUIPanels();
      if (!target.isCorrect) {
        const opened = await launchFailedAlibiArrest(this, {
          suspectId, caseId: gameState.currentCaseId ?? gameState.currentMission?.id ?? this.getCaseKey()
        });
        if (!opened && this.isCurrentRun(token)) {
          this.restoreAfterApartmentFailure(token);
          this.showMessage(__dialogueText("scenes/crimeCity/CrimeCityApartmentMethods.js", "t_1943b6ba362f7adf88a9"), 3200, __dialogueText("scenes/crimeCity/CrimeCityApartmentMethods.js", "t_f27f7bc32875ed02b2fc"));
        }
        return;
      }
      EventBus.emit('crimeCityTutorialStep', { step: 'search_apartment' });
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        if (!this.isCurrentRun(token)) return;
        void this.enterPreparedApartment(suspectId, token);
      });
      this.cameras.main.fadeOut(350, 0, 0, 0);
    } catch (error) {
      if (token !== this._runToken || this._cleanupDone) return;
      console.error('[CrimeCityScene] Apartment preparation failed:', error);
      this.restoreAfterApartmentFailure(token);
      this.showMessage(__dialogueText("scenes/crimeCity/CrimeCityApartmentMethods.js", "t_28a60dbd2db00408c93f"), 4000, __dialogueText("scenes/crimeCity/CrimeCityApartmentMethods.js", "t_f27f7bc32875ed02b2fc"));
    }
  },

  async enterPreparedApartment(suspectId, token) {
    try {
      const started = await this.goto('ApartmentScene', {
        suspectId, cityId: this.cityId, caseKey: this.getCaseKey(), returnScene: 'CrimeCityScene'
      });
      if (!started && this.isCurrentRun(token)) {
        this.restoreAfterApartmentFailure(token);
        this.showMessage(__dialogueText("scenes/crimeCity/CrimeCityApartmentMethods.js", "t_e2d67030b8f0029838f2"), 3200, __dialogueText("scenes/crimeCity/CrimeCityApartmentMethods.js", "t_f27f7bc32875ed02b2fc"));
      }
    } catch (error) {
      if (!this.isCurrentRun(token)) return;
      console.error('[CrimeCityScene] Apartment transition failed:', error);
      this.restoreAfterApartmentFailure(token);
      this.showMessage(__dialogueText("scenes/crimeCity/CrimeCityApartmentMethods.js", "t_1d40c5d462f8e0047021"), 4000, __dialogueText("scenes/crimeCity/CrimeCityApartmentMethods.js", "t_f27f7bc32875ed02b2fc"));
    }
  },

  restoreAfterApartmentFailure(token) {
    if (!this.isCurrentRun(token)) return;
    this.isTransitioning = false;
    this.isVisitingApartment = false;
    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);
    this.cameras.main.fadeIn(200, 0, 0, 0);
  },

  isAlibiDebunked(suspectId) {
    if (!suspectId) return false;
    if (typeof this.progressService?.isAlibiDebunked === 'function') {
      return Boolean(this.progressService.isAlibiDebunked(suspectId));
    }
    const debunked = gameState.debunkedAlibis || gameState.currentCase?.debunkedAlibis || [];
    return Array.isArray(debunked) && debunked.includes(suspectId);
  },

  hasAnyDebunkedAlibi() {
    if (typeof this.progressService?.hasAnyDebunkedAlibi === 'function') {
      return Boolean(this.progressService.hasAnyDebunkedAlibi());
    }
    const debunked = gameState.debunkedAlibis || gameState.currentCase?.debunkedAlibis || [];
    return Array.isArray(debunked) && debunked.length > 0;
  }
};
