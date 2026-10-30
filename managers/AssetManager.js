import { gameState } from '../GameData.js';

const WORKER = '__AssetWorkerScene';

const INITIAL = new Set([
  'BootScene',
  'PreloaderScene',
  'EnterScene',
  'MenuScene',
  'SettingsScene'
]);

const UI = new Set([
  'PlayerHudScene',
  'UIScene',
  'NewsHud',
  'LoadingOverlayScene',
  'RandomEventScene'
]);

const SCENE_REQUIRED_ASSETS = {
  'scene:HollyIntroScene': [
    'video:in',
    'video:out'
  ]
};

const canonical = value => ({
  newdelhi: 'new_delhi',
  newyorkcity: 'new_york_city'
}[value] || value);

const idOf = asset => `${asset.type}:${asset.key}`;

const isOptionalNewspaper = asset => (
  asset?.type === 'json' &&
  typeof asset.key === 'string' &&
  asset.key.startsWith('newspaper_')
);

const isOptionalNewspaperRef = ref => (
  typeof ref === 'string' &&
  ref.startsWith('json:newspaper_')
);

class AssetWorkerScene extends Phaser.Scene {
  constructor(ready) {
    super({ key: WORKER });
    this.readyCallback = ready;
  }

  create() {
    this.readyCallback(this);
  }
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

    this.progress = {
      value: 0,
      label: 'Opening the case file...'
    };

    this.currentCity = null;
    this.cssLoaded = new Set();
    this.collectPending = false;
    this.textureEvents = [];
    this.reportedInvalidObjects = new WeakSet();

    this.unavailableNewspapers = new Set();

    this.textureDiagnostics =
      typeof window !== 'undefined' &&
      ['localhost', '127.0.0.1'].includes(
        window.location.hostname
      );

    this.boundCollect = () => {
      this.collectPending = false;
      this.collect();
    };

    this.boundRenderCheck = () => {
      this.reportInvalidRenderFrames();
    };

    this.game.events.on(
      'prerender',
      this.boundRenderCheck
    );

