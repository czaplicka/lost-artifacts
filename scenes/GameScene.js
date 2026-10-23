import { gameState } from '../GameData.js';
import { ensureHud } from '../hudHelpers.js';
import {
  getGameTimeManager,
  resetGameTimeManager
} from '../managers/GameTimeManager.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';

const INTRO_TYPING_INTERVAL_MS = 80;
const INTRO_CHARACTERS_PER_TICK = 4;

export class GameScene extends BaseScene {
  constructor() {
    super({ key: 'GameScene' });

    this.timeManager = null;

    this.fullIntroText = '';
    this.dialogueText = null;
    this.dialogueBox = null;
    this.continueText = null;
    this.backgroundImage = null;

    this.currentVideo = null;
    this.currentVideoKey = null;
    this.currentAudio = null;
    this.typingEvent = null;

    this.hasStartedOfficeScene = false;
    this.sequenceStage = 'idle';
    this.sequenceFinished = false;
    this.isTypingIntro = false;
    this.isIntroReady = false;
    this.isTransitioning = false;

    this.introProgress = {
      text: false,
      video: false,
      audio: false
    };

    this._runToken = null;
    this._mediaToken = null;
    this._audioCompleteHandler = null;
    this._officeFadeHandler = null;
    this._musicDucked = false;
    this._introDisposed = true;

    this.onIntroPointerDown = null;
    this.onIntroSpaceDown = null;

    this.handleResizeBound = this.handleResize.bind(this);
    this.boundCleanupScene = this.cleanupScene.bind(this);
  }

  init(data = {}) {
    this.entryData = { ...data };
    this._runToken = Symbol('game-intro-run');
  }

  preload() {
    const manifest = this.cache.json.get('assetManifest');

    if (!manifest) {
      console.error('[GameScene] assetManifest is missing.');
      return;
    }

    const background = manifest.backgrounds?.find(
      entry => entry.key === 'background2'
    );

    if (
      !this.textures.exists('background2') &&
      background?.url
    ) {
      this.load.image('background2', background.url);
    }

    const dialogue = manifest.json?.find(
      entry => entry.key === 'dialogue'
    );

    if (
      !this.cache.json.exists('dialogue') &&
      dialogue?.url
    ) {
      this.load.json('dialogue', dialogue.url);
    }

    const video = manifest.videos?.find(
      entry => entry.key === 'detectiveIntro'
    );

    if (
      !this.cache.video.exists('detectiveIntro') &&
      video?.url
    ) {
      this.load.video('detectiveIntro', video.url, true);
    }

    const voice = manifest.audio?.find(
      entry => entry.key === 'detective-intro'
    );

    if (
      !this.cache.audio.exists('detective-intro') &&
      voice?.url
    ) {
      this.load.audio('detective-intro', voice.url);
    }
  }

  create() {
    super.create();

    this._introDisposed = false;
    this._runToken = Symbol('game-intro-run');

    this.fullIntroText = '';
    this.dialogueText = null;
    this.dialogueBox = null;
    this.continueText = null;
    this.backgroundImage = null;

    this.currentVideo = null;
    this.currentVideoKey = null;
    this.currentAudio = null;
    this.typingEvent = null;

    this.hasStartedOfficeScene = false;
    this.sequenceStage = 'idle';
    this.sequenceFinished = false;
    this.isTypingIntro = false;
    this.isIntroReady = false;
    this.isTransitioning = false;

    this.introProgress = {
      text: false,
      video: false,
      audio: false
    };

    this._mediaToken = null;
    this._audioCompleteHandler = null;
    this._officeFadeHandler = null;
    this._musicDucked = false;

    this.cameras.main.resetFX();

    this.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundCleanupScene
    );

