import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";

let movieTextureCounter = 0;
const SOURCE = 'scenes/tv/TvMoviePlayer.js';
const text = id => __dialogueText(SOURCE, id);

export class TvMoviePlayer {
  constructor(scene) {
    this.scene = scene;
    this.video = null;
    this.container = null;
    this.texture = null;
    this.image = null;
    this.message = null;
    this.canvas = null;
    this.context = null;
    this.textureKey = null;
    this.active = false;
    this.destroyed = false;
    this.blocked = false;
    this.failed = false;
    this.playPending = false;
    this.sceneSuspended = false;
    this.lastFrameTime = -1;
    this.onEnded = null;
    this.listeners = [];
    this.frameBox = null;

    this.handleSceneSuspend = () => {
      this.sceneSuspended = true;
      this.video?.pause();
    };
    this.handleSceneResume = () => {
      this.sceneSuspended = false;
      if (!this.scene?.isBroadcastPaused) this.tryPlay();
    };

    scene.events.on('update', this.update, this);
    scene.events.on('pause', this.handleSceneSuspend);
    scene.events.on('sleep', this.handleSceneSuspend);
    scene.events.on('resume', this.handleSceneResume);
    scene.events.on('wake', this.handleSceneResume);
  }

  start(url, onEnded) {
    this.stop();
    if (this.destroyed || !this.scene?.tvView?.ui?.screenInner) return;

    const scene = this.scene;
    const view = scene.tvView;
    const parent = view.ui.screenInner;
    const width = scene.layout.screenWidth;
    const height = scene.layout.screenHeight;
    if (!(width > 0 && height > 0)) return;

    this.active = true;
    this.onEnded = onEnded;
    this.sceneSuspended = false;
    this.textureKey = `tv-movie-frame-${++movieTextureCounter}`;

    // Fixed canvas dimensions throughout this playback.
    const renderScale = Math.min(1, 1280 / width, 960 / height);
    const canvasWidth = Math.max(1, Math.round(width * renderScale));
    const canvasHeight = Math.max(1, Math.round(height * renderScale));
    this.texture = scene.textures.createCanvas(
      this.textureKey, canvasWidth, canvasHeight
    );
    this.canvas = this.texture.getSourceImage();
    this.context = this.canvas.getContext('2d');
    this.context.fillStyle = '#000000';
    this.context.fillRect(0, 0, canvasWidth, canvasHeight);
    this.texture.refresh();

    this.container = scene.add.container(0, 0);
    const background = scene.add.rectangle(0, 0, width, height, 0x000000, 1);
    this.image = scene.add.image(0, 0, this.textureKey)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(width, height);
    this.message = scene.add.text(0, 0, text('t_48125d5c9120ebc2c3cc'), {
      fontFamily: 'SpecialElite',
      fontSize: `${Math.max(16, Math.round(width / 36))}px`,
      color: '#f8e7a7',
      align: 'center',
      wordWrap: { width: width * 0.8, useAdvancedWrap: true },
      backgroundColor: '#000000',
      padding: { x: 16, y: 12 }
    }).setOrigin(0.5);
    this.container.add([background, this.image, this.message]);

    const overlayIndex = parent.getIndex(view.ui.osdBg);
    if (overlayIndex >= 0) parent.addAt(this.container, overlayIndex);
    else parent.add(this.container);

    const video = document.createElement('video');
    this.video = video;
    video.preload = 'auto';
    video.playsInline = true;
    video.loop = false;
    video.controls = false;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    this.listen(video, 'loadedmetadata', () => {
      if (this.isCurrent(video)) this.fitFrame();
    });
    this.listen(video, 'playing', () => {
      if (!this.isCurrent(video)) return;
      this.blocked = false;
      this.message?.setVisible(false);
    });
    this.listen(video, 'ended', () => {
      if (!this.isCurrent(video)) return;
      const callback = this.onEnded;
      this.stop();
      callback?.();
    });
    this.listen(video, 'error', () => {
      if (!this.isCurrent(video)) return;
      this.failed = true;
      this.blocked = false;
      console.error('[TV Movie] Cannot play:', video.currentSrc || url, video.error);
      this.message?.setText(
        text('t_973fb3618be33738d8d5') + text('t_4f1efc6f89cd7890638a')
      ).setVisible(true);
    });

    let videoUrl = String(url || '');
    if (videoUrl.startsWith('/video/')) {
      videoUrl = `/assets${videoUrl}`;
    } else {
      try {
        const parsed = new URL(videoUrl, window.location.href);
        if (parsed.origin === window.location.origin && parsed.pathname.startsWith('/video/')) {
          parsed.pathname = `/assets${parsed.pathname}`;
          videoUrl = parsed.href;
        }
      } catch (_) {
        // Let the media element report an invalid URL.
      }
    }
    video.src = videoUrl;
    this.syncVolume();
    video.load();
    this.tryPlay();
  }

