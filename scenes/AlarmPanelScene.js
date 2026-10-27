import { BaseScene } from './BaseScene.js';

const FONT_UI = 'PressStart2P';
const FONT_DOC = 'SpecialElite';
const EXIT_SCENE = 'CrimeSceneScene'; // TODO: podmień na klucz swojej sceny miejsca zbrodni

const WRONG_LINES = [
  'The panel buzzes. It is judging you.',
  'Sparks! Somewhere, a security engineer senses a disturbance.',
  'Nope. The manual weeps quietly in the corner.',
  'The panel pretends nothing happened. Your score disagrees.',
  'A tiny "REALLY?" flickers on the display.',
];

const BONUS_CLUES = [
  { id: 'hair',   label: 'A black hair stuck under the cover' },
  { id: 'thread', label: 'A snagged piece of red thread' },
  { id: 'button', label: 'A torn-off coat button' },
];

export class AlarmPanelScene extends BaseScene {
  constructor() {
    super('AlarmPanelScene');
  }

  create() {
    super.create();
    this.generatePuzzle();
    this.buildUI();
    this.buildManual();
    this.setMessage('The thief tampered with the alarm. Dump the event log. The manual is... somewhere.');
  }

  // ---------- PUZZLE LOGIC ----------

  generatePuzzle() {
    this.serial = String(Phaser.Math.Between(0, 99999)).padStart(5, '0');
    this.serialOdd = parseInt(this.serial.slice(-1), 10) % 2 === 1;
    this.firmware = Phaser.Math.RND.pick(['v2.4', 'v3.1']);
    this.isV3 = this.firmware.startsWith('v3');
    this.sensorsTripped = Phaser.Math.Between(2, 5);
    this.bonusClue = Phaser.Math.RND.pick(BONUS_CLUES);

    const firstButton = this.serialOdd ? 'MEM' : 'TEST';
    const secondButton = this.serialOdd ? 'TEST' : 'MEM';
    const dipId = this.isV3 ? 1 : 2;
    const resetEarly = this.sensorsTripped > 3;

    this.solution = [{ type: 'button', id: firstButton }];
    if (resetEarly) {
      this.solution.push({ type: 'button', id: 'RESET' }, { type: 'dip', id: dipId, state: true });
    } else {
      this.solution.push({ type: 'dip', id: dipId, state: true }, { type: 'button', id: 'RESET' });
    }
    this.solution.push({ type: 'button', id: secondButton }, { type: 'button', id: 'ENTER' });

    this.progress = 0;
    this.strikes = 0;
    this.solved = false;
    this.dipStates = { 1: false, 2: false, 3: false, 4: false };
    this.screwsOut = 0;
  }

  handleAction(action) {
    if (this.solved) return;
    this.skipSatisfiedDips();
    const expected = this.solution[this.progress];
    const match = expected
      && expected.type === action.type
      && expected.id === action.id
      && (action.type !== 'dip' || expected.state === action.state);

    if (match) {
      this.playSfx('sfx_ok');
      this.progress++;
      this.skipSatisfiedDips();
      if (this.progress >= this.solution.length) this.onWin();
      else this.setMessage(`Step ${this.progress}/${this.solution.length} accepted. The panel purrs.`);
    } else {
      if (action.type === 'dip') this.revertDip(action.id);
      this.onMistake();
    }
  }

  skipSatisfiedDips() {
    while (this.progress < this.solution.length) {
      const s = this.solution[this.progress];
      if (s.type === 'dip' && this.dipStates[s.id] === s.state) this.progress++;
      else break;
    }
  }

  onMistake() {
    this.strikes++;
    this.playSfx('sfx_buzz');
    this.addScore(-50);
    this.cameras.main.shake(120, 0.004);
    this.flashPanel();
    let msg = Phaser.Math.RND.pick(WRONG_LINES) + '  (-50 pts)';
    if (this.strikes % 3 === 0) {
      this.progress = 0;
      msg += ' BUFFER WIPED — start the sequence over.';
    }
    this.setMessage(msg);
    this.refreshHud();
  }

