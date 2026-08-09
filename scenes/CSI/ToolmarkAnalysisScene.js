import { BaseScene } from '../BaseScene.js';
import { LabTerminal, TERM } from './LabTerminal.js';

const BAR = 41;
const ZONE = 7;

export class ToolmarkAnalysisScene extends BaseScene {
  constructor() {
    super('ToolmarkAnalysisScene');

    this.term = null;
    this.mover = null;
    this.barText = null;
    this.statusText = null;

    this.stationId = 'trace_0';
    this.evidenceType = 'toolmark_profile';
    this.correctValue = 'triple_rake_left_handed';
    this.clue = null;

    this.score = 100;
    this.mistakes = 0;
    this.startedAt = 0;

    this.locks = 0;
    this.pos = 0;
    this.dir = 1;
    this.speed = 55;
    this.zoneStart = 0;

    this.finished = false;
    this.returningToLab = false;
    this._busy = false;
  }

  init(data = {}) {
    const evidenceConfig = data.evidenceConfig || {};

    this.stationId = data.stationId || 'trace_0';

    this.evidenceType = data.evidenceType
      || evidenceConfig.evidenceType
      || 'toolmark_profile';

    this.correctValue = data.correctValue
      ?? evidenceConfig.correctValue
      ?? 'triple_rake_left_handed';

    this.clue = data.clue || {
      id: evidenceConfig.id || 'lock_cylinder_marks',
      type: data.clueType || evidenceConfig.clueType || 'means',
      text: data.clueText
        || evidenceConfig.clueText
        || 'The museum lock was picked by a skilled, left-handed intruder using a triple-rake pick.',
      facts: {
        tool: 'triple-rake pick',
        skill: 'advanced lockpicking',
        hand: 'left-handed'
      }
    };

    this.score = data.startScore ?? 100;
    this.mistakes = 0;
    this.startedAt = 0;

    this.locks = 0;
    this.pos = 0;
    this.dir = 1;
    this.speed = 55;
    this.zoneStart = Phaser.Math.Between(4, BAR - ZONE - 4);

    this.finished = false;
    this.returningToLab = false;
    this._busy = false;
  }

  create() {
    super.create();

    this.startedAt = this.time.now;

    this.term = new LabTerminal(this, {
      title: 'MARK AGENCY // TOOLMARK COMPARATOR TC-12',
      maxLines: 10
    });

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanup,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.DESTROY,
      this.cleanup,
      this
    );

