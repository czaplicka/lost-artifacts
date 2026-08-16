import { BaseScene } from '../BaseScene.js';
import { LabTerminal, TERM } from './LabTerminal.js';

export class ShoeprintScene extends BaseScene {
  constructor() {
    super('ShoeprintScene');

    this.term = null;

    this.stationId = 'trace_1';
    this.evidenceType = 'shoeprint_profile';
    this.correctValue = 'size_43_vibram_left_heel';
    this.clue = null;

    this.cast = null;
    this.entries = [];

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

    this.evidenceType =
      data.evidenceType ||
      evidenceConfig.evidenceType ||
      'shoeprint_profile';

    this.correctValue =
      data.correctValue ??
      evidenceConfig.correctValue ??
      'size_43_vibram_left_heel';

    this.clue = data.clue || {
      id: evidenceConfig.id || 'museum_windowsill_shoeprint',
      type:
        data.clueType ||
        evidenceConfig.clueType ||
        'means',
      text:
        data.clueText ||
        evidenceConfig.clueText ||
        'A size 43 hiking boot with a Vibram sole left a worn mark on the museum windowsill.',
      facts: {
        size: 43,
        sole: 'Vibram',
        wear: 'left heel'
      }
    };

    this.score = data.startScore ?? 100;
    this.mistakes = 0;
    this.startedAt = 0;

    this.cast = null;
    this.entries = [];

    this.finished = false;
    this.returningToLab = false;
    this.busy = false;
  }

  create() {
    super.create();

    this.startedAt = this.time.now;

    this.term = new LabTerminal(this, {
      title: 'CAST COMPARATOR // FOOTWEAR DB (1994 EDITION)',
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
    this.cast = {
      size: 43,
      sole: 'VIBRAM',
      wear: 'LEFT HEEL'
    };

    this.entries = Phaser.Utils.Array.Shuffle([
      {
        id: 'BOOT-1138',
        size: 43,
        sole: 'VIBRAM',
        wear: 'LEFT HEEL',
        value: 'size_43_vibram_left_heel',
        ok: true
      },
      {
        id: 'BOOT-2049',
        size: 43,
        sole: 'VIBRAM',
        wear: 'RIGHT TOE',
        value: 'size_43_vibram_right_toe',
        ok: false
      },
      {
        id: 'SHOE-0773',
        size: 41,
        sole: 'VIBRAM',
        wear: 'LEFT HEEL',
        value: 'size_41_vibram_left_heel',
        ok: false
      }
    ]);
  }

  async showIntro() {
    const terminal = this.term;

    await terminal.print(
      '> PLASTER CAST FROM THE MUSEUM WINDOWSILL.'
    );

    await terminal.print(
      '> TREAD PATTERN:',
      { color: TERM.amber }
    );

    await terminal.print(
      '  |\\|\\|\\|  |/|/|/|  | |\\| |',
      {
        fontFamily: '"Courier New"',
        fontSize: '20px',
        charDelay: 4
      }
    );

    await terminal.print(
      `> SIZE: ${this.cast.size} / SOLE: ${this.cast.sole} / WEAR: ${this.cast.wear}`
    );

    await terminal.print(
      '> DATABASE RETURNED 3 RECORDS. PICK THE FULL MATCH.'
    );

    await terminal.print(
      '> FORMAT: ID | SIZE | SOLE | WEAR.',
      { color: TERM.amber }
    );

    this.showEntryButtons();
  }

  showEntryButtons() {
    if (!this.term || this.finished) {
      return;
    }

    this.term.clearButtons();

    this.entries.forEach((entry) => {
      const label =
        `${entry.id} | ${entry.size} | ${entry.sole} | ${entry.wear}`;

      this.term.button(
        label,
        TERM.green,
        () => this.guessEntry(entry)
      );
    });
  }

  async guessEntry(entry) {
    if (this.busy || this.finished) {
      return;
    }

    this.busy = true;

    const terminal = this.term;

    terminal.clearButtons();

    await terminal.print(
      `> CHECKING ${entry.id}: ${entry.size} / ${entry.sole} / ${entry.wear}`
    );

    await terminal.progress(
      'COMPARING TREAD',
      1200
    );

    if (entry.ok) {
      await this.handleCorrectEntry(entry);
      return;
    }

    await this.handleWrongEntry(entry);

    this.busy = false;
  }

  async handleCorrectEntry(entry) {
    const terminal = this.term;

    this.finished = true;

    const timeBonus = this.getTimeBonus();

    this.score = Math.min(
      120,
      this.score + timeBonus
    );

    await terminal.print(
      '> FULL MATCH. THE SHOE FITS. SOMEONE IS ABOUT TO HAVE A BAD DAY.',
      { color: TERM.amber }
    );

    await terminal.print(
      '> PROFILE: SIZE 43 / VIBRAM SOLE / LEFT-HEEL WEAR.'
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
      () => this.returnResultToCrimeLab(entry.value)
    );
  }

  async handleWrongEntry(entry) {
    const terminal = this.term;

    this.mistakes += 1;
    this.score = Math.max(0, this.score - 15);

    const mismatch = [
      'size',
      'sole',
      'wear'
    ].find(
      (property) =>
        entry[property] !== this.cast[property]
    );

    await terminal.print(
      `> MISMATCH: ${mismatch.toUpperCase()} DOES NOT FIT. (-15 PTS)`,
      { color: TERM.red }
    );

    await terminal.print(
      '> THE DATABASE IS DISAPPOINTED. TRY AGAIN.'
    );

    this.showEntryButtons();
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
    if (this.returningToLab) {
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
    this.busy = false;
  }
}