import { COLORS, FONTS } from './ComputerTheme.js';
import {
  installComputerKeywordStyle, styleComputerText,
  recordKeywordSurface, suppressLegacyKeywordDecoration
} from './KeywordStyle.js';

export class ComputerDrawing {
  constructor(ui) {
    this.ui = ui;
    queueMicrotask(() => { if (!ui.destroyed) installComputerKeywordStyle(ui); });
  }
  add(object) {
    (this.ui.content || this.ui.root).add(object);
    return object;
  }
  text(x, y, value, size = 17, color = COLORS.text, wrap = 0, font = 'body') {
    const label = this.add(this.ui.scene.add.text(x, y, value == null ? '' : String(value), {
      fontFamily: FONTS[font] || FONTS.body,
      fontSize: `${size}px`, color,
      wordWrap: wrap > 0 ? { width: wrap } : undefined
    }));
    return styleComputerText(this.ui, label, value);
  }
  pixel(x, y, value, size = 10, color = COLORS.text, wrap = 0) {
    return this.text(x, y, value, size, color, wrap, 'pixel');
  }
  rectangle(x, y, width, height, color, alpha = 1) {
    const object = this.add(this.ui.scene.add.rectangle(x, y, width, height, color, alpha).setOrigin(0));
    if (!suppressLegacyKeywordDecoration(this.ui, object, x, y, width, height)) {
      recordKeywordSurface(this.ui, x, y, width, height, color, alpha);
    }
    return object;
  }
  frame(x, y, width, height, color = COLORS.ink, alpha = 1, thickness = 2) {
    const g = this.add(this.ui.scene.add.graphics());
    g.lineStyle(thickness, color, alpha);
    g.strokeRect(x + thickness / 2, y + thickness / 2, width - thickness, height - thickness);
    return g;
  }
  paintBevel(g, x, y, width, height, fill = 0xc8c5b9, inset = false) {
    recordKeywordSurface(this.ui, x, y, width, height, fill);
    const hi = inset ? 0x4f5148 : 0xfbf8ec;
    const lo = inset ? 0xfbf8ec : 0x4f5148;
    g.fillStyle(fill, 1); g.fillRect(x, y, width, height);
    g.fillStyle(hi, 1); g.fillRect(x, y, width, 3); g.fillRect(x, y, 3, height);
    g.fillStyle(lo, 1); g.fillRect(x, y + height - 3, width, 3); g.fillRect(x + width - 3, y, 3, height);
    g.lineStyle(1, 0x1c1e1a, 0.7); g.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    return g;
  }
  bevel(x, y, width, height, fill = 0xc8c5b9, inset = false) {
    const g = this.add(this.ui.scene.add.graphics());
    return this.paintBevel(g, x, y, width, height, fill, inset);
  }
  button(x, y, label, callback, enabled = true) {
    const ui = this.ui, parent = ui.content || ui.root;
    const text = this.text(x, y, label, 11, enabled ? COLORS.text : '#8a8878', 0, 'pixel');
    text.setPadding(12, 9, 12, 7);
    const w = text.width, h = text.height;
    const g = ui.scene.make.graphics({ x: 0, y: 0, add: false });
    parent.addAt(g, Math.max(0, parent.getIndex(text)));
    const paint = (fill, inset = false) => { g.clear(); this.paintBevel(g, x, y, w, h, fill, inset); };
    paint(enabled ? 0xd0cec6 : 0xbab8ad);
    if (enabled) {
      text.setInteractive({ useHandCursor: true })
        .on('pointerover', () => paint(0xe6e3d3))
        .on('pointerout', () => { paint(0xd0cec6); text.setY(y); })
        .on('pointerdown', () => {
          ui.options.onSfx?.('click'); paint(0xc2c0b6, true); text.setY(y + 1); callback();
        });
    }
    return text;
  }
  stamp(xRight, y, label, color = 0xa23232, angle = -6, size = 11) {
    const ui = this.ui, css = `#${color.toString(16).padStart(6, '0')}`;
    const text = ui.scene.add.text(0, 0, label, {
      fontFamily: FONTS.pixel, fontSize: `${size}px`, color: css
    }).setPadding(9, 8, 9, 6).setOrigin(0.5);
    const w = text.width, h = text.height;
    const border = ui.scene.add.graphics();
    border.lineStyle(3, color, 0.9); border.strokeRect(-w / 2, -h / 2, w, h);
    border.lineStyle(1, color, 0.6); border.strokeRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
    const box = ui.scene.add.container(xRight - w / 2, y + h / 2, [border, text]);
    box.setSize(w, h).setAngle(angle).setAlpha(0.88); this.add(box); return box;
  }
  fit(object, value, maxWidth) {
    let s = String(value ?? ''); object.setText(s);
    if (object.width <= maxWidth) return object;
    while (s.length > 0) {
      s = s.slice(0, -1); object.setText(`${s.trimEnd()}…`);
      if (object.width <= maxWidth) break;
    }
    return object;
  }
}
