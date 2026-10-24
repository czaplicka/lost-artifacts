import { COLORS, DESIGN_WIDTH, DESIGN_HEIGHT } from './ComputerTheme.js';

export class ComputerMonitor {
  constructor(ui) { this.ui = ui; }

  render() {
    const ui = this.ui;
    if (ui.destroyed || !ui.isOpen || ui.suspended) return;
    const d = ui.drawing;
    ui.content = null;
    ui.root.removeAll(true);
    const { width, height } = ui.scene.scale;
    ui.root.add(ui.scene.add.rectangle(0, 0, width, height, 0x090b10, 0.94)
      .setOrigin(0).setInteractive());
    const scale = Math.max(0.01, Math.min(
      Math.max(1, width - 16) / DESIGN_WIDTH,
      Math.max(1, height - 16) / DESIGN_HEIGHT
    ));
    ui.content = ui.scene.add.container(
      (width - DESIGN_WIDTH * scale) / 2,
      (height - DESIGN_HEIGHT * scale) / 2
    ).setScale(scale);
    ui.root.add(ui.content);
    d.rectangle(0, 735, 1120, 65, 0x382b28);
    d.rectangle(0, 735, 1120, 8, 0x765443);
    d.rectangle(95, 725, 930, 20, 0x17191b, 0.6);
    d.bevel(465, 704, 190, 39, 0x77766d);
    d.bevel(380, 741, 360, 27, 0xa8a697);
    d.bevel(35, 18, 1050, 694, 0xb3b09f);
    d.bevel(52, 35, 1016, 627, 0x77796f, true);
    d.bevel(67, 49, 986, 595, 0x151d24, true);
    ui.layout = { x: 78, y: 60, w: 964, h: 572 };
    this.drawWallpaper();
    this.drawTaskbar();
    if (ui.app === 'desktop') ui.desktop.render();
    else this.renderApplication();
    this.drawMonitorDetails();
  }

  drawMonitorDetails() {
    const ui = this.ui;
    const d = ui.drawing;
    d.text(76, 678, 'NIGHT OWL', 17, '#343c39');
    d.text(237, 680, 'PERSONAL COMPUTER', 11, '#575c50');
    for (let i = 0; i < 9; i++) d.rectangle(740 + i * 14, 675, 7, 17, 0x64665b);
    d.rectangle(934, 679, 8, 8, 0x85d87c);
    d.button(960, 670, 'OFF', () => ui.close());
  }

  drawWallpaper() {
    const ui = this.ui;
    const d = ui.drawing;
    const { x, y, w, h } = ui.layout;
    const desktopHeight = h - 36;
    const key = ui.options.wallpaperKey || 'pi_computer_wallpaper';
    if (ui.scene.textures.exists(key)) {
      ui.content.add(ui.scene.add.image(x, y, key).setOrigin(0).setDisplaySize(w, desktopHeight));
      return;
    }
    d.rectangle(x, y, w, desktopHeight, COLORS.desktop);
    d.rectangle(x, y + 135, w, 145, 0x92a5ad);
    const g = ui.scene.add.graphics();
    ui.content.add(g);
    g.fillStyle(0xdac9a0);
    g.fillCircle(x + w - 185, y + 100, 48);
    g.fillStyle(0x526875);
    g.fillTriangle(x, y + 340, x + 310, y + 160, x + 570, y + 340);
    g.fillTriangle(x + 310, y + 340, x + 660, y + 135, x + w, y + 340);
    g.fillStyle(0x354d50);
    g.fillTriangle(x, y + 415, x + 380, y + 245, x + 760, y + 415);
    g.fillTriangle(x + 430, y + 415, x + 830, y + 265, x + w, y + 415);
    g.fillStyle(0x263f3e);
    g.fillRect(x, y + 410, w, desktopHeight - 410);
    g.fillStyle(0x8da6ad);
    g.fillPoints([
      { x: x + 620, y: y + 340 }, { x: x + 660, y: y + 340 },
      { x: x + 540, y: y + desktopHeight }, { x: x + 310, y: y + desktopHeight }
    ], true);
    g.fillStyle(0xd0d5c9, 0.65);
    g.fillRect(x + 225, y + 70, 85, 8);
    g.fillRect(x + 245, y + 62, 45, 8);
    g.fillRect(x + 475, y + 105, 110, 7);
  }

  drawTaskbar() {
    const ui = this.ui;
    const d = ui.drawing;
    const { x, y, w, h } = ui.layout;
    const ty = y + h - 36;
    d.bevel(x, ty, w, 36, 0xc8c5b9);
    d.button(x + 5, ty + 2, 'DESKTOP', () => ui.openApp('desktop'));
    const names = { desktop: 'Night Owl OS', mail: 'Mail', ledger: 'Personal Ledger', classifieds: 'Classifieds' };
    d.bevel(x + 125, ty + 5, 230, 26, 0xb4b5ad, true);
    d.text(x + 135, ty + 10, names[ui.app] || 'Night Owl OS', 13, '#333c3c');
    d.bevel(x + w - 120, ty + 5, 110, 26, 0xb4b5ad, true);
    d.text(x + w - 109, ty + 10, 'PI TERMINAL', 12, '#333c3c');
  }

  renderApplication() {
    const ui = this.ui;
    const d = ui.drawing;
    const { x, y, w, h } = ui.layout;
    ui.window = { x: x + 24, y: y + 18, w: w - 48, h: h - 74 };
    const box = ui.window;
    d.rectangle(box.x + 7, box.y + 7, box.w, box.h, 0x101b24, 0.4);
    d.bevel(box.x, box.y, box.w, box.h, COLORS.window);
    d.rectangle(box.x + 4, box.y + 4, box.w - 8, 34, COLORS.titlebar);
    const titles = {
      mail: 'Mail — Private correspondence',
      ledger: 'Personal Ledger — Private funds',
      classifieds: 'Classifieds — City notices'
    };
    d.text(box.x + 13, box.y + 12, titles[ui.app] || 'Application', 16, COLORS.titleText);
    d.button(box.x + box.w - 43, box.y + 5, 'X', () => ui.openApp('desktop'));
    if (ui.app === 'ledger') ui.ledger.render();
    else ui.documents.render();
    d.bevel(box.x + 8, box.y + box.h - 35, box.w - 16, 26, 0xc3c2b7, true);
    const status = ui.notice || (ui.app === 'mail'
      ? 'Private correspondence'
      : ui.app === 'ledger'
        ? 'Personal funds — separate from agency finances'
        : 'Local notices and private enquiries');
    d.text(box.x + 16, box.y + box.h - 29, status, 12, '#3a3428', box.w - 32);
  }
}
