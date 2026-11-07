import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';

import {
  COURT_CONFIG,
  buildCourtFacts,
  createCourtRecord,
  answerCourtQuestion,
  advanceCourt,
  validCourt
} from '../systems/courtRapport.js';

import {
  currentChase,
  persistChase
} from '../systems/chasePersistence.js';

const WIDTH = 1920;
const HEIGHT = 1080;
const BG_KEY = 'courtroom';

const sameId = (a, b) =>
  a != null &&
  b != null &&
  String(a) === String(b);

export class CourtScene extends BaseScene {
  constructor() {
    super({ key: 'CourtScene' });
  }

  init(data = {}) {
    this.requestedSuspectId =
      data.suspectId ?? gameState.finalArrestSuspectId;

    this.record = null;
    this.root = null;
    this.notice = null;
    this.buttons = [];

    this.busy = false;
    this.inputLockUntil = 0;

    this.infoTimer = null;
    this.infoText = null;

    this.hintModal = null;
    this.hintButton = null;

    this.keyHandler = null;
    this.pageHideHandler = null;
    this.visibilityHandler = null;
    this.resizeHandler = null;

    this.loadErrorHandler = null;
    this.backgroundFailed = false;
  }

  preload() {
    this.loadErrorHandler = file => {
      if (file.key !== BG_KEY) return;

      this.backgroundFailed = true;

      console.error(
        '[CourtScene] Background failed to load:',
        file.src
      );
    };

    this.load.on(
      'loaderror',
      this.loadErrorHandler
    );

    if (!this.textures.exists(BG_KEY)) {
      this.load.image(
        BG_KEY,
        'assets/local/courtroom.webp'
      );
    }
  }

  create() {
    super.create();

    if (this.loadErrorHandler) {
      this.load.off(
        'loaderror',
        this.loadErrorHandler
      );
    }

    EventBus.emit('hideHUD');

    for (const key of [
      'PlayerHudScene',
      'UIScene',
      'NewsHud'
    ]) {
      const scene = this.getRegisteredScene(key);

      scene?.closeAllUIPanels?.();
      scene?.hideHud?.();

      if (scene) {
        this.scene.setVisible(false, key);
      }
    }

    audioManager.init(this);
    audioManager.stopAllMusic();
    audioManager.stopAllNonMusic();

    try {
      this.restoreOrCreateRecord();
    } catch (error) {
      console.error(
        '[CourtScene] Setup failed:',
        error
      );

      this.add.text(
        60,
        60,
        error.message,
        {
          fontFamily: 'SpecialElite, monospace',
          fontSize: '26px',
          color: '#ffffff',
          wordWrap: {
            width: Math.max(
              200,
              this.scale.width - 120
            )
          }
        }
      );

      return;
    }

    this.cameras.main.setBackgroundColor(
      '#12100e'
    );

    this.root = this.add.container();

    this.fitRoot();
    this.drawCourtroom();
    this.createInterface();
    this.createOverlays();

    this.registerControls();
    this.registerLifecycle();

    this.save();
    this.render();
  }

  restoreOrCreateRecord() {
    const saved = gameState.courtState;

    const belongsToThisTrial =
      saved != null &&
      sameId(
        saved.caseId,
        gameState.currentCaseId
      ) &&
      saved.campaignId === gameState._createdAt &&
      sameId(
        saved.suspectId,
        this.requestedSuspectId
      );

    if (belongsToThisTrial) {
      if (
        !validCourt(
          saved,
          gameState,
          this.requestedSuspectId
        )
      ) {
        throw new Error(
          'This trial save is incompatible or inconsistent. ' +
          'It has not been reset or overwritten. ' +
          'Load a save from before the trial.'
        );
      }

      this.record = structuredClone(saved);
      return;
    }

    const facts = buildCourtFacts(
      gameState,
      this.requestedSuspectId
    );

    if (!facts.warrantMatches) {
      throw new Error(
        'A matching arrest warrant is required ' +
        'to begin this trial.'
      );
    }

    this.record = createCourtRecord(facts);
  }

