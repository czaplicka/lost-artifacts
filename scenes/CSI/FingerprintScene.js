import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { BaseScene } from '../BaseScene.js';
import { LabTerminal, TERM } from './LabTerminal.js';


const GLYPHS = ['#', '+', ':', '.'];
const GRID_SIZE = 5;


export class FingerprintScene extends BaseScene {
  constructor() {
    super('FingerprintScene');

    this.term = null;

    this.stationId = 'trace_1';
    this.evidenceType = 'partial_print';
    this.correctValue = 'partial_print_match';
    this.clue = null;

    this.grid = [];
    this.partial = [];
    this.candidates = [];

    this.score = 100;
    this.mistakes = 0;
    this.startedAt = 0;

    this.finished = false;
    this.returningToLab = false;
    this.busy = false;

    this._fingerprintDisposed = true;
    this._fingerprintSession = 0;
  }


  init(data = {}) {
    const evidenceConfig = data.evidenceConfig || {};

    this.stationId = data.stationId || 'trace_1';

    this.evidenceType =
      data.evidenceType ||
      evidenceConfig.evidenceType ||
      'partial_print';

    this.correctValue =
      data.correctValue ??
      evidenceConfig.correctValue ??
      'partial_print_match';

    this.clue = data.clue || {
      id: evidenceConfig.id || 'skylight_partial_print',
      type:
        data.clueType ||
        evidenceConfig.clueType ||
        'opportunity',
      text:
        data.clueText ||
        evidenceConfig.clueText ||
        __dialogueText("scenes/CSI/FingerprintScene.js", "t_3838de63a766fa9a30b4"),
      facts: {
        certainty: '41%',
        location: __dialogueText("scenes/CSI/FingerprintScene.js", "t_bdc6a688845dd6a31cb7"),
        classification: __dialogueText("scenes/CSI/FingerprintScene.js", "t_513b1758896a7f409639")
      }
    };

    this.term = null;
    this.grid = [];
    this.partial = [];
    this.candidates = [];

    this.score = data.startScore ?? 100;
    this.mistakes = 0;
    this.startedAt = 0;

    this.finished = false;
    this.returningToLab = false;
    this.busy = false;

    this._fingerprintDisposed = true;
    this._fingerprintSession += 1;
  }


  create() {
    super.create();

    this._fingerprintDisposed = false;
    this._fingerprintSession += 1;
    this.startedAt = this.time.now;

    this.term = new LabTerminal(this, {
      title: __dialogueText("scenes/CSI/FingerprintScene.js", "t_d77d9e6af748153214f7"),
      maxLines: 12
    });

    this.buildPuzzle();
    this.showIntro();
  }


  isCurrentSession(session, terminal = this.term) {
    return (
      !this._fingerprintDisposed &&
      !this._cleanupDone &&
      !this.returningToLab &&
      session === this._fingerprintSession &&
      terminal === this.term &&
      Boolean(terminal)
    );
  }


  async terminalAction(session, terminal, action) {
    if (!this.isCurrentSession(session, terminal)) {
      return false;
    }

    await action();

    return this.isCurrentSession(session, terminal);
  }


  buildPuzzle() {
    this.grid = Array.from(
      { length: GRID_SIZE },
      () => Array.from(
        { length: GRID_SIZE },
        () => Phaser.Utils.Array.GetRandom(GLYPHS)
      )
    );

    this.partial = this.grid.map(row =>
      row.map(glyph => Math.random() < 0.45 ? '?' : glyph)
    );

    this.ensureMinimumReadableCells(5);

    const matchGrid = this.grid.map(row => [...row]);
    const wrongGridA = this.createWrongGrid(matchGrid, 2);
    const wrongGridB = this.createWrongGrid(matchGrid, 3);

    this.candidates = Phaser.Utils.Array.Shuffle([
      {
        name: __dialogueText("scenes/CSI/FingerprintScene.js", "t_891b90c8c832cf938a69"),
        value: 'partial_print_match',
        grid: matchGrid,
        ok: true
      },
      {
        name: __dialogueText("scenes/CSI/FingerprintScene.js", "t_f74ed0aa8a40230e9808"),
        value: 'partial_print_false_a',
        grid: wrongGridA,
        ok: false
      },
      {
        name: __dialogueText("scenes/CSI/FingerprintScene.js", "t_bb9e7bcc575e825814f1"),
        value: 'partial_print_false_b',
        grid: wrongGridB,
        ok: false
      }
    ]);
  }


