import { HOME_TOWN_ID, getTown } from '../config/RoadTripTowns.js';
import { getCurrentTownId, canStartRoadTrip } from './RoadTripManager.js';
import { LocalAreaDestinationsUI } from '../ui/LocalAreaDestinationsUI.js';
import {
  LocalAreaTownScene, LOCAL_TOWN_SCENE,
  bindLocalAreaSession, unbindLocalAreaSession
} from '../scenes/LocalAreaTownScene.js';
import { localAreaText as t } from '../dialogues/LocalAreaText.js';

const INSTALL = Symbol.for('lost-artifacts.local-area-travel');
let sequence = 0;

export class LocalAreaTravelController {
  constructor(ui) {
    this.ui = ui;
    this.owner = ui.scene;
    this.game = this.owner.game;
    this.session = null;
    this.map = null;
    this.busy = false;
    this.disposed = false;
    this.closingMap = false;
    this.previousOpen = ui.openLocalArea;
    this.boundOpen = options => this.open(options);
    ui.openLocalArea = this.boundOpen;
    this.previousDesktop = ui.desktop.render;
    const controller = this;
    this.desktopRender = function (...args) {
      const result = controller.previousDesktop.apply(this, args);
      const { x, y } = ui.layout;
      this.createIcon(x + 152, y + 10, 128, t('icon'), 'local-road',
        0xc6ad72, () => void controller.open());
      return result;
    };
    ui.desktop.render = this.desktopRender;
    this.previousGlyph = ui.desktop.drawGlyph;
    this.drawGlyph = function (g, kind, cx, top, color) {
      if (kind !== 'local-road') {
        return controller.previousGlyph.call(this, g, kind, cx, top, color);
      }
      g.fillStyle(color, 1).fillRect(cx - 27, top + 4, 52, 44);
      g.lineStyle(2, 0x1b2530, 1).strokeRect(cx - 27, top + 4, 52, 44);
      g.lineStyle(9, 0x605b54, 1).lineBetween(cx - 21, top + 40, cx + 19, top + 12);
      g.lineStyle(2, 0xf5e6b0, 1).lineBetween(cx - 17, top + 37, cx - 10, top + 32);
      g.lineBetween(cx - 4, top + 28, cx + 3, top + 23);
      g.fillStyle(0x9c3428, 1).fillCircle(cx + 17, top + 12, 5);
    };
    ui.desktop.drawGlyph = this.drawGlyph;
    this.onShutdown = () => this.destroy();
    this.owner.events.once('shutdown', this.onShutdown);
  }

  // game.scene is SceneManager; visibility belongs to the target Scene's Systems.
  setSceneVisibility(key, visible) {
    const scene = this.game.scene.keys[key];
    if (!scene) return false;
    scene.sys.setVisible(visible);
    return true;
  }

