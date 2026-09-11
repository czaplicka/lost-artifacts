export class TvBroadcastView {
  constructor(scene, layout) {
    this.scene = scene;
    this.layout = layout;
    this.ui = {};
  }

  create(anchorTextureKey) {
    this.createRoot();
    this.createBackdrop();
    this.createTvShell();
    this.createScreenUI(anchorTextureKey);
  }

  createRoot() {
    this.ui.root = this.scene.add
      .container(
        this.layout.centerX,
        this.layout.centerY
      )
      .setAlpha(0)
      .setScale(1)
      .setDepth(10);
  }

  createBackdrop() {
    this.ui.backdrop = this.scene.add
      .rectangle(
        0,
        0,
        this.layout.width,
        this.layout.height,
        0x000000,
        0.6
      )
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

    this.ui.screenContainer =
      this.scene.add.container(
        screenOffsetX,
        screenOffsetY
      );

    this.ui.root.add(
      this.ui.screenContainer
    );

    this.ui.screenFrame =
      this.scene.add.rectangle(
        0,
        0,
        screenWidth,
        screenHeight,
        0x0b1411
      );

    this.ui.screenContainer.add(
      this.ui.screenFrame
    );

    const halfWidth = screenWidth / 2;
    const halfHeight = screenHeight / 2;
    const cut = screenChamfer;

    const maskGraphics =
      this.scene.make.graphics({
        x: centerX + screenOffsetX,
        y: centerY + screenOffsetY,
        add: false
      });

    maskGraphics.fillStyle(0xffffff, 1);
    maskGraphics.beginPath();

    maskGraphics.moveTo(
      -halfWidth + cut,
      -halfHeight
    );

    maskGraphics.lineTo(
      halfWidth - cut,
      -halfHeight
    );

    maskGraphics.lineTo(
      halfWidth,
      -halfHeight + cut
    );

    maskGraphics.lineTo(
      halfWidth,
      halfHeight - cut
    );

    maskGraphics.lineTo(
      halfWidth - cut,
      halfHeight
    );

    maskGraphics.lineTo(
      -halfWidth + cut,
      halfHeight
    );

    maskGraphics.lineTo(
      -halfWidth,
      halfHeight - cut
    );

    maskGraphics.lineTo(
      -halfWidth,
      -halfHeight + cut
    );

    maskGraphics.closePath();
    maskGraphics.fillPath();

    this.ui.screenMaskGraphics =
      maskGraphics;

    this.ui.screenMask =
      maskGraphics.createGeometryMask();

    this.ui.tvSprite = this.scene.add
      .image(0, 0, 'television')
      .setOrigin(0.5);

    this.ui.root.add(this.ui.tvSprite);
  }

  createScreenUI(anchorTextureKey) {
    const sw = this.layout.screenWidth;
    const sh = this.layout.screenHeight;

    const left = this.layout.screenLeft;
    const right = this.layout.screenRight;
    const top = this.layout.screenTop;

    const safeWidth =
      this.layout.screenSafeWidth;

    const headerHeight = 28;

    this.ui.screenInner =
      this.scene.add.container(0, 0);

    this.ui.screenInner.setMask(
      this.ui.screenMask
    );

    this.ui.screenContainer.add(
      this.ui.screenInner
    );

    this.ui.screenBg =
      this.scene.add.rectangle(
        0,
        0,
        sw,
        sh,
        0x1a2621
      );

    this.ui.programBackground =
      this.scene.add
        .image(0, 0, 'tv_news_studio')
        .setOrigin(0.5)
        .setDisplaySize(sw, sh)
        .setVisible(false)
        .setAlpha(0);

    this.ui.anchorPortrait =
      this.scene.add
        .image(
          -sw * 0.24,
          sh * 0.12,
          anchorTextureKey
        )
        .setOrigin(0.5, 1)
        .setDisplaySize(
          sw * 0.42,
          sh * 0.78
        )
        .setVisible(false)
        .setAlpha(0);

    this.ui.screenTopBar =
      this.scene.add.rectangle(
        0,
        top + headerHeight / 2,
        safeWidth,
        headerHeight,
        0x18221d,
        0.92
      );

    this.ui.anchorTextPanel =
      this.scene.add
        .rectangle(
          sw * 0.13,
          sh * 0.12,
          sw * 0.5,
          sh * 0.56,
          0x07110d,
          0.8
        )
        .setOrigin(0.5)
        .setStrokeStyle(
          3,
          0xcbbd78,
          0.62
        )
        .setVisible(false);

    this.ui.newsTextPanel =
      this.scene.add
        .rectangle(
          0,
          sh * 0.12,
          sw * 0.82,
          sh * 0.58,
          0x07110d,
          0.8
        )
        .setOrigin(0.5)
        .setStrokeStyle(
          3,
          0xcbbd78,
          0.62
        )
        .setVisible(false);

    this.ui.labelText =
      this.scene.add.text(
        left + 10,
        top + 6,
        '',
        {
          fontFamily: 'PressStart2P',
          fontSize: '10px',
          color: '#f8e7a7'
        }
      );

    this.ui.channelText =
      this.scene.add
        .text(
          right - 10,
          top + 6,
          'CH-03',
          {
            fontFamily: 'PressStart2P',
            fontSize: '10px',
            color: '#d7ffea'
          }
        )
        .setOrigin(1, 0);

    this.ui.titleText =
      this.scene.add
        .text(
          0,
          top + headerHeight + 12,
          '',
          {
            fontFamily: 'PressStart2P',
            fontSize: '14px',
            color: '#fff6cf',
            align: 'center',
            wordWrap: {
              width: safeWidth - 20,
              useAdvancedWrap: true
            }
          }
        )
        .setOrigin(0.5, 0);

    this.ui.breakingBadge =
      this.scene.add.rectangle(
        left + 76,
        top + headerHeight + 46,
        132,
        24,
        0x993344,
        0.95
      );

    this.ui.breakingText =
      this.scene.add
        .text(
          this.ui.breakingBadge.x,
          this.ui.breakingBadge.y - 1,
          '',
          {
            fontFamily: 'PressStart2P',
            fontSize: '8px',
            color: '#fff5ef'
          }
        )
        .setOrigin(0.5);

    this.ui.anchorText =
      this.scene.add.text(
        left + 4,
        top + headerHeight + 68,
        '',
        {
          fontFamily: 'SpecialElite',
          fontSize: '26px',
          color: '#d7efe5'
        }
      );

    this.ui.bodyText =
      this.scene.add.text(
        left + 4,
        top + headerHeight + 106,
        '',
        {
          fontFamily: 'SpecialElite',
          fontSize: '24px',
          color: '#f3f5f1',
          wordWrap: {
            width: safeWidth - 8,
            useAdvancedWrap: true
          },
          lineSpacing: 10
        }
      );

    this.ui.screenInner.add([
      this.ui.screenBg,
      this.ui.programBackground,
      this.ui.screenTopBar,

      this.ui.anchorPortrait,
      this.ui.anchorTextPanel,
      this.ui.newsTextPanel,

      this.ui.labelText,
      this.ui.channelText,
      this.ui.titleText,
      this.ui.breakingBadge,
      this.ui.breakingText,
      this.ui.anchorText,
      this.ui.bodyText
    ]);
  }

  addScreenEffects(effects) {
    if (
      !this.ui.screenInner ||
      !Array.isArray(effects)
    ) {
      return;
    }

    this.ui.screenInner.addAt(
      effects,
      6
    );
  }

  applySegment(segment, options = {}) {
    const {
      anchorTextureKey,
      anchorDisplayName,
      isFirstSegment = false
    } = options;

    this.applyTheme(segment.theme || {});
    this.applyHeader(segment);

    this.applySegmentLayout(
      segment,
      {
        anchorTextureKey,
        anchorDisplayName,
        isFirstSegment
      }
    );
  }

  applyHeader(segment) {
    this.ui.labelText?.setText(
      segment.label || ''
    );

    this.ui.channelText?.setText(
      segment.channel || 'CH-03'
    );

    this.ui.titleText?.setText(
      segment.title || ''
    );

    this.ui.breakingText?.setText(
      segment.badge || ''
    );
  }

  applySegmentLayout(segment, options = {}) {
    const {
      anchorTextureKey,
      anchorDisplayName,
      isFirstSegment = false
    } = options;

    const isNews = segment.type === 'news';

    const isAdvertisement =
      segment.type === 'ad' ||
      segment.type === 'advertisement' ||
      segment.type === 'commercial';

    const showSeparatePresenter =
      !isAdvertisement &&
      !isNews;

    this.ui.programBackground
      ?.setVisible(isNews)
      ?.setAlpha(isNews ? 0.9 : 0);

    this.ui.anchorTextPanel?.setVisible(
      false
    );

    this.ui.newsTextPanel?.setVisible(
      false
    );

    this.ui.anchorPortrait
      ?.setTexture(anchorTextureKey)
      ?.setVisible(showSeparatePresenter)
      ?.setAlpha(
        showSeparatePresenter ? 1 : 0
      );

    if (isNews) {
      this.applyNewsLayout();
      return;
    }

    if (showSeparatePresenter) {
      this.applyPresenterLayout(
        segment,
        {
          anchorDisplayName,
          isFirstSegment
        }
      );

      return;
    }

    this.applyFullScreenTextLayout();
  }

  applyNewsLayout() {
    const sw = this.layout.screenWidth;
    const sh = this.layout.screenHeight;

    const panelWidth = sw * 0.82;
    const panelHeight = sh * 0.58;
    const panelX = 0;
    const panelY = sh * 0.12;

    this.ui.anchorPortrait
      ?.setVisible(false)
      ?.setAlpha(0);

    this.ui.anchorText
      ?.setText('')
      ?.setVisible(false);

    this.ui.anchorTextPanel?.setVisible(
      false
    );

    this.ui.newsTextPanel
      ?.setPosition(panelX, panelY)
      ?.setSize(panelWidth, panelHeight)
      ?.setVisible(true);

    this.ui.bodyText
      ?.setPosition(
        panelX - panelWidth / 2 + 20,
        panelY - panelHeight / 2 + 18
      )
      ?.setWordWrapWidth(
        panelWidth - 40,
        true
      )
      ?.setVisible(true);
  }

  applyPresenterLayout(segment, options = {}) {
    const {
      anchorDisplayName,
      isFirstSegment = false
    } = options;

    const sw = this.layout.screenWidth;
    const sh = this.layout.screenHeight;

    const portraitWidth = isFirstSegment
      ? sw * 0.52
      : sw * 0.48;

    const portraitHeight = isFirstSegment
      ? sh * 0.77
      : sh * 0.82;

    const portraitX = -sw * 0.23;

    const portraitY = isFirstSegment
      ? sh / 2 -
        this.layout.screenSafeInsetBottom +
        12
      : sh / 2 -
        this.layout.screenSafeInsetBottom +
        4;

    const panelWidth = sw * 0.5;
    const panelHeight = sh * 0.56;
    const panelX = sw * 0.12;
    const panelY = sh * 0.12;

    this.ui.anchorPortrait
      ?.setPosition(portraitX, portraitY)
      ?.setDisplaySize(
        portraitWidth,
        portraitHeight
      )
      ?.setVisible(true)
      ?.setAlpha(1);

    this.ui.newsTextPanel?.setVisible(
      false
    );

    this.ui.anchorTextPanel
      ?.setPosition(panelX, panelY)
      ?.setSize(panelWidth, panelHeight)
      ?.setVisible(true);

    this.ui.anchorText
      ?.setText(
        segment.anchorName ||
        anchorDisplayName ||
        ''
      )
      ?.setPosition(
        panelX - panelWidth / 2 + 16,
        panelY - panelHeight / 2 + 14
      )
      ?.setVisible(true);

    this.ui.bodyText
      ?.setPosition(
        panelX - panelWidth / 2 + 16,
        panelY - panelHeight / 2 + 52
      )
      ?.setWordWrapWidth(
        panelWidth - 32,
        true
      )
      ?.setVisible(true);
  }

  applyFullScreenTextLayout() {
    const {
      screenLeft: left,
      screenTop: top,
      screenWidth: sw,
      screenSafeInsetX
    } = this.layout;

    const headerHeight = 28;

    this.ui.anchorPortrait
      ?.setVisible(false)
      ?.setAlpha(0);

    this.ui.anchorTextPanel?.setVisible(
      false
    );

    this.ui.newsTextPanel?.setVisible(
      false
    );

    this.ui.anchorText
      ?.setText('')
      ?.setVisible(false);

    this.ui.bodyText
      ?.setPosition(
        left + 4,
        top + headerHeight + 106
      )
      ?.setWordWrapWidth(
        sw -
        screenSafeInsetX * 2 -
        8,
        true
      )
      ?.setVisible(true);
  }

  applyTheme(theme) {
    this.ui.screenBg?.setFillStyle(
      this.toColorInt(
        theme.screenColor,
        0x1e2a24
      ),
      1
    );

    this.ui.screenTopBar?.setFillStyle(
      this.toColorInt(
        theme.topBarColor,
        0x30453d
      ),
      0.95
    );

    this.ui.breakingBadge?.setFillStyle(
      this.toColorInt(
        theme.badgeColor,
        0x8f3043
      ),
      0.96
    );
  }

  toColorInt(value, fallback) {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = parseInt(
        value.replace('#', ''),
        16
      );

      return Number.isNaN(parsed)
        ? fallback
        : parsed;
    }

    return fallback;
  }

  setBodyText(text) {
    this.ui.bodyText?.setText(text);
  }

  getBodyText() {
    return this.ui.bodyText?.text || '';
  }

  isBodyTextActive() {
    return Boolean(
      this.ui.bodyText?.active
    );
  }

  destroy() {
    this.ui.screenInner?.clearMask?.();

    this.ui.screenMask?.destroy?.();
    this.ui.screenMask = null;

    this.ui.screenMaskGraphics?.destroy?.();
    this.ui.screenMaskGraphics = null;

    this.ui = {};
    this.layout = null;
    this.scene = null;
  }
}