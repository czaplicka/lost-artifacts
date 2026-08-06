
// ============================================================
// UniversalForensicMinigame.js
// One CSI identity-analysis scene with 5 evidence variants:
// - hair_color
// - blood_type
// - biological_sex
// - shoe_size_category
// - race
//
// Expected input:
//   evidenceType: one of the keys above
//   correctValue: generated thief value for that evidence
//   gameState: optional shared state
//   onComplete: optional callback(score, value)
//
// Expected output contract:
//   this.events.emit('minigame-complete', { score, value })
//   this.events.emit('minigame-closed')
// ============================================================

export default class UniversalForensicMinigame extends Phaser.Scene {
  constructor() {
    super('UniversalForensicMinigame');

    this.evidenceType = 'hair_color';
    this.correctValue = null;
    this.onComplete = null;
    this.gameState = null;

    this.score = 100;
    this.mistakes = 0;
    this.resolved = false;
    this.selectedValue = null;
    this.optionButtons = [];
    this.stageObjects = [];
    this.progressNodes = [];
    this.currentStep = 0;
    this.totalSteps = 3;
    this.timerEvent = null;
    this.secondsElapsed = 0;
  }

  init(data) {
    this.evidenceType = data?.evidenceType || 'hair_color';
    this.correctValue = data?.correctValue ?? null;
    this.onComplete = data?.onComplete || null;
    this.gameState = data?.gameState || null;

    this.score = 100;
    this.mistakes = 0;
    this.resolved = false;
    this.selectedValue = null;
    this.optionButtons = [];
    this.stageObjects = [];
    this.progressNodes = [];
    this.currentStep = 0;
    this.totalSteps = 3;
    this.secondsElapsed = 0;
  }

  create() {
    this.createBackdrop();
    this.createHeader();
    this.createFrame();
    this.createFooter();
    this.startTimer();
    this.startEvidenceFlow();
  }

