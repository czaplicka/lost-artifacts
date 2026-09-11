import { gameState } from '../GameData.js';
import { ensureHud } from '../hudHelpers.js';
import { GameTimeManager } from '../GameTimeManager.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../AudioManager.js';
import { BaseScene } from './BaseScene.js';

export class GameScene extends BaseScene {
  constructor() {
    super({ key: 'GameScene' });

    this.timeManager = null;

    this.fullIntroText = '';
    this.dialogueText = null;
    this.continueText = null;

    this.backgroundImage = null;

    this.currentVideo = null;
    this.currentVideoKey = null;
    this.currentAudio = null;

    this.typingEvent = null;
    this._duckTween = null;

    this.hasStartedOfficeScene = false;
    this.sequenceStage = 'idle';
    this.sequenceFinished = false;
    this.isTypingIntro = false;
    this.isIntroReady = false;
    this.isTransitioning = false;

    this.handleResizeBound = this.handleResize.bind(this);
    this.onIntroPointerDown = null;
    this.onIntroSpaceDown = null;

    this.boundCleanupScene = this.cleanupScene.bind(this);
  }

  create() {
    super.create();

    this.fullIntroText = '';
    this.dialogueText = null;
    this.continueText = null;

    this.backgroundImage = null;

    this.currentVideo = null;
    this.currentVideoKey = null;
    this.currentAudio = null;

    this.typingEvent = null;
    this._duckTween = null;

    this.hasStartedOfficeScene = false;
    this.sequenceStage = 'idle';
    this.sequenceFinished = false;
    this.isTypingIntro = false;
    this.isIntroReady = false;
    this.isTransitioning = false;

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundCleanupScene
    );

    audioManager.init(this);

    if (!audioManager.isMusicPlaying('themeMusic')) {
      audioManager.playMusic('themeMusic', {
        loop: true
      });
    }

    EventBus.emit('hideHUD');

    const newsHud = this.getSceneIfActive('NewsHud');

    if (newsHud?.events) {
      newsHud.events.emit(
        'setNewspaperVisible',
        false
      );

      newsHud.events.emit(
        'setTvVisible',
        false
      );
    }

    this.timeManager = new GameTimeManager();

    EventBus.emit('advanceTime', 0, 0);

    if (!gameState.currentMission || !gameState.currentThief) {
      console.error(
        '[GameScene] Started without initialized gameState.'
      );

      void this.goto('EnterScene');

      return;
    }

    const dialogueData = this.cache.json.get('dialogue');

    this.createBackground();
    this.createDetectiveSection();

    try {
      ensureHud(this);
    } catch (error) {
      console.error('[GameScene] ensureHud failed:', error);
    }

    this.closeAllUIPanels();

    if (
      !dialogueData ||
      !Array.isArray(dialogueData.gameIntro)
    ) {
      console.error(
        '[GameScene] Missing dialogue.gameIntro in dialogue.json.'
      );

      this.dialogueText?.setText(
        'The case file is missing its introduction.\nEven the paperwork has gone rogue.'
      );

      this.isTypingIntro = false;
      this.isIntroReady = true;

      this.createContinueHint();
      this.bindIntroInputListeners();

      return;
    }

    this.fullIntroText = dialogueData.gameIntro.join('\n');

