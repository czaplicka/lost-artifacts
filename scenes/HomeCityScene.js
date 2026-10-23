import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';

const KEY = 'HomeCityScene';
const COLS = 26;
const ROWS = 22;
const HW = 64;
const HH = 32;
const OX = 1600;
const OY = 240;

const BUILDINGS = [
  {
    id: 'pi-office',
    name: 'PI Office',
    x: 4,
    y: 3,
    w: 3,
    h: 3,
    color: 0xc5ab79,
    message: ''
  },
  {
    id: 'spy-shop',
    name: 'Spy Shop',
    x: 12,
    y: 3,
    w: 3,
    h: 3,
    color: 0x688d8b,
    message:
      'Closed for a discreet inventory. Even the inventory is undercover.'
  },
  {
    id: 'tavern',
    name: 'Tavern',
    x: 20,
    y: 5,
    w: 3,
    h: 3,
    color: 0xae7458,
    message:
      'The bartender is polishing an alibi. The tavern interior is coming later.'
  },
  {
    id: 'police-station',
    name: 'Police Station',
    x: 5,
    y: 13,
    w: 4,
    h: 3,
    color: 0x758aa5,
    message:
      'Please take a number. The number dispenser is under investigation.'
  },
  {
    id: 'your-home',
    name: 'Your Home',
    x: 16,
    y: 14,
    w: 3,
    h: 3,
    color: 0x96905c,
    message:
      'Home sweet home. Currently furnished with potential.'
  }
];

export class HomeCityScene extends BaseScene {
  constructor() {
    super({ key: KEY });
  }

  init(data = {}) {
    this.entryPoint = data.entryPoint ?? null;

    this.buildings = BUILDINGS.map(b => ({
      ...b,
      door: {
        x: b.x + Math.floor(b.w / 2),
        y: b.y + b.h
      }
    }));

    this.path = [];
    this.destinationBuilding = null;
    this.navigating = false;
    this.disposed = false;
    this.runToken = Symbol(KEY);
    this.saveElapsed = 0;
    this.feedbackTimer = null;
    this.lastCameraPosition = null;
    this.position = null;

    this.blocked = new Set();

    for (const b of this.buildings) {
      for (let y = b.y; y < b.y + b.h; y++) {
        for (let x = b.x; x < b.x + b.w; x++) {
          this.blocked.add(this.cellKey(x, y));
        }
      }
    }
  }

  create() {
    super.create();

    this.registry.set('currentSceneKey', KEY);

    // Stop old gameplay overlays so their shortcuts do not stay active.
    for (const key of [
      'PlayerHudScene',
      'UIScene',
      'NewsHud'
    ]) {
      if (key === 'PlayerHudScene') {
        this.getRegisteredScene(key)?.closeAllUIPanels?.();
      }

      this.stopSceneIfActive(key);
    }

    this.cameras.main.setBackgroundColor('#202b29');

    this.drawGround();
    this.drawBuildings();
    this.createPlayer();
    this.createInterface();

    const saved = gameState.homeCity;

    const entry = this.buildings.find(
      b => b.id === this.entryPoint
    );

    const validSaved =
      saved?.version === 1 &&
      Number.isInteger(saved.player?.x) &&
      Number.isInteger(saved.player?.y) &&
      this.walkable(saved.player.x, saved.player.y);

    this.position = entry
      ? { ...entry.door }
      : validSaved
        ? { ...saved.player }
        : { ...this.buildings[0].door };

    this.placePlayer();

    const camera = this.cameras.main;

    camera.setBounds(0, 0, 3300, 2000);
    camera.setZoom(1);
    camera.startFollow(this.player, true, 0.12, 0.12);

    if (
      !entry &&
      validSaved &&
      Number.isFinite(saved.camera?.x) &&
      Number.isFinite(saved.camera?.y)
    ) {
      camera.setScroll(saved.camera.x, saved.camera.y);
    } else {
      camera.centerOn(this.player.x, this.player.y);
    }

    this.trackInputEvent(
      this.input,
      'pointerdown',
      this.onPointer
    );

    if (this.input.keyboard) {
      this.trackInputEvent(
        this.input.keyboard,
        'keydown-ESC',
        this.cancelWalking
      );
    }

    this.events.once(
      'shutdown',
      this.disposeCity,
      this
    );

    this.remember();
  }

