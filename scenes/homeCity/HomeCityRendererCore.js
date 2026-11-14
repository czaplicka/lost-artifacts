import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { poly } from './HomeCityDrawing.js';

let instances = 0;

export class HomeCityRendererCore {
  constructor(scene) {
    this.scene = scene; this.uid = ++instances; this.destroyed = false;
    this.buildingArt = new Map(); this.routeGraphics = null; this.hl = null; this.prompt = null;
    this.keys = new Set(); this.anchors = new Map(); this.lights = []; this.smokeSpots = []; this.perches = [];
    this.pigeons = []; this.walkers = []; this.ghost = null; this.hoverId = null; this.selectedId = null;
    this.origin = scene.project(0, 0); this.paths = new Set();
    for (const b of scene.buildings) for (let y = b.door.y; y < scene.rows && !this.isRoad(b.door.x, y); y++) this.paths.add(scene.cellKey(b.door.x, y));
  }

  // ------------------------------------------------------------- basics ---
  has(key) { return !!this.scene?.textures?.exists(key); }
  pt(x, y, z = 0) { const p = this.scene.project(x, y); return { x: p.x, y: p.y - z }; }
  P(axis, u, f, z) { return axis === 'x' ? this.pt(u, f, z) : this.pt(f, u, z); }
  faceP(axis, fixed, u1, u2, low, high) { return [this.P(axis, u1, fixed, low), this.P(axis, u2, fixed, low), this.P(axis, u2, fixed, high), this.P(axis, u1, fixed, high)]; }
  face(ctx, axis, fixed, u1, u2, low, high, color, stroke = color) { poly(ctx, this.faceP(axis, fixed, u1, u2, low, high), color, stroke); }
  bake(name, w, h, draw, tx = 0, ty = 0) {
    const key = `hc${this.uid}_${name}`;
    if (this.destroyed || !this.scene?.textures) return null;
    if (this.scene.textures.exists(key)) return key;
    const tex = this.scene.textures.createCanvas(key, Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
    if (!tex) return null;
    const ctx = tex.getContext(); ctx.save(); ctx.translate(-tx, -ty); draw(ctx); ctx.restore(); tex.refresh();
    this.keys.add(key); return key;
  }
  bakeSprite(name, w, h, ax, ay, draw) { const key = this.bake(name, w, h, draw, -ax, -ay); if (key) this.anchors.set(key, [ax / w, ay / h]); return key; }
  afterFonts(fn) {
    const run = () => { if (!this.destroyed && this.scene) fn(); };
    const fonts = typeof document !== 'undefined' ? document.fonts : null;
    if (!fonts?.load) return run();
    Promise.all([fonts.load(__dialogueText("scenes/homeCity/HomeCityRendererCore.js", "t_d7ecb035e53e3b167e6b")), fonts.load(__dialogueText("scenes/homeCity/HomeCityRendererCore.js", "t_e44af1cb7a3385642f4a"))]).then(run, run);
  }
  isRoad(x, y) { return (x >= 9 && x <= 11) || (y >= 8 && y <= 11) || (y >= 18 && y <= 19) || (x >= 1 && x <= 2); }
  isSidewalk(x, y) { return [0, 3, 8, 12].includes(x) || [7, 12, 17, 20].includes(y); }
  isPlaza(x, y) { return x >= 13 && x <= 17 && y >= 8 && y <= 11; }
  kind(x, y) {
    const s = this.scene, out = x < 0 || y < 0 || x >= s.cols || y >= s.rows;
    if (this.isPlaza(x, y)) return 'plaza';
    if (this.isRoad(x, y)) return 'road';
    if (out) return 'outside';
    return this.isSidewalk(x, y) || this.paths.has(s.cellKey(x, y)) ? 'walk' : 'grass';
  }
  outsideDist(x, y) { const s = this.scene; return Math.max(0, -x, -y, x - (s.cols - 1), y - (s.rows - 1)); }

}
