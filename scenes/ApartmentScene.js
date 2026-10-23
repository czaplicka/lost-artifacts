import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { inventoryManager } from '../managers/InventoryManager.js';
import { getCaseSuspects } from '../suspects/CaseSuspects.js';
import { CrimeCityTutorial, advanceCrimeTutorial } from '../CrimeCityTutorial.js';
import { ApartmentObject } from './apartament/ApartmentObject.js';
import { ApartmentInventoryUI } from './apartament/ApartmentInventoryUI.js';
import { ApartmentRoomSystem } from './apartament/ApartmentRoomSystem.js';
import { generateApartment } from './apartament/ApartmentGenerator.js';
import { saveGameState, requestAutosave, flushAutosave } from '../gameStatePersistence.js';

const DEFAULT_APARTMENT_MODIFIER = {
  id: 'empty_clues',
  effect: {
    state: 'empty', clueCount: 4, artifactState: 'left_behind',
    artifactRequired: true, artifactRecoveryBonus: 30, escapeMethod: 'combined'
  }
};

export class ApartmentScene extends BaseScene {
  constructor() {
    super({ key: 'ApartmentScene' });
    this.crimeTutorial = null;
    this.apartmentObjects = [];
    this.roomSystem = null;
  }

  init(data = {}) {
    this.destroyCrimeTutorial();
    this.roomSystem?.destroy();
    this.mission = data.mission || gameState.currentMission || {};
    this.cityId = data.cityId || gameState.crimeCityId || null;
    this.suspectId = data.suspectId || this.mission.thiefId || gameState.currentThiefId || 'suspect_001';
    this.caseKey = data.caseKey || this.getAlibiCaseKey();
    this.suspectName = this.resolveSuspectName();
    this.motive = data.motive || this.mission.motive || gameState.caseData?.motiveId || 'gambling_debt';
    this.apartmentModifier = data.apartmentModifier || this.mission.caseModifiers?.apartment || DEFAULT_APARTMENT_MODIFIER;
    this.apartmentEffect = { ...DEFAULT_APARTMENT_MODIFIER.effect, ...(this.apartmentModifier.effect || {}) };
    this.requiredClueCount = this.getRequiredClueCount(this.apartmentEffect.clueCount);
    this.missionId = String(this.mission.id || this.mission.missionId || 'unknown_mission');
    this.missionArtifact = this.resolveMissionArtifact();
    this.artifactRecovered = Boolean(this.mission.artifactRecovered || this.mission.artifact?.recovered || gameState.hasRecoveredArtifact(this.missionId));
    this.isTransitioning = false;
    this.isOpeningInventory = false;
    this.apartmentObjects = [];
    this.playerInventory = null;
    this.descriptionBox = null;
    this.messageBox = null;
    this.messageTimer = null;
    this.leaveDialog = null;
    this.hudReadyHandler = null;
    this.apartmentHud = null;
    this.migrationRunning = false;
    this.migrationTimer = null;
    this.exitButton = null;
    this.assetWarning = '';
    this.apartmentConfig = generateApartment(this.suspectId, this.motive, {
      mission: { ...this.mission, artifact: this.missionArtifact },
      apartmentModifier: this.apartmentModifier,
      caseIndex: this.mission.caseIndex ?? gameState.caseIndex ?? 0
    });
    this.apartmentConfig.title = this.suspectName ? `${this.suspectName}'s Apartment` : "Suspect's Apartment";
    this.apartmentConfig.objects = (this.apartmentConfig.objects || []).map(object => ({
      ...object,
      unlocks: (object.unlocks || []).flatMap(item => {
        if (!item || !(item.isArtifact || item.type === 'artifact')) return item ? [item] : [];
        return this.missionArtifact ? [{ ...this.missionArtifact }] : [];
      })
    }));
    this.roomSystem = new ApartmentRoomSystem(this);
  }

  preload() {
    this.roomSystem.preload();
    if (!this.textures.exists('btnExit')) this.load.image('btnExit', 'assets/exit.png');
  }

