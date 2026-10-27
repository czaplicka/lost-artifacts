import {
  ensureBarsTexture,
  ensureNoiseTexture,
  ensureScanlineTexture,
  ensureVignetteTexture
} from './TvBroadcastTextures.js';

export class TvBroadcastEffects {
  constructor(scene) {
    this.scene = scene;

    this.objects = [];
    this.running = false;

    this.noiseTimer = null;
    this.glitchCall = null;

    this.jitterTarget = null;
    this.jitterBaseX = 0;

    this.width = 0;
    this.height = 0;
  }

  create(width, height) {
    const scene = this.scene;

    this.width = width;
    this.height = height;

    const noiseKey = ensureNoiseTexture(scene);
    const scanKey = ensureScanlineTexture(scene);
    const vignetteKey = ensureVignetteTexture(scene, width, height);
    const barsKey = ensureBarsTexture(scene, width, height);

    this.noise = scene.add
      .tileSprite(0, 0, width, height, noiseKey)
      .setAlpha(0.05)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.scanlines = scene.add.tileSprite(0, 0, width, height, scanKey);

    this.rollBar = scene.add
      .rectangle(0, -height / 2 - 70, width, 70, 0xffffff, 0.045)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.vignette = scene.add
      .image(0, 0, vignetteKey)
      .setDisplaySize(width, height);

    this.glare = scene.add.graphics();
    this.glare.fillStyle(0xffffff, 0.035);
    this.glare.fillTriangle(
      -width / 2,
      -height / 2,
      0,
      -height / 2,
      -width / 2,
      -height / 2 + height * 0.42
    );
    this.glare.fillStyle(0xffffff, 0.02);
    this.glare.fillTriangle(
      0,
      -height / 2,
      width * 0.12,
      -height / 2,
      -width / 2,
      -height / 2 + height * 0.6
    );

    this.flicker = scene.add.rectangle(0, 0, width, height, 0x000000, 0);

    this.glitchBand = scene.add
      .rectangle(0, 0, width, 8, 0xffffff, 0)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.staticLayer = scene.add
      .tileSprite(0, 0, width, height, noiseKey)
      .setAlpha(0)
      .setVisible(false);

    this.bars = scene.add
      .image(0, 0, barsKey)
      .setDisplaySize(width, height)
      .setVisible(false);

    this.powerBlack = scene.add.rectangle(0, 0, width, height, 0x000000, 1);

    this.powerLine = scene.add
      .rectangle(0, 0, width, height, 0xffffff, 1)
      .setVisible(false);

    this.objects = [
      this.noise,
      this.scanlines,
      this.rollBar,
      this.vignette,
      this.glare,
      this.flicker,
      this.glitchBand,
      this.staticLayer,
      this.bars,
      this.powerBlack,
      this.powerLine
    ];

    return this.objects;
  }

  setJitterTarget(target) {
    this.jitterTarget = target;
    this.jitterBaseX = target?.x || 0;
  }

  start() {
    if (this.running || !this.scene) return;

    this.running = true;

    this.noiseTimer = this.scene.time.addEvent({
      delay: 70,
      loop: true,
      callback: () => {
        if (!this.noise?.active) return;

        this.noise.tilePositionX = Math.random() * 128;
        this.noise.tilePositionY = Math.random() * 128;

        this.flicker.setAlpha(Math.random() * 0.045);
      }
    });

    this.scene.tweens.add({
      targets: this.rollBar,
      y: this.height / 2 + 70,
      duration: 5200,
      repeat: -1,
      repeatDelay: 1800,
      ease: 'Linear'
    });

    this.scheduleGlitch();
  }

  scheduleGlitch() {
    if (!this.running || !this.scene) return;

    this.glitchCall = this.scene.time.delayedCall(
      Phaser.Math.Between(4500, 9500),
      () => {
        this.glitch();
        this.scheduleGlitch();
      }
    );
  }

  glitch() {
    if (!this.scene || !this.glitchBand?.active) return;

    const band = this.glitchBand;

    band.setSize(this.width, Phaser.Math.Between(6, 18));
    band.setY(Phaser.Math.Between(-this.height / 2, this.height / 2));
    band.setAlpha(0.16);

    if (this.jitterTarget?.active) {
      this.jitterTarget.x = this.jitterBaseX + Phaser.Math.Between(-5, 5);
    }

    this.scene.time.delayedCall(70, () => {
      if (band.active) band.setAlpha(0);

      if (this.jitterTarget?.active) {
        this.jitterTarget.x = this.jitterBaseX;
      }
    });
  }

  burst(duration = 150, strength = 1) {
    if (!this.scene || !this.staticLayer?.active) return;

    const layer = this.staticLayer;

    this.scene.tweens.killTweensOf(layer);

    layer.setVisible(true).setAlpha(0.9 * strength);

    this.scene.time.addEvent({
      delay: 40,
      repeat: 3,
      callback: () => {
        if (!layer.active) return;

        layer.tilePositionX = Math.random() * 128;
        layer.tilePositionY = Math.random() * 128;
      }
    });

    this.scene.tweens.add({
      targets: layer,
      alpha: 0,
      duration,
      ease: 'Quad.easeIn',
      onComplete: () => layer.active && layer.setVisible(false)
    });
  }

  showBars(duration = 400, onDone) {
    if (!this.scene || !this.bars?.active) {
      onDone?.();
      return;
    }

    this.bars.setVisible(true).setAlpha(1);

    this.scene.time.delayedCall(duration, () => {
      if (this.bars?.active) this.bars.setVisible(false);

      onDone?.();
    });
  }

  powerOn(onDone) {
    if (!this.scene || !this.powerBlack?.active) {
      onDone?.();
      return;
    }

    const scene = this.scene;
    const line = this.powerLine;
    const black = this.powerBlack;

    black.setVisible(true).setAlpha(1);
    line.setVisible(true).setAlpha(1).setScale(0.02, 3 / this.height);

    scene.tweens.add({
      targets: line,
      scaleX: 1,
      duration: 160,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: line,
          scaleY: 1,
          duration: 140,
          ease: 'Quad.easeIn',
          onComplete: () => {
            scene.tweens.add({
              targets: [line, black],
              alpha: 0,
              duration: 240,
              onComplete: () => {
                line.setVisible(false);
                black.setVisible(false);

                onDone?.();
              }
            });
          }
        });
      }
    });
  }

  powerOff(onDone) {
    if (!this.scene || !this.powerBlack?.active) {
      onDone?.();
      return;
    }

    const scene = this.scene;
    const line = this.powerLine;
    const black = this.powerBlack;

    black.setVisible(true).setAlpha(1);
    line.setVisible(true).setAlpha(1).setScale(1, 1);

    scene.tweens.add({
      targets: line,
      scaleY: 3 / this.height,
      duration: 180,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        scene.tweens.add({
          targets: line,
          scaleX: 0.02,
          duration: 130,
          ease: 'Quad.easeIn',
          onComplete: () => {
            line.setVisible(false);

            onDone?.();
          }
        });
      }
    });
  }

  stop() {
    this.running = false;

    this.noiseTimer?.remove?.(false);
    this.noiseTimer = null;

    this.glitchCall?.remove?.(false);
    this.glitchCall = null;
  }

  destroy() {
    this.stop();

    try {
      this.scene?.tweens?.killTweensOf(this.objects);
    } catch (error) {
      /* scene already shutting down */
    }

    if (this.jitterTarget?.active) {
      this.jitterTarget.x = this.jitterBaseX;
    }

    this.objects.forEach((object) => object?.destroy?.());

    this.objects = [];
    this.jitterTarget = null;
    this.scene = null;
  }
}