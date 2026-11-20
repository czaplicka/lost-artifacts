import {
  PENCIL_COLORS, FEATURE_IDS, FEATURE_TEXTURES, HAIR_OVERRIDE_FEATURES,
  HAIR_COLORED_FEATURES, NOTEBOOK_CONFIG
} from './warrantConfig.js';
import { up } from './warrantUtils.js';
import { ensureFlagTexture } from './warrantFlags.js';
import { avatarManager } from '../../managers/AvatarManager.js';

const SKETCH_X = 960;
const SKETCH_Y = 540;
const PENCIL_TEXTURES = Object.freeze({
  base: 'sketch_base', eyes: 'sketch_eyes', hair: 'sketch_hair'
});

export class WarrantSketch {
  constructor(scene, bookGroup, fx) {
    this.scene = scene;
    this.fx = fx;
    this.destroyed = false;
    this.lastTraits = null;
    this.lastFilters = null;
    this.layers = {};
    this._loadRequest = null;
    this._assetPromise = null;
    this._boundDestroy = this.destroy.bind(this);

    this.layers.featureBack = scene.add.image(SKETCH_X, SKETCH_Y, '__DEFAULT')
      .setOrigin(0.5).setVisible(false);
    this.layers.base = this._createPencilLayer(PENCIL_TEXTURES.base);
    this.layers.eyes = this._createPencilLayer(PENCIL_TEXTURES.eyes);
    this.layers.hair = this._createPencilLayer(PENCIL_TEXTURES.hair);
    this.layers.feature = scene.add.image(SKETCH_X, SKETCH_Y, '__DEFAULT')
      .setOrigin(0.5).setVisible(false);
    this.layers.accentFlag = scene.add.image(540, 930, '__DEFAULT').setVisible(false);
    this.accentLabel = scene.add.text(600, 930, '', {
      fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
      fontSize: '24px', color: NOTEBOOK_CONFIG.INK_BLUE
    }).setOrigin(0, 0.5).setVisible(false);
    bookGroup.add([
      this.layers.featureBack, this.layers.base, this.layers.eyes, this.layers.hair,
      this.layers.feature, this.layers.accentFlag, this.accentLabel
    ]);

    this._onTextureAdded = key => {
      if (Object.values(PENCIL_TEXTURES).includes(key)) this._refreshLoadedLayers();
    };
    scene.textures.on('addtexture', this._onTextureAdded);
    scene.events.once('shutdown', this._boundDestroy);
    scene.events.once('destroy', this._boundDestroy);

    // No independent image()/start(): AvatarManager owns shared avatar loads.
    this._ensurePencilAssets();
  }

  _alive() {
    return !this.destroyed && this.scene && avatarManager.isSceneUsable(this.scene);
  }

  _ensurePencilAssets() {
    if (!this._alive()) return;
    avatarManager.bind(this.scene);
    this._refreshLoadedLayers();
    const missing = Object.values(PENCIL_TEXTURES)
      .some(key => !this.scene.textures.exists(key));
    if (!missing) return;

    const request = Symbol('warrant-pencil-assets');
    this._loadRequest = request;
    this._assetPromise = Promise.resolve().then(() => {
      if (!this._alive() || this._loadRequest !== request) return { cancelled: true };
      return avatarManager.ensureLoaded(this.scene);
    }).then(result => {
      if (!this._alive() || this._loadRequest !== request || result?.cancelled) return;
      this._refreshLoadedLayers();
      const unavailable = Object.values(PENCIL_TEXTURES)
        .filter(key => !this.scene.textures.exists(key));
      if (unavailable.length) {
        console.warn('[WarrantSketch] Pencil textures unavailable:', unavailable);
      }
    }).catch(error => {
      if (this._alive() && this._loadRequest === request) {
        console.error('[WarrantSketch] Could not load shared pencil textures:', error);
      }
    }).finally(() => {
      if (this._loadRequest === request) {
        this._loadRequest = null;
        this._assetPromise = null;
      }
    });
  }

  _syncPencilLayers() {
    for (const [name, key] of Object.entries(PENCIL_TEXTURES)) {
      const layer = this.layers[name];
      if (!layer?.scene) continue;
      const available = this.scene.textures.exists(key);
      if (available && layer.texture?.key !== key) layer.setTexture(key);
      layer.setVisible(available);
    }
  }

  _refreshLoadedLayers() {
    if (!this._alive()) return;
    this._syncPencilLayers();
    if (this.lastTraits && this.lastFilters) this.update(this.lastTraits, this.lastFilters);
  }