  cellKey(x, y) {
    return `${x},${y}`;
  }

  project(x, y) {
    return {
      x: OX + (x - y) * HW,
      y: OY + (x + y) * HH
    };
  }

  unproject(x, y) {
    const u = (x - OX) / HW;
    const v = (y - OY) / HH;

    return {
      x: Math.round((u + v) / 2),
      y: Math.round((v - u) / 2)
    };
  }

  walkable(x, y) {
    return (
      x >= 0 &&
      y >= 0 &&
      x < COLS &&
      y < ROWS &&
      !this.blocked.has(this.cellKey(x, y))
    );
  }

  polygon(
    graphics,
    points,
    color,
    outline = 0x303e39
  ) {
    graphics.fillStyle(color, 1);
    graphics.fillPoints(points, true);
    graphics.lineStyle(1, outline, 0.5);
    graphics.strokePoints(points, true);
  }

  diamond(x, y, z = 0) {
    const p = this.project(x, y);

    return [
      { x: p.x, y: p.y - HH - z },
      { x: p.x + HW, y: p.y - z },
      { x: p.x, y: p.y + HH - z },
      { x: p.x - HW, y: p.y - z }
    ];
  }

  drawGround() {
    const g = this.add.graphics().setDepth(-1000);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const paved =
          (x >= 9 && x <= 11) ||
          (y >= 8 && y <= 11) ||
          (y >= 18 && y <= 19) ||
          (x >= 1 && x <= 2);

        const color = paved
          ? (x + y) % 2
            ? 0x777568
            : 0x827e6c
          : (x + y) % 2
            ? 0x536350
            : 0x596b56;

        this.polygon(
          g,
          this.diamond(x, y),
          color
        );
      }
    }

    // Free tiles include paved approaches and courtyards.
    for (const b of this.buildings) {
      let y = b.door.y;

      while (
        y < ROWS &&
        y !== 9 &&
        y !== 18
      ) {
        if (this.walkable(b.door.x, y)) {
          this.polygon(
            g,
            this.diamond(b.door.x, y),
            0x968975
          );
        }

        y++;
      }
    }
  }

  drawBuildings() {
    for (const b of this.buildings) {
      // Sort tile-sized building columns independently.
      for (let y = b.y; y < b.y + b.h; y++) {
        for (let x = b.x; x < b.x + b.w; x++) {
          const roof = this.diamond(x, y, 110);
          const base = this.diamond(x, y);

          const g = this.add.graphics()
            .setDepth((x + y) * 100);

          const shade =
            Phaser.Display.Color.IntegerToColor(b.color);

          this.polygon(
            g,
            [roof[1], roof[2], base[2], base[1]],
            b.color
          );

          this.polygon(
            g,
            [roof[2], roof[3], base[3], base[2]],
            shade.darken(22).color
          );

          this.polygon(g, roof, 0x554e45);

          const hit = new Phaser.Geom.Polygon([
            roof[0],
            roof[1],
            base[1],
            base[2],
            base[3],
            roof[3]
          ]);

          g.setInteractive(
            hit,
            Phaser.Geom.Polygon.Contains
          );

          g.setData('buildingId', b.id);
          g.input.cursor = 'pointer';
        }
      }

      const door = this.project(
        b.door.x,
        b.door.y
      );

      const edge = this.project(
        b.door.x,
        b.door.y - 0.5
      );

      const d = this.add.graphics().setDepth(
        (b.door.x + b.door.y - 1) * 100 + 2
      );

      this.polygon(
        d,
        [
          { x: edge.x - 14, y: edge.y - 4 },
          { x: edge.x + 14, y: edge.y + 10 },
          { x: edge.x + 14, y: edge.y - 44 },
          { x: edge.x - 14, y: edge.y - 58 }
        ],
        0x292a28
      );

      this.add.ellipse(
        door.x,
        door.y,
        38,
        17,
        0xffd277,
        0.6
      ).setDepth(-500);

      const center = this.project(
        b.x + (b.w - 1) / 2,
        b.y + (b.h - 1) / 2
      );

      this.add.text(
        center.x,
        center.y - 135,
        b.name,
        {
          fontFamily: 'SpecialElite, monospace',
          fontSize: '25px',
          color: '#ffe4ab',
          backgroundColor: '#242522',
          padding: { x: 10, y: 8 }
        }
      )
        .setOrigin(0.5)
        .setDepth(10000)
        .setInteractive({ useHandCursor: true })
        .setData('buildingId', b.id);
    }
  }

  createPlayer() {
    this.player = this.add.container(0, 0);

    const body = this.add.graphics();

    body
      .fillStyle(0x000000, 0.3)
      .fillEllipse(0, 0, 30, 13);

    body
      .fillStyle(0x302b2b)
      .fillRect(-11, -20, 8, 19)
      .fillRect(3, -20, 8, 19);

    body
      .fillStyle(0xd3b37b)
      .fillRoundedRect(-16, -51, 32, 36, 5);

    body
      .fillStyle(0xe4c1a2)
      .fillCircle(0, -60, 12);

    body
      .fillStyle(0x544334)
      .fillRect(-21, -70, 42, 7)
      .fillRect(-12, -82, 24, 15);

    this.player.add(body);

    this.targetMarker = this.add.ellipse(
      0,
      0,
      32,
      14
    )
      .setStrokeStyle(3, 0xffd277)
      .setDepth(-400)
      .setVisible(false);
  }

  createInterface() {
    this.title = this.add.text(
      24,
      20,
      'YOUR NEIGHBORHOOD',
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '30px',
        color: '#ffe4ab',
        backgroundColor: '#202822',
        padding: { x: 16, y: 10 }
      }
    )
      .setScrollFactor(0)
      .setDepth(20000);

    this.feedback = this.add.text(
      24,
      82,
      'Click or tap to walk. Select a building to enter.',
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '26px',
        color: '#fff1d4',
        backgroundColor: '#202822',
        padding: { x: 16, y: 12 },
        wordWrap: {
          width: this.scale.width - 100
        }
      }
    )
      .setScrollFactor(0)
      .setDepth(20000);
  }

  onPointer(pointer, objects) {
    if (
      this.disposed ||
      this.navigating ||
      !pointer.primaryDown
    ) {
      return;
    }

    const id = objects
      .find(object => object.getData('buildingId'))
      ?.getData('buildingId');

    const building = this.buildings.find(
      b => b.id === id
    );

    const world = this.cameras.main.getWorldPoint(
      pointer.x,
      pointer.y
    );

    const target = building
      ? building.door
      : this.unproject(world.x, world.y);

    if (!this.walkable(target.x, target.y)) {
      this.say(
        'That spot is not walkable. Try the street or select a building.'
      );

      return;
    }

    // Retarget through the next cell center.
    const anchor = this.path.length
      ? this.path[0]
      : this.position;

    const route = this.findPath(anchor, target);

    if (route === null) {
      this.say('No clear route to that spot.');
      return;
    }

    this.path = this.path.length
      ? [{ ...anchor }, ...route]
      : route;

    this.destinationBuilding = building ?? null;

    const p = this.project(target.x, target.y);

    this.targetMarker
      .setPosition(p.x, p.y)
      .setVisible(true);

    if (!this.path.length) {
      this.arrive();
    }
  }

  findPath(start, target) {
    const key = this.cellKey(target.x, target.y);

    const queue = [
      { x: start.x, y: start.y }
    ];

    const parents = new Map([
      [this.cellKey(start.x, start.y), null]
    ]);

    let head = 0;

    while (head < queue.length) {
      const cell = queue[head++];

      if (this.cellKey(cell.x, cell.y) === key) {
        const path = [];
        let node = cell;

        while (
          parents.get(
            this.cellKey(node.x, node.y)
          ) !== null
        ) {
          path.push(node);

          node = parents.get(
            this.cellKey(node.x, node.y)
          );
        }

        return path.reverse();
      }

      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1]
      ]) {
        const next = {
          x: cell.x + dx,
          y: cell.y + dy
        };

        const nextKey = this.cellKey(
          next.x,
          next.y
        );

        if (
          !this.walkable(next.x, next.y) ||
          parents.has(nextKey)
        ) {
          continue;
        }

        parents.set(nextKey, cell);
        queue.push(next);
      }
    }

    return null;
  }

  placePlayer() {
    const p = this.project(
      this.position.x,
      this.position.y
    );

    this.player.setPosition(p.x, p.y);

    this.player.setDepth(
      (this.position.x + this.position.y) * 100 + 1
    );
  }

  cancelWalking() {
    this.destinationBuilding = null;

    // Finish the current safe segment.
    this.path = this.path.slice(0, 1);

    this.targetMarker.setVisible(false);
  }

  update(_time, delta) {
    if (
      this.disposed ||
      this.navigating ||
      !this.player
    ) {
      return;
    }

    let budget =
      280 * Math.min(delta, 100) / 1000;

    while (budget > 0 && this.path.length) {
      const next = this.path[0];

      const goal = this.project(
        next.x,
        next.y
      );

      const distance = Math.hypot(
        goal.x - this.player.x,
        goal.y - this.player.y
      );

      if (distance <= budget) {
        budget -= distance;

        this.position = { ...next };
        this.path.shift();
        this.placePlayer();

        if (!this.path.length) {
          this.arrive();
        }
      } else {
        const ratio = budget / distance;

        this.player.x +=
          (goal.x - this.player.x) * ratio;

        this.player.y +=
          (goal.y - this.player.y) * ratio;

        const sum =
          (this.player.y - OY) / HH;

        this.player.setDepth(sum * 100 + 1);

        budget = 0;
      }
    }

    this.saveElapsed += delta;

    if (this.saveElapsed >= 1500) {
      this.saveElapsed = 0;
      this.remember();
    }
  }

  arrive() {
    this.targetMarker.setVisible(false);
    this.remember();

    const building = this.destinationBuilding;

    this.destinationBuilding = null;

    // Enter only after an explicit building selection.
    if (!building) return;

    if (building.id === 'pi-office') {
      void this.openOffice();
    } else {
      this.say(
        `${building.name}: ${building.message}`
      );
    }
  }

  async openOffice() {
    if (this.disposed || this.navigating) {
      return;
    }

    this.navigating = true;

    const token = this.runToken;

    this.remember();

    const moved = await this.goto(
      'DetectiveOfficeScene',
      {
        entrySource: 'city',
        fromScene: KEY,
        gameState
      }
    );

    if (
      this.disposed ||
      this.runToken !== token
    ) {
      return;
    }

    this.navigating = false;

    if (moved === false) {
      this.say(
        'The office could not be opened. Please try again.'
      );
    }
  }

  remember() {
    if (!this.position) return;

    const camera = this.cameras?.main;

    if (
      Number.isFinite(camera?.scrollX) &&
      Number.isFinite(camera?.scrollY)
    ) {
      this.lastCameraPosition = {
        x: camera.scrollX,
        y: camera.scrollY
      };
    }

    const previousCamera =
      gameState.homeCity?.version === 1
        ? gameState.homeCity.camera
        : null;

    const fallbackCamera =
      Number.isFinite(previousCamera?.x) &&
      Number.isFinite(previousCamera?.y)
        ? {
            x: previousCamera.x,
            y: previousCamera.y
          }
        : null;

    const cameraPosition =
      this.lastCameraPosition ??
      fallbackCamera;

    gameState.homeCity = {
      version: 1,
      player: { ...this.position },
      camera: cameraPosition
        ? { ...cameraPosition }
        : null,
      lastEntryPoint: this.entryPoint
    };

    if (gameState.isGameActive) {
      requestAutosave();
    }
  }

  say(text) {
    this.feedbackTimer?.remove(false);

    this.feedback.setText(text);

    this.feedbackTimer = this.time.delayedCall(
      6000,
      () => {
        this.feedback.setText(
          'Click or tap to walk. Select a building to enter.'
        );

        this.feedbackTimer = null;
      }
    );
  }

  disposeCity() {
    if (this.disposed) return;

    this.disposed = true;
    this.runToken = null;

    // The camera may already be unavailable during shutdown.
    this.remember();

    this.feedbackTimer?.remove(false);
    this.feedbackTimer = null;

    this.path = [];
    this.destinationBuilding = null;

    // Do not access the camera here.
  }
}