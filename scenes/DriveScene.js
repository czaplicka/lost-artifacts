import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import {
  BIOMES,
  FLAVOUR,
  OBSTACLES,
  HOME_TOWN_ID,
  getTown
} from '../config/RoadTripTowns.js';
import {
  getRoadTripQuote,
  computeOutcome,
  applyOutcome
} from '../managers/RoadTripManager.js';

/**
 * DriveScene - first-person drive through the windshield.
 *
 * Pseudo-3D road (OutRun style) drawn procedurally, every sprite is generated
 * from Phaser Graphics at runtime, so the scene needs ZERO external assets.
 *
 * Start it with RoadTripManager.startRoadTrip(...) or directly:
 *   this.goto('DriveScene', {
 *     fromTownId, toTownId,
 *     nextScene: 'SomeMissionScene', nextData: {...}
 *   });
 *
 * Controls: LEFT/RIGHT or A/D steer, UP/W boost, DOWN/S brake,
 * pointer/touch: hold left/right of the screen centre to steer.
 */

const Z0 = 30;              // perspective constant: u = Z0 / distance
const ROAD_HALF = 0.40;     // road half-width at the screen bottom (fraction of W)
const DRAW_DIST = 1100;
const BASE_SPEED = 165;     // scene units per second
const COIN_VALUE = 2;
const FINE_AMOUNT = 15;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const poly = (g, pts) => {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);

  for (let i = 1; i < pts.length; i++) {
    g.lineTo(pts[i][0], pts[i][1]);
  }

  g.closePath();
  g.fillPath();
};

export class DriveScene extends BaseScene {
  constructor() {
    super({ key: 'DriveScene' });
  }

  // ------------------------------------------------------------------
  // init
  // ------------------------------------------------------------------

  init(data = {}) {
    this.driveData = { toTownId: HOME_TOWN_ID, ...data };

    this.state = 'driving'; // driving | arriving | summary | leaving
    this.ready = false;

    this.pos = 0;
    this.speed = 0;
    this.speedMul = 1;
    this.playerX = 0;
    this.steerVel = 0;
    this.clock = 0;
    this.driveTime = 0;
    this.arriveTime = 0;
    this.invuln = 0;
    this.rumbleCd = 0;
    this.uiTick = 0;
    this.idleTimer = rand(6, 9);
    this.bubbleUntil = 0;
    this.bubble = null;
    this.uiHeld = false;
    this.seed = Math.random() * 100;

    this.objects = [];
    this.drops = [];
    this.stats = { hits: 0, coffees: 0, coins: 0, fines: 0, autopilot: false };

    this.outcome = null;
    this.applied = false;
    this.summaryReady = false;
    this.gate = null;
    this.clouds = [];
    this.stationIndex = Math.floor(Math.random() * FLAVOUR.radio.length);
  }

  // ------------------------------------------------------------------
  // create
  // ------------------------------------------------------------------

  create() {
    super.create();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onSceneShutdown, this);

    this.hideTravelUi();

    const { width: W, height: H } = this.scale;

    this.W = W;
    this.H = H;
    this.U = Math.min(W / 1920, H / 1080);
    this.sx = W / 1920;

    this.horizonY = H * 0.40;
    this.dashTop = H * 0.66;
    this.step = Math.max(3, Math.round(4 * H / 1080));
    this.rowCount = Math.ceil((H - this.horizonY) / this.step);
    this.rowCx = new Float32Array(this.rowCount + 2);
    this.curveK = 0.05 * (W / 1920);

    const uDash = (this.dashTop - this.horizonY) / (H - this.horizonY);
    this.cullDz = (Z0 / uDash) * 0.92;
    this.hitDz = this.cullDz * 1.12;

    const data = this.driveData;
    this.quote = data.quote || getRoadTripQuote(data.fromTownId, data.toTownId);
    this.fromTown = this.quote.fromTown;
    this.town = this.quote.toTown;
    this.biome = BIOMES[this.town.biome] || BIOMES.meadow;
    this.weather = this.town.weather || 'clear';
    this.L = this.quote.tripLength;

    this.nextDecorZ = 40;
    this.nextObstacleZ = 520;
    this.nextBillboardZ = 330;
    this.nextCamZ = 1300 + rand(0, 600);
    this.gateSpawned = false;
    this.startSignSpawned = false;

    this.buildTextures();
    this.buildSky();
    this.buildWorldLayers();
    this.buildWeather();
    this.buildDash();
    this.buildHud();
    this.buildInput();

    this.cameras.main.fadeIn(450, 0, 0, 0);

    this.spawnAhead();
    this.ready = true;

