import { gameState } from '../GameData.js';
import { getTVBroadcast } from '../tvBroadcastData.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';

export class TvBroadcastScene extends BaseScene {
  constructor() {
    super({ key: 'TvBroadcastScene' });

    this.returnSceneKey = null;
    this.pauseBelowScene = true;
    this.onClose = null;

    this.segmentQueue = [];
    this.currentSegmentIndex = 0;
    this.currentLineIndex = 0;
    this.currentCharIndex = 0;

    this.typingEvent = null;
    this.advanceEvent = null;
    this.noiseEvent = null;

    this.isTyping = false;
    this.isTransitioning = false;
    this.isBroadcastPaused = false;
    this.isClosing = false;

    this.currentLineFullText = '';
    this.currentLinePrefix = '';
    this.currentSegment = null;

    this.layout = null;
    this.ui = {};

    this.anchorTextureKey = null;
    this.anchorDisplayName = '';

    this.hasPausedReturnScene = false;
  }

  init(data = {}) {
    this.returnSceneKey = data.returnSceneKey || null;

    this.pauseBelowScene =
      data.pauseBelowScene !== undefined
        ? Boolean(data.pauseBelowScene)
        : true;

    this.onClose =
      typeof data.onClose === 'function'
        ? data.onClose
        : null;

    this.segmentQueue = [];
    this.currentSegmentIndex = 0;
    this.currentLineIndex = 0;
    this.currentCharIndex = 0;

    this.typingEvent = null;
    this.advanceEvent = null;
    this.noiseEvent = null;

    this.isTyping = false;
    this.isTransitioning = false;
    this.isBroadcastPaused = false;
    this.isClosing = false;

    this.currentLineFullText = '';
    this.currentLinePrefix = '';
    this.currentSegment = null;

    this.layout = null;
    this.ui = {};

    this.anchorTextureKey = null;
    this.anchorDisplayName = '';

    this.hasPausedReturnScene = false;
  }

  preload() {
    if (!window.WebFont) {
      this.load.script(
        'webfont',
        'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js'
      );
    }

    if (!this.cache.json.exists('tv-config')) {
      this.load.json(
        'tv-config',
        'assets/data/tv-config.json'
      );
    }
  }

  create() {
    super.create();

    EventBus.emit('hideHUD');

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.handleShutdown,
      this
    );

