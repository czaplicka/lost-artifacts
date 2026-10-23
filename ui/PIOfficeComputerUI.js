// ui/PIOfficeComputerUI.js

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

    this.root = scene.add.container(0, 0)
      .setDepth(1500)
      .setVisible(false);

    this.onKey = event => {
if (
  !this.isOpen ||
  this.suspended ||
  event.code !== 'Escape'
) {
  return;
}

      const target = event.target;

      if (
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)
      ) {
        return;
      }

      event.preventDefault();

      if (this.app !== 'desktop') {
        this.openApp('desktop');
      } else {
        this.close();
      }
    };

    scene.input.keyboard?.on('keydown', this.onKey);
    scene.events.once('shutdown', this.destroy, this);
  }

  open() {
  if (this.destroyed || this.isOpen) return;

  this.isOpen = true;
  this.suspended = false;
  this.app = 'desktop';
  this.notice = '';

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

  this.root.setVisible(false);
  this.options.onClose?.();
}

suspend() {
  if (this.destroyed || !this.isOpen) return;

  this.suspended = true;
  this.root.setVisible(false);
}

resume() {
  if (this.destroyed || !this.isOpen) return;

  this.suspended = false;
  this.app = 'desktop';
  this.notice = '';

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
    this.options.onOpenInvestigations?.();
    return;
  }

  if (app === 'travel') {
    this.options.onOpenWorldTravel?.();
    return;
  }

  this.app = app;
  this.selectedId = null;
  this.listPage = 0;
  this.bodyPage = 0;
  this.notice = '';

  this.render();
}

  getMail() {
    const supplied = this.options.getMail?.();

    if (Array.isArray(supplied)) return supplied;

    const data = this.scene.cache.json.get('piOfficeMail');

    return Array.isArray(data?.messages)
      ? data.messages
      : [];
  }

  getClassifieds() {
    const supplied = this.options.getClassifieds?.();

    if (Array.isArray(supplied)) return supplied;

    const data = this.scene.cache.json.get('piOfficeClassifieds');

    return Array.isArray(data?.advertisements)
      ? data.advertisements
      : [];
  }

  getLedger() {
    return this.options.getLedger?.() ?? {
      balance: null,
      transactions: []
    };
  }

  money(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  text(x, y, value, size = 17, color = '#d7ead8', wrap = 0) {
    const object = this.scene.add.text(x, y, value, {
      fontFamily: 'monospace',
      fontSize: `${size}px`,
      color,
      wordWrap: wrap > 0 ? { width: wrap } : undefined
    });

    this.root.add(object);
    return object;
  }

  rectangle(x, y, w, h, color, alpha = 1) {
    const object = this.scene.add
      .rectangle(x, y, w, h, color, alpha)
      .setOrigin(0);

    this.root.add(object);
    return object;
  }

  button(x, y, label, callback, enabled = true) {
    const object = this.text(
      x, y, label, 15,
      enabled ? '#e5f1ed' : '#7c9293'
    );

    object
      .setPadding(8, 6, 8, 6)
      .setBackgroundColor('#263d46');

    if (enabled) {
      object
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', callback);
    }

    return object;
  }

  render() {
if (
  this.destroyed ||
  !this.isOpen ||
  this.suspended
) {
  return;
}

    this.root.removeAll(true);

    const { width, height } = this.scene.scale;

    const outerW = Math.min(1140, width - 20);
    const outerH = Math.min(780, height - 20);
    const outerX = (width - outerW) / 2;
    const outerY = (height - outerH) / 2;

    this.rectangle(0, 0, width, height, 0x000000, 0.85)
      .setInteractive();

    // Monitor casing.
    this.rectangle(
      outerX, outerY, outerW, outerH, 0xaaa697
    ).setStrokeStyle(3, 0x514f47).setInteractive();

    const x = outerX + 18;
    const y = outerY + 18;
    const w = outerW - 36;
    const h = outerH - 58;

    this.layout = { x, y, w, h };

    // Screen.
    this.rectangle(x, y, w, h, 0x153b3c)
      .setStrokeStyle(3, 0x292e2c);

    this.text(
      outerX + 22,
      outerY + outerH - 29,
      'PI SYSTEMS / PERSONAL TERMINAL',
      12,
      '#343b36'
    );

    // Screen taskbar.
    this.rectangle(x, y + h - 40, w, 40, 0x12262e);

    this.button(
      x + 8,
      y + h - 35,
      'DESKTOP',
      () => this.openApp('desktop')
    );

    this.button(
      x + w - 110,
      y + h - 35,
      'POWER OFF',
      () => this.close()
    );

    if (this.app === 'desktop') {
      this.renderDesktop();
    } else {
      this.renderApplication();
    }
  }

  renderDesktop() {
  const { x, y, w, h } = this.layout;

  this.text(
    x + w - 24,
    y + 24,
    'PRIVATE INVESTIGATOR',
    20,
    '#74a5a0'
  ).setOrigin(1, 0);

  const entries = [
    ['mail', 'Mail', 'envelope', 0xe7d49a],
    ['ledger', 'Personal Ledger', 'ledger', 0x9bd39d],
    ['classifieds', 'Classifieds', 'paper', 0xaec9e8],
    ['investigations', 'Investigations', 'board', 0xd8b19b],
    ['travel', 'World Travel', 'globe', 0x9bd1d8]
  ];

  const columns = w >= 650 ? 3 : 2;
  const cellW = Math.min(190, (w - 32) / columns);
  const rows = Math.ceil(entries.length / columns);

  const availableHeight = Math.max(180, h - 140);
  const cellH = Math.min(142, availableHeight / rows);

  entries.forEach(([app, label, icon, color], index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);

    const iconX = x + 20 + column * cellW;
    const iconY = y + 65 + row * cellH;

    this.createDesktopIcon(
      iconX,
      iconY,
      cellW - 12,
      label,
      icon,
      color,
      () => this.openApp(app)
    );
  });

  this.text(
    x + 24,
    y + h - 76,
    'Select an application.',
    15,
    '#a9c7bd'
  );
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
  const graphics = this.scene.add.graphics();
  this.root.add(graphics);

  const cx = x + width / 2;
  const top = y + 8;

  graphics.lineStyle(3, 0x18302f);
  graphics.fillStyle(color, 1);

  if (kind === 'envelope') {
    graphics.fillRect(cx - 31, top + 9, 62, 43);
    graphics.strokeRect(cx - 31, top + 9, 62, 43);

    graphics.beginPath();
    graphics.moveTo(cx - 30, top + 10);
    graphics.lineTo(cx, top + 33);
    graphics.lineTo(cx + 30, top + 10);
    graphics.strokePath();
  } else if (kind === 'ledger') {
    graphics.fillRect(cx - 26, top, 52, 64);
    graphics.strokeRect(cx - 26, top, 52, 64);

    graphics.lineBetween(
      cx - 15, top + 2,
      cx - 15, top + 62
    );

    for (let row = 0; row < 4; row++) {
      graphics.lineBetween(
        cx - 7,
        top + 16 + row * 10,
        cx + 17,
        top + 16 + row * 10
      );
    }
  } else if (kind === 'board') {
    graphics.fillRect(cx - 34, top + 3, 68, 53);
    graphics.strokeRect(cx - 34, top + 3, 68, 53);

    graphics.fillStyle(0xf4df9b);
    graphics.fillRect(cx - 25, top + 12, 18, 21);
    graphics.fillRect(cx + 8, top + 27, 18, 20);

    graphics.lineStyle(3, 0x9d3030);

    graphics.lineBetween(
      cx - 16, top + 22,
      cx + 17, top + 37
    );

    graphics.fillStyle(0x9d3030);
    graphics.fillCircle(cx - 16, top + 17, 3);
    graphics.fillCircle(cx + 17, top + 32, 3);
  } else if (kind === 'globe') {
    graphics.fillCircle(cx, top + 30, 30);
    graphics.strokeCircle(cx, top + 30, 30);

    graphics.strokeEllipse(
      cx, top + 30, 26, 60
    );

    graphics.strokeEllipse(
      cx, top + 30, 60, 24
    );

    graphics.lineBetween(
      cx - 30, top + 30,
      cx + 30, top + 30
    );
  } else {
    graphics.fillRect(cx - 29, top, 58, 64);
    graphics.strokeRect(cx - 29, top, 58, 64);

    graphics.lineBetween(
      cx - 20, top + 14,
      cx + 20, top + 14
    );

    for (let row = 0; row < 4; row++) {
      graphics.lineBetween(
        cx - 20,
        top + 26 + row * 8,
        cx + 20,
        top + 26 + row * 8
      );
    }
  }

  this.text(
    cx,
    y + 83,
    label,
    16,
    '#ffffff',
    width
  ).setOrigin(0.5, 0);

  const hit = this.rectangle(
    x, y, width, 124, 0xffffff, 0
  ).setInteractive({ useHandCursor: true });

  hit.on('pointerover', () => {
    hit.setFillStyle(0xffffff, 0.08);
  });

  hit.on('pointerout', () => {
    hit.setFillStyle(0xffffff, 0);
  });

  hit.on('pointerdown', callback);
}

  renderApplication() {
    const { x, y, w, h } = this.layout;

    this.window = {
      x: x + 12,
      y: y + 12,
      w: w - 24,
      h: h - 64
    };

    const box = this.window;

    this.rectangle(box.x, box.y, box.w, box.h, 0x101e25)
      .setStrokeStyle(2, 0x75988c);

    this.rectangle(box.x, box.y, box.w, 40, 0x2a4951);

    const titles = {
      mail: 'MAIL',
      ledger: 'PERSONAL LEDGER',
      classifieds: 'CLASSIFIEDS'
    };

    this.text(
      box.x + 12, box.y + 11,
      titles[this.app], 17, '#f0e4bd'
    );

    this.button(
      box.x + box.w - 45,
      box.y + 4,
      'X',
      () => this.openApp('desktop')
    );

    if (this.app === 'ledger') {
      this.renderLedger();
    } else {
      this.renderDocuments();
    }

    if (this.notice) {
      this.text(
        box.x + 16,
        box.y + box.h - 35,
        this.notice,
        14,
        '#ffe29a',
        box.w - 32
      );
    }
  }

  renderDocuments() {
    const box = this.window;
    const isMail = this.app === 'mail';
    const items = isMail ? this.getMail() : this.getClassifieds();

    if (!items.length) {
      this.text(
        box.x + 18, box.y + 65,
        isMail ? 'No messages available.' : 'No advertisements available.',
        17
      );
      return;
    }

    const listW = Math.min(290, box.w * 0.35);
    const perPage = Math.max(1, Math.floor((box.h - 155) / 66));
    const pages = Math.ceil(items.length / perPage);

    this.listPage = Math.min(this.listPage, pages - 1);

    const visible = items.slice(
      this.listPage * perPage,
      (this.listPage + 1) * perPage
    );

    const selected =
      visible.find(item => item.id === this.selectedId) || visible[0];

    this.selectedId = selected.id;

    this.rectangle(
      box.x + listW,
      box.y + 50,
      1,
      box.h - 105,
      0x3a5558
    );

    visible.forEach((item, index) => {
      const title = isMail ? item.subject : item.title;
      const rowY = box.y + 58 + index * 66;

      const row = this.text(
        box.x + 12, rowY,
        title, 15,
        item.id === selected.id ? '#ffe29a' : '#d7ead8',
        listW - 24
      );

      row
        .setFixedSize(listW - 20, 60)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.selectedId = item.id;
          this.bodyPage = 0;
          this.notice = '';
          this.render();
        });
    });

    const pageY = box.y + box.h - 78;

    this.button(box.x + 12, pageY, '<', () => {
      this.listPage = (this.listPage - 1 + pages) % pages;
      this.selectedId = null;
      this.bodyPage = 0;
      this.render();
    });

    this.text(
      box.x + 58, pageY + 7,
      `${this.listPage + 1}/${pages}`, 14
    );

    this.button(box.x + 115, pageY, '>', () => {
      this.listPage = (this.listPage + 1) % pages;
      this.selectedId = null;
      this.bodyPage = 0;
      this.render();
    });

    const detailX = box.x + listW + 16;
    const detailW = box.w - listW - 32;

    const metadata = isMail
      ? `From: ${selected.from}\nDate: ${selected.date || 'Unknown'}`
      : [
          selected.kind === 'pi' ? 'PI JOB' : 'ODDITIES',
          `Contact: ${selected.contact}`,
          Number.isFinite(selected.reward)
            ? `Offered payment: ${this.money(selected.reward)}`
            : null
        ].filter(Boolean).join('\n');

    const content = [
      isMail ? selected.subject : selected.title,
      '',
      metadata,
      '',
      isMail ? selected.body : selected.description
    ].join('\n');

    const hasJobButton = !isMail && selected.kind === 'pi';

    this.renderPagedText(
      content,
      detailX,
      box.y + 58,
      detailW,
      box.h - (hasJobButton ? 180 : 135)
    );

    if (hasJobButton) {
      const connected =
        typeof this.options.onAcceptMission === 'function' &&
        Boolean(selected.missionId);

      this.button(
        detailX,
        box.y + box.h - 78,
        this.accepting
          ? 'PLEASE WAIT...'
          : connected
            ? 'ACCEPT JOB'
            : 'APPLICATIONS UNAVAILABLE',
        () => void this.acceptMission(selected),
        connected && !this.accepting
      );
    }
  }

  renderPagedText(content, x, y, width, height) {
    const fontSize = 16;
    const lineHeight = 22;

    const measure = this.scene.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: `${fontSize}px`,
      wordWrap: { width }
    });

    const lines = measure.getWrappedText(content || '');
    measure.destroy();

    const perPage = Math.max(1, Math.floor((height - 40) / lineHeight));
    const pages = Math.max(1, Math.ceil(lines.length / perPage));

    this.bodyPage = Math.min(this.bodyPage, pages - 1);

    this.text(
      x, y,
      lines.slice(
        this.bodyPage * perPage,
        (this.bodyPage + 1) * perPage
      ).join('\n'),
      fontSize
    ).setLineSpacing(6);

    if (pages <= 1) return;

    const footerY = y + height - 30;

    this.button(x, footerY, '<', () => {
      this.bodyPage = (this.bodyPage - 1 + pages) % pages;
      this.render();
    });

    this.text(
      x + 48, footerY + 7,
      `${this.bodyPage + 1}/${pages}`, 14
    );

    this.button(x + 110, footerY, '>', () => {
      this.bodyPage = (this.bodyPage + 1) % pages;
      this.render();
    });
  }

  renderLedger() {
    const box = this.window;
    const ledger = this.getLedger();

    const balance = Number.isFinite(ledger.balance)
      ? this.money(ledger.balance)
      : 'Not connected';

    const rows = (ledger.transactions || []).map(transaction => {
      const amount = Number(transaction.amount);

      return [
        transaction.date || '',
        transaction.description || 'Transaction',
        Number.isFinite(amount)
          ? `${amount > 0 ? '+' : ''}${this.money(amount)}`
          : 'Unknown amount'
      ].filter(Boolean).join(' | ');
    });

    const content = [
      `PERSONAL BALANCE: ${balance}`,
      '',
      'Personal funds only.',
      'Agency finances are kept separately.',
      '',
      ...(rows.length ? rows : ['No transactions recorded.'])
    ].join('\n');

    this.renderPagedText(
      content,
      box.x + 18,
      box.y + 60,
      box.w - 36,
      box.h - 110
    );
  }

  async acceptMission(advert) {
    if (
      this.accepting ||
      this.destroyed ||
      !this.options.onAcceptMission
    ) {
      return;
    }

    this.accepting = true;
    this.render();

    try {
      const result = await this.options.onAcceptMission(advert);

      if (this.destroyed) return;

      this.notice = result?.ok
        ? (result.message || 'Job accepted.')
        : (result?.message || 'This job could not be accepted.');
    } catch (error) {
      console.error('[PIOfficeComputerUI] Accept job failed:', error);

      if (!this.destroyed) {
        this.notice = 'Could not accept this job. Please try again.';
      }
    } finally {
      if (!this.destroyed) {
        this.accepting = false;
        this.render();
      }
    }
  }

  destroy() {
  if (this.destroyed) return;

  // Allow cleanup even when a child application suspended the desktop.
  this.suspended = false;
  this.close();

  this.destroyed = true;

  this.scene.input.keyboard?.off(
    'keydown',
    this.onKey
  );

  this.scene.events.off(
    'shutdown',
    this.destroy,
    this
  );

  this.root?.destroy(true);
  this.root = null;
}
}