    this.time.delayedCall(900, () => {
      this.say(`Next stop: ${this.town.name}. ${this.town.tagline}`, 4200, true);
    });
  }

  hideTravelUi() {
    this.game.events.emit('setHudVisible', false);
    EventBus.emit('hideHUD');
    this.sleepPlayerHud();
    this.sleepSceneIfActive('NewsHud');
  }

  px(n) {
    return `${Math.max(8, Math.round(n * this.U))}px`;
  }

  // ------------------------------------------------------------------
  // Procedural textures
  // ------------------------------------------------------------------

  gen(key, w, h, draw) {
    if (this.textures.exists(key)) {
      return;
    }

    const g = this.make.graphics({ x: 0, y: 0, add: false });
    draw(g, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  buildTextures() {
    const gen = (k, w, h, f) => this.gen(k, w, h, f);

    gen('drv_tree_round', 160, 260, g => {
      g.fillStyle(0x6b4a2b, 1); g.fillRect(68, 160, 24, 100);
      g.fillStyle(0x2c6e2f, 1);
      g.fillCircle(80, 110, 62); g.fillCircle(46, 140, 42); g.fillCircle(114, 140, 42);
      g.fillStyle(0x3f9a3d, 1);
      g.fillCircle(70, 95, 40); g.fillCircle(100, 120, 30);
    });

    const pine = (g, snow) => {
      g.fillStyle(0x5a3d22, 1); g.fillRect(60, 230, 20, 50);
      g.fillStyle(0x1f5a3a, 1);
      poly(g, [[70, 10], [125, 100], [15, 100]]);
      poly(g, [[70, 70], [130, 160], [10, 160]]);
      poly(g, [[70, 130], [135, 240], [5, 240]]);
      g.fillStyle(0x2a6b46, 1);
      poly(g, [[70, 10], [125, 100], [70, 100]]);
      poly(g, [[70, 70], [130, 160], [70, 160]]);
      if (snow) {
        g.fillStyle(0xffffff, 1);
        poly(g, [[70, 10], [100, 52], [40, 52]]);
        poly(g, [[70, 70], [106, 118], [34, 118]]);
        poly(g, [[70, 130], [112, 190], [28, 190]]);
      }
    };

    gen('drv_pine', 140, 280, g => pine(g, false));
    gen('drv_pine_snow', 140, 280, g => pine(g, true));

    gen('drv_cactus', 100, 200, g => {
      g.fillStyle(0x3c8a4a, 1);
      g.fillRoundedRect(38, 20, 26, 180, 12);
      g.fillRoundedRect(8, 80, 36, 16, 8); g.fillRoundedRect(8, 50, 16, 46, 8);
      g.fillRoundedRect(58, 100, 34, 16, 8); g.fillRoundedRect(76, 70, 16, 46, 8);
      g.fillStyle(0x5bb369, 1); g.fillRect(46, 30, 4, 160);
    });

    gen('drv_palm', 160, 280, g => {
      g.fillStyle(0x8a6a3a, 1);
      poly(g, [[72, 280], [90, 280], [96, 110], [80, 110]]);
      g.fillStyle(0x2f9a52, 1);
      poly(g, [[84, 100], [10, 70], [30, 104]]);
      poly(g, [[84, 100], [158, 70], [138, 104]]);
      poly(g, [[84, 100], [30, 20], [62, 84]]);
      poly(g, [[84, 100], [138, 20], [106, 84]]);
      poly(g, [[84, 100], [84, 4], [98, 84]]);
      g.fillStyle(0x5a3d22, 1); g.fillCircle(80, 106, 7); g.fillCircle(92, 108, 7);
    });

    gen('drv_bush', 120, 70, g => {
      g.fillStyle(0x2f7d32, 1);
      g.fillCircle(30, 45, 26); g.fillCircle(60, 38, 32); g.fillCircle(90, 46, 26);
      g.fillStyle(0x44a043, 1); g.fillCircle(55, 30, 16);
    });

    gen('drv_rock', 110, 70, g => {
      g.fillStyle(0x7d7f86, 1);
      poly(g, [[5, 70], [20, 25], [50, 8], [85, 20], [105, 70]]);
      g.fillStyle(0x9a9ca3, 1);
      poly(g, [[20, 25], [50, 8], [60, 30], [35, 42]]);
    });

    gen('drv_lamp', 60, 260, g => {
      g.fillStyle(0x2a2a30, 1);
      g.fillRect(27, 40, 6, 220); g.fillRect(27, 36, 26, 5);
      g.fillRoundedRect(42, 30, 16, 10, 3);
      g.fillStyle(0xffd27a, 0.35); g.fillCircle(50, 44, 22);
      g.fillStyle(0xfff0b0, 0.95); g.fillCircle(50, 40, 5);
    });

    gen('drv_house', 220, 200, g => {
      g.fillStyle(0xb9a27d, 1); g.fillRect(10, 70, 200, 130);
      g.fillStyle(0x8a3b2e, 1); poly(g, [[0, 75], [110, 5], [220, 75]]);
      g.fillStyle(0x5a3d22, 1); g.fillRect(95, 130, 32, 70);
      g.fillStyle(0xffe08a, 1); g.fillRect(30, 100, 40, 40); g.fillRect(150, 100, 40, 40);
      g.lineStyle(3, 0x3b2d20, 1); g.strokeRect(30, 100, 40, 40); g.strokeRect(150, 100, 40, 40);
    });

    gen('drv_pothole', 200, 50, g => {
      g.fillStyle(0x1c1c20, 1); g.fillEllipse(100, 28, 190, 40);
      g.fillStyle(0x0b0b0d, 1); g.fillEllipse(100, 28, 150, 28);
    });

    gen('drv_cone', 70, 90, g => {
      g.fillStyle(0x333338, 1); g.fillRect(5, 80, 60, 10);
      g.fillStyle(0xff7a1a, 1); poly(g, [[35, 5], [60, 82], [10, 82]]);
      g.fillStyle(0xffffff, 1); poly(g, [[28, 36], [42, 36], [46, 54], [24, 54]]);
    });

    gen('drv_cow', 220, 150, g => {
      g.fillStyle(0xe8e8e2, 1);
      g.fillRect(45, 100, 12, 45); g.fillRect(78, 100, 12, 45);
      g.fillRect(122, 100, 12, 45); g.fillRect(150, 100, 12, 45);
      g.fillStyle(0xf4f4f0, 1); g.fillRoundedRect(30, 35, 140, 70, 18);
      g.fillStyle(0x222222, 1);
      g.fillEllipse(70, 60, 34, 26); g.fillEllipse(125, 75, 30, 22); g.fillEllipse(100, 45, 20, 14);
      g.fillStyle(0xf4f4f0, 1); g.fillRoundedRect(158, 40, 50, 44, 10);
      g.fillStyle(0xf2a7b0, 1); g.fillRoundedRect(190, 66, 18, 16, 5);
      g.fillStyle(0xd9c9a0, 1); g.fillRect(162, 30, 6, 12); g.fillRect(196, 30, 6, 12);
      g.fillStyle(0x000000, 1); g.fillCircle(185, 54, 3.5);
      g.lineStyle(4, 0x333333, 1); g.lineBetween(30, 50, 14, 90);
    });

    gen('drv_chicken', 90, 100, g => {
      g.lineStyle(4, 0xf4a300, 1);
      g.lineBetween(36, 82, 34, 100); g.lineBetween(50, 82, 52, 100);
      g.fillStyle(0xfafafa, 1);
      g.fillEllipse(42, 60, 56, 48); g.fillCircle(66, 34, 14);
      poly(g, [[14, 52], [0, 32], [22, 46]]);
      g.fillStyle(0xd62828, 1); g.fillCircle(66, 19, 6);
      g.fillStyle(0xf4a300, 1); poly(g, [[78, 32], [92, 37], [78, 41]]);
      g.fillStyle(0x000000, 1); g.fillCircle(70, 31, 2.5);
    });

    gen('drv_tumble', 120, 110, g => {
      g.fillStyle(0x9a6b35, 0.55); g.fillCircle(60, 58, 46);
      g.lineStyle(3, 0x6e4a22, 1);
      g.strokeCircle(60, 58, 46); g.strokeCircle(60, 58, 30);
      g.lineBetween(20, 30, 100, 86); g.lineBetween(24, 88, 98, 28); g.lineBetween(60, 12, 60, 104);
    });

    gen('drv_crab', 160, 90, g => {
      g.lineStyle(5, 0xb52720, 1);
      g.lineBetween(40, 60, 14, 80); g.lineBetween(120, 60, 146, 80);
      g.lineBetween(50, 68, 30, 88); g.lineBetween(110, 68, 130, 88);
      g.lineBetween(46, 44, 24, 30); g.lineBetween(114, 44, 136, 30);
      g.fillStyle(0xd7322b, 1);
      g.fillEllipse(80, 54, 90, 54);
      g.fillCircle(22, 26, 17); g.fillCircle(138, 26, 17);
      g.fillStyle(0x1b1b1b, 1); g.fillTriangle(22, 26, 12, 8, 32, 10);
      g.fillStyle(0xffffff, 1); g.fillCircle(68, 30, 7); g.fillCircle(92, 30, 7);
      g.fillStyle(0x000000, 1); g.fillCircle(68, 31, 3); g.fillCircle(92, 31, 3);
    });

    gen('drv_coffee', 70, 80, g => {
      g.fillStyle(0xffd24a, 0.35); g.fillCircle(35, 45, 32);
      g.fillStyle(0xffffff, 1); poly(g, [[12, 30], [58, 30], [52, 74], [18, 74]]);
      g.fillStyle(0x5a3412, 1); g.fillEllipse(35, 30, 46, 10);
      g.lineStyle(5, 0xffffff, 1); g.strokeCircle(60, 50, 9);
      g.lineStyle(3, 0xffffff, 0.85);
      g.lineBetween(26, 22, 22, 8); g.lineBetween(38, 22, 42, 6);
    });

    gen('drv_coin', 70, 70, g => {
      g.fillStyle(0xf2b705, 1); g.fillCircle(35, 35, 28);
      g.fillStyle(0xffd84d, 1); g.fillCircle(35, 35, 22);
      g.lineStyle(5, 0xb07d00, 1);
      g.lineBetween(35, 18, 35, 52); g.strokeCircle(35, 35, 9);
    });

    gen('drv_cam', 90, 200, g => {
      g.fillStyle(0x55585f, 1); g.fillRect(40, 60, 10, 140);
      g.fillStyle(0x3b3f47, 1); g.fillRoundedRect(10, 10, 70, 60, 6);
      g.fillStyle(0x111111, 1); g.fillCircle(45, 40, 14);
      g.fillStyle(0x4aa3ff, 1); g.fillCircle(45, 40, 7);
      g.fillStyle(0xff3b3b, 1); g.fillCircle(70, 18, 4);
    });

    gen('drv_drop', 12, 16, g => {
      g.fillStyle(0xcfe6ff, 0.55); g.fillEllipse(6, 9, 9, 13);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(4, 6, 2);
    });

    gen('drv_cloud', 240, 90, g => {
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(60, 55, 32); g.fillCircle(105, 40, 40); g.fillCircle(150, 52, 34);
      g.fillRect(60, 55, 95, 32);
    });

    gen('drv_light', 512, 256, g => {
      for (let i = 0; i < 14; i++) {
        g.fillStyle(0xfff3c4, 0.05);
        g.fillEllipse(256, 256, 512 - i * 30, 512 - i * 34);
      }
    });

    gen('drv_dino', 120, 130, g => {
      g.fillStyle(0xf2a93b, 1);
      poly(g, [[40, 56], [32, 40], [50, 50]]);
      poly(g, [[52, 46], [48, 30], [64, 42]]);
      g.fillStyle(0x7ed957, 1);
      poly(g, [[26, 90], [0, 108], [30, 106]]);
      g.fillEllipse(55, 86, 70, 62);
      g.fillStyle(0xc7f0a0, 1); g.fillEllipse(60, 94, 40, 40);
      g.fillStyle(0x5fb83f, 1); g.fillRect(36, 110, 16, 18); g.fillRect(62, 110, 16, 18);
      g.fillStyle(0x7ed957, 1);
      g.fillCircle(76, 44, 26); g.fillRoundedRect(80, 40, 34, 26, 9);
      g.fillStyle(0xffffff, 1); g.fillCircle(78, 34, 9);
      g.fillStyle(0x000000, 1); g.fillCircle(81, 34, 4);
      g.fillStyle(0x3d7a26, 1); g.fillCircle(104, 46, 2.5);
      g.lineStyle(3, 0x3d7a26, 1); g.lineBetween(90, 62, 108, 60);
      g.fillStyle(0x7ed957, 1); g.fillRoundedRect(74, 80, 22, 8, 4);
    });

    gen('drv_die', 84, 84, g => {
      g.fillStyle(0xb3122a, 1); g.fillRoundedRect(2, 2, 80, 80, 16);
      g.lineStyle(4, 0xd83a52, 0.9); g.strokeRoundedRect(2, 2, 80, 80, 16);
      g.fillStyle(0x1a0a0a, 1);
      [[22, 22], [62, 22], [42, 42], [22, 62], [62, 62]].forEach(([x, y]) => g.fillCircle(x, y, 7));
    });

    this.buildWheelTexture();
    this.buildHillTextures();
  }

  buildWheelTexture() {
    const R = Math.round(this.H * 0.27);
    this.wheelR = R;

    this.gen(`drv_wheel_${R}`, R * 2, R * 2, g => {
      g.lineStyle(R * 0.17, 0x151518, 1); g.strokeCircle(R, R, R * 0.86);
      g.lineStyle(3, 0x30323a, 1); g.strokeCircle(R, R, R * 0.945);
      g.lineStyle(3, 0x30323a, 1); g.strokeCircle(R, R, R * 0.775);

      g.lineStyle(R * 0.1, 0x1a1a1f, 1);
      g.lineBetween(R, R, R * 0.2, R * 1.04);
      g.lineBetween(R, R, R * 1.8, R * 1.04);
      g.lineBetween(R, R, R, R * 1.8);

      g.fillStyle(0x1c1c21, 1); g.fillCircle(R, R, R * 0.27);
      g.lineStyle(4, 0x6b6b75, 1); g.strokeCircle(R, R, R * 0.19);
      g.fillStyle(0x8a8a95, 1); g.fillEllipse(R, R, R * 0.2, R * 0.14);

      g.fillStyle(0xd4af37, 1); g.fillRect(R - 4, R * 0.04, 8, R * 0.2);
    });
  }

  buildHillTextures() {
    const B = this.biome;
    const hH = Math.round(this.H * 0.16);
    this.hillH = hH;

    const make = (key, color, amp, k1, k2, base) => {
      this.gen(key, 1024, hH, g => {
        g.fillStyle(color, 1);
        g.beginPath();
        g.moveTo(0, hH);

        for (let x = 0; x <= 1024; x += 16) {
          const y =
            hH - base -
            (Math.sin((x / 1024) * Math.PI * 2 * k1) * 0.55 +
              Math.sin((x / 1024) * Math.PI * 2 * k2 + 1.3) * 0.45) * amp * B.hillAmp;
          g.lineTo(x, y);
        }

        g.lineTo(1024, hH);
        g.closePath();
        g.fillPath();
      });
    };

    this.hillKeyFar = `drv_hills_${B.id}_far_${hH}`;
    this.hillKeyNear = `drv_hills_${B.id}_near_${hH}`;

    make(this.hillKeyFar, B.hillFar, hH * 0.42, 3, 7, hH * 0.5);
    make(this.hillKeyNear, B.hill, hH * 0.34, 5, 11, hH * 0.22);
  }

  // ------------------------------------------------------------------
  // Sky, hills, road layer
  // ------------------------------------------------------------------

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
  }

  buildWorldLayers() {
    const { W, horizonY: hz } = this;

    this.hillsFar = this.add.tileSprite(0, hz + 2, W, this.hillH, this.hillKeyFar)
      .setOrigin(0, 1).setDepth(4);

    this.hillsNear = this.add.tileSprite(0, hz + 2, W, this.hillH, this.hillKeyNear)
      .setOrigin(0, 1).setDepth(5);

    this.roadGfx = this.add.graphics().setDepth(10);
  }

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
  }

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
  }

  // ------------------------------------------------------------------
  // Dashboard
  // ------------------------------------------------------------------

  buildDash() {
    const { W, H, U, dashTop: top } = this;

    const dashKey = `drv_dash_${Math.round(W)}x${Math.round(H)}`;

    this.gen(dashKey, Math.round(W), Math.round(H), g => {
      // roof liner
      g.fillStyle(0x0c0c0e, 1); g.fillRect(0, 0, W, H * 0.085);
      g.fillStyle(0x1b1b20, 1); g.fillRect(0, H * 0.085, W, H * 0.008);

      // A-pillars
      g.fillStyle(0x0a0a0c, 1);
      poly(g, [[0, 0], [W * 0.19, 0], [W * 0.075, top + H * 0.01], [0, top + H * 0.06]]);
      poly(g, [[W, 0], [W * 0.86, 0], [W * 0.95, top], [W, top + H * 0.05]]);
      g.lineStyle(3, 0x1d1e24, 1);
      g.lineBetween(W * 0.19, 0, W * 0.075, top + H * 0.01);
      g.lineBetween(W * 0.86, 0, W * 0.95, top);

      // glass glare
      g.fillStyle(0xffffff, 0.035);
      poly(g, [[W * 0.27, H * 0.09], [W * 0.43, H * 0.09], [W * 0.31, top], [W * 0.15, top]]);

      // rear-view mirror
      g.fillStyle(0x0e0e10, 1); g.fillRect(W * 0.665, H * 0.085, W * 0.02, H * 0.03);
      g.fillStyle(0x121316, 1); g.fillRoundedRect(W * 0.56, H * 0.105, W * 0.22, H * 0.075, 14);
      g.fillStyle(0x20262c, 1); g.fillRoundedRect(W * 0.568, H * 0.113, W * 0.204, H * 0.059, 10);
      g.fillStyle(0xffffff, 0.06); g.fillRect(W * 0.58, H * 0.12, W * 0.18, H * 0.012);

      // dash surface
      g.fillStyle(0x121317, 1);
      poly(g, [
        [0, top + H * 0.06], [W * 0.075, top + H * 0.01], [W * 0.35, top - H * 0.005],
        [W * 0.65, top - H * 0.012], [W * 0.95, top], [W, top + H * 0.05], [W, H], [0, H]
      ]);
      g.lineStyle(3, 0x2b2e36, 1);
      g.lineBetween(W * 0.075, top + H * 0.01, W * 0.35, top - H * 0.005);
      g.lineBetween(W * 0.35, top - H * 0.005, W * 0.65, top - H * 0.012);
      g.lineBetween(W * 0.65, top - H * 0.012, W * 0.95, top);

      // instrument cluster
      const cx0 = W * 0.27, cy0 = top + H * 0.012, cw = W * 0.27, ch = H * 0.115;
      g.fillStyle(0x08080a, 1); g.fillRoundedRect(cx0, cy0, cw, ch, 18);
      g.lineStyle(3, 0x24262c, 1); g.strokeRoundedRect(cx0, cy0, cw, ch, 18);

      for (const gx of [W * 0.33, W * 0.48]) {
        const gy = top + H * 0.07, gr = H * 0.05;
        g.fillStyle(0x1a1d24, 1); g.fillCircle(gx, gy, gr);
        g.lineStyle(3, 0x9aa6b2, 1); g.strokeCircle(gx, gy, gr);

        for (let k = 0; k <= 10; k++) {
          const a = Phaser.Math.DegToRad(135 + 27 * k);
          g.lineStyle(k >= 9 ? 3 : 2, k >= 9 ? 0xff5a3c : 0xcfd6dd, 1);
          g.lineBetween(
            gx + Math.cos(a) * gr * 0.78, gy + Math.sin(a) * gr * 0.78,
            gx + Math.cos(a) * gr * 0.94, gy + Math.sin(a) * gr * 0.94
          );
        }
      }

      // infotainment
      const ix = W * 0.595, iy = top + H * 0.012, iw = W * 0.175, ih = H * 0.2;
      g.fillStyle(0x08080a, 1); g.fillRoundedRect(ix, iy, iw, ih, 14);
      g.lineStyle(3, 0x24262c, 1); g.strokeRoundedRect(ix, iy, iw, ih, 14);
      g.fillStyle(0x0f1a14, 1); g.fillRoundedRect(ix + 10, iy + 10, iw - 20, ih * 0.58, 8);
      g.lineStyle(2, 0x1f3a2a, 1); g.strokeRoundedRect(ix + 10, iy + 10, iw - 20, ih * 0.58, 8);

      g.fillStyle(0x1d1f25, 1);
      for (let k = 0; k < 6; k++) {
        g.fillRoundedRect(ix + 14 + k * ((iw - 28) / 6), iy + ih * 0.75, (iw - 28) / 6 - 6, ih * 0.14, 4);
      }

      g.fillStyle(0x2d6cdf, 1); g.fillCircle(ix - 10, iy + ih * 0.5, 20 * U);
      g.fillStyle(0xd93a3a, 1); g.fillCircle(ix + iw + 10, iy + ih * 0.5, 20 * U);
      g.fillStyle(0x15161a, 1);
      g.fillCircle(ix - 10, iy + ih * 0.5, 12 * U); g.fillCircle(ix + iw + 10, iy + ih * 0.5, 12 * U);

      // gear stick
      g.fillStyle(0x0b0b0d, 1);
      g.fillRoundedRect(W * 0.8, H * 0.86, W * 0.03, H * 0.14, 10);
      g.fillStyle(0x1b1b20, 1); g.fillCircle(W * 0.815, H * 0.86, W * 0.022);
    });

    this.add.image(0, 0, dashKey).setOrigin(0, 0).setDepth(210);

    // gauge needles + digital speed
    this.gaugeGfx = this.add.graphics().setDepth(212);

    this.speedText = this.add.text(W * 0.405, top + H * 0.062, '0', {
      fontFamily: 'PressStart2P', fontSize: this.px(20), color: '#cfe8ff'
    }).setOrigin(0.5).setDepth(213);

    this.add.text(W * 0.405, top + H * 0.092, 'KM/H', {
      fontFamily: 'PressStart2P', fontSize: this.px(9), color: '#7d8fa3'
    }).setOrigin(0.5).setDepth(213);

    // infotainment texts
    const ix = W * 0.595 + 18, iy = top + H * 0.012 + 16, iw = W * 0.175 - 36;

    this.rKm = this.add.text(ix, iy, '', {
      fontFamily: 'PressStart2P', fontSize: this.px(24), color: '#7dff9a'
    }).setDepth(213);

    this.rStation = this.add.text(ix, iy + 42 * U, '', {
      fontFamily: 'PressStart2P', fontSize: this.px(10), color: '#e9d27a'
    }).setDepth(213);

    this.rLine = this.add.text(ix, iy + 62 * U, '', {
      fontFamily: 'SpecialElite', fontSize: this.px(15), color: '#a9d8b4',
      wordWrap: { width: iw }
    }).setDepth(213);

    this.updateStation(false);

    this.radioZone = this.add.zone(
      W * 0.595 + W * 0.0875, top + H * 0.012 + H * 0.058, W * 0.175, H * 0.12
    ).setDepth(217).setInteractive({ useHandCursor: true });

    this.radioZone.on('pointerdown', () => {
      this.uiHeld = true;
      this.updateStation(true);
    });

    // fuzzy dice
    this.dice = this.add.container(W * 0.675, H * 0.115).setDepth(209);
    const rope = this.add.graphics();
    rope.lineStyle(3, 0xdddddd, 1);
    rope.lineBetween(0, 0, -26, 105);
    rope.lineBetween(0, 0, 22, 128);
    const d1 = this.add.image(-30, 140, 'drv_die').setScale(1.15 * this.U).setAngle(-12);
    const d2 = this.add.image(26, 160, 'drv_die').setScale(1.0 * this.U).setAngle(14);
    this.dice.add([rope, d1, d2]);
    this.dice.setScale(this.U);

    // dino on the dash
    const dinoScale = (H * 0.11) / 130;
    this.dinoBaseY = top + H * 0.012;

    this.dino = this.add.image(W * 0.52, this.dinoBaseY, 'drv_dino')
      .setOrigin(0.5, 1)
      .setScale(dinoScale)
      .setDepth(214)
      .setInteractive({ useHandCursor: true });

    this.dino.on('pointerdown', () => {
      this.uiHeld = true;
      this.say(pick(FLAVOUR.dinoClick), 2400, true);

      this.createTrackedTween({
        targets: this.dino,
        scaleY: dinoScale * 1.15,
        scaleX: dinoScale * 0.92,
        duration: 90,
        yoyo: true
      });
    });

    // steering wheel
    this.wheel = this.add.image(
      W * 0.40, H * 1.04, `drv_wheel_${this.wheelR}`
    ).setDepth(220);

    this.buildAutopilotButton();
  }

  buildAutopilotButton() {
    const { W, H, U, dashTop } = this;
    const x = W * 0.875, y = dashTop + H * 0.115, w = W * 0.1, h = H * 0.075;

    this.autoGfx = this.add.graphics().setDepth(215);
    this.autoGfx.fillStyle(0x1b2430, 1);
    this.autoGfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8 * U);
    this.autoGfx.lineStyle(3, 0xd4af37, 1);
    this.autoGfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8 * U);

    this.autoText = this.add.text(x, y, 'AUTO\nPILOT', {
      fontFamily: 'PressStart2P', fontSize: this.px(11), color: '#d4af37',
      align: 'center', lineSpacing: 6
    }).setOrigin(0.5).setDepth(216);

    this.autoGfx.setAlpha(0.3);
    this.autoText.setAlpha(0.3);

    this.autoZone = this.add.zone(x, y, w, h).setDepth(217);

    this.time.delayedCall(2000, () => {
      if (!this.autoZone?.scene) {
        return;
      }

      this.autoGfx.setAlpha(1);
      this.autoText.setAlpha(1);
      this.autoZone.setInteractive({ useHandCursor: true });

      this.autoZone.on('pointerdown', () => {
        this.uiHeld = true;
        this.autopilot();
      });

      this.autoZone.on('pointerover', () => {
        this.say('Autopilot: Dino drives. Dino has no license. Costs you 15 minutes.', 3200, true);
      });
    });
  }

  // ------------------------------------------------------------------
  // HUD (roof liner)
  // ------------------------------------------------------------------

  buildHud() {
    const { W, H, U } = this;

    this.hudBar = this.add.graphics().setDepth(230);

    this.add.text(W * 0.23, H * 0.03, this.fromTown.short, {
      fontFamily: 'PressStart2P', fontSize: this.px(13), color: '#f4e7c1'
    }).setOrigin(0, 0.5).setDepth(231);

    this.add.text(W * 0.77, H * 0.03, this.town.short, {
      fontFamily: 'PressStart2P', fontSize: this.px(13), color: '#d4af37'
    }).setOrigin(1, 0.5).setDepth(231);

    this.statsText = this.add.text(W / 2, H * 0.066, '', {
      fontFamily: 'PressStart2P', fontSize: this.px(11), color: '#9fb2c4'
    }).setOrigin(0.5).setDepth(231);

    this.refreshStats();

    this.introText = this.add.text(
      W / 2, H * 0.22,
      'LEFT / RIGHT: steer    UP: boost    DOWN: brake\nGrab coffee. Dodge livestock. Avoid speed cameras.',
      {
        fontFamily: 'SpecialElite', fontSize: this.px(26), color: '#f4e7c1',
        backgroundColor: '#1a130e', align: 'center', padding: { x: 18 * U, y: 12 * U }
      }
    ).setOrigin(0.5).setDepth(240);

    this.createTrackedTween({
      targets: this.introText,
      alpha: 0,
      delay: 5200,
      duration: 800
    });
  }

  refreshStats() {
    const s = this.stats;
    this.statsText?.setText(
      `COFFEE ${s.coffees}   COINS $${s.coins}   DENTS ${s.hits}   FINES $${s.fines}`
    );
  }

  drawHudBar(progress) {
    const { W, H, U } = this;
    const g = this.hudBar;
    const x0 = W * 0.40, x1 = W * 0.60, y = H * 0.03;

    g.clear();
    g.fillStyle(0x2a2a30, 1); g.fillRect(x0, y - 3 * U, x1 - x0, 6 * U);
    g.fillStyle(0xd4af37, 1); g.fillRect(x0, y - 3 * U, (x1 - x0) * progress, 6 * U);

    const cx = x0 + (x1 - x0) * progress;
    g.fillStyle(0xf4e7c1, 1);
    g.fillTriangle(cx, y - 10 * U, cx - 6 * U, y - 2 * U, cx + 6 * U, y - 2 * U);
  }

  // ------------------------------------------------------------------
  // Input
  // ------------------------------------------------------------------

  buildInput() {
    this.keys = this.input.keyboard.addKeys(
      'LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,ENTER'
    );

    this.trackInputEvent(this.input, 'pointerup', () => {
      this.uiHeld = false;
    });

    const proceed = () => {
      if (this.state === 'summary') {
        this.leaveScene();
      }
    };

    this.trackInputEvent(this.input, 'pointerdown', () => {
      if (this.state === 'summary' && this.summaryReady && !this.uiHeld) {
        proceed();
      }
    });

    this.trackInputEvent(this.input.keyboard, 'keydown-SPACE', () => {
      if (this.summaryReady) proceed();
    });

    this.trackInputEvent(this.input.keyboard, 'keydown-ENTER', () => {
      if (this.summaryReady) proceed();
    });
  }

  // ------------------------------------------------------------------
  // Dino speech bubble
  // ------------------------------------------------------------------

  say(text, ms = 2800, force = false) {
    if (!this.ready && !force) {
      return;
    }

    if (this.bubbleUntil > this.clock && !force) {
      return;
    }

    this.bubble?.destroy();

    const { W, H, U } = this;
    const pad = 14 * U;

    const t = this.add.text(0, 0, text, {
      fontFamily: 'SpecialElite', fontSize: this.px(22), color: '#2a1d12',
      align: 'center', wordWrap: { width: W * 0.3 }
    }).setOrigin(0.5, 1);

    const w = t.width + pad * 2;
    const h = t.height + pad * 2;

    const g = this.add.graphics();
    g.fillStyle(0xf6ecc8, 1); g.fillRoundedRect(-w / 2, -h, w, h, 10 * U);
    g.lineStyle(3, 0x3b2d20, 1); g.strokeRoundedRect(-w / 2, -h, w, h, 10 * U);
    g.fillStyle(0xf6ecc8, 1); g.fillTriangle(-10 * U, 0, 10 * U, 0, 0, 16 * U);

    t.setPosition(0, -pad);

    const x = clamp(this.dino.x, w / 2 + 10, W - w / 2 - 10);
    const y = this.dashTop - H * 0.02;

    const c = this.add.container(x, y, [g, t]).setDepth(300).setAlpha(0);

    this.bubble = c;
    this.bubbleUntil = this.clock + ms / 1000;

    this.createTrackedTween({ targets: c, alpha: 1, duration: 120 });

    this.time.delayedCall(ms, () => {
      if (this.bubble !== c || !c.scene) {
        return;
      }

      this.createTrackedTween({
        targets: c,
        alpha: 0,
        duration: 250,
        onComplete: () => {
          if (c.scene) c.destroy();
          if (this.bubble === c) this.bubble = null;
        }
      });
    });
  }

  floatText(text, color = '#ffd84d') {
    const t = this.add.text(this.W / 2, this.dashTop - this.H * 0.08, text, {
      fontFamily: 'PressStart2P', fontSize: this.px(20), color,
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(260);

    this.createTrackedTween({
      targets: t,
      y: t.y - 70 * this.U,
      alpha: 0,
      duration: 900,
      onComplete: () => t.destroy()
    });
  }

  // ------------------------------------------------------------------
  // Radio
  // ------------------------------------------------------------------

  updateStation(next) {
    if (next) {
      this.stationIndex = (this.stationIndex + 1) % FLAVOUR.radio.length;

      this.createTrackedTween({
        targets: [this.rStation, this.rLine],
        alpha: { from: 0.1, to: 1 },
        duration: 260
      });
    }

    const s = FLAVOUR.radio[this.stationIndex];
    this.rStation.setText(s.name);
    this.rLine.setText(s.line);
  }

  // ------------------------------------------------------------------
  // Road geometry
  // ------------------------------------------------------------------

  curveAt(d) {
    const L = this.L;

    const fade =
      clamp((d - 250) / 400, 0, 1) *
      clamp((L - d + 100) / 500, 0, 1);

    const c =
      Math.sin(d * 0.0011 + this.seed) * 0.9 +
      Math.sin(d * 0.0029 + this.seed * 2.1) * 0.5;

    return c * this.biome.curve * fade;
  }

  drawRoad() {
    const g = this.roadGfx;
    const { W, H, horizonY: hz, step, rowCount: n, biome: B } = this;
    const span = H - hz;

    g.clear();
    g.fillStyle(B.grassA, 1);
    g.fillRect(0, hz, W, span);

    let dx = 0;
    let x = 0;

    for (let i = n - 1; i >= 0; i--) {
      const y = hz + i * step;
      const u = Math.max(0.02, (i * step + step * 0.5) / span);
      const wz = this.pos + Z0 / u;

      dx += this.curveAt(wz) * this.curveK;
      x += dx;

      const hw = u * W * ROAD_HALF;
      const cx = W * 0.5 + x - this.playerX * hw;

      this.rowCx[i] = cx;

      const band = u > 0.07 ? (Math.floor(wz / 60) & 1) : 0;

      if (band) {
        g.fillStyle(B.grassB, 1);
        g.fillRect(0, y, W, step + 1);
      }

      const rw = hw * 0.09;

      g.fillStyle(band ? B.rumbleA : B.rumbleB, 1);
      g.fillRect(cx - hw - rw, y, rw, step + 1);
      g.fillRect(cx + hw, y, rw, step + 1);

      g.fillStyle(band ? B.roadA : B.roadB, 1);
      g.fillRect(cx - hw, y, hw * 2, step + 1);

      if (u > 0.05) {
        const lw = Math.max(1, hw * 0.025);

        g.fillStyle(B.line, 1);
        g.fillRect(cx - hw * 0.92 - lw / 2, y, lw, step + 1);
        g.fillRect(cx + hw * 0.92 - lw / 2, y, lw, step + 1);

        if (band) {
          g.fillRect(cx - lw / 2, y, lw, step + 1);
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // World objects
  // ------------------------------------------------------------------

  addObject(def) {
    const o = {
      kind: 'decor', x: 0, z: 0, s: 1, r: 0, vx: 0,
      done: false, sprite: null, flip: false, def: null,
      ...def
    };

    if (!o.sprite) {
      o.sprite = this.add.image(0, 0, o.key).setOrigin(0.5, 1).setVisible(false);
      o.sprite.setFlipX(Boolean(o.flip));
    } else {
      o.sprite.setVisible(false);
    }

    this.objects.push(o);
    return o;
  }

  makeBoard(text) {
    const c = this.add.container(0, 0);
    const g = this.add.graphics();

    g.fillStyle(0x3b2d20, 1);
    g.fillRect(-120, -70, 14, 70); g.fillRect(106, -70, 14, 70);
    g.fillStyle(0xf1e4bd, 1); g.fillRect(-180, -230, 360, 165);
    g.lineStyle(8, 0x3b2d20, 1); g.strokeRect(-180, -230, 360, 165);

    const t = this.add.text(0, -148, text, {
      fontFamily: 'PressStart2P', fontSize: '15px', color: '#2a1d12',
      align: 'center', wordWrap: { width: 330 }, lineSpacing: 6
    }).setOrigin(0.5);

    c.add([g, t]);
    return c;
  }

  makeGate(text) {
    const { W, H } = this;
    const c = this.add.container(0, 0);
    const g = this.add.graphics();

    g.fillStyle(0x2b2118, 1);
    g.fillRect(-W * 0.52, -H * 0.5, W * 0.06, H * 0.5);
    g.fillRect(W * 0.46, -H * 0.5, W * 0.06, H * 0.5);
    g.fillStyle(0x3b2d20, 1);
    g.fillRect(-W * 0.54, -H * 0.58, W * 1.08, H * 0.14);
    g.lineStyle(5, 0xd4af37, 1);
    g.strokeRect(-W * 0.54, -H * 0.58, W * 1.08, H * 0.14);

    const t = this.add.text(0, -H * 0.51, text, {
      fontFamily: 'PressStart2P', fontSize: `${Math.round(H * 0.03)}px`,
      color: '#f4e7c1', align: 'center', wordWrap: { width: W }, lineSpacing: 10
    }).setOrigin(0.5);

    c.add([g, t]);
    return c;
  }

  spawnAhead() {
    const horizon = this.pos + DRAW_DIST;
    const L = this.L;

    while (this.nextDecorZ < horizon && this.nextDecorZ < L - 60) {
      this.spawnDecor(this.nextDecorZ);
      this.nextDecorZ += rand(55, 110);
    }

    if (!this.startSignSpawned) {
      this.startSignSpawned = true;

      this.addObject({
        kind: 'billboard', z: 160, x: -1.9, s: 2.2,
        sprite: this.makeBoard(this.fromTown.leaving)
      });
    }

    while (this.nextBillboardZ < horizon && this.nextBillboardZ < L - 400) {
      const pool = [...FLAVOUR.billboards, ...(this.town.signs || [])];

      this.addObject({
        kind: 'billboard',
        z: this.nextBillboardZ,
        x: pick([-1, 1]) * rand(1.8, 2.2),
        s: 2.2,
        sprite: this.makeBoard(pick(pool))
      });

      this.nextBillboardZ += rand(650, 1000);
    }

    while (this.nextObstacleZ < horizon && this.nextObstacleZ < L - 350) {
      this.spawnEvent(this.nextObstacleZ);
      this.nextObstacleZ += rand(300, 520);
    }

    while (this.nextCamZ < horizon && this.nextCamZ < L - 500) {
      this.addObject({
        kind: 'cam', key: 'drv_cam', z: this.nextCamZ,
        x: pick([-1, 1]) * 1.55, s: 2.6
      });

      this.nextCamZ += rand(1300, 2100);
    }

    if (!this.gateSpawned && L < horizon) {
      this.gateSpawned = true;

      this.gate = this.addObject({
        kind: 'gate', z: L, x: 0, s: 1,
        sprite: this.makeGate(this.town.gate)
      });
    }
  }

  spawnDecor(z) {
    for (const side of [-1, 1]) {
      if (Math.random() < 0.3) {
        continue;
      }

      const [key, s] = pick(this.biome.decor);

      this.addObject({
        kind: 'decor', key, z: z + rand(-12, 12),
        x: side * (1.45 + rand(0, 1.9)), s,
        flip: Math.random() < 0.5
      });
    }
  }

  spawnEvent(z) {
    const roll = Math.random();

    if (roll < 0.55) {
      const pool = OBSTACLES.filter(
        o => o.biomes.includes('all') || o.biomes.includes(this.biome.id)
      );

      const lanes = [-0.62, -0.2, 0.2, 0.62];
      const first = this.spawnObstacle(pick(pool), z, pick(lanes));

      if (Math.random() < 0.3 && first) {
        const other = Math.sign(first.x) ? -Math.sign(first.x) : 1;
        this.spawnObstacle(pick(pool), z + rand(-20, 20), other * pick([0.55, 0.65]));
      }
    } else if (roll < 0.8) {
      this.addObject({
        kind: 'pickup', type: 'coffee', key: 'drv_coffee',
        z, x: pick([-0.65, -0.2, 0.2, 0.65]), s: 2.7, r: 0.34
      });
    } else {
      const lane = pick([-0.6, -0.2, 0.2, 0.6]);
      const count = 3 + Math.floor(Math.random() * 3);

      for (let i = 0; i < count; i++) {
        this.addObject({
          kind: 'pickup', type: 'coin', key: 'drv_coin',
          z: z + i * 26, x: lane, s: 2.1, r: 0.34
        });
      }
    }
  }

  spawnObstacle(def, z, x) {
    const o = this.addObject({
      kind: 'obstacle', key: def.key, z, x, s: def.s, r: def.r, def
    });

    if (def.vx > 0) {
      const side = Math.random() < 0.5 ? -1 : 1;
      o.x = side * 1.15;
      o.vx = -side * def.vx;
      o.sprite.setFlipX(o.vx < 0);
    }

    return o;
  }

  removeObject(index) {
    const o = this.objects[index];

    if (o?.sprite?.scene) {
      o.sprite.destroy();
    }

    this.objects.splice(index, 1);
  }

  updateObjects(dt) {
    const { W, H, horizonY: hz, step, rowCount: n } = this;
    const span = H - hz;

    for (let k = this.objects.length - 1; k >= 0; k--) {
      const o = this.objects[k];

      if (!o.sprite || !o.sprite.scene) {
        this.objects.splice(k, 1);
        continue;
      }

      const dz = o.z - this.pos;

      if (dz < this.cullDz) {
        this.removeObject(k);
        continue;
      }

      if (dz > DRAW_DIST + 200) {
        o.sprite.setVisible(false);
        continue;
      }

      if (o.vx && dz < 650) {
        o.x += o.vx * dt;
      }

      const u = Z0 / dz;
      const y = hz + u * span;
      const idx = clamp(Math.floor((y - hz) / step), 0, n - 1);
      const hw = u * W * ROAD_HALF;
      const sx = this.rowCx[idx] + o.x * hw;

      const fogMul = this.weather === 'fog' ? 4 : 12;
      const alpha = clamp((u - 0.02) * fogMul, 0, 1);

      o.sprite.setVisible(alpha > 0.02);
      o.sprite.setPosition(sx, y);
      o.sprite.setDepth(20 + u * 100);
      o.sprite.setAlpha(alpha);

      if (o.kind === 'gate') {
        o.sprite.setScale(u);
      } else {
        o.sprite.setScale(u * this.sx * o.s);
      }

      if (!o.done && dz <= this.hitDz && this.state === 'driving') {
        o.done = true;
        const lat = Math.abs(o.x - this.playerX);

        if (o.kind === 'obstacle' && lat < o.r && this.invuln <= 0) {
          this.onHit(o);
        } else if (o.kind === 'pickup' && lat < o.r) {
          this.onPickup(o, k);
        } else if (o.kind === 'cam') {
          this.onCam();
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // Events: hit / pickup / camera
  // ------------------------------------------------------------------

  onHit(o) {
    this.stats.hits += 1;
    this.invuln = 0.8;
    this.speedMul *= 0.3;

    this.cameras.main.shake(260, 0.012);
    this.cameras.main.flash(160, 255, 70, 40);

    this.say(pick(o.def.hitLines), 3200, true);
    this.floatText('-20 MIN', '#ff6b5a');
    this.refreshStats();

    const sprite = o.sprite;
    o.sprite = null;

    this.createTrackedTween({
      targets: sprite,
      y: sprite.y - 160 * this.U,
      x: sprite.x + rand(-200, 200) * this.U,
      angle: rand(-420, 420),
      alpha: 0,
      duration: 700,
      onComplete: () => sprite.scene && sprite.destroy()
    });

    this.createTrackedTween({
      targets: this.dino,
      y: this.dinoBaseY - 26 * this.U,
      duration: 110,
      yoyo: true
    });
  }

  onPickup(o) {
    const sprite = o.sprite;
    o.sprite = null;

    if (o.type === 'coffee') {
      this.stats.coffees += 1;
      this.floatText('+3 ENERGY', '#8cff9a');
      this.say(pick(FLAVOUR.dinoCoffee), 2400);
    } else {
      this.stats.coins += COIN_VALUE;
      this.floatText(`+$${COIN_VALUE}`);

      if (this.stats.coins === COIN_VALUE) {
        this.say(pick(FLAVOUR.dinoCoin), 2200);
      }
    }

    this.refreshStats();

    this.createTrackedTween({
      targets: sprite,
      y: sprite.y - 90 * this.U,
      scale: sprite.scale * 1.6,
      alpha: 0,
      duration: 260,
      onComplete: () => sprite.scene && sprite.destroy()
    });
  }

  onCam() {
    if (this.speedMul > 1.15) {
      this.stats.fines += FINE_AMOUNT;

      this.cameras.main.flash(220, 255, 255, 255);
      this.say(pick(FLAVOUR.camFlash), 3000, true);
      this.floatText(`-$${FINE_AMOUNT}`, '#ff6b5a');
      this.refreshStats();
    } else {
      this.say(pick(FLAVOUR.camSafe), 2400);
    }
  }

  // ------------------------------------------------------------------
  // Main loop
  // ------------------------------------------------------------------

  update(time, delta) {
    if (!this.ready || this._cleanupDone) {
      return;
    }

    const dt = Math.min(delta / 1000, 0.05);
    this.clock += dt;

    if (this.state === 'driving' || this.state === 'arriving') {
      this.stepDrive(dt);
      this.spawnAhead();
    }

    this.drawRoad();
    this.updateObjects(dt);
    this.updateScenery(dt);
    this.updateDashboard(dt);
  }

  stepDrive(dt) {
    const k = this.keys;
    const driving = this.state === 'driving';

    this.driveTime += dt;
    this.invuln = Math.max(0, this.invuln - dt);

    let steer = 0;

    if (driving) {
      if (k.LEFT.isDown || k.A.isDown) steer -= 1;
      if (k.RIGHT.isDown || k.D.isDown) steer += 1;

      const p = this.input.activePointer;

      if (p.isDown && !this.uiHeld) {
        steer = clamp((p.x - this.W / 2) / (this.W * 0.22), -1, 1);
      }
    }

    this.steerVel += (steer - this.steerVel) * Math.min(1, dt * 7);

    let target = 1;

    if (driving) {
      if (k.UP.isDown || k.W.isDown) target = 1.4;
      else if (k.DOWN.isDown || k.S.isDown) target = 0.55;
    }

    const offroad = Math.abs(this.playerX) > 1.1;

    if (offroad) target *= 0.6;
    if (!driving) target = 0;

    this.speedMul += (target - this.speedMul) * Math.min(1, dt * (driving ? 2.5 : 2.2));

    const ramp = Math.min(1, this.driveTime / 1.6);
    this.speed = BASE_SPEED * this.speedMul * ramp;
    this.pos += this.speed * dt;

    const nearCurve = this.curveAt(this.pos + 60);

    this.playerX +=
      this.steerVel * dt * 1.9 -
      nearCurve * dt * 0.5 * (this.speed / BASE_SPEED);

    this.playerX = clamp(this.playerX, -1.5, 1.5);

    this.rumbleCd -= dt;

    if (offroad && this.speed > 40 && this.rumbleCd <= 0) {
      this.rumbleCd = 0.25;
      this.cameras.main.shake(90, 0.003);
    }

    if (driving) {
      this.idleTimer -= dt;

      if (this.idleTimer <= 0) {
        this.idleTimer = rand(7, 11);
        this.say(pick(FLAVOUR.dinoIdle), 3000);
      }

      if (this.pos >= this.L - 80) {
        this.state = 'arriving';
        this.arriveTime = 0;
        this.say(this.town.arrival, 3600, true);
      }
    } else {
      this.arriveTime += dt;

      if (this.arriveTime > 1.1 && this.speed < 4) {
        this.showSummary();
      }
    }
  }

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

  updateDashboard(dt) {
    const { W, H, dashTop: top } = this;
    const sp = clamp(this.speed / (BASE_SPEED * 1.5), 0, 1);
    const progress = clamp(this.pos / this.L, 0, 1);

    this.wheel.rotation = this.steerVel * 0.6;

    this.dice.rotation =
      -this.steerVel * 0.22 +
      Math.sin(this.clock * 1.9) * 0.04 +
      Math.sin(this.clock * 13) * 0.012 * sp;

    const bob = Math.sin(this.clock * 14) * sp * 1.6 * this.U;
    const jolt = Math.abs(this.playerX) > 1.1 ? Math.sin(this.clock * 40) * 2.5 * this.U : 0;

    if (!this.tweens.isTweening(this.dino)) {
      this.dino.y = this.dinoBaseY + bob + jolt;
    }

    const g = this.gaugeGfx;
    g.clear();

    const needle = (cx, cy, r, val) => {
      const a = Phaser.Math.DegToRad(135 + 270 * clamp(val, 0, 1));
      g.lineStyle(3, 0xff5a3c, 1);
      g.lineBetween(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      g.fillStyle(0xcccccc, 1);
      g.fillCircle(cx, cy, r * 0.14);
    };

    const gy = top + H * 0.07;
    const gr = H * 0.05 * 0.82;

    needle(W * 0.33, gy, gr, sp);
    needle(W * 0.48, gy, gr, progress);

    this.drawHudBar(progress);

    this.uiTick += dt;

    if (this.uiTick > 0.1) {
      this.uiTick = 0;

      this.speedText.setText(String(Math.round(this.speed * 0.55)));

      const left = Math.max(0, (1 - progress) * this.quote.km);
      this.rKm.setText(`${left.toFixed(1)} KM`);
    }
  }

  // ------------------------------------------------------------------
  // Autopilot + summary
  // ------------------------------------------------------------------

  autopilot() {
    if (this.state !== 'driving') {
      return;
    }

    this.stats.autopilot = true;
    this.stats.hits += Math.max(1, Math.round(this.L / 2200));
    this.refreshStats();

    this.pos = this.L;
    this.speed = 0;
    this.speedMul = 0;

    this.cameras.main.flash(300, 0, 0, 0);
    this.showSummary();
  }

  showSummary() {
    if (this.state === 'summary' || this.state === 'leaving') {
      return;
    }

    this.state = 'summary';
    this.summaryReady = false;

    this.outcome = computeOutcome(this.quote, this.stats);

    const o = this.outcome;
    const { W, H, U } = this;

    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setDepth(400);
    veil.setAlpha(0);

    const pw = W * 0.46, ph = H * 0.62;
    const px0 = W / 2 - pw / 2, py0 = H / 2 - ph / 2;

    const panel = this.add.graphics().setDepth(401);
    panel.fillStyle(0xf1e4bd, 1); panel.fillRect(px0, py0, pw, ph);
    panel.lineStyle(6, 0x3b2d20, 1); panel.strokeRect(px0, py0, pw, ph);
    panel.fillStyle(0x1a130e, 1); panel.fillRect(px0, py0, pw, ph * 0.17);

    const title = this.add.text(
      W / 2, py0 + ph * 0.085,
      `ARRIVED:\n${this.town.name.toUpperCase()}`,
      {
        fontFamily: 'PressStart2P', fontSize: this.px(18), color: '#d4af37',
        align: 'center', lineSpacing: 10, wordWrap: { width: pw * 0.9 }
      }
    ).setOrigin(0.5).setDepth(402);

    const fmtMoney = v => (v > 0 ? `$${v}` : '$0');

    const rows = [
      ['Distance driven', `${o.km} km`],
      ['Fuel', `-${fmtMoney(o.fuel)}`],
      ['Time on the road', `${o.hours}h ${o.minutes}m`],
      ['Dents (+20 min each)', `${o.hits}`],
      [
        'Energy',
        o.netEnergy > 0 ? `-${o.netEnergy}` : o.netEnergy < 0 ? `+${-o.netEnergy}` : '0'
      ],
      ['Coffee found', `${o.coffees}`],
      ['Coins found', `+${fmtMoney(o.coins)}`],
      ['Speed camera fines', `-${fmtMoney(o.fines)}`]
    ];

    const rowH = ph * 0.065;
    let y = py0 + ph * 0.22;
    const items = [];

    for (const [label, value] of rows) {
      items.push(
        this.add.text(px0 + pw * 0.07, y, label, {
          fontFamily: 'SpecialElite', fontSize: this.px(24), color: '#2a1d12'
        }).setDepth(402),
        this.add.text(px0 + pw * 0.93, y, value, {
          fontFamily: 'SpecialElite', fontSize: this.px(24), color: '#6b1d12'
        }).setOrigin(1, 0).setDepth(402)
      );

      y += rowH;
    }

    const verdictText = o.autopilot
      ? FLAVOUR.verdicts.autopilot
      : o.hits === 0
        ? FLAVOUR.verdicts.perfect
        : o.hits <= 2
          ? FLAVOUR.verdicts.minor
          : FLAVOUR.verdicts.major;

    const verdict = this.add.text(W / 2, py0 + ph * 0.8, verdictText, {
      fontFamily: 'SpecialElite', fontSize: this.px(22), color: '#3b2d20',
      align: 'center', fontStyle: 'italic', wordWrap: { width: pw * 0.86 }
    }).setOrigin(0.5, 0).setDepth(402);

    const hint = this.add.text(W / 2, py0 + ph * 0.93, 'Click to continue', {
      fontFamily: 'PressStart2P', fontSize: this.px(12), color: '#6b1d12'
    }).setOrigin(0.5).setDepth(402);

    const all = [panel, title, verdict, hint, ...items];
    all.forEach(obj => obj.setAlpha(0));

    this.createTrackedTween({ targets: veil, alpha: 1, duration: 300 });

    this.createTrackedTween({
      targets: all,
      alpha: 1,
      duration: 350,
      delay: 200,
      onComplete: () => {
        this.summaryReady = true;
      }
    });

    this.createTrackedTween({
      targets: hint,
      alpha: { from: 0.3, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      delay: 700
    });
  }

  // ------------------------------------------------------------------
  // Leaving
  // ------------------------------------------------------------------

  leaveScene() {
    if (this.state === 'leaving' || !this.outcome) {
      return;
    }

    this.state = 'leaving';

    if (!this.applied) {
      this.applied = true;

      try {
        applyOutcome(this.quote, this.outcome);
      } catch (error) {
        console.error('[DriveScene] applyOutcome failed:', error);
      }
    }

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        if (!this.sys.isActive()) {
          return;
        }

        const d = this.driveData;

        void this.goto(d.nextScene || 'HomeCityScene', {
          ...(d.nextData || {}),
          fromRoadTrip: true,
          roadTripTownId: this.quote.toId,
          roadTripOutcome: this.outcome
        });
      }
    );

    this.cameras.main.fadeOut(450, 0, 0, 0);
  }

  onSceneShutdown() {
    this.ready = false;
    this.objects = [];
    this.drops = [];
    this.bubble = null;
    this.wiper = null;
    this.clouds = [];
  }
}