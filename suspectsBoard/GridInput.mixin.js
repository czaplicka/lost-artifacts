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
      this.inRect(pointer, this.regions.body) ||
      this.inRect(pointer, this.regions.scene) ||
      this.inRect(pointer, this.regions.header) ||
      this.inRect(pointer, this.regions.names)
    );
  },

  applyScroll() {
    if (!this.gridOrigin) return;

    const { bodyX, bodyY, sceneY, headerY, nameX } = this.gridOrigin;

    this.bodyContainer?.setPosition(
      bodyX + this.scrollX,
      bodyY + this.scrollY
    );
    this.headerContainer?.setPosition(bodyX + this.scrollX, headerY);
    this.sceneContainer?.setPosition(bodyX + this.scrollX, sceneY);
    this.nameContainer?.setPosition(nameX, bodyY + this.scrollY);

    if (this.clueListContainer && this.regions.clueList) {
      this.clueListContainer.setPosition(
        this.regions.clueList.x,
        this.regions.clueList.y + this.clueScrollY
      );
    }
  },

  handlePointerDown(pointer) {
    this.dragMoved = false;
    this.dragTarget = null;

    if (this.modalOpen) return;

    if (this.isOverGrid(pointer)) {
      this.dragTarget = 'grid';
    } else if (this.inRect(pointer, this.regions.clueList)) {
      this.dragTarget = 'clues';
    }

    this.dragStart = {
      x: pointer.x,
      y: pointer.y,
      sx: this.scrollX,
      sy: this.scrollY,
      cy: this.clueScrollY
    };
  },

  handlePointerMove(pointer) {
    if (!this.dragTarget || !pointer.isDown) return;

    const dx = pointer.x - this.dragStart.x;
    const dy = pointer.y - this.dragStart.y;

    if (!this.dragMoved && Math.hypot(dx, dy) > 8) {
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
    } else {
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
  },

  handleWheel(pointer, _objects, deltaX, deltaY) {
    if (this.modalOpen) return;

    if (this.inRect(pointer, this.regions.clueList)) {
      this.clueScrollY = Phaser.Math.Clamp(
        this.clueScrollY - deltaY,
        this.minClueScroll,
        0
      );
      this.applyScroll();
      return;
    }

    if (this.isOverGrid(pointer)) {
      const horizontal =
        pointer.event?.shiftKey || Math.abs(deltaX) > Math.abs(deltaY);
      const amount = horizontal && Math.abs(deltaX) > 0 ? deltaX : deltaY;

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
  }
};