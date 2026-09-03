import { BaseForensicMinigame } from './BaseForensicMinigame.js';
import { EventBus } from '../../EventBus.js';


const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];


const BLOOD_PATTERN = {
  'A+': { a: true, b: false, rh: true },
  'A-': { a: true, b: false, rh: false },
  'B+': { a: false, b: true, rh: true },
  'B-': { a: false, b: true, rh: false },
  'AB+': { a: true, b: true, rh: true },
  'AB-': { a: true, b: true, rh: false },
  'O+': { a: false, b: false, rh: true },
  'O-': { a: false, b: false, rh: false }
};


const BLOOD_IMAGE_KEY = {
  A: 'blood_type_A',
  B: 'blood_type_B',
  AB: 'blood_type_AB',
  O: 'blood_type_0'
};


const BOTTLE_HIT_RADIUS = 55;


const WELL_HIT_RADIUS = 45;


export class BloodAnalysisScene extends BaseForensicMinigame {
  constructor() {
    super('BloodAnalysisScene');

    this.evidenceBag = null;
    this.closedSwab = null;
    this.bloodSwab = null;
    this.slide = null;
    this.tweezers = null;
    this.pipette = null;

    this.reagentObjects = [];
    this.wells = [];
    this.loadedReagent = null;
    this.completedReagents = new Set();
    this.microscopeOpened = false;
  }

  init(data = {}) {
    super.init({ ...data, totalSteps: 4 });

    this.evidenceType = 'blood_type';

    const incoming = String(
      data.correctValue || this.correctValue || 'O+'
    ).trim().toUpperCase();

    this.correctValue = BLOOD_TYPES.includes(incoming)
      ? incoming
      : 'O+';

    this.evidenceBag = null;
    this.closedSwab = null;
    this.bloodSwab = null;
    this.slide = null;
    this.tweezers = null;
    this.pipette = null;
    this.reagentObjects = [];
    this.wells = [];
    this.loadedReagent = null;
    this.completedReagents = new Set();
    this.microscopeOpened = false;
  }

  create() {
    super.create();
    EventBus.emit('hideHUD');
  }

  getTitle() {
    return 'BLOOD TYPE ANALYSIS';
  }

  getSubtitle() {
    return 'Serological evidence classification';
  }

  getRetryHint() {
    return 'Prepare a fresh slide, apply each reagent to its matching well, then inspect the reaction pattern.';
  }

  createEvidenceFlow() {
    this.startStep1();
  }

  startStep1() {
    this.clearStage();
    this.setStep(0);
    this.setInstructions('Step 1: Use the tweezers to remove the sealed blood swab from the evidence bag.');
    this.setDialogue('Drag the tweezers over the evidence bag.');

    const { width, height } = this.scale;
    this.createDesk();

    this.evidenceBag = this.add.image(width * 0.91, height * 0.77, 'evidence_bag')
      .setOrigin(0.5)
      .setDisplaySize(340, 270)
      .setDepth(2);
    this.addStageObject(this.evidenceBag);

    this.closedSwab = this.add.image(width * 0.85, height * 0.68, 'blood_swab_closed')
      .setOrigin(0.5)
      .setDisplaySize(180, 130)
      .setDepth(3)
      .setVisible(false);
    this.addStageObject(this.closedSwab);

    this.createTweezers(width * 0.58, height * 0.53, (tipX, tipY) => {
      if (!this.evidenceBag.getBounds().contains(tipX, tipY)) {
        this.penalize(3);
        this.setDialogue('The tweezers missed the evidence bag. Try again.');
        return;
      }

      this.closedSwab.setVisible(true);
      this.closedSwab.setPosition(this.tweezers.x - 45, this.tweezers.y + 50);
      this.evidenceBag.setAlpha(0.6);
      this.tweezers.disableInteractive();

      this.setDialogue('Sealed swab recovered. Open it with the tweezers.');

      this.time.delayedCall(450, () => {
        if (!this.resolved) this.startStep2();
      });
    });
  }

