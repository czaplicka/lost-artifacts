import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { piInventoryManager } from '../managers/PIInventoryManager.js';
import { settlePICaseRewards } from '../managers/PICaseRewards.js';
import { applyPIIntegrityDecision } from '../managers/PICaseStanding.js';
import { getReputation } from '../managers/ReputationManager.js';

const CASE_ID = 'pi_grand_conspiracy';
const STATE_VERSION = 3;
const ROOT = __dialogueText("scenes/GrandConspiracyScene.js", "t_06d6e406ed40e9e7ef72");

const ASSETS = {
  gc_garden: 'garden.webp',
  gc_bag_onion: 'bag_onion.webp',
  gc_bag: 'bag.webp',
  gc_dog: 'dog.webp',
  gc_grandma: 'grandma.webp',
  gc_newspaper: 'newspaper.webp',
  gc_shovel: 'shovel.webp',
  gc_wheelbarrow: 'wheelbarrow.webp'
};

const PHOTO_IDS = ['gardening', 'bulbs', 'newspaper'];

const OBJECTS = [
  {
    key: 'gc_newspaper',
    text: __dialogueText("scenes/GrandConspiracyScene.js", "t_643a72cd7029795a73f5")
  },
  {
    key: 'gc_dog',
    text: __dialogueText("scenes/GrandConspiracyScene.js", "t_8abe42e28bd93d08a4eb")
  },
  {
    key: 'gc_shovel',
    text: __dialogueText("scenes/GrandConspiracyScene.js", "t_1d7af5039832fb7944de")
  },
  {
    key: 'gc_bag',
    text: __dialogueText("scenes/GrandConspiracyScene.js", "t_5c17293a4393db84d779")
  },
  {
    key: 'gc_bag_onion',
    text: __dialogueText("scenes/GrandConspiracyScene.js", "t_fdfbcbf0206bda53c6e6")
  },
  {
    key: 'gc_wheelbarrow',
    text: __dialogueText("scenes/GrandConspiracyScene.js", "t_26e8160796e14a8f187d")
  },
  {
    key: 'gc_grandma',
    text: __dialogueText("scenes/GrandConspiracyScene.js", "t_15a11ba9fec7726cb6b6")
  }
];

const REPORTS = {
  honest: {
    title: __dialogueText("scenes/GrandConspiracyScene.js", "t_bee9835d95dd9134bdf9"),
    effect: 'honest_report',
    delta: 5,
    text:
      __dialogueText("scenes/GrandConspiracyScene.js", "t_72d98b6c85ccaf0b8e98") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_91e9a67276c3801538b1") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_291def0b1cad3a24feca") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_1b5276b77804e3a0e76f") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_a72c053fa368c8cfbb3f") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_8c1e0188b86cea2a5266") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_4ff5515e44098ba826e5"),
    reply:
      __dialogueText("scenes/GrandConspiracyScene.js", "t_1934296ba038a44066bb") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_6bdcfb94179d1e785f1c") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_a3b8def21992b0b604f6")
  },

  sensational: {
    title: __dialogueText("scenes/GrandConspiracyScene.js", "t_3c8fe28d4fc3ea5de0a7"),
    effect: 'concealed_findings',
    delta: -5,
    text:
      __dialogueText("scenes/GrandConspiracyScene.js", "t_8a1664f818d69bdc4c52") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_720f03c209323523280b") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_9b49f6dc301eca2c8463") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_3fd247884d6ddde07555") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_c9dc3148037e5bef6684"),
    reply:
      __dialogueText("scenes/GrandConspiracyScene.js", "t_2e208c51bc4cdd70e09f") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_33eeda95aa4dfe687bb4")
  }
};

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function unionBounds(rectangles) {
  const left = Math.min(...rectangles.map(r => r.x));
  const top = Math.min(...rectangles.map(r => r.y));
  const right = Math.max(...rectangles.map(r => r.x + r.w));
  const bottom = Math.max(...rectangles.map(r => r.y + r.h));

  return {
    x: left,
    y: top,
    w: right - left,
    h: bottom - top
  };
}

