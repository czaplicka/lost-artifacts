import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { getEnergyManager } from '../managers/EnergyManager.js';

export class SleepScene extends BaseScene {
  constructor() {
    super('SleepScene');
    this.sleepHours = 8;
    this.returnScene = 'OfficeScene';
    this.returnData = {};
    this.sleepResolved = false;
  }

  init(data = {}) {
    this.sleepHours = data.sleepHours || 8;
    this.returnScene = data.returnScene || 'OfficeScene';
    this.returnData = data.returnData || {};
    this.sleepResolved = false;
  }

  create() {
    super.create();

    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#0b0b12');

    this.add.rectangle(0, 0, width, height, 0x0b0b12).setOrigin(0);

    this.add.text(width / 2, height / 2 - 60, 'Go to sleep?', {
      fontFamily: 'SpecialElite',
      fontSize: '42px',
      color: '#f1e7d2'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 10, `Sleep for ${this.sleepHours} hours`, {
      fontFamily: 'SpecialElite',
      fontSize: '28px',
      color: '#cdbf9f'
    }).setOrigin(0.5);

    this.createButton(width / 2, height / 2 + 80, 280, 54, 'SLEEP', () => {
      this.handleSleep();
    });

    this.createButton(width / 2, height / 2 + 150, 280, 54, 'CANCEL', () => {
      this.scene.start(this.returnScene, this.returnData);
    });
  }

  createButton(x, y, w, h, label, onClick) {
    const button = this.add.rectangle(x, y, w, h, 0x2d241c, 0.95)
      .setStrokeStyle(2, 0x8b6b3f, 1)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(x, y, label, {
      fontFamily: 'PressStart2P',
      fontSize: '14px',
      color: '#f4ead7'
    }).setOrigin(0.5);

    button.on('pointerover', () => button.setFillStyle(0x403124, 1));
    button.on('pointerout', () => button.setFillStyle(0x2d241c, 0.95));
    button.on('pointerdown', onClick);

    return { button, text };
  }

  handleSleep() {
    if (this.sleepResolved) {
      return;
    }

    const energyManager = getEnergyManager();
    const startResult = energyManager.startManualSleep(this.sleepHours);

    if (!startResult.success) {
      return;
    }

    const state = gameState.getState ? gameState.getState() : {};
    const shouldShowHolly =
      state.hollyIntroPending === true &&
      state.hollyIntroSeen !== true;

    if (shouldShowHolly) {
      this.scene.start('HollyIntroScene', {
        returnScene: 'SleepScene',
        returnData: {
          sleepHours: this.sleepHours,
          returnScene: this.returnScene,
          returnData: this.returnData,
          afterHolly: true
        }
      });
      return;
    }

    this.finishSleep();
  }

  finishSleep() {
    if (this.sleepResolved) {
      return;
    }

    this.sleepResolved = true;

    const energyManager = getEnergyManager();
    energyManager.completeManualSleep(this.sleepHours);

    this.scene.start(this.returnScene, {
      ...this.returnData,
      wokeUp: true,
      sleptHours: this.sleepHours
    });
  }
}