import { audioManager } from '../../AudioManager.js';
import { BaseScene } from '../BaseScene.js';
import { LabTerminal, TERM } from './LabTerminal.js';

const PADS = [
  { label: 'R-7', color: '#ff5252', freq: 330 },
  { label: 'G-2', color: '#46ff7a', freq: 415 },
  { label: 'B-9', color: '#57c7ff', freq: 494 },
  { label: 'Y-4', color: '#ffc857', freq: 587 }
];

const ROUNDS = [3, 4, 5];

export class FiberAnalysisScene extends BaseScene {
  constructor() {
    super('FiberAnalysisScene');

    this.term = null;
    this.padTexts = [];
    this.sequence = [];

    this.stationId = 'trace_1';
    this.evidenceType = 'fiber_profile';
    this.correctValue = 'blue_cotton_fiber';
    this.clue = null;

    this.score = 100;
    this.mistakes = 0;
    this.startedAt = 0;

    this.round = 0;
    this.inputIndex = 0;
    this.accepting = false;
    this.finished = false;
    this.returningToLab = false;

    this.playbackEvent = null;
    this.nextRoundEvent = null;

    this.gameStarted = false;
    this.readyOverlay = null;
    this.readyObjects = [];
  }

  init(data = {}) {
    const evidenceConfig = data.evidenceConfig || {};

    this.stationId = data.stationId || 'trace_1';

    this.evidenceType =
      data.evidenceType ||
      evidenceConfig.evidenceType ||
      'fiber_profile';

    this.correctValue =
      data.correctValue ??
      evidenceConfig.correctValue ??
      'blue_cotton_fiber';

    this.clue = data.clue || {
      id: evidenceConfig.id || 'blue_cotton_fiber',
      type:
        data.clueType ||
        evidenceConfig.clueType ||
        'red_herring',
      text:
        data.clueText ||
        evidenceConfig.clueText ||
        'A blue cotton fiber was recovered from the crime scene.',
      facts: {
        material: 'cotton',
        color: 'blue',
        usefulness: 'very low'
      }
    };

    this.score = data.startScore ?? 100;
    this.mistakes = 0;
    this.startedAt = 0;

    this.padTexts = [];
    this.sequence = [];

    this.round = 0;
    this.inputIndex = 0;
    this.accepting = false;
    this.finished = false;
    this.returningToLab = false;

    this.playbackEvent = null;
    this.nextRoundEvent = null;

    this.gameStarted = false;
    this.readyOverlay = null;
    this.readyObjects = [];
  }

  create() {
    super.create();

    this.term = new LabTerminal(this, {
      title: 'SPECTROGRAPH SP-404 // REAGENT SEQUENCER',
      maxLines: 9
    });

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanup,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.DESTROY,
      this.cleanup,
      this
    );

