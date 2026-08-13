import { BaseScene } from './BaseScene.js';
import { gameState, saveGameState } from '../GameData.js';
import { setupNewGame } from '../gameSetup.js';
import { audioManager } from '../AudioManager.js';
import { EventBus } from '../EventBus.js';
import {
  createDefaultPlayerData,
  createRandomIdentity,
  getProfile,
  STAT_IDS,
} from '../ui/characterCreation/CharacterCreationData.js';
import {
  getAppearanceSummary,
} from '../ui/characterCreation/AppearanceControls.js';
import {
  renderCharacterCreationTemplate,
} from '../ui/characterCreation/CharacterCreationTemplate.js';

const STEP_COUNT = 5;
const INITIAL_STAT_POINTS = 2;
const MAX_NAME_LENGTH = 28;

export class CharacterCreationScene extends BaseScene {
  constructor() {
    super({ key: 'CharacterCreationScene' });

    this.currentStep = 0;
    this.playerData = createDefaultPlayerData();
    this.domElement = null;
    this.isStartingGame = false;
    this.errorMessage = '';
  }

  init(data = {}) {
    this.entryData = data;
    this.currentStep = 0;
    this.playerData = createDefaultPlayerData();
    this.isStartingGame = false;
    this.errorMessage = '';
  }

  create() {
    super.create();

    this.cameras.main.setBackgroundColor('#17120e');
    this.createDomInterface();

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.destroyDomInterface,
      this,
    );

    this.events.once(
      Phaser.Scenes.Events.DESTROY,
      this.destroyDomInterface,
      this,
    );
  }

  createDomInterface() {
  this.destroyDomInterface();

  this.domElement = this.add
    .dom(0, 0)
    .createFromHTML(this.getTemplate());

  this.domElement
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(1000);

  this.domElement.node.style.pointerEvents = 'auto';
  this.domElement.node.style.overflow = 'hidden';

  this.fitDomInterface();
  this.bindDomEvents();

  this.scale.on(
    Phaser.Scale.Events.RESIZE,
    this.fitDomInterface,
    this,
  );
}

destroyDomInterface() {
  this.scale?.off(
    Phaser.Scale.Events.RESIZE,
    this.fitDomInterface,
    this,
  );

  if (this.domElement) {
    this.domElement.destroy();
    this.domElement = null;
  }
}

fitDomInterface() {
  if (!this.domElement) return;

  const width = this.scale.width;
  const height = this.scale.height;

  this.domElement
    .setPosition(0, 0)
    .setOrigin(0, 0)
    .setScale(1);

  Object.assign(this.domElement.node.style, {
    width: `${width}px`,
    height: `${height}px`,
    minWidth: `${width}px`,
    minHeight: `${height}px`,
    overflow: 'hidden',
    pointerEvents: 'auto',
  });

  const root = this.getRoot();

  if (!root) return;

  Object.assign(root.style, {
    width: `${width}px`,
    height: `${height}px`,
    minWidth: `${width}px`,
    minHeight: `${height}px`,
  });
}

