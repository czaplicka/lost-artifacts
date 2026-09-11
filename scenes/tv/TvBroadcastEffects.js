export class TvBroadcastEffects {
  constructor(scene) {
    this.scene = scene;

    this.scanlines = null;
    this.noise = null;
    this.vignette = null;

    this.noiseEvent = null;

    this.width = 0;
    this.height = 0;

    this.isDestroyed = false;
  }

  create(width, height) {
    this.width = width;
    this.height = height;

    this.scanlines = this.scene.add.graphics();
    this.noise = this.scene.add.graphics();
    this.vignette = this.scene.add.graphics();

    this.drawScanlines();
    this.drawNoise();
    this.drawVignette();

    return [
      this.noise,
      this.scanlines,
      this.vignette
    ];
  }

  start() {
    if (
      this.isDestroyed ||
      this.noiseEvent
    ) {
      return;
    }

    this.noiseEvent = this.scene.time.addEvent({
      delay: 90,
      loop: true,
      callback: () => {
        if (
          this.isDestroyed ||
          !this.scene?.sys?.isActive() ||
          !this.noise?.active
        ) {
          return;
        }

        this.drawNoise();
      }
    });
  }

  stop() {
    if (this.noiseEvent?.remove) {
      this.noiseEvent.remove(false);
    }

    this.noiseEvent = null;
  }

  drawScanlines() {
    if (
      this.isDestroyed ||
      !this.scanlines?.active
    ) {
      return;
    }

    const {
      width,
      height
    } = this;

    this.scanlines.clear();

    this.scanlines.fillStyle(
      0x000000,
      0.14
    );

    for (
      let y = -height / 2;
      y < height / 2;
      y += 4
    ) {
      this.scanlines.fillRect(
        -width / 2,
        y,
        width,
        2
      );
    }
  }

  drawNoise() {
    if (
      this.isDestroyed ||
      !this.noise?.active
    ) {
      return;
    }

    const {
      width,
      height
    } = this;

    this.noise.clear();

    for (let i = 0; i < 110; i += 1) {
      this.noise.fillStyle(
        0xffffff,
        Phaser.Math.FloatBetween(
          0.025,
          0.12
        )
      );

      this.noise.fillRect(
        Phaser.Math.Between(
          -width / 2,
          width / 2
        ),
        Phaser.Math.Between(
          -height / 2,
          height / 2
        ),
        Phaser.Math.Between(8, 34),
        Phaser.Math.Between(1, 3)
      );
    }
  }

  drawVignette() {
    if (
      this.isDestroyed ||
      !this.vignette?.active
    ) {
      return;
    }

    const {
      width,
      height
    } = this;

    this.vignette.clear();

    this.vignette.fillStyle(
      0x000000,
      0.1
    );

    this.vignette.fillRect(
      -width / 2,
      -height / 2,
      width,
      height
    );
  }

  resize(width, height) {
    if (this.isDestroyed) {
      return;
    }

    this.width = width;
    this.height = height;

    this.drawScanlines();
    this.drawNoise();
    this.drawVignette();
  }

  destroy() {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;

    this.stop();

    this.scanlines?.destroy?.();
    this.noise?.destroy?.();
    this.vignette?.destroy?.();

    this.scanlines = null;
    this.noise = null;
    this.vignette = null;

    this.scene = null;
  }
}