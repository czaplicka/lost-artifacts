import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { audioManager } from '../managers/AudioManager.js';
import { avatarManager } from '../managers/AvatarManager.js';
import { EventBus } from '../EventBus.js';
import { AVATAR_CONFIG } from '../config/AvatarParts.js';
import {
  createDefaultPlayerData, createRandomIdentity, getProfile, STAT_IDS
} from '../ui/characterCreation/CharacterCreationData.js';
import {
  getAppearanceSummary, getWitnessLine, randomAppearance
} from '../ui/characterCreation/AppearanceControls.js';
import { renderCharacterCreationTemplate } from '../ui/characterCreation/CharacterCreationTemplate.js';
import { patchCharacterCreationDOM } from '../ui/characterCreation/patchCharacterCreationDOM.js';
import { preloadMenuActionAudio, playMenuActionAudio } from './archive/MenuActionAudio.js';

const STEP_COUNT = 5, INITIAL_STAT_POINTS = 2, MAX_NAME_LENGTH = 28;
const REQUIRED_JSON_KEYS = ['suspects', 'missions', 'locations'];
const text = id => __dialogueText('scenes/CharacterCreationScene.js', id);

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
    this._avatarLoadPromise = null;
    this._avatarLoadRequest = null;
    this._avatarLoadState = 'idle';
    this._avatarLoadMessage = '';
    this._avatarRetryDeferred = [];
    this.boundResizeDomInterface = this.fitDomInterface.bind(this);
    this.boundCleanupScene = this.cleanupScene.bind(this);
    this.boundHandleDomClick = this.handleClick.bind(this);
    this.boundHandleDomInput = this.handleInput.bind(this);
    this.boundPreventDomSubmit = this.preventDomSubmit.bind(this);
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
    this._avatarLoadPromise = null;
    this._avatarLoadRequest = null;
    this._avatarLoadState = 'idle';
    this._avatarLoadMessage = '';
    this._avatarRetryDeferred = [];
  }

  preload() {
    const manifest = this.cache.json.get('assetManifest');
    for (const key of REQUIRED_JSON_KEYS) {
      if (this.cache.json.exists(key)) continue;
      const entry = manifest?.json?.find(asset => asset.key === key);
      if (!entry?.url) {
        console.error(`[CharacterCreationScene] Missing JSON manifest entry "${key}".`);
        continue;
      }
      this.load.json(key, entry.url);
    }
    preloadMenuActionAudio(this);
    avatarManager.queueAssets(this);
  }

  create() {
    super.create();
    audioManager.init(this);
    EventBus.emit('hideHUD');
    this.cameras.main.setBackgroundColor('#17120e');
    avatarManager.bind(this);
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.boundCleanupScene);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.boundCleanupScene);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.boundCleanupScene);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.boundCleanupScene);
    this.createDomInterface();
    // Retry completed preload failures once; subsequent retries are explicit.
    void this.ensureAvatarAssets({ retryFailed: true });
  }

  _isCurrentRun(token) {
    return this._runToken === token && token !== null && !this._cleanupDone &&
      this.sys?.isActive() && Boolean(this.domElement?.node);
  }

  createDomInterface() {
    this.destroyDomInterface();
    this.domElement = this.add.dom(0, 0).createFromHTML(this.getTemplate())
      .setOrigin(0, 0).setScrollFactor(0).setDepth(1000);
    this.fitDomInterface();
    this.bindDomEvents();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.boundResizeDomInterface);
  }

  _removeRootListeners(root = this.getRoot()) {
    if (!root) return;
    root.removeEventListener('click', this.boundHandleDomClick);
    root.removeEventListener('input', this.boundHandleDomInput);
    root.removeEventListener('submit', this.boundPreventDomSubmit);
  }

  _cancelRefreshFrame() {
    if (this._refreshFrame !== null) {
      cancelAnimationFrame(this._refreshFrame);
      this._refreshFrame = null;
    }
  }

  destroyDomInterface() {
    this._cancelRefreshFrame();
    this.scale?.off(Phaser.Scale.Events.RESIZE, this.boundResizeDomInterface);
    this._removeRootListeners();
    this.domElement?.destroy();
    this.domElement = null;
  }

  cleanupScene() {
    this._runToken = null;
    this._avatarLoadRequest = null;
    this._avatarLoadPromise = null;
    this.isStartingGame = false;
    this.isLeavingScene = false;
    this.destroyDomInterface();
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.boundCleanupScene);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.boundCleanupScene);
  }

  fitDomInterface() {
    if (!this.domElement?.node) return;
    const { width, height } = this.scale;
    this.domElement.setPosition(0, 0).setOrigin(0, 0).setScale(1);
    Object.assign(this.domElement.node.style, {
      width: `${width}px`, height: `${height}px`, minWidth: `${width}px`,
      minHeight: `${height}px`, overflow: 'hidden', pointerEvents: 'auto'
    });
    const root = this.getRoot();
    if (root) Object.assign(root.style, {
      width: `${width}px`, height: `${height}px`, minWidth: `${width}px`, minHeight: `${height}px`
    });
  }

  refresh() {
    const token = this._runToken;
    if (!this._isCurrentRun(token)) return;
    const root = this.getRoot();
    if (!root) return;
    this._cancelRefreshFrame();
    const doc = root.ownerDocument;
    const focused = root.contains(doc.activeElement) ? doc.activeElement : null;
    let selection = null;
    try {
      if (focused && typeof focused.selectionStart === 'number') {
        selection = [focused.selectionStart, focused.selectionEnd, focused.selectionDirection];
      }
    } catch { /* Not every input type supports a selection range. */ }
    const scrolls = [root, ...root.querySelectorAll('*')]
      .filter(element => element.scrollTop || element.scrollLeft)
      .map(element => ({ element, top: element.scrollTop, left: element.scrollLeft }));

    const template = doc.createElement('template');
    template.innerHTML = this.getTemplate();
    const nextRoot = template.content.querySelector('#character-creation-root');
    if (!nextRoot) throw new Error('[CharacterCreationScene] Template root is missing.');
    patchCharacterCreationDOM(root, nextRoot);
    this.fitDomInterface();
    this.syncActiveStep();
    this.updateAvatarPreview();
    this.updateIdentityPreview();
    this.updateInputLocks();

    const restore = () => {
      if (!this._isCurrentRun(token)) return;
      if (focused?.isConnected && root.contains(focused) && !focused.disabled) {
        if (doc.activeElement !== focused) focused.focus({ preventScroll: true });
        if (selection) {
          try { focused.setSelectionRange(...selection); } catch { /* Unsupported input type. */ }
        }
      }
      for (const item of scrolls) {
        if (item.element.isConnected) {
          item.element.scrollTop = item.top;
          item.element.scrollLeft = item.left;
        }
      }
    };
    restore();
    this._refreshFrame = requestAnimationFrame(() => {
      this._refreshFrame = null;
      // Do not steal focus if the user has moved to another control since refresh.
      if (!this._isCurrentRun(token)) return;
      for (const item of scrolls) if (item.element.isConnected) {
        item.element.scrollTop = item.top; item.element.scrollLeft = item.left;
      }
    });
  }

  getTemplate() {
    return renderCharacterCreationTemplate({
      currentStep: this.currentStep, remainingPoints: this.getRemainingPoints(),
      playerData: this.playerData, isStartingGame: this.isStartingGame,
      errorMessage: this.errorMessage
    });
  }

  getRoot() { return this.domElement?.node?.querySelector('#character-creation-root') ?? null; }

  bindDomEvents() {
    const root = this.getRoot();
    if (!root) return;
    this._removeRootListeners(root);
    root.addEventListener('click', this.boundHandleDomClick);
    root.addEventListener('input', this.boundHandleDomInput);
    root.addEventListener('submit', this.boundPreventDomSubmit);
    this.syncActiveStep();
    this.updateAvatarPreview();
    this.updateIdentityPreview();
    this.updateInputLocks();
  }

  preventDomSubmit(event) { event.preventDefault(); }

  syncActiveStep() {
    this.getRoot()?.querySelectorAll('[data-step-panel]').forEach(panel => {
      const active = Number(panel.dataset.stepPanel) === this.currentStep;
      panel.classList.toggle('is-active', active);
      panel.toggleAttribute('hidden', !active);
    });
  }

  updateInputLocks() {
    if (!this.isStartingGame && !this.isLeavingScene) return;
    this.getRoot()?.querySelectorAll('button, input, select, textarea').forEach(control => {
      control.disabled = true;
    });
  }

  _isInputBlocked() { return this._cleanupDone || this.isStartingGame || this.isLeavingScene; }
  _invalidatePreparedCharacter() { this._preparedCharacter = null; }
  _characterAudioState() {
    return JSON.stringify([this.currentStep, this.playerData, this.isStartingGame, this.isLeavingScene]);
  }

  handleClick(event) {
    if (this._isInputBlocked() || !(event.target instanceof Element)) return;
    const button = event.target.closest('button'), root = this.getRoot();
    if (!button || button.disabled || !root?.contains(button)) return;
    const before = this._characterAudioState(), token = this._runToken;
    let completed = false;
    try { this._handleCharacterButton(button); completed = true; }
    finally {
      if (completed && this._runToken === token && !this.errorMessage && before !== this._characterAudioState()) {
        playMenuActionAudio(this);
      }
    }
  }

  _handleCharacterButton(button) {
    const { action, step, profile, difficulty, appearanceCategory, appearanceValue, statAction, stat } = button.dataset;
    if (action === 'retry-avatar') { void this.ensureAvatarAssets({ retryFailed: true }); return; }
    if (action === 'next') { this.goNext(); return; }
    if (action === 'back') { void this.goBack(); return; }
    if (action === 'randomize') { this.randomizeIdentity(); return; }
    if (step !== undefined) { this.goToStep(Number(step)); return; }
    if (profile) {
      this.playerData.profile = profile; this._invalidatePreparedCharacter(); this.clearError(); this.refresh(); return;
    }
    if (difficulty) {
      this.playerData.difficulty = difficulty; this._invalidatePreparedCharacter(); this.clearError(); this.refresh(); return;
    }
    if (appearanceCategory && appearanceValue) {
      if (Object.prototype.hasOwnProperty.call(this.playerData.appearance, appearanceCategory) &&
          avatarManager.isOptionAvailable(appearanceCategory, appearanceValue)) {
        this.playerData.appearance[appearanceCategory] = appearanceValue;
        this._invalidatePreparedCharacter(); this.clearError(); this.refresh();
      }
      return;
    }
    if (statAction && stat) this.changeStat(stat, statAction);
  }

  handleInput(event) {
    if (this._isInputBlocked() || !(event.target instanceof HTMLInputElement)) return;
    const input = event.target;
    if (input.matches('[data-character-name]')) {
      this.playerData.name = input.value.slice(0, MAX_NAME_LENGTH);
    } else if (input.matches('[data-character-alias]')) {
      this.playerData.alias = input.value.slice(0, MAX_NAME_LENGTH);
    } else return;
    this._invalidatePreparedCharacter();
    const hadError = Boolean(this.errorMessage);
    this.clearError();
    if (hadError) this.refresh(); else this.updateIdentityPreview();
  }

  goNext() {
    if (this._isInputBlocked() || !this.validateCurrentStep()) return;
    if (this.currentStep === STEP_COUNT - 1) { void this.startGame(); return; }
    this.currentStep++; this.clearError(); this.refresh();
  }

  async goBack() {
    if (this._isInputBlocked()) return;
    if (this.currentStep > 0) { this.currentStep--; this.clearError(); this.refresh(); return; }
    const token = this._runToken;
    this.isLeavingScene = true; this.clearError(); this.refresh();
    const left = await this.goto('EnterScene', { ...this.entryData });
    if (!left && this._runToken === token && !this._cleanupDone) {
      this.isLeavingScene = false; this.showError(text('t_b7e7b438aeb5cf7c01d4'));
    }
  }

  goToStep(step) {
    if (this._isInputBlocked() || !Number.isInteger(step) || step < 0 || step >= STEP_COUNT) return;
    if (step > this.currentStep && !this.validateStepsBefore(step)) return;
    this.currentStep = step; this.clearError(); this.refresh();
  }

  validateStepsBefore(targetStep) {
    const originalStep = this.currentStep;
    for (let step = 0; step < targetStep; step++) {
      this.currentStep = step;
      if (!this.validateCurrentStep()) { this.refresh(); return false; }
    }
    this.currentStep = originalStep;
    return true;
  }

  validateCurrentStep() {
    if (this.currentStep === 0 && !this.playerData.name.trim()) {
      this.showError(text('t_09c9832f9f5be7fc8088')); return false;
    }
    if (this.currentStep === 2 && this.getRemainingPoints() !== 0) {
      this.showError(`${text('t_4b96d0183cb9876c2d83')}${INITIAL_STAT_POINTS}${text('t_02a94b6d88bdca6df903')}`);
      return false;
    }
    return true;
  }

  getRemainingPoints() {
    return INITIAL_STAT_POINTS - STAT_IDS.reduce((sum, id) => sum + Math.max(0, (this.playerData.stats[id] ?? 1) - 1), 0);
  }

  changeStat(statId, action) {
    if (this._isInputBlocked() || !STAT_IDS.includes(statId)) return;
    const value = this.playerData.stats[statId] ?? 1;
    let changed = false;
    if (action === 'increase' && this.getRemainingPoints() > 0) { this.playerData.stats[statId] = value + 1; changed = true; }
    if (action === 'decrease' && value > 1) { this.playerData.stats[statId] = value - 1; changed = true; }
    if (changed) this._invalidatePreparedCharacter();
    this.clearError(); this.refresh();
  }

  randomizeIdentity() {
    if (this._isInputBlocked()) return;
    const identity = createRandomIdentity();
    this.playerData.name = identity.name; this.playerData.alias = identity.alias;
    this.playerData.appearance = randomAppearance();
    this._invalidatePreparedCharacter(); this.clearError(); this.refresh();
  }

  // Retry only keys that are not still queued/in-flight in ANY scene loader.
  // This avoids duplicating a timed-out request that may still be completing.
  _releaseCompletedAvatarFailures() {
    avatarManager.bind(this);
    const keys = new Set(avatarManager.failed);
    const scenes = new Set([this, ...Object.values(this.game?.scene?.keys || {})]);
    const busy = new Set();
    for (const scene of scenes) {
      for (const collection of [scene.load?.list, scene.load?.inflight, scene.load?.queue]) {
        if (!Array.isArray(collection?.entries)) continue;
        for (const file of collection.entries) {
          if (file.type === 'image' && keys.has(file.key)) busy.add(file.key);
        }
      }
    }
    for (const key of keys) if (!busy.has(key)) avatarManager.failed.delete(key);
    this._avatarRetryDeferred = [...busy];
  }

  ensureAvatarAssets({ retryFailed = false } = {}) {
    const token = this._runToken;
    if (!this._isCurrentRun(token)) return Promise.resolve({ cancelled: true });
    if (this._avatarLoadPromise) return this._avatarLoadPromise;
    if (retryFailed) this._releaseCompletedAvatarFailures();
    const request = Symbol('avatar-load');
    this._avatarLoadRequest = request;
    this._avatarLoadState = 'loading';
    this._avatarLoadMessage = '';
    this.updateAvatarPreview();
    const promise = Promise.resolve().then(() => {
      if (!this._isCurrentRun(token) || this._avatarLoadRequest !== request) return { cancelled: true };
      return avatarManager.ensureLoaded(this);
    }).then(result => {
      if (!this._isCurrentRun(token) || this._avatarLoadRequest !== request) return result;
      if (result?.cancelled) return result;
      const baseReady = avatarManager.hasTexture(AVATAR_CONFIG.CROP_KEY, this);
      const missing = result?.missing?.length > 0;
      this._avatarLoadState = baseReady && !missing ? 'ready' : 'error';
      this._avatarLoadMessage = baseReady
        ? (missing ? 'Some portrait options could not be loaded.' : '')
        : 'The portrait could not be loaded. Check your connection and retry.';
      if (this._avatarRetryDeferred.length) {
        this._avatarLoadMessage += ' Some files are still loading; retry when that finishes.';
      }
      this.refresh();
      return result;
    }).catch(error => {
      console.error('[CharacterCreationScene] Avatar loading failed:', error);
      if (this._isCurrentRun(token) && this._avatarLoadRequest === request) {
        this._avatarLoadState = 'error';
        this._avatarLoadMessage = 'The portrait could not be loaded. Check your connection and retry.';
        this.updateAvatarPreview();
      }
      return { ok: false, cancelled: false };
    }).finally(() => {
      if (this._avatarLoadRequest === request) {
        this._avatarLoadPromise = null;
        this._avatarLoadRequest = null;
        if (this._isCurrentRun(token)) this.updateAvatarPreview();
      }
    });
    this._avatarLoadPromise = promise;
    return promise;
  }

  _avatarStatus(canvas, drawn) {
    const card = canvas.closest('[data-avatar-preview]');
    const container = canvas.closest('.av-photo') || canvas.closest('figure') || canvas.parentElement;
    card?.classList.remove('is-developing');
    const developing = card?.querySelector('.av-dev');
    if (developing) developing.style.display = 'none';
    canvas.style.display = drawn ? '' : 'none';
    let status = container.querySelector('[data-avatar-load-status]');
    if (!status) {
      status = canvas.ownerDocument.createElement('div');
      status.dataset.avatarLoadStatus = '';
      status.dataset.characterPersistent = 'avatar-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.style.cssText = 'padding:12px;color:#59422e;font:16px/1.4 SpecialElite,monospace;';
      const message = canvas.ownerDocument.createElement('span');
      const retry = canvas.ownerDocument.createElement('button');
      retry.type = 'button'; retry.dataset.action = 'retry-avatar'; retry.textContent = 'Retry portrait';
      retry.style.cssText = 'display:block;margin-top:10px;padding:8px 12px;cursor:pointer;font:16px SpecialElite,monospace;';
      status.append(message, retry);
      container.appendChild(status);
    }
    const loading = this._avatarLoadState === 'loading';
    const failed = this._avatarLoadState === 'error' || (!drawn && !loading);
    status.style.display = loading || failed ? 'block' : 'none';
    status.querySelector('span').textContent = loading
      ? 'Loading portrait...'
      : this._avatarLoadMessage || 'The portrait is unavailable. You can retry loading it.';
    const button = status.querySelector('button');
    button.style.display = loading ? 'none' : 'block';
    button.disabled = loading || Boolean(this._avatarLoadPromise) || this._isInputBlocked();
  }

  updateAvatarPreview() {
    const root = this.getRoot();
    if (!root) return;
    avatarManager.bind(this);
    for (const canvas of root.querySelectorAll('[data-avatar-canvas]')) {
      let drawn = false;
      try {
        drawn = avatarManager.drawToCanvas(canvas, this.playerData.appearance, { height: 512, background: null, scene: this });
      } catch (error) {
        console.warn('[CharacterCreationScene] Could not draw avatar:', error);
        this._avatarLoadMessage = 'The portrait could not be drawn. Please retry.';
      }
      this._avatarStatus(canvas, drawn);
    }
  }

  updateIdentityPreview() {
    const root = this.getRoot();
    if (!root) return;
    const name = this.playerData.name.trim() || text('t_803b7246d0b19ce1283c');
    const alias = this.playerData.alias.trim() || 'UNLISTED';
    const avatarName = root.querySelector('[data-avatar-name]');
    const avatarAlias = root.querySelector('[data-avatar-alias]');
    if (avatarName) avatarName.textContent = name.toUpperCase();
    if (avatarAlias) avatarAlias.textContent = `${text('t_5c8f69d797c417f6b56b')}${alias.toUpperCase()}`;
    const witness = root.querySelector('.av-witness');
    if (witness) {
      const heading = root.ownerDocument.createElement('b');
      heading.textContent = 'WITNESS DESCRIPTION';
      witness.replaceChildren(heading, root.ownerDocument.createTextNode(getWitnessLine(this.playerData.appearance)));
    }
  }

  showError(message) { this.errorMessage = message; this.refresh(); }
  clearError() { this.errorMessage = ''; }

  _readSetupData() {
    const data = {};
    for (const key of REQUIRED_JSON_KEYS) {
      const value = this.cache.json.get(key);
      if (!Array.isArray(value) || value.length === 0) throw new Error(`Required setup data "${key}" is missing or empty.`);
      data[key] = value;
    }
    return data;
  }

  async startGame() {
    if (this._isInputBlocked() || !this.validateStepsBefore(STEP_COUNT)) return;
    const token = this._runToken, characterSignature = JSON.stringify(this.playerData);
    this.isStartingGame = true; this.clearError(); this.refresh();
    try {
      if (this._preparedCharacter !== characterSignature) {
        const { suspects, missions, locations } = this._readSetupData();
        const { setupNewGame } = await import('../gameSetup.js');
        if (this._runToken !== token || this._cleanupDone) return;
        await setupNewGame(suspects, missions, locations, this.playerData.difficulty);
        if (this._runToken !== token || this._cleanupDone) return;
        const profile = getProfile(this.playerData.profile), appearance = { ...this.playerData.appearance };
        gameState.updateState({
          playerName: this.playerData.name.trim(), agentName: this.playerData.name.trim(), playerAlias: this.playerData.alias.trim(),
          detectiveProfile: this.playerData.profile, profileBonus: profile?.bonus ?? null, detectiveStats: { ...this.playerData.stats },
          appearance, appearanceSummary: getAppearanceSummary(appearance), avatarVersion: 1, difficulty: this.playerData.difficulty
        });
        this._preparedCharacter = characterSignature;
        const saved = saveGameState();
        if (!saved) console.warn('[CharacterCreationScene] Character is ready, but autosave was not written.');
        EventBus.emit('character-created', { name: gameState.playerName, profile: gameState.detectiveProfile, difficulty: gameState.difficulty });
      }
      const started = await this.goto('GameScene', {
        ...this.entryData, fromCharacterCreation: true, isNewGame: true, startOnboarding: true
      });
      if (!started && this._runToken === token && !this._cleanupDone) {
        this.isStartingGame = false; this.showError(text('t_f905bfaf51328a4c6a1f'));
      }
    } catch (error) {
      if (this._runToken === token && !this._cleanupDone) {
        console.error('[CharacterCreationScene] Unable to create detective:', error);
        this.isStartingGame = false; this.showError(text('t_cc5126fafc64833a1941'));
      }
    }
  }
}
