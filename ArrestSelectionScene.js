import { gameState, saveGameState } from './GameData.js';
import { ensureHud } from './hudHelpers.js';
import {
  getRandomSuspectLineup,
  isCorrectSuspectChoice,
  getSuspectImageKey
} from './suspectHelpers.js';

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
    this.overlayRoot = null;
    this.zoomOverlay = null;
    this.zoomImage = null;
    this.zoomHintText = null;
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

    this.createOverlayShell();
    this.createBackButton();
    this.createHeader();
    this.createInstructionBox();
    this.createSuspectViewer();
    this.createResultOverlay();
  }

  createOverlayShell() {
    const { width, height } = this.scale;

    this.overlayRoot = this.add.container(0, 0).setDepth(300);

    const darken = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45);
    const topShade = this.add.rectangle(width / 2, 70, width, 110, 0x000000, 0.38);
    const panelShadow = this.add.rectangle(width / 2, height / 2 + 10, 1480, 980, 0x000000, 0.28);
    const panel = this.add
      .rectangle(width / 2, height / 2 + 10, 1440, 940, 0x101010, 0.78)
      .setStrokeStyle(4, 0xd9c27a, 0.95);

    this.overlayRoot.add([darken, topShade, panelShadow, panel]);
  }

  createBackButton() {
    const baseX = 170;
    const baseY = 80;

    if (this.textures.exists('back')) {
      this.backBtn = this.add
        .image(baseX, baseY, 'back')
        .setInteractive({ useHandCursor: true })
        .setScale(0.45)
        .setDepth(320);
      this.addHoverEffect(this.backBtn, 0.45, 0.53);
    } else {
      this.backBtn = this.add
        .text(baseX, baseY, '<', {
          fontFamily: 'PressStart2P',
          fontSize: '24px',
          color: '#ffffff',
          backgroundColor: '#000000'
        })
        .setOrigin(0.5)
        .setPadding(12)
        .setInteractive({ useHandCursor: true })
        .setDepth(320);

      this.backBtn.on('pointerover', () => this.backBtn.setScale(1.08));
      this.backBtn.on('pointerout', () => this.backBtn.setScale(1));
    }

    this.backBtnLabel = this.add
      .text(baseX + 70, baseY, 'RETURN', {
        fontFamily: 'Special Elite',
        fontSize: '24px',
        color: '#f1e6b8'
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
    this.add
      .text(this.scale.width / 2, 80, 'IDENTIFY THE THIEF', {
        fontFamily: 'PressStart2P',
        fontSize: '24px',
        color: '#ffff00',
        stroke: '#000000',
        strokeThickness: 6
      })
      .setOrigin(0.5)
      .setDepth(320);
  }

  createInstructionBox() {
    const box = this.add.graphics().setDepth(320);
    box.fillStyle(0x000000, 0.72);
    box.fillRoundedRect(290, 760, 1340, 180, 20);
    box.lineStyle(4, 0xffff00, 1);
    box.strokeRoundedRect(290, 760, 1340, 180, 20);

    this.dialogueText = this.add
      .text(
        350,
        808,
        'Review each suspect. Use arrows to switch, click the photo to enlarge it, and press ARREST when ready.',
        {
          fontFamily: 'PressStart2P',
          fontSize: '18px',
          color: '#ffffff',
          wordWrap: { width: 1220 },
          lineSpacing: 12
        }
      )
      .setDepth(321);
  }

  createSuspectViewer() {
    const cx = this.scale.width / 2;
    const cy = 420;

    this.viewerRoot = this.add.container(cx, cy).setDepth(320);

    const outerPanel = this.add
      .rectangle(0, 0, 980, 720, 0x111111, 0.86)
      .setStrokeStyle(5, 0xffffff, 1);

    this.cardSlot = this.add.container(0, -20);

    this.leftArrow = this.add
      .text(-520, 0, '<', {
        fontFamily: 'PressStart2P',
        fontSize: '42px',
        color: '#ffffff',
        backgroundColor: '#000000'
      })
      .setOrigin(0.5)
      .setPadding(18)
      .setInteractive({ useHandCursor: true });

    this.rightArrow = this.add
      .text(520, 0, '>', {
        fontFamily: 'PressStart2P',
        fontSize: '42px',
        color: '#ffffff',
        backgroundColor: '#000000'
      })
      .setOrigin(0.5)
      .setPadding(18)
      .setInteractive({ useHandCursor: true });

    this.counterText = this.add
      .text(0, 285, '', {
        fontFamily: 'PressStart2P',
        fontSize: '14px',
        color: '#ffff00',
        align: 'center'
      })
      .setOrigin(0.5);

    this.dotsText = this.add
      .text(0, 325, '', {
        fontFamily: 'PressStart2P',
        fontSize: '20px',
        color: '#ffffff',
        align: 'center'
      })
      .setOrigin(0.5);

    this.arrestButton = this.add
      .rectangle(0, 400, 260, 58, 0x7a1414, 1)
      .setStrokeStyle(3, 0xffffff, 1)
      .setInteractive({ useHandCursor: true });

    this.arrestButtonText = this.add
      .text(0, 400, 'ARREST', {
        fontFamily: 'PressStart2P',
        fontSize: '18px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    this.leftArrow.on('pointerover', () => {
      if (this.canNavigate()) this.leftArrow.setScale(1.08);
    });
    this.leftArrow.on('pointerout', () => this.leftArrow.setScale(1));

    this.rightArrow.on('pointerover', () => {
      if (this.canNavigate()) this.rightArrow.setScale(1.08);
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
      if (!this.selectionLocked) this.arrestButton.setFillStyle(0x9b1d1d, 1);
    });
    this.arrestButton.on('pointerout', () => {
      if (!this.selectionLocked) this.arrestButton.setFillStyle(0x7a1414, 1);
    });

    this.arrestButton.on('pointerdown', () => {
      if (this.selectionLocked || this.isAnimatingSlide) return;

      const suspect = this.displaySuspects[this.currentSuspectIndex];
      if (!suspect) return;

      this.selectionLocked = true;
      this.selectedSuspectId = suspect.id;
      this.disableNavigation();

      this.arrestButton.disableInteractive();
      this.arrestButton.setFillStyle(0x444444, 1);
      this.arrestButtonText.setAlpha(0.7);

      this.dialogueText.setText('Arrest in progress. Verifying suspect...');

      if (this.currentCard?.frame) {
        this.currentCard.frame.setStrokeStyle(5, 0x00ff88, 1);
      }

      this.time.delayedCall(180, () => this.confirmSelection());
    });

    this.viewerRoot.add([
      outerPanel,
      this.cardSlot,
      this.leftArrow,
      this.rightArrow,
      this.counterText,
      this.dotsText,
      this.arrestButton,
      this.arrestButtonText
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

    const frame = this.add
      .rectangle(0, 0, 820, 520, 0x151515, 0.95)
      .setStrokeStyle(5, 0xffffff, 1);

    const imageFrame = this.add
      .rectangle(0, -80, 700, 300, 0x0d0d0d, 1)
      .setStrokeStyle(3, 0xd9c27a, 1);

    const imageKey = getSuspectImageKey(suspect);
    let portrait = null;
    let fallback = null;
    let fallbackText = null;

    if (imageKey && this.textures.exists(imageKey)) {
      portrait = this.add
        .image(0, -80, imageKey)
        .setDisplaySize(680, 280)
        .setInteractive({ useHandCursor: true });

      portrait.on('pointerover', () => portrait.setScale(1.01));
      portrait.on('pointerout', () => portrait.setScale(1));
      portrait.on('pointerdown', () => this.openZoom(imageKey));
    } else {
      fallback = this.add
        .rectangle(0, -80, 680, 280, 0x444444, 1)
        .setStrokeStyle(3, 0xffffff, 1);

      fallbackText = this.add
        .text(0, -80, 'NO IMAGE', {
          fontFamily: 'PressStart2P',
          fontSize: '22px',
          color: '#ffffff',
          align: 'center'
        })
        .setOrigin(0.5);
    }

    const zoomHint = this.add
      .text(0, 95, 'CLICK PHOTO TO ENLARGE', {
        fontFamily: 'Special Elite',
        fontSize: '24px',
        color: '#f1e6b8',
        align: 'center'
      })
      .setOrigin(0.5);

    const title = this.add
      .text(0, 150, `Suspect ${this.currentSuspectIndex + 1}`, {
        fontFamily: 'PressStart2P',
        fontSize: '20px',
        color: '#ffffff',
        align: 'center'
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(0, 210, 'Review the clues carefully before making the arrest.', {
        fontFamily: 'Special Elite',
        fontSize: '24px',
        color: '#cccccc',
        align: 'center',
        wordWrap: { width: 660 }
      })
      .setOrigin(0.5);

    const children = [frame, imageFrame];

    if (portrait) children.push(portrait);
    if (fallback) children.push(fallback);
    if (fallbackText) children.push(fallbackText);

    children.push(zoomHint, title, subtitle);

    container.add(children);
    container.frame = frame;
    container.suspectId = suspect.id;

    return container;
  }

  createZoomOverlay() {
    const { width, height } = this.scale;

    this.zoomOverlay = this.add.container(0, 0).setDepth(800).setVisible(false);

    const bg = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.88)
      .setInteractive({ useHandCursor: true });

    this.zoomImage = this.add.image(width / 2, height / 2 - 20, '__DEFAULT').setVisible(false);

    this.zoomHintText = this.add
      .text(width / 2, height - 70, 'CLICK ANYWHERE TO CLOSE', {
        fontFamily: 'PressStart2P',
        fontSize: '18px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    bg.on('pointerdown', () => this.closeZoom());

    this.zoomOverlay.add([bg, this.zoomImage, this.zoomHintText]);
  }

  openZoom(imageKey) {
    if (!imageKey || !this.textures.exists(imageKey) || !this.zoomOverlay || !this.zoomImage) {
      return;
    }

    const { width, height } = this.scale;
    const texture = this.textures.get(imageKey).getSourceImage();

    if (!texture?.width || !texture?.height) return;

    const maxWidth = width * 0.82;
    const maxHeight = height * 0.72;
    const scale = Math.min(maxWidth / texture.width, maxHeight / texture.height);

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
    const enterFromX = direction > 0 ? 520 : -520;
    const exitToX = direction > 0 ? -520 : 520;

    const newCard = this.buildSuspectCard(newSuspect, enterFromX);
    newCard.alpha = 0.92;
    this.cardSlot.add(newCard);
    this.updatePagination();

    this.tweens.add({
      targets: oldCard,
      x: exitToX,
      alpha: 0.5,
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
        this.dialogueText.setText(
          'Review each suspect. Use arrows to switch, click the photo to enlarge it, and press ARREST when ready.'
        );
      }
    });
  }

  updatePagination() {
    this.counterText.setText(`${this.currentSuspectIndex + 1} / ${this.displaySuspects.length}`);

    const dots = this.displaySuspects
      .map((_, index) => (index === this.currentSuspectIndex ? '●' : '○'))
      .join(' ');

    this.dotsText.setText(dots);
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

    const title = isCorrect ? 'ARREST CONFIRMED' : 'WRONG SUSPECT';
    const message = isCorrect
      ? 'You identified the correct suspect.'
      : 'That is not the thief. The real suspect escaped.';
    const nextSceneKey = isCorrect ? 'SuccessScene' : 'GameOverScene';

    this.showResult(title, message, isCorrect, nextSceneKey);
  }

  createResultOverlay() {
    const { width, height } = this.scale;

    this.resultOverlay = this.add.container(0, 0).setDepth(500).setVisible(false);

    const darkBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.72);
    const panel = this.add
      .rectangle(width / 2, height / 2, 760, 320, 0x111111, 0.96)
      .setStrokeStyle(5, 0xffff00, 1);

    this.resultTitle = this.add
      .text(width / 2, height / 2 - 70, '', {
        fontFamily: 'PressStart2P',
        fontSize: '24px',
        color: '#ffff00',
        align: 'center'
      })
      .setOrigin(0.5);

    this.resultText = this.add
      .text(width / 2, height / 2 + 10, '', {
        fontFamily: 'PressStart2P',
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 620 },
        lineSpacing: 12
      })
      .setOrigin(0.5);

    const continueBtn = this.add
      .rectangle(width / 2, height / 2 + 110, 250, 56, 0x7a5c14, 1)
      .setStrokeStyle(3, 0xffffff, 1)
      .setInteractive({ useHandCursor: true });

    const continueText = this.add
      .text(width / 2, height / 2 + 110, 'CONTINUE', {
        fontFamily: 'PressStart2P',
        fontSize: '18px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    continueBtn.on('pointerover', () => continueBtn.setFillStyle(0x9b761d, 1));
    continueBtn.on('pointerout', () => continueBtn.setFillStyle(0x7a5c14, 1));
    continueBtn.on('pointerdown', () => {
      this.resultOverlay.setVisible(false);
      this.scene.stop('ArrestSelectionScene');
      this.scene.stop('CityScene');
      this.scene.start(this.nextSceneKey || 'GameOverScene');
    });

    this.resultOverlay.add([
      darkBg,
      panel,
      this.resultTitle,
      this.resultText,
      continueBtn,
      continueText
    ]);
  }

  showResult(title, message, isCorrect, nextSceneKey) {
    this.nextSceneKey = nextSceneKey || 'GameOverScene';
    this.resultTitle.setText(title);
    this.resultText.setText(message);
    this.resultTitle.setColor(isCorrect ? '#00ff88' : '#ff6666');
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