  getAlibiCaseKey() {
    const mission = this.mission || {};
    const raw = mission.artifact;
    const label = typeof raw === 'string' ? raw : raw?.label || raw?.name || mission.artifactName || 'default';
    return String(mission.id || mission.caseId || `${this.cityId}_${label}`);
  }
  resolveSuspectName() {
    const current = gameState.caseData?.alibiCases?.[this.caseKey];
    const entry = current?.suspects?.find(item => item.suspectId === this.suspectId);
    if (typeof entry?.suspectName === 'string' && entry.suspectName.trim()) return entry.suspectName.trim();
    const encounters = gameState.crimeCityEncounterState?.[this.caseKey];
    const encounter = Array.isArray(encounters)
      ? encounters.find(item => item?.suspectId === this.suspectId && item.alibiWitness === true) : null;
    if (typeof encounter?.suspectName === 'string' && encounter.suspectName.trim()) return encounter.suspectName.trim();
    const suspect = getCaseSuspects(gameState).find(item => item?.id === this.suspectId);
    if (typeof suspect?.name === 'string' && suspect.name.trim()) return suspect.name.trim();
    console.warn('[ApartmentScene] Missing public/alibi identity:', this.suspectId, this.caseKey);
    return null;
  }
  resolveMissionArtifact() {
    const mission = this.mission || {};
    const raw = mission.artifact;
    const object = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const label = typeof raw === 'string' ? raw.trim() : String(object.label || object.name || mission.artifactName || '').trim();
    const key = mission.artifactKey || object.artifactKey || object.id || null;
    if (mission.artifactKey && object.artifactKey && mission.artifactKey !== object.artifactKey) {
      console.error('[ApartmentScene] Saved artefact conflicts with the original mission key. The old recovery needs correction.', mission);
      return null;
    }
    if (!label || !key) {
      console.error('[ApartmentScene] Missing mission artefact name/key. No substitute will be generated.', mission);
      return null;
    }
    return {
      ...object, id: String(object.id || key), artifactKey: String(key),
      type: 'artifact', label, name: label,
      description: object.description || mission.description || '',
      significance: object.significance || mission.significance || '',
      city: object.city || mission.city || gameState.crimeCity || '',
      country: object.country || mission.country || '', condition: object.condition || 'intact',
      recovered: Boolean(object.recovered || mission.artifactRecovered),
      isArtifact: true, isClue: false, isEscapeClue: false, isEscapeFragment: false,
      isRedHerring: false, quantity: 1
    };
  }

  create() {
    super.create();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.playerInventory = new ApartmentInventoryUI(this);
    this.createBackground();
    this.createHeader();
    this.createControls();
    this.restoreInventory();
    this.createApartmentObjects();
    this.onBus('inventoryUpdated', this.onInventoryUpdated, this);
    this.onBus('itemCombined', this.onItemCombined, this);
    this.trackInputEvent(this.events, Phaser.Scenes.Events.WAKE, this.setupSharedHud, this);
    this.trackInputEvent(this.events, Phaser.Scenes.Events.RESUME, this.setupSharedHud, this);
    void this.setupSharedHud();
    this.cameras.main.fadeIn(400, 0, 0, 0);
    if (advanceCrimeTutorial(gameState, 'arrest')) requestAutosave();
    this.startCrimeTutorial();
    if (!this.missionArtifact) this.showMessage('The case file has no valid stolen artefact. No replacement item has been generated.', 5000, '#8b3030');
  }

  getState() { return gameState; }
  getRequiredClueCount(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(1, Math.min(6, Math.floor(n))) : 3;
  }
  async setupSharedHud() {
    try {
      const hud = await this.restorePlayerHud();
      if (!hud || this._cleanupDone || !this.sys.isActive()) return null;
      if (this.apartmentHud && this.hudReadyHandler) this.apartmentHud.events.off('hud-ready', this.hudReadyHandler);
      this.apartmentHud = hud;
      hud.setCurrentGameplayScene('ApartmentScene');
      hud.closeAllUIPanels();
      if (!hud.isHudReady) {
        this.hudReadyHandler = () => {
          this.hudReadyHandler = null;
          if (!this._cleanupDone && this.sys.isActive()) hud.setCurrentGameplayScene('ApartmentScene');
        };
        hud.events.once('hud-ready', this.hudReadyHandler);
      }
      return hud;
    } catch (error) {
      console.error('[ApartmentScene] Shared HUD failed:', error);
      return null;
    }
  }
  async openSharedInventory() {
    if (this.isTransitioning || this.isOpeningInventory || this.leaveDialog) return false;
    this.isOpeningInventory = true;
    try {
      const hud = this.getPlayerHudScene() || await this.setupSharedHud();
      if (!hud || this._cleanupDone || !this.sys.isActive()) return false;
      const panel = await hud.ensurePanel('inventoryUI');
      if (!panel || this._cleanupDone || !this.sys.isActive()) return false;
      hud.setCurrentGameplayScene('ApartmentScene');
      hud.closeAllUIPanels();
      panel.open();
      return true;
    } catch (error) {
      console.error('[ApartmentScene] Cannot open inventory:', error);
      this.showMessage('Your inventory could not be opened. Please try again.', 2500, '#8b3030');
      return false;
    } finally { this.isOpeningInventory = false; }
  }

