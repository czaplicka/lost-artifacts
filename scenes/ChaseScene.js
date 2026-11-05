import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { CHASE_CONFIG as C } from '../config/chaseConfig.js';

import {
  applyChoice,
  advanceRound,
  applyFinal,
  successChance,
  finalChance
} from '../systems/chaseLogic.js';

import {
  currentChase,
  persistChase,
  terminalData,
  chaseFailureCode
} from '../systems/chasePersistence.js';

import { audioManager } from '../managers/AudioManager.js';

const RUNNER = Object.freeze({
  textureKey: 'chase_runner_sheet',
  animationKey: 'chase_runner_run',
  url: 'assets/chase/chase_runner_sheet.png',
  frameWidth: 256,
  frameHeight: 256,
  frameRate: 8,
  x: 960,
  y: 530,
  minScale: 0.42,
  maxScale: 1.05
});

export class ChaseScene extends BaseScene {
  constructor() {
    super({ key: 'ChaseScene' });
  }

  init(data = {}) {
    this.sourceKey = data.sourceKey ?? null;

    const saved = currentChase();
    this.record = saved ? structuredClone(saved) : null;

    this.leaving = false;
    this.saveElapsed = 0;
    this.lastWarning = null;
    this.inputLockUntil = 0;

    this.stepsSound = null;
    this.musicSound = null;

    this.pageHideHandler = null;
    this.visibilityHandler = null;

    this.runner = null;
    this.runnerShadow = null;
    this.runnerIsSprite = false;
  }

  preload() {
    for (const [kind, url] of Object.entries(C.assets.images)) {
      const key = `chase_${kind}`;

      if (url && !this.textures.exists(key)) {
        this.load.image(key, url);
      }
    }

    if (!this.textures.exists(RUNNER.textureKey)) {
      this.load.spritesheet(
        RUNNER.textureKey,
        RUNNER.url,
        {
          frameWidth: RUNNER.frameWidth,
          frameHeight: RUNNER.frameHeight,
          startFrame: 0,
          endFrame: 2
        }
      );
    }

    for (const [kind, url] of Object.entries(C.assets.audio)) {
      const key = `chase_${kind}`;

      if (url && !this.cache.audio.exists(key)) {
        this.load.audio(key, url);
      }
    }
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

    for (const key of ['PlayerHudScene', 'UIScene', 'NewsHud']) {
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

    if (this.cache.audio.exists('chase_music')) {
      this.musicSound = audioManager.playMusic('chase_music');
    }

    this.createRunnerAnimation();

    this.art = this.add.container();

    this.add
      .rectangle(960, 125, 1800, 180, 0x21160f, 0.97)
      .setStrokeStyle(3, 0xc7ad73);

    this.add
      .text(960, 75, 'HOT PURSUIT', this.style(30, true))
      .setOrigin(0.5);

    this.distanceText = this.add.text(
      110,
      145,
      '',
      this.style(22, true)
    );

    this.roundText = this.add
      .text(1810, 145, '', this.style(18, true))
      .setOrigin(1, 0);

    this.add
      .rectangle(960, 652, 1760, 170, 0x21160f, 0.97)
      .setStrokeStyle(3, 0xc7ad73);

    this.description = this.add
      .text(960, 650, '', {
        ...this.style(30),
        align: 'center',
        wordWrap: { width: 1620 },
        lineSpacing: 8
      })
      .setOrigin(0.5);

    this.add
      .rectangle(80, 758, 1760, 14, 0x45382a)
      .setOrigin(0, 0.5);

    this.timerBar = this.add
      .rectangle(80, 758, 1760, 14, 0xd8ad58)
      .setOrigin(0, 0.5);

    this.timerText = this.add
      .text(960, 797, '', this.style(18, true))
      .setOrigin(0.5);

    this.buttons = [
      this.makeButton(500, 910, 0),
      this.makeButton(1420, 910, 1)
    ];

    this.saveNotice = this.add
      .text(960, 1009, '', {
        ...this.style(19),
        color: '#ffb28d'
      })
      .setOrigin(0.5);

    this.controlsText = this.add
      .text(
        960,
        1040,
        'CLICK A ROUTE OR USE LEFT / RIGHT ARROW KEYS',
        this.style(14, true)
      )
      .setOrigin(0.5);

    if (this.input.keyboard) {
      this.trackInputEvent(
        this.input.keyboard,
        'keydown-LEFT',
        event => {
          if (!event.repeat) {
            this.press(0);
          }
        }
      );

      this.trackInputEvent(
        this.input.keyboard,
        'keydown-RIGHT',
        event => {
          if (!event.repeat) {
            this.press(1);
          }
        }
      );

      this.trackInputEvent(
        this.input.keyboard,
        'keydown-ENTER',
        event => {
          if (
            !event.repeat &&
            this.record?.phase !== 'choice'
          ) {
            this.press(0);
          }
        }
      );
    }

    this.pageHideHandler = () => {
      if (!this.leaving) {
        this.save();
      }
    };

    this.visibilityHandler = () => {
      if (document.hidden && !this.leaving) {
        this.save();
      }

      this.syncRunnerAnimation();
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

        audioManager.releaseSound(this.stepsSound);
        audioManager.releaseSound(this.musicSound);

        this.stepsSound = null;
        this.musicSound = null;

        this.runner = null;
        this.runnerShadow = null;
        this.runnerIsSprite = false;
      }
    );

    this.render();
  }