    this.showIntro();
  }

  async showIntro() {
    await this.term.print(
      '> SAMPLE LOADED: lock_cylinder_fragment_03'
    );

    await this.term.print(
      '> DAMAGE TYPE: precision scratches on brass pins.'
    );

    await this.term.print(
      '> MAGNIFICATION: unstable. probably haunted.'
    );

    await this.term.print(
      '> HIT [SPACE] WHEN # IS INSIDE THE <===> ZONE.'
    );

    await this.term.print(
      '> THREE CLEAN FOCUS LOCKS REQUIRED.',
      { color: TERM.amber }
    );

    this.startFocusGame();
  }

  startFocusGame() {
    this.barText = this.add.text(
      this.term.x + 16,
      this.term.y + this.term.h - 160,
      '',
      {
        fontFamily: '"Courier New"',
        fontSize: '24px',
        color: TERM.green
      }
    );

    this.statusText = this.add.text(
      this.term.x + 16,
      this.term.y + this.term.h - 118,
      '',
      {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        color: TERM.amber
      }
    );

    this.renderFocusBar();

    this.mover = this.time.addEvent({
      delay: this.speed,
      loop: true,
      callback: () => this.tickFocus()
    });

    this.input.keyboard.on(
      'keydown-SPACE',
      this.tryFocusLock,
      this
    );
  }

  tickFocus() {
    if (this.finished) return;

    this.pos += this.dir;

    if (this.pos <= 0 || this.pos >= BAR - 1) {
      this.dir *= -1;
    }

    this.renderFocusBar();
  }

  renderFocusBar() {
    if (!this.barText || !this.statusText) return;

    const chars = new Array(BAR).fill('-');

    for (
      let index = this.zoneStart;
      index < this.zoneStart + ZONE;
      index++
    ) {
      chars[index] = '=';
    }

    chars[this.zoneStart] = '<';
    chars[this.zoneStart + ZONE - 1] = '>';
    chars[this.pos] = '#';

    this.barText.setText(chars.join(''));
    this.statusText.setText(
      `FOCUS LOCKS: ${this.locks}/3 | SCORE: ${this.score}`
    );
  }

  async tryFocusLock() {
    if (this._busy || this.finished || this.locks >= 3) {
      return;
    }

    this._busy = true;

    const hit = (
      this.pos >= this.zoneStart
      && this.pos < this.zoneStart + ZONE
    );

    if (!hit) {
      this.registerMistake();

      await this.term.print(
        '> FOCUS LOST. you have identified approximately one blur. (-15 PTS)',
        { color: TERM.red }
      );

      this._busy = false;
      return;
    }

    this.locks += 1;
    this.term.blip(1200, 0.09);

    await this.term.print(
      `> SCRATCH PATTERN LOCKED ${this.locks}/3 ... unusually neat.`
    );

    if (this.locks >= 3) {
      this.finishAnalysis();
      return;
    }

    this.increaseSpeed();
    this.zoneStart = Phaser.Math.Between(
      4,
      BAR - ZONE - 4
    );

    this._busy = false;
  }

  registerMistake() {
    this.mistakes += 1;
    this.score = Math.max(0, this.score - 15);

    this.term.blip(140, 0.15, 'sawtooth');
    this.renderFocusBar();
  }

  increaseSpeed() {
    this.speed = Math.max(25, this.speed - 10);

    if (this.mover) {
      this.mover.remove();
      this.mover = null;
    }

    this.mover = this.time.addEvent({
      delay: this.speed,
      loop: true,
      callback: () => this.tickFocus()
    });
  }

  getTimeBonus() {
    const secondsElapsed = Math.floor(
      (this.time.now - this.startedAt) / 1000
    );

    if (secondsElapsed <= 15) {
      return 20;
    }

    if (secondsElapsed <= 30) {
      return 10;
    }

    return 0;
  }

  getSecondsElapsed() {
    return Math.floor(
      (this.time.now - this.startedAt) / 1000
    );
  }

  async finishAnalysis() {
    if (this.finished) return;

    this.finished = true;

    if (this.mover) {
      this.mover.remove();
      this.mover = null;
    }

    this.input.keyboard.off(
      'keydown-SPACE',
      this.tryFocusLock,
      this
    );

    if (this.barText) {
      this.barText.setVisible(false);
    }

    if (this.statusText) {
      this.statusText.setVisible(false);
    }

    const timeBonus = this.getTimeBonus();

    this.score = Math.min(120, this.score + timeBonus);

    await this.term.progress(
      'COMPARING MICRO-SCRATCHES',
      1600
    );

    await this.term.print(
      '> REPORT #6612 — TOOLMARK ANALYSIS'
    );

    await this.term.print(
      '> ENTRY METHOD: PICKED LOCK'
    );

    await this.term.print(
      '> TOOL PROFILE: TRIPLE-RAKE PICK'
    );

    await this.term.print(
      '> OPERATOR: EXPERIENCED'
    );

    await this.term.print(
      '> ANGLE OF ENTRY: LEFT-HANDED'
    );

    await this.term.print(
      '> CONCLUSION: not a desperate amateur. a professional with opinions.',
      { color: TERM.amber }
    );

    if (timeBonus > 0) {
      await this.term.print(
        `> SPEED BONUS: +${timeBonus} PTS.`,
        { color: TERM.amber }
      );
    }

    await this.term.print(
      '> CLUE READY FOR CASE FILE.',
      { color: TERM.amber }
    );

    this.term.button(
      'ADD TO CASE FILE',
      TERM.green,
      () => this.returnResultToCrimeLab()
    );
  }

  returnResultToCrimeLab() {
    if (this.returningToLab) return;

    this.returningToLab = true;

    const payload = {
      aborted: false,
      completed: true,
      stationId: this.stationId,
      evidenceType: this.evidenceType,
      value: this.correctValue,
      score: this.score,
      mistakes: this.mistakes,
      secondsElapsed: this.getSecondsElapsed(),
      clue: this.clue
    };

    this.events.emit('minigame-complete', payload);

    this.events.emit('minigame-closed', {
      aborted: false,
      payload
    });

    this.scene.stop();
  }

  cleanup() {
    if (this.mover) {
      this.mover.remove();
      this.mover = null;
    }

    this.input.keyboard.off(
      'keydown-SPACE',
      this.tryFocusLock,
      this
    );
  }
}