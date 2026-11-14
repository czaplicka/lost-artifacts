import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { EventBus } from '../EventBus.js';
import { moneyManager } from '../managers/MoneyManager.js';

const PAGE_SIZE = 6;

const CATEGORIES = {
  travel: __dialogueText("ui/AgencyLedgerUI.js", "t_d2b98fb53714f23cc0aa"),
  hotel: __dialogueText("ui/AgencyLedgerUI.js", "t_509b3c4e5dad347d7d5f"),
  food: __dialogueText("ui/AgencyLedgerUI.js", "t_e4eb18069d65aaa901ce"),
  drink: __dialogueText("ui/AgencyLedgerUI.js", "t_e4a060ef35b7525f217c"),
  newspaper: __dialogueText("ui/AgencyLedgerUI.js", "t_15dd241d7efbd9d077c9"),
  phone: __dialogueText("ui/AgencyLedgerUI.js", "t_63dceb8800b2dd4af956"),
  taxi: __dialogueText("ui/AgencyLedgerUI.js", "t_7793c31446e339002451"),
  informant: __dialogueText("ui/AgencyLedgerUI.js", "t_5bec08466556116094d1"),
  side_case: __dialogueText("ui/AgencyLedgerUI.js", "t_f650c3481ebc10f8d9c7"),
  mission_reward: __dialogueText("ui/AgencyLedgerUI.js", "t_8124a5006f733f2325c2"),
  office_upgrade: __dialogueText("ui/AgencyLedgerUI.js", "t_578577a6a87a62b9c205"),
  item: __dialogueText("ui/AgencyLedgerUI.js", "t_652bcc3a478428893cc5"),
  agency_advance: __dialogueText("ui/AgencyLedgerUI.js", "t_bfbef62f454fc28c3e0e"),
  refund: __dialogueText("ui/AgencyLedgerUI.js", "t_6b37bd35081fcbc6676d")
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
      __dialogueText("ui/AgencyLedgerUI.js", "t_b5766dd213b57f075d4e"),
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
      __dialogueText("ui/AgencyLedgerUI.js", "t_0b908e3b4884f1562fe8"),
      14,
      '#bca36c'
    );

    this.listContainer =
      this.scene.add.container(24, 238);

    this.emptyText = this.text(
      0,
      30,
      __dialogueText("ui/AgencyLedgerUI.js", "t_5f4c60662c718c22b803"),
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
      __dialogueText("ui/AgencyLedgerUI.js", "t_86af811671fe29fad1d2"),
      18,
      '#ffd166'
    ).setInteractive({
      useHandCursor: true
    });

    this.nextBtn = this.text(
      w - 110,
      h - 47,
      __dialogueText("ui/AgencyLedgerUI.js", "t_58b85f2ea88bf1a9ba16"),
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
      return __dialogueText("ui/AgencyLedgerUI.js", "t_9eb1a46b64e34f8cf0f2");
    }

    if (debt <= 150) {
      return __dialogueText("ui/AgencyLedgerUI.js", "t_6f7ea8c6498943d24fcf");
    }

    if (debt <= 400) {
      return __dialogueText("ui/AgencyLedgerUI.js", "t_a093f19e2e212db181e7");
    }

    if (debt <= 900) {
      return __dialogueText("ui/AgencyLedgerUI.js", "t_d6d99f95b652ef7c2f18");
    }

    return __dialogueText("ui/AgencyLedgerUI.js", "t_fc1aec7951e2aee49f9a");
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
      `${__dialogueText("ui/AgencyLedgerUI.js", "t_71d0925e29999b762ab6")}${this.formatMoney(state.cash)}${__dialogueText("ui/AgencyLedgerUI.js", "t_1a0f564ddc6039457b2f")}` +
      `${__dialogueText("ui/AgencyLedgerUI.js", "t_3b83bd97552e7b897191")}${this.formatMoney(state.agencyBudget)}${__dialogueText("ui/AgencyLedgerUI.js", "t_01ba4719c80b6fe911b0")}` +
      `${__dialogueText("ui/AgencyLedgerUI.js", "t_4d52d687c3058176d290")}${this.formatMoney(state.agencyDebt)}`
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
        __dialogueText("ui/AgencyLedgerUI.js", "t_4b42c6690ebeb867e967");

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
        : __dialogueText("ui/AgencyLedgerUI.js", "t_f332fef6195ab3d8d86a");

      const account =
        entry.source === 'agency'
          ? __dialogueText("ui/AgencyLedgerUI.js", "t_86f357cfb8c2c1002c12")
          : entry.source === 'cash'
            ? __dialogueText("ui/AgencyLedgerUI.js", "t_e2da108f63008e441619")
            : __dialogueText("ui/AgencyLedgerUI.js", "t_7e1b0d5641f2640ce9a9");

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
        ? __dialogueText("ui/AgencyLedgerUI.js", "t_0aa8c9f301e65c4456f7")
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
      `${__dialogueText("ui/AgencyLedgerUI.js", "t_6076934f99bd42435b95")}${this.page + 1}${__dialogueText("ui/AgencyLedgerUI.js", "t_005e1574a2b5c8163046")}${pages}`
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