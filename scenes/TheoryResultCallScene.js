import { gameState, saveGameState } from '../GameData.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';

export class TheoryResultCallScene extends BaseScene {
  constructor() {
    super('TheoryResultCallScene');

    this.sourceScene = 'CityScene';
    this.mode = 'hq';
    this.result = 'weak';

    this.overlay = null;
    this.panel = null;
    this.headerText = null;
    this.speakerText = null;
    this.bodyText = null;
    this.continueBtn = null;
    this.hintText = null;

    this.layout = null;
    this._resizeBound = false;
    this._finished = false;

    this.handleResizeBound = null;
    this.handleContinueBound = null;
    this.handleSpaceBound = null;
    this.handleEnterBound = null;
  }

  init(data = {}) {
    this.sourceScene = data.sourceScene || 'CityScene';
    this.mode = data.mode || 'hq';
    this.result =
      data.result ||
      gameState.reconstructedHeist?.playerTheoryResult ||
      'weak';

    this.overlay = null;
    this.panel = null;
    this.headerText = null;
    this.speakerText = null;
    this.bodyText = null;
    this.continueBtn = null;
    this.hintText = null;

    this.layout = null;
    this._resizeBound = false;
    this._finished = false;

    this.handleResizeBound = null;
    this.handleContinueBound = null;
    this.handleSpaceBound = null;
    this.handleEnterBound = null;
  }

  create() {
        super.create();
        EventBus.emit('hideHUD');
    const { width, height } = this.scale;
    const palette = this.getPalette(this.result);
    const lines = this.getDialogue(this.result, this.mode);

    this.overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.72)
      .setOrigin(0, 0)
      .setDepth(4000)
      .setInteractive();

    this.panel = this.add.rectangle(width / 2, height / 2, 960, 520, 0x181411, 0.98)
      .setStrokeStyle(4, palette.border, 0.9)
      .setDepth(4001);

    this.headerText = this.add.text(0, 0, this.mode === 'phone' ? 'Encrypted call' : 'HQ assessment', {
      fontFamily: 'Special Elite',
      fontSize: '38px',
      color: palette.title,
      align: 'center'
    }).setOrigin(0.5).setDepth(4002);

    this.speakerText = this.add.text(0, 0, this.getSpeakerName(this.mode), {
      fontFamily: 'Special Elite',
      fontSize: '24px',
      color: palette.accent,
      align: 'center'
    }).setOrigin(0.5).setDepth(4002);

    this.bodyText = this.add.text(0, 0, lines.join('\n\n'), {
      fontFamily: 'Special Elite',
      fontSize: '28px',
      color: '#f4ead7',
      align: 'center',
      wordWrap: { width: 760, useAdvancedWrap: true },
      lineSpacing: 10
    }).setOrigin(0.5).setDepth(4002);

    this.continueBtn = this.add.text(0, 0, '[ CONTINUE ]', {
      fontFamily: 'Special Elite',
      fontSize: '30px',
      color: palette.buttonText,
      backgroundColor: '#2a221b',
      padding: { left: 18, right: 18, top: 10, bottom: 10 }
    }).setOrigin(0.5).setDepth(4002).setInteractive({ useHandCursor: true });

    this.hintText = this.add.text(0, 0, 'Tap anywhere or press Enter / Space', {
      fontFamily: 'Special Elite',
      fontSize: '16px',
      color: '#ccb98c',
      align: 'center'
    }).setOrigin(0.5).setDepth(4002);

    this.handleContinueBound = () => this.finishScene();
    this.handleSpaceBound = () => this.finishScene();
    this.handleEnterBound = () => this.finishScene();

    this.overlay.on('pointerup', this.handleContinueBound);
    this.continueBtn.on('pointerover', () => this.continueBtn.setColor('#ffffff'));
    this.continueBtn.on('pointerout', () => {
      if (this.continueBtn) {
        this.continueBtn.setColor(palette.buttonText);
      }
    });
    this.continueBtn.on('pointerup', this.handleContinueBound);

    this.input.keyboard?.once('keydown-SPACE', this.handleSpaceBound);
    this.input.keyboard?.once('keydown-ENTER', this.handleEnterBound);

    this.bindResize();
    this.applyResponsiveLayout();

