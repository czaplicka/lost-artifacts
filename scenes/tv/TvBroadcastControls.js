export class TvBroadcastControls {
  constructor(scene, options = {}) {
    this.scene = scene;

    this.onClose = options.onClose || (() => {});
    this.onSkip = options.onSkip || (() => {});
    this.onNext = options.onNext || (() => {});
    this.onPauseToggle =
      options.onPauseToggle || (() => {});

    this.isActionAllowed =
      options.isActionAllowed || (() => true);

    this.isBroadcastPaused =
      options.isBroadcastPaused || (() => false);

    this.hotspots = [];
    this.debugObjects = [];

    this.pauseDebugBox = null;
    this.pauseDebugLabel = null;

    this.isDestroyed = false;
  }

  create(layout) {
    if (
      this.isDestroyed ||
      !layout
    ) {
      return;
    }

    this.destroyHotspots();

    const {
      centerX,
      centerY,
      tvHeight
    } = layout;

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
        action: this.onClose
      },
      {
        id: 'skip',
        action: this.onSkip
      },
      {
        id: 'next',
        action: this.onNext
      },
      {
        id: 'pause',
        action: this.onPauseToggle
      }
    ];

    configs.forEach((config, index) => {
      const x =
        startX +
        index * (hotspotWidth + gap);

      this.createHotspot({
        x,
        y: hotspotY,
        width: hotspotWidth,
        height: hotspotHeight,
        id: config.id,
        action: config.action
      });
    });

    this.refreshPauseVisual();
  }

  createHotspot(config) {
    const {
      x,
      y,
      width,
      height,
      id,
      action
    } = config;

    const zone = this.scene.add
      .zone(
        x,
        y,
        width,
        height
      )
      .setDepth(30)
      .setInteractive({
        useHandCursor: true
      });

    const debugBox = this.scene.add
      .rectangle(
        x,
        y,
        width,
        height,
        0xff00ff,
        0.22
      )
      .setStrokeStyle(2, 0xffff00, 0.95)
      .setDepth(29);

    const debugLabel = this.scene.add
      .text(
        x,
        y,
        id.toUpperCase(),
        {
          fontFamily: 'PressStart2P',
          fontSize: '8px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3
        }
      )
      .setOrigin(0.5)
      .setDepth(31);

    zone.on('pointerover', () => {
      if (this.isDestroyed) {
        return;
      }

      debugBox.setFillStyle(0x00ff88, 0.48);
      debugBox.setStrokeStyle(3, 0xffffff, 1);
      debugLabel.setColor('#00ff88');
    });

    zone.on('pointerout', () => {
      if (this.isDestroyed) {
        return;
      }

      if (id === 'pause') {
        this.refreshPauseVisual();
        return;
      }

      this.setDefaultVisual(
        debugBox,
        debugLabel
      );
    });

    zone.on('pointerdown', () => {
      if (this.isDestroyed) {
        return;
      }

      debugBox.setFillStyle(0xff3300, 0.62);
    });

    zone.on('pointerup', () => {
      if (
        this.isDestroyed ||
        !this.isActionAllowed()
      ) {
        return;
      }

      action?.();
    });

    this.hotspots.push(zone);

    this.debugObjects.push(
      debugBox,
      debugLabel
    );

    if (id === 'pause') {
      this.pauseDebugBox = debugBox;
      this.pauseDebugLabel = debugLabel;
    }
  }

  refreshPauseVisual() {
    if (
      this.isDestroyed ||
      !this.pauseDebugBox ||
      !this.pauseDebugLabel
    ) {
      return;
    }

    if (this.isBroadcastPaused()) {
      this.pauseDebugBox.setFillStyle(
        0x007744,
        0.55
      );

      this.pauseDebugBox.setStrokeStyle(
        3,
        0x00ff88,
        1
      );

      this.pauseDebugLabel.setText('PLAY');
      this.pauseDebugLabel.setColor('#00ff88');

      return;
    }

    this.setDefaultVisual(
      this.pauseDebugBox,
      this.pauseDebugLabel
    );

    this.pauseDebugLabel.setText('PAUSE');
  }

  setDefaultVisual(box, label) {
    box.setFillStyle(0xff00ff, 0.22);
    box.setStrokeStyle(2, 0xffff00, 0.95);
    label.setColor('#ffffff');
  }

  setVisible(visible) {
    this.hotspots.forEach((hotspot) => {
      hotspot?.setVisible?.(visible);

      if (hotspot?.input) {
        hotspot.input.enabled = visible;
      }
    });

    this.debugObjects.forEach((object) => {
      object?.setVisible?.(visible);
    });
  }

  destroyHotspots() {
    this.debugObjects.forEach((object) => {
      object?.destroy?.();
    });

    this.hotspots.forEach((hotspot) => {
      hotspot?.removeAllListeners?.();
      hotspot?.destroy?.();
    });

    this.hotspots = [];
    this.debugObjects = [];

    this.pauseDebugBox = null;
    this.pauseDebugLabel = null;
  }

  destroy() {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;

    this.destroyHotspots();

    this.onClose = null;
    this.onSkip = null;
    this.onNext = null;
    this.onPauseToggle = null;

    this.isActionAllowed = null;
    this.isBroadcastPaused = null;

    this.scene = null;
  }
}