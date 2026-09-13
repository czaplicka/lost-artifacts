import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { audioManager } from '../AudioManager.js';
import { ensureAlibiEncounters } from '../AlibiEncounterSetup.js';
import { EventBus } from '../EventBus.js';

import { CrimeCityProgressService } from './crimeCity/CrimeCityProgressService.js';
import { CrimeCityReconstructionService } from './crimeCity/CrimeCityReconstructionService.js';
import { CrimeCityTutorialController } from './crimeCity/CrimeCityTutorialController.js';
import { CrimeCityMapUI } from './crimeCity/CrimeCityMapUI.js';
import { CrimeCityNpcManager } from './crimeCity/CrimeCityNpcManager.js';

export class CrimeCityScene extends BaseScene {
  constructor() {
    super({ key: 'CrimeCityScene' });

    this.cityId = null;
    this.cityData = null;
    this.crimeCityConfig = null;

    this.interactiveObjects = [];
    this.cityAmbient = null;

    this.progressService = null;
    this.reconstructionService = null;
    this.tutorialController = null;
    this.mapUI = null;
    this.npcManager = null;

    this.isSettingUpUi = false;
    this.isTransitioning = false;
  }

  init(data = {}) {
    const requestedCity =
      data.cityId ||
      gameState.crimeCityId ||
      gameState.currentMission?.city ||
      'paris';

    this.cityId = this.normalizeCityId(requestedCity);

    this.interactiveObjects = [];
    this.cityAmbient = null;
    this.isSettingUpUi = false;
    this.isTransitioning = false;

    this.destroyControllers();

    this.progressService = new CrimeCityProgressService(this);

    this.reconstructionService =
      new CrimeCityReconstructionService({
        cache: this.cache,
        gameState,
        cityId: this.cityId,
        getCaseKey: () => this.getCaseKey()
      });

    this.tutorialController =
      new CrimeCityTutorialController(this);

    this.tutorialController.initialize(data);

    this.mapUI = new CrimeCityMapUI(this);

    this.npcManager = new CrimeCityNpcManager(this);
  }

  normalizeCityId(value) {
    if (!value) {
      return 'paris';
    }

    const normalized = String(value)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');

    const aliases = {
      new_york: 'new_york_city',
      new_york_city: 'new_york_city',
      new_delhi: 'new_delhi',
      new_dehli: 'new_delhi',
      kotte: 'kotto',
      sri_jayawardenepura_kotte: 'kotto'
    };

    return aliases[normalized] || normalized;
  }

  create() {
    super.create();

    console.log('[CrimeCityScene] create started');

    if (!this?.scene?.manager?.keys) {
      console.error(
        '[CrimeCityScene] Scene manager is not accessible.'
      );

      return;
    }

    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.events.on(
      Phaser.Scenes.Events.WAKE,
      this.onWakeOrResume,
      this
    );

    this.events.on(
      Phaser.Scenes.Events.RESUME,
      this.onWakeOrResume,
      this
    );

    this.events.on(
      Phaser.Scenes.Events.SLEEP,
      this.onSleep,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanupScene,
      this
    );

    try {
      this.initializeCrimeCity();
      this.createCrimeCityContent();

      void this.setupCrimeCityUi();

      this.scheduleStoryEvents();
    } catch (error) {
      console.error(
        '[CrimeCityScene] Main initialization failed.',
        error
      );
    }
  }

  /**
   * Przywraca wszystkie elementy interface po TravelTransitionScene:
   *
   * - UIScene: górny HUD HTML
   * - PlayerHudScene: menu na dole i panele Phaser
   * - NewsHud: zakładka NEWS; w Crime City gazeta jest dostępna,
   *   TV jest ukryte
   */
  async setupCrimeCityUi() {
    if (this.isSettingUpUi || this._cleanupDone) {
      return;
    }

    this.isSettingUpUi = true;

    try {
      const uiScene = await this.ensureOverlayScene(
        'UIScene'
      );

      if (this._cleanupDone || !this.sys.isActive()) {
        return;
      }

      if (uiScene) {
        this.game.events.emit('setHudVisible', true);
        EventBus.emit('showHUD');

        uiScene.refreshScoreHud?.();
        uiScene.refreshMoneyHud?.();
        uiScene.updateEnergy?.();
        uiScene.updateTime?.({
          day: gameState.currentDay || gameState.day || 1,
          hour: gameState.currentHour ?? gameState.hour ?? 8,
          minute:
            gameState.currentMinute ??
            gameState.minute ??
            0,
          partOfDay:
            gameState.currentPartOfDay ||
            gameState.partOfDay ||
            'Morning'
        });
      } else {
        console.warn(
          '[CrimeCityScene] UIScene could not be restored.'
        );
      }

      const playerHud = await this.restorePlayerHud();

      if (this._cleanupDone || !this.sys.isActive()) {
        return;
      }

      if (playerHud) {
        playerHud.setCurrentGameplayScene('CrimeCityScene');
        playerHud.closeAllUIPanels?.();
        playerHud.refreshNotebook?.();
        playerHud.refreshUI?.();
      } else {
        console.warn(
          '[CrimeCityScene] PlayerHudScene could not be restored.'
        );
      }

      const newsHud = await this.ensureOverlayScene(
        'NewsHud'
      );

      if (this._cleanupDone || !this.sys.isActive()) {
        return;
      }

      if (newsHud) {
        newsHud.events?.emit(
          'setNewspaperVisible',
          true
        );

        newsHud.events?.emit(
          'setTvVisible',
          false
        );

        this.bringSceneToTopIfActive('NewsHud');
      } else {
        console.warn(
          '[CrimeCityScene] NewsHud could not be restored.'
        );
      }
    } catch (error) {
      if (!this._cleanupDone) {
        console.error(
          '[CrimeCityScene] Failed to restore gameplay UI:',
          error
        );
      }
    } finally {
      this.isSettingUpUi = false;
    }
  }

