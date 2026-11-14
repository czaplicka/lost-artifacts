import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import {
  loadGameState
} from '../gameStatePersistence.js';

import {
  MobileFullscreen
} from '../mobileFullscreen.js';

import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';

import {
  loadSplitManifest
} from '../managers/ManifestLoader.js';

const FONT_LOAD_TIMEOUT_MS = 3000;
const STARTUP_FONTS = ['PressStart2P', 'SpecialElite'];

const FONT_PIXEL = __dialogueText("scenes/BootScene.js", "t_0336425eb481eb5cd669");
const FONT_TYPE = __dialogueText("scenes/BootScene.js", "t_edfb958930e8bcd8562c");

// Studio card timing (ms)
const STUDIO_HOLD_MS = 1000;        // pause after the last element appears
const STUDIO_FADE_OUT_MS = 650;
const STUDIO_SKIP_FADE_MS = 220;
const STUDIO_SKIP_LOCK_MS = 350;    // ignore accidental clicks right after the card appears

// Studio card design space (the whole card is scaled to fit the screen)
const CARD_W = 520;
const CARD_H = 310;
const EMBLEM_Y = -112;
const GOLD = 0xd4af37;
const GOLD_DARK = 0x8c6f3d;

const STUDIO_JOKES = [
  __dialogueText("scenes/BootScene.js", "t_5a74433c8cd6e65fd1bf"),
  __dialogueText("scenes/BootScene.js", "t_1fda969a76f99ba7fa95"),
  __dialogueText("scenes/BootScene.js", "t_b575ee21237212c2bded"),
  __dialogueText("scenes/BootScene.js", "t_b2cc9e11c173ae4ec5e7")
];

export class BootScene extends BaseScene {
  constructor() {
    super({ key: 'BootScene' });

    this.fontTimeout = null;
    this.fontLoadAttempted = false;
    this.isProceedingToPreloader = false;
    this.fontLoadToken = null;
    this.manifestAbort = null;
    this.bootToken = null;
    this.bootErrorText = null;

    this.studioRoot = null;
    this.studioCard = null;
    this.studioVignette = null;
    this.studioGrain = null;
    this.studioTagline = null;
    this.studioTween = null;
    this.studioShine = null;
    this.studioTimers = new Set();
    this.studioTargets = new Set();
    this.studioStarted = false;
    this.studioSkipped = false;
    this.studioShownAt = 0;
    this.studioSkipHandler = null;
    this.lastGrain = 0;

    this.boundCleanupScene =
      this.cleanupScene.bind(this);

    this.boundStudioResize =
      this.resizeStudioCard.bind(this);
  }

  preload() {
    this.cameras.main.setBackgroundColor('#000000');

    this.load.audio(
      'themeMusic',
      './assets/audio/theme.mp3'
    );

    this.load.image(
      'cozyBackground',
      'assets/local/kitchen.webp'
    );

    this.cache.json.remove('assetManifestIndex');

    this.load.json(
      'assetManifestIndex',
      'assets/manifests/index.json'
    );
  }

