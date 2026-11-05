import { HomeCityScene as OriginalHomeCityScene } from './HomeCityScene.js';
import { PostOfficeScene } from './PostOfficeScene.js';

const POST_OFFICE = {
  id: 'post-office',
  name: 'Post Office',
  x: 16,
  y: 3,
  w: 3,
  h: 3,
  color: 0xa06048,
  message: ''
};

export class HomeCityScene extends OriginalHomeCityScene {
  init(data = {}) {
    super.init(data);
    const b = {
      ...POST_OFFICE,
      door: {
        x: POST_OFFICE.x + Math.floor(POST_OFFICE.w / 2),
        y: POST_OFFICE.y + POST_OFFICE.h
      }
    };

    for (let y = b.y; y < b.y + b.h; y++) {
      for (let x = b.x; x < b.x + b.w; x++) {
        if (!this.walkable(x, y)) {
          throw new Error(`[PostOfficeMap] Occupied footprint cell: ${x},${y}`);
        }
      }
    }
    if (!this.walkable(b.door.x, b.door.y)) {
      throw new Error('[PostOfficeMap] The post office entrance is blocked.');
    }

    this.postalBuilding = b;
    for (let y = b.y; y < b.y + b.h; y++) {
      for (let x = b.x; x < b.x + b.w; x++) {
        this.blocked.add(this.cellKey(x, y));
      }
    }

    const start = this.buildings.find(item => item.id === 'pi-office')?.door;
    if (!start || this.findPath(start, b.door) === null) {
      throw new Error('[PostOfficeMap] No walking route to the post office.');
    }
    for (const existing of this.buildings) {
      if (this.findPath(start, existing.door) === null) {
        throw new Error(`[PostOfficeMap] Entrance became unreachable: ${existing.id}`);
      }
    }
  }

  create() {
    // The original renderer handles the original buildings only.
    super.create();
    const b = this.postalBuilding;
    this.buildings.push(b);
    this.drawPostOffice(b);

    if (this.entryPoint === b.id) {
      this.position = { ...b.door };
      this.placePlayer();
      this.cameras.main.centerOn(this.player.x, this.player.y);
      this.remember();
    }
  }

  drawPostOffice(b) {
    const left = b.x - 0.5;
    const right = b.x + b.w - 0.5;
    const back = b.y - 0.5;
    const front = b.y + b.h - 0.5;
    const height = 130;
    const centreX = b.x + (b.w - 1) / 2;
    const depth = (b.x + b.y + b.w + b.h - 2) * 100;
    const p = (x, y, z = 0) => {
      const point = this.project(x, y);
      return { x: point.x, y: point.y - z };
    };
    const g = this.add.graphics().setDepth(depth);
    const roof = [
      p(left, back, height),
      p(right, back, height),
      p(right, front, height),
      p(left, front, height)
    ];

    g.fillStyle(0x88563f).fillPoints([
      p(right, back), p(right, front),
      p(right, front, height), p(right, back, height)
    ], true);
    g.fillStyle(0xb98c62).fillPoints([
      p(left, front), p(right, front),
      p(right, front, height), p(left, front, height)
    ], true);
    g.fillStyle(0x493c35).fillPoints(roof, true);

    const door = p(centreX, front);
    g.fillStyle(0x303b40).fillRect(door.x - 19, door.y - 65, 38, 65);

    const sign = p(centreX, front, 105);
    this.add.text(sign.x, sign.y, 'POST OFFICE', {
      fontFamily: 'PressStart2P, monospace',
      fontSize: '13px',
      color: '#ffe4ac',
      backgroundColor: '#493c35',
      padding: { x: 8, y: 8 }
    })
      .setOrigin(0.5)
      .setDepth(depth + 1)
      .setInteractive({ useHandCursor: true })
      .setData('buildingId', b.id);

    const outline = [
      p(left, back, height), p(right, back, height),
      p(right, back), p(right, front),
      p(left, front), p(left, front, height)
    ];
    g.setInteractive(
      new Phaser.Geom.Polygon(outline),
      Phaser.Geom.Polygon.Contains
    ).setData('buildingId', b.id);
    g.input.cursor = 'pointer';
  }

  arrive() {
    if (this.destinationBuilding?.id !== 'post-office') {
      return super.arrive();
    }
    this.destinationBuilding = null;
    this.targetMarker.setVisible(false);
    this.cityArt.clearRoute();
    this.remember();

    if (!this.hasScene('PostOfficeScene')) {
      this.scene.add('PostOfficeScene', PostOfficeScene, false);
    }
    void this.openCityInterior(
      'PostOfficeScene',
      'The post office could not be opened. Please try again.'
    );
  }
}