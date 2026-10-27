import { BaseForensicMinigame } from './BaseForensicMinigame.js';

const FONT_UI = 'PressStart2P';
const FONT_DOC = 'SpecialElite';

const WRONG_LINES = [
  'The sample bubbles. That was not in the brochure.',
  'Protocol violated. The clipboard looks disappointed.',
  'The analyzer requests a more qualified detective.',
  'A tiny warning light has developed trust issues.',
  'The lab manual would like a word with you.'
];

const MANUAL_TEXT = [
  'CHEMICAL RESIDUE — OPERATING PROCEDURE',
  '',
  '1. Read the last digit of the SAMPLE CODE.',
  '   ODD: start with REAGENT A.',
  '   EVEN: start with REAGENT B.',
  '',
  '2. Check the analyzer model.',
  '   CR-3: select UV365.',
  '   CR-2: select UV254.',
  '',
  '3. Count the numbered residue spots.',
  '   MORE than 3: PREP before UV.',
  '   3 or fewer: PREP after UV.',
  '',
  '4. Apply the OTHER reagent.',
  '',
  '5. Press ANALYZE, then COMPARE.',
  '',
  'Wrong action: -10 points.',
  'Every third mistake resets the procedure.',
  'Replacement aliquots are supplied automatically.',
  '',
  'COFFEE is not a laboratory reagent.',
  'Fictional game protocol. Not real chemistry.'
].join('\n');

export class ChemicalResidueScene extends BaseForensicMinigame {
  constructor() {
    super('ChemicalResidueScene');
  }

  init(data = {}) {
    super.init({
      ...data,
      totalSteps: 6
    });

    this.previewMode = data.preview === true;

    if (this.previewMode) {
      this.evidenceType = 'chemical_residue_preview';
      this.correctValue = 'preview_residue';
      this.clueType = 'preview';
      this.clueText = 'Preview only. No case evidence was generated.';
    }

    this.protocolProgress = 0;
    this.protocolLog = [];
    this.manual = null;
    this.workbench = null;
    this.samplePlate = null;
    this.spotObjects = [];
    this.terminalText = null;
    this.protocolText = null;
    this.sopButton = null;
    this.escapeHandler = null;

    this.configurationValid =
      typeof this.correctValue === 'string' &&
      this.correctValue.trim().length > 0 &&
      this.evidenceType !== 'generic';

    this.sampleCode = `CR-${String(
      Phaser.Math.Between(0, 99999)
    ).padStart(5, '0')}`;

    this.analyzerModel = Phaser.Utils.Array.GetRandom([
      'CR-2',
      'CR-3'
    ]);

    this.spotCount = Phaser.Math.Between(2, 5);
    this.aliquotNumber = 1;

    const odd = Number(this.sampleCode.slice(-1)) % 2 === 1;
    const firstReagent = odd ? 'A' : 'B';
    const secondReagent = odd ? 'B' : 'A';
    const wavelength = this.analyzerModel === 'CR-3'
      ? 'UV365'
      : 'UV254';

    const middleActions = this.spotCount > 3
      ? [
          { type: 'prep' },
          { type: 'uv', id: wavelength }
        ]
      : [
          { type: 'uv', id: wavelength },
          { type: 'prep' }
        ];

    this.solution = [
      { type: 'reagent', id: firstReagent },
      ...middleActions,
      { type: 'reagent', id: secondReagent },
      { type: 'analyze' },
      { type: 'compare' }
    ];
  }

  getTitle() {
    return 'CHEMICAL RESIDUE ANALYSIS';
  }

  getSubtitle() {
    return this.previewMode
      ? 'Training sample — no case results will be saved'
      : 'Trace examination — follow the desk protocol';
  }

  createEvidenceFlow() {
    // This puzzle rewards accuracy, not rushing through the manual.
    this.timerEvent?.remove(false);
    this.timerEvent = null;

    this.createManual();

    this.escapeHandler = () => {
      if (this.manual?.visible) {
        this.setManualVisible(false);
      }
    };

    this.input.keyboard?.on('keydown-ESC', this.escapeHandler);

    if (!this.configurationValid) {
      this.setInstructions('Missing evidence configuration.');
      this.setDialogue(
        'No case result supplied. Close this test and return to the lab.'
      );
      return;
    }

    this.buildWorkbench();

    this.setInstructions(
      'Read SOP. Inspect the sample code, analyzer model and numbered spots.'
    );

    this.setDialogue(
      'A residue sample awaits analysis. The manual has survived three budget cuts.'
    );

    this.updateTerminal();
  }