  getProgress() { return gameState.apartmentProgress?.[this.missionId] || {}; }
  updateProgress(patch) {
    gameState.updateState({ apartmentProgress: {
      ...(gameState.apartmentProgress || {}),
      [this.missionId]: { ...this.getProgress(), ...patch, updatedAt: new Date().toISOString() }
    }});
    requestAutosave();
  }
  getSavedItems() { return Array.isArray(this.getProgress().items) ? this.getProgress().items : []; }
  restoreInventory() {
    const collected = { ...(this.getProgress().collectedItems || {}) };
    for (const item of this.getSavedItems()) if (item?.id) collected[item.id] = true;
    this.updateProgress({ collectedItems: collected });
    this.migrateLegacyInventory();
  }
  migrateLegacyInventory() {
    if (this.migrationRunning || !this.playerInventory) return;
    this.migrationRunning = true;
    try {
      const pending = [];
      for (const item of this.getSavedItems()) {
        if (!item?.id) continue;
        if ((item.isArtifact || item.type === 'artifact') && this.artifactRecovered) continue;
        if (!this.playerInventory.addItem(item)) pending.push(item);
      }
      this.updateProgress({ items: pending, inventoryVersion: 2 });
      if (pending.length) this.showMessage('Some evidence from your old save is waiting for room in your inventory. Nothing has been discarded.', 4000, '#795548');
    } finally { this.migrationRunning = false; }
  }
  onInventoryUpdated() {
    if (this._cleanupDone || !this.playerInventory) return;
    this.playerInventory.save();
    if (this.migrationRunning || this.migrationTimer || !this.getSavedItems().length) return;
    this.migrationTimer = this.time.delayedCall(0, () => {
      this.migrationTimer = null;
      if (!this._cleanupDone) this.migrateLegacyInventory();
    });
  }
  persistApartmentState() {
    this.playerInventory?.save();
    this.updateProgress({});
  }
  getObjectProgress(id) { return this.getProgress().objects?.[id] || null; }
  onObjectStateChanged(id, data) { this.updateProgress({ objects: { ...(this.getProgress().objects || {}), [id]: data } }); }
  markItemCollected(item) { this.updateProgress({ collectedItems: { ...(this.getProgress().collectedItems || {}), [item.id]: true } }); }
  hasItemAlready(id) { return Boolean(this.getProgress().collectedItems?.[id] || this.playerInventory?.hasItem(id)); }
  addClueToNotebook(item) {
    if (!item?.id || item.isRedHerring || item.isArtifact) return;
    if (item.isClue !== true && item.isEscapeClue !== true) return;
    const label = item.label || item.name || 'Apartment clue';
    const description = item.description || item.hint || '';
    gameState.addClue({
      id: `apartment_${this.missionId}_${item.id}`, type: 'apartment', category: 'apartment',
      key: item.id, value: label, text: description ? `${label} - ${description}` : label,
      cityId: gameState.crimeCityId || null, missionId: this.missionId,
      source: 'suspect_apartment', isEscapeClue: item.isEscapeClue === true
    });
  }
  collectApartmentItem(item, sourceObject = {}) {
    if (!item?.id || this.isTransitioning || this.leaveDialog) return false;
    if (item.isArtifact || item.type === 'artifact') return this.collectMissionArtifact(item, sourceObject);
    const label = item.label || item.name || 'Unknown item';
    if (this.hasItemAlready(item.id)) {
      this.showMessage(`You already collected the ${label}.`, 1600);
      return true;
    }
    if (!this.playerInventory.addItem(item)) {
      this.showMessage('Your inventory is full. Make room and search here again. The item is still here.', 3000, '#795548');
      return false;
    }
    this.markItemCollected(item);
    this.addClueToNotebook(item);
    this.persistApartmentState();
    if (item.isEscapeClue || item.isEscapeFragment) {
      this.showMessage(`Found: ${label}\n\nAdded to your inventory. The crime lab may be able to examine it.`, 3200, '#795548');
    } else this.showMessage(`Found: ${label}\n\nAdded to your inventory.`, 2300, item.isRedHerring ? '#607d8b' : '#3e683d');
    return true;
  }

