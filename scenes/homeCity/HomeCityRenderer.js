import { HomeCityExtras } from './HomeCityExtras.js';
export { BUILDING_SPRITE_TWEAKS, PROP_SPRITE_TWEAKS } from './HomeCityConfig.js';

export class HomeCityRenderer extends HomeCityExtras {
  showRoute(path) {
    const g = this.routeGraphics; if (!g) return; g.clear();
    for (const cell of path) { const p = this.pt(cell.x, cell.y); g.fillStyle(0x2b2418, 0.35).fillEllipse(p.x + 1, p.y + 1, 12, 6); g.fillStyle(0xf1d49a, 0.7).fillEllipse(p.x, p.y, 10, 5); }
  }
  clearRoute() { this.routeGraphics?.clear(); }
  destroy() {
    if (this.destroyed) return; this.destroyed = true;
    const textures = this.scene?.textures, keys = [...this.keys];
    this.buildingArt.clear(); this.routeGraphics = null; this.pigeons = []; this.walkers = []; this.vehicles = []; this.flocks = [];
    this.prompt = null; this.bubble = null; this.cat = null; this.hl = null; this.ghost = null; this.scene = null;
    if (textures && keys.length) setTimeout(() => { try { for (const k of keys) if (textures.exists(k)) textures.remove(k); } catch { /* game already destroyed */ } }, 80);
  }
}
