import { gameState, saveGameState } from '../GameData.js';
import { BaseScene } from './BaseScene.js';

export class PhoneCallScene extends BaseScene {
  constructor() {
    super({ key: 'PhoneCallScene' });
    this.sourceScene = 'CityScene';
    this.cityId = null;
    this.ui = [];
    this.ringTweens = [];
    this.isAnswered = false;
    this.isEnding = false;
  }

  init(data = {}) {
    this.sourceScene = data.sourceScene || 'CityScene';
    this.cityId = data.cityId || gameState.currentCityId || null;
    this.ui = [];
    this.ringTweens = [];
    this.isAnswered = false;
    this.isEnding = false;
  }

  create() {
        super.create();
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.75)
      .setOrigin(0, 0)
      .setDepth(2000)
      .setInteractive();

    const phoneBody = this.add.rectangle(cx, cy, 380, 680, 0x1e222a, 1)
      .setStrokeStyle(4, 0x3a3f4d)
      .setDepth(2001);

    const phoneInnerFrame = this.add.rectangle(cx, cy, 360, 660, 0x14171d, 1)
      .setDepth(2001);

    const speaker = this.add.rectangle(cx, cy - 290, 80, 10, 0x0a0c0e, 1)
      .setStrokeStyle(2, 0x2c313c)
      .setDepth(2002);

    const screenBg = this.add.rectangle(cx, cy - 110, 310, 300, 0x8bac0f, 1)
      .setStrokeStyle(4, 0x0f380f)
      .setDepth(2002);

    const screenBorder = this.add.rectangle(cx, cy - 110, 302, 292)
      .setStrokeStyle(2, 0x306230)
      .setDepth(2002);

    const signalText = this.add.text(cx - 135, cy - 245, 'Yll GSM', {
      fontFamily: 'PressStart2P',
      fontSize: '12px',
      color: '#0f380f'
    }).setDepth(2003);

    const batteryText = this.add.text(cx + 85, cy - 245, '[===]', {
      fontFamily: 'PressStart2P',
      fontSize: '12px',
      color: '#0f380f'
    }).setDepth(2003);

    const title = this.add.text(cx, cy - 200, 'INCOMING CALL', {
      fontFamily: 'PressStart2P',
      fontSize: '14px',
      color: '#0f380f'
    }).setOrigin(0.5).setDepth(2003);

    const phoneIcon = this.add.text(cx, cy - 150, '☎', {
      fontSize: '42px',
      color: '#0f380f'
    }).setOrigin(0.5).setDepth(2003);

    const caller = this.add.text(cx, cy - 90, 'DETECTIVE BUREAU', {
      fontFamily: 'PressStart2P',
      fontSize: '13px',
      color: '#0f380f',
      align: 'center',
      wordWrap: { width: 280 }
    }).setOrigin(0.5).setDepth(2003);

    const ringing = this.add.text(cx, cy - 35, 'LINE ACTIVE...', {
      fontFamily: 'PressStart2P',
      fontSize: '10px',
      color: '#306230',
      align: 'center'
    }).setOrigin(0.5).setDepth(2003);

    const answerBtn = this.add.text(cx - 70, cy + 18, '[ ANSWER ]', {
      fontFamily: 'PressStart2P',
      fontSize: '11px',
      color: '#0f380f',
      backgroundColor: '#9bbc0f',
      padding: { left: 8, right: 8, top: 6, bottom: 6 }
    }).setOrigin(0.5).setDepth(2003).setInteractive({ useHandCursor: true });

    const laterBtn = this.add.text(cx + 70, cy + 18, '[ IGNORE ]', {
      fontFamily: 'PressStart2P',
      fontSize: '11px',
      color: '#0f380f',
      backgroundColor: '#9bbc0f',
      padding: { left: 8, right: 8, top: 6, bottom: 6 }
    }).setOrigin(0.5).setDepth(2003).setInteractive({ useHandCursor: true });

    const keypadGroup = this.drawKeypad(cx, cy + 180);

    const ringTween1 = this.tweens.add({
      targets: [phoneIcon, ringing],
      alpha: { from: 0.2, to: 1 },
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    const ringTween2 = this.tweens.add({
      targets: [phoneBody, phoneInnerFrame, speaker, screenBg, screenBorder, signalText, batteryText, title, phoneIcon, caller, ringing, answerBtn, laterBtn, ...keypadGroup],
      x: '+=2',
      duration: 50,
      yoyo: true,
      repeat: -1
    });

    this.ringTweens.push(ringTween1, ringTween2);

    const stopRinging = () => {
      this.ringTweens.forEach(t => {
        if (t && t.isPlaying()) t.stop();
        if (t) t.remove();
      });
      this.ringTweens = [];

      [overlay, phoneBody, phoneInnerFrame, speaker, screenBg, screenBorder, signalText, batteryText, title, phoneIcon, caller, ringing, answerBtn, laterBtn, ...keypadGroup].forEach(obj => {
        if (obj?.disableInteractive) obj.disableInteractive();
      });
    };

    const closeScene = () => {
      if (this.isEnding) return;
      this.isEnding = true;
      stopRinging();
      saveGameState();
      this.scene.stop();
    };

    answerBtn.on('pointerover', () => answerBtn.setStyle({ color: '#9bbc0f', backgroundColor: '#0f380f' }));
    answerBtn.on('pointerout', () => answerBtn.setStyle({ color: '#0f380f', backgroundColor: '#9bbc0f' }));

    laterBtn.on('pointerover', () => laterBtn.setStyle({ color: '#9bbc0f', backgroundColor: '#0f380f' }));
    laterBtn.on('pointerout', () => laterBtn.setStyle({ color: '#0f380f', backgroundColor: '#9bbc0f' }));

    answerBtn.on('pointerdown', () => {
      if (this.isAnswered || this.isEnding) return;
      this.isAnswered = true;

      stopRinging();

      this.scene.launch('HypothesisScene', {
        sourceScene: this.sourceScene,
        cityId: this.cityId
      });

      this.scene.stop();
    });

    laterBtn.on('pointerdown', () => {
      if (this.isEnding) return;
      closeScene();
    });

    this.ui.push(
      overlay, phoneBody, phoneInnerFrame, speaker, screenBg, screenBorder,
      signalText, batteryText, title, phoneIcon, caller, ringing, answerBtn, laterBtn,
      ...keypadGroup
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  drawKeypad(startX, startY) {
    const keys = [];
    const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
    const cols = 3;
    const btnWidth = 60;
    const btnHeight = 35;
    const gapX = 15;
    const gapY = 12;

    labels.forEach((label, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      const x = startX + (col - 1) * (btnWidth + gapX);
      const y = startY + row * (btnHeight + gapY);

      const btnBg = this.add.rectangle(x, y, btnWidth, btnHeight, 0x2a2f3a)
        .setStrokeStyle(2, 0x14171d)
        .setDepth(2002);

      const btnText = this.add.text(x, y, label, {
        fontFamily: 'PressStart2P',
        fontSize: '12px',
        color: '#a0aab0'
      }).setOrigin(0.5).setDepth(2003);

      keys.push(btnBg, btnText);
    });

    return keys;
  }

  onShutdown() {
    this.ringTweens.forEach(t => {
      if (t && t.isPlaying()) t.stop();
      if (t) t.remove();
    });
    this.ringTweens = [];

    this.ui.forEach(item => {
      if (item?.removeAllListeners) item.removeAllListeners();
      if (item?.destroy) item.destroy();
    });

    this.ui = [];
    this.isAnswered = false;
    this.isEnding = false;
  }
}