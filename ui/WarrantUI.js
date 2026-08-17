import { saveGameState } from '../GameStatePersistence.js';
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

// Mapowanie cech z danych na klucze załadowanych grafik
const FEATURE_TEXTURES = {
  BEARD: 'beard',
  'BIG FOREHEAD': 'big_forhead',
  EARRINGS: 'earings',
  GLASSES: 'glasses',
  GOATEE: 'gotee',
  'LONG HAIR': 'long_hair',
  MOUSTACHE: 'moustache',
  NECKLACE: 'neckles',
  'RAINBOW STREAK': 'rainbow_streak',
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
  INK_RED: '#a92a2a',
  INK_BLUE: '#1e3d59',
  BACKGROUND_FRAME: 'notebook_bg'
};

export class WarrantUI {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.gameState = null;
    this.autoCloseTimer = null;
    this.boundToggleHandler = this.onToggleKeyDown.bind(this);

    this.traitButtons = [];
    this.traitValueTexts = [];
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

  initContainer() {
    const width = 1920;
    const height = 1080;

    this.container = this.scene.add.container(0, 0)
      .setDepth(NOTEBOOK_CONFIG.DEPTH)
      .setVisible(false);

    const overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.6)
      .setOrigin(0)
      .setInteractive()
      .on('pointerdown', () => this.close());

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
      .on('pointerdown', () => this.close());

    this.container.add([overlay, notebookBg, titleText, closeBtn]);

