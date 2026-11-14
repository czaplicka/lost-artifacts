import { audioManager } from '../../managers/AudioManager.js';

export class CityLifecycle {
  bindLifecycleListeners() {
    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundCleanupScene
    );

    this.events.on(
      Phaser.Scenes.Events.WAKE,
      this.boundWakeOrResume
    );

    this.events.on(
      Phaser.Scenes.Events.RESUME,
      this.boundWakeOrResume
    );

    this.events.on(
      Phaser.Scenes.Events.SLEEP,
      this.boundSleep
    );
  }

  unbindLifecycleListeners() {
    this.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundCleanupScene
    );

    this.events.off(
      Phaser.Scenes.Events.WAKE,
      this.boundWakeOrResume
    );

    this.events.off(
      Phaser.Scenes.Events.RESUME,
      this.boundWakeOrResume
    );

    this.events.off(
      Phaser.Scenes.Events.SLEEP,
      this.boundSleep
    );
  }

  canUseCity() {
    return !this._cleanupDone && this.sys.isActive();
  }

  canStartInteraction() {
    return (
      this.canUseCity() &&
      this.uiReady &&
      !this.cityDebug?.enabled &&
      !this.isTransitioning &&
      !this.activePopup
    );
  }

  playCityAmbient() {
    if (this.cityAmbient?.isPlaying) return this.cityAmbient;

    this.cityAmbient = audioManager.playAmbient('citysound', {
      volume: 0.22,
      loop: true
    });

    return this.cityAmbient;
  }

  stopCityAmbient() {
    if (!this.cityAmbient) return;

    audioManager.releaseSound(this.cityAmbient);
    this.cityAmbient = null;
  }

  onWakeOrResume() {
    if (this._cleanupDone) return;

    this.isTransitioning = false;

    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);

    if (!this.cityAmbient?.isPlaying) {
      this.playCityAmbient();
    }

    this.refreshEncounterViews();

    void this.setupCityUi().then(ready => {
      if (ready && this.canUseCity()) {
        this.hideUiLoading();
        this.openInitialOverlayIfNeeded();
      } else if (this.canUseCity()) {
        this.showUiLoading(
          `Interface unavailable: ${(this._uiFailures || []).join(', ') || 'HUD startup'}.\nClick here to retry.`, true
        );
      }
    });
  }

  onSleep() {
    this.stopCityAmbient();
  }

  transitionTo(sceneKey, data = {}) {
    if (
      !sceneKey ||
      this.isTransitioning ||
      !this.canUseCity()
    ) {
      return false;
    }

    this.isTransitioning = true;

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        if (!this.canUseCity()) {
          this.isTransitioning = false;
          return;
        }

        void this.goto(sceneKey, data)
          .then(started => {
            if (!started && !this._cleanupDone) {
              this.isTransitioning = false;
              this.cameras.main.fadeIn(200, 0, 0, 0);
            }
          })
          .catch(error => {
            if (!this._cleanupDone) {
              console.error(
                `[CityScene] Transition to "${sceneKey}" failed:`,
                error
              );

              this.isTransitioning = false;
              this.cameras.main.fadeIn(200, 0, 0, 0);
            }
          });
      }
    );

    this.cameras.main.fadeOut(300, 0, 0, 0);
    return true;
  }

  cleanupScene() {
    this.cityDebug?.destroy();
    this.cityDebug = null;
    this.unbindLifecycleListeners();

    this._runToken = null;
    this.cancelUiWaits();

    this.isSettingUpUi = false;
    this.isTransitioning = false;
    this.uiReady = false;
    this._uiPromise = null;

    this.hideUiLoading();

    this.activePopup?.cleanup?.();
    this.activePopup = null;

    if (this.shopAssetHandler) {
      this.load.off(
        this.shopAssetHandler.event,
        this.shopAssetHandler.callback
      );

      this.shopAssetHandler = null;
    }

    this.destroyEncounterViews();
    this.destroyShopObjects();
    this.destroyHotelObjects();

    for (const object of this.interactiveObjects) {
      object?.removeAllListeners?.();
    }

    this.interactiveObjects = [];
    this.stopCityAmbient();

    this.stopSceneIfActive('ArrestSelectionScene');
    this.stopSceneIfActive('PhoneCallScene');
    this.stopSceneIfActive('HypothesisScene');
    this.stopSceneIfActive('ShopScene');
  }
}
