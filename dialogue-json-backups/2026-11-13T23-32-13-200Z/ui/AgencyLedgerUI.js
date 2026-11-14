import { EventBus } from '../EventBus.js';
import { moneyManager } from '../managers/MoneyManager.js';

const PAGE_SIZE = 6;

const CATEGORIES = {
  travel: 'Travel',
  hotel: 'Hotel',
  food: 'Food',
  drink: 'Drink',
  newspaper: 'Newspaper',
  phone: 'Phone',
  taxi: 'Taxi',
  informant: 'Informant',
  side_case: 'Side case',
  mission_reward: 'Mission reward',
  office_upgrade: 'Office upgrade',
  item: 'Item',
  agency_advance: 'Agency advance',
  refund: 'Refund'
};

export class AgencyLedgerUI {
  constructor(scene) {
    this.scene = scene;

    this.isOpen = false;
    this.destroyed = false;
    this.page = 0;
    this.rows = [];

    this.container = null;
    this.panel = null;
    this.overlay = null;

    this.panelWidth = 760;
    this.panelHeight = 620;

    this.dateFormatter = new Intl.DateTimeFormat(
      'en-GB',
      {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }
    );

    this.boundKeyHandler =
      this.onLedgerKeyDown.bind(this);

    this.boundShutdown =
      this.destroy.bind(this);

    this.boundResize = () => {
      if (this.container && !this.destroyed) {
        this.layout();
      }
    };

    this.boundMoneyChange = () => {
      if (this.isOpen && !this.destroyed) {
        this.refresh();
      }
    };

    scene.input.keyboard?.on(
      'keydown-B',
      this.boundKeyHandler
    );

    scene.scale.on(
      Phaser.Scale.Events.RESIZE,
      this.boundResize
    );

    scene.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundShutdown
    );

    scene.events.once(
      Phaser.Scenes.Events.DESTROY,
      this.boundShutdown
    );

