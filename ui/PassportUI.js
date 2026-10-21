// ui/PassportUI.js
import { getPassportManager } from '../managers/PassportManager.js';
import { EventBus } from '../EventBus.js';

const FONT_PIXEL = '"PressStart2P", monospace';
const FONT_TYPEWRITER = '"SpecialElite", monospace';

const PAGE_WIDTH = 720;
const PAGE_HEIGHT = 460;
const STAMPS_PER_PAGE = 2;

const COVER_W = PAGE_WIDTH + 40;
const COVER_H = PAGE_HEIGHT + 60;

const COVER_COLOR = 0x3b2415;
const COVER_COLOR_DARK = 0x2a1a0d;
const PAGE_COLOR = 0xf3e6c8;
const PAGE_COLOR_SHADOW = 0xe4d3a8;
const INK_LINE_COLOR = 0x2a2118;
const BRASS = 0xc9a24b;
const BRASS_DARK = 0x8a6a2a;
const GUILLOCHE_COLOR = 0x6f7f5f;
const MRZ_COLOR = 0xdcd0a8;
const DEFAULT_INK = 0x2e4a8f;

// Współrzędne stron względem pagesGroup (która siedzi na y = 10).
const LEFT_PAGE = { x: -PAGE_WIDTH / 2, y: -PAGE_HEIGHT / 2, w: PAGE_WIDTH / 2 - 4, h: PAGE_HEIGHT };
const RIGHT_PAGE = { x: 4, y: -PAGE_HEIGHT / 2, w: PAGE_WIDTH / 2 - 4, h: PAGE_HEIGHT };

// ─── Helpery ────────────────────────────────────────────────────────────────

function hashString(str) {
  let h = 2166136261 >>> 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// Deterministyczny PRNG: pieczątka wygląda tak samo przy każdym otwarciu.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mrzClean(str) {
  return String(str || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '<');
}

function padMrz(str, len = 44) {
  return (str + '<'.repeat(len)).slice(0, len);
}

