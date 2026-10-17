import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { audioManager } from '../managers/AudioManager.js';
import { EventBus } from '../EventBus.js';

import {
  createDefaultPlayerData,
  createRandomIdentity,
  getProfile,
  STAT_IDS
} from '../ui/characterCreation/CharacterCreationData.js';

import {
  getAppearanceSummary
} from '../ui/characterCreation/AppearanceControls.js';

import {
  renderCharacterCreationTemplate
} from '../ui/characterCreation/CharacterCreationTemplate.js';

const STEP_COUNT = 5;
const INITIAL_STAT_POINTS = 2;
const MAX_NAME_LENGTH = 28;

const REQUIRED_JSON_KEYS = [
  'suspects',
  'missions',
  'locations'
];

export class CharacterCreationScene extends BaseScene {
  constructor() {
    super({ key: 'CharacterCreationScene' });

    this.currentStep = 0;
    this.playerData = createDefaultPlayerData();

    this.domElement = null;
    this.isStartingGame = false;
    this.isLeavingScene = false;

    this.errorMessage = '';
    this.entryData = {};

    this._runToken = null;
    this._refreshFrame = null;
    this._preparedCharacter = null;

    this.boundResizeDomInterface =
      this.fitDomInterface.bind(this);

    this.boundCleanupScene =
      this.cleanupScene.bind(this);

    this.boundHandleDomClick =
      this.handleClick.bind(this);

    this.boundHandleDomInput =
      this.handleInput.bind(this);

    this.boundPreventDomSubmit =
      this.preventDomSubmit.bind(this);
  }

  init(data = {}) {
    this.entryData = { ...data };
    this.currentStep = 0;

    this.playerData = createDefaultPlayerData();

    this.isStartingGame = false;
    this.isLeavingScene = false;
    this.errorMessage = '';

    this._preparedCharacter = null;
    this._runToken = Symbol('character-creation-run');
  }

  preload() {
    const manifest =
      this.cache.json.get('assetManifest');

    for (const key of REQUIRED_JSON_KEYS) {
      if (this.cache.json.exists(key)) {
        continue;
      }

      const entry = manifest?.json?.find(
        asset => asset.key === key
      );

      if (!entry?.url) {
        console.error(
          `[CharacterCreationScene] Missing JSON manifest entry "${key}".`
        );

        continue;
      }

      this.load.json(key, entry.url);
    }
  }

  create() {
    super.create();

    audioManager.init(this);
    EventBus.emit('hideHUD');

    this.cameras.main.setBackgroundColor('#17120e');

    this.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundCleanupScene
    );

