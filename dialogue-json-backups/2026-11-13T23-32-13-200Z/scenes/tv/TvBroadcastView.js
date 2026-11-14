import {
  ensureBackdropTexture,
  ensureKeyedTexture,
  mixColor,
  parseColor
} from './TvBroadcastTextures.js';

const FONT_PIXEL = 'PressStart2P';
const FONT_TYPE = 'SpecialElite';

const GOLD = 0xcbbd78;

const NEWS_JOKES = [
  'MONKEY CAMERAMAN DENIES ALL UNION VIOLATIONS',
  'CAT ON ANCHOR DESK STILL NOT FACING CHARGES',
  'REMINDER: A FAKE MUSTACHE IS NOT AN ALIBI',
  'MARK AGENCY COFFEE SUBSTITUTE RECALLED. NOBODY NOTICED',
  'WEATHER: SHIFTY, WITH A CHANCE OF CONSPIRACY',
  'LOCAL PAWN SHOP DENIES EVER SEEING ANYTHING SHINY',
  'EXPERTS AGREE: SOMEBODY DID SOMETHING',
  'STAY TUNED. WE HAVE NO IDEA WHAT HAPPENS NEXT'
];

const AD_STICKERS = [
  'AS SEEN ON TV!',
  'NOW 14% MORE!',
  'LIMITED OFFER!',
  'ASK YOUR DOCTOR*',
  '*NOT A DOCTOR',
  'NEW AND SUSPICIOUS!'
];

const AD_KINDS = ['ad', 'advertisement', 'commercial'];

export class TvBroadcastView {
  constructor(scene, layout) {
    this.scene = scene;
    this.layout = layout;
    this.ui = {};

    this.k = 1;
    this.metrics = null;

    this.colors = {
      base: 0x1e2a24,
      top: 0x30453d,
      badge: 0x8f3043,
      bottom: 0x09110f
    };

    this.bodyFullText = '';
    this.bodyMaxH = 0;

    this.segmentIndex = 0;
    this.segmentTotal = 0;
    this.dotsRight = 0;

    this.tweens = [];
    this.tickerTween = null;
    this.progressTween = null;
    this.hintTween = null;
    this.osdCall = null;

    this.onScreenClick = null;
  }

  /* ========================================================
     CREATE
     ======================================================== */

  create(anchorTextureKey) {
    this.createRoot();
    this.createBackdrop();
    this.createTvShell();
    this.createScreenUI(anchorTextureKey);
  }

  createRoot() {
    this.ui.root = this.scene.add
      .container(this.layout.centerX, this.layout.centerY)
      .setAlpha(0)
      .setDepth(10);
  }

  createBackdrop() {
    this.ui.backdrop = this.scene.add
      .rectangle(0, 0, this.layout.width, this.layout.height, 0x000000, 0.6)
      .setOrigin(0)
      .setAlpha(0)
      .setDepth(1)
      .setInteractive();
  }

  createTvShell() {
    const {
      centerX,
      centerY,
      screenOffsetX,
      screenOffsetY,
      screenWidth,
      screenHeight,
      screenChamfer
    } = this.layout;

    this.ui.screenContainer = this.scene.add.container(
      screenOffsetX,
      screenOffsetY
    );

    this.ui.root.add(this.ui.screenContainer);

    this.ui.screenFrame = this.scene.add.rectangle(
      0,
      0,
      screenWidth,
      screenHeight,
      0x0b1411
    );

    this.ui.screenContainer.add(this.ui.screenFrame);

    const hw = screenWidth / 2;
    const hh = screenHeight / 2;
    const cut = screenChamfer;

    const mask = this.scene.make.graphics({
      x: centerX + screenOffsetX,
      y: centerY + screenOffsetY,
      add: false
    });

    mask.fillStyle(0xffffff, 1);
    mask.beginPath();
    mask.moveTo(-hw + cut, -hh);
    mask.lineTo(hw - cut, -hh);
    mask.lineTo(hw, -hh + cut);
    mask.lineTo(hw, hh - cut);
    mask.lineTo(hw - cut, hh);
    mask.lineTo(-hw + cut, hh);
    mask.lineTo(-hw, hh - cut);
    mask.lineTo(-hw, -hh + cut);
    mask.closePath();
    mask.fillPath();

    this.ui.screenMaskGraphics = mask;
    this.ui.screenMask = mask.createGeometryMask();

    this.ui.tvSprite = this.scene.add
      .image(0, 0, 'television')
      .setOrigin(0.5);

    this.ui.root.add(this.ui.tvSprite);
  }