  initializeCrimeCity() {
    const locations = this.cache.json.get('locations');

    this.cityData = Array.isArray(locations)
      ? locations.find(
        (location) =>
          location?.id === this.cityId ||
          this.normalizeCityId(location?.city) ===
            this.cityId
      )
      : null;

    if (!this.cityData?.crimeCity) {
      console.error(
        '[CrimeCityScene] Missing city or crimeCity configuration.',
        {
          cityId: this.cityId,
          cityData: this.cityData,
          locations
        }
      );

      return;
    }

    this.crimeCityConfig = this.cityData.crimeCity;

    gameState.currentCityId = this.cityId;
    gameState.currentCity = this.cityData.city;
    gameState.currentCountry = this.cityData.country;

    this.registry.set('currentCityId', this.cityId);
    this.registry.set('currentCity', this.cityData.city);

    this.progressService.initializeCurrentNode();

    audioManager.init(this);

    if (!audioManager.isMusicPlaying('themeGame')) {
      audioManager.playMusic('themeGame', {
        loop: true
      });
    }

    this.playCityAmbient();
  }

  playCityAmbient() {
    if (this.cityAmbient?.isPlaying) {
      return this.cityAmbient;
    }

    this.cityAmbient = audioManager.playAmbient(
      'citysound',
      {
        volume: 0.22,
        loop: true
      }
    );

    return this.cityAmbient;
  }

  createCrimeCityContent() {
    if (!this.cityData?.crimeCity) {
      return;
    }

    this.mapUI?.createBackground();
    this.mapUI?.createHeader();

    const crimeSceneCompleted =
      this.isCrimeSceneCompleted();

    const crimeLabCompleted =
      this.isCrimeLabCompleted();

    const gridCompleted =
      this.isGridCompleted();

    this.mapUI?.createAvailableLocations({
      crimeSceneCompleted,
      crimeLabCompleted,
      gridCompleted
    });

    if (crimeLabCompleted) {
      ensureAlibiEncounters(this.getCaseKey());
    }

    if (crimeLabCompleted && gridCompleted) {
      this.npcManager?.createNpcSpots();

      this.tutorialController?.scheduleSuspectTutorial();
    }
  }

  scheduleStoryEvents() {
    this.tutorialController
      ?.scheduleLabCompletionPhoneCall();
  }

  openCrimeScene() {
    if (this.isTransitioning || this._cleanupDone) {
      return;
    }

    const mission = gameState.currentMission;

    if (!mission?.scene) {
      console.error(
        '[CrimeCityScene] Mission has no scene.',
        {
          mission
        }
      );

      this.showMessage(
        [
          'This case has no crime-scene data yet.',
          'Even the chalk outline is confused.'
        ].join('\n'),
        2600,
        '#5d2a00'
      );

      return;
    }

    const reconstruction =
      this.reconstructionService?.prepareReconstruction();

    if (!reconstruction) {
      this.showMessage(
        [
          'The case reconstruction could not be prepared.',
          'The evidence board is having an existential crisis.'
        ].join('\n'),
        3200,
        '#8b0000'
      );

      return;
    }

    const foundCardIds =
      reconstruction.foundCardIds || [];

    if (
      !Array.isArray(foundCardIds) ||
      foundCardIds.length !== 6
    ) {
      console.error(
        '[CrimeCityScene] Reconstruction has an invalid hidden-objects set.',
        {
          caseKey: this.getCaseKey(),
          sceneId: mission.scene,
          foundCardIds,
          reconstruction
        }
      );

      this.showMessage(
        [
          'The case produced an invalid evidence set.',
          'Check the reconstruction generator data.'
        ].join('\n'),
        3200,
        '#8b0000'
      );

      return;
    }

    console.log(
      '[CrimeCityScene] Reconstruction ready before Hidden Objects.',
      {
        caseKey: this.getCaseKey(),
        sceneId: mission.scene,
        thiefId: reconstruction.thiefId,
        thiefSkills: reconstruction.thiefSkills,
        claims: reconstruction.claims?.map(
          (claim) => ({
            questionId: claim.questionId,
            solutionItemId: claim.solutionItemId,
            thiefSkill: claim.thiefSkill
          })
        ),
        foundCardIds
      }
    );

    if (!this.moveToCrimeCityNode('crime_scene')) {
      return;
    }

    if (!this.trySpendEnergy('activity', 'crime_scene')) {
      return;
    }

    this.closeAllUIPanels();

    this.transitionTo('HiddenObjectsScene', {
      sceneId: mission.scene,
      mapKey: mission.scene,
      mapPath: `assets/crimes/${mission.scene}.json`,
      backgroundMode: 'image',
      backgroundKey: `${mission.scene}_bg`,
      backgroundPath: `assets/crimes/${mission.scene}.jpg`,
      objectLayerName: 'HiddenObjects',
      objectsDataKey: 'objects-data',
      objectsDataPath: 'assets/data/objects.json',
      itemSceneKey: mission.scene,
      activeCount: 6,
      timeLimit: 120,
      title: `Crime Scene – ${this.cityData.city}`,
      returnScene: 'CrimeCityScene',
      returnData: {
        cityId: this.cityId
      },
      cityId: this.cityId,
      sourceScene: 'CrimeCityScene',
      mission
    });
  }