  buildWorkbench() {
    const { width, height } = this.scale;

    this.playAreaBg?.setVisible(false);

    const availableHeight = Math.max(100, height - 335);
    const scale = Math.min(
      (width - 64) / 760,
      availableHeight / 300
    );

    this.workbench = this.add.container(
      width / 2,
      145 + availableHeight / 2
    ).setScale(scale).setDepth(20);

    this.addStageObject(this.workbench);

    const add = object => {
      this.workbench.add(object);
      return object;
    };

    const text = (x, y, content, size = 18, color = '#d5e6dc') => {
      return add(this.add.text(x, y, content, {
        fontFamily: FONT_DOC,
        fontSize: `${size}px`,
        color,
        wordWrap: { width: 340 }
      }));
    };

    add(
      this.add.rectangle(0, 0, 760, 300, 0x122019)
        .setStrokeStyle(2, 0x5da17f)
    );

    text(-350, -136, `SAMPLE: ${this.sampleCode}`, 20, '#ffe8a3');
    text(25, -136, `ANALYZER: ${this.analyzerModel}`, 20, '#7dff7a');

    this.samplePlate = add(
      this.add.rectangle(-195, -32, 280, 126, 0xb7c5c4)
        .setStrokeStyle(3, 0x536866)
    );

    const positions = [
      [-275, -50],
      [-195, -50],
      [-115, -50],
      [-235, 0],
      [-155, 0]
    ];

    this.spotObjects = [];

    for (let index = 0; index < this.spotCount; index++) {
      const [x, y] = positions[index];

      const spot = add(
        this.add.circle(x, y, 15, 0x75633d)
          .setStrokeStyle(2, 0x473c25)
      );

      this.spotObjects.push(spot);

      add(
        this.add.text(x, y, String(index + 1), {
          fontFamily: FONT_UI,
          fontSize: '10px',
          color: '#ffffff'
        }).setOrigin(0.5)
      );
    }

    text(-335, 40, 'NUMBERED RESIDUE SPOTS', 15, '#ffe8a3');

    add(
      this.add.rectangle(190, -27, 330, 145, 0x030b07)
        .setStrokeStyle(2, 0x375c4b)
    );

    this.terminalText = text(
      40, -90, '', 17, '#7dff7a'
    );

    this.protocolText = text(
      -350, 76, '', 16, '#ffe8a3'
    );

    const button = (x, y, label, callback) => {
      const control = this.createButton(
        x, y, 136, 38, label, callback,
        {
          fontFamily: FONT_UI,
          fontSize: '9px',
          depth: 150
        }
      );

      this.workbench.add(control);
      return control;
    };

    button(-290, 110, 'REAGENT A', () => {
      this.handleProtocolAction({ type: 'reagent', id: 'A' });
    });

    button(-145, 110, 'REAGENT B', () => {
      this.handleProtocolAction({ type: 'reagent', id: 'B' });
    });

    button(0, 110, 'PREP', () => {
      this.handleProtocolAction({ type: 'prep' });
    });

    button(145, 110, 'UV254', () => {
      this.handleProtocolAction({ type: 'uv', id: 'UV254' });
    });

    button(290, 110, 'UV365', () => {
      this.handleProtocolAction({ type: 'uv', id: 'UV365' });
    });

    // Second row sits below the bench; reserved space remains above the footer.
    button(-145, 158, 'ANALYZE', () => {
      this.handleProtocolAction({ type: 'analyze' });
    });

    button(0, 158, 'COMPARE', () => {
      this.handleProtocolAction({ type: 'compare' });
    });

    button(145, 158, 'COFFEE', () => {
      if (this.manual?.visible) return;

      this.playOptionalSfx('sfx_click');
      this.setDialogue(
        'The coffee is for the detective. The sample has suffered enough.'
      );
    });

    this.sopButton = this.createButton(
      width - 110,
      78,
      150,
      38,
      'READ SOP',
      () => this.setManualVisible(true),
      {
        fontFamily: FONT_UI,
        fontSize: '10px',
        depth: 200
      }
    );
  }

