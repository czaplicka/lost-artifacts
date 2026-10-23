import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';

import {
  getReputation,
  REPUTATION_CHANGED
} from '../managers/ReputationManager.js';

const GAME_OVER_SCORE_PENALTY = 250;
const GAME_OVER_FAME_PENALTY = 5;
const WRONG_ARREST_INTEGRITY_PENALTY = 12;

const LEGACY_WRONG_ARREST_MESSAGE =
  'Incorrect suspect detained. The real thief escaped before the bureau could act.';

const LEGACY_MISSING_WARRANT_MESSAGE =
  'Without a signed warrant, the agency could not act in time. ' +
  'The thief escaped before the arrest team arrived.';

const GAME_OVER_REASONS = {
  trail_cold: {
    title: 'The trail has gone cold',
    message:
      'The thief used the four days you spent in the crime city to buy a ticket, ' +
      'a wig and a new personality.\n' +
      'By the time you looked up, the trail was colder than the coffee at Mark Agency.'
  },

  time_expired: {
    title: 'Time is up',
    message:
      'Seven days. That is how long the thief needed to disappear, ' +
      'and exactly how long you needed to be almost there.\n' +
      'The artefact is gone. The paperwork, sadly, is not.'
  },

  wrong_arrest: {
    title: 'Wrong person. Real consequences.',
    message:
      'The bureau reviewed your report. You arrested the wrong person.\n' +
      'The real thief escaped with the artefact. ' +
      'An innocent person got a cell, and you got the paperwork.'
  },

  missing_warrant: {
    title: 'No warrant. No arrest.',
    message:
      'Without a signed warrant, the arrest team could not act.\n' +
      'The thief escaped before the paperwork caught up.'
  }
};

function isKnownReason(value) {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(
      GAME_OVER_REASONS,
      value
    )
  );
}

