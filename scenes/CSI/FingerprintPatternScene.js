import { BaseForensicMinigame } from './BaseForensicMinigame.js';
import { EventBus } from '../../EventBus.js';


const PATTERN_TYPES = ['LOOP', 'WHORL', 'ARCH'];

const PATTERN_RARITY_FLAVOR = {
  LOOP: 'Loops show up in about 65% of the population. Common, but still evidence.',
  WHORL: 'Whorls account for roughly 30% of prints. A solid, distinctive mark.',
  ARCH: 'Arches appear in only about 5% of people. This thief is one in twenty.'
};

const PATTERN_IMAGE_KEY = {
  LOOP: 'fingerprint_pattern_loop',
  WHORL: 'fingerprint_pattern_whorl',
  ARCH: 'fingerprint_pattern_arch'
};

const BRUSH_STROKES_REQUIRED = 3;


export class FingerprintPatternScene extends BaseForensicMinigame {
  constructor() {
    super('FingerprintPatternScene');

    this.evidenceBag = null;
    this.card = null;
    this.tweezers = null;
    this.brush = null;
    this.tape = null;

    this.brushStrokes = 0;
    this.magnifierOpened = false;
  }

  init(data = {}) {
    super.init({ ...data, totalSteps: 5 });

    this.evidenceType = 'fingerprint_pattern';

    const incoming = String(
      data.correctValue || this.correctValue || 'LOOP'
    ).trim().toUpperCase();

    this.correctValue = PATTERN_TYPES.includes(incoming) ? incoming : 'LOOP';

    this.evidenceBag = null;
    this.card = null;
    this.tweezers = null;
    this.brush = null;
    this.tape = null;
    this.brushStrokes = 0;
    this.magnifierOpened = false;
  }

  create() {
    super.create();
    EventBus.emit('hideHUD');
  }

  getTitle() {
    return 'FINGERPRINT PATTERN ANALYSIS';
  }

  getSubtitle() {
    return 'Ridge pattern classification';
  }

  getRetryHint() {
    return 'Dust a fresh card, lift the print with tape, then compare the ridge flow under magnification.';
  }

  createEvidenceFlow() {
    this.startStep1();
  }

  startStep1() {
    this.clearStage();
    this.setStep(0);
    this.setInstructions('Step 1: Use the tweezers to remove the sealed print card from the evidence bag.');
    this.setDialogue('Drag the tweezers over the evidence bag.');

    const { width, height } = this.scale;
    this.createDesk();

    this.evidenceBag = this.add.image(width * 0.80, height * 0.66, 'evidence_bag')
      .setOrigin(0.5)
      .setDisplaySize(320, 270)
      .setDepth(2);
    this.addStageObject(this.evidenceBag);

    this.card = this.add.image(width * 0.80, height * 0.66, 'fingerprint_card_sealed')
      .setOrigin(0.5)
      .setDisplaySize(190, 140)
      .setDepth(3)
      .setVisible(false);
    this.addStageObject(this.card);

    this.createTweezers(width * 0.48, height * 0.53, (tipX, tipY) => {
      if (!this.evidenceBag.getBounds().contains(tipX, tipY)) {
        this.penalize(3);
        this.setDialogue('The tweezers missed the evidence bag. Try again.');
        return;
      }

      this.card.setVisible(true);
      this.card.setPosition(this.tweezers.x - 45, this.tweezers.y + 40);
      this.evidenceBag.setAlpha(0.6);
      this.tweezers.disableInteractive();

      this.setDialogue('Sealed print card recovered. Click it to open the envelope.');

      this.time.delayedCall(450, () => {
        if (!this.resolved) this.startStep2();
      });
    });
  }

