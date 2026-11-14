import {
  NEWSSTAND_CONFIG
} from '../../config/newsstandConfig.js';

export class NewsstandBackground {
  constructor(scene, onTransformChanged = null) {
    this.scene = scene;
    this.onTransformChanged = onTransformChanged;

    this.image = null;
    this.video = null;
    this.dim = null;
    this.missingText = null;

    this.startTimer = null;
    this.checkTimer = null;

    this.requested = false;
    this.visible = false;
    this.finished = false;
    this.destroyed = false;

    this.transform = null;

    this.retryFromPointer = this.retryFromPointer.bind(this);
  }

  create() {
    const scene = this.scene;
    const { width, height } = scene.scale;
    const config = NEWSSTAND_CONFIG;

    if (scene.textures.exists(config.backgroundKey)) {
      this.image = scene.add
        .image(width / 2, height / 2, config.backgroundKey)
        .setOrigin(0.5)
        .setDepth(0);
    } else {
      console.error(
        '[NewsstandBackground] Missing texture:',
        config.backgroundKey
      );

      this.image = scene.add
        .rectangle(
          width / 2,
          height / 2,
          width,
          height,
          0x211815,
          1
        )
        .setDepth(0);

      this.missingText = scene.add
        .text(
          width / 2,
          height / 2,
          `NEWSSTAND BACKGROUND MISSING\n\n${config.backgroundKey}`,
          {
            fontFamily: 'SpecialElite',
            fontSize: '28px',
            color: '#f7e6b5',
            align: 'center'
          }
        )
        .setOrigin(0.5)
        .setDepth(100);
    }

    this.video = scene.add
      .video(width / 2, height / 2)
      .setOrigin(0.5)
      .setDepth(0.5)
      .setVisible(false);

    this.dim = scene.add
      .rectangle(
        0,
        0,
        width,
        height,
        0x000000,
        config.dimAlpha
      )
      .setOrigin(0, 0)
      .setDepth(1)
      .setInteractive();

    this.bindVideoEvents();
    this.resize();

    scene.input.on('pointerdown', this.retryFromPointer);

    try {
      this.video.loadURL(config.videoUrl, true);
      this.video.setMute(true);
      this.video.setLoop(false);
    } catch (error) {
      this.handleVideoError(error);
    }

    this.startTimer = scene.time.delayedCall(
      config.videoDelayMs,
      () => {
        this.startTimer = null;

        if (!this.destroyed && scene.sys.isActive()) {
          this.startVideo();
        }
      }
    );
  }

  bindVideoEvents() {
    const events = Phaser.GameObjects.Events;
    const reveal = () => this.revealVideo();

    this.video.on(events.VIDEO_PLAY || 'play', reveal);
    this.video.on(events.VIDEO_CREATED || 'created', reveal);
    this.video.on(events.VIDEO_TEXTURE || 'textureready', reveal);

    this.video.on(
      events.VIDEO_PLAYING || 'playing',
      () => {
        if (this.video?.frameReady) {
          this.revealVideo();
        }
      }
    );

    this.video.on(
      events.VIDEO_COMPLETE || 'complete',
      () => {
        this.finished = true;
        this.showImage();
      }
    );

    this.video.on(
      events.VIDEO_LOCKED || 'locked',
      () => {
        console.warn(
          '[NewsstandBackground] Video blocked. Click to retry.'
        );

        this.logStatus();
      }
    );

    this.video.on(
      events.VIDEO_UNLOCKED || 'unlocked',
      () => {
        console.info('[NewsstandBackground] Video unlocked.');
      }
    );

    for (const eventName of [
      events.VIDEO_UNSUPPORTED || 'unsupported',
      events.VIDEO_ERROR || 'error'
    ]) {
      this.video.on(
        eventName,
        error => this.handleVideoError(error)
      );
    }
  }

  handleVideoError(error) {
    if (this.destroyed) return;

    console.error(
      '[NewsstandBackground] Video unavailable:',
      error
    );

    this.logStatus();

    this.finished = true;
    this.showImage();
  }

  startVideo() {
    if (
      this.destroyed ||
      !this.video?.scene ||
      this.finished
    ) {
      return;
    }

    this.requested = true;

    try {
      const element = this.video.video;

      if (element) {
        element.muted = true;
        element.defaultMuted = true;
        element.playsInline = true;

        element.setAttribute('playsinline', '');
        element.setAttribute('webkit-playsinline', '');
      }

      this.video.setMute(true).setLoop(false);

      this.resizeVideo();
      this.video.play(false);

      this.checkTimer?.remove(false);

      this.checkTimer = this.scene.time.delayedCall(
        NEWSSTAND_CONFIG.videoCheckDelayMs,
        () => {
          this.checkTimer = null;

          if (
            !this.destroyed &&
            this.scene.sys.isActive() &&
            !this.visible &&
            !this.finished
          ) {
            console.warn(
              '[NewsstandBackground] Video is not visible yet.'
            );

            this.logStatus();
          }
        }
      );
    } catch (error) {
      this.handleVideoError(error);
    }
  }

