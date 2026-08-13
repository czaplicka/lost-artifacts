export class HiddenObjectsUI {
  /**
   * @param {Phaser.Scene} scene - Instancja HiddenObjectsScene
   */
  constructor(scene) {
    this.scene = scene;
    
    // Elementy UI
    this.timerText = null;
    this.scoreText = null;
    this.missesText = null;
    this.listText = null;
    this.messageText = null;
    this.backBtn = null;
    this.resultOverlay = null;
    this.resultContainer = null;
  }

  /**
   * Tworzy pasek boczny oraz nagłówki i przyciski.
   */
  createSidebarUI() {
    const { width, height } = this.scene.scale;
    const sidebarWidth = this.scene.sidebarWidth;

    // Tło paska bocznego
    this.scene.add.rectangle(0, 0, sidebarWidth, height, 0x111111, 0.94)
      .setOrigin(0, 0)
      .setDepth(1000);

    this.scene.add.rectangle(18, 18, sidebarWidth - 36, height - 36, 0x1b1b1f, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xc8a75a, 0.45)
      .setDepth(1000);

    // Tytuł
    this.scene.add.text(34, 34, this.scene.title, {
      fontFamily: 'Special Elite, Arial',
      fontSize: '26px',
      color: '#ffffff',
      wordWrap: { width: sidebarWidth - 90 }
    }).setDepth(1001);

    // Statystyki
    this.timerText = this.scene.add.text(34, 88, `Time: ${this.scene.formatTime(this.scene.timeLeft)}`, {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#ffd966'
    }).setDepth(1001);

    this.scoreText = this.scene.add.text(220, 88, `Score: ${this.scene.score}`, {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#7CFC00'
    }).setDepth(1001);

    this.missesText = this.scene.add.text(34, 114, `Misses: ${this.scene.incorrectClicks}`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ff8a8a'
    }).setDepth(1001);

    // Nagłówek listy
    this.scene.add.text(34, 142, 'Find these objects:', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setDepth(1001);

    // Lista obiektów
    this.listText = this.scene.add.text(34, 170, this.buildListText(), {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#f2f2f2',
      lineSpacing: 8,
      wordWrap: { width: sidebarWidth - 68 }
    }).setDepth(1001);

    // Komunikaty powiadomień
    this.messageText = this.scene.add.text(34, height - 170, '', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffd966',
      wordWrap: { width: sidebarWidth - 68 },
      lineSpacing: 6
    }).setDepth(1001);

    // Przycisk wyjścia / powrotu
    if (this.scene.textures.exists('back')) {
      this.backBtn = this.scene.add.image(width - 70, 44, 'back')
        .setDisplaySize(96, 56)
        .setInteractive({ useHandCursor: true })
        .setDepth(1001);
    } else {
      this.backBtn = this.scene.add.text(width - 120, 24, 'Back', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#ffffff',
        backgroundColor: '#222222',
        padding: { left: 12, right: 12, top: 8, bottom: 8 }
      })
        .setInteractive({ useHandCursor: true })
        .setDepth(1001);
    }

    this.backBtn.on('pointerdown', () => {
      this.scene.abandonGame();
    });
  }

  /**
   * Generuje tekst listy obiektów z ptaszkami (✓) przy znalezionych.
   */
  buildListText() {
    return this.scene.activeItems.map(item => {
      const found = this.scene.foundItems.has(item.id);
      return `${found ? '✓' : '•'} ${item.item}`;
    }).join('\n');
  }

  /**
   * Odświeża widok listy poszlak.
   */
  refreshList() {
    if (this.listText) {
      this.listText.setText(this.buildListText());
    }
  }

  /**
   * Aktualizuje wartość timera.
   */
  updateTimer(timeLeft) {
    if (this.timerText) {
      this.timerText.setText(`Time: ${this.scene.formatTime(timeLeft)}`);
    }
  }

  /**
   * Aktualizuje punkty i pudła.
   */
  updateScoreAndMisses(score, misses) {
    if (this.scoreText) {
      this.scoreText.setText(`Score: ${score}`);
    }
    if (this.missesText) {
      this.missesText.setText(`Misses: ${misses}`);
    }
  }

  /**
   * Wyświetla powiadomienie z płynnym zanikaniem.
   */
  showMessage(text, color = '#ffd966') {
    if (!this.messageText) return;

    this.messageText.setText(text);
    this.messageText.setColor(color);
    this.messageText.setAlpha(1);

    this.scene.tweens.killTweensOf(this.messageText);

    this.scene.tweens.add({
      targets: this.messageText,
      alpha: 0,
      duration: 2200,
      delay: 1000,
      ease: 'Linear'
    });
  }

  /**
   * Wyświetla animowany popup po pomyślnym ukończeniu sceny.
   */
  showSuccessOverlay() {
    const { width, height } = this.scene.scale;
    const panelWidth = 700;
    const panelHeight = 420;
    const centerX = this.scene.sidebarWidth + (width - this.scene.sidebarWidth) / 2;
    const centerY = height / 2;
    const remainingTimeBonus = this.scene.timeLeft * 2;
    const finalScore = this.scene.score;

    this.resultOverlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.72)
      .setOrigin(0, 0)
      .setDepth(3000)
      .setAlpha(0);

    this.resultContainer = this.scene.add.container(centerX, centerY).setDepth(3001).setAlpha(0);

    const panel = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x181511, 0.98)
      .setStrokeStyle(3, 0xd4af37, 0.9);

    const title = this.scene.add.text(0, -155, 'Crime Scene Complete', {
      fontFamily: 'Special Elite, Arial',
      fontSize: '38px',
      color: '#f8e7b9',
      align: 'center'
    }).setOrigin(0.5);

    const subtitle = this.scene.add.text(0, -104, 'The forensic sweep is finished.', {
      fontFamily: 'PressStart2P, Arial',
      fontSize: '22px',
      color: '#f2f2f2',
      align: 'center'
    }).setOrigin(0.5);

    const stats = this.scene.add.text(
      0,
      -5,
      [
        `Objects found: ${this.scene.foundItems.size}/${this.scene.activeItems.length}`,
        `Misses: ${this.scene.incorrectClicks}`,
        `Time left: ${this.scene.formatTime(this.scene.timeLeft)}`,
        `Time bonus: +${remainingTimeBonus}`,
        `Final score: ${finalScore}`
      ].join('\n'),
      {
        fontFamily: 'PressStart2P, Arial',
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 10
      }
    ).setOrigin(0.5);

    const note = this.scene.add.text(
      0,
      112,
      'Evidence logged. Return to the city and continue the investigation.',
      {
        fontFamily: 'PressStart2P, Arial',
        fontSize: '19px',
        color: '#d8d8d8',
        align: 'center',
        wordWrap: { width: panelWidth - 100 }
      }
    ).setOrigin(0.5);

    const continueBtnBg = this.scene.add.rectangle(0, 170, 260, 56, 0x8b6b2f, 1)
      .setStrokeStyle(2, 0xf0d48a, 0.9)
      .setInteractive({ useHandCursor: true });

    const continueBtnText = this.scene.add.text(0, 170, 'Continue', {
      fontFamily: 'PressStart2P, Arial',
      fontSize: '16px',
      color: '#fff7dc'
    }).setOrigin(0.5);

    continueBtnBg.on('pointerover', () => continueBtnBg.setFillStyle(0xa07a34, 1));
    continueBtnBg.on('pointerout', () => continueBtnBg.setFillStyle(0x8b6b2f, 1));
    continueBtnBg.on('pointerdown', () => {
      this.scene.playSfx('correct', { volume: 0.35 });
      this.scene.restoreSourceScene();
      this.scene.returnToSafeScene({
        ...this.scene.returnData,
        hiddenObjectsSuccess: true,
        hiddenObjectsScore: finalScore,
        incorrectClicks: this.scene.incorrectClicks,
        foundItems: Array.from(this.scene.foundItems),
        sceneId: this.scene.sceneId
      });
    });

    this.resultContainer.add([
      panel,
      title,
      subtitle,
      stats,
      note,
      continueBtnBg,
      continueBtnText
    ]);

    this.scene.tweens.add({
      targets: this.resultOverlay,
      alpha: 1,
      duration: 250,
      ease: 'Power2'
    });

    this.scene.tweens.add({
      targets: this.resultContainer,
      alpha: 1,
      y: centerY - 8,
      duration: 320,
      ease: 'Back.Out'
    });
  }

  /**
   * Wyświetla animowany popup po przekroczeniu limitu czasu.
   */
  showFailureOverlay() {
    const { width, height } = this.scene.scale;
    const panelWidth = 680;
    const panelHeight = 340;
    const centerX = this.scene.sidebarWidth + (width - this.scene.sidebarWidth) / 2;
    const centerY = height / 2;

    this.resultOverlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.68)
      .setOrigin(0, 0)
      .setDepth(3000)
      .setAlpha(0);

    this.resultContainer = this.scene.add.container(centerX, centerY).setDepth(3001).setAlpha(0);

    const panel = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x1c1212, 0.98)
      .setStrokeStyle(3, 0xa44a4a, 0.95);

    const title = this.scene.add.text(0, -95, 'Crime Scene Lost', {
      fontFamily: 'Special Elite, Arial',
      fontSize: '36px',
      color: '#ffb3b3'
    }).setOrigin(0.5);

    const body = this.scene.add.text(
      0,
      -10,
      [
        'You ran out of time before the scene was fully processed.',
        '',
        `Objects found: ${this.scene.foundItems.size}/${this.scene.activeItems.length}`,
        `Misses: ${this.scene.incorrectClicks}`,
        `Score: ${this.scene.score}`
      ].join('\n'),
      {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#f4f4f4',
        align: 'center',
        lineSpacing: 8,
        wordWrap: { width: panelWidth - 100 }
      }
    ).setOrigin(0.5);

    const btnBg = this.scene.add.rectangle(0, 112, 240, 54, 0x6b2a2a, 1)
      .setStrokeStyle(2, 0xd88b8b, 0.9)
      .setInteractive({ useHandCursor: true });

    const btnText = this.scene.add.text(0, 112, 'Return', {
      fontFamily: 'Press Start 2P, Arial',
      fontSize: '16px',
      color: '#fff1f1'
    }).setOrigin(0.5);

    btnBg.on('pointerover', () => btnBg.setFillStyle(0x823333, 1));
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x6b2a2a, 1));
    btnBg.on('pointerdown', () => {
      this.scene.restoreSourceScene();
      this.scene.returnToSafeScene({
        ...this.scene.returnData,
        hiddenObjectsSuccess: false,
        hiddenObjectsScore: this.scene.score,
        incorrectClicks: this.scene.incorrectClicks,
        foundItems: Array.from(this.scene.foundItems),
        sceneId: this.scene.sceneId
      });
    });

    this.resultContainer.add([panel, title, body, btnBg, btnText]);

    this.scene.tweens.add({
      targets: this.resultOverlay,
      alpha: 1,
      duration: 220,
      ease: 'Power2'
    });

    this.scene.tweens.add({
      targets: this.resultContainer,
      alpha: 1,
      y: centerY - 6,
      duration: 280,
      ease: 'Back.Out'
    });
  }
}