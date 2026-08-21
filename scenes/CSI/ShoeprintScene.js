import { BaseScene } from '../BaseScene.js';
import { LabTerminal, TERM } from './LabTerminal.js';

const SHOEPRINT_PROFILES = {
  small: {
    size: 38,
    sole: 'RUBBER',
    wear: 'RIGHT TOE',
    value: 'small'
  },

  medium: {
    size: 41,
    sole: 'VIBRAM',
    wear: 'LEFT HEEL',
    value: 'medium'
  },

  large: {
    size: 44,
    sole: 'LUGGED',
    wear: 'OUTER EDGE',
    value: 'large'
  }
};

const DEFAULT_EVIDENCE = {
  id: 'museum_windowsill_shoeprint',
  slot: 'trace',
  attribute: 'shoe_size_category',
  thief_value: 'medium',
  source: 'footwear_cast',
  label: 'Footwear Impression',
  clueText: 'The plaster cast indicates a medium shoe size.',
  allowedValues: [
    'small',
    'medium',
    'large'
  ]
};

export class ShoeprintScene extends BaseScene {
  constructor() {
    super('ShoeprintScene');

    this.term = null;

    this.stationId = 'trace_1';
    this.evidence = null;
    this.evidenceType = 'shoe_size_category';
    this.correctValue = 'medium';
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
    const incomingEvidence =
      data.evidence ||
      data.evidenceConfig ||
      {};

    this.evidence = {
      ...DEFAULT_EVIDENCE,
      ...incomingEvidence
    };

    this.stationId =
      data.stationId ||
      this.evidence.stationId ||
      'trace_1';

    this.evidenceType =
      this.evidence.attribute ||
      data.evidenceType ||
      'shoe_size_category';

    this.correctValue =
      data.correctValue ??
      this.evidence.thief_value ??
      'medium';

    if (!SHOEPRINT_PROFILES[this.correctValue]) {
      this.correctValue = 'medium';
    }

    const correctProfile =
      SHOEPRINT_PROFILES[this.correctValue];

    this.clue = data.clue || {
      id: this.evidence.id,
      type: data.clueType || this.evidence.clueType || 'means',
      text:
        data.clueText ||
        this.evidence.clueText ||
        `The plaster cast indicates a ${this.correctValue} shoe size.`,
      facts: {
        shoeSizeCategory: this.correctValue,
        size: correctProfile.size,
        sole: correctProfile.sole,
        wear: correctProfile.wear
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
    const correctProfile =
      SHOEPRINT_PROFILES[this.correctValue];

    this.cast = {
      size: correctProfile.size,
      sole: correctProfile.sole,
      wear: correctProfile.wear
    };

    this.entries = Phaser.Utils.Array.Shuffle(
      Object.values(SHOEPRINT_PROFILES).map(
        (profile, index) => ({
          id: `BOOT-${String(1138 + index * 911).padStart(4, '0')}`,
          size: profile.size,
          sole: profile.sole,
          wear: profile.wear,
          value: profile.value,
          ok: profile.value === this.correctValue
        })
      )
    );
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
      this.term.button(
        `${entry.id}  |  SIZE ${entry.size}`,
        TERM.green,
        () => this.guessEntry(entry)
      );

      this.term.button(
        `SOLE ${entry.sole}  |  WEAR ${entry.wear}`,
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
      `> FORENSIC CATEGORY: ${this.correctValue.toUpperCase()} SHOE SIZE.`
    );

    await terminal.print(
      `> PROFILE: SIZE ${entry.size} / ${entry.sole} SOLE / ${entry.wear} WEAR.`
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
      () => this.returnResultToCrimeLab()
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

  returnResultToCrimeLab() {
    if (this.returningToLab) {
      return;
    }

    this.returningToLab = true;

    const payload = {
      aborted: false,
      completed: true,

      stationId: this.stationId,

      evidenceId: this.evidence.id,
      evidenceType: this.evidenceType,

      attribute: this.evidence.attribute,
      value: this.correctValue,

      source: this.evidence.source,
      label: this.evidence.label,
      clueText: this.evidence.clueText,

      evidence: {
        ...this.evidence
      },

      score: this.score,
      mistakes: this.mistakes,
      secondsElapsed: this.getSecondsElapsed(),

      clue: this.clue
    };

    this.events.emit(
      'minigame-complete',
      payload
    );

    this.events.emit(
      'minigame-closed',
      {
        aborted: false,
        payload
      }
    );

    this.scene.stop();
  }

  cleanup() {
    this.busy = false;
  }
}