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

export const VIEW = Object.freeze({
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

/* ------------------------------------------------------------------ */
/*  Visual themes (picked from the saved seed, so a reload keeps it)   */
/* ------------------------------------------------------------------ */
const PALETTES = [
  {
    name: 'MORNING',
    skyTop: 0x7fb4d8, skyBottom: 0xe4ecde,
    sun: 0xfff4c4, sunX: 1480, sunY: 195,
    far: [0x9fb0b6, 0xa7b2ad, 0x95a5ae],
    near: [0x8f8a80, 0x9a8b78, 0x7d8584, 0x8a7e73],
    win: 0x56707c, winOn: 0xf3e2a0, lit: 0.04,
    ground: 0x888375, road: 0x41464b, curb: 0xc0b49c,
    lamps: false, overlay: null
  },
  {
    name: 'GOLDEN HOUR',
    skyTop: 0xe0905a, skyBottom: 0xf8dfa8,
    sun: 0xfff0b0, sunX: 420, sunY: 222,
    far: [0xb58a74, 0xb59a80, 0xa88b86],
    near: [0x8d6a58, 0x9a7a5e, 0x7d6a62, 0x8a6f55],
    win: 0x5a4440, winOn: 0xffd98a, lit: 0.25,
    ground: 0x8d7d68, road: 0x4a4440, curb: 0xd0b48a,
    lamps: true, overlay: { color: 0xff9a4a, alpha: 0.07 }
  },
  {
    name: 'DUSK',
    skyTop: 0x2d2a4f, skyBottom: 0xd2806a,
    sun: 0xffd29a, sunX: 1550, sunY: 232,
    far: [0x5a5470, 0x625a78, 0x544e68],
    near: [0x3e3a50, 0x4a4258, 0x38364a, 0x443d52],
    win: 0x2a2838, winOn: 0xffd36e, lit: 0.55,
    ground: 0x5a5663, road: 0x2d3036, curb: 0x8f8798,
    lamps: true, overlay: { color: 0x2a2a6a, alpha: 0.12 }
  }
];

const TAUNTS_FAR = [
  'Is that all you\'ve got?',
  'I do my cardio at crime scenes!',
  'See you never, detective!',
  'Nice coat! Does it come in fast?',
  'Try the stairs next time!'
];

const TAUNTS_MID = [
  'Keep up, pal!',
  'Are those dress shoes?',
  'This was supposed to be easy!',
  'Walk faster. I mean, run.'
];

const TAUNTS_NEAR = [
  'Oh no oh no oh no...',
  'Why are you still here?!',
  'Okay, okay, maybe I stole a thing...',
  'My knees! My poor knees!'
];

const INTRO_TIPS = [
  'Detective rule #1: stretch before crime.',
  'Rule #2: the dog is never the suspect.',
  'Rule #3: parked cars are a lifestyle choice.',
  'Rule #4: if it has a stroller, brake.',
  'Pro tip: cardio is just crime scenes with extra steps.'
];

const PIGEON_HITS = [
  'crowd', 'stroller', 'dog', 'shopper', 'parkedCar', 'carDoor'
];

const rand = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];

function mix(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;

  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}

function seeded(seed) {
  let s = seed >>> 0;

  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

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

    // visual state
    this.palette = PALETTES[0];
    this.parts = [];
    this.shake = 0;
    this.runTimer = 0;
    this.prevJump = 0;
    this.nextTaunt = 0;
    this.stampKey = '';
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

    this.palette = PALETTES[
      (Number(this.record.seed) >>> 0) % PALETTES.length
    ];

    this.root = this.add.container();

    this.backdrop = this.add.graphics();
    this.world = this.add.graphics();
    this.actors = this.add.graphics();
    this.effects = this.add.graphics();

    this.layers = [
      this.backdrop,
      this.world,
      this.actors,
      this.effects
    ];

    this.root.add(this.layers);

    this.createBackdrop();
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

  /* ---------------------------------------------------------------- */
  /*  Static backdrop: sky, sun, skyline, ground (drawn once)           */
  /* ---------------------------------------------------------------- */
  createBackdrop() {
    const g = this.backdrop;
    const p = this.palette;
    const rnd = seeded((Number(this.record.seed) >>> 0) + 11);
    const H = VIEW.horizon;

    g.clear();

    // sky gradient
    const top = -20;
    const bands = 26;
    const bandH = (H + 1 - top) / bands;

    for (let i = 0; i < bands; i++) {
      g.fillStyle(
        mix(p.skyTop, p.skyBottom, i / (bands - 1)),
        1
      );

      g.fillRect(
        -20,
        top + i * bandH,
        VIEW.width + 40,
        bandH + 1
      );
    }

    // sun
    g.fillStyle(p.sun, 0.16).fillCircle(p.sunX, p.sunY, 130);
    g.fillStyle(p.sun, 0.3).fillCircle(p.sunX, p.sunY, 78);
    g.fillStyle(p.sun, 1).fillCircle(p.sunX, p.sunY, 40);

    // far skyline
    let x = -40;

    while (x < VIEW.width + 40) {
      const w = 90 + rnd() * 70;
      const h = 60 + rnd() * 70;

      g.fillStyle(
        p.far[Math.floor(rnd() * p.far.length)],
        0.9
      );

      g.fillRect(x, H - h, w + 2, h);
      x += w;
    }

    // near skyline with windows
    x = -60;

    let n = 0;

    while (x < VIEW.width + 60) {
      const w = 120 + rnd() * 70;
      const h = 90 + rnd() * 100;

      g.fillStyle(p.near[n % p.near.length], 1);
      g.fillRect(x, H - h, w, h);

      g.fillStyle(0x000000, 0.14);
      g.fillRect(x, H - h, w, 6);

      for (let wy = H - h + 16; wy < H - 14; wy += 26) {
        for (let wx = x + 12; wx < x + w - 18; wx += 24) {
          const lit = rnd() < p.lit;

          g.fillStyle(
            lit ? p.winOn : p.win,
            lit ? 0.95 : 0.8
          );

          g.fillRect(wx, wy, 12, 15);
        }
      }

      if (rnd() > 0.7) {
        g.fillStyle(0x2d2f33, 1);
        g.fillRect(x + w / 2 - 1, H - h - 26, 3, 26);
      }

      x += w + rnd() * 14;
      n++;
    }

    // sidewalk, road and curbs (extended below the footer for shaking)
    this.polygon(g, p.ground, [
      [-20, H], [VIEW.width + 20, H],
      [VIEW.width + 20, 1100], [-20, 1100]
    ]);

    this.polygon(g, p.road, [
      [945, H], [975, H], [1237, 1100], [683, 1100]
    ]);

    this.polygon(g, p.curb, [
      [940, H], [945, H], [683, 1100], [660, 1100]
    ]);

    this.polygon(g, p.curb, [
      [975, H], [980, H], [1260, 1100], [1237, 1100]
    ]);

    // haze at the horizon
    for (let i = 0; i < 4; i++) {
      g.fillStyle(p.skyBottom, 0.22 - i * 0.05);
      g.fillRect(-20, H + i * 14, VIEW.width + 40, 14);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  HUD                                                               */
  /* ---------------------------------------------------------------- */
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

    this.hudBars = this.add.graphics();

    this.distanceText = this.add.text(
      380, 88, '', this.style(25)
    );

    this.routeText = this.add.text(
      900, 88, '', this.style(25)
    );

    this.hitsText = this.add.text(
      1330, 88, '', this.style(25)
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
      this.hudBars,
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

        this.tweens.killTweensOf(root);
        root.setScale(1);

        this.tweens.add({
          targets: root,
          scale: 0.95,
          duration: 70,
          yoyo: true
        });

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

    const inner = this.add.rectangle(
      960, 520, 1372, 622
    ).setStrokeStyle(1, 0xc7ad73, 0.45);

    this.overlayTitle = this.add.text(
      960, 245, '',
      {
        ...this.style(28, true),
        align: 'center'
      }
    ).setOrigin(0.5);

    this.overlayText = this.add.text(
      960, 482, '',
      {
        ...this.style(25),
        align: 'center',
        lineSpacing: 8,
        wordWrap: { width: 1240 }
      }
    ).setOrigin(0.5);

    this.overlayButton = this.makeControl(
      960, 765, 1050, 85,
      T('t_06f8ac726bb92e4eb9f0'),
      () => this.primary(),
      20
    );

    this.overlayStamp = this.add.text(
      1400, 250, '',
      {
        fontFamily: 'PressStart2P',
        fontSize: '34px',
        color: '#7bd88f',
        stroke: '#10140f',
        strokeThickness: 6
      }
    ).setOrigin(0.5).setAngle(-8).setVisible(false);

    this.overlay.add([
      shade,
      panel,
      inner,
      this.overlayTitle,
      this.overlayText,
      this.overlayButton,
      this.overlayStamp
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
    if (this.isRunning() && startJump(this.record)) {
      const state = this.record.runner;

      const x =
        VIEW.centre + state.lane * VIEW.laneSpacing;

      this.addDust(x, VIEW.ground - 2, 4, 1.2);

      if (Math.random() < 0.3) {
        this.popText(
          'HUP!', x, VIEW.ground - 230,
          '#f2e6c0', 24, 700
        );
      }
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
      this.nextTaunt = this.time.now + 3500;

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

  /** Text shown on the intro card. Subclasses may extend it. */
  introText() {
    const length = this.record.runner?.length ?? 15;

    const tip =
      INTRO_TIPS[
        (Number(this.record.seed) >>> 0) % INTRO_TIPS.length
      ];

    return (
      `ROUTE: ${length} m\n\n` +
      'LEFT / RIGHT: change position. SPACE / UP: jump.\n' +
      'Avoid people, strollers and dogs.\n' +
      'Jump over puddles and low hedges.\n\n' +
      'At the end, get behind the suspect.\n' +
      'Stay within 7 m to make the arrest.\n' +
      'Reloading restarts the entire run.\n\n' +
      `"${tip}"`
    );
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
      text = this.introText();
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

    this.updateStamp(r);

    this.inputLockUntil = this.time.now + 160;
  }

  updateStamp(r) {
    let stamp = '';
    let colour = '#7bd88f';

    if (chaseFailureCode(r)) {
      stamp = 'HE GOT AWAY!';
      colour = '#e0583d';
    } else if (
      !this.manualPause &&
      ['caught', 'review'].includes(r.phase)
    ) {
      stamp = 'GOTCHA!';
    }

    if (stamp === this.stampKey) return;

    this.stampKey = stamp;

    this.overlayStamp
      .setText(stamp)
      .setColor(colour)
      .setVisible(Boolean(stamp));

    if (stamp) {
      this.tweens.killTweensOf(this.overlayStamp);

      this.tweens.add({
        targets: this.overlayStamp,
        scale: { from: 2.4, to: 1 },
        alpha: { from: 0, to: 1 },
        duration: 300,
        ease: 'Back.easeOut'
      });
    }
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

    this.drawBars();
  }

  /** Gap meter (you vs. suspect) and route progress bar. */
  drawBars() {
    const g = this.hudBars;

    if (!g) return;

    g.clear();

    const r = this.record;
    const state = r.runner;
    const catchDistance = RUNNER_CONFIG.catchDistance;

    // gap meter
    const gx = 380;
    const gw = 420;
    const gy = 33;
    const gh = 18;
    const max = 30;

    const ratio = clamp(r.distance / max, 0, 1);
    const catchX = gx + gw * catchDistance / max;

    g.fillStyle(0x0f0a07, 1).fillRect(gx, gy, gw, gh);

    g.fillStyle(0x7bd88f, 0.3)
      .fillRect(gx, gy, gw * catchDistance / max, gh);

    g.fillStyle(
      mix(0x7bd88f, 0xe0583d, clamp(r.distance / 25, 0, 1)),
      0.9
    ).fillRect(gx, gy, gw * ratio, gh);

    g.lineStyle(2, 0xc7ad73, 1).strokeRect(gx, gy, gw, gh);

    g.lineStyle(2, 0xf2e6c0, 0.9)
      .lineBetween(catchX, gy - 4, catchX, gy + gh + 4);

    g.fillStyle(0x344e68, 1).fillCircle(gx, gy + gh / 2, 9);

    g.fillStyle(0x873d35, 1)
      .fillCircle(gx + gw * ratio, gy + gh / 2, 9);

    // route bar
    if (!state) return;

    const rx = 900;
    const rw = 600;
    const rr = clamp(state.travelled / state.length, 0, 1);
    const zone = clamp(
      (state.length - RUNNER_CONFIG.finalZone) / state.length,
      0,
      1
    );

    g.fillStyle(0x0f0a07, 1).fillRect(rx, gy, rw, gh);

    g.fillStyle(0xc7ad73, 0.9)
      .fillRect(rx, gy, rw * rr, gh);

    g.fillStyle(0xe0583d, 0.4)
      .fillRect(rx + rw * zone, gy, rw * (1 - zone), gh);

    g.lineStyle(2, 0xc7ad73, 1).strokeRect(rx, gy, rw, gh);

    g.fillStyle(0x344e68, 1)
      .fillCircle(rx + rw * rr, gy + gh / 2, 9);

    // finish flag
    g.lineStyle(3, 0xf2e6c0, 1)
      .lineBetween(rx + rw, gy - 10, rx + rw, gy + gh);

    g.fillStyle(0xe0583d, 1).fillTriangle(
      rx + rw, gy - 10,
      rx + rw + 18, gy - 4,
      rx + rw, gy + 2
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Effects: particles, pop texts, hits                               */
  /* ---------------------------------------------------------------- */
  popText(
    text, x, y,
    colour = '#ffe9a8',
    size = 26,
    duration = 1100
  ) {
    if (!this.root) return;

    const label = this.add.text(
      clamp(x, 200, 1720),
      y,
      text,
      {
        fontFamily: 'SpecialElite',
        fontSize: `${size}px`,
        color: colour,
        stroke: '#1a110b',
        strokeThickness: 6,
        align: 'center',
        wordWrap: { width: 520 }
      }
    ).setOrigin(0.5);

    this.root.add(label);

    this.tweens.add({
      targets: label,
      y: y - 70,
      alpha: 0,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy()
    });
  }

  addDust(x, y, count = 1, power = 1) {
    for (let i = 0; i < count; i++) {
      if (this.parts.length > 180) this.parts.shift();

      const life = rand(0.35, 0.75);

      this.parts.push({
        kind: 'dust',
        x: x + rand(-20, 20),
        y,
        vx: rand(-60, 60) * power,
        vy: rand(-90, -20) * power,
        g: 40,
        life,
        max: life,
        r: rand(6, 12),
        color: this.palette.curb
      });
    }
  }

  addPigeons(x, y, count = 4) {
    for (let i = 0; i < count; i++) {
      if (this.parts.length > 180) this.parts.shift();

      const life = rand(0.9, 1.4);

      this.parts.push({
        kind: 'pigeon',
        x: x + rand(-60, 60),
        y,
        vx: rand(-420, 420),
        vy: rand(-520, -260),
        g: 0,
        life,
        max: life,
        r: 0,
        color: 0x8a9094
      });
    }
  }

  updateParticles(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];

      p.life -= dt;

      if (p.life <= 0) {
        this.parts.splice(i, 1);
        continue;
      }

      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  drawParticles(fx) {
    for (const p of this.parts) {
      const a = clamp(p.life / p.max, 0, 1);

      if (p.kind === 'pigeon') {
        const flap = Math.sin((p.max - p.life) * 28);

        fx.lineStyle(4, 0x6f7478, a);
        fx.lineBetween(p.x - 14, p.y - flap * 10, p.x, p.y);
        fx.lineBetween(p.x + 14, p.y - flap * 10, p.x, p.y);

        fx.fillStyle(p.color, a);
        fx.fillEllipse(p.x, p.y + 2, 14, 9);
      } else {
        fx.fillStyle(p.color, a * 0.55);
        fx.fillCircle(p.x, p.y, p.r * (1.3 - a * 0.3));
      }
    }
  }

  onHit(kind) {
    const state = this.record.runner;
    const definition = OBSTACLES[kind];
    const penalty = state.lastHit?.penalty ?? 0;

    const x = clamp(
      VIEW.centre + state.lane * VIEW.laneSpacing,
      200,
      1720
    );

    this.hitFlash = 0.55;
    this.shake = 0.5;

    if (definition) {
      this.setMessage(
        `${definition.message} ` +
        `Suspect gains ${penalty} m. You slow down.`
      );
    }

    this.popText(
      `+${penalty} m`,
      x,
      VIEW.ground - 250,
      '#ff9b7e',
      32
    );

    this.addDust(x, VIEW.ground - 2, 8, 1.6);

    if (PIGEON_HITS.includes(kind)) {
      this.addPigeons(x, VIEW.ground - 140, 5);
    }
  }

  /** Dust trail, landing puffs and the suspect's commentary. */
  stepEffects(dt) {
    const state = this.record.runner;

    if (!state) return;

    const x = VIEW.centre + state.lane * VIEW.laneSpacing;

    this.runTimer -= dt;

    if (this.runTimer <= 0 && jumpHeight(state) <= 2) {
      this.runTimer = state.slow > 0 ? 0.2 : 0.09;
      this.addDust(x, VIEW.ground - 2, 1, 0.7);
    }

    if (this.prevJump > 0 && state.jump <= 0) {
      this.addDust(x, VIEW.ground - 2, 6, 1.3);
    }

    this.prevJump = state.jump;

    if (this.time.now >= this.nextTaunt) {
      this.nextTaunt = this.time.now + rand(5000, 8000);

      const distance = this.record.distance;

      const list =
        distance > 18
          ? TAUNTS_FAR
          : distance > RUNNER_CONFIG.catchDistance
            ? TAUNTS_MID
            : TAUNTS_NEAR;

      const position = this.project(
        state.thiefLane,
        thiefProgress(this.record)
      );

      this.popText(
        pick(list),
        position.x,
        position.y - 200 * position.scale - 20,
        '#ffd0c4',
        22,
        1900
      );
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Drawing                                                           */
  /* ---------------------------------------------------------------- */
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
    const pal = this.palette;

    g.clear();
    a.clear();
    fx.clear();

    const state = this.record.runner;
    const elapsed = state?.elapsed ?? 0;
    const running = this.isRunning();

    // screen shake + running bob
    const mag = this.shake * 18;
    const bob = running ? Math.sin(elapsed * 14) * 1.6 : 0;

    for (const layer of this.layers) {
      layer.setPosition(
        mag ? (Math.random() - 0.5) * mag : 0,
        (mag ? (Math.random() - 0.5) * mag : 0) + bob
      );
    }

    // scrolling pavement and road texture
    const offset = (elapsed * 0.38) % 1;

    for (let i = 0; i < 10; i++) {
      const p = (i / 10 + offset) % 1;
      const y = VIEW.horizon +
        (950 - VIEW.horizon) * p * p;

      const left = 945 - 215 * p * p;
      const right = 975 + 215 * p * p;

      g.lineStyle(1 + p * 2, 0x3d3a35, 0.25);
      g.lineBetween(-20, y, left - 20, y);
      g.lineBetween(right + 20, y, 1940, y);

      g.lineStyle(1 + p * 2, 0x000000, 0.09);
      g.lineBetween(left + 4, y, right - 4, y);
    }

    // paving joints on the pavements
    for (const k of [-12, -9, -6, -4, -2, 2, 4, 6, 9, 12]) {
      g.lineStyle(1, 0x000000, 0.12);

      g.lineBetween(
        VIEW.centre + k * 14, VIEW.horizon,
        VIEW.centre + k * 160, 950
      );
    }

    // upcoming obstacle warnings (yellow: jump, red: dodge)
    if (state && this.record.phase === 'choice') {
      for (const row of visibleRows(this.record)) {
        if (row.progress > 0.4) continue;

        const alpha = clamp(1 - row.progress / 0.4, 0, 1);

        for (const obstacle of row.obstacles) {
          const jumpable =
            OBSTACLES[obstacle.kind].jumpable;

          this.drawWarning(
            fx,
            VIEW.centre + obstacle.lane * VIEW.laneSpacing * 0.35,
            330,
            jumpable ? 0xf2c14e : 0xe0583d,
            alpha * 0.9,
            jumpable
          );
        }
      }
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
          const ready =
            this.record.distance <=
            RUNNER_CONFIG.catchDistance;

          const ringColour = ready ? 0x7bd88f : 0xe8c36d;
          const pulse =
            Math.sin(this.time.now / 140) * 6 * position.scale;

          a.lineStyle(5, ringColour, 0.9);

          a.strokeEllipse(
            position.x,
            position.y + 4,
            125 * position.scale + pulse,
            34 * position.scale + pulse * 0.3
          );

          // bobbing "arrest here" arrow
          const top =
            position.y - 215 * position.scale - 14 * position.scale +
            pulse;

          a.fillStyle(ringColour, 0.95);

          a.fillTriangle(
            position.x, top,
            position.x - 22 * position.scale, top - 34 * position.scale,
            position.x + 22 * position.scale, top - 34 * position.scale
          );
        }
      } else {
        this.drawPlayer(a, state, elapsed);
      }
    }

    // speed lines
    if (running && state && state.slow <= 0) {
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2 + 0.2;
        const phase = (elapsed * 0.8 + i * 0.37) % 1;
        const r0 = 380 + phase * 900;
        const r1 = r0 + 110 + phase * 160;

        fx.lineStyle(2, 0xffffff, 0.05 * (1 - phase));

        fx.lineBetween(
          VIEW.centre + Math.cos(angle) * r0,
          520 + Math.sin(angle) * r0 * 0.55,
          VIEW.centre + Math.cos(angle) * r1,
          520 + Math.sin(angle) * r1 * 0.55
        );
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

    this.drawParticles(fx);

    if (pal.overlay) {
      fx.fillStyle(pal.overlay.color, pal.overlay.alpha);
      fx.fillRect(-20, 136, VIEW.width + 40, 814);
    }

    if (this.hitFlash > 0) {
      fx.fillStyle(
        0xaa3322,
        Math.min(0.18, this.hitFlash * 0.35)
      );

      fx.fillRect(-20, 220, VIEW.width + 40, 720);
    }
  }

  drawWarning(g, x, y, colour, alpha, jumpable) {
    g.fillStyle(0x000000, alpha * 0.35);

    g.fillTriangle(
      x + 3, y - 22 + 4,
      x - 24 + 3, y + 20 + 4,
      x + 24 + 3, y + 20 + 4
    );

    g.fillStyle(colour, alpha);

    g.fillTriangle(
      x, y - 22,
      x - 24, y + 20,
      x + 24, y + 20
    );

    g.fillStyle(0x1a110b, alpha);

    if (jumpable) {
      // chevron: jump
      g.lineStyle(4, 0x1a110b, alpha);
      g.lineBetween(x - 9, y + 12, x, y + 1);
      g.lineBetween(x, y + 1, x + 9, y + 12);
    } else {
      // exclamation mark: dodge
      g.fillRect(x - 2.5, y - 8, 5, 15);
      g.fillCircle(x, y + 13, 3);
    }
  }

  drawScenery(g, side, progress, index) {
    const p = clamp(progress, 0, 1.15);
    const s = 0.05 + p;
    const pal = this.palette;

    const x = VIEW.centre + side * 820 * p;
    const y = VIEW.horizon +
      (VIEW.ground - VIEW.horizon) * p * p;

    const kind = (index * 3 + (side > 0 ? 2 : 0)) % 5;

    if (kind === 0) {
      // townhouse
      const width = 230 * s;
      const height = (260 + index % 3 * 55) * s;

      g.fillStyle(pal.near[index % pal.near.length]);

      g.fillRect(
        x - width / 2,
        y - height,
        width,
        height
      );

      g.fillStyle(0x000000, 0.18);

      g.fillRect(
        x - width / 2 - 6 * s,
        y - height - 8 * s,
        width + 12 * s,
        12 * s
      );

      for (let row = 0; row < 3; row++) {
        for (let column = 0; column < 3; column++) {
          const lit =
            (index * 7 + row * 3 + column * 5 +
              (side > 0 ? 1 : 0)) % 4 < pal.lit * 4;

          g.fillStyle(lit ? pal.winOn : 0x4c555c);

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
    } else if (kind === 3) {
      // shop with a striped awning
      const width = 250 * s;
      const height = 210 * s;
      const x0 = x - width / 2;

      g.fillStyle(pal.near[(index + 1) % pal.near.length]);
      g.fillRect(x0, y - height, width, height);

      g.fillStyle(pal.lit > 0.2 ? pal.winOn : 0x2f3a40);

      g.fillRect(
        x0 + 18 * s,
        y - 85 * s,
        width - 36 * s,
        62 * s
      );

      const stripe = width / 6;

      for (let i = 0; i < 6; i++) {
        this.polygon(
          g,
          i % 2 ? 0xf0e6cf : 0xc2503f,
          [
            [x0 + i * stripe, y - 125 * s],
            [x0 + (i + 1) * stripe, y - 125 * s],
            [x0 + (i + 1) * stripe + 4 * s, y - 95 * s],
            [x0 + i * stripe - 4 * s, y - 95 * s]
          ]
        );
      }

      g.fillStyle(0xe8dcc0);

      g.fillRect(
        x - 55 * s,
        y - height + 22 * s,
        110 * s,
        28 * s
      );

      g.fillStyle(0x5a3b2a);

      g.fillRect(
        x - 38 * s,
        y - height + 30 * s,
        76 * s,
        6 * s
      );
    } else if (kind === 2) {
      // street lamp
      const headX = x - side * 55 * s;
      const headY = y - 262 * s;

      g.fillStyle(0x2d2f33);

      g.fillRect(
        x - 5 * s,
        y - 260 * s,
        10 * s,
        260 * s
      );

      g.lineStyle(Math.max(1, 8 * s), 0x2d2f33);
      g.lineBetween(x, y - 255 * s, headX, headY);

      if (pal.lamps) {
        g.fillStyle(0xffe9a8, 0.22);
        g.fillCircle(headX, headY + 10 * s, 60 * s);
      }

      g.fillStyle(pal.lamps ? 0xffe9a8 : 0x55595e);
      g.fillEllipse(headX, headY, 34 * s, 14 * s);
    } else {
      // tree
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

      g.fillStyle(0xffffff, 0.08);

      g.fillCircle(
        x - 20 * s,
        y - 205 * s,
        40 * s
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

    const flap = Math.sin(elapsed * 15 + 1) * 9 * s;
    const shoulder = foot - 112 * s;

    // legs and shoes
    g.lineStyle(15 * s, 0x25282d);

    g.lineBetween(
      x - 13 * s, foot - 58 * s,
      x - (18 + swing) * s, foot
    );

    g.lineBetween(
      x + 13 * s, foot - 58 * s,
      x + (18 + swing) * s, foot - 5 * s
    );

    g.fillStyle(0x15171a);

    g.fillEllipse(
      x - (18 + swing) * s, foot, 26 * s, 11 * s
    );

    g.fillEllipse(
      x + (18 + swing) * s, foot - 5 * s, 26 * s, 11 * s
    );

    // coat tails
    this.polygon(g, coat, [
      [x - 30 * s, foot - 62 * s],
      [x + 30 * s, foot - 62 * s],
      [x + 38 * s + flap, foot - 30 * s],
      [x - 38 * s + flap, foot - 32 * s]
    ]);

    // arms
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

    // torso
    g.fillStyle(coat);

    g.fillRoundedRect(
      x - 32 * s, foot - 123 * s,
      64 * s, 72 * s, 8 * s
    );

    if (thief) {
      g.fillStyle(0x1b1b1f, 0.8);

      for (let i = 0; i < 4; i++) {
        g.fillRect(
          x - 32 * s,
          foot - 114 * s + i * 17 * s,
          64 * s,
          6 * s
        );
      }
    } else {
      g.lineStyle(Math.max(1, 3 * s), 0x1f2a36);

      g.lineBetween(
        x - 32 * s, foot - 82 * s,
        x + 32 * s, foot - 82 * s
      );
    }

    // head
    g.fillStyle(0xc99673);
    g.fillCircle(x, foot - 147 * s, 23 * s);

    if (thief) {
      // beanie, eye mask and a very suspicious bag
      g.fillStyle(0x1f1f24);

      g.fillEllipse(
        x, foot - 162 * s,
        50 * s, 28 * s
      );

      g.fillStyle(0x15151a);

      g.fillRect(
        x - 19 * s, foot - 153 * s,
        38 * s, 9 * s
      );

      g.fillStyle(0x38291d);

      g.fillRoundedRect(
        x + 23 * s, foot - 88 * s,
        34 * s, 43 * s, 4 * s
      );

      g.fillStyle(0xe8c36d);

      g.fillCircle(
        x + 40 * s, foot - 66 * s, 8 * s
      );
    } else {
      // fedora and collar
      g.fillStyle(0x2b2320);

      g.fillEllipse(
        x, foot - 160 * s,
        68 * s, 14 * s
      );

      g.fillRoundedRect(
        x - 19 * s, foot - 188 * s,
        38 * s, 30 * s, 6 * s
      );

      g.fillStyle(0xc6ab68);

      g.fillRect(
        x - 19 * s, foot - 168 * s,
        38 * s, 6 * s
      );

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

      g.fillStyle(0x6fa0b4, 0.45);
      g.fillEllipse(x - 20 * s, y - 6 * s, 120 * s, 18 * s);

      g.lineStyle(Math.max(1, 3 * s), 0x90bdc8, 0.9);
      g.strokeEllipse(x, y - 3 * s, 180 * s, 31 * s);

      // rubber duck, because why not
      if (obstacle.lane === 1) {
        g.fillStyle(0xf2cf3d);
        g.fillCircle(x + 40 * s, y - 10 * s, 11 * s);
        g.fillCircle(x + 50 * s, y - 20 * s, 7 * s);

        g.fillStyle(0xe6812a);

        g.fillTriangle(
          x + 56 * s, y - 20 * s,
          x + 66 * s, y - 17 * s,
          x + 56 * s, y - 15 * s
        );
      }

      return;
    }

    if (kind === 'hedge') {
      g.fillStyle(0x365a2d);

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

      g.fillStyle(0x7fae66, 0.6);

      for (let i = 0; i < 5; i++) {
        g.fillCircle(
          x - 65 * s + i * 32 * s,
          y - 62 * s,
          9 * s
        );
      }

      // tiny sign: keep off the grass
      if (obstacle.lane === -1) {
        g.lineStyle(Math.max(1, 4 * s), 0x5a3b2a);

        g.lineBetween(
          x + 70 * s, y - 20 * s,
          x + 70 * s, y - 95 * s
        );

        g.fillStyle(0xf0e6cf);

        g.fillRect(
          x + 50 * s, y - 112 * s,
          42 * s, 26 * s
        );

        g.lineStyle(Math.max(1, 2 * s), 0xa8442f);

        g.lineBetween(
          x + 55 * s, y - 107 * s,
          x + 87 * s, y - 91 * s
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

      // wagging tail
      const wag = Math.sin(this.time.now / 90) * 12;

      g.lineBetween(
        x - 45 * s, y - 45 * s,
        x - (72 + wag * 0.4) * s, (y - 77 * s) + wag * s
      );

      // collar and tongue
      g.fillStyle(0xc94f43);

      g.fillRect(
        x + 28 * s, y - 52 * s,
        14 * s, 7 * s
      );

      g.fillStyle(0xe58a95);

      g.fillEllipse(
        x + 62 * s, y - 52 * s,
        10 * s, 15 * s
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

    const dt = delta / 1000;

    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.shake = Math.max(0, this.shake - dt * 1.8);

    this.updateParticles(dt);

    if (!this.isRunning()) {
      this.accumulator = 0;
      this.drawWorld();
      this.refreshHUD();
      return;
    }

    this.accumulator += Math.min(dt, 0.1);

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
        this.onHit(hit);
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

    if (this.record.phase === 'choice') {
      this.stepEffects(dt);
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