// ui/inventory/InventoryDragController.js
import { EventBus } from '../../EventBus.js';
import { inventoryManager } from '../../managers/InventoryManager.js';

export class InventoryDragController {
  constructor(scene, callbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.press = null;
    this.drag = null;
    this.ghost = null;
    this.destroyed = false;
    this.onMove = pointer => this.move(pointer);
    this.onUp = pointer => this.release(pointer);
    this.onCancel = () => this.cancel(true);
    this.onNativeMove = event => {
      const pointer = this.nativePointer(event);
      if (pointer) this.move(pointer);
    };
    this.onNativeUp = event => {
      const pointer = this.nativePointer(event);
      if (pointer) this.release(pointer);
    };
    this.onNativeCancel = event => {
      if (this.nativePointer(event)) this.cancel(true);
    };
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
    window.addEventListener('pointermove', this.onNativeMove);
    window.addEventListener('pointerup', this.onNativeUp);
    window.addEventListener('pointercancel', this.onNativeCancel);
    window.addEventListener('blur', this.onCancel);
  }

  isPending() { return Boolean(this.press); }
  isDragging() { return Boolean(this.drag); }

  nativePointer(event) {
    if (!this.press || this.destroyed) return null;
    if (this.press.nativeId != null && event.pointerId !== this.press.nativeId) return null;
    const rect = this.scene.game.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      id: this.press.pointerId,
      x: (event.clientX - rect.left) * this.scene.scale.width / rect.width,
      y: (event.clientY - rect.top) * this.scene.scale.height / rect.height,
      event
    };
  }

  beginPress(item, pointer) {
    if (this.destroyed || this.press || !item?.id || !this.callbacks.isVisible()
      || pointer.event?.button > 0) return;
    this.press = {
      itemId: item.id, pointerId: pointer.id,
      nativeId: pointer.event?.pointerId,
      x: pointer.x, y: pointer.y, moved: false
    };
  }

  move(pointer) {
    if (!this.press || this.press.pointerId !== pointer.id) return;
    if (Math.hypot(pointer.x - this.press.x, pointer.y - this.press.y) >= 8) {
      this.press.moved = true;
      if (!this.drag) this.startDrag(pointer);
    }
    this.ghost?.setPosition(pointer.x + 18, pointer.y + 18);
    if (this.drag) {
      const { width, height } = this.scene.scale;
      EventBus.emit('inventory:drag-moved', {
        ...this.drag, xRatio: pointer.x / width, yRatio: pointer.y / height
      });
    }
  }

  startDrag(pointer) {
    const item = inventoryManager.getItem(this.press?.itemId);
    if (!item) { this.cancel(false); return; }
    const request = { itemId: item.id, targetSceneKey: null, targetToken: null };
    EventBus.emit('inventory:request-drag-target', request);
    if (!request.targetSceneKey || !request.targetToken) return;
    this.drag = { ...request, pointerId: pointer.id };
    inventoryManager.selectItem(item.id);
    this.ghost = this.scene.add.text(pointer.x + 18, pointer.y + 18,
      `${item.icon || '📦'} ${item.name || item.label || 'Evidence'}`, {
        fontFamily: 'SpecialElite', fontSize: '24px', color: '#ffe29a',
        backgroundColor: '#17110e', padding: { x: 10, y: 8 }
      }).setScrollFactor(0).setDepth(20000);
    this.callbacks.dragStarted();
    EventBus.emit('inventory:drag-started', { ...this.drag });
  }

  release(pointer) {
    if (!this.press || this.press.pointerId !== pointer.id) return;
    const press = this.press;
    const drag = this.drag;
    this.clear();
    if (!drag) {
      if (!press.moved) {
        const item = inventoryManager.getItem(press.itemId);
        if (item) this.callbacks.clicked(item);
      } else {
        EventBus.emit('showDialogue', {
          speaker: 'Detective',
          text: 'No available target. Close any conversation before handing over evidence.'
        });
      }
      this.callbacks.finished();
      return;
    }
    const { width, height } = this.scene.scale;
    const rect = this.scene.game.canvas.getBoundingClientRect();
    const native = pointer.event;
    const outsideCanvas = typeof native?.clientX === 'number' && (
      native.clientX < rect.left || native.clientX > rect.right ||
      native.clientY < rect.top || native.clientY > rect.bottom
    );
    if (outsideCanvas || pointer.x < 0 || pointer.y < 0 || pointer.x > width || pointer.y > height) {
      this.callbacks.cancelled(true);
      this.callbacks.finished();
      return;
    }
    const drop = { ...drag, xRatio: pointer.x / width, yRatio: pointer.y / height, accepted: false };
    EventBus.emit('inventory:item-dropped', drop);
    if (!drop.accepted) {
      this.callbacks.cancelled(true);
      EventBus.emit('showDialogue', {
        speaker: 'Detective',
        text: 'Not handed over. Drop the evidence inside the highlighted target.'
      });
    }
    this.callbacks.finished();
  }

  clear() {
    const drag = this.drag;
    this.press = null;
    this.drag = null;
    this.ghost?.destroy();
    this.ghost = null;
    if (drag) EventBus.emit('inventory:drag-ended', { ...drag });
  }

  cancel(reopen = false) {
    if (this.destroyed) return;
    const wasDragging = Boolean(this.drag);
    this.clear();
    this.callbacks.cancelled(reopen && wasDragging);
    this.callbacks.finished();
  }

  destroy() {
    if (this.destroyed) return;
    this.clear();
    this.destroyed = true;
    this.scene?.input?.off('pointermove', this.onMove, this);
    this.scene?.input?.off('pointerup', this.onUp, this);
    this.scene?.input?.off('pointerupoutside', this.onUp, this);
    window.removeEventListener('pointermove', this.onNativeMove);
    window.removeEventListener('pointerup', this.onNativeUp);
    window.removeEventListener('pointercancel', this.onNativeCancel);
    window.removeEventListener('blur', this.onCancel);
    this.scene = null;
    this.callbacks = null;
  }
}
