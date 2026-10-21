// scenes/ApartmentScene.js



import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';



import { ApartmentObject } from './apartament/ApartmentObject.js';
import { ApartmentInventoryUI } from './apartament/ApartmentInventoryUI.js';
import { generateApartment } from './apartament/ApartmentGenerator.js';



import {
  getRouteManager,
  syncInvestigationState,
  generateDestinationsForCurrentCity
} from '../managers/InvestigationManager.js';



import {
  saveGameState,
  requestAutosave,
  flushAutosave
} from '../gameStatePersistence.js';
import { beginEscapePhaseClock } from '../CaseTimeHelper.js';



const DEFAULT_APARTMENT_MODIFIER = {
  id: 'empty_clues',
  effect: {
    state: 'empty',
    clueCount: 4,
    artifactState: 'left_behind',
    artifactRequired: true,
    artifactRecoveryBonus: 30,
    escapeMethod: 'combined'
  }
};



export class ApartmentScene extends BaseScene {
  constructor() {
    super({ key: 'ApartmentScene' });



    this.suspectId = null;
    this.motive = null;



    this.mission = null;
    this.missionId = null;
    this.apartmentModifier = null;
    this.apartmentEffect = null;
    this.requiredClueCount = 3;



    this.apartmentConfig = null;
    this.apartmentObjects = [];
    this.playerInventory = null;



    this.messageBox = null;
    this.descriptionBox = null;



    this.isTransitioning = false;
    this.escapePhaseQueued = false;
    this.escapePhaseStarted = false;
    this.artifactRecovered = false;



    this.escapeTimer = null;
    this.messageTimer = null;
  }



  init(data = {}) {
    const state = this.getState();



    this.mission = data.mission || state.currentMission || {};



    this.suspectId =
      data.suspectId ||
      this.mission.thiefId ||
      state.currentThiefId ||
      'suspect_001';



    this.motive =
      data.motive ||
      this.mission.motive ||
      state.caseData?.motiveId ||
      'gambling_debt';



    this.apartmentModifier =
      data.apartmentModifier ||
      this.mission.caseModifiers?.apartment ||
      DEFAULT_APARTMENT_MODIFIER;



    this.apartmentEffect = {
      ...DEFAULT_APARTMENT_MODIFIER.effect,
      ...(this.apartmentModifier.effect || {})
    };



    this.requiredClueCount = this.getRequiredClueCount(
      this.apartmentEffect.clueCount
    );



    this.missionId =
      this.mission.id ||
      this.mission.missionId ||
      state.currentMission?.id ||
      state.currentMission?.missionId ||
      'unknown_mission';



    this.artifactRecovered = Boolean(
      this.mission.artifactRecovered ||
      this.mission.artifact?.recovered ||
      gameState.hasRecoveredArtifact(this.missionId)
    );



    this.isTransitioning = false;
    this.escapePhaseQueued = false;
    this.escapePhaseStarted = false;



    this.apartmentObjects = [];
    this.playerInventory = null;
    this.messageBox = null;
    this.descriptionBox = null;
    this.escapeTimer = null;
    this.messageTimer = null;



    this.apartmentConfig = generateApartment(
      this.suspectId,
      this.motive,
      {
        mission: this.mission,
        apartmentModifier: this.apartmentModifier,
        caseIndex: this.mission.caseIndex ?? state.caseIndex ?? 0
      }
    );
  }



  create() {
    super.create();



    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.onShutdown,
      this
    );



    this.createBackground();



    this.playerInventory = new ApartmentInventoryUI(this);
    this.restoreInventory();



    this.createHeader();
    this.createControls();
    this.createApartmentObjects();



    EventBus.on('itemCombined', this.onItemCombined, this);



