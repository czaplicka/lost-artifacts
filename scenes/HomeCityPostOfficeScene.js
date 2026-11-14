import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { HomeCityScene as OriginalHomeCityScene } from './HomeCityScene.js';
import { PostOfficeScene } from './PostOfficeScene.js';
import { HospitalScene } from './HospitalScene.js';
import { BusinessCenterScene } from './BusinessCenterScene.js';
import { PALETTES } from './homeCity/HomeCityConfig.js';
import { HomeCityRendererCore } from './homeCity/HomeCityRendererCore.js';

const COLS = 36, ROWS = 22, WORLD_WIDTH = 4125, WORLD_HEIGHT = 2400;
const EXTRA_BUILDINGS = [
  { id: 'post-office', name: __dialogueText("scenes/HomeCityPostOfficeScene.js", "t_bf90c07b7526b278c9c8"), x: 16, y: 3, w: 3, h: 3,
    color: 0xa06048, message: '', sceneKey: 'PostOfficeScene', SceneClass: PostOfficeScene },
  { id: 'hospital', name: __dialogueText("scenes/HomeCityPostOfficeScene.js", "t_97e9623661f2970acb41"), x: 29, y: 13, w: 4, h: 3,
    color: 0xaebdac, message: '', sceneKey: 'HospitalScene', SceneClass: HospitalScene },
  { id: 'business-center', name: __dialogueText("scenes/HomeCityPostOfficeScene.js", "t_a16572219d4cbc8fe62b"), x: 29, y: 3, w: 4, h: 3,
    color: 0x8e9b9b, message: '', sceneKey: 'BusinessCenterScene', SceneClass: BusinessCenterScene }
];
const HOSPITAL_PROPS = [
  { x: 27, y: 13, kind: 'tree', variant: 0 },
  { x: 34, y: 13, kind: 'tree', variant: 1 },
  { x: 27, y: 16, kind: 'planter' }, { x: 35, y: 16, kind: 'planter' },
  { x: 29, y: 17, kind: 'bench' }, { x: 33, y: 17, kind: 'bench' },
  { x: 28, y: 17, kind: 'lamp' }, { x: 34, y: 17, kind: 'lamp' }
];
PALETTES['post-office'] = {
  wall: 0xb98c62, shade: 0x88563f, roof: 0x493c35,
  trim: 0xe1c99e, glass: 0x35494c, accent: 0xd7b16b,
  height: 138, style: 'brick', door: 0x49382d,
  lit: .3, blinds: true, blade: 'lens', sign: __dialogueText("scenes/HomeCityPostOfficeScene.js", "t_620a597cd8e1abb75463"),
  features: [{ t: [1, 1], k: 'vent' }]
};
PALETTES.hospital = {
  wall: 0xb6c3ae, shade: 0x788f83, roof: 0x455b56,
  trim: 0xe3dfc6, glass: 0x354f55, accent: 0xd6c89c,
  height: 180, style: 'stone', door: 0x3d5953,
  lit: .55, blinds: true, blade: 'badge', sign: __dialogueText("scenes/HomeCityPostOfficeScene.js", "t_6c7923d43c2290e41396"),
  features: [{ t: [0, 0], k: 'vent' }, { t: [3, 0], k: 'vent' }]
};
PALETTES['business-center'] = {
  wall: 0x9eaaa5, shade: 0x687c79, roof: 0x3e4b4d,
  trim: 0xd9d4b9, glass: 0x304b57, accent: 0xcbb57b,
  height: 230, style: 'stone', door: 0x324943,
  lit: .25, blinds: true, pilasters: true, blade: 'lens',
  sign: __dialogueText("scenes/HomeCityPostOfficeScene.js", "t_ea28bc91925091253ae9"),
  features: [{ t: [0, 0], k: 'vent' }, { t: [3, 0], k: 'antenna' }]
};

