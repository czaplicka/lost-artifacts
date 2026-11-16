import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { escapeTimelineData as DATA, getEscapeTimelineStory, storeEscapeTimeline } from '../escapeTimelineService.js';
import { normalizeEscape, advanceEscapeClarification, placeEscapeCard, evaluateEscape, escapeHint } from './storage/EscapeTimelineModel.js';
import { TimelineHelpController } from './archive/TimelineHelpController.js';
import { preloadPaper, playPaperChange } from './archive/PaperPuzzleAudio.js';

/* ------------------------------------------------------------------ */
/*  Layout constants (virtual canvas 1440 x 1020, scaled by layout())  */
/* ------------------------------------------------------------------ */
const W = 1440;
const H = 1020;
const GOLD = 0xd4af37;
const PAPER = 0xe8dcc0;
const PAPER_USED = 0xc2c8ae;
const PAPER_EDGE = 0x9b8662;
const INK = '#3f3126';
const SLOT_EMPTY = 0x2f2825;
const SLOT_FILLED = 0xdccfae;
const FRAME = 0x4a3020;
const RED = 0xa8442f;
const SLOT_Y0 = 231;
const SLOT_STEP = 85;
const ROUTE_X = 770;
const ROUTE_TOP = 200;

/* ------------------------------------------------------------------ */
/*  Detective muttering (flavour only, never gives the answer away)    */
/* ------------------------------------------------------------------ */
const QUIPS = {
  prepare: ['Packing list: one parachute, zero explanations.', 'Preparation. The most boring word in every heist.'],
  depart: ['Wheels up. Peanuts not included.', 'Every great disaster starts with a takeoff.'],
  jump: ['Stairs were apparently too mainstream.', 'Gravity: undefeated. Except, maybe, once.'],
  impact: ['Loud, expensive, and very convenient for someone.', 'Insurance people hate this one trick.'],
  recovery: ['Somebody had to dig through the wreckage. Not me. Not today.', 'Paperwork after an explosion. Romantic.'],
  body: ['Not my favourite card. Moving on, quietly.', 'Grim. I will need a sandwich after this.'],
  artifact: ['Priceless relic. Priced, in my case, per hour.', 'Museums love this. Insurers less so.'],
  destination: ['A pin on a map. Pins are optimistic.', 'Home sweet hideout. Allegedly.']
};
const GENERIC = [
  'Order matters. So does coffee.',
  'Somewhere out there, a parachute is laughing at me.',
  'Pick a card. Any card. Preferably a true one.',
  'If in doubt, blame the pilot. (Do not blame the pilot.)',
  'Detective rule #4: never trust a perfectly tidy crash.'
];
const PLACE_QUIPS = ['Filed. Dramatically.', 'Into the timeline it goes.', 'That looks right. Or confidently wrong.', 'Pinned. No take-backs. (Take-backs allowed.)'];
const CLEAR_QUIPS = ['Back to the pile.', 'Erased. Evidence was never here.', 'Second thoughts are free.'];
const FAIL_QUIPS = ['The timeline coughs politely.', 'Reality filed a complaint.', 'Hmm. The corkboard is unimpressed.'];
const WIN_QUIPS = ['Case cracked. Somebody owes me a coffee.', 'Told you. The stairs were too mainstream.'];
const CONCLUSION_QUIP = 'Bold conclusion. Let us see who it annoys.';

const pick = list => list[Math.floor(Math.random() * list.length)];

function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

function halfDisc(cx, cy, rx, ry, steps = 14) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI + (Math.PI * i) / steps;
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  return pts;
}

