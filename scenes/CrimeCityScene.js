import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { getEnergyManager } from '../EnergyManager.js';
import { audioManager } from '../AudioManager.js';
import { ReconstructionGenerator } from '../ReconstructionGenerator.js';
import { ensureAlibiEncounters } from '../AlibiEncounterSetup.js';

const ENERGY_BASE_COSTS = {
  travel: {
    taxi: 8
  },
  activity: {
    crime_scene: 8,
    csi_lab: 12
  }
};

export class CrimeCityScene extends BaseScene {
constructor() {
  super({ key: 'CrimeCityScene' });

  this.cityId = null;
  this.cityData = null;
  this.crimeCityConfig = null;
  this.interactiveObjects = [];
  this.cityAmbient = null;

  this.showLabCompletionPhoneCall = false;
  this.phoneCallTimer = null;
}

init(data = {}) {
  const requestedCity =
    data.cityId ||
    gameState.crimeCityId ||
    gameState.currentMission?.city ||
    'paris';

  this.cityId = this.normalizeCityId(requestedCity);
  this.interactiveObjects = [];
  this.cityAmbient = null;

  // True tylko przy powrocie z ukończonego Crime Lab.
  this.showLabCompletionPhoneCall = Boolean(
    data.showLabCompletionPhoneCall &&
    data.crimeLabCompleted
  );

  this.phoneCallTimer?.remove(false);
  this.phoneCallTimer = null;
}

  normalizeCityId(value) {
    if (!value) {
      return 'paris';
    }

    const normalized = String(value)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');

    const aliases = {
      new_york: 'new_york_city',
      new_york_city: 'new_york_city',
      new_delhi: 'new_delhi',
      new_dehli: 'new_delhi',
      kotte: 'kotto',
      sri_jayawardenepura_kotte: 'kotto'
    };

    return aliases[normalized] || normalized;
  }

  create() {
    super.create();

    console.log('[CrimeCityScene] create started');

    // SAFE CHECK: Czy to jest prawidłowa scena z sys property?
    if (!this?.scene?.manager?.keys) {
      console.error('[CrimeCityScene] Scene manager is not accessible!');
      return;
    }

    console.log('[CrimeCityScene] Scene keys:', {
      CrimeCityScene: this.scene.manager.keys.CrimeCityScene?.sys?.isActive?.() || 'undefined/inactive',
      CrimeLabScene: this.scene.manager.keys.CrimeLabScene?.sys?.isActive?.() || 'undefined/inactive',
      UIScene: this.scene.manager.keys.UIScene?.sys?.isActive?.() || 'undefined/inactive',
      NewsHud: this.scene.manager.keys.NewsHud?.sys?.isActive?.() || 'undefined/inactive',
      PlayerHudScene: this.scene.manager.keys.PlayerHudScene?.sys?.isActive?.() || 'undefined/inactive'
    });

    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // Setup shutdown handler
    this.boundShutdown = this.onShutdown.bind(this);
    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundShutdown
    );

    // === NewsHud setup (safe) ===
    try {
      const newsHud = this.scene.manager.keys.NewsHud;
      
      if (newsHud && newsHud.sys && newsHud.sys.isActive?.()) {
        if (newsHud.events) {
          newsHud.events.emit('setNewspaperVisible', true);
          newsHud.events.emit('setTvVisible', false);
        }
      } else {
        console.warn('[CrimeCityScene] NewsHud unavailable or not active.');
      }
    } catch (err) {
      console.warn('[CrimeCityScene] NewsHud setup failed:', err.message);
    }

    // === UIScene setup (safe) ===
    try {
      const uiScene = this.scene.manager.keys.UIScene;

      if (uiScene && uiScene.sys) {
        if (this.scene.isActive('UIScene')) {
          this.scene.bringToTop('UIScene');
        } else if (this.scene.isSleeping('UIScene')) {
          this.scene.wake('UIScene');
          this.scene.bringToTop('UIScene');
        } else if (!this.scene.isActive('UIScene')) {
          this.scene.launch('UIScene');
          this.scene.bringToTop('UIScene');
        }
      } else {
        console.warn('[CrimeCityScene] UIScene unavailable.');
      }
    } catch (err) {
      console.warn('[CrimeCityScene] UIScene setup failed:', err.message);
    }

