// ui/PIOfficeComputerUI.js
import {
  moneyManager,
  MONEY_SOURCE
} from '../managers/MoneyManager.js';

const DESIGN_WIDTH = 1120;
const DESIGN_HEIGHT = 800;

const COLORS = {
  text: '#29313a',
  muted: '#66717a',
  selected: '#173d73',
  titleText: '#ffffff',

  desktop: 0x657f9b,
  window: 0xd7d5ca,
  titlebar: 0x294b70,
  divider: 0xaaa99e
};

export class PIOfficeComputerUI {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = options;

    this.isOpen = false;
    this.suspended = false;
    this.destroyed = false;

    this.app = 'desktop';
    this.selectedId = null;

    this.listPage = 0;
    this.bodyPage = 0;

    this.notice = '';
    this.accepting = false;

    this.layout = null;
    this.window = null;
    this.content = null;

    this.viewToken = 0;

    this.root = scene.add
      .container(0, 0)
      .setDepth(1500)
      .setVisible(false);

    this.onKey = event => {
      if (
        this.destroyed ||
        !this.isOpen ||
        this.suspended
      ) {
        return;
      }

      const target = event.target;

      if (
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          target?.tagName
        )
      ) {
        return;
      }

      if (event.code !== 'Escape') return;

      event.preventDefault();

      if (this.app !== 'desktop') {
        this.openApp('desktop');
      } else {
        this.close();
      }
    };

    this.onResize = () => {
      if (
        this.isOpen &&
        !this.suspended &&
        !this.destroyed
      ) {
        this.render();
      }
    };

    scene.input.keyboard?.on(
      'keydown',
      this.onKey
    );

    scene.scale.on('resize', this.onResize);

    scene.events.once(
      'shutdown',
      this.destroy,
      this
    );
  }

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------

  open() {
    if (this.destroyed || this.isOpen) return;

    this.isOpen = true;
    this.suspended = false;

    this.app = 'desktop';
    this.selectedId = null;
    this.listPage = 0;
    this.bodyPage = 0;
    this.notice = '';

    this.viewToken += 1;

    this.root.setVisible(true);

    this.options.onOpen?.();

    this.render();
  }

  close() {
    if (
      this.destroyed ||
      !this.isOpen ||
      this.suspended
    ) {
      return;
    }

    this.isOpen = false;
    this.suspended = false;
    this.viewToken += 1;

    this.root.setVisible(false);

    this.options.onClose?.();
  }

  suspend() {
    if (this.destroyed || !this.isOpen) return;

    this.suspended = true;
    this.viewToken += 1;

    this.root.setVisible(false);
  }

  resume() {
    if (this.destroyed || !this.isOpen) return;

    this.suspended = false;
    this.app = 'desktop';
    this.notice = '';
    this.viewToken += 1;

    this.root.setVisible(true);

    this.render();
  }

  openApp(app) {
    if (
      this.destroyed ||
      !this.isOpen ||
      this.suspended
    ) {
      return;
    }

    if (app === 'investigations') {
      this.launchExternal(
        this.options.onOpenInvestigations,
        'The investigation board is currently unavailable.'
      );

      return;
    }

    if (app === 'travel') {
      this.launchExternal(
        this.options.onOpenWorldTravel,
        'World travel is currently unavailable.'
      );

      return;
    }

    const allowed = new Set([
      'desktop',
      'mail',
      'ledger',
      'classifieds'
    ]);

    if (!allowed.has(app)) return;

    this.app = app;
    this.selectedId = null;
    this.listPage = 0;
    this.bodyPage = 0;
    this.notice = '';

    this.viewToken += 1;

    this.render();
  }

  launchExternal(callback, unavailableMessage) {
    if (typeof callback !== 'function') {
      this.notice = unavailableMessage;
      this.render();
      return;
    }

    try {
      const result = callback();

      if (result?.catch) {
        result.catch(error => {
          this.handleExternalError(
            error,
            unavailableMessage
          );
        });
      }
    } catch (error) {
      this.handleExternalError(
        error,
        unavailableMessage
      );
    }
  }

  handleExternalError(error, message) {
    console.error(
      '[PIOfficeComputerUI] Application failed:',
      error
    );

    if (this.destroyed || !this.isOpen) return;

    if (this.suspended) {
      this.resume();
    }

    this.notice = message;
    this.render();
  }

  // ------------------------------------------------------------------
  // Data
  // ------------------------------------------------------------------

  getMail() {
    const supplied = this.options.getMail?.();

    if (Array.isArray(supplied)) {
      return supplied.filter(item => item && item.id);
    }

    const data =
      this.scene.cache.json.get('piOfficeMail');

    return Array.isArray(data?.messages)
      ? data.messages.filter(item => item && item.id)
      : [];
  }

  getClassifieds() {
    const supplied = this.options.getClassifieds?.();

    if (Array.isArray(supplied)) {
      return supplied.filter(item => item && item.id);
    }

    const data =
      this.scene.cache.json.get('piOfficeClassifieds');

    return Array.isArray(data?.advertisements)
      ? data.advertisements.filter(
          item => item && item.id
        )
      : [];
  }

