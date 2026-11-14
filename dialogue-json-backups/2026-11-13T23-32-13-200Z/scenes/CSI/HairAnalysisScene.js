import { BaseForensicMinigame } from './BaseForensicMinigame.js';
import { ForensicHelpController } from './ForensicHelpController.js';
import { gameState } from '../../GameData.js';


const HAIR_COLORS = ['black', 'brown', 'blonde', 'red', 'grey', 'white', 'auburn'];


export class HairAnalysisScene extends BaseForensicMinigame {
  constructor() {
    super('HairAnalysisScene');
    this.help = null;
  }


  init(data = {}) {
    super.init({ ...data, totalSteps: 3 });
    this.evidenceType = 'hair_color';
    let incoming = String(data.correctValue || this.correctValue || 'brown').trim().toLowerCase();
    if (incoming === 'blond') incoming = 'blonde';
    this.correctValue = HAIR_COLORS.includes(incoming) ? incoming : 'brown';
    this.help = null;
    this.bag = this.slide = this.tweezers = this.pipette = this.preparedStrand = null;
    this.hasStrandOnTweezers = false;
    this.hasStrandOnSlide = false;
    this.reagentApplied = false;
    this.microscopeOpened = false;
    this.microscopeExamined = false;
    this.stageTransitioning = false;
    this.sampleViews = [];
    this.microscopeHotspot = null;
    this.swatchValues = [];
    this.pendingStageCalls = [];
  }


  create() {
    super.create();
    this.help = new ForensicHelpController(this);
    this.help.create();
  }


  getTitle() { return 'HAIR FIBER ANALYSIS'; }
  getSubtitle() { return 'Microscope strand classification'; }
  getRetryHint() { return 'Compare the strand with the reference samples again.'; }
  createEvidenceFlow() { this.startStep1(); }


  createDesk() {
    const { width, height } = this.scale;
    this.addStageObject(this.add.image(width / 2, height / 2, 'desk1')
      .setOrigin(0.5).setDisplaySize(width, height).setDepth(0));
  }


  later(delay, callback) {
    const event = this.time.delayedCall(delay, () => {
      this.pendingStageCalls = this.pendingStageCalls.filter(item => item !== event);
      if (!this.resolved && this.sys.isActive()) callback();
    });
    this.pendingStageCalls.push(event);
  }


  startStep1() {
    this.clearStage();
    this.stageTransitioning = false;
    this.hasStrandOnTweezers = false;
    this.hasStrandOnSlide = false;
    this.setStep(0);
    this.setInstructions('Step 1: Transfer the strand from the evidence bag onto the slide.');
    this.setDialogue('Use the tweezers: bag first, slide second.');
    this.createDesk();
    const { width, height } = this.scale;
    this.bag = this.addStageObject(this.add.image(width * 0.92, height * 0.78, 'evidence_bag')
      .setDisplaySize(320, 260).setDepth(2));
    this.slide = this.addStageObject(this.add.image(width * 0.4, 670, 'hair_board')
      .setDisplaySize(430, 180).setDepth(1));
    this.tweezers = this.addStageObject(this.add.image(width * 0.59, 570, 'tweezers')
      .setDisplaySize(350, 280).setDepth(3).setAngle(-125)
      .setInteractive({ draggable: true, useHandCursor: true }));
    this.input.setDraggable(this.tweezers);
    const dx = -45, dy = 50;
    this.tweezers.on('drag', (pointer, x, y) => {
      if (this.resolved || this.stageTransitioning) return;
      this.tweezers.setPosition(x, y).setAngle(125);
      if (this.hasStrandOnTweezers) this.preparedStrand?.setPosition(x + dx, y + dy);
    });
    this.tweezers.on('dragend', () => {
      if (this.resolved || this.stageTransitioning) return;
      const x = this.tweezers.x + dx, y = this.tweezers.y + dy;
      if (!this.hasStrandOnTweezers && this.bag.getBounds().contains(x, y)) {
        this.hasStrandOnTweezers = true;
        this.preparedStrand = this.addStageObject(this.add.image(x, y, this.getHairStrandKey())
          .setDisplaySize(200, 150).setDepth(4));
        this.setDialogue('Strand picked up. Place it on the slide.');
      } else if (this.hasStrandOnTweezers && this.slide.getBounds().contains(x, y)) {
        this.hasStrandOnTweezers = false;
        this.hasStrandOnSlide = true;
        this.stageTransitioning = true;
        this.preparedStrand.setPosition(this.slide.x, this.slide.y).setDepth(2);
        this.tweezers.disableInteractive().setVisible(false);
        this.setDialogue('Strand placed on the slide.');
        this.later(350, () => this.startStep2());
      }
    });
  }


