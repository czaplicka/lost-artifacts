import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';


const FONT_PIXEL = '"PressStart2P"';
const FONT_TYPE = '"SpecialElite"';

const GOLD = 0xd4af37;
const GOLD_DARK = 0x8c6f3d;
const INK = 0x2b1e17;


const BEATS = [
  { at: 500, run: 'showLogo' },
  { at: 2800, run: 'flashcards' },
  { at: 5600, run: 'showTagline1' },
  { at: 7400, run: 'showTagline2' },
  { at: 9000, run: 'stampHiring' },
  { at: 10800, run: 'finish' }
];

const CASE_CARDS = [
  { label: 'CASE #101: Golden Idol', stamp: 'STOLEN' },
  { label: 'CASE #102: Jade Mask', stamp: 'STOLEN' },
  { label: 'CASE #103: Husband Disappeared', stamp: 'MISSING' }
];


export class IntroScene extends BaseScene {
  constructor() {
    super({ key: 'IntroScene' });


    this.finished = false;
    this.staticOn = true;
    this.grainTick = 0;


    this.noise = null;
    this.vignette = null;
    this.skipHint = null;
    this.taglineFrame = null;
    this.layout = null;


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
    this.grainTick = 0;
    this._transitionInFlight = false;


    this.noise = null;
    this.vignette = null;
    this.skipHint = null;
    this.taglineFrame = null;


    this._clearIntroTimers();
    this._removeFadeListener();


    this.cameras.main.resetFX();


    const { width, height } = this.scale;


    // Vertical layout: logo (top), case files / hiring stamp (middle), tagline frame (bottom).
    this.layout = {
      logoY: Math.round(height * 0.30),
      cardsY: Math.round(height * 0.52),
      stampY: Math.round(height * 0.52),
      frameY: Math.round(height * 0.78),
      barH: Math.round(height * 0.075)
    };


    this.ensureFxTextures();


    if (this.textures.exists('intro')) {
      const bg = this.add.image(width / 2, height / 2, 'intro')
        .setDisplaySize(width, height)
        .setDepth(-10);


      // Slow "Ken Burns" push-in.
      this.createTrackedTween({
        targets: bg,
        scaleX: bg.scaleX * 1.05,
        scaleY: bg.scaleY * 1.05,
        duration: 14000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else {
      this.cameras.main.setBackgroundColor('#0b0907');
    }


    // Noir darkening + soft radial vignette (replaces the old hard-edged frame).
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.32)
      .setDepth(-6);


    this.vignette = this.add.image(width / 2, height / 2, 'fxVignette')
      .setDisplaySize(width, height)
      .setDepth(-5);


    this.createDust();
    this.createLetterbox();


    this.noise = this.add.graphics().setDepth(2);


    this.skipHint = this.add.text(
      width - 20,
      height - this.layout.barH / 2,
      'CLICK OR PRESS ANY KEY TO SKIP ►',
      {
        fontFamily: FONT_PIXEL,
        fontSize: '9px',
        color: '#d4af37'
      }
    ).setOrigin(1, 0.5).setDepth(11);


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


  // Radial-gradient textures generated at runtime. Same keys/params as in BootScene.
  ensureFxTextures() {
    if (!this.textures.exists('fxGlow')) {
      const tex = this.textures.createCanvas('fxGlow', 256, 256);
      const ctx = tex.getContext();
      const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);


      g.addColorStop(0, 'rgba(255, 214, 120, 0.9)');
      g.addColorStop(0.35, 'rgba(212, 175, 55, 0.35)');
      g.addColorStop(1, 'rgba(212, 175, 55, 0)');


      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      tex.refresh();
    }


    if (!this.textures.exists('fxVignette')) {
      const tex = this.textures.createCanvas('fxVignette', 256, 256);
      const ctx = tex.getContext();
      const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);


      g.addColorStop(0, 'rgba(0, 0, 0, 0)');
      g.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0.85)');


      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      tex.refresh();
    }
  }


