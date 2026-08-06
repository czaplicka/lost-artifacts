import BaseForensicMinigame from './BaseForensicMinigame.js';

export default class HairAnalysisScene extends BaseForensicMinigame {
  constructor() {
    super('HairAnalysisScene');

    this.brush = null;
    this.brushLabel = null;
    this.board = null;
    this.strand = null;
    this.progress = null;
    this.bag = null;
    this.tray = null;
    this.lampTag = null;

    this.coverage = 0;
    this.brushCooldown = false;
    this.boardActivated = false;
    this.bagPlaced = false;
  }

  init(data) {
  super.init({ ...data, totalSteps: 3 });
  this.evidenceType = 'hair_color';

  const allowed = ['blond', 'black', 'red', 'brown'];
  const incoming = data?.correctValue || this.correctValue || 'blond';

  this.correctValue = allowed.includes(incoming) ? incoming : 'blond';
  }

  create() {
    super.create();
  }

  getTitle() {
    return 'HAIR FIBER ANALYSIS';
  }

  getSubtitle() {
    return 'Microscope strand classification';
  }

  getRetryHint() {
    return 'Brush the tray again and recheck the strand under the microscope.';
  }

  createEvidenceFlow() {
    this.startHairFlow();
  }

  // ============================================================
  // STEP 1 – brush tray to reveal strand
  // ============================================================
  startHairFlow() {
    this.setStep(0);
    this.setInstructions('Step 1: Dust the tray and reveal the trapped strand.');
    this.setDialogue('Brush over the tray until the hair becomes visible.');
    this.clearStage();

    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // desk jako tło
    const bg = this.add.image(width / 2, height / 2, 'desk1')
      .setOrigin(0.5)
      .setDisplaySize(width, height)
      .setDepth(0);
    this.stageObjects.push(bg);

    // mały, wycentrowany krok 1
    const stepIcon = this.add.image(width - 140, 64, 'step1')
      .setOrigin(0.5)
      .setDisplaySize(350, 190)
      .setDepth(11);
    this.stageObjects.push(stepIcon);

    // tacka do skrobania – mniejsza, na środku
    this.board = this.add.image(centerX + 200 , centerY + 80, 'hair_board')
      .setOrigin(0.5)
      .setDisplaySize(500, 220)
      .setDepth(1);
    this.stageObjects.push(this.board);

    // wzorcowy włos – początkowo prawie niewidoczny
    this.strand = this.add.image(centerX + 220, centerY + 80, this.getHairStrandKey())
      .setOrigin(0.5)
      .setScale(0.45) // włos w środku PNG, skala ~0.45 wystarcza
      .setAlpha(0.05)
      .setDepth(2);
    this.stageObjects.push(this.strand);

    this.progress = this.add.text(centerX + 160, centerY + 150, 'Coverage: 0%', {
      fontFamily: 'PressStart2P',
      fontSize: '10px',
      color: 'rgb(255, 0, 0)'
    }).setOrigin(0.5).setDepth(3);
    this.stageObjects.push(this.progress);

    // brush – większy, w lewym dolnym rogu
    this.brush = this.add.image(width * 0.20, height * 0.77, 'tool_brush')
      .setOrigin(0.5)
      .setDisplaySize(264, 264)
      .setDepth(3);
    this.brush.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(this.brush);

    this.brush.on('drag', (pointer, dragX, dragY) => {
      if (this.resolved) return;
      this.brush.x = dragX;
      this.brush.y = dragY;

      if (this.brushCooldown) return;
      const overlap = Phaser.Geom.Intersects.RectangleToRectangle(
        this.brush.getBounds(),
        this.board.getBounds()
      );
      if (!overlap) return;

      this.brushCooldown = true;
      this.coverage = Math.min(100, this.coverage + 5);
      this.progress.setText(`Coverage: ${this.coverage}%`);

      // rozjaśnij wzorcowy włos
      this.strand.setAlpha(Math.min(0.9, 0.05 + this.coverage / 120));

      this.time.delayedCall(90, () => {
        this.brushCooldown = false;
      });

      if (this.coverage >= 100 && !this.boardActivated) {
        this.boardActivated = true;
        this.time.delayedCall(250, () => this.hairStep2());
      }
    });
  }

