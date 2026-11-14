import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
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
    this._hudHidden = false;

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
    this._hudHidden = false;

    this.handleResizeBound = null;
    this.handleContinueBound = null;
    this.handleSpaceBound = null;
    this.handleEnterBound = null;
  }

  create() {
    super.create();

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.onShutdown,
      this
    );

    this._hudHidden = true;
    EventBus.emit('hideHUD');

    const { width, height } = this.scale;
    const palette = this.getPalette(this.result);
    const lines = this.getDialogue(this.result, this.mode);

    this.overlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.72)
      .setOrigin(0, 0)
      .setDepth(4000)
      .setInteractive();

    this.panel = this.add
      .rectangle(
        width / 2,
        height / 2,
        960,
        520,
        0x181411,
        0.98
      )
      .setStrokeStyle(4, palette.border, 0.9)
      .setDepth(4001);

    this.headerText = this.add
      .text(
        0,
        0,
        this.mode === __dialogueText("scenes/TheoryResultCallScene.js", "t_45569da57f4b7bf472d7") ? __dialogueText("scenes/TheoryResultCallScene.js", "t_0ce130cd8a988f5c7e19") : __dialogueText("scenes/TheoryResultCallScene.js", "t_5b79ac69ac12b539191d"),
        {
          fontFamily: 'SpecialElite',
          fontSize: '38px',
          color: palette.title,
          align: 'center'
        }
      )
      .setOrigin(0.5)
      .setDepth(4002);

    this.speakerText = this.add
      .text(0, 0, this.getSpeakerName(this.mode), {
        fontFamily: 'SpecialElite',
        fontSize: '24px',
        color: palette.accent,
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(4002);

    this.bodyText = this.add
      .text(0, 0, lines.join(__dialogueText("scenes/TheoryResultCallScene.js", "t_75a11da44c802486bc6f")), {
        fontFamily: 'SpecialElite',
        fontSize: '28px',
        color: '#f4ead7',
        align: 'center',
        wordWrap: {
          width: 760,
          useAdvancedWrap: true
        },
        lineSpacing: 10
      })
      .setOrigin(0.5)
      .setDepth(4002);

    this.continueBtn = this.add
      .text(0, 0, __dialogueText("scenes/TheoryResultCallScene.js", "t_50f34a845279312ca4b6"), {
        fontFamily: 'SpecialElite',
        fontSize: '30px',
        color: palette.buttonText,
        backgroundColor: '#2a221b',
        padding: {
          left: 18,
          right: 18,
          top: 10,
          bottom: 10
        }
      })
      .setOrigin(0.5)
      .setDepth(4002)
      .setInteractive({ useHandCursor: true });

    this.hintText = this.add
      .text(0, 0, __dialogueText("scenes/TheoryResultCallScene.js", "t_e769998298e9e8e749f9"), {
        fontFamily: 'SpecialElite',
        fontSize: '16px',
        color: '#ccb98c',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(4002);

    this.handleContinueBound = () => this.finishScene();
    this.handleSpaceBound = () => this.finishScene();
    this.handleEnterBound = () => this.finishScene();

    this.overlay.on('pointerup', this.handleContinueBound);

    this.continueBtn.on('pointerover', () => {
      this.continueBtn?.setColor('#ffffff');
    });

    this.continueBtn.on('pointerout', () => {
      this.continueBtn?.setColor(palette.buttonText);
    });

    this.continueBtn.on('pointerup', this.handleContinueBound);

    this.input.keyboard?.once(
      'keydown-SPACE',
      this.handleSpaceBound
    );

    this.input.keyboard?.once(
      'keydown-ENTER',
      this.handleEnterBound
    );

    this.bindResize();
    this.applyResponsiveLayout();

    this.createTrackedTween({
      targets: [
        this.panel,
        this.headerText,
        this.speakerText,
        this.bodyText,
        this.continueBtn,
        this.hintText
      ],
      alpha: { from: 0, to: 1 },
      duration: 160,
      ease: 'Quad.easeOut'
    });
  }

  restoreHud() {
    if (!this._hudHidden) return;

    this._hudHidden = false;
    EventBus.emit('showHUD');
  }

  getLayout() {
    const { width, height } = this.scale;
    const isMobile = width <= 900;

    const panelWidth = Math.min(
      width - 28,
      isMobile ? 700 : 960
    );

    const panelHeight = Math.min(
      height - 28,
      isMobile ? 700 : 520
    );

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
      bodyWrap: Math.max(
        220,
        panelWidth - (isMobile ? 70 : 120)
      )
    };
  }

  applyResponsiveLayout() {
    this.layout = this.getLayout();
    const L = this.layout;

    this.overlay
      .setSize(L.width, L.height)
      .setPosition(0, 0);

    this.panel
      .setPosition(L.panelX, L.panelY)
      .setSize(L.panelWidth, L.panelHeight);

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
    return mode === 'phone'
      ? __dialogueText("scenes/TheoryResultCallScene.js", "t_ec8e9ce1548e37725803")
      : __dialogueText("scenes/TheoryResultCallScene.js", "t_4da03755c614084cbee4");
  }

  getPalette(result) {
    const map = {
      exact: {
        border: 0x7cfc00,
        title: __dialogueText("scenes/TheoryResultCallScene.js", "t_07e2eb9fd5735102902e"),
        accent: '#7CFC00',
        buttonText: '#d8ffb8'
      },
      close: {
        border: 0xd4af37,
        title: __dialogueText("scenes/TheoryResultCallScene.js", "t_be0f3b849156ddc4795b"),
        accent: '#ffd966',
        buttonText: '#ffe6a3'
      },
      partial: {
        border: 0xc98732,
        title: __dialogueText("scenes/TheoryResultCallScene.js", "t_b18167e3f3f116ecc71b"),
        accent: '#ffb347',
        buttonText: '#ffd4a3'
      },
      weak: {
        border: 0xb85c5c,
        title: __dialogueText("scenes/TheoryResultCallScene.js", "t_67f0c667a89e3ff3f3e3"),
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
          __dialogueText("scenes/TheoryResultCallScene.js", "t_dfda1c7c435b429f8d67"),
          __dialogueText("scenes/TheoryResultCallScene.js", "t_db7bc64955c1cf9de807")
        ],
        close: [
          __dialogueText("scenes/TheoryResultCallScene.js", "t_6cd90eeee53c54a32671"),
          __dialogueText("scenes/TheoryResultCallScene.js", "t_a1a016e36f5f752531f9")
        ],
        partial: [
          __dialogueText("scenes/TheoryResultCallScene.js", "t_c1923ce679a2643ee8e2"),
          __dialogueText("scenes/TheoryResultCallScene.js", "t_2f15bf559a1307b6c28b")
        ],
        weak: [
          __dialogueText("scenes/TheoryResultCallScene.js", "t_3844e63e0672c20b5cfc"),
          __dialogueText("scenes/TheoryResultCallScene.js", "t_84a1d1c2035afb2618a5")
        ]
      },
      phone: {
        exact: [
          __dialogueText("scenes/TheoryResultCallScene.js", "t_dfb796d7867074c9a0e6"),
          __dialogueText("scenes/TheoryResultCallScene.js", "t_79cdeb4c029e52e9b6ce")
        ],
        close: [
          __dialogueText("scenes/TheoryResultCallScene.js", "t_436b03754f2e0e037b92"),
          __dialogueText("scenes/TheoryResultCallScene.js", "t_ea9df2c41fef51f2ed4d")
        ],
        partial: [
          __dialogueText("scenes/TheoryResultCallScene.js", "t_03d1d231368251ed520f"),
          __dialogueText("scenes/TheoryResultCallScene.js", "t_22b4afc350300e4a098c")
        ],
        weak: [
          __dialogueText("scenes/TheoryResultCallScene.js", "t_eb204828f8ccf3f831ff"),
          __dialogueText("scenes/TheoryResultCallScene.js", "t_8c5b113d70ceac8f1c97")
        ]
      }
    };

    return linesByMode[mode]?.[result] || linesByMode.hq.weak;
  }

  finishScene() {
    if (this._finished) return;

    this._finished = true;

    if (
      !gameState.reconstructedHeist ||
      typeof gameState.reconstructedHeist !== 'object'
    ) {
      gameState.reconstructedHeist = {};
    }

    gameState.reconstructedHeist.resultCommentSeen = true;
    saveGameState();

    if (this.hasScene(this.sourceScene)) {
      if (this.isSceneSleeping(this.sourceScene)) {
        this.scene.wake(this.sourceScene);
      }

      if (this.isScenePaused(this.sourceScene)) {
        this.scene.resume(this.sourceScene);
      }
    }

    this.restoreHud();
    this.scene.stop();
  }

  onShutdown() {
    this.restoreHud();

    if (this.handleResizeBound) {
      this.scale.off('resize', this.handleResizeBound, this);
    }

    if (this.overlay && this.handleContinueBound) {
      this.overlay.off('pointerup', this.handleContinueBound);
    }

    this.continueBtn?.removeAllListeners();

    if (this.input.keyboard && this.handleSpaceBound) {
      this.input.keyboard.off(
        'keydown-SPACE',
        this.handleSpaceBound
      );
    }

    if (this.input.keyboard && this.handleEnterBound) {
      this.input.keyboard.off(
        'keydown-ENTER',
        this.handleEnterBound
      );
    }

    [
      this.overlay,
      this.panel,
      this.headerText,
      this.speakerText,
      this.bodyText,
      this.continueBtn,
      this.hintText
    ].forEach((item) => {
      item?.removeAllListeners?.();
      item?.destroy?.();
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

    this.handleResizeBound = null;
    this.handleContinueBound = null;
    this.handleSpaceBound = null;
    this.handleEnterBound = null;
  }
}