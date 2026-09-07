import { getPassportManager } from '../PassportManager.js';
import { EventBus } from '../EventBus.js';

const FONT_PIXEL = '"Press Start 2P", monospace';
const FONT_TYPEWRITER = '"Special Elite", monospace';

const PAGE_WIDTH = 720;
const PAGE_HEIGHT = 460;
const STAMPS_PER_PAGE = 2;

const COVER_COLOR = 0x3b2415;
const COVER_COLOR_DARK = 0x2a1a0d;
const PAGE_COLOR = 0xf3e6c8;
const PAGE_COLOR_SHADOW = 0xe4d3a8;
const INK_LINE_COLOR = 0x2a2118;

export class PassportUI {
  constructor(scene) {
    this.scene = scene;
    this.container = null;
    this.isOpen = false;
    this.currentPage = 0;

    this._onOpenPassportEvent = () => this.open();
    this._onPassportStamped = () => {
      if (this.isOpen) {
        this.currentPage = this._lastPageIndex();
        this._render();
      }
    };

    EventBus.on('ui:openPassport', this._onOpenPassportEvent);
    EventBus.on('passportStamped', this._onPassportStamped);
  }

  _lastPageIndex() {
    const total = getPassportManager().getStampCount();
    return Math.max(0, Math.ceil(total / STAMPS_PER_PAGE) - 1);
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.currentPage = this._lastPageIndex();
    this._buildContainer();
    this._render();

    this.container.setScale(0.85);
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      scale: 1,
      alpha: 1,
      duration: 220,
      ease: 'Back.easeOut'
    });
  }

  close() {
    if (!this.isOpen || !this.container) {
      this.isOpen = false;
      return;
    }

    this.isOpen = false;
    const target = this.container;
    this.container = null;

    this.scene.tweens.add({
      targets: target,
      scale: 0.85,
      alpha: 0,
      duration: 160,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        target.destroy(true);
      }
    });
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  destroy() {
    EventBus.off('ui:openPassport', this._onOpenPassportEvent);
    EventBus.off('passportStamped', this._onPassportStamped);

    this.scene?.tweens?.killTweensOf(this.container);

    if (this.container) {
      this.container.destroy(true);
      this.container = null;
    }

    this.isOpen = false;
  }

  _buildContainer() {
    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;

    this.container = this.scene.add.container(cx, cy);
    this.container.setDepth(10000);

    const backdrop = this.scene.add.rectangle(0, 0, cam.width * 2, cam.height * 2, 0x000000, 0.6);
    backdrop.setInteractive();
    backdrop.on('pointerdown', () => this.close());
    this.container.add(backdrop);

    const bookShadow = this.scene.add.rectangle(6, 10, PAGE_WIDTH + 40, PAGE_HEIGHT + 60, 0x000000, 0.35);
    this.container.add(bookShadow);

    const cover = this.scene.add.graphics();
    cover.fillStyle(COVER_COLOR, 1);
    cover.fillRoundedRect(-(PAGE_WIDTH + 40) / 2, -(PAGE_HEIGHT + 60) / 2, PAGE_WIDTH + 40, PAGE_HEIGHT + 60, 14);
    cover.lineStyle(4, COVER_COLOR_DARK, 1);
    cover.strokeRoundedRect(-(PAGE_WIDTH + 40) / 2, -(PAGE_HEIGHT + 60) / 2, PAGE_WIDTH + 40, PAGE_HEIGHT + 60, 14);
    this.container.add(cover);

    this._brassCorner(-(PAGE_WIDTH + 40) / 2 + 14, -(PAGE_HEIGHT + 60) / 2 + 14);
    this._brassCorner((PAGE_WIDTH + 40) / 2 - 14, -(PAGE_HEIGHT + 60) / 2 + 14);
    this._brassCorner(-(PAGE_WIDTH + 40) / 2 + 14, (PAGE_HEIGHT + 60) / 2 - 14);
    this._brassCorner((PAGE_WIDTH + 40) / 2 - 14, (PAGE_HEIGHT + 60) / 2 - 14);

    const title = this.scene.add.text(0, -(PAGE_HEIGHT + 60) / 2 + 26, 'PASSPORT', {
      fontFamily: FONT_PIXEL,
      fontSize: '18px',
      color: '#d8c48a'
    }).setOrigin(0.5);
    this.container.add(title);

    const closeBtn = this.scene.add.text((PAGE_WIDTH + 40) / 2 - 26, -(PAGE_HEIGHT + 60) / 2 + 22, 'X', {
      fontFamily: FONT_PIXEL,
      fontSize: '14px',
      color: '#f3e6c8',
      backgroundColor: '#5a2f22',
      padding: { x: 8, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.close());
    closeBtn.on('pointerover', () => closeBtn.setStyle({ color: '#ffd76a' }));
    closeBtn.on('pointerout', () => closeBtn.setStyle({ color: '#f3e6c8' }));
    this.container.add(closeBtn);

    this.pagesGroup = this.scene.add.container(0, 10);
    this.container.add(this.pagesGroup);

    const prevBtn = this.scene.add.text(-(PAGE_WIDTH) / 2 + 6, (PAGE_HEIGHT) / 2 + 16, '‹ PREV', {
      fontFamily: FONT_PIXEL,
      fontSize: '11px',
      color: '#f3e6c8'
    }).setInteractive({ useHandCursor: true });
    prevBtn.on('pointerdown', () => this._changePage(-1));
    this.container.add(prevBtn);
    this.prevBtn = prevBtn;

    const nextBtn = this.scene.add.text((PAGE_WIDTH) / 2 - 60, (PAGE_HEIGHT) / 2 + 16, 'NEXT ›', {
      fontFamily: FONT_PIXEL,
      fontSize: '11px',
      color: '#f3e6c8'
    }).setInteractive({ useHandCursor: true });
    nextBtn.on('pointerdown', () => this._changePage(1));
    this.container.add(nextBtn);
    this.nextBtn = nextBtn;

    this.pageCounterText = this.scene.add.text(0, (PAGE_HEIGHT) / 2 + 16, '', {
      fontFamily: FONT_PIXEL,
      fontSize: '11px',
      color: '#f3e6c8'
    }).setOrigin(0.5);
    this.container.add(this.pageCounterText);
  }

  _brassCorner(x, y) {
    const c = this.scene.add.circle(x, y, 6, 0xc9a24b);
    c.setStrokeStyle(2, 0x8a6a2a);
    this.container.add(c);
  }

  _changePage(direction) {
    const totalPages = Math.max(1, Math.ceil(getPassportManager().getStampCount() / STAMPS_PER_PAGE));
    const target = this.currentPage + direction;
    if (target < 0 || target >= totalPages) return;
    this.currentPage = target;
    this._render();
  }

  _render() {
    this.pagesGroup.removeAll(true);

    const pm = getPassportManager();
    const stamps = pm.getStamps();
    const totalPages = Math.max(1, Math.ceil(stamps.length / STAMPS_PER_PAGE));
    this.currentPage = Math.min(this.currentPage, totalPages - 1);

    const leftPage = this.scene.add.graphics();
    leftPage.fillStyle(PAGE_COLOR_SHADOW, 1);
    leftPage.fillRoundedRect(-PAGE_WIDTH / 2, -PAGE_HEIGHT / 2, PAGE_WIDTH / 2 - 4, PAGE_HEIGHT, 6);
    this.pagesGroup.add(leftPage);

    const rightPage = this.scene.add.graphics();
    rightPage.fillStyle(PAGE_COLOR, 1);
    rightPage.fillRoundedRect(4, -PAGE_HEIGHT / 2, PAGE_WIDTH / 2 - 4, PAGE_HEIGHT, 6);
    this.pagesGroup.add(rightPage);

    this._renderIdPage(-PAGE_WIDTH / 2 + 18, -PAGE_HEIGHT / 2 + 18);

    const pageStamps = stamps.slice(
      this.currentPage * STAMPS_PER_PAGE,
      this.currentPage * STAMPS_PER_PAGE + STAMPS_PER_PAGE
    );
    this._renderStampsPage(pageStamps);

    this.pageCounterText.setText(`Page ${this.currentPage + 1} / ${totalPages}  ·  ${stamps.length} stamp${stamps.length === 1 ? '' : 's'}`);
    this.prevBtn.setAlpha(this.currentPage === 0 ? 0.35 : 1);
    this.nextBtn.setAlpha(this.currentPage >= totalPages - 1 ? 0.35 : 1);
  }

  _renderIdPage(x, y) {
    const pm = getPassportManager();

    const photoFrame = this.scene.add.rectangle(x + 55, y + 90, 90, 110, 0xe8e0cc, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, INK_LINE_COLOR);
    this.pagesGroup.add(photoFrame);

    const silhouette = this.scene.add.text(x + 100, y + 145, '🕵', {
      fontSize: '44px'
    }).setOrigin(0.5).setAlpha(0.55);
    this.pagesGroup.add(silhouette);

    // Żart zamiast fałszywego zdjęcia - agencja "zgubiła" fotografię, jak to agencja.
    const redactedBar = this.scene.add.rectangle(x + 100, y + 145, 100, 26, 0x1a1108, 0.88);
    redactedBar.setAngle(-18);
    this.pagesGroup.add(redactedBar);

    const redactedText = this.scene.add.text(x + 100, y + 145, 'REDACTED', {
      fontFamily: FONT_PIXEL,
      fontSize: '9px',
      color: '#e8dcb8'
    }).setOrigin(0.5).setAngle(-18);
    this.pagesGroup.add(redactedText);

    const photoCaption = this.scene.add.text(x + 100, y + 205, 'PHOTO ON FILE', {
      fontFamily: FONT_TYPEWRITER,
      fontSize: '9px',
      color: '#6b5a3a'
    }).setOrigin(0.5);
    this.pagesGroup.add(photoCaption);

    const labelStyle = { fontFamily: FONT_TYPEWRITER, fontSize: '13px', color: '#2a2118' };
    const valueStyle = { fontFamily: FONT_TYPEWRITER, fontSize: '15px', color: '#1a1108', fontStyle: 'bold' };

    const rows = [
      ['SURNAME / GIVEN NAME', pm.getHolderName()]
    ];

    const alias = pm.getAlias();
    if (alias) {
      rows.push(['ALIAS', alias]);
    }

    rows.push(
      ['PASSPORT NO.', pm.getPassportNumber()],
      ['AGENCY RANK', pm.getPlayerRank()],
      ['AUTHORITY', 'MARK AGENCY'],
      ['ISSUED', pm.serialize().issuedDayLabel || '—']
    );

    let rowY = y;
    rows.forEach(([label, value]) => {
      this.pagesGroup.add(this.scene.add.text(x, rowY, label, labelStyle));
      this.pagesGroup.add(this.scene.add.text(x, rowY + 15, value, valueStyle));
      rowY += 36;
    });

    const deco = this.scene.add.text(x + 10, y + 240, 'ANY PERSON HOLDING THIS DOCUMENT IS\nPROBABLY IN OVER THEIR HEAD.', {
      fontFamily: FONT_TYPEWRITER,
      fontSize: '10px',
      color: '#6b5a3a',
      align: 'left'
    });
    this.pagesGroup.add(deco);
  }

  _renderStampsPage(pageStamps) {
    const rightPageCenterX = PAGE_WIDTH / 4 + 2;
    const usableHeight = PAGE_HEIGHT - 40;
    const cellH = usableHeight / STAMPS_PER_PAGE;
    const topY = -PAGE_HEIGHT / 2 + 20;

    if (pageStamps.length === 0) {
      const empty = this.scene.add.text(rightPageCenterX, 0, 'No stamps yet.\nGo catch a flight, detective.', {
        fontFamily: FONT_TYPEWRITER,
        fontSize: '15px',
        color: '#6b5a3a',
        align: 'center'
      }).setOrigin(0.5);
      this.pagesGroup.add(empty);
      return;
    }

    pageStamps.forEach((stamp, i) => {
      const sy = topY + cellH * i + cellH / 2;
      this._renderStamp(stamp, rightPageCenterX, sy);

      if (i < STAMPS_PER_PAGE - 1) {
        const divider = this.scene.add.rectangle(
          rightPageCenterX, topY + cellH * (i + 1), PAGE_WIDTH / 2 - 40, 1, INK_LINE_COLOR, 0.25
        );
        this.pagesGroup.add(divider);
      }
    });
  }

  _renderStamp(stamp, x, y) {
    const radius = 75;

    const stampContainer = this.scene.add.container(x, y);
    stampContainer.setAngle(stamp.rotationDeg);
    this.pagesGroup.add(stampContainer);

    const g = this.scene.add.graphics();
    const color = stamp.inkColor;
    g.lineStyle(4, color, 0.85);
    g.strokeCircle(0, 0, radius);
    g.lineStyle(2, color, 0.6);
    g.strokeCircle(0, 0, radius - 8);

    for (let i = 0; i < 28; i++) {
      const a1 = (i / 28) * Math.PI * 2;
      const a2 = a1 + 0.14;
      g.lineStyle(3, color, 0.7);
      g.beginPath();
      g.arc(0, 0, radius, a1, a2, false);
      g.strokePath();
    }
    stampContainer.add(g);

    const inkColorCss = Phaser.Display.Color.IntegerToColor(color).rgba;

    const titleText = this.scene.add.text(0, -34, stamp.title, {
      fontFamily: FONT_TYPEWRITER,
      fontSize: '14px',
      color: inkColorCss,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    stampContainer.add(titleText);

    const countryText = this.scene.add.text(0, -8, stamp.country.toUpperCase(), {
      fontFamily: FONT_TYPEWRITER,
      fontSize: stamp.country.length > 14 ? '13px' : '16px',
      color: inkColorCss,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: radius * 2 - 20 }
    }).setOrigin(0.5);
    stampContainer.add(countryText);

    const cityText = this.scene.add.text(0, 22, stamp.city, {
      fontFamily: FONT_TYPEWRITER,
      fontSize: '12px',
      color: inkColorCss
    }).setOrigin(0.5);
    stampContainer.add(cityText);

    const dateText = this.scene.add.text(0, 42, stamp.dateLabel, {
      fontFamily: FONT_TYPEWRITER,
      fontSize: '13px',
      color: inkColorCss,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    stampContainer.add(dateText);

    if (stamp.visitNumber > 1) {
      const visitBadge = this.scene.add.text(radius - 10, -radius + 10, `x${stamp.visitNumber}`, {
        fontFamily: FONT_PIXEL,
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#2a2118',
        padding: { x: 4, y: 3 }
      }).setOrigin(0.5);
      stampContainer.add(visitBadge);
    }

    const customsText = this.scene.add.text(0, radius + 22, stamp.customsNote, {
      fontFamily: FONT_TYPEWRITER,
      fontSize: '11px',
      color: '#5a4a30',
      align: 'center',
      wordWrap: { width: PAGE_WIDTH / 2 - 30 },
      fontStyle: 'italic'
    }).setOrigin(0.5);
    stampContainer.add(customsText);
  }
}