    // === Main scene initialization ===
    try {
      const locations = this.cache.json.get('locations');

      this.cityData = Array.isArray(locations)
        ? locations.find(
            (location) =>
              location?.id === this.cityId ||
              this.normalizeCityId(location?.city) === this.cityId
          )
        : null;

      if (!this.cityData?.crimeCity) {
        console.error('[CrimeCityScene] Missing city or crimeCity configuration.', {
          cityId: this.cityId,
          cityData: this.cityData,
          locations
        });
        return;
      }

      this.crimeCityConfig = this.cityData.crimeCity;

      gameState.currentCityId = this.cityId;
      gameState.currentCity = this.cityData.city;
      gameState.currentCountry = this.cityData.country;

      if (
        !gameState.crimeCityCurrentNodes ||
        typeof gameState.crimeCityCurrentNodes !== 'object'
      ) {
        gameState.crimeCityCurrentNodes = {};
      }

      const caseKey = this.getCaseKey();

      if (!gameState.crimeCityCurrentNodes[caseKey]) {
        gameState.crimeCityCurrentNodes[caseKey] = 'arrival';
      }

      audioManager.init(this);

      if (!audioManager.isMusicPlaying('themeGame')) {
        audioManager.playMusic('themeGame', { loop: true });
      }

      this.cityAmbient = audioManager.playAmbient('citysound', {
        volume: 0.22,
        loop: true
      });

      this.createBackground();
      this.createHeader();

const crimeSceneCompleted = this.isCrimeSceneCompleted();
const crimeLabCompleted = this.isCrimeLabCompleted();

if (crimeSceneCompleted) {
  this.createSuspectsIcon();
}

// Crime Scene jest dostępne wyłącznie przed ukończeniem dochodzenia na miejscu.
if (!crimeSceneCompleted) {
  this.createCrimeSceneIcon();
}

// Crime Lab pojawia się po zbadaniu miejsca zbrodni,
// ale znika po zakończeniu analiz.
if (crimeSceneCompleted && !crimeLabCompleted) {
  this.createLabIcon();
}

this.createHotelIcon();

if (crimeLabCompleted) {
  ensureAlibiEncounters(this.getCaseKey());
}

      this.createNpcSpots();

      this.scene.wake('UIScene');

      const playerHud = this.scene.manager.keys.PlayerHudScene;

      if (playerHud && playerHud.sys) {
        playerHud.closeAllUIPanels?.();
        playerHud.refreshNotebook?.();
      }
      this.scheduleLabCompletionPhoneCall();
    } catch (err) {
      console.error('[CrimeCityScene] Main initialization failed:', err);
    }
  }
