// managers/AvatarManager.js
import {
  AVATAR_CONFIG, LAYER_ORDER, APPEARANCE_OPTIONS, DEFAULT_APPEARANCE,
  normalizeAppearance, findOption, collectPlannedArt
} from '../config/AvatarParts.js';
const TINT_SOURCE = { skin: 'skinTone', hair: 'hairColor', eyes: 'eyeColor', blush: 'blush', lips: 'makeup' };
const REGISTRIES = new WeakMap();
const DEFAULT_LOAD_TIMEOUT_MS = 30000;
const toCss = value => `#${(value >>> 0).toString(16).padStart(6, '0').slice(-6)}`;
const sceneClosed = scene => !scene?.sys ||
  scene.sys.settings?.status >= (globalThis.Phaser?.Scenes?.SHUTDOWN ?? 8);
function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}
function registryFor(textures) {
  let registry = REGISTRIES.get(textures);
  if (!registry) {
    registry = { pending: new Map(), failed: new Set() };
    REGISTRIES.set(textures, registry);
  }
  return registry;
}
function loaderFile(loader, key) {
  for (const collection of [loader.list, loader.inflight, loader.queue]) {
    const entries = Array.isArray(collection?.entries) ? collection.entries : [];
    const file = entries.find(entry => entry.key === key && entry.type === 'image');
    if (file) return file;
  }
  return null;
}
function makeJob(scene, textures, registry, key, timeoutMs) {
  const loader = scene.load, events = scene.events;
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  const job = { key, scene, loader, promise, done: false, settle: null };
  let timer;
  const onFile = () => job.settle(textures.exists(key) ? 'loaded' : 'failed', 'file_complete');
  const onError = file => {
    if (file?.key === key && (!file.type || file.type === 'image')) job.settle('failed', 'load_error');
  };
  const onComplete = () => job.settle(textures.exists(key) ? 'loaded' : 'failed', 'loader_complete');
  const onShutdown = () => job.settle('cancelled', 'owner_shutdown');
  const onDestroy = () => job.settle('cancelled', 'owner_destroyed');
  job.settle = (status, reason) => {
    if (job.done) return;
    job.done = true;
    clearTimeout(timer);
    loader.off(`filecomplete-image-${key}`, onFile);
    loader.off('loaderror', onError);
    loader.off('complete', onComplete);
    events.off('shutdown', onShutdown);
    events.off('destroy', onDestroy);
    if (registry.pending.get(key) === job) registry.pending.delete(key);
    if (textures.exists(key)) {
      status = 'loaded';
      registry.failed.delete(key);
    } else if (status === 'failed') {
      registry.failed.add(key);
      console.warn(`[AvatarManager] "${key}" unavailable (${reason}). Option hidden.`);
    }
    resolve({ key, status, reason });
    job.scene = null;
    job.loader = null;
  };
  registry.pending.set(key, job);
  loader.on(`filecomplete-image-${key}`, onFile);
  loader.on('loaderror', onError);
  loader.on('complete', onComplete);
  events.once('shutdown', onShutdown);
  events.once('destroy', onDestroy);
  timer = setTimeout(() => job.settle('failed', 'timeout'), timeoutMs);
  return job;
}
function waitForScene(scene, jobs) {
  if (sceneClosed(scene)) return Promise.resolve({ cancelled: true });
  if (!jobs.length) return Promise.resolve({ cancelled: false, results: [] });
  return new Promise(resolve => {
    let settled = false;
    const events = scene.events;
    const finish = result => {
      if (settled) return;
      settled = true;
      events.off('shutdown', cancelled);
      events.off('destroy', cancelled);
      resolve(result);
    };
    const cancelled = () => finish({ cancelled: true });
    events.once('shutdown', cancelled);
    events.once('destroy', cancelled);
    Promise.all(jobs.map(job => job.promise)).then(results => finish({ cancelled: false, results }));
    if (sceneClosed(scene)) cancelled();
  });
}
export class AvatarManager {
  constructor({ context = null, assetBaseURL = null, loadTimeoutMs = DEFAULT_LOAD_TIMEOUT_MS } = {}) {
    this.textures = null;
    this.failed = new Set();
    this._crop = null;
    this.assetBaseURL = assetBaseURL;
    this.loadTimeoutMs = Number.isFinite(loadTimeoutMs) && loadTimeoutMs > 0 ? loadTimeoutMs : DEFAULT_LOAD_TIMEOUT_MS;
    if (context) this.bind(context);
  }
  bind(context) {
    const textures = context?.textures ?? context?.sys?.game?.textures ??
      (typeof context?.exists === 'function' ? context : null);
    if (!textures) return this;
    if (this.textures !== textures) this._crop = null;
    this.textures = textures;
    this.failed = registryFor(textures).failed;
    return this;
  }
  isSceneUsable(scene) { return !sceneClosed(scene); }
  _assetMap() {
    const assets = new Map();
    for (const group of Object.values(APPEARANCE_OPTIONS)) {
      for (const option of group.options) {
        if (option.ready) for (const entry of option.art) assets.set(entry.key, entry.file);
      }
    }
    return assets;
  }
  _assetURL(file) {
    return new URL(file, this.assetBaseURL || new URL('../', import.meta.url).href).href;
  }
  queueAssets(scene) {
    this.bind(scene);
    if (sceneClosed(scene) || !scene.load || !scene.events || !scene.textures) return 0;
    const textures = scene.textures, loader = scene.load, registry = registryFor(textures);
    let queued = 0;
    for (const [key, file] of this._assetMap()) {
      if (textures.exists(key)) { registry.failed.delete(key); continue; }
      if (registry.pending.has(key) || registry.failed.has(key)) continue;
      const existing = loaderFile(loader, key);
      const job = makeJob(scene, textures, registry, key, this.loadTimeoutMs);
      if (existing) continue;
      try {
        const ImageFile = globalThis.Phaser?.Loader?.FileTypes?.ImageFile;
        if (!ImageFile || typeof loader.addFile !== 'function') throw new Error('Phaser ImageFile/addFile API is unavailable.');
        const image = new ImageFile(loader, key, this._assetURL(file), { timeout: this.loadTimeoutMs });
        image.key = key;
        loader.addFile(image);
        queued++;
      } catch (error) {
        console.error(`[AvatarManager] Could not queue "${key}":`, error);
        job.settle('failed', 'queue_error');
      }
    }
    return queued;
  }
  async ensureLoaded(scene) {
    this.bind(scene);
    if (sceneClosed(scene) || !scene.load || !scene.events || !scene.textures) {
      return { ok: false, cancelled: true, failed: [], missing: [], reason: 'invalid_scene' };
    }
    const textures = scene.textures, registry = registryFor(textures);
    for (let attempt = 0; attempt < 2; attempt++) {
      this.queueAssets(scene);
      const jobs = [...this._assetMap().keys()].map(key => registry.pending.get(key)).filter(Boolean);
      const waiting = waitForScene(scene, jobs);
      const loaders = new Set(jobs.map(job => job.loader).filter(Boolean));
      for (const loader of loaders) {
        const owned = jobs.filter(job => job.loader === loader);
        const preloading = owned.some(job => job.scene?.sys?.settings?.status === (globalThis.Phaser?.Scenes?.LOADING ?? 3));
        if (preloading || loader.isLoading()) continue;
        try { loader.start(); }
        catch (error) {
          console.error('[AvatarManager] Loader start failed:', error);
          for (const job of owned) job.settle('failed', 'start_error');
        }
      }
      const result = await waiting;
      if (result.cancelled || sceneClosed(scene)) {
        return { ok: false, cancelled: true, failed: [], missing: [], reason: 'scene_closed' };
      }
      if (result.results.some(item => item.status === 'cancelled') && attempt === 0) continue;
      break;
    }
    const missing = [...this._assetMap().keys()].filter(key => !textures.exists(key));
    return { ok: missing.length === 0, cancelled: false,
      failed: missing.filter(key => registry.failed.has(key)), missing,
      reason: missing.length ? 'assets_unavailable' : null };
  }
  hasTexture(key, context = null) {
    if (context) this.bind(context);
    const available = Boolean(this.textures?.exists(key));
    if (available) this.failed.delete(key);
    return available;
  }
  isOptionAvailable(category, id) {
    const option = findOption(category, id);
    return Boolean(option?.ready) && option.art.every(entry => this.hasTexture(entry.key));
  }
  availableOptions(category) {
    return APPEARANCE_OPTIONS[category]?.options.filter(option => this.isOptionAvailable(category, option.id)) ?? [];
  }
  getArtTodo() {
    const todo = collectPlannedArt();
    if (console.table) console.table(todo);
    return todo;
  }
  _image(key) {
    if (!this.hasTexture(key)) return null;
    const image = this.textures.get(key)?.getSourceImage?.();
    return image && (image.naturalWidth || image.width) ? image : null;
  }
  _getCrop() {
    if (this._crop) return this._crop;
    const image = this._image(AVATAR_CONFIG.CROP_KEY);
    if (!image) return null;
    const W = image.naturalWidth || image.width, H = image.naturalHeight || image.height;
    let minX = W, minY = H, maxX = -1, maxY = -1;
    try {
      const probe = makeCanvas(W, H);
      const context = probe.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, W, H).data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (data[i + 3] > 24 && data[i] + data[i + 1] + data[i + 2] < 700) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
      }
    } catch (error) {
      console.warn('[AvatarManager] Crop probe failed, using full canvas.', error);
      minX = 0; minY = 0; maxX = W - 1; maxY = H - 1;
    }
    if (maxX < 0) { minX = 0; minY = 0; maxX = W - 1; maxY = H - 1; }
    const bw = maxX - minX + 1, bh = maxY - minY + 1, pad = AVATAR_CONFIG.CROP_PAD;
    const x0 = Math.max(0, Math.floor(minX - bw * pad.left));
    const y0 = Math.max(0, Math.floor(minY - bh * pad.top));
    const x1 = Math.min(W, Math.ceil(maxX + 1 + bw * pad.right));
    const y1 = Math.min(H, Math.ceil(maxY + 1 + bh * pad.bottom));
    this._crop = { W, H, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    return this._crop;
  }
  getAspect() {
    const crop = this._getCrop();
    return crop ? crop.w / crop.h : null;
  }
  _tintColor(entry, appearance) {
    if (!entry.tint) return null;
    const category = TINT_SOURCE[entry.tint];
    return findOption(category, appearance[category])?.color ?? null;
  }
  resolveLayers(appearance) {
    const normalized = normalizeAppearance(appearance), picked = [], suppressed = new Set();
    for (const category of Object.keys(APPEARANCE_OPTIONS)) {
      const option = findOption(category, normalized[category]);
      if (!option || !this.isOptionAvailable(category, option.id)) continue;
      option.suppress.forEach(slot => suppressed.add(slot));
      picked.push(...option.art);
    }
    if (!picked.some(entry => entry.slot === 'base')) {
      const fallback = findOption('faceShape', DEFAULT_APPEARANCE.faceShape);
      if (fallback && this.isOptionAvailable('faceShape', fallback.id)) picked.push(...fallback.art);
    }
    const order = slot => {
      const index = LAYER_ORDER.indexOf(slot);
      return index === -1 ? LAYER_ORDER.length : index;
    };
    return {
      layers: picked.filter(entry => !suppressed.has(entry.slot)).sort((a, b) => order(a.slot) - order(b.slot)),
      appearance: normalized
    };
  }
  compose(appearance, { height = AVATAR_CONFIG.OUTPUT_HEIGHT, background = null, scene = null } = {}) {
    if (scene) this.bind(scene);
    const crop = this._getCrop();
    if (!crop) return null;
    const resolved = this.resolveLayers(appearance);
    const stage = makeCanvas(crop.w, crop.h), temporary = makeCanvas(crop.w, crop.h);
    const context = stage.getContext('2d'), tint = temporary.getContext('2d');
    for (const entry of resolved.layers) {
      const image = this._image(entry.key);
      if (!image) continue;
      const iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height;
      const ox = Math.round((crop.W - iw) / 2) - crop.x;
      const oy = Math.round((crop.H - ih) / 2) - crop.y;
      const color = this._tintColor(entry, resolved.appearance);
      if (color === null) { context.drawImage(image, ox, oy); continue; }
      tint.globalCompositeOperation = 'source-over';
      tint.clearRect(0, 0, crop.w, crop.h);
      tint.drawImage(image, ox, oy);
      if (entry.tint === 'blush' || entry.tint === 'lips') {
        tint.globalCompositeOperation = 'source-in';
        tint.fillStyle = toCss(color);
        tint.fillRect(0, 0, crop.w, crop.h);
      } else {
        tint.globalCompositeOperation = 'multiply';
        tint.fillStyle = toCss(color);
        tint.fillRect(0, 0, crop.w, crop.h);
        tint.globalCompositeOperation = 'destination-in';
        tint.drawImage(image, ox, oy);
      }
      tint.globalCompositeOperation = 'source-over';
      context.drawImage(temporary, 0, 0);
    }
    const outH = Math.max(1, Math.round(height)), outW = Math.max(1, Math.round(crop.w * outH / crop.h));
    const output = makeCanvas(outW, outH), target = output.getContext('2d');
    if (background) { target.fillStyle = background; target.fillRect(0, 0, outW, outH); }
    target.imageSmoothingEnabled = true;
    target.imageSmoothingQuality = 'high';
    target.drawImage(stage, 0, 0, crop.w, crop.h, 0, 0, outW, outH);
    return output;
  }
  drawToCanvas(canvas, appearance, options = {}) {
    if (!canvas) return false;
    const composed = this.compose(appearance, options);
    if (!composed) return false;
    canvas.width = composed.width; canvas.height = composed.height;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, composed.width, composed.height);
    context.drawImage(composed, 0, 0);
    return true;
  }
  getTexture(scene, appearance, {
    key = AVATAR_CONFIG.TEXTURE_KEY, height = AVATAR_CONFIG.OUTPUT_HEIGHT, background = AVATAR_CONFIG.PAPER
  } = {}) {
    if (!scene?.textures) return null;
    this.bind(scene);
    const composed = this.compose(appearance, { height, background });
    if (!composed) return null;
    const manager = scene.textures;
    let texture = manager.exists(key) ? manager.get(key) : null;
    const reusable = texture && typeof texture.getContext === 'function' &&
      texture.getSourceImage().width === composed.width && texture.getSourceImage().height === composed.height;
    if (!reusable) {
      if (texture) manager.remove(key);
      texture = manager.createCanvas(key, composed.width, composed.height);
    }
    const context = texture.getContext();
    context.clearRect(0, 0, composed.width, composed.height);
    context.drawImage(composed, 0, 0);
    texture.refresh();
    return key;
  }
  addPortrait(scene, x, y, appearance, {
    height = 220, key = AVATAR_CONFIG.TEXTURE_KEY, background = AVATAR_CONFIG.PAPER
  } = {}) {
    const textureKey = this.getTexture(scene, appearance, { key, background });
    if (!textureKey) return null;
    const image = scene.add.image(x, y, textureKey).setOrigin(0.5);
    const ratio = height / image.height;
    image.setDisplaySize(image.width * ratio, height);
    return image;
  }
}
export const avatarManager = new AvatarManager();
export function getAvatarManager(context = null) {
  if (context) avatarManager.bind(context);
  return avatarManager;
}