  collectMissionArtifact(item, sourceObject = {}) {
    if (this.artifactRecovered) {
      this.markItemCollected(item);
      this.showMessage('The recovered artefact has already been logged.', 1800);
      return true;
    }
    if (!this.missionArtifact) {
      this.showMessage('The stolen artefact is missing from the case file. Nothing has been logged.', 3500, '#8b3030');
      return false;
    }
    const artifact = {
      ...this.missionArtifact, recovered: true, recoveredAt: new Date().toISOString(),
      recoveredFrom: sourceObject.id || 'suspect_apartment',
      recoveredLocation: sourceObject.label || 'Suspect Apartment'
    };
    const beforeMission = gameState.currentMission;
    const originalMissionArtifact = beforeMission?.artifact;
    const recovered = gameState.recoverArtifact({
      missionId: this.missionId, artifact, recoveredAt: artifact.recoveredAt,
      recoveredFrom: artifact.recoveredFrom, recoveredLocation: artifact.recoveredLocation,
      condition: artifact.condition
    });
    this.artifactRecovered = Boolean(recovered || gameState.hasRecoveredArtifact(this.missionId));
    if (!this.artifactRecovered) {
      this.showMessage('The artefact could not be logged. It has not been removed.', 2800, '#8b3030');
      return false;
    }
    if (recovered && beforeMission) gameState.updateState({ currentMission: {
      ...gameState.currentMission, artifact: originalMissionArtifact, artifactRecovered: true
    }});
    this.markItemCollected(artifact);
    this.persistApartmentState();
    if (recovered) {
      EventBus.emit('artifactRecovered', { missionId: this.missionId, artifact, sourceObject });
      this.showArtifactRecovered(artifact);
    } else this.showMessage('The recovered artefact has already been logged.', 1800);
    return true;
  }
  showArtifactRecovered(artifact) {
    this.closeLeaveWarning();
    const hud = this.getPlayerHudScene();
    hud?.closeAllUIPanels();
    hud?.playerMenu?.close?.();
    inventoryManager.close();
    const host = hud || this;
    if (hud) { hud.scene.setVisible(true); hud.scene.bringToTop(); }
    const { width, height } = host.scale;
    const w = Math.min(620, width - 32);
    const h = Math.min(390, height - 32);
    const root = host.add.container(width / 2, height / 2).setDepth(50000).setScrollFactor(0);
    this.leaveDialog = root;
    root.add(host.add.rectangle(0, 0, width, height, 0x000000, 0.82).setInteractive());
    root.add(host.add.rectangle(0, 0, w, h, 0x241b16, 1).setStrokeStyle(3, 0xd4af37).setInteractive());
    root.add(host.add.text(0, -h / 2 + 30, 'ARTEFACT RECOVERED!', {
      fontFamily: 'PressStart2P', fontSize: '14px', color: '#ffd76b', align: 'center', wordWrap: { width: w - 40 }
    }).setOrigin(0.5, 0));
    if (host.textures.exists(artifact.artifactKey)) {
      const image = host.add.image(0, -22, artifact.artifactKey);
      image.setScale(Math.min(140 / image.width, Math.max(55, h - 210) / image.height));
      root.add(image);
    }
    root.add(host.add.text(0, h / 2 - 112, artifact.label + '\nLogged in recovered artefacts.', {
      fontFamily: 'SpecialElite', fontSize: '21px', color: '#fff3d6', align: 'center', wordWrap: { width: w - 40 }
    }).setOrigin(0.5));
    const button = host.add.rectangle(0, h / 2 - 38, 190, 44, 0x493d30)
      .setStrokeStyle(2, 0xd4af37).setInteractive({ useHandCursor: true });
    root.add([button, host.add.text(0, h / 2 - 38, 'Continue', {
      fontFamily: 'SpecialElite', fontSize: '22px', color: '#fff3d6'
    }).setOrigin(0.5)]);
    button.on('pointerdown', () => this.closeLeaveWarning());
  }
  onItemCombined(data = {}) {
    if (!this.sys.isActive() || this.isTransitioning || !data.result || data.missionId !== this.missionId) return;
    this.markItemCollected(data.result);
    this.addClueToNotebook(data.result);
    this.persistApartmentState();
  }