  fs(n) {
    return Math.max(8, Math.round(n * this.k));
  }

  createScreenUI(anchorTextureKey) {
    const scene = this.scene;
    const u = this.ui;

    const {
      screenWidth: sw,
      screenHeight: sh,
      screenLeft: L,
      screenRight: R,
      screenTop: T,
      screenBottom: B,
      screenSafeWidth: SW
    } = this.layout;

    this.k = Phaser.Math.Clamp(sw / 900, 0.75, 1.6);

    const k = this.k;
    const headerH = Math.round(30 * k);
    const tickerH = Math.round(26 * k);

    this.metrics = {
      sw,
      sh,
      L,
      R,
      T,
      B,
      SW,
      headerH,
      tickerH,
      stageTop: T + headerH,
      stageBottom: B - tickerH,
      stageH: B - tickerH - (T + headerH)
    };

    const m = this.metrics;

    u.screenInner = scene.add.container(0, 0);
    u.screenInner.setMask(u.screenMask);
    u.screenContainer.add(u.screenInner);

    const text = (size, color, family = FONT_PIXEL, extra = {}) =>
      scene.add.text(0, 0, '', {
        fontFamily: family,
        fontSize: `${size}px`,
        color,
        ...extra
      });

    const rect = (color, alpha = 1) =>
      scene.add.rectangle(0, 0, 10, 10, color, alpha).setOrigin(0);

    /* ---------- stage ---------- */

    u.screenBg = scene.add.rectangle(0, 0, sw, sh, 0x1a2621);
    u.background = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    u.presenter = scene.add
      .image(0, 0, '__DEFAULT')
      .setOrigin(0.5, 1)
      .setVisible(false);

    u.panelBg = rect(0x07110d, 0.86).setStrokeStyle(2, GOLD, 0.55);
    u.panelEdge = rect(0x8f3043, 1);
    u.panelDivider = rect(GOLD, 0.35);
    u.nameTab = rect(0x1b1710, 0.96).setStrokeStyle(2, GOLD, 0.7);

    u.titlePlate = rect(0x07110d, 0.78);
    u.titleAccent = rect(0x8f3043, 1);
    u.titleText = text(this.fs(11), '#fff6cf');

    u.factsPlate = rect(0x07110d, 0.78);
    u.factsAccent = rect(GOLD, 1);
    u.factsText = text(this.fs(9), '#d7efe5', FONT_PIXEL, {
      lineSpacing: Math.round(6 * k)
    });

    u.anchorText = text(this.fs(22), '#d7efe5', FONT_TYPE);

    u.bodyText = text(this.fs(24), '#f3f5f1', FONT_TYPE, {
      wordWrap: { width: SW - 20, useAdvancedWrap: true },
      lineSpacing: 8
    });

    u.sticker = text(this.fs(10), '#fff5ef', FONT_PIXEL, {
      backgroundColor: '#8f3043',
      padding: { x: 10, y: 8 }
    }).setOrigin(0.5);

    /* ---------- ticker ---------- */

    const tickerY = m.stageBottom;

    u.tickerBar = scene.add
      .rectangle(
        0,
        (tickerY + sh / 2) / 2,
        sw,
        sh / 2 - tickerY,
        0x09110f,
        0.96
      );

    u.tickerLine = scene.add
      .rectangle(0, tickerY, sw, 2, 0x8f3043, 1)
      .setOrigin(0.5, 0.5);

    u.tickerText = text(this.fs(10), '#f8e7a7').setOrigin(0, 0.5);

    const capRight = m.L + Math.round(84 * k);

    u.tickerCap = scene.add
      .rectangle(
        (-sw / 2 + capRight) / 2,
        (tickerY + sh / 2) / 2,
        capRight + sw / 2,
        sh / 2 - tickerY,
        0x8f3043,
        1
      );

    u.tickerCapText = text(this.fs(10), '#fff5ef')
      .setOrigin(0.5)
      .setPosition((m.L + capRight) / 2, tickerY + tickerH / 2);

    this.capRight = capRight;

    /* ---------- header ---------- */

    const headerBottom = m.T + headerH;

    u.headerBar = scene.add.rectangle(
      0,
      (-sh / 2 + headerBottom) / 2,
      sw,
      headerBottom + sh / 2,
      0x30453d,
      0.96
    );

    u.headerLine = scene.add
      .rectangle(0, headerBottom, sw, 2, 0x8f3043, 1)
      .setOrigin(0.5, 0.5);

    u.progressBar = scene.add
      .rectangle(-sw / 2, headerBottom + Math.round(2 * k), sw, Math.round(3 * k), 0xffe58a, 0.9)
      .setOrigin(0, 0.5)
      .setScale(0, 1)
      .setVisible(false);

    u.liveDot = scene.add.circle(0, 0, Math.round(5 * k), 0xff3b3b, 1);
    u.labelText = text(this.fs(10), '#f8e7a7').setOrigin(0, 0.5);

    u.badgeBox = scene.add.rectangle(0, 0, 10, Math.round(18 * k), 0x8f3043, 1)
      .setOrigin(0, 0.5);

    u.badgeText = text(this.fs(8), '#fff5ef').setOrigin(0, 0.5);

    u.clockText = text(this.fs(10), '#bfe8d2').setOrigin(0.5);
    u.channelText = text(this.fs(10), '#d7ffea').setOrigin(1, 0.5);

    u.segGfx = scene.add.graphics();

    /* ---------- overlays ---------- */

    u.osdBg = rect(0x000000, 0.7).setVisible(false);
    u.osdText = text(this.fs(12), '#7dffa6').setVisible(false);

    u.hintText = text(this.fs(9), '#f8e7a7', FONT_PIXEL, {
      backgroundColor: '#0b0f0d',
      padding: { x: 10, y: 7 }
    })
      .setOrigin(0.5, 1)
      .setPosition(0, m.stageBottom - Math.round(10 * k))
      .setAlpha(0)
      .setVisible(false);

    u.pauseDim = scene.add
      .rectangle(0, 0, sw, sh, 0x000000, 0.4)
      .setVisible(false);

    u.pauseText = text(this.fs(22), '#fff6cf', FONT_PIXEL, {
      stroke: '#000000',
      strokeThickness: 6
    })
      .setOrigin(0.5)
      .setVisible(false);

    u.screenHit = scene.add
      .zone(0, 0, sw, sh)
      .setInteractive({ useHandCursor: false });

    u.screenHit.on('pointerdown', () => this.onScreenClick?.());

    u.screenInner.add([
      u.screenBg,
      u.background,
      u.presenter,

      u.panelBg,
      u.panelEdge,
      u.panelDivider,
      u.nameTab,

      u.titlePlate,
      u.titleAccent,
      u.titleText,

      u.factsPlate,
      u.factsAccent,
      u.factsText,

      u.anchorText,
      u.bodyText,
      u.sticker,

      u.tickerBar,
      u.tickerLine,
      u.tickerText,
      u.tickerCap,
      u.tickerCapText,

      u.headerBar,
      u.headerLine,
      u.progressBar,
      u.liveDot,
      u.labelText,
      u.badgeBox,
      u.badgeText,
      u.clockText,
      u.channelText,
      u.segGfx,

      u.osdBg,
      u.osdText,
      u.hintText,
      u.pauseDim,
      u.pauseText,
      u.screenHit
    ]);

    this.tweens.push(
      scene.tweens.add({
        targets: u.liveDot,
        alpha: 0.25,
        duration: 650,
        yoyo: true,
        repeat: -1
      }),
      scene.tweens.add({
        targets: u.badgeBox,
        alpha: 0.7,
        duration: 800,
        yoyo: true,
        repeat: -1
      })
    );

    u.anchorTextureKey = anchorTextureKey;
  }

