import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { audioManager } from '../AudioManager.js';
import { ensureAlibiEncounters } from '../AlibiEncounterSetup.js';

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

    this.boundShutdown = null;
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

    this.boundShutdown = this.onShutdown.bind(this);

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundShutdown
    );

    try {
      this.configureNewsHud();
      this.configureUIScene();
      this.initializeCrimeCity();
      this.createCrimeCityContent();
      this.refreshPlayerHud();
      this.scheduleStoryEvents();
    } catch (error) {
      console.error(
        '[CrimeCityScene] Main initialization failed.',
        error
      );
    }
  }

  configureNewsHud() {
    try {
      const newsHud =
        this.scene.manager.keys.NewsHud;

      if (
        newsHud &&
        newsHud.sys &&
        newsHud.sys.isActive?.()
      ) {
        newsHud.events?.emit(
          'setNewspaperVisible',
          true
        );

        newsHud.events?.emit(
          'setTvVisible',
          false
        );

        return;
      }

      console.warn(
        '[CrimeCityScene] NewsHud unavailable or inactive.'
      );
    } catch (error) {
      console.warn(
        '[CrimeCityScene] NewsHud setup failed.',
        error.message
      );
    }
  }

  configureUIScene() {
    try {
      const uiScene =
        this.scene.manager.keys.UIScene;

      if (!uiScene?.sys) {
        console.warn(
          '[CrimeCityScene] UIScene unavailable.'
        );

        return;
      }

      if (this.scene.isActive('UIScene')) {
        this.scene.bringToTop('UIScene');
        return;
      }

      if (this.scene.isSleeping('UIScene')) {
        this.scene.wake('UIScene');
        this.scene.bringToTop('UIScene');
        return;
      }

      this.scene.launch('UIScene');
      this.scene.bringToTop('UIScene');
    } catch (error) {
      console.warn(
        '[CrimeCityScene] UIScene setup failed.',
        error.message
      );
    }
  }

  initializeCrimeCity() {
    const locations =
      this.cache.json.get('locations');

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

    this.crimeCityConfig =
      this.cityData.crimeCity;

    gameState.currentCityId = this.cityId;
    gameState.currentCity = this.cityData.city;
    gameState.currentCountry = this.cityData.country;

    this.progressService.initializeCurrentNode();

    audioManager.init(this);

    if (!audioManager.isMusicPlaying('themeGame')) {
      audioManager.playMusic('themeGame', {
        loop: true
      });
    }

    this.cityAmbient = audioManager.playAmbient(
      'citysound',
      {
        volume: 0.22,
        loop: true
      }
    );
  }

  createCrimeCityContent() {
    if (!this.cityData?.crimeCity) {
      return;
    }

    this.mapUI.createBackground();
    this.mapUI.createHeader();

    const crimeSceneCompleted =
      this.isCrimeSceneCompleted();

    const crimeLabCompleted =
      this.isCrimeLabCompleted();

    const gridCompleted =
      this.isGridCompleted();

    this.mapUI.createAvailableLocations({
      crimeSceneCompleted,
      crimeLabCompleted,
      gridCompleted
    });

    if (crimeLabCompleted) {
      ensureAlibiEncounters(
        this.getCaseKey()
      );
    }

    if (crimeLabCompleted && gridCompleted) {
      this.npcManager.createNpcSpots();

      this.tutorialController
        .scheduleSuspectTutorial();
    }
  }

  refreshPlayerHud() {
  const uiScene =
    this.scene.manager.keys.UIScene;

  if (uiScene?.sys) {
    if (this.scene.isSleeping('UIScene')) {
      this.scene.wake('UIScene');
    } else if (this.scene.isPaused('UIScene')) {
      this.scene.resume('UIScene');
    } else if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }
    uiScene.refreshScoreHud?.();
  }

  const playerHud =
    this.scene.manager.keys.PlayerHudScene;

  if (playerHud?.sys) {
    playerHud.closeAllUIPanels?.();
    playerHud.refreshNotebook?.();
  }
}

  scheduleStoryEvents() {
    this.tutorialController
      .scheduleLabCompletionPhoneCall();
  }

  openCrimeScene() {
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
      this.reconstructionService
        .prepareReconstruction();

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

    if (
      !this.moveToCrimeCityNode(
        'crime_scene'
      )
    ) {
      return;
    }

    if (
      !this.trySpendEnergy(
        'activity',
        'crime_scene'
      )
    ) {
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
    return this.progressService.getCaseKey();
  }

  getCrimeCityProgress() {
    return this.progressService.getCrimeCityProgress();
  }

  hasPaidCrimeLabEntry() {
    return this.progressService.hasPaidCrimeLabEntry();
  }

  payCrimeLabEntryOnce() {
    return this.progressService.payCrimeLabEntryOnce();
  }

  moveToCrimeCityNode(
    targetNodeId,
    transportType = 'taxi'
  ) {
    return this.progressService.moveToCrimeCityNode(
      targetNodeId,
      transportType
    );
  }

  trySpendEnergy(category, key) {
    return this.progressService.trySpendEnergy(
      category,
      key
    );
  }

  isCrimeSceneCompleted() {
    return this.progressService.isCrimeSceneCompleted();
  }

  isCrimeLabCompleted() {
    return this.progressService.isCrimeLabCompleted();
  }

  isGridCompleted() {
    return this.progressService.isGridCompleted();
  }

  transitionTo(sceneKey, data = {}) {
    this.cameras.main.fadeOut(350, 0, 0, 0);

    this.cameras.main.once(
      'camerafadeoutcomplete',
      () => {
        this.scene.start(sceneKey, data);
      }
    );
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
    const popup = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2,
        text,
        {
          fontFamily: 'Special Elite',
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

    this.time.delayedCall(
      duration,
      () => popup?.destroy()
    );
  }

  closeAllUIPanels() {
    try {
      const playerHud =
        this.scene.manager.keys.PlayerHudScene;

      if (playerHud?.sys) {
        playerHud.closeAllUIPanels?.();
      }
    } catch (error) {
      console.warn(
        '[CrimeCityScene] closeAllUIPanels failed.',
        error.message
      );
    }
  }

  onShutdown() {
    this.interactiveObjects.forEach((object) => {
      object?.removeAllListeners?.();
    });

    this.interactiveObjects = [];

    this.stopCityAmbient();
    this.destroyControllers();

    this.boundShutdown = null;
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