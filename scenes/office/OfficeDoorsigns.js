import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
const FONT_TITLE = 'PressStart2P';
const FONT_BODY = 'SpecialElite';

const SIGN_W = 270;
const SIGN_H = 68;
const DEPTH = 100;

const COLORS = {
  gold: 0xf2d477,
  goldBright: 0xfff4c7,
  goldDim: 0x7d6a3d,
  blocked: 0x8b8475,
  fill: 0x17110e,
  fillHover: 0x2c2114,
  well: 0x2a1f14
};

/**
 * Tabliczki "drzwi" w lewym górnym rogu biura (Archive, Storage Room).
 *
 * Każda tabliczka to Container ze stałymi granicami (nic się nie przesuwa),
 * dzięki czemu FirstCaseTutorial może ją podświetlać przez getBounds().
 *
 * options:
 *  x, y, spacing - pozycja pierwszej tabliczki i odstęp między tabliczkami
 *  doors: [{
 *    id, label, subtitle, glyph ('archive' | 'storage'),
 *    lockedLabel,       // napis na plakietce, gdy zablokowane (opcjonalnie)
 *    isBlocked(),       // czy tabliczka jest teraz zablokowana
 *    onOpen(),          // klik, gdy odblokowane
 *    onBlockedClick()   // klik, gdy zablokowane (opcjonalnie)
 *  }]
 */
export class OfficeDoorSigns {
  constructor(scene, options = {}) {
    this.scene = scene;

    this.x = options.x ?? 24;
    this.y = options.y ?? 170;
    this.spacing = options.spacing ?? 82;
    this.definitions = options.doors ?? [];

    this.signs = new Map();
    this.isDestroyed = false;
  }

  create() {
    this.definitions.forEach((definition, index) => {
      this.createSign(definition, index);
    });

    this.refresh();
  }

  getSign(id) {
    return this.signs.get(id)?.container ?? null;
  }

