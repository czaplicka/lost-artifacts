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
  }

  init(data = {}) {
    const evidenceConfig = data.evidenceConfig || {};

    this.stationId = data.stationId || 'trace_1';

    this.evidenceType = data.evidenceType
      || evidenceConfig.evidenceType
      || 'partial_print';

    this.correctValue = data.correctValue
      ?? evidenceConfig.correctValue
      ?? 'partial_print_match';

    this.clue = data.clue || {
      id: evidenceConfig.id || 'skylight_partial_print',
      type: data.clueType || evidenceConfig.clueType || 'opportunity',
      text: data.clueText
        || evidenceConfig.clueText
        || 'A partial fingerprint was recovered from the museum skylight latch.',
      facts: {
        certainty: '41%',
        location: 'skylight latch',
        classification: 'partial print'
      }
    };

    this.grid = [];
    this.partial = [];
    this.candidates = [];

    this.score = data.startScore ?? 100;
    this.mistakes = 0;
    this.startedAt = 0;

    this.finished = false;
    this.returningToLab = false;
    this.busy = false;
  }

  create() {
    super.create();

    this.startedAt = this.time.now;

    this.term = new LabTerminal(this, {
      title: 'AFIS TERMINAL v2.03 (LICENSE EXPIRED)',
      maxLines: 12
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

    this.buildPuzzle();
    this.showIntro();
  }

  buildPuzzle() {
    this.grid = Array.from(
      { length: GRID_SIZE },
      () => Array.from(
        { length: GRID_SIZE },
        () => Phaser.Utils.Array.GetRandom(GLYPHS)
      )
    );

    this.partial = this.grid.map((row) => {
      return row.map((glyph) => {
        return Math.random() < 0.45 ? '?' : glyph;
      });
    });

    this.ensureMinimumReadableCells(5);

    const matchGrid = this.grid.map((row) => [...row]);

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
    const readableCells = [];

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let column = 0; column < GRID_SIZE; column++) {
        if (this.partial[row][column] !== '?') {
          readableCells.push({ row, column });
        }
      }
    }

    while (readableCells.length < minimum) {
      const row = Phaser.Math.Between(0, GRID_SIZE - 1);
      const column = Phaser.Math.Between(0, GRID_SIZE - 1);

      const exists = readableCells.some((cell) => {
        return cell.row === row && cell.column === column;
      });

      if (exists) continue;

      this.partial[row][column] = this.grid[row][column];

      readableCells.push({
        row,
        column
      });
    }
  }

  getReadableCells() {
    const cells = [];

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let column = 0; column < GRID_SIZE; column++) {
        if (this.partial[row][column] !== '?') {
          cells.push({
            row,
            column
          });
        }
      }
    }

    return cells;
  }

  createWrongGrid(sourceGrid, changesNeeded) {
    const wrongGrid = sourceGrid.map((row) => [...row]);
    const readableCells = Phaser.Utils.Array.Shuffle(
      [...this.getReadableCells()]
    );

    const changes = Math.min(
      changesNeeded,
      readableCells.length
    );

    for (let index = 0; index < changes; index++) {
      const cell = readableCells[index];
      const currentGlyph = wrongGrid[cell.row][cell.column];

      const possibleGlyphs = GLYPHS.filter((glyph) => {
        return glyph !== currentGlyph;
      });

      wrongGrid[cell.row][cell.column] = Phaser.Utils.Array.GetRandom(
        possibleGlyphs
      );
    }

    return wrongGrid;
  }

  buildTable() {
    const names = [
      'SAMPLE',
      ...this.candidates.map((candidate) => candidate.name)
    ];

    const grids = [
      this.partial,
      ...this.candidates.map((candidate) => candidate.grid)
    ];

    let output = names.map((name) => {
      return name.padEnd(14);
    }).join('');

    output += '\n';

    for (let row = 0; row < GRID_SIZE; row++) {
      output += grids.map((grid) => {
        return grid[row].join(' ').padEnd(14);
      }).join('');

      output += '\n';
    }

    return output;
  }

  async showIntro() {
    const terminal = this.term;

    await terminal.print(
      '> PARTIAL PRINT LIFTED FROM SKYLIGHT LATCH.'
    );

    await terminal.print(
      '> AFIS FOUND 3 "CANDIDATES". DEFINE "CANDIDATES".'
    );

    await terminal.print(
      this.buildTable(),
      {
        fontFamily: '"Courier New"',
        fontSize: '16px',
        charDelay: 2
      }
    );

    await terminal.print(
      '> PICK THE RECORD MATCHING EVERY READABLE CELL (? = UNREADABLE).',
      { color: TERM.amber }
    );

    this.showCandidateButtons();
  }

  showCandidateButtons() {
    this.term.clearButtons();

    this.candidates.forEach((candidate) => {
      this.term.button(
        candidate.name,
        TERM.green,
        () => this.guessCandidate(candidate)
      );
    });
  }

  async guessCandidate(candidate) {
    if (this.busy || this.finished) return;

    this.busy = true;

    const terminal = this.term;

    terminal.clearButtons();

    await terminal.print(
      `> CHECKING ${candidate.name} ...`
    );

    await terminal.progress(
      'COMPARING RIDGES',
      1200
    );

    if (candidate.ok) {
      await this.handleCorrectCandidate(candidate);
      return;
    }

    await this.handleWrongCandidate(candidate);

    this.busy = false;
  }

  async handleCorrectCandidate(candidate) {
    const terminal = this.term;

    this.finished = true;

    const timeBonus = this.getTimeBonus();

    this.score = Math.min(
      120,
      this.score + timeBonus
    );

    await terminal.print(
      '> MATCH CONFIRMED. 41% CERTAINTY.',
      { color: TERM.amber }
    );

    await terminal.print(
      '> IN COURT? USELESS. IN OUR CASE FILE? PRICELESS.'
    );

    if (timeBonus > 0) {
      await terminal.print(
        `> SPEED BONUS: +${timeBonus} PTS.`,
        { color: TERM.amber }
      );
    }

    await terminal.print(
      '> CLUE READY FOR CASE FILE.',
      { color: TERM.amber }
    );

    terminal.button(
      'ADD TO CASE FILE',
      TERM.green,
      () => this.returnResultToCrimeLab(candidate.value)
    );
  }

  async handleWrongCandidate(candidate) {
    const terminal = this.term;

    this.mistakes += 1;
    this.score = Math.max(0, this.score - 15);

    await terminal.print(
      '> MISMATCH. AFIS SUGGESTS GLASSES. (-15 PTS)',
      { color: TERM.red }
    );

    await terminal.print(
      '> TRY THE OTHER RECORDS.'
    );

    this.showCandidateButtons();
  }

  getTimeBonus() {
    const secondsElapsed = this.getSecondsElapsed();

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

  returnResultToCrimeLab(value) {
    if (this.returningToLab) return;

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
    this.busy = false;
  }
}