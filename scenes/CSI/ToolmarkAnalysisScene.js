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

    this._toolmarkDisposed = true;
    this._toolmarkSession = 0;
  }


  init(data = {}) {
    const evidenceConfig = data.evidenceConfig || {};

    this.stationId = data.stationId || 'trace_0';

    this.evidenceType =
      data.evidenceType ||
      evidenceConfig.evidenceType ||
      'toolmark_profile';

    this.correctValue =
      data.correctValue ??
      evidenceConfig.correctValue ??
      'triple_rake_left_handed';

    this.clue = data.clue || {
      id: evidenceConfig.id || 'lock_cylinder_marks',
      type:
        data.clueType ||
        evidenceConfig.clueType ||
        'means',
      text:
        data.clueText ||
        evidenceConfig.clueText ||
        'The museum lock was picked by a skilled, left-handed intruder using a triple-rake pick.',
      facts: {
        tool: 'triple-rake pick',
        skill: 'advanced lockpicking',
        hand: 'left-handed'
      }
    };

    this.term = null;
    this.mover = null;
    this.barText = null;
    this.statusText = null;

    this.score = data.startScore ?? 100;
    this.mistakes = 0;
    this.startedAt = 0;

    this.locks = 0;
    this.pos = 0;
    this.dir = 1;
    this.speed = 55;
    this.zoneStart = Phaser.Math.Between(
      4,
      BAR - ZONE - 4
    );

    this.finished = false;
    this.returningToLab = false;
    this._busy = false;

    this._toolmarkDisposed = true;
    this._toolmarkSession += 1;
  }


  create() {
    super.create();

    this._toolmarkDisposed = false;
    this._toolmarkSession += 1;
    this.startedAt = this.time.now;

    this.term = new LabTerminal(this, {
      title: 'MARK AGENCY // TOOLMARK COMPARATOR TC-12',
      maxLines: 10
    });

    this.showIntro();
  }


  isCurrentSession(session, terminal = this.term) {
    return (
      !this._toolmarkDisposed &&
      !this._cleanupDone &&
      !this.returningToLab &&
      session === this._toolmarkSession &&
      terminal === this.term &&
      Boolean(terminal) &&
      !terminal.destroyed
    );
  }


  async terminalAction(session, terminal, action) {
    if (!this.isCurrentSession(session, terminal)) {
      return false;
    }

    const result = await action();

    return (
      result !== false &&
      this.isCurrentSession(session, terminal)
    );
  }


  async printLines(session, terminal, lines) {
    for (const [text, options = {}] of lines) {
      const current = await this.terminalAction(
        session,
        terminal,
        () => terminal.print(text, options)
      );

      if (!current) return false;
    }

    return true;
  }


  async showIntro() {
    const terminal = this.term;
    const session = this._toolmarkSession;

    const printed = await this.printLines(
      session,
      terminal,
      [
        [
          '> SAMPLE LOADED: lock_cylinder_fragment_03'
        ],
        [
          '> DAMAGE TYPE: precision scratches on brass pins.'
        ],
        [
          '> MAGNIFICATION: unstable. probably haunted.'
        ],
        [
          '> HIT [SPACE] WHEN # IS INSIDE THE <===> ZONE.'
        ],
        [
          '> THREE CLEAN FOCUS LOCKS REQUIRED.',
          { color: TERM.amber }
        ]
      ]
    );

    if (!printed) return;

    this.startFocusGame();
  }


  startFocusGame() {
    const terminal = this.term;

    if (
      !this.isCurrentSession(
        this._toolmarkSession,
        terminal
      ) ||
      this.finished ||
      this.mover
    ) {
      return;
    }

    this.barText = this.add.text(
      terminal.x + 16,
      terminal.y + terminal.h - 160,
      '',
      {
        fontFamily: '"Courier New"',
        fontSize: '24px',
        color: TERM.green
      }
    );

    this.statusText = this.add.text(
      terminal.x + 16,
      terminal.y + terminal.h - 118,
      '',
      {
        fontFamily: '"PressStart2P"',
        fontSize: '12px',
        color: TERM.amber
      }
    );

    this.renderFocusBar();
    this.startMover();

    if (this.input.keyboard) {
      this.trackInputEvent(
        this.input.keyboard,
        'keydown-SPACE',
        this.tryFocusLock,
        this
      );
    }
  }


  stopMover() {
    this.mover?.remove(false);
    this.mover = null;
  }


  startMover() {
    this.stopMover();

    if (this._toolmarkDisposed || this.finished) {
      return;
    }

    const session = this._toolmarkSession;

    this.mover = this.time.addEvent({
      delay: this.speed,
      loop: true,
      callback: () => {
        if (!this.isCurrentSession(session)) return;

        this.tickFocus();
      }
    });
  }


  detachFocusInput() {
    if (!this.input?.keyboard) return;

    this.offTrackedInputEvent(
      this.input.keyboard,
      'keydown-SPACE',
      this.tryFocusLock,
      this
    );
  }


  tickFocus() {
    if (this._toolmarkDisposed || this.finished) return;

    this.pos += this.dir;

    if (this.pos <= 0) {
      this.pos = 0;
      this.dir = 1;
    } else if (this.pos >= BAR - 1) {
      this.pos = BAR - 1;
      this.dir = -1;
    }

    this.renderFocusBar();
  }


  renderFocusBar() {
    if (
      this._toolmarkDisposed ||
      !this.barText?.scene ||
      !this.statusText?.scene
    ) {
      return;
    }

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
    const terminal = this.term;
    const session = this._toolmarkSession;

    if (
      this._busy ||
      this.finished ||
      this.locks >= 3 ||
      !this.isCurrentSession(session, terminal)
    ) {
      return;
    }

    this._busy = true;

    try {
      const hit = (
        this.pos >= this.zoneStart &&
        this.pos < this.zoneStart + ZONE
      );

      if (!hit) {
        this.registerMistake();

        await this.terminalAction(
          session,
          terminal,
          () => terminal.print(
            '> FOCUS LOST. you have identified approximately one blur. (-15 PTS)',
            { color: TERM.red }
          )
        );

        return;
      }

      this.locks += 1;
      this.renderFocusBar();
      terminal.blip(1200, 0.09);

      const printed = await this.terminalAction(
        session,
        terminal,
        () => terminal.print(
          `> SCRATCH PATTERN LOCKED ${this.locks}/3 ... unusually neat.`
        )
      );

      if (!printed) return;

      if (this.locks >= 3) {
        await this.finishAnalysis();
        return;
      }

      this.zoneStart = Phaser.Math.Between(
        4,
        BAR - ZONE - 4
      );

      this.increaseSpeed();
      this.renderFocusBar();
    } finally {
      if (this.isCurrentSession(session, terminal)) {
        this._busy = false;
      }
    }
  }


  registerMistake() {
    if (this._toolmarkDisposed || this.finished) return;

    this.mistakes += 1;
    this.score = Math.max(0, this.score - 15);

    this.term?.blip(140, 0.15, 'sawtooth');
    this.renderFocusBar();
  }


  increaseSpeed() {
    this.speed = Math.max(25, this.speed - 10);
    this.startMover();
  }


  getTimeBonus() {
    const secondsElapsed = this.getSecondsElapsed();

    if (secondsElapsed <= 15) return 20;
    if (secondsElapsed <= 30) return 10;

    return 0;
  }


  getSecondsElapsed() {
    return Math.floor(
      (this.time.now - this.startedAt) / 1000
    );
  }


  async finishAnalysis() {
    const terminal = this.term;
    const session = this._toolmarkSession;

    if (
      this.finished ||
      !this.isCurrentSession(session, terminal)
    ) {
      return;
    }

    this.finished = true;

    this.stopMover();
    this.detachFocusInput();

    this.barText?.setVisible(false);
    this.statusText?.setVisible(false);

    const timeBonus = this.getTimeBonus();

    this.score = Math.min(120, this.score + timeBonus);

    const compared = await this.terminalAction(
      session,
      terminal,
      () => terminal.progress(
        'COMPARING MICRO-SCRATCHES',
        1600
      )
    );

    if (!compared) return;

    const lines = [
      [
        '> REPORT #6612 — TOOLMARK ANALYSIS'
      ],
      [
        '> ENTRY METHOD: PICKED LOCK'
      ],
      [
        '> TOOL PROFILE: TRIPLE-RAKE PICK'
      ],
      [
        '> OPERATOR: EXPERIENCED'
      ],
      [
        '> ANGLE OF ENTRY: LEFT-HANDED'
      ],
      [
        '> CONCLUSION: not a desperate amateur. a professional with opinions.',
        { color: TERM.amber }
      ]
    ];

    if (timeBonus > 0) {
      lines.push([
        `> SPEED BONUS: +${timeBonus} PTS.`,
        { color: TERM.amber }
      ]);
    }

    lines.push([
      '> CLUE READY FOR CASE FILE.',
      { color: TERM.amber }
    ]);

    const printed = await this.printLines(
      session,
      terminal,
      lines
    );

    if (!printed) return;

    terminal.button(
      'ADD TO CASE FILE',
      TERM.green,
      () => {
        if (!this.isCurrentSession(session, terminal)) {
          return;
        }

        this.returnResultToCrimeLab();
      }
    );
  }


  returnResultToCrimeLab() {
    if (
      this.returningToLab ||
      this._toolmarkDisposed ||
      !this.finished
    ) {
      return;
    }

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
    if (this._toolmarkDisposed) {
      super.cleanup();
      return;
    }

    this._toolmarkDisposed = true;
    this._toolmarkSession += 1;
    this.returningToLab = true;
    this._busy = false;

    const terminal = this.term;
    this.term = null;

    try {
      this.stopMover();
      terminal?.destroy();
    } finally {
      super.cleanup();

      this.barText?.destroy();
      this.statusText?.destroy();

      this.barText = null;
      this.statusText = null;
    }
  }
}