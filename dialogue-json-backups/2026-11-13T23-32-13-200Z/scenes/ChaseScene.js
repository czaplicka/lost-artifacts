import { BaseScene } from './BaseScene.js';

import { gameState } from '../GameData.js';

import {
  currentChase,
  persistChase,
  terminalData,
  chaseFailureCode
} from '../systems/chasePersistence.js';

import {
  getSubmittedTheory,
  prepareTheorySubmission
} from '../systems/CaseTheorySubmission.js';

import {
  RUNNER_CONFIG,
  ensureRunner,
  changeLane,
  startJump,
  jumpHeight,
  tickRunner,
  visibleRows
} from '../systems/chaseRunner.js';

import {
  audioManager
} from '../managers/AudioManager.js';

const VIEW = Object.freeze({
  width: 1920,
  height: 1080,

  centre: 960,

  horizon: 265,
  ground: 875,

  laneSpacing: 430
});

const clamp = Phaser.Math.Clamp;

export class ChaseScene extends BaseScene {
  constructor() {
    super({ key: 'ChaseScene' });
  }

  init(data = {}) {
    this.sourceKey = data.sourceKey ?? null;

    const saved = currentChase();

    this.record = saved
      ? structuredClone(saved)
      : null;

    this.leaving = false;
    this.theoryBlocked = false;

    this.saveElapsed = 0;
    this.accumulator = 0;

    this.manualPause = false;
    this.pointerStart = null;

    this.hitFlash = 0;
    this.messageUntil = 0;
    this.inputLockUntil = 0;

    this.pageHideHandler = null;
    this.visibilityHandler = null;
  }

  create() {
    super.create();

    if (!this.record) {
      this.add.text(
        100,
        100,
        'No active pursuit. Return to the saved case.',
        this.style(30)
      );

      return;
    }

    this.scene.bringToTop();

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
      if (
        !chaseFailureCode(this.record) &&
        this.record.phase !== 'settled'
      ) {
        if (
          !getSubmittedTheory(
            gameState,
            this.record.suspectId
          )
        ) {
          prepareTheorySubmission(
            gameState,
            this.record.suspectId
          );
        }

        ensureRunner(this.record);

        // Kontynuacja rozpoczętego starego pościgu:
        // zachowujemy dystans, zmieniamy samą mechanikę.
        if (
          ['result', 'final'].includes(
            this.record.phase
          )
        ) {
          this.record.phase = 'choice';
        }

        if (!persistChase(this.record)) {
          throw new Error(
            'The pursuit checkpoint could not be saved.'
          );
        }
      }
    } catch (error) {
      this.showTheoryBlock(error);
      return;
    }

    this.root = this.add.container();

    this.world = this.add.graphics();
    this.actors = this.add.graphics();

    this.root.add([
      this.world,
      this.actors
    ]);

    this.createHUD();
    this.createOverlay();
    this.installControls();

    this.pageHideHandler = () => {
      if (!this.leaving) this.save();
    };

    this.visibilityHandler = () => {
      this.accumulator = 0;

      if (document.hidden && !this.leaving) {
        this.save();
      }
    };

    window.addEventListener(
      'pagehide',
      this.pageHideHandler
    );

