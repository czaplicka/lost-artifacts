import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { ensureHud } from '../hudHelpers.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';

import {
  getRandomSuspectLineup,
  isCorrectSuspectChoice,
  getSuspectImageKey
} from '../suspects/suspectHelpers.js';

export class ArrestSelectionScene extends BaseScene {
  constructor() {
    super({ key: 'ArrestSelectionScene' });

    this.dialogueText = null;
    this.resultOverlay = null;
    this.resultTitle = null;
    this.resultText = null;

    this.nextSceneKey = 'GameOverScene';
    this.isLeaving = false;

    this.selectedSuspectId = null;
    this.suspectsPool = [];
    this.displaySuspects = [];

    this.selectionLocked = false;
    this.resultCommitted = false;
    this.currentSuspectIndex = 0;
    this.currentCard = null;
    this.isAnimatingSlide = false;

    this.overlayRoot = null;
    this.viewerRoot = null;
    this.cardSlot = null;

    this.leftArrow = null;
    this.rightArrow = null;
    this.arrestButton = null;
    this.arrestButtonText = null;
    this.dotsText = null;
    this.counterText = null;

    this.backBtn = null;
    this.backBtnLabel = null;

    this.zoomOverlay = null;
    this.zoomImage = null;
    this.zoomHintText = null;

    this.caseNumberText = null;
    this.statusStampText = null;
    this.bottomNoteText = null;
    this.suspectLabelText = null;

    this.onLeftKeyDown = null;
    this.onRightKeyDown = null;
    this.onEnterKeyDown = null;
  }

  init() {
    this.selectedSuspectId = null;
    this.suspectsPool = [];
    this.displaySuspects = [];

    this.selectionLocked = false;
    this.resultCommitted = false;
    this.currentSuspectIndex = 0;
    this.currentCard = null;
    this.isAnimatingSlide = false;

    this.nextSceneKey = 'GameOverScene';
    this.isLeaving = false;

    this.dialogueText = null;
    this.resultOverlay = null;
    this.resultTitle = null;
    this.resultText = null;

    this.overlayRoot = null;
    this.viewerRoot = null;
    this.cardSlot = null;

    this.leftArrow = null;
    this.rightArrow = null;
    this.arrestButton = null;
    this.arrestButtonText = null;
    this.dotsText = null;
    this.counterText = null;

    this.backBtn = null;
    this.backBtnLabel = null;

    this.zoomOverlay = null;
    this.zoomImage = null;
    this.zoomHintText = null;

    this.caseNumberText = null;
    this.statusStampText = null;
    this.bottomNoteText = null;
    this.suspectLabelText = null;

    this.onLeftKeyDown = null;
    this.onRightKeyDown = null;
    this.onEnterKeyDown = null;
  }

  create() {
    super.create();

    audioManager.stopSfx();
    audioManager.stopAllMusic();

    ensureHud(this);
    this.closeAllUIPanels();

    EventBus.emit('hideHUD');

    const hud = this.scene.manager.keys.PlayerHudScene;
    hud?.hideHud?.();

    const newsHud = this.scene.manager.keys.NewsHud;
    newsHud?.events?.emit('setNewspaperVisible', false);
    newsHud?.events?.emit('setTvVisible', false);

    if (!gameState.arrestWarrantIssued) {
      gameState.finalArrestSuspectId = null;
      gameState.finalArrestResult = 'FAILURE';
      gameState.caseResolved = false;
      gameState.caseFailed = true;
      gameState.isGameActive = false;

      gameState.gameOverReason =
        'Without a signed warrant, the agency could not act in time. ' +
        'The thief escaped before the arrest team arrived.';

      saveGameState();

      this.scene.stop('CityScene');

      this.goto('GameOverScene', {
        title: 'THIEF ESCAPED',
        reasonCode: 'missing_warrant',
        caseId: gameState.currentCaseId,
        message: gameState.gameOverReason
      });

      return;
    }

    const suspectsData = this.cache.json.get('suspects');

    if (
      !Array.isArray(suspectsData) ||
      suspectsData.length < 5
    ) {
      console.error(
        'suspects.json must contain at least 5 suspects.'
      );

      this.goto('GameScene');
      return;
    }

    const thiefId =
      gameState.currentThief?.id ??
      gameState.currentThiefId;

    if (thiefId == null) {
      console.error('Missing current thief in gameState.');

      this.goto('GameScene');
      return;
    }

    this.suspectsPool = suspectsData;

    try {
      this.displaySuspects = getRandomSuspectLineup(
        suspectsData,
        thiefId,
        5
      );
    } catch (error) {
      console.error(
        '[ArrestSelectionScene] Could not prepare the final suspect dossier:',
        error
      );

      this.goto('GameScene', {
        arrestSetupFailed: true,
        errorMessage:
          'The suspect dossier could not be prepared. ' +
          'Return to headquarters and review the case file.'
      });

      return;
    }

    this.createBackdrop();
    this.createBackButton();
    this.createHeader();
    this.createInstructionBox();
    this.createDossierViewer();
    this.createResultOverlay();
    this.registerSceneCleanup();
  }