    this.buildPads();
    this.showIntro();
  }

  buildPads() {
    const centerX = this.term.x + this.term.w / 2;
    const centerY = this.term.y + this.term.h - 190;

    this.padTexts = PADS.map((pad, index) => {
      const text = this.add
        .text(
          centerX + (index - 1.5) * 150,
          centerY,
          ` ${pad.label} `,
          {
            fontFamily: '"Press Start 2P"',
            fontSize: '18px',
            color: TERM.dark,
            backgroundColor: pad.color,
            padding: {
              x: 14,
              y: 14
            }
          }
        )
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      text.on('pointerdown', () => {
        if (!this.gameStarted || this.finished) return;

        this.pressPad(index);
      });

      return text;
    });
  }

  async showIntro() {
    await this.term.print(
      '> FIBER SAMPLE LOADED. DO NOT SNEEZE.'
    );

    await this.term.print(
      '> REAGENTS MUST BE ADDED IN THE SHOWN ORDER.'
    );

    await this.term.print(
      '> WATCH. REMEMBER. REPEAT. LIKE KARAOKE, BUT SCIENCE.',
      { color: TERM.amber }
    );

    if (!this.finished) {
      this.showReadyScreen();
    }
  }

  showReadyScreen() {
    const { width, height } = this.scale;

    this.gameStarted = false;

    this.readyOverlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.9)
      .setOrigin(0, 0)
      .setDepth(5000)
      .setInteractive();

    const panel = this.add
      .rectangle(
        width / 2,
        height / 2,
        Math.min(width - 40, 760),
        390,
        0x111827,
        1
      )
      .setStrokeStyle(3, 0x7df9ff)
      .setDepth(5001);

    const title = this.add
      .text(
        width / 2,
        height / 2 - 130,
        'FIBER MATCHING PROTOCOL',
        {
          fontFamily: 'PressStart2P',
          fontSize: '16px',
          color: '#7df9ff',
          align: 'center'
        }
      )
      .setOrigin(0.5)
      .setDepth(5002);

    const briefing = this.add
      .text(
        width / 2,
        height / 2 - 20,
        'Watch the fiber scanner carefully.\n\nRepeat the color sequence exactly.\n\nThe machine is dramatic, impatient,\nand legally classified as a diva.',
        {
          fontFamily: 'Special Elite',
          fontSize: '25px',
          color: '#fff4c7',
          align: 'center',
          wordWrap: {
            width: Math.min(width - 110, 650)
          }
        }
      )
      .setOrigin(0.5)
      .setDepth(5002);

    const startButton = this.add
      .text(width / 2, height / 2 + 145, '[ I AM FOCUSED ]', {
        fontFamily: 'PressStart2P',
        fontSize: '13px',
        color: '#39ff14',
        backgroundColor: '#000000',
        padding: {
          left: 16,
          right: 16,
          top: 12,
          bottom: 12
        }
      })
      .setOrigin(0.5)
      .setDepth(5002)
      .setInteractive({ useHandCursor: true });

    const startFiberGame = () => {
      if (this.gameStarted || this.finished) return;

      this.gameStarted = true;

      audioManager.playSfx('click_sound');

      this.readyObjects.forEach((gameObject) => {
        if (!gameObject?.active) return;

        gameObject.removeAllListeners?.();
        gameObject.destroy();
      });

      this.readyObjects = [];
      this.readyOverlay = null;

      /*
       * Timer starts only after the player explicitly confirms
       * that they are ready to watch the sequence.
       */
      this.startedAt = this.time.now;

      this.startRound();
    };

    startButton.on('pointerover', () => {
      startButton.setScale(1.06);
      startButton.setColor('#ffffff');
    });

    startButton.on('pointerout', () => {
      startButton.setScale(1);
      startButton.setColor('#39ff14');
    });

    startButton.on('pointerdown', startFiberGame);

    this.readyObjects = [
      this.readyOverlay,
      panel,
      title,
      briefing,
      startButton
    ];
  }

  async startRound() {
    if (this.finished || !this.gameStarted) return;

    this.accepting = false;
    this.inputIndex = 0;

    const sequenceLength = ROUNDS[this.round];

    this.sequence = Array.from(
      { length: sequenceLength },
      () => Phaser.Math.Between(0, PADS.length - 1)
    );

    await this.term.print(
      `> ROUND ${this.round + 1}/3 — SEQUENCE LENGTH ${sequenceLength}`
    );

    if (this.finished || !this.gameStarted) return;

    await this.playSequence();

    if (!this.finished && this.gameStarted) {
      this.accepting = true;
    }
  }

  playSequence() {
    return new Promise((resolve) => {
      let sequenceIndex = 0;

      this.playbackEvent = this.time.addEvent({
        delay: 650,
        repeat: this.sequence.length - 1,
        callback: () => {
          if (this.finished || !this.gameStarted) {
            resolve();
            return;
          }

          this.flashPad(this.sequence[sequenceIndex]);
          sequenceIndex += 1;

          if (sequenceIndex >= this.sequence.length) {
            this.time.delayedCall(400, () => {
              resolve();
            });
          }
        }
      });
    });
  }

  flashPad(index) {
    const padText = this.padTexts[index];
    const pad = PADS[index];

    if (!padText || !pad) return;

    this.term.blip(
      pad.freq,
      0.18,
      'square',
      0.05
    );

    padText.setScale(1.25);

    this.time.delayedCall(280, () => {
      if (padText?.active) {
        padText.setScale(1);
      }
    });
  }

  async pressPad(index) {
    if (
      !this.gameStarted ||
      !this.accepting ||
      this.finished
    ) {
      return;
    }

    this.flashPad(index);

    const expectedIndex = this.sequence[this.inputIndex];

    if (index !== expectedIndex) {
      await this.handleWrongPad();
      return;
    }

    this.inputIndex += 1;

    if (this.inputIndex < this.sequence.length) {
      return;
    }

    this.accepting = false;
    this.round += 1;

    if (this.round >= ROUNDS.length) {
      this.finishAnalysis();
      return;
    }

    await this.term.print(
      '> SEQUENCE ACCEPTED. THE MACHINE PURRS.'
    );

    this.nextRoundEvent = this.time.delayedCall(
      600,
      () => this.startRound()
    );
  }

  async handleWrongPad() {
    if (this.finished || !this.gameStarted) return;

    this.accepting = false;
    this.mistakes += 1;
    this.score = Math.max(0, this.score - 15);

    await this.term.print(
      '> WRONG REAGENT. SMALL EXPLOSION. EVERYONE IS FINE. (-15 PTS)',
      { color: TERM.red }
    );

    this.nextRoundEvent = this.time.delayedCall(
      800,
      () => this.startRound()
    );
  }

  getTimeBonus() {
    const secondsElapsed = this.getSecondsElapsed();

    if (secondsElapsed <= 15) {
      return 20;
    }

    if (secondsElapsed <= 30) {
      return 10;
    }

    return 0;
  }

  getSecondsElapsed() {
    if (!this.startedAt) {
      return 0;
    }

    return Math.floor(
      (this.time.now - this.startedAt) / 1000
    );
  }

  async finishAnalysis() {
    if (this.finished) return;

    this.finished = true;
    this.accepting = false;

    const timeBonus = this.getTimeBonus();

    this.score = Math.min(
      120,
      this.score + timeBonus
    );

    this.disablePads();

    await this.term.progress(
      'SPECTRAL ANALYSIS',
      1800
    );

    await this.term.print(
      '> RESULT: BLUE COTTON FIBER.'
    );

    await this.term.print(
      '> FOUND IN 98% OF ALL CLOTHING. THIS CHANGES NOTHING.',
      { color: TERM.amber }
    );

    await this.term.print(
      '> THE SPECTROGRAPH IS VERY PROUD ANYWAY.'
    );

    if (timeBonus > 0) {
      await this.term.print(
        `> SPEED BONUS: +${timeBonus} PTS.`,
        { color: TERM.amber }
      );
    }

    await this.term.print(
      '> CLUE READY FOR CASE FILE.',
      { color: TERM.amber }
    );

    this.term.button(
      'ADD TO CASE FILE',
      TERM.green,
      () => this.returnResultToCrimeLab()
    );
  }

  disablePads() {
    this.padTexts.forEach((padText) => {
      if (!padText) return;

      padText.disableInteractive();
      padText.setAlpha(0.55);
    });
  }

  returnResultToCrimeLab() {
    if (this.returningToLab) return;

    this.returningToLab = true;

    const payload = {
      aborted: false,
      completed: true,
      stationId: this.stationId,
      evidenceType: this.evidenceType,
      value: this.correctValue,
      score: this.score,
      mistakes: this.mistakes,
      secondsElapsed: this.getSecondsElapsed(),
      clue: this.clue
    };

    this.events.emit('minigame-complete', payload);

    this.events.emit('minigame-closed', {
      aborted: false,
      payload
    });

    this.scene.stop();
  }

  cleanup() {
    this.accepting = false;
    this.gameStarted = false;

    if (this.playbackEvent) {
      this.playbackEvent.remove();
      this.playbackEvent = null;
    }

    if (this.nextRoundEvent) {
      this.nextRoundEvent.remove();
      this.nextRoundEvent = null;
    }

    this.readyObjects.forEach((gameObject) => {
      if (!gameObject?.active) return;

      gameObject.removeAllListeners?.();
      gameObject.destroy();
    });

    this.readyObjects = [];
    this.readyOverlay = null;

    this.padTexts.forEach((padText) => {
      if (!padText) return;

      padText.removeAllListeners();
    });
  }
}