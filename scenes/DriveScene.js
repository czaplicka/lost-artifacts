import { BaseScene } from './BaseScene.js';

import {
  dialogueText as __dialogueText
} from '../dialogues/DialogueText.js';

import {
  BIOMES,
  FLAVOUR,
  HOME_TOWN_ID
} from '../config/RoadTripTowns.js';

import {
  getRoadTripQuote,
  beginRoadTrip
} from '../managers/RoadTripManager.js';

import {
  Z0,
  rand
} from './drive/DriveShared.js';

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
    this.driveData = {
      toTownId: HOME_TOWN_ID,
      ...data
    };

    this.state = 'driving';
    this.ready = false;
    this.quote = null;
    this.destination = null;
    this._driveRun = Symbol('drive-run');
    this._driveStartupPanel = null;
    this._driveStartupMessage = null;
    this._driveStartupButton = null;
    this._driveStartupExitPending = false;
    this._bubbleTimer = null;

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

    this.stats = {
      hits: 0,
      coffees: 0,
      coins: 0,
      fines: 0,
      autopilot: false
    };

    this.tripId = data.tripId ?? null;
    this.fineSequence = 0;
    this.pendingFine = null;
    this.pendingArrival = false;
    this.settlementError = null;

    this.outcome = null;
    this.applied = false;
    this.summaryReady = false;
    this.gate = null;
    this.clouds = [];

    this.stationIndex =
      Math.floor(Math.random() * FLAVOUR.radio.length);
  }

  create() {
    super.create();

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.onSceneShutdown,
      this
    );

    const data = this.driveData;

    try {
      this.quote = getRoadTripQuote(data.fromTownId, data.toTownId);
      this.destination = data.nextScene ||
        (this.quote.toId === HOME_TOWN_ID ? 'HomeCityScene' : null);

      if (typeof this.destination !== 'string' || !this.destination.trim()) {
        throw new Error('No arrival scene is configured for this town.');
      }
      if (this.destination === 'DriveScene') {
        throw new Error('The arrival scene cannot be DriveScene itself.');
      }

      this.tripId = beginRoadTrip(this.quote, this.tripId);
    } catch (error) {
      this.showDriveStartupError(error);
      return;
    }

    this.hideTravelUi();

    const {
      width: W,
      height: H
    } = this.scale.gameSize;

    this.W = W;
    this.H = H;
    this.U = Math.min(W / 1920, H / 1080);
    this.sx = W / 1920;

    this.horizonY = H * 0.40;
    this.dashTop = H * 0.66;
    this.step = Math.max(
      3,
      Math.round(4 * H / 1080)
    );

    this.rowCount = Math.ceil(
      (H - this.horizonY) / this.step
    );

    this.rowCx = new Float32Array(
      this.rowCount + 2
    );

    this.curveK = 0.05 * (W / 1920);

    const uDash =
      (this.dashTop - this.horizonY) /
      (H - this.horizonY);

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

    this.trackInputEvent(
      this.scale,
      Phaser.Scale.Events.RESIZE,
      this.fitDriveCamera
    );

    this.fitDriveCamera();

    this.cameras.main.fadeIn(450, 0, 0, 0);

    this.spawnAhead();
    this.ready = true;

    this.time.delayedCall(900, () => {
      if (!this.ready || this._cleanupDone) return;

      this.say(
        `${__dialogueText("scenes/DriveScene.js", "t_b3eb5ad3c68f84659ba7")}` +
        `${this.town.name}` +
        `${__dialogueText("scenes/DriveScene.js", "t_8dccf256f6d5783e62bb")}` +
        `${this.town.tagline}`,
        4200,
        true
      );
    });
  }

  showDriveStartupError(error) {
    if (this._cleanupDone || !this.sys.isActive()) return;
    console.error('[DriveScene] Could not start:', error);
    this.ready = false;
    this.state = 'startup-error';
    this.uiHeld = false;
    const message = error?.message || String(error || 'The road trip could not start.');
    if (this._driveStartupPanel?.scene) {
      this._driveStartupMessage?.setText(message);
      return;
    }

    const background = this.add.rectangle(0, 0, 1, 1, 0x15111c, 1)
      .setOrigin(0).setInteractive();
    const text = this.add.text(0, 0, message, {
      fontFamily: 'SpecialElite', fontSize: '24px', color: '#fff1d0',
      align: 'center'
    }).setOrigin(0.5);
    const button = this.add.text(0, 0, 'RETURN TO MENU (ESC)', {
      fontFamily: 'PressStart2P', fontSize: '14px', color: '#d4af37',
      backgroundColor: '#3b2d20', padding: { x: 18, y: 18 }, align: 'center'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this._driveStartupMessage = text;
    this._driveStartupButton = button;
    this._driveStartupPanel = this.add.container(0, 0, [background, text, button])
      .setDepth(20000).setScrollFactor(0);

    const layout = () => {
      if (!this._driveStartupPanel?.scene || this._cleanupDone) return;
      const { width, height } = this.scale.gameSize;
      this.cameras.main.setViewport(0, 0, width, height).setZoom(1).setScroll(0, 0);
      background.setSize(width, height);
      text.setPosition(width / 2, height * 0.38)
        .setWordWrapWidth(Math.max(120, width * 0.84), true);
      button.setPosition(width / 2, height * 0.68)
        .setFontSize(Math.max(8, Math.min(14, Math.floor((width - 48) / 24))));
    };
    this.trackInputEvent(this.scale, Phaser.Scale.Events.RESIZE, layout);
    layout();
    this.cameras.main.fadeIn(150, 0, 0, 0);

    this.trackInputEvent(button, 'pointerdown', (pointer, _x, _y, event) => {
      event?.stopPropagation?.();
      if (pointer?.event?.button > 0) return;
      void this.returnFromDriveStartupError();
    });
    this.trackInputEvent(this.input.keyboard, 'keydown-ESC', event => {
      if (event?.repeat || event?.defaultPrevented || event?.ctrlKey || event?.metaKey || event?.altKey) return;
      event?.preventDefault?.();
      void this.returnFromDriveStartupError();
    });
  }

  async returnFromDriveStartupError() {
    if (this.state !== 'startup-error' || this._driveStartupExitPending ||
        this._cleanupDone || !this.sys.isActive()) return false;
    const run = this._driveRun;
    this._driveStartupExitPending = true;
    this._driveStartupButton?.setAlpha(0.5);
    try {
      // Menu is neutral: do not change town, refund fuel, or complete the trip.
      const moved = await this.goto('EnterScene');
      if (moved) return true;
      throw new Error('The menu could not be opened. Click RETURN TO MENU or press ESC to retry.');
    } catch (error) {
      console.error('[DriveScene] Emergency return failed:', error);
      if (this._driveRun === run && !this._cleanupDone && this.sys.isActive()) {
        this._driveStartupExitPending = false;
        this._driveStartupButton?.setAlpha(1);
        this._driveStartupMessage?.setText(error?.message || 'The menu could not be opened. Please retry.');
      }
      return false;
    }
  }

  cleanup() {
    if (this._cleanupDone) return;
    this.clearDriveBubble();
    if (this._driveStartupPanel?.scene) this._driveStartupPanel.destroy(true);
    this._driveStartupPanel = null;
    this._driveStartupMessage = null;
    this._driveStartupButton = null;
    this._driveStartupExitPending = true;
    super.cleanup();
  }

  fitDriveCamera() {
    const { width, height } = this.scale.gameSize;

    if (!width || !height) return;

    const zoom = Math.min(
      width / this.W,
      height / this.H
    );

    const w = this.W * zoom;
    const h = this.H * zoom;

    this.cameras.main
      .setViewport(
        (width - w) / 2,
        (height - h) / 2,
        w,
        h
      )
      .setZoom(zoom)
      .centerOn(this.W / 2, this.H / 2);
  }

  px(n) {
    return `${Math.max(8, Math.round(n * this.U))}px`;
  }

  update(time, delta) {
    if (
      !this.ready ||
      this._cleanupDone ||
      this.settlementError
    ) {
      return;
    }

    const dt = Math.min(delta / 1000, 0.05);

    this.clock += dt;

    if (
      this.state === 'driving' ||
      this.state === 'arriving'
    ) {
      this.stepDrive(dt);
      this.spawnAhead();
    }

    this.drawRoad();
    this.updateObjects(dt);

    if (this.settlementError) return;

    this.updateScenery(dt);
    this.updateDashboard(dt);
  }
}

// Validate the entire composition before changing the prototype.
export function applyDriveMixins(prototype, entries) {
  const owners = new Map(
    Reflect.ownKeys(prototype).map(key => [key, 'DriveScene'])
  );
  const pending = [];
  for (const [name, mixin] of entries) {
    const descriptors = Object.getOwnPropertyDescriptors(mixin);
    for (const key of Reflect.ownKeys(descriptors)) {
      if (owners.has(key)) {
        throw new Error(
          `[DriveScene] Mixin collision: "${String(key)}" in ${name}; already defined by ${owners.get(key)}.`
        );
      }
      owners.set(key, name);
      pending.push([key, descriptors[key]]);
    }
  }
  for (const [key, descriptor] of pending) {
    Object.defineProperty(prototype, key, descriptor);
  }
}

applyDriveMixins(DriveScene.prototype, [
  ['DriveTextures', DriveTextures],
  ['DriveScenery', DriveScenery],
  ['DriveCockpit', DriveCockpit],
  ['DriveRoad', DriveRoad],
  ['DriveControls', DriveControls],
  ['DriveTrip', DriveTrip]
]);
