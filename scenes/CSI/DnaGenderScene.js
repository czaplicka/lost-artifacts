import { BaseForensicMinigame } from './BaseForensicMinigame.js';
import { EventBus } from '../../EventBus.js';


const DNA_PROFILES = ['XX', 'XY'];

const PROFILE_SUBLABEL = {
  XX: 'FEMALE PROFILE',
  XY: 'MALE PROFILE'
};

const PROFILE_BANDS = {
  XX: 1,
  XY: 2
};


export class DnaGenderScene extends BaseForensicMinigame {
  constructor() {
    super('DnaGenderScene');

    this.evidenceBag = null;
    this.closedSwab = null;
    this.openSwab = null;
    this.dnaSwab = null;
    this.tweezers = null;
    this.pipette = null;

    this.pcrTube = null;
    this.thermocycler = null;
    this.pcrRunning = false;
    this.pcrComplete = false;

    this.gelTray = null;
    this.wells = [];
    this.loadedSample = false;
    this.gelRun = false;
    this.gelViewerOpened = false;
  }

  init(data = {}) {
    super.init({ ...data, totalSteps: 5 });

    this.evidenceType = 'dna_gender';

    const incoming = String(
      data.correctValue || this.correctValue || 'XX'
    ).trim().toUpperCase();

    this.correctValue = DNA_PROFILES.includes(incoming) ? incoming : 'XX';

    this.evidenceBag = null;
    this.closedSwab = null;
    this.openSwab = null;
    this.dnaSwab = null;
    this.tweezers = null;
    this.pipette = null;
    this.pcrTube = null;
    this.thermocycler = null;
    this.pcrRunning = false;
    this.pcrComplete = false;
    this.gelTray = null;
    this.wells = [];
    this.loadedSample = false;
    this.gelRun = false;
    this.gelViewerOpened = false;
  }

  create() {
    super.create();
    EventBus.emit('hideHUD');
  }

  getTitle() {
    return 'DNA GENDER PROFILING';
  }

  getSubtitle() {
    return 'Amelogenin marker analysis';
  }

  getRetryHint() {
    return 'Amplify a fresh sample, run it against the control ladders, then count the bands under UV light.';
  }

  createEvidenceFlow() {
    this.startStep1();
  }

  startStep1() {
    this.clearStage();
    this.setStep(0);
    this.setInstructions('Step 1: Use the tweezers to remove the sealed DNA vial from the evidence bag.');
    this.setDialogue('Drag the tweezers over the evidence bag.');

    const { width, height } = this.scale;
    this.createDesk();

    this.evidenceBag = this.add.image(width * 0.80, height * 0.66, 'evidence_bag')
      .setOrigin(0.5)
      .setDisplaySize(320, 270)
      .setDepth(2);
    this.addStageObject(this.evidenceBag);

    this.closedSwab = this.add.image(width * 0.80, height * 0.66, 'dna_swab_closed')
      .setOrigin(0.5)
      .setDisplaySize(150, 150)
      .setDepth(3)
      .setVisible(false);
    this.addStageObject(this.closedSwab);

    this.createTweezers(width * 0.48, height * 0.53, (tipX, tipY) => {
      if (!this.evidenceBag.getBounds().contains(tipX, tipY)) {
        this.penalize(3);
        this.setDialogue('The tweezers missed the evidence bag. Try again.');
        return;
      }

      this.closedSwab.setVisible(true);
      this.closedSwab.setPosition(this.tweezers.x - 45, this.tweezers.y + 40);
      this.evidenceBag.setAlpha(0.6);
      this.tweezers.disableInteractive();

      this.setDialogue('Sealed vial recovered. Click it to break the seal.');

      this.time.delayedCall(450, () => {
        if (!this.resolved) this.startStep2();
      });
    });
  }

