// scenes/ApartmentScene.js
// ============================================================
// Point-and-click investigation in the suspect's apartment.
//
// Proceduralna scena generowana z:
// - suspectId;
// - motive;
// - currentMission;
// - caseModifiers.apartment.
//
// Obsługuje:
// - przeszukiwanie hotspotów;
// - clue, red herringi i artefakt misji;
// - inventory oraz kombinowanie itemów;
// - dowód trasy ucieczki;
// - zapis odzyskanego artefaktu do gameState.recoveredArtifacts.
// ============================================================

import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { ApartmentObject } from '../ApartmentObject.js';
import { ApartmentInventoryUI } from '../ApartmentInventoryUI.js';
import { generateApartment } from '../ApartmentGenerator.js';
import { getEscapePhaseController } from '../EscapePhaseController.js';

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

    this.artifactRecovered = Boolean(
      this.mission.artifactRecovered ||
      this.mission.artifact?.recovered
    );

    this.isTransitioning = false;
    this.escapePhaseQueued = false;
    this.escapePhaseStarted = false;
    this.apartmentObjects = [];

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

    console.log(
      `[ApartmentScene] Investigating ${this.suspectId}'s apartment (${this.motive})`
    );

    this.createBackground();

    this.playerInventory = new ApartmentInventoryUI(this);

    this.createHeader();
    this.createControls();
    this.createApartmentObjects();

    this.events.on(
      Phaser.Scenes.Events.SHUTDOWN,
      this.onShutdown,
      this
    );

    EventBus.on('itemCombined', this.onItemCombined, this);

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  /**
   * Zwraca aktualny game state niezależnie od tego, czy GameData
   * udostępnia getState(), czy bezpośredni obiekt.
   */
  getState() {
    return gameState.getState?.() || gameState;
  }

  /**
   * Bezpieczne ograniczenie liczby clue.
   */
  getRequiredClueCount(value) {
    const clueCount = Number(value);

    if (!Number.isFinite(clueCount)) {
      return 3;
    }

    return Math.max(1, Math.min(6, Math.floor(clueCount)));
  }

  createBackground() {
    const { width, height } = this.scale;
    const config = this.apartmentConfig?.background || {};

    if (config.imageKey && this.textures.exists(config.imageKey)) {
      const background = this.add.image(
        width / 2,
        height / 2,
        config.imageKey
      );

      background.setDisplaySize(width, height);
      background.setDepth(0);
      return;
    }

    const background = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      config.color || 0x2c2c2c
    );

    background.setDepth(0);

    for (let x = 0; x < width; x += 50) {
      for (let y = 0; y < height; y += 50) {
        if ((x + y) % 100 === 0) {
          this.add.rectangle(x, y, 2, 2, 0x444444, 0.3)
            .setDepth(1);
        }
      }
    }
  }

  createHeader() {
    const { width } = this.scale;
    const config = this.apartmentConfig || {};

    this.add.text(20, 20, config.title || 'Apartment', {
      fontFamily: 'PressStart2P',
      fontSize: '22px',
      color: '#ffd700'
    }).setDepth(10);

    this.add.text(20, 52, config.subtitle || 'What can you find?', {
      fontFamily: 'SpecialElite',
      fontSize: '16px',
      color: '#d9d9d9'
    }).setDepth(10);

    const inventoryButton = this.add.text(
      width - 20,
      20,
      '[INVENTORY]',
      {
        fontFamily: 'SpecialElite',
        fontSize: '14px',
        color: '#4caf50'
      }
    );

    inventoryButton.setOrigin(1, 0);
    inventoryButton.setInteractive({ useHandCursor: true });
    inventoryButton.setDepth(10);

    inventoryButton.on('pointerdown', () => {
      if (!this.isTransitioning) {
        this.playerInventory?.toggle();
      }
    });

    const exitButton = this.add.text(
      width - 20,
      55,
      '[EXIT]',
      {
        fontFamily: 'SpecialElite',
        fontSize: '14px',
        color: '#ff6b6b'
      }
    );

    exitButton.setOrigin(1, 0);
    exitButton.setInteractive({ useHandCursor: true });
    exitButton.setDepth(10);

    exitButton.on('pointerdown', () => this.exitApartment());
  }

  createApartmentObjects() {
    const objects = this.apartmentConfig?.objects || [];

    for (const objectConfig of objects) {
      const object = new ApartmentObject(this, objectConfig);
      this.apartmentObjects.push(object);
    }

    console.log(
      `[ApartmentScene] Created ${this.apartmentObjects.length} interactive objects`
    );
  }

  createControls() {
    const { width, height } = this.scale;

    this.descriptionBox = this.add.text(20, height - 60, '', {
      fontFamily: 'SpecialElite',
      fontSize: '13px',
      color: '#d9d9d9',
      wordWrap: { width: width - 40 }
    });

    this.descriptionBox.setDepth(10);
  }

  /**
   * Pokazuje komunikat centralnie na ekranie.
   */
  showMessage(text, duration = 2000, color = '#37474f') {
    if (!text || !this.sys.isActive()) {
      return null;
    }

    if (this.messageBox?.active) {
      this.messageBox.destroy();
      this.messageBox = null;
    }

    const { width, height } = this.scale;

    const popup = this.add.text(width / 2, height / 2, text, {
      fontFamily: 'SpecialElite',
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: color,
      padding: { x: 20, y: 15 },
      align: 'center',
      wordWrap: { width: width - 60 }
    });

    popup.setOrigin(0.5);
    popup.setDepth(1000);

    this.messageBox = popup;

    this.time.delayedCall(duration, () => {
      if (popup?.active) {
        popup.destroy();
      }

      if (this.messageBox === popup) {
        this.messageBox = null;
      }
    });

    return popup;
  }

  showDescription(text) {
    if (this.descriptionBox?.active) {
      this.descriptionBox.setText(text || '');
    }
  }

  /**
   * Centralny odbiornik przedmiotów z ApartmentObject.
   *
   * ApartmentObject nie zna gameState i nie podejmuje decyzji,
   * czy item jest artefaktem, clue czy red herringiem.
   */
  collectApartmentItem(item, sourceObject = {}) {
    if (!item || this.isTransitioning) {
      return;
    }

    if (item.isArtifact || item.type === 'artifact') {
      this.collectMissionArtifact(item, sourceObject);
      return;
    }

    this.playerInventory?.addItem(item);

    const popupText = item.isRedHerring
      ? `Found: ${item.label}\n\nProbably useless. Probably.`
      : `Found: ${item.label}`;

    const popupColor = item.isRedHerring
      ? '#607d8b'
      : '#4caf50';

    this.showMessage(popupText, 2000, popupColor);

    if (item.isEscapeClue) {
      this.onEscapeClueFound(item);
    }
  }

  /**
   * Zapisuje artefakt tylko raz.
   */
  collectMissionArtifact(item, sourceObject = {}) {
  if (this.artifactRecovered) {
    this.showMessage(
      'The recovered artefact has already been logged.',
      1600,
      '#37474f'
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
    this.apartmentConfig?.missionId;

  const recovered = gameState.recoverArtifact({
    missionId,
    artifact,
    recoveredAt: artifact.recoveredAt,
    recoveredFrom: artifact.recoveredFrom,
    recoveredLocation: artifact.recoveredLocation,
    condition: artifact.condition
  });

  if (!recovered) {
    this.artifactRecovered = gameState.hasRecoveredArtifact(missionId);

    this.showMessage(
      this.artifactRecovered
        ? 'The recovered artefact has already been logged.'
        : 'The artefact could not be logged. Check the case data.',
      2000,
      '#ff6b6b'
    );

    return;
  }

  this.mission = gameState.getState().currentMission;
  this.artifactRecovered = true;

  this.playerInventory?.addItem(artifact);

  EventBus.emit('artifactRecovered', {
    missionId,
    artifact,
    sourceObject
  });

  this.showMessage(
    `ARTEFACT RECOVERED!\n\n${artifact.label}\n\nFound inside: ${artifact.recoveredLocation}`,
    3500,
    '#6a1b9a'
  );
}

  /**
   * Odpala się, gdy gracz znalazł bezpośredni trop ucieczki.
   */
  onEscapeClueFound(item) {
    if (this.escapePhaseQueued || this.escapePhaseStarted) {
      return;
    }

    this.escapePhaseQueued = true;

    this.showMessage(
      `CRITICAL: ${item.label}\n\nThe suspect has fled!`,
      3000,
      '#ff6b6b'
    );

    this.time.delayedCall(3500, () => {
      this.triggerEscapePhase();
    });
  }

  /**
   * Event z ApartmentInventoryUI po udanej kombinacji.
   */
  onItemCombined(data = {}) {
    const result = data.result;

    if (!result?.isEscapeClue) {
      return;
    }

    this.onEscapeClueFound(result);
  }

  /**
   * Uruchamia fazę ucieczki po znalezieniu poprawnego tropu.
   */
  triggerEscapePhase() {
    if (
      this.isTransitioning ||
      this.escapePhaseStarted ||
      !this.sys.isActive()
    ) {
      return;
    }

    this.isTransitioning = true;
    this.escapePhaseStarted = true;

    EventBus.emit('thiefEscaped');

    const escapeController = getEscapePhaseController(gameState);
    escapeController.initializeEscapePhase();

    this.cameras.main.fadeOut(400, 0, 0, 0);

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        const state = this.getState();

        if (Array.isArray(state.escapeRoute) && state.escapeRoute.length > 0) {
          this.goto('CityScene', {
            cityId: state.escapeRoute[0],
            phase: 'escape',
            fromApartmentEscape: true
          });

          return;
        }

        this.goto('GameOverScene', {
          reason: 'no_escape_route',
          message: 'The thief escaped, but we have no route to follow them.'
        });
      }
    );
  }

  /**
   * Liczy clue w inventory. Artefakt ma isClue: false,
   * więc automatycznie nie wchodzi do tego licznika.
   */
  getCollectedClueCount() {
    return this.playerInventory
      ?.getItems()
      .filter(item => item.isClue === true)
      .length || 0;
  }

  /**
   * Czy modifier wymaga fizycznego odzyskania artefaktu
   * przed opuszczeniem lokalu.
   */
  isArtifactRequiredBeforeExit() {
    if (this.apartmentEffect.artifactState === 'carried_away') {
      return false;
    }

    return (
      this.apartmentEffect.artifactRequired === true ||
      this.apartmentEffect.artifactState === 'left_behind'
    );
  }

  /**
   * Opuść mieszkanie tylko po zebraniu wymaganych danych.
   */
  exitApartment() {
    if (this.isTransitioning || this.escapePhaseQueued) {
      return;
    }

    const collectedClueCount = this.getCollectedClueCount();

    if (collectedClueCount < this.requiredClueCount) {
      this.showMessage(
        `You need more evidence before leaving.\n` +
          `Clues found: ${collectedClueCount}/${this.requiredClueCount}`,
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

    this.isTransitioning = true;

    this.cameras.main.fadeOut(400, 0, 0, 0);

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        const state = this.getState();

        this.goto('CrimeCityScene', {
          cityId: state.crimeCityId
        });
      }
    );
  }

  onShutdown() {
    this.apartmentObjects.forEach(object => object.destroy());
    this.apartmentObjects = [];

    this.playerInventory?.destroy();
    this.playerInventory = null;

    if (this.messageBox?.active) {
      this.messageBox.destroy();
    }

    this.messageBox = null;
    this.descriptionBox = null;

    EventBus.off('itemCombined', this.onItemCombined, this);

    this.isTransitioning = false;
    this.escapePhaseQueued = false;
    this.escapePhaseStarted = false;
  }
}

export default ApartmentScene;