  revealVideo() {
    if (
      this.destroyed ||
      !this.scene.sys.isActive() ||
      !this.requested ||
      this.finished ||
      !this.video?.scene
    ) {
      return;
    }

    const element = this.video.video;

    if (
      !element ||
      element.readyState < 2 ||
      !element.videoWidth ||
      !element.videoHeight
    ) {
      return;
    }

    this.visible = true;

    this.resizeVideo();

    this.video.setVisible(true);
    this.image?.setVisible(false);

    this.checkTimer?.remove(false);
    this.checkTimer = null;

    this.notifyTransformChanged();
  }

  retryFromPointer() {
    if (
      this.destroyed ||
      !this.requested ||
      this.visible ||
      this.finished ||
      !this.video?.scene
    ) {
      return;
    }

    if (this.video.touchLocked) {
      this.video.play(false);
    }
  }

  showImage() {
    if (this.destroyed) return;

    this.checkTimer?.remove(false);
    this.checkTimer = null;

    this.visible = false;

    this.video?.setVisible(false);
    this.video?.stop();
    this.image?.setVisible(true);

    this.resizeImage();
    this.notifyTransformChanged();
  }

  getCoverTransform(sourceWidth, sourceHeight, zoom) {
    const config = NEWSSTAND_CONFIG;

    const safeWidth = Number(sourceWidth) > 0
      ? Number(sourceWidth)
      : config.designWidth;

    const safeHeight = Number(sourceHeight) > 0
      ? Number(sourceHeight)
      : config.designHeight;

    const scale = Math.max(
      this.scene.scale.width / safeWidth,
      this.scene.scale.height / safeHeight
    ) * zoom;

    const width = safeWidth * scale;
    const height = safeHeight * scale;

    return {
      scale,
      width,
      height,
      x: (this.scene.scale.width - width) / 2,
      y: (this.scene.scale.height - height) / 2
    };
  }

  getTransform() {
    return this.transform || this.getCoverTransform(
      NEWSSTAND_CONFIG.designWidth,
      NEWSSTAND_CONFIG.designHeight,
      NEWSSTAND_CONFIG.imageZoom
    );
  }

  resizeImage() {
    if (!this.image?.scene) return;

    const { width, height } = this.scene.scale;

    if (!this.image.texture) {
      this.image
        .setPosition(width / 2, height / 2)
        .setDisplaySize(width, height);

      if (!this.visible) {
        this.transform = this.getCoverTransform(
          NEWSSTAND_CONFIG.designWidth,
          NEWSSTAND_CONFIG.designHeight,
          NEWSSTAND_CONFIG.imageZoom
        );
      }

      return;
    }

    const transform = this.getCoverTransform(
      this.image.width,
      this.image.height,
      NEWSSTAND_CONFIG.imageZoom
    );

    this.image
      .setPosition(width / 2, height / 2)
      .setScale(transform.scale);

    if (!this.visible) {
      this.transform = transform;
    }
  }

  resizeVideo() {
    if (!this.video?.scene) return;

    const width =
      this.video.video?.videoWidth ||
      this.video.width;

    const height =
      this.video.video?.videoHeight ||
      this.video.height;

    if (!width || !height) return;

    const transform = this.getCoverTransform(
      width,
      height,
      NEWSSTAND_CONFIG.videoZoom
    );

    this.video
      .setPosition(
        this.scene.scale.width / 2,
        this.scene.scale.height / 2
      )
      .setScale(transform.scale);

    if (this.visible) {
      this.transform = transform;
    }
  }

  resize() {
    if (this.destroyed) return;

    const { width, height } = this.scene.scale;

    this.resizeImage();
    this.resizeVideo();

    this.dim?.setSize(width, height);
    this.dim?.input?.hitArea?.setTo(
      0,
      0,
      width,
      height
    );

    this.missingText?.setPosition(
      width / 2,
      height / 2
    );

    this.notifyTransformChanged();
  }

  notifyTransformChanged() {
    this.onTransformChanged?.();
  }

  logStatus() {
    const element = this.video?.video;

    console.info('[NewsstandBackground] Video status:', {
      requested: this.requested,
      visible: this.visible,
      finished: this.finished,
      currentSrc: element?.currentSrc || element?.src || null,
      readyState: element?.readyState,
      networkState: element?.networkState,
      currentTime: element?.currentTime,
      duration: element?.duration,
      paused: element?.paused,
      ended: element?.ended,
      muted: element?.muted,
      videoWidth: element?.videoWidth,
      videoHeight: element?.videoHeight,
      frameReady: this.video?.frameReady,
      touchLocked: this.video?.touchLocked,
      mediaErrorCode: element?.error?.code,
      mediaErrorMessage: element?.error?.message
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    this.startTimer?.remove(false);
    this.checkTimer?.remove(false);

    this.scene.input.off(
      'pointerdown',
      this.retryFromPointer
    );

    this.video?.removeAllListeners();
    this.video?.stop();

    for (const object of [
      this.video,
      this.image,
      this.dim,
      this.missingText
    ]) {
      object?.destroy();
    }

    this.startTimer = null;
    this.checkTimer = null;
    this.video = null;
    this.image = null;
    this.dim = null;
    this.missingText = null;
    this.transform = null;
    this.onTransformChanged = null;
  }
}