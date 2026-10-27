import { BaseScene } from './BaseScene.js';

const SCENE_KEY = 'ExpansionStoreScene';

const PRODUCTS = [
  {
    id: 'case_missing_exhibit',
    category: 'CASE FILE',
    title: 'THE MISSING\nEXHIBIT',
    location: 'A standalone investigation',
    description:
      'An exhibit has disappeared.\n' +
      'The museum director calls it\n' +
      '"an interactive experience".',
    contents: [
      'One additional investigation',
      'New witnesses and dialogue',
      'A new crime scene',
      'A very defensive museum director'
    ],
    monitor: 'EXHIBIT STATUS:\n\nNOT EXHIBITING',
    stamp: 'CLASSIFIED'
  },
  {
    id: 'city_pack',
    category: 'CITY PACK',
    title: 'NEXT STOP:\nTROUBLE',
    location: 'A new destination',
    description:
      'New streets. New suspects.\n' +
      'The same deeply inadequate\n' +
      'agency travel allowance.',
    contents: [
      'An additional city',
      'New locations and characters',
      'Additional investigations',
      'More questionable local advice'
    ],
    monitor: 'TRAVEL REQUEST:\n\nUNDER REVIEW',
    stamp: 'OVERSEAS'
  },
  {
    id: 'story_expansion',
    category: 'STORY EXPANSION',
    title: 'THE FILE\nNOBODY FILED',
    location: 'An additional agency story',
    description:
      'Someone buried this case.\n' +
      'Unfortunately, they used\n' +
      'the alphabetical filing system.',
    contents: [
      'An additional story arc',
      'New agency characters',
      'New evidence and conversations',
      'Administrative misconduct'
    ],
    monitor: 'FILE FOUND:\n\nPLEASE PANIC',
    stamp: 'RESTRICTED'
  }
];

let openingPromise = null;

export async function openExpansionStore() {
  if (openingPromise) {
    return openingPromise;
  }

  openingPromise = (async () => {
    const game = window.game;

    if (!game?.scene) {
      throw new Error('The game is not ready.');
    }

    if (!game.scene.keys[SCENE_KEY]) {
      game.scene.add(
        SCENE_KEY,
        ExpansionStoreScene,
        false
      );
    }

    if (game.scene.isActive(SCENE_KEY)) {
      game.scene.bringToTop(SCENE_KEY);
      return;
    }

    game.scene.start(SCENE_KEY);
    game.scene.bringToTop(SCENE_KEY);
  })();

  try {
    await openingPromise;
  } finally {
    openingPromise = null;
  }
}

export class ExpansionStoreScene extends BaseScene {
  constructor() {
    super({ key: SCENE_KEY });

    this.productIndex = 0;
    this.pausedSceneKeys = [];
    this.hiddenElements = [];
    this.productObjects = [];
    this.detailsLayer = null;
  }

  preload() {
    if (!this.textures.exists('shopping')) {
      this.load.image(
        'shopping',
        'assets/shopping.webp'
      );
    }
  }

  create() {
    super.create();

    this.productIndex = 0;
    this.pausedSceneKeys = [];
    this.hiddenElements = [];
    this.productObjects = [];
    this.detailsLayer = null;

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.restoreGame,
      this
    );

    this.suspendGame();

    this.cameras.main.setBackgroundColor('#0b0b12');

    this.root = this.add.container(0, 0);

    if (this.textures.exists('shopping')) {
      const background = this.add.image(
        960,
        540,
        'shopping'
      );

      background.setDisplaySize(1920, 1080);
      this.root.add(background);
    } else {
      this.root.add(
        this.add.rectangle(
          960, 540, 1920, 1080, 0x29201b
        )
      );
    }

    this.addText(
      70, 28,
      'MARK AGENCY / EXTRA CASES',
      22,
      '#e8d9b0',
      { fontFamily: 'PressStart2P' }
    );

    this.addText(
      70, 70,
      'Additional assignments. Additional paperwork.',
      24,
      '#c4b69a'
    );

    this.button(
      1790, 48,
      'CLOSE',
      () => this.closeStore(),
      {
        width: 180,
        height: 54,
        fill: 0x29231f
      }
    );

    this.button(
      575, 820,
      '<',
      () => this.changeProduct(-1),
      { width: 64, height: 64 }
    );

