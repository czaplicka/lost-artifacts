import { gameState, saveGameState } from '../GameData.js';

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
    const cx = width / 2;
    const cy = height / 2;

    // 1. Ciemne tło przyciemniające grę
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.75)
      .setOrigin(0, 0)
      .setDepth(2000)
      .setInteractive();

    // 2. Obudowa telefonu (Retro Telefon / Brick Phone)
    const phoneBody = this.add.rectangle(cx, cy, 380, 680, 0x1e222a, 1)
      .setStrokeStyle(4, 0x3a3f4d)
      .setDepth(2001);

    // Dodatkowy cień/ramka obudowy dla głębi 3D
    const phoneInnerFrame = this.add.rectangle(cx, cy, 360, 660, 0x14171d, 1)
      .setDepth(2001);

    // Głośnik u góry telefonu
    const speaker = this.add.rectangle(cx, cy - 290, 80, 10, 0x0a0c0e, 1)
      .setStrokeStyle(2, 0x2c313c)
      .setDepth(2002);

    // 3. Wyświetlacz (Monochromatyczny retro zielony/bursztynowy)
    const screenBg = this.add.rectangle(cx, cy - 110, 310, 300, 0x8bac0f, 1)
      .setStrokeStyle(4, 0x0f380f)
      .setDepth(2002);

    // Wewnętrzna ramka ekranu (panel LCD)
    const screenBorder = this.add.rectangle(cx, cy - 110, 302, 292)
      .setStrokeStyle(2, 0x306230)
      .setDepth(2002);

    // 4. Elementy interfejsu na ekranie LCD
    // Pasek stanu (Zasięg + Bateria)
    const signalText = this.add.text(cx - 135, cy - 245, 'Yll  GSM', {
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

    // Animowana ikona dzwonka
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

    // 5. Przyciski ekranowe (Funkcyjne)
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

    // 6. Fizyczna klawiatura telefonu (Atrapa retro klawiszy pod ekranem)
    const keypadGroup = this.drawKeypad(cx, cy + 180);

    // 7. Animacje
    // Pulsowanie ikony dzwonka i tekstu
    this.tweens.add({
      targets: [phoneIcon, ringing],
      alpha: { from: 0.2, to: 1 },
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Delikatne trzęsienie obudowy telefonu (wibracja)
    this.tweens.add({
      targets: [phoneBody, phoneInnerFrame, speaker, screenBg, screenBorder, signalText, batteryText, title, phoneIcon, caller, ringing, answerBtn, laterBtn, ...keypadGroup],
      x: '+=2',
      duration: 50,
      yoyo: true,
      repeat: -1
    });

    // Interakcje przycisków
    answerBtn.on('pointerover', () => answerBtn.setStyle({ color: '#9bbc0f', backgroundColor: '#0f380f' }));
    answerBtn.on('pointerout', () => answerBtn.setStyle({ color: '#0f380f', backgroundColor: '#9bbc0f' }));

    laterBtn.on('pointerover', () => laterBtn.setStyle({ color: '#9bbc0f', backgroundColor: '#0f380f' }));
    laterBtn.on('pointerout', () => laterBtn.setStyle({ color: '#0f380f', backgroundColor: '#9bbc0f' }));

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

    this.ui.push(
      overlay, phoneBody, phoneInnerFrame, speaker, screenBg, screenBorder, 
      signalText, batteryText, title, phoneIcon, caller, ringing, answerBtn, laterBtn, 
      ...keypadGroup
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  // Pomocnicza funkcja do rysowania retro klawiatury
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