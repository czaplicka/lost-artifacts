import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { NPCController } from '../dialogues/NPCController.js';
import { ensureHud } from '../hudHelpers.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';
import { getEnergyManager } from '../managers/EnergyManager.js';
import { BaseScene } from './BaseScene.js';
import { getNpcAccess } from '../managers/ReputationManager.js';

import {
  NPC_DIALOGUE_KEY_MAP,
  NPC_DIALOGUE_ROOT_MAP,
  NPC_DIALOGUE_FILE_MAP
} from '../dialogues/dialogueKeys.js';

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
  restaurant: 'restaurantsound'
};

const TOPIC_LABELS = {
  features: 'Features',
  accent: 'Accent',
  hair: 'Hair',
  eyes: 'Eyes',
  skills: 'Skills',
  habitus: 'Habits',
  currency: 'Money',
  travel: 'Where next?',
  motive: 'What really happened?'
};

const INTERVIEW_DURATION = 'medium';

const TYPEWRITER_CHARS_PER_TICK = 3;
const TYPEWRITER_TICK_DELAY = 54;

const PANEL_GOLD = 0xd4af37;
const PANEL_GOLD_DIM = 0x8a6d1f;
const PANEL_BG = 0x201409;
const PANEL_BG_ALPHA = 0.92;

const PORTRAIT_SLIDE_OFFSET = -90;
const PORTRAIT_ANIM_DURATION = 480;
const PORTRAIT_ANIM_DELAY = 120;
const NAME_FADE_DURATION = 260;

const NAME_FADE_DELAY =
  PORTRAIT_ANIM_DELAY + PORTRAIT_ANIM_DURATION - 120;

export class LocationScene extends BaseScene {
  constructor() {
    super({ key: 'LocationScene' });

    this.topicButtons = [];
    this.generatedNotes = [];
    this.askedTopics = new Set();
    this.typewriterEvent = null;
    this.locationAmbient = null;
  }

  init(data = {}) {
    this.stopTypewriter();

    this.cityId = data.cityId || null;
    this.encounterId = data.encounterId || null;
    this.npcId = data.npcId || null;
    this.locationId = data.locationId || null;
    this.isRepeat = Boolean(data.isRepeat);

    const manager = gameState.routeManager;

    const expectedCityId =
      typeof manager?.getNextExpectedCity === 'function'
        ? manager.getNextExpectedCity()
        : gameState.nextTargetCityId || null;

    const derivedCrimeCity = Boolean(
      this.cityId &&
      this.cityId === gameState.crimeCityId
    );

    const derivedTargetCity = Boolean(
      this.cityId &&
      this.cityId === expectedCityId
    );

    const derivedJustReached = Boolean(
      this.cityId &&
      this.cityId === gameState.justReachedCorrectCityId
    );

    this.isCrimeCity = data.isCrimeCity ?? derivedCrimeCity;
    this.isNextTargetCity =
      data.isNextTargetCity ?? derivedTargetCity;

    this.isCorrectCity = data.isCorrectCity ?? Boolean(
      derivedCrimeCity ||
      derivedTargetCity ||
      derivedJustReached
    );

    this.generatedNotes = [];
    this.isFinishing = false;
    this.isFalseLead = !this.isCorrectCity;
    this.timeCostApplied = false;

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
    this.dialogueTargetCityId = data.dialogueTargetCityId || null;
    this.locationAmbient = null;
    this.npcTheme = 'default';

    this.fullDialogueString = '';
    this.isTyping = false;
    this.npcController = null;
    this.availableTopics = [];
    this.askedTopics = new Set();

    this.entryEnergyPaid = false;
    this.entryBlocked = false;
    this.entryEnergyCost = null;

    this.ensureEncounterMemory();

    this.reputationAccess = getNpcAccess(this.npcId, {
      isCrimeCity: this.isCrimeCity
    });
  }

  preload() {
    const cacheKey = NPC_DIALOGUE_KEY_MAP[this.npcId];
    const filePath = NPC_DIALOGUE_FILE_MAP[this.npcId];

    if (
      cacheKey &&
      filePath &&
      !this.cache.json.exists(cacheKey)
    ) {
      this.load.json(cacheKey, filePath);
    }
  }

