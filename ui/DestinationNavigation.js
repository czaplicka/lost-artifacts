import { gameState } from '../GameData.js';
const NAVIGATION_SCENES = new Set([
  "GameScene",
  "OfficeScene",
  "CityScene",
  "CrimeCityScene",
  "LocationScene",
  "HiddenObjectsScene",
  "CrimeLabScene",
  "HotelScene",
  "ShopScene",
  "ApartmentScene",
  "DetectiveOfficeScene",
  "HomeCityScene",
  "ArchiveScene",
  "AgencyStorageScene"
]);

export class DestinationNavigation {
  getRegisteredScene(key) {
    return this.scene?.scene?.manager?.keys?.[key] || null;
  }

  getNavigationScene() {
    const owner = this.scene;
    const manager = owner?.scene?.manager;
    if (!owner?.sys || !manager) return null;

    const valid = candidate => Boolean(
      candidate?.sys?.isActive() &&
      !candidate._cleanupDone &&
      NAVIGATION_SCENES.has(candidate.sys.settings.key)
    );
    // SceneManager order is the rendering order. Only real locations qualify;
    // boot, news, loading and story overlays must never become travel sources.
    const active = manager.getScenes(true).filter(valid);
    const source = valid(owner) ? owner : active[active.length - 1];
    if (!source) {
      console.error('[DestinationsUI] No active navigation scene.', {
        ownerScene: owner.sys.settings.key,
        hudSceneKey: manager.keys.PlayerHudScene?.currentGameplaySceneKey,
        activeScenes: manager.getScenes(true).map(s => s.sys.settings.key)
      });
      return null;
    }
    const key = source.sys.settings.key;
    const hud = manager.keys.PlayerHudScene;
    owner.registry?.set('currentSceneKey', key);
    if (hud && hud.currentGameplaySceneKey !== key) {
      hud.setCurrentGameplayScene(key);
    }
    return source;
  }

  getOfficeNavigationScene() {
    return this.getNavigationScene();
  }

  async ensureSceneRegistered(key) {
    const loader = this.scene?.game?.sceneLoader;

    if (loader) {
      await loader.ensure(key);
    }

    if (!this.getRegisteredScene(key)) {
      throw new Error(
        `${key} is not registered. Check sceneRegistry.js.`
      );
    }
  }

  async navigateFrom(sourceScene, targetKey, data) {
    if (!sourceScene?.sys?.isActive() || sourceScene._cleanupDone) {
      throw new Error('The source scene is unavailable.');
    }

    if (typeof sourceScene.goto === 'function') {
      return sourceScene.goto(targetKey, data);
    }

    const loader = sourceScene.game?.sceneLoader;

    if (loader) {
      return loader.goto(sourceScene, targetKey, data);
    }

    if (!sourceScene.scene.manager.keys[targetKey]) {
      throw new Error(
        `Scene "${targetKey}" is not registered.`
      );
    }

    sourceScene.scene.start(targetKey, data);
    return true;
  }

  async enterOffice() {
    if (
      this.isTransitioning ||
      this.isDestroyed ||
      this.committedTravelPayload
    ) {
      return false;
    }

    const source = this.getNavigationScene();

    if (!source) {
      this.showTravelError(
        'Could not determine the current location.'
      );
      return false;
    }

    const targetKey = 'DetectiveOfficeScene';

    if (source.sys.settings.key === targetKey) {
      this.close();
      return true;
    }

    this.isTransitioning = true;
    this.setConfirmEnabled(false);
    this.updateHQButton();
    this.updateOfficeButton();

    try {
      await this.ensureSceneRegistered(targetKey);

      if (this.isDestroyed) return false;

      this.close({ restoreHud: false });

      const opened = await this.navigateFrom(
        source,
        targetKey,
        {
          entrySource: 'destinations',
          fromDestinations: true,
          fromScene: source.sys.settings.key
        }
      );

      if (opened === false) {
        throw new Error('PI office transition returned false.');
      }

      return true;
    } catch (error) {
      console.error(
        '[DestinationsUI] Failed to enter PI office:',
        error
      );

      if (
        !this.isDestroyed &&
        this.scene?.sys?.isActive()
      ) {
        this.isTransitioning = false;

        if (!this.isOpen) {
          this.open(this.gameState || gameState);
        }

        this.showTravelError(
          'The PI office could not be opened. Check the console.'
        );
      }

      return false;
    } finally {
      if (!this.isDestroyed) {
        this.isTransitioning = false;
        this.updateHQButton();
        this.updateOfficeButton();
      }
    }
  }
}