function starPoints(cx, cy, spikes, outer, inner) {
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

/** Little plane, nose pointing right. */
function planeShape(g, x, y, s, color) {
  g.fillStyle(color, 1);
  g.fillEllipse(x, y, 46 * s, 13 * s);
  g.fillTriangle(x - 6 * s, y, x - 18 * s, y - 22 * s, x + 2 * s, y);
  g.fillTriangle(x - 6 * s, y, x - 18 * s, y + 22 * s, x + 2 * s, y);
  g.fillTriangle(x - 20 * s, y, x - 28 * s, y - 10 * s, x - 14 * s, y);
  g.fillTriangle(x - 20 * s, y, x - 28 * s, y + 10 * s, x - 14 * s, y);
  g.fillStyle(0x2a1f22, 1);
  g.fillCircle(x + 10 * s, y - 1 * s, 3 * s);
}

/** Simple procedural icons, ~40px box centred on x,y. */
function drawIcon(g, id, x, y, s = 1) {
  const ink = 0x3f3126;
  const accent = 0xa8442f;
  switch (id) {
    case 'prepare': // backpack
      g.fillStyle(ink, 1).fillRoundedRect(x - 12 * s, y - 13 * s, 24 * s, 28 * s, 6 * s);
      g.fillRect(x - 4 * s, y - 19 * s, 8 * s, 6 * s);
      g.fillStyle(accent, 1).fillRect(x - 12 * s, y + 2 * s, 24 * s, 5 * s);
      g.fillStyle(0xe8dcc0, 1).fillRect(x - 5 * s, y + 2 * s, 10 * s, 5 * s);
      break;
    case 'depart':
      planeShape(g, x, y, 0.78 * s, ink);
      break;
    case 'jump': // parachute
      g.fillStyle(accent, 1).fillPoints(halfDisc(x, y - 4 * s, 18 * s, 14 * s), true);
      g.lineStyle(2 * s, ink, 1);
      g.lineBetween(x - 18 * s, y - 4 * s, x, y + 10 * s);
      g.lineBetween(x + 18 * s, y - 4 * s, x, y + 10 * s);
      g.lineBetween(x, y - 4 * s, x, y + 10 * s);
      g.fillStyle(ink, 1).fillCircle(x, y + 13 * s, 3.5 * s);
      g.lineBetween(x, y + 16 * s, x, y + 22 * s);
      break;
    case 'impact': // explosion
      g.fillStyle(0xc2571f, 1).fillPoints(starPoints(x, y, 8, 20 * s, 10 * s), true);
      g.fillStyle(0xf0ce88, 1).fillPoints(starPoints(x, y, 8, 11 * s, 5 * s), true);
      break;
    case 'recovery': // magnifier
      g.lineStyle(4 * s, ink, 1).strokeCircle(x - 3 * s, y - 3 * s, 11 * s);
      g.lineStyle(6 * s, ink, 1).lineBetween(x + 5 * s, y + 5 * s, x + 16 * s, y + 16 * s);
      g.fillStyle(accent, 0.5).fillCircle(x - 3 * s, y - 3 * s, 7 * s);
      break;
    case 'body': // tombstone
      g.fillStyle(ink, 1).fillRect(x - 11 * s, y - 4 * s, 22 * s, 22 * s);
      g.fillCircle(x, y - 4 * s, 11 * s);
      g.lineStyle(3 * s, 0xe8dcc0, 1);
      g.lineBetween(x, y - 8 * s, x, y + 6 * s);
      g.lineBetween(x - 5 * s, y - 3 * s, x + 5 * s, y - 3 * s);
      break;
    case 'artifact': // vase
      g.fillStyle(ink, 1).fillEllipse(x, y + 6 * s, 26 * s, 26 * s);
      g.fillRect(x - 5 * s, y - 16 * s, 10 * s, 12 * s);
      g.fillRect(x - 9 * s, y - 19 * s, 18 * s, 4 * s);
      g.fillStyle(accent, 1).fillRect(x - 12 * s, y + 4 * s, 24 * s, 5 * s);
      break;
    case 'destination': // house
      g.fillStyle(ink, 1).fillTriangle(x - 17 * s, y - 1 * s, x, y - 17 * s, x + 17 * s, y - 1 * s);
      g.fillRect(x - 12 * s, y - 1 * s, 24 * s, 17 * s);
      g.fillStyle(accent, 1).fillRect(x - 3 * s, y + 5 * s, 6 * s, 11 * s);
      break;
    default:
      g.lineStyle(3 * s, ink, 1).strokeCircle(x, y, 14 * s);
      g.fillStyle(ink, 1).fillCircle(x, y + 7 * s, 2 * s);
  }
}

export class EscapeTimelineScene extends BaseScene {
  constructor() { super({ key: 'EscapeTimelineScene' }); }

  init(data = {}) {
    this.preview = data.preview === true;
    this.returnSceneKey = data.returnSceneKey ?? null;
    this.onFinished = typeof data.onFinished === 'function' ? data.onFinished : null;
    this.progress = null; this.selected = null; this.selectedSlot = null;
    this.cards = []; this.slotObjects = []; this.conclusionButtons = [];
    this.finished = false; this.resolved = false; this.closing = false;
    this.savedOk = null; this.stageSynced = null; this.timelineHelp = null;
    this.layerStates = []; this.parentPausedByMe = false; this.inputLockedUntil = 0;
    this.caseKey = 'holly_missing_husband'; this.stationId = 'john_staged_escape';
    this.evidenceConfig = { id: 'john_escape_timeline' };
    // visual state
    this.typing = null; this.typeEvent = null; this.fxTargets = [];
    this.hoverCard = null; this.hoverSlot = null;
    this.plane = null; this.trail = null; this.quip = null; this.stampShown = false;
  }

  preload() { preloadPaper(this); }

  create() {
    super.create();
    const story = getEscapeTimelineStory(); this.allowed = this.preview || story.eligible;
    this.progress = normalizeEscape(DATA, this.preview ? null : story);
    this.finished = this.progress.completed; this.resolved = !this.allowed;
    this.cameras.main.setBackgroundColor('#171619'); this.root = this.add.container(0, 0);
    this.drawDesk();
    this.content = this.add.container(0, 0); this.root.add(this.content);
    this.drawHeader();
    this.button(1235, 972, 'BACK', () => this.closeTimeline(), this.root);
    this.mode = this.label(720, 1006, this.preview ? __dialogueText("scenes/EscapeTimelineScene.js", "t_db1d7313ec962ed15287") :
      __dialogueText("scenes/EscapeTimelineScene.js", "t_fe7c3cd29673a481a79c"), 13, '#baa98e', 'SpecialElite', this.root);
    if (!this.allowed) this.buildLocked();
    else if (!this.progress.clarificationHeard) this.buildClarification(); else this.buildBoard();
    this.layout(); this.trackInputEvent(this.scale, 'resize', this.layout, this);
    if (this.input.keyboard) {
      this.trackInputEvent(this.input.keyboard, 'keydown-ESC', event => {
        if (!event.repeat) this.closeTimeline();
      }, this);
      const advance = event => {
        if (event?.repeat || !this.allowed || this.closing || this.progress.clarificationHeard) return;
        event?.preventDefault?.();
        this.advanceClarification();
      };
      this.trackInputEvent(this.input.keyboard, 'keydown-SPACE', advance, this);
      this.trackInputEvent(this.input.keyboard, 'keydown-ENTER', advance, this);
    }
    this.suspendBackground();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stopTyping(); this.restoreBackground(); this.onFinished = null;
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Generic helpers (signatures kept for TimelineHelpController)      */
  /* ---------------------------------------------------------------- */
  label(x, y, text, size = 21, color = '#e9dfc8', font = 'SpecialElite', parent = this.content) {
    const object = this.add.text(x, y, text, { fontFamily: `${font}, monospace`, fontSize: `${size}px`,
      color, align: 'center', wordWrap: { width: 1350 }, lineSpacing: 6 }).setOrigin(0.5);
    parent.add(object); return object;
  }

  button(x, y, text, callback, parent = this.content) {
    const object = this.add.text(x, y, text, { fontFamily: 'SpecialElite, monospace', fontSize: '21px',
      color: '#f1d89d', backgroundColor: '#4a3933', padding: { x: 17, y: 12 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    object.setShadow(2, 3, '#000000', 2, false, true);
    object.on('pointerover', () => { if (object.active && !this.closing) object.setScale(1.04); });
    object.on('pointerout', () => { if (object.active) object.setScale(1); });
    object.on('pointerdown', (p, lx, ly, event) => {
      event?.stopPropagation(); if (!this.closing) callback();
    }); parent.add(object); return object;
  }

  say(text) { if (this.quip?.active) this.quip.setText(text); }
  cardQuip(id) { return QUIPS[id] ? pick(QUIPS[id]) : pick(GENERIC); }

  bounce(object) {
    if (!object?.active) return;
    if (object.getData('baseY') === undefined) object.setData('baseY', object.y);
    const base = object.getData('baseY');
    this.tweens.killTweensOf(object); object.y = base;
    this.tweens.add({ targets: object, y: base - 6, duration: 110, yoyo: true, ease: 'Sine.easeOut' });
  }

  pop(object) {
    if (!object?.active) return;
    this.tweens.killTweensOf(object); object.setScale(1);
    this.tweens.add({ targets: object, scale: 1.12, duration: 90, yoyo: true, ease: 'Sine.easeOut' });
  }

  clearContent() {
    this.stopTyping();
    if (this.fxTargets.length) this.tweens.killTweensOf(this.fxTargets);
    this.fxTargets = [];
    this.content.removeAll(true);
  }

  makePlane(scale = 1, color = GOLD) {
    const g = this.add.graphics(); planeShape(g, 0, 0, 1, color);
    return this.add.container(0, 0, [g]).setScale(scale);
  }

  /* ---------------------------------------------------------------- */
  /*  Static decoration: desk, header                                   */
  /* ---------------------------------------------------------------- */
  drawDesk() {
    const rnd = seeded(7);
    const g = this.add.graphics(); this.root.add(g);
    g.fillStyle(0x2a1f22, 1).fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 96) {
      g.fillStyle(0x1c1416, 0.55).fillRect(0, y, W, 3);
      g.fillStyle(0x3a2c2f, 0.35).fillRect(0, y + 3, W, 2);
      for (let k = 0; k < 3; k++) {
        g.fillStyle(0x1c1416, 0.4).fillRect(Math.floor(rnd() * W), y + 3, 2, 93);
      }
    }
    for (let i = 0; i < 12; i++) {
      g.lineStyle(44, 0x000000, 0.05).strokeRect(i * 22 - 22, i * 22 - 22, W - i * 44 + 44, H - i * 44 + 44);
    }
    // header / footer bands
    g.fillStyle(0x140f11, 0.92).fillRect(0, 0, W, 68);
    g.fillStyle(GOLD, 0.6).fillRect(0, 68, W, 2);
    g.fillStyle(0x140f11, 0.88).fillRect(0, 938, W, H - 938);
    g.fillStyle(GOLD, 0.5).fillRect(0, 938, W, 2);
    // coffee ring, obviously
    g.lineStyle(5, 0x6b4423, 0.28).strokeCircle(1368, 975, 38);
    g.lineStyle(3, 0x6b4423, 0.14).strokeCircle(1371, 977, 34);
    g.fillStyle(0x6b4423, 0.12).fillCircle(1400, 948, 5);
  }

  drawHeader() {
    const title = this.label(720, 42, DATA.title, 24, '#f0ce88', 'PressStart2P', this.root);
    title.setShadow(3, 3, '#000000', 0, false, true);
    const left = this.makePlane(1.1, GOLD).setPosition(290, 36);
    const right = this.makePlane(1.1, GOLD).setPosition(1150, 36).setScale(-1.1, 1.1);
    this.root.add([left, right]);
    this.tweens.add({ targets: [left, right], y: 30, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /* ---------------------------------------------------------------- */
  /*  Locked screen                                                     */
  /* ---------------------------------------------------------------- */
  buildLocked() {
    this.clearContent();
    this.content.add(this.add.rectangle(724, 488, 1000, 220, 0x000000, 0.35));
    this.content.add(this.add.rectangle(720, 480, 1000, 220, PAPER).setStrokeStyle(3, PAPER_EDGE));
    const text = this.label(720, 480, __dialogueText("scenes/EscapeTimelineScene.js", "t_21d55de9984b2a58ea4b"), 29, INK);
    text.setWordWrapWidth(920);
  }

  /* ---------------------------------------------------------------- */
  /*  Clarification: interview room with Detective and Alex             */
  /* ---------------------------------------------------------------- */
  makeBust(x, y, kind) {
    const g = this.add.graphics();
    const body = 0x0b0c0f;
    g.fillStyle(body, 1);
    g.fillEllipse(0, 135, 250, 150);
    g.fillRect(-18, 40, 36, 50);
    g.fillCircle(0, 0, 54);
    g.lineStyle(2, GOLD, 0.3).strokeCircle(0, 0, 54);
    if (kind === 'detective') {
      g.fillStyle(body, 1);
      g.fillEllipse(0, -34, 170, 26);
      g.fillRoundedRect(-42, -84, 84, 56, 10);
      g.fillStyle(GOLD, 0.85).fillRect(-42, -44, 84, 9);
    } else {
      g.fillStyle(body, 1).fillEllipse(0, -16, 122, 70);
      g.fillStyle(0x2a2c33, 1).fillCircle(-24, -24, 14).fillCircle(24, -24, 14);
      g.lineStyle(3, GOLD, 0.9).strokeCircle(-24, -24, 14).strokeCircle(24, -24, 14);
      g.lineBetween(-10, -24, 10, -24);
    }
    return this.add.container(x, y, [g]);
  }

  buildClarification() {
    this.clearContent();
    const c = this.content;
    const total = DATA.clarification.length;
    const index = Phaser.Math.Clamp(this.progress.clarificationLine, 0, total - 1);
    const raw = String(DATA.clarification[index] ?? '');
    const match = raw.match(/^([A-Z][A-Z .'-]{1,24}):\s*([\s\S]*)$/);
    const speaker = match ? match[1].trim() : '';
    const line = match ? match[2] : raw;
    const leftSpeaks = speaker === 'DETECTIVE';

    // wall, window blinds, lamp
    const wall = this.add.graphics(); c.add(wall);
    wall.fillStyle(0x1f2a2b, 1).fillRect(40, 110, 1360, 530);
    wall.lineStyle(3, GOLD, 0.55).strokeRect(40, 110, 1360, 530);
    wall.fillStyle(0x0f1516, 1).fillRect(62, 142, 280, 438);
    for (let i = 0; i < 9; i++) wall.fillStyle(0xf0ce88, 0.08).fillRect(70, 150 + i * 50, 264, 18);
    wall.lineStyle(4, 0x3a2c2f, 1).strokeRect(62, 142, 280, 438);
    wall.lineStyle(2, 0x6b5a3a, 1).lineBetween(720, 110, 720, 146);
    wall.fillStyle(0x5b4a2c, 1).fillPoints([{ x: 692, y: 146 }, { x: 748, y: 146 }, { x: 770, y: 180 }, { x: 670, y: 180 }], true);
    wall.fillStyle(0xf8e6a8, 1).fillEllipse(720, 182, 36, 10);
    wall.fillStyle(0xf0ce88, 0.05).fillPoints([{ x: 676, y: 184 }, { x: 764, y: 184 }, { x: 1010, y: 640 }, { x: 430, y: 640 }], true);

    // humorous poster
    wall.fillStyle(0x000000, 0.3).fillRect(1166, 135, 150, 170);
    wall.fillStyle(PAPER, 1).fillRect(1160, 128, 150, 170);
    wall.lineStyle(2, PAPER_EDGE, 1).strokeRect(1160, 128, 150, 170);
    planeShape(wall, 1235, 190, 1.1, 0x3f3126);
    c.add(this.add.text(1235, 150, 'FLY SAFE!', { fontFamily: 'PressStart2P, monospace', fontSize: '11px', color: '#a8442f' }).setOrigin(0.5));
    c.add(this.add.text(1235, 252, 'Parachutes\nare optional*', { fontFamily: 'SpecialElite, monospace', fontSize: '14px', color: INK, align: 'center' }).setOrigin(0.5));
    c.add(this.add.text(1235, 284, '*not really', { fontFamily: 'SpecialElite, monospace', fontSize: '11px', color: '#74463a' }).setOrigin(0.5));

    // characters
    const detective = this.makeBust(215, 470, 'detective');
    const alex = this.makeBust(1225, 470, 'alex');
    c.add([detective, alex]);
    const active = leftSpeaks ? detective : alex;
    const idle = leftSpeaks ? alex : detective;
    active.setAlpha(1); idle.setAlpha(speaker ? 0.45 : 0.8);
    if (speaker) {
      this.fxTargets.push(active);
      this.tweens.add({ targets: active, y: 464, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // table (drawn after busts so it hides the shoulders)
    const table = this.add.graphics(); c.add(table);
    table.fillStyle(0x3b2a22, 1).fillRect(40, 640, 1360, 270);
    table.fillStyle(0x5a4030, 1).fillRect(40, 640, 1360, 8);
    table.lineStyle(3, GOLD, 0.45).strokeRect(40, 640, 1360, 270);
    table.fillStyle(0xcaa968, 1).fillRect(130, 678, 170, 104).fillRect(130, 668, 60, 12);
    table.lineStyle(2, 0x8a7240, 1).strokeRect(130, 678, 170, 104);
    table.fillStyle(0xe8dcc0, 1).fillRect(1190, 694, 46, 50);
    table.lineStyle(5, 0xe8dcc0, 1).strokeCircle(1243, 716, 12);
    table.lineStyle(2, 0xffffff, 0.25);
    table.lineBetween(1205, 686, 1210, 672); table.lineBetween(1220, 686, 1215, 668);

    // speech bubble
    const bubble = this.add.graphics(); c.add(bubble);
    bubble.fillStyle(0x000000, 0.35).fillRoundedRect(376, 216, 700, 300, 14);
    bubble.fillStyle(PAPER, 1).fillRoundedRect(370, 210, 700, 300, 14);
    bubble.lineStyle(3, PAPER_EDGE, 1).strokeRoundedRect(370, 210, 700, 300, 14);
    if (leftSpeaks) bubble.fillStyle(PAPER, 1).fillTriangle(372, 400, 372, 452, 296, 474);
    else bubble.fillStyle(PAPER, 1).fillTriangle(1068, 400, 1068, 452, 1144, 474);
    if (speaker) {
      c.add(this.add.rectangle(520, 210, 230, 34, 0x2a1f22).setStrokeStyle(2, GOLD));
      c.add(this.add.text(520, 211, speaker, { fontFamily: 'PressStart2P, monospace', fontSize: '13px', color: '#f0ce88' }).setOrigin(0.5));
    }
    const dialogue = this.add.text(404, 262, '', { fontFamily: 'SpecialElite, monospace', fontSize: '25px',
      color: INK, align: 'left', wordWrap: { width: 630 }, lineSpacing: 5 }).setOrigin(0, 0);
    c.add(dialogue);
    c.add(this.add.text(1050, 496, `${index + 1}/${total}`, { fontFamily: 'PressStart2P, monospace', fontSize: '11px', color: '#74463a' }).setOrigin(1, 1));
    const catcher = this.add.rectangle(720, 360, 700, 300, 0x000000, 0.001).setInteractive({ useHandCursor: true });
    catcher.on('pointerdown', () => { if (!this.closing) this.finishTyping(); });
    c.add(catcher);

    const isLast = index === total - 1;
    this.button(720, 790, isLast ? __dialogueText("scenes/EscapeTimelineScene.js", "t_842023449004f11a1186") : 'CONTINUE',
      () => this.advanceClarification());
    c.add(this.add.text(720, 850, 'SPACE / ENTER', { fontFamily: 'PressStart2P, monospace', fontSize: '10px', color: '#baa98e' }).setOrigin(0.5));
    this.label(720, 88, __dialogueText("scenes/EscapeTimelineScene.js", "t_755ee6928d36d1cb9592"), 28, '#f0ce88');

    this.startTyping(dialogue, line);
  }

  advanceClarification() {
    if (this.closing || this.progress.clarificationHeard) return;
    if (this.time.now < this.inputLockedUntil) return;
    if (this.finishTyping()) { this.inputLockedUntil = this.time.now + 120; return; }
    this.inputLockedUntil = this.time.now + 180;
    this.progress = advanceEscapeClarification(DATA, this.progress); this.persist();
    if (this.progress.clarificationHeard) this.buildBoard(); else this.buildClarification();
  }

  startTyping(textObject, full) {
    this.stopTyping();
    textObject.setText(full);
    let wrapped = full;
    try { wrapped = textObject.getWrappedText(full).join('\n'); } catch (error) { wrapped = full; }
    textObject.setText('');
    this.typing = { textObject, wrapped };
    let n = 0;
    this.typeEvent = this.time.addEvent({ delay: 18, loop: true, callback: () => {
      if (!this.typing || !textObject.active) { this.stopTyping(); return; }
      n += 1; textObject.setText(wrapped.slice(0, n));
      if (n >= wrapped.length) this.stopTyping();
    } });
  }

  /** Returns true if text was still typing and has been completed. */
  finishTyping() {
    if (!this.typing) return false;
    const { textObject, wrapped } = this.typing;
    this.stopTyping();
    if (textObject?.active) textObject.setText(wrapped);
    return true;
  }

  stopTyping() {
    if (this.typeEvent) { this.typeEvent.remove(false); this.typeEvent = null; }
    this.typing = null;
  }

  /* ---------------------------------------------------------------- */
  /*  Main board                                                        */
  /* ---------------------------------------------------------------- */
  buildBoard() {
    this.clearContent();
    this.timelineHelp?.destroy?.(); this.timelineHelp = null;
    this.cards = []; this.slotObjects = []; this.conclusionButtons = [];
    this.hoverCard = null; this.hoverSlot = null; this.stampShown = false;
    const c = this.content;
    const rnd = seeded(21);

    this.label(720, 88, __dialogueText("scenes/EscapeTimelineScene.js", "t_98d71b47559a887ab145"), 21);
    this.label(720, 120, __dialogueText("scenes/EscapeTimelineScene.js", "t_24741cff7cf28e8e233f"), 20, '#c5b59a');

    // section ribbons
    c.add(this.add.rectangle(360, 159, 640, 32, 0x140f11, 0.85).setStrokeStyle(1, GOLD, 0.55));
    c.add(this.add.rectangle(1080, 159, 640, 32, 0x140f11, 0.85).setStrokeStyle(1, GOLD, 0.55));
    this.label(360, 159, __dialogueText("scenes/EscapeTimelineScene.js", "t_ae090581dd9ad5cc19b7"), 19, '#d9c79e');
    this.label(1080, 159, __dialogueText("scenes/EscapeTimelineScene.js", "t_386d3375ef1d41c1d1b3"), 19, '#d9c79e');

    // cork board
    c.add(this.add.rectangle(360, 410, 710, 472, FRAME));
    c.add(this.add.rectangle(360, 410, 696, 458, 0x9c7549));
    const cork = this.add.graphics(); c.add(cork);
    for (let i = 0; i < 340; i++) {
      const dark = rnd() > 0.5;
      cork.fillStyle(dark ? 0x6f4f2c : 0xb98d5a, 0.45)
        .fillRect(12 + rnd() * 692, 181 + rnd() * 454, 2 + rnd() * 2, 2 + rnd() * 2);
    }

    // flight chart
    c.add(this.add.rectangle(1080, 410, 710, 472, FRAME));
    c.add(this.add.rectangle(1080, 410, 696, 458, 0x39484f));
    const chart = this.add.graphics(); c.add(chart);
    for (let x = 780; x < 1428; x += 48) chart.lineStyle(1, 0x5a6d76, 0.35).lineBetween(x, 181, x, 639);
    for (let y = 229; y < 639; y += 48) chart.lineStyle(1, 0x5a6d76, 0.35).lineBetween(732, y, 1428, y);
    for (let k = 0; k < 4; k++) {
      chart.lineStyle(2, 0x6c8590, 0.22).beginPath();
      for (let x = 732; x <= 1428; x += 12) {
        const y = 241 + k * 105 + Math.sin(x * 0.012 + k * 1.7) * 22;
        if (x === 732) chart.moveTo(x, y); else chart.lineTo(x, y);
      }
      chart.strokePath();
    }
    for (let y = ROUTE_TOP; y <= 600; y += 16) chart.fillStyle(0x9fb2b9, 0.7).fillRect(ROUTE_X - 2, y, 4, 9);
    this.trail = this.add.graphics(); c.add(this.trail);
    this.plane = this.makePlane(1, PAPER).setRotation(Math.PI / 2).setPosition(ROUTE_X, ROUTE_TOP);
    c.add(this.plane);

    // evidence cards
    const iconJobs = [];
    Phaser.Utils.Array.Shuffle([...DATA.cards]).forEach((card, index) => {
      const x = 193 + (index % 2) * 344, y = 243 + Math.floor(index / 2) * 110;
      const shadow = this.add.rectangle(x + 4, y + 6, 326, 100, 0x000000, 0.35);
      const box = this.add.rectangle(x, y, 326, 100, PAPER).setStrokeStyle(2, PAPER_EDGE)
        .setInteractive({ useHandCursor: true });
      const divider = this.add.rectangle(x - 96, y + 2, 1, 70, PAPER_EDGE, 0.7);
      const pin = this.add.circle(x, y - 47, 6, 0xb3382a).setStrokeStyle(1, 0x5a1b13).setData('baseY', y - 47);
      const title = this.add.text(x - 88, y - 40, card.title, { fontFamily: 'SpecialElite, monospace', fontSize: '17px',
        color: INK, wordWrap: { width: 236 }, lineSpacing: 2 }).setOrigin(0, 0);
      const body = this.add.text(x - 88, title.y + title.height + 3, card.text, { fontFamily: 'SpecialElite, monospace',
        fontSize: '14px', color: '#534636', wordWrap: { width: 236 } }).setOrigin(0, 0);
      for (let size = 14; size > 11 && body.y + body.height > y + 46; size--) body.setFontSize(size - 1);
      const parts = [shadow, box, divider, pin, title, body];
      c.add(parts);
      parts.forEach(part => part.setAlpha(0));
      this.tweens.add({ targets: parts, alpha: 1, duration: 240, delay: index * 45 });
      iconJobs.push([card.id, x - 129, y + 2]);
      box.on('pointerdown', () => {
        if (this.closing || this.timelineHelp?.modal) return;
        this.inspect(card.id); if (!this.canEdit()) return;
        this.selected = this.selected === card.id ? null : card.id;
        this.selectedSlot = null;
        if (this.selected) { this.say(this.cardQuip(card.id)); this.bounce(pin); }
        this.refreshBoard();
      });
      box.on('pointerover', () => { this.hoverCard = card.id; this.refreshBoard(); });
      box.on('pointerout', () => { if (this.hoverCard === card.id) this.hoverCard = null; this.refreshBoard(); });
      this.cards.push({ id: card.id, box, pin });
    });
    const iconLayer = this.add.graphics(); c.add(iconLayer);
    iconJobs.forEach(([id, ix, iy]) => drawIcon(iconLayer, id, ix, iy, 1));
    iconLayer.setAlpha(0);
    this.tweens.add({ targets: iconLayer, alpha: 1, duration: 300, delay: 200 });

    // timeline slots
    for (let index = 0; index < DATA.slotCount; index++) {
      const y = SLOT_Y0 + index * SLOT_STEP;
      const shadow = this.add.rectangle(1109, y + 5, 590, 75, 0x000000, 0.35);
      const box = this.add.rectangle(1105, y, 590, 75, SLOT_EMPTY).setStrokeStyle(2, 0x957a58)
        .setInteractive({ useHandCursor: true });
      const iconG = this.add.graphics();
      const text = this.add.text(1142, y, '', { fontFamily: 'SpecialElite, monospace', fontSize: '21px',
        color: '#f0dfbd', align: 'center', wordWrap: { width: 500 } }).setOrigin(0.5);
      const dot = this.add.circle(ROUTE_X, y, 15, 0x2a1f22).setStrokeStyle(3, GOLD);
      const num = this.add.text(ROUTE_X, y + 1, String(index + 1), { fontFamily: 'PressStart2P, monospace',
        fontSize: '11px', color: '#d4af37' }).setOrigin(0.5);
      c.add([shadow, box, iconG, text, dot, num]);
      box.on('pointerdown', () => this.chooseSlot(index));
      box.on('pointerover', () => { this.hoverSlot = index; this.refreshBoard(); });
      box.on('pointerout', () => { if (this.hoverSlot === index) this.hoverSlot = null; this.refreshBoard(); });
      this.slotObjects.push({ box, text, dot, num, iconG, y });
    }

    // source panel (evidence tag)
    c.add(this.add.rectangle(724, 742, 1360, 124, 0x000000, 0.3));
    c.add(this.add.rectangle(720, 738, 1360, 124, PAPER).setStrokeStyle(2, PAPER_EDGE));
    c.add(this.add.rectangle(48, 738, 8, 124, RED));
    c.add(this.add.rectangle(1392, 738, 8, 124, RED));
    c.add(this.add.rectangle(360, 659, 696, 30, 0x140f11, 0.8).setStrokeStyle(1, GOLD, 0.4));
    this.quip = this.add.text(360, 659, '', { fontFamily: 'SpecialElite, monospace', fontSize: '16px',
      color: '#e6d3a3', align: 'center', wordWrap: { width: 670 } }).setOrigin(0.5);
    c.add(this.quip);
    this.sourceTitle = this.label(720, 702, __dialogueText("scenes/EscapeTimelineScene.js", "t_108b1fd9151c8c24d764"), 18, '#74463a');
    this.sourceBody = this.label(720, 755, __dialogueText("scenes/EscapeTimelineScene.js", "t_006b078135800e361ea4"), 18, '#3d332c');
    this.sourceBody.setWordWrapWidth(1290); this.sourceBody.setLineSpacing(4);

    // conclusions
    this.label(720, 819, __dialogueText("scenes/EscapeTimelineScene.js", "t_84cdca535d0221086214"), 19, '#d9c79e');
    c.add(this.add.rectangle(720, 864, 1360, 70, 0x140f11, 0.55).setStrokeStyle(1, GOLD, 0.3));
    DATA.conclusions.forEach((item, index) => {
      const button = this.button(260 + index * 460, 864, item.label, () => {
        if (!this.canEdit()) return;
        this.progress.conclusion = item.id; this.persist();
        this.pop(button); this.say(CONCLUSION_QUIP); this.refreshBoard();
      }); this.conclusionButtons.push({ id: item.id, button });
    });

    c.add(this.add.rectangle(720, 918, 1360, 44, 0x140f11, 0.5));
    this.message = this.label(720, 918, __dialogueText("scenes/EscapeTimelineScene.js", "t_6b1c550cbaf46058f1b6"), 20);
    this.checkButton = this.button(265, 972, __dialogueText("scenes/EscapeTimelineScene.js", "t_b4493e0624ec05e17e42"), () => this.checkTimeline());
    this.clearButton = this.button(600, 972, __dialogueText("scenes/EscapeTimelineScene.js", "t_dfaa13932eb9b80ee382"), () => this.clearSlot());
    this.timelineHelp = new TimelineHelpController(this); this.timelineHelp.create();
    this.say(pick(GENERIC));
    this.refreshBoard(); this.updatePlane(false);
    if (this.finished) this.showSuccess(false);
  }

  canEdit() { return this.allowed && !this.finished && !this.closing && !this.timelineHelp?.modal; }

  inspect(id) {
    const card = DATA.cards.find(item => item.id === id);
    const source = DATA.evidence.find(item => item.id === card?.evidence);
    if (source) { this.sourceTitle.setText(`${card.title}${__dialogueText("scenes/EscapeTimelineScene.js", "t_005e1574a2b5c8163046")}${source.title}`); this.sourceBody.setText(source.text); }
  }

  chooseSlot(index) {
    if (this.closing || this.timelineHelp?.modal) return;
    if (this.progress.slots[index]) this.inspect(this.progress.slots[index]);
    if (!this.canEdit()) return;
    const before = [...this.progress.slots];
    if (this.selected) {
      this.progress = placeEscapeCard(DATA, this.progress, this.selected, index);
      this.selected = null; this.selectedSlot = index; this.persist();
      this.say(pick(PLACE_QUIPS));
    } else if (this.selectedSlot !== null && this.selectedSlot !== index) {
      const first = this.selectedSlot;
      [this.progress.slots[first], this.progress.slots[index]] = [this.progress.slots[index], this.progress.slots[first]];
      this.selectedSlot = null; this.persist();
      this.say('Swapped. The timeline did a little shuffle.');
    } else this.selectedSlot = this.selectedSlot === index ? null : index;
    playPaperChange(this, before, this.progress.slots);
    this.refreshBoard(); this.updatePlane(true);
    if (before[index] !== this.progress.slots[index]) this.pulseSlot(index);
  }

  clearSlot() {
    if (!this.canEdit() || this.selectedSlot === null) return;
    const before = [...this.progress.slots];
    this.progress.slots[this.selectedSlot] = null;
    this.selectedSlot = null; this.selected = null; this.persist();
    playPaperChange(this, before, this.progress.slots);
    this.say(pick(CLEAR_QUIPS));
    this.refreshBoard(); this.updatePlane(true);
  }

  pulseSlot(index) {
    const slot = this.slotObjects[index];
    if (!slot?.box?.active) return;
    this.tweens.killTweensOf(slot.box); slot.box.setScale(1);
    this.tweens.add({ targets: slot.box, scaleX: 1.025, scaleY: 1.1, duration: 100, yoyo: true, ease: 'Sine.easeOut' });
  }

  refreshBoard() {
    const placed = new Set(this.progress.slots.filter(Boolean));
    const editable = this.canEdit();
    this.cards.forEach(card => {
      const selected = this.selected === card.id;
      const hover = editable && this.hoverCard === card.id;
      const used = placed.has(card.id);
      card.box.setFillStyle(used ? PAPER_USED : PAPER);
      card.box.setStrokeStyle(selected ? 4 : hover ? 3 : 2, selected ? 0xe7ac48 : hover ? 0xc9a24b : PAPER_EDGE);
      card.pin.setFillStyle(used ? 0x5d8a52 : selected ? 0xe7ac48 : 0xb3382a);
    });
    this.slotObjects.forEach((slot, index) => {
      const { box, text, dot, num, iconG, y } = slot;
      const card = DATA.cards.find(item => item.id === this.progress.slots[index]);
      const selected = this.selectedSlot === index;
      const hover = editable && this.hoverSlot === index;
      text.setText(card?.title ?? __dialogueText("scenes/EscapeTimelineScene.js", "t_c86957f856ebb1f781bf"));
      text.setColor(card ? INK : '#9c8b72');
      box.setFillStyle(card ? SLOT_FILLED : SLOT_EMPTY);
      box.setStrokeStyle(selected ? 4 : hover ? 3 : 2, selected ? 0xe7ac48 : hover ? 0xc9a24b : 0x957a58);
      dot.setFillStyle(card ? GOLD : 0x2a1f22);
      num.setColor(card ? '#2a1f22' : '#d4af37');
      iconG.clear();
      if (card) drawIcon(iconG, card.id, 842, y, 0.9);
    });
    this.conclusionButtons.forEach(({ id, button }) => button.setBackgroundColor(this.progress.conclusion === id ? '#725337' : '#4a3933'));
  }

  /** Moves the little plane to the last consecutively filled waypoint. */
  updatePlane(animate = true) {
    if (!this.plane?.active) return;
    let last = -1;
    for (let i = 0; i < this.progress.slots.length; i++) {
      if (this.progress.slots[i]) last = i; else break;
    }
    const targetY = last < 0 ? ROUTE_TOP : SLOT_Y0 + last * SLOT_STEP;
    this.tweens.killTweensOf(this.plane);
    if (!animate) { this.plane.y = targetY; this.drawTrail(); return; }
    this.tweens.add({ targets: this.plane, y: targetY, duration: 380, ease: 'Sine.easeInOut',
      onUpdate: () => this.drawTrail(), onComplete: () => this.drawTrail() });
  }

  drawTrail() {
    if (!this.trail?.active || !this.plane?.active) return;
    this.trail.clear().fillStyle(GOLD, 0.9);
    for (let y = ROUTE_TOP; y < this.plane.y; y += 16) this.trail.fillRect(ROUTE_X - 2, y, 4, 9);
  }

  getForensicHelp() {
    const hint = escapeHint(DATA, this.progress);
    return { ...hint, targets: [hint.cardId ? this.cards.find(card => card.id === hint.cardId)?.box : null,
      Number.isInteger(hint.slotIndex) ? this.slotObjects[hint.slotIndex]?.box : null,
      hint.conclusionId ? this.conclusionButtons.find(item => item.id === hint.conclusionId)?.button : null].filter(Boolean) };
  }

  setDialogue(text) { this.message?.setText(`${__dialogueText("scenes/EscapeTimelineScene.js", "t_e0e94082545fdad681ba")}${text}`).setFontSize(18); }

  persist() {
    if (this.preview || !this.allowed) return;
    const result = storeEscapeTimeline(this.progress);
    this.savedOk = result.saved; this.stageSynced = result.stageSynced;
  }

  checkTimeline() {
    if (!this.canEdit()) return;
    const result = evaluateEscape(DATA, this.progress); this.progress.checks++;
    if (!result.ok) {
      if (result.cardId) this.inspect(result.cardId);
      if (Number.isInteger(result.slotIndex)) this.selectedSlot = result.slotIndex;
      this.message.setText(result.message).setFontSize(20); this.say(pick(FAIL_QUIPS));
      this.cameras.main.shake(140, 0.0025);
      this.persist(); this.refreshBoard(); return;
    }
    this.progress.completed = true; this.finished = true; this.selected = null; this.selectedSlot = null;
    this.persist(); this.say(pick(WIN_QUIPS)); this.showSuccess(true);
  }

  /* ---------------------------------------------------------------- */
  /*  Success                                                           */
  /* ---------------------------------------------------------------- */
  showSuccess(animate = true) {
    this.checkButton.setVisible(false); this.clearButton.setVisible(false);
    this.timelineHelp?.hintButton?.setVisible(false);
    this.conclusionButtons.forEach(item => item.button.disableInteractive());
    this.sourceTitle.setText(__dialogueText("scenes/EscapeTimelineScene.js", "t_cd2088cb02151e7272f7")); this.sourceBody.setText(DATA.success);
    this.message.setText(this.preview ? __dialogueText("scenes/EscapeTimelineScene.js", "t_a291ed7256cec4187b32") : this.savedOk === false ?
      DATA.messages.saveFailed : this.stageSynced === false ?
      __dialogueText("scenes/EscapeTimelineScene.js", "t_68abfdfff6c9f05c1967") : DATA.messages.complete).setFontSize(20);
    this.refreshBoard(); this.updatePlane(animate);
    this.addSuccessFx(animate);
  }

  addSuccessFx(animate) {
    if (this.stampShown) return; this.stampShown = true;
    const c = this.content;
    const frame = this.add.rectangle(0, 0, 540, 100).setStrokeStyle(8, RED);
    const label = this.add.text(0, -4, 'RECONSTRUCTED', { fontFamily: 'PressStart2P, monospace', fontSize: '30px', color: '#a8442f' }).setOrigin(0.5);
    const sub = this.add.text(0, 34, 'APPROVED BY ABSOLUTELY NOBODY', { fontFamily: 'PressStart2P, monospace', fontSize: '10px', color: '#a8442f' }).setOrigin(0.5);
    const stamp = this.add.container(1080, 430, [frame, label, sub]).setRotation(-0.16).setAlpha(0.88);
    c.add(stamp);
    if (!animate) return;
    stamp.setScale(2.6).setAlpha(0);
    this.tweens.add({ targets: stamp, scale: 1, alpha: 0.88, duration: 380, ease: 'Back.easeIn',
      onComplete: () => { this.cameras.main.shake(120, 0.004); this.confetti(1080, 430); } });
    this.dropParachutist();
  }

  confetti(x, y, count = 34) {
    const colors = [GOLD, PAPER, RED, 0x7fa68a];
    for (let i = 0; i < count; i++) {
      const piece = this.add.rectangle(x, y, Phaser.Math.Between(6, 12), Phaser.Math.Between(4, 8), Phaser.Utils.Array.GetRandom(colors));
      piece.setRotation(Math.random() * Math.PI); this.content.add(piece);
      this.tweens.add({ targets: piece, x: x + Phaser.Math.Between(-420, 420), y: y + Phaser.Math.Between(-220, 260),
        angle: Phaser.Math.Between(-360, 360), alpha: 0, duration: Phaser.Math.Between(900, 1700), ease: 'Cubic.easeOut',
        onComplete: () => piece.destroy() });
    }
  }

  /** A tiny, deeply unbothered parachutist drifts across the screen. */
  dropParachutist() {
    const g = this.add.graphics();
    g.fillStyle(RED, 1).fillPoints(halfDisc(0, 0, 34, 26), true);
    g.fillStyle(PAPER, 1).fillPoints(halfDisc(0, 0, 11, 26), true);
    g.lineStyle(2, 0x3f3126, 1);
    g.lineBetween(-34, 0, 0, 40); g.lineBetween(34, 0, 0, 40); g.lineBetween(0, 0, 0, 40);
    g.fillStyle(0x3f3126, 1).fillCircle(0, 46, 6);
    g.lineBetween(0, 52, 0, 68); g.lineBetween(0, 58, -8, 64); g.lineBetween(0, 58, 8, 64);
    const wheee = this.add.text(44, 40, 'WHEEE', { fontFamily: 'PressStart2P, monospace', fontSize: '10px', color: '#f0ce88' }).setOrigin(0, 0.5);
    const chute = this.add.container(1290, -90, [g, wheee]);
    this.root.add(chute);
    this.tweens.add({ targets: chute, x: 1220, duration: 1500, yoyo: true, repeat: 3, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: chute, y: 1140, duration: 7200, ease: 'Sine.easeIn', onComplete: () => chute.destroy() });
  }

  /* ---------------------------------------------------------------- */
  /*  Layout / lifecycle                                                */
  /* ---------------------------------------------------------------- */
  layout() {
    if (!this.root) return;
    const { width, height } = this.scale, s = Math.min(width / 1440, height / 1020);
    this.root.setScale(s).setPosition((width - 1440 * s) / 2, (height - 1020 * s) / 2);
  }

  suspendBackground() {
    this.layerStates = ['PlayerHudScene', 'UIScene', 'NewsHud'].filter(key => this.isSceneActive(key)).map(key => {
      const visible = this.getRegisteredScene(key).sys.settings.visible;
      this.scene.setVisible(false, key); this.scene.pause(key); return { key, visible };
    });
    if (this.returnSceneKey && this.isSceneActive(this.returnSceneKey)) {
      this.parentPausedByMe = true; this.scene.pause(this.returnSceneKey);
    }
  }

  restoreBackground() {
    for (const { key, visible } of this.layerStates) {
      if (!this.hasScene(key)) continue;
      this.scene.setVisible(visible, key); if (this.isScenePaused(key)) this.scene.resume(key);
    }
    this.layerStates = [];
    if (this.parentPausedByMe && this.isScenePaused(this.returnSceneKey)) this.scene.resume(this.returnSceneKey);
    this.parentPausedByMe = false;
  }

  closeTimeline() {
    if (this.closing) return;
    this.closing = true; this.stopTyping(); this.timelineHelp?.close(); this.persist();
    const callback = this.onFinished; this.onFinished = null; this.restoreBackground();
    try { callback?.({ preview: this.preview, completed: this.finished, saved: this.savedOk, stageSynced: this.stageSynced }); }
    finally { this.scene.stop(); }
  }
}