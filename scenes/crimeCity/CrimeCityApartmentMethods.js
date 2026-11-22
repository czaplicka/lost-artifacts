import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { gameState } from '../../GameData.js';
import { getCaseSuspects } from '../../suspects/CaseSuspects.js';
import { EventBus } from '../../EventBus.js';
import { CrimeCityProgressService } from './CrimeCityProgressService.js';
import { launchFailedAlibiArrest } from '../FailedAlibiArrestOverlayScene.js';

const text = key => __dialogueText('scenes/crimeCity/CrimeCityApartmentMethods.js', key);
function missionId() {
  // Match ApartmentScene's existing id/missionId order without inventing a shared fallback slot.
  const mission = gameState.currentMission || {}, value = mission.id || mission.missionId;
  if (typeof value === 'string' && value.trim() && value !== 'unknown_mission') return value;
  if (typeof value === 'number' && Number.isFinite(value) && value !== 0) return String(value);
  return null;
}
function nullableId(value) {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  throw new Error('The active apartment visit has an invalid identity.');
}
function captureVisit(scene, suspectId) {
  const id = missionId();
  if (id === null) throw new Error('A stable mission ID is required before visiting an apartment. Reload the case.');
  return { missionId: id, caseId: nullableId(gameState.currentCaseId), campaignId: gameState._createdAt,
    cityId: scene.cityId, suspectId };
}
function matchesVisit(scene, context) {
  if (!context || scene._apartmentVisitContext !== context) return false;
  try {
    return missionId() === context.missionId && nullableId(gameState.currentCaseId) === context.caseId &&
      gameState._createdAt === context.campaignId && scene.cityId === context.cityId;
  } catch { return false; }
}
function cancelApartmentFade(scene) { scene._apartmentFadeCleanup?.(); }
function progressService(scene, method) {
  return typeof scene.progressService?.[method] === 'function'
    ? scene.progressService : new CrimeCityProgressService(scene);
}

