import { BaseForensicMinigame } from './BaseForensicMinigame.js';
import { EventBus } from '../../EventBus.js';

const HAIR_COLORS = [
  'black',
  'brown',
  'blonde',
  'red',
  'grey',
  'white',
  'auburn'
];

export class HairAnalysisScene extends BaseForensicMinigame {
  constructor() {
    super('HairAnalysisScene');

    this.bag = null;
    this.slide = null;
    this.tweezers = null;
    this.pipette = null;
    this.preparedStrand = null;

    this.hasStrandOnTweezers = false;
    this.hasStrandOnSlide = false;
    this.reagentApplied = false;
    this.microscopeOpened = false;
  }

  init(data = {}) {
    super.init({
      ...data,
      totalSteps: 3
    });

    this.evidenceType = 'hair_color';

    const incoming = data.correctValue || this.correctValue || 'brown';

    this.correctValue = HAIR_COLORS.includes(incoming)
      ? incoming
      : 'brown';

    this.bag = null;
    this.slide = null;
    this.tweezers = null;
    this.pipette = null;
    this.preparedStrand = null;

    this.hasStrandOnTweezers = false;
    this.hasStrandOnSlide = false;
    this.reagentApplied = false;
    this.microscopeOpened = false;
  }

  create() {
    super.create();
    EventBus.emit('hideHUD');
  }

  getTitle() {
    return 'HAIR FIBER ANALYSIS';
  }

  getSubtitle() {
    return 'Microscope strand classification';
  }

  getRetryHint() {
    return 'Carefully prepare the slide and compare the strand again.';
  }

  createEvidenceFlow() {
    this.startStep1();
  }

