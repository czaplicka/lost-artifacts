import {
  piInventoryManager
} from '../../managers/PIInventoryManager.js';

import {
  ownsOfficeItem,
  getOfficeShopAvailability,
  buyOfficeItem
} from '../../managers/PIOfficeShopManager.js';

import {
  PIGEON_FEED_ID,
  getPigeonFeedAvailability,
  buyPigeonFeed
} from '../../managers/PigeonFeedShopManager.js';

const INK = {
  navy: '#263a47',
  green: '#315539',
  darkGreen: '#26402e',
  brown: '#713d32',
  olive: '#474b42',
  muted: '#55584b',
  faint: '#8a8878',
  gold: '#d4af37',
  dark: '#2b2a26'
};

const CATEGORIES = {
  staff: 'STAFF',
  equipment: 'EQUIPMENT'
};

const ICONS = {
  office_assistant: 'assistant',
  office_case_files: 'files',
  office_printer: 'printer',
  office_employee: 'investigator',
  [PIGEON_FEED_ID]: 'feed'
};

const methods = {
  drawRow(item, index, x, y, w, h, selected) {
    const ui = this.ui;
    const d = ui.drawing;

    const isFeed = item.id === PIGEON_FEED_ID;
    const owned = !isFeed && ownsOfficeItem(item.id);
    const cash = this.balance();

    const pricey =
      !owned &&
      cash !== null &&
      cash < item.price;

    d.bevel(
      x, y, w, h,
      selected ? 0xf3e6b0 : 0xe9e6d7,
      selected
    );

    if (selected) {
      d.rectangle(x, y, 5, h, 0xd4af37);
    }

    const tile = h - 16;

    d.rectangle(
      x + 10, y + 8,
      tile, tile,
      0x1b2530
    );

    this.sprite(
      ICONS[item.id],
      x + 10 + Math.floor((tile - 48) / 2),
      y + 8 + Math.floor((tile - 48) / 2),
      3
    );

    d.frame(
      x + 10, y + 8,
      tile, tile,
      0xd4af37,
      selected ? 1 : 0.55,
      2
    );

    const textX = x + 10 + tile + 12;

    d.fit(
      d.text(textX, y + 10, '', 18, INK.navy),
      item.name,
      w - (textX - x) - 104
    );

    d.pixel(
      textX,
      y + 42,
      CATEGORIES[item.category] ||
        String(item.category || 'GOODS').toUpperCase(),
      7,
      INK.muted
    );

    d.pixel(
      x + w - 12,
      y + 14,
      ui.money(item.price),
      10,
      INK.green
    ).setOrigin(1, 0);

    let status = '';
    let color = INK.muted;

    if (owned) {
      status = 'OWNED';
      color = INK.green;
    } else if (isFeed) {
      const count =
        piInventoryManager.getItem(PIGEON_FEED_ID)
          ?.quantity || 0;

      if (count > 0) {
        status = `IN BAG: ${count}`;
      } else if (pricey) {
        status = 'TOO PRICEY';
        color = INK.brown;
      }
    } else if (pricey) {
      status = 'TOO PRICEY';
      color = INK.brown;
    }

    if (status) {
      d.pixel(
        x + w - 12,
        y + 42,
        status,
        7,
        color
      ).setOrigin(1, 0);
    }

    const hit = d.rectangle(
      x, y, w, h,
      0xffffff,
      0
    ).setInteractive({ useHandCursor: true });

    hit.on('pointerover', () => {
      hit.setFillStyle(0xffffff, 0.14);
    });

    hit.on('pointerout', () => {
      hit.setFillStyle(0xffffff, 0);
    });

    hit.on('pointerdown', () => {
      ui.options.onSfx?.('click');

      if (index !== this.page) {
        this.select(index);
      }
    });
  },

  drawDetail(item, x, y, w, h) {
    const ui = this.ui;
    const d = ui.drawing;

    const isFeed = item.id === PIGEON_FEED_ID;
    const owned = !isFeed && ownsOfficeItem(item.id);

    const availability = isFeed
      ? getPigeonFeedAvailability(this.feedItem)
      : getOfficeShopAvailability(item);

    const cash = this.balance();

    const pending =
      this.pendingId === item.id &&
      availability.enabled;

    d.bevel(x, y, w, h, 0xe9e6d7, true);

    const pedX = x + 16;
    const pedY = y + 14;
    const ped = 120;

    d.rectangle(
      pedX, pedY,
      ped, ped,
      0x1b2530
    );

    const glow = this.gfx();

    glow.fillStyle(0x4a79b0, 0.28);
    glow.fillCircle(pedX + 60, pedY + 58, 54);

    glow.fillStyle(0x4a79b0, 0.22);
    glow.fillCircle(pedX + 60, pedY + 58, 40);

    d.rectangle(
      pedX,
      pedY + ped - 16,
      ped,
      16,
      0x0e1822
    );

    if (
      !this.sprite(
        ICONS[item.id],
        pedX + 12,
        pedY + 10,
        6
      )
    ) {
      d.pixel(
        pedX + 44,
        pedY + 44,
        '?',
        32,
        INK.gold
      );
    }

    d.frame(
      pedX, pedY,
      ped, ped,
      0xd4af37,
      1,
      3
    );

    if (owned) {
      d.stamp(
        pedX + ped + 6,
        pedY + ped - 34,
        'OWNED',
        0x2f6b3f,
        -8,
        11
      );
    }

    const colX = pedX + ped + 18;
    const colW = w - (colX - x) - 16;

    const category =
      CATEGORIES[item.category] ||
      String(item.category || 'GOODS').toUpperCase();

    const chip = isFeed
      ? `${category} - REPEATABLE`
      : category;

    d.bevel(
      colX,
      y + 14,
      chip.length * 8 + 18,
      22,
      0xd0cec6
    );

    d.pixel(
      colX + 9,
      y + 21,
      chip,
      8,
      INK.navy
    );

    d.fit(
      d.text(colX, y + 44, '', 24, INK.navy),
      item.name,
      colW
    );

    const price = ui.money(item.price);

    const tagX = colX;
    const tagY = y + 82;
    const tagW = 40 + price.length * 14;

    const tag = this.gfx();

    const points = [
      { x: tagX, y: tagY + 14 },
      { x: tagX + 14, y: tagY },
      { x: tagX + tagW, y: tagY },
      { x: tagX + tagW, y: tagY + 28 },
      { x: tagX + 14, y: tagY + 28 }
    ];

    tag.fillStyle(0xd4af37, 1);
    tag.fillPoints(points, true);

    tag.lineStyle(2, 0x8a6d1a, 1);
    tag.strokePoints(points, true);

    tag.fillStyle(0x1b2530, 1);
    tag.fillCircle(tagX + 14, tagY + 14, 3);

    d.pixel(
      tagX + 28,
      tagY + 7,
      price,
      14,
      INK.dark
    );

    let hint = '';
    let hintColor = INK.muted;

    if (owned) {
      hint = 'Installed. Nobody has complained. Yet.';
      hintColor = INK.green;
    } else if (
      cash !== null &&
      cash < item.price
    ) {
      hint = `Short by ${ui.money(item.price - cash)}.`;
      hintColor = INK.brown;
    } else if (cash !== null) {
      hint =
        `Cash after purchase: ${ui.money(cash - item.price)}`;
    }

    if (hint) {
      d.text(
        colX,
        y + 114,
        hint,
        14,
        hintColor,
        colW
      );
    }

    this.fitHeight(
      d.text(
        x + 16,
        y + 146,
        item.description || '',
        17,
        INK.olive,
        w - 32
      ),
      84,
      12
    );

    const boxY = y + 238;
    const boxH = 88;

    d.rectangle(
      x + 16,
      boxY,
      w - 32,
      boxH,
      0xdfe8d2
    );

    d.frame(
      x + 16,
      boxY,
      w - 32,
      boxH,
      0x315539,
      1,
      2
    );

    d.pixel(
      x + 28,
      boxY + 10,
      'WHAT YOU GET',
      8,
      INK.green
    );

    const count =
      piInventoryManager.getItem(PIGEON_FEED_ID)
        ?.quantity || 0;

    const benefit = isFeed
      ? `${item.benefitText || ''} In PI inventory: ${count}.`
      : item.benefitText || '';

    this.fitHeight(
      d.text(
        x + 28,
        boxY + 28,
        benefit,
        15,
        INK.darkGreen,
        w - 56
      ),
      boxH - 34,
      11
    );

    const actionY = y + 338;
    const buttonX = x + 16;

    if (pending) {
      const confirm = d.button(
        buttonX,
        actionY,
        'CONFIRM',
        () => {
          const result = isFeed
            ? buyPigeonFeed(this.feedItem)
            : buyOfficeItem(this.catalog, item.id);

          this.pendingId = null;
          this.noticeOk = result?.ok !== false;
          ui.notice = result?.message || '';

          ui.render();
        }
      );

      d.button(
        buttonX + confirm.width + 10,
        actionY,
        'CANCEL',
        () => {
          this.pendingId = null;
          ui.render();
        }
      );
    } else {
      const buy = d.button(
        buttonX,
        actionY,
        owned ? 'OWNED' : 'BUY',
        () => {
          this.pendingId = item.id;
          ui.notice = '';
          ui.render();
        },
        availability.enabled
      );

      let nextX = buttonX + buy.width + 10;

      if (isFeed && this.feedError) {
        const retry = d.button(
          nextX,
          actionY,
          'RETRY',
          () => {
            void this.loadFeed();
          }
        );

        nextX += retry.width + 10;
      }

      if (
        owned &&
        item.id === 'office_case_files'
      ) {
        d.button(
          nextX,
          actionY,
          'OPEN ARCHIVE',
          () => ui.openApp('office-archive')
        );
      }

      if (
        owned &&
        item.id === 'office_printer'
      ) {
        d.button(
          nextX,
          actionY,
          'DOCUMENT JOBS',
          () => ui.openApp('office-documents')
        );
      }
    }

    const total = this.products().length;
    const right = x + w - 16;

    d.button(
      right - 35,
      actionY,
      '>',
      () => this.changePage(1),
      this.page < total - 1
    );

    d.text(
      right - 87,
      actionY + 8,
      `${this.page + 1} / ${total}`,
      15,
      INK.navy
    );

    d.button(
      right - 130,
      actionY,
      '<',
      () => this.changePage(-1),
      this.page > 0
    );

    const receiptY = y + 380;
    const receiptH = 48;

    d.rectangle(
      x + 16,
      receiptY,
      w - 32,
      receiptH,
      0xf7efda
    );

    d.frame(
      x + 16,
      receiptY,
      w - 32,
      receiptH,
      0xb8a878,
      1,
      1
    );

    d.rectangle(
      x + 16,
      receiptY,
      5,
      receiptH,
      0xd4af37
    );

    let message = '';
    let color = INK.brown;

    if (pending) {
      message =
        `Confirm purchase for ${ui.money(item.price)}? ` +
        'Payment is due in advance.';
    } else if (ui.notice) {
      message = ui.notice;
      color = this.noticeOk
        ? INK.green
        : INK.brown;
    } else if (
      !owned &&
      !availability.enabled
    ) {
      message =
        isFeed && !this.feedItem
          ? this.feedError || 'Loading pigeon feed...'
          : availability.reason;
    } else {
      message =
        'Receipt paper loaded. Dignity not included.';

      color = INK.faint;
    }

    this.fitHeight(
      d.text(
        x + 32,
        receiptY + 6,
        message,
        15,
        color,
        w - 64
      ),
      receiptH - 10,
      11
    );
  }
};

export function bindPIInventoryOfficeShop(shop) {
  if (!shop || shop.piInventoryBound) {
    return false;
  }

  Object.assign(shop, methods, {
    piInventoryBound: true
  });

  shop.redraw();

  return true;
}