    this.button(
      974, 820,
      '>',
      () => this.changeProduct(1),
      { width: 64, height: 64 }
    );

    this.addText(
      286, 755,
      'MY COLLECTION',
      19,
      '#e7d5af',
      { angle: -12 }
    );

    this.addText(
      278, 798,
      'Not connected yet',
      20,
      '#c2ae8b',
      { angle: -12 }
    );

    this.addText(
      960, 1024,
      'CATALOG PREVIEW — NO PAYMENTS ARE AVAILABLE',
      18,
      '#d8c9a7',
      { originX: 0.5 }
    );

    this.drawProduct();
    this.fitLayout();

    this.scale.on(
      'resize',
      this.fitLayout,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      () => {
        this.scale.off(
          'resize',
          this.fitLayout,
          this
        );
      }
    );

    if (this.input.keyboard) {
      this.trackInputEvent(
        this.input.keyboard,
        'keydown-ESC',
        () => {
          if (this.detailsLayer) {
            this.closeDetails();
          } else {
            this.closeStore();
          }
        }
      );

      this.trackInputEvent(
        this.input.keyboard,
        'keydown-LEFT',
        () => {
          if (!this.detailsLayer) {
            this.changeProduct(-1);
          }
        }
      );

      this.trackInputEvent(
        this.input.keyboard,
        'keydown-RIGHT',
        () => {
          if (!this.detailsLayer) {
            this.changeProduct(1);
          }
        }
      );
    }
  }

  suspendGame() {
    this.getPlayerHudScene()?.closeAllUIPanels?.();

    const activeScenes = [
      ...this.scene.manager.getScenes(true)
    ];

    for (const scene of activeScenes) {
      const key = scene.sys.settings.key;

      if (
        key === SCENE_KEY ||
        !this.scene.isActive(key)
      ) {
        continue;
      }

      this.pausedSceneKeys.push(key);
      this.scene.pause(key);
    }

    const selectors = [
      '#hud-container',
      '#agent-modal',
      '#profile-modal'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);

      if (!element) {
        continue;
      }

      this.hiddenElements.push({
        element,
        value: element.style.getPropertyValue('display'),
        priority: element.style.getPropertyPriority('display')
      });

      element.style.setProperty(
        'display',
        'none',
        'important'
      );
    }
  }

  restoreGame() {
    for (const entry of this.hiddenElements) {
      if (!entry.element.isConnected) {
        continue;
      }

      if (entry.value) {
        entry.element.style.setProperty(
          'display',
          entry.value,
          entry.priority
        );
      } else {
        entry.element.style.removeProperty('display');
      }
    }

    this.hiddenElements = [];

    for (const key of this.pausedSceneKeys) {
      if (
        this.scene.manager.keys[key] &&
        this.scene.isPaused(key)
      ) {
        this.scene.resume(key);
      }
    }

    this.pausedSceneKeys = [];
  }

  fitLayout() {
    if (!this.root) {
      return;
    }

    const width = this.scale.width;
    const height = this.scale.height;

    const scale = Math.min(
      width / 1920,
      height / 1080
    );

    this.root.setScale(scale);

    this.root.setPosition(
      (width - 1920 * scale) / 2,
      (height - 1080 * scale) / 2
    );
  }

  addText(
    x,
    y,
    value,
    size = 24,
    color = '#352b20',
    options = {},
    parent = this.root
  ) {
    const {
      originX = 0,
      originY = 0,
      angle = 0,
      ...style
    } = options;

    const text = this.add.text(
      x,
      y,
      value,
      {
        fontFamily: 'SpecialElite',
        fontSize: `${size}px`,
        color,
        lineSpacing: 10,
        ...style
      }
    );

    text.setOrigin(originX, originY);
    text.setAngle(angle);

    parent.add(text);

    return text;
  }

  button(
    x,
    y,
    label,
    callback,
    {
      width = 220,
      height = 58,
      fill = 0x473b2d,
      color = '#f0e1bb',
      parent = this.root
    } = {}
  ) {
    const container = this.add.container(x, y);
    parent.add(container);

    const plate = this.add.rectangle(
      0, 0,
      width, height,
      fill
    );

    plate.setStrokeStyle(2, 0xb8a27b);

    const text = this.add.text(
      0, 0,
      label,
      {
        fontFamily: 'SpecialElite',
        fontSize: '23px',
        color
      }
    ).setOrigin(0.5);

    container.add([plate, text]);

    plate.setInteractive({
      useHandCursor: true
    });

    plate.on('pointerover', () => {
      plate.setFillStyle(0x66513b);
    });

    plate.on('pointerout', () => {
      plate.setFillStyle(fill);
    });

    plate.on('pointerup', () => {
      if (
        this.detailsLayer &&
        parent !== this.detailsLayer
      ) {
        return;
      }

      callback();
    });

    return container;
  }

  changeProduct(direction) {
    this.productIndex = Phaser.Math.Wrap(
      this.productIndex + direction,
      0,
      PRODUCTS.length
    );

    this.drawProduct();
  }

  drawProduct() {
    for (const object of this.productObjects) {
      object.destroy();
    }

    this.productObjects = [];

    const product = PRODUCTS[this.productIndex];

    const add = (...args) => {
      const object = this.addText(...args);
      this.productObjects.push(object);
      return object;
    };

    add(
      690, 533,
      product.category,
      17,
      '#6c4a2c'
    );

    add(
      689, 593,
      product.title,
      35,
      '#35291d',
      {
        wordWrap: { width: 235 },
        lineSpacing: 16
      }
    );

    add(
      698, 758,
      product.stamp,
      22,
      '#8c3025',
      { angle: -9 }
    );

    add(
      794, 851,
      `${this.productIndex + 1} / ${PRODUCTS.length}`,
      20,
      '#423323',
      { originX: 0.5 }
    );

    add(
      1060, 598,
      'ASSIGNMENT BRIEF',
      17,
      '#524839'
    );

    add(
      1060, 642,
      product.description,
      21,
      '#302b24',
      {
        lineSpacing: 12,
        wordWrap: { width: 222 }
      }
    );

    add(
      1170, 779,
      'COMING SOON',
      23,
      '#833329',
      { originX: 0.5 }
    );

    const detailsButton = this.button(
      1170, 849,
      'VIEW DETAILS',
      () => this.openDetails(),
      { width: 226, height: 50 }
    );

    this.productObjects.push(detailsButton);

    add(
      1580, 242,
      product.monitor,
      21,
      '#9da98b',
      {
        originX: 0.5,
        align: 'center',
        lineSpacing: 16
      }
    );

    add(
      1580, 340,
      'CATALOG PREVIEW',
      14,
      '#727d68',
      { originX: 0.5 }
    );
  }

  openDetails() {
    if (this.detailsLayer) {
      return;
    }

    const product = PRODUCTS[this.productIndex];
    const layer = this.add.container(0, 0);

    this.root.add(layer);
    this.detailsLayer = layer;

    const blocker = this.add.rectangle(
      960, 540,
      1920, 1080,
      0x000000,
      0.78
    );

    blocker.setInteractive();
    layer.add(blocker);

    const paper = this.add.rectangle(
      960, 540,
      1060, 740,
      0xd5c198
    );

    paper.setStrokeStyle(5, 0x5b4935);
    layer.add(paper);

    this.addText(
      490, 214,
      product.category,
      20,
      '#785436',
      {},
      layer
    );

    this.addText(
      490, 265,
      product.title.replace(/\n/g, ' '),
      36,
      '#34291e',
      {
        wordWrap: { width: 925 }
      },
      layer
    );

    this.addText(
      490, 370,
      product.location,
      25,
      '#6a5136',
      {},
      layer
    );

    this.addText(
      490, 435,
      'PLANNED CONTENT',
      20,
      '#785436',
      {},
      layer
    );

    this.addText(
      490, 488,
      product.contents
        .map(item => `• ${item}`)
        .join('\n'),
      27,
      '#34291e',
      {
        lineSpacing: 16,
        wordWrap: { width: 920 }
      },
      layer
    );

    this.addText(
      490, 709,
      'Preview only. Content and prices are not final.\n' +
      'Purchases are not available.',
      22,
      '#785436',
      {},
      layer
    );

    this.button(
      960, 831,
      'BACK TO CATALOG',
      () => this.closeDetails(),
      {
        width: 330,
        height: 58,
        parent: layer
      }
    );
  }

  closeDetails() {
    this.detailsLayer?.destroy(true);
    this.detailsLayer = null;
  }

  closeStore() {
    this.scene.stop();
  }
}