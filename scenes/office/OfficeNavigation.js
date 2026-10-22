const ARROW_TEXTURE_KEY = 'office-navigation-arrow-v1';

export class OfficeNavigation {
  constructor(scene, options = {}) {
    this.scene = scene;

    this.roomOrder = options.roomOrder ?? [];
    this.viewPositions = options.viewPositions ?? {};
    this.currentView = options.initialView ?? 'office';

    this.isLocked = false;
    this.isMoving = false;
    this.isVisible = true;
    this.isDestroyed = false;

    this.leftArrow = null;
    this.rightArrow = null;
    this.navHint = null;
    this.introHint = null;

    this.cameraTween = null;
    this.introTween = null;
    this.introTimer = null;

    this.arrowStates = new Map();
  }

  create() {
    const { width, height } = this.scene.scale;

    this.createArrowTexture();

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

    this.bindArrow(
      this.leftArrow,
      () => this.moveLeft(),
      () => this.getLeftRoomLabel(),
    );

    this.bindArrow(
      this.rightArrow,
      () => this.moveRight(),
      () => this.getRightRoomLabel(),
    );

    this.updateVisibility();
  }

  createArrowTexture() {
    if (this.scene.textures.exists(ARROW_TEXTURE_KEY)) {
      return;
    }

    const graphics = this.scene.make.graphics({
      x: 0,
      y: 0,
      add: false,
    });

    graphics.fillStyle(0x120f0b, 0.78);
    graphics.fillRoundedRect(2, 2, 78, 96, 12);

    graphics.lineStyle(3, 0xf0e6b8, 0.95);
    graphics.strokeRoundedRect(2, 2, 78, 96, 12);

    graphics.fillStyle(0xf0e6b8, 1);
    graphics.fillTriangle(56, 25, 56, 75, 19, 50);

    graphics.generateTexture(ARROW_TEXTURE_KEY, 82, 100);
    graphics.destroy();
  }

  createArrowButton(x, y, direction) {
    const arrow = this.scene.add
      .image(x, y, ARROW_TEXTURE_KEY)
      .setName(`office-navigation-${direction}`)
      .setDepth(10000)
      .setScrollFactor(0)
      .setAlpha(0.95)
      .setFlipX(direction === 'right')
      .setInteractive({
        useHandCursor: true,
        cursor: 'pointer',
      });

    const tween = this.scene.tweens.add({
      targets: arrow,
      alpha: {
        from: 0.72,
        to: 1,
      },
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      paused: true,
    });

    this.arrowStates.set(arrow, {
      tween,
      canMove: false,
      hovered: false,
    });

    // Obsługuje również bezpośrednie arrow.setVisible(false).
    const originalSetVisible = arrow.setVisible;

    arrow.setVisible = (visible) => {
      originalSetVisible.call(arrow, visible);

      const state = this.arrowStates.get(arrow);

      if (state && !visible) {
        state.hovered = false;
        arrow.setScale(1);
        this.hideHint();
      }

      this.refreshArrow(arrow);

      return arrow;
    };

    return arrow;
  }

  bindArrow(arrow, move, getLabel) {
    arrow
      .on('pointerdown', (pointer) => {
        pointer?.event?.stopPropagation?.();

        if (!this.canUseArrow(arrow)) {
          return;
        }

        move();
      })
      .on('pointerover', () => {
        if (!this.canUseArrow(arrow)) {
          return;
        }

        const state = this.arrowStates.get(arrow);
        state.hovered = true;

        this.refreshArrow(arrow);
        this.showHint(getLabel());
      })
      .on('pointerout', () => {
        const state = this.arrowStates.get(arrow);

        if (!state) {
          return;
        }

        state.hovered = false;

        this.refreshArrow(arrow);
        this.hideHint();
      });
  }

  canUseArrow(arrow) {
    const state = this.arrowStates.get(arrow);

    return Boolean(
      state &&
      state.canMove &&
      arrow.visible &&
      this.isVisible &&
      !this.isLocked &&
      !this.isMoving &&
      !this.isDestroyed
    );
  }

  refreshArrow(arrow) {
    const state = this.arrowStates.get(arrow);

    if (!state || this.isDestroyed) {
      return;
    }

    const enabled = this.canUseArrow(arrow);

    if (arrow.input) {
      arrow.input.enabled = enabled;
    }

    if (!enabled || state.hovered) {
      state.tween.pause();

      if (!enabled) {
        state.hovered = false;
      }

      arrow.setScale(enabled && state.hovered ? 1.1 : 1);
      arrow.setAlpha(enabled ? 1 : 0.35);

      return;
    }

    arrow.setScale(1);
    state.tween.resume();
  }