  async create() {
    super.create();

    this._clearFontTimeout();
    this.clearStudioCard();

    this.fontLoadAttempted = false;
    this.isProceedingToPreloader = false;
    this.fontLoadToken = null;
    this.bootErrorText = null;
    this.studioStarted = false;
    this.studioSkipped = false;

    this.cameras.main.setBackgroundColor('#000000');

    this.manifestAbort?.abort();
    this.manifestAbort = new AbortController();

    const token = Symbol('boot-run');
    this.bootToken = token;

    this.events.off(
      'shutdown',
      this.boundCleanupScene
    );

    this.events.off(
      'destroy',
      this.boundCleanupScene
    );

    this.events.once(
      'shutdown',
      this.boundCleanupScene
    );

    this.events.once(
      'destroy',
      this.boundCleanupScene
    );

    EventBus.emit('hideHUD');

    try {
      const index = this.cache.json.get(
        'assetManifestIndex'
      );

      if (!index) {
        throw new Error(
          'Missing assets/manifests/index.json. ' +
          'Run node tools/split-manifest.cjs.'
        );
      }

      const manifest = await loadSplitManifest(
        index,
        this.manifestAbort.signal
      );

      if (
        this.bootToken !== token ||
        this._cleanupDone
      ) {
        return;
      }

      this.cache.json.remove('assetManifest');
      this.cache.json.add(
        'assetManifest',
        manifest
      );

      if (this.game.assets) {
        this.game.assets._catalog = null;
      }

      this.manifestAbort = null;

      this._initializeGameState();
      this._initializeMobileFullscreen();
      this._initializeDifficulty();
      this._loadLocalFonts();
    } catch (error) {
      if (
        this.bootToken !== token ||
        this._cleanupDone ||
        error.name === 'AbortError'
      ) {
        return;
      }

      this.manifestAbort?.abort();
      this.manifestAbort = null;

      console.error(
        '[BootScene] Manifest initialization failed:',
        error
      );

      this.cameras.main.setBackgroundColor(
        '#101010'
      );

      this.bootErrorText = this.add.text(
        this.scale.width / 2,
        this.scale.height / 2,
        `${__dialogueText("scenes/BootScene.js", "t_017320f072d1a1955ffd")}${error.message}${__dialogueText("scenes/BootScene.js", "t_75a11da44c802486bc6f")}` +
        __dialogueText("scenes/BootScene.js", "t_6b07f0a3cd8ab013aa0a"),
        {
          fontFamily: 'monospace',
          fontSize: '20px',
          color: '#ffb4a2',
          align: 'center',
          wordWrap: {
            width: Math.max(
              200,
              this.scale.width - 80
            )
          }
        }
      ).setOrigin(0.5);
    }
  }

  update(time) {
    // Film grain for the studio card (~24 fps, independent of the render rate).
    if (
      !this.studioGrain?.active ||
      this._cleanupDone ||
      time - this.lastGrain < 42
    ) {
      return;
    }

    this.lastGrain = time;

    const { width, height } = this.scale;
    const grain = this.studioGrain;

    grain.clear();

    for (let i = 0; i < 110; i += 1) {
      grain.fillStyle(0xfff8dc, Math.random() * 0.1);
      grain.fillRect(
        Math.random() * width,
        Math.random() * height,
        Math.random() < 0.7 ? 1 : 2,
        Math.random() < 0.7 ? 1 : 2
      );
    }

    // Occasional film scratch.
    if (Math.random() < 0.06) {
      grain.fillStyle(0xfff8dc, 0.07);
      grain.fillRect(Math.random() * width, 0, 1, height);
    }
  }

  _initializeGameState() {
    try {
      loadGameState();
      this.registry.remove('gameStateFailed');
    } catch (error) {
      console.error(
        '[BootScene] loadGameState failed:',
        error
      );

      this.registry.set(
        'gameStateFailed',
        true
      );
    }
  }

  _initializeMobileFullscreen() {
    if (this.registry.has('mobileFS')) {
      return;
    }

    try {
      this.registry.set(
        'mobileFS',
        new MobileFullscreen()
      );
    } catch (error) {
      console.warn(
        '[BootScene] MobileFullscreen initialization failed:',
        error
      );
    }
  }

  _initializeDifficulty() {
    if (!this.registry.has('difficulty')) {
      this.registry.set(
        'difficulty',
        'field'
      );
    }
  }

