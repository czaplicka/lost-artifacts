export default class BaseForensicMinigame extends Phaser.Scene {
  constructor(sceneKey = 'BaseForensicMinigame') {
    super(sceneKey);

    this.evidenceType = 'generic';
    this.correctValue = null;
    this.onComplete = null;
    this.gameState = null;
    this.stationId = null;

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

    this.titleText = null;
    this.subtitleText = null;
    this.instructionsText = null;
    this.dialogueText = null;
    this.scoreText = null;
    this.timerText = null;
    this.progressGroup = null;

    this.playArea = null;
    this.playAreaBg = null;
  }

  init(data) {
    this.evidenceType = data?.evidenceType || 'generic';
    this.correctValue = data?.correctValue ?? null;
    this.onComplete = data?.onComplete || null;
    this.gameState = data?.gameState || null;
    this.stationId = data?.stationId || null;

    this.score = data?.startScore ?? 100;
    this.mistakes = 0;
    this.resolved = false;
    this.selectedValue = null;

    this.optionButtons = [];
    this.stageObjects = [];
    this.progressNodes = [];
    this.currentStep = 0;
    this.totalSteps = data?.totalSteps ?? 3;

    this.secondsElapsed = 0;
    this.timerEvent = null;
  }

  create() {
    this.createBackdrop();
    this.createHeader();
    this.createFrame();
    this.createFooter();
    this.startTimer();
    this.startEvidenceFlow();
      this.createExitButton();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);

  }
