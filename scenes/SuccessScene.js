import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import {
  requestAutosave,
  flushAutosave
} from '../gameStatePersistence.js';
import { ScoreManager } from '../managers/ScoreManager.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';
import {
  checkAndAwardAchievements
} from '../managers/AchievementManager.js';
import {
  applyReputationEvent
} from '../managers/ReputationManager.js';
import {
  ensureMissionReport,
  moveStateToHeadquarters
} from '../archiveReportService.js';

const WIDTH = 1920;
const HEIGHT = 1080;
const CORRECT_ARREST_BONUS = 500;

const MISSION_LABEL = 'MISSION COMPLETE';
const JUSTICE_LABEL = 'JUSTICE SERVED.';

const ASSETS = [
  ['Success__background', 'background'],
  ['banner', 'banner'],
  ['medalion_officer', 'medalion_officer'],
  ['medalion', 'medalion'],
  ['money_bag_left', 'money_bag_left'],
  ['money_bag_right', 'money_bag_right'],
  ['Success__police_car', 'police_car'],
  ['police_left', 'police_left'],
  ['police_right', 'police_right'],
  ['police_right02', 'police_right02'],
  ['suspect', 'suspect'],
  ['treasures', 'treasures'],
  ['Success__wall', 'wall']
];

const isValidId = value => (
  (typeof value === 'string' && value.trim().length > 0) ||
  (typeof value === 'number' && Number.isFinite(value))
);

const isPlainObject = value => (
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value)
);

export class SuccessScene extends BaseScene {
  constructor() {
    super({ key: 'SuccessScene' });
  }

  init(data = {}) {
    this.caseId = isValidId(data.caseId)
      ? String(data.caseId)
      : null;

    this.isLeaving = false;
    this.introComplete = false;
    this.soundPlayed = false;
    this.statusText = null;
    this.nextBtn = null;

    this.layers = {};
    this.introTimers = [];
    this.introTweens = [];
    this.activeSparkles = new Set();
  }

  preload() {
    for (const [key, filename] of ASSETS) {
      if (!this.textures.exists(key)) {
        this.load.image(
          key,
          `assets/Success/${filename}.webp`
        );
      }
    }
  }