  handleProtocolAction(action) {
    if (
      !this.configurationValid ||
      this.resolved ||
      this._minigameClosing ||
      this.manual?.visible
    ) {
      return;
    }

    const expected = this.solution[this.protocolProgress];

    const matches = Boolean(
      expected &&
      expected.type === action.type &&
      (expected.id === undefined || expected.id === action.id)
    );

    if (!matches) {
      this.handleProtocolMistake();
      return;
    }

    this.playOptionalSfx('sfx_ok');

    this.protocolProgress += 1;
    this.protocolLog.push(this.actionLabel(action));
    this.setStep(this.protocolProgress);
    this.applyActionVisual(action);
    this.updateTerminal();

    if (this.protocolProgress === this.solution.length) {
      this.completeAnalysis();
      return;
    }

    this.setDialogue(
      `Step ${this.protocolProgress}/6 accepted. No paperwork casualties reported.`
    );
  }

  actionLabel(action) {
    if (action.type === 'reagent') return `REAGENT ${action.id}`;
    if (action.type === 'uv') return action.id;

    return action.type.toUpperCase();
  }

  applyActionVisual(action) {
    if (action.type === 'reagent') {
      const color = action.id === 'A' ? 0x65bd91 : 0xc393df;

      this.spotObjects.forEach(spot => {
        spot.setFillStyle(color);
      });
    }

    if (action.type === 'prep') {
      this.samplePlate?.setFillStyle(0xdce7e3);
    }

    if (action.type === 'uv') {
      this.samplePlate?.setFillStyle(
        action.id === 'UV365' ? 0x64558c : 0x475a89
      );
    }
  }

  handleProtocolMistake() {
    this.penalize(10);
    this.playOptionalSfx('sfx_buzz');

    if (this.workbench) {
      this.tweens.killTweensOf(this.workbench);

      this.workbench.setAlpha(1);

      this.tweens.add({
        targets: this.workbench,
        alpha: 0.45,
        duration: 70,
        yoyo: true,
        repeat: 1
      });
    }

    let message = `${Phaser.Utils.Array.GetRandom(WRONG_LINES)} (-10 pts)`;

    if (this.mistakes % 3 === 0) {
      this.protocolProgress = 0;
      this.protocolLog = [];
      this.aliquotNumber += 1;

      this.setStep(0);
      this.samplePlate?.setFillStyle(0xb7c5c4);

      this.spotObjects.forEach(spot => {
        spot.setFillStyle(0x75633d);
      });

      message =
        'Aliquot contaminated. A fresh portion is ready. Restart the same protocol. (-10 pts)';
    }

    this.updateTerminal();
    this.setDialogue(message);
  }

  updateTerminal() {
    this.terminalText?.setText([
      `MODEL: ${this.analyzerModel}`,
      `ALIQUOT: ${this.aliquotNumber}`,
      `ACCEPTED: ${this.protocolProgress}/6`,
      `MISTAKES: ${this.mistakes}`,
      this.protocolProgress === 6
        ? 'STATUS: COMPLETE'
        : 'STATUS: AWAITING INPUT'
    ].join('\n'));

    this.protocolText?.setText(
      `LAST ACTION: ${this.protocolLog.at(-1) || 'NONE'}`
    );
  }

