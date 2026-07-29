import { gameState, saveGameState } from '../GameData.js';
import { ensureHud } from '../hudHelpers.js';
import {
  getRandomSuspectLineup,
  isCorrectSuspectChoice,
  getSuspectImageKey
} from '../suspectHelpers.js';

export class ArrestSelectionScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ArrestSelectionScene' });

    this.dialogueText = null;
    this.resultOverlay = null;
    this.resultTitle = null;
    this.resultText = null;
    this.nextSceneKey = 'GameOverScene';

    this.selectedSuspectId = null;
    this.suspectsPool = [];
    this.displaySuspects = [];
    this.selectionLocked = false;
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
  }

  create() {
    this.scene.wake('UIScene');
    ensureHud(this);
    this.closeAllUIPanels();

    const suspectsData = this.cache.json.get('suspects');
    if (!Array.isArray(suspectsData) || suspectsData.length < 5) {
      console.error('suspects.json must contain at least 5 suspects.');
      this.scene.start('GameScene');
      return;
    }

    const thiefId = gameState.currentThief?.id || gameState.currentThiefId;
    if (!thiefId) {
      console.error('Missing current thief in gameState.');
      this.scene.start('GameScene');
      return;
    }

    this.suspectsPool = suspectsData;
    this.displaySuspects = getRandomSuspectLineup(suspectsData, thiefId, 5);

    if (!this.displaySuspects.length) {
      console.error('Failed to build suspect lineup.');
      this.scene.start('GameScene');
      return;
    }

    this.createBackdrop();
    this.createBackButton();
    this.createHeader();
    this.createInstructionBox();
    this.createDossierViewer();
    this.createResultOverlay();
  }

  createBackdrop() {
    const { width, height } = this.scale;

    this.overlayRoot = this.add.container(0, 0).setDepth(300);

    const vignette = this.add.rectangle(width / 2, height / 2, width, height, 0x120d07, 0.62);
    const outerShadow = this.add.rectangle(width / 2, height / 2 + 14, 1500, 980, 0x000000, 0.28);

    const dossierPaper = this.add
      .rectangle(width / 2, height / 2 + 6, 1450, 940, 0xc7ad73, 0.96)
      .setStrokeStyle(5, 0x4a3720, 1);

    const dossierInner = this.add
      .rectangle(width / 2, height / 2 + 6, 1400, 890, 0xd7bf89, 0.78)
      .setStrokeStyle(2, 0x7a5a34, 0.95);

    const topStrip = this.add.rectangle(width / 2, 88, 1400, 76, 0x5a4121, 0.95);
    const topStripLine = this.add.rectangle(width / 2, 124, 1400, 3, 0xe8d3a0, 0.95);

    const bottomStrip = this.add.rectangle(width / 2, height - 88, 1400, 64, 0x5a4121, 0.95);

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

      this.addHoverEffect(this.backBtn, 0.42, 0.48);
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

      this.backBtn.on('pointerover', () => this.backBtn.setScale(1.06));
      this.backBtn.on('pointerout', () => this.backBtn.setScale(1));
    }

    this.backBtnLabel = this.add
      .text(baseX + 70, baseY, 'RETURN TO CITY', {
        fontFamily: 'Special Elite',
        fontSize: '24px',
        color: '#f5e7bf'
      })
      .setOrigin(0, 0.5)
      .setDepth(320);

    this.backBtn.on('pointerdown', () => {
      if (this.selectionLocked || this.isAnimatingSlide) return;
      this.closeAllUIPanels();
      this.closeZoom();
      this.scene.stop('ArrestSelectionScene');
      this.scene.resume('CityScene');
    });
  }

  createHeader() {
    const { width } = this.scale;

    this.add
      .text(width / 2, 74, 'INTERNATIONAL ARTEFACTS BUREAU', {
        fontFamily: 'PressStart2P',
        fontSize: '20px',
        color: '#f5e8b8',
        stroke: '#2e1f10',
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(320);

    this.add
      .text(width / 2, 109, 'SUSPECT DOSSIER // FINAL IDENTIFICATION', {
        fontFamily: 'Special Elite',
        fontSize: '26px',
        color: '#f4ddb2'
      })
      .setOrigin(0.5)
      .setDepth(320);

    const caseNumber = `CASE FILE ${String(gameState.caseId || gameState.currentCaseId || '017').padStart(3, '0')}`;
    this.caseNumberText = this.add
      .text(width - 260, 82, caseNumber, {
        fontFamily: 'PressStart2P',
        fontSize: '14px',
        color: '#fff4cf',
        backgroundColor: '#6e1f17',
        padding: { left: 10, right: 10, top: 8, bottom: 8 }
      })
      .setOrigin(0.5)
      .setDepth(321);

    this.statusStampText = this.add
      .text(width - 265, 118, 'TOP PRIORITY', {
        fontFamily: 'Special Elite',
        fontSize: '24px',
        color: '#6e1f17',
        stroke: '#f7dfb2',
        strokeThickness: 1,
        rotation: -0.08
      })
      .setOrigin(0.5)
      .setAlpha(0.95)
      .setDepth(321);
  }

  createInstructionBox() {
    const x = 280;
    const y = 760;
    const w = 1340;
    const h = 160;

    const panel = this.add.graphics().setDepth(320);
    panel.fillStyle(0xecd6a6, 0.86);
    panel.fillRoundedRect(x, y, w, h, 14);
    panel.lineStyle(3, 0x6a4a26, 1);
    panel.strokeRoundedRect(x, y, w, h, 14);
    panel.lineStyle(1, 0x8d6a3a, 0.8);
    panel.strokeRoundedRect(x + 10, y + 10, w - 20, h - 20, 10);

    this.add
      .text(x + 30, y + 26, 'FIELD NOTES', {
        fontFamily: 'PressStart2P',
        fontSize: '14px',
        color: '#4f3218'
      })
      .setDepth(321);

    this.dialogueText = this.add
      .text(
        x + 34,
        y + 62,
        'Review each dossier entry. Use arrows to inspect suspects, click the photograph to enlarge it, and confirm the arrest only when the file matches your evidence.',
        {
          fontFamily: 'Special Elite',
          fontSize: '28px',
          color: '#332012',
          wordWrap: { width: 1260 },
          lineSpacing: 8
        }
      )
      .setDepth(321);

    this.bottomNoteText = this.add
      .text(x + w - 36, y + h - 22, 'Cross-check means, motive, and opportunity before arrest.', {
        fontFamily: 'Special Elite',
        fontSize: '20px',
        color: '#6b4d2e'
      })
      .setOrigin(1, 1)
      .setDepth(321);
  }

  createDossierViewer() {
    const cx = this.scale.width / 2;
    const cy = 415;

    this.viewerRoot = this.add.container(cx, cy).setDepth(320);

    const leftPanel = this.add
      .rectangle(-360, -10, 255, 600, 0xe8cf99, 0.92)
      .setStrokeStyle(3, 0x6a4a26, 1);

    const centerPanel = this.add
      .rectangle(40, -10, 720, 600, 0xf0ddb2, 0.94)
      .setStrokeStyle(4, 0x5b3e20, 1);

    const rightPanel = this.add
      .rectangle(470, -10, 265, 600, 0xe8cf99, 0.92)
      .setStrokeStyle(3, 0x6a4a26, 1);

    const leftHeader = this.add
      .text(-360, -265, 'CASE SUMMARY', {
        fontFamily: 'PressStart2P',
        fontSize: '14px',
        color: '#4a2e17'
      })
      .setOrigin(0.5);

    const leftBody = this.add
      .text(
        -470,
        -220,
        [
          '• Final suspect lineup',
          '• Review facial match',
          '• Confirm evidence trail',
          '• Verify suspect profile',
          '',
          'Only one arrest attempt',
          'will close the case.'
        ].join('\n'),
        {
          fontFamily: 'Special Elite',
          fontSize: '25px',
          color: '#392113',
          lineSpacing: 8,
          wordWrap: { width: 205 }
        }
      );

    const rightHeader = this.add
      .text(470, -265, 'ARREST PROTOCOL', {
        fontFamily: 'PressStart2P',
        fontSize: '14px',
        color: '#4a2e17'
      })
      .setOrigin(0.5);

    const rightBody = this.add
      .text(
        365,
        -220,
        [
          '1. Inspect photo',
          '2. Compare with clues',
          '3. Review all files',
          '4. Arrest only when sure',
          '',
          'A false arrest ends',
          'the investigation.'
        ].join('\n'),
        {
          fontFamily: 'Special Elite',
          fontSize: '25px',
          color: '#392113',
          lineSpacing: 8,
          wordWrap: { width: 205 }
        }
      );

    this.cardSlot = this.add.container(40, -35);

    this.suspectLabelText = this.add
      .text(40, 212, '', {
        fontFamily: 'Special Elite',
        fontSize: '24px',
        color: '#5a3b21',
        align: 'center'
      })
      .setOrigin(0.5);

    this.counterText = this.add
      .text(40, 244, '', {
        fontFamily: 'PressStart2P',
        fontSize: '14px',
        color: '#6e1f17',
        align: 'center'
      })
      .setOrigin(0.5);

    this.dotsText = this.add
      .text(40, 278, '', {
        fontFamily: 'PressStart2P',
        fontSize: '18px',
        color: '#4a2e17',
        align: 'center'
      })
      .setOrigin(0.5);

    this.leftArrow = this.add
      .text(-210, 248, '<', {
        fontFamily: 'PressStart2P',
        fontSize: '34px',
        color: '#fff3d0',
        backgroundColor: '#57391d'
      })
      .setOrigin(0.5)
      .setPadding(14)
      .setInteractive({ useHandCursor: true });

    this.rightArrow = this.add
      .text(290, 248, '>', {
        fontFamily: 'PressStart2P',
        fontSize: '34px',
        color: '#fff3d0',
        backgroundColor: '#57391d'
      })
      .setOrigin(0.5)
      .setPadding(14)
      .setInteractive({ useHandCursor: true });

    this.arrestButton = this.add
      .rectangle(470, 226, 210, 62, 0x7b241c, 1)
      .setStrokeStyle(3, 0xf7e6bc, 1)
      .setInteractive({ useHandCursor: true });

    this.arrestButtonText = this.add
      .text(470, 226, 'ARREST', {
        fontFamily: 'PressStart2P',
        fontSize: '18px',
        color: '#fff7de'
      })
      .setOrigin(0.5);

    const stamp = this.add
      .text(470, 295, 'AUTHORIZED SIGN-OFF', {
        fontFamily: 'Special Elite',
        fontSize: '22px',
        color: '#6f4f30',
        rotation: -0.04
      })
      .setOrigin(0.5);

    this.leftArrow.on('pointerover', () => {
      if (this.canNavigate()) this.leftArrow.setScale(1.06);
    });
    this.leftArrow.on('pointerout', () => this.leftArrow.setScale(1));

    this.rightArrow.on('pointerover', () => {
      if (this.canNavigate()) this.rightArrow.setScale(1.06);
    });
    this.rightArrow.on('pointerout', () => this.rightArrow.setScale(1));

    this.leftArrow.on('pointerdown', () => {
      if (!this.canNavigate()) return;
      this.changeSuspect(-1);
    });

    this.rightArrow.on('pointerdown', () => {
      if (!this.canNavigate()) return;
      this.changeSuspect(1);
    });

    this.arrestButton.on('pointerover', () => {
      if (!this.selectionLocked) this.arrestButton.setFillStyle(0x983128, 1);
    });

    this.arrestButton.on('pointerout', () => {
      if (!this.selectionLocked) this.arrestButton.setFillStyle(0x7b241c, 1);
    });

    this.arrestButton.on('pointerdown', () => {
      if (this.selectionLocked || this.isAnimatingSlide) return;

      const suspect = this.displaySuspects[this.currentSuspectIndex];
      if (!suspect) return;

      this.selectionLocked = true;
      this.selectedSuspectId = suspect.id;
      this.disableNavigation();

      this.arrestButton.disableInteractive();
      this.arrestButton.setFillStyle(0x555555, 1);
      this.arrestButtonText.setAlpha(0.7);

      this.dialogueText.setText('Arrest order submitted. Validating suspect identity against the case file...');
      this.bottomNoteText.setText('Do not close the dossier while verification is in progress.');

      if (this.currentCard?.frame) {
        this.currentCard.frame.setStrokeStyle(5, 0x6e1f17, 1);
      }

      this.time.delayedCall(220, () => this.confirmSelection());
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

    this.input.keyboard.on('keydown-LEFT', () => {
      if (this.canNavigate()) this.changeSuspect(-1);
    });

    this.input.keyboard.on('keydown-RIGHT', () => {
      if (this.canNavigate()) this.changeSuspect(1);
    });

    this.input.keyboard.on('keydown-ENTER', () => {
      if (!this.selectionLocked && !this.isAnimatingSlide) {
        this.arrestButton.emit('pointerdown');
      }
    });

    this.currentCard = this.buildSuspectCard(this.displaySuspects[this.currentSuspectIndex], 0);
    this.cardSlot.add(this.currentCard);
    this.updatePagination();
    this.createZoomOverlay();
  }

  buildSuspectCard(suspect, offsetX = 0) {
    const container = this.add.container(offsetX, 0);

    const frameShadow = this.add.rectangle(6, 8, 610, 405, 0x000000, 0.16);

    const frame = this.add
      .rectangle(0, 0, 610, 405, 0xf5e4bc, 1)
      .setStrokeStyle(4, 0x5d4022, 1);

    const innerFrame = this.add
      .rectangle(0, 0, 580, 375, 0xe6cb95, 0.9)
      .setStrokeStyle(2, 0x8b6840, 1);

    const mugshotFrame = this.add
      .rectangle(0, -38, 500, 230, 0x1e1a16, 1)
      .setStrokeStyle(3, 0x6e5433, 1);

    const imageKey = getSuspectImageKey(suspect);
    let portrait = null;
    let fallback = null;
    let fallbackText = null;

    if (imageKey && this.textures.exists(imageKey)) {
      portrait = this.add
        .image(0, -38, imageKey)
        .setDisplaySize(480, 210)
        .setInteractive({ useHandCursor: true });

      portrait.on('pointerdown', () => this.openZoom(imageKey));
    } else {
      fallback = this.add
        .rectangle(0, -38, 480, 210, 0x57514b, 1)
        .setStrokeStyle(2, 0xf5e4bc, 1);

      fallbackText = this.add
        .text(0, -38, 'PHOTO MISSING', {
          fontFamily: 'PressStart2P',
          fontSize: '18px',
          color: '#f7ebc6',
          align: 'center'
        })
        .setOrigin(0.5);
    }

    const pinLine = this.add.rectangle(0, -168, 520, 2, 0x8b6840, 0.75);

    const fileTitle = this.add
      .text(0, -187, 'SUSPECT PHOTOGRAPH', {
        fontFamily: 'PressStart2P',
        fontSize: '14px',
        color: '#51341b'
      })
      .setOrigin(0.5);

    const zoomHint = this.add
      .text(0, 102, 'Click photo to enlarge evidence image', {
        fontFamily: 'Special Elite',
        fontSize: '22px',
        color: '#68482a'
      })
      .setOrigin(0.5);

    const suspectNumber = this.add
      .text(0, 143, `DOSSIER ENTRY ${this.currentSuspectIndex + 1}`, {
        fontFamily: 'PressStart2P',
        fontSize: '16px',
        color: '#6e1f17'
      })
      .setOrigin(0.5);

    const summary = this.add
      .text(0, 186, 'Observe appearance, compare it with witness clues, then decide whether the file justifies an arrest.', {
        fontFamily: 'Special Elite',
        fontSize: '23px',
        color: '#3c2614',
        align: 'center',
        wordWrap: { width: 520 }
      })
      .setOrigin(0.5);

    const children = [frameShadow, frame, innerFrame, mugshotFrame, pinLine, fileTitle];

    if (portrait) children.push(portrait);
    if (fallback) children.push(fallback);
    if (fallbackText) children.push(fallbackText);

    children.push(zoomHint, suspectNumber, summary);

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

    this.zoomOverlay = this.add.container(0, 0).setDepth(800).setVisible(false);

    const bg = this.add
      .rectangle(width / 2, height / 2, width, height, 0x120b06, 0.94)
      .setInteractive({ useHandCursor: true });

    const board = this.add
      .rectangle(width / 2, height / 2, width * 0.84, height * 0.82, 0xe8cf99, 0.96)
      .setStrokeStyle(4, 0x5d4022, 1);

    const inner = this.add
      .rectangle(width / 2, height / 2, width * 0.8, height * 0.76, 0xf3e0b6, 1)
      .setStrokeStyle(2, 0x8b6840, 1);

    this.zoomImage = this.add.image(width / 2, height / 2 - 20, '__DEFAULT').setVisible(false);

    this.zoomHintText = this.add
      .text(width / 2, height - 82, 'CLICK ANYWHERE TO CLOSE DOSSIER PHOTO', {
        fontFamily: 'PressStart2P',
        fontSize: '16px',
        color: '#fff4d6'
      })
      .setOrigin(0.5);

    bg.on('pointerdown', () => this.closeZoom());

    this.zoomOverlay.add([bg, board, inner, this.zoomImage, this.zoomHintText]);
  }

  openZoom(imageKey) {
    if (!imageKey || !this.textures.exists(imageKey) || !this.zoomOverlay || !this.zoomImage) {
      return;
    }

    const { width, height } = this.scale;
    const texture = this.textures.get(imageKey).getSourceImage();

    if (!texture?.width || !texture?.height) return;

    const maxWidth = width * 0.68;
    const maxHeight = height * 0.62;
    const scale = Math.min(maxWidth / texture.width, maxHeight / texture.height);

    if (this.currentCard?.zoomHint) this.currentCard.zoomHint.setVisible(false);
    if (this.currentCard?.fileTitle) this.currentCard.fileTitle.setVisible(false);
    if (this.currentCard?.summary) this.currentCard.summary.setVisible(false);
    if (this.dialogueText) this.dialogueText.setVisible(false);
    if (this.bottomNoteText) this.bottomNoteText.setVisible(false);

    this.zoomImage
      .setTexture(imageKey)
      .setDisplaySize(texture.width * scale, texture.height * scale)
      .setVisible(true);

    this.zoomOverlay.setVisible(true);
  }

  closeZoom() {
    if (!this.zoomOverlay) return;

    this.zoomOverlay.setVisible(false);

    if (this.zoomImage) {
      this.zoomImage.setVisible(false);
    }

    if (this.currentCard?.zoomHint) this.currentCard.zoomHint.setVisible(true);
    if (this.currentCard?.fileTitle) this.currentCard.fileTitle.setVisible(true);
    if (this.currentCard?.summary) this.currentCard.summary.setVisible(true);
    if (this.dialogueText) this.dialogueText.setVisible(true);
    if (this.bottomNoteText) this.bottomNoteText.setVisible(true);
  }

  changeSuspect(direction) {
    if (!this.displaySuspects.length || this.isAnimatingSlide || this.selectionLocked) return;

    this.closeZoom();
    this.isAnimatingSlide = true;
    this.disableNavigation();

    const total = this.displaySuspects.length;
    this.currentSuspectIndex = (this.currentSuspectIndex + direction + total) % total;

    const oldCard = this.currentCard;
    const newSuspect = this.displaySuspects[this.currentSuspectIndex];
    const enterFromX = direction > 0 ? 420 : -420;
    const exitToX = direction > 0 ? -420 : 420;

    const newCard = this.buildSuspectCard(newSuspect, enterFromX);
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

        if (!this.selectionLocked) this.enableNavigation();

        if (this.dialogueText) {
          this.dialogueText.setText(
            'Review each dossier entry. Use arrows to inspect suspects, click the photograph to enlarge it, and confirm the arrest only when the file matches your evidence.'
          );
        }

        if (this.bottomNoteText) {
          this.bottomNoteText.setText('Cross-check means, motive, and opportunity before arrest.');
        }
      }
    });
  }

  updatePagination() {
    const suspect = this.displaySuspects[this.currentSuspectIndex];

    this.counterText.setText(`${this.currentSuspectIndex + 1} / ${this.displaySuspects.length}`);

    const dots = this.displaySuspects
      .map((_, index) => (index === this.currentSuspectIndex ? '●' : '○'))
      .join(' ');

    this.dotsText.setText(dots);

    const displayName =
      suspect?.name ||
      suspect?.fullName ||
      suspect?.title ||
      `Suspect ${this.currentSuspectIndex + 1}`;

    if (this.suspectLabelText) {
      this.suspectLabelText.setText(`Current file: ${displayName}`);
    }
  }

  canNavigate() {
    return !this.selectionLocked && !this.isAnimatingSlide && !this.zoomOverlay?.visible;
  }

  disableNavigation() {
    if (this.leftArrow) {
      this.leftArrow.disableInteractive();
      this.leftArrow.setAlpha(0.45);
    }

    if (this.rightArrow) {
      this.rightArrow.disableInteractive();
      this.rightArrow.setAlpha(0.45);
    }
  }

  enableNavigation() {
    if (this.selectionLocked) return;

    if (this.leftArrow) {
      this.leftArrow.setInteractive({ useHandCursor: true });
      this.leftArrow.setAlpha(1);
    }

    if (this.rightArrow) {
      this.rightArrow.setInteractive({ useHandCursor: true });
      this.rightArrow.setAlpha(1);
    }
  }

  confirmSelection() {
    const thiefId = gameState.currentThief?.id || gameState.currentThiefId;
    const isCorrect = isCorrectSuspectChoice(this.selectedSuspectId, thiefId);

    gameState.finalArrestSuspectId = this.selectedSuspectId ?? null;
    gameState.finalArrestResult = isCorrect ? 'SUCCESS' : 'FAILURE';
    gameState.caseResolved = isCorrect;
    gameState.caseFailed = !isCorrect;
    gameState.isGameActive = false;
    saveGameState();

    const title = isCorrect ? 'ARREST CONFIRMED' : 'FALSE ARREST';
    const message = isCorrect
      ? 'Correct suspect identified. The case file is complete and the arrest stands.'
      : 'Incorrect suspect detained. The real thief escaped before the bureau could act.';

    this.showResult(title, message, isCorrect);
  }

  createResultOverlay() {
    const { width, height } = this.scale;

    this.resultOverlay = this.add.container(0, 0).setDepth(500).setVisible(false);

    const darkBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.76);

    const shadow = this.add.rectangle(width / 2 + 8, height / 2 + 10, 790, 360, 0x000000, 0.25);

    const panel = this.add
      .rectangle(width / 2, height / 2, 780, 350, 0xe5cb94, 0.98)
      .setStrokeStyle(4, 0x5e3d20, 1);

    const panelInner = this.add
      .rectangle(width / 2, height / 2, 736, 308, 0xf5e5bc, 1)
      .setStrokeStyle(2, 0x8b6840, 1);

    this.resultTitle = this.add
      .text(width / 2, height / 2 - 78, '', {
        fontFamily: 'PressStart2P',
        fontSize: '22px',
        color: '#6e1f17',
        align: 'center'
      })
      .setOrigin(0.5);

    this.resultText = this.add
      .text(width / 2, height / 2 + 2, '', {
        fontFamily: 'Special Elite',
        fontSize: '30px',
        color: '#352113',
        align: 'center',
        wordWrap: { width: 620 },
        lineSpacing: 10
      })
      .setOrigin(0.5);

    const continueBtn = this.add
      .rectangle(width / 2, height / 2 + 108, 250, 58, 0x6c4820, 1)
      .setStrokeStyle(3, 0xf7e6bc, 1)
      .setInteractive({ useHandCursor: true });

    const continueText = this.add
      .text(width / 2, height / 2 + 108, 'CONTINUE', {
        fontFamily: 'PressStart2P',
        fontSize: '18px',
        color: '#fff7de'
      })
      .setOrigin(0.5);

    continueBtn.on('pointerover', () => continueBtn.setFillStyle(0x8a5c29, 1));
    continueBtn.on('pointerout', () => continueBtn.setFillStyle(0x6c4820, 1));
    continueBtn.on('pointerdown', () => {
      this.resultOverlay.setVisible(false);
      this.scene.stop('ArrestSelectionScene');
      this.scene.stop('CityScene');

      if (gameState.finalArrestResult === 'SUCCESS') {
        this.scene.start('SuccessScene');
      } else {
        this.scene.start('GameOverScene');
      }
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

  showResult(title, message, isCorrect) {
    this.nextSceneKey = isCorrect ? 'SuccessScene' : 'GameOverScene';
    this.resultTitle.setText(title);
    this.resultText.setText(message);
    this.resultTitle.setColor(isCorrect ? '#2f6b2f' : '#8b1e1e');
    this.resultOverlay.setVisible(true);
  }

  closeAllUIPanels() {
    const hud = this.scene.get('PlayerHudScene');
    if (hud?.closeAllUIPanels) {
      hud.closeAllUIPanels();
    }
  }

  addHoverEffect(button, baseScale = 0.8, hoverScale = 0.9) {
    button.on('pointerover', () => button.setScale(hoverScale));
    button.on('pointerout', () => button.setScale(baseScale));
  }
}