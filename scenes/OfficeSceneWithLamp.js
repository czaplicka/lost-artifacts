import { OfficeScene as OriginalOfficeScene } from './OfficeScene.js';

const LAMP_CONFIG = {
  sourceKey: 'office-desk-lamp-source-v1',
  textureKey: 'office-desk-lamp-frames-v1',
  animationKey: 'office-desk-lamp-flicker-v1',

  url: 'assets/spritesheet/office/desk-lamp-flicker.png',

  sheetWidth: 2064,
  sheetHeight: 512,

  frameWidth: 344,
  frameHeight: 512,
  frameCount: 6,

  // Współrzędne względem grafiki biura 1920 × 1080.
  // Pozycja oznacza lewy górny róg całej klatki.
  x: 1000,
  y: 385,
  width: 190,
  height: 290,

  depth: 1,

  minDelay: 9000,
  maxDelay: 22000,

  frameRate: 14
};

export class OfficeScene extends OriginalOfficeScene {
  preload() {
    super.preload();

    if (!this.textures.exists(LAMP_CONFIG.sourceKey)) {
      this.load.image(
        LAMP_CONFIG.sourceKey,
        LAMP_CONFIG.url
      );
    }
  }

  create() {
    super.create();

    this.deskLamp = null;
    this.deskLampTimer = null;

    this.createDeskLamp();

    this.events.once('shutdown', this.destroyDeskLamp, this);
    this.events.once('destroy', this.destroyDeskLamp, this);
  }

  createDeskLamp() {
    if (!this.rooms?.office?.bg) {
      console.warn('[OfficeLamp] Office background is unavailable.');
      return;
    }

    if (!this.prepareDeskLampTexture()) return;

    this.prepareDeskLampAnimation();

    this.deskLamp = this.add
      .sprite(0, 0, LAMP_CONFIG.textureKey, 0)
      .setOrigin(0, 0)
      .setDepth(LAMP_CONFIG.depth);

    this.positionDeskLamp();

    this.deskLamp.on(
      `animationcomplete-${LAMP_CONFIG.animationKey}`,
      this.onDeskLampFlickerComplete,
      this
    );

    this.scale.on(
      'resize',
      this.positionDeskLamp,
      this
    );

    this.scheduleDeskLampFlicker();
  }

  prepareDeskLampTexture() {
    if (this.textures.exists(LAMP_CONFIG.textureKey)) {
      return true;
    }

    if (!this.textures.exists(LAMP_CONFIG.sourceKey)) {
      console.error(
        '[OfficeLamp] Could not load:',
        LAMP_CONFIG.url
      );
      return false;
    }

    const source = this.textures
      .get(LAMP_CONFIG.sourceKey)
      .getSourceImage();

    if (
      source.width !== LAMP_CONFIG.sheetWidth ||
      source.height !== LAMP_CONFIG.sheetHeight
    ) {
      console.error(
        '[OfficeLamp] Wrong spritesheet size.',
        `Expected ${LAMP_CONFIG.sheetWidth} × ${LAMP_CONFIG.sheetHeight},`,
        `received ${source.width} × ${source.height}.`
      );
      return false;
    }

    this.textures.addSpriteSheet(
      LAMP_CONFIG.textureKey,
      source,
      {
        frameWidth: LAMP_CONFIG.frameWidth,
        frameHeight: LAMP_CONFIG.frameHeight,
        startFrame: 0,
        endFrame: LAMP_CONFIG.frameCount - 1,
        margin: 0,
        spacing: 0
      }
    );

    return true;
  }

  prepareDeskLampAnimation() {
    if (this.anims.exists(LAMP_CONFIG.animationKey)) {
      return;
    }

    this.anims.create({
      key: LAMP_CONFIG.animationKey,

      frames: this.anims.generateFrameNumbers(
        LAMP_CONFIG.textureKey,
        {
          start: 0,
          end: LAMP_CONFIG.frameCount - 1
        }
      ),

      frameRate: LAMP_CONFIG.frameRate,
      repeat: 0
    });
  }

  positionDeskLamp() {
    const background = this.rooms?.office?.bg;

    if (!this.deskLamp?.active || !background?.active) {
      return;
    }

    const scaleX = background.displayWidth / 1920;
    const scaleY = background.displayHeight / 1080;

    this.deskLamp
      .setPosition(
        background.x + LAMP_CONFIG.x * scaleX,
        background.y + LAMP_CONFIG.y * scaleY
      )
      .setDisplaySize(
        LAMP_CONFIG.width * scaleX,
        LAMP_CONFIG.height * scaleY
      );
  }

  scheduleDeskLampFlicker() {
    this.deskLampTimer?.remove(false);
    this.deskLampTimer = null;

    if (!this.deskLamp?.active) return;

    const delay = Phaser.Math.Between(
      LAMP_CONFIG.minDelay,
      LAMP_CONFIG.maxDelay
    );

    this.deskLampTimer = this.time.delayedCall(
      delay,
      () => {
        this.deskLampTimer = null;

        if (!this.deskLamp?.active) return;

        // Nie uruchamiaj migotania, gdy oglądamy inny pokój.
        if (
          !this.sys.isActive() ||
          this.currentView !== 'office'
        ) {
          this.scheduleDeskLampFlicker();
          return;
        }

        this.deskLamp.play(LAMP_CONFIG.animationKey);
      }
    );
  }

  onDeskLampFlickerComplete() {
    if (!this.deskLamp?.active) return;

    this.deskLamp.setFrame(0);
    this.scheduleDeskLampFlicker();
  }

  destroyDeskLamp() {
    this.events.off(
      'shutdown',
      this.destroyDeskLamp,
      this
    );

    this.events.off(
      'destroy',
      this.destroyDeskLamp,
      this
    );

    this.scale.off(
      'resize',
      this.positionDeskLamp,
      this
    );

    this.deskLampTimer?.remove(false);
    this.deskLampTimer = null;

    if (this.deskLamp) {
      this.deskLamp.off(
        `animationcomplete-${LAMP_CONFIG.animationKey}`,
        this.onDeskLampFlickerComplete,
        this
      );

      this.deskLamp.destroy();
      this.deskLamp = null;
    }
  }
}