  addScreenEffects(effects) {
    if (!this.ui.screenInner || !Array.isArray(effects)) return;

    // efekty na samej górze, nad całym UI ekranu
    this.ui.screenInner.add(effects);
  }

  /* ========================================================
     HELPERS
     ======================================================== */

  textureExists(key) {
    return Boolean(key && this.scene?.textures?.exists(key));
  }

  getSegmentKind(segment) {
    if (segment?.type === 'news') return 'news';
    if (AD_KINDS.includes(segment?.type)) return 'ad';

    return 'filler';
  }

  placeCover(image, key, boxW, boxH, focusX = 0.5, focusY = 0.5) {
    image.setCrop();
    image.setTexture(key);

    const frame = image.frame;
    const tw = frame.realWidth;
    const th = frame.realHeight;

    if (!tw || !th) return false;

    const s = Math.max(boxW / tw, boxH / th);

    const cw = boxW / s;
    const ch = boxH / s;
    const cx = (tw - cw) * focusX;
    const cy = (th - ch) * focusY;

    image
      .setOrigin(0.5)
      .setScale(s)
      .setPosition(
        -boxW / 2 + s * (tw / 2 - cx),
        -boxH / 2 + s * (th / 2 - cy)
      )
      .setCrop(cx, cy, cw, ch)
      .setVisible(true)
      .setAlpha(1);

    return true;
  }

