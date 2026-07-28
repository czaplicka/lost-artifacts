import { gameState, saveGameState } from '../GameData.js';
import { buildNpcDialogue, buildFalseLeadDialogue } from '../dialogueBuilder.js';
import { ensureHud } from '../hudHelpers.js';
import { EventBus } from '../EventBus.js';

const NPC_DIALOGUE_CACHE_MAP = {
  bankier: 'dialogue_banker',
  stewardessa: 'dialogue_stewardess',
  knajpa: 'dialogue_knajpa',
  maid: 'dialogue_maid',
  police: 'dialogue_police',
  fence: 'dialogue_fence',
  parkingowy: 'dialogue_parkingowy',
  bum: 'dialogue_bum'
};

const LOCATION_SOUND_MAP = {
  alley: 'alleysound',
  bank: 'banksound',
  hotel: 'hotelsound',
  parking: 'parkingsound',
  policehq: 'policesound',
  restaurant: 'restaurantsound',
  garbage: 'garbagesound'
};

const NPC_DIALOGUE_ROOT_MAP = {
  bankier: 'bankerClues',
  stewardessa: 'stewardessClues',
  knajpa: 'knajpaClues',
  maid: 'maidClues',
  police: 'policeClues',
  fence: 'fenceClues',
  parkingowy: 'parkingowyClues',
  bum: 'bumClues'
};

