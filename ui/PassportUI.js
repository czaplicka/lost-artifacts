import { getPassportManager } from '../managers/PassportManager.js';
import { EventBus } from '../EventBus.js';

const FONT_PIXEL = '"PressStart2P", monospace';
const FONT_TYPE = '"SpecialElite", monospace';

const PAGE_WIDTH = 720;
const PAGE_HEIGHT = 460;

const COVER_WIDTH = PAGE_WIDTH + 40;
const COVER_HEIGHT = PAGE_HEIGHT + 60;

const STAMPS_PER_PAGE = 4;

const LEFT_PAGE = {
  x: -360,
  y: -230,
  width: 356,
  height: 460
};

const RIGHT_PAGE = {
  x: 4,
  y: -230,
  width: 356,
  height: 460
};

const COLORS = {
  cover: 0x3b2415,
  coverDark: 0x2a1a0d,
  brass: 0xc9a24b,
  paper: 0xf3e6c8,
  paperLeft: 0xe4d3a8,
  ink: 0x2a2118,
  defaultStamp: 0x2e4a8f
};

function hashString(value) {
  const text = String(value);
  let hash = 2166136261;

  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededRandom(seed) {
  let value = seed >>> 0;

  return () => {
    value = (value + 0x6D2B79F5) >>> 0;

    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(
      result ^ (result >>> 7),
      result | 61
    );

    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function cleanMrz(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '<');
}

function padMrz(value) {
  return (value + '<'.repeat(44)).slice(0, 44);
}

function buildMrz(name, number) {
  const words = cleanMrz(name).split('<').filter(Boolean);

  const surname = words.length > 1
    ? words[words.length - 1]
    : words[0] || 'DOE';

  const given = words.length > 1
    ? words.slice(0, -1).join('<')
    : '';

  const digits = String(number || '')
    .replace(/\D/g, '') || '000000000';

  return [
    padMrz(`P<MRK${surname}<<${given}`),
    padMrz(`${digits}<MRK<NOT<A<CRIMINAL`)
  ];
}

export class PassportUI {
  constructor(scene) {
    this.scene = scene;

    this.container = null;
    this.pagesGroup = null;
    this.prevBtn = null;
    this.nextBtn = null;
    this.pageCounterText = null;
    this.noticeText = null;

    this.isOpen = false;
    this.currentPage = 0;

    this.stampObjects = new Map();
    this._rings = new Set();

    this._closingContainer = null;
    this._turning = false;
    this._pendingSlamId = null;
    this._unseenStampId = null;
    this._keysBound = false;
    this._destroyed = false;

    this._onOpenPassportEvent = payload => {
      this.open(
        payload && typeof payload === 'object'
          ? payload
          : {}
      );
    };

    this._onPassportStamped = stamp => {
      if (this._destroyed) return;

      const id = stamp?.stampId || null;

      if (!this.isOpen) {
        this._unseenStampId = id;
        return;
      }

      const stampPage = this._pageOfStamp(id);

      this._kill(this.pagesGroup);
      this._turning = false;

      this.pagesGroup?.setPosition(0, 10).setAlpha(1);

      this._pendingSlamId = stampPage === this.currentPage
        ? id
        : null;

      this._unseenStampId = stampPage === this.currentPage
        ? null
        : id;

      this._render();
      this._slamPending();
    };

    this._onEsc = () => this.close();
    this._onLeft = () => this._changePage(-1);
    this._onRight = () => this._changePage(1);
    this._onResize = () => this._layout();

    EventBus.on('ui:openPassport', this._onOpenPassportEvent);
    EventBus.on('passportStamped', this._onPassportStamped);

    this.scene.scale.on('resize', this._onResize);
  }

  _tween(config) {
    if (!this.scene?.tweens || this._destroyed) return null;

    return typeof this.scene.createTrackedTween === 'function'
      ? this.scene.createTrackedTween(config)
      : this.scene.tweens.add(config);
  }

  _kill(target) {
    if (!target) return;

    if (typeof this.scene?.killTrackedTweensOf === 'function') {
      this.scene.killTrackedTweensOf(target);
    } else {
      this.scene?.tweens?.killTweensOf(target);
    }
  }

  _totalPages() {
    return Math.max(
      1,
      Math.ceil(
        getPassportManager().getStampCount() /
        STAMPS_PER_PAGE
      )
    );
  }

  _lastPageIndex() {
    return this._totalPages() - 1;
  }

  _pageOfStamp(stampId) {
    if (!stampId) return null;

    const index = getPassportManager()
      .getStamps()
      .findIndex(stamp => stamp.stampId === stampId);

    return index < 0
      ? null
      : Math.floor(index / STAMPS_PER_PAGE);
  }

  open(options = {}) {
    if (
      this._destroyed ||
      this.isOpen ||
      !this.scene?.cameras?.main
    ) {
      return;
    }

    if (this._closingContainer) {
      this._kill(this._closingContainer);
      this._closingContainer.destroy(true);
      this._closingContainer = null;
    }

    this.isOpen = true;
    this._turning = false;

    // Automatic opening starts on the first page.
    // Only an explicit request selects a particular stamp.
    const explicitStampId = options.highlightStampId || null;
    const explicitPage = this._pageOfStamp(explicitStampId);

    this.currentPage = explicitPage ?? 0;

    const unseenPage = this._pageOfStamp(this._unseenStampId);

    this._pendingSlamId = explicitStampId || (
      unseenPage === this.currentPage
        ? this._unseenStampId
        : null
    );

    if (this._pendingSlamId === this._unseenStampId) {
      this._unseenStampId = null;
    }

    this._buildContainer();
    this._render();
    this._bindKeys();
    this._layout();

    const target = this.container;
    const scale = this._bookScale;

    target.setScale(scale * 0.9).setAlpha(0);

    const tween = this._tween({
      targets: target,
      scale: scale,
      alpha: 1,
      duration: 220,
      ease: 'Back.easeOut',

      onComplete: () => {
        if (this.isOpen && this.container === target) {
          this._slamPending();
        }
      }
    });

    if (!tween) {
      target.setScale(scale).setAlpha(1);
      this._slamPending();
    }
  }

  close() {
    if (!this.isOpen || !this.container) {
      this.isOpen = false;
      return;
    }

    this.isOpen = false;
    this._turning = false;
    this._pendingSlamId = null;

    this._unbindKeys();
    this._clearFx();

    for (const stamp of this.stampObjects.values()) {
      this._kill(stamp);
    }

    this.stampObjects.clear();

    const target = this.container;

    this._kill(target);
    this._kill(this.pagesGroup);

    this.container = null;
    this.pagesGroup = null;
    this.prevBtn = null;
    this.nextBtn = null;
    this.pageCounterText = null;
    this.noticeText = null;

    this._closingContainer = target;

    const finish = () => {
      if (this._closingContainer === target) {
        this._closingContainer = null;
      }

      if (target.scene) target.destroy(true);
    };

    const tween = this._tween({
      targets: target,
      scale: target.scaleX * 0.9,
      alpha: 0,
      duration: 160,
      ease: 'Cubic.easeIn',
      onComplete: finish
    });

    if (!tween) finish();
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  _bindKeys() {
    const keyboard = this.scene?.input?.keyboard;

    if (!keyboard || this._keysBound) return;

    keyboard.on('keydown-ESC', this._onEsc);
    keyboard.on('keydown-LEFT', this._onLeft);
    keyboard.on('keydown-RIGHT', this._onRight);

    this._keysBound = true;
  }

  _unbindKeys() {
    if (!this._keysBound) return;

    const keyboard = this.scene?.input?.keyboard;

    keyboard?.off('keydown-ESC', this._onEsc);
    keyboard?.off('keydown-LEFT', this._onLeft);
    keyboard?.off('keydown-RIGHT', this._onRight);

    this._keysBound = false;
  }

  _layout() {
    if (!this.container || !this.scene) return;

    const { width, height } = this.scene.scale;

    this._bookScale = Math.max(
      0.01,
      Math.min(
        1,
        (width - 32) / COVER_WIDTH,
        (height - 32) / COVER_HEIGHT
      )
    );

    this._kill(this.container);

    this.container
      .setPosition(width / 2, height / 2)
      .setScale(this._bookScale)
      .setAlpha(1);

    this.backdrop?.setSize(
      width / this._bookScale + 100,
      height / this._bookScale + 100
    );
  }

  _buildContainer() {
    this.container = this.scene.add
      .container(0, 0)
      .setDepth(10000)
      .setScrollFactor(0);

    this.backdrop = this.scene.add
      .rectangle(0, 0, 3000, 3000, 0x000000, 0.6)
      .setInteractive();

    this.backdrop.on('pointerdown', () => this.close());

    this.container.add(this.backdrop);

    const blocker = this.scene.add
      .rectangle(
        0, 0, COVER_WIDTH, COVER_HEIGHT, 0x000000, 0
      )
      .setInteractive();

    this.container.add(blocker);

    this.container.add(
      this.scene.add.rectangle(
        6, 10, COVER_WIDTH, COVER_HEIGHT, 0x000000, 0.35
      )
    );

    this._buildCover();

    this.container.add(
      this.scene.add.text(
        0,
        -COVER_HEIGHT / 2 + 26,
        'PASSPORT',
        {
          fontFamily: FONT_PIXEL,
          fontSize: '18px',
          color: '#d8c48a',
          stroke: '#1a0e05',
          strokeThickness: 4
        }
      ).setOrigin(0.5)
    );

    const close = this.scene.add.text(
      COVER_WIDTH / 2 - 26,
      -COVER_HEIGHT / 2 + 22,
      'X',
      {
        fontFamily: FONT_PIXEL,
        fontSize: '14px',
        color: '#f3e6c8',
        backgroundColor: '#5a2f22',
        padding: { x: 8, y: 6 }
      }
    )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    close.on('pointerdown', () => this.close());
    this.container.add(close);

    this.pagesGroup = this.scene.add.container(0, 10);
    this.container.add(this.pagesGroup);

    this.prevBtn = this._navButton(-285, 247, '< PREV', -1);
    this.nextBtn = this._navButton(285, 247, 'NEXT >', 1);

    this.pageCounterText = this.scene.add.text(
      0, 247, '',
      {
        fontFamily: FONT_TYPE,
        fontSize: '14px',
        color: '#f3e6c8'
      }
    ).setOrigin(0.5);

    this.container.add(this.pageCounterText);
  }

  _navButton(x, y, label, direction) {
    const button = this.scene.add.text(x, y, label, {
      fontFamily: FONT_PIXEL,
      fontSize: '11px',
      color: '#f3e6c8',
      backgroundColor: '#24170e',
      padding: { x: 8, y: 7 }
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on('pointerdown', () => {
      this._changePage(direction);
    });

    this.container.add(button);
    return button;
  }

  _buildCover() {
    const graphics = this.scene.add.graphics();

    const x = -COVER_WIDTH / 2;
    const y = -COVER_HEIGHT / 2;

    graphics.fillStyle(COLORS.cover, 1);
    graphics.fillRoundedRect(
      x, y, COVER_WIDTH, COVER_HEIGHT, 14
    );

    graphics.lineStyle(4, COLORS.coverDark, 1);
    graphics.strokeRoundedRect(
      x, y, COVER_WIDTH, COVER_HEIGHT, 14
    );

    const random = seededRandom(1990);

    for (let index = 0; index < 260; index++) {
      graphics.fillStyle(
        random() < 0.7 ? 0x000000 : 0xffffff,
        0.1
      );

      graphics.fillRect(
        x + 6 + random() * (COVER_WIDTH - 12),
        y + 6 + random() * (COVER_HEIGHT - 12),
        2,
        2
      );
    }

    graphics.lineStyle(2, COLORS.brass, 0.6);
    graphics.strokeRoundedRect(
      x + 7,
      y + 7,
      COVER_WIDTH - 14,
      COVER_HEIGHT - 14,
      10
    );

    this.container.add(graphics);
  }

  _changePage(direction) {
    if (
      !this.isOpen ||
      this._turning ||
      !this.pagesGroup
    ) {
      return;
    }

    const targetPage = this.currentPage + direction;

    if (
      targetPage < 0 ||
      targetPage >= this._totalPages()
    ) {
      return;
    }

    this._turning = true;
    const group = this.pagesGroup;

    const applyPage = () => {
      if (!this.isOpen || this.pagesGroup !== group) {
        this._turning = false;
        return;
      }

      this.currentPage = targetPage;

      if (
        this._pageOfStamp(this._unseenStampId) === targetPage
      ) {
        this._pendingSlamId = this._unseenStampId;
        this._unseenStampId = null;
      }

      this._render();

      group.setX(16 * direction);

      const incoming = this._tween({
        targets: group,
        alpha: 1,
        x: 0,
        duration: 140,
        ease: 'Sine.easeOut',

        onComplete: () => {
          this._turning = false;
          this._slamPending();
        }
      });

      if (!incoming) {
        group.setX(0).setAlpha(1);
        this._turning = false;
        this._slamPending();
      }
    };

    const outgoing = this._tween({
      targets: group,
      alpha: 0,
      x: -16 * direction,
      duration: 100,
      ease: 'Sine.easeIn',
      onComplete: applyPage
    });

    if (!outgoing) applyPage();
  }

  _clearFx() {
    for (const ring of this._rings) {
      this._kill(ring);
      ring.destroy();
    }

    this._rings.clear();
  }

  _render() {
    if (!this.pagesGroup) return;

    for (const stamp of this.stampObjects.values()) {
      this._kill(stamp);
    }

    this.stampObjects.clear();
    this._clearFx();
    this.pagesGroup.removeAll(true);

    const stamps = getPassportManager().getStamps();
    const totalPages = Math.max(
      1,
      Math.ceil(stamps.length / STAMPS_PER_PAGE)
    );

    this.currentPage = Phaser.Math.Clamp(
      this.currentPage,
      0,
      totalPages - 1
    );

    this._drawPages();
    this._renderIdPage();

    const first = this.currentPage * STAMPS_PER_PAGE;

    this._renderStampsPage(
      stamps.slice(first, first + STAMPS_PER_PAGE)
    );

    const last = Math.min(
      first + STAMPS_PER_PAGE,
      stamps.length
    );

    const range = stamps.length
      ? `${first + 1}-${last} of ${stamps.length} stamps`
      : '0 stamps';

    this.pageCounterText.setText(
      `Page ${this.currentPage + 1}/${totalPages} · ${range}`
    );

    this.prevBtn.setAlpha(this.currentPage > 0 ? 1 : 0.3);
    this.nextBtn.setAlpha(
      this.currentPage < totalPages - 1 ? 1 : 0.3
    );

    if (this.prevBtn.input) {
      this.prevBtn.input.enabled = this.currentPage > 0;
    }

    if (this.nextBtn.input) {
      this.nextBtn.input.enabled =
        this.currentPage < totalPages - 1;
    }
  }

  _drawPages() {
    const graphics = this.scene.add.graphics();

    for (const [page, color] of [
      [LEFT_PAGE, COLORS.paperLeft],
      [RIGHT_PAGE, COLORS.paper]
    ]) {
      graphics.fillStyle(color, 1);

      graphics.fillRoundedRect(
        page.x,
        page.y,
        page.width,
        page.height,
        6
      );

      graphics.lineStyle(1, 0x6f7f5f, 0.12);

      for (let line = 0; line < 7; line++) {
        graphics.beginPath();

        for (let px = 0; px <= page.width; px += 5) {
          const py =
            page.y +
            page.height / 2 +
            Math.sin(px * 0.035 + line * 0.7) *
            page.height * 0.38 *
            Math.cos(px * 0.009 + line * 0.3);

          if (px === 0) {
            graphics.moveTo(page.x + px, py);
          } else {
            graphics.lineTo(page.x + px, py);
          }
        }

        graphics.strokePath();
      }
    }

    for (let index = 0; index < 16; index++) {
      graphics.fillStyle(
        0x000000,
        0.2 * (1 - index / 16)
      );

      graphics.fillRect(
        RIGHT_PAGE.x + index,
        RIGHT_PAGE.y + 2,
        1,
        RIGHT_PAGE.height - 4
      );
    }

    this.pagesGroup.add(graphics);
  }

  _fitWidth(object, width) {
    if (object.width > width) {
      object.setScale(width / object.width);
    }

    return object;
  }

  _addPageText(x, y, value, size = 15, color = '#2a2118') {
    const text = this.scene.add.text(x, y, String(value), {
      fontFamily: FONT_TYPE,
      fontSize: `${size}px`,
      color
    });

    this.pagesGroup.add(text);
    return text;
  }

  _renderIdPage() {
    const manager = getPassportManager();
    const number = manager.getPassportNumber();
    const data = manager.serialize();
    const holder = manager.getHolderName();

    const x = LEFT_PAGE.x + 18;
    const y = LEFT_PAGE.y + 18;

    this._addPageText(
      x, y + 2,
      'ANY PERSON HOLDING THIS DOCUMENT IS\nPROBABLY IN OVER THEIR HEAD.',
      9,
      '#6b5a3a'
    );

    const photoX = x + 180;
    const photoY = y + 58;

    this.pagesGroup.add(
      this.scene.add.rectangle(
        photoX, photoY, 90, 110, 0xe8e0cc
      )
        .setOrigin(0)
        .setStrokeStyle(2, COLORS.ink)
    );

    this.pagesGroup.add(
      this.scene.add.text(
        photoX + 45, photoY + 55, '🕵',
        { fontSize: '44px' }
      ).setOrigin(0.5).setAlpha(0.55)
    );

    this.pagesGroup.add(
      this.scene.add.rectangle(
        photoX + 45, photoY + 55,
        100, 26, 0x1a1108, 0.88
      ).setAngle(-18)
    );

    this.pagesGroup.add(
      this.scene.add.text(
        photoX + 45, photoY + 55,
        'REDACTED',
        {
          fontFamily: FONT_PIXEL,
          fontSize: '9px',
          color: '#e8dcb8'
        }
      ).setOrigin(0.5).setAngle(-18)
    );

    const countries = manager.getVisitedCountries().filter(
      country => country && country !== 'Unknown Country'
    ).length;

    const sideFields = [
      ['RANK', manager.getPlayerRank()],
      ['ISSUED', data.issuedDayLabel || 'Not stamped yet'],
      ['TRIPS', `${manager.getStampCount()} (${countries} countries)`]
    ];

    sideFields.forEach(([label, value], index) => {
      const row = photoY + index * 40;

      this._addPageText(x, row, label, 12);

      this._fitWidth(
        this._addPageText(x, row + 15, value),
        150
      );
    });

    const fields = [
      ['SURNAME / GIVEN NAME', holder]
    ];

    const alias = manager.getAlias();

    if (alias) fields.push(['ALIAS', alias]);

    fields.push(
      ['PASSPORT NO.', number],
      ['AUTHORITY', 'MARK AGENCY']
    );

    fields.forEach(([label, value], index) => {
      const row = y + 195 + index * 34;

      this._addPageText(x, row, label, 12);

      this._fitWidth(
        this._addPageText(x, row + 15, value),
        LEFT_PAGE.width - 36
      );
    });

    const mrzY = LEFT_PAGE.y + LEFT_PAGE.height - 70;

    this.pagesGroup.add(
      this.scene.add.rectangle(
        LEFT_PAGE.x + 12,
        mrzY,
        LEFT_PAGE.width - 24,
        56,
        0xdcd0a8
      ).setOrigin(0)
    );

    buildMrz(holder, number).forEach((line, index) => {
      this._fitWidth(
        this._addPageText(
          LEFT_PAGE.x + 20,
          mrzY + 9 + index * 21,
          line,
          12
        ),
        LEFT_PAGE.width - 40
      );
    });
  }

  _renderStampsPage(stamps) {
    const centerX = RIGHT_PAGE.x + RIGHT_PAGE.width / 2;

    this.pagesGroup.add(
      this.scene.add.text(
        centerX,
        RIGHT_PAGE.y + 10,
        'VISAS & ENTRIES',
        {
          fontFamily: FONT_PIXEL,
          fontSize: '9px',
          color: '#8a7650'
        }
      ).setOrigin(0.5, 0)
    );

    const unseenPage = this._pageOfStamp(this._unseenStampId);

    const notice = unseenPage !== null &&
      unseenPage !== this.currentPage
        ? `New stamp on page ${unseenPage + 1}`
        : 'Previous stamps stay on earlier pages.';

    this.noticeText = this.scene.add.text(
      centerX,
      RIGHT_PAGE.y + 32,
      notice,
      {
        fontFamily: FONT_TYPE,
        fontSize: '12px',
        color: '#6b5a3a'
      }
    ).setOrigin(0.5, 0);

    this.pagesGroup.add(this.noticeText);

    if (!stamps.length) {
      this.pagesGroup.add(
        this.scene.add.text(
          centerX,
          0,
          'No stamps yet.\nGo catch a flight, detective.',
          {
            fontFamily: FONT_TYPE,
            fontSize: '15px',
            color: '#6b5a3a',
            align: 'center'
          }
        ).setOrigin(0.5)
      );

      return;
    }

    stamps.forEach((stamp, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);

      const x = RIGHT_PAGE.x + 89 + column * 178;
      const y = RIGHT_PAGE.y + 125 + row * 190;

      this._renderStamp(stamp, x, y);
    });
  }

  _renderStamp(stamp, x, y) {
    const radius = 75;

    const seed = hashString(
      stamp.stampId ||
      `${stamp.city}${stamp.dateLabel}`
    );

    const random = seededRandom(seed);
    const variant = seed % 3;

    const color = Number.isFinite(stamp.inkColor)
      ? stamp.inkColor
      : COLORS.defaultStamp;

    const angle = Number(stamp.rotationDeg) || 0;
    const baseScale = 0.78;

    const container = this.scene.add
      .container(x, y)
      .setAngle(angle)
      .setScale(baseScale);

    container.setData({
      baseAngle: angle,
      baseScale,
      inkColor: color
    });

    this.pagesGroup.add(container);

    if (stamp.stampId) {
      this.stampObjects.set(stamp.stampId, container);
    }

    const graphics = this.scene.add.graphics();

    graphics.lineStyle(4, color, 0.85);

    if (variant === 0) {
      graphics.strokeCircle(0, 0, radius);
      graphics.lineStyle(2, color, 0.6);
      graphics.strokeCircle(0, 0, radius - 8);
    } else if (variant === 1) {
      graphics.strokeRoundedRect(-88, -56, 176, 112, 10);
      graphics.lineStyle(2, color, 0.6);
      graphics.strokeRoundedRect(-80, -48, 160, 96, 6);
    } else {
      graphics.strokeEllipse(0, 0, 176, 128);
      graphics.lineStyle(2, color, 0.6);
      graphics.strokeEllipse(0, 0, 160, 112);
    }

    container.add(graphics);

    const cssColor = Phaser.Display.Color
      .IntegerToColor(color)
      .rgba;

    const addText = (ty, value, size, maxWidth = 145) => {
      const text = this.scene.add.text(
        0, ty, String(value),
        {
          fontFamily: FONT_TYPE,
          fontSize: `${size}px`,
          color: cssColor,
          align: 'center'
        }
      ).setOrigin(0.5).setAlpha(0.92);

      this._fitWidth(text, maxWidth);
      container.add(text);

      return text;
    };

    addText(-34, stamp.title || 'ENTRY', 14);

    addText(
      -8,
      String(stamp.country || 'Unknown Country').toUpperCase(),
      16
    );

    addText(22, stamp.city || '???', 13);
    addText(42, stamp.dateLabel || '', 13);

    const wear = this.scene.add.graphics();
    wear.fillStyle(COLORS.paper, 0.5);

    for (let index = 0; index < 40; index++) {
      wear.fillRect(
        (random() - 0.5) * 2 * radius * 0.95,
        (random() - 0.5) * 2 * radius * 0.8,
        random() < 0.5 ? 1 : 2,
        random() < 0.5 ? 1 : 2
      );
    }

    container.add(wear);

    if (stamp.visitNumber > 1) {
      container.add(
        this.scene.add.text(
          radius - 10,
          -radius + 10,
          `x${stamp.visitNumber}`,
          {
            fontFamily: FONT_PIXEL,
            fontSize: '10px',
            color: '#ffffff',
            backgroundColor: '#2a2118',
            padding: { x: 4, y: 3 }
          }
        ).setOrigin(0.5)
      );
    }

    const note = this.scene.add.text(
      0,
      92,
      String(stamp.customsNote || ''),
      {
        fontFamily: FONT_TYPE,
        fontSize: '12px',
        color: '#5a4a30',
        align: 'center',
        fontStyle: 'italic',
        wordWrap: { width: 200, useAdvancedWrap: true }
      }
    ).setOrigin(0.5, 0);

    if (note.height > 55) {
      note.setFontSize(10);
    }

    container.add(note);
    container.setSize(176, 150).setInteractive();

    container.on('pointerover', () => {
      this._kill(container);

      this._tween({
        targets: container,
        scale: baseScale * 1.05,
        duration: 110,
        ease: 'Sine.easeOut'
      });
    });

    container.on('pointerout', () => {
      this._kill(container);

      this._tween({
        targets: container,
        scale: baseScale,
        angle,
        duration: 110,
        ease: 'Sine.easeOut'
      });
    });

    container.on('pointerdown', () => {
      this._kill(container);

      container.setAngle(angle);

      this._tween({
        targets: container,
        angle: angle + 4,
        duration: 60,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeInOut'
      });
    });
  }

  _slamPending() {
    const id = this._pendingSlamId;

    if (!id) return;

    this._pendingSlamId = null;
    this._playSlam(this.stampObjects.get(id));
  }

  _playSlam(container) {
    if (!container?.scene || !this.isOpen) return;

    this._kill(container);

    const angle = container.getData('baseAngle') ?? 0;
    const scale = container.getData('baseScale') ?? 0.78;

    container
      .setScale(scale * 2)
      .setAlpha(0)
      .setAngle(angle + 14);

    this._tween({
      targets: container,
      scale,
      alpha: 1,
      angle,
      duration: 220,
      ease: 'Cubic.easeIn'
    });
  }

  destroy() {
    if (this._destroyed) return;

    EventBus.off(
      'ui:openPassport',
      this._onOpenPassportEvent
    );

    EventBus.off(
      'passportStamped',
      this._onPassportStamped
    );

    this.scene?.scale?.off('resize', this._onResize);

    this._unbindKeys();
    this._clearFx();

    for (const stamp of this.stampObjects.values()) {
      this._kill(stamp);
    }

    this.stampObjects.clear();

    this._kill(this.pagesGroup);
    this._kill(this.container);
    this._kill(this._closingContainer);

    this.container?.destroy(true);
    this._closingContainer?.destroy(true);

    this.container = null;
    this._closingContainer = null;
    this.pagesGroup = null;
    this.backdrop = null;
    this.prevBtn = null;
    this.nextBtn = null;
    this.pageCounterText = null;
    this.noticeText = null;

    this.isOpen = false;
    this._destroyed = true;
  }
}