  startStep2() {
    this.clearStage();
    this.stageTransitioning = false;
    this.reagentApplied = false;
    this.setStep(1);
    this.setInstructions('Step 2: Apply reagent directly to the strand.');
    this.setDialogue('The small blue dot marks the actual pipette tip.');
    this.createDesk();
    const { width } = this.scale;
    this.slide = this.addStageObject(this.add.image(width * 0.4, 670, 'hair_board')
      .setDisplaySize(430, 180).setDepth(1));
    this.preparedStrand = this.addStageObject(this.add.image(this.slide.x, this.slide.y, this.getHairStrandKey())
      .setDisplaySize(200, 150).setDepth(2));
    const target = this.addStageObject(this.add.circle(this.slide.x, this.slide.y, 75, 0x8bd1ff, 0.12)
      .setStrokeStyle(2, 0x8bd1ff, 0.75).setDepth(3));
    this.pipette = this.addStageObject(this.add.image(width * 0.63, 580, 'pipette')
      .setDepth(4).setInteractive({ draggable: true, useHandCursor: true }));
    this.input.setDraggable(this.pipette);
    const dx = -290, dy = -10;
    const marker = this.addStageObject(this.add.circle(this.pipette.x + dx, this.pipette.y + dy, 11, 0x8bd1ff, 0.8)
      .setStrokeStyle(2, 0xe4f8ff).setDepth(6));
    this.pipette.on('drag', (pointer, x, y) => {
      if (this.resolved || this.stageTransitioning) return;
      this.pipette.setPosition(x, y);
      marker.setPosition(x + dx, y + dy);
    });
    this.pipette.on('dragend', () => {
      if (this.resolved || this.stageTransitioning) return;
      const x = this.pipette.x + dx, y = this.pipette.y + dy;
      if (Phaser.Math.Distance.Between(x, y, this.slide.x, this.slide.y) <= 75) {
        this.reagentApplied = true;
        this.stageTransitioning = true;
        this.setDialogue('Reagent applied directly to the strand.');
        target.setVisible(false);
        marker.setVisible(false);
        this.pipette.disableInteractive().setVisible(false);
        this.later(500, () => this.startStep3());
      } else {
        this.penalize(5);
        this.setDialogue('Aim the blue pipette tip at the circle around the strand.');
        this.pipette.setPosition(width * 0.63, 580);
        marker.setPosition(this.pipette.x + dx, this.pipette.y + dy);
      }
    });
  }


  getHairOptions() {
    const receipt = Object.values(gameState.forensicHintReceipts || {}).find(item =>
      item.sceneId === this.scene.key && item.caseKey === this.caseKey &&
      item.stationId === this.stationId && item.stepId === 'compare_samples' &&
      item.evidenceId === (this.evidenceConfig?.id || this.evidenceType));
    const excluded = receipt?.excludedValue;
    const pool = Phaser.Utils.Array.Shuffle(HAIR_COLORS.filter(value =>
      value !== this.correctValue && value !== excluded));
    const wrong = HAIR_COLORS.includes(excluded) && excluded !== this.correctValue
      ? [excluded, ...pool.slice(0, 2)] : pool.slice(0, 3);
    return Phaser.Utils.Array.Shuffle([this.correctValue, ...wrong]);
  }


