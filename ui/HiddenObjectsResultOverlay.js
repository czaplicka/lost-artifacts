export class HiddenObjectsResultOverlay {
  /**
   * @param {Phaser.Scene} scene - Instancja HiddenObjectsScene
   */
  constructor(scene) {
    this.scene = scene;
    this.resultOverlay = null;
    this.resultContainer = null;
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
   * Wyświetla animowany popup po upływie czasu.
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

  /**
   * Usuwa nakładki z pamięci.
   */
  destroy() {
    if (this.resultContainer) {
      this.resultContainer.destroy();
      this.resultContainer = null;
    }
    if (this.resultOverlay) {
      this.resultOverlay.destroy();
      this.resultOverlay = null;
    }
  }
}