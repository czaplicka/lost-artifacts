// managers/AvatarManager.js
// ---------------------------------------------------------------------------
// Composes the layered pencil-sketch avatar (see config/AvatarParts.js).
//
//   preload():   avatarManager.queueAssets(this);
//   later:       await avatarManager.ensureLoaded(this);
//   DOM:         avatarManager.drawToCanvas(canvasEl, appearance);
//   Phaser:      avatarManager.addPortrait(this, x, y, appearance, { height: 220 });
//
// Only appearance IDS are saved in gameState; the image is re-composed on demand.
// ---------------------------------------------------------------------------

import {
  AVATAR_CONFIG,
  LAYER_ORDER,
  APPEARANCE_OPTIONS,
  DEFAULT_APPEARANCE,
  normalizeAppearance,
  findOption,
  collectPlannedArt
} from '../config/AvatarParts.js';

const TINT_SOURCE = { skin: 'skinTone', hair: 'hairColor', eyes: 'eyeColor' };

const toCss = (n) => `#${(n >>> 0).toString(16).padStart(6, '0').slice(-6)}`;

const makeCanvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};

export class AvatarManager {
  constructor() {
    this.textures = null;
    this.failed = new Set();
    this._assets = null;
    this._crop = null;
  }

  // ---- asset loading ------------------------------------------------------

  // key -> file for every layer of every READY option (deduplicated).
  _assetMap() {
    if (this._assets) return this._assets;

    const map = new Map();

    for (const group of Object.values(APPEARANCE_OPTIONS)) {
      for (const option of group.options) {
        if (!option.ready) continue;
        for (const l of option.art) map.set(l.key, l.file);
      }
    }

    this._assets = map;
    return map;
  }

