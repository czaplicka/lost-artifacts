import { DW, DH, FONT_TEXT, FONT_PIXEL, SFX, ART, AMBER, AMBER_CSS, GREEN, GREEN_CSS, RED, CREAM_CSS, FAINT_CSS, SCREEN_TEXT, DIAL_X, DIAL_Y, STOP_ANGLE, HOLE_RING, MON_X, MON_Y, MON_W, MON_H, SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H, LEDS, VU_BARS, mulberry32 } from './PhoneConfig.js';

export const PhoneDirectory = {
  openDirectory() {
    if (!this.isOpen || this.state === 'dialling') return;

    this.directoryOpen = true;
    this.playOnce(SFX.paper, 0.5);
    this.renderDirectory();
    this.dir.setVisible(true);
  }
,
  closeDirectory() {
    this.directoryOpen = false;
    this.dir.setVisible(false);
  }
,
  turnDirectory(direction) {
    const contacts = this.contacts.filter(contact => contact.listed === true);
    const pages = Math.max(1, Math.ceil(contacts.length / 7));

    this.directoryPage = (this.directoryPage + direction + pages) % pages;
    this.playOnce(SFX.page, 0.5);
    this.renderDirectory();
  }
,
  pickContact(contact) {
    this.sticky = { number: contact.number, name: contact.name };
    this.updateSticky(true);

    if (this.state === 'on_hook') {
      this.status = `Noted: ${contact.number} - ${contact.name}.\n\nPick up the receiver and dial.`;
    } else if (this.state === 'ready') {
      this.status = `Noted: ${contact.number} - ${contact.name}.\n\nDial it.`;
    }

    this.closeDirectory();
    this.render();
  }
,
  renderDirectory() {
    const s = this.scene;

    this.dir.removeAll(true);

    const blocker = s.add.rectangle(0, 0, DW, DH, 0x000000, 0.8)
      .setOrigin(0)
      .setInteractive();

    blocker.on('pointerdown', () => this.closeDirectory());

    // Książka: skórzana oprawa + papier
    const book = s.add.graphics();

    book.fillStyle(0x000000, 0.45);
    book.fillRoundedRect(258, 58, 780, 620, 18);
    book.fillStyle(0x2a1a10, 1);
    book.fillRoundedRect(250, 50, 780, 620, 18);
    book.lineStyle(3, 0x8b6914, 1);
    book.strokeRoundedRect(250, 50, 780, 620, 18);

    book.fillStyle(0xe9dfc2, 1);
    book.fillRoundedRect(274, 74, 732, 572, 8);

    // Linie wierszy + czerwony margines
    book.lineStyle(1, 0xb8a678, 0.6);

    for (let y = 214; y < 620; y += 58) {
      book.lineBetween(290, y, 990, y);
    }

    book.lineStyle(1, 0xb04040, 0.55);
    book.lineBetween(296, 74, 296, 646);

    // Blokuje klik "przez" książkę
    const bookHit = s.add.rectangle(250, 50, 780, 620, 0xffffff, 0)
      .setOrigin(0)
      .setInteractive();

    this.dir.add([blocker, book, bookHit]);

    this.t(this.dir, 318, 92, 'LOCAL DIRECTORY', 34, '#2a2118', FONT_TEXT);
    this.t(this.dir, 320, 138, 'Telephone numbers, as far as anyone will admit.', 15, '#6b5a3a', FONT_TEXT);

    const closeKey = {
      x: 884,
      y: 88
    };

    const closeBtn = this.t(this.dir, closeKey.x, closeKey.y, '[ CLOSE ]', 14, '#7a1f1f', FONT_PIXEL)
      .setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => {
      this.sfxClick();
      this.closeDirectory();
    });

    const contacts = this.contacts.filter(contact => contact.listed === true);
    const perPage = 7;
    const pages = Math.max(1, Math.ceil(contacts.length / perPage));

    this.directoryPage = Math.min(this.directoryPage, pages - 1);

    const visible = contacts.slice(
      this.directoryPage * perPage,
      (this.directoryPage + 1) * perPage
    );

    visible.forEach((contact, index) => {
      const y = 160 + index * 58;

      const highlight = s.add.rectangle(300, y + 6, 690, 50, 0xfff2a8, 0)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true });

      highlight.on('pointerover', () => highlight.setFillStyle(0xfff2a8, 0.5));
      highlight.on('pointerout', () => highlight.setFillStyle(0xfff2a8, 0));
      highlight.on('pointerdown', () => {
        this.sfxClick();
        this.pickContact(contact);
      });

      this.dir.add(highlight);

      const number = this.t(this.dir, 318, y + 10, contact.number, 30, '#2a2118', FONT_TEXT);
      const name = this.t(this.dir, 980, y + 14, contact.name, 24, '#2a2118', FONT_TEXT)
        .setOrigin(1, 0);

      // Kropki prowadzące
      const leaders = s.add.graphics();
      leaders.fillStyle(0x6b5a3a, 0.7);

      for (let x = number.x + number.width + 14; x < name.x - name.width - 14; x += 9) {
        leaders.fillCircle(x, y + 34, 1.4);
      }

      this.dir.add(leaders);
    });

    if (!contacts.length) {
      this.t(this.dir, 318, 190, 'No listed contacts.', 22, '#2a2118', FONT_TEXT);
    }

    // Paginacja
    const prev = this.t(this.dir, 318, 600, '<', 24, '#2a2118', FONT_PIXEL)
      .setInteractive({ useHandCursor: true });

    prev.on('pointerdown', () => this.turnDirectory(-1));

    this.t(this.dir, 380, 604, `${this.directoryPage + 1} / ${pages}`, 18, '#2a2118', FONT_TEXT);

    const next = this.t(this.dir, 470, 600, '>', 24, '#2a2118', FONT_PIXEL)
      .setInteractive({ useHandCursor: true });

    next.on('pointerdown', () => this.turnDirectory(1));

    this.t(
      this.dir,
      980,
      606,
      'Click a line to note the number.\nUnlisted numbers must be dialled manually.',
      14,
      '#5a4a30',
      FONT_TEXT
    ).setOrigin(1, 0).setAlign('right');
  }

  // ─── Sprzątanie ───────────────────────────────────────────────────────────
};
