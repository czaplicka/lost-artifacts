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
    this.onWindowUp = () => {
      if (this.press) this.cancel(true);
    };
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onCancel, this);
    window.addEventListener('blur', this.onCancel);
    window.addEventListener('pointercancel', this.onCancel);
    window.addEventListener('pointerup', this.onWindowUp);
  }

  isPending() { return Boolean(this.press); }
  isDragging() { return Boolean(this.drag); }

  beginPress(item, pointer) {
    if (this.destroyed || this.press || !item?.id || !this.callbacks.isVisible() || pointer.event?.button > 0) return;
    this.press = { itemId: item.id, pointerId: pointer.id, x: pointer.x, y: pointer.y };
  }

  move(pointer) {
    if (!this.press || this.press.pointerId !== pointer.id) return;
    if (!this.drag && Math.hypot(pointer.x - this.press.x, pointer.y - this.press.y) >= 8) this.startDrag(pointer);
    this.ghost?.setPosition(pointer.x + 18, pointer.y + 18);
  }

  startDrag(pointer) {
    const item = inventoryManager.getItem(this.press?.itemId);
    if (!item) { this.cancel(false); return; }
    const request = { itemId: item.id, targetSceneKey: null, targetToken: null };
    EventBus.emit('inventory:request-drag-target', request);
    // A scene must explicitly opt in to accepting inventory drops.
    if (!request.targetSceneKey || !request.targetToken) return;
    this.drag = { ...request, pointerId: pointer.id };
    inventoryManager.selectItem(item.id);
    this.ghost = this.scene.add.text(pointer.x + 18, pointer.y + 18,
      `${item.icon || '📦'} ${item.name}`, {
        fontFamily: 'SpecialElite', fontSize: '24px', color: '#ffe29a',
        backgroundColor: '#17110e', padding: { x: 10, y: 8 }
      }).setScrollFactor(0).setDepth(20000);
    this.callbacks.dragStarted();
  }

  release(pointer) {
    if (!this.press || this.press.pointerId !== pointer.id) return;
    const press = this.press;
    const drag = this.drag;
    this.clear();
    if (!drag) {
      this.callbacks.clicked(inventoryManager.getItem(press.itemId));
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
      return;
    }
    const drop = { ...drag, xRatio: pointer.x / width, yRatio: pointer.y / height, accepted: false };
    EventBus.emit('inventory:item-dropped', drop);
    // accepted means a scene handled the drop, not that the item was removed.
    if (!drop.accepted) this.callbacks.cancelled(true);
    this.callbacks.finished();
  }

  clear() {
    this.press = null;
    this.drag = null;
    this.ghost?.destroy();
    this.ghost = null;
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
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerup', this.onUp, this);
    this.scene.input.off('pointerupoutside', this.onCancel, this);
    window.removeEventListener('blur', this.onCancel);
    window.removeEventListener('pointercancel', this.onCancel);
    window.removeEventListener('pointerup', this.onWindowUp);
    this.scene = null;
    this.callbacks = null;
  }
}