  style(size, pixel = false) {
    return {
      fontFamily: pixel ? 'PressStart2P' : 'SpecialElite',
      fontSize: `${size}px`,
      color: '#f7e6bc'
    };
  }

  createRunnerAnimation() {
    if (!this.textures.exists(RUNNER.textureKey)) {
      console.warn(
        `[ChaseScene] Missing runner sprite: ${RUNNER.url}`
      );

      return;
    }

    this.textures
      .get(RUNNER.textureKey)
      .setFilter(Phaser.Textures.FilterMode.NEAREST);

    if (!this.anims.exists(RUNNER.animationKey)) {
      this.anims.create({
        key: RUNNER.animationKey,
        frames: [0, 1, 0, 2].map(frame => ({
          key: RUNNER.textureKey,
          frame
        })),
        frameRate: RUNNER.frameRate,
        repeat: -1
      });
    }
  }

  makeButton(x, y, index) {
    const root = this.add.container(x, y);

    const bg = this.add
      .rectangle(0, 0, 850, 180, 0x503722)
      .setStrokeStyle(3, 0xc7ad73)
      .setInteractive({ useHandCursor: true });

    const label = this.add
      .text(0, -20, '', {
        ...this.style(28),
        align: 'center',
        wordWrap: { width: 780 }
      })
      .setOrigin(0.5);

    const hint = this.add
      .text(0, 54, '', {
        ...this.style(21),
        color: '#dfbd7b',
        align: 'center',
        wordWrap: { width: 790 }
      })
      .setOrigin(0.5);

    root.add([bg, label, hint]);

    bg.on('pointerdown', () => {
      this.press(index);
    });

    bg.on('pointerover', () => {
      bg.setFillStyle(0x74502e);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x503722);
    });

