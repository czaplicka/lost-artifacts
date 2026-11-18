import { ChurchScene as ChurchNaveScene } from './ChurchNaveScene.js';
import { HomeTownDialogue } from '../ui/HomeTownDialogue.js';
import { TEXT } from './church/ChurchText.js';

const FILES = ['rug', 'glass', 'left-glass', 'right_glass', 'organs', 'pipes',
  'ambo', 'altar', 'hymn-board', 'lamps', 'pews', 'donation-box', 'candles',
  'peagon', 'priest', 'office', 'office-empty', 'auction', 'auction-people'];
const key = name => `church-image:${name}`;
const ABSENCE_MS = 60_000;
let awayUntil = 0;
let nextBreakAt = 0;
let hallVisits = 0;

export class ChurchScene extends ChurchNaveScene {
  preload() {
    // Preserve the original loader and suppress its obsolete church.webp request.
    if (!this.textures.exists(key('church'))) {
      const tex = this.textures.createCanvas(key('church'), 1, 1);
      if (tex) {
        tex.getContext().fillStyle = '#18141b';
        tex.getContext().fillRect(0, 0, 1, 1);
        tex.refresh();
      }
    }
    super.preload();
    for (const n of FILES.slice(-4)) {
      if (!this.textures.exists(key(n))) this.load.image(key(n), `assets/pi/church/${n}.webp`);
    }
  }

  init() {
    super.init();
    this.room = 'nave';
    this.roomLayer = null;
    this.officeAway = false;
  }

  create() {
    this.nav = null;
    this.roomButtons = null;
    super.create();
    this.roomLayer = this.add.container(0, 0).setDepth(19000).setVisible(false);
    this.nav = this.add.container(0, 0).setDepth(20001);
    this.roomButtons = [
      this.button(this.nav, 'Parish Office', () => this.openRoom('office')),
      this.button(this.nav, 'Auction Hall', () => this.openRoom('auction'))
    ];
    this.layout();
  }

  button(parent, label, action) {
    const text = this.add.text(0, 0, label, {
      fontFamily: 'SpecialElite, monospace', fontSize: '18px', color: '#ffe3a4',
      backgroundColor: '#262b26', padding: { x: 10, y: 7 }
    }).setInteractive({ useHandCursor: true });
    text.on('pointerover', () => text.setStyle({ backgroundColor: '#514530' }));
    text.on('pointerout', () => text.setStyle({ backgroundColor: '#262b26' }));
    text.on('pointerdown', () => { if (this.canAct()) action(); });
    parent.add(text);
    return text;
  }

  layout() {
    super.layout();
    if (!this.roomLayer?.active) return;
    this.roomLayer.setPosition(this.stage.x, this.stage.y).setScale(this.stage.scaleX);
    if (!this.nav?.active) return;
    this.nav.setPosition(12, Math.max(0, this.scale.height - 44));
    this.roomButtons[1].setX(this.roomButtons[0].width + 8);
  }

  openRoom(room) {
    if (!this.canAct()) return;
    const now = Date.now();
    let art;
    if (room === 'office') {
      // First visit always has Agnes. The first re-entry starts a short break.
      if (nextBreakAt === 0) nextBreakAt = Math.max(1, now);
      else if (now >= nextBreakAt && now >= awayUntil) {
        awayUntil = now + ABSENCE_MS;
        nextBreakAt = awayUntil + 180_000;
      }
      this.officeAway = now < awayUntil;
      art = this.officeAway ? 'office-empty' : 'office';
    } else {
      art = ++hallVisits % 2 ? 'auction-people' : 'auction';
    }
    if (!this.textures.exists(key(art))) {
      this.show('DOOR', `Missing image: ${art}.webp`);
      return;
    }
    this.statusTimer?.remove(false);
    this.statusTimer = null;
    this.room = room;
    this.stage.setVisible(false);
    for (const { zone, box, label } of this.hotspots) {
      zone.disableInteractive(); box.setVisible(false); label.setVisible(false);
    }
    this.nav.setVisible(false);
    this.roomLayer.removeAll(true);
    this.roomLayer.setVisible(true);
    this.roomLayer.add(this.add.image(0, 0, key(art)).setOrigin(0).setDisplaySize(1920, 1080));
    this.titleText.setText(room === 'office' ? 'PARISH OFFICE' : 'AUCTION HALL');
    this.backText.setText('BACK TO CHURCH');
    this.hintText.setText('Select an object to inspect it.');
    this.paintPanels();
    this.buildRoomHotspots(art);
  }

  buildRoomHotspots(art) {
    // Labeled inspection targets keep the screen usable without guessing image coordinates.
    const items = art.startsWith('office') ? [
      art === 'office' ? ['Agnes Ledger', () => this.talkAgnes()] :
        ['Desk note', 'Stepped out. Back shortly. If it’s a miracle, please take a number.'],
      ['Appointment book', 'Three wedding bookings. Somebody underlined the word separate. Twice.'],
      ['Wedding photographs', 'Same wedding photographer, same backdrop. Is that the same groom?'],
      ['Telephone', 'The speed dial has two entries: Father Crumb and Not Father Crumb.'],
      ['Parish records', 'The cabinet is locked. Agnes can tell me which records are public.']
    ] : [
      ['Catalog', 'Lot 7: film camera, unused. The word unused is doing a lot of work.'],
      ['Film camera', 'There’s still a roll inside. So much for unused.'],
      ['Postcards', 'Three postcards from people who describe their holidays exclusively in complaints.'],
      ['Framed portrait', 'His eyes follow you. Probably to make sure you don’t bid.'],
      ...(art === 'auction-people' ? [['Bidder', 'I’m only looking. If anybody asks, my hand went up on its own.']] : [])
    ];
    for (let row = 0; row < Math.ceil(items.length / 3); row++) {
      this.roomLayer.add(this.add.rectangle(960, 928 + 58 * row, 1420, 54, 0x171515, 0.82));
    }
    items.forEach(([label, action], i) => {
      const x = 285 + (i % 3) * 470;
      const y = 904 + 58 * Math.floor(i / 3);
      const button = this.button(this.roomLayer, label, typeof action === 'function'
        ? action : () => this.show(label.toUpperCase(), action));
      button.setFontSize('31px').setPosition(x, y);
    });
  }

  talkAgnes() {
    if (this.room !== 'office' || this.officeAway) return;
    const name = 'AGNES LEDGER';
    this.show(name, 'God knows everything. I handle the appointments.', [
      ['Ask about the records', () => this.show(name, 'I can show you old parish bulletins. Private files stay private, even if you look very detective about it.')],
      ['Ask about the auction', () => this.show(name, 'Someone donated that portrait again. Frankly, I’m starting to think it’s the one sending the postcards.')],
      ['Say goodbye', () => this.closePanel()]
    ]);
  }

  async leave() {
    if (this.room === 'nave') return super.leave();
    if (!this.canAct()) return;
    this.room = 'nave';
    this.roomLayer.removeAll(true);
    this.roomLayer.setVisible(false);
    this.stage.setVisible(true);
    for (const { zone } of this.hotspots) zone.setInteractive();
    this.nav.setVisible(true);
    this.titleText.setText(TEXT.title);
    this.backText.setText(TEXT.back);
    this.hintText.setText(TEXT.hint);
    this.paintPanels();
  }
}