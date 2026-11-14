import { gameState } from '../../GameData.js';
import { audioManager } from '../../managers/AudioManager.js';
import { ensureAlibiEncounters } from '../../alibi/AlibiEncounterSetup.js';
import { CrimeCityMapUI } from './CrimeCityMapUI.js';
import { CrimeCityNpcManager } from './CrimeCityNpcManager.js';
import { buildCrimeCityLayout } from './CrimeCityLayout.js';
import { CrimeCityTutorial } from '../../tutorials/CrimeCityTutorial.js';

export const crimeCityContentMethods = {
  initializeCrimeCity() {
    const locations = this.cache.json.get('locations');
    this.cityData = Array.isArray(locations) ? locations.find(location => (
      location?.id === this.cityId || this.normalizeCityId(location?.city) === this.cityId
    )) : null;
    if (!this.cityData?.crimeCity) {
      console.error('[CrimeCityScene] Missing city configuration:', this.cityId);
      return;
    }
    this.crimeCityConfig = buildCrimeCityLayout(this, this.cityData.crimeCity);
    gameState.currentCityId = this.cityId;
    gameState.currentCity = this.cityData.city;
    gameState.currentCountry = this.cityData.country;
    this.registry.set('currentCityId', this.cityId);
    this.registry.set('currentCity', this.cityData.city);
    this.progressService.initializeCurrentNode();
    audioManager.init(this);
    if (!audioManager.isMusicPlaying('themeGame')) audioManager.playMusic('themeGame', { loop: true });
    this.playCityAmbient();
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

    map.track(
      this.add.rectangle(0, 0, this.scale.width, 58, 0x000000, 0.5)
        .setOrigin(0)
        .setDepth(20),
      map.headerObjects
    );

    map.track(
      this.add.text(40, 18, `${this.cityData.city}, ${this.cityData.country}`, {
        fontFamily: 'SpecialElite',
        fontSize: '28px',
        color: '#ffffff'
      }).setDepth(21),
      map.headerObjects
    );
  },

  createCrimeCityContent() {
    if (!this.cityData?.crimeCity) return;
    const crimeSceneCompleted = this.isCrimeSceneCompleted();
    const crimeLabCompleted = this.isCrimeLabCompleted();
    const gridCompleted = this.isGridCompleted();
    const apartmentVisited = this.hasVisitedApartment();
    this.npcManager?.clearCreatedObjects();
    this.mapUI?.createBackground();
    this.createCrimeCityHeader();
    this.mapUI?.createAvailableLocations({
      crimeSceneCompleted, crimeLabCompleted, gridCompleted, apartmentVisited,
      apartmentAvailable: this.hasAnyDebunkedAlibi()
    });
    if (apartmentVisited) return;
    if (crimeLabCompleted) this.ensureAlibiEncountersOnce();
    if (crimeLabCompleted && gridCompleted) {
      this.npcManager?.createNpcSpots();
      this.tutorialController?.scheduleSuspectTutorial();
    }
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
    this.npcManager?.destroy();
    this.mapUI?.destroy();
    this.mapUI = new CrimeCityMapUI(this);
    this.npcManager = new CrimeCityNpcManager(this);
    this.createCrimeCityContent();
  },

  scheduleStoryEvents() {
    if (this.hasVisitedApartment()) return;
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
  isGridCompleted() { return this.progressService?.isGridCompleted() || false; }
};
