import { getEnergyManager } from '../EnergyManager.js';
import { gameState } from '../GameData.js';

export class HotelScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HotelScene' });
    this.timeManager = null;
  }

  create() {
    const { width, height } = this.scale;
    this.timeManager = this.scene.get('PlayerHudScene')?.timeManager;

    // Background
    this.add.image(centerX, height * 0.66, 'hotel',)

    // Title
    this.add.text(width / 2, 50, 'Hotel Room', {
      fontFamily: 'PressStart2P',
      fontSize: '24px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    // Sleep options
    this.createSleepButton(width / 2 - 200, height / 2, '2 Hours\n+40 Energy', 2);
    this.createSleepButton(width / 2, height / 2, '4 Hours\n+60 Energy', 4);
    this.createSleepButton(width / 2 + 200, height / 2, '8 Hours\n+100 Energy', 8);

    // Back button
    this.add.text(width / 2, height - 100, '[ ESC to Leave ]', {
      fontFamily: 'PressStart2P',
      fontSize: '12px',
      color: '#888888',
      align: 'center'
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.stop();
      this.scene.resume('CityScene');
    });
  }

  createSleepButton(x, y, label, hours) {
    const btn = this.add.text(x, y, label, {
      fontFamily: 'PressStart2P',
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 15, y: 15 },
      align: 'center'
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      this.doSleep(hours);
    });

    btn.on('pointerover', () => {
      btn.setBackgroundColor('#555555');
    });

    btn.on('pointerout', () => {
      btn.setBackgroundColor('#333333');
    });
  }

  doSleep(hours) {
    const energyManager = getEnergyManager();
    const result = energyManager.sleep(hours);

    console.log(`💤 ${result.label}`);

    // Fade to black
    this.cameras.main.fadeOut(1000);

    this.time.delayedCall(1500, () => {
      // Advance time
      if (this.timeManager) {
        this.timeManager.handleAdvanceTime(hours, 0);
      }

      // Fade back
      this.cameras.main.fadeIn(1000);

      this.time.delayedCall(1500, () => {
        this.scene.stop();
        this.scene.resume('CityScene');
      });
    });
  }
}