  completeAnalysis() {
    this.setManualVisible(false);
    this.setStep(this.totalSteps);

    this.workbench?.setVisible(false);
    this.sopButton?.setVisible(false);

    this.resolveChoice(this.correctValue, true);
    this.playOptionalSfx('sfx_success');

    const { width, height } = this.scale;
    const displayValue = this.evidenceConfig.displayValue ||
      this.evidenceConfig.resultLabel ||
      this.toDisplayText(this.correctValue);

    this.addStageObject(
      this.add.text(
        width / 2,
        (145 + height - 190) / 2,
        [
          'ANALYSIS COMPLETE',
          '',
          this.previewMode
            ? 'TRAINING SAMPLE'
            : displayValue.toUpperCase(),
          '',
          `Protocol: 6/6 accepted`,
          `Mistakes: ${this.mistakes}`,
          '',
          this.previewMode
            ? 'Preview only. Nothing will be added to the case.'
            : 'Result ready. Add it to the case file.'
        ].join('\n'),
        {
          fontFamily: FONT_DOC,
          fontSize: '21px',
          color: '#7dff7a',
          align: 'center',
          wordWrap: { width: width - 100 }
        }
      ).setOrigin(0.5).setDepth(40)
    );

    if (this.previewMode) {
      const finishButton = this.optionButtons.at(-1);
      finishButton?.text?.setText('CLOSE PREVIEW');
    }
  }

  applyTimeBonus() {
    return 0;
  }

  getSuccessMessage() {
    return this.previewMode
      ? 'Training complete. The clipboard reluctantly approves.'
      : 'Protocol complete. The result is ready for the case file.';
  }

  getResultPayload() {
    return {
      ...super.getResultPayload(),
      preview: this.previewMode,
      analysisMethod: 'chemical_residue_protocol',
      sampleCode: this.sampleCode,
      analyzerModel: this.analyzerModel,
      residueSpotCount: this.spotCount,
      aliquotsUsed: this.aliquotNumber,
      protocolStepsCompleted: this.protocolProgress,
      protocolLog: [...this.protocolLog]
    };
  }

  finishMinigame() {
    if (!this.previewMode) {
      super.finishMinigame();
      return;
    }

    if (!this.resolved || this._minigameClosing) return;

    this._minigameClosing = true;

    // Preview never emits a successful case result.
    this.events.emit('minigame-closed', {
      aborted: true,
      completed: false,
      preview: true
    });

    this.scene.stop();
  }

  createManual() {
    const { width, height } = this.scale;

    this.manual = this.add.container(0, 0)
      .setDepth(2000)
      .setVisible(false);

    const blocker = this.add.rectangle(
      width / 2, height / 2, width, height, 0x000000, 0.8
    ).setInteractive();

    const sheetWidth = Math.min(740, width - 40);
    const sheetHeight = height - 40;

    const sheet = this.add.rectangle(
      width / 2,
      height / 2,
      sheetWidth,
      sheetHeight,
      0xf1ead8
    ).setStrokeStyle(3, 0x8a7f5c);

    const body = this.add.text(
      width / 2 - sheetWidth / 2 + 24,
      42,
      MANUAL_TEXT,
      {
        fontFamily: FONT_DOC,
        fontSize: '18px',
        color: '#2b2b2b',
        lineSpacing: 3,
        wordWrap: { width: sheetWidth - 48 }
      }
    );

    const bodyScale = Math.min(
      1,
      (sheetHeight - 95) / body.height
    );

    body.setScale(bodyScale);

    const close = this.add.text(
      width / 2,
      height - 48,
      '[ CLOSE / ESC ]',
      {
        fontFamily: FONT_UI,
        fontSize: '11px',
        color: '#2b2b2b',
        backgroundColor: '#d8cba7',
        padding: { x: 12, y: 10 }
      }
    ).setOrigin(0.5).setInteractive({ useHandCursor: true });

    close.on('pointerdown', () => this.setManualVisible(false));

    this.manual.add([blocker, sheet, body, close]);
  }

  setManualVisible(visible) {
    if (!this.manual || this._minigameClosing) return;

    this.manual.setVisible(visible);
    this.playOptionalSfx('sfx_paper');
  }

  playOptionalSfx(key) {
    if (this.cache.audio.exists(key) && !this.sound.locked) {
      this.sound.play(key);
    }
  }

  cleanup() {
    if (this.escapeHandler) {
      this.input?.keyboard?.off('keydown-ESC', this.escapeHandler);
      this.escapeHandler = null;
    }

    this.manual?.destroy();
    this.manual = null;

    super.cleanup();

    this.workbench = null;
    this.samplePlate = null;
    this.terminalText = null;
    this.protocolText = null;
    this.sopButton = null;
    this.spotObjects = [];
  }
}