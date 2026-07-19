import { gameState, saveGameState } from './GameData.js';
import { buildNpcDialogue } from './dialogueBuilder.js';
import { ensureHud } from './hudHelpers.js';

const NPC_DIALOGUE_CACHE_MAP = {
  bankier: 'dialogue_banker',
  stewardessa: 'dialogue_stewardess',
  maid: 'dialogue_maid',
  police: 'dialogue_police',
  bum: 'dialogue_bum',
  parkingowy: 'dialogue_parkingowy'
};

const NPC_DIALOGUE_ROOT_MAP = {
  bankier: 'bankerClues',
  stewardessa: 'stewardessClues',
  maid: 'maidClues',
  police: 'policeClues',
  bum: 'bumClues',
  parkingowy: 'parkingowyClues'
};

export class LocationScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LocationScene' });
    this.lines = [];
    this.generatedNotes = [];
    this.isRepeat = false;
    this.isFinishing = false;
    this.dialogueText = null;
    this.cityId = null;
    this.encounterId = null;
    this.npcId = null;
    this.locationId = null;
  }

  init(data = {}) {
    this.cityId = data.cityId || null;
    this.encounterId = data.encounterId || null;
    this.npcId = data.npcId || null;
    this.locationId = data.locationId || null;
    this.isRepeat = Boolean(data.isRepeat);

    this.lines = [];
    this.generatedNotes = [];
    this.isFinishing = false;
    this.dialogueText = null;

    if (!Array.isArray(gameState.cluesCollected)) {
      gameState.cluesCollected = [];
    }

    if (!Array.isArray(gameState.visitedEncounters)) {
      gameState.visitedEncounters = [];
    }
  }

  create() {
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

    const suspect = suspects.find(
      s => s.portraitKey === gameState.currentSuspectPortraitKey
    ) || null;

    const targetCityId = gameState.nextTargetCityId ?? null;

    if (!dialogueCacheKey || !dialogueRootKey) {
      console.warn(`LocationScene: unknown npcId "${this.npcId}"`);
    }

    const generatedDialogue = buildNpcDialogue({
      npcData: npcDialogueBlock,
      suspect,
      cityId: this.cityId,
      targetCityId,
      sharedCityClues,
      sharedSuspectClues,
      isRepeat: this.isRepeat
    });

    const fallbackLines = [
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

    if (this.locationId && this.textures.exists(this.locationId)) {
      this.add
        .image(width / 2, height / 2, this.locationId)
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

    this.input.on('pointerdown', this.handlePointerDown, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.handlePointerDown, this);
    });
  }

  createDialoguePanel(width, height) {
    this.add
      .rectangle(0, height - 220, width, 220, 0x111111, 0.82)
      .setOrigin(0, 0)
      .setDepth(10);

    const npcNameY = this.npcId === 'bum' ? height - 198 : height - 205;

    this.add.text(30, npcNameY, this.getNpcDisplayName(this.npcId), {
      fontFamily: 'Special Elite',
      fontSize: '28px',
      color: '#ffd86b'
    }).setDepth(11);

    this.dialogueText = this.add.text(30, height - 155, this.lines.join('\n'), {
      fontFamily: 'Special Elite',
      fontSize: '24px',
      color: '#ffffff',
      wordWrap: { width: width - 60 }
    }).setDepth(11);

    this.add.text(width - 230, height - 42, 'Click to leave', {
      fontFamily: 'Special Elite',
      fontSize: '18px',
      color: '#cccccc'
    }).setDepth(11);
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

    if (this.encounterId && !gameState.visitedEncounters.includes(this.encounterId)) {
      gameState.visitedEncounters.push(this.encounterId);
    }

    if (!this.isRepeat && this.generatedNotes.length > 0) {
      this.generatedNotes.forEach(note => {
        if (note && !this.hasClue(note)) {
          gameState.cluesCollected.push(note);
        }
      });
    }

    saveGameState();

    const hud = this.scene.get('PlayerHudScene');
    if (hud?.refreshNotebook) {
      hud.refreshNotebook();
    } else if (hud?.refreshUI) {
      hud.refreshUI();
    }

    this.scene.start('CityScene', {
      cityId: this.cityId
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
      stewardessa: 'Stewardess',
      maid: 'Maid',
      police: 'Police Officer',
      bum: 'Homeless',
      parkingowy: 'Parking Worker'
    };

    return names[npcId] || npcId || 'Unknown witness';
  }

  addHoverEffect(button, baseScale = 0.8, hoverScale = 0.9) {
    button.on('pointerover', () => button.setScale(hoverScale));
    button.on('pointerout', () => button.setScale(baseScale));
  }
}