    window.addEventListener(
      'lost-artifacts:money-changed',
      this.boundMoneyChange
    );
  }

  text(
    x,
    y,
    value,
    size = 16,
    color = '#e4dcc7'
  ) {
    return this.scene.add.text(
      x,
      y,
      value,
      {
        fontFamily: 'SpecialElite',
        fontSize: `${size}px`,
        color
      }
    );
  }

  stopPointer(pointer, localX, localY, event) {
    event?.stopPropagation();
  }

  _notifyPanelState() {
    this.scene.events?.emit(
      'ui-panel-state-changed',
      {
        panel: 'agency-ledger',
        isOpen: this.isOpen
      }
    );

    if (
      typeof this.scene.refreshPanelLock === 'function'
    ) {
      this.scene.refreshPanelLock();
      return;
    }

    const hud =
      this.scene.getPlayerHud?.() ??
      this.scene.getPlayerHudScene?.();

    this.scene.applyLock?.(
      Boolean(
        this.isOpen ||
        this.scene.saveUI?.isOpen ||
        hud?.isAnyPanelOpen?.()
      )
    );
  }

  buildPanel() {
    if (this.destroyed || this.container) {
      return;
    }

    const { width, height } = this.scene.scale;
    const w = this.panelWidth;
    const h = this.panelHeight;

    this.container = this.scene.add.container(0, 0)
      .setDepth(2000)
      .setVisible(false);

    this.overlay = this.scene.add.rectangle(
      0,
      0,
      width,
      height,
      0x000000,
      0.82
    )
      .setOrigin(0)
      .setInteractive();

    this.overlay.on(
      'pointerdown',
      (pointer, x, y, event) => {
        event?.stopPropagation();
        this.close();
      }
    );

    this.container.add(this.overlay);

    this.panel = this.scene.add.container(0, 0);

    const background = this.scene.add.rectangle(
      0,
      0,
      w,
      h,
      0x19150e,
      1
    )
      .setOrigin(0)
      .setStrokeStyle(3, 0xd4af37)
      .setInteractive();

    background.on(
      'pointerdown',
      this.stopPointer
    );

    const header = this.scene.add.rectangle(
      0,
      0,
      w,
      68,
      0x332514,
      1
    ).setOrigin(0);

    const title = this.scene.add.text(
      24,
      23,
      'MARK AGENCY - THE BOOKS',
      {
        fontFamily: 'PressStart2P',
        fontSize: '15px',
        color: '#f4e7c1'
      }
    );

    this.closeBtn = this.text(
      w - 40,
      15,
      'X',
      30,
      '#ffd166'
    ).setInteractive({
      useHandCursor: true
    });

    this.closeBtn.on(
      'pointerdown',
      (pointer, x, y, event) => {
        event?.stopPropagation();
        this.close();
      }
    );

    this.summaryText = this.text(
      24,
      86,
      '',
      20
    );

    this.quipText = this.text(
      24,
      150,
      '',
      16,
      '#e5ba78'
    ).setWordWrapWidth(w - 48, true);

    const headings = this.text(
      24,
      205,
      'DESCRIPTION / ACCOUNT                                      AMOUNT',
      14,
      '#bca36c'
    );

    this.listContainer =
      this.scene.add.container(24, 238);

    this.emptyText = this.text(
      0,
      30,
      'No receipts. A suspiciously inexpensive investigation.',
      18
    ).setWordWrapWidth(w - 48, true);

    this.listContainer.add(this.emptyText);

    this.pageLabel = this.text(
      w / 2,
      h - 47,
      '',
      16
    ).setOrigin(0.5, 0);

    this.prevBtn = this.text(
      24,
      h - 47,
      '< PREV',
      18,
      '#ffd166'
    ).setInteractive({
      useHandCursor: true
    });

    this.nextBtn = this.text(
      w - 110,
      h - 47,
      'NEXT >',
      18,
      '#ffd166'
    ).setInteractive({
      useHandCursor: true
    });

    this.prevBtn.on(
      'pointerdown',
      (pointer, x, y, event) => {
        event?.stopPropagation();
        this.changePage(-1);
      }
    );

    this.nextBtn.on(
      'pointerdown',
      (pointer, x, y, event) => {
        event?.stopPropagation();
        this.changePage(1);
      }
    );

    this.panel.add([
      background,
      header,
      title,
      this.closeBtn,
      this.summaryText,
      this.quipText,
      headings,
      this.listContainer,
      this.pageLabel,
      this.prevBtn,
      this.nextBtn
    ]);

    this.container.add(this.panel);

    this.layout();
    this.pinToScreen();
  }

  pinToScreen() {
    if (!this.container) {
      return;
    }

    const visit = object => {
      object.setScrollFactor?.(0, 0);

      if (Array.isArray(object.list)) {
        object.list.forEach(visit);
      }
    };

    visit(this.container);
  }

  layout() {
    if (!this.panel || !this.overlay) {
      return;
    }

    const { width, height } = this.scene.scale;

    const scale = Math.min(
      1,
      Math.max(
        0.1,
        (width - 32) / this.panelWidth
      ),
      Math.max(
        0.1,
        (height - 32) / this.panelHeight
      )
    );

    this.overlay.setSize(width, height);

    this.panel
      .setScale(scale)
      .setPosition(
        (width - this.panelWidth * scale) / 2,
        (height - this.panelHeight * scale) / 2
      );
  }

  formatMoney(value) {
    const number = Math.max(
      0,
      Math.floor(Number(value) || 0)
    );

    return `$${number.toLocaleString('en-US')}`;
  }

  getQuip(debt) {
    if (!debt) {
      return 'The books are balanced. Finance has requested a second opinion.';
    }

    if (debt <= 150) {
      return 'A little red ink. We prefer to call it a narrative choice.';
    }

    if (debt <= 400) {
      return 'Finance has classified your receipts as experimental fiction.';
    }

    if (debt <= 900) {
      return 'Your expense report now requires its own detective.';
    }

    return 'The accountant has added your portrait to the wanted database.';
  }

  clearRows() {
    for (const row of this.rows) {
      if (row?.scene) {
        row.destroy(true);
      }
    }

    this.rows = [];
  }

  refresh() {
    if (
      this.destroyed ||
      !this.container
    ) {
      return;
    }

    const state = moneyManager.getState();

    this.summaryText.setText(
      `Cash: ${this.formatMoney(state.cash)}    ` +
      `Agency: ${this.formatMoney(state.agencyBudget)}\n` +
      `Agency debt: ${this.formatMoney(state.agencyDebt)}`
    );

    this.quipText.setText(
      this.getQuip(state.agencyDebt)
    );

    this.refreshList();
  }

  refreshList() {
    if (
      this.destroyed ||
      !this.listContainer
    ) {
      return;
    }

    this.clearRows();

    const entries =
      moneyManager.getRecentTransactions(100);

    const pages = Math.max(
      1,
      Math.ceil(entries.length / PAGE_SIZE)
    );

    this.page = Math.max(
      0,
      Math.min(this.page, pages - 1)
    );

    this.emptyText.setVisible(
      entries.length === 0
    );

    const pageEntries = entries.slice(
      this.page * PAGE_SIZE,
      (this.page + 1) * PAGE_SIZE
    );

    pageEntries.forEach((entry, index) => {
      const row = this.scene.add.container(
        0,
        index * 52
      );

      const category =
        CATEGORIES[entry.category] ||
        entry.category ||
        'Administration';

      const description = String(
        entry.description || category
      );

      const descriptionText = this.text(
        0,
        0,
        description.length > 66
          ? `${description.slice(0, 63)}...`
          : description,
        15
      );

      const date = new Date(entry.createdAt);

      const time = Number.isFinite(date.getTime())
        ? this.dateFormatter.format(date)
        : 'Undated';

      const account =
        entry.source === 'agency'
          ? 'Agency'
          : entry.source === 'cash'
            ? 'Cash'
            : 'Account';

      const detail = this.text(
        0,
        22,
        `${category} / ${account} / ${time}`,
        13,
        '#9f947f'
      );

      const income = [
        'income',
        'refund',
        'mission_settled',
        'mission_started'
      ].includes(entry.type);

      const debt = entry.type === 'debt';

      const prefix = debt
        ? 'DEBT +'
        : income
          ? '+'
          : entry.type === 'reset'
            ? ''
            : '-';

      const amount = this.text(
        this.panelWidth - 48,
        7,
        `${prefix}${this.formatMoney(entry.amount)}`,
        16,
        debt
          ? '#ff7979'
          : income
            ? '#99dc9b'
            : '#ffd166'
      ).setOrigin(1, 0);

      row.add([
        descriptionText,
        detail,
        amount
      ]);

      this.listContainer.add(row);
      this.rows.push(row);
    });

    this.pageLabel.setText(
      `Page ${this.page + 1} / ${pages}`
    );

    this.prevBtn.setAlpha(
      this.page > 0 ? 1 : 0.35
    );

    this.nextBtn.setAlpha(
      this.page < pages - 1 ? 1 : 0.35
    );

    this.pinToScreen();
  }

  changePage(direction) {
    if (this.destroyed || !this.isOpen) {
      return;
    }

    this.page += direction;
    this.refreshList();
  }

  onLedgerKeyDown(event) {
    const element = document.activeElement;

    if (
      this.destroyed ||
      event?.repeat ||
      element?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        element?.tagName
      )
    ) {
      return;
    }

    event?.preventDefault();

    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    if (
      this.destroyed ||
      this.isOpen ||
      !this.scene.sys.isActive() ||
      this.scene.uiLocked
    ) {
      return false;
    }

    // Aktywny samouczek nie blokuje już księgi.
    this.scene.closeAllUIPanels?.();

    this.buildPanel();

    this.page = 0;
    this.layout();
    this.refresh();

    this.isOpen = true;
    this.container.setVisible(true);

    this._notifyPanelState();
    EventBus.emit('hideHUD');

    return true;
  }

  close({ restoreHud = true } = {}) {
    if (this.destroyed || !this.isOpen) {
      return;
    }

    this.isOpen = false;
    this.container?.setVisible(false);

    this._notifyPanelState();

    if (
      restoreHud &&
      !this.scene.saveUI?.isOpen
    ) {
      EventBus.emit('showHUD');
    }
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;

    const wasOpen = this.isOpen;
    this.isOpen = false;

    this.scene.input.keyboard?.off(
      'keydown-B',
      this.boundKeyHandler
    );

    this.scene.scale.off(
      Phaser.Scale.Events.RESIZE,
      this.boundResize
    );

    this.scene.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundShutdown
    );

    this.scene.events.off(
      Phaser.Scenes.Events.DESTROY,
      this.boundShutdown
    );

    window.removeEventListener(
      'lost-artifacts:money-changed',
      this.boundMoneyChange
    );

    this.clearRows();
    this.container?.destroy(true);

    this.container = null;
    this.panel = null;
    this.overlay = null;

    if (wasOpen && !this.scene._cleanupDone) {
      this._notifyPanelState();
    }
  }
}