  _loadLocalFonts() {
    if (
      this.fontLoadAttempted ||
      this._cleanupDone
    ) {
      return;
    }

    this.fontLoadAttempted = true;

    if (
      !document.fonts ||
      typeof document.fonts.load !== 'function'
    ) {
      this.showStudioCard();
      return;
    }

    const token = Symbol('boot-font-load');
    this.fontLoadToken = token;

    const isCurrent = () => (
      this.fontLoadToken === token &&
      !this._cleanupDone &&
      !this.isProceedingToPreloader
    );

    const finish = () => {
      if (!isCurrent()) return;

      this.fontLoadToken = null;
      this._clearFontTimeout();
      this.showStudioCard();
    };

    this.fontTimeout = window.setTimeout(
      () => {
        if (!isCurrent()) return;

        console.warn(
          '[BootScene] Font loading timed out. Continuing.'
        );

        finish();
      },
      FONT_LOAD_TIMEOUT_MS
    );

    const requests = STARTUP_FONTS.map(
      async family => {
        const faces = await document.fonts.load(
          `${__dialogueText("scenes/BootScene.js", "t_343ac9247ca714b85b86")}${family}${__dialogueText("scenes/BootScene.js", "t_8a331fdde7032f33a71e")}`,
          __dialogueText("scenes/BootScene.js", "t_92d69f57c1dcd092a22f")
        );

        if (
          !faces.length ||
          faces.some(
            face => face.status !== 'loaded'
          )
        ) {
          throw new Error(
            `Font ${family} unavailable.`
          );
        }

        return family;
      }
    );

    Promise.allSettled(requests)
      .then(results => {
        if (!isCurrent()) return;

        results.forEach(
          (result, index) => {
            if (
              result.status === 'rejected'
            ) {
              console.warn(
                `[BootScene] Font ${STARTUP_FONTS[index]}:`,
                result.reason
              );
            }
          }
        );

        finish();
      })
      .catch(error => {
        if (!isCurrent()) return;

        console.warn(
          '[BootScene] Font loading failed:',
          error
        );

        finish();
      });
  }

  /* ------------------------------------------------------------------ */
  /* Studio card: "CZAPLICKI INDUSTRIES presents"                        */
  /* ------------------------------------------------------------------ */

  // Radial-gradient textures generated at runtime (no asset files needed).
  // The same keys are used by IntroScene.
  ensureFxTextures() {
    if (!this.textures.exists('fxGlow')) {
      const tex = this.textures.createCanvas('fxGlow', 256, 256);
      const ctx = tex.getContext();
      const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);

      g.addColorStop(0, __dialogueText("scenes/BootScene.js", "t_b097240d4f916bde6763"));
      g.addColorStop(0.35, __dialogueText("scenes/BootScene.js", "t_87ced990439a5bda151e"));
      g.addColorStop(1, __dialogueText("scenes/BootScene.js", "t_d8bf155698e18c5c5eed"));

      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      tex.refresh();
    }

    if (!this.textures.exists('fxVignette')) {
      const tex = this.textures.createCanvas('fxVignette', 256, 256);
      const ctx = tex.getContext();
      const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);