  startStep3() {
    this.clearStage();
    this.stageTransitioning = false;
    this.microscopeOpened = false;
    this.microscopeExamined = false;
    this.sampleViews = [];
    this.setStep(2);
    this.setInstructions('Step 3: Inspect the strand, then choose a reference sample.');
    this.setDialogue('Click the microscope. You can reopen it to compare again.');
    this.createDesk();
    const { width, height } = this.scale;
    this.microscopeHotspot = this.addStageObject(this.add.zone(width * 0.4, height * 0.37, 400, 720)
      .setDepth(5).setInteractive({ useHandCursor: true }));
    this.microscopeHotspot.on('pointerdown', () => {
      if (!this.resolved && !this.microscopeOpened) this.showMicroscopeOverlay();
    });
    const x = width * 0.85, y = height * 0.5;
    this.addStageObject(this.add.rectangle(x, y, 380, 420, 0x0d1713, 0.95)
      .setStrokeStyle(2, 0x39ff14, 0.6).setDepth(1));
    this.addStageObject(this.add.text(x, y - 180, 'Reference samples', {
      fontFamily: 'SpecialElite', fontSize: '20px', color: '#ffe8a3'
    }).setOrigin(0.5).setDepth(2));
    this.swatchValues = this.getHairOptions();
    this.swatchValues.forEach((value, index) => {
      const sampleY = y - 100 + index * 90;
      const image = this.addStageObject(this.add.image(x, sampleY, this.getHairStrandKey(value))
        .setDisplaySize(320, 76).setDepth(2).setInteractive({ useHandCursor: true }));
      const label = this.addStageObject(this.add.text(x, sampleY + 32, this.toDisplayText(value), {
        fontFamily: 'SpecialElite', fontSize: '15px', color: '#f0e3c6'
      }).setOrigin(0.5).setDepth(3));
      this.sampleViews.push({ value, image, label });
      image.on('pointerdown', () => {
        if (this.resolved || this.microscopeOpened) return;
        if (!this.microscopeExamined) {
          this.setDialogue('Inspect the strand under the microscope first.');
          return;
        }
        this.resolveChoice(value, value === this.correctValue, 10);
      });
    });
    const definition = this.getForensicHelp();
    const receipt = definition && this.help?.receipt(definition);
    if (receipt) this.applyForensicHint(receipt);
  }


  showMicroscopeOverlay() {
    this.microscopeOpened = true;
    this.microscopeExamined = true;
    const { width, height } = this.scale;
    const overlay = this.addStageObject(this.add.rectangle(width / 2, height / 2,
      width, height, 0x000000, 0.9).setDepth(500).setInteractive());
    const frame = this.addStageObject(this.add.image(width / 2, height / 2, 'microscope_look')
      .setDisplaySize(width * 0.7, height * 0.7).setDepth(501));
    const strand = this.addStageObject(this.add.image(width / 2, height / 2, this.getHairStrandKey())
      .setDisplaySize(760, 300).setDepth(502));
    const label = this.addStageObject(this.add.text(width / 2, height - 100, 'CLICK TO CLOSE — YOU CAN EXAMINE AGAIN', {
      fontFamily: 'PressStart2P', fontSize: '10px', color: '#ffe8a3'
    }).setOrigin(0.5).setDepth(503));
    const objects = [overlay, frame, strand, label];
    overlay.on('pointerdown', (pointer, x, y, event) => {
      event?.stopPropagation();
      objects.forEach(object => object.destroy());
      this.stageObjects = this.stageObjects.filter(object => !objects.includes(object));
      this.microscopeOpened = false;
      this.setDialogue('Compare the strand with the reference samples.');
    });
  }


