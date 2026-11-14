import {
  getOfficeShopAvailability, buyOfficeItem, ownsOfficeItem,
  getEmployeeIncome, collectEmployeeIncome, getOfficeArchive
} from '../../managers/PIOfficeShopManager.js';
import { moneyManager, MONEY_SOURCE } from '../../managers/MoneyManager.js';
import { inventoryManager } from '../../managers/InventoryManager.js';
import {
  PIGEON_FEED_PRICE, PIGEON_FEED_ID,
  getPigeonFeedAvailability, buyPigeonFeed
} from '../../managers/PigeonFeedShopManager.js';
import { ComputerDocumentJobs } from './ComputerDocumentJobs.js';

const APPS = ['office-shop', 'office-archive', 'office-documents'];

/* ------------------------------------------------------------------ */
/* Look & feel                                                         */
/* ------------------------------------------------------------------ */

const INK = {
  navy: '#263a47', green: '#315539', darkGreen: '#26402e', brown: '#713d32',
  olive: '#474b42', muted: '#55584b', faint: '#8a8878', cream: '#f4efd8',
  silver: '#c8c5b9', gold: '#d4af37', phosphor: '#7dff9b', lcd: '#3d8a58', dark: '#2b2a26'
};

const SHELF_CAPACITY = 5;      // product rows visible at once
const ROW_H = 68;
const ROW_GAP = 4;

const FOOTER_JOKES = [
  'Phone and computer are included. Pigeons sold separately. Figuratively.',
  'Agency funds are not accepted. The agency has none.',
  'All sales are final. All sales are also questionable.',
  'Receipts are printed in invisible ink. For your protection.',
  'Management is not responsible for lost pigeons, lost cases or lost dignity.'
];

/* 16x16 pixel-art sprites. '.' = transparent. */
const PALETTE = {
  k: 0x1b2530, w: 0xf4efd8, g: 0xd4af37, G: 0x8a6d1a, b: 0x294b70, B: 0x4a79b0,
  r: 0xa23232, s: 0xe8b88a, y: 0xffd166, n: 0x8d8b80, N: 0xc8c5b9, p: 0x6b4a2b,
  T: 0xc9a66b, e: 0x4f8a5a
};

const SPRITES = {
  assistant: [
    '................',
    '.....kkkkkk.....',
    '....kppppppk....',
    '...kppppppppk...',
    '..kpsssssssspk..',
    '..kpsksskskspk..',
    '..kpsssssssspk..',
    '...ksssrrsssk...',
    '....kssssssk....',
    '....kkbbbbkk....',
    '...kbbbwwbbbk...',
    '..kbbbbwrbbbbk..',
    '..kbbbbbrbbbbk..',
    '..kbbbbbrbbbbk..',
    '..kkkkkkkkkkkk..',
    '................'
  ],
  files: [
    '....wwwwww......',
    '...kkkkkkkkkk...',
    '...knnnnnnnnk...',
    '...knNNNNNNnk...',
    '...knnnggnnnk...',
    '...kkkkkkkkkk...',
    '...knnnnnnnnk...',
    '...knNNNNNNnk...',
    '...knnnggnnnk...',
    '...kkkkkkkkkk...',
    '...knnnnnnnnk...',
    '...knNNNNNNnk...',
    '...knnnggnnnk...',
    '...kkkkkkkkkk...',
    '...kk......kk...',
    '................'
  ],
  printer: [
    '....kwwwwwwk....',
    '....kwwwwwwk....',
    '....kwkkkkwk....',
    '..kkkkkkkkkkkk..',
    '.kNNNNNNNNNNNNk.',
    '.kNNNNNNNNNNNNk.',
    '.kNNNNNNNNNyeNk.',
    '.kkkkkkkkkkkkkk.',
    '.knnnnnnnnnnnnk.',
    '.knkkkkkkkkkknk.',
    '.knnnnnnnnnnnnk.',
    '.kkkkkkkkkkkkkk.',
    '...kwwwwwwwwk...',
    '...kwkkwkkwwk...',
    '...kwwwwwwwwk...',
    '................'
  ],
  investigator: [
    '................',
    '.....kkkkkk.....',
    '....kppppppk....',
    '....kggggggk....',
    '..kkkppppppkkk..',
    '..kppppppppppk..',
    '....kssssssk....',
    '....kskssksk....',
    '....kssrrssk....',
    '..kTTTwwwwTTTk..',
    '.kTTTTTwwTTTTTk.',
    '.kTTTTTTrTTTTTk.',
    '.kTTTTTTTTTTTTk.',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................'
  ],
  feed: [
    '................',
    '......kkkk......',
    '.....kTTTTk.....',
    '......kTTk......',
    '.....kkkkkk.....',
    '...kTTTTTTTTk...',
    '..kTTTTTTTTTTk..',
    '..kTTwwwwwwTTk..',
    '..kTTwkkkkwTTk..',
    '..kTTwwwwwwTTk..',
    '..kTTTTTTTTTTk..',
    '..kTTTTTTTTTTk..',
    '...kTTTTTTTTk...',
    '....kkkkkkkk....',
    '..y..y.y..y.y...',
    '................'
  ]
};