  listen(target, event, handler) {
    target.addEventListener(event, handler);
    this.listeners.push({ target, event, handler });
  }

  isCurrent(video) {
    return !this.destroyed && this.active && this.video === video;
  }

  fitFrame() {
    const video = this.video;
    if (!video?.videoWidth || !video.videoHeight || !this.canvas || !this.image) return;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const scale = Math.min(width / video.videoWidth, height / video.videoHeight);
    const drawWidth = video.videoWidth * scale;
    const drawHeight = video.videoHeight * scale;
    this.frameBox = {
      x: (width - drawWidth) / 2,
      y: (height - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight
    };
    this.lastFrameTime = -1;
  }

  syncVolume() {
    if (!this.video || !this.scene) return;
    const raw = this.scene.tvAudio?.getVolume?.() ?? 0.5;
    const volume = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0;
    this.video.volume = volume;
    this.video.muted = volume === 0;
  }

  tryPlay() {
    const video = this.video;
    if (!this.active || !video || this.failed || this.playPending ||
        this.sceneSuspended || this.scene?.isBroadcastPaused || this.scene?.isClosing) return;
    this.syncVolume();
    this.playPending = true;
    let result;
    try {
      result = video.play();
    } catch (error) {
      this.playPending = false;
      this.handlePlayError(video, error);
      return;
    }
    Promise.resolve(result).then(() => {
      if (!this.isCurrent(video)) return;
      this.playPending = false;
      this.blocked = false;
      if (this.sceneSuspended || this.scene?.isBroadcastPaused || this.scene?.isClosing) video.pause();
    }).catch(error => {
      if (!this.isCurrent(video)) return;
      this.playPending = false;
      this.handlePlayError(video, error);
    });
  }

  handlePlayError(video, error) {
    if (!this.isCurrent(video) || error?.name === 'AbortError') return;
    if (error?.name === 'NotAllowedError') {
      this.blocked = true;
      this.message?.setText(
        text('t_5ca310ca566db018e9f3') + text('t_1726e318e219fc86de0b')
      ).setVisible(true);
      return;
    }
    this.failed = true;
    console.error('[TV Movie] Playback failed:', error);
    this.message?.setText(
      text('t_2f7a992e116dabd4f219') + text('t_4f1efc6f89cd7890638a')
    ).setVisible(true);
  }

  setPaused(paused) {
    if (!this.video) return;
    if (paused) this.video.pause();
    else this.tryPlay();
  }

  update() {
    const video = this.video;
    if (!this.active || !video || !this.scene || this.destroyed) return;
    this.syncVolume();
    if (this.sceneSuspended || this.scene.isBroadcastPaused || this.scene.isClosing) {
      if (!video.paused) video.pause();
      return;
    }
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight ||
        video.currentTime === this.lastFrameTime) return;
    if (!this.frameBox) this.fitFrame();
    const box = this.frameBox;
    if (!box || !this.context) return;
    try {
      this.context.fillStyle = '#000000';
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.context.drawImage(video, box.x, box.y, box.width, box.height);
      this.texture.refresh();
      this.lastFrameTime = video.currentTime;
    } catch (error) {
      console.debug('[TV Movie] Frame not ready:', error);
    }
  }

  stop() {
    this.active = false;
    this.onEnded = null;
    this.blocked = false;
    this.failed = false;
    this.playPending = false;
    this.lastFrameTime = -1;
    this.frameBox = null;
    for (const { target, event, handler } of this.listeners) {
      target.removeEventListener(event, handler);
    }
    this.listeners = [];
    const video = this.video;
    this.video = null;
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    this.container?.destroy(true);
    this.container = null;
    this.image = null;
    this.message = null;
    if (this.textureKey && this.scene?.textures?.exists(this.textureKey)) {
      this.scene.textures.remove(this.textureKey);
    }
    this.textureKey = null;
    this.texture = null;
    this.canvas = null;
    this.context = null;
  }

  destroy() {
    if (this.destroyed) return;
    this.stop();
    this.destroyed = true;
    const events = this.scene?.events;
    events?.off('update', this.update, this);
    events?.off('pause', this.handleSceneSuspend);
    events?.off('sleep', this.handleSceneSuspend);
    events?.off('resume', this.handleSceneResume);
    events?.off('wake', this.handleSceneResume);
    this.scene = null;
  }
}