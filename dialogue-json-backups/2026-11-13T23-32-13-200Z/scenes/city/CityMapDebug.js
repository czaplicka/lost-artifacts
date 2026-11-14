import { CITY_MAP_LAYOUTS } from './CityMapLayouts.js';

const STORAGE_KEY = 'lost-artifacts:city-map-layouts:v1';
const LOCAL = typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
const clamp = (n, max) => Math.max(0, Math.min(max, n));
const editable = event => event.target?.isContentEditable ||
  ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName);

export function sanitizeLayouts(value) {
  const result = Object.create(null);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const [city, layout] of Object.entries(value)) {
    if (!layout || !Number.isFinite(layout.width) || layout.width <= 0 ||
        !Number.isFinite(layout.height) || layout.height <= 0 || !layout.points) continue;
    const points = Object.create(null);
    for (const [id, p] of Object.entries(layout.points)) {
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
        points[id] = { x: clamp(p.x, layout.width), y: clamp(p.y, layout.height) };
      }
    }
    result[city] = { width: layout.width, height: layout.height, points };
  }
  return result;
}

export class CityMapDebug {
  constructor(scene) {
    this.scene = scene;
    this.enabled = false;
    this.destroyed = false;
    this.selectedIndex = 0;
    this.targets = [];
    this.handles = [];
    this.help = null;
    this.message = '';
    this.baseLayouts = sanitizeLayouts(CITY_MAP_LAYOUTS);
    this.localLayouts = Object.create(null);
    if (LOCAL) {
      try { this.localLayouts = sanitizeLayouts(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')); }
      catch (error) { console.warn('[CityMapDebug] Local layouts could not be loaded.', error); }
    }
    this.onKey = event => this.handleKey(event);
    this.onTick = () => this.tick();
    this.onSleep = () => this.setEnabled(false);
    this.onShutdown = () => this.destroy();
    if (LOCAL) scene.input.keyboard?.on('keydown', this.onKey);
    scene.game.events.on('poststep', this.onTick);
    scene.events.on('sleep', this.onSleep);
    scene.events.on('pause', this.onSleep);
    scene.events.once('shutdown', this.onShutdown);
    this.tick();
  }

  canEdit() {
    const s = this.scene;
    if (!LOCAL || this.destroyed || !s.sys.isActive() || s._cleanupDone ||
        !s.uiReady || s.isTransitioning || s.activePopup || s.isFinalShowdown) return false;
    const hud = s.getPlayerHudScene?.();
    if (hud?.isAnyPanelOpen?.()) return false;
    const allowed = new Set(['CityScene', 'UIScene', 'PlayerHudScene', 'NewsHud']);
    return !s.game.scene.getScenes(true).some(other => !allowed.has(other.sys.settings.key));
  }

  collectTargets() {
    const s = this.scene;
    const result = [];
    const used = new Set();
    for (const view of s.encounterViews || []) {
      if (!view.icon?.active) continue;
      let id = view.encounter.slotId ? `slot:${view.encounter.slotId}` : `encounter:${view.encounter.id}`;
      if (used.has(id)) id = `encounter:${view.encounter.id}`;
      used.add(id);
      result.push({ id, name: view.nameLabel?.text || view.encounter.npcId,
        anchor: view.icon, objects: [view.icon, view.nameLabel, view.statusLabel].filter(Boolean) });
    }
    for (const [id, objects] of [['hotel', s.hotelObjects], ['shop', s.shopObjects]]) {
      const live = (objects || []).filter(object => object?.active);
      if (live.length) result.push({ id, name: id.toUpperCase(), anchor: live[0], objects: live });
    }
    return result;
  }

  getPoint(id) {
    const city = this.scene.cityId;
    const local = this.localLayouts[city];
    const base = this.baseLayouts[city];
    const layout = local?.points?.[id] ? local : base;
    const p = layout?.points?.[id];
    if (!p) return null;
    return {
      x: p.x * this.scene.scale.width / layout.width,
      y: p.y * this.scene.scale.height / layout.height
    };
  }

  moveVisual(target, x, y) {
    const dx = x - target.anchor.x;
    const dy = y - target.anchor.y;
    for (const object of target.objects) {
      if (object?.active) object.setPosition(object.x + dx, object.y + dy);
    }
  }

  remember(target, x, y, persist = true) {
    const s = this.scene;
    const old = this.localLayouts[s.cityId];
    const points = Object.create(null);
    if (old) {
      for (const [id, p] of Object.entries(old.points)) {
        points[id] = { x: p.x * s.scale.width / old.width, y: p.y * s.scale.height / old.height };
      }
    }
    x = Math.round(clamp(x, s.scale.width));
    y = Math.round(clamp(y, s.scale.height));
    points[target.id] = { x, y };
    this.localLayouts[s.cityId] = { width: s.scale.width, height: s.scale.height, points };
    this.moveVisual(target, x, y);
    if (persist) this.save();
    this.syncHandles();
  }

  save() {
    if (!LOCAL) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.localLayouts));
      this.message = 'Saved locally. C exports positions for the project.';
    } catch (error) {
      this.message = 'Local save failed. Press C to export.';
      console.warn('[CityMapDebug] Saving failed.', error);
    }
  }

  tick() {
    if (this.destroyed || !this.scene.sys.isActive()) return;
    if (this.enabled && !this.canEdit()) this.setEnabled(false);
    const targets = this.collectTargets();
    const changed = targets.length !== this.targets.length ||
      targets.some((t, i) => t.id !== this.targets[i]?.id || t.anchor !== this.targets[i]?.anchor);
    this.targets = targets;
    for (const target of targets) {
      const p = this.getPoint(target.id);
      if (p) this.moveVisual(target, p.x, p.y);
    }
    if (this.enabled) {
      // Suppress tutorial drawing only while editing; its progress is not changed.
      this.scene.game.chaseTutorial?.overlay?.hide?.();
      if (changed) this.buildHandles();
      this.syncHandles();
    }
  }

  setEnabled(enabled) {
    if (this.destroyed) return;
    enabled = Boolean(enabled && this.canEdit());
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    if (enabled) {
      this.scene.closeAllUIPanels?.();
      this.selectedIndex = 0;
      this.message = 'Drag a point. Locations are disabled while editing.';
      this.buildHandles();
    } else {
      this.clearHandles();
    }
  }

  clearHandles() {
    for (const h of this.handles) {
      if (h.zone?.scene?.sys?.input) this.scene.input.setDraggable(h.zone, false);
      h.zone?.destroy(); h.box?.destroy(); h.label?.destroy();
    }
    this.handles = [];
    this.help?.destroy(); this.help = null;
  }

  buildHandles() {
    this.clearHandles();
    this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.targets.length - 1));
    this.targets.forEach((target, index) => {
      const width = Math.max(56, Math.min(220, target.anchor.displayWidth || 80));
      const height = Math.max(56, Math.min(220, target.anchor.displayHeight || 80));
      const box = this.scene.add.rectangle(0, 0, width, height, 0x00ff88, 0.16).setDepth(25000);
      const zone = this.scene.add.zone(0, 0, width, height).setDepth(25002)
        .setInteractive({ useHandCursor: true });
      const label = this.scene.add.text(0, 0, '', {
        fontFamily: 'SpecialElite', fontSize: '15px', color: '#ffffff',
        backgroundColor: '#17120fee', padding: { x: 5, y: 3 }
      }).setOrigin(0.5, 1).setDepth(25001);
      this.scene.input.setDraggable(zone, true);
      zone.on('pointerdown', () => { this.selectedIndex = index; this.syncHandles(); });
      zone.on('drag', (pointer, x, y) => {
        if (!this.enabled || !this.canEdit()) return;
        this.selectedIndex = index;
        this.remember(target, x, y, false);
      });
      zone.on('dragend', () => { if (this.enabled) { this.save(); this.syncHandles(); } });
      this.handles.push({ zone, box, label, target, height });
    });
    this.help = this.scene.add.text(12, 0, '', {
      fontFamily: 'SpecialElite', fontSize: '16px', color: '#fff1ce',
      backgroundColor: '#17120fee', padding: { x: 10, y: 8 },
      wordWrap: { width: Math.max(120, this.scene.scale.width - 44) }
    }).setDepth(25003).setScrollFactor(0);
    this.syncHandles();
  }

  syncHandles() {
    if (!this.enabled) return;
    for (const [index, h] of this.handles.entries()) {
      const { x, y } = h.target.anchor;
      h.zone.setPosition(x, y);
      h.box.setPosition(x, y).setStrokeStyle(2, index === this.selectedIndex ? 0xff44ff : 0x00ff88);
      h.label.setText(`${h.target.name} | ${Math.round(x)}, ${Math.round(y)}`)
        .setPosition(x, Math.max(24, y - h.height / 2 - 5));
    }
    const t = this.targets[this.selectedIndex];
    this.help?.setText([
      `CITY MAP DEBUG | ${this.scene.cityId} | ${t?.id || 'no points'}`,
      'D: close | Drag / Arrows: move | Alt: 1px | Tab / Shift+Tab: select',
      'C: export | R: clear local layout for this city | Locations disabled.',
      this.message
    ].join('\n'));
    if (this.help) this.help.setPosition(12, Math.max(90, this.scene.scale.height - this.help.height - 12));
  }

  handleKey(event) {
    if (!LOCAL || editable(event) || event.ctrlKey || event.metaKey) return;
    if (event.code === 'KeyD') {
      if (!event.repeat && (this.enabled || this.canEdit())) {
        event.preventDefault(); this.setEnabled(!this.enabled);
      }
      return;
    }
    if (!this.enabled || !this.canEdit()) return;
    if (event.code === 'KeyC') {
      if (!event.repeat) { event.preventDefault(); this.exportLayouts(); }
      return;
    }
    if (event.code === 'KeyR') {
      if (!event.repeat) { event.preventDefault(); this.resetCity(); }
      return;
    }
    if (!this.targets.length) return;
    if (event.code === 'Tab') {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex + (event.shiftKey ? -1 : 1) + this.targets.length) % this.targets.length;
      this.syncHandles(); return;
    }
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const delta = directions[event.code];
    if (!delta) return;
    event.preventDefault();
    const t = this.targets[this.selectedIndex];
    const step = event.altKey ? 1 : 5;
    this.remember(t, t.anchor.x + delta[0] * step, t.anchor.y + delta[1] * step);
  }

  exportLayouts() {
    const merged = Object.create(null);
    for (const city of new Set([...Object.keys(this.baseLayouts), ...Object.keys(this.localLayouts)])) {
      const base = this.baseLayouts[city];
      const local = this.localLayouts[city];
      const ref = local || base;
      const points = Object.create(null);
      if (base) for (const [id, p] of Object.entries(base.points)) {
        points[id] = { x: p.x * ref.width / base.width, y: p.y * ref.height / base.height };
      }
      if (local) Object.assign(points, local.points);
      merged[city] = { width: ref.width, height: ref.height, points };
    }
    const source = `export const CITY_MAP_LAYOUTS = ${JSON.stringify(merged, null, 2)};\n`;
    console.log('REPLACE scenes/city/CityMapLayouts.js WITH:\n' + source);
    this.message = 'Export printed in console.';
    try {
      const pending = navigator.clipboard?.writeText(source);
      pending?.then(() => {
        if (!this.destroyed) { this.message = 'Export copied to clipboard and printed in console.'; this.syncHandles(); }
      }).catch(() => {
        if (!this.destroyed) { this.message = 'Clipboard unavailable. Copy export from console.'; this.syncHandles(); }
      });
    } catch { this.message = 'Copy export from console.'; }
    this.syncHandles();
    return source;
  }

  resetCity() {
    if (!LOCAL || !this.enabled) return;
    delete this.localLayouts[this.scene.cityId];
    this.save();
    this.setEnabled(false);
    this.scene.createEncounters();
    this.scene.createHotelIcon();
    this.scene.createShopIcon();
    this.tick();
  }

  destroy() {
    if (this.destroyed) return;
    this.enabled = false;
    this.clearHandles();
    this.scene.input.keyboard?.off('keydown', this.onKey);
    this.scene.game.events.off('poststep', this.onTick);
    this.scene.events.off('sleep', this.onSleep);
    this.scene.events.off('pause', this.onSleep);
    this.scene.events.off('shutdown', this.onShutdown);
    this.destroyed = true;
  }
}
