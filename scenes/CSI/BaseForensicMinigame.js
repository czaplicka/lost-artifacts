import { BaseScene } from '../BaseScene.js';

export class BaseForensicMinigame extends BaseScene {
  constructor(sceneKey = 'BaseForensicMinigame') {
    super(sceneKey);

    this.evidenceType = 'generic';
    this.correctValue = null;
    this.evidenceConfig = {};
    this.clueType = 'forensic';
    this.clueText = '';
    this.cityId = null;
    this.caseKey = null;

    this.onComplete = null;
    this.onAbort = null;
    this.gameState = null;
    this.stationId = null;

    this.score = 100;
    this.maxScore = 120;
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

    this.titleText = null;
    this.subtitleText = null;
    this.instructionsText = null;
    this.instructionsBg = null;
    this.dialogueText = null;
    this.dialogueBg = null;
    this.scoreText = null;
    this.timerText = null;
    this.progressGroup = null;

    this.hudBg = null;
    this.playArea = null;
    this.playAreaBg = null;
    this.exitButton = null;
  }

  init(data = {}) {
    this.evidenceConfig = data.evidenceConfig || {};

    this.evidenceType =
      data.evidenceType ||
      this.evidenceConfig.evidenceType ||
      'generic';

    this.correctValue =
      data.correctValue ??
      this.evidenceConfig.correctValue ??
      null;

    this.clueType =
      data.clueType ||
      this.evidenceConfig.clueType ||
      'forensic';

    this.clueText =
      data.clueText ||
      this.evidenceConfig.clueText ||
      '';

    this.cityId = data.cityId || null;
    this.caseKey = data.caseKey || null;

    this.onComplete = data.onComplete || null;
    this.onAbort = data.onAbort || null;
    this.gameState = data.gameState || null;
    this.stationId = data.stationId || null;

    this.score = data.startScore ?? 100;
    this.maxScore = data.maxScore ?? 120;
    this.mistakes = 0;
    this.resolved = false;
    this.selectedValue = null;

    this.optionButtons = [];
    this.stageObjects = [];
    this.progressNodes = [];
    this.currentStep = 0;
    this.totalSteps = data.totalSteps ?? 3;

    this.secondsElapsed = 0;
    this.timerEvent = null;

    this.hudBg = null;
    this.instructionsBg = null;
    this.dialogueBg = null;
    this.exitButton = null;

    console.log('[BaseForensicMinigame] Initialized:', {
      scene: this.scene.key,
      stationId: this.stationId,
      cityId: this.cityId,
      caseKey: this.caseKey,
      evidenceType: this.evidenceType,
      correctValue: this.correctValue,
      clueType: this.clueType,
      clueText: this.clueText,
      evidenceConfig: this.evidenceConfig
    });
  }

  create() {
    super.create();

    this.createBackdrop();
    this.createHeader();
    this.createFrame();
    this.createFooter();
    this.createExitButton();
    this.startTimer();
    this.startEvidenceFlow();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  createExitButton() {
    const { width } = this.scale;

    this.exitButton = this.add.text(width - 24, 18, 'X', {
      fontFamily: 'PressStart2P',
      fontSize: '12px',
      color: '#ff6666',
      backgroundColor: '#200808',
      padding: {
        left: 6,
        right: 6,
        top: 4,
        bottom: 4
      }
    })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(999)
      .setInteractive({ useHandCursor: true });

    this.exitButton.on('pointerover', () => {
      this.exitButton.setStyle({
        color: '#ffaaaa'
      });
    });

    this.exitButton.on('pointerout', () => {
      this.exitButton.setStyle({
        color: '#ff6666'
      });
    });

    this.exitButton.on('pointerdown', () => {
      this.abortMinigame();
    });
  }

  abortMinigame() {
    if (this.resolved) return;

    if (this.timerEvent) {
      this.timerEvent.remove(false);
      this.timerEvent = null;
    }

    const payload = {
      aborted: true,
      completed: false,

      stationId: this.stationId,
      cityId: this.cityId,
      caseKey: this.caseKey,

      evidenceConfig: this.evidenceConfig,
      evidenceType: this.evidenceType,
      correctValue: this.correctValue,
      clueType: this.clueType,
      clueText: this.clueText,

      value: this.selectedValue,
      selectedValue: this.selectedValue,
      score: this.score,
      mistakes: this.mistakes,
      secondsElapsed: this.secondsElapsed
    };

    if (typeof this.onAbort === 'function') {
      this.onAbort(payload);
    }

    this.events.emit('minigame-closed', payload);
    this.scene.stop();
  }

  createBackdrop() {
    const { width, height } = this.scale;

    this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x07110d,
      0.96
    ).setDepth(-10);

    for (let i = 0; i < 12; i++) {
      const x = 40 + i * 64;

      this.add.rectangle(x, 0, 2, height, 0x113225, 0.15)
        .setOrigin(0.5, 0)
        .setDepth(-9);
    }

    this.add.rectangle(
      width / 2,
      height / 2,
      width - 40,
      height - 40,
      0x0d1713,
      0.92
    )
      .setStrokeStyle(2, 0x39ff14, 0.45)
      .setDepth(-8);
  }