  isHome() { return getCurrentTownId() === HOME_TOWN_ID; }
  alive() {
    return !this.disposed && !this.ui.destroyed && this.ui.isOpen && this.owner.sys.isActive();
  }
  async prepare() {
    if (!this.game.scene.keys[LOCAL_TOWN_SCENE]) {
      this.game.scene.add(LOCAL_TOWN_SCENE, LocalAreaTownScene, false);
    }
    if (!this.game.scene.keys.DriveScene) {
      const { DriveScene } = await import('../scenes/DriveScene.js');
      if (!this.disposed && !this.game.scene.keys.DriveScene) {
        this.game.scene.add('DriveScene', DriveScene, false);
      }
    }
  }
  availability(town) {
    return { ok: true, description: '', message: '', label: t('drive', { town: town.name }) };
  }
  closeOfficeMap() {
    this.closingMap = true;
    const map = this.map;
    this.map = null;
    try {
      if (map?.isOpen) map.close({ restoreHud: false });
      map?.destroy();
    } finally { this.closingMap = false; }
  }
  restoreComputer() {
    if (this.disposed || this.ui.destroyed) return;
    this.owner.computerChild = null;
    this.owner.childLoading = false;
    if (typeof this.owner.returnToComputer === 'function') {
      this.owner.returnToComputer();
    } else { this.ui.resume(); }
    this.owner.hideGameplayHud?.();
  }
  async open({ townId = null } = {}) {
    if (!this.alive() || this.ui.suspended || this.busy || this.session ||
      this.owner.navigating || this.owner.moveIn || this.owner.computerChild || this.owner.childLoading) {
      return false;
    }
    this.busy = true;
    try {
      await this.prepare();
      if (!this.alive() || this.ui.suspended) return false;
      // Recover the actual town from an older save, without charging a new journey.
      if (!this.isHome()) {
        this.beginSession();
        this.showTown();
        return true;
      }
      this.closeOfficeMap();
      this.owner.computerChild = 'local-area';
      this.ui.suspend();
      this.map = new LocalAreaDestinationsUI(this.owner, {
        getAvailability: town => this.availability(town),
        onConfirm: town => this.depart(town),
        onClose: () => {
          if (!this.closingMap && !this.session) this.restoreComputer();
        }
      });
      this.map.open();
      const wanted = townId || getCurrentTownId();
      const pin = this.map.pins.find(entry => entry.town.id === wanted);
      if (pin) this.map.selectTown(pin.town, pin);
      this.owner.hideGameplayHud?.();
      return true;
    } catch (error) {
      console.error('[LocalArea] Opening failed:', error);
      this.closeOfficeMap();
      if (this.session && this.isHome()) this.finish();
      else if (this.session) this.showTown();
      else this.restoreComputer();
      this.showOfficeError(t('mapError'));
      return false;
    } finally { this.busy = false; }
  }
  restoreLocation() {
    if (!this.isHome()) return this.open();
    return Promise.resolve(false);
  }
  beginSession() {
    if (this.session) return;
    const id = `local-travel-${Date.now()}-${++sequence}`;
    const managed = new Set([LOCAL_TOWN_SCENE, 'DriveScene']);
    const scenes = this.game.scene.getScenes(true)
      .filter(scene => !managed.has(scene.sys.settings.key))
      .map(scene => ({key: scene.sys.settings.key, visible: scene.sys.settings.visible !== false}));
    const hud = typeof document === 'undefined' ? null : document.getElementById('hud-container');
    this.session = { id, scenes, hud, hudDisplay: hud?.style.display, phase: 'town' };
    bindLocalAreaSession(id, this);
    this.closeOfficeMap();
    this.ui.suspend();
    this.owner.computerChild = 'local-area-trip';
    for (const entry of scenes) {
      this.game.scene.pause(entry.key);
      this.setSceneVisibility(entry.key, false);
    }
    if (hud) hud.style.display = 'none';
  }
  showTown(source = null) {
    if (!this.session || this.disposed) return;
    const data = { localAreaSession: this.session.id };
    this.session.phase = 'town';
    if (source) source.scene.start(LOCAL_TOWN_SCENE, data);
    else this.game.scene.start(LOCAL_TOWN_SCENE, data);
    this.game.scene.bringToTop(LOCAL_TOWN_SCENE);
  }
  arrive(scene) {
    if (!this.session || this.disposed) return;
    this.session.phase = 'town';
    this.owner.hideGameplayHud?.();
    if (this.session.hud) this.session.hud.style.display = 'none';
    this.game.scene.bringToTop(scene.sys.settings.key);
  }
  async depart(town, source = null) {
    if (this.disposed || this.busy || this.session?.phase === 'driving') return false;
    if (!source && !this.map?.isOpen) return false;
    this.busy = true;
    try {
      await this.prepare();
      if (this.disposed || this.ui.destroyed) return false;
      const fromId = getCurrentTownId();
      if (town.id !== fromId) {
        const check = canStartRoadTrip(fromId, town.id);
        if (!check.ok) {
          if (source) { source.message = check.message; source.draw(); }
          else this.map?.showError(check.message);
          return false;
        }
      }
      if (!this.session && (this.game.scene.isActive('DriveScene') ||
        this.game.scene.isPaused('DriveScene') || this.game.scene.isActive(LOCAL_TOWN_SCENE))) {
        return false;
      }
      this.beginSession();
      if (source?.map) source.map.close({ restoreHud: false });
      if (town.id === fromId) {
        if (!source) this.showTown();
        return true;
      }
      this.session.phase = 'driving';
      const data = {
        fromTownId: fromId, toTownId: town.id, nextScene: LOCAL_TOWN_SCENE,
        nextData: { localAreaSession: this.session.id }
      };
      if (source) source.scene.start('DriveScene', data);
      else this.game.scene.start('DriveScene', data);
      this.game.scene.bringToTop('DriveScene');
      return true;
    } catch (error) {
      console.error('[LocalArea] Journey failed:', error);
      if (this.session) {
        this.session.phase = 'town';
        if (source?.sys.isActive()) { source.message = t('travelError'); source.draw(); }
        else this.showTown();
      } else { this.map?.showError(t('travelError')); }
      return false;
    } finally { this.busy = false; }
  }
  openTownMap(scene) {
    if (!this.session || this.busy || scene.loading) return;
    try {
      if (!scene.map || scene.map.isDestroyed) {
        scene.map = new LocalAreaDestinationsUI(scene, {
          getAvailability: town => this.availability(town),
          onConfirm: town => this.depart(town, scene),
          onClose: () => {
            this.owner.hideGameplayHud?.();
            if (this.session?.hud) this.session.hud.style.display = 'none';
          }
        });
      }
      scene.map.open();
      const pin = scene.map.pins.find(entry => entry.town.id === getCurrentTownId());
      if (pin) scene.map.selectTown(pin.town, pin);
    } catch (error) {
      console.error('[LocalArea] Map failed:', error);
      scene.message = t('mapError');
      scene.draw();
    }
  }
  goHome(scene) {
    if (this.busy || scene.loading) return false;
    if (this.isHome()) { this.finish(); return true; }
    return this.depart(getTown(HOME_TOWN_ID), scene);
  }
  finish() {
    if (!this.session || !this.isHome()) return false;
    const saved = this.session;
    this.session = null;
    unbindLocalAreaSession(saved.id);
    this.game.scene.stop(LOCAL_TOWN_SCENE);
    for (const entry of saved.scenes) {
      if (!this.game.scene.keys[entry.key]) continue;
      if (this.game.scene.isPaused(entry.key)) this.game.scene.resume(entry.key);
      this.setSceneVisibility(entry.key, entry.visible);
    }
    if (saved.hud?.isConnected) saved.hud.style.display = saved.hudDisplay;
    this.restoreComputer();
    this.game.scene.bringToTop(this.owner.sys.settings.key);
    return true;
  }
  showOfficeError(message) {
    if (this.disposed || this.ui.destroyed) return;
    this.errorPanel?.destroy(true);
    const { width, height } = this.owner.scale.gameSize || this.owner.scale;
    const bg = this.owner.add.rectangle(width / 2, height / 2, width * 0.82, 160, 0x30251c)
      .setStrokeStyle(2, 0xd4af37).setInteractive();
    const label = this.owner.add.text(width / 2, height / 2, message, {
      fontFamily: 'SpecialElite', fontSize: '24px', color: '#fff0cc', align: 'center',
      wordWrap: { width: width * 0.75 }
    }).setOrigin(0.5);
    const panel = this.owner.add.container(0, 0, [bg, label]).setDepth(2500);
    this.errorPanel = panel;
    const close = () => {
      if (this.errorPanel === panel) this.errorPanel = null;
      if (panel.scene) panel.destroy(true);
    };
    bg.once('pointerdown', close);
    this.owner.time.delayedCall(6000, close);
  }
  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.closeOfficeMap();
    this.errorPanel?.destroy(true);
    if (this.session) {
      if (this.activeLocation) this.game.scene.stop(this.activeLocation);
      unbindLocalAreaSession(this.session.id);
      if (this.game.scene.keys[LOCAL_TOWN_SCENE]?.sessionId === this.session.id) {
        this.game.scene.stop(LOCAL_TOWN_SCENE);
      }
      if (this.session.hud?.isConnected) this.session.hud.style.display = this.session.hudDisplay;
      for (const entry of this.session.scenes) {
        if (entry.key === this.owner.sys.settings.key || !this.game.scene.keys[entry.key]) continue;
        if (this.game.scene.isPaused(entry.key)) this.game.scene.resume(entry.key);
        this.setSceneVisibility(entry.key, entry.visible);
      }
      this.session = null;
    }
    if (this.ui.openLocalArea === this.boundOpen) {
      if (this.previousOpen === undefined) delete this.ui.openLocalArea;
      else this.ui.openLocalArea = this.previousOpen;
    }
    if (this.ui.desktop.render === this.desktopRender) this.ui.desktop.render = this.previousDesktop;
    if (this.ui.desktop.drawGlyph === this.drawGlyph) this.ui.desktop.drawGlyph = this.previousGlyph;
    this.owner.events.off('shutdown', this.onShutdown);
    if (this.ui[INSTALL] === this) delete this.ui[INSTALL];
  }
}
export function installLocalAreaTravel(ui) {
  if (!ui[INSTALL]) ui[INSTALL] = new LocalAreaTravelController(ui);
  return ui[INSTALL];
}
