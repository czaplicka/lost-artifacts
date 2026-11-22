const FONT_TITLE = 'PressStart2P';
const FONT_BODY = 'SpecialElite';
const SIGN_W = 270;
const SIGN_H = 68;
const DEPTH = 100;
const COLORS = {
  gold: 0xf2d477, goldBright: 0xfff4c7, goldDim: 0x7d6a3d,
  blocked: 0x8b8475, fill: 0x17110e, fillHover: 0x2c2114, well: 0x2a1f14
};

export class OfficeDoorSigns {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.x = options.x ?? 24;
    this.y = options.y ?? 170;
    this.spacing = options.spacing ?? 82;
    this.definitions = options.doors ?? [];
    this.signs = new Map();
    this.isDestroyed = false;
    this._runToken = scene._runToken;
    this._request = null;
    this._onSceneEnd = () => this.destroy();
  }

  isCurrentRun() {
    return Boolean(!this.isDestroyed && this.scene && this.scene._runToken === this._runToken);
  }

  isActive() {
    return Boolean(this.isCurrentRun() && this.scene.isOfficeActive?.());
  }

  create() {
    if (this.isDestroyed || this.signs.size) return;
    this.definitions.forEach((definition, index) => this.createSign(definition, index));
    this.scene.events.once('shutdown', this._onSceneEnd);
    this.scene.events.once('destroy', this._onSceneEnd);
    this.refresh();
  }

  getSign(id) {
    return this.signs.get(id)?.container ?? null;
  }

  createSign(def, index) {
    if (this.isDestroyed || this.signs.has(def.id)) return;
    const scene = this.scene;
    const container = scene.add.container(this.x, this.y + index * this.spacing)
      .setSize(SIGN_W, SIGN_H).setScrollFactor(0).setDepth(DEPTH)
      .setName(`office-door-${def.id}`);
    const shadow = scene.add.rectangle(4, 5, SIGN_W, SIGN_H, 0x000000, 0.4)
      .setOrigin(0, 0).setScrollFactor(0);
    const base = scene.add.rectangle(0, 0, SIGN_W, SIGN_H, COLORS.fill, 0.96)
      .setOrigin(0, 0).setStrokeStyle(2, COLORS.gold, 0.9).setScrollFactor(0);
    const deco = scene.add.graphics().setScrollFactor(0);
    deco.lineStyle(1, COLORS.goldDim, 0.7);
    deco.strokeRect(5, 5, SIGN_W - 10, SIGN_H - 10);
    deco.fillStyle(COLORS.well, 1);
    deco.fillRect(10, 10, 48, 48);
    deco.lineStyle(1, COLORS.goldDim, 0.9);
    deco.strokeRect(10, 10, 48, 48);
    deco.fillStyle(COLORS.goldDim, 1);
    deco.fillCircle(SIGN_W - 12, SIGN_H - 12, 2);
    const icon = scene.add.graphics().setScrollFactor(0).setPosition(34, 34);
    const title = scene.add.text(70, 13, def.label ?? '', {
      fontFamily: FONT_TITLE, fontSize: '11px', color: '#f2d477'
    }).setScrollFactor(0);
    const subtitle = scene.add.text(70, 36, def.subtitle ?? '', {
      fontFamily: FONT_BODY, fontSize: '15px', color: '#d7c58f'
    }).setScrollFactor(0);
    const maxSubtitleWidth = SIGN_W - 70 - 34;
    if (subtitle.width > maxSubtitleWidth) subtitle.setScale(maxSubtitleWidth / subtitle.width);
    const chevron = scene.add.text(SIGN_W - 22, SIGN_H / 2, '>', {
      fontFamily: FONT_TITLE, fontSize: '14px', color: '#f2d477'
    }).setOrigin(0.5).setScrollFactor(0);
    const lockBadge = scene.add.text(SIGN_W - 10, 8, def.lockedLabel ?? '', {
      fontFamily: FONT_TITLE, fontSize: '7px', color: '#d76d52'
    }).setOrigin(1, 0).setScrollFactor(0).setVisible(false);
    const hit = scene.add.rectangle(0, 0, SIGN_W, SIGN_H, 0x000000, 0)
      .setOrigin(0, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
    container.add([shadow, base, deco, icon, title, subtitle, chevron, lockBadge, hit]);
    const pulse = scene.tweens.add({
      targets: chevron, x: SIGN_W - 17, duration: 700,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut', paused: true
    });
    const sign = {
      def, container, base, icon, title, subtitle, chevron, lockBadge,
      hit, pulse, hovered: false, blocked: false
    };
    hit.on('pointerover', () => {
      if (!this.isActive() || this._request) return;
      sign.hovered = true;
      this.applyState(sign);
    });
    hit.on('pointerout', () => {
      if (this.isDestroyed) return;
      sign.hovered = false;
      this.applyState(sign);
    });
    hit.on('pointerdown', (pointer, _localX, _localY, event) => {
      event?.stopPropagation?.();
      if (pointer?.event?.button !== undefined && pointer.event.button !== 0) return;
      void this.activate(sign);
    });
    this.signs.set(def.id, sign);
  }

  isBlocked(sign) {
    try {
      return Boolean(sign.def.isBlocked?.());
    } catch (error) {
      console.error(`[OfficeDoorSigns] Cannot read lock for "${sign.def.id}".`, error);
      return true;
    }
  }

  async activate(sign) {
    if (!this.isActive() || this._request || !sign?.container?.scene) return false;
    const request = Symbol(sign.def.id);
    this._request = request;
    try {
      this.scene.refreshPanelLock?.();
      if (!this.isActive()) return false;
      const blocked = this.isBlocked(sign);
      this.refresh();
      if (blocked) {
        await sign.def.onBlockedClick?.();
        return false;
      }
      if (typeof sign.def.onOpen !== 'function') return false;
      // Local request protection must not set scene.uiLocked: the room opener checks it.
      const result = await sign.def.onOpen();
      return this.isCurrentRun() && result !== false;
    } catch (error) {
      console.error(`[OfficeDoorSigns] Failed to activate "${sign.def.id}".`, error);
      return false;
    } finally {
      if (this._request === request) this._request = null;
      if (this.isActive()) {
        try {
          this.scene.refreshPanelLock?.();
          this.refresh();
        } catch (error) {
          console.error('[OfficeDoorSigns] Refresh failed:', error);
        }
      }
    }
  }

  applyState(sign) {
    if (this.isDestroyed || !sign.container?.scene) return;
    const blocked = this.isBlocked(sign);
    const pending = this._request !== null;
    const unavailable = blocked || pending;
    const hover = sign.hovered && !unavailable;
    sign.blocked = blocked;
    if (unavailable) sign.hovered = false;
    sign.base.setFillStyle(hover ? COLORS.fillHover : COLORS.fill, 0.96)
      .setStrokeStyle(hover ? 3 : 2, hover ? COLORS.goldBright : COLORS.gold, unavailable ? 0.45 : 0.9);
    sign.title.setColor(unavailable ? '#8b8475' : hover ? '#ffffff' : '#f2d477');
    sign.subtitle.setColor(unavailable ? '#6f6858' : hover ? '#f0e6b8' : '#d7c58f');
    sign.chevron.setColor(unavailable ? '#8b8475' : hover ? '#ffffff' : '#f2d477');
    sign.lockBadge.setVisible(blocked && Boolean(sign.def.lockedLabel));
    sign.container.setAlpha(unavailable ? 0.6 : 1);
    // Blocked signs still accept a click to show their existing explanation.
    if (sign.hit.input) sign.hit.input.enabled = !pending;
    this.drawGlyph(sign, unavailable ? COLORS.blocked : hover ? COLORS.goldBright : COLORS.gold);
    if (unavailable || hover) sign.pulse.pause();
    else sign.pulse.resume();
  }

  drawGlyph(sign, color) {
    const g = sign.icon;
    g.clear();
    g.lineStyle(2, color, 1);
    switch (sign.def.glyph) {
      case 'archive':
        g.strokeRect(-14, -8, 28, 20);
        g.lineBetween(-14, -8, -14, -13);
        g.lineBetween(-14, -13, -4, -13);
        g.lineBetween(-4, -13, 0, -8);
        g.lineBetween(-8, -1, 8, -1);
        g.lineBetween(-8, 5, 8, 5);
        break;
      case 'storage':
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
    if (!this.isCurrentRun()) return;
    for (const sign of this.signs.values()) this.applyState(sign);
  }

  destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this._request = null;
    this.scene?.events.off('shutdown', this._onSceneEnd);
    this.scene?.events.off('destroy', this._onSceneEnd);
    for (const sign of this.signs.values()) {
      sign.pulse?.remove();
      sign.hit?.removeAllListeners();
      sign.container?.destroy(true);
    }
    this.signs.clear();
    this.scene = null;
  }
}