  ensureEncounterMemory() {
    if (
      !gameState.encounterMemory ||
      typeof gameState.encounterMemory !== 'object' ||
      Array.isArray(gameState.encounterMemory)
    ) {
      gameState.encounterMemory = {};
    }
  }

  getEncounterEnergyCost() {
    const energy = getEnergyManager();

    const taxi = energy.getTravelCost('taxi');
    const interview = energy.getInterviewCost(
      INTERVIEW_DURATION
    );

    return {
      taxi,
      interview,
      total: taxi + interview
    };
  }

  payEncounterEnergy() {
    // Crime-city conversations retain their existing rules.
    if (this.isCrimeCity) return true;

    if (this.entryEnergyPaid) return true;

    const energy = getEnergyManager();
    const cost = this.getEncounterEnergyCost();

    this.entryEnergyCost = cost;

    const affordability = energy.canAfford(cost.total);

    if (!affordability.ok) {
      this.entryBlocked = true;

      this.fullDialogueString = [
        energy.getInsufficientEnergyMessage(cost.total),
        '',
        `Taxi: ${cost.taxi} energy.`,
        `Conversation: ${cost.interview} energy.`,
        '',
        'Return to the city and rest, eat or drink first.'
      ].join('\n');

      return false;
    }

    // One atomic payment prevents paying for a taxi
    // without having enough energy left for the conversation.
    const result = energy.consumeCustom(
      cost.total,
      `NPC visit: taxi -${cost.taxi}, conversation -${cost.interview}`,
      {
        requireFullAmount: true,
        activityType: 'escape_city_npc_visit'
      }
    );

    if (!result.success) {
      this.entryBlocked = true;

      this.fullDialogueString =
        result.message ||
        energy.getInsufficientEnergyMessage(cost.total);

      return false;
    }

    this.entryEnergyPaid = true;
    saveGameState();

    return true;
  }

  create() {
    super.create();

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.handleShutdown,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.DESTROY,
      this.handleShutdown,
      this
    );

    const newsHud = this.scene.manager.keys.NewsHud;

    newsHud?.events?.emit('setNewspaperVisible', false);
    newsHud?.events?.emit('setTvVisible', false);

    audioManager.init(this);

    if (!audioManager.isMusicPlaying('themeGame')) {
      audioManager.playMusic('themeGame', { loop: true });
    }

    const soundKey = LOCATION_SOUND_MAP[this.locationId];

    if (soundKey && this.cache.audio.exists(soundKey)) {
      this.locationAmbient = audioManager.playAmbient(
        soundKey,
        { volume: 0.22, loop: true }
      );
    }

    this.closeAllUIPanels();

    const { width, height } = this.scale;

    const suspects = this.cache.json.get('suspects') || [];
    const locations = this.cache.json.get('locations') || [];
    const countryFacts = this.cache.json.get('country_facts') || {};

    const dialogueCacheKey = NPC_DIALOGUE_KEY_MAP[this.npcId];
    const dialogueRootKey = NPC_DIALOGUE_ROOT_MAP[this.npcId];

    const rawFile = dialogueCacheKey
      ? this.cache.json.get(dialogueCacheKey)
      : null;

    const dialogueBlock = rawFile?.[dialogueRootKey] || {};
    const variants = dialogueBlock.locationVariants || {};

    const cityData = locations.find(
      city => city.id === this.cityId
    ) || null;

    this.npcTheme = resolveCityNpcTheme(cityData);

    const suspect = suspects.find(
      entry => entry.id === gameState.currentThiefId
    ) || gameState.currentThief || null;

    if (!dialogueCacheKey || !dialogueRootKey) {
      console.warn(
        `[LocationScene] Unknown npcId "${this.npcId}".`
      );
    }

    this.encounterMemory = this.encounterId
      ? gameState.encounterMemory?.[this.encounterId] || null
      : null;

    this.askedTopics = new Set(
      Array.isArray(this.encounterMemory?.askedTopics)
        ? this.encounterMemory.askedTopics
        : []
    );

    const manager = gameState.routeManager;