  // Cinematic black bars that slide in at the top and bottom.
  createLetterbox() {
    const { width, height } = this.scale;
    const { barH } = this.layout;


    const top = this.add.rectangle(width / 2, 0, width, barH, 0x000000)
      .setOrigin(0.5, 0)
      .setDepth(9)
      .setScale(1, 0);


    const bottom = this.add.rectangle(width / 2, height, width, barH, 0x000000)
      .setOrigin(0.5, 1)
      .setDepth(9)
      .setScale(1, 0);


    this.createTrackedTween({
      targets: [top, bottom],
      scaleY: 1,
      duration: 900,
      ease: 'Cubic.easeOut'
    });
  }


  // Slow floating dust motes caught in the projector light.
  createDust() {
    const { width, height } = this.scale;


    for (let i = 0; i < 28; i += 1) {
      const size = Phaser.Math.Between(1, 3);
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(Math.round(height * 0.1), height);


      const mote = this.add.rectangle(x, y, size, size, 0xfff1c9, 0).setDepth(3);


      this.createTrackedTween({
        targets: mote,
        y: y - Phaser.Math.Between(60, 160),
        x: x + Phaser.Math.Between(-40, 40),
        alpha: Phaser.Math.FloatBetween(0.15, 0.4),
        duration: Phaser.Math.Between(3500, 7000),
        delay: Phaser.Math.Between(0, 4000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
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
    if (this.finished || !this.noise?.active || this._cleanupDone) {
      return;
    }


    const { width, height } = this.scale;


    if (this.staticOn) {
      // Strong projector static during the first 800 ms.
      this.noise.clear();
      for (let i = 0; i < 90; i += 1) {
        this.noise.fillStyle(0xfff8dc, Math.random() * 0.12);
        this.noise.fillRect(Math.random() * width, Math.random() * height, 2, 2);
      }
      return;
    }


    // Afterwards: very light film grain (every 3rd frame).
    this.grainTick = (this.grainTick + 1) % 3;
    if (this.grainTick !== 0) return;


    this.noise.clear();
    for (let i = 0; i < 40; i += 1) {
      this.noise.fillStyle(0xfff8dc, Math.random() * 0.05);
      this.noise.fillRect(Math.random() * width, Math.random() * height, 1, 1);
    }
  }


  playSfx(key, config = {}) {
    if (!key || this._cleanupDone) {
      return null;
    }


    return audioManager.playSfx(key, config);
  }


  showLogo() {
    const { width } = this.scale;
    const { logoY } = this.layout;
    const fontSize = Math.min(46, Math.floor(width * 0.085));


    const container = this.add.container(width / 2, logoY)
      .setDepth(6)
      .setScale(2.5)
      .setAlpha(0);


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


    const titleWidth = titleText.width;


    // Warm glow behind the title.
    const glow = this.add.image(0, fontSize * 0.6, 'fxGlow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(titleWidth * 1.7, fontSize * 5)
      .setAlpha(0.45);


    // Divider with a diamond in the middle.
    const dividerY = fontSize * 0.78;
    const divider = this.add.graphics({ x: 0, y: dividerY });
    divider.lineStyle(2, GOLD, 0.9);
    divider.lineBetween(-titleWidth * 0.46, 0, -14, 0);
    divider.lineBetween(14, 0, titleWidth * 0.46, 0);
    divider.fillStyle(GOLD, 1);
    divider.fillPoints([
      { x: 0, y: -6 },
      { x: 6, y: 0 },
      { x: 0, y: 6 },
      { x: -6, y: 0 }
    ], true);


    const subTitle = this.add.text(0, fontSize * 1.2, '- THE LOST ARTIFACT -', {
      fontFamily: FONT_TYPE,
      fontSize: `${Math.floor(fontSize * 0.45)}px`,
      color: '#d4af37'
    }).setOrigin(0.5);


    const licensed = this.add.text(0, fontSize * 1.72, 'Licensed. Mostly.', {
      fontFamily: FONT_TYPE,
      fontSize: `${Math.max(11, Math.floor(fontSize * 0.28))}px`,
      color: '#8c7a55'
    }).setOrigin(0.5);


    container.add([glow, titleShadow, titleText, divider, subTitle, licensed]);


    this.createTrackedTween({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });


    // Glow breathes after the slam.
    this.createTrackedTween({
      targets: glow,
      alpha: 0.25,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });


    // Shockwave ring on impact.
    const ring = this.add.graphics({ x: width / 2, y: logoY + fontSize * 0.3 }).setDepth(5);
    ring.lineStyle(3, GOLD, 0.7);
    ring.strokeCircle(0, 0, 100);
    ring.setScale(0.3);


    this.createTrackedTween({
      targets: ring,
      scale: 2.6,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (ring.active) ring.destroy();
      }
    });


    this.cameras.main.shake(180, 0.012);
    this.playSfx('sfx_stamp');
  }


  flashcards() {
    const interval = 850;
    const visibleFor = 720;


    CASE_CARDS.forEach((entry, index) => {
      this._delay(index * interval, () => {
        if (this.finished) return;


        const { width } = this.scale;
        const { cardsY } = this.layout;


        const [rawNumber, rawTitle] = entry.label.split(': ');
        const caseNumber = (rawNumber || 'CASE').toUpperCase();
        const caseTitle = rawTitle || entry.label;


        const cardWidth = Math.min(440, width - 40);
        const cardHeight = 118;


        const card = this.add.container(width / 2 + 80, cardsY).setDepth(7);


        const shadow = this.add.rectangle(5, 6, cardWidth, cardHeight, 0x000000, 0.5);


        // Manila folder tab.
        const tab = this.add.rectangle(-cardWidth / 2 + 66, -cardHeight / 2 - 11, 132, 22, 0xd2b97a)
          .setStrokeStyle(3, INK);


        const tabText = this.add.text(-cardWidth / 2 + 66, -cardHeight / 2 - 11, caseNumber, {
          fontFamily: FONT_PIXEL,
          fontSize: '9px',
          color: '#2b1e17'
        }).setOrigin(0.5);


        const body = this.add.rectangle(0, 0, cardWidth, cardHeight, 0xe9d6a4)
          .setStrokeStyle(3, INK);


        // Faint ruled lines at the bottom of the folder.
        const lines = this.add.graphics();
        lines.lineStyle(1, INK, 0.14);
        for (let i = 0; i < 3; i += 1) {
          const y = cardHeight / 2 - 30 + i * 11;
          lines.lineBetween(-cardWidth / 2 + 18, y, cardWidth / 2 - 18, y);
        }


        const title = this.add.text(0, -12, caseTitle, {
          fontFamily: FONT_TYPE,
          fontSize: '26px',
          color: '#1a100c',
          align: 'center'
        }).setOrigin(0.5);


        if (title.width > cardWidth - 40) {
          title.setScale((cardWidth - 40) / title.width);
        }


        // Paperclip.
        const clip = this.add.graphics();
        clip.lineStyle(3, 0x8a8a8a, 1);
        clip.strokeRoundedRect(cardWidth / 2 - 48, -cardHeight / 2 - 9, 13, 36, 5);


        // Red ink stamp.
        const stampText = this.add.text(0, 0, entry.stamp, {
          fontFamily: FONT_PIXEL,
          fontSize: '12px',
          color: '#a31414'
        }).setOrigin(0.5);


        const stampBox = this.add.rectangle(0, 0, stampText.width + 18, stampText.height + 14, 0x000000, 0)
          .setStrokeStyle(3, 0xa31414);


        const stamp = this.add.container(cardWidth / 2 - 84, cardHeight / 2 - 28, [stampBox, stampText])
          .setAngle(-12)
          .setScale(2.2)
          .setAlpha(0);


        card.add([shadow, tab, tabText, body, lines, title, clip, stamp]);


        card.setAngle(Phaser.Math.Between(-3, 3))
          .setScale(0.85)
          .setAlpha(0);


        this.cameras.main.flash(70, 255, 248, 220);
        this.playSfx('sfx_shutter', { overlap: true });


        this.createTrackedTween({
          targets: card,
          alpha: 1,
          scale: 1,
          x: width / 2,
          duration: 180,
          ease: 'Back.easeOut'
        });


        this.createTrackedTween({
          targets: stamp,
          alpha: 0.88,
          scale: 1,
          duration: 140,
          delay: 170,
          ease: 'Quad.easeIn'
        });


        this._delay(visibleFor, () => {
          if (!card.active || this.finished) return;


          this.createTrackedTween({
            targets: card,
            alpha: 0,
            x: card.x - 60,
            duration: 200,
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


    const { width } = this.scale;
    const { frameY } = this.layout;
    const frameWidth = Math.min(Math.max(540, width * 0.6), width - 40);
    const frameHeight = 100;


    const frame = this.add.container(width / 2, frameY)
      .setDepth(5)
      .setAlpha(0);


    const shadow = this.add.rectangle(4, 5, frameWidth, frameHeight, 0x000000, 0.6);
    const background = this.add.rectangle(0, 0, frameWidth, frameHeight, 0x18130e, 0.85)
      .setStrokeStyle(2, 0xc9a85d, 0.9);


    const borderInner = this.add.rectangle(0, 0, frameWidth - 10, frameHeight - 10, 0x000000, 0)
      .setStrokeStyle(1, GOLD_DARK, 0.5);


    // Gold corner brackets.
    const corners = this.add.graphics();
    corners.lineStyle(3, GOLD, 1);


    const hx = frameWidth / 2 - 6;
    const hy = frameHeight / 2 - 6;
    const arm = 16;


    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        corners.lineBetween(sx * hx, sy * hy, sx * (hx - arm), sy * hy);
        corners.lineBetween(sx * hx, sy * hy, sx * hx, sy * (hy - arm));
      }
    }


    frame.add([shadow, background, borderInner, corners]);
    this.taglineFrame = frame;
    this.taglineWidth = frameWidth;


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
          width: (this.taglineWidth || this.scale.width) - 40,
          useAdvancedWrap: true
        }
      }
    ).setOrigin(0.5).setDepth(6);


    let index = 0;


    const nextCharacter = () => {
      if (this.finished || this._cleanupDone || !textObject.active) return;


      index += 1;


      const done = index >= text.length;
      textObject.setText(text.slice(0, index) + (done ? '' : '_'));


      if (!done) {
        this._delay(40, nextCharacter);
      }
    };


    this._delay(40, nextCharacter);
  }


  showTagline1() {
    this.createTaglineFrame();
    this.typewrite(
      '"We find what others lose."',
      this.layout.frameY - 20
    );
  }


  showTagline2() {
    this.typewrite(
      'Sometimes... before they even lose it.',
      this.layout.frameY + 20
    );
  }


  stampHiring() {
    const { width } = this.scale;
    const { stampY } = this.layout;
    const fontSize = Math.min(36, Math.floor(width * 0.075));


    const text = this.add.text(0, -8, 'NOW HIRING!', {
      fontFamily: FONT_PIXEL,
      fontSize: `${fontSize}px`,
      color: '#c8281e'
    }).setOrigin(0.5);


    const sub = this.add.text(0, fontSize * 0.95, 'Apply within. Bring your own magnifying glass.', {
      fontFamily: FONT_TYPE,
      fontSize: `${Math.max(13, Math.floor(fontSize * 0.45))}px`,
      color: '#e6c687'
    }).setOrigin(0.5);


    const boxWidth = Math.max(text.width, sub.width) + 44;
    const boxHeight = fontSize * 2.7;
    const boxY = fontSize * 0.38;


    const outer = this.add.rectangle(0, boxY, boxWidth, boxHeight, 0x1a0d00, 0.78)
      .setStrokeStyle(4, 0xc8281e);


    const inner = this.add.rectangle(0, boxY, boxWidth - 12, boxHeight - 12, 0x000000, 0)
      .setStrokeStyle(1.5, 0xc8281e, 0.6);


    const fit = Math.min(1, (width - 30) / boxWidth);


    const stamp = this.add.container(width / 2, stampY, [outer, inner, text, sub])
      .setDepth(8)
      .setAngle(-8)
      .setScale(3.5)
      .setAlpha(0);


    this.createTrackedTween({
      targets: stamp,
      scale: fit,
      alpha: 0.97,
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
    this.layout = null;


    super.cleanup();
  }
}