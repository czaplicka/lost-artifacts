import { gameState } from '../GameData.js';
import { saveGameState } from '../GameStatePersistence.js';
import { NPCController } from '../NPCController.js';
import { ensureHud } from '../hudHelpers.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { getEnergyManager } from '../managers/EnergyManager.js';
import { NPC_DIALOGUE_KEY_MAP } from '../dialogues/dialogueKeys.js';
import {
  resolveCityNpcTheme,
  getLocationBackgroundCandidates,
  getNpcTextureKey,
  getNpcLabel
} from '../npcThemeHelper.js';


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


const TOPIC_LABELS = {
  features: 'Features',
  accent: 'Accent',
  hair: 'Hair',
  eyes: 'Eyes',
  skills: 'Skills',
  habitus: 'Habits',
  currency: 'Money',
  travel: 'Where next?'
};


const TYPEWRITER_CHAR_DELAY = 18;

const PANEL_GOLD = 0xd4af37;
const PANEL_GOLD_DIM = 0x8a6d1f;
const PANEL_BG = 0x201409;
const PANEL_BG_ALPHA = 0.92;

const PORTRAIT_SLIDE_OFFSET = -90;
const PORTRAIT_ANIM_DURATION = 480;
const PORTRAIT_ANIM_DELAY = 120;
const NAME_FADE_DURATION = 260;
const NAME_FADE_DELAY = PORTRAIT_ANIM_DELAY + PORTRAIT_ANIM_DURATION - 120;


export class LocationScene extends BaseScene {
  constructor() {
    super({ key: 'LocationScene' });
    this.generatedNotes = [];
    this.isRepeat = false;
    this.isFinishing = false;
    this.dialogueText = null;
    this.footerTextObject = null;
    this.npcNameText = null;
    this.dialoguePanel = null;
    this.panelBorder = null;
    this.portraitFrame = null;
    this.portraitImage = null;
    this.continueIndicator = null;
    this.topicButtons = [];
    this.leaveButton = null;
    this.cityId = null;
    this.encounterId = null;
    this.npcId = null;
    this.locationId = null;
    this.encounterMemory = null;
    this.isCorrectCity = true;
    this.isCrimeCity = false;
    this.isNextTargetCity = false;
    this.isFalseLead = false;
    this.timeCostApplied = false;
    this.dialogueTargetCityId = null;
    this.locationAmbient = null;
    this.npcTheme = 'default';
    this.fullDialogueString = '';
    this.isTyping = false;
    this.typewriterEvent = null;
    this.npcController = null;
    this.availableTopics = [];
    this.askedTopics = new Set();
  }


  init(data = {}) {
    this.cityId = data.cityId || null;
    this.encounterId = data.encounterId || null;
    this.npcId = data.npcId || null;
    this.locationId = data.locationId || null;
    this.isRepeat = Boolean(data.isRepeat);


    const rm = gameState.routeManager;
    const expectedCityId =
      rm && typeof rm.getNextExpectedCity === 'function'
        ? rm.getNextExpectedCity()
        : gameState.nextTargetCityId || null;


    const derivedIsCrimeCity =
      Boolean(this.cityId) && this.cityId === gameState.crimeCityId;


    const derivedIsNextTargetCity =
      Boolean(this.cityId) && this.cityId === expectedCityId;


    const derivedJustReached =
      Boolean(this.cityId) && this.cityId === gameState.justReachedCorrectCityId;


    this.isCrimeCity = data.isCrimeCity ?? derivedIsCrimeCity;
    this.isNextTargetCity = data.isNextTargetCity ?? derivedIsNextTargetCity;
    this.isCorrectCity =
      data.isCorrectCity ??
      Boolean(derivedIsCrimeCity || derivedIsNextTargetCity || derivedJustReached);


    this.generatedNotes = [];
    this.isFinishing = false;
    this.dialogueText = null;
    this.footerTextObject = null;
    this.npcNameText = null;
    this.dialoguePanel = null;
    this.panelBorder = null;
    this.portraitFrame = null;
    this.portraitImage = null;
    this.continueIndicator = null;
    this.topicButtons = [];
    this.leaveButton = null;
    this.encounterMemory = null;
    this.isFalseLead = !this.isCorrectCity;
    this.timeCostApplied = false;
    this.dialogueTargetCityId = data.dialogueTargetCityId || null;
    this.locationAmbient = null;
    this.fullDialogueString = '';
    this.isTyping = false;
    this.typewriterEvent = null;
    this.npcController = null;
    this.availableTopics = [];
    this.askedTopics = new Set();


    if (!Array.isArray(gameState.cluesCollected)) gameState.cluesCollected = [];
    if (!Array.isArray(gameState.visitedEncounters)) gameState.visitedEncounters = [];
    if (
      !gameState.encounterMemory ||
      typeof gameState.encounterMemory !== 'object' ||
      Array.isArray(gameState.encounterMemory)
    ) {
      gameState.encounterMemory = {};
    }
  }


