import { gameState } from '../GameData.js';

const WORKER = '__AssetWorkerScene';
const INITIAL = new Set(['BootScene', 'PreloaderScene', 'EnterScene', 'MenuScene', 'SettingsScene']);
const UI = new Set(['PlayerHudScene', 'UIScene', 'NewsHud', 'LoadingOverlayScene', 'RandomEventScene']);
const canonical = value => ({ newdelhi: 'new_delhi', newyorkcity: 'new_york_city' }[value] || value);
const idOf = asset => `${asset.type}:${asset.key}`;

class AssetWorkerScene extends Phaser.Scene {
  constructor(ready) { super({ key: WORKER }); this.readyCallback = ready; }
  create() { this.readyCallback(this); }
}

export class AssetManager {
  constructor(game) {
    this.game = game;
    this.tail = Promise.resolve();
    this.workerPromise = null;
    this.owners = new Map();
    this.managed = new Map();
    this.prepared = new Map();
    this.destroyed = false;
    this.progress = { value: 0, label: 'Opening the case file...' };
    this.currentCity = null;
    this.cssLoaded = new Set();
    this.game.events.once('destroy', () => {
      this.destroyed = true;
      this.owners.clear();
      this.prepared.clear();
    });
  }

  get manifest() {
    const manifest = this.game.cache.json.get('assetManifest');
    if (!manifest?.bundles || manifest.bundleVersion !== 1) {
      throw new Error('[AssetManager] Run the block-3 manifest builder first.');
    }
    return manifest;
  }

  get catalog() {
    if (!this._catalog) {
      this._catalog = new Map(this.manifest.assetCatalog.map(asset => [idOf(asset), asset]));
    }
    return this._catalog;
  }

  has(asset) {
    if (asset.type === 'image') return this.game.textures.exists(asset.key);
    if (asset.type === 'css') {
      if (this.cssLoaded.has(asset.key)) return true;
      const url = new URL(asset.url, document.baseURI).href;
      return [...document.querySelectorAll('link[rel~="stylesheet"][href]')].some(link => link.href === url);
    }
    return Boolean(this.game.cache[asset.type]?.exists(asset.key));
  }

  queue(loader, asset) {
    if (this.has(asset)) return false;
    const { key, url, type } = asset;
    if (type === 'tilemap') loader.tilemapTiledJSON(key, url);
    else if (type === 'video') loader.video(key, url, Boolean(asset.noAudio));
    else if (['image', 'json', 'audio', 'html', 'css'].includes(type)) loader[type](key, url);
    else throw new Error(`[AssetManager] Unsupported type: ${type}`);
    return true;
  }

  async worker() {
    if (!this.workerPromise) {
      this.workerPromise = new Promise(resolve => {
        this.game.scene.add(WORKER, new AssetWorkerScene(resolve), true);
      });
    }
    return this.workerPromise;
  }

  emitProgress(value, label) {
    this.progress = { value, label };
    this.game.events.emit('asset-progress', this.progress);
  }

  assetsFor(bundleIds) {
    const result = new Map();
    for (const bundleId of bundleIds) {
      const refs = this.manifest.bundles[bundleId];
      if (!Array.isArray(refs)) throw new Error(`[AssetManager] Missing bundle: ${bundleId}`);
      for (const ref of refs) {
        const asset = this.catalog.get(ref);
        if (!asset) throw new Error(`[AssetManager] Unknown asset: ${ref}`);
        result.set(ref, asset);
      }
    }
    return [...result.values()];
  }

  pin(owner, assets) {
    this.owners.set(owner, new Set(assets.map(idOf)));
  }

  unpin(owner) {
    this.owners.delete(owner);
    if (this.destroyed) return;
    this.game.events.once('poststep', () => this.collect());
  }

  collect() {
    if (this.destroyed) return;
    const retained = new Set([...this.owners.values()].flatMap(set => [...set]));
    for (const [id, asset] of this.managed) {
      if (retained.has(id) || asset.type === 'css' || asset.type === 'audio') continue;
      if (asset.type === 'image') this.game.textures.remove(asset.key);
      else this.game.cache[asset.type]?.remove(asset.key);
      this.managed.delete(id);
    }
  }