    this.cameras.main.fadeIn(400, 0, 0, 0);
  }



  // Bezpośredni dostęp do stanu gry. gameState.getState() kopiuje i zamraża
  // cały stan, a tu wystarczy odczyt kilku pól.
  getState() {
    return gameState;
  }



  getRequiredClueCount(value) {
    const count = Number(value);



    if (!Number.isFinite(count)) {
      return 3;
    }



    return Math.max(1, Math.min(6, Math.floor(count)));
  }



  // ------------------------------------------------------------
  // ZAPIS / ODCZYT STANU MIESZKANIA
  // ------------------------------------------------------------



  getSavedItems() {
    const progress = this.getState().apartmentProgress;
    const saved = progress?.[this.missionId]?.items;



    return Array.isArray(saved) ? saved : [];
  }



  restoreInventory() {
    const savedItems = this.getSavedItems();



    for (const item of savedItems) {
      if (!item?.id) {
        continue;
      }



      this.playerInventory.addItem(item);



      if (item.isEscapeClue) {
        this.escapePhaseQueued = true;
      }
    }



    if (this.artifactRecovered) {
      const hasArtifact = savedItems.some(
        item => item?.isArtifact || item?.type === 'artifact'
      );



      if (!hasArtifact) {
        const recovered = gameState.getRecoveredArtifact(this.missionId);



        if (recovered) {
          this.playerInventory.addItem({
            id: recovered.artifactId,
            type: 'artifact',
            label: recovered.artifact,
            description: recovered.description,
            isArtifact: true,
            isClue: false,
            recovered: true,
            quantity: 1
          });
        }
      }
    }
  }



  persistApartmentState() {
    if (!this.playerInventory) {
      return;
    }



    const items = JSON.parse(
      JSON.stringify(this.playerInventory.getItems())
    );



    const progress = {
      ...(this.getState().apartmentProgress || {}),
      [this.missionId]: {
        items,
        updatedAt: new Date().toISOString()
      }
    };



    gameState.updateState({ apartmentProgress: progress });
    requestAutosave();
  }



  addClueToNotebook(item) {
    if (!item?.id || item.isRedHerring || item.isArtifact) {
      return;
    }



    if (item.isClue !== true && item.isEscapeClue !== true) {
      return;
    }



    const label = item.label || item.name || 'Apartment clue';
    const description = item.description || item.hint || '';



    gameState.addClue({
      id: `apartment_${this.missionId}_${item.id}`,
      type: 'apartment',
      category: 'apartment',
      key: item.id,
      value: label,
      text: description ? `${label} - ${description}` : label,
      cityId: this.getState().crimeCityId || null,
      missionId: this.missionId,
      source: 'suspect_apartment',
      isEscapeClue: item.isEscapeClue === true
    });
  }



  hasItemAlready(itemId) {
    return Boolean(this.playerInventory?.hasItem(itemId));
  }



  // ------------------------------------------------------------



  createBackground() {
    const { width, height } = this.scale;
    const config = this.apartmentConfig?.background || {};



    if (config.imageKey && this.textures.exists(config.imageKey)) {
      this.add
        .image(width / 2, height / 2, config.imageKey)
        .setDisplaySize(width, height)
        .setDepth(0);



      return;
    }



    this.add
      .rectangle(
        width / 2,
        height / 2,
        width,
        height,
        config.color ?? 0x2c2c2c
      )
      .setDepth(0);



    for (let x = 0; x < width; x += 50) {
      for (let y = 0; y < height; y += 50) {
        if ((x + y) % 100 === 0) {
          this.add
            .rectangle(x, y, 2, 2, 0x444444, 0.3)
            .setDepth(1);
        }
      }
    }
  }



  createHeader() {
    const { width } = this.scale;
    const config = this.apartmentConfig || {};



    this.add
      .text(20, 20, config.title || 'Apartment', {
        fontFamily: 'PressStart2P',
        fontSize: '22px',
        color: '#ffd700'
      })
      .setDepth(10);



    this.add
      .text(20, 52, config.subtitle || 'What can you find?', {
        fontFamily: 'SpecialElite',
        fontSize: '16px',
        color: '#d9d9d9'
      })
      .setDepth(10);



    const inventoryButton = this.add
      .text(width - 20, 20, '[INVENTORY]', {
        fontFamily: 'SpecialElite',
        fontSize: '14px',
        color: '#4caf50'
      })
      .setOrigin(1, 0)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });



    inventoryButton.on('pointerdown', () => {
      if (!this.isTransitioning) {
        this.playerInventory?.toggle();
      }
    });



    const exitButton = this.add
      .text(width - 20, 55, '[EXIT]', {
        fontFamily: 'SpecialElite',
        fontSize: '14px',
        color: '#ff6b6b'
      })
      .setOrigin(1, 0)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });



    exitButton.on('pointerdown', () => this.exitApartment());
  }



  createControls() {
    const { width, height } = this.scale;



    this.descriptionBox = this.add
      .text(20, height - 60, '', {
        fontFamily: 'SpecialElite',
        fontSize: '13px',
        color: '#d9d9d9',
        wordWrap: { width: width - 40 }
      })
      .setDepth(10);
  }



  createApartmentObjects() {
    const objects = this.apartmentConfig?.objects || [];



    for (const config of objects) {
      this.apartmentObjects.push(
        new ApartmentObject(this, config)
      );
    }
  }



  showMessage(text, duration = 2000, color = '#37474f') {
    if (!text || !this.sys.isActive()) {
      return null;
    }



    this.messageTimer?.remove(false);
    this.messageTimer = null;



    if (this.messageBox?.active) {
      this.messageBox.destroy();
    }



    const { width, height } = this.scale;



    const popup = this.add
      .text(width / 2, height / 2, text, {
        fontFamily: 'SpecialElite',
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: color,
        padding: { x: 20, y: 15 },
        align: 'center',
        wordWrap: { width: Math.max(100, width - 60) }
      })
      .setOrigin(0.5)
      .setDepth(1000);



    this.messageBox = popup;



    this.messageTimer = this.time.delayedCall(duration, () => {
      if (popup.active) {
        popup.destroy();
      }



      if (this.messageBox === popup) {
        this.messageBox = null;
      }



      this.messageTimer = null;
    });



    return popup;
  }



  showDescription(text) {
    if (this.descriptionBox?.active) {
      this.descriptionBox.setText(text || '');
    }
  }



  collectApartmentItem(item, sourceObject = {}) {
    if (!item || this.isTransitioning) {
      return;
    }



    if (item.isArtifact || item.type === 'artifact') {
      this.collectMissionArtifact(item, sourceObject);
      return;
    }



    const label = item.label || item.name || 'Unknown item';



    // Przedmiot znaleziony w poprzedniej wizycie - nie dublujemy.
    if (item.id && this.hasItemAlready(item.id)) {
      this.showMessage(
        `You already took the ${label}.`,
        1500,
        '#37474f'
      );



      return;
    }



    this.playerInventory?.addItem(item);
    this.addClueToNotebook(item);
    this.persistApartmentState();



    if (item.isEscapeClue) {
      this.onEscapeClueFound(item);
      return;
    }



    this.showMessage(
      item.isRedHerring
        ? `Found: ${label}\n\nProbably useless. Probably.`
        : `Found: ${label}\n\nAdded to your notes.`,
      2000,
      item.isRedHerring ? '#607d8b' : '#4caf50'
    );
  }



  collectMissionArtifact(item, sourceObject = {}) {
    if (this.artifactRecovered) {
      this.showMessage(
        'The recovered artefact has already been logged.',
        1600
      );



      return;
    }



    const state = this.getState();
    const mission = state.currentMission || this.mission || {};
    const originalArtifact = mission.artifact || {};



    const artifact = {
      ...originalArtifact,
      ...item,



      id: item.id || originalArtifact.id,
      type: 'artifact',



      label:
        item.label ||
        originalArtifact.label ||
        originalArtifact.name ||
        'Recovered Artefact',



      description:
        item.description ||
        originalArtifact.description ||
        'A stolen artefact recovered from the suspect apartment.',



      significance:
        item.significance ||
        originalArtifact.significance ||
        'Recovered from the suspect apartment.',



      artifactKey:
        item.artifactKey ||
        originalArtifact.artifactKey ||
        item.id ||
        originalArtifact.id ||
        'recovered_artefact',



      city:
        item.city ||
        originalArtifact.city ||
        state.crimeCityId ||
        'Unknown City',



      country:
        item.country ||
        originalArtifact.country ||
        'Unknown Country',



      condition:
        item.condition ||
        originalArtifact.condition ||
        'intact',



      recovered: true,
      recoveredAt: new Date().toISOString(),



      recoveredFrom:
        sourceObject.id ||
        'suspect_apartment',



      recoveredLocation:
        sourceObject.label ||
        'Suspect Apartment',



      isArtifact: true,
      isClue: false,
      quantity: 1
    };



    const missionId =
      mission.id ||
      mission.missionId ||
      this.apartmentConfig?.missionId ||
      this.missionId;



    const recovered = gameState.recoverArtifact({
      missionId,
      artifact,
      recoveredAt: artifact.recoveredAt,
      recoveredFrom: artifact.recoveredFrom,
      recoveredLocation: artifact.recoveredLocation,
      condition: artifact.condition
    });



    if (!recovered) {
      this.artifactRecovered =
        gameState.hasRecoveredArtifact(missionId);



      this.showMessage(
        this.artifactRecovered
          ? 'The recovered artefact has already been logged.'
          : 'The artefact could not be logged. Check the case data.',
        2500,
        this.artifactRecovered ? '#37474f' : '#ff6b6b'
      );



      if (this.artifactRecovered && this.escapePhaseQueued) {
        this.queueEscapeTransition(2800);
      }



      return;
    }



    this.mission = this.getState().currentMission;
    this.artifactRecovered = true;



    this.playerInventory?.addItem(artifact);



    EventBus.emit('artifactRecovered', {
      missionId,
      artifact,
      sourceObject
    });



    this.persistApartmentState();



    this.showMessage(
      `ARTEFACT RECOVERED!\n\n${artifact.label}\n\n` +
      `Found inside: ${artifact.recoveredLocation}`,
      3500,
      '#6a1b9a'
    );



    if (this.escapePhaseQueued) {
      this.queueEscapeTransition(3800);
    }
  }



  onEscapeClueFound(item) {
    if (
      this.isTransitioning ||
      this.escapePhaseQueued ||
      this.escapePhaseStarted
    ) {
      return;
    }



    this.escapePhaseQueued = true;



    const mustRecoverArtifact =
      this.isArtifactRequiredBeforeExit() &&
      !this.artifactRecovered;



    const label = item.label || item.name || 'Escape evidence';



    this.showMessage(
      mustRecoverArtifact
        ? `CRITICAL: ${label}\n\nThe suspect has fled!\n` +
          'Recover the stolen artefact before you leave.'
        : `CRITICAL: ${label}\n\nThe suspect has fled!\n` +
          'Choose your next destination on the travel map.',
      3200,
      '#ff6b6b'
    );



    if (!mustRecoverArtifact) {
      this.queueEscapeTransition(3500);
    }
  }



  onItemCombined(data = {}) {
    if (!this.sys.isActive() || this.isTransitioning) {
      return;
    }



    // Skład ekwipunku się zmienił (składniki zniknęły, powstał nowy item).
    if (data.result) {
      this.addClueToNotebook(data.result);
    }



    this.persistApartmentState();



    if (data.result?.isEscapeClue) {
      this.onEscapeClueFound(data.result);
    }
  }



  queueEscapeTransition(delay = 3500) {
    this.escapeTimer?.remove(false);



    this.escapeTimer = this.time.delayedCall(delay, () => {
      this.escapeTimer = null;
      this.triggerEscapePhase();
    });
  }



  triggerEscapePhase() {
    if (
      this.isTransitioning ||
      this.escapePhaseStarted ||
      !this.escapePhaseQueued ||
      !this.sys.isActive()
    ) {
      return;
    }



    if (
      this.isArtifactRequiredBeforeExit() &&
      !this.artifactRecovered
    ) {
      this.showMessage(
        'The stolen artefact is still somewhere in this apartment.',
        2500,
        '#ff9800'
      );



      return;
    }



    const locations = this.cache.json.get('locations');
    const state = this.getState();
    const manager = getRouteManager();



    if (!Array.isArray(locations)) {
      this.showMessage(
        'Travel data could not be loaded. You can keep searching.',
        3000,
        '#ff6b6b'
      );



      return;
    }



    const crimeCityId = state.crimeCityId;



    const crimeCity = locations.find(
      location => location?.id === crimeCityId
    );



    if (!crimeCity) {
      this.showMessage(
        'The crime city is missing from the case data.',
        3000,
        '#ff6b6b'
      );



      return;
    }



    // Przyjmujemy istniejącą trasę. Nie losujemy nowej.
    const routeIsValid =
      manager.route.length > 0 &&
      manager.route.every(cityId =>
        cityId !== crimeCityId &&
        locations.some(location => location?.id === cityId)
      );



    if (!routeIsValid || manager.isComplete()) {
      console.error('[ApartmentScene] Invalid escape route.', {
        route: manager.serialize(),
        crimeCityId
      });



      this.showMessage(
        'The escape route is missing or invalid. Check the case setup.',
        3500,
        '#ff6b6b'
      );



      return;
    }



    // Kończymy etap miasta zbrodni tylko raz.
    if (manager.isCrimeCityPhase()) {
      if (manager.getCrimeCity() !== crimeCityId) {
        this.showMessage(
          'The route manager points to a different crime city.',
          3000,
          '#ff6b6b'
        );



        return;
      }



      const result = manager.enterCity(crimeCityId);



      if (!result.ok) {
        this.showMessage(
          'The pursuit could not be started. Check the route data.',
          3000,
          '#ff6b6b'
        );



        return;
      }
    }



    const wasEscapeActive = state.escapePhaseActive === true;



    gameState.updateState({
      escapeRoute: [...manager.route],



      crimeSceneVisited: true,
      justReachedCorrectCityId: null,



      currentCityId: crimeCityId,
      currentCity: crimeCity.city,
      currentCityData: structuredClone(crimeCity),
      currentEncounterId: null
    });



    // Pościg dostaje to, co zostało z 7 dni sprawy
    // (termin końcowy jest ustalony od startu sprawy).
    beginEscapePhaseClock(gameState);



    syncInvestigationState(locations);



    gameState.currentDestinations =
      generateDestinationsForCurrentCity(locations);



    saveGameState();



    this.escapePhaseStarted = true;



    if (!wasEscapeActive) {
      EventBus.emit('thiefEscaped');
    }



    this.transitionToScene('CityScene', {
      cityId: crimeCityId,
      openDestinations: true,
      fromApartmentEscape: true
    });
  }



  getCollectedClueCount() {
    const items = this.playerInventory?.getItems() || [];



    return items.filter(item => item?.isClue === true).length;
  }



  isArtifactRequiredBeforeExit() {
    if (this.apartmentEffect.artifactState === 'carried_away') {
      return false;
    }



    return (
      this.apartmentEffect.artifactRequired === true ||
      this.apartmentEffect.artifactState === 'left_behind'
    );
  }



  exitApartment() {
    if (this.isTransitioning || !this.sys.isActive()) {
      return;
    }



    // Odkryty trop uruchamia pościg, a nie zwykły powrót.
    if (this.escapePhaseQueued || this.escapePhaseStarted) {
      this.triggerEscapePhase();
      return;
    }



    const collected = this.getCollectedClueCount();



    if (collected < this.requiredClueCount) {
      this.showMessage(
        'You need more evidence before leaving.\n' +
        `Clues found: ${collected}/${this.requiredClueCount}`,
        2500,
        '#ff9800'
      );



      return;
    }



    if (
      this.isArtifactRequiredBeforeExit() &&
      !this.artifactRecovered
    ) {
      this.showMessage(
        'The stolen artefact is still somewhere in this apartment.',
        2500,
        '#ff9800'
      );



      return;
    }



    this.persistApartmentState();



    this.transitionToScene('CrimeCityScene', {
      cityId: this.getState().crimeCityId
    });
  }



  transitionToScene(sceneKey, data = {}) {
    if (this.isTransitioning || !this.sys.isActive()) {
      return;
    }



    this.isTransitioning = true;



    this.escapeTimer?.remove(false);
    this.escapeTimer = null;



    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        if (!this.sys.isActive()) {
          return;
        }



        void this.performSceneTransition(sceneKey, data);
      }
    );



    this.cameras.main.fadeOut(400, 0, 0, 0);
  }



  async performSceneTransition(sceneKey, data) {
    try {
      const started = await this.goto(sceneKey, data);



      if (started === false && this.sys.isActive()) {
        this.restoreAfterTransitionFailure();
      }
    } catch (error) {
      console.error(
        `[ApartmentScene] Transition to "${sceneKey}" failed:`,
        error
      );



      if (this.sys.isActive()) {
        this.restoreAfterTransitionFailure();
      }
    }
  }



  restoreAfterTransitionFailure() {
    this.isTransitioning = false;
    this.escapePhaseStarted = false;



    this.cameras.main.fadeIn(200, 0, 0, 0);



    this.showMessage(
      'Could not leave the apartment. Try EXIT again.',
      2500,
      '#ff6b6b'
    );
  }



  onShutdown() {
    flushAutosave();



    EventBus.off('itemCombined', this.onItemCombined, this);



    this.escapeTimer?.remove(false);
    this.messageTimer?.remove(false);



    this.escapeTimer = null;
    this.messageTimer = null;



    this.apartmentObjects.forEach(object => object.destroy());
    this.apartmentObjects = [];



    this.playerInventory?.destroy();
    this.playerInventory = null;



    if (this.messageBox?.active) {
      this.messageBox.destroy();
    }



    this.messageBox = null;
    this.descriptionBox = null;



    this.isTransitioning = false;
    this.escapePhaseQueued = false;
    this.escapePhaseStarted = false;
  }
}



export default ApartmentScene;