createExitButton() {
  const { width } = this.scale;

  const btn = this.add.text(width - 24, 18, 'X', {
    fontFamily: 'PressStart2P',
    fontSize: '12px',
    color: '#ff6666',
    backgroundColor: '#200808',
    padding: { left: 6, right: 6, top: 4, bottom: 4 }
  })
    .setOrigin(1, 0)
    .setScrollFactor(0)
    .setDepth(999)
    .setInteractive({ useHandCursor: true });

  btn.on('pointerover', () => btn.setStyle({ color: '#ffaaaa' }));
  btn.on('pointerout', () => btn.setStyle({ color: '#ff6666' }));
  btn.on('pointerdown', () => {
    this.abortMinigame();
  });

  this.stageObjects.push(btn);
}
abortMinigame() {
  if (this.timerEvent) {
    this.timerEvent.remove(false);
    this.timerEvent = null;
  }

  // jeśli chcesz sygnalizować „przerwano” do CrimeLabScene:
  this.events.emit('minigame-closed', { aborted: true });

  this.scene.stop();
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

  // tło HUD
  const hudBg = this.add.rectangle(width / 2, 64, width, 96, 0x000000, 0.55)
    .setOrigin(0.5)
    .setDepth(9);
  this.stageObjects.push(hudBg || hudBg); // jeśli chcesz śledzić, możesz dorzucić do stageObjects

  this.titleText = this.add.text(width / 2, 36, this.getTitle(), {
    fontFamily: 'PressStart2P',
    fontSize: '14px',
    color: '#39ff14'
  }).setOrigin(0.5).setDepth(10);

  this.subtitleText = this.add.text(width / 2, 56, this.getSubtitle(), {
    fontFamily: 'SpecialElite',
    fontSize: '18px',
    color: '#d5e6dc'
  }).setOrigin(0.5).setDepth(10);

  this.instructionsText = this.add.text(width / 2, 82, '', {
    fontFamily: 'SpecialElite',
    fontSize: '18px',
    color: '#ffe8a3',
    align: 'center',
    wordWrap: { width: width - 120 }
  }).setOrigin(0.5).setDepth(10);

    this.progressGroup = this.add.container(0, 0);
    const startX = width / 2 - ((this.totalSteps - 1) * 90) / 2;

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

this.dialogueText = this.add.text(width / 2, height - 96, '', {
  fontFamily: 'SpecialElite',
  fontSize: '20px',
  color: '#f3f3f3',
  align: 'center',
  wordWrap: { width: width - 120 }
}).setOrigin(0.5).setDepth(10);

const dialogueBg = this.add.rectangle(width / 2, height - 96, width, 80, 0x000000, 0.55)
  .setOrigin(0.5)
  .setDepth(9);
this.stageObjects.push(dialogueBg);
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
        if (this.timerText) {
          this.timerText.setText(`Time: ${String(this.secondsElapsed).padStart(2, '0')}`);
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
    this.optionButtons.forEach(btn => {
      if (!btn) return;
      if (btn.bg) btn.bg.removeAllListeners();
      if (btn.bg) btn.bg.destroy();
      if (btn.text) btn.text.destroy();
      btn.destroy();
    });
    this.optionButtons = [];

    this.stageObjects.forEach(obj => {
      if (!obj) return;
      if (obj.removeAllListeners) obj.removeAllListeners();
      if (obj.destroy) obj.destroy();
    });
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
buildOptions(values, ensureValue) {
  const unique = [...new Set(values)];
  if (ensureValue != null && !unique.includes(ensureValue)) {
    // wrzuć poprawną wartość na pierwsze miejsce
    unique[0] = ensureValue;
  }
  return Phaser.Utils.Array.Shuffle(unique);
}
  setInstructions(text) {
    if (this.instructionsText) this.instructionsText.setText(text);
  }

  setDialogue(text) {
    if (this.dialogueText) this.dialogueText.setText(text);
  }

  setScore(score) {
    this.score = Math.max(0, score);
    if (this.scoreText) this.scoreText.setText(`Score: ${this.score}`);
  }

  penalize(amount = 10) {
    this.mistakes += 1;
    this.setScore(this.score - amount);
  }

  createButton(x, y, w, h, label, onClick, opts = {}) {
    const bgColor = opts.bgColor ?? 0x22382e;
    const borderColor = opts.borderColor ?? 0x7cc89f;
    const textColor = opts.textColor ?? '#ffffff';
    const fontFamily = opts.fontFamily || 'SpecialElite';
    const fontSize = opts.fontSize || '18px';

    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, w, h, bgColor, 1).setStrokeStyle(2, borderColor, 1);
    const text = this.add.text(0, 0, label, {
      fontFamily,
      fontSize,
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

  resolveChoice(value, isCorrect, penalty = 10) {
    if (this.resolved) return;

    if (!isCorrect) {
      this.penalize(penalty);
      this.onWrongChoice(value);
      return;
    }

    this.resolved = true;
    this.selectedValue = value;

    if (this.timerEvent) {
      this.timerEvent.remove(false);
      this.timerEvent = null;
    }

    this.onCorrectChoice(value);

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

  onWrongChoice() {
    this.setDialogue(`Result rejected. ${this.getRetryHint()}`);
  }

  onCorrectChoice(value) {
    this.optionButtons.forEach(btn => {
      const label = btn.text?.text;
      if (label === this.toDisplayText(value) || label === value || label === this.getSexDisplay(value)) {
        btn.bg.setFillStyle(0x176136, 1);
        btn.bg.setStrokeStyle(2, 0x77ffb0, 1);
      }
      btn.bg.disableInteractive();
    });
  }

  flashWrongSelection(value) {
    const candidates = this.optionButtons.filter(btn => {
      const label = btn.text?.text;
      return label === this.toDisplayText(value) || label === value || label === this.getSexDisplay(value);
    });

    candidates.forEach(btn => {
      btn.bg.setFillStyle(0x6b1f1f, 1);
      this.time.delayedCall(220, () => {
        if (btn?.bg) btn.bg.setFillStyle(0x22382e, 1);
      });
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

  cleanup() {
    if (this.timerEvent) {
      this.timerEvent.remove(false);
      this.timerEvent = null;
    }

    this.optionButtons.forEach(btn => {
      if (!btn) return;
      if (btn.bg) {
        btn.bg.removeAllListeners();
        btn.bg.destroy();
      }
      if (btn.text) btn.text.destroy();
      if (btn.destroy) btn.destroy();
    });
    this.optionButtons = [];

    this.stageObjects.forEach(obj => {
      if (!obj) return;
      if (obj.removeAllListeners) obj.removeAllListeners();
      if (obj.destroy) obj.destroy();
    });
    this.stageObjects = [];

    if (this.progressGroup) {
      this.progressGroup.destroy();
      this.progressGroup = null;
    }

    if (this.titleText) this.titleText.destroy();
    if (this.subtitleText) this.subtitleText.destroy();
    if (this.instructionsText) this.instructionsText.destroy();
    if (this.dialogueText) this.dialogueText.destroy();
    if (this.scoreText) this.scoreText.destroy();
    if (this.timerText) this.timerText.destroy();

    this.titleText = null;
    this.subtitleText = null;
    this.instructionsText = null;
    this.dialogueText = null;
    this.scoreText = null;
    this.timerText = null;
    this.playArea = null;
    this.playAreaBg = null;
  }

  getTitle() {
    return 'FORENSIC IDENTITY ANALYSIS';
  }

  getSubtitle() {
    return 'Evidence Analysis';
  }

  getRetryHint() {
    return 'Review the evidence and try again.';
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
}