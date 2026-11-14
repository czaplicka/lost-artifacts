import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { BaseForensicMinigame } from './BaseForensicMinigame.js';
import { EventBus } from '../../EventBus.js';


const DNA_PROFILES = ['XX', 'XY'];


const PROFILE_SUBLABEL = {
  XX: __dialogueText("scenes/CSI/DnaGenderScene.js", "t_7e2d3e350c7ed951b4e1"),
  XY: __dialogueText("scenes/CSI/DnaGenderScene.js", "t_9d7a090a504886108162")
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


    this.genderChoicePanel = null;
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
    this.genderChoicePanel = null;
  }

  clearStage() {
    this.stageObjects.forEach((object) => {
      if (object) this.killTrackedTweensOf(object);
    });


    super.clearStage();
  }


  getTitle() {
    return __dialogueText("scenes/CSI/DnaGenderScene.js", "t_6fe6927089c8e077cd16");
  }


  getSubtitle() {
    return __dialogueText("scenes/CSI/DnaGenderScene.js", "t_2ff96cefb755b47ad97d");
  }


  getRetryHint() {
    return __dialogueText("scenes/CSI/DnaGenderScene.js", "t_1b8678fe6f8b0f19aad9");
  }


  createEvidenceFlow() {
    this.startStep1();
  }


  startStep1() {
    this.clearStage();
    this.setStep(0);
    this.setInstructions(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_f9c0af0530e8669afa8b"));
    this.setDialogue(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_28e59084359193658315"));


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
        this.setDialogue(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_a3fde91f812076edcb8d"));
        return;
      }


      this.closedSwab.setVisible(true);
      this.closedSwab.setPosition(this.tweezers.x - 45, this.tweezers.y + 40);
      this.evidenceBag.setAlpha(0.6);
      this.tweezers.disableInteractive();


      this.setDialogue(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_3e44544ef9dc3620226d"));


      this.time.delayedCall(450, () => {
        if (!this.resolved) this.startStep2();
      });
    });
  }


  startStep2() {
    this.clearStage();
    this.setStep(1);
    this.setInstructions(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_b38f0ebd2487071f6af9"));
    this.setDialogue(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_8208053b74f575fcaa93"));


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


    this.createTrackedTween({
      targets: targetGlow,
      alpha: { from: 0.12, to: 0.34 },
      scale: { from: 0.92, to: 1.08 },
      duration: 600,
      yoyo: true,
      repeat: -1
    });


    const hint = this.add.text(this.closedSwab.x, this.closedSwab.y + 140, __dialogueText("scenes/CSI/DnaGenderScene.js", "t_7a5f665e7774cf246c94"), {
      fontFamily: 'PressStart2P',
      fontSize: '10px',
      color: '#ffe8a3',
      backgroundColor: '#15100d',
      padding: { left: 8, right: 8, top: 6, bottom: 6 }
    }).setOrigin(0.5).setDepth(4);
    this.addStageObject(hint);


    this.closedSwab.on('pointerdown', () => {
      if (this.resolved) return;


      this.killTrackedTweensOf(targetGlow);
      targetGlow.destroy();
      hint.destroy();
      this.closedSwab.disableInteractive();
      this.closedSwab.setTexture('dna_swab_open');
      this.closedSwab.setDisplaySize(240, 200);


      this.setDialogue(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_e75098c3ba2ecc28cdd2"));


      this.time.delayedCall(500, () => {
        if (!this.resolved) this.startStep3();
      });
    });
  }


  startStep3() {
    this.clearStage();
    this.setStep(2);
    this.setInstructions(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_21a2b0fd9f8d7c5c63c4"));
    this.setDialogue(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_b7c59aea13386f8e4b0b"));


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
        this.setDialogue(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_82870e9615ff5b34b19e"));
        return;
      }


      tubeGlow.destroy();
      this.dnaSwab.disableInteractive();
      this.dnaSwab.setVisible(false);
      this.openSwab.setAlpha(0.4);
      this.pcrTube.setTint(0xbfffd0);


      this.setDialogue(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_82806a3b3bb43e9ef0eb"));
      this.createRunButton(width * 0.72, height * 0.86, __dialogueText("scenes/CSI/DnaGenderScene.js", "t_6056a0e38a4306d58616"), () => this.runPcr());
    });
  }


  runPcr() {
    if (this.pcrRunning || this.pcrComplete) return;
    this.pcrRunning = true;
    this.setDialogue(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_d135f17c93ea532145fb"));


    const light = this.add.circle(this.thermocycler.x, this.thermocycler.y - 105, 10, 0xff5a5a, 1)
      .setDepth(3);
    this.addStageObject(light);


    this.createTrackedTween({
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


      this.killTrackedTweensOf(light);
      light.setAlpha(1);
      light.setFillStyle(0x39ff14, 1);
      this.pcrTube.setTint(0x39ff14);
      this.setDialogue(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_754a3176f13a328078da"));


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
    this.setInstructions(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_43ad072f556ce9dab28a"));
    this.setDialogue(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_096736ced7aba7d1754f"));


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


    const tubeLabel = this.add.text(width * 0.14, height * 0.30 + 78, __dialogueText("scenes/CSI/DnaGenderScene.js", "t_ef0a524e07664d8f9f4e"), {
      fontFamily: 'PressStart2P',
      fontSize: '9px',
      color: '#f4e6cf'
    }).setOrigin(0.5).setDepth(4);
    this.addStageObject(tubeLabel);


    const laneOffsets = [
      { id: 'controlXX', label: __dialogueText("scenes/CSI/DnaGenderScene.js", "t_71de0161b2d830c940e6"), x: -170, bands: 1, isControl: true },
      { id: 'controlXY', label: __dialogueText("scenes/CSI/DnaGenderScene.js", "t_06cdc9f2b54f1081bbb3"), x: -55, bands: 2, isControl: true },
      { id: 'sample', label: __dialogueText("scenes/CSI/DnaGenderScene.js", "t_ef0a524e07664d8f9f4e"), x: 90, bands: null, isControl: false }
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
          this.setDialogue(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_c647e7393809395855a7"));
        } else {
          this.penalize(3);
          this.setDialogue(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_448a35a8a5366dfdc943"));
        }
        return;
      }


      const sampleWell = this.wells.find(w => w.id === 'sample');
      const distance = Phaser.Math.Distance.Between(tipX, tipY, sampleWell.x, sampleWell.wellY);


      if (distance > 40) {
        this.penalize(3);
        this.setDialogue(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_910406ecd40ee5756638"));
        return;
      }


      if (this.loadedSample) {
        this.setDialogue(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_2495bb007c94a1f96237"));
        return;
      }


      this.loadedSample = true;
      sampleWell.well.setFillStyle(0x2a5c22, 1);
      marker.setFillStyle(0xe7f7ff, 0.9);
      this.pipette.disableInteractive();


      this.setDialogue(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_e4709320e9eed49109ef"));
      this.createRunButton(this.scale.width * 0.55, this.scale.height * 0.88, __dialogueText("scenes/CSI/DnaGenderScene.js", "t_3363d4987c91927a7cad"), () => this.runGel());
    });
  }


  runGel() {
    if (this.gelRun) return;
    this.gelRun = true;
    this.setDialogue(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_df33b9d0f7b769e9e04a"));


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


        this.createTrackedTween({
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
      this.setDialogue(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_4d01e5fa2dd8a523e8df"));
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


    const hint = this.add.text(this.gelTray.x, this.gelTray.y + 145, __dialogueText("scenes/CSI/DnaGenderScene.js", "t_5ca7df37e5954bf40839"), {
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


    const title = this.add.text(width / 2, height * 0.13, __dialogueText("scenes/CSI/DnaGenderScene.js", "t_b32a51e246591a5819c2"), {
      fontFamily: 'PressStart2P',
      fontSize: '13px',
      color: '#ffe8a3'
    }).setOrigin(0.5).setDepth(53);


    const laneTexts = this.wells.map((lane, index) => {
      const bandCount = lane.isControl ? lane.bands : sampleWell.bands;
      const bars = Array.from({ length: bandCount }, () => '▬▬▬▬').join('\n');
      return this.add.text(width * (0.32 + index * 0.18), height * 0.5, `${lane.label}${__dialogueText("scenes/CSI/DnaGenderScene.js", "t_75a11da44c802486bc6f")}${bars}`, {
        fontFamily: 'SpecialElite',
        fontSize: '20px',
        color: '#39ff14',
        align: 'center',
        lineSpacing: 10
      }).setOrigin(0.5).setDepth(52);
    });


    const reactionText = this.add.text(width / 2, height * 0.78, [
      `${__dialogueText("scenes/CSI/DnaGenderScene.js", "t_d3655db26be893ca0f9d")}${sampleWell.bands}`,
      sampleWell.bands === 1 ? __dialogueText("scenes/CSI/DnaGenderScene.js", "t_6d4f8eadec91657f77bf") : __dialogueText("scenes/CSI/DnaGenderScene.js", "t_71ab0faf74a37fad27dc")
    ].join(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_01ba4719c80b6fe911b0")), {
      fontFamily: 'SpecialElite',
      fontSize: '22px',
      color: '#dff2de',
      align: 'center',
      lineSpacing: 7
    }).setOrigin(0.5).setDepth(53);


    const hint = this.add.text(width / 2, height - 45, __dialogueText("scenes/CSI/DnaGenderScene.js", "t_e8825e41e8f3c18554f4"), {
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


      this.stageObjects = this.stageObjects.filter(
        object => !overlayObjects.includes(object)
      );


      this.genderChoicePanel?.setVisible(true);


      this.setDialogue(
        __dialogueText("scenes/CSI/DnaGenderScene.js", "t_49ecdd692415f329ba98")
      );
    });
  }


  createGenderChoicePanel(x, y) {
    this.genderChoicePanel = this.add.container(0, 0)
      .setDepth(1)
      .setVisible(false);


    const panel = this.add.rectangle(x, y, 320, 320, 0x0d1713, 0.94)
      .setStrokeStyle(2, 0x39ff14, 0.6);


    const title = this.add.text(x, y - 120, __dialogueText("scenes/CSI/DnaGenderScene.js", "t_1d9c0894eceab05b033f"), {
      fontFamily: 'SpecialElite',
      fontSize: '20px',
      color: '#ffe8a3'
    }).setOrigin(0.5);


    this.genderChoicePanel.add([panel, title]);


    DNA_PROFILES.forEach((profile, index) => {
      const optionY = y - 30 + index * 100;


      const subLabel = this.add.text(x, optionY - 36, PROFILE_SUBLABEL[profile], {
        fontFamily: 'SpecialElite',
        fontSize: '13px',
        color: '#b8cfc2'
      }).setOrigin(0.5);


      const button = this.createButton(
        x,
        optionY,
        240,
        56,
        profile,
        () => {
          if (this.resolved) return;


          if (!this.gelViewerOpened) {
            this.setDialogue(__dialogueText("scenes/CSI/DnaGenderScene.js", "t_48ad2e0b998f7812565b"));
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


      this.genderChoicePanel.add([subLabel, button]);
    });


    this.addStageObject(this.genderChoicePanel);
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