  createHeader() {
    const { width } = this.scale;

    this.hudBg = this.add.rectangle(
      width / 2,
      58,
      width,
      112,
      0x000000,
      0.78
    )
      .setOrigin(0.5)
      .setDepth(100);

    this.titleText = this.add.text(28, 24, this.getTitle(), {
      fontFamily: 'PressStart2P',
      fontSize: '14px',
      color: '#39ff14'
    })
      .setOrigin(0, 0.5)
      .setDepth(110);

    this.subtitleText = this.add.text(28, 46, this.getSubtitle(), {
      fontFamily: 'SpecialElite',
      fontSize: '17px',
      color: '#d5e6dc'
    })
      .setOrigin(0, 0.5)
      .setDepth(110);

    this.instructionsBg = this.add.rectangle(
      28,
      78,
      width - 250,
      38,
      0x07110d,
      0.97
    )
      .setOrigin(0, 0.5)
      .setDepth(109);

    this.instructionsText = this.add.text(38, 78, '', {
      fontFamily: 'SpecialElite',
      fontSize: '15px',
      color: '#ffe8a3',
      align: 'left',
      wordWrap: {
        width: width - 275
      }
    })
      .setOrigin(0, 0.5)
      .setDepth(110);

    this.progressGroup = this.add.container(0, 0).setDepth(110);

    const startX = width / 2 - ((this.totalSteps - 1) * 90) / 2;

    for (let i = 0; i < this.totalSteps; i++) {
      const circle = this.add.circle(
        startX + i * 90,
        116,
        12,
        0x20362c,
        1
      ).setStrokeStyle(2, 0x5f8f78);

      const label = this.add.text(circle.x, circle.y, String(i + 1), {
        fontFamily: 'PressStart2P',
        fontSize: '10px',
        color: '#b8cfc2'
      }).setOrigin(0.5);

      this.progressNodes.push({ circle, label });
      this.progressGroup.add([circle, label]);

      if (i < this.totalSteps - 1) {
        const line = this.add.rectangle(
          startX + 45 + i * 90,
          116,
          50,
          3,
          0x375c4b,
          1
        );

        this.progressGroup.add(line);
      }
    }

    this.setStep(0);
  }

  createFrame() {
    const { width, height } = this.scale;

    this.playArea = this.add.container(0, 0).setDepth(-1);

    this.playAreaBg = this.add.rectangle(
      width / 2,
      320,
      700,
      300,
      0x122019,
      0.95
    ).setStrokeStyle(2, 0x5da17f, 0.7);

    this.playArea.add(this.playAreaBg);

    this.dialogueBg = this.add.rectangle(
      width / 2,
      height - 92,
      width - 100,
      66,
      0x07110d,
      0.97
    )
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x39ff14, 0.8)
      .setDepth(120);

