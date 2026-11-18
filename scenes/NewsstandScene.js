import { NewsstandScene as ExistingNewsstandScene } from './NewsstandSceneBase.js';
import { MonthlySpillReader } from '../systems/newsstand/MonthlySpillReader.js';
import { MONTHLY_SPILL_ISSUE as ISSUE } from '../systems/newsstand/MonthlySpillIssue.js';
import { NEWSSTAND_HOTSPOTS, isEditableTarget } from '../config/newsstandConfig.js';
import { prepareNewspaperBackground } from '../ui/NewspaperAssets.js';
import { moneyManager, MONEY_SOURCE, ECONOMY_CATEGORY } from '../managers/MoneyManager.js';
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { playShopPurchaseAudio } from './shop/ShopPurchaseAudio.js';

const MONTHLY_ID = 'monthly_spill';
const PAGE_WIDTH = 740;
const PAGE_HEIGHT = 1000;
const INK = '#2b211b';

class MonthlySpillDailyReader extends MonthlySpillReader {
  drawPage(parent, x, yOrIndex, explicitIndex) {
    // Obsługuje zarówno wersję z GitHuba, jak i poprzednią wersję z czatu.
    const index = explicitIndex ?? yOrIndex;
    const y = explicitIndex === undefined ? 0 : yOrIndex;
    const data = ISSUE.pages[index];
    if (!data) return;

    const page = this.scene.add.container(x, y);
    parent.add(page);

    const paperKey = prepareNewspaperBackground(this.scene, 'daily');
    const paper = this.scene.add.image(0, 0, paperKey)
      .setOrigin(0)
      .setDisplaySize(PAGE_WIDTH, PAGE_HEIGHT);
    page.add(paper);

    const rule = (top, height = 2) => {
      const line = this.scene.add.rectangle(44, top, 652, height, 0x493b2f)
        .setOrigin(0);
      page.add(line);
    };

    const text = (value, left, top, width, maxHeight, fontSize, color = INK) => {
      const label = this.scene.add.text(left, top, String(value ?? ''), {
        fontFamily: 'SpecialElite',
        fontSize: `${fontSize}px`,
        color,
        lineSpacing: 5,
        wordWrap: { width, useAdvancedWrap: true }
      });

      while (label.height > maxHeight && fontSize > 12) {
        label.setFontSize(--fontSize);
      }

      if (label.height > maxHeight) {
        label.setScale(maxHeight / label.height);
      }

      page.add(label);
      return label;
    };

    const body = Array.isArray(data.body) ? data.body.join('\n\n') : data.body;

    text(ISSUE.edition, 44, 36, 652, 24, 17);
    rule(65);
    text(ISSUE.title.toUpperCase(), 44, 85, 652, 74, 55, '#8e2525');
    rule(166, 4);

    if (data.type === 'cover') {
      text('EXCLUSIVE', 44, 204, 652, 32, 24, '#8e2525');
      text(data.headline, 44, 251, 652, 300, 78);
      text(data.deck, 44, 568, 652, 135, 31);
      rule(728);
      (data.teasers || []).forEach((line, i) => {
        text(line, 44, 753 + i * 47, 652, 42, 23);
      });
    } else {
      text(data.section, 44, 197, 652, 28, 19, '#8e2525');
      text(data.headline, 44, 232, 652, 155, 54);
      text(data.deck, 44, 393, 652, 70, 25);
      rule(475);

      if (data.type === 'horoscope') {
        const entries = data.entries || [];
        const rowHeight = Math.min(55, 438 / Math.max(1, entries.length));

        entries.forEach(([sign, prediction], i) => {
          const top = 490 + i * rowHeight;
          text(sign, 44, top, 142, rowHeight - 3, 20, '#8e2525');
          text(prediction, 200, top, 496, rowHeight - 3, 21);
        });
      } else if (data.type === 'contents') {
        text(body, 44, 494, 652, 157, 25);
        if (data.quote) text(`“${data.quote}”`, 44, 665, 652, 57, 22);

        const rows = data.contents || [];
        const rowHeight = Math.min(38, 195 / Math.max(1, rows.length));

        rows.forEach(([number, label], i) => {
          const top = 737 + i * rowHeight;
          const zone = this.scene.add.zone(44, top, 652, rowHeight)
            .setOrigin(0)
            .setInteractive({ useHandCursor: true });
          page.add(zone);

          text(label, 44, top + 3, 590, rowHeight - 5, 22);
          text(number, 649, top + 3, 47, rowHeight - 5, 22, '#8e2525');

          zone.on('pointerup', (_pointer, _x, _y, event) => {
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
      } else {
        const words = String(body ?? '').trim().split(/\s+/);
        const middle = Math.ceil(words.length / 2);
        const bodyHeight = data.quote || data.fine ? 300 : 425;

        text(words.slice(0, middle).join(' '), 44, 494, 310, bodyHeight, 25);
        text(words.slice(middle).join(' '), 386, 494, 310, bodyHeight, 25);

        if (data.quote) {
          rule(810);
          text(`“${data.quote}”`, 44, 826, 652, 63, 27, '#8e2525');
        }

        if (data.fine) text(data.fine, 44, 898, 652, 31, 17);
      }
    }

    rule(942);
    text(index + 1, 655, 957, 42, 26, 19);
  }
}

export class NewsstandScene extends ExistingNewsstandScene {
  init(data = {}) {
    super.init(data);
    this.monthlyReader = null;
  }

  create() {
    super.create();
    this.monthlyReader = new MonthlySpillDailyReader(this);

    if (this.hotspots.configs.some(config => config.id === MONTHLY_ID)) return;

    const time = NEWSSTAND_HOTSPOTS.find(config => config.id === 'time');
    if (!time) return;

    const monthly = {
      id: MONTHLY_ID,
      kind: 'newspaper',
      type: 'monthly',
      label: ISSUE.title,
      x: time.x + time.width + 4,
      y: time.y,
      width: 102,
      height: time.height,
      price: ISSUE.price,
      depth: time.depth,
      labelDepth: time.labelDepth
    };

    this.hotspots.configs.push(monthly);
    this.hotspots.createHotspot(monthly);

    const entry = this.hotspots.entries.find(item => item.config === monthly);
    entry?.priceLabel.setVisible(false);
    this.hotspots.updateDebug();
  }

  async buyAndOpenNewspaper(config) {
    if (config.id === MONTHLY_ID) {
      this.buyAndOpenMonthly();
      return;
    }

    return super.buyAndOpenNewspaper(config);
  }

  isPurchaseBlocked() {
    return Boolean(this.monthlyReader?.isOpen) || super.isPurchaseBlocked();
  }

  buyAndOpenMonthly() {
    if (!this.monthlyReader || this.isPurchaseBlocked()) return;

    try {
      prepareNewspaperBackground(this, 'daily');
    } catch (error) {
      console.error('[NewsstandScene] Monthly Spill paper unavailable:', error);
      this.showPurchaseErrorMessage();
      return;
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

      if (!gameState.monthlyMagazineAccess ||
          typeof gameState.monthlyMagazineAccess !== 'object' ||
          Array.isArray(gameState.monthlyMagazineAccess)) {
        gameState.monthlyMagazineAccess = {};
      }

      gameState.monthlyMagazineAccess[ISSUE.id] = true;
      requestAutosave();
      if (ISSUE.price > 0) playShopPurchaseAudio(this);
    }

    this.monthlyReader.open();
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