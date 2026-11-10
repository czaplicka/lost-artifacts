import { HomeCityCemetery } from './HomeCityCemetery.js';
import { WORLD_W, WORLD_H, PROP_SPRITE_TWEAKS } from './HomeCityConfig.js';
import { hash } from './HomeCityDrawing.js';
import { PROP_ART, treeArt, drawCar, CAR_COLORS } from './HomeCityPropArt.js';

// Chance that a perimeter cell (distance 1/2/3 outside the map) gets a tree or bush.
const PERIMETER_DENSITY = [0, 0.3, 0.18, 0.09];

export class HomeCityProps extends HomeCityCemetery {
  propKey(prop) {
    const v = Number.isInteger(prop.variant) ? prop.variant : Math.floor(hash(prop.x, prop.y, 9) * 3);
    if (prop.kind === 'car') return { name: `car_${prop.w > 1 ? 'x' : 'y'}`, v: v % 3 };
    if (prop.kind === 'tree') return { name: `tree_${v % 3}`, v: v % 3 };
    return { name: prop.kind, v };
  }
  bakeProp(name, v) {
    const cache = this.propCache ?? (this.propCache = new Map()), ck = name.startsWith('car_') ? `${name}:${v}` : name;
    if (cache.has(ck)) return cache.get(ck);
    let key = null;
    if (name.startsWith('tree_')) { const a = treeArt(Number(name.slice(5))); key = this.bakeSprite(name, a.w, a.h, a.ax, a.ay, a.draw); }
    else if (name.startsWith('car_')) key = this.bakeSprite(`${name}_${v}`, 300, 170, 150, 118, ctx => drawCar(ctx, name.endsWith('x') ? 'x' : 'y', CAR_COLORS[v]));
    else if (PROP_ART[name]) { const a = PROP_ART[name]; key = this.bakeSprite(name, a.w, a.h, a.ax, a.ay, a.draw); }
    cache.set(ck, key); return key;
  }
  drawProps() {
    const s = this.scene;
    s.props.forEach((prop, i) => {
      const w = prop.w || 1, h = prop.h || 1, cx = prop.x + (w - 1) / 2, cy = prop.y + (h - 1) / 2, c = this.pt(cx, cy), pk = this.propKey(prop);
      const ext = `hc_prop_${pk.name}`, depth = (prop.x + w - 1 + prop.y + h - 1) * 100 + 1;
      let img;
      if (this.has(ext)) { const t = PROP_SPRITE_TWEAKS[pk.name] || {}; img = s.add.image(c.x + (t.dx || 0), c.y + (t.dy || 0), ext).setOrigin(0.5, 1).setScale(t.scale || 1); }
      else { const key = this.bakeProp(pk.name, pk.v); if (!key) return; img = s.add.image(c.x, c.y, key).setOrigin(...this.anchors.get(key)); }
      img.setDepth(depth).setData('propIndex', i).setInteractive({ pixelPerfect: true, alphaTolerance: 40 });
      if (prop.kind === 'lamp') {
        this.lights.push({ x: c.x, y: c.y - 108, r: 1.3, a: 0.5, c: 0xffd28a, flicker: true }, { x: c.x, y: c.y + 2, r: 1, sx: 2.6, sy: 1.1, a: 0.2, c: 0xffd28a, ground: true });
        this.perches.push({ x: c.x, y: c.y - 146 });
      }
    });
    this.drawPerimeter();
  }
  drawPerimeter() {
    const s = this.scene;
    for (let y = -4; y < s.rows + 4; y++) for (let x = -4; x < s.cols + 4; x++) {
      const d = this.outsideDist(x, y); if (d < 1 || d > 3 || this.isRoad(x, y)) continue;
      if (hash(x, y, 41) > PERIMETER_DENSITY[d]) continue;
      const c = this.pt(x, y); if (c.x < -80 || c.x > WORLD_W + 80 || c.y < -80 || c.y > WORLD_H + 120) continue;
      // mostly green trees / bushes; autumn trees are the rare accent
      const r = hash(x, y, 44), v = r < 0.5 ? 0 : r < 0.85 ? 1 : 2, tree = hash(x, y, 43) > 0.4, key = this.bakeProp(tree ? `tree_${v}` : 'bush', 0); if (!key) continue;
      s.add.image(c.x, c.y, key).setOrigin(...this.anchors.get(key)).setDepth((x + y) * 100 + 1).setTint(d === 1 ? 0xc8cec8 : d === 2 ? 0x98a098 : 0x6e756e);
    }
  }
}
