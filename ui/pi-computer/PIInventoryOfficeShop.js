import {
  piInventoryManager
} from '../../managers/PIInventoryManager.js';

import {
  NEW_PI_OFFICE_ID,
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
  brown: '#713d32',
  muted: '#55584b',
  faint: '#8a8878'
};

const methods = {
  drawRow(item, index, x, y, w, h, selected) {
    const ui = this.ui;
    const d = ui.drawing;

    const feed = item.id === PIGEON_FEED_ID;
    const owned = !feed && ownsOfficeItem(item.id);

    const availability = feed
      ? getPigeonFeedAvailability(this.feedItem)
      : getOfficeShopAvailability(item);

    d.bevel(
      x,
      y,
      w,
      h,
      selected ? 0xf3e6b0 : 0xe9e6d7,
      selected
    );

    if (selected) {
      d.rectangle(x, y, 5, h, 0xd4af37);
    }

    const category = String(
      item.category || 'goods'
    ).toUpperCase();

    d.fit(
      d.text(x + 14, y + 9, '', 18, INK.navy),
      item.name,
      w - 125
    );

    d.pixel(
      x + 14,
      y + 42,
      category,
      7,
      INK.muted
    );

    d.pixel(
      x + w - 12,
      y + 12,
      ui.money(item.price),
      10,
      INK.green
    ).setOrigin(1, 0);

    let status = '';
    let color = INK.muted;

    if (owned) {
      status = 'OWNED';
      color = INK.green;
    } else if (feed) {
      const count =
        piInventoryManager.getItem(PIGEON_FEED_ID)
          ?.quantity || 0;

      status = count ? `IN BAG: ${count}` : '';
    } else if (!availability.enabled) {
      status = 'LOCKED';
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
      x,
      y,
      w,
      h,
      0xffffff,
      0
    ).setInteractive({ useHandCursor: true });

    hit.on('pointerover', () =>
      hit.setFillStyle(0xffffff, 0.12)
    );

    hit.on('pointerout', () =>
      hit.setFillStyle(0xffffff, 0)
    );

    hit.on('pointerdown', () => {
      ui.options.onSfx?.('click');

      if (index !== this.page) {
        this.select(index);
      }
    });
  },

  drawDetail(item, x, y, w, h) {
    const ui = this.ui;
    const scene = ui.scene;
    const d = ui.drawing;

    const feed = item.id === PIGEON_FEED_ID;
    const owned = !feed && ownsOfficeItem(item.id);

    const availability = feed
      ? getPigeonFeedAvailability(this.feedItem)
      : getOfficeShopAvailability(item);

    const pending =
      this.pendingId === item.id &&
      availability.enabled;

    d.bevel(x, y, w, h, 0xe9e6d7, true);

    const preview = {
      x: x + 16,
      y: y + 12,
      w: w - 32,
      h: 120
    };

    d.rectangle(
      preview.x,
      preview.y,
      preview.w,
      preview.h,
      0x24251f
    );

    const textureKey = item.visual?.textureKey;
    const source = textureKey &&
      scene.textures.exists(textureKey)
      ? scene.textures.get(textureKey).getSourceImage()
      : null;

    let previewBounds = { ...preview };

    if (source) {
      const fit = Math.min(
        preview.w / source.width,
        preview.h / source.height
      );

      const imageW = source.width * fit;
      const imageH = source.height * fit;

      previewBounds = {
        x: preview.x + (preview.w - imageW) / 2,
        y: preview.y + (preview.h - imageH) / 2,
        w: imageW,
        h: imageH
      };

      d.add(
        scene.add.image(
          previewBounds.x,
          previewBounds.y,
          textureKey
        )
          .setOrigin(0)
          .setDisplaySize(imageW, imageH)
      );
    } else {
      d.text(
        preview.x + 14,
        preview.y + 40,
        feed ? 'PIGEON FEED' : 'OFFICE UPGRADE',
        18,
        '#d4af37',
        preview.w - 28
      );
    }

    d.frame(
      preview.x,
      preview.y,
      preview.w,
      preview.h,
      0x8a7440,
      1,
      2
    );

    d.fit(
      d.text(x + 16, y + 142, '', 23, INK.navy),
      item.name,
      w - 32
    );

    d.text(
      x + 16,
      y + 173,
      `${ui.money(item.price)}${owned ? ' — OWNED' : ''}`,
      18,
      INK.green,
      w - 32
    );

    this.fitHeight(
      d.text(
        x + 16,
        y + 201,
        item.description || '',
        16,
        INK.muted,
        w - 32
      ),
      61,
      11
    );

    const benefit = feed
      ? `${item.benefitText || ''} In PI inventory: ${
          piInventoryManager.getItem(PIGEON_FEED_ID)
            ?.quantity || 0
        }.`
      : item.benefitText || '';

    d.rectangle(
      x + 16,
      y + 270,
      w - 32,
      58,
      0xdfe8d2
    );

    this.fitHeight(
      d.text(
        x + 25,
        y + 277,
        benefit,
        15,
        INK.green,
        w - 50
      ),
      44,
      11
    );

    const actionY = y + 338;

    if (pending) {
      const confirm = d.button(
        x + 16,
        actionY,
        'CONFIRM',
        () => {
          const result = feed
            ? buyPigeonFeed(this.feedItem)
            : buyOfficeItem(this.catalog, item.id);

          this.pendingId = null;
          this.noticeOk = result?.ok === true;
          ui.notice = result?.message || '';

          ui.render();

          if (result?.ok && !feed) {
            scene.handleOfficePurchase?.(
              item.id,
              item.id === NEW_PI_OFFICE_ID
                ? previewBounds
                : null
            );
          }
        }
      );

      d.button(
        x + 26 + confirm.width,
        actionY,
        'CANCEL',
        () => {
          this.pendingId = null;
          ui.render();
        }
      );
    } else {
      const buy = d.button(
        x + 16,
        actionY,
        owned ? 'OWNED' : 'BUY',
        () => {
          this.pendingId = item.id;
          ui.notice = '';
          ui.render();
        },
        availability.enabled
      );

      const nextX = x + 26 + buy.width;

      if (owned && item.id === 'office_case_files') {
        d.button(
          nextX,
          actionY,
          'ARCHIVE',
          () => ui.openApp('office-archive')
        );
      }

      if (owned && item.id === 'office_printer') {
        d.button(
          nextX,
          actionY,
          'JOBS',
          () => ui.openApp('office-documents')
        );
      }

      if (feed && this.feedError) {
        d.button(
          nextX,
          actionY,
          'RETRY',
          () => void this.loadFeed()
        );
      }
    }

    const total = this.products().length;

    d.button(
      x + w - 94,
      actionY,
      '<',
      () => this.changePage(-1),
      this.page > 0
    );

    d.button(
      x + w - 48,
      actionY,
      '>',
      () => this.changePage(1),
      this.page < total - 1
    );

    let message = 'Receipt paper loaded. Dignity not included.';
    let color = INK.faint;

    if (pending) {
      message = `Confirm purchase for ${ui.money(item.price)}?`;
      color = INK.brown;
    } else if (ui.notice) {
      message = ui.notice;
      color = this.noticeOk ? INK.green : INK.brown;
    } else if (!owned && !availability.enabled) {
      message = availability.reason;
      color = INK.brown;
    }

    d.rectangle(
      x + 16,
      y + 380,
      w - 32,
      48,
      0xf7efda
    );

    this.fitHeight(
      d.text(
        x + 25,
        y + 386,
        message,
        14,
        color,
        w - 50
      ),
      36,
      10
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