  onWin() {
    this.solved = true;
    this.addScore(200);
    this.refreshHud();
    this.playSfx('sfx_success');
    this.setMessage('LOG DUMPED. The panel has seen things. +200 pts');

    const log = [
      '23:41  ZONE 3 — VAULT DOOR CONTACT',
      '23:44  ZONE 3 — MOTION (12 SEC)',
      '23:47  KEYPAD — SILENCED WITH CODE 2 (NIGHT GUARD)',
      '23:52  ZONE 1 — SERVICE DOOR OPENED',
      '00:03  ZONE 2 — GIFT SHOP MOTION (probably a cat)',
    ];
    this.registry.set('alarmLog', log);          // timeline dla Masterminda
    this.registry.set('crimeClue', this.bonusClue); // wskazówka do labu

    this.displayText.setText('EVENT LOG — DUMPING...');
    log.forEach((line, i) => {
      this.time.delayedCall(600 * (i + 1), () => this.printLogLine(line, i));
    });
    this.time.delayedCall(600 * (log.length + 1), () => {
      this.printLogLine(`EVIDENCE BAGGED: ${this.bonusClue.label}.`, log.length, '#7dff7a');
      this.exitButton.setVisible(true);
    });
  }

  addScore(delta) {
    const score = (this.registry.get('score') ?? 0) + delta;
    this.registry.set('score', score);
  }

  // ---------- UI ----------

  buildUI() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    this.add.rectangle(W / 2, H / 2, W, H, 0x101828);

    this.add.text(W / 2, 34, 'MUSEUM ALARM PANEL', {
      fontFamily: FONT_UI, fontSize: '20px', color: '#ffd75e',
    }).setOrigin(0.5);

    this.hudText = this.add.text(W - 20, 20, '', {
      fontFamily: FONT_UI, fontSize: '12px', color: '#9fd0ff',
    }).setOrigin(1, 0);
    this.refreshHud();

    // Obudowa panelu
    this.panel = this.add.rectangle(W / 2, H / 2 + 20, 620, 440, 0x8a8f98)
      .setStrokeStyle(4, 0x3a3f46);
    this.spark = this.add.rectangle(W / 2, H / 2 + 20, 620, 440, 0xffe14d).setAlpha(0);

    // Wyświetlacz
    this.add.rectangle(W / 2, H / 2 - 130, 540, 90, 0x1a2b1a).setStrokeStyle(3, 0x0c140c);
    this.displayText = this.add.text(W / 2 - 260, H / 2 - 168,
      `SEC-PANEL OS  ${this.firmware}\nZONES TRIPPED: ${this.sensorsTripped}\nS/N: [under service cover]`, {
        fontFamily: FONT_DOC, fontSize: '20px', color: '#7dff7a', lineSpacing: 6,
      });

    // LED-y stref (5 szt., zapalone = sensorsTripped)
    this.add.text(W / 2 - 270, H / 2 - 70, 'ZONES:', { fontFamily: FONT_UI, fontSize: '10px', color: '#222' });
    for (let i = 0; i < 5; i++) {
      const lit = i < this.sensorsTripped;
      const led = this.add.circle(W / 2 - 180 + i * 46, H / 2 - 64, 10, lit ? 0xff4444 : 0x442222)
        .setStrokeStyle(2, 0x222222);
      if (lit) this.tweens.add({ targets: led, alpha: 0.35, duration: 400, yoyo: true, repeat: -1, delay: i * 120 });
    }

    // Przyciski
    const btnDefs = [
      { id: 'TEST',  color: 0xd9a441 },
      { id: 'MEM',   color: 0xd9a441 },
      { id: 'RESET', color: 0xc0392b },
      { id: 'ENTER', color: 0x27ae60 },
    ];
    btnDefs.forEach((def, i) => this.makeButton(W / 2 - 195 + i * 130, H / 2 + 10, def));