  startStep2() {
    this.clearStage();
    this.setStep(1);
    this.setInstructions('Step 2: Open the sealed swab with the tweezers and expose the blood sample.');
    this.setDialogue('Drag the tweezers to the sealed swab.');

    const { width, height } = this.scale;
    this.createDesk();

    this.closedSwab = this.add.image(width * 0.91, height * 0.77, 'blood_swab_closed')
      .setOrigin(0.5)
      .setDisplaySize(240, 170)
      .setDepth(2);
    this.addStageObject(this.closedSwab);

    const targetGlow = this.add.circle(this.closedSwab.x, this.closedSwab.y, 82, 0x8bd1ff, 0.12)
      .setStrokeStyle(2, 0x8bd1ff, 0.75)
      .setDepth(3);
    this.addStageObject(targetGlow);

    this.tweens.add({
      targets: targetGlow,
      alpha: { from: 0.12, to: 0.34 },
      scale: { from: 0.92, to: 1.08 },
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    this.createTweezers(width * 0.58, height * 0.53, (tipX, tipY) => {
      if (!this.closedSwab.getBounds().contains(tipX, tipY)) {
        this.penalize(3);
        this.setDialogue('The tweezers need to grip the sealed swab.');
        return;
      }

      targetGlow.destroy();
      this.closedSwab.destroy();

      this.bloodSwab = this.add.image(width * 0.91, height * 0.77, 'blood_swab')
        .setOrigin(0.5)
        .setDisplaySize(230, 165)
        .setDepth(3);
      this.addStageObject(this.bloodSwab);

      this.tweezers.disableInteractive();
      this.tweezers.setVisible(false);

      this.setDialogue('Swab opened. Transfer the blood sample to the preparation board.');

      this.time.delayedCall(500, () => {
        if (!this.resolved) this.startStep3();
      });
    });
  }

  startStep3() {
    this.clearStage();
    this.setStep(2);
    this.setInstructions('Step 3: Drag the blood swab onto the preparation board to create a microscope slide.');
    this.setDialogue('Move the open swab onto the preparation board.');

    const { width, height } = this.scale;
    this.createDesk();

    this.slide = this.add.image(width * 0.39, 670, 'hair_board')
      .setOrigin(0.5)
      .setDisplaySize(630, 180)
      .setDepth(1);
    this.addStageObject(this.slide);

    const boardGlow = this.add.ellipse(this.slide.x, this.slide.y, 260, 115, 0x8bd1ff, 0.12)
      .setStrokeStyle(2, 0x8bd1ff, 0.7)
      .setDepth(2);
    this.addStageObject(boardGlow);

    this.bloodSwab = this.add.image(width * 0.91, height * 0.77, 'blood_swab')
      .setOrigin(0.5)
      .setDisplaySize(230, 165)
      .setDepth(4)
      .setInteractive({ draggable: true, useHandCursor: true });
    this.addStageObject(this.bloodSwab);
    this.input.setDraggable(this.bloodSwab);

    this.bloodSwab.on('drag', (pointer, dragX, dragY) => {
      if (this.resolved || !this.bloodSwab?.active) return;
      this.bloodSwab.setPosition(dragX, dragY);
    });

    this.bloodSwab.on('dragend', () => {
      if (this.resolved || !this.slide?.active) return;

      if (!this.slide.getBounds().contains(this.bloodSwab.x, this.bloodSwab.y)) {
        this.penalize(3);
        this.setDialogue('The sample must be transferred onto the preparation board.');
        return;
      }

      boardGlow.destroy();
      this.bloodSwab.disableInteractive();
      this.bloodSwab.setVisible(false);
      this.slide.setTexture('blood_microscope_slide');
      this.slide.setDisplaySize(1100, 300);

      this.setDialogue('Slide prepared. Apply Anti-A, Anti-B and Anti-Rh reagents.');

      this.time.delayedCall(500, () => {
        if (!this.resolved) this.startStep4();
      });
    });
  }

  startStep4() {
    this.clearStage();
    this.setStep(3);
    this.setInstructions('Step 4: Load each reagent with the pipette and place it into the matching slide well.');
    this.setDialogue('Use the pipette: reagent bottle first, matching well second.');

    const { width, height } = this.scale;
    this.createDesk();

    this.slide = this.add.image(width * 0.39, 670, 'blood_microscope_slide')
      .setOrigin(0.5)
      .setDisplaySize(1100, 300)
      .setDepth(1);
    this.addStageObject(this.slide);

    const reagentData = [
      { id: 'A', key: 'blood_reagent_A', x: width * 0.21, y: height * 0.46, color: 0x4d9cff },
      { id: 'B', key: 'blood_reagent_B', x: width * 0.21, y: height * 0.60, color: 0xffbb3f },
      { id: 'Rh', key: 'blood_reagent_Rh', x: width * 0.21, y: height * 0.74, color: 0x87d96b }
    ];

    this.reagentObjects = reagentData.map(data => {
      const bottle = this.add.image(data.x, data.y, data.key)
        .setOrigin(0.5)
        .setDisplaySize(400, 250)
        .setDepth(3);
      this.addStageObject(bottle);

      const label = this.add.text(data.x, data.y + 75, `ANTI-${data.id}`, {
        fontFamily: 'PressStart2P',
        fontSize: '10px',
        color: '#c30000'
      }).setOrigin(0.5).setDepth(4);
      this.addStageObject(label);

      return { ...data, bottle, label, used: false };
    });

    const wellOffsets = [
      { id: 'A', x: -125, y: 0 },
      { id: 'B', x: 0, y: 0 },
      { id: 'Rh', x: 125, y: 0 }
    ];

    this.wells = wellOffsets.map(data => {
      const x = this.slide.x + data.x;
      const y = this.slide.y + data.y;
      const circle = this.add.circle(x, y, 34, 0x701313, 0.82)
        .setStrokeStyle(3, 0xe7d8bf, 0.85)
        .setDepth(3);
      this.addStageObject(circle);

      const label = this.add.text(x, y + 54, data.id, {
        fontFamily: 'PressStart2P',
        fontSize: '12px',
        color: '#c30000'
      }).setOrigin(0.5).setDepth(4);
      this.addStageObject(label);

      return { ...data, x, wellY: y, circle, label };
    });

    this.createPipette(width * 0.38, height * 0.28);
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

    const tipOffsetX = -50;
    const tipOffsetY = -50;

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

  createPipette(startX, startY) {
    this.pipette = this.add.image(960, 580, 'pipette')
      .setDepth(6)
      .setInteractive({ draggable: true, useHandCursor: true });
    this.addStageObject(this.pipette);
    this.input.setDraggable(this.pipette);

    const tipOffsetX = -280;
    const tipOffsetY = -3;

    const marker = this.add.circle(this.pipette.x + tipOffsetX, this.pipette.y + tipOffsetY, 10, 0xe7f7ff, 0.9)
      .setStrokeStyle(2, 0xffffff, 1)
      .setDepth(8);
    this.addStageObject(marker);

    this.pipette.on('drag', (pointer, dragX, dragY) => {
      if (this.resolved || !this.pipette?.active) return;
      this.pipette.setPosition(dragX, dragY);
      marker.setPosition(dragX + tipOffsetX, dragY + tipOffsetY);
    });

    this.pipette.on('dragend', () => {
      if (this.resolved || !this.pipette?.active) return;

      const tipX = this.pipette.x + tipOffsetX;
      const tipY = this.pipette.y + tipOffsetY;

      const bottleHit = this.reagentObjects.find(reagent =>
        !reagent.used &&
        Phaser.Math.Distance.Between(tipX, tipY, reagent.bottle.x, reagent.bottle.y) <= BOTTLE_HIT_RADIUS
      );

      if (bottleHit) {
        this.loadedReagent = bottleHit.id;
        marker.setFillStyle(bottleHit.color, 1);
        this.setDialogue(`Anti-${bottleHit.id} loaded. Place it in the ${bottleHit.id} well.`);
        return;
      }

      const usedBottleHit = this.reagentObjects.find(reagent =>
        reagent.used &&
        Phaser.Math.Distance.Between(tipX, tipY, reagent.bottle.x, reagent.bottle.y) <= BOTTLE_HIT_RADIUS
      );
      if (usedBottleHit) {
        this.setDialogue(`Anti-${usedBottleHit.id} has already been used.`);
        return;
      }

      const wellHit = this.wells.find(well =>
        Phaser.Math.Distance.Between(tipX, tipY, well.circle.x, well.circle.y) <= WELL_HIT_RADIUS
      );

      if (!wellHit) {
        this.penalize(3);
        this.setDialogue('Aim the pipette at a reagent bottle or one of the slide wells.');
        return;
      }

      if (!this.loadedReagent) {
        this.penalize(3);
        this.setDialogue('Load a reagent into the pipette first.');
        return;
      }

      if (this.loadedReagent !== wellHit.id) {
        this.penalize(5);
        this.setDialogue(`Wrong well. Anti-${this.loadedReagent} belongs in the ${this.loadedReagent} well.`);
        return;
      }

      if (this.completedReagents.has(wellHit.id)) {
        this.setDialogue(`The ${wellHit.id} well already contains its reagent.`);
        return;
      }

      this.applyReagent(wellHit, this.loadedReagent);
      this.loadedReagent = null;
      marker.setFillStyle(0xe7f7ff, 0.9);
    });
  }

  applyReagent(well, reagentId) {
    const reaction = BLOOD_PATTERN[this.correctValue][reagentId.toLowerCase() === 'rh' ? 'rh' : reagentId.toLowerCase()];
    this.completedReagents.add(reagentId);

    const usedBottle = this.reagentObjects.find(reagent => reagent.id === reagentId);
    if (usedBottle) {
      usedBottle.used = true;
      usedBottle.bottle.setAlpha(0.35);
      usedBottle.label.setAlpha(0.35);
    }

    well.circle.setFillStyle(reaction ? 0xa61111 : 0x6d1717, 1);
    well.circle.setStrokeStyle(4, reaction ? 0xffd0d0 : 0xe7d8bf, 1);

    if (reaction) {
      for (let index = 0; index < 7; index++) {
        const angle = (Math.PI * 2 * index) / 7;
        const dot = this.add.circle(
          well.circle.x + Math.cos(angle) * (index % 2 ? 12 : 19),
          well.circle.y + Math.sin(angle) * (index % 2 ? 12 : 19),
          4,
          0xffd4d4,
          0.95
        ).setDepth(5);
        this.addStageObject(dot);
      }
    }

    this.setDialogue(`Anti-${reagentId} applied. ${3 - this.completedReagents.size} reagent(s) remaining.`);

    if (this.completedReagents.size === 3) {
      this.pipette.disableInteractive();
      this.time.delayedCall(600, () => {
        if (!this.resolved) this.startClassification();
      });
    }
  }

  startClassification() {
    this.clearStage();
    this.setStep(3);
    this.setInstructions('Step 4: Inspect the microscope reaction profile and identify the blood group and Rh factor.');
    this.setDialogue('Click the microscope. Then select the exact blood type card.');

    const { width, height } = this.scale;
    this.createDesk();

    const microscopeHotspot = this.add.zone(width * 0.36, height * 0.43, width * 0.42, height * 0.74)
      .setOrigin(0.5)
      .setDepth(4)
      .setInteractive({ useHandCursor: true });
    this.addStageObject(microscopeHotspot);

    const hint = this.add.text(width * 0.36, height * 0.82, 'CLICK MICROSCOPE', {
      fontFamily: 'PressStart2P',
      fontSize: '10px',
      color: '#ffe8a3',
      backgroundColor: '#15100d',
      padding: { left: 8, right: 8, top: 6, bottom: 6 }
    }).setOrigin(0.5).setDepth(5);
    this.addStageObject(hint);

    microscopeHotspot.on('pointerdown', () => {
      if (this.resolved || this.microscopeOpened) return;
      this.microscopeOpened = true;
      hint.setVisible(false);
      microscopeHotspot.disableInteractive();
      this.showMicroscopeOverlay();
    });

    this.createBloodChoicePanel(width * 0.79, height * 0.50);
  }

  createBloodChoicePanel(x, y) {
    const baseTypes = Phaser.Utils.Array.Shuffle(['A', 'B', 'AB', 'O']);

    const panel = this.add.rectangle(x, y, 360, 590, 0x0d1713, 0.94)
      .setStrokeStyle(2, 0x39ff14, 0.6)
      .setDepth(1);
    this.addStageObject(panel);

    const title = this.add.text(x, y - 260, 'REFERENCE PROFILES', {
      fontFamily: 'Special Elite',
      fontSize: '21px',
      color: '#ffe8a3'
    }).setOrigin(0.5).setDepth(2);
    this.addStageObject(title);

    baseTypes.forEach((baseType, index) => {
      const optionY = y - 165 + index * 112;

      const image = this.add.image(x - 100, optionY, BLOOD_IMAGE_KEY[baseType])
        .setOrigin(0.5)
        .setDisplaySize(105, 66)
        .setDepth(3);
      this.addStageObject(image);

      const label = this.add.text(x - 100, optionY + 46, `TYPE ${baseType}`, {
        fontFamily: 'PressStart2P',
        fontSize: '9px',
        color: '#f4e6cf'
      }).setOrigin(0.5).setDepth(3);
      this.addStageObject(label);

      ['+', '-'].forEach((rh, rhIndex) => {
        const value = `${baseType}${rh}`;

        this.createButton(
          x + (rhIndex === 0 ? 20 : 100),
          optionY,
          72,
          52,
          value,
          () => {
            if (this.resolved) return;
            if (!this.microscopeOpened) {
              this.setDialogue('Look through the microscope before classifying the blood.');
              return;
            }
            this.resolveChoice(value, value === this.correctValue, 10);
          },
          {
            fontFamily: 'PressStart2P',
            fontSize: '12px',
            bgColor: 0x3a2920,
            borderColor: 0x7cc89f,
            depth: 4
          }
        );
      });
    });
  }

  showMicroscopeOverlay() {
    const { width, height } = this.scale;
    const baseType = this.correctValue.replace(/[+-]/g, '');
    const rhPositive = this.correctValue.endsWith('+');
    const pattern = BLOOD_PATTERN[this.correctValue];

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.88)
      .setDepth(50)
      .setInteractive({ useHandCursor: true });
    const frame = this.add.image(width / 2, height / 2, 'microscope_look')
      .setOrigin(0.5)
      .setDisplaySize(width * 0.76, height * 0.76)
      .setDepth(51);
    const bloodImage = this.add.image(width / 2, height * 0.43, BLOOD_IMAGE_KEY[baseType])
      .setOrigin(0.5)
      .setDisplaySize(width * 0.36, height * 0.32)
      .setDepth(52);

    const title = this.add.text(width / 2, height * 0.13, 'MICROSCOPE: REAGENT REACTIONS', {
      fontFamily: 'PressStart2P',
      fontSize: '13px',
      color: '#ffe8a3'
    }).setOrigin(0.5).setDepth(53);

    const reactionText = this.add.text(width / 2, height * 0.72, [
      `ANTI-A: ${pattern.a ? 'AGGLUTINATION' : 'NO REACTION'}`,
      `ANTI-B: ${pattern.b ? 'AGGLUTINATION' : 'NO REACTION'}`,
      `ANTI-Rh: ${pattern.rh ? 'AGGLUTINATION' : 'NO REACTION'}`,
      `Rh FACTOR: ${rhPositive ? 'POSITIVE' : 'NEGATIVE'}`
    ].join('\n'), {
      fontFamily: 'Special Elite',
      fontSize: '24px',
      color: '#dff2de',
      align: 'center',
      lineSpacing: 7
    }).setOrigin(0.5).setDepth(53);

    const hint = this.add.text(width / 2, height - 45, 'CLICK ANYWHERE TO CLOSE', {
      fontFamily: 'PressStart2P',
      fontSize: '10px',
      color: '#ffe8a3',
      backgroundColor: '#000000',
      padding: { left: 10, right: 10, top: 7, bottom: 7 }
    }).setOrigin(0.5).setDepth(54);

    const overlayObjects = [overlay, frame, bloodImage, title, reactionText, hint];
    this.stageObjects.push(...overlayObjects);

    overlay.on('pointerdown', () => {
      overlayObjects.forEach(object => object?.destroy?.());
      this.stageObjects = this.stageObjects.filter(object => !overlayObjects.includes(object));
      this.setDialogue('Compare the reaction profile with the reference cards.');
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