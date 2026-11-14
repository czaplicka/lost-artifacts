import { gameState } from '../../GameData.js';
import { getEnergyManager } from '../../managers/EnergyManager.js';
import { saveGameState } from '../../gameStatePersistence.js';

const SHOP_TAXI_ENERGY = 3;
const LOCAL_ACTIVITY_BY_NODE = Object.freeze({
  crime_scene: 'crime_scene', crime_lab: 'csi_lab', apartment: 'apartment_visit'
});

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
      this.showMessage(energy.getInsufficientEnergyMessage(costs.totalCost), 3200, '#8b0000');
      return false;
    }
    return true;
  },

  visitShop() {
    if (this.isTransitioning || this._cleanupDone || !this.sys.isActive()) return false;
    if (getEnergyManager().getCurrentEnergy() < SHOP_TAXI_ENERGY) {
      this.showNoEnergyPopup(); return false;
    }
    this.closeAllUIPanels();
    this.isTransitioning = true;
    void this.openShopOverlay();
    return true;
  },

  async openShopOverlay() {
    try {
      if (this.game.sceneLoader) await this.game.sceneLoader.ensure('ShopScene');
      if (this._cleanupDone || !this.sys.isActive()) return false;
      if (!this.hasScene('ShopScene')) throw new Error('ShopScene is not registered.');
      const energy = getEnergyManager();
      if (energy.getCurrentEnergy() < SHOP_TAXI_ENERGY) { this.showNoEnergyPopup(); return false; }
      const opened = await this.launchOverlay('ShopScene', { cityId: this.cityId, returnScene: 'CrimeCityScene' });
      if (this._cleanupDone || !this.sys.isActive()) return false;
      if (!opened) {
        this.showMessage('The shop could not be opened.\nPlease try again.', 2800, '#8b0000');
        return false;
      }
      if (energy.getCurrentEnergy() < SHOP_TAXI_ENERGY) {
        this.scene.stop('ShopScene'); this.showNoEnergyPopup();
        void this.setupCrimeCityUi(); return false;
      }
      energy.consumeCustom(SHOP_TAXI_ENERGY, 'Taxi to shop: -3');
      saveGameState();
      this.getSceneIfActive('UIScene')?.updateEnergy?.();
      this.scene.pause();
      return true;
    } catch (error) {
      console.error('[CrimeCityScene] Opening ShopScene failed:', error);
      if (!this._cleanupDone && this.sys.isActive()) {
        this.scene.stop('ShopScene');
        this.showMessage('The shop could not be opened.\nCheck the console for details.', 3200, '#8b0000');
        void this.setupCrimeCityUi();
      }
      return false;
    } finally { this.isTransitioning = false; }
  },

  openCrimeScene() {
    if (this.isTransitioning || this._cleanupDone || !this.sys.isActive()) return;
    const mission = gameState.currentMission;
    if (!mission?.scene) {
      this.showMessage('This case has no crime-scene data yet.\nEven the chalk outline is confused.', 2600, '#5d2a00');
      return;
    }
    const reconstruction = this.reconstructionService?.prepareReconstruction();
    if (!reconstruction) {
      this.showMessage('The case reconstruction could not be prepared.\nThe evidence board is having an existential crisis.', 3200, '#8b0000');
      return;
    }
    const foundCardIds = reconstruction.foundCardIds || [];
    if (!Array.isArray(foundCardIds) || foundCardIds.length !== 6) {
      console.error('[CrimeCityScene] Invalid evidence set:', reconstruction);
      this.showMessage('The case produced an invalid evidence set.\nCheck the reconstruction generator data.', 3200, '#8b0000');
      return;
    }
    if (!this.canAffordLocalActivity('crime_scene')) return;
    if (!this.moveToCrimeCityNode('crime_scene')) return;
    if (!this.trySpendEnergy('activity', 'crime_scene')) return;
    this.closeAllUIPanels();
    this.transitionTo('HiddenObjectsScene', {
      sceneId: mission.scene, mapKey: mission.scene, mapPath: `assets/crimes/${mission.scene}.json`,
      backgroundMode: 'image', backgroundKey: `${mission.scene}_bg`,
      backgroundPath: `assets/crimes/${mission.scene}.jpg`, objectLayerName: 'HiddenObjects',
      objectsDataKey: 'objects-data', objectsDataPath: 'assets/data/objects.json', itemSceneKey: mission.scene,
      activeCount: 6, timeLimit: 120, title: `Crime Scene – ${this.cityData.city}`,
      returnScene: 'CrimeCityScene', returnData: { cityId: this.cityId },
      cityId: this.cityId, sourceScene: 'CrimeCityScene', mission
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

  transitionTo(sceneKey, data = {}) {
    if (this.isTransitioning || this._cleanupDone || !this.sys.isActive()) return false;
    const token = this._runToken;
    this.isTransitioning = true;
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (!this.isCurrentRun(token)) return;
      void this.goto(sceneKey, data).then(started => {
        if (!started && this.isCurrentRun(token)) {
          this.isTransitioning = false; this.cameras.main.fadeIn(200, 0, 0, 0);
        }
      }).catch(error => {
        if (!this.isCurrentRun(token)) return;
        console.error(`[CrimeCityScene] Transition to ${sceneKey} failed:`, error);
        this.isTransitioning = false; this.cameras.main.fadeIn(200, 0, 0, 0);
      });
    });
    this.cameras.main.fadeOut(350, 0, 0, 0);
    return true;
  }
};
