import { COLORS, FONTS } from './ComputerTheme.js';

const INK = 0x1b2530;

const TRASH_JOKES = [
  'The Recycle Bin contains: 1 case file, 3 regrets and an unpaid parking ticket.',
  'You try to empty the Recycle Bin. It politely declines. It has seen things.',
  'The Recycle Bin is full of paper planes. Someone in this office is very bored.'
];
const CAT_JOKES = [
  'Cat_Pics.zip is password protected. The cat refuses to share the password.',
  'Cat_Pics.zip: 4,096 photos, 4,095 of them out of focus. The cat will not comment.',
  'Cat_Pics.zip is currently asleep. Please try again in 16 hours.'
];

export class ComputerDesktop {
  constructor(ui) { this.ui = ui; }

  render() {
    const ui = this.ui;
    const d = ui.drawing;
    const { x, y, w, h } = ui.layout;
    const dh = h - 36;
    const entries = [
      ['mail', 'Mail', 'envelope', 0xe6d9ab],
      ['ledger', 'Personal\nLedger', 'ledger', 0xa5c397],
      ['classifieds', 'Classifieds', 'paper', 0xd1d6d8],
      ['investigations', 'Investigations', 'board', 0xc69d7d],
      ['travel', 'World\nTravel', 'globe', 0x98b9ce]
    ];
    entries.forEach(([app, label, kind, color], i) => {
      this.createIcon(x + 12, y + 10 + i * 100, 128, label, kind, color, () => ui.openApp(app));
    });

    // Decorative icons (pure humour)
    this.createIcon(x + w - 290, y + dh - 108, 128, 'Cat_Pics\n.zip', 'cat', 0xe0a458, () => this.joke(CAT_JOKES));
    this.createIcon(x + w - 150, y + dh - 108, 128, 'Recycle\nBin', 'trash', 0x8b99a3, () => this.joke(TRASH_JOKES));

    this.renderStickyNote(x + 252, y + 130);

    d.pixel(x + w - 22, y + 22, 'NIGHT OWL\nOPERATING SYSTEM', 12, '#e6edf5')
      .setOrigin(1, 0).setAlign('right').setLineSpacing(6)
      .setShadow(2, 2, '#0a1226', 0, true, true);
    d.text(x + w - 22, y + 74, 'v1.0 (it mostly works)', 14, '#9db3d6')
      .setOrigin(1, 0).setShadow(1, 1, '#0a1226', 0, true, true);

    if (ui.notice) this.renderNotice();
  }

  joke(list) {
    const ui = this.ui;
    ui.notice = list[ui.jokeIndex % list.length];
    ui.jokeIndex += 1;
    ui.render();
  }

  renderStickyNote(cx, cy) {
    const ui = this.ui;
    const scene = ui.scene;
    const note = scene.add.container(cx, cy);
    note.add(scene.add.rectangle(5, 6, 150, 150, 0x000000, 0.28));
    note.add(scene.add.rectangle(0, 0, 150, 150, 0xf4e27a));
    note.add(scene.add.rectangle(0, -72, 62, 16, 0xe8e2c8, 0.7).setAngle(2));
    note.add(scene.add.text(-64, -58,
      'TO DO:\n[x] get hired\n[ ] solve case\n[ ] eat something\n[ ] call mom\n     (she knows)', {
        fontFamily: FONTS.body, fontSize: '13px', color: '#4a3d12', lineSpacing: 3
      }));
    note.setAngle(-3);
    ui.drawing.add(note);
  }

  renderNotice() {
    const ui = this.ui;
    const d = ui.drawing;
    const scene = ui.scene;
    const { x, y, w, h } = ui.layout;
    const dw = 480;
    const probe = scene.add.text(0, 0, ui.notice, {
      fontFamily: FONTS.body, fontSize: '16px', wordWrap: { width: dw - 110 }
    });
    const th = probe.height;
    probe.destroy();
    const dh = Math.max(150, th + 118);
    const dx = x + Math.round((w - dw) / 2);
    const dy = y + Math.round((h - 36 - dh) / 2);

    d.rectangle(dx + 8, dy + 8, dw, dh, 0x050a10, 0.5);
    d.bevel(dx, dy, dw, dh, COLORS.window);
    d.rectangle(dx + 4, dy + 4, dw - 8, 28, COLORS.titlebar);
    d.pixel(dx + 14, dy + 12, 'Night Owl OS', 10, COLORS.titleText);

    const g = scene.add.graphics();
    ui.content.add(g);
    g.fillStyle(0x294b70, 1);
    g.fillCircle(dx + 40, dy + 70, 20);
    g.lineStyle(2, INK, 1);
    g.strokeCircle(dx + 40, dy + 70, 20);
    d.pixel(dx + 33, dy + 63, 'i', 14, '#ffffff');

    d.text(dx + 76, dy + 48, ui.notice, 16, COLORS.text, dw - 110);
    d.button(dx + dw - 76, dy + dh - 50, 'OK', () => {
      ui.notice = '';
      ui.render();
    });
  }