    this.events.off(
      Phaser.Scenes.Events.DESTROY,
      this.boundCleanupScene
    );

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundCleanupScene
    );

    this.events.once(
      Phaser.Scenes.Events.DESTROY,
      this.boundCleanupScene
    );

    audioManager.init(this);

    if (!audioManager.isMusicPlaying('themeMusic')) {
      audioManager.playMusic('themeMusic', { loop: true });
    }

    EventBus.emit('hideHUD');

    const newsHud = this.getSceneIfActive('NewsHud');

    newsHud?.events?.emit('setNewspaperVisible', false);
    newsHud?.events?.emit('setTvVisible', false);

    if (
      !gameState.currentMission ||
      !gameState.currentThief
    ) {
      console.error(
        '[GameScene] Started without initialized gameState.'
      );

      void this.goto('EnterScene');
      return;
    }

    resetGameTimeManager();
    this.timeManager = getGameTimeManager();

    EventBus.emit('advanceTime', 0, 0);

    this.createBackground();
    this.createDetectiveSection();

    try {
      ensureHud(this);
    } catch (error) {
      console.error('[GameScene] ensureHud failed:', error);
    }

    this.closeAllUIPanels();

    const dialogueData = this.cache.json.get('dialogue');

    if (Array.isArray(dialogueData?.gameIntro)) {
      this.fullIntroText = dialogueData.gameIntro
        .filter(line => typeof line === 'string')
        .join('\n');
    } else {
      console.error('[GameScene] Missing dialogue.gameIntro.');

      this.fullIntroText =
        'The case file is missing its introduction.\n' +
        'Even the paperwork has gone rogue.';
    }

    this.startIntroSequence();
  }

  // Layout

  createBackground() {
    if (this.textures.exists('background2')) {
      this.backgroundImage = this.add
        .image(
          this.scale.width / 2,
          this.scale.height / 2,
          'background2'
        )
        .setDepth(0);

      this.resizeBackgroundImage();
    } else {
      this.cameras.main.setBackgroundColor('#000000');
    }

    this.scale.off(
      Phaser.Scale.Events.RESIZE,
      this.handleResizeBound
    );

    this.scale.on(
      Phaser.Scale.Events.RESIZE,
      this.handleResizeBound
    );
  }

  resizeBackgroundImage() {
    if (!this.backgroundImage?.active) {
      return;
    }

    const { width, height } = this.scale;

    this.backgroundImage
      .setPosition(width / 2, height / 2)
      .setScale(
        Math.max(
          width / (this.backgroundImage.width || 1),
          height / (this.backgroundImage.height || 1)
        )
      );
  }

  createDetectiveSection() {
    this.dialogueBox = this.add.graphics().setDepth(20);

    this.dialogueText = this.add
      .text(0, 0, '', {
        fontFamily: 'PressStart2P',
        color: '#ffffff',
        lineSpacing: 18,
        align: 'left'
      })
      .setDepth(21);

    this._layoutDialogue();
  }

  _layoutDialogue() {
    if (
      !this.dialogueBox?.active ||
      !this.dialogueText?.active
    ) {
      return;
    }

    const { width, height } = this.scale;

    const boxWidth = Math.min(1580, width - 120);
    const boxHeight = Math.min(
      260,
      Math.max(210, height * 0.25)
    );

    const boxX = (width - boxWidth) / 2;
    const boxY = height - boxHeight - 48;

    this.dialogueBox.clear();
    this.dialogueBox.fillStyle(0x000000, 0.72);

    this.dialogueBox.fillRoundedRect(
      boxX,
      boxY,
      boxWidth,
      boxHeight,
      20
    );

    this.dialogueBox.lineStyle(4, 0xffff00, 1);

    this.dialogueBox.strokeRoundedRect(
      boxX,
      boxY,
      boxWidth,
      boxHeight,
      20
    );

    this.dialogueText
      .setPosition(boxX + 42, boxY + 14)
      .setFontSize(
        Math.max(
          20,
          Math.min(24, Math.round(width / 70))
        )
      )
      .setWordWrapWidth(boxWidth - 84, true);

    if (this.continueText?.active) {
      this.continueText.setPosition(
        width - 48,
        height - 30
      );
    }
  }

  createContinueHint(label = 'CLICK / SPACE: SKIP') {
    if (
      this._cleanupDone ||
      this._introDisposed ||
      this.sequenceFinished
    ) {
      return;
    }

    if (this.continueText?.active) {
      this.continueText.setText(label);
      return;
    }

    const { width, height } = this.scale;

    this.continueText = this.add
      .text(
        width - 48,
        height - 30,
        label,
        {
          fontFamily: '"PressStart2P", monospace',
          fontSize: `${
            Math.max(
              18,
              Math.min(22, Math.round(width / 70))
            )
          }px`,
          color: '#ffe066'
        }
      )
      .setOrigin(1, 1)
      .setDepth(22)
      .setAlpha(0.85);

    this.createTrackedTween({
      targets: this.continueText,
      alpha: 0.25,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  removeContinueHint() {
    const hint = this.continueText;
    this.continueText = null;

    if (!hint) {
      return;
    }

    this.killTrackedTweensOf(hint);

    if (hint.active) {
      hint.destroy();
    }
  }

  handleResize() {
    if (this._cleanupDone || this._introDisposed) {
      return;
    }

    this.resizeBackgroundImage();
    this._layoutDialogue();

    if (this.currentVideo?.scene) {
      this.resizeVideoCover(this.currentVideo);
    }
  }

  // Sequence

  startIntroSequence() {
    if (
      this._cleanupDone ||
      this._introDisposed ||
      this.sequenceFinished ||
      this.isTransitioning
    ) {
      return;
    }

    this.sequenceStage = 'intro';

    this.introProgress = {
      text: false,
      video: false,
      audio: false
    };

    this.removeContinueHint();
    this.bindIntroInputListeners();

    this.typeText(
      this.dialogueText,
      this.fullIntroText,
      INTRO_TYPING_INTERVAL_MS,
      INTRO_CHARACTERS_PER_TICK
    );

    this.playVideo(
      'detectiveIntro',
      'detective-intro'
    );

    this.checkIntroCompletion();
  }

  markIntroPartComplete(part) {
    if (
      this._cleanupDone ||
      this._introDisposed ||
      this.sequenceFinished ||
      this.isTransitioning ||
      !Object.prototype.hasOwnProperty.call(
        this.introProgress,
        part
      )
    ) {
      return;
    }

    this.introProgress[part] = true;
    this.checkIntroCompletion();
  }

  checkIntroCompletion() {
    if (
      this._cleanupDone ||
      this._introDisposed ||
      this.sequenceFinished ||
      this.isTransitioning
    ) {
      return;
    }

    const { text, video, audio } = this.introProgress;

    if (text && video && audio) {
      this.finishSequence();
    }
  }

  // Text and input

  bindIntroInputListeners() {
    this.removeIntroInputListeners();

    this.onIntroPointerDown = () => {
      this.handleIntroClick();
    };

    this.onIntroSpaceDown = event => {
      if (!event?.repeat) {
        this.handleIntroClick();
      }
    };

    this.trackInputEvent(
      this.input,
      'pointerdown',
      this.onIntroPointerDown
    );

    if (this.input.keyboard) {
      this.trackInputEvent(
        this.input.keyboard,
        'keydown-SPACE',
        this.onIntroSpaceDown
      );
    }
  }

  removeIntroInputListeners() {
    if (this.onIntroPointerDown) {
      this.offTrackedInputEvent(
        this.input,
        'pointerdown',
        this.onIntroPointerDown
      );

      this.onIntroPointerDown = null;
    }

    if (this.onIntroSpaceDown) {
      if (this.input.keyboard) {
        this.offTrackedInputEvent(
          this.input.keyboard,
          'keydown-SPACE',
          this.onIntroSpaceDown
        );
      }

      this.onIntroSpaceDown = null;
    }
  }

  handleIntroClick() {
    if (
      this.sequenceFinished ||
      this.isTransitioning ||
      this._cleanupDone ||
      this._introDisposed
    ) {
      return;
    }

    // Pierwsze kliknięcie podczas pisania pokazuje cały tekst.
    if (this.isTypingIntro) {
      this.finishTypingInstantly();
      return;
    }

    // Następne kliknięcie pomija pozostały film i głos.
    if (this.isIntroReady) {
      this.finishSequence({ skip: true });
    }
  }

  stopTyping() {
    this.typingEvent?.remove(false);
    this.typingEvent = null;
  }

  completeIntroText() {
    if (
      this._cleanupDone ||
      this._introDisposed ||
      this.sequenceFinished
    ) {
      return;
    }

    this.stopTyping();

    this.isTypingIntro = false;
    this.isIntroReady = true;

    this.createContinueHint('CLICK / SPACE: SKIP');
    this.markIntroPartComplete('text');
  }

  typeText(
    target,
    text,
    interval = INTRO_TYPING_INTERVAL_MS,
    charactersPerTick = INTRO_CHARACTERS_PER_TICK
  ) {
    if (
      !target?.active ||
      typeof text !== 'string' ||
      this._cleanupDone ||
      this._introDisposed
    ) {
      return;
    }

    this.stopTyping();
    this.removeContinueHint();

    target.setText('');

    this.introProgress.text = false;
    this.isTypingIntro = text.length > 0;
    this.isIntroReady = false;

    if (!text.length) {
      this.completeIntroText();
      return;
    }

    this.createContinueHint('CLICK / SPACE: SHOW TEXT');

    const token = this._runToken;
    const characters = Array.from(text);

    const batchSize = Math.max(
      1,
      Math.floor(Number(charactersPerTick) || 1)
    );

    const delay = Math.max(
      1,
      Number(interval) || INTRO_TYPING_INTERVAL_MS
    );

    let index = 0;
    let visibleText = '';

    this.typingEvent = this.time.addEvent({
      delay,
      loop: true,

      callback: () => {
        if (
          this._runToken !== token ||
          this._cleanupDone ||
          this._introDisposed ||
          this.sequenceFinished ||
          !target.active
        ) {
          this.stopTyping();
          return;
        }

        const nextIndex = Math.min(
          index + batchSize,
          characters.length
        );

        visibleText += characters
          .slice(index, nextIndex)
          .join('');

        index = nextIndex;

        target.setText(visibleText);

        if (index >= characters.length) {
          this.completeIntroText();
        }
      }
    });
  }

  finishTypingInstantly() {
    if (
      this._cleanupDone ||
      this._introDisposed ||
      this.sequenceFinished
    ) {
      return;
    }

    this.dialogueText?.setText(this.fullIntroText);
    this.completeIntroText();
  }

  // Music

  _setIntroMusicVolume(volume, duration) {
    const music = audioManager.activeMusic.get('themeMusic');

    if (!music || music.pendingRemove) {
      return;
    }

    audioManager.fadeSound(music, volume, duration);
  }

  duckMusic(multiplier = 0.35, duration = 250) {
    this._musicDucked = true;

    this._setIntroMusicVolume(
      audioManager.getMusicVolume() * multiplier,
      duration
    );
  }

  restoreMusic(duration = 250) {
    if (!this._musicDucked) {
      return;
    }

    this._musicDucked = false;

    this._setIntroMusicVolume(
      audioManager.getMusicVolume(),
      duration
    );
  }

  // Video and voice

  playVideo(videoKey, audioKey) {
    if (this._cleanupDone || this._introDisposed) {
      return;
    }

    this.destroyCurrentVideo();

    const hasVideo = this.cache.video.exists(videoKey);

    const hasAudio =
      Boolean(audioKey) &&
      this.cache.audio.exists(audioKey);

    this.introProgress.video = false;
    this.introProgress.audio = false;

    const token = Symbol('intro-media');
    this._mediaToken = token;

    const isCurrent = () => (
      !this._cleanupDone &&
      !this._introDisposed &&
      !this.sequenceFinished &&
      this._mediaToken === token
    );

    let videoDone = false;
    let audioDone = false;

    const finishVideo = () => {
      if (!isCurrent() || videoDone) {
        return;
      }

      videoDone = true;
      this.markIntroPartComplete('video');
    };

    const finishAudio = () => {
      if (!isCurrent() || audioDone) {
        return;
      }

      audioDone = true;
      this.restoreMusic(250);
      this.markIntroPartComplete('audio');
    };

    if (!hasVideo) {
      console.warn(
        `[GameScene] Missing video: ${videoKey}`
      );

      finishVideo();
    }

    if (!hasAudio) {
      console.warn(
        `[GameScene] Missing audio: ${audioKey}`
      );

      finishAudio();
    }

    if (!isCurrent()) {
      return;
    }

    let video = null;

    if (hasVideo) {
      try {
        video = this.add
          .video(
            this.scale.width / 2,
            this.scale.height / 2,
            videoKey
          )
          .setOrigin(0.5)
          .setDepth(5)
          .setVisible(true)
          .setAlpha(1);

        video.setMute(true);

        this.currentVideo = video;
        this.currentVideoKey = videoKey;

        const resize = () => {
          if (
            isCurrent() &&
            this.currentVideo === video
          ) {
            this.resizeVideoCover(video);
          }
        };

        video.once('textureready', resize);
        video.once('playing', resize);
        video.once('complete', finishVideo);

        const handleVideoError = (...details) => {
          if (!isCurrent() || videoDone) {
            return;
          }

          console.warn(
            `[GameScene] Could not play "${videoKey}".`,
            ...details
          );

          if (video?.scene) {
            video.setVisible(false);
          }

          finishVideo();
        };

        video.once('error', handleVideoError);
        video.once('unsupported', handleVideoError);
      } catch (error) {
        console.warn(
          `[GameScene] Could not create "${videoKey}".`,
          error
        );

        finishVideo();
      }
    }

    if (hasAudio && isCurrent()) {
      try {
        const sound = audioManager.playVoice(audioKey);

        if (
          sound &&
          !sound.pendingRemove &&
          sound.manager
        ) {
          this.currentAudio = sound;
          this._audioCompleteHandler = finishAudio;

          sound.once('complete', finishAudio);
          sound.once('stop', finishAudio);

          this.duckMusic(0.35, 250);
        } else {
          console.warn(
            `[GameScene] Could not start voice "${audioKey}".`
          );

          finishAudio();
        }
      } catch (error) {
        console.warn(
          `[GameScene] Voice playback failed: "${audioKey}".`,
          error
        );

        finishAudio();
      }
    }

    if (video?.scene && isCurrent() && !videoDone) {
      try {
        // Bez zapętlania: czekamy na rzeczywisty koniec filmu.
        video.play(false);
        this.resizeVideoCover(video);
      } catch (error) {
        console.warn(
          `[GameScene] Video playback failed: "${videoKey}".`,
          error
        );

        video.setVisible(false);
        finishVideo();
      }
    }

    this.checkIntroCompletion();
  }

  resizeVideoCover(video) {
    if (
      !video?.scene ||
      this._cleanupDone ||
      this._introDisposed
    ) {
      return;
    }

    const { width, height } = this.scale;

    const videoWidth =
      video.video?.videoWidth ||
      video.width ||
      1;

    const videoHeight =
      video.video?.videoHeight ||
      video.height ||
      1;

    video
      .setPosition(width / 2, height / 2)
      .setScale(
        Math.max(
          width / videoWidth,
          height / videoHeight
        )
      );
  }

  destroyCurrentVideo() {
    this._mediaToken = null;

    const sound = this.currentAudio;
    const video = this.currentVideo;
    const callback = this._audioCompleteHandler;

    this.currentAudio = null;
    this.currentVideo = null;
    this.currentVideoKey = null;
    this._audioCompleteHandler = null;

    if (sound) {
      if (callback) {
        sound.off('complete', callback);
        sound.off('stop', callback);
      }

      audioManager.releaseSound(sound);
    }

    if (video?.scene) {
      try {
        video.removeAllListeners();
        video.stop();
        video.destroy();
      } catch (error) {
        console.warn(
          '[GameScene] Intro video cleanup failed:',
          error
        );
      }
    }
  }

  // Office transition

  finishSequence({ skip = false } = {}) {
    if (
      this.sequenceFinished ||
      this.isTransitioning ||
      this._cleanupDone ||
      this._introDisposed
    ) {
      return;
    }

    const { text, video, audio } = this.introProgress;

    // Automatycznie czekamy na całość.
    // Ręczne pominięcie nie musi czekać na film i głos.
    if (!skip && (!text || !video || !audio)) {
      return;
    }

    this.sequenceFinished = true;
    this.sequenceStage = 'done';
    this.isTypingIntro = false;
    this.isIntroReady = false;

    this.stopTyping();
    this.removeIntroInputListeners();
    this.removeContinueHint();

    // Przy ręcznym pominięciu od razu zatrzymujemy media.
    if (skip) {
      this.destroyCurrentVideo();
    }

    this.restoreMusic(180);
    this.goToOfficeScene();
  }

  closeAllUIPanels() {
    this.getPlayerHudScene()?.closeAllUIPanels?.();
  }

  goToOfficeScene() {
    if (
      this.hasStartedOfficeScene ||
      this.isTransitioning ||
      this._cleanupDone ||
      this._introDisposed
    ) {
      return;
    }

    const token = this._runToken;

    this.hasStartedOfficeScene = true;
    this.isTransitioning = true;

    this.closeAllUIPanels();

    this._officeFadeHandler = async () => {
      this._officeFadeHandler = null;

      if (
        this._runToken !== token ||
        this._cleanupDone ||
        this._introDisposed ||
        !this.sys.isActive()
      ) {
        return;
      }

      let started = false;

      try {
        started = await this.goto(
          'OfficeScene',
          {
            gameState,
            isNewGame: true,
            startOnboarding: true
          }
        );
      } catch (error) {
        console.error(
          '[GameScene] OfficeScene transition failed:',
          error
        );
      }

      if (
        started ||
        this._runToken !== token ||
        this._cleanupDone ||
        this._introDisposed
      ) {
        return;
      }

      this.hasStartedOfficeScene = false;
      this.isTransitioning = false;
      this.sequenceFinished = false;
      this.sequenceStage = 'ready';
      this.isTypingIntro = false;
      this.isIntroReady = true;

      this.cameras.main.fadeIn(200, 0, 0, 0);

      this.createContinueHint('CLICK / SPACE: RETRY');
      this.bindIntroInputListeners();
    };

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      this._officeFadeHandler
    );

    this.cameras.main.fadeOut(350, 0, 0, 0);
  }

  // Cleanup

  cleanupScene() {
    if (this._introDisposed) {
      return;
    }

    this._introDisposed = true;
    this._runToken = null;
    this.sequenceFinished = true;

    this.removeIntroInputListeners();
    this.removeContinueHint();
    this.stopTyping();

    if (this._officeFadeHandler) {
      this.cameras.main.off(
        Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
        this._officeFadeHandler
      );

      this._officeFadeHandler = null;
    }

    this.destroyCurrentVideo();
    this.restoreMusic(0);

    this.scale.off(
      Phaser.Scale.Events.RESIZE,
      this.handleResizeBound
    );

    this.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundCleanupScene
    );

    this.events.off(
      Phaser.Scenes.Events.DESTROY,
      this.boundCleanupScene
    );

    // Singleton czasu należy do całej gry.
    this.timeManager = null;

    this.backgroundImage = null;
    this.dialogueBox = null;
    this.dialogueText = null;

    this.isTypingIntro = false;
    this.isIntroReady = false;
    this.isTransitioning = false;
  }

  addHoverEffect(
    button,
    baseScale = 0.8,
    hoverScale = 0.9
  ) {
    button.setScale(baseScale);

    button.on('pointerover', () => {
      if (!this.isTransitioning) {
        button.setScale(hoverScale);
      }
    });

    button.on('pointerout', () => {
      button.setScale(baseScale);
    });
  }
}