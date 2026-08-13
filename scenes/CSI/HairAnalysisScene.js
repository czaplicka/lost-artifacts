import { BaseForensicMinigame } from './BaseForensicMinigame.js';
import { EventBus } from '../../EventBus.js';

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

  // ============================================================
  // STEP 1 – Tweezers: evidence bag -> slide
  // ============================================================
  startStep1() {
    this.setStep(0);
    this.setInstructions('Step 1: Transfer the hair strand from the evidence bag onto the slide.');
    this.setDialogue('Use the tweezers: first pick up the strand from the bag, then place it onto the slide.');
    this.clearStage();

    const { width, height } = this.scale;
    const centerX = width / 2;

    // tło laboratorium
    const bg = this.add.image(width / 2, height / 2, 'desk1')
      .setOrigin(0.5)
      .setDisplaySize(width, height)
      .setDepth(0);
    this.stageObjects.push(bg);

    this.bag = this.add.image(width * 0.92, height * 0.78, 'evidence_bag')
      .setOrigin(0.5)
      .setDisplaySize(320, 260)
      .setDepth(2);
    this.stageObjects.push(this.bag);

    this.slide = this.add.image(width * 0.40, 670, 'hair_board')
        .setDisplaySize(430, 180)
      .setDepth(1);
    this.stageObjects.push(this.slide);

    // tweezers po dole, bardziej w środku
    this.tweezers = this.add.image(width * 0.59, 570, 'tweezers')
    .setDisplaySize(350, 280)
    .setDepth(3)
    .setAngle(-125);
    this.stageObjects.push(this.tweezers);

    this.tweezers.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(this.tweezers);

    this.hasStrandOnTweezers = false;
    this.hasStrandOnSlide = false;

    // offset końcówki pęsety względem środka sprite'a (dobierz pod swoją grafikę) -10 60
    const tipOffsetX = 10;
    const tipOffsetY = 60;

    this.tweezers.on('drag', (pointer, dragX, dragY) => {
      if (this.resolved) return;
      this.tweezers.x = dragX;
      this.tweezers.y = dragY;
      this.tweezers.setAngle(125);

      // jeśli mamy włos na pęsecie, przesuwamy go razem z końcówką
      if (this.hasStrandOnTweezers && this.preparedStrand) {
        this.preparedStrand.x = dragX + tipOffsetX;
        this.preparedStrand.y = dragY + tipOffsetY;
      }
    });

    this.tweezers.on('dragend', () => {
      if (this.resolved) return;

      const tweezersBounds = this.tweezers.getBounds();

      // 1) najpierw bag -> tweezers
      if (!this.hasStrandOnTweezers &&
          Phaser.Geom.Intersects.RectangleToRectangle(tweezersBounds, this.bag.getBounds())) {

        this.hasStrandOnTweezers = true;
        this.setDialogue('Strand picked from the evidence bag. Move it onto the slide.');

        // mały włos „na czubku” pęsety
        if (!this.preparedStrand) {
          this.preparedStrand = this.add.image(
            this.tweezers.x + tipOffsetX,
            this.tweezers.y + tipOffsetY,
            this.getHairStrandKey()
          )
            .setOrigin(0.5)
            .setDisplaySize(200, 150)
            .setDepth(4);
          this.stageObjects.push(this.preparedStrand);
        }

        return;
      }

      // 2) potem tweezers (z włosem) -> slide
      if (this.hasStrandOnTweezers &&
          Phaser.Geom.Intersects.RectangleToRectangle(tweezersBounds, this.slide.getBounds())) {

        this.hasStrandOnTweezers = false;
        this.hasStrandOnSlide = true;
        this.setDialogue('Strand placed onto the slide. Prepare it with reagent.');

        // włos centralnie na szkiełku
        if (this.preparedStrand) {
          this.preparedStrand.x = this.slide.x;
          this.preparedStrand.y = this.slide.y;
          this.preparedStrand.setDepth(2);
        } else {
          this.preparedStrand = this.add.image(this.slide.x, this.slide.y, this.getHairStrandKey())
            .setOrigin(0.5)
            .setDisplaySize(400, 300)
            .setDepth(2);
          this.stageObjects.push(this.preparedStrand);
        }

        // odłóż/ukryj tweezers
        this.tweezers.disableInteractive();
        this.tweezers.setVisible(false);

        this.time.delayedCall(350, () => this.startStep2());
      }
    });
  }

  // ============================================================
  // STEP 2 – Pipette: apply reagent on slide
  // ============================================================
  startStep2() {
    this.clearStage();
    this.setStep(1);
    this.setInstructions('Step 2: Apply the reagent onto the prepared slide.');
    this.setDialogue('Use the pipette to drop reagent onto the hair strand.');

    const { width, height } = this.scale;

    const bg = this.add.image(width / 2, height / 2, 'desk1')
      .setOrigin(0.5)
      .setDisplaySize(width, height)
      .setDepth(0);
    this.stageObjects.push(bg);

    this.slide = this.add.image(width * 0.40, 670, 'hair_board')
        .setDisplaySize(430, 180)
      .setDepth(1);
    this.stageObjects.push(this.slide);

    this.preparedStrand = this.add.image(this.slide.x, this.slide.y, this.getHairStrandKey())
      .setOrigin(0.5)
      .setDisplaySize(200, 150)
      .setDepth(2);
    this.stageObjects.push(this.preparedStrand);

    // pipeta po prawej
    this.pipette = this.add.image(width * 0.63, 580, 'pipette')
      .setDisplaySize(width, height)
      .setDepth(3)
    this.stageObjects.push(this.pipette);

    this.pipette.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(this.pipette);

    this.reagentApplied = false;

    this.pipette.on('drag', (pointer, dragX, dragY) => {
      if (this.resolved) return;
      this.pipette.x = dragX;
      this.pipette.y = dragY;
    });

    this.pipette.on('dragend', () => {
      if (this.resolved || this.reagentApplied) return;

      const pipetteBounds = this.pipette.getBounds();
      if (Phaser.Geom.Intersects.RectangleToRectangle(pipetteBounds, this.slide.getBounds())) {
        this.reagentApplied = true;
        this.setDialogue('Reagent applied. The strand is ready for comparison.');

        // kropla nad włosem
        const drop = this.add.circle(
          this.slide.x,
          this.slide.y,
          14,
          0x8bd1ff,
          0.9
        ).setDepth(5);
        this.stageObjects.push(drop);

        // podświetl włos
        this.preparedStrand.setTint(0xffffff);
        this.preparedStrand.setDepth(4);

        // ukryj pipetę
        this.pipette.disableInteractive();
        this.pipette.setVisible(false);

        this.time.delayedCall(500, () => this.startStep3());
      } else {
        this.penalize(5);
        this.setDialogue('The reagent missed the slide. Try again.');
        this.tweens.add({
          targets: [this.pipette],
          x: width * 0.75,
          y: height * 0.45,
          duration: 180
        });
      }
    });
  }

  // ============================================================