  _createPencilLayer(key) {
    const available = this.scene.textures.exists(key);
    return this.scene.add.image(SKETCH_X, SKETCH_Y, available ? key : '__DEFAULT')
      .setOrigin(0.5).setVisible(available);
  }

  _setTint(layer, color) { layer?.setTint?.(color); }

  _resetSketchLayer(layer) {
    if (!layer?.scene) return;
    this.fx.kill(layer);
    layer.setPosition(SKETCH_X, SKETCH_Y).setOrigin(0.5).setScale(1).setAngle(0).setAlpha(1);
  }

  _pop(object) {
    if (!object?.scene || !object.visible) return;
    this.fx.kill(object);
    object.setAlpha(0.55);
    this.fx.tween({ targets: object, alpha: 1, duration: 180, ease: 'Sine.easeOut' });
  }

  killAll() {
    Object.values(this.layers).forEach(layer => this.fx.kill(layer));
  }

  update(traitsData, filters, changedKey = null) {
    if (!this._alive()) return;
    const safeTraits = traitsData || {}, safeFilters = filters || {};
    this.lastTraits = safeTraits;
    this.lastFilters = { ...safeFilters };
    this._syncPencilLayers();
    const pick = key => safeTraits[key]?.[safeFilters[key]] || 'NONE';
    const accent = pick('accent');
    const feature = up(pick('features'));
    const hairName = up(pick('hair'));
    const aliases = { BLOND: 'BLONDE', GREY: 'GRAY' };
    const hairTint = PENCIL_COLORS.hair[aliases[hairName] || hairName] ?? PENCIL_COLORS.hair.NONE;
    const l = this.layers;
    [l.featureBack, l.base, l.eyes, l.hair, l.feature].forEach(layer => this._resetSketchLayer(layer));
    this._setTint(l.base, PENCIL_COLORS.skin[up(pick('race'))] ?? PENCIL_COLORS.skin.NONE);
    this._setTint(l.eyes, PENCIL_COLORS.eyes[up(pick('eyes'))] ?? PENCIL_COLORS.eyes.NONE);

    const featureTexture = FEATURE_TEXTURES[feature];
    const featureAvailable = Boolean(featureTexture && this.scene.textures.exists(featureTexture));
    const overrideHair = featureAvailable && feature !== FEATURE_IDS.LONG_HAIR &&
      HAIR_OVERRIDE_FEATURES.includes(feature);
    l.hair.setVisible(this.scene.textures.exists(PENCIL_TEXTURES.hair) && !overrideHair);
    this._setTint(l.hair, hairTint);
    this._updateFeature(feature, hairTint);

    const flag = ensureFlagTexture(this.scene, up(accent));
    if (flag) l.accentFlag.setTexture(flag).setVisible(true);
    else l.accentFlag.setVisible(false);
    const showAccent = Number(safeFilters.accent) > 0;
    this.accentLabel.setText(showAccent ? String(accent) : '').setVisible(showAccent);
    if (changedKey === 'hair') {
      this._pop(l.hair);
      if (HAIR_COLORED_FEATURES.includes(feature)) {
        this._pop(l.feature); this._pop(l.featureBack);
      }
    } else if (changedKey === 'features') {
      this._pop(l.feature); this._pop(l.featureBack);
    } else {
      const layer = { race: l.base, eyes: l.eyes, accent: l.accentFlag }[changedKey];
      if (layer) this._pop(layer);
    }
  }

  _updateFeature(feature, hairTint) {
    const texture = FEATURE_TEXTURES[feature], l = this.layers;
    l.feature.setVisible(false);
    l.featureBack.setVisible(false);
    if (!texture || !this.scene.textures.exists(texture)) return;
    const target = feature === FEATURE_IDS.LONG_HAIR ? l.featureBack : l.feature;
    target.setTexture(texture).setPosition(SKETCH_X, SKETCH_Y).setOrigin(0.5)
      .setScale(1).setAngle(0).setAlpha(1).setVisible(true);
    if (HAIR_COLORED_FEATURES.includes(feature)) this._setTint(target, hairTint);
    else target.clearTint();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this._loadRequest = null;
    this._assetPromise = null;
    this.scene.textures.off('addtexture', this._onTextureAdded);
    this.scene.events.off('shutdown', this._boundDestroy);
    this.scene.events.off('destroy', this._boundDestroy);
    this.killAll();
    this.lastTraits = null;
    this.lastFilters = null;
    // Never abort a shared AvatarManager load or remove shared textures here.
    this.scene = null;
  }
}
