import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';
import { progressionManager } from '../managers/ProgressionManager.js';

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

import { paginateCourtText } from '../systems/courtTextPages.js';

const WIDTH = 1920;
const HEIGHT = 1080;
const BG_KEY = 'courtroom';
const XP_REWARD_ID = 'court_won';

const sameId = (a, b) =>
  a != null && b != null && String(a) === String(b);

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
    this.pageIndex = 0;
    this.pageCount = 1;
    this.questionPages = [''];
    this.answerPages = [];
    this.hintPage = 0;
    this.hintPages = [''];
  }

  preload() {
    this.loadErrorHandler = file => {
      if (file.key === BG_KEY) {
        this.backgroundFailed = true;

        console.error(
          '[CourtScene] Background failed:',
          file.src
        );
      }
    };

    this.load.on('loaderror', this.loadErrorHandler);

    if (!this.textures.exists(BG_KEY)) {
      this.load.image(
        BG_KEY,
        'assets/local/courtroom.webp'
      );
    }
  }

  create() {
    super.create();

    this.load.off('loaderror', this.loadErrorHandler);
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
      console.error('[CourtScene] Setup:', error);

      this.add.text(60, 60, error.message, {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '26px',
        color: '#ffffff',
        wordWrap: {
          width: Math.max(200, this.scale.width - 120)
        }
      });

      return;
    }

    this.cameras.main.setBackgroundColor('#12100e');

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

    const belongs =
      saved &&
      sameId(saved.caseId, gameState.currentCaseId) &&
      saved.campaignId === gameState._createdAt &&
      sameId(saved.suspectId, this.requestedSuspectId);

    if (belongs) {
      if (
        !validCourt(
          saved,
          gameState,
          this.requestedSuspectId
        )
      ) {
        throw new Error(
          'This trial save is inconsistent. It has not been reset or overwritten. Load a save from before the trial.'
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
        'A matching arrest warrant is required to begin this trial.'
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

    this.root.setScale(scale).setPosition(
      (this.scale.width - WIDTH * scale) / 2,
      (this.scale.height - HEIGHT * scale) / 2
    );
  }

  rect(x, y, width, height, color, alpha = 1) {
    const object = this.add.rectangle(
      x, y, width, height, color, alpha
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
    const object = this.add.text(x, y, value, {
      fontFamily: 'SpecialElite, monospace',
      fontSize: `${size}px`,
      color,
      align: 'center',
      wordWrap: {
        width,
        useAdvancedWrap: true
      },
      lineSpacing: 5
    }).setOrigin(0.5);

    this.root.add(object);
    return object;
  }

  drawCourtroom() {
    if (this.textures.exists(BG_KEY)) {
      this.root.add(
        this.add.image(960, 540, BG_KEY)
          .setDisplaySize(WIDTH, HEIGHT)
      );
    } else {
      this.backgroundFailed = true;

      this.rect(960, 540, WIDTH, HEIGHT, 0x29251f);
      this.rect(960, 245, 520, 200, 0x65462c);
      this.rect(350, 290, 480, 180, 0x4c3424);
      this.rect(1570, 290, 480, 180, 0x4c3424);
    }

    this.rect(960, 57, WIDTH, 114, 0x15110e, 0.9);
  }

  smallButton(
    parent,
    x,
    y,
    width,
    height,
    label,
    callback,
    size = 20
  ) {
    const root = this.add.container(x, y);

    const bg = this.add.rectangle(
      0, 0, width, height, 0x302218, 1
    )
      .setStrokeStyle(2, 0xc7ad73)
      .setInteractive({ useHandCursor: true });

    const words = this.add.text(0, 0, label, {
      fontFamily: 'SpecialElite, monospace',
      fontSize: `${size}px`,
      color: '#ffe3a0',
      align: 'center',
      wordWrap: {
        width: width - 16,
        useAdvancedWrap: true
      }
    }).setOrigin(0.5);

    root.add([bg, words]);
    parent.add(root);

    bg.on('pointerover', () => {
      if (bg.input?.enabled) {
        bg.setFillStyle(0x62472d);
      }
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x302218);
    });

    bg.on('pointerdown', () => {
      if (bg.input?.enabled) {
        callback();
      }
    });

    return { root, bg, label: words };
  }

  enableButton(button, enabled) {
    if (!button) return;

    button.root.setAlpha(enabled ? 1 : 0.4);

    if (button.bg.input) {
      button.bg.input.enabled = Boolean(enabled);
    }
  }

  createInterface() {
    this.heading = this.text(
      760, 35,
      __dialogueText("scenes/CourtScene.js", "t_b9273ae8082e2173c68e"),
      28, '#ffe3a0', 1390
    );

    this.defendantText = this.text(
      760, 78,
      `${__dialogueText("scenes/CourtScene.js", "t_24f7715cc455bf61a556")}${this.record.facts.defendantName}`,
      22, '#f7e6bc', 1390
    );

    this.createTrustMeter();

    this.rect(
      960, 595, 1780, 180,
      0x1c1510, 0.96
    ).setStrokeStyle(2, 0x9b8052);

    this.questionText = this.text(
      960, 595, '', 27, '#f7e6bc', 1680
    );

    this.buttons = [
      this.makeAnswer(500, 775, 0),
      this.makeAnswer(1420, 775, 1),
      this.makeAnswer(500, 945, 2),
      this.makeAnswer(1420, 945, 3)
    ];

    this.notice = this.text(
      960, 1050, '', 18, '#ffb28d', 1770
    );

    this.text(
      1650, 96,
      __dialogueText("scenes/CourtScene.js", "t_be3d3e7be90cc6e357db"),
      14, '#d5c5a3', 530
    );

    this.hintButton = this.smallButton(
      this.root,
      1780, 38, 190, 48,
      __dialogueText("scenes/CourtScene.js", "t_091dd40e60f2e9b59368"),
      () => this.openHint(),
      22
    ).bg;

    this.previousPage = this.smallButton(
      this.root,
      680, 470, 220, 42,
      __dialogueText("scenes/CourtScene.js", "t_cf47bf01ca2d4be9a7af"),
      () => this.changePage(-1),
      18
    );

    this.nextPage = this.smallButton(
      this.root,
      1240, 470, 220, 42,
      __dialogueText("scenes/CourtScene.js", "t_22730864a426b31fa91a"),
      () => this.changePage(1),
      18
    );

    this.pageLabel = this.text(
      960, 470, '', 19, '#ffe3a0', 300
    );
  }

  createTrustMeter() {
    this.rect(
      1650, 275, 420, 310,
      0x18130f, 0.92
    ).setStrokeStyle(2, 0x9b8052);

    this.text(
      1650, 145,
      __dialogueText("scenes/CourtScene.js", "t_576e5b6d3fd66512ba0f"),
      20, '#ffe3a0', 390
    );

    this.meter = this.add.graphics();
    this.root.add(this.meter);

    this.trustValue = this.text(
      1650, 323, '', 30, '#ffe3a0', 350
    );

    this.text(
      1650, 366,
      `${__dialogueText("scenes/CourtScene.js", "t_9d7f2b2874f5f861b9ab")}${COURT_CONFIG.convictionThreshold}`,
      18, '#d5c5a3', 390
    );

    const bonus =
      this.record.facts.courtRapportBonus ?? 0;

    const rapport = this.record.facts.courtRapport;

    this.rapportText = this.text(
      1650, 402,
      rapport === undefined
        ? __dialogueText("scenes/CourtScene.js", "t_93c534eea402e6c1b932")
        : `${__dialogueText("scenes/CourtScene.js", "t_37a7768eccdc0419d750")}${rapport}${__dialogueText("scenes/CourtScene.js", "t_b55cd8d99aaa449e79f1")}${bonus}`,
      18, '#98d6b0', 390
    );
  }

  drawTrustMeter() {
    const graphics = this.meter;
    if (!graphics) return;

    const cx = 1650;
    const cy = 308;
    const radius = 135;

    const point = (value, r = radius) => ({
      x: cx + Math.cos(
        Math.PI + Math.PI * value / 100
      ) * r,
      y: cy + Math.sin(
        Math.PI + Math.PI * value / 100
      ) * r
    });

    graphics.clear();

    for (let value = 0; value < 100; value++) {
      const a = point(value);
      const b = point(value + 1);

      const color = value < 35
        ? 0xb96150
        : value < COURT_CONFIG.convictionThreshold
          ? 0xd1aa56
          : 0x79b68a;

      graphics.lineStyle(18, color, 1);
      graphics.lineBetween(a.x, a.y, b.x, b.y);
    }

    for (let value = 0; value <= 100; value += 10) {
      const a = point(value, radius - 15);
      const b = point(value, radius + 12);

      graphics.lineStyle(2, 0xf6e6c0, 0.8);
      graphics.lineBetween(a.x, a.y, b.x, b.y);
    }

    const thresholdA = point(
      COURT_CONFIG.convictionThreshold,
      radius - 23
    );

    const thresholdB = point(
      COURT_CONFIG.convictionThreshold,
      radius + 17
    );

    graphics.lineStyle(5, 0xffffff, 1);

    graphics.lineBetween(
      thresholdA.x,
      thresholdA.y,
      thresholdB.x,
      thresholdB.y
    );

    const value = Phaser.Math.Clamp(
      this.record.trust, 0, 100
    );

    const needle = point(value, radius - 28);

    graphics.lineStyle(5, 0xffefb5, 1);
    graphics.lineBetween(cx, cy, needle.x, needle.y);
    graphics.fillStyle(0xffefb5, 1);
    graphics.fillCircle(cx, cy, 8);

    this.trustValue.setText(`${value}${__dialogueText("scenes/CourtScene.js", "t_2f07766fd476de0ab959")}`);
  }

  makeAnswer(x, y, index) {
    const root = this.add.container(x, y);

    const bg = this.add.rectangle(
      0, 0, 850, 145, 0x302218, 0.98
    )
      .setStrokeStyle(2, 0xc7ad73)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(0, 0, '', {
      fontFamily: 'SpecialElite, monospace',
      fontSize: '23px',
      color: '#f7e6bc',
      align: 'center',
      wordWrap: {
        width: 790,
        useAdvancedWrap: true
      },
      lineSpacing: 4
    }).setOrigin(0.5);

    root.add([bg, label]);
    this.root.add(root);

    bg.on('pointerdown', () => this.press(index));

    bg.on('pointerover', () => {
      if (
        !this.busy &&
        !this.hintModal &&
        bg.input?.enabled
      ) {
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
      760, 415, '', 20, '#ffe3a0', 1250
    )
      .setBackgroundColor('#1a1410')
      .setPadding(12, 8)
      .setVisible(false);

    if (this.backgroundFailed) {
      this.showInfo(
        __dialogueText("scenes/CourtScene.js", "t_968cbc9e0f433d8d92e6")
      );
    }
  }

  showInfo(message) {
    this.infoTimer?.remove(false);
    this.infoText?.setText(message).setVisible(true);

    this.infoTimer = this.time.delayedCall(
      5000,
      () => {
        this.infoTimer = null;
        this.infoText?.setVisible(false);
      }
    );
  }

  measuredPages(target, value, maxHeight) {
    return paginateCourtText(
      value,
      candidate => {
        target.setText(candidate);
        return target.height;
      },
      maxHeight
    );
  }

  render() {
    const record = this.record;
    if (!record) return;

    this.drawTrustMeter();
    this.pageIndex = 0;
    this.answerPages = [];

    try {
      if (record.phase === 'question') {
        const question = record.questions[record.index];

        if (
          !question ||
          question.answers?.length !== 4
        ) {
          this.showRenderError();
          return;
        }

        this.heading.setText(
          `${question.side === __dialogueText("scenes/CourtScene.js", "t_5b6e4c26a352100e1252") ? __dialogueText("scenes/CourtScene.js", "t_5ae131912dad5af8ebe5") : __dialogueText("scenes/CourtScene.js", "t_9f3bed01ba593455014c")}${__dialogueText("scenes/CourtScene.js", "t_3b2e8119b6fcc97df985")}${record.index + 1}${__dialogueText("scenes/CourtScene.js", "t_8a5edab282632443219e")}${record.questions.length}`
        );

        this.questionPages = this.measuredPages(
          this.questionText,
          question.text,
          158
        );

        this.answerPages = question.answers.map(
          (answer, index) => this.measuredPages(
            this.buttons[index].label,
            `${index + 1}. ${answer.text}`,
            125
          )
        );

        this.buttons.forEach((button, index) => {
          button.root
            .setPosition(
              index % 2 === 0 ? 500 : 1420,
              index < 2 ? 775 : 945
            )
            .setVisible(true);
        });
      } else {
        this.buttons.forEach(
          button => button.root.setVisible(false)
        );

        this.buttons[0].root
          .setPosition(960, 835)
          .setVisible(true);

        if (record.phase === 'feedback') {
          this.heading.setText(__dialogueText("scenes/CourtScene.js", "t_fe2ed2b3a64b2f8c2b78"));

          this.questionPages = this.measuredPages(
            this.questionText,
            record.feedback,
            158
          );

          this.answerPages = [[__dialogueText("scenes/CourtScene.js", "t_4dda5b3688460481be8d")]];
        } else if (record.phase === 'verdict') {
          const convicted =
            record.verdict === 'convicted';

          this.heading.setText(__dialogueText("scenes/CourtScene.js", "t_b5a12b170c05f093fd1c"));

          const result = convicted
            ? __dialogueText("scenes/CourtScene.js", "t_f54758ef7109892cc2e9")
            : __dialogueText("scenes/CourtScene.js", "t_36e4fe0854e8b64decbe");

          this.questionPages = this.measuredPages(
            this.questionText,
            result + (
              record.verdictExplanation
                ? `\n\n${record.verdictExplanation}`
                : ''
            ),
            158
          );

          this.answerPages = [[
            convicted
              ? __dialogueText("scenes/CourtScene.js", "t_056680b1b366e9e15a76")
              : __dialogueText("scenes/CourtScene.js", "t_010008e310e8969f0576")
          ]];
        } else {
          this.showRenderError();
          return;
        }
      }

      this.pageCount = Math.max(
        this.questionPages.length,
        ...this.answerPages.map(pages => pages.length),
        1
      );

      this.renderPage();
    } catch (error) {
      console.error('[CourtScene] Layout:', error);
      this.showRenderError();
    }
  }

  renderPage() {
    if (!this.record) return;

    const last =
      this.pageIndex === this.pageCount - 1;

    this.questionText.setText(
      this.questionPages[
        Math.min(
          this.pageIndex,
          this.questionPages.length - 1
        )
      ]
    );

    this.buttons.forEach((button, index) => {
      const pages = this.answerPages[index];
      if (!pages) return;

      button.label.setText(
        pages[Math.min(this.pageIndex, pages.length - 1)]
      );

      button.bg.setFillStyle(0x302218);
      this.enableButton(button, last);
    });

    const multiple = this.pageCount > 1;

    this.previousPage.root.setVisible(multiple);
    this.nextPage.root.setVisible(multiple);

    this.pageLabel
      .setVisible(multiple)
      .setText(
        `${__dialogueText("scenes/CourtScene.js", "t_f8119b8ecd8507346fa7")}${this.pageIndex + 1}${__dialogueText("scenes/CourtScene.js", "t_005e1574a2b5c8163046")}${this.pageCount}`
      );

    this.enableButton(
      this.previousPage,
      this.pageIndex > 0
    );

    this.enableButton(this.nextPage, !last);

    this.inputLockUntil = this.time.now + 200;
  }

  changePage(delta) {
    if (
      this.busy ||
      this.hintModal ||
      this.time.now < this.inputLockUntil
    ) {
      return;
    }

    const next = Math.max(
      0,
      Math.min(
        this.pageCount - 1,
        this.pageIndex + delta
      )
    );

    if (next !== this.pageIndex) {
      this.pageIndex = next;
      this.renderPage();
    }
  }

  getHintText() {
    const record = this.record;

    if (!record) {
      return __dialogueText("scenes/CourtScene.js", "t_e468a6490d8927ab57bd");
    }

    if (record.phase === 'verdict') {
      return __dialogueText("scenes/CourtScene.js", "t_755ced30b78b89dca953");
    }

    if (record.phase === 'feedback') {
      return __dialogueText("scenes/CourtScene.js", "t_96bd535d525726cd0d46");
    }

    if (record.version === 3) {
      return __dialogueText("scenes/CourtScene.js", "t_c7ee7257fcf272d8d60f");
    }

    return __dialogueText("scenes/CourtScene.js", "t_3f994287cc50aa77daec");
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
      960, 540, WIDTH, HEIGHT, 0x000000, 0.78
    ).setInteractive();

    const panel = this.add.rectangle(
      960, 540, 1120, 700, 0x211810, 1
    )
      .setStrokeStyle(3, 0xc7ad73)
      .setInteractive();

    const heading = this.add.text(
      960, 245,
      __dialogueText("scenes/CourtScene.js", "t_39d33596e45d31dc0142"),
      {
        fontFamily: 'PressStart2P, monospace',
        fontSize: '22px',
        color: '#ffe3a0',
        align: 'center'
      }
    ).setOrigin(0.5);

    this.hintBody = this.add.text(
      960, 520, '',
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '25px',
        color: '#f7e6bc',
        align: 'center',
        wordWrap: {
          width: 980,
          useAdvancedWrap: true
        },
        lineSpacing: 9
      }
    ).setOrigin(0.5);

    modal.add([
      shade,
      panel,
      heading,
      this.hintBody
    ]);

    this.smallButton(
      modal,
      960, 820, 350, 62,
      __dialogueText("scenes/CourtScene.js", "t_b2716190d148bce9dd48"),
      () => this.closeHint(),
      24
    );

    this.hintPrevious = this.smallButton(
      modal,
      650, 760, 220, 38,
      'PREVIOUS',
      () => this.turnHintPage(-1),
      18
    );

    this.hintNext = this.smallButton(
      modal,
      1270, 760, 220, 38,
      'NEXT',
      () => this.turnHintPage(1),
      18
    );

    this.hintPageLabel = this.add.text(
      960, 760, '',
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '18px',
        color: '#ffe3a0'
      }
    ).setOrigin(0.5);

    modal.add(this.hintPageLabel);
    shade.on('pointerdown', () => this.closeHint());
    this.hintPage = 0;

    try {
      this.hintPages = this.measuredPages(
        this.hintBody,
        this.getHintText(),
        425
      );

      this.renderHintPage();
    } catch (error) {
      console.error('[CourtScene] Hint:', error);
      this.closeHint();
    }
  }

  renderHintPage() {
    if (!this.hintModal) return;

    this.hintBody.setText(
      this.hintPages[this.hintPage]
    );

    const more = this.hintPages.length > 1;

    this.hintPrevious.root.setVisible(more);
    this.hintNext.root.setVisible(more);

    this.hintPageLabel
      .setVisible(more)
      .setText(
        `${this.hintPage + 1}${__dialogueText("scenes/CourtScene.js", "t_005e1574a2b5c8163046")}${this.hintPages.length}`
      );

    this.enableButton(
      this.hintPrevious,
      this.hintPage > 0
    );

    this.enableButton(
      this.hintNext,
      this.hintPage < this.hintPages.length - 1
    );
  }

  turnHintPage(delta) {
    if (!this.hintModal) return;

    this.hintPage = Math.max(
      0,
      Math.min(
        this.hintPages.length - 1,
        this.hintPage + delta
      )
    );

    this.renderHintPage();
  }

  closeHint() {
    const modal = this.hintModal;
    this.hintModal = null;
    modal?.destroy(true);
    this.hintBody = null;
    this.inputLockUntil = this.time.now + 200;
  }

  registerControls() {
    if (this.input.keyboard) {
      this.keyHandler = event => this.onKey(event);

      this.input.keyboard.on(
        'keydown',
        this.keyHandler
      );
    }
  }

  onKey(event) {
    const target = event.target;

    if (
      target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        target?.tagName
      ) ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.repeat
    ) {
      return;
    }

    if (this.hintModal) {
      if ([__dialogueText("scenes/CourtScene.js", "t_037c968467aa3fd7c059"), 'KeyH'].includes(event.code)) {
        this.closeHint();
      } else if (
        ['ArrowRight', 'PageDown'].includes(event.code)
      ) {
        this.turnHintPage(1);
      } else if (
        ['ArrowLeft', 'PageUp'].includes(event.code)
      ) {
        this.turnHintPage(-1);
      }

      return;
    }

    if (event.code === 'KeyH') {
      this.openHint();
      return;
    }

    if ([
      'ArrowRight',
      'PageDown',
      'ArrowLeft',
      'PageUp'
    ].includes(event.code)) {
      event.preventDefault();

      this.changePage(
        ['ArrowRight', 'PageDown'].includes(event.code)
          ? 1
          : -1
      );

      return;
    }

    const match = event.code.match(
      /^(?:Digit|Numpad)([1-4])$/
    );

    if (match) {
      this.press(Number(match[1]) - 1);
      return;
    }

    if (
      [__dialogueText("scenes/CourtScene.js", "t_dc8659db6d416dc32fca"), 'NumpadEnter'].includes(event.code) &&
      this.record?.phase !== 'question'
    ) {
      this.press(0);
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

    this.resizeHandler = () => this.fitRoot();

    window.addEventListener(
      'pagehide',
      this.pageHideHandler
    );

    document.addEventListener(
      'visibilitychange',
      this.visibilityHandler
    );

    this.scale.on('resize', this.resizeHandler);

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

        this.scale.off('resize', this.resizeHandler);

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

      const matches =
        chase &&
        chase.campaignId === this.record.campaignId &&
        sameId(chase.caseId, this.record.caseId) &&
        sameId(chase.suspectId, this.record.suspectId);

      let saved;

      if (matches) {
        const checkpoint = structuredClone(chase);

        checkpoint.phase = 'review';
        checkpoint.terminalScene = 'CourtScene';

        saved = persistChase(checkpoint);
      } else {
        saved = saveGameState();
      }

      this.notice?.setText(
        saved === true
          ? ''
          : __dialogueText("scenes/CourtScene.js", "t_a946beff022d854c48a8")
      );

      return saved === true;
    } catch (error) {
      console.error('[CourtScene] Save:', error);

      this.notice?.setText(
        __dialogueText("scenes/CourtScene.js", "t_a946beff022d854c48a8")
      );

      return false;
    }
  }

  showRenderError() {
    this.busy = true;
    this.closeHint();

    this.buttons.forEach(
      button => button.root.setVisible(false)
    );

    this.previousPage?.root.setVisible(false);
    this.nextPage?.root.setVisible(false);
    this.pageLabel?.setVisible(false);

    this.heading.setText(__dialogueText("scenes/CourtScene.js", "t_29ade348e70b7fde88ff"));

    this.questionText.setText(
      __dialogueText("scenes/CourtScene.js", "t_768203c8619f0eab235e")
    );

    this.notice?.setText(
      __dialogueText("scenes/CourtScene.js", "t_d0810f3f6138cde6789c")
    );
  }

  press(index) {
    const record = this.record;

    if (
      !record ||
      this.busy ||
      this.hintModal ||
      this.time.now < this.inputLockUntil ||
      this.pageIndex !== this.pageCount - 1
    ) {
      return;
    }

    if (record.phase === 'question') {
      if (answerCourtQuestion(record, index)) {
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
    const convicted = record.verdict === 'convicted';

    gameState.finalArrestSuspectId = record.suspectId;
    gameState.finalArrestResult =
      convicted ? 'SUCCESS' : 'FAILURE';

    gameState.caseResolved = convicted;
    gameState.caseFailed = !convicted;
    gameState.isGameActive = false;

    gameState.gameOverReason = convicted
      ? ''
      : record.verdictExplanation ||
        __dialogueText("scenes/CourtScene.js", "t_e5b82991c30c36fdca1c");
  }

  grantConvictionXP() {
    const record = this.record;

    if (
      !record ||
      record.verdict !== 'convicted' ||
      record.resultCommitted
    ) {
      return;
    }

    const normalizeIdentity = value => {
      if (
        typeof value !== 'string' &&
        typeof value !== 'number'
      ) {
        return null;
      }

      if (
        typeof value === 'number' &&
        !Number.isFinite(value)
      ) {
        return null;
      }

      const identity = String(value).trim();
      return identity || null;
    };

    const campaignId = normalizeIdentity(
      record.campaignId
    );

    const caseId = normalizeIdentity(record.caseId);

    if (!campaignId || !caseId) {
      throw new Error(
        'Court XP requires a stable campaign ID and case ID.'
      );
    }

    const scopeId = JSON.stringify([
      'agency_court',
      campaignId,
      caseId
    ]);

    const eventId = JSON.stringify([
      'reward',
      XP_REWARD_ID,
      scopeId
    ]);

    let result;

    try {
      result = progressionManager.grantReward(
        XP_REWARD_ID,
        scopeId,
        __dialogueText("scenes/CourtScene.js", "t_e317899a7baff51deb61")
      );
    } catch (error) {
      if (!progressionManager.hasReward(eventId)) {
        throw error;
      }

      console.error(
        '[CourtScene] Reward recorded, but grantReward threw:',
        error
      );

      result = {
        success: false,
        reason: 'already_granted'
      };
    }

    if (
      !result.success &&
      result.reason !== 'already_granted'
    ) {
      throw new Error(
        `Court XP settlement failed: ${
          result.reason || 'unknown_error'
        }`
      );
    }

    if (!progressionManager.hasReward(eventId)) {
      throw new Error(
        'The court victory XP reward was not recorded.'
      );
    }
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
        __dialogueText("scenes/CourtScene.js", "t_0061bde06e56e89e6bf2")
      );

      return;
    }

    this.busy = true;

    const convicted =
      record.verdict === 'convicted';

    try {
      if (convicted && !record.resultCommitted) {
        try {
          this.grantConvictionXP();
        } catch (error) {
          console.error(
            '[CourtScene] XP settlement failed:',
            error
          );

          this.busy = false;

          this.notice?.setText(
            __dialogueText("scenes/CourtScene.js", "t_0a2fdabe9cb29d2011d1")
          );

          return;
        }
      }

      this.applyVerdictToGameState();
      record.resultCommitted = true;

      if (!this.save()) {
        this.busy = false;

        this.notice?.setText(
          __dialogueText("scenes/CourtScene.js", "t_c2d01ad716e68d42a338")
        );

        return;
      }

      const opened = await this.goto(
        convicted ? 'SuccessScene' : 'GameOverScene',
        {
          caseId: record.caseId,
          suspectId: record.suspectId,
          title: convicted
            ? __dialogueText("scenes/CourtScene.js", "t_4fc3901171364d578013")
            : __dialogueText("scenes/CourtScene.js", "t_92624f92e0a888fb966d"),
          reasonCode: convicted
            ? 'court_conviction'
            : 'court_release',
          message: gameState.gameOverReason
        }
      );

      if (!opened && !this._cleanupDone) {
        this.busy = false;

        this.notice?.setText(
          __dialogueText("scenes/CourtScene.js", "t_c4aba1f97a164694ab1c")
        );
      }
    } catch (error) {
      console.error('[CourtScene] Finish:', error);

      if (!this._cleanupDone) {
        this.busy = false;

        this.notice?.setText(
          __dialogueText("scenes/CourtScene.js", "t_61d0d405ead05c55d3df")
        );
      }
    }
  }
}