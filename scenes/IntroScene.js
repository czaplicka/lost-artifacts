import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';


const FONT_PIXEL = '"PressStart2P"';
const FONT_TYPE = '"SpecialElite"';


const BEATS = [
  { at: 500, run: 'showLogo' },
  { at: 2800, run: 'flashcards' },
  { at: 5600, run: 'showTagline1' },
  { at: 7400, run: 'showTagline2' },
  { at: 9000, run: 'stampHiring' },
  { at: 10800, run: 'finish' }
];


export class IntroScene extends BaseScene {
  constructor() {
    super({ key: 'IntroScene' });


    this.finished = false;
    this.staticOn = true;


    this.noise = null;
    this.vignette = null;
    this.skipHint = null;
    this.taglineFrame = null;


    this.authMode = 'guest';
    this.playerId = null;
    this.playerEmail = null;
    this.displayName = 'Guest';
    this.isNewGame = true;


    this._introTimers = new Set();
    this._transitionInFlight = false;
    this._onFadeComplete = null;
    this._introRunToken = null;
  }


  init(data = {}) {
    this.authMode = data.authMode ?? 'guest';
    this.playerId = data.playerId ?? null;
    this.playerEmail = data.playerEmail ?? null;
    this.displayName = data.displayName ?? 'Guest';
    this.isNewGame = data.isNewGame ?? true;


    this._introRunToken = Symbol('intro-run');
  }


  preload() {
    if (this.textures.exists('intro')) {
      return;
    }


    const manifest = this.cache.json.get('assetManifest');
    const entry = manifest?.backgrounds?.find(asset => asset.key === 'intro');


    if (!entry?.url) {
      console.error('[IntroScene] Missing "intro" background in assetManifest.');
      return;
    }


    this.load.image('intro', entry.url);
  }


