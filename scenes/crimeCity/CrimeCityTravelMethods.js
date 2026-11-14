import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
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
      this.showMessage(energy.getInsufficientEnergyMessage(costs.totalCost), 3200, __dialogueText("scenes/crimeCity/CrimeCityTravelMethods.js", "t_f27f7bc32875ed02b2fc"));
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
        this.showMessage(__dialogueText("scenes/crimeCity/CrimeCityTravelMethods.js", "t_d353443b02f69822ebb5"), 2800, __dialogueText("scenes/crimeCity/CrimeCityTravelMethods.js", "t_f27f7bc32875ed02b2fc"));
        return false;
      }
      if (energy.getCurrentEnergy() < SHOP_TAXI_ENERGY) {
        this.scene.stop('ShopScene'); this.showNoEnergyPopup();
        void this.setupCrimeCityUi(); return false;
      }
      energy.consumeCustom(SHOP_TAXI_ENERGY, __dialogueText("scenes/crimeCity/CrimeCityTravelMethods.js", "t_75c02d2cc7f1977fe289"));
      saveGameState();
      this.getSceneIfActive('UIScene')?.updateEnergy?.();
      this.scene.pause();
      return true;
    } catch (error) {
      console.error('[CrimeCityScene] Opening ShopScene failed:', error);
      if (!this._cleanupDone && this.sys.isActive()) {
        this.scene.stop('ShopScene');
        this.showMessage(__dialogueText("scenes/crimeCity/CrimeCityTravelMethods.js", "t_604876cf3a540f124474"), 3200, __dialogueText("scenes/crimeCity/CrimeCityTravelMethods.js", "t_f27f7bc32875ed02b2fc"));
        void this.setupCrimeCityUi();
      }
      return false;
    } finally { this.isTransitioning = false; }
  },

  openCrimeScene() {
    if (this.isTransitioning || this._cleanupDone || !this.sys.isActive()) return;
    const mission = gameState.currentMission;
    if (!mission?.scene) {
      this.showMessage(__dialogueText("scenes/crimeCity/CrimeCityTravelMethods.js", "t_3c0e1733da49d99b82b9"), 2600, __dialogueText("scenes/crimeCity/CrimeCityTravelMethods.js", "t_e09afad9b0dfcb2294f9"));
      return;
    }
    const reconstruction = this.reconstructionService?.prepareReconstruction();
    if (!reconstruction) {
      this.showMessage(__dialogueText("scenes/crimeCity/CrimeCityTravelMethods.js", "t_cdc0be26e1f92f0b84ee"), 3200, __dialogueText("scenes/crimeCity/CrimeCityTravelMethods.js", "t_f27f7bc32875ed02b2fc"));
      return;
    }
    const foundCardIds = reconstruction.foundCardIds || [];
    if (!Array.isArray(foundCardIds) || foundCardIds.length !== 6) {
      console.error('[CrimeCityScene] Invalid evidence set:', reconstruction);
      this.showMessage(__dialogueText("scenes/crimeCity/CrimeCityTravelMethods.js", "t_a841f6df00da50b5873b"), 3200, __dialogueText("scenes/crimeCity/CrimeCityTravelMethods.js", "t_f27f7bc32875ed02b2fc"));
      return;
    }
    if (!this.canAffordLocalActivity('crime_scene')) return;
    if (!this.moveToCrimeCityNode('crime_scene')) return;
    if (!this.trySpendEnergy('activity', 'crime_scene')) return;
    this.closeAllUIPanels();
    this.transitionTo('HiddenObjectsScene', {
      sceneId: mission.scene, mapKey: mission.scene, mapPath: `${__dialogueText("scenes/crimeCity/CrimeCityTravelMethods.js", "t_6b9b2f83e78caa08cfb1")}${mission.scene}${__dialogueText("scenes/crimeCity/CrimeCityTravelMethods.js", "t_12157ab04ed2c6accc3d")}`,
      backgroundMode: 'image', backgroundKey: `${mission.scene}_bg`,
      backgroundPath: `${__dialogueText("scenes/crimeCity/CrimeCityTravelMethods.js", "t_6b9b2f83e78caa08cfb1")}${mission.scene}${__dialogueText("scenes/crimeCity/CrimeCityTravelMethods.js", "t_d912c70acf20eda7217a")}`, objectLayerName: 'HiddenObjects',
      objectsDataKey: 'objects-data', objectsDataPath: 'assets/data/objects.json', itemSceneKey: mission.scene,
      activeCount: 6, timeLimit: 120, title: `${__dialogueText("scenes/crimeCity/CrimeCityTravelMethods.js", "t_fdebfb989db84b0aeddf")}${this.cityData.city}`,
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
