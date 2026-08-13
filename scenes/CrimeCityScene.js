import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { getEnergyManager } from '../EnergyManager.js';
import { audioManager } from '../AudioManager.js';
import { ReconstructionGenerator } from '../ReconstructionGenerator.js';
import { EventBus } from '../EventBus.js';

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
  }

  init(data = {}) {
    const requestedCity =
      data.cityId ||
      gameState.crimeCityId ||
      gameState.currentMission?.city ||
      'paris';

    this.cityId = this.normalizeCityId(requestedCity);
    this.interactiveObjects = [];
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
    this.scene.get('NewsHud').events.emit('setNewspaperVisible', true);
    this.scene.get('NewsHud').events.emit('setTvVisible', false);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);

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
        cityData: this.cityData
      });

      this.scene.start('MenuScene');
      return;
    }

    this.crimeCityConfig = this.cityData.crimeCity;

    gameState.currentCityId = this.cityId;
    gameState.currentCity = this.cityData.city;

    if (
      !gameState.crimeCityCurrentNodes ||
      typeof gameState.crimeCityCurrentNodes !== 'object'
    ) {
      gameState.crimeCityCurrentNodes = {};
    }

    if (!gameState.crimeCityCurrentNodes[this.getCaseKey()]) {
      gameState.crimeCityCurrentNodes[this.getCaseKey()] = 'arrival';
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
this.createSuspectsIcon();
this.createCrimeSceneIcon();
this.createLabIcon();
this.createNpcSpots();

    this.scene.wake('UIScene');

    const hud = this.scene.get('PlayerHudScene');
    hud?.closeAllUIPanels?.();
    hud?.refreshNotebook?.();
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
        ? `Case: ${artifact} — inspect the crime scene.`
        : 'Start with the crime scene. The pigeons are not witnesses.';
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
createSuspectsIcon() {
  /*
   * Recommended:
   * Add suspectBoard coordinates to locations.json for every crime city.
   *
   * crimeCity: {
   *   suspectBoard: { x: 1760, y: 850 }
   * }
   *
   * The fallback lets the icon work immediately even before JSON is updated.
   */
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

    /*
     * This icon is always available.
     * It is not locked by Hidden Objects, Hypothesis or Crime Lab.
     */
    completed: false,

    onClick: () => {
      if (!Array.isArray(gameState.caseSuspects) || !gameState.caseSuspects.length) {
        this.showMessage(
          'The police database has not received the suspect files yet.\nThis is either bureaucratic delay or a pigeon conspiracy.',
          3000,
          '#5d2a00'
        );

        return;
      }

      this.closeAllUIPanels();

      this.transitionTo('SuspectBoardScene', {
        cityId: this.cityId,

        /*
         * Returning from the board must return to the same city map.
         */
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
      return;
    }

    if (this.isCrimeSceneCompleted()) {
      this.createCompletedMarker(
        position.x,
        position.y,
        'Crime Scene',
        'Investigated'
      );
      return;
    }

    this.createMapIcon({
      x: position.x,
      y: position.y,
      textureKey: 'search',
      fallbackColor: 0xd4af37,
      fallbackStroke: 0xfff1a8,
      label: 'Crime Scene',
      onClick: () => this.openCrimeScene()
    });
  }

  openCrimeScene() {
  const mission = gameState.currentMission;

  if (!mission?.scene) {
    this.showMessage(
      'This case has no crime-scene data yet.\nEven the chalk outline is confused.',
      2600,
      '#5d2a00'
    );
    return;
  }

  /*
   * Generator musi odpalić PRZED HiddenObjectsScene.
   * Dzięki temu foundCardIds istnieje, gdy scena HOG wykonuje create().
   */
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

  if (foundCardIds.length !== 6) {
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
    claims: reconstruction.claims?.map(claim => ({
      questionId: claim.questionId,
      solutionItemId: claim.solutionItemId,
      thiefSkill: claim.thiefSkill
    })),
    foundCardIds: reconstruction.foundCardIds
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
    returnData: { cityId: this.cityId },
    cityId: this.cityId,
    sourceScene: 'CrimeCityScene',
    mission
  });
}

  createLabIcon() {
    const position = this.crimeCityConfig.crimeLab;

    if (!position) {
      return;
    }

    if (!this.isCrimeSceneCompleted()) {
      this.createLockedIcon(
        position.x,
        position.y,
        'Crime Lab',
        'Search the crime scene first.'
      );
      return;
    }

    const completed = this.isCrimeLabCompleted();

    this.createMapIcon({
      x: position.x,
      y: position.y,
      textureKey: 'lab_icon',
      fallbackColor: 0x1565c0,
      fallbackStroke: 0x7fc8f8,
      label: completed ? 'Crime Lab — Analyzed' : 'Crime Lab',
      completed,
      onClick: () => {
        if (completed) {
          this.showMessage(
            'The lab report is complete.\nThe microscopes demand a coffee break.',
            2400,
            '#37474f'
          );
          return;
        }

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
          returnData: { cityId: this.cityId },
          sourceScene: 'CrimeCityScene'
        });
      }
    });
  }

  createNpcSpots() {
    const slots = this.crimeCityConfig.suspectSlots || [];

    if (!this.isCrimeLabCompleted()) {
      slots.forEach((slot) => {
        this.createLockedIcon(
          slot.x,
          slot.y,
          'Alibi lead',
          'Analyze the evidence in the Crime Lab first.'
        );
      });

      return;
    }

    const encounters = this.getCrimeCityEncounters();

    if (encounters.length === 0) {
      this.showEmptyLeadHint();
      return;
    }

    encounters.forEach((encounter, index) => {
      const slot = slots[index];

      if (!slot) {
        return;
      }

      const isVisited = this.isEncounterVisited(encounter.id);
      const isExcluded = this.isSuspectExcluded(encounter.suspectId);

      const icon = this.add
        .image(slot.x, slot.y, this.getNpcTextureKey(encounter))
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
            padding: { left: 8, right: 8, top: 4, bottom: 4 }
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
          returnData: { cityId: this.cityId }
        });
      });

      this.interactiveObjects.push(icon);
    });
  }

  prepareReconstruction() {
  const caseKey = this.getCaseKey();

  if (!gameState.reconstructedHeists) {
    gameState.reconstructedHeists = {};
  }

  const existingReconstruction = gameState.reconstructedHeists[caseKey];

  if (existingReconstruction?.foundCardIds?.length === 6) {
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
        actualThiefId: mission.actualThiefId || mission.thiefId || gameState.actualThiefId,
        suspectPool: gameState.suspectPool,
        currentSuspectPool: gameState.currentSuspectPool,
        thieves: gameState.thieves
      }
    );

    return null;
  }

  const thiefSkills = Array.isArray(actualThief.skills)
    ? actualThief.skills
    : [];

  if (thiefSkills.length < 3) {
    console.error(
      '[CrimeCityScene] Cannot generate reconstruction: thief has fewer than 3 skills.',
      {
        actualThiefId: actualThief.id,
        thiefSkills
      }
    );

    return null;
  }

  const objectsData = this.cache.json.get('objects-data');
  const questionsData = this.cache.json.get('reconstruction-questions');

  if (!objectsData || !questionsData) {
    console.error(
      '[CrimeCityScene] Cannot generate reconstruction: required JSON data is missing.',
      {
        hasObjectsData: Boolean(objectsData),
        hasQuestionsData: Boolean(questionsData)
      }
    );

    return null;
  }

  try {
    const reconstructedHeist = ReconstructionGenerator.generate({
      items: objectsData,
      questions: questionsData,
      missionId: mission.id || caseKey,
      cityId: mission.cityId || mission.city || this.cityId,
      sceneId: mission.scene,
      thiefId: actualThief.id,
      thiefSkills,
      cardCount: 6,
      claimCount: 3
    });

    gameState.reconstructedHeists[caseKey] = reconstructedHeist;
    gameState.reconstructedHeist = reconstructedHeist;

    console.log('[CrimeCityScene] Reconstruction generated.', {
      caseKey,
      sceneId: reconstructedHeist.sceneId,
      thiefId: reconstructedHeist.thiefId,
      thiefSkills: reconstructedHeist.thiefSkills,
      claims: reconstructedHeist.claims.map(claim => ({
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

    if (mission.actualThief?.id) {
      return mission.actualThief;
    }

    if (gameState.actualThief?.id) {
      return gameState.actualThief;
    }

    const actualThiefId =
      mission.actualThiefId ||
      mission.thiefId ||
      gameState.actualThiefId;

    const possiblePools = [
      mission.suspectPool,
      gameState.suspectPool,
      gameState.currentSuspectPool,
      gameState.thieves
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
    onClick
  }) {
    const hasTexture = this.textures.exists(textureKey);

    const icon = hasTexture
      ? this.add.image(x, y, textureKey).setScale(0.22)
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
        padding: { left: 8, right: 8, top: 4, bottom: 4 }
      })
      .setOrigin(0.5)
      .setDepth(6);

    if (completed) {
      icon.setAlpha(0.58).setTint(0xaaaaaa);
      this.createStatusBadge(x, y - 56, 'Completed', '#66bb6a');
    }

    icon.on('pointerover', () => {
      if (!completed) {
        icon.setScale(hasTexture ? 0.25 : 1.1);
      }

      labelObject.setColor(completed ? '#cccccc' : '#ffe066');
    });

    icon.on('pointerout', () => {
      if (!completed) {
        icon.setScale(hasTexture ? 0.22 : 1);
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
        padding: { left: 8, right: 8, top: 4, bottom: 4 }
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.createStatusBadge(x, y - 56, status, '#66bb6a');

    this.interactiveObjects.push(marker);
  }

  createLockedIcon(x, y, label, message) {
    const icon = this.add
      .circle(x, y, 38, 0x222222, 0.72)
      .setStrokeStyle(2, 0x555555)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, '🔒', { fontSize: '24px' })
      .setOrigin(0.5)
      .setDepth(6);

    this.add
      .text(x, y + 68, label, {
        fontFamily: 'Special Elite',
        fontSize: '17px',
        color: '#777777',
        backgroundColor: '#000000aa',
        padding: { left: 8, right: 8, top: 4, bottom: 4 }
      })
      .setOrigin(0.5)
      .setDepth(6);

    icon.on('pointerdown', () => this.showMessage(message, 2200, '#37474f'));

    this.interactiveObjects.push(icon);
  }

  createStatusBadge(x, y, text, color) {
    this.add
      .text(x, y, text, {
        fontFamily: 'Special Elite',
        fontSize: '13px',
        color,
        backgroundColor: '#000000cc',
        padding: { left: 6, right: 6, top: 3, bottom: 3 }
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
          padding: { left: 14, right: 14, top: 10, bottom: 10 }
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
        padding: { x: 24, y: 16 },
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(200);

    this.time.delayedCall(duration, () => popup?.destroy());
  }

  closeAllUIPanels() {
    this.scene.get('PlayerHudScene')?.closeAllUIPanels?.();
  }

  onShutdown() {
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