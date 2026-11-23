import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { gameState } from '../../GameData.js';
import { getEnergyManager } from '../../managers/EnergyManager.js';
import { saveGameState } from '../../gameStatePersistence.js';
import { getCrimeCityLocalTravelCost } from './CrimeCityLocalTravelCosts.js';

const getShopTravelEnergy = () => getCrimeCityLocalTravelCost('shop', getEnergyManager()).energy;
const LOCAL_ACTIVITY_BY_NODE = Object.freeze({
  crime_scene: 'crime_scene', crime_lab: 'csi_lab', apartment: 'apartment_visit'
});

function transitionContext(scene) {
  const mission = gameState.currentMission;
  return [gameState._createdAt, gameState.currentCaseId, mission?.id, mission?.missionId,
    mission?.scene, scene.cityId];
}
function sameTransitionContext(scene, expected) {
  return transitionContext(scene).every((value, index) => Object.is(value, expected[index]));
}

export const crimeCityTravelMethods = {
  getLocalActivityEnergyCost(targetNodeId) {
    const activityType = Object.prototype.hasOwnProperty.call(LOCAL_ACTIVITY_BY_NODE, targetNodeId)
      ? LOCAL_ACTIVITY_BY_NODE[targetNodeId] : null;
    if (!activityType) {
      console.error('[CrimeCityScene] Unknown local activity node:', targetNodeId);
      return null;
    }
    const energy = getEnergyManager();
    const travelCost = this.progressService?.getCurrentNode() === targetNodeId ? 0 : energy.getTravelCost('taxi');
    const activityAlreadyPaid = targetNodeId === 'crime_lab' && this.hasPaidCrimeLabEntry();
    const activityCost = activityAlreadyPaid ? 0 : energy.getActivityCost(activityType);
    return { activityType, travelCost, activityCost, totalCost: travelCost + activityCost };
  },

  canAffordLocalActivity(targetNodeId) {
    if (!this.progressService || this._cleanupDone || !this.sys.isActive()) return false;
    const costs = this.getLocalActivityEnergyCost(targetNodeId);
    if (!costs) return false;
    const energy = getEnergyManager();
    if (!energy.canAfford(costs.totalCost).ok) {
      this.showMessage(energy.getInsufficientEnergyMessage(costs.totalCost), 3200, __dialogueText('scenes/crimeCity/CrimeCityTravelMethods.js', 't_f27f7bc32875ed02b2fc'));
      return false;
    }
    return true;
  },

  visitShop() {
    if (this.isTransitioning || this._cleanupDone || !this.sys.isActive()) return false;
    if (getEnergyManager().getCurrentEnergy() < getShopTravelEnergy()) {
      this.showNoEnergyPopup(); return false;
    }
    this.closeAllUIPanels(); this.isTransitioning = true;
    void this.openShopOverlay(); return true;
  },

  async openShopOverlay() {
    try {
      if (this.game.sceneLoader) await this.game.sceneLoader.ensure('ShopScene');
      if (this._cleanupDone || !this.sys.isActive()) return false;
      if (!this.hasScene('ShopScene')) throw new Error('ShopScene is not registered.');
      const energy = getEnergyManager();
      if (energy.getCurrentEnergy() < getShopTravelEnergy()) { this.showNoEnergyPopup(); return false; }
      const opened = await this.launchOverlay('ShopScene', { cityId: this.cityId, returnScene: 'CrimeCityScene' });
      if (this._cleanupDone || !this.sys.isActive()) return false;
      if (!opened) {
        this.showMessage(__dialogueText('scenes/crimeCity/CrimeCityTravelMethods.js', 't_d353443b02f69822ebb5'), 2800, __dialogueText('scenes/crimeCity/CrimeCityTravelMethods.js', 't_f27f7bc32875ed02b2fc'));
        return false;
      }
      const travelEnergy = getShopTravelEnergy();
      if (energy.getCurrentEnergy() < travelEnergy) {
        this.scene.stop('ShopScene'); this.showNoEnergyPopup();
        void this.setupCrimeCityUi(); return false;
      }
      const payment = energy.consumeCustom(travelEnergy, __dialogueText('scenes/crimeCity/CrimeCityTravelMethods.js', 't_75c02d2cc7f1977fe289'), { requireFullAmount: true });
      if (!payment?.success) {
        this.scene.stop('ShopScene'); this.showNoEnergyPopup();
        void this.setupCrimeCityUi(); return false;
      }
      saveGameState(); this.getSceneIfActive('UIScene')?.updateEnergy?.();
      this.scene.pause(); return true;
    } catch (error) {
      console.error('[CrimeCityScene] Opening ShopScene failed:', error);
      if (!this._cleanupDone && this.sys.isActive()) {
        this.scene.stop('ShopScene');
        this.showMessage(__dialogueText('scenes/crimeCity/CrimeCityTravelMethods.js', 't_604876cf3a540f124474'), 3200, __dialogueText('scenes/crimeCity/CrimeCityTravelMethods.js', 't_f27f7bc32875ed02b2fc'));
        void this.setupCrimeCityUi();
      }
      return false;
    } finally { this.isTransitioning = false; }
  },

  openCrimeScene() {
    if (this.isTransitioning || this._cleanupDone || !this.sys.isActive()) return;
    const mission = gameState.currentMission;
    if (!mission?.scene) {
      this.showMessage(__dialogueText('scenes/crimeCity/CrimeCityTravelMethods.js', 't_3c0e1733da49d99b82b9'), 2600, __dialogueText('scenes/crimeCity/CrimeCityTravelMethods.js', 't_e09afad9b0dfcb2294f9'));
      return;
    }
    const reconstruction = this.reconstructionService?.prepareReconstruction();
    if (!reconstruction) {
      this.showMessage(__dialogueText('scenes/crimeCity/CrimeCityTravelMethods.js', 't_cdc0be26e1f92f0b84ee'), 3200, __dialogueText('scenes/crimeCity/CrimeCityTravelMethods.js', 't_f27f7bc32875ed02b2fc'));
      return;
    }
    const foundCardIds = reconstruction.foundCardIds || [];
    if (!Array.isArray(foundCardIds) || foundCardIds.length !== 6) {
      console.error('[CrimeCityScene] Invalid evidence set:', reconstruction);
      this.showMessage(__dialogueText('scenes/crimeCity/CrimeCityTravelMethods.js', 't_a841f6df00da50b5873b'), 3200, __dialogueText('scenes/crimeCity/CrimeCityTravelMethods.js', 't_f27f7bc32875ed02b2fc'));
      return;
    }
    if (!this.canAffordLocalActivity('crime_scene')) return;
    if (!this.moveToCrimeCityNode('crime_scene')) return;
    this.closeAllUIPanels();
    this.transitionTo('HiddenObjectsScene', {
      sceneId: mission.scene, mapKey: mission.scene,
      mapPath: `${__dialogueText('scenes/crimeCity/CrimeCityTravelMethods.js', 't_6b9b2f83e78caa08cfb1')}${mission.scene}${__dialogueText('scenes/crimeCity/CrimeCityTravelMethods.js', 't_12157ab04ed2c6accc3d')}`,
      backgroundMode: 'image', backgroundKey: `${mission.scene}_bg`,
      backgroundPath: `${__dialogueText('scenes/crimeCity/CrimeCityTravelMethods.js', 't_6b9b2f83e78caa08cfb1')}${mission.scene}${__dialogueText('scenes/crimeCity/CrimeCityTravelMethods.js', 't_d912c70acf20eda7217a')}`,
      objectLayerName: 'HiddenObjects', objectsDataKey: 'objects-data',
      objectsDataPath: 'assets/data/objects.json', itemSceneKey: mission.scene,
      activeCount: 6, timeLimit: 120,
      title: `${__dialogueText('scenes/crimeCity/CrimeCityTravelMethods.js', 't_fdebfb989db84b0aeddf')}${this.cityData.city}`,
      returnScene: 'CrimeCityScene', returnData: { cityId: this.cityId },
      cityId: this.cityId, sourceScene: 'CrimeCityScene', mission,
      chargeCrimeSceneOnReady: true
    });
  },

  openCrimeLab() {
    if (this.isTransitioning || this._cleanupDone || !this.sys.isActive() || !this.isCrimeSceneCompleted()) return false;
    if (!this.canAffordLocalActivity('crime_lab')) return false;
    if (!this.moveToCrimeCityNode('crime_lab')) return false;
    if (!this.payCrimeLabEntryOnce()) return false;
    this.closeAllUIPanels();
    return this.transitionTo('CrimeLabScene', {
      cityId: this.cityId, caseKey: this.getCaseKey(), returnScene: 'CrimeCityScene',
      returnData: { cityId: this.cityId }, sourceScene: 'CrimeCityScene'
    });
  },

  captureNavigationGuard() {
    return this._crimeCityTransitionGuard ?? null;
  },

  transitionTo(sceneKey, data = {}) {
    if (this.isTransitioning || this._cleanupDone || !this.sys.isActive()) return false;
    const token = this._runToken, context = transitionContext(this);
    const camera = this.cameras.main;
    const fadeEvent = Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE;
    const events = Phaser.Scenes.Events;
    this._crimeCityTransitionCleanup?.();
    this.isTransitioning = true;
    let live = true, fadeHandled = false;
    const ownsTransition = () => live && this._crimeCityTransitionCleanup === cancel;
    const sameRun = () => token === this._runToken && !this._cleanupDone;
    const isCurrent = () => ownsTransition() && this.isCurrentRun(token);
    const guard = () => isCurrent() && sameTransitionContext(this, context);
    const detachFade = () => camera.off(fadeEvent, onFade);
    const cancel = () => {
      live = false;
      detachFade();
      this.events.off(events.SHUTDOWN, cancel);
      this.events.off(events.DESTROY, cancel);
      this.events.off(events.SLEEP, onSuspend);
      this.events.off(events.PAUSE, onSuspend);
      if (this._crimeCityTransitionCleanup === cancel) this._crimeCityTransitionCleanup = null;
      if (this._crimeCityTransitionGuard === guard) this._crimeCityTransitionGuard = null;
    };
    const recover = (error = null, suspended = false) => {
      const canRestore = ownsTransition() && sameRun() && (suspended || this.sys.isActive());
      cancel();
      if (!canRestore) return;
      this.isTransitioning = false;
      if (error) console.error(`[CrimeCityScene] Transition to ${sceneKey} failed:`, error);
      try {
        camera.resetFX(); camera.setAlpha(1);
        if (!suspended) camera.fadeIn(200, 0, 0, 0);
      } catch (cameraError) {
        console.error('[CrimeCityScene] Could not restore the city camera:', cameraError);
      }
    };
    const onSuspend = () => recover(null, true);
    const start = async () => {
      try {
        const started = await this.goto(sceneKey, data);
        if (!started) recover();
        else cancel();
      } catch (error) { recover(error); }
    };
    const onFade = () => {
      if (!ownsTransition() || fadeHandled) return;
      fadeHandled = true; detachFade();
      if (!isCurrent()) { cancel(); return; }
      if (!guard()) { recover(); return; }
      void start();
    };
    this._crimeCityTransitionCleanup = cancel;
    this._crimeCityTransitionGuard = guard;
    try {
      this.events.once(events.SHUTDOWN, cancel);
      this.events.once(events.DESTROY, cancel);
      this.events.once(events.SLEEP, onSuspend);
      this.events.once(events.PAUSE, onSuspend);
      camera.once(fadeEvent, onFade);
      camera.fadeOut(350, 0, 0, 0);
      return true;
    } catch (error) { recover(error); return false; }
  }
};