  registerSceneCleanup() {
    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      () => {
        if (this.input?.keyboard) {
          if (this.onLeftKeyDown) {
            this.input.keyboard.off(
              'keydown-LEFT',
              this.onLeftKeyDown
            );
          }

          if (this.onRightKeyDown) {
            this.input.keyboard.off(
              'keydown-RIGHT',
              this.onRightKeyDown
            );
          }

          if (this.onEnterKeyDown) {
            this.input.keyboard.off(
              'keydown-ENTER',
              this.onEnterKeyDown
            );
          }
        }

        this.onLeftKeyDown = null;
        this.onRightKeyDown = null;
        this.onEnterKeyDown = null;
      }
    );
  }

  createBackdrop() {
    const { width, height } = this.scale;

    this.overlayRoot = this.add
      .container(0, 0)
      .setDepth(300);

    const vignette = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x120d07,
      0.63
    );

    const outerShadow = this.add.rectangle(
      width / 2,
      height / 2 + 14,
      1600,
      1010,
      0x000000,
      0.28
    );

    const dossierPaper = this.add
      .rectangle(
        width / 2,
        height / 2 + 6,
        1540,
        980,
        0xc7ad73,
        0.96
      )
      .setStrokeStyle(5, 0x4a3720, 1);

    const dossierInner = this.add
      .rectangle(
        width / 2,
        height / 2 + 6,
        1485,
        930,
        0xd7bf89,
        0.78
      )
      .setStrokeStyle(2, 0x7a5a34, 0.95);

    const topStrip = this.add.rectangle(
      width / 2,
      92,
      1485,
      108,
      0x5a4121,
      0.95
    );

    const topStripLine = this.add.rectangle(
      width / 2,
      142,
      1485,
      3,
      0xe8d3a0,
      0.95
    );

    const bottomStrip = this.add.rectangle(
      width / 2,
      height - 82,
      1485,
      72,
      0x5a4121,
      0.95
    );

    this.overlayRoot.add([
      vignette,
      outerShadow,
      dossierPaper,
      dossierInner,
      topStrip,
      topStripLine,
      bottomStrip
    ]);
  }

  createBackButton() {
    const baseX = 165;
    const baseY = 82;

    if (this.textures.exists('back')) {
      this.backBtn = this.add
        .image(baseX, baseY, 'back')
        .setInteractive({ useHandCursor: true })
        .setScale(0.42)
        .setDepth(320);

      this.addHoverEffect(
        this.backBtn,
        0.42,
        0.48
      );
    } else {
      this.backBtn = this.add
        .text(baseX, baseY, '<', {
          fontFamily: 'PressStart2P',
          fontSize: '22px',
          color: '#f6e7bc',
          backgroundColor: '#3a2916'
        })
        .setOrigin(0.5)
        .setPadding(12)
        .setInteractive({ useHandCursor: true })
        .setDepth(320);

      this.backBtn.on('pointerover', () => {
        this.backBtn.setScale(1.06);
      });

      this.backBtn.on('pointerout', () => {
        this.backBtn.setScale(1);
      });
    }

    this.backBtnLabel = this.add
      .text(baseX + 70, baseY, 'BACK', {
        fontFamily: 'SpecialElite',
        fontSize: '24px',
        color: '#f5e7bf'
      })
      .setOrigin(0, 0.5)
      .setDepth(320);

    this.backBtn.on('pointerdown', () => {
      if (
        this.selectionLocked ||
        this.isAnimatingSlide ||
        this.isLeaving
      ) {
        return;
      }

      this.isLeaving = true;

      this.closeAllUIPanels();
      this.closeZoom();

      this.scene.stop('ArrestSelectionScene');
      this.scene.resume('CityScene');
    });
  }

  createHeader() {
    const { width } = this.scale;

    this.add
      .text(width / 2, 64, 'MARK AGENCY', {
        fontFamily: 'PressStart2P',
        fontSize: '16px',
        color: '#f5e8b8',
        stroke: '#2e1f10',
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(320);

    this.add
      .text(width / 2, 108, 'SUSPECT DOSSIER', {
        fontFamily: 'SpecialElite',
        fontSize: '28px',
        color: '#f4ddb2'
      })
      .setOrigin(0.5)
      .setDepth(320);

    const caseId =
      gameState.currentCaseId ??
      gameState.caseId ??
      '017';

    const caseNumber =
      `CASE FILE ${String(caseId).padStart(3, '0')}`;

    this.caseNumberText = this.add
      .text(width - 265, 76, caseNumber, {
        fontFamily: 'PressStart2P',
        fontSize: '14px',
        color: '#fff4cf',
        backgroundColor: '#6e1f17',
        padding: {
          left: 10,
          right: 10,
          top: 8,
          bottom: 8
        }
      })
      .setOrigin(0.5)
      .setDepth(321);

    this.statusStampText = this.add
      .text(width - 265, 118, 'TOP PRIORITY', {
        fontFamily: 'SpecialElite',
        fontSize: '24px',
        color: '#6e1f17',
        stroke: '#f7dfb2',
        strokeThickness: 1
      })
      .setOrigin(0.5)
      .setAlpha(0.95)
      .setRotation(-0.08)
      .setDepth(321);
  }

  createInstructionBox() {
    const x = 230;
    const y = 792;
    const w = 1440;
    const h = 126;

    const panel = this.add.graphics().setDepth(320);

    panel.fillStyle(0xecd6a6, 0.9);
    panel.fillRoundedRect(x, y, w, h, 14);

    panel.lineStyle(3, 0x6a4a26, 1);
    panel.strokeRoundedRect(x, y, w, h, 14);

    panel.lineStyle(1, 0x8d6a3a, 0.8);
    panel.strokeRoundedRect(
      x + 10,
      y + 10,
      w - 20,
      h - 20,
      10
    );

    this.add
      .text(x + 30, y + 18, 'FIELD NOTES', {
        fontFamily: 'PressStart2P',
        fontSize: '14px',
        color: '#4f3218'
      })
      .setDepth(321);

    this.dialogueText = this.add
      .text(
        x + 34,
        y + 46,
        'Review each dossier entry. Use arrows to inspect suspects, ' +
          'click the photograph to enlarge it, and confirm the arrest ' +
          'when you are ready to submit your decision.',
        {
          fontFamily: 'SpecialElite',
          fontSize: '24px',
          color: '#332012',
          wordWrap: { width: 1280 },
          lineSpacing: 6
        }
      )
      .setDepth(321);

    this.bottomNoteText = this.add
      .text(
        x + w - 34,
        y + h - 12,
        'Cross-check means, motive, and opportunity before arrest.',
        {
          fontFamily: 'SpecialElite',
          fontSize: '18px',
          color: '#6b4d2e'
        }
      )
      .setOrigin(1, 1)
      .setDepth(321);
  }

  createDossierViewer() {
    const cx = this.scale.width / 2;
    const cy = 410;

    this.viewerRoot = this.add
      .container(cx, cy)
      .setDepth(320);

    const leftPanel = this.add
      .rectangle(
        -455,
        -10,
        245,
        610,
        0xe8cf99,
        0.92
      )
      .setStrokeStyle(3, 0x6a4a26, 1);

    const centerPanel = this.add
      .rectangle(
        20,
        -10,
        790,
        610,
        0xf0ddb2,
        0.94
      )
      .setStrokeStyle(4, 0x5b3e20, 1);

    const rightPanel = this.add
      .rectangle(
        500,
        -10,
        255,
        610,
        0xe8cf99,
        0.92
      )
      .setStrokeStyle(3, 0x6a4a26, 1);

    const leftHeader = this.add
      .text(-455, -268, 'CASE SUMMARY', {
        fontFamily: 'PressStart2P',
        fontSize: '14px',
        color: '#4a2e17'
      })
      .setOrigin(0.5);

    const leftBody = this.add.text(
      -555,
      -224,
      [
        '• Final suspect lineup',
        '• Review facial match',
        '• Confirm evidence trail',
        '• Verify suspect profile',
        '',
        'Submit one suspect',
        'for detention.'
      ].join('\n'),
      {
        fontFamily: 'SpecialElite',
        fontSize: '22px',
        color: '#392113',
        lineSpacing: 7,
        wordWrap: { width: 190 }
      }
    );

    const rightHeader = this.add
      .text(500, -268, 'ARREST PROTOCOL', {
        fontFamily: 'PressStart2P',
        fontSize: '14px',
        color: '#4a2e17'
      })
      .setOrigin(0.5);

    const rightBody = this.add.text(
      395,
      -224,
      [
        '1. Inspect photo',
        '2. Compare with clues',
        '3. Review all files',
        '4. Submit arrest order',
        '',
        'The bureau will review',
        'the case after detention.'
      ].join('\n'),
      {
        fontFamily: 'SpecialElite',
        fontSize: '21px',
        color: '#392113',
        lineSpacing: 7,
        wordWrap: { width: 200 }
      }
    );

    this.cardSlot = this.add.container(20, -35);

    this.suspectLabelText = this.add
      .text(20, 220, '', {
        fontFamily: 'SpecialElite',
        fontSize: '24px',
        color: '#5a3b21',
        align: 'center',
        wordWrap: { width: 540 }
      })
      .setOrigin(0.5);

    this.counterText = this.add
      .text(20, 252, '', {
        fontFamily: 'PressStart2P',
        fontSize: '14px',
        color: '#6e1f17',
        align: 'center'
      })
      .setOrigin(0.5);

    this.dotsText = this.add
      .text(20, 284, '', {
        fontFamily: 'PressStart2P',
        fontSize: '18px',
        color: '#4a2e17',
        align: 'center'
      })
      .setOrigin(0.5);

    this.leftArrow = this.add
      .text(-255, 252, '<', {
        fontFamily: 'PressStart2P',
        fontSize: '34px',
        color: '#fff3d0',
        backgroundColor: '#57391d'
      })
      .setOrigin(0.5)
      .setPadding(14)
      .setInteractive({ useHandCursor: true });

    this.rightArrow = this.add
      .text(295, 252, '>', {
        fontFamily: 'PressStart2P',
        fontSize: '34px',
        color: '#fff3d0',
        backgroundColor: '#57391d'
      })
      .setOrigin(0.5)
      .setPadding(14)
      .setInteractive({ useHandCursor: true });

    this.arrestButton = this.add
      .rectangle(
        500,
        214,
        190,
        56,
        0x7b241c,
        1
      )
      .setStrokeStyle(3, 0xf7e6bc, 1)
      .setInteractive({ useHandCursor: true });

    this.arrestButtonText = this.add
      .text(500, 214, 'ARREST', {
        fontFamily: 'PressStart2P',
        fontSize: '16px',
        color: '#fff7de'
      })
      .setOrigin(0.5);

    const stamp = this.add
      .text(500, 282, 'AUTHORIZED SIGN-OFF', {
        fontFamily: 'SpecialElite',
        fontSize: '20px',
        color: '#6f4f30'
      })
      .setOrigin(0.5)
      .setRotation(-0.04);

    this.leftArrow.on('pointerover', () => {
      if (this.canNavigate()) {
        this.leftArrow.setScale(1.06);
      }
    });

    this.leftArrow.on('pointerout', () => {
      this.leftArrow.setScale(1);
    });

    this.rightArrow.on('pointerover', () => {
      if (this.canNavigate()) {
        this.rightArrow.setScale(1.06);
      }
    });

    this.rightArrow.on('pointerout', () => {
      this.rightArrow.setScale(1);
    });

    this.leftArrow.on('pointerdown', () => {
      if (!this.canNavigate()) return;
      this.changeSuspect(-1);
    });

    this.rightArrow.on('pointerdown', () => {
      if (!this.canNavigate()) return;
      this.changeSuspect(1);
    });

    this.arrestButton.on('pointerover', () => {
      if (!this.selectionLocked) {
        this.arrestButton.setFillStyle(0x983128, 1);
      }
    });

    this.arrestButton.on('pointerout', () => {
      if (!this.selectionLocked) {
        this.arrestButton.setFillStyle(0x7b241c, 1);
      }
    });

    this.arrestButton.on('pointerdown', () => {
      if (
        !this.canNavigate() ||
        this.resultCommitted
      ) {
        return;
      }

      const suspect =
        this.displaySuspects[this.currentSuspectIndex];

      if (!suspect) return;

      this.selectionLocked = true;
      this.selectedSuspectId = suspect.id;

      this.disableNavigation();

      this.arrestButton.disableInteractive();
      this.arrestButton.setFillStyle(0x555555, 1);
      this.arrestButtonText.setAlpha(0.7);

      this.dialogueText.setText(
        'Arrest order submitted. The team is proceeding with detention...'
      );

      this.bottomNoteText.setText(
        'The case will be reviewed after the suspect is detained.'
      );

      if (this.currentCard?.frame) {
        this.currentCard.frame.setStrokeStyle(
          5,
          0x6e1f17,
          1
        );
      }

      this.time.delayedCall(
        220,
        () => this.confirmSelection()
      );
    });

    this.viewerRoot.add([
      leftPanel,
      centerPanel,
      rightPanel,
      leftHeader,
      leftBody,
      rightHeader,
      rightBody,
      this.cardSlot,
      this.suspectLabelText,
      this.counterText,
      this.dotsText,
      this.leftArrow,
      this.rightArrow,
      this.arrestButton,
      this.arrestButtonText,
      stamp
    ]);

    this.onLeftKeyDown = () => {
      if (this.canNavigate()) {
        this.changeSuspect(-1);
      }
    };

    this.onRightKeyDown = () => {
      if (this.canNavigate()) {
        this.changeSuspect(1);
      }
    };

    this.onEnterKeyDown = () => {
      if (this.canNavigate()) {
        this.arrestButton.emit('pointerdown');
      }
    };

    this.input.keyboard?.on(
      'keydown-LEFT',
      this.onLeftKeyDown
    );

    this.input.keyboard?.on(
      'keydown-RIGHT',
      this.onRightKeyDown
    );

    this.input.keyboard?.on(
      'keydown-ENTER',
      this.onEnterKeyDown
    );

    this.currentCard = this.buildSuspectCard(
      this.displaySuspects[this.currentSuspectIndex],
      0
    );

    this.cardSlot.add(this.currentCard);

    this.updatePagination();
    this.createZoomOverlay();
  }

  buildSuspectCard(suspect, offsetX = 0) {
    const container = this.add.container(offsetX, 0);

    const frameShadow = this.add.rectangle(
      6,
      8,
      670,
      430,
      0x000000,
      0.16
    );

    const frame = this.add
      .rectangle(0, 0, 670, 430, 0xf5e4bc, 1)
      .setStrokeStyle(4, 0x5d4022, 1);

    const innerFrame = this.add
      .rectangle(0, 0, 635, 395, 0xe6cb95, 0.9)
      .setStrokeStyle(2, 0x8b6840, 1);

    const mugshotFrame = this.add
      .rectangle(0, -42, 540, 240, 0x1e1a16, 1)
      .setStrokeStyle(3, 0x6e5433, 1);

    const imageKey = getSuspectImageKey(suspect);

    let portrait = null;
    let fallback = null;
    let fallbackText = null;

    if (
      imageKey &&
      this.textures.exists(imageKey)
    ) {
      portrait = this.add
        .image(0, -42, imageKey)
        .setDisplaySize(515, 220)
        .setInteractive({ useHandCursor: true });

      portrait.on('pointerdown', () => {
        this.openZoom(imageKey);
      });
    } else {
      fallback = this.add
        .rectangle(0, -42, 515, 220, 0x57514b, 1)
        .setStrokeStyle(2, 0xf5e4bc, 1);

      fallbackText = this.add
        .text(0, -42, 'PHOTO MISSING', {
          fontFamily: 'PressStart2P',
          fontSize: '18px',
          color: '#f7ebc6',
          align: 'center'
        })
        .setOrigin(0.5);
    }

    const pinLine = this.add.rectangle(
      0,
      -178,
      560,
      2,
      0x8b6840,
      0.75
    );

    const fileTitle = this.add
      .text(0, -198, 'SUSPECT PHOTOGRAPH', {
        fontFamily: 'PressStart2P',
        fontSize: '14px',
        color: '#51341b'
      })
      .setOrigin(0.5);

    const zoomHint = this.add
      .text(
        0,
        100,
        'Click photo to enlarge evidence image',
        {
          fontFamily: 'SpecialElite',
          fontSize: '20px',
          color: '#68482a'
        }
      )
      .setOrigin(0.5);

    const suspectNumber = this.add
      .text(
        0,
        138,
        `DOSSIER ENTRY ${this.currentSuspectIndex + 1}`,
        {
          fontFamily: 'PressStart2P',
          fontSize: '15px',
          color: '#6e1f17'
        }
      )
      .setOrigin(0.5);

    const summary = this.add
      .text(
        0,
        182,
        'Observe appearance, compare it with witness clues, ' +
          'then decide whether the file justifies an arrest.',
        {
          fontFamily: 'SpecialElite',
          fontSize: '22px',
          color: '#3c2614',
          align: 'center',
          wordWrap: { width: 560 }
        }
      )
      .setOrigin(0.5);

    const children = [
      frameShadow,
      frame,
      innerFrame,
      mugshotFrame,
      pinLine,
      fileTitle
    ];

    if (portrait) children.push(portrait);
    if (fallback) children.push(fallback);
    if (fallbackText) children.push(fallbackText);

    children.push(
      zoomHint,
      suspectNumber,
      summary
    );

    container.add(children);

    container.frame = frame;
    container.zoomHint = zoomHint;
    container.fileTitle = fileTitle;
    container.summary = summary;
    container.suspectId = suspect.id;

    return container;
  }

  createZoomOverlay() {
    const { width, height } = this.scale;

    this.zoomOverlay = this.add
      .container(0, 0)
      .setDepth(800)
      .setVisible(false);

    const bg = this.add
      .rectangle(
        width / 2,
        height / 2,
        width,
        height,
        0x120b06,
        0.94
      )
      .setInteractive({ useHandCursor: true });

    const board = this.add
      .rectangle(
        width / 2,
        height / 2,
        width * 0.84,
        height * 0.82,
        0xe8cf99,
        0.96
      )
      .setStrokeStyle(4, 0x5d4022, 1);

    const inner = this.add
      .rectangle(
        width / 2,
        height / 2,
        width * 0.8,
        height * 0.76,
        0xf3e0b6,
        1
      )
      .setStrokeStyle(2, 0x8b6840, 1);

    this.zoomImage = this.add
      .image(
        width / 2,
        height / 2 - 20,
        '__DEFAULT'
      )
      .setVisible(false);

    this.zoomHintText = this.add
      .text(
        width / 2,
        height - 82,
        'CLICK ANYWHERE TO CLOSE DOSSIER PHOTO',
        {
          fontFamily: 'PressStart2P',
          fontSize: '16px',
          color: '#fff4d6'
        }
      )
      .setOrigin(0.5);

    bg.on('pointerdown', () => this.closeZoom());

    this.zoomOverlay.add([
      bg,
      board,
      inner,
      this.zoomImage,
      this.zoomHintText
    ]);
  }

  openZoom(imageKey) {
    if (
      this.selectionLocked ||
      this.isAnimatingSlide ||
      this.isLeaving ||
      !imageKey ||
      !this.textures.exists(imageKey) ||
      !this.zoomOverlay ||
      !this.zoomImage
    ) {
      return;
    }

    const { width, height } = this.scale;

    const texture = this.textures
      .get(imageKey)
      .getSourceImage();

    if (!texture?.width || !texture?.height) {
      return;
    }

    const maxWidth = width * 0.68;
    const maxHeight = height * 0.62;

    const scale = Math.min(
      maxWidth / texture.width,
      maxHeight / texture.height
    );

    this.currentCard?.zoomHint?.setVisible(false);
    this.currentCard?.fileTitle?.setVisible(false);
    this.currentCard?.summary?.setVisible(false);
    this.dialogueText?.setVisible(false);
    this.bottomNoteText?.setVisible(false);

    this.zoomImage
      .setTexture(imageKey)
      .setDisplaySize(
        texture.width * scale,
        texture.height * scale
      )
      .setVisible(true);

    this.zoomOverlay.setVisible(true);
  }

  closeZoom() {
    if (!this.zoomOverlay) return;

    this.zoomOverlay.setVisible(false);
    this.zoomImage?.setVisible(false);

    this.currentCard?.zoomHint?.setVisible(true);
    this.currentCard?.fileTitle?.setVisible(true);
    this.currentCard?.summary?.setVisible(true);
    this.dialogueText?.setVisible(true);
    this.bottomNoteText?.setVisible(true);
  }

  changeSuspect(direction) {
    if (
      !this.displaySuspects.length ||
      !this.canNavigate()
    ) {
      return;
    }

    this.closeZoom();

    this.isAnimatingSlide = true;
    this.disableNavigation();

    const total = this.displaySuspects.length;

    this.currentSuspectIndex =
      (
        this.currentSuspectIndex +
        direction +
        total
      ) % total;

    const oldCard = this.currentCard;

    const newSuspect =
      this.displaySuspects[this.currentSuspectIndex];

    const enterFromX = direction > 0 ? 460 : -460;
    const exitToX = direction > 0 ? -460 : 460;

    const newCard = this.buildSuspectCard(
      newSuspect,
      enterFromX
    );

    newCard.alpha = 0.9;

    this.cardSlot.add(newCard);
    this.updatePagination();

    this.tweens.add({
      targets: oldCard,
      x: exitToX,
      alpha: 0.42,
      duration: 220,
      ease: 'Cubic.Out'
    });

    this.tweens.add({
      targets: newCard,
      x: 0,
      alpha: 1,
      duration: 220,
      ease: 'Cubic.Out',

      onComplete: () => {
        if (oldCard) {
          this.cardSlot.remove(oldCard, true);
        }

        this.currentCard = newCard;
        this.isAnimatingSlide = false;

        if (!this.selectionLocked) {
          this.enableNavigation();
        }

        this.dialogueText?.setText(
          'Review each dossier entry. Use arrows to inspect suspects, ' +
            'click the photograph to enlarge it, and confirm the arrest ' +
            'when you are ready to submit your decision.'
        );

        this.bottomNoteText?.setText(
          'Cross-check means, motive, and opportunity before arrest.'
        );
      }
    });
  }

  updatePagination() {
    const suspect =
      this.displaySuspects[this.currentSuspectIndex];

    this.counterText.setText(
      `${this.currentSuspectIndex + 1} / ${this.displaySuspects.length}`
    );

    const dots = this.displaySuspects
      .map((_, index) =>
        index === this.currentSuspectIndex
          ? '●'
          : '○'
      )
      .join(' ');

    this.dotsText.setText(dots);

    const displayName =
      suspect?.name ||
      suspect?.fullName ||
      suspect?.title ||
      `Suspect ${this.currentSuspectIndex + 1}`;

    this.suspectLabelText?.setText(
      `Current file: ${displayName}`
    );
  }

  canNavigate() {
    return (
      !this.selectionLocked &&
      !this.resultCommitted &&
      !this.isAnimatingSlide &&
      !this.isLeaving &&
      !this.zoomOverlay?.visible
    );
  }

  disableNavigation() {
    this.leftArrow?.disableInteractive();
    this.leftArrow?.setAlpha(0.45);

    this.rightArrow?.disableInteractive();
    this.rightArrow?.setAlpha(0.45);
  }

  enableNavigation() {
    if (
      this.selectionLocked ||
      this.resultCommitted ||
      this.isLeaving
    ) {
      return;
    }

    this.leftArrow
      ?.setInteractive({ useHandCursor: true })
      .setAlpha(1);

    this.rightArrow
      ?.setInteractive({ useHandCursor: true })
      .setAlpha(1);
  }

  confirmSelection() {
    if (
      this.resultCommitted ||
      this.isLeaving
    ) {
      return;
    }

    const thiefId =
      gameState.currentThief?.id ??
      gameState.currentThiefId;

    const selectedSuspectId =
      this.selectedSuspectId;

    if (
      selectedSuspectId == null ||
      thiefId == null
    ) {
      console.error(
        '[ArrestSelectionScene] Cannot submit arrest: missing suspect data.',
        {
          selectedSuspectId,
          thiefId
        }
      );

      this.selectionLocked = false;
      this.enableNavigation();

      this.arrestButton
        ?.setInteractive({ useHandCursor: true })
        .setFillStyle(0x7b241c, 1);

      this.arrestButtonText?.setAlpha(1);

      this.dialogueText?.setText(
        'The arrest order could not be submitted. ' +
          'Review the dossier and try again.'
      );

      this.bottomNoteText?.setText(
        'Missing suspect data. No arrest has been recorded.'
      );

      return;
    }

    const isCorrect = isCorrectSuspectChoice(
      selectedSuspectId,
      thiefId
    );

    this.resultCommitted = true;
    this.selectionLocked = true;

    this.disableNavigation();
    this.arrestButton?.disableInteractive();
    this.closeZoom();

    // Wynik wewnętrzny do obsługi zakończenia.
    // Ta scena nie nalicza punktów, reputacji ani uczciwości.
    gameState.finalArrestSuspectId = selectedSuspectId;

    gameState.finalArrestResult = isCorrect
      ? 'SUCCESS'
      : 'FAILURE';

    gameState.caseResolved = isCorrect;
    gameState.caseFailed = !isCorrect;
    gameState.isGameActive = false;

    gameState.gameOverReason = isCorrect
      ? ''
      : 'Incorrect suspect detained. The real thief escaped before the bureau could act.';

    this.nextSceneKey = isCorrect
      ? 'SuccessScene'
      : 'GameOverScene';

    const saved = saveGameState();

    if (!saved) {
      console.warn(
        '[ArrestSelectionScene] Arrest decision is in memory, ' +
          'but saving the game failed.'
      );
    }

    // Identyczne potwierdzenie dla prawidłowego i błędnego wyboru.
    this.showResult(
      'SUSPECT DETAINED',
      'The selected suspect has been taken into custody. ' +
        'Your report has been forwarded to the bureau for review.'
    );
  }

  createResultOverlay() {
    const { width, height } = this.scale;

    this.resultOverlay = this.add
      .container(0, 0)
      .setDepth(500)
      .setVisible(false);

    const darkBg = this.add
      .rectangle(
        width / 2,
        height / 2,
        width,
        height,
        0x000000,
        0.76
      )
      .setInteractive();

    const shadow = this.add.rectangle(
      width / 2 + 8,
      height / 2 + 10,
      790,
      360,
      0x000000,
      0.25
    );

    const panel = this.add
      .rectangle(
        width / 2,
        height / 2,
        780,
        350,
        0xe5cb94,
        0.98
      )
      .setStrokeStyle(4, 0x5e3d20, 1);

    const panelInner = this.add
      .rectangle(
        width / 2,
        height / 2,
        736,
        308,
        0xf5e5bc,
        1
      )
      .setStrokeStyle(2, 0x8b6840, 1);

    this.resultTitle = this.add
      .text(
        width / 2,
        height / 2 - 78,
        '',
        {
          fontFamily: 'PressStart2P',
          fontSize: '22px',
          color: '#5a3b21',
          align: 'center'
        }
      )
      .setOrigin(0.5);

    this.resultText = this.add
      .text(
        width / 2,
        height / 2 + 2,
        '',
        {
          fontFamily: 'SpecialElite',
          fontSize: '30px',
          color: '#352113',
          align: 'center',
          wordWrap: { width: 620 },
          lineSpacing: 10
        }
      )
      .setOrigin(0.5);

    const continueBtn = this.add
      .rectangle(
        width / 2,
        height / 2 + 108,
        250,
        58,
        0x6c4820,
        1
      )
      .setStrokeStyle(3, 0xf7e6bc, 1)
      .setInteractive({ useHandCursor: true });

    const continueText = this.add
      .text(
        width / 2,
        height / 2 + 108,
        'CONTINUE',
        {
          fontFamily: 'PressStart2P',
          fontSize: '18px',
          color: '#fff7de'
        }
      )
      .setOrigin(0.5);

    continueBtn.on('pointerover', () => {
      continueBtn.setFillStyle(0x8a5c29, 1);
    });

    continueBtn.on('pointerout', () => {
      continueBtn.setFillStyle(0x6c4820, 1);
    });

    continueBtn.on('pointerdown', () => {
      if (
        this.isLeaving ||
        !this.resultCommitted
      ) {
        return;
      }

      this.isLeaving = true;
      continueBtn.disableInteractive();

      const isCorrect =
        gameState.finalArrestResult === 'SUCCESS';

      const nextSceneKey = isCorrect
        ? 'SuccessScene'
        : 'GameOverScene';

      const payload = {
        caseId: gameState.currentCaseId,
        suspectId: gameState.finalArrestSuspectId,
        source: 'final_arrest',

        reasonCode: isCorrect
          ? 'correct_arrest'
          : 'wrong_arrest'
      };

      if (!isCorrect) {
        payload.title = 'FALSE ARREST';

        payload.message =
          gameState.gameOverReason ||
          'Incorrect suspect detained. The real thief escaped.';
      }

      this.resultOverlay.setVisible(false);
      this.scene.stop('CityScene');

      this.goto(nextSceneKey, payload);
    });

    this.resultOverlay.add([
      darkBg,
      shadow,
      panel,
      panelInner,
      this.resultTitle,
      this.resultText,
      continueBtn,
      continueText
    ]);
  }

  showResult(title, message) {
    this.resultTitle.setText(title);
    this.resultTitle.setColor('#5a3b21');

    this.resultText.setText(message);
    this.resultOverlay.setVisible(true);
  }

  closeAllUIPanels() {
    const hud =
      this.scene.manager.keys.PlayerHudScene;

    hud?.closeAllUIPanels?.();
  }

  addHoverEffect(
    button,
    baseScale = 0.8,
    hoverScale = 0.9
  ) {
    button.on('pointerover', () => {
      button.setScale(hoverScale);
    });

    button.on('pointerout', () => {
      button.setScale(baseScale);
    });
  }
}