export const crimeCityApartmentMethods = {
  hasVisitedApartment() {
    const id = missionId();
    if (id === null) return false;
    const progress = gameState.apartmentProgress?.[id];
    return Boolean(progress && (progress.inventoryVersion === 2 || progress.updatedAt));
  },

  resolveApartmentTarget(suspectId) {
    const suspects = getCaseSuspects(gameState);
    if (!suspectId) return { valid: false, reason: 'missing_selection' };
    const target = suspects.find(suspect => suspect?.id === suspectId);
    if (!target) return { valid: false, reason: 'unknown_suspect' };
    const thieves = suspects.filter(suspect => suspect?.isRealThief === true || suspect?.hiddenCaseData?.isTrueThief === true);
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
      this.showMessage(target.reason === 'missing_selection' ? text('t_1846c3a864ebf99d7d99') : text('t_8d4ee84b5f99a01f381d'), 3000, text('t_e09afad9b0dfcb2294f9'));
      return false;
    }
    let context;
    try { context = captureVisit(this, suspectId); }
    catch (error) { this.showMessage(error.message, 4000, text('t_f27f7bc32875ed02b2fc')); return false; }
    if (!this.isAlibiDebunked(suspectId)) {
      this.showMessage(text('t_68de0ca0aa1252dbe045'), 2600, text('t_e09afad9b0dfcb2294f9')); return false;
    }
    if (!this.canAffordLocalActivity('apartment')) return false;
    cancelApartmentFade(this);
    this._apartmentVisitContext = context;
    this.isTransitioning = true; this.isVisitingApartment = true;
    void this.prepareApartmentVisit(suspectId, this._runToken, context);
    return true;
  },

  async prepareApartmentVisit(suspectId, token, context = this._apartmentVisitContext) {
    try {
      if (!context) { context = captureVisit(this, suspectId); this._apartmentVisitContext = context; }
      if (!this.isCurrentRun(token) || !matchesVisit(this, context) || context.suspectId !== suspectId) return false;
      let target = this.resolveApartmentTarget(suspectId);
      if (!target.valid) throw new Error(`Invalid apartment target: ${target.reason}`);
      const expectedCorrect = target.isCorrect;
      if (this.game.sceneLoader) await this.game.sceneLoader.ensure(expectedCorrect ? 'ApartmentScene' : 'GameOverScene');
      if (!this.isCurrentRun(token) || this._apartmentVisitContext !== context) return false;
      if (!matchesVisit(this, context)) throw new Error('The active case changed while the apartment was loading.');
      target = this.resolveApartmentTarget(suspectId);
      if (!target.valid || target.isCorrect !== expectedCorrect) throw new Error('The apartment target changed while loading.');
      const destination = target.isCorrect ? 'ApartmentScene' : 'GameOverScene';
      if (!this.hasScene(destination)) throw new Error(`${destination} could not be registered by SceneLoader.`);
      if (!this.isAlibiDebunked(suspectId)) { this.restoreAfterApartmentFailure(token, context); return false; }
      if (!this.canAffordLocalActivity('apartment')) { this.restoreAfterApartmentFailure(token, context); return false; }
      if (!this.moveToCrimeCityNode('apartment')) { this.restoreAfterApartmentFailure(token, context); return false; }
      if (!this.isCurrentRun(token)) return false;
      if (!matchesVisit(this, context)) throw new Error('The case changed during local travel.');
      if (!this.trySpendEnergy('activity', 'apartment_visit')) { this.restoreAfterApartmentFailure(token, context); return false; }
      if (!this.isCurrentRun(token)) return false;
      if (!matchesVisit(this, context)) throw new Error('The case changed during the apartment activity.');
      this.closeAllUIPanels();
      if (!target.isCorrect) {
        const opened = await launchFailedAlibiArrest(this, {
          suspectId, caseId: gameState.currentCaseId ?? gameState.currentMission?.id ?? this.getCaseKey()
        });
        if (!opened && this.isCurrentRun(token) && this._apartmentVisitContext === context) {
          this.restoreAfterApartmentFailure(token, context);
          this.showMessage(text('t_1943b6ba362f7adf88a9'), 3200, text('t_f27f7bc32875ed02b2fc'));
        }
        return Boolean(opened);
      }
      EventBus.emit('crimeCityTutorialStep', { step: 'search_apartment' });
      const camera = this.cameras.main, event = Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE;
      cancelApartmentFade(this);
      const cleanup = () => {
        camera.off(event, onFade);
        this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
        if (this._apartmentFadeCleanup === cleanup) this._apartmentFadeCleanup = null;
      };
      const onFade = () => {
        const ownsFade = this._apartmentFadeCleanup === cleanup;
        cleanup();
        if (!ownsFade || !this.isCurrentRun(token)) return;
        if (!matchesVisit(this, context)) {
          this.restoreAfterApartmentFailure(token, context); return;
        }
        void this.enterPreparedApartment(suspectId, token, context);
      };
      this._apartmentFadeCleanup = cleanup;
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      camera.once(event, onFade); camera.fadeOut(350, 0, 0, 0);
      return true;
    } catch (error) {
      if (token !== this._runToken || this._cleanupDone || (context && this._apartmentVisitContext !== context)) return false;
      console.error('[CrimeCityScene] Apartment preparation failed:', error);
      this.restoreAfterApartmentFailure(token, context);
      this.showMessage(text('t_28a60dbd2db00408c93f'), 4000, text('t_f27f7bc32875ed02b2fc'));
      return false;
    }
  },

  async enterPreparedApartment(suspectId, token, context = this._apartmentVisitContext) {
    try {
      if (!this.isCurrentRun(token) || !context || this._apartmentVisitContext !== context) return false;
      if (!matchesVisit(this, context) || context.suspectId !== suspectId) {
        this.restoreAfterApartmentFailure(token, context); return false;
      }
      const started = await this.goto('ApartmentScene', {
        suspectId, cityId: context.cityId, caseKey: this.getCaseKey(), returnScene: 'CrimeCityScene'
      });
      if (!started && this.isCurrentRun(token) && this._apartmentVisitContext === context) {
        this.restoreAfterApartmentFailure(token, context);
        this.showMessage(text('t_e2d67030b8f0029838f2'), 3200, text('t_f27f7bc32875ed02b2fc'));
      }
      return Boolean(started);
    } catch (error) {
      if (!this.isCurrentRun(token) || this._apartmentVisitContext !== context) return false;
      console.error('[CrimeCityScene] Apartment transition failed:', error);
      this.restoreAfterApartmentFailure(token, context);
      this.showMessage(text('t_1d40c5d462f8e0047021'), 4000, text('t_f27f7bc32875ed02b2fc'));
      return false;
    }
  },

  restoreAfterApartmentFailure(token, context = this._apartmentVisitContext) {
    if (!this.isCurrentRun(token) || (context && this._apartmentVisitContext !== context)) return;
    cancelApartmentFade(this); this._apartmentVisitContext = null;
    this.isTransitioning = false; this.isVisitingApartment = false;
    this.cameras.main.resetFX(); this.cameras.main.setAlpha(1); this.cameras.main.fadeIn(200, 0, 0, 0);
  },

  isAlibiDebunked(suspectId) {
    if (!suspectId) return false;
    return Boolean(progressService(this, 'isAlibiDebunked').isAlibiDebunked(suspectId));
  },

  hasAnyDebunkedAlibi() {
    return Boolean(progressService(this, 'hasAnyDebunkedAlibi').hasAnyDebunkedAlibi());
  }
};