    return { root, bg, label, hint };
  }

  drawPlaceholder(kind) {
    this.runner = null;
    this.runnerShadow = null;
    this.runnerIsSprite = false;

    this.art.removeAll(true);

    const colors = {
      street: 0x354047,
      courtyard: 0x414b3b,
      stairs: 0x4b4146,
      square: 0x4d493b
    };

    this.art.add(
      this.add.rectangle(
        960,
        540,
        1920,
        1080,
        colors[kind] || colors.street
      )
    );

    if (this.textures.exists(`chase_${kind}`)) {
      const image = this.add.image(
        960,
        390,
        `chase_${kind}`
      );

      const scale = Math.min(
        1760 / image.width,
        340 / image.height
      );

      this.art.add(image.setScale(scale));
    } else {
      const g = this.add.graphics();

      g.fillStyle(0x252b2d)
        .fillRect(80, 230, 550, 320)
        .fillRect(1290, 230, 550, 320);

      g.fillStyle(0x796c56)
        .fillTriangle(640, 560, 940, 290, 860, 560)
        .fillTriangle(1060, 560, 980, 290, 1280, 560);

      g.lineStyle(8, 0xd3bd85)
        .lineBetween(810, 460, 695, 390)
        .lineBetween(1110, 460, 1225, 390);

      g.lineBetween(695, 390, 705, 430);
      g.lineBetween(695, 390, 735, 385);
      g.lineBetween(1225, 390, 1185, 385);
      g.lineBetween(1225, 390, 1215, 430);

      if (kind === 'stairs') {
        for (let i = 0; i < 6; i++) {
          g.lineBetween(
            690,
            480 - i * 22,
            870,
            480 - i * 22
          );
        }
      }

      this.art.add(g);

      this.art.add(
        this.add
          .text(
            960,
            260,
            kind.toUpperCase(),
            this.style(18, true)
          )
          .setOrigin(0.5)
      );
    }

    this.createRunner();
  }

  createRunner() {
    this.runnerShadow = this.add.ellipse(
      RUNNER.x,
      RUNNER.y - 5,
      92,
      22,
      0x000000,
      0.28
    );

    this.art.add(this.runnerShadow);

    if (this.textures.exists(RUNNER.textureKey)) {
      this.runner = this.add
        .sprite(
          RUNNER.x,
          RUNNER.y,
          RUNNER.textureKey,
          0
        )
        .setOrigin(0.5, 244 / RUNNER.frameHeight);

      this.runnerIsSprite = true;
    } else {
      this.runner = this.add
        .text(
          RUNNER.x,
          RUNNER.y,
          'SPRITE MISSING',
          this.style(14, true)
        )
        .setOrigin(0.5, 1);

      this.runnerIsSprite = false;
    }

    this.art.add(this.runner);
    this.syncRunnerAnimation();
  }

  syncRunnerAnimation() {
    if (!this.runnerIsSprite || !this.runner?.anims) {
      return;
    }

    const shouldRun =
      this.record?.phase === 'choice' &&
      !this.leaving &&
      !document.hidden &&
      !chaseFailureCode(this.record);

    if (shouldRun) {
      this.runner.play(RUNNER.animationKey, true);
    } else {
      this.runner.anims.stop();
    }
  }

  refresh() {
    const r = this.record;

    this.distanceText.setText(
      `SUSPECT: ${r.distance} m`
    );

    this.roundText.setText(
      `STAGE ${Math.min(r.round + 1, C.maxRounds)} / ${C.maxRounds}`
    );

    this.timerBar.width =
      1760 * (
        r.phase === 'choice'
          ? r.remaining / C.decisionMs
          : 0
      );

    this.timerText.setText(
      r.phase === 'choice'
        ? `${Math.ceil(r.remaining / 1000)} SECONDS`
        : ''
    );

    const distanceRatio = Phaser.Math.Clamp(
      r.distance / C.escapeDistance,
      0,
      1
    );

    const scale = Phaser.Math.Linear(
      RUNNER.maxScale,
      RUNNER.minScale,
      distanceRatio
    );

    this.runner?.setScale(scale);
    this.runnerShadow?.setScale(scale);

    this.syncRunnerAnimation();
  }

  sfx(kind) {
    const key = `chase_${kind}`;

    if (this.cache.audio.exists(key)) {
      audioManager.playSfx(key);
    }
  }

  save() {
    if (!this.record) return false;

    const ok = persistChase(this.record);

    this.saveElapsed = 0;

    this.saveNotice?.setText(
      ok
        ? ''
        : 'Checkpoint unavailable. Please keep this tab open.'
    );

    return ok;
  }

  singleButton(label, hint = '') {
    this.buttons[0].root
      .setPosition(960, 910)
      .setVisible(true);

    this.buttons[0].label.setText(label);
    this.buttons[0].hint.setText(hint);

    this.buttons[1].root.setVisible(false);
  }

  render() {
    const r = this.record;

    const event = r.plan.rounds[
      Math.min(r.round, C.maxRounds - 1)
    ].event;

    this.drawPlaceholder(event.background);

    this.controlsText.setVisible(
      !(r.phase === 'settled' && r.arrestOutcome)
    );

    if (r.phase !== 'choice') {
      audioManager.releaseSound(this.stepsSound);
      this.stepsSound = null;
    }

    if (chaseFailureCode(r)) {
      this.description.setText(terminalData(r).message);
      this.singleButton('GAME OVER');
    } else if (r.phase === 'choice') {
      const current = r.plan.rounds[r.round];

      this.options = current.flip
        ? [...current.event.options].reverse()
        : current.event.options;

      this.description.setText(current.event.text);

      this.buttons.forEach((button, index) => {
        button.root
          .setPosition(index === 0 ? 500 : 1420, 910)
          .setVisible(true);

        const option = this.options[index];
        const move = C.moves[option.type];

        button.label.setText(
          `${index === 0 ? '< LEFT' : 'RIGHT >'}\n${option.text}`
        );

        button.hint.setText(
          `${Math.round(
            successChance(r.difficulty, option) * 100
          )}% | Gain ${move.gain} m / Lose ${move.loss} m`
        );
      });

      if (
        !this.stepsSound &&
        this.cache.audio.exists('chase_steps')
      ) {
        this.stepsSound =
          audioManager.playLoopSfx('chase_steps');
      }
    } else if (r.phase === 'intro') {
      this.description.setText(
        'The suspect spots you and bolts.\n' +
        'Fifty metres ahead. One very expensive pair of shoes.'
      );

      this.singleButton('START PURSUIT');
    } else if (r.phase === 'result') {
      this.drawPlaceholder(
        r.plan.rounds[
          Math.max(0, r.round - 1)
        ].event.background
      );

      this.description.setText(r.resultText);
      this.singleButton('CONTINUE');
    } else if (r.phase === 'final') {
      this.description.setText(
        'One last chance to cut off the escape.\n' +
        'The closer you are, the better your chance.'
      );

      this.singleButton(
        'MAKE THE FINAL INTERCEPTION',
        `${Math.round(
          finalChance(r.distance, r.difficulty) * 100
        )}% chance`
      );
    } else if (['caught', 'review'].includes(r.phase)) {
      this.description.setText(
        'Suspect caught.\nVerify the arrest warrant.'
      );

      this.singleButton('CHECK WARRANT');
    } else if (r.phase === 'escaped') {
      this.description.setText(
        'The suspect disappears into the city.\n' +
        'The mission has already been marked as failed.'
      );

      this.singleButton('GAME OVER');
    } else if (r.phase === 'settled') {
      if (r.arrestOutcome) {
        this.description.setText(r.arrestOutcome.message);

        this.buttons.forEach(button => {
          button.root.setVisible(false);
        });
      } else {
        this.description.setText(
          'The pursuit is already complete.'
        );

        this.singleButton('VIEW RESULT');
      }
    }

    this.refresh();
    this.inputLockUntil = this.time.now + 180;
  }

  press(index) {
    const r = this.record;

    if (
      !r ||
      this.leaving ||
      this.time.now < this.inputLockUntil
    ) {
      return;
    }

    if (r.phase === 'settled' && r.arrestOutcome) {
      const failedWarrant =
        ['missing_warrant', 'warrant_mismatch'].includes(
          r.arrestOutcome.code
        );

      if (!failedWarrant && !chaseFailureCode(r)) {
        return;
      }
    }

    if (r.phase === 'choice') {
      const before = r.distance;

      if (applyChoice(r, index)) {
        this.sfx(
          r.distance < before ? 'success' : 'failure'
        );

        this.save();

        if (['caught', 'escaped'].includes(r.phase)) {
          this.sfx(r.phase);
        }

        this.render();
      }

      return;
    }

    if (index !== 0) return;

    if (
      ['caught', 'escaped', 'review', 'settled']
        .includes(r.phase)
    ) {
      void this.finish();
      return;
    }

    const changed = r.phase === 'final'
      ? applyFinal(r)
      : advanceRound(r);

    if (changed) {
      this.lastWarning = null;
      this.save();

      if (['caught', 'escaped'].includes(r.phase)) {
        this.sfx(r.phase);
      }

      this.render();
    }
  }

  update(time, delta) {
    const r = this.record;

    if (
      !r ||
      this.leaving ||
      r.phase !== 'choice' ||
      document.hidden
    ) {
      return;
    }

    r.remaining = Math.max(0, r.remaining - delta);
    this.saveElapsed += delta;

    const seconds = Math.ceil(r.remaining / 1000);

    if (
      seconds > 0 &&
      seconds <= 5 &&
      seconds !== this.lastWarning
    ) {
      this.lastWarning = seconds;
      this.sfx('warning');
    }

    this.refresh();

    if (r.remaining === 0) {
      applyChoice(r, null);

      this.sfx(
        r.phase === 'escaped' ? 'escaped' : 'failure'
      );

      this.save();
      this.render();
    } else if (this.saveElapsed >= 1000) {
      this.save();
    }
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

    return {
      code: 'arrested',
      arrested: true,
      message:
        'Suspect caught. The warrant matches. Arrest completed.'
    };
  }

  async finish() {
    const r = this.record;

    if (!r || this.leaving) return;

    const previousOutcome = r.arrestOutcome;

    const isPreviousWarrantFailure =
      r.phase === 'settled' &&
      previousOutcome &&
      ['missing_warrant', 'warrant_mismatch'].includes(
        previousOutcome.code
      );

    if (
      !['caught', 'review', 'escaped', 'settled']
        .includes(r.phase)
    ) {
      return;
    }

    this.leaving = true;
    this.syncRunnerAnimation();

    try {
      if (
        !chaseFailureCode(r) &&
        (
          ['caught', 'review'].includes(r.phase) ||
          isPreviousWarrantFailure
        )
      ) {
        const outcome = isPreviousWarrantFailure
          ? previousOutcome
          : this.evaluateArrest();

        r.arrestOutcome = outcome;

        if (outcome.arrested) {
          r.arrestOutcome = outcome;

          // The court determines whether the case is resolved.
          r.phase = 'review';
          r.terminalScene = 'CourtScene';

          this.save();

          const opened = await this.goto('CourtScene', {
            caseId: r.caseId,
            suspectId: r.suspectId
          });

          if (opened) {
            if (
              this.sourceKey &&
              this.sourceKey !== this.sys.settings.key
            ) {
              this.scene.stop(this.sourceKey);
            }

            this.scene.stop('CityScene');
          } else if (!this._cleanupDone) {
            this.leaving = false;

            this.saveNotice?.setText(
              'Could not open the court. Press Enter to retry.'
            );
          }

          return;
        }

        r.failureCode =
          outcome.code === 'not_caught'
            ? 'chase_escape'
            : outcome.code;

        // A warrant failure does not mean the suspect escaped.
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
          if (
            this.sourceKey &&
            this.sourceKey !== this.sys.settings.key &&
            this.sourceKey !== 'GameOverScene'
          ) {
            this.scene.stop(this.sourceKey);
          }

          this.scene.stop('CityScene');
        }

        return;
      }

      if (r.phase === 'settled' && r.arrestOutcome) {
        this.leaving = false;
        this.render();
        return;
      }

      if (r.phase === 'settled' && r.terminalScene) {
        if (r.terminalScene === 'ChaseScene') {
          this.leaving = false;
          this.render();
          return;
        }

        const opened = await this.goto(r.terminalScene, {
          caseId: r.caseId,
          suspectId: r.suspectId
        });

        if (!opened && !this._cleanupDone) {
          this.leaving = false;

          this.saveNotice?.setText(
            'Could not open the result. Press Enter to retry.'
          );
        }

        return;
      }

      this.leaving = false;
    } catch (error) {
      console.error(
        '[ChaseScene] Could not finish chase:',
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
}