    // DIP-switch bank (3 i 4 to red herringi)
    this.add.text(W / 2 - 270, H / 2 + 70, 'DIP:', { fontFamily: FONT_UI, fontSize: '10px', color: '#222' });
    this.dipKnobs = {};
    for (let i = 1; i <= 4; i++) this.makeDip(W / 2 - 180 + (i - 1) * 60, H / 2 + 110, i);

    // Klapka serwisowa + śrubki + naklejka S/N
    this.sticker = this.add.text(W / 2 + 150, H / 2 + 110, `S/N ${this.serial}`, {
      fontFamily: FONT_DOC, fontSize: '22px', color: '#333333',
      backgroundColor: '#e8e3d3', padding: { x: 10, y: 6 },
    }).setAngle(-4).setVisible(false);

    this.cover = this.add.rectangle(W / 2 + 150, H / 2 + 115, 190, 90, 0x6f747c)
      .setStrokeStyle(3, 0x3a3f46).setInteractive({ useHandCursor: true });
    this.cover.on('pointerdown', () => this.setMessage('Two screws. It is always two screws.'));

    this.screws = [];
    [[-80, -35], [80, 35]].forEach(([dx, dy]) => {
      const screw = this.add.text(this.cover.x + dx, this.cover.y + dy, '+', {
        fontFamily: FONT_DOC, fontSize: '24px', color: '#222',
      }).setOrigin(0.5).setAngle(45).setInteractive({ useHandCursor: true });
      screw.on('pointerdown', () => this.removeScrew(screw));
      this.screws.push(screw);
    });

    // Instrukcja + wyjście
    this.makeUiButton(W - 120, H - 40, 'MANUAL', () => this.toggleManual());
    this.exitButton = this.makeUiButton(120, H - 40, 'FILE CASE', () => this.scene.start(EXIT_SCENE));
    this.exitButton.setVisible(false);

