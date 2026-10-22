import {
  PENCIL_COLORS,
  FEATURE_TEXTURES,
  HAIR_OVERRIDE_FEATURES,
  HAIR_COLORED_FEATURES,
  NOTEBOOK_CONFIG
} from './warrantConfig.js';
import { up } from './warrantUtils.js';
import { ensureFlagTexture } from './warrantFlags.js';

export class WarrantSketch {
  constructor(scene, bookGroup, fx) {
    this.scene = scene;
    this.fx = fx;
    this.layers = {};

    const centerX = 960;
    const centerY = 540;

    // '__DEFAULT' zamiast '' - bez ostrzeżeń o brakującej teksturze.
    this.layers.featureBack = scene.add.image(centerX, centerY, '__DEFAULT').setVisible(false);
    this.layers.base = this._createPencilLayer(centerX, centerY, 'sketch_base');
    this.layers.eyes = this._createPencilLayer(centerX, centerY, 'sketch_eyes');
    this.layers.hair = this._createPencilLayer(centerX, centerY, 'sketch_hair');
    this.layers.feature = scene.add.image(centerX, centerY, '__DEFAULT').setVisible(false);
    this.layers.accentFlag = scene.add.image(540, 930, '__DEFAULT').setVisible(false);

    this.accentLabel = scene.add.text(600, 930, '', {
      fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
      fontSize: '24px',
      color: NOTEBOOK_CONFIG.INK_BLUE
    }).setOrigin(0, 0.5).setVisible(false);

    bookGroup.add([
      this.layers.featureBack,
      this.layers.base,
      this.layers.eyes,
      this.layers.hair,
      this.layers.feature,
      this.layers.accentFlag,
      this.accentLabel
    ]);
  }

  _createPencilLayer(x, y, key) {
    if (this.scene.textures.exists(key)) {
      return this.scene.add.image(x, y, key);
    }

    return this.scene.add.container(x, y);
  }

  _setTint(layer, tint) {
    if (typeof layer.setTint === 'function') {
      layer.setTint(tint);
    }
  }

  // Krótki "przeskok kredki" na warstwie, która się zmieniła.
  _pop(obj) {
    if (!obj?.scene || obj.visible === false) return;

    this.fx.kill(obj);
    obj.setAlpha(0.55);
    obj.setScale(0.985);
    this.fx.tween({ targets: obj, alpha: 1, scale: 1, duration: 180, ease: 'Sine.easeOut' });
  }

  _popForTrait(key) {
    const l = this.layers;

    switch (key) {
      case 'race': this._pop(l.base); break;
      case 'eyes': this._pop(l.eyes); break;
      case 'hair': this._pop(l.hair); break;
      case 'features':
        this._pop(l.feature);
        this._pop(l.featureBack);
        break;
      case 'accent': this._pop(l.accentFlag); break;
      default: break;
    }
  }

  killAll() {
    Object.values(this.layers).forEach((layer) => this.fx.kill(layer));
  }

  update(traitsData, filters, changedKey = null) {
    const pick = (key) => traitsData[key]?.[filters[key]] || 'NONE';

    const selectedAccent = pick('accent');
    const featureUpper = up(pick('features'));
    const accentUpper = up(selectedAccent);
    const hairTint = PENCIL_COLORS.hair[up(pick('hair'))] || PENCIL_COLORS.hair.NONE;
    const l = this.layers;

    this._setTint(l.base, PENCIL_COLORS.skin[up(pick('race'))] || PENCIL_COLORS.skin.NONE);
    this._setTint(l.eyes, PENCIL_COLORS.eyes[up(pick('eyes'))] || PENCIL_COLORS.eyes.NONE);

    if (typeof l.hair.setVisible === 'function') {
      const hidesBaseHair = HAIR_OVERRIDE_FEATURES.includes(featureUpper);
      l.hair.setVisible(!hidesBaseHair);

      if (!hidesBaseHair) this._setTint(l.hair, hairTint);
    }

    this._updateFeature(featureUpper, hairTint);

    const flagTextureKey = ensureFlagTexture(this.scene, accentUpper);

    if (flagTextureKey) {
      l.accentFlag.setTexture(flagTextureKey).setVisible(true);
    } else {
      l.accentFlag.setVisible(false);
    }

    // Podpis przy fladze (także dla akcentów bez zdefiniowanej flagi).
    if (filters.accent > 0) {
      this.accentLabel.setText(String(selectedAccent)).setVisible(true);
    } else {
      this.accentLabel.setVisible(false);
    }

    if (changedKey) this._popForTrait(changedKey);
  }

  _updateFeature(featureUpper, hairTint) {
    const l = this.layers;
    const textureKey = FEATURE_TEXTURES[featureUpper];

    if (!textureKey || !this.scene.textures.exists(textureKey)) {
      l.feature.setVisible(false);
      l.featureBack.setVisible(false);
      return;
    }

    // Długie włosy idą za głowę, reszta cech przed nią.
    const isBack = featureUpper === 'LONG HAIR';
    const target = isBack ? l.featureBack : l.feature;
    const other = isBack ? l.feature : l.featureBack;

    other.setVisible(false);
    target.setTexture(textureKey).setVisible(true);

    if (HAIR_COLORED_FEATURES.includes(featureUpper)) {
      this._setTint(target, hairTint);
    } else if (typeof target.clearTint === 'function') {
      target.clearTint();
    }
  }
}