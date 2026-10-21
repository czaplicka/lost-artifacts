import { gameState } from '../GameData.js';
import { ensureHud } from '../hudHelpers.js';
import { getGameTimeManager } from '../managers/GameTimeManager.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';


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


    this._runToken = null;
    this._mediaToken = null;
    this._audioCompleteHandler = null;
    this._officeFadeHandler = null;
    this._musicDucked = false;


    this.onIntroPointerDown = null;
    this.onIntroSpaceDown = null;


    this.handleResizeBound =
      this.handleResize.bind(this);


    this.boundCleanupScene =
      this.cleanupScene.bind(this);
  }


  init(data = {}) {
    this.entryData = { ...data };
    this._runToken = Symbol('game-intro-run');
  }


  preload() {
    const manifest =
      this.cache.json.get('assetManifest');


    if (!manifest) {
      console.error(
        '[GameScene] assetManifest is missing.'
      );
      return;
    }


    const background = manifest.backgrounds?.find(
      entry => entry.key === 'background2'
    );


    if (
      !this.textures.exists('background2') &&
      background?.url
    ) {
      this.load.image(
        'background2',
        background.url
      );
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


    // Phaser 3.90: load.video(key, urls, noAudio).
    // Trzeci argument true = film bez ścieżki audio (głos gra osobno).
    if (
      !this.cache.video.exists('detectiveIntro') &&
      video?.url
    ) {
      this.load.video(
        'detectiveIntro',
        video.url,
        true
      );
    }


    const voice = manifest.audio?.find(
      entry => entry.key === 'detective-intro'
    );


    if (
      !this.cache.audio.exists('detective-intro') &&
      voice?.url
    ) {
      this.load.audio(
        'detective-intro',
        voice.url
      );
    }
  }


  create() {
    super.create();


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
      audioManager.playMusic(
        'themeMusic',
        { loop: true }
      );
    }


    EventBus.emit('hideHUD');


    const newsHud = this.getSceneIfActive('NewsHud');


    newsHud?.events?.emit(
      'setNewspaperVisible',
      false
    );


    newsHud?.events?.emit(
      'setTvVisible',
      false
    );


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


    // Jeden wspólny menedżer czasu (singleton), bez tworzenia kolejnych
    // instancji przy każdym uruchomieniu sceny.
    this.timeManager = getGameTimeManager();
    EventBus.emit('advanceTime', 0, 0);


    this.createBackground();
    this.createDetectiveSection();


    try {
      ensureHud(this);
    } catch (error) {
      console.error(
        '[GameScene] ensureHud failed:',
        error
      );
    }


    this.closeAllUIPanels();


    const dialogueData =
      this.cache.json.get('dialogue');


    if (!Array.isArray(dialogueData?.gameIntro)) {
      console.error(
        '[GameScene] Missing dialogue.gameIntro.'
      );


      this.fullIntroText =
        'The case file is missing its introduction.\n' +
        'Even the paperwork has gone rogue.';


      this.dialogueText.setText(
        this.fullIntroText
      );


      this.isIntroReady = true;


      this.createContinueHint();
      this.bindIntroInputListeners();
      return;
    }


    this.fullIntroText = dialogueData.gameIntro
      .filter(line => typeof line === 'string')
      .join('\n');


    this.startIntroSequence();
  }


  // ------------------------------------------------------------------
  // Layout
  // ------------------------------------------------------------------


  createBackground() {
    if (this.textures.exists('background2')) {
      this.backgroundImage = this.add.image(
        this.scale.width / 2,
        this.scale.height / 2,
        'background2'
      ).setDepth(0);


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
    this.dialogueBox = this.add.graphics()
      .setDepth(20);


    this.dialogueText = this.add.text(
      0,
      0,
      '',
      {
        fontFamily: 'PressStart2P',
        color: '#ffffff',
        lineSpacing: 18,
        align: 'left'
      }
    ).setDepth(21);


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


    this.dialogueBox.lineStyle(
      4,
      0xffff00,
      1
    );


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
      .setWordWrapWidth(
        boxWidth - 84,
        true
      );


    if (this.continueText?.active) {
      this.continueText.setPosition(
        width - 48,
        height - 30
      );
    }
  }


  createContinueHint() {
    if (
      this.continueText?.active ||
      this._cleanupDone
    ) {
      return;
    }


    const { width, height } = this.scale;


    this.continueText = this.add.text(
      width - 48,
      height - 30,
      'CLICK / SPACE',
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
    if (this._cleanupDone) {
      return;
    }


    this.resizeBackgroundImage();
    this._layoutDialogue();


    if (this.currentVideo?.scene) {
      this.resizeVideoCover(this.currentVideo);
    }
  }


  // ------------------------------------------------------------------
  // Text and input
  // ------------------------------------------------------------------


  startIntroSequence() {
    if (
      this._cleanupDone ||
      this.sequenceFinished ||
      this.isTransitioning
    ) {
      return;
    }


    this.sequenceStage = 'video1';
    this.removeContinueHint();


    // Pisanie ma własny cykl życia, niezależny od głosu.
    this.typeText(
      this.dialogueText,
      this.fullIntroText,
      80
    );


    this.bindIntroInputListeners();


    this.playVideo(
      'detectiveIntro',
      'detective-intro'
    );
  }


  bindIntroInputListeners() {
    this.removeIntroInputListeners();


    this.onIntroPointerDown = () => {
      this.handleIntroClick();
    };


    this.onIntroSpaceDown = () => {
      this.handleIntroClick();
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


  typeText(target, text, speed = 15) {
    if (
      !target?.active ||
      typeof text !== 'string' ||
      this._cleanupDone
    ) {
      return;
    }


    this.typingEvent?.remove(false);
    this.typingEvent = null;


    target.setText('');


    this.isTypingIntro = text.length > 0;
    this.isIntroReady = text.length === 0;


    if (!text.length) {
      this.createContinueHint();
      return;
    }


    let index = 0;


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


        index += 1;
        target.setText(text.slice(0, index));


        if (index >= text.length) {
          this.typingEvent = null;
          this.isTypingIntro = false;
          this.isIntroReady = true;


          this.createContinueHint();
        }
      }
    });
  }


  finishTypingInstantly() {
    if (
      this._cleanupDone ||
      this.sequenceFinished
    ) {
      return;
    }


    this.typingEvent?.remove(false);
    this.typingEvent = null;


    this.dialogueText?.setText(
      this.fullIntroText
    );


    this.isTypingIntro = false;
    this.isIntroReady = true;


    this.createContinueHint();
  }


  // ------------------------------------------------------------------
  // Music: fade owned by AudioManager
  // ------------------------------------------------------------------


  _setIntroMusicVolume(volume, duration) {
    const music =
      audioManager.activeMusic.get('themeMusic');


    if (!music || music.pendingRemove) {
      return;
    }


    audioManager.fadeSound(
      music,
      volume,
      duration
    );
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


  // ------------------------------------------------------------------
  // Video and voice
  // ------------------------------------------------------------------


  playVideo(videoKey, audioKey, onComplete = null) {
    if (this._cleanupDone) {
      return;
    }


    this.destroyCurrentVideo();


    const hasVideo =
      this.cache.video.exists(videoKey);


    const hasAudio =
      Boolean(audioKey) &&
      this.cache.audio.exists(audioKey);


    if (!hasVideo && !hasAudio) {
      console.warn(
        `[GameScene] Missing media: ${videoKey} / ${audioKey}`
      );


      onComplete?.();
      return;
    }


    const token = Symbol('intro-media');
    this._mediaToken = token;


    const isCurrent = () => (
      !this._cleanupDone &&
      !this.sequenceFinished &&
      this._mediaToken === token
    );


    let completionQueued = false;
    let voiceStarted = false;
    let video = null;


    const completeLater = () => {
      if (
        completionQueued ||
        !isCurrent()
      ) {
        return;
      }


      completionQueued = true;


      // Nie sprzątamy audio wewnątrz jego complete/stop.
      // AudioManager kończy najpierw własną obsługę zdarzenia.
      Promise.resolve().then(() => {
        if (!isCurrent()) {
          return;
        }


        this.destroyCurrentVideo();
        this.restoreMusic(250);


        // Nie zmieniamy isTypingIntro i nie usuwamy typingEvent.
        onComplete?.();
      });
    };


    if (hasVideo) {
      video = this.add.video(
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


      video.once('complete', () => {
        if (!voiceStarted) {
          completeLater();
        }
      });


      const handleVideoError = (...details) => {
        if (!isCurrent()) {
          return;
        }


        console.warn(
          `[GameScene] Could not play "${videoKey}".`,
          ...details
        );


        video.setVisible(false);


        if (!voiceStarted) {
          completeLater();
        }
      };


      video.once('error', handleVideoError);
      video.once('unsupported', handleVideoError);
    }


    if (hasAudio) {
      const sound =
        audioManager.playVoice(audioKey);


      if (
        sound &&
        !sound.pendingRemove &&
        sound.manager &&
        sound.isPlaying
      ) {
        this.currentAudio = sound;
        this._audioCompleteHandler = completeLater;


        voiceStarted = true;


        // Celowo nie słuchamy "destroy".
        sound.once('complete', completeLater);
        sound.once('stop', completeLater);


        this.duckMusic(0.35, 250);
      }
    }


    if (video && isCurrent()) {
      // Przy osobnym głosie film jest zapętlonym tłem.
      video.play(voiceStarted);
      this.resizeVideoCover(video);
    } else if (!voiceStarted) {
      completeLater();
    }
  }


  resizeVideoCover(video) {
    if (
      !video?.scene ||
      this._cleanupDone
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
    // Unieważniamy callbacki przed zatrzymaniem czegokolwiek.
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


      // Jedyny właściciel niszczenia dźwięku: AudioManager.
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


  // ------------------------------------------------------------------
  // Office transition
  // ------------------------------------------------------------------


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


    this.typingEvent?.remove(false);
    this.typingEvent = null;


    this.removeIntroInputListeners();
    this.removeContinueHint();
    this.destroyCurrentVideo();
    this.restoreMusic(180);


    this.goToOfficeScene();
  }


  closeAllUIPanels() {
    this.getPlayerHudScene()
      ?.closeAllUIPanels?.();
  }


  goToOfficeScene() {
    if (
      this.hasStartedOfficeScene ||
      this.isTransitioning ||
      this._cleanupDone
    ) {
      return;
    }


    const token = this._runToken;


    this.hasStartedOfficeScene = true;
    this.isTransitioning = true;


    this.closeAllUIPanels();
    this.destroyCurrentVideo();


    this._officeFadeHandler = async () => {
      this._officeFadeHandler = null;


      if (
        this._runToken !== token ||
        this._cleanupDone ||
        !this.sys.isActive()
      ) {
        return;
      }


      const started = await this.goto(
        'OfficeScene',
        {
          gameState,
          isNewGame: true,
          startOnboarding: true
        }
      );


      if (
        started ||
        this._runToken !== token ||
        this._cleanupDone
      ) {
        return;
      }


      this.hasStartedOfficeScene = false;
      this.isTransitioning = false;
      this.sequenceFinished = false;
      this.isTypingIntro = false;
      this.isIntroReady = true;


      this.cameras.main.fadeIn(
        200,
        0,
        0,
        0
      );


      this.createContinueHint();
      this.bindIntroInputListeners();
    };


    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      this._officeFadeHandler
    );


    this.cameras.main.fadeOut(
      350,
      0,
      0,
      0
    );
  }


  // ------------------------------------------------------------------
  // Cleanup
  // ------------------------------------------------------------------


  cleanupScene() {
    this._runToken = null;
    this.sequenceFinished = true;


    this.removeIntroInputListeners();
    this.removeContinueHint();


    this.typingEvent?.remove(false);
    this.typingEvent = null;


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


    // Singleton czasu zostaje przy życiu: należy do całej gry, nie do sceny.
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