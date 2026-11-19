import { BASE_SPEED, rand } from './DriveShared.js';

export const DriveScenery = {
  buildSky() {
    const { W, H, horizonY: hz, biome: B } = this;

    const sky = this.add.graphics().setDepth(0);
    sky.fillGradientStyle(B.skyTop, B.skyTop, B.skyBottom, B.skyBottom, 1);
    sky.fillRect(0, 0, W, hz + 4);

    if (B.stars) {
      for (let i = 0; i < 90; i++) {
        sky.fillStyle(0xffffff, rand(0.3, 0.95));
        sky.fillRect(rand(0, W), rand(0, hz * 0.8), 2, 2);
      }
    }

    sky.fillStyle(B.sun, 0.22);
    sky.fillCircle(W * 0.72, hz * 0.55, hz * 0.22);
    sky.fillStyle(B.sun, 1);
    sky.fillCircle(W * 0.72, hz * 0.55, hz * 0.1);

    this.clouds = [];

    if (!B.stars) {
      for (let i = 0; i < 5; i++) {
        const cloud = this.add.image(rand(0, W), rand(hz * 0.1, hz * 0.6), 'drv_cloud')
          .setScale(rand(0.8, 1.6) * this.sx)
          .setAlpha(rand(0.5, 0.9))
          .setDepth(2);

        this.clouds.push(cloud);
      }
    }

    if (this.weather !== 'clear') {
      this.add.rectangle(W / 2, hz / 2, W, hz, 0x7d8a94, 0.4).setDepth(3);
    }
  },

  buildWorldLayers() {
    const { W, horizonY: hz } = this;

    this.hillsFar = this.add.tileSprite(0, hz + 2, W, this.hillH, this.hillKeyFar)
      .setOrigin(0, 1).setDepth(4);

    this.hillsNear = this.add.tileSprite(0, hz + 2, W, this.hillH, this.hillKeyNear)
      .setOrigin(0, 1).setDepth(5);

    this.roadGfx = this.add.graphics().setDepth(10);
  },

  buildWeather() {
    const { W, H, horizonY: hz, dashTop, biome: B } = this;

    // horizon haze
    const haze = this.add.graphics().setDepth(149);
    const hazeAlpha = this.weather === 'fog' ? 0.75 : 0.35;
    haze.fillGradientStyle(0xdfe6ea, 0xdfe6ea, 0xdfe6ea, 0xdfe6ea, 0, 0, hazeAlpha, hazeAlpha);
    haze.fillRect(0, hz - H * 0.12, W, H * 0.12);
    haze.fillGradientStyle(0xdfe6ea, 0xdfe6ea, 0xdfe6ea, 0xdfe6ea, hazeAlpha, hazeAlpha, 0, 0);
    haze.fillRect(0, hz, W, H * 0.14);

    if (this.weather === 'fog') {
      this.add.rectangle(W / 2, dashTop / 2, W, dashTop, 0xcfd6da, 0.16).setDepth(150);
    }

    if (B.darkness > 0) {
      this.add.rectangle(W / 2, dashTop / 2, W, dashTop, 0x000010, B.darkness).setDepth(150);

      this.add.image(W / 2, dashTop, 'drv_light')
        .setOrigin(0.5, 1)
        .setScale((W * 1.1) / 512, (H * 0.5) / 256)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(151);
    }

    if (this.weather === 'rain') {
      this.add.rectangle(W / 2, dashTop / 2, W, dashTop, 0x10161c, 0.22).setDepth(150);

      for (let i = 0; i < 70; i++) {
        const drop = this.add.image(
          rand(W * 0.06, W * 0.94),
          rand(H * 0.1, dashTop - 10),
          'drv_drop'
        )
          .setScale(rand(0.6, 1.6) * this.U)
          .setAlpha(rand(0.4, 0.9))
          .setDepth(165);

        this.drops.push(drop);
      }

      const pivotX = W * 0.52;
      const pivotY = dashTop - H * 0.005;

      this.wiper = this.add.rectangle(pivotX, pivotY, 10 * this.U, H * 0.36, 0x050506, 1)
        .setOrigin(0.5, 1)
        .setAngle(-78)
        .setDepth(168);

      this.createTrackedTween({
        targets: this.wiper,
        angle: 18,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        repeatDelay: 1800,
        ease: 'Sine.easeInOut',
        onYoyo: () => this.refreshDrops()
      });
    }
  },

  refreshDrops() {
    if (!this.drops.length) {
      return;
    }

    for (const drop of this.drops) {
      drop.setPosition(
        rand(this.W * 0.06, this.W * 0.94),
        rand(this.H * 0.1, this.dashTop - 10)
      );
      drop.setAlpha(0);
    }

    this.createTrackedTween({
      targets: this.drops,
      alpha: 0.75,
      duration: 900,
      delay: this.tweens.stagger ? this.tweens.stagger(12) : 0
    });
  },

  updateScenery(dt) {
    const sp = this.speed / BASE_SPEED;
    const turn = this.curveAt(this.pos + 250) * sp;

    this.hillsFar.tilePositionX += turn * dt * 60;
    this.hillsNear.tilePositionX += turn * dt * 110;

    for (const cloud of this.clouds) {
      cloud.x -= dt * (8 + this.speed * 0.02) + turn * dt * 40;

      if (cloud.x < -200) {
        cloud.x = this.W + 200;
      } else if (cloud.x > this.W + 220) {
        cloud.x = -180;
      }
    }
  }
};
