import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';

const CITY_SCENES = new Set(['CityScene', 'CrimeCityScene', 'HomeCityScene']);
const WEATHER_TYPES = ['clear', 'rain', 'snow', 'fog'];
const STATE_KEY = 'cityWeather';
const STATE_VERSION = 1;
const AGENCY_WEATHER_HOURS = 6;
const HOME_WEATHER_SECONDS = 8 * 60;
const FOG_TEXTURE = '__city_weather_fog_v1';
const AGENCY_FOG_TEXTURE = '__city_weather_agency_fog_v2';
const SNOW_CITIES = new Set([
  'warsaw', 'paris', 'london', 'berlin', 'prague', 'vienna', 'budapest', 'oslo',
  'stockholm', 'helsinki', 'copenhagen', 'reykjavik', 'moscow', 'kyiv', 'toronto',
  'montreal', 'ottawa', 'new_york', 'new_york_city', 'chicago', 'boston', 'beijing', 'seoul', 'tokyo'
]);
const DRY_CITIES = new Set(['cairo', 'giza', 'luxor', 'dubai', 'abu_dhabi', 'riyadh', 'marrakesh', 'marrakech']);
const ACTIVE_MANAGERS = new WeakMap();

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function random(min, max) { return min + Math.random() * (max - min); }
function normalizeCityId(value) { return String(value || 'unknown').trim().toLowerCase().replace(/\s+/g, '_'); }
function getAgencyHour() {
  const day = Number(gameState.currentDay ?? gameState.day ?? 1);
  const hour = Number(gameState.currentHour ?? gameState.hour ?? 8);
  const minute = Number(gameState.currentMinute ?? gameState.minute ?? 0);
  return Math.max(0, Number.isFinite(day) ? day - 1 : 0) * 24 +
    (Number.isFinite(hour) ? hour : 8) + (Number.isFinite(minute) ? minute : 0) / 60;
}
function readWeatherState() {
  const value = gameState[STATE_KEY];
  if (value && value.version === STATE_VERSION && value.cities && typeof value.cities === 'object' && !Array.isArray(value.cities)) return value;
  return {version:STATE_VERSION, cities:{}};
}
function isWeatherRecord(value) {
  return Boolean(value && WEATHER_TYPES.includes(value.type) && Number.isFinite(value.intensity) &&
    Number.isFinite(value.wind) && Number.isFinite(value.createdAtHour) && Number.isFinite(value.outdoorSeconds));
}
function saveRecord(key, record, autosave = true) {
  const state = readWeatherState();
  gameState[STATE_KEY] = {version:STATE_VERSION, cities:{...state.cities, [key]:{...record}}};
  if (autosave && gameState.isGameActive) requestAutosave();
}
function chooseWeather(cityId, homeCity) {
  const options = homeCity || SNOW_CITIES.has(cityId)
    ? [['clear',48], ['rain',28], ['snow',12], ['fog',12]]
    : DRY_CITIES.has(cityId)
      ? [['clear',88], ['rain',8], ['fog',4]]
      : [['clear',58], ['rain',30], ['fog',12]];
  let roll = Math.random() * options.reduce((sum, [,weight]) => sum + weight, 0);
  for (const [type, weight] of options) { roll -= weight; if (roll <= 0) return type; }
  return 'clear';
}
function createRecord(cityId, homeCity, forcedType = null) {
  return {type:forcedType || chooseWeather(cityId, homeCity), intensity:random(.4,.95), wind:random(-1,1), createdAtHour:getAgencyHour(), outdoorSeconds:0};
}
function ensureFogTexture(scene, agency = false) {
  const key = agency ? AGENCY_FOG_TEXTURE : FOG_TEXTURE;
  if (scene.textures.exists(key)) return key;
  const width = 512, height = 256;
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) return key;
  const context = texture.getContext();
  context.clearRect(0, 0, width, height);
  for (let i = 0; i < (agency ? 30 : 22); i++) {
    const x = random(0,width), y = random(0,height);
    const radius = agency ? random(65,135) : random(45,110);
    const opacity = agency ? random(.10,.22) : random(.035,.09);
    for (const offsetX of [-width,0,width]) for (const offsetY of [-height,0,height]) {
      const cx = x + offsetX, cy = y + offsetY;
      const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, agency ? `rgba(225,232,237,${opacity})` :
        `${__dialogueText('systems/CityWeatherManager.js', 't_bd1071c1d2429111498e')}${opacity}${__dialogueText('systems/CityWeatherManager.js', 't_ba5ec51d07a4ac0e9516')}`);
      gradient.addColorStop(1, agency ? 'rgba(225,232,237,0)' : __dialogueText('systems/CityWeatherManager.js', 't_9772490525cec90729d6'));
      context.fillStyle = gradient;
      context.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }
  }
  texture.refresh();
  return key;
}

