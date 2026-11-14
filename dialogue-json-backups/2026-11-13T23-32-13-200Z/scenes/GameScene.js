import { gameState } from '../GameData.js';
import { getGameTimeManager, resetGameTimeManager } from '../managers/GameTimeManager.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';

const INTRO_TYPING_INTERVAL_MS = 80;
const INTRO_CHARACTERS_PER_TICK = 4;

export class GameScene extends BaseScene {
  constructor() {
    super({ key: 'GameScene' });
    this.handleResizeBound = this.handleResize.bind(this);
    this.boundCleanupScene = this.cleanupScene.bind(this);
  }

  init(data = {}) {
    this.entryData = { ...data };
  }

  preload() {
    const manifest = this.cache.json.get('assetManifest');
    if (!manifest) {
      console.error('[GameScene] assetManifest is missing.');
      return;
    }
    const assets = [
      ['backgrounds', 'background2', this.textures, 'image'],
      ['json', 'dialogue', this.cache.json, 'json'],
      ['videos', 'detectiveIntro', this.cache.video, 'video'],
      ['audio', 'detective-intro', this.cache.audio, 'audio']
    ];
    for (const [group, key, cache, loader] of assets) {
      const asset = manifest[group]?.find(entry => entry.key === key);
      if (cache.exists(key) || !asset?.url) continue;
      if (loader === 'video') this.load.video(key, asset.url, true);
      else this.load[loader](key, asset.url);
    }
  }

  create() {
    super.create();
    this._introDisposed = false;
    this._runToken = Symbol('game-intro-run');
    this._mediaToken = null;
    this._musicDucked = false;
    this._audioCompleteHandler = null;
    this._officeFadeHandler = null;
    this.currentAudio = null;
    this.currentVideo = null;
    this.typingEvent = null;
    this.backgroundImage = null;
    this.dialogueBox = null;
    this.dialogueText = null;
    this.sequenceFinished = false;
    this.isTransitioning = false;
    this.hasStartedOfficeScene = false;
    this.introProgress = { text: false, video: false, audio: false };
    this.cameras.main.resetFX();

    for (const event of [Phaser.Scenes.Events.SHUTDOWN, Phaser.Scenes.Events.DESTROY]) {
      this.events.off(event, this.boundCleanupScene);
      this.events.once(event, this.boundCleanupScene);
    }

    audioManager.init(this);
    if (!audioManager.isMusicPlaying('themeMusic')) {
      audioManager.playMusic('themeMusic', { loop: true });
    }

    // Do not launch/restore the gameplay menu during the cinematic.
    this.sleepPlayerHud();
    EventBus.emit('hideHUD');
    const newsHud = this.getSceneIfActive('NewsHud');
    newsHud?.events?.emit('setNewspaperVisible', false);
    newsHud?.events?.emit('setTvVisible', false);

    if (!gameState.currentMission || !gameState.currentThief) {
      console.error('[GameScene] Started without initialized gameState.');
      void this.goto('EnterScene');
      return;
    }

    resetGameTimeManager();
    this.timeManager = getGameTimeManager();
    EventBus.emit('advanceTime', 0, 0);
    this.createBackground();
    this.createDetectiveSection();

    const dialogue = this.cache.json.get('dialogue');
    this.fullIntroText = Array.isArray(dialogue?.gameIntro)
      ? dialogue.gameIntro.filter(line => typeof line === 'string').join('\n')
      : 'The case file is missing its introduction.\nEven the paperwork has gone rogue.';

    this.onIntroPointerDown = () => this.finishSequence({ skip: true });
    this.onIntroSpaceDown = event => {
      if (!event?.repeat) this.finishSequence({ skip: true });
    };
    this.bindIntroInputListeners();
    this.typeText();
    this.playVideo('detectiveIntro', 'detective-intro');
  }

  isIntroActive() {
    return !this._introDisposed && !this._cleanupDone &&
      !this.sequenceFinished && !this.isTransitioning;
  }

