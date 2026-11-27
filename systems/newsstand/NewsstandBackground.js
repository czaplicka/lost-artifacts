import { NEWSSTAND_CONFIG } from '../../config/newsstandConfig.js';
import { newsstandPurchaseText as t } from '../../dialogues/NewsstandPurchaseText.js';

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
    this.repeatTimer = null;
    this.requested = false;
    this.visible = false;
    this.finished = false;
    this.destroyed = false;
    this.transform = null;
    this.retryFromPointer = this.retryFromPointer.bind(this);
    this.checkFrame = this.checkFrame.bind(this);
  }

  create() {
    const scene = this.scene;
    const {width,height} = scene.scale;
    const cfg = NEWSSTAND_CONFIG;
    if (scene.textures.exists(cfg.backgroundKey)) {
      this.image = scene.add.image(width/2,height/2,cfg.backgroundKey).setOrigin(0.5).setDepth(0);
    } else {
      this.image = scene.add.rectangle(width/2,height/2,width,height,0x211815,1).setDepth(0);
      this.missingText = scene.add.text(width/2,height/2,t('missingBackground')+'\n\n'+cfg.backgroundKey, {
        fontFamily:'SpecialElite', fontSize:'28px', color:'#f7e6b5', align:'center'
      }).setOrigin(0.5).setDepth(100);
      console.error('[NewsstandBackground] Missing texture:',cfg.backgroundKey);
    }
    this.video = scene.add.video(width/2,height/2).setOrigin(0.5).setDepth(0.5).setVisible(false);
    this.dim = scene.add.rectangle(0,0,width,height,0x000000,cfg.dimAlpha)
      .setOrigin(0,0).setDepth(1).setInteractive();
    this.bindVideoEvents();
    this.resize();
    scene.input.on('pointerdown',this.retryFromPointer);
    scene.events.on('update',this.checkFrame);
    try {
      this.video.loadURL(cfg.videoUrl,'loadeddata',true);
      this.video.setMute(true).setLoop(false);
      this.configureElement();
    } catch (error) { this.handleVideoError(error); }
    this.scheduleNextPlay();
  }

  scheduleNextPlay() {
    this.repeatTimer?.remove(false);
    this.repeatTimer = this.scene.time.delayedCall(NEWSSTAND_CONFIG.videoIntervalMs,()=>{
      this.repeatTimer = null;
      if (!this.destroyed && !this.finished && this.scene.sys.isActive()) this.startVideo();
    });
  }

  configureElement() {
    const element = this.video?.video;
    if (!element) return;
    element.muted = true;
    element.defaultMuted = true;
    element.loop = false;
    element.playsInline = true;
    element.setAttribute('playsinline','');
    element.setAttribute('webkit-playsinline','');
  }

  bindVideoEvents() {
    const events = Phaser.GameObjects.Events;
    const reveal = () => this.revealVideo();
    for (const name of new Set([
      events.VIDEO_PLAY || 'play', events.VIDEO_CREATED || 'created',
      events.VIDEO_TEXTURE || 'textureready', events.VIDEO_PLAYING || 'playing'
    ])) this.video.on(name,reveal);
    this.video.on(events.VIDEO_COMPLETE || 'complete',()=>this.onVideoComplete());
    this.video.on(events.VIDEO_LOCKED || 'locked',()=>{
      console.warn('[NewsstandBackground] Autoplay blocked; click to retry.');
    });
    for (const name of new Set([
      events.VIDEO_UNSUPPORTED || 'unsupported', events.VIDEO_ERROR || 'error'
    ])) this.video.on(name,error=>this.handleVideoError(error));
  }

  onVideoComplete() {
    if (this.destroyed || this.finished || !this.scene.sys.isActive()) return;
    this.requested = false;
    this.showImage(true);
    this.scheduleNextPlay();
  }

  handleVideoError(error) {
    if (this.destroyed) return;
    if (error?.name === 'NotAllowedError' || error?.name === 'AbortError') {
      this.showImage(false);
      return;
    }
    console.error('[NewsstandBackground] Video unavailable:',error);
    this.finished = true;
    this.showImage();
  }

  startVideo() {
    if (this.destroyed || !this.video?.scene || this.finished) return;
    this.requested = true;
    this.visible = false;
    try {
      this.configureElement();
      this.video.setMute(true).setLoop(false);
      this.resizeVideo();
      this.video.play(false);
      this.checkTimer?.remove(false);
      this.checkTimer = this.scene.time.delayedCall(NEWSSTAND_CONFIG.videoCheckDelayMs,()=>{
        this.checkTimer = null;
        if (!this.destroyed && !this.visible && !this.finished) this.logStatus();
      });
    } catch (error) { this.handleVideoError(error); }
  }

  checkFrame() {
    if (!this.visible && this.requested && !this.finished) this.revealVideo();
  }

  revealVideo() {
    if (this.destroyed || !this.scene.sys.isActive() || !this.requested ||
        this.finished || !this.video?.scene) return;
    const element = this.video.video;
    if (!element || element.readyState < 2 || !element.videoWidth || !element.videoHeight ||
        this.video.frameReady === false) return;
    this.visible = true;
    this.resizeVideo();
    this.video.setVisible(true);
    this.image?.setVisible(false);
    this.missingText?.setVisible(false);
    this.checkTimer?.remove(false);
    this.checkTimer = null;
    this.notifyTransformChanged();
  }

  retryFromPointer() {
    if (this.destroyed || !this.requested || this.visible || this.finished || !this.video?.scene) return;
    this.configureElement();
    try {
      this.video.setMute(true).setLoop(false).play(false);
      const element = this.video.video;
      if (element?.paused) {
        const result = element.play();
        result?.catch?.(error=>this.handleVideoError(error));
      }
    } catch (error) { this.handleVideoError(error); }
  }

  showImage(stop = true) {
    if (this.destroyed) return;
    this.checkTimer?.remove(false);
    this.checkTimer = null;
    this.visible = false;
    this.video?.setVisible(false);
    if (stop) this.video?.stop();
    this.image?.setVisible(true);
    this.resizeImage();
    this.notifyTransformChanged();
  }

  getCoverTransform(sourceWidth,sourceHeight,zoom) {
    const cfg = NEWSSTAND_CONFIG;
    const sw = Number(sourceWidth)>0 ? Number(sourceWidth) : cfg.designWidth;
    const sh = Number(sourceHeight)>0 ? Number(sourceHeight) : cfg.designHeight;
    const scale = Math.max(this.scene.scale.width/sw,this.scene.scale.height/sh)*zoom;
    const width = sw*scale, height = sh*scale;
    return {scale,width,height,x:(this.scene.scale.width-width)/2,y:(this.scene.scale.height-height)/2};
  }

  getTransform() {
    return this.transform || this.getCoverTransform(
      NEWSSTAND_CONFIG.designWidth,NEWSSTAND_CONFIG.designHeight,NEWSSTAND_CONFIG.imageZoom
    );
  }

  resizeImage() {
    if (!this.image?.scene) return;
    const {width,height} = this.scene.scale;
    if (!this.image.texture) {
      this.image.setPosition(width/2,height/2).setDisplaySize(width,height);
      if (!this.visible) this.transform = this.getCoverTransform(
        NEWSSTAND_CONFIG.designWidth,NEWSSTAND_CONFIG.designHeight,NEWSSTAND_CONFIG.imageZoom
      );
      return;
    }
    const transform = this.getCoverTransform(this.image.width,this.image.height,NEWSSTAND_CONFIG.imageZoom);
    this.image.setPosition(width/2,height/2).setScale(transform.scale);
    if (!this.visible) this.transform = transform;
  }

  resizeVideo() {
    if (!this.video?.scene) return;
    const width = this.video.video?.videoWidth || this.video.width;
    const height = this.video.video?.videoHeight || this.video.height;
    if (!width || !height) return;
    const transform = this.getCoverTransform(width,height,NEWSSTAND_CONFIG.videoZoom);
    this.video.setPosition(this.scene.scale.width/2,this.scene.scale.height/2).setScale(transform.scale);
    if (this.visible) this.transform = transform;
  }

  resize() {
    if (this.destroyed) return;
    const {width,height} = this.scene.scale;
    this.resizeImage();this.resizeVideo();
    this.dim?.setSize(width,height);
    this.dim?.input?.hitArea?.setTo(0,0,width,height);
    this.missingText?.setPosition(width/2,height/2);
    this.notifyTransformChanged();
  }

  notifyTransformChanged() { this.onTransformChanged?.(); }

  logStatus() {
    const element = this.video?.video;
    console.info('[NewsstandBackground] Video status:',{
      requested:this.requested,visible:this.visible,finished:this.finished,
      currentSrc:element?.currentSrc || element?.src || null,
      readyState:element?.readyState,currentTime:element?.currentTime,
      duration:element?.duration,paused:element?.paused,loop:element?.loop,
      frameReady:this.video?.frameReady,touchLocked:this.video?.touchLocked,
      mediaErrorCode:element?.error?.code
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.startTimer?.remove(false);this.checkTimer?.remove(false);this.repeatTimer?.remove(false);
    this.scene.input.off('pointerdown',this.retryFromPointer);
    this.scene.events.off('update',this.checkFrame);
    this.video?.removeAllListeners();this.video?.stop();
    for (const object of [this.video,this.image,this.dim,this.missingText]) object?.destroy();
    this.startTimer = null;this.checkTimer = null;this.repeatTimer = null;
    this.video = null;this.image = null;this.dim = null;this.missingText = null;
    this.transform = null;this.onTransformChanged = null;
  }
}