  createSign(def, index) {
    const scene = this.scene;

    const container = scene.add
      .container(this.x, this.y + index * this.spacing)
      .setSize(SIGN_W, SIGN_H)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setName(`office-door-${def.id}`);

    const shadow = scene.add
      .rectangle(4, 5, SIGN_W, SIGN_H, 0x000000, 0.4)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    const base = scene.add
      .rectangle(0, 0, SIGN_W, SIGN_H, COLORS.fill, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(2, COLORS.gold, 0.9)
      .setScrollFactor(0);

    const deco = scene.add.graphics().setScrollFactor(0);

    deco.lineStyle(1, COLORS.goldDim, 0.7);
    deco.strokeRect(5, 5, SIGN_W - 10, SIGN_H - 10);

    deco.fillStyle(COLORS.well, 1);
    deco.fillRect(10, 10, 48, 48);
    deco.lineStyle(1, COLORS.goldDim, 0.9);
    deco.strokeRect(10, 10, 48, 48);

    deco.fillStyle(COLORS.goldDim, 1);
    deco.fillCircle(SIGN_W - 12, SIGN_H - 12, 2);

    const icon = scene.add
      .graphics()
      .setScrollFactor(0)
      .setPosition(34, 34);

    const title = scene.add
      .text(70, 13, def.label ?? '', {
        fontFamily: FONT_TITLE,
        fontSize: '11px',
        color: '#f2d477'
      })
      .setScrollFactor(0);

    const subtitle = scene.add
      .text(70, 36, def.subtitle ?? '', {
        fontFamily: FONT_BODY,
        fontSize: '15px',
        color: '#d7c58f'
      })
      .setScrollFactor(0);

    const maxSubtitleWidth = SIGN_W - 70 - 34;

    if (subtitle.width > maxSubtitleWidth) {
      subtitle.setScale(maxSubtitleWidth / subtitle.width);
    }

    const chevron = scene.add
      .text(SIGN_W - 22, SIGN_H / 2, __dialogueText("scenes/office/OfficeDoorsigns.js", "t_62b67e1f685b7fef5110"), {
        fontFamily: FONT_TITLE,
        fontSize: '14px',
        color: '#f2d477'
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const lockBadge = scene.add
      .text(SIGN_W - 10, 8, def.lockedLabel ?? '', {
        fontFamily: FONT_TITLE,
        fontSize: '7px',
        color: '#d76d52'
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setVisible(false);

    const hit = scene.add
      .rectangle(0, 0, SIGN_W, SIGN_H, 0x000000, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    container.add([
      shadow,
      base,
      deco,
      icon,
      title,
      subtitle,
      chevron,
      lockBadge,
      hit
    ]);

    // Delikatne "kiwanie" strzałki zachęca do kliknięcia.
    const pulse = scene.tweens.add({
      targets: chevron,
      x: SIGN_W - 17,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      paused: true
    });

    const sign = {
      def,
      container,
      base,
      icon,
      title,
      subtitle,
      chevron,
      lockBadge,
      hit,
      pulse,
      hovered: false,
      blocked: false
    };

    hit.on('pointerover', () => {
      if (this.isDestroyed) return;

      sign.hovered = true;
      this.applyState(sign);
    });

    hit.on('pointerout', () => {
      if (this.isDestroyed) return;

      sign.hovered = false;
      this.applyState(sign);
    });

    hit.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();

      if (
        pointer?.event?.button !== undefined &&
        pointer.event.button !== 0
      ) {
        return;
      }

      if (
        this.isDestroyed ||
        !this.scene.isOfficeActive?.()
      ) {
        return;
      }

      if (def.isBlocked?.()) {
        def.onBlockedClick?.();
        return;
      }

      void def.onOpen?.();
    });

    this.signs.set(def.id, sign);
  }

  applyState(sign) {
    if (this.isDestroyed || !sign.container?.scene) {
      return;
    }

    const blocked = Boolean(sign.def.isBlocked?.());
    const hover = sign.hovered && !blocked;

    sign.blocked = blocked;

    sign.base
      .setFillStyle(
        hover ? COLORS.fillHover : COLORS.fill,
        0.96
      )
      .setStrokeStyle(
        hover ? 3 : 2,
        hover ? COLORS.goldBright : COLORS.gold,
        blocked ? 0.45 : 0.9
      );

    sign.title.setColor(
      blocked ? '#8b8475' : hover ? '#ffffff' : '#f2d477'
    );

    sign.subtitle.setColor(
      blocked ? '#6f6858' : hover ? '#f0e6b8' : '#d7c58f'
    );

    sign.chevron.setColor(
      blocked ? '#8b8475' : hover ? '#ffffff' : '#f2d477'
    );

    sign.lockBadge.setVisible(
      blocked && Boolean(sign.def.lockedLabel)
    );

    sign.container.setAlpha(blocked ? 0.6 : 1);

    this.drawGlyph(
      sign,
      blocked
        ? COLORS.blocked
        : hover
          ? COLORS.goldBright
          : COLORS.gold
    );

    if (blocked || hover) {
      sign.pulse.pause();
    } else {
      sign.pulse.resume();
    }
  }

  drawGlyph(sign, color) {
    const g = sign.icon;

    g.clear();
    g.lineStyle(2, color, 1);

    switch (sign.def.glyph) {
      case 'archive':
        // Teczka z kartkami.
        g.strokeRect(-14, -8, 28, 20);
        g.lineBetween(-14, -8, -14, -13);
        g.lineBetween(-14, -13, -4, -13);
        g.lineBetween(-4, -13, 0, -8);
        g.lineBetween(-8, -1, 8, -1);
        g.lineBetween(-8, 5, 8, 5);
        break;

      case 'storage':
        // Skrzynia z usztywnieniami.
        g.strokeRect(-14, -12, 28, 24);
        g.lineBetween(-14, -12, 14, 12);
        g.lineBetween(14, -12, -14, 12);
        break;

      default:
        g.strokeCircle(0, 0, 10);
        break;
    }
  }

  refresh() {
    if (this.isDestroyed) {
      return;
    }

    for (const sign of this.signs.values()) {
      this.applyState(sign);
    }
  }

  destroy() {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;

    for (const sign of this.signs.values()) {
      sign.pulse?.remove();
      sign.hit?.removeAllListeners();
      sign.container?.destroy(true);
    }

    this.signs.clear();
  }
}
