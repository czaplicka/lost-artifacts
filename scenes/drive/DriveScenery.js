import {
  BASE_SPEED,
  rand,
  clamp
} from './DriveShared.js';

const smooth = (value, target, rate, dt) =>
  value + (target - value) * (1 - Math.exp(-rate * dt));

export const DriveScenery = {
  buildSky() {
    const {
      W,
      H,
      horizonY: hz,
      biome: B
    } = this;

    this._sceneryMotion = {
      look: 0,
      previousLook: 0
    };

    const sky = this.add.graphics().setDepth(0);

    sky.fillGradientStyle(
      B.skyTop,
      B.skyTop,
      B.skyBottom,
      B.skyBottom,
      1
    );

    sky.fillRect(0, 0, W, hz + 4);

    const dark = B.stars || B.darkness > 0.15;
    const overcast =
      this.weather === 'rain' ||
      this.weather === 'fog';

    if (B.stars) {
      const size = Math.max(1, Math.round(this.U * 2));

      for (let i = 0; i < 90; i++) {
        sky.fillStyle(0xf2eee0, rand(0.25, 0.8));

        sky.fillRect(
          Math.round(rand(0, W)),
          Math.round(rand(H * 0.035, hz * 0.82)),
          size,
          size
        );
      }
    }

    const sunX = W * 0.72;
    const sunY = hz * 0.55;

    sky.fillStyle(
      B.sun,
      overcast ? 0.035 : dark ? 0.06 : 0.11
    );
    sky.fillCircle(sunX, sunY, hz * 0.2);

    sky.fillStyle(B.sun, overcast ? 0.28 : 0.9);
    sky.fillCircle(
      sunX,
      sunY,
      hz * (dark ? 0.065 : 0.085)
    );

    this.clouds = [];

    if (!B.stars) {
      const count = overcast ? 8 : 5;

      for (let i = 0; i < count; i++) {
        const cloud = this.add.image(
          rand(-W * 0.1, W * 1.1),
          rand(hz * 0.12, hz * 0.65),
          'drv_cloud'
        )
          .setScale(rand(0.8, 1.6) * this.sx)
          .setAlpha(
            overcast ? rand(0.3, 0.5) : rand(0.45, 0.7)
          )
          .setDepth(2);

        if (overcast) cloud.setTint(0x9ba4ad);

        cloud.setData('wind', rand(3, 8));
        cloud.setData('parallax', rand(0.7, 1.2));

        this.clouds.push(cloud);
      }
    }

    if (overcast) {
      this.add.rectangle(
        W / 2,
        hz / 2,
        W,
        hz,
        dark ? 0x18202e : 0x6d7c88,
        this.weather === 'rain' ? 0.24 : 0.16
      ).setDepth(3);
    }
  },

  buildWorldLayers() {
    const { W, horizonY: hz } = this;

    this.hillsFar = this.add.tileSprite(
      0,
      hz + 2,
      W,
      this.hillH,
      this.hillKeyFar
    )
      .setOrigin(0, 1)
      .setAlpha(0.72)
      .setDepth(4);

    this.hillsNear = this.add.tileSprite(
      0,
      hz + 2,
      W,
      this.hillH,
      this.hillKeyNear
    )
      .setOrigin(0, 1)
      .setDepth(5);

    this.roadGfx = this.add.graphics().setDepth(10);
  },

  buildWeather() {
    const {
      W,
      H,
      horizonY: hz,
      dashTop,
      biome: B
    } = this;

    this.drops = [];
    this.wiper = null;
    this._rainStreaks = null;
    this._wiperClock = 0;
    this._wiperPreviousAngle = -78;

    const dark = B.stars || B.darkness > 0.15;
    const fog = this.weather === 'fog';
    const rain = this.weather === 'rain';

    const hazeColor = dark ? B.skyBottom : 0xd6ddd7;
    const hazeAlpha = fog ? 0.62 : dark ? 0.09 : 0.2;

    const haze = this.add.graphics().setDepth(149);

    haze.fillGradientStyle(
      hazeColor,
      hazeColor,
      hazeColor,
      hazeColor,
      0,
      0,
      hazeAlpha,
      hazeAlpha
    );

    haze.fillRect(
      0,
      hz - H * 0.09,
      W,
      H * 0.09
    );

    haze.fillGradientStyle(
      hazeColor,
      hazeColor,
      hazeColor,
      hazeColor,
      hazeAlpha,
      hazeAlpha,
      0,
      0
    );

    haze.fillRect(
      0,
      hz,
      W,
      H * (fog ? 0.23 : 0.12)
    );

    if (fog) {
      this.add.rectangle(
        W / 2,
        dashTop / 2,
        W,
        dashTop,
        dark ? 0x465061 : 0xcfd6da,
        dark ? 0.09 : 0.12
      ).setDepth(150);
    }

    if (B.darkness > 0) {
      this.add.rectangle(
        W / 2,
        dashTop / 2,
        W,
        dashTop,
        0x000010,
        B.darkness
      ).setDepth(150);

      this.add.image(
        W / 2,
        dashTop,
        'drv_light'
      )
        .setOrigin(0.5, 1)
        .setScale(
          (W * 1.1) / 512,
          (H * 0.5) / 256
        )
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(151);
    }

    if (!rain) return;

    this.add.rectangle(
      W / 2,
      dashTop / 2,
      W,
      dashTop,
      0x101a25,
      dark ? 0.12 : 0.18
    ).setDepth(150);

    this._rainStreaks = this.add.graphics().setDepth(160);
    this._rainParticles = [];

    for (let i = 0; i < 45; i++) {
      this._rainParticles.push({
        x: rand(W * 0.04, W * 0.96),
        y: rand(H * 0.09, dashTop),
        depth: rand(0.3, 1),
        alpha: rand(0.08, 0.22)
      });
    }

    for (let i = 0; i < 70; i++) {
      const drop = this.add.image(
        rand(W * 0.08, W * 0.92),
        rand(H * 0.1, dashTop - H * 0.015),
        'drv_drop'
      )
        .setScale(rand(0.55, 1.25) * this.U)
        .setAlpha(rand(0.08, 0.5))
        .setDepth(165);

      drop.setData('targetAlpha', rand(0.25, 0.65));
      drop.setData('recovery', rand(0.08, 0.17));

      this.drops.push(drop);
    }

    this._wiperPivotX = W * 0.52;
    this._wiperPivotY = dashTop - H * 0.005;
    this._wiperLength = H * 0.36;

    this.wiper = this.add.rectangle(
      this._wiperPivotX,
      this._wiperPivotY,
      Math.max(2, 7 * this.U),
      this._wiperLength,
      0x08090b,
      1
    )
      .setOrigin(0.5, 1)
      .setAngle(-78)
      .setDepth(168);
  },

  refreshDrops() {
    if (!this.wiper || !this.drops?.length) return;

    const angle = this.wiper.angle;
    const previous = this._wiperPreviousAngle ?? angle;

    const low = Math.min(previous, angle) - 4;
    const high = Math.max(previous, angle) + 4;

    for (const drop of this.drops) {
      if (!drop.scene) continue;

      const dx = drop.x - this._wiperPivotX;
      const dy = drop.y - this._wiperPivotY;
      const distance = Math.hypot(dx, dy);

      const dropAngle =
        Math.atan2(dx, -dy) * 180 / Math.PI;

      if (
        distance <= this._wiperLength &&
        dropAngle >= low &&
        dropAngle <= high
      ) {
        drop.setAlpha(0);
      }
    }

    this._wiperPreviousAngle = angle;
  },

  updateScenery(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;

    const sp = Math.max(0, this.speed / BASE_SPEED);
    const turn = this.curveAt(this.pos + 250) * sp;
    const motion = this._sceneryMotion;

    motion.previousLook = motion.look;

    motion.look = smooth(
      motion.look,
      this.playerX * 9 * this.sx,
      4,
      dt
    );

    const lookDelta = motion.look - motion.previousLook;

    this.hillsFar.tilePositionX +=
      turn * dt * 45 + lookDelta * 0.35;

    this.hillsNear.tilePositionX +=
      turn * dt * 95 + lookDelta * 0.8;

    for (const cloud of this.clouds) {
      const wind = cloud.getData('wind') ?? 5;
      const parallax = cloud.getData('parallax') ?? 1;

      cloud.x -=
        dt * wind * this.sx +
        turn * dt * 25 * parallax +
        lookDelta * 0.2 * parallax;

      const margin = Math.max(
        this.W * 0.12,
        cloud.displayWidth
      );

      if (cloud.x < -margin) {
        cloud.x = this.W + margin;
      } else if (cloud.x > this.W + margin) {
        cloud.x = -margin;
      }
    }

    if (this.weather !== 'rain' || !this.wiper) return;

    this.updateDriveRain(dt, sp);
  },

  updateDriveRain(dt, sp) {
    const { W, H, U, dashTop } = this;
    const g = this._rainStreaks;

    const minX = W * 0.04;
    const maxX = W * 0.96;
    const minY = H * 0.09;
    const maxY = dashTop;

    g.clear();

    for (const particle of this._rainParticles) {
      const depth = particle.depth;

      particle.y +=
        H * (0.2 + depth * 0.35 + sp * 0.08) * dt;

      particle.x -=
        W * (0.025 + sp * 0.015) * depth * dt;

      if (
        particle.y > maxY ||
        particle.x < minX
      ) {
        particle.y = minY;
        particle.x = rand(minX, maxX);
      }

      const length = H * (
        0.008 + depth * 0.014 + sp * 0.004
      );

      const endX = Math.max(
        minX,
        particle.x - length * 0.3
      );

      const endY = Math.min(
        maxY,
        particle.y + length
      );

      g.lineStyle(
        Math.max(1, U * depth),
        0xc3d7e5,
        particle.alpha
      );

      g.lineBetween(
        particle.x,
        particle.y,
        endX,
        endY
      );
    }

    for (const drop of this.drops) {
      if (!drop.scene) continue;

      const target = drop.getData('targetAlpha');
      const recovery = drop.getData('recovery');

      drop.setAlpha(
        Math.min(target, drop.alpha + recovery * dt)
      );
    }

    // One outward sweep, return sweep, then a short pause.
    const outward = 0.68;
    const returning = 0.58;
    const pause = 1.15;
    const cycle = outward + returning + pause;

    this._wiperClock = (this._wiperClock + dt) % cycle;

    let angle = -78;

    if (this._wiperClock < outward) {
      const progress = this._wiperClock / outward;
      const eased = (1 - Math.cos(progress * Math.PI)) / 2;

      angle = -78 + eased * 96;
    } else if (this._wiperClock < outward + returning) {
      const progress =
        (this._wiperClock - outward) / returning;

      const eased = (1 - Math.cos(progress * Math.PI)) / 2;

      angle = 18 - eased * 96;
    }

    this.wiper.setAngle(angle);
    this.refreshDrops();
  }
};