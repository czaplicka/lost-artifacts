import { audioManager } from '../AudioManager.js';
import { OfficeSaveUI } from '../OfficeSaveUI.js';
import { gameState } from '../GameData.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { FirstCaseTutorial } from '../FirstCaseTutorial.js';
import { ensureHud } from '../hudHelpers.js';

export class OfficeScene extends BaseScene {
  constructor() {
    super('OfficeScene');

    this.currentView = 'office';
    this.viewPositions = {};
    this.hotspots = [];
    this.debugTexts = [];
    this.DEBUG_HOTSPOTS = true;

    this.saveUI = null;
    this.officeAmbient = null;
    this.debugGraphics = null;

    this.leftArrow = null;
    this.rightArrow = null;
    this.crimeLabArrow = null;
    this.navHint = null;
    this.introHint = null;

    this.uiLocked = false;
    this.isOpeningCrimeLab = false;
    this.firstCaseTutorial = null;
    this.startOnboarding = false;

    this.elevatorBackground = null;
    this.archiveBackground = null;

    this.onFirstMissionCompletedBound = this.onFirstMissionCompleted.bind(this);
  }

  init(data = {}) {
    this.gameState = data.gameState ?? gameState;
    this.fromSave = data.fromSave ?? false;
    this.saveSlotKey = data.saveSlotKey ?? null;
    this.startOnboarding = data.startOnboarding ?? false;
  }

  create() {
    super.create();
ensureHud(this);
    audioManager.init(this);
    audioManager.stopAllVoice();
    audioManager.stopAllSfx();

    EventBus.emit('showHUD');

    const { width, height } = this.scale;

    this.scene.launch('NewsHud');
    this.scene.bringToTop('NewsHud');
    this.scene.get('NewsHud').events.emit('setNewspaperVisible', true);

    this.registry.set('currentCity', 'hq');

    this.createBackgrounds(width, height);
    this.createCameraSetup(height);
    this.createHotspots();
    this.createNavigationUI();
    this.createFirstCaseTutorial();
    this.monologue.startIdle('idle.office');

    try {
      this.saveUI = new OfficeSaveUI(this, {
        locationType: 'office',
        locationCode: 'agency_headquarters',
        cityCode: 'hq',
      });

      this.saveUI.createButton();
    } catch (error) {
      console.error(
        '[OfficeScene] Failed to initialize OfficeSaveUI. ' +
        'The office will continue without save controls.',
        error,
      );

      this.saveUI = null;
    }

    this.setupAudioUnlock();
    this.createOptionalDebug();
    this.playOfficeAmbient();

    this.goToView('office', false);
    this.showIntroHint();

    this.input.keyboard.on('keydown-LEFT', this.moveLeft, this);
    this.input.keyboard.on('keydown-RIGHT', this.moveRight, this);

    EventBus.on('firstMissionCompleted', this.onFirstMissionCompletedBound);

    this.events.on(Phaser.Scenes.Events.WAKE, this.onWakeOrResume, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onWakeOrResume, this);
    this.events.on(Phaser.Scenes.Events.SLEEP, this.onSleep, this);
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
  }

  update() {
    const hud = this.getHudScene();

    const hudPanelOpen = !!(
      hud
      && hud.isAnyPanelOpen
      && hud.isAnyPanelOpen()
    );

    const savePanelOpen = !!this.saveUI?.isOpen;
    const shouldLockOffice = hudPanelOpen || savePanelOpen;

    if (shouldLockOffice && !this.uiLocked) {
      this.applyLock(true);
    } else if (!shouldLockOffice && this.uiLocked) {
      this.applyLock(false);
    }
  }