  createIcon(x, y, width, label, kind, color, callback) {
    const ui = this.ui;
    const d = ui.drawing;
    const scene = ui.scene;
    const cx = x + width / 2;
    const top = y + 5;

    const highlight = d.rectangle(x + 4, y, width - 8, 94, 0x2b5a9a, 0);
    const g = scene.add.graphics();
    ui.content.add(g);
    this.drawGlyph(g, kind, cx, top, color);
    d.text(cx, y + 58, label, 15, '#ffffff', width - 4)
      .setOrigin(0.5, 0).setAlign('center').setShadow(1, 1, '#0a1226', 0, true, true);

    const hit = d.rectangle(x, y, width, 94, 0x000000, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => {
      highlight.setFillStyle(0x2b5a9a, 0.45);
      highlight.setStrokeStyle(2, 0xd4af37, 0.9);
    });
    hit.on('pointerout', () => {
      highlight.setFillStyle(0x2b5a9a, 0);
      highlight.setStrokeStyle();
    });
    hit.on('pointerdown', () => {
      ui.options.onSfx?.('click');
      callback();
    });
  }

  drawGlyph(g, kind, cx, top, color) {
    g.lineStyle(2, INK, 1);
    switch (kind) {
      case 'envelope':
        g.fillStyle(0x000000, 0.3);
        g.fillRect(cx - 22, top + 16, 52, 34);
        g.fillStyle(color, 1);
        g.fillRect(cx - 26, top + 10, 52, 34);
        g.strokeRect(cx - 26, top + 10, 52, 34);
        g.lineBetween(cx - 26, top + 10, cx, top + 30);
        g.lineBetween(cx + 26, top + 10, cx, top + 30);
        g.lineBetween(cx - 26, top + 44, cx - 8, top + 28);
        g.lineBetween(cx + 26, top + 44, cx + 8, top + 28);
        g.fillStyle(0xc0504a, 1);
        g.fillRect(cx + 13, top + 14, 9, 11);
        break;
      case 'ledger':
        g.fillStyle(0x000000, 0.3);
        g.fillRect(cx - 17, top + 7, 44, 48);
        g.fillStyle(color, 1);
        g.fillRect(cx - 22, top + 2, 44, 48);
        g.strokeRect(cx - 22, top + 2, 44, 48);
        g.fillStyle(0x2d5a3d, 1);
        g.fillRect(cx - 22, top + 2, 8, 48);
        g.fillStyle(0xf1ecd6, 1);
        g.fillRect(cx - 8, top + 8, 24, 18);
        g.strokeRect(cx - 8, top + 8, 24, 18);
        g.fillStyle(0x2d5a3d, 1);
        g.fillRect(cx + 2, top + 10, 3, 14);
        g.fillRect(cx - 2, top + 13, 11, 2);
        g.fillRect(cx - 2, top + 19, 11, 2);
        for (let r = 0; r < 3; r++) g.lineBetween(cx - 8, top + 33 + r * 5, cx + 16, top + 33 + r * 5);
        break;
      case 'paper':
        g.fillStyle(0x000000, 0.3);
        g.fillRect(cx - 19, top + 9, 44, 46);
        g.fillStyle(0xbfc3c4, 1);
        g.fillRect(cx - 20, top + 2, 44, 46);
        g.strokeRect(cx - 20, top + 2, 44, 46);
        g.fillStyle(0xe9e6da, 1);
        g.fillRect(cx - 24, top + 6, 44, 46);
        g.strokeRect(cx - 24, top + 6, 44, 46);
        g.fillStyle(0x2b3340, 1);
        g.fillRect(cx - 21, top + 9, 38, 8);
        g.fillStyle(0x647585, 1);
        g.fillRect(cx - 21, top + 20, 16, 12);
        for (let r = 0; r < 3; r++) g.lineBetween(cx - 2, top + 22 + r * 4, cx + 16, top + 22 + r * 4);
        for (let r = 0; r < 3; r++) g.lineBetween(cx - 21, top + 36 + r * 4, cx + 16, top + 36 + r * 4);
        break;
      case 'board':
        g.fillStyle(0x000000, 0.3);
        g.fillRect(cx - 24, top + 9, 56, 44);
        g.fillStyle(0x6b4529, 1);
        g.fillRect(cx - 28, top + 3, 56, 44);
        g.strokeRect(cx - 28, top + 3, 56, 44);
        g.fillStyle(color, 1);
        g.fillRect(cx - 24, top + 7, 48, 36);
        g.fillStyle(0xf0dfac, 1);
        g.fillRect(cx - 20, top + 11, 15, 16);
        g.fillRect(cx + 5, top + 22, 15, 15);
        g.lineStyle(2, 0xa23232, 1);
        g.lineBetween(cx - 12, top + 15, cx + 12, top + 26);
        g.fillStyle(0xa23232, 1);
        g.fillCircle(cx - 12, top + 15, 2.5);
        g.fillCircle(cx + 12, top + 26, 2.5);
        break;
      case 'globe':
        g.fillStyle(0x000000, 0.3);
        g.fillEllipse(cx + 3, top + 52, 38, 8);
        g.fillStyle(color, 1);
        g.fillCircle(cx, top + 24, 23);
        g.fillStyle(0x5c9a63, 1);
        g.fillPoints([
          { x: cx - 14, y: top + 12 }, { x: cx - 4, y: top + 8 }, { x: cx - 2, y: top + 18 },
          { x: cx - 9, y: top + 26 }, { x: cx - 16, y: top + 22 }
        ], true);
        g.fillPoints([
          { x: cx + 4, y: top + 22 }, { x: cx + 16, y: top + 18 },
          { x: cx + 14, y: top + 32 }, { x: cx + 6, y: top + 36 }
        ], true);
        g.strokeCircle(cx, top + 24, 23);
        g.strokeEllipse(cx, top + 24, 22, 46);
        g.lineBetween(cx - 23, top + 24, cx + 23, top + 24);
        g.lineBetween(cx - 14, top + 50, cx + 14, top + 50);
        break;
      case 'trash':
        g.fillStyle(0x000000, 0.3);
        g.fillEllipse(cx + 3, top + 52, 38, 8);
        g.fillStyle(0xf1ecd6, 1);
        g.fillCircle(cx - 8, top + 9, 6);
        g.fillCircle(cx + 6, top + 7, 5);
        g.strokeCircle(cx - 8, top + 9, 6);
        g.strokeCircle(cx + 6, top + 7, 5);
        g.fillStyle(color, 1);
        g.fillPoints([
          { x: cx - 18, y: top + 14 }, { x: cx + 18, y: top + 14 },
          { x: cx + 14, y: top + 50 }, { x: cx - 14, y: top + 50 }
        ], true);
        g.strokePoints([
          { x: cx - 18, y: top + 14 }, { x: cx + 18, y: top + 14 },
          { x: cx + 14, y: top + 50 }, { x: cx - 14, y: top + 50 }
        ], true);
        g.fillStyle(0xa9b4bb, 1);
        g.fillRect(cx - 22, top + 10, 44, 6);
        g.strokeRect(cx - 22, top + 10, 44, 6);
        for (let r = -1; r <= 1; r++) g.lineBetween(cx + r * 8, top + 20, cx + r * 7, top + 46);
        break;
      case 'cat':
      default:
        g.fillStyle(0x000000, 0.3);
        g.fillRect(cx - 21, top + 10, 52, 44);
        g.fillStyle(0x5a3f2a, 1);
        g.fillRect(cx - 26, top + 4, 52, 44);
        g.strokeRect(cx - 26, top + 4, 52, 44);
        g.fillStyle(0x9ec1d9, 1);
        g.fillRect(cx - 21, top + 9, 42, 34);
        g.fillStyle(color, 1);
        g.fillTriangle(cx - 14, top + 22, cx - 8, top + 11, cx - 3, top + 21);
        g.fillTriangle(cx + 14, top + 22, cx + 8, top + 11, cx + 3, top + 21);
        g.fillCircle(cx, top + 30, 13);
        g.fillStyle(INK, 1);
        g.fillRect(cx - 7, top + 27, 3, 5);
        g.fillRect(cx + 4, top + 27, 3, 5);
        g.fillStyle(0xd96c7a, 1);
        g.fillTriangle(cx - 2, top + 33, cx + 2, top + 33, cx, top + 36);
        g.lineStyle(1, INK, 1);
        g.lineBetween(cx - 18, top + 33, cx - 8, top + 34);
        g.lineBetween(cx + 18, top + 33, cx + 8, top + 34);
        break;
    }
  }
}