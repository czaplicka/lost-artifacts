const wheelGuards = new WeakMap();

function ensureWheelGuard(scene) {
  const canvas = scene.game?.canvas;

  if (!canvas?.addEventListener) return;

  const existing = wheelGuards.get(scene);

  if (existing?.canvas === canvas) return;

  existing?.cleanup();

  const onWheel = event => {
    if (
      scene._cleanupDone ||
      scene.gridLeaving ||
      !scene.sys.isActive()
    ) {
      return;
    }

    const bounds = canvas.getBoundingClientRect();

    if (bounds.width <= 0 || bounds.height <= 0) {
      return;
    }

    const width = scene.scale.gameSize?.width ??
      scene.scale.width;

    const height = scene.scale.gameSize?.height ??
      scene.scale.height;

    const pointer = {
      x: (event.clientX - bounds.left) *
        width / bounds.width,
      y: (event.clientY - bounds.top) *
        height / bounds.height
    };

    const overGrid = scene.isOverGrid(pointer);

    const overClues = scene.inRect(
      pointer,
      scene.regions?.clueList
    );

    if (!overGrid && !overClues) return;

    if (event.cancelable && !event.defaultPrevented) {
      event.preventDefault();
    }
  };

  const cleanup = () => {
    canvas.removeEventListener(
      'wheel',
      onWheel,
      true
    );

    scene.events.off('shutdown', cleanup);
    scene.events.off('destroy', cleanup);

    if (wheelGuards.get(scene)?.cleanup === cleanup) {
      wheelGuards.delete(scene);
    }
  };

  // Capture phase runs before Phaser's wheel handler.
  // passive:false allows cancellation of the browser's page scroll.
  canvas.addEventListener('wheel', onWheel, {
    passive: false,
    capture: true
  });

  scene.events.once('shutdown', cleanup);
  scene.events.once('destroy', cleanup);

  wheelGuards.set(scene, {
    canvas,
    cleanup
  });
}

export const GridInputMixin = {
  inRect(pointer, rect) {
    if (!rect || !pointer) return false;

    return (
      pointer.x >= rect.x &&
      pointer.x <= rect.x + rect.w &&
      pointer.y >= rect.y &&
      pointer.y <= rect.y + rect.h
    );
  },

  isOverGrid(pointer) {
    return (
      this.inRect(pointer, this.regions?.body) ||
      this.inRect(pointer, this.regions?.scene) ||
      this.inRect(pointer, this.regions?.header) ||
      this.inRect(pointer, this.regions?.names)
    );
  },

  applyScroll() {
    // buildUI() already calls applyScroll(), so no scene changes
    // are needed to install the native wheel guard.
    ensureWheelGuard(this);

    if (!this.gridOrigin) return;

    const {
      bodyX,
      bodyY,
      sceneY,
      headerY,
      nameX
    } = this.gridOrigin;

    this.bodyContainer?.setPosition(
      bodyX + this.scrollX,
      bodyY + this.scrollY
    );

    this.headerContainer?.setPosition(
      bodyX + this.scrollX,
      headerY
    );

    this.sceneContainer?.setPosition(
      bodyX + this.scrollX,
      sceneY
    );

    this.nameContainer?.setPosition(
      nameX,
      bodyY + this.scrollY
    );

    if (
      this.clueListContainer &&
      this.regions?.clueList
    ) {
      this.clueListContainer.setPosition(
        this.regions.clueList.x,
        this.regions.clueList.y + this.clueScrollY
      );
    }

    this.updateScrollbars?.();
  },

  handlePointerDown(pointer) {
    this.dragMoved = false;
    this.dragTarget = null;
    this.dragStart = null;

    if (
      !pointer ||
      this.modalOpen ||
      this.gridLeaving ||
      this._cleanupDone
    ) {
      return;
    }

    if (this.isOverGrid(pointer)) {
      this.dragTarget = 'grid';
    } else if (
      this.inRect(pointer, this.regions?.clueList)
    ) {
      this.dragTarget = 'clues';
    }

    if (!this.dragTarget) return;

    this.dragStart = {
      x: pointer.x,
      y: pointer.y,
      sx: this.scrollX,
      sy: this.scrollY,
      cy: this.clueScrollY
    };
  },

  handlePointerMove(pointer) {
    if (
      this.modalOpen ||
      this.gridLeaving ||
      this._cleanupDone
    ) {
      this.dragTarget = null;
      this.dragStart = null;
      return;
    }

    if (
      !pointer?.isDown ||
      !this.dragTarget ||
      !this.dragStart
    ) {
      return;
    }

    const dx = pointer.x - this.dragStart.x;
    const dy = pointer.y - this.dragStart.y;

    if (
      !this.dragMoved &&
      Math.hypot(dx, dy) > 8
    ) {
      this.dragMoved = true;
    }

    if (!this.dragMoved) return;

    if (this.dragTarget === 'grid') {
      this.scrollX = Phaser.Math.Clamp(
        this.dragStart.sx + dx,
        this.minScrollX,
        0
      );

      this.scrollY = Phaser.Math.Clamp(
        this.dragStart.sy + dy,
        this.minScrollY,
        0
      );
    } else if (this.dragTarget === 'clues') {
      this.clueScrollY = Phaser.Math.Clamp(
        this.dragStart.cy + dy,
        this.minClueScroll,
        0
      );
    }

    this.applyScroll();
  },

  handlePointerUp() {
    this.dragTarget = null;
    this.dragStart = null;

    // Keep dragMoved until the next pointerdown:
    // card pointerup handlers use it to ignore drag releases.
  },

  handleWheel(pointer, _objects, deltaX, deltaY) {
    if (
      !pointer ||
      this.modalOpen ||
      this.gridLeaving ||
      this._cleanupDone
    ) {
      return;
    }

    const dx = Number.isFinite(deltaX) ? deltaX : 0;
    const dy = Number.isFinite(deltaY) ? deltaY : 0;

    if (this.inRect(pointer, this.regions?.clueList)) {
      this.clueScrollY = Phaser.Math.Clamp(
        this.clueScrollY - dy,
        this.minClueScroll,
        0
      );

      this.applyScroll();
      return;
    }

    if (!this.isOverGrid(pointer)) return;

    const horizontal = Boolean(
      pointer.event?.shiftKey ||
      Math.abs(dx) > Math.abs(dy)
    );

    const amount =
      horizontal && Math.abs(dx) > 0
        ? dx
        : dy;

    if (horizontal) {
      this.scrollX = Phaser.Math.Clamp(
        this.scrollX - amount,
        this.minScrollX,
        0
      );
    } else if (this.minScrollY < 0) {
      this.scrollY = Phaser.Math.Clamp(
        this.scrollY - amount,
        this.minScrollY,
        0
      );
    } else {
      this.scrollX = Phaser.Math.Clamp(
        this.scrollX - amount,
        this.minScrollX,
        0
      );
    }

    this.applyScroll();
  }
};