  getForensicHelp() {
    if (this.resolved || this.stageTransitioning) return null;
    if (this.currentStep === 0) {
      return this.hasStrandOnTweezers ? {
        id: 'place_strand', instructions: 'Drag the tweezers. Release their tip over the slide.',
        text: 'The strand is already held. Move the tweezers to the highlighted slide and release.',
        targets: [this.slide]
      } : {
        id: 'pick_up_strand', instructions: 'Drag the tweezers to the evidence bag, then release. Carry the strand to the slide.',
        text: 'Start with the highlighted tweezers and evidence bag. The tip, not the handle, must reach the bag.',
        targets: [this.tweezers, this.bag]
      };
    }
    if (this.currentStep === 1) return {
      id: 'apply_reagent', instructions: 'Drag the pipette. Release when its small blue tip marker is inside the blue target circle.',
      text: 'The target is the hair on the slide. Align the small blue pipette marker with its centre, then release.',
      targets: [this.preparedStrand]
    };
    if (this.currentStep === 2) {
      if (!this.microscopeExamined) return {
        id: 'inspect_strand', instructions: 'Click the microscope to open the enlarged view. Click the dark background to close it.',
        text: 'The highlighted microscope holds the prepared strand. Open it before comparing the reference samples.',
        targets: [this.microscopeHotspot]
      };
      const excluded = [...this.swatchValues].filter(value => value !== this.correctValue).sort()[0];
      return {
        id: 'compare_samples', instructions: 'Compare the enlarged strand with the four samples. You may reopen the microscope for free.',
        text: 'One reference has been ruled out. Compare the remaining samples with the strand; the answer is still yours.',
        excludedValue: excluded, targets: []
      };
    }
    return null;
  }


  applyForensicHint(receipt) {
    if (!receipt.excludedValue) return;
    const sample = this.sampleViews.find(item => item.value === receipt.excludedValue);
    if (sample && sample.value !== this.correctValue) {
      sample.image.disableInteractive().setAlpha(0.25);
      sample.label.setText(`${this.toDisplayText(sample.value)} — ruled out`).setAlpha(0.55);
    }
  }


  flashWrongSelection(value) {
    const sample = this.sampleViews.find(item => item.value === value);
    if (!sample?.image?.active) return;
    sample.image.setTint(0xff6666);
    this.time.delayedCall(250, () => {
      if (sample.image?.active && !this.resolved) sample.image.clearTint();
    });
  }


  onCorrectChoice(value) {
    super.onCorrectChoice(value);
    for (const sample of this.sampleViews) {
      sample.image.disableInteractive();
      if (sample.value === value) sample.image.setTint(0x88ff88);
    }
  }


  getResultPayload() {
    const receipts = this.help?.getReceipts() || [];
    return {
      ...super.getResultPayload(),
      hintsUsed: receipts.length,
      hintHistoryEntryIds: receipts.map(receipt => receipt.historyEntryId),
      assistanceMethods: [...new Set(receipts.map(receipt => receipt.method))],
      proceduralIssues: receipts.filter(receipt => receipt.proceduralIssue).map(receipt => ({
        stepId: receipt.stepId, issue: receipt.proceduralIssue,
        historyEntryId: receipt.historyEntryId
      }))
    };
  }


  cleanup() {
    this.help?.destroy();
    this.help = null;
    for (const event of this.pendingStageCalls || []) event.remove(false);
    this.pendingStageCalls = [];
    super.cleanup();
    this.bag = this.slide = this.tweezers = this.pipette = this.preparedStrand = null;
    this.microscopeHotspot = null;
    this.sampleViews = [];
    this.swatchValues = [];
  }


  getHairStrandKey(value = this.correctValue) {
    const keys = {
      blonde: 'hair_strand_blond', black: 'hair_strand_black', brown: 'hair_strand_brown',
      red: 'hair_strand_red', grey: 'hair_strand_grey', white: 'hair_strand_white', auburn: 'hair_strand_auburn'
    };
    return keys[value] || 'hair_strand_brown';
  }
}