function containsPoint(rect, x, y) {
  return (
    x >= rect.x &&
    x <= rect.x + rect.w &&
    y >= rect.y &&
    y <= rect.y + rect.h
  );
}

export class GrandConspiracyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GrandConspiracyScene' });
  }

  init(data = {}) {
    this.returnScenes = Array.isArray(data.returnScenes)
      ? data.returnScenes
      : [];

    this.layers = {};
    this.bounds = {};
    this.actions = [];
    this.modal = null;
    this.dragStart = null;
    this.photoMode = false;
    this.transitioning = false;
    this.submitting = false;
  }

  preload() {
    for (const [key, filename] of Object.entries(ASSETS)) {
      if (!this.textures.exists(key)) {
        this.load.image(key, ROOT + filename);
      }
    }
  }

  read() {
    const saved = gameState.piGrandConspiracy;

    if (saved?.version !== STATE_VERSION) {
      return {
        version: STATE_VERSION,
        photos: [],
        bagOpened: false,
        talked: false,
        reportChoice: null,
        completed: false
      };
    }

    return {
      ...saved,
      photos: [...new Set(
        (Array.isArray(saved.photos) ? saved.photos : [])
          .filter(id => PHOTO_IDS.includes(id))
      )]
    };
  }

  write(patch) {
    gameState.piGrandConspiracy = {
      ...this.read(),
      ...patch,
      version: STATE_VERSION
    };

    requestAutosave();
  }

  allPhotos() {
    const photos = this.read().photos;
    return PHOTO_IDS.every(id => photos.includes(id));
  }

  create() {
    this.W = this.scale.width;
    this.H = this.scale.height;

    this.cameras.main.setBackgroundColor('#080e14');

    const missing = Object.keys(ASSETS).filter(
      key => !this.textures.exists(key)
    );

    if (missing.length) {
      this.text(
        40,
        90,
        `${__dialogueText("scenes/GrandConspiracyScene.js", "t_4597f5aecddd084c6aae")}${missing.join('\n')}`,
        24,
        this.W - 80
      );

      this.button(
        40,
        this.H - 80,
        'BACK',
        () => this.leave()
      );

      return;
    }

    const background = this.textures
      .get('gc_garden')
      .getSourceImage();

    const factor = Math.min(
      this.W / background.width,
      (this.H - 290) / background.height
    );

    this.gardenRect = {
      x: (this.W - background.width * factor) / 2,
      y: 76,
      w: background.width * factor,
      h: background.height * factor
    };

    this.addLayer('gc_garden');

    for (const object of OBJECTS) {
      const image = this.addLayer(object.key);

      image.setInteractive({
        pixelPerfect: true,
        alphaTolerance: 16,
        useHandCursor: true
      });

      image.on('pointerdown', () => {
        if (
          !this.photoMode &&
          !this.modal &&
          !this.transitioning
        ) {
          this.say(object.text);
        }
      });

      this.layers[object.key] = image;
      this.bounds[object.key] = this.opaqueBounds(image);
    }

    this.alignBagStates();
    this.applyBagState();

    this.text(
      28,
      24,
      __dialogueText("scenes/GrandConspiracyScene.js", "t_52aab31eec4d8c1a423d"),
      20
    ).setDepth(100);

    this.counter = this.text(
      Math.max(500, this.W - 500),
      24,
      '',
      23
    ).setDepth(100);

    this.buildCamera();

    this.add.rectangle(
      0,
      this.H - 205,
      this.W,
      205,
      0x101923
    ).setOrigin(0).setDepth(100);

    this.message = this.text(
      28,
      this.H - 188,
      '',
      23,
      this.W - 56
    ).setDepth(101);

    const onMove = pointer => {
      this.aim.setPosition(pointer.x, pointer.y);
      this.aim.setVisible(
        this.photoMode &&
        !this.modal &&
        !this.transitioning &&
        containsPoint(this.gardenRect, pointer.x, pointer.y)
      );

      if (this.dragStart) {
        this.drawSelection(this.selectionRect(pointer));
      }
    };

    const onDown = pointer => {
      if (
        !this.photoMode ||
        this.modal ||
        this.transitioning ||
        !containsPoint(this.gardenRect, pointer.x, pointer.y)
      ) {
        return;
      }

      this.dragStart = { x: pointer.x, y: pointer.y };
    };

    const onUp = pointer => {
      if (!this.dragStart) return;

      const rect = this.selectionRect(pointer);

      this.dragStart = null;
      this.selection.clear();

      this.capture(rect);
    };

    this.input.on('pointermove', onMove);
    this.input.on('pointerdown', onDown);
    this.input.on('pointerup', onUp);

    this.events.once('shutdown', () => {
      this.input.off('pointermove', onMove);
      this.input.off('pointerdown', onDown);
      this.input.off('pointerup', onUp);
      this.modal = null;
      this.input.setDefaultCursor('default');
    });

    this.refresh();

    if (this.read().completed) {
      this.say(__dialogueText("scenes/GrandConspiracyScene.js", "t_ad42dff11fd9b457fb04"));
    } else {
      this.say(
        __dialogueText("scenes/GrandConspiracyScene.js", "t_433a6fb0c914d77299bd")
      );
    }
  }

  text(x, y, value, size = 22, width) {
    return this.add.text(x, y, value, {
      fontFamily: 'SpecialElite, monospace',
      fontSize: `${size}px`,
      color: '#eee4cc',
      ...(width ? { wordWrap: { width } } : {})
    });
  }

  button(x, y, label, action) {
    const button = this.text(x, y, label, 21)
      .setPadding(12, 9)
      .setBackgroundColor('#263849')
      .setDepth(110)
      .setInteractive({ useHandCursor: true });

    button.on('pointerdown', () => {
      if (!this.submitting) action();
    });

    return button;
  }

  addLayer(key) {
    const r = this.gardenRect;

    return this.add.image(r.x, r.y, key)
      .setOrigin(0)
      .setDisplaySize(r.w, r.h);
  }

  opaqueBounds(image) {
    const source = this.textures
      .get(image.texture.key)
      .getSourceImage();

    const canvas = document.createElement('canvas');

    canvas.width = source.width;
    canvas.height = source.height;

    const context = canvas.getContext('2d', {
      willReadFrequently: true
    });

    context.drawImage(source, 0, 0);

    const pixels = context.getImageData(
      0, 0, canvas.width, canvas.height
    ).data;

    let left = canvas.width;
    let top = canvas.height;
    let right = -1;
    let bottom = -1;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] < 32) {
          continue;
        }

        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }

    if (right < left) {
      throw new Error(`Empty garden layer: ${image.texture.key}`);
    }

    return {
      x: image.x + left * image.scaleX,
      y: image.y + top * image.scaleY,
      w: (right - left + 1) * image.scaleX,
      h: (bottom - top + 1) * image.scaleY
    };
  }

  alignBagStates() {
    const closed = this.bounds.gc_bag;
    const open = this.bounds.gc_bag_onion;

    const dx =
      closed.x + closed.w / 2 -
      (open.x + open.w / 2);

    const dy =
      closed.y + closed.h -
      (open.y + open.h);

    this.layers.gc_bag_onion.x += dx;
    this.layers.gc_bag_onion.y += dy;

    this.bounds.gc_bag_onion = {
      ...open,
      x: open.x + dx,
      y: open.y + dy
    };
  }

  applyBagState() {
    const opened = this.read().bagOpened;

    this.layers.gc_bag.setVisible(!opened);
    this.layers.gc_bag_onion.setVisible(opened);

    this.layers.gc_bag.input.enabled = !opened;
    this.layers.gc_bag_onion.input.enabled = opened;
  }

  buildCamera() {
    const r = this.gardenRect;

    this.viewfinder = this.add.container(0, 0)
      .setDepth(50)
      .setVisible(false);

    const frame = this.add.graphics();

    frame.lineStyle(4, 0xffe5b0, 0.95);

    const margin = 24;
    const length = 54;

    for (const [x, y, dx, dy] of [
      [r.x + margin, r.y + margin, 1, 1],
      [r.x + r.w - margin, r.y + margin, -1, 1],
      [r.x + margin, r.y + r.h - margin, 1, -1],
      [r.x + r.w - margin, r.y + r.h - margin, -1, -1]
    ]) {
      frame.beginPath();
      frame.moveTo(x + length * dx, y);
      frame.lineTo(x, y);
      frame.lineTo(x, y + length * dy);
      frame.strokePath();
    }

    const label = this.text(
      r.x + 42,
      r.y + 38,
      __dialogueText("scenes/GrandConspiracyScene.js", "t_80d31c8f56fb9baae4a5"),
      21
    );

    this.viewfinder.add([frame, label]);

    this.aim = this.add.graphics()
      .setDepth(52)
      .setVisible(false);

    this.aim.lineStyle(2, 0xffe5b0, 0.9);
    this.aim.strokeCircle(0, 0, 15);
    this.aim.lineBetween(-25, 0, 25, 0);
    this.aim.lineBetween(0, -25, 0, 25);

    this.selection = this.add.graphics().setDepth(53);

    this.flash = this.add.rectangle(
      r.x, r.y, r.w, r.h, 0xffffff
    )
      .setOrigin(0)
      .setDepth(54)
      .setAlpha(0);

    this.curtain = this.add.rectangle(
      r.x, r.y, r.w, r.h, 0x080e14
    )
      .setOrigin(0)
      .setDepth(55)
      .setAlpha(0);
  }

  setCamera(on) {
    this.photoMode = on;
    this.dragStart = null;
    this.selection.clear();
    this.viewfinder.setVisible(on);
    this.aim.setVisible(false);

    this.input.setDefaultCursor(
      on ? 'crosshair' : 'default'
    );

    this.refreshActions();
  }

  toggleCamera() {
    if (this.photoMode) {
      this.setCamera(false);
      this.say(__dialogueText("scenes/GrandConspiracyScene.js", "t_d7c5d6a19e48652c3453"));
      return;
    }

    if (!piInventoryManager.hasItem('camera')) {
      this.say(__dialogueText("scenes/GrandConspiracyScene.js", "t_ca7dcd78623f50850e2c"));
      return;
    }

    this.setCamera(true);

    this.say(
      __dialogueText("scenes/GrandConspiracyScene.js", "t_0ae7aca23b3018102df0")
    );
  }

  selectionRect(pointer) {
    const r = this.gardenRect;

    const x = Phaser.Math.Clamp(pointer.x, r.x, r.x + r.w);
    const y = Phaser.Math.Clamp(pointer.y, r.y, r.y + r.h);

    return {
      x: Math.min(this.dragStart.x, x),
      y: Math.min(this.dragStart.y, y),
      w: Math.abs(x - this.dragStart.x),
      h: Math.abs(y - this.dragStart.y)
    };
  }

  drawSelection(rect) {
    this.selection.clear();
    this.selection.fillStyle(0xffe5b0, 0.08);
    this.selection.fillRect(rect.x, rect.y, rect.w, rect.h);
    this.selection.lineStyle(3, 0xffe5b0, 1);
    this.selection.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }

  covers(frame, target) {
    const left = Math.max(frame.x, target.x);
    const top = Math.max(frame.y, target.y);

    const right = Math.min(
      frame.x + frame.w,
      target.x + target.w
    );

    const bottom = Math.min(
      frame.y + frame.h,
      target.y + target.h
    );

    const overlap =
      Math.max(0, right - left) *
      Math.max(0, bottom - top);

    const coverage = overlap / (target.w * target.h);
    const tightness =
      (target.w * target.h) / (frame.w * frame.h);

    return coverage >= 0.9 && tightness >= 0.12;
  }

  capture(frame) {
    if (
      !this.photoMode ||
      this.modal ||
      this.transitioning ||
      this.read().completed
    ) {
      return;
    }

    if (!piInventoryManager.hasItem('camera')) {
      this.setCamera(false);
      this.say(__dialogueText("scenes/GrandConspiracyScene.js", "t_a1ec347ede5ab0e7a738"));
      return;
    }

    if (frame.w < 20 || frame.h < 20) {
      this.say(__dialogueText("scenes/GrandConspiracyScene.js", "t_d7d36c5d5d2b60ddf320"));
      return;
    }

    const targets = [
      {
        id: 'gardening',
        bounds: this.bounds.gc_grandma,
        text: __dialogueText("scenes/GrandConspiracyScene.js", "t_14e44602816c3a2d3972")
      },
      {
        id: 'newspaper',
        bounds: unionBounds([
          this.bounds.gc_dog,
          this.bounds.gc_newspaper
        ]),
        text: __dialogueText("scenes/GrandConspiracyScene.js", "t_07914c0b2a38d26db3d6")
      }
    ];

    if (this.read().bagOpened) {
      targets.push({
        id: 'bulbs',
        bounds: this.bounds.gc_bag_onion,
        text: __dialogueText("scenes/GrandConspiracyScene.js", "t_9a8053ae0d37b7fec5c1")
      });
    }

    const matching = targets.filter(
      target => this.covers(frame, target.bounds)
    );

    if (matching.length !== 1) {
      this.say(
        __dialogueText("scenes/GrandConspiracyScene.js", "t_6548f8016ff58818d54a")
      );

      return;
    }

    const target = matching[0];
    const progress = this.read();

    if (progress.photos.includes(target.id)) {
      this.say(__dialogueText("scenes/GrandConspiracyScene.js", "t_5e46e08c9feef1173803"));
      return;
    }

    this.write({
      photos: [...progress.photos, target.id]
    });

    this.tweens.killTweensOf(this.flash);
    this.flash.setAlpha(0.7);

    this.tweens.add({
      targets: this.flash,
      alpha: 0,
      duration: 220
    });

    this.refresh();
    this.say(`${__dialogueText("scenes/GrandConspiracyScene.js", "t_924462bc093b4fd80f23")}${target.text}`);
  }

  keepWatching() {
    const progress = this.read();

    if (
      this.transitioning ||
      progress.bagOpened ||
      !progress.photos.includes('gardening')
    ) {
      return;
    }

    this.setCamera(false);
    this.transitioning = true;
    this.refreshActions();

    this.say(__dialogueText("scenes/GrandConspiracyScene.js", "t_ace372ab306671cecfa3"));

    this.tweens.add({
      targets: this.curtain,
      alpha: 1,
      duration: 350,

      onComplete: () => {
        this.write({ bagOpened: true });
        this.applyBagState();

        this.tweens.add({
          targets: this.curtain,
          alpha: 0,
          duration: 450,

          onComplete: () => {
            this.transitioning = false;
            this.refresh();

            this.say(
              __dialogueText("scenes/GrandConspiracyScene.js", "t_79d99c1780cf6c06ed3d")
            );
          }
        });
      }
    });
  }

  talkToOlga() {
    if (!this.allPhotos() || this.read().completed) return;

    this.setCamera(false);

    this.showModal(
      __dialogueText("scenes/GrandConspiracyScene.js", "t_d79b6ce58b6d0a50f593"),
      __dialogueText("scenes/GrandConspiracyScene.js", "t_9e879ba1efdf554adf02") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_5521143ab7f12228970a") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_9f0eb5edff3aed805ce8") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_1c5b551eb59c43e509fa") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_a5f460ac664753e903b1") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_d6afda892ac42d998d50") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_969426a2822b2b7cd1f6") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_dfafb4a7ee4f37e2e5cd"),
      [{
        label: __dialogueText("scenes/GrandConspiracyScene.js", "t_524ce7ed8a72e0c4d4d4"),
        action: () => {
          this.write({ talked: true });
          this.closeModal();
          this.refresh();
          this.say(__dialogueText("scenes/GrandConspiracyScene.js", "t_9837384de2be0512a7b2"));
        }
      }]
    );
  }

  chooseReport() {
    if (!this.allPhotos() || !this.read().talked) return;

    this.setCamera(false);

    const lockedChoice = this.read().reportChoice;

    if (lockedChoice) {
      this.previewReport(lockedChoice);
      return;
    }

    this.showModal(
      __dialogueText("scenes/GrandConspiracyScene.js", "t_04592858521cc7209c9a"),
      __dialogueText("scenes/GrandConspiracyScene.js", "t_d2115ba9721141812946") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_c85900c678383a5755cd") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_f3518e4f7c5a3f332d0f") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_f25a3f56760a2fffe304") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_aded1cf23b17694de8f3") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_05c4cc2fa7302f405442"),
      [
        {
          label: __dialogueText("scenes/GrandConspiracyScene.js", "t_87ea4660d3f7b77b3058"),
          action: () => this.previewReport('honest')
        },
        {
          label: __dialogueText("scenes/GrandConspiracyScene.js", "t_1c4889c90a9e7f7ec203"),
          action: () => this.previewReport('sensational')
        },
        {
          label: __dialogueText("scenes/GrandConspiracyScene.js", "t_639807a2e01886a2236b"),
          action: () => this.closeModal()
        }
      ]
    );
  }

  previewReport(choice) {
    const report = REPORTS[choice];

    if (!report) return;

    const locked = Boolean(this.read().reportChoice);

    this.showModal(
      report.title,
      report.text +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_2cef4423efc596d274e8") +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_6d2f8566ba24e3aea59e") +
      `${__dialogueText("scenes/GrandConspiracyScene.js", "t_f5f54457a0d479da5966")}${report.delta > 0 ? '+' : ''}${report.delta}${__dialogueText("scenes/GrandConspiracyScene.js", "t_9f57956d29521daecbfc")}` +
      __dialogueText("scenes/GrandConspiracyScene.js", "t_d72f450fd47bb39f3365"),
      [
        {
          label: locked ? __dialogueText("scenes/GrandConspiracyScene.js", "t_ba87a42726b3f1f42515") : __dialogueText("scenes/GrandConspiracyScene.js", "t_d4eff7742a1bf950c3db"),
          action: () => this.submitReport(choice)
        },
        {
          label: locked ? __dialogueText("scenes/GrandConspiracyScene.js", "t_f13a1ed0cf3c4197ec8f") : __dialogueText("scenes/GrandConspiracyScene.js", "t_639807a2e01886a2236b"),
          action: () => {
            if (locked) this.closeModal();
            else this.chooseReport();
          }
        }
      ]
    );
  }

  submitReport(choice) {
    if (
      this.submitting ||
      !REPORTS[choice] ||
      !this.allPhotos() ||
      !this.read().talked
    ) {
      return;
    }

    const saved = this.read();

    if (saved.reportChoice && saved.reportChoice !== choice) {
      return;
    }

    const quest = gameState.piQuests?.quests?.[CASE_ID];

    if (!quest) {
      this.closeModal();
      this.say(
        __dialogueText("scenes/GrandConspiracyScene.js", "t_faaf60a758356eb91279")
      );
      return;
    }

    if (
      !['active', 'settling'].includes(quest.status) &&
      quest.rewardSettlement?.completed !== true
    ) {
      this.closeModal();
      this.say(__dialogueText("scenes/GrandConspiracyScene.js", "t_e7b04f9d851a45324334"));
      return;
    }

    if (!Array.isArray(quest.objectives) || !quest.objectives.length) {
      this.closeModal();
      this.say(__dialogueText("scenes/GrandConspiracyScene.js", "t_d1b60f098e1f818a77b5"));
      return;
    }

    this.submitting = true;

    try {
      const report = REPORTS[choice];

      this.write({
        reportChoice: choice,
        reportText: report.text
      });

      const reputationBefore = getReputation();

      applyPIIntegrityDecision({
        caseId: CASE_ID,
        decisionId: 'final_report',
        effect: report.effect
      });

      if (this.read().integrityDelta == null) {
        this.write({
          integrityDelta:
            getReputation().integrity - reputationBefore.integrity
        });
      }

      const current = gameState.piQuests.quests[CASE_ID];

      gameState.piQuests = {
        ...gameState.piQuests,

        quests: {
          ...gameState.piQuests.quests,

          [CASE_ID]: {
            ...current,

            objectives: current.objectives.map(objective => ({
              ...objective,
              completed: true
            })),

            resolution: {
              ...(current.resolution || {}),
              endingId: choice,
              report: report.text,
              witnessStatement: __dialogueText("scenes/GrandConspiracyScene.js", "t_fb2f912ed1d97451f7b1"),
              photoIds: [...this.read().photos]
            }
          }
        }
      };

      requestAutosave();

      const result = settlePICaseRewards(CASE_ID);

      if (!result.ok) {
        this.closeModal();
        this.say(result.message);
        return;
      }

      this.write({ completed: true });
      this.closeInvestigation(choice, report.text);
      this.closeModal();
      this.refresh();

      this.showModal(
        __dialogueText("scenes/GrandConspiracyScene.js", "t_3825cb7a28815e93b278"),
        report.reply +
        __dialogueText("scenes/GrandConspiracyScene.js", "t_a3670a8808206a7c1c68") +
        __dialogueText("scenes/GrandConspiracyScene.js", "t_09587bde93137a974f5a") +
        `${__dialogueText("scenes/GrandConspiracyScene.js", "t_838ba4766fe998f2219e")}${report.delta > 0 ? '+' : ''}${report.delta}${__dialogueText("scenes/GrandConspiracyScene.js", "t_cdb4ee2aea69cc6a8333")}` +
        __dialogueText("scenes/GrandConspiracyScene.js", "t_0108130e77e672f875a8"),
        [{
          label: __dialogueText("scenes/GrandConspiracyScene.js", "t_194d49d3c085f555240e"),
          action: () => this.closeModal()
        }]
      );
    } catch (error) {
      console.error('[GrandConspiracy] Report interrupted:', error);

      this.closeModal();
      this.say(
        __dialogueText("scenes/GrandConspiracyScene.js", "t_1049d8d2f614831ecdd6")
      );
    } finally {
      this.submitting = false;
      this.refreshActions();
    }
  }

  closeInvestigation(choice, reportText) {
    const investigations = gameState.piInvestigations;
    const investigation = investigations?.cases?.[CASE_ID];

    if (!investigation) return;

    const board = copy(
      investigation.board || { items: [], links: [] }
    );

    const id = 'grand_conspiracy_final_report';

    board.items = [
      ...(Array.isArray(board.items) ? board.items : [])
        .filter(item => item.id !== id),

      {
        id,
        type: 'note',
        label: __dialogueText("scenes/GrandConspiracyScene.js", "t_49e8e4e137e1612036c6"),
        text: reportText,
        metaText: __dialogueText("scenes/GrandConspiracyScene.js", "t_03a0bbc92d6fd115e5ec"),
        color: 'yellow',
        x: 120,
        y: 380,
        discovered: true,
        pinned: true,
        createdByPlayer: false,
        editableByPlayer: false
      }
    ];

    gameState.piInvestigations = {
      ...investigations,

      cases: {
        ...investigations.cases,

        [CASE_ID]: {
          ...investigation,
          status: 'completed',
          resolution: {
            ...(investigation.resolution || {}),
            endingId: choice,
            report: reportText
          },
          board
        }
      }
    };

    requestAutosave();
  }

  showModal(title, body, choices) {
    this.closeModal();

    this.dragStart = null;
    this.selection.clear();
    this.aim.setVisible(false);

    const width = Math.min(this.W - 70, 1100);
    const x = (this.W - width) / 2;
    const y = 80;

    const root = this.add.container(0, 0).setDepth(200);

    const blocker = this.add.rectangle(
      0, 0, this.W, this.H, 0x000000, 0.8
    ).setOrigin(0).setInteractive();

    const heading = this.text(
      x + 30, y + 24, title, 26, width - 60
    );

    const content = this.text(
      x + 30,
      heading.y + heading.height + 22,
      body,
      23,
      width - 60
    ).setLineSpacing(5);

    const buttonTop = content.y + content.height + 28;
    const buttons = [];

    let bx = x + 30;
    let by = buttonTop;

    for (const choice of choices) {
      const button = this.button(
        bx, by, choice.label, choice.action
      );

      if (
        bx > x + 30 &&
        bx + button.width > x + width - 30
      ) {
        bx = x + 30;
        by += 58;
        button.setPosition(bx, by);
      }

      buttons.push(button);
      bx += button.width + 14;
    }

    const panelHeight = by - y + 86;

    const panel = this.add.rectangle(
      x, y, width, panelHeight, 0x152331
    )
      .setOrigin(0)
      .setStrokeStyle(2, 0xd4af37);

    root.add([
      blocker,
      panel,
      heading,
      content,
      ...buttons
    ]);

    this.modal = root;
  }

  closeModal() {
    this.modal?.destroy(true);
    this.modal = null;
  }

  refreshActions() {
    for (const button of this.actions) button.destroy();
    this.actions = [];

    if (!this.message) return;

    const progress = this.read();
    const y = this.H - 64;

    const entries = [];

    if (!progress.completed && !this.transitioning) {
      entries.push({
        label: this.photoMode ? __dialogueText("scenes/GrandConspiracyScene.js", "t_4f0872ab8f825e8ae4b4") : __dialogueText("scenes/GrandConspiracyScene.js", "t_bfb78c847e15030fb830"),
        action: () => this.toggleCamera()
      });

      if (
        progress.photos.includes('gardening') &&
        !progress.bagOpened
      ) {
        entries.push({
          label: __dialogueText("scenes/GrandConspiracyScene.js", "t_78a1238c348bbf458529"),
          action: () => this.keepWatching()
        });
      }

      if (this.allPhotos()) {
        entries.push({
          label: progress.talked ? __dialogueText("scenes/GrandConspiracyScene.js", "t_14cd31ca6827a5c5bbf5") : __dialogueText("scenes/GrandConspiracyScene.js", "t_b4da0d0bee773ccfdc2a"),
          action: () => this.talkToOlga()
        });
      }

      if (progress.talked && this.allPhotos()) {
        entries.push({
          label: __dialogueText("scenes/GrandConspiracyScene.js", "t_255633313f2c2771dd5b"),
          action: () => this.chooseReport()
        });
      }
    }

    let x = 28;

    for (const entry of entries) {
      const button = this.button(
        x, y, entry.label, entry.action
      );

      if (entry.label === __dialogueText("scenes/GrandConspiracyScene.js", "t_4f0872ab8f825e8ae4b4")) {
        button.setBackgroundColor('#7a2a22');
      }

      this.actions.push(button);
      x += button.width + 14;
    }

    if (!this.transitioning) {
      this.actions.push(
        this.button(
          this.W - 150,
          y,
          'LEAVE',
          () => this.leave()
        )
      );
    }
  }

  refresh() {
    this.counter.setText(
      `${__dialogueText("scenes/GrandConspiracyScene.js", "t_261f2e3cbdeff3d74dd3")}${this.read().photos.length}${__dialogueText("scenes/GrandConspiracyScene.js", "t_8d2cedfe81c77aaa05d9")}`
    );

    this.applyBagState();
    this.refreshActions();
  }

  say(message) {
    this.message?.setText(message);
  }

  leave() {
    if (this.transitioning || this.submitting) return;

    const returnScenes = [...this.returnScenes];

    this.input.setDefaultCursor('default');
    this.scene.stop();

    for (const key of returnScenes) {
      if (this.scene.isPaused(key)) {
        this.scene.resume(key);
      }
    }
  }
}