function buildMrz(holderName, passportNumber) {
  const words = mrzClean(holderName).split('<').filter(Boolean);
  const surname = words.length > 1 ? words[words.length - 1] : (words[0] || 'DOE');
  const given = words.length > 1 ? words.slice(0, -1).join('<') : '';
  const digits = String(passportNumber || '').replace(/\D/g, '') || '000000000';

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

    this.isOpen = false;
    this.currentPage = 0;

    this.stampObjects = new Map();
    this._rings = new Set();
    this._closingContainer = null;
    this._turning = false;
    this._pendingSlamId = null;
    this._unseenStampId = null;
    this._keysBound = false;

    this._onOpenPassportEvent = (payload) => {
      this.open(payload && typeof payload === 'object' ? payload : {});
    };

    this._onPassportStamped = (stamp) => {
      const id = stamp?.stampId || null;

      // Pieczątka dostała się do paszportu, gdy był zamknięty:
      // trzaśniemy nią przy następnym otwarciu.
      if (!this.isOpen) {
        this._unseenStampId = id;
        return;
      }

      this._pendingSlamId = id;
      this.currentPage = this._lastPageIndex();
      this._render();
      this._slamPending();
    };

    this._onEsc = () => this.close();
    this._onLeft = () => this._changePage(-1);
    this._onRight = () => this._changePage(1);

    EventBus.on('ui:openPassport', this._onOpenPassportEvent);
    EventBus.on('passportStamped', this._onPassportStamped);
  }

  // ─── Tweeny (przez BaseScene, jeśli dostępne) ─────────────────────────────

  _tween(config) {
    const s = this.scene;
    if (!s?.tweens) return null;
    return typeof s.createTrackedTween === 'function'
      ? s.createTrackedTween(config)
      : s.tweens.add(config);
  }

  _kill(target) {
    if (!target) return;
    const s = this.scene;
    if (typeof s?.killTrackedTweensOf === 'function') {
      s.killTrackedTweensOf(target);
    } else {
      s?.tweens?.killTweensOf(target);
    }
  }

  // ─── Paginacja ────────────────────────────────────────────────────────────

  _totalPages() {
    const total = getPassportManager().getStampCount();
    return Math.max(1, Math.ceil(total / STAMPS_PER_PAGE));
  }

  _lastPageIndex() {
    return this._totalPages() - 1;
  }

  _pageOfStamp(stampId) {
    if (!stampId) return null;
    const idx = getPassportManager().getStamps().findIndex((s) => s.stampId === stampId);
    return idx < 0 ? null : Math.floor(idx / STAMPS_PER_PAGE);
  }

  // ─── Otwieranie / zamykanie ───────────────────────────────────────────────

  // options.highlightStampId - pieczątka do efektu "trzask" po otwarciu.
  open(options = {}) {
    if (this.isOpen || !this.scene?.cameras?.main) return;

    this.isOpen = true;
    this._turning = false;

    this._pendingSlamId = options.highlightStampId || this._unseenStampId || null;
    this._unseenStampId = null;

    const slamPage = this._pageOfStamp(this._pendingSlamId);
    this.currentPage = slamPage ?? this._lastPageIndex();

    this._buildContainer();
    this._render();
    this._bindKeys();

    this.container.setScale(0.85);
    this.container.setAlpha(0);

    this._tween({
      targets: this.container,
      scale: 1,
      alpha: 1,
      duration: 220,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (this.isOpen) this._slamPending();
      }
    });
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

    const target = this.container;
    this._kill(target);
    this._kill(this.pagesGroup);

    this.container = null;
    this.pagesGroup = null;
    this.prevBtn = null;
    this.nextBtn = null;
    this.pageCounterText = null;
    this.stampObjects.clear();

    this._closingContainer = target;

    const finish = () => {
      if (this._closingContainer === target) this._closingContainer = null;
      if (target.scene) target.destroy(true);
    };

    const tween = this._tween({
      targets: target,
      scale: 0.85,
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

  destroy() {
    EventBus.off('ui:openPassport', this._onOpenPassportEvent);
    EventBus.off('passportStamped', this._onPassportStamped);

    this._unbindKeys();
    this._clearFx();

    for (const c of this.stampObjects.values()) this._kill(c);
    this.stampObjects.clear();

    this._kill(this.container);
    this._kill(this.pagesGroup);
    this._kill(this._closingContainer);

    if (this.container) {
      this.container.destroy(true);
      this.container = null;
    }

    if (this._closingContainer) {
      this._closingContainer.destroy(true);
      this._closingContainer = null;
    }

    this.pagesGroup = null;
    this.isOpen = false;
  }

  // ─── Klawiatura ───────────────────────────────────────────────────────────

  _bindKeys() {
    const kb = this.scene?.input?.keyboard;
    if (!kb || this._keysBound) return;
    kb.on('keydown-ESC', this._onEsc);
    kb.on('keydown-LEFT', this._onLeft);
    kb.on('keydown-RIGHT', this._onRight);
    this._keysBound = true;
  }

  _unbindKeys() {
    if (!this._keysBound) return;
    const kb = this.scene?.input?.keyboard;
    kb?.off('keydown-ESC', this._onEsc);
    kb?.off('keydown-LEFT', this._onLeft);
    kb?.off('keydown-RIGHT', this._onRight);
    this._keysBound = false;
  }

  // ─── Budowa kontenera (okładka, przyciski) ────────────────────────────────

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

    // Niewidzialny blocker na obszarze książki: klik w okładkę/stronę
    // nie spada już na backdrop i nie zamyka paszportu.
    const bookBlocker = this.scene.add.rectangle(0, 0, COVER_W, COVER_H, 0x000000, 0);
    bookBlocker.setInteractive();
    this.container.add(bookBlocker);

    const bookShadow = this.scene.add.rectangle(6, 10, COVER_W, COVER_H, 0x000000, 0.35);
    this.container.add(bookShadow);

    this._buildCover();

    const title = this.scene.add.text(0, -COVER_H / 2 + 26, 'PASSPORT', {
      fontFamily: FONT_PIXEL,
      fontSize: '18px',
      color: '#d8c48a',
      stroke: '#1a0e05',
      strokeThickness: 4
    }).setOrigin(0.5);
    this.container.add(title);

    const closeBtn = this.scene.add.text(COVER_W / 2 - 26, -COVER_H / 2 + 22, 'X', {
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

    this.prevBtn = this._navButton(-PAGE_WIDTH / 2 + 6, PAGE_HEIGHT / 2 + 16, '‹ PREV', -1);
    this.nextBtn = this._navButton(PAGE_WIDTH / 2 - 60, PAGE_HEIGHT / 2 + 16, 'NEXT ›', 1);

    this.pageCounterText = this.scene.add.text(0, PAGE_HEIGHT / 2 + 16, '', {
      fontFamily: FONT_PIXEL,
      fontSize: '11px',
      color: '#f3e6c8'
    }).setOrigin(0.5);
    this.container.add(this.pageCounterText);
  }

  _navButton(x, y, label, direction) {
    const btn = this.scene.add.text(x, y, label, {
      fontFamily: FONT_PIXEL,
      fontSize: '11px',
      color: '#f3e6c8'
    }).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => this._changePage(direction));
    btn.on('pointerover', () => btn.setStyle({ color: '#ffd76a' }));
    btn.on('pointerout', () => btn.setStyle({ color: '#f3e6c8' }));

    this.container.add(btn);
    return btn;
  }

  _buildCover() {
    const g = this.scene.add.graphics();
    const x0 = -COVER_W / 2;
    const y0 = -COVER_H / 2;

    g.fillStyle(COVER_COLOR, 1);
    g.fillRoundedRect(x0, y0, COVER_W, COVER_H, 14);
    g.lineStyle(4, COVER_COLOR_DARK, 1);
    g.strokeRoundedRect(x0, y0, COVER_W, COVER_H, 14);

    // Faktura skóry: stałe ziarno (PRNG z ustalonym seedem)
    const rng = mulberry32(1990);
    for (let i = 0; i < 260; i++) {
      const px = x0 + 6 + rng() * (COVER_W - 12);
      const py = y0 + 6 + rng() * (COVER_H - 12);
      const size = rng() < 0.6 ? 1 : 2;
      g.fillStyle(rng() < 0.7 ? 0x000000 : 0xffffff, rng() < 0.7 ? 0.14 : 0.05);
      g.fillRect(px, py, size, size);
    }

    // Tłoczona złota ramka
    g.lineStyle(2, BRASS, 0.55);
    g.strokeRoundedRect(x0 + 7, y0 + 7, COVER_W - 14, COVER_H - 14, 10);
    g.lineStyle(1, BRASS_DARK, 0.7);
    g.strokeRoundedRect(x0 + 10, y0 + 10, COVER_W - 20, COVER_H - 20, 8);

    // Przeszycie
    g.fillStyle(0x6b4a2a, 0.9);
    for (let x = x0 + 22; x < x0 + COVER_W - 22; x += 9) {
      g.fillRect(x, y0 + 13, 4, 2);
      g.fillRect(x, y0 + COVER_H - 15, 4, 2);
    }
    for (let y = y0 + 22; y < y0 + COVER_H - 22; y += 9) {
      g.fillRect(x0 + 13, y, 2, 4);
      g.fillRect(x0 + COVER_W - 15, y, 2, 4);
    }

    this.container.add(g);

    this._brassCorner(x0 + 14, y0 + 14);
    this._brassCorner(-x0 - 14, y0 + 14);
    this._brassCorner(x0 + 14, -y0 - 14);
    this._brassCorner(-x0 - 14, -y0 - 14);
  }

  _brassCorner(x, y) {
    const corner = this.scene.add.circle(x, y, 6, BRASS);
    corner.setStrokeStyle(2, BRASS_DARK);
    this.container.add(corner);
  }

  // ─── Zmiana strony (animacja kartkowania) ─────────────────────────────────

  _changePage(direction) {
    if (!this.isOpen || this._turning || !this.pagesGroup) return;

    const target = this.currentPage + direction;
    if (target < 0 || target >= this._totalPages()) return;

    this._turning = true;

    const out = this._tween({
      targets: this.pagesGroup,
      alpha: 0,
      x: -20 * direction,
      duration: 100,
      ease: 'Sine.easeIn',
      onComplete: () => {
        if (!this.isOpen || !this.pagesGroup?.scene) {
          this._turning = false;
          return;
        }

        this.currentPage = target;
        this._render();
        this.pagesGroup.x = 20 * direction;

        const back = this._tween({
          targets: this.pagesGroup,
          alpha: 1,
          x: 0,
          duration: 140,
          ease: 'Sine.easeOut',
          onComplete: () => {
            this._turning = false;
          }
        });

        if (!back) this._turning = false;
      }
    });

    if (!out) this._turning = false;
  }

  // ─── Render rozkładówki ───────────────────────────────────────────────────

  _clearFx() {
    for (const ring of this._rings) {
      this._kill(ring);
      if (ring.scene) ring.destroy();
    }
    this._rings.clear();
  }

  _render() {
    if (!this.pagesGroup) return;

    for (const c of this.stampObjects.values()) this._kill(c);
    this.stampObjects.clear();
    this._clearFx();
    this.pagesGroup.removeAll(true);

    const pm = getPassportManager();
    const stamps = pm.getStamps();
    const totalPages = Math.max(1, Math.ceil(stamps.length / STAMPS_PER_PAGE));

    this.currentPage = Math.min(this.currentPage, totalPages - 1);

    this._drawPages();

    this._renderIdPage(LEFT_PAGE.x + 18, LEFT_PAGE.y + 18);

    const pageStamps = stamps.slice(
      this.currentPage * STAMPS_PER_PAGE,
      this.currentPage * STAMPS_PER_PAGE + STAMPS_PER_PAGE
    );
    this._renderStampsPage(pageStamps);

    this.pageCounterText.setText(
      `Page ${this.currentPage + 1} / ${totalPages}  ·  ${stamps.length} stamp${stamps.length === 1 ? '' : 's'}`
    );

    this.prevBtn.setAlpha(this.currentPage === 0 ? 0.35 : 1);
    this.nextBtn.setAlpha(this.currentPage >= totalPages - 1 ? 0.35 : 1);
  }

  _drawPages() {
    const g = this.scene.add.graphics();

    g.fillStyle(PAGE_COLOR_SHADOW, 1);
    g.fillRoundedRect(LEFT_PAGE.x, LEFT_PAGE.y, LEFT_PAGE.w, LEFT_PAGE.h, 6);

    g.fillStyle(PAGE_COLOR, 1);
    g.fillRoundedRect(RIGHT_PAGE.x, RIGHT_PAGE.y, RIGHT_PAGE.w, RIGHT_PAGE.h, 6);

    this._drawGuilloche(g, LEFT_PAGE);
    this._drawGuilloche(g, RIGHT_PAGE);

    // Cieniowanie przy grzbiecie
    for (let i = 0; i < 16; i++) {
      g.fillStyle(0x000000, 0.2 * (1 - i / 16));
      g.fillRect(RIGHT_PAGE.x + i, RIGHT_PAGE.y + 2, 1, RIGHT_PAGE.h - 4);
      g.fillRect(LEFT_PAGE.x + LEFT_PAGE.w - 1 - i, LEFT_PAGE.y + 2, 1, LEFT_PAGE.h - 4);
    }

    // Krawędzie "pliku kartek" po zewnętrznych bokach
    g.lineStyle(1, 0xb8a678, 0.8);
    g.lineBetween(LEFT_PAGE.x - 2, LEFT_PAGE.y + 6, LEFT_PAGE.x - 2, LEFT_PAGE.y + LEFT_PAGE.h - 6);
    g.lineBetween(LEFT_PAGE.x - 4, LEFT_PAGE.y + 10, LEFT_PAGE.x - 4, LEFT_PAGE.y + LEFT_PAGE.h - 10);
    g.lineBetween(RIGHT_PAGE.x + RIGHT_PAGE.w + 2, RIGHT_PAGE.y + 6, RIGHT_PAGE.x + RIGHT_PAGE.w + 2, RIGHT_PAGE.y + RIGHT_PAGE.h - 6);
    g.lineBetween(RIGHT_PAGE.x + RIGHT_PAGE.w + 4, RIGHT_PAGE.y + 10, RIGHT_PAGE.x + RIGHT_PAGE.w + 4, RIGHT_PAGE.y + RIGHT_PAGE.h - 10);

    this.pagesGroup.add(g);
  }

  // Delikatny wzór zabezpieczający, jak w prawdziwych paszportach.
  _drawGuilloche(g, r) {
    g.lineStyle(1, GUILLOCHE_COLOR, 0.12);
    const cy = r.y + r.h / 2;
    const amp = r.h * 0.38;

    for (let k = 0; k < 7; k++) {
      g.beginPath();
      for (let px = 0; px <= r.w; px += 5) {
        const y = cy + Math.sin(px * 0.035 + k * 0.7) * amp * Math.cos(px * 0.009 + k * 0.3);
        if (px === 0) g.moveTo(r.x + px, y);
        else g.lineTo(r.x + px, y);
      }
      g.strokePath();
    }
  }

  // Zmniejsza tekst skalą, jeśli nie mieści się w maxW.
  _fitWidth(textObj, maxW) {
    if (textObj.width > maxW) textObj.setScale(maxW / textObj.width);
    return textObj;
  }

  // ─── Strona z danymi ──────────────────────────────────────────────────────

  _renderIdPage(x, y) {
    const pm = getPassportManager();
    const data = pm.serialize();
    const holder = pm.getHolderName();
    const number = pm.getPassportNumber();
    const pageInnerW = LEFT_PAGE.w - 36;

    const labelStyle = {
      fontFamily: FONT_TYPEWRITER,
      fontSize: '13px',
      color: '#2a2118'
    };

    const valueStyle = {
      fontFamily: FONT_TYPEWRITER,
      fontSize: '15px',
      color: '#1a1108',
      fontStyle: 'bold'
    };

    const add = (obj) => {
      this.pagesGroup.add(obj);
      return obj;
    };

    // Żart na górze strony
    add(this.scene.add.text(
      x,
      y + 2,
      'ANY PERSON HOLDING THIS DOCUMENT IS\nPROBABLY IN OVER THEIR HEAD.',
      {
        fontFamily: FONT_TYPEWRITER,
        fontSize: '9px',
        color: '#6b5a3a',
        align: 'left'
      }
    ));

    // Zdjęcie (przesunięte w prawo, jak w Twojej wersji)
    const photoX = x + 180;
    const photoY = y + 58;
    const photoCenterX = photoX + 45;
    const photoCenterY = photoY + 55;

    add(this.scene.add.rectangle(photoX, photoY, 90, 110, 0xe8e0cc, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, INK_LINE_COLOR));

    add(this.scene.add.text(photoCenterX, photoCenterY, '🕵', { fontSize: '44px' })
      .setOrigin(0.5)
      .setAlpha(0.55));

    // Żart: agencja "zgubiła" fotografię.
    add(this.scene.add.rectangle(photoCenterX, photoCenterY, 100, 26, 0x1a1108, 0.88)
      .setAngle(-18));

    add(this.scene.add.text(photoCenterX, photoCenterY, 'REDACTED', {
      fontFamily: FONT_PIXEL,
      fontSize: '9px',
      color: '#e8dcb8'
    }).setOrigin(0.5).setAngle(-18));

    add(this.scene.add.text(photoCenterX, photoY + 120, 'PHOTO ON FILE', {
      fontFamily: FONT_TYPEWRITER,
      fontSize: '9px',
      color: '#6b5a3a'
    }).setOrigin(0.5));

    // Mini-pola po lewej od zdjęcia (wcześniej pusto)
    const countries = pm.getVisitedCountries().filter((c) => c && c !== 'Unknown Country').length;
    const sideFields = [
      ['RANK', pm.getPlayerRank()],
      ['ISSUED', data.issuedDayLabel || 'Not stamped yet'],
      ['TRIPS', `${pm.getStampCount()} (${countries} ${countries === 1 ? 'country' : 'countries'})`]
    ];

    let sy = photoY;
    sideFields.forEach(([label, value]) => {
      add(this.scene.add.text(x, sy, label, labelStyle));
      add(this._fitWidth(this.scene.add.text(x, sy + 15, String(value), valueStyle), 150));
      sy += 40;
    });

    // Główne pola
    const rows = [['SURNAME / GIVEN NAME', holder]];
    const alias = pm.getAlias();
    if (alias) rows.push(['ALIAS', alias]);
    rows.push(
      ['PASSPORT NO.', number],
      ['AUTHORITY', 'MARK AGENCY']
    );

    let rowY = y + 195;
    rows.forEach(([label, value]) => {
      add(this.scene.add.text(x, rowY, label, labelStyle));
      add(this._fitWidth(this.scene.add.text(x, rowY + 15, String(value), valueStyle), pageInnerW));
      rowY += 34;
    });

    // Pas MRZ na dole strony
    const mrzY = LEFT_PAGE.y + LEFT_PAGE.h - 70;
    const strip = this.scene.add.graphics();
    strip.fillStyle(MRZ_COLOR, 0.9);
    strip.fillRect(LEFT_PAGE.x + 12, mrzY, LEFT_PAGE.w - 24, 56);
    strip.lineStyle(1, 0xb8a678, 1);
    strip.strokeRect(LEFT_PAGE.x + 12, mrzY, LEFT_PAGE.w - 24, 56);
    add(strip);

    const [mrz1, mrz2] = buildMrz(holder, number);
    [mrz1, mrz2].forEach((line, i) => {
      const t = this.scene.add.text(LEFT_PAGE.x + 20, mrzY + 9 + i * 21, line, {
        fontFamily: FONT_TYPEWRITER,
        fontSize: '12px',
        color: '#2a2118'
      });
      add(this._fitWidth(t, LEFT_PAGE.w - 40));
    });
  }

  // ─── Strona z pieczątkami ─────────────────────────────────────────────────

  _renderStampsPage(pageStamps) {
    const rightPageCenterX = PAGE_WIDTH / 4 + 2;
    const usableHeight = PAGE_HEIGHT - 40;
    const cellH = usableHeight / STAMPS_PER_PAGE;
    const topY = -PAGE_HEIGHT / 2 + 20;

    this.pagesGroup.add(
      this.scene.add.text(rightPageCenterX, -PAGE_HEIGHT / 2 + 6, 'VISAS & ENTRIES', {
        fontFamily: FONT_PIXEL,
        fontSize: '8px',
        color: '#8a7650'
      }).setOrigin(0.5, 0)
    );

    if (pageStamps.length === 0) {
      this.pagesGroup.add(
        this.scene.add.text(
          rightPageCenterX,
          0,
          'No stamps yet.\nGo catch a flight, detective.',
          {
            fontFamily: FONT_TYPEWRITER,
            fontSize: '15px',
            color: '#6b5a3a',
            align: 'center'
          }
        ).setOrigin(0.5)
      );
      return;
    }

    pageStamps.forEach((stamp, index) => {
      const stampY = topY + cellH * index + cellH / 2;

      this._renderStamp(stamp, rightPageCenterX, stampY);

      if (index < STAMPS_PER_PAGE - 1) {
        this.pagesGroup.add(
          this.scene.add.rectangle(
            rightPageCenterX,
            topY + cellH * (index + 1),
            PAGE_WIDTH / 2 - 40,
            1,
            INK_LINE_COLOR,
            0.25
          )
        );
      }
    });
  }

  _renderStamp(stamp, x, y) {
    const radius = 75;

    const seed = hashString(stamp.stampId || `${stamp.city}${stamp.dateLabel}`);
    const rng = mulberry32(seed);
    const variant = seed % 3; // 0 = koło, 1 = prostokąt, 2 = elipsa

    const color = Number.isFinite(stamp.inkColor) ? stamp.inkColor : DEFAULT_INK;
    const country = String(stamp.country || 'Unknown Country');
    const baseAngle = Number(stamp.rotationDeg) || 0;

    const stampContainer = this.scene.add.container(x, y);
    stampContainer.setAngle(baseAngle);
    stampContainer.setData('baseAngle', baseAngle);
    stampContainer.setData('inkColor', color);
    this.pagesGroup.add(stampContainer);

    if (stamp.stampId) this.stampObjects.set(stamp.stampId, stampContainer);

    const graphics = this.scene.add.graphics();

    if (variant === 0) {
      graphics.lineStyle(4, color, 0.85);
      graphics.strokeCircle(0, 0, radius);

      graphics.lineStyle(2, color, 0.6);
      graphics.strokeCircle(0, 0, radius - 8);

      for (let i = 0; i < 28; i++) {
        const a1 = (i / 28) * Math.PI * 2;
        const a2 = a1 + 0.14;

        graphics.lineStyle(3, color, 0.7);
        graphics.beginPath();
        graphics.arc(0, 0, radius, a1, a2, false);
        graphics.strokePath();
      }
    } else if (variant === 1) {
      graphics.lineStyle(4, color, 0.85);
      graphics.strokeRoundedRect(-88, -56, 176, 112, 10);
      graphics.lineStyle(2, color, 0.6);
      graphics.strokeRoundedRect(-80, -48, 160, 96, 6);
    } else {
      graphics.lineStyle(4, color, 0.85);
      graphics.strokeEllipse(0, 0, 176, 128);
      graphics.lineStyle(2, color, 0.6);
      graphics.strokeEllipse(0, 0, 160, 112);
    }

    stampContainer.add(graphics);

    const inkColorCss = Phaser.Display.Color.IntegerToColor(color).rgba;

    const addStampText = (ty, str, style) => {
      const t = this.scene.add.text(0, ty, str, {
        fontFamily: FONT_TYPEWRITER,
        color: inkColorCss,
        ...style
      }).setOrigin(0.5).setAlpha(0.92);
      stampContainer.add(t);
      return t;
    };

    addStampText(-34, stamp.title || 'ENTRY', { fontSize: '14px', fontStyle: 'bold' });

    addStampText(-8, country.toUpperCase(), {
      fontSize: country.length > 14 ? '13px' : '16px',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: radius * 2 - 20 }
    });

    addStampText(22, String(stamp.city || '???'), { fontSize: '12px' });
    addStampText(42, String(stamp.dateLabel || ''), { fontSize: '13px', fontStyle: 'bold' });

    // "Zużycie" tuszu: kropki w kolorze papieru nad całością
    const wear = this.scene.add.graphics();
    wear.fillStyle(PAGE_COLOR, 0.5);
    for (let i = 0; i < 40; i++) {
      const wx = (rng() - 0.5) * 2 * radius * 0.95;
      const wy = (rng() - 0.5) * 2 * radius * 0.8;
      wear.fillRect(wx, wy, rng() < 0.5 ? 1 : 2, rng() < 0.5 ? 1 : 2);
    }
    stampContainer.add(wear);

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

    const customsText = this.scene.add.text(0, radius + 22, String(stamp.customsNote || ''), {
      fontFamily: FONT_TYPEWRITER,
      fontSize: '11px',
      color: '#5a4a30',
      align: 'center',
      wordWrap: { width: PAGE_WIDTH / 2 - 30 },
      fontStyle: 'italic'
    }).setOrigin(0.5);
    stampContainer.add(customsText);

    // Interakcja: lekki "przechył" po najechaniu, kołysanie po kliknięciu
    stampContainer.setSize(radius * 2, radius * 2);
    stampContainer.setInteractive();

    stampContainer.on('pointerover', () => {
      this._kill(stampContainer);
      this._tween({ targets: stampContainer, scale: 1.05, duration: 110, ease: 'Sine.easeOut' });
    });

    stampContainer.on('pointerout', () => {
      this._kill(stampContainer);
      this._tween({
        targets: stampContainer,
        scale: 1,
        angle: baseAngle,
        duration: 110,
        ease: 'Sine.easeOut'
      });
    });

    stampContainer.on('pointerdown', () => {
      this._kill(stampContainer);
      stampContainer.setAngle(baseAngle);
      this._tween({
        targets: stampContainer,
        angle: baseAngle + 4,
        duration: 60,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeInOut'
      });
    });
  }

  // ─── Efekt "trzask" dla nowej pieczątki ───────────────────────────────────

  _slamPending() {
    const id = this._pendingSlamId;
    if (!id) return;
    this._pendingSlamId = null;
    this._playSlam(this.stampObjects.get(id));
  }

  _playSlam(stampContainer) {
    if (!stampContainer?.scene || !this.isOpen) return;

    this._kill(stampContainer);

    const baseAngle = stampContainer.getData('baseAngle') ?? 0;
    const ink = stampContainer.getData('inkColor') ?? DEFAULT_INK;

    stampContainer.setScale(2.6).setAlpha(0).setAngle(baseAngle + 14);

    this._tween({
      targets: stampContainer,
      scale: 1,
      alpha: 1,
      angle: baseAngle,
      duration: 220,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        if (!this.isOpen || !stampContainer.scene || !this.pagesGroup) return;

        this.scene.cameras.main.shake(110, 0.004);

        const ring = this.scene.add.graphics();
        ring.lineStyle(3, ink, 0.6);
        ring.strokeCircle(0, 0, 40);
        ring.setPosition(stampContainer.x, stampContainer.y);
        this.pagesGroup.add(ring);
        this._rings.add(ring);

        this._tween({
          targets: ring,
          scale: 2.4,
          alpha: 0,
          duration: 380,
          ease: 'Quad.easeOut',
          onComplete: () => {
            this._rings.delete(ring);
            if (ring.scene) ring.destroy();
          }
        });
      }
    });
  }
}