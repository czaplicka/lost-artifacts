import { COLORS } from './ComputerTheme.js';

export class ComputerDrawing {
  constructor(ui) { this.ui = ui; }

  add(object) {
    (this.ui.content || this.ui.root).add(object);
    return object;
  }

  text(x, y, value, size = 17, color = COLORS.text, wrap = 0) {
    return this.add(this.ui.scene.add.text(x, y, value == null ? '' : String(value), {
      fontFamily: 'monospace', fontSize: `${size}px`, color,
      wordWrap: wrap > 0 ? { width: wrap } : undefined
    }));
  }

  rectangle(x, y, width, height, color, alpha = 1) {
    return this.add(this.ui.scene.add.rectangle(x, y, width, height, color, alpha).setOrigin(0));
  }

  bevel(x, y, width, height, fill = 0xc8c5b9, inset = false) {
    const g = this.add(this.ui.scene.add.graphics());
    g.fillStyle(fill, 1);
    g.fillRect(x, y, width, height);
    g.lineStyle(3, inset ? 0x55584f : 0xf1eee1, 1);
    g.beginPath();
    g.moveTo(x, y + height);
    g.lineTo(x, y);
    g.lineTo(x + width, y);
    g.strokePath();
    g.lineStyle(3, inset ? 0xf1eee1 : 0x55584f, 1);
    g.beginPath();
    g.moveTo(x + width, y);
    g.lineTo(x + width, y + height);
    g.lineTo(x, y + height);
    g.strokePath();
    return g;
  }

  button(x, y, label, callback, enabled = true) {
    const object = this.text(x, y, label, 15, enabled ? COLORS.text : '#818181');
    object.setPadding(10, 7, 10, 7).setBackgroundColor('#d0cec6');
    if (enabled) {
      object.setInteractive({ useHandCursor: true })
        .on('pointerover', () => object.setBackgroundColor('#e3e1d8'))
        .on('pointerout', () => object.setBackgroundColor('#d0cec6'))
        .on('pointerdown', callback);
    }
    return object;
  }
}