// STEP 3 – microscope click -> overlay + reference panel
// ============================================================
startStep3() {
  this.clearStage();
  this.setStep(2);
  this.setInstructions('Step 3: Compare the prepared strand and choose the correct color.');
  this.setDialogue('Click the microscope to view the strand, then choose the best matching sample from the reference panel.');

  const { width, height } = this.scale;
  const centerX = width / 2;

  // desk jako tło
  const bg = this.add.image(width / 2, height / 2, 'desk1')
    .setOrigin(0.5)
    .setDisplaySize(width, height)
    .setDepth(0);
  this.stageObjects.push(bg);

  // 1) Mikroskop w tle – hotspot, ale tylko jednorazowy
  const microscopeHotspot = this.add.zone(width * 0.40, height * 0.37, 400, 720)
    .setOrigin(0.5)
    .setDepth(5)
    .setInteractive({ useHandCursor: true });
  this.stageObjects.push(microscopeHotspot);

  microscopeHotspot.on('pointerover', () => {
    this.setDialogue('The prepared strand is loaded. Click to view it under the microscope.');
  });
  microscopeHotspot.on('pointerout', () => {
    this.setDialogue('Click the microscope to view the strand, then use the reference panel.');
  });
  microscopeHotspot.on('pointerdown', () => {
    // wyłącz hotspot po pierwszym kliknięciu, żeby nie nakładać overlayów
    microscopeHotspot.disableInteractive();
    microscopeHotspot.removeAllListeners();
    this.showMicroscopeOverlay();
  });

  // 2) Panel wzorów po prawej na biurku (widoczny cały czas)
  const panelX = width * 0.85;
  const panelY = height * 0.50;

  // POWIĘKSZONA ramka wzorów (tylko ramka)
  const panelBg = this.add.rectangle(panelX, panelY, 320, 320, 0x0d1713, 0.9)
    .setStrokeStyle(2, 0x39ff14, 0.6)
    .setDepth(1);
  this.stageObjects.push(panelBg);

  const panelTitle = this.add.text(panelX, panelY - 140, 'Reference samples', {
    fontFamily: 'SpecialElite',
    fontSize: '16px',
    color: '#ffe8a3'
  }).setOrigin(0.5).setDepth(2);
  this.stageObjects.push(panelTitle);

  const values = ['blond', 'black', 'red', 'brown'];
  const display = this.buildOptions(values, this.correctValue);

  display.forEach((value, index) => {
  const row = index; // 4 w pionie
  const x = panelX;
  const y = panelY - 70 + row * 60; // lekko rozstrzelone w większej ramce

  const swatch = this.add.image(x, y, this.getHairStrandKey(value))
    .setOrigin(0.5)
    .setDisplaySize(1050, 350)
    .setDepth(2)
    .setInteractive({ useHandCursor: true });
  this.stageObjects.push(swatch);

  // klikamy bezpośrednio w włos zamiast w przycisk
  swatch.on('pointerover', () => {
    swatch.setTint(0x88ff88);
    this.setDialogue(`Sample: ${this.toDisplayText(value)} — click to classify.`);
  });

  swatch.on('pointerout', () => {
    swatch.clearTint();
    this.setDialogue('Click the microscope to view the strand, then use the reference panel.');
  });

  swatch.on('pointerdown', () => {
    this.resolveChoice(value, value === this.correctValue, 10);
  });
});
}
// ============================================================
// Overlay: microscope_look + reference strand, zamykany X
// ============================================================
showMicroscopeOverlay() {
  const { width, height } = this.scale;
  const centerX = width / 2;
  const centerY = height / 2;

  // półprzezroczysta zasłona
  const overlayBg = this.add.rectangle(centerX, centerY, width, height, 0x000000, 0.75)
    .setOrigin(0.5)
    .setDepth(50);
  this.stageObjects.push(overlayBg);

  // microscope_look w centrum
  const microscopeView = this.add.image(centerX, centerY, 'microscope_look')
    .setOrigin(0.5)
    .setDisplaySize(width * 0.70, height * 0.70)
    .setDepth(51);
  this.stageObjects.push(microscopeView);

  // wzorcowy włos TYLKO w overlay (nie na biurku)
  const refStrand = this.add.image(centerX, centerY, this.getHairStrandKey())
    .setOrigin(0.5)
    .setDisplaySize(1000, 400)
    .setDepth(52);
  this.stageObjects.push(refStrand);

  // przycisk X w overlay
  const closeBtn = this.add.text(width - 40, 40, 'X', {
    fontFamily: 'PressStart2P',
    fontSize: '14px',
    color: '#ff6666',
    backgroundColor: '#200808',
    padding: { left: 6, right: 6, top: 4, bottom: 4 }
  })
    .setOrigin(1, 0)
    .setDepth(53)
    .setInteractive({ useHandCursor: true });
  this.stageObjects.push(closeBtn);

  closeBtn.on('pointerover', () => closeBtn.setStyle({ color: '#ffaaaa' }));
  closeBtn.on('pointerout', () => closeBtn.setStyle({ color: '#ff6666' }));
  closeBtn.on('pointerdown', () => {
    // zamknij overlay – zniszcz tylko jego elementy
    overlayBg.destroy();
    microscopeView.destroy();
    refStrand.destroy();
    closeBtn.destroy();

    // nie dotykamy panelu wzorów ani biurka – nadal widoczne
    this.setDialogue('Use the reference samples on the desk to classify the strand.');
  });
}
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