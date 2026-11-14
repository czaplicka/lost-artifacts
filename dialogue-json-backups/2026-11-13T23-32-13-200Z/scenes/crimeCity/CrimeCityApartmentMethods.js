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
      this.showMessage(target.reason === 'missing_selection'
        ? 'No suspect selected.\nPick someone from the board first.'
        : 'The suspect file could not be verified.\nNo arrest team was dispatched.', 3000, '#5d2a00');
      return false;
    }
    if (!this.isAlibiDebunked(suspectId)) {
      this.showMessage("This suspect's alibi still holds up.\nCheck the witness statements first.", 2600, '#5d2a00');
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
          this.showMessage('The arrest animation could not be opened.\nPlease try again.', 3200, '#8b0000');
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
      this.showMessage('The operation could not be prepared.\nPlease try again. Check the console if it happens again.', 4000, '#8b0000');
    }
  },

  async enterPreparedApartment(suspectId, token) {
    try {
      const started = await this.goto('ApartmentScene', {
        suspectId, cityId: this.cityId, caseKey: this.getCaseKey(), returnScene: 'CrimeCityScene'
      });
      if (!started && this.isCurrentRun(token)) {
        this.restoreAfterApartmentFailure(token);
        this.showMessage('The apartment could not be opened.\nPlease try again.', 3200, '#8b0000');
      }
    } catch (error) {
      if (!this.isCurrentRun(token)) return;
      console.error('[CrimeCityScene] Apartment transition failed:', error);
      this.restoreAfterApartmentFailure(token);
      this.showMessage('The apartment could not be opened.\nCheck the console for details.', 4000, '#8b0000');
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
