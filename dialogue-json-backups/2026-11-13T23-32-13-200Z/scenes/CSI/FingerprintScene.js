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
        'A partial fingerprint was recovered from the museum skylight latch.',
      facts: {
        certainty: '41%',
        location: 'skylight latch',
        classification: 'partial print'
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
      title: 'AFIS TERMINAL v2.03 (LICENSE EXPIRED)',
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
        name: 'RECORD A',
        value: 'partial_print_match',
        grid: matchGrid,
        ok: true
      },
      {
        name: 'RECORD B',
        value: 'partial_print_false_a',
        grid: wrongGridA,
        ok: false
      },
      {
        name: 'RECORD C',
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
        '> PARTIAL PRINT LIFTED FROM SKYLIGHT LATCH.',
        {}
      ],
      [
        '> AFIS FOUND 3 "CANDIDATES". DEFINE "CANDIDATES".',
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
        '> PICK THE RECORD MATCHING EVERY READABLE CELL (? = UNREADABLE).',
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
          `> CHECKING ${candidate.name} ...`
        )
      );

      if (!printed) return;

      const compared = await this.terminalAction(
        session,
        terminal,
        () => terminal.progress('COMPARING RIDGES', 1200)
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
        '> MATCH CONFIRMED. 41% CERTAINTY.',
        { color: TERM.amber }
      ],
      [
        '> IN COURT? USELESS. IN OUR CASE FILE? PRICELESS.',
        {}
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

    for (const [text, options] of lines) {
      const current = await this.terminalAction(
        session,
        terminal,
        () => terminal.print(text, options)
      );

      if (!current) return;
    }

    terminal.button(
      'ADD TO CASE FILE',
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
        '> MISMATCH. AFIS SUGGESTS GLASSES. (-15 PTS)',
        { color: TERM.red }
      )
    );

    if (!printed) return;

    const retryPrinted = await this.terminalAction(
      session,
      terminal,
      () => terminal.print('> TRY THE OTHER RECORDS.')
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