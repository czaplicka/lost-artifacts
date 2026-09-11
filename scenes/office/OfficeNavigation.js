export class OfficeNavigation {
  constructor(scene, options = {}) {
    this.scene = scene;

    this.roomOrder = options.roomOrder ?? [];
    this.viewPositions = options.viewPositions ?? {};

    this.currentView = options.initialView ?? 'office';

    this.isLocked = false;
    this.isMoving = false;

    this.leftArrow = null;
    this.rightArrow = null;
    this.navHint = null;
    this.introHint = null;

    this.cameraTween = null;
  }

  create() {
    const { width, height } = this.scene.scale;

    this.leftArrow = this.createArrowButton(
      54,
      height / 2,
      'left',
    );

    this.rightArrow = this.createArrowButton(
      width - 54,
      height / 2,
      'right',
    );

    this.navHint = this.scene.add
      .text(width / 2, 84, '', {
        fontFamily: 'SpecialElite',
        fontSize: '20px',
        color: '#f0e6b8',
        backgroundColor: '#000000',
        padding: {
          left: 10,
          right: 10,
          top: 8,
          bottom: 8,
        },
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
          fontFamily: 'SpecialElite',
          fontSize: '18px',
          color: '#fff4c7',
          backgroundColor: '#000000',
          padding: {
            left: 12,
            right: 12,
            top: 8,
            bottom: 8,
          },
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001)
      .setAlpha(0);

    this.leftArrow
      .on('pointerdown', (pointer) => {
        pointer?.event?.stopPropagation?.();

        console.log('[OfficeNavigation] Left arrow clicked.');

        this.moveLeft();
      })
      .on('pointerover', () => {
        if (this.isLocked || this.isMoving) {
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
      .on('pointerdown', (pointer) => {
        pointer?.event?.stopPropagation?.();

        console.log('[OfficeNavigation] Right arrow clicked.');

        this.moveRight();
      })
      .on('pointerover', () => {
        if (this.isLocked || this.isMoving) {
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
          to: 1,
        },
        duration: 850,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }),
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
      12,
    );

    graphics.lineStyle(3, 0xf0e6b8, 0.95);
    graphics.strokeRoundedRect(
      -buttonWidth / 2,
      -buttonHeight / 2,
      buttonWidth,
      buttonHeight,
      12,
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
        cursor: 'pointer',
      });
  }

  moveLeft() {
    if (this.isLocked || this.isMoving) {
      return false;
    }

    const currentIndex = this.roomOrder.indexOf(this.currentView);

    if (currentIndex <= 0) {
      return false;
    }

    return this.goTo(this.roomOrder[currentIndex - 1]);
  }

  moveRight() {
    if (this.isLocked || this.isMoving) {
      return false;
    }

    const currentIndex = this.roomOrder.indexOf(this.currentView);

    if (
      currentIndex === -1 ||
      currentIndex >= this.roomOrder.length - 1
    ) {
      return false;
    }

    return this.goTo(this.roomOrder[currentIndex + 1]);
  }

  goTo(viewName, animate = true) {
    if (this.isLocked || this.isMoving) {
      return false;
    }

    const targetX = this.viewPositions[viewName];

    if (!Number.isFinite(targetX)) {
      console.error(
        '[OfficeNavigation] Invalid or missing room position:',
        {
          viewName,
          targetX,
          viewPositions: this.viewPositions,
        },
      );

      return false;
    }

    const camera = this.scene.cameras.main;

    if (!camera) {
      console.error(
        '[OfficeNavigation] Main camera is unavailable.',
      );

      return false;
    }

    console.log('[OfficeNavigation] Room transition:', {
      from: this.currentView,
      to: viewName,
      currentScrollX: camera.scrollX,
      targetX,
      animate,
      cameraBounds: camera.getBounds(),
    });

    this.currentView = viewName;

    /*
     * OfficeScene też przechowuje aktualny widok.
     * To przyda się hotspotom, tutorialowi i ewentualnym zapisom.
     */
    this.scene.currentView = viewName;

    this.updateVisibility();
    this.hideHint();

    if (this.cameraTween) {
      this.cameraTween.stop();
      this.cameraTween.remove();
      this.cameraTween = null;
    }

    const onComplete = () => {
      camera.setScroll(targetX, 0);

      this.isMoving = false;
      this.cameraTween = null;

      this.scene.events.emit('officeRoomChanged', {
        room: viewName,
        x: targetX,
      });

      /*
       * To jest metoda, którą rzeczywiście masz w OfficeScene.
       */
      if (viewName === 'office') {
        this.scene.notifyTutorialOfficeReached?.();
      }

      this.updateVisibility();

      console.log('[OfficeNavigation] Room reached:', {
        viewName,
        finalScrollX: camera.scrollX,
      });
    };

    if (!animate) {
      camera.setScroll(targetX, 0);
      onComplete();

      return true;
    }

    this.isMoving = true;
    this.updateVisibility();

    this.cameraTween = this.scene.tweens.add({
      targets: camera,
      scrollX: targetX,
      duration: 550,
      ease: 'Sine.easeInOut',
      onComplete,
    });

    /*
     * addTrackedTween jest przydatne, jeśli BaseScene sprząta tweens
     * przy shutdownie. Nie używamy jego wyniku jako tweena, ponieważ
     * nie wiemy, czy metoda cokolwiek zwraca.
     */
    this.scene.addTrackedTween?.(this.cameraTween);

    return true;
  }

  setLocked(locked) {
    this.isLocked = Boolean(locked);

    [this.leftArrow, this.rightArrow].forEach((arrow) => {
      if (!arrow) {
        return;
      }

      if (this.isLocked) {
        arrow.disableInteractive();
        arrow.setAlpha(0.35);
      } else {
        arrow.setInteractive({
          useHandCursor: true,
          cursor: 'pointer',
        });

        arrow.setAlpha(0.75);
      }
    });

    if (this.isLocked) {
      this.hideHint();
    }

    this.updateVisibility();
  }

  showHint(text) {
    if (!text || !this.navHint || this.isLocked) {
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

    const canMoveLeft =
      !this.isLocked &&
      !this.isMoving &&
      currentIndex > 0;

    const canMoveRight =
      !this.isLocked &&
      !this.isMoving &&
      currentIndex >= 0 &&
      currentIndex < this.roomOrder.length - 1;

    if (this.leftArrow) {
      this.leftArrow.setVisible(currentIndex > 0);
      this.leftArrow.setAlpha(
        canMoveLeft ? 0.95 : 0.35,
      );

      if (this.leftArrow.input) {
        this.leftArrow.input.enabled = canMoveLeft;
      }
    }

    if (this.rightArrow) {
      this.rightArrow.setVisible(
        currentIndex >= 0 &&
        currentIndex < this.roomOrder.length - 1,
      );

      this.rightArrow.setAlpha(
        canMoveRight ? 0.95 : 0.35,
      );

      if (this.rightArrow.input) {
        this.rightArrow.input.enabled = canMoveRight;
      }
    }
  }

  getLeftRoomLabel() {
    const currentIndex = this.roomOrder.indexOf(this.currentView);

    if (currentIndex <= 0) {
      return '';
    }

    return `Go to ${this.getRoomLabel(
      this.roomOrder[currentIndex - 1],
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
      this.roomOrder[currentIndex + 1],
    )}`;
  }

  getRoomLabel(roomKey) {
    const labels = {
      elevator: 'elevator',
      storage: 'storage',
      office: 'main office',
      cabinet: 'records room',
      archive: 'archive',
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
        ease: 'Power2',
      }),
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
          ease: 'Power2',
        }),
      );
    });
  }

  destroy() {
    if (this.cameraTween) {
      this.cameraTween.stop();
      this.cameraTween.remove();
      this.cameraTween = null;
    }

    [
      this.leftArrow,
      this.rightArrow,
      this.navHint,
      this.introHint,
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