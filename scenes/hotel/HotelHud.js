import { EventBus } from '../../EventBus.js';
import { gameState } from '../../GameData.js';


export class HotelHud {
  constructor(scene) {
    this.scene = scene;
    this.waitCancels = new Set();
    this.isSettingUp = false;
  }


  isAlive() {
    return !this.scene._cleanupDone && this.scene.sys.isActive();
  }


  cancelWaits() {
    [...this.waitCancels].forEach((cancel) => cancel());
    this.waitCancels.clear();
  }


  setContext(playerHud = null) {
    const hud = playerHud || this.scene.getPlayerHudScene();

    if (!hud?.isHudReady) {
      return false;
    }

    hud.setCurrentGameplayScene('HotelScene');

    return true;
  }


  waitForOverlayReady(sceneKey, timeoutMs = 5000) {
    const scene = this.scene;

    if (!this.isAlive()) {
      return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
      let finished = false;
      let timeoutId = null;

      const removeListeners = () => {
        scene.events.off(
          Phaser.Scenes.Events.POST_UPDATE,
          checkReady
        );

        this.waitCancels.delete(cancel);

        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      const finish = (overlay) => {
        if (finished) {
          return;
        }

        finished = true;
        removeListeners();
        resolve(overlay);
      };

      const cancel = () => finish(null);

      const checkReady = () => {
        if (!this.isAlive()) {
          finish(null);
          return;
        }

        const overlay = scene.getRegisteredScene(sceneKey);

        if (!overlay || !scene.isSceneActive(sceneKey)) {
          return;
        }

        if (
          sceneKey === 'PlayerHudScene' &&
          !overlay.isHudReady
        ) {
          return;
        }

        finish(overlay);
      };

      this.waitCancels.add(cancel);

      scene.events.on(
        Phaser.Scenes.Events.POST_UPDATE,
        checkReady
      );

      timeoutId = window.setTimeout(() => {
        if (finished) {
          return;
        }

        finished = true;
        removeListeners();

        reject(
          new Error(
            `[HotelScene] "${sceneKey}" was not ready within ${timeoutMs} ms.`
          )
        );
      }, timeoutMs);

      checkReady();
    });
  }


  async ensureReadyOverlay(sceneKey, data = {}) {
    await this.scene.ensureOverlayScene(sceneKey, data);

    if (!this.isAlive()) {
      return null;
    }

    return this.waitForOverlayReady(sceneKey);
  }


  async ensurePlayerHud() {
    const playerHud = await this.ensureReadyOverlay('PlayerHudScene');

    if (playerHud) {
      this.scene.bringSceneToTopIfActive('PlayerHudScene');
    }

    return playerHud;
  }


  async setup() {
    const scene = this.scene;

    if (this.isSettingUp || !this.isAlive()) {
      return;
    }

    this.isSettingUp = true;

    try {
      const playerHud = await this.ensurePlayerHud();

      if (!this.isAlive()) {
        return;
      }

      if (!playerHud) {
        console.warn('[HotelScene] PlayerHudScene could not be restored.');
        return;
      }

      this.setContext(playerHud);

      playerHud.closeAllUIPanels?.();
      playerHud.refreshNotebook?.();
      playerHud.refreshUI?.();

      scene.timeManager = playerHud.timeManager || null;

      console.log('[HotelScene] Bottom HUD ready:', {
        ready: playerHud.isHudReady,
        active: scene.isSceneActive('PlayerHudScene'),
        visible: playerHud.sys.settings.visible,
        context: playerHud.currentGameplaySceneKey
      });

      const uiScene = await this.ensureReadyOverlay('UIScene');

      if (!this.isAlive()) {
        return;
      }

      if (uiScene) {
        scene.game.events.emit('setHudVisible', true);
        EventBus.emit('showHUD');

        uiScene.refreshScoreHud?.();
        uiScene.refreshMoneyHud?.();
        uiScene.updateEnergy?.();

        uiScene.updateTime?.({
          day: gameState.currentDay || gameState.day || 1,
          hour: gameState.currentHour ?? gameState.hour ?? 8,
          minute: gameState.currentMinute ?? gameState.minute ?? 0,
          partOfDay:
            gameState.currentPartOfDay ||
            gameState.partOfDay ||
            'Morning'
        });
      }

      await this.showNews();

      if (!this.isAlive()) {
        return;
      }

      this.setContext(playerHud);
      scene.bringSceneToTopIfActive('PlayerHudScene');
    } catch (error) {
      if (!scene._cleanupDone) {
        console.error('[HotelScene] Failed to configure HUD scenes:', error);
      }
    } finally {
      this.isSettingUp = false;
    }
  }


  async showNews() {
    const scene = this.scene;

    if (!this.isAlive()) {
      return false;
    }

    const newsHud = await this.ensureReadyOverlay('NewsHud');

    if (!this.isAlive()) {
      return false;
    }

    if (!newsHud) {
      console.warn('[HotelScene] NewsHud could not be opened.');
      return false;
    }

    newsHud.events?.emit('setNewspaperVisible', true);
    newsHud.events?.emit('setTvVisible', true);

    scene.bringSceneToTopIfActive('NewsHud');

    return true;
  }


  destroy() {
    this.cancelWaits();
    this.isSettingUp = false;
  }
}