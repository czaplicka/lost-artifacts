import {
  dialogueText as __dialogueText
} from '../dialogues/DialogueText.js';

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
  OBSTACLES,
  restartRunner,
  changeLane,
  startJump,
  jumpHeight,
  tickRunner,
  visibleRows,
  thiefProgress,
  inFinalZone
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

const T = id =>
  __dialogueText('scenes/ChaseScene.js', id);

export class ChaseScene extends BaseScene {
  constructor() {
    super({ key: 'ChaseScene' });
  }

  init(data = {}) {
    this.sourceKey = data.sourceKey ?? null;

    const saved = currentChase();

    this.record = saved ? structuredClone(saved) : null;

    this.leaving = false;
    this.theoryBlocked = false;

    this.saveElapsed = 0;
    this.accumulator = 0;

    this.manualPause = false;
    this.pointerStart = null;

    this.hitFlash = 0;
    this.messageUntil = 0;
    this.inputLockUntil = 0;

    this.finalAnnounced = false;

    this.pageHideHandler = null;
    this.visibilityHandler = null;
  }

  create() {
    super.create();

    if (!this.record) {
      this.add.text(
        100,
        100,
        T('t_4cebb73e2537546d9f44'),
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
      const active =
        !chaseFailureCode(this.record) &&
        ['intro', 'choice', 'result', 'final']
          .includes(this.record.phase);

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
      }

      // Ponowne wejście i odświeżenie:
      // aktywny bieg zawsze zaczyna się od początku.
      // Wyniki zakończonego pościgu nie są resetowane.
      if (active) {
        restartRunner(
          this.record,
          gameState.casesSolved
        );

        if (!persistChase(this.record)) {
          throw new Error(
            'The pursuit start could not be saved.'
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
    this.effects = this.add.graphics();

    this.root.add([
      this.world,
      this.actors,
      this.effects
    ]);

    this.createHUD();
    this.createOverlay();
    this.installControls();

    this.pageHideHandler = () => {
      if (!this.leaving) this.save();
    };

    this.visibilityHandler = () => {
      this.accumulator = 0;
      this.pointerStart = null;

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
      960, 76, 1840, 120, 0x21160f, 0.96
    ).setStrokeStyle(3, 0xc7ad73);

    const title = this.add.text(
      90,
      35,
      T('t_fb7a3ed06946f007f897'),
      this.style(22, true)
    );

    this.distanceText = this.add.text(
      90, 88, '', this.style(25)
    );

    this.routeText = this.add.text(
      620, 88, '', this.style(25)
    );

    this.hitsText = this.add.text(
      1260, 88, '', this.style(25)
    );

    const pause = this.makeControl(
      1750, 62, 200, 58,
      'PAUSE',
      () => this.togglePause(),
      16
    );

    this.message = this.add.text(
      960,
      178,
      '',
      {
        ...this.style(27),
        align: 'center',
        backgroundColor: '#21160f',
        padding: { x: 20, y: 10 },
        wordWrap: { width: 1660 }
      }
    ).setOrigin(0.5);

    this.root.add([
      header,
      title,
      this.distanceText,
      this.routeText,
      this.hitsText,
      pause,
      this.message
    ]);

    const footer = this.add.rectangle(
      960, 1010, 1840, 120, 0x21160f, 0.97
    ).setStrokeStyle(3, 0xc7ad73);

    const left = this.makeControl(
      260, 1000, 300, 80,
      T('t_708c87f199105e972653'),
      () => this.move(-1)
    );

    const jump = this.makeControl(
      960, 1000, 440, 80,
      'JUMP',
      () => this.jump()
    );

    const right = this.makeControl(
      1660, 1000, 300, 80,
      T('t_49671894c23d097921f9'),
      () => this.move(1)
    );

    this.saveNotice = this.add.text(
      960,
      924,
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
    x, y, width, height,
    label, callback, fontSize = 22
  ) {
    const root = this.add.container(x, y);

    const bg = this.add.rectangle(
      0, 0, width, height, 0x503722
    )
      .setStrokeStyle(2, 0xc7ad73)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(
      0, 0, label, this.style(fontSize, true)
    ).setOrigin(0.5);

    bg.on(
      'pointerdown',
      (pointer, lx, ly, event) => {
        event?.stopPropagation();
        callback();
      }
    );

    bg.on('pointerover', () => {
      bg.setFillStyle(0x74502e);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x503722);
    });

    root.add([bg, text]);
    root.label = text;

    return root;
  }

  createOverlay() {
    this.overlay = this.add.container();

    const shade = this.add.rectangle(
      960, 540, 1920, 1080, 0x100d0b, 0.86
    ).setInteractive();

    const panel = this.add.rectangle(
      960, 520, 1400, 650, 0x21160f
    ).setStrokeStyle(4, 0xc7ad73);

    this.overlayTitle = this.add.text(
      960, 285, '',
      {
        ...this.style(28, true),
        align: 'center'
      }
    ).setOrigin(0.5);

    this.overlayText = this.add.text(
      960, 490, '',
      {
        ...this.style(27),
        align: 'center',
        lineSpacing: 12,
        wordWrap: { width: 1240 }
      }
    ).setOrigin(0.5);

    this.overlayButton = this.makeControl(
      960, 750, 1050, 85,
      T('t_06f8ac726bb92e4eb9f0'),
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
        'LEFT', 'RIGHT', 'UP',
        'SPACE', 'ENTER', 'ESC'
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
        if (
          !this.isRunning() ||
          pointer.y < 220 ||
          pointer.y > 910
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

        if (
          Math.max(Math.abs(dx), Math.abs(dy)) < 35
        ) {
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
    if (this.isRunning()) {
      changeLane(this.record, direction);
    }
  }

  jump() {
    if (this.isRunning()) {
      startJump(this.record);
    }
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
    this.pointerStart = null;

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
      this.accumulator = 0;

      this.setMessage(
        'Avoid people and dogs. Jump over water and hedges.',
        3500
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

  setMessage(text, duration = 2300) {
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
        : T('t_b5ceb88d896f23e64966')
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
      title = T('t_2de8c6bcc823fd89a58b');

      text = [
        r.resultText,
        terminalData(r).message
      ].filter(Boolean).join('\n\n');

      button = T('t_6f391555cf2297ac2470');
    } else if (this.manualPause) {
      title = T('t_689c13541199ad24ba4b');
      text = T('t_051b4a7d7333671b005d');
      button = 'RESUME';
    } else if (r.phase === 'intro') {
      title = T('t_fb7a3ed06946f007f897');

      const length = r.runner?.length ?? 15;

      text =
        `ROUTE: ${length} m\n\n` +
        'LEFT / RIGHT: change position. SPACE / UP: jump.\n' +
        'Avoid people, strollers and dogs.\n' +
        'Jump over puddles and low hedges.\n\n' +
        'At the end, get behind the suspect.\n' +
        'Stay within 7 m to make the arrest.\n\n' +
        'Reloading restarts the entire run.';

      button = T('t_06f8ac726bb92e4eb9f0');
    } else if (['caught', 'review'].includes(r.phase)) {
      title = T('t_ab380169a9a0e4c55cb7');

      text =
        T('t_fc95f519e3b8f8b8da9b') +
        T('t_7104b4fa95d3df3ca3e6');

      button = T('t_54a17e5dcbd8fea9326c');
    } else if (r.phase === 'settled') {
      title = T('t_fde70d675fec6d56d422');

      text =
        r.arrestOutcome?.message ||
        T('t_6587bef778e5c2a66c5d');

      button = T('t_b9261106e7e7a611ab7e');
    }

    this.overlay.setVisible(Boolean(title));

    if (title) {
      this.overlayTitle.setText(title);
      this.overlayText.setText(text);
      this.overlayButton.label.setText(button);
    }

    this.inputLockUntil = this.time.now + 160;
  }

  refreshHUD() {
    if (!this.distanceText) return;

    const r = this.record;
    const state = r.runner;

    this.distanceText.setText(
      `SUSPECT: ${r.distance.toFixed(1)} m`
    );

    this.routeText.setText(
      state
        ? `ROUTE: ${state.travelled.toFixed(1)} / ${state.length} m`
        : ''
    );

    this.hitsText.setText(
      `COLLISIONS: ${state?.hits ?? 0}`
    );

    if (this.time.now > this.messageUntil) {
      this.message.setText('');
    }

    this.message.setVisible(
      Boolean(this.message.text) &&
      r.phase === 'choice' &&
      !this.manualPause
    );
  }

  polygon(g, color, points, alpha = 1) {
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(points[0][0], points[0][1]);

    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i][0], points[i][1]);
    }

    g.closePath();
    g.fillPath();
  }

  project(lane, progress) {
    const p = clamp(progress, 0, 1.2);

    return {
      x: VIEW.centre +
        lane * VIEW.laneSpacing * p,

      y: VIEW.horizon +
        (VIEW.ground - VIEW.horizon) * p * p,

      scale: 0.08 + 0.92 * p
    };
  }

  drawWorld() {
    if (!this.world || !this.actors) return;

    const g = this.world;
    const a = this.actors;
    const fx = this.effects;

    g.clear();
    a.clear();
    fx.clear();

    const state = this.record.runner;
    const elapsed = state?.elapsed ?? 0;

    g.fillStyle(0xaab8bd);
    g.fillRect(0, 0, 1920, 1080);

    for (let i = 0; i < 14; i++) {
      const height = 90 + (i % 4) * 29;

      g.fillStyle(
        [0x7a817d, 0x8a8277, 0x697777][i % 3]
      );

      g.fillRect(
        i * 150 - 55,
        VIEW.horizon - height,
        155,
        height
      );
    }

    this.polygon(g, 0x888375, [
      [0, VIEW.horizon],
      [1920, VIEW.horizon],
      [1920, 950],
      [0, 950]
    ]);

    // Droga i krawężniki; bez pasów ruchu.
    this.polygon(g, 0x41464b, [
      [945, VIEW.horizon],
      [975, VIEW.horizon],
      [1190, 950],
      [730, 950]
    ]);

    this.polygon(g, 0xc0b49c, [
      [940, VIEW.horizon],
      [945, VIEW.horizon],
      [730, 950],
      [712, 950]
    ]);

    this.polygon(g, 0xc0b49c, [
      [975, VIEW.horizon],
      [980, VIEW.horizon],
      [1208, 950],
      [1190, 950]
    ]);

    const offset = (elapsed * 0.38) % 1;

    for (let i = 0; i < 10; i++) {
      const p = (i / 10 + offset) % 1;
      const y = VIEW.horizon +
        (950 - VIEW.horizon) * p * p;

      const left = 945 - 215 * p * p;
      const right = 975 + 215 * p * p;

      g.lineStyle(1 + p * 2, 0x3d3a35, 0.25);
      g.lineBetween(0, y, left - 20, y);
      g.lineBetween(right + 20, y, 1920, y);
    }

    const items = [];

    // Dekoracje są poza trzema torami.
    for (let i = 0; i < 9; i++) {
      const p = (i / 9 + elapsed * 0.075) % 1.12;

      for (const side of [-1, 1]) {
        items.push({
          type: 'scenery',
          side,
          index: i,
          progress: p,
          depth: p * p
        });
      }
    }

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

      const p = thiefProgress(this.record);

      items.push({
        type: 'thief',
        progress: p,
        depth: p * p
      });
    }

    items.push({
      type: 'player',
      depth: 1
    });

    items.sort((first, second) =>
      first.depth - second.depth
    );

    for (const item of items) {
      if (item.type === 'scenery') {
        this.drawScenery(
          a,
          item.side,
          item.progress,
          item.index
        );
      } else if (item.type === 'obstacle') {
        this.drawObstacle(
          a,
          item.obstacle,
          item.progress
        );
      } else if (item.type === 'thief') {
        const position = this.project(
          state.thiefLane,
          item.progress
        );

        a.fillStyle(0x000000, 0.2);
        a.fillEllipse(
          position.x,
          position.y,
          90 * position.scale,
          20 * position.scale
        );

        this.drawPerson(
          a,
          position.x,
          position.y -
            state.thiefJump * position.scale,
          position.scale,
          0x873d35,
          elapsed,
          true,
          state.thiefJump > 5
        );

        if (inFinalZone(this.record)) {
          a.lineStyle(5, 0xe8c36d, 0.9);

          a.strokeEllipse(
            position.x,
            position.y + 4,
            125 * position.scale,
            34 * position.scale
          );
        }
      } else {
        this.drawPlayer(a, state, elapsed);
      }
    }

    if (
      state?.lastHit &&
      state.lastHit.kind === 'puddle'
    ) {
      const age = elapsed - state.lastHit.elapsed;

      if (age >= 0 && age < 0.65) {
        const x = VIEW.centre +
          state.lane * VIEW.laneSpacing;

        for (let i = 0; i < 12; i++) {
          const direction = i < 6 ? -1 : 1;
          const amount = i % 6;

          const dx = direction *
            (25 + amount * 15 + age * 150);

          const dy =
            -30 -
            Math.sin(age / 0.65 * Math.PI) *
            (45 + amount * 14);

          fx.fillStyle(0x80bdcf, 1 - age / 0.65);

          fx.fillCircle(
            x + dx,
            VIEW.ground + dy,
            4 + amount
          );
        }
      }
    }

    if (this.hitFlash > 0) {
      fx.fillStyle(
        0xaa3322,
        Math.min(0.18, this.hitFlash * 0.35)
      );

      fx.fillRect(0, 220, 1920, 720);
    }
  }

  drawScenery(g, side, progress, index) {
    const p = clamp(progress, 0, 1.15);
    const s = 0.05 + p;

    const x = VIEW.centre + side * 820 * p;
    const y = VIEW.horizon +
      (VIEW.ground - VIEW.horizon) * p * p;

    if ((index + (side > 0 ? 1 : 0)) % 3 === 0) {
      const width = 230 * s;
      const height = (260 + index % 3 * 55) * s;

      g.fillStyle(
        [0x9a7b65, 0x7d8585, 0x9b936d][index % 3]
      );

      g.fillRect(
        x - width / 2,
        y - height,
        width,
        height
      );

      g.fillStyle(0x4c555c);

      for (let row = 0; row < 3; row++) {
        for (let column = 0; column < 3; column++) {
          g.fillRect(
            x - width * 0.36 + column * width * 0.27,
            y - height + 35 * s + row * 65 * s,
            33 * s,
            40 * s
          );
        }
      }

      g.fillStyle(0x4b3a2c);

      g.fillRect(
        x - 22 * s,
        y - 70 * s,
        44 * s,
        70 * s
      );
    } else {
      g.fillStyle(0x654c35);

      g.fillRect(
        x - 12 * s,
        y - 150 * s,
        24 * s,
        150 * s
      );

      g.fillStyle(
        index % 2 ? 0x456e48 : 0x557a43
      );

      g.fillCircle(
        x,
        y - 190 * s,
        73 * s
      );

      g.fillCircle(
        x - 40 * s,
        y - 155 * s,
        52 * s
      );

      g.fillCircle(
        x + 43 * s,
        y - 160 * s,
        55 * s
      );
    }
  }

  drawPlayer(g, state, elapsed) {
    const x = VIEW.centre +
      (state?.lane ?? 0) * VIEW.laneSpacing;

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

    if (blinking) return;

    const stumble =
      state?.slow > 0
        ? Math.sin(elapsed * 32) * 10
        : 0;

    this.drawPerson(
      g,
      x + stumble,
      VIEW.ground - height,
      1,
      0x344e68,
      elapsed * (state?.slow > 0 ? 0.35 : 1),
      false,
      height > 5
    );
  }

  drawPerson(
    g, x, foot, scale, coat, elapsed,
    thief = false, airborne = false
  ) {
    const s = scale;

    const swing = airborne
      ? 12
      : Math.sin(elapsed * 15) * 22;

    const shoulder = foot - 112 * s;

    g.lineStyle(15 * s, 0x25282d);

    g.lineBetween(
      x - 13 * s, foot - 58 * s,
      x - (18 + swing) * s, foot
    );

    g.lineBetween(
      x + 13 * s, foot - 58 * s,
      x + (18 + swing) * s, foot - 5 * s
    );

    g.lineStyle(12 * s, coat);

    g.lineBetween(
      x - 29 * s, shoulder,
      x - 47 * s,
      shoulder + (32 + swing * 0.6) * s
    );

    g.lineBetween(
      x + 29 * s, shoulder,
      x + 47 * s,
      shoulder + (32 - swing * 0.6) * s
    );

    g.fillStyle(coat);

    g.fillRoundedRect(
      x - 32 * s, foot - 123 * s,
      64 * s, 72 * s, 8 * s
    );

    g.fillStyle(0xc99673);
    g.fillCircle(x, foot - 147 * s, 23 * s);

    g.fillStyle(thief ? 0x2a211d : 0x433322);

    g.fillEllipse(
      x, foot - 157 * s,
      48 * s, 29 * s
    );

    if (thief) {
      g.fillStyle(0x38291d);

      g.fillRoundedRect(
        x + 23 * s, foot - 88 * s,
        34 * s, 43 * s, 4 * s
      );
    } else {
      g.fillStyle(0xc6ab68);

      g.fillRect(
        x - 11 * s, foot - 112 * s,
        22 * s, 8 * s
      );
    }
  }

  drawObstacle(g, obstacle, progress) {
    const position = this.project(
      obstacle.lane,
      progress
    );

    const { x, y, scale: s } = position;
    const kind = obstacle.kind;

    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(x, y, 180 * s, 31 * s);

    if (kind === 'puddle') {
      g.fillStyle(0x1f3949, 0.95);
      g.fillEllipse(x, y, 230 * s, 55 * s);

      g.lineStyle(Math.max(1, 3 * s), 0x90bdc8, 0.9);
      g.strokeEllipse(x, y - 3 * s, 180 * s, 31 * s);

      return;
    }

    if (kind === 'hedge') {
      g.fillStyle(0x456b3a);

      g.fillRoundedRect(
        x - 100 * s,
        y - 57 * s,
        200 * s,
        57 * s,
        14 * s
      );

      g.fillStyle(0x608b4d);

      for (let i = 0; i < 6; i++) {
        g.fillCircle(
          x - 80 * s + i * 32 * s,
          y - 55 * s,
          25 * s
        );
      }

      return;
    }

    if (kind === 'dog') {
      g.fillStyle(0xb58b58);

      g.fillEllipse(
        x, y - 39 * s,
        105 * s, 55 * s
      );

      g.fillCircle(
        x + 47 * s,
        y - 65 * s,
        24 * s
      );

      g.fillStyle(0x765434);

      g.fillEllipse(
        x + 35 * s,
        y - 70 * s,
        17 * s,
        31 * s
      );

      g.lineStyle(10 * s, 0xb58b58);

      g.lineBetween(
        x - 32 * s, y - 25 * s,
        x - 32 * s, y
      );

      g.lineBetween(
        x + 27 * s, y - 25 * s,
        x + 27 * s, y
      );

      g.lineBetween(
        x - 45 * s, y - 45 * s,
        x - 72 * s, y - 77 * s
      );

      g.fillStyle(0x252321);

      g.fillCircle(
        x + 65 * s,
        y - 66 * s,
        6 * s
      );

      return;
    }

    if (kind === 'shopper') {
      this.drawCivilian(
        g, x, y, s, 0x66828c
      );

      for (const side of [-1, 1]) {
        g.lineStyle(3 * s, 0x6b4b2c);

        g.strokeEllipse(
          x + side * 46 * s,
          y - 67 * s,
          20 * s,
          18 * s
        );

        g.fillStyle(side < 0 ? 0xc69d62 : 0x9b6550);

        g.fillRect(
          x + side * 46 * s - 19 * s,
          y - 63 * s,
          38 * s,
          48 * s
        );
      }

      return;
    }

    if (kind === 'crowd') {
      this.drawCivilian(
        g, x - 48 * s, y - 15 * s,
        s * 0.87, 0x8d6752
      );

      this.drawCivilian(
        g, x + 44 * s, y - 10 * s,
        s * 0.92, 0x747d44
      );

      this.drawCivilian(
        g, x, y, s, 0x95627c
      );

      g.fillStyle(0xe0ce9b);

      g.fillRect(
        x - 40 * s, y - 85 * s,
        80 * s, 42 * s
      );

      g.lineStyle(2 * s, 0x9b9977);

      g.lineBetween(
        x - 12 * s, y - 85 * s,
        x - 12 * s, y - 43 * s
      );

      return;
    }

    if (kind === 'stroller') {
      this.drawCivilian(
        g, x - 42 * s, y - 5 * s,
        s, 0x60866b
      );

      const sx = x + 38 * s;

      g.lineStyle(6 * s, 0x36383c);

      g.lineBetween(
        sx - 28 * s, y - 65 * s,
        sx - 55 * s, y - 96 * s
      );

      g.fillStyle(0x8e5458);

      g.fillRoundedRect(
        sx - 42 * s, y - 75 * s,
        85 * s, 55 * s, 15 * s
      );

      g.fillStyle(0xb67575);

      g.fillEllipse(
        sx + 6 * s, y - 75 * s,
        78 * s, 65 * s
      );

      g.fillStyle(0x24282d);
      g.fillCircle(sx - 25 * s, y - 9 * s, 13 * s);
      g.fillCircle(sx + 28 * s, y - 9 * s, 13 * s);
    }
  }

  drawCivilian(g, x, foot, scale, clothes) {
    const s = scale;

    g.lineStyle(11 * s, 0x34333b);

    g.lineBetween(
      x - 10 * s, foot - 46 * s,
      x - 15 * s, foot
    );

    g.lineBetween(
      x + 10 * s, foot - 46 * s,
      x + 15 * s, foot
    );

    g.fillStyle(clothes);

    g.fillRoundedRect(
      x - 27 * s, foot - 112 * s,
      54 * s, 70 * s, 7 * s
    );

    g.fillStyle(0xc99c7d);
    g.fillCircle(x, foot - 136 * s, 22 * s);

    g.fillStyle(0x514036);

    g.fillEllipse(
      x, foot - 147 * s,
      46 * s, 25 * s
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

    this.accumulator += Math.min(
      delta / 1000,
      0.1
    );

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

        const definition = OBSTACLES[hit];
        const penalty =
          this.record.runner.lastHit?.penalty ?? 0;

        this.setMessage(
          `${definition.message} ` +
          `Suspect gains ${penalty} m. You slow down.`
        );

        this.save();
      }

      if (
        !this.finalAnnounced &&
        this.record.phase === 'choice' &&
        inFinalZone(this.record)
      ) {
        this.finalAnnounced = true;

        this.setMessage(
          'INTERCEPT! Get behind the suspect. Stay within 7 m.',
          4000
        );
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
      width / 2, height / 2,
      width, height, 0x17110e
    ).setDepth(9000);

    this.add.text(
      width / 2,
      height / 2 - 100,
      (
        error?.message ||
        T('t_2b3807db39d1e5acecca')
      ) + T('t_792c56caa0a7c9ff3ee2'),
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
      T('t_a85865723550b5ee5f98'),
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
        message: T('t_24e443a97bf039c501e1')
      };
    }

    if (
      !gameState.arrestWarrantIssued ||
      gameState.warrantSuspectId == null
    ) {
      return {
        code: 'missing_warrant',
        arrested: false,
        message: T('t_4e25e513665583a5ab4b')
      };
    }

    if (
      String(gameState.warrantSuspectId) !==
      String(r.suspectId)
    ) {
      return {
        code: 'warrant_mismatch',
        arrested: false,
        message: T('t_688ea878866184bb08c7')
      };
    }

    if (
      !getSubmittedTheory(
        gameState,
        r.suspectId
      )
    ) {
      return {
        code: 'theory_missing',
        arrested: false,
        message: T('t_8ae4caa2004834e27f65')
      };
    }

    return {
      code: 'arrested',
      arrested: true,
      message: T('t_22d1be1625a423fb5eab')
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
              T('t_38ee665160eec26ea76b')
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
              T('t_7e251d07943af2f8a418')
            );
          }

          return;
        }

        r.failureCode =
          outcome.code === 'not_caught'
            ? 'chase_escape'
            : outcome.code;

        r.phase =
          r.failureCode === 'chase_escape'
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
            T('t_88d908325e9a83c80acf')
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
            T('t_a1d256fd73f639edac1d')
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
          T('t_c3220326f9aceb5a771f')
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