  createBackgrounds(gameWidth, gameHeight) {
  const elevatorTexture = this.hasCompletedFirstMission()
    ? 'elevator_open'
    : 'elevator_broken';

  const archiveTexture = this.hasCompletedFirstMission()
    ? 'archivist'
    : 'archive';

  const elevatorBg = this.add.image(
    -gameWidth,
    0,
    elevatorTexture,
  )
    .setOrigin(0, 0)
    .setDisplaySize(gameWidth, gameHeight);

  const storageBg = this.add.image(
    0,
    0,
    'backgroundhi',
  )
    .setOrigin(0, 0)
    .setDisplaySize(gameWidth, gameHeight);

  const officeBg = this.add.image(
    gameWidth,
    0,
    'backgroundoff',
  )
    .setOrigin(0, 0)
    .setDisplaySize(gameWidth, gameHeight);

  const cabinetBg = this.add.image(
    gameWidth * 2,
    0,
    'backgroundset',
  )
    .setOrigin(0, 0)
    .setDisplaySize(gameWidth, gameHeight);

  const archiveBg = this.add.image(
    gameWidth * 3,
    0,
    archiveTexture,
  )
    .setOrigin(0, 0)
    .setDisplaySize(gameWidth, gameHeight);

  this.elevatorBackground = elevatorBg;
  this.archiveBackground = archiveBg;

  this.rooms = {
    elevator: {
      key: 'elevator',
      bg: elevatorBg,
      x: -gameWidth,
      width: gameWidth,
    },
    storage: {
      key: 'storage',
      bg: storageBg,
      x: 0,
      width: gameWidth,
    },
    office: {
      key: 'office',
      bg: officeBg,
      x: gameWidth,
      width: gameWidth,
    },
    cabinet: {
      key: 'cabinet',
      bg: cabinetBg,
      x: gameWidth * 2,
      width: gameWidth,
    },
    archive: {
      key: 'archive',
      bg: archiveBg,
      x: gameWidth * 3,
      width: gameWidth,
    },
  };

  this.roomOrder = [
    'elevator',
    'storage',
    'office',
    'cabinet',
    'archive',
  ];

  this.totalWidth = gameWidth * 5;

  this.viewPositions = {
    elevator: this.rooms.elevator.x,
    storage: this.rooms.storage.x,
    office: this.rooms.office.x,
    cabinet: this.rooms.cabinet.x,
    archive: this.rooms.archive.x,
  };
}

  createCameraSetup(height) {
    const leftBound = this.rooms.elevator.x;

    this.cameras.main.setBounds(
      leftBound,
      0,
      this.totalWidth,
      height,
    );
  }

  createFirstCaseTutorial() {
    const shouldStartTutorial = this.startOnboarding
      && !this.gameState.onboarding?.firstCase?.completed;

    if (!shouldStartTutorial) {
      return;
    }

    this.firstCaseTutorial = new FirstCaseTutorial(
      this,
      this.gameState,
    );

    this.hotspots.forEach((zone) => {
      const hotspotId = zone.hotspotData?.id;

      if (hotspotId) {
        this.firstCaseTutorial.registerHotspot(hotspotId, zone);
      }
    });

    this.firstCaseTutorial.start();
    this.monologue.say(
    'Mark Agency. The sort of place that hires you before it tells you what the job is.',
    {
        cooldownKey: 'office.firstArrival',
        cooldownMs: 999999
    }
);
  }

  notifyTutorialOfficeReached() {
    if (
      !this.firstCaseTutorial?.isActive()
      || this.firstCaseTutorial.getStep() !== 'walk_to_case_file'
    ) {
      return;
    }

    const cabinetZone = this.hotspots.find(
      (zone) => zone.hotspotData?.id === 'cabinet-casefile',
    );

    if (!cabinetZone?.hotspotData) {
      return;
    }

    const data = cabinetZone.hotspotData;

    this.firstCaseTutorial.onPlayerPositionChanged(
      data.x + data.width / 2,
      data.y + data.height / 2,
    );
  }

  hasCompletedFirstMission() {
    return !!(
      this.gameState.firstMissionCompleted
      || this.gameState.progress?.firstMissionCompleted
      || this.gameState.story?.firstMissionCompleted
      || this.gameState.onboarding?.firstCase?.missionCompleted
    );
  }

  onFirstMissionCompleted() {
    if (!this.gameState.progress) {
      this.gameState.progress = {};
    }

    this.gameState.progress.firstMissionCompleted = true;

    this.elevatorBackground?.setTexture('elevator_open');
    this.archiveBackground?.setTexture('archivist');

    this.showOfficeStatusMessage(
      'The elevator opens. The archive gains an archivist. Both developments are suspicious.',
    );
  }

