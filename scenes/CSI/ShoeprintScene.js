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
  allowedValues: ['small', 'medium', 'large']
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

    this._shoeprintDisposed = true;
    this._shoeprintSession = 0;
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
      data.evidenceType ||
      incomingEvidence.evidenceType ||
      this.evidence.attribute ||
      'shoe_size_category';

    const incomingValue = String(
      data.correctValue ??
      incomingEvidence.correctValue ??
      incomingEvidence.thief_value ??
      DEFAULT_EVIDENCE.thief_value
    ).trim().toLowerCase();

    this.correctValue = Object.prototype.hasOwnProperty.call(
      SHOEPRINT_PROFILES,
      incomingValue
    )
      ? incomingValue
      : 'medium';

    const clueText =
      data.clueText ||
      incomingEvidence.clueText ||
      `The plaster cast indicates a ${this.correctValue} shoe size.`;

    this.evidence.thief_value = this.correctValue;
    this.evidence.correctValue = this.correctValue;
    this.evidence.clueText = clueText;

    const correctProfile =
      SHOEPRINT_PROFILES[this.correctValue];

    this.clue = data.clue || {
      id: this.evidence.id,
      type:
        data.clueType ||
        this.evidence.clueType ||
        'means',
      text: clueText,
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

    this.term = null;
    this.cast = null;
    this.entries = [];

    this.finished = false;
    this.returningToLab = false;
    this.busy = false;

    this._shoeprintDisposed = true;
    this._shoeprintSession += 1;
  }


  create() {
    super.create();

    this._shoeprintDisposed = false;
    this._shoeprintSession += 1;
    this.startedAt = this.time.now;

    this.term = new LabTerminal(this, {
      title: 'CAST COMPARATOR // FOOTWEAR DB (1994 EDITION)',
      maxLines: 12
    });

    this.buildPuzzle();
    this.showIntro();
  }


  isCurrentSession(session, terminal = this.term) {
    return (
      !this._shoeprintDisposed &&
      !this._cleanupDone &&
      !this.returningToLab &&
      session === this._shoeprintSession &&
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
    const session = this._shoeprintSession;

    const printed = await this.printLines(
      session,
      terminal,
      [
        [
          '> PLASTER CAST FROM THE MUSEUM WINDOWSILL.'
        ],
        [
          '> TREAD PATTERN:',
          { color: TERM.amber }
        ],
        [
          '  |\\|\\|\\|  |/|/|/|  | |\\| |',
          {
            fontFamily: '"Courier New"',
            fontSize: '20px',
            charDelay: 4
          }
        ],
        [
          `> SIZE: ${this.cast.size} / SOLE: ${this.cast.sole} / WEAR: ${this.cast.wear}`
        ],
        [
          '> DATABASE RETURNED 3 RECORDS. PICK THE FULL MATCH.'
        ],
        [
          '> FORMAT: ID | SIZE | SOLE | WEAR.',
          { color: TERM.amber }
        ]
      ]
    );

    if (!printed) return;

    this.showEntryButtons();
  }


  showEntryButtons() {
    const terminal = this.term;
    const session = this._shoeprintSession;

    if (
      !this.isCurrentSession(session, terminal) ||
      this.finished
    ) {
      return;
    }

    terminal.clearButtons();

    this.entries.forEach(entry => {
      const line1 = `${entry.id}  |  SIZE ${entry.size}`;
      const line2 = `${entry.sole}  |  ${entry.wear}`;

      terminal.button(
        `${line1}\n${line2}`,
        TERM.green,
        () => {
          if (!this.isCurrentSession(session, terminal)) {
            return;
          }

          this.guessEntry(entry);
        }
      );
    });
  }


  async guessEntry(entry) {
    const terminal = this.term;
    const session = this._shoeprintSession;

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
          `> CHECKING ${entry.id}: ${entry.size} / ${entry.sole} / ${entry.wear}`
        )
      );

      if (!printed) return;

      const compared = await this.terminalAction(
        session,
        terminal,
        () => terminal.progress('COMPARING TREAD', 1200)
      );

      if (!compared) return;

      if (entry.ok) {
        await this.handleCorrectEntry(
          entry,
          session,
          terminal
        );
      } else {
        await this.handleWrongEntry(
          entry,
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


  async handleCorrectEntry(
    entry,
    session = this._shoeprintSession,
    terminal = this.term
  ) {
    if (!this.isCurrentSession(session, terminal)) return;

    this.finished = true;

    const timeBonus = this.getTimeBonus();

    this.score = Math.min(
      120,
      this.score + timeBonus
    );

    const lines = [
      [
        '> FULL MATCH. THE SHOE FITS. SOMEONE IS ABOUT TO HAVE A BAD DAY.',
        { color: TERM.amber }
      ],
      [
        `> FORENSIC CATEGORY: ${this.correctValue.toUpperCase()} SHOE SIZE.`
      ],
      [
        `> PROFILE: SIZE ${entry.size} / ${entry.sole} SOLE / ${entry.wear} WEAR.`
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


  async handleWrongEntry(
    entry,
    session = this._shoeprintSession,
    terminal = this.term
  ) {
    if (!this.isCurrentSession(session, terminal)) return;

    this.mistakes += 1;
    this.score = Math.max(0, this.score - 15);

    const mismatch = ['size', 'sole', 'wear'].find(
      property => entry[property] !== this.cast[property]
    );

    const mismatchText = mismatch
      ? mismatch.toUpperCase()
      : 'RECORD';

    const printed = await this.printLines(
      session,
      terminal,
      [
        [
          `> MISMATCH: ${mismatchText} DOES NOT FIT. (-15 PTS)`,
          { color: TERM.red }
        ],
        [
          '> THE DATABASE IS DISAPPOINTED. TRY AGAIN.'
        ]
      ]
    );

    if (!printed) return;

    this.showEntryButtons();
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


  returnResultToCrimeLab() {
    if (
      this.returningToLab ||
      this._shoeprintDisposed ||
      !this.finished
    ) {
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

    this.events.emit('minigame-complete', payload);

    this.events.emit('minigame-closed', {
      aborted: false,
      payload
    });

    this.scene.stop();
  }


  cleanup() {
    if (this._shoeprintDisposed) {
      super.cleanup();
      return;
    }

    this._shoeprintDisposed = true;
    this._shoeprintSession += 1;
    this.returningToLab = true;
    this.busy = false;

    const terminal = this.term;
    this.term = null;

    try {
      terminal?.destroy();
    } finally {
      super.cleanup();

      this.cast = null;
      this.entries = [];
    }
  }
}