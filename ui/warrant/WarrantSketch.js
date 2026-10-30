import {
  PENCIL_COLORS,
  FEATURE_TEXTURES,
  HAIR_OVERRIDE_FEATURES,
  HAIR_COLORED_FEATURES,
  NOTEBOOK_CONFIG
} from './warrantConfig.js';

import { up } from './warrantUtils.js';
import { ensureFlagTexture } from './warrantFlags.js';

const SKETCH_X = 960;
const SKETCH_Y = 540;

export class WarrantSketch {
  constructor(scene, bookGroup, fx) {
    this.scene = scene;
    this.fx = fx;

    this.destroyed = false;
    this.lastTraits = null;
    this.lastFilters = null;

    this.layers = {};

    this.layers.featureBack = scene.add
      .image(SKETCH_X, SKETCH_Y, '__DEFAULT')
      .setOrigin(0.5)
      .setVisible(false);

    this.layers.base = this._createPencilLayer(
      'sketch_base'
    );

    this.layers.eyes = this._createPencilLayer(
      'sketch_eyes'
    );

    this.layers.hair = this._createPencilLayer(
      'sketch_hair'
    );

    this.layers.feature = scene.add
      .image(SKETCH_X, SKETCH_Y, '__DEFAULT')
      .setOrigin(0.5)
      .setVisible(false);

    this.layers.accentFlag = scene.add
      .image(540, 930, '__DEFAULT')
      .setVisible(false);

    this.accentLabel = scene.add
      .text(600, 930, '', {
        fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
        fontSize: '24px',
        color: NOTEBOOK_CONFIG.INK_BLUE
      })
      .setOrigin(0, 0.5)
      .setVisible(false);

    bookGroup.add([
      this.layers.featureBack,
      this.layers.base,
      this.layers.eyes,
      this.layers.hair,
      this.layers.feature,
      this.layers.accentFlag,
      this.accentLabel
    ]);

    this._onHairLoaded = () => {
      if (
        this.destroyed ||
        !this.layers.hair?.scene
      ) {
        return;
      }

      this.layers.hair.setTexture('sketch_hair');

      if (this.lastTraits && this.lastFilters) {
        this.update(
          this.lastTraits,
          this.lastFilters
        );
      } else {
        this.layers.hair.setVisible(true);
      }
    };

    this._onLoadError = file => {
      if (file?.key === 'sketch_hair') {
        console.error(
          '[WarrantSketch] Could not load ' +
          'assets/ui/sketch_hair.webp'
        );
      }
    };

    if (!scene.textures.exists('sketch_hair')) {
      scene.load.once(
        'filecomplete-image-sketch_hair',
        this._onHairLoaded
      );

      scene.load.on(
        'loaderror',
        this._onLoadError
      );

      scene.load.image(
        'sketch_hair',
        'assets/ui/sketch_hair.webp'
      );

      if (!scene.load.isLoading()) {
        scene.load.start();
      }
    }
  }

  _createPencilLayer(key) {
    const available = this.scene.textures.exists(key);

    return this.scene.add
      .image(
        SKETCH_X,
        SKETCH_Y,
        available ? key : '__DEFAULT'
      )
      .setOrigin(0.5)
      .setVisible(available);
  }

  _setTint(layer, color) {
    layer?.setTint?.(color);
  }

  _resetSketchLayer(layer) {
    if (!layer?.scene) return;

    this.fx.kill(layer);

    layer
      .setPosition(SKETCH_X, SKETCH_Y)
      .setOrigin(0.5)
      .setScale(1)
      .setAngle(0)
      .setAlpha(1);
  }

  _pop(object) {
    if (
      !object?.scene ||
      !object.visible
    ) {
      return;
    }

    this.fx.kill(object);

    // Nie skalujemy osobnych części portretu.
    object.setAlpha(0.55);

    this.fx.tween({
      targets: object,
      alpha: 1,
      duration: 180,
      ease: 'Sine.easeOut'
    });
  }

  killAll() {
    Object.values(this.layers).forEach(layer => {
      this.fx.kill(layer);
    });
  }