  ensureMinimumReadableCells(minimum) {
    const readableCells = this.getReadableCells();
    const target = Phaser.Math.Clamp(
      minimum,
      0,
      GRID_SIZE * GRID_SIZE
    );

    while (readableCells.length < target) {
      const row = Phaser.Math.Between(0, GRID_SIZE - 1);
      const column = Phaser.Math.Between(0, GRID_SIZE - 1);

      const exists = readableCells.some(cell =>
        cell.row === row && cell.column === column
      );

      if (exists) continue;

      this.partial[row][column] = this.grid[row][column];
      readableCells.push({ row, column });
    }
  }


  getReadableCells() {
    const cells = [];

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let column = 0; column < GRID_SIZE; column++) {
        if (this.partial[row][column] !== '?') {
          cells.push({ row, column });
        }
      }
    }

    return cells;
  }


  createWrongGrid(sourceGrid, changesNeeded) {
    const wrongGrid = sourceGrid.map(row => [...row]);

    const readableCells = Phaser.Utils.Array.Shuffle(
      [...this.getReadableCells()]
    );

    const changes = Math.min(
      changesNeeded,
      readableCells.length
    );

    for (let index = 0; index < changes; index++) {
      const { row, column } = readableCells[index];
      const currentGlyph = wrongGrid[row][column];

      const possibleGlyphs = GLYPHS.filter(
        glyph => glyph !== currentGlyph
      );

      wrongGrid[row][column] =
        Phaser.Utils.Array.GetRandom(possibleGlyphs);
    }

    return wrongGrid;
  }


  buildTable() {
    const names = [
      'SAMPLE',
      ...this.candidates.map(candidate => candidate.name)
    ];

    const grids = [
      this.partial,
      ...this.candidates.map(candidate => candidate.grid)
    ];

    let output = names
      .map(name => name.padEnd(14))
      .join('');

    output += '\n';

    for (let row = 0; row < GRID_SIZE; row++) {
      output += grids
        .map(grid => grid[row].join(' ').padEnd(14))
        .join('');

      output += '\n';
    }

    return output;
  }


  async showIntro() {
    const terminal = this.term;
    const session = this._fingerprintSession;

    const lines = [
      [
        __dialogueText("scenes/CSI/FingerprintScene.js", "t_d767ae1cbaf02e62ebf9"),
        {}
      ],
      [
        __dialogueText("scenes/CSI/FingerprintScene.js", "t_fffcc8dd885bab13a21e"),
        {}
      ],
      [
        this.buildTable(),
        {
          fontFamily: '"Courier New"',
          fontSize: '16px',
          charDelay: 2
        }
      ],
      [
        __dialogueText("scenes/CSI/FingerprintScene.js", "t_07d906ad5046381dd61a"),
        { color: TERM.amber }
      ]
    ];

    for (const [text, options] of lines) {
      const current = await this.terminalAction(
        session,
        terminal,
        () => terminal.print(text, options)
      );

      if (!current) return;
    }

    this.showCandidateButtons();
  }


  showCandidateButtons() {
    const terminal = this.term;
    const session = this._fingerprintSession;

    if (
      !this.isCurrentSession(session, terminal) ||
      this.finished
    ) {
      return;
    }

    terminal.clearButtons();

    this.candidates.forEach(candidate => {
      terminal.button(
        candidate.name,
        TERM.green,
        () => {
          if (!this.isCurrentSession(session, terminal)) {
            return;
          }

          this.guessCandidate(candidate);
        }
      );
    });
  }


  async guessCandidate(candidate) {
    const terminal = this.term;
    const session = this._fingerprintSession;

    if (
      this.busy ||
      this.finished ||
      !this.isCurrentSession(session, terminal)
    ) {
      return;
    }

    this.busy = true;
    terminal.clearButtons();

    try {
      const printed = await this.terminalAction(
        session,
        terminal,
        () => terminal.print(
          `${__dialogueText("scenes/CSI/FingerprintScene.js", "t_8be179c6df815665853a")}${candidate.name}${__dialogueText("scenes/CSI/FingerprintScene.js", "t_4501c820f066129ae4d3")}`
        )
      );

      if (!printed) return;

      const compared = await this.terminalAction(
        session,
        terminal,
        () => terminal.progress(__dialogueText("scenes/CSI/FingerprintScene.js", "t_39f9716ccbe8d61de6e9"), 1200)
      );

      if (!compared) return;

      if (candidate.ok) {
        await this.handleCorrectCandidate(
          candidate,
          session,
          terminal
        );
      } else {
        await this.handleWrongCandidate(
          candidate,
          session,
          terminal
        );
      }
    } finally {
      if (this.isCurrentSession(session, terminal)) {
        this.busy = false;
      }
    }
  }


  async handleCorrectCandidate(
    candidate,
    session = this._fingerprintSession,
    terminal = this.term
  ) {
    if (!this.isCurrentSession(session, terminal)) return;

    this.finished = true;

    const timeBonus = this.getTimeBonus();

    this.score = Math.min(120, this.score + timeBonus);

    const lines = [
      [
        __dialogueText("scenes/CSI/FingerprintScene.js", "t_793ff8d6954db163fd96"),
        { color: TERM.amber }
      ],
      [
        __dialogueText("scenes/CSI/FingerprintScene.js", "t_04536bc26461faf381f8"),
        {}
      ]
    ];

    if (timeBonus > 0) {
      lines.push([
        `${__dialogueText("scenes/CSI/FingerprintScene.js", "t_12af905b2e0dd06cb1dd")}${timeBonus}${__dialogueText("scenes/CSI/FingerprintScene.js", "t_eeb98a5625408b801794")}`,
        { color: TERM.amber }
      ]);
    }

    lines.push([
      __dialogueText("scenes/CSI/FingerprintScene.js", "t_5fe75d0a88dfe79b974d"),
      { color: TERM.amber }
    ]);

    for (const [text, options] of lines) {
      const current = await this.terminalAction(
        session,
        terminal,
        () => terminal.print(text, options)
      );

      if (!current) return;
    }

    terminal.button(
      __dialogueText("scenes/CSI/FingerprintScene.js", "t_d8c6f6bc46d3b7948ad7"),
      TERM.green,
      () => {
        if (!this.isCurrentSession(session, terminal)) {
          return;
        }

        this.returnResultToCrimeLab(candidate.value);
      }
    );
  }


  async handleWrongCandidate(
    candidate,
    session = this._fingerprintSession,
    terminal = this.term
  ) {
    if (!this.isCurrentSession(session, terminal)) return;

    this.mistakes += 1;
    this.score = Math.max(0, this.score - 15);

    const printed = await this.terminalAction(
      session,
      terminal,
      () => terminal.print(
        __dialogueText("scenes/CSI/FingerprintScene.js", "t_45805fb534816228cb20"),
        { color: TERM.red }
      )
    );

    if (!printed) return;

    const retryPrinted = await this.terminalAction(
      session,
      terminal,
      () => terminal.print(__dialogueText("scenes/CSI/FingerprintScene.js", "t_48dae4ffaac4d211f941"))
    );

    if (!retryPrinted) return;

    this.showCandidateButtons();
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


  returnResultToCrimeLab(value) {
    if (
      this.returningToLab ||
      this._fingerprintDisposed ||
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
      value,
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
    if (this._fingerprintDisposed) {
      super.cleanup();
      return;
    }

    this._fingerprintDisposed = true;
    this._fingerprintSession += 1;
    this.returningToLab = true;
    this.busy = false;

    super.cleanup();

    this.term = null;
    this.grid = [];
    this.partial = [];
    this.candidates = [];
  }
}