  createBackground() {
    if (this.textures.exists('background2')) {
      this.backgroundImage = this.add.image(0, 0, 'background2').setDepth(0);
    } else {
      this.cameras.main.setBackgroundColor('#000000');
    }
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResizeBound);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResizeBound);
    this.handleResize();
  }

  createDetectiveSection() {
    this.dialogueBox = this.add.graphics().setDepth(20);
    this.dialogueText = this.add.text(0, 0, '', {
      fontFamily: 'PressStart2P', color: '#ffffff', lineSpacing: 18, align: 'left'
    }).setDepth(21);
    this.handleResize();
  }

  handleResize() {
    if (this._introDisposed || this._cleanupDone) return;
    const { width, height } = this.scale;
    if (this.backgroundImage?.active) {
      this.backgroundImage.setPosition(width / 2, height / 2).setScale(Math.max(
        width / (this.backgroundImage.width || 1),
        height / (this.backgroundImage.height || 1)
      ));
    }
    if (this.dialogueBox?.active && this.dialogueText?.active) {
      const boxWidth = Math.max(160, Math.min(1580, width - Math.min(120, width * 0.08)));
      const boxHeight = Math.min(260, Math.max(210, height * 0.25));
      const x = (width - boxWidth) / 2;
      const y = height - boxHeight - 48;
      const padding = Math.min(42, boxWidth * 0.06);
      this.dialogueBox.clear().fillStyle(0x000000, 0.72);
      this.dialogueBox.fillRoundedRect(x, y, boxWidth, boxHeight, 20);
      this.dialogueBox.lineStyle(4, 0xffff00, 1);
      this.dialogueBox.strokeRoundedRect(x, y, boxWidth, boxHeight, 20);
      this.dialogueText.setPosition(x + padding, y + 14)
        .setFontSize(Math.max(14, Math.min(24, Math.round(width / 70))))
        .setWordWrapWidth(boxWidth - padding * 2, true);
    }
    if (this.currentVideo?.scene) this.resizeVideoCover(this.currentVideo);
  }

  bindIntroInputListeners() {
    this.removeIntroInputListeners();
    this.trackInputEvent(this.input, 'pointerdown', this.onIntroPointerDown);
    if (this.input.keyboard) {
      this.trackInputEvent(this.input.keyboard, 'keydown-SPACE', this.onIntroSpaceDown);
    }
  }

  removeIntroInputListeners() {
    if (this.onIntroPointerDown) {
      this.offTrackedInputEvent(this.input, 'pointerdown', this.onIntroPointerDown);
    }
    if (this.onIntroSpaceDown && this.input.keyboard) {
      this.offTrackedInputEvent(this.input.keyboard, 'keydown-SPACE', this.onIntroSpaceDown);
    }
  }

  typeText() {
    this.stopTyping();
    const characters = Array.from(this.fullIntroText);
    let index = 0;
    this.dialogueText.setText('');
    if (!characters.length) {
      this.markIntroPartComplete('text');
      return;
    }
    const token = this._runToken;
    this.typingEvent = this.time.addEvent({
      delay: INTRO_TYPING_INTERVAL_MS,
      loop: true,
      callback: () => {
        if (!this.isIntroActive() || this._runToken !== token) {
          this.stopTyping();
          return;
        }
        index = Math.min(index + INTRO_CHARACTERS_PER_TICK, characters.length);
        this.dialogueText.setText(characters.slice(0, index).join(''));
        if (index === characters.length) {
          this.stopTyping();
          this.markIntroPartComplete('text');
        }
      }
    });
  }

  stopTyping() {
    this.typingEvent?.remove(false);
    this.typingEvent = null;
  }

  markIntroPartComplete(part) {
    if (!this.isIntroActive()) return;
    this.introProgress[part] = true;
    if (Object.values(this.introProgress).every(Boolean)) this.finishSequence();
  }

  setMusicVolume(volume, duration) {
    const music = audioManager.activeMusic.get('themeMusic');
    if (music && !music.pendingRemove) audioManager.fadeSound(music, volume, duration);
  }

  restoreMusic(duration = 250) {
    if (!this._musicDucked) return;
    this._musicDucked = false;
    this.setMusicVolume(audioManager.getMusicVolume(), duration);
  }

  playVideo(videoKey, audioKey) {
    const token = Symbol('intro-media');
    this._mediaToken = token;
    const current = () => this.isIntroActive() && this._mediaToken === token;
    let videoDone = false;
    let audioDone = false;
    const finishVideo = () => {
      if (!current() || videoDone) return;
      videoDone = true;
      this.markIntroPartComplete('video');
    };
    const finishAudio = () => {
      if (!current() || audioDone) return;
      audioDone = true;
      this.restoreMusic();
      this.markIntroPartComplete('audio');
    };
    let video = null;
    if (this.cache.video.exists(videoKey)) {
      try {
        video = this.add.video(this.scale.width / 2, this.scale.height / 2, videoKey)
          .setOrigin(0.5).setDepth(5);
        video.setMute(true);
        this.currentVideo = video;
        const resize = () => { if (current()) this.resizeVideoCover(video); };
        video.once('textureready', resize);
        video.once('playing', resize);
        video.once('complete', finishVideo);
        const fail = (...details) => {
          if (!current() || videoDone) return;
          console.warn('[GameScene] Video playback failed:', ...details);
          video.setVisible(false);
          finishVideo();
        };
        video.once('error', fail);
        video.once('unsupported', fail);
      } catch (error) {
        console.warn('[GameScene] Video creation failed:', error);
        finishVideo();
      }
    } else {
      console.warn('[GameScene] Missing video:', videoKey);
      finishVideo();
    }

    if (this.cache.audio.exists(audioKey) && current()) {
      try {
        const sound = audioManager.playVoice(audioKey);
        if (sound && !sound.pendingRemove && sound.manager) {
          this.currentAudio = sound;
          this._audioCompleteHandler = finishAudio;
          sound.once('complete', finishAudio);
          sound.once('stop', finishAudio);
          this._musicDucked = true;
          this.setMusicVolume(audioManager.getMusicVolume() * 0.35, 250);
        } else finishAudio();
      } catch (error) {
        console.warn('[GameScene] Voice playback failed:', error);
        finishAudio();
      }
    } else finishAudio();

    if (video?.scene && current() && !videoDone) {
      try {
        video.play(false);
        this.resizeVideoCover(video);
      } catch (error) {
        console.warn('[GameScene] Video playback failed:', error);
        video.setVisible(false);
        finishVideo();
      }
    }
  }

  resizeVideoCover(video) {
    const { width, height } = this.scale;
    const w = video.video?.videoWidth || video.width || 1;
    const h = video.video?.videoHeight || video.height || 1;
    video.setPosition(width / 2, height / 2).setScale(Math.max(width / w, height / h));
  }

  destroyCurrentVideo() {
    this._mediaToken = null;
    const sound = this.currentAudio;
    const video = this.currentVideo;
    const callback = this._audioCompleteHandler;
    this.currentAudio = null;
    this.currentVideo = null;
    this._audioCompleteHandler = null;
    if (sound) {
      if (callback) {
        sound.off('complete', callback);
        sound.off('stop', callback);
      }
      audioManager.releaseSound(sound);
    }
    if (video?.scene) {
      video.removeAllListeners();
      video.stop();
      video.destroy();
    }
  }

  finishSequence({ skip = false } = {}) {
    if (!this.isIntroActive()) return;
    if (!skip && !Object.values(this.introProgress).every(Boolean)) return;
    this.sequenceFinished = true;
    this.stopTyping();
    this.removeIntroInputListeners();
    if (skip) this.destroyCurrentVideo();
    this.restoreMusic(180);
    this.goToOfficeScene();
  }

  goToOfficeScene() {
    if (this.hasStartedOfficeScene || this.isTransitioning || this._introDisposed || this._cleanupDone) return;
    this.hasStartedOfficeScene = true;
    this.isTransitioning = true;
    const token = this._runToken;
    this._officeFadeHandler = async () => {
      this._officeFadeHandler = null;
      if (this._runToken !== token || this._introDisposed || this._cleanupDone) return;
      let started = false;
      try {
        started = await this.goto('OfficeScene', {
          gameState, isNewGame: true, startOnboarding: true
        });
      } catch (error) {
        console.error('[GameScene] OfficeScene transition failed:', error);
      }
      if (started || this._runToken !== token || this._introDisposed || this._cleanupDone) return;
      this.hasStartedOfficeScene = false;
      this.isTransitioning = false;
      this.sequenceFinished = false;
      this.cameras.main.fadeIn(200, 0, 0, 0);
      this.dialogueText?.setText('Could not open the office. Click or press Space to retry.');
      this.bindIntroInputListeners();
    };
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, this._officeFadeHandler);
    this.cameras.main.fadeOut(350, 0, 0, 0);
  }

  cleanupScene() {
    if (this._introDisposed) return;
    this._introDisposed = true;
    this._runToken = null;
    this.sequenceFinished = true;
    this.removeIntroInputListeners();
    this.stopTyping();
    if (this._officeFadeHandler) {
      this.cameras.main.off(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, this._officeFadeHandler);
      this._officeFadeHandler = null;
    }
    this.destroyCurrentVideo();
    this.restoreMusic(0);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResizeBound);
    for (const event of [Phaser.Scenes.Events.SHUTDOWN, Phaser.Scenes.Events.DESTROY]) {
      this.events.off(event, this.boundCleanupScene);
    }
    this.timeManager = null;
    this.backgroundImage = null;
    this.dialogueBox = null;
    this.dialogueText = null;
  }
}