refresh() {
  if (!this.domElement) return;

  const content = this.getRoot()?.querySelector(
    '.character-creation-content',
  );

  const scrollTop = content?.scrollTop ?? 0;
  const scrollLeft = content?.scrollLeft ?? 0;

  this.domElement.setHTML(this.getTemplate());

  this.domElement
    .setPosition(0, 0)
    .setOrigin(0, 0)
    .setScale(1);

  this.domElement.node.style.pointerEvents = 'auto';
  this.domElement.node.style.overflow = 'hidden';
this.fitDomInterface();
  this.bindDomEvents();

  requestAnimationFrame(() => {
    const refreshedContent = this.getRoot()?.querySelector(
      '.character-creation-content',
    );

    if (!refreshedContent) return;

    refreshedContent.scrollTop = scrollTop;
    refreshedContent.scrollLeft = scrollLeft;
  });
}

  getTemplate() {
    return renderCharacterCreationTemplate({
      currentStep: this.currentStep,
      remainingPoints: this.getRemainingPoints(),
      playerData: this.playerData,
      isStartingGame: this.isStartingGame,
      errorMessage: this.errorMessage,
    });
  }

  getRoot() {
    return this.domElement?.node
      ?.querySelector('#character-creation-root') ?? null;
  }

  bindDomEvents() {
    const root = this.getRoot();
    if (!root) return;

    root.addEventListener('click', (event) => this.handleClick(event));
    root.addEventListener('input', (event) => this.handleInput(event));
    root.addEventListener('submit', (event) => event.preventDefault());

    this.syncActiveStep();
    this.updateAvatarPreview();
    this.updateIdentityPreview();
  }

  syncActiveStep() {
    const root = this.getRoot();
    if (!root) return;

    root.querySelectorAll('[data-step-panel]').forEach((panel) => {
      const isActive = Number(panel.dataset.stepPanel) === this.currentStep;

      panel.classList.toggle('is-active', isActive);
      panel.toggleAttribute('hidden', !isActive);
    });
  }

  handleClick(event) {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;

    const {
      action,
      step,
      profile,
      difficulty,
      appearanceCategory,
      appearanceValue,
      statAction,
      stat,
    } = button.dataset;

    if (action === 'next') {
      this.goNext();
      return;
    }

    if (action === 'back') {
      this.goBack();
      return;
    }

    if (action === 'randomize') {
      this.randomizeIdentity();
      return;
    }

    if (step !== undefined) {
      this.goToStep(Number(step));
      return;
    }

    if (profile) {
      this.playerData.profile = profile;
      this.clearError();
      this.refresh();
      return;
    }

    if (difficulty) {
      this.playerData.difficulty = difficulty;
      this.clearError();
      this.refresh();
      return;
    }

    if (appearanceCategory && appearanceValue) {
      this.playerData.appearance[appearanceCategory] = appearanceValue;
      this.clearError();
      this.refresh();
      return;
    }

    if (statAction && stat) {
      this.changeStat(stat, statAction);
    }
  }

  handleInput(event) {
    const input = event.target;

    if (input.matches('[data-character-name]')) {
      this.playerData.name = input.value.slice(0, MAX_NAME_LENGTH);
      this.clearError();
      this.updateIdentityPreview();
      return;
    }

    if (input.matches('[data-character-alias]')) {
      this.playerData.alias = input.value.slice(0, MAX_NAME_LENGTH);
      this.clearError();
      this.updateIdentityPreview();
    }
  }

  goNext() {
    if (!this.validateCurrentStep()) return;

    if (this.currentStep === STEP_COUNT - 1) {
      this.startGame();
      return;
    }

    this.currentStep += 1;
    this.clearError();
    this.refresh();
  }

  goBack() {
    if (this.currentStep === 0 || this.isStartingGame) return;

    this.currentStep -= 1;
    this.clearError();
    this.refresh();
  }

  goToStep(step) {
    const invalidStep = !Number.isInteger(step)
      || step < 0
      || step >= STEP_COUNT
      || this.isStartingGame;

    if (invalidStep) return;

    if (step > this.currentStep && !this.validateStepsBefore(step)) {
      return;
    }

    this.currentStep = step;
    this.clearError();
    this.refresh();
  }

  validateStepsBefore(targetStep) {
    const originalStep = this.currentStep;

    for (let step = 0; step < targetStep; step += 1) {
      this.currentStep = step;

      if (!this.validateCurrentStep()) {
        return false;
      }
    }

    this.currentStep = originalStep;
    return true;
  }

  validateCurrentStep() {
    if (this.currentStep === 0 && !this.playerData.name.trim()) {
      this.showError(
        'Mark Agency needs a name for the paperwork. Even a suspicious one.',
      );
      return false;
    }

    if (this.currentStep === 2 && this.getRemainingPoints() !== 0) {
      this.showError(
        `Assign all ${INITIAL_STAT_POINTS} instinct points before HR loses the form.`,
      );
      return false;
    }

    return true;
  }

  getRemainingPoints() {
    const spentPoints = STAT_IDS.reduce((total, statId) => {
      return total + Math.max(0, this.playerData.stats[statId] - 1);
    }, 0);

    return INITIAL_STAT_POINTS - spentPoints;
  }

  changeStat(statId, action) {
    if (!STAT_IDS.includes(statId)) return;

    const currentValue = this.playerData.stats[statId];

    if (action === 'increase' && this.getRemainingPoints() > 0) {
      this.playerData.stats[statId] = currentValue + 1;
    }

    if (action === 'decrease' && currentValue > 1) {
      this.playerData.stats[statId] = currentValue - 1;
    }

    this.clearError();
    this.refresh();
  }

  randomizeIdentity() {
    const identity = createRandomIdentity();

    this.playerData.name = identity.name;
    this.playerData.alias = identity.alias;
    this.playerData.appearance = { ...identity.appearance };

    this.clearError();
    this.refresh();
  }

  updateAvatarPreview() {
    const avatar = this.getRoot()
      ?.querySelector('[data-avatar-preview]');

    if (!avatar) return;

    Object.entries(this.playerData.appearance).forEach(
      ([category, value]) => {
        const dataKey = category.replace(
          /[A-Z]/g,
          (letter) => `-${letter.toLowerCase()}`,
        );

        avatar.setAttribute(`data-${dataKey}`, value);
      },
    );
  }

  updateIdentityPreview() {
    const root = this.getRoot();
    if (!root) return;

    const name = this.playerData.name.trim() || 'UNNAMED APPLICANT';
    const alias = this.playerData.alias.trim() || 'UNLISTED';
    const avatarName = root.querySelector('[data-avatar-name]');
    const avatarAlias = root.querySelector('[data-avatar-alias]');

    if (avatarName) avatarName.textContent = name.toUpperCase();
    if (avatarAlias) avatarAlias.textContent = `ALIAS: ${alias.toUpperCase()}`;
  }

  showError(message) {
    this.errorMessage = message;
    this.refresh();
  }

  clearError() {
    this.errorMessage = '';
  }

  async startGame() {
    if (this.isStartingGame || !this.validateCurrentStep()) return;

    this.isStartingGame = true;
    this.clearError();
    this.refresh();

    try {
      const suspectsData = this.cache.json.get('suspects') || [];
      const missionsData = this.cache.json.get('missions') || [];
      const locationsData = this.cache.json.get('locations') || [];

      await setupNewGame(
        suspectsData,
        missionsData,
        locationsData,
        this.playerData.difficulty,
      );

      const profile = getProfile(this.playerData.profile);
      const appearance = { ...this.playerData.appearance };

      Object.assign(gameState, {
        playerName: this.playerData.name.trim(),
        agentName: this.playerData.name.trim(),
        playerAlias: this.playerData.alias.trim(),
        detectiveProfile: this.playerData.profile,
        profileBonus: profile.bonus,
        detectiveStats: { ...this.playerData.stats },
        appearance,
        appearanceSummary: getAppearanceSummary(appearance),
        difficulty: this.playerData.difficulty,
      });

      saveGameState();

      EventBus.emit('character-created', {
        name: gameState.playerName,
        profile: gameState.detectiveProfile,
        difficulty: gameState.difficulty,
      });

      audioManager?.play?.('confirm');
      this.scene.start('OfficeScene', { fromCharacterCreation: true });
    } catch (error) {
      console.error('Unable to create detective:', error);
      this.isStartingGame = false;
      this.showError('The agency filing cabinet jammed. Please try again.');
    }
  }
}