    this.dialogueText = this.add.text(width / 2, height - 92, '', {
      fontFamily: 'SpecialElite',
      fontSize: '18px',
      color: '#f3f3f3',
      align: 'center',
      wordWrap: {
        width: width - 140
      }
    })
      .setOrigin(0.5)
      .setDepth(121);
  }

  createFooter() {
    const { width, height } = this.scale;

    this.scoreText = this.add.text(40, height - 36, 'Score: 100', {
      fontFamily: 'PressStart2P',
      fontSize: '10px',
      color: '#ffcc00',
      backgroundColor: '#07110d',
      padding: {
        left: 6,
        right: 6,
        top: 4,
        bottom: 4
      }
    }).setDepth(130);

    this.timerText = this.add.text(width - 40, height - 36, 'Time: 00', {
      fontFamily: 'PressStart2P',
      fontSize: '10px',
      color: '#ffcc00',
      backgroundColor: '#07110d',
      padding: {
        left: 6,
        right: 6,
        top: 4,
        bottom: 4
      }
    })
      .setOrigin(1, 0)
      .setDepth(130);

    this.setScore(this.score);
  }

  startTimer() {
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.secondsElapsed += 1;

        if (this.timerText) {
          this.timerText.setText(
            `Time: ${String(this.secondsElapsed).padStart(2, '0')}`
          );
        }
      }
    });
  }

  startEvidenceFlow() {
    if (typeof this.createEvidenceFlow === 'function') {
      this.createEvidenceFlow();
      return;
    }

    this.setInstructions('Evidence flow not implemented.');
    this.setDialogue('Missing minigame implementation.');
  }

  clearStage() {
    this.destroyOptionButtons();

    this.stageObjects.forEach((obj) => {
      if (!obj) return;

      obj.removeAllListeners?.();
      obj.destroy?.();
    });

    this.stageObjects = [];
  }

  destroyOptionButtons() {
    this.optionButtons.forEach((button) => {
      if (!button) return;

      button.bg?.removeAllListeners?.();
      button.destroy?.();
    });

    this.optionButtons = [];
  }

  addStageObject(object) {
    if (!object) return object;

    this.stageObjects.push(object);
    return object;
  }

  setStep(stepIndex) {
    this.currentStep = Phaser.Math.Clamp(
      stepIndex,
      0,
      this.totalSteps
    );

    this.progressNodes.forEach((node, index) => {
      if (index < this.currentStep) {
        node.circle.setFillStyle(0x2ea866, 1);
        node.circle.setStrokeStyle(2, 0x8df7b4, 1);
        return;
      }

      if (index === this.currentStep && this.currentStep < this.totalSteps) {
        node.circle.setFillStyle(0x8d6f16, 1);
        node.circle.setStrokeStyle(2, 0xffcc00, 1);
        return;
      }

      node.circle.setFillStyle(0x20362c, 1);
      node.circle.setStrokeStyle(2, 0x5f8f78, 1);
    });
  }

  completeStep() {
    this.setStep(this.currentStep + 1);
  }

  buildOptions(values, ensureValue) {
    const unique = [...new Set(values)];

    if (ensureValue != null && !unique.includes(ensureValue)) {
      unique[0] = ensureValue;
    }

    return Phaser.Utils.Array.Shuffle(unique);
  }

  setInstructions(text) {
    this.instructionsText?.setText(text);
  }

  setDialogue(text) {
    this.dialogueText?.setText(text);
  }

  setScore(score) {
    this.score = Phaser.Math.Clamp(score, 0, this.maxScore);
    this.scoreText?.setText(`Score: ${this.score}`);
  }

  penalize(amount = 10) {
    this.mistakes += 1;
    this.setScore(this.score - amount);
  }

  reward(amount = 0) {
    this.setScore(this.score + amount);
  }

  applyTimeBonus() {
    let bonus = 0;

    if (this.secondsElapsed <= 15) {
      bonus = 20;
    } else if (this.secondsElapsed <= 30) {
      bonus = 10;
    }

    if (bonus > 0) {
      this.reward(bonus);
    }

    return bonus;
  }

  createButton(x, y, w, h, label, onClick, opts = {}) {
    const bgColor = opts.bgColor ?? 0x22382e;
    const borderColor = opts.borderColor ?? 0x7cc89f;
    const textColor = opts.textColor ?? '#ffffff';
    const fontFamily = opts.fontFamily || 'SpecialElite';
    const fontSize = opts.fontSize || '18px';
    const depth = opts.depth ?? 150;

    const container = this.add.container(x, y).setDepth(depth);

    const bg = this.add.rectangle(0, 0, w, h, bgColor, 1)
      .setStrokeStyle(2, borderColor, 1);

    const text = this.add.text(0, 0, label, {
      fontFamily,
      fontSize,
      color: textColor,
      align: 'center',
      wordWrap: {
        width: w - 16
      }
    }).setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => {
      if (this.resolved && !opts.allowAfterResolve) return;
      bg.setFillStyle(0x335244, 1);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(bgColor, 1);
    });

    bg.on('pointerdown', () => {
      if (this.resolved && !opts.allowAfterResolve) return;
      onClick();
    });

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
      padding: {
        left: 12,
        right: 12,
        top: 8,
        bottom: 8
      }
    }).setOrigin(0.5);

    return this.addStageObject(tag);
  }

  resolveChoice(value, isCorrect, penalty = 10) {
    if (this.resolved) return;

    if (!isCorrect) {
      this.penalize(penalty);
      this.flashWrongSelection(value);
      this.onWrongChoice(value);
      return;
    }

    this.resolved = true;
    this.selectedValue = value;

    if (this.timerEvent) {
      this.timerEvent.remove(false);
      this.timerEvent = null;
    }

    const timeBonus = this.applyTimeBonus();

    this.onCorrectChoice(value);

    this.setDialogue(
      this.getSuccessMessage(value, timeBonus)
    );

    const { width, height } = this.scale;

    return this.createButton(
      width / 2,
      height - 148,
      310,
      52,
      'ADD TO CASE FILE',
      () => this.finishMinigame(),
      {
        fontFamily: 'PressStart2P',
        fontSize: '11px',
        bgColor: 0x18452d,
        borderColor: 0x77ffb0,
        allowAfterResolve: true,
        depth: 150
      }
    );
  }

  onWrongChoice() {
    this.setDialogue(
      `RESULT REJECTED. ${this.getRetryHint()}`
    );
  }

  onCorrectChoice(value) {
    this.optionButtons.forEach((button) => {
      const label = button.text?.text;

      if (
        label === this.toDisplayText(value) ||
        label === value ||
        label === this.getSexDisplay(value)
      ) {
        button.bg.setFillStyle(0x176136, 1);
        button.bg.setStrokeStyle(2, 0x77ffb0, 1);
      }

      button.bg.disableInteractive();
    });
  }

  flashWrongSelection(value) {
    const candidates = this.optionButtons.filter((button) => {
      const label = button.text?.text;

      return (
        label === this.toDisplayText(value) ||
        label === value ||
        label === this.getSexDisplay(value)
      );
    });

    candidates.forEach((button) => {
      button.bg.setFillStyle(0x6b1f1f, 1);

      this.time.delayedCall(220, () => {
        if (button?.bg && !this.resolved) {
          button.bg.setFillStyle(0x22382e, 1);
        }
      });
    });
  }

  getResultPayload() {
    return {
      aborted: false,
      completed: this.resolved,

      stationId: this.stationId,
      cityId: this.cityId,
      caseKey: this.caseKey,

      evidenceConfig: this.evidenceConfig,
      evidenceType: this.evidenceType,
      correctValue: this.correctValue,
      clueType: this.clueType,
      clueText: this.clueText,

      value: this.selectedValue,
      selectedValue: this.selectedValue,

      score: this.score,
      mistakes: this.mistakes,
      secondsElapsed: this.secondsElapsed
    };
  }

  finishMinigame() {
    if (!this.resolved) return;

    const payload = this.getResultPayload();

    console.log('[BaseForensicMinigame] Completing:', payload);

    if (typeof this.onComplete === 'function') {
      this.onComplete(payload);
    }

    this.events.emit('minigame-complete', payload);

    this.events.emit('minigame-closed', {
      aborted: false,
      payload
    });

    this.scene.stop();
  }

  cleanup() {
    this.timerEvent?.remove(false);
    this.timerEvent = null;

    this.destroyOptionButtons();

    this.stageObjects.forEach((object) => {
      if (!object) return;

      object.removeAllListeners?.();
      object.destroy?.();
    });

    this.stageObjects = [];

    this.exitButton?.removeAllListeners?.();
    this.exitButton?.destroy?.();
    this.exitButton = null;

    this.hudBg?.destroy?.();
    this.hudBg = null;

    this.instructionsBg?.destroy?.();
    this.instructionsBg = null;

    this.dialogueBg?.destroy?.();
    this.dialogueBg = null;

    this.progressGroup?.destroy?.();
    this.progressGroup = null;

    this.titleText?.destroy?.();
    this.subtitleText?.destroy?.();
    this.instructionsText?.destroy?.();
    this.dialogueText?.destroy?.();
    this.scoreText?.destroy?.();
    this.timerText?.destroy?.();

    this.titleText = null;
    this.subtitleText = null;
    this.instructionsText = null;
    this.dialogueText = null;
    this.scoreText = null;
    this.timerText = null;

    this.playArea?.destroy?.();
    this.playArea = null;
    this.playAreaBg = null;
    this.progressNodes = [];
  }

  getTitle() {
    return 'FORENSIC ANALYSIS';
  }

  getSubtitle() {
    return 'Evidence Analysis';
  }

  getRetryHint() {
    return 'Review the evidence and try again.';
  }

  getSuccessMessage(value, timeBonus = 0) {
    const bonusText = timeBonus > 0
      ? ` Speed bonus: +${timeBonus} points.`
      : '';

    return (
      `MATCH CONFIRMED: ${this.toDisplayText(value).toUpperCase()}. `
      + `CSI has added the result to the case file.${bonusText}`
    );
  }

  toDisplayText(value) {
    if (value === null || value === undefined) {
      return 'Unknown';
    }

    if (typeof value !== 'string') {
      return String(value);
    }

    return value
      .split('_')
      .map((part) => (
        part.charAt(0).toUpperCase() + part.slice(1)
      ))
      .join(' ');
  }

  getSexDisplay(value) {
    const map = {
      M: 'Male',
      F: 'Female',
      NB: 'Non-binary'
    };

    return map[value] || value;
  }
}