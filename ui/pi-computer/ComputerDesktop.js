import { COLORS } from './ComputerTheme.js';

export class ComputerDesktop {
  constructor(ui) { this.ui = ui; }

  render() {
    const ui = this.ui;
    const d = ui.drawing;
    const { x, y, w, h } = ui.layout;
    const entries = [
      ['mail', 'Mail', 'envelope', 0xe6d9ab],
      ['ledger', 'Personal\nLedger', 'ledger', 0xa5c397],
      ['classifieds', 'Classifieds', 'paper', 0xd1d6d8],
      ['investigations', 'Investigations', 'board', 0xc69d7d],
      ['travel', 'World\nTravel', 'globe', 0x98b9ce]
    ];
    entries.forEach(([app, label, kind, color], i) => {
      this.createIcon(x + 12, y + 10 + i * 98, 128, label, kind, color, () => ui.openApp(app));
    });
    d.text(x + w - 22, y + 22, 'NIGHT OWL\nOPERATING SYSTEM', 17, '#dce3d6')
      .setOrigin(1, 0).setAlign('right').setShadow(2, 2, '#26373f', 0, true, true);
    if (ui.notice) {
      d.bevel(x + 180, y + h - 112, w - 210, 58, 0xd7d5ca);
      d.text(x + 194, y + h - 99, ui.notice, 14, COLORS.text, w - 240);
    }
  }

  createIcon(x, y, width, label, kind, color, callback) {
    const ui = this.ui;
    const d = ui.drawing;
    const hit = d.rectangle(x, y, width, 94, 0x153e75, 0).setInteractive({ useHandCursor: true });
    const g = ui.scene.add.graphics();
    ui.content.add(g);
    const cx = x + width / 2;
    const top = y + 5;
    g.lineStyle(2, 0x26333b);
    g.fillStyle(color);
    if (kind === 'envelope') {
      g.fillRect(cx - 24, top + 8, 48, 33);
      g.strokeRect(cx - 24, top + 8, 48, 33);
      g.beginPath();
      g.moveTo(cx - 23, top + 9);
      g.lineTo(cx, top + 27);
      g.lineTo(cx + 23, top + 9);
      g.strokePath();
    } else if (kind === 'ledger') {
      g.fillRect(cx - 20, top, 40, 47);
      g.strokeRect(cx - 20, top, 40, 47);
      g.lineBetween(cx - 11, top + 1, cx - 11, top + 46);
      for (let row = 0; row < 3; row++) g.lineBetween(cx - 4, top + 13 + row * 9, cx + 13, top + 13 + row * 9);
    } else if (kind === 'board') {
      g.fillRect(cx - 27, top + 2, 54, 42);
      g.strokeRect(cx - 27, top + 2, 54, 42);
      g.fillStyle(0xf0dfac);
      g.fillRect(cx - 21, top + 9, 16, 18);
      g.fillRect(cx + 7, top + 21, 15, 17);
      g.lineStyle(2, 0xa23232);
      g.lineBetween(cx - 13, top + 17, cx + 14, top + 29);
      g.fillStyle(0xa23232);
      g.fillCircle(cx - 13, top + 12, 2);
      g.fillCircle(cx + 14, top + 24, 2);
    } else if (kind === 'globe') {
      g.fillCircle(cx, top + 23, 23);
      g.strokeCircle(cx, top + 23, 23);
      g.strokeEllipse(cx, top + 23, 21, 46);
      g.strokeEllipse(cx, top + 23, 46, 18);
      g.lineBetween(cx - 23, top + 23, cx + 23, top + 23);
    } else {
      g.fillRect(cx - 22, top, 44, 47);
      g.strokeRect(cx - 22, top, 44, 47);
      g.fillStyle(0x647585);
      g.fillRect(cx - 15, top + 7, 15, 12);
      for (let row = 0; row < 3; row++) g.lineBetween(cx - 15, top + 26 + row * 6, cx + 15, top + 26 + row * 6);
    }
    d.text(cx, y + 55, label, 14, '#ffffff', width - 4)
      .setOrigin(0.5, 0).setAlign('center').setShadow(1, 1, '#17242f', 0, true, true);
    hit.on('pointerover', () => hit.setFillStyle(0x153e75, 0.7));
    hit.on('pointerout', () => hit.setFillStyle(0x153e75, 0));
    hit.on('pointerdown', callback);
  }
}
