import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { LOCAL_DEBUG_ALLOWED, FONT, COLOR, TAG_W, BOARD_W, FALLBACK_DESCRIPTIONS, SHOP_SIGNS, QUIPS, normalizeCityId, hashString, seededRandom } from './ShopSceneData.js';

export const shopSceneView = {
  style(size = 16) {
    return { fontFamily: 'SpecialElite, monospace', fontSize: `${size}px`, color: '#fff1ce',
      backgroundColor: '#191b16', padding: { x: 8, y: 6 } };
  },
  ensureVignetteTexture() {
    const key = 'shop_vignette';
    if (this.textures.exists(key)) return key;
    const w = 960, h = 540;
    const tex = this.textures.createCanvas(key, w, h);
    if (!tex) return null;
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(w / 2, h * 0.5, h * 0.36, w / 2, h * 0.5, w * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, __dialogueText("scenes/ShopScene.js", "t_dc2a487fcb980b483813"));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    tex.refresh();
    return key;
  },
  createAtmosphere(width, height) {
    const key = this.ensureVignetteTexture();
    if (!key) return;
    this.vignette = this.add.image(width / 2, height / 2, key).setDisplaySize(width, height).setDepth(4);
  },
  createSign() {
    const sign = SHOP_SIGNS[this.cityId] || SHOP_SIGNS.default;
    const W = 470, H = 66, TOP = 14;
    const container = this.add.container(Math.round(this.scale.width * 0.335), 0).setDepth(60);
    const g = this.add.graphics();
    g.lineStyle(3, COLOR.brassDark, 1);
    g.lineBetween(-W / 2 + 40, 0, -W / 2 + 40, TOP + 2);
    g.lineBetween(W / 2 - 40, 0, W / 2 - 40, TOP + 2);
    g.fillStyle(0x000000, 0.35); g.fillRoundedRect(-W / 2 + 4, TOP + 5, W, H, 6);
    g.fillStyle(COLOR.brassDark, 1); g.fillRoundedRect(-W / 2, TOP, W, H, 6);
    g.fillStyle(COLOR.brass, 1); g.fillRoundedRect(-W / 2 + 3, TOP + 3, W - 6, H - 6, 4);
    g.fillStyle(COLOR.plate, 1); g.fillRoundedRect(-W / 2 + 7, TOP + 7, W - 14, H - 14, 3);
    g.fillStyle(COLOR.goldLight, 1);
    for (const [cx, cy] of [[-W / 2 + 12, TOP + 12], [W / 2 - 12, TOP + 12], [-W / 2 + 12, TOP + H - 12], [W / 2 - 12, TOP + H - 12]]) g.fillCircle(cx, cy, 2.5);

    const name = this.add.text(0, TOP + H * 0.37, sign.name, { fontFamily: FONT.pixel, fontSize: '15px', color: '#d4af37' }).setOrigin(0.5);
    let size = 15; while (name.width > W - 70 && size > 9) { size--; name.setFontSize(size); }
    name.setShadow(0, 0, '#d4af37', 6, false, true);
    const tagline = this.add.text(0, TOP + H * 0.74, sign.tagline, { fontFamily: FONT.body, fontSize: '14px', color: '#f8e7b9' }).setOrigin(0.5);

    container.add([g, name, tagline]);
    this.shopSign = container;
    this.tweens.add({ targets: container, angle: { from: -0.5, to: 0.5 }, duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },
  createCashPlate() {
    const W = 250, H = 38, x = 16, y = 12;
    const c = this.add.container(x, y).setDepth(100);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35); g.fillRoundedRect(3, 4, W, H, 6);
    g.fillStyle(COLOR.brassDark, 1); g.fillRoundedRect(0, 0, W, H, 6);
    g.fillStyle(COLOR.brass, 1); g.fillRoundedRect(2, 2, W - 4, H - 4, 5);
    g.fillStyle(0x0d0a07, 1); g.fillRoundedRect(6, 6, W - 12, H - 12, 3);
    g.lineStyle(1, COLOR.goldLight, 0.25); g.strokeRoundedRect(6, 6, W - 12, H - 12, 3);
    const label = this.add.text(16, H / 2, "CASH", { fontFamily: FONT.pixel, fontSize: '9px', color: '#a07a34' }).setOrigin(0, 0.5);
    this.cashText = this.add.text(W - 16, H / 2 + 1, "$0", { fontFamily: FONT.pixel, fontSize: '16px', color: '#ffd966' }).setOrigin(1, 0.5);
    this.cashText.setShadow(0, 0, '#ff9d1a', 8, false, true);
    this.moneyText = this.cashText;
    c.add([g, label, this.cashText]);
    this.cashPlate = c;
  },
  setCashDisplay(cash, animate) {
    const st = this.cashState, text = this.cashText;
    if (!text?.active) return;
    const from = st.display;
    st.tween?.stop?.(); st.tween = null;
    if (!animate || from === null || from === cash) {
      st.display = cash; text.setText(`${__dialogueText("scenes/ShopScene.js", "t_09fc96082d34c2dfc129")}${cash}`); text.setColor('#ffd966'); return;
    }
    const counter = { v: from };
    text.setColor(cash < from ? '#ff7a6b' : '#9dff7a');
    st.tween = this.tweens.add({
      targets: counter, v: cash, duration: 450, ease: 'Cubic.easeOut',
      onUpdate: () => { if (text.active) { st.display = Math.round(counter.v); text.setText(`${__dialogueText("scenes/ShopScene.js", "t_09fc96082d34c2dfc129")}${st.display}`); } },
      onComplete: () => { st.display = cash; if (text.active) { text.setText(`${__dialogueText("scenes/ShopScene.js", "t_09fc96082d34c2dfc129")}${cash}`); text.setColor('#ffd966'); } st.tween = null; }
    });
  },
  shakeCash() {
    const plate = this.cashPlate;
    if (!plate?.active) return;
    this.tweens.killTweensOf(plate); plate.setX(16);
    this.tweens.add({ targets: plate, x: { from: 11, to: 21 }, duration: 45, yoyo: true, repeat: 3,
      onComplete: () => { if (plate.active) plate.setX(16); } });
  },
  createExitButton() {
    const { width } = this.scale;
    if (this.textures.exists('btnExit')) {
      const btn = this.add.image(0, 0, 'btnExit').setScale(0.5).setOrigin(0.5).setDepth(100).setInteractive({ useHandCursor: true });
      btn.setPosition(width - 20 - btn.displayWidth / 2, 16 + btn.displayHeight / 2);
      btn.on('pointerover', () => { if (!this.hudPanelOpen) btn.setScale(0.6); });
      btn.on('pointerout', () => btn.setScale(0.5)); btn.on('pointerdown', () => this.exitShop()); this.exitButton = btn;
    } else {
      console.warn('[ShopScene] Texture "btnExit" missing, using brass fallback.');
      this.exitButton = this.createBrassButton(width - 20 - 70, 16 + 20, 140, 40, 'EXIT', () => this.exitShop());
    }
  },
  createBrassButton(cx, cy, w, h, label, onClick) {
    const c = this.add.container(cx, cy).setDepth(100);
    const g = this.add.graphics();
    const text = this.add.text(0, 1, label, { fontFamily: FONT.pixel, fontSize: '12px', color: '#d4af37' }).setOrigin(0.5);
    const draw = hover => {
      g.clear();
      g.fillStyle(0x000000, 0.35); g.fillRoundedRect(-w / 2 + 3, -h / 2 + 4, w, h, 6);
      g.fillStyle(COLOR.brassDark, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
      g.fillStyle(hover ? COLOR.brassLight : COLOR.brass, 1); g.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 5);
      g.fillStyle(hover ? 0x2a2014 : COLOR.plate, 1); g.fillRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 3);
    };
    const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { if (this.hudPanelOpen) return; draw(true); text.setColor('#f0d48a'); });
    hit.on('pointerout', () => { draw(false); text.setColor('#d4af37'); });
    hit.on('pointerdown', () => onClick());
    draw(false); c.add([g, text, hit]);
    return c;
  },
  createTagCard() {
    const container = this.add.container(0, 0).setDepth(300).setVisible(false);
    const gfx = this.add.graphics();
    const tape = this.add.rectangle(TAG_W / 2, 0, 74, 18, COLOR.tape, 0.85).setAngle(-3);
    const title = this.add.text(18, 20, '', { fontFamily: FONT.body, fontSize: '20px', color: '#2b2118', wordWrap: { width: TAG_W - 36 } });
    const desc = this.add.text(18, 0, '', { fontFamily: FONT.body, fontSize: '15px', color: '#6b5a3e', wordWrap: { width: TAG_W - 36 }, lineSpacing: 3 });
    const status = this.add.text(18, 0, '', { fontFamily: FONT.pixel, fontSize: '9px', color: '#2f7d32' }).setOrigin(0, 0.5);
    const priceText = this.add.text(0, 0, '', { fontFamily: FONT.pixel, fontSize: '13px', color: '#2b2118' }).setOrigin(0.5);
    container.add([gfx, tape, title, desc, status, priceText]);
    this.tag = { container, gfx, tape, title, desc, status, priceText, h: 0 };
  },
  renderTag(cfg) {
    const t = this.tag; if (!t) return;
    this.tagCfg = cfg;
    const state = this.getBuyState(cfg), W = TAG_W;
    t.title.setText(cfg.label);
    t.desc.setText(this.getDescription(cfg)).setY(t.title.y + t.title.height + 16);
    const footerY = t.desc.y + t.desc.height + 14, H = Math.round(footerY + 46);
    const dividerY = t.title.y + t.title.height + 7;

    const g = t.gfx; g.clear();
    g.fillStyle(0x000000, 0.35); g.fillRoundedRect(5, 7, W, H, 6);
    g.fillStyle(COLOR.paper, 1); g.fillRoundedRect(0, 0, W, H, 6);
    g.fillStyle(COLOR.paperDark, 1); g.fillRoundedRect(0, footerY - 6, W, H - footerY + 6, { tl: 0, tr: 0, bl: 6, br: 6 });
    g.lineStyle(2, COLOR.paperEdge, 1); g.strokeRoundedRect(0, 0, W, H, 6);
    g.fillStyle(COLOR.inkSoft, 0.5);
    for (let dx = 18; dx < W - 24; dx += 10) g.fillRect(dx, dividerY, 5, 2);

    t.status.setPosition(18, footerY + 18).setText(state.text).setColor(state.color);
    t.priceText.setText(`${__dialogueText("scenes/ShopScene.js", "t_09fc96082d34c2dfc129")}${cfg.price}`);
    const pw = t.priceText.width + 24, ph = 30, px = W - 16 - pw, py = footerY + 18 - ph / 2;
    g.fillStyle(COLOR.brassDark, 1); g.fillRoundedRect(px, py + 2, pw, ph, 8);
    g.fillStyle(COLOR.gold, 1); g.fillRoundedRect(px, py, pw, ph, 8);
    g.lineStyle(1, COLOR.goldLight, 0.9); g.strokeRoundedRect(px + 2, py + 2, pw - 4, ph - 4, 6);
    t.priceText.setPosition(px + pw / 2, py + ph / 2 + 1);
    t.h = H;
  },
  showTooltip(cfg, x, y, originY = 1, altY = y + 40) {
    if (!this.tag || this.hudPanelOpen || this.exiting || this.debugMode) return;
    this.renderTag(cfg);
    const { width, height } = this.scale, t = this.tag;
    const tx = Phaser.Math.Clamp(x - TAG_W / 2, 8, width - TAG_W - 8);
    let ty = originY === 1 ? y - t.h : y;
    if (originY === 1 && ty < 8) ty = altY;
    ty = Phaser.Math.Clamp(ty, 8, height - t.h - 8);
    t.container.setPosition(Math.round(tx), Math.round(ty));
    if (!t.container.visible) {
      this.tweens.killTweensOf(t.container);
      t.container.setAlpha(0).setVisible(true);
      this.tweens.add({ targets: t.container, alpha: 1, duration: 120 });
    }
  },
  hideTooltip() {
    const t = this.tag; this.tagCfg = null;
    if (!t?.container?.active) return;
    this.tweens.killTweensOf(t.container);
    t.container.setVisible(false).setAlpha(1);
  },
  showFeedback(text, kind = 'info', sub = null) {
    this.destroyToast();
    if (!this.sys?.isActive()) return;
    const { width } = this.scale;
    const W = 470, PAD = 18, TEXT_X = -W / 2 + PAD + 46;
    const accent = kind === 'success' ? COLOR.green : kind === 'error' ? COLOR.red : COLOR.brass;
    const accentHex = kind === 'success' ? '#2f7d32' : kind === 'error' ? '#9a2b2b' : '#8b6b2f';
    const head = this.add.text(TEXT_X, 14, kind === "success" ? __dialogueText("scenes/ShopScene.js", "t_4b304cbbb823bedd4f85") : kind === "error" ? __dialogueText("scenes/ShopScene.js", "t_efac12f92667900c0d3a") : __dialogueText("scenes/ShopScene.js", "t_dfb14fbb9e7d095209ec"),
      { fontFamily: FONT.pixel, fontSize: '9px', color: accentHex });
    const msg = this.add.text(TEXT_X, 32, text, { fontFamily: FONT.body, fontSize: '18px', color: '#2b2118', wordWrap: { width: W - PAD * 2 - 52 } });
    const subText = sub ? this.add.text(W / 2 - PAD, 32 + msg.height + 8, sub, { fontFamily: FONT.pixel, fontSize: '12px', color: accentHex }).setOrigin(1, 0) : null;
    const H = Math.round(32 + msg.height + (sub ? 30 : 10) + 14), TEETH = 7, STEP = 14;

    const g = this.add.graphics();
    const pts = [{ x: -W / 2, y: 0 }, { x: W / 2, y: 0 }, { x: W / 2, y: H - TEETH }];
    const n = Math.floor(W / STEP);
    for (let i = 0; i <= n; i++) pts.push({ x: W / 2 - i * STEP, y: i % 2 === 0 ? H : H - TEETH });
    pts.push({ x: -W / 2, y: H - TEETH });
    g.fillStyle(0x000000, 0.3); g.fillPoints(pts.map(p => ({ x: p.x + 4, y: p.y + 6 })), true);
    g.fillStyle(COLOR.paper, 1); g.fillPoints(pts, true);
    g.fillStyle(accent, 1); g.fillRect(-W / 2, 0, 6, H - TEETH);
    // ikona
    const ix = -W / 2 + PAD + 20, iy = (H - TEETH) / 2;
    g.fillStyle(accent, 1); g.fillCircle(ix, iy, 15);
    g.lineStyle(3, 0xffffff, 1);
    if (kind === 'success') { g.lineBetween(ix - 7, iy, ix - 2, iy + 6); g.lineBetween(ix - 2, iy + 6, ix + 8, iy - 6); }
    else if (kind === 'error') { g.lineBetween(ix - 6, iy - 6, ix + 6, iy + 6); g.lineBetween(ix + 6, iy - 6, ix - 6, iy + 6); }
    else { g.lineBetween(ix, iy - 7, ix, iy + 2); g.fillStyle(0xffffff, 1); g.fillCircle(ix, iy + 7, 2); }

    const c = this.add.container(width / 2, -H - 20, [g, head, msg]).setDepth(250).setAngle(Phaser.Math.FloatBetween(-1.1, 1.1));
    if (subText) c.add(subText);
    this.toast = c;
    this.tweens.add({ targets: c, y: 92, duration: 260, ease: 'Back.easeOut' });
    this.toastTimer = this.time.delayedCall(3500, () => {
      if (!c.active || this.toast !== c) return;
      this.tweens.add({ targets: c, y: -H - 20, alpha: 0, duration: 240, ease: 'Cubic.easeIn',
        onComplete: () => { if (c.active) c.destroy(); if (this.toast === c) this.toast = null; } });
    });
  },
  destroyToast() {
    this.toastTimer?.remove(false); this.toastTimer = null;
    if (this.toast?.active) { this.tweens.killTweensOf(this.toast); this.toast.destroy(); }
    this.toast = null;
  },
  purchaseEffects(cfg) {
    if (!this.sys?.isActive()) return;
    const x = cfg.x, y = cfg.y;
    const floater = this.add.text(x, y - cfg.h / 2, `${"-$"}${cfg.price}`, { fontFamily: FONT.pixel, fontSize: '16px', color: '#ffd966',
      stroke: "#15110d", strokeThickness: 4 }).setOrigin(0.5).setDepth(260);
    this.tweens.add({ targets: floater, y: floater.y - 80, alpha: 0, duration: 1100, ease: 'Cubic.easeOut',
      onComplete: () => { if (floater.active) floater.destroy(); } });
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.4, dist = 50 + Math.random() * 60;
      const p = this.add.circle(x, y, 3 + Math.random() * 3, i % 2 ? COLOR.gold : COLOR.goldLight).setDepth(260);
      this.tweens.add({ targets: p, x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist - 20, alpha: 0, scale: 0.2,
        duration: 600 + Math.random() * 300, ease: 'Cubic.easeOut', onComplete: () => { if (p.active) p.destroy(); } });
    }
  }
};
