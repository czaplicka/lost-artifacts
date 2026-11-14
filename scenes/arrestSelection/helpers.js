import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { FONT_PIXEL, PAL, FIELD_NOTE_QUIPS } from './config.js';

export const helpersMethods = {
  hexToCss(hex) {
    return `#${hex.toString(16).padStart(6, '0')}`;
  },

  fitImage(image, maxW, maxH) {
    const src = image.texture?.getSourceImage?.();

    if (!src?.width || !src?.height) {
      image.setDisplaySize(maxW, maxH);
      return image;
    }

    const scale = Math.min(maxW / src.width, maxH / src.height);
    image.setDisplaySize(src.width * scale, src.height * scale);

    return image;
  },

  drawDotted(graphics, x1, x2, y, dash = 6, gap = 6) {
    for (let x = x1; x < x2; x += dash + gap) {
      graphics.lineBetween(x, y, Math.min(x + dash, x2), y);
    }
  },

  getSuspectField(suspect, key) {
    return suspect?.[key] ?? suspect?.publicProfile?.[key];
  },

  getSuspectDisplayName(suspect, index) {
    return (
      suspect?.name ||
      suspect?.fullName ||
      suspect?.title ||
      `${__dialogueText("scenes/arrestSelection/helpers.js", "t_664f2782a797d0d6c481")}${index + 1}`
    );
  },

  formatDossierValue(value) {
    const text = Array.isArray(value)
      ? value.join(', ')
      : String(value ?? '').trim();

    if (!text) return __dialogueText("scenes/arrestSelection/helpers.js", "t_b764cdc0eab713746721");

    return text.charAt(0).toUpperCase() + text.slice(1);
  },

  getQuipFor(index) {
    const pick =
      this.quipOrder[index % this.quipOrder.length] ?? 0;

    return FIELD_NOTE_QUIPS[pick];
  },

  createStamp(x, y, label, fontSize, colorHex, rotation = 0) {
    const text = this.add
      .text(0, 0, label, {
        fontFamily: FONT_PIXEL,
        fontSize: `${fontSize}px`,
        color: this.hexToCss(colorHex)
      })
      .setOrigin(0.5);

    const w = text.width + 34;
    const h = text.height + 26;

    const outer = this.add
      .rectangle(0, 0, w, h, 0x000000, 0)
      .setStrokeStyle(4, colorHex, 1);

    const inner = this.add
      .rectangle(0, 0, w - 12, h - 12, 0x000000, 0)
      .setStrokeStyle(1.5, colorHex, 1);

    return this.add
      .container(x, y, [outer, inner, text])
      .setRotation(rotation);
  },

  createButton(x, y, w, h, label, options = {}) {
    const {
      fontSize = 18,
      fill = PAL.brown,
      fillHover = PAL.brownHover,
      stroke = PAL.gold,
      textColor = '#fff3d0',
      font = FONT_PIXEL
    } = options;

    const bg = this.add
      .rectangle(0, 0, w, h, fill, 1)
      .setStrokeStyle(3, stroke, 1);

    const inner = this.add
      .rectangle(0, 0, w - 12, h - 12, fill, 0)
      .setStrokeStyle(1, stroke, 0.45);

    const text = this.add
      .text(0, 0, label, {
        fontFamily: font,
        fontSize: `${fontSize}px`,
        color: textColor
      })
      .setOrigin(0.5);

    const container = this.add.container(x, y, [bg, inner, text]);

    container.setSize(w, h);
    container.bg = bg;
    container.label = text;
    container.fillNormal = fill;
    container.fillHover = fillHover;

    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      if (!container.input?.enabled) return;

      bg.setFillStyle(container.fillHover, 1);
      this.tweens.killTweensOf(container);
      this.tweens.add({
        targets: container,
        scale: 1.04,
        duration: 90
      });
    });

    container.on('pointerout', () => {
      bg.setFillStyle(
        container.input?.enabled
          ? container.fillNormal
          : bg.fillColor,
        1
      );

      this.tweens.killTweensOf(container);
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 90
      });
    });

    return container;
  },

  closeAllUIPanels() {
    const hud = this.scene.manager.keys.PlayerHudScene;

    hud?.closeAllUIPanels?.();
  },

  addHoverEffect(button, baseScale = 0.8, hoverScale = 0.9) {
    button.on('pointerover', () => {
      button.setScale(hoverScale);
    });

    button.on('pointerout', () => {
      button.setScale(baseScale);
    });
  }
};
