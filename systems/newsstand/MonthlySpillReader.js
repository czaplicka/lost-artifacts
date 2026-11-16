import { MONTHLY_SPILL_ISSUE as ISSUE } from './MonthlySpillIssue.js';
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { isEditableTarget } from '../../config/newsstandConfig.js';

const W = 740;
const H = 1000;
const GAP = 12;
const INK = '#281d25';
const PINK = 0x942b57;
const PAPER = 0xf3e7cd;

export class MonthlySpillReader {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.busy = false;
    this.page = 0;
    this.targetPage = null;
    this.root = null;
    this.keyHandler = event => {
      if (!this.isOpen || this.busy || isEditableTarget(event) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        event.preventDefault();
        this.turn(event.code === 'ArrowRight' ? 1 : -1);
      }
    };
    scene.input.keyboard?.on('keydown', this.keyHandler);
  }

  open() {
    if (this.isOpen) return;
    const saved = Number(gameState.monthlyMagazineReader?.[ISSUE.id]);
    this.page = Number.isInteger(saved) ? Math.max(0, Math.min(ISSUE.pages.length - 1, saved)) : 0;
    this.isOpen = true;
    this.scene.hotspots?.setDebugMode(false);
    this.previousOpening = this.scene.isOpeningNewspaper;
    this.scene.isOpeningNewspaper = true;
    this.root = this.scene.add.container(0, 0).setDepth(2000).setScrollFactor(0);
    this.rustle();
    this.render();
  }

  rustle() {
    const s = this.scene;
    if (s.cache.audio?.exists('paper_rustle')) s.sound.play('paper_rustle', { volume: 0.2 });
  }

  save() {
    if (!gameState.monthlyMagazineReader || typeof gameState.monthlyMagazineReader !== 'object' || Array.isArray(gameState.monthlyMagazineReader)) {
      gameState.monthlyMagazineReader = {};
    }
    gameState.monthlyMagazineReader[ISSUE.id] = this.page;
    requestAutosave();
  }

  groups() {
    if (this.scene.scale.width < this.scene.scale.height * 1.15) {
      return ISSUE.pages.map((page, index) => [index]);
    }
    const groups = [[0]];
    for (let index = 1; index < ISSUE.pages.length - 1; index += 2) {
      const spread = [index];
      if (index + 1 < ISSUE.pages.length - 1) spread.push(index + 1);
      groups.push(spread);
    }
    if (ISSUE.pages.length > 1) groups.push([ISSUE.pages.length - 1]);
    return groups;
  }

  currentGroup(groups = this.groups()) {
    return Math.max(0, groups.findIndex(group => group.includes(this.page)));
  }

  turn(direction) {
    if (!this.isOpen || this.busy) return;
    const groups = this.groups();
    const next = this.currentGroup(groups) + direction;
    if (next < 0 || next >= groups.length) return;
    this.busy = true;
    this.targetPage = groups[next][0];
    this.rustle();
    const book = this.book;
    this.scene.tweens.add({
      targets: book, scaleX: 0.035, alpha: 0.55, duration: 135, ease: 'Quad.In',
      onComplete: () => {
        if (!this.isOpen) return;
        this.page = this.targetPage;
        this.targetPage = null;
        this.render();
        const newBook = this.book;
        newBook.setScale(0.035, 1).setAlpha(0.55);
        this.scene.tweens.add({
          targets: newBook, scaleX: 1, alpha: 1, duration: 175, ease: 'Quad.Out',
          onComplete: () => { this.busy = false; this.save(); }
        });
      }
    });
  }

  resize() {
    if (!this.isOpen) return;
    this.scene.tweens.killTweensOf(this.book);
    if (this.targetPage !== null) this.page = this.targetPage;
    this.targetPage = null;
    this.busy = false;
    this.render();
  }

  close() {
    if (!this.isOpen || this.busy) return;
    this.save();
    this.rustle();
    this.dispose();
  }

  dispose() {
    this.scene.tweens.killTweensOf(this.book);
    this.root?.destroy(true);
    this.root = null;
    this.book = null;
    this.isOpen = false;
    this.busy = false;
    this.targetPage = null;
    this.scene.isOpeningNewspaper = Boolean(this.previousOpening);
  }

  destroy() {
    this.scene.input.keyboard?.off('keydown', this.keyHandler);
    if (this.isOpen) this.dispose();
  }

  rect(parent, x, y, width, height, color, alpha = 1) {
    const shape = this.scene.add.rectangle(x, y, width, height, color, alpha).setOrigin(0);
    parent.add(shape);
    return shape;
  }

  text(parent, x, y, value, width, size = 25, color = INK, pixel = false) {
    const text = this.scene.add.text(x, y, String(value ?? ''), {
      fontFamily: pixel ? 'PressStart2P' : 'SpecialElite',
      fontSize: `${size}px`, color, lineSpacing: 7,
      wordWrap: { width, useAdvancedWrap: true }
    });
    parent.add(text);
    return text;
  }

  fit(parent, x, y, value, width, height, size = 40, color = INK, pixel = false) {
    const text = this.text(parent, x, y, value, width, size, color, pixel);
    while ((text.height > height || text.width > width) && size > 12) text.setFontSize(--size);
    if (text.height > height || text.width > width) {
      text.setScale(Math.min(width / text.width, height / text.height));
    }
    return text;
  }

  button(parent, x, y, width, height, label, action, enabled = true) {
    const box = this.rect(parent, x, y, width, height, enabled ? PINK : 0x463637);
    const text = this.fit(parent, x + 10, y + 8, label, width - 20, height - 16, 12, '#ffe7a1', true);
    text.setY(y + (height - text.displayHeight) / 2);
    if (enabled) {
      box.setInteractive({ useHandCursor: true });
      box.on('pointerover', () => box.setFillStyle(0xb23f70));
      box.on('pointerout', () => box.setFillStyle(PINK));
      box.on('pointerup', (pointer, lx, ly, event) => {
        event?.stopPropagation();
        if (this.isOpen && !this.busy) action();
      });
    }
  }

  render() {
    if (!this.root) return;
    this.root.removeAll(true);
    const { width, height } = this.scene.scale;
    const dim = this.rect(this.root, 0, 0, width, height, 0x100d0c, 0.97).setInteractive();
    for (const eventName of ['pointerdown', 'pointerup', 'pointermove', 'wheel']) {
      dim.on(eventName, (...args) => args[args.length - 1]?.stopPropagation?.());
    }
    const grain = this.scene.add.graphics();
    grain.lineStyle(1, 0x936047, 0.12);
    for (let y = 0; y < height; y += 13) grain.lineBetween(0, y, width, y + 4);
    this.root.add(grain);

    const titleWidth = Math.max(40, width - 135);
    this.fit(this.root, 20, 18, `${ISSUE.title} / ${ISSUE.edition}`, titleWidth, 28, 12, '#ddc99f', true);
    this.button(this.root, width - 92, 12, 76, 36, 'CLOSE', () => this.close());

    const groups = this.groups();
    const groupIndex = this.currentGroup(groups);
    const group = groups[groupIndex];
    const bookWidth = group.length * W + (group.length - 1) * GAP;
    const scale = Math.max(0.01, Math.min((width - 28) / bookWidth, (height - 130) / H));
    const stage = this.scene.add.container(width / 2, 59 + Math.max(0, height - 130) / 2).setScale(scale);
    this.root.add(stage);
    this.book = this.scene.add.container(0, 0);
    stage.add(this.book);
    group.forEach((index, position) => this.drawPage(this.book, -bookWidth / 2 + position * (W + GAP), -H / 2, index));

    if (group.length === 2) {
      for (let i = 0; i < 18; i++) {
        this.rect(this.book, -18 + i * 2, -H / 2, 2, H, 0x281a14, 0.16 * (1 - Math.abs(i - 9) / 10));
      }
    }
    const controlY = Math.max(58, height - 56);
    const buttonW = Math.min(180, Math.max(65, (width - 130) / 2));
    this.button(this.root, 16, controlY, buttonW, 40, '< PREV', () => this.turn(-1), groupIndex > 0);
    this.button(this.root, width - 16 - buttonW, controlY, buttonW, 40, 'NEXT >', () => this.turn(1), groupIndex < groups.length - 1);
    const pageLabel = group.map(index => index + 1).join('–') + ` / ${ISSUE.pages.length}`;
    const count = this.fit(this.root, buttonW + 28, controlY + 12, pageLabel, Math.max(35, width - buttonW * 2 - 56), 25, 13, '#f1dfb7');
    count.setX(width / 2 - count.displayWidth / 2);
  }

  drawPage(parent, x, y, index) {
    const page = this.scene.add.container(x, y);
    parent.add(page);
    this.rect(page, 10, 12, W, H, 0x000000, 0.4);
    this.rect(page, 0, 0, W, H, PAPER);
    for (let i = 0; i < 180; i++) {
      this.rect(page, 8 + (i * 97 + 31) % (W - 16), 8 + (i * 163 + 17) % (H - 16), 1 + i % 3, 2, 0x9c7652, 0.1);
    }
    this.rect(page, 0, 0, 6, H, 0xc8ae82, 0.45);
    this.rect(page, W - 6, 0, 6, H, 0xc8ae82, 0.45);
    const data = ISSUE.pages[index];
    if (data.type === 'cover') this.cover(page, data);
    else if (data.type === 'contents') this.contents(page, data);
    else if (data.type === 'horoscope') this.horoscope(page, data);
    else this.feature(page, data);
    this.rect(page, 36, 950, W - 72, 2, PINK);
    this.text(page, 36, 963, 'THE MONTHLY SPILL / ISSUE 001', 580, 12, '#6d564a', true);
    this.text(page, W - 62, 960, index + 1, 34, 20, '#6d564a');
  }

  header(page, data) {
    this.rect(page, 36, 28, W - 72, 35, PINK);
    this.fit(page, 48, 38, data.section, W - 96, 20, 12, '#fff0d3', true);
  }

  cover(page, data) {
    this.rect(page, 18, 18, W - 36, H - 68, PINK);
    this.rect(page, 30, 30, W - 60, H - 92, PAPER);
    this.fit(page, 52, 52, 'THE MONTHLY', W - 104, 54, 32, '#942b57', true);
    this.fit(page, 52, 111, 'SPILL', W - 104, 128, 112, '#942b57', true);
    this.fit(page, 54, 244, ISSUE.tagline, W - 108, 40, 24);
    this.art(page, data.art, 54, 302, W - 108, 270);
    this.rect(page, 40, 552, W - 80, 49, 0xd4a641);
    this.fit(page, 56, 566, 'EXCLUSIVE! SOURCES SAY THINGS!', W - 112, 24, 15, INK, true);
    this.fit(page, 54, 620, data.headline, W - 108, 145, 51, '#942b57');
    this.fit(page, 54, 775, data.deck, W - 108, 55, 27);
    data.teasers.forEach((line, index) => this.fit(page, 54, 850 + index * 26, line, W - 108, 25, 19));
  }

  contents(page, data) {
    this.header(page, data);
    this.fit(page, 44, 92, data.headline, W - 88, 100, 44, '#942b57');
    this.fit(page, 44, 206, data.body.join('\n\n'), W - 88, 310, 28);
    this.quote(page, data.quote, 540, 110);
    this.text(page, 44, 678, 'IN THIS ISSUE', W - 88, 17, '#942b57', true);
    data.contents.forEach(([number, label], index) => {
      const rowY = 726 + index * 39;
      const row = this.rect(page, 40, rowY - 3, W - 80, 35, index % 2 ? 0xe7d5b5 : 0xecddc2);
      this.fit(page, 52, rowY + 3, label, W - 160, 26, 23);
      this.text(page, W - 90, rowY, number, 45, 24, '#942b57');
      row.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        if (this.busy || !this.isOpen) return;
        this.page = Number(number) - 1;
        this.rustle(); this.render(); this.save();
      });
    });
  }

  feature(page, data) {
    this.header(page, data);
    this.fit(page, 44, 85, data.headline, W - 88, 112, 47, '#942b57');
    this.fit(page, 44, 213, data.deck, W - 88, 82, 27);
    this.art(page, data.art, 44, 312, W - 88, 220);
    this.fit(page, 44, 555, data.body.join('\n\n'), W - 88, 267, 26);
    this.quote(page, data.quote, 838, data.fine ? 57 : 92);
    if (data.fine) this.fit(page, 44, 902, data.fine, W - 88, 38, 16, '#6d564a');
  }

  quote(page, value, y, height) {
    this.rect(page, 40, y, W - 80, height, PINK);
    const quote = this.fit(page, 58, y + 12, `“${value}”`, W - 116, height - 24, 28, '#fff0cf');
    quote.setY(y + (height - quote.displayHeight) / 2);
  }

  horoscope(page, data) {
    this.header(page, data);
    this.fit(page, 44, 90, data.headline, W - 88, 115, 44, '#942b57');
    this.fit(page, 44, 215, data.deck, W - 88, 70, 25);
    data.entries.forEach(([sign, text], index) => {
      const y = 306 + index * 52;
      this.rect(page, 40, y, W - 80, 49, index % 2 ? 0xe7d5b5 : 0xecddc2);
      this.fit(page, 49, y + 9, sign, 162, 27, 12, '#942b57', true);
      this.fit(page, 220, y + 5, text, W - 270, 43, 21);
    });
  }

  art(parent, kind, x, y, width, height) {
    const group = this.scene.add.container(x, y);
    parent.add(group);
    this.rect(group, 0, 0, width, height, kind === 'gala' ? 0x345448 : 0xd9bb8d);
    const g = this.scene.add.graphics();
    group.add(g);
    const sx = width / 640, sy = height / 240;
    g.setScale(sx, sy);
    const ink = 0x302331;
    const circle = (cx, cy, r, color) => { g.fillStyle(color); g.fillCircle(cx, cy, r); };
    const rect = (rx, ry, rw, rh, color) => { g.fillStyle(color); g.fillRect(rx, ry, rw, rh); };
    for (let i = 0; i < 16; i++) rect(i * 48, 0, 20, 240, i % 2 ? 0xdbba89 : 0xd3ae7c);
    if (kind === 'pigeon') {
      rect(0, 172, 640, 68, 0x73675a);
      rect(60, 60, 90, 112, 0x9b8870); rect(480, 30, 100, 142, 0x9b8870);
      for (let i = 0; i < 7; i++) rect(30 + i * 92, 190, 8, 50, ink);
      rect(0, 182, 640, 10, ink);
      g.fillStyle(0x687379); g.fillEllipse(320, 148, 160, 90);
      circle(386, 107, 36, 0x687379); circle(397, 100, 5, 0xffeac2);
      g.fillStyle(0xd5a441); g.fillTriangle(417, 103, 448, 116, 415, 126);
      rect(293, 180, 6, 27, ink); rect(333, 180, 6, 27, ink);
      g.lineStyle(6, 0x942b57); g.lineBetween(362, 127, 399, 133);
    } else if (kind === 'sofa') {
      rect(118, 73, 404, 119, 0xc5816b); rect(100, 132, 440, 70, 0xc5816b);
      rect(124, 201, 14, 25, ink); rect(501, 201, 14, 25, ink);
      rect(155, 91, 125, 85, 0xead1a5); rect(351, 91, 125, 85, 0xd5a15f);
      rect(310, 78, 6, 113, 0x9a5a51);
      rect(559, 92, 7, 126, ink); circle(561, 54, 37, 0xe3c66f);
    } else {
      const person = (cx, dress) => {
        circle(cx, 72, 32, 0xd8b18a);
        rect(cx - 34, 35, 68, 22, ink);
        g.fillStyle(dress); g.fillTriangle(cx, 96, cx - 75, 225, cx + 75, 225);
        rect(cx - 28, 70, 23, 9, ink); rect(cx + 5, 70, 23, 9, ink);
      };
      if (kind === 'gala') {
        rect(0, 0, 640, 240, 0x283f3c);
        for (let i = 0; i < 8; i++) circle(35 + i * 83, 25, 5, 0xeacb80);
        person(190, 0x40836a); person(450, 0x40836a);
      } else {
        person(190, 0x493951); person(450, 0x942b57);
        g.fillStyle(0xe4c58c); g.fillEllipse(320, 213, 300, 50);
        rect(284, 172, 76, 45, 0xb54144);
        for (let i = 0; i < 7; i++) rect(287 + i * 10, 145 + i % 3 * 6, 7, 49, 0xe9bf58);
      }
    }
    for (let row = 6; row < height; row += 9) {
      for (let col = 6; col < width; col += 9) this.rect(group, col, row, 1.5, 1.5, 0x2b1d22, 0.13);
    }
    const frame = this.scene.add.graphics();
    frame.lineStyle(3, 0x302331); frame.strokeRect(0, 0, width, height); group.add(frame);
  }
}