  create() {
    super.create();


    audioManager.init(this);


    EventBus.emit('hideHUD');


    this.finished = false;
    this.staticOn = true;
    this._transitionInFlight = false;


    this.noise = null;
    this.vignette = null;
    this.skipHint = null;
    this.taglineFrame = null;


    this._clearIntroTimers();
    this._removeFadeListener();


    this.cameras.main.resetFX();


    const { width, height } = this.scale;


    if (this.textures.exists('intro')) {
      const bg = this.add.image(width / 2, height / 2, 'intro')
        .setDisplaySize(width, height)
        .setDepth(-10);


      // Delikatny efekt oddechu tła
      this.createTrackedTween({
        targets: bg,
        scaleX: bg.scaleX * 1.03,
        scaleY: bg.scaleY * 1.03,
        duration: 10000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else {
      this.cameras.main.setBackgroundColor('#0b0907');
    }


    // Atmosferyczna winieta noir
    this.vignette = this.add.graphics().setDepth(-5);
    this.vignette.fillStyle(0x000000, 0.45);
    this.vignette.fillRect(0, 0, width, height);
    this.vignette.lineStyle(80, 0x000000, 0.85);
    this.vignette.strokeRect(0, 0, width, height);


    this.noise = this.add.graphics().setDepth(2);


    this.skipHint = this.add.text(
      width - 20,
      height - 16,
      'CLICK OR PRESS ANY KEY TO SKIP ►',
      {
        fontFamily: FONT_PIXEL,
        fontSize: '9px',
        color: '#d4af37'
      }
    ).setOrigin(1, 1).setDepth(10);


    this.createTrackedTween({
      targets: this.skipHint,
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1
    });


    for (const beat of BEATS) {
      this._delay(beat.at, () => {
        if (!this.finished && typeof this[beat.run] === 'function') {
          this[beat.run]();
        }
      });
    }


    this._delay(800, () => {
      this.staticOn = false;
      this.noise?.clear();
    });


    this.trackInputEvent(this.input, 'pointerdown', this.skip);


    if (this.input.keyboard) {
      this.trackInputEvent(this.input.keyboard, 'keydown', this.skip);
    }
  }


  _delay(delay, callback) {
    if (this._cleanupDone) return null;


    const token = this._introRunToken;
    let timer = null;


    timer = this.time.delayedCall(delay, () => {
      this._introTimers.delete(timer);
      if (this._cleanupDone || this._introRunToken !== token) return;
      callback();
    });


    this._introTimers.add(timer);
    return timer;
  }


  _clearIntroTimers() {
    for (const timer of this._introTimers) {
      timer.remove(false);
    }
    this._introTimers.clear();
  }


  _removeFadeListener() {
    if (!this._onFadeComplete) return;


    this.cameras.main.off(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      this._onFadeComplete
    );


    this._onFadeComplete = null;
  }


  update() {
    if (!this.staticOn || this.finished || !this.noise?.active || this._cleanupDone) {
      return;
    }


    this.noise.clear();
    for (let i = 0; i < 90; i += 1) {
      this.noise.fillStyle(0xfff8dc, Math.random() * 0.12);
      this.noise.fillRect(
        Math.random() * this.scale.width,
        Math.random() * this.scale.height,
        2,
        2
      );
    }
  }


  playSfx(key, config = {}) {
    if (!key || this._cleanupDone) {
      return null;
    }


    return audioManager.playSfx(key, config);
  }


  showLogo() {
    const fontSize = Math.min(46, Math.floor(this.scale.width * 0.085));


    const container = this.add.container(
      this.scale.width / 2,
      this.scale.height / 2 - 50
    ).setDepth(6).setScale(2.5).setAlpha(0);


    const titleShadow = this.add.text(3, 3, 'MARK AGENCY', {
      fontFamily: FONT_PIXEL,
      fontSize: `${fontSize}px`,
      color: '#1a0d00'
    }).setOrigin(0.5);


    const titleText = this.add.text(0, 0, 'MARK AGENCY', {
      fontFamily: FONT_PIXEL,
      fontSize: `${fontSize}px`,
      color: '#e6c687'
    }).setOrigin(0.5);


    const subTitle = this.add.text(0, fontSize * 0.65, '- THE LOST ARTIFACT -', {
      fontFamily: FONT_TYPE,
      fontSize: `${Math.floor(fontSize * 0.45)}px`,
      color: '#d4af37'
    }).setOrigin(0.5);


    container.add([titleShadow, titleText, subTitle]);


    this.createTrackedTween({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });


    this.cameras.main.shake(180, 0.012);
    this.playSfx('sfx_stamp');
  }


  flashcards() {
    const cards = [
      'CASE #101: Golden Idol',
      'CASE #102: Jade Mask',
      'CASE #103: Husband Disappeared'
    ];


    const interval = 850;
    const visibleFor = 720;


    cards.forEach((label, index) => {
      this._delay(index * interval, () => {
        if (this.finished) return;


        const card = this.add.container(
          this.scale.width / 2,
          this.scale.height / 2 + 50
        ).setDepth(7);


        const cardWidth = Math.min(440, this.scale.width - 40);
        const cardHeight = 64;


        const shadow = this.add.rectangle(4, 5, cardWidth, cardHeight, 0x000000, 0.5);
        const background = this.add.rectangle(0, 0, cardWidth, cardHeight, 0xf5ebd6)
          .setStrokeStyle(3, 0x2b1e17);


        const stamp = this.add.text(-cardWidth / 2 + 15, -18, 'EVIDENCE', {
          fontFamily: FONT_PIXEL,
          fontSize: '10px',
          color: '#8b0000'
        }).setAngle(-5).setAlpha(0.7);


        const text = this.add.text(0, 2, label, {
          fontFamily: FONT_TYPE,
          fontSize: '22px',
          color: '#1a100c'
        }).setOrigin(0.5);


        card.add([shadow, background, stamp, text]);


        card.setAngle(Phaser.Math.Between(-3, 3))
          .setScale(0.85)
          .setAlpha(0);


        this.cameras.main.flash(70, 255, 248, 220);
        this.playSfx('sfx_shutter', { overlap: true });


        this.createTrackedTween({
          targets: card,
          alpha: 1,
          scale: 1,
          duration: 160,
          ease: 'Back.easeOut'
        });


        this._delay(visibleFor, () => {
          if (!card.active || this.finished) return;


          this.createTrackedTween({
            targets: card,
            alpha: 0,
            y: card.y - 15,
            duration: 180,
            ease: 'Sine.easeIn',
            onComplete: () => {
              if (card.active) card.destroy();
            }
          });
        });
      });
    });
  }


  createTaglineFrame() {
    if (this.taglineFrame?.active) return;


    const { width, height } = this.scale;
    const frameWidth = Math.min(Math.max(540, width * 0.6), width - 40);
    const frameHeight = 100;


    const frame = this.add.container(width / 2, height / 2 + 165)
      .setDepth(5)
      .setAlpha(0);


    const shadow = this.add.rectangle(4, 5, frameWidth, frameHeight, 0x000000, 0.6);
    const background = this.add.rectangle(0, 0, frameWidth, frameHeight, 0x18130e, 0.85)
      .setStrokeStyle(2, 0xc9a85d, 0.9);


    const borderInner = this.add.rectangle(0, 0, frameWidth - 10, frameHeight - 10, 0x000000, 0)
      .setStrokeStyle(1, 0x8c6f3d, 0.5);


    frame.add([shadow, background, borderInner]);
    this.taglineFrame = frame;


    this.createTrackedTween({
      targets: frame,
      alpha: 1,
      duration: 300,
      ease: 'Sine.easeOut'
    });
  }


  typewrite(text, y) {
    if (!text || this.finished || this._cleanupDone) return;


    const fontSize = Math.min(26, Math.floor(this.scale.width * 0.055));


    const textObject = this.add.text(
      this.scale.width / 2,
      y,
      '',
      {
        fontFamily: FONT_TYPE,
        fontSize: `${fontSize}px`,
        color: '#f0e6d2',
        align: 'center',
        wordWrap: {
          width: this.scale.width - 60,
          useAdvancedWrap: true
        }
      }
    ).setOrigin(0.5).setDepth(6);


    let index = 0;


    const nextCharacter = () => {
      if (this.finished || this._cleanupDone || !textObject.active) return;


      index += 1;
      textObject.setText(text.slice(0, index));


      if (index < text.length) {
        this._delay(40, nextCharacter);
      }
    };


    this._delay(40, nextCharacter);
  }


  showTagline1() {
    this.createTaglineFrame();
    this.typewrite(
      '"We find what others lose."',
      this.scale.height / 2 + 145
    );
  }


  showTagline2() {
    this.typewrite(
      'Sometimes... before they even lose it.',
      this.scale.height / 2 + 185
    );
  }


  stampHiring() {
    const fontSize = Math.min(38, Math.floor(this.scale.width * 0.08));


    const text = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 - 100,
      'NOW HIRING!',
      {
        fontFamily: FONT_PIXEL,
        fontSize: `${fontSize}px`,
        color: '#b22222',
        backgroundColor: '#1a0d00',
        padding: { x: 12, y: 6 }
      }
    )
      .setOrigin(0.5)
      .setAngle(-10)
      .setScale(3.5)
      .setAlpha(0)
      .setDepth(8);


    this.createTrackedTween({
      targets: text,
      scale: 1,
      alpha: 0.95,
      duration: 200,
      ease: 'Quad.easeIn'
    });


    this.cameras.main.shake(220, 0.018);
    this.playSfx('sfx_stamp');
  }


  skip() {
    if (this._cleanupDone || this._transitionInFlight) return;


    if (this.finished) {
      void this.startCharacterCreation();
      return;
    }


    this.finish(true);
  }


  finish(instant = false) {
    if (this.finished || this._cleanupDone) return;


    this.finished = true;
    this.staticOn = false;


    this._clearIntroTimers();
    this.noise?.clear();


    if (this.skipHint?.active) {
      this.killTrackedTweensOf(this.skipHint);
      this.skipHint.setAlpha(1);
    }


    if (instant) {
      void this.startCharacterCreation();
      return;
    }


    this._onFadeComplete = () => {
      this._onFadeComplete = null;
      if (!this._cleanupDone) {
        void this.startCharacterCreation();
      }
    };


    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      this._onFadeComplete
    );


    this.cameras.main.fadeOut(400, 0, 0, 0);
  }


  async startCharacterCreation() {
    if (this._cleanupDone || this._transitionInFlight) return false;


    const token = this._introRunToken;
    this._transitionInFlight = true;


    const started = await this.goto('CharacterCreationScene', {
      authMode: this.authMode,
      playerId: this.playerId,
      playerEmail: this.playerEmail,
      displayName: this.displayName,
      isNewGame: this.isNewGame,
      fromIntro: true
    });


    if (this._introRunToken !== token || this._cleanupDone) {
      return started;
    }


    this._transitionInFlight = false;


    if (!started) {
      this.cameras.main.resetFX();
      this.skipHint
        ?.setText('UNABLE TO CONTINUE. CLICK OR PRESS A KEY TO RETRY.')
        .setAlpha(1);


      console.error('[IntroScene] Could not open CharacterCreationScene.');
    }


    return started;
  }


  cleanup() {
    if (this._cleanupDone) return;


    this.finished = true;
    this.staticOn = false;
    this._transitionInFlight = false;
    this._introRunToken = null;


    this._clearIntroTimers();
    this._removeFadeListener();


    this.noise = null;
    this.vignette = null;
    this.skipHint = null;
    this.taglineFrame = null;


    super.cleanup();
  }
}