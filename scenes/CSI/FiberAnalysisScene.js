import { audioManager } from '../../managers/AudioManager.js';
import { BaseScene } from '../BaseScene.js';
import { LabTerminal, TERM } from './LabTerminal.js';

const PADS = [
  { label: 'R-7', color: '#ff5252', freq: 330 },
  { label: 'G-2', color: '#46ff7a', freq: 415 },
  { label: 'B-9', color: '#57c7ff', freq: 494 },
  { label: 'Y-4', color: '#ffc857', freq: 587 }
];
const ROUNDS = [3, 4, 5];
const DEFAULT_PROFILE = 'blue_cotton_fiber';
const MATERIALS = new Set([
  'cotton', 'wool', 'silk', 'linen', 'polyester', 'nylon', 'acrylic',
  'rayon', 'viscose', 'cashmere', 'denim', 'hemp', 'leather'
]);
const COLORS = new Set([
  'blue', 'red', 'green', 'yellow', 'black', 'white', 'brown', 'grey',
  'gray', 'orange', 'purple', 'pink', 'beige', 'navy', 'violet'
]);

function readableProfile(value) {
  return String(value).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function profileFacts(value) {
  const tokens = String(value).trim().toLowerCase().split(/[_\s-]+/);
  const facts = {};
  // Only recognize literal material/color names, not invented profile aliases.
  if (tokens.length === 1 && MATERIALS.has(tokens[0])) {
    facts.material = tokens[0];
  } else if (tokens.length === 2 && MATERIALS.has(tokens[0]) &&
    ['fiber', 'fibre'].includes(tokens[1])) {
    facts.material = tokens[0];
  } else if (tokens.length === 3 && COLORS.has(tokens[0]) &&
    MATERIALS.has(tokens[1]) && ['fiber', 'fibre'].includes(tokens[2])) {
    facts.color = tokens[0];
    facts.material = tokens[1];
  }
  return facts;
}

export class FiberAnalysisScene extends BaseScene {
  constructor() {
    super('FiberAnalysisScene');
    this._fiberSession = 0;
    this.init();
  }

  init(data = {}) {
    const config = data.evidenceConfig || {};
    this.stationId = data.stationId || 'trace_1';
    this.evidenceType = data.evidenceType || config.evidenceType || 'fiber_profile';
    this.correctValue = data.correctValue ?? config.correctValue ?? DEFAULT_PROFILE;
    this.caseKey = data.caseKey ?? null;
    this.cityId = data.cityId ?? null;

    // Ignore descriptions for a different profile when correctValue is overridden.
    const configMatches = config.correctValue == null ||
      config.correctValue === this.correctValue;
    const matchingConfig = configMatches ? config : {};
    const suppliedClue = data.clue || {};
    const clueMatches = suppliedClue.correctValue == null ||
      suppliedClue.correctValue === this.correctValue;
    const clue = clueMatches ? suppliedClue : {};
    const label = readableProfile(this.correctValue);
    const facts = { ...(clue.facts || {}), ...profileFacts(this.correctValue) };
    const clueType = data.clueType || clue.type || matchingConfig.clueType || 'red_herring';
    const isRedHerring = data.isRedHerring ?? matchingConfig.isRedHerring ??
      (clueType === 'red_herring');
    const fallbackText = `Fiber analysis result: ${label}.`;

    this.reportLabel = label;
    this.clue = {
      ...clue,
      id: clue.id || matchingConfig.id || String(this.correctValue),
      type: clueType,
      text: data.clueText || clue.text || matchingConfig.clueText || fallbackText,
      correctValue: this.correctValue,
      facts
    };
    this.evidenceConfig = {
      ...config,
      id: matchingConfig.id || this.clue.id,
      label: config.label || 'Fiber Analysis',
      evidenceType: this.evidenceType,
      correctValue: this.correctValue,
      clueType,
      clueText: this.clue.text,
      isRedHerring,
      isValuable: data.isValuable ?? matchingConfig.isValuable ?? false
    };

    this.term = null;
    this.padTexts = [];
    this.sequence = [];
    this.score = data.startScore ?? 100;
    this.mistakes = 0;
    this.startedAt = null;
    this.round = 0;
    this.inputIndex = 0;
    this.accepting = false;
    this.finished = false;
    this.returningToLab = false;
    this.playbackEvent = null;
    this.nextRoundEvent = null;
    this.gameStarted = false;
    this.readyOverlay = null;
    this.readyObjects = [];
    this._fiberDisposed = true;
    this._fiberSession += 1;
    this._pendingCalls = new Set();
    this._padResetEvents = new Map();
    this._playbackResolve = null;
    this._playbackFinishEvent = null;
    this._roundStarting = false;
  }

  create() {
    super.create();
    this._fiberDisposed = false;
    this._fiberSession += 1;
    this.term = new LabTerminal(this, {
      title: 'SPECTROGRAPH SP-404 // REAGENT SEQUENCER', maxLines: 9
    });
    this.buildPads();
    this.showIntro();
  }

  isCurrentSession(session, terminal = this.term) {
    return !this._fiberDisposed && !this._cleanupDone && !this.returningToLab &&
      session === this._fiberSession && terminal === this.term &&
      Boolean(terminal) && !terminal.destroyed;
  }

  async terminalAction(session, terminal, action) {
    if (!this.isCurrentSession(session, terminal)) return false;
    const result = await action();
    return result !== false && this.isCurrentSession(session, terminal);
  }

  async printLines(session, terminal, lines) {
    for (const [text, options = {}] of lines) {
      const current = await this.terminalAction(session, terminal,
        () => terminal.print(text, options));
      if (!current) return false;
    }
    return true;
  }

  later(delay, callback) {
    const session = this._fiberSession;
    if (!this.isCurrentSession(session)) return null;
    const event = this.time.delayedCall(delay, () => {
      this._pendingCalls.delete(event);
      if (!this.isCurrentSession(session)) return;
      callback();
    });
    this._pendingCalls.add(event);
    return event;
  }

  cancelCall(event) {
    if (!event) return;
    event.remove(false);
    this._pendingCalls.delete(event);
  }

  buildPads() {
    const centerX = this.term.x + this.term.w / 2;
    const centerY = this.term.y + this.term.h - 190;
    const session = this._fiberSession;
    this.padTexts = PADS.map((pad, index) => {
      const text = this.add.text(centerX + (index - 1.5) * 150, centerY,
        ` ${pad.label} `, {
          fontFamily: '"PressStart2P"', fontSize: '18px', color: TERM.dark,
          backgroundColor: pad.color, padding: { x: 14, y: 14 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => {
        if (this.isCurrentSession(session)) this.pressPad(index);
      });
      return text;
    });
  }

  async showIntro() {
    const terminal = this.term;
    const session = this._fiberSession;
    const printed = await this.printLines(session, terminal, [
      ['> FIBER SAMPLE LOADED. DO NOT SNEEZE.'],
      ['> REAGENTS MUST BE ADDED IN THE SHOWN ORDER.'],
      ['> WATCH. REMEMBER. REPEAT. LIKE KARAOKE, BUT SCIENCE.', { color: TERM.amber }]
    ]);
    if (printed && !this.finished) this.showReadyScreen();
  }

  clearReadyScreen() {
    const objects = this.readyObjects;
    this.readyObjects = [];
    this.readyOverlay = null;
    for (const object of objects) {
      object?.removeAllListeners?.();
      object?.destroy?.();
    }
  }

  showReadyScreen() {
    const session = this._fiberSession;
    if (!this.isCurrentSession(session) || this.finished ||
      this.gameStarted || this.readyOverlay) return;
    const { width, height } = this.scale;
    this.readyOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.9)
      .setOrigin(0, 0).setDepth(5000).setInteractive();
    this.readyOverlay.on('pointerdown', (pointer, x, y, event) => {
      event?.stopPropagation();
    });
    const panel = this.add.rectangle(width / 2, height / 2,
      Math.min(width - 40, 760), 390, 0x111827, 1)
      .setStrokeStyle(3, 0x7df9ff).setDepth(5001);
    const title = this.add.text(width / 2, height / 2 - 130,
      'FIBER MATCHING PROTOCOL', {
        fontFamily: 'PressStart2P', fontSize: '16px', color: '#7df9ff', align: 'center'
      }).setOrigin(0.5).setDepth(5002);
    const briefing = this.add.text(width / 2, height / 2 - 20,
      'Watch the fiber scanner carefully.\n\nRepeat the color sequence exactly.\n\nThe machine is dramatic, impatient,\nand legally classified as a diva.', {
        fontFamily: 'SpecialElite', fontSize: '25px', color: '#fff4c7', align: 'center',
        wordWrap: { width: Math.min(width - 110, 650) }
      }).setOrigin(0.5).setDepth(5002);
    const startButton = this.add.text(width / 2, height / 2 + 145, '[ I AM FOCUSED ]', {
      fontFamily: 'PressStart2P', fontSize: '13px', color: '#39ff14',
      backgroundColor: '#000000', padding: { left: 16, right: 16, top: 12, bottom: 12 }
    }).setOrigin(0.5).setDepth(5002).setInteractive({ useHandCursor: true });
    this.readyObjects = [this.readyOverlay, panel, title, briefing, startButton];
    startButton.on('pointerover', () => startButton.setScale(1.06).setColor('#ffffff'));
    startButton.on('pointerout', () => startButton.setScale(1).setColor('#39ff14'));
    startButton.on('pointerdown', (pointer, x, y, event) => {
      event?.stopPropagation();
      if (!this.isCurrentSession(session) || this.gameStarted || this.finished) return;
      this.gameStarted = true;
      startButton.disableInteractive();
      audioManager.playSfx('click_sound');
      if (!this.isCurrentSession(session)) return;
      this.clearReadyScreen();
      this.startedAt = this.time.now;
      this.startRound();
    });
  }

  async startRound() {
    const terminal = this.term;
    const session = this._fiberSession;
    if (!this.isCurrentSession(session, terminal) || this.finished ||
      !this.gameStarted || this._roundStarting || this.round >= ROUNDS.length) return;
    this._roundStarting = true;
    this.accepting = false;
    this.inputIndex = 0;
    this.cancelCall(this.nextRoundEvent);
    this.nextRoundEvent = null;
    const sequenceLength = ROUNDS[this.round];
    this.sequence = Array.from({ length: sequenceLength },
      () => Phaser.Math.Between(0, PADS.length - 1));
    try {
      const printed = await this.terminalAction(session, terminal, () => terminal.print(
        `> ROUND ${this.round + 1}/${ROUNDS.length} — SEQUENCE LENGTH ${sequenceLength}`));
      if (!printed || this.finished || !this.gameStarted) return;
      const played = await this.playSequence();
      if (played && this.isCurrentSession(session, terminal) &&
        !this.finished && this.gameStarted) this.accepting = true;
    } finally {
      if (this.isCurrentSession(session, terminal)) this._roundStarting = false;
    }
  }

  settlePlayback(completed) {
    const resolve = this._playbackResolve;
    this._playbackResolve = null;
    this.playbackEvent?.remove(false);
    this.playbackEvent = null;
    this.cancelCall(this._playbackFinishEvent);
    this._playbackFinishEvent = null;
    resolve?.(completed);
  }

  playSequence() {
    this.settlePlayback(false);
    const session = this._fiberSession;
    const sequence = [...this.sequence];
    if (!this.isCurrentSession(session) || this.finished ||
      !this.gameStarted || sequence.length === 0) return Promise.resolve(false);
    return new Promise(resolve => {
      this._playbackResolve = resolve;
      let sequenceIndex = 0;
      this.playbackEvent = this.time.addEvent({
        delay: 650, repeat: sequence.length - 1,
        callback: () => {
          if (!this.isCurrentSession(session) || this.finished || !this.gameStarted) {
            this.settlePlayback(false);
            return;
          }
          this.flashPad(sequence[sequenceIndex]);
          sequenceIndex += 1;
          if (sequenceIndex >= sequence.length) {
            this._playbackFinishEvent = this.later(400, () => {
              this._playbackFinishEvent = null;
              this.settlePlayback(true);
            });
          }
        }
      });
    });
  }

  flashPad(index) {
    const padText = this.padTexts[index];
    const pad = PADS[index];
    if (this._fiberDisposed || !padText?.active || !pad) return;
    this.cancelCall(this._padResetEvents.get(index));
    this._padResetEvents.delete(index);
    this.term?.blip(pad.freq, 0.18, 'square', 0.05);
    padText.setScale(1.25);
    const resetEvent = this.later(280, () => {
      this._padResetEvents.delete(index);
      if (padText.active) padText.setScale(1);
    });
    if (resetEvent) this._padResetEvents.set(index, resetEvent);
  }

  async pressPad(index) {
    const terminal = this.term;
    const session = this._fiberSession;
    if (!this.isCurrentSession(session, terminal) || !this.gameStarted ||
      !this.accepting || this.finished) return;
    this.flashPad(index);
    if (index !== this.sequence[this.inputIndex]) {
      await this.handleWrongPad();
      return;
    }
    this.inputIndex += 1;
    if (this.inputIndex < this.sequence.length) return;
    this.accepting = false;
    this.round += 1;
    if (this.round >= ROUNDS.length) {
      await this.finishAnalysis();
      return;
    }
    const printed = await this.terminalAction(session, terminal,
      () => terminal.print('> SEQUENCE ACCEPTED. THE MACHINE PURRS.'));
    if (!printed || this.finished || !this.gameStarted) return;
    this.scheduleNextRound(600);
  }

  scheduleNextRound(delay) {
    this.cancelCall(this.nextRoundEvent);
    this.nextRoundEvent = this.later(delay, () => {
      this.nextRoundEvent = null;
      this.startRound();
    });
  }

  async handleWrongPad() {
    const terminal = this.term;
    const session = this._fiberSession;
    if (!this.isCurrentSession(session, terminal) || this.finished ||
      !this.gameStarted || !this.accepting) return;
    this.accepting = false;
    this.mistakes += 1;
    this.score = Math.max(0, this.score - 15);
    const printed = await this.terminalAction(session, terminal, () => terminal.print(
      '> WRONG REAGENT. SMALL EXPLOSION. EVERYONE IS FINE. (-15 PTS)',
      { color: TERM.red }));
    if (!printed || this.finished || !this.gameStarted) return;
    this.scheduleNextRound(800);
  }

  getTimeBonus() {
    const secondsElapsed = this.getSecondsElapsed();
    if (secondsElapsed <= 15) return 20;
    if (secondsElapsed <= 30) return 10;
    return 0;
  }

  getSecondsElapsed() {
    if (this.startedAt === null) return 0;
    return Math.floor((this.time.now - this.startedAt) / 1000);
  }

  getReportLines() {
    const lines = [
      [`> RESULT: ${this.reportLabel.toUpperCase()}.`],
      [`> ${this.clue.text}`]
    ];
    if (this.evidenceConfig.isRedHerring) {
      lines.push(['> THIS TRACE ALONE DOES NOT IDENTIFY A SUSPECT.', { color: TERM.amber }]);
    }
    lines.push(['> THE SPECTROGRAPH IS VERY PROUD ANYWAY.']);
    return lines;
  }

  async finishAnalysis() {
    const terminal = this.term;
    const session = this._fiberSession;
    if (this.finished || !this.isCurrentSession(session, terminal)) return;
    this.finished = true;
    this.accepting = false;
    this.settlePlayback(false);
    this.cancelCall(this.nextRoundEvent);
    this.nextRoundEvent = null;
    const timeBonus = this.getTimeBonus();
    this.score = Math.min(120, this.score + timeBonus);
    this.disablePads();
    const analyzed = await this.terminalAction(session, terminal,
      () => terminal.progress('SPECTRAL ANALYSIS', 1800));
    if (!analyzed) return;
    const lines = this.getReportLines();
    if (timeBonus > 0) {
      lines.push([`> SPEED BONUS: +${timeBonus} PTS.`, { color: TERM.amber }]);
    }
    lines.push(['> CLUE READY FOR CASE FILE.', { color: TERM.amber }]);
    const printed = await this.printLines(session, terminal, lines);
    if (!printed) return;
    terminal.button('ADD TO CASE FILE', TERM.green, () => {
      if (this.isCurrentSession(session, terminal)) this.returnResultToCrimeLab();
    });
  }

  disablePads() {
    for (const padText of this.padTexts) {
      if (!padText?.active) continue;
      padText.disableInteractive();
      padText.setAlpha(0.55);
    }
  }

  returnResultToCrimeLab() {
    if (this.returningToLab || this._fiberDisposed || !this.finished) return;
    this.returningToLab = true;
    const payload = {
      aborted: false,
      completed: true,
      stationId: this.stationId,
      caseKey: this.caseKey,
      cityId: this.cityId,
      evidenceType: this.evidenceType,
      evidenceConfig: this.evidenceConfig,
      correctValue: this.correctValue,
      value: this.correctValue,
      result: this.correctValue,
      selectedValue: this.correctValue,
      clueType: this.clue.type,
      clueText: this.clue.text,
      label: this.evidenceConfig.label,
      isValuable: this.evidenceConfig.isValuable,
      score: this.score,
      mistakes: this.mistakes,
      secondsElapsed: this.getSecondsElapsed(),
      clue: this.clue
    };
    this.events.emit('minigame-complete', payload);
    this.events.emit('minigame-closed', { aborted: false, payload });
    this.scene.stop();
  }

  cleanup() {
    if (this._fiberDisposed) {
      super.cleanup();
      return;
    }
    this._fiberDisposed = true;
    this._fiberSession += 1;
    this.accepting = false;
    this.gameStarted = false;
    this.returningToLab = true;
    this._roundStarting = false;
    const terminal = this.term;
    this.term = null;
    try {
      this.settlePlayback(false);
      for (const event of this._pendingCalls) event.remove(false);
      this._pendingCalls.clear();
      this._padResetEvents.clear();
      this.nextRoundEvent = null;
      this.clearReadyScreen();
      for (const padText of this.padTexts) {
        padText?.removeAllListeners();
        padText?.destroy();
      }
      this.padTexts = [];
      this.sequence = [];
      terminal?.destroy();
    } finally {
      super.cleanup();
    }
  }
}