  startStep2() {
    this.clearStage();
    this.setStep(1);
    this.setInstructions('Step 2: Click the sealed vial to open it and expose the swab inside.');
    this.setDialogue('Click the vial to break the seal.');

    const { width, height } = this.scale;
    this.createDesk();

    this.closedSwab = this.add.image(width * 0.55, height * 0.58, 'dna_swab_closed')
      .setOrigin(0.5)
      .setDisplaySize(220, 220)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });
    this.addStageObject(this.closedSwab);

    const targetGlow = this.add.circle(this.closedSwab.x, this.closedSwab.y, 105, 0x8bffb0, 0.12)
      .setStrokeStyle(2, 0x8bffb0, 0.75)
      .setDepth(1);
    this.addStageObject(targetGlow);

    this.tweens.add({
      targets: targetGlow,
      alpha: { from: 0.12, to: 0.34 },
      scale: { from: 0.92, to: 1.08 },
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    const hint = this.add.text(this.closedSwab.x, this.closedSwab.y + 140, 'CLICK TO OPEN', {
      fontFamily: 'PressStart2P',
      fontSize: '10px',
      color: '#ffe8a3',
      backgroundColor: '#15100d',
      padding: { left: 8, right: 8, top: 6, bottom: 6 }
    }).setOrigin(0.5).setDepth(4);
    this.addStageObject(hint);

    this.closedSwab.on('pointerdown', () => {
      if (this.resolved) return;

      targetGlow.destroy();
      hint.destroy();
      this.closedSwab.disableInteractive();
      this.closedSwab.setTexture('dna_swab_open');
      this.closedSwab.setDisplaySize(240, 200);

      this.setDialogue('Vial opened. Pull the swab out and load it into the PCR tube.');

      this.time.delayedCall(500, () => {
        if (!this.resolved) this.startStep3();
      });
    });
  }

  startStep3() {
    this.clearStage();
    this.setStep(2);
    this.setInstructions('Step 3: Drag the swab out of the vial and into the PCR tube, then run the thermocycler.');
    this.setDialogue('Move the swab onto the PCR tube.');

    const { width, height } = this.scale;
    this.createDesk();

    this.openSwab = this.add.image(width * 0.28, height * 0.58, 'dna_swab_open')
      .setOrigin(0.5)
      .setDisplaySize(220, 185)
      .setDepth(1);
    this.addStageObject(this.openSwab);

    this.thermocycler = this.add.image(width * 0.72, height * 0.60, 'thermocycler')
      .setOrigin(0.5)
      .setDisplaySize(360, 260)
      .setDepth(1);
    this.addStageObject(this.thermocycler);

    this.pcrTube = this.add.image(width * 0.72, height * 0.60, 'pcr_tube')
      .setOrigin(0.5)
      .setDisplaySize(90, 150)
      .setDepth(2);
    this.addStageObject(this.pcrTube);

    const tubeGlow = this.add.ellipse(this.pcrTube.x, this.pcrTube.y, 130, 190, 0x8bffb0, 0.1)
      .setStrokeStyle(2, 0x8bffb0, 0.65)
      .setDepth(2);
    this.addStageObject(tubeGlow);

    this.dnaSwab = this.add.image(width * 0.28, height * 0.58, 'dna_swab')
      .setOrigin(0.5)
      .setDisplaySize(200, 60)
      .setDepth(4)
      .setInteractive({ draggable: true, useHandCursor: true });
    this.addStageObject(this.dnaSwab);
    this.input.setDraggable(this.dnaSwab);

    this.dnaSwab.on('drag', (pointer, dragX, dragY) => {
      if (this.resolved || !this.dnaSwab?.active) return;
      this.dnaSwab.setPosition(dragX, dragY);
    });

    this.dnaSwab.on('dragend', () => {
      if (this.resolved || !this.pcrTube?.active) return;

      if (!this.pcrTube.getBounds().contains(this.dnaSwab.x, this.dnaSwab.y)) {
        this.penalize(3);
        this.setDialogue('The swab needs to go into the PCR tube.');
        return;
      }

      tubeGlow.destroy();
      this.dnaSwab.disableInteractive();
      this.dnaSwab.setVisible(false);
      this.openSwab.setAlpha(0.4);
      this.pcrTube.setTint(0xbfffd0);

      this.setDialogue('Sample loaded. Press RUN to start amplification.');
      this.createRunButton(width * 0.72, height * 0.86, 'RUN PCR', () => this.runPcr());
    });
  }

  runPcr() {
    if (this.pcrRunning || this.pcrComplete) return;
    this.pcrRunning = true;
    this.setDialogue('Amplifying DNA... hold on.');

    const light = this.add.circle(this.thermocycler.x, this.thermocycler.y - 105, 10, 0xff5a5a, 1)
      .setDepth(3);
    this.addStageObject(light);

    this.tweens.add({
      targets: light,
      alpha: { from: 1, to: 0.2 },
      duration: 220,
      yoyo: true,
      repeat: 8
    });

    this.time.delayedCall(2000, () => {
      if (this.resolved) return;
      this.pcrRunning = false;
      this.pcrComplete = true;
      light.setFillStyle(0x39ff14, 1);
      this.pcrTube.setTint(0x39ff14);
      this.setDialogue('Amplification complete. Transfer the sample to the gel with the pipette.');

      this.time.delayedCall(500, () => {
        if (!this.resolved) this.startStep4();
      });
    });
  }

  // Local helper text-button used for non-classification actions
  // (RUN PCR / RUN GEL). NOT registered with createButton() on purpose:
  // these are one-shot process triggers, not answer choices, so they
  // don't need onCorrectChoice()/flashWrongSelection() highlighting.
  createRunButton(x, y, label, onClick) {
    const button = this.add.text(x, y, label, {
      fontFamily: 'PressStart2P',
      fontSize: '14px',
      color: '#0d1713',
      backgroundColor: '#39ff14',
      padding: { left: 16, right: 16, top: 10, bottom: 10 }
    }).setOrigin(0.5).setDepth(6).setInteractive({ useHandCursor: true });
    this.addStageObject(button);

    button.on('pointerover', () => button.setBackgroundColor('#8bffb0'));
    button.on('pointerout', () => button.setBackgroundColor('#39ff14'));
    button.on('pointerdown', () => {
      button.disableInteractive();
      button.setBackgroundColor('#2a5c22');
      onClick();
    });

    return button;
  }

  startStep4() {
    this.clearStage();
    this.setStep(3);
    this.setInstructions('Step 4: Load the amplified sample onto the gel, then run the electrophoresis.');
    this.setDialogue('Use the pipette: PCR tube first, sample well second.');

    const { width, height } = this.scale;
    this.createDesk();

    this.gelTray = this.add.image(width * 0.55, height * 0.60, 'gel_tray')
      .setOrigin(0.5)
      .setDisplaySize(560, 260)
      .setDepth(1);
    this.addStageObject(this.gelTray);

    this.pcrTube = this.add.image(width * 0.14, height * 0.30, 'pcr_tube')
      .setOrigin(0.5)
      .setDisplaySize(80, 130)
      .setDepth(3)
      .setTint(0x39ff14);
    this.addStageObject(this.pcrTube);

    const tubeLabel = this.add.text(width * 0.14, height * 0.30 + 78, 'SAMPLE', {
      fontFamily: 'PressStart2P',
      fontSize: '9px',
      color: '#f4e6cf'
    }).setOrigin(0.5).setDepth(4);
    this.addStageObject(tubeLabel);

    const laneOffsets = [
      { id: 'controlXX', label: 'CTRL XX', x: -170, bands: 1, isControl: true },
      { id: 'controlXY', label: 'CTRL XY', x: -55, bands: 2, isControl: true },
      { id: 'sample', label: 'SAMPLE', x: 90, bands: null, isControl: false }
    ];

    this.wells = laneOffsets.map(lane => {
      const x = this.gelTray.x + lane.x;
      const wellY = this.gelTray.y - 85;

      const well = this.add.rectangle(x, wellY, 46, 22, 0x0d1713, 0.9)
        .setStrokeStyle(2, 0xe7d8bf, 0.8)
        .setDepth(3);
      this.addStageObject(well);

      const label = this.add.text(x, wellY - 24, lane.label, {
        fontFamily: 'PressStart2P',
        fontSize: '9px',
        color: '#f4e6cf'
      }).setOrigin(0.5).setDepth(4);
      this.addStageObject(label);

      return { ...lane, x, wellY, well, laneBottom: this.gelTray.y + 95, bandObjects: [] };
    });

    this.createPipette(width * 0.30, height * 0.24);
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

  createPipette(startX, startY) {
    this.pipette = this.add.image(startX, startY, 'pipette')
      .setOrigin(0.5)
      .setDepth(6)
      .setInteractive({ draggable: true, useHandCursor: true });
    this.addStageObject(this.pipette);
    this.input.setDraggable(this.pipette);

    const tipOffsetX = -145;
    const tipOffsetY = 0;

    const marker = this.add.circle(startX + tipOffsetX, startY + tipOffsetY, 10, 0xe7f7ff, 0.9)
      .setStrokeStyle(2, 0xffffff, 1)
      .setDepth(8);
    this.addStageObject(marker);

    let tubeLoaded = false;

    this.pipette.on('drag', (pointer, dragX, dragY) => {
      if (this.resolved || !this.pipette?.active) return;
      this.pipette.setPosition(dragX, dragY);
      marker.setPosition(dragX + tipOffsetX, dragY + tipOffsetY);
    });

    this.pipette.on('dragend', () => {
      if (this.resolved || !this.pipette?.active) return;

      const tipX = this.pipette.x + tipOffsetX;
      const tipY = this.pipette.y + tipOffsetY;

      if (!tubeLoaded) {
        if (this.pcrTube?.getBounds().contains(tipX, tipY)) {
          tubeLoaded = true;
          marker.setFillStyle(0x39ff14, 1);
          this.setDialogue('Sample loaded. Place it in the SAMPLE well.');
        } else {
          this.penalize(3);
          this.setDialogue('Draw the amplified sample from the PCR tube first.');
        }
        return;
      }

      const sampleWell = this.wells.find(w => w.id === 'sample');
      const distance = Phaser.Math.Distance.Between(tipX, tipY, sampleWell.x, sampleWell.wellY);

      if (distance > 40) {
        this.penalize(3);
        this.setDialogue('Aim the pipette at the SAMPLE well on the gel.');
        return;
      }

      if (this.loadedSample) {
        this.setDialogue('The sample well is already loaded.');
        return;
      }

      this.loadedSample = true;
      sampleWell.well.setFillStyle(0x2a5c22, 1);
      marker.setFillStyle(0xe7f7ff, 0.9);
      this.pipette.disableInteractive();

      this.setDialogue('Sample loaded. Press RUN to start the electrophoresis.');
      this.createRunButton(this.scale.width * 0.55, this.scale.height * 0.88, 'RUN GEL', () => this.runGel());
    });
  }

  runGel() {
    if (this.gelRun) return;
    this.gelRun = true;
    this.setDialogue('Running electrophoresis... DNA fragments are separating by size.');

    const sampleWell = this.wells.find(w => w.id === 'sample');
    sampleWell.bands = PROFILE_BANDS[this.correctValue];

    this.wells.forEach(lane => {
      const bandCount = lane.isControl ? lane.bands : sampleWell.bands;
      const travel = lane.laneBottom - lane.wellY;

      for (let i = 0; i < bandCount; i++) {
        const band = this.add.rectangle(lane.x, lane.wellY, 40, 8, 0x111111, 0)
          .setDepth(4);
        this.addStageObject(band);

        const finalY = lane.wellY + travel * (0.35 + i * 0.35);

        this.tweens.add({
          targets: band,
          y: finalY,
          alpha: 1,
          duration: 1400 + i * 300,
          ease: 'Cubic.easeOut'
        });

        lane.bandObjects.push(band);
      }
    });

    this.time.delayedCall(2200, () => {
      if (this.resolved) return;
      this.setDialogue('Run complete. Use the UV light to inspect the bands, then classify the sample.');
      this.showGelReadout();
    });
  }

  showGelReadout() {
    this.setStep(4);

    const { width, height } = this.scale;

    const hotspot = this.add.zone(this.gelTray.x, this.gelTray.y, this.gelTray.displayWidth, this.gelTray.displayHeight)
      .setOrigin(0.5)
      .setDepth(7)
      .setInteractive({ useHandCursor: true });
    this.addStageObject(hotspot);

    const hint = this.add.text(this.gelTray.x, this.gelTray.y + 145, 'CLICK GEL FOR UV LIGHT', {
      fontFamily: 'PressStart2P',
      fontSize: '10px',
      color: '#ffe8a3',
      backgroundColor: '#15100d',
      padding: { left: 8, right: 8, top: 6, bottom: 6 }
    }).setOrigin(0.5).setDepth(8);
    this.addStageObject(hint);

    hotspot.on('pointerdown', () => {
      if (this.resolved || this.gelViewerOpened) return;
      this.gelViewerOpened = true;
      hint.setVisible(false);
      hotspot.disableInteractive();
      this.showUvOverlay();
    });

    this.createGenderChoicePanel(width * 0.86, height * 0.55);
  }

  showUvOverlay() {
    const { width, height } = this.scale;
    const sampleWell = this.wells.find(w => w.id === 'sample');

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.9)
      .setDepth(50)
      .setInteractive({ useHandCursor: true });

    const frame = this.add.image(width / 2, height / 2, 'microscope_look')
      .setOrigin(0.5)
      .setDisplaySize(width * 0.76, height * 0.76)
      .setDepth(51)
      .setTint(0xbfffe0);

    const title = this.add.text(width / 2, height * 0.13, 'UV LIGHT: BAND PATTERN', {
      fontFamily: 'PressStart2P',
      fontSize: '13px',
      color: '#ffe8a3'
    }).setOrigin(0.5).setDepth(53);

    const laneTexts = this.wells.map((lane, index) => {
      const bandCount = lane.isControl ? lane.bands : sampleWell.bands;
      const bars = Array.from({ length: bandCount }, () => '▬▬▬▬').join('\n');
      return this.add.text(width * (0.32 + index * 0.18), height * 0.5, `${lane.label}\n\n${bars}`, {
        fontFamily: 'Special Elite',
        fontSize: '20px',
        color: '#39ff14',
        align: 'center',
        lineSpacing: 10
      }).setOrigin(0.5).setDepth(52);
    });

    const reactionText = this.add.text(width / 2, height * 0.78, [
      `SAMPLE BANDS: ${sampleWell.bands}`,
      sampleWell.bands === 1 ? 'MATCHES CONTROL XX (1 BAND)' : 'MATCHES CONTROL XY (2 BANDS)'
    ].join('\n'), {
      fontFamily: 'Special Elite',
      fontSize: '22px',
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

    const overlayObjects = [overlay, frame, title, reactionText, hint, ...laneTexts];
    this.stageObjects.push(...overlayObjects);

    overlay.on('pointerdown', () => {
      overlayObjects.forEach(object => object?.destroy?.());
      this.stageObjects = this.stageObjects.filter(object => !overlayObjects.includes(object));
      this.setDialogue('Compare the band count with the reference ladders, then classify the sample.');
    });
  }

  // Uses BaseForensicMinigame.createButton() with label EQUAL to the
  // value passed into resolveChoice() ('XX' / 'XY'), so the base
  // class can find and highlight the correct/wrong button.
  createGenderChoicePanel(x, y) {
    const panel = this.add.rectangle(x, y, 320, 320, 0x0d1713, 0.94)
      .setStrokeStyle(2, 0x39ff14, 0.6)
      .setDepth(1);
    this.addStageObject(panel);

    const title = this.add.text(x, y - 120, 'CLASSIFY PROFILE', {
      fontFamily: 'Special Elite',
      fontSize: '20px',
      color: '#ffe8a3'
    }).setOrigin(0.5).setDepth(2);
    this.addStageObject(title);

    DNA_PROFILES.forEach((profile, index) => {
      const optionY = y - 30 + index * 100;

      const subLabel = this.add.text(x, optionY - 36, PROFILE_SUBLABEL[profile], {
        fontFamily: 'Special Elite',
        fontSize: '13px',
        color: '#b8cfc2'
      }).setOrigin(0.5).setDepth(2);
      this.addStageObject(subLabel);

      this.createButton(
        x,
        optionY,
        240,
        56,
        profile,
        () => {
          if (this.resolved) return;
          if (!this.gelViewerOpened) {
            this.setDialogue('Inspect the gel under UV light before classifying the sample.');
            return;
          }
          this.resolveChoice(profile, profile === this.correctValue, 10);
        },
        {
          fontFamily: 'PressStart2P',
          fontSize: '16px',
          bgColor: 0x3a2920,
          borderColor: 0x7cc89f,
          depth: 3
        }
      );
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