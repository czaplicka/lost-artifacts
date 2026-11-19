import { BaseScene } from './BaseScene.js';
import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { BIOMES, FLAVOUR, HOME_TOWN_ID } from '../config/RoadTripTowns.js';
import { getRoadTripQuote } from '../managers/RoadTripManager.js';
import { Z0, rand } from './drive/DriveShared.js';
import { DriveTextures } from './drive/DriveTextures.js';
import { DriveScenery } from './drive/DriveScenery.js';
import { DriveCockpit } from './drive/DriveCockpit.js';
import { DriveRoad } from './drive/DriveRoad.js';
import { DriveControls } from './drive/DriveControls.js';
import { DriveTrip } from './drive/DriveTrip.js';

export class DriveScene extends BaseScene {
  constructor() {
    super({ key: 'DriveScene' });
  }

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
    this.coffeeUntil = 0;
    this.dinoBounce = null;
    this.dinoSquash = null;
    this.travelHud = null;
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

  create() {
    super.create();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onSceneShutdown, this);

    const data = this.driveData;
    this.quote = data.quote || getRoadTripQuote(data.fromTownId, data.toTownId);
    this.destination = data.nextScene || (this.quote.toId === HOME_TOWN_ID ? 'HomeCityScene' : null);
    if (!this.destination) {
      this.add.text(32, 32, 'No arrival scene configured for this town.', {
        fontFamily: 'SpecialElite', fontSize: '24px', color: '#ffffff'
      });
      return;
    }

    this.hideTravelUi();

    const { width: W, height: H } = this.scale.gameSize;

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
    this.trackInputEvent(this.scale, Phaser.Scale.Events.RESIZE, this.fitDriveCamera);
    this.fitDriveCamera();

    this.cameras.main.fadeIn(450, 0, 0, 0);

    this.spawnAhead();
    this.ready = true;

    this.time.delayedCall(900, () => {
      this.say(`${__dialogueText("scenes/DriveScene.js", "t_b3eb5ad3c68f84659ba7")}${this.town.name}${__dialogueText("scenes/DriveScene.js", "t_8dccf256f6d5783e62bb")}${this.town.tagline}`, 4200, true);
    });
  }

  fitDriveCamera() {
    const { width, height } = this.scale.gameSize;
    if (!width || !height) return;
    const zoom = Math.min(width / this.W, height / this.H);
    const w = this.W * zoom;
    const h = this.H * zoom;
    this.cameras.main
      .setViewport((width - w) / 2, (height - h) / 2, w, h)
      .setZoom(zoom)
      .centerOn(this.W / 2, this.H / 2);
  }

  px(n) {
    return `${Math.max(8, Math.round(n * this.U))}px`;
  }

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
}

Object.assign(DriveScene.prototype, DriveTextures, DriveScenery, DriveCockpit, DriveRoad, DriveControls, DriveTrip);