  loadAssets(assets, label) {
    const run = async () => {
      if (this.destroyed) throw new Error('[AssetManager] Game destroyed.');
      const missing = assets.filter(asset => !this.has(asset));
      if (!missing.length) return;
      const scene = await this.worker();
      if (this.destroyed) throw new Error('[AssetManager] Game destroyed.');
      this.emitProgress(0, label);
      await new Promise((resolve, reject) => {
        const failed = [];
        const onProgress = value => this.emitProgress(value, label);
        const onError = file => failed.push(`${file.type}:${file.key}`);
        const cleanup = () => {
          scene.load.off('progress', onProgress);
          scene.load.off('loaderror', onError);
          scene.load.off('complete', onComplete);
          this.game.events.off('destroy', onDestroy);
        };
        const onDestroy = () => { cleanup(); reject(new Error('[AssetManager] Loading cancelled.')); };
        const onComplete = () => {
          cleanup();
          for (const asset of missing) {
            if (asset.type === 'css' && !failed.includes(idOf(asset))) this.cssLoaded.add(asset.key);
            if (this.has(asset)) this.managed.set(idOf(asset), asset);
          }
          const absent = missing.filter(asset => !this.has(asset));
          if (failed.length || absent.length) {
            reject(new Error(`[AssetManager] Load failed: ${[...new Set([...failed, ...absent.map(idOf)])].join(', ')}`));
          } else {
            this.emitProgress(1, label);
            resolve();
          }
        };
        scene.load.on('progress', onProgress);
        scene.load.on('loaderror', onError);
        scene.load.once('complete', onComplete);
        this.game.events.once('destroy', onDestroy);
        try {
          for (const asset of missing) this.queue(scene.load, asset);
          scene.load.start();
        } catch (error) {
          cleanup();
          scene.load.reset();
          reject(error);
        }
      });
    };
    const task = this.tail.then(run);
    this.tail = task.catch(() => {});
    return task;
  }

  async ensureBundles(bundleIds, owner, label) {
    const assets = this.assetsFor(bundleIds);
    this.pin(owner, assets);
    try { await this.loadAssets(assets, label); }
    catch (error) { this.unpin(owner); throw error; }
  }

  resolveCity(key, data) {
    if (INITIAL.has(key) || UI.has(key)) return null;
    if (['OfficeScene', 'ArchiveScene', 'AgencyStorageScene'].includes(key)) return 'hq';
    if (key === 'TravelTransitionScene') return null;
    return canonical(data.cityId || gameState.currentCityId || gameState.crimeCityId || this.currentCity);
  }

  async prepareScene(key, data = {}) {
    if (key === WORKER || key === 'BootScene' || key === 'PreloaderScene') return;
    if (this.prepared.has(key)) return this.prepared.get(key).promise;
    const token = Symbol(key);
    const record = { token, promise: null, cleanup: null };
    this.prepared.set(key, record);
    record.promise = (async () => {
      const bundles = this.manifest.bundles;
      if (!INITIAL.has(key)) {
        await this.ensureBundles(['shared'], 'shared', 'Organising the agency files...');
      }
      const requested = [];
      if (key === 'HiddenObjectsScene') {
        const crimeId = data.sceneId || data.itemSceneKey || data.mapKey || gameState.currentMission?.scene;
        if (!crimeId || !bundles[`crime:${crimeId}`]) {
          throw new Error('[AssetManager] Unknown hidden-objects location.');
        }
        requested.push(`crime:${crimeId}`);
      }
      if (bundles[`scene:${key}`]) requested.push(`scene:${key}`);
      const cityId = this.resolveCity(key, data);
      if (cityId && bundles[`city:${cityId}`]) requested.push(`city:${cityId}`);
      await this.ensureBundles(requested, token, 'Following the paper trail...');
      const target = this.game.scene.getScene(key);
      if (!target) throw new Error(`[AssetManager] Scene not registered: ${key}`);
      const release = () => {
        target.events.off('shutdown', release);
        target.events.off('destroy', release);
        target.events.off('create', created);
        if (this.prepared.get(key) === record) this.prepared.delete(key);
        this.unpin(token);
      };
      const created = () => {
        if (cityId) this.currentCity = cityId;
      };
      record.cleanup = release;
      target.events.once('shutdown', release);
      target.events.once('destroy', release);
      target.events.once('create', created);
    })().catch(error => {
      this.prepared.delete(key);
      this.unpin(token);
      throw error;
    });
    return record.promise;
  }

  cancelPrepared(key) {
    const target = this.game.scene.keys[key];
    if (target && (target.sys.isActive() || target.sys.isSleeping() || target.sys.isPaused())) return;
    this.prepared.get(key)?.cleanup?.();
  }

  async prepareSavedCity(cityId) {
    const normalized = canonical(cityId);
    const bundle = `city:${normalized}`;
    if (!this.manifest.bundles[bundle]) throw new Error(`[AssetManager] Unknown saved city: ${cityId}`);
    const owner = Symbol('save-city');
    await this.ensureBundles([bundle], owner, 'Reopening the saved case file...');
    return () => this.unpin(owner);
  }

  debugStatus() {
    return {
      currentCity: this.currentCity,
      preparedScenes: [...this.prepared.keys()],
      managedAssets: [...this.managed.keys()],
      owners: [...this.owners].map(([owner, ids]) => ({ owner: String(owner), count: ids.size })),
      progress: this.progress
    };
  }
}