    this.game.events.once('destroy', () => {
      this.destroyed = true;

      this.game.events.off(
        'prerender',
        this.boundRenderCheck
      );

      this.game.events.off(
        'poststep',
        this.boundCollect
      );

      this.owners.clear();
      this.prepared.clear();
      this.unavailableNewspapers.clear();
    });
  }

  get manifest() {
    const manifest = this.game.cache.json.get(
      'assetManifest'
    );

    if (
      !manifest?.bundles ||
      manifest.bundleVersion !== 1
    ) {
      throw new Error(
        '[AssetManager] Run the block-3 manifest builder first.'
      );
    }

    return manifest;
  }

  get catalog() {
    if (!this._catalog) {
      this._catalog = new Map(
        this.manifest.assetCatalog.map(asset => [
          idOf(asset),
          asset
        ])
      );
    }

    return this._catalog;
  }

  has(asset) {
    if (asset.type === 'image') {
      return this.game.textures.exists(asset.key);
    }

    if (asset.type === 'css') {
      if (this.cssLoaded.has(asset.key)) return true;

      const url = new URL(
        asset.url,
        document.baseURI
      ).href;

      return [
        ...document.querySelectorAll(
          'link[rel~="stylesheet"][href]'
        )
      ].some(link => link.href === url);
    }

    return Boolean(
      this.game.cache[asset.type]?.exists(asset.key)
    );
  }

  markNewspaperUnavailable(asset) {
    const id = idOf(asset);

    if (this.unavailableNewspapers.has(id)) return;

    this.unavailableNewspapers.add(id);

    console.warn(
      '[AssetManager] Newspaper unavailable. ' +
      'Continuing without this issue:',
      {
        key: asset.key,
        url: asset.url
      }
    );
  }

  queue(loader, asset) {
    if (this.has(asset)) return false;

    if (
      isOptionalNewspaper(asset) &&
      this.unavailableNewspapers.has(idOf(asset))
    ) {
      return false;
    }

    const { key, url, type } = asset;

    if (type === 'tilemap') {
      loader.tilemapTiledJSON(key, url);
    } else if (type === 'video') {
      loader.video(
        key,
        url,
        Boolean(asset.noAudio)
      );
    } else if (
      ['image', 'json', 'audio', 'html', 'css']
        .includes(type)
    ) {
      loader[type](key, url);
    } else {
      throw new Error(
        `[AssetManager] Unsupported type: ${type}`
      );
    }

    return true;
  }

  async worker() {
    if (!this.workerPromise) {
      this.workerPromise = new Promise(resolve => {
        this.game.scene.add(
          WORKER,
          new AssetWorkerScene(resolve),
          true
        );
      });
    }

    return this.workerPromise;
  }

  emitProgress(value, label) {
    this.progress = { value, label };

    this.game.events.emit(
      'asset-progress',
      this.progress
    );
  }

  assetsFor(bundleIds) {
    const result = new Map();

    for (const bundleId of bundleIds) {
      const refs = this.manifest.bundles[bundleId];

      if (!Array.isArray(refs)) {
        throw new Error(
          `[AssetManager] Missing bundle: ${bundleId}`
        );
      }

      const requiredRefs = new Set([
        ...refs,
        ...(SCENE_REQUIRED_ASSETS[bundleId] || [])
      ]);

      for (const ref of requiredRefs) {
        const asset = this.catalog.get(ref);

        if (!asset) {
          if (isOptionalNewspaperRef(ref)) {
            if (!this.unavailableNewspapers.has(ref)) {
              this.unavailableNewspapers.add(ref);

              console.warn(
                '[AssetManager] Newspaper missing ' +
                'from catalog. Continuing:',
                ref
              );
            }

            continue;
          }

          throw new Error(
            `[AssetManager] Unknown asset: ${ref}`
          );
        }

        result.set(ref, asset);
      }
    }

    return [...result.values()];
  }

  pin(owner, assets) {
    this.owners.set(
      owner,
      new Set(assets.map(idOf))
    );
  }

  unpin(owner) {
    this.owners.delete(owner);

    if (this.destroyed || this.collectPending) return;

    this.collectPending = true;

    this.game.events.once(
      'poststep',
      this.boundCollect
    );
  }

  scenesForInspection() {
    if (Array.isArray(this.game.scene?.scenes)) {
      return this.game.scene.scenes;
    }

    const scenes = this.game.scene?.getScenes?.(false);

    return Array.isArray(scenes) ? scenes : null;
  }

  inspectSceneObjects(visitor, visibleOnly = false) {
    const scenes = this.scenesForInspection();

    if (!scenes) return false;

    const seen = new Set();

    const walk = (object, scene, path) => {
      if (!object || seen.has(object)) return;

      seen.add(object);

      if (
        visibleOnly &&
        object.visible === false
      ) {
        return;
      }

      visitor(object, scene, path);

      const children = Array.isArray(object.list)
        ? object.list
        : object.children?.list;

      if (Array.isArray(children)) {
        children.forEach((child, index) => {
          walk(
            child,
            scene,
            `${path}/${child?.name || child?.type || index}`
          );
        });
      }
    };

    for (const scene of scenes) {
      if (
        visibleOnly &&
        scene.sys?.settings?.visible === false
      ) {
        continue;
      }

      const list = scene.children?.list;

      if (!Array.isArray(list)) continue;

      list.forEach((object, index) => {
        walk(
          object,
          scene,
          object?.name ||
          object?.type ||
          String(index)
        );
      });
    }

    return true;
  }

  liveTextureKeys() {
    const keys = new Set();

    const inspected = this.inspectSceneObjects(
      object => {
        if (typeof object.texture?.key === 'string') {
          keys.add(object.texture.key);
        }

        if (
          typeof object.frame?.texture?.key === 'string'
        ) {
          keys.add(object.frame.texture.key);
        }
      }
    );

    return inspected ? keys : null;
  }

  rememberTextureEvent(action, key) {
    this.textureEvents.push({
      action,
      key,
      at: Date.now()
    });

    if (this.textureEvents.length > 25) {
      this.textureEvents.shift();
    }
  }

  collect() {
    if (this.destroyed) return;

    const retained = new Set(
      [...this.owners.values()]
        .flatMap(set => [...set])
    );

    const live = this.liveTextureKeys();

    for (const [id, asset] of this.managed) {
      if (
        retained.has(id) ||
        asset.type === 'css' ||
        asset.type === 'audio'
      ) {
        continue;
      }

      if (asset.type === 'image') {
        if (
          live === null ||
          live.has(asset.key)
        ) {
          continue;
        }

        this.rememberTextureEvent(
          'remove',
          asset.key
        );

        if (
          this.game.textures.exists(asset.key)
        ) {
          this.game.textures.remove(asset.key);
        }
      } else {
        this.game.cache[asset.type]?.remove(
          asset.key
        );
      }

      this.managed.delete(id);
    }
  }

  reportInvalidRenderFrames() {
    if (
      this.destroyed ||
      !this.textureDiagnostics
    ) {
      return;
    }

    this.inspectSceneObjects(
      (object, scene, path) => {
        const frame = object.frame;

        if (
          !frame ||
          frame.source !== null ||
          this.reportedInvalidObjects.has(object)
        ) {
          return;
        }

        this.reportedInvalidObjects.add(object);

        console.error(
          '[AssetManager] INVALID_RENDER_FRAME',
          {
            scene: scene.sys?.settings?.key,
            path,
            type: object.type,
            name: object.name || '',
            textureKey:
              object.texture?.key ??
              frame.texture?.key ??
              '(destroyed)',
            frameName: frame.name,
            x: object.x,
            y: object.y,
            hasScene: Boolean(object.scene),
            recentTextureRemovals: [
              ...this.textureEvents
            ]
          }
        );
      },
      true
    );
  }

  setTextureDiagnostics(enabled = true) {
    this.textureDiagnostics = Boolean(enabled);
    this.reportedInvalidObjects = new WeakSet();
  }

  loadAssets(assets, label) {
    const run = async () => {
      if (this.destroyed) {
        throw new Error(
          '[AssetManager] Game destroyed.'
        );
      }

      const missing = assets.filter(asset => {
        if (this.has(asset)) return false;

        return !(
          isOptionalNewspaper(asset) &&
          this.unavailableNewspapers.has(
            idOf(asset)
          )
        );
      });

      if (!missing.length) return;

      const scene = await this.worker();

      if (this.destroyed) {
        throw new Error(
          '[AssetManager] Game destroyed.'
        );
      }

      this.emitProgress(0, label);

      await new Promise((resolve, reject) => {
        const failed = new Set();

        const requested = new Map(
          missing.map(asset => [
            idOf(asset),
            asset
          ])
        );

        const onProgress = value => {
          this.emitProgress(value, label);
        };

        const onError = file => {
          const id = `${file.type}:${file.key}`;
          const asset = requested.get(id);

          if (isOptionalNewspaper(asset)) {
            this.markNewspaperUnavailable(asset);
            return;
          }

          failed.add(id);
        };

        const cleanup = () => {
          scene.load.off(
            'progress',
            onProgress
          );

          scene.load.off(
            'loaderror',
            onError
          );

          scene.load.off(
            'complete',
            onComplete
          );

          this.game.events.off(
            'destroy',
            onDestroy
          );
        };

        const onDestroy = () => {
          cleanup();

          reject(
            new Error(
              '[AssetManager] Loading cancelled.'
            )
          );
        };

        const onComplete = () => {
          cleanup();

          for (const asset of missing) {
            const id = idOf(asset);

            if (
              asset.type === 'css' &&
              !failed.has(id)
            ) {
              this.cssLoaded.add(asset.key);
            }

            if (this.has(asset)) {
              this.managed.set(id, asset);

              if (isOptionalNewspaper(asset)) {
                this.unavailableNewspapers.delete(id);
              }
            } else if (isOptionalNewspaper(asset)) {
              this.markNewspaperUnavailable(asset);
            }
          }

          const absentRequired = missing.filter(
            asset => (
              !isOptionalNewspaper(asset) &&
              !this.has(asset)
            )
          );

          const errors = [
            ...new Set([
              ...failed,
              ...absentRequired.map(idOf)
            ])
          ];

          if (errors.length) {
            reject(
              new Error(
                '[AssetManager] Load failed: ' +
                errors.join(', ')
              )
            );

            return;
          }

          this.emitProgress(1, label);
          resolve();
        };

        scene.load.on(
          'progress',
          onProgress
        );

        scene.load.on(
          'loaderror',
          onError
        );

        scene.load.once(
          'complete',
          onComplete
        );

        this.game.events.once(
          'destroy',
          onDestroy
        );

        try {
          let queued = 0;

          for (const asset of missing) {
            if (this.queue(scene.load, asset)) {
              queued += 1;
            }
          }

          if (!queued) {
            onComplete();
            return;
          }

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

    try {
      await this.loadAssets(assets, label);
    } catch (error) {
      this.unpin(owner);
      throw error;
    }
  }

  resolveCity(key, data) {
    if (
      INITIAL.has(key) ||
      UI.has(key)
    ) {
      return null;
    }

    if (
      [
        'OfficeScene',
        'ArchiveScene',
        'AgencyStorageScene'
      ].includes(key)
    ) {
      return 'hq';
    }

    if (key === 'TravelTransitionScene') {
      return null;
    }

    return canonical(
      data.cityId ||
      gameState.currentCityId ||
      gameState.crimeCityId ||
      this.currentCity
    );
  }

  async prepareScene(key, data = {}) {
    if (
      key === WORKER ||
      key === 'BootScene' ||
      key === 'PreloaderScene'
    ) {
      return;
    }

    if (this.prepared.has(key)) {
      return this.prepared.get(key).promise;
    }

    const token = Symbol(key);

    const record = {
      token,
      promise: null,
      cleanup: null
    };

    this.prepared.set(key, record);

    record.promise = (async () => {
      const bundles = this.manifest.bundles;

      if (!INITIAL.has(key)) {
        await this.ensureBundles(
          ['shared'],
          'shared',
          'Organising the agency files...'
        );
      }

      const requested = [];

      if (key === 'HiddenObjectsScene') {
        const crimeId =
          data.sceneId ||
          data.itemSceneKey ||
          data.mapKey ||
          gameState.currentMission?.scene;

        if (
          !crimeId ||
          !bundles[`crime:${crimeId}`]
        ) {
          throw new Error(
            '[AssetManager] Unknown hidden-objects location.'
          );
        }

        requested.push(`crime:${crimeId}`);
      }

      if (bundles[`scene:${key}`]) {
        requested.push(`scene:${key}`);
      }

      const cityId = this.resolveCity(
        key,
        data
      );

      if (
        cityId &&
        bundles[`city:${cityId}`]
      ) {
        requested.push(`city:${cityId}`);
      }

      await this.ensureBundles(
        requested,
        token,
        'Following the paper trail...'
      );

      const target = this.game.scene.getScene(key);

      if (!target) {
        throw new Error(
          `[AssetManager] Scene not registered: ${key}`
        );
      }

      const release = () => {
        target.events.off(
          'shutdown',
          release
        );

        target.events.off(
          'destroy',
          release
        );

        target.events.off(
          'create',
          created
        );

        if (
          this.prepared.get(key) === record
        ) {
          this.prepared.delete(key);
        }

        this.unpin(token);
      };

      const created = () => {
        if (cityId) {
          this.currentCity = cityId;
        }
      };

      record.cleanup = release;

      target.events.once(
        'shutdown',
        release
      );

      target.events.once(
        'destroy',
        release
      );

      target.events.once(
        'create',
        created
      );
    })().catch(error => {
      this.prepared.delete(key);
      this.unpin(token);
      throw error;
    });

    return record.promise;
  }

  cancelPrepared(key) {
    const target = this.game.scene.keys[key];

    if (
      target &&
      (
        target.sys.isActive() ||
        target.sys.isSleeping() ||
        target.sys.isPaused()
      )
    ) {
      return;
    }

    this.prepared.get(key)?.cleanup?.();
  }

  async prepareSavedCity(cityId) {
    const normalized = canonical(cityId);
    const bundle = `city:${normalized}`;

    if (!this.manifest.bundles[bundle]) {
      throw new Error(
        `[AssetManager] Unknown saved city: ${cityId}`
      );
    }

    const owner = Symbol('save-city');

    await this.ensureBundles(
      [bundle],
      owner,
      'Reopening the saved case file...'
    );

    return () => this.unpin(owner);
  }

  debugStatus() {
    return {
      build: 'optional-newspaper-json-2026-10-30',
      currentCity: this.currentCity,
      preparedScenes: [
        ...this.prepared.keys()
      ],
      managedAssets: [
        ...this.managed.keys()
      ],
      unavailableNewspapers: [
        ...this.unavailableNewspapers
      ],
      owners: [...this.owners].map(
        ([owner, ids]) => ({
          owner: String(owner),
          count: ids.size
        })
      ),
      recentTextureRemovals: [
        ...this.textureEvents
      ],
      progress: this.progress
    };
  }
}