  getCaseKey() {
    return this.progressService?.getCaseKey() || null;
  }

  getCrimeCityProgress() {
    return this.progressService?.getCrimeCityProgress() || null;
  }

  hasPaidCrimeLabEntry() {
    return this.progressService?.hasPaidCrimeLabEntry() || false;
  }

  payCrimeLabEntryOnce() {
    return this.progressService?.payCrimeLabEntryOnce() || false;
  }

  moveToCrimeCityNode(
    targetNodeId,
    transportType = 'taxi'
  ) {
    return this.progressService?.moveToCrimeCityNode(
      targetNodeId,
      transportType
    ) || false;
  }

  trySpendEnergy(category, key) {
    return this.progressService?.trySpendEnergy(
      category,
      key
    ) || false;
  }

  isCrimeSceneCompleted() {
    return this.progressService?.isCrimeSceneCompleted() || false;
  }

  isCrimeLabCompleted() {
    return this.progressService?.isCrimeLabCompleted() || false;
  }

  isGridCompleted() {
    return this.progressService?.isGridCompleted() || false;
  }

  transitionTo(sceneKey, data = {}) {
    if (
      this.isTransitioning ||
      this._cleanupDone ||
      !this.sys.isActive()
    ) {
      return false;
    }

    this.isTransitioning = true;

    this.cameras.main.fadeOut(350, 0, 0, 0);

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        if (!this.sys.isActive() || this._cleanupDone) {
          this.isTransitioning = false;
          return;
        }

        void this.goto(sceneKey, data)
          .catch((error) => {
            console.error(
              `[CrimeCityScene] Transition to "${sceneKey}" failed:`,
              error
            );
          })
          .finally(() => {
            this.isTransitioning = false;
          });
      }
    );

    return true;
  }

  showNoEnergyPopup() {
    this.showMessage(
      [
        "You're too exhausted, detective.",
        'Get some rest before continuing the case.'
      ].join('\n'),
      2400,
      '#8b0000'
    );
  }

  showMessage(
    text,
    duration = 2200,
    color = '#37474f'
  ) {
    if (!text || this._cleanupDone || !this.sys.isActive()) {
      return null;
    }

    const popup = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2,
        text,
        {
          fontFamily: 'SpecialElite',
          fontSize: '19px',
          color: '#ffffff',
          backgroundColor: color,
          padding: {
            x: 24,
            y: 16
          },
          align: 'center'
        }
      )
      .setOrigin(0.5)
      .setDepth(200);

    this.time.delayedCall(duration, () => {
      if (popup?.active) {
        popup.destroy();
      }
    });

    return popup;
  }

  closeAllUIPanels() {
    const playerHud = this.getPlayerHudScene();

    playerHud?.closeAllUIPanels?.();
  }

  onWakeOrResume() {
    if (this._cleanupDone) {
      return;
    }

    this.isTransitioning = false;

    if (!this.cityAmbient?.isPlaying) {
      this.playCityAmbient();
    }

    void this.setupCrimeCityUi();
  }

  onSleep() {
    if (this.cityAmbient?.isPlaying) {
      this.cityAmbient.pause();
    }
  }

  cleanupScene() {
    this.isTransitioning = false;
    this.isSettingUpUi = false;

    this.interactiveObjects.forEach((object) => {
      object?.removeAllListeners?.();
    });

    this.interactiveObjects = [];

    this.stopCityAmbient();
    this.destroyControllers();
  }

  stopCityAmbient() {
    if (!this.cityAmbient) {
      return;
    }

    try {
      if (this.cityAmbient.isPlaying) {
        this.cityAmbient.stop();
      }

      if (!this.cityAmbient.pendingRemove) {
        this.cityAmbient.destroy();
      }
    } catch (error) {
      console.warn(
        '[CrimeCityScene] Ambient cleanup failed.',
        error
      );
    }

    this.cityAmbient = null;
  }

  destroyControllers() {
    this.tutorialController?.destroy();
    this.tutorialController = null;

    this.npcManager?.destroy();
    this.npcManager = null;

    this.mapUI?.destroy();
    this.mapUI = null;

    this.reconstructionService = null;

    this.progressService?.destroy();
    this.progressService = null;
  }
}