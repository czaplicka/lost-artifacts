// ui/WarrantUI.js
import { saveGameState } from '../gameStatePersistence.js';
import { gameState as globalGameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';

// Color palette for pencil/crayon tinting (Hex values)
const PENCIL_COLORS = {
  skin: {
    WHITE: 0xffe0bd,
    BLACK: 0x69422a,
    LATINO: 0xd19d70,
    'AMERICAN INDIAN': 0xbe7d55,
    ASIAN: 0xf2d6a2,
    'NATIVE HAWAIIAN': 0xc89868,
    NONE: 0xffffff,
    UNKNOWN: 0xffffff
  },
  eyes: {
    BLUE: 0x4a90e2,
    GREEN: 0x50e3c2,
    BROWN: 0x8b572a,
    HAZEL: 0xc69c6d,
    NONE: 0xffffff,
    UNKNOWN: 0xffffff
  },
  hair: {
    BLACK: 0x1a1a1a,
    BROWN: 0x4a2e2b,
    BLONDE: 0xe6c687,
    RED: 0xb83b28,
    GRAY: 0x9b9b9b,
    NONE: 0xffffff,
    UNKNOWN: 0xffffff
  }
};

// Mapowanie cech z danych (UPPERCASE) na klucze załadowanych grafik.
// Aliasy pokrywają faktyczne wartości z suspects.json.
const FEATURE_TEXTURES = {
  BEARD: 'beard',
  'BIG FOREHEAD': 'big_forhead',
  EARRINGS: 'earings',
  EARRING: 'earings',
  GLASSES: 'glasses',
  GOATEE: 'gotee',
  'LONG HAIR': 'long_hair',
  MOUSTACHE: 'moustache',
  NECKLACE: 'neckles',
  'RAINBOW STREAK': 'rainbow_streak',
  'RAINBOW HAIR STREAK': 'rainbow_streak',
  SCAR: 'scar',
  TATTOO: 'tatoo'
};

// Cechy, które UKRYWAJĄ domyślną warstwę `sketch_hair`
const HAIR_OVERRIDE_FEATURES = ['BIG FOREHEAD'];

// Cechy, które przyjmują KOLOR WŁOSÓW
const HAIR_COLORED_FEATURES = [
  'LONG HAIR',
  'BIG FOREHEAD',
  'BEARD',
  'MOUSTACHE',
  'GOATEE'
];

const NOTEBOOK_CONFIG = {
  DEPTH: 30,
  FONT_HAND: 'IndieFlower',
  PENCIL_DARK: '#2b2b2b',
  PENCIL_FAINT: '#777777',
  INK_RED: '#a92a2a',
  INK_BLUE: '#1e3d59',
  BACKGROUND_FRAME: 'notebook_bg',
  HIGHLIGHT: 0xfff2a8
};

const SCREEN_W = 1920;
const SCREEN_H = 1080;
const RESULT_X = 1040;
const RESULT_START_Y = 660;
const RESULT_STEP = 95;
const MAX_RESULTS = 3;
const MIN_TRAITS = 3;

const NO_MATCH_JOKES = [
  'Nobody in our files looks like that.\nAre you sure you drew a person and not a potato?',
  'The registry shrugged. Try fewer traits.',
  'Zero matches. Maybe your witness had a few drinks.',
  'Our database has never seen this person.\nNeither has anyone else. Suspicious.',
  'No results. The clerk is pretending to look busy.'
];

const WARRANT_JOKES = [
  'The judge signed it without reading. Efficiency!',
  'Warrant stamped. The coffee break can wait.',
  'Somewhere, a suspect just felt a chill.',
  'Paperwork done. The hard part is catching them.',
  'Signed, sealed, and slightly coffee-stained.'
];

// ─── Helpery ────────────────────────────────────────────────────────────────

function hashString(str) {
  let h = 2166136261 >>> 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// Deterministyczny PRNG: ręcznie rysowane kółka wyglądają tak samo przy każdym kliknięciu.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const up = (v) => String(v ?? '').trim().toUpperCase();

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class WarrantUI {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.gameState = null;
    this.autoCloseTimer = null;
    this.boundToggleHandler = this.onToggleKeyDown.bind(this);

    this._onEsc = () => this.close();
    this._onEnter = () => {
      if (this.isOpen && !this._issued && this.searchBtn?.visible) this._runSearch();
    };
    this._openKeysBound = false;

    this._searchTimers = [];
    this._searching = false;
    this._issued = false;

    this.traitButtons = [];
    this.traitValueTexts = [];
    this.traitMarks = new Map();
    this.resultObjects = [];
    this.sketchLayers = {};
    this.currentFilters = {
      gender: 0,
      race: 0,
      hair: 0,
      eyes: 0,
      accent: 0,
      features: 0
    };
    this.traitsData = {
      gender: ['NONE'],
      race: ['NONE'],
      hair: ['NONE'],
      eyes: ['NONE'],
      accent: ['NONE'],
      features: ['NONE']
    };

    this.initContainer();
    this.bindKeyboardShortcut();
  }

  // ─── Tweeny i dźwięk ──────────────────────────────────────────────────────

  _tween(config) {
    const s = this.scene;
    if (!s?.tweens) return null;
    return typeof s.createTrackedTween === 'function'
      ? s.createTrackedTween(config)
      : s.tweens.add(config);
  }

  _kill(target) {
    if (!target) return;
    const s = this.scene;
    if (typeof s?.killTrackedTweensOf === 'function') {
      s.killTrackedTweensOf(target);
    } else {
      s?.tweens?.killTweensOf(target);
    }
  }

  // Uwaga: gra bezpośrednio przez scene.sound. Jeśli AudioManager ma własne
  // wyciszanie/głośność SFX, warto tu podpiąć jego metodę.
  _sfx(key, volume = 0.5) {
    try {
      if (this.scene?.cache?.audio?.exists(key)) {
        this.scene.sound.play(key, { volume });
      }
    } catch (e) {
      // dźwięk nigdy nie powinien wywalać UI
    }
  }

  // ─── Budowa kontenera ─────────────────────────────────────────────────────

  initContainer() {
    const width = SCREEN_W;
    const height = SCREEN_H;

    this.container = this.scene.add.container(0, 0)
      .setDepth(NOTEBOOK_CONFIG.DEPTH)
      .setVisible(false);

    this.overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.6)
      .setOrigin(0)
      .setInteractive()
      .on('pointerdown', () => this.close());

    // Wszystko poza overlayem siedzi w bookGroup, żeby notes mógł "wjechać".
    this.bookGroup = this.scene.add.container(0, 0);

    let notebookBg;
    if (this.scene.textures.exists(NOTEBOOK_CONFIG.BACKGROUND_FRAME)) {
      notebookBg = this.scene.add.image(width / 2, height / 2, NOTEBOOK_CONFIG.BACKGROUND_FRAME);
      notebookBg.setInteractive();
    } else {
      notebookBg = this.scene.add.rectangle(width / 2, height / 2, 1800, 1000, 0xf4ebd9)
        .setStrokeStyle(4, 0xd3c4a9)
        .setInteractive();
    }

    const titleText = this.scene.add.text(width * 0.28, 90, '— SUSPECT SKETCH —', {
      fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
      fontSize: '38px',
      color: NOTEBOOK_CONFIG.PENCIL_DARK
    }).setOrigin(0.5);

    const closeBtn = this.scene.add.text(width * 0.85, 55, '[ X ]', {
      fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
      fontSize: '36px',
      color: NOTEBOOK_CONFIG.INK_RED
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => closeBtn.setColor('#ff0000'))
      .on('pointerout', () => closeBtn.setColor(NOTEBOOK_CONFIG.INK_RED))
      .on('pointerdown', () => this.close());

    this.bookGroup.add([notebookBg, titleText, closeBtn]);
    this.container.add([this.overlay, this.bookGroup]);

    this.initSketchArea();
    this.initSearchControls();
  }

  initSketchArea() {
    const centerX = 960;
    const centerY = 540;

    // '__DEFAULT' zamiast '' - bez ostrzeżeń o brakującej teksturze.
    this.sketchLayers.featureBack = this.scene.add.image(centerX, centerY, '__DEFAULT').setVisible(false);
    this.sketchLayers.base = this.createPencilLayer(centerX, centerY, 'sketch_base');
    this.sketchLayers.eyes = this.createPencilLayer(centerX, centerY, 'sketch_eyes');
    this.sketchLayers.hair = this.createPencilLayer(centerX, centerY, 'sketch_hair');
    this.sketchLayers.feature = this.scene.add.image(centerX, centerY, '__DEFAULT').setVisible(false);
    this.sketchLayers.accentFlag = this.scene.add.image(540, 930, '__DEFAULT').setVisible(false);

    // Podpis flagi: nazwa akcentu obok flagi
    this.accentLabel = this.scene.add.text(600, 930, '', {
      fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
      fontSize: '24px',
      color: NOTEBOOK_CONFIG.INK_BLUE
    }).setOrigin(0, 0.5).setVisible(false);

    this.bookGroup.add([
      this.sketchLayers.featureBack,
      this.sketchLayers.base,
      this.sketchLayers.eyes,
      this.sketchLayers.hair,
      this.sketchLayers.feature,
      this.sketchLayers.accentFlag,
      this.accentLabel
    ]);
  }

  createPencilLayer(x, y, key) {
    if (this.scene.textures.exists(key)) {
      return this.scene.add.image(x, y, key);
    }
    return this.scene.add.container(x, y);
  }

  ensureFlagTexture(accentKey) {
    const textureKey = `flag_gen_${accentKey}`;
    if (this.scene.textures.exists(textureKey)) {
      return textureKey;
    }

    const w = 90;
    const h = 56;
    const g = this.scene.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0x2b2b2b, 1);
    g.fillRect(0, 0, w, h);

    const x = 3;
    const y = 3;
    const fw = w - 6;
    const fh = h - 6;

    const drawStripes = (colors, isVertical = false) => {
      const size = isVertical ? fw / colors.length : fh / colors.length;
      colors.forEach((c, i) => {
        g.fillStyle(c, 1);
        if (isVertical) {
          g.fillRect(x + i * size, y, size, fh);
        } else {
          g.fillRect(x, y + i * size, fw, size);
        }
      });
    };

    const drawUnionJack = (bx, by, bw, bh) => {
      g.fillStyle(0x00247d, 1);
      g.fillRect(bx, by, bw, bh);
      g.fillStyle(0xffffff, 1);
      g.fillRect(bx + bw * 0.4, by, bw * 0.2, bh);
      g.fillRect(bx, by + bh * 0.4, bw, bh * 0.2);
      g.fillStyle(0xcf142b, 1);
      g.fillRect(bx + bw * 0.44, by, bw * 0.12, bh);
      g.fillRect(bx, by + bh * 0.44, bw, bh * 0.12);
    };

    let isValidFlag = true;

    switch (accentKey) {
      case 'AMERICAN':
        drawStripes([0xb22234, 0xffffff, 0xb22234, 0xffffff, 0xb22234, 0xffffff, 0xb22234], false);
        g.fillStyle(0x3c3b6e, 1);
        g.fillRect(x, y, fw * 0.45, fh * 0.55);
        break;
      case 'BRITISH':
        drawUnionJack(x, y, fw, fh);
        break;
      case 'AUSTRALIAN':
        g.fillStyle(0x00247d, 1);
        g.fillRect(x, y, fw, fh);
        drawUnionJack(x, y, fw * 0.5, fh * 0.5);
        break;
      case 'SCOTTISH':
        g.fillStyle(0x0065bf, 1);
        g.fillRect(x, y, fw, fh);
        g.lineStyle(6, 0xffffff, 1);
        g.lineBetween(x, y, x + fw, y + fh);
        g.lineBetween(x + fw, y, x, y + fh);
        break;
      case 'FRENCH':
        drawStripes([0x002395, 0xffffff, 0xed2939], true);
        break;
      case 'GERMAN':
        drawStripes([0x000000, 0xdd0000, 0xffce00], false);
        break;
      case 'SPANISH':
        drawStripes([0xaa152b, 0xf1bf00, 0xaa152b], false);
        break;
      case 'ITALIAN':
        drawStripes([0x009246, 0xffffff, 0xce2b37], true);
        break;
      case 'RUSSIAN':
        drawStripes([0xffffff, 0x0039a6, 0xd52b1e], false);
        break;
      case 'DUTCH':
        drawStripes([0xae1c28, 0xffffff, 0x21468b], false);
        break;
      case 'BELGIAN':
        drawStripes([0x000000, 0xfda510, 0xed2939], true);
        break;
      case 'BELARUSIAN':
      case 'BELARUSSIAN': // pisownia z suspects.json
        g.fillStyle(0xd22630, 1);
        g.fillRect(x, y, fw, fh * 0.66);
        g.fillStyle(0x009b48, 1);
        g.fillRect(x, y + fh * 0.66, fw, fh * 0.34);
        g.fillStyle(0xffffff, 1);
        g.fillRect(x, y, fw * 0.15, fh);
        g.fillStyle(0xd22630, 1);
        g.fillRect(x + fw * 0.04, y, fw * 0.07, fh);
        break;
      case 'CHINESE':
        g.fillStyle(0xde2910, 1);
        g.fillRect(x, y, fw, fh);
        break;
      case 'JAPANESE':
        g.fillStyle(0xffffff, 1);
        g.fillRect(x, y, fw, fh);
        g.fillStyle(0xbc002d, 1);
        g.fillCircle(x + fw / 2, y + fh / 2, fh * 0.3);
        break;
      case 'POLISH':
        drawStripes([0xffffff, 0xdc143c], false);
        break;
      case 'CANADIAN':
        drawStripes([0xff0000, 0xffffff, 0xff0000], true);
        break;
      case 'IRISH':
        drawStripes([0x169b62, 0xffffff, 0xff883e], true);
        break;
      case 'INDIAN':
        drawStripes([0xff9933, 0xffffff, 0x138808], false);
        break;
      case 'BRAZILIAN':
        g.fillStyle(0x009c3b, 1);
        g.fillRect(x, y, fw, fh);
        g.fillStyle(0xffdf00, 1);
        g.fillTriangle(x + fw / 2, y + 4, x + fw - 4, y + fh / 2, x + 4, y + fh / 2);
        g.fillTriangle(x + fw / 2, y + fh - 4, x + fw - 4, y + fh / 2, x + 4, y + fh / 2);
        break;
      case 'MEXICAN':
        drawStripes([0x006847, 0xffffff, 0xce1126], true);
        break;
      default:
        isValidFlag = false;
        break;
    }

    if (!isValidFlag) {
      g.destroy();
      return null;
    }

    g.generateTexture(textureKey, w, h);
    g.destroy();
    return textureKey;
  }

  // ─── Kontrolki wyszukiwania ───────────────────────────────────────────────

  initSearchControls() {
    const startX = RESULT_X;

    this.statusText = this.scene.add.text(startX, 150, 'Select at least 3 traits to query registry...', {
      fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
      fontSize: '24px',
      color: '#555555'
    });

    // Odręczne podkreślenie postępu pod statusem (3 cechy = pełna kreska)
    this.progressGfx = this.scene.add.graphics();

    this.searchBtn = this.scene.add.text(startX, 200, '✒ SEARCH', {
      fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
      fontSize: '28px',
      color: NOTEBOOK_CONFIG.INK_BLUE,
      backgroundColor: '#eae3d2',
      padding: { x: 16, y: 6 }
    })
      .setInteractive({ useHandCursor: true })
      .setVisible(false);

    this.searchBtn.on('pointerover', () => this.searchBtn.setBackgroundColor('#dbcfa9'));
    this.searchBtn.on('pointerout', () => this.searchBtn.setBackgroundColor('#eae3d2'));
    this.searchBtn.on('pointerdown', () => this._runSearch());

    this.resetBtn = this.scene.add.text(startX + 180, 200, '✖ RESET', {
      fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
      fontSize: '28px',
      color: NOTEBOOK_CONFIG.INK_RED,
      backgroundColor: '#eae3d2',
      padding: { x: 16, y: 6 }
    })
      .setInteractive({ useHandCursor: true });

    this.resetBtn.on('pointerover', () => this.resetBtn.setBackgroundColor('#dbcfa9'));
    this.resetBtn.on('pointerout', () => this.resetBtn.setBackgroundColor('#eae3d2'));
    this.resetBtn.on('pointerdown', () => this.resetFilters());

    this.bookGroup.add([this.statusText, this.progressGfx, this.searchBtn, this.resetBtn]);
  }

  _runSearch() {
    if (!this.isOpen || this._searching || this._issued) return;
    const suspectsData = this.scene.cache.json.get('suspects') || [];
    this.executeSearch(suspectsData);
  }

  _updateProgress(count) {
    const g = this.progressGfx;
    if (!g) return;

    g.clear();
    if (count <= 0) return;

    const ratio = Math.min(count, MIN_TRAITS) / MIN_TRAITS;
    const len = 300 * ratio;
    const ready = count >= MIN_TRAITS;

    g.lineStyle(4, ready ? 0xa92a2a : 0x1e3d59, 0.7);
    g.beginPath();
    for (let px = 0; px <= len; px += 6) {
      const py = 190 + Math.sin(px * 0.09) * 1.6;
      if (px === 0) g.moveTo(RESULT_X + px, py);
      else g.lineTo(RESULT_X + px, py);
    }
    g.strokePath();
  }

  resetFilters() {
    this._cancelSearchTimers();
    if (this._issued) return;

    this.currentFilters = {
      gender: 0,
      race: 0,
      hair: 0,
      eyes: 0,
      accent: 0,
      features: 0
    };

    this.traitValueTexts.forEach(({ key, textObj }) => {
      textObj.setText(this._traitLabel(key));
      this._drawTraitMark(key);
    });

    this.clearResults();
    this.updateStatusText();
    this.updateIdentokitVisuals();
    this._sfx('paper_rustle', 0.3);
  }

  // ─── Szkic ────────────────────────────────────────────────────────────────

  // Krótki "przeskok kredki" na warstwie, która się zmieniła.
  _pop(obj) {
    if (!obj?.scene || obj.visible === false) return;
    this._kill(obj);
    obj.setAlpha(0.55);
    obj.setScale(0.985);
    this._tween({ targets: obj, alpha: 1, scale: 1, duration: 180, ease: 'Sine.easeOut' });
  }

  _popForTrait(key) {
    switch (key) {
      case 'race': this._pop(this.sketchLayers.base); break;
      case 'eyes': this._pop(this.sketchLayers.eyes); break;
      case 'hair': this._pop(this.sketchLayers.hair); break;
      case 'features':
        this._pop(this.sketchLayers.feature);
        this._pop(this.sketchLayers.featureBack);
        break;
      case 'accent': this._pop(this.sketchLayers.accentFlag); break;
      default: break;
    }
  }

  updateIdentokitVisuals(changedKey = null) {
    const selectedRace = this.traitsData.race?.[this.currentFilters.race] || 'NONE';
    const selectedEyes = this.traitsData.eyes?.[this.currentFilters.eyes] || 'NONE';
    const selectedHair = this.traitsData.hair?.[this.currentFilters.hair] || 'NONE';
    const selectedFeature = this.traitsData.features?.[this.currentFilters.features] || 'NONE';
    const selectedAccent = this.traitsData.accent?.[this.currentFilters.accent] || 'NONE';

    const featureUpper = up(selectedFeature);
    const accentUpper = up(selectedAccent);
    const hairTint = PENCIL_COLORS.hair[up(selectedHair)] || PENCIL_COLORS.hair.NONE;

    const skinTint = PENCIL_COLORS.skin[up(selectedRace)] || PENCIL_COLORS.skin.NONE;
    if (typeof this.sketchLayers.base.setTint === 'function') {
      this.sketchLayers.base.setTint(skinTint);
    }

    const eyeTint = PENCIL_COLORS.eyes[up(selectedEyes)] || PENCIL_COLORS.eyes.NONE;
    if (typeof this.sketchLayers.eyes.setTint === 'function') {
      this.sketchLayers.eyes.setTint(eyeTint);
    }

    const hidesBaseHair = HAIR_OVERRIDE_FEATURES.includes(featureUpper);
    if (typeof this.sketchLayers.hair.setVisible === 'function') {
      if (hidesBaseHair) {
        this.sketchLayers.hair.setVisible(false);
      } else {
        this.sketchLayers.hair.setVisible(true);
        if (typeof this.sketchLayers.hair.setTint === 'function') {
          this.sketchLayers.hair.setTint(hairTint);
        }
      }
    }

    const featureTextureKey = FEATURE_TEXTURES[featureUpper];

    if (featureTextureKey && this.scene.textures.exists(featureTextureKey)) {
      const isHairColor = HAIR_COLORED_FEATURES.includes(featureUpper);

      if (featureUpper === 'LONG HAIR') {
        this.sketchLayers.feature.setVisible(false);
        this.sketchLayers.featureBack
          .setTexture(featureTextureKey)
          .setVisible(true);

        if (typeof this.sketchLayers.featureBack.setTint === 'function') {
          this.sketchLayers.featureBack.setTint(hairTint);
        }
      } else {
        this.sketchLayers.featureBack.setVisible(false);
        this.sketchLayers.feature
          .setTexture(featureTextureKey)
          .setVisible(true);

        if (isHairColor) {
          if (typeof this.sketchLayers.feature.setTint === 'function') {
            this.sketchLayers.feature.setTint(hairTint);
          }
        } else if (typeof this.sketchLayers.feature.clearTint === 'function') {
          this.sketchLayers.feature.clearTint();
        }
      }
    } else {
      this.sketchLayers.feature.setVisible(false);
      this.sketchLayers.featureBack.setVisible(false);
    }

    const flagTextureKey = this.ensureFlagTexture(accentUpper);
    if (flagTextureKey) {
      this.sketchLayers.accentFlag
        .setTexture(flagTextureKey)
        .setVisible(true);
    } else {
      this.sketchLayers.accentFlag.setVisible(false);
    }

    // Podpis przy fladze (także dla akcentów bez zdefiniowanej flagi)
    if (this.currentFilters.accent > 0) {
      this.accentLabel.setText(String(selectedAccent)).setVisible(true);
    } else {
      this.accentLabel.setVisible(false);
    }

    if (changedKey) this._popForTrait(changedKey);
  }

  // ─── Selektory cech ───────────────────────────────────────────────────────

  _traitLabel(key) {
    const v = this.traitsData[key]?.[this.currentFilters[key]] ?? 'NONE';
    return v === 'NONE' ? '— any —' : String(v);
  }

  // Odręcznie "zakreślona" wybrana wartość.
  _drawTraitMark(key) {
    const mark = this.traitMarks.get(key);
    if (!mark?.gfx?.scene) return;

    const { gfx } = mark;
    this._kill(gfx);
    gfx.clear();

    const idx = this.currentFilters[key];
    if (idx <= 0) return;

    const rng = mulberry32(hashString(`${key}:${idx}`));
    const rx = 128;
    const ry = 21;
    const steps = 44;

    gfx.lineStyle(3, 0xa92a2a, 0.7);
    gfx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = -0.4 + t * Math.PI * 2 * 1.07; // lekki "overshoot" jak przy zakreślaniu długopisem
      const j = 1 + (rng() - 0.5) * 0.06;
      const px = Math.cos(a) * rx * j;
      const py = Math.sin(a) * ry * j;
      if (i === 0) gfx.moveTo(px, py);
      else gfx.lineTo(px, py);
    }
    gfx.strokePath();

    gfx.setScale(0.8, 1).setAlpha(0);
    this._tween({ targets: gfx, scaleX: 1, alpha: 1, duration: 160, ease: 'Sine.easeOut' });
  }

  buildTraitSelectors() {
    const fields = [
      ['gender', 'Gender'],
      ['race', 'Race / Skin'],
      ['hair', 'Hair'],
      ['eyes', 'Eyes'],
      ['accent', 'Accent'],
      ['features', 'Features']
    ];

    const startX = RESULT_X;
    const startY = 280;
    const rowGap = 55;

    this.traitValueTexts = [];
    this.traitMarks.clear();

    fields.forEach(([key, label], index) => {
      const y = startY + index * rowGap;

      const markGfx = this.scene.add.graphics().setPosition(startX + 350, y);
      this.traitMarks.set(key, { gfx: markGfx });

      const labelTxt = this.scene.add.text(startX, y, `${label}:`, {
        fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
        fontSize: '26px',
        color: NOTEBOOK_CONFIG.PENCIL_DARK
      }).setOrigin(0, 0.5);

      const valTxt = this.scene.add.text(startX + 220, y, this._traitLabel(key), {
        fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
        fontSize: '24px',
        color: NOTEBOOK_CONFIG.INK_BLUE,
        padding: { x: 4, y: 2 },
        fixedWidth: 260,
        align: 'center'
      }).setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true });

      // Klik w wartość = następna opcja
      valTxt.on('pointerdown', () => this.stepTrait(key, 1, valTxt));

      const leftBtn = this.makeArrow(startX + 180, y, '◄', () => this.stepTrait(key, -1, valTxt));
      const rightBtn = this.makeArrow(startX + 500, y, '►', () => this.stepTrait(key, 1, valTxt));

      this.bookGroup.add([markGfx, labelTxt, leftBtn, valTxt, rightBtn]);
      this.traitButtons.push(markGfx, labelTxt, leftBtn, valTxt, rightBtn);
      this.traitValueTexts.push({ key, textObj: valTxt });
    });
  }

  makeArrow(x, y, symbol, callback) {
    const arrow = this.scene.add.text(x, y, symbol, {
      fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
      fontSize: '26px',
      color: NOTEBOOK_CONFIG.PENCIL_DARK
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    arrow.on('pointerover', () => arrow.setColor(NOTEBOOK_CONFIG.INK_RED));
    arrow.on('pointerout', () => arrow.setColor(NOTEBOOK_CONFIG.PENCIL_DARK));
    arrow.on('pointerdown', () => {
      this._kill(arrow);
      arrow.setScale(1.35);
      this._tween({ targets: arrow, scale: 1, duration: 140, ease: 'Back.easeOut' });
      callback();
    });

    return arrow;
  }

  stepTrait(key, direction, valueText) {
    if (!this.isOpen || this._issued) return;

    this._cancelSearchTimers();

    const list = this.traitsData[key];
    this.currentFilters[key] = (this.currentFilters[key] + direction + list.length) % list.length;

    valueText.setText(this._traitLabel(key));
    this._kill(valueText);
    valueText.setScale(1.1);
    this._tween({ targets: valueText, scale: 1, duration: 120, ease: 'Sine.easeOut' });

    this._drawTraitMark(key);
    this.clearResults();
    this.updateStatusText();
    this.updateIdentokitVisuals(key);
    this._sfx('click_sound', 0.25);
  }

  updateStatusText() {
    const count = Object.values(this.currentFilters).filter(v => v > 0).length;
    const hasEnoughTraits = count >= MIN_TRAITS;

    this.statusText.setText(
      hasEnoughTraits
        ? `Traits selected: ${count} (Ready to search)`
        : `Traits selected: ${count} (At least 3 traits required)`
    );
    this.statusText.setColor(hasEnoughTraits ? NOTEBOOK_CONFIG.PENCIL_DARK : NOTEBOOK_CONFIG.PENCIL_FAINT);
    this.searchBtn.setVisible(hasEnoughTraits && !this._issued);
    this._updateProgress(count);
  }

  // ─── Otwieranie / zamykanie ───────────────────────────────────────────────

  open(gameState) {
    if (this.isOpen) return;

    const suspectsData = this.scene.cache.json.get('suspects');
    if (!Array.isArray(suspectsData) || suspectsData.length === 0) return;

    this.isOpen = true;
    this._issued = false;
    this._searching = false;
    EventBus.emit('hideHUD');
    this.gameState = gameState || this.gameState;

    this.clearAutoCloseTimer();
    this._cancelSearchTimers();
    this.clearTraitSelectors();
    this.clearResults();

    this.container.setVisible(true);

    this.traitsData = {
      gender: this.getUniqueValues(suspectsData, 'gender'),
      race: this.getUniqueValues(suspectsData, 'race'),
      hair: this.getUniqueValues(suspectsData, 'hair'),
      eyes: this.getUniqueValues(suspectsData, 'eyes'),
      accent: this.getUniqueValues(suspectsData, 'accent'),
      features: this.getUniqueValues(suspectsData, 'features')
    };

    this.currentFilters = {
      gender: 0,
      race: 0,
      hair: 0,
      eyes: 0,
      accent: 0,
      features: 0
    };

    this.buildTraitSelectors();
    this.updateStatusText();
    this.updateIdentokitVisuals();
    this._bindOpenKeys();

    // Notes "wjeżdża" na biurko
    this._kill(this.overlay);
    this._kill(this.bookGroup);
    this.overlay.setAlpha(0);
    this.bookGroup.setAlpha(0).setY(50);

    this._tween({ targets: this.overlay, alpha: 1, duration: 160 });
    this._tween({ targets: this.bookGroup, alpha: 1, y: 0, duration: 260, ease: 'Cubic.easeOut' });
    this._sfx('paper_rustle', 0.4);
  }

  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this._searching = false;
    this.clearAutoCloseTimer();
    this._cancelSearchTimers();
    this._unbindOpenKeys();
    EventBus.emit('showHUD');

    const finish = () => {
      // Jeśli w międzyczasie ktoś otworzył UI ponownie, nie ruszamy go.
      if (this.isOpen || !this.container?.scene) return;
      this.clearTraitSelectors();
      this.clearResults();
      this.container.setVisible(false);
    };

    this._kill(this.overlay);
    this._kill(this.bookGroup);

    this._tween({ targets: this.overlay, alpha: 0, duration: 140 });
    const t = this._tween({
      targets: this.bookGroup,
      alpha: 0,
      y: 30,
      duration: 140,
      ease: 'Cubic.easeIn',
      onComplete: finish
    });

    if (!t) finish();
  }

  clearTraitSelectors() {
    this.traitButtons.forEach(obj => {
      this._kill(obj);
      obj.destroy();
    });
    this.traitButtons = [];
    this.traitValueTexts = [];
    this.traitMarks.clear();
  }

  clearResults() {
    this.resultObjects.forEach(obj => {
      this._kill(obj);
      obj.destroy();
    });
    this.resultObjects = [];
  }

  clearAutoCloseTimer() {
    if (this.autoCloseTimer) {
      this.autoCloseTimer.remove(false);
      this.autoCloseTimer = null;
    }
  }

  _cancelSearchTimers() {
    this._searchTimers.forEach(t => t?.remove?.(false));
    this._searchTimers = [];
    this._searching = false;
  }

  // ─── Dane ─────────────────────────────────────────────────────────────────

  getUniqueValues(suspects, key) {
    const values = suspects.flatMap(suspect => {
      const value = suspect?.[key];

      if (Array.isArray(value)) {
        return value.filter(Boolean).map(v => String(v).trim());
      }

      if (typeof value === 'string' && value.trim()) {
        return [value.trim()];
      }

      return [];
    });

    const unique = [...new Set(values)];
    return ['NONE', ...unique];
  }

  // ─── Wyszukiwanie ─────────────────────────────────────────────────────────

  executeSearch(suspectsData) {
    this._cancelSearchTimers();
    this.clearResults();

    this._searching = true;
    this._sfx('paper_rustle', 0.35);

    const base = 'Searching criminal records';
    let dots = 0;
    this.statusText.setText(base).setColor(NOTEBOOK_CONFIG.INK_BLUE);

    const ticker = this.scene.time.addEvent({
      delay: 260,
      loop: true,
      callback: () => {
        dots = (dots + 1) % 4;
        this.statusText.setText(base + '.'.repeat(dots));
      }
    });

    // Chwila "przeszukiwania akt" - bez niej wynik wyskakuje zbyt sucho.
    const finish = this.scene.time.delayedCall(900, () => {
      ticker.remove(false);
      this._searching = false;
      if (!this.isOpen) return;

      const matches = suspectsData.filter(suspect => {
        return Object.keys(this.currentFilters).every(key => {
          const idx = this.currentFilters[key];
          if (idx <= 0) return true;

          const selectedValue = up(this.traitsData[key][idx]);
          const suspectValue = suspect?.[key];

          if (Array.isArray(suspectValue)) {
            return suspectValue.some(v => up(v) === selectedValue);
          }

          return up(suspectValue) === selectedValue;
        });
      });

      this.displayResults(matches);
    });

    this._searchTimers.push(ticker, finish);
  }

  displayResults(matches) {
    this.clearResults();

    if (!matches.length) {
      this._sfx('wrong', 0.35);

      const noMatch = this.scene.add.text(RESULT_X, RESULT_START_Y + 20, '✖ NO MATCHES FOUND IN DATABASE', {
        fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
        fontSize: '28px',
        color: NOTEBOOK_CONFIG.INK_RED
      });

      const joke = this.scene.add.text(RESULT_X, RESULT_START_Y + 66, pickRandom(NO_MATCH_JOKES), {
        fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
        fontSize: '22px',
        color: NOTEBOOK_CONFIG.PENCIL_FAINT,
        wordWrap: { width: 540 },
        lineSpacing: 4
      });

      [noMatch, joke].forEach((obj, i) => {
        obj.setAlpha(0);
        this._tween({ targets: obj, alpha: 1, duration: 220, delay: i * 150 });
      });

      this.bookGroup.add([noMatch, joke]);
      this.resultObjects.push(noMatch, joke);
      this.statusText.setText('SEARCH COMPLETED (0 MATCHES)');
      this.statusText.setColor(NOTEBOOK_CONFIG.INK_RED);
      return;
    }

    this._sfx('correct', 0.3);
    this.statusText.setText(`MATCHING SUSPECTS: ${matches.length}`);
    this.statusText.setColor(NOTEBOOK_CONFIG.PENCIL_DARK);

    matches.slice(0, MAX_RESULTS).forEach((suspect, index) => {
      const y = RESULT_START_Y + index * RESULT_STEP;
      const card = this._buildResultCard(suspect, y);

      card.setAlpha(0).setX(40);
      this._tween({
        targets: card,
        alpha: 1,
        x: 0,
        duration: 260,
        delay: index * 130,
        ease: 'Cubic.easeOut'
      });

      this.bookGroup.add(card);
      this.resultObjects.push(card);
    });

    if (matches.length > MAX_RESULTS) {
      const more = this.scene.add.text(
        RESULT_X,
        RESULT_START_Y + MAX_RESULTS * RESULT_STEP,
        `+${matches.length - MAX_RESULTS} more fit this sketch. Add a trait to narrow it down.`,
        {
          fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
          fontSize: '20px',
          color: NOTEBOOK_CONFIG.PENCIL_FAINT
        }
      );
      this.bookGroup.add(more);
      this.resultObjects.push(more);
    }
  }

  _buildResultCard(suspect, y) {
    const card = this.scene.add.container(0, 0);

    // Podświetlenie "zakreślaczem" po najechaniu
    const highlight = this.scene.add.rectangle(RESULT_X - 8, y - 14, 560, 88, NOTEBOOK_CONFIG.HIGHLIGHT, 0)
      .setOrigin(0)
      .setInteractive();
    highlight.on('pointerover', () => highlight.setFillStyle(NOTEBOOK_CONFIG.HIGHLIGHT, 0.45));
    highlight.on('pointerout', () => highlight.setFillStyle(NOTEBOOK_CONFIG.HIGHLIGHT, 0));

    const line = this.scene.add.line(0, 0, RESULT_X, y - 10, RESULT_X + 520, y - 10, 0xa92a2a, 0.4)
      .setOrigin(0);

    // Polaroid ze zdjęciem
    const portraitKey = [suspect?.portraitKey, suspect?.imageKey, suspect?.spriteKey, suspect?.photoKey, suspect?.suspectImageKey]
      .find(k => k && this.scene.textures.exists(k)) || (this.scene.textures.exists('unknown') ? 'unknown' : null);

    const frame = this.scene.add.rectangle(RESULT_X + 35, y + 26, 68, 76, 0xffffff)
      .setStrokeStyle(1, 0xcccccc)
      .setAngle(-3);

    const portrait = portraitKey
      ? this.scene.add.image(RESULT_X + 35, y + 22, portraitKey).setDisplaySize(56, 56).setAngle(-3)
      : this.scene.add.text(RESULT_X + 10, y + 10, '[PHOTO]', {
          fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
          fontSize: '20px',
          color: '#888888'
        });

    const tape = this.scene.add.rectangle(RESULT_X + 35, y - 10, 34, 12, 0xe8dca0, 0.8).setAngle(4);

    const resultName = this.scene.add.text(RESULT_X + 90, y, suspect?.name || 'UNKNOWN SUSPECT', {
      fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
      fontSize: '26px',
      color: NOTEBOOK_CONFIG.PENCIL_DARK
    });

    const details = [
      suspect?.gender || 'Unknown gender',
      `${suspect?.hair || 'Unknown'} hair`,
      suspect?.features || null,
      `${suspect?.accent || 'Unknown'} accent`
    ].filter(Boolean).join(', ');

    const resultDetails = this.scene.add.text(RESULT_X + 90, y + 30, details, {
      fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
      fontSize: '19px',
      color: '#666666',
      wordWrap: { width: 340 },
      lineSpacing: 2
    });

    const actionTxt = this.scene.add.text(RESULT_X + 440, y + 12, '[ ISSUE ]', {
      fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
      fontSize: '22px',
      color: NOTEBOOK_CONFIG.INK_RED
    })
      .setInteractive({ useHandCursor: true });

    actionTxt.on('pointerover', () => {
      actionTxt.setColor('#ff0000');
      highlight.setFillStyle(NOTEBOOK_CONFIG.HIGHLIGHT, 0.45);
    });
    actionTxt.on('pointerout', () => actionTxt.setColor(NOTEBOOK_CONFIG.INK_RED));
    actionTxt.on('pointerdown', () => this.issueWarrant(suspect));

    card.add([highlight, line, frame, portrait, tape, resultName, resultDetails, actionTxt]);
    return card;
  }

  // ─── Nakaz aresztowania ───────────────────────────────────────────────────

  issueWarrant(suspect) {
    if (this._issued || !suspect) return;

    const state = this.gameState || this.scene.gameState || globalGameState;
    if (!state) return;

    this._issued = true;
    this._cancelSearchTimers();

    state.arrestWarrantIssued = true;
    state.warrantSuspectName = suspect?.name ?? null;
    state.warrantSuspectId = suspect?.id ?? null;
    saveGameState();

    this.clearAutoCloseTimer();
    this.clearResults();
    this.searchBtn.setVisible(false);
    this.resetBtn.setVisible(false);
    this.statusText.setText('');
    this.progressGfx.clear();

    this._buildWarrantDocument(suspect);

    this.autoCloseTimer = this.scene.time.delayedCall(4200, () => this.close());
  }

  _buildWarrantDocument(suspect) {
    const docW = 900;
    const docH = 450;
    const cx = SCREEN_W / 2;
    const cy = SCREEN_H / 2;

    const doc = this.scene.add.container(0, 0);

    const posterKey = `wanted_${suspect.id}`;
    const hasPoster = suspect.id && this.scene.textures.exists(posterKey);
    const textCx = hasPoster ? 1110 : cx;

    const bg = this.scene.add.rectangle(cx, cy, docW, docH, 0xfbf6e6, 0.98)
      .setStrokeStyle(6, 0xa92a2a)
      .setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => this.close());

    const inner = this.scene.add.graphics();
    inner.lineStyle(1, 0xa92a2a, 0.4);
    inner.strokeRect(cx - docW / 2 + 12, cy - docH / 2 + 12, docW - 24, docH - 24);

    const tapeA = this.scene.add.rectangle(cx - docW / 2 + 40, cy - docH / 2 + 4, 80, 22, 0xe8dca0, 0.8).setAngle(-18);
    const tapeB = this.scene.add.rectangle(cx + docW / 2 - 40, cy - docH / 2 + 4, 80, 22, 0xe8dca0, 0.8).setAngle(14);

    doc.add([bg, inner, tapeA, tapeB]);

    // Plakat WANTED (jeśli jest w assetach)
    if (hasPoster) {
      const posterFrame = this.scene.add.rectangle(672, 548, 250, 340, 0xffffff)
        .setStrokeStyle(2, 0xcccccc)
        .setAngle(-3);
      const poster = this.scene.add.image(672, 548, posterKey);
      const scale = Math.min(230 / poster.width, 320 / poster.height);
      poster.setScale(scale).setAngle(-3);
      const posterTape = this.scene.add.rectangle(672, 380, 60, 18, 0xe8dca0, 0.85).setAngle(3);
      doc.add([posterFrame, poster, posterTape]);
    }

    const caseNo = String(1000 + (hashString(suspect.id || suspect.name) % 9000));

    const title = this.scene.add.text(textCx, 392, '★ ARREST WARRANT ★', {
      fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
      fontSize: '46px',
      color: NOTEBOOK_CONFIG.INK_RED
    }).setOrigin(0.5);

    const sub = this.scene.add.text(textCx, 442, `BY ORDER OF THE COURT  ·  No. ${caseNo}`, {
      fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
      fontSize: '20px',
      color: NOTEBOOK_CONFIG.PENCIL_FAINT
    }).setOrigin(0.5);

    const label = this.scene.add.text(textCx, 484, 'THE BEARER IS AUTHORISED TO ARREST', {
      fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
      fontSize: '22px',
      color: NOTEBOOK_CONFIG.PENCIL_DARK
    }).setOrigin(0.5);

    const nameText = this.scene.add.text(textCx, 540, String(suspect.name || 'UNKNOWN').toUpperCase(), {
      fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
      fontSize: '42px',
      color: NOTEBOOK_CONFIG.PENCIL_DARK
    }).setOrigin(0.5);
    if (nameText.width > 520) nameText.setScale(520 / nameText.width);

    const joke = this.scene.add.text(textCx, 655, pickRandom(WARRANT_JOKES), {
      fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
      fontSize: '22px',
      color: NOTEBOOK_CONFIG.PENCIL_FAINT,
      align: 'center',
      wordWrap: { width: 500 }
    }).setOrigin(0.5);

    doc.add([title, sub, label, nameText, joke]);

    // Pieczątka ISSUED - "trzask" na nazwisku
    const stamp = this.scene.add.container(textCx + 70, 548);
    const stampG = this.scene.add.graphics();
    stampG.lineStyle(6, 0xa92a2a, 1);
    stampG.strokeRect(-135, -44, 270, 88);
    stampG.lineStyle(2, 0xa92a2a, 1);
    stampG.strokeRect(-127, -36, 254, 72);
    const stampText = this.scene.add.text(0, 0, 'ISSUED', {
      fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
      fontSize: '60px',
      color: NOTEBOOK_CONFIG.INK_RED
    }).setOrigin(0.5);
    stamp.add([stampG, stampText]);
    stamp.setAngle(-12).setScale(3).setAlpha(0);
    doc.add(stamp);

    this.bookGroup.add(doc);
    this.resultObjects.push(doc);

    // Wejście dokumentu
    doc.setAlpha(0).setY(30);
    this._tween({ targets: doc, alpha: 1, y: 0, duration: 260, ease: 'Cubic.easeOut' });
    this._sfx('paper_rustle', 0.45);

    // Trzask pieczątki
    this._tween({
      targets: stamp,
      scale: 1,
      alpha: 0.92,
      duration: 220,
      delay: 520,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        if (!this.isOpen) return;
        this.scene.cameras.main.shake(120, 0.006);
        this._sfx('correct', 0.5);
      }
    });
  }

  // ─── Klawiatura ───────────────────────────────────────────────────────────

  _bindOpenKeys() {
    const kb = this.scene.input?.keyboard;
    if (!kb || this._openKeysBound) return;
    kb.on('keydown-ESC', this._onEsc);
    kb.on('keydown-ENTER', this._onEnter);
    this._openKeysBound = true;
  }

  _unbindOpenKeys() {
    if (!this._openKeysBound) return;
    const kb = this.scene.input?.keyboard;
    kb?.off('keydown-ESC', this._onEsc);
    kb?.off('keydown-ENTER', this._onEnter);
    this._openKeysBound = false;
  }

  bindKeyboardShortcut() {
    if (!this.scene.input?.keyboard) return;

    this.scene.input.keyboard.addCapture('W');
    this.scene.input.keyboard.on('keydown-W', this.boundToggleHandler);
  }

  onToggleKeyDown(e) {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    e.preventDefault();

    if (this.isOpen) {
      this.close();
    } else {
      this.open(this.gameState || this.scene.gameState);
    }
  }

  // ─── Sprzątanie ───────────────────────────────────────────────────────────

  destroy() {
    // HUD przywracamy tylko, jeśli UI faktycznie go schowało i nie zamknęło się wcześniej.
    if (this.isOpen) EventBus.emit('showHUD');
    this.isOpen = false;

    this.clearAutoCloseTimer();
    this._cancelSearchTimers();
    this._unbindOpenKeys();

    const kb = this.scene.input?.keyboard;
    if (kb) {
      kb.off('keydown-W', this.boundToggleHandler);
      kb.removeCapture('W');
    }

    this.clearTraitSelectors();
    this.clearResults();

    [this.overlay, this.bookGroup, ...Object.values(this.sketchLayers)].forEach(o => this._kill(o));

    this.container?.destroy(true);
    this.container = null;
    this.overlay = null;
    this.bookGroup = null;
  }
}