  startStep1() {
    this.clearStage();

    this.bag = null;
    this.slide = null;
    this.tweezers = null;
    this.pipette = null;
    this.preparedStrand = null;

    this.hasStrandOnTweezers = false;
    this.hasStrandOnSlide = false;
    this.reagentApplied = false;

    this.setStep(0);
    this.setInstructions(
      'Step 1: Transfer the hair strand from the evidence bag onto the slide.'
    );
    this.setDialogue(
      'Use the tweezers: pick up the strand from the bag, then place it on the slide.'
    );

    const { width, height } = this.scale;

    const bg = this.add
      .image(width / 2, height / 2, 'desk1')
      .setOrigin(0.5)
      .setDisplaySize(width, height)
      .setDepth(0);

    this.addStageObject(bg);

    this.bag = this.add
      .image(width * 0.92, height * 0.78, 'evidence_bag')
      .setOrigin(0.5)
      .setDisplaySize(320, 260)
      .setDepth(2);

    this.addStageObject(this.bag);

    this.slide = this.add
      .image(width * 0.4, 670, 'hair_board')
      .setOrigin(0.5)
      .setDisplaySize(430, 180)
      .setDepth(1);

    this.addStageObject(this.slide);

    this.tweezers = this.add
      .image(width * 0.59, 570, 'tweezers')
      .setOrigin(0.5)
      .setDisplaySize(350, 280)
      .setDepth(3)
      .setAngle(-125)
      .setInteractive({
        draggable: true,
        useHandCursor: true
      });

    this.addStageObject(this.tweezers);
    this.input.setDraggable(this.tweezers);

    const tipOffsetX = -45;
    const tipOffsetY = 50;

    this.tweezers.on('drag', (pointer, dragX, dragY) => {
      if (this.resolved || !this.tweezers?.active) return;

      this.tweezers.x = dragX;
      this.tweezers.y = dragY;
      this.tweezers.setAngle(125);

      if (this.hasStrandOnTweezers && this.preparedStrand?.active) {
        this.preparedStrand.x = dragX + tipOffsetX;
        this.preparedStrand.y = dragY + tipOffsetY;
      }
    });

    this.tweezers.on('dragend', () => {
      if (
        this.resolved ||
        !this.tweezers?.active ||
        !this.bag?.active ||
        !this.slide?.active
      ) {
        return;
      }

      const tipX = this.tweezers.x + tipOffsetX;
      const tipY = this.tweezers.y + tipOffsetY;

      if (
        !this.hasStrandOnTweezers &&
        this.bag.getBounds().contains(tipX, tipY)
      ) {
        this.hasStrandOnTweezers = true;

        this.setDialogue(
          'Strand picked from the evidence bag. Move it onto the slide.'
        );

        this.preparedStrand = this.add
          .image(tipX, tipY, this.getHairStrandKey())
          .setOrigin(0.5)
          .setDisplaySize(200, 150)
          .setDepth(4);

        this.addStageObject(this.preparedStrand);
        const dropTarget = this.add
  .circle(
    this.preparedStrand.x,
    this.preparedStrand.y,
    75,
    0x8bd1ff,
    0.12
  )
  .setStrokeStyle(2, 0x8bd1ff, 0.7)
  .setDepth(3);

this.addStageObject(dropTarget);

this.tweens.add({
  targets: dropTarget,
  alpha: { from: 0.08, to: 0.3 },
  scale: { from: 0.92, to: 1.08 },
  duration: 650,
  yoyo: true,
  repeat: -1,
  ease: 'Sine.easeInOut'
});
        return;
      }

      if (
        this.hasStrandOnTweezers &&
        this.slide.getBounds().contains(tipX, tipY)
      ) {
        this.hasStrandOnTweezers = false;
        this.hasStrandOnSlide = true;

        this.setDialogue(
          'Strand placed onto the slide. Prepare it with reagent.'
        );

        if (this.preparedStrand?.active) {
          this.preparedStrand.x = this.slide.x;
          this.preparedStrand.y = this.slide.y;
          this.preparedStrand.setDepth(2);
        }

        this.tweezers.disableInteractive();
        this.tweezers.setVisible(false);

        this.time.delayedCall(350, () => {
          if (!this.resolved) {
            this.startStep2();
          }
        });
      }
    });
  }

startStep2() {
  this.clearStage();

  this.bag = null;
  this.tweezers = null;
  this.pipette = null;
  this.preparedStrand = null;
  this.reagentApplied = false;

  this.setStep(1);
  this.setInstructions(
    'Step 2: Apply the reagent onto the prepared slide.'
  );
  this.setDialogue(
    'Match the blue pipette tip marker with the blue circle around the hair.'
  );

  const { width, height } = this.scale;

  const bg = this.add
    .image(width / 2, height / 2, 'desk1')
    .setOrigin(0.5)
    .setDisplaySize(width, height)
    .setDepth(0);

  this.addStageObject(bg);

  this.slide = this.add
    .image(width * 0.4, 670, 'hair_board')
    .setOrigin(0.5)
    .setDisplaySize(430, 180)
    .setDepth(1);

  this.addStageObject(this.slide);

  this.preparedStrand = this.add
    .image(this.slide.x, this.slide.y, this.getHairStrandKey())
    .setOrigin(0.5)
    .setDisplaySize(200, 150)
    .setDepth(2);

  this.addStageObject(this.preparedStrand);

  const hairTargetRadius = 75;

  const dropTarget = this.add
    .circle(
      this.preparedStrand.x,
      this.preparedStrand.y,
      hairTargetRadius,
      0x8bd1ff,
      0.12
    )
    .setStrokeStyle(2, 0x8bd1ff, 0.75)
    .setDepth(3);

  this.addStageObject(dropTarget);

  this.tweens.add({
    targets: dropTarget,
    alpha: { from: 0.08, to: 0.3 },
    scale: { from: 0.92, to: 1.08 },
    duration: 650,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  this.pipette = this.add
    .image(width * 0.63, 580, 'pipette')
    //.setOrigin(0.5)
    //.setDisplaySize(180, 220)
    .setDepth(4)
    .setInteractive({
      draggable: true,
      useHandCursor: true
    });

  this.addStageObject(this.pipette);
  this.input.setDraggable(this.pipette);

  // Dopasuj te offsety do rzeczywistego czubka pipety.
  const pipetteTipOffsetX = -290;
  const pipetteTipOffsetY = -10;

  // Mały niebieski marker wskazujący faktyczną końcówkę pipety.
  const pipetteTipMarker = this.add
    .circle(
      this.pipette.x + pipetteTipOffsetX,
      this.pipette.y + pipetteTipOffsetY,
      11,
      0x8bd1ff,
      0.8
    )
    .setStrokeStyle(2, 0xe4f8ff, 1)
    .setDepth(6);

  this.addStageObject(pipetteTipMarker);

  this.tweens.add({
    targets: pipetteTipMarker,
    alpha: { from: 0.55, to: 1 },
    scale: { from: 0.85, to: 1.18 },
    duration: 420,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  this.pipette.on('drag', (pointer, dragX, dragY) => {
    if (this.resolved || !this.pipette?.active) return;

    this.pipette.x = dragX;
    this.pipette.y = dragY;

    pipetteTipMarker.x = dragX + pipetteTipOffsetX;
    pipetteTipMarker.y = dragY + pipetteTipOffsetY;
  });

  this.pipette.on('dragend', () => {
    if (
      this.resolved ||
      this.reagentApplied ||
      !this.pipette?.active ||
      !this.preparedStrand?.active
    ) {
      return;
    }

    const tipX = this.pipette.x + pipetteTipOffsetX;
    const tipY = this.pipette.y + pipetteTipOffsetY;

    const hitHair = Phaser.Math.Distance.Between(
      tipX,
      tipY,
      this.preparedStrand.x,
      this.preparedStrand.y
    ) <= hairTargetRadius;

    if (hitHair) {
      this.reagentApplied = true;

      this.setDialogue(
        'Perfect. Reagent applied directly to the strand.'
      );

      const drop = this.add
        .circle(tipX, tipY, 14, 0x8bd1ff, 0.9)
        .setDepth(7);

      this.addStageObject(drop);

      dropTarget.destroy();
      pipetteTipMarker.destroy();

      this.preparedStrand.setTint(0xffffff);
      this.preparedStrand.setDepth(4);

      this.pipette.disableInteractive();
      this.pipette.setVisible(false);

      this.time.delayedCall(500, () => {
        if (!this.resolved) {
          this.startStep3();
        }
      });

      return;
    }

    this.penalize(5);

    this.setDialogue(
      'The blue markers did not meet. Aim the pipette tip at the hair.'
    );

    this.tweens.add({
      targets: [this.pipette, pipetteTipMarker],
      x: (target) => {
        return target === this.pipette
          ? width * 0.63
          : width * 0.63 + pipetteTipOffsetX;
      },
      y: (target) => {
        return target === this.pipette
          ? 580
          : 580 + pipetteTipOffsetY;
      },
      duration: 180,
      ease: 'Sine.easeOut'
    });
  });
}

  getHairOptions() {
    const distractors = Phaser.Utils.Array.Shuffle(
      HAIR_COLORS.filter((color) => color !== this.correctValue)
    ).slice(0, 3);

    return Phaser.Utils.Array.Shuffle([this.correctValue, ...distractors]);
  }

  startStep3() {
    this.clearStage();

    this.bag = null;
    this.slide = null;
    this.tweezers = null;
    this.pipette = null;
    this.preparedStrand = null;
    this.microscopeOpened = false;

    this.setStep(2);
    this.setInstructions(
      'Step 3: Compare the prepared strand and choose the correct color.'
    );
    this.setDialogue(
      'Click the microscope to view the strand, then choose a reference sample.'
    );

    const { width, height } = this.scale;

    const bg = this.add
      .image(width / 2, height / 2, 'desk1')
      .setOrigin(0.5)
      .setDisplaySize(width, height)
      .setDepth(0);

    this.addStageObject(bg);

    const microscopeHotspot = this.add
      .zone(width * 0.4, height * 0.37, 400, 720)
      .setOrigin(0.5)
      .setDepth(5)
      .setInteractive({
        useHandCursor: true
      });

    this.addStageObject(microscopeHotspot);

    microscopeHotspot.on('pointerover', () => {
      if (this.microscopeOpened) return;

      this.setDialogue(
        'The prepared strand is loaded. Click to view it under the microscope.'
      );
    });

    microscopeHotspot.on('pointerout', () => {
      if (this.microscopeOpened) return;

      this.setDialogue(
        'Click the microscope to view the strand, then use the reference panel.'
      );
    });

    microscopeHotspot.on('pointerdown', () => {
      if (this.microscopeOpened || this.resolved) return;

      this.microscopeOpened = true;
      microscopeHotspot.disableInteractive();
      this.showMicroscopeOverlay();
    });

    const panelX = width * 0.85;
    const panelY = height * 0.5;

    const panelBg = this.add
      .rectangle(panelX, panelY, 380, 420, 0x0d1713, 0.9)
      .setStrokeStyle(2, 0x39ff14, 0.6)
      .setDepth(1);

    this.addStageObject(panelBg);

    const panelTitle = this.add
      .text(panelX, panelY - 180, 'Reference samples', {
        fontFamily: 'SpecialElite',
        fontSize: '16px',
        color: '#ffe8a3'
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.addStageObject(panelTitle);

    const display = this.getHairOptions();

    display.forEach((value, index) => {
      const x = panelX;
      const y = panelY - 100 + index * 90;

      const swatch = this.add
        .image(x, y, this.getHairStrandKey(value))
        .setOrigin(0.5)
        .setDisplaySize(640, 170)
        .setDepth(2)
        .setInteractive({ useHandCursor: true });

      this.addStageObject(swatch);

      swatch.on('pointerover', () => {
        if (this.resolved) return;
        swatch.setTint(0x88ff88);
        this.setDialogue(
          `Sample: ${this.toDisplayText(value)} — click to classify.`
        );
      });

      swatch.on('pointerout', () => {
        swatch.clearTint();
        if (!this.resolved) {
          this.setDialogue(
            'Click the microscope to view the strand, then use the reference panel.'
          );
        }
      });

      swatch.on('pointerdown', () => {
        if (this.resolved) return;
        this.resolveChoice(value, value === this.correctValue, 10);
      });
    });
  }

  showMicroscopeOverlay() {
  const { width, height } = this.scale;
  const centerX = width / 2;
  const centerY = height / 2;

  const overlayBg = this.add
    .rectangle(centerX, centerY, width, height, 0x000000, 0.85)
    .setOrigin(0.5)
    .setDepth(50)
    .setInteractive({ useHandCursor: true });

  const microscopeView = this.add
    .image(centerX, centerY, 'microscope_look')
    .setOrigin(0.5)
    .setDisplaySize(width * 0.7, height * 0.7)
    .setDepth(51);

  const vignetteRadiusStart = width * 0.11;
  const eyeGap = width * 0.09;

  const vignetteMask = this.add.graphics().setDepth(52);

  vignetteMask.fillStyle(0x000000, 1);
  vignetteMask.fillRect(0, 0, width, height);

  const holeShape = this.make.graphics({
    x: 0,
    y: 0,
    add: false
  });

  holeShape.fillStyle(0xffffff, 1);
  holeShape.fillCircle(
    centerX - eyeGap,
    centerY,
    vignetteRadiusStart
  );
  holeShape.fillCircle(
    centerX + eyeGap,
    centerY,
    vignetteRadiusStart
  );

  const geoMask = holeShape.createGeometryMask();
  geoMask.invertAlpha = true;

  vignetteMask.setMask(geoMask);
  vignetteMask.setAlpha(0.9);

  const refStrand = this.add
    .image(centerX, centerY, this.getHairStrandKey())
    .setOrigin(0.5)
    .setDisplaySize(760, 300)
    .setDepth(53);

  const hintText = this.add
    .text(centerX, height - 55, 'CLICK ANYWHERE TO CLOSE', {
      fontFamily: 'PressStart2P',
      fontSize: '10px',
      color: '#ffe8a3',
      backgroundColor: '#000000',
      padding: {
        left: 10,
        right: 10,
        top: 7,
        bottom: 7
      }
    })
    .setOrigin(0.5)
    .setDepth(54)
    .setAlpha(0.85);

  const overlayObjects = [
    overlayBg,
    microscopeView,
    vignetteMask,
    holeShape,
    refStrand,
    hintText
  ];

  this.stageObjects.push(...overlayObjects);

  const closeMicroscope = () => {
    if (!overlayBg.active) return;

    overlayObjects.forEach((object) => {
      object.removeAllListeners?.();
      object.destroy();
    });

    this.stageObjects = this.stageObjects.filter(
      (object) => !overlayObjects.includes(object)
    );

    this.microscopeOpened = false;

    this.setDialogue(
      'Use the reference samples on the desk to classify the strand.'
    );
  };

  overlayBg.on('pointerdown', () => {
    closeMicroscope();
  });
}

  onWrongChoice(value) {
    super.onWrongChoice(value);
  }

  onCorrectChoice(value) {
    super.onCorrectChoice(value);
  }

  getHairStrandKey(value = this.correctValue) {
    const map = {
      blonde: 'hair_strand_blond',
      black: 'hair_strand_black',
      brown: 'hair_strand_brown',
      red: 'hair_strand_red',
      grey: 'hair_strand_grey',
      white: 'hair_strand_white',
      auburn: 'hair_strand_auburn'
    };

    return map[value] || 'hair_strand_brown';
  }
}