export class HomeCityScene extends OriginalHomeCityScene {
  init(data = {}) {
    super.init(data);
    this.cols = COLS;
    this.rows = ROWS;
    this.alignTavern();
    this.extraBuildings = EXTRA_BUILDINGS.map(def => ({ ...def,
      door: { x: def.x + Math.floor(def.w / 2), y: def.y + def.h }
    }));
    for (const building of this.extraBuildings) {
      this.reserveBuilding(building);
      this.buildings.push(building);
    }
    for (const prop of HOSPITAL_PROPS) {
      if (!this.walkable(prop.x, prop.y)) throw new Error(`[HomeCity] Occupied prop cell: ${prop.x},${prop.y}`);
      this.props.push({ ...prop });
      this.blocked.add(this.cellKey(prop.x, prop.y));
    }
    const start = this.buildings.find(b => b.id === 'pi-office')?.door;
    for (const building of this.buildings) {
      if (!start || this.findPath(start, building.door) === null) {
        throw new Error(`[HomeCity] Unreachable entrance: ${building.id}`);
      }
    }
    this.postalBuilding = this.extraBuildings.find(b => b.id === 'post-office');
  }
  alignTavern() {
    const tavern = this.buildings.find(b => b.id === 'tavern');
    const spyShop = this.buildings.find(b => b.id === 'spy-shop');
    if (!tavern || !spyShop) throw new Error('[HomeCity] Missing tavern or spy shop.');
    tavern.y = spyShop.y;
    tavern.door = { x: tavern.x + Math.floor(tavern.w / 2), y: tavern.y + tavern.h };
    this.blocked.clear();
    for (const building of this.buildings) {
      for (let y = building.y; y < building.y + building.h; y++) {
        for (let x = building.x; x < building.x + building.w; x++) {
          const key = this.cellKey(x, y);
          if (this.blocked.has(key) || HomeCityRendererCore.prototype.isRoad(x, y)) {
            throw new Error(`[HomeCity] Invalid building footprint: ${building.id} at ${x},${y}`);
          }
          this.blocked.add(key);
        }
      }
    }
    for (const prop of this.props) {
      for (let dy = 0; dy < (prop.h || 1); dy++) {
        for (let dx = 0; dx < (prop.w || 1); dx++) {
          const key = this.cellKey(prop.x + dx, prop.y + dy);
          if (this.blocked.has(key)) throw new Error(`[HomeCity] Prop overlaps a building or prop: ${key}`);
          this.blocked.add(key);
        }
      }
    }
  }
  walkable(x, y) {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 &&
      x < this.cols && y < this.rows && !this.blocked.has(this.cellKey(x, y));
  }
  reserveBuilding(building) {
    for (let y = building.y; y < building.y + building.h; y++) {
      for (let x = building.x; x < building.x + building.w; x++) {
        if (HomeCityRendererCore.prototype.isRoad(x, y)) throw new Error(`[HomeCity] Building on road: ${building.id}`);
        if (!this.walkable(x, y)) throw new Error(`[HomeCity] Occupied building cell: ${building.id} at ${x},${y}`);
      }
    }
    if (!this.walkable(building.door.x, building.door.y)) throw new Error(`[HomeCity] Blocked entrance: ${building.id}`);
    for (let y = building.y; y < building.y + building.h; y++) {
      for (let x = building.x; x < building.x + building.w; x++) this.blocked.add(this.cellKey(x, y));
    }
  }
  create() {
    super.create();
    this.extendGround();
    this.drawHospitalForecourt();
    this.drawHospitalCross();
    this.drawBusinessCenterDetails();
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.centerOn(this.player.x, this.player.y);
  }
  extendGround() {
    const art = this.cityArt;
    const tile = (x, y, width, height) => {
      const key = art.bake(`extension_${x}_${y}`, width, height,
        ctx => art.paintGround(ctx, x, y, width, height), x, y);
      if (key) this.add.image(x, y, key).setOrigin(0).setDepth(-1000);
    };
    tile(3300, 0, 825, 1000);
    tile(3300, 1000, 825, 1000);
    for (let x = 0; x < WORLD_WIDTH; x += 825) tile(x, 2000, Math.min(825, WORLD_WIDTH - x), 400);
  }
  drawHospitalForecourt() {
    const g = this.add.graphics().setDepth(-800);
    for (let y = 16; y <= 17; y++) {
      for (let x = 28; x <= 34; x++) {
        const points = this.diamond(x, y);
        g.fillStyle((x + y) % 2 ? 0xa79d83 : 0xb3a88e).fillPoints(points, true);
        g.lineStyle(1, 0x756c57, .6).strokePoints(points, true);
      }
    }
  }
  drawHospitalCross() {
    const b = this.buildings.find(item => item.id === 'hospital');
    const art = this.cityArt, fy = b.y + b.h - .5;
    const center = this.project(b.door.x, fy), left = center.x - 65, top = center.y - 182;
    const key = art.bake('hospital_cross', 130, 110, ctx => {
      art.face(ctx, 'x', fy + .02, b.door.x - .34, b.door.x + .34, 126, 164, 0xe9e4cd, 0x66796c);
      art.face(ctx, 'x', fy + .03, b.door.x - .065, b.door.x + .065, 131, 159, 0xa6443b, null);
      art.face(ctx, 'x', fy + .03, b.door.x - .25, b.door.x + .25, 140, 150, 0xa6443b, null);
    }, left, top);
    if (key) this.add.image(left, top, key).setOrigin(0)
      .setDepth((b.door.x + b.y + b.h - 1) * 100 + 101);
  }
  drawBusinessCenterDetails() {
    const b = this.buildings.find(item => item.id === 'business-center');
    const art = this.cityArt;
    const ground = this.add.graphics().setDepth(-800);
    for (let y = 6; y <= 7; y++) {
      for (let x = 29; x <= 33; x++) {
        const points = this.diamond(x, y);
        ground.fillStyle((x + y) % 2 ? 0xa79d83 : 0xb3a88e).fillPoints(points, true);
        ground.lineStyle(1, 0x756c57, .6).strokePoints(points, true);
      }
    }
    art.bakeBanner(b, __dialogueText("scenes/HomeCityPostOfficeScene.js", "t_86158a4d4f49d52f1db5"), 160, 3.0);
  }
  arrive() {
    const building = this.extraBuildings.find(item => item.id === this.destinationBuilding?.id);
    if (!building) return super.arrive();
    this.destinationBuilding = null;
    this.targetMarker.setVisible(false);
    this.cityArt.clearRoute();
    this.remember();
    if (!this.hasScene(building.sceneKey)) this.scene.add(building.sceneKey, building.SceneClass, false);
    void this.openCityInterior(building.sceneKey, `${building.name}${__dialogueText("scenes/HomeCityPostOfficeScene.js", "t_1cfcfe7c73e898681df4")}`);
  }
}
