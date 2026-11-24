import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { LOCAL_DEBUG_ALLOWED, FONT, COLOR, TAG_W, BOARD_W, FALLBACK_DESCRIPTIONS, SHOP_SIGNS, QUIPS, normalizeCityId, hashString, seededRandom } from './ShopSceneData.js';
import { gameState } from '../../GameData.js';
import { SHOP_CONFIG } from '../../config/shopConfig.js';
import { moneyManager, MONEY_SOURCE } from '../../managers/MoneyManager.js';
import { inventoryManager } from '../../managers/InventoryManager.js';

export const shopSceneStock = {
  getShopDay() {
    const day = Number(gameState.currentDay || gameState.day || 1); return Number.isFinite(day) ? day : 1;
  },
  pickTodaysProducts(all) {
    const inCity = all.filter(cfg => !Array.isArray(cfg.cities) || !cfg.cities.length || cfg.cities.map(normalizeCityId).includes(this.cityId));
    const permanent = inCity.filter(cfg => cfg.type !== 'rotating'), pool = inCity.filter(cfg => cfg.type === 'rotating');
    const count = Math.min(pool.length, SHOP_CONFIG.rotatingCount ?? 3);
    const rand = seededRandom(hashString(`${this.cityId}|day${this.getShopDay()}`));
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    const todays = new Set(shuffled.slice(0, count));
    return all.filter(cfg => permanent.includes(cfg) || todays.has(cfg));
  },
  getDescription(cfg) {
    const own = cfg.description || cfg.item?.description; if (own) return own;
    const key = String(cfg.id || cfg.item?.id || cfg.label || '');
    return FALLBACK_DESCRIPTIONS[hashString(key) % FALLBACK_DESCRIPTIONS.length];
  },
  getBuyState(cfg) {
    const cash = moneyManager.getBalance(MONEY_SOURCE.CASH);
    const itemId = cfg.item?.id;
    const existing = itemId ? inventoryManager.getItem(itemId) : null;
    if (existing && !(existing.stackable === true && cfg.item.stackable === true)) {
      return { code: 'owned', text: __dialogueText("scenes/ShopScene.js", "t_eba22ef0538e930d5a33"), color: '#8b6b2f' };
    }
    const capacity = inventoryManager.getCapacity();
    if (!existing && capacity.current >= capacity.max) return { code: 'full', text: __dialogueText("scenes/ShopScene.js", "t_96f11bab701ebcef79d7"), color: '#9a2b2b' };
    if (cash < cfg.price) return { code: 'broke', text: __dialogueText("scenes/ShopScene.js", "t_28d559a6d838d6c3ddbd"), color: '#9a2b2b' };
    return { code: __dialogueText("scenes/ShopScene.js", "t_2689367b205c16ce32ed"), text: __dialogueText("scenes/ShopScene.js", "t_bc0a0f99833b76770deb"), color: '#2f7d32' };
  },
  createStockBoard() {
    this.hideTooltip();
    this.boardContainer.removeAll(true); this.stockEntries = []; this.stockRows = [];
    const { x, y } = SHOP_CONFIG.stockBoard;
    const W = BOARD_W, ROW = 34, HEAD = 62;
    const perPage = Math.max(1, Math.floor((this.scale.height - y - 230) / ROW));
    const pages = Math.max(1, Math.ceil(this.products.length / perPage));
    this.stockPage = Math.min(this.stockPage, pages - 1);
    const visible = this.products.slice(this.stockPage * perPage, (this.stockPage + 1) * perPage);
    const footerH = pages > 1 ? 70 : 46;
    const H = HEAD + visible.length * ROW + footerH;
    const bc = this.boardContainer;

    // blokada klików pod tablicą
    bc.add(this.add.zone(x + W / 2, y + H / 2, W, H).setInteractive());

    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.38); g.fillRoundedRect(x + 5, y + 7, W, H, 8);
    g.fillStyle(COLOR.woodDark, 1); g.fillRoundedRect(x, y, W, H, 8);
    g.fillStyle(COLOR.wood, 1); g.fillRoundedRect(x + 3, y + 3, W - 6, H - 6, 6);
    g.fillStyle(COLOR.chalkBoard, 1); g.fillRoundedRect(x + 10, y + 10, W - 20, H - 20, 3);
    g.lineStyle(1, 0xffffff, 0.08); g.strokeRoundedRect(x + 10, y + 10, W - 20, H - 20, 3);
    const rand = seededRandom(hashString(`board|${this.cityId}`));
    for (let i = 0; i < 10; i++) {
      g.fillStyle(0xffffff, 0.02 + rand() * 0.025);
      g.fillEllipse(x + 30 + rand() * (W - 60), y + 20 + rand() * (H - 40), 60 + rand() * 90, 14 + rand() * 22);
    }
    // kredowa linia pod tytułem
    g.fillStyle(0xf2ecd8, 0.45);
    for (let dx = x + 22; dx < x + W - 28; dx += 10) g.fillRect(dx, y + 44, 6, 2);
    // półeczka na kredę
    g.fillStyle(COLOR.woodDark, 1); g.fillRoundedRect(x + W * 0.2, y + H - 2, W * 0.6, 9, 3);
    g.fillStyle(0xf2ecd8, 1); g.fillRect(x + W * 0.3, y + H - 5, 20, 5);
    g.fillStyle(0xe8a0a0, 1); g.fillRect(x + W * 0.3 + 28, y + H - 5, 14, 5);
    bc.add(g);

    const title = this.add.text(x + W / 2, y + 26, "TODAY'S STOCK", { fontFamily: FONT.pixel, fontSize: '14px', color: '#d4af37' }).setOrigin(0.5);
    title.setShadow(0, 0, '#d4af37', 5, false, true);
    bc.add(title);

    visible.forEach((cfg, i) => {
      const rowY = y + HEAD + i * ROW;
      const hl = this.add.rectangle(x + 16, rowY, W - 32, ROW - 4, 0xffffff, 0).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      const dots = this.add.graphics();
      const label = this.add.text(x + 24, rowY + ROW / 2 - 2, cfg.label, { fontFamily: FONT.body, fontSize: '17px', color: '#f2ecd8' }).setOrigin(0, 0.5);
      let size = 17; const maxW = W - 24 * 2 - 74;
      while (label.width > maxW && size > 11) { size--; label.setFontSize(size); }
      const price = this.add.text(x + W - 24, rowY + ROW / 2 - 2, '', { fontFamily: FONT.body, fontSize: '17px', color: '#ffd966' }).setOrigin(1, 0.5);
      const row = { cfg, hl, dots, label, price, rowY };

      hl.on('pointerover', () => {
        if (this.hudPanelOpen || this.exiting || this.debugMode) return;
        this.setRowHover(row, true); this.setHotspotHover(cfg, true);
        this.showTooltip(cfg, x + W + 12 + TAG_W / 2, rowY, 0);
      });
      hl.on('pointerout', () => { this.setRowHover(row, false); this.setHotspotHover(cfg, false); this.hideTooltip(); });
      hl.on('pointerdown', () => this.buyItem(cfg));

      bc.add([hl, dots, label, price]);
      this.stockRows.push(row); this.stockEntries.push({ cfg, entry: label });
      this.applyRowState(row);
    });

    const footY = y + HEAD + visible.length * ROW + 10;
    bc.add(this.add.text(x + W / 2, footY + 8, "Fresh stock every day. Allegedly.", { fontFamily: FONT.body, fontSize: '12px', color: '#9aa594' }).setOrigin(0.5));

    if (pages > 1) {
      bc.add(this.add.text(x + W / 2, footY + 38, `${this.stockPage + 1}${"/"}${pages}`, { fontFamily: FONT.pixel, fontSize: '10px', color: '#f2ecd8' }).setOrigin(0.5));
      for (const [label, bx, delta] of [['<', x + 40, -1], ['>', x + W - 40, 1]]) {
        const rect = this.add.rectangle(bx, footY + 38, 36, 24, 0x000000, 0.25).setStrokeStyle(1, 0xf2ecd8, 0.5).setInteractive({ useHandCursor: true });
        const txt = this.add.text(bx, footY + 38, label, { fontFamily: FONT.pixel, fontSize: '12px', color: '#f2ecd8' }).setOrigin(0.5);
        rect.on('pointerover', () => rect.setFillStyle(0xffffff, 0.15));
        rect.on('pointerout', () => rect.setFillStyle(0x000000, 0.25));
        rect.on('pointerdown', () => {
          if (this.hudPanelOpen || this.exiting) return;
          this.hideTooltip(); this.stockPage = (this.stockPage + delta + pages) % pages;
          this.createStockBoard(); this.refreshMoneyHUD();
        });
        bc.add([rect, txt]);
      }
    }
  },
  setRowHover(row, on) {
    if (row?.hl?.active) row.hl.setFillStyle(0xffffff, on ? 0.09 : 0);
  },
  setBoardRowHover(cfg, on) {
    const row = this.stockRows.find(r => r.cfg === cfg);
    if (row) this.setRowHover(row, on);
  },
  setHotspotHover(cfg, on) {
    const hs = this.hotspots.find(h => h.cfg === cfg);
    if (!hs) return;
    hs.hovered = on; this.drawHotspot(hs);
  },
  applyRowState(row) {
    if (!row?.label?.active || !row.price?.active) return;
    const state = this.getBuyState(row.cfg);
    const dim = state.code !== "ok";
    row.label.setColor(dim ? '#7f8a7c' : '#f2ecd8');
    if (state.code === 'owned') {
      row.price.setFontFamily(FONT.pixel).setFontSize(9).setColor("#8fd18f").setText(__dialogueText("scenes/ShopScene.js", "t_93fc6ec560dce84a1f6e"));
    } else {
      row.price.setFontFamily(FONT.body).setFontSize(17).setColor(dim ? "#d9786a" : "#ffd966").setText(`${__dialogueText("scenes/ShopScene.js", "t_09fc96082d34c2dfc129")}${row.cfg.price}`);
    }
    // kropki prowadzące między nazwą a ceną
    const d = row.dots; d.clear();
    const left = row.label.x + row.label.width + 8, right = row.price.x - row.price.width - 8;
    if (right - left > 14) {
      d.fillStyle(0xf2ecd8, 0.3);
      for (let dx = left; dx < right; dx += 6) d.fillRect(dx, row.rowY + 24, 2, 2);
    }
  },
  updateStockRows() { this.stockRows.forEach(row => this.applyRowState(row)); },
  createHotspot(cfg, index) {
    const zone = this.add.zone(cfg.x, cfg.y, cfg.w, cfg.h).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });
    const highlight = this.add.graphics().setDepth(11).setVisible(false);
    const label = LOCAL_DEBUG_ALLOWED ? this.add.text(0, 0, cfg.label, this.style(16)).setOrigin(0.5, 1).setDepth(20).setVisible(false) : null;
    const hs = { cfg, zone, highlight, label, index, hovered: false, stamp: null };
    zone.on('pointerover', () => {
      if (this.debugMode || this.hudPanelOpen || this.exiting) return;
      hs.hovered = true; this.drawHotspot(hs); this.setBoardRowHover(cfg, true);
      this.showTooltip(cfg, cfg.x, cfg.y - cfg.h / 2 - 8, 1, cfg.y + cfg.h / 2 + 8);
    });
    zone.on('pointerout', () => {
      hs.hovered = false; this.setBoardRowHover(cfg, false);
      if (!this.debugMode) { this.drawHotspot(hs); this.hideTooltip(); }
    });
    zone.on('pointerdown', () => {
      if (this.hudPanelOpen || this.exiting) return;
      if (this.debugMode && LOCAL_DEBUG_ALLOWED) { this.selectedIndex = index; this.updateDebug(); } else this.buyItem(cfg);
    });
    if (LOCAL_DEBUG_ALLOWED) zone.on('drag', (pointer, x, y) => {
      if (!this.debugMode || this.hudPanelOpen || this.exiting) return;
      cfg.x = Math.round(x); cfg.y = Math.round(y); this.selectedIndex = index; this.syncHotspot(hs); this.updateDebug();
    });
    this.syncHotspot(hs); return hs;
  },
  syncHotspot(hs) {
    const { cfg, zone, label, stamp } = hs;
    zone.setPosition(cfg.x, cfg.y); zone.setSize(cfg.w, cfg.h); zone.input.hitArea.setTo(0, 0, cfg.w, cfg.h);
    label?.setPosition(cfg.x, cfg.y - cfg.h / 2 - 8);
    stamp?.setPosition(cfg.x, cfg.y + cfg.h / 2 - 16);
    this.drawHotspot(hs);
  },
  drawHotspot(hs, time = this.time?.now ?? 0) {
    const { cfg, highlight, label, index } = hs, debugging = LOCAL_DEBUG_ALLOWED && this.debugMode;
    const hovering = Boolean(hs.hovered && !debugging && !this.hudPanelOpen && !this.exiting);
    highlight.clear();
    if (debugging) {
      highlight.fillStyle(0x00ff88, 0.2); highlight.fillRect(cfg.x - cfg.w / 2, cfg.y - cfg.h / 2, cfg.w, cfg.h);
      highlight.lineStyle(2, index === this.selectedIndex ? 0xff44ff : 0x00ff88, 1);
      highlight.strokeRect(cfg.x - cfg.w / 2, cfg.y - cfg.h / 2, cfg.w, cfg.h);
    } else if (hovering) {
      this.drawHoverFrame(highlight, cfg, time);
    }
    highlight.setVisible(debugging || hovering); label?.setVisible(debugging);
  },
  drawHoverFrame(g, cfg, time) {
    const pulse = 0.5 + 0.5 * Math.sin(time / 170), pad = 5;
    const l = cfg.x - cfg.w / 2 - pad, t = cfg.y - cfg.h / 2 - pad, r = cfg.x + cfg.w / 2 + pad, b = cfg.y + cfg.h / 2 + pad;
    const len = Math.min(24, (r - l) / 3, (b - t) / 3);
    g.fillStyle(COLOR.gold, 0.05 + 0.06 * pulse); g.fillRoundedRect(l, t, r - l, b - t, 6);
    g.lineStyle(3, COLOR.goldLight, 0.65 + 0.35 * pulse);
    g.lineBetween(l, t, l + len, t); g.lineBetween(l, t, l, t + len);
    g.lineBetween(r, t, r - len, t); g.lineBetween(r, t, r, t + len);
    g.lineBetween(l, b, l + len, b); g.lineBetween(l, b, l, b - len);
    g.lineBetween(r, b, r - len, b); g.lineBetween(r, b, r, b - len);
  },
  updateHover(time) {
    if (this.debugMode || this.exiting || !this.hotspots?.length) return;
    for (const hs of this.hotspots) if (hs.hovered && hs.highlight?.active) this.drawHotspot(hs, time);
  },
  clearHotspotHighlights() {
    this.hotspots.forEach(hs => { hs.hovered = false; this.drawHotspot(hs); });
    this.stockRows.forEach(row => this.setRowHover(row, false));
  },
  refreshOwnedStamps() {
    for (const hs of this.hotspots) {
      const owned = this.getBuyState(hs.cfg).code === 'owned';
      if (owned && !hs.stamp) hs.stamp = this.createStamp(hs);
      else if (!owned && hs.stamp) { hs.stamp.destroy(); hs.stamp = null; }
    }
  },
  createStamp(hs) {
    const { cfg } = hs;
    const c = this.add.container(cfg.x, cfg.y + cfg.h / 2 - 16).setDepth(12).setAngle(-9).setAlpha(0.9);
    const t = this.add.text(0, 1, "SOLD", { fontFamily: FONT.pixel, fontSize: '11px', color: '#ff5a4d' }).setOrigin(0.5);
    const r = this.add.rectangle(0, 0, t.width + 18, t.height + 14, COLOR.leather, 0.65).setStrokeStyle(2, COLOR.red, 1);
    c.add([r, t]);
    return c;
  }
};
