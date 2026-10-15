// scenes/CrimeCityScene.js
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { audioManager } from '../managers/AudioManager.js';
import { ensureAlibiEncounters } from '../AlibiEncounterSetup.js';
import { EventBus } from '../EventBus.js';

import { CrimeCityProgressService } from './crimeCity/CrimeCityProgressService.js';
import { CrimeCityReconstructionService } from './crimeCity/CrimeCityReconstructionService.js';
import { CrimeCityTutorialController } from './crimeCity/CrimeCityTutorialController.js';
import { CrimeCityMapUI } from './crimeCity/CrimeCityMapUI.js';
import { CrimeCityNpcManager } from './crimeCity/CrimeCityNpcManager.js';

// ------------------------------------------------------------
// Pozycja pinezki SHOP na mapie miasta.
// Dopasuj raz w debugu, potem zostaw stałe.
// ------------------------------------------------------------
const SHOP_PIN = {
  x: 0.82,   // ułamek szerokości ekranu (0-1)
  y: 0.30,   // ułamek wysokości ekranu (0-1)
  label: 'SHOP'
};

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
    this.isVisitingApartment = false;
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
    this.isVisitingApartment = false;

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

    // Mieszkanie podejrzanego staje się widoczne na mapie tylko wtedy,
    // gdy przynajmniej jedno alibi zostało obalone w tej sprawie.
    const apartmentAvailable =
      this.hasAnyDebunkedAlibi();

    this.mapUI?.createAvailableLocations({
      crimeSceneCompleted,
      crimeLabCompleted,
      gridCompleted,
      apartmentAvailable
    });

    // Sklep jest zawsze dostępny w mieście (zakupy, zaopatrzenie detektywa)
    this.createShopPin();

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

  // ------------------------------------------------------------
  // SKLEP — pinezka na mapie + otwieranie ShopScene
  // ------------------------------------------------------------

  /**
   * Tworzy klikalną pinezkę SHOP na mapie miasta.
   * Pozycja stała (SHOP_PIN na górze pliku) — dopasować raz pod tło mapy.
   */
  createShopPin() {
    // Czyść starą pinezkę przy odświeżeniu zawartości
    // (createCrimeCityContent jest wołane także przy WAKE/RESUME).
    if (this.shopPin) {
      this.shopPin.removeAllListeners();
      this.shopPin.destroy();
      this.shopPin = null;
    }
    if (this.shopPinGlow?.active) {
      this.shopPinGlow.destroy();
      this.shopPinGlow = null;
    }

    if (!this.sys.isActive() || this._cleanupDone) {
      return;
    }

    const { width, height } = this.scale;
    const x = Math.round(width * SHOP_PIN.x);
    const y = Math.round(height * SHOP_PIN.y);

    // Pulsujące tło jak przy innych pinach
    const glow = this.add.circle(x, y, 18, 0xffd166, 0.25)
      .setDepth(20);
    this.tweens.add({
      targets: glow,
      scaleX: 1.25,
      scaleY: 1.25,
      alpha: 0.1,
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: 'Sine.easeInOut'
    });

    const pin = this.add.text(x, y, SHOP_PIN.label, {
      fontFamily: 'SpecialElite',
      fontSize: '20px',
      color: '#ffd166',
      backgroundColor: '#1a1a2e',
      padding: { x: 10, y: 6 }
    })
      .setOrigin(0.5)
      .setDepth(21)
      .setInteractive({ useHandCursor: true });

    pin.on('pointerover', () => {
      pin.setScale(1.08);
      pin.setColor('#ffffff');
    });

    pin.on('pointerout', () => {
      pin.setScale(1);
      pin.setColor('#ffd166');
    });

    pin.on('pointerdown', (pointer) => {
      if (pointer?.event?.button !== undefined && pointer.event.button !== 0) {
        return;
      }
      this.visitShop();
    });

    this.shopPin = pin;
    this.shopPinGlow = glow;
    this.interactiveObjects.push(pin);
  }

  /**
   * Otwiera sklep jako scenę NADRZĘDNĄ (jak ApartmentScene):
   * mapa miasta pauzuje, sklep leci na wierzch,
   * a po wyjściu z powrotem wznawiamy CrimeCityScene.
   *
   * Brak kosztu energii i nawigacji po nodach — sklep to
   * udogodnienie, nie etap sprawy.
   *
   * @returns {boolean} czy wejście do sklepu ruszyło
   */
  visitShop() {
    if (
      this.isTransitioning ||
      this._cleanupDone ||
      !this.sys.isActive()
    ) {
      return false;
    }

    this.closeAllUIPanels();

    this.isTransitioning = true;

    this.cameras.main.fadeOut(350, 0, 0, 0);

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        this.isTransitioning = false;

        if (!this.sys.isActive() || this._cleanupDone) {
          return;
        }

        this.scene.pause();

        this.scene.launch('ShopScene', {
          cityId: this.cityId,
          returnScene: 'CrimeCityScene'
        });
      }
    );

    return true;
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

  /**
   * Otwiera mieszkanie podejrzanego (point-and-click scena poszukiwania
   * poszlak). Dostępne tylko, gdy alibi danego podejrzanego zostało już
   * obalone przez gracza w rozmowach z NPC w mieście.
   *
   * @param {string} [suspectId] - id podejrzanego; domyślnie bierze
   *   aktualnie namierzonego złodzieja z gameState.
   */
  visitApartment(suspectId) {
    if (
      this.isTransitioning ||
      this.isVisitingApartment ||
      this._cleanupDone ||
      !this.sys.isActive()
    ) {
      return false;
    }

    const targetSuspectId =
      suspectId || gameState.currentThiefId;

    if (!targetSuspectId) {
      console.error(
        '[CrimeCityScene] visitApartment called without a suspectId and no currentThiefId in gameState.'
      );

      this.showMessage(
        [
          'No suspect selected.',
          'Pick someone from the board first.'
        ].join('\n'),
        2200,
        '#5d2a00'
      );

      return false;
    }

    if (!this.isAlibiDebunked(targetSuspectId)) {
      this.showMessage(
        [
          "This suspect's alibi still holds up.",
          'No warrant, no keys, no apartment tour.'
        ].join('\n'),
        2600,
        '#5d2a00'
      );

      return false;
    }

    if (!this.trySpendEnergy('activity', 'apartment_visit')) {
      return false;
    }

    this.closeAllUIPanels();

    this.isTransitioning = true;
    this.isVisitingApartment = true;

    this.cameras.main.fadeOut(350, 0, 0, 0);

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        this.isTransitioning = false;

        if (!this.sys.isActive() || this._cleanupDone) {
          this.isVisitingApartment = false;
          return;
        }

        this.scene.pause();

        this.scene.launch('ApartmentScene', {
          suspectId: targetSuspectId,
          cityId: this.cityId,
          returnScene: 'CrimeCityScene'
        });
      }
    );

    return true;
  }

  /**
   * Sprawdza, czy alibi konkretnego podejrzanego zostało obalone.
   * Podpięte pod progressService, z fallbackiem na płaską listę w
   * gameState, na wypadek gdyby ProgressService nie miał jeszcze tej
   * metody zaimplementowanej.
   */
  isAlibiDebunked(suspectId) {
    if (!suspectId) {
      return false;
    }

    if (typeof this.progressService?.isAlibiDebunked === 'function') {
      return !!this.progressService.isAlibiDebunked(suspectId);
    }

    const debunked =
      gameState.debunkedAlibis ||
      gameState.currentCase?.debunkedAlibis ||
      [];

    return Array.isArray(debunked) && debunked.includes(suspectId);
  }

  /**
   * Czy jakiekolwiek alibi w tej sprawie zostało już obalone
   * (używane do odkrycia lokacji "Apartment" na mapie miasta).
   */
  hasAnyDebunkedAlibi() {
    if (typeof this.progressService?.hasAnyDebunkedAlibi === 'function') {
      return !!this.progressService.hasAnyDebunkedAlibi();
    }

    const debunked =
      gameState.debunkedAlibis ||
      gameState.currentCase?.debunkedAlibis ||
      [];

    return Array.isArray(debunked) && debunked.length > 0;
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
    this.isVisitingApartment = false;

    this.cameras.main.fadeIn(300, 0, 0, 0);

    if (!this.cityAmbient?.isPlaying) {
      this.playCityAmbient();
    }

    void this.setupCrimeCityUi();

    // Po powrocie z mieszkania/sklepu odśwież dostępne lokacje na mapie
    this.createCrimeCityContent();
  }

  onSleep() {
    if (this.cityAmbient?.isPlaying) {
      this.cityAmbient.pause();
    }
  }

  cleanupScene() {
    this.isTransitioning = false;
    this.isSettingUpUi = false;
    this.isVisitingApartment = false;

    this.interactiveObjects.forEach((object) => {
      object?.removeAllListeners?.();
    });

    this.interactiveObjects = [];

    if (this.shopPinGlow?.active) {
      this.shopPinGlow.destroy();
      this.shopPinGlow = null;
    }
    this.shopPin = null;

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