  create() {
    super.create();

    this.hideGameplayInterface();

    audioManager.init(this);
    audioManager.stopAllMusic();
    audioManager.stopAllAmbient();
    audioManager.stopAllVoice();
    audioManager.stopAllSfx();

    this.scoreManager = new ScoreManager();

    this.registerSuccessRewards();
    this.registerCaseSuccess();
    this.registerFirstMissionSuccess();
    this.unlockOfficeAfterFirstMission();

    const currentCaseId = this.getCurrentCaseId();

    if (currentCaseId !== null) {
      gameState.currentCaseId = currentCaseId;
    }

    const report = ensureMissionReport();

    if (!gameState.scoreSaved) {
      this.scoreManager.saveScore(
        gameState.playerName || gameState.agentName || 'Agent',
        Number.isFinite(gameState.score) ? gameState.score : 0
      );

      gameState.scoreSaved = true;
    }

    requestAutosave();
    flushAutosave();

    this.scene.manager.keys.PlayerHudScene?.refreshUI?.();

    this.cameras.main.setBackgroundColor('#101216');

    this.stage = this.add.container(0, 0);

    this.buildStreet();
    this.buildMedallion();
    this.buildBanner();
    this.buildResults(report);

    this.skipHint = this.add.text(
      960,
      1017,
      'CLICK TO SKIP INTRO',
      {
        fontFamily: 'SpecialElite',
        fontSize: '20px',
        color: '#e4d0a6',
        stroke: '#171819',
        strokeThickness: 4
      }
    ).setOrigin(0.5);

    this.stage.add(this.skipHint);
    this.layoutStage();

    this.onSuccessResize = () => this.layoutStage();

    this.onSkipIntro = () => {
      if (!this.introComplete) {
        this.finishIntro();
      }
    };

    this.scale.on('resize', this.onSuccessResize);
    this.input.on('pointerdown', this.onSkipIntro);

    this.startSiren();
    this.playIntro();

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      () => this.cleanupSuccessScene()
    );
  }

  hideGameplayInterface() {
    EventBus.emit('hideHUD');

    const hud = this.scene.manager.keys.PlayerHudScene;

    hud?.closeAllUIPanels?.();
    hud?.hideHud?.();

    const newsHud = this.scene.manager.keys.NewsHud;

    newsHud?.events?.emit('setButtonsVisible', false);
    newsHud?.events?.emit('setNewspaperVisible', false);
    newsHud?.events?.emit('setTvVisible', false);

    if (this.scene.manager.keys.UIScene) {
      this.scene.sleep('UIScene');
    }
  }

  layoutStage() {
    if (!this.stage) return;

    const width = this.scale.width;
    const height = this.scale.height;

    const scale = Math.min(
      width / WIDTH,
      height / HEIGHT
    );

    this.stage
      .setScale(scale)
      .setPosition(
        (width - WIDTH * scale) / 2,
        (height - HEIGHT * scale) / 2
      );
  }

  addLayer(key, parent = this.stage, x = 0, y = 0) {
    if (!this.textures.exists(key)) {
      console.error(`[SuccessScene] Missing texture: ${key}`);
      return null;
    }

    const image = this.add.image(x, y, key)
      .setOrigin(0, 0)
      .setDisplaySize(WIDTH, HEIGHT);

    parent.add(image);
    this.layers[key] = image;

    return image;
  }

  buildStreet() {
    this.addLayer('Success__background');
    this.addLayer('Success__wall');

    this.addLayer('treasures');
    this.addLayer('money_bag_left');
    this.addLayer('money_bag_right');

    this.addLayer('Success__police_car');

    this.redGlow = this.createGlow(
      1630, 714, 140, 0xff4040
    );

    this.blueGlow = this.createGlow(
      1695, 721, 140, 0x439bff
    );

    this.stage.add([
      this.redGlow,
      this.blueGlow
    ]);

    this.redBulb = this.add.ellipse(
      1630, 712, 43, 17, 0xff6654, 0
    );

    this.blueBulb = this.add.ellipse(
      1695, 721, 48, 17, 0x82d8ff, 0
    );

    this.stage.add([
      this.redBulb,
      this.blueBulb
    ]);

    this.addLayer('suspect');
    this.addLayer('police_left');
    this.addLayer('police_right');
    this.addLayer('police_right02');

    this.streetShade = this.add.rectangle(
      960, 540, 1810, 980, 0x080d19, 0.65
    );

    this.stage.add(this.streetShade);
  }

  createGlow(x, y, radius, color) {
    const glow = this.add.graphics();

    for (let i = 10; i >= 1; i -= 1) {
      glow.fillStyle(color, 0.018);
      glow.fillCircle(x, y, radius * i / 10);
    }

    return glow.setAlpha(0);
  }

  buildMedallion() {
    this.medallionGroup = this.add.container(
      960,
      440 - 700
    ).setAlpha(0);

    this.stage.add(this.medallionGroup);

    const disc = this.add.ellipse(
      7, -2, 555, 555, 0x30302e, 1
    );

    this.medallionGroup.add(disc);

    this.addLayer(
      'medalion',
      this.medallionGroup,
      -960,
      -440
    );

    this.addLayer(
      'medalion_officer',
      this.medallionGroup,
      -960,
      -440
    );

    this.justiceGroup = this.add.container(0, 170)
      .setAlpha(0)
      .setScale(1.35);

    this.medallionGroup.add(this.justiceGroup);

    const justiceStyle = {
      fontFamily: 'SpecialElite',
      fontSize: '86px',
      color: '#e5e5d9',
      stroke: '#111419',
      strokeThickness: 10,
      align: 'center',
      padding: {
        x: 18,
        y: 14
      }
    };

    this.justiceText = this.add.text(
      0,
      0,
      JUSTICE_LABEL,
      justiceStyle
    ).setOrigin(0.5);

    this.justiceText.setShadow(
      5, 7, '#080b10', 0, true, true
    );

    this.justiceBaseScale = Math.min(
      1,
      850 / this.justiceText.width
    );

    this.justiceText.setScale(this.justiceBaseScale);

    this.justiceFlash = this.add.text(
      0,
      0,
      JUSTICE_LABEL,
      {
        ...justiceStyle,
        color: '#ffffff',
        stroke: '#ffffff'
      }
    )
      .setOrigin(0.5)
      .setScale(this.justiceBaseScale)
      .setAlpha(0);

    this.justiceGroup.add([
      this.justiceText,
      this.justiceFlash
    ]);
  }

  buildBanner() {
    this.bannerGroup = this.add.container(0, -20)
      .setAlpha(0);

    this.stage.add(this.bannerGroup);

    this.addLayer('banner', this.bannerGroup);

    this.bannerText = this.add.text(
      321,
      185,
      '',
      {
        fontFamily: 'SpecialElite',
        fontSize: '30px',
        color: '#2c1d11',
        stroke: '#8a653a',
        strokeThickness: 1,
        align: 'center',
        padding: {
          x: 4,
          y: 5
        }
      }
    ).setOrigin(0.5);

    this.bannerGroup.add(this.bannerText);

    this.bannerText.setText(MISSION_LABEL);

    this.bannerTextScale = Math.min(
      1,
      395 / this.bannerText.width
    );

    this.bannerText.setScale(this.bannerTextScale);
    this.bannerText.setText('');
  }

  getReportMessage(report) {
    if (report.status === 'draft') {
      return (
        'Use the agency COMPUTER to complete ' +
        'and print your Mission Report.'
      );
    }

    if (report.status === 'full') {
      return (
        'Inventory full. Your printed report ' +
        'will wait until you free a slot.'
      );
    }

    if (report.status === 'unavailable') {
      return 'Report unavailable: missing case identity.';
    }

    return (
      'Deliver your Mission Report to ' +
      'Frank Drebin in the archive.'
    );
  }

  buildResults(report) {
    this.resultPanel = this.add.container(0, 0)
      .setAlpha(0)
      .setVisible(false);

    this.stage.add(this.resultPanel);

    const panel = this.add.rectangle(
      1585, 355, 490, 520, 0x141d2b, 0.95
    ).setStrokeStyle(2, 0xb79a61, 0.95);

    const heading = this.add.text(
      1585,
      125,
      'CASE SOLVED',
      {
        fontFamily: 'PressStart2P',
        fontSize: '22px',
        color: '#eaca83',
        align: 'center'
      }
    ).setOrigin(0.5, 0);

    const captured = this.add.text(
      1585,
      177,
      `You captured:\n${gameState.currentThief?.name || 'Unknown suspect'}`,
      {
        fontFamily: 'SpecialElite',
        fontSize: '27px',
        color: '#f5ead4',
        align: 'center',
        lineSpacing: 6,
        wordWrap: {
          width: 425
        }
      }
    ).setOrigin(0.5, 0);

    const summaryY = Math.max(
      275,
      captured.y + captured.height + 20
    );

    const summary = this.add.text(
      1585,
      summaryY,
      'The artefact is safe.\nThe paperwork is just beginning.',
      {
        fontFamily: 'SpecialElite',
        fontSize: '23px',
        color: '#d4dbe6',
        align: 'center',
        lineSpacing: 7,
        wordWrap: {
          width: 425
        }
      }
    ).setOrigin(0.5, 0);

    this.scoreLabel = this.add.text(
      1585,
      summary.y + summary.height + 22,
      '',
      {
        fontFamily: 'PressStart2P',
        fontSize: '19px',
        color: '#eaca83',
        align: 'center',
        wordWrap: {
          width: 425
        }
      }
    ).setOrigin(0.5, 0);

    this.updateScoreLabel(
      Number.isFinite(gameState.score)
        ? gameState.score
        : 0
    );

    const statusY = this.scoreLabel.y +
      this.scoreLabel.height + 22;

    this.statusText = this.add.text(
      1585,
      statusY,
      this.getReportMessage(report),
      {
        fontFamily: 'SpecialElite',
        fontSize: '21px',
        color: '#e8d5ac',
        align: 'center',
        lineSpacing: 5,
        wordWrap: {
          width: 425
        }
      }
    ).setOrigin(0.5, 0);

    const availableHeight = Math.max(
      35,
      515 - statusY
    );

    if (this.statusText.height > availableHeight) {
      this.statusText.setScale(
        availableHeight / this.statusText.height
      );
    }

    this.resultPanel.add([
      panel,
      heading,
      captured,
      summary,
      this.scoreLabel,
      this.statusText
    ]);

    const buttonBg = this.add.rectangle(
      1585, 565, 425, 60, 0x303c4b, 1
    ).setStrokeStyle(2, 0xb79a61, 1);

    const buttonLabel = this.add.text(
      1585,
      565,
      'RETURN TO OFFICE',
      {
        fontFamily: 'PressStart2P',
        fontSize: '16px',
        color: '#f8e7c4'
      }
    ).setOrigin(0.5);

    this.nextBtn = buttonBg;

    this.resultPanel.add([
      buttonBg,
      buttonLabel
    ]);

    buttonBg.on('pointerover', () => {
      if (!this.isLeaving) {
        buttonBg.setFillStyle(0x49576a);
      }
    });

    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0x303c4b);
    });

    buttonBg.on('pointerdown', (
      pointer,
      localX,
      localY,
      event
    ) => {
      event?.stopPropagation();

      if (this.introComplete) {
        void this.returnToOffice(buttonBg);
      }
    });
  }

  updateScoreLabel(value) {
    this.scoreLabel?.setText(
      `Final score: ${Math.max(0, Math.floor(value))}`
    );
  }

  introAfter(delay, callback) {
    const timer = this.time.delayedCall(delay, () => {
      if (!this.introComplete) {
        callback();
      }
    });

    this.introTimers.push(timer);
    return timer;
  }

  introTween(config) {
    const tween = this.tweens.add(config);

    this.introTweens.push(tween);
    return tween;
  }

  playIntro() {
    this.introTween({
      targets: this.streetShade,
      alpha: 0,
      duration: 850,
      ease: 'Sine.easeOut'
    });

    this.introAfter(300, () => {
      this.introTween({
        targets: this.bannerGroup,
        y: 0,
        alpha: 1,
        duration: 450,
        ease: 'Back.easeOut'
      });
    });

    this.introAfter(700, () => {
      this.startBannerTyping();
    });

    this.introAfter(450, () => {
      this.medallionGroup.setAlpha(1);

      this.introTween({
        targets: this.medallionGroup,
        y: 440,
        duration: 950,
        ease: 'Bounce.easeOut'
      });
    });

    this.introAfter(1550, () => {
      this.playSuccessSound();
      this.animateJusticeStamp();

      for (const key of [
        'money_bag_left',
        'money_bag_right'
      ]) {
        const bag = this.layers[key];

        if (!bag) continue;

        this.introTween({
          targets: bag,
          y: -18,
          duration: 180,
          yoyo: true,
          ease: 'Sine.easeOut'
        });
      }
    });

    this.introAfter(2100, () => {
      this.spawnSparkle(849, 821);
      this.spawnSparkle(1107, 850);
    });

    this.introAfter(2800, () => {
      this.finishIntro();
    });
  }

  startBannerTyping() {
    let index = 0;

    const timer = this.time.addEvent({
      delay: 55,
      repeat: MISSION_LABEL.length - 1,
      callback: () => {
        if (this.introComplete) return;

        index += 1;

        this.bannerText.setText(
          MISSION_LABEL.slice(0, index)
        );
      }
    });

    this.introTimers.push(timer);
  }

  animateJusticeStamp() {
    this.justiceGroup
      .setPosition(0, 156)
      .setScale(1.35)
      .setAlpha(0);

    this.introTween({
      targets: this.justiceGroup,
      alpha: 1,
      duration: 130
    });

    this.introTween({
      targets: this.justiceGroup,
      y: 170,
      scaleX: 1,
      scaleY: 1,
      duration: 480,
      ease: 'Back.easeOut'
    });

    this.introAfter(280, () => {
      this.justiceFlash.setAlpha(0.75);

      this.introTween({
        targets: this.justiceFlash,
        alpha: 0,
        duration: 320,
        ease: 'Sine.easeOut'
      });
    });
  }

  cancelIntro() {
    for (const timer of this.introTimers) {
      timer.remove(false);
    }

    for (const tween of this.introTweens) {
      tween.stop();
    }

    this.introTimers = [];
    this.introTweens = [];
  }

  finishIntro() {
    if (this.introComplete) return;

    this.introComplete = true;
    this.cancelIntro();

    this.streetShade.setAlpha(0);

    this.medallionGroup
      .setPosition(960, 440)
      .setAlpha(1);

    this.bannerGroup
      .setPosition(0, 0)
      .setAlpha(1);

    this.bannerText.setText(MISSION_LABEL);

    this.justiceGroup
      .setPosition(0, 170)
      .setScale(1)
      .setAlpha(1);

    this.justiceFlash.setAlpha(0);

    this.layers.money_bag_left?.setY(0);
    this.layers.money_bag_right?.setY(0);

    this.skipHint.setVisible(false);

    this.playSuccessSound();

    this.resultPanel
      .setVisible(true)
      .setAlpha(0);

    this.tweens.add({
      targets: this.resultPanel,
      alpha: 1,
      duration: 350
    });

    this.nextBtn.setInteractive({
      useHandCursor: true
    });

    this.animateScore();
    this.startTreasureSparkles();
  }

  playSuccessSound() {
    if (this.soundPlayed) return;

    this.soundPlayed = true;
    audioManager.playSfx('successsound');
  }

  animateScore() {
    const finalScore = Number.isFinite(gameState.score)
      ? gameState.score
      : 0;

    const counter = {
      value: 0
    };

    this.updateScoreLabel(0);

    this.tweens.add({
      targets: counter,
      value: finalScore,
      duration: 1100,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        this.updateScoreLabel(counter.value);
      },
      onComplete: () => {
        this.updateScoreLabel(finalScore);
      }
    });
  }

  startSiren() {
    let phase = 0;

    this.time.addEvent({
      delay: 180,
      loop: true,
      callback: () => {
        phase = (phase + 1) % 8;

        const redOn = phase === 0 || phase === 2;
        const blueOn = phase === 4 || phase === 6;

        this.redGlow.setAlpha(redOn ? 1 : 0);
        this.blueGlow.setAlpha(blueOn ? 1 : 0);

        this.redBulb.setAlpha(redOn ? 0.8 : 0);
        this.blueBulb.setAlpha(blueOn ? 0.8 : 0);
      }
    });
  }

  spawnSparkle(x, y) {
    if (this.isLeaving || !this.stage?.active) return;

    const sparkle = this.add.container(x, y);

    const horizontal = this.add.rectangle(
      0, 0, 28, 4, 0xffefb3
    );

    const vertical = this.add.rectangle(
      0, 0, 4, 28, 0xffefb3
    );

    const center = this.add.rectangle(
      0, 0, 7, 7, 0xffffff
    ).setAngle(45);

    sparkle
      .add([horizontal, vertical, center])
      .setScale(0.1)
      .setAlpha(0);

    this.stage.add(sparkle);
    this.activeSparkles.add(sparkle);

    this.tweens.add({
      targets: sparkle,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      angle: 35,
      duration: 330,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.activeSparkles.delete(sparkle);
        sparkle.destroy(true);
      }
    });
  }

  startTreasureSparkles() {
    const points = [
      [849, 821],
      [884, 885],
      [968, 917],
      [1109, 851],
      [1030, 960],
      [815, 924]
    ];

    let index = 0;

    this.time.addEvent({
      delay: 1400,
      loop: true,
      callback: () => {
        const [x, y] = points[index % points.length];

        index += 1;
        this.spawnSparkle(x, y);
      }
    });
  }

  async returnToOffice(button) {
    if (this.isLeaving) return;

    this.isLeaving = true;
    button.disableInteractive();

    try {
      moveStateToHeadquarters(
        this.cache.json.get('locations') || []
      );

      requestAutosave();
      flushAutosave();

      audioManager.stopSfx('successsound');
      audioManager.stopAllNonMusic();
      audioManager.stopAllMusic();

      const result = await this.goto(
        'OfficeScene',
        { gameState }
      );

      if (result === false && !this._cleanupDone) {
        throw new Error(
          'OfficeScene could not be opened.'
        );
      }
    } catch (error) {
      console.error(
        '[SuccessScene] Return to office failed:',
        error
      );

      if (this._cleanupDone) return;

      this.isLeaving = false;

      button.setInteractive({
        useHandCursor: true
      });

      this.statusText?.setText(
        'The office could not be opened. Please try again.'
      );
    }
  }

  registerSuccessRewards() {
    const caseId = this.getCurrentCaseId();

    if (caseId === null) {
      console.error(
        '[SuccessScene] Cannot grant rewards: missing case ID.'
      );
      return;
    }

    const result = applyReputationEvent(
      'correct_arrest',
      {
        eventId: `case:${caseId}:final-arrest`,
        context: {
          caseId,
          suspectId: gameState.finalArrestSuspectId ?? null,
          source: 'SuccessScene'
        }
      }
    );

    if (!result.applied) return;

    gameState.score = Math.max(
      0,
      Number.isFinite(gameState.score)
        ? gameState.score
        : 0
    ) + CORRECT_ARREST_BONUS;

    requestAutosave();
  }

  registerCaseSuccess() {
    const caseId = this.getCurrentCaseId();

    gameState.caseResolved = true;
    gameState.caseFailed = false;
    gameState.finalArrestResult = 'SUCCESS';
    gameState.isGameActive = false;
    gameState.gameOverReason = '';

    if (caseId === null) {
      console.warn(
        '[SuccessScene] Cannot save dossier statistics: missing case ID.'
      );
      return;
    }

    const completed = Array.isArray(gameState.completedCaseIds)
      ? gameState.completedCaseIds
      : [];

    const arrests = Array.isArray(gameState.successfulArrestCaseIds)
      ? gameState.successfulArrestCaseIds
      : [];

    let changed = false;

    if (!completed.some(id => String(id) === caseId)) {
      gameState.completedCaseIds = [
        ...completed,
        caseId
      ];

      gameState.casesSolved =
        gameState.completedCaseIds.length;

      changed = true;
    }

    if (!arrests.some(id => String(id) === caseId)) {
      gameState.successfulArrestCaseIds = [
        ...arrests,
        caseId
      ];

      gameState.arrests =
        gameState.successfulArrestCaseIds.length;

      changed = true;
    }

    const badges = checkAndAwardAchievements();

    if (badges.length) {
      console.log(
        '[Achievements] New badges:',
        badges.map(item => item.title)
      );
    }

    if (changed) {
      requestAutosave();

      EventBus.emit('agentStatsChanged', {
        casesSolved: gameState.casesSolved,
        arrests: gameState.arrests
      });
    }
  }

  registerFirstMissionSuccess() {
    const progress = isPlainObject(gameState.progress)
      ? gameState.progress
      : {};

    const onboarding = isPlainObject(gameState.onboarding)
      ? gameState.onboarding
      : {};

    const firstCase = isPlainObject(onboarding.firstCase)
      ? onboarding.firstCase
      : {};

    const alreadyRegistered =
      progress.firstMissionSuccess === true;

    const count = Number.isFinite(firstCase.successCount)
      ? firstCase.successCount
      : 0;

    gameState.progress = {
      ...progress,
      firstMissionSuccess: true
    };

    gameState.onboarding = {
      ...onboarding,
      firstCase: {
        ...firstCase,
        successCount: Math.max(1, count)
      }
    };

    if (alreadyRegistered) return;

    requestAutosave();
    EventBus.emit('firstMissionSuccess');
  }

  unlockOfficeAfterFirstMission() {
    const progress = isPlainObject(gameState.progress)
      ? gameState.progress
      : {};

    if (progress.firstMissionCompleted) return;

    gameState.progress = {
      ...progress,
      firstMissionCompleted: true
    };

    requestAutosave();
    EventBus.emit('firstMissionCompleted');
  }

  getCurrentCaseId() {
    const raw = [
      this.caseId,
      gameState.currentCaseId,
      gameState.currentMission?.caseId,
      gameState.currentMission?.id,
      gameState.currentMission?.missionId
    ].find(isValidId);

    return raw === undefined ? null : String(raw);
  }

  cleanupSuccessScene() {
    this.scale.off('resize', this.onSuccessResize);
    this.input.off('pointerdown', this.onSkipIntro);

    this.cancelIntro();
    this.time.removeAllEvents();
    this.tweens.killAll();

    for (const sparkle of this.activeSparkles) {
      sparkle.destroy(true);
    }

    this.activeSparkles.clear();

    audioManager.stopSfx('successsound');

    this.nextBtn = null;
    this.statusText = null;
    this.layers = {};
  }
}