    this.events.off(
      Phaser.Scenes.Events.DESTROY,
      this.boundCleanupScene
    );

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundCleanupScene
    );

    this.events.once(
      Phaser.Scenes.Events.DESTROY,
      this.boundCleanupScene
    );

    this.createDomInterface();
  }

  // ------------------------------------------------------------------
  // DOM lifecycle
  // ------------------------------------------------------------------

  createDomInterface() {
    this.destroyDomInterface();

    this.domElement = this.add
      .dom(0, 0)
      .createFromHTML(this.getTemplate())
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1000);

    this.fitDomInterface();
    this.bindDomEvents();

    this.scale.on(
      Phaser.Scale.Events.RESIZE,
      this.boundResizeDomInterface
    );
  }

  _removeRootListeners(root = this.getRoot()) {
    if (!root) {
      return;
    }

    root.removeEventListener(
      'click',
      this.boundHandleDomClick
    );

    root.removeEventListener(
      'input',
      this.boundHandleDomInput
    );

    root.removeEventListener(
      'submit',
      this.boundPreventDomSubmit
    );
  }

  _cancelRefreshFrame() {
    if (this._refreshFrame !== null) {
      cancelAnimationFrame(this._refreshFrame);
      this._refreshFrame = null;
    }
  }

  destroyDomInterface() {
    this._cancelRefreshFrame();

    this.scale?.off(
      Phaser.Scale.Events.RESIZE,
      this.boundResizeDomInterface
    );

    this._removeRootListeners();

    this.domElement?.destroy();
    this.domElement = null;
  }

  cleanupScene() {
    this._runToken = null;

    this.isStartingGame = false;
    this.isLeavingScene = false;

    this.destroyDomInterface();

    this.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundCleanupScene
    );

    this.events.off(
      Phaser.Scenes.Events.DESTROY,
      this.boundCleanupScene
    );
  }

  fitDomInterface() {
    if (!this.domElement?.node) {
      return;
    }

    const { width, height } = this.scale;

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
      pointerEvents: 'auto'
    });

    const root = this.getRoot();

    if (!root) {
      return;
    }

    Object.assign(root.style, {
      width: `${width}px`,
      height: `${height}px`,
      minWidth: `${width}px`,
      minHeight: `${height}px`
    });
  }

  refresh() {
    if (
      !this.domElement?.node ||
      this._cleanupDone ||
      !this.sys.isActive()
    ) {
      return;
    }

    this._cancelRefreshFrame();

    const content = this.getRoot()?.querySelector(
      '.character-creation-content'
    );

    const scrollTop = content?.scrollTop ?? 0;
    const scrollLeft = content?.scrollLeft ?? 0;

    this._removeRootListeners();

    this.domElement.setHTML(this.getTemplate());

    this.fitDomInterface();
    this.bindDomEvents();

    const token = this._runToken;

    this._refreshFrame = requestAnimationFrame(() => {
      this._refreshFrame = null;

      if (
        this._runToken !== token ||
        this._cleanupDone ||
        !this.domElement?.node ||
        !this.sys.isActive()
      ) {
        return;
      }

      const refreshedContent =
        this.getRoot()?.querySelector(
          '.character-creation-content'
        );

      if (refreshedContent) {
        refreshedContent.scrollTop = scrollTop;
        refreshedContent.scrollLeft = scrollLeft;
      }
    });
  }

  getTemplate() {
    return renderCharacterCreationTemplate({
      currentStep: this.currentStep,
      remainingPoints: this.getRemainingPoints(),
      playerData: this.playerData,
      isStartingGame: this.isStartingGame,
      errorMessage: this.errorMessage
    });
  }

  getRoot() {
    return this.domElement?.node?.querySelector(
      '#character-creation-root'
    ) ?? null;
  }

  bindDomEvents() {
    const root = this.getRoot();

    if (!root) {
      return;
    }

    this._removeRootListeners(root);

    root.addEventListener(
      'click',
      this.boundHandleDomClick
    );

    root.addEventListener(
      'input',
      this.boundHandleDomInput
    );

    root.addEventListener(
      'submit',
      this.boundPreventDomSubmit
    );

    this.syncActiveStep();
    this.updateAvatarPreview();
    this.updateIdentityPreview();
  }

  preventDomSubmit(event) {
    event.preventDefault();
  }

  syncActiveStep() {
    this.getRoot()
      ?.querySelectorAll('[data-step-panel]')
      .forEach(panel => {
        const active =
          Number(panel.dataset.stepPanel) ===
          this.currentStep;

        panel.classList.toggle('is-active', active);
        panel.toggleAttribute('hidden', !active);
      });
  }

  // ------------------------------------------------------------------
  // Input
  // ------------------------------------------------------------------

  _isInputBlocked() {
    return (
      this._cleanupDone ||
      this.isStartingGame ||
      this.isLeavingScene
    );
  }

  _invalidatePreparedCharacter() {
    this._preparedCharacter = null;
  }

  handleClick(event) {
    if (
      this._isInputBlocked() ||
      !(event.target instanceof Element)
    ) {
      return;
    }

    const button = event.target.closest('button');
    const root = this.getRoot();

    if (
      !button ||
      button.disabled ||
      !root?.contains(button)
    ) {
      return;
    }

    const {
      action,
      step,
      profile,
      difficulty,
      appearanceCategory,
      appearanceValue,
      statAction,
      stat
    } = button.dataset;

    if (action === 'next') {
      this.goNext();
      return;
    }

    if (action === 'back') {
      void this.goBack();
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
      this._invalidatePreparedCharacter();
      this.clearError();
      this.refresh();
      return;
    }

    if (difficulty) {
      this.playerData.difficulty = difficulty;
      this._invalidatePreparedCharacter();
      this.clearError();
      this.refresh();
      return;
    }

    if (appearanceCategory && appearanceValue) {
      if (
        Object.prototype.hasOwnProperty.call(
          this.playerData.appearance,
          appearanceCategory
        )
      ) {
        this.playerData.appearance[
          appearanceCategory
        ] = appearanceValue;

        this._invalidatePreparedCharacter();
        this.clearError();
        this.refresh();
      }

      return;
    }

    if (statAction && stat) {
      this.changeStat(stat, statAction);
    }
  }

  handleInput(event) {
    if (
      this._isInputBlocked() ||
      !(event.target instanceof HTMLInputElement)
    ) {
      return;
    }

    const input = event.target;

    if (input.matches('[data-character-name]')) {
      this.playerData.name = input.value.slice(
        0,
        MAX_NAME_LENGTH
      );

      this._invalidatePreparedCharacter();
      this.clearError();
      this.updateIdentityPreview();
      return;
    }

    if (input.matches('[data-character-alias]')) {
      this.playerData.alias = input.value.slice(
        0,
        MAX_NAME_LENGTH
      );

      this._invalidatePreparedCharacter();
      this.clearError();
      this.updateIdentityPreview();
    }
  }

  // ------------------------------------------------------------------
  // Steps and validation
  // ------------------------------------------------------------------

  goNext() {
    if (
      this._isInputBlocked() ||
      !this.validateCurrentStep()
    ) {
      return;
    }

    if (this.currentStep === STEP_COUNT - 1) {
      void this.startGame();
      return;
    }

    this.currentStep += 1;
    this.clearError();
    this.refresh();
  }

  async goBack() {
    if (this._isInputBlocked()) {
      return;
    }

    if (this.currentStep > 0) {
      this.currentStep -= 1;
      this.clearError();
      this.refresh();
      return;
    }

    const token = this._runToken;

    this.isLeavingScene = true;
    this.clearError();
    this.refresh();

    const left = await this.goto(
      'EnterScene',
      { ...this.entryData }
    );

    if (
      !left &&
      this._runToken === token &&
      !this._cleanupDone
    ) {
      this.isLeavingScene = false;

      this.showError(
        'The agency door is stuck. Please try again.'
      );
    }
  }

  goToStep(step) {
    if (
      this._isInputBlocked() ||
      !Number.isInteger(step) ||
      step < 0 ||
      step >= STEP_COUNT
    ) {
      return;
    }

    if (
      step > this.currentStep &&
      !this.validateStepsBefore(step)
    ) {
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
        // Zostajemy na kroku wymagającym poprawy.
        this.refresh();
        return false;
      }
    }

    this.currentStep = originalStep;
    return true;
  }

  validateCurrentStep() {
    if (
      this.currentStep === 0 &&
      !this.playerData.name.trim()
    ) {
      this.showError(
        'Mark Agency needs a name for the paperwork. Even a suspicious one.'
      );

      return false;
    }

    if (
      this.currentStep === 2 &&
      this.getRemainingPoints() !== 0
    ) {
      this.showError(
        `Assign all ${INITIAL_STAT_POINTS} instinct points before HR loses the form.`
      );

      return false;
    }

    return true;
  }

  getRemainingPoints() {
    const spent = STAT_IDS.reduce(
      (total, statId) =>
        total + Math.max(
          0,
          (this.playerData.stats[statId] ?? 1) - 1
        ),
      0
    );

    return INITIAL_STAT_POINTS - spent;
  }

  changeStat(statId, action) {
    if (
      this._isInputBlocked() ||
      !STAT_IDS.includes(statId)
    ) {
      return;
    }

    const value =
      this.playerData.stats[statId] ?? 1;

    let changed = false;

    if (
      action === 'increase' &&
      this.getRemainingPoints() > 0
    ) {
      this.playerData.stats[statId] = value + 1;
      changed = true;
    }

    if (action === 'decrease' && value > 1) {
      this.playerData.stats[statId] = value - 1;
      changed = true;
    }

    if (changed) {
      this._invalidatePreparedCharacter();
    }

    this.clearError();
    this.refresh();
  }

  randomizeIdentity() {
    if (this._isInputBlocked()) {
      return;
    }

    const identity = createRandomIdentity();

    this.playerData.name = identity.name;
    this.playerData.alias = identity.alias;
    this.playerData.appearance = {
      ...identity.appearance
    };

    this._invalidatePreparedCharacter();
    this.clearError();
    this.refresh();
  }

  // ------------------------------------------------------------------
  // Previews
  // ------------------------------------------------------------------

  updateAvatarPreview() {
    const avatar = this.getRoot()?.querySelector(
      '[data-avatar-preview]'
    );

    if (!avatar) {
      return;
    }

    for (const [category, value] of Object.entries(
      this.playerData.appearance
    )) {
      const dataKey = category.replace(
        /[A-Z]/g,
        letter => `-${letter.toLowerCase()}`
      );

      avatar.setAttribute(
        `data-${dataKey}`,
        value
      );
    }
  }

  updateIdentityPreview() {
    const root = this.getRoot();

    if (!root) {
      return;
    }

    const name =
      this.playerData.name.trim() ||
      'UNNAMED APPLICANT';

    const alias =
      this.playerData.alias.trim() ||
      'UNLISTED';

    const avatarName = root.querySelector(
      '[data-avatar-name]'
    );

    const avatarAlias = root.querySelector(
      '[data-avatar-alias]'
    );

    if (avatarName) {
      avatarName.textContent = name.toUpperCase();
    }

    if (avatarAlias) {
      avatarAlias.textContent =
        `ALIAS: ${alias.toUpperCase()}`;
    }
  }

  showError(message) {
    this.errorMessage = message;
    this.refresh();
  }

  clearError() {
    this.errorMessage = '';
  }

  // ------------------------------------------------------------------
  // Start game
  // ------------------------------------------------------------------

  _readSetupData() {
    const data = {};

    for (const key of REQUIRED_JSON_KEYS) {
      const value = this.cache.json.get(key);

      if (!Array.isArray(value) || value.length === 0) {
        throw new Error(
          `Required setup data "${key}" is missing or empty.`
        );
      }

      data[key] = value;
    }

    return data;
  }

  async startGame() {
    if (
      this._isInputBlocked() ||
      !this.validateStepsBefore(STEP_COUNT)
    ) {
      return;
    }

    const token = this._runToken;
    const characterSignature =
      JSON.stringify(this.playerData);

    this.isStartingGame = true;
    this.clearError();
    this.refresh();

    try {
      if (
        this._preparedCharacter !== characterSignature
      ) {
        const {
          suspects,
          missions,
          locations
        } = this._readSetupData();

        // Moduły konfiguracji sprawy są potrzebne dopiero tutaj.
        const { setupNewGame } = await import(
          '../gameSetup.js'
        );

        if (
          this._runToken !== token ||
          this._cleanupDone
        ) {
          return;
        }

        await setupNewGame(
          suspects,
          missions,
          locations,
          this.playerData.difficulty
        );

        if (
          this._runToken !== token ||
          this._cleanupDone
        ) {
          return;
        }

        const profile = getProfile(
          this.playerData.profile
        );

        const appearance = {
          ...this.playerData.appearance
        };

        gameState.updateState({
          playerName: this.playerData.name.trim(),
          agentName: this.playerData.name.trim(),
          playerAlias: this.playerData.alias.trim(),

          detectiveProfile: this.playerData.profile,
          profileBonus: profile?.bonus ?? null,

          detectiveStats: {
            ...this.playerData.stats
          },

          appearance,

          appearanceSummary:
            getAppearanceSummary(appearance),

          difficulty: this.playerData.difficulty
        });

        // Od tego momentu ponowna próba wejścia nie losuje
        // kolejnej sprawy, jeśli dane postaci się nie zmieniły.
        this._preparedCharacter =
          characterSignature;

        const saved = saveGameState();

        if (!saved) {
          console.warn(
            '[CharacterCreationScene] Character is ready, ' +
            'but autosave was not written.'
          );
        }

        EventBus.emit('character-created', {
          name: gameState.playerName,
          profile: gameState.detectiveProfile,
          difficulty: gameState.difficulty
        });

        audioManager.playSfx('click_sound');
      }

      const started = await this.goto(
        'GameScene',
        {
          ...this.entryData,
          fromCharacterCreation: true,
          isNewGame: true,
          startOnboarding: true
        }
      );

      if (
        !started &&
        this._runToken === token &&
        !this._cleanupDone
      ) {
        this.isStartingGame = false;

        this.showError(
          'The agency elevator stalled. Please try again.'
        );
      }
    } catch (error) {
      if (
        this._runToken === token &&
        !this._cleanupDone
      ) {
        console.error(
          '[CharacterCreationScene] Unable to create detective:',
          error
        );

        this.isStartingGame = false;

        this.showError(
          'The agency filing cabinet jammed. Please try again.'
        );
      }
    }
  }
}