    this.startIntroSequence();
  }

  createBackground() {
    if (this.textures.exists('start_2')) {
      this.backgroundImage = this.add
        .image(
          this.scale.width / 2,
          this.scale.height / 2,
          'start_2'
        )
        .setDepth(0);

      this.resizeBackgroundImage();
    } else {
      console.warn(
        '[GameScene] Missing "start_2" texture. Using black background.'
      );

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

    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;

    const sourceWidth =
      this.backgroundImage.width ||
      this.backgroundImage.displayWidth ||
      1;

    const sourceHeight =
      this.backgroundImage.height ||
      this.backgroundImage.displayHeight ||
      1;

    const scale = Math.max(
      gameWidth / sourceWidth,
      gameHeight / sourceHeight
    );

    this.backgroundImage
      .setPosition(gameWidth / 2, gameHeight / 2)
      .setScale(scale);
  }

  createDetectiveSection() {
    const { width, height } = this.scale;

    const boxWidth = Math.min(1580, width - 120);
    const boxHeight = Math.min(260, Math.max(210, height * 0.25));
    const boxX = (width - boxWidth) / 2;
    const boxY = height - boxHeight - 48;

    const dialogueBox = this.add.graphics();

    dialogueBox.fillStyle(0x000000, 0.72);
    dialogueBox.fillRoundedRect(
      boxX,
      boxY,
      boxWidth,
      boxHeight,
      20
    );

    dialogueBox.lineStyle(4, 0xffff00, 1);
    dialogueBox.strokeRoundedRect(
      boxX,
      boxY,
      boxWidth,
      boxHeight,
      20
    );

    dialogueBox.setDepth(20);

this.dialogueText = this.add
  .text(boxX + 42, boxY + 14, '', {
    fontFamily: 'PressStart2P',
    fontSize: `${Math.max(20, Math.min(24, Math.round(width / 70)))}px`,
    color: '#ffffff',
    wordWrap: {
      width: boxWidth - 84,
      useAdvancedWrap: true
    },
    lineSpacing: 18,
    align: 'left'
  })
  .setDepth(21);
  }

  createContinueHint() {
  if (this.continueText?.active) {
    return;
  }

  const { width, height } = this.scale;

  const fontSize = Math.max(
    18,
    Math.min(22, Math.round(width / 70))
  );

  this.continueText = this.add
    .text(
      width - 48,
      height - 30,
      'CLICK / SPACE',
      {
        fontFamily: '"PressStart2P", monospace',
        fontSize: `${fontSize}px`,
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
    if (!this.continueText) {
      return;
    }

    this.killTrackedTweensOf(this.continueText);

    if (this.continueText.active) {
      this.continueText.destroy();
    }

    this.continueText = null;
  }

  startIntroSequence() {
    if (
      this._cleanupDone ||
      this.sequenceFinished ||
      this.isTransitioning
    ) {
      return;
    }

    this.sequenceStage = 'video1';
    this.sequenceFinished = false;
    this.isIntroReady = false;
    this.isTypingIntro = true;

    this.removeContinueHint();

    this.playVideo(
      'detectiveIntro',
      'detective-intro',
      () => {
        if (
          this._cleanupDone ||
          this.sequenceFinished
        ) {
          return;
        }

        this.isIntroReady = true;
        this.createContinueHint();
      }
    );

    this.typeText(
      this.dialogueText,
      this.fullIntroText,
      80
    );

    this.bindIntroInputListeners();
  }

  bindIntroInputListeners() {
    this.removeIntroInputListeners();

    this.onIntroPointerDown = () => {
      this.handleIntroClick();
    };

    this.onIntroSpaceDown = () => {
      this.handleIntroClick();
    };

    this.input.on(
      'pointerdown',
      this.onIntroPointerDown,
      this
    );

    this.input.keyboard?.on(
      'keydown-SPACE',
      this.onIntroSpaceDown,
      this
    );
  }

  removeIntroInputListeners() {
    if (this.onIntroPointerDown) {
      this.input.off(
        'pointerdown',
        this.onIntroPointerDown,
        this
      );

      this.onIntroPointerDown = null;
    }

    if (this.onIntroSpaceDown) {
      this.input.keyboard?.off(
        'keydown-SPACE',
        this.onIntroSpaceDown,
        this
      );

      this.onIntroSpaceDown = null;
    }
  }

  handleIntroClick() {
    if (
      this.sequenceFinished ||
      this.isTransitioning ||
      this._cleanupDone
    ) {
      return;
    }

    if (this.isTypingIntro) {
      this.finishTypingInstantly();
      return;
    }

    if (this.isIntroReady) {
      this.finishSequence();
    }
  }

  finishTypingInstantly() {
    if (
      this._cleanupDone ||
      this.sequenceFinished
    ) {
      return;
    }

    if (this.typingEvent) {
      this.typingEvent.remove(false);
      this.typingEvent = null;
    }

    this.dialogueText?.setText(this.fullIntroText);

    this.isTypingIntro = false;
    this.isIntroReady = true;

    this.createContinueHint();
  }

  finishSequence() {
    if (
      this.sequenceFinished ||
      this.isTransitioning ||
      this._cleanupDone
    ) {
      return;
    }

    this.sequenceFinished = true;
    this.sequenceStage = 'done';
    this.isTypingIntro = false;
    this.isIntroReady = false;

    if (this.typingEvent) {
      this.typingEvent.remove(false);
      this.typingEvent = null;
    }

    this.removeIntroInputListeners();
    this.removeContinueHint();
    this.destroyCurrentVideo();
    this.restoreMusic(180);

    this.goToOfficeScene();
  }

  duckMusic(volumeMultiplier = 0.35, duration = 250) {
    const music =
      audioManager.activeMusic?.get('themeMusic');

    if (!music || music.pendingRemove) {
      return;
    }

    const target =
      audioManager.getMusicVolume() * volumeMultiplier;

    if (this._duckTween) {
      this.removeTrackedTween(this._duckTween);
      this._duckTween = null;
    }

    this._duckTween = this.createTrackedTween({
      targets: music,
      volume: target,
      duration,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this._duckTween = null;
      }
    });
  }

  restoreMusic(duration = 250) {
    const music =
      audioManager.activeMusic?.get('themeMusic');

    if (!music || music.pendingRemove) {
      return;
    }

    if (this._duckTween) {
      this.removeTrackedTween(this._duckTween);
      this._duckTween = null;
    }

    this._duckTween = this.createTrackedTween({
      targets: music,
      volume: audioManager.getMusicVolume(),
      duration,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this._duckTween = null;
      }
    });
  }

  playVideo(videoKey, audioKey, onComplete) {
    if (this._cleanupDone) {
      return;
    }

    const hasVideo = this.cache.video.exists(videoKey);
    const hasAudio =
      Boolean(audioKey) &&
      this.cache.audio.exists(audioKey);

    if (!hasVideo && !hasAudio) {
      console.warn(
        `[GameScene] Missing video and audio: ${videoKey} / ${audioKey}`
      );

      onComplete?.();

      return;
    }

    this.destroyCurrentVideo();

    let hasCompleted = false;
    let audioFinished = !hasAudio;

    const tryComplete = () => {
      if (
        hasCompleted ||
        !audioFinished ||
        this._cleanupDone
      ) {
        return;
      }

      hasCompleted = true;

      this.destroyCurrentVideo();
      this.restoreMusic(250);

      onComplete?.();
    };

    if (hasAudio) {
      this.duckMusic(0.35, 250);

      this.currentAudio = audioManager.playVoice(audioKey);

      if (this.currentAudio) {
        this.currentAudio.once('complete', () => {
          audioFinished = true;
          tryComplete();
        });

        this.currentAudio.once('stop', () => {
          audioFinished = true;
          tryComplete();
        });
      } else {
        audioFinished = true;
        tryComplete();
      }
    }

    if (!hasVideo) {
      tryComplete();
      return;
    }

    const video = this.add
      .video(
        this.scale.width / 2,
        this.scale.height / 2,
        videoKey
      )
      .setOrigin(0.5)
      .setDepth(5)
      .setVisible(true)
      .setAlpha(1);

    this.currentVideo = video;
    this.currentVideoKey = videoKey;

    video.once('textureready', () => {
      if (
        this.currentVideo === video &&
        !this._cleanupDone
      ) {
        this.resizeVideoCover(video);
      }
    });

    video.once('playing', () => {
      if (
        this.currentVideo === video &&
        !this._cleanupDone
      ) {
        this.resizeVideoCover(video);
      }
    });

    video.once('complete', () => {
      if (this.currentVideo !== video) {
        return;
      }

      if (!hasAudio) {
        audioFinished = true;
        tryComplete();
      }
    });

    video.once('error', (videoObject, error) => {
      console.error(
        `[GameScene] ${videoKey} video error:`,
        error
      );

      if (this.currentVideo === video) {
        if (!hasAudio) {
          audioFinished = true;
          tryComplete();
        } else {
          video.setVisible(false);
        }
      }
    });

    video.once('unsupported', (videoObject, error) => {
      console.error(
        `[GameScene] ${videoKey} video unsupported:`,
        error
      );

      if (this.currentVideo === video) {
        if (!hasAudio) {
          audioFinished = true;
          tryComplete();
        } else {
          video.setVisible(false);
        }
      }
    });

    video.play(true);
  }

  resizeVideoCover(video) {
    if (
      !video ||
      !video.scene ||
      this._cleanupDone
    ) {
      return;
    }

    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;

    const videoWidth =
      video.video?.videoWidth ||
      video.width ||
      1;

    const videoHeight =
      video.video?.videoHeight ||
      video.height ||
      1;

    const scale = Math.max(
      gameWidth / videoWidth,
      gameHeight / videoHeight
    );

    video
      .setPosition(gameWidth / 2, gameHeight / 2)
      .setScale(scale);
  }

  destroyCurrentVideo() {
    if (this.currentAudio) {
      const sound = this.currentAudio;
      this.currentAudio = null;

      try {
        if (sound.isPlaying) {
          sound.stop();
        }

        if (!sound.pendingRemove) {
          sound.destroy();
        }
      } catch (error) {
        console.warn(
          '[GameScene] Could not clean up intro audio:',
          error
        );
      }
    }

    if (!this.currentVideo) {
      return;
    }

    const video = this.currentVideo;

    this.currentVideo = null;
    this.currentVideoKey = null;

    try {
      if (video.scene) {
        video.removeAllListeners?.();
        video.setVisible(false);
        video.setAlpha(0);
        video.stop?.();
        video.destroy();
      }
    } catch (error) {
      console.warn(
        '[GameScene] Could not clean up intro video:',
        error
      );
    }
  }

  typeText(target, text, speed = 15) {
    if (
      !target ||
      typeof text !== 'string' ||
      this._cleanupDone
    ) {
      return;
    }

    if (this.typingEvent) {
      this.typingEvent.remove(false);
      this.typingEvent = null;
    }

    target.setText('');

    if (!text.length) {
      this.isTypingIntro = false;
      this.isIntroReady = true;
      this.createContinueHint();

      return;
    }

    let index = 0;

    this.isTypingIntro = true;
    this.isIntroReady = false;

    this.typingEvent = this.time.addEvent({
      delay: speed,
      repeat: text.length - 1,
      callback: () => {
        if (
          this._cleanupDone ||
          this.sequenceFinished ||
          !target.active
        ) {
          this.typingEvent?.remove(false);
          this.typingEvent = null;

          return;
        }

        target.setText(text.slice(0, index + 1));

        index += 1;

        if (index >= text.length) {
          this.typingEvent = null;
          this.isTypingIntro = false;
          this.isIntroReady = true;

          this.createContinueHint();
        }
      }
    });
  }

  closeAllUIPanels() {
    const hud = this.getPlayerHudScene();

    hud?.closeAllUIPanels?.();
  }

  handleResize() {
    if (this._cleanupDone) {
      return;
    }

    this.resizeBackgroundImage();

    if (
      this.currentVideo &&
      this.currentVideo.scene
    ) {
      this.resizeVideoCover(this.currentVideo);
    }
  }

  goToOfficeScene() {
    if (
      this.hasStartedOfficeScene ||
      this.isTransitioning ||
      this._cleanupDone
    ) {
      return;
    }

    this.hasStartedOfficeScene = true;
    this.isTransitioning = true;

    this.closeAllUIPanels();
    this.destroyCurrentVideo();

    this.cameras.main.fadeOut(350, 0, 0, 0);

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        if (
          this._cleanupDone ||
          !this.sys.isActive()
        ) {
          return;
        }

        void this.goto('OfficeScene', {
          gameState,
          isNewGame: true,
          startOnboarding: true
        })
          .then((started) => {
            if (!started && !this._cleanupDone) {
              this.hasStartedOfficeScene = false;
              this.isTransitioning = false;
              this.sequenceFinished = false;
              this.isIntroReady = true;

              this.cameras.main.fadeIn(200, 0, 0, 0);
              this.createContinueHint();
              this.bindIntroInputListeners();
            }
          })
          .catch((error) => {
            if (!this._cleanupDone) {
              console.error(
                '[GameScene] Could not open OfficeScene:',
                error
              );

              this.hasStartedOfficeScene = false;
              this.isTransitioning = false;
              this.sequenceFinished = false;
              this.isIntroReady = true;

              this.cameras.main.fadeIn(200, 0, 0, 0);
              this.createContinueHint();
              this.bindIntroInputListeners();
            }
          });
      }
    );
  }

  cleanupScene() {
    this.removeIntroInputListeners();
    this.removeContinueHint();

    if (this.typingEvent) {
      this.typingEvent.remove(false);
      this.typingEvent = null;
    }

    if (this._duckTween) {
      this.removeTrackedTween(this._duckTween);
      this._duckTween = null;
    }

    this.destroyCurrentVideo();

    this.scale?.off(
      Phaser.Scale.Events.RESIZE,
      this.handleResizeBound
    );

    this.timeManager = null;
    this.backgroundImage = null;
    this.dialogueText = null;

    this.isTypingIntro = false;
    this.isIntroReady = false;
    this.isTransitioning = false;
  }

  addHoverEffect(button, baseScale = 0.8, hoverScale = 0.9) {
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