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
export class ComputerOfficeShop {
  constructor(ui) {
    Object.assign(this, { ui, catalog: null, error: '', loading: null,
      pendingId: null, page: 0, archivePage: 0, query: '',
      feedItem: null, feedError: '', feedLoading: null });
    this.documentJobs = new ComputerDocumentJobs(this);
  }
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
    ui.viewToken++;
    ui.render();
    if (app === 'office-shop') { void this.load(); void this.loadFeed(); }
    if (app === 'office-documents') void this.documentJobs.load();
  }
  frame(title) {
    const ui = this.ui, d = ui.drawing, { x, y, w, h } = ui.layout;
    const box = { x: x + 12, y: y + 10, w: w - 24, h: h - 58 };
    ui.window = box;
    d.bevel(box.x, box.y, box.w, box.h, 0xc8c5b9);
    d.rectangle(box.x + 4, box.y + 4, box.w - 8, 38, 0x294b70);
    d.pixel(box.x + 16, box.y + 17, title, 11, '#ffffff');
    d.button(box.x + box.w - 66, box.y + 5, 'X', () => ui.openApp('desktop'));
    return box;
  }
  render() {
    if (this.ui.app === 'office-archive') return this.renderArchive();
    if (this.ui.app === 'office-documents') return this.documentJobs.render();
    const ui = this.ui, d = ui.drawing;
    const box = this.frame('OFFICE SHOP');
    const left = box.x + 22, top = box.y + 58;
    d.text(left, top, 'Office Supplies, Pigeon Feed & Questionable Hires', 22, '#263a47');
    d.text(left, top + 32,
      `Personal cash: ${ui.money(moneyManager.getBalance(MONEY_SOURCE.CASH))} | Agency funds are not accepted.`, 16, '#315539');
    if (!this.catalog) {
      d.text(left, top + 90, this.error || 'Loading catalog...', 18, '#713d32', box.w - 50);
      if (this.error) d.button(left, top + 155, 'RETRY', () => { void this.load(); });
      return;
    }
    const items = this.products();
    this.page = Math.max(0, Math.min(this.page, items.length - 1));
    const item = items[this.page], isFeed = item.id === PIGEON_FEED_ID;
    const owned = !isFeed && ownsOfficeItem(item.id);
    const availability = isFeed
      ? getPigeonFeedAvailability(this.feedItem)
      : getOfficeShopAvailability(item);
    const cardY = top + 82;
    d.bevel(left, cardY, box.w - 44, 254, 0xe9e6d7, true);
    d.text(left + 20, cardY + 18, item.name, 25, '#263a47');
    d.text(left + box.w - 65, cardY + 20, ui.money(item.price), 22, '#315539').setOrigin(1, 0);
    d.text(left + 20, cardY + 61, item.description, 18, '#474b42', box.w - 90);
    const count = inventoryManager.getItem(PIGEON_FEED_ID)?.quantity || 0;
    d.text(left + 20, cardY + 125,
      isFeed ? `${item.benefitText} In inventory: ${count}.` : item.benefitText,
      17, '#315539', box.w - 90);
    const purchaseY = cardY + 198;
    if (this.pendingId === item.id && availability.enabled) {
      d.text(left + 20, purchaseY - 21, `Confirm purchase for ${ui.money(item.price)}?`, 16, '#713d32');
      d.button(left + 20, purchaseY + 3, 'CONFIRM', () => {
        const result = isFeed ? buyPigeonFeed(this.feedItem) : buyOfficeItem(this.catalog, item.id);
        this.pendingId = null; ui.notice = result.message; ui.render();
      });
      d.button(left + 170, purchaseY + 3, 'CANCEL', () => { this.pendingId = null; ui.render(); });
    } else {
      d.button(left + 20, purchaseY, owned ? 'OWNED' : 'BUY', () => {
        this.pendingId = item.id; ui.notice = ''; ui.render();
      }, availability.enabled);
      if (!availability.enabled && !owned) {
        const reason = isFeed && !this.feedItem
          ? this.feedError || 'Loading pigeon feed...'
          : availability.reason;
        d.text(left + 160, purchaseY + 9, reason, 16, '#713d32', box.w - 220);
      }
      if (isFeed && this.feedError) d.button(left + 20, purchaseY - 40, 'RETRY', () => { void this.loadFeed(); });
      if (owned && item.id === 'office_case_files') d.button(left + 160, purchaseY, 'OPEN ARCHIVE', () => ui.openApp('office-archive'));
      if (owned && item.id === 'office_printer') d.button(left + 160, purchaseY, 'DOCUMENT JOBS', () => ui.openApp('office-documents'));
    }
    const navY = cardY + 267;
    d.button(left, navY, '<', () => this.changePage(-1), this.page > 0);
    d.text(left + 65, navY + 8, `${this.page + 1} / ${items.length}`, 17, '#263a47');
    d.button(left + 150, navY, '>', () => this.changePage(1), this.page < items.length - 1);
    const income = getEmployeeIncome();
    if (income.hired) {
      d.text(left + 265, navY + 8, `Employee: ${ui.money(income.available)} / ${ui.money(income.cap)}`, 16, '#315539');
      d.button(left + 650, navY, 'COLLECT', () => { ui.notice = collectEmployeeIncome().message; ui.render(); }, income.available > 0);
      d.text(left, navY + 49, `$${income.amountPerDay} per full 24 in-game hours. No real-world offline earnings.`, 15, '#55584b');
    }
    if (ui.notice) d.text(left, box.y + box.h - 106, ui.notice, 17, '#713d32', box.w - 44);
    d.text(left, box.y + box.h - 34, 'Phone and computer are included. Pigeons sold separately. Figuratively.', 14, '#55584b');
  }
  changePage(direction) { this.page += direction; this.pendingId = null; this.ui.notice = ''; this.ui.render(); }
  renderArchive() {
    const ui = this.ui, d = ui.drawing, box = this.frame('CASE FILING SYSTEM');
    const x = box.x + 22, y = box.y + 58;
    d.button(x, y, 'SHOP', () => ui.openApp('office-shop'));
    if (!ownsOfficeItem('office_case_files')) {
      d.text(x, y + 70, 'Purchase the Case Filing System to open this archive.', 18, '#713d32'); return;
    }
    d.text(x + 150, y + 8, this.query ? `Search: ${this.query}` : 'All completed cases', 17, '#263a47', 355);
    d.button(x + 525, y, 'SEARCH', () => {
      const value = window.prompt('Search completed PI cases:', this.query);
      if (value === null) return;
      this.query = value.trim().slice(0, 200); this.archivePage = 0; ui.render();
    });
    d.button(x + 655, y, 'CLEAR', () => { this.query = ''; this.archivePage = 0; ui.render(); });
    const cases = getOfficeArchive(this.query);
    this.archivePage = Math.max(0, Math.min(this.archivePage, cases.length - 1));
    const entry = cases[this.archivePage], panelY = y + 65;
    d.rectangle(x, panelY, box.w - 44, 386, 0xe9e6d7);
    d.text(x + 14, panelY + 13, entry?.title || 'No completed cases found.', 22, '#263a47', box.w - 80);
    if (entry) {
      const raw = [entry.contact ? `Contact: ${entry.contact}` : '', entry.description,
        ...entry.objectives.map(objective => `${objective.completed ? '[x]' : '[ ]'} ${objective.text}`)].filter(Boolean).join('\n\n');
      const text = d.text(x + 14, panelY + 58, raw, 17, '#474b42', box.w - 82);
      let length = raw.length;
      while (text.height > 305 && length > 0) {
        length -= 30; text.setText(raw.slice(0, Math.max(0, length)) + '\n[Summary shortened]');
      }
    }
    const bottom = panelY + 400;
    d.button(x, bottom, '<', () => { this.archivePage--; ui.render(); }, this.archivePage > 0);
    d.text(x + 65, bottom + 8, `${cases.length ? this.archivePage + 1 : 0} / ${cases.length}`, 17, '#263a47');
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