getLedger() {
  const state = moneyManager.getState();

  const transactions = state.moneyLog
    .filter(transaction => {
      return (
        transaction &&
        transaction.source === MONEY_SOURCE.CASH &&
        transaction.type === 'expense' &&
        Number.isFinite(transaction.amount) &&
        transaction.amount >= 0
      );
    })
    .map(transaction => ({
      id: transaction.id,

      type: 'expense',
      source: transaction.source,
      amount: transaction.amount,

      description:
        transaction.description ||
        'Unspecified expense',

      date: this.formatLedgerDate(
        transaction.createdAt
      ),

      createdAt: transaction.createdAt,
      category: transaction.category,
      missionId: transaction.missionId
    }));

  return {
    balance: state.cash,
    transactions
  };
}

  money(value) {
    if (!Number.isFinite(value)) return 'Unknown';

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  // ------------------------------------------------------------------
  // Drawing helpers
  // ------------------------------------------------------------------

  addToContent(object) {
    (this.content || this.root).add(object);
    return object;
  }

  text(
    x,
    y,
    value,
    size = 17,
    color = COLORS.text,
    wrap = 0
  ) {
    return this.addToContent(
      this.scene.add.text(
        x,
        y,
        value == null ? '' : String(value),
        {
          fontFamily: 'monospace',
          fontSize: `${size}px`,
          color,

          wordWrap: wrap > 0
            ? { width: wrap }
            : undefined
        }
      )
    );
  }

  rectangle(
    x,
    y,
    width,
    height,
    color,
    alpha = 1
  ) {
    return this.addToContent(
      this.scene.add
        .rectangle(
          x,
          y,
          width,
          height,
          color,
          alpha
        )
        .setOrigin(0)
    );
  }

  bevel(
    x,
    y,
    width,
    height,
    fill = 0xc8c5b9,
    inset = false
  ) {
    const graphics = this.scene.add.graphics();

    this.addToContent(graphics);

    const light = inset
      ? 0x55584f
      : 0xf1eee1;

    const dark = inset
      ? 0xf1eee1
      : 0x55584f;

    graphics.fillStyle(fill, 1);
    graphics.fillRect(x, y, width, height);

    graphics.lineStyle(3, light, 1);

    graphics.beginPath();
    graphics.moveTo(x, y + height);
    graphics.lineTo(x, y);
    graphics.lineTo(x + width, y);
    graphics.strokePath();

    graphics.lineStyle(3, dark, 1);

    graphics.beginPath();
    graphics.moveTo(x + width, y);
    graphics.lineTo(x + width, y + height);
    graphics.lineTo(x, y + height);
    graphics.strokePath();

    return graphics;
  }

  button(
    x,
    y,
    label,
    callback,
    enabled = true
  ) {
    const object = this.text(
      x,
      y,
      label,
      15,
      enabled ? COLORS.text : '#818181'
    );

    object
      .setPadding(10, 7, 10, 7)
      .setBackgroundColor('#d0cec6');

    if (enabled) {
      object
        .setInteractive({ useHandCursor: true })

        .on('pointerover', () => {
          object.setBackgroundColor('#e3e1d8');
        })

        .on('pointerout', () => {
          object.setBackgroundColor('#d0cec6');
        })

        .on('pointerdown', callback);
    }

    return object;
  }

  // ------------------------------------------------------------------
  // Monitor
  // ------------------------------------------------------------------

  render() {
    if (
      this.destroyed ||
      !this.isOpen ||
      this.suspended
    ) {
      return;
    }

    this.content = null;
    this.root.removeAll(true);

    const { width, height } = this.scene.scale;

    const blocker = this.scene.add
      .rectangle(
        0,
        0,
        width,
        height,
        0x090b10,
        0.94
      )
      .setOrigin(0)
      .setInteractive();

    this.root.add(blocker);

    const scale = Math.max(
      0.01,
      Math.min(
        Math.max(1, width - 16) / DESIGN_WIDTH,
        Math.max(1, height - 16) / DESIGN_HEIGHT
      )
    );

    this.content = this.scene.add
      .container(
        (width - DESIGN_WIDTH * scale) / 2,
        (height - DESIGN_HEIGHT * scale) / 2
      )
      .setScale(scale);

    this.root.add(this.content);

    // Desk.
    this.rectangle(
      0, 735, 1120, 65,
      0x382b28
    );

    this.rectangle(
      0, 735, 1120, 8,
      0x765443
    );

    // Monitor shadow and stand.
    this.rectangle(
      95, 725, 930, 20,
      0x17191b,
      0.6
    );

    this.bevel(
      465, 704, 190, 39,
      0x77766d
    );

    this.bevel(
      380, 741, 360, 27,
      0xa8a697
    );

    // Monitor casing.
    this.bevel(
      35, 18, 1050, 694,
      0xb3b09f
    );

    this.bevel(
      52, 35, 1016, 627,
      0x77796f,
      true
    );

    this.bevel(
      67, 49, 986, 595,
      0x151d24,
      true
    );

    this.layout = {
      x: 78,
      y: 60,
      w: 964,
      h: 572
    };

    this.drawWallpaper();
    this.drawTaskbar();

    if (this.app === 'desktop') {
      this.renderDesktop();
    } else {
      this.renderApplication();
    }

    this.drawMonitorDetails();
  }

  drawMonitorDetails() {
    this.text(
      76,
      678,
      'NIGHT OWL',
      17,
      '#343c39'
    );

    this.text(
      237,
      680,
      'PERSONAL COMPUTER',
      11,
      '#575c50'
    );

    for (let index = 0; index < 9; index++) {
      this.rectangle(
        740 + index * 14,
        675,
        7,
        17,
        0x64665b
      );
    }

    this.rectangle(
      934,
      679,
      8,
      8,
      0x85d87c
    );

    this.button(
      960,
      670,
      'OFF',
      () => this.close()
    );
  }

  // ------------------------------------------------------------------
  // Wallpaper
  // ------------------------------------------------------------------

  drawWallpaper() {
    const { x, y, w, h } = this.layout;
    const desktopHeight = h - 36;

    const wallpaperKey =
      this.options.wallpaperKey ||
      'pi_computer_wallpaper';

    if (this.scene.textures.exists(wallpaperKey)) {
      const image = this.scene.add
        .image(x, y, wallpaperKey)
        .setOrigin(0)
        .setDisplaySize(w, desktopHeight);

      this.content.add(image);
      return;
    }

    // Built-in wallpaper: sky, sun, mountains and river.
    this.rectangle(
      x, y, w, desktopHeight,
      COLORS.desktop
    );

    this.rectangle(
      x, y + 135, w, 145,
      0x92a5ad
    );

    const graphics = this.scene.add.graphics();
    this.content.add(graphics);

    graphics.fillStyle(0xdac9a0);
    graphics.fillCircle(
      x + w - 185,
      y + 100,
      48
    );

    graphics.fillStyle(0x526875);

    graphics.fillTriangle(
      x,
      y + 340,
      x + 310,
      y + 160,
      x + 570,
      y + 340
    );

    graphics.fillTriangle(
      x + 310,
      y + 340,
      x + 660,
      y + 135,
      x + w,
      y + 340
    );

    graphics.fillStyle(0x354d50);

    graphics.fillTriangle(
      x,
      y + 415,
      x + 380,
      y + 245,
      x + 760,
      y + 415
    );

    graphics.fillTriangle(
      x + 430,
      y + 415,
      x + 830,
      y + 265,
      x + w,
      y + 415
    );

    graphics.fillStyle(0x263f3e);

    graphics.fillRect(
      x,
      y + 410,
      w,
      desktopHeight - 410
    );

    graphics.fillStyle(0x8da6ad);

    graphics.fillPoints(
      [
        { x: x + 620, y: y + 340 },
        { x: x + 660, y: y + 340 },
        {
          x: x + 540,
          y: y + desktopHeight
        },
        {
          x: x + 310,
          y: y + desktopHeight
        }
      ],
      true
    );

    // A few small clouds.
    graphics.fillStyle(0xd0d5c9, 0.65);
    graphics.fillRect(x + 225, y + 70, 85, 8);
    graphics.fillRect(x + 245, y + 62, 45, 8);
    graphics.fillRect(x + 475, y + 105, 110, 7);
  }

  // ------------------------------------------------------------------
  // Desktop and taskbar
  // ------------------------------------------------------------------

  drawTaskbar() {
    const { x, y, w, h } = this.layout;
    const taskbarY = y + h - 36;

    this.bevel(
      x,
      taskbarY,
      w,
      36,
      0xc8c5b9
    );

    this.button(
      x + 5,
      taskbarY + 2,
      'DESKTOP',
      () => this.openApp('desktop')
    );

    const names = {
      desktop: 'Night Owl OS',
      mail: 'Mail',
      ledger: 'Personal Ledger',
      classifieds: 'Classifieds'
    };

    this.bevel(
      x + 125,
      taskbarY + 5,
      230,
      26,
      0xb4b5ad,
      true
    );

    this.text(
      x + 135,
      taskbarY + 10,
      names[this.app] || 'Night Owl OS',
      13,
      '#333c3c'
    );

    this.bevel(
      x + w - 120,
      taskbarY + 5,
      110,
      26,
      0xb4b5ad,
      true
    );

    this.text(
      x + w - 109,
      taskbarY + 10,
      'PI TERMINAL',
      12,
      '#333c3c'
    );
  }

  renderDesktop() {
    const { x, y, w, h } = this.layout;

    const entries = [
      [
        'mail',
        'Mail',
        'envelope',
        0xe6d9ab
      ],
      [
        'ledger',
        'Personal\nLedger',
        'ledger',
        0xa5c397
      ],
      [
        'classifieds',
        'Classifieds',
        'paper',
        0xd1d6d8
      ],
      [
        'investigations',
        'Investigations',
        'board',
        0xc69d7d
      ],
      [
        'travel',
        'World\nTravel',
        'globe',
        0x98b9ce
      ]
    ];

    entries.forEach(
      ([app, label, kind, color], index) => {
        this.createDesktopIcon(
          x + 12,
          y + 10 + index * 98,
          128,
          label,
          kind,
          color,
          () => this.openApp(app)
        );
      }
    );

    this.text(
      x + w - 22,
      y + 22,
      'NIGHT OWL\nOPERATING SYSTEM',
      17,
      '#dce3d6'
    )
      .setOrigin(1, 0)
      .setAlign('right')
      .setShadow(
        2, 2, '#26373f', 0, true, true
      );

    if (this.notice) {
      this.bevel(
        x + 180,
        y + h - 112,
        w - 210,
        58,
        0xd7d5ca
      );

      this.text(
        x + 194,
        y + h - 99,
        this.notice,
        14,
        COLORS.text,
        w - 240
      );
    }
  }

  createDesktopIcon(
    x,
    y,
    width,
    label,
    kind,
    color,
    callback
  ) {
    const hit = this.rectangle(
      x,
      y,
      width,
      94,
      0x153e75,
      0
    ).setInteractive({
      useHandCursor: true
    });

    const graphics = this.scene.add.graphics();
    this.content.add(graphics);

    const cx = x + width / 2;
    const top = y + 5;

    graphics.lineStyle(2, 0x26333b);
    graphics.fillStyle(color);

    if (kind === 'envelope') {
      graphics.fillRect(
        cx - 24, top + 8, 48, 33
      );

      graphics.strokeRect(
        cx - 24, top + 8, 48, 33
      );

      graphics.beginPath();
      graphics.moveTo(cx - 23, top + 9);
      graphics.lineTo(cx, top + 27);
      graphics.lineTo(cx + 23, top + 9);
      graphics.strokePath();
    } else if (kind === 'ledger') {
      graphics.fillRect(
        cx - 20, top, 40, 47
      );

      graphics.strokeRect(
        cx - 20, top, 40, 47
      );

      graphics.lineBetween(
        cx - 11,
        top + 1,
        cx - 11,
        top + 46
      );

      for (let row = 0; row < 3; row++) {
        graphics.lineBetween(
          cx - 4,
          top + 13 + row * 9,
          cx + 13,
          top + 13 + row * 9
        );
      }
    } else if (kind === 'board') {
      graphics.fillRect(
        cx - 27, top + 2, 54, 42
      );

      graphics.strokeRect(
        cx - 27, top + 2, 54, 42
      );

      graphics.fillStyle(0xf0dfac);

      graphics.fillRect(
        cx - 21, top + 9, 16, 18
      );

      graphics.fillRect(
        cx + 7, top + 21, 15, 17
      );

      graphics.lineStyle(2, 0xa23232);

      graphics.lineBetween(
        cx - 13,
        top + 17,
        cx + 14,
        top + 29
      );

      graphics.fillStyle(0xa23232);
      graphics.fillCircle(cx - 13, top + 12, 2);
      graphics.fillCircle(cx + 14, top + 24, 2);
    } else if (kind === 'globe') {
      graphics.fillCircle(cx, top + 23, 23);
      graphics.strokeCircle(cx, top + 23, 23);

      graphics.strokeEllipse(
        cx, top + 23, 21, 46
      );

      graphics.strokeEllipse(
        cx, top + 23, 46, 18
      );

      graphics.lineBetween(
        cx - 23,
        top + 23,
        cx + 23,
        top + 23
      );
    } else {
      graphics.fillRect(
        cx - 22, top, 44, 47
      );

      graphics.strokeRect(
        cx - 22, top, 44, 47
      );

      graphics.fillStyle(0x647585);

      graphics.fillRect(
        cx - 15, top + 7, 15, 12
      );

      for (let row = 0; row < 3; row++) {
        graphics.lineBetween(
          cx - 15,
          top + 26 + row * 6,
          cx + 15,
          top + 26 + row * 6
        );
      }
    }

    this.text(
      cx,
      y + 55,
      label,
      14,
      '#ffffff',
      width - 4
    )
      .setOrigin(0.5, 0)
      .setAlign('center')
      .setShadow(
        1, 1, '#17242f', 0, true, true
      );

    hit.on('pointerover', () => {
      hit.setFillStyle(0x153e75, 0.7);
    });

    hit.on('pointerout', () => {
      hit.setFillStyle(0x153e75, 0);
    });

    hit.on('pointerdown', callback);
  }

  // ------------------------------------------------------------------
  // Application window
  // ------------------------------------------------------------------

  renderApplication() {
    const { x, y, w, h } = this.layout;

    this.window = {
      x: x + 24,
      y: y + 18,
      w: w - 48,
      h: h - 74
    };

    const box = this.window;

    this.rectangle(
      box.x + 7,
      box.y + 7,
      box.w,
      box.h,
      0x101b24,
      0.4
    );

    this.bevel(
      box.x,
      box.y,
      box.w,
      box.h,
      COLORS.window
    );

    this.rectangle(
      box.x + 4,
      box.y + 4,
      box.w - 8,
      34,
      COLORS.titlebar
    );

    const titles = {
      mail: 'Mail — Private correspondence',
      ledger: 'Personal Ledger — Private funds',
      classifieds: 'Classifieds — City notices'
    };

    this.text(
      box.x + 13,
      box.y + 12,
      titles[this.app] || 'Application',
      16,
      COLORS.titleText
    );

    this.button(
      box.x + box.w - 43,
      box.y + 5,
      'X',
      () => this.openApp('desktop')
    );

    if (this.app === 'ledger') {
      this.renderLedger();
    } else {
      this.renderDocuments();
    }

    // Persistent application status area.
    this.bevel(
      box.x + 8,
      box.y + box.h - 35,
      box.w - 16,
      26,
      0xc3c2b7,
      true
    );

    const status = this.notice || (
      this.app === 'mail'
        ? 'Private correspondence'
        : this.app === 'ledger'
          ? 'Personal funds — separate from agency finances'
          : 'Local notices and private enquiries'
    );

    this.text(
      box.x + 16,
      box.y + box.h - 29,
      status,
      12,
      '#3a3428',
      box.w - 32
    );
  }

  // ------------------------------------------------------------------
  // Mail and classifieds
  // ------------------------------------------------------------------

  renderDocuments() {
    const box = this.window;
    const isMail = this.app === 'mail';

    const items = isMail
      ? this.getMail()
      : this.getClassifieds();

    if (!items.length) {
      this.text(
        box.x + 18,
        box.y + 65,
        isMail
          ? 'No messages available.'
          : 'No advertisements available.',
        17
      );

      return;
    }

    const listW = 270;

    const perPage = Math.max(
      1,
      Math.floor((box.h - 150) / 64)
    );

    const pages = Math.max(
      1,
      Math.ceil(items.length / perPage)
    );

    this.listPage = Phaser.Math.Clamp(
      this.listPage,
      0,
      pages - 1
    );

    const visible = items.slice(
      this.listPage * perPage,
      (this.listPage + 1) * perPage
    );

    const selected = (
      visible.find(
        item => item.id === this.selectedId
      ) ||
      visible[0]
    );

    this.selectedId = selected.id;

    this.bevel(
      box.x + 9,
      box.y + 48,
      listW - 8,
      box.h - 95,
      0xe7e5dc,
      true
    );

    this.rectangle(
      box.x + listW + 2,
      box.y + 48,
      1,
      box.h - 95,
      COLORS.divider
    );

    visible.forEach((item, index) => {
      const rowY = box.y + 55 + index * 64;
      const title = isMail
        ? item.subject
        : item.title;

      const isSelected = item.id === selected.id;

      const rowBg = this.rectangle(
        box.x + 14,
        rowY,
        listW - 24,
        60,
        isSelected ? 0x294b70 : 0xe7e5dc
      ).setInteractive({
        useHandCursor: true
      });

      this.text(
        box.x + 22,
        rowY + 7,
        title || 'Untitled',
        14,
        isSelected ? '#ffffff' : COLORS.text,
        listW - 42
      );

      rowBg.on('pointerdown', () => {
        this.selectedId = item.id;
        this.bodyPage = 0;
        this.notice = '';
        this.viewToken += 1;

        this.render();
      });
    });

    const pageY = box.y + box.h - 77;

    this.button(
      box.x + 13,
      pageY,
      '<',
      () => {
        this.changeListPage(-1, pages);
      },
      pages > 1
    );

    this.text(
      box.x + 67,
      pageY + 8,
      `${this.listPage + 1}/${pages}`,
      13
    );

    this.button(
      box.x + 126,
      pageY,
      '>',
      () => {
        this.changeListPage(1, pages);
      },
      pages > 1
    );

    const detailX = box.x + listW + 18;
    const detailW = box.w - listW - 35;

    const metadata = isMail
      ? [
          `From: ${selected.from || 'Unknown sender'}`,
          `Date: ${selected.date || 'Unknown'}`
        ].join('\n')
      : [
          selected.kind === 'pi'
            ? 'PI JOB'
            : 'ODDITIES',

          `Contact: ${selected.contact || 'Not provided'}`,

          Number.isFinite(selected.reward)
            ? `Offered payment: ${this.money(selected.reward)}`
            : null
        ].filter(Boolean).join('\n');

    const content = [
      isMail
        ? selected.subject || 'Untitled message'
        : selected.title || 'Untitled advertisement',
      '',
      metadata,
      '',
      isMail
        ? selected.body || ''
        : selected.description || ''
    ].join('\n');

    const hasJobButton =
      !isMail && selected.kind === 'pi';

    this.renderPagedText(
      content,
      detailX,
      box.y + 56,
      detailW,
      box.h - (hasJobButton ? 150 : 105)
    );

    if (hasJobButton) {
      const connected = (
        typeof this.options.onAcceptMission === 'function' &&
        Boolean(selected.missionId)
      );

      this.button(
        detailX,
        pageY,
        this.accepting
          ? 'PLEASE WAIT...'
          : connected
            ? 'ACCEPT JOB'
            : 'APPLICATIONS UNAVAILABLE',
        () => {
          void this.acceptMission(selected);
        },
        connected && !this.accepting
      );
    }
  }

  changeListPage(direction, pages) {
    this.listPage = (
      this.listPage + direction + pages
    ) % pages;

    this.selectedId = null;
    this.bodyPage = 0;
    this.notice = '';
    this.viewToken += 1;

    this.render();
  }

  // ------------------------------------------------------------------
  // Paginated text
  // ------------------------------------------------------------------

  renderPagedText(
    content,
    x,
    y,
    width,
    height
  ) {
    const fontSize = 16;
    const lineSpacing = 4;

    const measure = this.scene.add.text(
      0,
      0,
      '',
      {
        fontFamily: 'monospace',
        fontSize: `${fontSize}px`,
        wordWrap: { width }
      }
    );

    const lines = measure.getWrappedText(
      content || ''
    );

    const measuredLineHeight = Math.max(
      fontSize,
      measure.getTextMetrics().fontSize
    ) + lineSpacing;

    measure.destroy();

    const perPage = Math.max(
      1,
      Math.floor(
        (height - 40) / measuredLineHeight
      )
    );

    const pages = Math.max(
      1,
      Math.ceil(lines.length / perPage)
    );

    this.bodyPage = Phaser.Math.Clamp(
      this.bodyPage,
      0,
      pages - 1
    );

    this.text(
      x,
      y,
      lines.slice(
        this.bodyPage * perPage,
        (this.bodyPage + 1) * perPage
      ).join('\n'),
      fontSize
    ).setLineSpacing(lineSpacing);

    if (pages <= 1) return;

    const footerY = y + height - 31;

    this.button(
      x,
      footerY,
      '<',
      () => {
        this.bodyPage = (
          this.bodyPage - 1 + pages
        ) % pages;

        this.render();
      }
    );

    this.text(
      x + 52,
      footerY + 8,
      `${this.bodyPage + 1}/${pages}`,
      13
    );

    this.button(
      x + 114,
      footerY,
      '>',
      () => {
        this.bodyPage = (
          this.bodyPage + 1
        ) % pages;

        this.render();
      }
    );
  }

  // ------------------------------------------------------------------
  // Personal ledger
  // ------------------------------------------------------------------

  renderLedger() {
  const box = this.window;
  const ledger = this.getLedger();

  const formatDate = value => {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    // Keep fictional game dates unchanged.
    if (typeof value === 'string') {
      // Format plain ISO dates without a timezone conversion.
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

      if (match) {
        return `${match[3]}/${match[2]}/${match[1]}`;
      }

      return value;
    }

    return String(value);
  };

  const expenses = ledger.transactions
    .filter(transaction => {
      const amount = transaction.amount;

      if (
        amount === null ||
        amount === undefined ||
        amount === ''
      ) {
        return false;
      }

      const numericAmount = Number(amount);

      if (!Number.isFinite(numericAmount)) return false;

      // Standard ledger: negative amounts represent expenses.
      // Explicit expense entries may also store positive amounts.
return (
  transaction.type === 'expense' &&
  numericAmount >= 0
);
    })
    .map(transaction => ({
      id: transaction.id,
      date: formatDate(transaction.date),
      description:
        transaction.description ||
        transaction.name ||
        'Unspecified expense',
      expense: Math.abs(Number(transaction.amount))
    }));

  const total = expenses.reduce(
    (sum, entry) => sum + entry.expense,
    0
  );

  const paperX = box.x + 14;
  const paperY = box.y + 48;
  const paperW = box.w - 28;
  const paperH = box.h - 92;

  // Account book page.
  this.rectangle(
    paperX,
    paperY,
    paperW,
    paperH,
    0xeee8d4
  ).setStrokeStyle(1, 0xa7a18b);

  this.rectangle(
    paperX + 5,
    paperY + 4,
    paperW - 10,
    4,
    0xf9f5e9
  );

  // Binding.
  this.rectangle(
    paperX,
    paperY,
    12,
    paperH,
    0xc5bda3
  );

  for (let index = 0; index < 7; index++) {
    this.rectangle(
      paperX + 3,
      paperY + 22 + index * 48,
      4,
      15,
      0x807966
    );
  }

  this.text(
    paperX + 28,
    paperY + 17,
    'PERSONAL EXPENSES',
    21,
    '#35372f'
  );

  const balance = Number.isFinite(ledger.balance)
    ? this.money(ledger.balance)
    : 'Not connected';

  this.text(
    paperX + paperW - 18,
    paperY + 20,
    `Balance: ${balance}`,
    15,
    '#494d3e'
  ).setOrigin(1, 0);

  this.text(
    paperX + 28,
    paperY + 48,
    'Private account — agency expenses are not included.',
    12,
    '#77735f'
  );

  const tableX = paperX + 25;
  const tableY = paperY + 77;
  const tableW = paperW - 42;

  const headerH = 30;
  const rowH = 29;

  const dateW = 135;
  const expenseW = 155;
  const descriptionW = tableW - dateW - expenseW;

  const dateX = tableX + 10;
  const descriptionX = tableX + dateW + 10;
  const expenseRight = tableX + tableW - 12;

  // Reserve space for totals and pagination.
  const availableRowsHeight = paperH - 170;

  const perPage = Math.max(
    1,
    Math.floor(availableRowsHeight / rowH)
  );

  const pages = Math.max(
    1,
    Math.ceil(expenses.length / perPage)
  );

  this.listPage = Phaser.Math.Clamp(
    this.listPage,
    0,
    pages - 1
  );

  const visible = expenses.slice(
    this.listPage * perPage,
    (this.listPage + 1) * perPage
  );

  this.rectangle(
    tableX,
    tableY,
    tableW,
    headerH,
    0xc9c3aa
  );

  this.text(
    dateX,
    tableY + 7,
    'DATE',
    13,
    '#424536'
  );

  this.text(
    descriptionX,
    tableY + 7,
    'DESCRIPTION',
    13,
    '#424536'
  );

  this.text(
    expenseRight,
    tableY + 7,
    'EXPENSE',
    13,
    '#424536'
  ).setOrigin(1, 0);

  const tableBottom =
    tableY + headerH + perPage * rowH;

  // Ruled rows, including empty ones.
  for (let index = 0; index < perPage; index++) {
    const rowY = tableY + headerH + index * rowH;
    const entry = visible[index];

    if (index % 2 === 0) {
      this.rectangle(
        tableX,
        rowY,
        tableW,
        rowH,
        0xe4ddc5
      );
    }

    this.rectangle(
      tableX,
      rowY + rowH - 1,
      tableW,
      1,
      0xc6bea5
    );

    if (!entry) continue;

    const dateText = this.text(
      dateX,
      rowY + 7,
      entry.date,
      14,
      '#555747'
    );

    const descriptionText = this.text(
      descriptionX,
      rowY + 7,
      entry.description,
      14,
      '#33392f'
    );

    // Keep long labels inside their columns.
    const fitText = (object, value, maxWidth) => {
      let shortened = String(value);

      object.setText(shortened);

      while (
        object.width > maxWidth &&
        shortened.length > 0
      ) {
        shortened = shortened.slice(0, -1);
        object.setText(`${shortened}…`);
      }
    };

    fitText(dateText, entry.date, dateW - 20);

    fitText(
      descriptionText,
      entry.description,
      descriptionW - 20
    );

    this.text(
      expenseRight,
      rowY + 7,
      this.money(entry.expense),
      14,
      '#8b3d31'
    ).setOrigin(1, 0);
  }

  // Column rules.
  const tableHeight = tableBottom - tableY;

  this.rectangle(
    tableX + dateW,
    tableY,
    1,
    tableHeight,
    0xb5ad94
  );

  this.rectangle(
    tableX + tableW - expenseW,
    tableY,
    1,
    tableHeight,
    0xb5ad94
  );

  if (!expenses.length) {
    this.text(
      descriptionX,
      tableY + headerH + 8,
      'No expenses recorded.',
      14,
      '#77735f'
    );
  }

  const footerY = tableBottom + 13;

  this.button(
    tableX,
    footerY,
    '<',
    () => {
      this.listPage = (
        this.listPage - 1 + pages
      ) % pages;

      this.render();
    },
    pages > 1
  );

  this.text(
    tableX + 53,
    footerY + 8,
    `Page ${this.listPage + 1} / ${pages}`,
    12,
    '#67634f'
  );

  this.button(
    tableX + 165,
    footerY,
    '>',
    () => {
      this.listPage = (
        this.listPage + 1
      ) % pages;

      this.render();
    },
    pages > 1
  );

  this.text(
    expenseRight,
    footerY + 7,
    `TOTAL SPENT: ${this.money(total)}`,
    15,
    '#743c31'
  ).setOrigin(1, 0);
}

  // ------------------------------------------------------------------
  // Accepting PI jobs
  // ------------------------------------------------------------------

  async acceptMission(advert) {
    if (
      this.accepting ||
      this.destroyed ||
      !this.isOpen ||
      this.suspended ||
      this.app !== 'classifieds' ||
      typeof this.options.onAcceptMission !== 'function' ||
      !advert?.missionId
    ) {
      return;
    }

    const token = this.viewToken;
    const advertId = advert.id;

    this.accepting = true;
    this.notice = '';
    this.render();

    let message = '';

    try {
      const result =
        await this.options.onAcceptMission(advert);

      message = result?.ok
        ? (result.message || 'Job accepted.')
        : (
            result?.message ||
            'This job could not be accepted.'
          );
    } catch (error) {
      console.error(
        '[PIOfficeComputerUI] Accept job failed:',
        error
      );

      message =
        'Could not accept this job. Please try again.';
    } finally {
      this.accepting = false;

      if (
        !this.destroyed &&
        this.isOpen &&
        !this.suspended
      ) {
        if (
          token === this.viewToken &&
          this.app === 'classifieds' &&
          this.selectedId === advertId
        ) {
          this.notice = message;
        }

        this.render();
      }
    }
  }

  // ------------------------------------------------------------------
  // Cleanup
  // ------------------------------------------------------------------

  destroy() {
    if (this.destroyed) return;

    // Allow cleanup while an external app has suspended the desktop.
    this.suspended = false;
    this.close();

    this.destroyed = true;
    this.viewToken += 1;

    this.scene.input.keyboard?.off(
      'keydown',
      this.onKey
    );

    this.scene.scale.off(
      'resize',
      this.onResize
    );

    this.scene.events.off(
      'shutdown',
      this.destroy,
      this
    );

    this.root?.destroy(true);

    this.root = null;
    this.content = null;
    this.layout = null;
    this.window = null;
  }
}