scheduleLabCompletionPhoneCall() {
  if (!this.showLabCompletionPhoneCall) {
    return;
  }

  if (!this.isCrimeLabCompleted()) {
    console.warn(
      '[CrimeCityScene] Phone call skipped: Crime Lab is not marked complete.'
    );
    return;
  }

  if (!this.scene.manager.keys.PhoneCallScene) {
    console.error(
      '[CrimeCityScene] PhoneCallScene is not registered in the scene manager.'
    );
    return;
  }

  this.showLabCompletionPhoneCall = false;

  this.phoneCallTimer = this.time.delayedCall(650, () => {
    this.phoneCallTimer = null;

    if (!this.scene.isActive('CrimeCityScene')) {
      return;
    }

    if (this.scene.isActive('PhoneCallScene')) {
      return;
    }

    this.closeAllUIPanels();

    this.scene.launch('PhoneCallScene', {
      sourceScene: 'CrimeCityScene',
      cityId: this.cityId
    });
  });
}
  createBackground() {
    const configuredKey =
      this.crimeCityConfig.backgroundKey || `${this.cityId}_crime`;

    const fallbackKey = this.cityId;

    const backgroundKey = this.textures.exists(configuredKey)
      ? configuredKey
      : fallbackKey;

    if (!this.textures.exists(backgroundKey)) {
      console.warn('[CrimeCityScene] Missing background texture.', {
        configuredKey,
        fallbackKey
      });

      this.cameras.main.setBackgroundColor('#17202a');
      return;
    }

    this.add
      .image(this.scale.width / 2, this.scale.height / 2, backgroundKey)
      .setDisplaySize(this.scale.width, this.scale.height);
  }

  createHeader() {
    this.add
      .rectangle(0, 0, this.scale.width, 76, 0x000000, 0.5)
      .setOrigin(0, 0)
      .setDepth(20);

    this.add
      .text(40, 18, `${this.cityData.city}, ${this.cityData.country}`, {
        fontFamily: 'Special Elite',
        fontSize: '28px',
        color: '#ffffff'
      })
      .setDepth(21);

    const artifact = gameState.currentMission?.artifact;
    let subtitle = 'Follow the evidence. Ignore the dramatic pigeons.';

    if (!this.isCrimeSceneCompleted()) {
      subtitle = artifact
        ? `Case: ${artifact} — inspect the crime scene before opening suspect files.`
        : 'Start with the crime scene. Suspect files remain sealed.';
    } else if (!this.isCrimeLabCompleted()) {
      subtitle = 'Evidence collected. Time to visit the Crime Lab.';
    } else {
      subtitle = 'Lab report ready. Question the people with alibis.';
    }

    this.add
      .text(40, 50, subtitle, {
        fontFamily: 'Special Elite',
        fontSize: '16px',
        color: '#f1e6b8'
      })
      .setDepth(21);
  }

  createHotelIcon() {
    const position = this.crimeCityConfig.hotel || {
      x: 190,
      y: this.scale.height - 145
    };

    this.createMapIcon({
      x: position.x,
      y: position.y,
      textureKey: 'hotel_icon',
      fallbackColor: 0x6a4c93,
      fallbackStroke: 0xd6b4ff,
      label: 'Hotel',
      completed: false,
      iconScale: 0.22,
      hoverScale: 0.25,
      onClick: () => {
        this.closeAllUIPanels();

        this.transitionTo('HotelScene', {
          cityId: this.cityId,
          city: this.cityData.city,
          country: this.cityData.country,
          returnScene: 'CrimeCityScene',
          returnData: {
            cityId: this.cityId
          },
          sourceScene: 'CrimeCityScene'
        });
      }
    });
  }

  createSuspectsIcon() {
    const position = this.crimeCityConfig.suspectBoard || {
      x: this.scale.width - 150,
      y: this.scale.height - 145
    };

    const suspectCount = Array.isArray(gameState.caseSuspects)
      ? gameState.caseSuspects.length
      : 0;

    const activeCount = Array.isArray(gameState.caseSuspects)
      ? gameState.caseSuspects.filter(
          (suspect) => !suspect?.deductionState?.eliminated
        ).length
      : 0;

    const label = suspectCount > 0
      ? `Suspect Files (${activeCount}/${suspectCount})`
      : 'Suspect Files';

    this.createMapIcon({
      x: position.x,
      y: position.y,
      textureKey: 'policja',
      fallbackColor: 0x304c73,
      fallbackStroke: 0x9ac7ff,
      label,
      completed: false,
      iconScale: 0.22,
      hoverScale: 0.25,
      onClick: () => {
        if (!Array.isArray(gameState.caseSuspects) || !gameState.caseSuspects.length) {
          this.showMessage(
            'No suspects yet. Check the crime scene.\nThis is either bureaucratic delay or a pigeon conspiracy.',
            3000,
            '#5d2a00'
          );
          return;
        }

        this.closeAllUIPanels();

        this.transitionTo('SuspectBoardScene', {
          cityId: this.cityId,
          returnScene: 'CrimeCityScene',
          returnData: {
            cityId: this.cityId
          },
          sourceScene: 'CrimeCityScene',
          caseSuspects: gameState.caseSuspects,
          identityEvidence: gameState.identityEvidence,
          identityEvidenceResult: gameState.identityEvidenceResult,
          hypothesisEvidence: gameState.hypothesisEvidence,
          hypothesisEvidenceResult: gameState.hypothesisEvidenceResult,
          forensicResults: gameState.forensicResults || [],
          gameState
        });
      }
    });
  }

  createCrimeSceneIcon() {
  const position = this.crimeCityConfig.crimeScene;

  if (!position) {
    console.warn('[CrimeCityScene] Missing crimeScene position.', {
      cityId: this.cityId,
      crimeCityConfig: this.crimeCityConfig
    });
    return;
  }

  this.createMapIcon({
    x: position.x,
    y: position.y,
    textureKey: 'search',
    fallbackColor: 0xd4af37,
    fallbackStroke: 0xfff1a8,
    label: 'Crime Scene',
    iconScale: 0.22,
    hoverScale: 0.25,
    onClick: () => this.openCrimeScene()
  });
}

  openCrimeScene() {
    const mission = gameState.currentMission;

    if (!mission?.scene) {
      console.error('[CrimeCityScene] Mission has no scene.', { mission });

      this.showMessage(
        'This case has no crime-scene data yet.\nEven the chalk outline is confused.',
        2600,
        '#5d2a00'
      );
      return;
    }

    const reconstruction = this.prepareReconstruction();

    if (!reconstruction) {
      this.showMessage(
        'The case reconstruction could not be prepared.\nThe evidence board is having an existential crisis.',
        3200,
        '#8b0000'
      );
      return;
    }

    const foundCardIds = reconstruction.foundCardIds || [];

    if (!Array.isArray(foundCardIds) || foundCardIds.length !== 6) {
      console.error(
        '[CrimeCityScene] Reconstruction has an invalid hidden-objects set.',
        {
          caseKey: this.getCaseKey(),
          sceneId: mission.scene,
          foundCardIds,
          reconstruction
        }
      );

      this.showMessage(
        'The case produced an invalid evidence set.\nCheck the reconstruction generator data.',
        3200,
        '#8b0000'
      );
      return;
    }

    console.log('[CrimeCityScene] Reconstruction ready before Hidden Objects.', {
      caseKey: this.getCaseKey(),
      sceneId: mission.scene,
      thiefId: reconstruction.thiefId,
      thiefSkills: reconstruction.thiefSkills,
      claims: reconstruction.claims?.map((claim) => ({
        questionId: claim.questionId,
        solutionItemId: claim.solutionItemId,
        thiefSkill: claim.thiefSkill
      })),
      foundCardIds
    });

    if (!this.moveToCrimeCityNode('crime_scene')) {
      return;
    }

    if (!this.trySpendEnergy('activity', 'crime_scene')) {
      return;
    }

    this.closeAllUIPanels();

    this.transitionTo('HiddenObjectsScene', {
      sceneId: mission.scene,
      mapKey: mission.scene,
      mapPath: `assets/crimes/${mission.scene}.json`,
      backgroundMode: 'image',
      backgroundKey: `${mission.scene}_bg`,
      backgroundPath: `assets/crimes/${mission.scene}.jpg`,
      objectLayerName: 'HiddenObjects',
      objectsDataKey: 'objects-data',
      objectsDataPath: 'assets/data/objects.json',
      itemSceneKey: mission.scene,
      activeCount: 6,
      timeLimit: 120,
      title: `Crime Scene – ${this.cityData.city}`,
      returnScene: 'CrimeCityScene',
      returnData: {
        cityId: this.cityId
      },
      cityId: this.cityId,
      sourceScene: 'CrimeCityScene',
      mission
    });
  }

  createLabIcon() {
  const position = this.crimeCityConfig.crimeLab;

  if (!position || !this.isCrimeSceneCompleted()) {
    return;
  }

  this.createMapIcon({
    x: position.x,
    y: position.y,
    textureKey: 'crime_lab',
    fallbackColor: 0x1565c0,
    fallbackStroke: 0x7fc8f8,
    label: 'Crime Lab',
    iconScale: 0.35,
    hoverScale: 0.39,
    onClick: () => {
      if (!this.moveToCrimeCityNode('crime_lab')) {
        return;
      }

      if (!this.trySpendEnergy('activity', 'csi_lab')) {
        return;
      }

      this.closeAllUIPanels();

      this.transitionTo('CrimeLabScene', {
        cityId: this.cityId,
        caseKey: this.getCaseKey(),
        returnScene: 'CrimeCityScene',
        returnData: {
          cityId: this.cityId
        },
        sourceScene: 'CrimeCityScene'
      });
    }
  });
}

  createNpcSpots() {
    if (!this.isCrimeLabCompleted()) {
      return;
    }

    const slots = this.crimeCityConfig.suspectSlots || [];
    const encounters = this.getCrimeCityEncounters();

    if (encounters.length === 0) {
      this.showEmptyLeadHint();
      return;
    }

    encounters.forEach((encounter, index) => {
      const slot = slots[index];

      if (!slot) {
        console.warn('[CrimeCityScene] Missing NPC slot for encounter.', {
          encounter,
          index,
          slots
        });
        return;
      }

      const isVisited = this.isEncounterVisited(encounter.id);
      const isExcluded = this.isSuspectExcluded(encounter.suspectId);
      const textureKey = this.getNpcTextureKey(encounter);

      const icon = this.add
        .image(slot.x, slot.y, textureKey)
        .setScale(0.45)
        .setDepth(5)
        .setAlpha(isVisited ? 0.62 : 1)
        .setTint(isVisited ? 0xb8b8b8 : isExcluded ? 0xff6666 : 0xffffff)
        .setInteractive({ useHandCursor: true });

      const label = this.add
        .text(
          slot.x,
          slot.y + 88,
          encounter.label ||
            encounter.npcName ||
            encounter.npcId ||
            'Unknown contact',
          {
            fontFamily: 'Special Elite',
            fontSize: '17px',
            color: isVisited ? '#cccccc' : '#ffffff',
            backgroundColor: '#000000aa',
            padding: {
              left: 8,
              right: 8,
              top: 4,
              bottom: 4
            }
          }
        )
        .setOrigin(0.5)
        .setDepth(6);

      if (isExcluded) {
        this.createStatusBadge(slot.x, slot.y - 56, 'Excluded', '#ff6666');
      } else if (isVisited) {
        this.createStatusBadge(slot.x, slot.y - 56, 'Questioned', '#f1e6b8');
      } else {
        this.createStatusBadge(slot.x, slot.y - 56, 'Alibi', '#8ed1fc');
      }

      icon.on('pointerover', () => {
        if (!isExcluded) {
          icon.setScale(0.5);
        }

        label.setColor('#ffe066');
      });

      icon.on('pointerout', () => {
        icon.setScale(0.45);
        label.setColor(isVisited ? '#cccccc' : '#ffffff');
      });

      icon.on('pointerdown', () => {
        if (isExcluded) {
          this.showMessage(
            `${encounter.label || 'This person'} is already excluded.\nInterrogating them again would be rude. And inefficient.`,
            2600,
            '#5d2a00'
          );
          return;
        }

        if (!this.moveToCrimeCityNode(`npc:${encounter.id}`)) {
          return;
        }

        this.closeAllUIPanels();

        this.transitionTo('LocationScene', {
          cityId: this.cityId,
          encounterId: encounter.id,
          npcId: encounter.npcId,
          suspectId: encounter.suspectId,
          locationId: encounter.locationId || 'alibi_contact',
          isRepeat: isVisited,
          isCrimeCity: true,
          returnScene: 'CrimeCityScene',
          returnData: {
            cityId: this.cityId
          }
        });
      });

      this.interactiveObjects.push(icon);
    });
  }

  getReconstructionData() {
    const rawObjectsData = this.cache.json.get('objects-data');
    const rawQuestionsData = this.cache.json.get('reconstruction_questions');

    const items = Array.isArray(rawObjectsData)
      ? rawObjectsData
      : rawObjectsData?.objects ||
        rawObjectsData?.items ||
        rawObjectsData?.hiddenObjects ||
        [];

    const questions = Array.isArray(rawQuestionsData)
      ? rawQuestionsData
      : rawQuestionsData?.reconstructionQuestions ||
        rawQuestionsData?.questions ||
        [];

    if (!Array.isArray(items) || items.length === 0) {
      console.error(
        '[CrimeCityScene] Reconstruction objects data is missing or invalid.',
        {
          cacheKey: 'objects-data',
          rawObjectsData,
          normalizedItems: items
        }
      );

      return null;
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      console.error(
        '[CrimeCityScene] Reconstruction questions data is missing or invalid.',
        {
          cacheKey: 'reconstruction-questions',
          rawQuestionsData,
          normalizedQuestions: questions
        }
      );

      return null;
    }

    return {
      items,
      questions
    };
  }

  prepareReconstruction() {
    const caseKey = this.getCaseKey();

    if (
      !gameState.reconstructedHeists ||
      typeof gameState.reconstructedHeists !== 'object'
    ) {
      gameState.reconstructedHeists = {};
    }

    const existingReconstruction = gameState.reconstructedHeists[caseKey];

    if (
      existingReconstruction &&
      Array.isArray(existingReconstruction.foundCardIds) &&
      existingReconstruction.foundCardIds.length === 6
    ) {
      gameState.reconstructedHeist = existingReconstruction;

      console.log('[CrimeCityScene] Reusing existing reconstruction.', {
        caseKey,
        sceneId: existingReconstruction.sceneId,
        foundCardIds: existingReconstruction.foundCardIds
      });

      return existingReconstruction;
    }

    const mission = gameState.currentMission;

    if (!mission?.scene) {
      console.error(
        '[CrimeCityScene] Cannot generate reconstruction: mission or mission.scene is missing.',
        { mission }
      );
      return null;
    }

    const actualThief = this.resolveActualThief();

    if (!actualThief?.id) {
      console.error(
        '[CrimeCityScene] Cannot generate reconstruction: actual thief is missing.',
        {
          mission,
          currentThief: gameState.currentThief,
          currentThiefId: gameState.currentThiefId,
          actualThiefId:
            mission.actualThiefId ||
            mission.thiefId ||
            gameState.actualThiefId,
          suspectPool: gameState.suspectPool,
          currentSuspectPool: gameState.currentSuspectPool,
          thieves: gameState.thieves
        }
      );
      return null;
    }

    const thiefSkills = Array.isArray(actualThief.skills)
      ? actualThief.skills
      : typeof actualThief.skills === 'string'
        ? actualThief.skills
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean)
        : [];

    if (thiefSkills.length < 3) {
      console.error(
        '[CrimeCityScene] Cannot generate reconstruction: thief has fewer than 3 skills.',
        {
          actualThiefId: actualThief.id,
          thiefSkills,
          actualThief
        }
      );
      return null;
    }

    const reconstructionData = this.getReconstructionData();

    if (!reconstructionData) {
      return null;
    }

    try {
      const reconstructedHeist = ReconstructionGenerator.generate({
        items: reconstructionData.items,
        questions: reconstructionData.questions,
        missionId: mission.id || caseKey,
        cityId: mission.cityId || mission.city || this.cityId,
        sceneId: mission.scene,
        thiefId: actualThief.id,
        thiefSkills,
        cardCount: 6,
        claimCount: 3
      });

      if (
        !reconstructedHeist ||
        !Array.isArray(reconstructedHeist.foundCardIds) ||
        reconstructedHeist.foundCardIds.length !== 6
      ) {
        console.error(
          '[CrimeCityScene] ReconstructionGenerator returned invalid data.',
          {
            caseKey,
            reconstructedHeist,
            itemsCount: reconstructionData.items.length,
            questionsCount: reconstructionData.questions.length
          }
        );
        return null;
      }

      gameState.reconstructedHeists[caseKey] = reconstructedHeist;
      gameState.reconstructedHeist = reconstructedHeist;

      console.log('[CrimeCityScene] Reconstruction generated.', {
        caseKey,
        sceneId: reconstructedHeist.sceneId,
        thiefId: reconstructedHeist.thiefId,
        thiefSkills: reconstructedHeist.thiefSkills,
        claims: reconstructedHeist.claims?.map((claim) => ({
          questionId: claim.questionId,
          solutionItemId: claim.solutionItemId,
          thiefSkill: claim.thiefSkill
        })),
        foundCardIds: reconstructedHeist.foundCardIds
      });

      return reconstructedHeist;
    } catch (error) {
      console.error(
        '[CrimeCityScene] ReconstructionGenerator failed.',
        {
          caseKey,
          sceneId: mission.scene,
          thiefId: actualThief.id,
          thiefSkills,
          error
        }
      );

      return null;
    }
  }

  resolveActualThief() {
    const mission = gameState.currentMission || {};

    if (gameState.currentThief?.id) {
      return gameState.currentThief;
    }

    if (mission.actualThief?.id) {
      return mission.actualThief;
    }

    const actualThiefId =
      gameState.currentThiefId ||
      mission.actualThiefId ||
      mission.thiefId ||
      gameState.actualThiefId;

    const possiblePools = [
      mission.suspectPool,
      gameState.suspectPool,
      gameState.currentSuspectPool,
      gameState.thieves,
      gameState.caseSuspects
    ];

    for (const pool of possiblePools) {
      if (!Array.isArray(pool)) {
        continue;
      }

      const thief = pool.find((suspect) => suspect?.id === actualThiefId);

      if (thief) {
        return thief;
      }
    }

    return null;
  }

  createMapIcon({
    x,
    y,
    textureKey,
    fallbackColor,
    fallbackStroke,
    label,
    completed = false,
    iconScale = 0.22,
    hoverScale = 0.25,
    onClick
  }) {
    const hasTexture = this.textures.exists(textureKey);

    const icon = hasTexture
      ? this.add.image(x, y, textureKey).setScale(iconScale)
      : this.add
          .circle(x, y, 38, fallbackColor, 0.95)
          .setStrokeStyle(3, fallbackStroke);

    icon.setDepth(5).setInteractive({ useHandCursor: true });

    const labelObject = this.add
      .text(x, y + 68, label, {
        fontFamily: 'Special Elite',
        fontSize: '18px',
        color: completed ? '#aaaaaa' : '#ffffff',
        backgroundColor: '#000000aa',
        padding: {
          left: 8,
          right: 8,
          top: 4,
          bottom: 4
        }
      })
      .setOrigin(0.5)
      .setDepth(6);

    if (completed) {
      icon.setAlpha(0.58).setTint(0xaaaaaa);
      this.createStatusBadge(x, y - 56, 'Completed', '#66bb6a');
    }

    icon.on('pointerover', () => {
      if (!completed) {
        icon.setScale(hasTexture ? hoverScale : 1.1);
      }

      labelObject.setColor(completed ? '#cccccc' : '#ffe066');
    });

    icon.on('pointerout', () => {
      if (!completed) {
        icon.setScale(hasTexture ? iconScale : 1);
      }

      labelObject.setColor(completed ? '#aaaaaa' : '#ffffff');
    });

    icon.on('pointerdown', onClick);

    this.interactiveObjects.push(icon);
  }

  createCompletedMarker(x, y, label, status) {
    const marker = this.add
      .circle(x, y, 38, 0x37474f, 0.8)
      .setStrokeStyle(3, 0x66bb6a)
      .setDepth(5);

    this.add
      .text(x, y, '✓', {
        fontFamily: 'Special Elite',
        fontSize: '34px',
        color: '#66bb6a'
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.add
      .text(x, y + 68, label, {
        fontFamily: 'Special Elite',
        fontSize: '18px',
        color: '#aaaaaa',
        backgroundColor: '#000000aa',
        padding: {
          left: 8,
          right: 8,
          top: 4,
          bottom: 4
        }
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.createStatusBadge(x, y - 56, status, '#66bb6a');
    this.interactiveObjects.push(marker);
  }

  createStatusBadge(x, y, text, color) {
    this.add
      .text(x, y, text, {
        fontFamily: 'Special Elite',
        fontSize: '13px',
        color,
        backgroundColor: '#000000cc',
        padding: {
          left: 6,
          right: 6,
          top: 3,
          bottom: 3
        }
      })
      .setOrigin(0.5)
      .setDepth(7);
  }

  showEmptyLeadHint() {
    this.add
      .text(
        this.scale.width / 2,
        this.scale.height - 90,
        'The lab has no alibi contacts yet.\nCrime Lab must create crimeCityEncounterState for this case.',
        {
          fontFamily: 'Special Elite',
          fontSize: '16px',
          color: '#f1e6b8',
          align: 'center',
          backgroundColor: '#000000aa',
          padding: {
            left: 14,
            right: 14,
            top: 10,
            bottom: 10
          }
        }
      )
      .setOrigin(0.5)
      .setDepth(30);
  }

  moveToCrimeCityNode(targetNodeId, transportType = 'taxi') {
    const caseKey = this.getCaseKey();
    const currentNodeId =
      gameState.crimeCityCurrentNodes?.[caseKey] || 'arrival';

    if (currentNodeId === targetNodeId) {
      return true;
    }

    if (!this.trySpendEnergy('travel', transportType)) {
      return false;
    }

    gameState.crimeCityCurrentNodes[caseKey] = targetNodeId;

    return true;
  }

  trySpendEnergy(category, key) {
    const energyManager = getEnergyManager();
    const baseCost = ENERGY_BASE_COSTS[category]?.[key];

    if (!Number.isFinite(baseCost)) {
      console.error('[CrimeCityScene] Unknown energy cost.', {
        category,
        key
      });
      return false;
    }

    const cost = energyManager.scaleCost(baseCost);

    if (energyManager.getCurrentEnergy() < cost) {
      this.showNoEnergyPopup();
      return false;
    }

    if (category === 'travel') {
      energyManager.consumeTravel(key);
    }

    if (category === 'activity') {
      energyManager.consumeActivity(key);
    }

    return true;
  }

  getCaseKey() {
    const mission = gameState.currentMission || {};

    return String(
      mission.id ||
      mission.caseId ||
      `${this.cityId}_${mission.artifact || 'default'}`
    );
  }

  getCrimeSceneVisitKey() {
    const mission = gameState.currentMission || {};
    const sceneId = mission.scene || 'unknown_scene';
    const missionId = mission.id;
    const missionCity = mission.city || this.cityId || 'unknown';
    const artifact = mission.artifact || gameState.currentArtifact || 'artifact';

    if (missionId) {
      return `${sceneId}_${missionId}`;
    }

    return `${sceneId}_${missionCity}_${artifact}`;
  }

  isCrimeSceneCompleted() {
    const visitKey = this.getCrimeSceneVisitKey();

    return Boolean(gameState.specialScenesCompleted?.[visitKey]);
  }

  isCrimeLabCompleted() {
    const caseKey = this.getCaseKey();

    return Boolean(gameState.crimeCityProgress?.[caseKey]?.crimeLabCompleted);
  }

  getCrimeCityEncounters() {
    const caseKey = this.getCaseKey();
    const encounters = gameState.crimeCityEncounterState?.[caseKey];

    if (!Array.isArray(encounters)) {
      return [];
    }

    return encounters.filter((encounter) => encounter?.enabled !== false);
  }

  getNpcTextureKey(encounter) {
    const candidates = [
      encounter.textureKey,
      `${encounter.npcId}_${this.cityData.npcTheme}`,
      encounter.npcId,
      'fence_w'
    ].filter(Boolean);

    return candidates.find((key) => this.textures.exists(key)) || 'fence_w';
  }

  isEncounterVisited(encounterId) {
    return (
      Array.isArray(gameState.visitedEncounters) &&
      gameState.visitedEncounters.includes(encounterId)
    );
  }

  isSuspectExcluded(suspectId) {
    if (!suspectId || !Array.isArray(gameState.excludedSuspects)) {
      return false;
    }

    return gameState.excludedSuspects.some((entry) => {
      if (typeof entry === 'string') {
        return entry === suspectId;
      }

      return entry?.id === suspectId;
    });
  }

  transitionTo(sceneKey, data) {
    this.cameras.main.fadeOut(350, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(sceneKey, data);
    });
  }

  showNoEnergyPopup() {
    this.showMessage(
      "You're too exhausted, detective.\nGet some rest before continuing the case.",
      2400,
      '#8b0000'
    );
  }

  showMessage(text, duration = 2200, color = '#37474f') {
    const popup = this.add
      .text(this.scale.width / 2, this.scale.height / 2, text, {
        fontFamily: 'Special Elite',
        fontSize: '19px',
        color: '#ffffff',
        backgroundColor: color,
        padding: {
          x: 24,
          y: 16
        },
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(200);

    this.time.delayedCall(duration, () => popup?.destroy());
  }

  closeAllUIPanels() {
    try {
      const playerHud = this.scene.manager.keys.PlayerHudScene;

      if (playerHud && playerHud.sys) {
        playerHud.closeAllUIPanels?.();
      }
    } catch (err) {
      console.warn('[CrimeCityScene] closeAllUIPanels failed:', err.message);
    }
  }

  onShutdown() {
    this.phoneCallTimer?.remove(false);
this.phoneCallTimer = null;
this.showLabCompletionPhoneCall = false;
    this.interactiveObjects.forEach((object) => {
      object?.removeAllListeners?.();
    });

    this.interactiveObjects = [];

    if (!this.cityAmbient) {
      return;
    }

    try {
      if (this.cityAmbient.isPlaying) {
        this.cityAmbient.stop();
      }

      if (!this.cityAmbient.pendingRemove) {
        this.cityAmbient.destroy();
      }
    } catch (error) {
      console.warn('[CrimeCityScene] Ambient cleanup failed.', error);
    }

    this.cityAmbient = null;
  }
}