  placeFull(image, key, w, h) {
    image.setCrop();
    image.setTexture(key);
    image.setOrigin(0.5).setScale(1).setPosition(0, 0).setDisplaySize(w, h);
    image.setVisible(true).setAlpha(1);
  }

  fitBody(fullText, maxW, maxH, sizes, align = 'left') {
    const t = this.ui.bodyText;

    t.setAlign(align).setWordWrapWidth(Math.max(40, maxW), true);

    let chosen = sizes[sizes.length - 1];

    for (const size of sizes) {
      t.setFontSize(size);
      t.setLineSpacing(Math.round(size * 0.32));
      t.setText(fullText);

      if (t.height <= maxH) {
        chosen = size;
        break;
      }
    }

    t.setFontSize(chosen);
    t.setLineSpacing(Math.round(chosen * 0.32));
    t.setText('');

    this.bodyMaxH = maxH;
    this.bodyFullText = '';
  }

  /* ========================================================
     SEGMENT
     ======================================================== */

  applySegment(segment, options = {}) {
    const kind = this.getSegmentKind(segment);

    this.applyTheme(segment.theme || {});
    this.resetLayout();
    this.applyHeader(segment, kind);

    if (kind === 'news') {
      this.applyNewsLayout(segment);
    } else if (kind === 'ad') {
      this.applyAdLayout(segment);
    } else {
      this.applyPresenterLayout(segment, options);
    }

    this.setTicker(segment, kind, options.tickerExtras || []);
    this.setBodyText('');
  }

  resetLayout() {
    const u = this.ui;

    [
      u.background,
      u.presenter,
      u.panelBg,
      u.panelEdge,
      u.panelDivider,
      u.nameTab,
      u.titlePlate,
      u.titleAccent,
      u.titleText,
      u.factsPlate,
      u.factsAccent,
      u.factsText,
      u.anchorText,
      u.sticker
    ].forEach((object) => object?.setVisible(false));

    u.bodyText.setOrigin(0, 0);
  }

  applyTheme(theme) {
    const colors = this.colors;

    colors.base = parseColor(theme.screenColor, 0x1e2a24);
    colors.top = parseColor(theme.topBarColor, 0x30453d);
    colors.badge = parseColor(theme.badgeColor, 0x8f3043);
    colors.bottom = parseColor(theme.bottomColor, mixColor(colors.base, 0x000000, 0.65));

    const u = this.ui;

    u.screenBg.setFillStyle(colors.base, 1);
    u.headerBar.setFillStyle(colors.top, 0.97);
    u.headerLine.setFillStyle(colors.badge, 1);
    u.badgeBox.setFillStyle(colors.badge, 1);
    u.tickerBar.setFillStyle(colors.bottom, 0.97);
    u.tickerLine.setFillStyle(colors.badge, 1);
    u.tickerCap.setFillStyle(colors.badge, 1);
    u.panelEdge.setFillStyle(colors.badge, 1);
    u.titleAccent.setFillStyle(colors.badge, 1);
    u.sticker.setBackgroundColor(`#${colors.badge.toString(16).padStart(6, '0')}`);
  }

  applyHeader(segment, kind) {
    const u = this.ui;

    const fallbackLabel =
      kind === 'news'
        ? 'BREAKING NEWS'
        : kind === 'ad'
          ? 'ADVERTISEMENT'
          : 'LIVE';

    u.labelText.setText(segment.label || fallbackLabel);
    u.channelText.setText(segment.channel || 'CH-03');
    u.badgeText.setText(segment.badge || '');

    u.liveDot.setVisible(kind !== 'ad');

    u.tickerCapText.setText(
      kind === 'news' ? 'NEWS' : kind === 'ad' ? 'AD' : 'LIVE'
    );

    this.layoutHeader(Boolean(segment.badge), kind !== 'ad');
  }