export class CityWeatherManager {
  constructor(scene) {
    this.scene = scene;
    this.homeCity = scene.sys.settings.key === 'HomeCityScene';
    this.cityId = this.homeCity ? 'home_town' : normalizeCityId(scene.cityId || scene.city?.id || scene.cityData?.id || gameState.currentCityId);
    this.stateKey = this.homeCity ? 'pi:home_town' : `agency:${this.cityId}`;
    this.destroyed = false;
    this.particles = [];
    this.fogLayers = [];
    this.width = 0;
    this.height = 0;
    this.elapsed = 0;
    this.checkElapsed = 0;
    this.saveElapsed = 0;
    this.visibility = 0;
    this.pendingRecord = null;
    this.forcedType = null;
    this.gust = 0;
    this.lightningAge = -1;
    this.lightningDuration = .65;
    this.lightningPoints = [];
    this.lightningBranch = [];
    this.lightningCountdown = random(7,14);
    this.motionPreference = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(__dialogueText("systems/CityWeatherManager.js", "t_fce63bfb9ebaba3d69fc")) : null;
    this.handleUpdate = this.update.bind(this);
    this.handleResize = this.resize.bind(this);
    this.handleShutdown = this.destroy.bind(this);
    this.handleWake = this.onWake.bind(this);
    this.prepareBackgroundLayer();
    this.createVisuals();
    const existing = readWeatherState().cities[this.stateKey];
    this.record = isWeatherRecord(existing) ? {...existing} : createRecord(this.cityId, this.homeCity);
    if (!isWeatherRecord(existing)) saveRecord(this.stateKey, this.record);
    this.visualRecord = {...this.record};
    this.resize();
    this.rebuildParticles();
    scene.events.on('update', this.handleUpdate);
    scene.events.on('wake', this.handleWake);
    scene.events.on('resume', this.handleWake);
    scene.events.once('shutdown', this.handleShutdown);
    scene.events.once('destroy', this.handleShutdown);
    scene.scale.on('resize', this.handleResize);
    this.checkWeather();
    this.draw(0);
  }
  prepareBackgroundLayer() {
    if (this.scene.sys.settings.key !== 'CityScene') return;
    const {width,height} = this.scene.scale;
    for (const object of this.scene.children.list) {
      if (object.type === __dialogueText("systems/CityWeatherManager.js", "t_1aa4cb0bcca76e92e306") && !object.input?.enabled && object.depth === 0 &&
        Math.abs(object.displayWidth - width) < 2 && Math.abs(object.displayHeight - height) < 2 &&
        Math.abs(object.x - width / 2) < 2 && Math.abs(object.y - height / 2) < 2) object.setDepth(-10);
    }
  }
  createVisuals() {
    const scene = this.scene;
    this.root = scene.add.container(0,0).setScrollFactor(0).setDepth(this.homeCity ? 19000 : -9).setAlpha(0);
    this.veil = scene.add.graphics();
    this.root.add(this.veil);
    const textureKey = ensureFogTexture(scene, !this.homeCity);
    if (scene.textures.exists(textureKey)) {
      for (let i = 0; i < 3; i++) {
        const fog = scene.add.tileSprite(0,0,1,1,textureKey).setOrigin(0).setVisible(false);
        fog.tileScaleX = 1.5 + i * .6;
        fog.tileScaleY = 1.5 + i * .6;
        this.root.add(fog);
        this.fogLayers.push(fog);
      }
    }
    this.precipitation = scene.add.graphics();
    this.root.add(this.precipitation);
    this.lightning = this.homeCity ? null : scene.add.graphics();
    if (this.lightning) this.root.add(this.lightning);
  }
  resize() {
    if (this.destroyed) return;
    this.width = Math.max(1,this.scene.scale.width);
    this.height = Math.max(1,this.scene.scale.height);
    for (const fog of this.fogLayers) fog.setSize(this.width,this.height);
    if (this.visualRecord) this.rebuildParticles();
  }
  syncCamera() {
    const camera = this.scene.cameras.main, zoom = Math.max(.01,camera.zoom || 1);
    this.root.setScale(1 / zoom).setPosition(camera.width * .5 * (1 - 1 / zoom), camera.height * .5 * (1 - 1 / zoom));
  }
  rebuildParticles() {
    this.particles.length = 0;
    this.lightningAge = -1;
    this.lightningCountdown = random(7,14);
    this.lightningPoints.length = 0;
    this.lightningBranch.length = 0;
    const type = this.visualRecord.type;
    if (type !== 'rain' && type !== 'snow') return;
    const area = clamp(this.width * this.height / (1280 * 720), .45, 1.8);
    const intensity = clamp(this.visualRecord.intensity,.25,1);
    const count = Math.round(this.homeCity
      ? (type === 'rain' ? 170 : 85) * area * intensity
      : (type === 'rain' ? 470 : 230) * area * (.55 + intensity * .45));
    for (let i = 0; i < count; i++) this.particles.push(this.createParticle(type,true));
  }
  createParticle(type, anywhere = false) {
    const near = Math.random();
    if (this.homeCity) return {
      x:random(-80,this.width + 80), y:anywhere ? random(-40,this.height + 40) : random(-100,-10),
      speed:type === 'rain' ? random(540,940) * (.7 + near * .5) : random(24,65) * (.7 + near * .6),
      length:random(8,19), size:near > .78 ? 3 : near > .35 ? 2 : 1,
      alpha:type === 'rain' ? random(.15,.42) : random(.35,.85), phase:random(0,Math.PI * 2), sway:random(8,24)
    };
    return {
      x:random(-100,this.width + 100), y:anywhere ? random(-60,this.height + 60) : random(-120,-10),
      speed:type === 'rain' ? random(650,1100) * (.75 + near * .5) : random(42,100) * (.8 + near * .5),
      length:type === 'rain' ? random(16,34) : random(5,13),
      size:type === 'rain' ? (near > .7 ? 2 : 1) : (near > .83 ? 5 : near > .48 ? 3 : 2),
      alpha:type === 'rain' ? random(.32,.66) : random(.6,.98), phase:random(0,Math.PI * 2), sway:random(12,36)
    };
  }
  setRecord(record) {
    this.record = {...record};
    this.pendingRecord = {...record};
    saveRecord(this.stateKey,this.record);
  }
  checkWeather() {
    if (this.destroyed || this.forcedType) return;
    if (this.homeCity) {
      if (this.record.outdoorSeconds >= HOME_WEATHER_SECONDS) this.setRecord(createRecord(this.cityId,true));
      return;
    }
    const stored = readWeatherState().cities[this.stateKey];
    if (isWeatherRecord(stored) && (stored.createdAtHour !== this.record.createdAtHour || stored.type !== this.record.type ||
      stored.intensity !== this.record.intensity || stored.wind !== this.record.wind)) {
      this.record = {...stored};
      this.pendingRecord = {...stored};
    }
    const age = getAgencyHour() - this.record.createdAtHour;
    if (age >= AGENCY_WEATHER_HOURS || age < 0) this.setRecord(createRecord(this.cityId,false));
  }
  onWake() {
    if (this.destroyed) return;
    this.prepareBackgroundLayer();
    this.resize();
    this.checkWeather();
  }
  update(time,delta) {
    if (this.destroyed || !this.root?.active || !this.scene.sys.isActive()) return;
    const dt = clamp(Number(delta) || 0,0,100) / 1000;
    this.elapsed += dt;
    this.checkElapsed += dt;
    this.syncCamera();
    if (this.homeCity && !this.forcedType) {
      this.record.outdoorSeconds += dt;
      this.saveElapsed += dt;
      if (this.saveElapsed >= 15) { this.saveElapsed = 0; saveRecord(this.stateKey,this.record); }
    }
    if (this.checkElapsed >= 1) { this.checkElapsed = 0; this.checkWeather(); }
    if (this.pendingRecord) {
      this.visibility = Math.max(0,this.visibility - dt / .8);
      if (this.visibility <= 0) {
        this.visualRecord = {...this.pendingRecord};
        this.pendingRecord = null;
        this.rebuildParticles();
      }
    } else this.visibility = Math.min(1,this.visibility + dt / 1.2);
    this.root.setAlpha(this.visibility);
    this.draw(dt);
  }
  draw(dt) {
    if (this.homeCity) { this.drawHome(dt); return; }
    this.drawAgency(dt);
  }
  drawHome(dt) {
    const {type,intensity,wind} = this.visualRecord;
    const veil = this.veil, graphics = this.precipitation;
    veil.clear();
    graphics.clear();
    if (type === 'rain') {
      veil.fillStyle(0x172d46,.09 + intensity * .1);
      veil.fillRect(0,0,this.width,this.height);
    } else if (type === 'snow') {
      veil.fillStyle(0xbed5e2,.05 + intensity * .05);
      veil.fillRect(0,0,this.width,this.height);
    } else if (type === 'fog') {
      veil.fillStyle(0xd6dfe1,.07 + intensity * .08);
      veil.fillRect(0,0,this.width,this.height);
    }
    this.drawHomeFog(type,intensity,wind,dt);
    if (type !== 'rain' && type !== 'snow') return;
    for (const particle of this.particles) {
      particle.y += particle.speed * dt;
      if (type === 'rain') {
        const drift = 65 + wind * 95;
        particle.x += drift * dt;
        graphics.lineStyle(particle.size > 2 ? 2 : 1,0xbcd5e6,particle.alpha);
        graphics.lineBetween(Math.round(particle.x),Math.round(particle.y),
          Math.round(particle.x - drift / particle.speed * particle.length),Math.round(particle.y - particle.length));
      } else {
        particle.phase += dt * 1.5;
        particle.x += (wind * 22 + Math.sin(particle.phase) * particle.sway) * dt;
        graphics.fillStyle(0xf1f6fa,particle.alpha);
        graphics.fillRect(Math.round(particle.x),Math.round(particle.y),particle.size,particle.size);
      }
      if (particle.x < -100) particle.x = this.width + 80;
      else if (particle.x > this.width + 100) particle.x = -80;
      if (particle.y > this.height + 40) { particle.y = random(-80,-10); particle.x = random(-80,this.width + 80); }
    }
  }
  drawHomeFog(type,intensity,wind,dt) {
    const visible = type === 'fog';
    this.fogLayers.forEach((fog,index) => {
      fog.setVisible(visible);
      if (!visible) return;
      const direction = index === 1 ? -1 : 1;
      fog.tilePositionX += (direction * (5 + index * 3) + wind * 4) * dt;
      fog.tilePositionY += Math.sin(this.elapsed * .12 + index) * 1.5 * dt;
      fog.setAlpha((.42 + intensity * .3) / (1 + index * .35));
    });
  }
  drawAgency(dt) {
    const type = this.visualRecord.type;
    const intensity = clamp(this.visualRecord.intensity,.25,1);
    const wind = clamp(this.visualRecord.wind,-1,1);
    const reduced = Boolean(this.motionPreference?.matches);
    const pulse = Math.pow(Math.max(0,Math.sin(this.elapsed * .72 + 1.1)),3);
    this.gust = type === 'snow' ? pulse * (reduced ? .18 : 1) : 0;
    const veil = this.veil, graphics = this.precipitation;
    veil.clear();
    graphics.clear();
    if (type === 'rain') {
      veil.fillStyle(0x343c48,.23 + intensity * .13);
      veil.fillRect(0,0,this.width,this.height);
    } else if (type === 'snow') {
      veil.fillStyle(0xf2f6fa,.12 + intensity * .09 + this.gust * .045);
      veil.fillRect(0,0,this.width,this.height);
    } else if (type === 'fog') {
      veil.fillStyle(0xdce3e6,.20 + intensity * .13);
      veil.fillRect(0,0,this.width,this.height);
    }
    this.drawAgencyFog(type,intensity,wind,dt,reduced);
    if (type === 'rain' || type === 'snow') {
      const direction = wind < -.12 ? -1 : 1;
      for (const p of this.particles) {
        if (type === 'rain') {
          const drift = 100 + wind * 150;
          p.x += drift * dt;
          p.y += p.speed * dt;
          graphics.lineStyle(p.size,0xd9e6f1,p.alpha);
          graphics.lineBetween(Math.round(p.x),Math.round(p.y),Math.round(p.x - drift / p.speed * p.length),Math.round(p.y - p.length));
        } else {
          p.phase += dt * 1.7;
          const drift = wind * 50 + direction * this.gust * 230 + Math.sin(p.phase) * p.sway;
          p.x += drift * dt;
          p.y += p.speed * (1 + this.gust * .3) * dt;
          if (this.gust > .28 && !reduced) {
            graphics.lineStyle(Math.max(1,p.size * .55),0xffffff,p.alpha * .42);
            graphics.lineBetween(Math.round(p.x),Math.round(p.y),Math.round(p.x - direction * (6 + this.gust * p.length)),Math.round(p.y - 3));
          }
          graphics.fillStyle(0xffffff,p.alpha);
          graphics.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);
        }
        if (p.x < -120) p.x = this.width + 100;
        else if (p.x > this.width + 120) p.x = -100;
        if (p.y > this.height + 60) { p.y = random(-100,-10); p.x = random(-100,this.width + 100); }
      }
    }
    this.drawLightning(type,intensity,dt,reduced);
  }
  drawAgencyFog(type,intensity,wind,dt,reduced) {
    const visible = type === 'fog' || type === 'snow';
    this.fogLayers.forEach((fog,index) => {
      fog.setVisible(visible);
      if (!visible) return;
      const direction = index === 1 ? -1 : 1;
      const snow = type === 'snow';
      const speed = snow ? 18 + this.gust * 110 : 8 + index * 5;
      const movement = reduced ? .25 : 1;
      fog.tilePositionX += (direction * speed + wind * (snow ? 18 : 10)) * dt * movement;
      fog.tilePositionY += Math.sin(this.elapsed * .17 + index) * 3 * dt * movement;
      const breathe = reduced ? 1 : .94 + Math.sin(this.elapsed * .35 + index) * .06;
      const alpha = snow ? .08 + intensity * .05 + this.gust * .10 : .34 + intensity * .18;
      fog.setAlpha(alpha * breathe / (1 + index * .38));
    });
  }
  beginLightning() {
    this.lightningAge = 0;
    const x = random(this.width * .16,this.width * .84);
    const endY = random(this.height * .30,this.height * .58);
    this.lightningPoints = [{x,y:-10}];
    let px = x;
    for (let i = 1; i <= 7; i++) {
      px = clamp(px + random(-38,38),20,Math.max(20,this.width - 20));
      this.lightningPoints.push({x:px,y:endY * i / 7});
    }
    const start = this.lightningPoints[3];
    this.lightningBranch = [start,{x:start.x + 35,y:start.y + 25},{x:start.x + 19,y:start.y + 58},{x:start.x + 57,y:start.y + 84}];
  }
  drawLightning(type,intensity,dt,reduced) {
    const g = this.lightning;
    if (!g) return;
    g.clear();
    if (type !== 'rain' || reduced) { this.lightningAge = -1; return; }
    if (this.lightningAge < 0) {
      this.lightningCountdown -= dt;
      if (this.lightningCountdown <= 0) this.beginLightning();
    }
    if (this.lightningAge < 0) return;
    this.lightningAge += dt;
    const progress = this.lightningAge / this.lightningDuration;
    if (progress >= 1) {
      this.lightningAge = -1;
      this.lightningCountdown = random(11,24);
      return;
    }
    // Jeden lagodny impuls, bez stroboskopu i bez camera.flash().
    const pulse = Math.sin(Math.PI * progress);
    g.fillStyle(0xe7edff,pulse * (.10 + intensity * .06));
    g.fillRect(0,0,this.width,this.height);
    const stroke = (points,width,color,alpha) => {
      g.lineStyle(width,color,alpha);
      for (let i = 1; i < points.length; i++) g.lineBetween(points[i - 1].x,points[i - 1].y,points[i].x,points[i].y);
    };
    stroke(this.lightningPoints,6,0xb5caff,pulse * .18);
    stroke(this.lightningPoints,2,0xf7faff,pulse * .85);
    stroke(this.lightningBranch,1,0xe2ebff,pulse * .55);
  }
  force(type) {
    if (!WEATHER_TYPES.includes(type)) throw new Error(`Unknown weather: ${type}. Use clear, rain, snow or fog.`);
    this.forcedType = type;
    this.pendingRecord = createRecord(this.cityId,this.homeCity,type);
    return this.getStatus();
  }
  automatic() {
    this.forcedType = null;
    this.pendingRecord = {...this.record};
    this.checkWeather();
    return this.getStatus();
  }
  reroll() {
    this.forcedType = null;
    this.setRecord(createRecord(this.cityId,this.homeCity));
    return this.getStatus();
  }
  getStatus() {
    return {
      scene:this.scene.sys.settings.key, cityId:this.cityId, weather:this.forcedType || this.record.type,
      intensity:this.pendingRecord?.intensity ?? this.visualRecord.intensity, testMode:Boolean(this.forcedType),
      nextChange:this.homeCity
        ? {outdoorSecondsLeft:Math.max(0,Math.round(HOME_WEATHER_SECONDS - this.record.outdoorSeconds))}
        : {gameHoursLeft:Math.max(0,Number((AGENCY_WEATHER_HOURS - (getAgencyHour() - this.record.createdAtHour)).toFixed(2)))}
    };
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.homeCity) saveRecord(this.stateKey,this.record,false);
    const scene = this.scene;
    scene.events.off('update',this.handleUpdate);
    scene.events.off('wake',this.handleWake);
    scene.events.off('resume',this.handleWake);
    scene.events.off('shutdown',this.handleShutdown);
    scene.events.off('destroy',this.handleShutdown);
    scene.scale.off('resize',this.handleResize);
    this.root?.destroy(true);
    this.root = null;
    this.veil = null;
    this.precipitation = null;
    this.lightning = null;
    this.particles.length = 0;
    this.fogLayers.length = 0;
    this.lightningPoints.length = 0;
    this.lightningBranch.length = 0;
    ACTIVE_MANAGERS.get(scene.game)?.delete(this);
    if (scene.cityWeatherManager === this) scene.cityWeatherManager = null;
  }
}
function installDebugApi(game) {
  if (typeof window === 'undefined') return;
  function currentManagers() {
    return [...(ACTIVE_MANAGERS.get(game) || [])].filter(manager => !manager.destroyed && manager.scene.sys.isActive() && manager.scene.sys.isVisible());
  }
  window.markWeather = Object.freeze({
    set(type) { return currentManagers().map(manager => manager.force(type)); },
    auto() { return currentManagers().map(manager => manager.automatic()); },
    random() { return currentManagers().map(manager => manager.reroll()); },
    status() { return currentManagers().map(manager => manager.getStatus()); }
  });
}
function startCityWeather() {
  if (this._cleanupDone || !this.sys.isActive()) return;
  this.cityWeatherManager?.destroy();
  const manager = new CityWeatherManager(this);
  this.cityWeatherManager = manager;
  if (!ACTIVE_MANAGERS.has(this.game)) ACTIVE_MANAGERS.set(this.game,new Set());
  ACTIVE_MANAGERS.get(this.game).add(manager);
  installDebugApi(this.game);
}
export function installCityWeather(scene) {
  if (!CITY_SCENES.has(scene.sys.settings.key)) return;
  scene.events.off('create',startCityWeather,scene);
  scene.events.once('create',startCityWeather,scene);
}
export function uninstallCityWeather(scene) {
  scene.events.off('create',startCityWeather,scene);
  scene.cityWeatherManager?.destroy();
}