  update(
    traitsData,
    filters,
    changedKey = null
  ) {
    if (this.destroyed) return;

    const safeTraits = traitsData || {};
    const safeFilters = filters || {};

    this.lastTraits = safeTraits;
    this.lastFilters = { ...safeFilters };

    const pick = key => {
      return (
        safeTraits[key]?.[safeFilters[key]] ||
        'NONE'
      );
    };

    const accent = pick('accent');
    const feature = up(pick('features'));
    const hairName = up(pick('hair'));

    const aliases = {
      BLOND: 'BLONDE',
      GREY: 'GRAY'
    };

    const hairTint =
      PENCIL_COLORS.hair[
        aliases[hairName] || hairName
      ] ?? PENCIL_COLORS.hair.NONE;

    const l = this.layers;

    [
      l.featureBack,
      l.base,
      l.eyes,
      l.hair,
      l.feature
    ].forEach(layer => {
      this._resetSketchLayer(layer);
    });

    this._setTint(
      l.base,
      PENCIL_COLORS.skin[
        up(pick('race'))
      ] ?? PENCIL_COLORS.skin.NONE
    );

    this._setTint(
      l.eyes,
      PENCIL_COLORS.eyes[
        up(pick('eyes'))
      ] ?? PENCIL_COLORS.eyes.NONE
    );

    const featureTexture =
      FEATURE_TEXTURES[feature];

    const featureAvailable = Boolean(
      featureTexture &&
      this.scene.textures.exists(featureTexture)
    );

    const overrideHair =
      featureAvailable &&
      (
        feature === 'LONG HAIR' ||
        HAIR_OVERRIDE_FEATURES.includes(feature)
      );

    l.hair.setVisible(
      this.scene.textures.exists('sketch_hair') &&
      !overrideHair
    );

    this._setTint(l.hair, hairTint);

    this._updateFeature(feature, hairTint);

    const flag = ensureFlagTexture(
      this.scene,
      up(accent)
    );

    if (flag) {
      l.accentFlag
        .setTexture(flag)
        .setVisible(true);
    } else {
      l.accentFlag.setVisible(false);
    }

    const showAccent =
      Number(safeFilters.accent) > 0;

    this.accentLabel
      .setText(
        showAccent ? String(accent) : ''
      )
      .setVisible(showAccent);

    if (changedKey === 'hair') {
      this._pop(l.hair);

      if (HAIR_COLORED_FEATURES.includes(feature)) {
        this._pop(l.feature);
        this._pop(l.featureBack);
      }
    } else if (changedKey === 'features') {
      this._pop(l.feature);
      this._pop(l.featureBack);
    } else {
      const layer = {
        race: l.base,
        eyes: l.eyes,
        accent: l.accentFlag
      }[changedKey];

      if (layer) {
        this._pop(layer);
      }
    }
  }

  _updateFeature(feature, hairTint) {
    const texture = FEATURE_TEXTURES[feature];
    const l = this.layers;

    l.feature.setVisible(false);
    l.featureBack.setVisible(false);

    if (
      !texture ||
      !this.scene.textures.exists(texture)
    ) {
      return;
    }

    // Pełna warstwa długich włosów zostaje za twarzą.
    const target =
      feature === 'LONG HAIR'
        ? l.featureBack
        : l.feature;

    target
      .setTexture(texture)
      .setPosition(SKETCH_X, SKETCH_Y)
      .setOrigin(0.5)
      .setScale(1)
      .setAngle(0)
      .setAlpha(1)
      .setVisible(true);

    if (HAIR_COLORED_FEATURES.includes(feature)) {
      this._setTint(target, hairTint);
    } else {
      target.clearTint();
    }
  }

  destroy() {
    if (this.destroyed) return;

    this.destroyed = true;

    this.scene.load.off(
      'filecomplete-image-sketch_hair',
      this._onHairLoaded
    );

    this.scene.load.off(
      'loaderror',
      this._onLoadError
    );

    this.killAll();

    this.lastTraits = null;
    this.lastFilters = null;
  }
}