  layoutHeader(hasBadge, hasDot) {
    const u = this.ui;
    const m = this.metrics;
    const k = this.k;

    const cy = m.T + m.headerH / 2;

    u.liveDot.setPosition(m.L + Math.round(12 * k), cy);

    const labelX = m.L + (hasDot ? Math.round(26 * k) : Math.round(10 * k));

    u.labelText.setPosition(labelX, cy);

    let leftEnd = labelX + u.labelText.width;

    if (hasBadge) {
      const bx = leftEnd + Math.round(14 * k);
      const bw = u.badgeText.width + Math.round(16 * k);

      u.badgeBox.setPosition(bx, cy).setSize(bw, Math.round(18 * k)).setVisible(true);
      u.badgeText.setPosition(bx + Math.round(8 * k), cy + 1).setVisible(true);

      leftEnd = bx + bw;
    } else {
      u.badgeBox.setVisible(false);
      u.badgeText.setVisible(false);
    }

    u.channelText.setPosition(m.R - Math.round(10 * k), cy);

    this.dotsRight = m.R - Math.round(10 * k) - u.channelText.width - Math.round(16 * k);

    u.clockText.setPosition(0, cy);

    const clockLeft = -u.clockText.width / 2;
    const dotsLeft = this.dotsRight - this.dotsWidth();

    u.clockText.setVisible(
      leftEnd + Math.round(16 * k) < clockLeft &&
      clockLeft + u.clockText.width + Math.round(16 * k) < dotsLeft &&
      u.clockText.text.length > 0
    );

    this.drawSegmentDots();
  }

  dotsWidth() {
    if (this.segmentTotal <= 1) return 0;

    const size = Math.round(8 * this.k);
    const gap = Math.round(5 * this.k);

    return this.segmentTotal * size + (this.segmentTotal - 1) * gap;
  }

  setSegmentIndicator(index, total) {
    this.segmentIndex = index;
    this.segmentTotal = total;

    this.drawSegmentDots();
  }

  drawSegmentDots() {
    const g = this.ui.segGfx;

    if (!g || !this.metrics) return;

    g.clear();

    if (this.segmentTotal <= 1) return;

    const size = Math.round(8 * this.k);
    const gap = Math.round(5 * this.k);
    const cy = this.metrics.T + this.metrics.headerH / 2;

    let x = this.dotsRight - this.dotsWidth();

    for (let i = 0; i < this.segmentTotal; i++) {
      g.fillStyle(i === this.segmentIndex ? 0xffe58a : 0x4b5650, 1);
      g.fillRect(x, cy - size / 2, size, size);

      x += size + gap;
    }
  }

  setClock(text) {
    const u = this.ui;

    if (!u.clockText?.active) return;

    u.clockText.setText(text || '');

    const hasBadge = u.badgeBox.visible;

    this.layoutHeader(hasBadge, u.liveDot.visible);
  }

  /* ---------- layouts ---------- */

  applyNewsLayout(segment) {
    const u = this.ui;
    const m = this.metrics;
    const k = this.k;

    // tło: scena miasta jeśli istnieje, inaczej studio
    const bgKey = this.textureExists(segment.backgroundKey)
      ? segment.backgroundKey
      : 'tv_news_studio';

    if (this.textureExists(bgKey)) {
      this.placeCover(u.background, bgKey, m.sw, m.sh, 0.5, 0.9);
    }

    // lower-third
    const panelH = Math.round(Math.max(140 * k, Math.min(m.stageH * 0.4, 240 * k)));
    const panelX = m.L + Math.round(6 * k);
    const panelW = m.SW - Math.round(12 * k);
    const panelY = m.stageBottom - Math.round(10 * k) - panelH;

    u.panelBg.setPosition(panelX, panelY).setSize(panelW, panelH).setVisible(true);
    u.panelEdge.setPosition(panelX, panelY).setSize(panelW, Math.round(4 * k)).setVisible(true);

    // zakładka z nazwiskiem
    const name = String(segment.anchorName || '').toUpperCase();

    if (name) {
      u.anchorText
        .setFontFamily(FONT_PIXEL)
        .setFontSize(this.fs(11))
        .setColor('#f8e7a7')
        .setText(name)
        .setPosition(panelX + Math.round(22 * k), panelY - Math.round(20 * k))
        .setVisible(true);

      const tabH = Math.round(26 * k);

      u.nameTab
        .setPosition(panelX + Math.round(10 * k), panelY - tabH + Math.round(2 * k))
        .setSize(u.anchorText.width + Math.round(24 * k), tabH)
        .setVisible(true);
    }

    // nazwa programu (lewy górny róg)
    this.placeTitlePlate(segment.title, m.L + Math.round(8 * k), m.stageTop + Math.round(8 * k), m.SW * 0.5);

    // fakty ze sprawy (prawy górny róg)
    const facts = segment.caseFacts;

    if (facts?.artifact) {
      const lines = [
        'THEFT REPORT',
        String(facts.artifact).toUpperCase(),
        String(facts.sourceWithCity || '').toUpperCase()
      ].filter(Boolean);

      u.factsText
        .setWordWrapWidth(Math.round(m.SW * 0.3), true)
        .setText(lines.join('\n'))
        .setVisible(true);

      const plateW = u.factsText.width + Math.round(32 * k);
      const plateH = u.factsText.height + Math.round(18 * k);
      const plateX = m.R - Math.round(8 * k) - plateW;
      const plateY2 = m.stageTop + Math.round(8 * k);

      u.factsPlate.setPosition(plateX, plateY2).setSize(plateW, plateH).setVisible(true);
      u.factsAccent.setPosition(plateX, plateY2).setSize(Math.round(5 * k), plateH).setVisible(true);
      u.factsText.setPosition(plateX + Math.round(18 * k), plateY2 + Math.round(9 * k));
    }

    // tekst
    const pad = Math.round(20 * k);
    const bodyX = panelX + pad;
    const bodyY = panelY + Math.round(18 * k);

    u.bodyText.setPosition(bodyX, bodyY).setVisible(true);

    this.fitBody(
      (segment.lines || []).join('\n'),
      panelW - pad * 2,
      panelH - Math.round(32 * k),
      [28, 26, 24, 22, 20, 18, 16]
    );
  }