  startStep2() {
    this.clearStage();
    this.setStep(1);
    this.setInstructions('Step 2: Click the envelope to open it and expose the latent surface.');
    this.setDialogue('Click the card to break the seal.');

    const { width, height } = this.scale;
    this.createDesk();

    this.card = this.add.image(width * 0.55, height * 0.58, 'fingerprint_card_sealed')
      .setOrigin(0.5)
      .setDisplaySize(300, 220)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });
    this.addStageObject(this.card);

    const targetGlow = this.add.ellipse(this.card.x, this.card.y, 320, 240, 0xffd97a, 0.12)
      .setStrokeStyle(2, 0xffd97a, 0.75)
      .setDepth(1);
    this.addStageObject(targetGlow);

    this.tweens.add({
      targets: targetGlow,
      alpha: { from: 0.12, to: 0.32 },
      scale: { from: 0.94, to: 1.06 },
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    const hint = this.add.text(this.card.x, this.card.y + 155, 'CLICK TO OPEN', {
      fontFamily: 'PressStart2P',
      fontSize: '10px',
      color: '#ffe8a3',
      backgroundColor: '#15100d',
      padding: { left: 8, right: 8, top: 6, bottom: 6 }
    }).setOrigin(0.5).setDepth(4);
    this.addStageObject(hint);

    this.card.on('pointerdown', () => {
      if (this.resolved) return;

      targetGlow.destroy();
      hint.destroy();
      this.card.disableInteractive();
      this.card.setTexture('fingerprint_card_open');

      this.setDialogue('Envelope opened. The surface is blank until it is dusted.');

      this.time.delayedCall(500, () => {
        if (!this.resolved) this.startStep3();
      });
    });
  }

  startStep3() {
    this.clearStage();
    this.setStep(2);
    this.brushStrokes = 0;
    this.setInstructions('Step 3: Sweep the brush across the card to dust the latent print into view.');
    this.setDialogue(`Drag the brush over the card. Strokes: 0/${BRUSH_STROKES_REQUIRED}`);

    const { width, height } = this.scale;
    this.createDesk();

    this.card = this.add.image(width * 0.58, height * 0.58, 'fingerprint_card_open')
      .setOrigin(0.5)
      .setDisplaySize(300, 220)
      .setDepth(1);
    this.addStageObject(this.card);

    const strokeCounterText = this.add.text(width * 0.58, height * 0.30, `STROKES: 0/${BRUSH_STROKES_REQUIRED}`, {
      fontFamily: 'PressStart2P',
      fontSize: '11px',
      color: '#ffe8a3'
    }).setOrigin(0.5).setDepth(5);
    this.addStageObject(strokeCounterText);

    this.brush = this.add.image(width * 0.24, height * 0.30, 'tool_brush')
      .setOrigin(0.5)
      .setDisplaySize(220, 90)
      .setAngle(-20)
      .setDepth(6)
      .setInteractive({ draggable: true, useHandCursor: true });
    this.addStageObject(this.brush);
    this.input.setDraggable(this.brush);

    const homeX = width * 0.24;
    const homeY = height * 0.30;

    this.brush.on('drag', (pointer, dragX, dragY) => {
      if (this.resolved || !this.brush?.active) return;
      this.brush.setPosition(dragX, dragY);
    });

    this.brush.on('dragend', () => {
      if (this.resolved || !this.brush?.active) return;

      if (!this.card.getBounds().contains(this.brush.x, this.brush.y)) {
        this.penalize(2);
        this.setDialogue('Sweep the brush across the card surface, not around it.');
        this.tweens.add({ targets: this.brush, x: homeX, y: homeY, angle: -20, duration: 250 });
        return;
      }

      this.brushStrokes += 1;
      strokeCounterText.setText(`STROKES: ${this.brushStrokes}/${BRUSH_STROKES_REQUIRED}`);
      this.setDialogue(`Dusting... strokes: ${this.brushStrokes}/${BRUSH_STROKES_REQUIRED}`);

      const speck = this.add.circle(this.brush.x, this.brush.y, 3, 0x3a3a3a, 0.6).setDepth(3);
      this.addStageObject(speck);

      this.tweens.add({ targets: this.brush, x: homeX, y: homeY, angle: -20, duration: 250 });

      if (this.brushStrokes >= BRUSH_STROKES_REQUIRED) {
        this.brush.disableInteractive();
        this.card.setTexture('fingerprint_card_dusted');
        this.setDialogue('Ridge pattern revealed. Lift it with tape before it smudges.');

        this.time.delayedCall(600, () => {
          if (!this.resolved) this.startStep4();
        });
      }
    });
  }

  startStep4() {
    this.clearStage();
    this.setStep(3);
    this.setInstructions('Step 4: Drag the tape over the dusted print to lift it onto the evidence card.');
    this.setDialogue('Move the tape onto the print.');

    const { width, height } = this.scale;
    this.createDesk();

    this.card = this.add.image(width * 0.58, height * 0.58, 'fingerprint_card_dusted')
      .setOrigin(0.5)
      .setDisplaySize(300, 220)
      .setDepth(1);
    this.addStageObject(this.card);

    const targetGlow = this.add.ellipse(this.card.x, this.card.y, 320, 240, 0x8bd1ff, 0.1)
      .setStrokeStyle(2, 0x8bd1ff, 0.7)
      .setDepth(2);
    this.addStageObject(targetGlow);

    this.tape = this.add.image(width * 0.20, height * 0.30, 'tape')
      .setOrigin(0.5)
      .setDisplaySize(130, 130)
      .setDepth(4)
      .setInteractive({ draggable: true, useHandCursor: true });
    this.addStageObject(this.tape);
    this.input.setDraggable(this.tape);

    this.tape.on('drag', (pointer, dragX, dragY) => {
      if (this.resolved || !this.tape?.active) return;
      this.tape.setPosition(dragX, dragY);
    });

    this.tape.on('dragend', () => {
      if (this.resolved || !this.card?.active) return;

      if (!this.card.getBounds().contains(this.tape.x, this.tape.y)) {
        this.penalize(3);
        this.setDialogue('The tape needs to cover the print on the card.');
        return;
      }

      targetGlow.destroy();
      this.tape.disableInteractive();
      this.tape.setVisible(false);
      this.card.setTexture('fingerprint_card_lifted');

      this.setDialogue('Print lifted. Examine it under magnification.');

      this.time.delayedCall(500, () => {
        if (!this.resolved) this.startStep5();
      });
    });
  }

  startStep5() {
    this.clearStage();
    this.setStep(4);
    this.setInstructions('Step 5: Examine the ridge flow under magnification, then classify the pattern.');
    this.setDialogue('Click the card to magnify it, then choose Loop, Whorl or Arch.');

    const { width, height } = this.scale;
    this.createDesk();

    this.card = this.add.image(width * 0.36, height * 0.55, 'fingerprint_card_lifted')
      .setOrigin(0.5)
      .setDisplaySize(300, 220)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });
    this.addStageObject(this.card);

    const hint = this.add.text(this.card.x, this.card.y + 145, 'CLICK TO MAGNIFY', {
      fontFamily: 'PressStart2P',
      fontSize: '10px',
      color: '#ffe8a3',
      backgroundColor: '#15100d',
      padding: { left: 8, right: 8, top: 6, bottom: 6 }
    }).setOrigin(0.5).setDepth(5);
    this.addStageObject(hint);

    this.card.on('pointerdown', () => {
      if (this.resolved || this.magnifierOpened) return;
      this.magnifierOpened = true;
      hint.setVisible(false);
      this.card.disableInteractive();
      this.showMagnifierOverlay();
    });

    this.createPatternChoicePanel(width * 0.79, height * 0.55);
  }

  createTweezers(startX, startY, onValidDrop) {
    this.tweezers = this.add.image(startX, startY, 'tweezers')
      .setOrigin(0.5)
      .setDisplaySize(350, 280)
      .setAngle(-125)
      .setDepth(5)
      .setInteractive({ draggable: true, useHandCursor: true });
    this.addStageObject(this.tweezers);
    this.input.setDraggable(this.tweezers);

    const tipOffsetX = -45;
    const tipOffsetY = 50;

    this.tweezers.on('drag', (pointer, dragX, dragY) => {
      if (this.resolved || !this.tweezers?.active) return;
      this.tweezers.setPosition(dragX, dragY).setAngle(125);
    });

    this.tweezers.on('dragend', () => {
      if (this.resolved || !this.tweezers?.active) return;
      onValidDrop(
        this.tweezers.x + tipOffsetX,
        this.tweezers.y + tipOffsetY
      );
    });
  }

  // Uses BaseForensicMinigame.createButton() with label EQUAL to the
  // value passed into resolveChoice() ('LOOP' / 'WHORL' / 'ARCH'), so
  // the base class can find and highlight the correct/wrong button.
  createPatternChoicePanel(x, y) {
    const panel = this.add.rectangle(x, y, 340, 400, 0x0d1713, 0.94)
      .setStrokeStyle(2, 0x39ff14, 0.6)
      .setDepth(1);
    this.addStageObject(panel);

    const title = this.add.text(x, y - 160, 'RIDGE PATTERN', {
      fontFamily: 'Special Elite',
      fontSize: '20px',
      color: '#ffe8a3'
    }).setOrigin(0.5).setDepth(2);
    this.addStageObject(title);

    PATTERN_TYPES.forEach((pattern, index) => {
      const optionY = y - 60 + index * 100;

      this.createButton(
        x,
        optionY,
        260,
        60,
        pattern,
        () => {
          if (this.resolved) return;
          if (!this.magnifierOpened) {
            this.setDialogue('Magnify the print before classifying the pattern.');
            return;
          }
          this.resolveChoice(pattern, pattern === this.correctValue, 10);
        },
        {
          fontFamily: 'PressStart2P',
          fontSize: '14px',
          bgColor: 0x3a2920,
          borderColor: 0x7cc89f,
          depth: 3
        }
      );
    });
  }

  showMagnifierOverlay() {
    const { width, height } = this.scale;
    const imageKey = PATTERN_IMAGE_KEY[this.correctValue];

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.9)
      .setDepth(50)
      .setInteractive({ useHandCursor: true });

    const frame = this.add.image(width / 2, height / 2, 'microscope_look')
      .setOrigin(0.5)
      .setDisplaySize(width * 0.76, height * 0.76)
      .setDepth(51);

    const patternImage = this.add.image(width / 2, height * 0.45, imageKey)
      .setOrigin(0.5)
      .setDisplaySize(width * 0.34, height * 0.34)
      .setDepth(52);

    const title = this.add.text(width / 2, height * 0.13, 'MAGNIFIED RIDGE FLOW', {
      fontFamily: 'PressStart2P',
      fontSize: '13px',
      color: '#ffe8a3'
    }).setOrigin(0.5).setDepth(53);

    const flavorText = this.add.text(width / 2, height * 0.76, PATTERN_RARITY_FLAVOR[this.correctValue], {
      fontFamily: 'Special Elite',
      fontSize: '20px',
      color: '#dff2de',
      align: 'center',
      wordWrap: { width: width * 0.6 },
      lineSpacing: 6
    }).setOrigin(0.5).setDepth(53);

    const hint = this.add.text(width / 2, height - 45, 'CLICK ANYWHERE TO CLOSE', {
      fontFamily: 'PressStart2P',
      fontSize: '10px',
      color: '#ffe8a3',
      backgroundColor: '#000000',
      padding: { left: 10, right: 10, top: 7, bottom: 7 }
    }).setOrigin(0.5).setDepth(54);

    const overlayObjects = [overlay, frame, patternImage, title, flavorText, hint];
    this.stageObjects.push(...overlayObjects);

    overlay.on('pointerdown', () => {
      overlayObjects.forEach(object => object?.destroy?.());
      this.stageObjects = this.stageObjects.filter(object => !overlayObjects.includes(object));
      this.setDialogue('Compare the ridge flow with Loop, Whorl and Arch references.');
    });
  }

  createDesk() {
    const { width, height } = this.scale;
    const background = this.add.image(width / 2, height / 2, 'desk1')
      .setOrigin(0.5)
      .setDisplaySize(width, height)
      .setDepth(0);
    this.addStageObject(background);
  }
}