export class LocationScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LocationScene' });
    this.lines = [];
    this.generatedNotes = [];
    this.isRepeat = false;
    this.isFinishing = false;
    this.dialogueText = null;
    this.footerTextObject = null;
    this.npcNameText = null;
    this.dialoguePanel = null;
    this.cityId = null;
    this.encounterId = null;
    this.npcId = null;
    this.locationId = null;
    this.encounterMemory = null;
    this.isReminder = false;
    this.isCorrectCity = true;
    this.isCrimeCity = false;
    this.isNextTargetCity = false;
    this.isFalseLead = false;
    this.timeCostApplied = false;
    this.dialogueTargetCityId = null;
    this.locationAmbient = null;
  }

  init(data = {}) {
    this.cityId = data.cityId || null;
    this.encounterId = data.encounterId || null;
    this.npcId = data.npcId || null;
    this.locationId = data.locationId || null;
    this.isRepeat = Boolean(data.isRepeat);

    const route = Array.isArray(gameState.escapeRoute) ? gameState.escapeRoute : [];
    const derivedIsCrimeCity =
      Boolean(this.cityId) && this.cityId === gameState.crimeCityId;
    const derivedIsNextTargetCity =
      Boolean(this.cityId) && this.cityId === gameState.nextTargetCityId;
    const derivedJustReached =
      Boolean(this.cityId) && this.cityId === gameState.justReachedCorrectCityId;
    const derivedIsOnEscapeRoute =
      Boolean(this.cityId) && route.includes(this.cityId);
    const derivedIsCurrentVisitedRouteCity =
      Boolean(this.cityId) &&
      gameState.currentCityId === this.cityId &&
      derivedIsOnEscapeRoute;

    this.isCrimeCity = data.isCrimeCity ?? derivedIsCrimeCity;
    this.isNextTargetCity = data.isNextTargetCity ?? derivedIsNextTargetCity;
    this.isCorrectCity =
      data.isCorrectCity ??
      Boolean(
        derivedIsCrimeCity ||
        derivedIsCurrentVisitedRouteCity ||
        derivedJustReached
      );

    this.lines = [];
    this.generatedNotes = [];
    this.isFinishing = false;
    this.dialogueText = null;
    this.footerTextObject = null;
    this.npcNameText = null;
    this.dialoguePanel = null;
    this.encounterMemory = null;
    this.isReminder = false;
    this.isFalseLead = !this.isCorrectCity;
    this.timeCostApplied = false;
    this.dialogueTargetCityId = data.dialogueTargetCityId || null;
    this.locationAmbient = null;

    if (!Array.isArray(gameState.cluesCollected)) {
      gameState.cluesCollected = [];
    }

    if (!Array.isArray(gameState.visitedEncounters)) {
      gameState.visitedEncounters = [];
    }

    if (
      !gameState.encounterMemory ||
      typeof gameState.encounterMemory !== 'object' ||
      Array.isArray(gameState.encounterMemory)
    ) {
      gameState.encounterMemory = {};
    }
  }

  create() {
    const citySound = this.registry.get('citySound');
    if (citySound?.isPlaying) {
      citySound.stop();
    }

    const locationSoundKey = LOCATION_SOUND_MAP[this.locationId];

    if (locationSoundKey && this.cache.audio.exists(locationSoundKey)) {
      this.locationAmbient = this.sound.add(locationSoundKey, {
        loop: true,
        volume: 0.2
      });

      if (!this.locationAmbient.isPlaying) {
        this.locationAmbient.play();
      }
    }

    const hud = this.scene.get('PlayerHudScene');
    if (hud?.closeAllUIPanels) {
      hud.closeAllUIPanels();
    }

    const width = this.scale.width;
    const height = this.scale.height;

    const suspects = this.cache.json.get('suspects') || [];
    const locations = this.cache.json.get('locations') || [];
    const sharedCityCluesFile = this.cache.json.get('city_clues') || {};
    const sharedCityClues = sharedCityCluesFile.cityClues || {};
    const sharedSuspectCluesFile = this.cache.json.get('suspect_clues') || {};
    const sharedSuspectClues = sharedSuspectCluesFile.suspectClues || {};

    const dialogueCacheKey = NPC_DIALOGUE_CACHE_MAP[this.npcId];
    const dialogueRootKey = NPC_DIALOGUE_ROOT_MAP[this.npcId];

    const rawDialogueFile = dialogueCacheKey
      ? this.cache.json.get(dialogueCacheKey)
      : null;

    const npcDialogueBlock = rawDialogueFile?.[dialogueRootKey] || {};
    const cityData = locations.find(city => city.id === this.cityId) || null;

    const suspect =
      suspects.find(s => s.id === gameState.currentThiefId) ||
      gameState.currentThief ||
      null;

    if (!dialogueCacheKey || !dialogueRootKey) {
      console.warn(`LocationScene: unknown npcId "${this.npcId}"`);
    }

    this.encounterMemory = this.encounterId
      ? gameState.encounterMemory?.[this.encounterId] || null
      : null;

    const hasMemory = Boolean(this.encounterMemory);
    const previousNotes = Array.isArray(this.encounterMemory?.notes)
      ? this.encounterMemory.notes
      : [];

    this.isReminder = Boolean(
      this.isRepeat &&
        hasMemory &&
        this.encounterMemory?.reminderShown === false &&
        !this.isFalseLead
    );

    const route = Array.isArray(gameState.escapeRoute) ? gameState.escapeRoute : [];
    const currentRouteIndex = route.indexOf(this.cityId);
    const lookAheadTargetId =
      currentRouteIndex !== -1 ? route[currentRouteIndex + 1] || null : null;

    const frozenTargetFromMemory =
      this.encounterMemory?.dialogueTargetCityId ||
      this.encounterMemory?.hintTargetCityId ||
      null;

    if (!this.dialogueTargetCityId) {
      if (this.isCrimeCity) {
        this.dialogueTargetCityId = route[0] || null;
      } else {
        this.dialogueTargetCityId =
          lookAheadTargetId ||
          frozenTargetFromMemory ||
          gameState.nextTargetCityId ||
          null;
      }
    }

    if (this.dialogueTargetCityId && this.dialogueTargetCityId === this.cityId) {
      this.dialogueTargetCityId = lookAheadTargetId || null;
    }

    const generatedDialogue = this.isFalseLead
      ? buildFalseLeadDialogue(npcDialogueBlock, this.cityId)
      : buildNpcDialogue({
          npcData: npcDialogueBlock,
          suspect,
          cityId: this.cityId,
          targetCityId: this.dialogueTargetCityId,
          canonicalTravelCityId: this.isCrimeCity
            ? route[0] || null
            : lookAheadTargetId || this.dialogueTargetCityId,
          clueScope: this.isCrimeCity ? 'crime_scene' : 'route_leg',
          routeIndex: currentRouteIndex,
          allowOnlyCanonicalTravelClue: true,
          sharedCityClues,
          sharedSuspectClues,
          isRepeat: this.isRepeat,
          previousNotes,
          isCrimeCity: this.isCrimeCity,
          isNextTargetCity: this.isNextTargetCity,
          isCorrectCity: this.isCorrectCity
        });

    const fallbackLines = this.isFalseLead
      ? [
          'Wrong city, detective.',
          'Nobody here gave me anything worth trusting.',
          'Check the trail before you waste another conversation.'
        ]
      : this.isCrimeCity
      ? [
          'You are in the crime city, detective.',
          'People here noticed more than they admit.',
          'Start with the smallest inconsistency and the trail will open.'
        ]
      : [
          'I saw something strange, detective.',
          'Something about the suspect stood out, but not enough for amateurs.',
          'They were asking about another city, and not casually.'
        ];

    this.lines = Array.isArray(generatedDialogue?.lines)
      ? generatedDialogue.lines.filter(Boolean).slice(0, 3)
      : [];

    while (this.lines.length < 3) {
      this.lines.push(fallbackLines[this.lines.length]);
    }

    this.generatedNotes = Array.isArray(generatedDialogue?.notes)
      ? generatedDialogue.notes.filter(Boolean)
      : [];

    const backgroundKey = this.getLocationBackgroundKey(this.locationId);

    if (backgroundKey && this.textures.exists(backgroundKey)) {
      this.add
        .image(width / 2, height / 2, backgroundKey)
        .setDisplaySize(width, height);
    } else if (cityData?.backgroundKey && this.textures.exists(cityData.backgroundKey)) {
      this.add
        .image(width / 2, height / 2, cityData.backgroundKey)
        .setDisplaySize(width, height);
    } else {
      this.cameras.main.setBackgroundColor('#1a1a1a');
    }

    this.createDialoguePanel(width, height);
    ensureHud(this);

    const activeHud = this.scene.get('PlayerHudScene');
    if (activeHud?.refreshNotebook) {
      activeHud.refreshNotebook();
    } else if (activeHud?.refreshUI) {
      activeHud.refreshUI();
    }

    if (!this.timeCostApplied) {
      const encounterTimeHours = 1;
      const encounterTimeMinutes = 0;

      EventBus.emit('advanceTime', encounterTimeHours, encounterTimeMinutes);
      gameState.timeSpent = (gameState.timeSpent || 0) + encounterTimeHours;

      this.timeCostApplied = true;
    }

    this.input.on('pointerdown', this.handlePointerDown, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.handleShutdown, this);
  }

  createDialoguePanel(width, height) {
    this.dialoguePanel = this.add
      .rectangle(0, height - 220, width, 220, 0x111111, 0.82)
      .setOrigin(0, 0)
      .setDepth(10);

    const npcNameY = this.npcId === 'fence' ? height - 198 : height - 205;

    this.npcNameText = this.add
      .text(30, npcNameY, this.getNpcDisplayName(this.npcId), {
        fontFamily: 'Special Elite',
        fontSize: '28px',
        color: '#ffd86b'
      })
      .setDepth(11);

    this.dialogueText = this.add
      .text(30, height - 155, this.lines.join('\n'), {
        fontFamily: 'Special Elite',
        fontSize: '24px',
        color: '#ffffff',
        wordWrap: { width: width - 60 }
      })
      .setDepth(11);

    const footerText = this.isCrimeCity
      ? 'Crime city witness'
      : this.isNextTargetCity
      ? 'Hot trail witness'
      : this.isFalseLead
      ? 'Cold lead'
      : 'Click to leave';

    this.footerTextObject = this.add
      .text(width - 260, height - 42, footerText, {
        fontFamily: 'Special Elite',
        fontSize: '18px',
        color: '#cccccc'
      })
      .setDepth(11);
  }

  handleShutdown() {
    this.input.off('pointerdown', this.handlePointerDown, this);

    if (this.locationAmbient?.isPlaying) {
      this.locationAmbient.stop();
    }
    if (this.locationAmbient?.destroy) {
      this.locationAmbient.destroy();
    }
    this.locationAmbient = null;

    if (this.dialogueText) {
      this.dialogueText.destroy();
      this.dialogueText = null;
    }

    if (this.footerTextObject) {
      this.footerTextObject.destroy();
      this.footerTextObject = null;
    }

    if (this.npcNameText) {
      this.npcNameText.destroy();
      this.npcNameText = null;
    }

    if (this.dialoguePanel) {
      this.dialoguePanel.destroy();
      this.dialoguePanel = null;
    }

    this.lines = [];
    this.generatedNotes = [];
    this.encounterMemory = null;
    this.isFinishing = false;
  }

  closeAllUIPanels() {
    const hud = this.scene.get('PlayerHudScene');
    if (hud?.closeAllUIPanels) {
      hud.closeAllUIPanels();
    }
  }

  handlePointerDown(pointer, currentlyOver, event) {
    if (event?.stopPropagation) {
      event.stopPropagation();
    }

    if (this.isFinishing) return;
    if (this.isAnyUIOpen()) return;

    this.finishEncounter();
  }

  isAnyUIOpen() {
    const hud = this.scene.get('PlayerHudScene');
    if (hud?.isAnyPanelOpen) {
      return hud.isAnyPanelOpen();
    }

    return false;
  }

  finishEncounter() {
    if (this.isFinishing) return;
    this.isFinishing = true;

    this.input.off('pointerdown', this.handlePointerDown, this);

    if (!Array.isArray(gameState.cluesCollected)) {
      gameState.cluesCollected = [];
    }

    if (!Array.isArray(gameState.visitedEncounters)) {
      gameState.visitedEncounters = [];
    }

    if (
      !gameState.encounterMemory ||
      typeof gameState.encounterMemory !== 'object' ||
      Array.isArray(gameState.encounterMemory)
    ) {
      gameState.encounterMemory = {};
    }

    if (this.encounterId && !gameState.visitedEncounters.includes(this.encounterId)) {
      gameState.visitedEncounters.push(this.encounterId);
    }

    if (!this.isRepeat && !this.isFalseLead && this.generatedNotes.length > 0) {
      this.generatedNotes.forEach(note => {
        if (note && !this.hasClue(note)) {
          gameState.cluesCollected.push(note);
        }
      });
    }

    if (this.encounterId && !this.isFalseLead) {
      const existingMemory = gameState.encounterMemory[this.encounterId] || null;

      if (!existingMemory && !this.isRepeat) {
        gameState.encounterMemory[this.encounterId] = {
          firstDialogueSeen: true,
          reminderShown: false,
          notes: [...this.generatedNotes],
          lines: [...this.lines],
          isCrimeCity: this.isCrimeCity,
          isNextTargetCity: this.isNextTargetCity,
          dialogueTargetCityId: this.dialogueTargetCityId || null
        };
      } else if (existingMemory && this.isReminder) {
        gameState.encounterMemory[this.encounterId] = {
          ...existingMemory,
          reminderShown: true,
          dialogueTargetCityId:
            existingMemory.dialogueTargetCityId ||
            this.dialogueTargetCityId ||
            null
        };
      }
    }

    saveGameState();

    const hud = this.scene.get('PlayerHudScene');
    if (hud?.refreshNotebook) {
      hud.refreshNotebook();
    } else if (hud?.refreshUI) {
      hud.refreshUI();
    }

    this.scene.start('CityScene', {
      cityId: this.cityId,
      cityCompleted: false,
      investigationStatus: null
    });
  }

  hasClue(newClue) {
    return gameState.cluesCollected.some(existing => {
      if (!existing || !newClue) return false;

      return (
        existing.type === newClue.type &&
        existing.category === newClue.category &&
        existing.key === newClue.key &&
        existing.cityId === newClue.cityId &&
        existing.tag === newClue.tag &&
        existing.value === newClue.value
      );
    });
  }

  getNpcDisplayName(npcId) {
    const names = {
      bankier: 'Banker',
      stewardessa: 'Flight Attendant',
      maid: 'Maid',
      police: 'Police Officer',
      fence: 'Fence',
      parkingowy: 'Parking Worker',
      knajpa: 'Restaurant Manager',
      bum: 'Homeless Man'
    };

    return names[npcId] || npcId || 'Unknown witness';
  }

  getLocationBackgroundKey(locationId) {
    const map = {
      hotel: 'hotel_maid',
      hotel_maid: 'hotel_maid',
      parking: 'parking_bg',
      parking_bg: 'parking_bg',
      garbage: 'garbage'
    };

    return map[locationId] || locationId || null;
  }

  addHoverEffect(button, baseScale = 0.8, hoverScale = 0.9) {
    button.on('pointerover', () => button.setScale(hoverScale));
    button.on('pointerout', () => button.setScale(baseScale));
  }
}