  applyPresenterLayout(segment, options = {}) {
    const u = this.ui;
    const m = this.metrics;
    const k = this.k;

    this.applyBackdrop(segment, 'stage');

    // prezenter: własna grafika z configu albo losowy anchor, tło wycięte
    const wanted = this.textureExists(segment.presenterKey)
      ? segment.presenterKey
      : options.anchorTextureKey || u.anchorTextureKey;

    const keyed = ensureKeyedTexture(this.scene, wanted) || wanted;

    if (this.textureExists(keyed)) {
      const s = Math.min(m.stageH * 1.12, m.SW * 0.58);

      u.presenter
        .setTexture(keyed)
        .setOrigin(0.5, 1)
        .setDisplaySize(s, s)
        .setPosition(m.L + s * 0.46, m.stageBottom + Math.round(6 * k))
        .setVisible(true)
        .setAlpha(1);

      this.presenterWidth = s;
    } else {
      this.presenterWidth = 0;
    }

    const panelX = m.L + (this.presenterWidth ? this.presenterWidth * 0.8 : 0);
    const panelW = m.R - Math.round(8 * k) - panelX;
    const panelY = m.stageTop + Math.round(10 * k);
    const panelH = m.stageH - Math.round(20 * k);
    const pad = Math.round(16 * k);

    u.panelBg.setPosition(panelX, panelY).setSize(panelW, panelH).setVisible(true);
    u.panelEdge.setPosition(panelX, panelY).setSize(Math.round(5 * k), panelH).setVisible(true);

    // tytuł programu w panelu
    u.titleText
      .setWordWrapWidth(panelW - pad * 2, true)
      .setText(String(segment.title || '').toUpperCase())
      .setPosition(panelX + pad + Math.round(6 * k), panelY + Math.round(16 * k))
      .setVisible(true);

    let cursorY = u.titleText.y + u.titleText.height + Math.round(10 * k);

    const hostName = segment.anchorName || options.anchorDisplayName || '';

    if (hostName) {
      u.anchorText
        .setFontFamily(FONT_TYPE)
        .setFontSize(this.fs(22))
        .setColor('#d7efe5')
        .setText(hostName)
        .setPosition(panelX + pad + Math.round(6 * k), cursorY)
        .setVisible(true);

      cursorY += u.anchorText.height + Math.round(6 * k);
    }

    u.panelDivider
      .setPosition(panelX + pad + Math.round(6 * k), cursorY)
      .setSize(panelW - pad * 2 - Math.round(6 * k), 2)
      .setVisible(true);

    cursorY += Math.round(14 * k);

    u.bodyText
      .setPosition(panelX + pad + Math.round(6 * k), cursorY)
      .setVisible(true);

    this.fitBody(
      (segment.lines || []).join('\n'),
      panelW - pad * 2 - Math.round(6 * k),
      panelY + panelH - cursorY - pad,
      [28, 26, 24, 22, 20, 18, 16]
    );
  }