  create() {
    super.create();
    this.scene.get('NewsHud').events.emit('setNewspaperVisible', false);
    this.scene.get('NewsHud').events.emit('setTvVisible', false);
    audioManager.init(this);
    if (!audioManager.isMusicPlaying('themeGame')) audioManager.playMusic('themeGame', { loop: true });


    const locationSoundKey = LOCATION_SOUND_MAP[this.locationId];
    if (locationSoundKey) {
      this.locationAmbient = audioManager.playAmbient(locationSoundKey, { volume: 0.22, loop: true });
    }


    const hud = this.scene.get('PlayerHudScene');
    if (hud?.closeAllUIPanels) hud.closeAllUIPanels();


    const width = this.scale.width;
    const height = this.scale.height;


    const suspects = this.cache.json.get('suspects') || [];
    const locations = this.cache.json.get('locations') || [];
    const countryFacts = this.cache.json.get('country_facts') || {};


    const dialogueCacheKey = NPC_DIALOGUE_KEY_MAP[this.npcId];
    const dialogueRootKey = NPC_DIALOGUE_ROOT_MAP[this.npcId];


    const rawDialogueFile = dialogueCacheKey
      ? this.cache.json.get(dialogueCacheKey)
      : null;


    const npcDialogueBlock = rawDialogueFile?.[dialogueRootKey] || {};
    const npcLocationVariants = npcDialogueBlock.locationVariants || {};
    const cityData = locations.find(city => city.id === this.cityId) || null;
    this.npcTheme = resolveCityNpcTheme(cityData);


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


    this.askedTopics = new Set(
      Array.isArray(this.encounterMemory?.askedTopics) ? this.encounterMemory.askedTopics : []
    );


    const rm = gameState.routeManager;
    const expectedCityId =
      rm && typeof rm.getNextExpectedCity === 'function'
        ? rm.getNextExpectedCity()
        : gameState.nextTargetCityId || null;


    this.dialogueTargetCityId =
      this.dialogueTargetCityId ||
      expectedCityId ||
      this.encounterMemory?.dialogueTargetCityId ||
      null;


    if (this.dialogueTargetCityId === this.cityId) {
      this.dialogueTargetCityId = expectedCityId || null;
    }


    try {
      this.npcController = new NPCController(
        npcLocationVariants,
        countryFacts,
        this.cityId,
        suspect || {},
        {
          targetCityId: this.dialogueTargetCityId,
          isCorrectCity: this.isCorrectCity
        }
      );
    } catch (error) {
      console.warn('[LocationScene] Failed to build NPCController:', error);
      this.npcController = null;
    }


    this.availableTopics = this.npcController ? this.npcController.getAvailableTopics() : [];


    this.fullDialogueString = this.npcController
      ? this.isFalseLead
        ? this.npcController.getFalseLeadLine().text
        : this.isRepeat
        ? this.npcController.getRepeatLine()
        : this.npcController.getBanterLine()
      : 'There is nobody here who remembers anything useful.';


const backgroundKey = this.getLocationBackgroundKey(
  this.locationId,
  cityData
);


if (backgroundKey) {
  this.add
    .image(width / 2, height / 2, backgroundKey)
    .setDisplaySize(width, height);
} else if (cityData?.backgroundKey && this.textures.exists(cityData.backgroundKey)) {
  this.add
    .image(width / 2, height / 2, cityData.backgroundKey)
    .setDisplaySize(width, height);
} else {
  console.warn('[LocationScene] Missing location background:', {
    cityId: this.cityId,
    locationId: this.locationId
  });


  this.cameras.main.setBackgroundColor('#1a1a1a');
}


    this.createDialoguePanel(width, height);
    ensureHud(this);


    const activeHud = this.scene.get('PlayerHudScene');
    if (activeHud?.refreshNotebook) activeHud.refreshNotebook();
    else if (activeHud?.refreshUI) activeHud.refreshUI();


    if (!this.timeCostApplied) {
      EventBus.emit('advanceTime', 1, 0);
      gameState.timeSpent = (gameState.timeSpent || 0) + 1;
      this.timeCostApplied = true;
    }


    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.handleShutdown, this);
  }


  createDialoguePanel(width, height) {
    const panelHeight = 232;
    const panelY = height - panelHeight;
    const portraitSize = 150;
    const portraitMargin = 18;
    const portraitX = portraitMargin;
    const portraitY = panelY + (panelHeight - portraitSize) / 2;
    const textStartX = portraitX + portraitSize + 30;
    const portraitCenterX = portraitX + portraitSize / 2;
    const portraitCenterY = portraitY + portraitSize / 2;
    const nameTargetY = portraitY + portraitSize + 14;
    const menuWidth = 190;
    const textEndX = width - menuWidth - 20;


    this.dialoguePanel = this.add
      .rectangle(0, panelY, width, panelHeight, PANEL_BG, PANEL_BG_ALPHA)
      .setOrigin(0, 0)
      .setDepth(10);


    this.panelBorder = this.add.graphics().setDepth(10);
    this.panelBorder.lineStyle(4, PANEL_GOLD, 1);
    this.panelBorder.strokeRect(6, panelY + 6, width - 12, panelHeight - 12);
    this.panelBorder.lineStyle(1, PANEL_GOLD_DIM, 0.9);
    this.panelBorder.strokeRect(12, panelY + 12, width - 24, panelHeight - 24);
    this.panelBorder.lineStyle(1, PANEL_GOLD_DIM, 0.6);
    this.panelBorder.lineBetween(textEndX, panelY + 16, textEndX, panelY + panelHeight - 16);


    this.portraitFrame = this.add.graphics().setDepth(11);
    this.portraitFrame.fillStyle(0x000000, 0.6);
    this.portraitFrame.fillRect(portraitX - 4, portraitY - 4, portraitSize + 8, portraitSize + 8);
    this.portraitFrame.lineStyle(3, PANEL_GOLD, 1);
    this.portraitFrame.strokeRect(portraitX - 4, portraitY - 4, portraitSize + 8, portraitSize + 8);


    const portraitKey = getNpcTextureKey(this.npcId, this.npcTheme);


    if (portraitKey && this.textures.exists(portraitKey)) {
      this.portraitImage = this.add
        .image(portraitCenterX, portraitCenterY, portraitKey)
        .setDisplaySize(portraitSize, portraitSize)
        .setDepth(12);
    } else {
      this.portraitImage = this.add
        .text(portraitCenterX, portraitCenterY, '?', {
          fontFamily: 'PressStart2P',
          fontSize: '48px',
          color: '#d4af37'
        })
        .setOrigin(0.5)
        .setDepth(12);
    }


    this.npcNameText = this.add
      .text(portraitCenterX, nameTargetY, getNpcLabel(this.npcId), {
        fontFamily: 'PressStart2P',
        fontSize: '12px',
        color: '#ffd86b',
        align: 'center',
        wordWrap: { width: portraitSize + 20 }
      })
      .setOrigin(0.5, 0)
      .setDepth(12);


    this.portraitFrame.x = PORTRAIT_SLIDE_OFFSET;
    this.portraitFrame.alpha = 0;


    this.tweens.add({
      targets: this.portraitFrame,
      x: 0,
      alpha: 1,
      duration: PORTRAIT_ANIM_DURATION,
      delay: PORTRAIT_ANIM_DELAY,
      ease: 'Back.Out'
    });


    this.portraitImage.x = portraitCenterX + PORTRAIT_SLIDE_OFFSET;
    this.portraitImage.alpha = 0;


    this.tweens.add({
      targets: this.portraitImage,
      x: portraitCenterX,
      alpha: 1,
      duration: PORTRAIT_ANIM_DURATION,
      delay: PORTRAIT_ANIM_DELAY,
      ease: 'Back.Out'
    });


    this.npcNameText.alpha = 0;


    this.tweens.add({
      targets: this.npcNameText,
      alpha: 1,
      duration: NAME_FADE_DURATION,
      delay: NAME_FADE_DELAY
    });


    this.dialogueText = this.add
      .text(textStartX, panelY + 26, '', {
        fontFamily: 'SpecialElite',
        fontSize: '22px',
        color: '#f4ecd8',
        lineSpacing: 8,
        wordWrap: { width: textEndX - textStartX - 20 }
      })
      .setDepth(12)
      .setInteractive()
      .on('pointerdown', () => {
        if (this.isTyping) this.completeTypewriter();
      });


    const footerText = this.isCrimeCity
      ? 'Crime city witness'
      : this.isNextTargetCity
      ? 'Hot trail witness'
      : this.isFalseLead
      ? 'Cold lead'
      : 'Witness statement';


    this.footerTextObject = this.add
      .text(textStartX, panelY + panelHeight - 30, footerText, {
        fontFamily: 'SpecialElite',
        fontSize: '15px',
        color: '#9a8a63'
      })
      .setDepth(12);


    this.continueIndicator = this.add
      .triangle(textEndX - 24, panelY + panelHeight - 30, 0, 0, 16, 8, 0, 16, PANEL_GOLD)
      .setDepth(12)
      .setVisible(false);


    this.tweens.add({
      targets: this.continueIndicator,
      alpha: { from: 1, to: 0.15 },
      duration: 550,
      yoyo: true,
      repeat: -1
    });


    this.createTopicMenu(width, panelY, panelHeight, menuWidth);
    this.startTypewriter();
  }


  createTopicMenu(width, panelY, panelHeight, menuWidth) {
    const menuX = width - menuWidth + 10;
    let buttonY = panelY + 24;
    const buttonSpacing = 32;


    this.topicButtons.forEach(btn => btn.text?.destroy());
    this.topicButtons = [];


    if (!this.isFalseLead) {
      this.availableTopics.forEach(topicId => {
        const label = TOPIC_LABELS[topicId] || topicId;
        const alreadyAsked = this.askedTopics.has(topicId);


        const button = this.add
          .text(menuX, buttonY, label, {
            fontFamily: 'SpecialElite',
            fontSize: '18px',
            color: alreadyAsked ? '#7a7160' : '#ffd86b'
          })
          .setDepth(13)
          .setInteractive({ useHandCursor: true });


        button.on('pointerover', () => button.setColor('#ffffff'));
        button.on('pointerout', () => {
          button.setColor(this.askedTopics.has(topicId) ? '#7a7160' : '#ffd86b');
        });
        button.on('pointerdown', () => this.handleTopicClick(topicId));


        this.topicButtons.push({ topicId, text: button });
        buttonY += buttonSpacing;
      });
    }


    this.leaveButton = this.add
      .text(menuX, panelY + panelHeight - 34, 'Leave', {
        fontFamily: 'SpecialElite',
        fontSize: '18px',
        color: '#d4af37'
      })
      .setDepth(13)
      .setInteractive({ useHandCursor: true });


    this.leaveButton.on('pointerover', () => this.leaveButton.setColor('#ffffff'));
    this.leaveButton.on('pointerout', () => this.leaveButton.setColor('#d4af37'));
    this.leaveButton.on('pointerdown', () => this.finishEncounter());
  }


  handleTopicClick(topicId) {
    if (!this.npcController || this.isFinishing) return;
    if (this.isTyping) this.completeTypewriter();


    const result = this.npcController.askTopic(topicId);
    const alreadyAsked = this.askedTopics.has(topicId);


    if (!alreadyAsked) {
      const note = this.npcController.toNote(result);
      if (note && !this.hasClue(note)) {
        this.generatedNotes.push(note);
      }
      this.askedTopics.add(topicId);
    }


    this.fullDialogueString = result.text;
    this.startTypewriter();


    this.topicButtons.forEach(({ topicId: id, text }) => {
      text.setColor(this.askedTopics.has(id) ? '#7a7160' : '#ffd86b');
    });
  }


  startTypewriter() {
    this.isTyping = true;
    this.continueIndicator?.setVisible(false);


    let charIndex = 0;
    const fullText = this.fullDialogueString;
    this.dialogueText?.setText('');


    if (this.typewriterEvent) {
      this.typewriterEvent.remove(false);
      this.typewriterEvent = null;
    }


    this.typewriterEvent = this.time.addEvent({
      delay: TYPEWRITER_CHAR_DELAY,
      loop: true,
      callback: () => {
        charIndex += 1;
        this.dialogueText?.setText(fullText.slice(0, charIndex));


        if (charIndex >= fullText.length) {
          this.completeTypewriter();
        }
      }
    });
  }


  completeTypewriter() {
    if (this.typewriterEvent) {
      this.typewriterEvent.remove(false);
      this.typewriterEvent = null;
    }


    this.dialogueText?.setText(this.fullDialogueString);
    this.isTyping = false;
    this.continueIndicator?.setVisible(true);
  }