    this.initSketchArea();
    this.initSearchControls();
  }

  initSketchArea() {
    const centerX = 960;
    const centerY = 540;

    this.sketchLayers.featureBack = this.scene.add.image(centerX, centerY, '').setVisible(false);
    this.sketchLayers.base = this.createPencilLayer(centerX, centerY, 'sketch_base');
    this.sketchLayers.eyes = this.createPencilLayer(centerX, centerY, 'sketch_eyes');
    this.sketchLayers.hair = this.createPencilLayer(centerX, centerY, 'sketch_hair');
    this.sketchLayers.feature = this.scene.add.image(centerX, centerY, '').setVisible(false);
    this.sketchLayers.accentFlag = this.scene.add.image(540, 930, '').setVisible(false);

    this.container.add([
      this.sketchLayers.featureBack,
      this.sketchLayers.base,
      this.sketchLayers.eyes,
      this.sketchLayers.hair,
      this.sketchLayers.feature,
      this.sketchLayers.accentFlag
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

  initSearchControls() {
    const startX = 1040;

    this.statusText = this.scene.add.text(startX, 150, 'Select at least 3 traits to query registry...', {
      fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
      fontSize: '24px',
      color: '#555555'
    });

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
    this.searchBtn.on('pointerdown', () => {
      const suspectsData = this.scene.cache.json.get('suspects') || [];
      this.executeSearch(suspectsData);
    });

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

    this.container.add([this.statusText, this.searchBtn, this.resetBtn]);
  }

  resetFilters() {
    this.currentFilters = {
      gender: 0,
      race: 0,
      hair: 0,
      eyes: 0,
      accent: 0,
      features: 0
    };

    this.traitValueTexts.forEach(({ key, textObj }) => {
      textObj.setText(this.traitsData[key][0]);
    });

    this.clearResults();
    this.updateStatusText();
    this.updateIdentokitVisuals();
  }

  updateIdentokitVisuals() {
    const selectedRace = this.traitsData.race?.[this.currentFilters.race] || 'NONE';
    const selectedEyes = this.traitsData.eyes?.[this.currentFilters.eyes] || 'NONE';
    const selectedHair = this.traitsData.hair?.[this.currentFilters.hair] || 'NONE';
    const selectedFeature = this.traitsData.features?.[this.currentFilters.features] || 'NONE';
    const selectedAccent = this.traitsData.accent?.[this.currentFilters.accent] || 'NONE';

    const featureUpper = String(selectedFeature).toUpperCase();
    const accentUpper = String(selectedAccent).toUpperCase();
    const hairTint = PENCIL_COLORS.hair[String(selectedHair).toUpperCase()] || PENCIL_COLORS.hair.NONE;

    const skinTint = PENCIL_COLORS.skin[String(selectedRace).toUpperCase()] || PENCIL_COLORS.skin.NONE;
    if (typeof this.sketchLayers.base.setTint === 'function') {
      this.sketchLayers.base.setTint(skinTint);
    }

    const eyeTint = PENCIL_COLORS.eyes[String(selectedEyes).toUpperCase()] || PENCIL_COLORS.eyes.NONE;
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

    const startX = 1040;
    const startY = 280;
    const rowGap = 55;

    this.traitValueTexts = [];

    fields.forEach(([key, label], index) => {
      const y = startY + index * rowGap;

      const labelTxt = this.scene.add.text(startX, y, `${label}:`, {
        fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
        fontSize: '26px',
        color: NOTEBOOK_CONFIG.PENCIL_DARK
      }).setOrigin(0, 0.5);

      const valTxt = this.scene.add.text(startX + 220, y, this.traitsData[key][0], {
        fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
        fontSize: '24px',
        color: NOTEBOOK_CONFIG.INK_BLUE,
        padding: { x: 4, y: 2 },
        fixedWidth: 260,
        align: 'center'
      }).setOrigin(0, 0.5);

      const leftBtn = this.makeArrow(startX + 180, y, '◄', () => this.stepTrait(key, -1, valTxt));
      const rightBtn = this.makeArrow(startX + 500, y, '►', () => this.stepTrait(key, 1, valTxt));

      this.container.add([labelTxt, leftBtn, valTxt, rightBtn]);
      this.traitButtons.push(labelTxt, leftBtn, valTxt, rightBtn);
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
    arrow.on('pointerdown', callback);

    return arrow;
  }

  stepTrait(key, direction, valueText) {
    if (!this.isOpen) return;

    const list = this.traitsData[key];
    this.currentFilters[key] = (this.currentFilters[key] + direction + list.length) % list.length;

    valueText.setText(list[this.currentFilters[key]]);

    this.clearResults();
    this.updateStatusText();
    this.updateIdentokitVisuals();
  }

  updateStatusText() {
    const count = Object.values(this.currentFilters).filter(v => v > 0).length;
    const hasEnoughTraits = count >= 3;

    this.statusText.setText(
      hasEnoughTraits
        ? `Traits selected: ${count} (Ready to search)`
        : `Traits selected: ${count} (At least 3 traits required)`
    );
    this.statusText.setColor(hasEnoughTraits ? NOTEBOOK_CONFIG.PENCIL_DARK : '#777777');
    this.searchBtn.setVisible(hasEnoughTraits);
  }

  open(gameState) {
    if (this.isOpen) return;

    const suspectsData = this.scene.cache.json.get('suspects');
    if (!Array.isArray(suspectsData) || suspectsData.length === 0) return;

    this.isOpen = true;
    EventBus.emit('hideHUD');
    this.gameState = gameState || this.gameState;

    this.clearAutoCloseTimer();
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
  }

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

  executeSearch(suspectsData) {
    this.clearResults();
    this.statusText.setText('Searching criminal records...').setColor(NOTEBOOK_CONFIG.INK_BLUE);

    const matches = suspectsData.filter(suspect => {
      return Object.keys(this.currentFilters).every(key => {
        const idx = this.currentFilters[key];
        if (idx <= 0) return true;

        const selectedValue = this.traitsData[key][idx];
        const suspectValue = suspect?.[key];

        if (Array.isArray(suspectValue)) {
          return suspectValue.includes(selectedValue);
        }

        return suspectValue === selectedValue;
      });
    });

    this.displayResults(matches);
  }

  displayResults(matches) {
    this.clearResults();

    const resultX = 1040;
    const startY = 660;

    if (!matches.length) {
      const noMatch = this.scene.add.text(resultX, startY + 60, '✖ NO MATCHES FOUND IN DATABASE', {
        fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
        fontSize: '28px',
        color: NOTEBOOK_CONFIG.INK_RED
      });

      this.container.add(noMatch);
      this.resultObjects.push(noMatch);
      this.statusText.setText('SEARCH COMPLETED (0 MATCHES)');
      this.statusText.setColor(NOTEBOOK_CONFIG.INK_RED);
      return;
    }

    this.statusText.setText(`MATCHING SUSPECTS: ${matches.length}`);
    this.statusText.setColor(NOTEBOOK_CONFIG.PENCIL_DARK);

    matches.slice(0, 3).forEach((suspect, index) => {
      const y = startY + index * 95;

      const line = this.scene.add.line(0, 0, resultX, y - 10, resultX + 520, y - 10, 0xa92a2a, 0.4)
        .setOrigin(0);

      const portraitKey =
        suspect?.portraitKey ||
        suspect?.imageKey ||
        suspect?.spriteKey ||
        suspect?.photoKey ||
        null;

      const portrait = portraitKey && this.scene.textures.exists(portraitKey)
        ? this.scene.add.image(resultX + 35, y + 25, portraitKey).setDisplaySize(60, 60)
        : this.scene.add.text(resultX + 10, y + 10, '[PHOTO]', {
            fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
            fontSize: '20px',
            color: '#888888'
          });

      const resultName = this.scene.add.text(resultX + 90, y, suspect?.name || 'UNKNOWN SUSPECT', {
        fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
        fontSize: '26px',
        color: NOTEBOOK_CONFIG.PENCIL_DARK
      });

      const details = [
        suspect?.gender || 'Unknown gender',
        `${suspect?.hair || 'Unknown'} hair`,
        `${suspect?.accent || 'Unknown'} accent`
      ].join(', ');

      const resultDetails = this.scene.add.text(resultX + 90, y + 30, details, {
        fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
        fontSize: '20px',
        color: '#666666'
      });

      const actionTxt = this.scene.add.text(resultX + 440, y + 12, '[ ISSUE ]', {
        fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
        fontSize: '22px',
        color: NOTEBOOK_CONFIG.INK_RED
      })
        .setInteractive({ useHandCursor: true });

      actionTxt.on('pointerover', () => actionTxt.setColor('#ff0000'));
      actionTxt.on('pointerout', () => actionTxt.setColor(NOTEBOOK_CONFIG.INK_RED));
      actionTxt.on('pointerdown', () => this.issueWarrant(suspect));

      const cardGroup = [line, portrait, resultName, resultDetails, actionTxt];
      this.container.add(cardGroup);
      this.resultObjects.push(...cardGroup);
    });
  }

  issueWarrant(suspect) {
    if (!this.gameState || !suspect) return;

    this.gameState.arrestWarrantIssued = true;
    this.gameState.warrantSuspectName = suspect?.name ?? null;
    this.gameState.warrantSuspectId = suspect?.id ?? null;
    saveGameState();

    this.clearAutoCloseTimer();
    this.clearResults();
    this.searchBtn.setVisible(false);
    this.resetBtn.setVisible(false);
    this.statusText.setText('');

    const stampBg = this.scene.add.rectangle(960, 540, 900, 450, 0xffffff, 0.95)
      .setStrokeStyle(6, 0xa92a2a);

    const stampTitle = this.scene.add.text(960, 420, '★ ARREST WARRANT ISSUED ★', {
      fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
      fontSize: '46px',
      color: NOTEBOOK_CONFIG.INK_RED
    }).setOrigin(0.5);

    const nameText = this.scene.add.text(960, 520, String(suspect.name || 'UNKNOWN').toUpperCase(), {
      fontFamily: NOTEBOOK_CONFIG.FONT_HAND,
      fontSize: '40px',
      color: NOTEBOOK_CONFIG.PENCIL_DARK
    }).setOrigin(0.5);

    const stampObjects = [stampBg, stampTitle, nameText];
    this.container.add(stampObjects);
    this.resultObjects.push(...stampObjects);

    this.autoCloseTimer = this.scene.time.delayedCall(3500, () => this.close());
  }

  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.clearAutoCloseTimer();
    this.clearTraitSelectors();
    this.clearResults();
    this.container.setVisible(false);
    EventBus.emit('showHUD');
  }

  clearTraitSelectors() {
    this.traitButtons.forEach(obj => obj.destroy());
    this.traitButtons = [];
    this.traitValueTexts = [];
  }

  clearResults() {
    this.resultObjects.forEach(obj => obj.destroy());
    this.resultObjects = [];
  }

  clearAutoCloseTimer() {
    if (this.autoCloseTimer) {
      this.autoCloseTimer.remove(false);
      this.autoCloseTimer = null;
    }
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

  destroy() {
    EventBus.emit('showHUD');
    this.clearAutoCloseTimer();

    if (this.scene.input?.keyboard) {
      this.scene.input.keyboard.off('keydown-W', this.boundToggleHandler);
    }

    this.container?.destroy(true);
    this.container = null;
  }
}