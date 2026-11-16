import { NewsstandScene as ExistingNewsstandScene } from './NewsstandSceneBase.js';
import { MonthlySpillReader } from '../systems/newsstand/MonthlySpillReader.js';
import { MONTHLY_SPILL_ISSUE } from '../systems/newsstand/MonthlySpillIssue.js';
import { moneyManager, MONEY_SOURCE, ECONOMY_CATEGORY } from '../managers/MoneyManager.js';
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { playShopPurchaseAudio } from './shop/ShopPurchaseAudio.js';
import { isEditableTarget } from '../config/newsstandConfig.js';

export class NewsstandScene extends ExistingNewsstandScene {
  init(data = {}) {
    super.init(data);
    this.monthlyReader = null;
    this.monthlyButton = null;
  }

  create() {
    super.create();
    this.monthlyReader = new MonthlySpillReader(this);
    this.monthlyButton = this.add.text(0, 20, '', {
      fontFamily: 'PressStart2P', fontSize: '12px', color: '#ffe7a1',
      backgroundColor: '#852652', padding: { x: 14, y: 12 }
    }).setOrigin(1, 0).setDepth(45).setInteractive({ useHandCursor: true });
    this.monthlyButton.on('pointerup', () => this.buyAndOpenMonthly());
    this.updateMonthlyButton();
  }

  ownsMonthly() {
    return gameState.monthlyMagazineAccess?.[MONTHLY_SPILL_ISSUE.id] === true;
  }

  updateMonthlyButton() {
    if (!this.monthlyButton) return;
    const label = this.ownsMonthly()
      ? 'THE MONTHLY SPILL | READ'
      : `THE MONTHLY SPILL | $${MONTHLY_SPILL_ISSUE.price}`;
    this.monthlyButton.setText(label).setPosition(this.scale.width - 20, 20).setScale(1);
    const available = Math.max(40, this.scale.width - 105);
    if (this.monthlyButton.width > available) this.monthlyButton.setScale(available / this.monthlyButton.width);
  }

  isPurchaseBlocked() {
    return Boolean(this.monthlyReader?.isOpen) || super.isPurchaseBlocked();
  }

  buyAndOpenMonthly() {
    if (this.isPurchaseBlocked()) return;
    if (!this.ownsMonthly()) {
      const issue = MONTHLY_SPILL_ISSUE;
      const purchase = moneyManager.spend(issue.price, {
        source: MONEY_SOURCE.CASH, category: ECONOMY_CATEGORY.NEWSPAPER,
        description: `Monthly magazine: ${issue.title}, ${issue.edition}`,
        metadata: { magazineId: issue.id, newspaperType: 'monthly', cityId: this.getActiveCityId() }
      });
      if (!purchase.ok) {
        this.showNotEnoughMoneyMessage(issue.title, purchase.required, purchase.available);
        return;
      }
      if (!gameState.monthlyMagazineAccess || typeof gameState.monthlyMagazineAccess !== 'object' || Array.isArray(gameState.monthlyMagazineAccess)) {
        gameState.monthlyMagazineAccess = {};
      }
      gameState.monthlyMagazineAccess[issue.id] = true;
      requestAutosave();
      if (issue.price > 0) playShopPurchaseAudio(this);
    }
    this.monthlyReader.open();
    this.updateMonthlyButton();
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
    this.updateMonthlyButton();
    this.monthlyReader?.resize();
  }

  handleShutdown() {
    this.monthlyReader?.destroy();
    this.monthlyReader = null;
    this.monthlyButton?.destroy();
    this.monthlyButton = null;
    super.handleShutdown();
  }
}
