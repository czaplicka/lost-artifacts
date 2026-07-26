import { gameState, saveGameState } from '../GameData.js';

export default class TheoryResultCallScene extends Phaser.Scene {
  constructor() {
    super('TheoryResultCallScene');

    this.sourceScene = 'CityScene';
    this.mode = 'hq';
    this.result = 'weak';
  }

  init(data = {}) {
    this.sourceScene = data.sourceScene || 'CityScene';
    this.mode = data.mode || 'hq';
    this.result =
      data.result ||
      gameState.reconstructedHeist?.playerTheoryResult ||
      'weak';
  }

  create() {
    const { width, height } = this.scale;

    const palette = this.getPalette(this.result);
    const lines = this.getDialogue(this.result, this.mode);

    this.add.rectangle(0, 0, width, height, 0x000000, 0.72)
      .setOrigin(0, 0)
      .setDepth(4000)
      .setInteractive();

    this.add.rectangle(width / 2, height / 2, 960, 520, 0x181411, 0.98)
      .setStrokeStyle(4, palette.border, 0.9)
      .setDepth(4001);

    this.add.text(width / 2, 135, this.mode === 'phone' ? 'Incoming call' : 'HQ response', {
      fontFamily: 'Special Elite',
      fontSize: '38px',
      color: palette.title
    })
      .setOrigin(0.5)
      .setDepth(4002);

    this.add.text(width / 2, 205, this.getSpeakerName(this.mode), {
      fontFamily: 'Special Elite',
      fontSize: '24px',
      color: palette.accent
    })
      .setOrigin(0.5)
      .setDepth(4002);

    this.add.text(width / 2, 305, lines.join('\n\n'), {
      fontFamily: 'Special Elite',
      fontSize: '28px',
      color: '#f4ead7',
      align: 'center',
      wordWrap: { width: 760 },
      lineSpacing: 10
    })
      .setOrigin(0.5)
      .setDepth(4002);

    const continueBtn = this.add.text(width / 2, 455, '[ CONTINUE ]', {
      fontFamily: 'Special Elite',
      fontSize: '30px',
      color: palette.buttonText,
      backgroundColor: '#2a221b',
      padding: { left: 18, right: 18, top: 10, bottom: 10 }
    })
      .setOrigin(0.5)
      .setDepth(4002)
      .setInteractive({ useHandCursor: true });

    continueBtn.on('pointerover', () => continueBtn.setColor('#ffffff'));
    continueBtn.on('pointerout', () => continueBtn.setColor(palette.buttonText));
    continueBtn.on('pointerdown', () => this.finishScene());

    this.input.keyboard?.once('keydown-SPACE', () => this.finishScene());
    this.input.keyboard?.once('keydown-ENTER', () => this.finishScene());
  }

  getSpeakerName(mode) {
    return mode === 'phone' ? 'Unknown Caller' : 'Chief Inspector';
  }

  getPalette(result) {
    const map = {
      exact: {
        border: 0x7cfc00,
        title: '#d8ffb8',
        accent: '#7CFC00',
        buttonText: '#d8ffb8'
      },
      close: {
        border: 0xd4af37,
        title: '#ffe6a3',
        accent: '#ffd966',
        buttonText: '#ffe6a3'
      },
      partial: {
        border: 0xc98732,
        title: '#ffd4a3',
        accent: '#ffb347',
        buttonText: '#ffd4a3'
      },
      weak: {
        border: 0xb85c5c,
        title: '#ffb3b3',
        accent: '#ff8f8f',
        buttonText: '#ffcccc'
      }
    };

    return map[result] || map.weak;
  }

  getDialogue(result, mode) {
    const linesByMode = {
      hq: {
        exact: [
          'Excellent work, detective.',
          'Your reconstruction matches our best read of the theft. Follow the suspect profile in your notes.'
        ],
        close: [
          'Good work. You are close.',
          'The pattern is there, but some part of the sequence still needs tightening.'
        ],
        partial: [
          'You found something useful.',
          'Part of your theory holds up, but HQ still sees gaps in the heist timeline.'
        ],
        weak: [
          'We logged your theory.',
          'Right now it sounds more like a hunch than a reconstruction. Keep digging.'
        ]
      },
      phone: {
        exact: [
          'Impressive. You understood exactly how the thief operated.',
          'If you keep this up, you will corner them soon.'
        ],
        close: [
          'Not bad. You are reading the thief well.',
          'But you are still one step behind the full picture.'
        ],
        partial: [
          'You noticed part of the trick.',
          'The rest is still hidden from you.'
        ],
        weak: [
          'Interesting theory, detective.',
          'But that version of events will not scare the thief yet.'
        ]
      }
    };

    return linesByMode[mode]?.[result] || linesByMode.hq.weak;
  }

  finishScene() {
    if (!gameState.reconstructedHeist || typeof gameState.reconstructedHeist !== 'object') {
      gameState.reconstructedHeist = {};
    }

    gameState.reconstructedHeist.resultCommentSeen = true;
    saveGameState();

    if (this.sourceScene && this.scene.isSleeping(this.sourceScene)) {
      this.scene.wake(this.sourceScene);
    }

    if (this.sourceScene && this.scene.isPaused(this.sourceScene)) {
      this.scene.resume(this.sourceScene);
    }

    this.scene.stop();
  }
}