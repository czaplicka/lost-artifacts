import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { BaseForensicMinigame } from './BaseForensicMinigame.js';

const FONT_UI = 'PressStart2P';
const FONT_DOC = 'SpecialElite';

const WRONG_LINES = [
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_19d07fced09192ca726f"),
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_1ffee67cdfecce31bb57"),
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_d187501640ca7ab5e097"),
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_2a219db4fa093ea56f71"),
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_38c10cbc5cb544d6ca0e")
];

const MANUAL_TEXT = [
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_971983160260bf8a6455"),
  '',
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_aee09973d65f743416a9"),
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_d7586a65e9c9310adddb"),
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_29de470a6a1861c4fd22"),
  '',
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_27d90e0ac2ea005df8be"),
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_22e8ba16640fb318922c"),
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_495149ef1182f1e3b50e"),
  '',
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_2aef2d6274bc765c3020"),
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_80381b0bf40ba0aa4514"),
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_8184b45f52dde52fb590"),
  '',
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_7653a2f36f4d7181ed18"),
  '',
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_b118803dd39bd4236093"),
  '',
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_576575f5e2f027e26f97"),
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_7b1ad86216459ba68ee7"),
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_39572a3fdf5431b95c26"),
  '',
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_4ad833b9f036a7bc41c4"),
  __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_b059a1e1d735fe6052bf")
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
      this.clueText = __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_d29604244f635cb6b586");
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
    return __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_ee631ea13c50bb1a54d0");
  }

  getSubtitle() {
    return this.previewMode
      ? __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_a1ac03147f811969294a")
      : __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_640042a439fd7bdb8509");
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
      this.setInstructions(__dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_a28fb13b3311d5febed4"));
      this.setDialogue(
        __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_2ac485edd2244d7165b3")
      );
      return;
    }

    this.buildWorkbench();

    this.setInstructions(
      __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_091e41b4c6f2a82b4d5e")
    );

    this.setDialogue(
      __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_93139a9447430419e9ca")
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

    text(-350, -136, `${__dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_8719b82bb0df4cb0fe97")}${this.sampleCode}`, 20, '#ffe8a3');
    text(25, -136, `${__dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_4ba4424eea8d1fd347b0")}${this.analyzerModel}`, 20, '#7dff7a');

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

    text(-335, 40, __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_f4986660a6c7161cd076"), 15, '#ffe8a3');

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

    button(-290, 110, __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_8abacbfce0a83f575b1a"), () => {
      this.handleProtocolAction({ type: 'reagent', id: 'A' });
    });

    button(-145, 110, __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_425702b2c0219ef95703"), () => {
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
        __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_90a98ad79f799d5f749f")
      );
    });

    this.sopButton = this.createButton(
      width - 110,
      78,
      150,
      38,
      __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_7c54e39c3c15483b9c70"),
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
      `${__dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_474a987f3bbe57fed43b")}${this.protocolProgress}${__dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_a45fed8db95cd006bc13")}`
    );
  }

  actionLabel(action) {
    if (action.type === 'reagent') return `${__dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_400cf207ff2842b9d0ea")}${action.id}`;
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

    let message = `${Phaser.Utils.Array.GetRandom(WRONG_LINES)}${__dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_42b3ee72ca31fd4d3559")}`;

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
        __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_5935ad7bac7f5d5e9abd");
    }

    this.updateTerminal();
    this.setDialogue(message);
  }

  updateTerminal() {
    this.terminalText?.setText([
      `${__dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_075615d0c4df32dd4012")}${this.analyzerModel}`,
      `${__dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_412498d1e382632c1e35")}${this.aliquotNumber}`,
      `${__dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_bf2b9579d38c4db5f016")}${this.protocolProgress}${__dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_425f4b39d0b3e4fef907")}`,
      `${__dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_95c57004c7de6dd30ff6")}${this.mistakes}`,
      this.protocolProgress === 6
        ? __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_8814d2f2349717bd418e")
        : __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_4c83f9b8d353a93ef2e8")
    ].join(__dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_01ba4719c80b6fe911b0")));

    this.protocolText?.setText(
      `${__dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_a8b5793d609463d4ad7e")}${this.protocolLog.at(-1) || __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_c627c09c14e58e44bc51")}`
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
          __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_319aec83947878015de3"),
          '',
          this.previewMode
            ? __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_97069b6989a2b31fee4d")
            : displayValue.toUpperCase(),
          '',
          `${__dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_eebf182f506a9cc5f009")}`,
          `${__dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_3732cd148466f1bea431")}${this.mistakes}`,
          '',
          this.previewMode
            ? __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_2eaee54c13d6a4a701fd")
            : __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_8be848b158628703b1c3")
        ].join(__dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_01ba4719c80b6fe911b0")),
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
      finishButton?.text?.setText(__dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_25c67b3301a6429c79e4"));
    }
  }

  applyTimeBonus() {
    return 0;
  }

  getSuccessMessage() {
    return this.previewMode
      ? __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_124586c814d0131e1936")
      : __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_980eab863c19e74a9ea4");
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
      __dialogueText("scenes/CSI/ChemicalResidueScene.js", "t_014b3cb291da1d46ce8e"),
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