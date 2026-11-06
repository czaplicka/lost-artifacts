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

const LOCAL_DEBUG_ALLOWED =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

const sameId = (a, b) =>
  a != null && b != null && String(a) === String(b);

// Starting positions. Adjust them to your artwork with local debug.
const HOTSPOTS = [
  {
    id: 'judge',
    label: 'Judge',
    x: 960,
    y: 245,
    w: 330,
    h: 240,
    description:
      'Weighs your testimony, the evidence and any procedural failures.'
  },
  {
    id: 'prosecutor',
    label: 'Prosecutor',
    x: 350,
    y: 290,
    w: 380,
    h: 260,
    description:
      'Examines the case presented against the defendant.'
  },
  {
    id: 'defense',
    label: 'Defence',
    x: 1570,
    y: 290,
    w: 380,
    h: 260,
    description:
      'Challenges identification, unsupported conclusions and procedural breaches.'
  }
];

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
    this.hotspots = [];

    this.busy = false;
    this.inputLockUntil = 0;

    this.debugMode = false;
    this.selectedIndex = 0;
    this.hotspotConfig = HOTSPOTS.map(item => ({ ...item }));

    this.infoTimer = null;
    this.infoText = null;
    this.tooltip = null;
    this.debugText = null;
    this.loadErrorHandler = null;
    this.backgroundFailed = false;
  }

  preload() {
    this.loadErrorHandler = file => {
      if (file.key === BG_KEY) {
        this.backgroundFailed = true;
        console.error(
          '[CourtScene] Background failed to load:',
          file.src
        );
      }
    };

    this.load.on('loaderror', this.loadErrorHandler);

    if (!this.textures.exists(BG_KEY)) {
      this.load.image(BG_KEY, 'assets/local/courtroom.webp');
    }
  }

  create() {
    super.create();

    if (this.loadErrorHandler) {
      this.load.off('loaderror', this.loadErrorHandler);
    }

    EventBus.emit('hideHUD');

    for (const key of ['PlayerHudScene', 'UIScene', 'NewsHud']) {
      const scene = this.getRegisteredScene(key);

      scene?.closeAllUIPanels?.();
      scene?.hideHud?.();

      if (scene) this.scene.setVisible(false, key);
    }

    audioManager.init(this);
    audioManager.stopAllMusic();
    audioManager.stopAllNonMusic();

    try {
      this.restoreOrCreateRecord();
    } catch (error) {
      console.error('[CourtScene] Setup failed:', error);

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
    this.createHotspots();
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
      sameId(saved.caseId, gameState.currentCaseId) &&
      saved.campaignId === gameState._createdAt &&
      sameId(saved.suspectId, this.requestedSuspectId);

    if (belongsToThisTrial) {
      if (!validCourt(saved, gameState, this.requestedSuspectId)) {
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

    this.root.setScale(scale);

    this.root.setPosition(
      (this.scale.width - WIDTH * scale) / 2,
      (this.scale.height - HEIGHT * scale) / 2
    );
  }

  rect(x, y, w, h, color, alpha = 1) {
    const object = this.add.rectangle(
      x, y, w, h, color, alpha
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
      wordWrap: { width },
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

  createInterface() {
    this.heading = this.text(
      760, 35, 'COURT HEARING', 28, '#ffe3a0', 1390
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
      960, 595, 1780, 180, 0x1c1510, 0.96
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
      1640,
      92,
      LOCAL_DEBUG_ALLOWED
        ? '1–4: answer | Enter: continue | D: debug'
        : '1–4: answer | Enter: continue',
      15,
      '#d5c5a3',
      500
    );
  }

  createTrustMeter() {
    this.rect(
      1650, 275, 420, 310, 0x18130f, 0.92
    ).setStrokeStyle(2, 0x9b8052);

    this.text(
      1650, 145, "JUDGE'S CONFIDENCE",
      20, '#ffe3a0', 390
    );

    this.meter = this.add.graphics();
    this.root.add(this.meter);

    this.trustValue = this.text(
      1650, 323, '', 30, '#ffe3a0', 350
    );

    this.text(
      1650, 366,
      `Conviction threshold: ${COURT_CONFIG.convictionThreshold}`,
      18, '#d5c5a3', 390
    );

    const bonus = this.record.facts.courtRapportBonus ?? 0;
    const rapport = this.record.facts.courtRapport;

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
    const g = this.meter;
    if (!g) return;

    const cx = 1650;
    const cy = 308;
    const radius = 135;

    const point = (value, r = radius) => {
      const angle = Math.PI + Math.PI * value / 100;

      return {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r
      };
    };

    g.clear();

    // Draw in short segments to keep the semicircle orientation explicit.
    for (let value = 0; value < 100; value++) {
      const a = point(value);
      const b = point(value + 1);

      const color =
        value < 35 ? 0xb96150 :
        value < COURT_CONFIG.convictionThreshold ? 0xd1aa56 :
        0x79b68a;

      g.lineStyle(18, color, 1);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }

    for (let value = 0; value <= 100; value += 10) {
      const a = point(value, radius - 15);
      const b = point(value, radius + 12);

      g.lineStyle(2, 0xf6e6c0, 0.8);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }

    const threshold = COURT_CONFIG.convictionThreshold;
    const markA = point(threshold, radius - 23);
    const markB = point(threshold, radius + 17);

    g.lineStyle(5, 0xffffff, 1);
    g.lineBetween(markA.x, markA.y, markB.x, markB.y);

    const value = Phaser.Math.Clamp(this.record.trust, 0, 100);
    const needle = point(value, radius - 28);

    g.lineStyle(5, 0xffefb5, 1);
    g.lineBetween(cx, cy, needle.x, needle.y);

    g.fillStyle(0xffefb5, 1);
    g.fillCircle(cx, cy, 8);

    this.trustValue.setText(`${value}/100`);
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
      wordWrap: { width: 790 },
      lineSpacing: 4
    }).setOrigin(0.5);

    root.add([bg, label]);
    this.root.add(root);

    bg.on('pointerdown', () => this.press(index));

    bg.on('pointerover', () => {
      if (!this.busy && !this.debugMode) {
        bg.setFillStyle(0x62472d);
      }
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x302218);
    });

    return { root, bg, label };
  }

  createHotspots() {
    this.hotspots = this.hotspotConfig.map((cfg, index) => {
      const zone = this.add.zone(
        cfg.x, cfg.y, cfg.w, cfg.h
      )
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      const highlight = this.add.graphics();

      const label = this.add.text(0, 0, cfg.label, {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '19px',
        color: '#ffffff',
        backgroundColor: '#17120f',
        padding: { x: 8, y: 5 }
      }).setOrigin(0.5, 1).setVisible(false);

      this.root.add([zone, highlight, label]);

      const hs = {
        cfg,
        index,
        zone,
        highlight,
        label,
        hovered: false
      };

      zone.on('pointerover', () => {
        if (this.debugMode || this.busy) return;

        hs.hovered = true;
        this.drawHotspot(hs);

        this.tooltip?.setText(
          `${cfg.label}\n${cfg.description}`
        ).setVisible(true);
      });

      zone.on('pointerout', () => {
        hs.hovered = false;
        this.drawHotspot(hs);
        this.tooltip?.setVisible(false);
      });

      zone.on('pointerdown', () => {
        if (this.debugMode) {
          this.selectedIndex = index;
          this.updateDebug();
          return;
        }

        if (this.busy) return;

        if (cfg.id === 'judge') {
          this.showInfo(
            `Judge's confidence: ${this.record.trust}/100. ` +
            `Conviction threshold: ${COURT_CONFIG.convictionThreshold}.`
          );
          return;
        }

        const current = this.record.questions[this.record.index];

        const active =
          this.record.phase === 'question' &&
          current?.side === cfg.id;

        this.showInfo(
          `${cfg.label}: ${active ? 'Currently questioning you. ' : ''}` +
          cfg.description
        );
      });

      zone.on('drag', (pointer, x, y) => {
        if (!LOCAL_DEBUG_ALLOWED || !this.debugMode) return;

        cfg.x = Math.round(x);
        cfg.y = Math.round(y);

        this.selectedIndex = index;
        this.syncHotspot(hs);
        this.updateDebug();
      });

      this.syncHotspot(hs);
      return hs;
    });
  }

  syncHotspot(hs) {
    const { cfg, zone, label } = hs;

    zone.setPosition(cfg.x, cfg.y);
    zone.setSize(cfg.w, cfg.h);
    zone.input.hitArea.setTo(0, 0, cfg.w, cfg.h);

    label.setPosition(
      cfg.x,
      cfg.y - cfg.h / 2 - 8
    );

    this.drawHotspot(hs);
  }

  drawHotspot(hs) {
    const { cfg, highlight, label } = hs;

    const debugging = LOCAL_DEBUG_ALLOWED && this.debugMode;

    const current = this.record?.questions[this.record.index];

    const active = this.record?.phase === 'verdict'
      ? cfg.id === 'judge'
      : this.record?.phase === 'question' &&
        current?.side === cfg.id;

    highlight.clear();

    const visible = debugging || hs.hovered || active;

    if (visible) {
      const color = debugging
        ? hs.index === this.selectedIndex
          ? 0xff55dd
          : 0x00ff99
        : 0xffd166;

      highlight.fillStyle(
        color,
        debugging ? 0.15 : hs.hovered ? 0.12 : 0.04
      );

      highlight.fillRect(
        cfg.x - cfg.w / 2,
        cfg.y - cfg.h / 2,
        cfg.w,
        cfg.h
      );

      highlight.lineStyle(2, color, debugging ? 1 : 0.6);

      highlight.strokeRect(
        cfg.x - cfg.w / 2,
        cfg.y - cfg.h / 2,
        cfg.w,
        cfg.h
      );
    }

    highlight.setVisible(visible);
    label.setVisible(debugging || hs.hovered);
  }

  createOverlays() {
    this.tooltip = this.text(
      760, 460, '', 20, '#fff0c8', 1250
    )
      .setBackgroundColor('#1a1410')
      .setPadding(14, 10)
      .setVisible(false);

    this.infoText = this.text(
      760, 415, '', 20, '#ffe3a0', 1250
    )
      .setBackgroundColor('#1a1410')
      .setPadding(12, 8)
      .setVisible(false);

    this.debugText = this.text(
      960, 440, '', 18, '#9dffca', 1800
    )
      .setBackgroundColor('#101713')
      .setPadding(14, 10)
      .setVisible(false);

    if (this.backgroundFailed) {
      this.showInfo(
        'Courtroom background unavailable. Check assets/local/courtroom.webp.'
      );
    }
  }

  showInfo(message) {
    this.infoTimer?.remove(false);

    this.infoText?.setText(message).setVisible(true);

    this.infoTimer = this.time.delayedCall(5000, () => {
      this.infoText?.setVisible(false);
    });
  }

  registerControls() {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    this.keyHandler = event => this.onKey(event);
    keyboard.on('keydown', this.keyHandler);
  }

  onKey(event) {
    const target = event.target;

    if (
      target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }

    if (LOCAL_DEBUG_ALLOWED && event.code === 'KeyD') {
      if (!event.repeat) this.setDebugMode(!this.debugMode);
      return;
    }

    if (this.debugMode) {
      this.onDebugKey(event);
      return;
    }

    if (event.repeat) return;

    const match = event.code.match(/^(?:Digit|Numpad)([1-4])$/);

    if (match) {
      this.press(Number(match[1]) - 1);
    } else if (
      event.code === 'Enter' ||
      event.code === 'NumpadEnter'
    ) {
      if (this.record?.phase !== 'question') this.press(0);
    }
  }

  setDebugMode(enabled) {
    if (!LOCAL_DEBUG_ALLOWED) return;

    this.debugMode = Boolean(enabled);
    this.tooltip?.setVisible(false);
    this.infoText?.setVisible(false);

    for (const hs of this.hotspots) {
      hs.hovered = false;
      this.input.setDraggable(hs.zone, this.debugMode);
    }

    this.updateDebug();
  }

  onDebugKey(event) {
    if (!LOCAL_DEBUG_ALLOWED || !this.debugMode) return;

    if (event.code === 'KeyC') {
      if (!event.repeat) {
        console.log(
          'COPY INTO scenes/CourtScene.js -> HOTSPOTS:',
          JSON.stringify(this.hotspotConfig, null, 2)
        );
      }

      return;
    }

    if (event.code === 'Tab') {
      event.preventDefault();

      const direction = event.shiftKey ? -1 : 1;

      this.selectedIndex = (
        this.selectedIndex +
        direction +
        this.hotspots.length
      ) % this.hotspots.length;

      this.updateDebug();
      return;
    }

    if (![
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown'
    ].includes(event.code)) {
      return;
    }

    event.preventDefault();

    const hs = this.hotspots[this.selectedIndex];
    if (!hs) return;

    const horizontal =
      event.code === 'ArrowLeft' ||
      event.code === 'ArrowRight';

    const direction =
      event.code === 'ArrowLeft' ||
      event.code === 'ArrowUp'
        ? -1
        : 1;

    const field = event.shiftKey
      ? horizontal ? 'w' : 'h'
      : horizontal ? 'x' : 'y';

    hs.cfg[field] += direction * (event.altKey ? 1 : 5);
    hs.cfg.w = Math.max(10, hs.cfg.w);
    hs.cfg.h = Math.max(10, hs.cfg.h);

    this.syncHotspot(hs);
    this.updateDebug();
  }

  updateDebug() {
    for (const hs of this.hotspots) {
      this.drawHotspot(hs);
    }

    const cfg = this.hotspots[this.selectedIndex]?.cfg;

    this.debugText?.setVisible(this.debugMode).setText([
      `LOCAL COURT DEBUG: ${cfg?.id ?? 'none'}`,
      `x:${cfg?.x} y:${cfg?.y} w:${cfg?.w} h:${cfg?.h}`,
      'Drag / Arrows: move | Shift+Arrows: resize | Alt: 1px',
      'Tab / Shift+Tab: select | C: export to console | D: close',
      'Trial answers disabled. Coordinates use the 1920 × 1080 canvas.'
    ].join('\n'));
  }

  registerLifecycle() {
    this.pageHideHandler = () => {
      if (!this.busy) this.save();
    };

    this.visibilityHandler = () => {
      if (document.hidden && !this.busy) this.save();
    };

    this.resizeHandler = () => this.fitRoot();

    window.addEventListener('pagehide', this.pageHideHandler);
    document.addEventListener(
      'visibilitychange',
      this.visibilityHandler
    );

    this.scale.on('resize', this.resizeHandler);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener(
        'pagehide',
        this.pageHideHandler
      );

      document.removeEventListener(
        'visibilitychange',
        this.visibilityHandler
      );

      this.scale.off('resize', this.resizeHandler);

      this.input.keyboard?.off('keydown', this.keyHandler);
      this.load.off('loaderror', this.loadErrorHandler);

      this.infoTimer?.remove(false);
    });
  }

  save() {
    if (!this.record) return false;

    try {
      gameState.courtState = structuredClone(this.record);

      const chase = currentChase();

      const matchingChase =
        chase &&
        chase.campaignId === this.record.campaignId &&
        sameId(chase.caseId, this.record.caseId) &&
        sameId(chase.suspectId, this.record.suspectId);

      let saved;

      if (matchingChase) {
        const checkpoint = structuredClone(chase);

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
      console.error('[CourtScene] Save failed:', error);

      this.notice?.setText(
        'Trial save failed. Keep this tab open.'
      );

      return false;
    }
  }

  render() {
    const r = this.record;
    if (!r) return;

    this.drawTrustMeter();

    for (const hs of this.hotspots) {
      this.drawHotspot(hs);
    }

    if (r.phase === 'question') {
      const current = r.questions[r.index];

      if (!current || current.answers?.length !== 4) {
        this.showRenderError();
        return;
      }

      this.heading.setText(
        current.side === 'prosecutor'
          ? 'PROSECUTION EXAMINATION'
          : 'DEFENCE CROSS-EXAMINATION'
      );

      this.questionText.setText(current.text);

      this.buttons.forEach((button, index) => {
        button.root
          .setPosition(
            index % 2 === 0 ? 500 : 1420,
            index < 2 ? 775 : 945
          )
          .setVisible(true);

        button.bg.setFillStyle(0x302218);

        button.label.setText(
          `${index + 1}. ${current.answers[index].text}`
        );
      });
    } else {
      this.buttons.forEach(button => {
        button.root.setVisible(false);
      });

      const button = this.buttons[0];

      button.root.setPosition(960, 835).setVisible(true);
      button.bg.setFillStyle(0x302218);

      if (r.phase === 'feedback') {
        this.heading.setText('TESTIMONY ASSESSED');
        this.questionText.setText(r.feedback);
        button.label.setText('CONTINUE / ENTER');
      } else if (r.phase === 'verdict') {
        const convicted = r.verdict === 'convicted';

        this.heading.setText('VERDICT');

        this.questionText.setText(
          convicted
            ? 'The court finds the defendant guilty.\nThe defendant is convicted.'
            : 'The prosecution has not established the case.\nThe defendant is released.'
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

    this.inputLockUntil = this.time.now + 200;
  }

  showRenderError() {
    this.busy = true;

    this.buttons.forEach(button => {
      button.root.setVisible(false);
    });

    this.heading.setText('TRIAL SAVE ERROR');

    this.questionText.setText(
      'This stage of the trial cannot be displayed.\n' +
      'Do not overwrite your saved game.'
    );

    this.notice?.setText(
      'Invalid question data or trial phase.'
    );
  }

  press(index) {
    const r = this.record;

    if (
      !r ||
      this.busy ||
      this.debugMode ||
      this.time.now < this.inputLockUntil
    ) {
      return;
    }

    if (r.phase === 'question') {
      if (answerCourtQuestion(r, index)) {
        this.save();
        this.render();
      }

      return;
    }

    if (index !== 0) return;

    if (r.phase === 'feedback') {
      if (advanceCourt(r)) {
        this.save();
        this.render();
      }

      return;
    }

    if (r.phase === 'verdict') {
      void this.finish();
    }
  }

  applyVerdictToGameState() {
    const r = this.record;
    const convicted = r.verdict === 'convicted';

    gameState.finalArrestSuspectId = r.suspectId;
    gameState.finalArrestResult =
      convicted ? 'SUCCESS' : 'FAILURE';

    gameState.caseResolved = convicted;
    gameState.caseFailed = !convicted;
    gameState.isGameActive = false;

    gameState.gameOverReason = convicted
      ? ''
      : 'The court released the defendant. The prosecution failed to establish the case.';
  }

  async finish() {
    const r = this.record;

    if (
      this.busy ||
      this.debugMode ||
      !r ||
      r.phase !== 'verdict'
    ) {
      return;
    }

    if (!validCourt(r, gameState, this.requestedSuspectId)) {
      this.notice?.setText(
        'The verdict cannot be committed: inconsistent trial data.'
      );

      return;
    }

    this.busy = true;

    const convicted = r.verdict === 'convicted';

    try {
      this.applyVerdictToGameState();
      r.resultCommitted = true;

      if (!this.save()) {
        this.busy = false;

        this.notice?.setText(
          'Verdict save failed. Press Enter to retry.'
        );

        return;
      }

      const opened = await this.goto(
        convicted ? 'SuccessScene' : 'GameOverScene',
        {
          caseId: r.caseId,
          suspectId: r.suspectId,
          title: convicted ? 'CONVICTED' : 'DEFENDANT RELEASED',
          reasonCode: convicted
            ? 'court_conviction'
            : 'court_release',
          message: gameState.gameOverReason
        }
      );

      if (!opened && !this._cleanupDone) {
        this.busy = false;

        this.notice?.setText(
          'Could not open the result screen. Press Enter to retry.'
        );
      }
    } catch (error) {
      console.error('[CourtScene] Finish failed:', error);

      if (!this._cleanupDone) {
        this.busy = false;

        this.notice?.setText(
          'Could not finish the trial. Press Enter to retry.'
        );
      }
    }
  }
}