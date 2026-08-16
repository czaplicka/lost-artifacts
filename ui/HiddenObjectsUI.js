export class HiddenObjectsUI {
  constructor(scene) {
    this.scene = scene;

    this.timerText = null;
    this.scoreText = null;
    this.missesText = null;
    this.listText = null;
    this.messageText = null;
    this.backBtn = null;
    this.resultOverlay = null;
    this.resultContainer = null;
  }

  createSidebarUI() {
    const { width, height } = this.scene.scale;
    const sidebarWidth = this.scene.sidebarWidth;

    this.scene.add
      .rectangle(0, 0, sidebarWidth, height, 0x111111, 0.94)
      .setOrigin(0, 0)
      .setDepth(1000);

    this.scene.add
      .rectangle(18, 18, sidebarWidth - 36, height - 36, 0x1b1b1f, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xc8a75a, 0.45)
      .setDepth(1000);

    this.scene.add
      .text(34, 34, this.scene.title, {
        fontFamily: 'Special Elite, Arial',
        fontSize: '26px',
        color: '#ffffff',
        wordWrap: {
          width: sidebarWidth - 90
        }
      })
      .setDepth(1001);

    this.timerText = this.scene.add
      .text(
        34,
        88,
        `Time: ${this.scene.formatTime(this.scene.timeLeft)}`,
        {
          fontFamily: 'Arial',
          fontSize: '22px',
          color: '#ffd966'
        }
      )
      .setDepth(1001);

    this.scoreText = this.scene.add
      .text(220, 88, `Score: ${this.scene.score}`, {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#7CFC00'
      })
      .setDepth(1001);

    this.missesText = this.scene.add
      .text(34, 114, `Misses: ${this.scene.incorrectClicks}`, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ff8a8a'
      })
      .setDepth(1001);

    this.scene.add
      .text(34, 142, 'Find these objects:', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold'
      })
      .setDepth(1001);

    this.listText = this.scene.add
      .text(34, 170, this.buildListText(), {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#f2f2f2',
        lineSpacing: 8,
        wordWrap: {
          width: sidebarWidth - 68
        }
      })
      .setDepth(1001);

    this.messageText = this.scene.add
      .text(34, height - 170, '', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffd966',
        wordWrap: {
          width: sidebarWidth - 68
        },
        lineSpacing: 6
      })
      .setDepth(1001);

    if (this.scene.textures.exists('back')) {
      this.backBtn = this.scene.add
        .image(width - 105, 44, 'back')
        .setDisplaySize(190, 60)
        .setInteractive({
          useHandCursor: true
        })
        .setDepth(1001);
    } else {
      this.backBtn = this.scene.add
        .text(width - 155, 24, 'RETURN TO CITY', {
          fontFamily: 'Press Start 2P, Arial',
          fontSize: '12px',
          color: '#ffffff',
          backgroundColor: '#222222',
          padding: {
            left: 16,
            right: 16,
            top: 12,
            bottom: 12
          }
        })
        .setOrigin(0.5, 0)
        .setInteractive({
          useHandCursor: true
        })
        .setDepth(1001);
    }

    this.backBtn.on('pointerover', () => {
      this.backBtn.setScale(1.05);
    });

    this.backBtn.on('pointerout', () => {
      this.backBtn.setScale(1);
    });

    this.backBtn.on('pointerdown', () => {
      this.scene.abandonGame();
    });
  }

  buildListText() {
    return this.scene.activeItems
      .map((item) => {
        const found = this.scene.foundItems.has(item.id);

        return `${found ? '✓' : '•'} ${item.item}`;
      })
      .join('\n');
  }

  refreshList() {
    if (this.listText) {
      this.listText.setText(this.buildListText());
    }
  }

  updateTimer(timeLeft) {
    if (this.timerText) {
      this.timerText.setText(
        `Time: ${this.scene.formatTime(timeLeft)}`
      );
    }
  }

  updateScoreAndMisses(score, misses) {
    if (this.scoreText) {
      this.scoreText.setText(`Score: ${score}`);
    }

    if (this.missesText) {
      this.missesText.setText(`Misses: ${misses}`);
    }
  }

  showMessage(text, color = '#ffd966') {
    if (!this.messageText) {
      return;
    }

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

  showSuccessOverlay() {
    const { width, height } = this.scene.scale;
    const panelWidth = 700;
    const panelHeight = 420;
    const centerX =
      this.scene.sidebarWidth +
      (width - this.scene.sidebarWidth) / 2;
    const centerY = height / 2;

    const remainingTimeBonus = this.scene.timeLeft * 2;
    const finalScore = this.scene.score;

    this.resultOverlay = this.scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.72)
      .setOrigin(0, 0)
      .setDepth(3000)
      .setAlpha(0);

    this.resultContainer = this.scene.add
      .container(centerX, centerY)
      .setDepth(3001)
      .setAlpha(0);

    const panel = this.scene.add
      .rectangle(0, 0, panelWidth, panelHeight, 0x181511, 0.98)
      .setStrokeStyle(3, 0xd4af37, 0.9);

    const title = this.scene.add
      .text(0, -155, 'Crime Scene Complete', {
        fontFamily: 'Special Elite, Arial',
        fontSize: '38px',
        color: '#f8e7b9',
        align: 'center'
      })
      .setOrigin(0.5);

    const subtitle = this.scene.add
      .text(0, -104, 'The forensic sweep is finished.', {
        fontFamily: 'Press Start 2P, Arial',
        fontSize: '22px',
        color: '#f2f2f2',
        align: 'center'
      })
      .setOrigin(0.5);

    const stats = this.scene.add
      .text(
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
          fontFamily: 'Press Start 2P, Arial',
          fontSize: '24px',
          color: '#ffffff',
          align: 'center',
          lineSpacing: 10
        }
      )
      .setOrigin(0.5);

    const note = this.scene.add
      .text(
        0,
        112,
        'Evidence logged. Return to the city and continue the investigation.',
        {
          fontFamily: 'Press Start 2P, Arial',
          fontSize: '19px',
          color: '#d8d8d8',
          align: 'center',
          wordWrap: {
            width: panelWidth - 100
          }
        }
      )
      .setOrigin(0.5);

    const buttonLabel = 'RETURN TO CRIME CITY';
    const continueBtnWidth = 430;
    const continueBtnHeight = 64;
    const continueBtnY = 175;

    const continueBtnBg = this.scene.add
      .rectangle(
        0,
        continueBtnY,
        continueBtnWidth,
        continueBtnHeight,
        0x8b6b2f,
        1
      )
      .setStrokeStyle(3, 0xf0d48a, 0.95)
      .setInteractive({
        useHandCursor: true
      });

    const continueBtnText = this.scene.add
      .text(0, continueBtnY, buttonLabel, {
        fontFamily: 'Press Start 2P, Arial',
        fontSize: '14px',
        color: '#fff7dc'
      })
      .setOrigin(0.5)
      .setInteractive({
        useHandCursor: true
      });

    const continueToCity = () => {
      this.scene.playSfx('correct', {
        volume: 0.35
      });

      this.scene.restoreSourceScene();

      this.scene.returnToSafeScene({
        ...this.scene.returnData,
        hiddenObjectsSuccess: true,
        hiddenObjectsScore: finalScore,
        incorrectClicks: this.scene.incorrectClicks,
        foundItems: Array.from(this.scene.foundItems),
        sceneId: this.scene.sceneId
      });
    };

    continueBtnBg.on('pointerover', () => {
      continueBtnBg.setFillStyle(0xa07a34, 1);
      continueBtnText.setColor('#ffffff');
    });

    continueBtnBg.on('pointerout', () => {
      continueBtnBg.setFillStyle(0x8b6b2f, 1);
      continueBtnText.setColor('#fff7dc');
    });

    continueBtnBg.on('pointerdown', continueToCity);
    continueBtnText.on('pointerdown', continueToCity);

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

  showFailureOverlay() {
    const { width, height } = this.scene.scale;
    const panelWidth = 680;
    const panelHeight = 340;
    const centerX =
      this.scene.sidebarWidth +
      (width - this.scene.sidebarWidth) / 2;
    const centerY = height / 2;

    this.resultOverlay = this.scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.68)
      .setOrigin(0, 0)
      .setDepth(3000)
      .setAlpha(0);

    this.resultContainer = this.scene.add
      .container(centerX, centerY)
      .setDepth(3001)
      .setAlpha(0);

    const panel = this.scene.add
      .rectangle(0, 0, panelWidth, panelHeight, 0x1c1212, 0.98)
      .setStrokeStyle(3, 0xa44a4a, 0.95);

    const title = this.scene.add
      .text(0, -95, 'Crime Scene Lost', {
        fontFamily: 'Special Elite, Arial',
        fontSize: '36px',
        color: '#ffb3b3'
      })
      .setOrigin(0.5);

    const body = this.scene.add
      .text(
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
          wordWrap: {
            width: panelWidth - 100
          }
        }
      )
      .setOrigin(0.5);

    const buttonLabel = 'RETURN TO CRIME CITY';
    const buttonWidth = 410;
    const buttonHeight = 62;
    const buttonY = 112;

    const btnBg = this.scene.add
      .rectangle(
        0,
        buttonY,
        buttonWidth,
        buttonHeight,
        0x6b2a2a,
        1
      )
      .setStrokeStyle(3, 0xd88b8b, 0.9)
      .setInteractive({
        useHandCursor: true
      });

    const btnText = this.scene.add
      .text(0, buttonY, buttonLabel, {
        fontFamily: 'Press Start 2P, Arial',
        fontSize: '14px',
        color: '#fff1f1'
      })
      .setOrigin(0.5)
      .setInteractive({
        useHandCursor: true
      });

    const returnToCity = () => {
      this.scene.restoreSourceScene();

      this.scene.returnToSafeScene({
        ...this.scene.returnData,
        hiddenObjectsSuccess: false,
        hiddenObjectsScore: this.scene.score,
        incorrectClicks: this.scene.incorrectClicks,
        foundItems: Array.from(this.scene.foundItems),
        sceneId: this.scene.sceneId
      });
    };

    btnBg.on('pointerover', () => {
      btnBg.setFillStyle(0x823333, 1);
      btnText.setColor('#ffffff');
    });

    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(0x6b2a2a, 1);
      btnText.setColor('#fff1f1');
    });

    btnBg.on('pointerdown', returnToCity);
    btnText.on('pointerdown', returnToCity);

    this.resultContainer.add([
      panel,
      title,
      body,
      btnBg,
      btnText
    ]);

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