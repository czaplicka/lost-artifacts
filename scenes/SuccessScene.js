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

const CORRECT_ARREST_BONUS = 500;

function isValidId(value) {
  return (
    (
      typeof value === 'string' &&
      value.trim().length > 0
    ) ||
    (
      typeof value === 'number' &&
      Number.isFinite(value)
    )
  );
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

export class SuccessScene extends BaseScene {
  constructor() {
    super({ key: 'SuccessScene' });

    this.scoreManager = null;
    this.caseId = null;
    this.isLeaving = false;
  }

  init(data = {}) {
    this.caseId = isValidId(data.caseId)
      ? String(data.caseId)
      : null;

    this.isLeaving = false;
  }

  create() {
    super.create();

    EventBus.emit('hideHUD');

    const hud =
      this.scene.manager.keys.PlayerHudScene;

    hud?.hideHud?.();

    audioManager.init(this);
    audioManager.stopAllMusic();
    audioManager.stopAllAmbient();
    audioManager.stopAllVoice();
    audioManager.stopAllSfx();
    audioManager.playSfx('successsound');

    const newsHud =
      this.scene.manager.keys.NewsHud;

    newsHud?.events?.emit('setNewspaperVisible', false);
    newsHud?.events?.emit('setTvVisible', false);

    if (this.scene.manager.keys.UIScene) {
      this.scene.sleep('UIScene');
    }

    this.scoreManager = new ScoreManager();

    // Nagroda musi zostać naliczona przed zapisem wyniku.
    this.registerSuccessRewards();

    this.registerCaseSuccess();
    this.registerFirstMissionSuccess();
    this.unlockOfficeAfterFirstMission();

    if (!gameState.scoreSaved) {
      const playerName =
        gameState.playerName ||
        gameState.agentName ||
        'Agent';

      const finalScore = Number.isFinite(gameState.score)
        ? gameState.score
        : 0;

      this.scoreManager.saveScore(
        playerName,
        finalScore
      );

      gameState.scoreSaved = true;
    }

    // Wspólny zapis nagrody, statystyk, osiągnięć i postępu.
    requestAutosave();
    flushAutosave();

    hud?.refreshUI?.();

    const { width, height } = this.scale;
    const centerX = width / 2;

    if (this.textures.exists('backgrounds')) {
      this.add
        .image(
          centerX,
          height / 2,
          'backgrounds'
        )
        .setDisplaySize(width, height);
    } else {
      console.warn('Missing texture: backgrounds');

      this.cameras.main.setBackgroundColor('#101010');
    }

    const overlay = this.add.rectangle(
      centerX,
      height / 2,
      width,
      height,
      0x000000,
      0.45
    );

    overlay.setDepth(0);

    const titleSize = Math.max(
      20,
      Math.floor(width * 0.04)
    );

    const mainSize = Math.max(
      14,
      Math.floor(width * 0.022)
    );

    const bodySize = Math.max(
      12,
      Math.floor(width * 0.018)
    );

    const scoreSize = Math.max(
      14,
      Math.floor(width * 0.02)
    );

    const textWidth = Math.min(
      width * 0.8,
      760
    );

    this.add
      .text(
        centerX,
        height * 0.18,
        'CASE SOLVED',
        {
          fontFamily: 'PressStart2P',
          fontSize: `${titleSize}px`,
          color: '#ffe066',
          stroke: '#000000',
          strokeThickness: 6,
          align: 'center',
          wordWrap: {
            width: textWidth,
            useAdvancedWrap: true
          }
        }
      )
      .setOrigin(0.5);

    const thiefName =
      gameState.currentThief?.name ||
      'Unknown suspect';

    this.add
      .text(
        centerX,
        height * 0.34,
        `You captured:\n${thiefName}`,
        {
          fontFamily: 'PressStart2P',
          fontSize: `${mainSize}px`,
          color: '#ffffff',
          align: 'center',
          lineSpacing: 12,
          wordWrap: {
            width: textWidth,
            useAdvancedWrap: true
          }
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        centerX,
        height * 0.52,
        'The artifact is safe.\nThe agency confirms your success.',
        {
          fontFamily: 'PressStart2P',
          fontSize: `${bodySize}px`,
          color: '#f5f5f5',
          align: 'center',
          lineSpacing: 10,
          wordWrap: {
            width: textWidth,
            useAdvancedWrap: true
          }
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        centerX,
        height * 0.66,
        `Final score: ${gameState.score || 0}`,
        {
          fontFamily: 'PressStart2P',
          fontSize: `${scoreSize}px`,
          color: '#ffe066',
          stroke: '#000000',
          strokeThickness: 4,
          align: 'center',
          wordWrap: {
            width: textWidth,
            useAdvancedWrap: true
          }
        }
      )
      .setOrigin(0.5);

    let nextBtn;

    if (this.textures.exists('next')) {
      nextBtn = this.add
        .image(
          centerX,
          height * 0.84,
          'next'
        )
        .setInteractive({
          useHandCursor: true
        });

      const baseScale = Math.min(
        0.7,
        width / 1400
      );

      const hoverScale = baseScale + 0.08;

      nextBtn.setScale(baseScale);

      this.addHoverEffect(
        nextBtn,
        baseScale,
        hoverScale
      );
    } else {
      console.warn('Missing texture: next');

      nextBtn = this.add
        .text(
          centerX,
          height * 0.84,
          '[ NEXT ]',
          {
            fontFamily: 'PressStart2P',
            fontSize: `${Math.max(
              14,
              Math.floor(width * 0.018)
            )}px`,
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: {
              left: 12,
              right: 12,
              top: 10,
              bottom: 10
            },
            align: 'center'
          }
        )
        .setOrigin(0.5)
        .setInteractive({
          useHandCursor: true
        });
    }

    nextBtn.on('pointerdown', () => {
      if (this.isLeaving) return;

      this.isLeaving = true;
      nextBtn.disableInteractive();

      requestAutosave();
      flushAutosave();

      audioManager.stopSfx('successsound');
      audioManager.stopAllNonMusic();
      audioManager.stopAllMusic();

      const againSceneExists =
        this.scene.manager.keys.AgainScene;

      if (!againSceneExists) {
        console.error(
          'AgainScene is not registered in game config.'
        );

        this.goto('MenuScene');
        return;
      }

      this.goto('AgainScene');
    });

    this.scale.on(
      'resize',
      this.handleResize,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      () => {
        this.scale.off(
          'resize',
          this.handleResize,
          this
        );

        audioManager.stopSfx('successsound');
      }
    );
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
        // Zgodność z identyfikatorem używanym wcześniej
        // w ArrestSelectionScene.
        eventId: `case:${caseId}:final-arrest`,

        context: {
          caseId,
          suspectId:
            gameState.finalArrestSuspectId ?? null,
          source: 'SuccessScene'
        }
      }
    );

    if (!result.applied) {
      return;
    }

    const currentScore = Number.isFinite(gameState.score)
      ? gameState.score
      : 0;

    gameState.score =
      Math.max(0, currentScore) + CORRECT_ARREST_BONUS;

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

    const completedCaseIds =
      Array.isArray(gameState.completedCaseIds)
        ? gameState.completedCaseIds
        : [];

    const successfulArrestCaseIds =
      Array.isArray(gameState.successfulArrestCaseIds)
        ? gameState.successfulArrestCaseIds
        : [];

    const caseAlreadyCompleted =
      completedCaseIds.some(
        id => String(id) === caseId
      );

    const arrestAlreadyRegistered =
      successfulArrestCaseIds.some(
        id => String(id) === caseId
      );

    let statsChanged = false;

    if (!caseAlreadyCompleted) {
      gameState.completedCaseIds = [
        ...completedCaseIds,
        caseId
      ];

      gameState.casesSolved =
        gameState.completedCaseIds.length;

      statsChanged = true;
    }

    if (!arrestAlreadyRegistered) {
      gameState.successfulArrestCaseIds = [
        ...successfulArrestCaseIds,
        caseId
      ];

      gameState.arrests =
        gameState.successfulArrestCaseIds.length;

      statsChanged = true;
    }

    const newlyUnlocked =
      checkAndAwardAchievements();

    if (newlyUnlocked.length > 0) {
      console.log(
        '[Achievements] New badges:',
        newlyUnlocked.map(
          achievement => achievement.title
        )
      );
    }

    if (statsChanged) {
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

    const currentCount = Number.isFinite(
      firstCase.successCount
    )
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
        successCount: Math.max(1, currentCount)
      }
    };

    if (alreadyRegistered) {
      return;
    }

    requestAutosave();

    EventBus.emit('firstMissionSuccess');

    console.log(
      '[SuccessScene] First mission success registered: storage unlocked.'
    );
  }

  unlockOfficeAfterFirstMission() {
    const progress = isPlainObject(gameState.progress)
      ? gameState.progress
      : {};

    if (progress.firstMissionCompleted) {
      return;
    }

    gameState.progress = {
      ...progress,
      firstMissionCompleted: true
    };

    requestAutosave();

    EventBus.emit('firstMissionCompleted');

    console.log(
      '[SuccessScene] First mission completed: elevator and archive unlocked.'
    );
  }

  getCurrentCaseId() {
    const candidates = [
      this.caseId,
      gameState.currentCaseId,
      gameState.currentMission?.caseId,
      gameState.currentMission?.id,
      gameState.currentMission?.missionId
    ];

    const rawId = candidates.find(isValidId);

    return rawId === undefined
      ? null
      : String(rawId);
  }

  handleResize() {
    if (this.isLeaving) return;

    this.scene.restart({
      caseId: this.getCurrentCaseId()
    });
  }

  addHoverEffect(
    button,
    baseScale = 0.7,
    hoverScale = 0.8
  ) {
    button.on('pointerover', () => {
      button.setScale(hoverScale);
    });

    button.on('pointerout', () => {
      button.setScale(baseScale);
    });
  }
}