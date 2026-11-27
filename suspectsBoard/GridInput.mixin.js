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
      false
    );

    scene.events.off('shutdown', cleanup);
    scene.events.off('destroy', cleanup);

    if (wheelGuards.get(scene)?.cleanup === cleanup) {
      wheelGuards.delete(scene);
    }
  };

  // Bubble phase, added after Phaser's own canvas listener, so Phaser sees the
  // wheel first. Phaser ignores events that are already defaultPrevented
  // (MouseManager.onMouseWheel), so a capture-phase guard broke wheel scrolling.
  // passive:false still allows cancelling the browser's page scroll.
  canvas.addEventListener('wheel', onWheel, {
    passive: false,
    capture: false
  });

  scene.events.once('shutdown', cleanup);
  scene.events.once('destroy', cleanup);

  wheelGuards.set(scene, {
    canvas,
    cleanup
  });
}

// The scroll value each scrollbar drives (keys match addScrollbar calls).
const SCROLL_FIELDS = { gridH: 'scrollX', gridV: 'scrollY', clues: 'clueScrollY' };
// The bars are drawn 6 px thick; the hit area is wider so they are easy to grab.
const SCROLLBAR_HIT_PAD = 8;

export const GridInputMixin = {
  scrollbarAt(pointer) {
    if (!pointer) return null;

    for (const [key, bar] of Object.entries(this.scrollbars || {})) {
      if (!bar?.thumb?.scene || !SCROLL_FIELDS[key] || !(bar.getMin() < 0)) continue;

      const along = bar.vertical ? pointer.y : pointer.x;
      const across = bar.vertical ? pointer.x : pointer.y;

      if (
        along >= bar.start &&
        along <= bar.start + bar.trackLen &&
        across >= bar.fixed - SCROLLBAR_HIT_PAD &&
        across <= bar.fixed + bar.thickness + SCROLLBAR_HIT_PAD
      ) {
        return key;
      }
    }

    return null;
  },

  // grab: distance from the thumb's start to the pointer, kept while dragging.
  dragScrollbar(key, pointer, grab) {
    const bar = this.scrollbars?.[key], field = SCROLL_FIELDS[key];
    if (!bar || !field) return;

    const min = bar.getMin();
    if (!(min < 0)) return;

    const room = Math.max(1, bar.trackLen - bar.thumbLen);
    const along = bar.vertical ? pointer.y : pointer.x;
    const fraction = Phaser.Math.Clamp((along - bar.start - grab) / room, 0, 1);

    this[field] = min * fraction;
    this.applyScroll();
  },

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
    this.dragBar = null;

    if (
      !pointer ||
      this.modalOpen ||
      this.gridLeaving ||
      this._cleanupDone
    ) {
      return;
    }

    // Scrollbars sit on top of the grid edge, so they are checked first.
    const barKey = this.scrollbarAt(pointer);

    if (barKey) {
      const bar = this.scrollbars[barKey];
      const along = bar.vertical ? pointer.y : pointer.x;
      const thumbStart = bar.vertical ? bar.thumb.y : bar.thumb.x;
      const onThumb = along >= thumbStart && along <= thumbStart + bar.thumbLen;

      // Grabbing the thumb keeps the grab point; a click on the track jumps there.
      this.dragTarget = 'scrollbar';
      this.dragBar = { key: barKey, grab: onThumb ? along - thumbStart : bar.thumbLen / 2 };
      this.dragStart = { x: pointer.x, y: pointer.y, sx: this.scrollX, sy: this.scrollY, cy: this.clueScrollY };
      // Cell and card release handlers ignore this press.
      this.dragMoved = true;

      if (!onThumb) this.dragScrollbar(barKey, pointer, this.dragBar.grab);
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

    if (this.dragTarget === 'scrollbar') {
      if (this.dragBar) this.dragScrollbar(this.dragBar.key, pointer, this.dragBar.grab);
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
    this.dragBar = null;

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