    document.addEventListener(
      'visibilitychange',
      this.visibilityHandler
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
      }
    );

    this.render();
  }

  style(size, pixel = false) {
    return {
      fontFamily: pixel
        ? 'PressStart2P'
        : 'SpecialElite',

      fontSize: `${size}px`,
      color: '#f7e6bc'
    };
  }

  createHUD() {
    const header = this.add.rectangle(
      960,
      76,
      1840,
      120,
      0x21160f,
      0.96
    ).setStrokeStyle(3, 0xc7ad73);

    const title = this.add.text(
      90,
      40,
      'HOT PURSUIT',
      this.style(24, true)
    );

    this.distanceText = this.add.text(
      90,
      91,
      '',
      this.style(25)
    );

    this.hitsText = this.add.text(
      1520,
      91,
      '',
      this.style(25)
    );

    const pause = this.makeControl(
      1760,
      59,
      190,
      54,
      'PAUSE',
      () => this.togglePause(),
      16
    );

    this.message = this.add.text(
      960,
      165,
      '',
      {
        ...this.style(28),
        align: 'center',

        backgroundColor: '#21160f',
        padding: { x: 20, y: 10 },

        wordWrap: { width: 1550 }
      }
    ).setOrigin(0.5);

    this.root.add([
      header,
      title,
      this.distanceText,
      this.hitsText,
      pause,
      this.message
    ]);

    const footer = this.add.rectangle(
      960,
      1010,
      1840,
      120,
      0x21160f,
      0.97
    ).setStrokeStyle(3, 0xc7ad73);

    const left = this.makeControl(
      260,
      1000,
      300,
      80,
      '< LEFT',
      () => this.move(-1)
    );

    const jump = this.makeControl(
      960,
      1000,
      440,
      80,
      'JUMP',
      () => this.jump()
    );

    const right = this.makeControl(
      1660,
      1000,
      300,
      80,
      'RIGHT >',
      () => this.move(1)
    );

    this.saveNotice = this.add.text(
      960,
      923,
      '',
      {
        ...this.style(19),
        color: '#ffb28d',
        backgroundColor: '#21160f',
        padding: { x: 12, y: 6 }
      }
    ).setOrigin(0.5);

    this.root.add([
      footer,
      left,
      jump,
      right,
      this.saveNotice
    ]);
  }

  makeControl(
    x,
    y,
    width,
    height,
    label,
    callback,
    fontSize = 22
  ) {
    const root = this.add.container(x, y);

    const bg = this.add.rectangle(
      0,
      0,
      width,
      height,
      0x503722
    )
      .setStrokeStyle(2, 0xc7ad73)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(
      0,
      0,
      label,
      this.style(fontSize, true)
    ).setOrigin(0.5);

    bg.on('pointerdown', (pointer, lx, ly, event) => {
      event?.stopPropagation();
      callback();
    });

    bg.on('pointerover', () => {
      bg.setFillStyle(0x74502e);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x503722);
    });

    root.add([bg, text]);

    return root;
  }

  createOverlay() {
    this.overlay = this.add.container();
    this.overlay.setDepth(100);

    const shade = this.add.rectangle(
      960,
      540,
      1920,
      1080,
      0x100d0b,
      0.85
    ).setInteractive();

    const panel = this.add.rectangle(
      960,
      520,
      1280,
      570,
      0x21160f,
      1
    ).setStrokeStyle(4, 0xc7ad73);

    this.overlayTitle = this.add.text(
      960,
      320,
      '',
      {
        ...this.style(28, true),
        align: 'center'
      }
    ).setOrigin(0.5);

    this.overlayText = this.add.text(
      960,
      490,
      '',
      {
        ...this.style(29),
        align: 'center',
        lineSpacing: 14,
        wordWrap: { width: 1100 }
      }
    ).setOrigin(0.5);

    this.overlayButton = this.makeControl(
      960,
      700,
      950,
      90,
      'START PURSUIT',
      () => this.primary(),
      20
    );

    this.overlay.add([
      shade,
      panel,
      this.overlayTitle,
      this.overlayText,
      this.overlayButton
    ]);

    this.root.add(this.overlay);
  }

  installControls() {
    if (this.input.keyboard) {
      this.input.keyboard.addCapture([
        'LEFT',
        'RIGHT',
        'UP',
        'SPACE',
        'ENTER',
        'ESC'
      ]);

      const bind = (key, handler) => {
        this.trackInputEvent(
          this.input.keyboard,
          `keydown-${key}`,
          event => {
            if (event.repeat) return;

            event.preventDefault();

            handler();
          }
        );
      };

      bind('LEFT', () => this.move(-1));
      bind('RIGHT', () => this.move(1));

      bind('UP', () => this.jump());
      bind('SPACE', () => {
        if (this.isRunning()) this.jump();
        else this.primary();
      });

      bind('ENTER', () => this.primary());
      bind('ESC', () => this.togglePause());
    }

    this.trackInputEvent(
      this.input,
      'pointerdown',
      pointer => {
        if (!this.isRunning()) return;

        if (
          pointer.y < 200 ||
          pointer.y > 930
        ) {
          return;
        }

        this.pointerStart = {
          id: pointer.id,
          x: pointer.x,
          y: pointer.y
        };
      }
    );

    this.trackInputEvent(
      this.input,
      'pointerup',
      pointer => {
        const start = this.pointerStart;

        this.pointerStart = null;

        if (
          !start ||
          start.id !== pointer.id ||
          !this.isRunning()
        ) {
          return;
        }

        const dx = pointer.x - start.x;
        const dy = pointer.y - start.y;

        if (Math.max(Math.abs(dx), Math.abs(dy)) < 35) {
          return;
        }

        if (Math.abs(dx) > Math.abs(dy)) {
          this.move(dx < 0 ? -1 : 1);
        } else if (dy < 0) {
          this.jump();
        }
      }
    );
  }

  isRunning() {
    return Boolean(
      this.record?.phase === 'choice' &&
      !this.manualPause &&
      !this.leaving &&
      !this.theoryBlocked &&
      !chaseFailureCode(this.record) &&
      !document.hidden
    );
  }

  move(direction) {
    if (!this.isRunning()) return;

    changeLane(this.record, direction);
  }

  jump() {
    if (!this.isRunning()) return;

    startJump(this.record);
  }

  togglePause() {
    if (
      this.record?.phase !== 'choice' ||
      this.leaving ||
      this.theoryBlocked
    ) {
      return;
    }

    this.manualPause = !this.manualPause;
    this.accumulator = 0;

    this.save();
    this.render();
  }

  primary() {
    if (
      this.leaving ||
      this.theoryBlocked ||
      this.time.now < this.inputLockUntil
    ) {
      return;
    }

    if (this.manualPause) {
      this.manualPause = false;
      this.accumulator = 0;
      this.render();
      return;
    }

    if (this.record.phase === 'intro') {
      this.record.phase = 'choice';

      ensureRunner(this.record);

      this.accumulator = 0;

      this.setMessage(
        'LEFT / RIGHT to move. SPACE or UP to jump.',
        6000
      );

      this.save();
      this.render();

      return;
    }

    if (
      chaseFailureCode(this.record) ||
      ['caught', 'review', 'escaped', 'settled']
        .includes(this.record.phase)
    ) {
      void this.finish();
    }
  }

  setMessage(text, duration = 2200) {
    this.message?.setText(text);
    this.messageUntil = this.time.now + duration;
  }

  save() {
    if (!this.record) return false;

    const saved = persistChase(this.record);

    this.saveElapsed = 0;

    this.saveNotice?.setText(
      saved
        ? ''
        : 'Checkpoint unavailable. Please keep this tab open.'
    );

    return saved;
  }

  render() {
    this.drawWorld();
    this.refreshHUD();

    const r = this.record;

    let title = '';
    let text = '';
    let button = '';

    if (chaseFailureCode(r)) {
      title = 'SUSPECT ESCAPED';

      text = terminalData(r).message;

      button = 'GAME OVER';
    } else if (this.manualPause) {
      title = 'PURSUIT PAUSED';

      text =
        'The suspect has politely agreed to pause reality.';

      button = 'RESUME';
    } else if (r.phase === 'intro') {
      title = 'HOT PURSUIT';

      text =
        'Catch the suspect.\n\n' +
        'Move left or right to avoid people and strollers.\n' +
        'Jump over puddles.\n\n' +
        'Arrow keys / Space, swipe, or use the buttons.';

      button = 'START PURSUIT';
    } else if (['caught', 'review'].includes(r.phase)) {
      title = 'SUSPECT CAUGHT';

      text =
        'The running is over.\n' +
        'The paperwork is just getting started.';

      button = 'CHECK ARREST FILE';
    } else if (r.phase === 'settled') {
      title = 'PURSUIT COMPLETE';

      text = r.arrestOutcome?.message ||
        'The pursuit has already ended.';

      button = 'VIEW RESULT';
    }

    this.overlay.setVisible(Boolean(title));

    if (title) {
      this.overlayTitle.setText(title);
      this.overlayText.setText(text);

      this.overlayButton.list[1].setText(button);
    }

    this.inputLockUntil = this.time.now + 160;
  }

  refreshHUD() {
    if (!this.distanceText) return;

    this.distanceText.setText(
      `SUSPECT: ${Math.ceil(this.record.distance)} m`
    );

    this.hitsText.setText(
      `COLLISIONS: ${this.record.runner?.hits ?? 0}`
    );

    if (this.time.now > this.messageUntil) {
      this.message.setText('');
    }

    this.message.setVisible(
      Boolean(this.message.text) &&
      this.record.phase === 'choice' &&
      !this.manualPause
    );
  }

  polygon(graphics, color, points, alpha = 1) {
    graphics.fillStyle(color, alpha);
    graphics.beginPath();

    graphics.moveTo(points[0][0], points[0][1]);

    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i][0], points[i][1]);
    }

    graphics.closePath();
    graphics.fillPath();
  }

  drawWorld() {
    if (!this.world || !this.actors) return;

    const g = this.world;
    const a = this.actors;

    g.clear();
    a.clear();

    const state = this.record.runner;
    const elapsed = state?.elapsed ?? 0;

    g.fillStyle(0xaab8bd);
    g.fillRect(0, 0, 1920, 1080);

    // Budynki w oddali.
    for (let i = 0; i < 14; i++) {
      const width = 155;
      const height = 95 + (i % 4) * 29;

      g.fillStyle(
        [0x7a817d, 0x8a8277, 0x697777][i % 3]
      );

      g.fillRect(
        i * 150 - 55,
        VIEW.horizon - height,
        width,
        height
      );
    }

    // Chodnik — jezdnia — chodnik.
    // Brak namalowanych pasów ruchu.
    this.polygon(g, 0x686761, [
      [0, VIEW.horizon],
      [1920, VIEW.horizon],
      [1920, 950],
      [0, 950]
    ]);

    this.polygon(g, 0x41464b, [
      [905, VIEW.horizon],
      [1015, VIEW.horizon],
      [1320, 950],
      [600, 950]
    ]);

    this.polygon(g, 0xc0b49c, [
      [890, VIEW.horizon],
      [905, VIEW.horizon],
      [600, 950],
      [565, 950]
    ]);

    this.polygon(g, 0xc0b49c, [
      [1015, VIEW.horizon],
      [1030, VIEW.horizon],
      [1355, 950],
      [1320, 950]
    ]);

    // Boczne fasady.
    this.polygon(g, 0x8d7560, [
      [0, 160],
      [790, VIEW.horizon],
      [565, 950],
      [0, 950]
    ]);

    this.polygon(g, 0x716a63, [
      [1920, 140],
      [1130, VIEW.horizon],
      [1355, 950],
      [1920, 950]
    ]);

    // Szczeliny płyt chodnikowych dają wrażenie ruchu.
    const offset = (elapsed * 0.38) % 1;

    for (let i = 0; i < 10; i++) {
      const p = ((i / 10) + offset) % 1;
      const depth = p * p;

      const y = VIEW.horizon +
        (950 - VIEW.horizon) * depth;

      const left = 905 - 305 * depth;
      const right = 1015 + 305 * depth;

      g.lineStyle(
        1 + p * 2,
        0x333333,
        0.35
      );

      g.lineBetween(0, y, left - 20, y);
      g.lineBetween(right + 20, y, 1920, y);
    }

    // Złodziej jest tylko znacznikiem dystansu:
    // nie trzeba ścigać jego toru.
    const close = 1 - clamp(
      this.record.distance / 100,
      0,
      1
    );

    const suspectY = 350 + close * 245;
    const suspectScale = 0.35 + close * 0.4;

    this.drawPerson(
      a,
      VIEW.centre,
      suspectY,
      suspectScale,
      0x873d35,
      elapsed,
      true
    );

    const items = [];

    if (state) {
      for (const row of visibleRows(this.record)) {
        for (const obstacle of row.obstacles) {
          items.push({
            type: 'obstacle',
            obstacle,
            progress: row.progress,
            depth: row.progress * row.progress
          });
        }
      }
    }

    items.push({
      type: 'player',
      depth: 1
    });

    items.sort((first, second) =>
      first.depth - second.depth
    );

    for (const item of items) {
      if (item.type === 'player') {
        this.drawPlayer(a, state, elapsed);
      } else {
        this.drawObstacle(
          a,
          item.obstacle,
          item.progress
        );
      }
    }

    if (this.hitFlash > 0) {
      g.fillStyle(
        0xaa3322,
        Math.min(0.22, this.hitFlash * 0.4)
      );

      g.fillRect(0, 200, 1920, 740);
    }
  }

  drawPlayer(g, state, elapsed) {
    const lane = state?.lane ?? 0;

    const x = VIEW.centre +
      lane * VIEW.laneSpacing;

    const height = jumpHeight(state);

    g.fillStyle(0x000000, 0.24);
    g.fillEllipse(
      x,
      VIEW.ground - 4,
      105 - height * 0.2,
      24 - height * 0.035
    );

    const blinking =
      state?.cooldown > 0 &&
      Math.floor(elapsed * 12) % 2 === 0;

    if (!blinking) {
      this.drawPerson(
        g,
        x,
        VIEW.ground - height,
        1,
        0x344e68,
        elapsed,
        false,
        height > 5
      );
    }
  }

  drawPerson(
    g,
    x,
    foot,
    scale,
    coat,
    elapsed,
    thief = false,
    airborne = false
  ) {
    const s = scale;

    const swing = airborne
      ? 12
      : Math.sin(elapsed * 15) * 22;

    const shoulder = foot - 112 * s;

    g.lineStyle(15 * s, 0x25282d, 1);

    g.lineBetween(
      x - 13 * s,
      foot - 58 * s,
      x - (18 + swing) * s,
      foot
    );

    g.lineBetween(
      x + 13 * s,
      foot - 58 * s,
      x + (18 + swing) * s,
      foot - 5 * s
    );

    g.lineStyle(12 * s, coat, 1);

    g.lineBetween(
      x - 29 * s,
      shoulder,
      x - 47 * s,
      shoulder + (32 + swing * 0.6) * s
    );

    g.lineBetween(
      x + 29 * s,
      shoulder,
      x + 47 * s,
      shoulder + (32 - swing * 0.6) * s
    );

    g.fillStyle(coat);

    g.fillRoundedRect(
      x - 32 * s,
      foot - 123 * s,
      64 * s,
      72 * s,
      8 * s
    );

    g.fillStyle(0xc99673);

    g.fillCircle(
      x,
      foot - 147 * s,
      23 * s
    );

    g.fillStyle(thief ? 0x2a211d : 0x433322);

    g.fillEllipse(
      x,
      foot - 157 * s,
      48 * s,
      29 * s
    );

    if (thief) {
      g.fillStyle(0x38291d);

      g.fillRoundedRect(
        x + 23 * s,
        foot - 88 * s,
        34 * s,
        43 * s,
        4 * s
      );
    } else {
      g.fillStyle(0xc6ab68);

      g.fillRect(
        x - 11 * s,
        foot - 112 * s,
        22 * s,
        8 * s
      );
    }
  }

  drawObstacle(g, obstacle, progress) {
    const p = clamp(progress, 0, 1.16);
    const depth = p * p;

    const x = VIEW.centre +
      obstacle.lane * VIEW.laneSpacing * p;

    const y = VIEW.horizon +
      (VIEW.ground - VIEW.horizon) * depth;

    const scale = 0.08 + 0.92 * p;

    if (obstacle.kind === 'puddle') {
      g.fillStyle(0x1f3949, 0.9);
      g.fillEllipse(
        x,
        y,
        230 * scale,
        55 * scale
      );

      g.lineStyle(
        Math.max(1, 3 * scale),
        0x90bdc8,
        0.8
      );

      g.strokeEllipse(
        x,
        y - 3 * scale,
        180 * scale,
        31 * scale
      );

      return;
    }

    g.fillStyle(0x000000, 0.2);

    g.fillEllipse(
      x,
      y,
      180 * scale,
      31 * scale
    );

    if (obstacle.kind === 'crowd') {
      this.drawCivilian(
        g,
        x - 48 * scale,
        y - 15 * scale,
        scale * 0.87,
        0x8d6752
      );

      this.drawCivilian(
        g,
        x + 44 * scale,
        y - 10 * scale,
        scale * 0.92,
        0x747d44
      );

      this.drawCivilian(
        g,
        x,
        y,
        scale,
        0x95627c
      );

      // Rozłożona mapa, nie dodatkowa przeszkoda.
      g.fillStyle(0xe0ce9b);

      g.fillRect(
        x - 40 * scale,
        y - 85 * scale,
        80 * scale,
        42 * scale
      );

      g.lineStyle(2 * scale, 0x9b9977);

      g.lineBetween(
        x - 12 * scale,
        y - 85 * scale,
        x - 12 * scale,
        y - 43 * scale
      );

      return;
    }

    if (obstacle.kind === 'stroller') {
      this.drawCivilian(
        g,
        x - 42 * scale,
        y - 5 * scale,
        scale,
        0x60866b
      );

      const sx = x + 38 * scale;

      g.lineStyle(6 * scale, 0x36383c);

      g.lineBetween(
        sx - 28 * scale,
        y - 65 * scale,
        sx - 55 * scale,
        y - 96 * scale
      );

      g.fillStyle(0x8e5458);

      g.fillRoundedRect(
        sx - 42 * scale,
        y - 75 * scale,
        85 * scale,
        55 * scale,
        15 * scale
      );

      g.fillStyle(0xb67575);

      g.fillEllipse(
        sx + 6 * scale,
        y - 75 * scale,
        78 * scale,
        65 * scale
      );

      g.fillStyle(0x24282d);

      g.fillCircle(
        sx - 25 * scale,
        y - 9 * scale,
        13 * scale
      );

      g.fillCircle(
        sx + 28 * scale,
        y - 9 * scale,
        13 * scale
      );
    }
  }

  drawCivilian(g, x, foot, scale, clothes) {
    const s = scale;

    g.lineStyle(11 * s, 0x34333b);

    g.lineBetween(
      x - 10 * s,
      foot - 46 * s,
      x - 15 * s,
      foot
    );

    g.lineBetween(
      x + 10 * s,
      foot - 46 * s,
      x + 15 * s,
      foot
    );

    g.fillStyle(clothes);

    g.fillRoundedRect(
      x - 27 * s,
      foot - 112 * s,
      54 * s,
      70 * s,
      7 * s
    );

    g.fillStyle(0xc99c7d);

    g.fillCircle(
      x,
      foot - 136 * s,
      22 * s
    );

    g.fillStyle(0x514036);

    g.fillEllipse(
      x,
      foot - 147 * s,
      46 * s,
      25 * s
    );
  }

  update(time, delta) {
    if (
      !this.record ||
      this.theoryBlocked ||
      this.leaving
    ) {
      return;
    }

    this.hitFlash = Math.max(
      0,
      this.hitFlash - delta / 1000
    );

    if (!this.isRunning()) {
      this.accumulator = 0;
      this.drawWorld();
      this.refreshHUD();
      return;
    }

    // Przy dużym przycięciu nie nadrabiamy sekund
    // niewidocznego dla gracza biegu.
    this.accumulator += Math.min(delta / 1000, 0.1);

    while (
      this.accumulator >= RUNNER_CONFIG.fixedStep &&
      this.record.phase === 'choice'
    ) {
      const hit = tickRunner(
        this.record,
        RUNNER_CONFIG.fixedStep
      );

      this.accumulator -= RUNNER_CONFIG.fixedStep;

      if (hit) {
        this.hitFlash = 0.55;

        const messages = {
          crowd:
            '"Excuse me!" is not a collision avoidance system.',

          stroller:
            'You stop short. The stroller has right of way.',

          puddle:
            'Your shoes are now carrying additional evidence.'
        };

        this.setMessage(messages[hit] || 'Watch your step!');

        this.save();
      }
    }

    this.saveElapsed += delta;

    if (this.record.phase !== 'choice') {
      this.accumulator = 0;
      this.save();
      this.render();
      return;
    }

    if (this.saveElapsed >= 1000) {
      this.save();
    }

    this.drawWorld();
    this.refreshHUD();
  }

  showTheoryBlock(error) {
    this.theoryBlocked = true;

    this.scene.bringToTop();

    const width = this.scale.width;
    const height = this.scale.height;

    this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x17110e
    ).setDepth(9000);

    this.add.text(
      width / 2,
      height / 2 - 100,
      (
        error?.message ||
        'The submitted theory is missing.'
      ) +
      '\n\nNo arrest has been recorded.',
      {
        ...this.style(26),
        align: 'center',
        wordWrap: {
          width: Math.max(200, width - 100)
        }
      }
    ).setOrigin(0.5).setDepth(9001);

    const back = this.add.text(
      width / 2,
      height / 2 + 130,
      'RETURN TO CITY',
      {
        ...this.style(22, true),
        backgroundColor: '#503722',
        padding: { x: 20, y: 18 }
      }
    )
      .setOrigin(0.5)
      .setDepth(9001)
      .setInteractive({ useHandCursor: true });

    back.on('pointerdown', async () => {
      if (this.leaving) return;

      this.leaving = true;

      back.disableInteractive();

      try {
        const opened = await this.goto(
          'CityScene',
          {
            cityId: gameState.currentCityId,
            resumeCaseTheory: true
          }
        );

        if (
          opened &&
          this.sourceKey &&
          this.sourceKey !== 'CityScene' &&
          this.sourceKey !== this.sys.settings.key
        ) {
          this.scene.stop(this.sourceKey);
        }

        if (
          opened === false &&
          !this._cleanupDone
        ) {
          this.leaving = false;

          back.setInteractive({
            useHandCursor: true
          });
        }
      } catch (navigationError) {
        console.error(
          '[ChaseScene] Return:',
          navigationError
        );

        if (!this._cleanupDone) {
          this.leaving = false;

          back.setInteractive({
            useHandCursor: true
          });
        }
      }
    });
  }

  evaluateArrest() {
    const r = this.record;

    if (
      !r ||
      r.suspectId == null ||
      !Number.isFinite(r.distance)
    ) {
      throw new Error('Invalid chase outcome data.');
    }

    if (r.distance > 0) {
      return {
        code: 'not_caught',
        arrested: false,
        message: 'The suspect was not caught.'
      };
    }

    if (
      !gameState.arrestWarrantIssued ||
      gameState.warrantSuspectId == null
    ) {
      return {
        code: 'missing_warrant',
        arrested: false,
        message:
          'Suspect caught, but no arrest warrant is available.'
      };
    }

    if (
      String(gameState.warrantSuspectId) !==
      String(r.suspectId)
    ) {
      return {
        code: 'warrant_mismatch',
        arrested: false,
        message:
          'Suspect caught, but the warrant names another person.'
      };
    }

    if (!getSubmittedTheory(gameState, r.suspectId)) {
      return {
        code: 'theory_missing',
        arrested: false,
        message:
          'The matching submitted Case Theory is missing or inconsistent.'
      };
    }

    return {
      code: 'arrested',
      arrested: true,
      message:
        'Suspect caught. The warrant matches and a complete theory has been filed. Arrest completed.'
    };
  }

  async finish() {
    const r = this.record;

    if (
      !r ||
      this.leaving ||
      this.theoryBlocked
    ) {
      return;
    }

    const previous = r.arrestOutcome;

    const previousFailure =
      r.phase === 'settled' &&
      previous &&
      ['missing_warrant', 'warrant_mismatch']
        .includes(previous.code);

    if (
      !['caught', 'review', 'escaped', 'settled']
        .includes(r.phase)
    ) {
      return;
    }

    this.leaving = true;

    try {
      if (
        !chaseFailureCode(r) &&
        (
          ['caught', 'review'].includes(r.phase) ||
          previousFailure
        )
      ) {
        const outcome = previousFailure
          ? previous
          : this.evaluateArrest();

        if (outcome.code === 'theory_missing') {
          this.leaving = false;

          this.showTheoryBlock(
            new Error(outcome.message)
          );

          return;
        }

        r.arrestOutcome = outcome;

        if (outcome.arrested) {
          r.phase = 'review';
          r.terminalScene = 'CourtScene';

          if (!this.save()) {
            this.leaving = false;

            this.saveNotice?.setText(
              'Could not save the arrest file. Press Enter to retry.'
            );

            return;
          }

          const opened = await this.goto(
            'CourtScene',
            {
              caseId: r.caseId,
              suspectId: r.suspectId
            }
          );

          if (opened) {
            this.stopSourceScenes();
          } else if (!this._cleanupDone) {
            this.leaving = false;

            this.saveNotice?.setText(
              'Could not open the court. Press Enter to retry.'
            );
          }

          return;
        }

        r.failureCode = outcome.code === 'not_caught'
          ? 'chase_escape'
          : outcome.code;

        r.phase = r.failureCode === 'chase_escape'
          ? 'escaped'
          : 'review';

        r.terminalScene = 'GameOverScene';
      }

      if (chaseFailureCode(r)) {
        this.save();

        const opened = await this.goto(
          'GameOverScene',
          terminalData(r)
        );

        if (!opened && !this._cleanupDone) {
          this.leaving = false;

          this.saveNotice?.setText(
            'Could not open Game Over. Press Enter to retry.'
          );

          return;
        }

        if (opened) {
          this.stopSourceScenes();
        }

        return;
      }

      if (
        r.phase === 'settled' &&
        r.terminalScene &&
        r.terminalScene !== 'ChaseScene'
      ) {
        const opened = await this.goto(
          r.terminalScene,
          {
            caseId: r.caseId,
            suspectId: r.suspectId
          }
        );

        if (!opened && !this._cleanupDone) {
          this.leaving = false;

          this.saveNotice?.setText(
            'Could not open the result. Press Enter to retry.'
          );
        }

        return;
      }

      this.leaving = false;
      this.render();
    } catch (error) {
      console.error(
        '[ChaseScene] Could not finish pursuit:',
        error
      );

      if (!this._cleanupDone) {
        this.leaving = false;

        this.saveNotice?.setText(
          'Could not finish the pursuit. Press Enter to retry.'
        );
      }
    }
  }

  stopSourceScenes() {
    if (
      this.sourceKey &&
      this.sourceKey !== this.sys.settings.key &&
      this.sourceKey !== 'GameOverScene' &&
      this.sourceKey !== 'CourtScene'
    ) {
      this.scene.stop(this.sourceKey);
    }

    this.scene.stop('CityScene');
  }
}