  applyAdLayout(segment) {
    const u = this.ui;
    const m = this.metrics;
    const k = this.k;

    this.applyBackdrop(segment, 'ad');

    u.titleText
      .setOrigin(0.5, 0)
      .setFontSize(this.fs(24))
      .setColor('#fff6cf')
      .setStroke('#000000', Math.round(6 * k))
      .setAlign('center')
      .setWordWrapWidth(m.SW - Math.round(80 * k), true)
      .setText(String(segment.title || '').toUpperCase())
      .setPosition(0, m.stageTop + Math.round(26 * k))
      .setVisible(true);

    const bodyY = u.titleText.y + u.titleText.height + Math.round(30 * k);

    u.bodyText.setOrigin(0.5, 0).setPosition(0, bodyY).setVisible(true);

    this.fitBody(
      (segment.lines || []).join('\n'),
      Math.round(m.SW * 0.84),
      m.stageBottom - bodyY - Math.round(70 * k),
      [38, 34, 30, 28, 26, 24, 22, 20, 18],
      'center'
    );

    u.sticker
      .setText(Phaser.Utils.Array.GetRandom(AD_STICKERS))
      .setAngle(-8)
      .setPosition(m.R - Math.round(120 * k), m.stageBottom - Math.round(44 * k))
      .setVisible(true);
  }

  applyBackdrop(segment, kind) {
    const u = this.ui;
    const m = this.metrics;

    if (this.textureExists(segment.backgroundKey)) {
      this.placeCover(u.background, segment.backgroundKey, m.sw, m.sh, 0.5, 0.5);
      return;
    }

    const key = ensureBackdropTexture(this.scene, m.sw, m.sh, this.colors, kind);

    if (key) {
      this.placeFull(u.background, key, m.sw, m.sh);
    }
  }

  placeTitlePlate(title, x, y, maxW) {
    const u = this.ui;
    const k = this.k;

    if (!title) return;

    u.titleText
      .setOrigin(0, 0)
      .setFontSize(this.fs(11))
      .setColor('#fff6cf')
      .setStroke('#000000', 0)
      .setAlign('left')
      .setWordWrapWidth(Math.round(maxW), true)
      .setText(String(title).toUpperCase())
      .setPosition(x + Math.round(18 * k), y + Math.round(9 * k))
      .setVisible(true);

    const w = u.titleText.width + Math.round(32 * k);
    const h = u.titleText.height + Math.round(18 * k);

    u.titlePlate.setPosition(x, y).setSize(w, h).setVisible(true);
    u.titleAccent.setPosition(x, y).setSize(Math.round(5 * k), h).setVisible(true);
  }

  /* ========================================================
     TICKER
     ======================================================== */

  setTicker(segment, kind, extras) {
    const u = this.ui;
    const m = this.metrics;

    if (this.tickerTween) {
      this.tickerTween.stop();
      this.tickerTween = null;
    }

    const jokes = Phaser.Utils.Array.Shuffle([...NEWS_JOKES]).slice(0, 2);

    let items;

    if (kind === 'news') {
      const f = segment.caseFacts || {};

      items = [
        segment.title,
        f.artifact ? `STOLEN: ${f.artifact}` : null,
        f.sourceWithCity ? `LOCATION: ${f.sourceWithCity}` : null,
        f.publicClue ? `WITNESSES REPORT: ${f.publicClue}` : null,
        ...extras,
        ...jokes
      ];
    } else if (kind === 'ad') {
      items = [
        segment.title,
        'CALL NOW. OPERATORS ARE STANDING BY (SITTING, ACTUALLY)',
        jokes[0],
        ...extras
      ];
    } else {
      items = [segment.title, ...extras, ...jokes];
    }

    let text =
      items
        .filter(Boolean)
        .map((s) => String(s).toUpperCase().replace(/\s+/g, ' ').trim())
        .join('   ///   ') + '   ///   ';

    const fontPx = this.fs(10);
    const maxChars = Math.floor(3600 / fontPx);

    if (text.length > maxChars) {
      text = text.slice(0, maxChars);

      const cut = text.lastIndexOf('///');

      if (cut > 0) text = text.slice(0, cut + 3) + '   ';
    }

    u.tickerText.setText(text);
    u.tickerText.setPosition(m.sw / 2, m.stageBottom + m.tickerH / 2);

    const startX = m.sw / 2;
    const endX = this.capRight - u.tickerText.width;
    const speed = Math.round(80 * this.k);

    this.tickerTween = this.scene.tweens.add({
      targets: u.tickerText,
      x: { from: startX, to: endX },
      duration: Math.max(2000, ((startX - endX) / speed) * 1000),
      repeat: -1,
      ease: 'Linear'
    });
  }