    const expectedCityId =
      typeof manager?.getNextExpectedCity === 'function'
        ? manager.getNextExpectedCity()
        : gameState.nextTargetCityId || null;

    this.dialogueTargetCityId =
      this.dialogueTargetCityId ||
      expectedCityId ||
      this.encounterMemory?.dialogueTargetCityId ||
      null;

    if (this.dialogueTargetCityId === this.cityId) {
      this.dialogueTargetCityId = expectedCityId || null;
    }

    this.reputationAccess = getNpcAccess(this.npcId, {
      isCrimeCity: this.isCrimeCity
    });

    if (!this.reputationAccess.allowed) {
      this.fullDialogueString = this.reputationAccess.reason;
    } else {
      try {
        this.npcController = new NPCController(
          variants,
          countryFacts,
          this.cityId,
          suspect || {},
          {
            targetCityId: this.dialogueTargetCityId,
            isCorrectCity: this.isCorrectCity,
            npcId: this.npcId
          }
        );
      } catch (error) {
        console.warn(
          '[LocationScene] Failed to build NPCController:',
          {
            npcId: this.npcId,
            cityId: this.cityId,
            dialogueCacheKey,
            dialogueRootKey,
            error
          }
        );

        this.npcController = null;
      }

      if (!this.npcController) {
        this.fullDialogueString =
          'There is nobody here who remembers anything useful.';
      } else if (this.payEncounterEnergy()) {
        this.availableTopics =
          this.npcController.getAvailableTopics();

        this.fullDialogueString = this.isFalseLead
          ? this.npcController.getFalseLeadLine().text
          : this.isRepeat
            ? this.npcController.getRepeatLine()
            : this.npcController.getBanterLine();
      }
    }

    const backgroundKey = this.getLocationBackgroundKey(
      this.locationId,
      cityData
    );

    if (backgroundKey) {
      this.add.image(
        width / 2,
        height / 2,
        backgroundKey
      ).setDisplaySize(width, height);
    } else if (
      cityData?.backgroundKey &&
      this.textures.exists(cityData.backgroundKey)
    ) {
      this.add.image(
        width / 2,
        height / 2,
        cityData.backgroundKey
      ).setDisplaySize(width, height);
    } else {
      this.cameras.main.setBackgroundColor('#1a1a1a');
    }

    this.createDialoguePanel(width, height);

    ensureHud(this);
    this.refreshNotebook();

