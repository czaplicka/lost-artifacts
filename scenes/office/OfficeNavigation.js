export class OfficeNavigation {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.roomOrder = options.roomOrder ?? [];
    this.viewPositions = options.viewPositions ?? {};

    this.currentView = options.initialView ?? 'office';
    this.isLocked = false;

    this.leftArrow = null;
    this.rightArrow = null;
    this.navHint = null;
    this.introHint = null;
  }

  create() {
    const { width, height } = this.scene.scale;

    this.leftArrow = this.createArrowButton(54, height / 2, 'left');

    this.rightArrow = this.createArrowButton(
      width - 54,
      height / 2,
      'right'
    );

    this.navHint = this.scene.add
      .text(width / 2, 84, '', {
        fontFamily: 'Special Elite',
        fontSize: '20px',
        color: '#f0e6b8',
        backgroundColor: '#000000',
        padding: {
          left: 10,
          right: 10,
          top: 8,
          bottom: 8
        }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001)
      .setVisible(false);

    this.introHint = this.scene.add
      .text(
        width / 2,
        40,
        'Explore the office — move left or right',
        {
          fontFamily: 'Special Elite',
          fontSize: '18px',
          color: '#fff4c7',
          backgroundColor: '#000000',
          padding: {
            left: 12,
            right: 12,
            top: 8,
            bottom: 8
          }
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001)
      .setAlpha(0);

    this.leftArrow
      .on('pointerdown', () => this.moveLeft())
      .on('pointerover', () => {
        if (this.isLocked) {
          return;
        }

        this.leftArrow.setScale(1.1);
        this.leftArrow.setAlpha(1);
        this.showHint(this.getLeftRoomLabel());
      })
      .on('pointerout', () => {
        this.leftArrow.setScale(1);

        if (!this.isLocked) {
          this.leftArrow.setAlpha(0.95);
        }

        this.hideHint();
      });

    this.rightArrow
      .on('pointerdown', () => this.moveRight())
      .on('pointerover', () => {
        if (this.isLocked) {
          return;
        }

        this.rightArrow.setScale(1.1);
        this.rightArrow.setAlpha(1);
        this.showHint(this.getRightRoomLabel());
      })
      .on('pointerout', () => {
        this.rightArrow.setScale(1);

        if (!this.isLocked) {
          this.rightArrow.setAlpha(0.95);
        }

        this.hideHint();
      });

    this.scene.addTrackedTween(
      this.scene.tweens.add({
        targets: [this.leftArrow, this.rightArrow],
        alpha: {
          from: 0.72,
          to: 1
        },
        duration: 850,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
    );

    this.updateVisibility();
  }

  createArrowButton(x, y, direction) {
    const buttonWidth = 78;
    const buttonHeight = 96;
    const isLeft = direction === 'left';

    const graphics = this.scene.add.graphics();

    graphics.fillStyle(0x120f0b, 0.78);
    graphics.fillRoundedRect(
      -buttonWidth / 2,
      -buttonHeight / 2,
      buttonWidth,
      buttonHeight,
      12
    );

    graphics.lineStyle(3, 0xf0e6b8, 0.95);
    graphics.strokeRoundedRect(
      -buttonWidth / 2,
      -buttonHeight / 2,
      buttonWidth,
      buttonHeight,
      12
    );

    graphics.fillStyle(0xf0e6b8, 1);

    if (isLeft) {
      graphics.fillTriangle(15, -25, 15, 25, -22, 0);
    } else {
      graphics.fillTriangle(-15, -25, -15, 25, 22, 0);
    }

    return this.scene.add
      .container(x, y, [graphics])
      .setName(`office-navigation-${direction}`)
      .setSize(buttonWidth, buttonHeight)
      .setDepth(10000)
      .setScrollFactor(0)
      .setAlpha(0.95)
      .setInteractive({
        useHandCursor: true,
        cursor: 'pointer'
      });
  }

  moveLeft() {
    if (this.isLocked) {
      return;
    }

    const currentIndex = this.roomOrder.indexOf(this.currentView);

    if (currentIndex <= 0) {
      return;
    }

    this.goTo(this.roomOrder[currentIndex - 1]);
  }

  moveRight() {
    if (this.isLocked) {
      return;
    }

    const currentIndex = this.roomOrder.indexOf(this.currentView);

    if (
      currentIndex === -1 ||
      currentIndex >= this.roomOrder.length - 1
    ) {
      return;
    }

    this.goTo(this.roomOrder[currentIndex + 1]);
  }

  goTo(viewName, animate = true) {
    const targetX = this.viewPositions[viewName];

    if (targetX === undefined) {
      return;
    }

    this.currentView = viewName;
    this.updateVisibility();
    this.hideHint();

    const onComplete = () => {
      if (viewName === 'office') {
        this.scene.tutorialController?.notifyOfficeReached();
      }
    };

    if (!animate) {
      this.scene.cameras.main.scrollX = targetX;
      onComplete();
      return;
    }

    this.scene.addTrackedTween(
      this.scene.tweens.add({
        targets: this.scene.cameras.main,
        scrollX: targetX,
        duration: 550,
        ease: 'Sine.easeInOut',
        onComplete
      })
    );
  }

  setLocked(locked) {
    this.isLocked = locked;

    [this.leftArrow, this.rightArrow].forEach((arrow) => {
      if (!arrow) {
        return;
      }

      if (locked) {
        arrow.disableInteractive();
        arrow.setAlpha(0.35);
      } else {
        arrow.setInteractive({
          useHandCursor: true,
          cursor: 'pointer'
        });
        arrow.setAlpha(0.75);
      }
    });

    if (locked) {
      this.hideHint();
    } else {
      this.updateVisibility();
    }
  }

  showHint(text) {
    if (!text || !this.navHint) {
      return;
    }

    this.navHint.setText(text);
    this.navHint.setVisible(true);
  }

  hideHint() {
    this.navHint?.setVisible(false);
  }

  updateVisibility() {
    const currentIndex = this.roomOrder.indexOf(this.currentView);

    this.leftArrow?.setVisible(currentIndex > 0);

    this.rightArrow?.setVisible(
      currentIndex >= 0 &&
      currentIndex < this.roomOrder.length - 1
    );
  }

  getLeftRoomLabel() {
    const currentIndex = this.roomOrder.indexOf(this.currentView);

    if (currentIndex <= 0) {
      return '';
    }

    return `Go to ${this.getRoomLabel(
      this.roomOrder[currentIndex - 1]
    )}`;
  }

  getRightRoomLabel() {
    const currentIndex = this.roomOrder.indexOf(this.currentView);

    if (
      currentIndex === -1 ||
      currentIndex >= this.roomOrder.length - 1
    ) {
      return '';
    }

    return `Go to ${this.getRoomLabel(
      this.roomOrder[currentIndex + 1]
    )}`;
  }

  getRoomLabel(roomKey) {
    const labels = {
      elevator: 'elevator',
      storage: 'storage',
      office: 'main office',
      cabinet: 'records room',
      archive: 'archive'
    };

    return labels[roomKey] ?? roomKey;
  }

  showIntroHint() {
    if (!this.introHint) {
      return;
    }

    this.scene.addTrackedTween(
      this.scene.tweens.add({
        targets: this.introHint,
        alpha: 1,
        duration: 350,
        ease: 'Power2'
      })
    );

    this.scene.time.delayedCall(2800, () => {
      if (!this.introHint?.scene) {
        return;
      }

      this.scene.addTrackedTween(
        this.scene.tweens.add({
          targets: this.introHint,
          alpha: 0,
          duration: 500,
          ease: 'Power2'
        })
      );
    });
  }

  destroy() {
    [
      this.leftArrow,
      this.rightArrow,
      this.navHint,
      this.introHint
    ].forEach((element) => {
      element?.removeAllListeners();
      element?.destroy();
    });

    this.leftArrow = null;
    this.rightArrow = null;
    this.navHint = null;
    this.introHint = null;
  }
}