// src/scenes/TvBroadcastScene.js
import { gameState } from '../GameData.js';
import { getTVBroadcast } from '../tvBroadcastData.js';
import { BaseScene } from './BaseScene.js';

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
    this.currentLineFullText = '';
    this.currentLinePrefix = '';
    this.currentSegment = null;

    this.layout = null;
    this.ui = {};
  }

  init(data = {}) {
    this.returnSceneKey = data.returnSceneKey || null;
    this.pauseBelowScene =
      data.pauseBelowScene !== undefined ? data.pauseBelowScene : true;
    this.onClose = typeof data.onClose === 'function' ? data.onClose : null;
  }

  preload() {
    if (!window.WebFont) {
      this.load.script(
        'webfont',
        'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js'
      );
    }

    this.load.json('tv-config', 'assets/data/tv-config.json');
  }

  create() {
        super.create();
    this.ensureFontsLoaded(() => {
      this.setupSceneState();
      this.createLayout();
      this.createBackdrop();
      this.createTvShell();
      this.createScreenUI();
      this.createFxLoop();
      this.createHotspots();

      const tvConfigJson = this.cache.json.get('tv-config') || {};
      const tvData = getTVBroadcast(gameState, tvConfigJson);

      this.segmentQueue = tvData.segments || [];

      this.playOpenAnimation();

      // Ukrycie HUD-u i otwartego menu gracza na czas telewizji.
      if (this.scene.isActive('PlayerHudScene')) {
        const hud = this.scene.get('PlayerHudScene');

        hud.closeAllUIPanels?.();
        hud.playerMenu?.close?.();
        hud.scene.setVisible(false);
      }
    });
  }

  ensureFontsLoaded(onReady) {
    if (!window.WebFont) {
      onReady();
      return;
    }

    window.WebFont.load({
      google: {
        families: ['Press Start 2P', 'Special Elite']
      },
      active: () => onReady(),
      inactive: () => onReady()
    });
  }

  // ───────────────────────────────────────────── setup/layout

  setupSceneState() {
    if (this.pauseBelowScene && this.returnSceneKey) {
      this.scene.pause(this.returnSceneKey);
    }

    const { width, height } = this.scale;

    const tvTexture = this.textures.get('television');
    const src = tvTexture?.getSourceImage();

    const tvWidth = src ? src.width : width * 0.8;
    const tvHeight = src ? src.height : height * 0.6;

    this.layout = {
      width,
      height,

      centerX: width * 0.5,
      centerY: height * 0.5,

      tvWidth,
      tvHeight,

      // Kineskop: poprzedni width + 20 px.
      screenWidth: tvWidth * 0.5 + 20,
      screenHeight: tvHeight * 0.6,

      // Kineskop: 40 px w lewo i lekko do góry.
      screenOffsetX: -40,
      screenOffsetY: -tvHeight * 0.06
    };

    this.input.keyboard.on('keydown-SPACE', this.onAdvancePressed, this);
    this.input.keyboard.on('keydown-ENTER', this.onAdvancePressed, this);
    this.input.keyboard.on('keydown-X', this.onSkipPressed, this);
    this.input.keyboard.on('keydown-ESC', this.onClosePressed, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  createLayout() {
    this.ui.root = this.add.container(
      this.layout.centerX,
      this.layout.centerY
    );

    this.ui.root.setAlpha(0);
    this.ui.root.setScale(1);
    this.ui.root.setDepth(10);
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
      .setOrigin(0);

    this.ui.backdrop.setAlpha(0);
    this.ui.backdrop.setDepth(1);

    // Blokuje kliknięcia w scenę pod TV.
    this.ui.backdrop.setInteractive();
  }

  // ───────────────────────────────────────────── TV sprite + kineskop

  createTvShell() {
    const {
      screenOffsetX,
      screenOffsetY,
      screenWidth,
      screenHeight
    } = this.layout;

    this.ui.tvSprite = this.add
      .image(0, 0, 'television')
      .setOrigin(0.5, 0.5);

    this.ui.root.add(this.ui.tvSprite);

    // Kineskop: przesunięty 40 px w lewo.
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

    this.ui.screenFrame.setStrokeStyle(2, 0x23352d, 0.9);

    this.ui.screenContainer.add(this.ui.screenFrame);

    const maskGraphics = this.make.graphics({
      x: 0,
      y: 0,
      add: false
    });

    maskGraphics.fillStyle(0xffffff, 1);

    maskGraphics.fillRect(
      this.layout.centerX + screenOffsetX - screenWidth / 2,
      this.layout.centerY + screenOffsetY - screenHeight / 2,
      screenWidth,
      screenHeight
    );

    this.ui.screenMask = maskGraphics.createGeometryMask();
  }

  createScreenUI() {
    const sw = this.layout.screenWidth;
    const sh = this.layout.screenHeight;

    this.ui.screenInner = this.add.container(0, 0);
    this.ui.screenInner.setMask(this.ui.screenMask);
    this.ui.screenContainer.add(this.ui.screenInner);

    this.ui.screenBg = this.add.rectangle(0, 0, sw, sh, 0x1a2621);
    this.ui.screenInner.add(this.ui.screenBg);

    this.ui.screenTopBar = this.add.rectangle(
      0,
      -sh / 2 + 18,
      sw,
      30,
      0x18221d,
      0.92
    );
    this.ui.screenInner.add(this.ui.screenTopBar);

    this.ui.screenBottomBar = this.add.rectangle(
      0,
      sh / 2 - 24,
      sw,
      48,
      0x09100d,
      0.9
    );
    this.ui.screenInner.add(this.ui.screenBottomBar);

    this.ui.scanlines = this.add.graphics();
    this.drawScanlines(sw, sh);
    this.ui.screenInner.add(this.ui.scanlines);

    this.ui.noise = this.add.graphics();
    this.drawNoise(sw, sh);
    this.ui.screenInner.add(this.ui.noise);

    this.ui.vignette = this.add.graphics();
    this.ui.vignette.fillStyle(0x000000, 0.12);
    this.ui.vignette.fillRect(-sw / 2, -sh / 2, sw, sh);
    this.ui.screenInner.add(this.ui.vignette);

    this.ui.labelText = this.add.text(-sw / 2 + 16, -sh / 2 + 8, '', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#f8e7a7'
    });
    this.ui.screenInner.add(this.ui.labelText);

    this.ui.channelText = this.add
      .text(sw / 2 - 16, -sh / 2 + 8, 'CH-03', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#d7ffea'
      })
      .setOrigin(1, 0);

    this.ui.screenInner.add(this.ui.channelText);

    this.ui.titleText = this.add
      .text(0, -sh / 2 + 50, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '14px',
        color: '#fff6cf',
        align: 'center',
        wordWrap: {
          width: sw - 40,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5, 0);

    this.ui.screenInner.add(this.ui.titleText);

    this.ui.breakingBadge = this.add.rectangle(
      -sw / 2 + 80,
      -sh / 2 + 52,
      132,
      24,
      0x993344,
      0.95
    );

    this.ui.breakingText = this.add
      .text(this.ui.breakingBadge.x, this.ui.breakingBadge.y - 1, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        color: '#fff5ef'
      })
      .setOrigin(0.5);

    this.ui.screenInner.add(this.ui.breakingBadge);
    this.ui.screenInner.add(this.ui.breakingText);

    this.ui.anchorText = this.add.text(-sw / 2 + 16, -6, '', {
      fontFamily: '"Special Elite"',
      fontSize: '26px',
      color: '#d7efe5'
    });
    this.ui.screenInner.add(this.ui.anchorText);

    this.ui.bodyText = this.add.text(-sw / 2 + 16, 30, '', {
      fontFamily: '"Special Elite"',
      fontSize: '24px',
      color: '#f3f5f1',
      wordWrap: {
        width: sw - 32,
        useAdvancedWrap: true
      },
      lineSpacing: 10
    });
    this.ui.screenInner.add(this.ui.bodyText);
  }

  // ───────────────────────────────────────────── invisible hotspots

  createHotspots() {
  const {
    centerX,
    centerY,
    tvHeight
  } = this.layout;

  const hotspotWidth = 105;
  const hotspotHeight = 42;
  const gap = 14;

  const groupWidth = hotspotWidth * 4 + gap * 3;
  const startX = centerX - groupWidth / 2 + hotspotWidth / 2;

  // 20 px wyżej niż poprzednie ustawienie.
  const hotspotY = centerY + tvHeight * 0.38 - 20;

  const hotspotConfigs = [
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
      id: 'empty',
      action: () => {}
    }
  ];

  this.ui.hotspots = [];
  this.ui.hotspotDebug = [];

  hotspotConfigs.forEach((config, index) => {
    const x = startX + index * (hotspotWidth + gap);

    // Prawdziwy, niewidzialny obszar interakcji.
    const hotspot = this.add
      .zone(x, hotspotY, hotspotWidth, hotspotHeight)
      .setDepth(30)
      .setInteractive({ useHandCursor: true });

    hotspot.name = `tv-hotspot-${config.id}`;

    // TYLKO DEBUG:
    // Widoczna ramka pokazująca faktyczny obszar hotspotu.
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
      .text(x, hotspotY, config.id.toUpperCase(), {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(31);

    hotspot.on('pointerover', () => {
      debugBox.setFillStyle(0x00ff88, 0.48);
      debugBox.setStrokeStyle(3, 0xffffff, 1);
      debugLabel.setColor('#00ff88');
    });

    hotspot.on('pointerout', () => {
      debugBox.setFillStyle(0xff00ff, 0.22);
      debugBox.setStrokeStyle(2, 0xffff00, 0.95);
      debugLabel.setColor('#ffffff');
    });

    hotspot.on('pointerdown', () => {
      debugBox.setFillStyle(0xff3300, 0.62);
    });

    hotspot.on('pointerup', () => {
      debugBox.setFillStyle(0x00ff88, 0.48);

      if (this.isTransitioning) return;
      config.action();
    });

    this.ui.hotspots.push(hotspot);
    this.ui.hotspotDebug.push(debugBox, debugLabel);
  });
}

  // ───────────────────────────────────────────── FX / opening

  createFxLoop() {
    this.noiseEvent = this.time.addEvent({
      delay: 90,
      loop: true,
      callback: () => {
        if (!this.scene.isActive()) return;
        this.drawNoise(this.layout.screenWidth, this.layout.screenHeight);
      }
    });
  }

  playOpenAnimation() {
    this.tweens.add({
      targets: this.ui.backdrop,
      alpha: 1,
      duration: 150,
      ease: 'Quad.Out'
    });

    this.tweens.add({
      targets: this.ui.root,
      alpha: 1,
      scale: 1,
      duration: 180,
      ease: 'Quad.Out',
      onComplete: () => {
        this.playSegment(0);
      }
    });
  }

  // ───────────────────────────────────────────── segmenty / typing

  playSegment(index) {
    if (!Array.isArray(this.segmentQueue) || this.segmentQueue.length === 0) {
      this.finishBroadcast();
      return;
    }

    if (index < 0 || index >= this.segmentQueue.length) {
      this.finishBroadcast();
      return;
    }

    this.clearTimers(false);

    this.currentSegmentIndex = index;
    this.currentSegment = this.segmentQueue[index];
    this.currentLineIndex = 0;
    this.currentCharIndex = 0;
    this.currentLinePrefix = '';
    this.currentLineFullText = '';
    this.isTyping = false;
    this.isTransitioning = false;

    const seg = this.currentSegment;

    this.applyVisualTheme(seg.theme || {});
    this.ui.labelText.setText(seg.label || '');
    this.ui.channelText.setText(seg.channel || 'CH-03');
    this.ui.titleText.setText(seg.title || '');
    this.ui.breakingText.setText(seg.badge || '');
    this.ui.anchorText.setText(seg.anchorName || '');
    this.ui.bodyText.setText('');

    if (seg.instant) {
      this.ui.bodyText.setText((seg.lines || []).join('\n'));

      this.advanceEvent = this.time.delayedCall(
        seg.hold || 900,
        () => this.advanceSegment()
      );

      return;
    }

    this.typeNextLine();
  }

  typeNextLine() {
  if (!this.currentSegment || !this.ui.bodyText?.active) return;

  const lines = this.currentSegment.lines || [];

  if (this.currentLineIndex >= lines.length) {
    const hold = this.currentSegment.hold || 1200;

    this.advanceEvent = this.time.delayedCall(
      hold,
      () => {
        if (!this.scene.isActive()) return;
        this.advanceSegment();
      }
    );

    return;
  }

  this.currentLineFullText = lines[this.currentLineIndex];

  const existingText = this.ui.bodyText.text.trim();
  this.currentLinePrefix = existingText ? `${existingText}\n` : '';

  this.currentCharIndex = 0;
  this.isTyping = true;

  // Trzymamy lokalną referencję do konkretnego eventu.
  // Nie używamy this.typingEvent.remove() bezpośrednio w callbacku.
  const typingEvent = this.time.addEvent({
    delay: this.currentSegment.charDelay || 20,
    loop: true,
    callback: () => {
      // Timer mógł zostać anulowany np. przez SKIP, NEXT lub CLOSE.
      if (
        !this.scene.isActive() ||
        !this.currentSegment ||
        !this.ui.bodyText?.active ||
        this.typingEvent !== typingEvent
      ) {
        if (typingEvent?.remove) {
          typingEvent.remove(false);
        }
        return;
      }

      this.currentCharIndex += 1;

      const partial = this.currentLineFullText.slice(
        0,
        this.currentCharIndex
      );

      this.ui.bodyText.setText(this.currentLinePrefix + partial);

      if (this.currentCharIndex < this.currentLineFullText.length) {
        return;
      }

      // Najpierw kasujemy lokalny timer, potem referencję sceny.
      typingEvent.remove(false);

      if (this.typingEvent === typingEvent) {
        this.typingEvent = null;
      }

      this.isTyping = false;
      this.currentLineIndex += 1;

      this.advanceEvent = this.time.delayedCall(
        this.currentSegment.linePause || 250,
        () => {
          if (!this.scene.isActive()) return;
          this.typeNextLine();
        }
      );
    }
  });

  this.typingEvent = typingEvent;
}

  onAdvancePressed() {
    if (this.isTransitioning) return;

    if (this.isTyping) {
      this.finishCurrentLine();
      return;
    }

    if (this.advanceEvent) {
      this.advanceEvent.remove(false);
      this.advanceEvent = null;
    }

    this.advanceSegment();
  }

  onSkipPressed() {
    if (this.isTransitioning) return;

    const newsIndex = this.segmentQueue.findIndex(
      segment => segment.type === 'news'
    );

    if (newsIndex === -1) {
      this.finishBroadcast();
      return;
    }

    if (newsIndex === this.currentSegmentIndex && !this.isTyping) {
      this.finishBroadcast();
      return;
    }

    this.transitionToSegment(newsIndex);
  }

  onClosePressed() {
    if (this.isTransitioning) return;
    this.finishBroadcast();
  }

  finishCurrentLine() {
  if (!this.currentSegment || !this.ui.bodyText?.active) return;

  const activeTypingEvent = this.typingEvent;

  if (activeTypingEvent?.remove) {
    activeTypingEvent.remove(false);
  }

  if (this.typingEvent === activeTypingEvent) {
    this.typingEvent = null;
  }

  this.ui.bodyText.setText(
    this.currentLinePrefix + this.currentLineFullText
  );

  this.isTyping = false;
  this.currentLineIndex += 1;

  if (this.advanceEvent?.remove) {
    this.advanceEvent.remove(false);
  }

  this.advanceEvent = this.time.delayedCall(
    this.currentSegment.linePause || 250,
    () => {
      if (!this.scene.isActive()) return;
      this.typeNextLine();
    }
  );
}

  advanceSegment() {
    const nextIndex = this.currentSegmentIndex + 1;

    if (nextIndex >= this.segmentQueue.length) {
      this.finishBroadcast();
      return;
    }

    this.transitionToSegment(nextIndex);
  }

  transitionToSegment(index) {
    this.clearTimers(false);
    this.isTransitioning = true;

    this.time.delayedCall(130, () => {
      this.isTransitioning = false;
      this.playSegment(index);
    });
  }

  // ───────────────────────────────────────────── zamknięcie

  finishBroadcast() {
    this.clearTimers(true);

    this.input.keyboard.off('keydown-SPACE', this.onAdvancePressed, this);
    this.input.keyboard.off('keydown-ENTER', this.onAdvancePressed, this);
    this.input.keyboard.off('keydown-X', this.onSkipPressed, this);
    this.input.keyboard.off('keydown-ESC', this.onClosePressed, this);

    this.tweens.add({
      targets: [this.ui.root, this.ui.backdrop],
      alpha: 0,
      duration: 180,
      ease: 'Quad.In',
      onComplete: () => {
        if (this.pauseBelowScene && this.returnSceneKey) {
          this.scene.resume(this.returnSceneKey);
        }

        const newsHud = this.scene.get('NewsHud');

        if (newsHud) {
          newsHud.events.emit('setNewspaperVisible', true);
          newsHud.events.emit('setTvVisible', true);
        }

        if (this.onClose) {
          this.onClose({
            missionId: gameState.currentMission?.id || null,
            watched: true,
            lastSegmentType: this.currentSegment?.type || null
          });
        }

        // Przywrócenie HUD i menu po wyjściu z telewizji.
        const hud = this.scene.get('PlayerHudScene');

        if (hud) {
          hud.scene.setVisible(true);
        }

        this.scene.stop();
      }
    });
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

  // ───────────────────────────────────────────── theme / fx

  applyVisualTheme(theme) {
    const screenColor = this.toColorInt(theme.screenColor, 0x1e2a24);
    const topBarColor = this.toColorInt(theme.topBarColor, 0x30453d);
    const badgeColor = this.toColorInt(theme.badgeColor, 0x8f3043);
    const bottomColor = this.toColorInt(theme.bottomColor, 0x09100d);

    this.ui.screenBg.setFillStyle(screenColor, 1);
    this.ui.screenTopBar.setFillStyle(topBarColor, 0.95);
    this.ui.screenBottomBar.setFillStyle(bottomColor, 0.9);
    this.ui.breakingBadge.setFillStyle(badgeColor, 0.96);
  }

  toColorInt(value, fallback) {
    if (typeof value === 'number') return value;

    if (typeof value === 'string') {
      const parsed = parseInt(value.replace('#', ''), 16);
      return Number.isNaN(parsed) ? fallback : parsed;
    }

    return fallback;
  }

  drawScanlines(width, height) {
    this.ui.scanlines.clear();
    this.ui.scanlines.fillStyle(0x000000, 0.14);

    for (let y = -height / 2; y < height / 2; y += 4) {
      this.ui.scanlines.fillRect(-width / 2, y, width, 2);
    }
  }

  drawNoise(width, height) {
    this.ui.noise.clear();

    for (let i = 0; i < 110; i += 1) {
      const x = Phaser.Math.Between(-width / 2, width / 2);
      const y = Phaser.Math.Between(-height / 2, height / 2);
      const w = Phaser.Math.Between(8, 34);
      const h = Phaser.Math.Between(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.025, 0.12);

      this.ui.noise.fillStyle(0xffffff, alpha);
      this.ui.noise.fillRect(x, y, w, h);
    }
  }

  handleShutdown() {
    this.clearTimers(true);

    this.input.keyboard.off('keydown-SPACE', this.onAdvancePressed, this);
    this.input.keyboard.off('keydown-ENTER', this.onAdvancePressed, this);
    this.input.keyboard.off('keydown-X', this.onSkipPressed, this);
    this.input.keyboard.off('keydown-ESC', this.onClosePressed, this);
this.ui.hotspotDebug?.forEach(item => {
  item.destroy?.();
});
    this.ui.hotspots?.forEach(hotspot => {
      hotspot.removeAllListeners?.();
    });
  }
}