  createBackdrop() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x07110d, 0.96);

    for (let i = 0; i < 12; i++) {
      const x = 40 + i * 64;
      this.add.rectangle(x, 0, 2, height, 0x113225, 0.15).setOrigin(0.5, 0);
    }

    this.add.rectangle(width / 2, height / 2, width - 40, height - 40, 0x0d1713, 0.92)
      .setStrokeStyle(2, 0x39ff14, 0.45);
  }

  createHeader() {
    const { width } = this.scale;

    this.titleText = this.add.text(width / 2, 28, this.getTitle(), {
      fontFamily: 'PressStart2P',
      fontSize: '14px',
      color: '#39ff14'
    }).setOrigin(0.5);

    this.subtitleText = this.add.text(width / 2, 54, this.getSubtitle(), {
      fontFamily: 'SpecialElite',
      fontSize: '18px',
      color: '#d5e6dc'
    }).setOrigin(0.5);

    this.instructionsText = this.add.text(width / 2, 84, '', {
      fontFamily: 'SpecialElite',
      fontSize: '18px',
      color: '#ffe8a3',
      align: 'center',
      wordWrap: { width: 620 }
    }).setOrigin(0.5);

    this.progressGroup = this.add.container(0, 0);
    const startX = width / 2 - 90;
    for (let i = 0; i < this.totalSteps; i++) {
      const circle = this.add.circle(startX + i * 90, 116, 12, 0x20362c, 1).setStrokeStyle(2, 0x5f8f78);
      const label = this.add.text(circle.x, circle.y, String(i + 1), {
        fontFamily: 'PressStart2P',
        fontSize: '10px',
        color: '#b8cfc2'
      }).setOrigin(0.5);
      this.progressNodes.push({ circle, label });
      this.progressGroup.add([circle, label]);

      if (i < this.totalSteps - 1) {
        const line = this.add.rectangle(startX + 45 + i * 90, 116, 50, 3, 0x375c4b, 1);
        this.progressGroup.add(line);
      }
    }

    this.setStep(0);
  }

  createFrame() {
    const { width, height } = this.scale;

    this.playArea = this.add.container(0, 0);

    this.playAreaBg = this.add.rectangle(width / 2, 320, 700, 300, 0x122019, 0.95)
      .setStrokeStyle(2, 0x5da17f, 0.7);

    this.playArea.add(this.playAreaBg);

    this.dialogueText = this.add.text(width / 2, height - 120, '', {
      fontFamily: 'SpecialElite',
      fontSize: '20px',
      color: '#f3f3f3',
      align: 'center',
      wordWrap: { width: 680 }
    }).setOrigin(0.5);
  }

  createFooter() {
    const { width, height } = this.scale;

    this.scoreText = this.add.text(40, height - 36, 'Score: 100', {
      fontFamily: 'PressStart2P',
      fontSize: '10px',
      color: '#ffcc00'
    });

    this.timerText = this.add.text(width - 40, height - 36, 'Time: 00', {
      fontFamily: 'PressStart2P',
      fontSize: '10px',
      color: '#ffcc00'
    }).setOrigin(1, 0);
  }

  startTimer() {
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.secondsElapsed += 1;
        this.timerText.setText(`Time: ${String(this.secondsElapsed).padStart(2, '0')}`);
      }
    });
  }

  startEvidenceFlow() {
    switch (this.evidenceType) {
      case 'hair_color':
        this.startHairFlow();
        break;
      case 'blood_type':
        this.startBloodFlow();
        break;
      case 'biological_sex':
        this.startVoiceFlow();
        break;
      case 'shoe_size_category':
        this.startShoeFlow();
        break;
      case 'race':
        this.startRaceFlow();
        break;
      default:
        this.startHairFlow();
        break;
    }
  }

  clearStage() {
    this.optionButtons.forEach(btn => btn.destroy());
    this.optionButtons = [];

    this.stageObjects.forEach(obj => obj.destroy());
    this.stageObjects = [];
  }

  setStep(stepIndex) {
    this.currentStep = stepIndex;
    this.progressNodes.forEach((node, index) => {
      if (index < stepIndex) {
        node.circle.setFillStyle(0x2ea866, 1);
        node.circle.setStrokeStyle(2, 0x8df7b4, 1);
      } else if (index === stepIndex) {
        node.circle.setFillStyle(0x8d6f16, 1);
        node.circle.setStrokeStyle(2, 0xffcc00, 1);
      } else {
        node.circle.setFillStyle(0x20362c, 1);
        node.circle.setStrokeStyle(2, 0x5f8f78, 1);
      }
    });
  }

  setInstructions(text) {
    this.instructionsText.setText(text);
  }

  setDialogue(text) {
    this.dialogueText.setText(text);
  }

  penalize(amount = 10) {
    this.mistakes += 1;
    this.score = Math.max(0, this.score - amount);
    this.scoreText.setText(`Score: ${this.score}`);
  }

  createButton(x, y, w, h, label, onClick, opts = {}) {
    const bgColor = opts.bgColor || 0x22382e;
    const borderColor = opts.borderColor || 0x7cc89f;
    const textColor = opts.textColor || '#ffffff';

    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, w, h, bgColor, 1).setStrokeStyle(2, borderColor, 1);
    const text = this.add.text(0, 0, label, {
      fontFamily: opts.fontFamily || 'SpecialElite',
      fontSize: opts.fontSize || '18px',
      color: textColor,
      align: 'center',
      wordWrap: { width: w - 16 }
    }).setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x335244, 1));
    bg.on('pointerout', () => bg.setFillStyle(bgColor, 1));
    bg.on('pointerdown', onClick);

    container.add([bg, text]);
    container.bg = bg;
    container.text = text;
    this.optionButtons.push(container);
    return container;
  }

  createLampTag(text) {
    const tag = this.add.text(400, 170, text, {
      fontFamily: 'SpecialElite',
      fontSize: '20px',
      color: '#0a0a0a',
      backgroundColor: '#d8c58c',
      padding: { left: 12, right: 12, top: 8, bottom: 8 }
    }).setOrigin(0.5);
    this.stageObjects.push(tag);
    return tag;
  }

  // ============================================================
  // HAIR COLOR
  // ============================================================
  startHairFlow() {
    this.setStep(0);
    this.setInstructions('Step 1: Dust the latch and isolate the trapped hair sample.');
    this.setDialogue('Brush the sample board until the hidden strand becomes visible.');

    this.clearStage();

    const board = this.add.rectangle(400, 320, 460, 180, 0x2d2b28, 1).setStrokeStyle(2, 0xb79e73, 0.8);
    const strand = this.add.rectangle(400, 320, 180, 4, 0xded7cb, 0.05);
    const brush = this.add.circle(200, 470, 16, 0xf1c27d, 1).setStrokeStyle(2, 0x5b4b30, 1);
    const brushLabel = this.add.text(200, 500, 'Brush', {
      fontFamily: 'SpecialElite', fontSize: '16px', color: '#eee'
    }).setOrigin(0.5);
    const progress = this.add.text(400, 430, 'Coverage: 0%', {
      fontFamily: 'PressStart2P', fontSize: '10px', color: '#ffcc00'
    }).setOrigin(0.5);

    let coverage = 0;
    let active = false;

    board.setInteractive();
    brush.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(brush);

    brush.on('drag', (pointer, dragX, dragY) => {
      brush.x = dragX;
      brush.y = dragY;
      brushLabel.x = dragX;
      brushLabel.y = dragY + 30;

      if (Phaser.Geom.Intersects.RectangleToRectangle(brush.getBounds(), board.getBounds())) {
        if (!active) {
          active = true;
          coverage = Math.min(100, coverage + 3);
          progress.setText(`Coverage: ${coverage}%`);
          strand.setAlpha(Math.min(1, 0.05 + coverage / 100));
          board.setFillStyle(0x3b3833, 1);

          this.time.delayedCall(60, () => {
            active = false;
          });

          if (coverage >= 100) {
            this.time.delayedCall(300, () => this.hairStep2());
          }
        }
      }
    });

    this.stageObjects.push(board, strand, brush, brushLabel, progress);
  }

  hairStep2() {
    this.clearStage();
    this.setStep(1);
    this.setInstructions('Step 2: Place the isolated hair on the microscope slide.');
    this.setDialogue('Drag the sample bag onto the microscope tray.');

    const tray = this.add.rectangle(490, 325, 230, 90, 0x1e2d36, 1).setStrokeStyle(2, 0x87c8ff, 0.8);
    const microscope = this.add.rectangle(555, 260, 110, 150, 0x364147, 1).setStrokeStyle(2, 0xc8d0d8, 0.6);
    const lens = this.add.circle(545, 250, 20, 0x97ebff, 0.8);
    const bag = this.add.rectangle(220, 330, 100, 120, 0xd0c4a8, 1).setStrokeStyle(2, 0xf7e7b4, 1);
    const bagHair = this.add.rectangle(220, 330, 40, 3, 0xeee5d5, 0.9);
    const bagText = this.add.text(220, 388, 'Sample', {
      fontFamily: 'SpecialElite', fontSize: '16px', color: '#2b251c'
    }).setOrigin(0.5);

    bag.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(bag);

    bag.on('drag', (pointer, dragX, dragY) => {
      bag.x = dragX;
      bag.y = dragY;
      bagHair.x = dragX;
      bagHair.y = dragY;
      bagText.x = dragX;
      bagText.y = dragY + 46;
    });

    bag.on('dragend', () => {
      const overlaps = Phaser.Geom.Intersects.RectangleToRectangle(bag.getBounds(), tray.getBounds());
      if (overlaps) {
        bag.disableInteractive();
        this.tweens.add({
          targets: [bag, bagHair, bagText],
          x: 490,
          y: { from: bag.y, to: 325 },
          duration: 180,
          onComplete: () => this.time.delayedCall(250, () => this.hairStep3())
        });
      } else {
        this.penalize(5);
        this.tweens.add({ targets: [bag, bagHair, bagText], x: 220, y: 330, duration: 180 });
        this.tweens.add({ targets: bagText, y: 376, duration: 180 });
      }
    });

    this.stageObjects.push(tray, microscope, lens, bag, bagHair, bagText);
  }

  hairStep3() {
    this.clearStage();
    this.setStep(2);
    this.setInstructions('Step 3: Identify the correct hair color under magnification.');
    this.setDialogue('Select the matching sample classification.');

    const values = ['blond', 'black', 'red', 'brown'];
    const display = this.buildOptions(values, this.correctValue);

    display.forEach((value, index) => {
      const x = 190 + (index % 2) * 220;
      const y = 260 + Math.floor(index / 2) * 120;
      const swatch = this.add.rectangle(x, y - 26, 100, 18, this.getHairColorHex(value), 1)
        .setStrokeStyle(2, 0xe2e2e2, 0.75);
      this.stageObjects.push(swatch);

      this.createButton(x, y + 18, 160, 58, this.toDisplayText(value), () => {
        this.resolveChoice(value, value === this.correctValue, 10);
      });
    });
  }

  // ============================================================
  // BLOOD TYPE
  // ============================================================
  startBloodFlow() {
    this.setStep(0);
    this.setInstructions('Step 1: Place the blood smear into the reagent tray.');
    this.setDialogue('Click the evidence smear to transfer it onto the lab plate.');

    this.clearStage();

    const smear = this.add.rectangle(220, 320, 150, 90, 0x5a1616, 1).setStrokeStyle(2, 0xd88d8d, 1);
    const smearLabel = this.add.text(220, 390, 'Sample Slide', {
      fontFamily: 'SpecialElite', fontSize: '18px', color: '#ffffff'
    }).setOrigin(0.5);
    const tray = this.add.rectangle(520, 320, 220, 120, 0x24343d, 1).setStrokeStyle(2, 0x8fc5db, 0.8);
    const plate = this.add.circle(520, 320, 38, 0xc9d7de, 1).setStrokeStyle(2, 0xffffff, 0.9);

    smear.setInteractive({ useHandCursor: true });
    smear.on('pointerdown', () => {
      smear.disableInteractive();
      this.tweens.add({
        targets: [smear, smearLabel],
        x: 520,
        duration: 220,
        onComplete: () => this.time.delayedCall(250, () => this.bloodStep2())
      });
    });

    this.stageObjects.push(smear, smearLabel, tray, plate);
  }

  bloodStep2() {
    this.clearStage();
    this.setStep(1);
    this.setInstructions('Step 2: Test the sample with anti-A and anti-B reagents.');
    this.setDialogue('Click both reagent bottles to reveal the reaction pattern.');

    const dishA = this.add.circle(300, 320, 62, 0xc8d5db, 1).setStrokeStyle(2, 0xffffff, 0.9);
    const dishB = this.add.circle(500, 320, 62, 0xc8d5db, 1).setStrokeStyle(2, 0xffffff, 0.9);
    const titleA = this.add.text(300, 400, 'Anti-A', {
      fontFamily: 'PressStart2P', fontSize: '10px', color: '#ffcc00'
    }).setOrigin(0.5);
    const titleB = this.add.text(500, 400, 'Anti-B', {
      fontFamily: 'PressStart2P', fontSize: '10px', color: '#ffcc00'
    }).setOrigin(0.5);

    const bottleA = this.add.rectangle(240, 190, 70, 110, 0x8c1d1d, 1).setStrokeStyle(2, 0xefb3b3, 0.9);
    const bottleB = this.add.rectangle(560, 190, 70, 110, 0x1d4b8c, 1).setStrokeStyle(2, 0xb8d3ff, 0.9);

    const reactsA = this.correctValue === 'A' || this.correctValue === 'AB';
    const reactsB = this.correctValue === 'B' || this.correctValue === 'AB';
    let doneA = false;
    let doneB = false;

    const revealDish = (dish, reacts) => {
      dish.setFillStyle(reacts ? 0x6a1212 : 0x813636, 1);
      for (let i = 0; i < 6; i++) {
        const dot = this.add.circle(
          dish.x + Phaser.Math.Between(-24, 24),
          dish.y + Phaser.Math.Between(-24, 24),
          reacts ? Phaser.Math.Between(6, 11) : Phaser.Math.Between(3, 5),
          reacts ? 0xd9a7a7 : 0x944444,
          0.9
        );
        this.stageObjects.push(dot);
      }
    };

    bottleA.setInteractive({ useHandCursor: true });
    bottleB.setInteractive({ useHandCursor: true });

    bottleA.on('pointerdown', () => {
      if (doneA) return;
      doneA = true;
      revealDish(dishA, reactsA);
      if (doneA && doneB) this.time.delayedCall(350, () => this.bloodStep3(reactsA, reactsB));
    });

    bottleB.on('pointerdown', () => {
      if (doneB) return;
      doneB = true;
      revealDish(dishB, reactsB);
      if (doneA && doneB) this.time.delayedCall(350, () => this.bloodStep3(reactsA, reactsB));
    });

    this.stageObjects.push(dishA, dishB, titleA, titleB, bottleA, bottleB);
  }

  bloodStep3(reactsA, reactsB) {
    this.setStep(2);
    this.setInstructions('Step 3: Classify the blood type from the reaction result.');
    this.setDialogue(`Observed pattern: Anti-A ${reactsA ? 'reacts' : 'does not react'}, Anti-B ${reactsB ? 'reacts' : 'does not react'}. Select the blood type.`);

    const values = ['A', 'B', '0', 'AB'];
    const display = this.buildOptions(values, this.correctValue);

    display.forEach((value, index) => {
      const x = 190 + (index % 2) * 220;
      const y = 470 + Math.floor(index / 2) * 0;
      this.createButton(x, y, 150, 54, value, () => {
        this.resolveChoice(value, value === this.correctValue, 10);
      }, { fontFamily: 'PressStart2P', fontSize: '14px' });
    });
  }

  // ============================================================
  // BIOLOGICAL SEX (voiceprint)
  // ============================================================
  startVoiceFlow() {
    this.setStep(0);
    this.setInstructions('Step 1: Patch the emergency override call into the analyzer.');
    this.setDialogue('Connect the loose cable to the recorder port.');

    this.clearStage();

    const consoleBody = this.add.rectangle(430, 310, 430, 210, 0x263239, 1).setStrokeStyle(2, 0xa6c7d4, 0.7);
    const port = this.add.circle(560, 350, 18, 0x0d1012, 1).setStrokeStyle(2, 0x95bed0, 1);
    const cable = this.add.rectangle(180, 390, 100, 18, 0x272727, 1).setStrokeStyle(2, 0x8d8d8d, 1);
    const cableHead = this.add.circle(230, 390, 18, 0xcfcfcf, 1).setStrokeStyle(2, 0xffffff, 1);
    const cableLabel = this.add.text(180, 430, 'Audio cable', {
      fontFamily: 'SpecialElite', fontSize: '16px', color: '#ffffff'
    }).setOrigin(0.5);

    cableHead.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(cableHead);

    cableHead.on('drag', (pointer, dragX, dragY) => {
      cableHead.x = dragX;
      cableHead.y = dragY;
      cable.width = Math.max(40, dragX - 130);
      cable.x = 130 + cable.width / 2;
      cable.y = dragY;
      cableLabel.x = dragX - 20;
      cableLabel.y = dragY + 38;
    });

    cableHead.on('dragend', () => {
      if (Phaser.Math.Distance.Between(cableHead.x, cableHead.y, port.x, port.y) < 30) {
        cableHead.disableInteractive();
        this.tweens.add({
          targets: [cableHead],
          x: port.x,
          y: port.y,
          duration: 140,
          onComplete: () => this.time.delayedCall(250, () => this.voiceStep2())
        });
      } else {
        this.penalize(5);
        this.tweens.add({ targets: cableHead, x: 230, y: 390, duration: 150 });
        this.tweens.add({
          targets: cable,
          width: 100,
          x: 180,
          y: 390,
          duration: 150
        });
        this.tweens.add({ targets: cableLabel, x: 180, y: 430, duration: 150 });
      }
    });

    this.stageObjects.push(consoleBody, port, cable, cableHead, cableLabel);
  }

  voiceStep2() {
    this.clearStage();
    this.setStep(1);
    this.setInstructions('Step 2: Clean the waveform by removing static peaks.');
    this.setDialogue('Click all glowing static spikes in the recording.');

    const screen = this.add.rectangle(400, 310, 560, 220, 0x111b20, 1).setStrokeStyle(2, 0x70d2ff, 0.8);
    this.stageObjects.push(screen);

    const points = [];
    for (let i = 0; i < 8; i++) {
      points.push({ x: 150 + i * 70, y: 310 + Phaser.Math.Between(-50, 50) });
    }

    const graphics = this.add.graphics();
    graphics.lineStyle(3, 0x49ff8a, 1);
    graphics.beginPath();
    graphics.moveTo(120, 320);
    points.forEach(p => graphics.lineTo(p.x, p.y));
    graphics.lineTo(650, 315);
    graphics.strokePath();
    this.stageObjects.push(graphics);

    let removed = 0;
    const totalSpikes = 4;
    const spikeXs = [210, 350, 490, 610];

    spikeXs.forEach((x) => {
      const spike = this.add.rectangle(x, 245, 20, 70, 0xffcc00, 0.9).setStrokeStyle(2, 0xfff0aa, 1);
      spike.setInteractive({ useHandCursor: true });
      spike.on('pointerdown', () => {
        spike.disableInteractive();
        this.tweens.add({ targets: spike, alpha: 0, duration: 120, onComplete: () => spike.destroy() });
        removed += 1;
        if (removed >= totalSpikes) {
          this.time.delayedCall(250, () => this.voiceStep3());
        }
      });
      this.stageObjects.push(spike);
    });
  }

  voiceStep3() {
    this.clearStage();
    this.setStep(2);
    this.setInstructions('Step 3: Match the cleaned voiceprint to a speaker profile.');
    this.setDialogue('Select the best forensic classification.');

    const values = ['M', 'F', 'NB'];
    const display = this.buildOptions(values, this.correctValue);

    display.forEach((value, index) => {
      const x = 180 + index * 210;
      const y = 310;

      const graph = this.add.graphics();
      graph.lineStyle(3, 0x49ff8a, 1);
      graph.beginPath();
      graph.moveTo(x - 60, y - 30);
      const pattern = this.getVoicePattern(value);
      pattern.forEach((point, i) => {
        if (i === 0) return;
        graph.lineTo(x - 60 + point.x, y - 30 + point.y);
      });
      graph.strokePath();
      this.stageObjects.push(graph);

      this.createButton(x, y + 80, 140, 54, this.getSexDisplay(value), () => {
        this.resolveChoice(value, value === this.correctValue, 10);
      }, { fontFamily: 'PressStart2P', fontSize: '12px' });
    });
  }

  // ============================================================
  // SHOE SIZE CATEGORY
  // ============================================================
  startShoeFlow() {
    this.setStep(0);
    this.setInstructions('Step 1: Cast the partial shoeprint with plaster.');
    this.setDialogue('Pour the plaster into the highlighted footprint mold.');

    this.clearStage();

    const print = this.add.ellipse(430, 320, 180, 280, 0x41362f, 1).setStrokeStyle(2, 0x8a776b, 0.8);
    const mold = this.add.ellipse(430, 320, 145, 245, 0x2b241f, 1).setStrokeStyle(2, 0xbba99b, 0.8);
    const bucket = this.add.rectangle(200, 340, 90, 110, 0xc6d0d8, 1).setStrokeStyle(2, 0xf6f8fa, 1);
    const stream = this.add.rectangle(315, 280, 18, 10, 0xd8d8d0, 0).setOrigin(0.5, 0);
    const label = this.add.text(200, 410, 'Plaster', {
      fontFamily: 'SpecialElite', fontSize: '18px', color: '#ffffff'
    }).setOrigin(0.5);

    bucket.setInteractive({ useHandCursor: true });
    bucket.on('pointerdown', () => {
      bucket.disableInteractive();
      this.tweens.add({ targets: bucket, angle: -35, duration: 160 });
      this.tweens.add({ targets: stream, alpha: 1, height: 130, duration: 250 });
      this.tweens.add({ targets: mold, scaleX: 1.02, scaleY: 1.02, fillColor: 0xcfc8b8, duration: 350 });
      this.time.delayedCall(500, () => this.shoeStep2());
    });

    this.stageObjects.push(print, mold, bucket, stream, label);
  }

  shoeStep2() {
    this.clearStage();
    this.setStep(1);
    this.setInstructions('Step 2: Measure the cast on the comparison grid.');
    this.setDialogue('Click the ruler until it spans the full length of the cast.');

    const cast = this.add.ellipse(400, 320, this.getShoeCastWidth(this.correctValue), 235, 0xd9d2c5, 1)
      .setStrokeStyle(2, 0x8d8479, 0.9);
    const grid = this.add.rectangle(400, 320, 380, 250, 0x172420, 1).setStrokeStyle(2, 0x497762, 0.8);
    const ruler = this.add.rectangle(250, 465, 80, 22, 0xe7cf76, 1).setStrokeStyle(2, 0x4a3d18, 1);
    const rulerText = this.add.text(250, 465, 'Extend', {
      fontFamily: 'PressStart2P', fontSize: '8px', color: '#2a210d'
    }).setOrigin(0.5);

    let clicks = 0;
    ruler.setInteractive({ useHandCursor: true });
    ruler.on('pointerdown', () => {
      clicks += 1;
      const width = 80 + clicks * 35;
      ruler.width = width;
      rulerText.setText(clicks >= 4 ? 'Measured' : 'Extend');
      if (clicks >= 4) {
        ruler.disableInteractive();
        this.time.delayedCall(250, () => this.shoeStep3());
      }
    });

    this.stageObjects.push(grid, cast, ruler, rulerText);
  }

  shoeStep3() {
    this.clearStage();
    this.setStep(2);
    this.setInstructions('Step 3: Classify the footwear size category.');
    this.setDialogue('Choose the closest forensic size bracket.');

    const values = ['small', 'medium', 'large'];
    const display = this.buildOptions(values, this.correctValue);

    display.forEach((value, index) => {
      const x = 180 + index * 210;
      const y = 310;
      const sole = this.add.ellipse(x, y - 30, this.getShoeCastWidth(value), 170, 0x7f8b94, 1)
        .setStrokeStyle(2, 0xd8e0e6, 0.8);
      this.stageObjects.push(sole);

      this.createButton(x, y + 95, 150, 54, this.toDisplayText(value), () => {
        this.resolveChoice(value, value === this.correctValue, 10);
      }, { fontFamily: 'PressStart2P', fontSize: '12px' });
    });
  }

  // ============================================================
  // RACE / ETHNICITY TRACE
  // ============================================================
  startRaceFlow() {
    this.setStep(0);
    this.setInstructions('Step 1: Extract the DNA trace from the skin-cell swab.');
    this.setDialogue('Click the extractor three times to complete the sample pull.');

    this.clearStage();

    const machine = this.add.rectangle(430, 310, 350, 200, 0x283235, 1).setStrokeStyle(2, 0x9bc7b8, 0.8);
    const chamber = this.add.rectangle(430, 285, 150, 90, 0x12212b, 1).setStrokeStyle(2, 0x87d8ff, 0.9);
    const glow = this.add.rectangle(430, 285, 120, 60, 0x61d9ff, 0.15);
    const lever = this.add.rectangle(610, 355, 28, 110, 0xc3c9cc, 1).setStrokeStyle(2, 0xf6f8fa, 0.8);
    const leverKnob = this.add.circle(610, 310, 20, 0xf4a03d, 1).setStrokeStyle(2, 0xffffff, 0.9);
    const note = this.add.text(430, 410, 'Extractor ready', {
      fontFamily: 'SpecialElite', fontSize: '18px', color: '#ffffff'
    }).setOrigin(0.5);

    let pulls = 0;
    leverKnob.setInteractive({ useHandCursor: true });
    leverKnob.on('pointerdown', () => {
      pulls += 1;
      glow.setAlpha(Math.min(0.9, 0.15 + pulls * 0.2));
      note.setText(`Extraction ${pulls}/3`);
      this.tweens.add({ targets: leverKnob, y: 345, duration: 90, yoyo: true });
      if (pulls >= 3) {
        leverKnob.disableInteractive();
        this.time.delayedCall(250, () => this.raceStep2());
      }
    });

    this.stageObjects.push(machine, chamber, glow, lever, leverKnob, note);
  }

  raceStep2() {
    this.clearStage();
    this.setStep(1);
    this.setInstructions('Step 2: Align the ancestry markers into the correct reading lane.');
    this.setDialogue('Click each marker chip once to lock it into the analysis strip.');

    const strip = this.add.rectangle(400, 320, 420, 70, 0x10181c, 1).setStrokeStyle(2, 0x7ec7ff, 0.8);
    this.stageObjects.push(strip);

    let locked = 0;
    for (let i = 0; i < 4; i++) {
      const chip = this.add.rectangle(210 + i * 130, 210, 70, 46, 0x415464, 1).setStrokeStyle(2, 0xd3e4f1, 0.8);
      const line = this.add.rectangle(210 + i * 130, 320, 36, 36, 0x2f6a8c, 0.35).setStrokeStyle(2, 0x87d3ff, 0.7);
      chip.setInteractive({ useHandCursor: true });
      chip.on('pointerdown', () => {
        chip.disableInteractive();
        this.tweens.add({
          targets: chip,
          x: line.x,
          y: line.y,
          duration: 180,
          onComplete: () => {
            locked += 1;
            if (locked >= 4) {
              this.time.delayedCall(260, () => this.raceStep3());
            }
          }
        });
      });
      this.stageObjects.push(chip, line);
    }
  }

  raceStep3() {
    this.clearStage();
    this.setStep(2);
    this.setInstructions('Step 3: Select the closest DNA ethnicity classification.');
    this.setDialogue('Choose the best match from the lab panel.');

    const values = ['White', 'Black', 'Latino', 'American Indian', 'Asian', 'Native Hawaiian'];
    const display = this.buildOptions(values, this.correctValue);

    display.forEach((value, index) => {
      const x = 160 + (index % 3) * 240;
      const y = 245 + Math.floor(index / 3) * 120;
      this.createButton(x, y, 180, 56, value, () => {
        this.resolveChoice(value, value === this.correctValue, 10);
      }, { fontFamily: 'SpecialElite', fontSize: '17px' });
    });
  }

  // ============================================================
  // Shared resolution
  // ============================================================
  resolveChoice(value, isCorrect, penalty = 10) {
    if (this.resolved) return;

    if (!isCorrect) {
      this.penalize(penalty);
      this.setDialogue(`Result rejected. ${this.getRetryHint()}`);
      this.flashWrongSelection(value);
      return;
    }

    this.resolved = true;
    this.selectedValue = value;

    if (this.timerEvent) {
      this.timerEvent.remove(false);
      this.timerEvent = null;
    }

    this.optionButtons.forEach(btn => {
      btn.bg.disableInteractive();
      if (btn.text.text === this.toDisplayText(value) || btn.text.text === value || btn.text.text === this.getSexDisplay(value)) {
        btn.bg.setFillStyle(0x176136, 1);
        btn.bg.setStrokeStyle(2, 0x77ffb0, 1);
      }
    });

    this.setDialogue(`Analysis complete. Final classification: ${this.toDisplayText(value)}.`);

    const finishButton = this.createButton(400, 548, 260, 52, 'Confirm Analysis', () => {
      this.finishMinigame();
    }, {
      fontFamily: 'PressStart2P',
      fontSize: '12px',
      bgColor: 0x18452d,
      borderColor: 0x77ffb0
    });

    this.stageObjects.push(finishButton);
  }

  flashWrongSelection(value) {
    const candidates = this.optionButtons.filter(btn => {
      const label = btn.text.text;
      return label === this.toDisplayText(value) || label === value || label === this.getSexDisplay(value);
    });

    candidates.forEach(btn => {
      btn.bg.setFillStyle(0x6b1f1f, 1);
      this.time.delayedCall(220, () => btn.bg.setFillStyle(0x22382e, 1));
    });
  }

  finishMinigame() {
    const payload = {
      score: this.score,
      value: this.selectedValue
    };

    if (typeof this.onComplete === 'function') {
      this.onComplete(payload.score, payload.value);
    }

    this.events.emit('minigame-complete', payload);
    this.events.emit('minigame-closed');
    this.scene.stop();
  }

  // ============================================================
  // Helpers
  // ============================================================
  buildOptions(values, ensureValue) {
    const unique = [...new Set(values)];
    if (!unique.includes(ensureValue)) {
      unique[0] = ensureValue;
    }
    return Phaser.Utils.Array.Shuffle(unique);
  }

  getTitle() {
    return 'FORENSIC IDENTITY ANALYSIS';
  }

  getSubtitle() {
    const map = {
      hair_color: 'Hair Fiber Examination',
      blood_type: 'Blood Typing Assay',
      biological_sex: 'Voiceprint Classification',
      shoe_size_category: 'Footwear Impression Analysis',
      race: 'DNA Ethnicity Trace'
    };
    return map[this.evidenceType] || 'Evidence Analysis';
  }

  getRetryHint() {
    const map = {
      hair_color: 'Recheck the shaft pigmentation under the microscope.',
      blood_type: 'Compare the anti-serum reaction pattern again.',
      biological_sex: 'Listen to the cleaned waveform profile more carefully.',
      shoe_size_category: 'Measure the cast against the comparison grid again.',
      race: 'Review the ancestry marker alignment on the panel.'
    };
    return map[this.evidenceType] || 'Review the evidence again.';
  }

  toDisplayText(value) {
    if (typeof value !== 'string') return String(value);
    return value
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  getSexDisplay(value) {
    const map = { M: 'Male', F: 'Female', NB: 'Non-binary' };
    return map[value] || value;
  }

  getHairColorHex(value) {
    const map = {
      blond: 0xe6d27a,
      black: 0x1b1b1b,
      red: 0xa14422,
      brown: 0x5c3b21
    };
    return map[value] || 0x999999;
  }

  getVoicePattern(value) {
    const patterns = {
      M: [
        { x: 0, y: 40 }, { x: 24, y: 25 }, { x: 48, y: 35 }, { x: 72, y: 12 }, { x: 96, y: 28 }, { x: 120, y: 18 }
      ],
      F: [
        { x: 0, y: 34 }, { x: 24, y: 8 }, { x: 48, y: 30 }, { x: 72, y: 2 }, { x: 96, y: 22 }, { x: 120, y: 10 }
      ],
      NB: [
        { x: 0, y: 36 }, { x: 24, y: 18 }, { x: 48, y: 24 }, { x: 72, y: 8 }, { x: 96, y: 18 }, { x: 120, y: 14 }
      ]
    };
    return patterns[value] || patterns.M;
  }

  getShoeCastWidth(value) {
    const map = {
      small: 92,
      medium: 118,
      large: 145
    };
    return map[value] || 118;
  }
}