  createBackground() { this.roomSystem.create(); }
  createHeader() {
    const { width } = this.scale;
    this.add.rectangle(width / 2, 0, width, 108, 0x000000, 0.65).setOrigin(0.5, 0).setDepth(8);
    const x = Math.min(270, width * 0.34);
    const textWidth = Math.max(80, width - x - 20);
    const title = this.add.text(x, 20, this.apartmentConfig.title, {
      fontFamily: 'PressStart2P', fontSize: '18px', color: '#ffd700', wordWrap: { width: textWidth }
    }).setDepth(10);
    while (title.height > 44 && parseInt(title.style.fontSize, 10) > 10) title.setFontSize(parseInt(title.style.fontSize, 10) - 1);
    this.add.text(x, 72, this.apartmentConfig.subtitle || 'What can you find?', {
      fontFamily: 'SpecialElite', fontSize: '16px', color: '#eee4cf', wordWrap: { width: textWidth }
    }).setDepth(10);
    if (this.textures.exists('btnExit')) {
      this.exitButton = this.add.image(Math.min(140, width * 0.17), 70, 'btnExit')
        .setScale(0.5).setOrigin(0.5).setDepth(55).setInteractive({ useHandCursor: true });
      this.exitButton.on('pointerover', () => {
        if (!this.isTransitioning && !this.leaveDialog) this.exitButton.setScale(0.6);
      });
      this.exitButton.on('pointerout', () => this.exitButton?.setScale(0.5));
    } else {
      this.exitButton = this.add.rectangle(Math.min(140, width * 0.17), 70, 100, 44, 0x493d30)
        .setStrokeStyle(2, 0xd4af37).setDepth(55).setInteractive({ useHandCursor: true });
      this.add.text(this.exitButton.x, this.exitButton.y, 'EXIT', {
        fontFamily: 'SpecialElite', fontSize: '20px', color: '#fff3d6'
      }).setOrigin(0.5).setDepth(56);
    }
    this.exitButton.on('pointerdown', () => this.exitApartment());
  }
  createControls() {
    this.descriptionBox = this.add.text(20, this.scale.height - 60, this.assetWarning, {
      fontFamily: 'SpecialElite', fontSize: '13px', color: '#d9d9d9', backgroundColor: '#000000aa',
      padding: { x: 6, y: 4 }, wordWrap: { width: this.scale.width - 40 }
    }).setDepth(110);
  }
  createApartmentObjects() {
    this.apartmentObjects = (this.apartmentConfig?.objects || []).map(config => new ApartmentObject(this, config));
    this.roomSystem.applyObjectVisibility();
  }
  showDescription(text) { this.descriptionBox?.setText(text || this.assetWarning || ''); }
  showMessage(text, duration = 2000, color = '#37474f') {
    if (!text || !this.sys.isActive() || this._cleanupDone) return null;
    this.messageTimer?.remove(false);
    this.messageBox?.destroy();
    inventoryManager.close();
    const popup = this.add.text(this.scale.width / 2, this.scale.height / 2, text, {
      fontFamily: 'SpecialElite', fontSize: '18px', color: '#ffffff', backgroundColor: color,
      padding: { x: 20, y: 15 }, align: 'center', wordWrap: { width: Math.max(100, this.scale.width - 60) }
    }).setOrigin(0.5).setDepth(20000);
    this.messageBox = popup;
    this.messageTimer = this.time.delayedCall(duration, () => {
      popup.destroy();
      if (this.messageBox === popup) this.messageBox = null;
      this.messageTimer = null;
    });
    return popup;
  }

