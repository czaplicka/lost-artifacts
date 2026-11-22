import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { gameState } from '../../GameData.js';
import { audioManager } from '../../managers/AudioManager.js';
import { ensureAlibiEncounters } from '../../alibi/AlibiEncounterSetup.js';
import { CrimeCityMapUI } from './CrimeCityMapUI.js';
import { CrimeCityNpcManager } from './CrimeCityNpcManager.js';
import { buildCrimeCityLayout } from './CrimeCityLayout.js';
import { CrimeCityTutorial } from '../../tutorials/CrimeCityTutorial.js';

export const crimeCityContentMethods = {
  initializeCrimeCity() {
    this.cityData = null;
    this.crimeCityConfig = null;
    const locations = this.cache.json.get('locations');
    this.cityData = Array.isArray(locations) ? locations.find(location => (
      location?.id === this.cityId || this.normalizeCityId(location?.city) === this.cityId
    )) : null;
    if (!this.cityData?.crimeCity) {
      console.error('[CrimeCityScene] Missing city configuration:', this.cityId);
      this.showCrimeCityError();
      return false;
    }
    this.crimeCityConfig = buildCrimeCityLayout(this, this.cityData.crimeCity);
    this.clearCrimeCityError();
    gameState.updateState({
      currentCityId: this.cityId,
      currentCity: this.cityData.city,
      currentCountry: this.cityData.country,
    });
    this.registry.set('currentCityId', this.cityId);
    this.registry.set('currentCity', this.cityData.city);
    this.progressService.initializeCurrentNode();
    audioManager.init(this);
    if (!audioManager.isMusicPlaying('themeGame')) audioManager.playMusic('themeGame', { loop: true });
    this.playCityAmbient();
    return true;
  },

  showCrimeCityError(message = 'The city map could not be loaded. You can return to the city without spending energy or money.') {
    this.clearCrimeCityError();
    this.stopCityAmbient();
    this.isTransitioning = false;
    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);
    this.cameras.main.setBackgroundColor('#17202a');
    const root = this.add.container(0, 0).setDepth(100000).setScrollFactor(0);
    const backdrop = this.add.rectangle(0, 0, 1, 1, 0x101820, 1)
      .setOrigin(0).setInteractive();
    backdrop.on('pointerdown', (_pointer, _x, _y, event) => event?.stopPropagation?.());
    const title = this.add.text(0, 0, 'MAP UNAVAILABLE', {
      fontFamily: 'PressStart2P', fontSize: '18px', color: '#e3c773', align: 'center',
    }).setOrigin(0.5);
    const body = this.add.text(0, 0, message, {
      fontFamily: 'SpecialElite', fontSize: '21px', color: '#f3e7c4', align: 'center',
    }).setOrigin(0.5);
    const button = this.add.text(0, 0, 'BACK TO CITY', {
      fontFamily: 'SpecialElite', fontSize: '23px', color: '#ffffff',
      backgroundColor: '#304c73', padding: { x: 22, y: 12 }, align: 'center',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const status = this.add.text(0, 0, '', {
      fontFamily: 'SpecialElite', fontSize: '17px', color: '#ffb3a7', align: 'center',
    }).setOrigin(0.5);
    root.add([backdrop, title, body, button, status]);
    const view = { root, title, body, button, status, busy: false, resize: null, escape: null };
    this._crimeCityErrorView = view;
    const layout = () => {
      if (this._crimeCityErrorView !== view || !root.scene) return;
      const { width, height } = this.scale;
      const maxWidth = Math.max(40, width - 48);
      backdrop.setSize(width, height);
      title.setPosition(width / 2, height * 0.28);
      title.setScale(Math.min(1, maxWidth / Math.max(1, title.width)));
      body.setWordWrapWidth(maxWidth, true).setPosition(width / 2, height * 0.46);
      button.setPosition(width / 2, Math.max(height * 0.66, body.y + body.height / 2 + 42));
      status.setWordWrapWidth(maxWidth, true).setPosition(width / 2, button.y + 62);
    };
    const leave = async () => {
      if (view.busy || this._crimeCityErrorView !== view || this._cleanupDone) return;
      view.busy = true;
      button.setAlpha(0.6);
      status.setText('Returning to the city...');
      const token = this._runToken;
      try {
        const started = await this.goto('CityScene', { cityId: this.cityId });
        if (!started && this._runToken === token && this._crimeCityErrorView === view) {
          status.setText('Could not open the city. Please try again.');
        }
      } catch (error) {
        console.error('[CrimeCityScene] Recovery navigation failed:', error);
        if (this._runToken === token && this._crimeCityErrorView === view) {
          status.setText('Could not open the city. Please try again.');
        }
      } finally {
        if (this._runToken === token && this._crimeCityErrorView === view) {
          view.busy = false;
          button.setAlpha(1);
        }
      }
    };
    button.on('pointerdown', (_pointer, _x, _y, event) => {
      event?.stopPropagation?.();
      void leave();
    });
    button.on('pointerover', () => button.setColor('#ffe066'));
    button.on('pointerout', () => button.setColor('#ffffff'));
    view.escape = event => { if (!event?.repeat) void leave(); };
    view.resize = layout;
    this.scale.on('resize', layout);
    this.input.keyboard?.on('keydown-ESC', view.escape);
    layout();
  },

  clearCrimeCityError() {
    const view = this._crimeCityErrorView;
    if (!view) return;
    this._crimeCityErrorView = null;
    this.scale.off('resize', view.resize);
    this.input?.keyboard?.off('keydown-ESC', view.escape);
    view.root?.destroy(true);
  },

  playCityAmbient() {
    if (this.cityAmbient?.isPlaying) return this.cityAmbient;
    this.cityAmbient = audioManager.playAmbient('citysound', { volume: 0.22, loop: true });
    return this.cityAmbient;
  },

  stopCityAmbient() {
    if (!this.cityAmbient) return;
    audioManager.releaseSound(this.cityAmbient);
    this.cityAmbient = null;
  },

  createCrimeCityHeader() {
    const map = this.mapUI;
    if (!map || this._cleanupDone) return;
    map.destroyObjects(map.headerObjects);
    if (!this.cityData) return;
    map.track(this.add.rectangle(0, 0, this.scale.width, 58, 0x000000, 0.5)
      .setOrigin(0).setDepth(20), map.headerObjects);
    map.track(this.add.text(40, 18,
      `${this.cityData.city}${__dialogueText('scenes/crimeCity/CrimeCityContentMethods.js', 't_0a07f659461970d8d8dc')}${this.cityData.country}`, {
        fontFamily: 'SpecialElite', fontSize: '28px', color: '#ffffff',
      }).setDepth(21), map.headerObjects);
  },

  getCrimeCityContentSnapshot() {
    const crimeSceneCompleted = this.isCrimeSceneCompleted();
    const crimeLabCompleted = this.isCrimeLabCompleted();
    const gridCompleted = this.isGridCompleted();
    const apartmentVisited = this.hasVisitedApartment();
    const apartmentAvailable = this.hasAnyDebunkedAlibi();
    const entryPaid = this.hasPaidCrimeLabEntry();
    const caseKey = this.getCaseKey();
    const phoneDecision = gameState.suspectFilesPhoneDecisions?.[String(caseKey)] ?? null;
    const signature = JSON.stringify([
      caseKey, this.cityId, crimeSceneCompleted, crimeLabCompleted,
      gridCompleted, apartmentVisited, apartmentAvailable, entryPaid, phoneDecision,
    ]);
    return {
      signature, crimeSceneCompleted, crimeLabCompleted, gridCompleted,
      apartmentVisited, apartmentAvailable,
    };
  },

  createCrimeCityContent({ force = false } = {}) {
    if (this._cleanupDone) return false;
    if (!this.cityData?.crimeCity || !this.crimeCityConfig) {
      if (!this._crimeCityErrorView) this.showCrimeCityError();
      return false;
    }
    this.mapUI ??= new CrimeCityMapUI(this);
    this.npcManager ??= new CrimeCityNpcManager(this);
    const snapshot = this.getCrimeCityContentSnapshot();
    const size = `${this.scale.width}x${this.scale.height}`;
    const geometryChanged = this._mapContentSize !== size ||
      this._mapContentConfig !== this.crimeCityConfig;
    const changed = force || geometryChanged || this._mapContentSignature !== snapshot.signature;
    if (!changed) {
      this.mapUI.refreshCostLabels();
      this.mapUI.refreshApartmentLocation(snapshot.apartmentAvailable);
      this.mapUI.syncTutorialTargets();
      return false;
    }
    if (geometryChanged || !this._mapContentBuilt) this.mapUI.createBackground();
    this.createCrimeCityHeader();
    this.mapUI.createAvailableLocations(snapshot);
    this.npcManager.clearCreatedObjects();
    if (!snapshot.apartmentVisited) {
      if (snapshot.crimeLabCompleted) this.ensureAlibiEncountersOnce();
      if (snapshot.crimeLabCompleted && snapshot.gridCompleted) {
        this.npcManager.createNpcSpots();
        this.tutorialController?.scheduleSuspectTutorial();
      }
    }
    this._mapContentBuilt = true;
    this._mapContentSignature = snapshot.signature;
    this._mapContentSize = size;
    this._mapContentConfig = this.crimeCityConfig;
    return true;
  },

  refreshCrimeCityContent() {
    if (!this.cityData?.crimeCity) {
      if (!this._crimeCityErrorView) this.showCrimeCityError();
      return false;
    }
    const size = `${this.scale.width}x${this.scale.height}`;
    if (this._mapContentSize !== size) {
      this.crimeCityConfig = buildCrimeCityLayout(this, this.cityData.crimeCity);
      if (this.npcManager) this.npcManager.resizePending = false;
    }
    return this.createCrimeCityContent();
  },

  startCrimeTutorial() {
    if (this._cleanupDone || !this.cityData?.crimeCity) return;
    this.crimeTutorial?.destroy();
    this.crimeTutorial = new CrimeCityTutorial(this, gameState);
    this.crimeTutorial.start();
    this.syncCrimeTutorial();
  },

  syncCrimeTutorial() {
    const tutorial = this.crimeTutorial;
    if (!tutorial?.isActive()) return;
    const saved = gameState.onboarding?.crimeCity;
    if (!saved) return;
    if (saved.completed || saved.step === 'finished') { tutorial.finish(false); return; }
    if (saved.step && saved.step !== tutorial.getStep()) tutorial.setStep(saved.step);
    const doneByStep = { crime_scene: this.isCrimeSceneCompleted(), crime_lab: this.isCrimeLabCompleted() };
    const step = tutorial.getStep();
    if (doneByStep[step]) tutorial.complete(step);
  },

  ensureAlibiEncountersOnce() {
    if (this.hasVisitedApartment()) return;
    const caseKey = this.getCaseKey();
    if (!caseKey || this.alibiEncountersEnsuredFor === caseKey) return;
    ensureAlibiEncounters(caseKey);
    this.alibiEncountersEnsuredFor = caseKey;
  },

  rebuildMapContent() {
    // Explicit refresh, e.g. after the NPC layout manager handles resize.
    // Keep controller instances, texture caches and event subscriptions alive.
    return this.createCrimeCityContent({ force: true });
  },

  scheduleStoryEvents() {
    if (!this.cityData?.crimeCity || this.hasVisitedApartment()) return;
    this.tutorialController?.scheduleLabCompletionPhoneCall();
  },

  createShopPin() { this.mapUI?.createShopIcon(); },
  getCaseKey() { return this.progressService?.getCaseKey() || null; },
  getCrimeCityProgress() { return this.progressService?.getCrimeCityProgress() || null; },
  hasPaidCrimeLabEntry() { return this.progressService?.hasPaidCrimeLabEntry() || false; },
  payCrimeLabEntryOnce() { return this.progressService?.payCrimeLabEntryOnce() || false; },
  moveToCrimeCityNode(targetNodeId, transportType = 'taxi') {
    return this.progressService?.moveToCrimeCityNode(targetNodeId, transportType) || false;
  },
  trySpendEnergy(category, key) { return this.progressService?.trySpendEnergy(category, key) || false; },
  isCrimeSceneCompleted() { return this.progressService?.isCrimeSceneCompleted() || false; },
  isCrimeLabCompleted() { return this.progressService?.isCrimeLabCompleted() || false; },
  isGridCompleted() { return this.progressService?.isGridCompleted() || false; },
};