    this.messageText = this.add.text(W / 2, H - 78, '', {
      fontFamily: FONT_UI, fontSize: '11px', color: '#ffe9a8',
      wordWrap: { width: W - 260 }, align: 'center',
    }).setOrigin(0.5);
  }

  makeButton(x, y, def) {
    const bg = this.add.rectangle(x, y, 110, 56, def.color).setStrokeStyle(3, 0x222222)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(x, y, def.id, { fontFamily: FONT_UI, fontSize: '12px', color: '#fff' }).setOrigin(0.5);
    bg.on('pointerdown', () => {
      this.tweens.add({ targets: [bg, label], y: y + 3, duration: 60, yoyo: true });
      this.playSfx('sfx_click');
      this.handleAction({ type: 'button', id: def.id });
    });
  }

  makeDip(x, y, id) {
    this.add.text(x, y - 52, `${id}`, { fontFamily: FONT_UI, fontSize: '10px', color: '#222' }).setOrigin(0.5);
    this.add.rectangle(x, y, 30, 70, 0x2c2f36).setStrokeStyle(2, 0x111111);
    const knob = this.add.rectangle(x, y + 18, 24, 26, 0xd9d9d9).setStrokeStyle(2, 0x555555)
      .setInteractive({ useHandCursor: true });
    this.dipKnobs[id] = { knob, baseY: y };
    knob.on('pointerdown', () => {
      if (this.solved) return;
      if (id >= 3) {
        this.setMessage(`DIP ${id} is not connected to anything. Probably. It clicks anyway.`);
        this.playSfx('sfx_click');
        return;
      }
      this.playSfx('sfx_click');
      const newState = !this.dipStates[id];
      this.dipStates[id] = newState;
      this.tweens.add({ targets: knob, y: y + (newState ? -18 : 18), duration: 80 });
      this.handleAction({ type: 'dip', id, state: newState });
    });
  }

  revertDip(id) {
    this.dipStates[id] = !this.dipStates[id];
    const { knob, baseY } = this.dipKnobs[id];
    this.tweens.add({ targets: knob, y: baseY + (this.dipStates[id] ? -18 : 18), duration: 80 });
  }

  removeScrew(screw) {
    this.playSfx('sfx_screw');
    this.tweens.add({
      targets: screw, angle: 400, alpha: 0, y: screw.y + 30, duration: 400,
      onComplete: () => screw.destroy(),
    });
    this.screwsOut++;
    this.setMessage(this.screwsOut === 1 ? 'Lefty loosey. One down.' : 'Cover is loose. Secrets imminent.');
    if (this.screwsOut === 2) {
      this.tweens.add({
        targets: this.cover, x: this.cover.x + 240, angle: 15, duration: 500, ease: 'Cubic.easeIn',
        onComplete: () => {
          this.cover.destroy();
          this.sticker.setVisible(true);
          this.displayText.setText(
            `SEC-PANEL OS  ${this.firmware}\nZONES TRIPPED: ${this.sensorsTripped}\nS/N: ${this.serial}`);
          this.setMessage(`Serial number: ${this.serial}. The manual suddenly makes sense. Almost.`);
        },
      });
    }
  }

  makeUiButton(x, y, label, cb) {
    const bg = this.add.rectangle(x, y, 150, 40, 0x24344d).setStrokeStyle(2, 0x9fd0ff)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontFamily: FONT_UI, fontSize: '12px', color: '#9fd0ff' }).setOrigin(0.5);
    bg.on('pointerdown', cb);
    return bg;
  }

  buildManual() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    this.manual = this.add.container(0, 0).setVisible(false).setDepth(10);
    this.manual.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setInteractive());
    this.manual.add(this.add.rectangle(W / 2, H / 2, W - 160, H - 140, 0xf1ead8).setStrokeStyle(4, 0x8a7f5c));
    this.manual.add(this.add.text(W / 2 - (W - 200) / 2, 100,
`MUSEUM SECURITY SYSTEMS — SERVICE MANUAL
(abridged edition, coffee-stained, 1987)

1. Find the serial number (service cover, two screws).
   - Serial ends in an ODD digit  -> begin with MEM.
   - Serial ends in an EVEN digit -> begin with TEST.

2. Check the firmware version on the display.
   - v3.x -> next, flip DIP 1 ON.
   - v2.x -> next, flip DIP 2 ON.

3. Count the tripped zones (red LEDs).
   - MORE than 3 -> press RESET right after step 1,
     BEFORE touching the DIP switches.
   - 3 or fewer  -> press RESET after the DIP switch.

4. Press whichever of TEST / MEM you did NOT use in step 1.

5. Press ENTER to dump the event log.

WARNING: Every wrong input shocks the operator (-50 pts).
Three mistakes wipe the buffer. And your dignity.
DIP 3-4: not connected. Do not write to us about them.`, {
      fontFamily: FONT_DOC, fontSize: '19px', color: '#2b2b2b',
      lineSpacing: 7, wordWrap: { width: W - 220 },
    }));
    this.manual.add(this.add.text(W / 2, H - 90, '[ click MANUAL to close ]', {
      fontFamily: FONT_UI, fontSize: '10px', color: '#6b6248',
    }).setOrigin(0.5));
  }

  toggleManual() {
    this.manual.setVisible(!this.manual.visible);
    this.playSfx('sfx_paper');
  }

  // ---------- HELPERS ----------

  printLogLine(line, i, color = '#7dff7a') {
    this.add.text(this.displayText.x, this.displayText.y + 70 + i * 26, line, {
      fontFamily: FONT_DOC, fontSize: '17px', color,
    });
    this.playSfx('sfx_print');
  }

  flashPanel() {
    this.tweens.add({ targets: this.spark, alpha: 0.5, duration: 60, yoyo: true, repeat: 2 });
  }

  setMessage(msg) {
    this.messageText.setText(msg);
  }

  refreshHud() {
    this.hudText.setText(`SCORE ${this.registry.get('score') ?? 0}   STRIKES ${this.strikes}`);
  }

  playSfx(key) {
    if (this.cache.audio.exists(key)) this.sound.play(key);
  }
}