    this.tweens.add({
      targets: [this.panel, this.headerText, this.speakerText, this.bodyText, this.continueBtn, this.hintText],
      alpha: { from: 0, to: 1 },
      duration: 160,
      ease: 'Quad.easeOut'
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  getLayout() {
    const { width, height } = this.scale;
    const isMobile = width <= 900;

    const panelWidth = Math.min(width - 28, isMobile ? 700 : 960);
    const panelHeight = Math.min(height - 28, isMobile ? 700 : 520);
    const panelX = width / 2;
    const panelY = height / 2;
    const panelTop = panelY - panelHeight / 2;
    const panelBottom = panelY + panelHeight / 2;

    const headerY = panelTop + (isMobile ? 58 : 64);
    const speakerY = headerY + (isMobile ? 54 : 70);
    const bodyY = panelY + (isMobile ? 6 : 8);
    const continueY = panelBottom - (isMobile ? 86 : 80);
    const hintY = continueY + 48;

    return {
      width,
      height,
      isMobile,
      panelWidth,
      panelHeight,
      panelX,
      panelY,
      panelTop,
      panelBottom,
      headerY,
      speakerY,
      bodyY,
      continueY,
      hintY,
      headerWrap: Math.max(220, panelWidth - 70),
      speakerWrap: Math.max(220, panelWidth - 90),
      bodyWrap: Math.max(220, panelWidth - (isMobile ? 70 : 120))
    };
  }

  applyResponsiveLayout() {
    this.layout = this.getLayout();
    const L = this.layout;

    this.overlay.setSize(L.width, L.height).setPosition(0, 0);
    this.panel.setPosition(L.panelX, L.panelY).setSize(L.panelWidth, L.panelHeight);

    this.headerText.setPosition(L.panelX, L.headerY);
    this.headerText.setFontSize(L.isMobile ? '28px' : '38px');
    this.headerText.setWordWrapWidth(L.headerWrap, true);

    this.speakerText.setPosition(L.panelX, L.speakerY);
    this.speakerText.setFontSize(L.isMobile ? '20px' : '24px');
    this.speakerText.setWordWrapWidth(L.speakerWrap, true);

    this.bodyText.setPosition(L.panelX, L.bodyY);
    this.bodyText.setFontSize(L.isMobile ? '22px' : '28px');
    this.bodyText.setWordWrapWidth(L.bodyWrap, true);
    this.bodyText.setLineSpacing(L.isMobile ? 8 : 10);

    this.continueBtn.setPosition(L.panelX, L.continueY);
    this.continueBtn.setFontSize(L.isMobile ? '24px' : '30px');

    this.hintText.setPosition(L.panelX, L.hintY);
    this.hintText.setFontSize(L.isMobile ? '13px' : '16px');
    this.hintText.setWordWrapWidth(L.bodyWrap, true);
  }

  bindResize() {
    if (this._resizeBound) return;
    this._resizeBound = true;

    this.handleResizeBound = this.handleResize.bind(this);
    this.scale.on('resize', this.handleResizeBound, this);
  }

  handleResize() {
    this.applyResponsiveLayout();
  }

getSpeakerName(mode) {
  return mode === 'phone' ? 'Filtered Voice' : 'HQ Assessment';
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
    if (this._finished) return;
    this._finished = true;

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

  onShutdown() {
    if (this.handleResizeBound) {
      this.scale.off('resize', this.handleResizeBound, this);
    }

    if (this.overlay && this.handleContinueBound) {
      this.overlay.off('pointerup', this.handleContinueBound);
    }

    if (this.continueBtn) {
      this.continueBtn.removeAllListeners();
    }

    if (this.input.keyboard && this.handleSpaceBound) {
      this.input.keyboard.off('keydown-SPACE', this.handleSpaceBound);
    }

    if (this.input.keyboard && this.handleEnterBound) {
      this.input.keyboard.off('keydown-ENTER', this.handleEnterBound);
    }

    [
      this.overlay,
      this.panel,
      this.headerText,
      this.speakerText,
      this.bodyText,
      this.continueBtn,
      this.hintText
    ].forEach(item => {
      if (item?.removeAllListeners) item.removeAllListeners();
      if (item?.destroy) item.destroy();
    });

    this.overlay = null;
    this.panel = null;
    this.headerText = null;
    this.speakerText = null;
    this.bodyText = null;
    this.continueBtn = null;
    this.hintText = null;

    this.layout = null;
    this._resizeBound = false;
  }
}