    this.ensureFontsLoaded(() => {
      if (!this.sys.isActive()) {
        return;
      }

      this.setupSceneState();
      this.selectBroadcastAnchor();
      this.createLayout();
      this.createBackdrop();
      this.createTvShell();
      this.createScreenUI();
      this.createFxLoop();
      this.createHotspots();

      const tvConfigJson =
        this.cache.json.get('tv-config') || {};

      this.segmentQueue =
        getTVBroadcast(
          gameState,
          tvConfigJson
        ).segments || [];

      this.hideUnderlyingHud();

      this.playOpenAnimation();
    });
  }

  getRegisteredScene(sceneKey) {
    if (!this.hasScene(sceneKey)) {
      return null;
    }

    return this.scene.manager.keys[sceneKey] || null;
  }

  ensureFontsLoaded(onReady) {
    if (!window.WebFont) {
      onReady();
      return;
    }

    window.WebFont.load({
      google: {
        families: [
          'Press Start 2P',
          'Special Elite'
        ]
      },
      active: onReady,
      inactive: onReady
    });
  }

  setupSceneState() {
    if (
      this.pauseBelowScene &&
      this.returnSceneKey &&
      this.isSceneActive(this.returnSceneKey)
    ) {
      this.scene.pause(this.returnSceneKey);
      this.hasPausedReturnScene = true;
    }

    const { width, height } = this.scale;

    const sourceImage =
      this.textures
        .get('television')
        ?.getSourceImage();

    const tvWidth = sourceImage
      ? sourceImage.width
      : width * 0.8;

    const tvHeight = sourceImage
      ? sourceImage.height
      : height * 0.6;

    this.layout = {
      width,
      height,
      centerX: width * 0.5,
      centerY: height * 0.5,

      tvWidth,
      tvHeight,

      screenWidth: tvWidth * 0.555,
      screenHeight: tvHeight * 0.778,

      screenOffsetX: -tvWidth * 0.04,
      screenOffsetY: -tvHeight * 0.052,

      screenChamfer: tvWidth * 0.03,

      screenSafeInsetX: tvWidth * 0.035,
      screenSafeInsetTop: tvHeight * 0.055,
      screenSafeInsetBottom: tvHeight * 0.05
    };

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-SPACE',
      this.onAdvancePressed
    );

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-ENTER',
      this.onAdvancePressed
    );

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-X',
      this.onSkipPressed
    );

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-P',
      this.toggleBroadcastPause
    );

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-ESC',
      this.onClosePressed
    );
  }

  hideUnderlyingHud() {
    const playerHud = this.getRegisteredScene(
      'PlayerHudScene'
    );

    if (!playerHud) {
      return;
    }

    playerHud.closeAllUIPanels?.();
    playerHud.playerMenu?.close?.();

    if (this.isSceneActive('PlayerHudScene')) {
      playerHud.scene.setVisible(false);
    }
  }

  restoreUnderlyingHud() {
    const playerHud = this.getRegisteredScene(
      'PlayerHudScene'
    );

    if (playerHud) {
      playerHud.scene.setVisible(true);
    }

    EventBus.emit('showHUD');
  }

  setNewsHudButtonsVisible(visible) {
    const newsHud = this.getRegisteredScene('NewsHud');

    if (!newsHud?.events) {
      return;
    }

    newsHud.events.emit(
      'setNewspaperVisible',
      visible
    );

    newsHud.events.emit(
      'setTvVisible',
      visible
    );
  }

  selectBroadcastAnchor() {
    const anchors = [
      {
        textureKey: 'tv_anchor_generic',
        name: 'RICHARD VALE'
      },
      {
        textureKey: 'tv_anchor_genericf',
        name: 'EVELYN CROSS'
      }
    ];

    const selectedAnchor =
      Phaser.Utils.Array.GetRandom(anchors);

    this.anchorTextureKey =
      selectedAnchor.textureKey;

    this.anchorDisplayName =
      selectedAnchor.name;
  }

  createLayout() {
    this.ui.root = this.add
      .container(
        this.layout.centerX,
        this.layout.centerY
      )
      .setAlpha(0)
      .setScale(1)
      .setDepth(10);
  }

  createBackdrop() {
    this.ui.backdrop = this.add
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

    this.ui.screenContainer = this.add.container(
      screenOffsetX,
      screenOffsetY
    );

    this.ui.root.add(this.ui.screenContainer);

    this.ui.screenFrame = this.add.rectangle(
      0,
      0,
      screenWidth,
      screenHeight,
      0x0b1411
    );

    this.ui.screenContainer.add(this.ui.screenFrame);

    const halfWidth = screenWidth / 2;
    const halfHeight = screenHeight / 2;
    const cut = screenChamfer;

    const maskGraphics = this.make.graphics({
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

    this.ui.screenMaskGraphics = maskGraphics;

    this.ui.screenMask =
      maskGraphics.createGeometryMask();

    this.ui.tvSprite = this.add
      .image(0, 0, 'television')
      .setOrigin(0.5);

    this.ui.root.add(this.ui.tvSprite);
  }

  createScreenUI() {
    const sw = this.layout.screenWidth;
    const sh = this.layout.screenHeight;

    const left =
      -sw / 2 + this.layout.screenSafeInsetX;

    const right =
      sw / 2 - this.layout.screenSafeInsetX;

    const top =
      -sh / 2 + this.layout.screenSafeInsetTop;

    const safeWidth = right - left;
    const headerHeight = 28;

    this.ui.screenInner = this.add.container(0, 0);

    this.ui.screenInner.setMask(this.ui.screenMask);

    this.ui.screenContainer.add(this.ui.screenInner);

    this.ui.screenBg = this.add.rectangle(
      0,
      0,
      sw,
      sh,
      0x1a2621
    );

    this.ui.programBackground = this.add
      .image(0, 0, 'tv_news_studio')
      .setOrigin(0.5)
      .setDisplaySize(sw, sh)
      .setVisible(false)
      .setAlpha(0);

    this.ui.anchorPortrait = this.add
      .image(
        -sw * 0.24,
        sh * 0.12,
        this.anchorTextureKey
      )
      .setOrigin(0.5, 1)
      .setDisplaySize(sw * 0.42, sh * 0.78)
      .setVisible(false)
      .setAlpha(0);

    this.ui.screenTopBar = this.add.rectangle(
      0,
      top + headerHeight / 2,
      safeWidth,
      headerHeight,
      0x18221d,
      0.92
    );

    this.ui.anchorTextPanel = this.add
      .rectangle(
        sw * 0.13,
        sh * 0.12,
        sw * 0.50,
        sh * 0.56,
        0x07110d,
        0.80
      )
      .setOrigin(0.5)
      .setStrokeStyle(3, 0xcbbd78, 0.62)
      .setVisible(false);

    this.ui.newsTextPanel = this.add
      .rectangle(
        sw * 0.12,
        sh * 0.16,
        sw * 0.48,
        sh * 0.52,
        0x07110d,
        0.78
      )
      .setOrigin(0.5)
      .setStrokeStyle(3, 0xcbbd78, 0.62)
      .setVisible(false);

    this.ui.scanlines = this.add.graphics();

    this.drawScanlines(sw, sh);

    this.ui.noise = this.add.graphics();

    this.drawNoise(sw, sh);

    this.ui.vignette = this.add.graphics();

    this.ui.vignette.fillStyle(0x000000, 0.1);

    this.ui.vignette.fillRect(
      -sw / 2,
      -sh / 2,
      sw,
      sh
    );

    this.ui.labelText = this.add.text(
      left + 10,
      top + 6,
      '',
      {
        fontFamily: 'Press Start 2P',
        fontSize: '10px',
        color: '#f8e7a7'
      }
    );

    this.ui.channelText = this.add
      .text(right - 10, top + 6, 'CH-03', {
        fontFamily: 'Press Start 2P',
        fontSize: '10px',
        color: '#d7ffea'
      })
      .setOrigin(1, 0);

    this.ui.titleText = this.add
      .text(0, top + headerHeight + 12, '', {
        fontFamily: 'Press Start 2P',
        fontSize: '14px',
        color: '#fff6cf',
        align: 'center',
        wordWrap: {
          width: safeWidth - 20,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5, 0);

    this.ui.breakingBadge = this.add.rectangle(
      left + 76,
      top + headerHeight + 46,
      132,
      24,
      0x993344,
      0.95
    );

    this.ui.breakingText = this.add
      .text(
        this.ui.breakingBadge.x,
        this.ui.breakingBadge.y - 1,
        '',
        {
          fontFamily: 'Press Start 2P',
          fontSize: '8px',
          color: '#fff5ef'
        }
      )
      .setOrigin(0.5);

    this.ui.anchorText = this.add.text(
      left + 4,
      top + headerHeight + 68,
      '',
      {
        fontFamily: 'Special Elite',
        fontSize: '26px',
        color: '#d7efe5'
      }
    );

    this.ui.bodyText = this.add.text(
      left + 4,
      top + headerHeight + 106,
      '',
      {
        fontFamily: 'Special Elite',
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

      this.ui.noise,
      this.ui.scanlines,
      this.ui.vignette,

      this.ui.labelText,
      this.ui.channelText,
      this.ui.titleText,
      this.ui.breakingBadge,
      this.ui.breakingText,
      this.ui.anchorText,
      this.ui.bodyText
    ]);
  }

  createHotspots() {
    const {
      centerX,
      centerY,
      tvHeight
    } = this.layout;

    const hotspotWidth = 160;
    const hotspotHeight = 70;
    const gap = 40;

    const groupWidth =
      hotspotWidth * 4 +
      gap * 3;

    const startX =
      centerX -
      groupWidth / 2 +
      hotspotWidth / 2 -
      45;

    const hotspotY =
      centerY +
      tvHeight * 0.43 -
      20;

    const configs = [
      {
        id: 'close',
        action: () => this.onClosePressed()
      },
      {
        id: 'skip',
        action: () => this.onSkipPressed()
      },
      {
        id: 'next',
        action: () => this.onAdvancePressed()
      },
      {
        id: 'pause',
        action: () => this.toggleBroadcastPause()
      }
    ];

    this.ui.hotspots = [];
    this.ui.hotspotDebug = [];

    configs.forEach((config, index) => {
      const x =
        startX +
        index * (hotspotWidth + gap);

      const zone = this.add
        .zone(
          x,
          hotspotY,
          hotspotWidth,
          hotspotHeight
        )
        .setDepth(30)
        .setInteractive({
          useHandCursor: true
        });

      const debugBox = this.add
        .rectangle(
          x,
          hotspotY,
          hotspotWidth,
          hotspotHeight,
          0xff00ff,
          0.22
        )
        .setStrokeStyle(2, 0xffff00, 0.95)
        .setDepth(29);

      const debugLabel = this.add
        .text(
          x,
          hotspotY,
          config.id.toUpperCase(),
          {
            fontFamily: 'Press Start 2P',
            fontSize: '8px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
          }
        )
        .setOrigin(0.5)
        .setDepth(31);

      if (config.id === 'pause') {
        this.ui.pauseDebugBox = debugBox;
        this.ui.pauseDebugLabel = debugLabel;
      }

      zone.on('pointerover', () => {
        debugBox.setFillStyle(0x00ff88, 0.48);
        debugBox.setStrokeStyle(3, 0xffffff, 1);
        debugLabel.setColor('#00ff88');
      });

      zone.on('pointerout', () => {
        if (config.id === 'pause') {
          this.refreshPauseDebugVisual();
          return;
        }

        debugBox.setFillStyle(0xff00ff, 0.22);
        debugBox.setStrokeStyle(2, 0xffff00, 0.95);
        debugLabel.setColor('#ffffff');
      });

      zone.on('pointerdown', () => {
        debugBox.setFillStyle(0xff3300, 0.62);
      });

      zone.on('pointerup', () => {
        if (!this.isTransitioning && !this.isClosing) {
          config.action();
        }
      });

      this.ui.hotspots.push(zone);
      this.ui.hotspotDebug.push(debugBox, debugLabel);
    });

    this.refreshPauseDebugVisual();
  }

  toggleBroadcastPause() {
    if (this.isClosing) {
      return;
    }

    this.isBroadcastPaused = !this.isBroadcastPaused;

    if (this.typingEvent) {
      this.typingEvent.paused =
        this.isBroadcastPaused;
    }

    if (this.advanceEvent) {
      this.advanceEvent.paused =
        this.isBroadcastPaused;
    }

    this.refreshPauseDebugVisual();
  }

  refreshPauseDebugVisual() {
    const box = this.ui.pauseDebugBox;
    const label = this.ui.pauseDebugLabel;

    if (!box || !label) {
      return;
    }

    if (this.isBroadcastPaused) {
      box.setFillStyle(0x007744, 0.55);
      box.setStrokeStyle(3, 0x00ff88, 1);
      label.setText('PLAY');
      label.setColor('#00ff88');

      return;
    }

    box.setFillStyle(0xff00ff, 0.22);
    box.setStrokeStyle(2, 0xffff00, 0.95);
    label.setText('PAUSE');
    label.setColor('#ffffff');
  }

  createFxLoop() {
    this.noiseEvent = this.time.addEvent({
      delay: 90,
      loop: true,
      callback: () => {
        if (
          this.sys.isActive() &&
          this.layout &&
          this.ui.noise
        ) {
          this.drawNoise(
            this.layout.screenWidth,
            this.layout.screenHeight
          );
        }
      }
    });
  }

  playOpenAnimation() {
    this.addTrackedTween(
      this.tweens.add({
        targets: this.ui.backdrop,
        alpha: 1,
        duration: 150,
        ease: 'Quad.Out'
      })
    );

    this.addTrackedTween(
      this.tweens.add({
        targets: this.ui.root,
        alpha: 1,
        scale: 1,
        duration: 180,
        ease: 'Quad.Out',
        onComplete: () => {
          if (this.sys.isActive()) {
            this.playSegment(0);
          }
        }
      })
    );
  }

  playSegment(index) {
    if (
      this.isClosing ||
      !this.segmentQueue.length ||
      index < 0 ||
      index >= this.segmentQueue.length
    ) {
      this.finishBroadcast();
      return;
    }

    this.clearTimers(false);

    this.isBroadcastPaused = false;

    this.refreshPauseDebugVisual();

    this.currentSegmentIndex = index;
    this.currentSegment = this.segmentQueue[index];

    this.currentLineIndex = 0;
    this.currentCharIndex = 0;

    this.currentLinePrefix = '';
    this.currentLineFullText = '';

    this.isTyping = false;
    this.isTransitioning = false;

    const segment = this.currentSegment;

    this.applySegmentVisuals(segment);

    this.applyVisualTheme(segment.theme || {});

    this.ui.labelText.setText(segment.label || '');

    this.ui.channelText.setText(
      segment.channel || 'CH-03'
    );

    this.ui.titleText.setText(segment.title || '');

    this.ui.breakingText.setText(segment.badge || '');

    this.ui.bodyText.setText('');

    if (segment.instant) {
      this.ui.bodyText.setText(
        (segment.lines || []).join('\n')
      );

      this.advanceEvent = this.time.delayedCall(
        segment.hold || 900,
        () => {
          if (
            this.sys.isActive() &&
            !this.isBroadcastPaused
          ) {
            this.advanceSegment();
          }
        }
      );

      return;
    }

    this.typeNextLine();
  }

  applySegmentVisuals(segment) {
    const isNews = segment.type === 'news';

    const isAdvertisement =
      segment.type === 'ad' ||
      segment.type === 'advertisement' ||
      segment.type === 'commercial';

    const showSeparatePresenter =
      !isAdvertisement;

    this.ui.programBackground
      .setVisible(isNews)
      .setAlpha(isNews ? 0.9 : 0);

    this.ui.anchorPortrait
      .setTexture(this.anchorTextureKey)
      .setVisible(showSeparatePresenter)
      .setAlpha(showSeparatePresenter ? 1 : 0);

    this.ui.anchorTextPanel.setVisible(false);
    this.ui.newsTextPanel.setVisible(false);

    const sw = this.layout.screenWidth;
    const sh = this.layout.screenHeight;

    const left =
      -sw / 2 +
      this.layout.screenSafeInsetX;

    const top =
      -sh / 2 +
      this.layout.screenSafeInsetTop;

    const headerHeight = 28;

    if (isNews) {
      this.ui.anchorPortrait
        .setPosition(
          -sw * 0.23,
          sh / 2 -
          this.layout.screenSafeInsetBottom +
          4
        )
        .setDisplaySize(
          sw * 0.48,
          sh * 0.82
        );

      const panelWidth = sw * 0.49;
      const panelHeight = sh * 0.52;
      const panelX = sw * 0.12;
      const panelY = sh * 0.16;

      this.ui.newsTextPanel
        .setPosition(panelX, panelY)
        .setSize(panelWidth, panelHeight)
        .setVisible(true);

      this.ui.anchorText
        .setText('')
        .setVisible(false);

      this.ui.bodyText
        .setPosition(
          panelX - panelWidth / 2 + 16,
          panelY - panelHeight / 2 + 16
        )
        .setWordWrapWidth(
          panelWidth - 32,
          true
        )
        .setVisible(true);

      return;
    }

    if (showSeparatePresenter) {
      this.ui.anchorPortrait
        .setPosition(
          -sw * 0.23,
          sh / 2 -
          this.layout.screenSafeInsetBottom +
          4
        )
        .setDisplaySize(
          sw * 0.48,
          sh * 0.82
        );

      const panelWidth = sw * 0.50;
      const panelHeight = sh * 0.56;
      const panelX = sw * 0.12;
      const panelY = sh * 0.12;

      this.ui.anchorTextPanel
        .setPosition(panelX, panelY)
        .setSize(panelWidth, panelHeight)
        .setVisible(true);

      this.ui.anchorText
        .setText(
          segment.anchorName ||
          this.anchorDisplayName
        )
        .setPosition(
          panelX - panelWidth / 2 + 16,
          panelY - panelHeight / 2 + 14
        )
        .setVisible(true);

      this.ui.bodyText
        .setPosition(
          panelX - panelWidth / 2 + 16,
          panelY - panelHeight / 2 + 52
        )
        .setWordWrapWidth(
          panelWidth - 32,
          true
        )
        .setVisible(true);

      return;
    }

    this.ui.anchorText
      .setText('')
      .setVisible(false);

    this.ui.bodyText
      .setPosition(
        left + 4,
        top + headerHeight + 106
      )
      .setWordWrapWidth(
        sw -
        this.layout.screenSafeInsetX * 2 -
        8,
        true
      )
      .setVisible(true);
  }

  typeNextLine() {
    if (
      this.isClosing ||
      this.isBroadcastPaused ||
      !this.currentSegment ||
      !this.ui.bodyText?.active
    ) {
      return;
    }

    const lines = this.currentSegment.lines || [];

    if (this.currentLineIndex >= lines.length) {
      this.advanceEvent = this.time.delayedCall(
        this.currentSegment.hold || 1200,
        () => {
          if (
            this.sys.isActive() &&
            !this.isBroadcastPaused &&
            !this.isClosing
          ) {
            this.advanceSegment();
          }
        }
      );

      return;
    }

    this.currentLineFullText =
      lines[this.currentLineIndex];

    const existingText =
      this.ui.bodyText.text.trim();

    this.currentLinePrefix = existingText
      ? `${existingText}\n`
      : '';

    this.currentCharIndex = 0;
    this.isTyping = true;

    const typingEvent = this.time.addEvent({
      delay: this.currentSegment.charDelay || 20,
      loop: true,
      callback: () => {
        if (
          !this.sys.isActive() ||
          this.isClosing ||
          this.isBroadcastPaused ||
          !this.currentSegment ||
          !this.ui.bodyText?.active ||
          this.typingEvent !== typingEvent
        ) {
          return;
        }

        this.currentCharIndex += 1;

        this.ui.bodyText.setText(
          this.currentLinePrefix +
          this.currentLineFullText.slice(
            0,
            this.currentCharIndex
          )
        );

        if (
          this.currentCharIndex <
          this.currentLineFullText.length
        ) {
          return;
        }

        typingEvent.remove(false);

        if (this.typingEvent === typingEvent) {
          this.typingEvent = null;
        }

        this.isTyping = false;
        this.currentLineIndex += 1;

        this.advanceEvent = this.time.delayedCall(
          this.currentSegment.linePause || 250,
          () => {
            if (
              this.sys.isActive() &&
              !this.isBroadcastPaused &&
              !this.isClosing
            ) {
              this.typeNextLine();
            }
          }
        );
      }
    });

    typingEvent.paused = this.isBroadcastPaused;

    this.typingEvent = typingEvent;
  }

  onAdvancePressed() {
    if (
      this.isClosing ||
      this.isTransitioning ||
      this.isBroadcastPaused
    ) {
      return;
    }

    if (this.isTyping) {
      this.finishCurrentLine();
      return;
    }

    if (this.advanceEvent?.remove) {
      this.advanceEvent.remove(false);
    }

    this.advanceEvent = null;

    this.advanceSegment();
  }

  onSkipPressed() {
    if (
      this.isClosing ||
      this.isTransitioning ||
      this.isBroadcastPaused
    ) {
      return;
    }

    const newsIndex = this.segmentQueue.findIndex(
      (segment) => segment.type === 'news'
    );

    if (
      newsIndex === -1 ||
      (
        newsIndex === this.currentSegmentIndex &&
        !this.isTyping
      )
    ) {
      this.finishBroadcast();
      return;
    }

    this.transitionToSegment(newsIndex);
  }

  onClosePressed() {
    if (!this.isTransitioning && !this.isClosing) {
      this.finishBroadcast();
    }
  }

  finishCurrentLine() {
    if (
      this.isClosing ||
      this.isBroadcastPaused ||
      !this.currentSegment ||
      !this.ui.bodyText?.active
    ) {
      return;
    }

    if (this.typingEvent?.remove) {
      this.typingEvent.remove(false);
    }

    this.typingEvent = null;

    this.ui.bodyText.setText(
      this.currentLinePrefix +
      this.currentLineFullText
    );

    this.isTyping = false;
    this.currentLineIndex += 1;

    if (this.advanceEvent?.remove) {
      this.advanceEvent.remove(false);
    }

    this.advanceEvent = this.time.delayedCall(
      this.currentSegment.linePause || 250,
      () => {
        if (
          this.sys.isActive() &&
          !this.isBroadcastPaused &&
          !this.isClosing
        ) {
          this.typeNextLine();
        }
      }
    );
  }

  advanceSegment() {
    if (
      this.isClosing ||
      this.isBroadcastPaused
    ) {
      return;
    }

    const nextIndex =
      this.currentSegmentIndex + 1;

    if (nextIndex >= this.segmentQueue.length) {
      this.finishBroadcast();
      return;
    }

    this.transitionToSegment(nextIndex);
  }

  transitionToSegment(index) {
    if (
      this.isClosing ||
      this.isBroadcastPaused
    ) {
      return;
    }

    this.clearTimers(false);

    this.isTransitioning = true;

    this.time.delayedCall(130, () => {
      if (!this.sys.isActive() || this.isClosing) {
        return;
      }

      this.isTransitioning = false;

      this.playSegment(index);
    });
  }

  finishBroadcast() {
    if (this.isClosing) {
      return;
    }

    this.isClosing = true;

    this.clearTimers(true);

    this.addTrackedTween(
      this.tweens.add({
        targets: [
          this.ui.root,
          this.ui.backdrop
        ],
        alpha: 0,
        duration: 180,
        ease: 'Quad.In',
        onComplete: () => {
          this.restoreReturnScene();

          this.setNewsHudButtonsVisible(true);

          this.onClose?.({
            missionId:
              gameState.currentMission?.id || null,
            watched: true,
            lastSegmentType:
              this.currentSegment?.type || null
          });

          this.restoreUnderlyingHud();

          if (this.sys.isActive()) {
            this.scene.stop();
          }
        }
      })
    );
  }

  restoreReturnScene() {
    if (
      !this.hasPausedReturnScene ||
      !this.returnSceneKey ||
      !this.hasScene(this.returnSceneKey)
    ) {
      return;
    }

    if (this.isScenePaused(this.returnSceneKey)) {
      this.scene.resume(this.returnSceneKey);
    } else if (this.isSceneSleeping(this.returnSceneKey)) {
      this.scene.wake(this.returnSceneKey);
    }

    this.hasPausedReturnScene = false;
  }

  clearTimers(includeNoise) {
    if (this.typingEvent?.remove) {
      this.typingEvent.remove(false);
    }

    this.typingEvent = null;

    if (this.advanceEvent?.remove) {
      this.advanceEvent.remove(false);
    }

    this.advanceEvent = null;

    if (includeNoise && this.noiseEvent?.remove) {
      this.noiseEvent.remove(false);
    }

    if (includeNoise) {
      this.noiseEvent = null;
    }

    this.isTyping = false;
  }

  applyVisualTheme(theme) {
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

  drawScanlines(width, height) {
    this.ui.scanlines?.clear();

    this.ui.scanlines?.fillStyle(
      0x000000,
      0.14
    );

    for (let y = -height / 2; y < height / 2; y += 4) {
      this.ui.scanlines?.fillRect(
        -width / 2,
        y,
        width,
        2
      );
    }
  }

  drawNoise(width, height) {
    this.ui.noise?.clear();

    for (let i = 0; i < 110; i += 1) {
      this.ui.noise?.fillStyle(
        0xffffff,
        Phaser.Math.FloatBetween(
          0.025,
          0.12
        )
      );

      this.ui.noise?.fillRect(
        Phaser.Math.Between(
          -width / 2,
          width / 2
        ),
        Phaser.Math.Between(
          -height / 2,
          height / 2
        ),
        Phaser.Math.Between(8, 34),
        Phaser.Math.Between(1, 3)
      );
    }
  }

  handleShutdown() {
    this.clearTimers(true);

    this.restoreReturnScene();

    this.restoreUnderlyingHud();

    this.setNewsHudButtonsVisible(true);

    this.ui.hotspotDebug?.forEach((item) => {
      item?.destroy?.();
    });

    this.ui.hotspots?.forEach((hotspot) => {
      hotspot?.removeAllListeners?.();
      hotspot?.destroy?.();
    });

    this.ui.screenMaskGraphics?.destroy?.();

    this.ui = {};

    this.isTyping = false;
    this.isTransitioning = false;
    this.isBroadcastPaused = false;
    this.isClosing = false;
  }
}