  hasUncollectedEvidence() {
    return (this.apartmentConfig?.objects || []).some(object =>
      (object.unlocks || []).some(item => {
        if (!item || item.isRedHerring) return false;
        if (item.isArtifact || item.type === 'artifact') return !this.artifactRecovered;
        return (item.isClue || item.isEscapeClue || item.isEscapeFragment) && !this.hasItemAlready(item.id);
      })
    );
  }
  exitApartment() {
    if (this.isTransitioning || this.leaveDialog || !this.sys.isActive()) return;
    if (this.hasUncollectedEvidence()) this.showLeaveWarning();
    else this.leaveApartment();
  }
  showLeaveWarning() {
    this.getPlayerHudScene()?.closeAllUIPanels();
    const { width, height } = this.scale;
    const panelWidth = Math.min(560, width - 30);
    const root = this.add.container(0, 0).setDepth(25000);
    this.leaveDialog = root;
    root.add(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75).setInteractive());
    root.add(this.add.rectangle(width / 2, height / 2, panelWidth, 240, 0x28221b).setStrokeStyle(3, 0xbfa065).setInteractive());
    root.add(this.add.text(width / 2, height / 2 - 60,
      'Leaving already?\nThere may still be useful evidence in this apartment.', {
        fontFamily: 'SpecialElite', fontSize: '22px', color: '#fff3d6', align: 'center', wordWrap: { width: panelWidth - 40 }
      }).setOrigin(0.5));
    const button = (x, label, callback) => {
      const w = (panelWidth - 60) / 2;
      const bg = this.add.rectangle(x, height / 2 + 65, w, 48, 0x493d30)
        .setStrokeStyle(2, 0xbfa065).setInteractive({ useHandCursor: true });
      const text = this.add.text(x, height / 2 + 65, label, {
        fontFamily: 'SpecialElite', fontSize: '19px', color: '#fff3d6'
      }).setOrigin(0.5);
      bg.on('pointerdown', () => { this.closeLeaveWarning(); callback(); });
      root.add([bg, text]);
    };
    button(width / 2 - panelWidth / 4 + 5, 'Keep searching', () => {});
    button(width / 2 + panelWidth / 4 - 5, 'Leave anyway', () => this.leaveApartment());
  }
  closeLeaveWarning() { this.leaveDialog?.destroy(true); this.leaveDialog = null; }
  leaveApartment() {
    if (this.isTransitioning) return;
    this.persistApartmentState();
    saveGameState();
    this.transitionToScene('CrimeCityScene', { cityId: gameState.crimeCityId });
  }
  transitionToScene(key, data = {}) {
    if (this.isTransitioning || !this.sys.isActive()) return;
    this.isTransitioning = true;
    inventoryManager.close();
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (this.sys.isActive()) void this.performSceneTransition(key, data);
    });
    this.cameras.main.fadeOut(400, 0, 0, 0);
  }
  async performSceneTransition(key, data) {
    try {
      const started = await this.goto(key, data);
      if (started === false && this.sys.isActive()) this.restoreAfterTransitionFailure();
    } catch (error) {
      console.error('[ApartmentScene] Navigation failed:', error);
      if (this.sys.isActive()) this.restoreAfterTransitionFailure();
    }
  }
  restoreAfterTransitionFailure() {
    this.isTransitioning = false;
    this.cameras.main.fadeIn(200, 0, 0, 0);
    this.showMessage('Could not leave the apartment. Try EXIT again.', 2500, '#8b3030');
  }
  startCrimeTutorial() {
    this.destroyCrimeTutorial();
    const saved = gameState.onboarding?.crimeCity;
    if (!saved || saved.completed || saved.step !== 'search_apartment') return;
    this.crimeTutorial = new CrimeCityTutorial(this, gameState);
    this.crimeTutorial.start();
  }
  destroyCrimeTutorial() {
    try { this.crimeTutorial?.destroy(); }
    catch (error) { console.warn('[ApartmentScene] Tutorial cleanup failed:', error); }
    this.crimeTutorial = null;
  }
  onShutdown() {
    this.destroyCrimeTutorial();
    this.roomSystem?.destroy();
    this.roomSystem = null;
    this.messageTimer?.remove(false);
    this.migrationTimer?.remove(false);
    this.messageTimer = null;
    this.migrationTimer = null;
    this.closeLeaveWarning();
    if (this.apartmentHud && this.hudReadyHandler) this.apartmentHud.events.off('hud-ready', this.hudReadyHandler);
    this.hudReadyHandler = null;
    this.apartmentHud = null;
    inventoryManager.close();
    flushAutosave();
    this.apartmentObjects.forEach(object => object.destroy());
    this.apartmentObjects = [];
    this.playerInventory?.destroy();
    this.playerInventory = null;
    this.messageBox?.destroy();
    this.messageBox = null;
    this.descriptionBox = null;
    this.exitButton = null;
  }
}
export default ApartmentScene;
