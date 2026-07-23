import { gameState, saveGameState } from './GameData.js';

export class PhoneCallScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PhoneCallScene' });
    this.sourceScene = 'CityScene';
    this.cityId = null;
    this.ui = [];
  }

  init(data = {}) {
    this.sourceScene = data.sourceScene || 'CityScene';
    this.cityId = data.cityId || gameState.currentCityId || null;
    this.ui = [];
  }

  create() {
    const { width, height } = this.scale;

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.72)
      .setOrigin(0, 0)
      .setDepth(2000)
      .setInteractive();

    const phoneBox = this.add.rectangle(width / 2, height / 2, 520, 720, 0x101820, 0.97)
      .setStrokeStyle(4, 0xd4af37, 0.9)
      .setDepth(2001);

    const title = this.add.text(width / 2, height / 2 - 280, 'INCOMING CALL', {
      fontFamily: 'PressStart2P',
      fontSize: '20px',
      color: '#f4e7c1'
    }).setOrigin(0.5).setDepth(2002);

    const caller = this.add.text(width / 2, height / 2 - 220, 'Detective Bureau', {
      fontFamily: 'Special Elite',
      fontSize: '30px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(2002);

    const ringing = this.add.text(width / 2, height / 2 - 150, 'Your phone is ringing insistently.', {
      fontFamily: 'Special Elite',
      fontSize: '24px',
      color: '#ffd966',
      align: 'center'
    }).setOrigin(0.5).setDepth(2002);

    const answerBtn = this.add.text(width / 2, height / 2 + 120, '[ ANSWER ]', {
      fontFamily: 'Special Elite',
      fontSize: '30px',
      color: '#7CFC00',
      backgroundColor: '#1a1a1a',
      padding: { left: 18, right: 18, top: 10, bottom: 10 }
    }).setOrigin(0.5).setDepth(2002).setInteractive({ useHandCursor: true });

    const laterBtn = this.add.text(width / 2, height / 2 + 200, '[ LATER ]', {
      fontFamily: 'Special Elite',
      fontSize: '28px',
      color: '#cccccc',
      backgroundColor: '#1a1a1a',
      padding: { left: 18, right: 18, top: 10, bottom: 10 }
    }).setOrigin(0.5).setDepth(2002).setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: ringing,
      alpha: { from: 0.35, to: 1 },
      duration: 700,
      yoyo: true,
      repeat: -1
    });

    answerBtn.on('pointerdown', () => {
      this.scene.launch('HypothesisScene', {
        sourceScene: this.sourceScene,
        cityId: this.cityId
      });
      this.scene.stop();
    });

    laterBtn.on('pointerdown', () => {
      saveGameState();
      this.scene.stop();
    });

    this.ui.push(overlay, phoneBox, title, caller, ringing, answerBtn, laterBtn);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  onShutdown() {
    this.ui.forEach(item => {
      if (item?.removeAllListeners) {
        item.removeAllListeners();
      }
      if (item?.destroy) {
        item.destroy();
      }
    });
    this.ui = [];
  }
}