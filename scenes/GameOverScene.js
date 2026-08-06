import { gameState } from '../GameData.js';
import { audioManager } from '../AudioManager.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });

    this.titleTextValue = 'GAME OVER';
    this.messageTextValue = 'The case has been lost.';
  }

  init(data) {
    this.titleTextValue = data?.title || 'You have failed the mission';
    this.messageTextValue =
      data?.message ||
      gameState.gameOverReason ||
      'The case has been lost.';
  }

  create() {
    audioManager.init(this);

    audioManager.stopAllMusic();
    audioManager.stopAllAmbient();
    audioManager.stopAllVoice();
    audioManager.stopAllSfx();

    audioManager.playSfx('game_over');

    this.scene.sleep('UIScene');
    this.scene.get('NewsHud').events.emit('setNewspaperVisible', false);

    this.add.image(0, 0, 'backgroundgo')
      .setOrigin(0, 0)
      .setDisplaySize(1920, 1080);

    this.add.text(960, 210, this.titleTextValue, {
      fontFamily: 'PressStart2P',
      fontSize: '34px',
      color: '#f7dfb2',
      stroke: '#3b1f12',
      strokeThickness: 8,
      align: 'center'
    }).setOrigin(0.5);

    const msgBg = this.add.rectangle(960, 915, 1180, 170, 0x2a160f, 0.82);
    msgBg.setStrokeStyle(4, 0xf7dfb2, 1);

    const msgInner = this.add.rectangle(960, 915, 1160, 150, 0x3a2016, 0.35);
    msgInner.setStrokeStyle(2, 0x7b4a2d, 0.8);

    this.add.text(960, 915, this.messageTextValue, {
      fontFamily: 'Special Elite',
      fontSize: '30px',
      color: '#f6ead0',
      align: 'center',
      wordWrap: { width: 1080 },
      lineSpacing: 10
    }).setOrigin(0.5);

    const backBtn = this.add.image(200, 930, 'back')
      .setInteractive({ useHandCursor: true })
      .setScale(0.7);

    this.addHoverEffect(backBtn, 0.7, 0.8);

    backBtn.on('pointerdown', () => {
      audioManager.stopAllNonMusic();
      audioManager.stopAllMusic();
      this.scene.start('MenuScene');
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      audioManager.stopAllSfx();
    });
  }

  addHoverEffect(button, baseScale = 0.7, hoverScale = 0.8) {
    button.on('pointerover', () => button.setScale(hoverScale));
    button.on('pointerout', () => button.setScale(baseScale));
  }
}