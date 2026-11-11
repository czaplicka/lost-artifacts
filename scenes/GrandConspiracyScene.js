import { gameState } from '../GameData.js';

import {
  requestAutosave
} from '../gameStatePersistence.js';

import {
  piInventoryManager
} from '../managers/PIInventoryManager.js';

const ROOT = 'assets/side_quests/Grand Conspiracy/';

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

const OBJECTS = [
  {
    key: 'gc_newspaper',
    label: 'Newspaper',
    photo: 'newspaper',
    description:
      'A newspaper beside the dog. A promising lead in the case of the missing crossword.'
  },
  {
    key: 'gc_dog',
    label: 'Sleeping dog',
    description:
      'The security department has entered power-saving mode.'
  },
  {
    key: 'gc_shovel',
    label: 'Hand trowel',
    description:
      'A gardening tool. Perkins would probably call it a miniature burial device.'
  },
  {
    key: 'gc_bag',
    label: 'Closed sack',
    description:
      'A tied sack. Its contents are unknown. That is not the same as illegal.'
  },
  {
    key: 'gc_bag_onion',
    label: 'Open sack',
    photo: 'bulbs',
    description:
      'Plant bulbs, with papery skins and roots. The contents are visible.'
  },
  {
    key: 'gc_wheelbarrow',
    label: 'Wheelbarrow',
    description:
      'A wheelbarrow. No engine, no number plate, no international conspiracy.'
  },
  {
    key: 'gc_grandma',
    label: 'Olga',
    photo: 'gardening',
    description:
      'Olga is watering the vegetable beds. So far, the vegetables are the only confirmed beneficiaries.'
  }
];

const REQUIRED_PHOTOS = [
  'gardening',
  'bulbs',
  'newspaper'
];

export class GrandConspiracyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GrandConspiracyScene' });
  }

  init(data = {}) {
    this.returnScenes = Array.isArray(data.returnScenes)
      ? data.returnScenes
      : [];

    this.photoMode = false;
    this.selectedObject = null;
    this.loadedErrors = [];
  }

  preload() {
    const onError = file => {
      this.loadedErrors.push(file.key);
    };

    this.load.on('loaderror', onError);

    this.events.once('shutdown', () => {
      this.load.off('loaderror', onError);
    });

    for (const [key, filename] of Object.entries(ASSETS)) {
      if (!this.textures.exists(key)) {
        this.load.image(key, ROOT + filename);
      }
    }
  }

  readProgress() {
    const saved = gameState.piGrandConspiracy;

    return {
      version: 1,
      photos: Array.isArray(saved?.photos)
        ? [...new Set(
            saved.photos.filter(
              id => REQUIRED_PHOTOS.includes(id)
            )
          )]
        : []
    };
  }

  savePhoto(id) {
    const progress = this.readProgress();

    if (progress.photos.includes(id)) return false;

    gameState.piGrandConspiracy = {
      ...progress,
      photos: [...progress.photos, id]
    };

    requestAutosave();

    return true;
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.cameras.main.setBackgroundColor('#080e14');

    if (
      this.loadedErrors.length ||
      Object.keys(ASSETS).some(
        key => !this.textures.exists(key)
      )
    ) {
      this.add.text(
        40,
        80,
        'Garden assets could not be loaded.\n' +
        'Check the file paths and browser console.',
        {
          fontFamily: 'SpecialElite, monospace',
          fontSize: '24px',
          color: '#ffe5b0'
        }
      );

      this.makeButton(
        40,
        height - 80,
        'BACK',
        () => this.leave()
      );

      return;
    }

    const source = this.textures
      .get('gc_garden')
      .getSourceImage();

    const top = 76;
    const bottom = 170;

    const factor = Math.min(
      width / source.width,
      (height - top - bottom) / source.height
    );

    this.gardenRect = {
      x: (width - source.width * factor) / 2,
      y: top,
      w: source.width * factor,
      h: source.height * factor
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
        this.inspect(object);
      });
    }

    this.add.text(
      28,
      24,
      'THE MIDNIGHT GARDENER',
      {
        fontFamily: 'PressStart2P, monospace',
        fontSize: '17px',
        color: '#ffe5b0'
      }
    );

    this.counter = this.add.text(
      width - 30,
      24,
      '',
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '23px',
        color: '#ffe5b0'
      }
    ).setOrigin(1, 0);

    this.add.rectangle(
      0,
      height - bottom,
      width,
      bottom,
      0x101923
    ).setOrigin(0);

    this.message = this.add.text(
      28,
      height - bottom + 18,
      '',
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '23px',
        color: '#eee4cc',
        wordWrap: { width: width - 56 }
      }
    );

    this.cameraButton = this.makeButton(
      28,
      height - 62,
      'CAMERA: OFF',
      () => this.toggleCamera()
    );

    this.makeButton(
      width - 190,
      height - 62,
      'LEAVE',
      () => this.leave()
    );

    this.refreshCounter();

    this.say(
      'Inspect the garden. Switch on the camera, then click an object to photograph it.'
    );
  }

  addLayer(key) {
    const rect = this.gardenRect;

    return this.add.image(
      rect.x,
      rect.y,
      key
    )
      .setOrigin(0)
      .setDisplaySize(rect.w, rect.h);
  }

  makeButton(x, y, label, action) {
    const text = this.add.text(
      x,
      y,
      label,
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '23px',
        color: '#ffe5b0',
        backgroundColor: '#263849',
        padding: {
          left: 12,
          right: 12,
          top: 9,
          bottom: 9
        }
      }
    ).setInteractive({ useHandCursor: true });

    text.on('pointerdown', action);

    return text;
  }

  say(text) {
    this.message?.setText(text);
  }

  toggleCamera() {
    if (!piInventoryManager.hasItem('camera')) {
      this.photoMode = false;
      this.cameraButton.setText('CAMERA: OFF');

      this.say(
        'You need a camera in your PI inventory. The Spy Shop sells cameras, not artistic confidence.'
      );

      return;
    }

    this.photoMode = !this.photoMode;

    this.cameraButton.setText(
      this.photoMode
        ? 'CAMERA: ON'
        : 'CAMERA: OFF'
    );

    this.say(
      this.photoMode
        ? 'Camera ready. Click a subject to record a photograph.'
        : 'Camera put away. Click objects to inspect them.'
    );
  }

  inspect(object) {
    this.selectedObject = object.key;

    if (!this.photoMode) {
      this.say(object.description);
      return;
    }

    if (!piInventoryManager.hasItem('camera')) {
      this.photoMode = false;
      this.cameraButton.setText('CAMERA: OFF');

      this.say('Your PI camera is no longer available.');
      return;
    }

    if (!object.photo) {
      this.say(
        `${object.description} This photograph would not add a required finding.`
      );

      return;
    }

    const added = this.savePhoto(object.photo);

    this.refreshCounter();

    if (!added) {
      this.say(
        'You already recorded this subject. The evidence does not improve with duplicates.'
      );

      return;
    }

    const complete = REQUIRED_PHOTOS.every(
      id => this.readProgress().photos.includes(id)
    );

    this.say(
      complete
        ? 'Three required photographs recorded. Next: speak to Olga and prepare the report. The case is not closed yet.'
        : `Photograph recorded: ${object.label}. ${object.description}`
    );
  }

  refreshCounter() {
    this.counter.setText(
      `PHOTOS: ${this.readProgress().photos.length}/3`
    );
  }

  leave() {
    const returnScenes = [...this.returnScenes];

    this.scene.stop();

    for (const key of returnScenes) {
      if (this.scene.isPaused(key)) {
        this.scene.resume(key);
      }
    }
  }
}