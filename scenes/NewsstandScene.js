import { NewsstandScene as ExistingNewsstandScene } from './NewsstandSceneBase.js';
import { MonthlySpillReader } from '../systems/newsstand/MonthlySpillReader.js';
import { MONTHLY_SPILL_ISSUE as ISSUE } from '../systems/newsstand/MonthlySpillIssue.js';
import { isEditableTarget } from '../config/newsstandConfig.js';
import { NewspaperLayoutConfig } from '../NewspaperLayoutConfig.js';
import { ensureDailyPaperTexture } from '../ui/NewspaperPaper.js';
import { moneyManager, MONEY_SOURCE, ECONOMY_CATEGORY } from '../managers/MoneyManager.js';
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { playShopPurchaseAudio } from './shop/ShopPurchaseAudio.js';

const MONTHLY_ID = 'monthly_spill';
const PAPER_KEY = 'paper_monthly_spill_clean';
const RED = 0xa91822;
const YELLOW = 0xffd943;
const BLACK = 0x1e1916;
const WHITE = '#fff8e8';
const INK = '#211a17';
const HEADLINE = 'Impact, Arial Black, sans-serif';

class MonthlySpillTabloidReader extends MonthlySpillReader {
  open() {
    if (this.isOpen || !ISSUE.pages.length) return;

    this.hudScene = this.scene.game.scene.keys?.PlayerHudScene;
    this.hudWasVisible = this.hudScene?.sys.isVisible() ?? false;
    this.hudScene?.sys.setVisible(false);

    try {
      super.open();
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  dispose() {
    try {
      if (this.isOpen) super.dispose();
    } finally {
      this.hudScene?.sys.setVisible(this.hudWasVisible);
      this.hudScene = null;
    }
  }

  drawPage(parent, x, yOrIndex, explicitIndex) {
    const index = explicitIndex ?? yOrIndex;
    const y = explicitIndex === undefined ? 0 : yOrIndex;
    const data = ISSUE.pages[index];
    if (!data) return;

    const page = this.scene.add.container(x, y);
    parent.add(page);

    page.add(this.scene.add.image(0, 0, this.paperKey)
      .setOrigin(0)
      .setDisplaySize(740, 1000));

    const box = (left, top, w, h, color) => {
      const shape = this.scene.add.rectangle(left, top, w, h, color).setOrigin(0);
      page.add(shape);
      return shape;
    };

    const text = (value, left, top, w, h, size, options = {}) => {
      if (value == null || value === '') return;

      const label = this.scene.add.text(left, top, String(value), {
        fontFamily: options.headline ? HEADLINE : 'SpecialElite',
        fontStyle: options.headline ? 'bold' : '',
        fontSize: `${size}px`,
        color: options.color || INK,
        lineSpacing: options.headline ? -2 : 5,
        wordWrap: { width: w, useAdvancedWrap: true }
      });

      while ((label.height > h || label.width > w) && size > 12) {
        label.setFontSize(--size);
      }

      if (label.height > h || label.width > w) {
        label.setScale(Math.min(h / label.height, w / label.width));
      }

      if (options.center) label.x += (w - label.displayWidth) / 2;
      page.add(label);
      return label;
    };

    const banner = (value, left, top, w, color, ink = WHITE) => {
      box(left, top, w, 37, color);
      text(value, left + 9, top + 3, w - 18, 31, 24, {
        headline: true, color: ink, center: true
      });
    };

    const big = (value, left, top, w, h, size) =>
      text(String(value ?? '').toUpperCase(), left, top, w, h, size, {
        headline: true
      });

    if (data.type === 'cover') {
      text(ISSUE.edition, 34, 23, 672, 25, 17);
      box(34, 54, 672, 111, RED);
      text(ISSUE.title.toUpperCase(), 48, 63, 644, 87, 78, {
        headline: true, color: WHITE, center: true
      });
      text(ISSUE.tagline, 34, 180, 672, 40, 23);
      banner('EXCLUSIVE', 34, 232, 197, YELLOW, INK);
      big(data.headline, 34, 289, 672, 375, 130);
      text(data.deck, 34, 682, 672, 120, 30);

      const teasers = (data.teasers || []).slice(0, 3);
      teasers.forEach((line, i) => {
        const w = (672 - (teasers.length - 1) * 7) / teasers.length;
        const left = 34 + i * (w + 7);
        box(left, 814, w, 120, i % 2 ? YELLOW : RED);
        text(String(line).toUpperCase(), left + 10, 826, w - 20, 99, 31, {
          headline: true, color: i % 2 ? INK : WHITE
        });
      });
    } else {
      banner(data.section || ISSUE.title, 34, 30, 672, RED);
      big(data.headline, 34, 87, 672, 178, 75);
      text(data.deck, 34, 269, 672, 72, 26);

      const body = Array.isArray(data.body) ? data.body.join('\n\n') : data.body;

      if (data.type === 'contents') {
        text(body, 34, 376, 672, 190, 25);
        if (data.quote) text(`“${data.quote}”`, 34, 580, 672, 85, 28);
        banner('IN THIS ISSUE', 34, 674, 672, BLACK);

        const rows = data.contents || [];
        const rowHeight = Math.min(42, 215 / Math.max(1, rows.length));

        rows.forEach(([number, label], i) => {
          const top = 719 + i * rowHeight;
          const hit = box(34, top, 672, rowHeight - 2, i % 2 ? 0xf1e2b7 : YELLOW)
            .setInteractive({ useHandCursor: true });

          text(label, 46, top + 4, 586, rowHeight - 8, 23, { headline: true });
          text(number, 650, top + 4, 46, rowHeight - 8, 23, { headline: true });

          hit.on('pointerup', (_pointer, _x, _y, event) => {
            event?.stopPropagation();
            const next = Number(number) - 1;

            if (!this.isOpen || this.busy || !Number.isInteger(next) ||
                next < 0 || next >= ISSUE.pages.length) return;

            this.page = next;
            this.save();
            this.rustle();
            this.render();
          });
        });
      } else if (data.type === 'horoscope') {
        const entries = data.entries || [];
        const rowHeight = Math.min(57, 556 / Math.max(1, entries.length));

        entries.forEach(([sign, prediction], i) => {
          const top = 373 + i * rowHeight;
          box(34, top, 142, rowHeight - 3, i % 2 ? YELLOW : RED);
          text(sign, 43, top + 5, 124, rowHeight - 10, 22, {
            headline: true, color: i % 2 ? INK : WHITE
          });
          text(prediction, 190, top + 5, 516, rowHeight - 10, 22);
        });
      } else {
        const copy = String(body ?? '').trim();
        const middle = Math.floor(copy.length / 2);
        const before = copy.lastIndexOf(' ', middle);
        const after = copy.indexOf(' ', middle);
        const split = before > 0 ? before : after > 0 ? after : copy.length;
        const left = copy.slice(0, split).trim();
        const right = copy.slice(split).trim();
        const bodyHeight = data.quote || data.fine ? 380 : 550;

        text(left, 34, 376, right ? 317 : 672, bodyHeight, 26);
        if (right) text(right, 389, 376, 317, bodyHeight, 26);

        if (data.quote) {
          box(34, 774, 672, 106, YELLOW);
          text(`“${data.quote}”`, 49, 787, 642, 80, 37, { headline: true });
        }

        if (data.fine) text(data.fine, 34, 896, 672, 38, 17);
      }
    }

    text(ISSUE.edition, 34, 961, 600, 25, 16);
    text(index + 1, 661, 959, 45, 28, 21, { headline: true });
  }
}

export class NewsstandScene extends ExistingNewsstandScene {
  init(data = {}) {
    super.init(data);
    this.monthlyReader = null;
  }

  create() {
    super.create();
    this.monthlyReader = new MonthlySpillTabloidReader(this);
  }

  async buyAndOpenNewspaper(config) {
    if (config.id === MONTHLY_ID) return this.buyAndOpenMonthly();
    return super.buyAndOpenNewspaper(config);
  }

  isPurchaseBlocked() {
    return Boolean(this.monthlyReader?.isOpen) || super.isPurchaseBlocked();
  }

  buyAndOpenMonthly() {
    const reader = this.monthlyReader;
    if (!reader || this.isPurchaseBlocked()) return;

    try {
      reader.paperKey = ensureDailyPaperTexture(
        this,
        { ...NewspaperLayoutConfig.daily, structure: {} },
        PAPER_KEY
      );

      if (!reader.paperKey) {
        throw new Error('Could not create clean Monthly Spill paper.');
      }

      if (gameState.monthlyMagazineAccess?.[ISSUE.id] !== true) {
        const purchase = moneyManager.spend(ISSUE.price, {
          source: MONEY_SOURCE.CASH,
          category: ECONOMY_CATEGORY.NEWSPAPER,
          description: `Monthly magazine: ${ISSUE.title}, ${ISSUE.edition}`,
          metadata: {
            magazineId: ISSUE.id,
            newspaperType: 'monthly',
            cityId: this.getActiveCityId()
          }
        });

        if (!purchase.ok) {
          this.showNotEnoughMoneyMessage(ISSUE.title, purchase.required, purchase.available);
          return;
        }

        const access = gameState.monthlyMagazineAccess;
        if (!access || typeof access !== 'object' || Array.isArray(access)) {
          gameState.monthlyMagazineAccess = {};
        }

        gameState.monthlyMagazineAccess[ISSUE.id] = true;
        requestAutosave();
        if (ISSUE.price > 0) playShopPurchaseAudio(this);
      }

      reader.open();
    } catch (error) {
      console.error('[NewsstandScene] Could not open Monthly Spill:', error);
      this.showPurchaseErrorMessage();
    }
  }

  handleEscape(event) {
    if (this.monthlyReader?.isOpen) {
      if (!isEditableTarget(event)) this.monthlyReader.close();
      return;
    }
    super.handleEscape(event);
  }

  handleResize() {
    super.handleResize();
    this.monthlyReader?.resize();
  }

  handleShutdown() {
    this.monthlyReader?.destroy();
    this.monthlyReader = null;
    super.handleShutdown();
  }
}