  // ============================================================
  // STEP 2 – move bag to tray, show strand on microscope tray
  // ============================================================
  hairStep2() {
    this.clearStage();
    this.setStep(1);
    this.setInstructions('Step 2: Move the hair sample to the microscope tray.');
    this.setDialogue('Drag the evidence bag onto the tray under the microscope.');

    const { width, height } = this.scale;
    const centerX = width / 2;

    const bg = this.add.image(width / 2, height / 2, 'desk1')
      .setOrigin(0.5)
      .setDisplaySize(width, height)
      .setDepth(0);
    this.stageObjects.push(bg);

    const stepIcon = this.add.image(width - 140, 64, 'step2')
      .setOrigin(0.5)
      .setDisplaySize(350, 190)
      .setDepth(11);
    this.stageObjects.push(stepIcon);

    // tacka pod mikroskopem - po prawej na biurku
    this.tray = this.add.rectangle(
      centerX + 180,
      height * 0.53,
      260,
      80,
      0x000000,
      0.05
    ).setStrokeStyle(2, 0x87c8ff, 0.9)
      .setDepth(1);
    this.stageObjects.push(this.tray);

    // evidence bag – większy, trochę na lewo, bez podpisu
    this.bag = this.add.image(width * 0.25, height * 0.58, 'evidence_bag')
      .setOrigin(0.5)
      .setDisplaySize(440, 300)
      .setDepth(2);
    this.bag.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(this.bag);
    this.stageObjects.push(this.bag);

    this.bag.on('drag', (pointer, dragX, dragY) => {
      if (this.resolved) return;
      this.bag.x = dragX;
      this.bag.y = dragY;
    });

    this.bag.on('dragend', () => {
      if (this.resolved) return;

      const overlaps = Phaser.Geom.Intersects.RectangleToRectangle(
        this.bag.getBounds(),
        this.tray.getBounds()
      );

      if (overlaps) {
        this.bag.disableInteractive();
        this.bagPlaced = true;
        this.setDialogue('Sample loaded. The strand is now on the tray.');

        this.tweens.add({
          targets: this.bag,
          x: this.tray.x - 80,
          y: this.tray.y - 10,
          duration: 200,
          onComplete: () => {
            // włos na tackie pod mikroskopem
            const trayStrand = this.add.image(this.tray.x, this.tray.y, this.getHairStrandKey())
              .setOrigin(0.5)
              .setScale(0.4)
              .setDepth(2);
            this.stageObjects.push(trayStrand);

            this.time.delayedCall(400, () => this.hairStep3());
          }
        });
      } else {
        this.penalize(5);
        this.setDialogue('The bag missed the tray. Try again.');
        this.tweens.add({
          targets: this.bag,
          x: width * 0.20,
          y: height * 0.58,
          duration: 180
        });
      }
    });
  }

  // ============================================================
  // STEP 3 – compare strand, choose correct color
  // ============================================================
  hairStep3() {
    this.clearStage();
    this.setStep(2);
    this.setInstructions('Step 3: Compare the strand and choose the correct color.');
    this.setDialogue('Use the reference strand and pick the best matching sample.');

    const { width, height } = this.scale;
    const centerX = width / 2;

    const bg = this.add.image(width / 2, height / 2, 'desk1')
      .setOrigin(0.5)
      .setDisplaySize(width, height)
      .setDepth(0);
    this.stageObjects.push(bg);

    const stepIcon = this.add.image(width - 140, 64, 'step3')
      .setOrigin(0.5)
      .setDisplaySize(350, 190)
      .setDepth(11);
    this.stageObjects.push(stepIcon);

    // wzorcowy włos – na środku u góry
    const refStrand = this.add.image(centerX, height * 0.30, this.getHairStrandKey())
      .setOrigin(0.5)
      .setDisplaySize(350, 50)
      .setDepth(2);
    this.stageObjects.push(refStrand);

    const values = ['blond', 'black', 'red', 'brown'];
    const display = this.buildOptions(values, this.correctValue);

    display.forEach((value, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);

      const x = centerX - 220 + col * 440;
      const y = height * (0.50 + row * 0.18);

      // próbka włosa – wyraźna, ale nie gigantyczna
      const swatch = this.add.image(x, y - 30, this.getHairStrandKey(value))
        .setOrigin(0.5)
        .setDisplaySize(1400, 200)
        .setDepth(2);
      this.stageObjects.push(swatch);

      this.createButton(
        x,
        y + 40,
        200,
        60,
        this.toDisplayText(value),
        () => this.resolveChoice(value, value === this.correctValue, 10),
        { fontFamily: 'PressStart2P', fontSize: '13px' }
      );
    });
  }

  // ============================================================
  // Hooks
  // ============================================================
  onWrongChoice(value) {
    super.onWrongChoice(value);
    this.flashWrongSelection(value);
  }

  onCorrectChoice(value) {
    super.onCorrectChoice(value);
  }

  getHairStrandKey(value = this.correctValue) {
    const map = {
      blond: 'hair_strand_blond',
      black: 'hair_strand_black',
      red: 'hair_strand_red',
      brown: 'hair_strand_brown'
    };
    return map[value] || 'hair_strand_blond';
  }
}