function isValidCaseId(value) {
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

export class GameOverScene extends BaseScene {
  constructor() {
    super({ key: 'GameOverScene' });

    this.titleTextValue = 'GAME OVER';
    this.messageTextValue = 'The case has been lost.';

    this.reasonCode = null;
    this.caseId = null;
    this.suspectId = null;

    this.consequencesProcessed = false;
    this.isLeaving = false;

    this.continueBtn = null;
    this.continueButtonBaseScale = 1;
  }

  init(data = {}) {
    this.reasonCode = null;
    this.consequencesProcessed = false;
    this.isLeaving = false;

    this.continueBtn = null;
    this.continueButtonBaseScale = 1;

    this.caseId =
      data.caseId ??
      gameState.currentCaseId ??
      null;

    this.suspectId =
      data.suspectId ??
      gameState.finalArrestSuspectId ??
      null;

    const incomingReason =
      typeof data.reason === 'string'
        ? data.reason
        : null;

    const savedReason =
      typeof gameState.gameOverReason === 'string'
        ? gameState.gameOverReason
        : null;

    if (
      typeof data.reasonCode === 'string' &&
      data.reasonCode.trim()
    ) {
      this.reasonCode = data.reasonCode;
    } else if (isKnownReason(incomingReason)) {
      this.reasonCode = incomingReason;
    } else if (incomingReason) {
      this.reasonCode =
        this.resolveLegacyReason(incomingReason);
    } else if (isKnownReason(savedReason)) {
      this.reasonCode = savedReason;
    } else {
      this.reasonCode =
        this.resolveLegacyReason(savedReason);
    }

    const known = isKnownReason(this.reasonCode)
      ? GAME_OVER_REASONS[this.reasonCode]
      : null;

    this.titleTextValue =
      data.title ||
      known?.title ||
      'You have failed the mission';

    this.messageTextValue =
      data.message ||
      known?.message ||
      incomingReason ||
      savedReason ||
      'The case has been lost.';
  }

  preload() {
    if (!this.textures.exists('btnContinue')) {
      this.load.image(
        'btnContinue',
        'assets/continue.png'
      );
    }
  }

  resolveLegacyReason(reason) {
    if (reason === LEGACY_WRONG_ARREST_MESSAGE) {
      return 'wrong_arrest';
    }

    if (reason === LEGACY_MISSING_WARRANT_MESSAGE) {
      return 'missing_warrant';
    }

    return null;
  }

  create() {
    super.create();

    this.hideGameplayInterface();

    audioManager.init(this);
    audioManager.stopAllMusic();
    audioManager.stopAllAmbient();
    audioManager.stopAllVoice();
    audioManager.stopAllSfx();
    audioManager.playSfx('game_over');

    this.applyGameOverConsequences();

    this.createBackground();
    this.createTitle();
    this.createMessage();
    this.createContinueButton();

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      () => {
        audioManager.stopAllSfx();
        this.continueBtn = null;
      }
    );
  }

  hideGameplayInterface() {
    const hud =
      this.scene.manager.keys.PlayerHudScene;

    hud?.closeAllUIPanels?.();
    hud?.hideHud?.();

    const newsHud =
      this.scene.manager.keys.NewsHud;

    newsHud?.events?.emit(
      'setButtonsVisible',
      false
    );

    newsHud?.events?.emit(
      'setNewspaperVisible',
      false
    );

    newsHud?.events?.emit(
      'setTvVisible',
      false
    );

    const interfaceScenes = [
      'NewsHud',
      'PlayerHudScene',
      'UIScene'
    ];

    for (const sceneKey of interfaceScenes) {
      if (!this.hasScene(sceneKey)) continue;

      this.scene.setVisible(false, sceneKey);
      this.stopSceneIfActive(sceneKey);
    }
  }

  createBackground() {
    this.add
      .image(0, 0, 'backgroundgo')
      .setOrigin(0, 0)
      .setDisplaySize(1920, 1080);
  }

  createTitle() {
    this.add
      .text(
        960,
        210,
        this.titleTextValue,
        {
          fontFamily: 'PressStart2P',
          fontSize: '34px',
          color: '#f7dfb2',
          stroke: '#3b1f12',
          strokeThickness: 8,
          align: 'center',
          wordWrap: {
            width: 1500
          }
        }
      )
      .setOrigin(0.5);
  }

  createMessage() {
    const msgBg = this.add.rectangle(
      960,
      865,
      1180,
      190,
      0x2a160f,
      0.82
    );

    msgBg.setStrokeStyle(
      4,
      0xf7dfb2,
      1
    );

    const msgInner = this.add.rectangle(
      960,
      865,
      1160,
      170,
      0x3a2016,
      0.35
    );

    msgInner.setStrokeStyle(
      2,
      0x7b4a2d,
      0.8
    );

    this.add
      .text(
        960,
        865,
        this.messageTextValue,
        {
          fontFamily: 'SpecialElite',
          fontSize: '26px',
          color: '#f6ead0',
          align: 'center',
          wordWrap: {
            width: 1080
          },
          lineSpacing: 8
        }
      )
      .setOrigin(0.5);
  }

  createContinueButton() {
    this.continueBtn = this.add
      .image(960, 1015, 'btnContinue')
      .setOrigin(0.5)
      .setDepth(10);

    const baseScale = Math.min(
      320 / this.continueBtn.width,
      80 / this.continueBtn.height
    );

    this.continueButtonBaseScale = baseScale;

    this.continueBtn
      .setScale(baseScale)
      .setInteractive({
        useHandCursor: true
      });

    this.addHoverEffect(
      this.continueBtn,
      baseScale,
      baseScale * 1.08
    );

    this.continueBtn.on(
      'pointerdown',
      () => {
        void this.continueToAgainScene();
      }
    );
  }

  async continueToAgainScene() {
    if (this.isLeaving) return;

    this.isLeaving = true;

    this.continueBtn
      ?.disableInteractive();

    this.continueBtn
      ?.setScale(this.continueButtonBaseScale);

    this.continueBtn
      ?.setAlpha(0.75);

    saveGameState();

    audioManager.stopAllNonMusic();
    audioManager.stopAllMusic();

    const opened = await this.goto(
      'AgainScene'
    );

    if (!opened && !this._cleanupDone) {
      this.isLeaving = false;

      this.continueBtn
        ?.setAlpha(1);

      this.continueBtn
        ?.setInteractive({
          useHandCursor: true
        });

      console.error(
        '[GameOverScene] Could not open AgainScene.'
      );
    }
  }

  applyGameOverConsequences() {
    if (this.consequencesProcessed) return;

    this.consequencesProcessed = true;

    gameState.caseResolved = false;
    gameState.caseFailed = true;
    gameState.isGameActive = false;

    gameState.gameOverReason =
      isKnownReason(this.reasonCode)
        ? this.reasonCode
        : this.messageTextValue;

    if (!isValidCaseId(this.caseId)) {
      console.error(
        '[GameOverScene] Missing valid case ID. ' +
        'Penalties cannot be safely applied without a stable case identifier.'
      );

      this.saveOutcome();
      return;
    }

    const eventId =
      `case:${this.caseId}:game-over`;

    const before = getReputation();

    if (before.appliedEventIds.includes(eventId)) {
      this.saveOutcome();
      return;
    }

    const isWrongArrest =
      this.reasonCode === 'wrong_arrest';

    const arrestEventId =
      `case:${this.caseId}:final-arrest`;

    const arrestAlreadySettled =
      isWrongArrest &&
      before.appliedEventIds.includes(arrestEventId);

    const integrityPenalty =
      isWrongArrest && !arrestAlreadySettled
        ? WRONG_ARREST_INTEGRITY_PENALTY
        : 0;

    const scorePenalty = arrestAlreadySettled
      ? 0
      : GAME_OVER_SCORE_PENALTY;

    const currentScore =
      Number.isFinite(gameState.score)
        ? gameState.score
        : 0;

    const appliedEventIds = [
      ...before.appliedEventIds,
      eventId
    ];

    if (isWrongArrest && !arrestAlreadySettled) {
      appliedEventIds.push(arrestEventId);
    }

    const next = {
      ...before,

      fame: Math.max(
        0,
        before.fame - GAME_OVER_FAME_PENALTY
      ),

      integrity: Math.max(
        -100,
        before.integrity - integrityPenalty
      ),

      appliedEventIds
    };

    gameState.score = Math.max(
      0,
      currentScore - scorePenalty
    );

    gameState.reputationState = next;

    this.saveOutcome();

    EventBus.emit(REPUTATION_CHANGED, {
      type: 'game_over',
      eventId,

      context: {
        caseId: this.caseId,
        suspectId: this.suspectId,
        reasonCode: this.reasonCode || 'unknown',
        source: 'GameOverScene'
      },

      before,
      after: getReputation()
    });
  }

  saveOutcome() {
    const saved = saveGameState();

    if (!saved) {
      console.warn(
        '[GameOverScene] Outcome is in memory, ' +
        'but saving the game failed.'
      );
    }
  }

  addHoverEffect(
    button,
    baseScale = 0.7,
    hoverScale = 0.8
  ) {
    button.on('pointerover', () => {
      if (this.isLeaving) return;

      button.setScale(hoverScale);
    });

    button.on('pointerout', () => {
      button.setScale(baseScale);
    });
  }
}