  fitRoot() {
    if (!this.root) return;

    const scale = Math.min(
      this.scale.width / WIDTH,
      this.scale.height / HEIGHT
    );

    this.root.setScale(scale);

    this.root.setPosition(
      (this.scale.width - WIDTH * scale) / 2,
      (this.scale.height - HEIGHT * scale) / 2
    );
  }

  rect(
    x,
    y,
    width,
    height,
    color,
    alpha = 1
  ) {
    const object = this.add.rectangle(
      x,
      y,
      width,
      height,
      color,
      alpha
    );

    this.root.add(object);

    return object;
  }

  text(
    x,
    y,
    value,
    size = 24,
    color = '#f7e6bc',
    width = 1600
  ) {
    const object = this.add.text(
      x,
      y,
      value,
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: `${size}px`,
        color,
        align: 'center',
        wordWrap: { width },
        lineSpacing: 5
      }
    ).setOrigin(0.5);

    this.root.add(object);

    return object;
  }

  drawCourtroom() {
    if (this.textures.exists(BG_KEY)) {
      this.root.add(
        this.add.image(
          960,
          540,
          BG_KEY
        ).setDisplaySize(
          WIDTH,
          HEIGHT
        )
      );
    } else {
      this.backgroundFailed = true;

      this.rect(
        960, 540,
        WIDTH, HEIGHT,
        0x29251f
      );

      this.rect(
        960, 245,
        520, 200,
        0x65462c
      );

      this.rect(
        350, 290,
        480, 180,
        0x4c3424
      );

      this.rect(
        1570, 290,
        480, 180,
        0x4c3424
      );
    }

    this.rect(
      960, 57,
      WIDTH, 114,
      0x15110e,
      0.9
    );
  }

  createInterface() {
    this.heading = this.text(
      760,
      35,
      'COURT HEARING',
      28,
      '#ffe3a0',
      1390
    );

    this.defendantText = this.text(
      760,
      78,
      `Defendant: ${this.record.facts.defendantName}`,
      22,
      '#f7e6bc',
      1390
    );

    this.createTrustMeter();

    this.rect(
      960,
      595,
      1780,
      180,
      0x1c1510,
      0.96
    ).setStrokeStyle(
      2,
      0x9b8052
    );

    this.questionText = this.text(
      960,
      595,
      '',
      27,
      '#f7e6bc',
      1680
    );

    this.buttons = [
      this.makeAnswer(500, 775, 0),
      this.makeAnswer(1420, 775, 1),
      this.makeAnswer(500, 945, 2),
      this.makeAnswer(1420, 945, 3)
    ];

    this.notice = this.text(
      960,
      1050,
      '',
      18,
      '#ffb28d',
      1770
    );

    this.text(
      1650,
      96,
      '1–4: answer | Enter: continue',
      15,
      '#d5c5a3',
      500
    );

    this.createHintButton();
  }

  createHintButton() {
    const background = this.rect(
      1780,
      38,
      190,
      48,
      0x302218,
      1
    )
      .setStrokeStyle(2, 0xc7ad73)
      .setInteractive({
        useHandCursor: true
      });

    this.text(
      1780,
      38,
      'HINT [H]',
      22,
      '#ffe3a0',
      170
    );

    background.on('pointerover', () => {
      if (this.busy || this.hintModal) return;

      background.setFillStyle(0x62472d);
    });

    background.on('pointerout', () => {
      background.setFillStyle(0x302218);
    });

    background.on('pointerdown', () => {
      this.openHint();
    });

    this.hintButton = background;
  }

  createTrustMeter() {
    this.rect(
      1650,
      275,
      420,
      310,
      0x18130f,
      0.92
    ).setStrokeStyle(
      2,
      0x9b8052
    );

    this.text(
      1650,
      145,
      "JUDGE'S CONFIDENCE",
      20,
      '#ffe3a0',
      390
    );

    this.meter = this.add.graphics();
    this.root.add(this.meter);

    this.trustValue = this.text(
      1650,
      323,
      '',
      30,
      '#ffe3a0',
      350
    );

    this.text(
      1650,
      366,
      `Conviction threshold: ${COURT_CONFIG.convictionThreshold}`,
      18,
      '#d5c5a3',
      390
    );

    const bonus =
      this.record.facts.courtRapportBonus ?? 0;

    const rapport =
      this.record.facts.courtRapport;

    this.rapportText = this.text(
      1650,
      402,
      rapport === undefined
        ? 'Rapport bonus: +0 (existing trial)'
        : `Rapport ${rapport} | Starting bonus +${bonus}`,
      18,
      '#98d6b0',
      390
    );
  }

  drawTrustMeter() {
    const graphics = this.meter;
    if (!graphics) return;

    const cx = 1650;
    const cy = 308;
    const radius = 135;

    const point = (value, r = radius) => {
      const angle =
        Math.PI + Math.PI * value / 100;

      return {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r
      };
    };

    graphics.clear();

    for (let value = 0; value < 100; value++) {
      const a = point(value);
      const b = point(value + 1);

      const color =
        value < 35
          ? 0xb96150
          : value < COURT_CONFIG.convictionThreshold
            ? 0xd1aa56
            : 0x79b68a;

      graphics.lineStyle(18, color, 1);
      graphics.lineBetween(
        a.x, a.y,
        b.x, b.y
      );
    }

    for (
      let value = 0;
      value <= 100;
      value += 10
    ) {
      const a = point(value, radius - 15);
      const b = point(value, radius + 12);

      graphics.lineStyle(
        2,
        0xf6e6c0,
        0.8
      );

      graphics.lineBetween(
        a.x, a.y,
        b.x, b.y
      );
    }

    const threshold =
      COURT_CONFIG.convictionThreshold;

    const markA = point(
      threshold,
      radius - 23
    );

    const markB = point(
      threshold,
      radius + 17
    );

    graphics.lineStyle(
      5,
      0xffffff,
      1
    );

    graphics.lineBetween(
      markA.x, markA.y,
      markB.x, markB.y
    );

    const value = Phaser.Math.Clamp(
      this.record.trust,
      0,
      100
    );

    const needle = point(
      value,
      radius - 28
    );

    graphics.lineStyle(
      5,
      0xffefb5,
      1
    );

    graphics.lineBetween(
      cx, cy,
      needle.x, needle.y
    );

    graphics.fillStyle(
      0xffefb5,
      1
    );

    graphics.fillCircle(cx, cy, 8);

    this.trustValue.setText(
      `${value}/100`
    );
  }

  makeAnswer(x, y, index) {
    const root = this.add.container(x, y);

    const bg = this.add.rectangle(
      0,
      0,
      850,
      145,
      0x302218,
      0.98
    )
      .setStrokeStyle(2, 0xc7ad73)
      .setInteractive({
        useHandCursor: true
      });

    const label = this.add.text(
      0,
      0,
      '',
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '23px',
        color: '#f7e6bc',
        align: 'center',
        wordWrap: { width: 790 },
        lineSpacing: 4
      }
    ).setOrigin(0.5);

    root.add([bg, label]);
    this.root.add(root);

    bg.on('pointerdown', () => {
      this.press(index);
    });

    bg.on('pointerover', () => {
      if (!this.busy && !this.hintModal) {
        bg.setFillStyle(0x62472d);
      }
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x302218);
    });

    return { root, bg, label };
  }

  createOverlays() {
    this.infoText = this.text(
      760,
      415,
      '',
      20,
      '#ffe3a0',
      1250
    )
      .setBackgroundColor('#1a1410')
      .setPadding(12, 8)
      .setVisible(false);

    if (this.backgroundFailed) {
      this.showInfo(
        'Courtroom background unavailable. ' +
        'Check assets/local/courtroom.webp.'
      );
    }
  }

  showInfo(message) {
    this.infoTimer?.remove(false);

    this.infoText
      ?.setText(message)
      .setVisible(true);

    this.infoTimer = this.time.delayedCall(
      5000,
      () => {
        this.infoTimer = null;
        this.infoText?.setVisible(false);
      }
    );
  }

  getHintText() {
    const record = this.record;

    if (!record) {
      return 'No trial is currently available.';
    }

    if (record.phase === 'feedback') {
      return (
        'Read the assessment of your testimony before continuing.\n\n' +
        'Distinguish what the evidence proves from what you merely ' +
        'suspect. Confidence is useful. Inventing evidence is less useful.\n\n' +
        'Close this note, then choose CONTINUE.'
      );
    }

    if (record.phase === 'verdict') {
      return (
        'The court has reached its verdict.\n\n' +
        'Close this note and use the large button below the verdict ' +
        'to finish the trial.\n\n' +
        'You cannot change your testimony at this stage.'
      );
    }

    if (record.phase !== 'question') {
      return (
        'This trial stage is unavailable.\n\n' +
        'Do not overwrite your save if an error is displayed.'
      );
    }

    const question =
      record.questions[record.index];

    const introduction =
      question?.side === 'defense'
        ? (
          'The defence is testing your conclusions.\n\n' +
          'Look for the difference between a supported fact, ' +
          'an assumption and a procedural mistake.'
        )
        : (
          'The prosecution is examining your case.\n\n' +
          'Answer the question using the facts established ' +
          'during your investigation.'
        );

    return (
      introduction +
      '\n\nRead all four answers before choosing. ' +
      'A dramatic claim is not automatically a proven claim.' +
      '\n\nThe confidence meter shows how convincing your ' +
      'testimony has been. This hint does not select an answer ' +
      'or change your confidence score.' +
      '\n\nCourtroom tip: “Trust me, I am the protagonist” ' +
      'is not evidence.'
    );
  }

  openHint() {
    if (
      this.busy ||
      this.hintModal ||
      !this.record ||
      !this.root ||
      this._cleanupDone
    ) {
      return;
    }

    const modal = this.add.container(0, 0);
    this.root.add(modal);

    this.hintModal = modal;
    this.hintButton?.setFillStyle(0x302218);

    const shade = this.add.rectangle(
      960,
      540,
      WIDTH,
      HEIGHT,
      0x000000,
      0.78
    ).setInteractive();

    const panel = this.add.rectangle(
      960,
      540,
      1120,
      700,
      0x211810,
      1
    )
      .setStrokeStyle(3, 0xc7ad73)
      .setInteractive();

    const heading = this.add.text(
      960,
      245,
      'COURTROOM HINT',
      {
        fontFamily: 'PressStart2P, monospace',
        fontSize: '22px',
        color: '#ffe3a0',
        align: 'center'
      }
    ).setOrigin(0.5);

    const body = this.add.text(
      960,
      520,
      this.getHintText(),
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '25px',
        color: '#f7e6bc',
        align: 'center',
        wordWrap: { width: 980 },
        lineSpacing: 9
      }
    ).setOrigin(0.5);

    const closeBg = this.add.rectangle(
      960,
      820,
      350,
      62,
      0x302218,
      1
    )
      .setStrokeStyle(2, 0xc7ad73)
      .setInteractive({
        useHandCursor: true
      });

    const closeLabel = this.add.text(
      960,
      820,
      'BACK TO COURT / ESC',
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '24px',
        color: '#ffe3a0'
      }
    ).setOrigin(0.5);

    modal.add([
      shade,
      panel,
      heading,
      body,
      closeBg,
      closeLabel
    ]);

    shade.on('pointerdown', () => {
      this.closeHint();
    });

    closeBg.on('pointerdown', () => {
      this.closeHint();
    });

    closeBg.on('pointerover', () => {
      closeBg.setFillStyle(0x62472d);
    });

    closeBg.on('pointerout', () => {
      closeBg.setFillStyle(0x302218);
    });
  }

  closeHint() {
    const modal = this.hintModal;

    this.hintModal = null;
    modal?.destroy(true);

    this.inputLockUntil =
      this.time.now + 200;
  }

  registerControls() {
    const keyboard = this.input.keyboard;

    if (!keyboard) return;

    this.keyHandler = event => {
      this.onKey(event);
    };

    keyboard.on(
      'keydown',
      this.keyHandler
    );
  }

  onKey(event) {
    const target = event.target;

    if (
      target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT']
        .includes(target?.tagName) ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.repeat
    ) {
      return;
    }

    if (this.hintModal) {
      if (
        event.code === 'Escape' ||
        event.code === 'KeyH'
      ) {
        this.closeHint();
      }

      return;
    }

    if (event.code === 'KeyH') {
      this.openHint();
      return;
    }

    const match = event.code.match(
      /^(?:Digit|Numpad)([1-4])$/
    );

    if (match) {
      this.press(
        Number(match[1]) - 1
      );

      return;
    }

    if (
      event.code === 'Enter' ||
      event.code === 'NumpadEnter'
    ) {
      if (this.record?.phase !== 'question') {
        this.press(0);
      }
    }
  }

  registerLifecycle() {
    this.pageHideHandler = () => {
      if (!this.busy) this.save();
    };

    this.visibilityHandler = () => {
      if (document.hidden && !this.busy) {
        this.save();
      }
    };

    this.resizeHandler = () => {
      this.fitRoot();
    };

    window.addEventListener(
      'pagehide',
      this.pageHideHandler
    );

    document.addEventListener(
      'visibilitychange',
      this.visibilityHandler
    );

    this.scale.on(
      'resize',
      this.resizeHandler
    );

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      () => {
        window.removeEventListener(
          'pagehide',
          this.pageHideHandler
        );

        document.removeEventListener(
          'visibilitychange',
          this.visibilityHandler
        );

        this.scale.off(
          'resize',
          this.resizeHandler
        );

        if (this.keyHandler) {
          this.input.keyboard?.off(
            'keydown',
            this.keyHandler
          );
        }

        if (this.loadErrorHandler) {
          this.load.off(
            'loaderror',
            this.loadErrorHandler
          );
        }

        this.infoTimer?.remove(false);
        this.infoTimer = null;

        this.hintModal?.destroy(true);
        this.hintModal = null;
      }
    );
  }

  save() {
    if (!this.record) return false;

    try {
      gameState.courtState =
        structuredClone(this.record);

      const chase = currentChase();

      const matchingChase =
        chase &&
        chase.campaignId ===
          this.record.campaignId &&
        sameId(
          chase.caseId,
          this.record.caseId
        ) &&
        sameId(
          chase.suspectId,
          this.record.suspectId
        );

      let saved;

      if (matchingChase) {
        const checkpoint =
          structuredClone(chase);

        checkpoint.phase = 'review';
        checkpoint.terminalScene = 'CourtScene';

        saved = persistChase(checkpoint);
      } else {
        saved = saveGameState();
      }

      if (saved !== true) {
        this.notice?.setText(
          'Trial save failed. Keep this tab open.'
        );

        return false;
      }

      this.notice?.setText('');
      return true;
    } catch (error) {
      console.error(
        '[CourtScene] Save failed:',
        error
      );

      this.notice?.setText(
        'Trial save failed. Keep this tab open.'
      );

      return false;
    }
  }

  render() {
    const record = this.record;

    if (!record) return;

    this.drawTrustMeter();

    if (record.phase === 'question') {
      const current =
        record.questions[record.index];

      if (
        !current ||
        current.answers?.length !== 4
      ) {
        this.showRenderError();
        return;
      }

      this.heading.setText(
        current.side === 'prosecutor'
          ? 'PROSECUTION EXAMINATION'
          : 'DEFENCE CROSS-EXAMINATION'
      );

      this.questionText.setText(
        current.text
      );

      this.buttons.forEach(
        (button, index) => {
          button.root
            .setPosition(
              index % 2 === 0
                ? 500
                : 1420,
              index < 2
                ? 775
                : 945
            )
            .setVisible(true);

          button.bg.setFillStyle(
            0x302218
          );

          button.label.setText(
            `${index + 1}. ` +
            current.answers[index].text
          );
        }
      );
    } else {
      this.buttons.forEach(button => {
        button.root.setVisible(false);
      });

      const button = this.buttons[0];

      button.root
        .setPosition(960, 835)
        .setVisible(true);

      button.bg.setFillStyle(
        0x302218
      );

      if (record.phase === 'feedback') {
        this.heading.setText(
          'TESTIMONY ASSESSED'
        );

        this.questionText.setText(
          record.feedback
        );

        button.label.setText(
          'CONTINUE / ENTER'
        );
      } else if (
        record.phase === 'verdict'
      ) {
        const convicted =
          record.verdict === 'convicted';

        this.heading.setText(
          'VERDICT'
        );

        this.questionText.setText(
          convicted
            ? (
              'The court finds the defendant guilty.\n' +
              'The defendant is convicted.'
            )
            : (
              'The prosecution has not established the case.\n' +
              'The defendant is released.'
            )
        );

        button.label.setText(
          convicted
            ? 'CLOSE CASE / ENTER'
            : 'GAME OVER / ENTER'
        );
      } else {
        this.showRenderError();
        return;
      }
    }

    this.inputLockUntil =
      this.time.now + 200;
  }

  showRenderError() {
    this.busy = true;
    this.closeHint();

    this.buttons.forEach(button => {
      button.root.setVisible(false);
    });

    this.heading.setText(
      'TRIAL SAVE ERROR'
    );

    this.questionText.setText(
      'This stage of the trial cannot be displayed.\n' +
      'Do not overwrite your saved game.'
    );

    this.notice?.setText(
      'Invalid question data or trial phase.'
    );
  }

  press(index) {
    const record = this.record;

    if (
      !record ||
      this.busy ||
      this.hintModal ||
      this.time.now < this.inputLockUntil
    ) {
      return;
    }

    if (record.phase === 'question') {
      if (
        answerCourtQuestion(record, index)
      ) {
        this.save();
        this.render();
      }

      return;
    }

    if (index !== 0) return;

    if (record.phase === 'feedback') {
      if (advanceCourt(record)) {
        this.save();
        this.render();
      }

      return;
    }

    if (record.phase === 'verdict') {
      void this.finish();
    }
  }

  applyVerdictToGameState() {
    const record = this.record;

    const convicted =
      record.verdict === 'convicted';

    gameState.finalArrestSuspectId =
      record.suspectId;

    gameState.finalArrestResult =
      convicted ? 'SUCCESS' : 'FAILURE';

    gameState.caseResolved = convicted;
    gameState.caseFailed = !convicted;
    gameState.isGameActive = false;

    gameState.gameOverReason = convicted
      ? ''
      : (
        'The court released the defendant. ' +
        'The prosecution failed to establish the case.'
      );
  }

  async finish() {
    const record = this.record;

    if (
      this.busy ||
      this.hintModal ||
      !record ||
      record.phase !== 'verdict'
    ) {
      return;
    }

    if (
      !validCourt(
        record,
        gameState,
        this.requestedSuspectId
      )
    ) {
      this.notice?.setText(
        'The verdict cannot be committed: ' +
        'inconsistent trial data.'
      );

      return;
    }

    this.busy = true;

    const convicted =
      record.verdict === 'convicted';

    try {
      this.applyVerdictToGameState();

      record.resultCommitted = true;

      if (!this.save()) {
        this.busy = false;

        this.notice?.setText(
          'Verdict save failed. ' +
          'Press Enter to retry.'
        );

        return;
      }

      const opened = await this.goto(
        convicted
          ? 'SuccessScene'
          : 'GameOverScene',
        {
          caseId: record.caseId,
          suspectId: record.suspectId,
          title: convicted
            ? 'CONVICTED'
            : 'DEFENDANT RELEASED',
          reasonCode: convicted
            ? 'court_conviction'
            : 'court_release',
          message:
            gameState.gameOverReason
        }
      );

      if (
        !opened &&
        !this._cleanupDone
      ) {
        this.busy = false;

        this.notice?.setText(
          'Could not open the result screen. ' +
          'Press Enter to retry.'
        );
      }
    } catch (error) {
      console.error(
        '[CourtScene] Finish failed:',
        error
      );

      if (!this._cleanupDone) {
        this.busy = false;

        this.notice?.setText(
          'Could not finish the trial. ' +
          'Press Enter to retry.'
        );
      }
    }
  }
}