const ICON_BY_ID = {
  office_assistant: 'assistant',
  office_case_files: 'files',
  office_printer: 'printer',
  office_employee: 'investigator',
  [PIGEON_FEED_ID]: 'feed'
};

const CATEGORY_LABELS = { staff: 'STAFF', equipment: 'EQUIPMENT' };

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class ComputerOfficeShop {
  constructor(ui) {
    Object.assign(this, { ui, catalog: null, error: '', loading: null,
      pendingId: null, page: 0, archivePage: 0, query: '',
      feedItem: null, feedError: '', feedLoading: null,
      shelfStart: 0, noticeOk: true });
    this.documentJobs = new ComputerDocumentJobs(this);
  }

  /* ---------------------------------------------------------------- */
  /* Data                                                              */
  /* ---------------------------------------------------------------- */

  async load() {
    if (this.catalog) return;
    if (this.loading) return this.loading;
    this.error = '';
    this.loading = (async () => {
      try {
        const response = await fetch('assets/data/piOfficeShop.json');
        if (!response.ok) throw Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data || !Array.isArray(data.items) || !data.items.length) throw Error('Invalid catalog.');
        const ids = data.items.map(item => item?.id);
        if (ids.some(id => typeof id !== 'string') || new Set(ids).size !== ids.length) throw Error('Duplicate or invalid products.');
        this.catalog = data;
      } catch (error) {
        this.error = 'The catalog could not be loaded. No money has been charged.';
        console.error('[ComputerOfficeShop]', error);
      } finally { this.loading = null; this.redraw(); }
    })();
    return this.loading;
  }

  async loadFeed() {
    if (this.feedItem) return;
    if (this.feedLoading) return this.feedLoading;
    this.feedError = '';
    this.feedLoading = (async () => {
      try {
        const response = await fetch('assets/data/ItemsCatalog.json');
        if (!response.ok) throw Error(`HTTP ${response.status}`);
        const data = await response.json();
        const item = data?.misc?.pigeonFeed;
        if (item?.id !== PIGEON_FEED_ID || !item.stackable ||
            item.metadata?.pigeonFeed !== true || !item.name ||
            item.metadata?.consumable === true || item.metadata?.effect) {
          throw Error('Invalid pigeon feed data.');
        }
        this.feedItem = item;
      } catch (error) {
        this.feedError = 'Pigeon feed could not be loaded. No money has been charged.';
        console.error('[ComputerOfficeShop] Pigeon feed:', error);
      } finally { this.feedLoading = null; this.redraw(); }
    })();
    return this.feedLoading;
  }

  products() {
    const items = this.catalog?.items || [];
    return [...items, {
      id: PIGEON_FEED_ID,
      name: this.feedItem?.name || 'Pigeon Feed',
      category: 'supplies',
      price: PIGEON_FEED_PRICE,
      description: this.feedItem?.description || 'Premium pigeon feed. Payment in advance. Findings not guaranteed.',
      benefitText: 'One portion for one pigeon flight. Added to your inventory. Repeat purchases allowed.'
    }];
  }

  redraw() {
    const ui = this.ui;
    if (!ui.destroyed && ui.isOpen && !ui.suspended && APPS.includes(ui.app)) ui.render();
  }

  open(app) {
    const ui = this.ui;
    ui.menuOpen = false;
    ui.photoQuest.galleryViewer.active = false;
    ui.photoQuest.contactMail.composing = false;
    Object.assign(ui, { app, selectedId: null, listPage: 0, bodyPage: 0, notice: '' });
    this.pendingId = null;
    this.noticeOk = true;
    ui.viewToken++;
    ui.render();
    if (app === 'office-shop') { void this.load(); void this.loadFeed(); }
    if (app === 'office-documents') void this.documentJobs.load();
  }

  /* ---------------------------------------------------------------- */
  /* Small drawing helpers                                             */
  /* ---------------------------------------------------------------- */

  gfx() {
    return this.ui.drawing.add(this.ui.scene.add.graphics());
  }

  sprite(name, x, y, pixel) {
    const rows = SPRITES[name];
    if (!rows) return false;
    const g = this.gfx();
    rows.forEach((raw, ry) => {
      const row = String(raw).padEnd(16, '.').slice(0, 16);
      let rx = 0;
      while (rx < 16) {
        const ch = row[rx], color = PALETTE[ch];
        if (color === undefined) { rx++; continue; }
        let end = rx + 1;
        while (end < 16 && row[end] === ch) end++;
        g.fillStyle(color, 1);
        g.fillRect(x + rx * pixel, y + ry * pixel, (end - rx) * pixel, pixel);
        rx = end;
      }
    });
    return true;
  }

  // Shrinks a text object until it fits into maxHeight (or reaches minSize).
  fitHeight(text, maxHeight, minSize = 11) {
    let size = parseInt(text.style?.fontSize, 10) || 15;
    while (text.height > maxHeight && size > minSize) { size--; text.setFontSize(size); }
    return text;
  }

  balance() {
    const value = moneyManager.getBalance(MONEY_SOURCE.CASH);
    return Number.isFinite(value) ? value : null;
  }

  /* ---------------------------------------------------------------- */
  /* Window frame (also used by ComputerDocumentJobs - keep geometry)  */
  /* ---------------------------------------------------------------- */

  frame(title) {
    const ui = this.ui, d = ui.drawing, { x, y, w, h } = ui.layout;
    const box = { x: x + 12, y: y + 10, w: w - 24, h: h - 58 };
    ui.window = box;
    d.rectangle(box.x + 6, box.y + 6, box.w, box.h, 0x050a10, 0.45);
    d.bevel(box.x, box.y, box.w, box.h, 0xc8c5b9);
    d.rectangle(box.x + 4, box.y + 4, box.w - 8, 38, 0x294b70);
    d.rectangle(box.x + 4, box.y + 4, box.w - 8, 14, 0x4a79b0, 0.55);
    d.rectangle(box.x + 4, box.y + 40, box.w - 8, 2, 0x16304d);
    d.rectangle(box.x + 14, box.y + 16, 14, 14, 0xd4af37);
    d.frame(box.x + 14, box.y + 16, 14, 14, 0x0e1822, 1, 2);
    d.pixel(box.x + 38, box.y + 17, title, 11, INK.cream);
    d.button(box.x + box.w - 66, box.y + 5, 'X', () => ui.openApp('desktop'));
    return box;
  }

  /* ---------------------------------------------------------------- */
  /* Shop                                                              */
  /* ---------------------------------------------------------------- */

  render() {
    if (this.ui.app === 'office-archive') return this.renderArchive();
    if (this.ui.app === 'office-documents') return this.documentJobs.render();

    const ui = this.ui, d = ui.drawing;
    const box = this.frame('OFFICE SHOP');
    const left = box.x + 14, width = box.w - 28, top = box.y + 50;

    this.drawBanner(left, top, width);
    const bodyY = top + 98;

    if (!this.catalog) {
      d.bevel(left, bodyY, width, 200, 0xe9e6d7, true);
      d.text(left + 24, bodyY + 30, this.error ? 'Closed for restocking.' : 'Unpacking the shelves...', 24, INK.navy);
      d.text(left + 24, bodyY + 74, this.error || 'Loading catalog...', 18, INK.brown, width - 48);
      if (this.error) d.button(left + 24, bodyY + 130, 'RETRY', () => { void this.load(); });
      this.drawFooter(box);
      return;
    }

    const items = this.products();
    this.page = clamp(this.page, 0, items.length - 1);
    const item = items[this.page];

    // Left column: shelf + upgrades panel. Right column: product sheet.
    const leftW = 420, gap = 14;
    this.drawShelf(items, left, bodyY, leftW);
    this.drawUpgradePanel(left, bodyY + 362, leftW, 68);
    this.drawDetail(item, left + leftW + gap, bodyY, width - leftW - gap, 430);

    this.drawFooter(box);
  }

  drawFooter(box) {
    const d = this.ui.drawing;
    d.bevel(box.x + 8, box.y + box.h - 35, box.w - 16, 26, 0xc3c2b7, true);
    d.text(box.x + 16, box.y + box.h - 30, FOOTER_JOKES[this.page % FOOTER_JOKES.length], 13, '#3a3428', box.w - 32);
  }

  drawBanner(x, y, w) {
    const ui = this.ui, d = ui.drawing;

    d.rectangle(x, y + 14, w, 74, 0x1b2530);
    d.frame(x, y + 14, w, 74, 0xd4af37, 1, 2);

    // Striped awning with scalloped edge.
    const awning = this.gfx(), stripes = 26, stripeW = w / stripes;
    for (let index = 0; index < stripes; index++) {
      const left = x + index * stripeW;
      awning.fillStyle(index % 2 ? 0xd4af37 : 0x294b70, 1);
      awning.fillRect(left, y, stripeW + 0.5, 14);
      awning.fillEllipse(left + stripeW / 2, y + 14, stripeW, 16);
    }
    awning.fillStyle(0x000000, 0.18);
    awning.fillRect(x, y, w, 3);

    // Little owl mascot.
    const owl = this.gfx(), cx = x + 50, cy = y + 58;
    owl.fillStyle(0xd4af37, 1);
    owl.fillTriangle(cx - 27, cy - 6, cx - 22, cy - 28, cx - 8, cy - 14);
    owl.fillTriangle(cx + 27, cy - 6, cx + 22, cy - 28, cx + 8, cy - 14);
    owl.fillCircle(cx - 12, cy, 15);
    owl.fillCircle(cx + 12, cy, 15);
    owl.fillStyle(0xf4efd8, 1);
    owl.fillCircle(cx - 12, cy, 10);
    owl.fillCircle(cx + 12, cy, 10);
    owl.fillStyle(0x1b2530, 1);
    owl.fillCircle(cx - 11, cy + 1, 5);
    owl.fillCircle(cx + 11, cy + 1, 5);
    owl.fillStyle(0xe08a2e, 1);
    owl.fillTriangle(cx - 5, cy + 6, cx + 5, cy + 6, cx, cy + 18);

    const title = String(this.catalog?.title || 'Office Shop').toUpperCase().slice(0, 46);
    const intro = this.catalog?.intro || 'Unpacking the shelves...';
    d.pixel(x + 92, y + 30, title, 13, INK.gold);
    this.fitHeight(d.text(x + 92, y + 52, intro, 14, INK.silver, w - 92 - 230), 34, 11);

    // Wallet (LCD).
    const wx = x + w - 214, wy = y + 28;
    d.bevel(wx, wy, 198, 50, 0x0f130f, true);
    d.pixel(wx + 12, wy + 9, 'PERSONAL CASH', 8, INK.lcd);
    const cash = this.balance();
    d.fit(d.pixel(wx + 12, wy + 27, cash === null ? 'N/A' : ui.money(cash), 14, INK.phosphor), cash === null ? 'N/A' : ui.money(cash), 174);
  }

  drawShelf(items, x, y, w) {
    const ui = this.ui, d = ui.drawing;
    const visible = Math.min(items.length, SHELF_CAPACITY);

    if (this.page < this.shelfStart) this.shelfStart = this.page;
    if (this.page >= this.shelfStart + visible) this.shelfStart = this.page - visible + 1;
    this.shelfStart = clamp(this.shelfStart, 0, Math.max(0, items.length - visible));

    for (let slot = 0; slot < visible; slot++) {
      const index = this.shelfStart + slot;
      this.drawRow(items[index], index, x, y + slot * (ROW_H + ROW_GAP), w, ROW_H, index === this.page);
    }
  }

  drawRow(item, index, x, y, w, h, selected) {
    const ui = this.ui, d = ui.drawing;
    const isFeed = item.id === PIGEON_FEED_ID;
    const owned = !isFeed && ownsOfficeItem(item.id);
    const cash = this.balance();
    const pricey = !owned && cash !== null && cash < item.price;

    d.bevel(x, y, w, h, selected ? 0xf3e6b0 : 0xe9e6d7, selected);
    if (selected) d.rectangle(x, y, 5, h, 0xd4af37);

    // Icon tile
    const tile = h - 16;
    d.rectangle(x + 10, y + 8, tile, tile, 0x1b2530);
    this.sprite(ICON_BY_ID[item.id], x + 10 + Math.floor((tile - 48) / 2), y + 8 + Math.floor((tile - 48) / 2), 3);
    d.frame(x + 10, y + 8, tile, tile, 0xd4af37, selected ? 1 : 0.55, 2);

    const textX = x + 10 + tile + 12;
    const nameText = d.text(textX, y + 10, '', 18, INK.navy);
    d.fit(nameText, item.name, w - (textX - x) - 104);
    d.pixel(textX, y + 42, CATEGORY_LABELS[item.category] || String(item.category || 'GOODS').toUpperCase(), 7, INK.muted);

    d.pixel(x + w - 12, y + 14, ui.money(item.price), 10, INK.green).setOrigin(1, 0);

    let status = '', statusColor = INK.muted;
    if (owned) { status = 'OWNED'; statusColor = INK.green; }
    else if (isFeed) {
      const count = inventoryManager.getItem(PIGEON_FEED_ID)?.quantity || 0;
      if (count > 0) status = `IN BAG: ${count}`;
      else if (pricey) { status = 'TOO PRICEY'; statusColor = INK.brown; }
    } else if (pricey) { status = 'TOO PRICEY'; statusColor = INK.brown; }
    if (status) d.pixel(x + w - 12, y + 42, status, 7, statusColor).setOrigin(1, 0);

    // Hover + click layer
    const hit = d.rectangle(x, y, w, h, 0xffffff, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => hit.setFillStyle(0xffffff, 0.14))
      .on('pointerout', () => hit.setFillStyle(0xffffff, 0))
      .on('pointerdown', () => {
        ui.options.onSfx?.('click');
        if (index !== this.page) this.select(index);
      });
  }

  drawUpgradePanel(x, y, w, h) {
    const ui = this.ui, d = ui.drawing;
    d.bevel(x, y, w, h, 0xd9d6c8, true);

    const income = getEmployeeIncome();
    if (income.hired) {
      d.pixel(x + 12, y + 9, 'JUNIOR INVESTIGATOR PAYROLL', 8, INK.navy);
      const ratio = income.cap > 0 ? clamp(income.available / income.cap, 0, 1) : 0;
      d.rectangle(x + 12, y + 28, 150, 14, 0x1b2530);
      if (ratio > 0) d.rectangle(x + 14, y + 30, Math.max(2, Math.round(146 * ratio)), 10, 0x7dff9b);
      d.text(x + 172, y + 24, `${ui.money(income.available)} / ${ui.money(income.cap)}`, 15, INK.green);
      d.button(x + w - 112, y + 18, 'COLLECT', () => {
        const result = collectEmployeeIncome();
        this.noticeOk = result?.ok !== false;
        ui.notice = result?.message || '';
        ui.render();
      }, income.available > 0);
      d.text(x + 12, y + 47, `$${income.amountPerDay} per 24 in-game hours. No real-world offline pay.`, 12, INK.muted, w - 24);
      return;
    }

    const catalogItems = this.catalog?.items || [];
    const total = Math.max(1, catalogItems.length);
    const owned = catalogItems.filter(entry => ownsOfficeItem(entry.id)).length;
    const percent = Math.round((owned / total) * 100);

    d.pixel(x + 12, y + 9, 'OFFICE LEGITIMACY', 8, INK.navy);
    const barW = 240, segW = (barW - 4) / total;
    d.rectangle(x + 12, y + 28, barW, 14, 0x1b2530);
    for (let index = 0; index < owned; index++) {
      d.rectangle(x + 14 + index * segW, y + 30, Math.max(2, segW - 2), 10, 0xd4af37);
    }
    d.text(x + 264, y + 24, `${percent}%`, 16, INK.green);
    const caption = owned === 0 ? 'Currently: one desk and good intentions.'
      : owned >= total ? 'Fully legitimate. Suspiciously so.'
        : 'Rising. Slightly. Clients may notice.';
    d.text(x + 12, y + 46, caption, 13, INK.muted, w - 24);
  }

  drawDetail(item, x, y, w, h) {
    const ui = this.ui, d = ui.drawing;
    const isFeed = item.id === PIGEON_FEED_ID;
    const owned = !isFeed && ownsOfficeItem(item.id);
    const availability = isFeed
      ? getPigeonFeedAvailability(this.feedItem)
      : getOfficeShopAvailability(item);
    const cash = this.balance();
    const pending = this.pendingId === item.id && availability.enabled;

    d.bevel(x, y, w, h, 0xe9e6d7, true);

    // --- Display pedestal -------------------------------------------
    const pedX = x + 16, pedY = y + 14, ped = 120;
    d.rectangle(pedX, pedY, ped, ped, 0x1b2530);
    const glow = this.gfx();
    glow.fillStyle(0x4a79b0, 0.28); glow.fillCircle(pedX + 60, pedY + 58, 54);
    glow.fillStyle(0x4a79b0, 0.22); glow.fillCircle(pedX + 60, pedY + 58, 40);
    d.rectangle(pedX, pedY + ped - 16, ped, 16, 0x0e1822);
    if (!this.sprite(ICON_BY_ID[item.id], pedX + 12, pedY + 10, 6)) {
      d.pixel(pedX + 44, pedY + 44, '?', 32, INK.gold);
    }
    d.frame(pedX, pedY, ped, ped, 0xd4af37, 1, 3);
    if (owned) d.stamp(pedX + ped + 6, pedY + ped - 34, 'OWNED', 0x2f6b3f, -8, 11);

    // --- Title block ---------------------------------------------------
    const colX = pedX + ped + 18, colW = w - (colX - x) - 16;
    const category = CATEGORY_LABELS[item.category] || String(item.category || 'GOODS').toUpperCase();
    const chipLabel = isFeed ? `${category} - REPEATABLE` : category;
    d.bevel(colX, y + 14, chipLabel.length * 8 + 18, 22, 0xd0cec6);
    d.pixel(colX + 9, y + 21, chipLabel, 8, INK.navy);

    d.fit(d.text(colX, y + 44, '', 24, INK.navy), item.name, colW);

    // Price tag
    const priceLabel = ui.money(item.price);
    const tagX = colX, tagY = y + 82, tagW = 28 + priceLabel.length * 14 + 12;
    const tag = this.gfx();
    const points = [
      { x: tagX, y: tagY + 14 }, { x: tagX + 14, y: tagY },
      { x: tagX + tagW, y: tagY }, { x: tagX + tagW, y: tagY + 28 },
      { x: tagX + 14, y: tagY + 28 }
    ];
    tag.fillStyle(0xd4af37, 1); tag.fillPoints(points, true);
    tag.lineStyle(2, 0x8a6d1a, 1); tag.strokePoints(points, true);
    tag.fillStyle(0x1b2530, 1); tag.fillCircle(tagX + 14, tagY + 14, 3);
    d.pixel(tagX + 28, tagY + 7, priceLabel, 14, INK.dark);

    // Affordability line
    let hint = '', hintColor = INK.muted;
    if (owned) { hint = 'Installed. Nobody has complained. Yet.'; hintColor = INK.green; }
    else if (cash !== null && cash < item.price) { hint = `Short by ${ui.money(item.price - cash)}.`; hintColor = INK.brown; }
    else if (cash !== null) { hint = `Cash after purchase: ${ui.money(cash - item.price)}`; }
    if (hint) d.text(colX, y + 114, hint, 14, hintColor, colW);

    // --- Description ---------------------------------------------------
    this.fitHeight(d.text(x + 16, y + 146, item.description || '', 17, INK.olive, w - 32), 84, 12);

    // --- Benefit box ---------------------------------------------------
    const boxY = y + 238, boxH = 88;
    d.rectangle(x + 16, boxY, w - 32, boxH, 0xdfe8d2);
    d.frame(x + 16, boxY, w - 32, boxH, 0x315539, 1, 2);
    d.pixel(x + 28, boxY + 10, 'WHAT YOU GET', 8, INK.green);
    const count = inventoryManager.getItem(PIGEON_FEED_ID)?.quantity || 0;
    const benefit = isFeed ? `${item.benefitText || ''} In inventory: ${count}.` : (item.benefitText || '');
    this.fitHeight(d.text(x + 28, boxY + 28, benefit, 15, INK.darkGreen, w - 56), boxH - 34, 11);

    // --- Action row ----------------------------------------------------
    const actionY = y + 338, buttonX = x + 16;
    if (pending) {
      const confirm = d.button(buttonX, actionY, 'CONFIRM', () => {
        const result = isFeed ? buyPigeonFeed(this.feedItem) : buyOfficeItem(this.catalog, item.id);
        this.pendingId = null;
        this.noticeOk = result?.ok !== false;
        ui.notice = result?.message || '';
        ui.render();
      });
      d.button(buttonX + confirm.width + 10, actionY, 'CANCEL', () => { this.pendingId = null; ui.render(); });
    } else {
      const buy = d.button(buttonX, actionY, owned ? 'OWNED' : 'BUY', () => {
        this.pendingId = item.id; ui.notice = ''; ui.render();
      }, availability.enabled);
      let nextX = buttonX + buy.width + 10;
      if (isFeed && this.feedError) {
        const retry = d.button(nextX, actionY, 'RETRY', () => { void this.loadFeed(); });
        nextX += retry.width + 10;
      }
      if (owned && item.id === 'office_case_files') d.button(nextX, actionY, 'OPEN ARCHIVE', () => ui.openApp('office-archive'));
      if (owned && item.id === 'office_printer') d.button(nextX, actionY, 'DOCUMENT JOBS', () => ui.openApp('office-documents'));
    }

    // Pager (right aligned)
    const total = this.products().length, right = x + w - 16;
    d.button(right - 35, actionY, '>', () => this.changePage(1), this.page < total - 1);
    d.text(right - 87, actionY + 8, `${this.page + 1} / ${total}`, 15, INK.navy);
    d.button(right - 130, actionY, '<', () => this.changePage(-1), this.page > 0);

    // --- Receipt strip -------------------------------------------------
    const receiptY = y + 380, receiptH = 48;
    d.rectangle(x + 16, receiptY, w - 32, receiptH, 0xf7efda);
    d.frame(x + 16, receiptY, w - 32, receiptH, 0xb8a878, 1, 1);
    d.rectangle(x + 16, receiptY, 5, receiptH, 0xd4af37);

    let message = '', color = INK.brown;
    if (pending) {
      message = `Confirm purchase for ${ui.money(item.price)}? Payment is due in advance.`;
    } else if (ui.notice) {
      message = ui.notice; color = this.noticeOk ? INK.green : INK.brown;
    } else if (!owned && !availability.enabled) {
      message = isFeed && !this.feedItem
        ? this.feedError || 'Loading pigeon feed...'
        : availability.reason;
    } else {
      message = 'Receipt paper loaded. Dignity not included.'; color = INK.faint;
    }
    this.fitHeight(d.text(x + 32, receiptY + 6, message, 15, color, w - 64), receiptH - 10, 11);
  }

  select(index) {
    this.page = index;
    this.pendingId = null;
    this.ui.notice = '';
    this.noticeOk = true;
    this.ui.render();
  }

  changePage(direction) {
    this.page += direction;
    this.pendingId = null;
    this.ui.notice = '';
    this.noticeOk = true;
    this.ui.render();
  }

  /* ---------------------------------------------------------------- */
  /* Case filing system                                                */
  /* ---------------------------------------------------------------- */

  renderArchive() {
    const ui = this.ui, d = ui.drawing, box = this.frame('CASE FILING SYSTEM');
    const x = box.x + 22, y = box.y + 58;
    d.button(x, y, 'SHOP', () => ui.openApp('office-shop'));
    if (!ownsOfficeItem('office_case_files')) {
      d.text(x, y + 70, 'Purchase the Case Filing System to open this archive.', 18, INK.brown); return;
    }
    d.text(x + 150, y + 8, this.query ? `Search: ${this.query}` : 'All completed cases', 17, INK.navy, 355);
    d.button(x + 525, y, 'SEARCH', () => {
      const value = window.prompt('Search completed PI cases:', this.query);
      if (value === null) return;
      this.query = value.trim().slice(0, 200); this.archivePage = 0; ui.render();
    });
    d.button(x + 655, y, 'CLEAR', () => { this.query = ''; this.archivePage = 0; ui.render(); });

    const cases = getOfficeArchive(this.query);
    this.archivePage = Math.max(0, Math.min(this.archivePage, cases.length - 1));
    const entry = cases[this.archivePage];
    const panelY = y + 65, panelW = box.w - 44, panelH = 386;

    // Manila folder with a tab.
    d.rectangle(x + 16, panelY - 16, 170, 18, 0xd9c48a);
    d.pixel(x + 28, panelY - 11, `CASE ${cases.length ? this.archivePage + 1 : 0} / ${cases.length}`, 8, INK.dark);
    d.rectangle(x, panelY, panelW, panelH, 0xe6d3a0);
    d.frame(x, panelY, panelW, panelH, 0x8a7440, 1, 2);
    d.rectangle(x + 12, panelY + 12, panelW - 24, panelH - 24, 0xf7efda);
    d.frame(x + 12, panelY + 12, panelW - 24, panelH - 24, 0xb8a878, 1, 1);

    const innerX = x + 30, innerW = panelW - 60;
    if (!entry) {
      d.text(innerX, panelY + 30, 'No completed cases found.', 22, INK.navy, innerW);
    } else {
      d.fit(d.text(innerX, panelY + 26, '', 22, INK.navy), entry.title, innerW);
      d.rectangle(innerX, panelY + 58, innerW, 2, 0xd4af37);
      if (entry.contact) d.text(innerX, panelY + 68, `Contact: ${entry.contact}`, 15, INK.green, innerW);
      if (entry.description) {
        this.fitHeight(d.text(innerX, panelY + 92, entry.description, 16, INK.olive, innerW), 96, 11);
      }

      d.pixel(innerX, panelY + 200, 'OBJECTIVES', 9, INK.navy);
      const rowsTop = panelY + 224, rowH = 27;
      const capacity = Math.max(1, Math.floor((panelY + panelH - 30 - rowsTop) / rowH));
      const objectives = entry.objectives || [];
      const shown = objectives.length > capacity ? objectives.slice(0, capacity - 1) : objectives;
      shown.forEach((objective, row) => {
        const rowY = rowsTop + row * rowH;
        const done = objective.completed === true;
        d.rectangle(innerX, rowY + 2, 16, 16, 0xffffff);
        d.frame(innerX, rowY + 2, 16, 16, 0x1b2530, 1, 2);
        if (done) {
          const mark = this.gfx();
          mark.lineStyle(3, 0x315539, 1);
          mark.lineBetween(innerX + 3, rowY + 10, innerX + 7, rowY + 15);
          mark.lineBetween(innerX + 7, rowY + 15, innerX + 14, rowY + 4);
        }
        d.fit(d.text(innerX + 28, rowY, '', 16, done ? INK.green : INK.olive), objective.text || '', innerW - 28);
      });
      if (objectives.length > shown.length) {
        d.text(innerX + 28, rowsTop + shown.length * rowH, `+${objectives.length - shown.length} more objectives [Summary shortened]`, 14, INK.muted, innerW - 28);
      }
    }

    const bottom = panelY + 400;
    d.button(x, bottom, '<', () => { this.archivePage--; ui.render(); }, this.archivePage > 0);
    d.text(x + 65, bottom + 8, `${cases.length ? this.archivePage + 1 : 0} / ${cases.length}`, 17, INK.navy);
    d.button(x + 180, bottom, '>', () => { this.archivePage++; ui.render(); }, this.archivePage + 1 < cases.length);
  }
}

export function installOfficeShop(ui) {
  const shop = new ComputerOfficeShop(ui), openApp = ui.openApp.bind(ui);
  const renderDesktop = ui.desktop.render.bind(ui.desktop);
  const renderApplication = ui.monitor.renderApplication.bind(ui.monitor);
  ui.openApp = app => {
    if (!APPS.includes(app)) return openApp(app);
    if (ui.destroyed || !ui.isOpen || ui.suspended || ui.booting) return;
    shop.open(app);
  };
  ui.desktop.render = () => {
    renderDesktop();
    const { x, y } = ui.layout;
    ui.desktop.createIcon(x + 292, y + 10, 128, 'Office\nShop', 'ledger', 0xd4af37, () => ui.openApp('office-shop'));
  };
  ui.monitor.renderApplication = () => APPS.includes(ui.app) ? shop.render() : renderApplication();
  return shop;
}