      g.addColorStop(0, __dialogueText("scenes/BootScene.js", "t_ec68b6486edac3f7ac96"));
      g.addColorStop(0.6, __dialogueText("scenes/BootScene.js", "t_ec68b6486edac3f7ac96"));
      g.addColorStop(1, __dialogueText("scenes/BootScene.js", "t_4c3e818dfb2a7f7820bd"));

      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      tex.refresh();
    }
  }

  // Tween that is remembered, so it can be killed before objects are destroyed.
  studioTweenAdd(config) {
    for (const target of [].concat(config.targets)) {
      this.studioTargets.add(target);
    }

    return this.tweens.add(config);
  }

  // Delayed call that is remembered and guarded by the boot token.
  studioAt(delay, callback) {
    const token = this.bootToken;
    let timer = null;

    timer = this.time.delayedCall(delay, () => {
      this.studioTimers.delete(timer);

      if (
        this.bootToken !== token ||
        this._cleanupDone ||
        this.studioSkipped
      ) {
        return;
      }

      callback();
    });

    this.studioTimers.add(timer);
    return timer;
  }

  makeStudioLetters(text, size, pitch, y, color) {
    const total = (text.length - 1) * pitch;

    return [...text].map((char, index) => {
      const letter = this.add.text(
        -total / 2 + index * pitch,
        y,
        char,
        {
          fontFamily: FONT_PIXEL,
          fontSize: `${size}px`,
          color
        }
      )
        .setOrigin(0.5)
        .setAlpha(0);

      letter.setShadow(3, 3, '#2a1a05', 0, false, true);
      return letter;
    });
  }

  buildStudioCard() {
    const card = this.studioCard;

    // Slowly rotating art-deco sunburst behind the emblem.
    const sunburst = this.add.graphics({ x: 0, y: EMBLEM_Y }).setAlpha(0);
    const rays = 24;
    const radius = 1400;

    sunburst.fillStyle(GOLD, 0.045);

    for (let i = 0; i < rays; i += 1) {
      const a0 = (i * Math.PI * 2) / rays;
      const a1 = a0 + Math.PI / rays;

      sunburst.fillTriangle(
        0, 0,
        Math.cos(a0) * radius, Math.sin(a0) * radius,
        Math.cos(a1) * radius, Math.sin(a1) * radius
      );
    }

    // Warm glow.
    const glow = this.add.image(0, EMBLEM_Y, 'fxGlow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(2.4)
      .setAlpha(0);

    // Gold rules on both sides of the emblem.
    const rules = this.add.container(0, EMBLEM_Y).setScale(0, 1);
    const ruleGfx = this.add.graphics();

    for (const side of [-1, 1]) {
      ruleGfx.lineStyle(2, GOLD, 0.9);
      ruleGfx.lineBetween(side * 78, 0, side * 246, 0);

      ruleGfx.lineStyle(1, GOLD_DARK, 0.7);
      ruleGfx.lineBetween(side * 78, 7, side * 190, 7);
      ruleGfx.lineBetween(side * 78, -7, side * 190, -7);

      ruleGfx.fillStyle(GOLD, 1);
      ruleGfx.fillPoints([
        { x: side * 246, y: -5 },
        { x: side * 254, y: 0 },
        { x: side * 246, y: 5 },
        { x: side * 238, y: 0 }
      ], true);
    }

    rules.add(ruleGfx);

    // Emblem: double ring, ticks, cardinal diamonds, "C" monogram.
    const emblem = this.add.container(0, EMBLEM_Y)
      .setScale(0.7)
      .setAlpha(0);

    const disc = this.add.graphics();
    disc.fillStyle(0x070605, 1);
    disc.fillCircle(0, 0, 58);
    disc.lineStyle(3, GOLD, 1);
    disc.strokeCircle(0, 0, 52);
    disc.lineStyle(1, GOLD_DARK, 1);
    disc.strokeCircle(0, 0, 44);

    disc.fillStyle(GOLD, 1);

    for (let i = 0; i < 4; i += 1) {
      const angle = (i * Math.PI) / 2;
      const cx = Math.cos(angle) * 52;
      const cy = Math.sin(angle) * 52;

      disc.fillPoints([
        { x: cx, y: cy - 7 },
        { x: cx + 7, y: cy },
        { x: cx, y: cy + 7 },
        { x: cx - 7, y: cy }
      ], true);
    }

    const ticks = this.add.graphics();
    ticks.lineStyle(2, GOLD, 0.75);

    for (let i = 0; i < 36; i += 1) {
      const angle = (i * Math.PI * 2) / 36;
      const inner = 59;
      const outer = i % 3 === 0 ? 68 : 63;

      ticks.lineBetween(
        Math.cos(angle) * inner, Math.sin(angle) * inner,
        Math.cos(angle) * outer, Math.sin(angle) * outer
      );
    }

    const monogram = this.add.text(2, 3, __dialogueText("scenes/BootScene.js", "t_6b23c0d5f35d1b11f9b6"), {
      fontFamily: FONT_PIXEL,
      fontSize: '40px',
      color: '#e6c687'
    }).setOrigin(0.5);
    monogram.setShadow(3, 3, '#1a0d00', 0, false, true);

    emblem.add([disc, ticks, monogram]);

    // Title letters (monospace font => exact manual spacing).
    const line1 = this.makeStudioLetters('CZAPLICKI', 44, 48, 4, '#f4ebd9');
    const line2 = this.makeStudioLetters('INDUSTRIES', 20, 30, 52, '#c9aa70');

    // Ornament under the title.
    const ornament = this.add.graphics({ x: 0, y: 82 }).setAlpha(0);
    ornament.lineStyle(1, GOLD, 0.8);
    ornament.lineBetween(-130, 0, -14, 0);
    ornament.lineBetween(14, 0, 130, 0);
    ornament.fillStyle(GOLD, 1);
    ornament.fillPoints([
      { x: 0, y: -5 },
      { x: 5, y: 0 },
      { x: 0, y: 5 },
      { x: -5, y: 0 }
    ], true);

    const presents = this.add.text(0, 112, __dialogueText("scenes/BootScene.js", "t_513b0d230cf60ed71986"), {
      fontFamily: FONT_TYPE,
      fontSize: '20px',
      color: '#c9aa70'
    }).setOrigin(0.5).setAlpha(0);

    card.add([
      sunburst,
      glow,
      rules,
      emblem,
      ...line1,
      ...line2,
      ornament,
      presents
    ]);

    return {
      sunburst,
      glow,
      rules,
      emblem,
      ticks,
      line1,
      line2,
      ornament,
      presents
    };
  }

  showStudioCard() {
    if (
      this._cleanupDone ||
      this.studioStarted ||
      this.isProceedingToPreloader
    ) {
      return;
    }

    this.studioStarted = true;
    this.studioSkipped = false;
    this.studioShownAt = performance.now();

    this.cameras.main.setBackgroundColor('#000000');
    this.ensureFxTextures();

    this.studioRoot = this.add.container(0, 0).setDepth(10000);
    this.studioCard = this.add.container(0, 0);

    const parts = this.buildStudioCard();

    this.studioVignette = this.add.image(0, 0, 'fxVignette').setAlpha(0);
    this.studioGrain = this.add.graphics();

    this.studioTagline = this.add.text(
      0,
      0,
      Phaser.Utils.Array.GetRandom(STUDIO_JOKES),
      {
        fontFamily: FONT_TYPE,
        fontSize: '15px',
        color: '#8f8062',
        align: 'center',
        wordWrap: { width: 400 }
      }
    ).setOrigin(0.5, 1).setAlpha(0);

    // Order matters: the tagline sits above the vignette so it stays readable.
    this.studioRoot.add([
      this.studioCard,
      this.studioVignette,
      this.studioGrain,
      this.studioTagline
    ]);

    this.scale.off('resize', this.boundStudioResize);
    this.scale.on('resize', this.boundStudioResize);

    this.resizeStudioCard();

    // Click / key skips the card.
    this.studioSkipHandler = () => this.skipStudioCard();
    this.input?.on('pointerdown', this.studioSkipHandler);
    this.input?.keyboard?.on('keydown', this.studioSkipHandler);

    this.playStudioSequence(parts);
  }

  playStudioSequence(parts) {
    const { sunburst, glow, rules, emblem, ticks, line1, line2, ornament, presents } = parts;

    // 0 ms: background lights come up.
    this.studioTweenAdd({
      targets: this.studioVignette,
      alpha: 1,
      duration: 700,
      ease: 'Sine.Out'
    });

    this.studioTweenAdd({
      targets: sunburst,
      alpha: 1,
      duration: 1400,
      ease: 'Sine.Out'
    });

    this.studioTweenAdd({
      targets: sunburst,
      angle: 360,
      duration: 120000,
      repeat: -1
    });

    // 150 ms: emblem blooms in.
    this.studioAt(150, () => {
      this.studioTweenAdd({
        targets: emblem,
        alpha: 1,
        scale: 1,
        duration: 650,
        ease: 'Back.Out'
      });

      this.studioTweenAdd({
        targets: glow,
        alpha: 0.5,
        duration: 800,
        ease: 'Sine.Out',
        onComplete: () => {
          if (this._cleanupDone || !glow.active) return;

          this.studioTweenAdd({
            targets: glow,
            alpha: 0.3,
            duration: 1400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
          });
        }
      });

      this.studioTweenAdd({
        targets: ticks,
        angle: 360,
        duration: 40000,
        repeat: -1
      });
    });

    // 500 ms: neon-style letter flicker.
    this.studioAt(500, () => {
      line1.forEach((letter, index) => {
        this.studioTweenAdd({
          targets: letter,
          alpha: [0, 1, 0.2, 1, 0.65, 1],
          duration: 280,
          delay: index * 70
        });
      });

      const secondLineStart = line1.length * 70 + 120;

      line2.forEach((letter, index) => {
        this.studioTweenAdd({
          targets: letter,
          alpha: [0, 1, 0.3, 1],
          duration: 220,
          delay: secondLineStart + index * 45
        });
      });
    });

    // 1300 ms: gold rules and ornament extend.
    this.studioAt(1300, () => {
      this.studioTweenAdd({
        targets: rules,
        scaleX: 1,
        duration: 550,
        ease: 'Cubic.Out'
      });

      this.studioTweenAdd({
        targets: ornament,
        alpha: 1,
        duration: 450
      });
    });

    // 1500 ms: a light sweep runs across all letters.
    this.studioAt(1500, () => {
      const letters = [...line1, ...line2];
      const baseColors = letters.map(letter => letter.style.color);

      this.studioShine = this.tweens.addCounter({
        from: -2,
        to: letters.length + 2,
        duration: 950,
        ease: 'Sine.InOut',
        onUpdate: tween => {
          const position = tween.getValue();

          letters.forEach((letter, index) => {
            if (!letter.active) return;

            const distance = Math.abs(index - position);

            letter.setColor(
              distance < 1
                ? '#ffffff'
                : distance < 2.2
                  ? '#fff0c0'
                  : baseColors[index]
            );
          });
        },
        onComplete: () => {
          letters.forEach((letter, index) => {
            if (letter.active) letter.setColor(baseColors[index]);
          });
        }
      });
    });

    // 1900 ms: "P R E S E N T S".
    this.studioAt(1900, () => {
      this.studioTweenAdd({
        targets: presents,
        alpha: 1,
        duration: 500,
        ease: 'Sine.Out'
      });
    });

    // 2200 ms: tongue-in-cheek legal line.
    this.studioAt(2200, () => {
      this.studioTweenAdd({
        targets: this.studioTagline,
        alpha: 0.9,
        duration: 600,
        ease: 'Sine.Out'
      });
    });

    // Everything is visible at ~2.8 s; hold, then fade out.
    this.studioAt(2800 + STUDIO_HOLD_MS, () => {
      this.hideStudioCard(this.bootToken);
    });
  }

  resizeStudioCard() {
    if (!this.studioRoot?.scene) {
      return;
    }

    const { width, height } = this.scale;

    this.studioVignette?.setPosition(width / 2, height / 2);
    this.studioVignette?.setDisplaySize(width, height);

    const scale = Math.max(
      0.2,
      Math.min(
        1.3,
        (width - 40) / CARD_W,
        (height - 110) / CARD_H
      )
    );

    this.studioCard?.setPosition(
      width / 2,
      height / 2 + 10
    );

    this.studioCard?.setScale(scale);

    if (this.studioTagline?.active) {
      this.studioTagline.setWordWrapWidth(
        Math.max(160, width - 48)
      );

      this.studioTagline.setPosition(
        width / 2,
        height - 24
      );
    }
  }

  skipStudioCard() {
    if (
      !this.studioRoot?.scene ||
      this.studioSkipped ||
      this._cleanupDone ||
      this.isProceedingToPreloader ||
      performance.now() - this.studioShownAt < STUDIO_SKIP_LOCK_MS
    ) {
      return;
    }

    this.studioSkipped = true;
    this.hideStudioCard(this.bootToken, STUDIO_SKIP_FADE_MS);
  }

  hideStudioCard(token, duration = STUDIO_FADE_OUT_MS) {
    if (
      this.bootToken !== token ||
      this._cleanupDone ||
      !this.studioRoot?.scene
    ) {
      return;
    }

    this.stopStudioAnimations();

    this.studioTween = this.tweens.add({
      targets: this.studioRoot,
      alpha: 0,
      duration,
      ease: 'Sine.In',

      onComplete: () => {
        this.studioTween = null;

        if (
          this.bootToken !== token ||
          this._cleanupDone
        ) {
          return;
        }

        this.clearStudioCard();
        this._proceedToPreloader();
      }
    });
  }

  // Stops timers and tweens of the studio card (must run before its objects are destroyed).
  stopStudioAnimations() {
    for (const timer of this.studioTimers) {
      timer.remove(false);
    }

    this.studioTimers.clear();

    try {
      this.studioShine?.stop();
    } catch (error) {
      // The counter may already be finished.
    }

    this.studioShine = null;

    for (const target of this.studioTargets) {
      this.tweens.killTweensOf(target);
    }

    this.studioTargets.clear();
  }

  clearStudioCard() {
    this.scale.off(
      'resize',
      this.boundStudioResize
    );

    if (this.studioSkipHandler) {
      this.input?.off('pointerdown', this.studioSkipHandler);
      this.input?.keyboard?.off('keydown', this.studioSkipHandler);
      this.studioSkipHandler = null;
    }

    this.stopStudioAnimations();

    this.studioTween?.stop();
    this.studioTween = null;

    if (this.studioRoot) {
      this.tweens.killTweensOf(
        this.studioRoot
      );

      this.studioRoot.destroy(true);
    }

    this.studioRoot = null;
    this.studioCard = null;
    this.studioVignette = null;
    this.studioGrain = null;
    this.studioTagline = null;
  }

  _clearFontTimeout() {
    if (this.fontTimeout !== null) {
      window.clearTimeout(
        this.fontTimeout
      );

      this.fontTimeout = null;
    }
  }

  _proceedToPreloader() {
    if (
      this._cleanupDone ||
      this.isProceedingToPreloader
    ) {
      return;
    }

    if (!this.hasScene('PreloaderScene')) {
      console.error(
        '[BootScene] PreloaderScene is not registered.'
      );

      return;
    }

    this.isProceedingToPreloader = true;

    void this.goto('PreloaderScene')
      .then(started => {
        if (
          !started &&
          !this._cleanupDone
        ) {
          this.isProceedingToPreloader = false;

          console.error(
            '[BootScene] Could not start PreloaderScene.'
          );
        }
      })
      .catch(error => {
        if (!this._cleanupDone) {
          this.isProceedingToPreloader = false;

          console.error(
            '[BootScene] Transition failed:',
            error
          );
        }
      });
  }

  cleanupScene() {
    this.bootToken = null;

    this.manifestAbort?.abort();
    this.manifestAbort = null;

    this.fontLoadToken = null;

    this._clearFontTimeout();
    this.clearStudioCard();

    this.isProceedingToPreloader = false;

    this.events.off(
      'shutdown',
      this.boundCleanupScene
    );

    this.events.off(
      'destroy',
      this.boundCleanupScene
    );
  }
}