  // Call from preload(). Returns how many files were queued.
  queueAssets(scene) {
    if (!scene?.load) return 0;

    this.textures = scene.textures;

    const assets = this._assetMap();
    const pending = [];

    for (const [key, file] of assets) {
      if (scene.textures.exists(key) || this.failed.has(key)) continue;
      pending.push([key, file]);
    }

    if (!pending.length) return 0;

    const onError = (file) => {
      if (assets.has(file?.key)) {
        this.failed.add(file.key);
        console.warn(`[AvatarManager] Could not load "${file.key}" (${file.url}). Option hidden.`);
      }
    };

    scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
      scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
    });

    for (const [key, file] of pending) scene.load.image(key, file);

    return pending.length;
  }

  // For scenes that are not the creator (HUD, PI computer, loaded save...).
  ensureLoaded(scene) {
    return new Promise((resolve) => {
      if (!scene?.load) {
        resolve();
        return;
      }

      const queued = this.queueAssets(scene);

      if (!queued && !scene.load.isLoading()) {
        resolve();
        return;
      }

      scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());

      if (!scene.load.isLoading()) scene.load.start();
    });
  }

  // ---- availability -------------------------------------------------------

  hasTexture(key) {
    return Boolean(this.textures?.exists(key)) && !this.failed.has(key);
  }

  isOptionAvailable(category, id) {
    const option = findOption(category, id);
    if (!option || !option.ready) return false;
    return option.art.every((l) => this.hasTexture(l.key));
  }

  availableOptions(category) {
    const group = APPEARANCE_OPTIONS[category];
    if (!group) return [];
    return group.options.filter((o) => this.isOptionAvailable(category, o.id));
  }

  // Console helper for the artist: avatarManager.getArtTodo()
  getArtTodo() {
    const todo = collectPlannedArt();
    if (console.table) console.table(todo);
    return todo;
  }

  // ---- composition --------------------------------------------------------

  _image(key) {
    if (!this.hasTexture(key)) return null;
    const img = this.textures.get(key)?.getSourceImage?.();
    return img && (img.naturalWidth || img.width) ? img : null;
  }

  // Fixed crop (head + hair margin + shoulders) from the default base layer,
  // so every face shape / hairstyle lands in the same frame.
  _getCrop() {
    if (this._crop) return this._crop;

    const img = this._image(AVATAR_CONFIG.CROP_KEY);
    if (!img) return null;

    const W = img.naturalWidth || img.width;
    const H = img.naturalHeight || img.height;

    let minX = W;
    let minY = H;
    let maxX = -1;
    let maxY = -1;

    try {
      const probe = makeCanvas(W, H);
      const pctx = probe.getContext('2d', { willReadFrequently: true });
      pctx.drawImage(img, 0, 0);
      const data = pctx.getImageData(0, 0, W, H).data;

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          if (data[i + 3] > 24 && data[i] + data[i + 1] + data[i + 2] < 700) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
    } catch (error) {
      console.warn('[AvatarManager] Crop probe failed, using full canvas.', error);
    }

    if (maxX < 0) {
      minX = 0;
      minY = 0;
      maxX = W - 1;
      maxY = H - 1;
    }

    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    const pad = AVATAR_CONFIG.CROP_PAD;

    const x0 = Math.max(0, Math.floor(minX - bw * pad.left));
    const y0 = Math.max(0, Math.floor(minY - bh * pad.top));
    const x1 = Math.min(W, Math.ceil(maxX + 1 + bw * pad.right));
    const y1 = Math.min(H, Math.ceil(maxY + 1 + bh * pad.bottom));

    this._crop = { W, H, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    return this._crop;
  }

  // width / height of the portrait (null until the base layer is loaded).
  getAspect() {
    const crop = this._getCrop();
    return crop ? crop.w / crop.h : null;
  }

  _tintColor(layer, appearance) {
    if (!layer.tint) return null;
    const category = TINT_SOURCE[layer.tint];
    return findOption(category, appearance[category])?.color ?? null;
  }

  // -> ordered [{key, slot, tint}] that are actually drawable
  resolveLayers(appearance) {
    const a = normalizeAppearance(appearance);
    const picked = [];
    const suppressed = new Set();

    for (const category of Object.keys(APPEARANCE_OPTIONS)) {
      const option = findOption(category, a[category]);
      if (!option || !this.isOptionAvailable(category, option.id)) continue;

      option.suppress.forEach((slot) => suppressed.add(slot));
      picked.push(...option.art);
    }

    // Chosen face has no art yet -> fall back to the default face.
    if (!picked.some((l) => l.slot === 'base')) {
      const fallback = findOption('faceShape', DEFAULT_APPEARANCE.faceShape);
      if (fallback && this.isOptionAvailable('faceShape', fallback.id)) {
        picked.push(...fallback.art);
      }
    }

    const order = (slot) => {
      const i = LAYER_ORDER.indexOf(slot);
      return i === -1 ? LAYER_ORDER.length : i;
    };

    const layers = picked
      .filter((l) => !suppressed.has(l.slot))
      .sort((l1, l2) => order(l1.slot) - order(l2.slot));

    return { layers, appearance: a };
  }

  // -> HTMLCanvasElement | null (null = base art not loaded yet)
  compose(appearance, { height = AVATAR_CONFIG.OUTPUT_HEIGHT, background = null } = {}) {
    const crop = this._getCrop();
    if (!crop) return null;

    const { layers, appearance: a } = this.resolveLayers(appearance);

    const stage = makeCanvas(crop.w, crop.h);
    const sctx = stage.getContext('2d');
    const tmp = makeCanvas(crop.w, crop.h);
    const tctx = tmp.getContext('2d');

    for (const layer of layers) {
      const img = this._image(layer.key);
      if (!img) continue;

      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;

      // Same placement as WarrantSketch: every layer centred on the canvas.
      const ox = Math.round((crop.W - iw) / 2) - crop.x;
      const oy = Math.round((crop.H - ih) / 2) - crop.y;

      const color = this._tintColor(layer, a);

      if (color === null) {
        sctx.drawImage(img, ox, oy);
        continue;
      }

      // Multiply tint (what Phaser's setTint does), keeping the original alpha.
      tctx.globalCompositeOperation = 'source-over';
      tctx.clearRect(0, 0, crop.w, crop.h);
      tctx.drawImage(img, ox, oy);
      tctx.globalCompositeOperation = 'multiply';
      tctx.fillStyle = toCss(color);
      tctx.fillRect(0, 0, crop.w, crop.h);
      tctx.globalCompositeOperation = 'destination-in';
      tctx.drawImage(img, ox, oy);
      tctx.globalCompositeOperation = 'source-over';

      sctx.drawImage(tmp, 0, 0);
    }

    const outH = Math.max(1, Math.round(height));
    const outW = Math.max(1, Math.round((crop.w * outH) / crop.h));
    const out = makeCanvas(outW, outH);
    const octx = out.getContext('2d');

    if (background) {
      octx.fillStyle = background;
      octx.fillRect(0, 0, outW, outH);
    }

    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(stage, 0, 0, crop.w, crop.h, 0, 0, outW, outH);

    return out;
  }

  // ---- consumers ----------------------------------------------------------

  // DOM <canvas> (character creator, dossier, profile cards...)
  drawToCanvas(canvasEl, appearance, options = {}) {
    if (!canvasEl) return false;

    const composed = this.compose(appearance, options);
    if (!composed) return false;

    canvasEl.width = composed.width;
    canvasEl.height = composed.height;

    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, composed.width, composed.height);
    ctx.drawImage(composed, 0, 0);

    return true;
  }

  // Phaser CanvasTexture, updated in place (existing Images refresh themselves).
  getTexture(scene, appearance, {
    key = AVATAR_CONFIG.TEXTURE_KEY,
    height = AVATAR_CONFIG.OUTPUT_HEIGHT,
    background = AVATAR_CONFIG.PAPER
  } = {}) {
    if (!scene?.textures) return null;

    const composed = this.compose(appearance, { height, background });
    if (!composed) return null;

    const manager = scene.textures;
    let texture = manager.exists(key) ? manager.get(key) : null;

    const reusable =
      texture &&
      typeof texture.getContext === 'function' &&
      texture.getSourceImage().width === composed.width &&
      texture.getSourceImage().height === composed.height;

    if (!reusable) {
      if (texture) manager.remove(key);
      texture = manager.createCanvas(key, composed.width, composed.height);
    }

    const ctx = texture.getContext();
    ctx.clearRect(0, 0, composed.width, composed.height);
    ctx.drawImage(composed, 0, 0);
    texture.refresh();

    return key;
  }

  // Ready-made portrait image. Returns null if art is not loaded yet
  // (call `await avatarManager.ensureLoaded(scene)` first).
  addPortrait(scene, x, y, appearance, {
    height = 220,
    key = AVATAR_CONFIG.TEXTURE_KEY,
    background = AVATAR_CONFIG.PAPER
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

export function getAvatarManager() {
  return avatarManager;
}