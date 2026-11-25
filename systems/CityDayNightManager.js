import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { getPIClock } from '../managers/PIClockManager.js';
import {
  CITY_DAY_NIGHT_SCENES, DAY_NIGHT_TRANSITION_MS,
  normalizeCityMinute, readAgencyLightingMinute, sampleCityLighting, blendCityLighting
} from './CityDayNightModel.js';

const ACTIVE = new WeakMap();
const ALLOWED = new Set(CITY_DAY_NIGHT_SCENES);

export class CityDayNightManager {
  constructor(scene) {
    this.scene = scene;
    this.homeCity = scene.sys.settings.key === 'HomeCityScene';
    this.destroyed = false;
    this.pollElapsed = 0;
    this.transitionElapsed = DAY_NIGHT_TRANSITION_MS;
    this.minute = this.readMinute();
    this.current = sampleCityLighting(this.minute);
    this.from = { ...this.current };
    this.target = { ...this.current };
    this.lastColor = null;
    this.lastAlpha = null;
    this.eventName = this.homeCity ? 'pi:timeChanged' : 'timeChanged';
    this.onTime = () => this.syncTime(false);
    this.onUpdate = (_time, delta) => this.update(delta);
    this.onWake = () => {
      this.prepareBackgroundLayer();
      this.resize();
      this.syncTime(true);
    };
    this.onResize = () => {
      this.prepareBackgroundLayer();
      this.resize();
    };

    this.prepareBackgroundLayer();
    this.root = scene.add.container(0,0)
      .setScrollFactor(0)
      .setDepth(this.homeCity ? 18999 : -1);
    this.veil = scene.add.rectangle(0,0,1,1,this.current.color,1).setOrigin(0);
    this.root.add(this.veil);
    this.resize();
    this.draw();

    EventBus.on(this.eventName,this.onTime);
    scene.events.on('update',this.onUpdate);
    scene.events.on('wake',this.onWake);
    scene.events.on('resume',this.onWake);
    scene.scale.on('resize',this.onResize);
  }

  readMinute() {
    return this.homeCity
      ? normalizeCityMinute(getPIClock().minuteOfDay)
      : readAgencyLightingMinute(gameState);
  }

  prepareBackgroundLayer() {
    const scene = this.scene;
    if (scene.sys.settings.key !== 'CityScene') return;
    const {width,height} = scene.scale;
    for (const object of scene.children.list) {
      if (object.type === 'Image' && !object.input?.enabled && object.depth === 0 &&
          Math.abs(object.displayWidth-width)<2 && Math.abs(object.displayHeight-height)<2 &&
          Math.abs(object.x-width/2)<2 && Math.abs(object.y-height/2)<2) {
        object.setDepth(-10);
      }
    }
  }

  resize() {
    if (this.destroyed || !this.root?.active) return;
    this.veil.setDisplaySize(Math.max(1,this.scene.scale.width),Math.max(1,this.scene.scale.height));
    this.syncCamera();
  }

  syncCamera() {
    const camera = this.scene.cameras.main;
    const zoom = Math.max(0.01,Number(camera.zoom) || 1);
    this.root.setScale(1/zoom).setPosition(
      camera.width*0.5*(1-1/zoom),camera.height*0.5*(1-1/zoom));
  }

  syncTime(immediate = false) {
    if (this.destroyed) return;
    const minute = this.readMinute();
    if (!immediate && minute === this.minute) return;
    this.minute = minute;
    this.from = { ...this.current };
    this.target = sampleCityLighting(minute);
    this.transitionElapsed = immediate ? DAY_NIGHT_TRANSITION_MS : 0;
    if (immediate) {
      this.current = { ...this.target };
      this.draw();
    }
  }

  draw() {
    if (this.destroyed || !this.veil?.active) return;
    if (this.lastColor !== this.current.color) {
      this.veil.setFillStyle(this.current.color,1);
      this.lastColor = this.current.color;
    }
    if (this.lastAlpha !== this.current.alpha) {
      this.veil.setAlpha(this.current.alpha);
      this.lastAlpha = this.current.alpha;
    }
    this.root.setVisible(this.current.alpha > 0.0001);
  }

  update(delta) {
    if (this.destroyed || !this.root?.active || !this.scene.sys.isActive()) return;
    const dt = Math.max(0,Math.min(100,Number(delta) || 0));
    this.syncCamera();
    this.pollElapsed += dt;
    if (this.pollElapsed >= 500) {
      this.pollElapsed = 0;
      this.syncTime(false);
    }
    if (this.transitionElapsed < DAY_NIGHT_TRANSITION_MS) {
      this.transitionElapsed = Math.min(DAY_NIGHT_TRANSITION_MS,this.transitionElapsed+dt);
      const t = this.transitionElapsed/DAY_NIGHT_TRANSITION_MS;
      this.current = blendCityLighting(this.from,this.target,t*t*(3-2*t));
      this.draw();
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    EventBus.off(this.eventName,this.onTime);
    this.scene.events.off('update',this.onUpdate);
    this.scene.events.off('wake',this.onWake);
    this.scene.events.off('resume',this.onWake);
    this.scene.scale.off('resize',this.onResize);
    this.root?.destroy(true);
    this.root = null;
    this.veil = null;
  }
}

export function installCityDayNight(scene) {
  if (!ALLOWED.has(scene?.sys?.settings?.key)) return null;
  const existing = ACTIVE.get(scene);
  if (existing) return existing.manager;
  const record = {manager:null,start:null,dispose:null};
  record.dispose = () => {
    scene.events.off('create',record.start);
    scene.events.off('shutdown',record.dispose);
    scene.events.off('destroy',record.dispose);
    record.manager?.destroy();
    if (ACTIVE.get(scene) === record) ACTIVE.delete(scene);
  };
  record.start = () => {
    scene.events.off('create',record.start);
    if (ACTIVE.get(scene) !== record || scene._cleanupDone) return;
    try {
      record.manager = new CityDayNightManager(scene);
    } catch (error) {
      record.dispose();
      console.error('[CityDayNight] Lighting initialization failed:',error);
    }
  };
  ACTIVE.set(scene,record);
  scene.events.once('shutdown',record.dispose);
  scene.events.once('destroy',record.dispose);
  scene.events.once('create',record.start);
  if (scene.sys.isActive()) record.start();
  return record.manager;
}

export function uninstallCityDayNight(scene) {
  ACTIVE.get(scene)?.dispose();
}
