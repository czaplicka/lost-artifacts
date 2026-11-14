import { piInventoryManager } from '../../managers/PIInventoryManager.js';
import {
  NEW_PI_OFFICE_ID, ownsOfficeItem, getOfficeShopAvailability, buyOfficeItem
} from '../../managers/PIOfficeShopManager.js';
import {
  PIGEON_FEED_ID, getPigeonFeedAvailability, buyPigeonFeed
} from '../../managers/PigeonFeedShopManager.js';
import { drawOfficeShopCatalogArt } from './OfficeShopCatalogArt.js';

const INK = {
  navy: '#263a47', green: '#315539', brown: '#713d32',
  muted: '#55584b', faint: '#8a8878', cream: '#f4efd8', gold: '#d4af37'
};
const CATEGORIES = {
  premises: 'PREMISES', equipment: 'EQUIPMENT', decor: 'DECOR',
  furniture: 'FURNITURE', supplies: 'SUPPLIES', staff: 'STAFF'
};

const methods = {
  drawRow(item, index, x, y, w, h, selected) {
    const ui = this.ui, d = ui.drawing;
    const feed = item.id === PIGEON_FEED_ID;
    const owned = !feed && ownsOfficeItem(item.id);
    const availability = feed ? getPigeonFeedAvailability(this.feedItem) : getOfficeShopAvailability(item);
    d.bevel(x, y, w, h, selected ? 0xf3e6b0 : 0xe9e6d7, selected);
    if (selected) d.rectangle(x, y, 5, h, 0xd4af37);

    const tile = { x: x + 10, y: y + 8, w: h - 16, h: h - 16 };
    d.rectangle(tile.x, tile.y, tile.w, tile.h, 0x1b2530);
    drawOfficeShopCatalogArt(this, item, tile, { feed });
    d.frame(tile.x, tile.y, tile.w, tile.h, 0xd4af37, selected ? 1 : 0.55, 2);
    const textX = tile.x + tile.w + 12;
    d.fit(d.text(textX, y + 9, '', 18, INK.navy), item.name, Math.max(30, w - (textX - x) - 112));
    d.pixel(textX, y + 42, CATEGORIES[item.category] || 'GOODS', 7, INK.muted);
    d.pixel(x + w - 12, y + 12, ui.money(item.price), 10, INK.green).setOrigin(1, 0);

    let status = '', color = INK.muted;
    if (owned) { status = 'OWNED'; color = INK.green; }
    else if (feed) {
      const count = piInventoryManager.getItem(PIGEON_FEED_ID)?.quantity || 0;
      status = count ? 'IN BAG: ' + count : '';
    } else if (!availability.enabled) { status = 'LOCKED'; color = INK.brown; }
    if (status) d.pixel(x + w - 12, y + 42, status, 7, color).setOrigin(1, 0);

    const hit = d.rectangle(x, y, w, h, 0xffffff, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => hit.setFillStyle(0xffffff, 0.12));
    hit.on('pointerout', () => hit.setFillStyle(0xffffff, 0));
    hit.on('pointerdown', () => {
      ui.options.onSfx?.('click');
      if (index !== this.page) this.select(index);
    });
  },

  drawDetail(item, x, y, w, h) {
    const ui = this.ui, scene = ui.scene, d = ui.drawing;
    const feed = item.id === PIGEON_FEED_ID;
    const owned = !feed && ownsOfficeItem(item.id);
    const availability = feed ? getPigeonFeedAvailability(this.feedItem) : getOfficeShopAvailability(item);
    const pending = this.pendingId === item.id && availability.enabled;
    d.bevel(x, y, w, h, 0xe9e6d7, true);

    const pedestal = { x: x + 16, y: y + 14, w: 120, h: 120 };
    d.rectangle(pedestal.x, pedestal.y, pedestal.w, pedestal.h, 0x1b2530);
    const glow = this.gfx();
    glow.fillStyle(0x4a79b0, 0.28).fillCircle(pedestal.x + 60, pedestal.y + 58, 54);
    glow.fillStyle(0x4a79b0, 0.22).fillCircle(pedestal.x + 60, pedestal.y + 58, 40);
    d.rectangle(pedestal.x, pedestal.y + 104, 120, 16, 0x0e1822);
    const previewBounds = drawOfficeShopCatalogArt(this, item, pedestal, { feed });
    d.frame(pedestal.x, pedestal.y, 120, 120, 0xd4af37, 1, 3);
    if (owned) d.stamp(pedestal.x + 126, pedestal.y + 86, 'OWNED', 0x2f6b3f, -8, 11);

    const colX = pedestal.x + 138, colW = Math.max(40, w - 170);
    const category = CATEGORIES[item.category] || 'GOODS';
    const chip = feed ? category + ' - REPEATABLE' : category;
    const chipW = Math.min(colW, chip.length * 8 + 18);
    d.bevel(colX, y + 14, chipW, 22, 0xd0cec6);
    d.fit(d.pixel(colX + 9, y + 21, chip, 8, INK.navy), chip, Math.max(10, chipW - 18));
    d.fit(d.text(colX, y + 44, '', 24, INK.navy), item.name, colW);

    const price = ui.money(item.price), tagW = Math.min(colW, 40 + price.length * 14);
    d.bevel(colX, y + 82, tagW, 28, 0xd4af37);
    d.fit(d.pixel(colX + 10, y + 89, price, 14, '#2b2a26'), price, Math.max(10, tagW - 20));
    const cash = this.balance();
    let hint = '', hintColor = INK.muted;
    if (owned) { hint = 'Installed. Nobody has complained. Yet.'; hintColor = INK.green; }
    else if (cash !== null && cash < item.price) { hint = 'Short by ' + ui.money(item.price - cash) + '.'; hintColor = INK.brown; }
    else if (cash !== null) hint = 'Cash after purchase: ' + ui.money(cash - item.price);
    if (hint) this.fitHeight(d.text(colX, y + 114, hint, 14, hintColor, colW), 25, 10);

    this.fitHeight(d.text(x + 16, y + 146, item.description || '', 17, '#474b42', w - 32), 84, 12);
    const benefitY = y + 238;
    d.rectangle(x + 16, benefitY, w - 32, 88, 0xdfe8d2);
    d.frame(x + 16, benefitY, w - 32, 88, 0x315539, 1, 2);
    d.pixel(x + 28, benefitY + 10, 'WHAT YOU GET', 8, INK.green);
    const count = feed ? piInventoryManager.getItem(PIGEON_FEED_ID)?.quantity || 0 : 0;
    const benefit = feed ? (item.benefitText || '') + ' In PI inventory: ' + count + '.' : item.benefitText || '';
    this.fitHeight(d.text(x + 28, benefitY + 28, benefit, 15, '#26402e', w - 56), 54, 11);

    const actionY = y + 338;
    if (pending) {
      const confirm = d.button(x + 16, actionY, 'CONFIRM', () => {
        const result = feed ? buyPigeonFeed(this.feedItem) : buyOfficeItem(this.catalog, item.id);
        this.pendingId = null;
        this.noticeOk = result?.ok === true;
        ui.notice = result?.message || '';
        ui.render();
        if (result?.ok && !feed) {
          scene.handleOfficePurchase?.(item.id, item.id === NEW_PI_OFFICE_ID ? previewBounds : null);
        }
      });
      d.button(x + 26 + confirm.width, actionY, 'CANCEL', () => { this.pendingId = null; ui.render(); });
    } else {
      const buy = d.button(x + 16, actionY, owned ? 'OWNED' : 'BUY', () => {
        this.pendingId = item.id; ui.notice = ''; ui.render();
      }, availability.enabled);
      const nextX = x + 26 + buy.width;
      if (owned && item.id === 'office_case_files') d.button(nextX, actionY, 'ARCHIVE', () => ui.openApp('office-archive'));
      if (owned && item.id === 'office_printer') d.button(nextX, actionY, 'JOBS', () => ui.openApp('office-documents'));
      if (feed && this.feedError) d.button(nextX, actionY, 'RETRY', () => void this.loadFeed());
    }

    const total = this.products().length;
    d.button(x + w - 94, actionY, '<', () => this.changePage(-1), this.page > 0);
    d.button(x + w - 48, actionY, '>', () => this.changePage(1), this.page < total - 1);

    let message = 'Receipt paper loaded. Dignity not included.', color = INK.faint;
    if (pending) { message = 'Confirm purchase for ' + ui.money(item.price) + '?'; color = INK.brown; }
    else if (ui.notice) { message = ui.notice; color = this.noticeOk ? INK.green : INK.brown; }
    else if (!owned && !availability.enabled) { message = availability.reason; color = INK.brown; }
    d.rectangle(x + 16, y + 380, w - 32, 48, 0xf7efda);
    d.frame(x + 16, y + 380, w - 32, 48, 0xb8a878, 1, 1);
    d.rectangle(x + 16, y + 380, 5, 48, 0xd4af37);
    this.fitHeight(d.text(x + 32, y + 386, message, 15, color, w - 64), 38, 10);
  }
};

export function bindPIInventoryOfficeShop(shop) {
  if (!shop || shop.piInventoryBound) return false;
  Object.assign(shop, methods, { piInventoryBound: true });
  shop.redraw();
  return true;
}