  moveLeft() {
    if (
      this.isLocked ||
      this.isMoving ||
      this.isDestroyed ||
      !this.isVisible
    ) {
      return false;
    }

    const currentIndex = this.roomOrder.indexOf(this.currentView);

    if (currentIndex <= 0) {
      return false;
    }

    return this.goTo(this.roomOrder[currentIndex - 1]);
  }

  moveRight() {
    if (
      this.isLocked ||
      this.isMoving ||
      this.isDestroyed ||
      !this.isVisible
    ) {
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
    if (this.isLocked || this.isMoving || this.isDestroyed) {
      return false;
    }

    const targetX = this.viewPositions[viewName];

    if (!Number.isFinite(targetX)) {
      console.error(
        '[OfficeNavigation] Invalid or missing room position:',
        { viewName, targetX },
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

    this.removeCameraTween();

    this.currentView = viewName;
    this.scene.currentView = viewName;
    this.hideHint();

    const onComplete = () => {
      if (this.isDestroyed) {
        return;
      }

      camera.setScroll(targetX, 0);

      this.isMoving = false;
      this.cameraTween = null;

      this.scene.events.emit('officeRoomChanged', {
        room: viewName,
        x: targetX,
      });

      if (this.isDestroyed) {
        return;
      }

      if (viewName === 'office') {
        this.scene.notifyTutorialOfficeReached?.();
      }

      this.updateVisibility();
    };

    if (!animate) {
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

    return true;
  }

  removeCameraTween() {
    if (!this.cameraTween) {
      return;
    }

    this.cameraTween.remove();
    this.cameraTween = null;
  }

  setLocked(locked) {
    this.isLocked = Boolean(locked);

    if (this.isLocked) {
      this.hideHint();
    }

    this.updateVisibility();

    return this;
  }

  setVisible(visible) {
    this.isVisible = Boolean(visible);

    if (!this.isVisible) {
      this.hideHint();
    }

    this.introHint?.setVisible(this.isVisible);

    if (this.introTween) {
      if (this.isVisible) {
        this.introTween.resume();
      } else {
        this.introTween.pause();
      }
    }

    this.updateVisibility();

    return this;
  }

  showHint(text) {
    if (
      !text ||
      !this.navHint ||
      !this.isVisible ||
      this.isLocked ||
      this.isMoving ||
      this.isDestroyed
    ) {
      return;
    }

    this.navHint.setText(text).setVisible(true);
  }

  hideHint() {
    this.navHint?.setVisible(false);
  }

  updateVisibility() {
    if (this.isDestroyed) {
      return;
    }

    const currentIndex = this.roomOrder.indexOf(this.currentView);

    this.updateArrow(
      this.leftArrow,
      currentIndex > 0,
    );

    this.updateArrow(
      this.rightArrow,
      currentIndex >= 0 &&
        currentIndex < this.roomOrder.length - 1,
    );
  }

  updateArrow(arrow, hasDestination) {
    const state = this.arrowStates.get(arrow);

    if (!arrow || !state) {
      return;
    }

    state.canMove = hasDestination;

    arrow.setVisible(this.isVisible && hasDestination);
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

  clearIntroAnimation() {
    if (this.introTimer) {
      this.introTimer.remove(false);
      this.introTimer = null;
    }

    if (this.introTween) {
      this.introTween.remove();
      this.introTween = null;
    }
  }

  showIntroHint() {
    if (!this.introHint || this.isDestroyed) {
      return;
    }

    this.clearIntroAnimation();

    this.introHint
      .setAlpha(0)
      .setVisible(this.isVisible);

    this.introTween = this.scene.tweens.add({
      targets: this.introHint,
      alpha: 1,
      duration: 350,
      ease: 'Power2',
      paused: !this.isVisible,
      onComplete: () => {
        this.introTween = null;
      },
    });

    this.introTimer = this.scene.time.delayedCall(2800, () => {
      this.introTimer = null;

      if (this.isDestroyed || !this.introHint?.scene) {
        return;
      }

      if (this.introTween) {
        this.introTween.remove();
        this.introTween = null;
      }

      if (!this.isVisible) {
        this.introHint.setAlpha(0);
        return;
      }

      this.introTween = this.scene.tweens.add({
        targets: this.introHint,
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          this.introTween = null;
        },
      });
    });
  }

  destroy() {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;

    this.removeCameraTween();
    this.clearIntroAnimation();

    for (const state of this.arrowStates.values()) {
      state.tween.remove();
    }

    this.arrowStates.clear();

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