onNpcInteraction(npc) {
  const energyManager = getEnergyManager();
  const result = energyManager.consumeInterview('medium');
  console.log(`💬 ${result.label}`);
  this.startDialog(npc);
}
  handleShutdown() {
    if (this.typewriterEvent) {
      this.typewriterEvent.remove(false);
      this.typewriterEvent = null;
    }


    if (this.locationAmbient?.isPlaying) this.locationAmbient.stop();
    if (this.locationAmbient?.destroy) this.locationAmbient.destroy();
    this.locationAmbient = null;


    if (this.dialogueText) this.dialogueText.destroy();
    if (this.footerTextObject) this.footerTextObject.destroy();
    if (this.npcNameText) this.npcNameText.destroy();
    if (this.dialoguePanel) this.dialoguePanel.destroy();
    if (this.panelBorder) this.panelBorder.destroy();
    if (this.portraitFrame) this.portraitFrame.destroy();
    if (this.portraitImage) this.portraitImage.destroy();
    if (this.continueIndicator) this.continueIndicator.destroy();
    this.topicButtons.forEach(btn => btn.text?.destroy());
    if (this.leaveButton) this.leaveButton.destroy();


    this.dialogueText = null;
    this.footerTextObject = null;
    this.npcNameText = null;
    this.dialoguePanel = null;
    this.panelBorder = null;
    this.portraitFrame = null;
    this.portraitImage = null;
    this.continueIndicator = null;
    this.topicButtons = [];
    this.leaveButton = null;
    this.generatedNotes = [];
    this.encounterMemory = null;
    this.isFinishing = false;
  }


  closeAllUIPanels() {
    const hud = this.scene.get('PlayerHudScene');
    if (hud?.closeAllUIPanels) hud.closeAllUIPanels();
  }


  finishEncounter() {
    if (this.isFinishing) return;
    this.isFinishing = true;


    if (!Array.isArray(gameState.cluesCollected)) gameState.cluesCollected = [];
    if (!Array.isArray(gameState.visitedEncounters)) gameState.visitedEncounters = [];
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


    if (!this.isFalseLead && this.generatedNotes.length > 0) {
      this.generatedNotes.forEach(note => {
        if (note && !this.hasClue(note)) {
          gameState.cluesCollected.push(note);
        }
      });
    }


    if (this.encounterId && !this.isFalseLead) {
      const existingMemory = gameState.encounterMemory[this.encounterId] || {};


      gameState.encounterMemory[this.encounterId] = {
        ...existingMemory,
        firstDialogueSeen: true,
        askedTopics: Array.from(this.askedTopics),
        dialogueTargetCityId:
          existingMemory.dialogueTargetCityId ||
          this.dialogueTargetCityId ||
          null
      };
    }


    saveGameState();


    const hud = this.scene.get('PlayerHudScene');
    if (hud?.refreshNotebook) hud.refreshNotebook();
    else if (hud?.refreshUI) hud.refreshUI();


    this.goto('CityScene', {
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


getLocationBackgroundKey(locationId, cityData = null) {
  const themeId = resolveCityNpcTheme(cityData);


  const candidates = getLocationBackgroundCandidates(locationId, themeId);


  const backgroundKey = candidates.find(textureKey =>
    this.textures.exists(textureKey)
  );


  if (backgroundKey) {
    return backgroundKey;
  }


  console.warn('[LocationScene] No matching location texture found:', {
    cityId: cityData?.id || this.cityId,
    npcTheme: themeId,
    locationId,
    candidates
  });


  return null;
}


  addHoverEffect(button, baseScale = 0.8, hoverScale = 0.9) {
    button.on('pointerover', () => button.setScale(hoverScale));
    button.on('pointerout', () => button.setScale(baseScale));
  }
}