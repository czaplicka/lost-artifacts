import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';

const FONT_PIXEL = '"Press Start 2P"';
const FONT_TYPE = '"Special Elite"';

const BEATS = [
  { at: 600, run: 'showLogo' },
  { at: 2900, run: 'flashcards' },
  { at: 5500, run: 'showTagline1' },
  { at: 7100, run: 'showTagline2' },
  { at: 8700, run: 'stampHiring' },
  { at: 10200, run: 'finish' },
];

export class IntroScene extends BaseScene {
  constructor() {
    super({ key: 'IntroScene' });

    this.finished = false;
    this.staticOn = true;
    this.noise = null;
    this.skipHint = null;
this.taglineFrame = null;
    this.authMode = 'guest';
    this.playerId = null;
    this.playerEmail = null;
    this.displayName = 'Guest';
    this.isNewGame = true;
  }

  init(data = {}) {
    this.authMode = data.authMode ?? 'guest';
    this.playerId = data.playerId ?? null;
    this.playerEmail = data.playerEmail ?? null;
    this.displayName = data.displayName ?? 'Guest';
    this.isNewGame = data.isNewGame ?? true;
  }

  create() {
    super.create();

    EventBus.emit('hideHUD');

    this.finished = false;
    this.staticOn = true;

    const { width, height } = this.scale;

            if (this.textures.exists('intro')) {
            this.add.image(width / 2, height / 2, 'intro')
                .setDisplaySize(width, height)
                .setDepth(-10);
        } else {
            console.error('Tło intro nie zostało znalezione!');
            this.cameras.main.setBackgroundColor('#0a0a0a');
        }

    this.noise = this.add.graphics();

    this.skipHint = this.add.text(
      width - 16,
      height - 12,
      'CLICK OR PRESS ANY KEY TO SKIP',
      {
        fontFamily: FONT_PIXEL,
        fontSize: '9px',
        color: '#666655',
      },
    ).setOrigin(1, 1);

    this.tweens.add({
      targets: this.skipHint,
      alpha: 0.2,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    BEATS.forEach((beat) => {
      this.time.delayedCall(beat.at, () => {
        if (!this.finished && this[beat.run]) {
          this[beat.run]();
        }
      });
    });

    this.time.delayedCall(700, () => {
      if (this.finished) {
        return;
      }

      this.staticOn = false;
      this.noise.clear();
    });

    this.onKeyboardSkip = () => this.skip();
    this.onPointerSkip = () => this.skip();

    this.input.keyboard.on('keydown', this.onKeyboardSkip);
    this.input.on('pointerdown', this.onPointerSkip);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  update() {
    if (!this.staticOn || this.finished || !this.noise) {
      return;
    }

    this.noise.clear();

    for (let index = 0; index < 120; index += 1) {
      this.noise.fillStyle(0xffffff, Math.random() * 0.08);
      this.noise.fillRect(
        Math.random() * this.scale.width,
        Math.random() * this.scale.height,
        2,
        2,
      );
    }
  }

  cleanup() {
    this.time.removeAllEvents();

    if (this.onKeyboardSkip) {
      this.input.keyboard.off('keydown', this.onKeyboardSkip);
      this.onKeyboardSkip = null;
    }

    if (this.onPointerSkip) {
      this.input.off('pointerdown', this.onPointerSkip);
      this.onPointerSkip = null;
    }
  }

  playSfx(key) {
    if (this.cache.audio.exists(key)) {
      this.sound.play(key);
    }
  }

  showLogo() {
    const logoFontSize = Math.min(42, Math.floor(this.scale.width * 0.09));

    const text = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 - 40,
      'MARK AGENCY',
      {
        fontFamily: FONT_PIXEL,
        fontSize: `${logoFontSize}px`,
        color: '#e8e0c8',
      },
    )
      .setOrigin(0.5)
      .setScale(3)
      .setAlpha(0);

    this.tweens.add({
      targets: text,
      scale: 1,
      alpha: 1,
      duration: 220,
      ease: 'Back.easeOut',
    });

    this.cameras.main.shake(150, 0.01);
    this.playSfx('sfx_stamp');
  }

  flashcards() {
  const cards = [
    'STOLEN: Golden Idol',
    'STOLEN: Jade Mask',
    'STOLEN: Your Monday',
  ];

  const CARD_INTERVAL = 820;
  const CARD_VISIBLE_FOR = 700;

  cards.forEach((label, index) => {
    this.time.delayedCall(index * CARD_INTERVAL, () => {
      if (this.finished) {
        return;
      }

      const card = this.add.container(
        this.scale.width / 2,
        this.scale.height / 2 + 60,
      );

      const background = this.add.rectangle(
        0,
        0,
        Math.min(420, this.scale.width - 32),
        60,
        0xe8e0c8,
      ).setStrokeStyle(3, 0x1a1a1a);

      const text = this.add.text(0, 0, label, {
        fontFamily: FONT_TYPE,
        fontSize: '26px',
        color: '#1a1a1a',
      }).setOrigin(0.5);

      card.add([background, text]);

      card
        .setAngle(Phaser.Math.Between(-4, 4))
        .setScale(0.92)
        .setAlpha(0);

      this.cameras.main.flash(80, 255, 255, 255);
      this.playSfx('sfx_shutter');

      this.tweens.add({
        targets: card,
        alpha: 1,
        scale: 1,
        duration: 150,
        ease: 'Back.easeOut',
      });

      this.time.delayedCall(CARD_VISIBLE_FOR, () => {
        if (!card?.scene || this.finished) {
          return;
        }

        this.tweens.add({
          targets: card,
          alpha: 0,
          y: card.y - 10,
          duration: 180,
          ease: 'Sine.easeIn',
          onComplete: () => {
            if (card?.scene) {
              card.destroy();
            }
          },
        });
      });
    });
  });
}
createTaglineFrame() {
  if (this.taglineFrame) {
    return;
  }

  const { width, height } = this.scale;

  const frameWidth = Math.min(
    Math.max(520, width * 0.58),
    width - 80,
  );

  const frameHeight = 112;
  const frameY = height / 2 + 173;

  const frame = this.add.container(width / 2, frameY)
    .setDepth(5)
    .setAlpha(0);

  const shadow = this.add.rectangle(
    5,
    6,
    frameWidth,
    frameHeight,
    0x000000,
    0.38,
  );

  const background = this.add.rectangle(
    0,
    0,
    frameWidth,
    frameHeight,
    0x120f0c,
    0.68,
  ).setStrokeStyle(2, 0xc9a85d, 0.8);

  const innerLine = this.add.rectangle(
    0,
    0,
    frameWidth - 12,
    frameHeight - 12,
    0x000000,
    0,
  ).setStrokeStyle(1, 0xf2d477, 0.5);

  const leftMark = this.add.text(
    -frameWidth / 2 + 18,
    0,
    '◆',
    {
      fontFamily: FONT_TYPE,
      fontSize: '20px',
      color: '#c9a85d',
    },
  ).setOrigin(0.5);

  const rightMark = this.add.text(
    frameWidth / 2 - 18,
    0,
    '◆',
    {
      fontFamily: FONT_TYPE,
      fontSize: '20px',
      color: '#c9a85d',
    },
  ).setOrigin(0.5);

  frame.add([
    shadow,
    background,
    innerLine,
    leftMark,
    rightMark,
  ]);

  this.taglineFrame = frame;

  this.tweens.add({
    targets: frame,
    alpha: 1,
    duration: 280,
    ease: 'Sine.easeOut',
  });
}
  typewrite(text, y) {
    const fontSize = Math.min(30, Math.floor(this.scale.width * 0.07));

    const typewriterText = this.add.text(
      this.scale.width / 2,
      y,
      '',
      {
        fontFamily: FONT_TYPE,
        fontSize: `${fontSize}px`,
        color: '#c9c2a8',
        align: 'center',
        wordWrap: {
          width: this.scale.width - 48,
          useAdvancedWrap: true,
        },
      },
).setOrigin(0.5).setDepth(6);

    let index = 0;

    this.time.addEvent({
      delay: 35,
      repeat: text.length - 1,
      callback: () => {
        if (!this.finished) {
          typewriterText.setText(text.slice(0, ++index));
        }
      },
    });
  }

showTagline1() {
  this.createTaglineFrame();

  this.typewrite(
    'We find what others lose.',
    this.scale.height / 2 + 150,
  );
}

  showTagline2() {
    this.typewrite(
      'Sometimes before they lose it.',
      this.scale.height / 2 + 195,
    );
  }

  stampHiring() {
    const stampFontSize = Math.min(36, Math.floor(this.scale.width * 0.085));

    const text = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 - 90,
      'NOW HIRING',
      {
        fontFamily: FONT_PIXEL,
        fontSize: `${stampFontSize}px`,
        color: '#c0392b',
      },
    )
      .setOrigin(0.5)
      .setAngle(-12)
      .setScale(4)
      .setAlpha(0);

    this.tweens.add({
      targets: text,
      scale: 1,
      alpha: 0.95,
      duration: 180,
      ease: 'Quad.easeIn',
    });

    this.cameras.main.shake(200, 0.015);
    this.playSfx('sfx_stamp');
  }

  skip() {
    if (this.finished) {
      return;
    }

    this.finish(true);
  }

  finish(instant = false) {
    if (this.finished) {
      return;
    }

    this.finished = true;
    this.staticOn = false;

    this.time.removeAllEvents();

    if (this.noise) {
      this.noise.clear();
    }

    if (instant) {
      this.startCharacterCreation();
      return;
    }

    this.cameras.main.fadeOut(400, 0, 0, 0);

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        this.startCharacterCreation();
      },
    );
  }

  startCharacterCreation() {
    this.scene.start('CharacterCreationScene', {
      authMode: this.authMode,
      playerId: this.playerId,
      playerEmail: this.playerEmail,
      displayName: this.displayName,
      isNewGame: this.isNewGame,
      fromIntro: true,
    });
  }
}