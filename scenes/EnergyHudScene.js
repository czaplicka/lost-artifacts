import { EnergyHud } from '../ui/EnergyHud.js';
import { getEnergyManager } from '../EnergyManager.js';
import { gameState } from '../GameData.js';

// ============================================================
// EnergyHudScene.js
// Phaser Scene dedykowana do wyświetlania energii gracza
// Uruchamiana równolegle z UIScene i powyżej niej
// ============================================================

export class EnergyHudScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EnergyHudScene' });
    this.energyHud = null;
    this.energyManager = null;
  }

  create() {
    this.energyManager = getEnergyManager();

    // Inicjalizuj energyHud
    this.energyHud = new EnergyHud(this);

    // Ustaw wysoką głębokość żeby było powyżej wszystkiego
    this.energyHud.container?.setDepth(10000);

    // Cleanup przy shutdown
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanup();
    });

    this.events.on(Phaser.Scenes.Events.SLEEP, () => {
      // Pause animation
      if (this.energyHud?.heartbeatTween) {
        this.energyHud.heartbeatTween.pause();
      }
    });

    this.events.on(Phaser.Scenes.Events.WAKE, () => {
      // Resume animation
      if (this.energyHud?.heartbeatTween) {
        this.energyHud.heartbeatTween.resume();
      }
    });
  }

  cleanup() {
    if (this.energyHud) {
      this.energyHud.destroy();
      this.energyHud = null;
    }
  }

  /**
   * Public API: Consume energy for travel
   */
  consumeTravel(transportType = 'train') {
    return this.energyManager.consumeTravel(transportType);
  }

  /**
   * Public API: Consume energy for interview
   */
  consumeInterview(duration = 'medium') {
    return this.energyManager.consumeInterview(duration);
  }

  /**
   * Public API: Consume energy for activity
   */
  consumeActivity(activityType = 'minigame_forensic') {
    return this.energyManager.consumeActivity(activityType);
  }

  /**
   * Public API: Sleep
   */
  sleep(sleepHours = 8) {
    return this.energyManager.sleep(sleepHours);
  }

  /**
   * Public API: Eat
   */
  eat(foodQuality = 'normal') {
    return this.energyManager.eat(foodQuality);
  }

  /**
   * Public API: Drink
   */
  drink(drinkQuality = 'normal') {
    return this.energyManager.drink(drinkQuality);
  }

  /**
   * Public API: Get current energy
   */
  getCurrentEnergy() {
    return this.energyManager.getCurrentEnergy();
  }

  /**
   * Public API: Get energy status
   */
  getEnergyStatus() {
    return this.energyManager.getEnergyStatus();
  }
}

export default EnergyHudScene;