  /* ========================================================
     PROGRESS / OSD / HINT / PAUSE
     ======================================================== */

  startProgress(ms) {
    this.stopProgress();

    const bar = this.ui.progressBar;

    if (!bar?.active) return;

    bar.setScale(0, 1).setVisible(true);

    this.progressTween = this.scene.tweens.add({
      targets: bar,
      scaleX: 1,
      duration: Math.max(100, ms),
      ease: 'Linear'
    });
  }

  stopProgress() {
    if (this.progressTween) {
      this.progressTween.stop();
      this.progressTween = null;
    }

    const bar = this.ui?.progressBar;

    if (bar?.active) bar.setScale(0, 1).setVisible(false);
  }

  pauseProgress(paused) {
    if (!this.progressTween) return;

    if (paused) this.progressTween.pause();
    else this.progressTween.resume();
  }

  showOsd(text, ms = 1400) {
    const u = this.ui;
    const m = this.metrics;
    const k = this.k;

    if (!u.osdText?.active) return;

    this.osdCall?.remove?.(false);

    u.osdText
      .setText(text)
      .setPosition(m.L + Math.round(24 * k), m.stageTop + Math.round(46 * k))
      .setVisible(true);

    u.osdBg
      .setPosition(m.L + Math.round(12 * k), m.stageTop + Math.round(36 * k))
      .setSize(
        u.osdText.width + Math.round(24 * k),
        u.osdText.height + Math.round(20 * k)
      )
      .setVisible(true);

    this.osdCall = this.scene.time.delayedCall(ms, () => {
      u.osdText?.active && u.osdText.setVisible(false);
      u.osdBg?.active && u.osdBg.setVisible(false);
    });
  }

  showHint(text, ms = 3000) {
    const hint = this.ui.hintText;

    if (!hint?.active) return;

    if (this.hintTween) this.hintTween.stop();

    hint.setText(text).setVisible(true).setAlpha(0);

    this.hintTween = this.scene.tweens.add({
      targets: hint,
      alpha: 1,
      duration: 250,
      hold: ms,
      yoyo: true,
      onComplete: () => hint.active && hint.setVisible(false)
    });
  }

  setPaused(paused) {
    const u = this.ui;

    if (!u.pauseDim?.active) return;

    u.pauseDim.setVisible(paused);
    u.pauseText.setVisible(paused).setText('II  PAUSED').setPosition(0, 0);

    if (this.pauseTween) {
      this.pauseTween.stop();
      this.pauseTween = null;
    }

    if (paused) {
      u.pauseText.setAlpha(1);

      this.pauseTween = this.scene.tweens.add({
        targets: u.pauseText,
        alpha: 0.35,
        duration: 500,
        yoyo: true,
        repeat: -1
      });
    }

    this.pauseProgress(paused);
  }

  /* ========================================================
     BODY TEXT
     ======================================================== */

  setBodyText(text) {
    const t = this.ui.bodyText;

    if (!t?.active) return;

    this.bodyFullText = text;

    t.setText(text);

    // teleprompter: gdy tekst się nie mieści, zrzucamy najstarsze linie
    if (this.bodyMaxH > 0) {
      let shown = text;

      while (t.height > this.bodyMaxH && shown.includes('\n')) {
        shown = shown.slice(shown.indexOf('\n') + 1);
        t.setText(shown);
      }
    }
  }

  getBodyText() {
    return this.bodyFullText;
  }

  isBodyTextActive() {
    return Boolean(this.ui.bodyText?.active);
  }

  /* ========================================================
     DESTROY
     ======================================================== */

  destroy() {
    this.osdCall?.remove?.(false);
    this.osdCall = null;

    [
      ...this.tweens,
      this.tickerTween,
      this.progressTween,
      this.hintTween,
      this.pauseTween
    ].forEach((tween) => {
      try {
        tween?.stop?.();
      } catch (error) {
        /* ignore */
      }
    });

    this.tweens = [];
    this.tickerTween = null;
    this.progressTween = null;
    this.hintTween = null;
    this.pauseTween = null;

    this.ui.screenHit?.removeAllListeners?.();
    this.ui.screenInner?.clearMask?.();

    this.ui.screenMask?.destroy?.();
    this.ui.screenMask = null;

    this.ui.screenMaskGraphics?.destroy?.();
    this.ui.screenMaskGraphics = null;

    this.onScreenClick = null;

    this.ui = {};
    this.layout = null;
    this.scene = null;
  }
}