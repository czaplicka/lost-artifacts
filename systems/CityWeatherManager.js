import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';

const CITY_SCENES = new Set([
  'CityScene',
  'CrimeCityScene',
  'HomeCityScene'
]);

const WEATHER_TYPES = ['clear', 'rain', 'snow', 'fog'];

const STATE_KEY = 'cityWeather';
const STATE_VERSION = 1;

const AGENCY_WEATHER_HOURS = 6;
const HOME_WEATHER_SECONDS = 8 * 60;

const FOG_TEXTURE = '__city_weather_fog_v1';

const SNOW_CITIES = new Set([
  'warsaw',
  'paris',
  'london',
  'berlin',
  'prague',
  'vienna',
  'budapest',
  'oslo',
  'stockholm',
  'helsinki',
  'copenhagen',
  'reykjavik',
  'moscow',
  'kyiv',
  'toronto',
  'montreal',
  'ottawa',
  'new_york',
  'new_york_city',
  'chicago',
  'boston',
  'beijing',
  'seoul',
  'tokyo'
]);

const DRY_CITIES = new Set([
  'cairo',
  'giza',
  'luxor',
  'dubai',
  'abu_dhabi',
  'riyadh',
  'marrakesh',
  'marrakech'
]);

const ACTIVE_MANAGERS = new WeakMap();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function normalizeCityId(value) {
  return String(value || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function getAgencyHour() {
  const day = Number(
    gameState.currentDay ?? gameState.day ?? 1
  );

  const hour = Number(
    gameState.currentHour ?? gameState.hour ?? 8
  );

  const minute = Number(
    gameState.currentMinute ?? gameState.minute ?? 0
  );

  return (
    Math.max(0, Number.isFinite(day) ? day - 1 : 0) * 24 +
    (Number.isFinite(hour) ? hour : 8) +
    (Number.isFinite(minute) ? minute : 0) / 60
  );
}

function readWeatherState() {
  const value = gameState[STATE_KEY];

  if (
    value &&
    value.version === STATE_VERSION &&
    value.cities &&
    typeof value.cities === 'object' &&
    !Array.isArray(value.cities)
  ) {
    return value;
  }

  return {
    version: STATE_VERSION,
    cities: {}
  };
}

function isWeatherRecord(value) {
  return Boolean(
    value &&
    WEATHER_TYPES.includes(value.type) &&
    Number.isFinite(value.intensity) &&
    Number.isFinite(value.wind) &&
    Number.isFinite(value.createdAtHour) &&
    Number.isFinite(value.outdoorSeconds)
  );
}

function saveRecord(key, record, autosave = true) {
  const state = readWeatherState();

  gameState[STATE_KEY] = {
    version: STATE_VERSION,
    cities: {
      ...state.cities,
      [key]: { ...record }
    }
  };

  if (autosave && gameState.isGameActive) {
    requestAutosave();
  }
}

function chooseWeather(cityId, homeCity) {
  let options;

  if (homeCity || SNOW_CITIES.has(cityId)) {
    options = [
      ['clear', 48],
      ['rain', 28],
      ['snow', 12],
      ['fog', 12]
    ];
  } else if (DRY_CITIES.has(cityId)) {
    options = [
      ['clear', 88],
      ['rain', 8],
      ['fog', 4]
    ];
  } else {
    options = [
      ['clear', 58],
      ['rain', 30],
      ['fog', 12]
    ];
  }

  const total = options.reduce(
    (sum, [, weight]) => sum + weight,
    0
  );

  let roll = Math.random() * total;

  for (const [type, weight] of options) {
    roll -= weight;

    if (roll <= 0) {
      return type;
    }
  }

  return 'clear';
}

function createRecord(cityId, homeCity, forcedType = null) {
  return {
    type: forcedType || chooseWeather(cityId, homeCity),
    intensity: random(0.4, 0.95),
    wind: random(-1, 1),
    createdAtHour: getAgencyHour(),
    outdoorSeconds: 0
  };
}

function ensureFogTexture(scene) {
  if (scene.textures.exists(FOG_TEXTURE)) {
    return;
  }

  const width = 512;
  const height = 256;

  const texture = scene.textures.createCanvas(
    FOG_TEXTURE,
    width,
    height
  );

  if (!texture) {
    return;
  }

  const context = texture.getContext();

  context.clearRect(0, 0, width, height);

  // Powtórzenia po bokach usuwają wyraźny szew tekstury.
  for (let i = 0; i < 22; i++) {
    const x = random(0, width);
    const y = random(0, height);
    const radius = random(45, 110);
    const opacity = random(0.035, 0.09);

    for (const offsetX of [-width, 0, width]) {
      for (const offsetY of [-height, 0, height]) {
        const cx = x + offsetX;
        const cy = y + offsetY;

        const gradient = context.createRadialGradient(
          cx, cy, 0,
          cx, cy, radius
        );

        gradient.addColorStop(
          0,
          `${__dialogueText("systems/CityWeatherManager.js", "t_bd1071c1d2429111498e")}${opacity}${__dialogueText("systems/CityWeatherManager.js", "t_ba5ec51d07a4ac0e9516")}`
        );

        gradient.addColorStop(
          1,
          __dialogueText("systems/CityWeatherManager.js", "t_9772490525cec90729d6")
        );

        context.fillStyle = gradient;

        context.fillRect(
          cx - radius,
          cy - radius,
          radius * 2,
          radius * 2
        );
      }
    }
  }

  texture.refresh();
}

export class CityWeatherManager {
  constructor(scene) {
    this.scene = scene;
    this.homeCity = scene.sys.settings.key === 'HomeCityScene';

    this.cityId = this.homeCity
      ? 'home_town'
      : normalizeCityId(
          scene.cityId ||
          scene.city?.id ||
          scene.cityData?.id ||
          gameState.currentCityId
        );

    this.stateKey = this.homeCity
      ? 'pi:home_town'
      : `agency:${this.cityId}`;

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

    this.handleUpdate = this.update.bind(this);
    this.handleResize = this.resize.bind(this);
    this.handleShutdown = this.destroy.bind(this);
    this.handleWake = this.onWake.bind(this);

    this.prepareBackgroundLayer();
    this.createVisuals();

    const existing = readWeatherState().cities[this.stateKey];

    this.record = isWeatherRecord(existing)
      ? { ...existing }
      : createRecord(this.cityId, this.homeCity);

    if (!isWeatherRecord(existing)) {
      saveRecord(this.stateKey, this.record);
    }

    this.visualRecord = { ...this.record };

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
    if (this.scene.sys.settings.key !== 'CityScene') {
      return;
    }

    const { width, height } = this.scene.scale;

    // CityPresentation tworzy pełnoekranowe tło bez referencji.
    // Przesuwamy tylko taki obraz, nie ikony ani portrety.
    for (const object of this.scene.children.list) {
      if (
        object.type === __dialogueText("systems/CityWeatherManager.js", "t_1aa4cb0bcca76e92e306") &&
        !object.input?.enabled &&
        object.depth === 0 &&
        Math.abs(object.displayWidth - width) < 2 &&
        Math.abs(object.displayHeight - height) < 2 &&
        Math.abs(object.x - width / 2) < 2 &&
        Math.abs(object.y - height / 2) < 2
      ) {
        object.setDepth(-10);
      }
    }
  }

  createVisuals() {
    const scene = this.scene;

    this.root = scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(this.homeCity ? 19000 : -9)
      .setAlpha(0);

    this.veil = scene.add.graphics();

    this.root.add(this.veil);

    ensureFogTexture(scene);

    if (scene.textures.exists(FOG_TEXTURE)) {
      for (let i = 0; i < 3; i++) {
        const fog = scene.add.tileSprite(
          0,
          0,
          1,
          1,
          FOG_TEXTURE
        )
          .setOrigin(0)
          .setVisible(false);

        fog.tileScaleX = 1.5 + i * 0.6;
        fog.tileScaleY = 1.5 + i * 0.6;

        this.root.add(fog);
        this.fogLayers.push(fog);
      }
    }

    this.precipitation = scene.add.graphics();

    this.root.add(this.precipitation);
  }

  resize() {
    if (this.destroyed) {
      return;
    }

    this.width = Math.max(1, this.scene.scale.width);
    this.height = Math.max(1, this.scene.scale.height);

    for (const fog of this.fogLayers) {
      fog.setSize(this.width, this.height);
    }

    if (this.visualRecord) {
      this.rebuildParticles();
    }
  }

  syncCamera() {
    const camera = this.scene.cameras.main;
    const zoom = Math.max(0.01, camera.zoom || 1);

    // Kompensacja zoomu: rozmiar opadów pozostaje ekranowy.
    this.root
      .setScale(1 / zoom)
      .setPosition(
        camera.width * 0.5 * (1 - 1 / zoom),
        camera.height * 0.5 * (1 - 1 / zoom)
      );
  }

  rebuildParticles() {
    this.particles.length = 0;

    const type = this.visualRecord.type;

    if (type !== 'rain' && type !== 'snow') {
      return;
    }

    const area = clamp(
      this.width * this.height / (1280 * 720),
      0.45,
      1.8
    );

    const intensity = clamp(
      this.visualRecord.intensity,
      0.25,
      1
    );

    const count = Math.round(
      (type === 'rain' ? 170 : 85) *
      area *
      intensity
    );

    for (let i = 0; i < count; i++) {
      this.particles.push(
        this.createParticle(type, true)
      );
    }
  }

  createParticle(type, anywhere = false) {
    const near = Math.random();

    return {
      x: random(-80, this.width + 80),
      y: anywhere
        ? random(-40, this.height + 40)
        : random(-100, -10),
      speed: type === 'rain'
        ? random(540, 940) * (0.7 + near * 0.5)
        : random(24, 65) * (0.7 + near * 0.6),
      length: random(8, 19),
      size: near > 0.78 ? 3 : near > 0.35 ? 2 : 1,
      alpha: type === 'rain'
        ? random(0.15, 0.42)
        : random(0.35, 0.85),
      phase: random(0, Math.PI * 2),
      sway: random(8, 24)
    };
  }

  setRecord(record) {
    this.record = { ...record };
    this.pendingRecord = { ...record };

    saveRecord(this.stateKey, this.record);
  }

  checkWeather() {
    if (this.destroyed || this.forcedType) {
      return;
    }

    if (this.homeCity) {
      if (
        this.record.outdoorSeconds >= HOME_WEATHER_SECONDS
      ) {
        this.setRecord(
          createRecord(this.cityId, true)
        );
      }

      return;
    }

    const stored = readWeatherState().cities[this.stateKey];

    if (
      isWeatherRecord(stored) &&
      (
        stored.createdAtHour !== this.record.createdAtHour ||
        stored.type !== this.record.type ||
        stored.intensity !== this.record.intensity ||
        stored.wind !== this.record.wind
      )
    ) {
      this.record = { ...stored };
      this.pendingRecord = { ...stored };
    }

    const age = getAgencyHour() - this.record.createdAtHour;

    if (age >= AGENCY_WEATHER_HOURS || age < 0) {
      this.setRecord(
        createRecord(this.cityId, false)
      );
    }
  }

  onWake() {
    if (this.destroyed) {
      return;
    }

    this.prepareBackgroundLayer();
    this.resize();
    this.checkWeather();
  }

  update(time, delta) {
    if (
      this.destroyed ||
      !this.root?.active ||
      !this.scene.sys.isActive()
    ) {
      return;
    }

    const dt = clamp(Number(delta) || 0, 0, 100) / 1000;

    this.elapsed += dt;
    this.checkElapsed += dt;

    this.syncCamera();

    if (this.homeCity && !this.forcedType) {
      this.record.outdoorSeconds += dt;
      this.saveElapsed += dt;

      if (this.saveElapsed >= 15) {
        this.saveElapsed = 0;
        saveRecord(this.stateKey, this.record);
      }
    }

    if (this.checkElapsed >= 1) {
      this.checkElapsed = 0;
      this.checkWeather();
    }

    if (this.pendingRecord) {
      this.visibility = Math.max(
        0,
        this.visibility - dt / 0.8
      );

      if (this.visibility <= 0) {
        this.visualRecord = { ...this.pendingRecord };
        this.pendingRecord = null;
        this.rebuildParticles();
      }
    } else {
      this.visibility = Math.min(
        1,
        this.visibility + dt / 1.2
      );
    }

    this.root.setAlpha(this.visibility);

    this.draw(dt);
  }

  draw(dt) {
    const { type, intensity, wind } = this.visualRecord;

    const veil = this.veil;
    const graphics = this.precipitation;

    veil.clear();
    graphics.clear();

    if (type === 'rain') {
      veil.fillStyle(0x172d46, 0.09 + intensity * 0.1);
      veil.fillRect(0, 0, this.width, this.height);
    } else if (type === 'snow') {
      veil.fillStyle(0xbed5e2, 0.05 + intensity * 0.05);
      veil.fillRect(0, 0, this.width, this.height);
    } else if (type === 'fog') {
      veil.fillStyle(0xd6dfe1, 0.07 + intensity * 0.08);
      veil.fillRect(0, 0, this.width, this.height);
    }

    this.drawFog(type, intensity, wind, dt);

    if (type !== 'rain' && type !== 'snow') {
      return;
    }

    for (const particle of this.particles) {
      particle.y += particle.speed * dt;

      if (type === 'rain') {
        const drift = 65 + wind * 95;

        particle.x += drift * dt;

        graphics.lineStyle(
          particle.size > 2 ? 2 : 1,
          0xbcd5e6,
          particle.alpha
        );

        graphics.lineBetween(
          Math.round(particle.x),
          Math.round(particle.y),
          Math.round(
            particle.x -
            drift / particle.speed * particle.length
          ),
          Math.round(particle.y - particle.length)
        );
      } else {
        particle.phase += dt * 1.5;

        particle.x += (
          wind * 22 +
          Math.sin(particle.phase) * particle.sway
        ) * dt;

        graphics.fillStyle(
          0xf1f6fa,
          particle.alpha
        );

        graphics.fillRect(
          Math.round(particle.x),
          Math.round(particle.y),
          particle.size,
          particle.size
        );
      }

      if (particle.x < -100) {
        particle.x = this.width + 80;
      } else if (particle.x > this.width + 100) {
        particle.x = -80;
      }

      if (particle.y > this.height + 40) {
        particle.y = random(-80, -10);
        particle.x = random(-80, this.width + 80);
      }
    }
  }

  drawFog(type, intensity, wind, dt) {
    const visible = type === 'fog';

    this.fogLayers.forEach((fog, index) => {
      fog.setVisible(visible);

      if (!visible) {
        return;
      }

      const direction = index === 1 ? -1 : 1;

      fog.tilePositionX += (
        direction * (5 + index * 3) +
        wind * 4
      ) * dt;

      fog.tilePositionY += (
        Math.sin(this.elapsed * 0.12 + index) *
        1.5
      ) * dt;

      fog.setAlpha(
        (0.42 + intensity * 0.3) /
        (1 + index * 0.35)
      );
    });
  }

  force(type) {
    if (!WEATHER_TYPES.includes(type)) {
      throw new Error(
        `Unknown weather: ${type}. Use clear, rain, snow or fog.`
      );
    }

    // Tryb testowy nie nadpisuje zapisanej pogody.
    this.forcedType = type;

    this.pendingRecord = createRecord(
      this.cityId,
      this.homeCity,
      type
    );

    return this.getStatus();
  }

  automatic() {
    this.forcedType = null;
    this.pendingRecord = { ...this.record };
    this.checkWeather();

    return this.getStatus();
  }

  reroll() {
    this.forcedType = null;

    this.setRecord(
      createRecord(this.cityId, this.homeCity)
    );

    return this.getStatus();
  }

  getStatus() {
    return {
      scene: this.scene.sys.settings.key,
      cityId: this.cityId,
      weather: this.forcedType || this.record.type,
      intensity: this.pendingRecord?.intensity ??
        this.visualRecord.intensity,
      testMode: Boolean(this.forcedType),
      nextChange: this.homeCity
        ? {
            outdoorSecondsLeft: Math.max(
              0,
              Math.round(
                HOME_WEATHER_SECONDS -
                this.record.outdoorSeconds
              )
            )
          }
        : {
            gameHoursLeft: Math.max(
              0,
              Number((
                AGENCY_WEATHER_HOURS -
                (
                  getAgencyHour() -
                  this.record.createdAtHour
                )
              ).toFixed(2))
            )
          }
    };
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;

    if (this.homeCity) {
      saveRecord(this.stateKey, this.record, false);
    }

    const scene = this.scene;

    scene.events.off('update', this.handleUpdate);
    scene.events.off('wake', this.handleWake);
    scene.events.off('resume', this.handleWake);

    scene.events.off('shutdown', this.handleShutdown);
    scene.events.off('destroy', this.handleShutdown);

    scene.scale.off('resize', this.handleResize);

    this.root?.destroy(true);

    this.root = null;
    this.veil = null;
    this.precipitation = null;

    this.particles.length = 0;
    this.fogLayers.length = 0;

    ACTIVE_MANAGERS.get(scene.game)?.delete(this);

    if (scene.cityWeatherManager === this) {
      scene.cityWeatherManager = null;
    }
  }
}

function installDebugApi(game) {
  if (typeof window === 'undefined') {
    return;
  }

  function currentManagers() {
    return [...(ACTIVE_MANAGERS.get(game) || [])]
      .filter(manager => (
        !manager.destroyed &&
        manager.scene.sys.isActive() &&
        manager.scene.sys.isVisible()
      ));
  }

  window.markWeather = Object.freeze({
    set(type) {
      return currentManagers().map(
        manager => manager.force(type)
      );
    },

    auto() {
      return currentManagers().map(
        manager => manager.automatic()
      );
    },

    random() {
      return currentManagers().map(
        manager => manager.reroll()
      );
    },

    status() {
      return currentManagers().map(
        manager => manager.getStatus()
      );
    }
  });
}

function startCityWeather() {
  if (this._cleanupDone || !this.sys.isActive()) {
    return;
  }

  this.cityWeatherManager?.destroy();

  const manager = new CityWeatherManager(this);

  this.cityWeatherManager = manager;

  if (!ACTIVE_MANAGERS.has(this.game)) {
    ACTIVE_MANAGERS.set(this.game, new Set());
  }

  ACTIVE_MANAGERS.get(this.game).add(manager);

  installDebugApi(this.game);
}

export function installCityWeather(scene) {
  if (!CITY_SCENES.has(scene.sys.settings.key)) {
    return;
  }

  scene.events.off('create', startCityWeather, scene);

  // Uruchamiamy po create() miasta: tło i interfejs już istnieją.
  scene.events.once('create', startCityWeather, scene);
}

export function uninstallCityWeather(scene) {
  scene.events.off('create', startCityWeather, scene);
  scene.cityWeatherManager?.destroy();
}