  showOfficeStatusMessage(message) {
    if (!message) {
      return;
    }

    const { width } = this.scale;

    const text = this.add.text(width / 2, 115, message, {
      fontFamily: 'Special Elite',
      fontSize: '20px',
      color: '#f2d477',
      align: 'center',
      backgroundColor: '#17110e',
      padding: {
        left: 14,
        right: 14,
        top: 10,
        bottom: 10,
      },
      wordWrap: {
        width: Math.min(width - 80, 760),
      },
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000)
      .setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: 1,
      duration: 250,
      yoyo: true,
      hold: 2600,
      ease: 'Sine.easeInOut',
      onComplete: () => text.destroy(),
    });
  }

  getHudScene() {
    if (this.scene.isActive('PlayerHudScene')) {
      return this.scene.get('PlayerHudScene');
    }

    if (this.scene.isActive('UIScene')) {
      return this.scene.get('UIScene');
    }

    return null;
  }

  createHotspots() {
    const hotspotData = [
        {
            id: 'desk',
            room: 'office',
            x: this.rooms.office.x + 300,
            y: 500,
            width: 720,
            height: 250,
            label: 'Desk',
            monologueKey: 'inspect.desk',
            action: () => this.openWarrant(),
        },
        {
            id: 'crime-board',
            room: 'office',
            x: this.rooms.office.x + 10,
            y: 10,
            width: 800,
            height: 470,
            label: 'Crime Board',
            monologueKey: 'inspect.crimeBoard',
            action: () => this.openCrimeBoard(),
        },
        {
            id: 'globe',
            room: 'storage',
            x: this.rooms.storage.x + 1065,
            y: 490,
            width: 135,
            height: 160,
            label: 'Globe',
            monologueKey: 'inspect.globe',
            action: () => this.openDestinations(),
        },
        {
            id: 'cabinet-casefile',
            room: 'storage',
            x: this.rooms.storage.x + 1525,
            y: 480,
            width: 380,
            height: 450,
            label: 'Case File Cabinet',
            monologueKey: 'inspect.caseFileCabinet',
            action: () => this.openCasefile(),
        },
        {
            id: 'book-notes',
            room: 'cabinet',
            x: this.rooms.cabinet.x + 525,
            y: 705,
            width: 190,
            height: 100,
            label: 'Book',
            monologueKey: 'inspect.notesBook',
            action: () => this.openNotes(),
        },
        {
            id: 'wanted-database',
            room: 'cabinet',
            x: this.rooms.cabinet.x + 605,
            y: 480,
            width: 130,
            height: 130,
            label: 'Wanted Database',
            monologueKey: 'inspect.wantedDatabase',
            action: () => this.openWantedDatabase(),
        },
        {
            id: 'recovered-artifacts',
            room: 'cabinet',
            x: this.rooms.cabinet.x + 820,
            y: 150,
            width: 785,
            height: 725,
            label: 'Recovered Artifacts',
            monologueKey: 'inspect.recoveredArtifacts',
            action: () => this.openRecoveredArtifacts(),
        },
        {
            id: 'atlas',
            room: 'cabinet',
            x: this.rooms.cabinet.x + 280,
            y: 270,
            width: 325,
            height: 270,
            label: 'Atlas',
            monologueKey: 'inspect.atlas',
            action: () => this.openAtlas(),
        },
        {
            id: 'brokenElevator',
            room: 'elevator',
            x: this.rooms.elevator.x + 660,
            y: 200,
            width: 590,
            height: 700,
            label: 'Broken Elevator',
            monologueKey: 'inspect.brokenElevator',
        },
    ];

    hotspotData.forEach((data) => {
        const zone = this.add.zone(
            data.x,
            data.y,
            data.width,
            data.height,
        )
            .setOrigin(0, 0)
            .setDepth(50)
            .setName(`hotspot-${data.id}`)
            .setInteractive({
                useHandCursor: true,
                cursor: 'pointer',
            });

        zone.hotspotData = data;

        zone.on('pointerover', () => {
            if (this.uiLocked) {
                return;
            }

            this.onHotspotOver(data);
        });

        zone.on('pointerout', () => {
            this.onHotspotOut();
        });

        zone.on('pointerdown', () => {
            console.log('[OfficeScene] Hotspot clicked:', {
                id: data.id,
                room: data.room,
                currentView: this.currentView,
                uiLocked: this.uiLocked,
                zoneInputEnabled: zone.input?.enabled,
            });

            if (this.uiLocked) {
                console.warn(
                    `[OfficeScene] Hotspot "${data.id}" blocked because uiLocked is true.`,
                );
                return;
            }

            const tutorialAllowsInteraction =
                this.firstCaseTutorial?.canUseHotspot(data.id);

            if (tutorialAllowsInteraction === false) {
                console.warn(
                    `[OfficeScene] Hotspot "${data.id}" blocked by tutorial.`,
                );
                return;
            }

            audioManager.playSfx('click_sound');

            try {
                data.action();
            } catch (error) {
                console.error(
                    `[OfficeScene] Failed to execute hotspot "${data.id}".`,
                    error,
                );
            }
        });

        this.hotspots.push(zone);
    });

    console.log(
        '[OfficeScene] Hotspots created:',
        this.hotspots.map((zone) => zone.hotspotData.id),
    );
}

  applyLock(locked) {
    this.uiLocked = locked;

    this.hotspots.forEach((zone) => {
      if (!zone?.scene) {
        return;
      }

      if (locked) {
        zone.disableInteractive();
      } else {
        zone.setInteractive({ useHandCursor: true });
      }
    });

    [this.leftArrow, this.rightArrow].forEach((arrow) => {
      if (!arrow) {
        return;
      }

      if (locked) {
        arrow.disableInteractive();
        arrow.setAlpha(0.35);
      } else {
        arrow.setInteractive({ useHandCursor: true });
        arrow.setAlpha(0.75);
      }
    });

    this.saveUI?.setLocked(locked);

    if (locked) {
      this.hideNavHint();
    } else {
      this.updateNavVisibility();
    }
  }

  createNavigationUI() {
  const { width, height } = this.scale;

  const createArrowButton = (x, direction) => {
    const buttonWidth = 78;
    const buttonHeight = 96;
    const isLeft = direction === 'left';

    const graphics = this.add.graphics();

    graphics.fillStyle(0x120f0b, 0.78);
    graphics.fillRoundedRect(
      -buttonWidth / 2,
      -buttonHeight / 2,
      buttonWidth,
      buttonHeight,
      12,
    );

    graphics.lineStyle(3, 0xf0e6b8, 0.95);
    graphics.strokeRoundedRect(
      -buttonWidth / 2,
      -buttonHeight / 2,
      buttonWidth,
      buttonHeight,
      12,
    );

    graphics.fillStyle(0xf0e6b8, 1);

    if (isLeft) {
      graphics.fillTriangle(
        15,
        -25,
        15,
        25,
        -22,
        0,
      );
    } else {
      graphics.fillTriangle(
        -15,
        -25,
        -15,
        25,
        22,
        0,
      );
    }

    const button = this.add.container(x, height / 2, [graphics])
      .setName(`office-navigation-${direction}`)
      .setSize(buttonWidth, buttonHeight)
      .setDepth(10000)
      .setScrollFactor(0)
      .setAlpha(0.95)
      .setInteractive({
        useHandCursor: true,
        cursor: 'pointer',
      });

    button.buttonGraphics = graphics;

    return button;
  };

  this.leftArrow = createArrowButton(54, 'left');

  this.rightArrow = createArrowButton(
    width - 54,
    'right',
  );

  this.navHint = this.add.text(width / 2, 84, '', {
    fontFamily: 'Special Elite',
    fontSize: '20px',
    color: '#f0e6b8',
    backgroundColor: '#000000',
    padding: {
      left: 10,
      right: 10,
      top: 8,
      bottom: 8,
    },
  })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(10001)
    .setVisible(false);

  this.introHint = this.add.text(
    width / 2,
    40,
    'Explore the office — move left or right',
    {
      fontFamily: 'Special Elite',
      fontSize: '18px',
      color: '#fff4c7',
      backgroundColor: '#000000',
      padding: {
        left: 12,
        right: 12,
        top: 8,
        bottom: 8,
      },
    },
  )
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(10001)
    .setAlpha(0);

  this.leftArrow
    .on('pointerdown', () => {
      this.moveLeft();
    })
    .on('pointerover', () => {
      if (this.uiLocked) {
        return;
      }

      this.leftArrow.setScale(1.1);
      this.leftArrow.setAlpha(1);
      this.showNavHint(this.getLeftRoomLabel());
    })
    .on('pointerout', () => {
      this.leftArrow.setScale(1);

      if (!this.uiLocked) {
        this.leftArrow.setAlpha(0.95);
      }

      this.hideNavHint();
    });

  this.rightArrow
    .on('pointerdown', () => {
      this.moveRight();
    })
    .on('pointerover', () => {
      if (this.uiLocked) {
        return;
      }

      this.rightArrow.setScale(1.1);
      this.rightArrow.setAlpha(1);
      this.showNavHint(this.getRightRoomLabel());
    })
    .on('pointerout', () => {
      this.rightArrow.setScale(1);

      if (!this.uiLocked) {
        this.rightArrow.setAlpha(0.95);
      }

      this.hideNavHint();
    });

  this.tweens.add({
    targets: [this.leftArrow, this.rightArrow],
    alpha: {
      from: 0.72,
      to: 1,
    },
    duration: 850,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  this.updateNavVisibility();

  console.log('[OfficeScene] Navigation created:', {
    currentView: this.currentView,
    currentIndex: this.roomOrder.indexOf(this.currentView),
    leftVisible: this.leftArrow.visible,
    rightVisible: this.rightArrow.visible,
  });
}

  moveLeft() {
    if (this.uiLocked) {
      return;
    }

    const currentIndex = this.roomOrder.indexOf(this.currentView);

    if (currentIndex <= 0) {
      return;
    }

    this.goToView(this.roomOrder[currentIndex - 1]);
  }

  moveRight() {
    if (this.uiLocked) {
      return;
    }

    const currentIndex = this.roomOrder.indexOf(this.currentView);

    if (currentIndex === -1 || currentIndex >= this.roomOrder.length - 1) {
      return;
    }

    this.goToView(this.roomOrder[currentIndex + 1]);
  }

  goToView(viewName, animate = true) {
    const targetX = this.viewPositions[viewName];

    if (targetX === undefined) {
      return;
    }

    this.currentView = viewName;
    this.updateNavVisibility();
    this.hideNavHint();

    const finishViewChange = () => {
      if (viewName === 'office') {
        this.notifyTutorialOfficeReached();
      }
    };

    if (!animate) {
      this.cameras.main.scrollX = targetX;
      finishViewChange();
      return;
    }

    this.tweens.add({
      targets: this.cameras.main,
      scrollX: targetX,
      duration: 550,
      ease: 'Sine.easeInOut',
      onComplete: finishViewChange,
    });
  }

  updateNavVisibility() {
    const currentIndex = this.roomOrder.indexOf(this.currentView);

    if (this.leftArrow) {
      this.leftArrow.setVisible(currentIndex > 0);
    }

    if (this.rightArrow) {
      this.rightArrow.setVisible(
        currentIndex >= 0
        && currentIndex < this.roomOrder.length - 1,
      );
    }
  }

  getLeftRoomLabel() {
    const currentIndex = this.roomOrder.indexOf(this.currentView);

    if (currentIndex <= 0) {
      return '';
    }

    return `Go to ${this.getRoomLabel(this.roomOrder[currentIndex - 1])}`;
  }

  getRightRoomLabel() {
    const currentIndex = this.roomOrder.indexOf(this.currentView);

    if (
      currentIndex === -1
      || currentIndex >= this.roomOrder.length - 1
    ) {
      return '';
    }

    return `Go to ${this.getRoomLabel(this.roomOrder[currentIndex + 1])}`;
  }

  getRoomLabel(roomKey) {
    const labels = {
      elevator: 'elevator',
      storage: 'storage',
      office: 'main office',
      cabinet: 'records room',
      archive: 'archive',
    };

    return labels[roomKey] ?? roomKey;
  }

  showIntroHint() {
    if (!this.introHint) {
      return;
    }

    this.tweens.add({
      targets: this.introHint,
      alpha: 1,
      duration: 350,
      ease: 'Power2',
    });

    this.time.delayedCall(2800, () => {
      if (!this.introHint) {
        return;
      }

      this.tweens.add({
        targets: this.introHint,
        alpha: 0,
        duration: 500,
        ease: 'Power2',
      });
    });
  }

  showNavHint(text) {
    if (!text || !this.navHint) {
      return;
    }

    this.navHint.setText(text);
    this.navHint.setVisible(true);
  }

  hideNavHint() {
    if (!this.navHint) {
      return;
    }

    this.navHint.setVisible(false);
  }

onHotspotOver(data) {
  if (!data || this.uiLocked) {
    return;
  }

  if (data.label) {
    this.showNavHint(data.label);
  }

  if (data.monologueKey) {
    this.monologue.sayRandom(data.monologueKey, {
      cooldownKey: `hotspot-hover:${data.id}`,
      cooldownMs: 2500,
      queue: false
    });
  }
}

  onHotspotOut() {
    this.hideNavHint();
  }

  setupAudioUnlock() {
    this.input.once('pointerdown', () => {
      if (this.sound?.context?.state === 'suspended') {
        this.sound.context.resume();
      }

      this.playOfficeAmbient();
    });
  }

  playOfficeAmbient() {
    if (this.officeAmbient?.isPlaying) {
      return this.officeAmbient;
    }

    this.officeAmbient = audioManager.playAmbient(
      'officescenesound',
      { loop: true },
    );

    return this.officeAmbient;
  }

  openCrimeLabHotkey() {
    this.openCrimeLab();
  }

  openCrimeLab() {
    if (this.uiLocked || this.isOpeningCrimeLab) {
      return;
    }

    this.isOpeningCrimeLab = true;
    this.hideNavHint();

    audioManager.playSfx('click_sound');

    this.scene.pause();
    this.scene.launch('CrimeLabScene', {
      gameState: this.gameState,
    });
  }

  openRecoveredArtifacts() {
    this.scene.pause();
    this.scene.launch('RecoveredArtifactsScene', {
      gameState: this.gameState,
    });
  }

  openWantedDatabase() {
    this.scene.pause();
    this.scene.launch('WantedDatabaseScene', {
      gameState: this.gameState,
    });
  }

  openCasefile() {
  const hud = this.getHudScene();

  console.log('[OfficeScene] Opening Case File', {
    hudFound: !!hud,
    hudSceneKey: hud?.scene?.key,
    caseFileUIFound: !!hud?.caseFileUI,
    mission: this.gameState.currentMission,
  });

  if (!hud) {
    console.error(
      '[OfficeScene] Cannot open Case File: PlayerHudScene / UIScene is not active.',
    );
    return;
  }

  if (!hud.caseFileUI) {
    console.error(
      '[OfficeScene] Cannot open Case File: caseFileUI was not created in the HUD scene.',
    );
    return;
  }

  this.closeAllUIPanels();

  const mission = this.gameState.currentMission || {};

  hud.caseFileUI.open({
    artifact: mission.artifact || 'UNKNOWN ARTIFACT',
    city: mission.city || 'UNKNOWN CITY',
    country: mission.country || 'UNKNOWN COUNTRY',
    description: mission.description || 'No case description available.',
    significance: mission.significance || '',
    clue: mission.clue || '',
    artifactKey: mission.artifactKey || '',
  });

  this.firstCaseTutorial?.onCaseFileOpened();
}

  openNotes() {
    const hud = this.getHudScene();

    if (!hud?.notesUI) {
      console.warn('[OfficeScene] notesUI not found in HUD scene');
      return;
    }

    this.closeAllUIPanels();
    hud.notesUI.open(this.gameState);
  }

  openDestinations() {
    const hud = this.getHudScene();

    if (!hud?.destinationsUI) {
      console.warn('[OfficeScene] destinationsUI not found in HUD scene');
      return;
    }

    this.closeAllUIPanels();
    hud.destinationsUI.open(this.gameState);

    this.firstCaseTutorial?.onDestinationMapOpened();
  }

  openWarrant() {
    const hud = this.getHudScene();

    if (!hud?.warrantUI) {
      console.warn('[OfficeScene] warrantUI not found in HUD scene');
      return;
    }

    this.closeAllUIPanels();
    hud.warrantUI.open(this.gameState);
  }

  openCrimeBoard() {
    const hud = this.getHudScene();

    if (!hud?.crimeBoardUI) {
      console.warn('[OfficeScene] crimeBoardUI not found in HUD scene');
      return;
    }

    this.closeAllUIPanels();
    hud.crimeBoardUI.open(this.gameState);
  }

  openAtlas() {
    const hud = this.getHudScene();

    if (!hud?.atlasUI) {
      console.warn('[OfficeScene] atlasUI not found in HUD scene');
      return;
    }

    this.closeAllUIPanels();

    const mission = this.gameState.currentMission || {};

    hud.atlasUI.open({
      country: mission.country || '',
      city: mission.city || '',
      artifact: mission.artifact || '',
      gameState: this.gameState,
    });
  }

  closeAllUIPanels() {
    const hud = this.getHudScene();

    if (hud?.closeAllUIPanels) {
      hud.closeAllUIPanels();
    }
  }

  createOptionalDebug() {
    if (!this.DEBUG_HOTSPOTS) {
      return;
    }

    this.debugGraphics = this.add.graphics();
    this.debugGraphics.lineStyle(2, 0x00ffcc, 0.95);

    this.hotspots.forEach((zone) => {
      const data = zone.hotspotData;

      this.debugGraphics.strokeRect(
        data.x,
        data.y,
        data.width,
        data.height,
      );

      const label = this.add.text(
        data.x + 8,
        data.y + 8,
        data.id,
        {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#00ffcc',
          backgroundColor: '#000000',
          padding: { left: 4, right: 4, top: 2, bottom: 2 },
        },
      ).setDepth(999);

      this.debugTexts.push(label);
    });
  }

  onWakeOrResume() {
    this.isOpeningCrimeLab = false;
    this.applyLock(false);
    this.updateNavVisibility();

    if (!this.officeAmbient?.isPlaying) {
      this.playOfficeAmbient();
    }
  }

  onSleep() {
    this.hideNavHint();

    if (this.officeAmbient?.isPlaying) {
      this.officeAmbient.pause();
    }
  }

  cleanupScene() {
    EventBus.off('firstMissionCompleted', this.onFirstMissionCompletedBound);

    this.saveUI?.destroy();
    this.saveUI = null;

    this.firstCaseTutorial?.destroy();
    this.firstCaseTutorial = null;

    this.input.keyboard?.off('keydown-LEFT', this.moveLeft, this);
    this.input.keyboard?.off('keydown-RIGHT', this.moveRight, this);
    this.input.keyboard?.off('keydown-L', this.openCrimeLabHotkey, this);

    this.events.off(Phaser.Scenes.Events.WAKE, this.onWakeOrResume, this);
    this.events.off(Phaser.Scenes.Events.RESUME, this.onWakeOrResume, this);
    this.events.off(Phaser.Scenes.Events.SLEEP, this.onSleep, this);
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);

    this.hotspots.forEach((zone) => {
      zone?.removeAllListeners();
      zone?.destroy();
    });

    this.hotspots = [];

    this.debugGraphics?.destroy();
    this.debugGraphics = null;

    this.debugTexts.forEach((text) => text?.destroy());
    this.debugTexts = [];

    [
      this.leftArrow,
      this.rightArrow,
      this.navHint,
      this.introHint,
    ].forEach((element) => {
      element?.removeAllListeners();
      element?.destroy();
    });

    this.leftArrow = null;
    this.rightArrow = null;
    this.navHint = null;
    this.introHint = null;

    if (this.officeAmbient) {
      if (this.officeAmbient.isPlaying) {
        this.officeAmbient.stop();
      }

      this.officeAmbient.destroy();
      this.officeAmbient = null;
    }
  }
}