    // A blocked visit does not advance the conversation clock.
    if (!this.entryBlocked && !this.timeCostApplied) {
      this.timeCostApplied = true;

      EventBus.emit('advanceTime', 1, 0);
      gameState.timeSpent = (gameState.timeSpent || 0) + 1;
    }
  }

  refreshNotebook() {
    const hud = this.scene.manager.keys.PlayerHudScene;

    if (hud?.refreshNotebook) {
      hud.refreshNotebook();
    } else {
      hud?.refreshUI?.();
    }
  }

  createDialoguePanel(width, height) {
    const panelHeight = 232;
    const panelY = height - panelHeight;

    const portraitSize = 150;
    const portraitX = 18;
    const portraitY =
      panelY + (panelHeight - portraitSize) / 2;

    const textStartX = portraitX + portraitSize + 30;
    const portraitCenterX = portraitX + portraitSize / 2;
    const portraitCenterY = portraitY + portraitSize / 2;
    const nameTargetY = portraitY + portraitSize + 14;

    const menuWidth = 190;
    const textEndX = width - menuWidth - 20;

    this.dialoguePanel = this.add.rectangle(
      0,
      panelY,
      width,
      panelHeight,
      PANEL_BG,
      PANEL_BG_ALPHA
    )
      .setOrigin(0)
      .setDepth(10);

    this.panelBorder = this.add.graphics().setDepth(10);

    this.panelBorder.lineStyle(4, PANEL_GOLD, 1);
    this.panelBorder.strokeRect(
      6, panelY + 6, width - 12, panelHeight - 12
    );

    this.panelBorder.lineStyle(1, PANEL_GOLD_DIM, 0.9);
    this.panelBorder.strokeRect(
      12, panelY + 12, width - 24, panelHeight - 24
    );

    this.panelBorder.lineStyle(1, PANEL_GOLD_DIM, 0.6);
    this.panelBorder.lineBetween(
      textEndX,
      panelY + 16,
      textEndX,
      panelY + panelHeight - 16
    );

    this.portraitFrame = this.add.graphics().setDepth(11);

    this.portraitFrame.fillStyle(0x000000, 0.6);
    this.portraitFrame.fillRect(
      portraitX - 4,
      portraitY - 4,
      portraitSize + 8,
      portraitSize + 8
    );

    this.portraitFrame.lineStyle(3, PANEL_GOLD, 1);
    this.portraitFrame.strokeRect(
      portraitX - 4,
      portraitY - 4,
      portraitSize + 8,
      portraitSize + 8
    );

    const portraitKey = getNpcTextureKey(
      this.npcId,
      this.npcTheme
    );

    if (portraitKey && this.textures.exists(portraitKey)) {
      this.portraitImage = this.add.image(
        portraitCenterX,
        portraitCenterY,
        portraitKey
      )
        .setDisplaySize(portraitSize, portraitSize)
        .setDepth(12);
    } else {
      this.portraitImage = this.add.text(
        portraitCenterX,
        portraitCenterY,
        '?',
        {
          fontFamily: 'PressStart2P',
          fontSize: '48px',
          color: '#d4af37'
        }
      )
        .setOrigin(0.5)
        .setDepth(12);
    }

    this.npcNameText = this.add.text(
      portraitCenterX,
      nameTargetY,
      getNpcLabel(this.npcId),
      {
        fontFamily: 'PressStart2P',
        fontSize: '12px',
        color: '#ffd86b',
        align: 'center',
        wordWrap: { width: portraitSize + 20 }
      }
    )
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

    this.portraitImage.x =
      portraitCenterX + PORTRAIT_SLIDE_OFFSET;

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

    this.dialogueText = this.add.text(
      textStartX,
      panelY + 26,
      '',
      {
        fontFamily: 'SpecialElite',
        fontSize: this.entryBlocked ? '18px' : '22px',
        color: '#f4ecd8',
        lineSpacing: this.entryBlocked ? 3 : 8,
        wordWrap: {
          width: Math.max(80, textEndX - textStartX - 20)
        }
      }
    )
      .setDepth(12)
      .setInteractive();

    this.dialogueText.on('pointerdown', () => {
      if (this.isTyping) {
        this.completeTypewriter();
      }
    });

    let footer = !this.reputationAccess.allowed
      ? 'Contact unavailable'
      : this.isCrimeCity
        ? 'Crime city witness'
        : this.isNextTargetCity
          ? 'Hot trail witness'
          : this.isFalseLead
            ? 'Cold lead'
            : 'Witness statement';

    if (this.entryBlocked) {
      footer = 'Not enough energy · No charge';
    } else if (this.entryEnergyPaid) {
      const cost = this.entryEnergyCost;

      footer =
        `Taxi -${cost.taxi} · Conversation -${cost.interview} energy`;
    }

    this.footerTextObject = this.add.text(
      textStartX,
      panelY + panelHeight - 30,
      footer,
      {
        fontFamily: 'SpecialElite',
        fontSize: '15px',
        color: '#9a8a63'
      }
    ).setDepth(12);

    this.continueIndicator = this.add.triangle(
      textEndX - 24,
      panelY + panelHeight - 30,
      0, 0, 16, 8, 0, 16,
      PANEL_GOLD
    )
      .setDepth(12)
      .setVisible(false);

    this.tweens.add({
      targets: this.continueIndicator,
      alpha: { from: 1, to: 0.15 },
      duration: 550,
      yoyo: true,
      repeat: -1
    });

    this.createTopicMenu(
      width,
      panelY,
      panelHeight,
      menuWidth
    );

    this.startTypewriter();
  }

  createTopicMenu(width, panelY, panelHeight, menuWidth) {
    const menuX = width - menuWidth + 10;
    let buttonY = panelY + 24;

    for (const button of this.topicButtons) {
      button.text?.destroy();
    }

    this.topicButtons = [];
    this.leaveButton?.destroy();

    if (
      !this.entryBlocked &&
      !this.isFalseLead &&
      this.reputationAccess.allowed
    ) {
      for (const topicId of this.availableTopics) {
        const button = this.add.text(
          menuX,
          buttonY,
          TOPIC_LABELS[topicId] || topicId,
          {
            fontFamily: 'SpecialElite',
            fontSize: '18px',
            color: this.askedTopics.has(topicId)
              ? '#7a7160'
              : '#ffd86b'
          }
        )
          .setDepth(13)
          .setInteractive({ useHandCursor: true });

        button.on('pointerover', () => {
          button.setColor('#ffffff');
        });

        button.on('pointerout', () => {
          button.setColor(
            this.askedTopics.has(topicId)
              ? '#7a7160'
              : '#ffd86b'
          );
        });

        button.on('pointerdown', () => {
          this.handleTopicClick(topicId);
        });

        this.topicButtons.push({
          topicId,
          text: button
        });

        buttonY += 32;
      }
    }

    this.leaveButton = this.add.text(
      menuX,
      panelY + panelHeight - 34,
      'Leave',
      {
        fontFamily: 'SpecialElite',
        fontSize: '18px',
        color: '#d4af37'
      }
    )
      .setDepth(13)
      .setInteractive({ useHandCursor: true });

    this.leaveButton.on('pointerover', () => {
      this.leaveButton?.setColor('#ffffff');
    });

    this.leaveButton.on('pointerout', () => {
      this.leaveButton?.setColor('#d4af37');
    });

    this.leaveButton.on('pointerdown', () => {
      void this.finishEncounter();
    });
  }

  handleTopicClick(topicId) {
    const energy = getEnergyManager();

    if (
      !this.npcController ||
      this.isFinishing ||
      this.entryBlocked ||
      this.isFalseLead ||
      !this.reputationAccess.allowed ||
      energy.isForcedSleepActive() ||
      energy.isManualSleepActive()
    ) {
      return;
    }

    if (!this.availableTopics.includes(topicId)) return;

    this.stopTypewriter();

    const result = this.npcController.askTopic(topicId);

    if (!result) return;

    if (!this.askedTopics.has(topicId)) {
      const note = this.npcController.toNote(result);

      if (note && !this.hasClue(note)) {
        this.generatedNotes.push(note);
      }

      this.askedTopics.add(topicId);
    }

    this.fullDialogueString = result.text;
    this.startTypewriter();

    for (const { topicId: id, text } of this.topicButtons) {
      text.setColor(
        this.askedTopics.has(id)
          ? '#7a7160'
          : '#ffd86b'
      );
    }
  }

  stopTypewriter() {
    this.typewriterEvent?.remove(false);
    this.typewriterEvent = null;
    this.isTyping = false;
  }

  startTypewriter() {
    this.stopTypewriter();

    this.fullDialogueString = String(
      this.fullDialogueString ?? ''
    );

    this.continueIndicator?.setVisible(false);

    if (!this.dialogueText) return;

    const fullText = this.fullDialogueString;

    if (!fullText.length) {
      this.dialogueText.setText('');
      this.continueIndicator?.setVisible(true);
      return;
    }

    let index = 0;

    this.isTyping = true;
    this.dialogueText.setText('');

    this.typewriterEvent = this.time.addEvent({
      delay: TYPEWRITER_TICK_DELAY,
      loop: true,

      callback: () => {
        if (!this.dialogueText || this.isFinishing) {
          this.stopTypewriter();
          return;
        }

        index = Math.min(
          index + TYPEWRITER_CHARS_PER_TICK,
          fullText.length
        );

        this.dialogueText.setText(
          fullText.slice(0, index)
        );

        if (index >= fullText.length) {
          this.stopTypewriter();
          this.continueIndicator?.setVisible(true);
        }
      }
    });
  }

  completeTypewriter() {
    this.stopTypewriter();

    this.dialogueText?.setText(
      String(this.fullDialogueString ?? '')
    );

    this.continueIndicator?.setVisible(true);
  }

  closeAllUIPanels() {
    this.scene.manager.keys.PlayerHudScene
      ?.closeAllUIPanels?.();
  }

  async finishEncounter() {
    if (this.isFinishing) return;

    this.isFinishing = true;
    this.completeTypewriter();

    const completedConversation = Boolean(
      !this.entryBlocked &&
      this.reputationAccess.allowed &&
      this.npcController
    );

    if (completedConversation) {
      this.ensureEncounterMemory();

      if (this.encounterId) {
        gameState.addEncounter(this.encounterId);
      }

      if (!this.isFalseLead) {
        for (const note of this.generatedNotes) {
          if (note && !this.hasClue(note)) {
            gameState.addClue(note);
          }
        }
      }

      if (this.encounterId && !this.isFalseLead) {
        const previous =
          gameState.encounterMemory[this.encounterId] || {};

        gameState.encounterMemory = {
          ...gameState.encounterMemory,

          [this.encounterId]: {
            ...previous,
            firstDialogueSeen: true,
            askedTopics: Array.from(this.askedTopics),

            dialogueTargetCityId:
              previous.dialogueTargetCityId ||
              this.dialogueTargetCityId ||
              null
          }
        };
      }
    }

    saveGameState();
    this.refreshNotebook();

    try {
      const started = await this.goto('CityScene', {
        cityId: this.cityId,
        cityCompleted: false,
        investigationStatus: null,
        pendingPhoneCall: false
      });

      if (!started && !this._cleanupDone) {
        this.isFinishing = false;
      }
    } catch (error) {
      console.error(
        '[LocationScene] Return to city failed:',
        error
      );

      if (!this._cleanupDone) {
        this.isFinishing = false;
      }
    }
  }

  hasClue(newClue) {
    if (!newClue) return false;

    const clues = Array.isArray(gameState.cluesCollected)
      ? gameState.cluesCollected
      : [];

    return clues.some(existing => {
      if (!existing) return false;

      return (
        (
          newClue.id !== undefined &&
          existing.id === newClue.id
        ) ||
        (
          existing.type === newClue.type &&
          existing.category === newClue.category &&
          existing.key === newClue.key &&
          existing.cityId === newClue.cityId &&
          existing.tag === newClue.tag &&
          existing.value === newClue.value
        )
      );
    });
  }

  getLocationBackgroundKey(locationId, cityData = null) {
    const theme = resolveCityNpcTheme(cityData);

    const candidates = getLocationBackgroundCandidates(
      locationId,
      theme
    );

    const key = candidates.find(
      candidate => this.textures.exists(candidate)
    );

    if (key) return key;

    console.warn(
      '[LocationScene] No location background:',
      {
        cityId: this.cityId,
        locationId,
        candidates
      }
    );

    return null;
  }

  addHoverEffect(button, baseScale = 0.8, hoverScale = 0.9) {
    button.on('pointerover', () => {
      button.setScale(hoverScale);
    });

    button.on('pointerout', () => {
      button.setScale(baseScale);
    });
  }

  handleShutdown() {
    this.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.handleShutdown,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.DESTROY,
      this.handleShutdown,
      this
    );

    this.stopTypewriter();

    if (this.locationAmbient) {
      audioManager.releaseSound(this.locationAmbient);
      this.locationAmbient = null;
    }

    const objects = [
      this.dialogueText,
      this.footerTextObject,
      this.npcNameText,
      this.dialoguePanel,
      this.panelBorder,
      this.portraitFrame,
      this.portraitImage,
      this.continueIndicator,
      ...this.topicButtons.map(button => button.text),
      this.leaveButton
    ];

    for (const object of objects) {
      if (!object) continue;

      this.tweens.killTweensOf(object);
      object.destroy();
    }

    this.dialogueText = null;
    this.footerTextObject = null;
    this.npcNameText = null;
    this.dialoguePanel = null;
    this.panelBorder = null;
    this.portraitFrame = null;
    this.portraitImage = null;
    this.continueIndicator = null;
    this.leaveButton = null;

    this.topicButtons = [];
    this.generatedNotes = [];
    this.encounterMemory = null;
    this.npcController = null;
    this.availableTopics = [];
    this.askedTopics = new Set();

    this.reputationAccess = {
      allowed: true,
      reason: ''
    };

    this.isFinishing = false;
  }
}